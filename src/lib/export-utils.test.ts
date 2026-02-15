import { describe, it, expect } from "vitest";
import {
  getGradeFilter,
  calculateStudentStats,
  formatStudentExportRow,
  formatRecordExportRow,
} from "./export-utils";
import type { Student } from "@/lib/types/database";

describe("getGradeFilter", () => {
  const gradeNames = ["10級", "9級", "8級", "7級", "6級", "5級"];

  it("範囲指定なし → null", () => {
    expect(getGradeFilter(gradeNames, null, null)).toBeNull();
  });

  it("from のみ指定 → from から末尾まで", () => {
    expect(getGradeFilter(gradeNames, "8級", null)).toEqual([
      "8級",
      "7級",
      "6級",
      "5級",
    ]);
  });

  it("to のみ指定 → 先頭から to まで", () => {
    expect(getGradeFilter(gradeNames, null, "8級")).toEqual([
      "10級",
      "9級",
      "8級",
    ]);
  });

  it("from と to の両方指定 → 範囲内", () => {
    expect(getGradeFilter(gradeNames, "9級", "7級")).toEqual([
      "9級",
      "8級",
      "7級",
    ]);
  });

  it("from と to が同じ → 1要素", () => {
    expect(getGradeFilter(gradeNames, "8級", "8級")).toEqual(["8級"]);
  });

  it("存在しない from → 先頭から", () => {
    expect(getGradeFilter(gradeNames, "存在しない", "8級")).toEqual([
      "10級",
      "9級",
      "8級",
    ]);
  });

  it("存在しない to → from から末尾まで", () => {
    expect(getGradeFilter(gradeNames, "8級", "存在しない")).toEqual([
      "8級",
      "7級",
      "6級",
      "5級",
    ]);
  });

  it("両方存在しない → null", () => {
    expect(getGradeFilter(gradeNames, "存在しない", "これもない")).toEqual(
      null
    );
  });
});

describe("calculateStudentStats", () => {
  it("空配列 → 初期値", () => {
    const stats = calculateStudentStats([]);
    expect(stats).toEqual({
      count: 0,
      totalScore: 0,
      maxScore: 0,
      passCount: 0,
    });
  });

  it("1件の記録", () => {
    const stats = calculateStudentStats([{ score: 80, passed: true }]);
    expect(stats.count).toBe(1);
    expect(stats.totalScore).toBe(80);
    expect(stats.maxScore).toBe(80);
    expect(stats.passCount).toBe(1);
  });

  it("複数件の記録", () => {
    const stats = calculateStudentStats([
      { score: 60, passed: false },
      { score: 80, passed: true },
      { score: 100, passed: true },
    ]);
    expect(stats.count).toBe(3);
    expect(stats.totalScore).toBe(240);
    expect(stats.maxScore).toBe(100);
    expect(stats.passCount).toBe(2);
  });

  it("全合格", () => {
    const stats = calculateStudentStats([
      { score: 90, passed: true },
      { score: 85, passed: true },
    ]);
    expect(stats.passCount).toBe(2);
  });

  it("全不合格", () => {
    const stats = calculateStudentStats([
      { score: 30, passed: false },
      { score: 40, passed: false },
    ]);
    expect(stats.passCount).toBe(0);
  });

  it("maxScore が正しく更新される", () => {
    const stats = calculateStudentStats([
      { score: 100, passed: true },
      { score: 50, passed: false },
      { score: 75, passed: true },
    ]);
    expect(stats.maxScore).toBe(100);
  });
});

describe("formatStudentExportRow", () => {
  const baseStudent: Student = {
    id: "s1",
    email: "test@example.com",
    year: 2,
    class: 3,
    number: 15,
    name: "田中太郎",
    current_grade: "8級",
    consecutive_pass_days: 3,
    last_challenge_date: "2024-06-01",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
  };

  it("統計ありの行フォーマット", () => {
    const row = formatStudentExportRow(baseStudent, {
      count: 10,
      totalScore: 800,
      maxScore: 100,
      passCount: 7,
    });
    expect(row).toEqual([
      2,
      3,
      15,
      "田中太郎",
      "8級",
      3,
      "2024-06-01",
      10,
      80, // avg = 800/10
      100,
      "70%", // 7/10
    ]);
  });

  it("統計が null の場合はゼロ値", () => {
    const row = formatStudentExportRow(baseStudent, null);
    expect(row[7]).toBe(0); // count
    expect(row[8]).toBe(0); // avg
    expect(row[9]).toBe(0); // max
    expect(row[10]).toBe("0%"); // passRate
  });

  it("last_challenge_date が null → 空文字", () => {
    const student = { ...baseStudent, last_challenge_date: null };
    const row = formatStudentExportRow(student, null);
    expect(row[6]).toBe("");
  });
});

describe("formatRecordExportRow", () => {
  const student = { year: 1, class: 2, number: 5, name: "佐藤花子" };

  it("合格レコードのフォーマット", () => {
    const row = formatRecordExportRow(
      {
        grade: "9級",
        score: 85,
        passed: true,
        taken_at: "2024-06-15T10:30:00+09:00",
      },
      student
    );
    expect(row).toEqual([1, 2, 5, "佐藤花子", "2024-06-15", "9級", 85, "合格"]);
  });

  it("不合格レコードのフォーマット", () => {
    const row = formatRecordExportRow(
      {
        grade: "10級",
        score: 40,
        passed: false,
        taken_at: "2024-03-01T09:00:00+09:00",
      },
      student
    );
    expect(row[7]).toBe("不合格");
  });
});
