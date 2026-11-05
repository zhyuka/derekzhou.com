# derekzhou.com

Personal site for Derek Zhou. Pure HTML, CSS, JS. No frameworks. No build
step at deploy (five scripts are served minified, built from src/ by
tools/ and committed: see Structure).

## Structure

The site is the folder site/: the Cloudflare Pages project's build output
directory, served alone (no build command). Everything else here is the
repository's own, and never served.

site/index.html              Home page: the words over a 3D world, drawn live behind them
site/style.v16.css           All styles (versioned name — see Caching): the words' colours, the still skies of each time of day
site/site.js                 Email obfuscation only
site/hour.v3.js              The hour: which time of day the world opens on (the page's one clock read)
site/start.v2.js             The start file: the world's context and its first frame's programs, issued once the page has painted (made by tools/start.mjs; see World)
site/start-table.v2.js       The start file's table: its programs' GLSL (1 MB), a worker's script the start file starts after the first paint
site/world.v8.js             The world: the engine, the camera, the time of day, the words' colours, the governor (see World)
site/realm-kit.v2.js         The builders the world's kits share (rocks, ruins, stupas, temples, isles)
site/realm-dunes.v4.js       The dunes' kit: the sand province's land, rock, landmarks and light
site/realm-above.v3.js       The cloud sea's kit: its surface, towers, canyons, floating isles and light
site/plan.v1.js              The plan's worker: the visit's first plan, made off the main thread (the world's own code; see World)
site/facetform.v1.js         The wing model: the tattoo's M as a faceted solid (generated; see Birds)
site/facetpose.v1.js         The wing model: the faceted M posed
site/wingmodel.v1.js         The wing model: the measured wingbeat driving the M's rig
site/model.v1.js             The wing model: the measured per-kind wingbeat data (generated)
site/labbird.v1.js           The wing model: the measured wingbeat flying the M, flap and glide
site/birdwing.v1.js          The wing model: the measured wing made to fly in the world
site/inkbirds.v4.js          The ink birds: the living sky, every flock on its own business in the world (see Birds)
site/404.html                Custom 404 page (the hour's still sky, no world, no birds)
site/assets/favicon.svg      Adaptive circle favicon (dark in light mode, inverse in dark)
site/assets/favicon.png      PNG fallback favicon (32x32)
site/assets/apple-touch-icon.png  180x180 iOS icon
site/assets/fonts/           Self-hosted WOFF2: Geist and Geist Mono, full faces (the subsets'
                             sources; served too, loaded by no page) + two .sub2 subsets
                             (loaded), and OFL.txt (their licence)
site/robots.txt              Allow search engines, block AI crawlers
site/.well-known/security.txt  Vulnerability reporting
site/\_headers               Cloudflare Pages security + caching + Early Hints headers
site/\_redirects             HTTPS enforcement (http and www to https://derekzhou.com)
CLAUDE.md                    This file
subset-fonts.sh              Regenerates the .sub2 font subsets in site/assets/fonts (manual tooling)
download-fonts.sh            Fetches the full source fonts into site/assets/fonts (manual tooling)
src/                         The five scripts site/ serves minified, as written (the world, the kit and
                             the realms, the ink birds): the realms whole under their served names, the
                             world and the ink birds in sections (src/world/, src/birds/inkbirds/)
tools/parts.mjs              Splits a long script into its sections and assembles src/ into build/src/
src/**/glsl/                 The shaders' text: each plain GLSL literal as NAME.glsl, `@glsl NAME` in the part
test/shaders.mjs             Every program the page issues, against its golden text (test/golden/shaders/); --compile in Chrome
tools/build.mjs              The build in one command (node tools/build.mjs dist: what Cloudflare deploys once
                             set to): site/ + the built scripts, each script and stylesheet named by its content
                             (world.<sha8>.js), every reference rewritten, build.txt (the commit); --check proves
                             the plain build equals site/ and the named build resolves, both twice, byte for byte
tools/minify.mjs             Builds site/'s five from build/src/ (and the start file, by tools/start.mjs); CI checks the build
tools/start.mjs              Makes the start file from src/'s scripts, run in a fake browser
package.json, package-lock.json  terser, pinned, for tools/minify.mjs (npm ci; node_modules/ after it)
.gitattributes               src/ and site/ never converted to CRLF (minify.mjs refuses a CR)
.github/workflows/validate.yml  CI checks (and, beside it, the world's: world_rules.py,
                             w7_unit.js, lint_realms.js, and the shaders' guard, glsl_guard.js
                             with glsl_manifest.txt)

Five scripts are served minified: world.v8.js, realm-kit.v2.js,
realm-dunes.v4.js, realm-above.v3.js and inkbirds.v4.js. src/ holds them
as written. The world and the ink birds are kept as section files, one per
divider of the old whole file (src/world/NNN-slug.js, src/birds/inkbirds/;
each folder's parts.json names the served file): edit the section you need;
a new section is a new NNN between two others (they join in name order,
nothing between). node tools/parts.mjs assemble src build/src writes the
whole scripts under their served names into build/src/ (never committed:
the dev build, as written). The record, the switches and the dev harness
are dev-only parts, in src/dev/world/: each has a stub beside the world's
parts (src/world/NNN-slug.ship.js: the switches' defaults, and the four
functions called without a guard as empty ones), and assemble --ship src
build/ship writes the shipped build, the dev parts left out by file.
A plain GLSL literal (no ${...}) is kept as a file in its folder's glsl/
(src/world/glsl/, src/birds/inkbirds/glsl/, src/glsl/ for the realms):
the script has `@glsl NAME` where it was, and assemble writes the text
back exactly. Edit a shader in its .glsl file; then node test/shaders.mjs
site --write updates the golden texts (test/golden/shaders/: every
program the reference device issues), committed with the manifest.
tools/minify.mjs makes site/'s from build/ship/: terser (pinned in package.json) compresses and
mangles, every string's value and every shader's text the same, every
comment dropped but each file's two-line provenance note and the INIT-END
marker; where index.html loads the start file, tools/start.mjs makes it
too. CI step "The minified scripts are exactly what the script makes" (npm
ci, then node tools/minify.mjs --check build/ship site --start-src
build/src; the start file is made from the dev build) fails on a served script
edited by hand or a source changed without its build, and the rules that
read the scripts' text (the absences, world_rules.py) read build/src/. So
a change is made in src/ and built (node tools/parts.mjs assemble src
build/src, node tools/parts.mjs assemble --ship src build/ship, then node
tools/minify.mjs --build build/ship site --start-src build/src),
the two committed together. tools/build.mjs runs all of that into a
folder of its own (node tools/build.mjs --plain OUT: site/ copied, the
built scripts over it) and then (restructure step 5) names each script and
stylesheet by its content: world.v8.js becomes world.<sha8>.js, the first 8
hex of the sha256 of its final bytes, files that load others by name (the
world's plan worker, the start file's table) named after them, and every
reference rewritten (index.html, 404.html, \_headers, the two workers'
URLs); node tools/build.mjs OUT writes that, with OUT/build.txt holding the
commit. CI step "The build makes site/, the same bytes every time" (node
tools/build.mjs --check) builds twice and fails unless both builds are the
same bytes, the plain build equals site/, and in the named build every
name is its bytes' hash, no old name is left, every reference resolves and
every script and stylesheet has its own immutable \_headers block. The
hour, site.js, the wing model and the
plan's worker are served as written, the start file as tools/start.mjs
writes it.

No Functions, no private pages. A private /studio/ needs an origin guard
first (a Pages Function that checks the Cloudflare Access token again, in
a functions/ folder at the repository's root, where Pages looks for it,
with site/\_routes.json sending it every private path), because Access
alone lets a percent-encoded path through and does not cover the
pages.dev host. The owner keeps a tested guard in a private repo. The
Access application on
derekzhou.com still lists paths for pages that no longer exist: Access asks
for a sign-in there, and past it they serve 404.

The shipped scripts have no development harness: the world is built and
measured in a dev build with hooks on `<html>` (a seed, a moment, a still,
switches, a record), and src/'s files are that build with every
hook cut out by counted edits (see Verify), site/'s built from
them. Nothing on the page reads such a hook. The record's code and
the dev helpers those hooks called are in src/dev/world/, in the dev
build only, unreachable (the switches keep their defaults); the served
copy is built without them (assemble --ship: the switches' defaults kept,
and the four functions called without a guard kept as empty ones). The
comments, in src/ (a served copy keeps only its first two lines and the
INIT-END marker), keep the dev build's tags and the names of its files
(design-v5 and its sections, rounds, fixes and judges; notes.md,
w04b_sky.js, diag.js and the like): they cite the world's development
record, which lives outside this repository, so a file they name is not
missing here (each script's first two lines say so).

## Content

Name: Derek Zhou, lettered (see Type: the h1 is a drawing, its words kept
for every reader)
Role: Technology Leader (title/OG identity; the JSON-LD jobTitle and the
credit row say "Team Lead", the owner's wording: on 2026-10-21 the owner
asked to "change back to Team Lead title", after "Product Lead" from
10/19)

One line of words, no bio. On 2026-10-08 the owner had the old paragraph
removed ("remove the entire "Derek is a hands-on.." blurb"); on
2026-10-21 asked for "a little description that just says "Hands-on
technology leader in Agentic and Generative AI, Platform Engineering, and
Product Development."" It sits between the name and the credit row in
the words' role (.words), its text in a span of its own (held by CI; the
world's old ground read took the line's ink from those line boxes alone,
and that code stays, unreached; the birds keep off the line's whole
box), with a non-breaking space in "Product
Development" so no line ends on one word. The page is the name, that
line, the credit row and the two links. The Open Graph and Twitter
descriptions (share text) are the same line, and the meta description
(search text) is "Derek Zhou is a hands-on technology leader in ..." with
the same words (owner, 2026-10-21: "match the share text too"). CI step
"The page says what it says" holds all of it, word for word.

Experience (one line, the .credit row):

* Team Lead · Accenture Song · 2022 – Now

Job title, company, and dates only. No per-role project or client lists.
The credit row is a mono caption (Geist Mono 400, .8125rem, dimmed) —
no uppercase, no tracking; the text is unchanged.

Links:

* Email: hello@derekzhou.com (obfuscated in HTML, assembled in JS)
* LinkedIn: https://www.linkedin.com/in/derek-z (plain href, rel="me",
  also listed in the JSON-LD Person sameAs)

Both live in the footer as the plain underlined words "Email" and
"LinkedIn" (no arrows).

## Design

One non-scrolling viewport: the typography over a world seen from the
air, birds crossing it, light and cloud all about. The owner's briefs,
verbatim:
first "copy exactly how they did the dots here on Samara.com/jobs.
Except instead of dots use birds and don't use dark background should be
light."; then, of Samara's dots drifting and bouncing inside the window:
"That's not at all how birds move tho. The page should be a sky so like
they're flying across/in patterns/etc. it should feel calm - not
bouncing off the walls." and, of the number of birds, "should b rand";
then, of v3's slow, rigid rows: "Are you sure this is how birds movement
is flying?!"; then, of v4's flights of one identical mark: "Y they all
look same and move all the same? Did you even understand what we're
trying to do?"; then, of v5's pace (a phone's sky crossed in 10-17 s):
"Are you sure everything should be moving this fast tho?"; then, of v7's
flat sky, every lane drawn on the window's plane: "Y is the movement so 2D
though. Did you even research as comprehensively as possible? Test using
the most complex tools etc."; then, of the background, paraphrased (the
reference is a game the owner named; at the owner's word its name stays
out of the repo, its commits and its PRs): make the background as like
that game's luminous sky and cloud as it can be made, from the most
comprehensive research and plan; and, choosing among the plan's options,
every time of day in turn, the opening one by the visitor's own clock
("All. Cycle through. The scene that users starts on depends on their
system time"), the sky behind the words too ("Full sky."), and as close
to the reference as possible ("You can do it - no shortcuts!"). So the
first brief's light ground gives way, at the owner's choice, to a world
that is dark at dusk and at night. Then, asked to use Unreal Engine, and
shown the research's answer (the page cannot run Unreal: no web export;
streaming costs a GPU server per visitor and fails in iOS in-app
browsers), the owner chose no Unreal (and an opt-in generative score and
a studio behind Cloudflare Access, neither built yet), and a world drawn
in the page itself, seamless ("keep iterating through literally every possible
method/frameworks/etc until it's seamless"); of the plan's flat palette
strips: "All those mocks look so plain wtf. It should be a lot more
complex than a palette lol." with the reference's own creative techniques
(paraphrased: its name stays out); of the first flights through it:
"should keep flying same-ish direction unless user drags their
mouse/finger to change direction. And the weird glittering transitions
between scenes/stuff is still happening wtf?" (so nothing turns the view
by itself, and nothing on the window sparkles, crawls or fizzes from
frame to frame); of the birds in it: "And there should still be birds
that are drawn/constructed in the same style as before (what's currently
live in prod) but 3d-ified (but just enough to fit with everything else.
So that might mean adding some "extra" fx to them)"; of the time of day:
"Add dusk and night first", and "Only the starting landing scene should
depend on the system time. The rest should cycle through smoothly
randomly non-time-dependent." Then, shown a hand-lettered brush-script
title (the reference lettering; the work it comes from stays unnamed, as
above): "Also draw Derek Zhou in this style. Keep iterating until it's
100% exact. And remove the entire "Derek is a hands-on.." blurb."; of
the first drawing: "The Z is off - shouldn't be 2 separate strokes -
study similar fonts so u know what to do for it. Remove the feather
entirely. 1 line layout pls"; and, choosing the hooked Z, and asked
whether white lettering should stay white over a bright sky by darkening
the sky behind it or switch to dark ink there: "A. Don't darken the
background anywhere ever". Then, of a lift under dark words (a pale
field the words' machinery raised behind them): "remove that white
background behind the text. it's fine failing accesibility" (2026-10-21),
and of the inks' changes: "hold each colour change long enough that it
can never blink, and choose the links' colour by their worst letters, not
their average" (2026-10-22). Then, shown the desktop view pitched up, the
owner said yes to 9 degrees (2026-10-29), and chose to ship in stages:
this world with the time of day first, then that camera, the steering's
next round and new birds later. Then (2026-11-03): "lets only use white
text for everything so never use any scenes that dont pass white text
(anything that makes the text turn black should be removed entirely)";
of the start, "why does the stuff take so long to load on site startup?
should load instantly make it 10x faster"; and "also the clouds and stuff
looks blurry from afar too.. everything should be 10x quality". Then
(2026-11-05), of the 2D birds still flying over the still sky as the page
loaded: "Why do I still see the old birds at all … like when the page
first loads. There shouldn't be any code at all for that, right?! wtf
is going on pls fix from root and clean everything up". So: the name is
lettering (see Type); nothing on the page darkens the world or lifts it
for the words; the words are always light, and the world draws only skies
they read on (see World); and the birds are the ink birds alone, flying in
the world (see Birds).

The words' colours are one set, always (see World: the words), and the
world is never changed for them: text #fdfcf7 (the lettered name, the
line, the links), the dimmed grey #ebeffa (the credit, the links'
underline), the focus ring #f4e2b0, selection #3b3f55 under the light
text: the same in the stylesheet (:root) and in the world (constants),
on every sky and at every moment. bg #f9f8f1 (Samara's cream) stays the
paper: print, and the colour under everything. color-scheme stays light
(no form controls, no scrollbars). Type is matte: no text-shadow, no
glow. Links are plain underlined words (1px, dimmed underline, .18em
offset); nothing reacts to hover; OS cursors only. The name and the type
are present at first paint in their final place (the drawing's box is
reserved by the stylesheet) and in their final colours. Print hides the
world, the birds and the footer, on white (every still sky, the world's
too, gives way to the paper, background graphics on or off: CI checks
the print block): the one exception to the light words, the name and the
line print black, the credit #555, the name 16rem wide.

## World (world.v8.js, realm-kit.v2.js, realm-dunes.v4.js, realm-above.v3.js)

The window is a camera flying through one endless world drawn in WebGL2,
generated in code from the visit's seed (no picture, no model file). Each
file's header comment (src/'s copy: the served one is minified) is its
full design as of the build it came from (stage 2's changes are tagged
inline: stage2, speed, quality; fast500's: fast500; where a header and
its code differ, the code and this file are right); this is the outline.

