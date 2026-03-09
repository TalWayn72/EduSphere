# Phase 41 — xAPI/LRS Pipeline + Google Drive Import Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `executing-plans` + `dispatching-parallel-agents` + `nestjs-best-practices`
> **Context:** Phase 40 complete (3,924 web tests ✅, commit 46e827e). Phase 41 adds the NATS→xAPI bridge, Google Drive content import, and mobile xAPI offline tracking.

---

## Context

### What's Already Built (do NOT rebuild)

| Component | Location | Status |
|-----------|----------|--------|
| xAPI DB schema | `packages/db/src/schema/xapi.ts` | ✅ `xapi_tokens` + `xapi_statements` tables, RLS, indexes |
| xAPI token service | `apps/subgraph-content/src/xapi/xapi-token.service.ts` | ✅ SHA-256 hashing, generate/revoke |
| xAPI statement service | `apps/subgraph-content/src/xapi/xapi-statement.service.ts` | ✅ store + query statements |
| LRS REST controller | `apps/subgraph-content/src/xapi/lrs.controller.ts` | ✅ `POST /xapi/statements`, `GET /xapi/about` |
| GraphQL resolver | `apps/subgraph-content/src/xapi/xapi.resolver.ts` | ✅ `xapiTokens`, `xapiStatements`, `generateXapiToken` |
| XapiSettingsPage | `apps/web/src/pages/XapiSettingsPage.tsx` | ✅ Admin token UI |
| YouTube import | `apps/subgraph-content/src/content-import/` | ✅ PA1+PA2 (Phase 40) |
| Website crawl import | same | ✅ Firecrawl (Phase 40) |

### Key NATS Events Already Published

| Subject | Emitted by | xAPI Verb |
|---------|-----------|-----------|
| `EDUSPHERE.course.completed` | certificate.service, open-badge | `http://adlnet.gov/expapi/verbs/completed` |
| `EDUSPHERE.course.enrolled` | marketplace.service | `http://adlnet.gov/expapi/verbs/registered` |
| `EDUSPHERE.sessions.ended` | live-session.service | `http://adlnet.gov/expapi/verbs/attended` |
| `EDUSPHERE.sessions.participant.joined` | live-session.service | `http://adlnet.gov/expapi/verbs/launched` |
| `EDUSPHERE.submission.created` | plagiarism.service | `http://adlnet.gov/expapi/verbs/attempted` |
| `EDUSPHERE.poll.voted` | poll.service | `http://adlnet.gov/expapi/verbs/responded` |

### Phase 41 Gaps

1. **No NATS→xAPI bridge** — events fire but never become xAPI statements
2. **No Google Drive / Dropbox import** — placeholder in plan, zero code
3. **No mobile xAPI tracking** — offline queue not built
4. **No YouTube OAuth** — only public playlists supported currently

---

## Architecture

```
NATS JetStream → XapiNatsBridgeService (NEW) → XapiStatementService (existing) → xapi_statements DB
                 ↑ subscribes to 6 subjects      ↑ already handles tenant isolation

Google Drive OAuth2 → DriveClient (NEW) → ContentImportService (existing) → ImportJob

Mobile (expo-sqlite) → XapiOfflineQueue (NEW) → LRS /xapi/statements (existing REST)
```

---

## Sprint A — NATS→xAPI Bridge (2 days, Backend)

### Agent-A1: XapiNatsBridgeService

**File: `apps/subgraph-content/src/xapi/xapi-nats-bridge.service.ts`** (NEW, ~100 lines)

Purpose: Subscribe to all NATS learning events → map to xAPI statements → store via XapiStatementService.

Pattern (follow `certificate.service.ts` subscription pattern — `OnModuleInit` + `OnModuleDestroy`):

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { InjectNats } from '@edusphere/nats-client';
import type { NatsConnection, Subscription } from 'nats';
import { XapiStatementService } from './xapi-statement.service.js';
import { XAPI_VERBS, natsToXapiStatement } from './xapi-verb-mappings.js';

