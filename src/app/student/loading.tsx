export default function StudentLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-6">
      {/* StudentInfoCard skeleton */}
      <div className="rounded-xl border-2 border-gray-200 border-l-blue-600 border-l-[5px] bg-blue-50/50 p-6">
        <div className="mb-4 h-6 w-48 rounded bg-gray-200" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={i === 4 ? "col-span-1 sm:col-span-2" : ""}>
              <div className="mb-1 h-3 w-20 rounded bg-gray-200" />
              <div className="h-6 w-16 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>

      {/* ScoreChart skeleton */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 h-5 w-32 rounded bg-gray-200" />
        <div className="h-48 rounded bg-gray-100" />
      </div>

      {/* Buttons skeleton */}
      <div className="flex gap-3">
        <div className="h-12 flex-1 rounded-lg bg-gray-200" />
        <div className="h-12 flex-1 rounded-lg bg-gray-200" />
      </div>
    </div>
  );
}
