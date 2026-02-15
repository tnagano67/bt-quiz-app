import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatDateShort, isTakenToday, getRecentDates } from "./date-utils";

describe("formatDateShort", () => {
  it("先頭ゼロを除去する (1/5)", () => {
    expect(formatDateShort("2024-01-05")).toBe("1/5");
  });

  it("2桁の月日をそのまま表示 (12/25)", () => {
    expect(formatDateShort("2024-12-25")).toBe("12/25");
  });

  it("10月1日 → 10/1", () => {
    expect(formatDateShort("2024-10-01")).toBe("10/1");
  });
});

describe("isTakenToday", () => {
  beforeEach(() => {
    // 2024-06-15T12:00:00 JST (= 2024-06-15T03:00:00 UTC) に固定
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T03:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("null → false", () => {
    expect(isTakenToday(null)).toBe(false);
  });

  it("今日の日付 → true", () => {
    expect(isTakenToday("2024-06-15")).toBe(true);
  });

  it("昨日の日付 → false", () => {
    expect(isTakenToday("2024-06-14")).toBe(false);
  });
});

describe("getRecentDates", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T03:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("指定日数分の配列が返る", () => {
    const dates = getRecentDates(3);
    expect(dates).toHaveLength(3);
  });

  it("新しい順に並ぶ", () => {
    const dates = getRecentDates(3);
    expect(dates).toEqual(["2024-06-15", "2024-06-14", "2024-06-13"]);
  });

  it("1日分", () => {
    const dates = getRecentDates(1);
    expect(dates).toEqual(["2024-06-15"]);
  });
});
