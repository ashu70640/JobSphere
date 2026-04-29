import { useState, useEffect, useCallback } from "react";

export const useJobs = () => {
  const [jobs, setJobs] = useState([]);
  const [filters, setFilters] = useState({
    status: "all",
    jobType: "all",
    search: "",
    sort: "latest",
    page: 1,
    limit: 10,
  });
  const [meta, setMeta] = useState({ totalJobs: 0, numOfPages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  //build query string

  const buildQuery = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (
        value &&
        !(key === "search" && value.trim() === "") &&
        !(value === "all" && (key === "status" || key === "jobType"))
      ) {
        params.append(key, value);
      }
    });
    return params.toString();
  };

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const query = buildQuery();
      const res = await fetch(`http://localhost:5002/api/v1/jobs?${query}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch jobs");

      setJobs(data.jobs);
      setMeta({ totalJobs: data.totalJobs, numOfPages: data.numOfPages });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  //debounce search input

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchJobs();
    }, 300);

    return () => clearTimeout(handler);
  }, [fetchJobs]);

  return {
    jobs,
    filters,
    setFilters,
    meta,
    loading,
    error,
    refetch: fetchJobs,
  };
};
