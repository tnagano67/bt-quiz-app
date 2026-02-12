import type { GradeDefinition } from "@/lib/types/database";
import { getTodayJST } from "@/lib/date-utils";

export type GradeAdvancementResult = {
  newStreak: number;
  newGrade: string;
  advanced: boolean;
  isMaxGrade: boolean;
};

/**
 * グレード進級計算
 *
 * - 合格 かつ 本日未受験 → 連続日数 +1
 * - 合格 かつ 本日受験済み → 連続日数そのまま
 * - 不合格 → 連続日数リセット (0)
 * - 連続日数 >= 必要日数 かつ 最上級でない → 次グレードに昇格
 * - 昇格時は連続日数を 0 にリセット
 */
export function calculateGradeAdvancement(
  currentGrade: string,
  currentStreak: number,
  passed: boolean,
  lastChallengeDate: string | null,
  allGrades: GradeDefinition[]
): GradeAdvancementResult {
  const todayStr = getTodayJST();

  // 連続日数の計算
  let newStreak: number;
  if (passed) {
    newStreak =
      todayStr === lastChallengeDate ? currentStreak : currentStreak + 1;
  } else {
    newStreak = 0;
  }

  // 現在のグレード情報
  const currentIndex = allGrades.findIndex(
    (g) => g.grade_name === currentGrade
  );
  const isMaxGrade = currentIndex === allGrades.length - 1;

  let newGrade = currentGrade;
  let advanced = false;

  if (!isMaxGrade && passed) {
    const requiredDays = allGrades[currentIndex].required_consecutive_days;
    if (newStreak >= requiredDays) {
      newGrade = allGrades[currentIndex + 1].grade_name;
      advanced = true;
      newStreak = 0; // 昇格時はリセット
    }
  }

  return { newStreak, newGrade, advanced, isMaxGrade };
}
