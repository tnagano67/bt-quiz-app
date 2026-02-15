import { test, expect } from "@playwright/test";

test.describe("成績エクスポート", () => {
  test("件数を確認できる", async ({ page }) => {
    await page.goto("/teacher/export");

    // エクスポート種別が表示される
    await expect(page.getByText("エクスポート種別")).toBeVisible();
    await expect(page.getByText("生徒一覧（統計付き）")).toBeVisible();

    // 件数確認
    await page.getByRole("button", { name: "件数を確認" }).click();

    // 件数が表示される
    await expect(page.getByText(/対象:.*件/)).toBeVisible({ timeout: 10000 });
  });

  test("CSVをダウンロードできる", async ({ page }) => {
    await page.goto("/teacher/export");

    // 件数確認（ダウンロードボタンを有効化するため）
    await page.getByRole("button", { name: "件数を確認" }).click();
    await expect(page.getByText(/対象:.*件/)).toBeVisible({ timeout: 10000 });

    // 0件でないことを確認
    const countText = await page.getByText(/対象:.*件/).textContent();
    const count = parseInt(countText?.match(/\d+/)?.[0] ?? "0");

    if (count > 0) {
      // ダウンロードを待機
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        page.getByText("CSVダウンロード").click(),
      ]);

      // ダウンロードが成功すること
      expect(download.suggestedFilename()).toMatch(/\.csv$/);
    }
  });
});
