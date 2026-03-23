---
name: No questions - work in rounds until complete
description: Never ask permission to proceed - work autonomously in fix rounds through full completion pipeline
type: feedback
---

Never ask "should I start?" or any variant. Work in rounds until ALL of these are done:
1. Code fix (all rounds)
2. Documentation ({ISSUE_TRACKER})
3. Git commit
4. Build + deploy containers
5. Test user auth verification
6. Full test suite
7. Push to remote

**Why:** User explicitly said they don't want questions — just work in rounds. This is part of the protocol.
**How to apply:** After diagnosis, immediately start fix rounds. After fix rounds, immediately run the full completion pipeline. Never pause to ask.
