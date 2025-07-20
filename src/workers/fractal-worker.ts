import type {
  AllFractalParameters,
  BurningShipParameters,
  Complex,
  FractalType,
  JuliaParameters,
  MandelbrotParameters,
  NewtonParameters,
} from '@/types/fractal';

export interface WorkerMessage {
  id: string;
  type: 'render' | 'progress' | 'complete' | 'error';
  payload: unknown;
}

export interface RenderMessage extends WorkerMessage {
  type: 'render';
  payload: {
    fractalType: FractalType;
    parameters: AllFractalParameters;
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
 * フラクタル計算関数群
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

function calculateJuliaPoint(
  real: number,
  imaginary: number,
  c: Complex,
  maxIterations: number,
  escapeRadius: number
): number {
  let zx = real;
  let zy = imaginary;
  let iteration = 0;

  while (zx * zx + zy * zy <= escapeRadius && iteration < maxIterations) {
    const temp = zx * zx - zy * zy + c.real;
    zy = 2 * zx * zy + c.imag;
    zx = temp;
    iteration++;
  }

  return iteration;
}

function calculateBurningShipPoint(
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
    zy = Math.abs(2 * zx * zy) + imaginary;
    zx = temp;
    iteration++;
  }

  return iteration;
}

function calculateNewtonPoint(
  real: number,
  imaginary: number,
  tolerance: number,
  maxIterations: number,
  roots: Complex[]
): { iterations: number; root: number } {
  let z: Complex = { real, imag: imaginary };
  let iteration = 0;

  while (iteration < maxIterations) {
    // 根から多項式 f(z) = (z - root1)(z - root2)...(z - rootN) を計算
    const { f, fPrime } = evaluatePolynomialFromRootsWorker(z, roots);

    // f'(z)が0に近い場合はスキップ（分母が0になることを防ぐ）
    if (magnitude(fPrime) < 1e-14) {
      break;
    }

    // z_{n+1} = z_n - f(z_n) / f'(z_n)
    const zNext = subtract(z, divide(f, fPrime));

    if (magnitude(subtract(zNext, z)) < tolerance) {
      let closestRoot = 0;
      let minDistance = Number.POSITIVE_INFINITY;

      // 最適化: 早期終了とキャッシュ効率の改善
      for (let index = 0; index < roots.length; index++) {
        const root = roots[index];
        if (root) {
          const dx = zNext.real - root.real;
          const dy = zNext.imag - root.imag;
          const distance = dx * dx + dy * dy; // 平方根計算を省略
          if (distance < minDistance) {
            minDistance = distance;
            closestRoot = index;
            // 十分近い場合は早期終了
            if (distance < tolerance * tolerance) {
              break;
            }
          }
        }
      }

      return { iterations: iteration, root: closestRoot };
    }

    z = zNext;
    iteration++;
  }

  return { iterations: maxIterations, root: -1 };
}

/**
 * 根から多項式とその導関数を評価（Worker版）
 */
function evaluatePolynomialFromRootsWorker(
  z: Complex,
  roots: Complex[]
): { f: Complex; fPrime: Complex } {
  if (roots.length === 0) {
    return {
      f: { real: 1, imag: 0 },
      fPrime: { real: 0, imag: 0 },
    };
  }

  // f(z) = (z - root1)(z - root2)...(z - rootN)
  let f: Complex = { real: 1, imag: 0 };
  for (const root of roots) {
    const factor = subtract(z, root);
    f = multiply(f, factor);
  }

  // f'(z) = sum over i of: product of (z - rootj) for all j != i
  let fPrime: Complex = { real: 0, imag: 0 };
  for (let i = 0; i < roots.length; i++) {
    let term: Complex = { real: 1, imag: 0 };
    for (let j = 0; j < roots.length; j++) {
      if (i !== j) {
        const rootJ = roots[j];
        if (rootJ) {
          const factor = subtract(z, rootJ);
          term = multiply(term, factor);
        }
      }
    }
    fPrime = add(fPrime, term);
  }

  return { f, fPrime };
}

// 複素数演算のヘルパー関数
function multiply(a: Complex, b: Complex): Complex {
  return {
    real: a.real * b.real - a.imag * b.imag,
    imag: a.real * b.imag + a.imag * b.real,
  };
}

function add(a: Complex, b: Complex): Complex {
  return { real: a.real + b.real, imag: a.imag + b.imag };
}

function subtract(a: Complex, b: Complex): Complex {
  return { real: a.real - b.real, imag: a.imag - b.imag };
}

function divide(a: Complex, b: Complex): Complex {
  const denominator = b.real * b.real + b.imag * b.imag;
  return {
    real: (a.real * b.real + a.imag * b.imag) / denominator,
    imag: (a.imag * b.real - a.real * b.imag) / denominator,
  };
}

function power(z: Complex, n: number): Complex {
  const r = magnitude(z);
  const theta = Math.atan2(z.imag, z.real);
  const rPowN = r ** n;
  const nTheta = n * theta;
  return {
    real: rPowN * Math.cos(nTheta),
    imag: rPowN * Math.sin(nTheta),
  };
}

function magnitude(z: Complex): number {
  return Math.sqrt(z.real * z.real + z.imag * z.imag);
}

/**
 * タイルレンダリング
 */
function renderTile(message: RenderMessage): CompleteMessage {
  const {
    fractalType,
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

  // カラーパレットを生成
  const rootCount = fractalType === 'newton' ? (parameters as NewtonParameters)?.roots?.length || 3 : undefined;
  const palette = generatePalette(paletteType, 256, rootCount);

  for (let y = 0; y < tileHeight; y++) {
    const row: number[] = [];
    const globalY = tileY + y;

    for (let x = 0; x < tileWidth; x++) {
      const globalX = tileX + x;

      let iterations: number;
      let colorValue: number;

      // フラクタルタイプに応じた計算
      switch (fractalType) {
        case 'mandelbrot': {
          const mandelbrotParams = parameters as MandelbrotParameters;
          const aspectRatio = width / height;
          const scale = 3.0 / mandelbrotParams.zoom;
          const real =
            mandelbrotParams.centerX + ((globalX - width / 2) * scale * aspectRatio) / width;
          const imaginary = mandelbrotParams.centerY + ((globalY - height / 2) * scale) / height;

          iterations = calculateMandelbrotPoint(
            real,
            imaginary,
            mandelbrotParams.iterations,
            mandelbrotParams.escapeRadius
          );
          colorValue = iterations;
          break;
        }

        case 'julia': {
          const juliaParams = parameters as JuliaParameters;
          const aspectRatio = width / height;
          const scale = 3.0 / juliaParams.zoom;
          const real = juliaParams.centerX + ((globalX - width / 2) * scale * aspectRatio) / width;
          const imaginary = juliaParams.centerY + ((globalY - height / 2) * scale) / height;

          iterations = calculateJuliaPoint(
            real,
            imaginary,
            juliaParams.c,
            juliaParams.iterations,
            juliaParams.escapeRadius
          );
          colorValue = iterations;
          break;
        }

        case 'burning-ship': {
          const burningShipParams = parameters as BurningShipParameters;
          const aspectRatio = width / height;
          const scale = 3.0 / burningShipParams.zoom;
          const real =
            burningShipParams.centerX + ((globalX - width / 2) * scale * aspectRatio) / width;
          const imaginary = burningShipParams.centerY + ((globalY - height / 2) * scale) / height;

          iterations = calculateBurningShipPoint(
            real,
            imaginary,
            burningShipParams.iterations,
            burningShipParams.escapeRadius
          );
          colorValue = iterations;
          break;
        }

        case 'newton': {
          const newtonParams = parameters as NewtonParameters;

          if (!newtonParams.roots || newtonParams.roots.length === 0) {
            throw new Error('Newton fractal: No roots provided in worker');
          }

          const aspectRatio = width / height;
          const scale = 3.0 / newtonParams.zoom;
          const real = newtonParams.centerX + ((globalX - width / 2) * scale * aspectRatio) / width;
          const imaginary = newtonParams.centerY + ((globalY - height / 2) * scale) / height;

          const result = calculateNewtonPoint(
            real,
            imaginary,
            newtonParams.tolerance,
            newtonParams.iterations,
            newtonParams.roots
          );

          iterations = result.iterations;
          colorValue =
            result.root >= 0 ? result.root * 100 + result.iterations : newtonParams.iterations;
          break;
        }

        default:
          throw new Error(`Unsupported fractal type: ${fractalType}`);
      }

      row.push(colorValue);

      // カラーを設定
      const pixelIndex = (y * tileWidth + x) * 4;

      let maxIterations: number;
      switch (fractalType) {
        case 'mandelbrot':
          maxIterations = (parameters as MandelbrotParameters).iterations;
          break;
        case 'julia':
          maxIterations = (parameters as JuliaParameters).iterations;
          break;
        case 'burning-ship':
          maxIterations = (parameters as BurningShipParameters).iterations;
          break;
        case 'newton':
          maxIterations = 300; // Newton用の調整された最大値
          break;
        default:
          maxIterations = 100;
      }

      if (fractalType !== 'newton' && iterations === maxIterations) {
        // 集合内の点は黒（Newtonフラクタル以外）
        data[pixelIndex] = 0;
        data[pixelIndex + 1] = 0;
        data[pixelIndex + 2] = 0;
        data[pixelIndex + 3] = 255;
      } else {
        // カラーパレットから色を取得
        let colorIndex: number;
        let color: number[];
        
        if (fractalType === 'newton' && paletteType === 'newton') {
          // ニュートンフラクタル専用のカラーマッピング（newtonパレット選択時のみ）
          const newtonParams = parameters as NewtonParameters;
          const rootCount = newtonParams.roots?.length || 3;
          const useExtendedPalette = rootCount >= 4;
          const totalColorSets = useExtendedPalette ? rootCount + 1 : rootCount;
          const colorsPerSet = Math.floor(palette.length / totalColorSets);
          
          // 根のインデックスと反復回数を分離
          const rootIndex = Math.floor(colorValue / 100);
          const iterationsInColor = colorValue % 100;
          
          if (rootIndex >= 0 && rootIndex < rootCount) {
            // 通常の根の色（RGB色相パレット）
            const colorSetOffset = rootIndex * colorsPerSet;
            const iterationOffset = Math.floor((iterationsInColor / maxIterations) * Math.max(1, colorsPerSet - 1));
            colorIndex = colorSetOffset + iterationOffset;
          } else if (useExtendedPalette && rootIndex >= rootCount) {
            // 4以上の根の場合、グレーパレットを使用
            const graySetOffset = rootCount * colorsPerSet;
            const iterationOffset = Math.floor((iterationsInColor / maxIterations) * Math.max(1, colorsPerSet - 1));
            colorIndex = graySetOffset + iterationOffset;
          } else {
            // デフォルト（黒）
            colorIndex = 0;
          }
          
          color = palette[Math.max(0, Math.min(colorIndex, palette.length - 1))] || [0, 0, 0, 255];
        } else {
          // 標準カラーマッピング（他のフラクタル、またはニュートンでも他のパレット選択時）
          colorIndex = Math.floor((colorValue / maxIterations) * (palette.length - 1));
          color = palette[Math.max(0, Math.min(colorIndex, palette.length - 1))] || [0, 0, 0, 255];
        }
        
        data[pixelIndex] = color[0] || 0; // R
        data[pixelIndex + 1] = color[1] || 0; // G
        data[pixelIndex + 2] = color[2] || 0; // B
        data[pixelIndex + 3] = color[3] || 255; // A
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

// パレットキャッシュ
const paletteCache = new Map<string, number[][]>();

/**
 * カラーパレットを生成（キャッシュ付き）
 */
function generatePalette(type: string, steps: number, rootCount?: number): number[][] {
  // キャッシュキーを生成
  const cacheKey = `${type}_${steps}_${rootCount || 0}`;
  
  // キャッシュから取得を試行
  const cached = paletteCache.get(cacheKey);
  if (cached) {
    return cached;
  }
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

    case 'newton':
      // Newton フラクタル専用のカラーパレット（拡張版 - 根が4以上でグレーパレット追加）
      const baseColors = [
        [255, 100, 100], [100, 255, 100], [100, 100, 255], [255, 255, 100], [255, 100, 255],
        [100, 255, 255], [255, 150, 50], [150, 50, 255], [50, 255, 150], [255, 50, 150]
      ];

      const count = rootCount || 3;
      
      // 根が4以上の場合、グレーパレットも含める
      const useGrayPalette = count >= 4;
      const totalColorSets = useGrayPalette ? count + 1 : count; // +1 for gray palette
      const stepsPerColorSet = Math.floor(steps / totalColorSets);
      
      // RGB色相パレット（従来の根用）
      for (let rootIndex = 0; rootIndex < count; rootIndex++) {
        const baseColor = baseColors[rootIndex % baseColors.length] || [255, 255, 255];
        const baseR = baseColor[0] || 255;
        const baseG = baseColor[1] || 255;
        const baseB = baseColor[2] || 255;
        
        // 事前計算で最適化
        const colorStep = stepsPerColorSet > 1 ? 1 / (stepsPerColorSet - 1) : 0;
        
        for (let i = 0; i < stepsPerColorSet; i++) {
          const brightness = 0.3 + (1 - i * colorStep) * 0.7;
          
          colors.push([
            Math.floor(baseR * brightness),
            Math.floor(baseG * brightness),
            Math.floor(baseB * brightness),
            255
          ]);
        }
      }
      
      // 根が4以上の場合、グレーパレットを追加
      if (useGrayPalette) {
        const colorStep = stepsPerColorSet > 1 ? 1 / (stepsPerColorSet - 1) : 0;
        
        for (let i = 0; i < stepsPerColorSet; i++) {
          const t = i * colorStep;
          
          // グレースケール（高コントラスト版）
          const grayValue = Math.floor(50 + t * 205); // 50-255の範囲で高コントラスト
          colors.push([grayValue, grayValue, grayValue, 255]);
        }
      }
      
      // 残りの色（収束しなかった点用）
      const remainingSteps = steps - colors.length;
      for (let i = 0; i < remainingSteps; i++) {
        colors.push([0, 0, 0, 255]);
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

  // キャッシュに保存
  paletteCache.set(cacheKey, colors);

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
    console.error('Worker error:', error);

    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = `${error.name}: ${error.message}`;
      if (error.stack) {
        console.error('Error stack:', error.stack);
        errorMessage += `\nStack: ${error.stack}`;
      }
    } else {
      errorMessage = String(error);
    }

    self.postMessage({
      id: message.id,
      type: 'error',
      payload: {
        error: errorMessage,
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
