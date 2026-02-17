import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import TeacherDeleteButton from "@/components/TeacherDeleteButton";
import TeacherCsvImport from "@/components/TeacherCsvImport";

export default async function TeacherTeachersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) redirect("/login");

  // 教員チェック
  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("email", user.email)
    .single();
  if (!teacher) redirect("/");

  // 教員一覧を取得
  const { data: teacherData } = await supabase
    .from("teachers")
    .select("*")
    .order("created_at", { ascending: false });

  const teachers = (teacherData ?? []) as {
    id: string;
    email: string;
    name: string;
    created_at: string;
  }[];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">教員管理</h2>
        <TeacherCsvImport />
      </div>

      <p className="text-xs text-gray-500">{teachers.length}件の教員</p>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500">
              <th scope="col" className="px-3 py-2 font-medium">氏名</th>
              <th scope="col" className="px-3 py-2 font-medium">メール</th>
              <th scope="col" className="px-3 py-2 font-medium">登録日</th>
              <th scope="col" className="px-3 py-2 font-medium" aria-label="操作"></th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((t) => (
              <tr
                key={t.id}
                className="border-b border-gray-100 last:border-b-0"
              >
                <td className="px-3 py-2 font-medium text-gray-800">
                  {t.name}
                </td>
                <td className="px-3 py-2 text-gray-600">{t.email}</td>
                <td className="px-3 py-2 text-gray-500">
                  {t.created_at.slice(0, 10)}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/teacher/teachers/${t.id}/edit`}
                      className="text-xs text-teal-600 hover:text-teal-800"
                    >
                      編集
                    </Link>
                    {t.email !== user.email && (
                      <TeacherDeleteButton teacherId={t.id} teacherName={t.name} />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
