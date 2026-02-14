import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GradeForm from "@/components/GradeForm";

export default async function NewGradePage() {
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

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold text-gray-800">グレードを追加</h2>
      <GradeForm mode="create" />
    </div>
  );
}
