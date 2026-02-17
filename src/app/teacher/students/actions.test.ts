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
      insert: { data: { id: "new-id" }, error: null },
      update: { data: null, error: null },
    },
    subjects: {
      select: { data: [{ id: "sub1" }], error: null },
    },
    grade_definitions: {
      select: { data: [{ subject_id: "sub1", grade_name: "10級" }], error: null },
    },
    student_subject_progress: {
      insert: { data: null, error: null },
    },
  },
});

vi.mock("@/lib/supabase/server", () => mockSetup.mockModule);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { createStudent, importStudents, updateStudent, deleteStudent } =
  await import("./actions");

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
      data: { id: "new-id" },
      error: null,
    });
    mockSetup.setTableResponse("subjects", "select", {
      data: [{ id: "sub1" }],
      error: null,
    });
    mockSetup.setTableResponse("grade_definitions", "select", {
      data: [{ subject_id: "sub1", grade_name: "10級" }],
      error: null,
    });
    mockSetup.setTableResponse("student_subject_progress", "insert", {
      data: null,
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
      data: [{ id: "new-id" }],
      error: null,
    });
    mockSetup.setTableResponse("students", "update", {
      data: null,
      error: null,
    });
    mockSetup.setTableResponse("subjects", "select", {
      data: [{ id: "sub1" }],
      error: null,
    });
    mockSetup.setTableResponse("grade_definitions", "select", {
      data: [{ subject_id: "sub1", grade_name: "10級" }],
      error: null,
    });
    mockSetup.setTableResponse("student_subject_progress", "insert", {
      data: null,
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

describe("updateStudent", () => {
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
    mockSetup.setTableResponse("students", "update", {
      data: null,
      error: null,
    });
  });

  it("未認証 → エラー", async () => {
    mockSetup.supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const result = await updateStudent("s1", validStudent);
    expect(result.success).toBe(false);
    expect(result.message).toContain("認証");
  });

  it("非教員 → エラー", async () => {
    mockSetup.setTableResponse("teachers", "select", {
      data: null,
      error: null,
    });
    const result = await updateStudent("s1", validStudent);
    expect(result.success).toBe(false);
    expect(result.message).toContain("教員権限");
  });

  it("メール重複（自身以外） → エラー", async () => {
    mockSetup.setTableResponse("students", "select", {
      data: { id: "other-id" },
      error: null,
    });
    const result = await updateStudent("s1", validStudent);
    expect(result.success).toBe(false);
    expect(result.message).toContain("すでに登録");
  });

  it("正常更新 → success", async () => {
    const result = await updateStudent("s1", validStudent);
    expect(result.success).toBe(true);
  });

  it("DB エラー → 失敗メッセージ", async () => {
    mockSetup.setTableResponse("students", "update", {
      data: null,
      error: { message: "update error" },
    });
    const result = await updateStudent("s1", validStudent);
    expect(result.success).toBe(false);
    expect(result.message).toContain("失敗");
  });
});

describe("deleteStudent", () => {
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

  const originalFromImpl = mockSetup.supabase.from.getMockImplementation();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSetup.supabase.auth.getUser.mockResolvedValue({
      data: { user: { email: "teacher@example.com" } },
      error: null,
    });
    mockSetup.supabase.from.mockImplementation(originalFromImpl!);
    mockSetup.setTableResponse("teachers", "select", {
      data: { id: "t1" },
      error: null,
    });
    mockSetup.setTableResponse("students", "delete", {
      data: null,
      error: null,
    });
  });

  it("未認証 → エラー", async () => {
    mockSetup.supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const result = await deleteStudent("s1");
    expect(result.success).toBe(false);
    expect(result.message).toContain("認証");
  });

  it("非教員 → エラー", async () => {
    mockSetup.setTableResponse("teachers", "select", {
      data: null,
      error: null,
    });
    const result = await deleteStudent("s1");
    expect(result.success).toBe(false);
    expect(result.message).toContain("教員権限");
  });

  it("正常削除 → success", async () => {
    // deleteStudent は quiz_records, student_subject_progress, students の3テーブルに delete を呼ぶ
    mockSetup.supabase.from.mockImplementation((table: string) => {
      if (table === "teachers") {
        return {
          select: vi.fn(() => makeBuilder({ data: { id: "t1" }, error: null })),
        };
      }
      // quiz_records, student_subject_progress, students すべて成功
      return {
        delete: vi.fn(() => makeBuilder({ data: null, error: null })),
      };
    });
    const result = await deleteStudent("s1");
    expect(result.success).toBe(true);
  });

  it("DB 削除エラー → 失敗メッセージ", async () => {
    let deleteCount = 0;
    mockSetup.supabase.from.mockImplementation((table: string) => {
      if (table === "teachers") {
        return {
          select: vi.fn(() => makeBuilder({ data: { id: "t1" }, error: null })),
        };
      }
      return {
        delete: vi.fn(() => {
          deleteCount++;
          // 3回目（students テーブルの delete）でエラー
          return makeBuilder(
            deleteCount === 3
              ? { data: null, error: { message: "delete error" } }
              : { data: null, error: null }
          );
        }),
      };
    });
    const result = await deleteStudent("s1");
    expect(result.success).toBe(false);
    expect(result.message).toContain("失敗");
  });
});
