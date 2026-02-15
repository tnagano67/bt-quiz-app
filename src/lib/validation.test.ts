import { describe, it, expect } from "vitest";
import {
  validateQuestionInput,
  validateStudentInput,
  validateTeacherInput,
} from "./validation";

describe("validateQuestionInput", () => {
  const validRow = {
    question_id: 1,
    question_text: "テスト問題",
    choice_1: "選択肢A",
    choice_2: "選択肢B",
    choice_3: "選択肢C",
    choice_4: "選択肢D",
    correct_answer: 1,
  };

  it("正常な入力 → valid", () => {
    expect(validateQuestionInput(validRow)).toEqual({ valid: true });
  });

  it("correct_answer が 4 → valid", () => {
    expect(validateQuestionInput({ ...validRow, correct_answer: 4 })).toEqual({
      valid: true,
    });
  });

  it("question_id が 0 → invalid", () => {
    const result = validateQuestionInput({ ...validRow, question_id: 0 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("question_id");
  });

  it("question_id が負数 → invalid", () => {
    const result = validateQuestionInput({ ...validRow, question_id: -1 });
    expect(result.valid).toBe(false);
  });

  it("question_id が小数 → invalid", () => {
    const result = validateQuestionInput({ ...validRow, question_id: 1.5 });
    expect(result.valid).toBe(false);
  });

  it("correct_answer が 0 → invalid", () => {
    const result = validateQuestionInput({ ...validRow, correct_answer: 0 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("correct_answer");
  });

  it("correct_answer が 5 → invalid", () => {
    const result = validateQuestionInput({ ...validRow, correct_answer: 5 });
    expect(result.valid).toBe(false);
  });

  it("question_text が空 → invalid", () => {
    const result = validateQuestionInput({ ...validRow, question_text: "  " });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("空のフィールド");
  });

  it("choice_3 が空 → invalid", () => {
    const result = validateQuestionInput({ ...validRow, choice_3: "" });
    expect(result.valid).toBe(false);
  });

  it("rowNum を指定すると行番号がエラーに含まれる", () => {
    const result = validateQuestionInput({ ...validRow, question_id: 0 }, 3);
    expect(result.error).toContain("行3:");
  });

  it("rowNum なしではプレフィックスがない", () => {
    const result = validateQuestionInput({ ...validRow, question_id: 0 });
    expect(result.error).not.toContain("行");
  });
});

describe("validateStudentInput", () => {
  const validRow = {
    email: "student@example.com",
    year: 2,
    class: 3,
    number: 15,
    name: "田中太郎",
  };

  it("正常な入力 → valid", () => {
    expect(validateStudentInput(validRow)).toEqual({ valid: true });
  });

  it("email が空 → invalid", () => {
    const result = validateStudentInput({ ...validRow, email: "" });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("メールアドレス");
  });

  it("email が空白のみ → invalid", () => {
    const result = validateStudentInput({ ...validRow, email: "  " });
    expect(result.valid).toBe(false);
  });

  it("year が 0 → invalid", () => {
    const result = validateStudentInput({ ...validRow, year: 0 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("学年");
  });

  it("year が 4 → invalid", () => {
    const result = validateStudentInput({ ...validRow, year: 4 });
    expect(result.valid).toBe(false);
  });

  it("year が 1 → valid", () => {
    expect(validateStudentInput({ ...validRow, year: 1 }).valid).toBe(true);
  });

  it("year が 3 → valid", () => {
    expect(validateStudentInput({ ...validRow, year: 3 }).valid).toBe(true);
  });

  it("class が 0 → invalid", () => {
    const result = validateStudentInput({ ...validRow, class: 0 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("組");
  });

  it("class が 11 → invalid", () => {
    const result = validateStudentInput({ ...validRow, class: 11 });
    expect(result.valid).toBe(false);
  });

  it("class が 10 → valid", () => {
    expect(validateStudentInput({ ...validRow, class: 10 }).valid).toBe(true);
  });

  it("number が 0 → invalid", () => {
    const result = validateStudentInput({ ...validRow, number: 0 });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("番号");
  });

  it("number が小数 → invalid", () => {
    const result = validateStudentInput({ ...validRow, number: 1.5 });
    expect(result.valid).toBe(false);
  });

  it("name が空 → invalid", () => {
    const result = validateStudentInput({ ...validRow, name: "" });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("氏名");
  });

  it("rowNum を指定すると行番号がエラーに含まれる", () => {
    const result = validateStudentInput({ ...validRow, name: "" }, 5);
    expect(result.error).toContain("行5:");
  });
});

describe("validateTeacherInput", () => {
  const validRow = { email: "teacher@example.com", name: "山田先生" };

  it("正常な入力 → valid", () => {
    expect(validateTeacherInput(validRow)).toEqual({ valid: true });
  });

  it("email が空 → invalid", () => {
    const result = validateTeacherInput({ ...validRow, email: "" });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("メールアドレス");
  });

  it("email が空白のみ → invalid", () => {
    const result = validateTeacherInput({ ...validRow, email: "   " });
    expect(result.valid).toBe(false);
  });

  it("name が空 → invalid", () => {
    const result = validateTeacherInput({ ...validRow, name: "" });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("氏名");
  });

  it("name が空白のみ → invalid", () => {
    const result = validateTeacherInput({ ...validRow, name: "  " });
    expect(result.valid).toBe(false);
  });

  it("rowNum を指定すると行番号がエラーに含まれる", () => {
    const result = validateTeacherInput({ ...validRow, email: "" }, 2);
    expect(result.error).toContain("行2:");
  });
});
