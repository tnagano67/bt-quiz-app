"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createGrade, updateGrade } from "@/app/teacher/grades/actions";
import type { GradeDefinition, Subject } from "@/lib/types/database";

type Props = {
  mode: "create" | "edit";
  defaultValues?: GradeDefinition;
  subjects?: Subject[];
  subjectName?: string;
};

export default function GradeForm({ mode, defaultValues, subjects, subjectName }: Props) {
  const router = useRouter();
  const [subjectId, setSubjectId] = useState(
    defaultValues?.subject_id ?? subjects?.[0]?.id ?? ""
  );
  const [gradeName, setGradeName] = useState(
    defaultValues?.grade_name ?? ""
  );
  const [displayOrder, setDisplayOrder] = useState(
    defaultValues?.display_order?.toString() ?? ""
  );
  const [startId, setStartId] = useState(
    defaultValues?.start_id?.toString() ?? ""
  );
  const [endId, setEndId] = useState(
    defaultValues?.end_id?.toString() ?? ""
  );
  const [numQuestions, setNumQuestions] = useState(
    defaultValues?.num_questions?.toString() ?? ""
  );
  const [passScore, setPassScore] = useState(
    defaultValues?.pass_score?.toString() ?? ""
  );
  const [requiredDays, setRequiredDays] = useState(
    defaultValues?.required_consecutive_days?.toString() ?? ""
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "create" && !subjectId) {
      setError("科目を選択してください");
      return;
    }
    if (mode === "create" && !gradeName.trim()) {
      setError("グレード名を入力してください");
      return;
    }

    const order = Number(displayOrder);
    const start = Number(startId);
    const end = Number(endId);
    const num = Number(numQuestions);
    const pass = Number(passScore);
    const days = Number(requiredDays);

    if (!Number.isInteger(order) || order < 0) {
      setError("表示順は0以上の整数を入力してください");
      return;
    }
    if (!Number.isInteger(start) || start < 1) {
      setError("開始IDは正の整数を入力してください");
      return;
    }
    if (!Number.isInteger(end) || end < start) {
      setError("終了IDは開始ID以上の整数を入力してください");
      return;
    }
    if (!Number.isInteger(num) || num < 1) {
      setError("出題数は1以上の整数を入力してください");
      return;
    }
    if (!Number.isInteger(pass) || pass < 0 || pass > 100) {
      setError("合格点は0〜100の整数を入力してください");
      return;
    }
    if (!Number.isInteger(days) || days < 1) {
      setError("必要連続日数は1以上の整数を入力してください");
      return;
    }

    setSubmitting(true);

    const input = {
      display_order: order,
      start_id: start,
      end_id: end,
      num_questions: num,
      pass_score: pass,
      required_consecutive_days: days,
    };

    const result =
      mode === "create"
        ? await createGrade({ ...input, subject_id: subjectId, grade_name: gradeName.trim() })
        : await updateGrade(defaultValues!.id, input);

    if (!result.success) {
      setError(result.message ?? "エラーが発生しました");
      setSubmitting(false);
      return;
    }

    router.push("/teacher/grades");
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
          {/* 科目選択 */}
          <div>
            <label htmlFor="grade-subject" className="mb-1 block text-xs font-medium text-gray-600">
              科目
            </label>
            {mode === "create" && subjects ? (
              <select
                id="grade-subject"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
                required
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-gray-700">{subjectName}</p>
            )}
          </div>

          <div>
            <label htmlFor="grade-name" className="mb-1 block text-xs font-medium text-gray-600">
              グレード名
            </label>
            <input
              id="grade-name"
              type="text"
              value={gradeName}
              onChange={(e) => setGradeName(e.target.value)}
              disabled={mode === "edit"}
              className="w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 disabled:bg-gray-100 disabled:text-gray-500"
              required
              placeholder="例: 10級"
            />
            {mode === "edit" && (
              <p className="mt-1 text-xs text-gray-400">
                グレード名は変更できません
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="display-order" className="mb-1 block text-xs font-medium text-gray-600">
                表示順
              </label>
              <input
                id="display-order"
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
                required
                min={0}
              />
            </div>

            <div>
              <label htmlFor="required-days" className="mb-1 block text-xs font-medium text-gray-600">
                必要連続日数
              </label>
              <input
                id="required-days"
                type="number"
                value={requiredDays}
                onChange={(e) => setRequiredDays(e.target.value)}
                className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
                required
                min={1}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="start-id" className="mb-1 block text-xs font-medium text-gray-600">
                問題ID（開始）
              </label>
              <input
                id="start-id"
                type="number"
                value={startId}
                onChange={(e) => setStartId(e.target.value)}
                className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
                required
                min={1}
              />
            </div>

            <div>
              <label htmlFor="end-id" className="mb-1 block text-xs font-medium text-gray-600">
                問題ID（終了）
              </label>
              <input
                id="end-id"
                type="number"
                value={endId}
                onChange={(e) => setEndId(e.target.value)}
                className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
                required
                min={1}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="num-questions" className="mb-1 block text-xs font-medium text-gray-600">
                出題数
              </label>
              <input
                id="num-questions"
                type="number"
                value={numQuestions}
                onChange={(e) => setNumQuestions(e.target.value)}
                className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
                required
                min={1}
              />
            </div>

            <div>
              <label htmlFor="pass-score" className="mb-1 block text-xs font-medium text-gray-600">
                合格点
              </label>
              <input
                id="pass-score"
                type="number"
                value={passScore}
                onChange={(e) => setPassScore(e.target.value)}
                className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
                required
                min={0}
                max={100}
              />
            </div>
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
            ? "保存中..."
            : mode === "create"
              ? "追加する"
              : "更新する"}
        </button>
        <Link
          href="/teacher/grades"
          className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          キャンセル
        </Link>
      </div>
    </form>
  );
}
