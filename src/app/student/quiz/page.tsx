"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { shuffleArray, shuffleChoices } from "@/lib/quiz-logic";
import type { ShuffledChoice } from "@/lib/quiz-logic";
import type { Question, Student, GradeDefinition } from "@/lib/types/database";
import type { GradeAdvancementResult } from "@/lib/grade-logic";
import QuizQuestion from "@/components/QuizQuestion";
import QuizResult from "@/components/QuizResult";
import { saveQuizResult } from "./actions";

type QuizState = "loading" | "ready" | "submitted" | "error";

export default function QuizPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-gray-500">読み込み中...</div>
      }
    >
      <QuizContent />
    </Suspense>
  );
}

function QuizContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const retryIds = searchParams.get("retry");
  const isRetry = !!retryIds;

  const [state, setState] = useState<QuizState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [student, setStudent] = useState<Student | null>(null);
  const [gradeDef, setGradeDef] = useState<GradeDefinition | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [shuffledChoices, setShuffledChoices] = useState<ShuffledChoice[][]>(
    []
  );
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [results, setResults] = useState<
    { correct: boolean; correctAnswer: number }[] | null
  >(null);
  const [score, setScore] = useState(0);
  const [passed, setPassed] = useState(false);
  const [advancement, setAdvancement] =
    useState<GradeAdvancementResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadQuiz = useCallback(async () => {
    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // 生徒情報
      const { data: studentData } = await supabase
        .from("students")
        .select("*")
        .eq("profile_id", user.id)
        .single();

      if (!studentData) {
        setErrorMessage("生徒情報が登録されていません");
        setState("error");
        return;
      }
      setStudent(studentData);

      // グレード定義
      const { data: grades } = await supabase
        .from("grade_definitions")
        .select("*")
        .order("display_order", { ascending: true });

      const allGrades = (grades ?? []) as GradeDefinition[];
      const currentGrade = allGrades.find(
        (g) => g.grade_name === studentData.current_grade
      );
      if (!currentGrade) {
        setErrorMessage("グレード定義が見つかりません");
        setState("error");
        return;
      }
      setGradeDef(currentGrade);

      let selectedQuestions: Question[];

      if (isRetry && retryIds) {
        // 再受験: 指定IDの問題を取得
        const ids = retryIds.split(",").map(Number);
        const { data: questionData } = await supabase
          .from("questions")
          .select("*")
          .in("question_id", ids);

        if (!questionData || questionData.length === 0) {
          setErrorMessage("問題データが見つかりません");
          setState("error");
          return;
        }

        // 元の順序を保持
        const idOrder = new Map(ids.map((id, i) => [id, i]));
        selectedQuestions = [...questionData].sort(
          (a, b) => idOrder.get(a.question_id)! - idOrder.get(b.question_id)!
        );
      } else {
        // 通常受験: グレード範囲から問題を取得してシャッフル
        const { data: questionData } = await supabase
          .from("questions")
          .select("*")
          .gte("question_id", currentGrade.start_id)
          .lte("question_id", currentGrade.end_id);

        if (
          !questionData ||
          questionData.length < currentGrade.num_questions
        ) {
          setErrorMessage("問題数が不足しています");
          setState("error");
          return;
        }

        selectedQuestions = shuffleArray(questionData).slice(
          0,
          currentGrade.num_questions
        );
      }

      setQuestions(selectedQuestions);
      setShuffledChoices(selectedQuestions.map((q) => shuffleChoices(q)));
      setAnswers(new Array(selectedQuestions.length).fill(null));
      setState("ready");
    } catch {
      setErrorMessage("データの読み込みに失敗しました");
      setState("error");
    }
  }, [router, isRetry, retryIds]);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  const handleAnswer = (questionIndex: number, originalIndex: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[questionIndex] = originalIndex;
      return next;
    });
  };

  const handleSubmit = async () => {
    if (answers.some((a) => a === null)) return;
    if (!student || !gradeDef) return;

    setSubmitting(true);

    const studentAnswers = answers as number[];
    const correctAnswers = questions.map((q) => q.correct_answer - 1);

    // クライアント側で即時採点
    let correctCount = 0;
    const questionResults = questions.map((q, i) => {
      const isCorrect = studentAnswers[i] === q.correct_answer - 1;
      if (isCorrect) correctCount++;
      return { correct: isCorrect, correctAnswer: q.correct_answer - 1 };
    });

    const calcScore = Math.round((correctCount / questions.length) * 100);
    const calcPassed = calcScore >= gradeDef.pass_score;

    setScore(calcScore);
    setPassed(calcPassed);
    setResults(questionResults);

    // サーバー側で保存（再受験時は保存しない）
    if (!isRetry) {
      const result = await saveQuizResult({
        studentId: student.id,
        grade: student.current_grade,
        score: calcScore,
        passed: calcPassed,
        questionIds: questions.map((q) => q.question_id),
        studentAnswers,
        correctAnswers,
      });

      if (result.success && result.advancement) {
        setAdvancement(result.advancement);
      }
    }

    setSubmitting(false);
    setState("submitted");
  };

  const allAnswered = answers.every((a) => a !== null);

  if (state === "loading") {
    return (
      <div className="py-12 text-center text-gray-500">読み込み中...</div>
    );
  }

  if (state === "error") {
    return (
      <div className="rounded-lg bg-red-50 p-6 text-center">
        <p className="font-bold text-red-800">{errorMessage}</p>
        <button
          onClick={() => router.push("/student")}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
        >
          ホームに戻る
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">
          {isRetry ? "再受験" : "小テスト"} — {student?.current_grade}
        </h2>
        <span className="text-sm text-gray-500">
          {questions.length}問 / 合格ライン {gradeDef?.pass_score}%
        </span>
      </div>

      {questions.map((q, i) => (
        <QuizQuestion
          key={q.question_id}
          index={i}
          questionText={q.question_text}
          choices={shuffledChoices[i]}
          selectedAnswer={answers[i]}
          onAnswer={(originalIndex) => handleAnswer(i, originalIndex)}
          disabled={state === "submitted"}
          result={results ? results[i] : undefined}
        />
      ))}

      {state === "ready" && (
        <button
          onClick={handleSubmit}
          disabled={!allAnswered || submitting}
          className={`rounded-lg py-3 text-center font-bold text-white shadow-sm transition-colors ${
            allAnswered && !submitting
              ? "bg-blue-600 hover:bg-blue-700"
              : "cursor-not-allowed bg-gray-300"
          }`}
        >
          {submitting ? "送信中..." : "回答を送信"}
        </button>
      )}

      {state === "submitted" && (
        <QuizResult
          score={score}
          passed={passed}
          totalQuestions={questions.length}
          correctCount={results?.filter((r) => r.correct).length ?? 0}
          advancement={advancement}
          onGoHome={() => router.push("/student")}
          isRetry={isRetry}
        />
      )}
    </div>
  );
}
