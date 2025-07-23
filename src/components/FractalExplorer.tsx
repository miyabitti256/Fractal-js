import { useEffect, useMemo, useRef, useState } from 'react';
import { useFractalEngine } from '@/hooks/useFractalEngine';
import { useFractalInteraction } from '@/hooks/useFractalInteraction';
import type { FractalType, TabId } from '@/types/fractal';
import DesktopControlPanel from './fractal/DesktopControlPanel';
import FractalCanvas, { type FractalCanvasRef } from './fractal/FractalCanvas';
import JuliaDualView from './fractal/JuliaDualView';
import MobileBottomSheet from './fractal/MobileBottomSheet';

interface FractalExplorerProps {
  className?: string;
}

const FractalExplorer: React.FC<FractalExplorerProps> = ({ className = '' }) => {
  const canvasRef = useRef<FractalCanvasRef>(null);

  // カスタムフックからロジックを取得
  const fractalEngine = useFractalEngine();

  // モバイル対応
  const [isMobile, setIsMobile] = useState(false);
  const [bottomSheetHeight, setBottomSheetHeight] = useState<'collapsed' | 'half' | 'full'>(
    'collapsed'
  );
  const [activeTab, setActiveTab] = useState<TabId>('params');

  // 画面サイズに基づく動的キャンバスサイズ計算
  const [canvasSize, setCanvasSize] = useState(() => {
    if (typeof window !== 'undefined') {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      if (screenWidth < 1024) {
        // モバイル: 画面の実際のサイズに合わせる（デバイスピクセル比考慮）
        const devicePixelRatio = window.devicePixelRatio || 1;
        const optimalWidth = Math.floor(screenWidth * devicePixelRatio);
        const optimalHeight = Math.floor(screenHeight * devicePixelRatio);

        // 最大解像度制限（パフォーマンス考慮）
        const maxWidth = 2048;
        const maxHeight = 2048;

        return {
          width: Math.min(optimalWidth, maxWidth),
          height: Math.min(optimalHeight, maxHeight),
        };
      }
    }
    return { width: 800, height: 600 }; // デスクトップ初期サイズ
  });

  // フラクタル操作フック
  const interaction = useFractalInteraction({
    parameters: fractalEngine.parameters,
    setParameters: fractalEngine.setParameters,
    canvasSize,
  });

  // 画面サイズ変更時の処理
  useEffect(() => {
    const updateScreenSize = () => {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const isMobileDevice = screenWidth < 1024;

      setIsMobile(isMobileDevice);

      if (isMobileDevice) {
        // モバイルの場合、画面サイズに合わせて動的調整
        const devicePixelRatio = window.devicePixelRatio || 1;
        const optimalWidth = Math.floor(screenWidth * devicePixelRatio);
        const optimalHeight = Math.floor(screenHeight * devicePixelRatio);

        // 最大解像度制限
        const maxWidth = 2048;
        const maxHeight = 2048;

        setCanvasSize({
          width: Math.min(optimalWidth, maxWidth),
          height: Math.min(optimalHeight, maxHeight),
        });
      }
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    window.addEventListener('orientationchange', updateScreenSize);

    return () => {
      window.removeEventListener('resize', updateScreenSize);
      window.removeEventListener('orientationchange', updateScreenSize);
    };
  }, []);

  // エンジン初期化
  useEffect(() => {
    fractalEngine.initializeEngine(canvasSize);
  }, [canvasSize, fractalEngine.initializeEngine]);

  // 初期レンダリング
  useEffect(() => {
    if (!fractalEngine.isLoading && canvasRef.current && !fractalEngine.isDualView) {
      const context = canvasRef.current.getContext();
      if (context) {
        fractalEngine.renderFractal(context, canvasSize);
      }
    }
  }, [fractalEngine.isLoading, canvasSize, fractalEngine.isDualView]);

  // パラメータ変更時の再レンダリング（デュアルビューモード以外）
  useEffect(() => {
    if (fractalEngine.isLoading || fractalEngine.isDualView) return;

    const timeoutId = setTimeout(() => {
      const context = canvasRef.current?.getContext();
      if (context) {
        fractalEngine.renderFractal(context, canvasSize);
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [
    fractalEngine.parameters,
    canvasSize,
    fractalEngine.paletteType,
    fractalEngine.useWebGPU,
    fractalEngine.useMultiThread,
    fractalEngine.isLoading,
    fractalEngine.isDualView,
  ]);

  // エンジン情報の取得（メモ化）
  const engineInfo = useMemo(() => fractalEngine.getEngineInfo(), [fractalEngine.isLoading]);

  // デュアルビューモードの場合は専用コンポーネントを表示
  if (fractalEngine.isDualView) {
    return (
      <div className={`h-screen ${className} bg-gray-900`}>
        <JuliaDualView
          onParameterChange={fractalEngine.updateDualViewC}
          onExitDualView={fractalEngine.exitDualView}
        />
      </div>
    );
  }

  if (isMobile) {
    return (
      <div
        className={`h-screen ${className} mobile-app relative overflow-hidden`}
        style={{
          height: '100dvh', // 動的ビューポート対応
        }}
      >
        {/* フルスクリーンキャンバス */}
        <div
          className="fixed inset-0 flex items-center justify-center bg-black"
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
            paddingLeft: 'env(safe-area-inset-left)',
            paddingRight: 'env(safe-area-inset-right)',
          }}
        >
          {fractalEngine.isLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
              <div className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
                <p className="text-sm text-white">フラクタルを初期化中...</p>
              </div>
            </div>
          )}

          {fractalEngine.isRendering && (
            <div
              className="absolute top-safe left-safe z-10 rounded-full bg-black/70 px-3 py-2 text-white"
              style={{
                top: `calc(1rem + env(safe-area-inset-top))`,
                left: `calc(1rem + env(safe-area-inset-left))`,
              }}
            >
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary-600 border-t-transparent"></div>
                <span className="text-xs">{Math.round(fractalEngine.renderProgress * 100)}%</span>
              </div>
            </div>
          )}

          {fractalEngine.error && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
              <div className="mx-4 rounded-lg bg-red-900/90 p-6 text-center">
                <p className="text-red-200 text-sm">エラー: {fractalEngine.error}</p>
                <button
                  type="button"
                  onClick={() => fractalEngine.setError(null)}
                  className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm text-white hover:bg-red-600"
                >
                  閉じる
                </button>
              </div>
            </div>
          )}

          {/* キャンバスコンテナ - 画面全体にフィット */}
          <div className="flex h-full w-full items-center justify-center">
            <FractalCanvas
              ref={canvasRef}
              canvasSize={canvasSize}
              parameters={fractalEngine.parameters}
              onPointerDown={interaction.handlePointerDown}
              onPointerMove={interaction.handlePointerMove}
              onPointerUp={interaction.handlePointerUp}
              onClick={interaction.handleCanvasClick}
              canvasRef={interaction.canvasRef}
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        {/* デュアルビューモードボタン（ジュリア集合のみ） */}
        {fractalEngine.fractalType === 'julia' && (
          <button
            type="button"
            onClick={fractalEngine.enterDualView}
            className="absolute z-10 rounded-lg bg-blue-600 px-3 py-2 text-white text-xs transition-colors hover:bg-blue-700"
            style={{
              top: `calc(1rem + env(safe-area-inset-top))`,
              right: `calc(1rem + env(safe-area-inset-right))`,
            }}
          >
            デュアルビュー
          </button>
        )}

        {/* フローティングアクションボタン (FAB) */}
        <button
          type="button"
          onClick={() =>
            setBottomSheetHeight(bottomSheetHeight === 'collapsed' ? 'half' : 'collapsed')
          }
          className="fab touch-target ui-element flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition-all duration-300 hover:bg-primary-700"
          style={{
            transform: bottomSheetHeight !== 'collapsed' ? 'scale(0.9)' : 'scale(1)',
            bottom: `calc(1.5rem + env(safe-area-inset-bottom))`,
            right: `calc(1.5rem + env(safe-area-inset-right))`,
          }}
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <title>ボトムシート</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
            />
          </svg>
        </button>

        {/* ボトムシート */}
        <MobileBottomSheet
          bottomSheetHeight={bottomSheetHeight}
          setBottomSheetHeight={setBottomSheetHeight}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          fractalType={fractalEngine.fractalType}
          setFractalType={fractalEngine.setFractalType}
          parameters={fractalEngine.parameters}
          updateZoom={fractalEngine.updateZoom}
          updateIterations={fractalEngine.updateIterations}
          updateParameters={fractalEngine.updateParameters}
          canvasSize={canvasSize}
          setCanvasSize={setCanvasSize}
          paletteType={fractalEngine.paletteType}
          setPaletteType={fractalEngine.setPaletteType}
          useWebGPU={fractalEngine.useWebGPU}
          setUseWebGPU={fractalEngine.setUseWebGPU}
          useMultiThread={fractalEngine.useMultiThread}
          setUseMultiThread={fractalEngine.setUseMultiThread}
          resetView={fractalEngine.resetView}
          renderProgress={fractalEngine.renderProgress}
          coordinates={interaction.coordinates}
          performanceMetrics={fractalEngine.performanceMetrics}
          webGPUSupported={engineInfo.webGPUSupported}
          availableWorkers={engineInfo.availableWorkers}
          // デュアルビューモード関連の追加
          isDualViewAvailable={fractalEngine.fractalType === 'julia'}
          onEnterDualView={fractalEngine.enterDualView}
        />
      </div>
    );
  }

  // デスクトップレイアウト
  return (
    <div className={`flex h-screen flex-col lg:flex-row ${className}`}>
      <DesktopControlPanel
        fractalType={fractalEngine.fractalType}
        setFractalType={fractalEngine.setFractalType}
        parameters={fractalEngine.parameters}
        updateZoom={fractalEngine.updateZoom}
        updateIterations={fractalEngine.updateIterations}
        updateParameters={fractalEngine.updateParameters}
        canvasSize={canvasSize}
        setCanvasSize={setCanvasSize}
        paletteType={fractalEngine.paletteType}
        setPaletteType={fractalEngine.setPaletteType}
        useWebGPU={fractalEngine.useWebGPU}
        setUseWebGPU={fractalEngine.setUseWebGPU}
        useMultiThread={fractalEngine.useMultiThread}
        setUseMultiThread={fractalEngine.setUseMultiThread}
        enableAnimation={fractalEngine.enableAnimation}
        setEnableAnimation={fractalEngine.setEnableAnimation}
        resetView={fractalEngine.resetView}
        renderProgress={fractalEngine.renderProgress}
        coordinates={interaction.coordinates}
        performanceMetrics={fractalEngine.performanceMetrics}
        webGPUSupported={engineInfo.webGPUSupported}
        availableWorkers={engineInfo.availableWorkers}
        // デュアルビューモード関連の追加
        isDualViewAvailable={fractalEngine.fractalType === 'julia'}
        onEnterDualView={fractalEngine.enterDualView}
      />

      {/* Canvas Area */}
      <div className="relative flex-1 bg-black">
        {fractalEngine.isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
            <div className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
              <p className="text-white">フラクタルを初期化中...</p>
            </div>
          </div>
        )}

        {fractalEngine.isRendering && (
          <div className="absolute top-4 left-4 z-10 rounded-lg bg-black/70 px-3 py-2 text-white">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-600 border-t-transparent"></div>
              <span>レンダリング中... {Math.round(fractalEngine.renderProgress * 100)}%</span>
            </div>
          </div>
        )}

        {fractalEngine.error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
            <div className="rounded-lg bg-red-900/90 p-6 text-center">
              <p className="text-red-200">エラー: {fractalEngine.error}</p>
              <button
                type="button"
                onClick={() => fractalEngine.setError(null)}
                className="mt-4 rounded bg-red-700 px-4 py-2 text-white hover:bg-red-600"
              >
                閉じる
              </button>
            </div>
          </div>
        )}

        <FractalCanvas
          ref={canvasRef}
          canvasSize={canvasSize}
          parameters={fractalEngine.parameters}
          onPointerDown={interaction.handlePointerDown}
          onPointerMove={interaction.handlePointerMove}
          onPointerUp={interaction.handlePointerUp}
          onClick={interaction.handleCanvasClick}
          canvasRef={interaction.canvasRef}
        />

        {/* Overlay Controls */}
        <div className="absolute top-4 right-4 space-y-2">
          {/* デュアルビューモードボタン（ジュリア集合のみ） */}
          {fractalEngine.fractalType === 'julia' && (
            <button
              type="button"
              onClick={fractalEngine.enterDualView}
              className="w-full rounded-lg bg-blue-600 p-2 text-sm text-white transition-colors hover:bg-blue-700"
              title="デュアルビューモード"
            >
              デュアルビュー
            </button>
          )}
          <button
            type="button"
            onClick={fractalEngine.resetView}
            className="rounded-lg bg-gray-800/90 p-2 text-white transition-colors hover:bg-gray-700/90"
            title="ビューをリセット"
          >
            ⌂
          </button>
          <button
            type="button"
            className="rounded-lg bg-gray-800/90 p-2 text-white transition-colors hover:bg-gray-700/90"
            title="画像を保存 (準備中)"
            disabled
          >
            ⤓
          </button>
          <button
            type="button"
            className="rounded-lg bg-gray-800/90 p-2 text-white transition-colors hover:bg-gray-700/90"
            title="フルスクリーン (準備中)"
            disabled
          >
            ⛶
          </button>
        </div>
      </div>
    </div>
  );
};

export default FractalExplorer;
