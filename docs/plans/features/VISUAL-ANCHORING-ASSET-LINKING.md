# Visual Anchoring & Asset Linking System — Implementation Plan
**PRD v1.6 | EduSphere Phase 29**

---

## Context

The PRD defines a system that lets instructors bind images/drawings to specific text passages in a study document. As a student scrolls, the Sidebar auto-displays whichever image is anchored to the text closest to the viewport center — smoothly, at 60fps, with zero latency (all logic client-side). The entire solution must be 100% open-source, RTL-aware, Offline-First, and mobile-ready.

This plan covers all 9 implementation layers (DB → Backend → Instructor UI → Student UI → Offline → Search → Versioning → Performance → Tests) with full parallel-agent scheduling.

---

## Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Subgraph | Extend **Content subgraph (4002)** | Tight coupling to media_assets + MinIO; avoids new Docker service |
| ClamAV mode | **Inline scan** via `node-clamscan` → `clamd` socket | PRD demands "immediate rejection"; async would hide infected files behind delay |
| Fuzzy hash | **simhash** (64-bit, custom impl) | Fast, no external service, works on Hebrew text |
| Anchor detection | **requestAnimationFrame** + `getBoundingClientRect()` | IntersectionObserver only fires at entry/exit, not suitable for centermost calc |
| Sidebar slot | New **left panel** (280px) in UnifiedLearningPage + RichDocumentPage | PRD: "קבוע בצד שמאל (Desktop)" |
| SVG rendering | **inline SVG** + `DOMPurify.sanitize()` | Preserves vector quality; DOMPurify removes XSS vectors |
| Cross-fade | **CSS opacity transition** (not JS) | GPU-accelerated → guaranteed 60fps |
| Offline anchors | **`idb`** (IndexedDB wrapper) + localStorage fallback | Lightweight, no heavy SW needed beyond existing SW |
| Mobile | **`@gorhom/bottom-sheet`** (Expo-compatible) | De-facto standard for React Native bottom sheets |
| Asset mapping | **one-to-one** for MVP: anchor has `visual_asset_id` FK | Matches PRD spec; many-to-many not needed in MVP |

---

## New Dependencies

### Backend (apps/subgraph-content)
```
node-clamscan   — ClamAV clamd socket client
sharp           — WebP conversion + image resize
file-type       — Server-side MIME magic byte verification
```

### Frontend Web (apps/web)
```
idb             — IndexedDB typed wrapper (Feathers/Jake Archibald)
dompurify       — SVG/HTML sanitization before render
```

### Frontend Mobile (apps/mobile)
```
@gorhom/bottom-sheet   — Expo-compatible bottom sheet
```

---

## New Files to Create

### Database
```
packages/db/src/schema/visual-anchoring.ts          — 4 new table defs
packages/db/src/migrations/0016_visual_anchoring.sql — DDL + RLS + indexes
```

### Backend (Content Subgraph)
```
apps/subgraph-content/src/clamav/
  clamav.service.ts           — ClamAV scanning service
  clamav.service.spec.ts

apps/subgraph-content/src/image-optimizer/
  image-optimizer.service.ts  — sharp: WebP conversion, resize, ZIP-bomb guard
  image-optimizer.service.spec.ts

apps/subgraph-content/src/visual-anchor/
  visual-anchor.module.ts
  visual-anchor.service.ts    — CRUD + simhash + RLS
  visual-anchor.resolver.ts   — GraphQL resolver
  visual-anchor.schemas.ts    — Zod validation
  visual-anchor.graphql       — SDL
  visual-anchor.service.spec.ts
  visual-anchor.resolver.spec.ts

apps/subgraph-content/src/document-version/
  document-version.module.ts
  document-version.service.ts — versioning + DIFF + AI broken-anchor detection
  document-version.resolver.ts
  document-version.graphql
  document-version.service.spec.ts
```

