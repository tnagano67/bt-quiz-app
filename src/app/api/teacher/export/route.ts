import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateCsvText } from "@/lib/csv-utils";
import {
  getGradeFilter,
  calculateStudentStats,
  formatStudentExportRow,
  formatRecordExportRow,
} from "@/lib/export-utils";
import type {
  Student,
  StudentSubjectProgress,
  QuizRecord,
  GradeDefinition,
} from "@/lib/types/database";

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

export async function GET(request: NextRequest) {
  const supabase = await verifyTeacher();
  if (!supabase) {
    return NextResponse.json({ error: "認証エラー" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type");
  const subjectId = searchParams.get("subject");
  const year = searchParams.get("year");
  const cls = searchParams.get("class");
  const gradeFrom = searchParams.get("gradeFrom");
  const gradeTo = searchParams.get("gradeTo");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  // グレード定義を取得（科目フィルタ）
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
  const gradeFilter = getGradeFilter(gradeNames, gradeFrom, gradeTo);

  if (type === "students") {
    return handleStudentsExport(supabase, { subjectId, year, cls, gradeFilter });
  } else if (type === "records") {
    return handleRecordsExport(supabase, {
      subjectId,
      year,
      cls,
      gradeFilter,
      dateFrom,
      dateTo,
    });
  }

  return NextResponse.json({ error: "type パラメータが不正です" }, { status: 400 });
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function handleStudentsExport(
  supabase: SupabaseClient,
  filters: {
    subjectId: string | null;
    year: string | null;
    cls: string | null;
    gradeFilter: string[] | null;
  }
) {
  let query = supabase
    .from("students")
    .select("*")
    .order("year")
    .order("class")
    .order("number");

  if (filters.year) query = query.eq("year", Number(filters.year));
  if (filters.cls) query = query.eq("class", Number(filters.cls));

  // グレードフィルターは progress 経由
  if (filters.gradeFilter && filters.subjectId) {
    const { data: progressData } = await supabase
      .from("student_subject_progress")
      .select("student_id")
      .eq("subject_id", filters.subjectId)
      .in("current_grade", filters.gradeFilter);

    const filteredIds = (progressData ?? []).map((p) => p.student_id);
    if (filteredIds.length === 0) {
      const csv = generateCsvText([
        ["学年", "組", "番号", "氏名", "現在グレード", "連続合格日数",
          "最終挑戦日", "受験回数", "平均点", "最高点", "合格率"],
      ]);
      return createCsvResponse(csv, "students_export.csv");
    }
    query = query.in("id", filteredIds);
  }

  const { data: studentData, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const students = (studentData ?? []) as Student[];

  // 選択科目の progress を取得
  const studentIds = students.map((s) => s.id);
  const progressMap = new Map<string, StudentSubjectProgress>();
  if (studentIds.length > 0 && filters.subjectId) {
    const { data: progressData } = await supabase
      .from("student_subject_progress")
      .select("*")
      .eq("subject_id", filters.subjectId)
      .in("student_id", studentIds);

    for (const p of (progressData ?? []) as StudentSubjectProgress[]) {
      progressMap.set(p.student_id, p);
    }
  }

  // 全対象生徒の受験記録を取得
  let allRecords: QuizRecord[] = [];
  if (studentIds.length > 0) {
    let recordQuery = supabase
      .from("quiz_records")
      .select("student_id, score, passed")
      .in("student_id", studentIds);

    if (filters.subjectId) {
      recordQuery = recordQuery.eq("subject_id", filters.subjectId);
    }

    const { data: records } = await recordQuery;
    allRecords = (records ?? []) as QuizRecord[];
  }

  // インメモリで統計計算
  const recordsByStudent = new Map<string, QuizRecord[]>();
  for (const r of allRecords) {
    let arr = recordsByStudent.get(r.student_id);
    if (!arr) {
      arr = [];
      recordsByStudent.set(r.student_id, arr);
    }
    arr.push(r);
  }

  const header = [
    "学年", "組", "番号", "氏名", "現在グレード", "連続合格日数",
    "最終挑戦日", "受験回数", "平均点", "最高点", "合格率",
  ];
  const rows: (string | number)[][] = students.map((st) => {
    const records = recordsByStudent.get(st.id);
    const stats = records ? calculateStudentStats(records) : null;
    const progress = progressMap.get(st.id) ?? null;
    return formatStudentExportRow(st, progress, stats);
  });

  const csv = generateCsvText([header, ...rows]);
  return createCsvResponse(csv, "students_export.csv");
}

async function handleRecordsExport(
  supabase: SupabaseClient,
  filters: {
    subjectId: string | null;
    year: string | null;
    cls: string | null;
    gradeFilter: string[] | null;
    dateFrom: string | null;
    dateTo: string | null;
  }
) {
  // まず対象生徒を取得
  let studentQuery = supabase
    .from("students")
    .select("id, year, class, number, name")
    .order("year")
    .order("class")
    .order("number");

  if (filters.year) studentQuery = studentQuery.eq("year", Number(filters.year));
  if (filters.cls) studentQuery = studentQuery.eq("class", Number(filters.cls));

  // グレードフィルターは progress 経由
  if (filters.gradeFilter && filters.subjectId) {
    const { data: progressData } = await supabase
      .from("student_subject_progress")
      .select("student_id")
      .eq("subject_id", filters.subjectId)
      .in("current_grade", filters.gradeFilter);

    const filteredIds = (progressData ?? []).map((p) => p.student_id);
    if (filteredIds.length === 0) {
      const csv = generateCsvText([
        ["学年", "組", "番号", "氏名", "受験日", "グレード", "スコア", "合否"],
      ]);
      return createCsvResponse(csv, "records_export.csv");
    }
    studentQuery = studentQuery.in("id", filteredIds);
  }

  const { data: studentData, error: studentError } = await studentQuery;
  if (studentError) {
    return NextResponse.json({ error: studentError.message }, { status: 500 });
  }
  const students = (studentData ?? []) as Pick<
    Student,
    "id" | "year" | "class" | "number" | "name"
  >[];

  const studentIds = students.map((s) => s.id);
  if (studentIds.length === 0) {
    const csv = generateCsvText([
      ["学年", "組", "番号", "氏名", "受験日", "グレード", "スコア", "合否"],
    ]);
    return createCsvResponse(csv, "records_export.csv");
  }

  let recordQuery = supabase
    .from("quiz_records")
    .select("student_id, grade, score, passed, taken_at")
    .in("student_id", studentIds)
    .order("taken_at", { ascending: false });

  if (filters.subjectId) {
    recordQuery = recordQuery.eq("subject_id", filters.subjectId);
  }
  if (filters.dateFrom) {
    recordQuery = recordQuery.gte("taken_at", `${filters.dateFrom}T00:00:00+09:00`);
  }
  if (filters.dateTo) {
    recordQuery = recordQuery.lte("taken_at", `${filters.dateTo}T23:59:59+09:00`);
  }

  const { data: recordData, error: recordError } = await recordQuery;
  if (recordError) {
    return NextResponse.json({ error: recordError.message }, { status: 500 });
  }
  const records = (recordData ?? []) as Pick<
    QuizRecord,
    "student_id" | "grade" | "score" | "passed" | "taken_at"
  >[];

  const studentMap = new Map(students.map((s) => [s.id, s]));

  const header = ["学年", "組", "番号", "氏名", "受験日", "グレード", "スコア", "合否"];
  const rows: (string | number)[][] = records.map((r) => {
    const st = studentMap.get(r.student_id)!;
    return formatRecordExportRow(r, st);
  });

  const csv = generateCsvText([header, ...rows]);
  return createCsvResponse(csv, "records_export.csv");
}

function createCsvResponse(csv: string, filename: string): NextResponse {
  const bom = "\uFEFF";
  const body = bom + csv;
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
