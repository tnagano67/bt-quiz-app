"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result = {
  success: boolean;
  message?: string;
};

async function verifyTeacher(): Promise<{
  error?: Result;
  email?: string;
}> {
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

  return { email: user.email };
}

export async function createTeacher(input: {
  email: string;
  name: string;
}): Promise<Result> {
  const { error } = await verifyTeacher();
  if (error) return error;

  const supabase = await createClient();

  // email 重複チェック
  const { data: existing } = await supabase
    .from("teachers")
    .select("id")
    .eq("email", input.email)
    .single();

  if (existing) {
    return {
      success: false,
      message: `メールアドレス ${input.email} はすでに登録されています`,
    };
  }

  const { error: insertError } = await supabase.from("teachers").insert({
    email: input.email,
    name: input.name,
  });

  if (insertError) {
    return { success: false, message: "教員の追加に失敗しました" };
  }

  revalidatePath("/teacher/teachers");
  return { success: true };
}

type ImportResult = {
  success: boolean;
  message?: string;
  inserted: number;
  skipped: number;
  errors: string[];
};

export async function importTeachers(
  rows: { email: string; name: string }[]
): Promise<ImportResult> {
  const { error } = await verifyTeacher();
  if (error) {
    return {
      success: false,
      message: error.message,
      inserted: 0,
      skipped: 0,
      errors: [],
    };
  }

  const supabase = await createClient();
  const errors: string[] = [];

  // バリデーション
  const validRows: { email: string; name: string }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    if (!row.email.trim()) {
      errors.push(`行${rowNum}: メールアドレスが空です`);
      continue;
    }
    if (!row.name.trim()) {
      errors.push(`行${rowNum}: 氏名が空です`);
      continue;
    }
    validRows.push(row);
  }

  if (validRows.length === 0) {
    revalidatePath("/teacher/teachers");
    return { success: errors.length === 0, inserted: 0, skipped: 0, errors };
  }

  // 既存レコードを一括取得
  const emails = validRows.map((r) => r.email);
  const { data: existingRows } = await supabase
    .from("teachers")
    .select("email")
    .in("email", emails);

  const existingEmails = new Set(
    (existingRows ?? []).map((r) => r.email)
  );

  const toInsert = validRows
    .filter((r) => !existingEmails.has(r.email))
    .map((r) => ({
      email: r.email,
      name: r.name,
    }));

  const skipped = validRows.filter((r) => existingEmails.has(r.email)).length;

  let inserted = 0;

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("teachers")
      .insert(toInsert);

    if (insertError) {
      errors.push(`一括挿入に失敗しました: ${insertError.message}`);
    } else {
      inserted = toInsert.length;
    }
  }

  revalidatePath("/teacher/teachers");
  return {
    success: errors.length === 0,
    inserted,
    skipped,
    errors,
  };
}

export async function deleteTeacher(id: string): Promise<Result> {
  const { error, email } = await verifyTeacher();
  if (error) return error;

  const supabase = await createClient();

  // 削除対象が自分自身でないか確認
  const { data: target } = await supabase
    .from("teachers")
    .select("email")
    .eq("id", id)
    .single();

  if (!target) {
    return { success: false, message: "教員が見つかりません" };
  }

  if (target.email === email) {
    return { success: false, message: "自分自身を削除することはできません" };
  }

  const { error: deleteError } = await supabase
    .from("teachers")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return { success: false, message: "教員の削除に失敗しました" };
  }

  revalidatePath("/teacher/teachers");
  return { success: true };
}
