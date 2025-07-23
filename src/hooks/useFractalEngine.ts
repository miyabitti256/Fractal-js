import { useCallback, useEffect, useRef, useState } from 'react';
import { FractalEngine, type PerformanceMetrics } from '@/lib/fractal-engine';
import { getDefaultParameters } from '@/lib/fractal-utils';
import type { AllFractalParameters, Complex, FractalType, JuliaParameters } from '@/types/fractal';

export const useFractalEngine = () => {
  const engineRef = useRef<FractalEngine | null>(null);

  // State
  const [fractalType, setFractalType] = useState<FractalType>('mandelbrot');
  const [parameters, setParameters] = useState<AllFractalParameters>(() =>
    getDefaultParameters('mandelbrot')
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [useWebGPU, setUseWebGPU] = useState(true);
  const [useMultiThread, setUseMultiThread] = useState(true);
  const [enableAnimation, setEnableAnimation] = useState(false);
  const [paletteType, setPaletteType] = useState('rainbow');
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);

  // デュアルビューモード用の状態
  const [isDualView, setIsDualView] = useState(false);
  const [dualViewC, setDualViewC] = useState<Complex>({ real: -0.7, imag: 0.27015 });

  // フラクタルタイプ変更時のパラメータ更新
  useEffect(() => {
    const defaultParams = getDefaultParameters(fractalType);
    setParameters(defaultParams);
  }, [fractalType]);

  // エンジン初期化
  const initializeEngine = useCallback(async (canvasSize: { width: number; height: number }) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!engineRef.current) {
        console.log('🔧 FractalEngine 作成中...');
        engineRef.current = new FractalEngine();
      }

      console.log('⏳ エンジン初期化完了を待機中...');
      await engineRef.current.waitForInitialization();
      console.log('✅ エンジン初期化完了確認');

      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Initialization failed');
      setIsLoading(false);
    }
  }, []);

  // 高性能フラクタルレンダリング
  const renderFractal = useCallback(
    async (
      canvasContext: CanvasRenderingContext2D | null,
      canvasSize: { width: number; height: number }
    ) => {
      const engine = engineRef.current;

      if (!canvasContext || !engine) return;

      if (isRendering) {
        console.log('レンダリング中のためスキップ');
        return;
      }

      if (!engine.initialized) {
        console.log('⏳ エンジン初期化待機中...');
        await engine.waitForInitialization();
        console.log('✅ エンジン初期化完了を確認');
      }

      const selectedMethod =
        useWebGPU && engine.webGPUSupported
          ? 'WebGPU'
          : useMultiThread && engine.availableWorkers > 0
            ? 'マルチスレッド'
            : 'シングルスレッドCPU';

      console.log(`フラクタルレンダリング開始 - 選択された方式: ${selectedMethod}`);
      setIsRendering(true);
      setRenderProgress(0);

      try {
        const result = await engine.renderFractal(fractalType, parameters, {
          width: canvasSize.width,
          height: canvasSize.height,
          paletteType,
          useWebGPU: useWebGPU && engine.webGPUSupported,
          useWorkers: useMultiThread && engine.availableWorkers > 0,
          onProgress: (progress) => {
            setRenderProgress(progress);
          },
        });

        canvasContext.putImageData(result.imageData, 0, 0);
        setPerformanceMetrics(engine.getPerformanceMetrics());

        console.log(`✅ フラクタルレンダリング完了`);
        console.log(`   方式: ${result.method}`);
        console.log(`   時間: ${result.renderTime.toFixed(1)}ms`);
        console.log(`   解像度: ${canvasSize.width}×${canvasSize.height}`);
        if (result.stats.workersUsed) {
          console.log(`   使用Worker数: ${result.stats.workersUsed}`);
        }
      } catch (err) {
        console.error('レンダリングエラー:', err);
        setError(err instanceof Error ? err.message : 'Rendering failed');
      } finally {
        setIsRendering(false);
        setRenderProgress(0);
      }
    },
    [parameters, fractalType, paletteType, useWebGPU, useMultiThread]
  );

  // パラメータ更新関数
  const updateZoom = useCallback((value: number) => {
    setParameters((prev) => {
      if ('zoom' in prev) {
        return { ...prev, zoom: value } as AllFractalParameters;
      }
      return prev;
    });
  }, []);

  const updateIterations = useCallback((value: number) => {
    const clampedValue = Math.max(10, Math.min(100000, value));
    setParameters((prev) => {
      if ('iterations' in prev) {
        return { ...prev, iterations: clampedValue } as AllFractalParameters;
      }
      return prev;
    });
  }, []);

  const updateParameters = useCallback((updates: Partial<AllFractalParameters>) => {
    setParameters((prev) => ({ ...prev, ...updates }) as AllFractalParameters);
  }, []);

  const resetView = useCallback(() => {
    setParameters(getDefaultParameters(fractalType));
  }, [fractalType]);

  // デュアルビューモード関連の関数
  const enterDualView = useCallback(() => {
    if (fractalType !== 'julia') {
      setFractalType('julia');
    }
    setIsDualView(true);
    // デュアルビューモード時もWebGPU/Workerを有効化（パフォーマンス重視）
    setUseWebGPU(true);
    setUseMultiThread(true);
  }, [fractalType]);

  const exitDualView = useCallback(() => {
    setIsDualView(false);
    // デュアルビューモード終了時にジュリア集合のcパラメータを適用
    if (fractalType === 'julia') {
      const juliaParams = parameters as JuliaParameters;
      setParameters({
        ...juliaParams,
        c: dualViewC,
        zoom: 1, // 探索モードでは初期ズームレベルから開始
        centerX: 0,
        centerY: 0,
        iterations: Math.min(juliaParams.iterations, 500), // 適度なイテレーション数
      });
    }
    // パフォーマンス設定を維持
    setUseWebGPU(true);
    setUseMultiThread(true);
  }, [fractalType, parameters, dualViewC]);

  const updateDualViewC = useCallback((c: Complex) => {
    setDualViewC(c);
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.dispose();
      }
    };
  }, []);

  // エンジン情報のgetter（isLoadingが変わったときのみ更新）
  const getEngineInfo = useCallback(() => {
    const engine = engineRef.current;
    return {
      webGPUSupported: engine?.webGPUSupported || false,
      availableWorkers: engine?.availableWorkers || 0,
    };
  }, [isLoading]);

  return {
    // State
    fractalType,
    setFractalType,
    parameters,
    setParameters,
    isLoading,
    error,
    setError,
    isRendering,
    renderProgress,
    useWebGPU,
    setUseWebGPU,
    useMultiThread,
    setUseMultiThread,
    enableAnimation,
    setEnableAnimation,
    paletteType,
    setPaletteType,
    performanceMetrics,

    // デュアルビューモード関連
    isDualView,
    dualViewC,
    enterDualView,
    exitDualView,
    updateDualViewC,

    // Functions
    initializeEngine,
    renderFractal,
    updateZoom,
    updateIterations,
    updateParameters,
    resetView,
    getEngineInfo,
  };
};
