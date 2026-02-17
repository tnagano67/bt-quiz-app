import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type {
  Teacher,
  Student,
  Subject,
  StudentSubjectProgress,
} from "@/lib/types/database";
import { getTodayJST, getRecentDates, formatDateShort, toJSTDateString } from "@/lib/date-utils";
import dynamic from "next/dynamic";
import DashboardFilter from "@/components/DashboardFilter";

const GradeDistributionChart = dynamic(
  () => import("@/components/GradeDistributionChart"),
  {
    loading: () => (
      <div className="flex h-64 items-center justify-center rounded-xl border border-gray-200 bg-white">
        <p className="text-sm text-gray-400">チャートを読み込み中...</p>
      </div>
    ),
  }
);

const PassRateTrendChart = dynamic(
  () => import("@/components/PassRateTrendChart"),
  {
    loading: () => (
      <div className="flex h-64 items-center justify-center rounded-xl border border-gray-200 bg-white">
        <p className="text-sm text-gray-400">チャートを読み込み中...</p>
      </div>
    ),
  }
);

type RecentRecord = { taken_at: string; passed: boolean; score: number };

/** Supabase の 1000 行制限を回避してページネーションで全件取得 */
async function fetchAllRecentRecords(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sinceDate: string,
  studentIds?: string[],
  subjectId?: string
): Promise<RecentRecord[]> {
  const PAGE_SIZE = 1000;
  const allRecords: RecentRecord[] = [];
  let from = 0;

  while (true) {
    let query = supabase
      .from("quiz_records")
      .select("taken_at, passed, score")
      .gte("taken_at", `${sinceDate}T00:00:00+09:00`);

    if (studentIds) {
      query = query.in("student_id", studentIds);
    }
    if (subjectId) {
      query = query.eq("subject_id", subjectId);
    }

    const { data } = await query.range(from, from + PAGE_SIZE - 1);

    if (!data || data.length === 0) break;
    allRecords.push(...(data as RecentRecord[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allRecords;
}

/** Supabase の 1000 行制限を回避して全生徒を取得（フィルター対応） */
async function fetchAllStudents(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filters: { year?: number; classNum?: number }
): Promise<Student[]> {
  const PAGE_SIZE = 1000;
  const allStudents: Student[] = [];
  let from = 0;

  while (true) {
    let query = supabase.from("students").select("*");

    if (filters.year) {
      query = query.eq("year", filters.year);
    }
    if (filters.classNum) {
      query = query.eq("class", filters.classNum);
    }

    const { data } = await query.range(from, from + PAGE_SIZE - 1);

    if (!data || data.length === 0) break;
    allStudents.push(...(data as Student[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return allStudents;
}

type Props = {
  searchParams: Promise<{
    year?: string;
    class?: string;
    subject?: string;
  }>;
};

export default async function TeacherHomePage({ searchParams }: Props) {
  const params = await searchParams;
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

  const yearFilter = params.year ? Number(params.year) : undefined;
  const classFilter = params.class ? Number(params.class) : undefined;
  const hasFilter = !!(yearFilter || classFilter);

  // 科目一覧を取得
  const { data: subjectData } = await supabase
    .from("subjects")
    .select("*")
    .order("display_order", { ascending: true });
  const subjects = (subjectData ?? []) as Subject[];
  const selectedSubjectId = params.subject ?? subjects[0]?.id ?? "";

  const sinceDate = getRecentDates(30).at(-1)!;

  // データ取得（並列）— フィルタなし時は recentRecords も並列実行
  const studentsPromise = fetchAllStudents(supabase, { year: yearFilter, classNum: classFilter });
  const gradesPromise = supabase
    .from("grade_definitions")
    .select("*")
    .eq("subject_id", selectedSubjectId)
    .order("display_order", { ascending: true });

  let students: Student[];
  let gradesResult: Awaited<typeof gradesPromise>;
  let recentRecords: RecentRecord[];

  if (hasFilter) {
    // フィルタあり: students の結果を待ってから studentIds を渡す
    [students, gradesResult] = await Promise.all([studentsPromise, gradesPromise]);
    const studentIds = students.map((s) => s.id);
    recentRecords = await fetchAllRecentRecords(
      supabase,
      sinceDate,
      studentIds,
      selectedSubjectId || undefined
    );
  } else {
    // フィルタなし: 3クエリ並列実行
    [students, gradesResult, recentRecords] = await Promise.all([
      studentsPromise,
      gradesPromise,
      fetchAllRecentRecords(
        supabase,
        sinceDate,
        undefined,
        selectedSubjectId || undefined
      ),
    ]);
  }

  if (gradesResult.error) throw new Error("グレード定義の取得に失敗しました");
  const grades = gradesResult.data ?? [];

  // 選択科目の student_subject_progress を取得
  // .in() に大量の UUID を渡すと URL 長制限を超えるためページネーションで取得
  const targetStudentIds = students.map((s) => s.id);
  const progressList: StudentSubjectProgress[] = [];
  if (selectedSubjectId) {
    if (hasFilter && targetStudentIds.length > 0) {
      // フィルターあり: student_id で絞り込み（バッチ分割）
      const BATCH_SIZE = 200;
      for (let i = 0; i < targetStudentIds.length; i += BATCH_SIZE) {
        const batch = targetStudentIds.slice(i, i + BATCH_SIZE);
        const { data } = await supabase
          .from("student_subject_progress")
          .select("*")
          .eq("subject_id", selectedSubjectId)
          .in("student_id", batch);
        if (data) progressList.push(...(data as StudentSubjectProgress[]));
      }
    } else {
      // フィルターなし: subject_id のみで全件取得（.in() 不要）
      const PAGE_SIZE = 1000;
      let from = 0;
      while (true) {
        const { data } = await supabase
          .from("student_subject_progress")
          .select("*")
          .eq("subject_id", selectedSubjectId)
          .range(from, from + PAGE_SIZE - 1);
        if (!data || data.length === 0) break;
        progressList.push(...(data as StudentSubjectProgress[]));
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
    }
  }
  const progressMap = new Map(progressList.map((p) => [p.student_id, p]));

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

  // グレード分布データ（student_subject_progress から）
  const gradeCountMap = new Map<string, number>();
  for (const p of progressList) {
    gradeCountMap.set(p.current_grade, (gradeCountMap.get(p.current_grade) ?? 0) + 1);
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

  // 頑張っている生徒（連続合格日数が多い順、上位5名）
  const hardworkingStudents = students
    .map((s) => ({ student: s, progress: progressMap.get(s.id) }))
    .filter((x) => x.progress && x.progress.consecutive_pass_days > 0)
    .sort((a, b) => b.progress!.consecutive_pass_days - a.progress!.consecutive_pass_days)
    .slice(0, 5);

  // サボっている生徒（最終受験日が古い順、今日受験済みは除外、上位5名）
  const slackingStudents = students
    .map((s) => ({ student: s, progress: progressMap.get(s.id) }))
    .filter((x) => !x.progress?.last_challenge_date || x.progress.last_challenge_date !== todayJST)
    .sort((a, b) => {
      const aDate = a.progress?.last_challenge_date;
      const bDate = b.progress?.last_challenge_date;
      if (!aDate) return -1;
      if (!bDate) return 1;
      return aDate.localeCompare(bDate);
    })
    .slice(0, 5);

  // フィルターラベル
  const filterLabel = hasFilter
    ? [
        yearFilter ? `${yearFilter}年` : null,
        classFilter ? `${classFilter}組` : null,
      ]
        .filter(Boolean)
        .join(" ")
    : null;

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

      {/* フィルター */}
      <DashboardFilter subjects={subjects} selectedSubjectId={selectedSubjectId} />

      {filterLabel && (
        <p className="text-xs text-gray-500">
          フィルター: {filterLabel}（{totalStudents}名）
        </p>
      )}

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

      {/* 頑張っている生徒 / サボっている生徒 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 頑張っている生徒 */}
        <div className="rounded-xl border border-green-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-green-700">
            頑張っている生徒
          </h3>
          {hardworkingStudents.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">
              該当する生徒がいません
            </p>
          ) : (
            <>
              <div className="mb-1 flex items-center justify-between px-3 text-xs font-medium text-gray-400">
                <span>年/組/番　名前（級）</span>
                <span>連続合格</span>
              </div>
              <ul className="space-y-2">
                {hardworkingStudents.map(({ student: s, progress: p }) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2"
                  >
                    <div>
                      <span className="mr-2 text-xs text-gray-500">
                        {s.year}-{s.class}-{s.number}
                      </span>
                      <span className="text-sm font-medium text-gray-800">
                        {s.name}
                      </span>
                      <span className="ml-2 text-xs text-gray-500">
                        {p?.current_grade ?? "-"}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-green-700">
                      {p?.consecutive_pass_days ?? 0}日連続合格
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* サボっている生徒 */}
        <div className="rounded-xl border border-orange-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-orange-700">
            サボっている生徒
          </h3>
          {slackingStudents.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">
              該当する生徒がいません
            </p>
          ) : (
            <>
              <div className="mb-1 flex items-center justify-between px-3 text-xs font-medium text-gray-400">
                <span>年/組/番　名前（級）</span>
                <span>最終受験日</span>
              </div>
              <ul className="space-y-2">
                {slackingStudents.map(({ student: s, progress: p }) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between rounded-lg bg-orange-50 px-3 py-2"
                  >
                    <div>
                      <span className="mr-2 text-xs text-gray-500">
                        {s.year}-{s.class}-{s.number}
                      </span>
                      <span className="text-sm font-medium text-gray-800">
                        {s.name}
                      </span>
                      <span className="ml-2 text-xs text-gray-500">
                        {p?.current_grade ?? "-"}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-orange-700">
                      最終受験日：{p?.last_challenge_date
                        ? formatDateShort(p.last_challenge_date)
                        : "なし"}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
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
