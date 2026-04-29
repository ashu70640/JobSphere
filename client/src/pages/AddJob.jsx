import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { API_JOBS } from "../utils/api";

const INPUT_CLS = `w-full border border-gray-300 rounded-xl p-3 text-sm
                  focus:ring-2 focus:ring-blue-400 outline-none transition
                  dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100
                  dark:focus:ring-blue-500`;

const INPUT_VIOLET = `w-full border border-gray-300 rounded-xl p-3 text-sm
                      focus:ring-2 focus:ring-violet-400 focus:border-transparent outline-none
                      dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100`;

const SELECT_VIOLET = `w-full border border-gray-300 rounded-xl p-3 text-sm
                       focus:ring-2 focus:ring-violet-400 outline-none
                       dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100`;

// Reusable interview fields section — only shown when status === "interview"
function InterviewSection({ formData, onChange }) {
  return (
    <div className="border border-violet-200 bg-violet-50 rounded-2xl p-5 space-y-4
                    dark:bg-violet-900/20 dark:border-violet-800">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 bg-violet-600 rounded-lg flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-violet-800 dark:text-violet-300">Interview Details</h3>
        <span className="text-xs text-violet-500 dark:text-violet-400">(optional)</span>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Date</label>
          <input
            type="date"
            name="interviewDate"
            value={formData.interviewDate}
            onChange={onChange}
            className={INPUT_VIOLET}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Time</label>
          <input
            type="time"
            name="interviewTime"
            value={formData.interviewTime}
            onChange={onChange}
            className={INPUT_VIOLET}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Interview Type</label>
          <select
            name="interviewType"
            value={formData.interviewType}
            onChange={onChange}
            className={SELECT_VIOLET}
          >
            <option value="">Select type</option>
            <option value="phone">Phone Screen</option>
            <option value="video">Video Call</option>
            <option value="technical">Technical</option>
            <option value="on-site">On-site</option>
            <option value="panel">Panel</option>
            <option value="final">Final Round</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Round</label>
          <select
            name="interviewRound"
            value={formData.interviewRound}
            onChange={onChange}
            className={SELECT_VIOLET}
          >
            <option value={1}>Round 1</option>
            <option value={2}>Round 2</option>
            <option value={3}>Round 3</option>
            <option value={99}>Final</option>
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            Interviewer Name{" "}
            <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            name="interviewerName"
            value={formData.interviewerName}
            onChange={onChange}
            placeholder="e.g. Sarah Chen, Engineering Manager"
            className={INPUT_VIOLET}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

const AddJob = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const [formData, setFormData] = useState({
    company:         "",
    position:        "",
    status:          "pending",
    jobType:         "full-time",
    workLocation:    "",
    description:     "",
    interviewDate:   "",
    interviewTime:   "",
    interviewType:   "",
    interviewRound:  1,
    interviewerName: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const token = localStorage.getItem("accessToken");
    if (!token) { navigate("/login"); return; }

    try {
      const res = await fetch(API_JOBS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          interviewDate:  formData.interviewDate  || null,
          interviewRound: Number(formData.interviewRound),
        }),
      });

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("accessToken");
        navigate("/login");
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create job");

      navigate("/all-jobs");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isInterviewStage = formData.status === "interview";

  return (
    <AppLayout title="Add Job">
      <div className="max-w-3xl mx-auto">

        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-2xl p-8
                        border border-gray-100 dark:border-gray-700">
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">New Job Application</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Track a new job opportunity</p>
          </div>

          {error && (
            <div className="mb-6 text-red-600 dark:text-red-400 text-sm
                            bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800
                            rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Core fields */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Company
                </label>
                <input
                  type="text"
                  name="company"
                  placeholder="Google"
                  value={formData.company}
                  onChange={handleChange}
                  required
                  className={INPUT_CLS}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Position
                </label>
                <input
                  type="text"
                  name="position"
                  placeholder="Software Engineer"
                  value={formData.position}
                  onChange={handleChange}
                  required
                  className={INPUT_CLS}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className={INPUT_CLS}
                >
                  <option value="pending">Pending</option>
                  <option value="interview">Interview</option>
                  <option value="declined">Declined</option>
                  <option value="offer">Offer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Job Type
                </label>
                <select
                  name="jobType"
                  value={formData.jobType}
                  onChange={handleChange}
                  className={INPUT_CLS}
                >
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="remote">Remote</option>
                  <option value="internship">Internship</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Work Location
                </label>
                <input
                  type="text"
                  name="workLocation"
                  placeholder="Bangalore / Remote"
                  value={formData.workLocation}
                  onChange={handleChange}
                  required
                  className={INPUT_CLS}
                />
              </div>
            </div>

            {/* Interview section — conditional on status */}
            {isInterviewStage && (
              <InterviewSection formData={formData} onChange={handleChange} />
            )}

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Job Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="6"
                placeholder="Paste full job description here…"
                required
                className={INPUT_CLS}
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl text-sm
                           font-semibold hover:bg-blue-700 disabled:opacity-60
                           transition-colors duration-150 shadow-sm"
              >
                {loading ? "Creating…" : "Create Job"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
};

export default AddJob;
