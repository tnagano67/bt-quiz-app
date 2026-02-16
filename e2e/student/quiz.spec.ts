import { test, expect } from "@playwright/test";
import { TEST_SUBJECT } from "../fixtures/test-data";
import { resetStudentChallengeDate } from "../helpers/seed";

test.describe("小テスト受験", () => {
  test.beforeEach(async () => {
    // 日次制限をリセット
    await resetStudentChallengeDate();
  });

  test("小テストを受験して結果が表示される", async ({ page }) => {
    await page.goto(`/student/quiz?subject=${TEST_SUBJECT.id}`);

    // 問題が読み込まれるまで待機
    await expect(page.getByText(/Q1\./)).toBeVisible({ timeout: 15000 });

    // 全問題の数を確認（3問出題）
    const questions = page.locator('[class*="rounded-lg border-2"]');
    const questionCount = await questions.count();
    expect(questionCount).toBe(3);

    // 全問に回答（各問題の最初の選択肢を選択）
    for (let i = 0; i < questionCount; i++) {
      await page.locator(`input[name="question-${i}"]`).first().check();
    }

    // 回答を送信
    await page.getByRole("button", { name: "回答を送信" }).click();

    // 結果が表示される
    await expect(page.getByText(/%/)).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByText(/合格！|不合格/)
    ).toBeVisible();
    await expect(page.getByText(/問中.*問正解/)).toBeVisible();

    // ホームに戻るボタン
    await expect(
      page.getByRole("button", { name: "ホームに戻る" })
    ).toBeVisible();
  });

  test("全問未回答では送信できない", async ({ page }) => {
    await page.goto(`/student/quiz?subject=${TEST_SUBJECT.id}`);

    // 問題が読み込まれるまで待機
    await expect(page.getByText(/Q1\./)).toBeVisible({ timeout: 15000 });

    // 送信ボタンが無効であること
    const submitButton = page.getByRole("button", { name: "回答を送信" });
    await expect(submitButton).toBeDisabled();
  });
});
