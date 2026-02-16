# BT管理システム — 実装履歴・DBスキーマ・今後の計画

アーキテクチャ・コマンド・ビジネスロジック等の作業ガイドは `CLAUDE.md` を参照。

## Context

GAS（Google Apps Script）+ Google スプレッドシートで構築された教育機関向け小テスト・成績管理システム「BT管理システム」を、Next.js + TypeScript + Tailwind CSS + Supabase で再構築する。学習・練習目的のプロジェクト。

**元プロジェクト**: `/Users/nagano_takashi/dev/claude-code/claude-code-BT/`

---

## 実装フェーズ履歴

### Phase 1: プロジェクトセットアップ + DB + 認証 ✅

- Next.js 16 + TypeScript + Tailwind CSS 4 プロジェクト作成
- Supabase 接続（`@supabase/ssr` + `@supabase/supabase-js`）
- Google OAuth 認証（Supabase Auth 経由）
- ロール判定・認証ガード・未登録ユーザー対応

### Phase 2: 生徒ホーム画面 ✅

- 生徒情報カード、直近10日間の成績チャート、ナビゲーション

### Phase 3: 小テスト機能 ✅

- 問題シャッフル・選択肢シャッフル・即時採点・サーバー側再検証
- グレード進級ロジック・日次制限・結果表示

### Phase 4: 学習履歴 ✅

- 受験履歴一覧・再受験機能

### Phase 5: 仕上げ ✅

- `loading.tsx` / `error.tsx`・レスポンシブ対応・エッジケース対応

### Phase 6: 教員機能（閲覧） ✅

- 生徒一覧（フィルター・直近3日スコア）・生徒詳細（30日統計・チャート）
- ティール系カラーテーマ・RLS ポリシー

### Phase 7: 教員CRUD機能 ✅

- 問題管理（一覧・登録/編集/削除・CSVインポート）
- グレード定義管理（一覧・登録/編集/削除）
- 生徒登録・CSVインポート
- `verifyTeacher()` による教員権限チェック

### Phase 8: テスト ✅

- Vitest セットアップ（パスエイリアス対応）
- ユニットテスト: `quiz-logic`、`grade-logic`、`date-utils`、`csv-utils`

### Phase 9: 成績CSVエクスポート ✅

- `/teacher/export` エクスポートページ（Client Component）: 種別選択・フィルター・件数確認・ダウンロード
- `/api/teacher/export` Route Handler: BOM付きUTF-8 CSVダウンロード
- 2種類のエクスポート: 生徒一覧（統計付き）、受験記録詳細
- `generateCsvText` 関数（RFC 4180準拠、自動エスケープ）+ ユニットテスト
- `countExportRows` Server Action（`head: true` で軽量件数取得）
- TeacherHeader にナビ追加

---

## データベーススキーマ（Supabase）

すべて RLS 有効。

### teachers
```sql
CREATE TABLE teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### students
```sql
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  year INTEGER NOT NULL,
  class INTEGER NOT NULL,
  number INTEGER NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```
※ Phase 14 で `current_grade`, `consecutive_pass_days`, `last_challenge_date` を `student_subject_progress` テーブルに移行。

### grade_definitions
```sql
CREATE TABLE grade_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id),
  grade_name TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  start_id INTEGER NOT NULL,
  end_id INTEGER NOT NULL,
  num_questions INTEGER NOT NULL,
  pass_score INTEGER NOT NULL,
  required_consecutive_days INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (subject_id, grade_name),
  UNIQUE (subject_id, display_order)
);
```

### questions
```sql
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id),
  question_id INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  choice_1 TEXT NOT NULL,
  choice_2 TEXT NOT NULL,
  choice_3 TEXT NOT NULL,
  choice_4 TEXT NOT NULL,
  correct_answer INTEGER NOT NULL CHECK (correct_answer BETWEEN 1 AND 4),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (subject_id, question_id)
);
```

### quiz_records
```sql
CREATE TABLE quiz_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id),
  grade TEXT NOT NULL,
  score INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  question_ids JSONB NOT NULL,
  student_answers JSONB NOT NULL,
  correct_answers JSONB NOT NULL,
  taken_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_quiz_records_student_id ON quiz_records(student_id);
