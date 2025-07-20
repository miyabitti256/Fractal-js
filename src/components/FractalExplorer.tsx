import { useEffect, useMemo, useRef, useState } from 'react';
import { useFractalEngine } from '@/hooks/useFractalEngine';
import { useFractalInteraction } from '@/hooks/useFractalInteraction';
import DesktopControlPanel from './fractal/DesktopControlPanel';
import FractalCanvas, { type FractalCanvasRef } from './fractal/FractalCanvas';
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
  const [activeTab, setActiveTab] = useState<'params' | 'settings' | 'info'>('params');
  
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
          height: Math.min(optimalHeight, maxHeight)
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
          height: Math.min(optimalHeight, maxHeight)
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
    if (!fractalEngine.isLoading && canvasRef.current) {
      const context = canvasRef.current.getContext();
      if (context) {
        fractalEngine.renderFractal(context, canvasSize);
      }
    }
  }, [fractalEngine.isLoading, canvasSize]);

  // パラメータ変更時の再レンダリング
  useEffect(() => {
    if (fractalEngine.isLoading) return;

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
  ]);

  // エンジン情報の取得（メモ化）
  const engineInfo = useMemo(() => fractalEngine.getEngineInfo(), [fractalEngine.isLoading]);

  if (isMobile) {
    return (
      <div className={`h-screen ${className} relative overflow-hidden mobile-app`}
           style={{
             height: '100dvh', // 動的ビューポート対応
           }}>
        {/* フルスクリーンキャンバス */}
        <div className="fixed inset-0 bg-black flex items-center justify-center"
             style={{
               paddingTop: 'env(safe-area-inset-top)',
               paddingBottom: 'env(safe-area-inset-bottom)',
               paddingLeft: 'env(safe-area-inset-left)',
               paddingRight: 'env(safe-area-inset-right)',
             }}>
          {fractalEngine.isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white text-sm">フラクタルを初期化中...</p>
              </div>
            </div>
          )}

          {fractalEngine.isRendering && (
            <div className="absolute top-safe left-safe bg-black/70 text-white px-3 py-2 rounded-full z-10"
                 style={{
                   top: `calc(1rem + env(safe-area-inset-top))`,
                   left: `calc(1rem + env(safe-area-inset-left))`,
                 }}>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs">{Math.round(fractalEngine.renderProgress * 100)}%</span>
              </div>
            </div>
          )}

          {fractalEngine.error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
              <div className="text-center p-6 bg-red-900/90 rounded-lg mx-4">
                <p className="text-red-200 text-sm">エラー: {fractalEngine.error}</p>
                <button
                  onClick={() => fractalEngine.setError(null)}
                  className="mt-4 bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm"
                >
                  閉じる
                </button>
              </div>
            </div>
          )}

          {/* キャンバスコンテナ - 画面全体にフィット */}
          <div className="w-full h-full flex items-center justify-center">
            <FractalCanvas
              ref={canvasRef}
              canvasSize={canvasSize}
              parameters={fractalEngine.parameters}
              onPointerDown={interaction.handlePointerDown}
              onPointerMove={interaction.handlePointerMove}
              onPointerUp={interaction.handlePointerUp}
              onClick={interaction.handleCanvasClick}
              canvasRef={interaction.canvasRef}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* フローティングアクションボタン (FAB) */}
        <button
          onClick={() =>
            setBottomSheetHeight(bottomSheetHeight === 'collapsed' ? 'half' : 'collapsed')
          }
          className="fab w-14 h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 touch-target ui-element"
          style={{
            transform: bottomSheetHeight !== 'collapsed' ? 'scale(0.9)' : 'scale(1)',
            bottom: `calc(1.5rem + env(safe-area-inset-bottom))`,
            right: `calc(1.5rem + env(safe-area-inset-right))`,
          }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        />
      </div>
    );
  }

  // デスクトップレイアウト
  return (
    <div className={`flex flex-col lg:flex-row h-screen ${className}`}>
      <DesktopControlPanel
        fractalType={fractalEngine.fractalType}
        setFractalType={fractalEngine.setFractalType}
        parameters={fractalEngine.parameters}
        updateZoom={fractalEngine.updateZoom}
        updateIterations={fractalEngine.updateIterations}
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
      />

      {/* Canvas Area */}
      <div className="flex-1 relative bg-black">
        {fractalEngine.isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white">フラクタルを初期化中...</p>
            </div>
          </div>
        )}

        {fractalEngine.isRendering && (
          <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-2 rounded-lg z-10">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
              <span>レンダリング中... {Math.round(fractalEngine.renderProgress * 100)}%</span>
            </div>
          </div>
        )}

        {fractalEngine.error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
            <div className="text-center p-6 bg-red-900/90 rounded-lg">
              <p className="text-red-200">エラー: {fractalEngine.error}</p>
              <button
                onClick={() => fractalEngine.setError(null)}
                className="mt-4 bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded"
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
          <button
            onClick={fractalEngine.resetView}
            className="p-2 bg-gray-800/90 text-white rounded-lg hover:bg-gray-700/90 transition-colors"
            title="ビューをリセット"
          >
            ⌂
          </button>
          <button
            className="p-2 bg-gray-800/90 text-white rounded-lg hover:bg-gray-700/90 transition-colors"
            title="画像を保存 (準備中)"
            disabled
          >
            ⤓
          </button>
          <button
            className="p-2 bg-gray-800/90 text-white rounded-lg hover:bg-gray-700/90 transition-colors"
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
