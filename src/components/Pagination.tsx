"use client";

import { useRouter } from "next/navigation";

type Props = {
  currentPage: number;
  totalPages: number;
  basePath: string;
  searchParams: Record<string, string>;
};

export default function Pagination({
  currentPage,
  totalPages,
  basePath,
  searchParams,
}: Props) {
  const router = useRouter();

  if (totalPages <= 1) return null;

  const navigate = (page: number) => {
    const params = new URLSearchParams(searchParams);
    if (page <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(page));
    }
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  };

  // 表示するページ番号を計算（現在ページの前後2ページ）
  const getPageNumbers = (): (number | "ellipsis")[] => {
    const pages: (number | "ellipsis")[] = [];
    const delta = 2;
    const left = Math.max(2, currentPage - delta);
    const right = Math.min(totalPages - 1, currentPage + delta);

    pages.push(1);
    if (left > 2) pages.push("ellipsis");
    for (let i = left; i <= right; i++) {
      pages.push(i);
    }
    if (right < totalPages - 1) pages.push("ellipsis");
    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

  const pageNumbers = getPageNumbers();

  const btnBase =
    "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors";
  const btnNav =
    "border-gray-300 text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40";
  const btnActive = "border-teal-600 bg-teal-600 text-white";
  const btnInactive =
    "border-gray-300 text-gray-700 hover:bg-gray-100";

  return (
    <div className="flex items-center justify-center gap-1.5">
      <button
        onClick={() => navigate(currentPage - 1)}
        disabled={currentPage <= 1}
        className={`${btnBase} ${btnNav}`}
      >
        前へ
      </button>
      {pageNumbers.map((page, i) =>
        page === "ellipsis" ? (
          <span
            key={`ellipsis-${i}`}
            className="px-1.5 text-sm text-gray-400"
          >
            …
          </span>
        ) : (
          <button
            key={page}
            onClick={() => navigate(page)}
            className={`${btnBase} ${page === currentPage ? btnActive : btnInactive}`}
          >
            {page}
          </button>
        )
      )}
      <button
        onClick={() => navigate(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className={`${btnBase} ${btnNav}`}
      >
        次へ
      </button>
    </div>
  );
}
