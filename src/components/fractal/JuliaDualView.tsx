import { useCallback, useEffect, useRef, useState } from 'react';
import { FractalEngine } from '@/lib/fractal-engine';
import { ColorPalette, getDefaultParameters } from '@/lib/fractal-utils';
import type { Complex, JuliaParameters, MandelbrotParameters } from '@/types/fractal';

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
  const [selectedPalette, setSelectedPalette] = useState('mandelbrot');

  // ボトムシートの状態管理
  const [bottomSheetHeight, setBottomSheetHeight] = useState<'collapsed' | 'half' | 'full'>(
    'collapsed'
  );
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
  }, [isDragging, currentTranslateY, bottomSheetHeight]);

  // 高さに応じたtranslateY値を計算
  const getTranslateY = () => {
    if (isDragging) {
      // ドラッグ中は現在の移動量を適用
      const baseTranslate =
        bottomSheetHeight === 'collapsed' ? 100 : bottomSheetHeight === 'half' ? 50 : 0;
      const dragPercent = (currentTranslateY / window.innerHeight) * 100;
      return Math.max(0, Math.min(100, baseTranslate + dragPercent));
    }

    // 通常状態（collapsed = 100%で完全に下がった状態）
    return bottomSheetHeight === 'collapsed' ? 100 : bottomSheetHeight === 'half' ? 50 : 0;
  };

  // ビューポートに応じた動的サイズ計算（完全に下がった状態を基準）
  const getCanvasSize = useCallback(() => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (isMobile) {
      // モバイル: ボトムシートが完全に下がった状態を基準にキャンバスサイズを計算
      const availableWidth = Math.floor(viewportWidth - 32); // パディング考慮
      const headerHeight = 60; // キャンバスタイトル高さ（両方）
      const dividerHeight = 20; // 区切り線高さ
      const overlayButtonsHeight = 40; // 右上ボタン群の高さ

      const availableHeight = Math.floor(
        (viewportHeight - headerHeight - dividerHeight - overlayButtonsHeight) / 2
      );
      const size = Math.min(availableWidth, availableHeight, 400);

      return {
        mandelbrot: {
          width: size,
          height: size,
          renderWidth: Math.floor(size * 0.9),
          renderHeight: Math.floor(size * 0.9),
        },
        julia: { width: size, height: size, renderWidth: size, renderHeight: size },
      };
    } else {
      // デスクトップ: サイドパネルを考慮したレイアウト
      const sidebarWidth = 320; // w-80 = 320px
      const availableWidth = Math.floor((viewportWidth - sidebarWidth - 64) / 2); // ギャップ・パディングを考慮
      const availableHeight = Math.floor(viewportHeight * 0.7); // ヘッダーを考慮
      const size = Math.min(Math.max(availableWidth, 280), Math.max(availableHeight, 280), 480);

      return {
        mandelbrot: {
          width: size,
          height: size,
          renderWidth: Math.floor(size * 0.8),
          renderHeight: Math.floor(size * 0.8),
        },
        julia: { width: size, height: size, renderWidth: size, renderHeight: size },
      };
    }
  }, [isMobile]);

  const [canvasSize, setCanvasSize] = useState(() => getCanvasSize());

  // カラーパレットオプション（通常モードと同じものを使用）
  const paletteOptions = ColorPalette.getPaletteNames().map((name) => ({
    value: name,
    label: name.charAt(0).toUpperCase() + name.slice(1),
    description: getPaletteDescription(name),
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
      grayscale: '白黒',
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
            renderJulia(currentC), // ジュリア集合は通常レンダリング
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
    if (!mandelbrotCanvasRef.current || !fractalEngineRef.current || mandelbrotImageDataRef.current)
      return;

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
      const result = await fractalEngineRef.current.renderFractal('mandelbrot', mandelbrotParams, {
        width: canvasSize.mandelbrot.renderWidth,
        height: canvasSize.mandelbrot.renderHeight,
        paletteType: selectedPalette,
        useWebGPU: true,
        useWorkers: true,
      });

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
      const result = await fractalEngineRef.current.renderFractal('mandelbrot', mandelbrotParams, {
        width: canvasSize.mandelbrot.renderWidth,
        height: canvasSize.mandelbrot.renderHeight,
        paletteType: selectedPalette,
        useWebGPU: true,
        useWorkers: true,
      });

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
  const renderJulia = useCallback(
    async (c: Complex, forcHighQuality: boolean = false) => {
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
      const renderWidth =
        isDragging && !forcHighQuality
          ? Math.floor(canvasSize.julia.renderWidth * 0.5)
          : // 50%解像度でさらに高速化
            canvasSize.julia.renderWidth;
      const renderHeight =
        isDragging && !forcHighQuality
          ? Math.floor(canvasSize.julia.renderHeight * 0.5)
          : canvasSize.julia.renderHeight;

      const juliaParams: JuliaParameters = {
        type: 'julia',
        zoom: 1,
        centerX: 0,
        centerY: 0,
        iterations:
          isDragging && !forcHighQuality ? Math.min(juliaIterations, 60) : juliaIterations, // ドラッグ中はさらに制限
        escapeRadius: 4,
        c,
      };

      try {
        const result = await fractalEngineRef.current.renderFractal('julia', juliaParams, {
          width: renderWidth,
          height: renderHeight,
          paletteType: selectedPalette === 'mandelbrot' ? 'julia' : selectedPalette,
          useWebGPU: false,
          useWorkers: true, // Workerは常に使用（CPUレンダリングが最適化されたため）
        });

        canvas.width = canvasSize.julia.renderWidth;
        canvas.height = canvasSize.julia.renderHeight;

        // 低解像度の場合はスケーリングして描画
        if (
          isDragging &&
          !forcHighQuality &&
          (renderWidth !== canvasSize.julia.renderWidth ||
            renderHeight !== canvasSize.julia.renderHeight)
        ) {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = renderWidth;
          tempCanvas.height = renderHeight;
          const tempCtx = tempCanvas.getContext('2d')!;
          tempCtx.putImageData(result.imageData, 0, 0);

          ctx.imageSmoothingEnabled = true; // ドラッグ中はスムージング有効でより見やすく
          ctx.drawImage(
            tempCanvas,
            0,
            0,
            renderWidth,
            renderHeight,
            0,
            0,
            canvas.width,
            canvas.height
          );
        } else {
          ctx.putImageData(result.imageData, 0, 0);
        }
      } catch (error) {
        console.error('Julia rendering error:', error);
      } finally {
        setIsJuliaRendering(false);
      }
    },
    [canvasSize.julia, juliaIterations, selectedPalette, isDragging]
  );

  // ジュリア集合のデバウンスレンダリング
  const renderJuliaDebounced = useCallback(
    (c: Complex) => {
      if (juliaRenderTimeoutRef.current) {
        clearTimeout(juliaRenderTimeoutRef.current);
      }

      juliaRenderTimeoutRef.current = setTimeout(
        () => {
          renderJulia(c);
        },
        isDragging ? 16 : 33
      ); // ドラッグ中は16ms（60fps）、通常時は33ms（30fps）
    },
    [renderJulia, isDragging]
  );

  // ドラッグ終了時の高品質レンダリング
  const triggerHighQualityRender = useCallback(
    (c: Complex) => {
      if (dragEndTimeoutRef.current) {
        clearTimeout(dragEndTimeoutRef.current);
      }

      dragEndTimeoutRef.current = setTimeout(() => {
        console.log('🎨 ドラッグ終了: 高品質レンダリング開始');
        renderJulia(c, true); // 高品質強制レンダリング
      }, 100); // ドラッグ終了から100ms後に高品質レンダリング
    },
    [renderJulia]
  );

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
  const canvasToComplex = useCallback(
    (canvas: HTMLCanvasElement, clientX: number, clientY: number): Complex => {
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
    },
    []
  );

  // パラメータ更新（マンデルブロ集合は点のみ更新、ジュリア集合はリアルタイムレンダリング）
  const updateCurrentC = useCallback(
    (newC: Complex) => {
      setCurrentC(newC);
      onParameterChange(newC);

      // マンデルブロ集合は点のみ即座に更新（超高速）
      updateMandelbrotPoint(newC);

      // ジュリア集合はデバウンスレンダリング
      renderJuliaDebounced(newC);
    },
    [onParameterChange, updateMandelbrotPoint, renderJuliaDebounced]
  );

  // マウス・タッチイベント（リアルタイム更新）
  const handleMandelbrotPointerMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging || !mandelbrotCanvasRef.current) return;

      const newC = canvasToComplex(mandelbrotCanvasRef.current, clientX, clientY);
      updateCurrentC(newC);
    },
    [isDragging, canvasToComplex, updateCurrentC]
  );

  // マウスイベント
  const handleMandelbrotMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (event.buttons !== 1) return;
      handleMandelbrotPointerMove(event.clientX, event.clientY);
    },
    [handleMandelbrotPointerMove]
  );

  const handleMandelbrotMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      setIsDragging(true);
      const newC = canvasToComplex(mandelbrotCanvasRef.current!, event.clientX, event.clientY);
      updateCurrentC(newC);
    },
    [canvasToComplex, updateCurrentC]
  );

  // タッチイベントハンドラー（ネイティブイベント用）
  const handleMandelbrotTouchStart = useCallback(
    (event: TouchEvent) => {
      event.preventDefault();
      setIsDragging(true);
      const touch = event.touches[0];
      if (touch) {
        const newC = canvasToComplex(mandelbrotCanvasRef.current!, touch.clientX, touch.clientY);
        updateCurrentC(newC);
      }
    },
    [canvasToComplex, updateCurrentC]
  );

  const handleMandelbrotTouchMove = useCallback(
    (event: TouchEvent) => {
      event.preventDefault();
      if (!isDragging) return;
      const touch = event.touches[0];
      if (touch) {
        handleMandelbrotPointerMove(touch.clientX, touch.clientY);
      }
    },
    [isDragging, handleMandelbrotPointerMove]
  );

  const handleMandelbrotTouchEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      triggerHighQualityRender(currentC);
    }
  }, [isDragging, currentC, triggerHighQualityRender]);

  // タッチイベントの手動登録（passive: false）
  useEffect(() => {
    const canvas = mandelbrotCanvasRef.current;
    if (!canvas || !isMobile) return;

    canvas.addEventListener('touchstart', handleMandelbrotTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleMandelbrotTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleMandelbrotTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleMandelbrotTouchStart);
      canvas.removeEventListener('touchmove', handleMandelbrotTouchMove);
      canvas.removeEventListener('touchend', handleMandelbrotTouchEnd);
    };
  }, [handleMandelbrotTouchStart, handleMandelbrotTouchMove, handleMandelbrotTouchEnd, isMobile]);

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
      renderJuliaDebounced(currentC); // ジュリア集合はデバウンスレンダリング
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

  // リサイズ時のキャンバスサイズ更新のみ（ボトムシート状態変更は除外）
  useEffect(() => {
    const handleResize = () => {
      setCanvasSize(getCanvasSize());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [getCanvasSize]);

  return (
    <div className={`julia-dual-view ${className} flex h-screen flex-col ${className}`}>
      {isMobile ? (
        // モバイルレイアウト: 通常ビューと同様の構造
        <div className="flex h-screen flex-col bg-gray-900">
          {/* キャンバスエリア（フルスクリーン） */}
          <div className="relative flex flex-1 flex-col overflow-hidden">
            {/* マンデルブロ集合ビュー */}
            <div className="flex flex-1 flex-col items-center justify-center">
              <div className="mb-2 text-center">
                <h3 className="mb-1 font-semibold text-sm text-white">マンデルブロ集合</h3>
                <p className="text-gray-400 text-xs">タップ・ドラッグでcパラメータを選択</p>
              </div>

              <div className="relative">
                <canvas
                  ref={mandelbrotCanvasRef}
                  className="max-h-full max-w-full cursor-crosshair touch-none rounded-lg border-2 border-gray-600 transition-all hover:border-primary-500"
                  onMouseMove={handleMandelbrotMouseMove}
                  onMouseDown={handleMandelbrotMouseDown}
                  onMouseUp={handlePointerEnd}
                  onMouseLeave={handlePointerEnd}
                  style={{
                    width: `${canvasSize.mandelbrot.width}px`,
                    height: `${canvasSize.mandelbrot.height}px`,
                    imageRendering: 'auto',
                  }}
                  aria-label="マンデルブロ集合キャンバス"
                />

                <div className="absolute top-2 left-2 rounded bg-gray-900/80 px-2 py-1 text-gray-300 text-xs backdrop-blur-sm">
                  {canvasSize.mandelbrot.renderWidth}×{canvasSize.mandelbrot.renderHeight}
                </div>
              </div>
            </div>

            {/* 区切り線 */}
            <div className="mx-4 h-px bg-gray-700"></div>

            {/* ジュリア集合ビュー */}
            <div className="flex flex-1 flex-col items-center justify-center">
              <div className="mb-2 text-center">
                <h3 className="mb-1 font-semibold text-sm text-white">ジュリア集合</h3>
                <p className="text-gray-400 text-xs">
                  c = {currentC.real.toFixed(4)} + {currentC.imag.toFixed(4)}i
                </p>
              </div>

              <div className="relative">
                <canvas
                  ref={juliaCanvasRef}
                  className="max-h-full max-w-full rounded-lg border-2 border-gray-600 transition-all hover:border-green-500"
                  style={{
                    width: `${canvasSize.julia.width}px`,
                    height: `${canvasSize.julia.height}px`,
                    imageRendering: 'auto',
                  }}
                  aria-label="ジュリア集合キャンバス"
                />

                <div className="absolute top-2 left-2 rounded bg-gray-900/80 px-2 py-1 text-gray-300 text-xs backdrop-blur-sm">
                  {canvasSize.julia.renderWidth}×{canvasSize.julia.renderHeight}
                </div>
              </div>
            </div>

            {/* Overlay Controls（通常ビューと同じ位置） */}
            <div className="absolute top-4 right-4 space-y-2">
              <button
                type="button"
                onClick={onExitDualView}
                className="rounded-lg bg-blue-600 p-2 text-sm text-white transition-colors hover:bg-blue-700"
                title="探索モードに戻る"
              >
                探索に戻る
              </button>
              <button
                type="button"
                onClick={() => setBottomSheetHeight('half')}
                className={`rounded-lg p-2 text-white transition-colors ${
                  bottomSheetHeight === 'collapsed'
                    ? 'bg-primary-600 hover:bg-primary-700'
                    : 'bg-gray-800/90 hover:bg-gray-700/90'
                }`}
                title="設定を開く"
              >
                ⚙️
              </button>
              <button
                type="button"
                onClick={() => {
                  const defaultJulia = getDefaultParameters('julia') as JuliaParameters;
                  setCurrentC(defaultJulia.c);
                  onParameterChange(defaultJulia.c);
                  updateCurrentC(defaultJulia.c);
                }}
                className="rounded-lg bg-gray-800/90 p-2 text-white transition-colors hover:bg-gray-700/90"
                title="パラメータをリセット"
              >
                ⌂
              </button>
            </div>
          </div>

          {/* ボトムナビゲーション */}
          <div
            className={`fixed right-0 bottom-0 left-0 z-50 rounded-t-3xl bg-gray-800/95 shadow-2xl backdrop-blur-sm ${
              isDragging ? '' : 'transition-transform duration-300'
            }`}
            style={{
              height: '85vh',
              minHeight: '300px',
              transform: `translateY(${getTranslateY()}%)`,
              paddingBottom: 'env(safe-area-inset-bottom)',
              touchAction: 'none',
            }}
            ref={sheetRef}
          >
            {/* ハンドル */}
            <div
              className="flex cursor-grab justify-center pt-3 pb-1 active:cursor-grabbing"
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
              <h2 className="flex items-center gap-2 font-bold text-lg text-white">
                <span className="text-primary-400">∞</span>
                デュアルビューモード
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setBottomSheetHeight(bottomSheetHeight === 'full' ? 'half' : 'full')
                  }
                  className="rounded-lg bg-gray-700 p-2 text-white transition-colors hover:bg-gray-600"
                  title={bottomSheetHeight === 'full' ? '下に縮める' : '上に広げる'}
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
                  title="閉じる"
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

            {/* コンテンツ */}
            <div
              className="flex-1 space-y-6 overflow-y-auto overscroll-contain p-4"
              style={{
                maxHeight: 'calc(85vh - 120px)', // ハンドル+ヘッダー分を除外
                scrollBehavior: 'smooth',
              }}
            >
              {/* カラーパレット選択 */}
              <div>
                <div className="mb-4 block font-semibold text-lg text-white">カラーパレット</div>
                <select
                  value={selectedPalette}
                  onChange={(e) => setSelectedPalette(e.target.value)}
                  className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-3 text-base text-white focus:border-primary-500 focus:outline-none"
                >
                  {paletteOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} ({option.description})
                    </option>
                  ))}
                </select>
              </div>

              {/* イテレーション数 */}
              <div>
                <div className="mb-4 block font-semibold text-lg text-white">
                  イテレーション数:{' '}
                  <span className="font-mono text-primary-400">{juliaIterations}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="1000"
                  step="50"
                  value={juliaIterations}
                  onChange={(e) => setJuliaIterations(Number(e.target.value))}
                  className="h-3 w-full cursor-pointer appearance-none rounded-full bg-gray-600 accent-primary-500"
                />
                <div className="mt-2 flex justify-between text-gray-400 text-sm">
                  <span>50</span>
                  <span>1000</span>
                </div>
              </div>

              {/* 現在のパラメータ表示 */}
              <div className="rounded-xl bg-gray-700/50 p-4">
                <div className="mb-3 block font-semibold text-lg text-white">現在のパラメータ</div>
                <div className="space-y-2 text-base">
                  <div className="flex justify-between">
                    <span className="text-gray-300">実部 (Re):</span>
                    <span className="font-mono text-white">{currentC.real.toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">虚部 (Im):</span>
                    <span className="font-mono text-white">{currentC.imag.toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">複素数:</span>
                    <span className="font-mono text-primary-400">
                      {currentC.real.toFixed(4)} + {currentC.imag.toFixed(4)}i
                    </span>
                  </div>
                </div>
              </div>

              {/* アクションボタン */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    const defaultJulia = getDefaultParameters('julia') as JuliaParameters;
                    setCurrentC(defaultJulia.c);
                    onParameterChange(defaultJulia.c);
                    updateCurrentC(defaultJulia.c);
                  }}
                  className="w-full rounded-lg bg-gray-700 px-4 py-3 font-medium text-base text-white transition-colors hover:bg-gray-600"
                >
                  パラメータをリセット
                </button>
              </div>

              {/* 使用方法 */}
              <div className="rounded-xl border border-primary-600/20 bg-primary-600/10 p-4">
                <h3 className="mb-2 font-medium text-base text-primary-400">💡 使用方法</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  マンデルブロ集合をタップ・ドラッグしてcパラメータを変更すると、
                  リアルタイムでジュリア集合が変化します。ドラッグ終了時に高品質でレンダリングされます。
                </p>
              </div>

              {/* パフォーマンス情報（デバッグ用） */}
              <div className="rounded-xl bg-gray-700/30 p-4">
                <h3 className="mb-2 font-medium text-gray-300 text-sm">システム情報</h3>
                <div className="space-y-1 text-gray-400 text-xs">
                  <div className="flex justify-between">
                    <span>WebGPU:</span>
                    <span className="text-green-400">✓ 有効</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Worker:</span>
                    <span className="text-green-400">✓ 有効</span>
                  </div>
                  <div className="flex justify-between">
                    <span>画面:</span>
                    <span className="text-blue-400">
                      {canvasSize.julia.width}×{canvasSize.julia.height}
                    </span>
                  </div>
                </div>
              </div>

              {/* スペーサー（最下部のスクロール余裕） */}
              <div className="h-8"></div>
            </div>
          </div>
        </div>
      ) : (
        // デスクトップレイアウト
        <div className="flex h-screen flex-row bg-gray-900">
          {/* サイドパネル */}
          <div className="w-80 flex-shrink-0 border-gray-700 border-r bg-gray-800/90 backdrop-blur-sm">
            <div className="p-6">
              {/* ヘッダー */}
              <div className="mb-6 flex items-center justify-between">
                <h1 className="flex items-center gap-2 font-bold text-2xl text-white">
                  <span className="text-primary-400">∞</span>
                  デュアルビューモード
                </h1>
              </div>

              {/* コントロールパネル */}
              <div className="space-y-6">
                {/* カラーパレット選択 */}
                <div>
                  <div className="mb-3 block font-medium text-gray-300 text-sm">カラーパレット</div>
                  <select
                    value={selectedPalette}
                    onChange={(e) => setSelectedPalette(e.target.value)}
                    className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-gray-300 transition-colors focus:border-primary-500 focus:outline-none"
                  >
                    {paletteOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label} ({option.description})
                      </option>
                    ))}
                  </select>
                </div>

                {/* イテレーション数 */}
                <div>
                  <div className="mb-3 block font-medium text-gray-300 text-sm">
                    イテレーション数:{' '}
                    <span className="font-mono text-primary-400">{juliaIterations}</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="1000"
                    step="50"
                    value={juliaIterations}
                    onChange={(e) => setJuliaIterations(Number(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-700 accent-primary-500"
                  />
                  <div className="mt-1 flex justify-between text-gray-500 text-xs">
                    <span>50</span>
                    <span>1000</span>
                  </div>
                </div>

                {/* 現在のパラメータ表示 */}
                <div className="rounded-xl bg-gray-700/50 p-4">
                  <div className="mb-2 block font-medium text-gray-300 text-sm">
                    現在のパラメータ
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>c =</span>
                      <span className="font-mono text-primary-400">
                        {currentC.real.toFixed(4)} + {currentC.imag.toFixed(4)}i
                      </span>
                    </div>
                  </div>
                </div>

                {/* アクションボタン */}
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      const defaultJulia = getDefaultParameters('julia') as JuliaParameters;
                      setCurrentC(defaultJulia.c);
                      onParameterChange(defaultJulia.c);
                      updateCurrentC(defaultJulia.c);
                    }}
                    className="w-full rounded-lg bg-gray-700 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-gray-600"
                  >
                    パラメータをリセット
                  </button>
                </div>

                {/* 使用方法 */}
                <div className="rounded-xl border border-primary-600/20 bg-primary-600/10 p-4">
                  <h3 className="mb-2 font-medium text-primary-400 text-sm">💡 使用方法</h3>
                  <p className="text-gray-300 text-xs leading-relaxed">
                    マンデルブロ集合をドラッグしてcパラメータを変更すると、
                    リアルタイムでジュリア集合が変化します。
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* メインコンテンツエリア */}
          <div className="flex flex-1 flex-row overflow-hidden">
            {/* キャンバスエリア */}
            <div className="flex min-h-0 flex-1 flex-row gap-8 p-6">
              {/* マンデルブロ集合ビュー */}
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
                <div className="mb-4 text-center">
                  <h3 className="mb-2 font-semibold text-white text-xl">マンデルブロ集合</h3>
                  <p className="text-gray-400 text-sm">ドラッグでcパラメータを選択</p>
                </div>

                <div className="relative">
                  <canvas
                    ref={mandelbrotCanvasRef}
                    className="max-h-full max-w-full cursor-crosshair touch-none rounded-xl border-2 border-gray-600 transition-all hover:border-primary-500 hover:shadow-lg hover:shadow-primary-500/25"
                    onMouseMove={handleMandelbrotMouseMove}
                    onMouseDown={handleMandelbrotMouseDown}
                    onMouseUp={handlePointerEnd}
                    onMouseLeave={handlePointerEnd}
                    style={{
                      width: `${canvasSize.mandelbrot.width}px`,
                      height: `${canvasSize.mandelbrot.height}px`,
                      imageRendering: 'auto',
                    }}
                    aria-label="マンデルブロ集合キャンバス"
                  />

                  <div className="absolute top-2 left-2 rounded bg-gray-900/80 px-2 py-1 text-gray-300 text-xs backdrop-blur-sm">
                    {canvasSize.mandelbrot.renderWidth}×{canvasSize.mandelbrot.renderHeight}
                  </div>
                </div>
              </div>

              {/* 区切り線 */}
              <div className="mx-4 w-px bg-gray-700"></div>

              {/* ジュリア集合ビュー */}
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
                <div className="mb-4 text-center">
                  <h3 className="mb-2 font-semibold text-white text-xl">ジュリア集合</h3>
                  <p className="text-gray-400 text-sm">
                    c = {currentC.real.toFixed(4)} + {currentC.imag.toFixed(4)}i
                  </p>
                </div>

                <div className="relative">
                  <canvas
                    ref={juliaCanvasRef}
                    className="max-h-full max-w-full rounded-xl border-2 border-gray-600 transition-all hover:border-green-500 hover:shadow-green-500/25 hover:shadow-lg"
                    style={{
                      width: `${canvasSize.julia.width}px`,
                      height: `${canvasSize.julia.height}px`,
                      imageRendering: 'auto',
                    }}
                    aria-label="ジュリア集合キャンバス"
                  />

                  <div className="absolute top-2 left-2 rounded bg-gray-900/80 px-2 py-1 text-gray-300 text-xs backdrop-blur-sm">
                    {canvasSize.julia.renderWidth}×{canvasSize.julia.renderHeight}
                  </div>
                </div>
              </div>
            </div>

            {/* Overlay Controls（通常ビューと同じ位置） */}
            <div className="absolute top-4 right-4 space-y-2">
              <button
                type="button"
                onClick={onExitDualView}
                className="rounded-lg bg-blue-600 p-2 text-sm text-white transition-colors hover:bg-blue-700"
                title="探索モードに戻る"
              >
                探索に戻る
              </button>
              <button
                type="button"
                onClick={() => {
                  const defaultJulia = getDefaultParameters('julia') as JuliaParameters;
                  setCurrentC(defaultJulia.c);
                  onParameterChange(defaultJulia.c);
                  updateCurrentC(defaultJulia.c);
                }}
                className="rounded-lg bg-gray-800/90 p-2 text-white transition-colors hover:bg-gray-700/90"
                title="パラメータをリセット"
              >
                ⌂
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JuliaDualView;