### Frontend Web
```
apps/web/src/components/visual-anchoring/
  VisualSidebar.tsx           — Student sidebar: shows current anchor image
  VisualSidebar.test.tsx
  AnchorEditor.tsx            — Instructor: text-select → create anchor
  AnchorEditor.test.tsx
  AnchorFrame.tsx             — Visual frame around active text passage
  AnchorFrame.test.tsx
  AssetPicker.tsx             — Instructor: pick image from course catalog
  AssetPicker.test.tsx
  AssetUploader.tsx           — Upload new image with scan feedback
  AssetUploader.test.tsx
  InstructorAnchorPanel.tsx   — List + manage all anchors in document
  InstructorAnchorPanel.test.tsx
  CrossFadeImage.tsx          — Two-layer opacity-swap for smooth transitions
  CrossFadeImage.test.tsx

apps/web/src/hooks/
  useAnchorDetection.ts       — rAF loop, centermost calc, 60fps throttled
  useAnchorDetection.test.ts
  useOfflineAnchors.ts        — IndexedDB via idb + localStorage fallback
  useOfflineAnchors.test.ts
  useVisualAssetSearch.ts     — Search hook for asset catalog
  useVisualAssetSearch.test.ts

apps/web/e2e/
  visual-anchoring.spec.ts    — Full E2E: create anchor → scroll → verify sidebar
  visual-anchoring-instructor.spec.ts
```

### Frontend Mobile
```
apps/mobile/src/components/
  VisualBottomSheet.tsx        — Bottom sheet wrapper (@gorhom)
  VisualBottomSheet.test.tsx

apps/mobile/src/screens/
  (extend LessonViewerScreen or ContentViewerScreen to include VisualBottomSheet)
```

### Security Tests
```
tests/security/clamav-upload.spec.ts
tests/security/svg-sanitization.spec.ts
```

---

## Files to Modify

| File | Change |
|---|---|
| `packages/db/src/schema/index.ts` | Export visual-anchoring tables |
| `apps/subgraph-content/src/app.module.ts` | Import VisualAnchorModule, DocumentVersionModule, ClamavModule, ImageOptimizerModule |
| `apps/subgraph-content/src/media/media.service.ts` | Add scan gate in confirmUpload; add WebP conversion; add magic-byte MIME check; add ZIP-bomb size guard |
| `apps/subgraph-content/src/media/media.graphql` | Add scanStatus field to MediaAsset type |
| `apps/web/src/pages/UnifiedLearningPage.tsx` | Add VisualSidebar as left panel (280px fixed) |
| `apps/web/src/pages/RichDocumentPage.tsx` | Add VisualSidebar + AnchorFrame + InstructorAnchorPanel |
| `apps/web/src/components/AnnotatedDocumentViewer.tsx` | Add `data-anchor-id` attributes to highlighted spans for DOM targeting |
| `docker-compose.yml` | Add `clamav` service (clamav/clamav:latest, port 3310) |
| `apps/subgraph-content/.env` | Add CLAMAV_HOST, CLAMAV_PORT |
| `OPEN_ISSUES.md` | Add FEAT-VISUAL-ANCHORING task block |

---

## Phase 0 — Infrastructure (ClamAV)

**File:** `docker-compose.yml`

Add ClamAV service:
```yaml
clamav:
  image: clamav/clamav:latest
  ports: ["3310:3310"]
  mem_limit: 1g
  mem_reservation: 512m
  environment:
    - CLAMAV_NO_FRESHCLAMD=false
  healthcheck:
    test: ["CMD", "clamdscan", "--ping"]
    interval: 60s
    timeout: 10s
    retries: 3
```

Add to env: `CLAMAV_HOST=clamav`, `CLAMAV_PORT=3310`

---

## Phase 1 — Database Schema

**Migration file:** `packages/db/src/migrations/0016_visual_anchoring.sql`

### New Tables

#### `visual_assets`
Stores uploaded images that instructors attach to anchors.
```
id (uuid PK) | tenant_id | course_id (FK courses) | uploader_id (FK users)
filename | original_name | mime_type | size_bytes (bigint)
storage_key (text) — MinIO key: {tenantId}/{courseId}/visual-assets/{uuid}-{name}
webp_key (text nullable) — MinIO key for auto-converted WebP
scan_status (enum: PENDING|SCANNING|CLEAN|INFECTED|ERROR) default PENDING
scan_verdict text nullable — ClamAV verdict string on infection
metadata jsonb — {width, height, format, alt_text}
created_at | updated_at | deleted_at (soft delete)
```
RLS: `tenant_id = current_setting('app.current_tenant')`

