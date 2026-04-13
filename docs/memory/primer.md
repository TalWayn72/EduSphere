# EduSphere Session Primer
Last Updated: 2026-04-13T16:00:00Z

## Last Session Summary (2026-04-13)
- Implemented full **Live Lesson Streaming** feature across 12 phases (~70+ new files, all under 300 lines):
  - **Phase 1 (DB):** 8 tables (live_session_configs, live_chat_messages, live_reactions, live_qa_questions, live_session_presence, live_bookmarks, live_transcript_segments, live_qa_upvotes, live_session_summaries) + 24 NATS event subjects
  - **Phase 2 (subgraph-content backend):** 9 files — SDL, service, resolver, subscriptions, LiveKit client, presence manager, NATS pubsub adapter
  - **Phase 3 (subgraph-collaboration backend):** 10 files — live-chat, Q&A, reactions, bookmarks services + resolvers
  - **Phase 4 (transcription-worker):** 7 files — streaming Whisper with jargon vocabulary injection, live jargon matcher
  - **Phase 5-7 (Frontend data layer + components):** 24 files — GraphQL queries/mutations/subscriptions, custom hooks, Zustand store, LivePlayerPage, live chat panel, Q&A panel, reactions bar, presence indicator
  - **Phase 8-9 (Instructor tools):** Notes panel, bookmarks sheet, glossary sheet, instructor controls panel, CreateLiveSessionPage
  - **Phase 10 (VOD converter):** Post-session recording → existing enrichment pipeline integration
  - **Phase 11 (AI summary):** subgraph-agent live session summary generation worker
  - **Phase 12 (Supergraph + i18n):** Supergraph updated (4 enums, 11 types, 35 operations), i18n 43 keys × 11 locales, federation stub fixes
- New routes: `/live/:sessionId` (viewer), `/courses/:courseId/live/new` (instructor create)
- Jargon edit/delete support added for instructors (8 modified files from prior session carried forward)

## Previous Session Summary (2026-04-13)
- Implemented full Professional Jargon feature across all 3 phases:
  - Phase 1 (from prior session): Domain dictionary + transcript recognition — 6 DB tables, backend services, Aho-Corasick + pgvector detection, JargonManagementPage
  - Phase 2: Glossary Wiki + Tooltips — glossary_entries/glossary_lesson_refs tables, glossary backend (SDL/services/resolvers), JargonHighlighter + JargonTooltip in transcript, GlossaryWikiPage with search + domain filter + detail view
  - Phase 3: Source Citations + Verification — citation_format_configs table, CitationFormatWizard, SourceLinkingPanel, VerifiedCitationIndicator, fixed match_status enum
- CI: 14+ commits pushed, multiple fix cycles (Prettier, codegen, i18n, Vitest hang, timeouts)
- Fixed bugs: YouTube ID rendering as document text, enriched summary disappearing, instructor access to /admin/jargon
- Seeded 30 Kabbalistic jargon terms + Hebrew transcript for Sefirat HaOmer lesson
- Added i18n keys: glossary (17 keys × 11 locales) + citation (30 keys × 11 locales) + jargon (68 keys × 8 locales)

## Current State
- Branch: master
- Last commit: c09b01f7 feat(jargon): add edit and delete term support for instructors
- Modified: 8 files (jargon edit/delete in-progress, not yet committed) | Untracked: 195 files
- Live Lesson Streaming: all 12 phases complete — awaiting unit tests + manual QA
- All 65 phases + Phase D Tech Debt + Professional Jargon + Live Streaming complete
- TypeScript: 0 errors | Lint: 0 warnings | All files under 300-line limit
- Keycloak client: `edusphere-web` (NOT `edusphere-app`)
- Test totals: ~9,560+ (web ~5,653 | security 1,370 | E2E 134 | subgraphs ~2,537)
- **Dependency note:** `livekit-server-sdk` and `livekit-client` need to be installed before first run

## Division Status
| Division    | Status   | Last Activity |
|-------------|----------|---------------|
| Frontend    | idle     | 2026-04-13    |
| API         | idle     | 2026-04-13    |
| Services    | idle     | 2026-04-13    |
| Database    | idle     | 2026-04-13    |
| Security    | idle     | 2026-04-07    |
| QA          | idle     | 2026-04-13    |
| DevOps      | idle     | 2026-04-13    |
| Docs        | idle     | 2026-04-13    |

## Next Steps
1. **Install LiveKit deps:** `pnpm add livekit-server-sdk` in subgraph-content + transcription-worker; `pnpm add livekit-client` in apps/web
2. **Commit in-progress jargon changes:** 8 modified files (edit/delete) need a commit
3. **Unit tests:** Live streaming service layer (subgraph-content, subgraph-collaboration, subgraph-agent)
4. **Manual QA:** `/courses/:courseId/live/new` create flow, `/live/:sessionId` viewer, instructor controls, chat, Q&A, reactions
5. **CI monitoring:** Verify latest commits pass all GitHub Actions workflows
6. **Migrations:** Run `pnpm --filter @edusphere/db migrate` to apply the 8 new live-streaming tables

## Open Decisions
- urql v6 migration: breaking changes in mock patterns — need dedicated migration plan before upgrading
- Storybook v10: CSF3 format changes — needs spike to assess migration effort
- LiveKit server infra: local dev uses livekit-server Docker image; production config (LiveKit Cloud vs self-hosted) TBD

## Quick Health Check
```bash
docker ps                          # 14 containers healthy
./scripts/health-check.sh          # all services green
curl http://localhost:4000/graphql  # gateway responds
```

## Git Snapshot (consolidated — 2026-04-13)
- Branch: master
- Last commit: c09b01f7 feat(jargon): add edit and delete term support for instructors
- Modified: 8 files | Untracked: 195 files
- Timestamp: 2026-04-13T15:33:23Z

## Git Snapshot (auto — Stop hook)
- Branch: master
- Last commit: c09b01f7 feat(jargon): add edit and delete term support for instructors
- Modified: 18 files | Untracked: 248 files
- Timestamp: 2026-04-13T17:24:08Z

## Git Snapshot (auto — Stop hook)
- Branch: master
- Last commit: c09b01f7 feat(jargon): add edit and delete term support for instructors
- Modified: 20 files | Untracked: 263 files
- Timestamp: 2026-04-13T17:32:34Z
