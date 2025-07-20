import type { FractalType, MandelbrotParameters } from '@/types/fractal';
import type {
  CompleteMessage,
  ProgressMessage,
  RenderMessage,
  WorkerMessage,
} from '@/workers/fractal-worker';
import { ColorPalette } from './fractal-utils';
import { WebGPUEngine } from './webgpu-engine';

export interface RenderOptions {
  width: number;
  height: number;
  paletteType?: string;
  useWebGPU?: boolean;
  useWorkers?: boolean;
  workerCount?: number;
  tileSize?: number;
  onProgress?: (progress: number) => void;
}

export interface RenderResult {
  imageData: ImageData;
  iterationData: number[][];
  renderTime: number;
  method: 'cpu' | 'webgpu' | 'workers';
  stats: RenderStats;
}

export interface RenderStats {
  totalPixels: number;
  averageIterations: number;
  maxIterations: number;
  performanceScore: number;
  memoryUsed: number;
  tilesProcessed?: number;
  workersUsed?: number;
}

export interface PerformanceMetrics {
  fps: number;
  averageRenderTime: number;
  lastRenderTime: number;
  renderCount: number;
  totalRenderTime: number;
  memoryUsage: number;
  gpuMemoryUsage?: number;
}

export class FractalEngine {
  private webgpuEngine: WebGPUEngine | null = null;
  private workers: Worker[] = [];
  private workerPool: Worker[] = [];
  private isWebGPUSupported = false;
  private performanceHistory: number[] = [];
  private renderCount = 0;
  private totalRenderTime = 0;
  private initializationPromise: Promise<void>;
  private isInitialized = false;

  constructor() {
    this.initializationPromise = this.initializeAsync();
  }

  /**
   * 初期化完了を待つ
   */
  async waitForInitialization(): Promise<void> {
    await this.initializationPromise;
  }

  /**
   * 初期化完了状況を取得
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  private async initializeAsync(): Promise<void> {
    console.log('🚀 FractalEngine 初期化開始');

    // WebGPU初期化
    try {
      console.log('⚡ WebGPU初期化中...');
      this.webgpuEngine = new WebGPUEngine();
      this.isWebGPUSupported = await this.webgpuEngine.initialize();
      console.log(`⚡ WebGPU初期化結果: ${this.isWebGPUSupported ? '✅ 成功' : '❌ 失敗'}`);
    } catch (error) {
      console.error('❌ WebGPU初期化エラー:', error);
      this.isWebGPUSupported = false;
    }

    // Worker pool初期化
    await this.initializeWorkerPool();

    this.isInitialized = true;
    console.log('🎯 FractalEngine 初期化完了');
    console.log(`  - WebGPU対応: ${this.isWebGPUSupported}`);
    console.log(`  - 利用可能Worker数: ${this.workerPool.length}`);
  }

  private async initializeWorkerPool(): Promise<void> {
    const hardwareConcurrency = navigator.hardwareConcurrency;
    // 論理スレッド数を最大限活用（ただし安全性のため32を上限とする）
    const workerCount = Math.min(hardwareConcurrency || 4, 32);

    console.log(`🔧 Worker初期化開始:`);
    console.log(`  - navigator.hardwareConcurrency: ${hardwareConcurrency}`);
    console.log(`  - 作成予定Worker数: ${workerCount} (論理スレッド数を最大限活用)`);

    const workerPromises: Promise<Worker>[] = [];

    for (let i = 0; i < workerCount; i++) {
      const workerPromise = new Promise<Worker>((resolve, reject) => {
        try {
          console.log(`  Worker ${i + 1} 作成中...`);
          const worker = new Worker(new URL('../workers/fractal-worker.ts', import.meta.url), {
            type: 'module',
          });

          // Worker初期化完了を待つ
          let workerInitialized = false;
          const initTimeout = setTimeout(() => {
            if (!workerInitialized) {
              console.warn(`⚠️ Worker ${i + 1} 初期化タイムアウト`);
              resolve(worker); // タイムアウトしても追加
            }
          }, 2000);

          worker.addEventListener('message', (event) => {
            if (event.data.id === 'init' && !workerInitialized) {
              console.log(`✅ Worker ${i + 1} 初期化完了:`, event.data.payload);
              workerInitialized = true;
              clearTimeout(initTimeout);
              resolve(worker);
            }
          });

          worker.addEventListener('error', (error) => {
            console.error(`❌ Worker ${i + 1} エラー:`, error);
            clearTimeout(initTimeout);
            reject(error);
          });
        } catch (error) {
          console.error(`❌ Worker ${i + 1} 作成失敗:`, error);
          reject(error);
        }
      });

      workerPromises.push(workerPromise);
    }

    // 全Workerの初期化完了を待つ（失敗したものは除外）
    const results = await Promise.allSettled(workerPromises);

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        this.workerPool.push(result.value);
        console.log(`  ✅ Worker ${index + 1} 追加成功`);
      } else {
        console.error(`  ❌ Worker ${index + 1} 初期化失敗:`, result.reason);
      }
    });

    console.log(`🎯 Worker初期化完了: ${this.workerPool.length}/${workerCount} workers`);
  }

  /**
   * フラクタルをレンダリング
   */
  async renderFractal(
    fractalType: FractalType,
    parameters: MandelbrotParameters,
    options: RenderOptions
  ): Promise<RenderResult> {
    const startTime = performance.now();

    let result: RenderResult;

    // レンダリング方法を決定
    if (options.useWebGPU && this.isWebGPUSupported && this.webgpuEngine?.initialized) {
      result = await this.renderWithWebGPU(parameters, options);
    } else if (options.useWorkers && this.workerPool.length > 0) {
      result = await this.renderWithWorkers(parameters, options);
    } else {
      result = await this.renderWithCPU(parameters, options);
    }

    const renderTime = performance.now() - startTime;

    // パフォーマンス統計を更新
    this.updatePerformanceStats(renderTime);

    return {
      ...result,
      renderTime,
      stats: {
        ...result.stats,
        performanceScore: this.calculatePerformanceScore(result.stats),
      },
    };
  }

