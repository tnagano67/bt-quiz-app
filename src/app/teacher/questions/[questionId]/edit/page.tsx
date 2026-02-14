import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import QuestionForm from "@/components/QuestionForm";
import type { Question } from "@/lib/types/database";

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

  const { data: question } = await supabase
    .from("questions")
    .select("*")
    .eq("question_id", Number(questionId))
    .single();

  if (!question) notFound();

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-gray-800">
        問題を編集（ID: {questionId}）
      </h2>
      <QuestionForm mode="edit" defaultValues={question as Question} />
    </div>
  );
}