#### `visual_anchors`
Semantic text anchors created by instructors.
```
id (uuid PK) | tenant_id | asset_id (FK media_assets, cascade)
created_by (FK users)
anchor_text (text) — the selected text string (semantic anchor)
anchor_hash (varchar 64) — simhash of anchor_text for fuzzy matching
page_number (int nullable) — for PDF: page where anchor starts
x (numeric 6,4) | y (numeric 6,4) | w (numeric 6,4) | h (numeric 6,4) — % coords
page_end (int nullable) — for multi-page selections
x_end (numeric 6,4) | y_end (numeric 6,4) — end coords for multi-page
visual_asset_id (FK visual_assets nullable) — null until instructor assigns image
document_order (int) — DOM order for tie-breaking
is_broken (boolean) default false — set by sync tool after doc update
created_at | updated_at | deleted_at
```
RLS: `tenant_id = current_setting('app.current_tenant')`

#### `document_versions`
Snapshot history for study documents.
```
id (uuid PK) | tenant_id | asset_id (FK media_assets, cascade)
version_number (int) | created_by (FK users)
anchors_snapshot (jsonb) — full list of anchors at this version
diff_summary (text) — human-readable change description
broken_anchors (jsonb) — list of anchor IDs flagged as broken
ai_suggestions (jsonb nullable) — AI remapping suggestions per broken anchor
created_at
UNIQUE (asset_id, version_number)
```
RLS: `tenant_id = current_setting('app.current_tenant')` + instructor-only write

### Indexes
```sql
idx_visual_assets_tenant ON visual_assets(tenant_id)
idx_visual_assets_course ON visual_assets(course_id)
idx_visual_assets_scan ON visual_assets(scan_status)
idx_visual_anchors_tenant ON visual_anchors(tenant_id)
idx_visual_anchors_asset ON visual_anchors(asset_id)
idx_visual_anchors_asset_order ON visual_anchors(asset_id, document_order)
idx_document_versions_asset ON document_versions(asset_id)
```

**Schema file:** `packages/db/src/schema/visual-anchoring.ts`
- Drizzle table defs using `pk()`, `tenantId()`, `...timestamps`, `...softDelete` helpers from `packages/db/src/schema/shared.ts`
- Export types: `VisualAsset`, `VisualAnchor`, `DocumentVersion`, `NewVisualAsset`, `NewVisualAnchor`

---

## Phase 2 — Backend API (Content Subgraph, port 4002)

### 2A. ClamAV Service
**File:** `apps/subgraph-content/src/clamav/clamav.service.ts`

```typescript
@Injectable()
export class ClamavService implements OnModuleInit, OnModuleDestroy {
  private scanner: NodeClam;

  async onModuleInit() { /* init NodeClam connecting to clamd socket */ }
  async onModuleDestroy() { /* close connection */ }

  async scanBuffer(buffer: Buffer, filename: string): Promise<ScanResult>
  // Returns: { isInfected: boolean; viruses: string[] }
  // ZIP bomb guard: reject if file_size > 100MB before scan
  // Graceful corruption: catch ClamAV errors → return { isInfected: false, error: true }
}
```

### 2B. Image Optimizer Service
**File:** `apps/subgraph-content/src/image-optimizer/image-optimizer.service.ts`

```typescript
@Injectable()
export class ImageOptimizerService {
  async optimizeToWebP(buffer: Buffer, mimeType: string): Promise<Buffer>
  async verifyMagicBytes(buffer: Buffer): Promise<string> // returns verified MIME
  async checkZipBomb(buffer: Buffer, declaredSize: number): Promise<void> // throws if suspicious
  async extractDimensions(buffer: Buffer): Promise<{ width: number; height: number }>
}
```
Uses `sharp` for conversion. Uses `file-type` for magic byte verification.
Supported inputs: PNG, JPG, JPEG, GIF, SVG, TIFF, BMP, WEBP → all converted to WebP (except GIF kept as-is for animation; SVG kept as-is for vector quality).

### 2C. Visual Asset Mutations (extend media.graphql)

