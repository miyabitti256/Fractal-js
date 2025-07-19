import type { Complex, FractalType, AllFractalParameters } from '@/types/fractal';

/**
 * 複素数演算ユーティリティ
 */
export class ComplexMath {
  static add(a: Complex, b: Complex): Complex {
    return { real: a.real + b.real, imag: a.imag + b.imag };
  }

  static subtract(a: Complex, b: Complex): Complex {
    return { real: a.real - b.real, imag: a.imag - b.imag };
  }

  static multiply(a: Complex, b: Complex): Complex {
    return {
      real: a.real * b.real - a.imag * b.imag,
      imag: a.real * b.imag + a.imag * b.real
    };
  }

  static divide(a: Complex, b: Complex): Complex {
    const denominator = b.real * b.real + b.imag * b.imag;
    return {
      real: (a.real * b.real + a.imag * b.imag) / denominator,
      imag: (a.imag * b.real - a.real * b.imag) / denominator
    };
  }

  static magnitude(z: Complex): number {
    return Math.sqrt(z.real * z.real + z.imag * z.imag);
  }

  static magnitudeSquared(z: Complex): number {
    return z.real * z.real + z.imag * z.imag;
  }

  static conjugate(z: Complex): Complex {
    return { real: z.real, imag: -z.imag };
  }

  static power(z: Complex, n: number): Complex {
    const r = ComplexMath.magnitude(z);
    const theta = Math.atan2(z.imag, z.real);
    const rPowN = Math.pow(r, n);
    const nTheta = n * theta;
    return {
      real: rPowN * Math.cos(nTheta),
      imag: rPowN * Math.sin(nTheta)
    };
  }
}

/**
 * フラクタルパラメータのデフォルト値を取得
 */
export function getDefaultParameters(type: FractalType): AllFractalParameters {
  switch (type) {
    case 'mandelbrot':
      return {
        type: 'mandelbrot',
        zoom: 200,
        centerX: -0.75,
        centerY: 0,
        iterations: 100,
        escapeRadius: 4
      };

    case 'julia':
      return {
        type: 'julia',
        zoom: 200,
        centerX: 0,
        centerY: 0,
        iterations: 100,
        escapeRadius: 4,
        c: { real: -0.7, imag: 0.27015 }
      };

    case 'burning-ship':
      return {
        type: 'burning-ship',
        zoom: 200,
        centerX: -0.5,
        centerY: -0.5,
        iterations: 100,
        escapeRadius: 4
      };

    case 'newton':
      return {
        type: 'newton',
        zoom: 200,
        centerX: 0,
        centerY: 0,
        iterations: 100,
        escapeRadius: 4,
        polynomial: [
          { real: 1, imag: 0 },  // z^3
          { real: 0, imag: 0 },  // z^2
          { real: 0, imag: 0 },  // z
          { real: -1, imag: 0 }  // constant
        ],
        tolerance: 1e-6
      };

    case 'lyapunov':
      return {
        type: 'lyapunov',
        zoom: 200,
        centerX: 0,
        centerY: 0,
        iterations: 100,
        escapeRadius: 4,
        sequence: 'AB',
        aMin: 2,
        aMax: 4,
        bMin: 2,
        bMax: 4
      };

    case 'barnsley-fern':
      return {
        type: 'barnsley-fern',
        iterations: 100000,
        zoom: 50,
        offsetX: 0,
        offsetY: 9
      };

    default:
      throw new Error(`Unknown fractal type: ${type}`);
  }
}

/**
 * カラーパレット生成ユーティリティ
 */
export class ColorPalette {
  static generateHot(steps: number): string[] {
    const colors: string[] = [];
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const r = Math.min(255, Math.floor(255 * t * 3));
      const g = Math.min(255, Math.max(0, Math.floor(255 * (3 * t - 1))));
      const b = Math.min(255, Math.max(0, Math.floor(255 * (3 * t - 2))));
      colors.push(`rgb(${r}, ${g}, ${b})`);
    }
    return colors;
  }

  static generateCool(steps: number): string[] {
    const colors: string[] = [];
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const r = Math.floor(255 * t);
      const g = Math.floor(255 * (1 - t));
      const b = 255;
      colors.push(`rgb(${r}, ${g}, ${b})`);
    }
    return colors;
  }

  static generateRainbow(steps: number): string[] {
    const colors: string[] = [];
    for (let i = 0; i < steps; i++) {
      const hue = (i / steps) * 360;
      colors.push(`hsl(${hue}, 100%, 50%)`);
    }
    return colors;
  }

  static generateGrayscale(steps: number): string[] {
    const colors: string[] = [];
    for (let i = 0; i < steps; i++) {
      const value = Math.floor((i / (steps - 1)) * 255);
      colors.push(`rgb(${value}, ${value}, ${value})`);
    }
    return colors;
  }
}

