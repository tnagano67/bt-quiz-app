"use server";

import { createClient } from "@/lib/supabase/server";
import type { GradeDefinition } from "@/lib/types/database";

type CountParams = {
  type: "students" | "records";
  year?: string;
  cls?: string;
  gradeFrom?: string;
  gradeTo?: string;
  dateFrom?: string;
  dateTo?: string;
};

type CountResult = {
  success: boolean;
  count?: number;
  message?: string;
};

async function verifyTeacher() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return null;

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("email", user.email)
    .single();

  return teacher ? supabase : null;
}

export async function countExportRows(params: CountParams): Promise<CountResult> {
  const supabase = await verifyTeacher();
  if (!supabase) {
    return { success: false, message: "認証エラー" };
  }

  // グレード定義取得
  const { data: gradeData } = await supabase
    .from("grade_definitions")
    .select("*")
    .order("display_order", { ascending: true });
  const allGrades = (gradeData ?? []) as GradeDefinition[];
  const gradeNames = allGrades.map((g) => g.grade_name);

  // グレード範囲フィルター
  const fromIndex = params.gradeFrom ? gradeNames.indexOf(params.gradeFrom) : -1;
  const toIndex = params.gradeTo ? gradeNames.indexOf(params.gradeTo) : -1;
  const sliceFrom = fromIndex !== -1 ? fromIndex : 0;
  const sliceTo = toIndex !== -1 ? toIndex + 1 : gradeNames.length;
  const gradeFilter =
    fromIndex !== -1 || toIndex !== -1
      ? gradeNames.slice(sliceFrom, sliceTo)
      : null;

  if (params.type === "students") {
    let query = supabase
      .from("students")
      .select("*", { count: "exact", head: true });

    if (params.year) query = query.eq("year", Number(params.year));
    if (params.cls) query = query.eq("class", Number(params.cls));
    if (gradeFilter) query = query.in("current_grade", gradeFilter);

    const { count, error } = await query;
    if (error) return { success: false, message: error.message };
    return { success: true, count: count ?? 0 };
  }

  if (params.type === "records") {
    // まず対象生徒IDを取得
    let studentQuery = supabase.from("students").select("id");
    if (params.year) studentQuery = studentQuery.eq("year", Number(params.year));
    if (params.cls) studentQuery = studentQuery.eq("class", Number(params.cls));
    if (gradeFilter) studentQuery = studentQuery.in("current_grade", gradeFilter);

    const { data: studentData } = await studentQuery;
    const studentIds = (studentData ?? []).map((s: { id: string }) => s.id);

    if (studentIds.length === 0) {
      return { success: true, count: 0 };
    }

    let recordQuery = supabase
      .from("quiz_records")
      .select("*", { count: "exact", head: true })
      .in("student_id", studentIds);

    if (params.dateFrom) {
      recordQuery = recordQuery.gte("taken_at", `${params.dateFrom}T00:00:00+09:00`);
    }
    if (params.dateTo) {
      recordQuery = recordQuery.lte("taken_at", `${params.dateTo}T23:59:59+09:00`);
    }

    const { count, error } = await recordQuery;
    if (error) return { success: false, message: error.message };
    return { success: true, count: count ?? 0 };
  }

  return { success: false, message: "type パラメータが不正です" };
}

export async function getGradeNames(): Promise<string[]> {
  const supabase = await verifyTeacher();
  if (!supabase) return [];

  const { data } = await supabase
    .from("grade_definitions")
    .select("grade_name, display_order")
    .order("display_order", { ascending: true });

  return (data ?? []).map((g: { grade_name: string }) => g.grade_name);
}
