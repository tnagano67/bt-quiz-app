"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createStudent } from "@/app/teacher/students/actions";

export default function StudentForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [year, setYear] = useState("");
  const [cls, setCls] = useState("");
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const y = Number(year);
    const c = Number(cls);
    const n = Number(number);

    if (!email.trim()) {
      setError("メールアドレスを入力してください");
      return;
    }
    if (!Number.isInteger(y) || y < 1 || y > 3) {
      setError("学年は1〜3の整数を入力してください");
      return;
    }
    if (!Number.isInteger(c) || c < 1 || c > 10) {
      setError("組は1〜10の整数を入力してください");
      return;
    }
    if (!Number.isInteger(n) || n < 1) {
      setError("番号は正の整数を入力してください");
      return;
    }
    if (!name.trim()) {
      setError("氏名を入力してください");
      return;
    }

    setSubmitting(true);

    const result = await createStudent({
      email: email.trim(),
      year: y,
      class: c,
      number: n,
      name: name.trim(),
    });

    if (!result.success) {
      setError(result.message ?? "エラーが発生しました");
      setSubmitting(false);
      return;
    }

    router.push("/teacher/students");
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
            <label htmlFor="student-email" className="mb-1 block text-xs font-medium text-gray-600">
              メールアドレス
            </label>
            <input
              id="student-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
              required
              placeholder="example@school.edu"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="student-year" className="mb-1 block text-xs font-medium text-gray-600">
                学年
              </label>
              <select
                id="student-year"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
                required
              >
                <option value="">選択</option>
                <option value="1">1年</option>
                <option value="2">2年</option>
                <option value="3">3年</option>
              </select>
            </div>

            <div>
              <label htmlFor="student-class" className="mb-1 block text-xs font-medium text-gray-600">
                組
              </label>
              <select
                id="student-class"
                value={cls}
                onChange={(e) => setCls(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
                required
              >
                <option value="">選択</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>
                    {n}組
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="student-number" className="mb-1 block text-xs font-medium text-gray-600">
                番号
              </label>
              <input
                id="student-number"
                type="number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
                required
                min={1}
              />
            </div>
          </div>

          <div>
            <label htmlFor="student-name" className="mb-1 block text-xs font-medium text-gray-600">
              氏名
            </label>
            <input
              id="student-name"
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
          {submitting ? "登録中..." : "登録する"}
        </button>
        <Link
          href="/teacher/students"
          className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          キャンセル
        </Link>
      </div>
    </form>
  );
}
