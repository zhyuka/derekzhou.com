# World (world.js, realm-kit.js, realm-dunes.js, realm-above.js)

<!-- Moved word for word from CLAUDE.md's section "World (world.js, realm-kit.js, realm-dunes.js, realm-above.js)" (restructure step 7, 2026-11-06). -->

The window is a camera flying through one endless world drawn in WebGL2,
generated in code from the visit's seed (no model file; its only pictures
are its own first frames, the openings' stills, made by the same code at
build time and shown until the live world cuts in: ## THE OPENINGS). Each
file's header comment (src/'s copy: the served one is minified) is its
full design as of the build it came from (stage 2's changes are tagged
inline: stage2, speed, quality; fast500's: fast500; where a header and
its code differ, the code and this file are right); this is the outline.

## THE WORLD

One world over an endless plane, its land and its sea of cloud
blended by smooth maps (the kits' weights), never a cut between places:
the dunes' kit (a dune sea with its families of dunes, far rock ridges,
mesas and buttes, giant shards, fields of ruins, temples on plateaus,
stupas) and the cloud sea's kit (broad swells and heaps of billows,
towers, canyons of cloud, floating isles, an isle with its temple).
Places come a minute or two apart at the flight's 12 m/s. Cells (landmarks, clouds, creatures) are generated per
world cell from the seed and the cell's coordinates, streamed in about
the camera within a budget a frame and freed behind it. Each frame: the
scene in HDR (4 samples a pixel where the device allows), the land as a
GPU clipmap raised by the kits' height functions (its rings placed from a
whole-cell lattice, (cell + aG) x cell size in one fp32 product, so the rings'
seams meet to the bit however far the flight has gone: origin metres + aG x
cell size parted them by 1.6 cm at 100 km and 12.5 cm at 681 km, the owner's
one-pixel lines (2026-11-14); test/unit/clipmap.mjs replays it in fp32 and
lints the old form, tools/gpu/seams.js reads both land programs on a GPU), the cloud bodies baked
once each into small 3D textures and marched at half resolution (brought
up by a Catmull-Rom clamped to the range of the 2x2 texels it lies
between: sharp in the distance, never a ring), bloom, and the composite
(a shoulder that keeps hue, the grade, one fixed 8-bit dither: no bands,
nothing that fizzes). The light shafts' pass is still in the code, but no
sky draws it: the amount is 0 in all six skies (see THE TIME OF DAY).

## THE FLIGHT AND THE CAMERA

