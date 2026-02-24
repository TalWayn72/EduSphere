# WCAG 2.2 AA Upgrade Checklist

> **Status:** Complete  
> **Date:** 2026-02-24  
> **Ticket:** F-024  
> **Baseline:** WCAG 2.1 AA (full coverage)  
> **Target:** WCAG 2.2 AA (full coverage)  

WCAG 2.2 adds 9 new success criteria on top of WCAG 2.1. This document records
the implementation status of each new criterion for EduSphere.

---

## New WCAG 2.2 Success Criteria

### SC 2.4.11 — Focus Appearance (Minimum) — Level AA

**Requirement:** When a UI component receives keyboard focus the focus indicator must:
- Have a contrast ratio of at least 3:1 against adjacent colours
- Enclose the component (or an area >= the perimeter of the component x 1 CSS px)

**Status:** Done

**Implementation:**
- Added  to
   (global base layer).
-  (blue-600) has a 4.5:1 contrast ratio against white and >= 3:1 against
  the light-grey page background used by EduSphere.
- Added  to suppress the outline for
  mouse/touch users while keeping it for keyboard users (progressive enhancement).
- Automated test:  in accessibility.spec.ts

---

### SC 2.4.12 — Focus Not Obscured (Minimum) — Level AA

**Requirement:** When a UI component receives keyboard focus it must not be
completely hidden by author-created content (sticky headers, sticky footers,
cookie banners).

**Status:** Done

**Implementation:**
- Added  with 
  to .
- EduSphere header is not  — it scrolls with the page. The
   rule ensures browser-scroll-into-view reserves header space.
- If the header is ever made sticky, update  to match.
- Automated test:  in accessibility.spec.ts

---

### SC 2.5.7 — Dragging Movements — Level AA

**Requirement:** All functionality that uses a dragging movement must also be
achievable with a single pointer without dragging.

**Status:** N/A — Not Applicable

**Rationale:**
EduSphere does not use drag-only interactions:
- Sliders (Radix UI) support click-to-set in addition to drag.
- Knowledge graph renderer shows read-only visualisations; nodes are not draggable.
- No Kanban boards, sortable lists, or other drag-only components exist.

If drag interactions are added, provide a click/tap alternative for every drag operation.

---

### SC 2.5.8 — Target Size (Minimum) — Level AA

**Requirement:** The activation area for pointer inputs is at least 24x24 CSS pixels
(with exceptions for inline text links, user-agent-controlled elements, and essential cases).

**Status:** Done

**Implementation:**
- Added CSS floor rule to :
  
- Added inline-anchor exemption (, , ) per SC 2.5.8 Exception 2.
- Updated  to add 
  on the Radix root (activation area 24x24 px, visual indicator stays 16x16 px).
- Button component already uses // (36-44 px) — no changes needed.
- Automated test:  in accessibility.spec.ts

---

### SC 3.2.6 — Consistent Help — Level A

**Requirement:** Help mechanisms (human contact, self-help, automated chat) must appear
in the same relative order across pages.

**Status:** N/A — Not Applicable

**Rationale:**
EduSphere does not expose a persistent help mechanism in its navigation or footer.
The AI Chavruta chat panel is a learning tool, not a support help mechanism.

If a help mechanism is added, it must appear in the same DOM position on every page.

---

### SC 3.3.7 — Redundant Entry — Level A

**Requirement:** Information previously entered by the user must be auto-populated or
selectable when required again in the same session.

**Status:** N/A — Not Applicable

**Rationale:**
No multi-step forms exist in EduSphere. Registration uses Keycloak single-form.
Content and annotation forms are single-step.

If multi-step forms are added, auto-populate fields using React Hook Form defaultValues.

---

### SC 3.3.8 — Accessible Authentication (Minimum) — Level AA

**Requirement:** A cognitive function test (CAPTCHA) must not be required for
authentication without an alternative that does not rely on a cognitive function test.

**Status:** Done — Configuration (No Code Change Required)

**Implementation:**
- EduSphere authentication is handled by Keycloak (OIDC).
- No CAPTCHA authenticator is configured in the Keycloak Browser Flow.
- Brute-force protection (time-delay lockout) is allowed per WCAG 2.2.

**Keycloak verification steps:**
1. Log in to Keycloak Admin Console ().
2. Select realm .
3. Go to **Authentication** > **Flows** > **Browser**.
4. Confirm no  or  authenticator is present.
5. Go to **Realm Settings** > **Security Defenses** > **Brute Force Detection**.
6. Confirm ,  (per SI-4 in CLAUDE.md).

---

### SC 3.3.9 — Accessible Authentication (Enhanced) — Level AAA

**Requirement:** No cognitive function test at all in authentication (Level AAA).

**Status:** Satisfied (Level AAA)

**Rationale:** EduSphere uses no CAPTCHA of any kind. Satisfies AAA even though
the target compliance level is AA. See SC 3.3.8 implementation notes above.

---

## Files Changed

| File | Change |
| ---- | ------ |
|  | SC 2.4.11 focus-visible rule, SC 2.4.12 scroll-padding-top, SC 2.5.8 target size floor |
|  | Added  for SC 2.5.8 |
|  | Updated axe tags to include ; added SC 2.4.11, 2.4.12, 2.5.8 tests |
|  | Added WCAG 2.2 AA badge |
|  | This file |

---

## Running the Tests



---

*Last updated: 2026-02-24*
