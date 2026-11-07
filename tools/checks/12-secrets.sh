#!/usr/bin/env bash
# check: No secrets in code
# kind: fast
# (moved verbatim from validate.yml; run from the repository root by tools/check.mjs, in bash -eo pipefail)
# Scan for common secret patterns in tracked files
# plant: {"file": "docs/content.md", "find": "# Content", "with": "# Content \u0067hp_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "why": "a GitHub token in a tracked file"}
patterns=(
  'AKIA[0-9A-Z]{16}'
  'sk-[a-zA-Z0-9]{20,}'
  'ghp_[a-zA-Z0-9]{36}'
  'password\s*[:=]\s*["\x27][^"\x27]{8,}'
)
found=0
for pattern in "${patterns[@]}"; do
  # (check-speed: git grep over the tracked files, as this check's comment says: 1.6 -> 0.1 s; plain grep where there is no git)
  if { git rev-parse --is-inside-work-tree >/dev/null 2>&1 && git grep -nE "$pattern" -- '*.html' '*.css' '*.js' '*.json' '*.yml' '*.yaml' '*.md' '*.txt'; } || { ! git rev-parse --is-inside-work-tree >/dev/null 2>&1 && grep -rEn "$pattern" --include='*.html' --include='*.css' --include='*.js' --include='*.json' --include='*.yml' --include='*.yaml' --include='*.md' --include='*.txt' . 2>/dev/null | grep -v node_modules; }; then
    echo "POTENTIAL SECRET found matching: $pattern"
    found=1
  fi
done
if [ "$found" -eq 1 ]; then
  echo "::error::Potential secrets detected in source files"
  exit 1
fi
echo "No secrets found"
