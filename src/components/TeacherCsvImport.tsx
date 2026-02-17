"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { importTeachers } from "@/app/teacher/teachers/actions";

type ParsedRow = {
  email: string;
  name: string;
};

type ImportState =
  | { phase: "idle" }
  | { phase: "preview"; rows: ParsedRow[]; fileName: string }
  | { phase: "importing" }
  | {
      phase: "done";
      inserted: number;
      skipped: number;
      errors: string[];
    };

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

type Mode = "closed" | "menu" | "csv";

export default function TeacherCsvImport() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("closed");
  const [state, setState] = useState<ImportState>({ phase: "idle" });
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode !== "menu") return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMode("closed");
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMode("closed");
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mode]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text
        .split(/\r?\n/)
        .filter((line) => line.trim() !== "");

      if (lines.length < 2) {
        setParseError("CSVにデータ行がありません");
        return;
      }

      // ヘッダー検証
      const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
      const expectedHeader = ["email", "name"];
      if (
        header.length < 2 ||
        !expectedHeader.every((h, i) => header[i] === h)
      ) {
        setParseError(
          `CSVヘッダーが不正です。期待: ${expectedHeader.join(",")}`
        );
        return;
      }

      const rows: ParsedRow[] = [];
      const errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const fields = parseCsvLine(lines[i]);
        if (fields.length < 2) {
          errors.push(`行${i + 1}: フィールド数が不足しています`);
          continue;
        }

        rows.push({
          email: fields[0].trim(),
          name: fields[1].trim(),
        });
      }

      if (errors.length > 0) {
        setParseError(errors.join("\n"));
        return;
      }

      if (rows.length === 0) {
        setParseError("有効なデータ行がありません");
        return;
      }

      setState({ phase: "preview", rows, fileName: file.name });
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (state.phase !== "preview") return;
    const { rows } = state;

    setState({ phase: "importing" });
    const result = await importTeachers(rows);
    setState({
      phase: "done",
      inserted: result.inserted,
      skipped: result.skipped,
      errors: result.errors,
    });
    router.refresh();
  }

  function handleReset() {
    setState({ phase: "idle" });
    setParseError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  if (mode === "closed" || mode === "menu") {
    return (
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMode(mode === "menu" ? "closed" : "menu")}
          aria-expanded={mode === "menu"}
          aria-haspopup="true"
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          教員を追加
        </button>
        {mode === "menu" && (
          <div role="menu" className="absolute left-0 top-full z-10 mt-1 w-48 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
            <Link
              href="/teacher/teachers/new"
              role="menuitem"
              className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              1件登録
            </Link>
            <button
              onClick={() => setMode("csv")}
              role="menuitem"
              className="block w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              CSVで一括追加
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          CSVインポート（教員）
        </h3>
        <button
          onClick={() => { handleReset(); setMode("closed"); }}
          className="text-xs text-gray-500 hover:text-gray-600"
        >
          閉じる
        </button>
      </div>

      {/* ファイル選択 */}
      {(state.phase === "idle" || parseError) && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-md file:border-0 file:bg-teal-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-teal-700 hover:file:bg-teal-100"
          />
          <p className="mt-1 text-xs text-gray-500">
            ヘッダー: email, name
          </p>
          {parseError && (
            <div role="alert" className="mt-2 rounded-md bg-red-50 p-3 text-xs text-red-700 whitespace-pre-wrap">
              {parseError}
            </div>
          )}
        </div>
      )}

      {/* プレビュー */}
      {state.phase === "preview" && (
        <div>
          <p className="mb-2 text-sm text-gray-600">
            <span className="font-medium">{state.fileName}</span> —{" "}
            {state.rows.length}件のデータ
          </p>
          <div className="mb-3 max-h-48 overflow-auto rounded border border-gray-100">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-2 py-1 text-left text-gray-500">メール</th>
                  <th scope="col" className="px-2 py-1 text-left text-gray-500">氏名</th>
                </tr>
              </thead>
              <tbody>
                {state.rows.slice(0, 10).map((row, i) => (
                  <tr key={i} className="border-t border-gray-50">
                    <td className="max-w-xs truncate px-2 py-1 text-gray-700">
                      {row.email}
                    </td>
                    <td className="px-2 py-1 text-gray-700">{row.name}</td>
                  </tr>
                ))}
                {state.rows.length > 10 && (
                  <tr className="border-t border-gray-50">
                    <td
                      colSpan={2}
                      className="px-2 py-1 text-center text-gray-400"
                    >
                      ...他 {state.rows.length - 10}件
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleImport}
              className="rounded-md bg-teal-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-teal-700"
            >
              インポート実行
            </button>
            <button
              onClick={handleReset}
              className="rounded-md bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-200"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* インポート中 */}
      {state.phase === "importing" && (
        <p className="flex items-center gap-2 text-sm text-gray-500">
          <svg className="h-4 w-4 animate-spin text-teal-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          インポート中...
        </p>
      )}

      {/* 結果表示 */}
      {state.phase === "done" && (
        <div>
          <div role="status" className="mb-3 rounded-md bg-teal-50 p-3 text-sm text-teal-800">
            <p>
              追加: <span className="font-semibold">{state.inserted}件</span>
              {" / "}
              スキップ（既存）: <span className="font-semibold">{state.skipped}件</span>
            </p>
          </div>
          {state.errors.length > 0 && (
            <div role="alert" className="mb-3 rounded-md bg-red-50 p-3 text-xs text-red-700">
              <p className="mb-1 font-medium">
                エラー ({state.errors.length}件):
              </p>
              <ul className="list-inside list-disc">
                {state.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
          <button
            onClick={handleReset}
            className="rounded-md bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-200"
          >
            閉じる
          </button>
        </div>
      )}
    </div>
  );
}
