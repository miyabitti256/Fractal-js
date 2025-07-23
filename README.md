# Fractal Explorer

> インタラクティブなフラクタル図形探索サイト

[![Build Status](https://github.com/your-username/Fractal-js/workflows/CI/badge.svg)](https://github.com/your-username/Fractal-js/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB.svg)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4+-38B2AC.svg)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

美しいフラクタル図形をリアルタイムで探索できるWebアプリケーションです。WebGPU、Web Workers、WebAssemblyを活用した高性能レンダリングエンジンで、マンデルブロ集合やジュリア集合などの複雑なフラクタルパターンをインタラクティブに体験できます。

## ✨ 特徴

- 🎨 **美しいフラクタル**: マンデルブロ集合、ジュリア集合、バーニングシップ、ニュートンフラクタル
- ⚡ **高性能レンダリング**: WebGPU/WebGL/WASM/Web Workersによる最適化
- 🖱️ **インタラクティブ操作**: リアルタイムズーム・パン・パラメータ調整
- 📱 **レスポンシブデザイン**: デスクトップ・タブレット・モバイル対応
- 🎯 **アクセシビリティ**: WCAG 2.1 AA準拠
- 🔧 **型安全**: TypeScript + Biome v2.1.2による厳密なリンター

## 🛠️ 技術スタック

### フロントエンド
- **Astro 4.0+** - 静的サイトジェネレーター
- **React 18.3+** - インタラクティブコンポーネント
- **TypeScript 5.3+** - 型安全な開発
- **Tailwind CSS 3.4+** - ユーティリティファーストCSS
- **Biome 2.1.2** - リンティング・フォーマット


## 🎮 使用方法

### 基本操作
- **ズーム**: マウスホイール or タッチピンチ
- **パン**: ドラッグ or タッチドラッグ
- **リセット**: ダブルクリック or ダブルタップ

### パラメータ調整
- **反復回数**: 詳細度を調整
- **カラーパレット**: 配色テーマを変更
- **レンダリングモード**: CPU/GPUを切り替え

### フラクタル種類
- **マンデルブロ集合**: 最も有名なフラクタル
- **ジュリア集合**: パラメータCによる美しいパターン
- **ニュートンフラクタル**: 根の収束域を可視化
- **バーニングシップ**: マンデルブロ集合の変種