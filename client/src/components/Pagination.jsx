/**
 * Pagination.jsx — Reusable SaaS-style pagination component.
 *
 * Props:
 *   currentPage   {number}   — 1-based active page
 *   totalPages    {number}   — total number of pages
 *   totalJobs     {number}   — total items across all pages (for range text)
 *   limit         {number}   — items per page (default 6)
 *   onPageChange  {function} — called with the new page number
 *
 * Features:
 *   ✓ Previous / Next buttons with disabled states
 *   ✓ Smart page number range with ellipsis (1 … 4 5 6 … 12)
 *   ✓ Active page highlight
 *   ✓ "Showing X–Y of Z jobs" range indicator
 *   ✓ Responsive: full bar on desktop, compact on mobile
 *   ✓ Keyboard accessible (aria-current, aria-label, aria-disabled)
 *   ✓ Zero extra API calls — uses data already in parent state
 *   ✓ Pure Tailwind — no external libraries
 */

// ── Page-number range algorithm ────────────────────────────────────────────────
//
//  Always shows:  first page, last page, current page, and ±1 around current.
//  Inserts "…" when there is a gap of more than 1 between segments.
//
//  Examples (totalPages = 12):
//    page 1  → [ 1  2  3  …  12 ]
//    page 5  → [ 1  …  4  5  6  …  12 ]
//    page 12 → [ 1  …  10  11  12 ]
//    pages ≤ 7 → show all, no ellipsis

function getPageNumbers(currentPage, totalPages) {
  // No truncation needed for small page counts
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const DOTS = "…";
  const pages = [];

  // Window around current page (current ± 1)
  const windowStart = Math.max(2, currentPage - 1);
  const windowEnd   = Math.min(totalPages - 1, currentPage + 1);

  // Always include first page
  pages.push(1);

  // Left ellipsis
  if (windowStart > 2) pages.push(DOTS);

  // Middle window
  for (let p = windowStart; p <= windowEnd; p++) {
    pages.push(p);
  }

  // Right ellipsis
  if (windowEnd < totalPages - 1) pages.push(DOTS);

  // Always include last page
  pages.push(totalPages);

  return pages;
}

// ── Range text: "Showing 7–12 of 38 jobs" ─────────────────────────────────────

function getRangeText(currentPage, limit, totalJobs) {
  if (totalJobs === 0) return "No jobs found";
  const from = (currentPage - 1) * limit + 1;
  const to   = Math.min(currentPage * limit, totalJobs);
  return `Showing ${from}–${to} of ${totalJobs} ${totalJobs === 1 ? "job" : "jobs"}`;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ChevronLeft() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function Pagination({
  currentPage,
  totalPages,
  totalJobs  = 0,
  limit      = 6,
  onPageChange,
}) {
  // Nothing to render when there is only one page
  if (totalPages <= 1) return null;

  const isFirst = currentPage === 1;
  const isLast  = currentPage === totalPages;
  const pages   = getPageNumbers(currentPage, totalPages);

  // ── Shared button style builders ──────────────────────────────────────────

  const navBtnBase =
    "inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium " +
    "border transition-all duration-150 select-none";

  const navBtnActive =
    "border-gray-200 dark:border-gray-700 " +
    "bg-white dark:bg-gray-800 " +
    "text-gray-700 dark:text-gray-200 " +
    "hover:bg-gray-50 dark:hover:bg-gray-700 " +
    "hover:border-gray-300 dark:hover:border-gray-600 " +
    "cursor-pointer shadow-sm";

  const navBtnDisabled =
    "border-gray-100 dark:border-gray-700 " +
    "bg-gray-50 dark:bg-gray-800 " +
    "text-gray-300 dark:text-gray-600 " +
    "cursor-not-allowed opacity-60";

  const pageNumBase =
    "w-9 h-9 flex items-center justify-center rounded-xl text-sm font-medium " +
    "border transition-all duration-150 select-none cursor-pointer";

  const pageNumActive =
    "bg-blue-600 border-blue-600 text-white font-semibold shadow-sm " +
    "cursor-default scale-105";

  const pageNumInactive =
    "bg-white dark:bg-gray-800 " +
    "border-gray-200 dark:border-gray-700 " +
    "text-gray-700 dark:text-gray-300 " +
    "hover:bg-blue-50 dark:hover:bg-blue-900/30 " +
    "hover:border-blue-300 dark:hover:border-blue-700 " +
    "hover:text-blue-600 dark:hover:text-blue-400 shadow-sm";

  return (
    <nav
      aria-label="Pagination"
      className="mt-10 space-y-3"
    >
      {/* Range indicator — "Showing X–Y of Z jobs" */}
      <p className="text-center text-xs text-gray-400 dark:text-gray-500">
        {getRangeText(currentPage, limit, totalJobs)}
      </p>

      {/* ── Desktop: full pagination bar ─────────────────────────────────── */}
      <div className="hidden sm:flex items-center justify-center gap-1.5">

        {/* Previous */}
        <button
          onClick={() => !isFirst && onPageChange(currentPage - 1)}
          disabled={isFirst}
          aria-label="Previous page"
          aria-disabled={isFirst}
          className={`${navBtnBase} ${isFirst ? navBtnDisabled : navBtnActive}`}
        >
          <ChevronLeft />
          <span>Previous</span>
        </button>

        {/* Page numbers + ellipsis */}
        <div className="flex items-center gap-1">
          {pages.map((page, idx) =>
            page === "…" ? (
              /* Ellipsis — not clickable, used as visual gap indicator */
              <span
                key={`dots-${idx}`}
                className="w-9 h-9 flex items-center justify-center
                         text-gray-400 dark:text-gray-600 text-sm select-none"
                aria-hidden="true"
              >
                …
              </span>
            ) : (
              <button
                key={page}
                onClick={() => page !== currentPage && onPageChange(page)}
                aria-label={`Page ${page}`}
                aria-current={page === currentPage ? "page" : undefined}
                className={`${pageNumBase} ${
                  page === currentPage ? pageNumActive : pageNumInactive
                }`}
              >
                {page}
              </button>
            )
          )}
        </div>

        {/* Next */}
        <button
          onClick={() => !isLast && onPageChange(currentPage + 1)}
          disabled={isLast}
          aria-label="Next page"
          aria-disabled={isLast}
          className={`${navBtnBase} ${isLast ? navBtnDisabled : navBtnActive}`}
        >
          <span>Next</span>
          <ChevronRight />
        </button>
      </div>

      {/* ── Mobile: compact Previous | Page X of Y | Next ────────────────── */}
      <div className="flex sm:hidden items-center justify-between gap-2">

        {/* Previous */}
        <button
          onClick={() => !isFirst && onPageChange(currentPage - 1)}
          disabled={isFirst}
          aria-label="Previous page"
          className={`${navBtnBase} ${isFirst ? navBtnDisabled : navBtnActive}`}
        >
          <ChevronLeft />
          <span>Prev</span>
        </button>

        {/* Page X of Y */}
        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium px-2 text-center">
          Page{" "}
          <span className="text-gray-800 dark:text-gray-100 font-semibold">{currentPage}</span>
          {" "}of{" "}
          <span className="text-gray-800 dark:text-gray-100 font-semibold">{totalPages}</span>
        </span>

        {/* Next */}
        <button
          onClick={() => !isLast && onPageChange(currentPage + 1)}
          disabled={isLast}
          aria-label="Next page"
          className={`${navBtnBase} ${isLast ? navBtnDisabled : navBtnActive}`}
        >
          <span>Next</span>
          <ChevronRight />
        </button>
      </div>
    </nav>
  );
}
