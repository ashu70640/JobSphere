import { NavLink, useNavigate } from "react-router-dom";

const NAV_ITEMS = [
  {
    to: "/all-jobs",
    label: "Jobs",
    icon: (
      <svg className="w-[18px] h-[18px] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    to: "/interviews",
    label: "Interviews",
    icon: (
      <svg className="w-[18px] h-[18px] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v14a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zM4 9h16v11H4V9zm2 2a1 1 0 000 2h8a1 1 0 100-2H6zm0 4a1 1 0 100 2h4a1 1 0 100-2H6z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    to: "/stats",
    label: "Analytics",
    icon: (
      <svg className="w-[18px] h-[18px] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 01-1.875-1.875V8.625zM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 013 19.875v-6.75z" />
      </svg>
    ),
  },
  {
    to: "/profile",
    label: "Profile",
    icon: (
      <svg className="w-[18px] h-[18px] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const userName = localStorage.getItem("userName") || "User";

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userName");
    navigate("/login");
  };

  return (
    <aside className="w-56 flex-shrink-0 h-screen flex flex-col
                      bg-gray-950 border-r border-white/5
                      transition-colors duration-200">

      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          {/* Gradient monogram */}
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0
                          bg-gradient-to-br from-blue-500 to-violet-600">
            <span className="text-[11px] font-black text-white tracking-tight">JS</span>
          </div>
          <span className="text-sm font-bold text-white tracking-tight">
            JobSphere
          </span>
        </div>
      </div>

      {/* Primary action */}
      <div className="px-4 pt-5 pb-3">
        <button
          onClick={() => navigate("/add-job")}
          className="w-full flex items-center justify-center gap-2 h-9
                     bg-blue-600 hover:bg-blue-500
                     text-white text-[13px] font-semibold rounded-lg
                     transition-colors duration-150 shadow-lg shadow-blue-900/40"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
          </svg>
          New Application
        </button>
      </div>

      {/* Section label */}
      <p className="px-5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
        Menu
      </p>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-3 h-9 rounded-lg text-[13px] font-medium
               transition-all duration-150 ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Left accent bar */}
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5
                                   bg-blue-500 rounded-full" />
                )}
                {item.icon}
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + logout */}
      <div className="px-3 py-3 border-t border-white/5 space-y-0.5">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          {/* Avatar ring */}
          <div className="w-7 h-7 rounded-full ring-2 ring-blue-500/50
                          bg-gradient-to-br from-blue-500 to-violet-600
                          flex items-center justify-center flex-shrink-0">
            <span className="text-[11px] font-bold text-white">
              {userName[0]?.toUpperCase()}
            </span>
          </div>
          <span className="text-[13px] font-medium text-gray-300 truncate">
            {userName}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 h-9 rounded-lg text-[13px]
                     text-gray-600 hover:bg-white/5 hover:text-red-400
                     transition-colors duration-150"
        >
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" d="M7.5 3.75A1.5 1.5 0 006 5.25v13.5a1.5 1.5 0 001.5 1.5h6a1.5 1.5 0 001.5-1.5V15a.75.75 0 011.5 0v3.75a3 3 0 01-3 3h-6a3 3 0 01-3-3V5.25a3 3 0 013-3h6a3 3 0 013 3V9A.75.75 0 0115 9V5.25a1.5 1.5 0 00-1.5-1.5h-6zm5.03 4.72a.75.75 0 010 1.06l-1.72 1.72h10.94a.75.75 0 010 1.5H10.81l1.72 1.72a.75.75 0 11-1.06 1.06l-3-3a.75.75 0 010-1.06l3-3a.75.75 0 011.06 0z" clipRule="evenodd" />
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}
