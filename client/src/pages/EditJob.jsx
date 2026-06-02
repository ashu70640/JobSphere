import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "../components/layout/AppLayout";
import { API_JOBS } from "../utils/api";
import { apiFetch } from "../utils/apiFetch";

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

// Shown only when status === "interview"
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
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Date */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            Interview Date
          </label>
          <input
            type="date"
            name="interviewDate"
            value={formData.interviewDate}
            onChange={onChange}
            className={INPUT_VIOLET}
          />
        </div>

        {/* Time */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            Interview Time
          </label>
          <input
            type="time"
            name="interviewTime"
            value={formData.interviewTime}
            onChange={onChange}
            className={INPUT_VIOLET}
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            Interview Type
          </label>
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

        {/* Round */}
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            Round
          </label>
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

        {/* Interviewer */}
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

const EditJob = () => {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState(null);

  const [formData, setFormData] = useState({
    position:        "",
    company:         "",
    workLocation:    "",
    status:          "pending",
    jobType:         "full-time",
    description:     "",
    interviewDate:   "",
    interviewTime:   "",
    interviewType:   "",
    interviewRound:  1,
    interviewerName: "",
  });

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res  = await apiFetch(`${API_JOBS}/${id}`);
        if (!res.ok) throw new Error("Failed to fetch job");

        const data = await res.json();
        const job  = data.job;

        setFormData({
          position:        job.position        || "",
          company:         job.company         || "",
          workLocation:    job.workLocation     || "",
          status:          job.status          || "pending",
          jobType:         job.jobType         || "full-time",
          description:     job.description     || "",
          interviewDate:   job.interviewDate   ? job.interviewDate.split("T")[0] : "",
          interviewTime:   job.interviewTime   || "",
          interviewType:   job.interviewType   || "",
          interviewRound:  job.interviewRound  || 1,
          interviewerName: job.interviewerName || "",
        });
      } catch (err) {
        console.error("Failed to fetch job:", err);
        setError("Could not load job details.");
      }
    };
    fetchJob();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await apiFetch(`${API_JOBS}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          interviewDate:  formData.interviewDate  || null,
          interviewRound: Number(formData.interviewRound),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to update job");
      }

      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const isInterviewStage = formData.status === "interview";

  return (
    <AppLayout title="Edit Job">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-2xl p-8
                        border border-gray-100 dark:border-gray-700">

          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Edit Job</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Update your application details</p>
          </div>

          {error && (
            <div className="mb-6 text-red-600 dark:text-red-400 text-sm
                            bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800
                            rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Core fields grid */}
            <div className="grid md:grid-cols-2 gap-6">

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Position
                </label>
                <input
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  placeholder="Software Engineer"
                  required
                  className={INPUT_CLS}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Company
                </label>
                <input
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="Google"
                  required
                  className={INPUT_CLS}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Work Location
                </label>
                <input
                  name="workLocation"
                  value={formData.workLocation}
                  onChange={handleChange}
                  placeholder="Bangalore / Remote"
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

              <div className="md:col-span-2">
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
            </div>

            {/* Interview section — only visible in interview stage */}
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
                placeholder="Edit job description…"
                className={INPUT_CLS}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-5 py-3 text-sm font-medium text-gray-600 dark:text-gray-300
                           hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl text-sm
                           font-semibold hover:bg-blue-700 disabled:opacity-60
                           transition-colors duration-150 shadow-sm"
              >
                {saving ? "Saving…" : "Update Job"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
};

export default EditJob;
