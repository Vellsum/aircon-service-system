import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ allowedRoles }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Convert current user role and allowed roles to lowercase for clean comparison
  const currentRole = (user.role || user.accountType || "").toLowerCase();
  const normalizedAllowedRoles = allowedRoles.map((r) => r.toLowerCase());

  if (allowedRoles && !normalizedAllowedRoles.includes(currentRole)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}