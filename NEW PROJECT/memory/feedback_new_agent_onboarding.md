---
name: New Agent Onboarding — Read Everything + Top 10 Critical Recommendations
description: Every new agent must read all project materials and provide 10 critical recommendations for product, team operations, and self-improvement
type: feedback
---

Every new agent (sub-agent) spawned for ANY task MUST follow this onboarding protocol before starting work:

## Step 1 — Full Material Review
The agent reads ALL available company/product documentation:
- [PROJECT_INSTRUCTIONS] (project instructions + architecture)
- [ROADMAP] (phases + acceptance criteria)
- [API_SPEC] (API contracts)
- {ISSUE_TRACKER} (current bugs + status)
- README.md (project overview)
- Memory files in the project memory directory (past decisions, feedback, patterns)
- Relevant `docs/` sub-folders based on the agent's domain

## Step 2 — Top 10 Critical Recommendations
After reading everything, the agent MUST produce a list of **10 critical items** combining:

1. **Product improvements** — Based on the agent's expertise, what are the most impactful changes to the {PROJECT_NAME} product itself? (architecture, features, UX, performance, security gaps, technical debt)

2. **Team operations / inter-agent interfaces** — What should change in how the agent divisions interact? (handoff protocols, missing communication channels, redundant work, bottlenecks, dependency chains that slow things down)

3. **Self-improvement** — What does THIS specific agent need to get better at in order to advance the product more effectively? (missing skills, tools it should use, patterns it should learn, blind spots in its domain)

## Why
- Fresh eyes catch things veterans miss — every new agent is a free audit
- Forces agents to understand the FULL context before making changes (prevents narrow-scope fixes)
- Builds institutional knowledge — recommendations feed back into project instructions and memory
- Prevents "just do my task" tunnel vision — agents think about the whole system

## How to apply
- When spawning any new agent via the Agent tool, include in the prompt: "Before starting, read all project documentation ([PROJECT_INSTRUCTIONS], [ROADMAP], [API_SPEC], {ISSUE_TRACKER}, README.md, and relevant docs/ folders). Then, based on your expertise as a [division] agent, list your Top 10 critical recommendations: what to change in the product, what to improve in inter-agent operations, and what you need to improve in yourself."
- The agent's recommendations should be captured in the orchestrator's progress report
- Actionable recommendations get added to {ISSUE_TRACKER} or memory as appropriate