```graphql
enum ScanStatus { PENDING SCANNING CLEAN INFECTED ERROR }

extend type MediaAsset {
  scanStatus: ScanStatus!
}

type VisualAsset {
  id: ID!
  courseId: ID!
  filename: String!
  mimeType: String!
  sizeBytes: Int!
  storageUrl: String!       # presigned URL (15-min TTL)
  webpUrl: String           # presigned WebP URL
  scanStatus: ScanStatus!
  metadata: VisualAssetMetadata!
  createdAt: String!
}

type VisualAssetMetadata {
  width: Int
  height: Int
  altText: String
}

extend type Query {
  getVisualAssets(courseId: ID!): [VisualAsset!]! @authenticated
  getVisualAnchors(assetId: ID!): [VisualAnchor!]! @authenticated
  getDocumentVersions(assetId: ID!): [DocumentVersion!]! @authenticated
    @requiresScopes(scopes: ["content:read"])
}

extend type Mutation {
  # Upload flow: 1. getPresignedUploadUrl (existing) → 2. confirmVisualAssetUpload
  confirmVisualAssetUpload(
    fileKey: String!
    courseId: ID!
    originalName: String!
    declaredMimeType: String!
    declaredSize: Int!
  ): VisualAsset! @authenticated @requiresScopes(scopes: ["content:write"])

  createVisualAnchor(input: CreateVisualAnchorInput!): VisualAnchor!
    @authenticated @requiresScopes(scopes: ["content:write"])

  updateVisualAnchor(id: ID!, input: UpdateVisualAnchorInput!): VisualAnchor!
    @authenticated @requiresScopes(scopes: ["content:write"])

  deleteVisualAnchor(id: ID!): Boolean!
    @authenticated @requiresScopes(scopes: ["content:write"])

  assignAssetToAnchor(anchorId: ID!, visualAssetId: ID!): VisualAnchor!
    @authenticated @requiresScopes(scopes: ["content:write"])

  syncAnchors(assetId: ID!): SyncResult!
    @authenticated @requiresScopes(scopes: ["content:write"])

  createDocumentVersion(assetId: ID!, summary: String): DocumentVersion!
    @authenticated @requiresRole(roles: [INSTRUCTOR, ORG_ADMIN, SUPER_ADMIN])
}

# Subscription for real-time anchor deletion (students see without refresh)
extend type Subscription {
  anchorDeleted(assetId: ID!): ID! @authenticated
}
```

### 2D. VisualAnchorService key methods
**File:** `apps/subgraph-content/src/visual-anchor/visual-anchor.service.ts`

```typescript
findAllByAsset(assetId, authCtx) // single load, returns all anchors
createAnchor(input, authCtx)     // validate, compute simhash, insert
updateAnchor(id, input, authCtx) // update coords + text, recompute hash
deleteAnchor(id, authCtx)        // soft-delete + publish EDUSPHERE.visual.anchor.deleted
assignAsset(anchorId, visualAssetId, authCtx)
syncAnchors(assetId, authCtx)    // re-run simhash comparison → mark broken
```

**NATS events published:**
- `EDUSPHERE.visual.anchor.deleted` → `{ anchorId, assetId, tenantId }`
- `EDUSPHERE.visual.anchor.created` → `{ anchorId, assetId, tenantId }`

### 2E. confirmVisualAssetUpload flow
```
1. Verify declaredSize < 15MB (reject with clear error if not)
2. Download buffer from MinIO quarantine prefix (tenantId/courseId/quarantine/{fileKey})
3. Check magic bytes via ImageOptimizerService.verifyMagicBytes()
4. Verify MIME matches declared + is in allowed list
5. ClamAV scan via ClamavService.scanBuffer()
   - If INFECTED: delete from MinIO, insert visual_assets with scan_status=INFECTED, throw clear error
   - If ERROR: insert with scan_status=ERROR, return with warning
6. Convert to WebP via ImageOptimizerService.optimizeToWebP() (except GIF, SVG)
7. Move from quarantine to production prefix (tenantId/courseId/visual-assets/{uuid})
8. Upload WebP version to MinIO
9. Insert into visual_assets with scan_status=CLEAN
10. Return VisualAsset with presigned URLs
```

