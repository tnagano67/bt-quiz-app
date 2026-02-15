type ValidationResult = {
  valid: boolean;
  error?: string;
};

type QuestionRow = {
  question_id: number;
  question_text: string;
  choice_1: string;
  choice_2: string;
  choice_3: string;
  choice_4: string;
  correct_answer: number;
};

type StudentRow = {
  email: string;
  year: number;
  class: number;
  number: number;
  name: string;
};

type TeacherRow = {
  email: string;
  name: string;
};

export function validateQuestionInput(
  row: QuestionRow,
  rowNum?: number
): ValidationResult {
  const prefix = rowNum != null ? `行${rowNum}: ` : "";

  if (!Number.isInteger(row.question_id) || row.question_id < 1) {
    return {
      valid: false,
      error: `${prefix}question_id が不正です（正の整数が必要）`,
    };
  }
  if (
    !Number.isInteger(row.correct_answer) ||
    row.correct_answer < 1 ||
    row.correct_answer > 4
  ) {
    return {
      valid: false,
      error: `${prefix}correct_answer は1〜4の整数が必要です`,
    };
  }
  if (
    !row.question_text.trim() ||
    !row.choice_1.trim() ||
    !row.choice_2.trim() ||
    !row.choice_3.trim() ||
    !row.choice_4.trim()
  ) {
    return { valid: false, error: `${prefix}空のフィールドがあります` };
  }
  return { valid: true };
}

export function validateStudentInput(
  row: StudentRow,
  rowNum?: number
): ValidationResult {
  const prefix = rowNum != null ? `行${rowNum}: ` : "";

  if (!row.email.trim()) {
    return { valid: false, error: `${prefix}メールアドレスが空です` };
  }
  if (!Number.isInteger(row.year) || row.year < 1 || row.year > 3) {
    return {
      valid: false,
      error: `${prefix}学年は1〜3の整数が必要です`,
    };
  }
  if (!Number.isInteger(row.class) || row.class < 1 || row.class > 10) {
    return {
      valid: false,
      error: `${prefix}組は1〜10の整数が必要です`,
    };
  }
  if (!Number.isInteger(row.number) || row.number < 1) {
    return {
      valid: false,
      error: `${prefix}番号は正の整数が必要です`,
    };
  }
  if (!row.name.trim()) {
    return { valid: false, error: `${prefix}氏名が空です` };
  }
  return { valid: true };
}

export function validateTeacherInput(
  row: TeacherRow,
  rowNum?: number
): ValidationResult {
  const prefix = rowNum != null ? `行${rowNum}: ` : "";

  if (!row.email.trim()) {
    return { valid: false, error: `${prefix}メールアドレスが空です` };
  }
  if (!row.name.trim()) {
    return { valid: false, error: `${prefix}氏名が空です` };
  }
  return { valid: true };
}
