# derekzhou.com

Personal site for Derek Zhou. Pure HTML, CSS, JS. No frameworks. No build step.

## Structure

The site is the folder site/: the Cloudflare Pages project's build output
directory, served alone (no build command). Everything else here is the
repository's own, and never served.

site/index.html              Home page: the words over a 3D world, drawn live behind them
site/style.v15.css           All styles (versioned name — see Caching): the words' colours, the still skies of each time of day
site/site.js                 Email obfuscation only
site/hour.v3.js              The hour: which time of day the world opens on (the page's one clock read)
site/birds.v12.js            Today's birds: they fly over the still sky while the world boots, then hand it over (see Birds)
site/world.v7.js             The world: the engine, the camera, the time of day, the words' colours, the governor (see World)
site/realm-kit.v1.js         The builders the world's kits share (rocks, ruins, stupas, temples, isles)
site/realm-dunes.v3.js       The dunes' kit: the sand province's land, rock, landmarks and light
site/realm-above.v2.js       The cloud sea's kit: its surface, towers, canyons, floating isles and light
site/facetform.v1.js         The wing model: the tattoo's M as a faceted solid (generated; see Birds)
site/facetpose.v1.js         The wing model: the faceted M posed
site/wingmodel.v1.js         The wing model: the measured wingbeat driving the M's rig
site/model.v1.js             The wing model: the measured per-kind wingbeat data (generated)
site/labbird.v1.js           The wing model: the measured wingbeat flying the M, flap and glide
site/birdwing.v1.js          The wing model: the measured wing made to fly in the world
site/inkbirds.v5.js          The ink birds: the living sky, every flock on its own business in the world (see Birds)
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
.github/workflows/validate.yml  CI checks (and, beside it, the world's: world_rules.py,
                             w7_unit.js, lint_realms.js)

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
switches, a record), and the files here are that build with every hook cut
out by counted edits (see Verify). Nothing on the page reads such a hook.
The record's code and the dev helpers those hooks called are left in
world.v7.js, unreachable (the switches keep their defaults; cutting them
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
looks blurry from afar too.. everything should be 10x quality". So: the
name is lettering (see Type); nothing on the page darkens the world or
lifts it for the words; the words are always light, and the world draws
only skies they read on (see World).

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

## World (world.v7.js, realm-kit.v1.js, realm-dunes.v3.js, realm-above.v2.js)

The window is a camera flying through one endless world drawn in WebGL2,
generated in code from the visit's seed (no picture, no model file). Each
file's header comment is its full design as of the build it came from
(stage 2's changes are tagged inline: stage2, speed, quality; where a
header and its code differ, the code and this file are right); this is
the outline.

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
between: sharp in the distance, never a ring), bloom, light shafts, and
the composite (a shoulder that keeps hue, the grade, one fixed 8-bit
dither: no bands, nothing that fizzes).

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
min-aspect-ratio 6/5, so the camera and the still sky it dissolves in over
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
a time of day, a hold (70-100 s, x0.9-1.15 by the draw), a change of
55-60 s and its near skies. A visit opens on the kept sky nearest the
visitor's own time of day (hour.v3.js: night 21-05, dawn 05-08, day
08-13, rain 13-16, sunset 16-19, dusk 19-21): dawn and day on first
light, rain and sunset on the afterglow, dusk on the blue hour, night on
the moonlit sea, the Milky Way or the aurora (the visit's draw), as far
through its hold as data-sky-at says; after that the order is the
world's own, with no clock: mostly into a near sky, now and then
(SKY_FAR 38%) into any through the mist, never into one of the last
SKY_RECENT 3, a sky not yet seen likelier. Colours blend in OKLab along
the hue's arc (never through grey) on two clocks (the light's and the
structure's). The twilight waypoint that a change between skies of
different words passed is never taken now (its code stays, unreached).
The skies keep all their own light under a ceiling (uCeil, OKLab L 0.53
with a soft knee, the same everywhere on the window: the world's own
light, never a function of where the words are); the moon is a pale flat
disc held under it too, standing above the words where the window has
room, else above its top edge. The cycle runs on the flight's own clock,
its draws from the visit's own streams.

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
can bring the moon behind them; they still read there, the credit at
4.83:1 the lowest measured so). So 4.5:1 held against every ground pixel
measured under the words (see Verify; the credit's lowest at the view's
own heading 4.90:1). The ceiling bounds lightness (OKLab L), not
luminance, so the margin depends on hue: on a saturated green at the
ceiling the credit would be about 4.4-4.5:1.

