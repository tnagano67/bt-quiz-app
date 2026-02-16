import { test, expect } from "@playwright/test";
import { STUDENT } from "../fixtures/test-data";

test.describe("学習履歴", () => {
  test("履歴ページが表示される", async ({ page }) => {
    await page.goto("/student/history");

    // 生徒サマリー
    await expect(page.getByText(STUDENT.name)).toBeVisible();
    await expect(page.getByText("総受験回数")).toBeVisible();
    await expect(page.getByText("合格率")).toBeVisible();

    // 履歴セクション
    await expect(page.getByText("直近の受験履歴")).toBeVisible();
  });
});
