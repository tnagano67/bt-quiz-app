# BT管理システム Next.js リビルド計画

## Context

GAS（Google Apps Script）+ Google スプレッドシートで構築された教育機関向け小テスト・成績管理システム「BT管理システム」を、Next.js + TypeScript + Tailwind CSS + Supabase で再構築する。学習・練習目的のプロジェクト。

**元プロジェクト**: `/Users/nagano_takashi/dev/claude-code/claude-code-BT/`
**新プロジェクト**: `/Users/nagano_takashi/dev/claude-code/bt-quiz-app/`

### ユーザー決定事項
- 新規 Next.js プロジェクトを作成
- 新規 Supabase プロジェクトを作成
- Google OAuth（Supabase Auth経由）で認証、メールアドレスで生徒を直接照合
- **生徒機能から先に実装**（教員機能は後日）
- 問題データもSupabaseに保存

---

## Phase 1: プロジェクトセットアップ + DB + 認証

### 1-1. Next.js プロジェクト作成 ✅ 完了

```bash
cd /Users/nagano_takashi/dev/claude-code/
npx create-next-app@latest bt-quiz-app \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --no-react-compiler
```

### 1-2. 追加パッケージ ✅ 完了

```bash
npm install @supabase/ssr @supabase/supabase-js chart.js react-chartjs-2 date-fns date-fns-tz
```

- `@supabase/ssr`: SSR対応の認証ヘルパー
- `chart.js` + `react-chartjs-2`: 成績チャート
- `date-fns` + `date-fns-tz`: Asia/Tokyo タイムゾーン対応

### 1-3. Supabase 新規プロジェクト作成（手動）

ユーザーが Supabase ダッシュボードで実施:
1. 新しいプロジェクトを作成
2. Project URL と anon key を取得
3. `.env.local` に設定

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 1-4. データベーステーブル作成

Supabase SQL Editor で実行する SQL:

**students** - 生徒情報（GAS「生徒名簿」相当）
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
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can read own data" ON students FOR SELECT USING (email = auth.jwt() ->> 'email');
CREATE POLICY "Students can update own data" ON students FOR UPDATE USING (email = auth.jwt() ->> 'email');
```

**grade_definitions** - グレード定義（GAS「グレード定義」相当）
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
ALTER TABLE grade_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read" ON grade_definitions FOR SELECT USING (auth.role() = 'authenticated');
```

**questions** - 問題データ（GAS「問題データ」相当）
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
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read" ON questions FOR SELECT USING (auth.role() = 'authenticated');
```

**quiz_records** - 成績記録（GAS「成績記録」相当）
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
ALTER TABLE quiz_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can read own records" ON quiz_records FOR SELECT
  USING (student_id IN (SELECT id FROM students WHERE email = auth.jwt() ->> 'email'));
CREATE POLICY "Students can insert own records" ON quiz_records FOR INSERT
  WITH CHECK (student_id IN (SELECT id FROM students WHERE email = auth.jwt() ->> 'email'));

CREATE INDEX idx_quiz_records_student_id ON quiz_records(student_id);
CREATE INDEX idx_quiz_records_taken_at ON quiz_records(taken_at DESC);
```

### 1-5. Google OAuth 設定（手動）

ユーザーが実施:
1. Supabase Dashboard > Authentication > Providers > Google を有効化
2. Google Cloud Console で OAuth 2.0 クライアント作成
3. Client ID / Secret を Supabase に登録
4. Redirect URL を設定

### 1-6. 認証関連ファイル作成

