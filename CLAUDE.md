# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

BT管理システム — 教育機関向け小テスト・成績管理システム。元は GAS + Google スプレッドシートで構築されていたものを、モダンスタックで再構築。学習・練習目的。生徒機能（小テスト受験・履歴・成績チャート）と教員機能（読み取り専用の生徒閲覧・検索・成績ダッシュボード）を実装済み。

**実装計画**: 詳細は `PLAN.md` を参照。

## 技術スタック

- **Next.js 16** App Router、`src/` ディレクトリ構成、TypeScript（strict mode）
- **React 19**
- **Tailwind CSS 4**（`@import "tailwindcss"` 構文、`@theme inline` でカスタムプロパティ定義 — `tailwind.config` ファイルなし）
- **Supabase**（`@supabase/ssr` でSSR対応認証、`@supabase/supabase-js` でDB操作）
- **Chart.js** + react-chartjs-2（成績チャート）
- **date-fns** + date-fns-tz（Asia/Tokyo タイムゾーン対応）
- **ESLint 9** flat config（`eslint.config.mjs`、`eslint-config-next/core-web-vitals` + `/typescript`）
- **Vercel** でデプロイ

## コマンド

```bash
npm run dev      # 開発サーバー起動 (localhost:3000)
npm run build    # 本番ビルド（Turbopack）
npm run start    # 本番サーバー起動
npm run lint     # ESLint 実行
```

テストフレームワークは未導入。

## アーキテクチャ

### ルーティング（App Router）

- `/` — ロール判定: 教員→`/teacher`、生徒→`/student`、未登録→メッセージ表示、未認証→`/login`
- `/login` — Google OAuth ログイン画面
- `/auth/callback` — OAuth コールバック（Route Handler）→ `/` へリダイレクトしてロール判定
- `/student` — 生徒ホーム（ダッシュボード）
- `/student/quiz` — 小テスト（Client Component、`Suspense` ラッパー）
- `/student/history` — 学習履歴・再受験
- `/teacher` — 教員ホーム
- `/teacher/students` — 生徒一覧（URLパラメータでフィルター）
- `/teacher/students/[studentId]` — 生徒詳細（30日統計・チャート）

各ルートに `loading.tsx`（スケルトンUI）と `error.tsx`（リトライボタン付き）を配置済み。

### ロール分離とカラーテーマ

- **生徒側**: 青系（`blue-600` 等）、`max-w-3xl` コンテナ
- **教員側**: ティール系（`teal-700` 等）、`max-w-5xl` コンテナ（テーブル用に広め）
- 各ロールは独立した `layout.tsx` と専用ヘッダー（`Header.tsx` / `TeacherHeader.tsx`）を持つ

### Server Component / Client Component の使い分け

- **Server Component**: ホーム画面、履歴、教員ページ全般、`StudentInfoCard`、`HistoryItem`、`QuizQuestion`、`QuizResult`、`StudentTable`、`StatisticsCard`
- **Client Component** (`"use client"`): クイズページ、`Header`/`TeacherHeader`（`usePathname` でナビ状態管理）、`ScoreChart`（Chart.js）、`StudentFilter`（URL パラメータ操作）、ログイン画面

### 主要ディレクトリ

- `src/lib/supabase/` — Supabase クライアント: `client.ts`（ブラウザ用）、`server.ts`（SSR用・`cookies()` 使用）、`middleware.ts`（セッション更新・認証ガード）
- `src/lib/types/database.ts` — DB テーブルの型: `Student`, `Teacher`, `GradeDefinition`, `Question`, `QuizRecord`
- `src/lib/quiz-logic.ts` — `shuffleArray`（Fisher-Yates）、`shuffleChoices`、`gradeQuiz`
- `src/lib/grade-logic.ts` — `calculateGradeAdvancement`（連続日数・昇級判定）
- `src/lib/date-utils.ts` — `getTodayJST`、`getRecentDates`、`isTakenToday` 等（Asia/Tokyo）
- `middleware.ts`（ルート） — `/student/*` と `/teacher/*` ルートの認証ガード

### パスエイリアス

`@/*` → `./src/*`

### 認証フロー

Supabase Auth 経由の Google OAuth。`middleware.ts` が `/student/*` と `/teacher/*` を保護し、未認証ユーザーを `/login` にリダイレクト。`/auth/callback` で認証コードをセッションに変換後 `/` へリダイレクト。ルートページ (`/`) で `teachers` → `students` の順にメール照合してロール判定・リダイレクト。どちらにも該当しない場合は「未登録」メッセージを表示（ログインループ防止）。

### 環境変数

`.env.local` に以下が必要:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### コアビジネスロジック

- **小テスト送信フロー**: クライアント側で即時採点（`quiz-logic.ts`）→ 結果表示 → Server Action (`quiz/actions.ts`) でサーバー側再検証・DB保存。合否判定は `grade_definitions.pass_score` に基づく。
- **グレード進級** (`grade-logic.ts`): 合格 + 本日未受験 → 連続日数+1 → 必要日数到達で昇級・リセット。不合格 → 連続日数を0にリセット。
- **日次制限**: 1日1回のみ成績記録に保存。`last_challenge_date` で判定。Asia/Tokyo タイムゾーン。
- **再受験**: `?retry=id1,id2,...` クエリパラメータで同じ問題セットを再生成。結果は保存しない。
- **選択肢シャッフル**: `ShuffledChoice.originalIndex` で元のインデックスを追跡。回答は `originalIndex`（0-based）で管理。DB上の `correct_answer` は 1-based。

### 教員機能（読み取り専用）

- **生徒一覧**: 全生徒を Server Component で取得し、JS でフィルタリング（学年/組/グレード範囲/氏名）。`searchParams` でフィルター状態を URL に保持。直近3日のスコアをテーブルに表示。
- **生徒詳細**: 直近30日の `quiz_records` から統計（総受験回数/平均点/最高点/合格率）を算出。`ScoreChart` を30日対応で再利用（`title`/`maxTicksLimit` props）。

### データベーステーブル（Supabase）

`students`、`teachers`、`grade_definitions`、`questions`、`quiz_records` — すべて RLS 有効。`students`/`teachers` テーブルへの登録は手動。メールアドレスで Google アカウントと紐付け。RLS ポリシーは `auth.jwt() ->> 'email'` でメール照合。教員は全生徒・全成績・全グレード定義を閲覧可能（RLS ポリシーで `teachers` テーブルの存在チェック）。スキーマの詳細は `PLAN.md` を参照。
