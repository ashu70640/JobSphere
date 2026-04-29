import ThemeToggle from "../ThemeToggle";

export default function Topbar({ title }) {
  const userName = localStorage.getItem("userName") || "User";

  return (
    <header className="h-14 flex-shrink-0 flex items-center justify-between px-6
                       bg-white dark:bg-gray-900
                       border-b border-gray-100 dark:border-white/5
                       transition-colors duration-200">

      {/* Page title */}
      <div className="flex items-center gap-2">
        <h1 className="text-[15px] font-semibold text-gray-900 dark:text-white tracking-tight">
          {title}
        </h1>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1">
        <ThemeToggle />

        {/* Divider */}
        <div className="w-px h-5 bg-gray-200 dark:bg-white/10 mx-2" />

        {/* User pill */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg
                        hover:bg-gray-100 dark:hover:bg-white/5
                        cursor-default transition-colors duration-150">
          <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0
                          bg-gradient-to-br from-blue-500 to-violet-600">
            <span className="text-[10px] font-bold text-white">
              {userName[0]?.toUpperCase()}
            </span>
          </div>
          <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300 hidden sm:block">
            {userName}
          </span>
        </div>
      </div>
    </header>
  );
}