| ファイル | 役割 |
|---------|------|
| `src/lib/supabase/client.ts` | ブラウザ用クライアント (`createBrowserClient`) |
| `src/lib/supabase/server.ts` | サーバー用クライアント (`createServerClient`) |
| `src/lib/supabase/middleware.ts` | セッション更新ヘルパー |
| `middleware.ts` | 認証ガード（/student/* は要ログイン） |
| `src/app/auth/callback/route.ts` | OAuth コールバック処理 |
| `src/app/login/page.tsx` | ログイン画面（Googleログインボタン） |
| `src/lib/types/database.ts` | Supabase テーブル型定義 |

### 1-7. テストデータ投入

```sql
-- グレード定義（サンプル5段階）
INSERT INTO grade_definitions (grade_name, display_order, start_id, end_id, num_questions, pass_score, required_consecutive_days) VALUES
  ('Grade 1', 1, 1, 50, 10, 80, 3),
  ('Grade 2', 2, 51, 100, 10, 80, 3),
  ('Grade 3', 3, 101, 150, 15, 80, 5),
  ('Grade 4', 4, 151, 200, 15, 85, 5),
  ('Grade 5', 5, 201, 250, 20, 85, 7);

-- サンプル問題（Grade 1 用に最低10問）
INSERT INTO questions (question_id, question_text, choice_1, choice_2, choice_3, choice_4, correct_answer) VALUES
  (1, 'appleの意味は？', 'りんご', 'みかん', 'ぶどう', 'もも', 1),
  (2, 'bookの意味は？', '鉛筆', '本', 'ノート', '消しゴム', 2),
  (3, 'catの意味は？', '犬', '鳥', '猫', '魚', 3),
  (4, 'dogの意味は？', '犬', '猫', '鳥', '馬', 1),
  (5, 'eggの意味は？', 'パン', '牛乳', 'バター', '卵', 4),
  (6, 'fishの意味は？', '肉', '魚', '野菜', '果物', 2),
  (7, 'girlの意味は？', '男の子', '女の子', '大人', '赤ちゃん', 2),
  (8, 'houseの意味は？', '学校', '公園', '家', '病院', 3),
  (9, 'inkの意味は？', '紙', 'ペン', '鉛筆', 'インク', 4),
  (10, 'juiceの意味は？', 'ジュース', '水', 'お茶', 'コーヒー', 1),
  (11, 'kingの意味は？', '女王', '王子', '王', '姫', 3),
  (12, 'lionの意味は？', '虎', 'ライオン', '熊', '象', 2);
```

**Phase 1 完了条件:** Google OAuth でログインでき、メールアドレスで生徒が特定され `/student` にリダイレクトされる

---

## Phase 2: 生徒ホーム画面

### 作成ファイル
| ファイル | 役割 |
|---------|------|
| `src/app/student/layout.tsx` | 生徒用レイアウト（ヘッダー + ナビ） |
| `src/app/student/page.tsx` | ホーム画面（Server Component） |
| `src/components/Header.tsx` | ナビゲーションヘッダー |
| `src/components/StudentInfoCard.tsx` | 生徒情報カード |
| `src/components/ScoreChart.tsx` | 成績棒グラフ（`"use client"`） |
| `src/lib/date-utils.ts` | 日付ユーティリティ |

### 表示内容（GAS版 `renderHome()` 相当）
- 生徒名（年/組/番号 + 氏名）
- 現在のグレード、連続合格日数
- 次のグレード、必要残日数
- 本日の受験状態
- 直近10日間の成績チャート（合格=緑、不合格=赤の棒グラフ）
- 「小テストを受ける」「履歴を見る」ボタン

### データ取得
Server Component で Supabase サーバークライアントを使用:
1. `students` テーブルから生徒情報
2. `grade_definitions` から現在/次グレード情報
3. `quiz_records` から直近10日間の成績

### 移植元
- GAS: `studentService.js` の `getStudentDashboard()` (L32-82)
- UI: `studentScript.html` の `renderHome()`, `renderScoreChart()`
- スタイル: `studentStyle.html` の色変数・レイアウト → Tailwind CSS に変換

**Phase 2 完了条件:** ホーム画面に生徒情報と成績チャートが表示される

---

## Phase 3: 小テスト機能

### 作成ファイル
| ファイル | 役割 |
|---------|------|
| `src/app/student/quiz/page.tsx` | クイズ画面（`"use client"`） |
| `src/app/student/quiz/actions.ts` | Server Actions（結果保存・グレード進級） |
| `src/components/QuizQuestion.tsx` | 個別問題コンポーネント |
| `src/components/QuizResult.tsx` | 結果表示モーダル |
| `src/lib/quiz-logic.ts` | 問題取得・シャッフル・採点 |
| `src/lib/grade-logic.ts` | グレード進級計算 |

### ビジネスロジック移植

| GAS関数 | 新ファイル | 内容 |
|---------|-----------|------|
| `getQuizData()` | `quiz-logic.ts` | グレード範囲で問題取得、シャッフル |
| `evaluateQuiz()` | `quiz-logic.ts` | 回答と正解を比較、スコア計算 |
| `saveResult()` | `actions.ts` | Server Action: 成績保存 + グレード進級 |
| `calculateGradeAdvancement_()` | `grade-logic.ts` | 連続日数・グレード昇級計算 |
| `isAlreadyLoggedToday()` | `date-utils.ts` | 本日受験済みチェック |
| `shuffleArray_()` | `quiz-logic.ts` | Fisher-Yatesシャッフル |

### UIフロー
1. ページアクセス → 日次制限チェック → 問題取得・表示
2. ラジオボタンで回答選択
3. 「回答を送信」→ クライアント側で即時採点表示
4. Server Action で結果保存 + グレード進級処理
5. 結果モーダル（スコア、合否、正誤詳細、進級情報）
6. 「ホームに戻る」「もう一度受ける」

### 重要な設計判断
- **採点**: クライアント側で即時表示 + サーバー側で検証して保存
- **日次制限**: Server Action で再チェック（改ざん防止）
- **選択肢シャッフル**: クライアント側で実行（GAS版と同様）

**Phase 3 完了条件:** 小テスト受験→採点→保存→グレード進級が正常動作

---

## Phase 4: 学習履歴

### 作成ファイル
| ファイル | 役割 |
|---------|------|
| `src/app/student/history/page.tsx` | 履歴画面 |
| `src/components/HistoryItem.tsx` | 履歴1行コンポーネント |

### 表示内容（GAS版 `renderHistory()` 相当）
- 生徒情報サマリー（名前、グレード、連続日数、総受験回数、合格率）
- 直近10件の受験履歴（日付、グレード、スコア、合否）
- 各履歴の「再受験」ボタン

### 再受験機能
- 履歴の `question_ids` を使って同じ問題セットでクイズ生成
- `/student/quiz?retry=問題ID1,問題ID2,...` のようにクエリパラメータで実現
- 再受験結果は保存しない（GAS版と同様の仕様）

### 移植元
- GAS: `studentService.js` の `getStudentHistory()`, `getQuizByIds()`
- UI: `studentScript.html` の `renderHistory()`, `retryQuiz()`

**Phase 4 完了条件:** 履歴表示と再受験機能が動作する

---

## Phase 5: 仕上げ・デプロイ

1. **レスポンシブ対応**: モバイル最適化（Tailwind のブレークポイント活用）
2. **ローディングUI**: `loading.tsx` ファイルで読み込み中表示
3. **エラーハンドリング**: `error.tsx` でエラー表示
4. **エッジケース**: 最上級グレード到達、未登録ユーザー
5. **GitHub push** + **Vercel デプロイ**（任意）

---

## ファイル構成まとめ

```
bt-quiz-app/
  src/
    app/
      layout.tsx
      page.tsx                     # / → /login or /student にリダイレクト
      globals.css
      login/page.tsx               # ログイン画面
      auth/callback/route.ts       # OAuth コールバック
      student/
        layout.tsx                 # 生徒レイアウト（Header含む）
        page.tsx                   # ホーム画面
        quiz/
          page.tsx                 # 小テスト画面
          actions.ts               # Server Actions（結果保存）
        history/page.tsx           # 学習履歴
    components/
      Header.tsx
      StudentInfoCard.tsx
      ScoreChart.tsx
      QuizQuestion.tsx
      QuizResult.tsx
      HistoryItem.tsx
      LoginButton.tsx
    lib/
      supabase/
        client.ts                  # ブラウザ用
        server.ts                  # サーバー用
        middleware.ts
      types/database.ts            # DB型定義
      quiz-logic.ts                # 問題取得・採点
      grade-logic.ts               # グレード進級
      date-utils.ts                # 日付処理
  middleware.ts                    # 認証ミドルウェア
  .env.local
```

---

## 検証方法

各Phase完了時に以下を確認:

1. **Phase 1**: ブラウザで `/login` → Googleログイン → `/student` にリダイレクトされる
2. **Phase 2**: `/student` で生徒情報と成績チャートが表示される
3. **Phase 3**: `/student/quiz` で小テスト受験→採点→保存→グレード進級が動作。翌日の再受験可能確認
4. **Phase 4**: `/student/history` で履歴一覧表示、再受験ボタンが動作
5. **Phase 5**: `npm run build` 成功、Vercelデプロイ成功

---

## GAS版からの主要ビジネスロジック

### グレード進級ロジック
- 合格 かつ 本日未受験 → 連続日数 +1
- 連続日数 >= 必要日数 かつ 最上級でない → 次グレードに昇格、連続日数リセット
- 不合格 → 連続日数リセット (0)
- 最上級グレード → 進級なし

### 日次制限
- 1日1回のみ成績記録に保存
- Asia/Tokyo タイムゾーンで日付判定

### 問題シャッフル
- Fisher-Yates アルゴリズム
- グレードの問題ID範囲からランダム選択
- 選択肢もシャッフル

### 再受験
- 履歴の question_ids を使って同じ問題セットを再生成
- 結果は保存しない
