---
name: visual-verification-mandatory
description: NEVER declare a UI bug fixed without running a real visual test that proves the fix works in the browser
type: feedback
---

NEVER declare a UI bug fixed without a successful visual verification that proves the fix works.

**Why:** A UI bug was declared "fixed" with commit + push, but the bug was still present in the browser. The unit tests passed but they mocked the UI component, so they couldn't catch the real runtime error. Visual verification was attempted but failed to authenticate, and completion was declared anyway — a clear violation.

**How to apply:**
- For ANY UI bug fix: run an E2E script that authenticates, navigates to the affected page, takes a screenshot, and verifies the bug is gone BEFORE committing
- If visual verification fails (auth issues, server down, etc.) — DO NOT commit. Fix the verification first.
- Unit tests with mocked UI components are NOT sufficient proof that a UI bug is fixed
- "Page shows login screen instead of crash" is NOT proof the fix works — you must verify the actual authenticated page
- Screenshot evidence must show the FIXED state, not just "no crash on unauthenticated page"
