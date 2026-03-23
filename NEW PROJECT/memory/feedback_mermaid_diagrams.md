---
name: Mermaid diagrams mandatory in all docs
description: Every .md file with architecture, flows, or relationships MUST include Mermaid diagrams per style guide
type: feedback
---

All documentation files (.md) describing architecture, flows, relationships, state machines, or timelines MUST include professional Mermaid diagrams.

**Why:** User explicitly requested that all docs look professional with visual diagrams. GitHub renders Mermaid natively — no external tools needed.

**How to apply:**
- When writing or updating any .md file, check if it describes systems/flows/relationships
- If yes → use `mermaid-graph-writer` skill to generate appropriate diagram
- Follow style guide at `docs/reference/MERMAID_STYLE_GUIDE.md`
- Color palette: Blue=client, Orange=processing, Purple=storage, Green=knowledge, Red=error
- Max 15 nodes per diagram — split complex views into multiple diagrams
- The Documentation Agent (Stage 7 in Enterprise Protocol) must auto-enrich docs with Mermaid