---

## Phase 3A — Instructor UI (parallel with 3B)

### AnchorEditor.tsx
- Wraps the document viewer
- Detects `mouseup` / `touchend` → reads `window.getSelection()` → extracts: `anchorText`, `range`, `pageNumber`, bounding rect (normalized to % of container)
- Floating toolbar appears at selection end → "Create Anchor" button
- On click → opens modal with anchor text preview + optional image picker

### AssetUploader.tsx
- Drag-and-drop + file input (PNG, JPG, JPEG, GIF, SVG, TIFF, BMP, WEBP)
- Client-side size check (15MB) before upload starts
- Upload flow: `getPresignedUploadUrl` → PUT to MinIO → `confirmVisualAssetUpload`
- Shows scan progress (polling scanStatus) and result (success/infected/error)

### AssetPicker.tsx
- Grid of existing course visual assets (with preview thumbnails)
- Search by filename / alt text
- Click to select → assignAssetToAnchor mutation

### InstructorAnchorPanel.tsx
- Right sidebar panel visible in instructor mode
- Lists all anchors in the document (ordered by document_order)
- Each row: anchor text snippet + thumbnail of assigned image + edit/delete buttons
- "Preview as Student" button → toggles into student view mode (hides editor controls)

### Integration: RichDocumentPage.tsx
Extend with three new modes:
- `mode='student'` (default): VisualSidebar (left, 280px) + AnnotatedDocumentViewer + WordCommentPanel
- `mode='instructor'`: AnchorEditor overlay + InstructorAnchorPanel (right, replacing WordCommentPanel)
- `mode='preview'`: student mode, but with a banner "Instructor Preview"

---

## Phase 3B — Student UI (parallel with 3A)

### useAnchorDetection.ts
```typescript
// Single responsibility: given a list of anchors, track which is "centermost"
function useAnchorDetection(anchors: VisualAnchor[], containerRef: RefObject<HTMLElement>) {
  // Returns: { activeAnchorId: string | null }

  // Algorithm (runs every 3rd rAF = ~20fps detection, smooth at 60fps):
  // 1. viewportCenterY = containerEl.scrollTop + containerEl.clientHeight / 2
  // 2. For each anchor: find DOM element via [data-anchor-id="<id>"]
  // 3. If element not found (not yet rendered): skip
  // 4. anchorCenterY = el.offsetTop + el.offsetHeight / 2
  // 5. distance = Math.abs(anchorCenterY - viewportCenterY)
  // 6. Active = min distance; tie-breaker = lower document_order
  // 7. If no anchors or none visible: return null

  // Memory safety: rAF handle stored in ref, cancelled on unmount
}
```

### VisualSidebar.tsx
```typescript
// Props: { anchors, activeAnchorId, isRTL }
// Layout: fixed 280px panel, left of document (Desktop)
// Mobile: not rendered (VisualBottomSheet handles mobile)
// Content:
//   - Current image displayed via <CrossFadeImage>
//   - If activeAnchorId === null: empty state (no text, no image)
//   - If anchor has no assigned image: "No image assigned" placeholder
// Accessibility: role="complementary", aria-label="Visual Aid Sidebar"
// RTL: position switches to right side when isRTL=true and doc direction=rtl
```

### CrossFadeImage.tsx
```typescript
// Two absolutely-positioned img elements layered
// On activeAnchorId change:
//   - New image starts at opacity 0, transition to 1 (300ms CSS)
//   - Old image transitions from 1 to 0 (300ms CSS)
// GIF handling: once fade completes, pause GIF by swapping src to data URI of last frame
// SVG handling: if mimeType='image/svg+xml', use <img> (NOT inline) UNLESS interactivity flag set
//   - Interactive SVG: fetch SVG text, sanitize with DOMPurify, render as dangerouslySetInnerHTML
```

### AnchorFrame.tsx
```typescript
// Renders a subtle frame around the active anchor's text
// Finds [data-anchor-id="activeId"] → reads its bounding rect
// Renders an absolutely-positioned <div> border box over it
// Styling: 1px solid, course-theme color (CSS var), border-radius 4px
// Click on frame: sidebar updates focus (same as sidebar auto-update)
// Transition: 150ms position transition when anchor changes
```

