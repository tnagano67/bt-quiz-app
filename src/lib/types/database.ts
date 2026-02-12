export type Student = {
  id: string;
  email: string;
  year: number;
  class: number;
  number: number;
  name: string;
  current_grade: string;
  consecutive_pass_days: number;
  last_challenge_date: string | null;
  created_at: string;
  updated_at: string;
};

export type GradeDefinition = {
  id: string;
  grade_name: string;
  display_order: number;
  start_id: number;
  end_id: number;
  num_questions: number;
  pass_score: number;
  required_consecutive_days: number;
  created_at: string;
};

export type Question = {
  id: string;
  question_id: number;
  question_text: string;
  choice_1: string;
  choice_2: string;
  choice_3: string;
  choice_4: string;
  correct_answer: number;
  created_at: string;
};

export type QuizRecord = {
  id: string;
  student_id: string;
  grade: string;
  score: number;
  passed: boolean;
  question_ids: number[];
  student_answers: number[];
  correct_answers: number[];
  taken_at: string;
};
