import Link from "next/link";

type Props = {
  date: string;
  grade: string;
  score: number;
  passed: boolean;
  questionIds: number[];
};

export default function HistoryItem({
  date,
  grade,
  score,
  passed,
  questionIds,
}: Props) {
  const retryParam = questionIds.join(",");

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        <span className="text-sm text-gray-500">{date}</span>
        <span className="text-sm font-medium text-gray-700">{grade}</span>
        <span className="text-lg font-bold text-gray-900">{score}%</span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
            passed
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {passed ? "合格" : "不合格"}
        </span>
      </div>
      <Link
        href={`/student/quiz?retry=${retryParam}`}
        className="self-end rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 sm:self-auto"
      >
        再受験
      </Link>
    </div>
  );
}
