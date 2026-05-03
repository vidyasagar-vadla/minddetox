import { Routes, Route, Navigate } from "react-router-dom";

import Landing from "./pages/Landing.jsx";
import Login from "./pages/login.jsx";
import Register from "./pages/register.jsx";
import Dashboard from "./pages/dashboard.jsx";

import DashboardLayout from "./layouts/DashboardLayout.jsx";
import RecoveryDashboard from "./pages/dashboard.jsx";
import FormWizard from "./pages/FormWizard.jsx";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/get-started" element={<FormWizard />} />

      {/* App pages (Navbar + Floating bot visible) */}
      <Route element={<DashboardLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        {/* Add future pages here */}
        {/* <Route path="/profile" element={<Profile />} /> */}
      </Route>

      {/* fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
