import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

/**
 * LtiLaunchPage
 *
 * Handles the browser redirect that arrives at /lti/launch after the backend
 * completes LTI 1.3 JWT validation.  The backend appends two query params:
 *
 *   ?lti_token=<hex>   — Short-lived session token issued by the backend.
 *   &target=<path>     — URL-encoded path to deep-link to (e.g. /courses/123).
 *
 * This page:
 *  1. Reads lti_token and target from the URL.
 *  2. Stores the token in localStorage under the key "lti_token".
 *  3. Navigates to the target path (or /dashboard as fallback).
 *
 * Note: This route is intentionally NOT wrapped in <ProtectedRoute> because
 * the LTI token itself serves as the authentication credential for this flow.
 * The target page is responsible for exchanging or validating the LTI token.
 */
export const LtiLaunchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const ltiToken = searchParams.get('lti_token');
    const rawTarget = searchParams.get('target');
    // Only accept relative paths to prevent open-redirect attacks
    const target =
      rawTarget && rawTarget.startsWith('/') ? rawTarget : '/dashboard';

    if (ltiToken) {
      localStorage.setItem('lti_token', ltiToken);
    }

    // Always navigate — even if no token (e.g. backend error passthrough)
    navigate(target, { replace: true });
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">Redirecting...</p>
      </div>
    </div>
  );
};

export default LtiLaunchPage;