### Integration: UnifiedLearningPage.tsx
Add VisualSidebar as a new leftmost panel (280px, non-resizable in MVP):
```
[VisualSidebar 280px] | [DocumentPanel flex-1] | [ToolsPanel 45%]
```
Load all anchors on mount: `useQuery(GET_VISUAL_ANCHORS, { variables: { assetId } })`
Pass to `useAnchorDetection` + `VisualSidebar` + `AnchorFrame`.

### "Return to last place" feature
Extend `useDocumentScrollMemory` (or use its output):
- When page loads with saved scroll position: show "Continue from where you left off" banner with last anchor preview image.
- User clicks → scroll restores.

---

## Phase 4 — Offline + Mobile

### useOfflineAnchors.ts
```typescript
// IndexedDB via `idb` package (key: `edusphere_anchors_{assetId}`)
// On mount: load anchors from API → store in IndexedDB
// On offline: serve from IndexedDB
// Fallback: if IndexedDB unavailable → use localStorage (compressed JSON)
// Memory: close DB connection on unmount
// Sync: on 'online' event → re-fetch from API and update IndexedDB
```

### VisualBottomSheet.tsx (Mobile)
```typescript
// Uses @gorhom/bottom-sheet
// Snap points: ['25%', '50%', '90%']
// Default: 25% (shows thumbnail)
// User swipe up: expands to 90%
// Content: current anchor image + anchor text
// Touch gestures: swipe drag-to-dismiss (collapses to 25%)
// Integrated into LessonViewerScreen / ContentViewerScreen
```

---

## Phase 5 — Advanced Search

### Extend existing search indexing
- Index `visual_anchors.anchor_text` (already indexed by asset, needs FTS)
- Index `visual_assets.filename`, `visual_assets.metadata->>'alt_text'`
- Add full-text search column (`to_tsvector('hebrew', anchor_text)` for Hebrew support)
- New Query: `searchVisualAssets(courseId, query): [VisualAssetSearchResult]`
- SearchResult includes: `{ asset, anchorText, thumbnailUrl }`
- Frontend: `useVisualAssetSearch` hook (debounced 300ms)

---

## Phase 6 — Version Control + AI Anchor Sync

### DocumentVersionService
```typescript
createVersion(assetId, summary, authCtx)
  // 1. Load all current anchors for the asset
  // 2. Snapshot into document_versions.anchors_snapshot
  // 3. Compute DIFF vs previous version (text diff on anchor_text)
  // 4. Identify broken anchors (those with is_broken=true)
  // 5. Call AI analysis for broken anchor remapping suggestions
  // 6. Store ai_suggestions in document_versions

getVersionHistory(assetId, authCtx)
rollbackToVersion(versionId, authCtx)
  // 1. Load anchors_snapshot from version
  // 2. Soft-delete all current anchors
  // 3. Re-insert from snapshot
```

### AI Broken Anchor Detection
- When document text changes (new version uploaded):
  - For each anchor: compute simhash of anchor_text
  - Compare against new document's text sliding window (every 20 words)
  - If no match with similarity > 0.7 → mark `is_broken=true`
  - AI analysis: use Vercel AI SDK (Ollama dev / Anthropic prod) to suggest new text that matches the original anchor's context
  - Store suggestions in `document_versions.ai_suggestions`
  - Instructor reviews in InstructorAnchorPanel → approves / manually re-anchors

---

## Phase 7 — Edge Cases & Performance Hardening

### All 19 PRD Edge Cases

