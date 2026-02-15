import { test, expect } from "@playwright/test";

test.describe("グレード管理", () => {
  test("グレード一覧が表示される", async ({ page }) => {
    await page.goto("/teacher/grades");

    // テスト用グレードが表示されていること
    await expect(page.getByText("10級")).toBeVisible();
  });

  test("新規グレードを登録できる", async ({ page }) => {
    await page.goto("/teacher/grades/new");

    // グレード名
    await page
      .locator("label")
      .filter({ hasText: "グレード名" })
      .locator("xpath=..").locator("input")
      .fill("E2Eテスト級");

    // 表示順
    await page
      .locator("label")
      .filter({ hasText: "表示順" })
      .locator("xpath=..").locator("input")
      .fill("99");

    // 必要連続日数
    await page
      .locator("label")
      .filter({ hasText: "必要連続日数" })
      .locator("xpath=..").locator("input")
      .fill("1");

    // 問題ID（開始）
    await page
      .locator("label")
      .filter({ hasText: "問題ID（開始）" })
      .locator("xpath=..").locator("input")
      .fill("9001");

    // 問題ID（終了）
    await page
      .locator("label")
      .filter({ hasText: "問題ID（終了）" })
      .locator("xpath=..").locator("input")
      .fill("9010");

    // 出題数
    await page
      .locator("label")
      .filter({ hasText: "出題数" })
      .locator("xpath=..").locator("input")
      .fill("3");

    // 合格点
    await page
      .locator("label")
      .filter({ hasText: "合格点" })
      .locator("xpath=..").locator("input")
      .fill("60");

    // 送信
    await page.getByRole("button", { name: "追加する" }).click();

    // グレード一覧にリダイレクト
    await expect(page).toHaveURL(/\/teacher\/grades/, { timeout: 10000 });
  });
});
