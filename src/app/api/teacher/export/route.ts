import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateCsvText } from "@/lib/csv-utils";
import type { Student, QuizRecord, GradeDefinition } from "@/lib/types/database";

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

function getGradeFilter(
  gradeNames: string[],
  gradeFrom: string | null,
  gradeTo: string | null
): string[] | null {
  const fromIndex = gradeFrom ? gradeNames.indexOf(gradeFrom) : -1;
  const toIndex = gradeTo ? gradeNames.indexOf(gradeTo) : -1;
  const sliceFrom = fromIndex !== -1 ? fromIndex : 0;
  const sliceTo = toIndex !== -1 ? toIndex + 1 : gradeNames.length;
  if (fromIndex !== -1 || toIndex !== -1) {
    return gradeNames.slice(sliceFrom, sliceTo);
  }
  return null;
}

export async function GET(request: NextRequest) {
  const supabase = await verifyTeacher();
  if (!supabase) {
    return NextResponse.json({ error: "認証エラー" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type");
  const year = searchParams.get("year");
  const cls = searchParams.get("class");
  const gradeFrom = searchParams.get("gradeFrom");
  const gradeTo = searchParams.get("gradeTo");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  // グレード定義を取得
  const { data: gradeData } = await supabase
    .from("grade_definitions")
    .select("*")
    .order("display_order", { ascending: true });
  const allGrades = (gradeData ?? []) as GradeDefinition[];
  const gradeNames = allGrades.map((g) => g.grade_name);
  const gradeFilter = getGradeFilter(gradeNames, gradeFrom, gradeTo);

  if (type === "students") {
    return handleStudentsExport(supabase, { year, cls, gradeFilter });
  } else if (type === "records") {
    return handleRecordsExport(supabase, {
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
  filters: { year: string | null; cls: string | null; gradeFilter: string[] | null }
) {
  let query = supabase
    .from("students")
    .select("*")
    .order("year")
    .order("class")
    .order("number");

  if (filters.year) query = query.eq("year", Number(filters.year));
  if (filters.cls) query = query.eq("class", Number(filters.cls));
  if (filters.gradeFilter) query = query.in("current_grade", filters.gradeFilter);

  const { data: studentData, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const students = (studentData ?? []) as Student[];

  // 全対象生徒の受験記録を取得
  const studentIds = students.map((s) => s.id);
  let allRecords: QuizRecord[] = [];
  if (studentIds.length > 0) {
    const { data: records } = await supabase
      .from("quiz_records")
      .select("student_id, score, passed")
      .in("student_id", studentIds);
    allRecords = (records ?? []) as QuizRecord[];
  }

  // インメモリで統計計算
  const statsMap = new Map<
    string,
    { count: number; totalScore: number; maxScore: number; passCount: number }
  >();
  for (const r of allRecords) {
    let s = statsMap.get(r.student_id);
    if (!s) {
      s = { count: 0, totalScore: 0, maxScore: 0, passCount: 0 };
      statsMap.set(r.student_id, s);
    }
    s.count++;
    s.totalScore += r.score;
    if (r.score > s.maxScore) s.maxScore = r.score;
    if (r.passed) s.passCount++;
  }

  const header = [
    "学年", "組", "番号", "氏名", "現在グレード", "連続合格日数",
    "最終挑戦日", "受験回数", "平均点", "最高点", "合格率",
  ];
  const rows: (string | number)[][] = students.map((st) => {
    const s = statsMap.get(st.id);
    const count = s?.count ?? 0;
    const avg = count > 0 ? Math.round(((s!.totalScore / count) * 10)) / 10 : 0;
    const max = s?.maxScore ?? 0;
    const passRate = count > 0 ? Math.round((s!.passCount / count) * 1000) / 10 : 0;
    return [
      st.year,
      st.class,
      st.number,
      st.name,
      st.current_grade,
      st.consecutive_pass_days,
      st.last_challenge_date ?? "",
      count,
      avg,
      max,
      `${passRate}%`,
    ];
  });

  const csv = generateCsvText([header, ...rows]);
  return createCsvResponse(csv, "students_export.csv");
}

async function handleRecordsExport(
  supabase: SupabaseClient,
  filters: {
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
    .select("id, year, class, number, name, current_grade")
    .order("year")
    .order("class")
    .order("number");

  if (filters.year) studentQuery = studentQuery.eq("year", Number(filters.year));
  if (filters.cls) studentQuery = studentQuery.eq("class", Number(filters.cls));
  if (filters.gradeFilter) studentQuery = studentQuery.in("current_grade", filters.gradeFilter);

  const { data: studentData, error: studentError } = await studentQuery;
  if (studentError) {
    return NextResponse.json({ error: studentError.message }, { status: 500 });
  }
  const students = (studentData ?? []) as Pick<
    Student,
    "id" | "year" | "class" | "number" | "name" | "current_grade"
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
    return [
      st.year,
      st.class,
      st.number,
      st.name,
      r.taken_at.slice(0, 10),
      r.grade,
      r.score,
      r.passed ? "合格" : "不合格",
    ];
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
