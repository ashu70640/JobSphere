import { useState, useEffect } from "react";

/**
 * RescheduleModal
 *
 * Lightweight inline modal. Backdrop click closes it.
 * Locks body scroll while open.
 *
 * Props:
 *   job     — the job being rescheduled
 *   onClose — () => void
 *   onSave  — (jobId, updatesObject) => Promise<void>
 */
export default function RescheduleModal({ job, onClose, onSave }) {
  const [date,        setDate]        = useState(() => {
    if (!job?.interviewDate) return "";
    return new Date(job.interviewDate).toISOString().split("T")[0];
  });
  const [time,        setTime]        = useState(job?.interviewTime        || "");
  const [type,        setType]        = useState(job?.interviewType        || "");
  const [round,       setRound]       = useState(job?.interviewRound       || 1);
  const [interviewer, setInterviewer] = useState(job?.interviewerName      || "");
  const [saving,      setSaving]      = useState(false);

  // Lock scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSave = async () => {
    if (!date) return;
    setSaving(true);
    try {
      await onSave(job._id, {
        interviewDate:   date,
        interviewTime:   time,
        interviewType:   type,
        interviewRound:  Number(round),
        interviewerName: interviewer,
        interviewStatus: "scheduled",
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const INPUT_CLS = `w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5
                     text-sm focus:ring-2 focus:ring-violet-400 focus:border-transparent
                     outline-none transition dark:bg-gray-700 dark:text-gray-100`;

  const SELECT_CLS = `w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5
                      text-sm focus:ring-2 focus:ring-violet-400 outline-none transition
                      dark:bg-gray-700 dark:text-gray-100`;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center
                 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Modal panel */}
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4
                   interview-modal-enter"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Schedule Interview"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5
                        border-b border-gray-100 dark:border-gray-700">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Schedule Interview</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {job.position} · {job.company}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl
                       hover:bg-gray-100 dark:hover:bg-gray-700
                       text-gray-400 dark:text-gray-500
                       hover:text-gray-600 dark:hover:text-gray-300
                       transition-colors text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Form body */}
        <div className="px-6 py-5 space-y-5">

          {/* Date + Time row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Time
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={INPUT_CLS}
              />
            </div>
          </div>

          {/* Type + Round row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Interview Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className={SELECT_CLS}
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
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                Round
              </label>
              <select
                value={round}
                onChange={(e) => setRound(e.target.value)}
                className={SELECT_CLS}
              >
                <option value={1}>Round 1</option>
                <option value={2}>Round 2</option>
                <option value={3}>Round 3</option>
                <option value={99}>Final</option>
              </select>
            </div>
          </div>

          {/* Interviewer */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Interviewer Name{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Sarah Chen, Engineering Manager"
              value={interviewer}
              onChange={(e) => setInterviewer(e.target.value)}
              className={INPUT_CLS}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4
                        border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium
                       text-gray-600 dark:text-gray-300
                       hover:bg-gray-100 dark:hover:bg-gray-700
                       rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!date || saving}
            className="px-5 py-2 text-sm font-semibold text-white bg-violet-600
                       hover:bg-violet-700 disabled:opacity-50
                       disabled:cursor-not-allowed rounded-xl transition-colors"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
