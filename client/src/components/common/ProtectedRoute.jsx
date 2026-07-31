/**
 * ProtectedRoute
 * Wraps a group of routes that require authentication and specific roles.
 *
 * Behavior:
 *  - If not authenticated → redirect to /login (preserves intended URL)
 *  - If authenticated but wrong role → redirect to /
 *  - If authenticated and role matches → render <Outlet />
 *
 * Usage:
 *   <Route element={<ProtectedRoute allowedRoles={['passenger']} />}>
 *     <Route path="/passenger/dashboard" element={<Dashboard />} />
 *   </Route>
 */

import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function ProtectedRoute({ allowedRoles }) {
  const { isAuthenticated, user, token } = useSelector((s) => s.auth);
  const location = useLocation();

  // Still initializing (token exists but getMe hasn't resolved yet)
  // App.jsx handles this with the `initializing` state — by the time
  // ProtectedRoute renders, isAuthenticated is already resolved.

  if (!isAuthenticated || !token) {
    // Preserve the intended destination so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Authenticated but wrong role — send to home
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
