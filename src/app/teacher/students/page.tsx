import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRecentDates } from "@/lib/date-utils";
import StudentFilter from "@/components/StudentFilter";
import StudentTable from "@/components/StudentTable";
import StudentCsvImport from "@/components/StudentCsvImport";
import type {
  Student,
  GradeDefinition,
  QuizRecord,
} from "@/lib/types/database";

type Props = {
  searchParams: Promise<{
    year?: string;
    class?: string;
    gradeFrom?: string;
    gradeTo?: string;
    name?: string;
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

  // 全生徒を取得
  const { data: studentData } = await supabase
    .from("students")
    .select("*")
    .order("year")
    .order("class")
    .order("number");
  let students = (studentData ?? []) as Student[];

  // フィルタリング
  if (params.year) {
    students = students.filter((s) => s.year === Number(params.year));
  }
  if (params.class) {
    students = students.filter((s) => s.class === Number(params.class));
  }
  if (params.gradeFrom) {
    const fromIndex = gradeNames.indexOf(params.gradeFrom);
    if (fromIndex !== -1) {
      students = students.filter((s) => {
        const idx = gradeNames.indexOf(s.current_grade);
        return idx >= fromIndex;
      });
    }
  }
  if (params.gradeTo) {
    const toIndex = gradeNames.indexOf(params.gradeTo);
    if (toIndex !== -1) {
      students = students.filter((s) => {
        const idx = gradeNames.indexOf(s.current_grade);
        return idx <= toIndex;
      });
    }
  }
  if (params.name) {
    students = students.filter((s) => s.name.includes(params.name!));
  }

  // 直近3日間のスコアを取得
  const recentDates = getRecentDates(3);
  const oldestDate = recentDates[recentDates.length - 1];

  const { data: records } = await supabase
    .from("quiz_records")
    .select("*")
    .gte("taken_at", `${oldestDate}T00:00:00+09:00`)
    .order("taken_at", { ascending: false });

  const allRecords = (records ?? []) as QuizRecord[];

  // student_id → date → score のマップを作成
  const scoreMap = new Map<string, Map<string, number | null>>();
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

      <p className="text-xs text-gray-500">{students.length}件の生徒</p>

      <StudentTable
        students={students}
        recentDates={recentDates}
        scoreMap={scoreMap}
      />
    </div>
  );
}
