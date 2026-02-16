"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateQuestionInput } from "@/lib/validation";

type QuestionInput = {
  subject_id: string;
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

  // question_id の重複チェック（同一科目内）
  const { data: existing } = await supabase
    .from("questions")
    .select("id")
    .eq("subject_id", input.subject_id)
    .eq("question_id", input.question_id)
    .single();

  if (existing) {
    return {
      success: false,
      message: `問題ID ${input.question_id} はこの科目ですでに使用されています`,
    };
  }

  const { error: insertError } = await supabase.from("questions").insert({
    subject_id: input.subject_id,
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
  subjectId: string,
  input: Omit<QuestionInput, "question_id" | "subject_id">
): Promise<Result> {
  const { error } = await verifyTeacher();
  if (error) return error;

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("questions")
    .select("id")
    .eq("subject_id", subjectId)
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
    .eq("subject_id", subjectId)
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
  rows: Omit<QuestionInput, "subject_id">[],
  subjectId: string
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
  const errors: string[] = [];

  // バリデーション
  const validRows: Omit<QuestionInput, "subject_id">[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;
    const result = validateQuestionInput(row, rowNum);
    if (!result.valid) {
      errors.push(result.error!);
      continue;
    }
    validRows.push(row);
  }

  if (validRows.length === 0) {
    revalidatePath("/teacher/questions");
    return { success: errors.length === 0, inserted: 0, updated: 0, errors };
  }

  // 既存レコードを一括取得
  const questionIds = validRows.map((r) => r.question_id);
  const { data: existingRows } = await supabase
    .from("questions")
    .select("question_id")
    .eq("subject_id", subjectId)
    .in("question_id", questionIds);

  const existingIds = new Set(
    (existingRows ?? []).map((r) => r.question_id)
  );

  // upsert で一括処理（subject_id + question_id が既存なら更新）
  const { error: upsertError } = await supabase
    .from("questions")
    .upsert(
      validRows.map((row) => ({
        subject_id: subjectId,
        question_id: row.question_id,
        question_text: row.question_text,
        choice_1: row.choice_1,
        choice_2: row.choice_2,
        choice_3: row.choice_3,
        choice_4: row.choice_4,
        correct_answer: row.correct_answer,
      })),
      { onConflict: "subject_id,question_id" }
    );

  let inserted = 0;
  let updated = 0;

  if (upsertError) {
    errors.push(`一括インポートに失敗しました: ${upsertError.message}`);
  } else {
    for (const row of validRows) {
      if (existingIds.has(row.question_id)) {
        updated++;
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

export async function deleteQuestion(questionId: number, subjectId: string): Promise<Result> {
  const { error } = await verifyTeacher();
  if (error) return error;

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("questions")
    .select("id")
    .eq("subject_id", subjectId)
    .eq("question_id", questionId)
    .single();

  if (!existing) {
    return { success: false, message: "問題が見つかりません" };
  }

  const { error: deleteError } = await supabase
    .from("questions")
    .delete()
    .eq("subject_id", subjectId)
    .eq("question_id", questionId);

  if (deleteError) {
    return { success: false, message: "問題の削除に失敗しました" };
  }

  revalidatePath("/teacher/questions");
  return { success: true };
}
