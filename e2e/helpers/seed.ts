import { createClient } from "@supabase/supabase-js";
import {
  TEACHER,
  STUDENT,
  GRADE_DEFINITION,
  TEST_QUESTIONS,
  TEMP_QUESTION_ID_START,
  TEMP_STUDENT_NUMBER,
} from "../fixtures/test-data";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function cleanupTestData() {
  const admin = getAdminClient();

  // テスト中に作成された一時データを削除
  await admin
    .from("questions")
    .delete()
    .gte("question_id", TEMP_QUESTION_ID_START);

  await admin
    .from("students")
    .delete()
    .eq("number", TEMP_STUDENT_NUMBER)
    .eq("year", STUDENT.year)
    .eq("class", STUDENT.class);
}

export async function seedTestData() {
  const admin = getAdminClient();

  // 1. 教員データを upsert
  const { error: teacherError } = await admin.from("teachers").upsert(
    { email: TEACHER.email, name: TEACHER.name },
    { onConflict: "email" }
  );
  if (teacherError) throw new Error(`Teacher seed failed: ${teacherError.message}`);

  // 2. グレード定義を upsert
  const { error: gradeError } = await admin.from("grade_definitions").upsert(
    GRADE_DEFINITION,
    { onConflict: "grade_name" }
  );
  if (gradeError) throw new Error(`Grade seed failed: ${gradeError.message}`);

  // 3. テスト問題を upsert
  const { error: questionError } = await admin
    .from("questions")
    .upsert(TEST_QUESTIONS, { onConflict: "question_id" });
  if (questionError) throw new Error(`Question seed failed: ${questionError.message}`);

  // 4. 生徒データを upsert
  const { error: studentError } = await admin.from("students").upsert(
    {
      email: STUDENT.email,
      name: STUDENT.name,
      year: STUDENT.year,
      class: STUDENT.class,
      number: STUDENT.number,
      current_grade: STUDENT.currentGrade,
      consecutive_pass_days: 0,
      last_challenge_date: null,
    },
    { onConflict: "email" }
  );
  if (studentError) throw new Error(`Student seed failed: ${studentError.message}`);
}

export async function resetStudentChallengeDate() {
  const admin = getAdminClient();
  await admin
    .from("students")
    .update({ last_challenge_date: null, consecutive_pass_days: 0 })
    .eq("email", STUDENT.email);
}

export async function getOrCreateUser(email: string, password: string) {
  const admin = getAdminClient();

  // 既存ユーザーを検索
  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const existing = existingUsers?.users?.find((u) => u.email === email);

  if (existing) {
    return existing;
  }

  // 新規作成
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`Failed to create user ${email}: ${error.message}`);
  return data.user;
}

export async function signInAndGetSession(email: string, password: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const anon = createClient(url, anonKey);
  const { data, error } = await anon.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw new Error(`Sign in failed for ${email}: ${error.message}`);
  return data.session;
}
