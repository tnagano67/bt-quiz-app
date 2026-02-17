import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRecentDates } from "@/lib/date-utils";
import dynamic from "next/dynamic";
import StatisticsCard from "@/components/StatisticsCard";
import Link from "next/link";

const ScoreChart = dynamic(() => import("@/components/ScoreChart"), {
  loading: () => (
    <div className="flex h-64 items-center justify-center rounded-xl border border-gray-200 bg-white">
      <p className="text-sm text-gray-400">チャートを読み込み中...</p>
    </div>
  ),
});
import type {
  Student,
  Subject,
  StudentSubjectProgress,
  QuizRecord,
} from "@/lib/types/database";

type Props = {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ subject?: string }>;
};

export default async function StudentDetailPage({
  params,
  searchParams,
}: Props) {
  const { studentId } = await params;
  const sp = await searchParams;
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

  // 生徒情報を取得
  const { data: studentData } = await supabase
    .from("students")
    .select("*")
    .eq("id", studentId)
    .single();

  if (!studentData) {
    return (
      <div className="rounded-lg bg-yellow-50 p-8 text-center">
        <p className="font-bold text-yellow-800">生徒が見つかりません。</p>
        <Link
          href="/teacher/students"
          className="mt-4 inline-block text-sm text-teal-700 hover:underline"
        >
          生徒一覧に戻る
        </Link>
      </div>
    );
  }

  const student = studentData as Student;

  // 科目一覧を取得
  const { data: subjectData } = await supabase
    .from("subjects")
    .select("*")
    .order("display_order", { ascending: true });
  const subjects = (subjectData ?? []) as Subject[];
  const selectedSubjectId = sp.subject ?? subjects[0]?.id ?? "";

  // 直近30日間の成績と進捗を並列取得
  const recentDates = getRecentDates(30);
  const oldestDate = recentDates[recentDates.length - 1];

  let recordQuery = supabase
    .from("quiz_records")
    .select("*")
    .eq("student_id", student.id)
    .gte("taken_at", `${oldestDate}T00:00:00+09:00`)
    .order("taken_at", { ascending: false });

  if (selectedSubjectId) {
    recordQuery = recordQuery.eq("subject_id", selectedSubjectId);
  }

  const [progressResult, recordResult] = await Promise.all([
    selectedSubjectId
      ? supabase
          .from("student_subject_progress")
          .select("*")
          .eq("student_id", student.id)
          .eq("subject_id", selectedSubjectId)
          .single()
      : Promise.resolve({ data: null }),
    recordQuery,
  ]);

  const progress = (progressResult.data as StudentSubjectProgress) ?? null;
  const allRecords = (recordResult.data ?? []) as QuizRecord[];

  // 統計計算
  const totalAttempts = allRecords.length;
  const averageScore =
    totalAttempts > 0
      ? Math.round(
          allRecords.reduce((sum, r) => sum + r.score, 0) / totalAttempts
        )
      : 0;
  const highestScore =
    totalAttempts > 0 ? Math.max(...allRecords.map((r) => r.score)) : 0;
  const passRate =
    totalAttempts > 0
      ? Math.round(
          (allRecords.filter((r) => r.passed).length / totalAttempts) * 100
        )
      : 0;

  // チャート用のスコアデータ
  const recordByDate = new Map<string, QuizRecord>();
  for (const record of allRecords) {
    const date = record.taken_at.slice(0, 10);
    if (!recordByDate.has(date)) {
      recordByDate.set(date, record);
    }
  }

  const scores = recentDates.map((date) => {
    const record = recordByDate.get(date);
    return {
      date,
      score: record ? record.score : null,
      passed: record ? record.passed : null,
    };
  });

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/teacher/students"
        className="text-sm text-teal-700 hover:underline"
      >
        &larr; 生徒一覧に戻る
      </Link>

      {/* 基本情報 */}
      <div className="rounded-xl border-2 border-teal-200 bg-teal-50/50 p-6">
        <h2 className="text-lg font-bold text-teal-800">{student.name}</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <p className="text-xs text-teal-600">学年・組・番号</p>
            <p className="font-medium text-gray-800">
              {student.year}年{student.class}組{student.number}番
            </p>
          </div>
          <div>
            <p className="text-xs text-teal-600">現在のグレード</p>
            <p className="font-medium text-gray-800">
              {progress?.current_grade ?? "-"}
            </p>
          </div>
          <div>
            <p className="text-xs text-teal-600">連続合格日数</p>
            <p className="font-medium text-gray-800">
              {progress?.consecutive_pass_days ?? 0}日
            </p>
          </div>
          <div>
            <p className="text-xs text-teal-600">最終挑戦日</p>
            <p className="font-medium text-gray-800">
              {progress?.last_challenge_date ?? "未受験"}
            </p>
          </div>
        </div>
      </div>

      {/* 科目タブ */}
      {subjects.length > 1 && (
        <div className="flex gap-2">
          {subjects.map((s) => (
            <Link
              key={s.id}
              href={`/teacher/students/${studentId}?subject=${s.id}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                s.id === selectedSubjectId
                  ? "bg-teal-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s.name}
            </Link>
          ))}
        </div>
      )}

      {/* 統計 */}
      {totalAttempts > 0 ? (
        <>
          <StatisticsCard
            totalAttempts={totalAttempts}
            averageScore={averageScore}
            highestScore={highestScore}
            passRate={passRate}
          />
          <ScoreChart
            scores={scores}
            title="直近30日間の成績"
            maxTicksLimit={10}
          />
        </>
      ) : (
        <div className="rounded-lg bg-gray-50 p-8 text-center text-sm text-gray-500">
          直近30日間の受験記録がありません。
        </div>
      )}
    </div>
  );
}
