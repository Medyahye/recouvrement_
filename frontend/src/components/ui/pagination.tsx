import Link from "next/link";

type SearchParams = Record<string, string | string[] | undefined>;

type PaginationProps = {
  basePath: string;
  currentPage: number;
  pageSize: number;
  searchParams: SearchParams;
  totalItems: number;
};

function cleanParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function getVisiblePages(currentPage: number, totalPages: number) {
  const pages = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
}

export function Pagination({ basePath, currentPage, pageSize, searchParams, totalItems }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalPages <= 1) {
    return null;
  }

  const createHref = (page: number) => {
    const params = new URLSearchParams();

    Object.entries(searchParams).forEach(([key, value]) => {
      if (key === "page") {
        return;
      }

      const cleanedValue = cleanParam(value);
      if (cleanedValue) {
        params.set(key, cleanedValue);
      }
    });

    params.set("page", String(page));
    return `${basePath}?${params.toString()}`;
  };

  const visiblePages = getVisiblePages(currentPage, totalPages);
  const firstItem = (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalItems);
  const pageButtonClass =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors";

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
      <p>
        {firstItem}-{lastItem} sur {totalItems}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {currentPage > 1 ? (
          <Link className={`${pageButtonClass} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`} href={createHref(currentPage - 1)}>
            Précédent
          </Link>
        ) : (
          <span className={`${pageButtonClass} cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400`}>Précédent</span>
        )}

        {visiblePages.map((page, index) => {
          const previousPage = visiblePages[index - 1];
          const hasGap = previousPage && page - previousPage > 1;

          return (
            <span key={page} className="flex items-center gap-2">
              {hasGap && <span className="px-1 text-slate-400">...</span>}
              <Link
                className={
                  page === currentPage
                    ? `${pageButtonClass} border-blue-700 bg-blue-700 text-white`
                    : `${pageButtonClass} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`
                }
                href={createHref(page)}
              >
                {page}
              </Link>
            </span>
          );
        })}

        {currentPage < totalPages ? (
          <Link className={`${pageButtonClass} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`} href={createHref(currentPage + 1)}>
            Suivant
          </Link>
        ) : (
          <span className={`${pageButtonClass} cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400`}>Suivant</span>
        )}
      </div>
    </div>
  );
}