| # | Edge Case | Implementation |
|---|---|---|
| 1 | No anchors → no image shown | `useAnchorDetection` returns null → VisualSidebar shows empty state |
| 2 | Tie: same distance → first in doc order | `document_order` column; sort before taking min |
| 3 | Fast fling/scroll → image stays smooth | CSS transition (GPU), not JS; rAF detection only |
| 4 | 200+ pages, 500+ anchors → 60fps | rAF throttled to every 3rd frame; anchor DOM map built once |
| 5 | Doc update → broken anchors | simhash DIFF in DocumentVersionService |
| 6 | Multi-page selection | `page_number` + `page_end` + `x_end/y_end` columns |
| 7 | RTL → sidebar right, framing adapts | `isRTL` prop from content direction; sidebar `left`/`right` via CSS var |
| 8 | Mobile → Bottom Sheet | VisualBottomSheet replaces VisualSidebar when `isMobile` |
| 9 | Corrupt image upload | ImageOptimizerService catches sharp errors → graceful rejection |
| 10 | Malicious file | ClamAV scan → immediate rejection + log |
| 11 | ZIP bomb / huge file | Size check before scan: >100MB → reject without scanning |
| 12 | Hebrew/special char search | PostgreSQL FTS with `hebrew` dictionary; idb key encoding UTF-8 |
| 13 | Offline mode | useOfflineAnchors stores in IndexedDB |
| 14 | Return to last page | useDocumentScrollMemory + anchor preview banner |
| 15 | Window resize/zoom | rAF loop recomputes on every frame; `getBoundingClientRect()` is live |
| 16 | GIF animation stops after fade | After 300ms transition: swap src to static last-frame data URI |
| 17 | SVG with interactivity | Fetch → DOMPurify.sanitize → dangerouslySetInnerHTML |
| 18 | Student clicks frame → sidebar focus | onClick on AnchorFrame → scroll sidebar to image |
| 19 | Instructor deletes anchor → realtime | NATS → Subscription → urql subscribeToMore → remove from state |

### Performance for 500+ Anchors
- `anchorDomMap` built once on mount: `Map<anchorId, HTMLElement>` — rebuilt only on anchor list change
- rAF loop: throttled to every 3rd frame (20fps anchor detection; scroll itself stays 60fps)
- Sidebar image: preload next 2 likely images using `<link rel="preload">` hints

---

## Phase 8 — Test Strategy

### Unit Tests (Vitest)
```
clamav.service.spec.ts           — mock NodeClam, test infected/clean/error/zip-bomb paths
image-optimizer.service.spec.ts  — WebP conversion, magic byte verification, size guard
visual-anchor.service.spec.ts    — CRUD, simhash, RLS enforcement, broken anchor detection
useAnchorDetection.test.ts       — mock DOM, verify centermost calc, tie-breaker, empty state
useOfflineAnchors.test.ts        — mock idb, verify online/offline sync, fallback to localStorage
CrossFadeImage.test.tsx          — verify opacity class toggling, GIF src swap timing
VisualSidebar.test.tsx           — renders correct image, empty state, RTL positioning
AnchorFrame.test.tsx             — frame position update on activeAnchorId change
```

### Integration Tests
```
visual-anchor integration — full GraphQL CRUD via test DB with RLS
  - Tenant A anchors NOT visible to Tenant B
  - Student cannot create/delete anchors (scope check)
  - Instructor can CRUD anchors for their course only
```

### E2E Playwright
```
visual-anchoring.spec.ts
  - Login as instructor → upload image (ClamAV clean path)
  - Create anchor on text selection → assign image → Preview as Student
  - Login as student → scroll document → verify sidebar changes on scroll
  - Verify cross-fade transition (screenshot at mid-fade)
  - Mobile viewport: verify Bottom Sheet appears instead of Sidebar
  - Offline: disable network → verify anchors still load from IndexedDB
  - Delete anchor as instructor → verify student view updates without refresh

visual-anchoring-visual.spec.ts
  - toHaveScreenshot() for: sidebar with image, empty state, framing, mobile bottom sheet
```

### Security Tests
```
clamav-upload.spec.ts    — upload EICAR test file → verify rejection + log entry
svg-sanitization.spec.ts — upload SVG with <script> tag → verify stripped before render
                         — upload SVG with onerror attr → verify absent in rendered DOM
```

### Memory Tests
```
useAnchorDetection.memory.test.ts — unmount → verify rAF cancelled (no rAF calls after unmount)
useOfflineAnchors.memory.test.ts  — unmount → verify idb closed, online listener removed
```

---

## Parallel Agent Execution Map

