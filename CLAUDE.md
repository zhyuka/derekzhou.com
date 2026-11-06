# derekzhou.com

Derek Zhou's one-page site: his name, one line, a credit row and two links,
over a world drawn live behind them in WebGL2 (land, cloud, light, a sky
that changes, ink birds crossing it). Pure HTML, CSS and JS, no frameworks.
The owner is Derek; every change reaches the live site through a pull request.

This file is the short version. The full record is in docs/ (moved there
word for word, 2026-11-06); read the doc for the area you touch before you
change it. The standing rules are data in RULES.json, checked in CI.

## The owner's rules (RULES.json has each one, its source and its check)

- Never darken the background, anywhere, ever: no lift, veil, floor or cap
  for the words; the composite takes no words input (no-darkening, W7).
- The words are always light, on every sky (light-words-only).
- Nothing masks a bird for the words; the ink birds are the only birds
  (no-masking-boxes, no-2d-birds).
- No fades anywhere: no keyframes, no transitions, no fading sun, moon or
  bird (no-fades). Nothing glitters (no-glitter).
- Reduced motion is one still frame; only a drag steers (reduced-motion-still,
  steer-only-by-drag).
- One entropy read, one clock; only the opening sky depends on the visitor's
  hour (one-entropy-one-clock, opening-sky-by-clock-only).
- The absences: no chrome vocabulary, no hover/idle/key/exit handlers (but the
  birds' two passive pointer listeners, in hoverSync: docs/birds.md), no JS-made DOM, no network, sound, eval, URL hooks or cursor rules, no dev
  hooks in shipped code (absence-*).
- The page says exactly its words (page-words, lettered-name).
- Licences: MIT, BSD, Apache, ISC, zlib, Unlicense or CC0 only (licences).
- Never name, in the repository, a commit or a PR, the reference game, its
  studio, a painter or any person but the owner (naming; hooks enforce it).
- Never push to main, never force-push, never delete a remote branch, never
  merge: the owner merges, or the merge bot when nothing visible changes
  (merge-rights, git-safety; hooks enforce it).

## Layout

```
site/          what is served as written: index.html, 404.html, style.css,
               site.js, hour.js, _headers, _redirects, fonts, icons
src/           the scripts the build minifies: src/world/ (the world, in
               NNN-slug.js sections), src/realm-*.js, src/birds/inkbirds/,
               src/birds/model/ (the wing model, served as written),
               src/**/glsl/ (each shader as NAME.glsl), src/dev/ (dev build only)
tools/         build.mjs (the build), parts.mjs (assemble src/), minify.mjs,
               start.mjs (the start file), plan.mjs (the plan's worker),
               check-quick.mjs, dup-names.mjs (no name declared twice in
               one scope), gpu/ (the PC's T2/T3), birds/ (generators)
test/          unit.mjs (pure code), shaders.mjs (every shader compiles),
               golden/
docs/          the full record, one file per area (below)
.github/       validate.yml (every static check), gate.yml (T0/T1/T2 and the
               verdict), merge.yml (the merge bot), post-deploy.yml, ci/
RULES.json     the standing rules as data; .claude/ the hooks and path rules
```

Built, never committed: world.js, realm-kit.js, realm-dunes.js,
realm-above.js, inkbirds.js, start.js, start-table.js, plan.js. CI fails if
one is committed to site/ (built-files-uncommitted).

## Making a change

1. Edit the source: a section in src/world/NNN-slug.js (a new section is a
   new NNN between two others), a realm in src/, a shader in its .glsl, a
   served-as-written file in site/. Never edit a build output.
2. Check it:
   - `npm ci --no-audit --no-fund --ignore-scripts` once.
   - `npm run check:quick`: a few seconds (assembles src/, the plan's stamp,
     syntax, no name declared twice in one scope, RULES.json, no built file
     in site/). The Stop hook runs it when
     sources changed.
   - `node tools/build.mjs --plain build/site`: the build CI checks.
   - `node --test test/unit.mjs` (about 10 s); after a deliberate change to
     what it pins, `node test/unit.mjs --write`.
   - A shader changed: nothing derived to commit; the gate's census and
     T2 compare the base's build with the head's.
   - The plan's spans changed: `node tools/plan.mjs --stamp`.
   - `node tools/build.mjs --check`: two builds the same bytes.
   - Every `run:` step of validate.yml, in `bash -eo pipefail` from the
     root, is what CI runs.
3. Anything a visitor sees: measure it as docs/verify.md says (stills,
   contrast, the W7 twin, reduced motion, no WebGL2, a real iPhone).

Names: source names are plain (world.js, style.css). The deploy build
serves every script and the stylesheet under its content's hash, so no one
bumps a version for a change; fonts and images are renamed by hand
(changed-bytes-new-name, docs/caching.md).

## Shipping

- Branch `claude/<topic>`; open a PR against main (not a draft once ready).
- The gate (gate.yml): validate.yml's checks; the plan job builds base and
  head and compares them; the shader census; T1 (software frames, base
  against head); T2 on the owner's RTX 4090 when the world's code or a
  shader changed. Read the gate's verdict, not one job's.
- The merge bot (merge.yml, .github/ci/merge-bot.mjs) merges a ready
  claude/* PR when its own gate is green and frames are identical (the served
  build byte for byte the base's, or every T1/T2 frame the same, and no
  input handling changed), with no global lock: it lands every such PR whose
  areas main has not touched since its gate's base, and re-gates only one that
  overlaps; never one that touches the bot itself or is labelled needs-owner
  or visible. Anything visible waits for the owner: he lands it by GitHub's
  auto-merge, once, or its button (docs/deploy.md). Main's gate tests every
  merge after it lands; the bot then fast-forwards `live` to the newest main
  tip whose gate is green (and frames identical, or the owner's own merge).
- Cloudflare Pages builds `live` (`npm ci --no-audit --no-fund
  --ignore-scripts && node tools/build.mjs dist`, output `dist`, Node 22);
  post-deploy.yml then smokes the live site (/build.txt names the newest
  commit that touched a deploy input: .github/ci/deploy-inputs.txt).

## Where to read more (docs/)

| doc | read it before you touch |
|---|---|
| docs/structure.md | the files, the build, src/ parts, the dev build |
| docs/content.md | the page's words, the credit row, the links |
| docs/design.md | the look: the owner's briefs, verbatim |
| docs/world.md | src/world/, the realms, the sky, the plan, the start file |
| docs/birds.md | src/birds/ (the ink birds and the wing model) |
| docs/css.md, docs/js.md, docs/type.md | site/style.css, site.js, the lettering |
| docs/fonts-performance.md | fonts, subsets, load budget |
| docs/caching.md | _headers' caching, names, the shader cache |
| docs/security.md | CSP, _headers, Access, what is served |
| docs/licences.md, docs/seo.md | dependencies, assets; meta and JSON-LD |
| docs/verify.md | what to measure before a visible change ships |
| docs/deploy.md | Cloudflare Pages, CI minutes |

.claude/rules/ loads the short rules for an area when its files are read
or edited (src/world/, src/birds/, site/, .github/).

The comments in src/ cite the world's development record (design-v5,
rounds, fixes, notes.md and the like), which lives outside this
repository: a file they name is not missing here.
