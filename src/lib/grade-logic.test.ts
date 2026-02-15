import { describe, it, expect, vi } from "vitest";
import type { GradeDefinition } from "@/lib/types/database";

// getTodayJST をモックして日付を固定
vi.mock("@/lib/date-utils", () => ({
  getTodayJST: () => "2024-06-15",
}));

import { calculateGradeAdvancement } from "./grade-logic";

const makeGrade = (
  name: string,
  order: number,
  requiredDays: number
): GradeDefinition => ({
  id: `grade-${order}`,
  grade_name: name,
  display_order: order,
  start_id: order * 10 + 1,
  end_id: (order + 1) * 10,
  num_questions: 10,
  pass_score: 80,
  required_consecutive_days: requiredDays,
  created_at: "2024-01-01",
});

const allGrades: GradeDefinition[] = [
  makeGrade("10級", 0, 3),
  makeGrade("9級", 1, 3),
  makeGrade("8級", 2, 5),
];

describe("calculateGradeAdvancement", () => {
  it("合格 + 本日未受験 → 連続日数+1", () => {
    const result = calculateGradeAdvancement(
      "10級",
      1,
      true,
      "2024-06-14", // 昨日 → 未受験
      allGrades
    );
    expect(result.newStreak).toBe(2);
    expect(result.advanced).toBe(false);
  });

  it("合格 + 本日受験済み → 連続日数そのまま", () => {
    const result = calculateGradeAdvancement(
      "10級",
      2,
      true,
      "2024-06-15", // 今日 → 受験済み
      allGrades
    );
    expect(result.newStreak).toBe(2);
    expect(result.advanced).toBe(false);
  });

  it("不合格 → 連続日数リセット", () => {
    const result = calculateGradeAdvancement(
      "10級",
      5,
      false,
      "2024-06-14",
      allGrades
    );
    expect(result.newStreak).toBe(0);
    expect(result.advanced).toBe(false);
  });

  it("必要日数到達 → 昇格 + 連続日数リセット", () => {
    // 10級: 必要3日、現在2日 → +1 で 3日到達 → 9級に昇格
    const result = calculateGradeAdvancement(
      "10級",
      2,
      true,
      "2024-06-14",
      allGrades
    );
    expect(result.newStreak).toBe(0);
    expect(result.newGrade).toBe("9級");
    expect(result.advanced).toBe(true);
  });

  it("最上級グレード → 進級なし", () => {
    const result = calculateGradeAdvancement(
      "8級", // 最上級
      10,
      true,
      "2024-06-14",
      allGrades
    );
    expect(result.newStreak).toBe(11);
    expect(result.newGrade).toBe("8級");
    expect(result.advanced).toBe(false);
    expect(result.isMaxGrade).toBe(true);
  });

  it("lastChallengeDate が null の場合も連続日数+1", () => {
    const result = calculateGradeAdvancement(
      "10級",
      0,
      true,
      null,
      allGrades
    );
    expect(result.newStreak).toBe(1);
  });
});
