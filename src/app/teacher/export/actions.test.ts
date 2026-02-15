import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "@/test-utils/supabase-mock";

// モックセットアップ
const mockSetup = createMockSupabase({
  auth: {
    getUser: {
      data: { user: { email: "teacher@example.com" } },
      error: null,
    },
  },
  tables: {
    teachers: { select: { data: { id: "t1" }, error: null } },
    grade_definitions: {
      select: {
        data: [
          { grade_name: "10級", display_order: 1 },
          { grade_name: "9級", display_order: 2 },
        ],
        error: null,
      },
    },
    students: { select: { data: [{ id: "s1" }], error: null } },
    quiz_records: { select: { data: null, error: null } },
  },
});

vi.mock("@/lib/supabase/server", () => mockSetup.mockModule);

const { countExportRows, getGradeNames } = await import("./actions");

function resetMocks() {
  vi.clearAllMocks();
  mockSetup.supabase.auth.getUser.mockResolvedValue({
    data: { user: { email: "teacher@example.com" } },
    error: null,
  });
  mockSetup.setTableResponse("teachers", "select", {
    data: { id: "t1" },
    error: null,
  });
  mockSetup.setTableResponse("grade_definitions", "select", {
    data: [
      { grade_name: "10級", display_order: 1 },
      { grade_name: "9級", display_order: 2 },
    ],
    error: null,
  });
  mockSetup.setTableResponse("students", "select", {
    data: [{ id: "s1" }],
    error: null,
  });
  mockSetup.setTableResponse("quiz_records", "select", {
    data: null,
    error: null,
  });
}

describe("countExportRows", () => {
  beforeEach(resetMocks);

  it("未認証 → エラー", async () => {
    mockSetup.supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const result = await countExportRows({ type: "students" });
    expect(result.success).toBe(false);
    expect(result.message).toContain("認証");
  });

  it("非教員 → エラー", async () => {
    mockSetup.setTableResponse("teachers", "select", {
      data: null,
      error: null,
    });
    const result = await countExportRows({ type: "students" });
    expect(result.success).toBe(false);
    expect(result.message).toContain("認証");
  });

  it("type=students フィルターなし → success", async () => {
    const result = await countExportRows({ type: "students" });
    expect(result.success).toBe(true);
    // count はモックでは undefined になるが、fallback で 0 が返る
    expect(result.count).toBe(0);
  });

  it("type=students フィルターあり → success", async () => {
    const result = await countExportRows({
      type: "students",
      year: "1",
      cls: "2",
      gradeFrom: "10級",
      gradeTo: "9級",
    });
    expect(result.success).toBe(true);
  });

  it("type=records フィルターなし → success", async () => {
    const result = await countExportRows({ type: "records" });
    expect(result.success).toBe(true);
  });

  it("type=records フィルターあり → success", async () => {
    const result = await countExportRows({
      type: "records",
      year: "1",
      dateFrom: "2025-01-01",
      dateTo: "2025-12-31",
    });
    expect(result.success).toBe(true);
  });

  it("type=records 対象生徒なし → count=0", async () => {
    mockSetup.setTableResponse("students", "select", {
      data: [],
      error: null,
    });
    const result = await countExportRows({ type: "records" });
    expect(result.success).toBe(true);
    expect(result.count).toBe(0);
  });

  it("不正な type → エラー", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await countExportRows({ type: "invalid" as any });
    expect(result.success).toBe(false);
    expect(result.message).toContain("type");
  });
});

describe("getGradeNames", () => {
  beforeEach(resetMocks);

  it("未認証 → 空配列", async () => {
    mockSetup.supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const result = await getGradeNames();
    expect(result).toEqual([]);
  });

  it("成功 → グレード名の配列", async () => {
    const result = await getGradeNames();
    expect(result).toEqual(["10級", "9級"]);
  });
});
