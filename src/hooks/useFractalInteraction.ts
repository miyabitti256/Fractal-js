import { useCallback, useEffect, useRef, useState } from 'react';
import type { AllFractalParameters } from '@/types/fractal';

interface UseFractalInteractionProps {
  parameters: AllFractalParameters;
  setParameters: (
    params: AllFractalParameters | ((prev: AllFractalParameters) => AllFractalParameters)
  ) => void;
  canvasSize: { width: number; height: number };
}

export const useFractalInteraction = ({
  parameters,
  setParameters,
  canvasSize,
}: UseFractalInteractionProps) => {
  // マウス/タッチ操作用のstate
  const [isDragging, setIsDragging] = useState(false);
  const [lastPointerPos, setLastPointerPos] = useState({ x: 0, y: 0 });
  const [coordinates, setCoordinates] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // タップ操作用のstate
  const [touchStartTime, setTouchStartTime] = useState(0);
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 });
  const lastTapTimeRef = useRef(0);

  // ピンチズーム用のstate
  const [isPinching, setIsPinching] = useState(false);
  const [lastPinchDistance, setLastPinchDistance] = useState(0);
  const [lastPinchCenter, setLastPinchCenter] = useState({ x: 0, y: 0 });

  // 2点間の距離を計算
  const getDistance = useCallback((touch1: Touch, touch2: Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // 2点の中心点を計算
  const getCenter = useCallback((touch1: Touch, touch2: Touch) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  }, []);

  // タッチイベントハンドラー
  const handleTouchStart = useCallback(
    (event: TouchEvent) => {
      event.preventDefault();

      if (event.touches.length === 1 && event.touches[0]) {
        // シングルタッチ - タップまたはドラッグの可能性
        const touch = event.touches[0];
        const now = Date.now();
        setTouchStartTime(now);
        setTouchStartPos({ x: touch.clientX, y: touch.clientY });
        setLastPointerPos({ x: touch.clientX, y: touch.clientY });
        setIsDragging(false); // ドラッグは後で判定
      } else if (event.touches.length === 2 && event.touches[0] && event.touches[1]) {
        // ピンチ開始
        setIsPinching(true);
        setIsDragging(false);
        const distance = getDistance(event.touches[0], event.touches[1]);
        const center = getCenter(event.touches[0], event.touches[1]);
        setLastPinchDistance(distance);
        setLastPinchCenter(center);
      }
    },
    [getDistance, getCenter]
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      event.preventDefault();

      if (event.touches.length === 1 && event.touches[0]) {
        const touch = event.touches[0];
        
        // まだドラッグ開始していない場合、移動距離をチェック
        if (!isDragging) {
          const moveDistance = Math.sqrt(
            Math.pow(touch.clientX - touchStartPos.x, 2) + 
            Math.pow(touch.clientY - touchStartPos.y, 2)
          );
          
          // 10px以上動いたらドラッグとして認識
          if (moveDistance > 10) {
            setIsDragging(true);
          } else {
            return; // まだタップの可能性
          }
        }

        // ドラッグ処理
        if (isDragging && !isPinching) {
          const canvas = event.target as HTMLCanvasElement;
          if (!canvas) return;

          const rect = canvas.getBoundingClientRect();
          const deltaX = touch.clientX - lastPointerPos.x;
          const deltaY = touch.clientY - lastPointerPos.y;

          const canvasDeltaX = (deltaX / rect.width) * canvasSize.width;
          const canvasDeltaY = (deltaY / rect.height) * canvasSize.height;
          const aspectRatio = canvasSize.width / canvasSize.height;
          const scale = 3.0 / parameters.zoom;

          setParameters((prev) => {
            if ('centerX' in prev && 'centerY' in prev) {
              return {
                ...prev,
                centerX: prev.centerX - (canvasDeltaX * scale * aspectRatio) / canvasSize.width,
                centerY: prev.centerY - (canvasDeltaY * scale) / canvasSize.height,
              } as AllFractalParameters;
            }
            return prev;
          });

          setLastPointerPos({ x: touch.clientX, y: touch.clientY });
        }
      } else if (event.touches.length === 2 && isPinching && event.touches[0] && event.touches[1]) {
        // ピンチズーム
        const canvas = event.target as HTMLCanvasElement;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const distance = getDistance(event.touches[0], event.touches[1]);
        const center = getCenter(event.touches[0], event.touches[1]);

        if (lastPinchDistance > 0) {
          const scale = distance / lastPinchDistance;
          const zoomFactor = scale > 1 ? Math.min(scale, 1.1) : Math.max(scale, 0.9);

          // ピンチ中心点を複素平面座標に変換
          const centerX = center.x - rect.left;
          const centerY = center.y - rect.top;
          const canvasX = (centerX / rect.width) * canvasSize.width;
          const canvasY = (centerY / rect.height) * canvasSize.height;
          const aspectRatio = canvasSize.width / canvasSize.height;
          const currentScale = 3.0 / parameters.zoom;
          const complexX =
            ('centerX' in parameters ? parameters.centerX : 0) +
            ((canvasX - canvasSize.width / 2) * currentScale * aspectRatio) / canvasSize.width;
          const complexY =
            ('centerY' in parameters ? parameters.centerY : 0) +
            ((canvasY - canvasSize.height / 2) * currentScale) / canvasSize.height;

          setParameters((prev) => ({
            ...prev,
            zoom: Math.max(0.001, Math.min(1e15, prev.zoom * zoomFactor)),
            centerX: complexX,
            centerY: complexY,
          }));
        }

        setLastPinchDistance(distance);
        setLastPinchCenter(center);
      }
    },
    [
      isDragging,
      isPinching,
      lastPointerPos,
      lastPinchDistance,
      canvasSize,
      parameters,
      setParameters,
      getDistance,
      getCenter,
    ]
  );

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (event.touches.length === 0) {
      // 全てのタッチが終了
      if (!isDragging && touchStartTime > 0) {
        // ドラッグしていない場合はタップとして処理
        const now = Date.now();
        const touchDuration = now - touchStartTime;
        
        // 300ms以内の短いタップかつ、前回のタップから100ms以上経過している場合のみ処理
        if (touchDuration < 300 && now - lastTapTimeRef.current > 100) {
          lastTapTimeRef.current = now;
          
          const canvas = event.target as HTMLCanvasElement;
          if (canvas) {
            const rect = canvas.getBoundingClientRect();
            const x = touchStartPos.x - rect.left;
            const y = touchStartPos.y - rect.top;
            
            // タップした位置を中心に設定（PC版と同じ動作）
            const canvasX = (x / rect.width) * canvasSize.width;
            const canvasY = (y / rect.height) * canvasSize.height;
            const aspectRatio = canvasSize.width / canvasSize.height;
            const scale = 3.0 / parameters.zoom;
            
            const complexX = ('centerX' in parameters ? parameters.centerX : 0) + 
              ((canvasX - canvasSize.width / 2) * scale * aspectRatio) / canvasSize.width;
            const complexY = ('centerY' in parameters ? parameters.centerY : 0) + 
              ((canvasY - canvasSize.height / 2) * scale) / canvasSize.height;
            
            setParameters((prev) => {
              if ('centerX' in prev && 'centerY' in prev) {
                return {
                  ...prev,
                  centerX: complexX,
                  centerY: complexY,
                } as AllFractalParameters;
              }
              return prev;
            });
          }
        }
      }
      
      setIsDragging(false);
      setIsPinching(false);
      setLastPinchDistance(0);
      setTouchStartTime(0);
    } else if (event.touches.length === 1 && event.touches[0]) {
      setIsPinching(false);
      setLastPinchDistance(0);
      // シングルタッチに戻った場合のドラッグ準備
      setLastPointerPos({ x: event.touches[0].clientX, y: event.touches[0].clientY });
    }
  }, [isDragging, touchStartTime, touchStartPos, canvasSize, parameters, setParameters]);

  // Pointer Event handlers (デスクトップ用)
  const handlePointerDown = useCallback((event: React.PointerEvent) => {
    event.preventDefault();
    setIsDragging(true);
    setLastPointerPos({ x: event.clientX, y: event.clientY });
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      const canvas = event.currentTarget as HTMLCanvasElement;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;

      // 座標変換をその場で実行（parametersの最新値を使用）
      const canvasX = (pointerX / rect.width) * canvasSize.width;
      const canvasY = (pointerY / rect.height) * canvasSize.height;
      const aspectRatio = canvasSize.width / canvasSize.height;
      const scale = 3.0 / parameters.zoom;
      const complexX =
        ('centerX' in parameters ? parameters.centerX : 0) +
        ((canvasX - canvasSize.width / 2) * scale * aspectRatio) / canvasSize.width;
      const complexY =
        ('centerY' in parameters ? parameters.centerY : 0) +
        ((canvasY - canvasSize.height / 2) * scale) / canvasSize.height;

      setCoordinates({ x: complexX, y: complexY });

      if (isDragging && !isPinching) {
        const deltaX = event.clientX - lastPointerPos.x;
        const deltaY = event.clientY - lastPointerPos.y;

        const canvasDeltaX = (deltaX / rect.width) * canvasSize.width;
        const canvasDeltaY = (deltaY / rect.height) * canvasSize.height;

        setParameters((prev) => {
          if ('centerX' in prev && 'centerY' in prev) {
            return {
              ...prev,
              centerX: prev.centerX - (canvasDeltaX * scale * aspectRatio) / canvasSize.width,
              centerY: prev.centerY - (canvasDeltaY * scale) / canvasSize.height,
            } as AllFractalParameters;
          }
          return prev;
        });

        setLastPointerPos({ x: event.clientX, y: event.clientY });
      }
    },
    [isDragging, isPinching, lastPointerPos, canvasSize, setParameters]
  );

  const handlePointerUp = useCallback((event: React.PointerEvent) => {
    setIsDragging(false);
    (event.target as HTMLElement).releasePointerCapture(event.pointerId);
  }, []);

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();
      const zoomFactor = event.deltaY > 0 ? 0.8 : 1.25;
      setParameters((prev) => ({
        ...prev,
        zoom: Math.max(0.001, Math.min(1e15, prev.zoom * zoomFactor)),
      }));
    },
    [setParameters]
  );

  // イベントリスナーの設定
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // ホイールイベント
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    // タッチイベント（モバイル用）
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd]);

  const handleCanvasClick = useCallback(
    (event: React.MouseEvent) => {
      if (isDragging || isPinching) return;

      const canvas = event.currentTarget as HTMLCanvasElement;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const clickY = event.clientY - rect.top;

      // 座標変換をその場で実行
      const canvasX = (clickX / rect.width) * canvasSize.width;
      const canvasY = (clickY / rect.height) * canvasSize.height;
      const aspectRatio = canvasSize.width / canvasSize.height;
      const scale = 3.0 / parameters.zoom;
      const complexX =
        ('centerX' in parameters ? parameters.centerX : 0) +
        ((canvasX - canvasSize.width / 2) * scale * aspectRatio) / canvasSize.width;
      const complexY =
        ('centerY' in parameters ? parameters.centerY : 0) +
        ((canvasY - canvasSize.height / 2) * scale) / canvasSize.height;

      setParameters((prev) => {
        if ('centerX' in prev && 'centerY' in prev) {
          return {
            ...prev,
            centerX: complexX,
            centerY: complexY,
          } as AllFractalParameters;
        }
        return prev;
      });
    },
    [isDragging, isPinching, canvasSize, setParameters]
  );

  return {
    canvasRef,
    coordinates,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleCanvasClick,
  };
};
