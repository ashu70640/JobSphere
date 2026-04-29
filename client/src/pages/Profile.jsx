import { useEffect, useState } from "react";
import CalendarConnect from "../components/CalendarConnect.jsx";
import AppLayout from "../components/layout/AppLayout";
import { API_AUTH } from "../utils/api";

// ── Icons (inline SVG — no new libraries) ──────────────────────────────────────

/** Camera icon — avatar upload placeholder (UI only, no backend) */
function CameraIcon() {
  return (
    <svg
      className="w-3 h-3 text-gray-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86
           a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2
           2H5a2 2 0 01-2-2V9z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

/** Pen icon — shown inside the Edit Profile button */
function PenIcon() {
  return (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5
           21.036H3v-3.572L16.732 3.732z"
      />
    </svg>
  );
}

/** Map-pin icon — shown next to the location value */
function MapPinIcon() {
  return (
    <svg
      className="w-3.5 h-3.5 flex-shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0
           1111.314 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

/**
 * InfoField — read-only display card for a single profile attribute.
 * Shows a muted uppercase label above a medium-weight value.
 */
function InfoField({ label, value, className = "" }) {
  return (
    <div
      className={
        `bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700
         rounded-xl px-4 py-3
         hover:border-gray-200 dark:hover:border-gray-600
         transition-colors duration-150 ${className}`
      }
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">
        {label}
      </p>
      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{value}</p>
    </div>
  );
}

/**
 * ProfileSkeleton — pulse placeholder shown while the profile is loading.
 * Mirrors the exact shape of the real card so the transition is smooth.
 */
function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm
                      border border-gray-200 dark:border-gray-700
                      overflow-hidden animate-pulse">
        {/* Banner */}
        <div className="h-28 bg-gradient-to-r from-gray-200 to-gray-100
                        dark:from-gray-700 dark:to-gray-600" />

        <div className="px-6 pb-6">
          {/* Avatar row */}
          <div className="-mt-10 mb-4 flex items-end justify-between">
            <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-600
                            ring-4 ring-white dark:ring-gray-800" />
            <div className="mb-2 h-9 w-28 bg-gray-100 dark:bg-gray-700 rounded-xl" />
          </div>

          {/* Name + email lines */}
          <div className="h-5 w-36 bg-gray-200 dark:bg-gray-600 rounded mb-2" />
          <div className="h-3 w-52 bg-gray-100 dark:bg-gray-700 rounded mb-1.5" />
          <div className="h-3 w-20 bg-gray-100 dark:bg-gray-700 rounded" />

          {/* Section label */}
          <div className="mt-6 border-t border-gray-100 dark:border-gray-700 pt-5">
            <div className="h-2.5 w-32 bg-gray-100 dark:bg-gray-700 rounded mb-4" />
          </div>

          {/* Info field placeholders */}
          <div className="grid grid-cols-2 gap-3">
            <div className="h-[60px] bg-gray-100 dark:bg-gray-700 rounded-xl" />
            <div className="h-[60px] bg-gray-100 dark:bg-gray-700 rounded-xl" />
            <div className="h-[60px] bg-gray-100 dark:bg-gray-700 rounded-xl col-span-2" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

const Profile = () => {
  // ── State (unchanged) ──────────────────────────────────────────────────────
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");

  // ── Fetch profile (unchanged) ──────────────────────────────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_AUTH}/me`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
        });
        const data = await res.json();
        setUser(data.user);
      } catch (error) {
        console.error("Profile fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // ── Handle update (unchanged) ──────────────────────────────────────────────
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_AUTH}/updateUser`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify(user),
      });

      if (!res.ok) throw new Error("Update Failed");

      const data = await res.json();
      setUser(data.user);
      setEditing(false);
      setMessage("Profile updated successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error(err);
      setMessage("Failed to update profile");
    }
  };

  // ── Loading / error states ─────────────────────────────────────────────────

  if (loading)
    return (
      <AppLayout title="Profile">
        <ProfileSkeleton />
      </AppLayout>
    );

  if (!user)
    return (
      <AppLayout title="Profile">
        <div className="flex justify-center items-center py-20 text-sm text-red-500">
          Could not load profile. Please try again.
        </div>
      </AppLayout>
    );

  // ── Shared input class ─────────────────────────────────────────────────────
  const INPUT_CLS =
    "w-full h-10 px-3 " +
    "border border-gray-200 dark:border-gray-600 rounded-xl " +
    "text-sm text-gray-800 dark:text-gray-100 " +
    "bg-gray-50 dark:bg-gray-700 " +
    "focus:bg-white dark:focus:bg-gray-600 " +
    "focus:outline-none focus:ring-2 focus:ring-blue-400 " +
    "focus:border-transparent transition-all duration-150 " +
    "hover:border-gray-300 dark:hover:border-gray-500 " +
    "placeholder:text-gray-300 dark:placeholder:text-gray-500";

  const LABEL_CLS =
    "block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AppLayout title="Profile">
      <div className="max-w-2xl mx-auto">

        {/* ── Toast notification ───────────────────────────────────────────── */}
        {message && (
          <div
            className={
              `mb-4 px-4 py-3 rounded-xl text-sm font-medium border
               ${message.includes("successfully")
                 ? "bg-green-50 border-green-200 text-green-700"
                 : "bg-red-50   border-red-200   text-red-600"}`
            }
            role="alert"
          >
            {message}
          </div>
        )}

        {/* ── Profile card ─────────────────────────────────────────────────── */}
        <div
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm
                     border border-gray-200 dark:border-gray-700
                     overflow-hidden hover:shadow-md transition-all duration-200"
        >

          {/* ── Gradient banner ────────────────────────────────────────────── */}
          <div className="h-28 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600" />

          <div className="px-6 pb-6">

            {/* ── Avatar row — overlaps the banner via -mt-10 ─────────────── */}
            <div className="-mt-10 flex items-end justify-between">

              {/* Avatar with upload badge */}
              <div className="relative">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center
                             text-2xl font-bold text-white select-none
                             bg-gradient-to-br from-blue-400 to-indigo-600
                             ring-4 ring-white dark:ring-gray-800 shadow-md"
                  aria-label={`Avatar for ${user.name}`}
                >
                  {user.name?.charAt(0).toUpperCase()}
                </div>

                {/* Camera badge — UI placeholder for future avatar upload */}
                <div
                  title="Change avatar (coming soon)"
                  className="absolute bottom-0.5 right-0.5 w-6 h-6 rounded-full
                             bg-white dark:bg-gray-700
                             ring-1 ring-gray-200 dark:ring-gray-600
                             shadow-sm flex items-center justify-center
                             cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600
                             transition-colors duration-150"
                >
                  <CameraIcon />
                </div>
              </div>

              {/* Edit / Editing indicator */}
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="mb-2 inline-flex items-center gap-1.5 px-4 py-2 text-sm
                             font-medium bg-blue-600 text-white rounded-xl shadow-sm
                             hover:bg-blue-700 active:scale-95
                             transition-all duration-150 cursor-pointer"
                >
                  <PenIcon />
                  Edit Profile
                </button>
              ) : (
                <p className="mb-2 text-xs font-medium text-gray-400 tracking-wide">
                  Editing…
                </p>
              )}
            </div>

            {/* ── Identity block ───────────────────────────────────────────── */}
            <div className="mt-3">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                {user.name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{user.email}</p>

              {user.location && (
                <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                  <MapPinIcon />
                  {user.location}
                </p>
              )}
            </div>

            {/* ── Section divider ──────────────────────────────────────────── */}
            <div className="mt-6 border-t border-gray-100 dark:border-gray-700 pt-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
                Profile Information
              </p>
            </div>

            {/* ── View mode ────────────────────────────────────────────────── */}
            {!editing ? (
              <div className="grid md:grid-cols-2 gap-3">
                <InfoField label="Name"     value={user.name}            />
                <InfoField label="Email"    value={user.email}           />
                <InfoField
                  label="Location"
                  value={user.location || "—"}
                  className="md:col-span-2"
                />
              </div>

            ) : (

              /* ── Edit mode ─────────────────────────────────────────────── */
              <form onSubmit={handleUpdate} className="space-y-5">
                <div className="grid md:grid-cols-2 gap-4">

                  {/* Name */}
                  <div>
                    <label className={LABEL_CLS}>Name</label>
                    <input
                      type="text"
                      value={user.name}
                      onChange={(e) => setUser({ ...user, name: e.target.value })}
                      required
                      className={INPUT_CLS}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className={LABEL_CLS}>Email</label>
                    <input
                      type="email"
                      value={user.email}
                      onChange={(e) => setUser({ ...user, email: e.target.value })}
                      required
                      className={INPUT_CLS}
                    />
                  </div>

                  {/* Location */}
                  <div className="md:col-span-2">
                    <label className={LABEL_CLS}>Location</label>
                    <input
                      type="text"
                      value={user.location || ""}
                      onChange={(e) => setUser({ ...user, location: e.target.value })}
                      placeholder="City, Country"
                      className={INPUT_CLS}
                    />
                  </div>

                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm
                               font-medium bg-blue-600 text-white rounded-xl shadow-sm
                               hover:bg-blue-700 active:scale-95
                               transition-all duration-150 cursor-pointer"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="px-5 py-2.5 text-sm font-medium
                               text-gray-600 dark:text-gray-300
                               bg-gray-100 dark:bg-gray-700
                               rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600
                               active:scale-95 transition-all duration-150 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* ── Integrations ─────────────────────────────────────────────────── */}
        <div className="w-full max-w-lg mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3 px-1">
            Integrations
          </h2>
          {/* CalendarConnect handles its own data-fetching and OAuth redirect */}
          <CalendarConnect />
        </div>

        {/* ── Footer hint ──────────────────────────────────────────────────── */}
        <p className="mt-6 text-center text-xs text-gray-300 dark:text-gray-600">
          Your profile information is only visible to you
        </p>

      </div>
    </AppLayout>
  );
};

export default Profile;
