import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GradeTable from "@/components/GradeTable";
import type { GradeDefinition } from "@/lib/types/database";

export default async function TeacherGradesPage() {
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

  const { data: gradeData } = await supabase
    .from("grade_definitions")
    .select("*")
    .order("display_order", { ascending: true });
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

      <p className="text-xs text-gray-500">{grades.length}件のグレード</p>

      <GradeTable grades={grades} />
    </div>
  );
}
