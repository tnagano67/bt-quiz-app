"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="rounded-lg bg-white p-8 text-center shadow-md">
        <p className="text-lg font-bold text-red-800">エラーが発生しました</p>
        <p className="mt-2 text-sm text-gray-600">
          {error.message || "予期しないエラーが発生しました。"}
        </p>
        <button
          onClick={reset}
          className="mt-4 rounded-lg bg-blue-600 px-6 py-2 text-sm font-bold text-white hover:bg-blue-700"
        >
          もう一度試す
        </button>
      </div>
    </div>
  );
}
