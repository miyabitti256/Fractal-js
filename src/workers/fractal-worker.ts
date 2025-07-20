import type { MandelbrotParameters } from '@/types/fractal';

export interface WorkerMessage {
  id: string;
  type: 'render' | 'progress' | 'complete' | 'error';
  payload: unknown;
}

export interface RenderMessage extends WorkerMessage {
  type: 'render';
  payload: {
    parameters: MandelbrotParameters;
    width: number;
    height: number;
    tileX: number;
    tileY: number;
    tileWidth: number;
    tileHeight: number;
    paletteType?: string;
  };
}

export interface ProgressMessage extends WorkerMessage {
  type: 'progress';
  payload: {
    progress: number;
    tileIndex: number;
  };
}

export interface CompleteMessage extends WorkerMessage {
  type: 'complete';
  payload: {
    imageData: ImageData;
    iterationData: number[][];
    renderTime: number;
    tileX: number;
    tileY: number;
  };
}

export interface ErrorMessage extends WorkerMessage {
  type: 'error';
  payload: {
    error: string;
  };
}

/**
 * Mandelbrot集合の計算
 */
function calculateMandelbrotPoint(
  real: number,
  imaginary: number,
  maxIterations: number,
  escapeRadius: number
): number {
  let zx = 0;
  let zy = 0;
  let iteration = 0;

  while (zx * zx + zy * zy <= escapeRadius && iteration < maxIterations) {
    const temp = zx * zx - zy * zy + real;
    zy = 2 * zx * zy + imaginary;
    zx = temp;
    iteration++;
  }

  return iteration;
}

/**
 * タイルレンダリング
 */
function renderTile(message: RenderMessage): CompleteMessage {
  const {
    parameters,
    width,
    height,
    tileX,
    tileY,
    tileWidth,
    tileHeight,
    paletteType = 'mandelbrot',
  } = message.payload;
  const startTime = performance.now();

  const iterationData: number[][] = [];
  const imageData = new ImageData(tileWidth, tileHeight);
  const data = imageData.data;

  const aspectRatio = width / height;
  const scale = 3.0 / parameters.zoom;

  // カラーパレットを生成
  const palette = generatePalette(paletteType, 256);

  for (let y = 0; y < tileHeight; y++) {
    const row: number[] = [];
    const globalY = tileY + y;

    for (let x = 0; x < tileWidth; x++) {
      const globalX = tileX + x;

      // 複素数座標を計算
      const real = parameters.centerX + ((globalX - width / 2) * scale * aspectRatio) / width;
      const imaginary = parameters.centerY + ((globalY - height / 2) * scale) / height;

      // Mandelbrot計算
      const iterations = calculateMandelbrotPoint(
        real,
        imaginary,
        parameters.iterations,
        parameters.escapeRadius
      );

      row.push(iterations);

      // カラーを設定
      const pixelIndex = (y * tileWidth + x) * 4;

      if (iterations === parameters.iterations) {
        // 集合内の点は黒
        data[pixelIndex] = 0;
        data[pixelIndex + 1] = 0;
        data[pixelIndex + 2] = 0;
        data[pixelIndex + 3] = 255;
      } else {
        // カラーパレットから色を取得
        const colorIndex = Math.floor((iterations / parameters.iterations) * (palette.length - 1));
        const color = palette[colorIndex];
        data[pixelIndex] = color[0]; // R
        data[pixelIndex + 1] = color[1]; // G
        data[pixelIndex + 2] = color[2]; // B
        data[pixelIndex + 3] = color[3]; // A
      }
    }

    iterationData.push(row);

    // プログレス報告（10行ごと）
    if (y % 10 === 0) {
      const progress = y / tileHeight;
      self.postMessage({
        id: message.id,
        type: 'progress',
        payload: {
          progress,
          tileIndex: 0, // タイルインデックスは外部で管理
        },
      } satisfies ProgressMessage);
    }
  }

  const renderTime = performance.now() - startTime;

  return {
    id: message.id,
    type: 'complete',
    payload: {
      imageData,
      iterationData,
      renderTime,
      tileX,
      tileY,
    },
  };
}

/**
 * カラーパレットを生成
 */
