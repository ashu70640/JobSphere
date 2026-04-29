// JobSphere Admin — new file, safe to delete without affecting core app
import { useState, useEffect, useCallback } from "react";
import { adminFetch } from "../../admin/adminFetch.js";

const STATUS_COLOR = {
  pending:   "text-yellow-400 bg-yellow-900/30 border-yellow-800",
  interview: "text-blue-400   bg-blue-900/30   border-blue-800",
  offer:     "text-green-400  bg-green-900/30  border-green-800",
  declined:  "text-red-400    bg-red-900/30    border-red-800",
};

export default function AdminJobs() {
  const [jobs,    setJobs]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [search,  setSearch]  = useState("");
  const [query,   setQuery]   = useState("");
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminFetch(
        `/api/admin/jobs?page=${page}&limit=20&search=${encodeURIComponent(query)}`,
      );
      if (!res) return;
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setJobs(data.jobs);
      setTotal(data.total);
      setPages(data.totalPages);
    } catch (err) {
      setError(err.message || "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setQuery(search);
  };

  const handleDelete = async (jobId, company) => {
    if (!window.confirm(`Delete job at ${company}? This is logged and permanent.`)) return;
    setDeleting(jobId);
    try {
      const res = await adminFetch(`/api/admin/jobs/${jobId}`, { method: "DELETE" });
      if (!res) return;
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setJobs((prev) => prev.filter((j) => j._id !== jobId));
      setTotal((t) => t - 1);
    } catch (err) {
      alert(err.message || "Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Jobs</h1>
          <p className="text-sm text-gray-400 mt-0.5">{total} total jobs</p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company or position…"
            className="bg-gray-800 border border-gray-700 text-sm text-gray-100 rounded-lg
                       px-3 py-2 w-60 focus:outline-none focus:ring-2 focus:ring-indigo-500
                       placeholder:text-gray-600"
          />
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium
                       px-4 py-2 rounded-lg transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left">
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Company</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Position</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Owner</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Created</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-800">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 rounded bg-gray-700 animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : jobs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                  No jobs found
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job._id} className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-3 text-gray-200 font-medium">{job.company}</td>
                  <td className="px-4 py-3 text-gray-400">{job.position}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs font-medium border rounded-full px-2 py-0.5 ${STATUS_COLOR[job.status] || "text-gray-400 bg-gray-800 border-gray-700"}`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{job.ownerEmail}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(job.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(job._id, job.company)}
                      disabled={deleting === job._id}
                      className="text-xs text-red-400 hover:text-red-300 border border-red-800
                                 hover:border-red-700 rounded-lg px-2.5 py-1 transition-colors
                                 disabled:opacity-50"
                    >
                      {deleting === job._id ? "Deleting…" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-gray-400">Page {page} of {pages}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 disabled:opacity-40 transition-colors"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:bg-gray-800 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
