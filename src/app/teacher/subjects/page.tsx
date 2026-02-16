import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SubjectTable from "@/components/SubjectTable";
import type { Subject } from "@/lib/types/database";

export default async function TeacherSubjectsPage() {
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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">科目管理</h2>
        <Link
          href="/teacher/subjects/new"
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          追加
        </Link>
      </div>

      <p className="text-xs text-gray-500">{subjects.length}件の科目</p>

      <SubjectTable subjects={subjects} />
    </div>
  );
}
