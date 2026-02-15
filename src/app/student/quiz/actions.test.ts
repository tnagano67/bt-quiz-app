import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "@/test-utils/supabase-mock";

const mockGetTodayJST = vi.fn().mockReturnValue("2024-06-15");

const mockSetup = createMockSupabase({
  auth: {
    getUser: {
      data: { user: { email: "student@example.com" } },
      error: null,
    },
  },
  tables: {
    students: {
      select: {
        data: {
          id: "s1",
          email: "student@example.com",
          current_grade: "10級",
          consecutive_pass_days: 0,
          last_challenge_date: null,
        },
        error: null,
      },
      update: { data: null, error: null },
    },
    questions: {
      select: {
        data: [
          { question_id: 1, correct_answer: 1 },
          { question_id: 2, correct_answer: 3 },
        ],
        error: null,
      },
    },
    grade_definitions: {
      select: {
        data: [
          {
            grade_name: "10級",
            display_order: 1,
            pass_score: 80,
            required_consecutive_days: 3,
          },
          {
            grade_name: "9級",
            display_order: 2,
            pass_score: 80,
            required_consecutive_days: 3,
          },
        ],
        error: null,
      },
    },
    quiz_records: {
      insert: { data: null, error: null },
    },
  },
});

vi.mock("@/lib/supabase/server", () => mockSetup.mockModule);
vi.mock("@/lib/date-utils", () => ({
  getTodayJST: mockGetTodayJST,
}));

const { saveQuizResult } = await import("./actions");

const baseInput = {
  studentId: "s1",
  grade: "10級",
  score: 100,
  passed: true,
  questionIds: [1, 2],
  studentAnswers: [0, 2], // correct_answer 1→0-based:0, correct_answer 3→0-based:2
  correctAnswers: [0, 2],
};

describe("saveQuizResult", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTodayJST.mockReturnValue("2024-06-15");
    mockSetup.supabase.auth.getUser.mockResolvedValue({
      data: { user: { email: "student@example.com" } },
      error: null,
    });
    mockSetup.setTableResponse("students", "select", {
      data: {
        id: "s1",
        email: "student@example.com",
        current_grade: "10級",
        consecutive_pass_days: 0,
        last_challenge_date: null,
      },
      error: null,
    });
    mockSetup.setTableResponse("students", "update", {
      data: null,
      error: null,
    });
    mockSetup.setTableResponse("questions", "select", {
      data: [
        { question_id: 1, correct_answer: 1 },
        { question_id: 2, correct_answer: 3 },
      ],
      error: null,
    });
    mockSetup.setTableResponse("grade_definitions", "select", {
      data: [
        {
          grade_name: "10級",
          display_order: 1,
          pass_score: 80,
          required_consecutive_days: 3,
        },
        {
          grade_name: "9級",
          display_order: 2,
          pass_score: 80,
          required_consecutive_days: 3,
        },
      ],
      error: null,
    });
    mockSetup.setTableResponse("quiz_records", "insert", {
      data: null,
      error: null,
    });
  });

  it("未認証 → エラー", async () => {
    mockSetup.supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const result = await saveQuizResult(baseInput);
    expect(result.success).toBe(false);
    expect(result.message).toContain("認証");
  });

  it("本人確認失敗 → エラー", async () => {
    mockSetup.setTableResponse("students", "select", {
      data: null,
      error: null,
    });
    const result = await saveQuizResult(baseInput);
    expect(result.success).toBe(false);
    expect(result.message).toContain("生徒情報");
  });

  it("日次制限 → skipped", async () => {
    mockSetup.setTableResponse("students", "select", {
      data: {
        id: "s1",
        email: "student@example.com",
        current_grade: "10級",
        consecutive_pass_days: 0,
        last_challenge_date: "2024-06-15", // 今日と同じ
      },
      error: null,
    });
    const result = await saveQuizResult(baseInput);
    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
  });

  it("問題データ不一致 → エラー", async () => {
    mockSetup.setTableResponse("questions", "select", {
      data: [{ question_id: 1, correct_answer: 1 }], // 2件期待だが1件
      error: null,
    });
    const result = await saveQuizResult(baseInput);
    expect(result.success).toBe(false);
    expect(result.message).toContain("検証に失敗");
  });

  it("正常保存 → success + advancement", async () => {
    const result = await saveQuizResult(baseInput);
    expect(result.success).toBe(true);
    expect(result.advancement).toBeDefined();
  });

  it("quiz_records 挿入エラー → 失敗", async () => {
    mockSetup.setTableResponse("quiz_records", "insert", {
      data: null,
      error: { message: "insert error" },
    });
    const result = await saveQuizResult(baseInput);
    expect(result.success).toBe(false);
    expect(result.message).toContain("保存");
  });

  it("students 更新エラー → 失敗", async () => {
    mockSetup.setTableResponse("students", "update", {
      data: null,
      error: { message: "update error" },
    });
    const result = await saveQuizResult(baseInput);
    expect(result.success).toBe(false);
    expect(result.message).toContain("更新");
  });
});
