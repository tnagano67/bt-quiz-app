export default function StudentLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-6">
      {/* Student name skeleton */}
      <div className="h-7 w-64 rounded bg-gray-200" />

      {/* Subject cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border-2 border-gray-200 border-l-blue-600 border-l-[5px] bg-blue-50/50 p-5"
          >
            <div className="mb-3 h-5 w-24 rounded bg-gray-200" />
            <div className="mb-4 grid grid-cols-2 gap-2">
              {[...Array(4)].map((_, j) => (
                <div key={j}>
                  <div className="mb-1 h-3 w-16 rounded bg-gray-200" />
                  <div className="h-6 w-12 rounded bg-gray-200" />
                </div>
              ))}
            </div>
            <div className="h-9 rounded-lg bg-gray-200" />
          </div>
        ))}
      </div>

      {/* ScoreChart skeleton */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-3 h-5 w-32 rounded bg-gray-200" />
        <div className="h-48 rounded bg-gray-100" />
      </div>

      {/* Button skeleton */}
      <div className="flex gap-3">
        <div className="h-12 flex-1 rounded-lg bg-gray-200" />
      </div>
    </div>
  );
}
