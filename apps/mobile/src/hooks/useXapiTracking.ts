import { useCallback } from 'react';
import { enqueueStatement } from '../services/XapiOfflineQueue';

const XAPI_VERBS: Record<string, { id: string; display: { 'en-US': string } }> = {
  progressed: { id: 'http://adlnet.gov/expapi/verbs/progressed', display: { 'en-US': 'progressed' } },
  completed:  { id: 'http://adlnet.gov/expapi/verbs/completed',  display: { 'en-US': 'completed' } },
  launched:   { id: 'http://adlnet.gov/expapi/verbs/launched',   display: { 'en-US': 'launched' } },
  attempted:  { id: 'http://adlnet.gov/expapi/verbs/attempted',  display: { 'en-US': 'attempted' } },
};

interface XapiTrackingOptions {
  tenantId: string | null;
  lrsEndpoint?: string;
  bearerToken?: string;
}

export function useXapiTracking({ tenantId, lrsEndpoint, bearerToken }: XapiTrackingOptions) {
  const flush = useCallback(async () => {
    if (!lrsEndpoint || !bearerToken || !tenantId) return;
    const { getPendingStatements, deleteStatements } = await import('../services/XapiOfflineQueue');
    const batch = getPendingStatements(50);
    if (batch.length === 0) return;
    try {
      const res = await fetch(`${lrsEndpoint}/xapi/statements`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${bearerToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(batch.map((s) => JSON.parse(s.payload))),
      });
      if (res.ok) {
        deleteStatements(batch.map((s) => s.id));
      }
    } catch {
      // Silently ignore — will retry on next flush
    }
  }, [lrsEndpoint, bearerToken, tenantId]);

  const track = useCallback(
    (verb: string, activityId: string, activityName: string) => {
      if (!tenantId) return;
      const verbDef = XAPI_VERBS[verb] ?? XAPI_VERBS['launched'];
      enqueueStatement(tenantId, {
        actor: {
          objectType: 'Agent',
          account: { homePage: 'https://edusphere.io', name: tenantId },
        },
        verb: verbDef,
        object: {
          objectType: 'Activity',
          id: `https://edusphere.io/activities/${activityId}`,
          definition: { name: { 'en-US': activityName } },
        },
        timestamp: new Date().toISOString(),
      });
    },
    [tenantId],
  );

  return { track, flush };
}