function generatePalette(type: string, steps: number): number[][] {
  const colors: number[][] = [];

  switch (type) {
    case 'hot':
      for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        const r = Math.min(255, Math.floor(255 * t * 3));
        const g = Math.min(255, Math.max(0, Math.floor(255 * (3 * t - 1))));
        const b = Math.min(255, Math.max(0, Math.floor(255 * (3 * t - 2))));
        colors.push([r, g, b, 255]);
      }
      break;

    case 'cool':
      for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        const r = Math.floor(255 * t);
        const g = Math.floor(255 * (1 - t));
        const b = 255;
        colors.push([r, g, b, 255]);
      }
      break;

    case 'rainbow':
      for (let i = 0; i < steps; i++) {
        const hue = (i / steps) * 360;
        const [r, g, b] = hslToRgb(hue, 100, 50);
        colors.push([r, g, b, 255]);
      }
      break;

    case 'fire':
      for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        if (t < 0.5) {
          const s = t * 2;
          colors.push([Math.floor(s * 255), 0, 0, 255]);
        } else {
          const s = (t - 0.5) * 2;
          colors.push([255, Math.floor(s * 255), Math.floor(s * 100), 255]);
        }
      }
      break;

    case 'ocean':
      for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        if (t < 0.5) {
          const s = t * 2;
          colors.push([0, Math.floor(s * 100), Math.floor(50 + s * 205), 255]);
        } else {
          const s = (t - 0.5) * 2;
          colors.push([Math.floor(s * 100), Math.floor(100 + s * 155), 255, 255]);
        }
      }
      break;

    case 'sunset':
      for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        if (t < 0.3) {
          const s = t / 0.3;
          colors.push([Math.floor(50 + s * 205), Math.floor(s * 50), Math.floor(s * 100), 255]);
        } else if (t < 0.7) {
          const s = (t - 0.3) / 0.4;
          colors.push([255, Math.floor(50 + s * 165), Math.floor(100 + s * 55), 255]);
        } else {
          const s = (t - 0.7) / 0.3;
          colors.push([255, Math.floor(215 + s * 40), Math.floor(155 + s * 100), 255]);
        }
      }
      break;

    case 'grayscale':
      for (let i = 0; i < steps; i++) {
        const value = Math.floor((i / (steps - 1)) * 255);
        colors.push([value, value, value, 255]);
      }
      break;

    default: // 'mandelbrot'
      for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);

        if (t < 0.16) {
          const s = t / 0.16;
          colors.push([Math.floor(s * 66), Math.floor(s * 30), Math.floor(s * 15), 255]);
        } else if (t < 0.42) {
          const s = (t - 0.16) / 0.26;
          colors.push([
            Math.floor(66 + s * (25 - 66)),
            Math.floor(30 + s * (7 - 30)),
            Math.floor(15 + s * (26 - 15)),
            255,
          ]);
        } else if (t < 0.6425) {
          const s = (t - 0.42) / 0.2225;
          colors.push([
            Math.floor(25 + s * (9 - 25)),
            Math.floor(7 + s * (1 - 7)),
            Math.floor(26 + s * (47 - 26)),
            255,
          ]);
        } else if (t < 0.8575) {
          const s = (t - 0.6425) / 0.215;
          colors.push([
            Math.floor(9 + s * (2 - 9)),
            Math.floor(1 + s * (4 - 1)),
            Math.floor(47 + s * (73 - 47)),
            255,
          ]);
        } else {
          const s = (t - 0.8575) / 0.1425;
          colors.push([
            Math.floor(2 + s * (0 - 2)),
            Math.floor(4 + s * (7 - 4)),
            Math.floor(73 + s * (100 - 73)),
            255,
          ]);
        }
      }
      break;
  }

  return colors;
}

/**
 * HSLからRGBに変換
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = h / 360;
  s = s / 100;
  l = l / 100;

  const hue2rgb = (p: number, q: number, t: number): number => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// Worker メッセージハンドラー
self.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;

  try {
    switch (message.type) {
      case 'render': {
        const renderMessage = message as RenderMessage;
        const result = renderTile(renderMessage);
        self.postMessage(result);
        break;
      }

      default:
        self.postMessage({
          id: message.id,
          type: 'error',
          payload: {
            error: `Unknown message type: ${message.type}`,
          },
        } satisfies ErrorMessage);
    }
  } catch (error) {
    self.postMessage({
      id: message.id,
      type: 'error',
      payload: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    } satisfies ErrorMessage);
  }
});

// Worker初期化完了を通知
self.postMessage({
  id: 'init',
  type: 'complete',
  payload: {
    message: 'Worker initialized successfully',
  },
});
