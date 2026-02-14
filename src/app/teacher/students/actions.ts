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
  const errors: string[] = [];

  // バリデーション
  const validRows: StudentInput[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

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
      row.class > 10
    ) {
      errors.push(`行${rowNum}: 組は1〜10の整数が必要です`);
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
    validRows.push(row);
  }

  if (validRows.length === 0) {
    revalidatePath("/teacher/students");
    return { success: errors.length === 0, inserted: 0, updated: 0, errors };
  }

  // 既存レコードを一括取得
  const emails = validRows.map((r) => r.email);
  const { data: existingRows } = await supabase
    .from("students")
    .select("email")
    .in("email", emails);

  const existingEmails = new Set(
    (existingRows ?? []).map((r) => r.email)
  );

  // 新規挿入と更新を分けて一括処理
  const toInsert = validRows
    .filter((r) => !existingEmails.has(r.email))
    .map((r) => ({
      email: r.email,
      year: r.year,
      class: r.class,
      number: r.number,
      name: r.name,
      current_grade: currentGrade,
      consecutive_pass_days: 0,
      last_challenge_date: null,
    }));

  const toUpdate = validRows.filter((r) => existingEmails.has(r.email));

  let inserted = 0;
  let updated = 0;

  // 新規を一括挿入
  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("students")
      .insert(toInsert);

    if (insertError) {
      errors.push(`一括挿入に失敗しました: ${insertError.message}`);
    } else {
      inserted = toInsert.length;
    }
  }

  // 更新は current_grade 等を上書きしないため upsert ではなく個別更新だが、
  // Promise.all で並列実行して高速化
  if (toUpdate.length > 0) {
    const updateResults = await Promise.all(
      toUpdate.map((row) =>
        supabase
          .from("students")
          .update({
            year: row.year,
            class: row.class,
            number: row.number,
            name: row.name,
          })
          .eq("email", row.email)
      )
    );

    for (let i = 0; i < updateResults.length; i++) {
      if (updateResults[i].error) {
        errors.push(`更新に失敗しました: ${toUpdate[i].email}`);
      } else {
        updated++;
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
