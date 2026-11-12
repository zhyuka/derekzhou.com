# JS

<!-- Moved word for word from CLAUDE.md's section "JS" (restructure step 7, 2026-11-06). -->

The scripts, one job each, in this order (CI step "The world's page
loads in order" and world_rules.py's rule 5; every script tag carries
data-cfasync="false", so Rocket Loader leaves the order as served):

1. hour.js — in the head, before the first paint (tiny,
   Early-Hinted): which time of day the world opens on (data-sky,
   data-sky-at) and the browser's bar.
2. site.js — email obfuscation: HTML has href="#" id="email-link", JS
   assembles mailto from split parts at runtime so bots cannot scrape the
   address. A \<noscript\> fallback shows the email in HTML entities.
2b. sound.js — the sound icon's switch (src/sound.js, minified; parser-blocking
   right after site.js, so the icon shows before the first paint): shows the icon,
   adds its one click handler, and at the first press makes the audio context,
   fetches its one sheet of notes, from /assets/sound/, and hands both to the score
   (score.js, the last script: deferred, low priority), which plays live, following the
   sky (docs/sound.md).
3. world.js — the world (parser-blocking after the footer, for the
   first-paint hold; fetchpriority="high"; minified). As its script ends it
   starts the plan's worker, plan.js, by name (no tag: docs/world.md, ## BOOT).
4. realm-kit.js, realm-dunes.js, realm-above.js — the kits
   (parser-blocking, fetchpriority="high", minified; each registers
   itself with WORLD.realm; keep the order: the last one's registration
   runs the hold while the page still parses, or, where there is no hold,
   the boot starts a frame after they have registered).
   The head's link rel=expect href=#world-end blocking=render holds
   Chromium's first paint until the empty, hidden marker
   <div id="world-end" hidden> right after realm-above.js is parsed; hour.js
   takes it out where the hold is skipped, the world where its checks
   skip it.
5. facetform.js, facetpose.js, wingmodel.js, model.js, labbird.js,
   birdwing.js — the ink birds' wing model (src/birds/model/; deferred,
   fetchpriority="low", in that order; each puts its one global on self).
6. inkbirds.js — the ink birds (deferred, fetchpriority="low", last,
   minified: they take the sky whenever they come).

Progressive enhancement throughout: with JS off, the page is the
typography on the still day sky.