  /**
   * WebGPUレンダリング
   */
  private async renderWithWebGPU(
    parameters: MandelbrotParameters,
    options: RenderOptions
  ): Promise<RenderResult> {
    if (!this.webgpuEngine) {
      throw new Error('WebGPU engine not available');
    }

    console.log('⚡ WebGPUレンダリング開始 - GPU並列計算を使用');

    const iterationData = await this.webgpuEngine.renderMandelbrot(
      parameters,
      options.width,
      options.height
    );

    const imageData = ColorPalette.applyPalette(
      iterationData,
      parameters.iterations,
      options.paletteType || 'mandelbrot'
    );

    const stats = this.calculateStats(iterationData);

    return {
      imageData,
      iterationData,
      renderTime: 0, // 外部で設定
      method: 'webgpu',
      stats: {
        ...stats,
        memoryUsed: this.estimateMemoryUsage(options.width, options.height),
      },
    };
  }

  /**
   * マルチスレッドWorkerレンダリング
   */
  private async renderWithWorkers(
    parameters: MandelbrotParameters,
    options: RenderOptions
  ): Promise<RenderResult> {
    const { width, height, tileSize = 64, paletteType = 'mandelbrot' } = options;
    const tilesX = Math.ceil(width / tileSize);
    const tilesY = Math.ceil(height / tileSize);
    const totalTiles = tilesX * tilesY;

    console.log(
      `🚀 マルチスレッドレンダリング開始 - ${this.workerPool.length}個のWorkerでタイル処理 (${totalTiles}タイル)`
    );

    // 最終画像を作成
    const finalImageData = new ImageData(width, height);
    const iterationData: number[][] = Array(height)
      .fill(0)
      .map(() => Array(width).fill(0));

    const workerPromises: Promise<void>[] = [];
    let completedTiles = 0;

    for (let ty = 0; ty < tilesY; ty++) {
      for (let tx = 0; tx < tilesX; tx++) {
        const tileX = tx * tileSize;
        const tileY = ty * tileSize;
        const tileWidth = Math.min(tileSize, width - tileX);
        const tileHeight = Math.min(tileSize, height - tileY);

        const workerIndex = workerPromises.length % this.workerPool.length;
        const worker = this.workerPool[workerIndex];

        if (!worker) continue;

        const promise = this.renderTileWithWorker(
          worker,
          parameters,
          width,
          height,
          tileX,
          tileY,
          tileWidth,
          tileHeight,
          paletteType
        ).then((tileResult) => {
          // タイル結果を合成
          this.compositeTile(
            finalImageData,
            iterationData,
            tileResult,
            tileX,
            tileY,
            tileWidth,
            tileHeight
          );

          completedTiles++;
          const progress = completedTiles / totalTiles;
          options.onProgress?.(progress);
        });

        workerPromises.push(promise);
      }
    }

    await Promise.all(workerPromises);

    const stats = this.calculateStats(iterationData);

    return {
      imageData: finalImageData,
      iterationData,
      renderTime: 0, // 外部で設定
      method: 'workers',
      stats: {
        ...stats,
        memoryUsed: this.estimateMemoryUsage(width, height),
        tilesProcessed: totalTiles,
        workersUsed: this.workerPool.length,
      },
    };
  }

