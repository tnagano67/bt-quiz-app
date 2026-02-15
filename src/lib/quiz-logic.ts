import type { Question } from "@/lib/types/database";

/** Fisher-Yates シャッフル（非破壊） */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** 選択肢をシャッフルして originalIndex を保持する型 */
export type ShuffledChoice = {
  originalIndex: number; // 0-based (choice_1=0, choice_2=1, ...)
  text: string;
};

/** 問題の選択肢をシャッフルする */
export function shuffleChoices(question: Question): ShuffledChoice[] {
  const choices: ShuffledChoice[] = [
    { originalIndex: 0, text: question.choice_1 },
    { originalIndex: 1, text: question.choice_2 },
    { originalIndex: 2, text: question.choice_3 },
    { originalIndex: 3, text: question.choice_4 },
  ];
  return shuffleArray(choices);
}

/** クライアント側で即時採点する */
export function gradeQuiz(
  questions: Question[],
  studentAnswers: number[] // 各問の選択肢 originalIndex (0-based)
): {
  score: number;
  passed: boolean;
  correctAnswers: number[];
  results: { correct: boolean; studentAnswer: number; correctAnswer: number }[];
} {
  let correctCount = 0;
  const correctAnswers: number[] = [];
  const results: {
    correct: boolean;
    studentAnswer: number;
    correctAnswer: number;
  }[] = [];

  for (let i = 0; i < questions.length; i++) {
    const correctAnswer = questions[i].correct_answer - 1; // 1-based → 0-based
    correctAnswers.push(correctAnswer);
    const isCorrect = studentAnswers[i] === correctAnswer;
    if (isCorrect) correctCount++;
    results.push({
      correct: isCorrect,
      studentAnswer: studentAnswers[i],
      correctAnswer,
    });
  }

  const score = Math.round((correctCount / questions.length) * 100);

  return { score, passed: false, correctAnswers, results }; // passed はサーバー側で passScore と比較して決定
}

/**
 * サーバー側でスコアを再検証する。
 * questions は DB から取得した問題（correct_answer は 1-based）。
 * questionIds はクライアントが送信した問題 ID 順。
 * studentAnswers は各問の選択肢 originalIndex（0-based）。
 */
export function verifyScore(
  questions: Question[],
  questionIds: number[],
  studentAnswers: number[]
): number {
  // questionIds の順序で問題を並べ替え
  const idOrder = new Map(questionIds.map((id, i) => [id, i]));
  const sorted = [...questions].sort(
    (a, b) => idOrder.get(a.question_id)! - idOrder.get(b.question_id)!
  );

  let correctCount = 0;
  for (let i = 0; i < sorted.length; i++) {
    const correctAnswer = sorted[i].correct_answer - 1; // 1-based → 0-based
    if (studentAnswers[i] === correctAnswer) {
      correctCount++;
    }
  }
  return Math.round((correctCount / sorted.length) * 100);
}
