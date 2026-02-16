"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSubject, updateSubject } from "@/app/teacher/subjects/actions";
import type { Subject } from "@/lib/types/database";

type Props = {
  mode: "create" | "edit";
  defaultValues?: Subject;
};

export default function SubjectForm({ mode, defaultValues }: Props) {
  const router = useRouter();
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [displayOrder, setDisplayOrder] = useState(
    defaultValues?.display_order?.toString() ?? ""
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("科目名を入力してください");
      return;
    }

    const order = Number(displayOrder);
    if (!Number.isInteger(order) || order < 0) {
      setError("表示順は0以上の整数を入力してください");
      return;
    }

    setSubmitting(true);

    const input = {
      name: name.trim(),
      display_order: order,
    };

    const result =
      mode === "create"
        ? await createSubject(input)
        : await updateSubject(defaultValues!.id, input);

    if (!result.success) {
      setError(result.message ?? "エラーが発生しました");
      setSubmitting(false);
      return;
    }

    router.push("/teacher/subjects");
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
            <label htmlFor="subject-name" className="mb-1 block text-xs font-medium text-gray-600">
              科目名
            </label>
            <input
              id="subject-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
              required
              placeholder="例: 英語"
            />
          </div>

          <div>
            <label htmlFor="subject-display-order" className="mb-1 block text-xs font-medium text-gray-600">
              表示順
            </label>
            <input
              id="subject-display-order"
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(e.target.value)}
              className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
              required
              min={0}
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
            ? "保存中..."
            : mode === "create"
              ? "追加する"
              : "更新する"}
        </button>
        <Link
          href="/teacher/subjects"
          className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          キャンセル
        </Link>
      </div>
    </form>
  );
}
