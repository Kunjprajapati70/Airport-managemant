import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getDashboardPath } from '../../utils/helpers';

/**
 * Redirects an authenticated user to their role's default landing page.
 * Used for index routes like /staff or /manager.
 */
export default function RoleIndexRedirect() {
  const { user } = useSelector((s) => s.auth);
  return <Navigate to={getDashboardPath(user?.role)} replace />;
}

