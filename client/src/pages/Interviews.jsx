import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import InterviewCard from "../components/interview/InterviewCard";
import InterviewStatsBar from "../components/interview/InterviewStatsBar";
import RescheduleModal from "../components/interview/RescheduleModal";
import { getUrgency } from "../components/interview/InterviewCountdown";
import AppLayout from "../components/layout/AppLayout";
import { API_JOBS } from "../utils/api";
import { apiFetch } from "../utils/apiFetch";

const SECTION_ORDER = ["overdue", "today", "tomorrow", "week", "later"];
const SECTION_LABELS = {
  overdue:  "Needs Attention",
  today:    "Today",
  tomorrow: "Tomorrow",
  week:     "This Week",
  later:    "Upcoming",
};

// ── Skeleton loader ────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10 animate-pulse">
      <div className="h-8 w-52 bg-gray-200 dark:bg-gray-700 rounded-xl mb-2" />
      <div className="h-4 w-80 bg-gray-100 dark:bg-gray-600 rounded-xl mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
        ))}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-52 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

// ── Section divider ────────────────────────────────────────────────────────────

function SectionDivider({ label, count }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400
                     uppercase tracking-wider whitespace-nowrap">
        {label}
      </h2>
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      <span className="text-xs text-gray-400 flex-shrink-0">{count}</span>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function Interviews() {
  const navigate = useNavigate();
  const [interviews,       setInterviews]       = useState([]);
  const [allJobs,          setAllJobs]          = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [rescheduleTarget, setRescheduleTarget] = useState(null); // job object

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!localStorage.getItem("accessToken")) { navigate("/login"); return; }

    setLoading(true);
    try {
      const [upcomingRes, allRes] = await Promise.all([
        apiFetch(`${API_JOBS}/upcoming-interviews`),
        apiFetch(`${API_JOBS}?limit=200`),
      ]);

      const [upcomingData, allData] = await Promise.all([
        upcomingRes.json(),
        allRes.json(),
      ]);

      setInterviews(upcomingData.jobs || []);
      setAllJobs(allData.jobs || []);
    } catch (err) {
      console.error("Failed to fetch interview data:", err);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const patchJob = async (jobId, updates) => {
    const res = await apiFetch(`${API_JOBS}/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error("Failed to update job");
    return res.json();
  };

  const handleMarkComplete = async (jobId) => {
    try {
      await patchJob(jobId, { interviewStatus: "completed" });
      setInterviews((prev) =>
        prev.map((j) =>
          j._id === jobId ? { ...j, interviewStatus: "completed" } : j
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleConvertStatus = async (jobId, newStatus) => {
    try {
      await patchJob(jobId, { status: newStatus });
      setInterviews((prev) => prev.filter((j) => j._id !== jobId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleReschedule = async (jobId, updates) => {
    try {
      await patchJob(jobId, updates);
      setInterviews((prev) =>
        prev.map((j) => (j._id === jobId ? { ...j, ...updates } : j))
      );
    } catch (err) {
      console.error(err);
    }
  };

  // ── Group interviews by urgency ────────────────────────────────────────────

  const groups = SECTION_ORDER.reduce((acc, key) => {
    acc[key] = interviews.filter((j) => {
      if (!j.interviewDate) return false;
      return getUrgency(j.interviewDate, j.interviewTime).level === key;
    });
    return acc;
  }, {});

  const hasAnyInterviews = interviews.length > 0;

  return (
    <AppLayout title="Interviews">

      {loading ? (
        <PageSkeleton />
      ) : (
        <>
          {/* Stats bar */}
          <InterviewStatsBar interviews={interviews} allJobs={allJobs} />

          {/* Empty state */}
          {!hasAnyInterviews && (
            <div className="text-center py-24">
              <div className="w-16 h-16 bg-violet-50 dark:bg-violet-900/20 rounded-2xl
                              flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24"
                     stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-600 dark:text-gray-300 font-medium">
                No upcoming interviews scheduled
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Change a job&apos;s status to{" "}
                <span className="text-blue-600 font-medium">Interview</span> and add a
                date to see it here
              </p>
            </div>
          )}

          {/* Grouped sections */}
          {SECTION_ORDER.map((key) => {
            const jobs = groups[key];
            if (!jobs.length) return null;

            return (
              <div key={key} className="mb-10">
                <SectionDivider label={SECTION_LABELS[key]} count={jobs.length} />
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {jobs.map((job) => (
                    <InterviewCard
                      key={job._id}
                      job={job}
                      onReschedule={(j) => setRescheduleTarget(j)}
                      onMarkComplete={handleMarkComplete}
                      onConvertStatus={handleConvertStatus}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* Reschedule modal — rendered at root level to escape stacking context */}
      {rescheduleTarget && (
        <RescheduleModal
          job={rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          onSave={handleReschedule}
        />
      )}
    </AppLayout>
  );
}