THE WORLD: one world over an endless plane, its land and its sea of cloud
blended by smooth maps (the kits' weights), never a cut between places:
the dunes' kit (a dune sea with its families of dunes, far rock ridges,
mesas and buttes, giant shards, fields of ruins, temples on plateaus,
stupas) and the cloud sea's kit (broad swells and heaps of billows,
towers, canyons of cloud, floating isles, an isle with its temple).
Places come a minute or two apart at the flight's 12 m/s. Cells (landmarks, clouds, creatures) are generated per
world cell from the seed and the cell's coordinates, streamed in about
the camera within a budget a frame and freed behind it. Each frame: the
scene in HDR (4 samples a pixel where the device allows), the land as a
GPU clipmap raised by the kits' height functions, the cloud bodies baked
once each into small 3D textures and marched at half resolution (brought
up by a Catmull-Rom clamped to the range of the 2x2 texels it lies
between: sharp in the distance, never a ring), bloom, and the composite
(a shoulder that keeps hue, the grade, one fixed 8-bit dither: no bands,
nothing that fizzes). The light shafts' pass is still in the code, but no
sky draws it: the amount is 0 in all six skies (see THE TIME OF DAY).

THE FLIGHT AND THE CAMERA: left alone the view holds its heading and flies
straight and level but for the ground's rise; what stands ahead and
cannot be climbed is passed by a slip sideways, planned from first sight
(the owner: "should keep flying same-ish direction unless user drags").
A drag anywhere (touch, pen, or a mouse with its main button held; it
starts after 8 px, so a tap stays a tap; a drag begun on a link steers and
never follows it) turns the view and the flight, 90 degrees across the
window's width, the scene following the finger; up and down it tilts the
view and the flight climbs or dives; let go, the turn runs on a little and
eases out. A pointer's moves are read only while it is pressed (no hover),
no key is read, nothing is stored. Two fingers are never steering
(pinch-zoom stays the page's). On iOS the phone's own turn steers too once
Safari has asked, inside a tap or a drag on the page (never on a link,
never at load); on Android the world would take the phone's motion
without asking, but this site's Permissions-Policy denies the
accelerometer and the gyroscope (see Security), so there only the drag
steers. Under reduced motion all of it is inert. The camera is a pinhole,
72 degrees across the window's longer side (a tall window's view widened
so it is never a slit, and never more than 80 degrees up); the realm
frames the horizon 55% down a wide window and 58% down a tall one (blended by TALLK, the window's shape: smooth from
0.95 to 1.75 of height over width). On a window 6:5 or wider (a desktop,
a laptop, a phone held sideways: the stylesheet's own query,
min-aspect-ratio 6/5, so the camera and the still sky it cuts in over
agree) the camera is pitched up 9 degrees more (the owner's yes of
2026-10-29): at 1440x900 the horizon about 72% down, the words wholly on
sky. Any other window (an upright tablet, a phone, a window near square)
keeps that framing (to within 0.004 degrees: the drawn world's aspect
rounds a little differently at its new density). A step, not a fade: the credit row stands
54-59% down on those windows, about where the unraised horizon is, so any
share of the 9 between would carry the horizon through it. A resize or a
rotation re-aims at once (a change of height alone eases). Everything
that frames the view reads the same pitch (the camera, the planner's
forecast of it, the moon's place).

THE TIME OF DAY: the world's sky (the moon, the gradient, the haze, the
cloud's light) is one of six skies, every one with light words (the
owner: "never use any scenes that dont pass white text"): the afterglow
(sunset), the blue hour (dusk), first light (the light before sunrise:
dawn), the moonlit sea, the Milky Way and the aurora (night; SKY_PHASE
2). The skies whose words were dark (sunrise, fair, mist, golden hour;
azure, silver and rose, never compiled in) are gone from the table. Each
is a set of colours and amounts laid over each kit's own light and a
paint of everything the kits paint (land, stones, isles, creatures), with
a time of day, a hold (70-100 s, the moonlit sea's 190 s, x0.9-1.15 by
the draw), a change of 55-60 s and its near skies. A visit opens on the
kept sky nearest the visitor's own time of day (hour.v3.js: night 21-05,
dawn 05-08, day 08-13, rain 13-16, sunset 16-19, dusk 19-21): dawn and day
on first light, rain and sunset on the afterglow, dusk on the blue hour,
night on the moonlit sea, the Milky Way or the aurora (the visit's draw),
as far through its hold as data-sky-at says; after that the order is the
world's own, with no clock: mostly into a near sky, now and then
(SKY_FAR 38%) into any through the mist, never into one of the last
SKY_RECENT 3, a sky not yet seen likelier. Colours blend in OKLab along
the hue's arc (never through grey) on two clocks (the light's and the
structure's). The twilight waypoint that a change between skies of
different words passed is never taken now (its code stays, unreached).
The skies keep all their own light under a ceiling (uCeil, OKLab L 0.53
with a soft knee, the same everywhere on the window: the world's own
light, never a function of where the words are); the moon is a pale flat
disc held under it too. A sun or moon never fades where it stands (the
owner: "yep this. same w sun."), and on a moonlit night the moon drifts
all night (the owner's choice, over a moon still between the changes): it
rises out of view as the night arrives, comes in through a side edge late
in the change, above the words, drifts across one way at one pace on a
nearly level path, leaves through the other side early in the change out
and sets behind the sea, never stopping or turning back (a visitor who
turns that way sees it rise or set; only its faint broad light on the sky
follows its depth); where the window has no room under its top edge, only
its glow passes along the edge. The moonlit night is about twice as long
as before (the owner chose a slower moon), so the moon drifts 6-10 px a
second on a laptop and 2-3 on a phone; it shows on the visits that face
the side its light comes from (about 1 in 5 on a laptop, 1 in 9 on a
phone). The sun stays below the sea in every sky: through a change into a
night it keeps sinking (to 24 degrees below), and its warm glow, the warm
band low on its side, the haze's warm side and the high veil's brightening
sink with it and weaken with its depth; the Earth's shadow climbs and
dissolves, the noctilucent wisps go dark from below, and the night's own
glow comes in with the night's colours; out of a night into first light
or the blue hour it runs backwards. No sky draws light rays now (the owner
chose no rays at dusk and dawn: the afterglow's 0.1, the blue hour's 0.05
and first light's 0.15 are 0; the three nights' were 0 already). The cycle
runs on the flight's own clock, its draws from the visit's own streams.

THE WORDS (the owner: "Don't darken the background anywhere ever",
"remove that white background behind the text. it's fine failing
accesibility", and "lets only use white text for everything"): nothing
is done to the world for the words. No lift, no floor, no gain, no veil,
no cap, no calm about them: the composite takes no words input at all,
so the frame with the words' machinery on and off is the same program on
the same inputs (W7). The words' colours are constants, the stylesheet's
own, for every sky and every moment: no ink is read from the ground, none
flips, there is no dark ink (the world's code for those stays, unreached:
the words' machinery is off, so the composite is never read back for
them and nothing is set on .stack or the footer). They are chosen against
the light ceiling itself: on OKLab L 0.53 the text #fdfcf7 reads 5.13:1,
the dimmed grey #ebeffa 4.59:1 and the ring #f4e2b0 4.1:1 (a grey worked
out from a read-back at an eighth fell to 4.27:1 at 1920x1080, a thin lit
edge under the credit averaged away). W8: on every sky no pixel the world
draws stands above OKLab L 0.53 outside the moon's footprint (the ink
birds aside), and the moon's footprint (4.5 degrees about it) stands
clear of every block of words at the view's own heading (a visitor's drag
can bring the moon behind them; they still read there, the credit
at 4.80:1 the lowest measured so, at 1440x900, with the moon's
route). So 4.5:1 held against every ground pixel measured under
the words (see Verify; the credit's lowest at the view's own
heading 4.90:1). The ceiling bounds lightness (OKLab L), not
luminance, so the margin depends on hue: on a saturated green at the
ceiling the credit would be about 4.4-4.5:1.

