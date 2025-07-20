import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import type { AllFractalParameters } from '@/types/fractal';

interface FractalCanvasProps {
  canvasSize: { width: number; height: number };
  parameters: AllFractalParameters;
  onPointerDown: (event: React.PointerEvent) => void;
  onPointerMove: (event: React.PointerEvent) => void;
  onPointerUp: (event: React.PointerEvent) => void;
  onClick: (event: React.MouseEvent) => void;
  className?: string;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

export interface FractalCanvasRef {
  getCanvas: () => HTMLCanvasElement | null;
  getContext: () => CanvasRenderingContext2D | null;
}

const FractalCanvas = forwardRef<FractalCanvasRef, FractalCanvasProps>(
  (
    {
      canvasSize,
      parameters,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onClick,
      className = '',
      canvasRef: externalCanvasRef,
    },
    ref
  ) => {
    const internalCanvasRef = useRef<HTMLCanvasElement>(null);
    const canvasRef = externalCanvasRef || internalCanvasRef;

    useImperativeHandle(
      ref,
      () => ({
        getCanvas: () => canvasRef.current,
        getContext: () => canvasRef.current?.getContext('2d') || null,
      }),
      [canvasRef]
    );

    return (
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className={`w-full h-full cursor-crosshair ${className}`}
        style={{
          imageRendering: 'pixelated',
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: className.includes('object-cover') ? 'cover' : 'contain',
          touchAction: 'none', // モバイルでのタッチ操作最適化
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={onClick}
      />
    );
  }
);

FractalCanvas.displayName = 'FractalCanvas';

export default FractalCanvas;
