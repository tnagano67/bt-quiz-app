import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Teacher } from "@/lib/types/database";

export default async function TeacherHomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) redirect("/login");

  const { data: teacher } = await supabase
    .from("teachers")
    .select("*")
    .eq("email", user.email)
    .single();

  if (!teacher) redirect("/");

  const typedTeacher = teacher as Teacher;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border-2 border-teal-200 bg-teal-50/50 p-6">
        <h2 className="text-lg font-bold text-teal-800">
          {typedTeacher.name} 先生、こんにちは
        </h2>
        <p className="mt-1 text-sm text-teal-600">
          BT管理システムの教員ダッシュボードへようこそ。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/teacher/students"
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-colors hover:border-teal-300 hover:bg-teal-50/30"
        >
          <h3 className="text-base font-bold text-gray-800">生徒管理</h3>
          <p className="mt-1 text-sm text-gray-500">
            生徒一覧の閲覧・検索、成績の確認ができます。
          </p>
        </Link>
      </div>
    </div>
  );
}
