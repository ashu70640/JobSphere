// JobSphere Admin — new file, safe to delete without affecting core app
import { useState, useEffect } from "react";
import { adminFetch } from "../../admin/adminFetch.js";

export default function AiMonitor() {
  const [topUsers,  setTopUsers]  = useState([]);
  const [abusers,   setAbusers]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [tRes, aRes] = await Promise.all([
          adminFetch("/api/admin/stats/ai-usage"),
          adminFetch("/api/admin/ai/abusers"),
        ]);
        if (!tRes || !aRes) return;
        const [t, a] = await Promise.all([tRes.json(), aRes.json()]);
        setTopUsers(t);
        setAbusers(a);
      } catch {
        setError("Failed to load AI monitor data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const SkeletonRow = ({ cols }) => (
    <tr className="border-b border-gray-800">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded bg-gray-700 animate-pulse" />
        </td>
      ))}
    </tr>
  );

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-xl font-bold text-white">AI Monitor</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Top AI usage and rate-limit abusers (20 calls/day cap)
        </p>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Top AI users */}
      <section>
        <h2 className="text-sm font-semibold text-gray-200 mb-3">
          Top 20 users by AI call count
        </h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">#</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Total AI Calls</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Last Reset</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
              ) : topUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    No AI usage data yet
                  </td>
                </tr>
              ) : (
                topUsers.map((u, idx) => (
                  <tr key={u.userId} className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{idx + 1}</td>
                    <td className="px-4 py-3 text-gray-200">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`font-mono font-semibold ${u.callCount >= 20 ? "text-red-400" : "text-indigo-300"}`}>
                        {u.callCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(u.lastReset).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Rate-limit abusers */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm font-semibold text-gray-200">
            Potential abusers
          </h2>
          <span className="text-xs text-gray-500">(hit 20/day cap this week)</span>
          {!loading && abusers.length > 0 && (
            <span className="text-xs font-semibold text-red-400 bg-red-900/30 border border-red-800 rounded-full px-2 py-0.5">
              {abusers.length} flagged
            </span>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Calls Today</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} cols={3} />)
              ) : abusers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                    No abusers detected this week
                  </td>
                </tr>
              ) : (
                abusers.map((u) => (
                  <tr key={u.userId} className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 text-red-300 font-medium">{u.email}</td>
                    <td className="px-4 py-3 font-mono font-bold text-red-400">{u.callCount}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(u.lastReset).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
