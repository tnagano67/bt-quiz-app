"use server";

import { createClient } from "@/lib/supabase/server";
import type { GradeDefinition, Subject } from "@/lib/types/database";

type CountParams = {
  type: "students" | "records";
  subjectId?: string;
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

export async function getSubjects(): Promise<Subject[]> {
  const supabase = await verifyTeacher();
  if (!supabase) return [];

  const { data } = await supabase
    .from("subjects")
    .select("*")
    .order("display_order", { ascending: true });

  return (data ?? []) as Subject[];
}

export async function countExportRows(params: CountParams): Promise<CountResult> {
  const supabase = await verifyTeacher();
  if (!supabase) {
    return { success: false, message: "認証エラー" };
  }

  const subjectId = params.subjectId;

  // グレード定義取得（科目フィルタ）
  let gradeQuery = supabase
    .from("grade_definitions")
    .select("*")
    .order("display_order", { ascending: true });
  if (subjectId) {
    gradeQuery = gradeQuery.eq("subject_id", subjectId);
  }
  const { data: gradeData } = await gradeQuery;
  const allGrades = (gradeData ?? []) as GradeDefinition[];
  const gradeNames = allGrades.map((g) => g.grade_name);

  // グレード範囲フィルター（Map で O(1) ルックアップ）
  const gradeIndexMap = new Map(gradeNames.map((name, i) => [name, i]));
  const fromIndex = params.gradeFrom ? (gradeIndexMap.get(params.gradeFrom) ?? -1) : -1;
  const toIndex = params.gradeTo ? (gradeIndexMap.get(params.gradeTo) ?? -1) : -1;
  const sliceFrom = fromIndex !== -1 ? fromIndex : 0;
  const sliceTo = toIndex !== -1 ? toIndex + 1 : gradeNames.length;
  const gradeFilter =
    fromIndex !== -1 || toIndex !== -1
      ? gradeNames.slice(sliceFrom, sliceTo)
      : null;

  if (params.type === "students") {
    // グレードフィルターは student_subject_progress 経由
    let studentQuery = supabase
      .from("students")
      .select("id", { count: "exact", head: !gradeFilter });

    if (params.year) studentQuery = studentQuery.eq("year", Number(params.year));
    if (params.cls) studentQuery = studentQuery.eq("class", Number(params.cls));

    if (gradeFilter && subjectId) {
      // gradeFilter がある場合は progress 経由で student_id を取得
      const { data: progressData } = await supabase
        .from("student_subject_progress")
        .select("student_id")
        .eq("subject_id", subjectId)
        .in("current_grade", gradeFilter);

      const studentIds = (progressData ?? []).map((p) => p.student_id);
      if (studentIds.length === 0) {
        return { success: true, count: 0 };
      }

      const studentCountQuery = supabase
        .from("students")
        .select("*", { count: "exact", head: true })
        .in("id", studentIds);

      if (params.year) studentCountQuery.eq("year", Number(params.year));
      if (params.cls) studentCountQuery.eq("class", Number(params.cls));

      const { count, error } = await studentCountQuery;
      if (error) return { success: false, message: error.message };
      return { success: true, count: count ?? 0 };
    }

    const { count, error } = await studentQuery;
    if (error) return { success: false, message: error.message };
    return { success: true, count: count ?? 0 };
  }

  if (params.type === "records") {
    // まず対象生徒IDを取得
    let studentQuery = supabase.from("students").select("id");
    if (params.year) studentQuery = studentQuery.eq("year", Number(params.year));
    if (params.cls) studentQuery = studentQuery.eq("class", Number(params.cls));

    // グレードフィルターは progress 経由
    if (gradeFilter && subjectId) {
      const { data: progressData } = await supabase
        .from("student_subject_progress")
        .select("student_id")
        .eq("subject_id", subjectId)
        .in("current_grade", gradeFilter);

      const filteredIds = (progressData ?? []).map((p) => p.student_id);
      if (filteredIds.length === 0) {
        return { success: true, count: 0 };
      }
      studentQuery = studentQuery.in("id", filteredIds);
    }

    const { data: studentData } = await studentQuery;
    const studentIds = (studentData ?? []).map((s: { id: string }) => s.id);

    if (studentIds.length === 0) {
      return { success: true, count: 0 };
    }

    let recordQuery = supabase
      .from("quiz_records")
      .select("*", { count: "exact", head: true })
      .in("student_id", studentIds);

    if (subjectId) {
      recordQuery = recordQuery.eq("subject_id", subjectId);
    }
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

export async function getGradeNames(subjectId?: string): Promise<string[]> {
  const supabase = await verifyTeacher();
  if (!supabase) return [];

  let query = supabase
    .from("grade_definitions")
    .select("grade_name, display_order")
    .order("display_order", { ascending: true });

  if (subjectId) {
    query = query.eq("subject_id", subjectId);
  }

  const { data } = await query;
  return (data ?? []).map((g: { grade_name: string }) => g.grade_name);
}
