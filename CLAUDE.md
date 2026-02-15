# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

BT管理システム — 教育機関向け小テスト・成績管理システム。元は GAS + Google スプレッドシートで構築されていたものを、モダンスタックで再構築。学習・練習目的。生徒機能（小テスト受験・履歴・成績チャート）と教員機能（生徒/問題/グレード定義のCRUD・成績ダッシュボード・CSVインポート）を実装済み。

実装フェーズの履歴・DBスキーマ(SQL)・今後の候補は `PLAN.md` を参照。

## 技術スタック

- **Next.js 16** App Router、`src/` ディレクトリ構成、TypeScript（strict mode）
- **React 19**
- **Tailwind CSS 4**（`@import "tailwindcss"` 構文、`@theme inline` でカスタムプロパティ定義 — `tailwind.config` ファイルなし）
- **Supabase**（`@supabase/ssr` でSSR対応認証、`@supabase/supabase-js` でDB操作）
- **Chart.js** + react-chartjs-2（成績チャート）
- **date-fns** + date-fns-tz（Asia/Tokyo タイムゾーン対応）
- **ESLint 9** flat config（`eslint.config.mjs`、`eslint-config-next/core-web-vitals` + `/typescript`）
- **Vitest** でユニットテスト
- **Vercel** でデプロイ

## コマンド

```bash
npm run dev          # 開発サーバー起動 (localhost:3000)
npm run build        # 本番ビルド（Turbopack）
npm run start        # 本番サーバー起動
npm run lint         # ESLint 実行
npm run test         # Vitest テスト一度実行
npm run test:watch   # Vitest ウォッチモード
npx vitest run src/lib/csv-utils.test.ts  # 単一テストファイル実行
```

テストファイルはソースファイルの隣に `*.test.ts` で配置（コロケーション方式）。

## アーキテクチャ

### ルーティング（App Router）

- `/` — ロール判定: 教員→`/teacher`、生徒→`/student`、未登録→メッセージ表示、未認証→`/login`
- `/login` — Google OAuth ログイン画面
- `/auth/callback` — OAuth コールバック（Route Handler）→ `/` へリダイレクトしてロール判定
- `/student` — 生徒ホーム（ダッシュボード）
- `/student/quiz` — 小テスト（Client Component、`Suspense` ラッパー）
- `/student/history` — 学習履歴・再受験
- `/teacher` — 教員ホーム
- `/teacher/students` — 生徒一覧（URLパラメータでフィルター）、CSVインポート
- `/teacher/students/new` — 生徒登録
- `/teacher/students/[studentId]` — 生徒詳細（30日統計・チャート）
- `/teacher/questions` — 問題一覧、CSVインポート
- `/teacher/questions/new` — 問題登録
- `/teacher/questions/[questionId]/edit` — 問題編集
- `/teacher/grades` — グレード定義一覧
- `/teacher/grades/new` — グレード定義登録
- `/teacher/grades/[gradeId]/edit` — グレード定義編集

各ルートに `loading.tsx`（スケルトンUI）と `error.tsx`（リトライボタン付き）を配置済み。

### ロール分離とカラーテーマ

- **生徒側**: 青系（`blue-600` 等）、`max-w-3xl` コンテナ
- **教員側**: ティール系（`teal-700` 等）、`max-w-5xl` コンテナ（テーブル用に広め）
- 各ロールは独立した `layout.tsx` と専用ヘッダー（`Header.tsx` / `TeacherHeader.tsx`）を持つ

### Server Component / Client Component の使い分け

- **Server Component**: ホーム画面、履歴、教員一覧/詳細ページ、テーブル系コンポーネント（`StudentTable`、`QuestionTable`、`GradeTable`）、表示系コンポーネント（`StudentInfoCard`、`QuizQuestion`、`QuizResult`、`HistoryItem`、`StatisticsCard`）
- **Client Component** (`"use client"`): クイズページ、ヘッダー（`usePathname`）、`ScoreChart`（Chart.js）、`StudentFilter`（URL パラメータ操作）、フォーム系（`QuestionForm`/`StudentForm`/`GradeForm`）、CSVインポート系（`CsvImport`/`StudentCsvImport`）、`Pagination`、ログイン画面

### 主要な lib モジュール

- `src/lib/supabase/` — Supabase クライアント: `client.ts`（ブラウザ用）、`server.ts`（SSR用・`cookies()` 使用）、`middleware.ts`（セッション更新・認証ガード）
- `src/lib/types/database.ts` — DB テーブルの型: `Student`, `Teacher`, `GradeDefinition`, `Question`, `QuizRecord`
- `src/lib/quiz-logic.ts` — `shuffleArray`（Fisher-Yates）、`shuffleChoices`、`gradeQuiz`
- `src/lib/grade-logic.ts` — `calculateGradeAdvancement`（連続日数・昇級判定）
- `src/lib/date-utils.ts` — `getTodayJST`、`getRecentDates`、`isTakenToday` 等（Asia/Tokyo）
- `src/lib/csv-utils.ts` — `parseCsvRows`（RFC 4180 準拠CSVパーサー、クォート内改行対応）
- `middleware.ts`（ルート） — `/student/*` と `/teacher/*` ルートの認証ガード

### Server Actions

- `src/app/student/quiz/actions.ts` — 小テスト結果保存（認証・本人確認・日次制限・サーバー側再採点・進級計算・DB保存）
- `src/app/teacher/questions/actions.ts` — 問題のCRUD + CSVインポート（upsert で一括処理）
- `src/app/teacher/students/actions.ts` — 生徒登録 + CSVインポート（新規挿入と既存更新を分離、`current_grade` 等は上書きしない）
- `src/app/teacher/grades/actions.ts` — グレード定義のCRUD（削除時に生徒の参照チェック）

全 Server Action で `verifyTeacher()` による教員権限チェックを実施。変更後は `revalidatePath` でキャッシュを無効化。

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
- **CSVインポート**: `parseCsvRows`（`csv-utils.ts`）でパース → クライアント側バリデーション+プレビュー → Server Action で DB 保存。問題は upsert、生徒は新規挿入と既存更新を分離。UTF-8/Shift_JIS 自動判定。

### データベース（Supabase）

テーブル: `students`、`teachers`、`grade_definitions`、`questions`、`quiz_records` — すべて RLS 有効。メールアドレスで Google アカウントと紐付け。RLS ポリシーは `auth.jwt() ->> 'email'` でメール照合。教員は全テーブルを閲覧・編集可能（`teachers` テーブルの存在チェック）。スキーマの SQL 定義は `PLAN.md` を参照。
