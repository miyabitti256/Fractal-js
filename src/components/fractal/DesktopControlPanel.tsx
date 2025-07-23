import type { PerformanceMetrics } from '@/lib/fractal-engine';
import { ColorPalette } from '@/lib/fractal-utils';
import type {
  AllFractalParameters,
  FractalType,
  JuliaParameters,
  NewtonParameters,
} from '@/types/fractal';
import NewtonRootEditor from './NewtonRootEditor';

interface DesktopControlPanelProps {
  fractalType: FractalType;
  setFractalType: (type: FractalType) => void;
  parameters: AllFractalParameters;
  updateZoom: (value: number) => void;
  updateIterations: (value: number) => void;
  updateParameters: (updates: Partial<AllFractalParameters>) => void;
  canvasSize: { width: number; height: number };
  setCanvasSize: (size: { width: number; height: number }) => void;
  paletteType: string;
  setPaletteType: (type: string) => void;
  useWebGPU: boolean;
  setUseWebGPU: (value: boolean) => void;
  useMultiThread: boolean;
  setUseMultiThread: (value: boolean) => void;
  enableAnimation: boolean;
  setEnableAnimation: (value: boolean) => void;
  resetView: () => void;
  renderProgress: number;
  coordinates: { x: number; y: number };
  performanceMetrics: PerformanceMetrics | null;
  webGPUSupported: boolean;
  availableWorkers: number;
  // デュアルビューモード関連
  isDualViewAvailable: boolean;
  onEnterDualView: () => void;
}

