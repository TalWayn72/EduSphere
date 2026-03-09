import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export function OAuthCallbackPage() {
  const [params] = useSearchParams();

  useEffect(() => {
    const code = params.get('code');
    if (code && window.opener) {
      window.opener.postMessage({ type: 'GOOGLE_OAUTH_CODE', code }, window.location.origin);
    }
  }, [params]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">Connecting Google Drive...</p>
    </div>
  );
}
