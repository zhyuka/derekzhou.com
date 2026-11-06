#!/usr/bin/env bash
# check: The deploy's inputs are all listed
# kind: fast
# (moved verbatim from validate.yml; run from the repository root by tools/check.mjs, in bash -eo pipefail)
# .github/ci/deploy-inputs.txt is what Cloudflare Pages' build reads: post-deploy.yml finds the live commit by
# it, and the Pages build watch paths are the same list. A tool the build loads but the list leaves out would
# be a change Pages never builds.
node .github/ci/deploy-inputs.mjs --check