/**
 * 座標変換ユーティリティ
 */
export class CoordinateTransform {
  static screenToComplex(
    screenX: number,
    screenY: number,
    canvasWidth: number,
    canvasHeight: number,
    centerX: number,
    centerY: number,
    zoom: number
  ): Complex {
    const aspectRatio = canvasWidth / canvasHeight;
    const x = (screenX - canvasWidth / 2) / zoom + centerX;
    const y = (screenY - canvasHeight / 2) / zoom * aspectRatio + centerY;
    return { real: x, imag: y };
  }

  static complexToScreen(
    complex: Complex,
    canvasWidth: number,
    canvasHeight: number,
    centerX: number,
    centerY: number,
    zoom: number
  ): { x: number; y: number } {
    const aspectRatio = canvasWidth / canvasHeight;
    const x = (complex.real - centerX) * zoom + canvasWidth / 2;
    const y = (complex.imag - centerY) * zoom / aspectRatio + canvasHeight / 2;
    return { x, y };
  }
}

/**
 * パフォーマンス測定ユーティリティ
 */
export class PerformanceMonitor {
  private static measurements: Map<string, number[]> = new Map();

  static start(name: string): void {
    performance.mark(`${name}-start`);
  }

  static end(name: string): number {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    const measure = performance.getEntriesByName(name, 'measure').pop();
    const duration = measure?.duration ?? 0;
    
    if (!this.measurements.has(name)) {
      this.measurements.set(name, []);
    }
    this.measurements.get(name)!.push(duration);
    
    return duration;
  }

  static getAverage(name: string): number {
    const measurements = this.measurements.get(name) ?? [];
    if (measurements.length === 0) return 0;
    return measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
  }

  static getMax(name: string): number {
    const measurements = this.measurements.get(name) ?? [];
    return Math.max(...measurements);
  }

  static getMin(name: string): number {
    const measurements = this.measurements.get(name) ?? [];
    return Math.min(...measurements);
  }

  static clear(name?: string): void {
    if (name) {
      this.measurements.delete(name);
    } else {
      this.measurements.clear();
    }
    performance.clearMarks();
    performance.clearMeasures();
  }
}

/**
 * メモリ使用量監視
 */
export class MemoryMonitor {
  static getUsage(): { used: number; total: number; percentage: number } | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
      };
    }
    return null;
  }

  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

/**
 * WebWorker管理ユーティリティ
 */
export class WorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private busyWorkers: Set<Worker> = new Set();

  constructor(workerScript: string, poolSize: number = navigator.hardwareConcurrency || 4) {
    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(workerScript, { type: 'module' });
      this.workers.push(worker);
      this.availableWorkers.push(worker);
    }
  }

  async execute<T>(message: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const worker = this.getAvailableWorker();
      if (!worker) {
        reject(new Error('No available workers'));
        return;
      }

      const messageId = crypto.randomUUID();
      const messageWithId = { ...message, id: messageId };

      const handleMessage = (event: MessageEvent) => {
        if (event.data.id === messageId) {
          worker.removeEventListener('message', handleMessage);
          worker.removeEventListener('error', handleError);
          this.releaseWorker(worker);

          if (event.data.type === 'error') {
            reject(new Error(event.data.payload.error));
          } else {
            resolve(event.data.payload);
          }
        }
      };

      const handleError = (error: ErrorEvent) => {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        this.releaseWorker(worker);
        reject(error);
      };

      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);
      worker.postMessage(messageWithId);
    });
  }

  private getAvailableWorker(): Worker | null {
    const worker = this.availableWorkers.pop();
    if (worker) {
      this.busyWorkers.add(worker);
    }
    return worker || null;
  }

  private releaseWorker(worker: Worker): void {
    this.busyWorkers.delete(worker);
    this.availableWorkers.push(worker);
  }

  terminate(): void {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.availableWorkers = [];
    this.busyWorkers.clear();
  }

  get size(): number {
    return this.workers.length;
  }

  get availableCount(): number {
    return this.availableWorkers.length;
  }

  get busyCount(): number {
    return this.busyWorkers.size;
  }
} 