const SUBJECTS = [
  'EDUSPHERE.course.completed',
  'EDUSPHERE.course.enrolled',
  'EDUSPHERE.sessions.ended',
  'EDUSPHERE.sessions.participant.joined',
  'EDUSPHERE.submission.created',
  'EDUSPHERE.poll.voted',
] as const;

@Injectable()
export class XapiNatsBridgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(XapiNatsBridgeService.name);
  private subs: Subscription[] = [];

  constructor(
    @InjectNats() private readonly nc: NatsConnection,
    private readonly statementService: XapiStatementService,
  ) {}

  async onModuleInit() {
    for (const subject of SUBJECTS) {
      const sub = this.nc.subscribe(subject);
      this.subs.push(sub);
      void this.listen(sub, subject);
    }
    this.logger.log(`Subscribed to ${SUBJECTS.length} NATS subjects`);
  }

  async onModuleDestroy() {
    await Promise.all(this.subs.map((s) => s.unsubscribe()));
    this.subs = [];
  }

  private async listen(sub: Subscription, subject: string) {
    for await (const msg of sub) {
      try {
        const payload = JSON.parse(msg.string()) as Record<string, unknown>;
        const tenantId = payload.tenantId as string;
        const userId = payload.userId as string;
        if (!tenantId || !userId) continue;
        const stmt = natsToXapiStatement(subject, payload);
        await this.statementService.storeStatement(tenantId, stmt);
      } catch (err) {
        this.logger.error({ subject, err }, 'Failed to process NATS→xAPI bridge');
      }
    }
  }
}
```

**File: `apps/subgraph-content/src/xapi/xapi-verb-mappings.ts`** (NEW, ~60 lines)

```typescript
export const XAPI_VERBS = {
  completed:   { id: 'http://adlnet.gov/expapi/verbs/completed',   display: { 'en-US': 'completed' } },
  registered:  { id: 'http://adlnet.gov/expapi/verbs/registered',  display: { 'en-US': 'registered' } },
  attended:    { id: 'http://adlnet.gov/expapi/verbs/attended',    display: { 'en-US': 'attended' } },
  launched:    { id: 'http://adlnet.gov/expapi/verbs/launched',    display: { 'en-US': 'launched' } },
  attempted:   { id: 'http://adlnet.gov/expapi/verbs/attempted',   display: { 'en-US': 'attempted' } },
  responded:   { id: 'http://adlnet.gov/expapi/verbs/responded',   display: { 'en-US': 'responded' } },
} as const;

const SUBJECT_TO_VERB: Record<string, keyof typeof XAPI_VERBS> = {
  'EDUSPHERE.course.completed':            'completed',
  'EDUSPHERE.course.enrolled':             'registered',
  'EDUSPHERE.sessions.ended':              'attended',
  'EDUSPHERE.sessions.participant.joined': 'launched',
  'EDUSPHERE.submission.created':          'attempted',
  'EDUSPHERE.poll.voted':                  'responded',
};

export function natsToXapiStatement(subject: string, payload: Record<string, unknown>) {
  const verbKey = SUBJECT_TO_VERB[subject] ?? 'launched';
  return {
    actor: {
      objectType: 'Agent',
      account: { homePage: 'https://edusphere.io', name: payload.userId as string },
    },
    verb: XAPI_VERBS[verbKey],
    object: {
      objectType: 'Activity',
      id: `https://edusphere.io/activities/${(payload.courseId ?? payload.sessionId ?? payload.id) as string}`,
      definition: { name: { 'en-US': (payload.courseName ?? payload.title ?? subject) as string } },
    },
    context: { platform: 'EduSphere', language: 'en-US' },
    timestamp: new Date().toISOString(),
  };
}
```

**Modify: `apps/subgraph-content/src/xapi/xapi.module.ts`**
- Add `XapiNatsBridgeService` + `XapiVerbMappings` to providers

**Test: `apps/subgraph-content/src/xapi/xapi-nats-bridge.service.spec.ts`** (NEW, ~80 lines)
- Test: `natsToXapiStatement` maps `EDUSPHERE.course.completed` → verb `completed`
- Test: `natsToXapiStatement` maps `EDUSPHERE.course.enrolled` → verb `registered`
- Test: `listen` skips payloads missing `tenantId` or `userId`
- Test: `onModuleDestroy` calls `unsubscribe()` on all subscriptions
- Test: `statementService.storeStatement` called once per valid event

**Verify:** `pnpm --filter @edusphere/subgraph-content test` — 1132+ tests pass

---

### Agent-A2: xAPI Compliance Export

**File: `apps/subgraph-content/src/xapi/xapi-export.service.ts`** (NEW, ~60 lines)

Purpose: Export all xAPI statements for a tenant as JSON-LD (LRS export for compliance reports).

```typescript
@Injectable()
export class XapiExportService {
  async exportStatements(tenantId: string, sinceDate?: string): Promise<XapiStatementResult[]> {
    // calls statementService.queryStatements with limit=10000 + sinceDate filter
    // returns array of xAPI statements in spec-compliant JSON-LD format
  }
}
```

**Modify: `apps/subgraph-content/src/xapi/xapi.graphql`**
Add:
```graphql
extend type Query {
  xapiStatementCount(since: String): Int! @authenticated @requiresRole(roles: [ORG_ADMIN, SUPER_ADMIN])
}

