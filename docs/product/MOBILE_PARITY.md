# Mobile / Web Feature Parity Tracker

> **Purpose:** Track which web features exist on mobile, plan quarterly priorities.
> **Updated:** 2026-03-17 | **Mobile:** Expo SDK 54 | **Web:** React 19 + Vite 6

---

## Legend

| Symbol | Meaning                      |
| ------ | ---------------------------- |
| ✅     | Implemented on mobile        |
| 🟡     | Partial (basic version only) |
| ❌     | Not on mobile                |
| N/A    | Not applicable to mobile     |

---

## Feature Parity Matrix

### Core Learning

| Feature                 | Web | Mobile | Priority | Notes                                       |
| ----------------------- | --- | ------ | -------- | ------------------------------------------- |
| Course list / browse    | ✅  | ✅     | -        |                                             |
| Course detail + modules | ✅  | ✅     | -        |                                             |
| Lesson viewer (text)    | ✅  | ✅     | -        |                                             |
| Video playback          | ✅  | 🟡     | Q2       | expo-av basic player, no adaptive streaming |
| File attachments        | ✅  | 🟡     | Q2       | Download only, no preview                   |
| Quiz taking             | ✅  | ✅     | -        |                                             |
| Quiz results            | ✅  | ✅     | -        |                                             |
| Progress tracking       | ✅  | ✅     | -        |                                             |
| Certificates            | ✅  | ❌     | Q3       | PDF generation needed                       |
| SCORM player            | ✅  | N/A    | -        | WebView fallback possible                   |

### AI & Knowledge Graph

| Feature                | Web | Mobile | Priority | Notes                                 |
| ---------------------- | --- | ------ | -------- | ------------------------------------- |
| AI Tutor chat          | ✅  | ✅     | -        |                                       |
| AI Course Creator      | ✅  | ❌     | Q3       | Complex wizard UI                     |
| Knowledge graph viewer | ✅  | ❌     | Q4       | D3/Canvas visualization               |
| HybridRAG search       | ✅  | 🟡     | Q2       | Search works, no graph visualization  |
| Agent Studio           | ✅  | N/A    | -        | Drag-and-drop not suitable for mobile |
| Concept explorer       | ✅  | ❌     | Q3       |                                       |

### Collaboration

| Feature                      | Web | Mobile | Priority | Notes                    |
| ---------------------------- | --- | ------ | -------- | ------------------------ |
| Annotations (text highlight) | ✅  | ❌     | Q2       | Touch-based selection    |
| Discussion threads           | ✅  | 🟡     | Q2       | Read-only, no reply      |
| Live sessions (WebSocket)    | ✅  | ❌     | Q3       | WebSocket + CRDT sync    |
| Collaborative editing        | ✅  | N/A    | -        | Yjs on mobile not viable |
| Peer review                  | ✅  | ❌     | Q4       |                          |

### Admin & Management

| Feature                | Web | Mobile | Priority | Notes                |
| ---------------------- | --- | ------ | -------- | -------------------- |
| Dashboard (student)    | ✅  | ✅     | -        |                      |
| Dashboard (instructor) | ✅  | ❌     | Q3       |                      |
| Admin Dashboard        | ✅  | N/A    | -        | Admin uses desktop   |
| User management        | ✅  | N/A    | -        |                      |
| Role management        | ✅  | N/A    | -        |                      |
| Audit log              | ✅  | N/A    | -        |                      |
| Announcements          | ✅  | 🟡     | Q2       | Read-only, no create |
| HRIS integration       | ✅  | N/A    | -        |                      |

### Account & Auth

| Feature                  | Web | Mobile | Priority | Notes                                |
| ------------------------ | --- | ------ | -------- | ------------------------------------ |
| Login (Keycloak OIDC)    | ✅  | ✅     | -        | expo-auth-session                    |
| Profile page             | ✅  | ✅     | -        |                                      |
| Onboarding wizard        | ✅  | 🟡     | Q2       | Basic version, no AI personalization |
| Settings                 | ✅  | ✅     | -        |                                      |
| Notification preferences | ✅  | ❌     | Q2       |                                      |
| Dark mode                | ✅  | ✅     | -        |                                      |

### Content Creation

| Feature              | Web | Mobile | Priority | Notes                          |
| -------------------- | --- | ------ | -------- | ------------------------------ |
| Course editor        | ✅  | ❌     | Q4       | Complex rich editor            |
| Module/lesson editor | ✅  | ❌     | Q4       |                                |
| File upload          | ✅  | 🟡     | Q2       | Camera + gallery, no drag-drop |
| Portal Block Editor  | ✅  | N/A    | -        | Desktop authoring tool         |
| Rubric builder       | ✅  | N/A    | -        |                                |
| Compliance library   | ✅  | N/A    | -        |                                |

### Marketplace

| Feature            | Web | Mobile | Priority | Notes                      |
| ------------------ | --- | ------ | -------- | -------------------------- |
| Course marketplace | ✅  | ❌     | Q3       |                            |
| Purchase flow      | ✅  | ❌     | Q3       | In-app purchase complexity |
| Instructor payouts | ✅  | N/A    | -        |                            |
| Revenue dashboard  | ✅  | N/A    | -        |                            |

---

## Summary

| Category         | Total  | ✅ Mobile | 🟡 Partial | ❌ Missing | N/A    |
| ---------------- | ------ | --------- | ---------- | ---------- | ------ |
| Core Learning    | 10     | 6         | 2          | 1          | 1      |
| AI & Knowledge   | 6      | 1         | 1          | 3          | 1      |
| Collaboration    | 5      | 0         | 1          | 3          | 1      |
| Admin & Mgmt     | 8      | 1         | 1          | 1          | 5      |
| Account & Auth   | 6      | 4         | 1          | 1          | 0      |
| Content Creation | 6      | 0         | 1          | 1          | 4      |
| Marketplace      | 4      | 0         | 0          | 2          | 2      |
| **TOTAL**        | **45** | **12**    | **7**      | **12**     | **14** |

**Parity rate (excluding N/A):** 12/31 = 39% full, 19/31 = 61% with partial

---

## Quarterly Roadmap

### Q2 2026 — Core Mobile Experience

- File attachments preview
- Annotations (touch-based text selection)
- Discussion thread replies
- HybridRAG search with results display
- Notification preferences
- Onboarding AI personalization
- Announcements (read-only improvements)
- File upload from camera/gallery

### Q3 2026 — Learning Features

- Certificate generation (PDF)
- AI Course Creator (simplified wizard)
- Concept explorer
- Live sessions (WebSocket)
- Instructor dashboard
- Course marketplace + purchase

### Q4 2026 — Content & Collaboration

- Knowledge graph visualization (simplified)
- Peer review
- Course/lesson editor (simplified)
- Remaining marketplace features

---

_Template version: 1.0 — March 2026_
