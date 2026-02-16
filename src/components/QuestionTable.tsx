"use client";

import Link from "next/link";
import { deleteQuestion } from "@/app/teacher/questions/actions";
import type { Question } from "@/lib/types/database";

type Props = {
  questions: Question[];
};

export default function QuestionTable({ questions }: Props) {
  const handleDelete = async (q: Question) => {
    if (!confirm(`問題ID ${q.question_id} を削除しますか？`)) return;
    const result = await deleteQuestion(q.question_id, q.subject_id);
    if (!result.success) {
      alert(result.message ?? "削除に失敗しました");
    }
  };

  if (questions.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        問題が見つかりません
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">ID</th>
            <th scope="col" className="px-3 py-2 font-medium">問題文</th>
            <th scope="col" className="hidden px-3 py-2 font-medium md:table-cell">選択肢1</th>
            <th scope="col" className="hidden px-3 py-2 font-medium md:table-cell">選択肢2</th>
            <th scope="col" className="hidden px-3 py-2 font-medium md:table-cell">選択肢3</th>
            <th scope="col" className="hidden px-3 py-2 font-medium md:table-cell">選択肢4</th>
            <th scope="col" className="px-3 py-2 font-medium">正解</th>
            <th scope="col" className="px-3 py-2 font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          {questions.map((q) => (
            <tr key={q.id} className="border-b border-gray-100 last:border-b-0">
              <td className="px-3 py-2 font-mono text-xs text-gray-600">
                {q.question_id}
              </td>
              <td className="max-w-48 truncate px-3 py-2 text-gray-800">
                {q.question_text}
              </td>
              <td className="hidden max-w-24 truncate px-3 py-2 text-gray-600 md:table-cell">
                {q.choice_1}
              </td>
              <td className="hidden max-w-24 truncate px-3 py-2 text-gray-600 md:table-cell">
                {q.choice_2}
              </td>
              <td className="hidden max-w-24 truncate px-3 py-2 text-gray-600 md:table-cell">
                {q.choice_3}
              </td>
              <td className="hidden max-w-24 truncate px-3 py-2 text-gray-600 md:table-cell">
                {q.choice_4}
              </td>
              <td className="px-3 py-2 text-center font-medium text-teal-700">
                {q.correct_answer}
              </td>
              <td className="px-3 py-2">
                <div className="flex gap-2">
                  <Link
                    href={`/teacher/questions/${q.question_id}/edit`}
                    className="text-xs text-teal-600 hover:text-teal-800"
                  >
                    編集
                  </Link>
                  <button
                    onClick={() => handleDelete(q)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    削除
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
