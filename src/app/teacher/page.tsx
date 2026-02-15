import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Teacher, Student, QuizRecord } from "@/lib/types/database";
import { getTodayJST, getRecentDates, formatDateShort, toJSTDateString } from "@/lib/date-utils";
import GradeDistributionChart from "@/components/GradeDistributionChart";
import PassRateTrendChart from "@/components/PassRateTrendChart";

type RecentRecord = Pick<QuizRecord, "taken_at" | "passed" | "score">;

/** Supabase の 1000 行制限を回避してページネーションで全件取得 */
async function fetchAllRecentRecords(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sinceDate: string
): Promise<RecentRecord[]> {
  const PAGE_SIZE = 1000;
  const allRecords: RecentRecord[] = [];
  let from = 0;

  while (true) {
    const { data } = await supabase
      .from("quiz_records")
      .select("taken_at, passed, score")
      .gte("taken_at", `${sinceDate}T00:00:00+09:00`)
      .range(from, from + PAGE_SIZE - 1);

    if (!data || data.length === 0) break;
    allRecords.push(...(data as RecentRecord[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allRecords;
}

/** Supabase の 1000 行制限を回避して全生徒を取得 */
async function fetchAllStudents(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<Student[]> {
  const PAGE_SIZE = 1000;
  const allStudents: Student[] = [];
  let from = 0;

  while (true) {
    const { data } = await supabase
      .from("students")
      .select("*")
      .range(from, from + PAGE_SIZE - 1);

    if (!data || data.length === 0) break;
    allStudents.push(...(data as Student[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allStudents;
}

export default async function TeacherHomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) redirect("/login");

  const { data: teacher } = await supabase
    .from("teachers")
    .select("*")
    .eq("email", user.email)
    .single();

  if (!teacher) redirect("/");

  const typedTeacher = teacher as Teacher;

  const sinceDate = getRecentDates(30).at(-1)!;

  // データ取得（並列）
  const [students, gradesResult, recentRecords, latestRecordsResult] =
    await Promise.all([
      fetchAllStudents(supabase),
      supabase
        .from("grade_definitions")
        .select("*")
        .order("display_order", { ascending: true }),
      fetchAllRecentRecords(supabase, sinceDate),
      supabase
        .from("quiz_records")
        .select("*")
        .order("taken_at", { ascending: false })
        .limit(10),
    ]);

  const grades = gradesResult.data ?? [];
  const latestRecords = (latestRecordsResult.data ?? []) as QuizRecord[];

  // 概要統計
  const totalStudents = students.length;
  const todayJST = getTodayJST();
  const todayRecords = recentRecords.filter(
    (r) => toJSTDateString(r.taken_at) === todayJST
  );
  const todayQuizCount = todayRecords.length;
  const passRate =
    recentRecords.length > 0
      ? Math.round(
          (recentRecords.filter((r) => r.passed).length /
            recentRecords.length) *
            100
        )
      : 0;
  const avgScore =
    recentRecords.length > 0
      ? Math.round(
          recentRecords.reduce((sum, r) => sum + r.score, 0) /
            recentRecords.length
        )
      : 0;

  // グレード分布データ
  const gradeCountMap = new Map<string, number>();
  for (const s of students) {
    gradeCountMap.set(s.current_grade, (gradeCountMap.get(s.current_grade) ?? 0) + 1);
  }
  const gradeDistribution = grades.map((g) => ({
    gradeName: g.grade_name as string,
    percentage: totalStudents > 0
      ? Math.round(((gradeCountMap.get(g.grade_name as string) ?? 0) / totalStudents) * 100)
      : 0,
  }));

  // 合格率推移データ（古い順）
  const recentDates = getRecentDates(30).reverse();
  const recordsByDate = new Map<string, { total: number; passed: number }>();
  for (const r of recentRecords) {
    const date = toJSTDateString(r.taken_at);
    const entry = recordsByDate.get(date) ?? { total: 0, passed: 0 };
    entry.total++;
    if (r.passed) entry.passed++;
    recordsByDate.set(date, entry);
  }
  const passRateTrend = recentDates.map((date) => {
    const entry = recordsByDate.get(date);
    return {
      date,
      rate: entry ? Math.round((entry.passed / entry.total) * 100) : null,
    };
  });

  // 最近の受験活動用の生徒名マップ
  const studentMap = new Map(students.map((s) => [s.id, s]));
  // グレード名マップ
  const gradeNameMap = new Map(
    grades.map((g) => [g.grade_name as string, g.grade_name as string])
  );

  return (
    <div className="flex flex-col gap-6">
      {/* ウェルカムメッセージ */}
      <div className="rounded-xl border-2 border-teal-200 bg-teal-50/50 p-6">
        <h2 className="text-lg font-bold text-teal-800">
          {typedTeacher.name} 先生、こんにちは
        </h2>
        <p className="mt-1 text-sm text-teal-600">
          BT管理システムの教員ダッシュボードへようこそ。
        </p>
      </div>

      {/* 概要統計カード */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="総生徒数" value={`${totalStudents}名`} />
        <StatCard label="本日の受験数" value={`${todayQuizCount}件`} />
        <StatCard label="30日合格率" value={`${passRate}%`} />
        <StatCard label="30日平均スコア" value={`${avgScore}点`} />
      </div>

      {/* チャート */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GradeDistributionChart data={gradeDistribution} />
        <PassRateTrendChart data={passRateTrend} />
      </div>

      {/* 最近の受験活動 */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-gray-700">
          最近の受験活動
        </h3>
        {latestRecords.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">
            受験記録がありません
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-2 font-medium">生徒名</th>
                  <th className="pb-2 font-medium">グレード</th>
                  <th className="pb-2 font-medium">スコア</th>
                  <th className="pb-2 font-medium">結果</th>
                  <th className="pb-2 font-medium">日時</th>
                </tr>
              </thead>
              <tbody>
                {latestRecords.map((record) => {
                  const student = studentMap.get(record.student_id);
                  return (
                    <tr
                      key={record.id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="py-2">
                        {student?.name ?? "不明"}
                      </td>
                      <td className="py-2 text-gray-600">
                        {gradeNameMap.get(record.grade) ?? record.grade}
                      </td>
                      <td className="py-2">{record.score}点</td>
                      <td className="py-2">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            record.passed
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {record.passed ? "合格" : "不合格"}
                        </span>
                      </td>
                      <td className="py-2 text-gray-500">
                        {formatDateShort(record.taken_at.slice(0, 10))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ナビカード */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/teacher/students"
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-colors hover:border-teal-300 hover:bg-teal-50/30"
        >
          <h3 className="text-base font-bold text-gray-800">生徒管理</h3>
          <p className="mt-1 text-sm text-gray-500">
            生徒一覧の閲覧・検索、成績の確認ができます。
          </p>
        </Link>
        <Link
          href="/teacher/grades"
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-colors hover:border-teal-300 hover:bg-teal-50/30"
        >
          <h3 className="text-base font-bold text-gray-800">グレード管理</h3>
          <p className="mt-1 text-sm text-gray-500">
            グレード定義の追加・編集・削除ができます。
          </p>
        </Link>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-teal-700">{value}</p>
    </div>
  );
}
