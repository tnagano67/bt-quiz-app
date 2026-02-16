"use client";

import Link from "next/link";
import { formatDateShort } from "@/lib/date-utils";
import { deleteStudent } from "@/app/teacher/students/actions";
import type { Student, StudentSubjectProgress } from "@/lib/types/database";

type Props = {
  students: Student[];
  recentDates: string[];
  scoreMap: Record<string, Record<string, number | null>>;
  progressMap: Record<string, StudentSubjectProgress>;
};

export default function StudentTable({
  students,
  recentDates,
  scoreMap,
  progressMap,
}: Props) {
  const handleDelete = async (student: Student) => {
    if (!confirm(`${student.name} を削除しますか？関連する受験記録もすべて削除されます。`)) return;
    const result = await deleteStudent(student.id);
    if (!result.success) {
      alert(result.message ?? "削除に失敗しました");
    }
  };

  if (students.length === 0) {
    return (
      <div className="rounded-lg bg-gray-50 p-8 text-center text-sm text-gray-500">
        条件に一致する生徒が見つかりません。
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th scope="col" className="whitespace-nowrap px-3 py-2 text-xs font-medium text-gray-600">
              学年
            </th>
            <th scope="col" className="whitespace-nowrap px-3 py-2 text-xs font-medium text-gray-600">
              組
            </th>
            <th scope="col" className="whitespace-nowrap px-3 py-2 text-xs font-medium text-gray-600">
              番号
            </th>
            <th scope="col" className="whitespace-nowrap px-3 py-2 text-xs font-medium text-gray-600">
              氏名
            </th>
            <th scope="col" className="whitespace-nowrap px-3 py-2 text-xs font-medium text-gray-600">
              グレード
            </th>
            <th scope="col" className="whitespace-nowrap px-3 py-2 text-xs font-medium text-gray-600">
              最終挑戦日
            </th>
            {recentDates.map((date) => (
              <th
                key={date}
                scope="col"
                className="hidden whitespace-nowrap px-3 py-2 text-center text-xs font-medium text-gray-600 lg:table-cell"
              >
                {formatDateShort(date)}
              </th>
            ))}
            <th scope="col" className="whitespace-nowrap px-3 py-2 text-xs font-medium text-gray-600">
              操作
            </th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => {
            const studentScores = scoreMap[student.id];
            const progress = progressMap[student.id];
            return (
              <tr
                key={student.id}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="whitespace-nowrap px-3 py-2 text-gray-700">{student.year}</td>
                <td className="whitespace-nowrap px-3 py-2 text-gray-700">{student.class}</td>
                <td className="whitespace-nowrap px-3 py-2 text-gray-700">
                  {student.number}
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <Link
                    href={`/teacher/students/${student.id}`}
                    className="font-medium text-teal-700 hover:text-teal-900 hover:underline"
                  >
                    {student.name}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800">
                    {progress?.current_grade ?? "-"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-gray-500">
                  {progress?.last_challenge_date
                    ? formatDateShort(progress.last_challenge_date)
                    : "-"}
                </td>
                {recentDates.map((date) => {
                  const score = studentScores?.[date] ?? null;
                  return (
                    <td
                      key={date}
                      className="hidden whitespace-nowrap px-3 py-2 text-center lg:table-cell"
                    >
                      {score !== null ? (
                        <span
                          className={`text-xs font-medium ${
                            score >= 80
                              ? "text-green-600"
                              : score >= 60
                                ? "text-yellow-700"
                                : "text-red-600"
                          }`}
                        >
                          {score}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">-</span>
                      )}
                    </td>
                  );
                })}
                <td className="whitespace-nowrap px-3 py-2">
                  <div className="flex gap-2">
                    <Link
                      href={`/teacher/students/${student.id}/edit`}
                      className="text-xs text-teal-600 hover:text-teal-800"
                    >
                      編集
                    </Link>
                    <button
                      onClick={() => handleDelete(student)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      削除
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
