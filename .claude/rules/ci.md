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
- Linux jobs run on GitHub-hosted `ubuntu-latest` (the repository is public: free). Only real-GPU jobs (gpu.yml T2/T3,
  stills.yml bake/up) use the PC's self-hosted runner. A `pull_request` job that reaches the PC, and every
  `pull_request_target` or `workflow_run` job, skips unless the head repository is this one (test/unit/fork-guard.mjs;
  docs/deploy.md, "Where CI runs").
- RULES.json: every rule's enforcement must exist; rules_check.py proves it (npm run check:quick runs it).
- A hook that enforces a rule cites it as RULES.json "<id>" and is run by .claude/settings.json.
