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
  current_grade TEXT NOT NULL DEFAULT 'Grade 1',
  consecutive_pass_days INTEGER NOT NULL DEFAULT 0,
  last_challenge_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### grade_definitions
```sql
CREATE TABLE grade_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_name TEXT UNIQUE NOT NULL,
  display_order INTEGER NOT NULL,
  start_id INTEGER NOT NULL,
  end_id INTEGER NOT NULL,
  num_questions INTEGER NOT NULL,
  pass_score INTEGER NOT NULL,
  required_consecutive_days INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### questions
```sql
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id INTEGER UNIQUE NOT NULL,
  question_text TEXT NOT NULL,
  choice_1 TEXT NOT NULL,
  choice_2 TEXT NOT NULL,
  choice_3 TEXT NOT NULL,
  choice_4 TEXT NOT NULL,
  correct_answer INTEGER NOT NULL CHECK (correct_answer BETWEEN 1 AND 4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### quiz_records
```sql
CREATE TABLE quiz_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
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
```

### RLS ポリシー概要

- **生徒**: `auth.jwt() ->> 'email'` で自分のデータのみ SELECT/UPDATE/INSERT
- **教員**: `teachers` テーブルにメールが存在すれば全テーブルを SELECT/INSERT/UPDATE/DELETE 可能
- **認証済みユーザー**: `grade_definitions` と `questions` を SELECT 可能

---

## デプロイ・インフラ状況

- **Vercel**: デプロイ済み。本番環境で稼働中。
- **Supabase**: 環境設定完了。本番用プロジェクトのテーブル・RLS ポリシー・認証（Google OAuth）すべて設定済み。

---

## 今後の候補（未着手）

優先度や実装順は未定。必要に応じて選択。

- **アクセシビリティ改善**: キーボード操作、スクリーンリーダー対応
- **パフォーマンス最適化**: ISR/キャッシュ戦略、画像最適化
