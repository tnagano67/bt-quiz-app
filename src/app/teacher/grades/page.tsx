import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GradeTable from "@/components/GradeTable";
import type { GradeDefinition, Subject } from "@/lib/types/database";

type Props = {
  searchParams: Promise<{
    subject?: string;
  }>;
};

export default async function TeacherGradesPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) redirect("/login");

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("email", user.email)
    .single();
  if (!teacher) redirect("/");

  // 科目一覧を取得
  const { data: subjectData } = await supabase
    .from("subjects")
    .select("*")
    .order("display_order", { ascending: true });
  const subjects = (subjectData ?? []) as Subject[];

  // 選択された科目（デフォルトは最初の科目）
  const selectedSubjectId = params.subject ?? subjects[0]?.id ?? "";
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  // グレード定義を取得（科目フィルター付き）
  let gradeQuery = supabase
    .from("grade_definitions")
    .select("*")
    .order("display_order", { ascending: true });

  if (selectedSubjectId) {
    gradeQuery = gradeQuery.eq("subject_id", selectedSubjectId);
  }

  const { data: gradeData } = await gradeQuery;
  const grades = (gradeData ?? []) as GradeDefinition[];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">グレード管理</h2>
        <Link
          href="/teacher/grades/new"
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          追加
        </Link>
      </div>

      {/* 科目フィルター */}
      {subjects.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {subjects.map((s) => (
            <Link
              key={s.id}
              href={`/teacher/grades?subject=${s.id}`}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedSubjectId === s.id
                  ? "bg-teal-100 text-teal-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s.name}
            </Link>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500">
        {selectedSubject ? `${selectedSubject.name} — ` : ""}
        {grades.length}件のグレード
      </p>

      <GradeTable grades={grades} />
    </div>
  );
}
