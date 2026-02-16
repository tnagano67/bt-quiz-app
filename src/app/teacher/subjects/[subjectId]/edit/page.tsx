import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SubjectForm from "@/components/SubjectForm";
import type { Subject } from "@/lib/types/database";

type Props = {
  params: Promise<{ subjectId: string }>;
};

export default async function EditSubjectPage({ params }: Props) {
  const { subjectId } = await params;
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

  const { data: subject } = await supabase
    .from("subjects")
    .select("*")
    .eq("id", subjectId)
    .single();

  if (!subject) notFound();

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-gray-800">
        科目を編集（{(subject as Subject).name}）
      </h2>
      <SubjectForm mode="edit" defaultValues={subject as Subject} />
    </div>
  );
}
