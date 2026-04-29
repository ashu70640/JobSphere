/**
 * InterviewCountdown — Reusable urgency pill used across all interview UI.
 * Also exports getUrgency() for grouping logic in other components.
 */

export function getUrgency(interviewDate, interviewTime = "") {
  const now    = new Date();
  const target = new Date(interviewDate);

  if (interviewTime) {
    const [h, m] = interviewTime.split(":");
    target.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
  } else {
    target.setHours(23, 59, 59, 999);
  }

  const diffMs   = target - now;
  const diffHrs  = Math.floor(Math.abs(diffMs) / 3600000);
  const diffMins = Math.floor(Math.abs(diffMs) / 60000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMs < 0) {
    const overdueDays = Math.abs(Math.floor(diffMs / 86400000));
    const label = overdueDays === 0 ? "Missed today" : `${overdueDays}d overdue`;
    return { label, level: "overdue", diffMs };
  }
  if (diffHrs < 3)   return { label: `In ${diffMins}m`,      level: "today",    diffMs };
  if (diffHrs < 24)  return { label: `In ${diffHrs}h`,       level: "today",    diffMs };
  if (diffDays === 1) return { label: "Tomorrow",              level: "tomorrow", diffMs };
  if (diffDays <= 7) return { label: `In ${diffDays} days`,  level: "week",     diffMs };
  return                    { label: `In ${diffDays} days`,  level: "later",    diffMs };
}

const URGENCY_STYLES = {
  overdue:  { dot: "bg-red-500",    pill: "bg-red-100 text-red-700 border-red-200",       pulse: true  },
  today:    { dot: "bg-amber-500",  pill: "bg-amber-100 text-amber-700 border-amber-200", pulse: true  },
  tomorrow: { dot: "bg-orange-400", pill: "bg-orange-100 text-orange-700 border-orange-100", pulse: false },
  week:     { dot: "bg-violet-500", pill: "bg-violet-100 text-violet-700 border-violet-200", pulse: false },
  later:    { dot: "bg-gray-400",   pill: "bg-gray-100 text-gray-600 border-gray-200",    pulse: false },
};

export default function InterviewCountdown({ interviewDate, interviewTime, className = "" }) {
  if (!interviewDate) return null;

  const { label, level } = getUrgency(interviewDate, interviewTime);
  const cfg = URGENCY_STYLES[level];

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold
                  px-2.5 py-1 rounded-full border ${cfg.pill} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}
                    ${cfg.pulse ? "animate-pulse" : ""}`}
      />
      {label}
    </span>
  );
}
