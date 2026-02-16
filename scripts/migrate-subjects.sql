-- ============================================================
-- 複数科目対応マイグレーション
-- Supabase SQL Editor で実行
-- ============================================================

-- 1. subjects テーブル新規作成
CREATE TABLE subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_order INT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- デフォルト科目「英語」を挿入
INSERT INTO subjects (name, display_order) VALUES ('英語', 1);

-- 2. grade_definitions に subject_id を追加
ALTER TABLE grade_definitions ADD COLUMN subject_id UUID REFERENCES subjects(id);

-- 既存データにデフォルト科目を設定
UPDATE grade_definitions SET subject_id = (SELECT id FROM subjects WHERE name = '英語');

-- NOT NULL 制約を追加
ALTER TABLE grade_definitions ALTER COLUMN subject_id SET NOT NULL;

-- 既存の UNIQUE 制約を削除して新しい制約を追加
ALTER TABLE grade_definitions DROP CONSTRAINT IF EXISTS grade_definitions_grade_name_key;
ALTER TABLE grade_definitions DROP CONSTRAINT IF EXISTS grade_definitions_display_order_key;
ALTER TABLE grade_definitions ADD CONSTRAINT grade_definitions_subject_grade_name_unique UNIQUE (subject_id, grade_name);
ALTER TABLE grade_definitions ADD CONSTRAINT grade_definitions_subject_display_order_unique UNIQUE (subject_id, display_order);

-- 3. questions に subject_id を追加
ALTER TABLE questions ADD COLUMN subject_id UUID REFERENCES subjects(id);

UPDATE questions SET subject_id = (SELECT id FROM subjects WHERE name = '英語');

ALTER TABLE questions ALTER COLUMN subject_id SET NOT NULL;

-- 既存の UNIQUE 制約を変更
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_question_id_key;
ALTER TABLE questions ADD CONSTRAINT questions_subject_question_id_unique UNIQUE (subject_id, question_id);

-- 4. quiz_records に subject_id を追加
ALTER TABLE quiz_records ADD COLUMN subject_id UUID REFERENCES subjects(id);

UPDATE quiz_records SET subject_id = (SELECT id FROM subjects WHERE name = '英語');

ALTER TABLE quiz_records ALTER COLUMN subject_id SET NOT NULL;

CREATE INDEX idx_quiz_records_subject_id ON quiz_records(subject_id);

-- 5. student_subject_progress テーブル新規作成
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

-- 既存 students データから student_subject_progress にマイグレーション
INSERT INTO student_subject_progress (student_id, subject_id, current_grade, consecutive_pass_days, last_challenge_date)
SELECT
  s.id,
  (SELECT id FROM subjects WHERE name = '英語'),
  s.current_grade,
  s.consecutive_pass_days,
  s.last_challenge_date
FROM students s;

-- 6. students テーブルから不要カラムを削除
ALTER TABLE students DROP COLUMN current_grade;
ALTER TABLE students DROP COLUMN consecutive_pass_days;
ALTER TABLE students DROP COLUMN last_challenge_date;

-- ============================================================
-- RLS ポリシー設定
-- ============================================================

-- subjects テーブル
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- 認証済みユーザーはSELECT可能
CREATE POLICY "Authenticated users can view subjects"
  ON subjects FOR SELECT
  TO authenticated
  USING (true);

-- 教員は全操作可能
CREATE POLICY "Teachers can manage subjects"
  ON subjects FOR ALL
  USING (
    EXISTS (SELECT 1 FROM teachers WHERE email = auth.jwt() ->> 'email')
  );

-- student_subject_progress テーブル
ALTER TABLE student_subject_progress ENABLE ROW LEVEL SECURITY;

-- 生徒は自分のレコードのみSELECT可能
CREATE POLICY "Students can view own progress"
  ON student_subject_progress FOR SELECT
  USING (
    student_id IN (SELECT id FROM students WHERE email = auth.jwt() ->> 'email')
  );

-- 生徒は自分のレコードをUPDATE可能
CREATE POLICY "Students can update own progress"
  ON student_subject_progress FOR UPDATE
  USING (
    student_id IN (SELECT id FROM students WHERE email = auth.jwt() ->> 'email')
  );

-- 教員は全操作可能
CREATE POLICY "Teachers can manage student_subject_progress"
  ON student_subject_progress FOR ALL
  USING (
    EXISTS (SELECT 1 FROM teachers WHERE email = auth.jwt() ->> 'email')
  );