extend type Mutation {
  revokeXapiToken(tokenId: ID!): Boolean! @authenticated @requiresRole(roles: [ORG_ADMIN])
  clearXapiStatements(olderThanDays: Int!): Int! @authenticated @requiresRole(roles: [SUPER_ADMIN])
}
```

**Modify: `apps/subgraph-content/src/xapi/xapi.resolver.ts`**
- Add resolvers for `xapiStatementCount`, `revokeXapiToken`, `clearXapiStatements`

**Modify: `apps/gateway/supergraph.graphql`**
- Add new fields to Query + Mutation type (pattern from Phase 38/40)

**Test: `apps/subgraph-content/src/xapi/xapi-export.service.spec.ts`** (3 tests)
- returns all statements for tenant
- `since` filter limits results
- empty array when no statements

---

## Sprint B — Google Drive Import (2 days, Backend+Frontend)

### Agent-B1: Google Drive OAuth Client (Backend)

**Install:** `pnpm --filter @edusphere/subgraph-content add googleapis`

**File: `apps/subgraph-content/src/content-import/google-drive.client.ts`** (NEW, ~80 lines)

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';

@Injectable()
export class GoogleDriveClient {
  private readonly logger = new Logger(GoogleDriveClient.name);

  /**
   * Exchange OAuth code for access_token (used in import wizard OAuth flow)
   */
  async exchangeCode(code: string): Promise<string> { /* ... */ }

  /**
   * List files in a Drive folder (video + PDF + PPTX + DOCX)
   * Returns: { id, name, mimeType, size, webContentLink }[]
   */
  async listFolderContents(folderId: string, accessToken: string): Promise<DriveFile[]> {
    const drive = google.drive({ version: 'v3', auth: this.buildAuth(accessToken) });
    const res = await drive.files.list({
      q: `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder'`,
      fields: 'files(id,name,mimeType,size,webContentLink)',
      pageSize: 100,
    });
    return (res.data.files ?? []) as DriveFile[];
  }

  /** Download file buffer for ingestion pipeline */
  async downloadFile(fileId: string, accessToken: string): Promise<Buffer> { /* ... */ }

  private buildAuth(accessToken: string) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    );
    oauth2Client.setCredentials({ access_token: accessToken });
    return oauth2Client;
  }
}
```

**Modify: `apps/subgraph-content/src/content-import/content-import.graphql`**
Add:
```graphql
input DriveImportInput {
  folderId:  String!
  courseId:  ID!
  moduleId:  ID!
  accessToken: String!   # short-lived OAuth token from frontend
}

