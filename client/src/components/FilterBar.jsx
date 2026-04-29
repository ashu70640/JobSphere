/**
 * FilterBar.jsx — Reusable SaaS-style search + filter bar.
 *
 * Props:
 *   filters       {object}   — { search, status, jobType, sort, page, limit }
 *   setFilters    {function} — state setter from Dashboard (same shape as useState setter)
 *   totalJobs     {number}   — total matching jobs, used for "X jobs found" text
 *   loading       {boolean}  — hides result count while fetching
 *
 * Features:
 *   ✓ Search input with embedded icon
 *   ✓ Status / Job Type / Sort dropdowns — consistent height and style
 *   ✓ Reset Filters button — only visible when any filter is active
 *   ✓ Active filter tags row — removable chips for each active filter
 *   ✓ "X jobs found" aligned right under the filter row
 *   ✓ Responsive: single row → wraps → stacks (no breakage at any width)
 *   ✓ Pure Tailwind — no external libraries
 *   ✓ Zero extra API calls — all state lives in parent
 */

// ── Constants ──────────────────────────────────────────────────────────────────

const DEFAULTS = {
  search:  "",
  status:  "all",
  jobType: "all",
  sort:    "latest",
};

// Label maps for active filter tags
const STATUS_LABELS = {
  pending:   "Pending",
  interview: "Interview",
  declined:  "Declined",
  offer:     "Offer",
};

const JOB_TYPE_LABELS = {
  "full-time":  "Full-time",
  "part-time":  "Part-time",
  "remote":     "Remote",
  "internship": "Internship",
};

// ── Sub-components ─────────────────────────────────────────────────────────────

/** Magnifying glass icon — rendered inside the search input */
function SearchIcon() {
  return (
    <svg
      className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
      />
    </svg>
  );
}

/** Clear (✕) icon — used inside the search input and on tags */
function ClearIcon({ className = "w-3 h-3" }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/** Removable chip shown for each active filter */
function FilterTag({ label, onRemove }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1
                 bg-blue-50 dark:bg-blue-900/30
                 text-blue-700 dark:text-blue-300
                 border border-blue-200 dark:border-blue-700
                 rounded-full text-xs font-medium
                 transition-colors duration-150"
    >
      {label}
      <button
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="flex items-center justify-center w-4 h-4 rounded-full
                   hover:bg-blue-200 dark:hover:bg-blue-800
                   transition-colors duration-150 cursor-pointer"
      >
        <ClearIcon />
      </button>
    </span>
  );
}

// ── Shared input / select class strings ───────────────────────────────────────

// h-9 (36 px) keeps the toolbar slim; shadow-none avoids the heavy-card look
const INPUT_BASE =
  "h-9 border border-gray-200 dark:border-gray-700 " +
  "bg-white dark:bg-gray-800 rounded-lg text-sm " +
  "text-gray-700 dark:text-gray-200 " +
  "focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent " +
  "transition-all duration-150 hover:border-gray-300 dark:hover:border-gray-600";

// Light chevron (gray-400) and dark chevron (gray-300) as separate data-URIs
const SELECT_CLS =
  `${INPUT_BASE} px-3 pr-8 cursor-pointer appearance-none ` +
  "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' " +
  "fill='none' viewBox='0 0 24 24' stroke='%239ca3af' stroke-width='2'%3E" +
  "%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E" +
  "%3C/svg%3E\")] " +
  "dark:bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' " +
  "fill='none' viewBox='0 0 24 24' stroke='%23d1d5db' stroke-width='2'%3E" +
  "%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E" +
  "%3C/svg%3E\")] " +
  "bg-no-repeat bg-[right_0.6rem_center] bg-[length:1rem]";

// ── Main component ─────────────────────────────────────────────────────────────

