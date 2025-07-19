# Fractal Explorer

> インタラクティブなフラクタル図形探索サイト

[![Build Status](https://github.com/your-username/Fractal-js/workflows/CI/badge.svg)](https://github.com/your-username/Fractal-js/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB.svg)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4+-38B2AC.svg)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

美しいフラクタル図形をリアルタイムで探索できるWebアプリケーションです。WebGPU、Web Workers、WebAssemblyを活用した高性能レンダリングエンジンで、マンデルブロ集合やジュリア集合などの複雑なフラクタルパターンをインタラクティブに体験できます。

## ✨ 特徴

- 🎨 **美しいフラクタル**: マンデルブロ集合、ジュリア集合、シェルピンスキーの三角形など
- ⚡ **高性能レンダリング**: WebGPU/WebGL/WASM/Web Workersによる最適化
- 🖱️ **インタラクティブ操作**: リアルタイムズーム・パン・パラメータ調整
- 📱 **レスポンシブデザイン**: デスクトップ・タブレット・モバイル対応
- 🎯 **アクセシビリティ**: WCAG 2.1 AA準拠
- 🔧 **型安全**: TypeScript + Biome v2.1.1による厳密な型チェック

## 🚀 デモ

[**Live Demo**](https://your-username.github.io/Fractal-js/) をご覧ください。

## 📖 ドキュメント

- [要件定義書](./docs/REQUIREMENTS.md)
- [アーキテクチャ設計書](./docs/ARCHITECTURE.md)
- [コーディング規約書](./docs/CODING_STANDARDS.md)

## 🛠️ 技術スタック

### フロントエンド
- **Astro 4.0+** - 静的サイトジェネレーター
- **React 18.3+** - インタラクティブコンポーネント
- **TypeScript 5.3+** - 型安全な開発
- **Tailwind CSS 3.4+** - ユーティリティファーストCSS

### 高性能計算
- **WebGPU** - GPU加速レンダリング（メイン）
- **WebGL 2.0** - GPU フォールバック
- **Web Workers** - マルチスレッド並列処理
- **WebAssembly (Rust)** - ネイティブレベルの計算性能

### 開発ツール
- **Astro CLI** - 開発サーバー・ビルド
- **Vite 5.0+** - 高速バンドラー（Astro内蔵）
- **Biome 2.1.1** - リンティング・フォーマット
- **GitHub Actions** - CI/CD
- **GitHub Pages** - 静的サイトホスティング

## 🏗️ セットアップ

### 前提条件
- Node.js 20+
- npm または yarn
- モダンブラウザ（Chrome 90+, Firefox 88+, Safari 14+, Edge 90+）

### インストール

```bash
# リポジトリのクローン
git clone https://github.com/your-username/Fractal-js.git
cd Fractal-js

# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

開発サーバーが `http://localhost:5173` で起動します。

### ビルド

```bash
# プロダクションビルド
npm run build

# ビルド結果をプレビュー
npm run preview

# GitHub Pagesにデプロイ
npm run deploy
```

## 📁 プロジェクト構造

```
src/
├── pages/              # Astro ページ（SSG）
│   ├── index.astro     # ホームページ
│   ├── gallery.astro   # ギャラリー
│   ├── about.astro     # アバウト
│   └── fractals/       # フラクタル個別ページ
├── components/         # Astro & React コンポーネント
│   ├── layout/         # レイアウトコンポーネント
│   ├── fractal/        # フラクタル関連（React Islands）
│   ├── ui/             # 汎用UIコンポーネント
│   └── seo/            # SEO関連コンポーネント
├── core/               # コアロジック
│   ├── fractal/        # フラクタル計算エンジン
│   ├── gpu/            # GPU関連処理
│   ├── workers/        # Web Workers
│   └── utils/          # ユーティリティ
├── fractals/           # フラクタル実装
├── shaders/            # GPU シェーダー
├── wasm/               # WebAssembly モジュール
├── hooks/              # React Hooks
├── types/              # TypeScript型定義
└── constants/          # 定数定義
```

## 🎮 使用方法

### 基本操作
- **ズーム**: マウスホイール or タッチピンチ
- **パン**: ドラッグ or タッチドラッグ
- **リセット**: ダブルクリック or ダブルタップ

### パラメータ調整
- **反復回数**: 詳細度を調整
- **カラーパレット**: 配色テーマを変更
- **レンダリングモード**: CPU/GPU/WASMを切り替え

### フラクタル種類
- **マンデルブロ集合**: 最も有名なフラクタル
- **ジュリア集合**: パラメータCによる美しいパターン
- **シェルピンスキーの三角形**: 自己相似な幾何学的フラクタル
- **コッホ雪片**: 無限の周囲長を持つ図形
- **バーニングシップ**: マンデルブロ集合の変種

## 🧪 テスト

```bash
# 全テスト実行
npm test

# テストウォッチモード
npm run test:watch

# カバレッジ生成
npm run test:coverage

# E2Eテスト
npm run test:e2e
```

## 📊 パフォーマンス

### ベンチマーク結果（目安）
- **初期表示**: < 1秒
- **インタラクティブ操作**: 60fps
- **高解像度レンダリング**: 4K対応
- **メモリ使用量**: < 512MB

### 最適化技術
- プログレッシブレンダリング
- タイル分割並列処理
- GPUコンピュートシェーダー
- WASM SIMD最適化

## 🤝 コントリビューション

コントリビューションを歓迎しています！以下の手順に従ってください：

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'feat: add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

### 開発ガイドライン
- [コーディング規約](./docs/CODING_STANDARDS.md)に従ってください
- TypeScriptの型安全性を維持してください
- テストを追加してください
- ドキュメントを更新してください

## 📝 ライセンス

このプロジェクトは [MIT License](./LICENSE) の下で公開されています。

## 🙏 謝辞

- [React](https://reactjs.org/) - UIライブラリ
- [WebGPU](https://gpuweb.github.io/gpuweb/) - GPU計算API
- [Tailwind CSS](https://tailwindcss.com/) - CSSフレームワーク
- [Biome](https://biomejs.dev/) - 開発ツール
- フラクタル数学の研究者の皆様

## 📞 サポート

問題や質問がある場合は、以下の方法でお気軽にお問い合わせください：

- [GitHub Issues](https://github.com/your-username/Fractal-js/issues)
- [GitHub Discussions](https://github.com/your-username/Fractal-js/discussions)

---

⭐ このプロジェクトが気に入ったら、ぜひスターをお願いします！
