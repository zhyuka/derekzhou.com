#!/usr/bin/env bash
# check: Asset references must resolve (immutable-rename integrity)
# (moved verbatim from validate.yml; run from the repository root by tools/check.mjs, in bash -eo pipefail)
cd build/site
# Changed bytes require renamed files; this catches a rename that
# missed a reference. Every local href/src in the HTML and every
# path in _headers Link/cache rules must exist in the site.
fail=0
refs=$(grep -ohE '(href|src)="/[^"#]+"' index.html 404.html | sed -E 's/^(href|src)="//; s/"$//')
refs="$refs $(grep -oE 'Link: <[^>]+>' _headers | sed -E 's/Link: <//; s/>//')"
refs="$refs $(grep -oE '^/[A-Za-z0-9._-]+\.(css|js|woff2|svg|png)$' _headers)"
for ref in $refs; do
  if [ ! -f ".${ref}" ]; then
    echo "::error::Reference $ref does not exist as a file"
    fail=1
  else
    echo "OK: $ref"
  fi
done
# And the reverse: the css/js the page loads by name must be the
# ones index.html loads, each with its immutable cache block (a
# leftover old version, kept by a copy rather than a git mv, fails).
for f in style.css hour.js start.js world.js realm-*.js facetform.js facetpose.js wingmodel.js model.js labbird.js birdwing.js inkbirds.js; do
  if [ -f "$f" ] && ! grep -q "\"/$f\"" index.html; then
    echo "::error::$f exists but index.html does not reference it"
    fail=1
  fi
  if [ -f "$f" ] && ! grep -qx "/$f" _headers; then
    echo "::error::$f has no immutable cache block in _headers"
    fail=1
  fi
done
# Every script and stylesheet anywhere in the site is one the pages
# load (nothing left over from the world's development build: no
# diagnostics, no lab, no test realm). (Their names need no version:
# the deploy build serves each under its content's hash, tools/build.mjs.)
for f in $(find . -type f \( -name '*.js' -o -name '*.css' \) | sed 's|^\./||' | sort); do
  if ! grep -qE "(src|href)=\"/$f\"" index.html 404.html && ! { case "$f" in plan.js) grep -q "new Worker(./$f.)" world.js;; start-table.js) grep -qF "new Worker('/$f')" start.js;; *) false;; esac; }; then   # (fast500 step 11: the plan's worker is loaded by the world, by name)
    echo "::error::$f is shipped but no page loads it"
    fail=1
  fi
done
[ "$fail" -eq 0 ] && echo "All references resolve"
exit $fail
