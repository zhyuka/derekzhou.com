#!/usr/bin/env bash
# check: security.txt not expired
# kind: schedule
# (dev-speed: weekly, .github/workflows/scheduled.yml, not on every PR: from 2027-03-08 it would fail them all)
# (moved verbatim from validate.yml; run from the repository root by tools/check.mjs, in bash -eo pipefail)
exp=$(grep -oP 'Expires: \K.*' site/.well-known/security.txt)
if [ "$(date -d "$exp" +%s)" -le "$(date +%s)" ]; then
  echo "::error::security.txt Expires ($exp) is in the past — update it"
  exit 1
fi
echo "security.txt valid until $exp"