  /**
   * シングルスレッドCPUレンダリング
   */
  private async renderWithCPU(
    parameters: MandelbrotParameters,
    options: RenderOptions
  ): Promise<RenderResult> {
    const { width, height, paletteType = 'mandelbrot' } = options;
    const iterationData: number[][] = [];
    const aspectRatio = width / height;
    const scale = 3.0 / parameters.zoom;

    console.log('🐌 シングルスレッドCPUレンダリング開始 - 意図的に遅くしています');

    for (let y = 0; y < height; y++) {
      const row: number[] = [];

      for (let x = 0; x < width; x++) {
        const real = parameters.centerX + ((x - width / 2) * scale * aspectRatio) / width;
        const imaginary = parameters.centerY + ((y - height / 2) * scale) / height;

        const iterations = this.calculateMandelbrotPoint(
          real,
          imaginary,
          parameters.iterations,
          parameters.escapeRadius
        );

        row.push(iterations);
      }

      iterationData.push(row);

      // プログレス報告をより頻繁に行い、意図的に遅延を追加
      if (y % 5 === 0) {
        const progress = y / height;
        options.onProgress?.(progress);

        // シングルスレッドの遅さを体感させるため、意図的に少し遅延
        // 実際のアプリでは不要ですが、デモ用です
        await new Promise((resolve) => setTimeout(resolve, 1));
      }
    }

    const imageData = ColorPalette.applyPalette(iterationData, parameters.iterations, paletteType);
    const stats = this.calculateStats(iterationData);

    return {
      imageData,
      iterationData,
      renderTime: 0, // 外部で設定
      method: 'cpu',
      stats: {
        ...stats,
        memoryUsed: this.estimateMemoryUsage(width, height),
      },
    };
  }

  /**
   * Workerでタイルをレンダリング
   */
  private async renderTileWithWorker(
    worker: Worker,
    parameters: MandelbrotParameters,
    width: number,
    height: number,
    tileX: number,
    tileY: number,
    tileWidth: number,
    tileHeight: number,
    paletteType: string
  ): Promise<CompleteMessage> {
    return new Promise((resolve, reject) => {
      const messageId = crypto.randomUUID();

      const handleMessage = (event: MessageEvent<WorkerMessage>) => {
        const message = event.data;

        if (message.id !== messageId) return;

        if (message.type === 'complete') {
          worker.removeEventListener('message', handleMessage);
          resolve(message as CompleteMessage);
        } else if (message.type === 'error') {
          worker.removeEventListener('message', handleMessage);
          reject(new Error(message.payload as string));
        }
      };

      worker.addEventListener('message', handleMessage);

      const renderMessage: RenderMessage = {
        id: messageId,
        type: 'render',
        payload: {
          parameters,
          width,
          height,
          tileX,
          tileY,
          tileWidth,
          tileHeight,
          paletteType,
        },
      };

      worker.postMessage(renderMessage);
    });
  }

  /**
   * タイル結果を最終画像に合成
   */
  private compositeTile(
    finalImageData: ImageData,
    iterationData: number[][],
    tileResult: CompleteMessage,
    tileX: number,
    tileY: number,
    tileWidth: number,
    tileHeight: number
  ): void {
    const { imageData: tileImageData, iterationData: tileIterations } = tileResult.payload;

    if (!tileImageData || !tileIterations) return;

    // 画像データを合成
    for (let y = 0; y < tileHeight; y++) {
      for (let x = 0; x < tileWidth; x++) {
        const srcIndex = (y * tileWidth + x) * 4;
        const destIndex = ((tileY + y) * finalImageData.width + (tileX + x)) * 4;

        if (srcIndex < tileImageData.data.length && destIndex < finalImageData.data.length) {
          finalImageData.data[destIndex] = tileImageData.data[srcIndex] || 0;
          finalImageData.data[destIndex + 1] = tileImageData.data[srcIndex + 1] || 0;
          finalImageData.data[destIndex + 2] = tileImageData.data[srcIndex + 2] || 0;
          finalImageData.data[destIndex + 3] = tileImageData.data[srcIndex + 3] || 255;
        }
      }
    }

    // イテレーションデータを合成
    for (let y = 0; y < tileHeight; y++) {
      const tileRow = tileIterations[y];
      const destRow = iterationData[tileY + y];
      if (tileRow && destRow) {
        for (let x = 0; x < tileWidth; x++) {
          const srcValue = tileRow[x];
          if (srcValue !== undefined) {
            destRow[tileX + x] = srcValue;
          }
        }
      }
    }
  }

