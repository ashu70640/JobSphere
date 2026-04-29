import { Link, useNavigate } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";

const Navbar = () => {
  const navigate = useNavigate();
  const isAuthenticated = !!localStorage.getItem("accessToken");

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    navigate("/login");
  };

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800
                    shadow-sm transition-colors duration-200">
      <div className="max-w-9xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <h1
            className="text-xl font-bold text-gray-800 dark:text-gray-100 cursor-pointer
                       transition-colors duration-200"
            onClick={() => navigate("/all-jobs")}
          >
            JobSphere
          </h1>

          {/* Navigation */}
          <div className="flex items-center gap-6 flex-wrap">

            {/* Protected Links */}
            {isAuthenticated && (
              <>
                <Link
                  to="/all-jobs"
                  className="text-gray-600 dark:text-gray-400 hover:text-blue-600
                             dark:hover:text-blue-400 transition duration-200"
                >
                  All Jobs
                </Link>

                <Link
                  to="/add-job"
                  className="text-gray-600 dark:text-gray-400 hover:text-blue-600
                             dark:hover:text-blue-400 transition duration-200"
                >
                  Add Job
                </Link>

                <Link
                  to="/interviews"
                  className="text-gray-600 dark:text-gray-400 hover:text-violet-600
                             dark:hover:text-violet-400 transition duration-200"
                >
                  Interviews
                </Link>

                <Link
                  to="/stats"
                  className="text-gray-600 dark:text-gray-400 hover:text-blue-600
                             dark:hover:text-blue-400 transition duration-200"
                >
                  Stats
                </Link>

                <Link
                  to="/profile"
                  className="text-gray-600 dark:text-gray-400 hover:text-blue-600
                             dark:hover:text-blue-400 transition duration-200"
                >
                  Profile
                </Link>
              </>
            )}

            {/* Theme toggle */}
            <ThemeToggle />

            {/* Auth Buttons */}
            {!isAuthenticated ? (
              <>
                <button
                  onClick={() => navigate("/login")}
                  className="border border-blue-600 text-blue-600 px-4 py-2 rounded-xl
                             hover:bg-blue-50 dark:hover:bg-blue-900/20
                             transition duration-200"
                >
                  Login
                </button>

                <button
                  onClick={() => navigate("/register")}
                  className="border border-blue-600 text-blue-600 px-4 py-2 rounded-xl
                             hover:bg-blue-50 dark:hover:bg-blue-900/20
                             transition duration-200"
                >
                  Register
                </button>
              </>
            ) : (
              <button
                onClick={handleLogout}
                className="border border-red-500 text-red-600 dark:text-red-400
                           dark:border-red-700 px-4 py-2 rounded-xl
                           hover:bg-red-50 dark:hover:bg-red-900/20
                           transition duration-200"
              >
                Logout
              </button>
            )}

          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
