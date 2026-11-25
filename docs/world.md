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
up by a cubic interpolating spline clamped to the range of the 2x2 texels it lies
between: sharp in the distance, never a ring), bloom, and the composite
(a shoulder that keeps hue, the grade, one fixed 8-bit dither: no bands,
nothing that fizzes). The light shafts' pass is still in the code, but no
sky draws it: the amount is 0 in all six skies (see THE TIME OF DAY).


Terrain-held clouds (delight-weather 3): on a windy visit (the wind over
a far ridge's crest, 100 m up, at least 7.7 m/s and within 30 deg of
square to it) a lenticular stands at the ridge's lee wave's first crest, half a
wavelength out on the crest's normal, turned downwind (pi U / N: U the wind across the crest at the
lens's height, N 0.01/s, a stable troposphere's buoyancy frequency; 1.9-3.0 km on windy visits, at most
3.2 km at the visits' top U10; https://www.eoas.ubc.ca/books/Practical_Meteorology/)
and 1100-1700 m up: one to three smooth lens plates
(120's lens), laid out by the 1500 m cell the lens stands in (the cell scans
the 3 x 3 ridge cells about it), from the ridge's own hashes (dunes-glsl's
ridges(): the land raises the same ridges), never where it would stand over
the cloud sea. It fades with its cell, not by its own distance, so it never
pops in when the cell is made or out when it is freed. Its envelope is held (a world
cell's); only its billows flow through it, at the wind at its height
(410 moves their offset in doubles; the shader reads no clock).
test/unit/lenticular.mjs: the gate, the ridges, the place on the crest's
normal, the held envelope, the flow within 5% of windAt, the plates' shape,
no pop at the cell's birth or freeing, a census of every ridge's lens (each
laid out once, by its own cell), and a census of a flight (windy visits:
about one lens in reach in half the minutes of a flight, at most three;
calm: none).

## THE FLIGHT AND THE CAMERA

Left alone the view holds its heading and flies
straight and level but for the ground's rise; what stands ahead and
cannot be climbed is passed by a slip sideways, planned from first sight
(the owner: "should keep flying same-ish direction unless user drags").
A drag anywhere (touch, pen, or a mouse with its main button held; it
starts after 8 px, so a tap stays a tap; a drag begun on a link steers and
never follows it) turns the view and the flight, 90 degrees across the
window's width, the scene following the finger; up and down it tilts the
view and the flight climbs or dives; let go moving, the turn runs on a
little at the finger's speed as it lifts and eases out; let go after it
rested (24 ms or more), it stays where it is. The steering reads a pointer's moves only while it is pressed;
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
disc held under it too. Opposite the moon, the moonlit cloud sea holds a glory (a bright
centre and pastel rings, the first red ring at 3.9 deg: the corona's 6 um
droplets) and a broad white fogbow at 37 deg: more of the sea's own light,
a function of the view's angle alone, on the sea's surface only (above-glsl's
A_glory, the moon's direction from the air's airMoon; test/unit/glory.mjs). A sun or moon never fades where it stands (the
owner: "yep this. same w sun."), and on a moonlit night the moon drifts
all night (the owner's choice, over a moon still between the changes): it
rises out of view as the night arrives, comes in through a side edge late
in the change, above the words, drifts across one way at one pace on a
nearly level path, leaves through the other side early in the change out
and sets behind the sea, never stopping or turning back (a visitor who
turns that way sees it rise or set; only its faint broad light on the sky
follows its depth); where the window has no room under its top edge, only
its glow passes along the edge. Its corona's coloured rings show only where
the 7 km veil's streaks stand thicker in front of it than the veil's even
mean, as patchy as those streaks; a clear patch or a clear night has none
(physics: weather/moon-corona).
The moonlit night is about twice as long
as before (the owner chose a slower moon), so the moon drifts 6-10 px a
second on a laptop and 2-3 on a phone; it shows on the visits that face
the side its light comes from (about 1 in 5 on a laptop, 1 in 9 on a
phone), and on every visit that opens on the moonlit sea (the hub's ask,
2026-11-15: the stills of the moonlit openings showed no moon). There the
opening's own stay is planned ahead, culminating at the view's own heading
whatever the key's azimuth, and timed so that at the cut the moon stands a
third of the window in from the edge it is heading for (never before its
culmination, so it still sets behind the sea before the stay ends; its
rising, before the cut, is never drawn): placed before the first frame, never
moved or faded to get there. Where the window has no room under its top edge
(the lo tier's wide windows, the words high), the room is taken where the
moon stands, with less of the 12 px keep beyond the footprint and then less of
the 1 deg under the top edge if it must, the footprint itself always clear;
where no row over the words fits at all (the lo tier's 2:1 windows) it
stands beside the words on its leaving side and leaves through the side edge.
It is planned in the still's own window (stillInputs: its size, frustum and
pitch), so the live first frame and the still agree; against the words' boxes
there, the union of the bake window's and its band's smallest window's (the
words keep their CSS size, so a smaller window shows them bigger): clear on
every window of the band from that one up, and a smaller window plans against
its own words (STILL_MIN, STILL_WORDS; tools/still-words.mjs measures both).
The plan is made in the part of the still every window of its band shows
(STILL_BAND: a wider window loses the still's top and bottom, a narrower its
sides), so the disc is whole on each, and its keep is the band's smallest
window's 12 px scaled into the still's pixels (stillFrame).
The meteors (delight-night §2; src/world/219-meteors.js), on the night skies
only (the Milky Way and the aurora; on the moonlit sea the bright ones only),
each a stay's own (the opening stay's from its seed, every later one's from the
visit's own read, as the halo's veils), at 1x real time: about one long grazer a stay,
from a radiant just under the horizon, running low and slow (3-5 deg/s) from
under 2 deg up to under 2 deg again (151-173 deg along its path, 30-58 s), so
no drag ever shows it ending in the open sky, its wake a rigid 2 deg
and its light constant, so it shows by crossing the window; and 1-3 short ones
(the owner, 2026-11-15: "Allow short ones too"), 0.3-1 s at 3-25 deg/s anywhere
mid-sky (20-55 deg up), a few a night, their light rising and falling softly over that moment, the one
exception RULES.json's no-fades names. Each is planned when its time comes,
against the view as it is then; none under reduced motion or in a still; drawn
by sky-body.glsl's meteorAt behind the haze, warm white or a fast one's green
head, no pixel past OKLab L 0.50.
The sky's own sun stays below the sea in every sky (THE AIR): through a change into a
night it keeps sinking (to 24 degrees below), and its warm glow, the warm
band low on its side, the haze's warm side and the high veil's brightening
sink with it and weaken with its depth; the Earth's shadow (blue-grey at
the sky's own lightness, drawn with the Belt only in the afterglow and first
light, never the blue hour: physics: twilight/shadow) climbs and dissolves;
the stars hold still in reduced motion and in the still (no twinkle there); the noctilucent wisps go dark from below, and the night's own
glow comes in with the night's colours; out of a night into first light
or the blue hour it runs backwards. No sky draws light rays now (the owner
chose no rays at dusk and dawn: the afterglow's 0.1, the blue hour's 0.05
and first light's 0.15 are 0; the three nights' were 0 already). The cycle
runs on the flight's own clock, its draws from the visit's own streams.

