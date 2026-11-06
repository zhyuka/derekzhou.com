---
paths:
  - "src/world/**"
  - "src/realm-*.js"
  - "src/glsl/**"
  - "src/dev/**"
  - "tools/plan.mjs"
  - "tools/start.mjs"
---

# The world (src/world/, the realms, their shaders)

Read docs/world.md first (and docs/verify.md before anything visible ships).

- Edit a section file (src/world/NNN-slug.js); a new section is a new NNN between two others. A shader lives in its
  folder's glsl/NAME.glsl, `@glsl NAME` in the code. src/dev/ is the dev build only: give a dev part a stub
  (NNN-slug.ship.js) beside the world's parts.
- Never darken the background, never fade, never mask a bird, never read the words (no-darkening, no-fades,
  no-masking-boxes; W7 and world_rules.py check them).
- One entropy read above INIT-END; no clock but clockNow(); no Date or Math.random; listeners only in the world, by
  name (one-entropy-one-clock, absence-*).
- A shader's text changed: update the golden texts and glsl_manifest.txt in the same commit (same-shaders; the
  commands are in CLAUDE.md, Making a change).
- The plan's spans changed (the maps, the director, MAPS/mapsInit/kitAt, the weights' grids): node tools/plan.mjs
  --stamp, and node --test test/unit.mjs (the worker must still equal the page's plan).
- Forced colours: read them from the world's own media query list (forced()), never from the one it listens on (in
  Chromium a read takes up the change and its event never fires: the world did not come back when they ended); while
  they hold from the load no render target of the world's is made (docs/world.md, FALLBACKS). tools/gpu/forced-off.js
  (T2's job) checks the world comes back.
- npm run check:quick after each edit; node --test test/unit.mjs before a PR.
