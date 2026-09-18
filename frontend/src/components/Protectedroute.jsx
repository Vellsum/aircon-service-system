import React from "react";
import { Navigate, Outlet } from "react-router-dom";

// Wrap a group of routes with this to require a specific role.
// If the stored role doesn't match, redirect to /login.
// Usage in App.jsx:
//   <Route element={<ProtectedRoute role="admin" />}>
//     <Route path="/" element={<AdminDashboard />} />
//     ...more admin routes...
//   </Route>
const ProtectedRoute = ({ role }) => {
  const currentRole = localStorage.getItem("aircon_role");

  if (currentRole !== role) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