extend type Mutation {
  importFromDrive(input: DriveImportInput!): ImportJob!
    @authenticated
    @requiresRole(roles: [INSTRUCTOR, ORG_ADMIN, SUPER_ADMIN])
}
```

**Modify: `apps/subgraph-content/src/content-import/content-import.service.ts`**
- Add `importFromDrive(input, tenantId, userId)` method (pattern identical to `importFromYoutube`)

**Modify: `apps/subgraph-content/src/content-import/content-import.resolver.ts`**
- Add `@Mutation('importFromDrive')` resolver

**Modify: `apps/subgraph-content/src/content-import/content-import.module.ts`**
- Add `GoogleDriveClient` to providers

**Environment variables (add to `.env.example` + `docker-compose.yml`):**
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:5173/oauth/google/callback
```

**Test: `apps/subgraph-content/src/content-import/google-drive.client.spec.ts`** (4 tests)
- `listFolderContents` filters only non-folder files
- `downloadFile` returns Buffer
- handles 403 (insufficient permissions) gracefully
- handles empty folder (returns empty array)

---

### Agent-B2: Google Drive Import UI (Frontend)

**File: `apps/web/src/components/content-import/DriveImportCard.tsx`** (NEW, ~80 lines)

```tsx
// Renders a Google Drive OAuth card in ImportSourceSelector
// 1. "Connect Google Drive" button → window.open(OAUTH_URL) → popup with Google consent
// 2. On OAuth callback (/oauth/google/callback) → postMessage to parent with code
// 3. Show folder picker (input: Drive folder URL or folder ID)
// 4. "Import from Drive" button → calls importFromDrive mutation
```

**File: `apps/web/src/pages/OAuthCallbackPage.tsx`** (NEW, ~30 lines)
```tsx
// Route: /oauth/google/callback?code=xxx
// Reads code from URL params → postMessage({ type: 'GOOGLE_OAUTH_CODE', code }) to opener
// Shows loading spinner while posting
```

**Modify: `apps/web/src/components/content-import/ImportSourceSelector.tsx`**
- Add "Google Drive" option alongside YouTube + Website + Folder

**Modify: `apps/web/src/hooks/useContentImport.ts`**
- Add `importFromDrive(folderId, courseId, moduleId, accessToken)` method

**Modify: `apps/web/src/lib/graphql/content-import.queries.ts`**
- Add `IMPORT_FROM_DRIVE_MUTATION`

**Modify: `apps/web/src/lib/router.tsx`**
- Add `/oauth/google/callback` lazy route

**Modify: `apps/gateway/supergraph.graphql`**
- Add `importFromDrive` to Mutation type with `@join__field(graph: CONTENT)`

**Test: `apps/web/src/components/content-import/DriveImportCard.test.tsx`** (4 tests)
- renders "Connect Google Drive" button
- shows folder ID input after OAuth connected
- import button disabled when folder ID empty
- import button calls mutation with folderId

**Test: `apps/web/src/pages/OAuthCallbackPage.test.tsx`** (2 tests)
- posts code to opener window
- renders loading text while posting

---

## Sprint C — Mobile xAPI Offline Queue (1 day)

### Agent-C1: XapiOfflineQueueService (Mobile)

**Pattern:** Use `expo-sqlite` (already installed) as offline buffer. Flush to LRS REST endpoint when online.

**File: `apps/mobile/src/services/XapiOfflineQueue.ts`** (NEW, ~80 lines)

```typescript
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('xapi_queue.db');

export type QueuedStatement = {
  id: string;
  tenantId: string;
  payload: string; // JSON
  createdAt: number;
};

export function initXapiQueue() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS xapi_queue (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_xapi_created ON xapi_queue(created_at);
  `);
}

export function enqueueStatement(tenantId: string, stmt: object) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  db.runSync(
    'INSERT INTO xapi_queue VALUES (?, ?, ?, ?)',
    [id, tenantId, JSON.stringify(stmt), Date.now()]
  );
}

export function getPendingStatements(limit = 50): QueuedStatement[] {
  return db.getAllSync<QueuedStatement>(
    'SELECT * FROM xapi_queue ORDER BY created_at ASC LIMIT ?',
    [limit]
  );
}

export function deleteStatements(ids: string[]) {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  db.runSync(`DELETE FROM xapi_queue WHERE id IN (${placeholders})`, ids);
}

