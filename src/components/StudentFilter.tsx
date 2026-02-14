"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

type Props = {
  grades: string[];
};

export default function StudentFilter({ grades }: Props) {
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">
            学年
          </label>
          <select
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
          <label className="mb-1 block text-xs font-medium text-gray-600">
            組
          </label>
          <select
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
          <label className="mb-1 block text-xs font-medium text-gray-600">
            グレード（開始）
          </label>
          <select
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
          <label className="mb-1 block text-xs font-medium text-gray-600">
            グレード（終了）
          </label>
          <select
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
          <label className="mb-1 block text-xs font-medium text-gray-600">
            氏名
          </label>
          <input
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