BOOT (the owner: "should load instantly make it 10x faster"): the page
paints at once with the hour's still sky (the stylesheet's, per time of
day, :has(canvas.sky)) and the words, and nothing else is drawn until
the world's first frame: the ink birds fly in the world. The start file
(start.v2.js: async, fetchpriority high, Early-Hinted, the first script
after the canvas) runs its tests as soon as it comes: unless WebGL2 is
missing, colours are forced or the browser is WebKit, it waits for the
page's first contentful paint (PerformanceObserver 'paint'; two frames
where paint timing is missing; or at once when the world asks for its
context first: its getContext wrapped once, so the programs are issued
just before the world takes the context if the table is in; else the
start file stands aside and the world compiles its own, as without it). Issued at once, they held the
first frame on a starved GPU process (FCP 0.07 -> 1.08 s on 4 cores).
Then it starts its table as a worker (start-table.v2.js, the programs'
GLSL, 1 MB, posted back as strings: no DOM, no fetch; parsed on the main
thread before the first paint it held it back on a slow phone, FCP 148 ->
284 ms at 4x), and when the sources are in it makes the canvas's context with the world's attributes, and unless
KHR_parallel_shader_compile is missing or the renderer is a CPU one by
name, it issues every program of the world's first frame from its table
for the device (26 programs, or on the split height's devices their own
set of 32, HPSPLIT in their #defines; each text as the world hands it
to shaderSource, the device's #defines put in) and flushes, reading no
status, no layout and no clock. The world takes that context (getContext
gives the same one) and adopts each program whose issued text is exactly
the one it would issue itself, freeing the rest; a context lost before
that goes the world's own lost path. tools/start.mjs makes the two tables
from src/ in a fake browser, and fails unless each serves every device
and visit of its set the start file serves. The kits, the wing model
and the ink birds only define at their top level (each hands itself
to the world, WORLD.forms, WORLD.realm or WORLD.birds, or puts its one
global on self); the world's also sets the browser's bar to the top
of the hour's still sky, draws the visit's seed and starts the plan's
worker. The boot starts in the first animation frame after the realms
have registered (the world, the kit and the realms are fetched first,
at high priority and Early-Hinted, the ink birds' wing model and the ink
birds after them, at low: the boot waits for neither those scripts nor
the page's load), and is staged a step a frame, the context first. The
ink birds join whenever their scripts come (their programs, from stage
C on, issued on a list of their own, polled once a frame and warmed
before they fly). The visit's first plan (the maps, the director and its
first tick, the weights' grids about the landing: pure CPU, the boot's
longest task, 0.43-0.72 s on a desktop and 1.5-2.5 s at 4x) is made in
a worker, plan.v1.js, which the world starts as its script ends, with
the visit's seed, while the page evaluates the other scripts. The world
adopts the answer only if it is this world's (the worker's stamp, the
md5 of the world's code it copies verbatim), this seed's, the camera at
the landing and no grid made yet: the plan is the same doubles either
way. Anything else (no Worker, an error, an answer for another seed or
world, 8 s gone) and the page makes the plan itself, as before. Where
the browser has KHR_parallel_shader_compile and is not WebKit (Chrome,
Edge, Firefox): every program issued at once (or adopted from the start
file), the probe and the land first, all polled once a frame; each warm-up
draw made as soon as its own program is done, beside the links still
compiling; the programs for what no first frame can show (the ink birds',
and the sand's particles and ribbons where the flight cannot reach sand
in the 30 s after the show) issued with the rest but finished after the
show. On WebKit (Safari on the Mac, every browser on iOS and iPadOS,
told by the user agent: it has the extension, but its links and first
draws are synchronous, and a batch of programs linked at once froze the
owner's iPhone for 20 s before) and where the extension is missing: the
old path, one program at a time, the warm-up after the links and never
in the frame the noise is finished in. On every browser the noise is
baked on the CPU, byte for byte the volume the GPU drew (every voxel the
exact double-precision one; its mips made by generateMipmap, as before):
a layer of 1,024 voxels a boot frame from the frame after B, beside C
and the plan, the layers left all in the first frame after C (11-25 ms
of the main thread on a desktop in all). Then, on every browser, stage
D is not paced by frames: once the GPU is free, rounds of its GPU half
and its CPU half in one frame until the world is ready, nothing moved,
64 rounds or the slice is spent (40 ms). The boot's probes and the
landing's ground grid are drawn and read at once (the canvas is hidden;
the same bytes the read-back ring brings two frames later), but only
once the boot's fences show the GPU past C's own frame and every boot
frame but the last, so a read waits on one frame's work at most. The
cells that can be seen (a distance weight over 0 about the landing, the
cell's own or one of its cloud bodies', 30 m nearer) come first, in the
flight's own order, and only they are meshed, uploaded and baked behind
the still (the bake's units a frame from 1,024, doubled while the GPU
keeps up, up to 8,192); the rest build in flight, out in the haze. The
world is ready once every cell is resolved and every cell that can be
seen is whole: no cell, mesh or cloud body with a distance weight over
0 arrives after the show, in any direction, a drag at once included. In
flight a guard builds at once, before the frame that would show it, any
cell in view whose weight will be over 0 within 30 m (one still late
is drawn at once, and counted). There are no timed trials at load: the
render scale starts at the tier's top (THE GOVERNOR), and one frame at
0.35 of the old size, in stage H, which runs in the frame G is done in,
still lets a device too slow even there decline. With forced colours on
at load the world does not boot while they hold (the ink birds fly alone:
see FALLBACKS); it boots once they end. The show is a cut (the owner:
"There shouldn't be any fade-ins/outs at all"): the frame it shows in is
drawn whole first, with nothing in or near the view still building, and
the canvas is shown in the same task; the ink birds fly from the first
frame shown. The land's grid is read as floats (ANGLE's Direct3D path
compiled the land's vertex program a second time at its first draw for
bytes), and the probe's height is one function (the weights and the
dunes' land made once). Measured at stage 2's end, before fast500,
on an RTX 4090 (Chrome headless, ANGLE on Direct3D 11; live against
stage 2's first shipped build, medians of three): a cold desktop
visit fully in at 4.20 s (live 18.95 s), a return 3 s later at
1.41 s (16.68), a phone's CPU throttled 4x at 6.05 s (21.55)
and 6x at 8.38 s (23.15). The wall left is the Direct3D compile
of the land's and the probe's programs, side by side (1.85 s and 1.33 s
alone). Since world.v5.js the land's height code is written for that
compiler (FXC), the same operations on the same values: the plateaus' two
taps made once per point; the dunes', the massifs' and the cloud sea's
taps in loops, each tap's own multiply kept (a diagonal one by
mat2(scale), a full matrix as itself) and its gradient turn
(dNg: transpose(M) * n.yz) outside the loop with its constant matrix;
the weights' grid's taps (bsGrid) by rotating the weights; every such
loop's bound adds uZ, a uniform never set (0), so FXC cannot unroll it.
On ANGLE's D3D11 path (RTX 4090) the heights read back bit for bit as
before (0 of 47,185,920 values), the native compile of the land's vertex
program 2,172 ms to 797 ms, the probe 1,422 ms to 469 ms. Keep uZ in
those bounds, and keep each tap's matrix a constant at its multiply: a
diagonal matrix read from a table stops FXC folding mat2(s) * p to
p * s, and the heights move (up to 0.155 m) though SwiftShader draws them
alike; such a change is proved by a read-back on ANGLE's D3D path. There
is no noise program now: the noise is baked on the CPU (above). On NVIDIA
under ANGLE's Direct3D 11 (by the renderer's name, with float targets and
parallel compiles) the land's height is split (HPSPLIT in that device's
#defines; each program's source the same on every device, the split under
#ifdef): four small fragment passes into five float textures, read by the
land's vertex program and by the probe. The heights, the gap and the probe
read back exact; the slopes differ by one ulp on about 25% of vertices
(1-level pixel changes), which the owner accepted for the speed ("Yes fast
asf pls"). Every other device draws the land as before.

No iPhone showed the world from stage 1 until stage 2's fixes: the
read-back ring's fences (rbFence) were polled with clientWaitSync(.., 0,
0) but never flushed, a fence signals only once the commands before it
are flushed, and WebKit flushes a context only when it presents a frame.
While the world boots its canvas is hidden and presents nothing, so the
landing's probe (vsOriginRead) waited for ever and the still sky stayed
(Chrome and Firefox flush by themselves, so no harness saw it). rbFence
now flushes each fence. Measured on the owner's iPhone in Safari through
an instrumented copy of the page (2026-11-04, in a claude.ai frame drawn
at 30 fps): without the flush the boot stood at "F warmed" for 280 s;
with it the world was ready 5 s after load, its timed trials choosing
the full scale (13.5 ms a frame). The flush was made in world.v5.js
itself, not cut from the dev build; fast500's dev build carries the same
line, so its cut keeps it.

