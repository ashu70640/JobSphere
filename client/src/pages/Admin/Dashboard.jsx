// JobSphere Admin — new file, safe to delete without affecting core app
import { useState, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { adminFetch } from "../../admin/adminFetch.js";

const StatCard = ({ label, value, color = "indigo", loading }) => {
  const colors = {
    indigo: "bg-indigo-900/40 border-indigo-800 text-indigo-400",
    green:  "bg-green-900/40  border-green-800  text-green-400",
    yellow: "bg-yellow-900/40 border-yellow-800 text-yellow-400",
    blue:   "bg-blue-900/40   border-blue-800   text-blue-400",
  };
  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wider opacity-70">{label}</p>
      {loading ? (
        <div className="mt-2 h-8 w-20 rounded bg-gray-700 animate-pulse" />
      ) : (
        <p className="mt-1 text-3xl font-bold text-white">{value ?? "—"}</p>
      )}
    </div>
  );
};

export default function AdminDashboard() {
  const [overview,   setOverview]   = useState(null);
  const [jobsPerDay, setJobsPerDay] = useState([]);
  const [breakdown,  setBreakdown]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [oRes, jRes, bRes] = await Promise.all([
          adminFetch("/api/admin/stats/overview"),
          adminFetch("/api/admin/stats/jobs-per-day?days=30"),
          adminFetch("/api/admin/stats/status-breakdown"),
        ]);
        if (!oRes || !jRes || !bRes) return;
        const [o, j, b] = await Promise.all([oRes.json(), jRes.json(), bRes.json()]);
        setOverview(o);
        setJobsPerDay(j);
        setBreakdown(b);
      } catch {
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Platform-wide overview</p>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users"    value={overview?.totalUsers}    color="indigo" loading={loading} />
        <StatCard label="Total Jobs"     value={overview?.totalJobs}     color="blue"   loading={loading} />
        <StatCard label="Jobs Today"     value={overview?.jobsToday}     color="green"  loading={loading} />
        <StatCard label="AI Calls Today" value={overview?.aiCallsToday}  color="yellow" loading={loading} />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Jobs per day — line chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-200 mb-4">Jobs created — last 30 days</h2>
          {loading ? (
            <div className="h-48 rounded-lg bg-gray-800 animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={jobsPerDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#9ca3af", fontSize: 11 }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
                  labelStyle={{ color: "#f3f4f6" }}
                  itemStyle={{ color: "#818cf8" }}
                />
                <Line type="monotone" dataKey="count" stroke="#818cf8" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Status breakdown — bar chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-200 mb-4">Job status breakdown</h2>
          {loading ? (
            <div className="h-48 rounded-lg bg-gray-800 animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={breakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="status" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
                  labelStyle={{ color: "#f3f4f6" }}
                  itemStyle={{ color: "#34d399" }}
                />
                <Bar dataKey="count" fill="#34d399" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Active users note */}
      {overview && (
        <p className="text-xs text-gray-500">
          {overview.activeUsers30d} users created at least one job in the last 30 days.
        </p>
      )}
    </div>
  );
}
