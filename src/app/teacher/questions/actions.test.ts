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
    questions: {
      select: { data: null, error: null },
      insert: { data: null, error: null },
      upsert: { data: null, error: null },
      delete: { data: null, error: null },
      update: { data: null, error: null },
    },
  },
});

vi.mock("@/lib/supabase/server", () => mockSetup.mockModule);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// 動的 import で Server Actions を読み込み（モック適用後）
const { createQuestion, updateQuestion, importQuestions, deleteQuestion } =
  await import("./actions");

const subjectId = "sub1";

describe("createQuestion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルト: 教員認証成功
    mockSetup.supabase.auth.getUser.mockResolvedValue({
      data: { user: { email: "teacher@example.com" } },
      error: null,
    });
    mockSetup.setTableResponse("teachers", "select", {
      data: { id: "t1" },
      error: null,
    });
  });

  it("未認証 → エラー", async () => {
    mockSetup.supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const result = await createQuestion({
      subject_id: subjectId,
      question_id: 1,
      question_text: "テスト",
      choice_1: "A",
      choice_2: "B",
      choice_3: "C",
      choice_4: "D",
      correct_answer: 1,
    });
    expect(result.success).toBe(false);
    expect(result.message).toContain("認証");
  });

  it("非教員 → エラー", async () => {
    mockSetup.setTableResponse("teachers", "select", {
      data: null,
      error: null,
    });
    const result = await createQuestion({
      subject_id: subjectId,
      question_id: 1,
      question_text: "テスト",
      choice_1: "A",
      choice_2: "B",
      choice_3: "C",
      choice_4: "D",
      correct_answer: 1,
    });
    expect(result.success).toBe(false);
    expect(result.message).toContain("教員権限");
  });

  it("重複 question_id → エラー", async () => {
    mockSetup.setTableResponse("questions", "select", {
      data: { id: "existing" },
      error: null,
    });
    const result = await createQuestion({
      subject_id: subjectId,
      question_id: 1,
      question_text: "テスト",
      choice_1: "A",
      choice_2: "B",
      choice_3: "C",
      choice_4: "D",
      correct_answer: 1,
    });
    expect(result.success).toBe(false);
    expect(result.message).toContain("すでに使用");
  });

  it("正常作成 → success", async () => {
    mockSetup.setTableResponse("questions", "select", {
      data: null,
      error: null,
    });
    mockSetup.setTableResponse("questions", "insert", {
      data: null,
      error: null,
    });
    const result = await createQuestion({
      subject_id: subjectId,
      question_id: 1,
      question_text: "テスト問題",
      choice_1: "A",
      choice_2: "B",
      choice_3: "C",
      choice_4: "D",
      correct_answer: 2,
    });
    expect(result.success).toBe(true);
  });

  it("DB エラー → 失敗メッセージ", async () => {
    mockSetup.setTableResponse("questions", "select", {
      data: null,
      error: null,
    });
    mockSetup.setTableResponse("questions", "insert", {
      data: null,
      error: { message: "db error" },
    });
    const result = await createQuestion({
      subject_id: subjectId,
      question_id: 1,
      question_text: "テスト",
      choice_1: "A",
      choice_2: "B",
      choice_3: "C",
      choice_4: "D",
      correct_answer: 1,
    });
    expect(result.success).toBe(false);
    expect(result.message).toContain("失敗");
  });
});

describe("importQuestions", () => {
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
  });

  it("バリデーションエラー混在 → errors にエラーが含まれる", async () => {
    mockSetup.setTableResponse("questions", "select", {
      data: [],
      error: null,
    });
    mockSetup.setTableResponse("questions", "upsert", {
      data: null,
      error: null,
    });

    const rows = [
      {
        question_id: 1,
        question_text: "OK",
        choice_1: "A",
        choice_2: "B",
        choice_3: "C",
        choice_4: "D",
        correct_answer: 1,
      },
      {
        question_id: -1, // invalid
        question_text: "NG",
        choice_1: "A",
        choice_2: "B",
        choice_3: "C",
        choice_4: "D",
        correct_answer: 1,
      },
    ];
    const result = await importQuestions(rows, subjectId);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain("行2");
    expect(result.inserted).toBe(1);
  });

  it("upsert 成功 → inserted/updated カウント", async () => {
    mockSetup.setTableResponse("questions", "select", {
      data: [{ question_id: 1 }], // question_id=1 は既存
      error: null,
    });
    mockSetup.setTableResponse("questions", "upsert", {
      data: null,
      error: null,
    });

    const rows = [
      {
        question_id: 1,
        question_text: "既存",
        choice_1: "A",
        choice_2: "B",
        choice_3: "C",
        choice_4: "D",
        correct_answer: 1,
      },
      {
        question_id: 2,
        question_text: "新規",
        choice_1: "A",
        choice_2: "B",
        choice_3: "C",
        choice_4: "D",
        correct_answer: 2,
      },
    ];
    const result = await importQuestions(rows, subjectId);
    expect(result.success).toBe(true);
    expect(result.inserted).toBe(1);
    expect(result.updated).toBe(1);
  });

  it("全行バリデーションエラー → inserted=0, updated=0", async () => {
    const rows = [
      {
        question_id: 0, // invalid
        question_text: "NG",
        choice_1: "A",
        choice_2: "B",
        choice_3: "C",
        choice_4: "D",
        correct_answer: 1,
      },
    ];
    const result = await importQuestions(rows, subjectId);
    expect(result.inserted).toBe(0);
    expect(result.updated).toBe(0);
    expect(result.errors.length).toBe(1);
  });
});

describe("updateQuestion", () => {
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
  });

  const validInput = {
    question_text: "更新後の問題",
    choice_1: "A",
    choice_2: "B",
    choice_3: "C",
    choice_4: "D",
    correct_answer: 3,
  };

  it("存在しない問題 → エラー", async () => {
    mockSetup.setTableResponse("questions", "select", {
      data: null,
      error: null,
    });
    const result = await updateQuestion(999, subjectId, validInput);
    expect(result.success).toBe(false);
    expect(result.message).toContain("見つかりません");
  });

  it("正常更新 → success", async () => {
    mockSetup.setTableResponse("questions", "select", {
      data: { id: "q1" },
      error: null,
    });
    mockSetup.setTableResponse("questions", "update", {
      data: null,
      error: null,
    });
    const result = await updateQuestion(1, subjectId, validInput);
    expect(result.success).toBe(true);
  });

  it("DB エラー → 失敗メッセージ", async () => {
    mockSetup.setTableResponse("questions", "select", {
      data: { id: "q1" },
      error: null,
    });
    mockSetup.setTableResponse("questions", "update", {
      data: null,
      error: { message: "db error" },
    });
    const result = await updateQuestion(1, subjectId, validInput);
    expect(result.success).toBe(false);
    expect(result.message).toContain("失敗");
  });
});

describe("deleteQuestion", () => {
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
  });

  it("存在しない問題 → エラー", async () => {
    mockSetup.setTableResponse("questions", "select", {
      data: null,
      error: null,
    });
    const result = await deleteQuestion(999, subjectId);
    expect(result.success).toBe(false);
    expect(result.message).toContain("見つかりません");
  });

  it("正常削除 → success", async () => {
    mockSetup.setTableResponse("questions", "select", {
      data: { id: "q1" },
      error: null,
    });
    mockSetup.setTableResponse("questions", "delete", {
      data: null,
      error: null,
    });
    const result = await deleteQuestion(1, subjectId);
    expect(result.success).toBe(true);
  });
});
