"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type StudentInput = {
  email: string;
  year: number;
  class: number;
  number: number;
  name: string;
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

async function getFirstGradeName(): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("grade_definitions")
    .select("grade_name")
    .order("display_order", { ascending: true })
    .limit(1)
    .single();

  return data?.grade_name ?? "10級";
}

export async function createStudent(input: StudentInput): Promise<Result> {
  const { error } = await verifyTeacher();
  if (error) return error;

  const supabase = await createClient();

  // email 重複チェック
  const { data: existing } = await supabase
    .from("students")
    .select("id")
    .eq("email", input.email)
    .single();

  if (existing) {
    return {
      success: false,
      message: `メールアドレス ${input.email} はすでに登録されています`,
    };
  }

  const currentGrade = await getFirstGradeName();

  const { error: insertError } = await supabase.from("students").insert({
    email: input.email,
    year: input.year,
    class: input.class,
    number: input.number,
    name: input.name,
    current_grade: currentGrade,
    consecutive_pass_days: 0,
    last_challenge_date: null,
  });

  if (insertError) {
    return { success: false, message: "生徒の追加に失敗しました" };
  }

  revalidatePath("/teacher/students");
  return { success: true };
}

type ImportResult = {
  success: boolean;
  message?: string;
  inserted: number;
  updated: number;
  errors: string[];
};

export async function importStudents(
  rows: StudentInput[]
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
  const currentGrade = await getFirstGradeName();
  let inserted = 0;
  let updated = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    // バリデーション
    if (!row.email.trim()) {
      errors.push(`行${rowNum}: メールアドレスが空です`);
      continue;
    }
    if (
      !Number.isInteger(row.year) ||
      row.year < 1 ||
      row.year > 3
    ) {
      errors.push(`行${rowNum}: 学年は1〜3の整数が必要です`);
      continue;
    }
    if (
      !Number.isInteger(row.class) ||
      row.class < 1 ||
      row.class > 8
    ) {
      errors.push(`行${rowNum}: 組は1〜8の整数が必要です`);
      continue;
    }
    if (
      !Number.isInteger(row.number) ||
      row.number < 1
    ) {
      errors.push(`行${rowNum}: 番号は正の整数が必要です`);
      continue;
    }
    if (!row.name.trim()) {
      errors.push(`行${rowNum}: 氏名が空です`);
      continue;
    }

    // 既存チェック → UPDATE or INSERT
    const { data: existing } = await supabase
      .from("students")
      .select("id")
      .eq("email", row.email)
      .single();

    if (existing) {
      const { error: updateError } = await supabase
        .from("students")
        .update({
          year: row.year,
          class: row.class,
          number: row.number,
          name: row.name,
        })
        .eq("email", row.email);

      if (updateError) {
        errors.push(`行${rowNum}: 更新に失敗しました`);
      } else {
        updated++;
      }
    } else {
      const { error: insertError } = await supabase
        .from("students")
        .insert({
          email: row.email,
          year: row.year,
          class: row.class,
          number: row.number,
          name: row.name,
          current_grade: currentGrade,
          consecutive_pass_days: 0,
          last_challenge_date: null,
        });

      if (insertError) {
        errors.push(`行${rowNum}: 追加に失敗しました`);
      } else {
        inserted++;
      }
    }
  }

  revalidatePath("/teacher/students");
  return {
    success: errors.length === 0,
    inserted,
    updated,
    errors,
  };
}
