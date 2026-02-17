import type { Student, StudentSubjectProgress, QuizRecord } from "@/lib/types/database";

/**
 * グレード名のリストから範囲フィルタを生成する。
 * 範囲指定なしの場合は null を返す。
 */
export function getGradeFilter(
  gradeNames: string[],
  gradeFrom: string | null,
  gradeTo: string | null
): string[] | null {
  const gradeIndexMap = new Map(gradeNames.map((name, i) => [name, i]));
  const fromIndex = gradeFrom ? (gradeIndexMap.get(gradeFrom) ?? -1) : -1;
  const toIndex = gradeTo ? (gradeIndexMap.get(gradeTo) ?? -1) : -1;
  const sliceFrom = fromIndex !== -1 ? fromIndex : 0;
  const sliceTo = toIndex !== -1 ? toIndex + 1 : gradeNames.length;
  if (fromIndex !== -1 || toIndex !== -1) {
    return gradeNames.slice(sliceFrom, sliceTo);
  }
  return null;
}

export type StudentStats = {
  count: number;
  totalScore: number;
  maxScore: number;
  passCount: number;
};

/**
 * 受験記録の配列から統計情報を計算する。
 */
export function calculateStudentStats(
  records: Pick<QuizRecord, "score" | "passed">[]
): StudentStats {
  const stats: StudentStats = {
    count: 0,
    totalScore: 0,
    maxScore: 0,
    passCount: 0,
  };
  for (const r of records) {
    stats.count++;
    stats.totalScore += r.score;
    if (r.score > stats.maxScore) stats.maxScore = r.score;
    if (r.passed) stats.passCount++;
  }
  return stats;
}

/**
 * 生徒エクスポート行をフォーマットする。
 */
export function formatStudentExportRow(
  student: Student,
  progress: StudentSubjectProgress | null,
  stats: StudentStats | null
): (string | number)[] {
  const count = stats?.count ?? 0;
  const avg =
    count > 0 ? Math.round((stats!.totalScore / count) * 10) / 10 : 0;
  const max = stats?.maxScore ?? 0;
  const passRate =
    count > 0 ? Math.round((stats!.passCount / count) * 1000) / 10 : 0;
  return [
    student.year,
    student.class,
    student.number,
    student.name,
    progress?.current_grade ?? "-",
    progress?.consecutive_pass_days ?? 0,
    progress?.last_challenge_date ?? "",
    count,
    avg,
    max,
    `${passRate}%`,
  ];
}

/**
 * 受験記録エクスポート行をフォーマットする。
 */
export function formatRecordExportRow(
  record: Pick<QuizRecord, "grade" | "score" | "passed" | "taken_at">,
  student: Pick<Student, "year" | "class" | "number" | "name">
): (string | number)[] {
  return [
    student.year,
    student.class,
    student.number,
    student.name,
    record.taken_at.slice(0, 10),
    record.grade,
    record.score,
    record.passed ? "合格" : "不合格",
  ];
}
