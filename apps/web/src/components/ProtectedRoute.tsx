import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated, getCurrentUser } from '@/lib/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export const POST_LOGIN_REDIRECT_KEY = 'post_login_redirect';

export function ProtectedRoute({
  children,
  requiredRoles,
}: ProtectedRouteProps) {
  if (!isAuthenticated()) {
    const destination = window.location.pathname + window.location.search;
    if (destination && destination !== '/login') {
      window.sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, destination);
    }
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles && requiredRoles.length > 0) {
    const user = getCurrentUser();
    if (!user || !requiredRoles.includes(user.role)) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
