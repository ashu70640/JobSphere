import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import UpcomingInterviewsWidget from "../components/interview/UpcomingInterviewsWidget";
import RescheduleModal from "../components/interview/RescheduleModal";
import Pagination from "../components/Pagination";
import FilterBar from "../components/FilterBar";
import AppLayout from "../components/layout/AppLayout";
import { API_JOBS } from "../utils/api";
import { apiFetch } from "../utils/apiFetch";

const STATUS_STYLES = {
  pending:   "bg-yellow-50  dark:bg-yellow-900/20  text-yellow-700 dark:text-yellow-400  border border-yellow-200 dark:border-yellow-800",
  interview: "bg-blue-50    dark:bg-blue-900/20    text-blue-700   dark:text-blue-400    border border-blue-200   dark:border-blue-800",
  declined:  "bg-red-50     dark:bg-red-900/20     text-red-600    dark:text-red-400     border border-red-200    dark:border-red-800",
  offer:     "bg-green-50   dark:bg-green-900/20   text-green-700  dark:text-green-400   border border-green-200  dark:border-green-800",
};

// ── Skeleton row ───────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800 animate-pulse">
      {[40, 56, 24, 24, 28, 20].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div className={`h-4 w-${w} bg-gray-200 dark:bg-gray-700 rounded`} />
        </td>
      ))}
    </tr>
  );
}

