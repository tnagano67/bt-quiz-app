"use client";

import { useState, useEffect, useCallback } from "react";
import { countExportRows, getGradeNames } from "./actions";

type ExportType = "students" | "records";

export default function ExportPage() {
  const [exportType, setExportType] = useState<ExportType>("students");
  const [year, setYear] = useState("");
  const [cls, setCls] = useState("");
  const [gradeFrom, setGradeFrom] = useState("");
  const [gradeTo, setGradeTo] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [gradeNames, setGradeNames] = useState<string[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);

  useEffect(() => {
    getGradeNames().then(setGradeNames);
  }, []);

  // フィルター変更時にカウントをリセット
  useEffect(() => {
    setCount(null);
  }, [exportType, year, cls, gradeFrom, gradeTo, dateFrom, dateTo]);

  const handleCount = useCallback(async () => {
    setCounting(true);
    try {
      const result = await countExportRows({
        type: exportType,
        year: year || undefined,
        cls: cls || undefined,
        gradeFrom: gradeFrom || undefined,
        gradeTo: gradeTo || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      if (result.success) {
        setCount(result.count ?? 0);
      }
    } finally {
      setCounting(false);
    }
  }, [exportType, year, cls, gradeFrom, gradeTo, dateFrom, dateTo]);

  const downloadUrl = (() => {
    const params = new URLSearchParams();
    params.set("type", exportType);
    if (year) params.set("year", year);
    if (cls) params.set("class", cls);
    if (gradeFrom) params.set("gradeFrom", gradeFrom);
    if (gradeTo) params.set("gradeTo", gradeTo);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    return `/api/teacher/export?${params.toString()}`;
  })();

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-bold text-gray-800">成績エクスポート</h2>

      {/* エクスポート種別 */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="mb-3 text-sm font-bold text-gray-700">エクスポート種別</p>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="exportType"
              value="students"
              checked={exportType === "students"}
              onChange={() => setExportType("students")}
              className="accent-teal-600"
            />
            生徒一覧（統計付き）
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="exportType"
              value="records"
              checked={exportType === "records"}
              onChange={() => setExportType("records")}
              className="accent-teal-600"
            />
            受験記録詳細
          </label>
        </div>
      </div>

      {/* フィルター */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="mb-3 text-sm font-bold text-gray-700">フィルター</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-gray-500">学年</label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">すべて</option>
              {[1, 2, 3].map((y) => (
                <option key={y} value={y}>
                  {y}年
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">組</label>
            <select
              value={cls}
              onChange={(e) => setCls(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">すべて</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((c) => (
                <option key={c} value={c}>
                  {c}組
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">
              グレード（から）
            </label>
            <select
              value={gradeFrom}
              onChange={(e) => setGradeFrom(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">指定なし</option>
              {gradeNames.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">
              グレード（まで）
            </label>
            <select
              value={gradeTo}
              onChange={(e) => setGradeTo(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">指定なし</option>
              {gradeNames.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 日付範囲（受験記録のみ） */}
        {exportType === "records" && (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs text-gray-500">
                受験日（から）
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">
                受験日（まで）
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* アクション */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleCount}
            disabled={counting}
            className="rounded-lg border border-teal-600 px-4 py-2 text-sm font-bold text-teal-600 hover:bg-teal-50 disabled:opacity-50"
          >
            {counting ? "確認中..." : "件数を確認"}
          </button>

          {count !== null && (
            <span className="text-sm text-gray-600">
              対象: <span className="font-bold text-teal-700">{count}件</span>
            </span>
          )}

          <a
            href={downloadUrl}
            download
            className={`rounded-lg px-4 py-2 text-sm font-bold text-white ${
              count === null || count === 0
                ? "pointer-events-none bg-gray-300"
                : "bg-teal-600 hover:bg-teal-700"
            }`}
            aria-disabled={count === null || count === 0}
          >
            CSVダウンロード
          </a>
        </div>
        {count === 0 && (
          <p className="mt-2 text-xs text-gray-500">
            条件に該当するデータがありません。フィルターを変更してください。
          </p>
        )}
      </div>
    </div>
  );
}
