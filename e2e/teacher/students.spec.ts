import { test, expect } from "@playwright/test";
import { STUDENT, TEMP_STUDENT_NUMBER } from "../fixtures/test-data";

test.describe("生徒管理", () => {
  test("生徒一覧が表示される", async ({ page }) => {
    await page.goto("/teacher/students");

    // テスト生徒が表示されていること
    await expect(page.getByText(STUDENT.name)).toBeVisible();
  });

  test("新規生徒を登録できる", async ({ page }) => {
    await page.goto("/teacher/students/new");

    // フォームに入力
    await page
      .locator("label")
      .filter({ hasText: "メールアドレス" })
      .locator("xpath=..")
      .locator("input")
      .fill(`e2e-temp-student@example.com`);

    await page
      .locator("label")
      .filter({ hasText: "学年" })
      .locator("xpath=..")
      .locator("select")
      .selectOption("1");

    await page
      .locator("label")
      .filter({ hasText: "組" })
      .locator("xpath=..")
      .locator("select")
      .selectOption("1");

    await page
      .locator("label")
      .filter({ hasText: "番号" })
      .locator("xpath=..")
      .locator("input")
      .fill(String(TEMP_STUDENT_NUMBER));

    await page
      .locator("label")
      .filter({ hasText: "氏名" })
      .locator("xpath=..")
      .locator("input")
      .fill("E2E一時テスト生徒");

    // 送信
    await page.getByRole("button", { name: "登録する" }).click();

    // 生徒一覧にリダイレクト
    await expect(page).toHaveURL(/\/teacher\/students/, { timeout: 10000 });
  });
});