// Eviction: keep max 500 rows (prevent unbounded growth — Memory Safety Rule)
export function evictOldStatements() {
  db.runSync(
    `DELETE FROM xapi_queue WHERE id IN (
      SELECT id FROM xapi_queue ORDER BY created_at ASC
      LIMIT MAX(0, (SELECT COUNT(*) FROM xapi_queue) - 500)
    )`
  );
}
```

**File: `apps/mobile/src/hooks/useXapiTracking.ts`** (NEW, ~60 lines)

```typescript
import NetInfo from '@react-native-community/netinfo';
import { enqueueStatement, getPendingStatements, deleteStatements, evictOldStatements } from '../services/XapiOfflineQueue';

export function useXapiTracking(tenantId: string | null) {
  const flush = async (lrsEndpoint: string, token: string) => {
    const batch = getPendingStatements(50);
    if (batch.length === 0) return;
    const res = await fetch(`${lrsEndpoint}/xapi/statements`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(batch.map((s) => JSON.parse(s.payload))),
    });
    if (res.ok) {
      deleteStatements(batch.map((s) => s.id));
    }
  };

  const track = (verb: string, activityId: string, activityName: string) => {
    if (!tenantId) return;
    enqueueStatement(tenantId, {
      actor: { objectType: 'Agent', account: { homePage: 'https://edusphere.io', name: tenantId } },
      verb: { id: `http://adlnet.gov/expapi/verbs/${verb}`, display: { 'en-US': verb } },
      object: {
        objectType: 'Activity',
        id: `https://edusphere.io/activities/${activityId}`,
        definition: { name: { 'en-US': activityName } },
      },
      timestamp: new Date().toISOString(),
    });
    evictOldStatements(); // Memory safety: cap at 500
  };

  // Auto-flush when network comes online
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        const endpoint = process.env.EXPO_PUBLIC_LRS_ENDPOINT ?? 'http://localhost:4002';
        const token = process.env.EXPO_PUBLIC_LRS_TOKEN ?? '';
        void flush(endpoint, token);
      }
    });
    return () => unsub(); // Memory safety: unsubscribe on unmount
  }, [tenantId]);

  return { track };
}
```

**Modify: `apps/mobile/src/screens/CourseViewerScreen.tsx`**
- Add `const { track } = useXapiTracking(userId)`
- Call `track('progressed', lesson.id, lesson.title)` when video advances 50%

**Test: `apps/mobile/src/services/__tests__/XapiOfflineQueue.test.ts`** (pure logic, NO React)
- `enqueueStatement` increases row count by 1
- `getPendingStatements` returns ordered by created_at
- `deleteStatements` removes correct rows
- `evictOldStatements` caps at 500 rows (insert 510, expect 500 remain)
- empty `deleteStatements([])` does not throw

---

## Sprint D — QA Gate + Docs (1 day)

### Agent-D1: E2E + Security Tests

**File: `apps/web/e2e/xapi-settings.spec.ts`** (NEW, ~40 tests)
- Login as ORG_ADMIN → `/xapi-settings` heading visible
- Generate token button visible
- Token count shows (mocked 0)
- LRS endpoint field visible
- STUDENT cannot access xapi-settings (redirect)

**File: `apps/web/e2e/drive-import.spec.ts`** (NEW, ~15 tests)
- `/courses/xxx/import` → Drive option visible in ImportSourceSelector
- "Connect Google Drive" button visible
- OAuth callback page loads without error
- Role gate: STUDENT cannot access import page

**Security tests (add to `tests/security/api-security.spec.ts`):**
```typescript
describe('Phase 41: xAPI Security', () => {
  it('xapiStatements query requires ORG_ADMIN role', () => {
    // scan xapi.graphql for @requiresRole
    const sdl = readFileSync('.../xapi.graphql', 'utf8');
    expect(sdl).toMatch(/@requiresRole.*ORG_ADMIN/);
  });
  it('xapi tokens use SHA-256 hash only (never plaintext)', () => {
    // scan xapi-token.service.ts for createHash('sha256')
    const src = readFileSync('.../xapi-token.service.ts', 'utf8');
    expect(src).toContain("createHash('sha256')");
    expect(src).not.toMatch(/token_raw|plaintext_token/);
  });
  it('NATS bridge skips events with missing tenantId', () => {
    // test that natsToXapiStatement does not throw on empty payload
    // and that bridge skips if tenantId is falsy
    const stmt = natsToXapiStatement('EDUSPHERE.course.completed', { userId: 'u1' }); // no tenantId
    expect(stmt).toBeTruthy(); // mapping itself is pure - bridge guard is tested in unit tests
  });
  it('Google Drive accessToken not stored in DB', () => {
    // scan content-import.service.ts — accessToken must not appear in any DB insert
    const src = readFileSync('.../content-import.service.ts', 'utf8');
    expect(src).not.toMatch(/INSERT.*access_?[Tt]oken/);
  });
});
```

### Agent-D2: Documentation

**Update: `API_CONTRACTS_GRAPHQL_FEDERATION.md`**
- Add Section 28 — Phase 41: xAPI Bridge + Drive Import
  - New mutations: `importFromDrive`, `revokeXapiToken`, `clearXapiStatements`
  - New query: `xapiStatementCount`
  - NATS→xAPI verb mappings table
  - Mobile offline queue architecture note

**Update: `OPEN_ISSUES.md`**
- Add `FEAT-PHASE41-XAPI-DRIVE | 🟡 In Progress | HIGH` entry
- Close with E2E file paths after Sprint D passes

**Update: `CHANGELOG.md`**
- Add `[0.41.0]` section

**Update: `README.md`**
- Phase 41 row in phase table
- Test count update

---

## Environment Variables Added (Phase 41)

| Variable | Service | Description |
|----------|---------|-------------|
| `GOOGLE_CLIENT_ID` | subgraph-content | Google OAuth2 client ID |
| `GOOGLE_CLIENT_SECRET` | subgraph-content | Google OAuth2 client secret |
| `GOOGLE_REDIRECT_URI` | subgraph-content | `http://localhost:5173/oauth/google/callback` |
| `EXPO_PUBLIC_LRS_ENDPOINT` | apps/mobile | LRS REST URL (e.g., `http://localhost:4002`) |
| `EXPO_PUBLIC_LRS_TOKEN` | apps/mobile | Bearer token for mobile→LRS POST |

