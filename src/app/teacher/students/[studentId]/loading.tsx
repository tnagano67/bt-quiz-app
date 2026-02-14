export default function StudentDetailLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-6">
      <div className="h-4 w-32 rounded bg-gray-200" />

      {/* Info card skeleton */}
      <div className="rounded-xl border-2 border-teal-200 bg-teal-50/50 p-6">
        <div className="h-6 w-32 rounded bg-teal-200" />
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i}>
              <div className="mb-1 h-3 w-20 rounded bg-teal-100" />
              <div className="h-5 w-16 rounded bg-teal-100" />
            </div>
          ))}
        </div>
      </div>

      {/* Statistics skeleton */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 h-4 w-32 rounded bg-gray-200" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="text-center">
              <div className="mx-auto h-3 w-16 rounded bg-gray-200" />
              <div className="mx-auto mt-2 h-7 w-12 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>

      {/* Chart skeleton */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 h-4 w-32 rounded bg-gray-200" />
        <div className="h-48 rounded bg-gray-100" />
      </div>
    </div>
  );
}
