"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteStudent } from "@/app/teacher/students/actions";

type Props = {
  studentId: string;
  studentName: string;
};

export default function StudentDeleteButton({ studentId, studentName }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`${studentName} を削除しますか？関連する受験記録もすべて削除されます。`)) return;

    setDeleting(true);
    const result = await deleteStudent(studentId);

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
