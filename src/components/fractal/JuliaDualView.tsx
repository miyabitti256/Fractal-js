import { useCallback, useEffect, useRef, useState } from 'react';
import type { Complex, JuliaParameters, MandelbrotParameters } from '@/types/fractal';
import { FractalEngine } from '@/lib/fractal-engine';
import { getDefaultParameters } from '@/lib/fractal-utils';
import { ColorPalette } from '@/lib/fractal-utils';

interface JuliaDualViewProps {
  onParameterChange: (c: Complex) => void;
  onExitDualView: () => void;
  className?: string;
}

const JuliaDualView: React.FC<JuliaDualViewProps> = ({
  onParameterChange,
  onExitDualView,
  className = '',
}) => {
  const mandelbrotCanvasRef = useRef<HTMLCanvasElement>(null);
  const juliaCanvasRef = useRef<HTMLCanvasElement>(null);
  const fractalEngineRef = useRef<FractalEngine | null>(null);
  const juliaRenderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef<boolean>(false);
  const mandelbrotImageDataRef = useRef<ImageData | null>(null); // マンデルブロ集合の画像データを保存
  const lastJuliaParamsRef = useRef<string>(''); // ジュリア集合の前回パラメータキャッシュ
  const dragEndTimeoutRef = useRef<NodeJS.Timeout | null>(null); // ドラッグ終了時の高解像度レンダリング用
  
  const [isMobile, setIsMobile] = useState(false);
  const [currentC, setCurrentC] = useState<Complex>({ real: -0.7, imag: 0.27015 });
  const [juliaIterations, setJuliaIterations] = useState(100);
  const [isJuliaRendering, setIsJuliaRendering] = useState(false);
  const [isMandelbrotRendering, setIsMandelbrotRendering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedPalette, setSelectedPalette] = useState('mandelbrot');

  // ビューポートに応じた動的サイズ計算
  const getCanvasSize = useCallback(() => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    if (isMobile) {
      // モバイル: 各キャンバスが画面の約40%を使用（縦に2つ配置）
      const availableWidth = Math.floor(viewportWidth - 32); // パディング考慮
      const headerHeight = 60; // 下部ヘッダー高さ
      const availableHeight = Math.floor((viewportHeight - headerHeight - 48) / 2); // 2つのキャンバス + 区切り線
      const size = Math.min(availableWidth, availableHeight, 280);
      
      return {
        mandelbrot: { width: size, height: size, renderWidth: Math.floor(size * 0.9), renderHeight: Math.floor(size * 0.9) },
        julia: { width: size, height: size, renderWidth: size, renderHeight: size }
      };
    } else {
      // デスクトップ: サイドパネルを考慮したレイアウト
      const sidebarWidth = 320; // w-80 = 320px
      const availableWidth = Math.floor((viewportWidth - sidebarWidth - 64) / 2); // ギャップ・パディングを考慮
      const availableHeight = Math.floor(viewportHeight * 0.7); // ヘッダーを考慮
      const size = Math.min(Math.max(availableWidth, 280), Math.max(availableHeight, 280), 480);
      
      return {
        mandelbrot: { width: size, height: size, renderWidth: Math.floor(size * 0.8), renderHeight: Math.floor(size * 0.8) },
        julia: { width: size, height: size, renderWidth: size, renderHeight: size }
      };
    }
  }, [isMobile]);

  const [canvasSize, setCanvasSize] = useState(() => getCanvasSize());

  // カラーパレットオプション（通常モードと同じものを使用）
  const paletteOptions = ColorPalette.getPaletteNames().map(name => ({
    value: name,
    label: name.charAt(0).toUpperCase() + name.slice(1),
    description: getPaletteDescription(name)
  }));

  // パレットの説明を取得
  function getPaletteDescription(name: string): string {
    const descriptions: Record<string, string> = {
      mandelbrot: '深いブルー系',
      julia: 'ジュリア専用',
      newton: 'ニュートン専用', 
      hot: '赤-黄-白',
      cool: 'シアン-ブルー',
      rainbow: 'カラフル',
      fire: '赤-オレンジ',
      ocean: 'ブルー系',
      sunset: 'オレンジ-ピンク',
      grayscale: '白黒'
    };
    return descriptions[name] || name;
  }

  // 画面サイズ検出とキャンバスサイズ更新
  useEffect(() => {
    const checkMobile = () => {
      const wasMobile = isMobile;
      const nowMobile = window.innerWidth < 1024;
      setIsMobile(nowMobile);
      
      // モバイル状態が変わった場合、キャンバスサイズを再計算
      if (wasMobile !== nowMobile) {
        setCanvasSize(getCanvasSize());
      }
    };
    
    const handleResize = () => {
      setCanvasSize(getCanvasSize());
    };
    
    checkMobile();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile, getCanvasSize]);

  // フラクタルエンジン初期化
  useEffect(() => {
    const initEngine = async () => {
      if (!fractalEngineRef.current) {
        console.log('🔧 デュアルビューモード: フラクタルエンジン初期化開始');
        fractalEngineRef.current = new FractalEngine();
        await fractalEngineRef.current.waitForInitialization();
        console.log('✅ デュアルビューモード: フラクタルエンジン初期化完了');
        
        // 初期化完了後に初回レンダリングを実行
        if (!isInitializedRef.current) {
          isInitializedRef.current = true;
          console.log('🎨 デュアルビューモード: 初回レンダリング開始');
          await Promise.all([
            renderMandelbrotOnce(), // マンデルブロ集合は初回のみ
            renderJulia(currentC)   // ジュリア集合は通常レンダリング
          ]);
          console.log('✅ デュアルビューモード: 初回レンダリング完了');
        }
      }
    };
    
    initEngine();
    
    return () => {
      if (fractalEngineRef.current) {
        fractalEngineRef.current.dispose();
      }
      if (juliaRenderTimeoutRef.current) {
        clearTimeout(juliaRenderTimeoutRef.current);
      }
      if (dragEndTimeoutRef.current) {
        clearTimeout(dragEndTimeoutRef.current);
      }
    };
  }, []);

  // マンデルブロ集合の初回レンダリング（一度だけ実行）
  const renderMandelbrotOnce = useCallback(async () => {
    if (!mandelbrotCanvasRef.current || !fractalEngineRef.current || mandelbrotImageDataRef.current) return;

    const canvas = mandelbrotCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    console.log('🎨 マンデルブロ集合: 初回レンダリング開始');
    setIsMandelbrotRendering(true);

    const mandelbrotParams: MandelbrotParameters = {
      type: 'mandelbrot',
      zoom: 1,
      centerX: -0.5,
      centerY: 0,
      iterations: 100,
      escapeRadius: 4,
    };

    try {
      const result = await fractalEngineRef.current.renderFractal(
        'mandelbrot',
        mandelbrotParams,
        {
          width: canvasSize.mandelbrot.renderWidth,
          height: canvasSize.mandelbrot.renderHeight,
          paletteType: selectedPalette,
          useWebGPU: true,
          useWorkers: true,
        }
      );

      canvas.width = canvasSize.mandelbrot.renderWidth;
      canvas.height = canvasSize.mandelbrot.renderHeight;
      
      // マンデルブロ集合の画像データを保存
      mandelbrotImageDataRef.current = result.imageData;
      ctx.putImageData(result.imageData, 0, 0);
      
      // 初期の点を描画
      drawCurrentPoint(ctx, currentC);
      
      console.log('✅ マンデルブロ集合: 初回レンダリング完了');
      
    } catch (error) {
      console.error('Mandelbrot initial rendering error:', error);
    } finally {
      setIsMandelbrotRendering(false);
    }
  }, [canvasSize.mandelbrot, selectedPalette, currentC]);

  // マンデルブロ集合の点のみ更新（超高速）
  const updateMandelbrotPoint = useCallback((c: Complex) => {
    if (!mandelbrotCanvasRef.current || !mandelbrotImageDataRef.current) return;

    const canvas = mandelbrotCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 保存された画像データを再描画
    ctx.putImageData(mandelbrotImageDataRef.current, 0, 0);
    
    // 新しい点を描画
    drawCurrentPoint(ctx, c);
  }, []);

  // マンデルブロ集合のパレット変更時の再レンダリング
  const reRenderMandelbrotWithNewPalette = useCallback(async () => {
    if (!mandelbrotCanvasRef.current || !fractalEngineRef.current) return;

    const canvas = mandelbrotCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    console.log('🎨 マンデルブロ集合: パレット変更による再レンダリング');
    setIsMandelbrotRendering(true);

    const mandelbrotParams: MandelbrotParameters = {
      type: 'mandelbrot',
      zoom: 1,
      centerX: -0.5,
      centerY: 0,
      iterations: 100,
      escapeRadius: 4,
    };

    try {
      const result = await fractalEngineRef.current.renderFractal(
        'mandelbrot',
        mandelbrotParams,
        {
          width: canvasSize.mandelbrot.renderWidth,
          height: canvasSize.mandelbrot.renderHeight,
          paletteType: selectedPalette,
          useWebGPU: true,
          useWorkers: true,
        }
      );

      // 新しい画像データを保存
      mandelbrotImageDataRef.current = result.imageData;
      ctx.putImageData(result.imageData, 0, 0);
      
      // 現在の点を描画
      drawCurrentPoint(ctx, currentC);
      
      console.log('✅ マンデルブロ集合: パレット変更による再レンダリング完了');
      
    } catch (error) {
      console.error('Mandelbrot palette re-rendering error:', error);
    } finally {
      setIsMandelbrotRendering(false);
    }
  }, [canvasSize.mandelbrot, selectedPalette, currentC]);

  // ジュリア集合レンダリング（WebGPU/Worker使用）
  const renderJulia = useCallback(async (c: Complex, forcHighQuality: boolean = false) => {
    if (!juliaCanvasRef.current || !fractalEngineRef.current) return;

    const canvas = juliaCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 高速パラメータキャッシュチェック（JSON.stringify回避）
    const currentParams = `${c.real.toFixed(6)}_${c.imag.toFixed(6)}_${juliaIterations}_${selectedPalette}_${isDragging}_${forcHighQuality}`;
    if (lastJuliaParamsRef.current === currentParams) {
      return; // 同じパラメータの場合はスキップ
    }
    lastJuliaParamsRef.current = currentParams;

    setIsJuliaRendering(true);

    // ドラッグ中または高品質強制時の解像度調整
    const renderWidth = (isDragging && !forcHighQuality) ? 
      Math.floor(canvasSize.julia.renderWidth * 0.5) : // 50%解像度でさらに高速化
      canvasSize.julia.renderWidth;
    const renderHeight = (isDragging && !forcHighQuality) ? 
      Math.floor(canvasSize.julia.renderHeight * 0.5) : 
      canvasSize.julia.renderHeight;

    const juliaParams: JuliaParameters = {
      type: 'julia',
      zoom: 1,
      centerX: 0,
      centerY: 0,
      iterations: (isDragging && !forcHighQuality) ? Math.min(juliaIterations, 60) : juliaIterations, // ドラッグ中はさらに制限
      escapeRadius: 4,
      c,
    };

    try {
      const result = await fractalEngineRef.current.renderFractal(
        'julia',
        juliaParams,
        {
          width: renderWidth,
          height: renderHeight,
          paletteType: selectedPalette === 'mandelbrot' ? 'julia' : selectedPalette,
          useWebGPU: false,
          useWorkers: true, // Workerは常に使用（CPUレンダリングが最適化されたため）
        }
      );

      canvas.width = canvasSize.julia.renderWidth;
      canvas.height = canvasSize.julia.renderHeight;
      
      // 低解像度の場合はスケーリングして描画
      if ((isDragging && !forcHighQuality) && (renderWidth !== canvasSize.julia.renderWidth || renderHeight !== canvasSize.julia.renderHeight)) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = renderWidth;
        tempCanvas.height = renderHeight;
        const tempCtx = tempCanvas.getContext('2d')!;
        tempCtx.putImageData(result.imageData, 0, 0);
        
        ctx.imageSmoothingEnabled = true; // ドラッグ中はスムージング有効でより見やすく
        ctx.drawImage(tempCanvas, 0, 0, renderWidth, renderHeight, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.putImageData(result.imageData, 0, 0);
      }
      
    } catch (error) {
      console.error('Julia rendering error:', error);
    } finally {
      setIsJuliaRendering(false);
    }
  }, [canvasSize.julia, juliaIterations, selectedPalette, isDragging]);

  // ジュリア集合のデバウンスレンダリング
  const renderJuliaDebounced = useCallback((c: Complex) => {
    if (juliaRenderTimeoutRef.current) {
      clearTimeout(juliaRenderTimeoutRef.current);
    }

    juliaRenderTimeoutRef.current = setTimeout(() => {
      renderJulia(c);
    }, isDragging ? 16 : 33); // ドラッグ中は16ms（60fps）、通常時は33ms（30fps）
  }, [renderJulia, isDragging]);

  // ドラッグ終了時の高品質レンダリング
  const triggerHighQualityRender = useCallback((c: Complex) => {
    if (dragEndTimeoutRef.current) {
      clearTimeout(dragEndTimeoutRef.current);
    }

    dragEndTimeoutRef.current = setTimeout(() => {
      console.log('🎨 ドラッグ終了: 高品質レンダリング開始');
      renderJulia(c, true); // 高品質強制レンダリング
    }, 100); // ドラッグ終了から100ms後に高品質レンダリング
  }, [renderJulia]);

  // 現在のcパラメータ位置に小さな点を描画
  const drawCurrentPoint = useCallback((ctx: CanvasRenderingContext2D, c: Complex) => {
    const canvas = ctx.canvas;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const scale = 3.0;
    
    const x = centerX + ((c.real + 0.5) * canvas.width) / scale;
    const y = centerY + (c.imag * canvas.height) / scale;
    
    ctx.save();
    ctx.fillStyle = '#ff3366';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 2;
    
    // 小さめの円形ポイント
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
  }, []);

  // 座標変換
  const canvasToComplex = useCallback((canvas: HTMLCanvasElement, clientX: number, clientY: number): Complex => {
    const rect = canvas.getBoundingClientRect();
    
    const relativeX = clientX - rect.left;
    const relativeY = clientY - rect.top;
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const canvasX = relativeX * scaleX;
    const canvasY = relativeY * scaleY;
    
    const scale = 3.0;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    const real = -0.5 + ((canvasX - centerX) * scale) / canvas.width;
    const imag = ((canvasY - centerY) * scale) / canvas.height;
    
    return { real, imag };
  }, []);

  // パラメータ更新（マンデルブロ集合は点のみ更新、ジュリア集合はリアルタイムレンダリング）
  const updateCurrentC = useCallback((newC: Complex) => {
    setCurrentC(newC);
    onParameterChange(newC);
    
    // マンデルブロ集合は点のみ即座に更新（超高速）
    updateMandelbrotPoint(newC);
    
    // ジュリア集合はデバウンスレンダリング
    renderJuliaDebounced(newC);
  }, [onParameterChange, updateMandelbrotPoint, renderJuliaDebounced]);

  // マウス・タッチイベント（リアルタイム更新）
  const handleMandelbrotPointerMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging || !mandelbrotCanvasRef.current) return;

    const newC = canvasToComplex(mandelbrotCanvasRef.current, clientX, clientY);
    updateCurrentC(newC);
  }, [isDragging, canvasToComplex, updateCurrentC]);

  // マウスイベント
  const handleMandelbrotMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (event.buttons !== 1) return;
    handleMandelbrotPointerMove(event.clientX, event.clientY);
  }, [handleMandelbrotPointerMove]);

  const handleMandelbrotMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    const newC = canvasToComplex(mandelbrotCanvasRef.current!, event.clientX, event.clientY);
    updateCurrentC(newC);
  }, [canvasToComplex, updateCurrentC]);

  // タッチイベント
  const handleMandelbrotTouchMove = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    if (!isDragging) return;
    const touch = event.touches[0];
    if (touch) {
      handleMandelbrotPointerMove(touch.clientX, touch.clientY);
    }
  }, [isDragging, handleMandelbrotPointerMove]);

  const handleMandelbrotTouchStart = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    setIsDragging(true);
    const touch = event.touches[0];
    if (touch) {
      const newC = canvasToComplex(mandelbrotCanvasRef.current!, touch.clientX, touch.clientY);
      updateCurrentC(newC);
    }
  }, [canvasToComplex, updateCurrentC]);

  // ドラッグ終了処理（高品質レンダリング実行）
  const handlePointerEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      // ドラッグ終了時に高品質レンダリングをトリガー
      triggerHighQualityRender(currentC);
    }
  }, [isDragging, currentC, triggerHighQualityRender]);

  // パレット変更時の再レンダリング
  useEffect(() => {
    if (fractalEngineRef.current?.initialized && isInitializedRef.current) {
      reRenderMandelbrotWithNewPalette(); // マンデルブロ集合はパレット変更時のみ再レンダリング
      renderJuliaDebounced(currentC);     // ジュリア集合はデバウンスレンダリング
    }
  }, [selectedPalette]);

  // キャンバスサイズ変更時の再レンダリング
  useEffect(() => {
    if (fractalEngineRef.current?.initialized && isInitializedRef.current) {
      // キャンバスサイズが変わった場合は再レンダリングが必要
      mandelbrotImageDataRef.current = null; // キャッシュをクリア
      renderMandelbrotOnce(); // マンデルブロ集合を再レンダリング
      renderJuliaDebounced(currentC); // ジュリア集合も再レンダリング
    }
  }, [canvasSize]);

  // イテレーション数変更時の再レンダリング（ジュリア集合のみ）
  useEffect(() => {
    if (fractalEngineRef.current?.initialized && isInitializedRef.current && !isDragging) {
      renderJuliaDebounced(currentC);
    }
  }, [juliaIterations]);

  return (
    <div className={`julia-dual-view ${className} h-screen flex flex-col ${className}`}>
      {isMobile ? (
        // モバイルレイアウト: 通常ビューと同様の構造
        <div className="flex flex-col h-screen bg-gray-900">
          {/* メインコンテンツエリア */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* キャンバスエリア */}
            <div className="flex-1 flex flex-col gap-4 p-4 min-h-0">
              {/* マンデルブロ集合ビュー */}
              <div className="flex-1 flex flex-col items-center justify-center min-h-0">
                <div className="text-center mb-3">
                  <h3 className="text-white text-lg font-semibold mb-1">
                    マンデルブロ集合
                  </h3>
                  <p className="text-gray-400 text-xs">
                    タップ・ドラッグでcパラメータを選択
                  </p>
                </div>
                
                <div className="relative">
                  <canvas
                    ref={mandelbrotCanvasRef}
                    className="border-2 border-gray-600 rounded-xl cursor-crosshair touch-none transition-all hover:border-primary-500 max-w-full max-h-full"
                    onMouseMove={handleMandelbrotMouseMove}
                    onMouseDown={handleMandelbrotMouseDown}
                    onMouseUp={handlePointerEnd}
                    onMouseLeave={handlePointerEnd}
                    onTouchStart={handleMandelbrotTouchStart}
                    onTouchMove={handleMandelbrotTouchMove}
                    onTouchEnd={handlePointerEnd}
                    style={{
                      width: `${canvasSize.mandelbrot.width}px`,
                      height: `${canvasSize.mandelbrot.height}px`,
                      imageRendering: 'auto'
                    }}
                    aria-label="マンデルブロ集合キャンバス"
                  />
                  
                  <div className="absolute top-2 left-2 bg-gray-900/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-gray-300">
                    {canvasSize.mandelbrot.renderWidth}×{canvasSize.mandelbrot.renderHeight}
                  </div>
                </div>
              </div>

              {/* 区切り線 */}
              <div className="h-px bg-gray-700 my-2"></div>

              {/* ジュリア集合ビュー */}
              <div className="flex-1 flex flex-col items-center justify-center min-h-0">
                <div className="text-center mb-3">
                  <h3 className="text-white text-lg font-semibold mb-1">
                    ジュリア集合
                  </h3>
                  <p className="text-gray-400 text-xs">
                    c = {currentC.real.toFixed(4)} + {currentC.imag.toFixed(4)}i
                  </p>
                </div>
                
                <div className="relative">
                  <canvas
                    ref={juliaCanvasRef}
                    className="border-2 border-gray-600 rounded-xl transition-all hover:border-green-500 max-w-full max-h-full"
                    style={{
                      width: `${canvasSize.julia.width}px`,
                      height: `${canvasSize.julia.height}px`,
                      imageRendering: 'auto'
                    }}
                    aria-label="ジュリア集合キャンバス"
                  />
                  
                  <div className="absolute top-2 left-2 bg-gray-900/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-gray-300">
                    {canvasSize.julia.renderWidth}×{canvasSize.julia.renderHeight}
                  </div>
                </div>
              </div>
            </div>

            {/* トップ固定ヘッダー */}
            <div className="bg-gray-800/90 backdrop-blur-sm border-t border-gray-700 p-3">
              <div className="flex items-center justify-between">
                <h1 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="text-primary-400">∞</span>
                  デュアル
                </h1>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedPalette}
                    onChange={(e) => setSelectedPalette(e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-gray-300 text-xs"
                  >
                    {paletteOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={onExitDualView}
                    className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded transition-colors font-medium text-xs"
                  >
                    戻る
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // デスクトップレイアウト
        <div className="h-screen flex flex-row bg-gray-900">
          {/* サイドパネル */}
          <div className="w-80 bg-gray-800/90 backdrop-blur-sm border-r border-gray-700 flex-shrink-0">
            <div className="p-6">
              {/* ヘッダー */}
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span className="text-primary-400">∞</span>
                  デュアルビューモード
                </h1>
                <button
                  onClick={onExitDualView}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium"
                >
                  探索モードに戻る
                </button>
              </div>

              {/* コントロールパネル */}
              <div className="space-y-6">
                {/* カラーパレット選択 */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">カラーパレット</label>
                  <select
                    value={selectedPalette}
                    onChange={(e) => setSelectedPalette(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-300 focus:border-primary-500 focus:outline-none transition-colors"
                  >
                    {paletteOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label} ({option.description})
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* イテレーション数 */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">
                    イテレーション数: <span className="text-primary-400 font-mono">{juliaIterations}</span>
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="1000"
                    step="50"
                    value={juliaIterations}
                    onChange={(e) => setJuliaIterations(Number(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>50</span>
                    <span>1000</span>
                  </div>
                </div>

                {/* 現在のパラメータ表示 */}
                <div className="bg-gray-700/50 p-4 rounded-xl">
                  <label className="block text-sm font-medium text-gray-300 mb-2">現在のパラメータ</label>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">実部 (Re):</span>
                      <span className="text-white font-mono">{currentC.real.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">虚部 (Im):</span>
                      <span className="text-white font-mono">{currentC.imag.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">複素数:</span>
                      <span className="text-primary-400 font-mono text-xs">
                        {currentC.real.toFixed(4)} + {currentC.imag.toFixed(4)}i
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* アクションボタン */}
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      const defaultJulia = getDefaultParameters('julia') as JuliaParameters;
                      setCurrentC(defaultJulia.c);
                      onParameterChange(defaultJulia.c);
                      updateCurrentC(defaultJulia.c);
                    }}
                    className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium text-sm"
                  >
                    パラメータをリセット
                  </button>
                </div>

                {/* 使用方法 */}
                <div className="bg-primary-600/10 border border-primary-600/20 p-4 rounded-xl">
                  <h3 className="text-sm font-medium text-primary-400 mb-2">💡 使用方法</h3>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    マンデルブロ集合をドラッグしてcパラメータを変更すると、
                    リアルタイムでジュリア集合が変化します。
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* メインコンテンツエリア */}
          <div className="flex-1 flex flex-row overflow-hidden">
            {/* キャンバスエリア */}
            <div className="flex-1 flex flex-row gap-8 p-6 min-h-0">
              {/* マンデルブロ集合ビュー */}
              <div className="flex-1 flex flex-col items-center justify-center min-h-0">
                <div className="text-center mb-4">
                  <h3 className="text-white text-xl font-semibold mb-2">
                    マンデルブロ集合
                  </h3>
                  <p className="text-gray-400 text-sm">
                    ドラッグでcパラメータを選択
                  </p>
                </div>
                
                <div className="relative">
                  <canvas
                    ref={mandelbrotCanvasRef}
                    className="border-2 border-gray-600 rounded-xl cursor-crosshair touch-none transition-all hover:border-primary-500 hover:shadow-lg hover:shadow-primary-500/25 max-w-full max-h-full"
                    onMouseMove={handleMandelbrotMouseMove}
                    onMouseDown={handleMandelbrotMouseDown}
                    onMouseUp={handlePointerEnd}
                    onMouseLeave={handlePointerEnd}
                    onTouchStart={handleMandelbrotTouchStart}
                    onTouchMove={handleMandelbrotTouchMove}
                    onTouchEnd={handlePointerEnd}
                    style={{
                      width: `${canvasSize.mandelbrot.width}px`,
                      height: `${canvasSize.mandelbrot.height}px`,
                      imageRendering: 'auto'
                    }}
                    aria-label="マンデルブロ集合キャンバス"
                  />
                  
                  <div className="absolute top-2 left-2 bg-gray-900/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-gray-300">
                    {canvasSize.mandelbrot.renderWidth}×{canvasSize.mandelbrot.renderHeight}
                  </div>
                </div>
              </div>

              {/* 区切り線 */}
              <div className="w-px bg-gray-700 mx-4"></div>

              {/* ジュリア集合ビュー */}
              <div className="flex-1 flex flex-col items-center justify-center min-h-0">
                <div className="text-center mb-4">
                  <h3 className="text-white text-xl font-semibold mb-2">
                    ジュリア集合
                  </h3>
                  <p className="text-gray-400 text-sm">
                    c = {currentC.real.toFixed(4)} + {currentC.imag.toFixed(4)}i
                  </p>
                </div>
                
                <div className="relative">
                  <canvas
                    ref={juliaCanvasRef}
                    className="border-2 border-gray-600 rounded-xl transition-all hover:border-green-500 hover:shadow-lg hover:shadow-green-500/25 max-w-full max-h-full"
                    style={{
                      width: `${canvasSize.julia.width}px`,
                      height: `${canvasSize.julia.height}px`,
                      imageRendering: 'auto'
                    }}
                    aria-label="ジュリア集合キャンバス"
                  />
                  
                  <div className="absolute top-2 left-2 bg-gray-900/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-gray-300">
                    {canvasSize.julia.renderWidth}×{canvasSize.julia.renderHeight}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JuliaDualView; 