// ── Job table row ──────────────────────────────────────────────────────────────
function JobRow({ job, onDelete }) {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800
                   hover:bg-gray-50 dark:hover:bg-gray-800/60
                   transition-colors duration-100 group">

      {/* Company */}
      <td className="px-4 py-3">
        <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
          {job.company}
        </span>
      </td>

      {/* Position */}
      <td className="px-4 py-3">
        <span className="text-sm text-gray-700 dark:text-gray-300">{job.position}</span>
        {job.interviewDate && (
          <p className="text-xs text-violet-500 dark:text-violet-400 mt-0.5">
            {new Date(job.interviewDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            {job.interviewTime && ` · ${new Date(`1970-01-01T${job.interviewTime}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}
          </p>
        )}
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full ${STATUS_STYLES[job.status] || STATUS_STYLES.pending}`}>
          {job.status}
        </span>
      </td>

      {/* Type */}
      <td className="px-4 py-3 hidden md:table-cell">
        <span className="text-xs text-gray-500 dark:text-gray-400">{job.jobType}</span>
      </td>

      {/* Location */}
      <td className="px-4 py-3 hidden lg:table-cell">
        <span className="text-xs text-gray-500 dark:text-gray-400">{job.workLocation || "—"}</span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <Link
            to={`/jobs/${job._id}`}
            className="h-7 px-3 text-xs font-medium rounded-md
                       text-gray-600 dark:text-gray-400
                       hover:bg-gray-100 dark:hover:bg-gray-700
                       transition-colors duration-150"
          >
            View
          </Link>
          <Link
            to={`/edit/${job._id}`}
            className="h-7 px-3 text-xs font-medium rounded-md
                       text-gray-600 dark:text-gray-400
                       hover:bg-gray-100 dark:hover:bg-gray-700
                       transition-colors duration-150"
          >
            Edit
          </Link>
          {job.status === "interview" && !job.interviewDate && (
            <Link
              to={`/edit/${job._id}`}
              className="h-7 px-3 text-xs font-medium rounded-md
                         text-violet-600 dark:text-violet-400
                         hover:bg-violet-50 dark:hover:bg-violet-900/20
                         transition-colors duration-150"
            >
              Schedule
            </Link>
          )}
          <button
            onClick={() => onDelete(job._id)}
            className="h-7 px-3 text-xs font-medium rounded-md
                       text-red-500 dark:text-red-400
                       hover:bg-red-50 dark:hover:bg-red-900/20
                       transition-colors duration-150"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();

  const [jobs,               setJobs]               = useState([]);
  const [upcomingInterviews, setUpcomingInterviews] = useState([]);
  const [loading,            setLoading]            = useState(true);
  const [error,              setError]              = useState(null);
  const [rescheduleTarget,   setRescheduleTarget]   = useState(null);

  const [filters, setFilters] = useState({
    search:  "",
    status:  "all",
    jobType: "all",
    sort:    "latest",
    page:    1,
    limit:   10,
  });
  const [meta, setMeta] = useState({ totalJobs: 0, numOfPages: 1 });

  // ── Fetch jobs ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!localStorage.getItem("accessToken")) { navigate("/login"); return; }

    const fetchJobs = async () => {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, val]) => {
        if (!val) return;
        if (val === "all" && (key === "status" || key === "jobType")) return;
        if (key === "search" && !val.trim()) return;
        params.append(key, val);
      });

      try {
        const res = await apiFetch(
          `${API_JOBS}${params.toString() ? `?${params}` : ""}`
        );
        const data = await res.json();
        if (res.ok) {
          setJobs(data.jobs);
          setMeta({ totalJobs: data.totalJobs || 0, numOfPages: data.numOfPages || 1 });
        } else {
          setError(data.message || "Failed to fetch jobs");
        }
      } catch {
        setError("Could not load jobs");
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchJobs, 300);
    return () => clearTimeout(timer);
  }, [filters, navigate]);

  // ── Fetch upcoming interviews ──────────────────────────────────────────────
  const fetchUpcomingInterviews = useCallback(async () => {
    if (!localStorage.getItem("accessToken")) return;
    try {
      const res  = await apiFetch(`${API_JOBS}/upcoming-interviews`);
      const data = await res.json();
      if (res.ok) setUpcomingInterviews(data.jobs || []);
    } catch (err) {
      console.error("Error fetching interviews:", err);
    }
  }, []);

  useEffect(() => { fetchUpcomingInterviews(); }, [fetchUpcomingInterviews]);

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

  const handleDelete = async (jobId) => {
    if (!window.confirm("Are you sure you want to delete this job?")) return;
    try {
      const res = await apiFetch(`${API_JOBS}/${jobId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setJobs((prev) => prev.filter((j) => j._id !== jobId));
    } catch {
      alert("Error deleting job");
    }
  };

  const handleMarkComplete = async (jobId) => {
    try {
      await patchJob(jobId, { interviewStatus: "completed" });
      setUpcomingInterviews((prev) =>
        prev.map((j) => j._id === jobId ? { ...j, interviewStatus: "completed" } : j)
      );
    } catch (err) { console.error(err); }
  };

  const handleConvertStatus = async (jobId, newStatus) => {
    try {
      await patchJob(jobId, { status: newStatus });
      setUpcomingInterviews((prev) => prev.filter((j) => j._id !== jobId));
      setFilters((f) => ({ ...f }));
    } catch (err) { console.error(err); }
  };

  const handleReschedule = async (jobId, updates) => {
    try {
      await patchJob(jobId, updates);
      setUpcomingInterviews((prev) =>
        prev.map((j) => j._id === jobId ? { ...j, ...updates } : j)
      );
    } catch (err) { console.error(err); }
  };

  return (
    <AppLayout title="Jobs">
      <div className="flex gap-6 items-start">

        {/* Main: filters + table + pagination */}
        <div className="flex-1 min-w-0">

          {/* Filter bar */}
          <FilterBar
            filters={filters}
            setFilters={setFilters}
            totalJobs={meta.totalJobs}
            loading={loading}
          />

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400
                          bg-red-50 dark:bg-red-900/20
                          border border-red-200 dark:border-red-800
                          rounded-lg px-4 py-3 mb-4">
              {error}
            </p>
          )}

          {/* Jobs table */}
          <div className="bg-white dark:bg-gray-900
                          border border-gray-100 dark:border-gray-800
                          rounded-xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Company</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Position</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider hidden md:table-cell">Type</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider hidden lg:table-cell">Location</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(8)].map((_, i) => <SkeletonRow key={i} />)
                ) : jobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-20 text-center">
                      <p className="text-sm font-medium text-gray-400 dark:text-gray-500">
                        No jobs found
                      </p>
                      <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
                        Try adjusting your filters or{" "}
                        <Link to="/add-job" className="text-blue-500 hover:underline">
                          add a new job
                        </Link>
                      </p>
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <JobRow key={job._id} job={job} onDelete={handleDelete} />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={filters.page}
            totalPages={meta.numOfPages}
            totalJobs={meta.totalJobs}
            limit={filters.limit}
            onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
          />
        </div>

        {/* Interviews sidebar */}
        <div className="w-72 flex-shrink-0 hidden xl:block">
          <div className="sticky top-0">
            <UpcomingInterviewsWidget
              interviews={upcomingInterviews}
              onReschedule={(job) => setRescheduleTarget(job)}
              onMarkComplete={handleMarkComplete}
              onConvertStatus={handleConvertStatus}
            />
          </div>
        </div>
      </div>

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
