import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ allowedRoles = [] }) {
  const { user, initializing } = useAuth();

  // =========================================================
  // DEVELOPMENT MODE
  // When running "npm run dev", allow access to all pages
  // without requiring login, token, backend or Azure SQL.
  // =========================================================
  if (import.meta.env.DEV) {
    return <Outlet />;
  }

  // =========================================================
  // NORMAL / PRODUCTION MODE
  // Keep the real authentication system unchanged.
  // =========================================================

  const token =
    localStorage.getItem('token') ||
    localStorage.getItem('aircon_token');

  // Wait for AuthContext to finish loading
  if (initializing) {
    return null;
  }

  // Not logged in
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = String(
    user.role || user.accountType || ''
  ).toLowerCase();

  const normalizedAllowed = allowedRoles.map((r) =>
    String(r).toLowerCase()
  );

  // Logged in but not authorised
  if (
    normalizedAllowed.length > 0 &&
    !normalizedAllowed.includes(userRole)
  ) {
    if (userRole === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }

    if (userRole === 'technician') {
      return <Navigate to="/technician/dashboard" replace />;
    }

    if (userRole === 'customer') {
      return <Navigate to="/customer/dashboard" replace />;
    }

    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}








/*

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ allowedRoles = [] }) {
  const { user, initializing } = useAuth();
  const token = localStorage.getItem('token') || localStorage.getItem('aircon_token');

  // Wait for AuthContext to finish loading from localStorage
  if (initializing) {
    return null; // Don't redirect yet — still loading
  }

  // If not logged in, redirect to login page
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = String(user.role || user.accountType || '').toLowerCase();
  const normalizedAllowed = allowedRoles.map((r) => String(r).toLowerCase());

  // If logged in but accessing an unauthorized route, redirect to their home
  if (normalizedAllowed.length > 0 && !normalizedAllowed.includes(userRole)) {
    if (userRole === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (userRole === 'technician') return <Navigate to="/technician/dashboard" replace />;
    if (userRole === 'customer') return <Navigate to="/customer/portal" replace />;
    return <Navigate to="/" replace />;
  }

  // Render protected child routes
  return <Outlet />;
}

*/