```
[Phase 0: Docker]  ──────────────────────────────── Agent-INFRA (blocking)
        │
        ▼
[Phase 1: DB] ──────────────────────────────────── Agent-DB (blocking)
        │
        ▼
[Phase 2: Backend] ─────────────────────────────── Agent-BE (blocking)
        │
   ┌────┼────┬─────────────┬──────────────┐
   ▼    ▼    ▼             ▼              ▼
[3A]  [3B] [4-Offline] [5-Search] [6-Versioning]
Instr  Std  Mobile      Search    DocVersion+AI
Agent  Agent Agent      Agent     Agent
  └────┴────┴─────────────┴──────────────┘
        │
        ▼
[Phase 7: Edge Cases + Perf hardening] ─────────── Agent-PERF
        │
        ▼
[Phase 8: Tests] ────────────────────────────────── Agent-QA
        │
        ▼
[Phase 9: Security hardening + Docs] ───────────── Agent-SEC + Agent-DOC
```

---

## Verification Steps

### After Phase 1 (DB)
```bash
pnpm --filter @edusphere/db migrate
# Verify:
# SELECT tablename FROM pg_tables WHERE tablename LIKE 'visual_%';
# → visual_assets, visual_anchors, document_versions
```

### After Phase 2 (Backend)
```bash
pnpm --filter @edusphere/subgraph-content dev
# mcp__graphql__introspect-schema → confirm VisualAnchor type exists
# mcp__graphql__query-graphql → { getVisualAnchors(assetId: "test") { id anchorText } }
# mcp__nats__nats_subscribe → subscribe to EDUSPHERE.visual.anchor.created
```

### After Phase 3B (Student UI)
```bash
pnpm --filter @edusphere/web dev
# Open http://localhost:5173/learn/<contentId>
# Verify: VisualSidebar renders left of document
# Scroll: sidebar image changes → observe cross-fade transition
# DevTools Performance: 60fps during scroll (no jank)
```

### After Phase 8 (Tests)
```bash
pnpm turbo test                               # 100% pass
pnpm turbo typecheck                          # 0 errors
pnpm turbo lint                               # 0 warnings
pnpm --filter @edusphere/web test:e2e         # all Playwright specs pass
pnpm test:security                            # ClamAV + SVG sanitization tests pass
./scripts/health-check.sh                     # all services UP
```

### Upload Security Verification
```
# Upload EICAR test file (safe ClamAV test virus string):
# X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*
# Expected: HTTP error "Malicious file detected. Upload rejected." + log entry in Pino
```

---

## OPEN_ISSUES.md Entry

```
FEAT-VISUAL-ANCHORING | 🟡 In Progress | HIGH
Phase 29 — Visual Anchoring & Asset Linking System (PRD v1.6)
Files: packages/db, apps/subgraph-content, apps/web, apps/mobile
9 implementation phases, ~45 new/modified files
Tests required: unit + integration + E2E + visual regression + security + memory
```

---

## Key Reusable Utilities (do NOT reinvent)

| Utility | File | Use |
|---|---|---|
| `withTenantContext` | `packages/db/src/rls/withTenantContext.ts` | All new DB queries |
| `pk()`, `tenantId()`, `...timestamps`, `...softDelete` | `packages/db/src/schema/shared.ts` | All new table defs |
| `getOrCreatePool()` | `packages/db/src/index.ts` | DB pool (never `new Pool()`) |
| `useOfflineQueue` | `apps/web/src/hooks/useOfflineQueue.ts` | Reuse for queuing anchor writes offline |
| `useOfflineStatus` | `apps/web/src/hooks/useOfflineStatus.ts` | Check online state |
| `useDocumentScrollMemory` | `apps/web/src/hooks/useDocumentScrollMemory.ts` | Extend for anchor memory |
| `S3Client` setup | `apps/subgraph-content/src/media/media.service.ts` L1-50 | Copy MinIO init pattern |
| `getPresignedUploadUrl` | `apps/subgraph-content/src/media/media.service.ts` L88-120 | Reuse for visual asset upload |
| `DomResizablePanelGroup` | `apps/web/src/components/ui/resizable.tsx` | Extend UnifiedLearningPage panels |
| `Dialog` (Radix) | `apps/web/src/components/ui/dialog.tsx` | Modal for anchor creation flow |
