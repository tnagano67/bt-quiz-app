export default function HistoryLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-6">
      {/* Student summary skeleton */}
      <div className="rounded-xl border-2 border-gray-200 border-l-blue-600 border-l-[5px] bg-blue-50/50 p-5">
        <div className="mb-3 h-6 w-48 rounded bg-gray-200" />
        <div className="grid grid-cols-1 gap-4 text-center sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i}>
              <div className="mx-auto mb-1 h-3 w-20 rounded bg-gray-200" />
              <div className="mx-auto h-6 w-12 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>

      {/* History list skeleton */}
      <div>
        <div className="mb-3 h-4 w-28 rounded bg-gray-200" />
        <div className="flex flex-col gap-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-14 rounded-lg border border-gray-200 bg-white"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
