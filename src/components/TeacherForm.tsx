"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createTeacher, updateTeacher } from "@/app/teacher/teachers/actions";
import type { Teacher } from "@/lib/types/database";

type Props = {
  mode?: "create" | "edit";
  defaultValues?: Teacher;
};

export default function TeacherForm({ mode = "create", defaultValues }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultValues?.email ?? "");
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isEdit = mode === "edit";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("メールアドレスを入力してください");
      return;
    }
    if (!name.trim()) {
      setError("氏名を入力してください");
      return;
    }

    setSubmitting(true);

    const input = {
      email: email.trim(),
      name: name.trim(),
    };

    const result = isEdit
      ? await updateTeacher(defaultValues!.id, input)
      : await createTeacher(input);

    if (!result.success) {
      setError(result.message ?? "エラーが発生しました");
      setSubmitting(false);
      return;
    }

    router.push("/teacher/teachers");
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="teacher-email" className="mb-1 block text-xs font-medium text-gray-600">
              メールアドレス
            </label>
            <input
              id="teacher-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
              required
              placeholder="example@school.edu"
            />
          </div>

          <div>
            <label htmlFor="teacher-name" className="mb-1 block text-xs font-medium text-gray-600">
              氏名
            </label>
            <input
              id="teacher-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
              required
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-teal-600 px-6 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {submitting
            ? isEdit
              ? "更新中..."
              : "登録中..."
            : isEdit
              ? "更新する"
              : "登録する"}
        </button>
        <Link
          href="/teacher/teachers"
          className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          キャンセル
        </Link>
      </div>
    </form>
  );
}
