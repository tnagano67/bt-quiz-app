import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import QuestionTable from "@/components/QuestionTable";
import CsvImport from "@/components/CsvImport";
import Pagination from "@/components/Pagination";
import type { Question, GradeDefinition, Subject } from "@/lib/types/database";

const PAGE_SIZE = 50;

type Props = {
  searchParams: Promise<{
    subject?: string;
    grade?: string;
    page?: string;
  }>;
};

export default async function TeacherQuestionsPage({ searchParams }: Props) {
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

  // グレード定義を取得（選択科目のみ）
  let gradeQuery = supabase
    .from("grade_definitions")
    .select("*")
    .order("display_order", { ascending: true });

  if (selectedSubjectId) {
    gradeQuery = gradeQuery.eq("subject_id", selectedSubjectId);
  }

  const { data: gradeData } = await gradeQuery;
  const allGrades = (gradeData ?? []) as GradeDefinition[];

  // サーバーサイドフィルタリング付きクエリを構築
  let query = supabase
    .from("questions")
    .select("*", { count: "exact" })
    .order("question_id", { ascending: true });

  if (selectedSubjectId) {
    query = query.eq("subject_id", selectedSubjectId);
  }

  const selectedGrade = params.grade;
  if (selectedGrade) {
    const gradeDef = allGrades.find((g) => g.grade_name === selectedGrade);
    if (gradeDef) {
      query = query
        .gte("question_id", gradeDef.start_id)
        .lte("question_id", gradeDef.end_id);
    }
  }

  // ページネーション
  const currentPage = Math.max(1, Number(params.page) || 1);
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  query = query.range(from, to);

  const { data: questionData, count } = await query;
  const questions = (questionData ?? []) as Question[];
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Pagination に渡す searchParams（page を除く）
  const paginationParams: Record<string, string> = {};
  if (selectedSubjectId) paginationParams.subject = selectedSubjectId;
  if (selectedGrade) paginationParams.grade = selectedGrade;

  // グレードフィルターのリンク
  const gradeHref = (gradeName?: string) => {
    const p = new URLSearchParams();
    if (selectedSubjectId) p.set("subject", selectedSubjectId);
    if (gradeName) p.set("grade", gradeName);
    const qs = p.toString();
    return `/teacher/questions${qs ? `?${qs}` : ""}`;
  };

  // 科目フィルターのリンク
  const subjectHref = (subjectId: string) => {
    return `/teacher/questions?subject=${subjectId}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">問題管理</h2>
        <CsvImport subjects={subjects} selectedSubjectId={selectedSubjectId} />
      </div>

      {/* 科目フィルター */}
      {subjects.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {subjects.map((s) => (
            <Link
              key={s.id}
              href={subjectHref(s.id)}
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

      {/* グレードフィルター */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={gradeHref()}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            !selectedGrade
              ? "bg-teal-100 text-teal-700"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          すべて
        </Link>
        {allGrades.map((g) => (
          <Link
            key={g.id}
            href={gradeHref(g.grade_name)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              selectedGrade === g.grade_name
                ? "bg-teal-100 text-teal-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {g.grade_name}
            <span className="ml-1 text-gray-400">
              ({g.start_id}-{g.end_id})
            </span>
          </Link>
        ))}
      </div>

      <p className="text-xs text-gray-500">{totalCount}件の問題</p>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        basePath="/teacher/questions"
        searchParams={paginationParams}
      />

      <QuestionTable questions={questions} />

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        basePath="/teacher/questions"
        searchParams={paginationParams}
      />
    </div>
  );
}
