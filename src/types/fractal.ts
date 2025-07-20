// フラクタルタイプの定義
export type FractalType =
  | 'mandelbrot'
  | 'julia'
  | 'burning-ship'
  | 'newton'
  | 'lyapunov'
  | 'barnsley-fern';

// 複素数の型定義
export interface Complex {
  real: number;
  imag: number;
}

// フラクタルパラメータの基本型
export interface FractalParameters {
  zoom: number;
  centerX: number;
  centerY: number;
  iterations: number;
  escapeRadius: number;
}

// Mandelbrot/Julia集合のパラメータ
export interface MandelbrotParameters extends FractalParameters {
  type: 'mandelbrot';
}

export interface JuliaParameters extends FractalParameters {
  type: 'julia';
  c: Complex;
}

// Burning Ship フラクタルのパラメータ
export interface BurningShipParameters extends FractalParameters {
  type: 'burning-ship';
}

// Newton フラクタルのパラメータ
export interface NewtonParameters extends FractalParameters {
  type: 'newton';
  polynomial: Complex[];
  tolerance: number;
  roots: Complex[]; // 根の配列を追加
}

// Lyapunov フラクタルのパラメータ
export interface LyapunovParameters extends FractalParameters {
  type: 'lyapunov';
  sequence: string;
  aMin: number;
  aMax: number;
  bMin: number;
  bMax: number;
}

// Barnsley Fern のパラメータ
export interface BarnsleyFernParameters {
  type: 'barnsley-fern';
  iterations: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
}

// 全てのフラクタルパラメータの統合型
export type AllFractalParameters =
  | MandelbrotParameters
  | JuliaParameters
  | BurningShipParameters
  | NewtonParameters
  | LyapunovParameters
  | BarnsleyFernParameters;

// カラーマッピングの種類
export type ColorMapType = 'hot' | 'cool' | 'rainbow' | 'grayscale' | 'custom';

// カラーパレット設定
export interface ColorPalette {
  type: ColorMapType;
  colors: string[];
  smooth: boolean;
  cyclic: boolean;
}

// レンダリング設定
export interface RenderSettings {
  width: number;
  height: number;
  useWebGPU: boolean;
  useMultiThread: boolean;
  workerCount: number;
  tileSize: number;
  antiAliasing: boolean;
  colorPalette: ColorPalette;
}

// レンダリング結果
export interface RenderResult {
  imageData: ImageData;
  renderTime: number;
  iterations: number[][];
  convergenceData?: number[][];
}

// パフォーマンス統計
export interface PerformanceStats {
  fps: number;
  renderTime: number;
  gpuMemoryUsage: number;
  cpuUsage: number;
  workerCount: number;
}

// WebGPU関連の型
export interface WebGPUContext {
  device: GPUDevice;
  context: unknown; // GPUCanvasContext
  format: string; // GPUTextureFormat
  pipeline: unknown; // GPUComputePipeline
  bindGroup: unknown; // GPUBindGroup
}

// Performance Memory API の型定義
export interface PerformanceMemory {
  readonly usedJSHeapSize: number;
  readonly totalJSHeapSize: number;
  readonly jsHeapSizeLimit: number;
}

// 拡張されたPerformance型
export interface ExtendedPerformance extends Performance {
  memory?: PerformanceMemory;
}

// Worker メッセージのペイロード型
export interface WorkerErrorPayload {
  error: string;
  details?: string;
  stack?: string;
}

// タブID型（MobileBottomSheet用）
export type TabId = 'params' | 'settings' | 'info';

// WorkerPool用の基本メッセージ型
export interface WorkerPoolMessage {
  id?: string;
  type: string;
  payload?: unknown;
}

// Worker メッセージの型
export interface WorkerMessage {
  type: 'render' | 'cancel' | 'status' | 'result';
  id: string;
  payload: unknown;
}

export interface RenderMessage extends WorkerMessage {
  type: 'render';
  payload: {
    parameters: AllFractalParameters;
    settings: RenderSettings;
    region: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
}

export interface ResultMessage extends WorkerMessage {
  type: 'result';
  payload: {
    result: RenderResult;
    region: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
}

// エラー型
export interface FractalError {
  code: string;
  message: string;
  details?: unknown;
}

// 設定の永続化用
export interface FractalConfig {
  fractalType: FractalType;
  parameters: AllFractalParameters;
  renderSettings: RenderSettings;
  bookmarks: Array<{
    name: string;
    parameters: AllFractalParameters;
    thumbnail?: string;
  }>;
}
