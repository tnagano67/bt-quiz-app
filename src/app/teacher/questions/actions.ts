"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type QuestionInput = {
  question_id: number;
  question_text: string;
  choice_1: string;
  choice_2: string;
  choice_3: string;
  choice_4: string;
  correct_answer: number;
};

type Result = {
  success: boolean;
  message?: string;
};

async function verifyTeacher(): Promise<{ error?: Result }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return { error: { success: false, message: "認証エラー" } };
  }

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("email", user.email)
    .single();

  if (!teacher) {
    return { error: { success: false, message: "教員権限がありません" } };
  }

  return {};
}

export async function createQuestion(input: QuestionInput): Promise<Result> {
  const { error } = await verifyTeacher();
  if (error) return error;

  const supabase = await createClient();

  // question_id の重複チェック
  const { data: existing } = await supabase
    .from("questions")
    .select("id")
    .eq("question_id", input.question_id)
    .single();

  if (existing) {
    return {
      success: false,
      message: `問題ID ${input.question_id} はすでに使用されています`,
    };
  }

  const { error: insertError } = await supabase.from("questions").insert({
    question_id: input.question_id,
    question_text: input.question_text,
    choice_1: input.choice_1,
    choice_2: input.choice_2,
    choice_3: input.choice_3,
    choice_4: input.choice_4,
    correct_answer: input.correct_answer,
  });

  if (insertError) {
    return { success: false, message: "問題の追加に失敗しました" };
  }

  revalidatePath("/teacher/questions");
  return { success: true };
}

export async function updateQuestion(
  questionId: number,
  input: Omit<QuestionInput, "question_id">
): Promise<Result> {
  const { error } = await verifyTeacher();
  if (error) return error;

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("questions")
    .select("id")
    .eq("question_id", questionId)
    .single();

  if (!existing) {
    return { success: false, message: "問題が見つかりません" };
  }

  const { error: updateError } = await supabase
    .from("questions")
    .update({
      question_text: input.question_text,
      choice_1: input.choice_1,
      choice_2: input.choice_2,
      choice_3: input.choice_3,
      choice_4: input.choice_4,
      correct_answer: input.correct_answer,
    })
    .eq("question_id", questionId);

  if (updateError) {
    return { success: false, message: "問題の更新に失敗しました" };
  }

  revalidatePath("/teacher/questions");
  return { success: true };
}

export async function deleteQuestion(questionId: number): Promise<Result> {
  const { error } = await verifyTeacher();
  if (error) return error;

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("questions")
    .select("id")
    .eq("question_id", questionId)
    .single();

  if (!existing) {
    return { success: false, message: "問題が見つかりません" };
  }

  const { error: deleteError } = await supabase
    .from("questions")
    .delete()
    .eq("question_id", questionId);

  if (deleteError) {
    return { success: false, message: "問題の削除に失敗しました" };
  }

  revalidatePath("/teacher/questions");
  return { success: true };
}
