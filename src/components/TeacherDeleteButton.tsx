"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteTeacher } from "@/app/teacher/teachers/actions";

type Props = {
  teacherId: string;
  teacherName: string;
};

export default function TeacherDeleteButton({ teacherId, teacherName }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`「${teacherName}」を削除しますか？`)) return;

    setDeleting(true);
    const result = await deleteTeacher(teacherId);

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
