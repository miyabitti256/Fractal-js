import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AllFractalParameters, Complex, NewtonParameters } from '@/types/fractal';

interface NewtonRootEditorProps {
  parameters: NewtonParameters;
  updateParameters: (params: Partial<AllFractalParameters>) => void;
  width?: number;
  height?: number;
}

interface SelectionState {
  selectedRootIndex: number; // 選択された根のインデックス（-1なら未選択）
}

interface DragState {
  isDragging: boolean;
  rootIndex: number;
  startX: number;
  startY: number;
  pointerId?: number;
}

export default function NewtonRootEditor({
  parameters,
  updateParameters,
  width = 300,
  height = 300,
}: NewtonRootEditorProps) {
  // レスポンシブサイズ調整（useMemoで最適化）
  const isMobile = useMemo(() => typeof window !== 'undefined' && window.innerWidth < 768, []);
  // 実際のキャンバスサイズ - より大きなサイズを確保
  const actualWidth = useMemo(
    () => (isMobile ? Math.min(width, 320) : Math.min(width, 400)),
    [isMobile, width]
  );
  const actualHeight = useMemo(
    () => (isMobile ? Math.min(height, 240) : Math.min(height, 300)),
    [isMobile, height]
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectionState, setSelectionState] = useState<SelectionState>({
    selectedRootIndex: -1,
  });
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    rootIndex: -1,
    startX: 0,
    startY: 0,
  });

  // 複素平面の表示範囲
  const viewRange = 2.5; // -2.5 to 2.5 on both axes
  const centerX = actualWidth / 2;
  const centerY = actualHeight / 2;
  const scale = Math.min(actualWidth, actualHeight) / (2 * viewRange);

  // 複素数を画面座標に変換
  const complexToScreen = useCallback(
    (z: Complex): { x: number; y: number } => {
      return {
        x: centerX + z.real * scale,
        y: centerY - z.imag * scale, // Y軸は反転
      };
    },
    [centerX, centerY, scale]
  );

  // 画面座標を複素数に変換
  const screenToComplex = useCallback(
    (x: number, y: number): Complex => {
      return {
        real: (x - centerX) / scale,
        imag: -(y - centerY) / scale, // Y軸は反転
      };
    },
    [centerX, centerY, scale]
  );

  // キャンバスの描画
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // クリア
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, actualWidth, actualHeight);

    // グリッドを描画
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;

    // 縦線 - モバイルでも等間隔になるように修正
    const gridSpacing = 0.5;
    for (let real = -viewRange; real <= viewRange; real += gridSpacing) {
      const x = Math.round(centerX + real * scale); // 描画位置を丸めて正確に
      if (x >= 0 && x <= actualWidth) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, actualHeight);
        ctx.stroke();
      }
    }

    // 横線 - モバイルでも等間隔になるように修正
    for (let imag = -viewRange; imag <= viewRange; imag += gridSpacing) {
      const y = Math.round(centerY - imag * scale); // 描画位置を丸めて正確に
      if (y >= 0 && y <= actualHeight) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(actualWidth, y);
        ctx.stroke();
      }
    }

    // 軸を描画
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 2;

    // 実軸
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(actualWidth, centerY);
    ctx.stroke();

    // 虚軸
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, actualHeight);
    ctx.stroke();

    // 単位円を描画
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, scale, 0, 2 * Math.PI);
    ctx.stroke();

    // 根を描画
    const colors = ['#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];
    const rootRadius = isMobile ? 10 : 8; // モバイルで少し大きく

    parameters.roots.forEach((root, index) => {
      const pos = complexToScreen(root);
      const color = colors[index % colors.length];

      // 根の点
      ctx.fillStyle = color || '#ffffff';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, rootRadius, 0, 2 * Math.PI);
      ctx.fill();

      // 白い境界線
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 根の番号
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((index + 1).toString(), pos.x, pos.y);

      // 根の座標を表示
      ctx.fillStyle = color || '#ffffff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(
        `${root.real.toFixed(2)} ${root.imag >= 0 ? '+' : ''}${root.imag.toFixed(2)}i`,
        pos.x + 12,
        pos.y - 5
      );
    });

    // 選択中の根のハイライト（モバイル版）
    if (isMobile && selectionState.selectedRootIndex >= 0) {
      const root = parameters.roots[selectionState.selectedRootIndex];
      if (root) {
        const pos = complexToScreen(root);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        const highlightRadius = 14;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, highlightRadius, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }

    // ドラッグ中の根のハイライト（PC版）
    if (!isMobile && dragState.isDragging && dragState.rootIndex >= 0) {
      const root = parameters.roots[dragState.rootIndex];
      if (root) {
        const pos = complexToScreen(root);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        const highlightRadius = 12;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, highlightRadius, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
  }, [
    parameters.roots,
    selectionState,
    dragState,
    complexToScreen,
    centerX,
    centerY,
    scale,
    actualWidth,
    actualHeight,
    viewRange,
    isMobile,
  ]);

  // クリックされた根のインデックスを取得
  const getRootAtPosition = useCallback(
    (x: number, y: number): number => {
      for (let i = 0; i < parameters.roots.length; i++) {
        const root = parameters.roots[i];
        if (root) {
          const pos = complexToScreen(root);
          const distance = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
          // モバイルでは少し大きめの判定範囲
          const hitRadius = isMobile ? 16 : 12;
          if (distance <= hitRadius) {
            return i;
          }
        }
      }
      return -1;
    },
    [parameters.roots, complexToScreen, isMobile]
  );

  // モバイル版：タップイベントハンドラ（2段階タップ方式）
  const handleMobileTap = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      e.preventDefault();
      e.stopPropagation();

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const rootIndex = getRootAtPosition(x, y);

      if (rootIndex >= 0) {
        // 根をタップした場合：根を選択または選択解除
        if (selectionState.selectedRootIndex === rootIndex) {
          // 同じ根をタップ → 選択解除
          setSelectionState({ selectedRootIndex: -1 });
        } else {
          // 異なる根をタップ → その根を選択
          setSelectionState({ selectedRootIndex: rootIndex });
        }
      } else {
        // 空の場所をタップした場合
        if (selectionState.selectedRootIndex >= 0) {
          // 根が選択されている場合：その位置に根を移動
          const newComplex = screenToComplex(x, y);
          const newRoots = [...parameters.roots];
          newRoots[selectionState.selectedRootIndex] = newComplex;

          updateParameters({
            ...parameters,
            roots: newRoots,
          });

          // 移動後は選択解除
          setSelectionState({ selectedRootIndex: -1 });
        }
      }
    },
    [getRootAtPosition, selectionState, parameters, screenToComplex, updateParameters]
  );

  // PC版：ドラッグイベントハンドラ
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const rootIndex = getRootAtPosition(x, y);
      if (rootIndex >= 0) {
        canvas.setPointerCapture(e.pointerId);

        setDragState({
          isDragging: true,
          rootIndex,
          startX: x,
          startY: y,
          pointerId: e.pointerId,
        });
        e.preventDefault();
        e.stopPropagation();
      }
    },
    [getRootAtPosition]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!dragState.isDragging || dragState.rootIndex < 0) return;
      if (dragState.pointerId !== undefined && e.pointerId !== dragState.pointerId) return;

      e.preventDefault();
      e.stopPropagation();

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const newComplex = screenToComplex(x, y);
      const newRoots = [...parameters.roots];
      newRoots[dragState.rootIndex] = newComplex;

      updateParameters({
        ...parameters,
        roots: newRoots,
      });
    },
    [dragState, parameters, screenToComplex, updateParameters]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (dragState.pointerId !== undefined && e.pointerId !== dragState.pointerId) return;

      e.preventDefault();
      e.stopPropagation();

      const canvas = canvasRef.current;
      if (canvas && dragState.pointerId !== undefined) {
        try {
          canvas.releasePointerCapture(dragState.pointerId);
        } catch {
          // キャプチャが既に解放されている場合のエラーを無視
        }
      }

      setDragState({
        isDragging: false,
        rootIndex: -1,
        startX: 0,
        startY: 0,
      });
    },
    [dragState.pointerId]
  );

  // ダブルクリックで根を追加
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // 既存の根の上でなければ新しい根を追加
      const rootIndex = getRootAtPosition(x, y);
      if (rootIndex < 0) {
        const newComplex = screenToComplex(x, y);
        const newRoots = [...parameters.roots, newComplex];

        updateParameters({
          ...parameters,
          roots: newRoots,
        });
      }
    },
    [parameters, getRootAtPosition, screenToComplex, updateParameters]
  );

  // 右クリックで根を削除
  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const rootIndex = getRootAtPosition(x, y);
      if (rootIndex >= 0 && parameters.roots.length > 1) {
        const newRoots = parameters.roots.filter((_, index) => index !== rootIndex);

        updateParameters({
          ...parameters,
          roots: newRoots,
        });
      }
    },
    [parameters, getRootAtPosition, updateParameters]
  );

  // 描画の更新
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  return (
    <div className="flex flex-col rounded-lg bg-gray-800">
      <h3 className="mb-2 flex-shrink-0 font-semibold text-gray-200 text-sm">
        インタラクティブ根エディター
      </h3>
      <div className="relative flex flex-1 flex-col">
        <canvas
          ref={canvasRef}
          width={actualWidth}
          height={actualHeight}
          onPointerDown={isMobile ? handleMobileTap : handlePointerDown}
          onPointerMove={!isMobile ? handlePointerMove : undefined}
          onPointerUp={!isMobile ? handlePointerUp : undefined}
          onPointerLeave={!isMobile ? handlePointerUp : undefined}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
          className="mx-auto block flex-shrink-0 cursor-pointer rounded border border-gray-600"
          style={{ touchAction: 'none' }} // タッチデバイス用
        />

        {/* スクロール可能なコンテンツエリア */}
        <div className="scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 mt-2 max-h-32 flex-shrink-0 space-y-2 overflow-y-auto">
          {/* 操作説明 */}
          <div className="space-y-1 text-gray-400 text-xs">
            {isMobile ? (
              <>
                <div>• 根をタップして選択</div>
                <div>• 移動先をタップして根を移動</div>
              </>
            ) : (
              <>
                <div>• 根をドラッグして移動</div>
              </>
            )}
            <div>• ダブルクリックで根を追加</div>
            <div>• 右クリックで根を削除</div>
            <div>• 円は単位円を表示</div>
          </div>

          {/* プリセットボタン */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => {
                const newRoots = [
                  { real: 1, imag: 0 },
                  { real: -0.5, imag: Math.sqrt(3) / 2 },
                  { real: -0.5, imag: -Math.sqrt(3) / 2 },
                ];
                updateParameters({ ...parameters, roots: newRoots });
              }}
              className="rounded bg-blue-600 px-2 py-1 text-white text-xs hover:bg-blue-500"
            >
              z³-1
            </button>
            <button
              type="button"
              onClick={() => {
                const newRoots = [
                  { real: 1, imag: 0 },
                  { real: -1, imag: 0 },
                  { real: 0, imag: 1 },
                  { real: 0, imag: -1 },
                ];
                updateParameters({ ...parameters, roots: newRoots });
              }}
              className="rounded bg-blue-600 px-2 py-1 text-white text-xs hover:bg-blue-500"
            >
              z⁴-1
            </button>
            <button
              type="button"
              onClick={() => {
                const newRoots = [
                  { real: 1, imag: 0 },
                  { real: -1, imag: 0 },
                ];
                updateParameters({ ...parameters, roots: newRoots });
              }}
              className="rounded bg-blue-600 px-2 py-1 text-white text-xs hover:bg-blue-500"
            >
              z²-1
            </button>
            <button
              type="button"
              onClick={() => {
                const angle = (2 * Math.PI) / 5;
                const newRoots = Array.from({ length: 5 }, (_, i) => ({
                  real: Math.cos(i * angle),
                  imag: Math.sin(i * angle),
                }));
                updateParameters({ ...parameters, roots: newRoots });
              }}
              className="rounded bg-purple-600 px-2 py-1 text-white text-xs hover:bg-purple-500"
            >
              z⁵-1
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
