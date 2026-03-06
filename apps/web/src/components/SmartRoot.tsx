import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated } from '@/lib/auth';
import { LandingPage } from '@/pages/LandingPage';

/**
 * SmartRoot — context-aware entry point.
 * Authenticated users → /dashboard (skip marketing page)
 * Unauthenticated users → LandingPage (see product before login)
 */
export function SmartRoot() {
  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }
  return <LandingPage />;
}
