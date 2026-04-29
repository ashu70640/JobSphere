// JobSphere Admin — new file, safe to delete without affecting core app
import { useState, useEffect, useCallback } from "react";
import { adminFetch } from "../../admin/adminFetch.js";

const STATUS_PILL = ({ banned }) =>
  banned ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400 bg-red-900/30 border border-red-800 rounded-full px-2 py-0.5">
      Banned
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-400 bg-green-900/30 border border-green-800 rounded-full px-2 py-0.5">
      Active
    </span>
  );

export default function AdminUsers() {
  const [users,   setUsers]   = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [pages,   setPages]   = useState(1);
  const [search,  setSearch]  = useState("");
  const [query,   setQuery]   = useState("");   // committed search
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [banning, setBanning] = useState(null); // userId being banned

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminFetch(
        `/api/admin/users?page=${page}&limit=20&search=${encodeURIComponent(query)}`,
      );
      if (!res) return;
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setUsers(data.users);
      setTotal(data.total);
      setPages(data.totalPages);
    } catch (err) {
      setError(err.message || "Failed to load users");
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

  const handleBan = async (userId, email) => {
    if (!window.confirm(`Ban ${email}? This will set a bannedAt timestamp (soft-ban).`)) return;
    setBanning(userId);
    try {
      const res = await adminFetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (!res) return;
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      // Update row in-place
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, bannedAt: data.bannedAt } : u)),
      );
    } catch (err) {
      alert(err.message || "Ban failed");
    } finally {
      setBanning(null);
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Users</h1>
          <p className="text-sm text-gray-400 mt-0.5">{total} total users</p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="bg-gray-800 border border-gray-700 text-sm text-gray-100 rounded-lg
                       px-3 py-2 w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500
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

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left">
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Joined</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Jobs</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-800">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 rounded bg-gray-700 animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user._id} className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-3 text-gray-200 font-medium">{user.name || "—"}</td>
                  <td className="px-4 py-3 text-gray-400">{user.email}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-gray-300 font-mono">{user.jobCount}</td>
                  <td className="px-4 py-3">
                    <STATUS_PILL banned={!!user.bannedAt} />
                  </td>
                  <td className="px-4 py-3">
                    {!user.bannedAt && (
                      <button
                        onClick={() => handleBan(user._id, user.email)}
                        disabled={banning === user._id}
                        className="text-xs text-red-400 hover:text-red-300 border border-red-800
                                   hover:border-red-700 rounded-lg px-2.5 py-1 transition-colors
                                   disabled:opacity-50"
                      >
                        {banning === user._id ? "Banning…" : "Ban"}
                      </button>
                    )}
                    {user.bannedAt && (
                      <span className="text-xs text-gray-600">
                        {new Date(user.bannedAt).toLocaleDateString()}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-gray-400">
            Page {page} of {pages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400
                         hover:bg-gray-800 disabled:opacity-40 transition-colors"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="px-3 py-1.5 rounded-lg border border-gray-700 text-gray-400
                         hover:bg-gray-800 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