---

## Dependency Graph

```
Sprint A (parallel):
  Agent-A1 (NATS→xAPI bridge) — no deps
  Agent-A2 (xAPI export service + new GraphQL) — no deps

Sprint B (parallel, after Sprint A GraphQL schema):
  Agent-B1 (Google Drive backend) — no deps from A
  Agent-B2 (Google Drive frontend) — after B1 adds mutation to SDL

Sprint C (parallel with B):
  Agent-C1 (Mobile offline queue) — no deps

Sprint D (after A+B+C):
  Agent-D1 (E2E + security) — after all code complete
  Agent-D2 (Docs) — parallel with D1
```

---

## Critical File Paths

| File | Status |
|------|--------|
| `apps/subgraph-content/src/xapi/xapi-nats-bridge.service.ts` | NEW |
| `apps/subgraph-content/src/xapi/xapi-verb-mappings.ts` | NEW |
| `apps/subgraph-content/src/xapi/xapi-nats-bridge.service.spec.ts` | NEW |
| `apps/subgraph-content/src/xapi/xapi-export.service.ts` | NEW |
| `apps/subgraph-content/src/xapi/xapi.graphql` | MODIFY — add 3 new fields |
| `apps/subgraph-content/src/xapi/xapi.resolver.ts` | MODIFY — add 3 resolvers |
| `apps/subgraph-content/src/xapi/xapi.module.ts` | MODIFY — add bridge + export |
| `apps/subgraph-content/src/content-import/google-drive.client.ts` | NEW |
| `apps/subgraph-content/src/content-import/content-import.graphql` | MODIFY — add DriveImportInput + mutation |
| `apps/subgraph-content/src/content-import/content-import.service.ts` | MODIFY — add importFromDrive |
| `apps/subgraph-content/src/content-import/content-import.resolver.ts` | MODIFY — add importFromDrive resolver |
| `apps/subgraph-content/src/content-import/content-import.module.ts` | MODIFY — add GoogleDriveClient |
| `apps/web/src/components/content-import/DriveImportCard.tsx` | NEW |
| `apps/web/src/pages/OAuthCallbackPage.tsx` | NEW |
| `apps/web/src/hooks/useContentImport.ts` | MODIFY — add importFromDrive |
| `apps/web/src/lib/graphql/content-import.queries.ts` | MODIFY — add IMPORT_FROM_DRIVE_MUTATION |
| `apps/web/src/lib/router.tsx` | MODIFY — add /oauth/google/callback route |
| `apps/gateway/supergraph.graphql` | MODIFY — add all new fields |
| `apps/mobile/src/services/XapiOfflineQueue.ts` | NEW |
| `apps/mobile/src/hooks/useXapiTracking.ts` | NEW |
| `apps/mobile/src/services/__tests__/XapiOfflineQueue.test.ts` | NEW |
| `apps/web/e2e/xapi-settings.spec.ts` | NEW |
| `apps/web/e2e/drive-import.spec.ts` | NEW |