BOOT AND HAND-OVER (the owner: "should load instantly make it 10x
faster"): the page paints at once with the hour's still sky (the
stylesheet's, per time of day, :has(canvas.sky)) and today's birds over
it. The world's scripts only define at their top level; the boot starts
in the first animation frame after the ink birds (the last deferred
script) have registered, and is staged a step a frame, the context
first. Where the browser has KHR_parallel_shader_compile and is not
WebKit (Chrome, Edge, Firefox): every program issued at once, the probe
and the land first, all polled once a frame; the noise baked in one
frame; each warm-up draw made as soon as its own program is done, beside
the links still compiling. On WebKit (Safari on the Mac, every browser
on iOS and iPadOS, told by the user agent: it has the extension, but its
links and first draws are synchronous, and a batch of programs linked at
once froze the owner's iPhone for 20 s before) and where the extension
is missing: the old path, one program at a time, the noise a layer a
frame, the warm-up after the links and never in the noise's frame. Then,
on every browser: the first cells and cloud bodies made at sixteen times
the flight's budget while the canvas is hidden, so they are there from
its first frame in most starts (in 4 of 14 measured starts a large cloud
body still faded in 0.4-2.5 s after it); the ground cache and the probes
once the visit's plan is made and its weights' grid is on the GPU; then
the device's timed trials, from the full scale down, three a scale (two
where both run far over its bar: one alone may be the visit's first
full-size draw, a one-off cost). With forced colours on at load the
canvas is hidden and no render targets are made; they are made once
the colours end, before the boot's next frame. The canvas then
dissolves in over 0.5 s;
today's birds plan no new flight, finish a crossing that ends within 6 s
and fade the rest with the dissolve; the ink birds take the sky from the
dissolve's end. The land's grid is read as floats (ANGLE's Direct3D path
compiled the land's vertex program a second time at its first draw for
bytes), and the probe's height is one function (the weights and the
dunes' land made once). Measured on an RTX 4090 (Chrome headless, ANGLE
on Direct3D 11; live against stage 2's first shipped build, medians of
three): a cold desktop visit fully in at 4.20 s (live 18.95 s), a return
3 s later at 1.41 s (16.68), a phone's CPU throttled 4x at 6.05 s
(21.55) and 6x at 8.38 s (23.15). The wall left is the Direct3D compile
of the land's and the probe's programs, side by side (1.85 s and 1.33 s
alone). On a phone-speed CPU the world now often shows before today's
first bird. Since world.v5.js the land's height code is written for that
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
alike; such a change is proved by a read-back on ANGLE's D3D path. The
noise is drawn a layer a draw (NOISE.K = 1): ANGLE's D3D link builds the
pixel program for its first output alone.

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
itself, not cut from the dev build: the dev build needs the same line
before its next cut, or the cut drops it.

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
twenty seconds shown and until the first step down: a device that
starts low refines in seconds; never while an undone step's cool-down
runs); ten seconds under half the pace at the last rung, or under 15 fps
that the scale cannot help, and the loop stops and the still sky stays.
A resize keeps the density being drawn (the rung nearest it in device
px a CSS px), so a rotation or a window dragged to a new size neither
sharpens nor softens the world. The scatter and the particles thin to
0.6 on the rungs under 0.65 of the old size (its 0.6 and 0.5, as on
live: TIER). The boot's timed trials choose the first rung (the old
size's 0.35, 0.5, 0.7 and 1, and the tier's top). The density costs
memory: the world's targets for a 393x852 phone at 3 go from about 134 MB
to 201 MB, a Retina 1440x900 window's from 239 MB to 589 MB (a real
iPhone must hold a 10-minute visit at the full phone tier: see Verify). A
renderer on the CPU (SwiftShader, llvmpipe and the like, by its name)
keeps the still sky from the start; so does a boot whose timed trials
miss the floor, a first frame doubted twice, or a broken program. A
hidden tab draws nothing.

