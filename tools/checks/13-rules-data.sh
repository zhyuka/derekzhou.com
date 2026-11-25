#!/usr/bin/env bash
# check: The rules are data, and the hooks hold
# enforces: naming
# apart: 35-birds (test_guard.py times a hook, at most 500 ms: beside 35-birds' 20 processes it took 1059 ms)
# (moved verbatim from validate.yml; run from the repository root by tools/check.mjs, in bash -eo pipefail)
# RULES.json is every standing rule as data: valid, ids unique, and every CI step, world_rules.py rule,
# absence block and hook it names exists. Then the project's hooks (.claude/hooks/guard.py: no push to main,
# no force push, no merge, no banned name) pass their own tests, and no tracked file holds a banned name.
# plant: {"file": "RULES.json", "find": "\"id\": \"script-order\"", "with": "\"id\": \"script order\"", "why": "a rule id that is not kebab-case"}
python3 tools/checks/lib/rules_check.py
python3 .claude/hooks/test_guard.py
python3 .claude/hooks/guard.py --scan   # (no tracked file holds a banned name: names.json's salted hashes)
