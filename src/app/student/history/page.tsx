import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { QuizRecord, Subject } from "@/lib/types/database";
import HistoryItem from "@/components/HistoryItem";

export default async function HistoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) redirect("/login");

  // 生徒情報
  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("email", user.email)
    .single();

  if (!student) {
    return (
      <div className="rounded-lg bg-yellow-50 p-6 text-center text-yellow-800">
        <p className="font-bold">生徒情報が登録されていません。</p>
      </div>
    );
  }

  // 科目一覧を取得（名前表示用）
  const { data: subjectData } = await supabase
    .from("subjects")
    .select("*")
    .order("display_order", { ascending: true });
  const subjects = (subjectData ?? []) as Subject[];
  const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));

  // 直近10件の成績記録
  const { data: records, error: recordsError } = await supabase
    .from("quiz_records")
    .select("*")
    .eq("student_id", student.id)
    .order("taken_at", { ascending: false })
    .limit(10);

  if (recordsError) throw new Error("受験記録の取得に失敗しました");

  const allRecords = (records ?? []) as QuizRecord[];

  // 統計（並列実行）
  const [
    { count: totalCount, error: totalError },
    { count: passCount, error: passError },
  ] = await Promise.all([
    supabase
      .from("quiz_records")
      .select("*", { count: "exact", head: true })
      .eq("student_id", student.id),
    supabase
      .from("quiz_records")
      .select("*", { count: "exact", head: true })
      .eq("student_id", student.id)
      .eq("passed", true),
  ]);

  if (totalError || passError) throw new Error("統計データの取得に失敗しました");

  const totalAttempts = totalCount ?? 0;
  const passRate =
    totalAttempts > 0
      ? Math.round(((passCount ?? 0) / totalAttempts) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* 生徒サマリー */}
      <div className="rounded-xl border-2 border-gray-200 border-l-blue-600 border-l-[5px] bg-blue-50/50 p-5">
        <h2 className="mb-3 text-lg font-bold text-gray-900">
          {student.year}年{student.class}組{student.number}番 {student.name}{" "}
          さん
        </h2>
        <div className="grid grid-cols-1 gap-4 text-center sm:grid-cols-2">
          <div>
            <p className="text-xs text-gray-500">総受験回数</p>
            <p className="text-lg font-bold text-gray-900">
              {totalAttempts}回
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">合格率</p>
            <p className="text-lg font-bold text-green-600">{passRate}%</p>
          </div>
        </div>
      </div>

      {/* 履歴一覧 */}
      <div>
        <h3 className="mb-3 text-sm font-bold text-gray-700">
          直近の受験履歴
        </h3>
        {allRecords.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">
            まだ受験記録がありません
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {allRecords.map((record) => {
              const date = new Date(record.taken_at).toLocaleDateString(
                "ja-JP",
                { timeZone: "Asia/Tokyo" }
              );
              return (
                <HistoryItem
                  key={record.id}
                  date={date}
                  grade={record.grade}
                  score={record.score}
                  passed={record.passed}
                  questionIds={record.question_ids}
                  subjectId={record.subject_id}
                  subjectName={subjectMap.get(record.subject_id) ?? ""}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