FALLBACKS: no WebGL2: the still sky of the hour (data-sky) and its words,
today's birds flying over it; no script: the still day sky, no birds; a
lost context: the still sky of the time of day being drawn, until
restored; prefers-reduced-motion: one still frame of the world, drawn
again when the words move, live both ways; forced colours: no world
(today's birds on the system's colours), and the world back when they
end, on at load too; print: none of it.

THE WEATHER (=rand()): one crypto.getRandomValues above world.v7.js's
INIT-END marker, split into splitmix32 streams and integer hashes (the
same in JS and GLSL, bit for bit): the land, the cells, the sky order, the
ink birds (today's birds draw their own one, above their own INIT-END).
The realm and kit files and the ink birds draw nothing of their own. The
world's one clock is clockNow() (performance.now, above INIT-END), read
for budgets only, never for what is drawn; time is
requestAnimationFrame's own.

## Birds (birds.v12.js, inkbirds.v5.js and its wing model)

TODAY'S BIRDS (birds.v12.js, which is birds.v10.js with the hand-over):
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
is its full design, its research and its numbers (as of birds.v10.js; the
hand-over and its 0.5 s fade are tagged inline). pointer-events: none.

THE INK BIRDS (inkbirds.v5.js, round 3): the living sky. The birds are
no longer flights planned to cross the window: every flock is an animal
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
stroke), lands on the D's top or the k's or u's exit stroke, sits in the owner's perch A (the folded M
seen side-on, upright at about 45 deg, lit to the words' white while it sits: only ever lighter),
never still for long, and leaps off and away. Not past LinkedIn's end: at link size on a phone it
read as a grey smudge (the owner's iPhone, 2026-11-05). No fades: it comes in from beyond the window's
edge and leaves out of view. The pointer's perch needs the hover listener the world does not
have, so it never comes. Each click or tap on the page that is not a drag and not on a link
starts a gull at that point (the drag's own pointerdown/up: no listener added) that springs off
and recedes into the distance; at most 4 at once; none under reduced motion.

The birds fly for as long as the page is open, as the world moves. That
is automatic motion over five seconds beside content, which WCAG 2.2.2
(Level A) answers with a pause control; the owner chose a page without
one. prefers-reduced-motion is the stop.

## CSS

One file: style.v15.css. Plain CSS. Custom properties for theming.
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
camera at 1440x900, the horizon about 72% down; so the world dissolves
in over its own still on every window. The colours hold against every
gradient wherever a window puts the words (as CI computes them: text
7.09:1 or more, the dimmed grey 6.33, the focus ring 5.67; CI samples
every gradient, wants each world sky's base still and its 6:5 one
exactly once each, and fails below 4.5 and 3). The canvas
(.sky) is fixed behind everything (z-index -1) on the large viewport
(100lvh: a phone's toolbar coming and going never resizes the world),
unseen until drawn; touch-action pinch-zoom (pan-y too where the page
scrolls, everything the browser's while zoomed: data-touch), no text
selected while a drag steers (data-steer). Keyframes: `appear` (a bird's
1 s fade-in, Samara's, off under prefers-reduced-motion; the canvas's 0.5 s
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

1. hour.v3.js — in the head, before the first paint (tiny,
   Early-Hinted): which time of day the world opens on (data-sky,
   data-sky-at) and the browser's bar.
2. site.js — email obfuscation: HTML has href="#" id="email-link", JS
   assembles mailto from split parts at runtime so bots cannot scrape the
   address. A \<noscript\> fallback shows the email in HTML entities.
3. birds.v12.js — today's birds (deferred, first: they fly at once).
4. world.v7.js — the world (deferred).
5. realm-kit.v1.js, realm-dunes.v3.js, realm-above.v2.js — the kits
   (deferred; each registers itself with WORLD.realm; keep the order).
6. facetform.v1.js, facetpose.v1.js, wingmodel.v1.js, model.v1.js,
   labbird.v1.js, birdwing.v1.js — the ink birds' wing model (deferred, in
   that order; each puts its one global on self).
7. inkbirds.v5.js — the ink birds (deferred, last: the boot starts once
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

The world's scripts are not on the path to the first paint (deferred,
not preloaded): world.v7.js 739 KB (247 KB gzipped), inkbirds.v5.js 472 KB
(160 KB), its wing model 181 KB (46 KB), today's birds 104 KB, the kits 80 KB.

theme-color is #173a63 in the HTML (the day still's top: a visit with no
script), takes the top of the hour's still sky (hour.v3.js, before the
first paint), the world's still top for the hour (the wide windows' own
on a window 6:5 or wider) as the world's script's first act, and follows
the top of the drawn world. The favicon is SVG-first with PNG fallback.

## Caching

HTML: max-age=0, must-revalidate. Everything else: max-age=31536000,
immutable. Immutable means CHANGED BYTES NEED A NEW FILENAME: bump
style.vN.css → style.vN+1.css, birds.vN.js → birds.vN+1.js, world.vN.js,
realm-kit.vN.js, realm-dunes.vN.js, realm-above.vN.js, inkbirds.vN.js and
the wing model's six files (facetform, facetpose, wingmodel, model,
labbird, birdwing .vN.js) each to its vN+1, hour.vN.js → hour.vN+1.js, .subN → .subN+1, and update every
reference in the same commit: site/index.html (stylesheet, hour, every
script), site/404.html (stylesheet, hour), site/\_headers (the style and
hour Link preloads, each file's cache block, the "next name" comment),
.github/workflows/validate.yml (required files only — the other steps
resolve the shipped versioned names themselves with ls), and this file
(grep it for the old name). validate.yml's reverse check fails on a
leftover old version, and on any script or stylesheet in site/ that no
page loads or that has no version in its name (site.js aside), so git mv
rather than copy.

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
site/\_headers: script-src 'self' https://static.cloudflareinsights.com;
style-src 'self'; connect-src https://cloudflareinsights.com
https://derekzhou.com/cdn-cgi/rum; frame-ancestors 'none'; form-action 'none'; HSTS with preload;
COOP + CORP same-origin; Referrer-Policy no-referrer; broad
Permissions-Policy denial (the accelerometer and the gyroscope included:
Android's phone-motion steering would need accelerometer=(self),
gyroscope=(self) on /*, a choice for the owner); X-Permitted-Cross-Domain-
Policies none. The world needs no CSP change: WebGL2 from same-origin
scripts, no workers, no blobs, no fetches, no eval; the site's own code
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
hour.v3.js, birds.v12.js, world.v7.js, the kits, the wing model, inkbirds.v5.js, plus
style.v15.css for cursors — never to this prose) fails on:
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
tagged for Rocket Loader; every home-scope CSP (and 404.html's meta)
with exactly script-src 'self' https://static.cloudflareinsights.com and
connect-src https://cloudflareinsights.com
https://derekzhou.com/cdn-cgi/rum, and none on /*; no diagnostics,
control or lab page; the world's
listeners only in world.v7.js and only by name; the script order; and the
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
.gitignore, CLAUDE.md, the two font scripts, site/, a functions/
folder): a new kind of file is a deliberate change to those lists.
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
  restored context, rotation, print, forced colours, no WebGL2, no
  script, the 404 page. And on a real iPhone (no harness reaches its
  WebKit or its memory; Chrome under an iPhone user agent is not
  WebKit, and passed while every iPhone kept the still sky): the world
  boots and shows, without a frozen page, and a
  10-minute visit with the screen on is never reloaded by Safari (the
  full phone tier draws at 2 device px a CSS px; if it reloads, that
  tier goes down to 1.6).
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
  day and a night hour, the still skies with no WebGL2 and no script; the
  home page served from site/, and /CLAUDE.md, /%43LAUDE.md,
  /.github/workflows/validate.yml and /subset-fonts.sh each answering 404.

## Deploy

Cloudflare Pages: no build command, the build output directory site
(the project's Settings > Build, its build configuration). Auto-deploys
on push to main. Every change to the live site goes through a pull
request the owner approves. The repository is private, so CI uses the
account's included Actions minutes (2,000 a month on GitHub Free).
