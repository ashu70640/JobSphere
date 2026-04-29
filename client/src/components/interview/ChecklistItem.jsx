import { useState } from "react";

/**
 * ChecklistItem — Persists checked state to localStorage per job.
 * Zero backend cost. Survives page refresh.
 */
export default function ChecklistItem({ label, storageKey }) {
  const [checked, setChecked] = useState(
    () => localStorage.getItem(storageKey) === "true"
  );

  const toggle = () => {
    const next = !checked;
    setChecked(next);
    localStorage.setItem(storageKey, String(next));
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-3 w-full text-left group py-1"
    >
      {/* Custom checkbox */}
      <div
        className={`w-4 h-4 rounded border-2 flex items-center justify-center
                    flex-shrink-0 transition-all duration-150
                    ${checked
                      ? "bg-violet-600 border-violet-600"
                      : "border-gray-300 group-hover:border-violet-400"
                    }`}
      >
        {checked && (
          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
            <path
              d="M2 5l2.5 2.5L8 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      <span
        className={`text-sm leading-snug transition-colors duration-150
                    ${checked ? "line-through text-gray-400" : "text-gray-700"}`}
      >
        {label}
      </span>
    </button>
  );
}
