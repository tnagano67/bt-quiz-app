import Link from "next/link";
import { formatDateShort } from "@/lib/date-utils";
import type { Student } from "@/lib/types/database";

type Props = {
  students: Student[];
  recentDates: string[];
  scoreMap: Map<string, Map<string, number | null>>;
};

export default function StudentTable({
  students,
  recentDates,
  scoreMap,
}: Props) {
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
            <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-gray-600">
              学年
            </th>
            <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-gray-600">
              組
            </th>
            <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-gray-600">
              番号
            </th>
            <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-gray-600">
              氏名
            </th>
            <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-gray-600">
              グレード
            </th>
            <th className="whitespace-nowrap px-3 py-2 text-xs font-medium text-gray-600">
              最終挑戦日
            </th>
            {recentDates.map((date) => (
              <th
                key={date}
                className="whitespace-nowrap px-3 py-2 text-center text-xs font-medium text-gray-600"
              >
                {formatDateShort(date)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map((student) => {
            const studentScores = scoreMap.get(student.id);
            return (
              <tr
                key={student.id}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="whitespace-nowrap px-3 py-2">{student.year}</td>
                <td className="whitespace-nowrap px-3 py-2">{student.class}</td>
                <td className="whitespace-nowrap px-3 py-2">
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
                    {student.current_grade}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-gray-500">
                  {student.last_challenge_date
                    ? formatDateShort(student.last_challenge_date)
                    : "-"}
                </td>
                {recentDates.map((date) => {
                  const score = studentScores?.get(date) ?? null;
                  return (
                    <td
                      key={date}
                      className="whitespace-nowrap px-3 py-2 text-center"
                    >
                      {score !== null ? (
                        <span
                          className={`text-xs font-medium ${
                            score >= 80
                              ? "text-green-600"
                              : score >= 60
                                ? "text-yellow-600"
                                : "text-red-600"
                          }`}
                        >
                          {score}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
