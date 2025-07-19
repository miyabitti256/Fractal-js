import type { RenderMessage, ResultMessage, AllFractalParameters, RenderSettings } from '@/types/fractal';

// Worker内のグローバル型定義
declare const self: DedicatedWorkerGlobalScope;

/**
 * フラクタル計算を行うWebWorker
 */
class FractalWorker {
  private isRunning = false;
  private currentTaskId: string | null = null;

  constructor() {
    self.addEventListener('message', this.handleMessage.bind(this));
  }

  private handleMessage(event: MessageEvent<RenderMessage>): void {
    const message = event.data;
    
    switch (message.type) {
      case 'render':
        this.handleRenderRequest(message);
        break;
      case 'cancel':
        this.cancelCurrentTask();
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  private async handleRenderRequest(message: RenderMessage): Promise<void> {
    if (this.isRunning) {
      this.postMessage({
        type: 'error',
        id: message.id,
        payload: { error: 'Worker is busy' }
      });
      return;
    }

    this.isRunning = true;
    this.currentTaskId = message.id;

    try {
      const result = await this.renderFractal(
        message.payload.parameters,
        message.payload.settings,
        message.payload.region
      );

      if (this.currentTaskId === message.id) {
        const response: ResultMessage = {
          type: 'result',
          id: message.id,
          payload: {
            result,
            region: message.payload.region
          }
        };
        this.postMessage(response);
      }
    } catch (error) {
      if (this.currentTaskId === message.id) {
        this.postMessage({
          type: 'error',
          id: message.id,
          payload: { error: error instanceof Error ? error.message : 'Unknown error' }
        });
      }
    } finally {
      this.isRunning = false;
      this.currentTaskId = null;
    }
  }

  private cancelCurrentTask(): void {
    this.currentTaskId = null;
    this.isRunning = false;
  }

  private async renderFractal(
    parameters: AllFractalParameters,
    settings: RenderSettings,
    region: { x: number; y: number; width: number; height: number }
  ) {
    const startTime = performance.now();
    
    // 画像データを作成
    const imageData = new ImageData(region.width, region.height);
    const iterations: number[][] = Array(region.height)
      .fill(0)
      .map(() => Array(region.width).fill(0));

    // フラクタルタイプに応じて計算
    switch (parameters.type) {
      case 'mandelbrot':
        await this.renderMandelbrot(parameters, imageData, iterations, region);
        break;
      case 'julia':
        await this.renderJulia(parameters, imageData, iterations, region);
        break;
      case 'burning-ship':
        await this.renderBurningShip(parameters, imageData, iterations, region);
        break;
      case 'newton':
        await this.renderNewton(parameters, imageData, iterations, region);
        break;
      case 'lyapunov':
        await this.renderLyapunov(parameters, imageData, iterations, region);
        break;
      case 'barnsley-fern':
        await this.renderBarnsleyFern(parameters, imageData, iterations, region);
        break;
      default:
        throw new Error(`Unsupported fractal type: ${(parameters as any).type}`);
    }

    const renderTime = performance.now() - startTime;

    return {
      imageData,
      renderTime,
      iterations
    };
  }

  private async renderMandelbrot(
    params: AllFractalParameters,
    imageData: ImageData,
    iterations: number[][],
    region: { x: number; y: number; width: number; height: number }
  ): Promise<void> {
    const { width, height } = region;
    const data = imageData.data;

    for (let py = 0; py < height; py++) {
      if (this.currentTaskId === null) return; // キャンセルチェック

      for (let px = 0; px < width; px++) {
        // 複素平面の座標に変換
        const x0 = (region.x + px) / params.zoom + params.centerX;
        const y0 = (region.y + py) / params.zoom + params.centerY;

        let x = 0;
        let y = 0;
        let iteration = 0;

        // Mandelbrot集合の計算
        while (x * x + y * y <= params.escapeRadius && iteration < params.iterations) {
          const xtemp = x * x - y * y + x0;
          y = 2 * x * y + y0;
          x = xtemp;
          iteration++;
        }

        iterations[py][px] = iteration;

        // カラーマッピング（簡易版）
        const pixelIndex = (py * width + px) * 4;
        if (iteration === params.iterations) {
          // 内部点（黒）
          data[pixelIndex] = 0;
          data[pixelIndex + 1] = 0;
          data[pixelIndex + 2] = 0;
        } else {
          // 外部点（カラー）
          const hue = (iteration / params.iterations) * 360;
          const rgb = this.hslToRgb(hue, 100, 50);
          data[pixelIndex] = rgb[0];
          data[pixelIndex + 1] = rgb[1];
          data[pixelIndex + 2] = rgb[2];
        }
        data[pixelIndex + 3] = 255; // アルファ
      }

      // 進捗を定期的に報告
      if (py % 10 === 0) {
        this.postMessage({
          type: 'progress',
          id: this.currentTaskId!,
          payload: { progress: py / height }
        });
      }
    }
  }

  // 他のフラクタル計算メソッドのスタブ
  private async renderJulia(params: any, imageData: ImageData, iterations: number[][], region: any): Promise<void> {
    // Julia集合の実装をここに追加
    console.log('Julia set rendering not implemented yet');
    this.fillWithPlaceholder(imageData, [255, 0, 255]); // マゼンタで仮塗り
  }

  private async renderBurningShip(params: any, imageData: ImageData, iterations: number[][], region: any): Promise<void> {
    console.log('Burning Ship rendering not implemented yet');
    this.fillWithPlaceholder(imageData, [255, 255, 0]); // 黄色で仮塗り
  }

  private async renderNewton(params: any, imageData: ImageData, iterations: number[][], region: any): Promise<void> {
    console.log('Newton fractal rendering not implemented yet');
    this.fillWithPlaceholder(imageData, [0, 255, 255]); // シアンで仮塗り
  }

  private async renderLyapunov(params: any, imageData: ImageData, iterations: number[][], region: any): Promise<void> {
    console.log('Lyapunov fractal rendering not implemented yet');
    this.fillWithPlaceholder(imageData, [255, 128, 0]); // オレンジで仮塗り
  }

  private async renderBarnsleyFern(params: any, imageData: ImageData, iterations: number[][], region: any): Promise<void> {
    console.log('Barnsley Fern rendering not implemented yet');
    this.fillWithPlaceholder(imageData, [0, 255, 0]); // 緑で仮塗り
  }

  private fillWithPlaceholder(imageData: ImageData, color: [number, number, number]): void {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = color[0];
      data[i + 1] = color[1];
      data[i + 2] = color[2];
      data[i + 3] = 255;
    }
  }

  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
    h /= 360;
    s /= 100;
    l /= 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
    const m = l - c / 2;

    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 1/6) {
      r = c; g = x; b = 0;
    } else if (1/6 <= h && h < 2/6) {
      r = x; g = c; b = 0;
    } else if (2/6 <= h && h < 3/6) {
      r = 0; g = c; b = x;
    } else if (3/6 <= h && h < 4/6) {
      r = 0; g = x; b = c;
    } else if (4/6 <= h && h < 5/6) {
      r = x; g = 0; b = c;
    } else if (5/6 <= h && h < 1) {
      r = c; g = 0; b = x;
    }

    return [
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255)
    ];
  }

  private postMessage(message: any): void {
    self.postMessage(message);
  }
}

// Workerインスタンスを作成
new FractalWorker(); 