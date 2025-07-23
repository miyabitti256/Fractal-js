import { useCallback, useRef, useState } from 'react';
import type { PerformanceMetrics } from '@/lib/fractal-engine';
import { ColorPalette } from '@/lib/fractal-utils';
import type { AllFractalParameters, FractalType, NewtonParameters, TabId } from '@/types/fractal';
import NewtonRootEditor from './NewtonRootEditor';

interface MobileBottomSheetProps {
  bottomSheetHeight: 'collapsed' | 'half' | 'full';
  setBottomSheetHeight: (height: 'collapsed' | 'half' | 'full') => void;
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  fractalType: FractalType;
  setFractalType: (type: FractalType) => void;
  parameters: AllFractalParameters;
  updateZoom: (value: number) => void;
  updateIterations: (value: number) => void;
  updateParameters: (params: Partial<AllFractalParameters>) => void;
  canvasSize: { width: number; height: number };
  setCanvasSize: (size: { width: number; height: number }) => void;
  paletteType: string;
  setPaletteType: (type: string) => void;
  useWebGPU: boolean;
  setUseWebGPU: (value: boolean) => void;
  useMultiThread: boolean;
  setUseMultiThread: (value: boolean) => void;
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

const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  bottomSheetHeight,
  setBottomSheetHeight,
  activeTab,
  setActiveTab,
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
  resetView,
  renderProgress,
  coordinates,
  performanceMetrics,
  webGPUSupported,
  availableWorkers,
  isDualViewAvailable,
  onEnterDualView,
}) => {
  // ドラッグ操作用のstate
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentTranslateY, setCurrentTranslateY] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  // ドラッグ開始
  const handleDragStart = useCallback((e: React.TouchEvent | React.PointerEvent) => {
    setIsDragging(true);
    const clientY = 'touches' in e ? e.touches[0]?.clientY || 0 : e.clientY;
    setStartY(clientY);
    setCurrentTranslateY(0);
  }, []);

  // ドラッグ中
  const handleDragMove = useCallback(
    (e: React.TouchEvent | React.PointerEvent) => {
      if (!isDragging) return;

      // e.preventDefault();
      const clientY = 'touches' in e ? e.touches[0]?.clientY || 0 : e.clientY;
      const deltaY = clientY - startY;

      // ドラッグ範囲を制限
      const maxDrag = window.innerHeight * 0.8;
      const limitedDeltaY = Math.max(-maxDrag, Math.min(maxDrag, deltaY));

      setCurrentTranslateY(limitedDeltaY);
    },
    [isDragging, startY]
  );

  // ドラッグ終了
  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);
    const threshold = 100; // ピクセル単位の閾値

    // 現在の高さと移動距離に基づいて次の状態を決定
    if (bottomSheetHeight === 'collapsed') {
      if (currentTranslateY < -threshold) {
        setBottomSheetHeight('half');
      }
    } else if (bottomSheetHeight === 'half') {
      if (currentTranslateY > threshold) {
        setBottomSheetHeight('collapsed');
      } else if (currentTranslateY < -threshold) {
        setBottomSheetHeight('full');
      }
    } else if (bottomSheetHeight === 'full') {
      if (currentTranslateY > threshold) {
        setBottomSheetHeight('half');
      }
    }

    setCurrentTranslateY(0);
  }, [isDragging, currentTranslateY, bottomSheetHeight, setBottomSheetHeight]);

  // 高さに応じたtranslateY値を計算
  const getTranslateY = () => {
    if (isDragging) {
      // ドラッグ中は現在の移動量を適用
      const baseTranslate =
        bottomSheetHeight === 'collapsed' ? 100 : bottomSheetHeight === 'half' ? 50 : 0;
      const dragPercent = (currentTranslateY / window.innerHeight) * 100;
      return Math.max(0, Math.min(100, baseTranslate + dragPercent));
    }

    // 通常状態
    return bottomSheetHeight === 'collapsed' ? 100 : bottomSheetHeight === 'half' ? 50 : 0;
  };

  const fractalTypes: Array<{ value: FractalType; label: string }> = [
    { value: 'mandelbrot', label: 'Mandelbrot Set' },
    { value: 'julia', label: 'Julia Set' },
    { value: 'burning-ship', label: 'Burning Ship' },
    { value: 'newton', label: 'Newton Fractal' },
  ];

  const canvasSizes = [
    { label: '400×300', width: 400, height: 300 },
    { label: '600×400', width: 600, height: 400 },
    { label: '800×600', width: 800, height: 600 },
    { label: '1024×768', width: 1024, height: 768 },
    { label: '自動', width: canvasSize.width, height: canvasSize.height },
  ];

  const MobileTabContent = () => {
    switch (activeTab) {
      case 'params':
        return (
          <div className="space-y-6">
            <div>
              <div className="mb-4 block font-semibold text-lg text-white">パラメータ調整</div>

              <div className="space-y-4">
                <div className="rounded-xl bg-gray-700/50 p-4">
                  <div className="mb-2 block text-gray-300 text-sm">
                    ズーム倍率: {'zoom' in parameters ? parameters.zoom.toExponential(2) : 'N/A'}
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="500"
                    step="0.5"
                    value={'zoom' in parameters ? Math.min(500, parameters.zoom) : 1}
                    onChange={(e) => updateZoom(parseFloat(e.target.value))}
                    className="slider h-3 w-full cursor-pointer appearance-none rounded-full bg-gray-600"
                  />
                </div>

                <div className="rounded-xl bg-gray-700/50 p-4">
                  <div className="mb-2 block text-gray-300 text-sm">
                    反復回数: {'iterations' in parameters ? parameters.iterations : 'N/A'}
                  </div>
                  <input
                    type="number"
                    min="10"
                    max="100000"
                    step="10"
                    value={'iterations' in parameters ? parameters.iterations : 100}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (!Number.isNaN(value)) {
                        updateIterations(value);
                      }
                    }}
                    className="w-full rounded-lg border border-gray-500 bg-gray-600 px-3 py-2 text-gray-300 focus:border-primary-400 focus:outline-none"
                    placeholder="10 〜 100000"
                  />
                </div>

                {/* ニュートンフラクタル専用パラメータ */}
                {fractalType === 'newton' && 'tolerance' in parameters && (
                  <>
                    <div className="rounded-xl bg-gray-700/50 p-4">
                      <div className="mb-2 block text-gray-300 text-sm">
                        Tolerance: {(parameters as NewtonParameters).tolerance.toExponential(2)}
                      </div>
                      <input
                        type="range"
                        min="1e-10"
                        max="1e-3"
                        step="1e-10"
                        value={(parameters as NewtonParameters).tolerance}
                        onChange={(e) => {
                          updateParameters({
                            ...parameters,
                            tolerance: parseFloat(e.target.value),
                          });
                        }}
                        className="slider h-3 w-full cursor-pointer appearance-none rounded-full bg-gray-600"
                      />
                    </div>

                    {/* モバイル用の小さなインタラクティブエディター */}
                    <div className="rounded-xl bg-gray-700/50 p-2">
                      <NewtonRootEditor
                        parameters={parameters as NewtonParameters}
                        updateParameters={updateParameters}
                        width={340}
                        height={340}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* デュアルビューボタン（ジュリア集合のみ） */}
              {isDualViewAvailable && (
                <button
                  type="button"
                  onClick={onEnterDualView}
                  className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700"
                >
                  デュアルビューモード
                </button>
              )}

              <button
                type="button"
                onClick={resetView}
                className="mt-4 w-full rounded-xl bg-primary-600 px-4 py-3 font-medium text-white transition-colors hover:bg-primary-700"
              >
                ビューをリセット
              </button>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-6">
            <div>
              <div className="mb-4 block font-semibold text-lg text-white">設定</div>

              <div className="space-y-4">
                <div className="rounded-xl bg-gray-700/50 p-4">
                  <div className="mb-3 block text-gray-300 text-sm">フラクタルタイプ</div>
                  <select
                    value={fractalType}
                    onChange={(e) => setFractalType(e.target.value as FractalType)}
                    className="w-full rounded-lg border border-gray-500 bg-gray-600 px-3 py-2 text-white"
                  >
                    {fractalTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-xl bg-gray-700/50 p-4">
                  <div className="mb-3 block text-gray-300 text-sm">カラーパレット</div>
                  <select
                    value={paletteType}
                    onChange={(e) => setPaletteType(e.target.value)}
                    className="w-full rounded-lg border border-gray-500 bg-gray-600 px-3 py-2 text-white"
                  >
                    {ColorPalette.getPaletteNames().map((name) => (
                      <option key={name} value={name}>
                        {name.charAt(0).toUpperCase() + name.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-xl bg-gray-700/50 p-4">
                  <div className="mb-3 block text-gray-300 text-sm">キャンバスサイズ</div>
                  <select
                    value={`${canvasSize.width}x${canvasSize.height}`}
                    onChange={(e) => {
                      const parts = e.target.value.split('x');
                      const width = parseInt(parts[0] || '600', 10);
                      const height = parseInt(parts[1] || '400', 10);
                      setCanvasSize({ width, height });
                    }}
                    className="w-full rounded-lg border border-gray-500 bg-gray-600 px-3 py-2 text-white"
                  >
                    {canvasSizes.map((size) => (
                      <option key={size.label} value={`${size.width}x${size.height}`}>
                        {size.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3 rounded-xl bg-gray-700/50 p-4">
                  <div className="block text-gray-300 text-sm">レンダリング設定</div>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-3 rounded text-primary-600"
                      checked={useWebGPU}
                      onChange={(e) => setUseWebGPU(e.target.checked)}
                    />
                    <span className="text-white">WebGPU加速 {webGPUSupported ? '✅' : '❌'}</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-3 rounded text-primary-600"
                      checked={useMultiThread}
                      onChange={(e) => setUseMultiThread(e.target.checked)}
                    />
                    <span className="text-white">マルチスレッド ({availableWorkers} workers)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      case 'info':
        return (
          <div className="space-y-6">
            <div>
              <div className="mb-4 block font-semibold text-lg text-white">パフォーマンス情報</div>

              <div className="space-y-4">
                <div className="rounded-xl bg-gray-700/50 p-4">
                  <div className="space-y-2 text-gray-300 text-sm">
                    <div>
                      レンダリング進行:{' '}
                      <span className="text-primary-400">{Math.round(renderProgress * 100)}%</span>
                    </div>
                    <div>
                      座標:{' '}
                      <span className="text-primary-400">
                        x: {coordinates.x.toFixed(4)}, y: {coordinates.y.toFixed(4)}
                      </span>
                    </div>
                    {performanceMetrics && (
                      <>
                        <div>
                          FPS:{' '}
                          <span className="text-green-400">
                            {performanceMetrics.fps.toFixed(1)}
                          </span>
                        </div>
                        <div>
                          レンダリング時間:{' '}
                          <span className="text-blue-400">
                            {performanceMetrics.lastRenderTime.toFixed(1)}ms
                          </span>
                        </div>
                        <div>
                          メモリ使用量:{' '}
                          <span className="text-yellow-400">
                            {performanceMetrics.memoryUsage.toFixed(1)}MB
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="rounded-xl bg-gray-700/50 p-4">
                  <div className="text-gray-300 text-sm">
                    <p className="mb-2 font-medium">操作方法:</p>
                    <ul className="space-y-1">
                      <li>• タップ&ドラッグ: 移動</li>
                      <li>• ピンチ: ズーム</li>
                      <li>• タップ: 中心移動</li>
                    </ul>
                  </div>
                </div>

                <div className="rounded-xl bg-gray-700/50 p-4">
                  <div className="text-gray-300 text-sm">
                    <p className="mb-2 font-medium">現在のモード:</p>
                    <p className="text-primary-400">
                      {useWebGPU && webGPUSupported
                        ? 'WebGPU'
                        : useMultiThread && availableWorkers
                          ? 'マルチスレッドCPU'
                          : 'シングルスレッドCPU'}
                    </p>
                    <p className="mt-1 text-gray-400 text-xs">
                      Workers: {availableWorkers}/{navigator.hardwareConcurrency || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={`hw-accelerated ui-element fixed right-0 bottom-0 bottom-sheet left-0 z-40 rounded-t-3xl bg-gray-800 shadow-2xl ${
        isDragging ? '' : 'transition-transform duration-300'
      }`}
      style={{
        height: '85vh',
        minHeight: '400px',
        transform: `translateY(${getTranslateY()}%)`,
        paddingBottom: 'env(safe-area-inset-bottom)',
        touchAction: 'none',
      }}
      ref={sheetRef}
    >
      {/* ハンドル */}
      <div
        className="drag-handle touch-target ui-element flex justify-center pt-3 pb-1"
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
        style={{ touchAction: 'none' }}
      >
        <div className="h-1 w-10 rounded-full bg-gray-400"></div>
      </div>

      {/* ヘッダー */}
      <div className="flex items-center justify-between border-gray-700 border-b p-4">
        <h2 className="font-bold text-lg text-white">Fractal Explorer</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setBottomSheetHeight(bottomSheetHeight === 'full' ? 'half' : 'full')}
            className="rounded-lg bg-gray-700 p-2 text-white transition-colors hover:bg-gray-600"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <title>{bottomSheetHeight === 'full' ? '下に縮める' : '上に広げる'}</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={
                  bottomSheetHeight === 'full'
                    ? 'M19 14l-7-7m0 0l-7 7m7-7v18'
                    : 'M5 10l7-7m0 0l7 7m-7-7v18'
                }
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setBottomSheetHeight('collapsed')}
            className="rounded-lg bg-gray-700 p-2 text-white transition-colors hover:bg-gray-600"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <title>閉じる</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="flex border-gray-700 border-b">
        {[
          { id: 'params' as const, label: 'パラメータ', icon: '⚙️' },
          { id: 'settings' as const, label: '設定', icon: '🔧' },
          { id: 'info' as const, label: '情報', icon: '📊' },
        ].map((tab) => (
          <button
            type="button"
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-3 font-medium text-sm transition-colors ${
              activeTab === tab.id
                ? 'border-primary-400 border-b-2 bg-gray-700/50 text-primary-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* タブコンテンツ */}
      <div
        className="mobile-scroll smooth-scroll bottom-sheet-content flex-1 overflow-y-auto p-4"
        style={{ maxHeight: 'calc(100vh - 200px)' }}
      >
        <MobileTabContent />
      </div>
    </div>
  );
};

export default MobileBottomSheet;
