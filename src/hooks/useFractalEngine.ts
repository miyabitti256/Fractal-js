import { useCallback, useEffect, useRef, useState } from 'react';
import { FractalEngine, type PerformanceMetrics } from '@/lib/fractal-engine';
import { getDefaultParameters } from '@/lib/fractal-utils';
import type { FractalType, MandelbrotParameters } from '@/types/fractal';

export const useFractalEngine = () => {
  const engineRef = useRef<FractalEngine | null>(null);

  // State
  const [fractalType, setFractalType] = useState<FractalType>('mandelbrot');
  const [parameters, setParameters] = useState(
    () => getDefaultParameters('mandelbrot') as MandelbrotParameters
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

  // フラクタルタイプ変更時のパラメータ更新
  useEffect(() => {
    const defaultParams = getDefaultParameters(fractalType);
    if (defaultParams.type === 'mandelbrot') {
      setParameters(defaultParams);
    }
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
    setParameters((prev) => ({ ...prev, zoom: value }));
  }, []);

  const updateIterations = useCallback((value: number) => {
    const clampedValue = Math.max(10, Math.min(100000, value));
    setParameters((prev) => ({ ...prev, iterations: clampedValue }));
  }, []);

  const resetView = useCallback(() => {
    setParameters(getDefaultParameters('mandelbrot') as MandelbrotParameters);
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

    // Functions
    initializeEngine,
    renderFractal,
    updateZoom,
    updateIterations,
    resetView,
    getEngineInfo,
  };
};