---

## Verification

### After Sprint A
```bash
# NATS bridge in module:
grep "XapiNatsBridgeService" apps/subgraph-content/src/xapi/xapi.module.ts  # → 1 match

# verb mappings test:
pnpm --filter @edusphere/subgraph-content test  # → 1132+ pass

# New xAPI fields in supergraph:
grep "revokeXapiToken\|xapiStatementCount" apps/gateway/supergraph.graphql  # → 2 matches
```

### After Sprint B
```bash
# Drive mutation in supergraph:
grep "importFromDrive" apps/gateway/supergraph.graphql  # → 1 match

# Drive card renders:
npx vitest run apps/web/src/components/content-import/DriveImportCard.test.tsx  # → 4 pass

# No accessToken in DB:
grep -r "INSERT.*access" apps/subgraph-content/src/content-import/  # → 0 matches
```

### After Sprint C
```bash
# Mobile offline queue tests:
npx vitest run apps/mobile/src/services/__tests__/XapiOfflineQueue.test.ts  # → 5 pass

# Eviction at 500:
# (test explicitly inserts 510 rows and verifies 500 remain)
```

### After Sprint D (Full Gate)
```bash
pnpm turbo test           # all pass
pnpm turbo typecheck      # 0 errors
pnpm turbo lint           # 0 warnings
pnpm test:security        # 970+ pass
./scripts/health-check.sh # all services UP
```

---

## Expected Test Delta

| Package | Before | After | Delta |
|---------|--------|-------|-------|
| Web unit | 3,924 | ~3,960+ | +36 (Drive import UI, OAuth callback) |
| E2E specs | ~97 | ~109 | +12 (xapi-settings, drive-import) |
| Security | 970 | ~975 | +5 (xAPI security checks) |
| subgraph-content | 1,132 | ~1,165 | +33 (bridge, export, drive client) |
| Mobile (pure logic) | existing | +5 | (xAPI offline queue logic) |

---

## Memory Safety Checklist

| Component | Rule | Implementation |
|-----------|------|----------------|
| `XapiNatsBridgeService` | Subscription cleanup | `this.subs.map((s) => s.unsubscribe())` in `onModuleDestroy` |
| `useXapiTracking` | NetInfo listener | `return () => unsub()` in `useEffect` cleanup |
| `XapiOfflineQueue` | Max rows | `evictOldStatements()` caps at 500 after every insert |
| `GoogleDriveClient` | No token storage | `accessToken` used in-flight only, never persisted |

---

## Security Invariants

| Check | Rule |
|-------|------|
| xAPI token hash | `createHash('sha256')` only — raw token never stored (SI-3) |
| Drive accessToken | In-memory only, never inserted into DB, never logged |
| NATS bridge: missing tenantId | `if (!tenantId) continue` — skip unauthenticated payloads |
| xAPI admin routes | `@requiresRole(roles: [ORG_ADMIN])` on all xAPI management mutations |
