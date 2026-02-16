import { createClient } from "@supabase/supabase-js";
import {
  TEACHER,
  STUDENT,
  GRADE_DEFINITION,
  TEST_QUESTIONS,
  TEST_SUBJECT,
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

  // テスト中に作成された一時問題データを削除
  await admin
    .from("questions")
    .delete()
    .gte("question_id", TEMP_QUESTION_ID_START);

  // テスト中に作成された一時生徒データを削除
  await admin
    .from("students")
    .delete()
    .eq("number", TEMP_STUDENT_NUMBER)
    .eq("year", STUDENT.year)
    .eq("class", STUDENT.class);

  // テスト中に作成された一時グレード定義を削除（テスト科目に紐づく一時データ）
  await admin
    .from("grade_definitions")
    .delete()
    .eq("subject_id", TEST_SUBJECT.id)
    .neq("grade_name", GRADE_DEFINITION.grade_name);
}

export async function seedTestData() {
  const admin = getAdminClient();

  // 1. 科目を upsert（他テーブルがFK参照するため最初に実行）
  const { error: subjectError } = await admin.from("subjects").upsert(
    {
      id: TEST_SUBJECT.id,
      name: TEST_SUBJECT.name,
      display_order: TEST_SUBJECT.display_order,
    },
    { onConflict: "id" }
  );
  if (subjectError) throw new Error(`Subject seed failed: ${subjectError.message}`);

  // 2. 教員データを upsert
  const { error: teacherError } = await admin.from("teachers").upsert(
    { email: TEACHER.email, name: TEACHER.name },
    { onConflict: "email" }
  );
  if (teacherError) throw new Error(`Teacher seed failed: ${teacherError.message}`);

  // 3. グレード定義を upsert
  const { error: gradeError } = await admin.from("grade_definitions").upsert(
    GRADE_DEFINITION,
    { onConflict: "subject_id,grade_name" }
  );
  if (gradeError) throw new Error(`Grade seed failed: ${gradeError.message}`);

  // 4. テスト問題を upsert
  const { error: questionError } = await admin
    .from("questions")
    .upsert(TEST_QUESTIONS, { onConflict: "subject_id,question_id" });
  if (questionError) throw new Error(`Question seed failed: ${questionError.message}`);

  // 5. 生徒データを upsert
  const { data: studentData, error: studentError } = await admin
    .from("students")
    .upsert(
      {
        email: STUDENT.email,
        name: STUDENT.name,
        year: STUDENT.year,
        class: STUDENT.class,
        number: STUDENT.number,
      },
      { onConflict: "email" }
    )
    .select("id")
    .single();
  if (studentError) throw new Error(`Student seed failed: ${studentError.message}`);

  // 6. 生徒の科目進捗を upsert
  if (studentData) {
    const { error: progressError } = await admin
      .from("student_subject_progress")
      .upsert(
        {
          student_id: studentData.id,
          subject_id: TEST_SUBJECT.id,
          current_grade: GRADE_DEFINITION.grade_name,
          consecutive_pass_days: 0,
          last_challenge_date: null,
        },
        { onConflict: "student_id,subject_id" }
      );
    if (progressError)
      throw new Error(`Progress seed failed: ${progressError.message}`);
  }
}

export async function resetStudentChallengeDate() {
  const admin = getAdminClient();

  // 生徒IDを取得
  const { data: student } = await admin
    .from("students")
    .select("id")
    .eq("email", STUDENT.email)
    .single();

  if (student) {
    await admin
      .from("student_subject_progress")
      .update({ last_challenge_date: null, consecutive_pass_days: 0 })
      .eq("student_id", student.id)
      .eq("subject_id", TEST_SUBJECT.id);
  }
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
