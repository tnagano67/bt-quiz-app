"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createQuestion,
  updateQuestion,
} from "@/app/teacher/questions/actions";
import type { Question } from "@/lib/types/database";

type Props = {
  mode: "create" | "edit";
  defaultValues?: Question;
};

export default function QuestionForm({ mode, defaultValues }: Props) {
  const router = useRouter();
  const [questionId, setQuestionId] = useState(
    defaultValues?.question_id?.toString() ?? ""
  );
  const [questionText, setQuestionText] = useState(
    defaultValues?.question_text ?? ""
  );
  const [choice1, setChoice1] = useState(defaultValues?.choice_1 ?? "");
  const [choice2, setChoice2] = useState(defaultValues?.choice_2 ?? "");
  const [choice3, setChoice3] = useState(defaultValues?.choice_3 ?? "");
  const [choice4, setChoice4] = useState(defaultValues?.choice_4 ?? "");
  const [correctAnswer, setCorrectAnswer] = useState(
    defaultValues?.correct_answer?.toString() ?? ""
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const qId = Number(questionId);
    const correct = Number(correctAnswer);

    if (mode === "create" && (!Number.isInteger(qId) || qId <= 0)) {
      setError("問題IDは正の整数を入力してください");
      return;
    }
    if (!questionText.trim()) {
      setError("問題文を入力してください");
      return;
    }
    if (
      !choice1.trim() ||
      !choice2.trim() ||
      !choice3.trim() ||
      !choice4.trim()
    ) {
      setError("すべての選択肢を入力してください");
      return;
    }
    if (![1, 2, 3, 4].includes(correct)) {
      setError("正解を選択してください");
      return;
    }

    setSubmitting(true);

    const input = {
      question_text: questionText.trim(),
      choice_1: choice1.trim(),
      choice_2: choice2.trim(),
      choice_3: choice3.trim(),
      choice_4: choice4.trim(),
      correct_answer: correct,
    };

    const result =
      mode === "create"
        ? await createQuestion({ ...input, question_id: qId })
        : await updateQuestion(defaultValues!.question_id, input);

    if (!result.success) {
      setError(result.message ?? "エラーが発生しました");
      setSubmitting(false);
      return;
    }

    router.push("/teacher/questions");
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
            <label htmlFor="question-id" className="mb-1 block text-xs font-medium text-gray-600">
              問題ID
            </label>
            <input
              id="question-id"
              type="number"
              value={questionId}
              onChange={(e) => setQuestionId(e.target.value)}
              disabled={mode === "edit"}
              className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 disabled:bg-gray-100 disabled:text-gray-500"
              required
              min={1}
            />
          </div>

          <div>
            <label htmlFor="question-text" className="mb-1 block text-xs font-medium text-gray-600">
              問題文
            </label>
            <textarea
              id="question-text"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { label: "選択肢1", value: choice1, setter: setChoice1, num: 1 },
              { label: "選択肢2", value: choice2, setter: setChoice2, num: 2 },
              { label: "選択肢3", value: choice3, setter: setChoice3, num: 3 },
              { label: "選択肢4", value: choice4, setter: setChoice4, num: 4 },
            ].map(({ label, value, setter, num }) => (
              <div key={num}>
                <label htmlFor={`choice-${num}`} className="mb-1 block text-xs font-medium text-gray-600">
                  {label}
                </label>
                <input
                  id={`choice-${num}`}
                  type="text"
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
                  required
                />
              </div>
            ))}
          </div>

          <fieldset>
            <legend className="mb-1 text-xs font-medium text-gray-600">
              正解
            </legend>
            <div className="flex gap-4">
              {[1, 2, 3, 4].map((n) => (
                <label key={n} className="flex items-center gap-1 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="correct_answer"
                    value={n}
                    checked={correctAnswer === String(n)}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    className="accent-teal-600"
                  />
                  {n}
                </label>
              ))}
            </div>
          </fieldset>
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
          href="/teacher/questions"
          className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
        >
          キャンセル
        </Link>
      </div>
    </form>
  );
}
