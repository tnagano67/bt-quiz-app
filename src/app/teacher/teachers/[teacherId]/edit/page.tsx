import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TeacherForm from "@/components/TeacherForm";
import type { Teacher } from "@/lib/types/database";

type Props = {
  params: Promise<{ teacherId: string }>;
};

export default async function EditTeacherPage({ params }: Props) {
  const { teacherId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) redirect("/login");

  const { data: currentTeacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("email", user.email)
    .single();
  if (!currentTeacher) redirect("/");

  const { data: teacher } = await supabase
    .from("teachers")
    .select("*")
    .eq("id", teacherId)
    .single();

  if (!teacher) notFound();

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-gray-800">教員を編集</h2>
      <TeacherForm mode="edit" defaultValues={teacher as Teacher} />
    </div>
  );
}
