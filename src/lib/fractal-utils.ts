import type { AllFractalParameters, Complex, FractalType } from '@/types/fractal';

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
      imag: a.real * b.imag + a.imag * b.real,
    };
  }

  static divide(a: Complex, b: Complex): Complex {
    const denominator = b.real * b.real + b.imag * b.imag;
    return {
      real: (a.real * b.real + a.imag * b.imag) / denominator,
      imag: (a.imag * b.real - a.real * b.imag) / denominator,
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
    const rPowN = r ** n;
    const nTheta = n * theta;
    return {
      real: rPowN * Math.cos(nTheta),
      imag: rPowN * Math.sin(nTheta),
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
        zoom: 1,
        centerX: -0.5,
        centerY: 0,
        iterations: 100,
        escapeRadius: 4,
      };

    case 'julia':
      return {
        type: 'julia',
        zoom: 200,
        centerX: 0,
        centerY: 0,
        iterations: 100,
        escapeRadius: 4,
        c: { real: -0.7, imag: 0.27015 },
      };

    case 'burning-ship':
      return {
        type: 'burning-ship',
        zoom: 200,
        centerX: -0.5,
        centerY: -0.5,
        iterations: 100,
        escapeRadius: 4,
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
          { real: 1, imag: 0 }, // z^3
          { real: 0, imag: 0 }, // z^2
          { real: 0, imag: 0 }, // z
          { real: -1, imag: 0 }, // constant
        ],
        tolerance: 1e-6,
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
        bMax: 4,
      };

    case 'barnsley-fern':
      return {
        type: 'barnsley-fern',
        iterations: 100000,
        zoom: 50,
        offsetX: 0,
        offsetY: 9,
      };

    default:
      throw new Error(`Unknown fractal type: ${type}`);
  }
}

/**
 * 拡張されたカラーパレット生成ユーティリティ
 */
