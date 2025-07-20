# コーディング規約書

## 1. 概要

本プロジェクトでは、**Biome v2.1.2** を使用してコードの品質と一貫性を保ちます。
この規約書は、チーム開発における統一されたコーディングスタイルと最適な開発プラクティスを定義します。

## 2. ツール設定

### 2.1 Biome設定 (biome.json)

```json
{
  "$schema": "https://biomejs.dev/schemas/2.1.2/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "ignoreUnknown": false,
    "includes": [
      "**",
      "!**/node_modules/**",
      "!**/dist/**",
      "!**/build/**",
      "!**/.astro/**",
      "!**/coverage/**",
      "!**/*.wasm",
      "!**/pkg/**",
      "!**/.env*"
    ]
  },
  "formatter": {
    "enabled": true,
    "formatWithErrors": false,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineEnding": "lf",
    "lineWidth": 100,
    "attributePosition": "auto",
    "includes": ["**", "!**/generated/**", "!**/wasm/pkg/**", "!**/.astro/**"]
  },
  "assist": { "actions": { "source": { "organizeImports": "on" } } },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "a11y": {
        "recommended": true
      },
      "complexity": {
        "recommended": true
      },
      "correctness": {
        "recommended": true,
        "useExhaustiveDependencies": "warn"
      },
      "nursery": {
        "useSortedClasses": "warn"
      },
      "performance": {
        "recommended": true
      },
      "security": {
        "recommended": true
      },
      "style": {
        "recommended": true,
        "noDefaultExport": "off",
        "noNonNullAssertion": "warn",
        "noParameterProperties": "off",
        "noShoutyConstants": "off",
        "useFilenamingConvention": {
          "level": "error",
          "options": {
            "requireAscii": true,
            "filenameCases": ["kebab-case", "PascalCase"]
          }
        },
        "useNamingConvention": {
          "level": "error",
          "options": {
            "strictCase": false,
            "conventions": [
              {
                "selector": {
                  "kind": "function"
                },
                "formats": ["camelCase", "PascalCase"]
              },
              {
                "selector": {
                  "kind": "variable"
                },
                "formats": ["camelCase", "PascalCase", "CONSTANT_CASE"]
              },
              {
                "selector": {
                  "kind": "typeLike"
                },
                "formats": ["PascalCase"]
              }
            ]
          }
        }
      },
      "suspicious": {
        "recommended": true,
        "noConsole": "warn",
        "noExplicitAny": "warn"
      }
    }
  },
  "javascript": {
    "formatter": {
      "jsxQuoteStyle": "double",
      "quoteProperties": "asNeeded",
      "trailingCommas": "es5",
      "semicolons": "always",
      "arrowParentheses": "always",
      "bracketSpacing": true,
      "bracketSameLine": false,
      "quoteStyle": "single",
      "attributePosition": "auto"
    }
  },
  "json": {
    "formatter": {
      "enabled": true,
      "indentStyle": "space",
      "indentWidth": 2,
      "lineWidth": 100,
      "trailingCommas": "none"
    },
    "parser": {
      "allowComments": true,
      "allowTrailingCommas": false
    }
  },
  "css": {
    "formatter": {
      "enabled": true,
      "indentStyle": "space",
      "indentWidth": 2,
      "lineWidth": 100
    }
  },
  "overrides": [
    {
      "includes": ["*.ts", "*.tsx"],
      "linter": {
        "rules": {
          "correctness": {
            "noUndeclaredVariables": "off"
          }
        }
      }
    },
    {
      "includes": ["*.astro"],
      "linter": {
        "rules": {
          "style": {
            "useNamingConvention": "off"
          },
          "suspicious": {
            "noExplicitAny": "off"
          }
        }
      }
    },
    {
      "includes": ["**/*.config.*", "**/vite.config.*", "**/astro.config.*"],
      "linter": {
        "rules": {
          "style": {
            "noDefaultExport": "off"
          }
        }
      }
    },
    {
      "includes": ["src/wasm/**/*"],
      "linter": {
        "enabled": false
      },
      "formatter": {
        "enabled": false
      }
    }
  ]
}
```

### 2.2 VSCode設定 (.vscode/settings.json)

```json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  },
  "[javascript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[typescript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[javascriptreact]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true
}
```

