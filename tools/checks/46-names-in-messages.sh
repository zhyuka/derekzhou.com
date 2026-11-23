#!/usr/bin/env bash
# check: No banned name in a commit message or the PR's title or body
# kind: fast
# enforces: naming
# plant: {"file": ".claude/hooks/guard.py", "find": "--selftest-messages", "with": "--selftest-messages", "why": "self-proved: --selftest-messages plants a name in a commit message, the PR title and its body, and wants each caught", "self": true}
# (the hygiene lane, 2026-11-16) RULES.json "naming" covers commit messages and the PR's title and body, not only
# files: the merge bot fast-forwards a PR's own commits onto main. Every commit from the merge base with origin/main to
# HEAD, and the title and body in the Actions event file, are checked against .claude/hooks/names.json (the one list,
# salted hashes; the hook and guard.py --scan read it too).
python3 .claude/hooks/guard.py --selftest-messages
python3 .claude/hooks/guard.py --messages