export default function FilterBar({ filters, setFilters, totalJobs = 0, loading = false }) {

  // ── Derived state ──────────────────────────────────────────────────────────

  const hasSearch  = filters.search.trim() !== "";
  const hasStatus  = filters.status  !== "all";
  const hasJobType = filters.jobType !== "all";
  const isAnyFilterActive = hasSearch || hasStatus || hasJobType;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const set = (key, value) =>
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));

  const resetAll = () =>
    setFilters((f) => ({ ...f, ...DEFAULTS, page: 1 }));

  // ── Result count label ─────────────────────────────────────────────────────

  const resultLabel = loading
    ? "Loading…"
    : `${totalJobs} ${totalJobs === 1 ? "job" : "jobs"} found`;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700
                 rounded-xl px-4 py-2.5 mb-6 transition-colors duration-200"
      role="search"
      aria-label="Filter job applications"
    >

      {/* ── Row 1: inputs + inline result count ───────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">

        {/* Search input */}
        <div className="relative flex items-center flex-1 min-w-[200px]">
          <span className="absolute left-3 pointer-events-none">
            <SearchIcon />
          </span>

          <input
            type="text"
            value={filters.search}
            onChange={(e) => set("search", e.target.value)}
            placeholder="Search by company or position…"
            aria-label="Search jobs"
            className={`${INPUT_BASE} w-full pl-9 pr-9`}
          />

          {/* Inline clear button — visible only when search has text */}
          {hasSearch && (
            <button
              onClick={() => set("search", "")}
              aria-label="Clear search"
              className="absolute right-3 text-gray-400 dark:text-gray-500
                       hover:text-gray-600 dark:hover:text-gray-300
                       transition-colors duration-150 cursor-pointer"
            >
              <ClearIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status dropdown */}
        <div className="relative">
          <select
            value={filters.status}
            onChange={(e) => set("status", e.target.value)}
            aria-label="Filter by status"
            className={`${SELECT_CLS} w-32`}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="interview">Interview</option>
            <option value="declined">Declined</option>
            <option value="offer">Offer</option>
          </select>
          {/* Active dot — indicates this dropdown has a non-default value */}
          {hasStatus && (
            <span
              className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500"
              aria-hidden="true"
            />
          )}
        </div>

        {/* Job Type dropdown */}
        <div className="relative">
          <select
            value={filters.jobType}
            onChange={(e) => set("jobType", e.target.value)}
            aria-label="Filter by job type"
            className={`${SELECT_CLS} w-32`}
          >
            <option value="all">All Types</option>
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="remote">Remote</option>
            <option value="internship">Internship</option>
          </select>
          {hasJobType && (
            <span
              className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500"
              aria-hidden="true"
            />
          )}
        </div>

        {/* Sort dropdown */}
        <select
          value={filters.sort}
          onChange={(e) => set("sort", e.target.value)}
          aria-label="Sort jobs"
          className={`${SELECT_CLS} w-28`}
        >
          <option value="latest">Latest</option>
          <option value="oldest">Oldest</option>
          <option value="a-z">A–Z</option>
          <option value="z-a">Z–A</option>
        </select>

        {/* Reset Filters — only shown when any filter is active */}
        {isAnyFilterActive && (
          <button
            onClick={resetAll}
            aria-label="Reset all filters"
            className="h-9 inline-flex items-center gap-1.5 px-3
                       border border-gray-200 dark:border-gray-700
                       bg-white dark:bg-gray-800
                       text-gray-500 dark:text-gray-400
                       rounded-lg text-xs font-medium
                       hover:bg-gray-50 dark:hover:bg-gray-700
                       hover:border-gray-300 dark:hover:border-gray-600
                       hover:text-gray-700 dark:hover:text-gray-200
                       transition-all duration-150 cursor-pointer
                       whitespace-nowrap flex-shrink-0"
          >
            <ClearIcon className="w-3 h-3" />
            Reset
          </button>
        )}

        {/* Result count — inline, pushed to the far right via ml-auto */}
        <p
          className={`ml-auto text-xs font-medium flex-shrink-0
                      transition-opacity duration-150 whitespace-nowrap
                      ${loading
                        ? "text-gray-300 dark:text-gray-600"
                        : "text-gray-400 dark:text-gray-500"}`}
          aria-live="polite"
          aria-atomic="true"
        >
          {resultLabel}
        </p>
      </div>

      {/* ── Row 2: active filter tags — only rendered when filters are on ─── */}
      {isAnyFilterActive && (
        <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          {hasSearch && (
            <FilterTag
              label={`"${filters.search}"`}
              onRemove={() => set("search", "")}
            />
          )}
          {hasStatus && (
            <FilterTag
              label={`Status: ${STATUS_LABELS[filters.status] || filters.status}`}
              onRemove={() => set("status", "all")}
            />
          )}
          {hasJobType && (
            <FilterTag
              label={`Type: ${JOB_TYPE_LABELS[filters.jobType] || filters.jobType}`}
              onRemove={() => set("jobType", "all")}
            />
          )}
        </div>
      )}
    </div>
  );
}