  /**
   * Mandelbrot点の計算
   */
  private calculateMandelbrotPoint(
    real: number,
    imaginary: number,
    maxIterations: number,
    escapeRadius: number
  ): number {
    let zx = 0;
    let zy = 0;
    let iteration = 0;

    while (zx * zx + zy * zy <= escapeRadius && iteration < maxIterations) {
      const temp = zx * zx - zy * zy + real;
      zy = 2 * zx * zy + imaginary;
      zx = temp;
      iteration++;
    }

    return iteration;
  }

  /**
   * レンダリング統計を計算
   */
  private calculateStats(iterationData: number[][]): RenderStats {
    const height = iterationData.length;
    const width = iterationData[0]?.length || 0;
    const totalPixels = width * height;

    let totalIterations = 0;
    let maxIterations = 0;

    for (let y = 0; y < height; y++) {
      const row = iterationData[y];
      if (row) {
        for (let x = 0; x < width; x++) {
          const iterations = row[x];
          if (iterations !== undefined) {
            totalIterations += iterations;
            maxIterations = Math.max(maxIterations, iterations);
          }
        }
      }
    }

    const averageIterations = totalPixels > 0 ? totalIterations / totalPixels : 0;

    return {
      totalPixels,
      averageIterations,
      maxIterations,
      performanceScore: 0, // 後で計算
      memoryUsed: 0, // 後で設定
    };
  }

  /**
   * パフォーマンススコアを計算
   */
  private calculatePerformanceScore(stats: RenderStats): number {
    // ピクセル数、平均イテレーション、レンダリング時間を考慮
    const lastRenderTime = this.performanceHistory[this.performanceHistory.length - 1] || 1;
    const pixelsPerMs = stats.totalPixels / lastRenderTime;
    const iterationComplexity =
      stats.maxIterations > 0 ? stats.averageIterations / stats.maxIterations : 0;

    return Math.round(pixelsPerMs * (1 + iterationComplexity) * 100);
  }

  /**
   * メモリ使用量を推定
   */
  private estimateMemoryUsage(width: number, height: number): number {
    // ImageData (4 bytes per pixel) + iteration data (4 bytes per pixel)
    return (width * height * 8) / (1024 * 1024); // MB
  }

  /**
   * パフォーマンス統計を更新
   */
  private updatePerformanceStats(renderTime: number): void {
    this.performanceHistory.push(renderTime);
    if (this.performanceHistory.length > 100) {
      this.performanceHistory.shift();
    }

    this.renderCount++;
    this.totalRenderTime += renderTime;
  }

  /**
   * パフォーマンスメトリクスを取得
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const averageRenderTime =
      this.performanceHistory.length > 0
        ? this.performanceHistory.reduce((sum, time) => sum + time, 0) /
          this.performanceHistory.length
        : 0;

    const fps = averageRenderTime > 0 ? 1000 / averageRenderTime : 0;

    let memoryUsage = 0;
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // MB
    }

    const lastRenderTime =
      this.performanceHistory.length > 0
        ? this.performanceHistory[this.performanceHistory.length - 1] || 0
        : 0;

    return {
      fps: Math.round(fps * 100) / 100,
      averageRenderTime: Math.round(averageRenderTime),
      lastRenderTime,
      renderCount: this.renderCount,
      totalRenderTime: this.totalRenderTime,
      memoryUsage: Math.round(memoryUsage * 100) / 100,
    };
  }

  /**
   * WebGPUサポート状況を取得
   */
  get webGPUSupported(): boolean {
    return this.isWebGPUSupported;
  }

  /**
   * 利用可能Worker数を取得
   */
  get availableWorkers(): number {
    return this.workerPool.length;
  }

  /**
   * エンジンを破棄
   */
  dispose(): void {
    // WebGPUエンジンを破棄
    if (this.webgpuEngine) {
      this.webgpuEngine.dispose();
    }

    // Workerを終了
    this.workerPool.forEach((worker) => worker.terminate());
    this.workerPool = [];

    // 統計をリセット
    this.performanceHistory = [];
    this.renderCount = 0;
    this.totalRenderTime = 0;
  }
}
