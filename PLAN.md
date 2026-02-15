# BT管理システム Next.js リビルド計画

## Context

GAS（Google Apps Script）+ Google スプレッドシートで構築された教育機関向け小テスト・成績管理システム「BT管理システム」を、Next.js + TypeScript + Tailwind CSS + Supabase で再構築する。学習・練習目的のプロジェクト。

**元プロジェクト**: `/Users/nagano_takashi/dev/claude-code/claude-code-BT/`
**新プロジェクト**: `/Users/nagano_takashi/dev/claude-code/bt-quiz-app/`

---

## 実装済み機能

### Phase 1: プロジェクトセットアップ + DB + 認証 ✅

- Next.js 16 + TypeScript + Tailwind CSS 4 プロジェクト作成
- Supabase 接続（`@supabase/ssr` + `@supabase/supabase-js`）
- Google OAuth 認証（Supabase Auth 経由）
- メールアドレスで `teachers` → `students` の順にロール判定
- `/student/*` と `/teacher/*` の認証ガード（middleware）
- 未登録ユーザーへのメッセージ表示（ログインループ防止）

### Phase 2: 生徒ホーム画面 ✅

- 生徒情報カード（年/組/番号、氏名、グレード、連続合格日数）
- 直近10日間の成績チャート（Chart.js、合格=緑/不合格=赤）
- 「小テストを受ける」「履歴を見る」ナビゲーション

### Phase 3: 小テスト機能 ✅

- グレード範囲から問題取得・Fisher-Yates シャッフル
- 選択肢シャッフル（`originalIndex` で追跡）
- クライアント側即時採点 → Server Action でサーバー側再検証・DB保存
- グレード進級ロジック（連続日数・昇級判定）
- 日次制限（1日1回、Asia/Tokyo）
- 結果表示（スコア、合否、正誤詳細、進級情報）

### Phase 4: 学習履歴 ✅

- 直近の受験履歴一覧（日付、グレード、スコア、合否）
- 再受験機能（`?retry=id1,id2,...` で同じ問題セット、結果は保存しない）

### Phase 5: 仕上げ ✅

- 各ルートに `loading.tsx`（スケルトンUI）と `error.tsx`（リトライボタン付き）
- レスポンシブ対応（モバイル最適化）
- エッジケース対応（最上級グレード到達、未登録ユーザー）

### Phase 6: 教員機能 ✅

- 教員ホーム（`/teacher`）
- 生徒一覧（`/teacher/students`）— 学年/組/グレード範囲/氏名フィルター、直近3日スコア表示
- 生徒詳細（`/teacher/students/[studentId]`）— 30日統計（受験回数/平均点/最高点/合格率）+ チャート
- ティール系カラーテーマ、専用ヘッダー・レイアウト
- RLS ポリシーで教員の閲覧権限を制御

---

## データベーススキーマ（Supabase）

すべて RLS 有効。`students`/`teachers` テーブルへの登録は手動。

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
- **教員**: `teachers` テーブルにメールが存在すれば全生徒・全成績・全グレード定義を SELECT 可能
- **認証済みユーザー**: `grade_definitions` と `questions` を SELECT 可能

---

## ファイル構成

```
bt-quiz-app/
  middleware.ts                          # 認証ガード（/student/*, /teacher/*）
  src/
    app/
      layout.tsx                         # ルートレイアウト
      page.tsx                           # ロール判定 → リダイレクト
      globals.css                        # Tailwind CSS 4
      error.tsx                          # グローバルエラー
      login/page.tsx                     # Google OAuth ログイン画面
      auth/callback/route.ts             # OAuth コールバック → / へリダイレクト
      student/
        layout.tsx                       # 生徒レイアウト（Header）
        page.tsx                         # ホーム（生徒情報 + チャート）
        loading.tsx / error.tsx
        quiz/
          page.tsx                       # 小テスト（Client Component）
          actions.ts                     # Server Actions（結果保存・進級）
          loading.tsx
        history/
          page.tsx                       # 学習履歴・再受験
          loading.tsx
      teacher/
        layout.tsx                       # 教員レイアウト（TeacherHeader）
        page.tsx                         # 教員ホーム
        loading.tsx / error.tsx
        students/
          page.tsx                       # 生徒一覧（フィルター付き）
          loading.tsx
          [studentId]/
            page.tsx                     # 生徒詳細（統計 + チャート）
            loading.tsx
    components/
      Header.tsx                         # 生徒用ナビヘッダー（Client）
      TeacherHeader.tsx                  # 教員用ナビヘッダー（Client）
      StudentInfoCard.tsx                # 生徒情報カード
      ScoreChart.tsx                     # 成績チャート（Client, Chart.js）
      QuizQuestion.tsx                   # 問題表示
      QuizResult.tsx                     # 結果表示
      HistoryItem.tsx                    # 履歴1行
      StatisticsCard.tsx                 # 統計カード（教員用）
      StudentFilter.tsx                  # 生徒フィルター（Client）
      StudentTable.tsx                   # 生徒テーブル（教員用）
    lib/
      supabase/
        client.ts                        # ブラウザ用クライアント
        server.ts                        # サーバー用クライアント
        middleware.ts                    # セッション更新ヘルパー
      types/database.ts                  # DB型定義
      quiz-logic.ts                      # 問題取得・シャッフル・採点
      grade-logic.ts                     # グレード進級ロジック
      date-utils.ts                      # 日付ユーティリティ（Asia/Tokyo）
```

---

## コアビジネスロジック

### グレード進級
- 合格 + 本日未受験 → 連続日数+1 → 必要日数到達で昇級・リセット
- 不合格 → 連続日数を0にリセット
- 最上級グレード → 進級なし

### 日次制限
- 1日1回のみ成績記録に保存（`last_challenge_date` で判定）
- Asia/Tokyo タイムゾーン

### 問題シャッフル
- Fisher-Yates アルゴリズム
- グレードの問題ID範囲からランダム選択
- 選択肢もシャッフル（`originalIndex` で追跡）

### 採点
- クライアント側で即時フィードバック + サーバー側で検証して保存
- DB上の `correct_answer` は 1-based、回答は `originalIndex`（0-based）で管理

---

## デプロイ・インフラ状況

- **Vercel**: デプロイ済み。本番環境で稼働中。
- **Supabase**: 環境設定完了。本番用プロジェクトのテーブル・RLS ポリシー・認証（Google OAuth）すべて設定済み。

---

## 今後の候補（未着手）

優先度や実装順は未定。必要に応じて選択。

- **テストフレームワーク導入**: Vitest + React Testing Library でユニットテスト・コンポーネントテスト
- **成績エクスポート**: CSV/Excel ダウンロード
- **アクセシビリティ改善**: キーボード操作、スクリーンリーダー対応
- **パフォーマンス最適化**: ISR/キャッシュ戦略、画像最適化
