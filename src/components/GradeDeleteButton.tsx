"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteGrade } from "@/app/teacher/grades/actions";

type Props = {
  gradeId: string;
  gradeName: string;
};

export default function GradeDeleteButton({ gradeId, gradeName }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`グレード「${gradeName}」を削除しますか？`)) return;

    setDeleting(true);
    const result = await deleteGrade(gradeId);

    if (!result.success) {
      alert(result.message ?? "削除に失敗しました");
      setDeleting(false);
      return;
    }

    router.refresh();
  };

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
    >
      {deleting ? "削除中..." : "削除"}
    </button>
  );
}
