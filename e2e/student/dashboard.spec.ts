import { test, expect } from "@playwright/test";
import { STUDENT } from "../fixtures/test-data";

test.describe("生徒ダッシュボード", () => {
  test("ダッシュボードが表示される", async ({ page }) => {
    await page.goto("/student");

    // 生徒情報カード
    await expect(page.getByText(STUDENT.name)).toBeVisible();
    await expect(page.getByText("現在のグレード")).toBeVisible();
    await expect(page.getByText("連続合格日数")).toBeVisible();

    // チャート（canvas要素の存在確認）
    const canvas = page.locator("canvas");
    await expect(canvas.first()).toBeVisible();

    // ナビリンク
    await expect(page.getByText("小テストを受ける")).toBeVisible();
    await expect(page.getByText("履歴を見る")).toBeVisible();
  });

  test("小テストページへ遷移できる", async ({ page }) => {
    await page.goto("/student");

    await page.getByText("小テストを受ける").click();
    await expect(page).toHaveURL(/\/student\/quiz/);
  });

  test("履歴ページへ遷移できる", async ({ page }) => {
    await page.goto("/student");

    await page.getByText("履歴を見る").click();
    await expect(page).toHaveURL(/\/student\/history/);
  });
});
