"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import type { Subject } from "@/lib/types/database";

type Props = {
  grades: string[];
  subjects: Subject[];
  selectedSubjectId: string;
};

export default function StudentFilter({ grades, subjects, selectedSubjectId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`/teacher/students?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      {/* 科目タブ */}
      {subjects.length > 1 && (
        <div className="mb-3 flex gap-2 border-b border-gray-200 pb-3">
          {subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => updateParams("subject", s.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                s.id === selectedSubjectId
                  ? "bg-teal-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
        <div>
          <label htmlFor="filter-year" className="mb-1 block text-xs font-medium text-gray-600">
            学年
          </label>
          <select
            id="filter-year"
            value={searchParams.get("year") ?? ""}
            onChange={(e) => updateParams("year", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
          >
            <option value="">全て</option>
            {[1, 2, 3].map((y) => (
              <option key={y} value={y}>
                {y}年
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-class" className="mb-1 block text-xs font-medium text-gray-600">
            組
          </label>
          <select
            id="filter-class"
            value={searchParams.get("class") ?? ""}
            onChange={(e) => updateParams("class", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
          >
            <option value="">全て</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((c) => (
              <option key={c} value={c}>
                {c}組
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-grade-from" className="mb-1 block text-xs font-medium text-gray-600">
            グレード（開始）
          </label>
          <select
            id="filter-grade-from"
            value={searchParams.get("gradeFrom") ?? ""}
            onChange={(e) => updateParams("gradeFrom", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
          >
            <option value="">全て</option>
            {grades.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-grade-to" className="mb-1 block text-xs font-medium text-gray-600">
            グレード（終了）
          </label>
          <select
            id="filter-grade-to"
            value={searchParams.get("gradeTo") ?? ""}
            onChange={(e) => updateParams("gradeTo", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
          >
            <option value="">全て</option>
            {grades.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <label htmlFor="filter-name" className="mb-1 block text-xs font-medium text-gray-600">
            氏名
          </label>
          <input
            id="filter-name"
            type="text"
            placeholder="部分一致で検索"
            defaultValue={searchParams.get("name") ?? ""}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateParams("name", e.currentTarget.value);
              }
            }}
            onBlur={(e) => updateParams("name", e.currentTarget.value)}
            className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-400"
          />
        </div>
      </div>
    </div>
  );
}
