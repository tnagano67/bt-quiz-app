import { test as setup, type Page } from "@playwright/test";
import {
  cleanupTestData,
  seedTestData,
  getOrCreateUser,
  signInAndGetSession,
} from "./helpers/seed";
import { TEACHER, STUDENT } from "./fixtures/test-data";

function getSupabaseProjectRef(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  // https://<ref>.supabase.co → <ref>
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!match) throw new Error(`Cannot parse project ref from ${url}`);
  return match[1];
}

async function setupAuth(
  email: string,
  password: string,
  storageStatePath: string,
  page: Page
) {
  // Supabase Auth ユーザーを作成（既存なら取得）
  await getOrCreateUser(email, password);

  // サインインしてセッションを取得
  const session = await signInAndGetSession(email, password);
  if (!session) throw new Error(`No session for ${email}`);

  const ref = getSupabaseProjectRef();
  const cookieName = `sb-${ref}-auth-token`;
  const cookieValue = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    expires_in: session.expires_in,
    token_type: session.token_type,
  });

  // ブラウザにクッキーを設定
  await page.context().addCookies([
    {
      name: cookieName,
      value: cookieValue,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  // 認証が機能することを確認
  await page.goto("/");
  await page.waitForURL(/\/(teacher|student)/, { timeout: 10000 });

  // storageState を保存
  await page.context().storageState({ path: storageStatePath });
}

setup("authenticate and seed data", async ({ page }) => {
  // 前回のゴミデータをクリーンアップ
  await cleanupTestData();

  // テストデータを投入
  await seedTestData();

  // 教員の認証セッションを作成
  await setupAuth(
    TEACHER.email,
    TEACHER.password,
    "e2e/.auth/teacher.json",
    page
  );

  // 新しいコンテキストで生徒の認証セッションを作成
  const studentContext = await page.context().browser()!.newContext();
  const studentPage = await studentContext.newPage();

  await setupAuth(
    STUDENT.email,
    STUDENT.password,
    "e2e/.auth/student.json",
    studentPage
  );

  await studentContext.close();
});
