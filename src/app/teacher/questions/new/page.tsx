import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import QuestionForm from "@/components/QuestionForm";
import type { Subject } from "@/lib/types/database";

export default async function NewQuestionPage() {
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

  const { data: subjectData } = await supabase
    .from("subjects")
    .select("*")
    .order("display_order", { ascending: true });
  const subjects = (subjectData ?? []) as Subject[];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-gray-800">問題を追加</h2>
      <QuestionForm mode="create" subjects={subjects} />
    </div>
  );
}
