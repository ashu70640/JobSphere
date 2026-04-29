import { useMemo } from "react";
import { getUrgency } from "./InterviewCountdown";

const CARDS = [
  {
    key: "today",
    label: "Today",
    borderColor: "border-amber-400 dark:border-amber-500",
    textColor:   "text-amber-600 dark:text-amber-400",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.166 17.834a.75.75 0 00-1.06 1.06l1.59 1.591a.75.75 0 001.061-1.06l-1.59-1.591zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.166 6.166a.75.75 0 00-1.06 1.06l1.59 1.591a.75.75 0 001.061-1.06L6.166 6.166z" />
      </svg>
    ),
  },
  {
    key: "thisWeek",
    label: "This Week",
    borderColor: "border-blue-400 dark:border-blue-500",
    textColor:   "text-blue-600 dark:text-blue-400",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6V3a.75.75 0 01.75-.75zm13.5 9a1.5 1.5 0 00-1.5-1.5H5.25a1.5 1.5 0 00-1.5 1.5v7.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5v-7.5z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    key: "overdue",
    label: "Needs Attention",
    borderColor: "border-rose-400 dark:border-rose-500",
    textColor:   "text-rose-600 dark:text-rose-400",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    key: "rate",
    label: "Offer Rate",
    borderColor: "border-emerald-400 dark:border-emerald-500",
    textColor:   "text-emerald-600 dark:text-emerald-400",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036a2.63 2.63 0 001.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258a2.63 2.63 0 00-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.63 2.63 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.63 2.63 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5z" clipRule="evenodd" />
      </svg>
    ),
  },
];

function StatCard({ value, label, borderColor, textColor, icon }) {
  return (
    <div className={`bg-white dark:bg-gray-900/60 rounded-xl px-5 py-4
                     border border-gray-100 dark:border-gray-800
                     border-l-[3px] ${borderColor}
                     flex items-center justify-between
                     hover:shadow-sm transition-shadow duration-150`}>
      <div>
        <p className={`text-2xl font-bold leading-none ${textColor}`}>{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1.5 font-medium">{label}</p>
      </div>
      <div className={`${textColor} opacity-40`}>
        {icon}
      </div>
    </div>
  );
}

export default function InterviewStatsBar({ interviews = [], allJobs = [] }) {
  const stats = useMemo(() => {
    const today = interviews.filter((j) => {
      if (!j.interviewDate) return false;
      return getUrgency(j.interviewDate, j.interviewTime).level === "today";
    }).length;

    const thisWeek = interviews.filter((j) => {
      if (!j.interviewDate) return false;
      return ["today", "tomorrow", "week"].includes(
        getUrgency(j.interviewDate, j.interviewTime).level
      );
    }).length;

    const overdue = interviews.filter((j) => {
      if (!j.interviewDate) return false;
      return getUrgency(j.interviewDate, j.interviewTime).level === "overdue";
    }).length;

    const offers  = allJobs.filter((j) => j.status === "offer").length;
    const decided = allJobs.filter(
      (j) => j.status === "offer" || j.status === "declined"
    ).length;
    const rate = decided > 0 ? Math.round((offers / decided) * 100) : 0;

    return { today, thisWeek, overdue, rate };
  }, [interviews, allJobs]);

  const values = { today: stats.today, thisWeek: stats.thisWeek, overdue: stats.overdue, rate: `${stats.rate}%` };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
      {CARDS.map((card) => (
        <StatCard
          key={card.key}
          value={values[card.key]}
          label={card.label}
          borderColor={card.borderColor}
          textColor={card.textColor}
          icon={card.icon}
        />
      ))}
    </div>
  );
}
