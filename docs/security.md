# Security

<!-- Moved word for word from CLAUDE.md's section "Security" (restructure step 7, 2026-11-06). -->

All content directly in HTML. No innerHTML. No JS-generated DOM:
the canvas, the stack and the footer are all in index.html. The
lettered name is an inline SVG in index.html (one path; no text,
script, style, link or paint server in it), and CI step "The
lettered name keeps its words" fails if the h1 loses its visually hidden
words, the drawing loses aria-hidden or grows anything but its one
currentColor path, or the stylesheet stops reserving its box.
External JS and CSS files (enables strict CSP with no unsafe-inline —
CI greps index.html and 404.html for inline style, handlers and script).
site/\_headers: script-src 'self' https://static.cloudflareinsights.com;
style-src 'self'; connect-src https://cloudflareinsights.com
https://derekzhou.com/cdn-cgi/rum; frame-ancestors 'none'; form-action 'none'; HSTS with preload;
COOP + CORP same-origin; Referrer-Policy no-referrer; broad
Permissions-Policy denial (the accelerometer and the gyroscope included:
Android's phone-motion steering would need accelerometer=(self),
gyroscope=(self) on /*, a choice for the owner); X-Permitted-Cross-Domain-
Policies none. The world needs one CSP addition, for the plan's worker:
worker-src 'self' on the two home blocks that start it (/ and /index.html;
404.html starts none), and the worker's response its own policy, its
block in \_headers (/plan.js: immutable, default-src 'none'; a
worker's policy is its script's headers, not the page's, and no other
rule sets one on that path). The start file's table runs as a second
worker under the same worker-src (/start-table.js: immutable,
default-src 'none'; it posts the programs' sources and closes).
Otherwise WebGL2 from same-origin scripts, those two workers, no blobs,
no fetches, no eval; the site's own code
is blind (no telemetry, no beacon, no store). The one exception is
Cloudflare Web Analytics (the owner, 2026-11-03: "yes we need
analytics"): cookieless, injected by Cloudflare, not in this repo, its
script from static.cloudflareinsights.com (script-src) reporting to
the site's own /cdn-cgi/rum (on a proxied zone the injected beacon
posts there, not to cloudflareinsights.com, which stays allowed too):
connect-src names that one path, not 'self', and nothing else. Cloudflare's
JavaScript Detections (Bot Fight Mode) also injects an inline script;
the CSP still blocks it (its hash changes every request), and turning
it off is a dashboard choice for the owner.
CI checks that security.txt has not expired.
CI step "Absences are enforced" (scoped to index.html, 404.html, site.js,
hour.js, start.js and its table start-table.js, the five minified scripts as written (src/'s
world.js, the kits and inkbirds.js), the wing model, plan.js,
plus style.css for cursors and a bird rule, and \_headers for a bird
script's name — never to this prose) fails on:
arrows/cookie/analytics/Loading/navigation-role vocabulary in the HTML;
any exit, idle, hover-position, key, blur, title, favicon-swap or storage
handler in the JS (a pointer's moves read only by the world's drag: its
one pointermove listener added in onDown and removed in endDrag); any DOM
building; more or fewer than one getRandomValues in the world, or one
below its INIT-END marker, and none at all, nor any clock read, in the
kits, the wing model, the ink birds, the start file or the plan's worker;
any Math.random or clock read (Date) in the world; performance.now()
but the world's one clockNow; anything in the hour but its one `new
Date(`; any URL hook (location., URLSearchParams), sound, network call
or eval, and any worker but the plan's (one, started by the world by its
literal name) and the start file's table (one, start-table.js, started
by the start file by its literal name); any dev or record hook (window.__*, window.claude,
console) or an attribute read on `<html>` but the hour's data-sky and
data-sky-at; and any `cursor:` rule in the stylesheet (OS cursors
only). And the old 2D birds stay retired (absence 7): it fails on a
birds.vN.js in site/ or src/; on a bird class (bird in any class list,
in either quotes), a polyline or a birds.vN.js named in index.html,
404.html or \_headers; on a .bird rule or a [class=bird] selector in the
stylesheet; or on skyAir, SKYAIR, handover, handTo, HASSVG, DISSOLVE_S,
bootWaitWhy or handoverToldMs in any script; CI step "The world's page
loads in order" fails on a bird class or a polyline in the page too.
CI step "The world's rules" (world_rules.py) adds: every script tag
tagged for Rocket Loader; every home-scope CSP (and 404.html's meta)
with exactly script-src 'self' https://static.cloudflareinsights.com and
connect-src https://cloudflareinsights.com
https://derekzhou.com/cdn-cgi/rum, and none on /*; no diagnostics,
control or lab page; the world's
listeners only in world.js and only by name (its two on the plan's
worker, its answer and its failure, one each); the script order (the
world and the kits first, fetchpriority high, then the wing model and
the ink birds, low; the start file the one async script, high, right
after the canvas); the plan's worker (rule 2b: at most one, plan.js,
by its literal name; its block in \_headers exactly its immutable cache
and default-src 'none', worker-src exactly 'self' where it is started;
its code the world's own spans verbatim, stamped with their md5; rule 4:
pure arithmetic, no DOM, window, storage, network, entropy or clock, one
listener, message, and two postMessage calls, its answer and its refusal);
the start file (rule 4b: no DOM building, URL hook, storage, sound,
module or network; one worker, its table, by its literal name; no
entropy, clock or timer, and requestAnimationFrame only twice, the two
frames where paint timing is missing; two listeners, webglcontextlost
and the table worker's message; nothing put on window but WORLD_START;
its table data only: one postMessage of the sources and two lists of
numbers, then close);
the scripts' text read from src/ (world_rules.py site build/src); and the
owner's rule as code: the composite takes no words input (its uniforms a
fixed list: a new one is a deliberate change there), the old lift's parts
are named nowhere, no keep-off or words' mask is named anywhere and the
ink birds sample only their fixed list (the owner, 2026-11-05: no
masking boxes), and nothing is
drawn onto the canvas after the composite but what is named. CI step
"Nothing darkens (W7's unit test)" runs the composite's tail in headless
WebGL2 over random grounds: every code the encode and the dither's, never
lower, never higher, and a planted lift, darkening and panel each caught.
Trusted Types is NOT enabled, deliberately: Cloudflare Rocket Loader
rewrites the script tags and re-executes them through dynamic .src
assignment — a TT sink — so require-trusted-types-for 'script' kills
every script on the page on every TT-enforcing browser (verified by
reproduction). If Rocket Loader is ever disabled in the Cloudflare
dashboard, re-add to the three home-scope CSP blocks:
  ; require-trusted-types-for 'script'; trusted-types
CSP rules are scoped per HTML path with NO overlapping rules: Cloudflare
Pages COMBINES same-named headers from every matching rule (it does not
override), and a doubled CSP means browsers enforce the intersection —
this once silently broke a page's own fetches. Never put
Content-Security-Policy on /*.
Because of that scoping, 404 responses for arbitrary paths carry no CSP
header (the /404.html rule matches only direct requests), so 404.html
carries the same policy in a meta http-equiv tag — keep the two in sync;
frame-ancestors cannot ride the meta tag, X-Frame-Options on /* covers
framing.
Nothing but the site is served: the site is the build of site/ and src/
(tools/build.mjs; dist/ is the Pages project's build output directory), and
CLAUDE.md, .github/ and the font scripts stay outside it (404 from the
site, a percent-encoded spelling such as /%43LAUDE.md too). The
repository is private (2026-11-03). Before the move Pages served the
repository's root, and /%43LAUDE.md reached this file past the
exact-path redirects of /CLAUDE.md and /.github/* (Cloudflare matches a
redirect on the raw path); those two lines left \_redirects with the
move. (Old deployments' own pages.dev links keep their old files.) Pages
also keeps, for a week after it last served one, every URL it served (its
asset-preservation cache, keyed by the exact URL; a zone purge does not
reach it) and answers from it when the deployment has no file there: so
after a file leaves the site, its old URL can still answer 200 for up to a
week. A \_redirects rule is checked first: site/\_redirects sends the
repository's old root files (/CLAUDE.md, /%43LAUDE.md, /.gitignore, the
font scripts, /.github/*) home with a 301 until those entries expire
(2026-11-12). CI
fails if site/ holds anything but the kinds of file the site serves
(HTML, CSS, JS, WOFF2, PNG, SVG, robots.txt, security.txt, the fonts'
OFL.txt, \_headers, \_redirects, \_routes.json) or a file of the
repository's own, or if the root holds anything but its own (.github/,
.gitignore, CLAUDE.md, the two font scripts, site/, a functions/ folder,
and the build's: .gitattributes, package.json, package-lock.json, src/,
tools/, node_modules/ once npm ci has run): a new kind of file is a
deliberate change to those lists. robots.txt blocks: GPTBot, ClaudeBot,
CCBot, Google-Extended, ChatGPT-User, Bytespider, anthropic-ai, cohere-ai,
FacebookBot.
