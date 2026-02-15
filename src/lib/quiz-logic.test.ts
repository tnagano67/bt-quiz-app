import { describe, it, expect } from "vitest";
import { shuffleArray, shuffleChoices, gradeQuiz } from "./quiz-logic";
import type { Question } from "@/lib/types/database";

describe("shuffleArray", () => {
  it("長さが変わらない", () => {
    const arr = [1, 2, 3, 4, 5];
    expect(shuffleArray(arr)).toHaveLength(arr.length);
  });

  it("元配列を破壊しない", () => {
    const arr = [1, 2, 3, 4, 5];
    const original = [...arr];
    shuffleArray(arr);
    expect(arr).toEqual(original);
  });

  it("全要素が保持される", () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffleArray(arr);
    expect(shuffled.sort()).toEqual([...arr].sort());
  });
});

describe("shuffleChoices", () => {
  const question: Question = {
    id: "q1",
    question_id: 1,
    question_text: "テスト問題",
    choice_1: "選択肢A",
    choice_2: "選択肢B",
    choice_3: "選択肢C",
    choice_4: "選択肢D",
    correct_answer: 1,
    created_at: "2024-01-01",
  };

  it("4つの選択肢が返る", () => {
    const choices = shuffleChoices(question);
    expect(choices).toHaveLength(4);
  });

  it("originalIndex が 0〜3 を含む", () => {
    const choices = shuffleChoices(question);
    const indices = choices.map((c) => c.originalIndex).sort();
    expect(indices).toEqual([0, 1, 2, 3]);
  });

  it("全選択肢テキストが保持される", () => {
    const choices = shuffleChoices(question);
    const texts = choices.map((c) => c.text).sort();
    expect(texts).toEqual(["選択肢A", "選択肢B", "選択肢C", "選択肢D"]);
  });
});

describe("gradeQuiz", () => {
  const questions: Question[] = [
    {
      id: "q1",
      question_id: 1,
      question_text: "問題1",
      choice_1: "A",
      choice_2: "B",
      choice_3: "C",
      choice_4: "D",
      correct_answer: 1, // 1-based → 0-based で 0 が正解
      created_at: "2024-01-01",
    },
    {
      id: "q2",
      question_id: 2,
      question_text: "問題2",
      choice_1: "A",
      choice_2: "B",
      choice_3: "C",
      choice_4: "D",
      correct_answer: 3, // 0-based で 2 が正解
      created_at: "2024-01-01",
    },
    {
      id: "q3",
      question_id: 3,
      question_text: "問題3",
      choice_1: "A",
      choice_2: "B",
      choice_3: "C",
      choice_4: "D",
      correct_answer: 4, // 0-based で 3 が正解
      created_at: "2024-01-01",
    },
  ];

  it("全問正解 → 100点", () => {
    const result = gradeQuiz(questions, [0, 2, 3]);
    expect(result.score).toBe(100);
    expect(result.results.every((r) => r.correct)).toBe(true);
  });

  it("全問不正解 → 0点", () => {
    const result = gradeQuiz(questions, [1, 1, 1]);
    expect(result.score).toBe(0);
    expect(result.results.every((r) => !r.correct)).toBe(true);
  });

  it("部分正解の計算", () => {
    // 1問目だけ正解 → 1/3 = 33%
    const result = gradeQuiz(questions, [0, 0, 0]);
    expect(result.score).toBe(33);
    expect(result.results[0].correct).toBe(true);
    expect(result.results[1].correct).toBe(false);
    expect(result.results[2].correct).toBe(false);
  });

  it("correct_answer の 1-based → 0-based 変換", () => {
    const result = gradeQuiz(questions, [0, 2, 3]);
    expect(result.correctAnswers).toEqual([0, 2, 3]);
  });

  it("results に各問の回答情報が含まれる", () => {
    const result = gradeQuiz(questions, [1, 2, 0]);
    expect(result.results).toHaveLength(3);
    expect(result.results[0]).toEqual({
      correct: false,
      studentAnswer: 1,
      correctAnswer: 0,
    });
    expect(result.results[1]).toEqual({
      correct: true,
      studentAnswer: 2,
      correctAnswer: 2,
    });
  });
});
