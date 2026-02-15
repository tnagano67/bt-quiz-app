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
      select: { data: null, error: null },
      insert: { data: null, error: null },
      update: { data: null, error: null },
      delete: { data: null, error: null },
    },
    students: { select: { data: null, error: null } },
  },
});

vi.mock("@/lib/supabase/server", () => mockSetup.mockModule);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { createGrade, updateGrade, deleteGrade } = await import("./actions");

const validGrade = {
  grade_name: "10級",
  display_order: 1,
  start_id: 1,
  end_id: 10,
  num_questions: 5,
  pass_score: 80,
  required_consecutive_days: 3,
};

/** チェーン可能なビルダーを生成するヘルパー */
function makeBuilder(response: { data: unknown; error: unknown }) {
  const chainMethods = [
    "eq", "neq", "in", "select", "order", "limit", "single", "range", "gte", "lte", "is",
  ];
  const builder: Record<string, unknown> = {};
  for (const method of chainMethods) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }
  builder.then = (resolve: (value: unknown) => void) => resolve(response);
  return builder;
}

// updateGrade テストで from をカスタム実装に差し替えるため、元の実装を保存
const originalFromImpl = mockSetup.supabase.from.getMockImplementation();

function resetMocks() {
  vi.clearAllMocks();
  // from の実装を元に戻す（setupUpdateGradeMock で上書きされた場合に必要）
  mockSetup.supabase.from.mockImplementation(originalFromImpl!);
  mockSetup.supabase.auth.getUser.mockResolvedValue({
    data: { user: { email: "teacher@example.com" } },
    error: null,
  });
  mockSetup.setTableResponse("teachers", "select", {
    data: { id: "t1" },
    error: null,
  });
  mockSetup.setTableResponse("grade_definitions", "select", {
    data: null,
    error: null,
  });
  mockSetup.setTableResponse("grade_definitions", "insert", {
    data: null,
    error: null,
  });
  mockSetup.setTableResponse("grade_definitions", "update", {
    data: null,
    error: null,
  });
  mockSetup.setTableResponse("grade_definitions", "delete", {
    data: null,
    error: null,
  });
  mockSetup.setTableResponse("students", "select", {
    data: null,
    error: null,
  });
}

describe("createGrade", () => {
  beforeEach(resetMocks);

  it("未認証 → エラー", async () => {
    mockSetup.supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const result = await createGrade(validGrade);
    expect(result.success).toBe(false);
    expect(result.message).toContain("認証");
  });

  it("非教員 → エラー", async () => {
    mockSetup.setTableResponse("teachers", "select", {
      data: null,
      error: null,
    });
    const result = await createGrade(validGrade);
    expect(result.success).toBe(false);
    expect(result.message).toContain("教員権限");
  });

  it("grade_name 重複 → エラー", async () => {
    mockSetup.setTableResponse("grade_definitions", "select", {
      data: { id: "existing" },
      error: null,
    });
    const result = await createGrade(validGrade);
    expect(result.success).toBe(false);
    expect(result.message).toContain("すでに使用");
  });

  it("正常作成 → success", async () => {
    const result = await createGrade(validGrade);
    expect(result.success).toBe(true);
  });

  it("DB エラー → 失敗メッセージ", async () => {
    mockSetup.setTableResponse("grade_definitions", "insert", {
      data: null,
      error: { message: "db error" },
    });
    const result = await createGrade(validGrade);
    expect(result.success).toBe(false);
    expect(result.message).toContain("失敗");
  });
});

