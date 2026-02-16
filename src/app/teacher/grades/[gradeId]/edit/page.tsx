import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GradeForm from "@/components/GradeForm";
import type { GradeDefinition, Subject } from "@/lib/types/database";

type Props = {
  params: Promise<{ gradeId: string }>;
};

export default async function EditGradePage({ params }: Props) {
  const { gradeId } = await params;
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

  const { data: grade } = await supabase
    .from("grade_definitions")
    .select("*")
    .eq("id", gradeId)
    .single();

  if (!grade) notFound();

  const typedGrade = grade as GradeDefinition;

  // 科目名を取得
  const { data: subject } = await supabase
    .from("subjects")
    .select("name")
    .eq("id", typedGrade.subject_id)
    .single();

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-gray-800">
        グレードを編集（{typedGrade.grade_name}）
      </h2>
      <GradeForm
        mode="edit"
        defaultValues={typedGrade}
        subjectName={(subject as Subject | null)?.name ?? ""}
      />
    </div>
  );
}