The night's bodies (delight-night §1 and §4; src/world/227-night-bodies.js). The
stars' amount no longer blends between skies (every sky's post.stars is 1):
each star comes out by itself, brightest first, once the faintest magnitude
the sky lets through where it stands passes its own (the zenith's limit by the
sky's own sun's depth, -1 at 3 deg, about 1 at the end of civil twilight, 4.5
at nautical's, 7 at the night's 24 deg; lowered further where the sky's own
light is brighter), its light coming in over its first 0.5 magnitude of margin
as the sun's depth moves (a hold holds it). So the twilights show only Venus
and, in the blue hour, the brightest stars; a dark night keeps the whole field.
The bright stars (b over 0.35) take pastel colours by spectral kind, each at
the white's own luminance. The evening (or morning, on a visit that opens on
first light) star stands by the drawn sky's sun, its glow (the hub's ruling,
2026-11-15: until one forward clock drives the sun, the stars and the planet
together): on the ecliptic through that sun at the opening's depth, in a
local frame at AIR's latitude and season, 24-46 deg east (or west) of it,
then turned with the sun as it sinks, rigid in the sun's vertical plane, so
it keeps its elongation, stands by the glow and sets by moving, never
fading; steady, a point of the stars' kind with a small glare, its peak
under OKLab L 0.49; its elongation the first of 12 drawn (SEED0's stream)
whose path down keeps clear of the words' boxes at the view's own heading
and pitch, planned in the sky's step (moonStep), never the draw: at the
opening against the still's own window and words (stillInputs, as the
opening's moon), so the still and the live first frame agree, and in the
window's own view and words (the night after the cut is seen there); a new window
plans it again (moonResized; the phone's bar only when its path now crosses
a word). Known gap (kept, 2026-11-24): the drawn sun holds through a hold while the stars turn, so Venus slips against them (the owner's cycle: "All. Cycle through.").
The bright outer planet (src/world/227-night-bodies.js, JUP_*): a second
planet of the same kind, Jupiter's (magnitude about -2.4), on the same ecliptic
through the drawn sun, 90-180 deg from it on either side (an outer planet's
elongation, up to opposition), so on a night it stands high in the dark half of
the sky; steady, pale cream (at luminance 1, C under 0.05), its peak under OKLab
L 0.47 (Y 0.104), under Venus's. It is chosen once a visit with Venus
(bodyPick: of 12 elongations from its own stream, 1201, its side from 1202, the
first whose path keeps off the words in the still's window and the live one,
in view at the cut if one is), drawn by sky-body.glsl's planetAt (Venus's
point and glare, its own top and colour); no clear path, none this visit.
The airglow (sky-body.glsl, AIRGLOW_Y): the upper air's own faint green light,
a steady band low over the horizon on the night skies, brightest about 6 deg
up and falling away overhead, behind the haze; it comes in by the stars' own
weight (uStarM.w: none until the sun is 15 deg down, whole from 18), its peak
Y 0.0027 at 5.5 deg (AIRGLOW_Y 0.004 times its shape), 0.0034-0.0047 in the
frame after the sky's exposure (SwiftShader, 1440x900 at 22:30, k0-k7): about
a tenth of a dark night's own sky low down; pale green at luminance 1, with no
structure and no clock.
No zodiacal light: at 64 deg north, with the sun 24 deg down in the dark
half of the year, the cone's bright base (within 30 deg of the sun along the
ecliptic) never clears the horizon, and 45 deg out it stands at most 9.5 deg
up (60 deg out: 21 deg; 90 deg: 40 deg), so only its faint outer part could
show, low in the haze (the hub's ruling, 2026-11-25).

The moon's face (sky-body.glsl, moonFace): the near side's albedo, from NASA's
Scientific Visualization Studio CGI Moon Kit (https://svs.gsfc.nasa.gov/4720/,
public domain; docs/licences.md), resampled by tools/night/moonmap.py to an
orthographic 32 x 32 disc at 4 bits a cell (MOONA), read bilinear across the
disc: the maria's true outlines and their varied darkness, Oceanus Procellarum
with them; the map's darkest level at MOON_DARK (0.32) of the highlands' light,
the highlands at the disc's own colour, so nothing passes the light ceiling;
lunar north toward the celestial pole (the sky's frame), so the face turns with
the pole's tilt at 64 deg north; lit by the phase (its terminator crosses the
features). At the disc's 36 px a cell is about a pixel: as the disc slides by
quarter pixels its mean light holds within 2% and no pixel jumps more than half
its contrast (test/unit/sky.mjs).

The far storm (physics: weather/far-anvil; src/world/222, 225 anvFlashAt,
sky-body.glsl anvilAt): in about 3 of the 16 openings a cumulonimbus stands
100-150 km away, 80-110 degrees off the sun's bearing, its top 4.0-7.4
degrees up. Its body hides the sky behind it in the air's own colour at its
range (the far land's distance haze); the low sun lights its top above the
Earth's shadow there, under the light ceiling; nearer layers (the 7 km veil,
the Earth's shadow and the Belt) lie over it, farther ones (the wisps, the
galaxy, the aurora, the moon, the stars) are hidden behind it. Its lightning
is the owner's one exception to no-fades ("Soft distant flicker",
2026-11-15; RULES.json no-fades): dim (its light Y +0.02 at most, under the
ceiling), slow (each flash rises and falls over 130 ms or more, at most 2 in
any second, its groups 10-40 s apart from the visit's own read), inside the
storm's cloud only, whole inside a hold with the sun 5 degrees or more down,
never in reduced motion or before the cut (test/unit/sky.mjs).

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
a hidden tab, Firefox, every WebKit but Safari on a Mac (an iPad behind a
Mac user agent counts as iOS, by its touch points), Android, iOS/iPadOS; and (the world, after stage A)
no KHR_parallel_shader_compile, a phone GPU by name, or a hold foretold
to show the world later than HOLD_WORLD (1000 ms from the navigation's
start): from stage A (38 x A - 150 ms; only a clearly slow A, over
1.3 x HOLD_WORLD, skips there: stage A swings 15-45 ms at 1x on the 4090)
and from the first hold frame (26 x f1 + 220 ms), measured on an RTX 4090 with Chrome's CPU throttled
1x-6x. Where a hold may run, world.js makes the canvas's context as its script
ends, so the GPU process starts while the kits come, not inside stage A.
The deadline (2 s from the hold's start, 1.5 s on 5-7 cores; 1 s in Safari on a Mac, HOLD_WK:
the Apple bench's film, 2026-11-16, Safari 26.6 on an M-series Mac with the gates lifted, saw the hold
shown after 298-399 ms and the words and the world together at 0.4-0.6 s, where today's path shows the
world at 1.9 s; a build's first visit compiles the Metal pipelines afresh, about twice the time, and
past the 1 s the page takes the path below) is the last net: past it
the link is taken out and the path below goes on. T2 shows the world's
first frame byte for byte the one without the hold (frame 0: gstep
counts a world shown in the page's own load as shown at frame 0). The
ink birds stay deferred and join after the show.

## BOOT

(The programs' text, load-perf 2026-11-15: each shader is handed to WebGL
without the functions its main never reaches (src/world/071-glsl-prune.js:
whole top-level definitions only, the rest byte for byte; about a third of
the batch's text), and with the parallel compile the programs the show never
waits for (LATE_ALWAYS) are issued last: the lab's phones compile the batch
one program after another, 4.1-4.5 s on the A15, and every GPU job waits
behind it.) (The owner: "should load instantly make it 10x faster"): without the
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
and the sand's ribbons where the flight cannot reach sand
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
where that is larger), the world put up to it by one cubic interpolating spline clamped
to the range of the 2x2 texels it lies between (it was bilinear). Every
frame's time in a two-second ring, each second the median; three slow
seconds (a median over 1.08 of the pace: under about 55 fps; the owner,
2026-11-15, "Smooth, >=60 fps": at the old 1.35 a 90, 100, 144 or 165 Hz
display, whose sync puts a frame on its own period, sat at 45-55 fps at
the top rung) step the render scale down a rung (the
ladder: the tier's top and its 0.85, 0.72 and 0.6 where they stand 8% or
more above the old size, then the old five, 1, 0.85, 0.72, 0.6 and 0.5
of it), a second and then a third rung tried if the first did not help
(75 Hz's 26.7 ms needs three; the third only when the quickest tenth
of the frames already beat the old median by 15%, so a 30 fps cap, a
CPU-bound phone or a 50 Hz display sees two, as before), all undone and the frame time learnt as
the pace if none did (a 30 fps cap is simply the pace); twenty seconds at
ease (a median under 1.04 of the pace) step back up (three, in the first
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
shader; the billows read no clock at all: they ride with their body,
physics: clouds/drift). It holds:

- The wind: one direction a visit (airDraw, the dunes' field stream's
  first draw, as before), blowing toward V.windAz, and its speed by height,
  windAt(x, z, y, t), y over the ground. U10, the speed 10 m up, is the
  visit's own (V.u10), drawn once from its own stream (subseed(V.seed,
  61)): the speed distribution of a two-dimensional normal wind vector of mean 5 m/s mapped by its CDF into
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
  veils 5 m (5.9), the birds their own height (HOST.wind(o, y); 40 m by
  default, 7.6). Before physics: air/wind-profile the readers kept their
  own speeds. The dunes' crests, the veils, the birds and the water's ripples read
  it; so do the clouds (AIR_H.clouds 800 m, the low layer's free clouds,
  and AIR_H.deck 7000 m, the cirrus, which lie along it: cloudWind,
  physics: clouds/drift).
