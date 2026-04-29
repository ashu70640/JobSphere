import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API_AUTH } from "../utils/api";

export default function Login() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`${API_AUTH}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        localStorage.setItem("userName", data.user.name);
        navigate("/");
      } else {
        alert(data.message || "Login Failed");
      }
    } catch (err) {
      alert("Server error " + err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-6 transition-colors duration-200">

      <div className="w-full max-w-md">

        {/* Logo / Branding */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
            JobSphere
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Track and manage your job applications
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-2xl p-8
                        border border-gray-100 dark:border-gray-700">

          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-6 text-center">
            Sign in to your account
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                Email
              </label>

              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                onChange={handleChange}
                required
                className="w-full border border-gray-300 dark:border-gray-600
                           bg-white dark:bg-gray-700
                           text-gray-800 dark:text-gray-100
                           placeholder:text-gray-400 dark:placeholder:text-gray-500
                           rounded-xl p-3 focus:ring-2 focus:ring-blue-400 outline-none
                           transition-colors duration-150"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">
                Password
              </label>

              <input
                type="password"
                name="password"
                placeholder="••••••••"
                onChange={handleChange}
                required
                className="w-full border border-gray-300 dark:border-gray-600
                           bg-white dark:bg-gray-700
                           text-gray-800 dark:text-gray-100
                           rounded-xl p-3 focus:ring-2 focus:ring-blue-400 outline-none
                           transition-colors duration-150"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition font-semibold"
            >
              Sign In
            </button>

          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Register
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}