## 3. TypeScript規約

### 3.1 基本原則

#### 3.1.1 型安全性の徹底
```typescript
// ✅ Good: 明示的な型定義
interface FractalParams {
  maxIterations: number;
  escapeRadius: number;
  centerX: number;
  centerY: number;
  zoom: number;
}

// ❌ Bad: any型の使用
const params: any = {
  maxIterations: 100,
  // ...
};

// ✅ Good: Union型を使用
type RenderMode = 'cpu' | 'webgl' | 'webgpu';

// ❌ Bad: 文字列リテラル
const renderMode = 'cpu'; // string型
```

#### 3.1.2 Null Safety
```typescript
// ✅ Good: Optional chainingの使用
const canvas = canvasRef.current?.getContext('2d');

// ✅ Good: Nullish coalescingの使用
const iterations = params.maxIterations ?? DEFAULT_ITERATIONS;

// ❌ Bad: 非null assertionの多用
const ctx = canvasRef.current!.getContext('2d')!;
```

### 3.2 命名規約

#### 3.2.1 変数・関数
```typescript
// ✅ Good: camelCase
const mandelbrotSet = new MandelbrotSet();
const calculateFractal = () => {};

// ✅ Good: 定数はCONSTANT_CASE
const MAX_ITERATIONS = 1000;
const DEFAULT_ZOOM_LEVEL = 1.0;

// ❌ Bad: snake_case
const mandelbrot_set = new MandelbrotSet();
```

#### 3.2.2 型・インターフェース・クラス
```typescript
// ✅ Good: PascalCase
interface FractalRenderer {
  render(params: FractalParams): void;
}

class WebGPURenderer implements FractalRenderer {
  // ...
}

type ComplexNumber = {
  real: number;
  imaginary: number;
};
```

#### 3.2.3 コンポーネント
```typescript
// ✅ Good: PascalCase + 説明的な名前
const FractalViewer: React.FC<FractalViewerProps> = ({ fractalType }) => {
  return <canvas />;
};

// ✅ Good: カスタムフック
const useFractalRenderer = (type: FractalType) => {
  // ...
};
```

### 3.3 型定義

#### 3.3.1 インターフェース vs Type
```typescript
// ✅ Good: オブジェクトの形状定義はinterface
interface FractalConfig {
  name: string;
  defaultParams: FractalParams;
  renderer: FractalRenderer;
}

// ✅ Good: Union型やプリミティブはtype
type FractalType = 'mandelbrot' | 'julia' | 'sierpinski';
type Coordinate = [number, number];

// ✅ Good: 関数型定義
type RenderCallback = (imageData: ImageData) => void;
```

#### 3.3.2 Generics
```typescript
// ✅ Good: 意味のある名前
interface Repository<TEntity, TKey> {
  findById(id: TKey): Promise<TEntity | null>;
  save(entity: TEntity): Promise<void>;
}

// ✅ Good: 制約の使用
interface Renderable {
  render(): void;
}

function createRenderer<T extends Renderable>(
  RendererClass: new () => T
): T {
  return new RendererClass();
}
```

## 4. React/JSX規約

### 4.1 コンポーネント設計

#### 4.1.1 関数コンポーネント
```typescript
// ✅ Good: Arrow function + 型定義
interface Props {
  fractalType: FractalType;
  onParamsChange: (params: FractalParams) => void;
}

const ControlPanel: React.FC<Props> = ({ fractalType, onParamsChange }) => {
  return (
    <div className="control-panel">
      {/* ... */}
    </div>
  );
};

// ❌ Bad: Function declaration
function ControlPanel(props: Props) {
  // ...
}
```

#### 4.1.2 Propsの分割代入
```typescript
// ✅ Good: Props分割代入
const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  disabled = false,
  onClick,
  ...props
}) => {
  return (
    <button
      className={clsx('btn', `btn-${variant}`)}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

// ❌ Bad: props経由でのアクセス
const Button: React.FC<ButtonProps> = (props) => {
  return (
    <button onClick={props.onClick}>
      {props.children}
    </button>
  );
};
```

### 4.2 Hooks

