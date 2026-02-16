"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { importQuestions } from "@/app/teacher/questions/actions";
import type { Subject } from "@/lib/types/database";

type ParsedRow = {
  question_id: number;
  question_text: string;
  choice_1: string;
  choice_2: string;
  choice_3: string;
  choice_4: string;
  correct_answer: number;
};

type ImportState =
  | { phase: "idle" }
  | { phase: "preview"; rows: ParsedRow[]; fileName: string }
  | { phase: "importing" }
  | {
      phase: "done";
      inserted: number;
      updated: number;
      errors: string[];
    };

import { parseCsvRows } from "@/lib/csv-utils";

type Mode = "closed" | "menu" | "csv";

type Props = {
  subjects: Subject[];
  selectedSubjectId: string;
};

export default function CsvImport({ subjects, selectedSubjectId }: Props) {
  const [mode, setMode] = useState<Mode>("closed");
  const [state, setState] = useState<ImportState>({ phase: "idle" });
  const [parseError, setParseError] = useState<string | null>(null);
  const [importSubjectId, setImportSubjectId] = useState(selectedSubjectId);
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
      const buffer = ev.target?.result as ArrayBuffer;
      // UTF-8 でデコードを試み、置換文字（U+FFFD）が含まれる場合は Shift_JIS で再デコード
      let text = new TextDecoder("utf-8").decode(buffer);
      if (text.includes("\uFFFD")) {
        text = new TextDecoder("shift-jis").decode(buffer);
      }
      const csvRows = parseCsvRows(text);

      if (csvRows.length < 2) {
        setParseError("CSVにデータ行がありません");
        return;
      }

      // ヘッダー検証
      const header = csvRows[0].map((h) => h.trim().toLowerCase());
      const expectedHeader = [
        "question_id",
        "question_text",
        "choice_1",
        "choice_2",
        "choice_3",
        "choice_4",
        "correct_answer",
      ];
      if (
        header.length < 7 ||
        !expectedHeader.every((h, i) => header[i] === h)
      ) {
        setParseError(
          `CSVヘッダーが不正です。期待: ${expectedHeader.join(",")}`
        );
        return;
      }

      const rows: ParsedRow[] = [];
      const errors: string[] = [];

      for (let i = 1; i < csvRows.length; i++) {
        const fields = csvRows[i];
        if (fields.length < 7) {
          errors.push(`行${i + 1}: フィールド数が不足しています`);
          continue;
        }

        const questionId = parseInt(fields[0], 10);
        const correctAnswer = parseInt(fields[6], 10);

        if (isNaN(questionId) || isNaN(correctAnswer)) {
          errors.push(`行${i + 1}: 数値の解析に失敗しました`);
          continue;
        }

        rows.push({
          question_id: questionId,
          question_text: fields[1].trim(),
          choice_1: fields[2].trim(),
          choice_2: fields[3].trim(),
          choice_3: fields[4].trim(),
          choice_4: fields[5].trim(),
          correct_answer: correctAnswer,
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
    reader.readAsArrayBuffer(file);
  }

  async function handleImport() {
    if (state.phase !== "preview") return;
    const { rows } = state;

    setState({ phase: "importing" });
    const result = await importQuestions(rows, importSubjectId);
    setState({
      phase: "done",
      inserted: result.inserted,
      updated: result.updated,
      errors: result.errors,
    });
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
          問題を追加
        </button>
        {mode === "menu" && (
          <div role="menu" className="absolute left-0 top-full z-10 mt-1 w-48 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
            <Link
              href="/teacher/questions/new"
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
          CSVインポート（問題）
        </h3>
        <button
          onClick={() => { handleReset(); setMode("closed"); }}
          className="text-xs text-gray-500 hover:text-gray-600"
        >
          閉じる
        </button>
      </div>

      {/* 科目選択 */}
      {(state.phase === "idle" || parseError) && subjects.length > 1 && (
        <div className="mb-3">
          <label htmlFor="import-subject" className="mb-1 block text-xs font-medium text-gray-600">
            インポート先の科目
          </label>
          <select
            id="import-subject"
            value={importSubjectId}
            onChange={(e) => setImportSubjectId(e.target.value)}
            className="w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

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
            ヘッダー: question_id, question_text, choice_1, choice_2, choice_3,
            choice_4, correct_answer
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
                  <th scope="col" className="px-2 py-1 text-left text-gray-500">ID</th>
                  <th scope="col" className="px-2 py-1 text-left text-gray-500">問題文</th>
                  <th scope="col" className="px-2 py-1 text-left text-gray-500">正答</th>
                </tr>
              </thead>
              <tbody>
                {state.rows.slice(0, 10).map((row) => (
                  <tr key={row.question_id} className="border-t border-gray-50">
                    <td className="px-2 py-1 text-gray-700">
                      {row.question_id}
                    </td>
                    <td className="max-w-xs truncate px-2 py-1 text-gray-700">
                      {row.question_text}
                    </td>
                    <td className="px-2 py-1 text-gray-700">
                      {row.correct_answer}
                    </td>
                  </tr>
                ))}
                {state.rows.length > 10 && (
                  <tr className="border-t border-gray-50">
                    <td
                      colSpan={3}
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
        <p className="text-sm text-gray-500">インポート中...</p>
      )}

      {/* 結果表示 */}
      {state.phase === "done" && (
        <div>
          <div role="status" className="mb-3 rounded-md bg-teal-50 p-3 text-sm text-teal-800">
            <p>
              追加: <span className="font-semibold">{state.inserted}件</span>
              {" / "}
              更新: <span className="font-semibold">{state.updated}件</span>
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
