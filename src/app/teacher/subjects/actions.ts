"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateSubjectInput } from "@/lib/validation";

type SubjectInput = {
  name: string;
  display_order: number;
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

export async function createSubject(input: SubjectInput): Promise<Result> {
  const { error } = await verifyTeacher();
  if (error) return error;

  const validation = validateSubjectInput(input);
  if (!validation.valid) {
    return { success: false, message: validation.error };
  }

  const supabase = await createClient();

  // 名前の重複チェック
  const { data: existingName } = await supabase
    .from("subjects")
    .select("id")
    .eq("name", input.name)
    .single();

  if (existingName) {
    return {
      success: false,
      message: `科目名「${input.name}」はすでに使用されています`,
    };
  }

  // 表示順の重複チェック
  const { data: existingOrder } = await supabase
    .from("subjects")
    .select("id")
    .eq("display_order", input.display_order)
    .single();

  if (existingOrder) {
    return {
      success: false,
      message: `表示順 ${input.display_order} はすでに使用されています`,
    };
  }

  // 科目を作成
  const { data: newSubject, error: insertError } = await supabase
    .from("subjects")
    .insert({
      name: input.name,
      display_order: input.display_order,
    })
    .select("id")
    .single();

  if (insertError || !newSubject) {
    return { success: false, message: "科目の追加に失敗しました" };
  }

  // 全生徒分の student_subject_progress を一括作成
  // 各科目の最初のグレードを初期値に
  const { data: firstGrade } = await supabase
    .from("grade_definitions")
    .select("grade_name")
    .eq("subject_id", newSubject.id)
    .order("display_order", { ascending: true })
    .limit(1)
    .single();

  const initialGrade = firstGrade?.grade_name ?? "";

  // 全生徒IDを取得
  const PAGE_SIZE = 1000;
  let from = 0;
  const allStudentIds: string[] = [];

  while (true) {
    const { data: studentData } = await supabase
      .from("students")
      .select("id")
      .range(from, from + PAGE_SIZE - 1);

    if (!studentData || studentData.length === 0) break;
    allStudentIds.push(...studentData.map((s) => s.id));
    if (studentData.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  // 1000件ずつバッチで progress を作成
  for (let i = 0; i < allStudentIds.length; i += PAGE_SIZE) {
    const batch = allStudentIds.slice(i, i + PAGE_SIZE);
    const { error: batchError } = await supabase
      .from("student_subject_progress")
      .insert(
        batch.map((studentId) => ({
          student_id: studentId,
          subject_id: newSubject.id,
          current_grade: initialGrade,
          consecutive_pass_days: 0,
          last_challenge_date: null,
        }))
      );
    if (batchError) {
      console.error("Failed to create progress batch:", batchError);
    }
  }

  revalidatePath("/teacher/subjects");
  return { success: true };
}

export async function updateSubject(
  id: string,
  input: SubjectInput
): Promise<Result> {
  const { error } = await verifyTeacher();
  if (error) return error;

  const validation = validateSubjectInput(input);
  if (!validation.valid) {
    return { success: false, message: validation.error };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("subjects")
    .select("id")
    .eq("id", id)
    .single();

  if (!existing) {
    return { success: false, message: "科目が見つかりません" };
  }

  // 名前の重複チェック（自身を除く）
  const { data: existingName } = await supabase
    .from("subjects")
    .select("id")
    .eq("name", input.name)
    .neq("id", id)
    .single();

  if (existingName) {
    return {
      success: false,
      message: `科目名「${input.name}」はすでに使用されています`,
    };
  }

  // 表示順の重複チェック（自身を除く）
  const { data: existingOrder } = await supabase
    .from("subjects")
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
    .from("subjects")
    .update({
      name: input.name,
      display_order: input.display_order,
    })
    .eq("id", id);

  if (updateError) {
    return { success: false, message: "科目の更新に失敗しました" };
  }

  revalidatePath("/teacher/subjects");
  return { success: true };
}

export async function deleteSubject(id: string): Promise<Result> {
  const { error } = await verifyTeacher();
  if (error) return error;

  const supabase = await createClient();

  // 参照チェック: grade_definitions
  const { count: gradeCount } = await supabase
    .from("grade_definitions")
    .select("id", { count: "exact", head: true })
    .eq("subject_id", id);

  if (gradeCount && gradeCount > 0) {
    return {
      success: false,
      message: `この科目には${gradeCount}件のグレード定義があるため削除できません`,
    };
  }

  // 参照チェック: questions
  const { count: questionCount } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("subject_id", id);

  if (questionCount && questionCount > 0) {
    return {
      success: false,
      message: `この科目には${questionCount}件の問題があるため削除できません`,
    };
  }

  // 参照チェック: quiz_records
  const { count: recordCount } = await supabase
    .from("quiz_records")
    .select("id", { count: "exact", head: true })
    .eq("subject_id", id);

  if (recordCount && recordCount > 0) {
    return {
      success: false,
      message: `この科目には${recordCount}件の受験記録があるため削除できません`,
    };
  }

  // student_subject_progress を削除（CASCADE なので自動だが明示的に）
  const { error: progressError } = await supabase
    .from("student_subject_progress")
    .delete()
    .eq("subject_id", id);
  if (progressError) {
    return { success: false, message: "進捗データの削除に失敗しました" };
  }

  const { error: deleteError } = await supabase
    .from("subjects")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return { success: false, message: "科目の削除に失敗しました" };
  }

  revalidatePath("/teacher/subjects");
  return { success: true };
}