const DesktopControlPanel: React.FC<DesktopControlPanelProps> = ({
  fractalType,
  setFractalType,
  parameters,
  updateZoom,
  updateIterations,
  updateParameters,
  canvasSize,
  setCanvasSize,
  paletteType,
  setPaletteType,
  useWebGPU,
  setUseWebGPU,
  useMultiThread,
  setUseMultiThread,
  enableAnimation,
  setEnableAnimation,
  resetView,
  renderProgress,
  coordinates,
  performanceMetrics,
  webGPUSupported,
  availableWorkers,
  isDualViewAvailable,
  onEnterDualView,
}) => {
  const fractalTypes: Array<{ value: FractalType; label: string; color: string }> = [
    { value: 'mandelbrot', label: 'Mandelbrot Set', color: 'text-fractal-mandelbrot' },
    { value: 'julia', label: 'Julia Set', color: 'text-fractal-julia' },
    { value: 'burning-ship', label: 'Burning Ship', color: 'text-fractal-burning' },
    { value: 'newton', label: 'Newton Fractal', color: 'text-fractal-newton' },
    { value: 'lyapunov', label: 'Lyapunov Fractal', color: 'text-fractal-lyapunov' },
    { value: 'barnsley-fern', label: 'Barnsley Fern', color: 'text-fractal-barnsley' },
  ];

  const canvasSizes = [
    { label: '800×600', width: 800, height: 600 },
    { label: '1024×768', width: 1024, height: 768 },
    { label: '1920×1080', width: 1920, height: 1080 },
    { label: '2560×1440', width: 2560, height: 1440 },
  ];

  return (
    <div className="w-full overflow-y-auto border-gray-700 border-r bg-gray-800/90 backdrop-blur-sm lg:w-80">
      <div className="p-6">
        <h1 className="mb-6 flex items-center gap-2 font-bold text-2xl text-white">
          <span className="text-primary-400">∞</span>
          Fractal Explorer
        </h1>

        {/* Fractal Type Selector */}
        <div className="mb-6">
          <div className="mb-3 block font-medium text-gray-300 text-sm">フラクタルタイプ</div>
          <div className="space-y-2">
            {fractalTypes.map((type) => (
              <button
                type="button"
                key={type.value}
                onClick={() => setFractalType(type.value)}
                className={`w-full rounded-lg border px-3 py-2 text-left transition-all ${
                  fractalType === type.value
                    ? 'border-primary-500 bg-primary-600 text-white'
                    : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                }`}
                disabled={!['mandelbrot', 'julia', 'burning-ship', 'newton'].includes(type.value)}
              >
                <span className={type.color}>●</span> {type.label}
                {!['mandelbrot', 'julia', 'burning-ship', 'newton'].includes(type.value) && (
                  <span className="ml-2 text-gray-500 text-xs">(準備中)</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Parameters */}
        <div className="mb-6">
          <div className="mb-3 block font-medium text-gray-300 text-sm">パラメータ</div>
          <div className="space-y-3">
            {/* 共通パラメータ: Zoom */}
            {'zoom' in parameters && (
              <div>
                <div className="mb-1 block text-gray-400 text-xs">
                  Zoom: {parameters.zoom.toExponential(2)}
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="500"
                  step="0.5"
                  value={Math.min(500, parameters.zoom)}
                  onChange={(e) => updateZoom(parseFloat(e.target.value))}
                  className="slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-700"
                />
              </div>
            )}

            {/* 共通パラメータ: Iterations */}
            {'iterations' in parameters && (
              <div>
                <div className="mb-1 block text-gray-400 text-xs">
                  Iterations: {parameters.iterations}
                </div>
                <input
                  type="number"
                  min="10"
                  max="100000"
                  step="10"
                  value={parameters.iterations}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!Number.isNaN(value)) {
                      updateIterations(value);
                    }
                  }}
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-gray-300 focus:border-primary-500 focus:outline-none"
                  placeholder="10 〜 100000"
                />
              </div>
            )}

            {/* Julia Set固有のパラメータ */}
            {fractalType === 'julia' && 'c' in parameters && (
              <>
                <div>
                  <div className="mb-1 block text-gray-400 text-xs">
                    Parameter C (Real): {(parameters as JuliaParameters).c.real.toFixed(3)}
                  </div>
                  <input
                    type="range"
                    min="-2"
                    max="2"
                    step="0.001"
                    value={(parameters as JuliaParameters).c.real}
                    onChange={(e) => {
                      const juliaParams = parameters as JuliaParameters;
                      const newC = { ...juliaParams.c, real: parseFloat(e.target.value) };
                      updateParameters({
                        ...juliaParams,
                        c: newC,
                      } as Partial<AllFractalParameters>);
                    }}
                    className="slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-700"
                  />
                </div>
                <div>
                  <div className="mb-1 block text-gray-400 text-xs">
                    Parameter C (Imaginary): {(parameters as JuliaParameters).c.imag.toFixed(3)}
                  </div>
                  <input
                    type="range"
                    min="-2"
                    max="2"
                    step="0.001"
                    value={(parameters as JuliaParameters).c.imag}
                    onChange={(e) => {
                      const juliaParams = parameters as JuliaParameters;
                      const newC = { ...juliaParams.c, imag: parseFloat(e.target.value) };
                      updateParameters({
                        ...juliaParams,
                        c: newC,
                      } as Partial<AllFractalParameters>);
                    }}
                    className="slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-700"
                  />
                </div>
              </>
            )}

            {/* Newton Fractal固有のパラメータ */}
            {fractalType === 'newton' && 'tolerance' in parameters && (
              <>
                <div>
                  <div className="mb-1 block text-gray-400 text-xs">
                    Tolerance: {(parameters as NewtonParameters).tolerance.toExponential(2)}
                  </div>
                  <input
                    type="range"
                    min="1e-10"
                    max="1e-3"
                    step="1e-10"
                    value={(parameters as NewtonParameters).tolerance}
                    onChange={(e) => {
                      const newtonParams = parameters as NewtonParameters;
                      updateParameters({
                        ...newtonParams,
                        tolerance: parseFloat(e.target.value),
                      } as Partial<AllFractalParameters>);
                    }}
                    className="slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-700"
                  />
                </div>

                {/* インタラクティブ根エディター */}
                <NewtonRootEditor
                  parameters={parameters as NewtonParameters}
                  updateParameters={updateParameters}
                  width={260}
                  height={260}
                />
              </>
            )}
          </div>
        </div>

        {/* Canvas Size */}
        <div className="mb-6">
          <div className="mb-3 block font-medium text-gray-300 text-sm">キャンバスサイズ</div>
          <select
            value={`${canvasSize.width}x${canvasSize.height}`}
            onChange={(e) => {
              const parts = e.target.value.split('x');
              const width = parseInt(parts[0] || '800', 10);
              const height = parseInt(parts[1] || '600', 10);
              setCanvasSize({ width, height });
            }}
            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-gray-300"
          >
            {canvasSizes.map((size) => (
              <option key={size.label} value={`${size.width}x${size.height}`}>
                {size.label}
              </option>
            ))}
          </select>
        </div>

        {/* Color Palette */}
        <div className="mb-6">
          <div className="mb-3 block font-medium text-gray-300 text-sm">カラーパレット</div>
          <select
            value={paletteType}
            onChange={(e) => setPaletteType(e.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-gray-300"
          >
            {ColorPalette.getPaletteNames().map((name) => (
              <option key={name} value={name}>
                {name.charAt(0).toUpperCase() + name.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Rendering Options */}
        <div className="mb-6">
          <div className="mb-3 block font-medium text-gray-300 text-sm">レンダリング設定</div>
          <div className="space-y-3">
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded text-primary-600"
                  checked={useWebGPU}
                  onChange={(e) => setUseWebGPU(e.target.checked)}
                />
                <span className="ml-2 text-gray-300 text-sm">
                  WebGPU加速 {webGPUSupported ? '✓' : '✗'}
                </span>
              </label>
              <p className="ml-6 text-gray-500 text-xs">GPU並列計算で高速レンダリング</p>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded text-primary-600"
                  checked={useMultiThread}
                  onChange={(e) => setUseMultiThread(e.target.checked)}
                />
                <span className="ml-2 text-gray-300 text-sm">
                  マルチスレッド ({availableWorkers} workers)
                </span>
              </label>
              <p className="ml-6 text-gray-500 text-xs">Web Workersで並列CPU計算</p>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded text-primary-600"
                  checked={enableAnimation}
                  onChange={(e) => setEnableAnimation(e.target.checked)}
                  disabled={true}
                />
                <span className="ml-2 text-gray-400 text-sm">アニメーション (準備中)</span>
              </label>
              <p className="ml-6 text-gray-500 text-xs">パラメータの時間的変化を表示</p>
            </div>

            <div className="space-y-1 border-gray-600 border-t pt-2">
              <p className="text-gray-400 text-xs">
                <span className="font-medium">現在のモード:</span>{' '}
                <span className="text-primary-400">
                  {useWebGPU && webGPUSupported
                    ? 'WebGPU'
                    : useMultiThread && availableWorkers
                      ? 'マルチスレッドCPU'
                      : 'シングルスレッドCPU'}
                </span>
              </p>
              <p className="text-gray-500 text-xs">
                WebGPU: {webGPUSupported ? '✅ 利用可能' : '❌ 非対応'}
              </p>
              <p className="text-gray-500 text-xs">
                Workers: {availableWorkers}/{navigator.hardwareConcurrency || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="mb-6 space-y-3">
          {/* デュアルビューボタン（ジュリア集合のみ） */}
          {isDualViewAvailable && (
            <button
              type="button"
              onClick={onEnterDualView}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
            >
              デュアルビューモード
            </button>
          )}

          <button
            type="button"
            onClick={resetView}
            className="w-full rounded-lg bg-primary-600 px-4 py-2 text-white transition-colors hover:bg-primary-700"
          >
            ビューをリセット
          </button>
        </div>

        {/* Performance */}
        <div className="space-y-1 text-gray-400 text-xs">
          <div>
            レンダリング進行:{' '}
            <span className="text-primary-400">{Math.round(renderProgress * 100)}%</span>
          </div>
          <div>
            座標:{' '}
            <span className="text-primary-400">
              x: {coordinates.x.toFixed(6)}, y: {coordinates.y.toFixed(6)}
            </span>
          </div>
          {performanceMetrics && (
            <div className="mt-2 border-gray-600 border-t pt-2">
              <div>
                FPS: <span className="text-green-400">{performanceMetrics.fps.toFixed(1)}</span>
              </div>
              <div>
                レンダリング時間:{' '}
                <span className="text-blue-400">
                  {performanceMetrics.lastRenderTime.toFixed(1)}ms
                </span>
              </div>
              <div>
                平均時間:{' '}
                <span className="text-blue-400">
                  {performanceMetrics.averageRenderTime.toFixed(1)}ms
                </span>
              </div>
              <div>
                メモリ使用量:{' '}
                <span className="text-yellow-400">
                  {performanceMetrics.memoryUsage.toFixed(1)}MB
                </span>
              </div>
              <div>
                レンダリング回数:{' '}
                <span className="text-gray-400">{performanceMetrics.renderCount}</span>
              </div>
            </div>
          )}
          <div className="mt-2 text-gray-500 text-xs">
            操作方法:
            <br />• ドラッグ: 移動
            <br />• ホイール: ズーム
            <br />• クリック: 中心移動
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesktopControlPanel;
