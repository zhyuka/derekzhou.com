# JS

<!-- Moved word for word from CLAUDE.md's section "JS" (restructure step 7, 2026-11-06). -->

The scripts, one job each, in this order (CI step "The world's page
loads in order" and world_rules.py's rule 5; every script tag carries
data-cfasync="false", so Rocket Loader leaves the order as served):

1. hour.js — in the head, before the first paint (tiny,
   Early-Hinted): which time of day the world opens on (data-sky,
   data-sky-at) and the browser's bar.
2. start.js — the start file (async, fetchpriority="high",
   Early-Hinted, the first script after the canvas and the only async
   one): the world's context and its first frame's programs, issued once
   the page has painted, from its table (start-table.js, a worker's
   script it starts after the first paint; see World: BOOT); made by
   tools/start.mjs from src/, never by hand.
3. site.js — email obfuscation: HTML has href="#" id="email-link", JS
   assembles mailto from split parts at runtime so bots cannot scrape the
   address. A \<noscript\> fallback shows the email in HTML entities.
4. world.js — the world (deferred, fetchpriority="high", Early-Hinted,
   first of the deferred; minified). As its script ends it starts the
   plan's worker, plan.js, by name (no tag: see World: BOOT).
5. realm-kit.js, realm-dunes.js, realm-above.js — the kits
   (deferred, fetchpriority="high", Early-Hinted, minified; each registers
   itself with WORLD.realm; keep the order: the boot starts a frame after
   they have registered).
6. facetform.js, facetpose.js, wingmodel.js, model.js, labbird.js,
   birdwing.js — the ink birds' wing model (src/birds/model/; deferred,
   fetchpriority="low", in that order; each puts its one global on self).
7. inkbirds.js — the ink birds (deferred, fetchpriority="low", last,
   minified: they take the sky whenever they come).

Progressive enhancement throughout: with JS off, the page is the
typography on the still day sky.
