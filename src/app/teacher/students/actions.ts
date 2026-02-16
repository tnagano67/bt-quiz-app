"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateStudentInput } from "@/lib/validation";

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

/** 全科目の最初のグレード名を取得 */
async function getFirstGradeNames(): Promise<
  { subject_id: string; grade_name: string }[]
> {
  const supabase = await createClient();

  // 全科目を取得
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id")
    .order("display_order", { ascending: true });

  if (!subjects || subjects.length === 0) return [];

  const result: { subject_id: string; grade_name: string }[] = [];

  for (const subject of subjects) {
    const { data: firstGrade } = await supabase
      .from("grade_definitions")
      .select("grade_name")
      .eq("subject_id", subject.id)
      .order("display_order", { ascending: true })
      .limit(1)
      .single();

    result.push({
      subject_id: subject.id,
      grade_name: firstGrade?.grade_name ?? "",
    });
  }

  return result;
}

/** 生徒作成後に全科目分の student_subject_progress を一括作成 */
async function createProgressForStudent(studentId: string) {
  const supabase = await createClient();
  const firstGrades = await getFirstGradeNames();

  if (firstGrades.length > 0) {
    await supabase.from("student_subject_progress").insert(
      firstGrades.map((fg) => ({
        student_id: studentId,
        subject_id: fg.subject_id,
        current_grade: fg.grade_name,
        consecutive_pass_days: 0,
        last_challenge_date: null,
      }))
    );
  }
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

  const { data: newStudent, error: insertError } = await supabase
    .from("students")
    .insert({
      email: input.email,
      year: input.year,
      class: input.class,
      number: input.number,
      name: input.name,
    })
    .select("id")
    .single();

  if (insertError || !newStudent) {
    return { success: false, message: "生徒の追加に失敗しました" };
  }

  // 全科目分の progress を作成
  await createProgressForStudent(newStudent.id);

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
  const errors: string[] = [];

  // バリデーション
  const validRows: StudentInput[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;
    const result = validateStudentInput(row, rowNum);
    if (!result.valid) {
      errors.push(result.error!);
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
    }));

  const toUpdate = validRows.filter((r) => existingEmails.has(r.email));

  let inserted = 0;
  let updated = 0;

  // 新規を一括挿入
  if (toInsert.length > 0) {
    const { data: insertedStudents, error: insertError } = await supabase
      .from("students")
      .insert(toInsert)
      .select("id");

    if (insertError) {
      errors.push(`一括挿入に失敗しました: ${insertError.message}`);
    } else {
      inserted = toInsert.length;

      // 新規挿入した生徒分の progress を作成
      if (insertedStudents && insertedStudents.length > 0) {
        const firstGrades = await getFirstGradeNames();
        if (firstGrades.length > 0) {
          const progressRows = insertedStudents.flatMap((student) =>
            firstGrades.map((fg) => ({
              student_id: student.id,
              subject_id: fg.subject_id,
              current_grade: fg.grade_name,
              consecutive_pass_days: 0,
              last_challenge_date: null,
            }))
          );

          // 1000件ずつバッチで挿入
          for (let i = 0; i < progressRows.length; i += 1000) {
            await supabase
              .from("student_subject_progress")
              .insert(progressRows.slice(i, i + 1000));
          }
        }
      }
    }
  }

  // 更新は progress を上書きしないため個別更新
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
