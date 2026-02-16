import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRecentDates, isTakenToday } from "@/lib/date-utils";
import SubjectCard from "@/components/SubjectCard";
import ScoreChart from "@/components/ScoreChart";
import Link from "next/link";
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

  // 科目一覧を取得
  const { data: subjectData } = await supabase
    .from("subjects")
    .select("*")
    .order("display_order", { ascending: true });
  const subjects = (subjectData ?? []) as Subject[];

  // 全科目の進捗を取得
  const { data: progressData } = await supabase
    .from("student_subject_progress")
    .select("*")
    .eq("student_id", student.id);

  const progressMap = new Map<string, StudentSubjectProgress>();
  for (const p of (progressData ?? []) as StudentSubjectProgress[]) {
    progressMap.set(p.subject_id, p);
  }

  // 全科目のグレード定義を取得
  const { data: gradeData } = await supabase
    .from("grade_definitions")
    .select("*")
    .order("display_order", { ascending: true });
  const allGrades = (gradeData ?? []) as GradeDefinition[];

  // 科目ごとのグレード情報を整理
  const gradesBySubject = new Map<string, GradeDefinition[]>();
  for (const g of allGrades) {
    const list = gradesBySubject.get(g.subject_id) ?? [];
    list.push(g);
    gradesBySubject.set(g.subject_id, list);
  }

  // 直近10日間の成績を取得（全科目合算）
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
