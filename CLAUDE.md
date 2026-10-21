# derekzhou.com

Personal site for Derek Zhou. Pure HTML, CSS, JS. No frameworks. No build step.

## Structure

/index.html             Home page
/style.v13.css          All styles (versioned name — see Caching), the still sky of each hour
/site.js                Email obfuscation only
/hour.v2.js             The hour: which time of day the sky opens on (the page's one clock read)
/sky.v4.js              The sky — light and cloud behind the page: thirteen skies in a random order (see Sky)
/birds.v10.js           The birds — a sky in depth: every bird drawn afresh in the tattoo's hand, many kinds flying through it (see Birds)
/subset-fonts.sh        Regenerates the .sub2 font subsets (manual tooling)
/download-fonts.sh      Fetches the full source fonts (manual tooling)
/404.html               Custom 404 page
/assets/favicon.svg     Adaptive circle favicon (dark in light mode, inverse in dark)
/assets/favicon.png     PNG fallback favicon (32x32)
/assets/apple-touch-icon.png  180x180 iOS icon
/assets/fonts/          Self-hosted WOFF2: Geist and Geist Mono, full faces (sources)
                        + two .sub2 subsets (served), and OFL.txt (their licence)
/robots.txt             Allow search engines, block AI crawlers
/.well-known/security.txt  Vulnerability reporting
/\_headers               Cloudflare Pages security + caching + Early Hints headers
/\_redirects             HTTPS enforcement; /CLAUDE.md and /.github/* redirected to / (exact paths: see Security)
/.github/workflows/validate.yml  CI checks

No Functions, no private pages. A private /studio/ needs an origin guard
first (a Pages Function that checks the Cloudflare Access token again, with
\_routes.json sending it every private path), because Access alone lets a
percent-encoded path through and does not cover the pages.dev host. The
owner keeps a tested guard in a private repo. The Access application on
derekzhou.com still lists paths for pages that no longer exist: Access asks
for a sign-in there, and past it they serve 404.

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
the words' role (.words), with a non-breaking space in "Product
Development" so no line ends on one word. The page is the name, that
line, the credit row and the two links. The meta, Open Graph and Twitter
descriptions still carry the old paragraph's words (search and share
text).

The sky's script reads back the line with the credit (sky.v4.js
measure(): the union of .stack .words and .credit), so the contrast
guarantee in Sky covers it as it covers the credit.

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

One non-scrolling viewport: the typography on a sky, birds crossing it in
flights, light and cloud behind. The owner's briefs, verbatim:
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
first brief's light ground gives way, at the owner's choice, to a sky
that is dark at dusk and at night. Then, asked to use Unreal Engine and
to go further on every level (environment design, light and colour from
the micro to the macro, a feng shui feel, sound and music, a tool to rig
and tune the environment), and shown the research's answer (the page
cannot run Unreal: no web export; streaming costs a GPU server per
visitor and fails in iOS in-app browsers), the owner chose no Unreal, an
opt-in generative score, and a studio on the site behind Cloudflare
Access; and, of the plan's flat palette
strips: "All those mocks look so plain wtf. It should be a lot more
complex than a palette lol." with the reference's own creative techniques
(paraphrased: its name stays out), and "Only the starting landing scene
should depend on the system time. The rest should cycle through smoothly
randomly non-time-dependent." Hence thirteen skies in a random order
(see Sky). Then, shown a hand-lettered brush-script title (the
reference lettering; the work it comes from stays unnamed, as above):
"Also draw Derek Zhou in
this style. Keep iterating until it's 100% exact. And remove the entire
"Derek is a hands-on.." blurb."; of the first drawing: "The Z is off -
shouldn't be 2 separate strokes - study similar fonts so u know what to
do for it. Remove the feather entirely. 1 line layout pls"; and, choosing
the hooked Z, and asked whether white lettering should stay white over a
bright sky by darkening the sky behind it or switch to dark ink there:
"A. Don't darken the background anywhere ever". So the name is lettering
(see Type), and nothing on the page darkens the sky: where the ground is
too bright for light ink the words take dark ink (see Sky).

The words' colours follow the sky (see Sky), and the sky is never darkened
for them. On a light sky: text #000 (the lettered name and the links),
the dimmed grey (the credit) a warm grey worked out for 4.7:1 on the
credit's own ground (never lighter than #5f5c56), focus a dark ochre for
3.3:1, selection #e6e2d6 under the black text; on a dark sky (dusk,
night): text #fdfcf7,
the dimmed grey a cool light grey for 4.7:1, focus a light gold,
selection #3b3f55. The stylesheet carries each hour's colours for its
still sky; the script refines them for the sky it drew (CSSOM custom
properties on the root). bg #f9f8f1 (Samara's cream) stays the paper:
print, and the colour under everything. color-scheme stays light (no
form controls, no scrollbars); theme-color follows the top of the drawn
sky. Type is matte: no text-shadow, no glow. Links are plain underlined
words (1px, dimmed underline, .18em offset); nothing reacts to hover; OS
cursors only. The name and the type are present at first paint in their
final place (the drawing's box is reserved by the stylesheet), in their
hour's colours (hour.v2.js runs before the first paint). Print hides the
sky, the birds and the footer, on white; the name prints black, 16rem
wide.

## Birds (birds.v10.js)

The page is a sky, seen in depth. Birds cross it the way birds cross a
real sky, built from field data (RESEARCH below) and nothing like v1/v2's
dots, which lived inside the window and turned back at its walls, v3's
slow rigid rows, which read as a dashed line, v4's flights of one
identical mark all moving alike ("Y they all look same and move all the
same?"), or v5-v7's flat sky, every lane drawn on the window's own plane
("Y is the movement so 2D though.").

THE SKY IN DEPTH (v8): the window is a camera looking out over a sea of
cloud and up at the sky (FOV 60 degrees across its longer side, pitched so
the horizon lies 0.2 of its height above its bottom edge (v9: HORIZON
-0.2, negative being above), or
lower where the words come down that far: SEA_CLEAR 60 px below their
margin, with SEA_MIN 5% of the height of sea at least), and lends that
camera to the sky (skyAir.aim), so cloud and bird share one air; every
flight flies
a path in the air in front of it (x right, y up from the eye's level, z out
along the ground, in px at nearness 1); all that is seen is that air in
perspective (proj: nearness n = f / depth, px on the window a unit in the
air). The camera is aimed when a sky begins and held through small changes
of height (a phone's bar). A path is straight, or (TURNING 40%, gulls and
swallows x1.6 and x1.8) wheels through TURN 20-60 degrees over TURN_T 3-6
s near the middle of the crossing, climbing or sinking a little (its
kind's tilt); it heads across the window (HEAD 0-25 degrees off its plane,
55% of paths), angling away (25-60, 32%) or coming nearer (12-30, 13%),
never more than HEAD_MAX 72 off it, never turning back across it. Depth is
drawn, afresh on every drawing: a bird's size is its span at its nearness,
its pen (LINE) and its ink (TONE) follow; a flight going away shrinks,
slows on the window and sinks toward the horizon, and far off (nearness
FADE 0.54 down to FAR 0.42) fades into the air instead of popping out;
none comes nearer than NEAR_MAX 1.7 in view. A V lies level in the air
(UP_V 0.06 spans up or down), so its arms are nearer and farther:
foreshortened, the near arm larger and higher on the window; a pair flies
one nearer, one farther; a loose flock is a cloud (1.15 root-n spans
aside, 0.45 root-n up and down); a line undulates in the air (FILE_Y up, a
third of it aside). A turning bird banks: its inner wrist drawn lower and
its outer higher (BANK 0.3 at BANK_AT 40 degrees a second of turn on the
window), never a rotation. Storks circle a thermal: a ring in the air
(an ellipse seen from below, no longer drawn flat), drifting downwind and
climbing RISE 1.5-3 px/s, about half its radius a lap. A flight's pace
is its kind's, held (paced) where it passes nearest so it never rushes
across the window, never grows by more than GROW 1.2% of its size a
second (looming captures attention) nor shrinks by more than SHRINK 3%
(receding does not), never turns faster than TURN_SEEN 18 degrees a second
on the window (a turn seen heading away sweeps round; measured at the
flight's widest birds as well as its leader, v9), and never crawls under
SLOWEST 5 px/s; a path that would slow it below 0.45 of its pace is not
flown. What moves a bird in seconds (its drift, a gust, a glide's sink)
is gentled as far again, and as far as its slowest bird is seen slower
where it heads away (q); and no path is flown on which any bird, as it
will be drawn (drift, wander, gusts and all), turns faster than TURN_MAX
22 degrees a second on the window (the planner's check, every STEP; a
finch's bound and a thermal aside). Two birds of one flight are never closer than SPACE_SEEN 2
px on the window (a near one passing a far one) nor SPACE 4 px in the air.

THE DRAWING (every bird its own): the tattoo is the hand, not a stamp.
Traced from the photo, each of its three birds is an "M" gull stood on a
steep diagonal: from the back, a rise to the first wrist, a drop to the
body, a rise to the second wrist and a long stroke out in front (the
long-tailed one draws its back wing out as a tail); along the diagonal
the rises read as risers and the drops as treads: steps. drawBird draws
every bird afresh in that hand, in its kind's proportions (SORTS: rise,
drop, out, their angles, how often a tail), stood on its diagonal at
about its drops' angle (LEAN -14..+5 degrees: some read more as steps,
some more as gulls). As drawn a bird faces right, rising the way the
tattoo's birds do; flying left mirrors it; never rotated or tilted.
(v2-v4 drew a digitization of the three marks that was the photo upside
down.) Size and ink are distance: SPAN 22 px for a mid bird at nearness 1
on a large window (x0.72-1.12 by the window), each kind crossing at its own
nearness (SORTS depth, 0.6-1.3); a stroke of LINE 1.5-2.5 px by its size on
the window, ink TONE 0.62-1 by its nearness, times its fade (the polyline's
stroke-opacity; 1 under forced colors). The ink is the words' colour
(--color-text): black on a light sky, near-white on a dark one.

THE KINDS (SORTS, and which patterns each flies: SORT_OF): geese (skeins,
lines), ibis (lines, skeins), gulls (pairs, lone, lines), herons (lone:
near, large, legs trailing), crows (pairs, lone, loose), finches (loose,
pairs: small, bounding), swallows (loose, pairs, lone: tails, wheeling),
storks (soaring). Each has its size and distance, pace, wing-beat,
flapping and paths (tilt 3-8 degrees, wheel, wander). Most of the sky is
the big, slow-beating kinds: of the flights of three or more, skeins
55%, lines 25%, loose 20%; a lone bird is a gull, heron or crow 85% of
the time, a pair a gull, goose or crow 80%; the small quick finches and
swallows come now and then.

THE WINGS: through a beat the wrists swing down toward the bird's own
line and back up (WRIST 1.15 to 0.2: the steps always show, never a
slash), the downstroke the quicker (DOWN 45%), the body lifting BOB 0.04
span on it; a gliding bird holds its wrists at its own set, near the
drawing; a bounding finch folds its wings shut between bursts. By kind
(Pennycuick 2001): geese 2.3-2.7 Hz beating on and on; ibis 2.6-3 flap
and glide, the beat passing back down a line (WAVE_DELAY 0.35-0.8 s a
bird, never a whole number of beats) or, in a V, spatially in phase;
gulls 2.2-2.6, a few beats and long glides, sinking a little on each;
herons 1.9-2.2, slow and deep; crows 2.8-3.2, rowing; finches 5-6 in
short bursts, rising through the beats and falling wings-shut (bounding);
swallows 3.8-4.6 in flickers between glides; storks hold their wings out.
Birds beating each on their own have their rates spread evenly over the
whole of DETUNE (+-5%) and their starting points in the beat spread too,
each on its own schedule of bursts and glides, so a chance meeting in the
beat soon passes (a line keeps its shared wave).

THE PACE (calm): each kind's pace in the wild is in spans a second
(geese 2.4-2.8, gulls 1.9-2.3, herons 1.8-2.1, crows 2.7-3.1, finches
3.2-3.8, swallows 3-3.6), and the page slows every kind alike to its
calm (CALM: a mid bird, REF, crosses the window in about 22 s on a phone
to 52 s at 1440 px and up), so each keeps its place in the order and
nearer, larger birds still fly faster; a soft ceiling (from KNEE 0.75 of
it) keeps any bird from crossing quicker than CROSS 15-36 s, within
SPEED 14-64 px/s where it crosses; then each path holds it as above.
Measured on the window (median, and 2-98%): a phone's birds 16-18 px/s
(10-25), a 1024 px window's 21-25 (9-34), a 1440 px one's 24-25 (15-36);
v7's crossed a 1440 px sky in 52 s. The wings keep their real rates,
never slow motion: the slower pace comes from gliding. A kind that beats
on and on glides between bursts (FLAPS_SLOW), and every kind's glides are
the longer by the root of how far it is slowed (up to HOLD 2.2; not a
finch's bound), so a bird beats a little over half the time. The calm
comes from glides, few birds and empty sky, never from slow wings.

THE PATTERNS (kinematic, never boids: a scripted leader path, every other
bird in a place behind it in the air, following the same path): skeins (a
V, a J or an echelon: ARM_X 1.5-1.9 spans back and ARM_Y 0.9-1.1 aside per
place, JITTER 30%, the arms unequal), lines (FILE 1.6-2.2 spans, uneven,
undulating FILE_Y), pairs (now and then changing sides, SWAP_T 16-24 s),
loose flocks, lone birds, and soaring kettles on a sky at least SOAR_W 700
px wide in a roomy field (LAP 15-21 s, 1-2 laps, drifting WIND 3-6 px/s,
one way round; away one by one on the tangent). Every bird drifts about
its place on its own (DRIFT_L 0.08-0.18 spans along, DRIFT_P 0.15-0.3
aside and up and down, over DRIFT_T 3-6.5 s). Events, on the flight's own
clock from ev0 (a little after its leader comes into view): now and then
(GATHER 40% of skeins and lines) a skein crosses as a ragged file (FILE_G
2-2.4 spans) that fans out into its V, sideways first and then closing
up, the front birds first (GATHER_AT 0.4-0.9 s apart, GATHER_T 6-10 s
each), and a line as a bunch that strings out into single file; or
(LOOSEN 15%) the reverse, a V stringing out into a file; a straggler
catching up (+6-10%); a pair changing sides. Spacing is checked through
every event (fitsAll: every pair, every 0.5 s of it); a gathering that
cannot keep its birds apart does not happen. How many (1-9 by COUNT: 3, 5
and 7 favoured; never a flight of four, and no group of the flights in
the sky ever four birds, so none can leave four behind), which kind,
which pattern, which path: all random, from the visit's weather. If the
pattern does not fit, a flatter V, a smaller one, the same birds as a
line, fewer, one, then (a strip of sky) one in still air.

THE SKY: every flight enters from beyond an edge already flying, or out of
the distance, and leaves beyond an edge, below the window's sill or into
the distance, on one path; now and then (22%) a gull, crow or swallow
alone or in a pair climbs away or comes down (CLIMB 10-20 degrees) on a
sky 700 px or wider. Nothing starts, stops, loops, bounces or turns back
in view: motion onset and sudden reversals are what pull the eye off text
(Abrams & Christ 2003; Howard & Holcombe 2010). Samara's 1 s fade
(`appear`) softens each bird's entry at the edge. A flight is done only
when every one of its birds is out of view (GONE 8 px beyond the window,
or faded into the distance), never when its leader leaves (v10: v9 ended
a flight on its leader, and a receding skein's near-arm bird, nearer the
eye and still in view, vanished mid-sky once in 47 runs, 1024x768, seed
3, 457 s); a path on which a bird would stay in view LINGER 30 s past its
leader is not flown. A path is planned whole
before its first bird enters: the planner flies the flight forward in
thought (STEP 0.3 s), until its last bird has gone, and every bird's ink
box at its nearness (with room
for its bob) must stay WORDS 24 px from the .stack box and LINKS 20 px
from each footer link, EDGE 10 px inside the edges the flight does not
cross, and APART 48 px from every other flight, for the whole crossing;
and one flight to a band (BAND_GAP 24 px between the heights two flights
keep), unless the words stand between them wherever they share heights.
The roomiest of TRIES (16) paths wins; its point in the window is drawn
(R2 low-discrepancy) from the open sky, a level crossing's from the open
bands. On a sky with no open band (a phone turned sideways: the words
stand across it) the planner tries paths in the open sky beside them:
angling away into the distance, coming nearer, and steeper paths across
the window (DIAG 20-60 degrees on the window, solved for their heading
and climb, never over 45 degrees of climb, going away or coming nearer at
up to DIAG_N 0.85 of SHRINK or GROW). Planning is spread over frames
(QUOTA 500 bird-steps a frame, the working-out of each path counted), so
no frame is long.

THE RHYTHM: at most FLIGHTS 2 at once (3 on a sky WIDE 900 px or wider),
never two in one band (but for the words between them); the first enters
within about 1-2 s of load (FIRST, from beyond the edge; on a small sky
three birds at most), the second a few seconds after it (12-25% of the
first's crossing), then GAP 0.3-0.7 of a crossing between flights; with
no room (the bands taken) the sky looks again in RETRY 3-6 s; the season
(65% of visits left to right, the way the words read) sends 65-80% of
flights that way, and any flight may go the other; the sky thins over a
long visit (THIN: the gaps a crossing longer every 6 minutes, up to two).

THE HAND (what makes them alive; v1 dropped it and they read as frozen
icons): the round-capped stroke; the BOIL, every vertex re-jittered
BOIL_FPS (6) times a second by the visit's hand (1.2-1.6 px, x0.4 on a
bird in flight); the drawing (wings, bank, bob, tremor, facing, and the
size, pen and ink of its distance) changes only on the hand's frames
(DRAW_FPS 12, on twos) while the bird glides smoothly between them; a
bird faces the way it flies, with hysteresis, the flip landing on a hand
frame.

THE WEATHER (=rand()): ONE crypto.getRandomValues at init, above the
INIT-END marker, and no clock read at all; splitmix32 streams from it:
one front and five facets (hand, tempo, breeze, pace, traffic: a still
visit is still everywhere), the season, and each flight's own stream
(its kind, its birds and their drawings). Never Math.random (CI).

Twelve inline SVGs at the end of index.html are lent to flights (so at
most twelve birds at once), hidden until a flight shows them (no JS: no
birds); birds.v10.js sets each one's viewBox and size (room for the bird
at its nearest), polyline, stroke width and stroke opacity (attributes,
the last two only when they change), and moves it with a CSSOM
transform. It adds no DOM (CI greps createElement/innerHTML/appendChild).
pointer-events: none, so a link under a bird still takes the click.

prefers-reduced-motion: a still sky, a photograph: one flight (two on a
sky 900 px or wider; a skein, a pair or a lone bird) placed mid-path in
the roomiest open field, every bird caught at its own point in the beat,
the hand at rest, live both ways. forced-colors: CanvasText, full ink. A
hidden tab pauses with requestAnimationFrame; a step is capped at 50 ms.
A resize or rotation starts a new sky (and aims the camera anew). A
scroll, a font swap or a small change of height (on a phone, the
browser's bar coming and going, as it does while the page loads)
re-checks every flight, holding it to half its margin: a flight the words
moved onto goes, and its place is not kept waiting. Into a sky left empty
the next flight comes as the first did, within a second or two (v5 held
it back as if the lost flight were still crossing: on an iPhone the sky
stayed empty for ten seconds and more).

The birds fly for as long as the page is open. That is automatic motion
over five seconds beside content, which WCAG 2.2.2 (Level A) answers
with a pause control; the owner chose a sky without one.
prefers-reduced-motion is the only stop; the calm (glides, empty
spells, a sky that thins) is mitigation, not conformance.

RESEARCH (primary sources read, 2026-09): Pennycuick 2001 and Alerstam
2007 (airspeeds; wing-beat rates by species: gulls 2.9-3.3 Hz, crows
3.8, herons 2.9; 2-3.5 spans a beat); Taylor 2019, Usherwood 2016,
Tobalske 2003, Taylor, Nudds & Thomas 2003 (beat rate nearly fixed per
species; flap and glide; the body's rise and fall; the stroke); Portugal
2014 and Voelkl 2015 (ibis V's: blurred, birds swapping places,
spatially in-phase flapping); Hainsworth 1987-89, Speakman & Banks 1998,
Cutts & Speakman 1994, Newbolt 2024 (geese, cranes and pelicans: uneven
spacing, unlocked wing-beats, no fixed order in lines); Nagy 2010 and
2018, Weinzierl 2016, Akos 2008 (storks in thermals: 13.6 s median lap,
one way round, climbing as they circle); Whitaker & Halas, Preston Blair,
Muybridge (animation: 4-8 drawings a beat, a pose held over ~0.15 s reads
as posing; M, flat, W); Reynolds 1987 and the animators' "twinning"
(identical, in-step motion looks mechanical); Abrams & Christ 2003,
Howard & Holcombe 2010, Bartram 2003 (what motion captures attention);
and for depth (v8): Wallach & O'Connell 1953 (the kinetic depth effect:
shape and depth read from a changing projection), Cutting & Vishton 1995
(which cues give depth at a distance: relative size, height toward the
horizon, motion perspective; occlusion, which the birds never use, as
they never overlap), Franconeri & Simons 2003 (looming captures
attention, receding does not: approaches rare, slow, GROW well under
SHRINK); the ink-painting tradition (few birds, empty sky: liubai, ma).

VERIFY before changing the flight: a node simulator flies the real file
against a fake DOM with the real page layouts (12 viewports, rotations,
scrolls, a phone's browser bar changing the height at load, reduced
motion both ways) for 10 simulated minutes a run and checks: ink never
within 12 px of the words (in practice 21 px or more; 28 or more about
the lettered name's smaller stack), birds enter and
leave only across an edge or out of and into the distance (never popping
in or out mid-sky), no reversal and no turn over 25 degrees a second
outside a thermal or a finch's bounding (the path measured without the
bob), birds of a flight never overlapping (through their events), two
flights never within 30 px and never in one band (but for the words
between them), birds beating their wings most of the time and a flock
never in lockstep, the facing, no four birds, at most 2 flights (3 on a
wide sky), the sky seldom empty, the first bird within a few seconds
(within 3 s after the bar at load), short frames. The projection is
checked against three.js's own PerspectiveCamera (every bird's position
in the air re-projected, thermals too: 147,000 positions, worst error
1e-12 px); the depth is measured from the drawn marks alone (size and
speed over a crossing, paths toward the horizon; v7 against v8) and, on
frames rendered in Chromium with the page's clock stepped exactly
(Playwright's fake clock), by OpenCV's dense optical flow (Farneback);
then a browser pass checks the same live (in WebKit, Safari's engine,
too, with the window's height changed as the page loads), and film
strips, time-lapses and whole-page sheets across seeds are looked at by
eye. v9's raised horizon and turn check: the 10-minute suite on every
viewport and scenario, all passing. v10's end of a flight (its last bird
out of view): the same suite, 3 seeds of 10 minutes each, every viewport
and scenario, all 47 passing (1024x768 seed 3 included: v9, flown beside
it, still loses a bird mid-sky there at 457 s); a run's longest frame
39.6 ms of CPU at most, 18.5 in the median run (on a shared machine
under load a run's longest frame now and then passes the 40 ms bound,
v9's as v10's: 50.9 and 40.2 ms in v9's run beside it, 43.8 in an
earlier run of v10's).

## Sky (sky.v4.js, hour.v2.js)

THE CAMERA is the birds' (above): the window looks out over a sea of
cloud, the horizon a fifth of the way up from its bottom edge, and the
sky is drawn through the camera the birds lend (skyAir.aim; without the
birds, the same worked out here). Units: the sea's tops lie 1 below the
eye; everything a bird flies is nearer than any cloud.

WHAT IS DRAWN (WebGL2, one fragment shader, per pixel, back to front):
the sky's light (a gradient by height above the horizon: 0, 5, 15, 32,
49 degrees, the old 60 degree stop moved down as no window shows it;
warmed toward the light's side, deepened away from it, a haze band
toward the horizon; the sun or the moon, their halos and a wider glow);
a high deck at 5-7 (thin streaks, an overcast with rain under it, or a
veil of ice), fogged toward its own sky; cumulus towers rising out of
the sea (TOWERS 6 slots: a three-sphere core and nine lobes on the
dome's envelope, joined by a smooth minimum and eroded by tiling 3D
noise, soft edged; each builds out of the sea over BUILD 90 s and sinks
back in about a minute (1.6x); one is placed to rise neither behind the
words nor over a sun or moon in view, and once risen it is never made to
sink for the words (v2 sank a tower that drifted toward them: nothing
steps back about the words), so drifting with the wind it may pass
behind them; with no room, a slot looks again in 2-5 s); and the sea of
cloud below the eye (a heightfield of domes, round caps smoothly joined,
two sizes, the small only near; ending in the horizon's haze; how much
of the light reaches it per sky, seaLit: 0.45 for the afterglow and 0.6
for the light before sunrise, whose seas lie in the Earth's shadow, 0.55
for the moonlit sea's silver, 1 elsewhere; at a twilight lost in a low
mist, below). Cloud is lit as cloud, the reference's way: light carried
on through it (octaves of scattering, each dimmer, deeper and less
forward: the depth toward the light from two looks along it), its colour
the light's where thin and the sky's own saturated blue where deep
(thick, per sky; never grey), crevices lit by the cloud about them
(powder) rather than darkened, the edge toward the light silvered (a
forward phase), thin cloud beside the sun in pastel (iri). Aerial
perspective: everything fades with distance into the horizon's haze (the
near towers at 0.4 of the sea's fog, so they keep their form; the haze
takes a third of the glow about the sun), and a low mist lies on the
sea. And what the light does in the air, sky by sky (FX): a rainbow and
its fainter twin with the dark band between and the supernumeraries
inside, opposite a low sun, standing on distant showers (bow, curtain);
a glory's rings on the cloud sea about the antisolar point (glory); the
22 degree halo and a sun dog in a veil of ice (halo, dogs); the Earth's
shadow and the Belt of Venus opposite a low sun (belt); a pillar over it
(pillar); noctilucent wisps low on the side the sun set (nlc); the
moon's corona (corona); the Milky Way, its core low, its dark lanes, and
a crowd of faint stars along it (galaxy, its lie drawn per visit so the
band crosses the window); the aurora, three curtains folding slowly,
rayed, green below and red above, its light on the cloud (aurora); once
in a rain's hold, about 26 s of sun breaking through onto the sea
(sbreak); light drifting in the air near the sun (motes, in the window
pass); the stars twinkling slowly, their light bounded at the source
(with the sky's own light under it, a star never above STAR_TOP, OKLab L
0.45: eased softly into the room the sky leaves under it, one way for
every star on the whole sky, so a star near the moon or a glow fades as
it would). The sky's events, the stars, the motes and the rain are drawn
everywhere alike, about the words as anywhere (KEEPING A GLOW OFF THE
WORDS, below). Then light shafts (radial, from the sky seen near the
sun), a soft glow (dual-filter bloom), a shoulder for the highlights by
the brightest channel (a hue keeps its hue as it brightens, and past
white eases toward white), on a sky with light words its ceiling (ceil,
OKLab L 0.525: what passes KNEE 0.08 below it eased under it by a soft
shoulder, hue kept, the same everywhere on the window but within FOOT
4.5 degrees of the moon), and a triangular dither before the frame is
stored in 8 bits (no bands). The noise (64 cubed 3D, 256 square 2D) is
baked on the GPU over the first nine frames (eight layers a frame). One
wind moves everything the same way (towers, sea, deck; v1 sent the sea
and deck against the towers).

THE SKIES (SCENES, thirteen; no round, no clock): sunrise (lavender
above, peach at the rising sun, mist, the Belt of Venus opposite), the
glory (the sun low behind the eye, the cloud sea lit full on), fair
weather (azure, big round cumulus, shadows the sky's own blue), the halo
(a high veil of ice), silver rain (a light overcast, showers far off),
the rainbow (after the rain, the sun low behind the eye), golden hour
(the sun on the sea, rim-lit towers, rays, a pillar), the afterglow
(tops still pink over a sea in the Earth's shadow, the purple light),
the blue hour (over an amber band, noctilucent wisps, the first stars),
a moonlit sea, the Milky Way, the aurora, and the light before sunrise
(tops lit first). The six skies with light words (the afterglow, the
blue hour, the moonlit sea, the Milky Way, the aurora, the light before
sunrise) keep all their own light, everywhere on the window, under the
light ceiling, OKLab L 0.53 (Y 0.149: near-white reads on it at 5:1),
but for the moon: their horizons at 0.52 (the afterglow's and the light
before sunrise's from 0.64 and 0.62, the blue hour's from 0.55), their
warmth toward the sun at 0.53 (from 0.70, 0.75, 0.62), the haze and the
high deck of the two at 0.5 (from 0.55, 0.52 and 0.6), and what still
passes (the lit tops, the moon's silver on the cloud, the aurora's
folds, the galaxy's core, the wisps, a glow's bloom) eased under it by
the finish's shoulder (ceil); the stars bounded at the source (above).
That is the world's own light, the same in every direction, never a
function of where the words are. Each has a group (the time of day it
belongs to: dawn, day, rain, sunset, dusk, night), its words (dark or
light), a hold of 70-110 s (x0.9-1.15 by the visit), a change of 55-60
s, and the skies it passes into most naturally (near). A visit opens on
a sky of the visitor's hour (hour.v2.js: night 21-05, dawn 05-08, day
08-13, rain 13-16, sunset 16-19, dusk 19-21; any landing sky of that
group, by the visit's draw), nine tenths as far through its hold as the
hour is through its span; the light before sunrise is never a landing.
After that the order is the weather's, with no clock (the owner's word):
each next sky is drawn from its near ones, or (FAR 38%) from any, never
one of the last RECENT 3; a sky not yet seen this visit weighs more (1 /
(1 + 2 x its visits)), and after a run of skies of one kind of words the
other kind weighs four times as much, so a stay sees day and night.
Simulated (the real file, 400 visits from each hour, a stay of 15
minutes): about 6.5 skies; both kinds of words in 88-98% of stays, the
other kind after a median of 265-415 s; about 1.6 passes through the
cloud and 1.7 flips. Colours blend in OKLab; a sun or moon fades where
it stands (the outgoing gone by the middle of a change, the incoming
from it; into or out of a twilight, gone by 0.38 of the change, or from
0.62); the moon (the moonlit sky's, placed on the window at 0.82 of its
width and 0.14 of its height, and on a window under 500 px tall higher
and farther right, at 0.9 and 0.08) has its glare drawn tight (halo 600:
over the ceiling only within about 4 degrees), and its footprint (FOOT
4.5 degrees about it) stands KEEP 12 px clear of every block of words;
should the words reach it on some other window, it is slid out toward
the window's nearer side, then up, whole (its light never made less);
light and sun directions pass over the top where two skies face apart. A
change between skies of different words passes a twilight waypoint
(below); a change between skies that are not neighbours passes through
the cloud (the sea swells into mist, the towers sink, the deck closes,
and it all clears into the next sky: the reference's own way of passing
between its places); both can be one waypoint. data-sky carries the
group (the stylesheet's still sky and words for it); skyAir.cycle()
reports the sky, the next, the change's progress and the name's ink
(read only, for the score); data-sky-scene on the root (the studio's)
opens on a named sky. Each sky is the page's own, worked out from the
light, never taken from a picture.

THE WORDS on every sky, and never a darkened sky (the owner's word:
"Don't darken the background anywhere ever"): the window pass has no
cap, so no pixel anywhere is ever drawn darker than the sky's own light
(nor does anything about the words draw the sky itself less). Their ink
follows their ground: dark (black, a warm grey, a dark ochre ring) on a
light ground, light (#fdfcf7, a cool grey, a light gold ring) on a dark
one; two groups take theirs each from their own ground, the name and the
credit (the stack, on the sky; its colours on the root, the birds' ink
too) and the links (on the sea below the horizon; theirs on the footer:
their text, underline grey and focus ring). A frame's light where the
words stand is read back (the darkest and lightest under the name's box,
the credit and the links, 8 px about them where the ring is drawn; the
credit's mean and spread; the window's top colour for theme-color: a PBO
and a fence, never a stall; one at a time, the next queued); each frame
keeps its own, and since the two frames on show crossfade linearly in
light, their lightest, mixed at the crossfade's weight, bounds what is
shown. Light ink needs its ground no lighter than HI_MAX 0.167 (RATIO
4.7:1, room above WCAG's 4.5 for a pixel the read-back missed, rounding
and dither: nothing can hold a ground down), so it is set only where the
read-back shows the ground holds it; and the skies with light words keep
their own light under the light ceiling (above), so on them it always
does, a star behind a letter included. Dark ink reads on any ground:
where a group's ground is darker than FLIP 0.182 (black at 4.64:1; held
per pixel, so only rounding and the dither take it lower, to 4.55), the
light is raised by the gain its darkest ground on show needs (FLIP over
it) and no more, eased out across a field as wide as the window (a
Gaussian from the group's boxes, LIFT_FEATHER 2.5 times the window's
longer side: the name and the credit as one group, the links the other),
so it reads as the light brightening and never as a shape of the words;
at the words themselves (the boxes grown WORDS_CORE 8 px, the links'
LINKS_CORE 6) nothing is left darker than FLIP, a last hold for a darker
thread the read-back's grid steps over. The fields and cores are drawn
into a mask texture when the page moves (a ResizeObserver catching
reflows that move no window: text spacing, zoom), and only the window
pass reads it: the sky itself never knows where the words are. Nowhere
else is anything lifted. On a light sky nothing is lifted at all (the
darkest ground under any word on a light sky is 0.27 or more, the links
on golden hour's sea at 2560x1440); only as a change crosses its
twilight, and while it is lifted, the crossfade into a newer frame that
ends the lift (its ground needing none, or holding the light ink the
change is going to) is done within HURRY 0.3 s, and should the newer
frame lie in the band too, the next one is drawn quicker (in four
drawings, not nine), so the lift lasts under a second. The dimmed grey
is worked out for RATIO on the credit's ground (under dark ink its
darkest, or its mean less 3 sd, with a tenth to spare; under light ink
its lightest on show, with a fifth: the read-back samples the credit on
a grid and can step over a thin bright streak, as under the high deck of
the light before sunrise on a 430x932 phone, where three hundredths left
the grey at 4.47:1; or, where stars can stand behind it, the stars' top,
whichever is lighter), the ring for RING 3.3:1 on the links' (their
darkest with fifteen hundredths to spare, their lightest with a tenth:
the sea's fine grain the samples step over; each, under light ink, on
its ground as the other group's lift raises it). The flips: within a
change between a light sky and a dark one each group flips once, the
moment its ground allows the new ink (to light: once its lightest on
show is at or below HI_MAX; to dark: once it is above it, or the change
is three quarters done), never back against the change; and since one
group's lift reaches the other's ground too (its field is as wide as the
window), a group keeps light ink only where its ground, so raised, still
holds it, else it goes dark with the other: toward light the two flip
together, once both grounds hold it. In a sky's hold the sky's own ink;
should light ink's ground ever grow too bright (the skies with light
words keep their light under the ceiling, so it should not), dark ink at
once, and light ink back no sooner than DWELL 8 s, on a ground BACK 0.9
of HI_MAX: never a flicker. The words' colours are set only while the
drawn sky shows (otherwise the stylesheet's are left alone); while it
fades in over the still sky (2 s) they take the safer of the two sets
(darker on a light sky, lighter on a dark one).

THE TWILIGHT: any change between skies of different words eases into a
waypoint where the sky about the words is even and well below the
crossing (TWILIGHT, OKLab L 0.48, 0.47, 0.466, 0.466, 0.43 at 0, 5, 15,
32, 49 degrees; as drawn about 0.10 under the words): the gradient
alone, no warmth toward the light or shade away from it, no deck, event,
ray or glow, a sun or moon gone well before; its hue the two skies'
between, its chroma at least 0.045, a twilight purple where their hues
cancel, so a crossing is never grey; and the sea lost in a low mist the
colour of that sky (TWILIGHT_MIST 0.95), so under the links the ground
is as even and as dark as about the name. So light ink reads at the
twilight with room. No pair of inks reads at 4.5:1 on one ground with
room for dither (the band from HI_MAX to FLIP, 9%): as the light crosses
it, dark ink needs a lift and light ink cannot yet be set. So that
moment is short and reads as the light, not as a shape: the twilight is
set well below the crossing, so the light crosses on the steep part of
its way in or out; the sky about the words is even well before the light
reaches the band and stays even until it has passed it (EVEN 1.8: the
warmth, the shade, the deck, the events, rays, glow and the sea's mist
fade out that much sooner than the light going in, and come back that
much later coming out), so each group's ground is all but one light as
it crosses; dark ink's lift is a gain, the least its darkest ground
needs, spread over a field as wide as the window; and while it is on,
the crossfade into the newer frame that ends it is hurried (HURRY), or
the next frame drawn quicker. Measured through the changes (the next sky
forced, the page's clock stepped a twelfth of a second about each
crossing and while lifted, half a second elsewhere; the inks, the
read-back and the gains each step; the composite read straight back as
shown and with every words-related mechanism off; the window audited
role by role about once a second near the flip, the words hidden),
sunset to afterglow and back, first light to dawn, day to moonlit and
aurora to halo at 1440x900, sunset to afterglow and back at 844x390 and
day to moonlit at 390x844: each group flipped once a change, the two
together every time (toward light at 0.35-0.36 of the change, toward
dark at 0.68-0.69); every text role 4.60:1 or more and the ring 3.28 or
more through them; dark ink's lift over the whole window, x1.13-1.25 at
its peak, on for 0.34-0.85 s a change and by a tenth or more for
0.16-0.34 s (by a fifth or more only going back to sunset at 844x390,
0.34 s, and at 390x844, 0.16 s): toward light it builds as the newer
frame crossfades in and goes with the flip, toward dark it comes with
the flip and eases out as the light grows: for a moment the whole window
is that much brighter, and it steps as the ink changes; and from the
aurora to the afterglow at 1440x900 (two skies with light words, through
the cloud), no flip and no lift, every role 4.66:1 or more and the ring
3.46. Its map at its strongest (at 1440x900, sunset to afterglow: x1.099
at the words, x1.098 200-400 px from them and x1.097 400-800 px out, its
steepest change 0.003 over 60 px, the words' boxes explaining none of
it; at 844x390, x1.106 at the words and x1.105-1.107 everywhere else,
0.006 over 60 px): a field, not a panel, the window brightening all but
evenly, with no shape of the words in it. v3's first cut (a floor across
the words' boxes, a gain eased out over 110 px) lifted for up to 2.5 s a
change and showed, the half second before the flip, as a faint lighter
field the shape of the words' boxes (x1.16; 7% of a 1440x900 window by a
tenth or more); an earlier cut (the floor eased toward FLIP across the
whole feather, a twilight just below the crossing) lifted for 7-10 s, by
a tenth or more for 2.5-5.5 s, at most x1.33.

KEEPING A GLOW OFF THE WORDS is the sky's own doing, never a veil, and
nothing about the words is ever drawn less: no calm, no starless patch.
(v2, and the first cut of v3, stepped the sky's events back to a fifth
about the words, a calm, and drew no star, mote or raindrop there: both
darkened the sky about the words, a darker oval in a 2560 px aurora, and
both are gone; the sky pass never sees where the words are.) Light ink
is held by the light ceiling (THE SKIES): the skies with light words
keep all their own light under OKLab L 0.53 everywhere on the window,
and so under the words too, stars and all. The moon, the one bright
thing that passes the ceiling, stands with its footprint clear of the
words (above). And the seas of the afterglow, the light before sunrise
and the moonlit sky hold their light low (seaLit, above: the first two
lie in the Earth's shadow, as those skies always meant; the moon's
silver on the sea a little less), so under the links every night sea
stays at 0.125 or below under their line boxes and 0.124 in the 2-6 px
about them where the ring is drawn, at every window measured (14
windows, 320x568 to 2560x1440), where the old veil had held a dark box
around the links. A scroll redraws the lift on the next frame.

Measured (Chromium, SwiftShader; each text element's own colour against
every ground pixel under its line boxes, the words hidden; the lettered
name's ink against every ground pixel behind its strokes, its hairlines
too; the ring against the ground 2-6 px about each link): settled, all
13 skies at 1440x900, 390x844 and 844x390 (the phones at three device px
a CSS px; 8 to 28 s after the sky opened, partway through its hold) and
at 2560x1440 at two moments of each (15 to 65 s into its hold; the
aurora and the Milky Way at a third, the aurora's nine tenths into its
change to the Milky Way), every text role 4.65:1 or more (the lettered
name 6.08 at its strokes, the credit 4.65, the links 6.05) and the ring
3.37 or more, at 2560x1440 4.66 and 3.45; the four night skies whose
seas are lightest at ten more windows (320x568 to 1920x1080), every text
role 4.68:1 or more (the name 6.26, the links 5.86) and the ring 3.42 or
more; through the fade-in (0, 0.7 and 1.4 s; 390x844, 844x390 and
1440x900 x a sky of each time of day, and 2560x1440 x fair weather and
the moonlit sea), every text role 4.77:1 or more (the name 7.31, the
links 6.08) and the ring 3.46 or more; under reduced motion (390x844 and
1440x900, five skies), every text role 4.72:1 or more and the ring 3.41
or more; on the still skies (no WebGL2, each hour; no script, the day
sky and each hour's; the four windows), every text role 5.35:1 or more
(the name 10.01) and the ring 3.40 or more; the 404 (390x844 and
1440x900, five hours), every text role 8.20:1 or more (its heading
10.66) and the ring 4.01 or more; each sky's ink its own on every
window. The light ceiling (W8: on every audited frame of a sky with
light words, the frame composited again with the words' machinery off,
every pixel's OKLab L): on 85 audited frames of the six skies with light
words (14 windows, 320x568 to 2560x1440) and on every step of a change
between two of them (the aurora to the afterglow, through the cloud: 90
steps), no pixel over 0.53 outside the moon's footprint, the highest
0.5254 (the afterglow at 2560x1440), and the moon's place never moved by
the keep-out. Through a change between a dark sky and a light one the
ceiling comes and goes with the change, as the skies' other numbers do
(brought down sooner it would press the ground under dark ink below FLIP
before the flip, and lengthen the lift): so on the light-ink side of
such a change much of the window stands a little over 0.53 (at most L
0.695 in the eight changes measured), and light ink holds there by the
read-back alone (every role 4.60:1 or more through them, above). And no
darkening, proved two ways: every audited frame and every step of the
changes composited again at the same instant with every words-related
mechanism off (the window pass's mask zeroed, its floor 0 and its gain
1; the sky pass has no words input at all, its only textures the two
noise fields, checked on every frame), each read straight back from the
canvas, channel by channel: on the 137 audited frames (190 million
pixels) and on the 2,210 steps of the nine changes composited so (2,084
million pixels), not one pixel darker and not one channel lower (and on
the settled frames not one pixel lifted); and twin runs at 2560x1440
(the aurora, the Milky Way and the moonlit sea; fair weather and the
moonlit sea at 1440x900 too), the page as shipped against the page with
every words-related mechanism off for the whole run, the same visit and
the same steps of the clock (paused, stepped a frame at a time to the
same moment of the sky): identical, every channel of every pixel.

CALM AND COST: the clouds drift with one wind (SEA_DRIFT 0.45-0.8 px/s
where the sea is nearest, less far off, the deck faster aloft; the
distance gone is kept, so a new window changes the wind, never where the
clouds are) and the towers build and sink over minutes; the light
changes over a minute. A cloud frame (the window at SCALE 0.5 of its CSS
px, never over PX_MAX 640,000 px) is drawn in equal row slices over
PERIOD 1.5 s and crossfaded into (while dark ink's lift waits on it, in
four drawings and crossfaded within HURRY: a moment's double work at a
twilight). The window is drawn (DRAW_FPS) 12
times a second while it rains (on twos), else 6, and after THIN 300 s 4
(the frames over twice the period); the canvas at most CANVAS_DPR 1.25
device px a CSS px. All GPU work happens on those drawing ticks, each
ending with the window drawn (a browser may present the canvas after any
frame that drew at all: WebKit showed black); the frames on show are
kept through a resize until the first new one lands (never a blank
sky). A slow device, read two ways (the frame after a drawing tick
coming late against the display's own pace, learnt and relearnt; and a
fence showing the GPU still busy with one tick's work at the next),
steps down a LADDER (the canvas at 1 device px a CSS px; frames over
twice the period; smaller frames, twice) and back up after EASE 60 s at
ease; slow at its foot for 10 s, it keeps the still sky. A renderer on
the CPU (SwiftShader, llvmpipe and the like, by its name) gets the still
sky from the start. Simulated: steady rates, 120/144 Hz falling to 60,
a 30 fps low-power cap, a stray short frame and 8 s of contention leave
it untouched; a GPU that misses a frame every tick steps down a rung
every ~4 s, and recovers once eased. (Cost, modelled from exact
per-pixel counts: a phone's sky keeps its GPU 1-16% busy, the
composite the larger share.)

FALLBACKS: the canvas shows only once its first frame's read-back looks
like the sky it should be (doubted once, drawn and read again; doubted
twice, a GPU or driver that draws nonsense is let go, its context freed:
the stylesheet's sky stays); a lost context hides it (the still sky of
the hour, its own colours) until restored, then read again and shown;
no WebGL2: the stylesheet's still sky of the hour (data-sky, by
hour.v2.js), its colours and words; no script: the still day sky.
prefers-reduced-motion: the hour's sky, drawn once, still (live both
ways). forced-colors: no sky (and the sky back, read again, when they
end). A hidden tab draws nothing; the sky's clock steps at most 50 ms. A
resize re-aims and redraws. The sky animates for as long as the page is
open, as the birds do: WCAG 2.2.2 asks for a pause control, and the
owner chose none; prefers-reduced-motion is the stop.

THE WEATHER: one crypto.getRandomValues above sky.v4.js's INIT-END
marker (the cloud field, the towers, the wind, the stars, the order of
the skies, the galaxy's lie, the aurora's folds, where the sun breaks
through), and no clock:
hour.v2.js reads the clock, once, and marks the page (data-sky,
data-sky-at). No DOM is built: the canvas is in index.html.

VERIFY before changing the sky: stills of every sky (data-sky-scene
written into the page in flight) and every hour at 1440x900, 390x844,
844x390 and 768x1024 (Chromium with SwiftShader, the page's clock
faked); time-lapses of the random order over 15 minutes and more, and
stepped, frame-exact renders of each flip (the words hidden, the light
measured where they stand); a probe through each change between a light
sky and a dark one (the next sky forced and the page's clock stepped, a
twelfth of a second about each crossing and while lifted, the served
file patched in flight to expose the read-back, the inks and the lift:
one flip a group a change, every role 4.5:1 and the ring 3:1 on the
screenshots through it, the lift's size, reach and how long), and a map
of the lift at its strongest (its fall-off from the words, its steepest
change over 60 px, how much of it the words' boxes would explain: a
field, never a panel); the no-darkening proof (the same instant
composited as shown and with every words-related mechanism off, the mask
zeroed, the floor 0 and the gain 1, at the crossfade's weight the last
drawing tick showed, each read straight back from the canvas in one
task, and compared channel by channel over the whole window: not one
lower; screenshots will not do for this, as a composite drawn outside
the page's own frames can reach the screen a frame late, either way),
and twin runs (the page as shipped and with every words-related
mechanism off for the whole run, the same visit, the clock paused and
stepped alike, frame against frame); W8, the light ceiling (every sky
with light words drawn with the words' machinery off, every pixel's
OKLab L against 0.53 outside the moon's footprint, on every audited
frame); the night seas under the links at a dozen window shapes and
several moments of a hold; the still skies re-derived from renders when
the skies change (the towers left out); the contrast audit above,
settled and through the fade-in; reduced motion, a lost and restored
context, rotation (no blank frame), print, forced colours, the 404 page,
no WebGL, no script; a forced-black sky (the fallback takes it); the
governor on synthetic frame clocks; WebKit (Safari's engine); the bird
suite and the live bird pass with the sky running. (In the harness, the
GPU's name is faked and its fences report done, or SwiftShader's
slowness would rightly get the still sky.)

## CSS

One file: style.v13.css. Plain CSS. Custom properties for theming.
All @font-face declarations (subsets + metric fallbacks) at top of file.
Clamp-based spacing for fluid layout across viewports.
WCAG AA contrast on all text over every sky (the script holds it on the
drawn sky). The still skies: a gradient per time of day on the body (the
sky to the horizon at four fifths of the way down, then the sea), each
the drawn skies of that time of day taken row by row (1440x900, the words
hidden, the towers left out) and averaged in OKLab, so the drawn sky
dissolves in over its own; :root[data-sky] choosing it and the words'
colours, per time of day; each sky's colours hold against its
whole gradient, wherever a window puts the words (text and the dimmed
grey 4.7:1 or more, the focus ring 3.3:1; CI samples every gradient as
the browser draws it and fails below 4.5 and 3). (Taken again once the
skies with light words were held under their light ceiling and three of
them held their sea's light low (seaLit): the night sky whole but its
top, the colour hour.v2.js gives the browser's bar at first paint; the
dusk sea, 92-100%. So the drawn sky dissolves in over its own, not over
a lighter one. The dusk still sky's horizon band, 72-82%, stays a little
darker than the drawn afterglow's (#6c423c, #6b4242, #684347 where the
renders give #754944, #795254, #724f56): taken as drawn, it would need a
far lighter dimmed grey for dusk under CI's whole-gradient rule.) The
canvas (.sky) is fixed behind
everything (z-index -1), unseen until drawn. One keyframe, `appear` (a
bird's 1 s fade-in, Samara's, off under prefers-reduced-motion; the
sky's 2 s dissolve over the still sky, kept: a dissolve is not motion);
no transitions. :focus-visible is a 2px outline in the focus colour,
offset 3px, on every focusable. The name's two rules live here (CSP:
style-src 'self', no inline style): `.name svg` (display block, width
min(25.25rem, 100vw less main's padding), height auto, aspect-ratio
1310 / 314) and `.visually-hidden` (the clip pattern); print sets the
drawing 16rem wide. `.words` is the words' role for a paragraph (the
404's line).

## JS

Four files, one job each:

1. site.js — email obfuscation: HTML has href="#" id="email-link", JS
   assembles mailto from split parts at runtime so bots cannot scrape the
   address. A \<noscript\> fallback shows the email in HTML entities.
2. hour.v2.js — the hour (in the head, before the first paint: tiny,
   Early-Hinted): which time of day the sky opens on.
3. sky.v4.js — the sky (see Sky), deferred, before the birds.
4. birds.v10.js — the birds (see Birds), deferred. Progressive
   enhancement throughout: with JS off, the page is the typography on
   the still day sky.

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
  sky, #fdfcf7 on a dark one, CanvasText in forced colours). The h1 is
  `<span class="visually-hidden">Derek Zhou</span>` and the drawing
  (aria-hidden, focusable="false"): a screen reader, a search engine and
  the page's outline still get the words. 25.25rem wide where the window
  allows (the old set name's weight of ink: Geist 500 at 76 px), else the
  measure main's padding leaves (85% of a 320 px phone, 88% of 390); its
  box reserved by aspect-ratio 1310 / 314 (the drawing's viewBox), so
  nothing moves as the page loads. The drawing is used as approved: no
  letter is redrawn here. For contrast it is text, its hairlines too:
  4.5:1 against the ground behind every stroke.
* a heading set in type (the 404's "404", any heading to come): Geist
  500, clamp(2.75rem, 1.9rem + 4vw, 4.75rem), line height 1, tracked in
  -0.045em
* the words (the links, the 404's line, every paragraph to come): Geist
  400, 1.0625rem (the footer's links .875rem), line height 1.55,
  -0.006em, a 22.5em measure
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
fonts in all (Newsreader and DM Sans were 32 KB). The subsets keep the
copyright and the OFL notice in their name tables (IDs 0, 13, 14), and
assets/fonts/OFL.txt ships beside them. The home page uses no glyph
outside the subsets; do not add glyphs. font-display: optional + the
metric-matched fallbacks give CLS = 0 by construction: 'Geist Fallback'
(Arial) and 'Geist Fallback Android' (Roboto), 400 and 500 apart, their
size-adjust the page's own text set in Geist over the same text in the
system face and their ascent and descent Geist's (1.005, 0.295) over
it; 'Geist Mono Fallback' (Menlo, Courier New) by the advance, 0.6 em.
Checked (while the page still set its bio and name in type): with
Arial's metric twin standing in, the fallback wrapped the bio in the same
lines as Geist, the name within 1%. On the home page Geist sets the links
(400) and the h1's hidden words (500), Geist Mono the credit; the 404
sets its heading in Geist 500: both files are used, so both subsets are
preloaded in index.html and Early-Hinted via Link headers on / in
\_headers. Never preload a font no rule uses (Chrome warns, and every
first visit pays for it).

theme-color opens at the top of the hour's still sky (hour.v2.js, before
the first paint) and follows the top of the drawn sky. The favicon is SVG-first with PNG fallback.

## Caching

HTML: max-age=0, must-revalidate. Everything else: max-age=31536000,
immutable. Immutable means CHANGED BYTES NEED A NEW FILENAME: bump
style.vN.css → style.vN+1.css, birds.vN.js → birds.vN+1.js, sky.vN.js →
sky.vN+1.js, hour.vN.js → hour.vN+1.js, .subN → .subN+1, and update every
reference in the same commit — five files: index.html (stylesheet, hour,
sky, birds), 404.html (stylesheet, hour), \_headers (the style and hour
Link preloads, each file's cache block, the "next name" comment),
.github/workflows/validate.yml
(required files only — the Absences step resolves the shipped
versioned names itself with ls, so it never needs editing), and this
file (grep it for the old name). validate.yml's
reverse check fails on a leftover old version, so git mv rather than
copy.

## SEO

Canonical URL, Open Graph tags, Twitter card meta, JSON-LD Person schema.
Title: "Derek Zhou — Technology Leader".

## Security

All content directly in HTML. No innerHTML. No JS-generated DOM. The
lettered name is an inline SVG in index.html (one path; no text,
script, style, link or paint server in it), and CI step "The lettered
name keeps its words" fails if the h1 loses its visually hidden words,
the drawing loses aria-hidden or grows anything but its one
currentColor path, or the stylesheet stops reserving its box.
External JS and CSS files (enables strict CSP with no unsafe-inline —
CI greps index.html and 404.html for inline style/handlers).
\_headers file: script-src 'self'; style-src 'self'; connect-src 'none';
frame-ancestors 'none'; form-action 'none'; HSTS with preload;
COOP + CORP same-origin; Referrer-Policy no-referrer; broad
Permissions-Policy denial; X-Permitted-Cross-Domain-Policies none.
CI checks that security.txt has not expired.
CI step "Absences are enforced" (scoped to index.html, 404.html, site.js,
birds.v10.js, sky.v4.js, hour.v2.js, plus style.v13.css for cursors —
never to this prose) fails on: arrows/cookie/analytics/Loading/
navigation-role vocabulary in the HTML; any exit, idle, hover-position,
key, blur, title, favicon-swap or storage handler in the JS; any DOM
building in the birds, the sky or the hour; more or fewer than one
getRandomValues in the birds or the sky, or one below its INIT-END
marker; any Math.random or clock read (Date) in either; anything in the
hour but its one `new Date(` (no entropy; calls counted, not lines; no
Date() or randomUUID anywhere, no performance.now below a marker); any
URL hook
(location.search/hash/href, URLSearchParams) or sound (Audio,
AudioContext, <audio>, speechSynthesis) in the JS or HTML; and any
`cursor:` rule in the stylesheet (OS cursors only).
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
The sky needs no CSP change: WebGL2 from a same-origin script, no
workers, no blobs, no fetches. \_redirects sends /CLAUDE.md and
/.github/* to / (they were served as static files). Exact paths only:
Cloudflare matches redirects on the raw path, so a percent-encoded
spelling (/%43LAUDE.md) still reaches the file; the repo is public, so
nothing leaks that GitHub doesn't show. To truly stop serving repo files,
move the site into a folder and set it as the Pages build output
directory (still no build command). The hour's script carries
data-cfasync="false" so Rocket Loader leaves it to run before the first
paint.
robots.txt blocks: GPTBot, ClaudeBot, CCBot, Google-Extended, ChatGPT-User,
Bytespider, anthropic-ai, cohere-ai, FacebookBot.

## Deploy

Cloudflare Pages. Auto-deploys on push to main. No build command needed.