THE GOVERNOR AND COST (the owner: "everything should be 10x quality"):
the world is drawn at its memory tier's density: a desktop at most 2
device px a CSS px and 6 Mpx (a Retina 1440x900 window's world
2880x1800), a full phone (an iPhone 390-600 px across at 3x, an Android
with 8 GB or more) 2 and 1.4 Mpx (a 393x852 phone's 786x1704, it was
491x1065), a smaller iPhone or an iPad 1.5 and 1.6 Mpx, any other
Android 1.25 and 1.3 Mpx (every device's before); the canvas at the
device's own px (at most 2 a CSS px and 2.5 Mpx, or the world's own size
where that is larger), the world put up to it by one Catmull-Rom clamped
to the range of the 2x2 texels it lies between (it was bilinear). Every
frame's time in a two-second ring, each second the median; three slow
seconds step the render scale down a rung (the
ladder: the tier's top and its 0.85, 0.72 and 0.6 where they stand 8% or
more above the old size, then the old five, 1, 0.85, 0.72, 0.6 and 0.5
of it), a second rung tried if the first did not help, both undone and
the frame time learnt as the pace if neither did (a 30 fps cap is simply
the pace); twenty seconds at ease step back up (three, in the first
twenty seconds shown and until the first step down: every boot
starts at the tier's top now, so only a resize that lands below
it climbs that fast; never while an undone step's cool-down runs);
ten seconds under half the pace at the last rung, or under 15 fps
that the scale cannot help, and the loop stops and the still sky stays.
A resize keeps the density being drawn (the rung nearest it in device
px a CSS px), so a rotation or a window dragged to a new size neither
sharpens nor softens the world. The scatter and the particles thin to
0.6 on the rungs under 0.65 of the old size (its 0.6 and 0.5, as on
live: TIER). The first rung is the tier's top (what the boot's timed
trials chose on every arm timed: none run at load now), and one frame
at 0.35 of the old size in the boot's last stage still lets a device
too slow even there decline (over 21.7 ms twice). The density costs
memory: the world's targets for a 393x852 phone at 3 go from about 134 MB
to 201 MB, a Retina 1440x900 window's from 239 MB to 589 MB (a real
iPhone must hold a 10-minute visit at the full phone tier: see Verify). A
renderer on the CPU (SwiftShader, llvmpipe and the like, by its name)
keeps the still sky from the start; so does a boot whose 0.35 trial
misses the floor, a first frame doubted twice, or a broken program. A
hidden tab draws nothing.

