#!/usr/bin/env bash
# check: Validate HTML
# (moved verbatim from validate.yml; run from the repository root by tools/check.mjs, in bash -eo pipefail)
# Basic HTML validity checks
file="site/index.html"

# Must start with doctype
if ! head -1 "$file" | grep -qi '<!doctype html>'; then
  echo "::error::Missing <!DOCTYPE html>"
  exit 1
fi

# Check required tags exist
for tag in '<html' '<head' '</head>' '<body' '</body>' '</html>'; do
  if ! grep -qi "$tag" "$file"; then
    echo "::error::Missing $tag in $file"
    exit 1
  fi
done

# Check charset meta
if ! grep -qi 'charset.*utf-8' "$file"; then
  echo "::error::Missing charset utf-8 meta tag"
  exit 1
fi

# Check viewport meta
if ! grep -qi 'viewport' "$file"; then
  echo "::error::Missing viewport meta tag"
  exit 1
fi

# Check title
if ! grep -qi '<title>' "$file"; then
  echo "::error::Missing <title> tag"
  exit 1
fi

# Check for unclosed tags (basic)
# The open pattern requires a delimiter after the tag name so that
# <head> is not also matched by <header>, <main> by <mainbar>, etc.
for tag in html head body main; do
  opens=$(grep -oiE "<$tag([[:space:]>]|$)" "$file" | wc -l)
  closes=$(grep -oi "</$tag>" "$file" | wc -l)
  if [ "$opens" -ne "$closes" ]; then
    echo "::error::Mismatched <$tag> tags (open=$opens, close=$closes)"
    exit 1
  fi
done

echo "HTML validation passed"