export class ColorPalette {
  static generateHot(steps: number): number[][] {
    const colors: number[][] = [];
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const r = Math.min(255, Math.floor(255 * t * 3));
      const g = Math.min(255, Math.max(0, Math.floor(255 * (3 * t - 1))));
      const b = Math.min(255, Math.max(0, Math.floor(255 * (3 * t - 2))));
      colors.push([r, g, b, 255]);
    }
    return colors;
  }

  static generateCool(steps: number): number[][] {
    const colors: number[][] = [];
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const r = Math.floor(255 * t);
      const g = Math.floor(255 * (1 - t));
      const b = 255;
      colors.push([r, g, b, 255]);
    }
    return colors;
  }

  static generateRainbow(steps: number): number[][] {
    const colors: number[][] = [];
    for (let i = 0; i < steps; i++) {
      const hue = (i / steps) * 360;
      const [r, g, b] = ColorPalette.hslToRgb(hue, 100, 50);
      colors.push([r, g, b, 255]);
    }
    return colors;
  }

  static generateGrayscale(steps: number): number[][] {
    const colors: number[][] = [];
    for (let i = 0; i < steps; i++) {
      const value = Math.floor((i / (steps - 1)) * 255);
      colors.push([value, value, value, 255]);
    }
    return colors;
  }

  static generateMandelbrot(steps: number): number[][] {
    const colors: number[][] = [];
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);

      // 複数の色相を組み合わせ
      if (t < 0.16) {
        const s = t / 0.16;
        colors.push([Math.floor(s * 66), Math.floor(s * 30), Math.floor(s * 15), 255]);
      } else if (t < 0.42) {
        const s = (t - 0.16) / 0.26;
        colors.push([
          Math.floor(66 + s * (25 - 66)),
          Math.floor(30 + s * (7 - 30)),
          Math.floor(15 + s * (26 - 15)),
          255,
        ]);
      } else if (t < 0.6425) {
        const s = (t - 0.42) / 0.2225;
        colors.push([
          Math.floor(25 + s * (9 - 25)),
          Math.floor(7 + s * (1 - 7)),
          Math.floor(26 + s * (47 - 26)),
          255,
        ]);
      } else if (t < 0.8575) {
        const s = (t - 0.6425) / 0.215;
        colors.push([
          Math.floor(9 + s * (2 - 9)),
          Math.floor(1 + s * (4 - 1)),
          Math.floor(47 + s * (73 - 47)),
          255,
        ]);
      } else {
        const s = (t - 0.8575) / 0.1425;
        colors.push([
          Math.floor(2 + s * (0 - 2)),
          Math.floor(4 + s * (7 - 4)),
          Math.floor(73 + s * (100 - 73)),
          255,
        ]);
      }
    }
    return colors;
  }

  static generateFire(steps: number): number[][] {
    const colors: number[][] = [];
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);

      if (t < 0.5) {
        const s = t * 2;
        colors.push([Math.floor(s * 255), 0, 0, 255]);
      } else {
        const s = (t - 0.5) * 2;
        colors.push([255, Math.floor(s * 255), Math.floor(s * 100), 255]);
      }
    }
    return colors;
  }

  static generateOcean(steps: number): number[][] {
    const colors: number[][] = [];
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);

      if (t < 0.5) {
        const s = t * 2;
        colors.push([0, Math.floor(s * 100), Math.floor(50 + s * 205), 255]);
      } else {
        const s = (t - 0.5) * 2;
        colors.push([Math.floor(s * 100), Math.floor(100 + s * 155), 255, 255]);
      }
    }
    return colors;
  }

  static generateSunset(steps: number): number[][] {
    const colors: number[][] = [];
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);

      if (t < 0.3) {
        const s = t / 0.3;
        colors.push([Math.floor(50 + s * 205), Math.floor(s * 50), Math.floor(s * 100), 255]);
      } else if (t < 0.7) {
        const s = (t - 0.3) / 0.4;
        colors.push([255, Math.floor(50 + s * 165), Math.floor(100 + s * 55), 255]);
      } else {
        const s = (t - 0.7) / 0.3;
        colors.push([255, Math.floor(215 + s * 40), Math.floor(155 + s * 100), 255]);
      }
    }
    return colors;
  }

  static generateCustom(colors: [number, number, number][], steps: number): number[][] {
    if (colors.length < 2) {
      throw new Error('At least 2 colors are required for custom palette');
    }

    const result: number[][] = [];
    const segmentSize = steps / (colors.length - 1);

    for (let i = 0; i < steps; i++) {
      const position = (i / (steps - 1)) * (colors.length - 1);
      const segmentIndex = Math.floor(position);
      const t = position - segmentIndex;

      const color1 = colors[segmentIndex];
      const color2 = colors[Math.min(segmentIndex + 1, colors.length - 1)];

      if (!color1 || !color2) {
        result.push([0, 0, 0, 255]);
        continue;
      }

      const r = Math.floor(color1[0] * (1 - t) + color2[0] * t);
      const g = Math.floor(color1[1] * (1 - t) + color2[1] * t);
      const b = Math.floor(color1[2] * (1 - t) + color2[2] * t);

      result.push([r, g, b, 255]);
    }

    return result;
  }

  private static hslToRgb(h: number, s: number, l: number): [number, number, number] {
    h = h / 360;
    s = s / 100;
    l = l / 100;

    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    let r: number, g: number, b: number;

    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  /**
   * カラーパレットをImageDataに適用
   */
  static applyPalette(
    iterationData: number[][],
    maxIterations: number,
    paletteType: string = 'mandelbrot'
  ): ImageData {
    if (!iterationData || iterationData.length === 0 || !iterationData[0]) {
      return new ImageData(1, 1);
    }

    const width = iterationData[0].length;
    const height = iterationData.length;
    const imageData = new ImageData(width, height);

    const palette = ColorPalette.getPalette(paletteType, 256);

    for (let y = 0; y < height; y++) {
      const row = iterationData[y];
      if (!row) continue;

      for (let x = 0; x < width; x++) {
        const iterations = row[x];
        if (iterations === undefined) continue;

        const index = (y * width + x) * 4;

        if (iterations === maxIterations) {
          // 集合内の点は黒
          imageData.data[index] = 0;
          imageData.data[index + 1] = 0;
          imageData.data[index + 2] = 0;
          imageData.data[index + 3] = 255;
        } else {
          // カラーパレットから色を取得
          const colorIndex = Math.floor((iterations / maxIterations) * (palette.length - 1));
          const color = palette[colorIndex];
          if (color) {
            imageData.data[index] = color[0] || 0;
            imageData.data[index + 1] = color[1] || 0;
            imageData.data[index + 2] = color[2] || 0;
            imageData.data[index + 3] = color[3] || 255;
          }
        }
      }
    }

    return imageData;
  }

  static getPalette(type: string, steps: number = 256): number[][] {
    switch (type) {
      case 'hot':
        return ColorPalette.generateHot(steps);
      case 'cool':
        return ColorPalette.generateCool(steps);
      case 'rainbow':
        return ColorPalette.generateRainbow(steps);
      case 'grayscale':
        return ColorPalette.generateGrayscale(steps);
      case 'mandelbrot':
        return ColorPalette.generateMandelbrot(steps);
      case 'fire':
        return ColorPalette.generateFire(steps);
      case 'ocean':
        return ColorPalette.generateOcean(steps);
      case 'sunset':
        return ColorPalette.generateSunset(steps);
      default:
        return ColorPalette.generateMandelbrot(steps);
    }
  }

  static getPaletteNames(): string[] {
    return ['mandelbrot', 'hot', 'cool', 'rainbow', 'fire', 'ocean', 'sunset', 'grayscale'];
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
    const y = ((screenY - canvasHeight / 2) / zoom) * aspectRatio + centerY;
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
    const y = ((complex.imag - centerY) * zoom) / aspectRatio + canvasHeight / 2;
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

    if (!PerformanceMonitor.measurements.has(name)) {
      PerformanceMonitor.measurements.set(name, []);
    }
    PerformanceMonitor.measurements.get(name)!.push(duration);

    return duration;
  }

  static getAverage(name: string): number {
    const measurements = PerformanceMonitor.measurements.get(name) ?? [];
    if (measurements.length === 0) return 0;
    return measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
  }

  static getMax(name: string): number {
    const measurements = PerformanceMonitor.measurements.get(name) ?? [];
    return Math.max(...measurements);
  }

  static getMin(name: string): number {
    const measurements = PerformanceMonitor.measurements.get(name) ?? [];
    return Math.min(...measurements);
  }

  static clear(name?: string): void {
    if (name) {
      PerformanceMonitor.measurements.delete(name);
    } else {
      PerformanceMonitor.measurements.clear();
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
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
      };
    }
    return null;
  }

  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / k ** i).toFixed(2)) + ' ' + sizes[i];
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
    this.workers.forEach((worker) => worker.terminate());
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
