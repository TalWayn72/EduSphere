# Upload Retry — Non-Functional Requirements

> **Purpose:** Make file upload retry a product-level requirement, not just a bug fix.
> **Item:** #97 from master work plan | **Effective:** 2026-03-17

---

## Problem

Upload failures are a recurring bug class (BUG-073, plus 3+ prior incidents).
Upload retry was never a product requirement — it was implemented reactively.

## Non-Functional Requirements

### NFR-UPLOAD-1: Automatic Retry

- All file uploads MUST retry automatically on transient failure (network timeout, 5xx)
- Retry strategy: exponential backoff (1s, 2s, 4s) with max 3 attempts
- User MUST see retry progress indicator during automatic retry

### NFR-UPLOAD-2: Manual Retry

- If automatic retry exhausts all attempts, show a "Retry" button
- Retry button MUST NOT require the user to re-select the file
- The file reference MUST be preserved in memory until explicitly cancelled

### NFR-UPLOAD-3: Error Display

- Upload errors MUST show user-friendly messages, not technical strings
- Forbidden: raw HTTP status codes, presign URLs, stack traces
- Required: "Upload failed — please try again" with Retry button

### NFR-UPLOAD-4: Cancellation

- User MUST be able to cancel an in-progress upload at any time
- Cancellation MUST abort the HTTP request (AbortController)
- Cancellation MUST clean up any partial server-side state

### NFR-UPLOAD-5: Progress

- Uploads > 1MB MUST show a progress bar
- Progress MUST update at least every 500ms
- Completing 100% MUST show a success indicator for ≥ 2s

### NFR-UPLOAD-6: Concurrent Uploads

- Platform MUST support ≥ 3 concurrent file uploads
- Each upload MUST have independent progress and retry state
- Queue additional uploads if concurrent limit reached

### NFR-UPLOAD-7: Resume (Future)

- For files > 50MB, implement resumable uploads (tus protocol or S3 multipart)
- Track uploaded bytes so resume starts from last successful chunk
- Priority: Q3 2026

## Implementation Reference

- Shared hook: `apps/web/src/hooks/useFileUpload.ts`
- Presign → PUT → confirm 3-phase pattern
- AbortController cleanup on unmount
- See BUG-073 fix documentation in OPEN_ISSUES.md

## Acceptance Criteria

- [ ] `useFileUpload` hook used in ALL upload components (no ad-hoc upload logic)
- [ ] E2E test: `apps/web/e2e/upload-retry.spec.ts` simulates presign failure → retry
- [ ] Unit test: `apps/web/src/hooks/useFileUpload.test.ts` covers all NFRs above

---

_Created: March 2026 — Enterprise Audit Wave 8_
