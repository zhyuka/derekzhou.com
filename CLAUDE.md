# derekzhou.com

Personal site for Derek Zhou. Pure HTML, CSS, JS. No frameworks. No build step.

## Structure

/index.html             Home page: the words over a 3D world, drawn live behind them
/style.v14.css          All styles (versioned name — see Caching): the still skies of each time of day
/site.js                Email obfuscation only
/hour.v2.js             The hour: which time of day the world opens on (the page's one clock read)
/birds.v11.js           Today's birds: they fly over the still sky while the world boots, then hand it over (see Birds)
/world.v1.js            The world: the engine, the camera, the time of day, the words' inks, the governor (see World)
/realm-kit.v1.js        The builders the world's kits share (rocks, ruins, stupas, temples, isles)
/realm-dunes.v1.js      The dunes' kit: the sand province's land, rock, landmarks and light
/realm-above.v1.js      The cloud sea's kit: its surface, towers, canyons, floating isles and light
/inkbirds.v1.js         The ink birds: today's birds' own code, living in the world (see Birds)
/subset-fonts.sh        Regenerates the .sub2 font subsets (manual tooling)
/download-fonts.sh      Fetches the full source fonts (manual tooling)
/404.html               Custom 404 page (the hour's still sky, no world, no birds)
/assets/favicon.svg     Adaptive circle favicon (dark in light mode, inverse in dark)
/assets/favicon.png     PNG fallback favicon (32x32)
/assets/apple-touch-icon.png  180x180 iOS icon
/assets/fonts/          Self-hosted WOFF2: Geist and Geist Mono, full faces (sources)
                        + two .sub2 subsets (served), and OFL.txt (their licence)
/robots.txt             Allow search engines, block AI crawlers
/.well-known/security.txt  Vulnerability reporting
/\_headers               Cloudflare Pages security + caching + Early Hints headers
/\_redirects             HTTPS enforcement; /CLAUDE.md and /.github/* redirected to / (exact paths: see Security)
/.github/workflows/validate.yml  CI checks (and, beside it, the world's: world_rules.py,
                        w7_unit.js, lint_realms.js; never served: /.github/* is redirected)

No Functions, no private pages. A private /studio/ needs an origin guard
first (a Pages Function that checks the Cloudflare Access token again, with
\_routes.json sending it every private path), because Access alone lets a
percent-encoded path through and does not cover the pages.dev host. The
owner keeps a tested guard in a private repo. The Access application on
derekzhou.com still lists paths for pages that no longer exist: Access asks
for a sign-in there, and past it they serve 404.

The shipped scripts have no development harness: the world is built and
measured in a dev build with hooks on `<html>` (a seed, a moment, a still,
switches, a record), and the files here are that build with every hook cut
out by counted edits (see Verify). Nothing on the page reads such a hook.
The record's code and the dev helpers those hooks called are left in
world.v1.js, unreachable (the switches keep their defaults; cutting them
is a change to the engine, to be proved frame for frame like any other).
The comments keep the dev build's tags and the names of its files
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
the words' role (.words), its text in a span of its own (the world reads
that span's line boxes, so its ink and its birds keep to the letters and
not to the ragged right), with a non-breaking space in "Product
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
this world with the time of day and that camera first, the steering's
next round and new birds later. So: the name is lettering (see Type);
nothing on the page darkens the world or lifts it for the words, and the
words take whichever ink their own ground reads best in (see World).

The words' colours follow the ground the world draws behind them (see
World: the words), and the world is never changed for them. Dark ink:
text #000 (the lettered name, the line, the links), the dimmed grey (the
credit) and the focus ring worked out from their ground, selection
#e6e2d6; light ink: text #fdfcf7, a cool light grey, a light gold ring,
selection #3b3f55. The stylesheet carries each still sky's colours; the
world sets the drawn world's (CSSOM custom properties: the stack's on
.stack, the links' on the footer, the browser's bar by theme-color). bg
#f9f8f1 (Samara's cream) stays the paper: print, and the colour under
everything. color-scheme stays light (no form controls, no scrollbars).
Type is matte: no text-shadow, no glow. Links are plain underlined words
(1px, dimmed underline, .18em offset); nothing reacts to hover; OS cursors
only. The name and the type are present at first paint in their final
place (the drawing's box is reserved by the stylesheet), in their hour's
colours (hour.v2.js runs before the first paint). Print hides the world,
the birds and the footer, on white (every still sky, the world's too,
gives way to the paper, background graphics on or off: CI checks the
print block); the name and the line print black, the name 16rem wide.

## World (world.v1.js, realm-kit.v1.js, realm-dunes.v1.js, realm-above.v1.js)

The window is a camera flying through one endless world drawn in WebGL2,
generated in code from the visit's seed (no picture, no model file). Each
file's header comment is its full design; this is the outline.

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
once each into small 3D textures and marched at half resolution, bloom,
light shafts, and the composite (a shoulder that keeps hue, the grade,
one fixed 8-bit dither: no bands, nothing that fizzes).

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
0.95 to 1.75 of height over width). Everything that frames the view reads
the same pitch (the camera, the planner's forecast of it, the moon's
place). (The owner's yes of 2026-10-29 to a desktop camera pitched up 9
degrees more is not in this build yet: it follows once an upright
tablet's credit holds its contrast under the tilt, with the world's
still skies taken again for the horizon it gives.)

THE TIME OF DAY: the world's sky (the sun or the moon, the gradient, the
haze, the cloud's light) is one of eight skies: sunrise (dawn), fair
(day), mist (rain), golden hour (sunset), the afterglow and the blue hour
(dusk), the moonlit sky and first light (night). Each is a set of colours
and amounts laid over each kit's own light and a paint of everything the
kits paint (land, stones, isles, creatures), with a time of day, its
words (dark by day, light at dusk and night), a hold (70-105 s, x0.9-1.15
by the draw), a change of 55-60 s and its near skies. A visit opens on a
sky of the visitor's own time of day (hour.v2.js: night 21-05, dawn 05-08,
day 08-13, rain 13-16, sunset 16-19, dusk 19-21; first light is never a
landing), as far through its hold as data-sky-at says; after that the
order is the world's own, with no clock: mostly into a near sky, now and
then (SKY_FAR 38%) into any through the mist, never into one of the last
SKY_RECENT 3, a sky not yet seen likelier, and after a run of four skies of
one kind of words the other kind four times likelier. Colours blend in
OKLab along the hue's arc (never through grey) on two clocks (the light's
and the structure's). A change between skies of different words passes a
twilight waypoint: the sky even, the land lost in a mist of the
twilight's own light, and the light under the words crossing the band
where neither ink reads well (OKLab L 0.562-0.654) in CROSS_T 3.6 s. The
skies with light words keep all their own light under a ceiling (uCeil,
OKLab L 0.53 with a soft knee, the same everywhere on the window: the
world's own light, never a function of where the words are); the moon is
a pale flat disc held under it too, standing above the words where the
window has room, else above its top edge. The cycle runs on the flight's
own clock, its draws from the visit's own streams. Five more skies (azure,
silver, rose, the Milky Way, the aurora) are written but not compiled in
(SKY_PHASE 1).

THE WORDS (the owner: "Don't darken the background anywhere ever", and
"remove that white background behind the text. it's fine failing
accesibility"): nothing is done to the world for the words. No lift, no
floor, no gain, no veil, no cap, no calm about them: the composite takes no
words input at all, so the frame with the words' machinery on and off is
the same program on the same inputs (W7). Two groups take their ink each
from their own ground, as the world drew it (the composite read back at an
eighth through a ring of buffers and fences, never a stall): the stack
(the name, the line, the credit; on .stack) and the links (on the
footer). Each ink is scored by its APCA |Lc| on its own worst ground under
the group's boxes (the links: dark ink on the darkest cell under their
own letters, light on the lightest; the stack: its ground's darkest and
lightest tenth); the other ink is taken only when it scores INK_M 8
better, once that want has held INK_HOLD 5 s (the stack's turn to light ink
INK_HOLDS 60 s), and no sooner than INK_DWELL 20 s after the group's last
flip; a rescue only where the shown ink cannot be read (|Lc| under 20 on
the ground's median), never within 20 s of the last flip; never more than
INK_CAP 3 changes a minute. At load each group takes its first ink from
the readings of the frames shown in the first INK_TAKE 0.5 s. Through a
change between skies of different words each group turns to the incoming
sky's words once, on the first reading where they score at least as well
(toward dark the stack at three quarters of the change at the latest),
never back. The credit's grey and the focus ring are worked out from their
own ground. On the drawn world WCAG's 4.5:1 is not promised (the owner's
waiver); the still skies hold it (CI). W8: on the skies with light words no
pixel the world draws stands above OKLab L 0.53 outside the moon's
footprint (the ink birds aside).

BOOT AND HAND-OVER: the page paints at once with the hour's still sky
(the stylesheet's, per time of day, :has(canvas.sky)) and today's birds
over it. The world's scripts only define at their top level; the boot
starts in the first animation frame after the ink birds (the last
deferred script) have registered, once a bird of today's first flight is
in view (at most 2.5 s after it was due), and is staged a step a frame
(the context, the programs compiled in parallel where the browser allows,
the noise, the first cells, timed trials of the device). The canvas then
dissolves in over 2 s; today's birds plan no new flight, finish a crossing
that ends within 6 s and fade the rest with the dissolve; the ink birds
take the sky from the dissolve's end.

THE GOVERNOR AND COST: the canvas at most 1.25 device px a CSS px (and
under 1.3 Mpx); every frame's time in a two-second ring, each second the
median; three slow seconds step the render scale down a rung (1, 0.85,
0.72, 0.6, 0.5), a second rung tried if the first did not help, both undone
and the frame time learnt as the pace if neither did (a 30 fps cap is
simply the pace); twenty seconds at ease step back up; ten seconds under
half the pace at the last rung, or under 15 fps that the scale cannot
help, and the loop stops and the still sky stays. Memory tiers by
device (desktop, a full phone, two low). A renderer on the CPU
(SwiftShader, llvmpipe and the like, by its name) keeps the still sky from the start; so does a
boot whose timed trials miss the floor, a first frame doubted twice, or a
broken program. A hidden tab draws nothing.

FALLBACKS: no WebGL2: the still sky of the hour (data-sky) and its words,
today's birds flying over it; no script: the still day sky, no birds; a
lost context: the still sky of the time of day being drawn, until
restored; prefers-reduced-motion: one still frame of the world, drawn
again when the words move, live both ways (and the inks set from it);
forced colours: no world (today's birds on the system's colours), and
the world back when they end; print: none of it.

THE WEATHER (=rand()): one crypto.getRandomValues above world.v1.js's
INIT-END marker, split into splitmix32 streams and integer hashes (the
same in JS and GLSL, bit for bit): the land, the cells, the sky order, the
ink birds (today's birds draw their own one, above their own INIT-END).
The realm and kit files and the ink birds draw nothing of their own. The
world's one clock is clockNow() (performance.now, above INIT-END), read
for budgets only, never for what is drawn; time is
requestAnimationFrame's own.

## Birds (birds.v11.js, inkbirds.v1.js)

TODAY'S BIRDS (birds.v11.js, which is birds.v10.js with the hand-over):
twelve inline SVGs at the end of index.html, lent to flights, each bird
drawn afresh in the tattoo's hand (an "M" gull stood on a steep
diagonal, its rises and drops reading as steps, round-capped, the pose
redrawn on twos and the line re-jittered six times a second), many kinds
(geese, ibis, gulls, herons, crows, finches, swallows, storks) with their
own sizes, paces, wing-beats from field data, flap and glide; flights in
patterns (skeins, lines, pairs, loose flocks, lone birds, thermals: a
scripted leader path, every other bird in a place behind it, never boids),
crossing a sky seen in depth (a camera looking out over the sea of cloud),
calm (spans a second slowed to the page's calm, mostly gliding, at most
two flights, three on a wide sky, empty spells, a sky that thins over a
long visit), every path planned whole before its first bird enters,
clear of the words, the edges and the other flights; entering beyond an
edge or out of the distance and leaving the same way, never starting,
stopping, bouncing or turning back in view. They fly over the still sky
while the world boots (and wherever it cannot run), tell it when their
first bird is in view (skyAir.flying), and hand it the sky when it shows
(skyAir.handover / handed): no new flight, a crossing ending within 6 s
finishes, the rest fade with the dissolve; handed back (a lost context,
the world giving up, forced colours) they plan again. The file's header
is its full design, its research and its numbers. pointer-events: none.

THE INK BIRDS (inkbirds.v1.js): the same birds by their own code carried
over (the kinds, the hand, the flights, the calm, the planner, the
rhythm), 3D-ified "just enough": each flight flies in a frame that travels
with the camera but keeps its own heading in the world, so a turn of the
view sweeps the birds across the window with the land; each bird built
in 3D from its own mark (a wing chain seen from behind, banked by the
mark's lean), placed and projected through the world's camera every frame
and drawn as ink in one instanced draw (round caps and joins, the live
pen and boil in screen px), with a breath of the world's air and light on
it. They take their own ink off the words' ground (the one keep-off the
world draws, read by them alone), which can only leave a pixel lighter.

The birds fly for as long as the page is open, as the world moves. That
is automatic motion over five seconds beside content, which WCAG 2.2.2
(Level A) answers with a pause control; the owner chose a page without
one. prefers-reduced-motion is the stop.

## CSS

One file: style.v14.css. Plain CSS. Custom properties for theming.
All @font-face declarations (subsets + metric fallbacks) at top of file.
Clamp-based spacing for fluid layout across viewports. Two families of
still skies, each a gradient on the body with its words' colours: the
hour's (:root[data-sky], six times of day; the 404 page, and the home
page's no-script day sky) and the world's (:root[data-sky]:has(canvas.sky),
each time of day's landing skies as the world draws them at 393x852 and
1440x900, the words hidden, averaged row by row in OKLab, the horizon
55-58% down), so the world dissolves in over its own still; each sky's
colours hold against its whole gradient wherever a window puts the words
(as CI computes them: text 5.26:1 or more, the dimmed grey 4.69, the
focus ring 3.29; CI samples every gradient of both families and fails
below 4.5 and 3). The canvas
(.sky) is fixed behind everything (z-index -1) on the large viewport
(100lvh: a phone's toolbar coming and going never resizes the world),
unseen until drawn; touch-action pinch-zoom (pan-y too where the page
scrolls, everything the browser's while zoomed: data-touch), no text
selected while a drag steers (data-steer). Keyframes: `appear` (a bird's
1 s fade-in, Samara's, off under prefers-reduced-motion; the canvas's 2 s
dissolve, kept: a dissolve is not motion) and `vanish` (today's birds
fading with the dissolve); no transitions. A window under 500 px tall (a
phone held sideways) lays the stack out again to fit, so the page never
scrolls. :focus-visible is a 2px outline in the focus colour, offset 3px,
on every focusable. The name's two rules live here (CSP: style-src 'self',
no inline style): `.name svg` (display block, width min(25.25rem, 100vw
less main's padding), height auto, aspect-ratio 1310 / 314) and
`.visually-hidden` (the clip pattern); print sets the drawing 16rem wide.
`.words` is the words' role for a paragraph (the line under the name, the
404's line).

## JS

Eight files, one job each, in this order (CI step "The world's page loads
in order"; every script tag carries data-cfasync="false", so Rocket Loader
leaves the order as served):

1. hour.v2.js — in the head, before the first paint (tiny,
   Early-Hinted): which time of day the world opens on (data-sky,
   data-sky-at) and the browser's bar.
2. site.js — email obfuscation: HTML has href="#" id="email-link", JS
   assembles mailto from split parts at runtime so bots cannot scrape the
   address. A \<noscript\> fallback shows the email in HTML entities.
3. birds.v11.js — today's birds (deferred, first: they fly at once).
4. world.v1.js — the world (deferred).
5. realm-kit.v1.js, realm-dunes.v1.js, realm-above.v1.js — the kits
   (deferred; each registers itself with WORLD.realm; keep the order).
6. inkbirds.v1.js — the ink birds (deferred, last: the boot starts once
   it has registered).

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
  filled with currentColor, so it takes the words' ink (black on a light
  ground, #fdfcf7 on a dark one, CanvasText in forced colours). The h1 is
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
weights only (400, 500), emphasis made by black against the dimmed
grey rather than by weight; a handful of sizes on the same clamp()s;
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
(pinned); ./subset-fonts.sh cuts the subsets. Geist is one variable file
cut to the two weights the site sets, wght 400-500 (10.9 KB, smaller
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

The world's scripts are not on the path to the first paint (deferred,
not preloaded): world.v1.js 749 KB (250 KB gzipped), inkbirds.v1.js 229 KB
(78 KB), today's birds 104 KB, the kits 78 KB.

theme-color opens at the top of the hour's still sky (hour.v2.js, before
the first paint), takes the world's still top for the hour as the world's
script's first act, and follows the top of the drawn world. The favicon
is SVG-first with PNG fallback.

## Caching

HTML: max-age=0, must-revalidate. Everything else: max-age=31536000,
immutable. Immutable means CHANGED BYTES NEED A NEW FILENAME: bump
style.vN.css → style.vN+1.css, birds.vN.js → birds.vN+1.js, world.vN.js,
realm-kit.vN.js, realm-dunes.vN.js, realm-above.vN.js, inkbirds.vN.js each
to its vN+1, hour.vN.js → hour.vN+1.js, .subN → .subN+1, and update every
reference in the same commit: index.html (stylesheet, hour, every
script), 404.html (stylesheet, hour), \_headers (the style and hour Link
preloads, each file's cache block, the "next name" comment),
.github/workflows/validate.yml (required files only — the other steps
resolve the shipped versioned names themselves with ls), and this file
(grep it for the old name). validate.yml's reverse check fails on a
leftover old version, and on any root script or stylesheet no page loads
or that has no version in its name (site.js aside), so git mv rather than
copy.

## SEO

Canonical URL, Open Graph tags, Twitter card meta, JSON-LD Person schema.
Title: "Derek Zhou — Technology Leader".

## Security

All content directly in HTML. No innerHTML. No JS-generated DOM: the
canvas, the stack, the footer and the twelve bird SVGs are all in
index.html. The lettered name is an inline SVG in index.html (one path;
no text, script, style, link or paint server in it), and CI step "The
lettered name keeps its words" fails if the h1 loses its visually hidden
words, the drawing loses aria-hidden or grows anything but its one
currentColor path, or the stylesheet stops reserving its box.
External JS and CSS files (enables strict CSP with no unsafe-inline —
CI greps index.html and 404.html for inline style, handlers and script).
\_headers file: script-src 'self'; style-src 'self'; connect-src 'none';
frame-ancestors 'none'; form-action 'none'; HSTS with preload;
COOP + CORP same-origin; Referrer-Policy no-referrer; broad
Permissions-Policy denial (the accelerometer and the gyroscope included:
Android's phone-motion steering would need accelerometer=(self),
gyroscope=(self) on /*, a choice for the owner); X-Permitted-Cross-Domain-
Policies none. The world needs no CSP change: WebGL2 from same-origin
scripts, no workers, no blobs, no fetches, no eval; production is blind
(no telemetry, no beacon, no store).
CI checks that security.txt has not expired.
CI step "Absences are enforced" (scoped to index.html, 404.html, site.js,
hour.v2.js, birds.v11.js, world.v1.js, the kits, inkbirds.v1.js, plus
style.v14.css for cursors — never to this prose) fails on:
arrows/cookie/analytics/Loading/navigation-role vocabulary in the HTML;
any exit, idle, hover-position, key, blur, title, favicon-swap or storage
handler in the JS (a pointer's moves read only by the world's drag: its
one pointermove listener added in onDown and removed in endDrag); any DOM
building; more or fewer than one getRandomValues in today's birds or the
world, or one below its INIT-END marker, and any in the kits or the ink
birds; any Math.random or clock read (Date) in them; performance.now()
but the world's one clockNow; anything in the hour but its one `new
Date(`; any URL hook (location., URLSearchParams), sound, network call,
worker or eval; any dev or record hook (window.__*, window.claude,
console) or an attribute read on `<html>` but the hour's data-sky and
data-sky-at; and any `cursor:` rule in the stylesheet (OS cursors only).
CI step "The world's rules" (world_rules.py) adds: every script tag
tagged for Rocket Loader; every home-scope CSP with connect-src 'none'
and none on /*; no diagnostics, control or lab page; the world's
listeners only in world.v1.js and only by name; the script order; and the
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
\_redirects sends /CLAUDE.md and /.github/* to / (they were served as
static files). Exact paths only: Cloudflare matches redirects on the raw
path, so a percent-encoded spelling (/%43LAUDE.md) still reaches the
file; the repo is public, so nothing leaks that GitHub doesn't show. To
truly stop serving repo files, move the site into a folder and set it as
the Pages build output directory (still no build command).
robots.txt blocks: GPTBot, ClaudeBot, CCBot, Google-Extended, ChatGPT-User,
Bytespider, anthropic-ai, cohere-ai, FacebookBot.

## Verify

Before a change to the world, its kits, the ink birds or today's birds:

- CI, every step, locally as the runner runs it (each `run:` step in
  `bash -eo pipefail` from the repository's root; W7's step needs
  playwright-core and a Chrome: PW_CORE and CHROME_PATH name them).
- The world is measured in its dev build (the same source with its
  harness: a seed, a moment, a still, the switches, words=0 for the twin):
  stills of every sky at 393x852, 430x932, 768x1024, 1024x768, 1366x768,
  1440x900, 1920x1080 and 2560x1440 (Chromium on Mesa llvmpipe through
  ANGLE, or SwiftShader); films through the changes (one flip a group a
  change, the twilight's crossing); W7 twin runs (the frame with the
  words' machinery on against off, the same visit and moment, every
  channel of every pixel: none lower); W8 (every pixel's OKLab L on the
  skies with light words against 0.53 outside the moon's footprint); the
  inks' contrast through the changes; the governor on synthetic frame
  clocks; reduced motion both ways, a lost and restored context, rotation,
  print, forced colours, no WebGL2, no script, the 404 page.
- Then the dev build is cut to the shipped files by its counted edits
  (each must match exactly once), and the cut proved to change nothing a
  visitor sees: both builds served side by side, the same visit (the
  page's one entropy read answered alike) and the same hour (the clock
  faked), the frames driven by the harness, a fixed interval each, and
  at each moment the canvas read back and the DOM serialised: identical,
  at 1440x900 and 393x852 at least. In that harness the GPU's name is
  faked and its fences and parallel compiles report done (or llvmpipe
  would rightly get the still sky, and this shared machine's timing would
  decide what is drawn when).
- The live check after a deploy: the page's words, the world drawing at a
  day and a night hour, the still skies with no WebGL2 and no script.

## Deploy

Cloudflare Pages. Auto-deploys on push to main. No build command needed.
Every change to the live site goes through a pull request the owner
approves.
