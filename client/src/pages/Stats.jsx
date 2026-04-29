import { useEffect, useState } from "react";
import AppLayout from "../components/layout/AppLayout";
import { API_JOBS } from "../utils/api";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

const Stats = () => {

  const [stats, setStats] = useState({
    defaultStats: { pending: 0, interview: 0, declined: 0, offer: 0 },
    monthlyApplications: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(
          `${API_JOBS}/stats`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            },
          }
        );

        const data = await res.json();
        setStats(data);
        setLoading(false);
      } catch (error) {
        console.error(error);
      }
    };

    fetchStats();
  }, []);

  const { defaultStats, monthlyApplications } = stats;

  return (
    <AppLayout title="Analytics">

      {loading ? (
        <div className="flex justify-center py-20 text-gray-500 dark:text-gray-400">
          Loading stats...
        </div>
      ) : (
      <>

        {/* Summary Cards */}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">

          <div className="bg-white dark:bg-gray-800 shadow-md rounded-2xl p-6
                          border border-yellow-100 dark:border-yellow-900/30
                          text-center hover:shadow-lg transition-all duration-200">
            <h3 className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Pending Applications
            </h3>
            <p className="text-4xl font-bold text-yellow-600 dark:text-yellow-400">
              {defaultStats.pending}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow-md rounded-2xl p-6
                          border border-green-100 dark:border-green-900/30
                          text-center hover:shadow-lg transition-all duration-200">
            <h3 className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Interviews
            </h3>
            <p className="text-4xl font-bold text-green-600 dark:text-green-400">
              {defaultStats.interview}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow-md rounded-2xl p-6
                          border border-red-100 dark:border-red-900/30
                          text-center hover:shadow-lg transition-all duration-200">
            <h3 className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Declined
            </h3>
            <p className="text-4xl font-bold text-red-600 dark:text-red-400">
              {defaultStats.declined}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow-md rounded-2xl p-6
                          border border-green-200 dark:border-green-900/30
                          text-center hover:shadow-lg transition-all duration-200">
            <h3 className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Offers
            </h3>
            <p className="text-4xl font-bold text-green-600 dark:text-green-400">
              {defaultStats.offer}
            </p>
          </div>

        </div>

        {/* Charts */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Bar Chart */}

          <div className="bg-white dark:bg-gray-800 shadow-md rounded-2xl p-6
                          border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
              Monthly Applications
            </h3>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyApplications}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" tick={{ fill: "#9ca3af" }} />
                <YAxis tick={{ fill: "#9ca3af" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#f3f4f6",
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Line Chart */}

          <div className="bg-white dark:bg-gray-800 shadow-md rounded-2xl p-6
                          border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
              Application Trend
            </h3>

            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyApplications}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" tick={{ fill: "#9ca3af" }} />
                <YAxis tick={{ fill: "#9ca3af" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#f3f4f6",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#10b981"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

        </div>

      </>
      )}
    </AppLayout>
  );
};

export default Stats;
