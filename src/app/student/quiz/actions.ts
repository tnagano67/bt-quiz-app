"use server";

import { createClient } from "@/lib/supabase/server";
import { calculateGradeAdvancement } from "@/lib/grade-logic";
import { getTodayJST } from "@/lib/date-utils";
import { verifyScore } from "@/lib/quiz-logic";
import type { GradeDefinition } from "@/lib/types/database";
import type { GradeAdvancementResult } from "@/lib/grade-logic";

type SaveQuizResultInput = {
  studentId: string;
  grade: string;
  score: number;
  passed: boolean;
  questionIds: number[];
  studentAnswers: number[];
  correctAnswers: number[];
};

type SaveQuizResultOutput = {
  success: boolean;
  skipped?: boolean;
  message?: string;
  advancement?: GradeAdvancementResult;
};

export async function saveQuizResult(
  input: SaveQuizResultInput
): Promise<SaveQuizResultOutput> {
  const supabase = await createClient();

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return { success: false, message: "認証エラー" };
  }

  // 生徒情報を取得して本人確認
  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("id", input.studentId)
    .eq("email", user.email)
    .single();

  if (!student) {
    return { success: false, message: "生徒情報が見つかりません" };
  }

  // 日次制限チェック（サーバー側で再検証）
  const todayStr = getTodayJST();
  if (student.last_challenge_date === todayStr) {
    return {
      success: true,
      skipped: true,
      message: "本日の記録はすでに保存されています",
    };
  }

  // サーバー側でスコアを再検証
  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .in("question_id", input.questionIds);

  if (!questions || questions.length !== input.questionIds.length) {
    return { success: false, message: "問題データの検証に失敗しました" };
  }

  const verifiedScore = verifyScore(questions, input.questionIds, input.studentAnswers);

  // グレード定義を取得
  const { data: grades } = await supabase
    .from("grade_definitions")
    .select("*")
    .order("display_order", { ascending: true });

  const allGrades = (grades ?? []) as GradeDefinition[];
  const currentGradeDef = allGrades.find(
    (g) => g.grade_name === student.current_grade
  );
  if (!currentGradeDef) {
    return { success: false, message: "グレード定義が見つかりません" };
  }

  const verifiedPassed = verifiedScore >= currentGradeDef.pass_score;

  // グレード進級計算
  const advancement = calculateGradeAdvancement(
    student.current_grade,
    student.consecutive_pass_days,
    verifiedPassed,
    student.last_challenge_date,
    allGrades
  );

  // 成績記録を保存
  const { error: insertError } = await supabase.from("quiz_records").insert({
    student_id: input.studentId,
    grade: input.grade,
    score: verifiedScore,
    passed: verifiedPassed,
    question_ids: input.questionIds,
    student_answers: input.studentAnswers,
    correct_answers: input.correctAnswers,
  });

  if (insertError) {
    return { success: false, message: "成績記録の保存に失敗しました" };
  }

  // 生徒情報を更新
  const { error: updateError } = await supabase
    .from("students")
    .update({
      current_grade: advancement.newGrade,
      consecutive_pass_days: advancement.newStreak,
      last_challenge_date: todayStr,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.studentId);

  if (updateError) {
    return { success: false, message: "生徒情報の更新に失敗しました" };
  }

  return {
    success: true,
    advancement,
  };
}
