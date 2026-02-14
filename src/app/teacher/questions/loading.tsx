export default function QuestionsLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="h-7 w-24 rounded bg-gray-200" />
        <div className="h-9 w-28 rounded-lg bg-gray-200" />
      </div>

      {/* Grade filter skeleton */}
      <div className="flex gap-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-7 w-20 rounded-full bg-gray-100" />
        ))}
      </div>

      <div className="h-4 w-16 rounded bg-gray-200" />

      {/* Table skeleton */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 bg-gray-50 px-3 py-2">
          <div className="h-4 w-full rounded bg-gray-200" />
        </div>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="border-b border-gray-100 px-3 py-3">
            <div className="h-4 w-full rounded bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
