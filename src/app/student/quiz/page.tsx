"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { shuffleArray, shuffleChoices } from "@/lib/quiz-logic";
import type { ShuffledChoice } from "@/lib/quiz-logic";
import type { Question, GradeDefinition } from "@/lib/types/database";
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
  const subjectId = searchParams.get("subject");
  const retryIds = searchParams.get("retry");
  const isRetry = !!retryIds;

  const [state, setState] = useState<QuizState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [studentId, setStudentId] = useState("");
  const [gradeDef, setGradeDef] = useState<GradeDefinition | null>(null);
  const [currentGradeName, setCurrentGradeName] = useState("");
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
  const [saveError, setSaveError] = useState("");

  const loadQuiz = useCallback(async () => {
    try {
      if (!subjectId) {
        setErrorMessage("科目が指定されていません");
        setState("error");
        return;
      }

      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !user.email) {
        router.push("/login");
        return;
      }

      // 生徒情報
      const { data: studentData } = await supabase
        .from("students")
        .select("*")
        .eq("email", user.email)
        .single();

      if (!studentData) {
        setErrorMessage("生徒情報が登録されていません");
        setState("error");
        return;
      }
      setStudentId(studentData.id);

      // 科目別の進捗を取得
      const { data: progressData } = await supabase
        .from("student_subject_progress")
        .select("*")
        .eq("student_id", studentData.id)
        .eq("subject_id", subjectId)
        .single();

      if (!progressData) {
        setErrorMessage("この科目の進捗情報が見つかりません");
        setState("error");
        return;
      }

      const currentGrade = progressData.current_grade as string;
      setCurrentGradeName(currentGrade);

      // グレード定義（選択科目のもの）
      const { data: grades } = await supabase
        .from("grade_definitions")
        .select("*")
        .eq("subject_id", subjectId)
        .order("display_order", { ascending: true });

      const allGrades = (grades ?? []) as GradeDefinition[];
      const currentGradeDef = allGrades.find(
        (g) => g.grade_name === currentGrade
      );
      if (!currentGradeDef) {
        setErrorMessage("グレード定義が見つかりません");
        setState("error");
        return;
      }
      setGradeDef(currentGradeDef);

      let selectedQuestions: Question[];

      if (isRetry && retryIds) {
        // 再受験: 指定IDの問題を取得（科目でフィルタ）
        const ids = retryIds.split(",").map(Number);
        const { data: questionData } = await supabase
          .from("questions")
          .select("*")
          .eq("subject_id", subjectId)
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
        // 通常受験: グレード範囲から問題を取得してシャッフル（科目でフィルタ）
        const { data: questionData } = await supabase
          .from("questions")
          .select("*")
          .eq("subject_id", subjectId)
          .gte("question_id", currentGradeDef.start_id)
          .lte("question_id", currentGradeDef.end_id);

        if (
          !questionData ||
          questionData.length < currentGradeDef.num_questions
        ) {
          setErrorMessage("問題数が不足しています");
          setState("error");
          return;
        }

        selectedQuestions = shuffleArray(questionData).slice(
          0,
          currentGradeDef.num_questions
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
  }, [router, subjectId, isRetry, retryIds]);

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
    if (!studentId || !gradeDef || !subjectId) return;

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
      try {
        const result = await saveQuizResult({
          studentId,
          subjectId,
          grade: currentGradeName,
          score: calcScore,
          passed: calcPassed,
          questionIds: questions.map((q) => q.question_id),
          studentAnswers,
          correctAnswers,
        });

        if (result.success && result.advancement) {
          setAdvancement(result.advancement);
        }
        if (!result.success) {
          setSaveError("結果の保存に失敗しました。成績は記録されていません。");
        }
      } catch {
        setSaveError("結果の保存に失敗しました。成績は記録されていません。");
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
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-bold text-gray-900 sm:text-lg">
          {isRetry ? "再受験" : "小テスト"} — {currentGradeName}
        </h2>
        <span className="text-xs text-gray-500 sm:text-sm">
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
        <>
          {saveError && (
            <div role="alert" className="rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              {saveError}
            </div>
          )}
          <QuizResult
            score={score}
            passed={passed}
            totalQuestions={questions.length}
            correctCount={results?.filter((r) => r.correct).length ?? 0}
            advancement={advancement}
            onGoHome={() => router.push("/student")}
            isRetry={isRetry}
          />
        </>
      )}
    </div>
  );
}
