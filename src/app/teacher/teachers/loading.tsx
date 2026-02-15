export default function TeachersLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="h-7 w-24 rounded bg-gray-200" />
        <div className="h-9 w-24 rounded bg-gray-200" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 bg-gray-50 px-3 py-2">
          <div className="h-4 w-full rounded bg-gray-200" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="border-b border-gray-100 px-3 py-3">
            <div className="h-4 w-full rounded bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
