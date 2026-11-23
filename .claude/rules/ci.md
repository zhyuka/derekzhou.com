---
paths:
  - ".github/**"
  - "RULES.json"
  - ".claude/**"
---

# CI, the gate and the rules (.github/, RULES.json, .claude/)

Read docs/deploy.md and the comments at the top of each workflow first.

- The merge bot merges when nothing visible changes, or when the hub has reviewed the PR's head commit (the line
  <!-- hub-review SHA --> in its body), visible changes and the bot's own files included (merge-rights; the owner, 2026-11-23).
- The gate compares base's and head's builds (.github/ci/served.sh, areas.mjs); a check of a served file reads the
  build (build/site), never site/.
- Every job runs on GitHub-hosted `ubuntu-latest`, none on the owner's PC; test/unit/fork-guard.mjs fails on a
  self-hosted job. Every `pull_request_target` or `workflow_run` job skips unless
  the head repository is this one (docs/deploy.md, "Where CI runs").
- RULES.json: every rule's enforcement must exist; rules_check.py proves it (npm run check:quick runs it).
- A hook that enforces a rule cites it as RULES.json "<id>" and is run by .claude/settings.json.
