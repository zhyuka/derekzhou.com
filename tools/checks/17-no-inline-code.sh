#!/usr/bin/env bash
# check: No inline code on CSP'd pages
# (moved verbatim from validate.yml; run from the repository root by tools/check.mjs, in bash -eo pipefail)
cd build/site
# The site-wide CSP has no unsafe-inline; inline styles, style
# blocks, and inline event handlers silently do nothing. Fail
# fast instead. (JSON-LD script blocks are exempt from
# script-src and allowed.)
if grep -niE 'style[[:space:]]*=[[:space:]]*"|<style|[[:space:]]on[a-z]+[[:space:]]*=[[:space:]]*"' index.html 404.html; then
  echo "::error::Inline style/handler found — blocked by CSP"
  exit 1
fi
# and no inline script but the JSON-LD block
if grep -nE '<script(>|[[:space:]][^>]*>)' index.html 404.html | grep -vE 'src="/|type="application/ld\+json"'; then
  echo "::error::Inline script found — blocked by CSP"
  exit 1
fi
echo "No inline code"
