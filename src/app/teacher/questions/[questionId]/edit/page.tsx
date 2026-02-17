import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import QuestionForm from "@/components/QuestionForm";
import type { Question, Subject } from "@/lib/types/database";

type Props = {
  params: Promise<{ questionId: string }>;
};

export default async function EditQuestionPage({ params }: Props) {
  const { questionId } = await params;
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

  // 問題と科目一覧を並列取得
  const [{ data: question }, { data: subjects }] = await Promise.all([
    supabase
      .from("questions")
      .select("*")
      .eq("question_id", Number(questionId))
      .single(),
    supabase.from("subjects").select("id, name"),
  ]);

  if (!question) notFound();

  const typedQuestion = question as Question;
  const subjectMap = new Map(
    (subjects ?? []).map((s: Pick<Subject, "id" | "name">) => [s.id, s.name])
  );

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-gray-800">
        問題を編集（ID: {questionId}）
      </h2>
      <QuestionForm
        mode="edit"
        defaultValues={typedQuestion}
        subjectName={subjectMap.get(typedQuestion.subject_id) ?? ""}
      />
    </div>
  );
}
