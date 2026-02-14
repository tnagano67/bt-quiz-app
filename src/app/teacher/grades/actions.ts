"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type GradeInput = {
  grade_name: string;
  display_order: number;
  start_id: number;
  end_id: number;
  num_questions: number;
  pass_score: number;
  required_consecutive_days: number;
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

export async function createGrade(input: GradeInput): Promise<Result> {
  const { error } = await verifyTeacher();
  if (error) return error;

  const supabase = await createClient();

  // grade_name の重複チェック
  const { data: existingName } = await supabase
    .from("grade_definitions")
    .select("id")
    .eq("grade_name", input.grade_name)
    .single();

  if (existingName) {
    return {
      success: false,
      message: `グレード名「${input.grade_name}」はすでに使用されています`,
    };
  }

  // display_order の重複チェック
  const { data: existingOrder } = await supabase
    .from("grade_definitions")
    .select("id")
    .eq("display_order", input.display_order)
    .single();

  if (existingOrder) {
    return {
      success: false,
      message: `表示順 ${input.display_order} はすでに使用されています`,
    };
  }

  const { error: insertError } = await supabase
    .from("grade_definitions")
    .insert({
      grade_name: input.grade_name,
      display_order: input.display_order,
      start_id: input.start_id,
      end_id: input.end_id,
      num_questions: input.num_questions,
      pass_score: input.pass_score,
      required_consecutive_days: input.required_consecutive_days,
    });

  if (insertError) {
    return { success: false, message: "グレードの追加に失敗しました" };
  }

  revalidatePath("/teacher/grades");
  return { success: true };
}

export async function updateGrade(
  id: string,
  input: Omit<GradeInput, "grade_name">
): Promise<Result> {
  const { error } = await verifyTeacher();
  if (error) return error;

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("grade_definitions")
    .select("id")
    .eq("id", id)
    .single();

  if (!existing) {
    return { success: false, message: "グレードが見つかりません" };
  }

  // display_order の重複チェック（自身を除く）
  const { data: existingOrder } = await supabase
    .from("grade_definitions")
    .select("id")
    .eq("display_order", input.display_order)
    .neq("id", id)
    .single();

  if (existingOrder) {
    return {
      success: false,
      message: `表示順 ${input.display_order} はすでに使用されています`,
    };
  }

  const { error: updateError } = await supabase
    .from("grade_definitions")
    .update({
      display_order: input.display_order,
      start_id: input.start_id,
      end_id: input.end_id,
      num_questions: input.num_questions,
      pass_score: input.pass_score,
      required_consecutive_days: input.required_consecutive_days,
    })
    .eq("id", id);

  if (updateError) {
    return { success: false, message: "グレードの更新に失敗しました" };
  }

  revalidatePath("/teacher/grades");
  return { success: true };
}

export async function deleteGrade(id: string): Promise<Result> {
  const { error } = await verifyTeacher();
  if (error) return error;

  const supabase = await createClient();

  // グレード名を取得
  const { data: grade } = await supabase
    .from("grade_definitions")
    .select("grade_name")
    .eq("id", id)
    .single();

  if (!grade) {
    return { success: false, message: "グレードが見つかりません" };
  }

  // 生徒が参照中か確認
  const { count } = await supabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("current_grade", grade.grade_name);

  if (count && count > 0) {
    return {
      success: false,
      message: `このグレードは${count}名の生徒が使用中のため削除できません`,
    };
  }

  const { error: deleteError } = await supabase
    .from("grade_definitions")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return { success: false, message: "グレードの削除に失敗しました" };
  }

  revalidatePath("/teacher/grades");
  return { success: true };
}
