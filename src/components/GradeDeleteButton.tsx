"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteGrade } from "@/app/teacher/grades/actions";
import ConfirmDialog from "./ConfirmDialog";

type Props = {
  gradeId: string;
  gradeName: string;
};

export default function GradeDeleteButton({ gradeId, gradeName }: Props) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setDeleting(true);
    setError(null);
    const result = await deleteGrade(gradeId);

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
        title="グレードを削除"
        message={error ?? `グレード「${gradeName}」を削除しますか？`}
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
        isLoading={deleting}
      />
    </>
  );
}
