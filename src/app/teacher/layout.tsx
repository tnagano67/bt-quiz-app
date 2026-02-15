import TeacherHeader from "@/components/TeacherHeader";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-teal-700 focus:px-4 focus:py-2 focus:text-white"
      >
        メインコンテンツへスキップ
      </a>
      <TeacherHeader />
      <main id="main-content" className="mx-auto max-w-5xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}
