#!/usr/bin/env bash
# Fetch the full source fonts for derekzhou.com — manual tooling, not a
# build step. Geist and Geist Mono (Vercel with basement.studio, SIL Open
# Font License 1.1: free to self-host and subset), from Vercel's own
# package. Then run ./subset-fonts.sh to cut the served subsets.
set -euo pipefail
mkdir -p "$(dirname "$0")/assets/fonts"
cd "$(dirname "$0")/assets/fonts"
VERSION=1.7.2
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
curl -fsSL "https://registry.npmjs.org/geist/-/geist-$VERSION.tgz" | tar xz -C "$tmp"
cp "$tmp/package/dist/fonts/geist-sans/Geist-Variable.woff2" .
cp "$tmp/package/dist/fonts/geist-mono/GeistMono-Regular.woff2" .
cp "$tmp/package/LICENSE.txt" OFL.txt
ls -l Geist-Variable.woff2 GeistMono-Regular.woff2 OFL.txt
