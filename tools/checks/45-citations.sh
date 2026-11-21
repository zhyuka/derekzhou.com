#!/usr/bin/env bash
# check: No author-style citation in a tracked file
# kind: fast
# enforces: naming
# plant: {"file": "docs/structure.md", "find": "# Structure\n", "with": "# Structure (after Smith et al. 2020)\n", "why": "an author-style citation (et al.)"}
# plant: {"file": "docs/structure.md", "find": "# Structure\n", "with": "# Structure (Smith & Jones 2019)\n", "why": "an author-style citation (Name & Name YEAR)"}
# (CI lane, 2026-11-15) the owner's naming rule has no exemption, not even a licence's credit: a credit is its DOI or
# URL, never its authors (tools/checks/lib/citations.mjs; check-quick.mjs runs it too)
node tools/checks/lib/citations.mjs .
