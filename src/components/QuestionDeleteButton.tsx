"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteQuestion } from "@/app/teacher/questions/actions";

type Props = {
  questionId: number;
  subjectId: string;
};

export default function QuestionDeleteButton({ questionId, subjectId }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`問題ID ${questionId} を削除しますか？`)) return;

    setDeleting(true);
    const result = await deleteQuestion(questionId, subjectId);

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
