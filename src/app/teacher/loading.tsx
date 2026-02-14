export default function TeacherLoading() {
  return (
    <div className="flex animate-pulse flex-col gap-6">
      <div className="rounded-xl border-2 border-teal-200 bg-teal-50/50 p-6">
        <div className="h-6 w-48 rounded bg-teal-200" />
        <div className="mt-2 h-4 w-64 rounded bg-teal-100" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="h-5 w-24 rounded bg-gray-200" />
          <div className="mt-2 h-4 w-48 rounded bg-gray-100" />
        </div>
      </div>
    </div>
  );
}
