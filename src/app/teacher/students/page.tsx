import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRecentDates } from "@/lib/date-utils";
import StudentFilter from "@/components/StudentFilter";
import StudentTable from "@/components/StudentTable";
import StudentCsvImport from "@/components/StudentCsvImport";
import Pagination from "@/components/Pagination";
import type {
  Student,
  GradeDefinition,
  QuizRecord,
} from "@/lib/types/database";

const PAGE_SIZE = 50;

type Props = {
  searchParams: Promise<{
    year?: string;
    class?: string;
    gradeFrom?: string;
    gradeTo?: string;
    name?: string;
    page?: string;
  }>;
};

export default async function TeacherStudentsPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) redirect("/login");

  // 教員チェック
  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("email", user.email)
    .single();
  if (!teacher) redirect("/");

  // グレード定義を取得（フィルター用 + グレード範囲判定用）
  const { data: gradeData } = await supabase
    .from("grade_definitions")
    .select("*")
    .order("display_order", { ascending: true });
  const allGrades = (gradeData ?? []) as GradeDefinition[];
  const gradeNames = allGrades.map((g) => g.grade_name);

  // サーバーサイドフィルタリング付きクエリを構築
  let query = supabase
    .from("students")
    .select("*", { count: "exact" })
    .order("year")
    .order("class")
    .order("number");

  if (params.year) {
    query = query.eq("year", Number(params.year));
  }
  if (params.class) {
    query = query.eq("class", Number(params.class));
  }
  if (params.name) {
    query = query.ilike("name", `%${params.name}%`);
  }
  // グレード範囲フィルター
  {
    const fromIndex = params.gradeFrom
      ? gradeNames.indexOf(params.gradeFrom)
      : -1;
    const toIndex = params.gradeTo
      ? gradeNames.indexOf(params.gradeTo)
      : -1;
    const sliceFrom = fromIndex !== -1 ? fromIndex : 0;
    const sliceTo = toIndex !== -1 ? toIndex + 1 : gradeNames.length;
    if (fromIndex !== -1 || toIndex !== -1) {
      query = query.in("current_grade", gradeNames.slice(sliceFrom, sliceTo));
    }
  }

  // ページネーション
  const currentPage = Math.max(1, Number(params.page) || 1);
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  query = query.range(from, to);

  const { data: studentData, count } = await query;
  const students = (studentData ?? []) as Student[];
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // 直近3日間のスコアを取得（表示中の生徒のみ）
  const recentDates = getRecentDates(3);
  const oldestDate = recentDates[recentDates.length - 1];

  const scoreMap = new Map<string, Map<string, number | null>>();

  if (students.length > 0) {
    const studentIds = students.map((s) => s.id);
    const { data: records } = await supabase
      .from("quiz_records")
      .select("*")
      .in("student_id", studentIds)
      .gte("taken_at", `${oldestDate}T00:00:00+09:00`)
      .order("taken_at", { ascending: false });

    const allRecords = (records ?? []) as QuizRecord[];

    for (const record of allRecords) {
      const date = record.taken_at.slice(0, 10);
      if (!scoreMap.has(record.student_id)) {
        scoreMap.set(record.student_id, new Map());
      }
      const studentMap = scoreMap.get(record.student_id)!;
      if (!studentMap.has(date)) {
        studentMap.set(date, record.score);
      }
    }
  }

  // Pagination に渡す searchParams（page を除く）
  const paginationParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key !== "page" && value) {
      paginationParams[key] = value;
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">生徒一覧</h2>
        <Link
          href="/teacher/students/new"
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          生徒を追加
        </Link>
      </div>

      <StudentCsvImport />

      <StudentFilter grades={gradeNames} />

      <p className="text-xs text-gray-500">{totalCount}件の生徒</p>

      <StudentTable
        students={students}
        recentDates={recentDates}
        scoreMap={scoreMap}
      />

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        basePath="/teacher/students"
        searchParams={paginationParams}
      />
    </div>
  );
}
