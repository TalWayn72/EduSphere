const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'OPEN_ISSUES.md');
const content = fs.readFileSync(filePath, 'utf8');

const bug038 = `## \u2705 BUG-038 \u2014 Lesson Page Unauthorized [GraphQL] Error (03 Mar 2026)

**Status:** \u2705 Fixed | **Severity:** \ud83d\udd34 Critical (recurring) | **Date:** 03 Mar 2026

### Problem

Navigating to lesson pages showed raw error string in the UI. AuthMiddleware threw on JWT failure.

- UI: raw \`Unauthorized [GraphQL]\` string on lesson detail, pipeline, results pages
- Root causes:
  1. No global auth error handler in urql-client.ts
  2. LessonDetailPage showed raw error without session-expired UI or re-login button
  3. LessonPipelinePage / LessonResultsPage silently ignored query errors (no logging)
  4. AuthMiddleware.validateRequest() threw on JWT validation failure (blocked public resolvers)
  5. No x-tenant-id header fallback in middleware (BUG-037 regression vector)

### Fix

| File | Change |
| ---- | ------ |
| \`apps/web/src/lib/urql-client.ts\` | Added global \`authErrorExchange\` detecting Unauthorized/UNAUTHENTICATED, calls \`logout()\` |
| \`apps/web/src/pages/LessonDetailPage.tsx\` | \`isAuthError()\` check: Unauthorized shows session-expired UI + re-login button |
| \`apps/web/src/pages/LessonPipelinePage.tsx\` | Destructure \`error\` from useQuery + console.error logging |
| \`apps/web/src/pages/LessonResultsPage.tsx\` | Destructure \`error\` from useQuery + console.error logging |
| \`packages/auth/src/middleware.ts\` | Catch block no longer throws; added x-tenant-id header fallback for tenantId |

### Tests Added (27 new tests)

- \`apps/web/src/lib/urql-client.test.ts\` (NEW, 14 tests): \`hasAuthError\` + redirect logic for all error patterns/codes
- \`apps/web/src/pages/LessonDetailPage.test.tsx\` (+4): session-expired UI, re-login calls login(), "Authentication required", generic error path
- \`packages/auth/src/middleware.test.ts\` (NEW, 13 tests): no-throw on JWT fail, valid JWT sets authContext, dev bypass, x-tenant-id fallback

### Verification

- \`urql-client.test.ts\`: 14/14 \u2713
- \`LessonDetailPage.test.tsx\`: 16/16 \u2713
- \`middleware.test.ts\`: 13/13 \u2713

---

`;

const updated = content.replace('## \u2705 BUG-037 \u2014 SourceManager', bug038 + '## \u2705 BUG-037 \u2014 SourceManager');
fs.writeFileSync(filePath, updated, 'utf8');
console.log('BUG-038 section inserted.');
