#!/usr/bin/env bash
# check: No inline code on CSP'd pages
# enforces: csp-scoping
# (moved verbatim from validate.yml; run from the repository root by tools/check.mjs, in bash -eo pipefail)
# plant: {"file": "build/site/index.html", "find": "<main>", "with": "<script>1</script><main>", "why": "an inline script"}
# plant: {"file": "build/site/index.html", "find": "id=\"score-slot\"></script>", "with": "id=\"score-slot\">1</script>", "why": "the score's slot with code in it"}
cd build/site
# The site-wide CSP has no unsafe-inline; inline styles, style
# blocks, and inline event handlers silently do nothing. Fail
# fast instead. (JSON-LD script blocks are exempt from
# script-src and allowed.)
if grep -niE 'style[[:space:]]*=[[:space:]]*"|<style|[[:space:]]on[a-z]+[[:space:]]*=[[:space:]]*"' index.html 404.html; then
  echo "::error::Inline style/handler found — blocked by CSP"
  exit 1
fi
# and no inline script but the JSON-LD block (and, 2026-11-07, the score's slot: an empty script, no text, given its
# src by sound.js inside the visitor's press; the score is then fetched from 'self', as every script is)
if grep -nE '<script(>|[[:space:]][^>]*>)' index.html 404.html | grep -vE 'src="/|type="application/ld\+json"' | grep -vxE 'index\.html:[0-9]+:  <script data-cfasync="false" id="score-slot"></script>'; then
  echo "::error::Inline script found — blocked by CSP"
  exit 1
fi
echo "No inline code"
