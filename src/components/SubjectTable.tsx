"use client";

import Link from "next/link";
import { deleteSubject } from "@/app/teacher/subjects/actions";
import type { Subject } from "@/lib/types/database";

type Props = {
  subjects: Subject[];
};

export default function SubjectTable({ subjects }: Props) {
  const handleDelete = async (subject: Subject) => {
    if (!confirm(`科目「${subject.name}」を削除しますか？`)) return;
    const result = await deleteSubject(subject.id);
    if (!result.success) {
      alert(result.message ?? "削除に失敗しました");
    }
  };

  if (subjects.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        科目が登録されていません
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">表示順</th>
            <th scope="col" className="px-3 py-2 font-medium">科目名</th>
            <th scope="col" className="px-3 py-2 font-medium">操作</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((s) => (
            <tr key={s.id} className="border-b border-gray-100 last:border-b-0">
              <td className="px-3 py-2 font-mono text-xs text-gray-600">
                {s.display_order}
              </td>
              <td className="px-3 py-2 font-medium text-gray-800">
                {s.name}
              </td>
              <td className="px-3 py-2">
                <div className="flex gap-2">
                  <Link
                    href={`/teacher/subjects/${s.id}/edit`}
                    className="text-xs text-teal-600 hover:text-teal-800"
                  >
                    編集
                  </Link>
                  <button
                    onClick={() => handleDelete(s)}
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
