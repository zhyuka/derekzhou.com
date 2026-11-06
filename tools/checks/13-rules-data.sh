#!/usr/bin/env bash
# check: The rules are data, and the hooks hold
# (moved verbatim from validate.yml; run from the repository root by tools/check.mjs, in bash -eo pipefail)
# RULES.json is every standing rule as data: valid, ids unique, and every CI step, world_rules.py rule,
# absence block and hook it names exists. Then the project's hooks (.claude/hooks/guard.py: no push to main,
# no force push, no merge, no banned name) pass their own tests, and no tracked file holds a banned name.
python3 .github/workflows/rules_check.py
python3 .claude/hooks/test_guard.py
python3 .claude/hooks/guard.py --scan   # (no tracked file holds a banned name: names.json's salted hashes)
