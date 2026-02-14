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

type ImportResult = {
  success: boolean;
  message?: string;
  inserted: number;
  updated: number;
  errors: string[];
};

export async function importQuestions(
  rows: QuestionInput[]
): Promise<ImportResult> {
  const { error } = await verifyTeacher();
  if (error) {
    return {
      success: false,
      message: error.message,
      inserted: 0,
      updated: 0,
      errors: [],
    };
  }

  const supabase = await createClient();
  let inserted = 0;
  let updated = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    // バリデーション
    if (
      !Number.isInteger(row.question_id) ||
      row.question_id < 1
    ) {
      errors.push(`行${rowNum}: question_id が不正です（正の整数が必要）`);
      continue;
    }
    if (
      !Number.isInteger(row.correct_answer) ||
      row.correct_answer < 1 ||
      row.correct_answer > 4
    ) {
      errors.push(`行${rowNum}: correct_answer は1〜4の整数が必要です`);
      continue;
    }
    if (
      !row.question_text.trim() ||
      !row.choice_1.trim() ||
      !row.choice_2.trim() ||
      !row.choice_3.trim() ||
      !row.choice_4.trim()
    ) {
      errors.push(`行${rowNum}: 空のフィールドがあります`);
      continue;
    }

    // 既存チェック → UPDATE or INSERT
    const { data: existing } = await supabase
      .from("questions")
      .select("id")
      .eq("question_id", row.question_id)
      .single();

    if (existing) {
      const { error: updateError } = await supabase
        .from("questions")
        .update({
          question_text: row.question_text,
          choice_1: row.choice_1,
          choice_2: row.choice_2,
          choice_3: row.choice_3,
          choice_4: row.choice_4,
          correct_answer: row.correct_answer,
        })
        .eq("question_id", row.question_id);

      if (updateError) {
        errors.push(`行${rowNum}: 更新に失敗しました`);
      } else {
        updated++;
      }
    } else {
      const { error: insertError } = await supabase
        .from("questions")
        .insert({
          question_id: row.question_id,
          question_text: row.question_text,
          choice_1: row.choice_1,
          choice_2: row.choice_2,
          choice_3: row.choice_3,
          choice_4: row.choice_4,
          correct_answer: row.correct_answer,
        });

      if (insertError) {
        errors.push(`行${rowNum}: 追加に失敗しました`);
      } else {
        inserted++;
      }
    }
  }

  revalidatePath("/teacher/questions");
  return {
    success: errors.length === 0,
    inserted,
    updated,
    errors,
  };
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