CREATE INDEX idx_quiz_records_taken_at ON quiz_records(taken_at DESC);
CREATE INDEX idx_quiz_records_subject_id ON quiz_records(subject_id);
```

### RLS ポリシー概要

- **生徒**: `auth.jwt() ->> 'email'` で自分のデータのみ SELECT/UPDATE/INSERT
- **教員**: `teachers` テーブルにメールが存在すれば全テーブルを SELECT/INSERT/UPDATE/DELETE 可能
- **認証済みユーザー**: `grade_definitions` と `questions` を SELECT 可能
- **`teachers` テーブルの SELECT**: `auth.role() = 'authenticated'`（認証済みユーザーなら読み取り可能）。ロール判定で `teachers` テーブル自体を参照するため、`EXISTS (SELECT 1 FROM teachers ...)` のような自己参照ポリシーでは循環が発生して誰も読めなくなる。そのため認証済みであれば読み取りを許可する設計。

---

## デプロイ・インフラ状況

- **Vercel**: デプロイ済み。本番環境で稼働中。
- **Supabase**: 環境設定完了。本番用プロジェクトのテーブル・RLS ポリシー・認証（Google OAuth）すべて設定済み。

### Phase 9.1: 教員管理機能 ✅

- 教員一覧（`/teacher/teachers`）・登録（`/teacher/teachers/new`）・削除
- 教員CSVインポート（`TeacherCsvImport`、upsert + `ignoreDuplicates`）
- `teachers` テーブルの RLS SELECTポリシーを `auth.role() = 'authenticated'` に修正（自己参照循環の回避）

### Phase 10: 教員ダッシュボード強化 ✅

- 概要統計カード（総生徒数・本日受験数・30日合格率・30日平均スコア）
- グレード分布横棒グラフ（`GradeDistributionChart`、Chart.js）
- 合格率推移折れ線グラフ（`PassRateTrendChart`、Chart.js、30日分）
- 最近の受験活動テーブル（直近10件、生徒名・グレード・スコア・合否・日時）
- 4つのSupabaseクエリを `Promise.all` で並列取得
- ダミーデータ生成用シードスクリプト（`scripts/seed-quiz-records.sql`）

### Phase 10.1: ダッシュボードバグ修正 ✅

- **合格率推移チャートにデータが表示されない問題を修正**:
  - `.gte("taken_at", ...)` フィルターにタイムゾーン（`T00:00:00+09:00`）を付与
  - Supabase の PostgREST 1000行制限を `.range()` ページネーションで回避（`fetchAllRecentRecords()`）
  - 統計・チャート用クエリは必要最小限のカラム（`taken_at`, `passed`, `score`）のみ取得
- **TeacherHeader の「ホーム」リンクが薄い問題を修正**: 三項演算子の優先順位バグを括弧で修正

### Phase 10.2: ダッシュボードUI改善 ✅

- 生徒クエリを `.range()` ページネーションで全件取得に修正
- グレード分布チャートをパーセント表示に変更
- 年・組フィルター追加（`StudentFilter` コンポーネント、URLパラメータ連動）
- 最近の受験活動テーブルを「頑張っている生徒」「サボっている生徒」リストに置き換え
  - 頑張っている生徒: 連続合格日数 > 0、上位5名
  - サボっている生徒: 本日未受験、最終受験日が古い順に5名
- 各リストに年/組/番の表示とヘッダー行を追加

### Phase 11: テスト拡充・リファクタリング ✅

- **バリデーションロジック抽出**: Server Actions 内のインライン検証コードを `src/lib/validation.ts` に一元化（`validateQuestionInput`、`validateStudentInput`、`validateTeacherInput`）
- **エクスポートロジック抽出**: Route Handler 内の統計計算・行フォーマット処理を `src/lib/export-utils.ts` に分離（`getGradeFilter`、`calculateStudentStats`、`formatStudentExportRow`、`formatRecordExportRow`）
- **採点ロジック分離**: `saveQuizResult()` 内のサーバー側再採点コードを `quiz-logic.ts` の `verifyScore()` 関数に抽出
- **テストモック基盤**: `src/test-utils/supabase-mock.ts` — Supabase クライアントのチェーン可能なモック工場（テーブル・操作ごとのレスポンス設定、動的切替対応）
- **ユニットテスト追加**: `validation.test.ts`（35件）、`export-utils.test.ts`（19件）、`quiz-logic.test.ts` に `verifyScore` テスト追加（6件）
- **Server Actions テスト追加**: `quiz/actions.test.ts`（7件）、`questions/actions.test.ts`（13件）— モック Supabase による統合テスト
- **Vitest 設定**: `.test.tsx` ファイルもテスト対象に含める

### Phase 11.1: テストカバレッジ拡充 ✅

- **残り Server Actions のテスト追加**:
  - `students/actions.test.ts`（14件）: `createStudent`（認証・権限・重複・成功・DBエラー）、`importStudents`（認証・バリデーション・挿入・更新・混合・エラー）
  - `grades/actions.test.ts`（16件）: `createGrade`（認証・重複・成功）、`updateGrade`（存在チェック・display_order衝突・成功・DBエラー）、`deleteGrade`（認証・存在チェック・成功・DBエラー）
  - `teachers/actions.test.ts`（16件）: `createTeacher`（認証・重複）、`importTeachers`（upsert・バリデーション・DBエラー）、`deleteTeacher`（自己削除防止・存在チェック・成功・DBエラー）
  - `export/actions.test.ts`（10件）: `countExportRows`（students/records フィルターなし/あり・不正type）、`getGradeNames`（認証・成功）
  - `questions/actions.test.ts` に `updateQuestion` テスト追加（3件）
- **モック技法**: 同一テーブルの select を連続で異なるレスポンスにする必要がある場合（`updateGrade`、`deleteTeacher`）、`from` のカスタム実装でコールカウントベースの分岐を使用
- **テスト総数**: 134 → 177件（+43件）。Phase 14.2 で 188件に拡充

### Phase 12: E2Eテスト（Playwright）導入 ✅

- **Playwright セットアップ**: `playwright.config.ts`、Chromium ブラウザ、`npm run test:e2e` / `test:e2e:ui` / `test:e2e:headed` スクリプト追加
- **認証戦略**: Google OAuth はブラウザ自動化できないため、Supabase Admin API（`service_role` キー）でテストユーザー作成 → `signInWithPassword()` でセッション取得 → `sb-<ref>-auth-token` クッキーとして storageState に保存
- **3プロジェクト構成**: `setup`（認証・シードデータ投入）→ `teacher`（教員テスト）/ `student`（生徒テスト）
- **テストデータ管理**: `e2e/helpers/seed.ts` で `service_role` クライアントを使い、テストデータの upsert・クリーンアップを実施。テスト用問題（ID 9001〜9010）、一時データ（ID 9100〜）を使用
- **教員テスト（10件）**: ダッシュボード表示・ナビ遷移、生徒一覧・新規登録、問題一覧・新規登録・CSVインポート、グレード一覧・新規登録、エクスポート件数確認・CSVダウンロード
- **生徒テスト（6件）**: ダッシュボード表示・ページ遷移、小テスト受験フロー（`beforeEach` で `last_challenge_date` リセット）・未回答制御、履歴表示
- **E2Eテスト総数**: 18件（setup 1 + teacher 11 + student 6）

### Phase 13: アクセシビリティ改善（WCAG AA 準拠） ✅

- **スキップナビゲーション**: 生徒/教員レイアウトに `sr-only focus:not-sr-only` スキップリンク追加、`<main id="main-content">` 付与
- **ナビゲーション aria-label**: `Header` / `TeacherHeader` の `<nav>` に `aria-label="メインナビゲーション"` 追加
- **フォームの label-input 関連付け**: 全7フォーム（`QuestionForm`、`StudentForm`、`GradeForm`、`TeacherForm`、`StudentFilter`、`DashboardFilter`、`export/page.tsx`）で `htmlFor`/`id` ペアを追加。正解ラジオ・エクスポート種別ラジオを `<fieldset>/<legend>` で囲む
- **エラー・通知の aria-live**: フォーム4種のエラーに `role="alert"`、CSVインポート3種のパースエラーに `role="alert"`・結果に `role="status"`、クイズの saveError に `role="alert"`
- **テーブル改善**: 全テーブル（`StudentTable`、`QuestionTable`、`GradeTable`、`teacher/teachers/page.tsx`、CSVインポート3種のプレビュー）の `<th>` に `scope="col"` 追加。空 `<th>` に `aria-label="操作"`
- **カラーコントラスト修正**: `text-gray-300` → `text-gray-500`、`text-yellow-600` → `text-yellow-700`、`text-gray-400` → `text-gray-500`（ヒントテキスト・閉じるボタン）
- **ドロップダウンメニュー ARIA + キーボード対応**: CSVインポート3種のトリガーに `aria-expanded`/`aria-haspopup`、メニューに `role="menu"`/`role="menuitem"`、Escape キーで閉じる
- **Pagination 改善**: `<nav aria-label="ページネーション">` でラップ、`aria-current="page"`、前へ/次へに `aria-label`、省略記号に `aria-hidden="true"`
- **キャンセルボタンの Link 化**: 4フォームの `<button onClick={router.push}>` → `<Link href>`（セマンティクス改善）
- **その他**: Google SVG に `aria-hidden="true"`、ログアウトボタンに `type="button"` 明示

### Phase 14: 複数科目対応 ✅

- **DBスキーマ変更**（`scripts/migrate-subjects.sql`）:
  - `subjects` テーブル新規作成（id, name, display_order）
  - `student_subject_progress` テーブル新規作成（student_id, subject_id, current_grade, consecutive_pass_days, last_challenge_date）— `students` テーブルから進捗カラムを分離
  - `grade_definitions`, `questions`, `quiz_records` に `subject_id` FK 追加
  - 複合 UNIQUE 制約: `(subject_id, grade_name)`, `(subject_id, display_order)`, `(subject_id, question_id)`
  - `students` テーブルから `current_grade`, `consecutive_pass_days`, `last_challenge_date` を削除
  - RLS ポリシー: `subjects` は認証済みユーザーが SELECT 可能・教員が全操作可能、`student_subject_progress` は生徒が自分の分のみ SELECT/UPDATE・教員が全操作可能
- **科目管理（教員側）**: `/teacher/subjects` — 一覧・登録・編集・削除（`SubjectTable`, `SubjectForm`）。科目作成時に全生徒分の `student_subject_progress` を自動作成（1000件単位バッチ）
- **生徒ホーム画面の科目対応**: `SubjectCard` グリッド表示（科目ごとの進捗・グレード・連続合格日数）。各カードから `/student/quiz?subject={subjectId}` へ遷移
- **小テスト受験の科目対応**: `?subject={subjectId}` パラメータ必須化。進捗チェック・更新を `student_subject_progress` に変更。グレード定義・問題セット取得に `subject_id` フィルタ追加
- **教員側の科目フィルタ**: 問題管理・グレード管理・生徒一覧・生徒詳細・ダッシュボード・エクスポートの全画面で `searchParams.subject` による科目切り替え。科目タブ UI
- **生徒管理の科目対応**: 生徒作成時に全科目分の `student_subject_progress` を自動作成。`StudentTable` は `progressMap` で科目別進捗を表示
- **エクスポートの科目対応**: 科目選択 UI 追加、`countExportRows` / Route Handler に `subjectId` フィルタ追加
- **型定義更新**: `Subject`, `StudentSubjectProgress` 型追加。`GradeDefinition`, `Question`, `QuizRecord` に `subject_id` 追加。`Student` から進捗カラム削除
- **バリデーション**: `validateSubjectInput()` 追加
- **テスト更新**: `quiz/actions.test.ts`, `questions/actions.test.ts`, `students/actions.test.ts`, `export-utils.test.ts` を `student_subject_progress` 対応に修正
- **TeacherHeader**: 「科目管理」ナビリンク追加

### Phase 14.1: バグ修正・生徒管理機能強化 ✅

- **CSV インポート重複エラー修正**: 同一CSVファイル内に同じ `question_id` が複数存在する場合、PostgreSQL の `ON CONFLICT DO UPDATE command cannot affect row a second time` エラーが発生していた問題を修正。upsert 前に `question_id` で重複排除（後勝ち）する処理を追加
- **グレード分布チャート表示不具合修正**: 生徒数が多い場合（1000件超）、`.in()` クエリが PostgREST の URL 長制限を超えてサイレントに失敗する問題を修正。フィルタなしの場合は `.range()` ページネーション、フィルタありの場合は `.in()` を200件バッチに分割
- **生徒の編集・削除機能追加**: `/teacher/students/[studentId]/edit` 編集ページ、`StudentForm` を編集モード対応（`initialData` + `studentId` props）、`StudentTable` に編集リンク・削除ボタン追加、`updateStudent` / `deleteStudent` Server Actions 追加

### Phase 14.2: E2Eテスト科目対応 + ユニットテスト追加 ✅

- **E2Eテストのシードデータ科目対応**: `e2e/fixtures/test-data.ts` に `TEST_SUBJECT`（固定UUID）を追加。`GRADE_DEFINITION`・`TEST_QUESTIONS` に `subject_id` 追加。`STUDENT` から `currentGrade` 削除
- **E2Eシードロジック更新** (`e2e/helpers/seed.ts`):
  - `seedTestData()`: 科目 upsert を最初に実行、グレード定義の `onConflict` を `subject_id,grade_name` に、問題の `onConflict` を `subject_id,question_id` に変更。生徒 upsert 後に `student_subject_progress` を upsert
  - `resetStudentChallengeDate()`: `students` テーブル → `student_subject_progress` テーブルの更新に変更
  - `cleanupTestData()`: テスト科目に紐づく一時グレード定義の削除を追加
- **教員テスト更新**: `questions.spec.ts` — 科目フィルタ `?subject=` に変更、新規登録で `select#question-subject` による科目選択を追加。`grades.spec.ts` — 新規登録で `select#grade-subject` による科目選択を追加
- **生徒テスト更新**: `dashboard.spec.ts` — 科目カード表示（`TEST_SUBJECT.name`、グレード、連続合格）の確認に変更、小テスト遷移は `?subject=` 付きURLを確認。`quiz.spec.ts` — `?subject=` 付きURLに変更。`history.spec.ts` — 科目移行に伴い「現在のグレード」アサーションを削除
- **ユニットテスト追加**: `students/actions.test.ts` に `updateStudent`（5件: 認証・権限・重複・成功・DBエラー）と `deleteStudent`（4件: 認証・権限・成功・DBエラー）のテストを追加
- **テスト総数**: ユニット 177 → 188件（+11件）、E2E 18件（変更なし）

