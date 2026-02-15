"use client";

import Link from "next/link";
import { deleteGrade } from "@/app/teacher/grades/actions";
import type { GradeDefinition } from "@/lib/types/database";

type Props = {
  grades: GradeDefinition[];
};

export default function GradeTable({ grades }: Props) {
  const handleDelete = async (grade: GradeDefinition) => {
    if (!confirm(`グレード「${grade.grade_name}」を削除しますか？`)) return;
    const result = await deleteGrade(grade.id);
    if (!result.success) {
      alert(result.message ?? "削除に失敗しました");
    }
  };

  if (grades.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        グレードが登録されていません
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">表示順</th>
            <th scope="col" className="px-3 py-2 font-medium">グレード名</th>
            <th scope="col" className="px-3 py-2 font-medium">問題ID範囲</th>
            <th scope="col" className="px-3 py-2 font-medium">出題数</th>
            <th scope="col" className="px-3 py-2 font-medium">合格点</th>
            <th scope="col" className="px-3 py-2 font-medium">必要連続日数</th>
            <th scope="col" className="px-3 py-2 font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          {grades.map((g) => (
            <tr key={g.id} className="border-b border-gray-100 last:border-b-0">
              <td className="px-3 py-2 font-mono text-xs text-gray-600">
                {g.display_order}
              </td>
              <td className="px-3 py-2 font-medium text-gray-800">
                {g.grade_name}
              </td>
              <td className="px-3 py-2 text-gray-600">
                {g.start_id} - {g.end_id}
              </td>
              <td className="px-3 py-2 text-center text-gray-600">
                {g.num_questions}
              </td>
              <td className="px-3 py-2 text-center text-gray-600">
                {g.pass_score}点
              </td>
              <td className="px-3 py-2 text-center text-gray-600">
                {g.required_consecutive_days}日
              </td>
              <td className="px-3 py-2">
                <div className="flex gap-2">
                  <Link
                    href={`/teacher/grades/${g.id}/edit`}
                    className="text-xs text-teal-600 hover:text-teal-800"
                  >
                    編集
                  </Link>
                  <button
                    onClick={() => handleDelete(g)}
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
