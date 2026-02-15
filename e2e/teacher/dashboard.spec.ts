import { test, expect } from "@playwright/test";

test.describe("教員ダッシュボード", () => {
  test("ダッシュボードが表示される", async ({ page }) => {
    await page.goto("/teacher");

    // ウェルカムメッセージ
    await expect(page.getByText("先生、こんにちは")).toBeVisible();

    // 統計カード
    await expect(page.getByText("総生徒数")).toBeVisible();
    await expect(page.getByText("本日の受験数")).toBeVisible();
    await expect(page.getByText("30日合格率")).toBeVisible();
    await expect(page.getByText("30日平均スコア")).toBeVisible();

    // チャート（canvas要素の存在確認）
    const canvases = page.locator("canvas");
    await expect(canvases.first()).toBeVisible();
  });

  test("ナビカードからページ遷移できる", async ({ page }) => {
    await page.goto("/teacher");

    await page.getByText("生徒管理").click();
    await expect(page).toHaveURL(/\/teacher\/students/);
  });
});