FALLBACKS: no WebGL2: the still sky of the hour (data-sky) and its words,
no bird; no script: the still day sky and the words, no bird; a lost
context: the still sky of the time of day being drawn, until restored;
prefers-reduced-motion: one still frame of the world, drawn again when the
words move, live both ways; forced colours: the world not drawn, the
canvas cleared to the system's Canvas colour and the ink birds alone over
it, in CanvasText at full ink, in a still view of their own (the flight
held), and the world back when they end, on at load too; print: none of
it.

THE WEATHER (=rand()): one crypto.getRandomValues above world.v8.js's
INIT-END marker, split into splitmix32 streams and integer hashes (the
same in JS and GLSL, bit for bit): the land, the cells, the sky order, the
ink birds. The realm and kit files, the wing model, the ink birds, the
plan's worker and the start file draw nothing of their own (the worker is
handed the visit's seed): the world's is the page's one entropy read. The
world's one clock is clockNow() (performance.now, above INIT-END), read
for budgets only, never for what is drawn; time is requestAnimationFrame's
own.

## Birds (inkbirds.v4.js and its wing model)

The birds are the ink birds, and there are no others: the world draws
them, in its canvas, so before the world's first frame, and wherever it
does not run (no WebGL2, no script, a lost context, a CPU renderer, a
device too slow), the page is the still sky and the words, with no bird on
it, and in print the name, the line and the credit on the paper, no bird
(see Design); under forced colours the world draws them alone, in
CanvasText (see World: FALLBACKS). No script, SVG or rule of the old 2D
birds is left in the page, its stylesheet, its headers or the world's
scripts, and CI fails if one comes back (see Security).

