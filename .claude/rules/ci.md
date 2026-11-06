---
paths:
  - ".github/**"
  - "RULES.json"
  - ".claude/**"
---

# CI, the gate and the rules (.github/, RULES.json, .claude/)

Read docs/deploy.md and the comments at the top of each workflow first.

- The merge bot merges only when nothing visible changes; a PR that touches .github/workflows/merge.yml or
  .github/ci/merge-bot.mjs waits for the owner (merge-rights).
- The gate compares base's and head's builds (.github/ci/served.sh, areas.mjs); a check of a served file reads the
  build (build/site), never site/.
- RULES.json: every rule's enforcement must exist; rules_check.py proves it (npm run check:quick runs it).
- A hook that enforces a rule cites it as RULES.json "<id>" and is run by .claude/settings.json.
