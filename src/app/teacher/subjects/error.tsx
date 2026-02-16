"use client";

export default function SubjectsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-lg bg-red-50 p-8 text-center">
      <p className="text-lg font-bold text-red-800">エラーが発生しました</p>
      <p className="mt-2 text-sm text-red-600">
        {error.message || "予期しないエラーが発生しました。"}
      </p>
      <button
        onClick={reset}
        className="mt-4 rounded-lg bg-teal-600 px-6 py-2 text-sm font-bold text-white hover:bg-teal-700"
      >
        もう一度試す
      </button>
    </div>
  );
}
