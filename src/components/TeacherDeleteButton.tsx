"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteTeacher } from "@/app/teacher/teachers/actions";
import ConfirmDialog from "./ConfirmDialog";

type Props = {
  teacherId: string;
  teacherName: string;
};

export default function TeacherDeleteButton({ teacherId, teacherName }: Props) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setDeleting(true);
    setError(null);
    const result = await deleteTeacher(teacherId);

    if (!result.success) {
      setError(result.message ?? "削除に失敗しました");
      setDeleting(false);
      return;
    }

    setShowConfirm(false);
    router.refresh();
  };

  return (
    <>
      <button
        onClick={() => { setShowConfirm(true); setError(null); }}
        className="rounded px-2 py-1 text-sm text-red-500 hover:bg-red-50 hover:text-red-700"
      >
        削除
      </button>
      <ConfirmDialog
        isOpen={showConfirm}
        title="教員を削除"
        message={error ?? `「${teacherName}」を削除しますか？`}
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
        isLoading={deleting}
      />
    </>
  );
}
