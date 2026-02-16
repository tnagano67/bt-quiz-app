import Link from "next/link";
import type {
  Subject,
  StudentSubjectProgress,
  GradeDefinition,
} from "@/lib/types/database";

type Props = {
  subject: Subject;
  progress: StudentSubjectProgress | null;
  currentGrade: GradeDefinition | null;
  nextGrade: GradeDefinition | null;
  hasTakenToday: boolean;
};

export default function SubjectCard({
  subject,
  progress,
  currentGrade,
  nextGrade,
  hasTakenToday,
}: Props) {
  const remainingDays =
    currentGrade && progress
      ? Math.max(
          0,
          currentGrade.required_consecutive_days -
            progress.consecutive_pass_days
        )
      : null;

  return (
    <div className="rounded-xl border-2 border-gray-200 border-l-blue-600 border-l-[5px] bg-blue-50/50 p-5 shadow-sm">
      <h3 className="mb-3 text-base font-bold text-gray-900">{subject.name}</h3>

      <dl className="mb-4 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-gray-500">グレード</dt>
          <dd className="text-lg font-bold text-blue-600">
            {progress?.current_grade ?? "-"}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">連続合格</dt>
          <dd className="text-lg font-bold text-gray-900">
            {progress?.consecutive_pass_days ?? 0}日
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">昇級まで</dt>
          <dd className="font-medium text-gray-900">
            {!nextGrade
              ? "最上級"
              : remainingDays === 0
                ? "昇級可能"
                : `あと${remainingDays}日`}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">本日</dt>
          <dd>
            {hasTakenToday ? (
              <span className="font-bold text-green-600">受験済</span>
            ) : (
              <span className="font-bold text-red-600">未受験</span>
            )}
          </dd>
        </div>
      </dl>

      <Link
        href={`/student/quiz?subject=${subject.id}`}
        className="block rounded-lg bg-blue-600 py-2 text-center text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
      >
        小テストを受ける
      </Link>
    </div>
  );
}
