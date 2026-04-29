import InterviewCountdown from "./InterviewCountdown";

// ── Config maps ────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  phone:      { label: "Phone Screen", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"     },
  video:      { label: "Video Call",   color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"      },
  "on-site":  { label: "On-site",      color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300" },
  technical:  { label: "Technical",    color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300" },
  panel:      { label: "Panel",        color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  final:      { label: "Final Round",  color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"      },
  "":         { label: "Interview",    color: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"         },
};

const ROUND_LABELS = { 1: "1st Round", 2: "2nd Round", 3: "3rd Round", 99: "Final" };
const roundLabel = (n) => ROUND_LABELS[n] || `${n}th Round`;

// Stable color per company name using char code of first character
const COMPANY_COLORS = [
  "bg-violet-600", "bg-blue-600", "bg-emerald-600",
  "bg-rose-600",   "bg-amber-600", "bg-indigo-600",
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function CompanyInitials({ company }) {
  const initials = company
    .split(/[\s\-_]+/)
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase();

  const colorIdx = (company.charCodeAt(0) || 0) % COMPANY_COLORS.length;

  return (
    <div
      className={`w-10 h-10 rounded-xl ${COMPANY_COLORS[colorIdx]}
                  flex items-center justify-center flex-shrink-0`}
    >
      <span className="text-white text-sm font-bold tracking-wide">
        {initials || "?"}
      </span>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg
      className="w-4 h-4 text-gray-400 flex-shrink-0"
      fill="none" viewBox="0 0 24 24" stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg
      className="w-4 h-4 text-gray-400 flex-shrink-0"
      fill="none" viewBox="0 0 24 24" stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

/**
 * InterviewCard
 *
 * Props:
 *   job            — job document from MongoDB
 *   onReschedule   — (job)   → opens reschedule modal
 *   onMarkComplete — (jobId) → patches interviewStatus = "completed"
 *   onConvertStatus— (jobId, "offer"|"declined") → patches job.status
 *   compact        — boolean — renders slim row for sidebar widget
 */
export default function InterviewCard({
  job,
  onReschedule,
  onMarkComplete,
  onConvertStatus,
  compact = false,
}) {
  const type        = TYPE_CONFIG[job.interviewType || ""] || TYPE_CONFIG[""];
  const round       = job.interviewRound || 1;
  const isCompleted = job.interviewStatus === "completed";

  const formattedDate = job.interviewDate
    ? new Date(job.interviewDate).toLocaleDateString("en-US", {
        weekday: "short", month: "short", day: "numeric",
      })
    : "Date TBD";

  const formattedTime = job.interviewTime
    ? new Date(`1970-01-01T${job.interviewTime}`).toLocaleTimeString("en-US", {
        hour: "numeric", minute: "2-digit",
      })
    : null;

  // ── Compact variant: sidebar widget row ─────────────────────────────────────
  if (compact) {
    return (
      <div className="flex items-center gap-3 py-2.5 px-1 rounded-xl
                      hover:bg-gray-50 dark:hover:bg-gray-700/50
                      transition-colors duration-150">
        <CompanyInitials company={job.company} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100
                        truncate leading-tight">
            {job.company}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {job.position}
          </p>
        </div>
        <div className="text-right flex-shrink-0 space-y-1">
          <InterviewCountdown
            interviewDate={job.interviewDate}
            interviewTime={job.interviewTime}
          />
          {formattedTime && (
            <p className="text-xs text-gray-400">{formattedTime}</p>
          )}
        </div>
      </div>
    );
  }

  // ── Full card variant: interviews page grid ──────────────────────────────────
  return (
    <div
      className={`bg-white dark:bg-gray-800 border rounded-2xl p-5 transition-all duration-200
                  ${isCompleted
                    ? "border-gray-200 dark:border-gray-700 opacity-70"
                    : "border-gray-200 dark:border-gray-700 hover:border-violet-200 dark:hover:border-violet-700 hover:shadow-md"
                  }`}
    >
      {/* Header: company info + urgency */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <CompanyInitials company={job.company} />
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100
                           text-sm leading-tight truncate">
              {job.position}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {job.company}
            </p>
          </div>
        </div>
        <div className="flex-shrink-0">
          <InterviewCountdown
            interviewDate={job.interviewDate}
            interviewTime={job.interviewTime}
          />
        </div>
      </div>

      {/* Badges: interview type + round + completed flag */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${type.color}`}>
          {type.label}
        </span>
        <span className="text-xs px-2.5 py-0.5 rounded-full font-medium
                         bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
          {roundLabel(round)}
        </span>
        {isCompleted && (
          <span className="text-xs px-2.5 py-0.5 rounded-full font-medium
                           bg-emerald-100 text-emerald-700
                           dark:bg-emerald-900/30 dark:text-emerald-400">
            Completed
          </span>
        )}
      </div>

      {/* Date + time */}
      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
        <CalendarIcon />
        <span>{formattedDate}</span>
        {formattedTime && (
          <>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span>{formattedTime}</span>
          </>
        )}
      </div>

      {/* Interviewer */}
      {job.interviewerName && (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <PersonIcon />
          <span className="truncate">{job.interviewerName}</span>
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
        {/* Mark Done — only when not already completed */}
        {!isCompleted && (
          <button
            onClick={() => onMarkComplete?.(job._id)}
            className="flex items-center gap-1.5 text-xs font-medium
                       text-emerald-700 dark:text-emerald-400
                       bg-emerald-50 dark:bg-emerald-900/20
                       hover:bg-emerald-100 dark:hover:bg-emerald-900/30
                       px-3 py-1.5 rounded-lg transition-colors duration-150"
          >
            <CheckIcon />
            Done
          </button>
        )}

        {/* Reschedule */}
        <button
          onClick={() => onReschedule?.(job)}
          className="flex items-center gap-1.5 text-xs font-medium
                     text-gray-600 dark:text-gray-300
                     bg-gray-100 dark:bg-gray-700
                     hover:bg-gray-200 dark:hover:bg-gray-600
                     px-3 py-1.5 rounded-lg transition-colors duration-150"
        >
          <RefreshIcon />
          Reschedule
        </button>

        {/* Convert outcome — appears after marking done */}
        {isCompleted && (
          <div className="flex gap-1.5 ml-auto">
            <button
              onClick={() => onConvertStatus?.(job._id, "offer")}
              className="text-xs font-medium
                         text-emerald-700 dark:text-emerald-400
                         bg-emerald-50 dark:bg-emerald-900/20
                         hover:bg-emerald-100 dark:hover:bg-emerald-900/30
                         px-3 py-1.5 rounded-lg transition-colors"
            >
              Got Offer
            </button>
            <button
              onClick={() => onConvertStatus?.(job._id, "declined")}
              className="text-xs font-medium
                         text-red-600 dark:text-red-400
                         bg-red-50 dark:bg-red-900/20
                         hover:bg-red-100 dark:hover:bg-red-900/30
                         px-3 py-1.5 rounded-lg transition-colors"
            >
              Rejected
            </button>
          </div>
        )}

        {/* View link */}
        <a
          href={`/jobs/${job._id}`}
          className={`text-xs font-medium text-violet-600 hover:text-violet-700
                      dark:text-violet-400 dark:hover:text-violet-300
                      transition-colors duration-150
                      ${isCompleted ? "" : "ml-auto"}`}
        >
          View →
        </a>
      </div>
    </div>
  );
}