---

## データベーススキーマ変更（Phase 14）

### subjects（新規）
```sql
CREATE TABLE subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_order INT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### student_subject_progress（新規）
```sql
CREATE TABLE student_subject_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  current_grade TEXT NOT NULL DEFAULT '',
  consecutive_pass_days INT NOT NULL DEFAULT 0,
  last_challenge_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, subject_id)
);
```

### 既存テーブル変更
- `grade_definitions`: `subject_id UUID NOT NULL REFERENCES subjects(id)` 追加、UNIQUE 制約を `(subject_id, grade_name)` と `(subject_id, display_order)` に変更
- `questions`: `subject_id UUID NOT NULL REFERENCES subjects(id)` 追加、UNIQUE 制約を `(subject_id, question_id)` に変更
- `quiz_records`: `subject_id UUID NOT NULL REFERENCES subjects(id)` 追加、インデックス追加
- `students`: `current_grade`, `consecutive_pass_days`, `last_challenge_date` カラム削除（`student_subject_progress` に移行）

---

## 今後の候補（未着手）

優先度や実装順は未定。必要に応じて選択。

- **パフォーマンス最適化**: ISR/キャッシュ戦略、画像最適化
- **教員一覧の編集機能**: 教員の名前・メール編集（現在は一覧・登録・削除のみ）
