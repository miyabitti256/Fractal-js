import type {
  AllFractalParameters,
  BurningShipParameters,
  ExtendedPerformance,
  FractalType,
  JuliaParameters,
  MandelbrotParameters,
  NewtonParameters,
  WorkerErrorPayload,
} from '@/types/fractal';
import type {
  CompleteMessage,
  ProgressMessage,
  RenderMessage,
  WorkerMessage,
} from '@/workers/fractal-worker';
import { ColorPalette, FractalCalculations } from './fractal-utils';
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
  private currentRenderingTasks = new Map<string, Promise<RenderResult>>();

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
    // console.log('🚀 FractalEngine 初期化開始');

    // WebGPU初期化
    try {
      // console.log('⚡ WebGPU初期化中...');
      this.webgpuEngine = new WebGPUEngine();
      this.isWebGPUSupported = await this.webgpuEngine.initialize();
      // console.log(`⚡ WebGPU初期化結果: ${this.isWebGPUSupported ? '✅ 成功' : '❌ 失敗'}`);
    } catch (error) {
      console.error('❌ WebGPU初期化エラー:', error);
      this.isWebGPUSupported = false;
    }

    // Worker pool初期化
    await this.initializeWorkerPool();

    this.isInitialized = true;
    // console.log('🎯 FractalEngine 初期化完了');
    // console.log(`  - WebGPU対応: ${this.isWebGPUSupported}`);
    // console.log(`  - 利用可能Worker数: ${this.workerPool.length}`);
  }

  private async initializeWorkerPool(): Promise<void> {
    const hardwareConcurrency = navigator.hardwareConcurrency;
    // 論理スレッド数を最大限活用（ただし安全性のため32を上限とする）
    const workerCount = Math.min(hardwareConcurrency || 4, 32);

    // console.log(`🔧 Worker初期化開始:`);
    // console.log(`  - navigator.hardwareConcurrency: ${hardwareConcurrency}`);
    // console.log(`  - 作成予定Worker数: ${workerCount} (論理スレッド数を最大限活用)`);

    const workerPromises: Promise<Worker>[] = [];

    for (let i = 0; i < workerCount; i++) {
      const workerPromise = new Promise<Worker>((resolve, reject) => {
        try {
          // console.log(`  Worker ${i + 1} 作成中...`);
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
              // console.log(`✅ Worker ${i + 1} 初期化完了:`, event.data.payload);
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
        // console.log(`  ✅ Worker ${index + 1} 追加成功`);
      } else {
        console.error(`  ❌ Worker ${index + 1} 初期化失敗:`, result.reason);
      }
    });

    // console.log(`🎯 Worker初期化完了: ${this.workerPool.length}/${workerCount} workers`);
  }

  /**
   * フラクタルをレンダリング
   */
  async renderFractal(
    fractalType: FractalType,
    parameters: AllFractalParameters,
    options: RenderOptions
  ): Promise<RenderResult> {
    // 軽量な重複レンダリング防止のためのキーを生成（JSON.stringify回避）
    let renderKey: string;
    if (fractalType === 'julia') {
      const juliaParams = parameters as JuliaParameters;
      renderKey = `julia_${juliaParams.c.real.toFixed(4)}_${juliaParams.c.imag.toFixed(4)}_${juliaParams.iterations}_${options.width}_${options.height}`;
    } else {
      renderKey = `${fractalType}_${parameters.iterations}_${options.width}_${options.height}`;
    }

    // 同じ内容のレンダリングが既に実行中の場合は、その結果を返す
    const existingTask = this.currentRenderingTasks.get(renderKey);
    if (existingTask) {
      return existingTask;
    }

    const startTime = performance.now();

    const renderTask = (async (): Promise<RenderResult> => {
      try {
        let result: RenderResult;

        // レンダリング方法を決定
        if (
          options.useWebGPU &&
          this.isWebGPUSupported &&
          this.webgpuEngine?.initialized &&
          fractalType === 'mandelbrot'
        ) {
          // WebGPUは現在マンデルブロ集合のみ対応
          result = await this.renderWithWebGPU(parameters as MandelbrotParameters, options);
        } else if (options.useWorkers && this.workerPool.length > 0) {
          result = await this.renderWithWorkers(fractalType, parameters, options);
        } else {
          result = await this.renderWithCPU(fractalType, parameters, options);
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
      } finally {
        // タスク完了後にキャッシュから削除
        this.currentRenderingTasks.delete(renderKey);
      }
    })();

    // タスクをキャッシュに保存
    this.currentRenderingTasks.set(renderKey, renderTask);

    return renderTask;
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

    // console.log('⚡ WebGPUレンダリング開始 - GPU並列計算を使用');

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
    fractalType: FractalType,
    parameters: AllFractalParameters,
    options: RenderOptions
  ): Promise<RenderResult> {
    const { width, height, paletteType = 'rainbow' } = options;

    // タイルサイズを動的に最適化（解像度とWorker数に基づく）
    const workerCount = this.workerPool.length;
    const totalPixels = width * height;
    const pixelsPerWorker = totalPixels / workerCount;

    // 最適なタイルサイズを計算（高頻度レンダリング対応でタイルサイズを大きめに調整）
    let tileSize: number;
    if (pixelsPerWorker < 8192) {
      // 64x128以下
      tileSize = 64;
    } else if (pixelsPerWorker < 32768) {
      // 128x256以下
      tileSize = 96;
    } else if (pixelsPerWorker < 131072) {
      // 256x512以下
      tileSize = 128;
    } else {
      tileSize = 160; // 大きめのタイルで通信オーバーヘッド削減
    }

    // ニュートンフラクタルの場合も、ユーザーが選択したパレットタイプを尊重
    // ただし、デフォルトが指定されていない場合のみnewtonパレットを使用
    const effectivePaletteType =
      fractalType === 'newton' && paletteType === 'rainbow' ? 'newton' : paletteType;

    const tilesX = Math.ceil(width / tileSize);
    const tilesY = Math.ceil(height / tileSize);
    const totalTiles = tilesX * tilesY;

    // console.log(
    //   `🚀 マルチスレッドレンダリング開始 - ${this.workerPool.length}個のWorkerでタイル処理 (${totalTiles}タイル, タイルサイズ: ${tileSize}x${tileSize})`
    // );

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
          fractalType,
          parameters,
          width,
          height,
          tileX,
          tileY,
          tileWidth,
          tileHeight,
          effectivePaletteType
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
    fractalType: FractalType,
    parameters: AllFractalParameters,
    options: RenderOptions
  ): Promise<RenderResult> {
    const { width, height, paletteType = 'mandelbrot' } = options;

    // console.log(`🐌 シングルスレッドCPUレンダリング開始 - ${fractalType}`);

    // console.log(`レンダリング開始: ${fractalType} フラクタル`);

    switch (fractalType) {
      case 'mandelbrot':
        return this.renderMandelbrotCPU(parameters as MandelbrotParameters, options);
      case 'julia':
        return this.renderJuliaCPU(parameters as JuliaParameters, options);
      case 'burning-ship':
        return this.renderBurningShipCPU(parameters as BurningShipParameters, options);
      case 'newton':
        // console.log('Newton fractal パラメータ:', parameters);
        return this.renderNewtonCPU(parameters as NewtonParameters, options);
      default:
        throw new Error(`Unsupported fractal type for CPU rendering: ${fractalType}`);
    }
  }

  /**
   * マンデルブロ集合のCPUレンダリング
   */
  private async renderMandelbrotCPU(
    parameters: MandelbrotParameters,
    options: RenderOptions
  ): Promise<RenderResult> {
    const { width, height, paletteType = 'mandelbrot' } = options;
    const iterationData: number[][] = [];
    const aspectRatio = width / height;
    const scale = 3.0 / parameters.zoom;

    for (let y = 0; y < height; y++) {
      const row: number[] = [];

      for (let x = 0; x < width; x++) {
        const real = parameters.centerX + ((x - width / 2) * scale * aspectRatio) / width;
        const imaginary = parameters.centerY + ((y - height / 2) * scale) / height;

        const iterations = FractalCalculations.mandelbrot(
          real,
          imaginary,
          parameters.iterations,
          parameters.escapeRadius
        );

        row.push(iterations);
      }

      iterationData.push(row);

      // 進行報告（setTimeoutなしで高速化）
      if (y % 20 === 0) {
        const progress = y / height;
        options.onProgress?.(progress);
      }
    }

    const imageData = ColorPalette.applyPalette(iterationData, parameters.iterations, paletteType);
    const stats = this.calculateStats(iterationData);

    return {
      imageData,
      iterationData,
      renderTime: 0,
      method: 'cpu',
      stats: {
        ...stats,
        memoryUsed: this.estimateMemoryUsage(width, height),
      },
    };
  }

  /**
   * ジュリア集合のCPUレンダリング
   */
  private async renderJuliaCPU(
    parameters: JuliaParameters,
    options: RenderOptions
  ): Promise<RenderResult> {
    const { width, height, paletteType = 'julia' } = options;
    const iterationData: number[][] = [];
    const aspectRatio = width / height;
    const scale = 3.0 / parameters.zoom;

    for (let y = 0; y < height; y++) {
      const row: number[] = [];

      for (let x = 0; x < width; x++) {
        const real = parameters.centerX + ((x - width / 2) * scale * aspectRatio) / width;
        const imaginary = parameters.centerY + ((y - height / 2) * scale) / height;

        const iterations = FractalCalculations.julia(
          real,
          imaginary,
          parameters.c,
          parameters.iterations,
          parameters.escapeRadius
        );

        row.push(iterations);
      }

      iterationData.push(row);

      // 進行報告（setTimeoutなしで高速化）
      if (y % 20 === 0) {
        const progress = y / height;
        options.onProgress?.(progress);
      }
    }

    const imageData = ColorPalette.applyPalette(iterationData, parameters.iterations, paletteType);
    const stats = this.calculateStats(iterationData);

    return {
      imageData,
      iterationData,
      renderTime: 0,
      method: 'cpu',
      stats: {
        ...stats,
        memoryUsed: this.estimateMemoryUsage(width, height),
      },
    };
  }

  /**
   * バーニングシップフラクタルのCPUレンダリング
   */
  private async renderBurningShipCPU(
    parameters: BurningShipParameters,
    options: RenderOptions
  ): Promise<RenderResult> {
    const { width, height, paletteType = 'fire' } = options;
    const iterationData: number[][] = [];
    const aspectRatio = width / height;
    const scale = 3.0 / parameters.zoom;

    for (let y = 0; y < height; y++) {
      const row: number[] = [];

      for (let x = 0; x < width; x++) {
        const real = parameters.centerX + ((x - width / 2) * scale * aspectRatio) / width;
        const imaginary = parameters.centerY + ((y - height / 2) * scale) / height;

        const iterations = FractalCalculations.burningShip(
          real,
          imaginary,
          parameters.iterations,
          parameters.escapeRadius
        );

        row.push(iterations);
      }

      iterationData.push(row);

      // 進行報告（setTimeoutなしで高速化）
      if (y % 20 === 0) {
        const progress = y / height;
        options.onProgress?.(progress);
      }
    }

    const imageData = ColorPalette.applyPalette(iterationData, parameters.iterations, paletteType);
    const stats = this.calculateStats(iterationData);

    return {
      imageData,
      iterationData,
      renderTime: 0,
      method: 'cpu',
      stats: {
        ...stats,
        memoryUsed: this.estimateMemoryUsage(width, height),
      },
    };
  }

  /**
   * ニュートン法フラクタルのCPUレンダリング
   */
  private async renderNewtonCPU(
    parameters: NewtonParameters,
    options: RenderOptions
  ): Promise<RenderResult> {
    const { width, height } = options;
    const iterationData: number[][] = [];
    const aspectRatio = width / height;
    const scale = 3.0 / parameters.zoom;

    // 根の数を取得してカラーパレット戦略を決定
    const rootCount = parameters.roots?.length || 3;
    // console.log(`Newton fractal rendering: ${rootCount} roots detected`);

    // 根が4以上の場合、グレーパレットを含む拡張パレットを使用
    const useExtendedPalette = rootCount >= 4;
    if (useExtendedPalette) {
      // console.log(`🎨 Extended palette mode: RGB + Gray palette for ${rootCount} roots`);
    }

    for (let y = 0; y < height; y++) {
      const row: number[] = [];

      for (let x = 0; x < width; x++) {
        const real = parameters.centerX + ((x - width / 2) * scale * aspectRatio) / width;
        const imaginary = parameters.centerY + ((y - height / 2) * scale) / height;

        const result = FractalCalculations.newton(
          real,
          imaginary,
          parameters.polynomial,
          parameters.tolerance,
          parameters.iterations,
          parameters.roots
        );

        // 根の番号に基づいて色分け (root * 100 + iterations)
        const colorValue =
          result.root >= 0 ? result.root * 100 + result.iterations : parameters.iterations;
        row.push(colorValue);
      }

      iterationData.push(row);

      // 進行報告（setTimeoutなしで高速化）
      if (y % 20 === 0) {
        const progress = y / height;
        options.onProgress?.(progress);
      }
    }

    // 根の数に応じて動的にカラーパレットを生成
    const selectedPaletteType = options.paletteType || 'newton';

    if (selectedPaletteType === 'newton') {
      // Newton専用パレット（根が4以上の場合はグレーパレット含む）
      const dynamicPalette = ColorPalette.getNewtonPalette(256, rootCount);
      const imageData = this.applyNewtonPalette(
        iterationData,
        parameters.iterations,
        dynamicPalette,
        rootCount
      );
      const stats = this.calculateStats(iterationData);

      return {
        imageData,
        iterationData,
        renderTime: 0,
        method: 'cpu',
        stats: {
          ...stats,
          memoryUsed: this.estimateMemoryUsage(width, height),
        },
      };
    } else {
      // 標準パレット（他のフラクタルと同様の処理）
      const imageData = ColorPalette.applyPalette(
        iterationData,
        parameters.iterations,
        selectedPaletteType
      );
      const stats = this.calculateStats(iterationData);

      return {
        imageData,
        iterationData,
        renderTime: 0,
        method: 'cpu',
        stats: {
          ...stats,
          memoryUsed: this.estimateMemoryUsage(width, height),
        },
      };
    }
  }

  /**
   * Newton フラクタル専用のカラーパレット適用
   * 根の数に応じて最適化されたカラーマッピングを行う
   */
  private applyNewtonPalette(
    iterationData: number[][],
    maxIterations: number,
    palette: number[][],
    rootCount: number
  ): ImageData {
    if (!iterationData || iterationData.length === 0 || !iterationData[0]) {
      return new ImageData(1, 1);
    }

    const width = iterationData[0].length;
    const height = iterationData.length;
    const imageData = new ImageData(width, height);

    // パレットの色セット数を計算（根が4以上の場合はグレーパレットを含む）
    const useExtendedPalette = rootCount >= 4;
    const totalColorSets = useExtendedPalette ? rootCount + 1 : rootCount;
    const colorsPerSet = Math.floor(palette.length / totalColorSets);

    for (let y = 0; y < height; y++) {
      const row = iterationData[y];
      if (!row) continue;

      for (let x = 0; x < width; x++) {
        const colorValue = row[x];
        if (colorValue === undefined) continue;

        const index = (y * width + x) * 4;

        if (colorValue === maxIterations) {
          // 収束しなかった点は黒
          imageData.data[index] = 0;
          imageData.data[index + 1] = 0;
          imageData.data[index + 2] = 0;
          imageData.data[index + 3] = 255;
        } else {
          // 根のインデックスと反復回数を分離
          const rootIndex = Math.floor(colorValue / 100);
          const iterations = colorValue % 100;

          if (rootIndex >= 0 && rootIndex < rootCount) {
            // 通常の根の色（RGB色相パレット）
            const colorSetOffset = rootIndex * colorsPerSet;
            const iterationOffset = Math.floor((iterations / maxIterations) * (colorsPerSet - 1));
            const paletteIndex = colorSetOffset + iterationOffset;

            const color = palette[paletteIndex];
            if (color) {
              imageData.data[index] = color[0] || 0;
              imageData.data[index + 1] = color[1] || 0;
              imageData.data[index + 2] = color[2] || 0;
              imageData.data[index + 3] = color[3] || 255;
            }
          } else if (useExtendedPalette && rootIndex >= rootCount) {
            // 4以上の根の場合、グレーパレットを使用
            const graySetOffset = rootCount * colorsPerSet;
            const iterationOffset = Math.floor((iterations / maxIterations) * (colorsPerSet - 1));
            const paletteIndex = graySetOffset + iterationOffset;

            const color = palette[paletteIndex];
            if (color) {
              imageData.data[index] = color[0] || 0;
              imageData.data[index + 1] = color[1] || 0;
              imageData.data[index + 2] = color[2] || 0;
              imageData.data[index + 3] = color[3] || 255;
            }
          } else {
            // デフォルト色（黒）
            imageData.data[index] = 0;
            imageData.data[index + 1] = 0;
            imageData.data[index + 2] = 0;
            imageData.data[index + 3] = 255;
          }
        }
      }
    }

    return imageData;
  }

  /**
   * Workerでタイルをレンダリング
   */
  private async renderTileWithWorker(
    worker: Worker,
    fractalType: FractalType,
    parameters: AllFractalParameters,
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
          const errorPayload = message.payload as WorkerErrorPayload;
          const errorMessage =
            typeof errorPayload === 'string'
              ? errorPayload
              : errorPayload?.error || 'Worker error occurred';
          console.error('Worker error details:', errorPayload);
          reject(new Error(errorMessage));
        }
      };

      worker.addEventListener('message', handleMessage);

      const renderMessage: RenderMessage = {
        id: messageId,
        type: 'render',
        payload: {
          fractalType,
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
      const memory = (performance as ExtendedPerformance).memory;
      if (memory) {
        memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // MB
      }
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
