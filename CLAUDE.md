# CLAUDE.md

このファイルは、Claude Code (claude.ai/code) がこのリポジトリで作業する際のガイドです。

## プロジェクト概要

BT管理システム — GAS（Google Apps Script）+ Google スプレッドシートで構築された教育機関向け小テスト・成績管理システムを、モダンスタックで再構築するプロジェクト。学習・練習目的。生徒機能から先に実装し、教員機能は後日対応。

**元GASプロジェクト**: `/Users/nagano_takashi/dev/claude-code/claude-code-BT/`
**実装計画**: 詳細は `PLAN.md` を参照。

## 技術スタック

- **Next.js 16** App Router、`src/` ディレクトリ構成、TypeScript（strict mode）
- **React 19**
- **Tailwind CSS 4**（`@import "tailwindcss"` 構文、`@theme inline` でカスタムプロパティ定義）
- **Supabase**（`@supabase/ssr` でSSR対応認証、`@supabase/supabase-js` でDB操作）
- **Chart.js** + react-chartjs-2（成績チャート）
- **date-fns** + date-fns-tz（Asia/Tokyo タイムゾーン対応）

## コマンド

```bash
npm run dev      # 開発サーバー起動 (localhost:3000)
npm run build    # 本番ビルド
npm run start    # 本番サーバー起動
npm run lint     # ESLint 実行
```

## アーキテクチャ

### ルーティング（App Router）

- `/login` — Google OAuth ログイン画面
- `/auth/callback` — OAuth コールバック処理
- `/student` — 生徒ホーム（ダッシュボード：生徒情報カード、成績チャート）
- `/student/quiz` — 小テスト画面（クライアントコンポーネント）
- `/student/history` — 学習履歴・再受験

### 主要ディレクトリ（計画）

- `src/lib/supabase/` — Supabase クライアント: `client.ts`（ブラウザ用）、`server.ts`（SSR用）、`middleware.ts`
- `src/lib/types/` — DBテーブルの TypeScript 型定義
- `src/lib/` — ビジネスロジック: `quiz-logic.ts`、`grade-logic.ts`、`date-utils.ts`
- `src/components/` — 共通UIコンポーネント
- `middleware.ts`（ルート） — 認証ガード、`/student/*` ルートを保護

### パスエイリアス

`@/*` → `./src/*` にマッピング

### 認証

Supabase Auth 経由の Google OAuth。`middleware.ts` が `/student/*` を保護し、未認証ユーザーを `/login` にリダイレクト。認証後、`auth.users.email` を `students.email` と直接照合して生徒を特定。

### 環境変数

`.env.local` に以下が必要:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### コアビジネスロジック

- **グレード進級**: 合格 + 本日未受験 → 連続日数+1 → 連続日数 >= 必要日数 → 次グレードに昇格、カウンターリセット。不合格 → 連続日数を0にリセット。最上級グレード → 進級なし。
- **日次制限**: 1日1回のみ成績記録に保存。Asia/Tokyo タイムゾーンで日付判定。
- **問題シャッフル**: Fisher-Yates アルゴリズム。グレードの問題ID範囲からランダム選択。選択肢もシャッフル。
- **再受験**: 履歴の `question_ids` を使って同じ問題セットを再生成。結果は保存しない。
- **採点**: クライアント側で即時フィードバック表示 + サーバー側で検証してから保存。

### データベーステーブル（Supabase）

`students`、`grade_definitions`、`questions`、`quiz_records` — すべて RLS 有効。`students.email` で Google アカウントと紐付け。スキーマの詳細は `PLAN.md` を参照。
