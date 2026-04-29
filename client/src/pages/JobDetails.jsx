import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import JobNotes from "../components/JobNotes";
import ChecklistItem from "../components/interview/ChecklistItem";
import InterviewCountdown from "../components/interview/InterviewCountdown";
import AppLayout from "../components/layout/AppLayout";
import { API_JOBS } from "../utils/api";

const STATUS_STYLES = {
  pending:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  interview: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  declined:  "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  offer:     "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

const PREP_CHECKLIST = [
  "Research the company's recent news and product launches",
  "Review the full job description carefully",
  "Prepare 3 STAR-format behavioral stories",
  "Prepare thoughtful questions for the interviewer",
  "Review your most relevant projects and metrics",
  "Test audio and video (for video calls)",
  "Confirm interview time, link, or location",
];

// ── Interview prep panel ───────────────────────────────────────────────────────

function InterviewPrepPanel({ job }) {
  const [prepQuestions, setPrepQuestions] = useState([]);
  const [prepLoading,   setPrepLoading]   = useState(false);
  const [prepError,     setPrepError]     = useState(null);

  const handleGeneratePrepQuestions = async () => {
    const token = localStorage.getItem("accessToken");
    setPrepLoading(true);
    setPrepError(null);

    try {
      const res  = await fetch(`${API_JOBS}/${job._id}/summarize`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        setPrepError(data.message || "AI request failed");
        return;
      }

      const summary = data.summary;
      const questions = [
        ...(summary.keySkills || []).slice(0, 2).map(
          (s) => `Tell me about a time you worked with ${s}.`
        ),
        ...(summary.responsibilities || []).slice(0, 2).map(
          (r) => `How would you approach: ${r}?`
        ),
        "Describe a challenging project and how you overcame obstacles.",
        "Why are you interested in this role specifically?",
        "Where do you see yourself in 3 years?",
        "Do you have any questions for us?",
      ].slice(0, 8);

      setPrepQuestions(questions);
    } catch (err) {
      setPrepError("Could not generate questions. Try again.");
    } finally {
      setPrepLoading(false);
    }
  };

  const interviewDate = job.interviewDate;
  const interviewTime = job.interviewTime;

  return (
    <div className="bg-white dark:bg-gray-800 border border-violet-200 dark:border-violet-800
                    rounded-2xl p-5 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-violet-100 dark:bg-violet-900/30 rounded-lg
                          flex items-center justify-center">
            <svg className="w-4 h-4 text-violet-600 dark:text-violet-400" fill="none"
                 viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Interview Prep</h3>
        </div>

        {interviewDate && (
          <InterviewCountdown
            interviewDate={interviewDate}
            interviewTime={interviewTime}
          />
        )}
      </div>

      {/* Interview meta info */}
      {(job.interviewType || job.interviewRound || job.interviewerName) && (
        <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl px-4 py-3
                        space-y-1 text-xs text-gray-600 dark:text-gray-400">
          {job.interviewType && (
            <p>
              <span className="font-medium text-gray-700 dark:text-gray-300">Type: </span>
              <span className="capitalize">{job.interviewType.replace("-", " ")}</span>
            </p>
          )}
          {job.interviewRound && (
            <p>
              <span className="font-medium text-gray-700 dark:text-gray-300">Round: </span>
              {job.interviewRound === 99 ? "Final" : `Round ${job.interviewRound}`}
            </p>
          )}
          {job.interviewerName && (
            <p>
              <span className="font-medium text-gray-700 dark:text-gray-300">Interviewer: </span>
              {job.interviewerName}
            </p>
          )}
          {interviewDate && (
            <p>
              <span className="font-medium text-gray-700 dark:text-gray-300">Date: </span>
              {new Date(interviewDate).toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric",
              })}
              {interviewTime && ` at ${
                new Date(`1970-01-01T${interviewTime}`).toLocaleTimeString("en-US", {
                  hour: "numeric", minute: "2-digit",
                })
              }`}
            </p>
          )}
        </div>
      )}

      {/* Prep checklist */}
      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400
                      uppercase tracking-wider mb-3">
          Pre-interview checklist
        </p>
        <div className="space-y-1">
          {PREP_CHECKLIST.map((item, i) => (
            <ChecklistItem
              key={i}
              label={item}
              storageKey={`prep-${job._id}-${i}`}
            />
          ))}
        </div>
      </div>

      {/* AI prep questions */}
      <div>
        <button
          onClick={handleGeneratePrepQuestions}
          disabled={prepLoading}
          className="w-full py-2.5 text-sm font-semibold text-white
                     bg-gradient-to-r from-violet-600 to-indigo-600
                     hover:from-violet-700 hover:to-indigo-700
                     rounded-xl transition-all duration-150
                     disabled:opacity-60 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2"
        >
          {prepLoading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating…
            </>
          ) : (
            <>
              <span>✦</span>
              Generate AI Prep Questions
            </>
          )}
        </button>

        {prepError && (
          <p className="text-xs text-red-500 mt-2 text-center">{prepError}</p>
        )}

        {prepQuestions.length > 0 && (
          <div className="mt-4 bg-violet-50 dark:bg-violet-900/20
                          border border-violet-100 dark:border-violet-900
                          rounded-xl p-4 space-y-3">
            {prepQuestions.map((q, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-violet-400 text-xs font-bold mt-0.5 flex-shrink-0 w-5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">{q}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

const JobDetails = () => {
  const { id }     = useParams();
  const navigate   = useNavigate();

  const [job,         setJob]         = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [aiSummary,   setAiSummary]   = useState(null);
  const [aiLoading,   setAiLoading]   = useState(false);
  const [resumeText,  setResumeText]  = useState("");
  const [matchResult, setMatchResult] = useState(null);
  const [matchLoading,setMatchLoading]= useState(false);
  const [resumeFile,  setResumeFile]  = useState(null);

  useEffect(() => {
    const fetchJob = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) { navigate("/login"); return; }

      try {
        const res  = await fetch(`${API_JOBS}/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem("accessToken");
          navigate("/login");
          return;
        }

        if (res.ok) setJob(data.job);
        else setError(data.message || "Failed to fetch job");
      } catch {
        setError("Server error");
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [id, navigate]);

  const handleDelete = async () => {
    const token = localStorage.getItem("accessToken");
    if (!window.confirm("Are you sure you want to delete this job?")) return;

    try {
      const res = await fetch(`${API_JOBS}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem("accessToken");
        navigate("/login");
        return;
      }
      if (res.ok) navigate("/all-jobs");
    } catch (err) {
      console.error(err);
    }
  };

  const handleSummarize = async () => {
    const token = localStorage.getItem("accessToken");
    setAiLoading(true);
    try {
      const res  = await fetch(`${API_JOBS}/${job._id}/summarize`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message || "AI failed to generate summary"); return; }
      setAiSummary(data.summary);
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleMatchResume = async () => {
    if (!resumeText.trim()) return;
    const token = localStorage.getItem("accessToken");
    setMatchLoading(true);
    try {
      const res  = await fetch(`${API_JOBS}/${job._id}/match-resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ resumeText }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.message || "Matching failed"); return; }
      setMatchResult(data.result);
    } catch (err) {
      console.error(err);
    } finally {
      setMatchLoading(false);
    }
  };

  const handleMatchPDF = async () => {
    if (!resumeFile) return;
    const token    = localStorage.getItem("accessToken");
    const formData = new FormData();
    formData.append("resume", resumeFile);
    try {
      const res  = await fetch(`${API_JOBS}/${job._id}/match-resume-pdf`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      setMatchResult(data.result);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return (
    <AppLayout title="Job Details">
      <p className="py-20 text-center text-gray-500 dark:text-gray-400 text-sm">Loading…</p>
    </AppLayout>
  );
  if (error) return (
    <AppLayout title="Job Details">
      <p className="py-20 text-center text-red-500 dark:text-red-400 text-sm">{error}</p>
    </AppLayout>
  );

  const isInterviewStage = job.status === "interview";

  return (
    <AppLayout title={`${job.position} — ${job.company}`}>
      <div className="grid lg:grid-cols-3 gap-8">

        {/* ── LEFT: Main content ────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-8">

          {/* Job info card */}
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-2xl p-6
                          border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-start mb-4 gap-4">
              <div>
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">{job.position}</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">{job.company}</p>
                <span
                  className={`inline-block mt-2 text-xs font-semibold px-3 py-1 rounded-full
                              ${STATUS_STYLES[job.status] || STATUS_STYLES.pending}`}
                >
                  {(job.status || "pending").toUpperCase()}
                </span>

                {job.interviewDate && (
                  <div className="mt-2">
                    <InterviewCountdown
                      interviewDate={job.interviewDate}
                      interviewTime={job.interviewTime}
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2 flex-shrink-0">
                <Link
                  to={`/edit/${job._id}`}
                  className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200
                             px-3 py-1.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600
                             text-sm transition-colors"
                >
                  Edit
                </Link>
                <button
                  onClick={handleDelete}
                  className="border border-red-300 dark:border-red-700
                             text-red-500 dark:text-red-400 px-3 py-1.5
                             rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20
                             text-sm transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => navigate(-1)}
                  className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200
                             px-3 py-1.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600
                             text-sm transition-colors"
                >
                  Back
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 text-sm">
                Job Description
              </h3>
              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line
                            leading-relaxed text-sm">
                {job.description}
              </p>
            </div>
          </div>

          {/* Resume match */}
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-2xl p-6
                          border border-gray-100 dark:border-gray-700 space-y-5">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Resume–JD Match</h3>

            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              rows="5"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl p-3 text-sm
                         focus:ring-2 focus:ring-green-400 outline-none transition
                         dark:bg-gray-700 dark:text-gray-100"
              placeholder="Paste your resume text here…"
            />

            <div className="flex flex-wrap gap-3 items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm text-gray-600 dark:text-gray-400">PDF:</span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setResumeFile(e.target.files[0])}
                  className="text-sm dark:text-gray-300"
                />
              </label>

              <button
                onClick={handleMatchPDF}
                disabled={!resumeFile}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm
                           hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Match PDF
              </button>

              <button
                onClick={handleMatchResume}
                disabled={matchLoading || !resumeText.trim()}
                className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm
                           hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {matchLoading ? "Analyzing…" : "Match Resume"}
              </button>
            </div>

            {matchResult && (
              <div className="bg-green-50 dark:bg-green-900/20
                              border border-green-200 dark:border-green-800
                              rounded-xl p-5">
                <div className="flex justify-between mb-4">
                  <h4 className="font-semibold text-gray-700 dark:text-gray-300">Match Analysis</h4>
                  <span className="bg-green-100 dark:bg-green-900/30
                                   text-green-700 dark:text-green-400
                                   px-3 py-1 rounded-full font-bold text-sm">
                    {matchResult.matchScore}%
                  </span>
                </div>
                <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-600 dark:text-gray-400">
                  <div>
                    <h5 className="font-semibold mb-2 dark:text-gray-300">Strengths</h5>
                    <ul className="list-disc list-inside space-y-1">
                      {matchResult.strengthAreas?.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-semibold mb-2 dark:text-gray-300">Missing Skills</h5>
                    <ul className="list-disc list-inside space-y-1">
                      {matchResult.missingSkills?.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                  <div className="md:col-span-2">
                    <h5 className="font-semibold mb-2 dark:text-gray-300">Suggestions</h5>
                    <ul className="list-disc list-inside space-y-1">
                      {matchResult.improvementSuggestions?.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Sidebar ────────────────────────────────────────────── */}
        <div className="space-y-6 lg:sticky lg:top-6 self-start">

          {/* Interview Prep — shown only in interview stage */}
          {isInterviewStage && <InterviewPrepPanel job={job} />}

          {/* AI Summary */}
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-2xl p-5
                          border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">AI Summary</h3>
              <button
                onClick={handleSummarize}
                disabled={aiLoading}
                className="bg-purple-600 text-white px-3 py-1.5 rounded-xl
                           hover:bg-purple-700 text-xs font-medium
                           disabled:opacity-60 transition-colors"
              >
                {aiLoading ? "…" : "Generate"}
              </button>
            </div>

            {aiSummary ? (
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3">
                <div>
                  <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Key Skills</h4>
                  <ul className="list-disc list-inside space-y-0.5">
                    {aiSummary.keySkills?.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Responsibilities</h4>
                  <ul className="list-disc list-inside space-y-0.5">
                    {aiSummary.responsibilities?.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Experience</h4>
                  <p>{aiSummary.experience}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400">
                Generate an AI summary of the key skills and responsibilities.
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white dark:bg-gray-800 shadow-sm rounded-2xl p-5
                          border border-gray-100 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-3">Notes</h3>
            <JobNotes job={job} setJob={setJob} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default JobDetails;
