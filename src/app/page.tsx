import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    redirect("/login");
  }

  // 教員・生徒チェックを並列実行
  const [{ data: teacher }, { data: student }] = await Promise.all([
    supabase
      .from("teachers")
      .select("id")
      .eq("email", user.email)
      .single(),
    supabase
      .from("students")
      .select("id")
      .eq("email", user.email)
      .single(),
  ]);

  if (teacher) {
    redirect("/teacher");
  }

  if (student) {
    redirect("/student");
  }

  // どちらにも該当しない場合
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="rounded-lg bg-yellow-50 p-8 text-center">
        <p className="text-lg font-bold text-yellow-800">
          アカウントが登録されていません
        </p>
        <p className="mt-2 text-sm text-yellow-600">
          このメールアドレス（{user.email}）は生徒・教員として登録されていません。
          <br />
          管理者にお問い合わせください。
        </p>
      </div>
    </div>
  );
}
