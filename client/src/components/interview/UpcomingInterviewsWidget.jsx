import { useMemo } from "react";
import { Link } from "react-router-dom";
import InterviewCard from "./InterviewCard";
import { getUrgency } from "./InterviewCountdown";

const SECTION_ORDER  = ["overdue", "today", "tomorrow", "week", "later"];
const SECTION_LABELS = {
  overdue:  "Needs Attention",
  today:    "Today",
  tomorrow: "Tomorrow",
  week:     "This Week",
  later:    "Coming Up",
};

function EmptyState() {
  return (
    <div className="text-center py-8 px-4">
      <div className="w-12 h-12 bg-violet-50 dark:bg-violet-900/20 rounded-2xl
                      flex items-center justify-center mx-auto mb-3">
        <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No upcoming interviews</p>
      <p className="text-xs text-gray-400 mt-1 leading-relaxed">
        Set a job to Interview status and add a date to see it here
      </p>
    </div>
  );
}

/**
 * UpcomingInterviewsWidget
 *
 * Replaces the old collapsible sidebar div in Dashboard.jsx.
 * Groups interviews by urgency level — always visible in the sidebar.
 *
 * Props:
 *   interviews      — array of job objects with interviewDate
 *   onReschedule    — (job)   → opens RescheduleModal
 *   onMarkComplete  — (jobId) → patches interviewStatus
 *   onConvertStatus — (jobId, status) → patches job status
 */
export default function UpcomingInterviewsWidget({
  interviews = [],
  onReschedule,
  onMarkComplete,
  onConvertStatus,
}) {
  const groups = useMemo(() => {
    const map = Object.fromEntries(SECTION_ORDER.map((k) => [k, []]));
    interviews.forEach((job) => {
      if (!job.interviewDate) return;
      const { level } = getUrgency(job.interviewDate, job.interviewTime);
      const bucket = map[level] || map.later;
      bucket.push(job);
    });
    return map;
  }, [interviews]);

  const totalCount = interviews.length;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                    rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4
                      border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Interviews</h2>
          {totalCount > 0 && (
            <span className="text-xs bg-violet-100 dark:bg-violet-900/30
                             text-violet-700 dark:text-violet-300
                             font-semibold px-2 py-0.5 rounded-full">
              {totalCount}
            </span>
          )}
        </div>
        <Link
          to="/interviews"
          className="text-xs text-violet-600 dark:text-violet-400
                     hover:text-violet-700 dark:hover:text-violet-300
                     font-medium transition-colors duration-150"
        >
          View all →
        </Link>
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        {totalCount === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {SECTION_ORDER.map((key) => {
              const jobs = groups[key];
              if (!jobs.length) return null;

              return (
                <div key={key}>
                  {/* Section label */}
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500
                                uppercase tracking-wider mb-2 px-1">
                    {SECTION_LABELS[key]}
                    <span className="ml-1.5 font-normal normal-case text-gray-300 dark:text-gray-600">
                      ({jobs.length})
                    </span>
                  </p>

                  {/* Compact cards */}
                  <div className="space-y-1">
                    {jobs.map((job) => (
                      <InterviewCard
                        key={job._id}
                        job={job}
                        compact
                        onReschedule={onReschedule}
                        onMarkComplete={onMarkComplete}
                        onConvertStatus={onConvertStatus}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
