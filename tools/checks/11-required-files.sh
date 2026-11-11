#!/usr/bin/env bash
# check: Check required files exist
# enforces: served-only-site
# (moved verbatim from validate.yml; run from the repository root by tools/check.mjs, in bash -eo pipefail)
# The site is built from the folder site/ (tools/build.mjs; Cloudflare Pages serves the build): every file
# it serves is in the build (build/site/), and nothing of the repository's own (CLAUDE.md, .github/, the
# font scripts) is in site/.
# plant: {"create": "site/notes.md", "why": "a repository file in site/"}
cd site
files=(
  index.html
  style.css
  site.js
  sound.js
  hour.js
  world.js
  realm-kit.js
  realm-dunes.js
  realm-above.js
  facetform.js
  facetpose.js
  wingmodel.js
  model.js
  labbird.js
  birdwing.js
  inkbirds.js
  robots.txt
  _headers
  _redirects
  404.html
  assets/favicon.png
  assets/favicon.svg
  assets/apple-touch-icon.png
  assets/fonts/Geist-400-500.sub3.woff2
  assets/fonts/GeistMono-Regular.sub3.woff2
  assets/sound/score-1.mp3
  assets/fonts/OFL.txt
  .well-known/security.txt
)
missing=0
for f in "${files[@]}"; do
  if [ ! -f "../build/site/$f" ]; then
    echo "MISSING: $f (not in the build)"
    missing=1
  else
    echo "OK: $f"
  fi
done
# site/ holds only the kinds of file the site serves (pages, styles, scripts, fonts, images, robots.txt,
# security.txt, the fonts' licence, Pages' _headers, _redirects, _routes.json), at any depth; the
# repository's root holds only its own (.github/, .gitignore, CLAUDE.md, the font scripts, site/, and a
# functions/ folder, where Pages looks for one). A new kind of file is a deliberate change to these lists.
while IFS= read -r f; do
  case "$f" in
    */.git/*|*/.github/*|./.git|./.gitignore) echo "::error::site/${f#./} is the repository's own: it would be served"; missing=1; continue ;;
  esac
  case "$f" in
    *.html|*.css|*.js|*.woff2|*.png|*.svg|./assets/sound/*.mp3|./robots.txt|./.well-known/security.txt|./assets/fonts/OFL.txt|./_headers|./_redirects|./_routes.json) ;;
    *) echo "::error::site/${f#./} is not a kind of file the site serves (the repository's own files stay outside site/)"; missing=1 ;;
  esac
done < <(find . -type f | sort)
for f in ../* ../.[!.]*; do
  [ -e "$f" ] || continue
  case "${f#../}" in
    .git|.github|.gitignore|CLAUDE.md|download-fonts.sh|subset-fonts.sh|site|functions) ;;
    .gitattributes|package.json|package-lock.json|node_modules|src|tools|build|test) ;;
    RULES.json|.claude|docs) ;;   # (docs/: the full record, one file per area, CLAUDE.md the short version)   # (the standing rules as data, and the project's hooks: never served)   # (the build: src/ the readable scripts, in parts; build/ src/ assembled (tools/parts.mjs); tools/minify.mjs, terser pinned; node_modules only after npm ci)
    *) echo "::error::${f#../} is at the repository's root: what the site serves goes in site/ (or add it to the root's list here)"; missing=1 ;;
  esac
done
if [ "$missing" -eq 1 ]; then
  exit 1
fi