Left alone the view holds its heading and flies
straight and level but for the ground's rise; what stands ahead and
cannot be climbed is passed by a slip sideways, planned from first sight
(the owner: "should keep flying same-ish direction unless user drags").
A drag anywhere (touch, pen, or a mouse with its main button held; it
starts after 8 px, so a tap stays a tap; a drag begun on a link steers and
never follows it) turns the view and the flight, 90 degrees across the
window's width, the scene following the finger; up and down it tilts the
view and the flight climbs or dives; let go, the turn runs on a little and
eases out. The steering reads a pointer's moves only while it is pressed;
the birds' play reads a hovering one (docs/birds.md: THE POINTER); no key is read, nothing is stored. Two fingers are never steering
(pinch-zoom stays the page's). On iOS the phone's own turn steers too once
Safari has asked, inside a tap or a drag on the page (never on a link,
never at load); everywhere else only the drag steers, and no motion
listener is added at all (the owner, 2026-11-06: "Keep drag-only"; this
site's Permissions-Policy denies the accelerometer and the gyroscope, see
Security, so on Android and desktop Chrome a listener only logged a
policy error; Chrome now offers DeviceOrientationEvent.requestPermission
too, so the ask itself is made only on iOS and iPadOS). Under reduced motion all of it is inert. The camera is a pinhole,
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

## THE TIME OF DAY

The world's sky (the moon, the gradient, the haze, the
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
kept sky nearest the visitor's own time of day (hour.js: night 21-05,
dawn 05-08, day 08-13, rain 13-16, sunset 16-19, dusk 19-21): dawn and day
on first light, rain and sunset on the afterglow, dusk on the blue hour,
night on the moonlit sea, the Milky Way or the aurora (the visit's draw),
as far through its hold as data-sky-at says; after that the order is the
world's own, with no clock: mostly into a near sky, now and then
(SKY_FAR 38%) into any through the mist, never into one of the last
SKY_RECENT 3, a sky not yet seen likelier. Colours blend in OKLab along
the hue's arc (never through grey) on one clock: the twilight waypoint a
change between skies of different words passed, the quick crossing of the
inks' band and the structure's own clock, which ran apart from the light's
only about them, went in the deep sweep (every sky's words are light;
the shaders' low mist for it, uTwM, stays compiled out by NO_TWILIGHT,
so that no vertex shader's text changes: T2 reads none back).
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
phone). The sky's own sun stays below the sea in every sky (THE AIR): through a change into a
night it keeps sinking (to 24 degrees below), and its warm glow, the warm
band low on its side, the haze's warm side and the high veil's brightening
sink with it and weaken with its depth; the Earth's shadow climbs and
dissolves, the noctilucent wisps go dark from below, and the night's own
glow comes in with the night's colours; out of a night into first light
or the blue hour it runs backwards. No sky draws light rays now (the owner
chose no rays at dusk and dawn: the afterglow's 0.1, the blue hour's 0.05
and first light's 0.15 are 0; the three nights' were 0 already). The cycle
runs on the flight's own clock, its draws from the visit's own streams.

## THE WORDS

(The owner: "Don't darken the background anywhere ever",
"remove that white background behind the text. it's fine failing
accesibility", and "lets only use white text for everything"): nothing
is done to the world for the words. No lift, no floor, no gain, no veil,
no cap, no calm about them: the composite takes no words input at all
(W7). The words' colours are constants, the stylesheet's own, for every
sky and every moment: no ink is read from the ground, none flips, there
is no dark ink, and the code that once did went in the deep sweep (the
read-back of the frame under the words, its target (the words' ground
at an eighth) and the inks worked out from it, off since stage 2), so
the composite is never read back for them and nothing is set on .stack
or the footer. They are chosen against
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
the words (docs/verify.md; the credit's lowest at the view's own
heading 4.90:1). The ceiling bounds lightness (OKLab L), not
luminance, so the margin depends on hue: on a saturated green at the
ceiling the credit would be about 4.4-4.5:1. A bird passing behind the
words (since 2026-11-05 nothing masks it there) is not held to these
numbers: a night's light ink under the light words lowers their
contrast for the moment it crosses, which the owner accepted ("it's
completely fine if the birds fly behind/in front of it").

## THE FIRST-PAINT HOLD

(The owner, 2026-11-06: "Yes, build the preview";
"Hold up to ~1 s"): where it runs, the page does not paint until the
world's first frame is drawn; the browser keeps the previous page or a
blank tab, then the words and the world appear in one frame. The world,
the kit and the realms are parser-blocking after the footer (the world
measures the words), and the head's link rel=expect href=#world-end
blocking=render holds Chromium's paint until the empty, hidden marker
right after the last realm's script is parsed (before 2026-11-06 it named
no element and lasted until the parser ended, the same moment, with a
console warning on every visit). The last realm's registration, the page still parsing, runs
the boot at once (holdRun): its staged frames one after another in that
one task, each a hold frame of 68267/4096 ms (no animation frame, the
boot's own logic unchanged), until the canvas shows; the first animation
frame after steps one hold frame. Inside one task WebGL 2 changes no
fence's status, so in the hold the boot makes no fence, counts the GPU
idle and reads at once (each read waits for its own data: RB.fix's way),
and the plan is made on the main thread beside the compiles (the
worker's answer cannot arrive; it is stopped after the first hold frame).
No hold (hour.js takes the link out before the body): reduced motion,
forced colours, no WebGL2, 4 or fewer cores, under 8 GB (deviceMemory),
a hidden tab, Firefox, Safari and every WebKit (until a real Mac's film
sets its deadline), Android, iOS/iPadOS; and (the world, after stage A)
no KHR_parallel_shader_compile, a phone GPU by name, or a hold foretold
to show the world later than HOLD_WORLD (1000 ms from the navigation's
start): from stage A (38 x A - 150 ms; only a clearly slow A, over
1.3 x HOLD_WORLD, skips there: stage A swings 15-45 ms at 1x on the 4090)
and from the first hold frame (26 x f1 + 220 ms), measured on an RTX 4090 with Chrome's CPU throttled
1x-6x. Where a hold may run, world.js makes the canvas's context as its script
ends, so the GPU process starts while the kits come, not inside stage A.
The deadline (2 s from the hold's start, 1.5 s on 5-7 cores) is the last net: past it
the link is taken out and the path below goes on. T2 shows the world's
first frame byte for byte the one without the hold (frame 0: gstep
counts a world shown in the page's own load as shown at frame 0). The
ink birds stay deferred and join after the show.

## BOOT

(The owner: "should load instantly make it 10x faster"): without the
hold, the page paints at once with the hour's still sky (the stylesheet's, per time of
day, :has(canvas.sky)) and the words, and nothing else is drawn until
the world's first frame: the ink birds fly in the world. The kits, the wing model
and the ink birds only define at their top level (each hands itself
to the world, WORLD.forms, WORLD.realm or WORLD.birds (WORLD.sky is the score's read-only feed: docs/sound.md), or puts its one
global on self); the world's also sets the browser's bar to the top
of the hour's still sky, draws the visit's seed and starts the plan's
worker. The boot starts in the first animation frame after the realms
have registered, once the page has painted (without the hold: the browser's paint
record, observed, at most PAINT_WAIT = 1 s; a page that painted already boots at once.
The owner, 2026-11-12: "make the world boot after the first paint"; on a return visit
the scripts come from cache and the boot used to run before any paint; then, on a page with the opening's still, the programs' batch (its issue and its one flush) waits until the still is on screen too, while the context and the objects (stages A and B) do not (load-perf, the lab's runs 21 and 22: waiting with the whole boot cost the A15 about 2 s): its file in, STILL_SHOW = 150 ms for its decode and two frames, or its largest-contentful-paint entry, at most STILL_WAIT = 1 s more (load-perf, 2026-11-14: the boot's one flush holds a phone's GPU process 2.6-2.7 s, and a still not yet uploaded waited behind it, to 5.75 s on the lab's Nord; test/sims/boot.mjs holds the first program after the still)) (the world, the kit and the realms are fetched first,
at high priority and Early-Hinted, the ink birds' wing model and the ink
birds after them, at low: the boot waits for neither those scripts nor
the page's load), and is staged a step a frame, the context first. The
ink birds join whenever their scripts come (their programs, from stage
C on, issued on a list of their own, polled once a frame and warmed
before they fly). The visit's first plan (the maps, the director and its
first tick, the weights' grids about the landing: pure CPU, the boot's
longest task, 0.43-0.72 s on a desktop and 1.5-2.5 s at 4x) is made in
a worker, plan.js, which the world starts as its script ends, with
the visit's seed, while the page evaluates the other scripts. The world
adopts the answer only if it is this world's (the worker's stamp, the
md5 of the world's code it copies verbatim), this seed's, the camera at
the landing and no grid made yet: the plan is the same doubles either
way. Anything else (no Worker, an error, an answer for another seed or
world, 8 s gone) and the page makes the plan itself, as before. Where
the browser has KHR_parallel_shader_compile and is not WebKit (Chrome,
Edge): every program issued at once, the probe and the land first, all polled once a frame; each warm-up
draw made as soon as its own program is done, beside the links still
compiling; the programs for what no first frame can show (the ink birds',
and the sand's particles and ribbons where the flight cannot reach sand
in the 30 s after the show) issued with the rest but finished after the
show. On WebKit (Safari on the Mac, every browser on iOS and iPadOS,
told by the user agent: it has the extension, but its links and first
draws are synchronous, and a batch of programs linked at once froze the
owner's iPhone for 20 s before): the old path, one program at a time, the
warm-up after the links and never in the frame the noise is finished in.
Where the extension is missing and the browser is not WebKit (Firefox,
Android's ANGLE-Vulkan, older drivers: EXT.issueAll): every program issued
in one frame and flushed, then one status read a frame, the warm-up after
the links as on the old path. Firefox has no KHR_parallel_shader_compile
(Firefox 160, measured on the RTX 4090, 2026-11-12): its first status read
waits for the whole batch, so a boot frame there holds the page for the
whole serial compile (3-5 s on that PC, cold or return). On every browser the noise is
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
finds a device too slow even there: its world is held (THE GOVERNOR). With forced colours on
at load the world does not boot while they hold and makes none of its
render targets (the ink birds fly alone and read none: see FALLBACKS);
it boots, and makes them, once they end. The show is a cut (the owner:
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

## THE GOVERNOR AND COST

(The owner: "everything should be 10x quality"):
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
that the scale cannot help, and the world is held (below).
A resize keeps the density being drawn (the rung nearest it in device
px a CSS px), so a rotation or a window dragged to a new size neither
sharpens nor softens the world. The scatter and the particles thin to
0.6 on the rungs under 0.65 of the old size (its 0.6 and 0.5, as on
live: TIER). The first rung is the tier's top (what the boot's timed
trials chose on every arm timed: none run at load now), and one frame
at 0.35 of the old size in the boot's last stage finds a device too
slow even there (over 21.7 ms twice). The density costs
memory: the world's targets for a 393x852 phone at 3 go from about 134 MB
to 201 MB, a Retina 1440x900 window's from 239 MB to 589 MB (a real
iPhone must hold a 10-minute visit at the full phone tier: docs/verify.md). A
renderer on the CPU (SwiftShader, llvmpipe and the like, by its name)
keeps the still sky from the start; so does a first frame doubted twice
or a broken program. A hidden tab draws nothing.

The held world (the owner, 2026-11-12, shown three sketches for the phones
that never showed the world: "a, the still world."): a boot whose 0.35
trial misses the floor, a GPU the Android lab measured too slow every time
(SLOW_GPU, by WebGL's renderer string: the Adreno 619, held from the start
with no trial) and the governor's floor all hold the world instead of
leaving the still sky. It is drawn whole once at the tier's top, however
slow, shown as a cut, then put up again every frame (represent: the
composite or its copy) with the ink birds flying over it on their own fixed
steps. Nothing else moves: no flight, no sky cycle, a drag steers nothing;
the governor does not run. Once held, where the frame lives in TG.win
(the world under the canvas's size: every phone of that tier), the targets
neither that copy nor the ink birds read are freed (heldFree: 14.8 to 7.9 MB
of textures at a 4 GB Android's tier on a 393x852 phone). A resize draws it
whole again, its targets made again first. Reduced motion
keeps its own still (the birds still too).

## FALLBACKS

No WebGL2: the still sky of the hour (data-sky) and its words,
no bird; no script: the still day sky and the words, no bird; a lost
context: the still sky of the time of day being drawn, until restored;
prefers-reduced-motion: one still frame of the world, drawn again when the
words move, live both ways; forced colours: the world not drawn, the
canvas cleared to the system's Canvas colour and the ink birds alone over
it, in CanvasText at full ink, in a still view of their own (the flight
held); while they hold from the load, no render target of the world's is
made (a world whose forced colours began mid-visit keeps its targets, and
makes them again at a new size on a resize); under reduced motion too one still
frame, drawn again when the system's colours change (read again about once
a second while it stands, as no media query reports a theme switched for
another of the same scheme); forced colours read from a media query list
of their own, never the one listened on (in Chromium a read of a list
takes up its change, and that list then fires no event: the world did not
come back when they ended while the ink birds moved), and the world back
when they end, on at load too; print: none of it.

## THE OPENINGS

A visit opens on one of a set: the hour's sky (hour.js's six times of day)
by N seeds (N 16 in hour.js: 96 openings; the owner, 2026-11-12: "Yes to
both, go with 96"). hour.js's one entropy read, written whole as
data-seed, picks the seed, k = read mod N (opening k's seed: (11 + k *
0x9e3779b9) mod 2^32, the world's OPENN and SEED0), before the first
paint, and asks for that opening's still: the world's
first frame for it, baked on the 4090 for the window's shape (twelve
shapes: the frustum's bands; portrait below h/w 1.893 the shorter still,
above it the taller, landscape the narrower) and the memory tier (lo: the
phones the world gives its least memory, Android under 8 GB; hi: the
rest) by tools/gpu/bake-stills.js, named <sky>-<k>-<tier>-<W>x<H>.avif.
The build copies the stills from an input folder (STILLS_DIR, or stills/,
never committed) into assets/still/, and only the bake's own: each named
in the folder's bake.json with its bytes' sha256 (anything else stops
the build), or from the release for its world (tools/stills.mjs). A build
with no stills takes the still's preload out of the page (before the world
key is read, so the key is the same with or without a set; put back where
a set is placed), and hour.js asks for a still only where the preload is. The stylesheet shows the still as
the body's ::before, the canvas's box, cropped as the canvas is; the world
opens at the still's own view (its frustum and pose, cropped as cover
crops it) and settles to the window's own in about a second (SVTAU 0.35
s); reduced motion has no settle. The world cuts in over the still in the
frame it shows and clears it (--still none) for good; without WebGL2 the
still stays. How far through its time of day the visit is (data-sky-at)
moves the first frame by at most one level (the moon's path), so it is
not baked. The land is the opening seed's for the whole visit, one of 16 whatever
the sky (the owner: "Keep 16 lands", 2026-11-13); what follows the cut
over it is the read's own (## THE WEATHER).

## THE AIR

The owner (2026-11-15): "they should follow real physics, clouds moving
(when/how they move), same w auroras, sand, etc. ... make sure there are
0 disconnects." The world keeps one state of its air and light in one
section, src/world/215-air.js, and every other system reads it there
(RULES.json one-world-state; test/unit/air.mjs by value, 16 seeds by six
skies; tools/checks/42-one-air.sh: the air's names written only there, no
wind or sun literal in any other section, the realms or the billows'
shader). It holds:

- The wind: one direction a visit (airDraw, the dunes' field stream's
  first draw, as before), blowing toward V.windAz, and its speed by height,
  windAt(x, z, y, t), y over the ground. U10, the speed 10 m up, is the
  visit's own (V.u10), drawn once from its own stream (subseed(V.seed,
  61)): a Rayleigh distribution of mean 5 m/s mapped by its CDF into
  3.0-7.5 m/s (the hub's ruling, 2026-11-15: the 40 m wind then stays
  under about 8.8 m/s, under every bird kind's airspeed, so no bird flying
  upwind goes backward; truncated, so nothing piles at the ends). Whether
  the sand moves at a given speed (its threshold, about 6.2 m/s at 10 m,
  the crests' speed-up 1.5x) is the sand's to decide. Under 100 m the
  log law over sand, u(z) = U10 ln(z / z0) / ln(10 / z0) with z0 = 0.003 m
  (0.1 m 0.43 of U10, 0.87 m 0.70, 2.5 m 0.83, 26 m 1.12, 60 m 1.22), in
  the surface's direction; from 100 to 300 m it eases to the low cloud
  layer's 1.3 U10, veered 20 deg, held to 1500 m; from 1500 to 3000 m to
  the deck's 2 U10, veered 40 deg (the wind turns clockwise with height
  toward the free air's; https://www.ecmwf.int/sites/default/files/elibrary/2016/16644-wind-turning-boundary-layer.pdf,
  https://www.eoas.ubc.ca/books/Practical_Meteorology/prmet102/Ch18-abl-v102.pdf).
  Each reader has a declared height (AIR_H); at a U10 of 6.5 m/s: the
  grains 0.8 m (4.5 m/s, times AIR_GRAIN_K, the sand's own share), the
  veils 5 m (5.9), the motes 13 m (6.7), the birds their own height
  (HOST.wind(o, y); 40 m by default, 7.6). Before physics: air/wind-profile
  the readers kept their own speeds (6.5, 5.5, 1.6, 6.5: the motes slower
  than the grains under them, the reverse of real air). The dunes' crests,
  the grains, the motes, the veils, the birds and the water's ripples read
  it.
- The readers still apart (AIR_APART, each with the change that joins
  it): the cloud billows' drift (AIR_DRIFT, fs-vbody's AIR_DRIFT(uT):
  0.4-0.6 m/s toward 233 deg on every visit), the high streaks' axis
  (AIR_CIRRUS: along world x), the maps' own wind field (mc.wind: the
  director's cover and the plan's dunes read it, so it is not dead: taking
  it out moves the plan's anchors), the wing gusts' private 25 s timers
  (birdwing.js) and the score's own gusts (score.js). The test fails when
  a listed reader is joined and still listed.
- The key light, keyAt(V): one direction for every sky, 5-14 deg up within
  55 deg of upwind (AIR_KEY_EL, AIR_KEY_AZ), made once a visit
  (airKeySet). The clouds' bake, the kits' lights (the land's uSun, the
  birds' HOST.light), the sky's sets, the sun's change and the cells read
  it; the cloud sea's kit has no sun of its own. At night it is the moon's
  light from the same place.
- The sky's own sun, airSkySun: the twilights' sun under the sea
  (AIR_SUN_EL: the afterglow and first light 3 deg, the blue hour 7), on
  the key's azimuth; a night's is the key's place; through a change into a
  night it sinks to AIR_SUN_NIGHT, 24 deg (THE TIME OF DAY). The key over
  the land and the sky's own sun are two lights on purpose: the land is lit
  by a low key, the sky's glow stands where the sun is under the sea.
- The moon on show (AIRAPI.moonAt: the moonlit stay's route), the sky's
  frame (skyFrame: the turn the stars and the galaxy take; today none) and
  the weather (weather(sky): today one wind for every sky; physics:
  air/wind-by-sky).
- The landing's heading, airHeading0 (drawn once from its own stream: the
  flight, the first plan, the galaxy's lie and the boot read it), and the
  flight's cruise band, AIR_CRUISE (14 m over the sand to 32 m over the
  cloud sea).

THE CLOCK. Physical motion (the wind, the clouds, the birds, the
particles, the aurora's own motion) runs at 1x real time, the flight's
SIM.t. The sky's light (sun, moon, stars, galaxy) runs at one declared
rate together, SKY_RATE, 100x. Today it does not: the sun sinks about
70-90x real through a change into a night, the moon crosses at 70-120x
and the stars and galaxy stand still; test/unit/air.mjs's clock test is
marked todo until the sky's lane brings them to SKY_RATE.

## THE WEATHER (=rand())

One crypto.getRandomValues, in hour.js, written whole as data-seed: it
picks the visit's opening (## THE OPENINGS) and seeds all that follows.
The opening's seed (SEED0) is the world's for all that is on screen at the
cut: the land and its cells (the land's field and the cells' hashes hang
on it for the whole visit), the opening sky, its light, the moon's side,
the galaxy's lie, the first heading, the ink birds' noise and the flocks
on show. The frame after the show (afterCut) the read itself (SEEDR)
takes over the rest: the sky order after the skies on show, the events on
the way, the ink birds' later flocks and the population's stream, the
score's seed and the idle's ease. Both are split into splitmix32 streams
and integer hashes (the same in JS and GLSL, bit for bit). So the land
along a visit's flight is one of 16 (the opening's seed; the sky is the
hour's), and what happens over it is the visit's own. The owner's pick,
of land seeded past the cut's far plane or a seam: "Keep 16 lands"
(2026-11-13). The world, the realm and kit files, the wing model, the ink birds and the
plan's worker draw nothing of their own (the worker is
handed the visit's seed): the hour's is the page's one entropy read. The
world's one clock is clockNow() (performance.now, above INIT-END), read
for budgets only, never for what is drawn; time is requestAnimationFrame's
own.
