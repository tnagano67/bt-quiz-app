export const TEACHER = {
  email: process.env.E2E_TEACHER_EMAIL || "e2e-teacher@example.com",
  password: process.env.E2E_TEACHER_PASSWORD || "test-password-secure-123",
  name: "E2Eテスト教員",
};

export const STUDENT = {
  email: process.env.E2E_STUDENT_EMAIL || "e2e-student@example.com",
  password: process.env.E2E_STUDENT_PASSWORD || "test-password-secure-123",
  name: "E2Eテスト生徒",
  year: 1,
  class: 1,
  number: 99,
};

export const TEST_SUBJECT = {
  id: "e2e-test-subject-0001-0001-000000000001",
  name: "E2Eテスト科目",
  display_order: 9999,
};

export const GRADE_DEFINITION = {
  grade_name: "10級",
  display_order: 1,
  start_id: 9001,
  end_id: 9010,
  num_questions: 3,
  pass_score: 60,
  required_consecutive_days: 3,
  subject_id: TEST_SUBJECT.id,
};

export const TEST_QUESTIONS = Array.from({ length: 10 }, (_, i) => ({
  question_id: 9001 + i,
  question_text: `E2Eテスト問題${i + 1}`,
  choice_1: `選択肢A-${i + 1}`,
  choice_2: `選択肢B-${i + 1}`,
  choice_3: `選択肢C-${i + 1}`,
  choice_4: `選択肢D-${i + 1}`,
  correct_answer: 1,
  subject_id: TEST_SUBJECT.id,
}));

// テストで一時的に作成するデータの識別用
export const TEMP_QUESTION_ID_START = 9100;
export const TEMP_STUDENT_NUMBER = 98;
