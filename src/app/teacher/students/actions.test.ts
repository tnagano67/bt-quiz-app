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
    students: {
      select: { data: null, error: null },
      insert: { data: null, error: null },
      update: { data: null, error: null },
    },
    grade_definitions: {
      select: { data: { grade_name: "10級" }, error: null },
    },
  },
});

vi.mock("@/lib/supabase/server", () => mockSetup.mockModule);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { createStudent, importStudents } = await import("./actions");

const validStudent = {
  email: "student@example.com",
  year: 1,
  class: 1,
  number: 1,
  name: "テスト太郎",
};

describe("createStudent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetup.supabase.auth.getUser.mockResolvedValue({
      data: { user: { email: "teacher@example.com" } },
      error: null,
    });
    mockSetup.setTableResponse("teachers", "select", {
      data: { id: "t1" },
      error: null,
    });
    mockSetup.setTableResponse("students", "select", {
      data: null,
      error: null,
    });
    mockSetup.setTableResponse("students", "insert", {
      data: null,
      error: null,
    });
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
    const result = await createStudent(validStudent);
    expect(result.success).toBe(false);
    expect(result.message).toContain("認証");
  });

  it("非教員 → エラー", async () => {
    mockSetup.setTableResponse("teachers", "select", {
      data: null,
      error: null,
    });
    const result = await createStudent(validStudent);
    expect(result.success).toBe(false);
    expect(result.message).toContain("教員権限");
  });

  it("メール重複 → エラー", async () => {
    mockSetup.setTableResponse("students", "select", {
      data: { id: "existing" },
      error: null,
    });
    const result = await createStudent(validStudent);
    expect(result.success).toBe(false);
    expect(result.message).toContain("すでに登録");
  });

  it("正常作成 → success", async () => {
    const result = await createStudent(validStudent);
    expect(result.success).toBe(true);
  });

  it("DB エラー → 失敗メッセージ", async () => {
    mockSetup.setTableResponse("students", "insert", {
      data: null,
      error: { message: "db error" },
    });
    const result = await createStudent(validStudent);
    expect(result.success).toBe(false);
    expect(result.message).toContain("失敗");
  });
});

describe("importStudents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetup.supabase.auth.getUser.mockResolvedValue({
      data: { user: { email: "teacher@example.com" } },
      error: null,
    });
    mockSetup.setTableResponse("teachers", "select", {
      data: { id: "t1" },
      error: null,
    });
    mockSetup.setTableResponse("students", "select", {
      data: [],
      error: null,
    });
    mockSetup.setTableResponse("students", "insert", {
      data: null,
      error: null,
    });
    mockSetup.setTableResponse("students", "update", {
      data: null,
      error: null,
    });
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
    const result = await importStudents([validStudent]);
    expect(result.success).toBe(false);
    expect(result.inserted).toBe(0);
    expect(result.updated).toBe(0);
  });

  it("非教員 → エラー", async () => {
    mockSetup.setTableResponse("teachers", "select", {
      data: null,
      error: null,
    });
    const result = await importStudents([validStudent]);
    expect(result.success).toBe(false);
  });

  it("バリデーションエラー → errors に含まれる", async () => {
    const rows = [
      validStudent,
      { email: "", year: 1, class: 1, number: 1, name: "NG" }, // invalid email
    ];
    const result = await importStudents(rows);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain("行2");
    expect(result.inserted).toBe(1);
  });

  it("新規挿入成功", async () => {
    const result = await importStudents([validStudent]);
    expect(result.success).toBe(true);
    expect(result.inserted).toBe(1);
    expect(result.updated).toBe(0);
  });

  it("既存更新成功", async () => {
    mockSetup.setTableResponse("students", "select", {
      data: [{ email: "student@example.com" }],
      error: null,
    });
    const result = await importStudents([validStudent]);
    expect(result.success).toBe(true);
    expect(result.inserted).toBe(0);
    expect(result.updated).toBe(1);
  });

  it("挿入エラー → errors に含まれる", async () => {
    mockSetup.setTableResponse("students", "insert", {
      data: null,
      error: { message: "insert error" },
    });
    const result = await importStudents([validStudent]);
    expect(result.success).toBe(false);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain("一括挿入");
  });

  it("更新エラー → errors に含まれる", async () => {
    mockSetup.setTableResponse("students", "select", {
      data: [{ email: "student@example.com" }],
      error: null,
    });
    mockSetup.setTableResponse("students", "update", {
      data: null,
      error: { message: "update error" },
    });
    const result = await importStudents([validStudent]);
    expect(result.success).toBe(false);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain("更新に失敗");
  });

  it("混合（挿入+更新+バリデーションエラー）", async () => {
    mockSetup.setTableResponse("students", "select", {
      data: [{ email: "existing@example.com" }],
      error: null,
    });
    const rows = [
      { email: "new@example.com", year: 1, class: 1, number: 1, name: "新規" },
      {
        email: "existing@example.com",
        year: 2,
        class: 3,
        number: 5,
        name: "既存",
      },
      { email: "", year: 1, class: 1, number: 1, name: "NG" }, // invalid
    ];
    const result = await importStudents(rows);
    expect(result.inserted).toBe(1);
    expect(result.updated).toBe(1);
    expect(result.errors.length).toBe(1);
  });

  it("全行バリデーションエラー → inserted=0, updated=0", async () => {
    const rows = [
      { email: "", year: 1, class: 1, number: 1, name: "NG1" },
      { email: "a@b.c", year: 0, class: 1, number: 1, name: "NG2" },
    ];
    const result = await importStudents(rows);
    expect(result.inserted).toBe(0);
    expect(result.updated).toBe(0);
    expect(result.errors.length).toBe(2);
  });
});