#### 4.2.1 カスタムフック
```typescript
// ✅ Good: useプレフィックス + 型安全
const useFractalRenderer = (
  canvasRef: React.RefObject<HTMLCanvasElement>,
  fractalType: FractalType
) => {
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState(0);

  const render = useCallback(async (params: FractalParams) => {
    setIsRendering(true);
    try {
      // レンダリング処理
    } finally {
      setIsRendering(false);
    }
  }, [fractalType]);

  return { render, isRendering, progress };
};
```

#### 4.2.2 useEffect
```typescript
// ✅ Good: 明確な依存配列
useEffect(() => {
  const handleResize = () => {
    if (canvasRef.current) {
      resizeCanvas(canvasRef.current);
    }
  };

  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []); // 依存配列が空 = マウント時のみ実行

// ✅ Good: 条件付き実行
useEffect(() => {
  if (shouldRender && params) {
    renderFractal(params);
  }
}, [shouldRender, params]); // 依存する値を全て列挙
```

### 4.3 JSX

#### 4.3.1 要素の記述
```typescript
// ✅ Good: 自己完結タグ
<input type="number" value={iterations} onChange={handleChange} />

// ✅ Good: 複数行の場合の整理
<FractalViewer
  fractalType="mandelbrot"
  params={params}
  onParamsChange={handleParamsChange}
  className="fractal-viewer"
/>

// ✅ Good: 条件レンダリング
{isLoading && <LoadingSpinner />}
{error && <ErrorMessage message={error.message} />}

// ❌ Bad: 三項演算子の過度な使用
{isLoading ? <LoadingSpinner /> : error ? <ErrorMessage /> : <Content />}
```

#### 4.3.2 イベントハンドラー
```typescript
// ✅ Good: useCallbackでメモ化
const handleSliderChange = useCallback((value: number) => {
  setParams((prev) => ({ ...prev, maxIterations: value }));
}, []);

// ✅ Good: インライン関数は避ける
// ❌ Bad:
<Slider onChange={(value) => setParams({...params, maxIterations: value})} />

// ✅ Good:
<Slider onChange={handleSliderChange} />
```

## 5. ファイル構成規約

### 5.1 ディレクトリ構造
```
src/
├── components/          # Reactコンポーネント
│   ├── ui/             # 汎用UIコンポーネント
│   ├── fractal/        # フラクタル専用コンポーネント
│   └── layout/         # レイアウトコンポーネント
├── hooks/              # カスタムフック
├── types/              # 型定義ファイル
├── utils/              # ユーティリティ関数
├── constants/          # 定数定義
└── core/               # コアロジック
```

### 5.2 ファイル命名
```typescript
// ✅ Good: コンポーネントファイル
FractalViewer.tsx
ControlPanel.tsx
LoadingSpinner.tsx

// ✅ Good: フックファイル
useFractalRenderer.ts
useWebGPU.ts
useViewport.ts

// ✅ Good: ユーティリティファイル
math-utils.ts
color-utils.ts
performance-utils.ts

// ✅ Good: 型定義ファイル
fractal.types.ts
gpu.types.ts
ui.types.ts
```

### 5.3 Export/Import規約

#### 5.3.1 Named Export優先
```typescript
// ✅ Good: Named export
export const FractalViewer: React.FC<Props> = () => {};
export const ControlPanel: React.FC<Props> = () => {};

// ✅ Good: Index.tsでの再エクスポート
// components/fractal/index.ts
export { FractalViewer } from './FractalViewer';
export { ControlPanel } from './ControlPanel';
```

#### 5.3.2 Import順序
```typescript
// 1. Node modules
import React, { useState, useCallback } from 'react';
import { clsx } from 'clsx';

// 2. 内部モジュール（絶対パス）
import { FractalType } from '@/types/fractal';
import { useFractalRenderer } from '@/hooks/useFractalRenderer';

// 3. 相対パス
import { Button } from '../ui/Button';
import { Slider } from './Slider';
```

## 6. エラーハンドリング

### 6.1 エラー境界
```typescript
// ✅ Good: React Error Boundary
class FractalErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Fractal rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <FractalErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}
```

### 6.2 非同期エラー
```typescript
// ✅ Good: try-catch with async/await
const renderFractal = async (params: FractalParams): Promise<void> => {
  try {
    setIsLoading(true);
    setError(null);
    
    const result = await fractalRenderer.render(params);
    setImageData(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    setError(new Error(`Rendering failed: ${message}`));
  } finally {
    setIsLoading(false);
  }
};
```

