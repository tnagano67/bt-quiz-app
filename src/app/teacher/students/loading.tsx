export default function StudentsLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-4">
      <div className="h-7 w-24 rounded bg-gray-200" />

      {/* Filter skeleton */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <div key={i}>
              <div className="mb-1 h-3 w-12 rounded bg-gray-200" />
              <div className="h-8 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>

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
