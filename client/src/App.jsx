import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import EditJob from "./pages/EditJob";
import Stats from "./pages/Stats";
import AddJob from "./pages/AddJob";
import Profile from "./pages/Profile";
import JobDetails from "./pages/JobDetails";
import Interviews from "./pages/Interviews";
import ProtectedRoute from "./components/protectedRoute";
import AdminLayout  from "./pages/Admin/AdminLayout";
import AdminLogin   from "./pages/Admin/AdminLogin";
import AdminDashboard from "./pages/Admin/Dashboard";
import AdminUsers   from "./pages/Admin/Users";
import AdminJobs    from "./pages/Admin/Jobs";
import AiMonitor    from "./pages/Admin/AiMonitor";

function App() {
  return (
    <>
      <Routes>
          <Route path="/"            element={<ProtectedRoute><Dashboard  /></ProtectedRoute>} />
          <Route path="/all-jobs"    element={<ProtectedRoute><Dashboard  /></ProtectedRoute>} />
          <Route path="/interviews"  element={<ProtectedRoute><Interviews /></ProtectedRoute>} />
          <Route path="/login"       element={<Login />} />
          <Route path="/register"    element={<Register />} />
          <Route path="/edit/:id"    element={<ProtectedRoute><EditJob    /></ProtectedRoute>} />
          <Route path="/stats"       element={<ProtectedRoute><Stats      /></ProtectedRoute>} />
          <Route path="/add-job"     element={<ProtectedRoute><AddJob     /></ProtectedRoute>} />
          <Route path="/profile"     element={<ProtectedRoute><Profile    /></ProtectedRoute>} />
          <Route path="/jobs/:id"    element={<ProtectedRoute><JobDetails /></ProtectedRoute>} />

          {/* ── Admin section (completely separate from main app) ── */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index                element={<AdminDashboard />} />
            <Route path="users"         element={<AdminUsers />} />
            <Route path="jobs"          element={<AdminJobs />} />
            <Route path="ai"            element={<AiMonitor />} />
          </Route>
      </Routes>
    </>
  );
}

export default App;
