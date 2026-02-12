import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRecentDates, isTakenToday } from "@/lib/date-utils";
import StudentInfoCard from "@/components/StudentInfoCard";
import ScoreChart from "@/components/ScoreChart";
import Link from "next/link";
import type { GradeDefinition, QuizRecord } from "@/lib/types/database";

export default async function StudentHomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 生徒情報を取得
  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("profile_id", user.id)
    .single();

  if (!student) {
    return (
      <div className="rounded-lg bg-yellow-50 p-6 text-center text-yellow-800">
        <p className="font-bold">生徒情報が登録されていません。</p>
        <p className="mt-1 text-sm">管理者にお問い合わせください。</p>
      </div>
    );
  }

  // グレード定義を全件取得
  const { data: grades } = await supabase
    .from("grade_definitions")
    .select("*")
    .order("display_order", { ascending: true });

  const allGrades = (grades ?? []) as GradeDefinition[];
  const currentGrade = allGrades.find(
    (g) => g.grade_name === student.current_grade
  );
  if (!currentGrade) redirect("/login");

  const currentIndex = allGrades.findIndex(
    (g) => g.grade_name === student.current_grade
  );
  const nextGrade =
    currentIndex < allGrades.length - 1 ? allGrades[currentIndex + 1] : null;

  // 直近10日間の成績を取得
  const recentDates = getRecentDates(10);
  const oldestDate = recentDates[recentDates.length - 1];

  const { data: records } = await supabase
    .from("quiz_records")
    .select("*")
    .eq("student_id", student.id)
    .gte("taken_at", `${oldestDate}T00:00:00+09:00`)
    .order("taken_at", { ascending: false });

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

  const hasTakenToday = isTakenToday(student.last_challenge_date);

  return (
    <div className="flex flex-col gap-6">
      <StudentInfoCard
        student={student}
        currentGrade={currentGrade}
        nextGrade={nextGrade}
        hasTakenToday={hasTakenToday}
      />

      <ScoreChart scores={scores} />

      <div className="flex gap-3">
        <Link
          href="/student/quiz"
          className="flex-1 rounded-lg bg-blue-600 py-3 text-center font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          小テストを受ける
        </Link>
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
