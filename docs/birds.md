# Birds (inkbirds.js and its wing model)

<!-- Moved word for word from CLAUDE.md's section "Birds (inkbirds.js and its wing model)" (restructure step 7, 2026-11-06). -->

The birds are the ink birds, and there are no others: the world draws
them, in its canvas, so before the world's first frame, and wherever it
does not run (no WebGL2, no script, a lost context, a CPU renderer, a
device too slow), the page is the still sky and the words, with no bird on
it, and in print the name, the line and the credit on the paper, no bird
(docs/design.md); under forced colours the world draws them alone, in
CanvasText (docs/world.md, ## FALLBACKS). No script, SVG or rule of the old 2D
birds is left in the page, its stylesheet, its headers or the world's
scripts, and CI fails if one comes back (docs/security.md).

THE ONE BIRD (inkbirds.js, 2026-11-06; the design and every gap it
closes: docs/birds-design.md). Every bird is one record for its whole
life in the world (210, its flocks 212): its kind, its own stream from the
visit's one seed, its own age (its wings' clock), where it is and how it
moves (m, m/s), its heading, climb and bank, its flock and its place in
it, its goal and its state. One integrator flies every bird in the air:
it turns only through its bank (rate = g tan(bank) / airspeed, the bank
leading), climbs and sinks within its kind's limits, at its kind's
airspeed (its own pace, +-8-12 %) through the wind; gliding (the measured
schedule's glide) it cannot climb. A flock's leader flies a goal (commute
on a bearing, wheel round a place of the world (HOST.places: the temple,
the islands) or a patch of air, loiter about a home, go down into the sea
of cloud, climb out into the distance, now and then pass by the eye); its
birds steer to their places in its pattern (a V, a line, a pair, a loose
cloud), drifting about them, so any bird can join a flock or leave it and
a flock can change its leader. No bird lets the eye pass nearer than
14 m: it steers out of the way by its own bank. Nothing in a bird reads
how it was born, or the window.

The world keeps them. A bird lives in the world on screen and off:
turning the view never adds, removes or fades one, and a bird that
leaves the view keeps flying. Birds are added and taken out only where
no one can see it happen: so far off that the world's own air leaves
nothing of it on any pixel of the largest window (2560 CSS px at 2
device px a CSS px): a new flock is made there and flies in (addFar);
none is ever made near the viewer, under the land or in the sea of cloud
(the owner, 2026-11-06). One is taken out there, or once it has gone down
into the sea of cloud and is wholly hidden; it goes down there only on a
way of sea long enough for its whole descent, the one nearest its heading,
and only gently until it is on it. No bird flies below the land under it
and 15 m (CLEAR, floorUp): flying, in a flock's place, and on the way to a
perch (there never above the perch itself). The population is kept about the visitor in
the world (so many flocks within 2.6 km, by the sky, those flying in
counted); every 25-50 s one of them, of a kind that perches where the
sky has one, is sent by the camera's way 60-140 m wide of it (recruit),
and from such flocks the words' birds come down. At a visit's start, before its first frame, the sky is filled.
Under forced colours (the world not drawn, the camera held) a bird may
come and go beyond the view's side. No bird fades: the only change of
its ink with distance is the world's own air, in metres, the same on
every window.

PERCHES (260-264). A perch is a place on the window, a ledge of a
letter's ink or the pointer's tip, seen at the depth where a perched
bird is its size there: a point in the world that moves as the camera
and the pointer move. The ledges come from what is served
(255-perch-ink.js, made by tools/birds/perch/make.mjs from the name's
drawing in site/index.html and the link words and the credit in the
served fonts; CI makes it again): every column's stroke tops of the
name, curves and slopes included, every glyph top of the links and the
credit, never an underline. No ledge of the name lies under a stroke:
one with ink overhanging it within a perched bird's height (120 of the
name's units, 48 to each side) is cut, the inside of a closed counter or
under a crossbar, where the letters drawn over a bird would show it inside
the letter. Every 16-34 s a bird of a perching kind
(gull, crow, swallow, finch) in front of the camera may notice the
letters: a lone bird, or one to three of a passing flock while the rest
fly on. It first matches the perch's motion, then closes on it, down a
little (its low point 61 % of the way in, 3.2 % of the way below) and
up into it, its closing at a constant tau-dot (0.72), its wings braking
in the flare, its feet out at the end; from the touch its feet are the
perch's, solved every frame from where the perch is drawn (no easing).
Its rest over the perch is solved in the step, once, at the start of the
last leg (the touch pose on the perched attitude it will stand in, its
yaw decided then), never from what was drawn; over the flare its attitude
eases into that perched one, and the flare's pose passes into the touch's.
A change of what the wings do (a burst, the approach's beats and glide,
the flare, the perch, the leap) carries the last drawn pose over and eases
into the new one over 0.22 s (the owner, 2026-11-14: "the birds sometimes
feel choppy at times (esp when they land/takeoff ...)"); test/birds-motion.mjs
bounds the drawn motion frame by frame. Everything posed reads the frame's
own time (between the last two steps), never the step's clock: the wings,
the flare, the attitude, the perched life, the crouch; a bird stepped this
step is drawn between where it was and is (at 144 Hz the wings move on every
frame, not on the 42 % with a step). Getting up to leave, its rest is held.
If the perch gets away it goes round once, far out, then flies on. At
most 6 on the letters, one coming down at a time. On the perch it faces
into the wind (a row turning bird by bird as the wind shifts), turns by
steps and now and then hops round, raises its wings or rouses (a tenth
of its time at most, at gaps of its own), walks a stroke (planned to stay on
its flat middle, never onto the shoulder where it ends), steps aside
for a newcomer; the end bird of a row looks out. It leaves by its own
wish, to a flock of its kind passing (it joins it), or startled: a crouch
and a lean, a leap, a few strong beats, then on in the world on any
bird's goal (out into the distance, by the eye, down into the cloud, on).
Each click or tap on the page that is not a drag and not on a link lets
a bird go into the world from there, an ordinary bird from its first
frame; none under reduced motion. There is no limit on them (the owner,
2026-11-13: "there shouldnt be any limit"): what a bird costs is what it
takes to be seen. A flock no one can see (every bird flying, past the eye's
160 m, out of the view by 20 degrees and its breadth) steps every 0.5 s and
works out no wing; back in the view's margin it steps every frame again from
where it is, with a wing begun at its age. Every bird the window can show is
drawn (the draw's stores double when more are in view); a held pose's flexing
form is kept from frame to frame. The flock passes grow with the count, not its
square (joinStep by x).
A crowd thins from its far edge (the owner, 2026-11-13: "1 and yes to cheaper
specks"; option 1, his own: "the birds furthest away start flying further
away"): while the sky holds more flocks than its count, every 1.5 s a twentieth
of the excess (one at least), the farthest first, takes an outward goal away
from the eye and is never turned home. A flock gone where no pixel of it is left
is not thrown away (the owner: "if you fly towards those birds ... theyll get
back to normal"): it sleeps, out of the lists, its wing and draw stores freed
(about a kilobyte a bird kept), flying on in a straight line worked out only
when it wakes; one the eye could see again wakes where its way has brought it,
still beyond sight, over the land and the cloud, the same birds, on a goal of
its own. A speck (under 2 device px) poses its wings and lights itself one frame
in four, its points carried with its body between; a flock of specks steps one
frame in four, the draw carrying each bird on along its way; far, off-view and
speck birds pause their wing (BW.skip: it goes on from where it paused).

FLYING TOGETHER (the hub's flock physics spec, 2026-11-15: .work/hub/physics/birds.md; the owner: "some types of birds/flocks
flap their wings mostly in sync too sometimes, right?"). Real flocks almost never beat in lockstep. An ibis or a goose in
a skein beats with the bird ahead on its own leg in wake bouts, about a third of the time, median 2 s, at the spatial phase
(f d / U - 0.18 cycle); in a line, directly behind, in antiphase (+0.46); everywhere else free, each at its own rate (+-3 %),
so neighbours' offsets hold for seconds and drift. BW.relock (birdwing.js) points a wing at the wing ahead, worked out
whenever a flock's birds change (flockLocks, 120): only the nudge's target, never a phase. An ibis in a skein or a line
flies the ibis-in-a-V schedule (gliding about 3 %). A formation turns where its leader turned: each member flies its
leader's heading from back / c ago (c 1.5 V in a skein or a line, 2.5 V in a loose flock), on a ring of the leader's way
(210). test/birds-flock.mjs measures both.
LEAVING TOGETHER (physics: birds/leaving together). A take-off's strong beats (a burst: 3-5 beats a fifth quicker than
the level beat, the first the biggest) end on the beat; the bird's own schedule is then skipped on (BW.skip) so its phase
continues the burst's, within 0.02 cycle, and only the beat's size eases from the burst's into the schedule's over XF_T
(0.22 s): no half-beat, no frozen pose (before: up to half a cycle off, median 0.33, eased over by the last pose held).
A row startled off together keeps its 120-250 ms ripple and then drifts at its birds' own rates (test/birds-flock.mjs).
IN WIND (physics: birds/wind; the dunes realm's wind only, still air elsewhere). A goal asks for a speed through the air,
0.2 m/s more a m/s of headwind (gulls 0.16: doi:10.3354/meps14431), along its track over the ground, crabbed against the
side wind (goalVel, 210): into the wind a flock or a commuting kind slows over the ground, never held to its still-air
pace (before: air speed rose 0.82 m/s a m/s of headwind). A lone bird that perches, or one with a landing in hand or
begun in the last 30 s, works the view and keeps its pace over the ground. The body is drawn along its way through the air (230), so it crabs. In a side wind
over 1 m/s a landing on the letters comes in against it (to the pointer's moving tip, however it can): its gate on the perch's downwind side (gateFor), straight in only from that
side (approachStep); it touches facing into the wind (touchYaw, as wantYaw will want it) and never hops round of its own
in its first 2 s down (264). test/birds-wind.mjs: 93 % of landings against the wind (before 54 %), none turned round within
2 s of the touch (before 4 of 13).
THE SKY'S DAY (physics: birds/day; this world keeps only white-word skies, no day: afterglow, blue hour, night, first
light, each 70-190 s, in no day's order). At afterglow and in the blue hour commuters fly toward the roost's bearing
(POP.line, drawn afresh at each change of sky): 90 % and 75 % of commutes (roost flights peak 15-30 min after sunset);
at first light 90 % fly away from it. The way down to roost (sink) is 12 % of goals at afterglow, 25 % in the blue hour,
10 % at night, none at first light; a wheel never climbs on a timer (no thermal at dusk or night). At night only geese,
gulls and herons fly, about 4 flocks (LIVE_N); a crow, swallow or finch still up goes down to roost (or away) at its next
goal, off the words too, and is never sent across the eye. In the blue hour no crow wheels; at first light crows leave in
loose flocks. A change of sky takes effect only at each flock's next goal (the one clock, no shared timer).
test/birds-flock.mjs: afterglow 90 % of commutes within 30 deg of the roost's bearing (before 38 %), first light 92 %
away (before 19 %), night 4.1 flocks (before 5.0).

THE SIM (2026-11-06, the owner: "stop relying on films that take forever to test"). tools/birds/sim.mjs runs the
real module headless in Node on a stub host, over the world's recorded ground (test/golden/ground/, world seed 11,
+-1500 m about the landing; tools/checks/37-ground-fresh.sh reads the same probe under SwiftShader and fails a
recording off today's world by more than 5 cm; BIRDS_GROUND=stub for the old low hills): a camera flying its heading, the words' boxes as the served page lays
them out at 960x600 and 390x844, a scripted pointer, clicks and drags, the 50 ms clock. test/birds.mjs measures it
over random scenes against the research's numbers (CI: about 30 s; BIRDS_N=16 BIRDS_LONG=1 for the full run), and
`node tools/birds/sim.mjs --case C --size S --seed N --svg F` replays one scene with its paths in the perch's frame.
Its timings are the page's: the module runs on a plain global (vm DONT_CONTEXTIFY), never a contextified sandbox,
whose interceptors made every global read (Math's) some 60 times slower and the birds look 6 times dearer than they
are (2026-11-12: 0.058 ms a frame, step and draw, not 0.35; test/birds.mjs prints it against the slow phone's 1 ms).
What it pins: a landing comes in by a gate in view (wide of the perch, beyond it, a last leg of 30 m in view), closes
by a closed-loop tau-dot law (the closing a constant tau-dot gives at the range left), takes out its drift across
the line, and ends on a curve to rest in the perch's frame (its place and motion at both ends: no jump, no
overshoot); a bird ahead lets the perch come to it (never flying against the camera's way); feet fixed on the
perch (the pointer read before the birds step); standing on its feet, the wings' root, on a letter and on the pointer
alike, its perched poses (touch, settling, folded, wings raised) keeping its wings at or above them, so it stands on
top of the ink and no drawn point hangs below it (the hub's re-review 3, option c: within 5 px, the feet's own sink
included); turns only by bank; births and removals unseen; no object made in a
frame's step or draw, and no wing history growing without end.

THE SCORE'S READ (delight 2, 266-feed.js). WORLD.birds.feed(o) fills the
caller's own arrays and changes nothing in the world (test/birds.mjs: two runs,
one reading every step, end the same): o.f, 8 x 6 floats, the nearest flocks
nearest first (kind as o.kinds' index, range m, bearing rad + right of the eye's
way, elevation rad, radial speed m/s + away, count), o.n of them; o.w, 4 x 6,
the nearest birds (state 0 flying 1 coming in 2 landing 3 perched 4 leaving,
beat Hz 0 when gliding or its wing unseen, phase 0 at the downstroke's start,
bearing, range, span px), o.m of them. The score may call it as often as it
likes; it allocates nothing.

THE POINTER (the owner, 2026-11-05: "the birds should be more interactive
with the mouse"; and, 2026-11-06: "why is the bird flying away when i
just get near it instead of actually going on top of it?"). Friendly and
curious, not skittish:
- a pointer slow (under 40 px/s) for a second anywhere but the window's
  edge may bring a bird of the sky to its tip (from 3 s into the visit,
  12-22 s apart), flying the same approach, the tip led, never chased: on
  it its feet are the tip's every frame and its body swings to the tip's
  motion; it leaves when the tip moves fast (over 900 px/s), on a press,
  a drag or the pointer leaving the window. On a phone a press held
  0.8 s without a drag stands for a resting pointer above the fingertip.
- only a fast jab (over 300 px/s) at a bird on the letters startles it,
  and the startle runs down the row, bird to bird 120-250 ms apart, a bold
  one or two staying; at most once every 30 s.
The world reads a hovering pointer with one passive listener of its
moves and one of its leaving the window, both added and removed in
hoverSync only, only where the device hovers (any-hover: hover) and
never under reduced motion or forced colours; they only store, and the
birds do the rest in their own step. The words and the links react to
nothing.

The birds fly for as long as the page is open, as the world moves. That
is automatic motion over five seconds beside content, which WCAG 2.2.2
(Level A) answers with a pause control; the owner chose a page without
one. prefers-reduced-motion is the stop.