- The cirrus (physics: sky/cirrus; sky-body.glsl HI_H): the high veil stands
  7 km up (cirrus: 5-13 km in temperate regions, 3-8 km in polar ones: WMO
  International Cloud Atlas), its streaks along the air's wind there (the
  profile's 2 U10 veered 40 deg, held above 3 km) and drifting with it; a
  noise tile 204.8 km along the wind and 51.2 km across (its texels 3.2 km by
  800 m), faded out under rd.y 0.105-0.44 where its texels would come under a
  pixel. A change's cover comes in by place: a front carried along that wind
  from 120 km upwind of the camera to 120 km downwind as the change goes (224's
  HIP, the shader's uHiP), 12 km wide, the new cover upwind of it; in a hold
  the cover is uHi.x everywhere.
- The readers still apart (AIR_APART, each with the change that joins
  it): the maps' own wind field (mc.wind: the
  director's cover and the plan's dunes read it, so it is not dead: taking
  it out moves the plan's anchors), the wing gusts' private 25 s timers
  (birdwing.js) and the score's own gusts (score.js: its breeze by sky
  is the air's table, its gusts its own until it reads the field). The
  test fails when a listed reader is joined and still listed.
- The gusts (physics: air/gust-field): one field of turbulence, frozen
  and carried downwind at the mean wind (the frozen-turbulence
  hypothesis, https://glossary.ametsoc.org/wiki/Frozen_turbulence;
  gustAt, the shaders' airGust: the same hash and constants, held equal
  by value at 4096 points a visit, tools/checks/44-gust-glsl.sh), so a
  point 100 m downwind meets each gust 100 / U10 later on the surface's
  clock (airClock), 100 / (s U10) later in flight time (s the sky's
  surface share: 1 by day); each visit on its
  own slice (its salt). One reference speed, the visit's U10, carries the
  field and sets its scale (22 U10 m) at every height, so a bird over a
  veil feels the veil's gust; the height sets only its size, 0.26 of the
  wind there times unit noise. The 3-s gust over the 10-min mean
  1.43-1.68 (median 1.54), its e-fold by day 10-23 s (on a sky of
  surface share s, the day's over s), nothing faster than 0.11
  W a second; none in still air. Every reader carries it on one clock,
  the surface's wind clock (airClock; the shaders' uAir.x), and by the
  wind by sky its size is the sky's share times its gustiness. The sand veils rise with it: as a gust
  passes over a brink its sheet lifts and streams out, and as the air
  calms it settles flat onto the sand (the saltation layer collapsing);
  its opacity is the visit's alone (its U10), so a veil never fades in
  place (their private 5.6-8.4 s cycles are gone). The birds read
  HOST.gust (the excess along the wind, m/s), HOST.gustPhase (the
  field's own clock there, the same at every height) and HOST.gustSigma.
  No particles are drawn (physics: air/particles-seen). The dunes' grains
  and motes never reached the screen: the camera cruises about 14 m up,
  pitched about 11.6 deg up, so its nearest ground in frame is about 59 m
  ahead, past the grains' box (within 45 m, faded from 32 m); on T1's
  three views and ten dune openings an occlusion query and a pixel compare
  put both sets at no more than one level on 19 pixels. So the dunes
  dropped them (#394), and the particle pipeline went with them (its
  vs-particle and fs-particle, its draw, its late and warm programs, the
  weather kinds and NO_PKWX, the grains' hop on the gust, airHop). For
  when rain arrives: a realm's rain will need its own draw again. It
  should read the gust field as the veils do (airGust on the surface's
  clock, uAir.x, in the day's sigmas times the sky's gustiness, uAir.z;
  the field is coherent over 22 U10 m, so in view the rain thickens
  together as a gust passes, never on a cycle of its own), guard its wind
  direction against a windless set (never normalize a zero vector), and
  wrap its box from the JS's doubles as the veils do (uPm). The git
  history keeps the old shader (vs-particle.glsl's rain(), before this
  change).
  The score hears the field through the feed (the air heard, below); the
  perched lean is not on it yet.
- The twilight key (physics: light/twilight-key; frame-u.glsl ndlK, 221's keyD):
  with the sun under the horizon no direct sunlight reaches the land or the
  clouds, so the key's directional share goes as smoothstep(-6, 0, the sky's
  own sun) (afterglow and first light 0.5, the blue hour 0) and the rest is the
  twilight sky's diffuse light: 0.5 + 0.5 n.g, g up tilted 31 deg toward the
  key's azimuth (the glow's side), scaled so a level face keeps the key's own
  height and the lit land's mean holds (T1: within 0.5% from the shading; the
  sunset's land 2.3% lighter besides, its cloud shadows halved). The clouds'
  shadows take only the direct share, so the blue hour casts none; the clouds'
  silver edge is the direct light's too. A night's key, the moon, stays direct.
  The share is a light's number (LKS), blended between skies with the light.
- The clouds' shadows on the land (physics: light/cloud-shadow;
  src/world/262-cloud-shadow.js, vs-cshadow, fs-cshadow). The owner,
  2026-11-15: "No, natural light is fine": the world's own cast shadows
  are free under the light ceiling, and nothing is darkened for the words
  (RULES.json no-darkening). Every cloud body's lobes (its cells' soft
  spheres, where its layer's wind has carried them: cellOff on the clouds'
  own clock) cast the key's light off the land along the live key (uSun:
  the sun, or on the moonlit sky the moon's disc, the land's own light).
  One pass a frame draws each lobe as the ellipse a sphere throws on one
  level plane (the ground under the camera): R across the key's way,
  R / sin(elevation) along it. Its light there is exp(-k chord), k 0.05/m
  (the clouds' march extinction, 0.19, over the lobes' eroded fill, about a
  quarter). The chord is the cut the key's ray makes through the lobe, its
  edge softened over the key's own disc (0.53 deg: the penumbra, the ray's
  length times 0.0046). The lobes are multiplied together (the exp of their
  summed depth, stored over 32 so 8 bits hold a cloud's) into a 1024 x
  1024 map 40 km across, about the camera (past the land the eye sees, so
  its easing-off lies under the far haze). The sand, the stones and the
  rock read it where their own point, carried along the same key, meets
  that plane (so any height of land lines up with its cloud). They lose
  only the key's direct share of their light, n.l / (n.l + q), with q the
  sky's diffuse light over the beam's from the clear-sky model
  (https://www.nrel.gov/docs/legosti/old/761.pdf, SERI/TR-642-761: the
  beam is 47 to 67 % of the light on level sand under the 5 to 14 deg
  key). They get part of it back, scattered through the cloud: the
  two-stream diffuse transmission 1 / (1 + 3/4 (1 - g) tau), g 0.85
  (https://doi.org/10.1119/1.15109). So at a low key a shadow is weak (level sand keeps 0.55 to 0.7 of its light under a
  mean cloud, tau 20), and a face turned from the key loses nothing. The
  soft edge is the key's disc: the penumbra's width across the key's way,
  stretched by 1 / sin(elevation) along it, so a low key's far and near
  edges are long and soft. The map eases off over its last quarter (a
  place's distance, never the clock's). Nothing under a key at the horizon.
  The composite takes no input from it (no-darkening, W7).
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
- One light at night (physics: air/night-light): the moon is the
  moonlit sky's light, so on that sky the live key the land, the veils
  and the wings shade by (the shaders' uSun) stands on the moon's disc
  as drawn (moonDir), its elevation held to 5 deg or more, so nothing is
  lit from under the horizon. Its weight is the sky's moonlit share (1
  through the moonlit sea's hold, 0 on every other sky, eased with the
  light through a change), and the key moves to it low across the sky,
  never through it: its azimuth turns about the vertical (the way round
  taken once a change, toward the disc at the moonlit hold's edge) and
  its elevation eases between the two ends', so the light never stands
  higher than both (a great circle between a key and a disc 150-160 deg
  apart runs overhead). On the real route (225's moonPlan, 400 stays
  into and out of the moonlit sea, the band ahead and behind) the live
  key stays 5.00 deg up or more, never higher than both ends, and turns
  within each stay's own bound (1.5 x its arc over the change, plus the
  disc's own rate): at most 4.92 deg/s, 0.08 deg a frame. Off the moonlit sky it is
  the visit's key (keyAt), computed once a frame. The clouds stay on the
  baked key: their light depths are baked along keyAt, and fs-vbody's
  phase, rim and wrap read the same direction (uKey). The sky's own sun
  (uSkyS) and the birds' HOST.light().sunDir stay on the key. The cloud
  sea (realm-above's shading) reads uSun, so it is lit by the moon too.
- The sky's frame (physics: air/sky-frame): one celestial sphere for the
  sun, the moon, the planets, the stars and the galaxy. The place is 64
  deg north (the aurora is one of the skies), so the celestial pole
  stands 64 deg up in the north; the season, from the visit's own stream,
  puts the sun on the ecliptic in the dark half of the year; north is set
  once a visit so that the evening sun stands on the sky's own sun's
  azimuth. The sphere turns forward only, at SKY_RATE times the sidereal
  rate, never stopping and never turning back; at sky time 0 its hour is
  the opening sky's, so the frame's sun stands at the opening's drawn sun;
  on a milkyway opening the hour is chosen instead so that the band
  arches across the opening's view, flat and well above the horizon in
  frame, with its brightest stretch that rises here in view (the Cygnus
  star cloud and its rift, galactic longitude 60-90; the core never rises
  at 64 deg north) (airGalLst, on a 16:10 desktop and a phone at the
  opening's heading; a level band crosses 37 deg up or more, above a
  desktop's top, so it leans: a median of 37 deg, 83 before; Cygnus in
  frame on about half the openings, the rest the heading's;
  test/unit/air.mjs). The band's brightness follows a dark site: the
  Cygnus stretch about 1 mag/arcsec2 over the natural sky beside it (21.0
  against 22.0), about 36% contrast in OKLab L, 37% measured in T1's night.
  The drawn sky's sun keeps its depth by sky until the night's true order
  lands; the planets are placed by the drawn sun. The ecliptic leans
  23.44 deg to the equator; the galactic pole and centre are J2000's (the
  pole 60.2 deg from the ecliptic's, the centre 5.5 deg south of the
  ecliptic). skyFrame(tS, V) is the frame as the night sky's shader reads
  it (226's uSkyF: row-major, equatorial to world); skySphere(tS, V) is
  the same with the pole, the ecliptic's pole, the galactic pole and
  centre and the frame's own sun.
- The air heard (physics: air/heard; airHeard, WORLD.air.heard): the one
  air where the listener is, for the score: windAt's wind there, the gust
  arriving (gustAt), its sigma and the field's clock (gustPhase), a fresh
  object, and carry, the speed the gusts pass at (U10 x the sky's surface
  share). The score's feed carries it at the camera, at its height over
  the ground, with the wind's bearing from the eye's way and the apparent
  wind (WORLD.sky().wind, docs/sound.md). test/unit/air.mjs holds it to a
  hand-computed wind for a fixed visit, and its gusts to carry.
- One moon direction (physics: air/moon-dir), AIRAPI.moonDir(): the
  moon's disc as drawn this frame (its direction, its weight on show,
  az and el), at the very moment and on the very route the night sky's
  uMoon is drawn at, so a glory, a fogbow or a moonlit edge stands on the
  disc. The key light (keyAt) is the moon's light on the land at night
  from a low, fixed place (5-14 deg up); it is not where the disc is.
- The wind by sky (physics: air/wind-by-sky): the sky is the time of
  day, and the wind follows the day as the boundary layer does. By day
  the surface's wind is mixed down from aloft; at dusk the mixing dies,
  the ground's air slows and the air 100-300 m up speeds past its day's
  speed (the nocturnal jet); first light is the stillest at the ground.
  AIR_BYSKY gives each sky its shares of the visit's day wind: the
  surface's (to 20 m), the jet's (100-300 m), the gusts' intensity (set
  by eye within row 6's band): the afterglow 1, 1, 1; the blue hour 0.7,
  1.2, 0.65; the moonlit sea 0.5, 1.4, 0.6; the aurora 0.45, 1.4, 0.55;
  the Milky Way 0.4, 1.5, 0.5; first light 0.35, 1.3, 0.5. The gust
  field is carried at the mean wind on every sky (row 6), never slid
  across it: on a calm sky it passes a point at the surface's share of
  U10, so a gust's e-fold there is the day's over that share (the day's
  median 14 s; the moonlit sea's 28 s, first light's 41 s). No source
  found gives a stable night's shorter eddy scale in this form, so the
  longer e-fold stands (the hub's ruling). Up the profile the share
  eases from the surface's to the jet's (20-100 m, in log height) and from
  the jet's to the free air's 1 (300-1500 m); the veils, at 5 m, take the
  surface's, the birds at 40 m a blend. Over a hold a
  sky's shares hold; through a change they ease into the next sky's with
  its light (weather(t)). Whatever the wind carries is carried by its
  integral, a clock of each share in closed form over the sky's order
  (airClock; the shaders' uAir: the surface's clock, its share, the
  gustiness), so a change of sky never jumps a veil or a gust: the gust
  field is carried by it, the veils' sand
  streaks run at the veils' own wind on it, and the veils lift past the
  day's sigma, so in a night's weak air seldom. The score's
  breeze is the same table, handed it read only by its feed
  (docs/sound.md); WORLD.air.BYSKY() hands any reader a copy. windAt's t
  now counts: it is the hour's wind, the sky's share at t. A reader that
  wants the day's wind whatever the sky (CLOUDS' drift and lens gate)
  asks for WORLD.air.day(x, z, y, V), the sky's share 1.
- The weather the wind makes (physics: air/weather), AIRAPI.wx(t): from
  the visit's own U10 and the sky (no new draw). mist (m deep): radiation
  mist on a still clear night, thickest before sunrise; each sky's depth
  set once a visit (AIR_MIST: first light 10, a night 3.5, the blue hour
  1, the afterglow 0) scaled by the visit's own moisture (moist, 0-1),
  which carries the wind's mixing too (a visit moist enough for mist has
  a surface wind under 3 m/s on every sky with mist): radiation fog needs air near saturation as well
  as a calm clear night (https://glossary.ametsoc.org/wiki/Radiation_fog),
  and a coastal fog desert's is mostly advective: marine boundary-layer
  air from over the cool upwelling coast, carried inland, at its most in
  the early morning and gone soon after sunrise
  (https://acp.copernicus.org/articles/20/3415/2020/). So the moisture
  is the visit's air, not the land in view: whole on a calm synoptic day
  (U10 under 4.02 m/s), none past 4.1 (AIR_MOIST, set with LAND for pools
  at the cut on 3 of the 10 dune lands, the hub's ruling; the visit's own
  U10, no new draw). First light gets 5 m of mist or more, deep enough for
  pools, on dune openings 3, 10 and 14 (10 m each, by the live visit's
  seed, RNG(subseed(seed, 1000)).seed(), which airDraw and airU10 read),
  the other dune openings under 2 m; 1 m or more on 6 of the 16 openings,
  and on 28% of visits over the winds' own spread. AIRAPI.MIST()
  hands a reader a copy of the depths, as AIRAPI.BYSKY() does of the
  wind by sky. Through a change its level moves
  toward the next sky's at 0.18 m/s (a closed form of the sky's clock:
  never a jump, never a race). oro (0-1): the orographic gate, the
  visit's own from U10 alone: the ridge-top wind is the log law's 100 m
  share of U10 (1.28), and past 7.7 m/s there (U10 about 6) the ridges
  stand lee waves, lenticulars and banner clouds (about a quarter of
  visits). vis (km): the visit's own, 10 in clean air, 4 in blown sand
  once U10 is past the sand's threshold (5.8-7 m/s; about one visit in
  six). The gate and the haze never change with the sky, so the far land
  never fades in place. It carries the lee wave's numbers too: oroU (7.7
  m/s over the ridge, where the gate opens) and N (0.01/s, the buoyancy
  frequency CLOUDS' lens takes), so the lens reads one weather. LAND's
  mist, CLOUDS' lenticulars and banners and the aerial perspective's
  aerosol (370's aerU, ## THE AERIAL PERSPECTIVE) read it.
- The moon on show (AIRAPI.moonAt: the moonlit stay's route).
- The events (physics: air/events; src/world/216-events.js, WORLD.events):
  the rare sights a visit may come on, each a site on the ground placed
  by where it is, never by when or by the way flown (path-independent).
  Each tier of rarity is a hex lattice of its own, one site a cell
  jittered within 0.24 of the spacing: common 8 km (fog pools in hollows),
  uncommon 19 km (a dusk murmuration), rare 43 km (no kind yet). At most
  one rare site is in reach (4 km) anywhere: a tier's sites stay over
  twice the reach apart and a rare site yields to a rarer one within
  twice the reach. A common site is in reach over about 82% of the
  ground, an uncommon one over 16%. The sites are the read's own
  (SEEDR's stream): none before the cut and none within 6 km of the
  landing, so the opening's frames never show them. A site says only
  where and what; its reader (LAND, BIRDS) decides when it shows, by the
  air (WORLD.air.wx) and the sky. A fog pool is the visit's mist drained
  into one hollow: its site carries its basin's radius (500-900 m), and
  the mist over a ring twice that radius, gathered in, stands four times
  as deep there as on the flats, up to 145 m (WORLD.events.poolDepth(site,
  mist)). It has no clock of its own: no mist, no pool. LAND fills the
  lowest ground within the radius to that depth, under the basin's rim.
  test/unit/events.mjs.
- The landing's heading, airHeading0 (drawn once from its own stream: the
  flight, the first plan, the galaxy's lie, a milkyway opening's hour and
  the boot read it), and the
  flight's cruise band, AIR_CRUISE (14 m over the sand to 32 m over the
  cloud sea).

THE CLOCK. Physical motion (the wind, the clouds, the birds, the
particles, the aurora's own motion) runs at 1x real time, the flight's
SIM.t. The sky's light (sun, moon, stars, galaxy) runs at one declared
rate together, SKY_RATE, 100x. The stars and the galaxy turn with the
sky's frame at exactly SKY_RATE times the sidereal rate. The sun does
not yet: it sinks about 88x real through a change into a night, and
test/unit/air.mjs's clock test is marked todo for it. The moon crosses
at 78-96x real (0.33-0.40 deg/s, its median 87x, over 400 planned stays;
its pace is fitted to its stay, 225's STEP 7), at most at SKY_RATE: over
4000 plans its median is 0.86 of it and its fastest 1.002, where the
setting leg's bounds quicken it; test/unit/sky.mjs holds it within 1%.

## THE MIST POOLS

delight-weather 1 (src/world/229-mist-pools.js). Mist lies in the dunes'
troughs and about the mesas' feet. The pool's top is the ground the
dunes stand on (the swell, sunk with the basins and toward the cloud
sea) plus a depth, times the sand weight. The depth is the weather's
one model, AIR's airWx(t).mist (## THE WEATHER BY WIND): 10 m at first
light, so the crests stand out as islands; 3.5 m at night; 1 m in the
blue hour; none in the afterglow (AIR_MIST), times the visit's
moisture, and through a change moved toward the next sky's at
AIR_MIST_RATE. The pools keep no table or rate of their own. The depth
is a pure function of the sky's time, so the rim is a moving
shoreline, never a fade (the hub's ruling 1).

The top is opaque within 1.5 m of depth, the same at every depth, so
nothing thickens in place (mistOver, world-glsl). The rim's ramp is
widened to two pixels' worth of the surface's depth, so far shorelines
never crawl. It is lit by the sky's own cloud light, as the cloud sea's
flat tops are, and drawn over the land (FS_TERRAIN, from the floor its
vertices carry, vMB) and over the stones and the landmarks
(FS_LANDMARK, the top worked per vertex, vMT). The split path carries
the basins' change to the floor in P7. The camera's ground never reads
the pools (HdCam, HdProbe, the split's probe): it is the same under
every sky (the recorded ground, the flight's grid, the birds'). The
flight keeps over the pools: its least clearance rises with them
(leastAt, 280: the depth, 1 m and MIST_OVER 5 m), so a held dive eases
onto it by the height's own spring, and the hard rule's floor, the land
and the pools' depth and 1 m (270-flight.js), stays a net that never
acts in flight. Both hold since the land never lies under the pools'
floor (the basins scale and sink the floor as they do the land, the
plateaux and the ridges only raise it). At depth 0 there is no pool at all.

Measured by tools/physics/mist-sim.mjs (the page's own probe, the 16
openings' land within 1 km of the landing, at first light): see its PR
for the numbers. test/unit/mist.mjs holds that the pools read AIR's level, the
opacity's ramp and the camera's ground; test/unit/air.mjs holds the
level's rate.

## THE FOG POOLS

src/world/234-fog-pools.js, the reader of AIR's fog-pool sites
(216-events.js, ## THE EVENTS). A site is placed by AIR about 8 km from the
next, with its basin's radius (500-900 m), the ring it drains (twice the
radius) and its depth for the mist now (evPoolDepth: four times the flats'
mist, at most 145 m; none with no mist). AIR places it without the land's
height, so at the site itself the land rarely holds a pool
(tools/physics/fog-sim.mjs, lands 3 and 10: the rim held every pool, a
median 3.5 m deep over 0.9% of the basin). So the pool takes the hollow the
site drains: of 9 x 9 centres over the drained ring, over land (the cloud
sea's weight under 0.5), the one whose rim (the lowest land on its circle
at the radius) stands highest over its floor (the lowest centre within the
radius). The pool's top is that floor plus AIR's depth, held 0.5 m under the
rim, so it never spills and no edge shows at the radius: the shoreline is
the ground's own. No hollow over land, no pool. Read once a site by the
realm's probe (1,377 points), asynchronously, as the surface drawn (mode 1:
the land, or the cloud sea's top where it covers the land; the land under
the sea, mode 0, put a basin's pool under the sea's top, never seen: posed
in one, base and head frames were the same bytes). Measured on the 16
openings' sites within 12 km, at 10 m of mist: 91 of 96 hold a pool, a
median 6.7 m deep (to 21 m) over 17% of the basin; the rim holds every one
under AIR's 40 m. It is drawn by
the mist pools' shading (fogTopAt beside mistTop, world-glsl), over the land
and the stones, and it moves with the one mist, a moving shoreline, never
a fade. The camera's ground never reads it; the flight keeps over its top
as it does the mist pools' (280's height climbs onto it as onto a rise, by
MIST_OVER; 270's hard rule 1 m over it; the ceiling over its least).
test/unit/fog.mjs.

## THE AERIAL PERSPECTIVE

lib-air.glsl's atmos, the one function the land (350), the landmarks and
stones (353), the cloud bodies (fs-vbody), the storm's anvil, the ribbons,
the creatures and the ink birds' air take. The air between the eye and a
point takes its light by extinction and gives the sky's back by in-scatter,
per channel: L = c T + Linf (1 - T), T = exp(-od). Two scatterers:

- the gas, by wavelength (the inverse fourth power): its sea-level
  scattering at 680, 550 and 440 nm, 5.8, 13.5 and 33.1 per 1,000 km
  (https://doi.org/10.1364/AO.34.002765), thinning with an 8 km scale
  height along the path (gasPath: the slant integral from the eye's height,
  so a cloud 3 km up at 30 km is seen through 17% less gas, the cirrus at
  7 km through a third less). At 20 km level it takes half the blue and a
  tenth of the red: far ridges turn blue on their own.
- the aerosol, grey: the sky's own height fog and even distance term
  (uFog, each realm's tuned look, now the aerosol in clean air), times
  uAer.x, the visit's own by AIR's weather: the visual range's inverse
  (extinction 3.912 over the range, https://glossary.ametsoc.org/wiki/Visibility;
  AIR's 10 km in clean air is 1, 4 km in blown sand 2.5) times the
  particles' growth with humidity, ((1 - RH) / (1 - 0.3))^-0.3
  (https://doi.org/10.1016/S0065-2687(08)60142-9), RH 0.3 to 0.9 by the
  visit's moisture (1.8 on the moistest). Neither changes with the sky, so
  the far land never fades in place.

Linf, what a path long enough gives back, is the sky's own colour toward
the horizon (fogCol, the sky drawn there), so far ridges dissolve into the
sky behind them. Since the gas takes and gives blue first, a thin air is
blue and a thick one the horizon's colour: the old hand-set tint (uFogB) is
gone. The aerosol's forward peak toward the key light (the one-parameter
phase of https://doi.org/10.1086/144246, asymmetry 0.7 for desert dust,
AER_SUN 0.05 of the light) only adds light, its share over an even
scatter (the sky's colour holds the even part), so far land toward a low
sun or the moon brightens. Nothing veils with grey: in-scatter is the
sky's light. fogAmt, the share a light's own glow loses, is the green's.

## THE LARGE WORLD

A 2-hour visit flies 86 km from the origin, where fp32 rounds a coordinate
to 8 mm. Every vertex stage's clip position goes through eyeRel
(frame-u.glsl): the exact difference from the camera's fp32 (uCam), less
what fp32 dropped of it (uCamL, from the JS's doubles). So the camera's
own rounding never reaches the screen; it was a 1.3 px judder at 3 m. The
ribbons' anchor is whole boxes plus the rest, the same
while the camera moves. Noise domains are left in world coordinates: 86 km
out they are off by under a centimetre (tools/precision/far-origin.mjs).
test/unit/largeworld.mjs replays the arithmetic in fp32.

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
