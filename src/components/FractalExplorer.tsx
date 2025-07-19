import { useState, useEffect, useRef } from 'react';
import type { FractalType } from '@/types/fractal';

interface FractalExplorerProps {
  className?: string;
}

const FractalExplorer: React.FC<FractalExplorerProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fractalType, setFractalType] = useState<FractalType>('mandelbrot');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeFractal = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);
        
        // フラクタル初期化ロジックをここに実装
        await new Promise(resolve => setTimeout(resolve, 1000)); // 仮の遅延
        
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setIsLoading(false);
      }
    };

    initializeFractal();
  }, [fractalType]);

  const fractalTypes: Array<{ value: FractalType; label: string; color: string }> = [
    { value: 'mandelbrot', label: 'Mandelbrot Set', color: 'text-fractal-mandelbrot' },
    { value: 'julia', label: 'Julia Set', color: 'text-fractal-julia' },
    { value: 'burning-ship', label: 'Burning Ship', color: 'text-fractal-burning' },
    { value: 'newton', label: 'Newton Fractal', color: 'text-fractal-newton' },
    { value: 'lyapunov', label: 'Lyapunov Fractal', color: 'text-fractal-lyapunov' },
    { value: 'barnsley-fern', label: 'Barnsley Fern', color: 'text-fractal-barnsley' },
  ];

  return (
    <div className={`flex flex-col lg:flex-row h-screen ${className}`}>
      {/* Control Panel */}
      <div className="w-full lg:w-80 bg-gray-800/90 backdrop-blur-sm border-r border-gray-700 overflow-y-auto">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="text-primary-400">∞</span>
            Fractal Explorer
          </h1>
          
          {/* Fractal Type Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              フラクタルタイプ
            </label>
            <div className="space-y-2">
              {fractalTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setFractalType(type.value)}
                  className={`w-full text-left px-3 py-2 rounded-lg border transition-all ${
                    fractalType === type.value
                      ? 'bg-primary-600 border-primary-500 text-white'
                      : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-600/50'
                  }`}
                >
                  <span className={type.color}>●</span> {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Parameters */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              パラメータ
            </label>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Zoom</label>
                <input
                  type="range"
                  min="0.1"
                  max="1000"
                  step="0.1"
                  defaultValue="1"
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Iterations</label>
                <input
                  type="range"
                  min="10"
                  max="1000"
                  step="10"
                  defaultValue="100"
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Rendering Options */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              レンダリング設定
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input type="checkbox" className="rounded text-primary-600" defaultChecked />
                <span className="ml-2 text-sm text-gray-300">WebGPU加速</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="rounded text-primary-600" defaultChecked />
                <span className="ml-2 text-sm text-gray-300">マルチスレッド</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="rounded text-primary-600" />
                <span className="ml-2 text-sm text-gray-300">アニメーション</span>
              </label>
            </div>
          </div>

          {/* Performance */}
          <div className="text-xs text-gray-400 space-y-1">
            <div>FPS: <span className="text-primary-400">60</span></div>
            <div>Render Time: <span className="text-primary-400">16ms</span></div>
            <div>GPU Memory: <span className="text-primary-400">45MB</span></div>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative bg-black">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white">Loading fractal...</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
            <div className="text-center p-6 bg-red-900/90 rounded-lg">
              <p className="text-red-200">Error: {error}</p>
            </div>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          style={{ imageRendering: 'pixelated' }}
        />
        
        {/* Overlay Controls */}
        <div className="absolute top-4 right-4 space-y-2">
          <button className="p-2 bg-gray-800/90 text-white rounded-lg hover:bg-gray-700/90 transition-colors">
            <span className="sr-only">Reset zoom</span>
            ⌂
          </button>
          <button className="p-2 bg-gray-800/90 text-white rounded-lg hover:bg-gray-700/90 transition-colors">
            <span className="sr-only">Save image</span>
            ⤓
          </button>
          <button className="p-2 bg-gray-800/90 text-white rounded-lg hover:bg-gray-700/90 transition-colors">
            <span className="sr-only">Full screen</span>
            ⛶
          </button>
        </div>

        {/* Coordinates Display */}
        <div className="absolute bottom-4 left-4 px-3 py-1 bg-gray-800/90 text-white text-sm rounded font-mono">
          x: 0.000, y: 0.000
        </div>
      </div>
    </div>
  );
};

export default FractalExplorer; 