## 7. パフォーマンス規約

### 7.1 React最適化
```typescript
// ✅ Good: React.memo for expensive components
const FractalViewer = React.memo<Props>(({ params, onRender }) => {
  // 重い描画処理
}, (prevProps, nextProps) => {
  return JSON.stringify(prevProps.params) === JSON.stringify(nextProps.params);
});

// ✅ Good: useMemo for expensive calculations
const colorPalette = useMemo(() => {
  return generateColorPalette(colorScheme, paletteSize);
}, [colorScheme, paletteSize]);

// ✅ Good: useCallback for stable references
const handleParamsChange = useCallback((newParams: FractalParams) => {
  setParams((prev) => ({ ...prev, ...newParams }));
}, []);
```

### 7.2 Web Workers
```typescript
// ✅ Good: Worker型定義
interface FractalWorkerMessage {
  type: 'render' | 'progress' | 'complete' | 'error';
  data: unknown;
}

const worker = new Worker(new URL('./fractal-worker.ts', import.meta.url));

worker.postMessage({
  type: 'render',
  data: { params, imageSize }
} satisfies FractalWorkerMessage);
```

## 8. テスト規約

### 8.1 ユニットテスト
```typescript
// ✅ Good: 型安全なテスト
describe('MandelbrotSet', () => {
  it('should correctly calculate point membership', () => {
    const mandelbrot = new MandelbrotSet();
    const result = mandelbrot.isInSet(0, 0, 100);
    
    expect(result.inSet).toBe(true);
    expect(result.iterations).toBeGreaterThan(0);
  });

  it('should handle edge cases', () => {
    const mandelbrot = new MandelbrotSet();
    
    expect(() => mandelbrot.isInSet(NaN, 0, 100)).toThrow();
    expect(() => mandelbrot.isInSet(0, 0, -1)).toThrow();
  });
});
```

### 8.2 React Testing Library
```typescript
// ✅ Good: ユーザー中心のテスト
describe('ControlPanel', () => {
  it('should update parameters when slider changes', async () => {
    const mockOnChange = jest.fn();
    
    render(
      <ControlPanel
        params={{ maxIterations: 100 }}
        onParamsChange={mockOnChange}
      />
    );

    const slider = screen.getByLabelText('Max Iterations');
    fireEvent.change(slider, { target: { value: '200' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      maxIterations: 200
    });
  });
});
```

## 9. コメント規約

### 9.1 JSDoc
```typescript
/**
 * マンデルブロ集合の特定の点における収束判定を行う
 * @param real - 複素数の実数部
 * @param imaginary - 複素数の虚数部  
 * @param maxIterations - 最大反復回数
 * @returns 収束情報を含むオブジェクト
 * @throws {Error} パラメータが無効な場合
 */
function calculateMandelbrotPoint(
  real: number,
  imaginary: number,
  maxIterations: number
): MandelbrotResult {
  // 実装
}
```

### 9.2 インラインコメント
```typescript
// ✅ Good: なぜその実装なのかを説明
// WebGPUが利用できない場合はWebGLにフォールバック
const renderer = gpuDevice 
  ? new WebGPURenderer(gpuDevice)
  : new WebGLRenderer(glContext);

// ✅ Good: 複雑なアルゴリズムの説明
// ニュートン・ラフソン法による反復計算
// z_{n+1} = z_n - f(z_n) / f'(z_n)
const nextZ = currentZ.subtract(
  polynomial.evaluate(currentZ).divide(polynomial.derivative(currentZ))
);

// ❌ Bad: 実装の説明
// i を 1 増やす
i++;
```

## 10. Git規約

### 10.1 コミットメッセージ
```
feat: WebGPU対応のマンデルブロ集合レンダラーを追加

- コンピュートシェーダーによる並列計算を実装
- WebGL フォールバック機能を追加
- パフォーマンステストを追加

Closes #123
```

### 10.2 ブランチ命名
```
feature/webgpu-mandelbrot-renderer
fix/memory-leak-in-worker
refactor/fractal-engine-architecture
docs/api-documentation-update
```

---

*最終更新: 2024年12月*
*バージョン: 1.0* 