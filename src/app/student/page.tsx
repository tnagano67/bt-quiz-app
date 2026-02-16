import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRecentDates, isTakenToday } from "@/lib/date-utils";
import dynamic from "next/dynamic";
import SubjectCard from "@/components/SubjectCard";
import Link from "next/link";

const ScoreChart = dynamic(() => import("@/components/ScoreChart"), {
  loading: () => (
    <div className="flex h-64 items-center justify-center rounded-xl border border-gray-200 bg-white">
      <p className="text-sm text-gray-400">チャートを読み込み中...</p>
    </div>
  ),
});
import type {
  Subject,
  StudentSubjectProgress,
  GradeDefinition,
  QuizRecord,
} from "@/lib/types/database";

export default async function StudentHomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) redirect("/login");

  // 生徒情報を取得
  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("email", user.email)
    .single();

  if (!student) {
    return (
      <div className="rounded-lg bg-yellow-50 p-6 text-center text-yellow-800">
        <p className="font-bold">生徒情報が登録されていません。</p>
        <p className="mt-1 text-sm">管理者にお問い合わせください。</p>
      </div>
    );
  }

  // 直近10日間の日付を事前計算
  const recentDates = getRecentDates(10);
  const oldestDate = recentDates[recentDates.length - 1];

  // 科目・進捗・グレード・成績を並列取得
  const [
    { data: subjectData, error: subjectError },
    { data: progressData, error: progressError },
    { data: gradeData, error: gradeError },
    { data: records, error: recordsError },
  ] = await Promise.all([
    supabase
      .from("subjects")
      .select("*")
      .order("display_order", { ascending: true }),
    supabase
      .from("student_subject_progress")
      .select("*")
      .eq("student_id", student.id),
    supabase
      .from("grade_definitions")
      .select("*")
      .order("display_order", { ascending: true }),
    supabase
      .from("quiz_records")
      .select("*")
      .eq("student_id", student.id)
      .gte("taken_at", `${oldestDate}T00:00:00+09:00`)
      .order("taken_at", { ascending: false }),
  ]);

  if (subjectError) throw new Error("科目データの取得に失敗しました");
  if (progressError) throw new Error("進捗データの取得に失敗しました");
  if (gradeError) throw new Error("グレードデータの取得に失敗しました");
  if (recordsError) throw new Error("受験記録の取得に失敗しました");

  const subjects = (subjectData ?? []) as Subject[];

  const progressMap = new Map<string, StudentSubjectProgress>();
  for (const p of (progressData ?? []) as StudentSubjectProgress[]) {
    progressMap.set(p.subject_id, p);
  }

  const allGrades = (gradeData ?? []) as GradeDefinition[];
  const gradesBySubject = new Map<string, GradeDefinition[]>();
  for (const g of allGrades) {
    const list = gradesBySubject.get(g.subject_id) ?? [];
    list.push(g);
    gradesBySubject.set(g.subject_id, list);
  }

  const allRecords = (records ?? []) as QuizRecord[];

  // 日付ごとのスコアマップを作成
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
      <h2 className="text-lg font-bold text-gray-900">
        {student.year}年{student.class}組{student.number}番 {student.name} さん
      </h2>

      {/* 科目カード */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {subjects.map((subject) => {
          const progress = progressMap.get(subject.id) ?? null;
          const subjectGrades = gradesBySubject.get(subject.id) ?? [];
          const currentGrade = progress
            ? subjectGrades.find(
                (g) => g.grade_name === progress.current_grade
              ) ?? null
            : null;
          const currentIndex = currentGrade
            ? subjectGrades.findIndex(
                (g) => g.grade_name === currentGrade.grade_name
              )
            : -1;
          const nextGrade =
            currentIndex >= 0 && currentIndex < subjectGrades.length - 1
              ? subjectGrades[currentIndex + 1]
              : null;
          const hasTaken = isTakenToday(
            progress?.last_challenge_date ?? null
          );

          return (
            <SubjectCard
              key={subject.id}
              subject={subject}
              progress={progress}
              currentGrade={currentGrade}
              nextGrade={nextGrade}
              hasTakenToday={hasTaken}
            />
          );
        })}
      </div>

      <ScoreChart scores={scores} />

      <div className="flex gap-3">
        <Link
          href="/student/history"
          className="flex-1 rounded-lg border border-gray-300 bg-white py-3 text-center font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
        >
          履歴を見る
        </Link>
      </div>
    </div>
  );
}
