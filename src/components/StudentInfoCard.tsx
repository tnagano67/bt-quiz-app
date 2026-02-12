import type { Student, GradeDefinition } from "@/lib/types/database";

type Props = {
  student: Student;
  currentGrade: GradeDefinition;
  nextGrade: GradeDefinition | null;
  hasTakenToday: boolean;
};

export default function StudentInfoCard({
  student,
  currentGrade,
  nextGrade,
  hasTakenToday,
}: Props) {
  const remainingDays = Math.max(
    0,
    currentGrade.required_consecutive_days - student.consecutive_pass_days
  );

  return (
    <div className="rounded-xl border-2 border-gray-200 border-l-blue-600 border-l-[5px] bg-blue-50/50 p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-bold text-gray-900">
        {student.year}年{student.class}組{student.number}番 {student.name} さん
      </h2>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-gray-500">現在のグレード</dt>
          <dd className="text-lg font-bold text-blue-600">
            {student.current_grade}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">連続合格日数</dt>
          <dd className="text-lg font-bold text-gray-900">
            {student.consecutive_pass_days}日
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">次のグレード</dt>
          <dd className="font-medium text-gray-900">
            {nextGrade ? nextGrade.grade_name : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">昇級まで</dt>
          <dd className="font-medium text-gray-900">
            {!nextGrade
              ? "最上級グレードです"
              : remainingDays === 0
                ? "昇級可能"
                : `あと${remainingDays}日`}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-gray-500">本日の受験</dt>
          <dd>
            {hasTakenToday ? (
              <span className="font-bold text-green-600">済</span>
            ) : (
              <span className="font-bold text-red-600">未</span>
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}
