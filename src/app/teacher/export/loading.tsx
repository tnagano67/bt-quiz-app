export default function ExportLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-6">
      <div className="h-7 w-40 rounded bg-gray-200" />

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="h-4 w-28 rounded bg-gray-200" />
        <div className="mt-3 flex gap-4">
          <div className="h-5 w-36 rounded bg-gray-100" />
          <div className="h-5 w-36 rounded bg-gray-100" />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="h-4 w-20 rounded bg-gray-200" />
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-gray-100" />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex gap-3">
          <div className="h-9 w-28 rounded-lg bg-gray-200" />
          <div className="h-9 w-36 rounded-lg bg-gray-200" />
        </div>
      </div>
    </div>
  );
}
