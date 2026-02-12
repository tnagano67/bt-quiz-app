export default function QuizLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-6 w-40 rounded bg-gray-200" />
        <div className="h-4 w-28 rounded bg-gray-200" />
      </div>

      {/* Question skeletons */}
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-200 bg-white p-5"
        >
          <div className="mb-4 h-5 w-3/4 rounded bg-gray-200" />
          <div className="flex flex-col gap-2">
            {[...Array(4)].map((_, j) => (
              <div key={j} className="h-10 rounded-lg bg-gray-100" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
