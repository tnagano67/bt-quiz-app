"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteStudent } from "@/app/teacher/students/actions";
import ConfirmDialog from "./ConfirmDialog";

type Props = {
  studentId: string;
  studentName: string;
};

export default function StudentDeleteButton({ studentId, studentName }: Props) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setDeleting(true);
    setError(null);
    const result = await deleteStudent(studentId);

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
        title="生徒を削除"
        message={error ?? `${studentName} を削除しますか？関連する受験記録もすべて削除されます。`}
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
        isLoading={deleting}
      />
    </>
  );
}
