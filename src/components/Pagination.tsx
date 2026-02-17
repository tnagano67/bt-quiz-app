import Link from "next/link";

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
  if (totalPages <= 1) return null;

  const buildHref = (page: number) => {
    const params = new URLSearchParams(searchParams);
    if (page <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(page));
    }
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
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
    "border-gray-300 text-gray-700 hover:bg-gray-100";
  const btnDisabled =
    "border-gray-300 opacity-40 cursor-not-allowed text-gray-700";
  const btnActive = "border-teal-600 bg-teal-600 text-white";
  const btnInactive =
    "border-gray-300 text-gray-700 hover:bg-gray-100";

  return (
    <nav aria-label="ページネーション" className="flex items-center justify-center gap-1.5">
      {currentPage <= 1 ? (
        <span
          aria-disabled="true"
          aria-label="前のページへ"
          className={`${btnBase} ${btnDisabled}`}
        >
          前へ
        </span>
      ) : (
        <Link
          href={buildHref(currentPage - 1)}
          aria-label="前のページへ"
          className={`${btnBase} ${btnNav}`}
        >
          前へ
        </Link>
      )}
      {pageNumbers.map((page, i) =>
        page === "ellipsis" ? (
          <span
            key={`ellipsis-${i}`}
            aria-hidden="true"
            className="px-1.5 text-sm text-gray-400"
          >
            …
          </span>
        ) : page === currentPage ? (
          <span
            key={page}
            aria-current="page"
            aria-label={`ページ ${page}`}
            className={`${btnBase} ${btnActive}`}
          >
            {page}
          </span>
        ) : (
          <Link
            key={page}
            href={buildHref(page)}
            aria-label={`ページ ${page}`}
            className={`${btnBase} ${btnInactive}`}
          >
            {page}
          </Link>
        )
      )}
      {currentPage >= totalPages ? (
        <span
          aria-disabled="true"
          aria-label="次のページへ"
          className={`${btnBase} ${btnDisabled}`}
        >
          次へ
        </span>
      ) : (
        <Link
          href={buildHref(currentPage + 1)}
          aria-label="次のページへ"
          className={`${btnBase} ${btnNav}`}
        >
          次へ
        </Link>
      )}
    </nav>
  );
}