THE INK BIRDS (inkbirds.v4.js, round 3): the living sky. The birds are
not flights planned to cross the window: every flock is an animal
in the 3D world on its own business, and the window shows what is in
front of the camera. Geese, ibis and gulls commute on the evening's line
(with it, against it, across it); gulls and storks wheel over a patch of
air; crows, a heron and swallows loiter about a home; geese migrate at
night. A flock's leader steers in the world (a step every 0.1 s, its
route worked out 4 s ahead) at its kind's real airspeed, never turning
faster than its kind can, drifting with the wind; the others hold their
places in its pattern (a V, a line, a pair, a loose cloud) a moment
behind on its way, so turns ripple down the flock. Each bird is the
tattoo's M as a faceted solid flown by a measured wingbeat (the wing
model: facetform, facetpose, wingmodel, model, labbird, birdwing, loaded
before it), drawn as ink through the world's camera, hidden behind a
cloud's opaque core, and taking its own ink off the words' ground (the
one keep-off the world draws, read by the ink birds alone), which can
only leave a pixel lighter. The calm is kept in the world, never by
slowing a bird: nothing passes the eye faster than 6 degrees a second
(such a flock is met farther out), each kind is met at its own
true-size distance, at most four or five flocks live about the viewer
(an encounter every 9-20 s), a sky with no clear bird for 9 s sends one
in that shows within 5 s, and a route onto the words is not flown. No
bird follows the view (the owner's word): a flock's whole route is worked
out at its birth and flown exactly, at its own height over the land
under it; nothing in its flight reads the camera, so a drag swings the
view past the birds. And no bird fades in time: it shows only by
crossing the window's edge or coming out of the distance (a fade by
distance alone), and goes the same ways. Where the view brings the words
across a flock's way, the words' keep-off hides its ink where they stand.
The perched birds (guests): now and then a gull flies in (round the letters, never across a
stroke), lands on the D's top or the k's or u's exit stroke, or just past LinkedIn's end on its
line (never an underline), sits in the owner's perch A (the folded M seen side-on, upright),
never still for long, and leaps off and away. No fades: it comes in from beyond the window's
edge and leaves out of view. The pointer's perch needs the hover listener the world does not
have, so it never comes. Each click or tap on the page that is not a drag and not on a link
starts a gull at that point (the drag's own pointerdown/up: no listener added) that springs off
and recedes into the distance; at most 4 at once; none under reduced motion.

The birds fly for as long as the page is open, as the world moves. That
is automatic motion over five seconds beside content, which WCAG 2.2.2
(Level A) answers with a pause control; the owner chose a page without
one. prefers-reduced-motion is the stop.

## CSS

One file: style.v16.css. Plain CSS. Custom properties for theming.
All @font-face declarations (subsets + metric fallbacks) at top of file.
Clamp-based spacing for fluid layout across viewports. One set of the
words' colours (:root, the light set: no colours per sky). Two families
of still skies, each a gradient on the body: the hour's (:root[data-sky],
six times of day; the 404 page, and the home page's no-script day sky)
and the world's (:root[data-sky]:has(canvas.sky)), the same skies: each
time of day's kept landing skies (dawn and day first light, rain and
sunset the afterglow, dusk the blue hour, night the moonlit sea, the
Milky Way and the aurora together) as the world draws them at 393x852
and 1440x900 with the camera of a window narrower than 6:5, the words
hidden, objects in, averaged row by row in OKLab, the horizon 55-58%
down; and on a window 6:5 or wider (@media (min-aspect-ratio: 6/5), the
query the camera reads) the world's own taken again from the pitched
camera at 1440x900, the horizon about 72% down; so the world cuts
in over its own still on every window. The colours hold against every
gradient wherever a window puts the words (as CI computes them: text
7.09:1 or more, the dimmed grey 6.33, the focus ring 5.67; CI samples
every gradient, wants each world sky's base still and its 6:5 one
exactly once each, and fails below 4.5 and 3). The canvas
(.sky) is fixed behind everything (z-index -1) on the large viewport
(100lvh: a phone's toolbar coming and going never resizes the world),
unseen until drawn; touch-action pinch-zoom (pan-y too where the page
scrolls, everything the browser's while zoomed: data-touch), no text
selected while a drag steers (data-steer). No keyframes and no
transitions (the owner: "There shouldn't be any fade-ins/outs at
all"): the canvas shows at once (`.sky.on`: opacity 1, a cut, its
frame drawn whole first). Under forced colours the stylesheet keeps
the canvas laid out and sets color: CanvasText and background-color:
Canvas on it, the two colours the world reads from it: it clears
the canvas to Canvas and draws the ink birds alone over it in
CanvasText (see World: FALLBACKS). A window under 500 px tall (a
phone held sideways) lays the stack out again to fit, so the page never
scrolls. :focus-visible is a 2px outline in the focus colour, offset 3px,
on every focusable. The name's two rules live here (CSP: style-src 'self',
no inline style): `.name svg` (display block, width min(25.25rem, 100vw
less main's padding), height auto, aspect-ratio 1310 / 314) and
`.visually-hidden` (the clip pattern); print sets the drawing 16rem wide.
`.words` is the words' role for a paragraph (the line under the name, the
404's line).

## JS

The scripts, one job each, in this order (CI step "The world's page
loads in order" and world_rules.py's rule 5; every script tag carries
data-cfasync="false", so Rocket Loader leaves the order as served):

1. hour.v3.js — in the head, before the first paint (tiny,
   Early-Hinted): which time of day the world opens on (data-sky,
   data-sky-at) and the browser's bar.
2. start.v2.js — the start file (async, fetchpriority="high",
   Early-Hinted, the first script after the canvas and the only async
   one): the world's context and its first frame's programs, issued before
   the world's script runs (see World: BOOT); made by tools/start.mjs from
   src/, never by hand.
3. site.js — email obfuscation: HTML has href="#" id="email-link", JS
   assembles mailto from split parts at runtime so bots cannot scrape the
   address. A \<noscript\> fallback shows the email in HTML entities.
4. world.v8.js — the world (deferred, fetchpriority="high", Early-Hinted,
   first of the deferred; minified). As its script ends it starts the
   plan's worker, plan.v1.js, by name (no tag: see World: BOOT).
5. realm-kit.v2.js, realm-dunes.v4.js, realm-above.v3.js — the kits
   (deferred, fetchpriority="high", Early-Hinted, minified; each registers
   itself with WORLD.realm; keep the order: the boot starts a frame after
   they have registered).
6. facetform.v1.js, facetpose.v1.js, wingmodel.v1.js, model.v1.js,
   labbird.v1.js, birdwing.v1.js — the ink birds' wing model (deferred,
   fetchpriority="low", in that order; each puts its one global on self).
7. inkbirds.v4.js — the ink birds (deferred, fetchpriority="low", last,
   minified: they take the sky whenever they come).

Progressive enhancement throughout: with JS off, the page is the
typography on the still day sky.

## Type

The name is lettering; everything else is two families. The owner asked
for a grotesk and a mono (Diatype, Neue Haas Grotesk, Monument Grotesk
Mono named); Geist and Geist Mono (Vercel with basement.studio, SIL Open
Font License 1.1) are the free, licensed stand-ins, until a web licence
for the Dinamo faces is bought:

* the name (the home page's h1): not a font but a drawing, "Derek Zhou"
  in the hand of the reference lettering (a casual brush script, on one
  line; the Z one stroke, a zigzag entering with a hook at its top left,
  as the reference lettering's capitals enter), one SVG path
  filled with currentColor, so it takes the words' ink (#fdfcf7; black in
  print, CanvasText in forced colours). The h1 is
  `<span class="visually-hidden">Derek Zhou</span>` and the drawing
  (aria-hidden, focusable="false"): a screen reader, a search engine and
  the page's outline still get the words. 25.25rem wide where the window
  allows (the old set name's weight of ink: Geist 500 at 76 px), else the
  measure main's padding leaves (85% of a 320 px phone, 88% of 390); its
  box reserved by aspect-ratio 1310 / 314 (the drawing's viewBox), so
  nothing moves as the page loads. The drawing is used as approved: no
  letter is redrawn here.
* a heading set in type (the 404's "404", any heading to come): Geist
  500, clamp(2.75rem, 1.9rem + 4vw, 4.75rem), line height 1, tracked in
  -0.045em
* the words (the line under the name, the links, the 404's line, every
  paragraph to come): Geist 400, 1.0625rem (the footer's links .875rem),
  line height 1.55, -0.006em, a 22.5em measure
* the facts (the credit row; to come: dates, roles, labels, captions,
  code): Geist Mono 400, .8125rem, dimmed; no uppercase, no tracking

As the site grows, new pages reuse these roles and nothing else: two
weights only (400, 500), emphasis made by the text colour against the
dimmed grey, never by weight (on screen the two are all but one light
now, #fdfcf7 and #ebeffa; in print, black and #555); a handful of sizes
on the same clamp()s;
long reading at about 65 characters a line. A serif may come back for
long-form writing only, never for the name or the page's frame.

Fonts must be licensed for the web: open-licensed (OFL, like Geist) or
a bought web licence. Never unlicensed copies, and never a desktop
font file: its own terms forbid what a site does to it (Dinamo's:
no modifying, no storing on publicly available servers). To move to
Diatype and Monument Grotesk Mono once licensed: swap the two
@font-face sources, recompute the fallbacks (below), keep the roles.

## Fonts + performance

Served fonts are ASCII subsets (.sub2: Latin basic, · – — ‘ ’ “ ” …).
./download-fonts.sh fetches the sources from Vercel's own geist package
(pinned) into site/assets/fonts; ./subset-fonts.sh cuts the subsets
there. Geist is one variable file cut to the two weights the site sets,
wght 400-500 (10.9 KB, smaller
than a single static weight); Geist Mono Regular is 9.3 KB: 20 KB of
fonts in all. The subsets keep the copyright and the OFL notice in their
name tables (IDs 0, 13, 14), and assets/fonts/OFL.txt ships beside them.
The home page uses no glyph outside the subsets; do not add glyphs.
font-display: optional + the metric-matched fallbacks give CLS = 0 by
construction: 'Geist Fallback' (Arial) and 'Geist Fallback Android'
(Roboto), 400 and 500 apart, their size-adjust the page's own text set in
Geist over the same text in the system face and their ascent and descent
Geist's (1.005, 0.295) over it; 'Geist Mono Fallback' (Menlo, Courier New)
by the advance, 0.6 em. Both subsets are used (Geist: the line, the links,
the h1's hidden words, the 404's heading; Geist Mono: the credit), so both
are preloaded in index.html and Early-Hinted via Link headers on / in
\_headers. Never preload a font no rule uses (Chrome warns, and every
first visit pays for it).

The world's scripts are not on the path to the first paint (deferred, the
start file async), but the start file, the world's and the kits' are
fetched from the start: Early-Hinted (Link preloads on / in \_headers) and
at high priority; the wing model and the ink birds after them, at low. As
served: start.v2.js 1035 KB (its programs' GLSL, as text), world.v8.js
381 KB, the kits 51 KB, inkbirds.v4.js 193 KB, its wing model 186 KB, the
plan's worker 73 KB (node tools/minify.mjs --report build/src: the five
minified, before and after, raw and brotli).

theme-color is #173a63 in the HTML (the day still's top: a visit with no
script), takes the top of the hour's still sky (hour.v3.js, before the
first paint), the world's still top for the hour (the wide windows' own
on a window 6:5 or wider) as the world's script's first act, and follows
the top of the drawn world. The favicon is SVG-first with PNG fallback.

## Caching

Once Cloudflare Pages deploys tools/build.mjs's output (build command
`npm ci --no-audit --no-fund --ignore-scripts && node tools/build.mjs dist`,
output directory `dist`), the served scripts and stylesheet are named by
their content and a changed file gets a new name by itself. Until site/
stops carrying the built files, the vN names below still name site/'s
files and the rule below still holds for them.

HTML: max-age=0, must-revalidate. Everything else: max-age=31536000,
immutable. Immutable means CHANGED BYTES NEED A NEW FILENAME: bump
style.vN.css → style.vN+1.css, world.vN.js, realm-kit.vN.js,
realm-dunes.vN.js, realm-above.vN.js, inkbirds.vN.js, plan.vN.js,
start.vN.js and the wing model's six files (facetform, facetpose,
wingmodel, model, labbird, birdwing .vN.js) each to its vN+1, hour.vN.js →
hour.vN+1.js, .subN → .subN+1, and update every reference in the same
commit: site/index.html (stylesheet, hour, every script), site/404.html
(stylesheet, hour), site/\_headers (the Link preloads of the style, the
hour, the start file, the world and the kits, each file's cache block, the
"next name" comment), src/ (a minified script's readable copy carries its
served name: git mv both, or CI's build check fails), tools/start.mjs for
start.vN.js (it writes the start file's own name, and the next one, into
the file's header; CI checks the start file against what the same script
makes, so it would not catch a stale name), the world's source for
plan.vN.js (it starts the worker by its literal name),
.github/workflows/validate.yml (required files only — the other steps
resolve the shipped versioned names themselves with ls), and this file
(grep it for the old name). validate.yml's reverse check fails on a
leftover old version, and on any script or stylesheet in site/ that no
page loads (the plan's worker aside: the world starts it, by name) or that
has no version in its name (site.js aside), so git mv rather than copy. A
change made in src/ is a change to the copy built from it, so that name
goes up; and a change to any program of the first frame changes the start
file, made again under a new name. The plan's worker is the world's own
code (the spans it copies verbatim, under their md5's stamp, which the
world's PW_V must equal: world_rules.py rule 2b): a change to those spans
in the world needs the worker made again, under a new name.

The browser's shader cache answers only for a GLSL source it has seen byte
for byte, so a returning visitor's world is quick only while every
program's text stays the same: CI step "Every visit compiles the same
shaders" (glsl_guard.js) runs the site's scripts as shipped in node, in a
fake browser with a fake WebGL2 context, for 15 visits of five devices,
and fails unless every visit of a device compiles the same sources,
devices differ only in the #define lines after #version, and the reference
device's programs are exactly glsl_manifest.txt. So a change to a
program's text comes with its manifest lines in the same commit (node
.github/workflows/glsl_guard.js site --write
.github/workflows/glsl_manifest.txt), and the diff names the programs a
deploy makes every returning visitor compile again.

## SEO

Canonical URL, Open Graph tags, Twitter card meta, JSON-LD Person schema.
Title: "Derek Zhou — Technology Leader".

## Security

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
block in \_headers (/plan.v1.js: immutable, default-src 'none'; a
worker's policy is its script's headers, not the page's, and no other
rule sets one on that path). The start file's table runs as a second
worker under the same worker-src (/start-table.v2.js: immutable,
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
hour.v3.js, start.v2.js and its table start-table.v2.js, the five minified scripts as written (src/'s
world.v8.js, the kits and inkbirds.v4.js), the wing model, plan.v1.js,
plus style.v16.css for cursors and a bird rule, and \_headers for a bird
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
literal name); any dev or record hook (window.__*, window.claude,
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
listeners only in world.v8.js and only by name (its two on the plan's
worker, its answer and its failure, one each); the script order (the
world and the kits first, fetchpriority high, then the wing model and
the ink birds, low; the start file the one async script, high, right
after the canvas); the plan's worker (rule 2b: at most one, plan.v1.js,
by its literal name; its block in \_headers exactly its immutable cache
and default-src 'none', worker-src exactly 'self' where it is started;
its code the world's own spans verbatim, stamped with their md5; rule 4:
pure arithmetic, no DOM, window, storage, network, entropy or clock, one
listener, message, and two postMessage calls, its answer and its refusal);
the start file (rule 4b: no DOM building, URL hook, storage, sound,
module, worker or network; no entropy, clock, timer or animation frame;
one listener, webglcontextlost; nothing put on window but WORLD_START);
the scripts' text read from src/ (world_rules.py site build/src); and the
owner's rule as code: the composite takes no words input (its uniforms a
fixed list: a new one is a deliberate change there), the old lift's parts
are named nowhere, the ink birds alone read their keep-off, and nothing is
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
Nothing but the site is served: the site is the folder site/, the Pages
project's build output directory (still no build command), and
CLAUDE.md, .github/ and the font scripts stay outside it (404 from the
site, a percent-encoded spelling such as /%43LAUDE.md too). The
repository is private (2026-11-03). Before the move Pages served the
repository's root, and /%43LAUDE.md reached this file past the
exact-path redirects of /CLAUDE.md and /.github/* (Cloudflare matches a
redirect on the raw path); those two lines left \_redirects with the
move. (Old deployments' own pages.dev links keep their old files.) CI
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

## Verify

Before a change to the world, its kits or the ink birds:

- CI, every step, locally as the runner runs it (each `run:` step in
  `bash -eo pipefail` from the repository's root; W7's step needs
  playwright-core and a Chrome: PW_CORE and CHROME_PATH name them).
- The world is measured in its dev build (the same source with its
  harness: a seed, a moment, a still, the switches, words=0 for the twin):
  stills of every sky at 393x852, 430x932, 768x1024, 1024x768, 1366x768,
  1440x900, 1920x1080 and 2560x1440 (Chrome on a GPU through ANGLE, or
  Chromium on Mesa llvmpipe or SwiftShader); the words' contrast, every
  role against every ground pixel under it (the lettered name's strokes,
  the line, the credit, each link; the ring 2-6 px about each link),
  through holds of every sky and through every change, at least 4.5:1 and
  the ring 3:1 (stage 2: the name 5.41:1 or more, the line 5.49, the
  credit 4.90, the links 5.34, the ring 4.27); W7 twin runs (the frame
  with the words' machinery on against off, the same visit and moment,
  every channel of every pixel: none lower); W8 (every pixel's OKLab L
  against 0.53 outside the moon's footprint and the ink birds); the
  moon's footprint clear of the words, the view turned to face it; the
  camera's pitch at every window shape (9 degrees more from 6:5, exactly
  as before below it); the start, timed on a real GPU, cold and on a
  return, on a desktop and on a throttled phone; the sharpness against a
  reference drawn at the device's own px, and a film under a drag against
  that reference's (nothing may glitter more than it does); the governor
  on synthetic frame clocks; reduced motion both ways, a lost and
  restored context, rotation, print, forced colours (the ink birds
  alone, in CanvasText), no WebGL2 and no script (the still sky
  and the words, and no bird SVG, script or rule on the page),
  the 404 page. And on a real iPhone (no harness reaches its
  WebKit or its memory; Chrome under an iPhone user agent is not
  WebKit, and passed while every iPhone kept the still sky): the world
  boots and shows, without a frozen page, and a
  10-minute visit with the screen on is never reloaded by Safari (the
  full phone tier draws at 2 device px a CSS px; if it reloads, that
  tier goes down to 1.6).
- Then the dev build is cut to src/'s files by its counted edits
  (each must match exactly once), those built into site/'s by
  tools/minify.mjs (the start file by tools/start.mjs), and the
  build proved to change nothing a visitor sees: both builds
  served side by side, the same visit (the page's one entropy
  read answered alike) and the same hour (the clock faked), the
  frames driven by the harness, a fixed interval each, and at each
  moment the canvas read back and the DOM serialised: identical,
  at 1440x900 and 393x852 at least. In that harness the GPU's name is
  faked and its fences and parallel compiles report done (or llvmpipe
  would rightly get the still sky, and this shared machine's timing would
  decide what is drawn when).
- The live check after a deploy: the page's words, the world drawing at a
  day and a night hour, the still skies with no WebGL2 and no script; the
  home page served from site/, and /CLAUDE.md, /%43LAUDE.md,
  /.github/workflows/validate.yml and /subset-fonts.sh each answering 404.

## Deploy

Cloudflare Pages: no build command, the build output directory site
(the project's Settings > Build, its build configuration). Auto-deploys
on push to main. Every change to the live site goes through a pull
request the owner approves. The repository is private, so CI uses the
account's included Actions minutes (2,000 a month on GitHub Free).
