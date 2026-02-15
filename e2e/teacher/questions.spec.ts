import { test, expect } from "@playwright/test";
import { TEMP_QUESTION_ID_START } from "../fixtures/test-data";
import path from "path";
import fs from "fs";

test.describe("問題管理", () => {
  test("問題一覧が表示される", async ({ page }) => {
    // 10級のグレードフィルターでテスト問題を絞り込み
    await page.goto("/teacher/questions?grade=10級");

    // テスト問題が表示されていること
    await expect(page.getByText("E2Eテスト問題1", { exact: true })).toBeVisible();
  });

  test("新規問題を登録できる", async ({ page }) => {
    await page.goto("/teacher/questions/new");

    // 問題ID
    await page
      .locator("label")
      .filter({ hasText: "問題ID" })
      .locator("xpath=..").locator("input")
      .fill(String(TEMP_QUESTION_ID_START));

    // 問題文
    await page
      .locator("label")
      .filter({ hasText: "問題文" })
      .locator("xpath=..").locator("textarea")
      .fill("E2Eテスト一時問題");

    // 選択肢
    await page
      .locator("label")
      .filter({ hasText: "選択肢1" })
      .locator("xpath=..").locator("input")
      .fill("一時A");
    await page
      .locator("label")
      .filter({ hasText: "選択肢2" })
      .locator("xpath=..").locator("input")
      .fill("一時B");
    await page
      .locator("label")
      .filter({ hasText: "選択肢3" })
      .locator("xpath=..").locator("input")
      .fill("一時C");
    await page
      .locator("label")
      .filter({ hasText: "選択肢4" })
      .locator("xpath=..").locator("input")
      .fill("一時D");

    // 正解
    await page.locator('input[name="correct_answer"][value="1"]').check();

    // 送信
    await page.getByRole("button", { name: "追加する" }).click();

    // 問題一覧にリダイレクト
    await expect(page).toHaveURL(/\/teacher\/questions/, { timeout: 10000 });
  });

  test("CSVインポートで問題を一括追加できる", async ({ page }) => {
    await page.goto("/teacher/questions");

    // 「問題を追加」メニューを開く
    await page.getByRole("button", { name: "問題を追加" }).click();

    // 「CSVで一括追加」を選択
    await page.getByText("CSVで一括追加").click();

    // CSVファイルを作成して設定
    const csvContent = [
      "question_id,question_text,choice_1,choice_2,choice_3,choice_4,correct_answer",
      `${TEMP_QUESTION_ID_START + 1},CSV問題1,A1,B1,C1,D1,1`,
      `${TEMP_QUESTION_ID_START + 2},CSV問題2,A2,B2,C2,D2,2`,
    ].join("\n");

    const tmpDir = path.join(process.cwd(), "e2e/.auth");
    const csvPath = path.join(tmpDir, "test-questions.csv");
    fs.writeFileSync(csvPath, csvContent, "utf-8");

    // ファイルを選択
    await page.locator('input[type="file"]').setInputFiles(csvPath);

    // プレビューが表示されること
    await expect(page.getByText("2件のデータ")).toBeVisible();
    await expect(page.getByText("CSV問題1")).toBeVisible();

    // インポート実行
    await page.getByRole("button", { name: "インポート実行" }).click();

    // 結果が表示されること
    await expect(page.getByText("追加:")).toBeVisible({ timeout: 10000 });

    // クリーンアップ
    fs.unlinkSync(csvPath);
  });
});