describe("updateGrade", () => {
  /**
   * updateGrade は grade_definitions の select を2回呼ぶ（存在チェック + display_order 重複チェック）。
   * 標準モックでは同一テーブル・操作に1つのレスポンスしか設定できないため、
   * 連続呼び出しで異なるレスポンスが必要なテストでは from をカスタム実装する。
   */
  function setupUpdateGradeMock(options: {
    existenceResponse: { data: unknown; error: unknown };
    displayOrderResponse: { data: unknown; error: unknown };
    updateResponse: { data: unknown; error: unknown };
  }) {
    let gradeDefSelectCount = 0;
    mockSetup.supabase.from.mockImplementation((table: string) => {
      if (table === "teachers") {
        return {
          select: vi.fn(() =>
            makeBuilder({ data: { id: "t1" }, error: null })
          ),
        };
      }
      if (table === "grade_definitions") {
        return {
          select: vi.fn(() => {
            gradeDefSelectCount++;
            return makeBuilder(
              gradeDefSelectCount === 1
                ? options.existenceResponse
                : options.displayOrderResponse
            );
          }),
          update: vi.fn(() => makeBuilder(options.updateResponse)),
        };
      }
      return {
        select: vi.fn(() => makeBuilder({ data: null, error: null })),
      };
    });
  }

  beforeEach(() => {
    resetMocks();
  });

  it("未認証 → エラー", async () => {
    mockSetup.supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const { grade_name: _, ...input } = validGrade;
    const result = await updateGrade("g1", input);
    expect(result.success).toBe(false);
    expect(result.message).toContain("認証");
  });

  it("非教員 → エラー", async () => {
    mockSetup.setTableResponse("teachers", "select", {
      data: null,
      error: null,
    });
    const { grade_name: _, ...input } = validGrade;
    const result = await updateGrade("g1", input);
    expect(result.success).toBe(false);
    expect(result.message).toContain("教員権限");
  });

  it("存在しないグレード → エラー", async () => {
    setupUpdateGradeMock({
      existenceResponse: { data: null, error: null },
      displayOrderResponse: { data: null, error: null },
      updateResponse: { data: null, error: null },
    });
    const { grade_name: _, ...input } = validGrade;
    const result = await updateGrade("nonexistent", input);
    expect(result.success).toBe(false);
    expect(result.message).toContain("見つかりません");
  });

  it("display_order 衝突 → エラー", async () => {
    setupUpdateGradeMock({
      existenceResponse: { data: { id: "g1" }, error: null },
      displayOrderResponse: { data: { id: "other" }, error: null },
      updateResponse: { data: null, error: null },
    });
    const { grade_name: _, ...input } = validGrade;
    const result = await updateGrade("g1", input);
    expect(result.success).toBe(false);
    expect(result.message).toContain("表示順");
  });

  it("正常更新 → success", async () => {
    setupUpdateGradeMock({
      existenceResponse: { data: { id: "g1" }, error: null },
      displayOrderResponse: { data: null, error: null },
      updateResponse: { data: null, error: null },
    });
    const { grade_name: _, ...input } = validGrade;
    const result = await updateGrade("g1", input);
    expect(result.success).toBe(true);
  });

  it("DB エラー → 失敗メッセージ", async () => {
    setupUpdateGradeMock({
      existenceResponse: { data: { id: "g1" }, error: null },
      displayOrderResponse: { data: null, error: null },
      updateResponse: { data: null, error: { message: "db error" } },
    });
    const { grade_name: _, ...input } = validGrade;
    const result = await updateGrade("g1", input);
    expect(result.success).toBe(false);
    expect(result.message).toContain("失敗");
  });
});

describe("deleteGrade", () => {
  beforeEach(() => {
    resetMocks();
    mockSetup.setTableResponse("grade_definitions", "select", {
      data: { grade_name: "10級" },
      error: null,
    });
  });

  it("未認証 → エラー", async () => {
    mockSetup.supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const result = await deleteGrade("g1");
    expect(result.success).toBe(false);
    expect(result.message).toContain("認証");
  });

  it("非教員 → エラー", async () => {
    mockSetup.setTableResponse("teachers", "select", {
      data: null,
      error: null,
    });
    const result = await deleteGrade("g1");
    expect(result.success).toBe(false);
    expect(result.message).toContain("教員権限");
  });

  it("存在しないグレード → エラー", async () => {
    mockSetup.setTableResponse("grade_definitions", "select", {
      data: null,
      error: null,
    });
    const result = await deleteGrade("nonexistent");
    expect(result.success).toBe(false);
    expect(result.message).toContain("見つかりません");
  });

  it("正常削除 → success", async () => {
    const result = await deleteGrade("g1");
    expect(result.success).toBe(true);
  });

  it("DB エラー → 失敗メッセージ", async () => {
    mockSetup.setTableResponse("grade_definitions", "delete", {
      data: null,
      error: { message: "db error" },
    });
    const result = await deleteGrade("g1");
    expect(result.success).toBe(false);
    expect(result.message).toContain("失敗");
  });
});
