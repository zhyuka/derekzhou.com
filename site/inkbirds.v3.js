// The comments in this file keep the tags and file names of the world's development record (design-v5, its rounds,
// fixes and judges; notes.md, w04b_sky.js, diag.js and the like), which lives outside this repository (CLAUDE.md).
/* inkbirds.js — the ink birds of the live site (birds.v9.js), living in the world.

   (physics, 2026-11-03) THE MEASURED WING. The owner, of the last beat: "the wings too stiff still... did u even study
   how birds flap..?! rsearch exact physics and replicate exactly". Every bird is now the faceted M (facetform.js,
   facetpose.js: the tattoo's M as a low-poly solid, per wing an arm panel and a hand panel either side of the wrist's
   fold, a bevelled leading edge, three tip pleats; labbird.js bends each pleat as a tapered feather and parts the
   notched kinds' fingers into slots: 46 vertices, 58 triangles, 30 facets) flown by the physics lab's measured wing
   (physics/lab: wingmodel.js and model.js, the per-kind joint curves from measured kinematics through a skeleton rig;
   labbird.js, the measured flap-glide schedules, beat-to-beat, bout-to-bout and bird-to-bird variation, the ibis V's
   wake-bout phasing; all byte for byte), made lazy for the world by birdwing.js (the lab's own loop, statement for
   statement). What changed here: the wings (wingsOf: one measured wing a bird; the schedule's bouts for the path's
   sink), the pose (poseBird: BW.poseS, LB.geom), the boxes (measureNorm: every vertex of the lab's poses), the light
   (lightBird: facetpose's per-facet light and its one tone), the pass (46 points and 30 facet lights a bird in a
   texture; the coverage over 58 triangles, the nearest facet per pixel, mix(one tone, facet, lodK)) and the dev's
   dumps and dials (rate, sched). The planner, the paths, the wind, the keep-outs, the hold, the occlusion, the words'
   keep-off, the night's halo, the calm: the shape round's, unchanged.

   (birds3d, 2026-10-27) THE PAPER BIRDS. The ink is gone from the drawing: every bird is now a 3D cut-paper body with
   two wings hinged at the shoulder and the wrist (birdform.js, posed by birdpose.js), beating at its kind's real rate,
   its attitude physical (the body along its world velocity, rolled by the coordinated bank its own acceleration asks),
   lit by the world's own light (white on blue, a grey tick on bright cloud, darker backlit; at night a light of its own
   and a soft halo), drawn by one instanced pass of exact coverage (section "the paper"). The planner, the paths, the
   beat's schedule, the tracker and the hooks below are the ink's, with the 3D boxes (measureBird3D), a side-on gate and
   the tattoo's view preferred, and three staged moments (section "the staging": S3, S1, S2). What the comments below
   say of the ink's drawing (its pen, the boil, the facing, the lens) describes round 1-3's ink, kept for the record.

   The owner, of the world: "And there should still be birds that are drawn/constructed in the same style as before
   (what's currently live in prod) but 3d-ified (but just enough to fit with everything else. So that might mean adding
   some "extra" fx to them)".

   THE SAME BIRDS. Everything birds.v9.js decides is decided here by its own code, carried over: the kinds (SORTS: their
   sizes, paces, wing-beats from field data, flap and glide, bounds, tails), every bird its own drawing in the tattoo's
   hand (drawBird: an "M" gull stood on a steep diagonal, its rises and drops reading as steps), the flights (skeins,
   lines, pairs, loose flocks, lone birds, thermals; gathering and loosening, stragglers, pairs changing sides), the
   calm (spans a second slowed to the page's calm, mostly gliding, few birds, empty sky), the planner (a path flown
   whole in thought before a bird enters: clear of the words, of the edges it does not cross, of the other flights, one
   flight to a band), the rhythm (at most two flights, three on a wide sky; the first within a second or two; the gaps;
   the sky thinning), the hand (round-capped strokes, the pose redrawn 12 times a second on twos, the boil re-rolled 6
   times a second, the bird gliding smoothly between drawings), the facing with its hysteresis, the appear.

   3D-IFIED. The live window was a camera looking out at the sky from a still place; here the camera flies through the
   world. Each flight flies in a frame that travels with the camera (its place and height, exactly: no flight looms as
   the camera flies on) but keeps its own heading in the world, fixed when it is planned (round 2): a turn of the view,
   the autopilot's or the visitor's, sweeps the birds across the window with the land, and the camera can turn to a
   flight or away from it. The planner sees the camera's coming turn (HOST.ahead: the autopilot's course) and flies
   every path through it before a bird enters, so the birds still enter beyond an edge or out of the distance, keep
   clear of the words and of each other where they will be seen, and leave the same way; their calm (pace, turns,
   growth) is the live's, judged against the world (the camera held still). A flight the view has left behind, or one
   the clouds have hidden, is let go unseen and the next comes as the first did. Air units (px at nearness 1) are
   metres by B_SPAN: a mid bird spans 3.2 m.
   Each bird is BUILT IN 3D from its own live mark: the mark is read as the bird seen from behind (its line across
   the wings, its wrists up), so each vertex is a point of a wing chain (tip, wrist, body, wrist, tip) in the bird's
   frontal plane; the mark's lean is a bank of that plane; the beat swings the wrists toward the line of the tips as the
   live beat does, the bank of a turn lowering the inner wrist. The plane faces the camera, turned toward the way the
   bird flies by up to 39 deg (FACING): flying away or coming nearer it is the tattoo's mark, square; flying across, or
   circling in a thermal, the same mark foreshortened and steepened; seen from below, its heights a little lower (a
   frontal M seen fully from beside closes to a stroke and stops reading as the tattoo's bird, so it is never shown
   so). The world's camera is a pinhole with a wide view (72 deg across a desktop, 79 deg up a phone): toward the
   window's edges it stretches what stands there; the live marks were drawn flat wherever they flew, so each chain is
   pressed back along that line (lens). Every drawing the 3D chain is posed (on the hand's frames); every frame it is
   placed where the bird is and projected through the world's camera, and drawn as ink: one instanced draw for all
   birds, each a screen-space quad round its five points, the distance to its four segments giving round caps, round
   joins and a 1 px edge; the pen (LINE by its size on the window: the live 1.5-2.5 px; a bird smaller than the live's
   farthest thinner with it down to 1 px, then fainter) and the boil in screen px.

   JUST ENOUGH EFFECTS (each can be turned off: FX): the ink is a
   thing in the world (the air between taken as the land's is: the engine's own fog and ground haze, then the grade
   the composite used), the ink takes a little of the scene's light (a dark bird's black lifted a breath toward the
   sky's light), and a bird crossing the sun's own glare is eaten by it as every silhouette is (round 2's light wrap,
   in place of round 1's rim: where the frame under a stroke is near white and the bloom strong, the pen thinner and
   the ink lifted toward the light); the night's light ink takes some of the sky's colour, as the live's grey did. It
   is drawn at the device's own resolution (round 2: the world's frame is drawn smaller and scaled up; the ink is not).
   It is hidden by the land in front of it (the scene's depth, per pixel) and by the clouds in front of it (the
   clouds' own cover per pixel, weighted by how much of a cloud's visible lobes stand between it and the camera); it
   steps back where the words stand (a bird nearer them than the live WORDS margin fades, gone at half of it, and the
   mask's core is never inked). Under forced colours the world is not drawn and the birds fly alone, in CanvasText.

   What the module may use is HOST (the engine's w12b_birdhost.js and notes.md, "The birds' interface"): no DOM, no
   clock, no entropy of its own, no storage, no network; randomness is the engine's streams (HOST.rng), time the
   engine's fixed steps. */
(function () {
  'use strict';
  if (window.WORLD && window.WORLD.stamp) window.WORLD.stamp('inkbirds.js top');   // (E0 Fix 3: the record bounds each script's evaluation)
  if (!window.WORLD || !window.WORLD.birds) return;
  if (!window.FACETFORM || !window.FACETPOSE || !window.WINGMODEL || !window.WINGMODEL_DATA || !window.LABBIRD || !window.BIRDWING) return;   // (physics: the faceted M and the lab's measured wing: facetform.js, facetpose.js, wingmodel.js, model.js, labbird.js, birdwing.js, loaded before this file)
  window.WORLD.birds(function (HOST) {
  var gl = HOST.gl;

  var DEG = Math.PI / 180, TAU = 2 * Math.PI;

  /* ---------------- constants ---------------- */

  /* the hand */
  var SPAN = 22;               // px across: a mid-sized bird at middle distance (nearness 1), on a large window
  var LINE = [1.5, 2.5];       // stroke width, px: finer far off, bolder near (the pen's pressure)
  var TONE = [0.62, 1];        // the ink: far birds paler (the air between), near ones black
  var PAD = 4;                 // px round a drawing's box: the caps and the boil
  var DRAW_FPS = 12;           // the hand draws each mark afresh this often (on twos) ...
  var BOIL_FPS = 6;            // ... its tremor re-rolled every other drawing
  var HAND = [1.2, 1.6];       // px: the visit's tremor ...
  var JSCALE = 0.4;            // ... trimmed for a small mark in flight
  var BOB = 0.04;              // spans: the body lifts this much on the downstroke
  var DOWN = 0.45;             // the share of a beat that is downstroke (the quicker stroke)
  var WRIST = [1.15, 0.2];     // the wrists: a little above the drawing at the top of the beat, all but flat at the bottom (never a slash: the steps always show)
  var TAIL = [10, 14.5];       // glyph units: a back wing drawn out as a tail ...
  var TAIL_UP = [12, 22];      // ... rising this many degrees off the bird's line
  var LEAN = [-14, 5];         // degrees: a bird stands at about its drops' angle (steps), give or take
  var FACE_HYST = 0.2;         // |cos heading| past this before a bird turns to face the other way

  /* the depth: the window is a camera looking out and up at the sky */
  var FOV = 60 * DEG;          // across the window's longer side
  var HORIZON = -0.2;          // the horizon this share of the window's height above its bottom edge (-): the eye is above a sea of cloud
  var SEA_CLEAR = 60;          // px: the horizon at least this far below the words' margin...
  var SEA_MIN = 0.05;          // ...but never less than this share of the window's height of sea showing
  var FAR = 0.42;              // nearness (1: SPAN): a bird this far off is gone into the distance ...
  var FADE = 0.54;             // ... fading from here (the air between), never popping out
  var NEAR_MAX = 1.7;          // none nearer than this in view
  var NEAR_FORCE = false;     // (dev: a film's near flight)
  var NEAR_SHARE = 0.3, NEAR_N = [1.3, 1.55], NEAR_SORTS = { gull: 1, heron: 1, crow: 1, goose: 1, ibis: 1, swallow: 1 };   // (round 3, kinds: the ibis and the swallow too)   // (fix round) a lone bird or a pair this often near
  var GROW = 0.012;            // a bird comes nearer (grows) by at most this share of its size a second: looming pulls the eye ...
  var GROW_K = 0.55;           // (fix round) ... its path taking at most this share of it (round 2: 0.9), the rest left for its drift in depth (DRIFT_L about its place: a phone's near birds grew 1.3-1.8 % a second with it)
  var SHRINK = 0.03;           // ... and goes away (shrinks) by at most this; receding does not
  var HEAD = [[0, 25], [25, 60], [-30, -12]];   // degrees off the window's plane (+ away): across it, angling away, coming nearer ...
  var HEAD_W = [55, 32, 13];   // ... this often (%): the sky mostly crossed, now and then a flight going away, seldom one coming
  var TURNING = 0.4;           // of flights, wheeling as they go (gulls and swallows the more) ...
  var TURN = [20, 60];         // ... through this many degrees ...
  var TURN_T = [3, 6];         // ... over this many seconds (a bank of 25-35 degrees)
  var HEAD_MAX = 72;           // degrees: no path heads further off the window's plane than this (never turning back across it)
  var BANK = 0.3;              // a turning bird banks: its inner wrist lower and its outer higher by up to this share ...
  var BANK_AT = 40;            // ... at this many degrees a second of turn on the window
  var UP_V = 0.06;             // spans: a V lies level in the air, give or take this
  var SPACE_SEEN = 2;          // px: two birds of a flight never closer than this on the window (a near one passing a far one)
  var SLOWEST = 5;             // px/s: nor slower than this anywhere in view (far off, going away)
  var TURN_SEEN = 18;          // degrees a second: nor any bird of it turning faster than this on the window (a turn seen heading away sweeps round)
  var TURN_MAX = 22;           // degrees a second: and no bird, as it will be drawn (its drift, the wander, a gust), ever turning faster (the planner's check)

  /* the sky */
  var OUT = 70;                // px beyond the window where a path begins and ends
  var WORDS = 24;              // px of sky kept clear round the words (the name, bio and credit) ...
  var LINKS = 20;              // ... and round the footer links
  var ROOMY = 60;              // px: a path this far from the words and the window's edges is as good as any
  var EDGE = 10;               // px kept from each edge of the window a flight does not cross
  var APART = 48;              // px kept between two flights, always
  var FLIGHTS = [2, 3];        // flights in the sky at once, at most: more on a WIDE sky
  var WIDE = 900;              // px
  var STEP = 0.3;              // s: the planner's look-ahead step (a path is checked whole before a bird enters)
  var TRIES = 16;              // paths tried per flight
  var QUOTA = 500;             // bird-steps of look-ahead a frame: planning is spread over frames, never a long one ...
  var LEAD = 4;                // s: ... so a flight is planned to set off this far ahead (still beyond the edge)
  var STEP_MAX = 0.05;         // s: the longest step a frame may take

  /* the pace */
  var PACE = [0.94, 1.06];     // the visit's pace, on every kind's own
  var TEMPO = [0.95, 1.05];    // the visit's wing-beat, on every kind's own
  var SPEED = [14, 64];        // px/s where a flight crosses: never slower, never faster ...
  var CALM = [22, 52];         // s: a mid bird crosses the window in about this long (a phone's .. 1440 px and up):
                               // the page's calm, slower than the wild, every kind slowed alike, so each keeps its pace ...
  var REF = 2.04;              // ... (a mid bird: its distance, 0.85, times its 2.4 spans a second) ...
  var CROSS = [15, 36];        // s: ... and no bird across it quicker than this ...
  var KNEE = 0.75;             // ... easing toward that from this share of it, so a quick kind stays quicker than a slow one
  var HOLD = 2.2;              // a bird slowed from its wild pace glides the longer between bursts: by the root of how far, up to this
  var DETUNE = 0.05;           // each bird beats its own share faster or slower than its flight
  var GAP = [0.3, 0.7];        // the next flight comes after this share of the last one's crossing in view ...
  var THIN = 360;              // s: ... and the sky thins, the gaps a crossing longer for every THIN s on the page ...
  var THIN_MAX = 2;            // ... up to this many crossings longer
  var FIRST = [0.5, 1.5];      // s: the first flight's leader enters this soon after load
  var RETRY = 3;               // s: no room for a flight now: look again this much later

  /* the paths */
  var DIAG = [20 * DEG, 60 * DEG];   // steeper across the window, when no level crossing fits (a narrow landscape sky) ...
  var DIAG_N = 0.85;           // ... going away (down toward the horizon) or coming nearer (up), at up to this share of the most it may shrink or grow a second
  var CLIMB = [10 * DEG, 20 * DEG];  // a lone bird or a pair climbing away or coming down, now and then
  var WANDER = [4, 10];        // px: the track's slow wander, by the breeze, which every bird of a flight flies through ... (round 3, alive: from 3-7)
  var WAVE = [260, 480];       // px: ... its wavelength
  var HEAVE = [2, 5];          // px: a gust lifting or dropping the whole flight, by the breeze ...
  var HEAVE_T = [10, 16];      // s: ... this slowly

  /* the patterns */
  var COUNT = [11, 19, 22, 0, 18, 5, 14, 4, 7];   // % of flights of 1, 2 ... 9 birds (never four)
  var FORM_K = 1.15;           // (birds3d) a formation's places spaced this much wider: the 3D bird is drawn about this much wider than the ink mark (A18), so its flock keeps the ink flock's air between its birds
  var ARM_X = [1.5 * FORM_K, 1.9 * FORM_K];      // spans back, per place along an arm of a V, a J or an echelon
  var ARM_Y = [0.9 * FORM_K, 1.1 * FORM_K];      // spans aside, per place (level in the air: the arms nearer and farther)
  var JITTER = 0.3;            // no slot is where a ruler would put it: each is off by up to this share
  var FILE = [1.6 * FORM_K, 2.2 * FORM_K];       // spans between birds in a line ...
  var FILE_Y = 0.5;            // ... the line undulating up or down by up to this many spans a bird (and aside, a third as much)
  var PAIR_X = [0.9 * FORM_K, 1.4 * FORM_K], PAIR_Y = [0.95 * FORM_K, 1.2 * FORM_K];  // spans: the second of a pair, behind and aside (nearer or farther)
  var LOOSE = [1.5 * FORM_K, 2.6 * FORM_K];      // spans: a loose flock's spacing
  var DRIFT_L = [0.12, 0.26];  // spans: every bird drifts about its place, forward and back ... (round 3, alive: from 0.08-0.18)
  var DRIFT_P = [0.28, 0.5];   // ... aside and up and down ... (from 0.15-0.3)
  var DRIFT_T = [4.5, 9];      // s: ... this quickly, each on its own (from 3-6.5)
  var SURGE = 0.07, SURGE_T = [6, 14];
  /* (round 3, the owner's word on the camera) each flight's own world speed along the camera's course, a multiple of
     the camera's: on the flight line it pulls ahead, against it it drops back slowly, across it and local it holds
     station and wanders about it (spans, over s); a day sky's flights (no roles) these shares */
  var WS_AHEAD = [1.06, 1.18], WS_BACK = [0.93, 0.97], WS_HOLD = [0.98, 1.02], WS_WANDER = 0.8, WS_T = [8, 16], WS_DAY = [0.4, 0.35, 0.25];   // (round 3, alive) a flight's pace swings, rms, over this many s
  var SIZE_VAR = 0.08;         // birds of one flight differ in size by up to this share
  var SPACE = 4;               // px: the least ink-to-ink gap between two birds of a flight, in the air
  var BAND_GAP = 24;           // px between the heights two flights keep: one flight to a band
  var GATHER = 0.4;            // of skeins and lines: a scatter that gathers into its pattern as it crosses ...
  var LOOSEN = 0.15;           // ... or a pattern that loosens
  var GATHER_AT = [0.4, 0.9];  // s: each bird setting off for its place this long after the one ahead ...
  var GATHER_T = [6, 10];      // s: ... and taking this long to reach it
  var FILE_G = [2 * FORM_K, 2.4 * FORM_K];       // spans between birds in the file a V opens out of
  var REL = 0.2;               // no bird moves within its flock faster than this share of the flight's speed (birds never fly backward)
  var GATHER_MAX = 16;         // s: a gathering that would take longer does not happen
  var STRAGGLE = [0.06, 0.1];  // a straggler catches up at this much over the flight's speed ...
  var STRAGGLE_T = [14, 22];   // ... over this many seconds
  var RESHUF = 0.4, RESHUF_T = [8, 12];   // (round 3, step 3) of the skeins with a longer arm, this share reshuffle once; over this long (s)
  var SWAP_T = [16, 24];       // s: a pair changing sides
  var WAVE_DELAY = [0.35, 0.8];   // s: in a line, each bird starts its beats and glides this long after the one ahead
  var FLAPS_SLOW = [[4, 9], [0.8, 2]];  // a kind that beats on and on, held to a slower pace: it glides between bursts instead

  /* the soaring birds */
  var SOAR_W = 700;            // px: a sky this wide or more (a phone's bands would trap a circle)
  var SOAR_R = [55, 110];      // px where it circles: a thermal's radius, 38 + 0.05 x the width within this
  var LAP = [15, 21];          // s a lap (storks: 13.6 s median, 18 s at most; a little slower on a page)
  var LAPS = [1, 2];           // laps each, before gliding away
  var WIND = [3, 6];           // px/s: the thermal drifting downwind ...
  var RISE = [1.5, 3];         // px/s: ... and the birds climbing in it (about half its radius a lap)
  var GLIDE_V = 1.3;           // they glide in and out this much faster than they circle, easing over ...
  var EASE_T = 2.5;            // ... this many seconds
  var DESCENT = [2 * DEG, 4 * DEG];   // the glide away, a little downhill

  /* the kinds of bird: their size and distance (nearness), pace (spans a
     second), wing-beat (Hz), flapping (beats a burst, glides s), drawing
     (glyph units and degrees: the rises, the drops, the stroke out in
     front, how often a tail), the wrists' set on a glide, and their paths */
  var SORTS = {
    goose:   { size: 1.18, depth: [0.6, 1], pace: [2.4, 2.8], hz: [2.3, 2.7], flaps: [[16, 36], [0.4, 0.9]],
               rise: [5.2, 6.6], drop: [3.8, 5], out: [5.6, 7.2], up: [28, 36], down: [34, 42], tail: 0.05, glide: [0.85, 1.05], tilt: 4 },
    ibis:    { size: 0.95, depth: [0.65, 1.05], pace: [2.2, 2.6], hz: [2.6, 3], flaps: [[4, 10], [0.9, 2.2]], sink: 0.08,
               rise: [5, 6.4], drop: [3.6, 4.8], out: [5.4, 7], up: [28, 36], down: [34, 42], tail: 0.4, glide: [0.8, 1], tilt: 4 },
    gull:    { size: 1.05, depth: [0.75, 1.3], pace: [1.9, 2.3], hz: [2.2, 2.6], flaps: [[3, 7], [1.4, 3.6]], sink: 0.12,
               rise: [6.2, 8], drop: [4.4, 6], out: [6.4, 8.4], up: [22, 30], down: [28, 36], tail: 0, glide: [0.75, 1], tilt: 7, wheel: 1.6, wander: 1.5 },
    heron:   { size: 1.4, depth: [0.9, 1.3], pace: [1.8, 2.1], hz: [1.9, 2.2], flaps: [[20, 44], [0.5, 1]],
               rise: [5.8, 7.2], drop: [4.2, 5.4], out: [5.6, 7], up: [30, 38], down: [36, 44], tail: 1, glide: [0.85, 1.05], tilt: 3 },
    crow:    { size: 0.8, depth: [0.75, 1.2], pace: [2.7, 3.1], hz: [2.8, 3.2], flaps: [[14, 30], [0.3, 0.8]],
               rise: [4.8, 6], drop: [3.6, 4.6], out: [5, 6.4], up: [30, 40], down: [36, 46], tail: 0, glide: [0.85, 1.05], tilt: 5 },
    finch:   { size: 0.62, depth: [0.9, 1.3], pace: [3.2, 3.8], hz: [5, 6], flaps: [[2, 4], [0.28, 0.5]], bound: [0.35, 0.55],
               rise: [4, 5.2], drop: [3.2, 4.2], out: [4.2, 5.6], up: [30, 40], down: [36, 46], tail: 0, glide: [0.15, 0.3], tilt: 6 },
    swallow: { size: 0.5, depth: [0.95, 1.4], pace: [3, 3.6], hz: [3.8, 4.6], flaps: [[2, 4], [0.9, 2.2]], sink: 0.1,
               rise: [4.6, 5.8], drop: [3.4, 4.4], out: [6.2, 8], up: [26, 34], down: [30, 40], tail: 1, glide: [0.8, 1.05], tilt: 8, wheel: 1.8, wander: 3, wave: 1.3 },
    stork:   { size: 1.45, depth: [0.75, 1.15], pace: [1.6, 2], hz: [1.9, 2.2], flaps: null,
               rise: [6, 7.6], drop: [4.4, 5.8], out: [6.2, 8], up: [22, 30], down: [28, 36], tail: 0.5, glide: [0.75, 1], tilt: 3 }
  };
  /* which kinds fly which patterns, and how often */
  var SORT_OF = {
    skein: [['goose', 75], ['ibis', 25]],
    line: [['ibis', 40], ['goose', 35], ['gull', 25]],
    pair: [['gull', 40], ['goose', 20], ['crow', 20], ['swallow', 10], ['finch', 10]],
    single: [['gull', 35], ['heron', 30], ['crow', 20], ['swallow', 10], ['finch', 5]],   // mostly the big, slow-beating kinds:
    loose: [['crow', 35], ['gull', 30], ['finch', 20], ['swallow', 15]],                 // the small quick ones now and then
    soar: [['stork', 1]]
  };
  /* (life, DESIGN 2.1-2.3) the sky is always dusk or night now: what a real evening shows. The world's skies read as times
     of the evening (cls: glow the afterglow, civil twilight; blue the blue hour; first the first light before dawn; moon
     the moonlit night and the other night skies); a day sky (the world still has them until the white-only stage) keeps
     the tables above. Per class: the flights' patterns (shares, DESIGN 2.2), the kinds a pattern flies, the gaps (x the
     live's), the longest empty spell (s), one flight fewer at first light and at night. No soaring kettle (no thermals
     after sunset), no stork, no finch (they roost before sunset) */
  var SKY_CLS = { afterglow: 'glow', bluehour: 'blue', firstlight: 'first', moonlit: 'moon', milkyway: 'moon', aurora: 'moon' };
  var LIFE = {
    glow:  { gap: 1, empty: 45, fewer: 0, pat: [['skein', 27], ['line', 15], ['pair', 18], ['single', 25], ['loose', 15]],
             kinds: { skein: [['goose', 80], ['ibis', 20]], line: [['goose', 35], ['ibis', 30], ['gull', 35]], pair: [['gull', 40], ['crow', 35], ['goose', 15], ['swallow', 10]],
                      single: [['gull', 40], ['heron', 35], ['crow', 20], ['swallow', 5]], loose: [['crow', 70], ['gull', 30]] } },
    blue:  { gap: 1.6, empty: 70, fewer: 0, pat: [['skein', 32], ['line', 15], ['pair', 15], ['single', 35], ['loose', 10]],
             kinds: { skein: [['goose', 80], ['ibis', 20]], line: [['goose', 35], ['ibis', 30], ['gull', 35]], pair: [['gull', 50], ['crow', 15], ['goose', 35]],
                      single: [['gull', 45], ['heron', 45], ['crow', 10]], loose: [['crow', 60], ['gull', 40]] } },
    first: { gap: 3, empty: 100, fewer: 1, pat: [['skein', 27], ['line', 10], ['pair', 15], ['single', 50]],
             kinds: { skein: [['goose', 1]], line: [['goose', 50], ['gull', 50]], pair: [['gull', 60], ['goose', 40]], single: [['gull', 50], ['heron', 50]] } },
    moon:  { gap: 5, empty: 120, fewer: 1, pat: [['skein', 20], ['pair', 15], ['single', 60]],
             kinds: { skein: [['goose', 1]], pair: [['gull', 60], ['goose', 40]], single: [['gull', 50], ['heron', 50]] } }
  };
  /* birds a flight, by pattern (odd skeins, legs of 4-5; never four) */
  var LIFE_N = { skein: [[5, 8], [6, 5], [7, 32], [9, 35], [11, 20]],   // (round 3, step 3: drawn larger, as the room makes many of them fly as fives)
                 skeinI: [[3, 35], [5, 35], [6, 10], [7, 20]], skeinN: [[5, 20], [7, 45], [9, 35]],
                 line: [[3, 40], [5, 35], [6, 25]], pair: [[2, 1]], single: [[1, 1]], loose: [[5, 40], [6, 35], [7, 25]] };   // (fix: 5-7, so a loose flock finds room under the calm's cap)
  var LIFE_MIN = { skein: 5, line: 3, pair: 2, single: 1, loose: 5 };
  var V_GEOM = { goose: { x: [1.9, 3.0], y: [1.15, 1.45] }, ibis: { x: [0.8, 1.0], y: [0.75, 0.9] } };   // (fix: in the birds' own spans; the goose's aside 1.0-1.25 for a full angle of 35-60 deg about its way (DESIGN L4), no FORM_K; laid along their way through the air, spot())   // (spans back, aside per place: the goose's V 35-60 deg, the ibis's 80-90)
  var JITTER_V = 0.4;         // (life) a skein's places more ragged
  var ROOST = { share: 0.85, band: 30, sink: [1.4, 3.6], climbFirst: [0, 2], moonShare: 0.7, other: [0.6, 2.2] };   // (DESIGN 2.3; fix: the sink is through the AIR, deg; other: the dusk flights not roost-bound sink too)
  var skyNow = '', roostPsi = 0, FLX = {}, roostCls = '', roostK = 0, LPEND = null, LPEND_T = 45;   // (fix: the roost's bearing set once a sky; a pattern waiting for room)
  /* (round 3, alive) THE ROLES (DIRECTIONS 4.1): of a sky's flights, on its flight line (stream), against it (counter), across
     it, and local (one wheel), %, by sky; each kind group's side agreeing with the sky's (DIR_AGREE), at night all one
     front; the night's line downwind DIR_NIGHT_DOWN of the time; a counter flight level or climbing a little (deg) */
  var DIRS = { glow: [65, 15, 15, 5], blue: [55, 20, 20, 5], first: [45, 20, 30, 5], moon: [62, 15, 20, 3] };
  var DIR_AGREE = { glow: 0.8, blue: 0.75, first: 0.75, moon: 1 }, DIR_GROUP = { goose: 0, ibis: 0, gull: 1, crow: 2, heron: 3 };
  var DIR_NIGHT_DOWN = 0.65, DIR_CROSS_SAME = 0.6, DIR_CLIMB = [0, 2], DIR_LOCAL_TURN = [30, 60], roostFlip = [1, 1, 1, 1], roostVq = 0;
  function skyCls() { var id = HOST.sky ? HOST.sky() : ''; return SKY_CLS[id] || 'day'; }

  /* ---------------- 3D: the birds in the world ---------------- */

  var B_SPAN = 3.2;            // m: a mid bird's span (size 1); every kind by its SORTS size (a heron 4.3 m, a finch 2 m)
  var LEAVE_T = 2.5;           // s: a bird out of view this long comes back with its appear begun again (sooner, it crosses back over the edge at its ink, as the land does); a flight past its planned span none of whose birds has been seen this long is done
  var AWAY_T = 8;             // s: (round 3) a flight the view has turned from within its planned span is kept, unseen, this long (the visitor may look back to it); its band is free while it is unseen
  var UNSEEN_T = 4;            // s: ... and one not seen this long after it was to come into view (a turn the planner did not foresee)
  var CLOUD_T = 3;             // s: ... and one all of whose birds on the window have been behind cloud (cover over a half) this long
  var CLOUD_HID = 0.2;         // a path whose birds would be behind cloud (or the land) at more than this share of its probes is not flown
  var ENTER_BY = [4.5, 8];     // s after it sets off: the first flight's birds in view by this, the next's (else that path is not flown)
  var SEEN_MIN = [4, 8];       // s: and in view at least this long (a turn that would sweep it straight out: not this path)
  var SWEEP = [0, 0, 0];       // of the mark's width: the wrists this far forward of the body, the tips and a tail this far back (tried at 0.05, -0.12, -0.3: seen obliquely the sweep cancelled the wrists' rise, a third of the marks a flat stroke or an upside-down M; the chain is kept in its plane)
  var PEN_MIN = 1;             // px: a bird smaller than the live's farthest (a place's thermal, far off) has its pen thinned with it down to this, and fainter below it, never thinner
  var FACING = 0.8;            // the bird's frontal plane faces the line of sight, turned toward the way it flies by atan(FACING x the sine of the angle between them): never more than 39 deg (seen from beside, a frontal M would close to a stroke) ...
  var FACING_UP = 0.3;         // ... (round 2) turned further while its wrists are up (above 0.6 of their rise), to atan(1.1) = 48 deg at the top of the beat, where the M's steps hold it legible (the fold, flat marks and lean measured unchanged: foldsim)
  var NEARMOST = 0.6;          // of the bird's span: the land in front of a bird hides it past this far in front of its body
  var CLOUD_IN = 14;           // m of a cloud's visible lobes between the camera and a bird: its cover over the bird counted fully
  var NEAR_FADE = [1.9, 2.6];  // nearness: a bird the camera comes nearer than the planner ever would (a place's thermal flown into) fades between these
  var MAXP = 64;               // (birds3d) birds lent to flights: a ring of 64 (the live site's twelve SVGs no longer bind: the calm does) ...
  var DRAW_MAX = 48;           // ... at most this many busy, and drawn, at once
  var QUOTA_STEP = 300;        // path points of planning a fixed step (1/60 s), a bird's place counted at its cost (SPOT_COST; round 2: 200, a place counted as 1)
  var SHADE = 0.008;           // the ink's share of the scene's light (a dark bird's black lifted a breath toward it; round 2's 0.035, with the air on top of the live's TONE, paled a goose at mid distance to half the live black's contrast; round 3's first 0.012 with AIR_INK 0.4 left DUNES's at 73-80 %)
  var AIR_INK = 0.25;          // (round 3) the share of the air's haze the ink takes (the engine's fog and ground haze at its distance): all of it paled DUNES's birds at 40-120 m to 61-72 % of the live black's contrast (ink2.py), ABOVE's to 82-87 %; 0.4 (with SHADE 0.012) 73-80 % and 87-90 %; 0.25 80-85 % and 90-93 %
  var INK_MIN = 2;             // (round 3) dark ink held at least this contrast against the frame under it (a far bird over dark land in the haze)
  var CLEAR_BAND = 60;         // (round 2) the judge's preference for a band wholly above or below the words, on a window WIDE or wider (a path's room counts up to ROOMY 60; world5 E0 Fix 2: 20, and a drag swept flights at the lettered name's height across it)
  var GLARE = [0.62, 0.95, 0.35, 0.5];   // the light wrap: the glare where the frame's light under a stroke runs from [0] to [1] (with the bloom about it); the pen thinned by [2] of it, the ink lifted toward the light by [3] (round 2: 0.4 and 0.85 lifted a bird on ABOVE's great disc 77-93 levels, to within 18 of the disc: all but gone; now 45-64, a pale, thinner mark)
  var NIGHT = [0.3, 3.2];      // light ink (the night's words): mixed this far toward the sky's own light at the bird, and held at least this contrast against it
  /* (physics) the owner's two open decisions (MODEL.md 0), as the lab left them: the rate (RATE_MODE 'scaled': the
     size-scaled physics rate of a bird of the world's span; 'real': the species' own), the flap-glide schedule
     (SCHED_MODE 'measured'; 'calm': the last round's glides on this beat; 'continuous': never gliding). Dev only:
     __world.birds({ rate, sched }), for the next flights */
  var RATE_MODE = 'class', SCHED_MODE = 'measured', WING_FROM = -30;   // (round 3, kinds: the owner's word 2026-11-04, the real order: labbird.js RATE_CLASS)
  var FX = { air: true, lit: true, glare: true, land: true, cloud: true, mask: true };   // (birds3d: mask, dev: the words' keep-off, off only for the lab's pins with the words hidden)   // the effects (development: each can be turned off)

  /* (round 3) the calm on the window, the words and the course's errors */
  var CALM_K = 0.45;           // the camera's turn asked to sweep the land across the window at most this share of the live's median pace there (HOST.calm: 0.72 deg/s on a 1440 px desktop, 0.9 on a phone; tried at 0.65: the sweep, a steady 18 px/s as the autopilot turns at the cap, raced or stalled the birds on the window) ...
  var CALM_EV = 2;             // ... and its way round a cloud's body at most this many times that
  var FACE_SIN = 0.2, DOWN_ON = true, DOWN_LAT = 1, DOWN_NMIN = 0.6;   // (round 3, alive) a body yawed under 12 deg off the view's axis has no side; a downwind crossing at least DOWN_LAT m/s past the yaw's need, no farther than DOWN_NMIN
  var BACK_PX = 6;             // px/s: through the trusted course no bird of a path moves against the way it faces on the window faster than this ...
  var PACE_SEEN = 1.2;         // ... nor faster across the window than the live's fastest crossing (topSpeed: 40 px/s at 1440, 26 on a phone) with the calm's sweep stretched this much (a window's edge) for more than PACE_T of it, nor ever 1.18 times that (round 3: 1.6 let the pace reach 57-60 px/s at the 98th percentile at 1440, the judges' bound 55; 1.4 tried: fewer paths refused through ABOVE's turns round a cloud's body (the view sweeping 25 px/s), at the bound's expense) ...
  var PACE_T = 1.2;            // s (and nor slower on the window than SLOW_SEEN px/s, hanging there, for more than this)
  var SLOW_SEEN = 9;           // px/s (the live's slowest 2 %: 10-11)
  var WTURN1 = 25;             // (shape) deg/s: ... nor over about a second (three of the course's samples, its own motion through one view: the judges' bar on 1 s chords)
  var WTURN = 30;              // ... nor does its way on the window turn faster than this (deg/s, over the course's 0.3 s samples; the live's own path: TURN_MAX 22)
  var CALM_SKIP = Infinity;    // (the course turning faster than this many times the calm's rate: the world's own hard turn, the calm on the window not judged there. Tried at 2.2: the planner flew paths through a cloud's way round and its birds raced across the window at up to 68 px/s (p98, DUNES s5 1440); off, a path through such a turn is not flown)
  var BAND_T = 3;              // s: two flights sharing a band longer than this of the trusted course: not this path (round 2: a moment of it)
  var ERR90 = [0, 0, 1, 0.1, 2, 0.4, 4, 1.6, 6, 3.5, 8, 5, 10, 6.5, 12, 9, 15, 13, 20, 20, 30, 30];   // (h s, deg) pairs: the course's yaw error at that horizon, its 90th percentile, a prior (predtest3, the calm on: DUNES s5 and ABOVE s7, their mean), learnt as the visit goes (errLearn)
  var PITCH90 = 0.6;           // deg: the course's pitch and roll error, a vertical slack (measured under 0.2 deg at 30 s; the roll of a turn the course missed)
  var GUARD_T = [0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6];   // s ahead: each flight checked through the camera's near course ...
  var GUARD_EVERY = 12;        // ... every this many steps (0.2 s), each flight on a step of its own
  var EASE_AT = 1.8;           // s: a flight that would come into the words' margin this far ahead or further is eased up or down ...
  var EASE_MAX = 15;           // deg: ... climbing or sinking at most this much more steeply (the live's own climbs: CLIMB 10-20) ...
  var EASEV_T = 1.5;           // s: ... the change of climb eased over this much of its flight
  var GONE_AHEAD = 2.2;        // s: one no ease keeps clear goes whole (GONE_T 1.2 s) this far ahead of the margin (world5 E0 Fix 2: 1.4, and the fade then ran on into the margin when the view's pitch swept the flight down faster than foreseen: ABOVE s7's skein at 255.7 s)
  var SB_HOLD = 0.3;           // s: a bird the words' margin has held (stepped back) this long: its whole flight goes (the drag's guard: the per-bird fade keeps the words clear meanwhile)
  var GBACK = 0.6;             // a flight whose birds would slide backward on the window this share of the next 2 s ...
  var WHEEL = 15;              // deg/s: ... wheels round toward the view's turn at this rate in the air ...
  var WHEEL_GAP = 10;          // s: ... at most once in this long
  var ACC_T = 2;               // s: a flight hanging or racing on the window changes its pace over this long ...
  var ACC_GAP = 3;             // s: ... at most once in this long
  /* (round 3) the camera waits for the birds: a flight the view's turn is carrying onto the words, which its own way
     keeps clear with the view held, has the turn held (HOST.calm at HOLD_K of the calm's rate; the engine eases its turn
     out at its calm slew, HOLD_SLEW deg/s/s) for HOLD_T s a request, renewed while its gap stays under HOLD_GAP px and
     the view's turn is the calm's own (not a cloud's way round, a solid's, nor the visitor's), HOLD_MAX s a flight in
     all. Before this the guard let a whole flight go (or eased it) at every turn the course had not foreseen: 10 of
     DUNES s5's 17 flights in 300 s faded together mid-sky, 30-60 px from the words */
  var HOLD_K = 0.04, HOLD_T = 3, HOLD_GAP = 50, HOLD_MAX = 16, HOLD_SLEW = 0.3, HOLD_REST = 6;
  var TRIAL_SLICE = 200;       // path points: a trial's work a step at most, a bird's place counted at its cost (50 places; round 2: up to the step's whole quota)
  var SPOT_COST = 3;           // a bird's place (spot: its slot, drift, wander, gusts, wings) costs about this many path points
  var FORCED = false;          // forced colours: the birds alone, in CanvasText at full ink, in their own still view (the world is not drawn)

  /* ---------------- the weather (=rand()): the engine's streams, never any other ---------------- */

  function sm32(a) {
    return function () {
      a = (a + 0x9e3779b9) | 0;
      var t = a ^ (a >>> 16);
      t = Math.imul(t, 0x21f0aaad);
      t = t ^ (t >>> 15);
      t = Math.imul(t, 0x735a2d97);
      return ((t ^ (t >>> 15)) >>> 0) / 4294967296;
    };
  }
  var visitSeed = 0, wr, front, fHand, fTempo, fBreeze, fPace, fTraffic, season, faithful, hand, pace, tempo;
  /* VISIT streams: 1 the hand's noise, 2 the paths' low-discrepancy offsets, 11 the weather, 100+ each flight */
  function vstream(n) { return sm32((visitSeed ^ Math.imul(n + 1, 0x9E3779B9)) >>> 0); }
  function facet() { return 0.7 * front + 0.3 * wr(); }
  var NOISE_N = 4096;
  var noise = new Float32Array(NOISE_N);
  /* the journey's weather: ONE front, five facets (a still visit is still everywhere), the season */
  function weather() {
    visitSeed = Math.floor(HOST.rng(0xB1D5)() * 4294967296) >>> 0;
    wr = vstream(11);
    front = (wr() + wr()) / 2;
    fHand = facet(); fTempo = facet(); fBreeze = facet(); fPace = facet(); fTraffic = facet();
    season = wr() < 0.65 ? 1 : -1;        // the way most flights go (1: left to right, the way the words read)
    faithful = 0.65 + 0.15 * wr();        // ... and how many of them
    hand = (HAND[0] + (HAND[1] - HAND[0]) * fHand) * JSCALE;   // px
    pace = mix(fPace, PACE[0], PACE[1]);
    tempo = mix(fTempo, TEMPO[0], TEMPO[1]);
    var r = vstream(1), i; for (i = 0; i < NOISE_N; i++) noise[i] = r() * 2 - 1;
  }
  function nz(i) { return noise[(i | 0) & (NOISE_N - 1)]; }
  /* a slow wave in [-1, 1]: two sines, the second 0.618 as fast, their phases from the table (never a jolt) */
  function wave(key, x) { return 0.6 * Math.sin(TAU * x + Math.PI * nz(key)) + 0.4 * Math.sin(TAU * 0.618 * x + Math.PI * nz(key + 1)); }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function mix(r, lo, hi) { return lo + (hi - lo) * r; }
  function ease(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function pick(r, a) { return mix(r(), a[0], a[1]); }
  function weighted(r, list) {
    var tot = 0, i, u;
    for (i = 0; i < list.length; i++) tot += list[i][1];
    u = r() * tot;
    for (i = 0; i < list.length; i++) { u -= list[i][1]; if (u < 0) return list[i][0]; }
    return list[list.length - 1][0];
  }
  function angDiff(a, b) { var d = a - b; d -= Math.floor((d + Math.PI) / TAU) * TAU; return d; }

  /* ---------------- the page: the window and the words (the engine's measure of them) ---------------- */

  var W = 0, H = 0, words = [], dirty = true, wordsY = 0, stackB = 0, stackT = 0, view = 1, VW = {};
  var MPU = 0.13;              // m an air unit (px at nearness 1): B_SPAN over a mid bird's span in air units
  function measure() {
    HOST.view(VW);
    W = VW.cssW; H = VW.cssH;
    view = clamp(Math.pow(Math.min(W, 1.6 * H) / 1100, 0.4), 0.72, 1.12);   // a small window shows its birds a little smaller
    MPU = B_SPAN / (SPAN * view);
    words = [];
    var w = HOST.words(), b = w.boxes, k = 1 / (VW.bdpr || VW.dpr || 1), l = Infinity, t = Infinity, r = -Infinity, bo = -Infinity, i;
    for (i = 0; i < 3; i++) if (b[i * 4 + 2] > b[i * 4]) { l = Math.min(l, b[i * 4] * k); t = Math.min(t, b[i * 4 + 1] * k); r = Math.max(r, b[i * 4 + 2] * k); bo = Math.max(bo, b[i * 4 + 3] * k); }
    if (r > l) { keep({ left: l, top: t, right: r, bottom: bo }, WORDS); wordsY = (t + bo) / 2; stackB = bo; stackT = t; }   // (the name, bio and credit: the live .stack)
    else { wordsY = H / 2; stackB = stackT = 0; }
    for (i = 3; i < 5; i++) keep({ left: b[i * 4] * k, top: b[i * 4 + 1] * k, right: b[i * 4 + 2] * k, bottom: b[i * 4 + 3] * k }, LINKS);
    dirty = false;
  }
  /* the window or the words changed since they were measured (no garbage a step: numbers compared in place) */
  var WK = new Float64Array(22);
  function changed() {
    HOST.view(VW);
    var b = HOST.words().boxes, ch = WK[20] !== VW.cssW || WK[21] !== VW.cssH, i, v;
    for (i = 0; i < 20; i++) { v = Math.round(b[i]); if (WK[i] !== v) { WK[i] = v; ch = true; } }
    WK[20] = VW.cssW; WK[21] = VW.cssH;
    return ch;
  }
  function keep(r, m) { if (r.right > r.left && r.bottom > r.top) words.push({ l: r.left, t: r.top, r: r.right, b: r.bottom, m: m }); }

  function across(A) { return clamp(A[0] + (W - 390) * (A[1] - A[0]) / 1050, A[0], A[1]); }
  function topSpeed() { return Math.min(SPEED[1], W / across(CROSS)); }
  /* the page's calm: a bird's wild pace (px/s) times this */
  function calmOf() { return W / across(CALM) / (SPAN * view * REF); }
  /* a speed eased under a ceiling: as it is below KNEE of it, and ever closer to it above */
  function soft(v, top) { var k = KNEE * top; return v <= k ? v : k + (top - k) * (1 - Math.exp(-(v - k) / (top - k))); }
  function maxFlights() { var LCm = LIFE[skyCls()]; return (W >= WIDE ? FLIGHTS[1] : FLIGHTS[0]) - (LCm ? LCm.fewer : 0) - (placeSeen ? 1 : 0) - (STG.inView && !(STG.cur && STG.cur.place) ? 1 : 0); }   // (birds3d: and one fewer while a stage is in view)   // (one fewer while a place's thermal is seen)

  /* the ink box (x ± hw, y ± hh) keeps its margin from every word box
     (a flight already flying, when the page moves, half of it) */
  var held = 1;
  function clearOfWords(x, y, hw, hh) {
    for (var i = 0, o, m; i < words.length; i++) {
      o = words[i]; m = o.m * held;
      if (x + hw > o.l - m && x - hw < o.r + m && y + hh > o.t - m && y - hh < o.b + m) return false;
    }
    return true;
  }
  /* edges: 1 left, 2 right, 4 top, 8 bottom — the ones a flight crosses */
  function inView(x, y, hw, hh) { return x + hw > 0 && x - hw < W && y + hh > 0 && y - hh < H; }
  function withinEdges(x, y, hw, hh, e) {
    return (e & 1 || x - hw >= EDGE) && (e & 2 || x + hw <= W - EDGE) &&
           (e & 4 || y - hh >= EDGE) && (e & 8 || y + hh <= H - EDGE);
  }
  /* open sky round the ink box: to the nearest word box, and to the edges the flight does not cross */
  function room(x, y, hw, hh, e) {
    var g = ROOMY, i, o, dx, dy;
    for (i = 0; i < words.length; i++) {
      o = words[i];
      dx = Math.max(o.l - x - hw, x - hw - o.r, 0);
      dy = Math.max(o.t - y - hh, y - hh - o.b, 0);
      g = Math.min(g, Math.sqrt(dx * dx + dy * dy));
    }
    if (!(e & 1)) g = Math.min(g, x - hw);
    if (!(e & 2)) g = Math.min(g, W - x - hw);
    if (!(e & 4)) g = Math.min(g, y - hh);
    if (!(e & 8)) g = Math.min(g, H - y - hh);
    return g;
  }

  /* the heights a level crossing can hold its centre at, the flight
     reaching lo above it and hi below it: the window's height less EDGE,
     less every word box's height (grown by its margin) and every other
     flight's band, as a list of [from, to] intervals */
  function openBands(lo, hi) {
    var out = [[EDGE + lo, H - EDGE - hi]], i, j, o, a, b, next, cut = words.map(function (o) { return [o.t - o.m - BANDSLACK, o.b + o.m + BANDSLACK]; });   // (round 3: and the course's slack up and down)
    for (i = 0; i < flights.length; i++) if (!flights[i].away) cut.push([flights[i].yLo - BAND_GAP, flights[i].yHi + BAND_GAP]);   // one flight to a band (round 3: but one the view has turned from)
    for (i = 0; i < cut.length; i++) {
      o = cut[i]; a = o[0] - hi; b = o[1] + lo;           // a centre in (a, b) puts the flight on the words' line, or in another's band
      next = [];
      for (j = 0; j < out.length; j++) {
        if (out[j][1] <= a || out[j][0] >= b) next.push(out[j]);
        else {
          if (out[j][0] < a) next.push([out[j][0], a]);
          if (out[j][1] > b) next.push([b, out[j][1]]);
        }
      }
      out = next;
    }
    return out.filter(function (v) { return v[1] > v[0]; });
  }
  /* how much of the window's height is open for a level crossing */
  function openSky() { return openBands(12, 12).reduce(function (a, b) { return a + b[1] - b[0]; }, 0); }
  /* the words stand between two flights wherever the two share heights (on
     a phone turned sideways, one flight each side of them): no train */
  function between(A, B) {
    var lo = Math.max(A.yLo, B.yLo, 0), hi = Math.min(A.yHi, B.yHi, H), i, o;
    if (A.xLo > B.xLo) { o = A; A = B; B = o; }
    for (i = 0; i < words.length; i++) {
      o = words[i];
      if (o.l >= A.xHi && o.r <= B.xLo && o.t - o.m - BAND_GAP <= lo && o.b + o.m + BAND_GAP >= hi) return true;
    }
    return false;
  }
  /* a height in those bands, u of the way through their total length */
  function inBands(B, u) {
    var tot = 0, i;
    for (i = 0; i < B.length; i++) tot += B[i][1] - B[i][0];
    u *= tot;
    for (i = 0; i < B.length; i++) { if (u <= B[i][1] - B[i][0]) return B[i][0] + u; u -= B[i][1] - B[i][0]; }
    return null;
  }

  /* ---------------- the camera: the world's, as the planner sees it ---------------- */

  /* the air in front of the camera, in a flight's own frame: x to the right, y up from the eye's level, z out along the
     ground, in px at nearness 1 (air units; MPU m each). Each flight's frame keeps the camera's place (it travels with
     it: no flight ever looms as the camera flies on) but its own heading, fixed in the world when it is planned (round
     2: so a turn of the view sweeps the birds across the window with the land, at f x the turn). The planner sees two
     things through the world's own camera (its field of view): the still view, the camera as it will be when the
     flight sets off, held still (the live site's own window: the birds' calm, their pace and turns against the world,
     are judged in it), and the coming view, the camera as it is predicted to turn, pitch and roll over the flight
     (HOST.ahead: the autopilot's own course; a drag is not foreseen): where every bird is seen, so it keeps clear of the
     words, of the edges and of the other flights there */
  var cam = { f: 1, c: 1, s: 0, x0: 0, y0: 0, hy: 0 }, floorY = 0;
  var FLOOR_T = 12;            // m: no flight lower than this over the ground under it (round 2: the ground under the path, not the camera's: flights cross low in front of the dunes)
  var OPEN_SKY = 1;            // the share of the window's height open to a level crossing, against the live's (scales the gaps and the retries) ...
  var OPEN_MIN = 0.75;         // ... never under this (round 3: round 2's 0.45 filled DUNES's half-empty sky; its flights now keep their sky, and at 0.45 it held half again the live's birds)
  function camera(pitch) {
    var C = HOST.cameraStep(), th;
    HOST.view(VW);
    cam.f = (W / 2) / Math.max(VW.tanX, 1e-3);
    if (pitch === undefined || pitch !== pitch) {
      if (C && !FORCED) pitch = C.pitch;
      else {   // (no world camera: the live site's, the horizon low under the open sky)
        var hy = clamp(Math.max(H * 0.8, stackB + WORDS + 60), H * 0.8, H * 0.95);
        pitch = Math.atan((hy - H / 2) / cam.f);
      }
    }
    th = clamp(pitch, -1.2, 1.2);
    cam.c = Math.cos(th); cam.s = Math.sin(th); cam.x0 = W / 2; cam.y0 = H / 2;
    cam.hy = cam.y0 + cam.f * Math.tan(th);
    /* no flight lower than FLOOR_T over the camera's ground (and the ground under each path, checked as it is planned) */
    HOST.flight(FL);
    floorY = FL.ok && C && !FORCED ? Math.min(0, -(C.pos[1] - FL.ground - FLOOR_T) / MPU) : -1e6;
    var ob = openBands(12, 12), tot = 0, i;
    for (i = 0; i < ob.length; i++) tot += ob[i][1] - ob[i][0];
    OPEN_SKY = clamp(tot / Math.max(1, 0.62 * H), OPEN_MIN, 1);
  }

  /* ---------------- the coming view ---------------- */

  /* the camera's predicted course from the job's start (VP.t0), a sample each STEP: the view's yaw, pitch and roll and
     the camera's place (for the clouds and the ground ahead of a path); worked out in chunks as a trial needs them */
  var VP_N = 320, VP_CHUNK = 24, AHEAD_COST = 4;   // samples at most (96 s); a chunk; the cost of a sample, in bird-steps
  var VP = { yaw: new Float64Array(VP_N), pitch: new Float64Array(VP_N), roll: new Float64Array(VP_N), x: new Float64Array(VP_N), y: new Float64Array(VP_N), z: new Float64Array(VP_N),
             n: 0, t0: 0, step: 0.3, still: true, yaw0: 0, pitch0: 0, end: 1e9 };
  var T_TRUST = 12;            // s from a job's start: the course is trusted this far (the autopilot's aim and weave); past it, a new aim, a place flown round or the visitor may turn the view anywhere, and the trial holds a path only to the words' and the edges' half margins and to nothing else
  /* (world5 E1 Fix 3) the engine may say how far its course can be trusted (HOST.courseTrust, s): the world now holds
     its heading left alone (design-v5 Revision 3), so its forecast is the flight until the visitor drags, and the
     planner flies each trial as far as the flight will be seen there (a straight flight went on into clouds' bodies
     the 22-s trial never saw: DUNES s13's sky 19.5% empty with a 30-s spell, ABOVE s7's first 23 s, up to 9 flights
     a run faded into cloud; verify-regress-2). Without it, T_TRUST */
  function trustT() { return HOST.courseTrust ? HOST.courseTrust() : T_TRUST; }
  /* a new course: from the flight as it is now; a still one (reduced motion, forced colours, no world camera) holds the
     view where it is */
  function viewPredict(still) {
    var C = HOST.cameraStep();
    HOST.flight(FL);
    VP.t0 = t; VP.step = STEP; VP.n = 0; VP.end = 1e9;
    VP.still = !!still || FORCED || !C || !FL.ok || !HOST.ahead;
    VP.yaw0 = C && !FORCED ? FL.view : 0; VP.pitch0 = C && !FORCED ? C.pitch : NaN;
    if (!VP.still) { HOST.ahead(true, VP_CHUNK, STEP, VP); work += VP.n * AHEAD_COST; if (VP.n < 1) VP.still = true; }
    VP.t0 = t;   // (round 3, step 1: the forecast's own stamp is the world's clock (SIM.t), not the birds': it starts at the dissolve's end, and every trial began that much late)
    if (VP.still) { VP.yaw[0] = VP.yaw0; VP.pitch[0] = VP.pitch0; VP.roll[0] = 0; if (C) { VP.x[0] = C.pos[0]; VP.y[0] = C.pos[1]; VP.z[0] = C.pos[2]; } VP.n = 1; }
  }
  /* the course out to sample k (more chunks as needed) */
  function viewNeed(k) {
    if (VP.still) return;
    while (VP.n <= k && VP.n < VP_N) {
      var n0 = VP.n, t00 = VP.t0; HOST.ahead(false, Math.min(VP_CHUNK, VP_N - VP.n), STEP, VP);
      if (VP.t0 !== t00) VP.t0 = t;   // (round 3, step 1: a forecast the world restarted from now (a new realm) is stamped on the birds' clock too)
      work += (VP.n - n0) * AHEAD_COST;
      if (VP.n === n0) break;
    }
  }
  /* the view for a flight at sample k: its frame's heading against the camera's yaw, the camera's pitch and roll */
  var PV = { cd: 1, sd: 0, ct: 1, st: 0, cr: 1, sr: 0, k: -1 };
  function viewAtK(F, k) {
    var i = VP.still ? 0 : Math.min(Math.max(k, 0), VP.n - 1), d = angDiff(VP.yaw[i], F.yaw), p = VP.pitch[i];
    if (p !== p) p = Math.atan2(cam.s, cam.c);
    PV.cd = Math.cos(d); PV.sd = Math.sin(d); PV.ct = Math.cos(p); PV.st = Math.sin(p);
    PV.cr = Math.cos(VP.roll[i]); PV.sr = Math.sin(VP.roll[i]); PV.k = k;
  }
  /* an air point (x, y, z) of that flight through that view: on the window (CSS px) and its nearness */
  function projV(x, y, z, o) {
    var xc0 = x * PV.cd + z * PV.sd, yc0 = x * PV.st * PV.sd + y * PV.ct - z * PV.st * PV.cd, zc = -x * PV.ct * PV.sd + y * PV.st + z * PV.ct * PV.cd;
    if (!(zc > 1e-6)) { o.x = o.y = NaN; o.n = 0; return o; }
    var xc = xc0 * PV.cr + yc0 * PV.sr, yc = yc0 * PV.cr - xc0 * PV.sr;
    o.n = cam.f / zc; o.x = cam.x0 + xc * o.n; o.y = cam.y0 - yc * o.n;
    return o;
  }
  /* the predicted window speed of the land straight ahead at the job's start, px/s (+ rightward: the view turning left) */
  function sweepAhead(T) {
    if (VP.still) return 0;
    var k = Math.max(1, Math.min(Math.round(T / STEP), VP_N - 1)); viewNeed(k); k = Math.min(k, VP.n - 1);
    return k > 0 ? cam.f * angDiff(VP.yaw[k], VP.yaw[0]) / (k * STEP) : 0;
  }
  /* where an air point of a flight is in the world at sample k of the course (the camera's predicted place + the frame) */
  function airWorldK(F, ax, ay, az, k, o) {
    var i = VP.still ? 0 : Math.min(Math.max(k, 0), VP.n - 1), c = Math.cos(F.yaw), s = Math.sin(F.yaw);
    o.x = VP.x[i] + MPU * (-c * ax + s * az); o.y = VP.y[i] + MPU * ay; o.z = VP.z[i] + MPU * (s * ax + c * az);
    o.cx = VP.x[i]; o.cy = VP.y[i]; o.cz = VP.z[i];
    return o;
  }

  /* ---------------- (round 3) the course's own error, and the words' slack ---------------- */

  /* a running 90th percentile of the course's yaw error (deg) by horizon (1 s buckets to 30 s): started from ERR90,
     moved as the visit goes (ten times a second, while the planner's course reaches the present: its yaw against the
     camera's own). A path is held clear of the words by their margin widened by what the course may have wrong there:
     across, f x tan of that error (the view's turn moves a flight sideways); up and down, PITCH90 (the pitch is all but
     exact) */
  var EB = new Float64Array(31), ERR_ETA = 0.1;
  function errInit() {
    for (var b = 0, j; b <= 30; b++) {
      for (j = 2; j < ERR90.length - 2 && ERR90[j] < b; j += 2);
      var h0 = ERR90[j - 2], h1 = ERR90[j], e0 = ERR90[j - 1], e1 = ERR90[j + 1];
      EB[b] = h1 > h0 ? e0 + (e1 - e0) * clamp((b - h0) / (h1 - h0), 0, 1) : e1;
    }
  }
  function errAt(h) { var b = clamp(h, 0, 30), i = Math.floor(b); return i >= 30 ? EB[30] : EB[i] + (EB[i + 1] - EB[i]) * (b - i); }
  function errLearn() {
    if (VP.still || VP.n < 2) return;
    var h = t - VP.t0, k = Math.round(h / STEP), b = Math.round(h), e;
    if (k < 1 || k >= VP.n || b < 1 || b > 30 || h > VP.end) return;
    e = Math.abs(angDiff(FL.view, VP.yaw[k])) / DEG;
    EB[b] = Math.max(0.05, EB[b] + (e > EB[b] ? 0.9 : -0.1) * ERR_ETA);
  }
  function slackX(h) { return cam.f * Math.tan(Math.min(errAt(h), 40) * DEG); }
  function slackY() { return cam.f * Math.tan(PITCH90 * DEG); }
  var BANDSLACK = 0;           // px: the open bands kept that much further from the words (the course's slack up and down: set as a path is proposed)
  /* the ink box keeps its margin from every word box, widened by sx across and sy up and down */
  function clearOfWordsS(x, y, hw, hh, sx, sy) {
    for (var i = 0, o, m; i < words.length; i++) {
      o = words[i]; m = o.m * held;
      if (x + hw > o.l - m - sx && x - hw < o.r + m + sx && y + hh > o.t - m - sy && y - hh < o.b + m + sy) return false;
    }
    return true;
  }
  /* a point in the air on the window (x, y) and its nearness n (px on the window a unit in the air) */
  function proj(x, y, z, o) {
    var yc = y * cam.c - z * cam.s, zc = y * cam.s + z * cam.c;
    o.n = cam.f / zc; o.x = cam.x0 + x * o.n; o.y = cam.y0 - yc * o.n;
    return o;
  }
  /* the point in the air seen at (sx, sy) on the window, at nearness n */
  function unproj(sx, sy, n, o) {
    var zc = cam.f / n, yc = (cam.y0 - sy) / n;
    o.x = (sx - cam.x0) / n; o.y = yc * cam.c + zc * cam.s; o.z = zc * cam.c - yc * cam.s;
    return o;
  }
  /* the air between: a bird far off fades out of sight, and back into it */
  function fadeOf(n) { return n >= FADE ? 1 : n <= FAR ? 0 : ease((n - FAR) / (FADE - FAR)); }

  /* ---------------- the drawing: every bird afresh, in the tattoo's hand ---------------- */

  /* one bird: an M in its own frame (u along its line, back to front; v
     toward its wrists), kept as each vertex's distance along the line from
     the back end to the front end and across it, and the lean that stands
     it on its diagonal */
  function drawBird(r, S) {
    var tail = r() < S.tail, M = [0, 0], u = 0, v = 0, i, d1 = pick(r, S.down), d2 = pick(r, S.down) - pick(r, [2, 10]),
        ex, ey, L, B;
    function go(len, a) { u += len * Math.cos(a * DEG); v += len * Math.sin(a * DEG); M.push(u, v); }
    if (tail) go(pick(r, TAIL), pick(r, TAIL_UP));        // the back wing drawn out long: a tail ...
    else go(pick(r, S.rise), pick(r, S.up));              // ... or the rise to the first wrist
    go(pick(r, S.drop), -d1);                             // down to the body
    go(pick(r, S.rise), pick(r, S.up));                   // up to the front wrist
    go(pick(r, S.out), -d2);                              // and out in front
    ex = M[8]; ey = M[9]; L = Math.sqrt(ex * ex + ey * ey);
    B = { s: [], h: [], ux: ex / L, uy: ey / L, tail: tail };
    for (i = 0; i < 10; i += 2) { B.s.push(M[i] * B.ux + M[i + 1] * B.uy); B.h.push(M[i + 1] * B.ux - M[i] * B.uy); }
    L = ((d1 + d2) / 2 + pick(r, LEAN)) * DEG;           // steps: the drops lie about flat
    B.c = Math.cos(L); B.sn = Math.sin(L);
    return B;
  }
  /* the bird in a pose, into out[10] (x, y down): k sets the wrists (1 up,
     as drawn; 0 on the bird's line; below 0 down past it); shut folds the
     wings (a bounding finch between its bursts); bank drops the back wrist
     and lifts the front one by that share (a bird banking into a turn) */
  function shape(B, k, shut, out, bank) {
    var i, su, hv, pu, pv, kk;
    for (i = 0; i < 5; i++) {
      kk = i === 1 || i === 3 ? k * (1 + (i === 1 ? -bank : bank)) : 1;
      if (B.tail && i === 1) kk = 0.5 + 0.5 * kk;         // (a tail swings half as far)
      su = B.s[i] * (shut ? 0.78 : 1);
      hv = B.h[i] * kk * (shut ? 0.25 : 1);
      pu = su * B.ux - hv * B.uy; pv = su * B.uy + hv * B.ux;
      out[2 * i] = pu * B.c - pv * B.sn;                 // stood on its diagonal, rising to the right
      out[2 * i + 1] = -(pu * B.sn + pv * B.c);
    }
    return out;
  }
  var SH = new Float64Array(10);
  /* a bird at a size (its span in the air): its box over every pose it
     takes (centred on gx, gy, glyph units), at nearness 1 */
  function measureBird(B, span) {
    var x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, sc, i, k, b, gw, gh, poses = [WRIST[0], 0.15, 2];
    shape(B, 1, false, SH, 0);
    for (i = 0; i < 10; i += 2) { x0 = Math.min(x0, SH[i]); x1 = Math.max(x1, SH[i]); }
    sc = span / (x1 - x0);
    x0 = y0 = Infinity; x1 = y1 = -Infinity;
    for (k = 0; k < poses.length; k++) for (b = -1; b <= 1; b++) {   // (the wrists at their highest and lowest, and shut; banked either way)
      shape(B, poses[k] === 2 ? 0.15 : poses[k], poses[k] === 2, SH, b * BANK);
      for (i = 0; i < 10; i += 2) {
        x0 = Math.min(x0, SH[i]); x1 = Math.max(x1, SH[i]);
        y0 = Math.min(y0, SH[i + 1]); y1 = Math.max(y1, SH[i + 1]);
      }
    }
    gw = (x1 - x0) * sc; gh = (y1 - y0) * sc;
    return { B: B, sc: sc, gx: (x0 + x1) / 2, gy: (y0 + y1) / 2, span: span, gw: gw, gh: gh,
             hw: gw / 2 + LINE[1] / 2 + 0.5, hh: gh / 2 + LINE[1] / 2 + 0.5 };
  }

  /* ---------------- the birds (twelve, lent to flights) ---------------- */

  /* a slot holds a bird's drawing between the hand's frames: its 3D chain about its body (m, in the world's axes), its
     bob, the boil's offsets (device px), its pen (device px), its ink and how much cloud stands before it */
  var slots = [];
  (function () { for (var i = 0; i < MAXP; i++) slots.push({ key: 9100 + i * 97, busy: false, on: false, face: 1, sgn: 1, d: null, shownT: -1, vis: false, still: false, op: 1, wf: 0, land: 1, n: 1, ok: false, lastOp: 0, lastApp: 0, lastSB: 1, sbS: 1, sbT: -1,
    kind: 'gull', P16: new Float64Array(48), X16: new Float64Array(48), D: new Float32Array(32), body: new Float64Array(3), nb: new Float64Array(3), fw: new Float64Array(3), lw3: new Float64Array(3), vw: new Float64Array(3), aw: new Float64Array(3),
    roll: 0, rollT: 0, rollOk: false, pitch: 0, slip: 0, E: new Float64Array(3), eOk: false, fold: new Float64Array(6), hold: 1, holdOk: false, holding: false, cw: new Float64Array(3), cwH: new Float64Array(3), cwHt: new Float64Array(3).fill(-1e9), cwNow: new Float64Array(3), cwNext: -1, cwAt: -1e9, spanPx: 0, floorPx: 1, filt: 1, halo: 0, haloE: 3, legib: 0 }); })();
  function freeSlots() { var n = 0, b = 0, i; for (i = 0; i < slots.length; i++) if (!slots[i].busy) n++; else b++; return Math.max(0, Math.min(n, DRAW_MAX - b)); }
  function dress(s, d) { s.d = d; s.on = false; s.vis = false; s.still = false; s.shownT = -1; s.ok = false; s.sbS = 1; s.sbT = -1; s.rollOk = false; s.eOk = false; s.holdOk = false; s.holding = false; s.hold = 1; s.cwNext = -1; s.cwAt = -1e9; s.cwHt.fill(-1e9); s.spanPx = 0; s.glideW = undefined; s.setOk = false; s.setFace = 0; s.setSide = 0; s.set = 0; s.setWant = 0; s.setAt = undefined; s.setK = undefined; s.nudX = 0; s.nudY = 0; s.sbH = undefined; s.sbHT = -1e9; s.lastOp = 0; s.tone = 0; }
  function hide(s) { s.on = false; }

  /* ---------------- the paths: in the air, straight or wheeling ---------------- */

  /* A path: through the point (x, y, z) at s = 0, heading h (radians in
     the level: 0 along x, to the right; + away from the window), then from
     s1 to s2 wheeling at k radians a unit, and on straight; climbing at
     gradient g all the way. s is along the ground, in units of the air */
  var work = 0;                                           // path points worked out: the planner's cost
  var wp = {}, pp = {}, IO = {};
  function prepare(P) {
    P.c1 = Math.cos(P.h); P.n1 = Math.sin(P.h);
    P.h2 = P.h + P.k * (P.s2 - P.s1); P.c2 = Math.cos(P.h2); P.n2 = Math.sin(P.h2);
    if (P.k) { P.ex = (P.n2 - P.n1) / P.k; P.ez = (P.c1 - P.c2) / P.k; }
    else { P.ex = (P.s2 - P.s1) * P.c1; P.ez = (P.s2 - P.s1) * P.n1; }
    P.i0x = 0; P.i0z = 0;
    integ(P, 0, IO); P.i0x = IO.ix; P.i0z = IO.iz;
  }
  /* the way the path runs, summed from s1 to a */
  function integ(P, a, o) {
    var d;
    if (a <= P.s1) { d = a - P.s1; o.ix = d * P.c1; o.iz = d * P.n1; }
    else if (a <= P.s2) { d = P.h + P.k * (a - P.s1); o.ix = (Math.sin(d) - P.n1) / P.k; o.iz = (P.c1 - Math.cos(d)) / P.k; }
    else { d = a - P.s2; o.ix = P.ex + d * P.c2; o.iz = P.ez + d * P.n2; }
    return o;
  }
  /* the point s along a flight's path, and its heading there */
  function path3(F, s, o) {
    var P = F.path;
    work++;
    if (P.sp && s > P.sp[0].s) return path3sp(P, s, o);   // (round 3: steered in flight, from its first splice on)
    if (P.tab) return path3tab(P, s, o);                  // (birds3d: a ribbon's weave, sampled)
    integ(P, s, IO);
    o.x = P.x + IO.ix - P.i0x; o.z = P.z + IO.iz - P.i0z; o.y = P.y + P.g * s;
    o.h = s <= P.s1 ? P.h : s >= P.s2 ? P.h2 : P.h + P.k * (s - P.s1);
    return o;
  }
  /* how far the heading at s is off the window's plane, degrees */
  function offPlane(F, s) {
    var P = F.path, h = P.h + P.k * (clamp(s, P.s1, P.s2) - P.s1), a = F.dir > 0 ? h : Math.PI - h;
    return Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) / DEG;
  }
  /* from the path's point in the window out along it (sg: +1 ahead, -1
     back) until its leader is OUT beyond the window, gone into the distance
     or below the window's sill: how far that is; null if it would pass
     behind the eye or come too near in view */
  /* (walk: the module's, i5_plan.js) */
  /* the edge a path's end is beyond (0: gone into the distance) */
  function endEdge(F, s) {
    path3(F, s, wp); proj(wp.x, wp.y, wp.z, pp);
    return pp.n < farOf(F) ? 0 : side(pp.x, pp.y) | (wp.y <= 0 && pp.y > H ? 8 : 0);
  }
  function side(x, y) {
    return (x <= -OUT + 1 ? 1 : 0) | (x >= W + OUT - 1 ? 2 : 0) | (y <= -OUT + 1 ? 4 : 0) | (y >= H + OUT - 1 ? 8 : 0);
  }
  /* a path through (qx, qy) that runs across the window at angle a (x the
     flight's way, y down), its nearness changing by dn of itself a px:
     the heading and the climb in the air that are seen so */
  function pathAcross(F, qx, qy, a, dn, turn) {
    var e = 8, X, Y, Z, dx, dy, dz, L;
    unproj(qx, qy, F.n0, wp); X = wp.x; Y = wp.y; Z = wp.z;
    unproj(qx + F.dir * Math.cos(a) * e, qy + Math.sin(a) * e, F.n0 * (1 + dn * e), wp);
    dx = wp.x - X; dy = wp.y - Y; dz = wp.z - Z; L = Math.sqrt(dx * dx + dz * dz);
    if (Math.abs(Math.atan2(dy, L)) > 45 * DEG) return false;   // no bird climbs or dives so steeply for long
    return pathThrough(F, qx, qy, Math.atan2(dz, dx * F.dir), turn, Math.atan2(dy, L));
  }
  /* a path through the window point (qx, qy) at the flight's nearness,
     heading hd off the window's plane (+ away), wheeling through `turn`
     radians in a few seconds somewhere near there, climbing at `climb` */
  function pathThrough(F, qx, qy, hd, turn, climb) {
    var P = F.path = {}, sIn, sOut, L, c;
    unproj(qx, qy, F.n0, wp);
    P.x = wp.x; P.y = wp.y; P.z = wp.z;
    P.h = F.dir > 0 ? hd : Math.PI - hd;
    P.k = 0; P.s1 = P.s2 = 0;
    if (turn) {
      L = F.vw * pick(F.r, TURN_T);                       // the turn's length on the path, at the flight's own pace
      c = mix(F.r(), -0.35, 0.35) * W / F.n0;             // centred somewhere near the middle of the crossing
      P.s1 = c - L / 2; P.s2 = c + L / 2; P.k = F.dir * turn / L;
      P.h -= P.k * (Math.max(0, Math.min(0, P.s2) - P.s1));   // (so the flight heads hd where it passes the point: its heading there is the one drawn)
    }
    P.g = Math.tan(climb);
    prepare(P);
    if (turn && offPlane(F, -1e5) > HEAD_MAX || turn && offPlane(F, 1e5) > HEAD_MAX) return false;   // it never turns back across the window
    sOut = walk(F, 1); if (sOut === null) return false;
    sIn = walk(F, -1); if (sIn === null) return false;
    F.sa = sIn; F.len = sOut - sIn;
    F.edges = endEdge(F, sIn) | endEdge(F, sOut);
    return true;
  }

  /* ---------------- the wings ---------------- */

  /* (physics) A BIRD'S DAY ON THE WING IS THE LAB'S (birdwing.js on labbird.js): its bouts of beats and its glides
     drawn from the measured schedules (gull: bouts of about 30 beats and glides of about 15 beat-lengths, fitted to the
     CC0 lesser black-backed gull tags; stork 6 and 50, the CC0 white stork tags; ibis 13.6 and 3.2, in a V 97 %
     flapping; by the owner's word (2026-11-03) geese, herons, swans, crows and swallows glide between long bouts too,
     their numbers chosen (birdwing.js OWNER_GLIDES), the swallow's measured upstroke pauses kept within its bouts),
     its beat's period, its stroke and each bout's rate varying as measured, its rate spread within its flight. The
     bouts (in s of the flight's clock) are what the path reads: a flap-glider sinks a little through each glide and
     climbs back through the next bout, a bounding finch rises through its beats and falls through the bound, as
     before; the beat itself is posed from the wing's state (poseBird). BOUT_AHEAD: how far on a bout's end or the
     next one's start is looked for */
  var BSt = { flap: 0, ph: 0, k: 1, D: 0, a: 0, e: 0, beat: -1, pause: 0, tuck: 0, psi: 0, lock: 0 }, BA = { k: -1, a: 0, b: 0, pe: 0, n: 0 }, BOUT_AHEAD = 240;
  /* where a bird is in its wing-beat at time t: its phase in [0, 1) (0 the top of the stroke) while in a bout, -1
     while it glides, -2 while a bounding bird falls with its wings shut */
  function beat(m, t) {
    var w = m.w;
    if (!w || !w.wing) return -1;
    var S = BW.state(w.wing, t, BSt);
    return S.flap ? S.ph : w.bound ? -2 : -1;
  }
  /* how far a bird is carried below its path by its wings (units of the air). A flap-glider sinks through each glide
     and climbs back through the next bout: its sink (in units of its reach, amp) eases toward 1 while it glides and
     toward 0 while it flaps, critically damped (SINK_W: 95 % of the way in 3 s, as the shape round's glide reached its
     depth in 3 s; its height and its rate of climb continuous at every change), worked out from its past bouts alone
     (the shape round's rule read the glide's whole length ahead, which a measured schedule only knows by integrating
     the bird's day up to 200 s on). A bounding finch rises through its beats and falls through the bound, as before
     (its bouts a beat or two: looked for at most 10 s on) */
  var SINK_W = 1.25;
  /* (life fix, L9) the glide's sink through the air: judge-bio1 found every glide flown level on a powered path. Now a
     bird sinks through each glide at GS_RATE m/s (6.1 deg at 13 m/s through the air) eased in over 1 / GS_K s, the
     rate falling off toward GS_MAX below its path (a long glide riding the evening's air: the sink 4.5-5.5 deg over a
     3-5 s glide, Pennycuick 2008, the gull and jackdaw fits in research-flight/NOTES.md), and climbs back through the
     next bout (critically damped, GS_W: 95 % in 10 s, about 1.5 deg of climb), its height and rate continuous; worked out
     from its past bouts alone, a pure function of the flight's time, as before */
  var GS_RATE = 1.4, GS_MAX = 12, GS_K = 1, GS_W = 0.3, GS_AMP = 0.3;   // (round 3, step 1: GS_K 3 -> 1, GS_W 0.45 -> 0.3: a glide's onset and its end bent a calm crossing's line on the window over TURN_MAX, and the planner refused every flight that would glide in view)
  function sinkSeg(w) {
    var g = w.wing, K = w.sk;
    if (!K) K = w.sk = { q: 0, half: 0, T: [g.from - g.dt], Y: [0], V: [0], G: [g.inB0 ? 0 : 1], gsr: w.gsr || 0 };
    return K;
  }
  function sinkEval(K, k, t, o) {   // (fix) segment k from its start at t: gliding, the sink; flapping, the climb back (units of the air below the path)
    var y0 = K.Y[k], v0 = K.V[k], tt = t - K.T[k];
    if (K.G[k] === 1) { var D = GS_MAX / MPU, A = (K.gsr > 0 ? K.gsr : GS_RATE) / GS_MAX, e1 = Math.exp(-A * tt), e2 = Math.exp(-GS_K * tt), c = v0 - A * (D - y0); o[0] = D - (D - y0) * e1 + c * (1 - e2) / GS_K; o[1] = A * (D - y0) * e1 + c * e2; return o; }
    var c2 = v0 + GS_W * y0, e = Math.exp(-GS_W * tt);
    o[0] = (y0 + c2 * tt) * e; o[1] = (v0 - GS_W * c2 * tt) * e; return o;
  }
  var SKO = [0, 0];
  function sinkAt(w, t) {
    var g = w.wing, B = BW.boutsTo(g, t), K = sinkSeg(w), n;
    for (;;) {   // the changes not yet taken in: each bout's start (to 0), then its end (to 1), once it has one
      var q = K.q; if (q >= B.length) break;
      var ts, gt;
      if (K.half === 0) { ts = B[q] < 0 ? g.from - g.dt : g.from + B[q] * g.dt; gt = 0; }
      else { if (B[q + 1] < 0) break; ts = g.from + B[q + 1] * g.dt; gt = 1; }
      n = K.T.length - 1;
      if (ts > K.T[n]) { sinkEval(K, n, ts, SKO); K.T.push(ts); K.Y.push(SKO[0]); K.V.push(SKO[1]); K.G.push(gt); }
      else { K.G[n] = gt; }   // (at the same instant: the later target)
      if (K.half === 0) K.half = 1; else { K.half = 0; K.q = q + 5; }
    }
    var lo = 0, hi = K.T.length - 1;
    if (t <= K.T[0]) return 0;
    while (lo < hi) { var mm = (lo + hi + 1) >> 1; if (K.T[mm] <= t) lo = mm; else hi = mm - 1; }
    return sinkEval(K, lo, t, SKO)[0];
  }
  /* (round 3, step 2) how far a gliding bird has fallen back behind its place (units of the air): toward LAG_SPANS spans
     at its deficit (w.gld, units a second) while it glides, eased in over 1 / LAG_K s; caught up through its next bout,
     critically damped (LAG_W); its distance and rate continuous at every change; from its past bouts alone */
  var LAG_K = 2.5, LAG_W = 0.35, LAG_SPANS = 2, LAG_SPANS_LONE = 6, LAG_GAIN = 1;   // (a lone bird may fall back further than a pair's or a flock's, whose neighbours keep their places; LAG_GAIN: the deficit as aimed, its approach to the cap fading it)
  var GLIDE_RHO = { gull: 0.88, goose: 0.85, heron: 0.85, ibis: 0.85, crow: 0.7, swallow: 0.65, stork: 0.6, finch: 1 };
  var GLIDE_LD = { gull: 17, goose: 15, heron: 16.5, ibis: 15.3, crow: 13.3, swallow: 12, stork: 14.7, finch: 10 };   // (best glide ratios: research-flight 1.2's polars; the jackdaw and swift measured)
  var LKO = [0, 0], GLIDE_SINK_K = 1.5;   // (the sink rate aimed so a glide's mean angle, its easing in counted, comes to about 1 / (L/D) of its airspeed: at 1 (and rho), glides of 1.5-4 s sank 0.8-2.8 deg against 3.4-4.8)
  function lagEval(w, K, k, t, o) {
    var y0 = K.Y[k], v0 = K.V[k], tt = t - K.T[k];
    if (K.G[k] === 1) { var D = w.lmax, A = w.gld / w.lmax, e1 = Math.exp(-A * tt), e2 = Math.exp(-LAG_K * tt), c = v0 - A * (D - y0); o[0] = D - (D - y0) * e1 + c * (1 - e2) / LAG_K; o[1] = A * (D - y0) * e1 + c * e2; return o; }
    var c2 = v0 + LAG_W * y0, e = Math.exp(-LAG_W * tt);
    o[0] = (y0 + c2 * tt) * e; o[1] = (v0 - LAG_W * c2 * tt) * e; return o;
  }
  function glideLag(m, t) {
    var w = m.w;
    if (!w || !w.wing || !(w.gld > 0) || w.bound) return 0;
    var g = w.wing, B = BW.boutsTo(g, t), K = w.lk, n;
    if (!K) K = w.lk = { q: 0, half: 0, T: [g.from - g.dt], Y: [0], V: [0], G: [g.inB0 ? 0 : 1] };
    for (;;) {   // (the changes not yet taken in, as the sink's: each bout's start (catching up), then its end (falling back))
      var q = K.q; if (q >= B.length) break;
      var ts, gt;
      if (K.half === 0) { ts = B[q] < 0 ? g.from - g.dt : g.from + B[q] * g.dt; gt = 0; }
      else { if (B[q + 1] < 0) break; ts = g.from + B[q + 1] * g.dt; gt = 1; }
      n = K.T.length - 1;
      if (ts > K.T[n]) { lagEval(w, K, n, ts, LKO); K.T.push(ts); K.Y.push(LKO[0]); K.V.push(LKO[1]); K.G.push(gt); }
      else { K.G[n] = gt; }
      if (K.half === 0) K.half = 1; else { K.half = 0; K.q = q + 5; }
    }
    if (t <= K.T[0]) return 0;
    var lo = 0, hi = K.T.length - 1;
    while (lo < hi) { var mm = (lo + hi + 1) >> 1; if (K.T[mm] <= t) lo = mm; else hi = mm - 1; }
    return lagEval(w, K, lo, t, LKO)[0];
  }
  function lift(m, t) {
    var w = m.w, a, b, n, h;
    if (!w || !w.wing || !(w.sinks || w.bound)) return 0;
    if (!w.bound) return sinkAt(w, t);   // (fix: units of the air, GS_*)
    BW.around(w.wing, t, 10, BA);
    if (BA.k < 0) return 0;
    a = BA.a; b = BA.b; n = BA.n;
    if (!(b < Infinity)) b = a + 4 / w.f;
    if (!(n < Infinity)) n = b + 1;
    h = t < b ? (1 - Math.cos(Math.PI * (t - a) / (b - a))) / 2 : (1 + Math.cos(Math.PI * Math.min(1, (t - b) / (n - b)))) / 2;
    return w.bAmp * (0.5 - h);
  }
  /* how far that can carry it, either way */
  function liftReach(m) { var w = m.w; return !w ? 0 : w.bound ? w.bAmp / 2 : w.sinks ? w.amp : 0; }

  /* ---------------- a flight's shape: in the air, behind its leader ---------------- */

  /* a bird's place: lag behind the leader along the path, lat aside (level,
     at right angles to the path: for a crossing, nearer or farther), up */
  function member(F, lag, lat, rank) {
    var r = F.r, S = F.S, m = {
      lag: lag, lat: lat, up: 0, rank: rank, gain: Math.min(1.5, 1 + 0.1 * rank),
      d: measureBird3D(drawBird(r, S), F.sort, F.span * (1 + SIZE_VAR * (r() * 2 - 1)), F.n0),   // its own size (birds3d: its model's box; the 2D mark kept for the dev's comparisons)
      /* its own drift about its place, its own wing-beat and glide */
      aL: pick(r, DRIFT_L) * F.span * F.loose, aP: pick(r, DRIFT_P) * F.span * F.loose * F.air, bKey: Math.floor(r() * NOISE_N), bT: pick(r, DRIFT_T) * F.loose,   // (a loose flock drifts wider, and as gently)
      f: F.f * (1 + DETUNE * (r() * 2 - 1)), delay: 0, half: (S.bound ? 0.3 : 1) * r(), rest: r(), glide: pick(r, S.glide), bob: 0,
      w: null, stragL: 0, stragT0: 0, stragT: 1, swapT0: 0, swapT: 0, gT: 0, gT0: 0, lx: 0, ly: 0, s: null,
      x: 0, y: 0, n: F.n0, a: 1, nTry: 0
    };
    m.w = wingsOf(F, m); m.f = m.w.f;                    // (physics: its own measured wing; unlock() spreads a flight's rates evenly)
    return m;
  }
  /* (physics) a bird's own measured wing (BW.make), after its kind; its sink (the path's) and bound as before. o: the
     lab's options (spread, V, lead, lock) */
  function wingsOf(F, m, o) {
    var kind = kindOf(F), g = BW.make(F.r, kind, Object.assign({ rate: RATE_MODE, sched: SCHED_MODE, from: WING_FROM }, o || {}));
    var va = Math.sqrt(F.v * F.v * MPU * MPU + (FL.speed || 0) * (FL.speed || 0)), rho = GLIDE_RHO[F.sort] || 0.85;   // (round 3, step 2: its airspeed, m/s: its frame's pace and the camera's)
    return { gsr: !F.S.bound && !F.still && !F.soar ? GLIDE_SINK_K * va / (GLIDE_LD[F.sort] || 15) : 0, gld: !F.S.bound && !F.still && !F.soar && !F.place ? LAG_GAIN * (1 - rho) * va / MPU : 0, lmax: (F.n <= 1 ? LAG_SPANS_LONE : LAG_SPANS) * F.span,
             wing: g, f: g.f, sinks: !F.S.bound && !F.still, amp: GS_AMP * F.span * (F.air || 1),
             bound: !!F.S.bound, bAmp: F.S.bound ? pick(F.r, F.S.bound) * F.span : 0 };
  }
  /* a place's or a wheel's bird (no flight of its own): its wing, no sink */
  function placeWing(kind, r) { var g = BW.make(r, BW.LB.P.kinds[kind] ? kind : 'gull', { rate: RATE_MODE, sched: SCHED_MODE, from: WING_FROM }); return { wing: g, f: g.f, sinks: false, amp: 0, bound: false, bAmp: 0 }; }
  /* birds beating each on its own never fall into step: their rates spread evenly over the whole of the lab's SPREAD
     (+-3 %, the measured bird-to-bird spread), each from its own point in its day (the lab's flock); an ibis in a skein
     (a V, a J or an echelon) is drawn toward the spatial phase behind the bird ahead of it on its arm in wake bouts (the
     lab's lock: the distance between them, m, and their speed through the air, the camera's and its own) */
  function unlock(F) {
    var M = F.m, n = M.length, i, j, k, order = [], sp = [];
    for (i = 0; i < n; i++) order.push(i);
    for (i = n - 1; i > 0; i--) { j = Math.floor(F.r() * (i + 1)); k = order[i]; order[i] = order[j]; order[j] = k; }
    for (i = 0; i < n; i++) sp[order[i]] = n > 1 ? 2 * i / (n - 1) - 1 : undefined;
    var V = F.kind === 'skein' && F.sort === 'ibis', U = Math.sqrt(Math.pow(FL.speed || 12, 2) + Math.pow(F.v * MPU, 2));
    for (i = 0; i < n; i++) {
      var m = M[i], o = { spread: sp[i] };
      if (V) { o.V = true; if (i > 0) { var Ld = M[m.rank === 1 ? 0 : i - 1]; o.lead = Ld.w.wing; o.lock = { d: Math.max(0.5, Math.abs(m.lag - Ld.lag) * MPU), U: Math.max(5, U) }; } }
      m.w = wingsOf(F, m, o); m.f = m.w.f; m.delay = 0;
    }
  }

  /* the birds of a flight in their places behind the leader: never where
     a ruler would put them, and never still in them */
  function formation(F) {
    var r = F.r, n = F.n, sp = F.span, M = [], k, a, b, arm, dx, dy, u, rank, lag, lat, up, m, bow;
    function jit() { return r() * 2 - 1; }
    M.push(member(F, 0, 0, 0));
    if (F.kind === 'skein') {
      u = r();                                            // echelon, J or V (J's and echelons are the commoner in the wild)
      if (u < 0.3 || n === 2) { a = n - 1; b = 0; }
      else if (u < 0.65 && n >= 4) { a = Math.ceil((n - 1) / 2) + 1; b = n - 1 - a; }
      else { a = Math.ceil((n - 1) / 2); b = n - 1 - a; }
      if (F.cls !== 'day' && a > 5) { a = 5; b = n - 1 - a; }   // (life: at most five a leg)
      arm = r() < 0.5 ? 1 : -1;
      dx = pick(r, ARM_X) * sp * (2 - F.flat); dy = pick(r, ARM_Y) * sp * F.flat;   // (a narrow band: a flatter V)
      var VG0 = F.cls !== 'day' && V_GEOM[F.sort], JIT = VG0 ? JITTER_V : JITTER;
      if (VG0) { dx = pick(r, VG0.x) * sp * (1.25 - 0.25 * F.flat); dy = pick(r, VG0.y) * sp; }   // (fix: the V's width kept in a narrow band, its angle with it)   // (life: the goose's V narrower, the ibis's wider)
      bow = r() < 0.3;                                    // a U: the ranks near the apex closer in
      u = mix(r(), 0.3, 0.7);                             // the second arm a part of a place behind the first (no V is symmetric)
      for (k = 1; k < n; k++) {
        rank = k <= a ? k : k - a;
        lag = (rank + (k > a ? u : 0)) * dx * (bow ? 0.85 + 0.075 * rank : 1) * (1 + JIT * jit());
        lat = (k <= a ? arm : -arm) * (rank * dy * (1 + JIT * jit()) + 0.5 * JIT * sp * jit());
        m = member(F, lag, lat, rank);
        m.up = UP_V * sp * jit();                         // the V lies level in the air
        M.push(m);
      }
      if (!F.still && n >= 5 && a > b + 1 && r() < RESHUF) { m = M[a]; m.swapT = pick(r, RESHUF_T); m.swapT0 = mix(r(), 6, 22); m.shuf = true; }   // (round 3, step 3: a reshuffle now and then)
    } else if (F.kind === 'line') {
      dx = pick(r, FILE) * sp; lag = 0; lat = 0; up = 0;
      for (k = 1; k < n; k++) {
        lag += dx * (1 + 1.5 * JITTER * jit());           // uneven gaps ...
        up += FILE_Y * sp * jit();                        // ... and the line undulating in the air
        lat += 0.3 * FILE_Y * sp * jit();
        m = member(F, lag, lat, k);
        m.up = up;
        m.gain = Math.min(1.5, 1 + 0.07 * k);
        M.push(m);
      }
    } else if (F.kind === 'pair') {
      m = member(F, pick(r, PAIR_X) * sp, (r() < 0.5 ? 1 : -1) * pick(r, PAIR_Y) * sp, 1);   // one nearer, one farther
      m.up = 0.3 * sp * jit();
      m.gain = 1;
      if (!F.still && r() < 0.4) { m.swapT = pick(r, SWAP_T); m.swapT0 = mix(r(), 4, 14); }
      M.push(m);
    } else if (F.kind === 'loose' && F.cls !== 'day' && F.sort === 'crow') {
      /* (life) a loose flock built of pairs: the two of a pair side by side 0.8-1.4 spans apart, the pairs 2.7-4 spans
         from the next, the flock flat (wider than deep) */
      var pl = 0, pa = 0, ps = r() < 0.5 ? 1 : -1;
      for (k = 1; k < n; k++) {
        if (k % 2 === 1) { m = member(F, pl, pa + ps * pick(r, [0.8, 1.4]) * sp, k); m.up = 0.15 * sp * jit(); }
        else {
          for (u = 0; u < 60; u++) { var dd = pick(r, [2.7, 4.0]) * sp, an = (r() * 2 - 1) * 1.1; pl = Math.max(0.6 * sp, (k / 2) * 1.2 * sp + dd * Math.abs(Math.cos(an)) * 0.6); pa = dd * Math.sin(an) * 1.6 + 0.3 * jit() * sp; m = member(F, pl, pa, k); m.up = 0.25 * sp * jit(); if (fits(F, M, m, 0)) break; }
          ps = r() < 0.5 ? 1 : -1;
        }
        m.gain = 1; M.push(m);
      }
    } else if (F.kind === 'loose') {
      for (k = 1; k < n; k++) {
        m = member(F, 0, 0, k);
        m.gain = 1;
        for (u = 0; u < 80; u++) {                        // a cloud behind and about the leader, wider than tall
          m.lag = mix(r(), 0.8, 2 * Math.sqrt(n)) * sp;
          m.lat = jit() * 1.15 * Math.sqrt(n) * sp;
          m.up = jit() * 0.45 * Math.sqrt(n) * sp;
          if (fits(F, M, m, u < 40 ? pick(r, LOOSE) * sp - sp : 0)) break;
        }
        M.push(m);
      }
    }
    /* a straggler, now and then: the tail of a skein of five or more, catching up */
    if (F.kind === 'skein' && n >= 5 && !F.still && r() < 0.33) {
      m = M[0];
      for (k = 1; k < M.length; k++) if (M[k].lag > m.lag) m = M[k];
      m.stragT = pick(r, STRAGGLE_T); m.stragL = pick(r, STRAGGLE) * F.v * m.stragT / 1.5; m.stragT0 = mix(r(), 0, 6);   // (1.5: the ease's steepest)
    }
    return M;
  }
  /* now and then a skein crosses as a ragged file that fans out into its V
     (sideways first, then closing up, the front birds first), or a V that
     strings out into a file; a line as a bunch that strings out into single
     file, or the reverse: never through one another */
  function gatherOf(F) {
    var r = F.r, M = F.m, sp = F.span, i, m, tries, u = r(), order, acc, strag;
    if (F.still || F.calm || F.n < 3 || (F.kind !== 'skein' && F.kind !== 'line') || u >= GATHER + LOOSEN) return;
    F.loosen = u >= GATHER;
    strag = M.map(function (m) { var v = m.stragL; m.stragL = 0; return v; });   // (a gathering flight has no straggler: one change at a time)
    F.latFirst = F.kind === 'skein';
    order = M.slice(1).sort(function (a, b) { return a.lag - b.lag; });
    for (tries = 0; tries < 6; tries++) {
      acc = 0;
      for (i = 0; i < order.length; i++) {
        m = order[i];
        if (F.kind === 'skein') {                         // the file: one behind another, a little ragged
          acc += pick(r, FILE_G) * sp;
          m.lx = acc; m.ly = (r() * 2 - 1) * 0.25 * sp;
        } else {                                          // the bunch: closer, and spread either side
          m.lx = m.lag * mix(r(), 0.45, 0.65);
          m.ly = m.lat + (i % 2 ? 1 : -1) * mix(r(), 0.8, 1.2) * sp;
        }
        m.gT0 = i * pick(r, GATHER_AT);                   // the front birds first ...
        m.gT = Math.max(pick(r, GATHER_T), 2.2 * Math.max(Math.abs(m.lag - m.lx), Math.abs(m.lat - m.ly)) / (REL * F.v));   // ... none faster than REL of the flight's speed
      }
      if (order.every(function (m) { return m.gT <= GATHER_MAX; }) && fitsAll(F)) return;
      for (i = 1; i < M.length; i++) { M[i].lag *= 1.1; M[i].lx *= 1.1; }   // (a little more room, and again)
    }
    for (i = 1; i < M.length; i++) { M[i].gT = 0; M[i].lag /= Math.pow(1.1, tries); M[i].stragL = strag[i]; }   // no way keeps them apart: the pattern as it was
  }

  /* a bird's place in its flight (lag behind the leader, lat aside, up) at
     flight time tau: its slot, or on its way to it from the scatter, a
     straggler catching up, a pair changing sides */
  var sl = {};
  function slotAt(F, m, tau, o) {
    var lag = m.lag, lat = m.lat, q, a, b, e = tau - F.ev0;   // (the events keep the flight's own clock, from ev0)
    if (m.gT) {                                           // on its way between the scatter and its place: one way leads, the other follows
      q = clamp((e - m.gT0) / m.gT, 0, 1);
      if (F.loosen) q = 1 - q;                            // (loosening is gathering played backwards)
      a = ease(q / 0.7); b = ease((q - 0.3) / 0.7);
      lag = m.lx + (lag - m.lx) * (F.latFirst ? b : a); lat = m.ly + (lat - m.ly) * (F.latFirst ? a : b);
    }
    if (m.stragL) lag += m.stragL * (1 - ease((e - m.stragT0) / m.stragT));
    if (m.swapT) {                                        // back a span, across, and up again
      q = ease((e - m.swapT0) / m.swapT);
      lat *= Math.cos(Math.PI * q);
      lag += F.span * Math.sin(Math.PI * q);
      o.up = m.up + 1.2 * F.span * Math.sin(Math.PI * q);   // (birds3d: and over it: seen from behind, never through it on the window)
      o.lag = lag; o.lat = lat;
      return o;
    }
    o.lag = lag; o.lat = lat; o.up = m.up;
    return o;
  }
  /* the moments worth checking a flight's spacing at: before, through and after its events */
  function eventTimes(F) {
    var end = 0, i, m, T = [], e;
    for (i = 0; i < F.m.length; i++) {
      m = F.m[i];
      if (m.gT) end = Math.max(end, m.gT0 + m.gT);
      if (m.stragL) end = Math.max(end, m.stragT0 + m.stragT);
      if (m.swapT) end = Math.max(end, m.swapT0 + m.swapT);
    }
    for (e = -0.5; e <= end + 0.5; e += 0.5) T.push(F.ev0 + e);
    return T;
  }

  /* can bird m join the others in M (in their slots), ink never nearer than SPACE (+ extra) in the air? */
  function fits(F, M, m, extra) {
    for (var i = 0; i < M.length; i++) if (!pairFits(F, M[i], m, M[i].lag, M[i].lat, m.lag, m.lat, extra || 0, M[i].up, m.up)) return false;
    return true;
  }
  /* two birds at these places, whatever their drift, the wander, gusts, glides and bounds between them */
  function pairFits(F, a, b, la, ta, lb, tb, extra, ua, ub) {
    var v = F.v, dl = Math.abs(la - lb), dp = Math.sqrt((ta - tb) * (ta - tb) + (ua - ub) * (ua - ub)),
        gx = dl - a.d.hw - b.d.hw + (a.d.halo || 0) + (b.d.halo || 0) - a.aL - b.aL - (F.smA ? 1.9 * SURGE * dl : 0),   // (round 3, alive: the surge's ripple)
        gy = dp - a.d.hh - b.d.hh + (a.d.halo || 0) + (b.d.halo || 0) - a.aP - b.aP - BOB * Math.max(a.d.span, b.d.span) -
             F.wAmp * (Math.abs(a.gain - b.gain) + 2 * Math.max(a.gain, b.gain) * Math.min(1, TAU * dl / F.wLam)) -
             2 * F.hAmp * Math.min(1, TAU * dl / (v * F.hT)) -
             (a.w === b.w ? liftReach(a) * Math.min(1, dl / (v * 2)) : liftReach(a) + liftReach(b));
    return Math.max(gx, gy) >= SPACE / F.n0 + extra;
  }
  var slA = {}, slB = {};
  function fitsAll(F) {
    var M = F.m, T = eventTimes(F), x, i, j;
    for (x = 0; x < T.length; x++) {
      for (i = 0; i < M.length; i++) {
        slotAt(F, M[i], T[x], slA);
        for (j = i + 1; j < M.length; j++) {
          slotAt(F, M[j], T[x], slB);
          if (!pairFits(F, M[i], M[j], slA.lag, slA.lat, slB.lag, slB.lat, 0, slA.up, slB.up)) return false;
        }
      }
    }
    return true;
  }
  /* the whole flight keeps its birds apart: if not, its places are drawn out along the track */
  function spaced(F) {
    var M = F.m, i, tries;
    for (tries = 0; tries < 8; tries++) {
      if (fitsAll(F)) return true;
      for (i = 1; i < M.length; i++) { M[i].lag *= 1.12; M[i].lx *= 1.12; if (F.kind === 'skein' && F.cls !== 'day') { M[i].lat *= 1.12; M[i].ly *= 1.12; } }   // (fix: a skein drawn out whole, its V's angle kept)
    }
    return false;
  }

  /* ---------------- where a bird is: a pure function of the flight's time ---------------- */

  var tmp = {}, tmp2 = {}, pb = {}, st = {};
  function spot(F, m, tau, o) {
    if (F.soar) return soarSpot(F, m, tau, o);
    slotAt(F, m, tau, sl);
    var q = F.q, lag = sl.lag + m.aL * q * wave(m.bKey, tau / m.bT) + glideLag(m, tau),   // (round 3, step 2: a gliding bird falls back, and catches up as it beats)
        lat = sl.lat + 0.75 * m.aP * q * wave(m.bKey + 53, tau / m.bT / 1.3),     // (its drift about its place: aside and up and down,
        up = sl.up + 0.5 * m.aP * q * wave(m.bKey + 97, tau / m.bT / 1.1), s, w, sh, ch;   //  together about as much as one way alone)
    s = F.s0 + F.v * (tau + (F.smA ? F.smA * wave(F.smK, (tau - lag / F.v) / F.smT) : 0)) - lag + (F.acc ? accelS(F, tau) : 0);   // (round 3, alive: its pace swinging, each bird as it reaches that air)   // (round 3: and its changes of pace in flight, i6_steer.js)
    work += SPOT_COST - 1;   // (round 3: its drift, wander, gusts and wings: the hot path, counted at its cost)
    path3(F, F.sa + s, wp);
    w = F.wAmp * wave(F.wKey, s / F.wLam) * m.gain;       // the track's wander: every bird flies through it
    up += w; lat += 0.5 * w;
    up += F.hAmp * wave(F.hKey, (tau - lag / F.v) / F.hT) * q - lift(m, tau) * (m.w && m.w.sinks ? 1 : q);   // (fix: a glide's sink is through the air, not gentled with the window's pace)   // a gust reaches each bird as it reaches that air; its wings carry it
    sh = Math.sin(wp.h); ch = Math.cos(wp.h);
    o.ax = wp.x - sh * lat; o.ay = wp.y + up; o.az = wp.z + ch * lat;   // (where it is in the air: the drawing's)
    if (F.ws !== undefined && (F.ws !== 1 || F.wsA) && F.wsS) {   // (round 3, the owner's word on the camera: its own world speed, and an escort's wander about its station)
      var dW = (F.ws - 1) * F.wsS * tau + F.wsA * (F.span || 0) * wave(F.wsK, tau / F.wsT);
      o.ax += dW * F.wsX; o.az += dW * F.wsZ;
    }
    /* (way-other, W8) a flight keeps its formation in the air it flies through: in a wind every body turns by its crab
       (its way over the ground to its way through the air), and so does the flight's figure about its leader (each bird
       its place behind and aside in its neighbours' air, as a skein holds it): the offset from its place on the path
       turned by the crab */
    /* (life fix, L4) and, wind or none, the flight's figure lies along its way through the AIR: a travelling flight's
       frame escorts the camera, so its birds' way through the air is their way in the frame plus the camera's (FL.psi,
       FL.speed, in the frame's axes) less the wind; the offset from the leader's way is turned from the path's heading
       to that way (judge-bio1: the V's axis stood 37-87 deg off the way its geese faced) */
    if (!F.place && !F.still && (lag !== 0 || lat !== 0)) {
      var cy8 = F.cyw === undefined ? 1 : F.cyw, sy8 = F.syw === undefined ? 0 : F.syw, wfx = 0, wfz = 0;
      if (WIND_ON) { wfx = (-cy8 * WINDV[0] + sy8 * WINDV[2]) / MPU; wfz = (sy8 * WINDV[0] + cy8 * WINDV[2]) / MPU; }
      var dps8 = (FL.psi || 0) - (F.yaw || 0), cs8 = (FL.speed || 0) / MPU;
      var vo8 = F.v * F.q, ax8 = vo8 * ch - cs8 * Math.sin(dps8) - wfx, az8 = vo8 * sh + cs8 * Math.cos(dps8) - wfz;
      var c8 = Math.atan2(ch * az8 - sh * ax8, ch * ax8 + sh * az8), cc8 = Math.cos(c8) - 1, sc8 = Math.sin(c8);
      var dx8 = -lag * ch - sh * lat, dz8 = -lag * sh + ch * lat;   // (its offset from the leader's way: back along the path, aside)
      o.ax += dx8 * cc8 - dz8 * sc8; o.az += dx8 * sc8 + dz8 * cc8;
    }
    proj(o.ax, o.ay, o.az, o);   // aside: level, at right angles to its heading
    o.a = fadeOf(o.n);
    return o;
  }

  /* a soaring bird: the glide in, the thermal (a ring in the air, its
     centre drifting downwind and the birds climbing in it), the glide away
     — joined where their headings meet */
  function glideDist(x, v0, v1) {
    var q = x / EASE_T;
    return v0 * x + (v1 - v0) * (q < 1 ? EASE_T * (q * q * q - q * q * q * q / 2) : EASE_T / 2 + x - EASE_T);
  }
  function soarSpot(F, m, tau, o) {
    var S = F.soar, th, d, x, y, z;
    if (tau < m.tj) {
      d = glideDist(m.tj - tau, m.vj, m.vIn);
      x = m.jx - S.dirIn * d; y = m.jy; z = m.jz;
    } else if (tau < m.tx) {
      th = S.thj + S.om * (tau - m.tj);
      x = S.cx + S.dirIn * S.drift * (tau - S.tj0) + m.R * Math.cos(th);
      y = S.cy + S.rise * (tau - S.tj0);
      z = S.cz + m.R * Math.sin(th);
    } else {
      away(S, m, tau - m.tx, st);
      x = st.x; y = st.y; z = st.z;
    }
    o.ax = x; o.ay = y; o.az = z;
    proj(x, y, z, o);
    o.a = fadeOf(o.n);
    return o;
  }
  /* the glide away from the thermal, dt into it */
  function away(S, m, dt, o) {
    var d = glideDist(dt, m.vx, m.vOut);
    o.x = m.xx + S.dirOut * d * Math.cos(S.descent); o.y = m.xy - d * Math.sin(S.descent); o.z = m.xz;
    return o;
  }

  /* ---------------- planning a flight ---------------- */

  var flights = [], flightNo = 0;
  var r2 = vstream(2), r2k = 0, r2x = r2(), r2y = r2();
  function r2next(o) {                                     // the R2 low-discrepancy sequence: paths spread evenly over a visit
    r2k++;
    o.x = (r2x + r2k * 0.7548776662466927) % 1;
    o.y = (r2y + r2k * 0.5698402909980532) % 1;
    return o;
  }

  /* (round 3, step 1) can a bird of this kind fly a crossing at its calm pace in the air at hand (the camera's way less
     the wind, along the course), over its least airspeed (AIR_MIN)? */
  function airCrossOK(sort) {
    var S = SORTS[sort], am = AIR_MIN[sort];
    if (!S || !am || !WIND_ON || FORCED || !S.depth || !S.pace) return true;
    windNow();
    var yw = job && job.yaw !== undefined ? job.yaw : 0, along = (FL.speed || 0) - (Math.sin(yw) * WINDV[0] + Math.cos(yw) * WINDV[2]);
    var n0 = (S.depth[0] + S.depth[1]) / 2, px = SPAN * view * S.size * n0, vPx = clamp(soft(pace * px * (S.pace[0] + S.pace[1]) / 2 * calmOf(), topSpeed()), SPEED[0], SPEED[1]), vm = vPx / n0 * MPU;
    return Math.sqrt(vm * vm + along * along) >= am;
  }
  function airSort(r, sort, list) {
    if (!list || airCrossOK(sort)) return sort;
    for (var i = 0, s2; i < 4; i++) { s2 = weighted(r, list); if (airCrossOK(s2)) { STATS.airSort = (STATS.airSort || 0) + 1; return s2; } }
    return sort;
  }
  function newFlight(kind, n, dir, r, calm, flat, stillSky) {
    var LCf = !stillSky && job ? LIFE[job.cls] : null, sort = airSort(r, weighted(r, LCf && LCf.kinds[kind] && !(job && job.sortF) ? LCf.kinds[kind] : SORT_OF[kind]), LCf && LCf.kinds[kind] && !(job && job.sortF) && !stillSky ? LCf.kinds[kind] : null), S = SORTS[sort], F = {
      kind: kind, sort: sort, S: S, n: n, dir: dir, r: r, soar: null, cls: job && !stillSky ? job.cls : 'day', roost: !!(job && job.roost), m: null, path: null, w: null, q: 1, inS: 0,
      flat: flat ? 0.6 : 1, calm: !!calm, still: !!stillSky, loose: kind === 'loose' ? 1.4 : 1,
      t0: 0, s0: 0, sa: 0, len: 0, dur: 0, edges: 3, ev0: 0, from: 0, loosen: false, latFirst: false, n0: pick(r, S.depth),
      wKey: Math.floor(r() * NOISE_N), wLam: pick(r, WAVE) * (S.wave || 1),
      wAmp: mix(fBreeze, WANDER[0], WANDER[1]) * (kind === 'line' ? 1.3 : 1) * (S.wander || 1) * pick(r, [0.7, 1.1]),
      hKey: Math.floor(r() * NOISE_N), hT: pick(r, HEAVE_T), hAmp: mix(fBreeze, HEAVE[0], HEAVE[1]) * pick(r, [0.7, 1.1])
    };
    var v, g, px;
    /* (fix round) now and then a lone bird or a pair of the big kinds flies near (NEAR_N, under NEAR_MAX): at 40-55 px on
       a desktop its 3D (the beat in depth, the body, the set, the foreshortening as its way turns) reads at true size,
       where the everyday birds at 15-30 px read as marks */
    if ((kind === 'single' || kind === 'pair') && !stillSky && NEAR_SORTS[sort] && (NEAR_FORCE || r() < NEAR_SHARE)) { F.n0 = pick(r, NEAR_N); F.near = true; }
    if (calm) { F.wAmp *= 0.3; F.hAmp *= 0.3; }          // a narrow strip of sky: still air
    var wsR = job && !stillSky ? job.role : null, wsU = r(), wsV = r();   // (round 3: its own world speed)
    var wsKind = calm || stillSky ? 'hold' : wsR === 'stream' ? 'ahead' : wsR === 'counter' ? 'back' : wsR ? 'hold' : wsU < WS_DAY[0] ? 'ahead' : wsU < WS_DAY[0] + WS_DAY[1] ? 'hold' : 'back';
    F.ws = calm || stillSky ? 1 : mix(wsV, (wsKind === 'ahead' ? WS_AHEAD : wsKind === 'back' ? WS_BACK : WS_HOLD)[0], (wsKind === 'ahead' ? WS_AHEAD : wsKind === 'back' ? WS_BACK : WS_HOLD)[1]);
    F.wsKind = wsKind; F.wsK = Math.floor(r() * NOISE_N); F.wsT = pick(r, WS_T); F.wsA = calm || stillSky || wsKind !== 'hold' ? 0 : WS_WANDER;   // (the wander in spans: made air units below)
    F.wsX = 0; F.wsZ = 1; F.wsS = 0;
    F.smK = Math.floor(r() * NOISE_N); F.smT = pick(r, SURGE_T); F.smA = calm || stillSky ? 0 : SURGE * F.smT / 2.9;   // (round 3, alive: the pace's swing, in s of its own way)
    px = SPAN * view * S.size * F.n0;                     // its span on the window where it crosses: its kind's size, its distance
    F.span = px / F.n0;                                   // (in the air: px at nearness 1)
    v = pace * px * pick(r, S.pace);                      // in the wild: spans a second, about a span a beat ...
    F.vPx = clamp(soft(v * calmOf(), topSpeed()), SPEED[0], SPEED[1]);   // ... on the page slowed to its calm
    F.v = F.vw = F.vPx / F.n0;                            // (units of the air a second)
    F.f = BW.LB.rate(kindOf(F), RATE_MODE);               // (physics: the lab's rate; each bird's own about it)
    F.flaps = S.flaps && S.flaps[0][0] > 8 && F.vPx < 0.8 * px * F.f ? FLAPS_SLOW : S.flaps;   // held back: it glides between bursts ...
    g = Math.sqrt(clamp(v / F.vPx, 1, HOLD));             // ... and every kind glides the longer, the more it is slowed
    if (F.flaps && !S.bound) F.flaps = [F.flaps[0], [F.flaps[1][0] * g, F.flaps[1][1] * g]];   // (not a finch's bound: its wings shut)
    F.air = Math.sqrt(Math.min(1, F.vPx / v));            // what moves it in seconds (a gust, its drift, a glide's sink) gentled
    F.hAmp *= F.air;                                      // as it is slowed, so its path turns no sharper for the slower pace
    F.wAmp /= F.n0; F.hAmp /= F.n0; F.wLam /= F.n0;       // (the wander and the gusts, px where it crosses: in the air)
    F.climb = (kind === 'single' || kind === 'pair') && (sort === 'gull' || sort === 'crow' || sort === 'swallow') && W >= SOAR_W && r() < 0.22;
    /* (physics) every bird beats each on its own (a line's wing-beats unlocked, as measured in geese, cranes and
       pelicans); an ibis skein's followers drawn toward the bird ahead's spatial phase in wake bouts (unlock) */
    if (kind === 'soar') return soarFlight(F);
    F.m = formation(F);
    F.d = F.m[0].d;
    if (!spaced(F)) return null;                        // the pattern keeps its birds apart ...
    gatherOf(F);                                          // ... and so does its gathering, if it gathers
    unlock(F);
    F.probe = probeOf(F);
    reachOf(F);
    return F;
  }
  /* how far a flight reaches above and below its leader on the window
     where it crosses (its places through its events, their drift, the
     wander, the gusts, the lift of its wings, the ink), px */
  function reachOf(F) {
    var lo = 0, hi = 0, i, m, y, b, T = eventTimes(F), x, n = F.n0;
    for (i = 0; i < F.m.length; i++) {
      m = F.m[i];
      b = (m.aP + F.wAmp * m.gain + m.d.hh + BOB * m.d.span + liftReach(m)) * n;
      for (x = 0; x < T.length; x++) {
        slotAt(F, m, T[x], sl);
        y = (Math.abs(sl.lat) + 0.5 * F.wAmp * m.gain) * cam.s * n;   // (aside is nearer or farther: higher or lower on the window)
        lo = Math.max(lo, sl.up * n + y + b); hi = Math.max(hi, -sl.up * n + y + b);
      }
    }
    F.lo = lo + F.hAmp * n; F.hi = hi + F.hAmp * n;
    /* (round 3, step 1) how much nearer (dzN, air units, <= 0) and farther (dzF) its birds stand than its leader once its
       figure is turned to its way through the air (spot()'s L4 turn, for a straight crossing at its pace and at half of
       it, the drift about their places included), and its biggest bird's ink and bob (air units) */
    var cs = (FL.speed || 0) / MPU, yw = job && job.yaw !== undefined ? job.yaw : 0, dps = (FL.psi || 0) - yw, wfx = 0, wfz = 0, dzN = 0, dzF = 0, ink = 0, chh = F.dir > 0 ? 1 : -1, j, c, ax, az, fz, dr;
    if (WIND_ON && !F.place && !F.still) { windNow(); wfx = (-Math.cos(yw) * WINDV[0] + Math.sin(yw) * WINDV[2]) / MPU; wfz = (Math.sin(yw) * WINDV[0] + Math.cos(yw) * WINDV[2]) / MPU; }
    for (j = 0; j < 2 && !F.place && !F.still; j++) {
      ax = F.v * (j ? 0.5 : 1) * chh - cs * Math.sin(dps) - wfx; az = cs * Math.cos(dps) - wfz;
      c = Math.atan2(chh * az, chh * ax);
      for (i = 0; i < F.m.length; i++) {
        m = F.m[i]; ink = Math.max(ink, m.d.hh + BOB * m.d.span); dr = m.aL + m.aP + (m.w && m.w.gld > 0 && !m.w.bound ? 0.4 * m.w.lmax : 0);   // (round 3, step 2: and its glide's lag, as far as it usually goes)
        for (x = 0; x < T.length; x++) { slotAt(F, m, T[x], sl); fz = -sl.lag * chh * Math.sin(c) + chh * sl.lat * Math.cos(c); dzN = Math.min(dzN, fz - dr); dzF = Math.max(dzF, fz + dr); }
      }
    }
    F.dzN = dzN; F.dzF = dzF; F.inkR = ink;
  }
  /* the birds that bound a formation (its leader, its tail, its outermost
     either side and above and below, through its events): a path is tried
     on these first, then on them all */
  function probeOf(F) {
    var M = F.m, i, x, T = eventTimes(F), out = [0], ex = [0, 0, 0, 0, 0], who = [0, 0, 0, 0, 0];
    for (i = 1; i < M.length; i++) for (x = 0; x < T.length; x++) {
      slotAt(F, M[i], T[x], sl);
      if (sl.lat < ex[0]) { ex[0] = sl.lat; who[0] = i; }
      if (sl.lat > ex[1]) { ex[1] = sl.lat; who[1] = i; }
      if (sl.lag > ex[2]) { ex[2] = sl.lag; who[2] = i; }
      if (sl.up < ex[3]) { ex[3] = sl.up; who[3] = i; }
      if (sl.up > ex[4]) { ex[4] = sl.up; who[4] = i; }
    }
    who.forEach(function (k) { if (out.indexOf(k) < 0) out.push(k); });
    return out;
  }

  /* the soaring birds' flight: which way in, where the thermal is, which way out */
  function soarFlight(F) {
    var r = F.r, S, R, T, i, m, M = [], n = F.n, top = topSpeed() / F.n0;
    R = clamp(38 + 0.05 * W, SOAR_R[0], SOAR_R[1]) * pick(r, [0.9, 1.1]) / F.n0;
    T = pick(r, LAP);
    if (TAU * R / T > top) R = top * T / TAU;
    S = F.soar = {
      R: R, om: (r() < 0.5 ? 1 : -1) * TAU / T, T: T, drift: pick(r, WIND) / F.n0, rise: pick(r, RISE) / F.n0,
      laps: Math.round(pick(r, LAPS)), dirIn: F.dir, dirOut: r() < 0.55 ? F.dir : -F.dir,
      descent: pick(r, DESCENT), cx: 0, cy: 0, cz: 0, tj0: 0, thj: 0, thx: 0, top: top
    };
    S.sense = S.om > 0 ? 1 : -1;
    S.thj = S.dirIn === S.sense ? -Math.PI / 2 : Math.PI / 2;    // the near side of the ring, or the far: where it runs the way the bird comes in
    S.thx = S.dirOut === S.sense ? -Math.PI / 2 : Math.PI / 2;   // ... and where it runs the way the bird will leave
    for (i = 0; i < n; i++) {
      m = member(F, 0, 0, i);
      m.R = R * (i === 1 ? 0.88 : i === 2 ? 1.1 : 1);
      m.gap = i ? (i * T / n) * pick(r, [0.94, 1.06]) : 0;       // they join the thermal a share of a lap apart ...
      M.push(m);                                                 // ... and hold their wings out, but for a few beats
    }
    F.m = M;
    F.d = M[0].d;
    F.edges = 3;
    F.probe = M.map(function (m, i) { return i; });
    F.lo = 0;
    for (i = 0; i < n; i++) F.lo = Math.max(F.lo, (0.55 * M[i].R + M[i].d.hh + BOB * M[i].d.span) * F.n0);   // (the ring seen from below)
    F.hi = F.lo;
    F.lo += S.rise * F.n0 * T * (S.laps + 1);             // (and climbing as it circles)
    return F;
  }
  /* put a soaring flight's thermal at (cx, cy, cz) in the air and time its birds' glides, laps and leaving */
  function soarTimes(F, cx, cy, cz) {
    var S = F.soar, M = F.m, i, m, d, lo, hi, mid, turn, n, entry;
    S.cx = cx; S.cy = cy; S.cz = cz;
    turn = ((S.thx - S.thj) * S.sense % TAU + TAU) % TAU;
    for (i = 0, lo = hi = S.top; i < M.length; i++) {
      m = M[i];
      m.vj = Math.abs(S.om) * m.R + S.drift;                   // at the join: the ring's speed and the drift together
      m.vx = Math.abs(S.om) * m.R + S.dirIn * S.dirOut * S.drift;
      lo = Math.min(lo, GLIDE_V * m.vj); hi = Math.min(hi, GLIDE_V * m.vx);
    }
    for (i = 0; i < M.length; i++) { M[i].vIn = lo; M[i].vOut = hi; }   // all glide in and away at one pace: one by one, none catching another
    /* the first bird enters from beyond the edge at the start: how long its glide in takes */
    m = M[0];
    n = cam.f / (cy * cam.s + (cz + m.R * Math.sin(S.thj)) * cam.c);   // (its nearness on the way in)
    entry = ((S.dirIn > 0 ? -OUT : W + OUT) - cam.x0) / n;
    d = Math.abs(cx + m.R * Math.cos(S.thj) - entry);
    lo = 0; hi = 600;
    while (hi - lo > 0.01) { mid = (lo + hi) / 2; if (glideDist(mid, m.vj, m.vIn) < d) lo = mid; else hi = mid; }
    S.tj0 = lo;
    for (i = 0; i < M.length; i++) {
      m = M[i];
      m.tj = S.tj0 + m.gap;
      m.jx = cx + S.dirIn * S.drift * (m.tj - S.tj0) + m.R * Math.cos(S.thj);
      m.jy = cy + S.rise * (m.tj - S.tj0);
      m.jz = cz + m.R * Math.sin(S.thj);
      m.tx = m.tj + (S.laps * TAU + turn) / Math.abs(S.om);
      m.xx = cx + S.dirIn * S.drift * (m.tx - S.tj0) + m.R * Math.cos(S.thx);
      m.xy = cy + S.rise * (m.tx - S.tj0);
      m.xz = cz + m.R * Math.sin(S.thx);
      m.delay = 0;   // (physics: its wing the lab's measured stork, bouts and glides as the CC0 tags give them, thermals included)
      lo = 0; hi = 600;                                   // (gone: beyond the far edge, or into the distance)
      while (hi - lo > 0.05) {
        mid = (lo + hi) / 2; away(S, m, mid, st); proj(st.x, st.y, st.z, pp);
        if (pp.n >= FAR && (S.dirOut > 0 ? pp.x - m.d.hw * pp.n < W + 2 : pp.x + m.d.hw * pp.n > -2)) lo = mid; else hi = mid;
      }
      m.done = m.tx + hi;
    }
    F.dur = 0;
    for (i = 0; i < M.length; i++) F.dur = Math.max(F.dur, M[i].done);
    F.edges = (S.dirIn > 0 ? 1 : 2) | (S.dirOut > 0 ? 2 : 1);
  }

  /* where the other flights' birds will be at step k from sky time A.t1:
     worked out when a trial first needs it, and kept for the job's other paths */
  /* (aheadRow: the module's, i5_plan.js) */

  /* a flight's pace on its path: its kind's, but never so quick where it
     passes nearest that it rushes across the window, and never growing or
     shrinking (coming nearer, going away) faster than GROW or SHRINK a
     second; a path that would slow it by more than half: not this one */
  function paced(F) {
    var a = entering(F), b = leaving(F), ds = Math.max(4, (b - a) / 24), s, e, sig = 0, slow = Infinity, gr = 0, sh = 0, tr = 0, x0, y0, n0, d, g, g0 = NaN, L = 0, i, k, seen = Infinity;
    path3(F, F.sa + a, wp); proj(wp.x, wp.y, wp.z, pp); x0 = pp.x; y0 = pp.y; n0 = pp.n;
    for (s = a + ds; s <= b + 1e-6; s += ds) {
      path3(F, F.sa + s, wp); proj(wp.x, wp.y, wp.z, pp);
      d = Math.sqrt((pp.x - x0) * (pp.x - x0) + (pp.y - y0) * (pp.y - y0)) / ds;   // px on the window a unit of path
      sig = Math.max(sig, d); slow = Math.min(slow, d);
      e = Math.log(pp.n / n0) / ds; gr = Math.max(gr, e); sh = Math.max(sh, -e);
      x0 = pp.x; y0 = pp.y; n0 = pp.n;
    }
    for (i = 0; i < F.m.length; i++) L = Math.max(L, Math.abs(F.m[i].lat), Math.abs(F.m[i].ly || 0));
    L += DRIFT_P[1] * F.span;
    for (k = -1; k <= 1; k++) {                           // how fast the way it runs on the window turns, a unit of path: the leader's,
      g0 = x0 = NaN;                                      //  and a bird at either side of the flight's widest (perspective turns them unalike)
      for (s = Math.max(0, a - L - ds); s <= Math.min(F.len, b + L + ds) + 1e-6; s += ds / 2) {
        path3(F, F.sa + s, wp); proj(wp.x - Math.sin(wp.h) * k * L, wp.y, wp.z + Math.cos(wp.h) * k * L, pp);
        if (!(pp.n > 0 && fadeFor(F, pp.n) >= 0.02 && inView(pp.x, pp.y, 0, 0))) { g0 = x0 = NaN; continue; }
        if (x0 === x0) {
          d = Math.sqrt((pp.x - x0) * (pp.x - x0) + (pp.y - y0) * (pp.y - y0)) / (ds / 2); seen = Math.min(seen, d);
          g = Math.atan2(pp.y - y0, pp.x - x0);
          if (g0 === g0) { g0 = g - g0; tr = Math.max(tr, Math.abs(Math.atan2(Math.sin(g0), Math.cos(g0))) / (ds / 2)); }
          g0 = g;
        }
        x0 = pp.x; y0 = pp.y;
      }
    }
    F.v = Math.min(F.vw, 0.92 * topSpeed() / (sig || 1), gr > 0 ? GROW_K * GROW / gr : Infinity, sh > 0 ? 0.9 * SHRINK / sh : Infinity, tr > 0 ? TURN_SEEN * DEG / tr : Infinity);
    F.vLim = Math.min(gr > 0 ? GROW_K * GROW / gr : Infinity, sh > 0 ? 0.9 * SHRINK / sh : Infinity, tr > 0 ? TURN_SEEN * DEG / tr : Infinity); F.vSig = sig;   // (round 3)
    F.q = F.v / F.vw * Math.min(1, Math.min(slow, seen) / F.n0);   // what moves it in seconds, gentled as far again, and as far as any bird of it is seen slower where it heads away: its path turns no sharper
    return F.v >= 0.45 * F.vw && F.v * slow >= SLOWEST;   // (and never so far off and slow that it seems to hang still)
  }
  /* the leader where it is in view: never growing or shrinking faster
     than GROW or SHRINK a second, nor rushing across the window */
  function steady(F, tau) {
    var s = F.sa + F.s0 + F.v * tau, e, v, x, y, n;
    path3(F, s, wp); proj(wp.x, wp.y, wp.z, pp);
    if (pp.n < (F.fadeS ? F.fadeS[1] : FADE) || !inView(pp.x, pp.y, 0, 0)) return true;
    x = pp.x; y = pp.y; n = pp.n;
    path3(F, s + F.v * 0.5, wp); proj(wp.x, wp.y, wp.z, pp);
    e = Math.log(pp.n / n) / 0.5;
    v = Math.sqrt((pp.x - x) * (pp.x - x) + (pp.y - y) * (pp.y - y)) / 0.5;
    return e <= GROW_K * GROW / 0.9 && e >= -SHRINK && v <= 1.1 * topSpeed();
  }

  /* fly a planned flight forward in thought, from flight time it.from to its
     end: every bird (only its bounding birds, on the probe pass) at its
     nearness clear of the words, inside the edges it does not cross, never
     too near, never on top of another of its flight on the window, and
     APART from the other flights. Worked in slices of `budget` bird-steps:
     0 while unfinished, 1 when clear all the way (it.near its room: the
     more, the calmer), -1 */
  /* (trialRun: the module's, i5_plan.js) */
  /* (trialIt: the module's, i5_plan.js) */
  /* the whole trial at once (a flight re-checked after the page moved) */
  /* (trial: the module's, i5_plan.js) */

  /* how far along its path a flight's leader is when it first comes into
     view, and when it is last in view (worked out once a path) */
  /* (entering: the module's, i5_plan.js) */
  function leaving(F) { entering(F); return F.leS; }
  function inSight(F, s) {
    path3(F, F.sa + s, wp); proj(wp.x, wp.y, wp.z, pp);
    return fadeFor(F, pp.n) >= 0.02 && inView(pp.x, pp.y, F.d.hw * pp.n, F.d.hh * pp.n);
  }
  function farOf(F) { return F.fadeS ? F.fadeS[0] : FAR; }   // (birds3d: a staged flight's own distance fade)
  function seen(F, tau) {
    for (var i = 0; i < F.m.length; i++) {
      spot(F, F.m[i], tau, tmp);
      if (tmp.a >= 0.02 && inView(tmp.x, tmp.y, F.m[i].d.hw * tmp.n, F.m[i].d.hh * tmp.n)) return true;
    }
    return false;
  }
  function allInView(F, tau) {
    for (var i = 0, d; i < F.m.length; i++) {
      spot(F, F.m[i], tau, tmp); d = F.m[i].d;
      if (tmp.a < 0.99 || tmp.x - d.hw * tmp.n < 0 || tmp.x + d.hw * tmp.n > W || tmp.y - d.hh * tmp.n < 0 || tmp.y + d.hh * tmp.n > H) return false;
    }
    return true;
  }
  /* the flight's events (a scatter gathering, a straggler, a pair changing
     sides) begin a little after its leader comes into view */
  function placeEvents(F) {
    var a = entering(F), span = Math.max(1, (leaving(F) - a) / F.v), start = (a - F.s0) / F.v;
    F.ev0 = F.still ? -1e4 : start + span * mix(F.r(), 0.08, 0.25);
  }
  function snapshot(F, from) {
    return { path: F.path, dir: F.dir, sa: F.sa, len: F.len, v: F.v, q: F.q, s0: F.s0, dur: F.dur, edges: F.edges, from: from, ev0: F.ev0, n0: F.n0, vw: F.vw, vPx: F.vPx, lean: F.lean, tat: F.tattoo, vLim: F.vLim, vSig: F.vSig,   // (way-path: its nearness and pace as proposed: a lean crossing's own) (shape: and its own calm bounds, vLim and vSig: the guard's pace changes read them)
             soar: F.soar ? JSON.parse(JSON.stringify(F.soar)) : null,
             m: F.m.map(function (m) {
               var c = {}, k;
               for (k in m) if (k !== 'w' && k !== 's' && k !== 'd') c[k] = m[k];
               return c;
             }) };
  }
  function restore(F, k) {
    F.path = k.path; F.dir = k.dir; F.sa = k.sa; F.len = k.len; F.v = k.v; F.q = k.q; F.s0 = k.s0; F.dur = k.dur; F.edges = k.edges; F.from = k.from; F.ev0 = k.ev0;
    if (k.n0 !== undefined) { F.n0 = k.n0; F.vw = k.vw; F.vPx = k.vPx; F.lean = k.lean; F.tattoo = k.tat; }
    if (k.vLim !== undefined) { F.vLim = k.vLim; F.vSig = k.vSig; }   // (shape) the kept path's own bounds: the last proposal's were left here, and the guard sped a lean crossing paced down for its looming to 1.33 of its proposed pace (growth 2.0 %/s, desk seed 7)
    F.yLo = k.yLo; F.yHi = k.yHi; F.xLo = k.xLo; F.xHi = k.xHi;
    if (k.soar) F.soar = k.soar;
    F.m.forEach(function (m, i) { var c = k.m[i], p; for (p in c) m[p] = c[p]; });
  }

  /* how many birds: 1-9 by COUNT (a lively visit leaning larger), never
     four, and never making four with any of the flights in the sky (so
     none can leave four behind when it goes) */
  function makesFour(n, counts) {
    var sums = [0], i, j;
    for (i = 0; i < counts.length; i++) for (j = sums.length - 1; j >= 0; j--) sums.push(sums[j] + counts[i]);
    for (i = 0; i < sums.length; i++) if (n + sums[i] === 4) return true;
    return false;
  }
  function drawCount(r, free, counts) {
    var tries, u, n, acc, i, tot, w = [];
    for (i = 0, tot = 0; i < COUNT.length; i++) { w.push(COUNT[i] * (1 + 0.5 * (fTraffic - 0.5) * (i - 3) / 4)); tot += w[i]; }
    for (tries = 0; tries < 12; tries++) {
      u = r() * tot; acc = 0; n = 1;
      for (i = 0; i < w.length; i++) { acc += w[i]; if (u < acc) { n = i + 1; break; } }
      n = Math.min(n, free);
      if (!makesFour(n, counts)) return n;
    }
    return makesFour(1, counts) ? 0 : 1;
  }
  function drawKind(r, n) {
    var u = r(), wide = W >= SOAR_W;
    if (n === 1) return wide && u < 0.25 ? 'soar' : 'single';
    if (n === 2) return wide && u < 0.15 ? 'soar' : 'pair';
    if (n === 3 && wide && u < 0.1) return 'soar';
    if (u < 0.55) return 'skein';                         // V's, J's and echelons: the flight everyone knows
    if (u < 0.8 || n > 6) return 'line';
    return 'loose';
  }

  /* ---------------- launching: a flight is planned a few paths a frame ---------------- */

  var job = null, q = {};

  /* a new flight: mode 'first' (it enters soon after load), 'next' (the
     scheduler's), 'still' (the composed still sky) */
  /* (startJob: the module's, i5_plan.js) */
  /* (and again after the page moved: what was tried was tried on the old page) */
  function resetJob0() {
    var i, h = 0;
    for (i = 0; i < flights.length; i++) h = Math.max(h, flights[i].dur - (t - flights[i].t0));
    job.t = t + (job.mode === 'next' ? LEAD : 0);           // when the flight sets off
    job.c = 0; job.a = 0; job.best = -1; job.keep = null; job.it = null; job.bands = null;
    job.ahead = job.mode !== 'still' && flights.length ? { t1: job.t, until: t + h, rows: [], cost: 0 } : null;
  }

  /* a path in the air (or a thermal) for the job's flight; true if it is worth a trial */
  /* (propose: the module's, i5_plan.js) */
  /* a trial passed: keep the roomiest path */
  /* (judge: the module's, i5_plan.js) */

  /* work on the job, `quota` bird-steps' worth; the flight once it is in the
     sky, else null (and job null too when nothing found room) */
  /* (workJob: the module's, i5_plan.js) */

  /* (life, DESIGN 3.2) the event glides, found in the path when it is committed: a turn of 25 deg or more entered gliding
     (gull, crow, ibis, swallow 70 %; goose, heron 35 %), from 0.5-1 s before it through it; a descent of 2 deg or more
     glided (set wings), at most EG_DESC s of it. Each bird starts WAVE_DELAY after the bird ahead (nearest first), so a
     flight's glide ripples rather than switches. egW: the glide's weight now, eased in and out over 0.45 s */
  var EG_TURN = { gull: 0.3, crow: 0.3, ibis: 0.3, swallow: 0.5, goose: 0.5, heron: 0.5 }, EG_DESC = { gull: 3, crow: 2.5, ibis: 2, swallow: 2, goose: 2.5, heron: 2.5 }, EG_DESC_P = { gull: 0.35, crow: 0.3, ibis: 0.25, swallow: 0.3, goose: 0.45, heron: 0.45 }, EG_RAMP = 0.45;   // (round 3, kinds: the geese's and herons' only glides, so taken more often: turns 0.12 -> 0.5, descents 0.15 and 0.2 -> 0.45)
  var EGW = { x: 0, y: 0, z: 0 }, EGW2 = { x: 0, y: 0, z: 0 };
  function eventGlides(F) {
    F.eg = []; F.egSet = 0;
    if (F.place || F.soar || !F.m || F.cls === 'day' || F.still) return;
    var m0 = F.m[0], dtS = 0.25, T = F.dur, hs = [], sk = [], i, k = kindOf(F), r = vstream(7100 + (F.id | 0));
    for (var tau = 0; tau <= T; tau += dtS) { where(F, m0, tau, EGW); where(F, m0, tau + dtS, EGW2); var vx = EGW2.x - EGW.x, vy = EGW2.y - EGW.y, vz = EGW2.z - EGW.z; hs.push(Math.atan2(vx, vz)); sk.push(Math.atan2(vy, Math.sqrt(vx * vx + vz * vz))); }
    /* turns: runs where the heading turns faster than 3 deg/s, their whole turn */
    var run0 = -1, tot = 0;
    for (i = 1; i < hs.length; i++) {
      var dh = angDiff(hs[i], hs[i - 1]) / dtS / DEG, on = Math.abs(dh) > 3;
      if (on) { if (run0 < 0) { run0 = i; tot = 0; } tot += dh * dtS; }
      if ((!on || i === hs.length - 1) && run0 >= 0) { if (Math.abs(tot) >= 25 && r() < (EG_TURN[k] || 0.5)) F.eg.push([run0 * dtS - pick(r, [0.5, 0.8]), i * dtS, 'turn']); run0 = -1; }
    }
    /* descents: runs sinking 2 deg or more */
    run0 = -1;
    for (i = 0; i < sk.length; i++) {
      var dn = sk[i] < -2 * DEG;
      if (dn && run0 < 0) run0 = i;
      if ((!dn || i === sk.length - 1) && run0 >= 0) { var a = run0 * dtS, b = i * dtS; if (b - a >= 2 && r() < (EG_DESC_P[k] || 0.2)) { var len = Math.min(b - a, (EG_DESC[k] || 4) * pick(r, [0.7, 1.15])), st = a + (b - a - len) * r(); F.eg.push([st, st + len, 'set']); } run0 = -1; }
    }
    if (k === 'goose') F.egSet = pick(r, [6, 10]);
    /* the wave: each bird's own start, after the bird ahead */
    var order = F.m.map(function (m, j) { return [m.lag || 0, j]; }).sort(function (a, b) { return a[0] - b[0]; });
    for (i = 0; i < order.length; i++) F.m[order[i][1]].egD = i * pick(r, WAVE_DELAY) * (i ? 1 : 0);
  }
  function evGlide(F, m, tau) {
    var E = F.eg; if (!E || !E.length) return 0;
    var d = m.egD || 0, w = 0;
    for (var i = 0; i < E.length; i++) { var a = E[i][0] + d, b = E[i][1] + d; if (tau > a - EG_RAMP && tau < b + EG_RAMP) w = Math.max(w, ease(clamp((tau - a + EG_RAMP) / EG_RAMP, 0, 1)) * ease(clamp((b + EG_RAMP - tau) / EG_RAMP, 0, 1))); }
    return w;
  }
  function commit(F, t1) {
    eventGlides(F);
    var i, j;
    makeRoom(F.m.length);   // (round 3: the birds of a flight the view has turned from, if they are needed)
    F.t0 = t1 - F.from;
    for (i = 0, j = 0; i < slots.length && j < F.m.length; i++) {
      if (slots[i].busy) continue;
      slots[i].busy = true;
      F.m[j].s = slots[i];
      dress(slots[i], F.m[j].d, Math.max(F.m[j].nTry, F.n0) * 1.04);   // its paper: room for it at its nearest
      j++;
    }
    flights.push(F);
  }

  function land(F) {
    F.m.forEach(function (m) { if (m.s) { hide(m.s); m.s.busy = false; m.s = null; } });
    var k = flights.indexOf(F);
    if (k >= 0) flights.splice(k, 1);
  }
  function clearSky() { while (flights.length) land(flights[0]); }
  /* (fix round) any bird of a flight drawn (its ink over 0.02) on the last frame */
  function drawnNow(F) { for (var i = 0; i < F.m.length; i++) { var s = F.m[i].s; if (s && s.on && s.lastOp > 0.02) return true; } return false; }
  var LATE_T = 2;   // s: a flight still drawn at its end fades together over this long

  /* ---------------- the planner in the turning world (round 2) ---------------- */

  /* The live planner's own functions (above, carried over) decide a flight's kind, its birds, its path in the air, its
     pace and its calm, all in the still view (the camera as it will be when the flight sets off, held still: against
     the world). These, in place of the live's of the same names, fly each path through the coming view as well (the
     camera's predicted turn, pitch and roll): where its birds will be seen, so that they come into view only across an
     edge or out of the distance (never in view as the flight is made), keep clear of the words, the edges and the other
     flights there, are seen long enough to be worth the sky, and are not lost behind cloud or the land; and work out a
     path's extent in coarse steps then halves (round 1's 4 px steps made one path's working-out 1200 bird-steps in a
     single step) */
  var pv = {}, pv2 = {}, PW = {};
  var SWEEP_GIVE = 0.7;        // (round 3) a flight going the way of the view's coming turn slows by this share of the turn's sweep ...
  var SWEEP_UP = 0;            // ... and one against it quickens by this share (tried at 0.7: when the turn then reversed, it raced: 55-60 px/s at 1440)
  var FLIP = 0.6;              // (round 3) a flight goes the way of the view's coming turn when it sweeps the land faster than this share of its own pace (round 2: 0.35)

  /* from the path's point out along it (sg: +1 ahead, -1 back) until its leader is OUT beyond the window, gone into the
     distance or below the window's sill: how far that is; null if it would pass behind the eye, come too near in view
     or go under the floor in view. Steps of about 16 px on the window, then the crossing found by halves */
  function walkAt(F, s) {
    path3(F, s, wp); proj(wp.x, wp.y, wp.z, pp);
    if (!(pp.n > 0)) return 1;                            // behind the eye
    if (pp.n > NEAR_MAX && inView(pp.x, pp.y, 0, 0)) return 1;   // too near, in view
    if (wp.y <= floorY) return pp.y > H ? 2 : 1;          // down to the floor: gone below the window's sill, or not a path
    if (pp.n < farOf(F)) return 2;                        // gone into the distance
    if (pp.x < -OUT || pp.x > W + OUT || pp.y < -OUT || pp.y > H + OUT) return 2;
    return 0;
  }
  function walk(F, sg) {
    var s = 0, s0 = 0, i, r, b, lo, hi, mid;
    pp.n = 0;
    for (i = 0; i < 1500; i++) {
      s0 = s; s += sg * 16 / Math.max(0.3, pp.n || F.n0);
      r = walkAt(F, s);
      if (r === 1) return null;
      if (r === 2) {
        lo = s0; hi = s;
        for (b = 0; b < 6; b++) { mid = (lo + hi) / 2; r = walkAt(F, mid); if (r === 1) return null; if (r === 2) hi = mid; else lo = mid; }
        return hi;
      }
    }
    return null;
  }
  /* how far along its path a flight's leader is when it first comes into view, and when it is last in view (the still
     view; worked out once a path, in coarse steps then halves) */
  function sightEdge(F, from, to, sg) {
    var s = from, prev = from, k, b, lo, hi, mid;
    pp.n = F.n0;
    for (k = 0; k < 1500; k++) {
      if (inSight(F, s)) break;
      prev = s; s += sg * 16 / Math.max(0.3, pp.n || F.n0);
      if ((s - to) * sg > 0) return to;
    }
    if (k === 0) return s;
    lo = prev; hi = s;
    for (b = 0; b < 5; b++) { mid = (lo + hi) / 2; if (inSight(F, mid)) hi = mid; else lo = mid; }
    return hi;
  }
  function entering(F) {
    if (F.inS === F.path) return F.enS;
    F.enS = Math.min(sightEdge(F, 0, F.len, 1), F.len);
    F.leS = Math.max(sightEdge(F, F.len, 0, -1), F.enS); F.inS = F.path;
    return F.enS;
  }

  /* where the other flights' birds will be seen at sample k of the coming view (each through its own frame): worked out
     when a trial first needs it, and kept for the job's other paths */
  function aheadRow(A, k) {
    var row = A.rows[k], i, j, G, tau, d;
    if (row) return row;
    row = A.rows[k] = [];
    if (VP.t0 + k * STEP > A.until) return row;
    viewNeed(k);
    for (i = 0; i < flights.length; i++) {
      G = flights[i];
      tau = VP.t0 + k * STEP - G.t0;
      if (tau > G.dur || G.gone) continue;
      viewAtK(G, k);
      for (j = 0; j < G.m.length; j++) {
        spot(G, G.m[j], tau, tmp2);
        A.cost++;
        projV(tmp2.ax, tmp2.ay, tmp2.az, pv2);
        d = G.m[j].d;
        if (pv2.n > 0 && fadeOf(pv2.n) >= 0.02 && inView(pv2.x, pv2.y, d.hw * pv2.n, d.hh * pv2.n)) row.push(pv2.x, pv2.y, d.hw * pv2.n, d.hh * pv2.n, i);
      }
    }
    return row;
  }

  /* fly a planned flight forward in thought through the coming view, a sample (STEP) at a time from the job's start:
     its calm against the world (the live's checks, in the still view: never too quick, growing or shrinking too fast,
     nor any bird turning too sharply), and where it is seen (the coming view): never in view as it is made, in view by
     it.enterBy after it sets off, every bird at its nearness clear of the words, inside the edges it does not cross,
     never too near, never on top of another of its flight, APART from the other flights; done once it has been seen
     at least it.seenMin and none of it has been in view for LEAVE_T (the view turned from it, or it left), or at the
     course's end. Worked in slices of `budget` bird-steps: 0 while unfinished, 1 when clear all the way (it.near its
     room: the more, the calmer), -1 (it.why: what failed) */
  function pfail(J, why) { if (HOST.dev) J.why['p.' + why] = (J.why['p.' + why] || 0) + 1; return false; }
  var TRIALLOG = null;   // (development: every trial's end, when asked)
  function fail(it, why) { if (TRIALLOG && job && job.it === it) TRIALLOG.push({ t: +t.toFixed(2), mode: job.mode, why: why, k: it.k, tau: +(it.from + it.k * STEP).toFixed(1), dir: job.F && job.F.dir, far: job.far, sweep: Math.round(job.sweep), x: pv.x === pv.x ? Math.round(pv.x) : null, y: pv.y === pv.y ? Math.round(pv.y) : null, kind: job.F && job.F.kind, probe: it.probe }); it.why = why; STATS.fails[why] = (STATS.fails[why] || 0) + 1; if (job && HOST.dev) job.why[why] = (job.why[why] || 0) + 1; if (job) { job.nf = (job.nf || 0) + 1; if (why === 'hidden') job.nh = (job.nh || 0) + 1; } return -1; }
  function jobLog(J, F) {   // (development: what each job tried and how it ended)
    if (!HOST.dev) return;
    STATS.jobs.push({ t: +t.toFixed(2), mode: J.mode, ok: !!F, kind: F ? F.kind + ':' + F.sort + ':' + F.n : null, sweep: Math.round(J.sweep || 0), c: J.c, a: J.a, oi: J.oi, why: J.why, far: F ? !!F.farIn : false });
    if (STATS.jobs.length > 60) STATS.jobs.shift();
  }
  function trialRun(F, it, A, budget) {
    var M = F.m, probe = it.probe ? F.probe : null, cnt = probe ? probe.length : M.length, bx = it.bx, wv = it.wv, wt = it.wt, fc = it.fc,
        w0 = work, i, j, m, row, g, gx, gy, e, tau, hw, hh, sw, sh, tp = it.tp, turns = !F.soar && !F.still, any, trust = true, hk, sx, sy,
        calm = !F.soar && !F.still && !it.live && !!HOST.calm, pmax = paceMax(), ox, oy, wx, wy, own;   // (an engine without the calm (HOST.calm) turns as it will: its turn cannot be planned round, and round 2's still-view calm is all there is)
    it.spent = 0;
    if (WIND_ON && !F.place) { windNow(); var wcy = F.cyw === undefined ? 1 : F.cyw, wsy = F.syw === undefined ? 0 : F.syw; WF[0] = (-wcy * WINDV[0] + wsy * WINDV[2]) / MPU; WF[2] = (wsy * WINDV[0] + wcy * WINDV[2]) / MPU; } else WF[0] = WF[2] = 0;   // (way-other: the wind in the flight's frame, air units a second)
    for (;;) {
      tau = it.from + it.k * STEP;
      it.spent = work - w0;                               // (every point of a path worked out: its own birds', the other flights', the course's)
      if (it.spent >= budget) return 0;
      if (tau > it.until) {
        if (!it.live && !probe && !F.soar && !F.still && F.m.length > 1 && it.enter > -1e8 && !it.tailOk) {   // (round 3, step 1: its own spacing to its end)
          var rt = spaceTail(F, it, budget - (work - w0));
          if (rt === 0) { it.spent = work - w0; return 0; }
          if (rt < 0) return fail(it, 'spaceT');
          it.tailOk = true;
        }
        it.end = tau; it.capped = it.last >= tau - 3 * STEP; if (sideOn(it)) return fail(it, 'sideon'); return it.enter > -1e8 || it.live ? 1 : fail(it, 'never');
      }   // (capped: still seen as the trial ends)
      if (!F.soar && tau >= 0 && !steady(F, tau)) return fail(it, 'calm');
      viewNeed(it.k0 + it.k);
      row = A ? aheadRow(A, it.k0 + it.k) : null;
      viewAtK(F, it.k0 + it.k);
      /* (round 3) how far ahead the course is here, and what it may have wrong there: the words' margin widened by it
         (across: the view's turn; up and down: its pitch and roll), all the way, never held to half (round 2 held a
         path past T_TRUST to half the margin, and the drawer then faded birds one by one at the words' edge) */
      hk = (it.k0 + it.k) * STEP;
      trust = it.live || hk <= trustT();
      /* (round 3) the course turning harder than the calm lets the autopilot (a solid's or a cloud's way round, which the
         engine's forecast now flies too): the world's own turn, not this path's, sweeps its birds then; the calm on the
         window is judged where the view keeps the calm (refusing every path through such a turn left DUNES s21's sky
         empty for its first 13 s) */
      var vi = Math.min(Math.max(it.k0 + it.k, 1), VP.n - 1), hard = !VP.still && VP.n > 1 && Math.abs(angDiff(VP.yaw[vi], VP.yaw[vi - 1])) / STEP > CALM_SKIP * calmBase();
      sx = it.live ? 0 : slackX(hk); sy = it.live ? 0 : slackY();
      any = false;
      for (i = 0; i < cnt; i++) {
        m = M[probe ? probe[i] : i];
        bx[4 * i] = NaN;
        spot(F, m, tau, tmp);                              // (its place in the air, and in the still view)
        var hdg = wp.h;                                     // (birds3d: its way in the air, for the side-on gate)
        /* (way-other) in a crosswind, no readable bird crosses the window downwind: slower than the wind its body would face
           upwind while it slid the other way (backward), and its pace is set after the trial (paced) and changes in
           flight; flights cross upwind, or hang in the wind (the path's own way, known exactly: no course needed) */
        if (WIND_ON && !F.place && !F.soar && !F.still && WF[0] !== 0 && Math.abs(WF[0]) * MPU >= WIND_SIDE) {
          if (!it.wpx) it.wpx = new Float64Array(3 * MAXP).fill(-9);
          var okw = it.k > 0 && it.wpx[3 * i + 2] === it.k - 1, pxw = it.wpx[3 * i], pzw = it.wpx[3 * i + 1]; it.wpx[3 * i] = tmp.ax; it.wpx[3 * i + 1] = tmp.az; it.wpx[3 * i + 2] = it.k;
          if (okw && tau >= 0) {   // (W5: its own way across the frame from its places a step apart, as it will be flown: the path's speed alone missed a goose skein crossing downwind at 3.9 m/s)
            var oxw = (tmp.ax - pxw) / STEP, ozw = (tmp.az - pzw) / STEP, axw = oxw - WF[0], azw = ozw + (FL.speed || 0) / MPU - WF[2], frw = axw * PV.cd + azw * PV.sd, mvw = oxw * PV.cd + ozw * PV.sd;
            if (mvw * frw < 0 && Math.abs(frw) > FACE_SIN * Math.sqrt(axw * axw + azw * azw) && Math.abs(mvw) * tmp.n > BACK_PX && fadeOf(tmp.n) > 0.02) return fail(it, 'back');   // (round 3, alive: only a body yawed past FACE_SIN toward the side it slides from faces back; a downwind crossing is no longer refused as such)   // (shape: from the moment it is in the air at all, not only once it is 0.3 seen: the trial ends with the trusted course, and an ibis line out of the distance, faded under 0.3 through it, slid backward at 18 px/s for 35 s after it, desk seed 3)
          }
        }
        if (tmp.x !== tmp.x || tmp.y !== tmp.y) return fail(it, 'nan');
        /* the calm against the world: never turning sharply on the window, all it does in seconds and all (but a
           finch's bound), where the still view sees it */
        sw = m.d.hw * tmp.n; sh = (m.d.hh + BOB * m.d.span) * tmp.n;
        if (turns && !m.w.bound && tau >= 0 && tmp.a >= 0.02 && inView(tmp.x, tmp.y, sw, sh)) {
          j = 5 * i; gx = tmp.x - tp[j]; gy = tmp.y - tp[j + 1];  // (the way it went since it last moved half a px, and when: the middle of that)
          if (gx !== gx) { tp[j] = tmp.x; tp[j + 1] = tmp.y; tp[j + 2] = NaN; tp[j + 3] = tau; }
          else if (gx * gx + gy * gy > 0.25) {
            g = Math.atan2(gy, gx); gx = g - tp[j + 2]; gy = (tp[j + 3] + tau) / 2;
            if (Math.abs(Math.atan2(Math.sin(gx), Math.cos(gx))) > TURN_MAX * DEG * (gy - tp[j + 4])) return fail(it, 'turn');
            tp[j] = tmp.x; tp[j + 1] = tmp.y; tp[j + 2] = g; tp[j + 3] = tau; tp[j + 4] = gy;
          }
        } else tp[5 * i] = NaN;
        /* where it is seen */
        projV(tmp.ax, tmp.ay, tmp.az, pv);
        if (!(pv.n > 0) || fadeOf(pv.n) < 0.02) { wv[5 * i] = NaN; wt[2 * i] = NaN; continue; }   // behind the eye, or gone into the distance
        hw = m.d.hw * pv.n; hh = (m.d.hh + BOB * m.d.span) * pv.n;   // its ink at its nearness, and the room its bob takes
        e = F.soar && tau >= m.tj && tau < m.tx ? 0 : F.edges | 3;   // (a soaring bird circles wholly inside the window; a turn of the view may carry any flight out of either side)
        if (!inView(pv.x, pv.y, hw, hh)) { if (!e && it.enter > -1e8) return fail(it, 'soar'); wv[5 * i] = NaN; wt[2 * i] = NaN; continue; }
        if (it.k === 0 && !it.live && !F.still) return fail(it, 'pop');   // (in view as it is made: never)
        any = true;
        if (pv.n > NEAR_MAX) return fail(it, 'near');
        if (!clearOfWordsS(pv.x, pv.y, hw, hh, sx, sy)) {
          if (trust) return fail(it, 'words');
          /* ('late': past the trusted course the course's error is wide: on the words themselves there, not this path;
             within their widened margin, a path the less roomy (judge) and left to the guard, which eases a flight
             that does come near them, or lets it go whole) */
          held = 0.5; var lw = clearOfWords(pv.x, pv.y, hw, hh); held = 1;
          if (!lw) return fail(it, 'late');
          it.late += STEP;
        }
        if (trust && !withinEdges(pv.x, pv.y, hw, hh, e)) return fail(it, 'edge');
        it.near = Math.min(it.near, room(pv.x, pv.y, hw, hh, e));
        it.yLo = Math.min(it.yLo, pv.y - hh); it.yHi = Math.max(it.yHi, pv.y + hh);   // the band it flies in (and how far across)
        it.xLo = Math.min(it.xLo, pv.x - hw); it.xHi = Math.max(it.xHi, pv.x + hw);
        if (!probe) { if (pv.n > m.nTry) m.nTry = pv.n; bx[4 * i] = pv.x; bx[4 * i + 1] = pv.y; bx[4 * i + 2] = hw - (m.d.halo || 0) * pv.n; bx[4 * i + 3] = hh - (m.d.halo || 0) * pv.n; }   // (fix round: the paper's box for the spacing, the halo left out)
        /* (birds3d) the side-on gate and the tattoo's share: where a readable bird (12 device px of span or more) is
           seen from (its world way: its own and the camera's, against the line of sight): side-on (70-110 deg off its
           tail) the 3D M closes to a profile; below and behind (0-60 deg, seen from below) it is the tattoo's view */
        if (!probe && !F.soar && !F.still && (trust || WIND_ON && WF[0] !== 0) && m.d.span * pv.n * (VW.dpr || 1) >= 12) {   // (way-other, W7: in a wind its whole crossing counted: the crab turns a bird side-on late in a long crossing)
          var vo = F.v * F.q, vxa = vo * Math.cos(hdg), vza = vo * Math.sin(hdg) + (FL.speed || 0) / MPU, vya = F.path.g * vo;
          if (WIND_ON && !F.place && WF[0] !== 0) {   // (way-other) its way through the air, the body's: its own way from its places a step apart (W6: the path's speed alone missed it), the frame's, less the wind
            if (!it.wpp) it.wpp = new Float64Array(4 * MAXP).fill(-9);
            var p3 = 4 * i, ok3 = it.k > 0 && it.wpp[p3 + 3] === it.k - 1, px3 = it.wpp[p3], py3 = it.wpp[p3 + 1], pz3 = it.wpp[p3 + 2];
            it.wpp[p3] = tmp.ax; it.wpp[p3 + 1] = tmp.ay; it.wpp[p3 + 2] = tmp.az; it.wpp[p3 + 3] = it.k;
            if (ok3) { vxa = (tmp.ax - px3) / STEP; vya = (tmp.ay - py3) / STEP; vza = (tmp.az - pz3) / STEP + (FL.speed || 0) / MPU; }
            vxa -= WF[0]; vza -= WF[2];
          }
          var la = Math.sqrt(tmp.ax * tmp.ax + tmp.ay * tmp.ay + tmp.az * tmp.az) || 1, lv = Math.sqrt(vxa * vxa + vya * vya + vza * vza) || 1;
          var azo = Math.acos(clamp((vxa * tmp.ax + vya * tmp.ay + vza * tmp.az) / (la * lv), -1, 1)) / DEG;
          it.readT += STEP; if (azo >= 70 && azo <= 110) it.sideT += STEP; if (azo <= 60 && tmp.ay > 0) it.tatT += STEP;
          { var tlv = Math.sqrt(vxa * vxa + vza * vza) || 1, txv = vza / tlv, tzv = -vxa / tlv, hsv = 0.5 * m.d.span;   // (round 3, step 3: its wings' line on the window)
            projV(tmp.ax + txv * hsv, tmp.ay, tmp.az + tzv * hsv, TP1); projV(tmp.ax - txv * hsv, tmp.ay, tmp.az - tzv * hsv, TP2); work += 2;
            if (TP1.n > 0 && TP2.n > 0 && Math.abs(Math.atan2(TP2.y - TP1.y, Math.abs(TP2.x - TP1.x) + 1e-9)) / DEG > TILT_MAX) it.tiltT = (it.tiltT || 0) + STEP; }
          if (LEAN_PLAN) { var lr = leanAir(F, m, tmp, hdg); work += 2; if (lr === lr && lr <= (P95K[kindOf(F)] || 0.065)) it.leanT += STEP; }   // (way-path: the physical lean, as the judges measure it)
        }
        if (row && trust) for (j = 0; j < row.length; j += 5) {
          gx = Math.abs(pv.x - row[j]) - hw - row[j + 2];
          gy = Math.abs(pv.y - row[j + 1]) - hh - row[j + 3];
          g = Math.max(gx, gy);
          if (g < APART) return fail(it, 'apart');
          it.apart = Math.min(it.apart, g);
        }
        if (row && row.length) { BK[0] = Math.min(BK[0], pv.y - hh); BK[1] = Math.max(BK[1], pv.y + hh); BK[2] = Math.min(BK[2], pv.x - hw); BK[3] = Math.max(BK[3], pv.x + hw); }
        /* (round 3) the live's calm, on the window as it will be seen (the coming view, through the trusted course):
           never sliding backward against the way it faces (its own motion, the view held, sets its facing, as the
           drawer's tracker does), never racing across, never bending sharply. Round 2 judged these in the still view
           only, and a turning view swept birds backward, at twice the live's pace, or round a bend */
        if (calm && trust && hard) { wv[5 * i] = NaN; wt[2 * i] = NaN; }
        else if (calm && trust) {
          j = 5 * i;
          if (wv[j] === wv[j]) {
            projV(wv[j + 2], wv[j + 3], wv[j + 4], pv2);   // (where it was, through this view: its own motion)
            ox = (pv.x - pv2.x) / STEP; oy = (pv.y - pv2.y) / STEP; own = Math.sqrt(ox * ox + oy * oy);
            wx = (pv.x - wv[j]) / STEP; wy = (pv.y - wv[j + 1]) / STEP;
            if (WIND_ON && !F.place) {   // (way-other) the way it faces is its body's: its way through the air (its own, the frame's, less the wind) along the window's right
              var axr = (tmp.ax - wv[j + 2]) / STEP - WF[0], azr = (tmp.az - wv[j + 4]) / STEP + (FL.speed || 0) / MPU - WF[2], frr = axr * PV.cd + azr * PV.sd;
              var fra = Math.sqrt(axr * axr + azr * azr); fc[i] = Math.abs(frr) > FACE_SIN * fra && Math.abs(frr) > 0.5 ? (frr < 0 ? -1 : 1) : 0;   // (round 3, alive: a body within FACE_SIN of the view's axis, seen from behind or before, has no side)
              if (Math.sqrt(axr * axr + azr * azr) * MPU < (AIR_MIN[F.sort] || 6) && fadeOf(pv.n) > 0.3) return fail(it, 'air');   // (way-other: too slow through the air to fly)
            } else if (Math.abs(ox) > 0.5 && Math.abs(ox) > FACE_HYST * own) fc[i] = ox < 0 ? -1 : 1;
            if (fc[i] && wx * fc[i] < -BACK_PX && fadeOf(pv.n) > 0.3) return fail(it, 'back');
            /* (shape) the calm's own bars as the judges measure them, the view held (its own motion through one camera),
               every bird as it will be drawn (drift, wander, gusts, the figure turned by the crab), over about a second
               (three steps): never growing faster than GROW (the path's share was GROW_K of it, the drift's the rest, and
               a near gull line's drift took it to 1.39 %/s, phone seed 7), nor its way on the window turning faster than
               WTURN1 (the planner's WTURN is over single steps: slow gulls wobbling reached 26.7 deg/s on 1 s, desk seed 3) */
            if (!it.gq) it.gq = new Float64Array(8 * MAXP).fill(NaN);
            var gb = 8 * i, gq = it.gq;
            if (gq[gb + 7] !== it.k - 1) { gq[gb] = gq[gb + 1] = gq[gb + 2] = gq[gb + 3] = gq[gb + 4] = gq[gb + 5] = NaN; }
            gq[gb + 7] = it.k;
            gq[gb] = gq[gb + 1]; gq[gb + 1] = gq[gb + 2]; gq[gb + 2] = pv2.n > 0 ? Math.log(pv.n / pv2.n) / STEP : NaN;
            if (fadeOf(pv.n) > 0.3 && (gq[gb] + gq[gb + 1] + gq[gb + 2]) / 3 > GROW) return fail(it, 'grow');
            if (own > 2) {
              var ga = Math.atan2(oy, ox);
              if (gq[gb + 3] === gq[gb + 3] && fadeOf(pv.n) > 0.3 && Math.abs(angDiff(ga, gq[gb + 3])) > WTURN1 * DEG * 3 * STEP) return fail(it, 'wturn1');
              gq[gb + 3] = gq[gb + 4]; gq[gb + 4] = gq[gb + 5]; gq[gb + 5] = ga;
            } else gq[gb + 3] = gq[gb + 4] = gq[gb + 5] = NaN;
            if (wx * wx + wy * wy > pmax * pmax) { it.paceT += STEP; if (it.paceT > PACE_T || wx * wx + wy * wy > 1.4 * pmax * pmax) return fail(it, 'pace'); }   // (a moment over it at a window's stretched edge, but no more)
            if (wx * wx + wy * wy < SLOW_SEEN * SLOW_SEEN && fadeOf(pv.n) > 0.3) { it.slowT += STEP; if (it.slowT > PACE_T) return fail(it, 'hang'); }   // (nor hanging on the window, the view's turn all but cancelling its own way: the live's SLOWEST)
            gx = wt[2 * i]; gy = wt[2 * i + 1];
            if (gx === gx && wx * wx + wy * wy > 36 && gx * gx + gy * gy > 36 && Math.abs(Math.atan2(gx * wy - gy * wx, gx * wx + gy * wy)) > WTURN * DEG * STEP) return fail(it, 'wturn');
            wt[2 * i] = wx; wt[2 * i + 1] = wy;
          } else wt[2 * i] = NaN;
          wv[j] = pv.x; wv[j + 1] = pv.y; wv[j + 2] = tmp.ax; wv[j + 3] = tmp.ay; wv[j + 4] = tmp.az;
        }
      }
      /* one flight to a band while both are seen: two in one band at once read as one long train (unless the words
         stand between them); the live judged it over the whole crossing, but here a turn of the view carries flights
         through and out, and two that are never seen together never make a train (round 3: nor do two that share a
         band for a moment, as a turn carries one past the other: BAND_T of it at most) */
      if (row && row.length && BK[0] < BK[1] && !F.still && trust && !bandsClear(row)) { it.bandT += STEP; if (it.bandT > BAND_T) return fail(it, 'band'); }
      BK[0] = BK[2] = Infinity; BK[1] = BK[3] = -Infinity;
      if (!probe) for (i = 0; i < cnt; i++) {    // two of its birds, near and far, never on top of one another on the window (fix round: the whole way, not only through the trusted course: past it the view's error turns the flight, it does not part its birds)
        if (bx[4 * i] !== bx[4 * i]) continue;
        for (j = i + 1; j < cnt; j++) {
          if (bx[4 * j] !== bx[4 * j]) continue;
          g = Math.max(Math.abs(bx[4 * i] - bx[4 * j]) - bx[4 * i + 2] - bx[4 * j + 2], Math.abs(bx[4 * i + 1] - bx[4 * j + 1]) - bx[4 * i + 3] - bx[4 * j + 3]);
          if (g < SPACE_SEEN) return fail(it, 'space');
        }
      }
      if (any) { if (it.enter < -1e8) it.enter = tau; it.last = tau; it.seen += STEP; }
      else if (it.enter < -1e8) { if (!it.live && tau > it.enterBy) return fail(it, 'never'); }
      else if (tau - it.last > LEAVE_T && tau >= 0) {   // none of it in view a while: done (the view turned from it, or it left)
        it.end = tau;
        if (sideOn(it)) return fail(it, 'sideon');
        return it.seen >= it.seenMin || it.live || F.still ? 1 : fail(it, 'short');
      }
      it.k++;
    }
  }
  /* (round 3, step 1) a flock's birds apart on the window (the still view) from the trial's horizon to its end: 1 clear,
     0 unfinished (its budget spent), -1 two of its birds within SPACE_SEEN */
  var TAIL_MAX = 90, SPT = new Float64Array(4 * MAXP), SPO = {};
  function spaceTail(F, it, budget) {
    var M = F.m, n = M.length, i, j, tau, w0 = work, g, nn, hw, hh, d, end = Math.min(F.dur, it.until + TAIL_MAX);
    if (it.tk === undefined) it.tk = 1;
    for (;;) {
      tau = it.until + it.tk * STEP;
      if (tau > end) return 1;
      if (work - w0 >= budget) return 0;
      for (i = 0; i < n; i++) {
        SPT[4 * i] = NaN; d = M[i].d;
        spot(F, M[i], tau, SPO); nn = SPO.n;
        if (!(nn > 0) || fadeOf(nn) < 0.02) continue;
        hw = (d.hw - (d.halo || 0)) * nn; hh = (d.hh + BOB * d.span - (d.halo || 0)) * nn;
        if (!inView(SPO.x, SPO.y, hw, hh)) continue;
        SPT[4 * i] = SPO.x; SPT[4 * i + 1] = SPO.y; SPT[4 * i + 2] = hw; SPT[4 * i + 3] = hh;
      }
      for (i = 0; i < n; i++) {
        if (SPT[4 * i] !== SPT[4 * i]) continue;
        for (j = i + 1; j < n; j++) {
          if (SPT[4 * j] !== SPT[4 * j]) continue;
          g = Math.max(Math.abs(SPT[4 * i] - SPT[4 * j]) - SPT[4 * i + 2] - SPT[4 * j + 2], Math.abs(SPT[4 * i + 1] - SPT[4 * j + 1]) - SPT[4 * i + 3] - SPT[4 * j + 3]);
          if (g < SPACE_SEEN) return -1;
        }
      }
      it.tk++;
    }
  }
  /* (birds3d) a travelling path whose readable birds would spend over SIDE_GATE of their time side-on: not flown */
  var TILT_MAX = 30, TILT_SHARE = 0.3, TILT_EMPTY = 8, TP1 = {}, TP2 = {};   // (round 3, step 3) deg; of the readable time; s: an empty sky this long takes a hook rather than wait (a hard gate left phones empty 70 s)
  function sideOn(it) {
    if (it.live || it.probe || !(it.readT > 2)) return false;
    if (it.sideT > SIDE_GATE * it.readT) return true;
    if ((it.tiltT || 0) > TILT_SHARE * it.readT && t - lastSeenAny < TILT_EMPTY) { STATS.hook = (STATS.hook || 0) + 1; return true; }   // (round 3, step 3: a hook on the window, refused while the sky has birds)
    return false;
  }
  var BK = [Infinity, -Infinity, Infinity, -Infinity], BG = [], BSTAMP = 0, BA = { yLo: 0, yHi: 0, xLo: 0, xHi: 0 }, BB = { yLo: 0, yHi: 0, xLo: 0, xHi: 0 };
  function bandsClear(row) {
    var j, g, n = 0, st = ++BSTAMP;
    for (j = 0; j < row.length; j += 5) {   // (each other flight's extent on the window at this moment)
      g = row[j + 4];
      if (BG[3 * g] === undefined || BG[3 * g + 2] !== st) { BG[3 * g] = Infinity; BG[3 * g + 1] = -Infinity; BG[3 * g + 2] = st; BG[3 * (g + 100)] = Infinity; BG[3 * (g + 100) + 1] = -Infinity; }
      BG[3 * g] = Math.min(BG[3 * g], row[j + 1] - row[j + 3]); BG[3 * g + 1] = Math.max(BG[3 * g + 1], row[j + 1] + row[j + 3]);
      BG[3 * (g + 100)] = Math.min(BG[3 * (g + 100)], row[j] - row[j + 2]); BG[3 * (g + 100) + 1] = Math.max(BG[3 * (g + 100) + 1], row[j] + row[j + 2]);
      n = Math.max(n, g + 1);
    }
    BA.yLo = BK[0]; BA.yHi = BK[1]; BA.xLo = BK[2]; BA.xHi = BK[3];
    for (g = 0; g < n; g++) {
      if (BG[3 * g + 2] !== st || !(BG[3 * g] < BG[3 * g + 1])) continue;
      BB.yLo = BG[3 * g]; BB.yHi = BG[3 * g + 1]; BB.xLo = BG[3 * (g + 100)]; BB.xHi = BG[3 * (g + 100) + 1];
      if (BA.yLo < BB.yHi + BAND_GAP && BA.yHi > BB.yLo - BAND_GAP && !between(BA, BB)) return false;
      BG[3 * g + 2] = -1;   // (done with this row's flight)
    }
    return true;
  }
  /* (round 3) the open bands cut off where a level crossing at the flight's nearness would be under the floor (FLOOR_T
     over the ground: walk() turns such a path down, so a point there is no path; round 2 drew most of its points there
     in DUNES, where the floor stands a few degrees under the horizon, and walked each out to find it so) */
  function floorClip(B, F) {
    if (!(floorY > -1e5)) return B;
    var Y = floorY + 2 * F.span + F.hi / F.n0, ymax = cam.y0 - (Y * F.n0 - cam.f * cam.s) / cam.c - F.hi, out = [], i;
    for (i = 0; i < B.length; i++) if (B[i][0] < ymax) out.push([B[i][0], Math.min(B[i][1], ymax)]);
    return out;
  }
  /* (round 3) the fastest a bird may cross the window as it will be seen: the live's fastest (topSpeed, in the still
     view) and the calm's sweep, stretched at a window's edge by the lens (PACE_SEEN of it) */
  function paceMax() { return topSpeed() + PACE_SEEN * CALM_K * (W / across(CALM)); }
  /* (round 3) a trial's arrays, kept between trials: the job's (TA) and a flight re-checked's (TB) */
  function trialArrays() { return { bx: new Float64Array(4 * MAXP), tp: new Float64Array(5 * MAXP), wv: new Float64Array(5 * MAXP), wt: new Float64Array(2 * MAXP), fc: new Int8Array(MAXP) }; }
  var TA = trialArrays(), TB = trialArrays();
  /* a trial of the job's flight, from the job's start (the coming view's first sample); probe: its bounding birds only */
  function trialIt(J, F, probe) {
    var still = J.mode === 'still', from = still ? 0 : VP.t0 - J.t;
    var cross = Math.max(4, F.dur - Math.max(0, F.s0 > 0 ? 0 : 0) - 2 * OUT / (F.v * F.n0 || SPEED[1]));
    return { from: from, k: 0, k0: 0, near: ROOMY, apart: 200, probe: probe, spent: 0, yLo: Infinity, yHi: -Infinity, xLo: Infinity, xHi: -Infinity,
             bx: TA.bx, tp: TA.tp.fill(NaN), wv: TA.wv.fill(NaN), wt: TA.wt.fill(NaN), fc: TA.fc.fill(0), bandT: 0, paceT: 0, slowT: 0, late: 0, enter: -1e9, last: -1e9, seen: 0, end: 0, why: '', live: false, readT: 0, sideT: 0, tatT: 0, leanT: 0,
             enterBy: J.mode === 'first' ? ENTER_BY[0] : ENTER_BY[1], seenMin: still ? 0 : clamp(0.35 * cross, SEEN_MIN[0], SEEN_MIN[1]),
             until: still ? F.dur : Math.min(VP.t0 + (VP_N - 1) * STEP - J.t, F.dur + 30, VP.t0 + VP.end + 2 - J.t, VP.t0 + trustT() + TRIAL_PAST - J.t) };   // (round 3: no further than TRIAL_PAST past the trusted course: the course a guess there, the guard watches the flight; round 2 flew every trial up to 30 s past the flight's end, and a job could take 6 s)
  }
  /* the whole trial at once (a flight re-checked after the page moved), from now, through a fresh course */
  function trial(F, from) {
    var it = { from: from, k: 0, k0: 0, near: ROOMY, apart: 200, probe: false, spent: 0, yLo: Infinity, yHi: -Infinity, xLo: Infinity, xHi: -Infinity,
               bx: TB.bx, tp: TB.tp.fill(NaN), wv: TB.wv.fill(NaN), wt: TB.wt.fill(NaN), fc: TB.fc.fill(0), bandT: 0, paceT: 0, slowT: 0, late: 0, enter: -1e9, last: -1e9, seen: 0, end: 0, why: '', live: true, readT: 0, sideT: 0, tatT: 0,
               enterBy: 1e9, seenMin: 0, until: Math.min(F.dur, from + 30) };
    return trialRun(F, it, null, Infinity) > 0 ? it.near : -1;
  }

  /* (round 3, step 1) the share (0-1) of a level crossing's heading and climb its band leaves room for: its leader's
     line on the window, through (qx, qy) at its nearness, inside the window's top and bottom margins (its reach above
     and below) at both side edges, and over every word box's width clear of the box, its margin and the course's slack */
  var FWP = {}, FPP = {}, FIT_K = 0, THIN_SKY = 0.2;   // (THIN_SKY: open bands under this share of the window's height: a thin sky, its steeper paths tried from the first)
  /* (round 3, step 1) a flock's reach above (reachUp) and below (reachDn) its leader's height y on the window beyond
     its figure's on the window's plane: its nearer birds farther from the horizon line, its farther ones nearer it */
  function reachUp(F, y) {
    if (!F.dzN && !F.dzF) return 0;
    var Z0 = cam.f / F.n0, rN = Z0 / Math.max(0.3 * Z0, Z0 + F.dzN), rF = Z0 / (Z0 + F.dzF), E = cam.hy - y;
    return (E >= 0 ? E * (rN - 1) : -E * (1 - rF)) + F.inkR * F.n0 * (rN - 1);
  }
  function reachDn(F, y) {
    if (!F.dzN && !F.dzF) return 0;
    var Z0 = cam.f / F.n0, rN = Z0 / Math.max(0.3 * Z0, Z0 + F.dzN), rF = Z0 / (Z0 + F.dzF), E = cam.hy - y;
    return (E >= 0 ? E * (1 - rF) : -E * (rN - 1)) + F.inkR * F.n0 * (rN - 1);
  }
  /* the open bands narrowed by that reach: the heights whose flock stays inside its band's own limits */
  function trueBands(B, F) {
    if (F.soar || (!F.dzN && !F.dzF)) return B;
    var out = [], i, y, a, b, s0, ok;
    for (i = 0; i < B.length; i++) {
      a = B[i][0]; b = B[i][1]; s0 = null;
      for (y = a; y <= b; y += 1) {
        ok = y - reachUp(F, y) >= a && y + reachDn(F, y) <= b;
        if (ok && s0 === null) s0 = y;
        else if (!ok && s0 !== null) { out.push([s0, y - 1]); s0 = null; }
      }
      if (s0 !== null) out.push([s0, Math.min(b, y - 1)]);
    }
    return out.filter(function (v) { return v[1] > v[0]; });
  }
  function lineFits(F, qx, qy, hd, climb) {
    var h = F.dir > 0 ? hd : Math.PI - hd, L = 40, dx, sl, top = EDGE + F.lo, bot = H - EDGE - F.hi, yl, yr, i, o, m, xa, xb, ya, yb, sy = slackY() + 2;
    unproj(qx, qy, F.n0, FWP);
    proj(FWP.x + L * Math.cos(h), FWP.y + L * Math.tan(climb), FWP.z + L * Math.sin(h), FPP);
    if (!(FPP.n > 0)) return false;
    dx = FPP.x - qx; if (Math.abs(dx) < 1e-6) return false;
    sl = (FPP.y - qy) / dx; yl = qy - qx * sl; yr = qy + (W - qx) * sl;
    if (yl - reachUp(F, yl) < top || yl + reachDn(F, yl) > bot || yr - reachUp(F, yr) < top || yr + reachDn(F, yr) > bot) return false;
    for (i = 0; i < words.length; i++) {
      o = words[i]; m = o.m; xa = Math.max(0, o.l - m); xb = Math.min(W, o.r + m);
      if (xb <= xa) continue;
      ya = qy + (xa - qx) * sl; yb = qy + (xb - qx) * sl;
      if (Math.max(ya, yb) + reachDn(F, Math.max(ya, yb)) > o.t - m - sy - F.hi && Math.min(ya, yb) - reachUp(F, Math.min(ya, yb)) < o.b + m + sy + F.lo) return false;
    }
    return true;
  }
  function bandFit(F, qx, qy, hd, climb) {
    if (lineFits(F, qx, qy, hd, climb)) return 1;
    if (!lineFits(F, qx, qy, 0, 0)) return 1;   // (a point whose flat crossing does not fit either: left to the trial)
    var lo = 0, hi = 1, k, i;
    for (i = 0; i < 7; i++) { k = (lo + hi) / 2; if (lineFits(F, qx, qy, hd * k, climb * k)) lo = k; else hi = k; }
    return lo;
  }

  /* a path in the air (or a thermal) for the job's flight; true if it is worth a trial */
  function propose(J) {
    var F = J.F, qx, qy, lap = 0, u, hd, turn, climb, plain, open, i;
    if (J.pend) { J.pend = false; return propose2(J); }
    J.a++;
    r2next(q);
    J.diag = false; J.far = false;
    setYaw(F, J.yaw);
    { var dpW = angDiff(FL.psi || 0, F.yaw); F.wsX = -Math.sin(dpW); F.wsZ = Math.cos(dpW); F.wsS = (FL.speed || 0) / MPU; }   // (round 3: the camera's course in this frame, held: the flight's own world speed is along it)
    /* (round 3) paths found behind cloud: the next ones nearer (the flight in front of the towers, not behind them) */
    if (F.n00 === undefined) F.n00 = F.n0;
    if (!F.soar) F.n0 = Math.min(F.n00 * (J.near ? 1.6 : 1 + 0.3 * Math.min(J.hid || 0, 2)), 0.9 * NEAR_MAX);
    if (!J.bands) { BANDSLACK = slackY() + 2; J.bands = trueBands(floorClip(openBands(F.lo, F.hi), F), F); BANDSLACK = 0; }   // (round 3, step 1: narrowed by the flock's reach in depth)   // (round 3: the bands clear of the words' margin and the course's slack up and down, and over the floor)
    if (F.soar) {
      qy = inBands(J.bands, q.y);
      if (qy === null) { J.a = 1e9; return false; }      // no band holds the thermal (the job's tries are up)
      unproj(mix(q.x, 0.08, 0.92) * W, qy, F.n0, wp);
      soarTimes(F, wp.x, wp.y, wp.z);
    } else {
      J.climb = F.climb && !J.fill && J.mode !== 'still' && J.a <= TRIES / 2;    // climbing away or coming down, if it finds room
      open = J.bands.length > 0;                          // (no open band: the words stand across the whole sky, as on a phone turned sideways)
      for (var bi = 0, btot = 0; bi < J.bands.length; bi++) btot += J.bands[bi][1] - J.bands[bi][0];   // (round 3, step 1: a thin sky)
      J.diag = J.climb || (J.a > 2 * TRIES && J.best < 0 && J.a % 2 === 0) || ((!open || btot < THIN_SKY * H) && J.a % 2 === 0);   // no level crossing fits: try the steeper paths (now and then)
      /* (shape, step 4d: the lean's height) with LEAN_H > 0 a lean crossing is decided before its point, and that share of
         them takes, of the open sky's next eight points, the one whose height asks the heading (the kind's mark's lean
         over the height's own: tan psi = tan lean / tan elevation) nearest what this crossing can fly through the air
         (from its least pace to the lean's top, the crosswind adding upwind): higher where the view is level (the
         desktop), lower where the wind alone gives more than the mark asks (a gull in a strong crosswind on a phone). A
         preference among clear points, never a gate. LEAN_H 0: as before, the stream of draws unchanged */
      var leanPre = -1, pickH = false;
      if (LEAN_H > 0 && LEAN_PLAN && !J.diag && open && !J.climb && J.mode !== 'still' && J.mode !== 'first' && (FL.speed || 0) > 2) { leanPre = F.r() < LEAN_MODE ? 1 : 0; pickH = leanPre === 1 && F.r() < LEAN_H; }   // (not the first flight: it simply crosses, soon; with it, desk seed 3's sky stood empty its first 27 s)
      if (pickH) {
        var mkH = markOf(kindOf(F)), tlH = Math.atan2(mkH[9] - mkH[1], mkH[8] - mkH[0]), wxH = 0, wzH = 0, bestH = Infinity, qxH = 0, qyH = 0;
        if (WIND_ON && LEAN_AIR) { windNow(); wxH = (-F.cyw * WINDV[0] + F.syw * WINDV[2]) / MPU; wzH = (F.syw * WINDV[0] + F.cyw * WINDV[2]) / MPU; }
        var fwdH = (FL.speed || 12) / MPU - wzH, upH = J.dir * wxH < 0 ? Math.abs(wxH) : -Math.abs(wxH), topH = LEAN_PACE * topSpeed();
        var aMinH = Math.max(0, SPEED[0] / Math.max(LEAN_N0, F.n0) + upH), pMinH = Math.atan2(aMinH, fwdH), pMaxH = Math.atan2(Math.max(aMinH, topH / LEAN_N0 + upH), fwdH);
        for (i = 0; i < 8; i++, r2next(q)) {
          var qxc = q.x * W, qyc = inBands(J.bands, q.y);
          if (qyc === null || !clearOfWords(qxc, qyc, F.d.hw * F.n0, F.d.hh * F.n0) || !(unproj(qxc, qyc, F.n0, wp).y > floorY + 2 * F.span)) continue;
          var elH = Math.atan2(wp.y, Math.sqrt(wp.x * wp.x + wp.z * wp.z)), pN = Math.atan(Math.tan(tlH) / Math.max(Math.tan(elH), 0.05)), cH = Math.abs(pN - clamp(pN, pMinH, pMaxH));
          if (cH < bestH - 1e-9) { bestH = cH; qxH = qxc; qyH = qyc; }
        }
        if (bestH === Infinity) return pfail(J, 'nopoint');
        qx = qxH; qy = qyH; i = 0;
      } else
      for (i = 0; i < 8; i++, r2next(q)) {                // its middle somewhere in the open sky, never in the words ...
        qx = q.x * W;
        qy = J.diag || !open ? mix(q.y, 0.04, 0.96) * H : inBands(J.bands, q.y);   // ... a level crossing's in an open band
        if (qy !== null && clearOfWords(qx, qy, F.d.hw * F.n0, F.d.hh * F.n0) && unproj(qx, qy, F.n0, wp).y > floorY + 2 * F.span) break;   // (round 3: nor under the floor where it crosses; step 1: a steeper path's point too)
      }
      if (i === 8) return pfail(J, 'nopoint');
      plain = open && (J.mode === 'still' || J.fill || (J.mode === 'first' && J.a > TRIES / 4));   // (the first flight, if it finds no room soon, simply crosses)
      u = plain ? 0 : weighted(F.r, [[0, open ? HEAD_W[0] : 0], [1, HEAD_W[1]], [2, HEAD_W[2]]]);   // across the window, angling away, or coming nearer (with no open band, never straight across)
      hd = pick(F.r, HEAD[u]) * DEG * (u === 0 && F.r() < 0.5 ? -1 : 1);
      if (J.hdPref !== null && J.hdPref !== undefined && !J.diag) {   /* (life) the roost's way: off the window's plane as far as the bearing asks, within the kinds of path the planner flies */
        var hp = clamp(J.hdPref + 8 * (F.r() * 2 - 1), -30, HEAD_MAX);
        u = hp > 25 ? 1 : hp < -12 ? 2 : 0; if (plain && u) { u = 0; hp = clamp(hp, -25, 25); }
        hd = hp * DEG;
      }
      turn = !plain && F.r() < TURNING * (F.S.wheel || 1) ? (F.r() < 0.5 ? 1 : -1) * pick(F.r, TURN) * DEG : 0;   // now and then wheeling as it goes
      if (J.turnF) turn = (F.r() < 0.5 ? 1 : -1) * J.turnF * DEG;   // (dev: a film's flight wheeling through turnF deg)
      else if (J.role === 'local' && !plain) turn = (F.r() < 0.5 ? 1 : -1) * pick(F.r, DIR_LOCAL_TURN) * DEG;   // (round 3, alive: a local flight wheels once)
      F.dir = (J.diag || !open) && !J.climb && (!J.role || J.role === 'cross' || J.role === 'local') && F.r() < 0.7 ? (qx < W / 2 ? -1 : 1) : J.dir;   // (in a narrow strip of sky, mostly out by the nearer side; round 3, alive: a flight on the line or against it keeps its side: half its tries spent, a quarter of the stream flights came out the other way)
      if (F.dir !== J.dir) STATS.thinSide = (STATS.thinSide || 0) + 1;
      var upw = 0;   // (round 3, alive: no flight is sent upwind; a downwind crossing flies far and quick enough that its body does not face back (DOWN_*), or the trial refuses it)
      /* (round 2) a view turning against the flight's way would leave it behind beyond its edge: as fast as it flies or
         a little faster (the two would all but cancel: a bird hanging on the window), it goes the way of the sweep
         instead; much faster, it sets off beyond the far edge, and the view passes it as it flies on (farOption) */
      J.upstream = false;
      if (J.mode !== 'still' && F.dir * J.sweep < 0) {
        if (J.mode === 'next' && Math.abs(J.sweep) > 1.25 * F.vPx) J.upstream = true;
        else if (Math.abs(J.sweep) > FLIP * F.vPx && !upw) { F.dir = -F.dir; STATS.sweepFlip = (STATS.sweepFlip || 0) + 1; F.swept = true; }   // (round 3: 0.35 doubled the birds' pace on the window under a modest turn; now that turn slows them instead) (shape: never downwind in a crosswind)
      }
      if (J.diag && !J.climb) {                           // steeper across the window: down and away toward the horizon, or up and nearer (now and then the other)
        climb = (F.r() < 0.5 ? 1 : -1) * pick(F.r, DIAG);
        u = (F.r() < 0.7 ? -1 : 1) * (climb > 0 ? 1 : -1);   // (+ coming nearer as it goes, - going away)
        if (!pathAcross(F, qx, qy, climb, u * F.r() * DIAG_N * (u > 0 ? GROW : SHRINK) / (F.vw * F.n0), turn)) return pfail(J, 'pathA');
        u = 3;
      } else {
        climb = J.climb ? (F.r() < 0.5 ? 1 : -1) * pick(F.r, CLIMB) : (F.r() * 2 - 1) * F.S.tilt * DEG / 3;   // (its kind's tilt: a gentle climb or descent; the heading tilts it on the window)
        if (!J.climb && J.sinkPref !== null && J.sinkPref !== undefined) {   // (life: sinking toward the roost; fix: the angle is through the AIR, so the path's slope in the frame is it times the airspeed over the frame's pace)
          var sa0 = J.sinkPref + 0.4 * DEG * (F.r() * 2 - 1), vf0 = Math.max(0.5, (F.vw00 !== undefined ? F.vw00 : F.vw) * MPU), va0 = Math.sqrt(vf0 * vf0 + (FL.speed || 12) * (FL.speed || 12)), cap0 = Math.tan((W < 600 ? 4 : 8) * DEG);
          climb = clamp(Math.tan(sa0) * va0 / vf0, -cap0, cap0);
        }
        if (F.vw00 === undefined) { F.vw00 = F.vw; F.vPx00 = F.vPx; }
        F.vw = F.vw00; F.vPx = F.vPx00; F.lean = false;
        if (leanPre >= 0 ? leanPre === 1 && !plain : LEAN_PLAN && !J.climb && !plain && J.mode !== 'still' && (FL.speed || 0) > 2 && F.r() < LEAN_MODE) {
          /* (way-path) a lean crossing: across the window at the calm's top pace, as near as that pace lets its world
             heading stand LEAN_PSI off the camera's track (never nearer than it would otherwise fly, never farther
             than LEAN_N0), a touch away, and now and then turning away from the camera as it goes (its far wing low) */
          /* the heading its lean asks where it crosses: the near wing's rise on the window grows with how far its heading
             stands off the camera's track and how high it is seen (tan of the tilt ~ tan psi x tan of its elevation), so
             psi from the kind's own mark (gull 25 deg, goose and ibis 31) and the height of the proposed crossing */
          unproj(qx, qy, F.n0, wp);
          var mk0 = markOf(kindOf(F)), tilt = Math.atan2(mk0[9] - mk0[1], mk0[8] - mk0[0]), el = Math.atan2(wp.y, Math.sqrt(wp.x * wp.x + wp.z * wp.z));
          var psiT = clamp(Math.atan(Math.tan(tilt) / Math.max(Math.tan(el), 0.25) * pick(F.r, [0.85, 1.25])), LEAN_PSI[0] * DEG, LEAN_PSI[1] * DEG);   // (shape: the dial's upper end read, 52 as before)
          /* (shape, the join) psiT is its heading through the AIR: the body lies along its way through the air, so the
             world's wind (this flight's frame: wfx across, wfz along the camera's way) gives part of it. Across upwind,
             the speed across over the ground it needs is (forward airspeed) x tan psiT less the crosswind (downwind,
             more), never under the crossing's least pace (SPEED[0] px/s at its nearness) nor over the lean's top; then
             way-path's nearness and pace. A crossing whose airspeed would fall under its kind's least is not made a
             lean crossing (the ordinary proposal stands) */
          var top = LEAN_PACE * topSpeed(), cs0 = (FL.speed || 12) / MPU, wfx = 0, wfz = 0;
          if (WIND_ON && LEAN_AIR && !F.place) { windNow(); var lcy = F.cyw === undefined ? 1 : F.cyw, lsy = F.syw === undefined ? 0 : F.syw; wfx = (-lcy * WINDV[0] + lsy * WINDV[2]) / MPU; wfz = (lsy * WINDV[0] + lcy * WINDV[2]) / MPU; }
          var fwd = cs0 - wfz, vlat = fwd * Math.tan(psiT) + F.dir * wfx;
          var n0L = vlat > 1e-6 ? clamp(top / vlat, LEAN_N0, Math.max(LEAN_N0, F.n0)) : Math.max(LEAN_N0, F.n0);
          var vwL = clamp(vlat, SPEED[0] / n0L, top / n0L), axL = F.dir * vwL - wfx;
          if (fwd > 0 && Math.sqrt(axL * axL + fwd * fwd) * MPU >= (AIR_MIN[F.sort] || 6)) {
            F.n0 = n0L; F.vw = vwL; F.vPx = vwL * n0L; F.lean = true;
            hd = J.hdPref !== null && J.hdPref !== undefined ? clamp(J.hdPref + 8 * (F.r() * 2 - 1), -30, HEAD_MAX) * DEG : pick(F.r, LEAN_HD) * DEG;   // (life: the roost's way)
            turn = F.r() < LEAN_TURN ? pick(F.r, LEAN_TURN_A) * DEG : 0;
            if (J.turnF) turn = J.turnF * DEG;
          }
        }
        if (DOWN_ON && WIND_ON && !F.lean && J.mode !== 'still' && F.cyw !== undefined) {   /* (round 3, alive, DIRECTIONS 4.3.5) downwind in a crosswind: across the frame faster than the wind by enough that its body does not face back */
          windNow(); var wxD = -F.cyw * WINDV[0] + F.syw * WINDV[2];
          if (Math.abs(wxD) >= WIND_SIDE && F.dir * wxD > 0) {
            var needD = (Math.abs(wxD) - FACE_SIN * (FL.speed || 12) + DOWN_LAT) / MPU, topD = 0.92 * topSpeed();
            if (F.vw < needD) { var nD = clamp(topD / needD, DOWN_NMIN, F.n0); F.n0 = nD; F.vw = Math.min(needD, topD / nD); F.vPx = F.vw * F.n0; STATS.down = (STATS.down || 0) + 1; }
          }
        }
        if (open && !J.climb) { var kfit = bandFit(F, qx, qy, hd, climb); if (kfit < 1) { hd *= kfit; climb *= kfit; FIT_K++; } }   // (round 3, step 1: shaped to its band)
        if (!pathThrough(F, qx, qy, hd, turn, climb)) return pfail(J, 'path');
      }
      if (!u && (F.edges & 12)) return pfail(J, 'edges');   // a crossing never leaves by the top or the bottom (one going away may sink below the sill)
      J.pend = true; return false;                        // (its pace and timing on the next step: no one step works out a whole path)
    }
    J.c++;
    J.it = trialIt(J, F, F.probe.length < F.m.length);
    return true;
  }
  function propose2(J) {
    var F = J.F, lap = 0;
    {
      if (!paced(F)) return pfail(J, 'paced');
      /* (round 3) the view's coming turn sweeps the land across the window under the flight: going its way, the flight
         flies that much slower against the land (gliding the more, as the live's slowed kinds do), so that on the
         window it keeps near its kind's calm pace rather than adding the turn's to it (never under half its pace) */
      if (J.mode !== 'still' && SWEEP_GIVE > 0 && F.dir * J.sweep > 0 && !F.soar) {
        var kk = Math.max(0.5 * F.vw / F.v, (F.v - SWEEP_GIVE * Math.abs(J.sweep) / F.n0) / F.v);
        if (kk < 1) { F.v *= kk; F.q *= kk; }
      } else if (J.mode !== 'still' && SWEEP_UP > 0 && F.dir * J.sweep < 0 && !F.soar) {
        /* ... and against it, that much quicker (within the calm's own bounds on growing, shrinking and turning, and
           its kind's pace by at most half the sweep again), so that it still crosses the window in about the live's time */
        var up = Math.min(F.vw * (1 + SWEEP_UP * Math.abs(J.sweep) / F.vPx), F.vLim || Infinity, 0.92 * topSpeed() / (F.vSig || 1));
        if (up > F.v) { F.q = Math.min(1, F.q * up / F.v); F.v = up; }
      }
      F.m.forEach(function (m) { lap = Math.max(lap, Math.max(m.lag, m.lx) + m.stragL + F.span); });
      F.s0 = 0;
      if (J.mode === 'first') F.s0 = entering(F) - F.v * pick(F.r, FIRST) * (F.dir * J.sweep < 0 ? clamp(1 - Math.abs(J.sweep) / F.vPx, 0.25, 1) : 1);   // the leader enters within a second or two (round 3: as soon against the view's turn)
      else if (J.mode === 'still') F.s0 = (entering(F) + leaving(F) + lap) / 2;    // composed across the middle of the sky
      F.dur = (F.len + lap - F.s0) / F.v;
      F.lap = lap;
      placeEvents(F);
      if (J.upstream) { J.c++; J.far = false; J.it = { why: 'never' }; return farOption(J); }
    }
    J.c++;
    J.it = trialIt(J, F, F.probe.length < F.m.length);
    return true;
  }
  /* (round 2) a flight the coming view would leave behind beyond its edge (the view turning its way faster than it
     flies), or bring into view as it is made: the same path, the flight set off beyond the far edge instead, so the
     view passes it (it comes in across that edge, flying on its own way against the turn) */
  function farOption(J) {
    var F = J.F, why = J.it.why;
    if (J.far || F.soar || J.mode !== 'next' || (why !== 'never' && why !== 'pop' && why !== 'short')) return false;
    if (F.dir * J.sweep > -0.5 * F.vPx && !J.upstream) return false;
    J.far = true;
    F.s0 = F.len + F.lap - F.v * (VP.t0 - J.t) + 0.5 * F.span;   // (the whole flight beyond the far edge as the job starts)
    F.dur = Math.max(F.dur, 30);
    J.it = trialIt(J, F, F.probe.length < F.m.length);
    return true;
  }
  /* how much of a path the clouds and the land would hide: its leader and its last bird at six moments through the
     time it is in view, each a point in the world (the camera's predicted place and the flight's frame), the clouds'
     lobes between the camera and it, and the ground under the line of sight; and the ground under it (never lower than
     FLOOR_T over it: a path in DUNES may cross low in front of the dunes, never through them). 1: not a path */
  function hiddenShare(J, F) {
    var it = J.it, i, k, m, tau, kk, x, y, z, uu, nT = 0, nH = 0, hid, list, nL = 0;
    J.overLand = 0;
    if (FORCED || it.enter < -1e8 || !camStep()) return 0;
    list = [F.m[0], F.m[F.m.length - 1]];
    for (k = 0; k < 6; k++) {
      tau = it.enter + (it.last - it.enter) * (k + 0.5) / 6;
      kk = Math.round((tau - it.from) / STEP); viewNeed(kk);
      for (i = 0; i < list.length; i++) {
        m = list[i]; spot(F, m, tau, tmp2);
        airWorldK(F, tmp2.ax, tmp2.ay, tmp2.az, kk, PW);
        work += 10; nT++;
        if (FL.ok && PW.y - HOST.ground(PW.x, PW.z) < FLOOR_T) return 1;
        hid = FX.cloud && HOST.cloudBetween(PW.cx, PW.cy, PW.cz, PW.x, PW.y, PW.z) > 0.6 * CLOUD_IN;
        for (uu = 0.2; !hid && uu < 0.99; uu += 0.2) {
          x = PW.cx + (PW.x - PW.cx) * uu; y = PW.cy + (PW.y - PW.cy) * uu; z = PW.cz + (PW.z - PW.cz) * uu;
          if (HOST.ground(x, z) > y) hid = true;
        }
        if (hid) nH++;
        /* (round 3) seen against the land behind it (a dune, the ground far off), rather than the open sky */
        if (J.mode === 'still') for (uu = 1.5; uu < 13; uu *= 2) {
          x = PW.cx + (PW.x - PW.cx) * uu; y = PW.cy + (PW.y - PW.cy) * uu; z = PW.cz + (PW.z - PW.cz) * uu;
          if (FL.ok && HOST.ground(x, z) > y) { nL++; break; }
        }
      }
    }
    J.overLand = nL / Math.max(1, nT);
    return nH / Math.max(1, nT);
  }
  /* a trial passed: keep the roomiest path (clear of the clouds and the land) */
  function judge(J) {
    var F = J.F, sc = J.it.near, i, G, hs;
    if (J.mode === 'still' && !allInView(F, 0)) return;
    if (F.soar && sc < 40) return;                        // a thermal only in a roomy field: in a narrow band a ring looks trapped
    if (J.mode === 'still') for (i = 0; i < flights.length; i++) {   // one flight to a band (the still sky's: the live's, over the whole crossing; a moving sky's while both are seen, in the trial)
      G = flights[i];
      if (J.it.yLo < G.yHi + BAND_GAP && J.it.yHi > G.yLo - BAND_GAP && !between(J.it, G)) { fail(J.it, 'band'); return; }   // ... unless the words stand between them
    }
    hs = hiddenShare(J, F);
    if (hs > CLOUD_HID) { if (hs < 1) J.hid = (J.hid || 0) + 1; fail(J.it, hs >= 1 ? 'floor' : 'hidden'); return; }
    sc += 0.25 * J.it.apart + (J.diag && !J.climb ? 0 : 40) + 8 * F.r() - 80 * hs - (J.far ? 10 : 0) - (J.mode === 'still' ? 60 * J.overLand : 0) - LATE_K * J.it.late;
    var tat = J.it.readT > 0 ? J.it.tatT / J.it.readT : 0; if (LEAN_PLAN) { tat = J.it.readT > 0 ? (J.it.leanT || 0) / J.it.readT : 0; sc += LEAN_W * tat * Math.min(1, J.it.readT / 6); } else sc += 24 * tat; F.tattoo = tat;   // (way-path: the physical lean's share of its readable time, weighed by how long it is readable) F.sideShare = J.it.readT > 0 ? J.it.sideT / J.it.readT : 0;   // (birds3d: the tattoo's view preferred, a preference, never a gate)   // (round 3: the less, the longer it would pass near the words where the course is a guess)
    /* (round 2) on a wide window, a band wholly above or below the words: a turn of the view sweeps a flight across the
       window, and one at the words' own height is swept onto them (and steps back) */
    var sy0 = slackY();   // (round 3: wholly clear of the words' margin and its slack)
    if (W >= WIDE && stackB > stackT && (J.it.yHi < stackT - WORDS - sy0 || J.it.yLo > stackB + WORDS + sy0)) sc += CLEAR_BAND;
    if (sc > J.best) {
      if (J.it.end) F.dur = Math.max(J.it.end, J.it.last + 1);
      J.best = sc; J.keep = snapshot(F, 0); J.keep.yLo = J.it.yLo; J.keep.yHi = J.it.yHi; J.keep.xLo = J.it.xLo; J.keep.xHi = J.it.xHi;
      J.keep.enterT = J.it.enter > -1e8 ? J.it.enter : 0; J.keep.seenSpan = J.it.last > -1e8 ? J.it.last - Math.max(J.it.enter, 0) : 0; J.keep.far = J.far;
      if (J.it.capped && !F.soar) J.keep.seenSpan = Math.max(J.keep.seenSpan, (leaving(F) - entering(F)) / F.v);   // (round 3: a trial cut off while it was still seen: its crossing in the still view, for the gap to the next)
    }
  }

  /* work on the job, `quota` bird-steps' worth; the flight once it is in the sky, else null (and job null too when
     nothing found room) */
  /* (round 3, alive) a role's way (DIRECTIONS 4.1-4.2): its side of the window and how far off the window's plane it
     heads, from the sky's flight line as this flight's kind group takes it: on the line, as the roost-bound flights flew
     (away toward the roost); against it, across (70 %) or coming nearer; across it, steeply away or nearer, mostly on the
     line's side; local, either side, across, wheeling once. The wind never picks it */
  function roleWay(J, F) {
    var g = DIR_GROUP[F.sort], tgt = J.tgt, VP0 = HOST.flight ? HOST.flight(FLX) : null, vyaw = VP0 && VP0.ok ? VP0.view : 0, d = J.rd;
    if (g !== undefined && J.cls !== 'moon' && roostFlip[g] < 0) tgt = 2 * roostVq - tgt;   // (this kind's roost on the other side: kinds pass each other at dusk)
    var rel = angDiff(tgt, vyaw), side = rel > 0 ? -1 : 1;   // (+: to the view's left)
    if (J.role === 'stream') { J.dir = side; J.hdPref = 90 - Math.abs(rel) / DEG; }
    else if (J.role === 'counter') { J.dir = -side; J.hdPref = d[0] < 0.7 ? mix(d[1], -10, 20) : mix(d[1], -30, -12); }
    else if (J.role === 'cross') { J.dir = d[2] < DIR_CROSS_SAME ? side : -side; J.hdPref = d[0] < 0.5 ? mix(d[1], 35, 60) : mix(d[1], -30, -12); }
    else { J.dir = d[2] < 0.5 ? side : -side; J.hdPref = mix(d[1], -10, 20); }
    F.dir = J.dir; F.role = J.role; F.dirRole = J.dir;
  }
  function workJob(quota) {
    var J = job, o, F, res, C, q0 = quota;
    while (job === J && quota > 0) {
      if (HOST.budget && HOST.budget() <= 0) return null;   // (round 3: the frame's time for planning is spent: on with it next step)
      /* (round 2) a passed trial is judged (its clouds and its land: some 130 bird-steps) only on a step that has spent
         under a quarter of its quota, and a path's two halves are worked out on steps of their own (propose, propose2):
         round 1's steps did up to five such stages, 933-1268 bird-steps against a quota of 200; gating the proposals too
         left the sky emptier, a step lost after every failed trial (fake world: empty 0.045 -> 0.063 at 1440) */
      if (J.jn) {
        if (q0 - quota > 0.25 * q0) return null;
        J.jn = false; o = work; judge(J); quota -= work - o;
        if (HOST.dev && work - o > (STATS.costs.judge || 0)) STATS.costs.judge = work - o;
        J.it = null; continue;
      }
      if (!J.F) {
        if (J.oi >= J.order.length) { if (J.cls && LIFE[J.cls] && J.mode !== 'still' && J.order[0] && J.order[0][0] !== 'single' && !(LPEND && LPEND.kd === J.order[0][0])) LPEND = { kd: J.order[0][0], nd: J.order[0][1], cls: J.cls, t: t };   /* (fix: no path found: the pattern waits) */ jobLog(J, null); HIDJOB = (J.nh || 0) > 0.3 * (J.nf || 0) ? t : HIDJOB; job = null; return null; }   // (round 3: a job the clouds defeated, noted)
        o = J.order[J.oi++];
        if ((makesFour(o[1], J.counts) && !(o[1] === 1 && LIFE[J.cls])) || o[1] > freeSlots() + awaySlots()) continue;
        var keepS = J.sortF ? SORT_OF[o[0]] : null; if (J.sortF) SORT_OF[o[0]] = [[J.sortF, 1]];
        NEAR_FORCE = !!J.nearF;
        try { J.F = newFlight(o[0], o[1], J.dir, J.r, o[2], o[3], J.mode === 'still'); } finally { if (J.sortF) SORT_OF[o[0]] = keepS; NEAR_FORCE = false; }
        if (J.giftF && J.F) J.F.gift = true;
        if (J.F && J.role && !J.F.soar) roleWay(J, J.F);   // (round 3, alive)
        J.c = 0; J.a = 0; J.best = -1; J.keep = null; J.it = null; J.bands = null; J.pend = false; J.jn = false; J.retry = 0; J.hid = 0;
        return null;                                      // (drawing a flight is a frame's work: its paths are tried from the next)
      }
      if (!J.it) {
        if (J.c >= ((J.mode === 'first' && !J.fill) || J.oi > 1 || J.retry ? TRIES / 2 : TRIES) || J.a >= 6 * TRIES) {   // (the first flight, and a second choice, in fewer tries; a path that cannot even be drawn is a cheap try)
          if (J.keep) {
            F = J.F; restore(F, J.keep); setYaw(F, J.yaw); F.enterT = J.keep.enterT; F.seenSpan = J.keep.seenSpan; F.farIn = J.keep.far; job = null;
            var t1 = J.t;                                 // (round 3: every flight sets off when its trials had it set off, the course's view and its own aligned; a first flight FIRST_LEAD after its job began, entering a second or two after that. Round 2 set a first flight off as it was committed, its course then seconds out of step with the view when the planning ran long)
            /* never made in view: through the camera as it is now (a turn the course did not foresee, a drag) */
            C = camStep();
            if (J.mode !== 'still' && C) {
              FW.ox = C.pos[0]; FW.oy = C.pos[1]; FW.oz = C.pos[2];
              /* (a first flight the view has turned onto while it was planned sets off a little further back along its
                 path, half a second at a time, so it still comes in across the edge) */
              for (var bk = 0; bk < 6 && seenReal(F, t - (t1 - F.from), C); bk++) { F.s0 -= 0.5 * F.v; F.dur += 0.5; F.ev0 += 0.5; F.enterT = (F.enterT || 0) + 0.5; }
              if (seenReal(F, t - (t1 - F.from), C)) { fail(J.it || {}, 'commit'); jobLog(J, null); J.keep = null; J.best = -1; return null; }   // (round 3: that path given up; round 2 tried it again every step)
            }
            F.id = ++FLIGHT_ID; F.pitch0 = Math.atan2(cam.s, cam.c);   // (development: the still view's pitch it was planned in)
            jobLog(J, F);
            commit(F, t1);
            return F;
          }
          /* (round 3) the kind and the count drawn, tried again before the ladder steps down to fewer birds: on the
             other side, the other way across (the turn's side), then setting off a little later (a later stretch of the
             course: another band, a far entry); round 2 went straight down to a lone bird a third to four fifths of
             the time in some skies */
          if (J.oi === 1 && J.F && (J.retry || 0) < (J.mode === 'next' ? RETRIES : 1) && J.mode !== 'still') {
            J.retry++;
            if (J.retry === 1 && (!J.role || J.role === 'cross' || J.role === 'local')) J.dir = -J.dir; else J.t += RETRY_LATER;   // (round 3, alive: a flight on the line or against it tries its own side later; flipped, still air showed one way 50-78 %)
            J.c = 0; J.a = 0; J.it = null; J.bands = null; J.pend = false;
            continue;
          }
          J.F = null;
          continue;
        }
        o = work; var st2 = J.pend;
        propose(J);
        quota -= 2 + (work - o);                          // (a path in the air costs what it costs to work out)
        if (HOST.dev && work - o > (STATS.costs[st2 ? 'propose2' : 'propose'] || 0)) STATS.costs[st2 ? 'propose2' : 'propose'] = work - o;
        if (J.it || J.pend) return null;                  // (its next stage, and its trial, on the next steps)
        continue;
      }
      res = trialRun(J.F, J.it, J.ahead, Math.min(quota, TRIAL_SLICE));   // (round 3: a slice of it a step)
      quota -= J.it.spent + 1;
      if (res !== 0 && HOST.dev && J.it.spent > (STATS.costs.trial || 0)) STATS.costs.trial = J.it.spent;
      if (res === 0) return null;                         // on with it next step
      if (res > 0 && J.it.probe) { J.it = trialIt(J, J.F, false); continue; }   // the bounding birds cleared it: now all of them
      if (res > 0) { J.jn = true; continue; }            // (judged on a step of its own, or this one if it is still fresh)
      else if (farOption(J)) continue;
      J.it = null;
    }
    return null;
  }

  var NEXT_FORCE = null;   // (dev: { kind, n }: the next flight's, once)
  var FILL_T = 12;   // (round 3, step 1) s with no bird seen: the next flight a lone bird (or else a pair) on a plain crossing (the floor under the rhythm: no 30-s empty sky; at 18 s a pattern retried and a fill's pair refused left 28-s spells)
  var FIRST_FILL = 6;   // (round 3, step 1) s after load with no flight yet planned: the first one floored the same way
  var RETRIES = 2, RETRY_LATER = 2, FIRST_LEAD = 1, LONE_REDRAW = 2, LATE_K = 6, AWAY_GRACE = 6, TRIAL_PAST = 10, HIDDEN_FILL = 5, HIDJOB = -1e9, nearJob = false;
  /* (round 3) the birds held by flights the view has turned from (they give way to a new flight that needs them) */
  function flockInSky() { for (var i = 0; i < flights.length; i++) if (!flights[i].gone && !flights[i].away && flights[i].m.length >= 3) return true; return false; }
  function givesWay(G) { return G.away && !G.gone && t - G.lastSeen > AWAY_GRACE; }   // (a flight looked away from a moment keeps its birds: the view may be coming back)
  function awaySlots() { var n = 0; for (var i = 0; i < flights.length; i++) if (givesWay(flights[i])) n += flights[i].m.length; return n; }
  function makeRoom(n) {
    while (freeSlots() < n) {
      var A = null;
      for (var i = 0; i < flights.length; i++) { var G = flights[i]; if (givesWay(G) && (!A || G.lastSeen < A.lastSeen)) A = G; }
      if (!A) return false;
      land(A); STATS.landed.unseen++;
    }
    return true;
  }
  /* a new flight: mode 'first' (it enters soon after load), 'next' (the scheduler's), 'still' (the composed still
     sky). If the pattern finds no room: the same again (above), then a flatter V, a smaller one, the same birds in a
     line, fewer in a line, a calm line, a calm small skein, a pair, and only then one (round 2 tried one bird before
     the calm line and the small skein) */
  function startJob(mode) {
    var r = vstream(100 + flightNo++), counts = [], free = freeSlots() + awaySlots(), n, kind, dir, order, i, seen = {};
    for (i = 0; i < flights.length; i++) if (!flights[i].gone) counts.push(flights[i].m.length);
    /* (round 3) no more birds than would take the window much past the live's own sky (its crowd and CROWD_UP more, a
       flight of three always allowed): two flights on the window and a big third made eleven birds and more at 1440 a
       tenth of the time, six on average where the live's sky holds four */
    if (mode !== 'still') free = Math.min(free, Math.max(3, Math.floor(crowdTarget() + CROWD_UP - seenNow)));
    if (free < 1) return false;
    var fill = mode !== 'still' && !NEXT_FORCE && (t - lastSeenAny > FILL_T || (STATS.planned === 0 && t > FIRST_FILL));   // (round 3, step 1: the floor under the rhythm; the visit's first flight sooner)
    n = drawCount(r, free, counts);
    /* (round 3) a lone bird only if drawn three times (a lone bird of the live's ladder of fallbacks, now and then):
       alone on the window it was the live's now and then (1-7 % of its time), and round 2's turning view, ending flights
       sooner, made it a procession of them; the live's own rate of lone birds (a ninth of its flights) left 300 s runs
       with a quarter to two fifths of them lone, by chance */
    for (i = 0; n === 1 && mode !== 'still' && i < (mode === 'first' ? 4 : LONE_REDRAW); i++) n = drawCount(r, free, counts) || 1;   // (the first flight: a flock, as the live's, unless the sky's counts allow nothing else)
    if (!n) return false;
    if (mode === 'first' && n > 3 && openSky() < 0.35 * H) n = 3;   // a small sky: a small first flight, soon in view
    kind = mode === 'still' ? (n >= 3 ? 'skein' : n === 2 ? 'pair' : 'single') : drawKind(r, n);
    var clsJ = skyCls(), LCj = LIFE[clsJ];
    if (LCj && mode !== 'still' && !NEXT_FORCE && !fill) {   /* (life) the pattern first, by the sky's class; then its birds; clamped to the room, never four */
      /* (the pattern drawn once, so its share is kept: one the room cannot hold now waits for room, never clamped into
         another; a lone bird is never kept back by the four rule) */
      var kd = weighted(r, LCj.pat), nt = kd === 'skein' ? (clsJ === 'first' || clsJ === 'moon' ? LIFE_N.skeinN : LIFE_N.skein) : LIFE_N[kd], nd = weighted(r, nt);
      if (LPEND && LPEND.cls === clsJ && t - LPEND.t < LPEND_T && t - lastSeenAny < 12) { kd = LPEND.kd; nd = LPEND.nd; }   // (fix: the pattern drawn before, waiting for room: its share kept)
      var lo = LIFE_MIN[kd], nd0 = nd;   // (round 3, step 3: a skein five or more at night and first light too)
      if ((kd === 'loose' || kd === 'skein') && nd > free && seenNow <= 1) free = Math.min(freeSlots() + awaySlots(), nd);   // (round 3, step 3: a skein too: one sight)   // (fix: a loose flock is the evening's one sight: an all but empty sky takes it whole)
      if (kd === 'skein' && nd - free >= 2 && seenNow > 1) { if (!LPEND || LPEND.kd !== kd || LPEND.cls !== clsJ) LPEND = { kd: kd, nd: nd0, cls: clsJ, t: t }; return false; }   // (round 3, step 3: it waits for a thinner sky)
      if (nd > free) nd = free;
      if (nd !== 1 && makesFour(nd, counts)) nd = nd - 1 >= lo && !makesFour(nd - 1, counts) ? nd - 1 : 0;
      if (nd === 4) nd = 3 >= lo ? 3 : 0;
      if (nd < lo) { if (!LPEND || LPEND.kd !== kd || LPEND.cls !== clsJ) LPEND = { kd: kd, nd: nd0, cls: clsJ, t: t }; return false; }
      LPEND = null;
      kind = kd; n = nd;
    }
    var turnF = 0, sortF = null, giftF = false, nearF = false;
    if (NEXT_FORCE && mode !== 'still') { kind = NEXT_FORCE.kind || kind; n = Math.min(NEXT_FORCE.n || n, free); turnF = NEXT_FORCE.turn || 0; sortF = SORTS[NEXT_FORCE.sort] ? NEXT_FORCE.sort : null; giftF = !!NEXT_FORCE.gift; nearF = !!NEXT_FORCE.near; NEXT_FORCE = null; }   // (dev: the next flight's kind and count, for a film)
    dir = r() < faithful ? season : -season;              // most flights go the season's way; now and then one the other
    /* (life, DESIGN 2.3) the flight line to a roost: most flights take the way (left or right on the window, and how far
       off its plane) whose heading through the air stands nearest the visit's roost bearing (at first light away from
       it, at night a migration's bearing 90 deg on); the planner then flies that way if it finds room. Their path sinks
       toward the roost, climbs a little at first light, is level at night */
    var hdPref = null, roostB = false, sinkPref = null, roleJ = null, roleD = null, tgtJ = 0;
    if (LCj && mode !== 'still') {
      if (clsJ !== roostCls) {   /* (fix, L3) the roost's bearing set once a sky: 55-75 deg off the view, upwind in a crosswind, and never moved after (judge-bio1: moved by the wind, the blue hour crossed both ways) */
        roostCls = clsJ; var rq = vstream(7010 + roostK++), VPq = HOST.flight ? HOST.flight(FLX) : null, vq = VPq && VPq.ok ? VPq.view : 0, sq = rq() < 0.5 ? 1 : -1;
        if (WIND_ON && clsJ === 'moon') { var Cq = HOST.camera ? HOST.camera() : null; windNow(); var wq0 = Cq ? WINDV[0] * Cq.r[0] + WINDV[2] * Cq.r[2] : 0; if (Math.abs(wq0) >= WIND_SIDE && rq() < DIR_NIGHT_DOWN) sq = wq0 > 0 ? -1 : 1; }   // (round 3, alive: never set by the wind, but a night's migrants pick a following wind)
        for (var gq = 0; gq < 4; gq++) roostFlip[gq] = clsJ === 'moon' || rq() < (DIR_AGREE[clsJ] || 0.8) ? 1 : -1;   // (round 3, alive: each kind group's roost on the sky's side or the other)
        roostVq = vq;
        roostPsi = vq + sq * pick(rq, [55, 75]) * DEG - (clsJ === 'first' ? Math.PI : clsJ === 'moon' ? Math.PI / 2 : 0);
      }
      var tgt = clsJ === 'first' ? roostPsi + Math.PI : clsJ === 'moon' ? roostPsi + Math.PI / 2 : roostPsi;
      /* (round 3, alive) the flight's role (DIRS); its side and how far off the window's plane it heads are worked out
         once its kind is drawn (roleWay: each kind group's roost its own side); never sent upwind */
      var DW = DIRS[clsJ] || DIRS.glow;
      roleJ = weighted(r, [['stream', DW[0]], ['counter', DW[1]], ['cross', DW[2]], ['local', DW[3]]]);
      roleD = [r(), r(), r(), r()]; tgtJ = tgt; roostB = roleJ === 'stream';
      if (roleJ === 'stream') sinkPref = clsJ === 'first' ? pick(r, ROOST.climbFirst) * DEG : clsJ === 'moon' ? 0 : -pick(r, ROOST.sink) * DEG;
      else if (roleJ === 'counter') sinkPref = clsJ === 'moon' ? 0 : pick(r, DIR_CLIMB) * DEG;
      else if (roleJ === 'cross') sinkPref = clsJ === 'moon' ? 0 : -pick(r, ROOST.other) * DEG;
      else sinkPref = (r() * 2 - 1) * DEG;
      STATS.roles = STATS.roles || {}; STATS.roles[roleJ] = (STATS.roles[roleJ] || 0) + 1;
    }
    order = [];
    function add(o) { var k = o.join(':'); if (!seen[k]) { seen[k] = 1; order.push(o); } }
    add([kind, n]);
    if (kind === 'soar') add([n === 1 ? 'single' : n === 2 ? 'pair' : 'skein', n]);
    if (n >= 3 && kind !== 'line' && kind !== 'loose') {   // (round 3, step 3: a loose flock falls to lines, not to a skein)
      add(['skein', n, 0, 1]);
      for (i = n - 2; i >= 5; i -= 2) add(['skein', i, 0, 1]);   // (round 3, step 3: never under five)
      add(['line', n]);
    }
    if (n >= 5) add(['line', n - 2 === 4 ? 3 : n - 2]);
    if (n >= 3) add(['line', Math.min(n, 5) === 4 ? 3 : Math.min(n, 5), 1]);
    if (n >= 5 && kind === 'skein') add(['skein', 5, 1, 1]);   // (round 3, step 3: a calm skein of five, never three)
    if (n >= 3) add(['pair', 2]);
    if (n >= 2) add(['single', 1]);
    add(['single', 1, 1]);
    if (LCj && mode !== 'still' && kind !== 'single') order = order.filter(function (o) { return o[0] !== 'single' && (kind === 'pair' || o[0] !== 'pair'); });   // (fix, L1: a skein, a line or a flock that finds no path is not flown as a lone bird or a pair: it waits)
    /* (round 3) a sky the clouds have kept empty (every path behind the towers) for HIDDEN_FILL s: a lone bird near the
       eye, in front of them, fills it until the towers pass */
    if (fill) { order = free >= 2 && !makesFour(2, counts) ? [['single', 1], ['pair', 2], ['single', 1, 1]] : [['single', 1], ['single', 1, 1]]; STATS.fill = (STATS.fill || 0) + 1; }   // (round 3, step 1)
    if (mode !== 'still' && t - HIDJOB < 3 && t - lastSeenAny > HIDDEN_FILL) { order = [['single', 1]]; nearJob = true; } else nearJob = false;
    job = { fill: fill, mode: mode, r: r, order: order, oi: 0, counts: counts, dir: dir, F: null, near: nearJob, turnF: turnF, sortF: sortF, giftF: giftF, nearF: nearF, cls: clsJ, hdPref: hdPref, roost: roostB, sinkPref: sinkPref, role: roleJ, rd: roleD, tgt: tgtJ };   // (sortF, giftF, dev: a film's kind and the gift's write-on, SIMULATED S5)   // (turnF, dev: a film's wheeling flight)
    resetJob();
    return true;
  }
  /* a job (re)started: the coming view from now; the still view the camera as the flight will set off (its heading the
     flight's frame's, its pitch the planner's camera's); the predicted sweep of the land across the window (the live's
     resetJob, then this) */
  function resetJob() {
    resetJob0();
    if (!job) return;
    var J = job;
    if (J.mode === 'first') J.t = t + FIRST_LEAD;   // (round 3: a first flight sets off a moment after its job begins: its trials, a share a step, are done by then)
    viewPredict(J.mode === 'still' || HOST.reduced());
    var lead = Math.max(0, J.t - t), kf = lead / STEP, k0 = Math.floor(kf), a = kf - k0;
    viewNeed(k0 + 2);
    var i0 = Math.min(k0, VP.n - 1), i1 = Math.min(k0 + 1, VP.n - 1);
    camera(VP.pitch[i0] + (VP.pitch[i1] - VP.pitch[i0]) * a);
    J.yaw = VP.yaw[i0] + angDiff(VP.yaw[i1], VP.yaw[i0]) * a;
    J.sweep = sweepAhead(lead + 8); J.far = false; J.why = {}; J.pend = false; J.jn = false;
  }

  /* ---------------- (round 3) a flight steered in flight: its path spliced, the guard, the wheel ---------------- */

  /* A flight's path is planned whole before its first bird enters (the live's); in the turning world the camera can
     still do what its course did not foresee (a new aim, a drag), and carry a flight toward the words, or turn against
     it faster than it flies. So each flight is checked again a few seconds ahead, through the camera's near course
     (guard()), and steered as a whole: eased up or down away from the words (a climb or a descent of at most EASE_MAX,
     the live's own kind of path), wheeled round to fly with an unforeseen turn of the view, or, if neither keeps it
     clear of the words, let go whole (GONE_T): never one bird faded out mid-sky while the rest fly on (round 2).

     A splice changes a flight's path from a point just ahead of its leader on: every bird flies the same path behind
     it, so each turns or climbs where the leader did (a wheel passing back down a line), and none moves where it is
     now. Each splice keeps its start (the path as it was there: place, heading, climb), then an arc of curvature k over
     L (the rest of a turn under way, or a wheel), and its climb eased from g0 to g1 over Lg */
  function path3sp(P, s, o) {
    var L = P.sp, i = L.length - 1, S, u, a, b;
    while (i > 0 && L[i].s >= s) i--;
    S = L[i]; u = s - S.s; a = Math.min(u, S.L);
    if (S.k) { b = S.h + S.k * a; o.x = S.x + (Math.sin(b) - Math.sin(S.h)) / S.k; o.z = S.z + (Math.cos(S.h) - Math.cos(b)) / S.k; }
    else { b = S.h; o.x = S.x + a * Math.cos(b); o.z = S.z + a * Math.sin(b); }
    if (u > S.L) { o.x += (u - S.L) * Math.cos(b); o.z += (u - S.L) * Math.sin(b); }
    o.h = b;
    o.y = S.y + S.g0 * u + (S.g1 - S.g0) * (u < S.Lg ? u * u / (2 * S.Lg) : u - S.Lg / 2);
    return o;
  }
  /* the path's state at s: its arc (curvature and what is left of it) and its climb (and the ease under way) */
  var SPS = {};
  function pathState(F, s, o) {
    var P = F.path, L = P.sp, i, S, u;
    path3(F, s, o);
    if (L && s > L[0].s) {
      for (i = L.length - 1; i > 0 && L[i].s >= s; i--);
      S = L[i]; u = s - S.s;
      o.k = u < S.L ? S.k : 0; o.kL = u < S.L ? S.L - u : 0;
      o.g = S.g0 + (S.g1 - S.g0) * Math.min(1, u / S.Lg); o.g1 = S.g1; o.gL = Math.max(0, S.Lg - u);
    } else {
      o.k = s > P.s1 && s < P.s2 ? P.k : 0; o.kL = s > P.s1 && s < P.s2 ? P.s2 - s : 0;
      o.g = P.g; o.g1 = P.g; o.gL = 0;
    }
    return o;
  }
  /* a splice at path point s: the rest of its arc (or a wheel: k over L) and its climb eased to g1 over Lg */
  function splice(F, s, wheelK, wheelL, g1, Lg) {
    var P = F.path, st = pathState(F, s, SPS), S;
    S = { s: s, x: st.x, y: st.y, z: st.z, h: st.h, k: wheelK === null ? st.k : wheelK, L: wheelK === null ? st.kL : wheelL,
          g0: st.g, g1: g1 === null ? st.g1 : g1, Lg: g1 === null ? Math.max(st.gL, 1e-3) : Math.max(Lg, 1e-3) };
    if (!S.k) S.L = 0;
    if (!P.sp) P.sp = [];
    P.sp.push(S);
    return S;
  }
  function unsplice(F) { var P = F.path; P.sp.pop(); if (!P.sp.length) P.sp = null; }
  /* the path point just ahead of every bird of the flight now (its leader's, and its drift forward) */
  function spliceAt(F, tau) {
    var lead = F.m[0];
    return F.sa + F.s0 + F.v * (tau + 0.1) + (F.acc ? accelS(F, tau + 0.1) : 0) + (lead.aL || 0) * 1.2 + 1 + F.v * (F.smA || 0);   // (and its changes of pace: without them a flight sped up was spliced behind its birds, and they leapt onto the new arc)
  }

  /* ---------------- the camera's near course: the guard's ---------------- */

  /* from now, a sample every GSTEP s to GUARD_T's last: the engine's own forecast on a channel of its own (HOST.ahead
     on 1: the birds' planner keeps 0), or, without one, the camera's present turn, pitch and roll carried on as they
     go (its last quarter second's rates) */
  var GSTEP = 0.5, GN = 13;
  var GV = { yaw: new Float64Array(GN + 1), pitch: new Float64Array(GN + 1), roll: new Float64Array(GN + 1), x: new Float64Array(GN + 1), y: new Float64Array(GN + 1), z: new Float64Array(GN + 1), n: 0, t0: 0, step: GSTEP, end: 1e9 }, GVT = -1;
  var CH = { t: new Float64Array(32), yaw: new Float64Array(32), pitch: new Float64Array(32), roll: new Float64Array(32), n: 0, i: 0 };
  function camHistory(C) {   // (every step: the camera's yaw, pitch and roll, for the course carried on)
    var i = CH.i; CH.t[i] = t; CH.yaw[i] = FL.view; CH.pitch[i] = C.pitch; CH.roll[i] = C.roll || 0;
    CH.i = (i + 1) % 32; CH.n = Math.min(CH.n + 1, 32);
  }
  /* (the engine's forecast is the guard's main cost: one serves every flight for GUARD_FC s, read from its own start) */
  var GUARD_FC = 0.2;
  function guardCourse() {
    if (t - GVT < GUARD_FC && t >= GVT) return GV.n > 0;
    GVT = t; GV.n = 0;
    if (HOST.aheadCh >= 2 && !FORCED) { HOST.ahead(true, GN, GSTEP, GV, 1); work += GV.n * AHEAD_COST; if (GV.n > 1) return true; }
    if (CH.n < 2) return false;
    var a = (CH.i + 31) % 32, b = (CH.i + 32 - Math.min(CH.n, 16)) % 32, dt = CH.t[a] - CH.t[b], k;
    if (!(dt > 0)) return false;
    var ry = angDiff(CH.yaw[a], CH.yaw[b]) / dt, rp = (CH.pitch[a] - CH.pitch[b]) / dt, rr = (CH.roll[a] - CH.roll[b]) / dt;
    for (k = 0; k < GN; k++) { GV.yaw[k] = CH.yaw[a] + ry * k * GSTEP; GV.pitch[k] = CH.pitch[a] + rp * k * GSTEP; GV.roll[k] = CH.roll[a] + rr * k * GSTEP; }
    GV.n = GN; GV.t0 = t;
    return true;
  }
  /* (round 3) the course with the view held (the hold): the camera's present turn (its last quarter second) eased out at
     the engine's calm slew, its pitch and roll as they are; and whether its turn now is the calm's own (no faster than
     the calm's rate and a little: not a cloud's way round, a solid's, nor the visitor's hand), which a hold does stop */
  var GH = { yaw: new Float64Array(GN + 1), pitch: new Float64Array(GN + 1), roll: new Float64Array(GN + 1), n: 0 }, GC = GV;
  var GT = { yaw: new Float64Array(GN + 1), pitch: new Float64Array(GN + 1), roll: new Float64Array(GN + 1), n: 0 };
  var HOLD = { until: -1e9, on: 0, req: 0, rest: -1e9, w0: 0, spared: 0, refused: 0 };
  /* the camera's turn now (rad/s, its last quarter second; NaN without a history) */
  function camRate() {
    if (CH.n < 2) return NaN;
    var a = (CH.i + 31) % 32, b = (CH.i + 32 - Math.min(CH.n, 16)) % 32, dt = CH.t[a] - CH.t[b];
    return dt > 0 ? angDiff(CH.yaw[a], CH.yaw[b]) / dt : NaN;
  }
  /* a course from the camera as it is now, its turn eased at the engine's calm slew from its rate now to w1 (rad/s).
     (world5 E0 Fix 2) A hold stops the turn, never the pitch or the roll: they follow the engine's own forecast (GV),
     from where they are now. Held at their present values, a pitch the autopilot was raising read as clear, the hold
     was asked for again and again, and the view, pitching up, carried ABOVE s7's skein down onto the lettered name's
     margin at 30 px/s for 2 s before the guard let it go (its birds stepped back at the words, 255.6 s) */
  function gvAt(arr, h) {
    if (GV.n < 2) return NaN;
    var f = clamp((h + t - GVT) / GSTEP, 0, GV.n - 1), i = Math.min(Math.floor(f), GV.n - 2), a = f - i;
    return arr[i] + (arr[i + 1] - arr[i]) * a;
  }
  function easedCourse(G, w1) {
    var a = (CH.i + 31) % 32, w = camRate(), sl = HOLD_SLEW * DEG, k, h, y = 0, wk = w, dh = GSTEP / 4, q, p0 = gvAt(GV.pitch, 0), r0 = gvAt(GV.roll, 0), gp, gr;
    if (w !== w) return false;
    G.yaw[0] = CH.yaw[a]; G.pitch[0] = CH.pitch[a]; G.roll[0] = CH.roll[a];
    for (k = 1; k < GN; k++) {
      for (q = 0; q < 4; q++) { wk += clamp(w1 - wk, -sl * dh, sl * dh); y += wk * dh; }
      gp = gvAt(GV.pitch, k * GSTEP); gr = gvAt(GV.roll, k * GSTEP);
      G.yaw[k] = CH.yaw[a] + y; G.pitch[k] = CH.pitch[a] + (gp === gp && p0 === p0 ? gp - p0 : 0); G.roll[k] = CH.roll[a] + (gr === gr && r0 === r0 ? gr - r0 : 0);
    }
    G.n = GN;
    return true;
  }
  function heldCourse() {
    var w = camRate();
    if (!(Math.abs(w) <= 1.5 * calmBase() + 0.1 * DEG)) return false;   // (turning faster than the calm lets it: not the autopilot's own turn, which is all a hold stops)
    return easedCourse(GH, 0);
  }
  /* (held) the turn resumed: back to the rate it had when the hold began */
  function turnCourse() { return easedCourse(GT, HOLD.w0); }
  /* clear of the words (and over the floor) through GUARD_T on a course */
  function clearOn(F, tau, G) { GC = G; var r = guardRun(F, tau, false), ok = r.gap >= 0 && !r.floor; GC = GV; return ok; }
  /* would holding the view bring another flight into the words, one its turn keeps clear? */
  function holdHarms(F0) {
    for (var i = 0; i < flights.length; i++) {
      var G = flights[i], tg = t - G.t0;
      if (G === F0 || G.gone || G.place || G.still || G.soar || G.away || tg < -LEAD - 1) continue;
      if (!clearOn(G, tg, GH) && clearOn(G, tg, GV)) return true;
    }
    return false;
  }
  /* the view for a flight h s from now, on the guard's course (GC: the engine's forecast, GV; or the held one, GH) */
  function viewAtG(F, h) {
    var G = GC, f = clamp((h + (G === GV ? t - GVT : 0)) / GSTEP, 0, G.n - 1), i = Math.min(Math.floor(f), G.n - 2), a = f - i, d, p, r;
    if (G.n < 2) { i = 0; a = 0; }
    d = angDiff(G.yaw[i] + (G.n > 1 ? angDiff(G.yaw[i + 1], G.yaw[i]) * a : 0), F.yaw);
    p = G.pitch[i] + (G.n > 1 ? (G.pitch[i + 1] - G.pitch[i]) * a : 0);
    r = G.roll[i] + (G.n > 1 ? (G.roll[i + 1] - G.roll[i]) * a : 0);
    if (p !== p) p = Math.atan2(cam.s, cam.c);
    PV.cd = Math.cos(d); PV.sd = Math.sin(d); PV.ct = Math.cos(p); PV.st = Math.sin(p); PV.cr = Math.cos(r); PV.sr = Math.sin(r); PV.k = -1;
  }
  /* how far an ink box is from the words' margins (px; < 0: inside one), and which way is out: -1 up, 1 down */
  var WG = { g: 0, side: 0 };
  function wordsGap(x, y, hw, hh) {
    var gmin = Infinity, i, o, dx, dy, g;
    WG.side = 0;
    for (i = 0; i < words.length; i++) {
      o = words[i];
      dx = Math.max(o.l - x - hw, x - hw - o.r, 0); dy = Math.max(o.t - y - hh, y - hh - o.b, 0);
      g = Math.sqrt(dx * dx + dy * dy) - o.m;
      if (g < gmin) { gmin = g; WG.side = y < (o.t + o.b) / 2 ? -1 : 1; }
    }
    WG.g = gmin;
    return gmin;
  }

  /* ---------------- the guard: each flight a few seconds ahead ---------------- */

  /* a flight through the guard's course (GUARD_T): its least gap to the words' margins and when, the side to ease it
     to, whether it would go under the floor; and how long its birds would slide backward on the window against the way
     they face (GBACK: its share of the course, and the sweep against it) */
  var GR = { gap: 0, at: 0, side: 0, floor: false, back: 0, sweep: 0, own: 0, slow: 0, fast: 0, w: 0, o: 0, n: 0 }, gq = {}, gq2 = {};
  function guardRun(F, tau, withBack) {
    var i, j, m, h, d, hw, hh, g, n, prevX = GPX, prevOk = GPOK, nb = 0, nbk = 0, sw = 0, ow = 0, ns = 0, nf = 0, wsum = 0, osum = 0, nsum = 0, pmax = paceMax();
    GR.gap = Infinity; GR.at = -1; GR.side = 0; GR.floor = false; GR.back = 0; GR.sweep = 0; GR.own = 0; GR.slow = 0; GR.fast = 0; GR.w = 0; GR.o = 0; GR.n = 0;
    for (j = 0; j < F.m.length; j++) GPOK[j] = 0;
    for (i = 0; i < GUARD_T.length; i++) {
      h = GUARD_T[i];
      viewAtG(F, h);
      for (j = 0; j < F.m.length; j++) {
        m = F.m[j]; d = m.d;
        spot(F, m, tau + h, gq);
        if (gq.ay < floorY) GR.floor = true;
        projV(gq.ax, gq.ay, gq.az, pv);
        n = pv.n;
        if (!(n > 0) || fadeOf(n) < 0.05) { GPOK[j] = 0; continue; }
        hw = d.hw * n; hh = (d.hh + BOB * d.span) * n;
        if (!inView(pv.x, pv.y, hw, hh)) { GPOK[j] = 0; continue; }
        g = wordsGap(pv.x, pv.y, hw, hh);
        if (g < GR.gap) { GR.gap = g; if (g < 0 && GR.at < 0) { GR.at = h; GR.side = WG.side; } }
        if (g < 0 && GR.at >= 0 && h === GR.at && !GR.side) GR.side = WG.side;
        if (withBack && h <= 2.01) {
          /* its window motion since the last sample, and its own (the view held): backward against its facing? */
          if (GPOK[j]) {
            spot(F, m, tau + h - 0.25, gq2); projV(gq2.ax, gq2.ay, gq2.az, pv2);
            var ox = (pv.x - pv2.x) / 0.25, oy = (pv.y - pv2.y) / 0.25, dh = h - prevX[3 * j + 2], wx = (pv.x - prevX[3 * j]) / dh, wy = (pv.y - prevX[3 * j + 1]) / dh,
                face = m.s ? m.s.face : (ox < 0 ? -1 : 1), ws = Math.sqrt(wx * wx + wy * wy);
            if (Math.abs(ox) > 1) face = ox < 0 ? -1 : 1;
            nb++;
            if (wx * face < -BACK_PX) { nbk++; sw += Math.abs(wx - ox); ow += Math.abs(ox); }
            if (fadeOf(n) > 0.3) { if (ws < SLOW_SEEN) ns++; if (ws > pmax) nf++; wsum += ws; osum += Math.sqrt(ox * ox + oy * oy); nsum += n; }
          }
          GPOK[j] = 1; prevX[3 * j] = pv.x; prevX[3 * j + 1] = pv.y; prevX[3 * j + 2] = h;
        }
      }
    }
    GR.back = nb ? nbk / nb : 0; GR.sweep = nbk ? sw / nbk : 0; GR.own = nbk ? ow / nbk : 0;
    GR.slow = nb ? ns / nb : 0; GR.fast = nb ? nf / nb : 0; GR.w = nb ? wsum / nb : 0; GR.o = nb ? osum / nb : 0; GR.n = nb ? nsum / nb : 0;
    return GR;
  }
  var GPX = new Float64Array(3 * MAXP), GPOK = new Uint8Array(MAXP), GLOG = null;   // (GLOG, development: the guard's findings, when asked)

  /* once a flight is in the sky (each, every GUARD_EVERY steps, on a step of its own): ahead GUARD_T, would any of its
     birds come into the words' margin? Then: far enough ahead, ease the whole flight up or down away from them (the
     least climb that keeps every bird clear through the course; none past EASE_MAX); else, or if no ease keeps it
     clear, the whole flight goes (GONE_T: it fades together, the live's "a flight the words moved onto goes"). And
     would its birds slide backward on the window, the view turning against them faster than they fly, for most of the
     next two seconds? Then the flight wheels round toward the turn (WHEEL deg/s in the air, banked as it turns, by way
     of the distance: no bird loomed at), so it flies with it; a flight wheels at most once in WHEEL_GAP s */
  function guard(F) {
    var tau = t - F.t0, r, at, side, c, i, s, st, g0, ok = false, L;
    if (F.gone || F.place || F.still || F.soar || F.stage || tau < -LEAD - 1) return;   // (birds3d: a staged flight is planned whole on the held course; the words coming onto it let it go whole: track)   // (past its planned span too: a turn the course did not foresee may keep it in view)
    /* (round 3) not while the visitor drags the view: their sweep carries birds across the words in a moment (each steps
       back from them meanwhile, as the tracker has it); a flight it sweeps past the words flies on, there when they look
       back (round 3's first cut let it go, and a skein the look-away swept across the name was lost) */
    if (sweepNow() > DRAG_PX) return;
    if (!guardCourse()) return;
    r = guardRun(F, tau, true);
    STATS.guard.n++;
    if (GLOG && (r.gap < 8 || r.back > 0)) GLOG.push({ t: +t.toFixed(2), id: F.id, kind: F.kind, gap: +r.gap.toFixed(1), at: r.at, side: r.side, back: +r.back.toFixed(2), sweep: +r.sweep.toFixed(1), own: +r.own.toFixed(1), eased: F.eased || 0, gv: GV.n, hold: t < HOLD.until ? 1 : 0 });
    /* (round 3) the view's turn carrying it onto the words, or (held for it already) still near them: if its own way keeps
       it clear with the view held, and holding it brings no other flight into them, the camera waits for it (the hold);
       a flight's whole hold at most HOLD_MAX s. Held, a flight the hold itself is carrying onto the words (planned for
       the turn) that the turn resumed would keep clear has the hold let go instead (and none asked for HOLD_REST s) */
    var holding = t < HOLD.until, rg = r.gap;
    if (rg < 0 || (F.holdT > 0 && holding && rg < HOLD_GAP)) {
      var did = false;
      if ((F.holdS || 0) < HOLD_MAX && (holding || t >= HOLD.rest) && heldCourse() && clearOn(F, tau, GH)) {
        if (holding || !holdHarms(F)) {
          if (!holding) { HOLD.on++; HOLD.w0 = camRate(); }
          HOLD.until = Math.max(HOLD.until, t + HOLD_T); HOLD.req = t;
          F.holdS = (F.holdS || 0) + GUARD_EVERY * STEP_DT; if (!(F.holdT > 0)) F.holdT = t;
          if (rg < 0) STATS.guard.hold++;
          did = true;
        } else HOLD.refused++;
      } else if (holding && rg < 0 && !(F.holdT > 0) && turnCourse() && clearOn(F, tau, GT)) {
        HOLD.until = t; HOLD.rest = t + HOLD_REST; HOLD.spared++; did = true;   // (the hold let go for it: the turn resumes)
      }
      if (did) return;
      r = guardRun(F, tau, true);   // (no hold keeps it clear: on as before, on the engine's course)
    }
    if (r.gap < 0) {
      at = r.at; side = r.side || -1;
      if (at >= EASE_AT && (F.eased || 0) < 3) {   // (time to ease it: the least climb or descent that keeps it clear)
        s = spliceAt(F, tau); st = pathState(F, s, SPS); g0 = st.g;
        for (i = 1; i <= 3 && !ok; i++) {
          c = Math.tan(clamp(Math.atan(g0) - side * EASE_MAX * DEG * i / 3, -60 * DEG, 60 * DEG));   // (side -1: the words below it: up)
          splice(F, s, null, 0, c, F.v * EASEV_T);
          r = guardRun(F, tau, false);
          if (r.gap >= 0 && !r.floor) ok = true; else unsplice(F);
        }
        if (ok) { F.eased = (F.eased || 0) + 1; F.dur = Math.max(F.dur, tau + 20); STATS.guard.eased++; return; }
      }
      if (at <= GONE_AHEAD) {   // (no ease keeps it clear: the whole flight goes, faded out before a bird is in the margin)
        /* (round 3) in a passage's cloud (the view all but covered) it goes in a moment, unseen: the passage's climb pitches
           the view up, sweeping every bird down the window faster than a fade of 0.4 s outruns */
        F.gone = t; F.goneT = HOST.cover() > 0.4 ? clamp(at - 0.1, 0.15, GONE_T) : clamp(at - 0.5, 0.4, GONE_T);   // (world5 E0 Fix 2: faded out half a second before the margin, not 0.2 s)
        STATS.landed.words++; STATS.guard.gone++; nextAsFirst();
      }
      return;
    }
    /* (round 3) its pace on the window: a turn the course did not foresee can leave a flight all but hanging there (its
       own way cancelled by the land's sweep: its drift then turns it this way and that) or racing; it flies a little
       faster or slower against the land, eased over ACC_T (never past a third over its kind's calm pace nor the calm's
       own bounds on looming, receding and turning, nor under half its pace) */
    if (r.n > 0 && !(t - (F.accT || -1e9) < ACC_GAP)) {
      var vNow = F.v + accelV(F, tau), dv = 0;
      var calmW = Math.max(SLOW_SEEN * 1.6, 0.75 * F.vPx * r.n / F.n0);   // (the window pace it was planned at, where it is now)
      if ((r.slow >= 0.5 || r.w < 0.6 * calmW) && r.o > r.w) dv = Math.min((calmW - r.w) / r.n, Math.min(1.33 * F.vw, F.vLim || Infinity) - vNow);
      else if (r.fast >= 0.5) dv = Math.max(-(r.w - 0.85 * paceMax()) / r.n, 0.5 * F.vw - vNow);
      if (Math.abs(dv) > 0.05 * F.vw) { accel(F, tau, dv); F.accT = t; STATS.guard.paced++; if (dv < 0) F.dur = Math.max(F.dur, tau + 30); return; }
    }
    /* sliding backward: the view's turn against it, unforeseen, faster than it flies */
    if (r.back >= GBACK && r.sweep > r.own && !(t - (F.wheeled || -1e9) < WHEEL_GAP)) {
      s = spliceAt(F, tau); st = pathState(F, s, SPS);
      var want = wheelTarget(F, st.h);
      L = Math.abs(want) * F.v / (WHEEL * DEG);
      splice(F, s, want / L, L, null, 0);
      F.wheeled = t; F.dur = Math.max(F.dur, tau + L / F.v + 20); STATS.guard.wheeled++;
    }
  }
  /* (round 3) a flight's change of pace in flight: each a smooth ramp of dv (air units/s) over ACC_T from t0 (its own
     clock), the path's arc length gaining sum dv x R(tau - t0), R the integral of the ramp (spot()) */
  function accel(F, tau, dv) { if (!F.acc) F.acc = []; F.acc.push(tau, dv); }
  function accelS(F, tau) {
    var A = F.acc, s = 0, i, x, q;
    for (i = 0; i < A.length; i += 2) { x = tau - A[i]; if (x <= 0) continue; q = x / ACC_T; s += A[i + 1] * (q < 1 ? ACC_T * (q * q * q - q * q * q * q / 2) : x - ACC_T / 2); }
    return s;
  }
  function accelV(F, tau) {
    var A = F.acc, v = 0, i, q;
    if (!A) return 0;
    for (i = 0; i < A.length; i += 2) { q = (tau - A[i]) / ACC_T; if (q > 0) v += A[i + 1] * (q < 1 ? q * q * (3 - 2 * q) : 1); }
    return v;
  }
  /* the turn (signed, radians) from heading h round to fly the other way across the window, by way of the distance (its
     heading through straight away from the eye: the bird recedes as it turns, never looms) */
  function wheelTarget(F, h) {
    var c = Math.cos(h), to = c < 0 ? 15 * DEG : Math.PI - 15 * DEG, d1 = angDiff(to, h), d2 = d1 > 0 ? d1 - TAU : d1 + TAU, mid1 = h + d1 / 2;
    return Math.sin(mid1) > 0 ? d1 : d2;   // (sin > 0: away from the eye)
  }


  /* ---------------- the realm's places: a thermal over each ---------------- */

  /* Where a realm keeps birds about a place (its cells' bird flocks: a temple, a giant shard, an island), the ink
     birds keep a thermal by it instead: two or three storks (or gulls) circling above, one way round,
     the storks holding their wings out (the live's), the gulls gliding with a few beats now and then: fixed in the world, as the place is, so the camera comes to them and passes
     beneath. Made when the camera comes within PLACE_ON of the place (its birds then too far to be seen: they come out
     of the distance as it nears), and gone once it is beyond PLACE_OFF with none of them in view. One at a time; while
     one is seen the sky keeps one travelling flight fewer */
  var PLACE_ON = 1250, PLACE_OFF = 1400,   // (round 3: from 700 and 820, inside the distance its birds already show at)
      PLACE_MAX = 1, PLACE_UP = [35, 70];   // m; thermals at once; m over the place's own birds or the camera, whichever is higher (so the camera passes beneath them)
  var PLACE_AHEAD = 200, LATERAL = [90, 170];   // m: a place this far ahead along the way at least; its thermal this far aside of the way
  var PLACE_FAR = [0.16, 0.26];  // nearness: a thermal's birds come out of the distance between these (the travelling flights' FAR, FADE: 0.42, 0.54)
  /* the air between: a travelling flight's birds are the live's (FADE, FAR); a thermal's are seen from further off, small
     ink over the place (the camera comes to them at its own pace, and would otherwise pass them before they showed) */
  function fadeFor(F, n) { if (F.fadeS) return stageFade(F, n); return F.place ? (n >= PLACE_FAR[1] ? 1 : n <= PLACE_FAR[0] ? 0 : ease((n - PLACE_FAR[0]) / (PLACE_FAR[1] - PLACE_FAR[0]))) : fadeOf(n); }
  var PLACES = [], PLC = [], placeSeen = false, placeDone = {};
  function placeSpot(P, m, tau, o) {
    if (P.live) return liveSpot(P, m, tau, o);   // (round 3: the living sky)
    if (P.kind === 'wheel') return wheelSpot(P, m, tau, o);   // (birds3d: S2)
    var th = m.th0 + m.om * tau;
    o.x = P.cx + m.R * Math.cos(th); o.z = P.cz + m.R * Math.sin(th);
    o.y = P.cy + m.dy + 3 * Math.sin(0.5 * th + m.th0);
    return o;
  }
  function placeFlight(pl, C) {
    var r = sm32((pl.key ^ visitSeed) >>> 0), sort = r() < 0.6 ? 'stork' : 'gull', S = SORTS[sort], n = r() < 0.35 ? 3 : 2, i, m, P, T, R;
    if (freeSlots() < n) return null;
    /* where its thermal stands: between the place and the camera's way, LATERAL from the way (so it is seen ahead as the
       camera comes, and passed beside, never flown through); none for a place already passed or too close ahead */
    var dx = Math.sin(FL.psi), dz = Math.cos(FL.psi), ox = pl.x - FL.x, oz = pl.z - FL.z, sAl = ox * dx + oz * dz;
    if (sAl < PLACE_AHEAD) return null;
    var lx = ox - dx * sAl, lz = oz - dz * sAl, ld = Math.sqrt(lx * lx + lz * lz);
    if (ld < 1) { lx = dz; lz = -dx; ld = 1; }
    var lw = clamp(ld, LATERAL[0], LATERAL[1]), cx = FL.x + dx * sAl + lx / ld * lw, cz = FL.z + dz * sAl + lz / ld * lw;
    R = clamp(pl.orbit, 35, 70);
    T = Math.max(pick(r, LAP), TAU * R / 9);
    P = { place: true, kind: 'thermal', sort: sort, S: S, n: n, key: pl.key, cx: cx, cy: 0, base: pl.y, up: pick(r, PLACE_UP), cz: cz, t0: t, m: [], dur: 1e9, r: r };
    P.cy = Math.max(P.base, FL.y) + P.up;
    var sense = r() < 0.5 ? 1 : -1, f = pick(r, S.hz) * tempo;
    for (i = 0; i < n; i++) {
      m = { d: measureBird3D(drawBird(r, S), sort, SPAN * view * S.size * (1 + SIZE_VAR * (r() * 2 - 1))), R: R * mix(r(), 0.85, 1.15), th0: TAU * (i + 0.3 * r()) / n, dy: (i - (n - 1) / 2) * 6,
            f: f * (1 + DETUNE * (r() * 2 - 1)), delay: 0, half: r(), rest: r(), glide: pick(r, S.glide), n: 1, s: null, lag: 0, lat: 0 };
      m.om = sense * TAU / T;
      m.w = placeWing(sort, r); m.f = m.w.f;   // (physics: the lab's measured stork or gull)
      P.m.push(m);
    }
    if (C && seenReal(P, 0, C)) return null;              // (never made in view: they come out of the distance)
    for (i = 0, m = 0; i < slots.length && m < n; i++) if (!slots[i].busy) { slots[i].busy = true; P.m[m].s = slots[i]; dress(slots[i], P.m[m].d); m++; }
    PLACES.push(P);
    return P;
  }
  /* a thermal keeps above the camera: its storks climbing (or sinking) at most CLIMB_T m/s toward UP over the place's
     own birds or the camera's height, whichever is higher, so the camera passes beneath them (a visitor climbing faster
     comes up to them: they step aside, NEAR_FADE) */
  var CLIMB_T = 3;
  function placeLift(dt) {
    for (var i = 0; i < PLACES.length; i++) { var P = PLACES[i]; if (P.live) continue; var want = Math.max(P.base, FL.y) + P.up; P.cy += clamp(want - P.cy, -CLIMB_T * dt, CLIMB_T * dt); }
  }
  function landPlace(P) {
    P.m.forEach(function (m) { if (m.s) { hide(m.s); m.s.busy = false; m.s = null; } });
    var k = PLACES.indexOf(P); if (k >= 0) PLACES.splice(k, 1);
  }
  function placeStep(C, cover) {
    var i, P, dx, dz, seen = false;
    for (i = PLACES.length - 1; i >= 0; i--) {
      P = PLACES[i]; dx = P.cx - FL.x; dz = P.cz - FL.z;
      if (P.gone && t - P.gone > GONE_T) { landPlace(P); continue; }   // (round 3: one the words came onto, faded out whole)
      var s = C && seenReal(P, t - P.t0, C);
      if (s) seen = true;
      if (P.stage) { if ((P.lastSeen !== undefined && t - P.lastSeen > 3 && !s) || (P.lastSeen === undefined && t - P.t0 > (P.enterT || 0) + 12)) landPlace(P); continue; }   // (birds3d: a staged wheel: once its birds are seen no more)
      if (!s && dx * dx + dz * dz > PLACE_OFF * PLACE_OFF) landPlace(P);
    }
    placeSeen = seen;
    if (PLACES.length >= PLACE_MAX || cover > 0.05 || !FL.ok) return;
    HOST.places(PLACE_ON, PLC);
    var best = null, bd = Infinity;
    for (i = 0; i < PLC.length; i++) {
      var pl = PLC[i]; if (placeDone[pl.key]) continue;
      dx = pl.x - FL.x; dz = pl.z - FL.z; var d2 = dx * dx + dz * dz;
      if (d2 < bd) { bd = d2; best = pl; }
    }
    if (best && placeFlight(best, C)) placeDone[best.key] = true;
  }

  /* ================= THE LIVING SKY (round 3; living/DESIGN.md) =================
     The owner: "they shouldnt be cross as per say... they should just be flying around in the sky ... since this is a
     3d world"; "u need to think bigger". Every flock is an animal in the world, at a real place, on its own business:
     commuters on a bearing (to the evening's roost, against it, across it; away from it at first light), wheels over a
     landmark or a patch of air, loiterers about a home (crows, a heron rowing low, swallows hawking), migrants high at
     night. Nothing is planned for the window: it shows what is in front of the camera. A flock's leader steers in the
     world (LV_DT steps, its route worked out LV_AHEAD s ahead of now) at its kind's real airspeed, turning no faster
     than its kind can, drifting with the wind; the others hold their places in its pattern, a moment behind on its
     way (so turns ripple down it), wandering about them. Guardrails: a flock looks ahead (LV_LOOK) and goes round the
     words and keeps LV_CLEAR from the camera's way; it is born out of sight (out of the window or beyond the distance
     its ink shows at) and let go out of sight; a window empty LV_EMPTY s has a flock sent in across its side. They
     are drawn as the world's places are (fixed in the world, never escorting the camera). */
  var LIVE_ON = true;
  var LV_DT = 0.1, LV_AHEAD = 4, LV_LOOK = [1.5, 3], LV_EVERY = 0.5;   // s
  var LV_SPAWN = [650, 1500], LV_SPAWN_SEEN = [1150, 1600], LV_DROP = 2100, LV_BEHIND = 450, LV_CLEAR = 110, LV_EMPTY = 9;   // m; s
  var LV_SPEED = { goose: 17, ibis: 14, gull: 11, heron: 10, crow: 11, swallow: 10, stork: 12, finch: 9 };   // m/s through the air (Pennycuick 2001; Alerstam 2007)
  var LV_TURN = { goose: 8, ibis: 12, gull: 25, heron: 8, crow: 22, swallow: 70, stork: 12, finch: 30 };   // deg/s at most
  /* (v16) the calm's few birds and empty sky kept: v15, its flocks let go as they left the window, filled the sky (a
     median of 7 birds in view, 6.4 flights a minute, empty 7 % of the time, against the crossings' 2, 2.5 and 16 %);
     the empty spells are kept short by the rescue (LV_EMPTY), not by a crowd */
  var LV_POP = { glow: 5, blue: 5, first: 4, moon: 4, day: 5 };   // flocks living about the visitor at most (v21: one more, as v20's far flocks no longer show)
  var LV_GAP = { glow: [9, 17], blue: [10, 18], first: [10, 19], moon: [11, 20], day: [9, 17] };   // (v24: a little more often: counting only birds at 0.3 ink and more, v23's sky was empty 29 % of the time, the crossings' 20 %)   // s between encounters (v6: [7, 13] at dusk left empty spells of 29-37 s, before the rescue had its own clock)
  var LV_BEH = {                                                   // behaviours by sky: commute, wheel, loiter, hawk (swallows), migrant
    glow: [['commute', 58], ['wheel', 16], ['loiter', 18], ['hawk', 8]], blue: [['commute', 62], ['wheel', 14], ['loiter', 20], ['hawk', 4]],
    first: [['commute', 60], ['wheel', 15], ['loiter', 25]], moon: [['migrant', 75], ['commute', 25]],
    day: [['commute', 40], ['wheel', 20], ['loiter', 25], ['hawk', 15]] };
  var LV_LAP = [18, 25], LV_LAPS = [1, 3], LV_HOME = [140, 320];   // s; laps; m
  /* (v20) how far off a flock fades into the distance, by its business (nearness): a commuter as the crossings did
     (FAR, FADE), a night migrant as the staged flights (high and faint), a wheel or a loiterer between the thermals' and
     the crossings'. v19 faded every living flock as a thermal (0.14-0.24): far specks the crossings never drew, a
     median of 11 px across on a desktop (the crossings' 20), a wheel or a loiterer 5 */
  var LV_FADE = { commute: [FAR, FADE], migrant: [0.3, 0.38], wheel: [0.3, 0.42], loiter: [0.3, 0.42], hawk: [0.3, 0.42] };   // (v24: a wheel or a loiterer shows when nearer: at 0.22-0.32 a far wheel hung as a faint speck, 21 % of v23's bird-frames under 0.3 ink, the crossings' 8 %)
  /* (v12) the calm, in the world: no flock passes the eye faster than LV_DEGS degrees a second (its route chosen
     farther out, never slowed): v11's near meetings swept a desktop at 200-320 px/s (a 9-ibis skein 145 m off) */
  var LV_DEGS = 6, LV_RATE_T = { near: 45, far: 90 };
  /* (v26) a flock follows the land under it this much of its rise and fall; and the birth check sees the camera keep its
     clearance over the land ahead of it (the camera climbs and sinks 0-2.6 m/s with the dunes: v25's check, holding its
     climb, put a crossing 100 px or more off on the window 15 s on, into the words' margin) */
  var LV_TERRAIN = 0.8;
  var LIVE = { r: null, cls: '', rb: 0, side: 1, k: 0, nextT: 0, seenT: 0, look: 0 };
  /* (v26) the land's height under a point (the world's own ground; 0 where it gives none) */
  function lvGround(x, z) { var g = HOST.ground ? HOST.ground(x, z) : 0; return g === g ? g : 0; }
  function liveOn() { return LIVE_ON && !FORCED && !(HOST.reduced && HOST.reduced()); }
  function lvG(r) { return (r() + r() + r() + r() - 2) * 1.7320508; }   // (about a unit normal)
  function lvSort(r, list) { return weighted(r, list); }
  /* a flock's pattern, kind and count, by the sky (the LIFE tables; a day sky the old ones) */
  function lvWhat(r, cls, beh) {
    var L = LIFE[cls], pat, sort, n;
    if (beh === 'wheel') { pat = 'loose'; sort = cls === 'day' ? lvSort(r, [['gull', 60], ['stork', 40]]) : 'gull'; n = 3 + Math.floor(r() * 5); return [pat, sort, n]; }
    if (beh === 'hawk') return [r() < 0.5 ? 'pair' : 'loose', 'swallow', 0];
    if (beh === 'loiter') { var lt = lvSort(r, [['crow', 55], ['heron', 30], ['gull', 15]]); return [lt === 'heron' ? 'single' : lvSort(r, [['pair', 55], ['single', 25], ['loose', 20]]), lt, 0]; }
    pat = L ? weighted(r, L.pat.filter(function (p) { return p[0] !== 'loose'; })) : lvSort(r, [['skein', 25], ['line', 25], ['pair', 30], ['single', 20]]);
    sort = L && L.kinds[pat] ? weighted(r, L.kinds[pat]) : weighted(r, SORT_OF[pat] || [['gull', 1]]);
    if (beh === 'migrant') { pat = r() < 0.6 ? 'skein' : 'line'; sort = 'goose'; }
    return [pat, sort, 0];
  }
  function lvCount(r, pat, n) {
    if (n) return n;
    if (pat === 'single') return 1; if (pat === 'pair') return 2;
    var t = LIFE_N[pat] || [[3, 1]], k = weighted(r, t.map(function (e) { return [e[0], e[1]]; }));
    return k === 4 ? 5 : k;
  }
  /* the places in its pattern (m: back along its way, aside, up), in the kind's own spans */
  function lvSlots(r, pat, n, spm, sort) {
    var S = [], i, k, side;
    for (i = 0; i < n; i++) {
      if (!i) { S.push([0, 0, 0]); continue; }
      /* (v10) a skein's arms not level (one a little higher, each bird a little higher than the one ahead of it on its
         arm), a line's birds staggered in height: seen side on, a level V's arms lay on one another (v9: two birds of a
         skein touching in 17 % of its frames, of a loose group 22 %, of a line 10 %) */
      if (pat === 'skein') { var VG = V_GEOM[sort] || V_GEOM.goose; k = Math.ceil(i / 2); side = i % 2 ? 1 : -1; S.push([k * pick(r, VG.x) * spm, side * k * pick(r, VG.y) * spm, (side * 0.5 + 0.25) * k * spm + (r() - 0.5) * 0.2 * spm]); }
      else if (pat === 'line') S.push([i * mix(r(), 1.6, 2.2) * spm, (r() - 0.5) * 0.6 * spm, (i % 2 ? 0.55 : -0.55) * spm + (r() - 0.5) * 0.3 * spm]);
      else if (pat === 'pair') S.push([mix(r(), -0.4, 0.6) * spm, (r() < 0.5 ? 1 : -1) * mix(r(), 1.3, 2) * spm, (r() - 0.5) * 0.6 * spm]);
      else {   // (a loose cloud, its birds 1.6 spans apart at least: v7's fell on one another)
        var rr = Math.sqrt(n) * 1.9 * spm, c, tries2;
        for (tries2 = 0; tries2 < 30; tries2++) {
          c = [(r() * 2 - 0.5) * rr, (r() * 2 - 1) * rr, (r() * 2 - 1) * 0.8 * rr];
          if (S.every(function (q) { var a = q[0] - c[0], b = q[1] - c[1], e = q[2] - c[2]; return a * a + b * b + e * e >= 5 * spm * spm; })) break;
        }
        S.push(c);
      }
    }
    return S;
  }
  /* a flock made at (x, y, z) heading h (world: (sin h, cos h) on the ground), with its behaviour's own state */
  function lvMake(beh, x, y, z, h, cls, what) {
    var r = sm32((visitSeed ^ Math.imul(9001 + (++LIVE.k), 0x9E3779B9)) >>> 0), w = what || lvWhat(r, cls, beh), pat = w[0], sort = w[1], n = lvCount(r, pat, w[2]), S = SORTS[sort] || SORTS.gull;
    if (n > freeSlots()) n = pat === 'skein' ? (freeSlots() >= 5 ? 5 : 0) : Math.min(n, freeSlots());
    if (n < 1) return null;
    var spm = B_SPAN * S.size * MODEL_K, v0 = (LV_SPEED[sort] || 11), sl = lvSlots(r, pat, n, spm, sort), i, m;   // (v22: a skein's V the crossings' own, V_GEOM: v21's full angle was 73 deg, the crossings' 48)
    var P = { place: true, live: true, eye0: LVC.y, g0: lvGround(x, z), kind: 'live', pat: pat, beh: beh, sort: sort, S: S, n: n, key: 50000 + LIVE.k, t0: t, m: [], dur: 1e9, r: r,
      fadeS: LV_FADE[beh] || LV_FADE.commute, cx: x, cy: y, cz: z, base: y, up: 0, v0: v0, spm: spm, cls: cls,
      tr: { x: [x], y: [y], z: [z], h: [h], n: 1 },
      st: { h: h, c: 0, v: v0, eh: 0, ec: 0, ev: 0, hb: h, ah: 0, ac: 0, aT: -1, y0: y, cx: x, cz: z, R: 0, sense: r() < 0.5 ? 1 : -1, leaveT: 1e9, hx: x, hz: z, Rh: pick(r, LV_HOME), hc: h } };
    if (beh === 'wheel') {
      var lap = pick(r, LV_LAP); P.st.R = v0 * lap / TAU; P.st.leaveT = lap * pick(r, LV_LAPS);
      P.st.cx = x - P.st.R * Math.cos(h) * P.st.sense; P.st.cz = z + P.st.R * Math.sin(h) * P.st.sense;   // (its ring's centre beside it, so it is on the ring heading round)
    }
    /* (v17) its event glides (eventGlides' rules, found along its route as it is worked out, lvEvents): a goose's set wings */
    P.eg = []; P.egS = { r0: -1, tot: 0, ti: -1, d0: -1, di: -1 }; P.egSet = sort === 'goose' ? pick(r, [6, 10]) : 0;
    for (i = 0; i < n; i++) {
      m = { d: measureBird3D(drawBird(r, S), sort, SPAN * view * S.size * (1 + SIZE_VAR * (r() * 2 - 1))), f: 0, delay: 0, half: r(), rest: r(), glide: pick(r, S.glide), n: 1, s: null, lag: 0, lat: 0,
        b: sl[i][0], a: sl[i][1], u: sl[i][2], lagT: sl[i][0] / v0, wk: Math.floor(r() * NOISE_N), wT: pick(r, DRIFT_T) * 1.4,
        wL: pick(r, DRIFT_L) * spm * (pat === 'loose' ? 2 : 1), wP: pick(r, DRIFT_P) * spm * (pat === 'loose' ? 2 : 1) };
      m.w = placeWing(sort, r); m.f = m.w.f; m.egD = m.lagT;   // (v17: a glide passes back down the flock as its birds reach the turn)
      P.m.push(m);
    }
    return P;
  }
  /* the leader at its time tau: x, y, z, heading (its worked-out route, LV_DT apart; before it, back along its first
     heading; past its end, on along its last) */
  var LVQ = { x: 0, y: 0, z: 0, h: 0 };
  function lvAt(P, tau, o) {
    var T = P.tr, k = tau / LV_DT, i = Math.floor(k), a, v = P.st.v || P.v0;
    if (i < 0) { var hb = T.h[0]; o.x = T.x[0] + v * tau * Math.sin(hb); o.z = T.z[0] + v * tau * Math.cos(hb); o.y = T.y[0]; o.h = hb; return o; }
    if (i >= T.n - 1) {
      var j = T.n - 1, e = tau - j * LV_DT, hl = T.h[j], dy = j > 0 ? (T.y[j] - T.y[j - 1]) / LV_DT : 0;
      o.x = T.x[j] + v * e * Math.sin(hl); o.z = T.z[j] + v * e * Math.cos(hl); o.y = T.y[j] + dy * e; o.h = hl; return o;
    }
    a = k - i;
    o.x = T.x[i] + (T.x[i + 1] - T.x[i]) * a; o.y = T.y[i] + (T.y[i + 1] - T.y[i]) * a; o.z = T.z[i] + (T.z[i + 1] - T.z[i]) * a;
    o.h = T.h[i] + angDiff(T.h[i + 1], T.h[i]) * a;
    return o;
  }
  /* a bird of a living flock at its flight's time: the leader's way a moment back (its place behind), aside, up, and its
     own wander about its place */
  function liveSpot(P, m, tau, o) {
    lvAt(P, tau - m.lagT, LVQ);
    var h = LVQ.h, ch = Math.cos(h), sh = Math.sin(h), x = tau / m.wT;
    var wl = m.wL * wave(m.wk, x), wa = m.a + m.wP * wave(m.wk + 53, x / 1.3), wu = m.u + 0.6 * m.wP * wave(m.wk + 97, x / 1.1);
    o.x = LVQ.x + wa * ch + wl * sh; o.z = LVQ.z - wa * sh + wl * ch; o.y = LVQ.y + wu;
    return o;
  }
  var LVQ2 = { x: 0, y: 0, z: 0, h: 0 };
  /* (v13) a bird's box (the planner's and the words' guard's) with the night halo's reach at its own nearness now (as
     measureBird3D counts it at a flight's: a living flock's distance changes, and v12 counted it at nearness 1, a third
     of its reach at 0.3, so the guard foresaw a far bird reaching the words' margin late and it stepped back alone) */
  function lvBox(m, n) {
    var d = m.d, N = !FORCED && HOST.night ? HOST.night() : 0, pen = 0.5 * LINE[1] + 1.5;
    var hp = N > 0 && HALO_IN_BOX ? 4 * (W < 600 ? HALO_E[1] : HALO_E[0]) / Math.max(n, 0.15) : 0;
    d.hw = d.gw / 2 + pen + hp; d.hh = d.gh / 2 + pen + hp; d.halo = hp;
  }
  /* the camera's way: where it is and goes (m/s), from its frame state */
  var LVC = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, clr: 0 };
  function lvCam(C) {
    LVC.x = C.pos[0]; LVC.y = C.pos[1]; LVC.z = C.pos[2]; LVC.clr = C.pos[1] - lvGround(C.pos[0], C.pos[2]);
    var s = FL.speed || 0, p = FL.psi || 0;
    LVC.vx = CAMV[0] || s * Math.sin(p); LVC.vy = CAMV[1] || 0; LVC.vz = CAMV[2] || s * Math.cos(p);
    return LVC;
  }
  /* a world point on the window through camera C moved by its velocity for T s (its look held) */
  var LVP = { x: 0, y: 0, n: 0, z: 0 };
  function lvProj(x, y, z, C, T, o) {
    var cx = C.pos[0] + LVC.vx * T, cz = C.pos[2] + LVC.vz * T, cy = T > 0 ? lvGround(cx, cz) + LVC.clr : C.pos[1];
    var dx = x - cx, dy = y - cy, dz = z - cz;
    var zc = dx * C.f[0] + dy * C.f[1] + dz * C.f[2]; o.z = zc;
    if (!(zc > 0.5)) { o.x = o.y = NaN; o.n = 0; return o; }
    var xc = dx * C.r[0] + dy * C.r[1] + dz * C.r[2], yc = dx * C.u[0] + dy * C.u[1] + dz * C.u[2];
    o.x = W / 2 * (1 + xc / zc / VW.tanX); o.y = H / 2 * (1 - yc / zc / VW.tanY); o.n = (W / 2) / VW.tanX * MPU / zc;
    return o;
  }
  /* (v17) the event glides along a living flock's route, as eventGlides finds them in a crossing's path (the old flights'
     rule: a turn of 25 deg or more entered gliding, EG_TURN of the time, from 0.5-0.8 s before it; a descent of 2 deg or
     more held 2 s glided on set wings, EG_DESC_P of the time, EG_DESC s of it), found as each step is added; none
     begins sooner than half a second from now (the route runs LV_AHEAD s ahead). v16's living geese never glided: the
     old rule runs once over a crossing's whole path, and places were skipped. Not on a day sky (the old rule's too) */
  function lvEvents(P, j, dt) {
    var T = P.tr, S = P.egS, k = P.sort, r = P.r, tau = j * dt, lim = tau - (LV_AHEAD - 0.5);
    if (!S || j < 1 || P.cls === 'day') return;
    var dh = angDiff(T.h[j], T.h[j - 1]) / dt / DEG;
    if (Math.abs(dh) > 3) {
      if (S.r0 < 0) { S.r0 = tau; S.tot = 0; S.ti = -1; }
      S.tot += dh * dt;
      if (S.ti === -1 && Math.abs(S.tot) >= 25) { S.ti = -2; if (r() < (EG_TURN[k] || 0.5)) { P.eg.push([Math.max(S.r0 - pick(r, [0.5, 0.8]), lim), 1e9, 'turn']); S.ti = P.eg.length - 1; } }
    } else if (S.r0 >= 0) { if (S.ti >= 0) P.eg[S.ti][1] = tau; S.r0 = -1; }
    var dn = (T.y[j] - T.y[j - 1]) / ((P.st.v || P.v0) * dt) < -Math.sin(2 * DEG);
    if (dn) {
      if (S.d0 < 0) { S.d0 = tau; S.di = -1; }
      if (S.di === -1 && tau - S.d0 >= 2) { S.di = -2; if (r() < (EG_DESC_P[k] || 0.2)) { var st = Math.max(S.d0 + 0.5 * r(), lim); P.eg.push([st, st + (EG_DESC[k] || 4) * pick(r, [0.7, 1.15]), 'set']); S.di = P.eg.length - 1; } }
    } else if (S.d0 >= 0) { if (S.di >= 0) P.eg[S.di][1] = Math.min(P.eg[S.di][1], tau); S.d0 = -1; }
  }
  /* the leader's route worked out to tau end: its behaviour's heading and climb, its wander, the avoidance's bias, its
     kind's turn and climb limits, its airspeed and the wind */
  function lvExtend(P, tEnd) {
    var T = P.tr, s = P.st, r = P.r, dt = LV_DT, wmax = (LV_TURN[P.sort] || 15) * DEG, eye = P.eye0;   // (v25: the eye's height at its birth: nothing in its flight follows the camera)
    windNow(); var wxw = WINDV[0], wzw = WINDV[2];
    while ((T.n - 1) * dt < tEnd) {
      var j = T.n - 1, x = T.x[j], y = T.y[j], z = T.z[j], tau = j * dt, hd, cd;
      var Th = P.beh === 'hawk' ? 1.5 : P.beh === 'loiter' ? 6 : 10, sh = P.beh === 'hawk' ? 40 : P.beh === 'loiter' ? 25 : P.beh === 'migrant' ? 3 : 7;
      s.eh += -s.eh * dt / Th + sh * DEG * Math.sqrt(2 * dt / Th) * lvG(r);
      s.ec += -s.ec * dt / (P.beh === 'hawk' ? 1.2 : 6) + (P.beh === 'hawk' ? 10 : 2.5) * DEG * Math.sqrt(2 * dt / (P.beh === 'hawk' ? 1.2 : 6)) * lvG(r);
      s.ev += -s.ev * dt / 8 + 0.06 * Math.sqrt(2 * dt / 8) * lvG(r);
      if (P.beh === 'wheel' && tau < s.leaveT) {
        s.cx += wxw * dt; s.cz += wzw * dt;   // (its ring drifts downwind)
        var rx = x - s.cx, rz = z - s.cz, rr = Math.sqrt(rx * rx + rz * rz) || 1, ph = Math.atan2(rx, rz);
        hd = ph + s.sense * Math.PI / 2 - s.sense * clamp(1.2 * (rr - s.R) / s.R, -0.7, 0.7);
      } else if (P.beh === 'loiter' || P.beh === 'hawk') {
        var hx = s.hx - x, hz = s.hz - z, hdist = Math.sqrt(hx * hx + hz * hz), toHome = Math.atan2(hx, hz);
        s.hc += angDiff(s.hb + s.eh, s.hc) * Math.min(1, dt / 2);
        /* (v18) back in, and on across its patch on the way it came in (v17 turned it back out at once to its old way:
           crows circled at the patch's edge at their whole 22 deg/s); now and then a gentle new way inside it */
        if (hdist > s.Rh) { s.hb = toHome; hd = toHome + 0.5 * s.eh; } else hd = s.hb + s.eh;
        if (hdist < 0.4 * s.Rh && r() < 0.004) s.hb += (r() * 2 - 1) * 60 * DEG;
      } else hd = s.hb + s.eh;   // (commute, migrant: its bearing, wandering)
      if (P.beh === 'wheel' && tau >= s.leaveT && s.hb === s.h0) s.hb = s.h;   // (away on the tangent)
      var bias = s.aT >= 0 && t - s.aT < 1.5 ? 1 : Math.max(0, 1 - (t - s.aT - 1.5) / 2);
      hd += s.ah * bias;
      s.h += clamp(angDiff(hd, s.h), -wmax * dt, wmax * dt);
      if (j % 10 === 0 || s.gN === undefined) s.gN = lvGround(x, z) - P.g0;   // (v26: the land under it, a second at a time)
      var yWant = (P.beh === 'migrant' ? Math.max(s.y0, eye + 80) : (s.y0 - eye) < 15 ? eye + 15 : s.y0) + LV_TERRAIN * s.gN;   // (v26: over the land's rises and falls, as birds fly, never the camera's)   // (v20: a migrant high, but in the window's sky: 220 m over the eye took it out of the top)
      cd = clamp(0.02 * (yWant - y), -0.12, 0.12) + s.ec + s.ac * bias;
      s.c += clamp(cd - s.c, -0.35 * dt, 0.35 * dt);
      s.v = P.v0 * (1 + s.ev);
      var vh = s.v * Math.cos(s.c);
      T.x.push(x + (vh * Math.sin(s.h) + wxw) * dt); T.z.push(z + (vh * Math.cos(s.h) + wzw) * dt); T.y.push(y + s.v * Math.sin(s.c) * dt); T.h.push(s.h);
      T.n++;
      lvEvents(P, T.n - 1, dt);
    }
    /* (its route behind it trimmed: kept LV_KEEP s, for the birds a moment back on its way) */
    var keep = Math.floor(((t - P.t0) - 40) / dt);
    if (keep > 200) {
      var cut = keep - 100, sh = cut * dt; T.x.splice(0, cut); T.y.splice(0, cut); T.z.splice(0, cut); T.h.splice(0, cut); T.n -= cut; P.t0 += sh;
      if (P.eg) { for (var q = 0; q < P.eg.length; q++) { P.eg[q][0] -= sh; if (P.eg[q][1] < 1e8) P.eg[q][1] -= sh; } var S = P.egS; if (S.r0 >= 0) S.r0 -= sh; if (S.d0 >= 0) S.d0 -= sh; }
    }
  }
  /* (v12) the fastest a flock's leader moves on the window over its next T s (px/s) and whether it shows at all: its
     route worked out that far (the camera on at its velocity, its look held), then put back as it was */
  var LVR = { max: 0, seen: false, sb: 1, first: 1e9, dmin: 1e9 };
  function lvCap() { return LV_DEGS * DEG * (W / 2) / VW.tanX; }
  function lvRate(P, C, T) {
    var R = P.tr, k, best = 0, seen = false, px = NaN, py = NaN, tau, sb = 1, rad = 0, q, m0 = P.m[0], first = 1e9, dmin = 1e9;
    for (q = 0; q < P.m.length; q++) rad = Math.max(rad, Math.sqrt(P.m[q].a * P.m[q].a + P.m[q].b * P.m[q].b) + P.m[q].wP);
    lvExtend(P, T);
    for (tau = 0; tau <= T; tau += 0.5) {
      lvAt(P, tau, LVQ); lvProj(LVQ.x, LVQ.y, LVQ.z, C, tau, LVP);
      var ccx = LVC.x + LVC.vx * tau, ccz = LVC.z + LVC.vz * tau, ccy = lvGround(ccx, ccz) + LVC.clr;
      dmin = Math.min(dmin, Math.sqrt(Math.pow(LVQ.x - ccx, 2) + Math.pow(LVQ.y - ccy, 2) + Math.pow(LVQ.z - ccz, 2)));
      if (LVP.z > 1 && inView(LVP.x, LVP.y, 0, 0) && fadeFor(P, LVP.n) > 0.02) {
        seen = true; if (first > 1e8 && fadeFor(P, LVP.n) > 0.3) first = tau; if (px === px) best = Math.max(best, Math.sqrt((LVP.x - px) * (LVP.x - px) + (LVP.y - py) * (LVP.y - py)) / 0.5);
        px = LVP.x; py = LVP.y;
        lvBox(m0, LVP.n);   // (v16: and the words: the whole flock's reach about its leader)
        sb = Math.min(sb, stepBack(LVP.x, LVP.y, (m0.d.hw + rad / MPU) * LVP.n, (m0.d.hh + BOB * m0.d.span + rad / MPU * 0.6) * LVP.n));
      } else px = py = NaN;
    }
    LVR.dmin = dmin; LVR.max = best; LVR.seen = seen; LVR.sb = sb; LVR.first = first; return LVR;
  }
  /* is a world point seen now (in the window, its ink showing)? */
  function lvSeen(x, y, z, C, P) {
    lvProj(x, y, z, C, 0, LVP);
    return LVP.z > 1 && fadeFor(P, LVP.n) > 0.02 && inView(LVP.x, LVP.y, 40, 40);
  }
  /* a flock born for the sky, the reference's way (its creatures are placed in the viewer's way, and the viewer flies
     through their air): an encounter LV_MEET s ahead on the camera's way (where it will be, its look's direction),
     LV_SIDE aside and LV_UP above it, where this flock's own route will bring it then. A commuter on its role's bearing
     (the evening's flight line, against it, across it) set back along that bearing by as far as it flies in that time,
     so it comes into the window from out of it; a wheel or a loiterer waiting there, out of the distance (born beyond
     where its ink shows, or out of the window). Never born in view with its ink showing. (v1 scattered flocks 0.65-1.5
     km about the visitor: at that distance a bird is 2-5 px, and on a phone none was ever seen) */
  /* Three kinds of meeting, from the physics of a viewer moving at 12 m/s (v3 put its meetings 60-260 m ahead and
     120-380 m aside: mostly outside the window's cone, and on a phone none was seen):
     - on the evening's line, flying the viewer's general way: heading off its course by about acos(its speed over the
       camera's), so that relative to the viewer it drifts mostly across: at 150-320 m it crosses the window in about
       15-35 s at its real airspeed, neither swelling nor shrinking much (a goose 17 m/s at 45 deg, an ibis 31; the
       slower kinds near the course, falling back slowly);
     - against the line or across it: the viewer closes on it fast, so it is met farther out (450-900 m), crossing;
     - wheels, loiterers, swallows hawking: placed ahead beside the way, born where their ink does not yet show (about
       nearness 0.13), coming out of the distance as the viewer comes and passing beside it.
     Each set back along its own way by as far as it flies until the meeting, so it comes into the window from out of
     it; never born in view with its ink showing. */
  var LV_E1 = [120, 260], LV_E2 = [350, 700], LV_E3_LAT = [110, 220], LV_UP = { loiter: [40, 120], hawk: [30, 90], wheel: [60, 160] };
  function lvWhy(k) { var w = STATS.lvWhy = STATS.lvWhy || {}; w[k] = (w[k] || 0) + 1; }
  /* a height on the window in the open sky (openBands, its reach px above and below), weighted by the bands' sizes */
  function lvBand(r, reach) {
    var B = openBands(reach, reach), tot = 0, i, u;
    for (i = 0; i < B.length; i++) tot += Math.max(0, B[i][1] - B[i][0]);
    if (!(tot > 4)) return null;
    u = r() * tot;
    for (i = 0; i < B.length; i++) { var s = Math.max(0, B[i][1] - B[i][0]); if (u <= s) return B[i][0] + u; u -= s; }
    return B[B.length - 1][1];
  }
  /* the world point at depth A (m, along the look) seen at window (x, y) through camera C as it looks now */
  function lvAim(C, x, y, A, o) {
    var sx = (2 * x / W - 1) * VW.tanX, sy = (1 - 2 * y / H) * VW.tanY;
    o.x = C.pos[0] + A * (C.f[0] + sx * C.r[0] + sy * C.u[0]); o.y = C.pos[1] + A * (C.f[1] + sx * C.r[1] + sy * C.u[1]); o.z = C.pos[2] + A * (C.f[2] + sx * C.r[2] + sy * C.u[2]);
    return o;
  }
  function lvSpawn(C, cls, rescue) {
    var r = LIVE.r, beh = weighted(r, LV_BEH[cls] || LV_BEH.day), look = Math.atan2(C.f[0], C.f[2]), tries, x, y, z, h, P, A;
    if (rescue && beh !== 'migrant') beh = 'commute';
    var DW = DIRS[cls] || [40, 25, 25, 10], role = beh === 'commute' || beh === 'migrant' ? weighted(r, [['stream', DW[0]], ['counter', DW[1]], ['cross', DW[2]], ['local', DW[3]]]) : 'local';
    if (rescue || beh === 'migrant') role = 'stream';
    if (role === 'local' && (beh === 'commute')) beh = 'loiter';
    var what = lvWhat(r, cls, beh), v = LV_SPEED[what[1]] || 12, cs = Math.sqrt(LVC.vx * LVC.vx + LVC.vz * LVC.vz), course = cs > 1 ? Math.atan2(LVC.vx, LVC.vz) : look;
    var kN = (W / 2) / VW.tanX * MPU;   // (nearness x distance)
    windNow();
    /* (v8) in a head wind the camera goes through the air faster than the slower kinds fly (the dunes: 18.5 m/s against a
       gull's 11): a meeting on the viewer's way is then a strong flyer's, geese or ibis, as in a real head wind */
    if ((role === 'stream' || rescue) && (beh === 'commute' || beh === 'migrant') && v < 0.95 * Math.sqrt(Math.pow(LVC.vx - WINDV[0], 2) + Math.pow(LVC.vz - WINDV[2], 2))) {
      what = [what[0] === 'single' || what[0] === 'pair' ? what[0] : (r() < 0.6 ? 'skein' : 'line'), r() < 0.75 ? 'goose' : 'ibis', 0]; v = LV_SPEED[what[1]];
    }
    var aK = 1, fd = LV_FADE[beh] || LV_FADE.commute;   // (v12: how much farther out than drawn, after a try that swept the eye; v20: its fade)
    for (tries = 0; tries < 16; tries++) {
      var sd = r() < 0.5 ? 1 : -1;
      if (beh === 'commute' || beh === 'migrant') {
        /* (v8) its heading solved in the look's own frame (v7 aimed by the camera's course; where the camera looked well
           off its course, 'flying its way' moved along the line of sight: no flock could cross, and three visits stayed
           empty for minutes): relative to the viewer it moves across the window at s m/s and nearer or farther at d
           (near meetings -2.5..3, a gentle change of size; far ones closing at 3-9), at its kind's own airspeed v
           through the air: |(the camera's air velocity) + s R + d F| = v, R across the window and F along the look */
        var near = role === 'stream' || rescue;
        /* (v18) met at its kind's own nearness (SORTS depth: the crossings' true sizes, which the owner approved; the
           far meetings, against the line or across it, at three quarters of it): v17 met them at 120-700 m, a median of
           9 px across on a desktop against the crossings' 20 (a wheel or a loiterer 5) */
        A = Math.max(60, (beh === 'migrant' ? kN / mix(r(), 0.42, 0.62) : kN / (pick(r, (SORTS[what[1]] || SORTS.gull).depth) * (near ? 1 : 0.75)))) * aK;
        var Fx = Math.sin(look), Fz = Math.cos(look), Rx = Math.cos(look), Rz = -Math.sin(look);
        var ax = LVC.vx - WINDV[0], az = LVC.vz - WINDV[2], aR = ax * Rx + az * Rz, aF = ax * Fx + az * Fz;
        var dd0 = near ? mix(r(), -2.5, 3) : mix(r(), -9, -3), tx = VW.tanX * 1.12, kT = rescue ? 1.05 : 1.25;
        /* (v22) which way it crosses the window: a commuter on the evening's line goes the line's way 65 % of the time (a
           migrant 75 %), the rest on its other side of the viewer's way; a rescue either way. v21 sent every one on the
           line, and every rescue, the line's way: a visit's flights went one way a median 83 % of the time (all of them in
           a tenth of visits), against the crossings' 68 % (the owner: "flying only in 1 direction") */
        var sgn = role === 'counter' ? -LIVE.side : role === 'cross' || rescue ? (r() < 0.5 ? 1 : -1) : (r() < (beh === 'migrant' ? 0.75 : 0.65) ? LIVE.side : -LIVE.side);
        /* (v12) if the drawn way cannot cross the window soon enough (in a head wind a goose flying the viewer's way can
           barely keep pace with it: v11 refused every try, and a moonlit visit stayed empty for two minutes), the way
           across it quickest: its speed along the look where the crossing outruns the closing most (aF + dd = v sin of
           the cone's angle); and a meeting a little nearer (to 0.6 of the drawn) to come within 45 s */
        var ddQ = v * tx / Math.sqrt(1 + tx * tx) - aF, cand = [dd0, ddQ], ci, dd, wl, den, Tm = 1e9, sol = 0, fail = 'slow';
        for (ci = 0; ci < 2 && !sol; ci++) {
          dd = clamp(cand[ci], -aF - 0.92 * v, -aF + 0.92 * v);
          var rad = v * v - (aF + dd) * (aF + dd); if (rad < 1) { fail = 'slow'; continue; }
          var sq = Math.sqrt(rad); wl = -aR + sgn * sq;
          if (Math.abs(wl) < 3.5 && Math.abs(-aR - sgn * sq) > Math.abs(wl)) wl = -aR - sgn * sq;   // (v10: into a crosswind its chosen way crosses at a crawl: it crosses the other way; v23: only under 3.5 m/s, about 17 px/s on a desktop (v22's 6 sent most flocks downwind across the window: one way 81 % of a visit's flights, the crossings' 68 %))
          if (Math.abs(wl) < 2) { fail = 'hang'; continue; }   // (it would hang in the window)
          /* (v8) begun outside the window's cone: across by more than the cone's half-width at the depth it begins at
             (nearer on its way in it is deeper, where the cone is wider); if its closing is too steep for that, begun
             where its ink does not yet show and let come out of the distance */
          den = Math.abs(wl) - Math.max(0, -dd) * tx;
          if (den > 0.8) {
            Tm = Math.max(3, A * tx / den * kT);
            if (Tm > 45 && Tm <= 75) { A *= 45 / Tm; Tm = 45; }
            if (Tm <= 45) sol = 1; else fail = 'long';
          } else if (-dd > 0.5) { var zf = kN / (fd[0] * 0.95); Tm = (zf - A) / -dd; if (Tm <= 60) sol = 2; else fail = 'cone'; }
          else fail = 'cone';
        }
        if (!sol) { lvWhy(fail); continue; }
        if (ci > 1) lvWhy('quick');
        var wx = wl * Rx + dd * Fx, wz = wl * Rz + dd * Fz, vbx = LVC.vx + wx, vbz = LVC.vz + wz;
        h = Math.atan2(vbx - WINDV[0], vbz - WINDV[2]);
        /* (v5) the meeting aimed at a band of open sky (openBands: clear of the words, which on a phone fill most of the
           window's middle: v4's phone flocks crossed through them and the words' guard took every one) and set back from
           outside the window's side by half its width again (v4 began some just inside it) */
        var by = lvBand(r, 22); if (by === null) { lvWhy('noband'); continue; }
        lvAim(C, W / 2 + (r() * 2 - 1) * 0.2 * W / 2, by, A, LVQ);
        x = LVQ.x + LVC.vx * Tm - vbx * Tm; z = LVQ.z + LVC.vz * Tm - vbz * Tm; y = LVQ.y + LVC.vy * Tm;
      } else {
        A = kN / (fd[0] * mix(r(), 0.9, 1)) * aK;   // (v20: born just beyond its fade)
        var by3 = lvBand(r, 22); if (by3 === null) { lvWhy('noband'); continue; }
        var xf = clamp(sd * pick(r, LV_E3_LAT) * aK / (A * VW.tanX), -0.9, 0.9);   // (v10: beside the way by LV_E3_LAT m, never on it: v9 placed some ahead in the window's middle and flew through them)
        lvAim(C, W / 2 * (1 + xf), by3, A, LVQ); x = LVQ.x; z = LVQ.z; y = LVQ.y; h = TAU * r();
      }
      if (lvSeen(x, y, z, C, { fadeS: fd })) { lvWhy('seen'); STATS.lvSeenLast = [Math.round(LVP.x), Math.round(LVP.y), +LVP.n.toFixed(3), Math.round(LVP.z), +(Tm || 0).toFixed(1), +(wl || 0).toFixed(1), +(dd || 0).toFixed(1), Math.round(A), +C.f[0].toFixed(2), +C.f[1].toFixed(2), +C.f[2].toFixed(2), +LVC.vx.toFixed(1), +LVC.vz.toFixed(1)]; continue; }   // (never born in view with its ink showing)
      P = lvMake(beh, x, y, z, h, cls, what);
      if (!P) { lvWhy('slots'); return null; }
      P.role = role; P.st.h0 = P.st.hb;
      var RT = lvRate(P, C, beh === 'commute' || beh === 'migrant' ? LV_RATE_T.near : LV_RATE_T.far), cap = lvCap();
      if (RT.max > cap) { aK = Math.min(4, aK * RT.max / cap * 1.1); lvWhy('fast'); LIVE.k--; continue; }
      if (!RT.seen) { lvWhy('unseen'); LIVE.k--; continue; }
      if (RT.sb < 0.98) { lvWhy('words'); LIVE.k--; continue; }
      if (rescue && !(RT.first <= 5)) { lvWhy('late'); LIVE.k--; continue; }
      if (RT.dmin < LV_CLEAR) { lvWhy('near'); LIVE.k--; continue; }   // (v25: its way kept clear of the viewer's at birth, as it no longer steers after)   // (v21: a rescue shows within 5 s: v20's, slower than the viewer, came out of the distance 35 s later)   // (v16: a way onto the words is not flown: v15's near skein, steering late, went into the margin while it faded)   // (v15: a way that never comes into the window is not flown)
      return P;
    }
    STATS.lvNoSpawn = (STATS.lvNoSpawn || 0) + 1;
    return null;
  }
  /* (v15) how far a projected point lies outside the window (px; 0 inside; behind the eye, the farther behind the more) */
  function lvOut(o) { return !(o.z > 1) ? 1e4 - o.z : Math.max(0, Math.abs(o.x - W / 2) - W / 2, Math.abs(o.y - H / 2) - H / 2); }
  function liveStep(C, dt) {
    if (!C || !FL.ok) return;
    lvCam(C);
    var cls = skyCls(), i, P;
    if (!LIVE.r) LIVE.r = vstream(8800);
    if (cls !== LIVE.cls) { LIVE.cls = cls; LIVE.rb = TAU * LIVE.r(); LIVE.side = LIVE.r() < 0.5 ? 1 : -1; }   // (the evening's flight line: a world bearing drawn once a sky)
    /* each flock's route worked out ahead; every LV_EVERY s its look ahead (the words, the camera's way) */
    var look = t - LIVE.look >= LV_EVERY; if (look) LIVE.look = t;
    var live = 0, anySeen = false;
    for (i = PLACES.length - 1; i >= 0; i--) {
      P = PLACES[i]; if (!P.live) continue;
      if (P.gone && t - P.gone > (P.goneT || GONE_T)) { landPlace(P); continue; }   // (the words' guard: gone together)
      lvExtend(P, t - P.t0 + LV_AHEAD);
      lvAt(P, t - P.t0, LVQ);
      var dx = LVQ.x - LVC.x, dz = LVQ.z - LVC.z, dist = Math.sqrt(dx * dx + dz * dz), ahead = dx * Math.sin(FL.psi || 0) + dz * Math.cos(FL.psi || 0);
      if (look) { lvProj(LVQ.x, LVQ.y, LVQ.z, C, 0, LVP); for (var q2 = 0; q2 < P.m.length; q2++) lvBox(P.m[q2], LVP.z > 1 ? LVP.n : 0.15); }   // (v13: its birds' boxes at its nearness now)
      var drawn = drawnNow(P);
      if (P.lastSeen !== undefined && t - P.lastSeen < 0.6) { lvProj(LVQ.x, LVQ.y, LVQ.z, C, 0, LVP); if (fadeFor(P, LVP.n) >= 0.3) anySeen = true; }   // (v24: a faint far speck does not hold off the rescue)
      if (!drawn && (dist > LV_DROP || ahead < -LV_BEHIND)) { landPlace(P); STATS.lvDrop = (STATS.lvDrop || 0) + 1; continue; }   // (let go out of sight)
      /* (v15) let go once out of the window and going away from it (3 s on), or never seen in 75 s: v14's commuters,
         flying the viewer's way about its pace, crossed and then flew on beside it out of sight for minutes, and held
         the sky's count and its twelve birds (a phone's moonlit sky stayed empty for 39 s, every slot taken) */
      if (!drawn) {
        lvProj(LVQ.x, LVQ.y, LVQ.z, C, 0, LVP); var o0 = lvOut(LVP);
        lvAt(P, t - P.t0 + 3, LVQ2); lvProj(LVQ2.x, LVQ2.y, LVQ2.z, C, 3, LVP); var o1 = lvOut(LVP);
        P.awayT = o0 > 0 && o1 > o0 + 0.5 ? (P.awayT || 0) + dt : 0;
        if (P.awayT > 3 || (P.lastSeen === undefined && t - P.t0 > 75)) { landPlace(P); STATS.lvGone = (STATS.lvGone || 0) + 1; continue; }
      }
      live++;
    }
    if (anySeen) LIVE.seenT = t;
    if (!look) return;
    /* the sky kept alive: an encounter every LV_GAP s of the sky's (while fewer than LV_POP flocks live about the
       visitor); one sooner when the window has been empty LV_EMPTY s */
    var want = LV_POP[cls] || 5;
    if ((live < want && t >= LIVE.nextT) || t - LIVE.seenT > LV_EMPTY) {   // (v16: the rescue on its own clock, not the encounters')
      var rescue = t - LIVE.seenT > LV_EMPTY || !(STATS.lvMade > 0);   // (the first at once, just outside the side)
      P = lvSpawn(C, cls, rescue);
      if (P) {
        for (var q = 0, j = 0; q < slots.length && j < P.m.length; q++) if (!slots[q].busy) { slots[q].busy = true; P.m[j].s = slots[q]; dress(slots[q], P.m[j].d); j++; }
        P.id = 'p' + P.key; PLACES.push(P); STATS.lvMade = (STATS.lvMade || 0) + 1;
        lvExtend(P, LV_AHEAD);
        if (rescue) { LIVE.seenT = t; STATS.lvRescue = (STATS.lvRescue || 0) + 1; }
        LIVE.nextT = t + pick(LIVE.r, LV_GAP[cls] || LV_GAP.day);
      } else LIVE.nextT = t + 1.5;   // (v19: no way found, another try soon: v18 waited a whole gap, and a first bird came at 31 s)
    }
  }

  /* ---------------- the frames: each flight's, fixed in the world ---------------- */

  /* Every flight's frame keeps the camera's place (its origin is the camera's, exactly: in x and z as before, and now
     in height too: round 1 followed the camera's height over 1.2 s, and in DUNES, where the camera climbs and sinks
     with the land, every path on the window became a wave of 50-70 px) and its own heading, set when it is planned
     (F.yaw) and never turned after (round 1 turned the frame with the view: the birds stayed put on the glass while the
     land swept past, an overlay). The origin in use: at the end of a fixed step (the planning, the tracker), or as
     drawn (the camera between the last two steps) */
  var FL = {};
  var FW = { ox: 0, oy: 0, oz: 0 };
  /* the forced colours' camera: the birds' own still view (the live site's window), the world not drawn */
  var FCAM = { pos: [0, 0, 0], f: [0, 0, 1], r: [-1, 0, 0], u: [0, 1, 0], pitch: 0, roll: 0, inCloud: 0, cover: 0 };
  function forcedCam() {
    var p = Math.atan2(cam.s, cam.c), cp = Math.cos(p), sp = Math.sin(p);
    FCAM.f[0] = 0; FCAM.f[1] = sp; FCAM.f[2] = cp; FCAM.r[0] = -1; FCAM.r[1] = 0; FCAM.r[2] = 0;
    FCAM.u[0] = 0; FCAM.u[1] = cp; FCAM.u[2] = -sp; FCAM.pitch = p;
    return FCAM;
  }
  function camStep() { return FORCED ? FCAM : HOST.cameraStep(); }
  function camDrawn() { return FORCED ? FCAM : HOST.camera(); }
  function flightNow() {
    if (FORCED) { FL.ok = true; FL.x = FL.z = FL.y = 0; FL.psi = 0; FL.view = 0; FL.speed = 0; FL.vy = 0; FL.ground = -1e4; return FL; }
    return HOST.flight(FL);
  }
  function frameStep() {
    flightNow(); if (!FL.ok) return false;
    var C = camStep(); if (!C) return false;
    FW.ox = C.pos[0]; FW.oy = C.pos[1]; FW.oz = C.pos[2];
    return true;
  }
  /* a point of a flight's air (units) in the world (m) */
  function airToWorld(F, ax, ay, az, o) {
    var c = F.cyw, s = F.syw;
    o.x = FW.ox + MPU * (-c * ax + s * az); o.y = FW.oy + MPU * ay; o.z = FW.oz + MPU * (s * ax + c * az);
    return o;
  }
  /* where a bird is in the world at its flight's time tau: a travelling flight's (its place in its frame's air, about
     the camera) or a place's thermal's (fixed in the world) */
  var WS = {};
  function where(F, m, tau, o) {
    if (F.place) return placeSpot(F, m, tau, o);
    spot(F, m, tau, WS);
    return airToWorld(F, WS.ax, WS.ay, WS.az, o);
  }
  function setYaw(F, yaw) { F.yaw = yaw; F.cyw = Math.cos(yaw); F.syw = Math.sin(yaw); }
  /* a point of the world on the window through the world's camera C: CSS px, depth (m), nearness */
  function projReal(x, y, z, C, o) {
    var dx = x - C.pos[0], dy = y - C.pos[1], dz = z - C.pos[2];
    var zc = dx * C.f[0] + dy * C.f[1] + dz * C.f[2];
    o.z = zc;
    if (!(zc > 0.5)) { o.x = o.y = NaN; o.n = 0; return o; }
    var xc = dx * C.r[0] + dy * C.r[1] + dz * C.r[2], yc = dx * C.u[0] + dy * C.u[1] + dz * C.u[2];
    o.x = W / 2 * (1 + xc / zc / VW.tanX); o.y = H / 2 * (1 - yc / zc / VW.tanY);
    o.n = (W / 2) / VW.tanX * MPU / zc;
    return o;
  }

  /* ---------------- the paper: every bird a 3D cut-paper body, posed by its own flight (birds3d) ---------------- */

  /* The tattoo's mark, made a bird in 3D (the owner: "why are none of these 3d still?"; option 5, "Birds of light", no
     gold heads). Each bird is the form facet's model (birdform.js, posed by birdpose.js): a body and two wings hinged at
     the shoulder and the wrist, beating at its kind's real rate (SORTS hz, the visit's tempo, its own detune), gliding
     at its kind's glide (the tattoo's M seen from below and behind), its wings shut on a finch's bound. Its attitude is
     physical: the body along its velocity in the world (its own way in its frame and the camera's, no sideslip), rolled
     by the coordinated bank its own acceleration asks (tan phi = a_lat / (g + a_up): a wheel banks 8-20 deg, which is
     the tattoo's lean), pitched by its climb and its angle of attack. Nothing is pressed, mirrored or leaned on the
     window: its facing, its foreshortening, which wing is near, its turn to the camera all come from the projection.
     Every frame each drawn bird's 16 paper points are posed, placed and projected through the frame's camera to device
     px; the world's light lights its six panels (the sun wrapped about the paper, a share of it through the paper from
     behind, the sky's and the lit cloud sea's light from below), one tone a bird with a whisper of the fold, eased; a
     slow hold keeps it off its ground's own lightness (a grey tick on bright cloud, never a flicker). Then one
     instanced draw after the composite, at the canvas's resolution: each bird a quad whose fragments take the exact
     coverage of its 11 paper triangles and a pen floor along its leading edge's M (a wing seen edge-on is still the
     tattoo's line), hidden by the land and the clouds in front of it, kept off the words, and at night a light of its
     own and a soft halo (added light only). LEAN_TRIM (dev, 0: physics) holds a bank away from the camera while gliding:
     the owner's A/B. */
  /* (physics) the form and the wing: the lab's (LB: the faceted M through the skeleton rig, its flexing primaries), made
     lazy for the world (BW); FP the form's pose, FP2 its facets as the flexing primaries part them */
  var LB = LABBIRD(window.FACETFORM, window.FACETPOSE, window.WINGMODEL, window.WINGMODEL_DATA), BW = BIRDWING(LB, window.WINGMODEL_DATA), FP = LB.P, FP2 = LB.flexPose(), NP = FP.NP, KMD = window.WINGMODEL_DATA.kinds;
  var BANK_MAX = 35, ROLL_TAU = 0.25, ROLL_RATE = 45;   // (birdform.js's bank, unchanged: the coordinated bank's bound and its easing)
  var NV = 46, NFAC = 30, P16MAP = window.FACETFORM.kinds.gull.p16, CHAIN = window.FACETFORM.kinds.gull.chain;   // (every kind's: the 16 points' vertices, -1 the body point; the leading edge's M)
  function rollStep(roll, target, dt) {
    var want = roll + (target - roll) * (1 - Math.exp(-dt / ROLL_TAU)), lim = ROLL_RATE * dt, d = want - roll;
    return roll + (d < -lim ? -lim : d > lim ? lim : d);
  }
  /* a bounding finch's wings shut (birdform's shut, on the faceted rig: its tips at their glide) */
  var SHUT = {};
  function shut22(kind) {
    if (SHUT[kind]) return SHUT[kind];
    var p = FP.pose(), q = [6, -60, 0, 0.45, -4, -105, 0], tg = FP.kinds[kind].tipg;
    for (var sd = 0; sd < 2; sd++) { for (var i = 0; i < 7; i++) p[sd * NP + i] = q[i]; for (i = 0; i < 4; i++) p[sd * NP + 7 + i] = tg[i]; }
    return (SHUT[kind] = p);
  }
  /* the glide with its load (the lab's, no trims): for the planner's lean and the boxes */
  var ZTRIM = [0, 0, 0, 0, 0, 0, 1, 1, 1], GS0 = { flap: 0, ph: 0, k: 1, D: 0.5, a: 0, e: 0 }, GLW = { kind: 'gull', trim: ZTRIM }, GB3 = new Float64Array(3);
  function glide22(kind, out) { GLW.kind = kind; GLW.trim = ZTRIM; BW.poseS(GLW, GS0, 0, out, GB3); return out; }
  /* the 16 points of a 22-pose (spans, body frame): the flexing form's vertices by the old points' meanings */
  var V46T = new Float64Array(3 * NV);
  function pts16(kind, pose, body, out) {
    LB.geom(kind, pose, body, V46T, 'this');
    for (var q = 0; q < 16; q++) { var vi = P16MAP[q]; if (vi < 0) { out[3 * q] = body ? body[0] : 0; out[3 * q + 1] = 0; out[3 * q + 2] = body ? body[2] : 0; } else { out[3 * q] = V46T[3 * vi]; out[3 * q + 1] = V46T[3 * vi + 1]; out[3 * q + 2] = V46T[3 * vi + 2]; } }
    return out;
  }
  function slotArrays(s) {
    s.P22 = FP.pose(); s.B3 = new Float64Array(3); s.V46 = new Float64Array(3 * NV); s.X46 = new Float64Array(3 * NV); s.D46 = new Float32Array(2 * NV); s.IZ = new Float32Array(NV);
    s.NZ = new Float64Array(3 * NFAC); s.FE = new Float64Array(3 * NFAC); s.FA = new Float64Array(NFAC); s.VZ = new Float64Array(3 * NV); s.LS = { flap: 0, ph: 0, k: 1, D: 0, a: 0, e: 0, beat: -1, pause: 0, tuck: 0, psi: 0, lock: 0 }; s.lod = 0;
  }
  /* the rest phase of a still bird (reduced motion: a photograph): its own point in the beat, from the upper part of it */
  function restPhase(u) { return u < 0.22 ? u * 0.195 / 0.22 : 0.762 + (u - 0.22) * (1 - 0.762) / 0.78; }
  var MODEL_K = 1.19;          // (way-form: 1.38 for the bodied form; the wing-only form spans more of its model on the window) the drawn model's span on today's ink span (the glide seen from below and behind looks 0.64-0.75 of its span): paths and MPU unchanged
  var WING_ONLY = true;        // (way-path) the bird is the tattoo's M and nothing else: two wings joined at the body point (no head, neck, bill, legs, tail or body)
  var BODY_R = 0;              // (way-form) no body: the bird is the tattoo's M made solid, two wings meeting at the body point (the fix round's tapered body, 0.038 of the span, and its neck, bill and legs are gone)
  var FLOOR_K = 0.08;          // (way-form: unused but in the planner's pad) the pen floor is now today's pen itself: LINE's width for the bird's ink span (1.3 + 0.035 span, 1.5-2.5 CSS px, in quarter px), so the wing's stroke is the tattoo's stroke at every size
  var HOLD_POSE = [3, 8];      // device px of span: smaller, the beat's swing eases into the held glide (a speck holds its glide). (physics: the measured beat in full from 8 px; the shape round held it in from 16, and a 1440 px desktop's birds, 10-25 px, beat partly held 68 % of their time, a tenth of it at under 0.65 of the measured stroke: the stiffness the owner saw)
  var LEAN_TRIM = 0;           // deg: 0 the physics; 16 a held bank away from the camera while gliding (the B film; sideslip disclosed)
  var HALO_IN_BOX = true;      // at night the halo counts in the bird's box (nothing a bird adds comes within the words' margins)
  var PAPER = [0.94, 0.911, 0.853];   // the paper's albedo, linear (OKLab L 0.97, chroma 0.010, hue 85: a warm white)
  var WRAP = 0.45, TRANS = 0.3, BOUNCE = 0.45, FOLD = 0.06, PAPER_GAIN = 1.08;   // (PAPER_GAIN: calibrated on the realms' day films, A16: white on blue +0.10 OKLab L in 80 % and more)   // the sun wrapped about the paper; through it from behind; the cloud sea's light under it; the fold's whisper
  var TONE_T = 0.4;            // s: the bird's one tone eased (never a blink)
  var HOLD_DL = 0.10, HOLD_OUT = 0.11, HOLD_TT = 1.0;
  var LIGHT_IN = 0.09, LIGHT_OUT = 0.14, BACK_IN = 35, BACK_OUT = 40;   // (fix round) white only clear of its ground by this (OKLab L), grey till past that; backlit within this (deg)   // OKLab L: never this near its ground's lightness (darker then), let go past HOLD_OUT; eased over HOLD_TT s
  var GLOW_L = 0.78, GLOW_ENC = 0.72, HALO_A = 0.14, HALO_E = [3, 2];   // night: the paper's own light (OKLab L; as encoded), the halo's strength and e-folding (CSS px: a desktop, a phone)
  var AOA = [1.5, 1];          // deg: the body's angle to its way through the air gliding, flapping (fix: the body all but along its way, the wing's own incidence carrying the rest)
  var CW_DT = 0.25, CW_HOLD = 0.3;   // s: the cloud's weights before a bird, worked out this often (a share of the birds a frame), each held at its most this long
  var GRD_DT = 0.25;           // s: the ground under the birds asked for this often
  var FILTER = [1, 1.5];       // device px: the edge's filter for a bird of 24 px and more, and for a speck of 4 and less
  var PAPER_ON = true;         // (dev) false: the ink pass as before (not built: kept only as a switch name)
  /* (way-path) THE PATH AND THE VIEW: physics only (no set, no held bank), so the tattoo's lean must come from how a bird
     flies and how it is seen. A level wing-only bird shows the M on the tattoo's diagonal when its world heading is well
     off the camera's track (its near wing then stands higher on the window: perspective), seen from below; a bird
     turning away from the camera adds the coordinated bank of its turn (its far wing lower). With the camera flying
     12 m/s, the heading off its track is atan(the bird's own speed across / 12): so a lean crossing flies across at
     the calm's top pace and a little farther off (LEAN_N0), and the planner scores every path by the lean its readable
     birds would show (the judges' A3: the glide's five points against today's mean mark, rotation held, rms within
     today's own p95), under the same physics the drawer poses */
  var LEAN_H = 1;              // (shape, step 4d) the share of lean crossings whose height is chosen for the lean they can show (0: off; tried 0.5 and 1: 1 kept, desk A3 gliding 3.3 -> 6.8 %, phone 59 -> 64 %)
  var LEAN_AIR = true;         // (shape, the join; dev false: the planner's lean judged in still air, as way-path's)
  var LEAN_PLAN = true, LEAN_W = 160, LEAN_MODE = 0.8, LEAN_PSI = [24, 52], LEAN_N0 = 0.6, LEAN_PACE = 0.88, LEAN_TURN = 0.45, LEAN_TURN_A = [30, 55], LEAN_HD = [-3, 6];
  var P95K = { goose: 0.0688, ibis: 0.0723, gull: 0.0637, heron: 0.0754, crow: 0.0738, finch: 0.0744, swallow: 0.0704, stork: 0.0671 };   // (the judges' mark.py: today's own marks' lean-held rms, p95)
  var LQ = {}, LF = new Float64Array(10), LV = {};
  /* the physical lean of a bird at an air point (tmp: ax, ay, az, its heading hdg in the air, the path's climb), seen
     through the trial's view (projV): its glide posed along its world velocity (its own and the camera's) and rolled by
     the coordinated bank of its path's turn; the five points' rms against the mark, rotation held (NaN behind the eye) */
  function leanAir(F, m, A, hdg) {
    var kind = kindOf(F), lk = kind, Q = LQ[lk], P = F.path, i;
    if (!Q) Q = LQ[lk] = pts16(kind, glide22(kind, FP.pose()), null, new Float64Array(48)).slice();   // (physics: the lab's glide, its load: the flexing form's 16 points)
    var vo = F.v, ch = Math.cos(hdg), sh = Math.sin(hdg);   // (its pace along its path: where() moves it F.v a second)
    /* air: x right, y up, z out along the camera's way (units/s); the world's own axes are this mirrored (airToWorld) */
    var cs = (FL.speed || 0) / MPU, vx = vo * ch - cs * PV.sd, vy = (P.g || 0) * vo, vz = vo * sh + cs * PV.cd;   // (the camera's way as the trial's view predicts it: forward (-sin d, cos d) in this flight's air, d its turn since the job)
    if (WIND_ON && LEAN_AIR && !F.place) { vx -= WF[0]; vz -= WF[2]; }   // (shape, the join: its way through the air, the wind taken off, as poseBird lays the body: so the lean scored is the lean drawn)
    var inT = P.k && Math.abs(angDiff(hdg, P.h)) > 1e-4 && Math.abs(angDiff(hdg, P.h2)) > 1e-4, ak = inT ? vo * vo * P.k : 0;
    var ax = -sh * ak, az = ch * ak;
    /* to world-handed axes (x -> -x): then the drawer's attitude exactly (poseBird) */
    var wx = -vx, wy = vy, wz = vz, awx = -ax, awz = az, vl = Math.sqrt(wx * wx + wy * wy + wz * wz) || 1;
    var fx = wx / vl, fy = wy / vl, fz = wz / vl, lx = fz, lz = -fx, ll = Math.sqrt(lx * lx + lz * lz) || 1; lx /= ll; lz /= ll;
    var ux = fy * lz, uy = fz * lx - fx * lz, uz = -fy * lx;
    var alat = (awx * lx + awz * lz) * MPU, aup = (awx * ux + awz * uz) * MPU;
    var roll = clamp(-Math.atan2(alat, 9.81 + aup) / DEG, -BANK_MAX, BANK_MAX) * DEG;
    var ca = Math.cos(AOA[0] * DEG), sa = Math.sin(AOA[0] * DEG);
    var bxx = fx * ca + ux * sa, bxy = fy * ca + uy * sa, bxz = fz * ca + uz * sa, bzx = ux * ca - fx * sa, bzy = uy * ca - fy * sa, bzz = uz * ca - fz * sa;
    var cr = Math.cos(roll), sr = Math.sin(roll), byx = lx * cr + bzx * sr, byy = bzy * sr, byz = lz * cr + bzz * sr, bzx2 = bzx * cr - lx * sr, bzy2 = bzy * cr, bzz2 = bzz * cr - lz * sr;
    var sp = m.d.model, face = bxx < 0 ? 1 : -1;   // (facing right on the window: its forward along the air's +x, the world's -x)
    for (var q = 0; q < 5; q++) {
      var j = FI[q], x, y, z;
      if (q === 2) { x = 0.5 * (Q[6] + Q[24]); y = 0.5 * (Q[7] + Q[25]); z = 0.5 * (Q[8] + Q[26]); } else { x = Q[3 * j]; y = Q[3 * j + 1]; z = Q[3 * j + 2]; }
      var ox = (x * bxx + y * byx + z * bzx2) * sp, oy = (x * bxy + y * byy + z * bzy2) * sp, oz = (x * bxz + y * byz + z * bzz2) * sp;
      projV(A.ax - ox, A.ay + oy, A.az + oz, LV);
      if (!(LV.n > 0)) return NaN;
      LF[2 * q] = face * LV.x; LF[2 * q + 1] = -LV.y;
    }
    if (LF[0] > LF[8]) for (q = 0; q < 2; q++) { var t0 = LF[2 * q], t1 = LF[2 * q + 1]; LF[2 * q] = LF[8 - 2 * q]; LF[2 * q + 1] = LF[9 - 2 * q]; LF[8 - 2 * q] = t0; LF[9 - 2 * q] = t1; }
    var x0 = 1e9, x1 = -1e9; for (q = 0; q < 5; q++) { x0 = Math.min(x0, LF[2 * q]); x1 = Math.max(x1, LF[2 * q]); }
    var wd = x1 - x0; if (!(wd > 1e-9)) return NaN;
    var M = markOf(kind), pmx = 0, pmy = 0, qmx = 0, qmy = 0, cx = LF[4], cy = LF[5];
    for (q = 0; q < 5; q++) { LF[2 * q] = (LF[2 * q] - cx) / wd; LF[2 * q + 1] = (LF[2 * q + 1] - cy) / wd; pmx += LF[2 * q] / 5; pmy += LF[2 * q + 1] / 5; qmx += M[2 * q] / 5; qmy += M[2 * q + 1] / 5; }
    var pq = 0, pp = 0, e = 0;
    for (q = 0; q < 5; q++) { var px = LF[2 * q] - pmx, py = LF[2 * q + 1] - pmy; pq += px * (M[2 * q] - qmx) + py * (M[2 * q + 1] - qmy); pp += px * px + py * py; }
    var k = Math.max(1e-9, pq / Math.max(pp, 1e-12));
    for (q = 0; q < 5; q++) { var dx = k * (LF[2 * q] - pmx) + qmx - M[2 * q], dy = k * (LF[2 * q + 1] - pmy) + qmy - M[2 * q + 1]; e += dx * dx + dy * dy; }
    return Math.sqrt(e / 5);
  }
  /* (shape, dev only) the join's unit test: for every travelling bird drawn now, leanAir's five points (normalised as the
     judges normalise the drawn ones: less the body point, over the x-extent) and its rms, through the course's view at
     this moment, with the wind taken off (air) and without (ground: the planner before the join) */
  function leanProbe() {
    var out = [], A2 = {}, W0 = WF[0], W2 = WF[2];
    flights.forEach(function (F) {
      if (F.place || F.soar || F.still || !F.path) return;
      var tau = t - F.t0;
      viewAtK(F, VP.still ? 0 : Math.round((t - VP.t0) / STEP));
      F.m.forEach(function (m, mi) {
        if (!m.s || !m.s.on) return;
        var r = { f: F.id, mi: mi };
        for (var pass = 0; pass < 2; pass++) {
          if (pass === 0 && WIND_ON) { windNow(); var wcy = F.cyw === undefined ? 1 : F.cyw, wsy = F.syw === undefined ? 0 : F.syw; WF[0] = (-wcy * WINDV[0] + wsy * WINDV[2]) / MPU; WF[2] = (wsy * WINDV[0] + wcy * WINDV[2]) / MPU; } else WF[0] = WF[2] = 0;
          spot(F, m, tau, A2); var lr = leanAir(F, m, A2, wp.h);
          r[pass ? 'g' : 'a'] = { lr: lr === lr ? +lr.toFixed(5) : null, LF: Array.from(LF.slice(0, 10)).map(function (v) { return +v.toFixed(5); }) };
        }
        out.push(r);
      });
    });
    WF[0] = W0; WF[2] = W2;
    return out;
  }
  var SIDE_GATE = 0.35, TATTOO_K = 0.8;   // (planner) a travelling path whose readable birds spend over this share of their time side-on is not flown; among paths within TATTOO_K of the roomiest, the higher tattoo share preferred

  /* a bird's kind in the model (the SORTS' names are the model's) */
  function kindOf(F) { return FP.kinds[F.sort] && KMD[F.sort] ? F.sort : 'gull'; }
  /* a bird's model measured: its half-extents on the window at nearness 1 (air units), the most over its glide, eight
     points of its beat, the shut pose, rolled +-35 deg, seen from eight headings and four elevations (-30, 0, 30, 60):
     the planner's and the tracker's boxes (d.hw, d.hh), larger than the ink mark's (the planform from below), so every
     margin they keep holds for the 3D bird. Per kind, per unit of span (cached), scaled by the bird's span */
  /* (physics) every vertex of the lab's poses: the glide with its load and its trims at their extremes (the arms'
     dihedral and the bank, three sines' SD-scaled sum at its peak either way), the beat at 24 phases at its largest
     stroke (k 1.12, the lab's amplitude clip) with the body's heave and surge, the shut wings (a bounding finch); rolled
     +-BANK_MAX deg (the trims' own bank inside), from eight headings and four elevations */
  var MEAS = {}, MQ = new Float64Array(3 * 46);
  /* the same, worked out once offline (measureNorm(kind, true) below, rounded up at the 6th decimal; tools/meascheck.js
     keeps them equal): no frame pays for it */
  var MEAS0 = { gull: [0.492849, 0.495635], goose: [0.495883, 0.493833], stork: [0.490922, 0.491954], heron: [0.480600, 0.483534], ibis: [0.488292, 0.488814], crow: [0.495306, 0.497764], swallow: [0.494879, 0.498080], finch: [0.497768, 0.501119] };
  function measureNorm(kind, fresh) {
    if (!fresh && MEAS[kind]) return MEAS[kind];
    if (!fresh && MEAS0[kind]) return (MEAS[kind] = { hw: MEAS0[kind][0], hh: MEAS0[kind][1], tab: null });
    var poses = [], i, k, a, e, ro, hw = 0, hh = 0, tab = [], g = { kind: kind, trim: ZTRIM }, S = { flap: 1, ph: 0, k: 1.12, D: KMD[kind].D, a: 1, e: 1 };
    var hp = Math.PI / 2;
    [[hp, hp, hp, hp, hp, hp, 1, 1, 1], [-hp, -hp, -hp, -hp, -hp, -hp, 1, 1, 1], [hp, hp, hp, -hp, -hp, -hp, 1, 1, 1], [-hp, -hp, -hp, hp, hp, hp, 1, 1, 1], ZTRIM].forEach(function (tr) {
      g.trim = tr; var p = FP.pose(), bd = new Float64Array(3); BW.poseS(g, GS0, 0, p, bd); poses.push([p, bd]);
    });
    g.trim = ZTRIM;
    for (k = 0; k < 24; k++) { S.ph = k / 24; var p2 = FP.pose(), b2 = new Float64Array(3); BW.poseS(g, S, 0, p2, b2); poses.push([p2, b2]); }
    poses.push([shut22(kind), new Float64Array(3)]);
    var pts = poses.map(function (q) { return LB.geom(kind, q[0], q[1], new Float64Array(3 * 46), 'this').slice(); });
    for (a = 0; a < 8; a++) for (e = 0; e < 4; e++) {
      var az = a * 45 * DEG, el = [-30, 0, 30, 60][e] * DEG, thw = 0, thh = 0;
      for (ro = -1; ro <= 1; ro++) {
        var rl = ro * BANK_MAX * DEG, cr = Math.cos(rl), sr = Math.sin(rl);
        var fx = Math.cos(el) * Math.cos(az), fy = Math.cos(el) * Math.sin(az), fz = Math.sin(el);
        var rx = Math.sin(az), ry = -Math.cos(az), rz = 0;
        var ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx;
        if (uz < 0) { ux = -ux; uy = -uy; uz = -uz; }
        for (i = 0; i < pts.length; i++) {
          var P = pts[i];
          for (var q = 0; q < 46; q++) {
            var x = P[3 * q], y = P[3 * q + 1], z = P[3 * q + 2];
            var y2 = y * cr + z * sr, z2 = z * cr - y * sr;
            var u = x * rx + y2 * ry + z2 * rz, v = x * ux + y2 * uy + z2 * uz;
            if (Math.abs(u) > thw) thw = Math.abs(u); if (Math.abs(v) > thh) thh = Math.abs(v);
          }
        }
      }
      tab.push([a * 45, [-30, 0, 30, 60][e], +thw.toFixed(4), +thh.toFixed(4)]);
      hw = Math.max(hw, thw); hh = Math.max(hh, thh);
    }
    var res = { hw: hw, hh: hh, tab: tab };
    if (!fresh) MEAS[kind] = res;
    return res;
  }
  function measureBird3D(B, kind, span, n0) {
    var M = measureNorm(kind), sk = span * MODEL_K, pen = 0.5 * LINE[1] + 1.5;   // (way-form: the pen is today's, at most LINE[1])
    /* (fix round) at night the halo's reach (4 e-foldings, CSS px) counted in the planner's box too, at the flight's own
       nearness (round 2 counted it only in the drawn box: a skein planned on the day's margin rode the name's, its
       step back blinking with the beat) */
    var N = !FORCED && HOST.night ? HOST.night() : 0, hp = N > 0 && HALO_IN_BOX ? 4 * (W < 600 ? HALO_E[1] : HALO_E[0]) / Math.max(n0 || 1, 0.3) : 0;
    return { B: B, kind: kind, sc: 1, gx: 0, gy: 0, span: span, gw: 2 * M.hw * sk, gh: 2 * M.hh * sk,
             hw: M.hw * sk + pen + hp, hh: M.hh * sk + pen + hp, model: sk, halo: hp };
  }

  /* the camera's own way in the world (its place each step, for a travelling flight's escort: its velocity and its
     acceleration), from the steps' camera; begun again with each visit */
  var CVH = { t: new Float64Array(64), x: new Float64Array(64), y: new Float64Array(64), z: new Float64Array(64), n: 0, i: 0 };
  function camVelStep(C) {
    if (!C) return;
    var j = CVH.i; CVH.t[j] = t; CVH.x[j] = C.pos[0]; CVH.y[j] = C.pos[1]; CVH.z[j] = C.pos[2];
    if (CVH.n > 0) { var p = (j + 63) % 64, d = Math.abs(CVH.x[j] - CVH.x[p]) + Math.abs(CVH.z[j] - CVH.z[p]); if (d > 50 || CVH.t[j] < CVH.t[p]) { CVH.n = 0; CVH.t[0] = t; CVH.x[0] = C.pos[0]; CVH.y[0] = C.pos[1]; CVH.z[0] = C.pos[2]; CVH.i = 1; CVH.n = 1; return; } }   // (a new visit's coordinates)
    CVH.i = (j + 1) % 64; CVH.n = Math.min(64, CVH.n + 1);
  }
  /* the camera's velocity over the last h s, ago s back (m/s): into o */
  function camVelAt(ago, h, o) {
    if (CVH.n < 3) { o[0] = Math.sin(FL.psi || 0) * (FL.speed || 0); o[1] = FL.vy || 0; o[2] = Math.cos(FL.psi || 0) * (FL.speed || 0); return false; }
    var tEnd = t - ago, tBeg = tEnd - h, a = -1, b = -1, k, j;
    for (k = 0; k < CVH.n; k++) { j = (CVH.i + 63 - k) % 64; if (b < 0 && CVH.t[j] <= tEnd + 1e-6) b = j; if (CVH.t[j] <= tBeg + 1e-6) { a = j; break; } }
    if (a < 0) a = (CVH.i + 64 - CVH.n) % 64; if (b < 0) b = (CVH.i + 63) % 64;
    var dt = CVH.t[b] - CVH.t[a];
    if (!(dt > 0.02)) { o[0] = Math.sin(FL.psi || 0) * (FL.speed || 0); o[1] = FL.vy || 0; o[2] = Math.cos(FL.psi || 0) * (FL.speed || 0); return false; }
    o[0] = (CVH.x[b] - CVH.x[a]) / dt; o[1] = (CVH.y[b] - CVH.y[a]) / dt; o[2] = (CVH.z[b] - CVH.z[a]) / dt;
    return true;
  }
  var CV0 = [0, 0, 0], CV1 = [0, 0, 0], CAMV = [0, 0, 0], CAMA = [0, 0, 0];
  /* the camera's escort for this frame: its velocity, and its acceleration (two velocities 0.25 s apart), eased */
  function camEscort(moving) {
    if (!moving || FORCED) { var ok = camVelAt(0, 0.25, CAMV); CAMA[0] = CAMA[1] = CAMA[2] = 0; if (FORCED) CAMV[0] = CAMV[1] = CAMV[2] = 0; return; }
    camVelAt(0, 0.25, CV0); camVelAt(0.25, 0.25, CV1);
    for (var i = 0; i < 3; i++) { CAMV[i] = CV0[i]; CAMA[i] = clamp((CV0[i] - CV1[i]) / 0.25, -4, 4); }
  }

  /* (physics) the old burst's blend (beatInfo) is gone: the lab's envelopes blend glide and beat (BW.poseS) */
  var wa = {}, wb = {}, wc = {}, pa = {}, pb = {}, pc = {};   // (scratch points: where a bird is, and through the camera)
  var PGL22 = new Float64Array(22), WO = { swing: 1, shut: null };
  var wq = {}, wa3 = {}, wc3 = {}, VV = [0, 0, 0], AA = [0, 0, 0];
  function smoothK(a, b, x) { return ease((x - a) / (b - a)); }
  /* (fix round) the tattoo's set: its constants; each kind's lean (today's mean mark: its tips' line, rising toward the
     front, deg); the tips' line on the window of the glide with a set (deg, rising toward the way it faces) */
  /* (way-other) THE AIR: a bird flies through the air, not over the ground. Its body lies along its velocity through the
     air (no sideslip): its way over the ground less the wind. The realm's own wind (HOST.wind: the dunes' sand blowing at
     6.5 m/s; still air elsewhere) so turns a bird escorting the camera across a crosswind into it (a crab, as gulls and
     geese fly in any wind), and a flight crossing the window upwind heads further off the camera's track than its own
     way across would turn it: the view then shows its near wing higher (the tattoo's lean) with no pace added on the
     window. WIND_UP: the share of travelling flights sent across the window upwind while the crosswind is at least
     WIND_SIDE (m/s); downwind, a bird slower than the wind would slide backward under its own facing (the planner's BACK
     rule, now judged by the way it faces through the air) */
  /* AIR_MIN (m/s): no path is flown on which a bird's airspeed falls under its kind's least (about its stall: a downwind
     crossing slower than the wind leaves a goose at 8 m/s through the air, which it cannot fly) */
  var AIR_MIN = { goose: 10, ibis: 8, gull: 7.5, heron: 6.5, crow: 7, finch: 5, swallow: 5.5, stork: 8 };
  var WIND_ON = true, WIND_UP = 1.0, WIND_SIDE = 1.5, WINDV = [0, 0, 0], WF = [0, 0, 0], VG = [0, 0, 0];
  var WIND_K = 1;              // (shape, dev only: the world's wind scaled, for the sensitivity run at 1.6 m/s; 1 as shipped)
  function windNow() { if (WIND_ON && HOST.wind && !FORCED) { HOST.wind(WINDV); if (WIND_K !== 1) { WINDV[0] *= WIND_K; WINDV[1] *= WIND_K; WINDV[2] *= WIND_K; } } else WINDV[0] = WINDV[1] = WINDV[2] = 0; return WINDV; }
  var SET_ON = false, SET_PROBE = 20, SET_MIN = -12, SET_MAX = 34, SET_TAU = 0.45, SET_RATE = 40, SET_DT = 0.1, SET_HYST = 0.04;
  /* the kind's mean mark (today's drawBird at the middle of every range: its five points, y up, rising toward the front,
     less the body, over its width): what the set is solved against */
  var MARKS = {};
  function markOf(kind) {
    if (MARKS[kind]) return MARKS[kind];
    var B = drawBird(function () { return 0.5; }, SORTS[kind] || SORTS.gull), i, x0 = 1e9, x1 = -1e9, o = new Float64Array(10);
    shape(B, 1, false, SH, 0);
    for (i = 0; i < 5; i++) { x0 = Math.min(x0, SH[2 * i]); x1 = Math.max(x1, SH[2 * i]); }
    for (i = 0; i < 5; i++) { o[2 * i] = (SH[2 * i] - SH[4]) / (x1 - x0); o[2 * i + 1] = -(SH[2 * i + 1] - SH[5]) / (x1 - x0); }
    return (MARKS[kind] = o);
  }
  /* the glide with a set S, its five points on the window (the tips, the wrists, the shoulders' middle; mirrored as it
     faces, left to right), against the mark: the rms after scale and shift (no rotation: the lean held), as the judge's
     A3 measures it; NaN behind the eye */
  var PT = new Float64Array(22), QT = new Float64Array(48), FV = new Float64Array(10), FI = [0, 1, 2, 7, 6];
  function setRms(kind, PG0, S, sp, ox, oy, oz, bxx, bxy, bxz, byx, byy, byz, bzx, bzy, bzz, C, face) {
    for (var i = 0; i < 22; i++) PT[i] = PG0[i];
    PT[0] += S; PT[NP] -= S;
    pts16(kind, PT, null, QT);
    var sy = VW.outH / Math.max(1, VW.outW), q, j, x, y, z, ax, ay, az, zc;
    for (q = 0; q < 5; q++) {
      j = FI[q];
      if (q === 2) { x = 0.5 * (QT[6] + QT[24]) * sp; y = 0.5 * (QT[7] + QT[25]) * sp; z = 0.5 * (QT[8] + QT[26]) * sp; }
      else { x = QT[3 * j] * sp; y = QT[3 * j + 1] * sp; z = QT[3 * j + 2] * sp; }
      ax = ox + x * bxx + y * byx + z * bzx; ay = oy + x * bxy + y * byy + z * bzy; az = oz + x * bxz + y * byz + z * bzz;
      zc = ax * C.f[0] + ay * C.f[1] + az * C.f[2];
      if (!(zc > 0.5)) return NaN;
      FV[2 * q] = face * (ax * C.r[0] + ay * C.r[1] + az * C.r[2]) / zc / VW.tanX; FV[2 * q + 1] = (ax * C.u[0] + ay * C.u[1] + az * C.u[2]) / zc / VW.tanY * sy;
    }
    if (FV[0] > FV[8]) for (q = 0; q < 2; q++) { var t0 = FV[2 * q], t1 = FV[2 * q + 1]; FV[2 * q] = FV[8 - 2 * q]; FV[2 * q + 1] = FV[9 - 2 * q]; FV[8 - 2 * q] = t0; FV[9 - 2 * q] = t1; }
    var x0 = 1e9, x1 = -1e9; for (q = 0; q < 5; q++) { x0 = Math.min(x0, FV[2 * q]); x1 = Math.max(x1, FV[2 * q]); }
    var wd = x1 - x0; if (!(wd > 1e-9)) return NaN;
    var M = markOf(kind), pmx = 0, pmy = 0, qmx = 0, qmy = 0, cx = FV[4], cy = FV[5];
    for (q = 0; q < 5; q++) { FV[2 * q] = (FV[2 * q] - cx) / wd; FV[2 * q + 1] = (FV[2 * q + 1] - cy) / wd; pmx += FV[2 * q] / 5; pmy += FV[2 * q + 1] / 5; qmx += M[2 * q] / 5; qmy += M[2 * q + 1] / 5; }
    var pq = 0, pp = 0, e = 0;
    for (q = 0; q < 5; q++) { var px = FV[2 * q] - pmx, py = FV[2 * q + 1] - pmy; pq += px * (M[2 * q] - qmx) + py * (M[2 * q + 1] - qmy); pp += px * px + py * py; }
    var k = Math.max(1e-9, pq / Math.max(pp, 1e-12));
    for (q = 0; q < 5; q++) { var dx = k * (FV[2 * q] - pmx) + qmx - M[2 * q], dy = k * (FV[2 * q + 1] - pmy) + qmy - M[2 * q + 1]; e += dx * dx + dy * dy; }
    return Math.sqrt(e / 5);
  }
  var SET_GRID = [-12, -4, 4, 12, 20, 28, 34], SG_E = new Float64Array(7);
  /* the bird posed in the world this frame: its place (the planner's path), its velocity and acceleration (its own way
     and its frame's escort), its attitude (no sideslip; the coordinated bank, eased; the climb and the angle of attack),
     its wings (its beat, glides and bounds; the hold of the pose when far), its bob; its 16 points from the camera (m) */
  function poseBird(F, m, tau, rest, C, s, dt) {
    var kind = s.kind, d = s.d, i, h = 0.25;
    where(F, m, tau, wq); var px = wq.x, py = wq.y, pz = wq.z;
    where(F, m, tau + h, wa3); where(F, m, tau - h, wc3);
    VV[0] = (wa3.x - wc3.x) / (2 * h); VV[1] = (wa3.y - wc3.y) / (2 * h); VV[2] = (wa3.z - wc3.z) / (2 * h);
    AA[0] = (wa3.x - 2 * px + wc3.x) / (h * h); AA[1] = (wa3.y - 2 * py + wc3.y) / (h * h); AA[2] = (wa3.z - 2 * pz + wc3.z) / (h * h);
    if (!F.place) for (i = 0; i < 3; i++) { VV[i] += CAMV[i]; AA[i] += CAMA[i]; }   // (a travelling flight escorts the camera: its world way is the camera's and its own)
    VG[0] = VV[0]; VG[1] = VV[1]; VG[2] = VV[2];
    if (!F.place || F.live) { windNow(); VV[0] -= WINDV[0]; VV[1] -= WINDV[1]; VV[2] -= WINDV[2]; }   // (way-other: through the air, the wind taken off: the body along it)
    var vl = Math.sqrt(VV[0] * VV[0] + VV[1] * VV[1] + VV[2] * VV[2]);
    if (!(vl > 0.05)) { VV[0] = Math.sin(F.yaw || 0); VV[1] = 0; VV[2] = Math.cos(F.yaw || 0); vl = 1; }
    var fx = VV[0] / vl, fy = VV[1] / vl, fz = VV[2] / vl;
    /* its left: level, square to its way (world: y up; cross(up, f)) */
    var lx = fz, lz = -fx, ll = Math.sqrt(lx * lx + lz * lz) || 1; lx /= ll; lz /= ll; var ly = 0;
    var ux = fy * lz - fz * ly, uy = fz * lx - fx * lz, uz = fx * ly - fy * lx;   // up square to its way: f x l
    /* the coordinated bank: the apparent gravity in its plane */
    var alat = AA[0] * lx + AA[1] * ly + AA[2] * lz, aup = AA[0] * ux + AA[1] * uy + AA[2] * uz;
    var coord = -Math.atan2(alat, 9.81 + aup) / DEG;   // (+ right wing down: turning right)
    coord = clamp(coord, -BANK_MAX, BANK_MAX);
    /* (physics) THE WINGS: the lab's measured wing at this moment of the bird's day (its state: in a bout or gliding, its
       phase, the bout's envelopes, this beat's stroke and downstroke share), posed through the skeleton rig as LB.pose
       poses it (BW.poseS: the glide with its load and trims, the flapping cycle about its mean, blended by the
       envelopes) and the body's heave, surge and trim bank with it; the swing held toward the glide for a speck
       (HOLD_POSE) and while the gift is written; a bounding finch's wings shut between its bursts. Under reduced motion
       the same state, still: the bird caught where its day had it */
    if (!s.X46) slotArrays(s);
    var egW = evGlide(F, m, tau); s.egW = egW;
    var swing = smoothK(HOLD_POSE[0], HOLD_POSE[1], s.spanPx || 20) * (s.gW > 0 ? 1 - s.gW : 1) * (1 - egW), w0 = m.w, WS0 = null;
    WO.rough = WIND_ON && !FORCED && !F.place ? clamp(Math.sqrt(WINDV[0] * WINDV[0] + WINDV[2] * WINDV[2]) / 6.5, 0, 1) : 0;   // (round 3, step 2: gusts where the world's wind blows: the dunes)
    if (w0 && w0.wing) { WS0 = BW.state(w0.wing, tau, s.LS); WO.swing = swing; WO.shut = w0.bound ? shut22(kind) : null; BW.poseS(w0.wing, WS0, tau, s.P22, s.B3, WO); }
    else { glide22(kind, s.P22); s.B3[0] = s.B3[1] = s.B3[2] = 0; }
    var flapW = WS0 ? WS0.e * swing : 0, ph = WS0 && WS0.flap ? WS0.ph : (w0 && w0.bound ? -2 : -1);
    s.ph = ph; s.mode = WS0 && WS0.e > 0.5 ? 1 : (w0 && w0.bound && WS0 && !WS0.flap ? 2 : 0); s.flapW = flapW; s.swing = swing;
    /* the held bank (LEAN_TRIM, the B film): away from the camera (its far wing lower), while gliding, seen from below and behind */
    var lsx = px - C.pos[0], lsy = py - C.pos[1], lsz = pz - C.pos[2], lsl = Math.sqrt(lsx * lsx + lsy * lsy + lsz * lsz) || 1;
    lsx /= lsl; lsy /= lsl; lsz /= lsl;
    var az = Math.acos(clamp(fx * lsx + fy * lsy + fz * lsz, -1, 1)) / DEG, elv = Math.asin(clamp(lsy, -1, 1)) / DEG;   // (off its tail; seen from below +)
    var trim = 0;
    if (LEAN_TRIM && !FORCED) {
      var far = (lx * lsx + lz * lsz) > 0 ? -1 : 1;   // (its left wing away from the camera: lower it, a roll to the left)
      s.glideW = s.glideW === undefined ? 1 : s.glideW + ((ph >= 0 ? 0.3 : 1) - s.glideW) * (rest ? 1 : 1 - Math.exp(-dt / 0.3));
      trim = LEAN_TRIM * far * s.glideW * smoothK(70, 50, az) * smoothK(-5, 5, elv);
    }
    var target = clamp(coord + trim, -BANK_MAX, BANK_MAX);
    if (rest || !(s.rollOk)) { s.roll = target; s.rollOk = true; }
    else s.roll = rollStep(s.roll, target, dt);
    s.rollT = target; s.coord = coord; s.trim = trim; s.az = az; s.el = elv;
    /* pitch: the climb and the angle of attack (the body's x rotated up about its left) */
    var aoa = (AOA[0] + (AOA[1] - AOA[0]) * flapW) * DEG, ca = Math.cos(aoa), sa = Math.sin(aoa);
    var bxx = fx * ca + ux * sa, bxy = fy * ca + uy * sa, bxz = fz * ca + uz * sa;
    var bzx = ux * ca - fx * sa, bzy = uy * ca - fy * sa, bzz = uz * ca - fz * sa;
    var rr = s.roll * DEG, cr = Math.cos(rr), sr = Math.sin(rr);
    var byx = lx * cr + bzx * sr, byy = ly * cr + bzy * sr, byz = lz * cr + bzz * sr;   // (+ roll: the left wing up, the right down)
    var bzx2 = bzx * cr - lx * sr, bzy2 = bzy * cr - ly * sr, bzz2 = bzz * cr - lz * sr;
    s.pitch = Math.asin(clamp(bxy, -1, 1)) / DEG; s.climb = Math.asin(clamp(fy, -1, 1)) / DEG;
    s.slip = Math.asin(clamp(fx * byx + fy * byy + fz * byz, -1, 1)) / DEG;
    s.va = [VV[0], VV[1], VV[2]]; s.wind = [WINDV[0], WINDV[2]];
    s.vw[0] = VG[0]; s.vw[1] = VG[1]; s.vw[2] = VG[2]; s.aw[0] = AA[0]; s.aw[1] = AA[1]; s.aw[2] = AA[2];
    var sp = d.model * MPU;
    /* (fix round) the separation: a bird its flight's neighbour would touch on the window is eased aside, square to the
       line of sight (separate(): the window px, at its distance) */
    if (s.nudX || s.nudY) { var nk = (s.depth > 1 ? s.depth : lsl) * VW.tanX / (W / 2); px += (s.nudX * C.r[0] + s.nudY * C.u[0]) * nk; py += (s.nudX * C.r[1] + s.nudY * C.u[1]) * nk; pz += (s.nudX * C.r[2] + s.nudY * C.u[2]) * nk; }
    /* (fix round) THE TATTOO'S SET: the arms' dihedral held a little apart, the wing on the side the bird faces on the
       window raised and the other lowered by the same angle (the body level: no roll, no sideslip), so its M stands on
       the tattoo's diagonal as today's marks do. The angle is solved for the view (the tips' line on the window at the
       kind's own mark's lean, today's mean mark), eased (SET_TAU, at most SET_RATE a second), held through the beat,
       let go in a bound (the wings shut) and under forced colours not changed. SET_ON false: the physics alone */
    var setW = ph === -2 ? 0 : 1, setV = 0;
    if (SET_ON && !FORCED && !F.place && !F.soar && F.stage !== 'S2') {   // (circling birds, a thermal's or a wheel's, bank by physics: their lean comes on the near quarter-lap, and a set would rock with every half-lap)
      var fr0 = fx * C.r[0] + fy * C.r[1] + fz * C.r[2];
      if (!s.setFace) s.setFace = fr0 < 0 ? -1 : 1; else if (s.setFace > 0 && fr0 < -SET_HYST) s.setFace = -1; else if (s.setFace < 0 && fr0 > SET_HYST) s.setFace = 1;
      /* which wing leads on the window (+1 its left: the left wing's tip lies on the side it faces), with the facing's
         hysteresis: the set is solved as the leading wing's rise (its sign by this), never clamped one way only */
      var lr0 = (byx * C.r[0] + byy * C.r[1] + byz * C.r[2]) * s.setFace;
      if (!s.setSide) s.setSide = lr0 < 0 ? -1 : 1; else if (s.setSide > 0 && lr0 < -SET_HYST) s.setSide = -1; else if (s.setSide < 0 && lr0 > SET_HYST) s.setSide = 1;
      var setK = Math.floor((tau + ((s.key || 0) % 97) * SET_DT / 97) / SET_DT);   // (each bird on its own tenth of a second: the solves spread over the frames, never all in one)
      if (rest || !(s.setOk) || setK !== s.setK) {
        s.setK = setK;
        /* the set whose glide, seen from here, is nearest the mark: the grid's best, refined by a parabola through it
           and its neighbours (round 1 of this fix solved for the tips' line alone, and a goose's steps then missed) */
        var gi = -1, gbest = 1e9, want;
        for (var g = 0; g < SET_GRID.length; g++) {
          SG_E[g] = setRms(kind, glide22(kind, PGL22), s.setSide * SET_GRID[g], sp, px - C.pos[0], py - C.pos[1], pz - C.pos[2], bxx, bxy, bxz, byx, byy, byz, bzx2, bzy2, bzz2, C, s.setFace);
          if (SG_E[g] < gbest) { gbest = SG_E[g]; gi = g; }
        }
        if (gi < 0) want = s.setWant || 0;
        else {
          want = SET_GRID[gi];
          if (gi > 0 && gi < SET_GRID.length - 1) { var ea = SG_E[gi - 1], ec = SG_E[gi + 1], den = ea - 2 * gbest + ec; if (den > 1e-12) want += 0.5 * (ea - ec) / den * (SET_GRID[gi + 1] - SET_GRID[gi]); }
          want = s.setSide * clamp(want, SET_MIN, SET_MAX);
        }
        s.setWant = want; s.setAt = tau;
      }
      if (rest || !(s.setOk)) { s.set = s.setWant; s.setOk = true; }
      else { var dS = (s.setWant - s.set) * (1 - Math.exp(-dt / SET_TAU)), lim = SET_RATE * dt; s.set += dS < -lim ? -lim : dS > lim ? lim : dS; }
      setV = s.set * setW;
    }
    s.setNow = setV;
    if (setV) { s.P22[0] += setV; s.P22[NP] -= setV; }   // (+: the left arm up, the right down)
    if (egW > 0 && F.egSet) { s.P22[0] += F.egSet * egW; s.P22[NP] += F.egSet * egW; }   // (life: a goose's set-wing descent, the arms a little raised, the same for the whole flight)
    /* (physics) the 46 vertices: the flexing form posed (LB.geom: the feathers bent, the fingers parted, the body's heave,
       surge and trim bank; spans), scaled, turned by the attitude, from the camera; the 16 points kept beside them (the
       hold, the separation, the dumps read them) */
    LB.geom(kind, s.P22, s.B3, s.V46, 'this');
    var ox = px - C.pos[0], oy = py - C.pos[1], oz = pz - C.pos[2], V = s.V46, X = s.X46;
    for (i = 0; i < NV; i++) {
      var x = V[3 * i] * sp, y = V[3 * i + 1] * sp, z = V[3 * i + 2] * sp;
      X[3 * i] = ox + x * bxx + y * byx + z * bzx2;
      X[3 * i + 1] = oy + x * bxy + y * byy + z * bzy2;
      X[3 * i + 2] = oz + x * bxz + y * byz + z * bzz2;
    }
    for (i = 0; i < 16; i++) { var vi = P16MAP[i]; if (vi < 0) { s.X16[3 * i] = ox; s.X16[3 * i + 1] = oy; s.X16[3 * i + 2] = oz; } else { s.X16[3 * i] = X[3 * vi]; s.X16[3 * i + 1] = X[3 * vi + 1]; s.X16[3 * i + 2] = X[3 * vi + 2]; } }
    s.body[0] = ox; s.body[1] = oy; s.body[2] = oz;
    s.nb[0] = bzx2; s.nb[1] = bzy2; s.nb[2] = bzz2;
    s.fw[0] = bxx; s.fw[1] = bxy; s.fw[2] = bxz; s.lw3[0] = byx; s.lw3[1] = byy; s.lw3[2] = byz;
    return true;
  }
  /* the 16 points on the window (device px, y up) through the frame's camera, the exact box (CSS px, y down), the span
     on the window (device px: the bird's ink span, today's, by its nearness); false behind the near plane */
  function projectBird(s, C) {
    var i, xc, yc, zc, X = s.X46, k = VW.outW / Math.max(1, W), fx = (VW.outW / 2) / VW.tanX, fy = (VW.outH / 2) / VW.tanY, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (i = 0; i < NV; i++) {   // (physics: every vertex of the flexing form; its 1/depth for the pass's nearest facet)
      var ax = X[3 * i], ay = X[3 * i + 1], az = X[3 * i + 2];
      zc = ax * C.f[0] + ay * C.f[1] + az * C.f[2];
      if (!(zc > 0.5)) return false;
      xc = ax * C.r[0] + ay * C.r[1] + az * C.r[2]; yc = ax * C.u[0] + ay * C.u[1] + az * C.u[2];
      var dx = VW.outW / 2 + fx * xc / zc, dy = VW.outH / 2 + fy * yc / zc;
      s.D46[2 * i] = dx; s.D46[2 * i + 1] = dy; s.IZ[i] = 1 / zc;
      if (dx < x0) x0 = dx; if (dx > x1) x1 = dx; if (dy < y0) y0 = dy; if (dy > y1) y1 = dy;
    }
    var bz = s.body[0] * C.f[0] + s.body[1] * C.f[1] + s.body[2] * C.f[2];
    var bpx = bz > 0.5 ? VW.outW / 2 + fx * (s.body[0] * C.r[0] + s.body[1] * C.r[1] + s.body[2] * C.r[2]) / bz : 0, bpy = bz > 0.5 ? VW.outH / 2 + fy * (s.body[0] * C.u[0] + s.body[1] * C.u[1] + s.body[2] * C.u[2]) / bz : 0;
    for (i = 0; i < 16; i++) { var vi = P16MAP[i]; if (vi < 0) { s.D[2 * i] = bpx; s.D[2 * i + 1] = bpy; } else { s.D[2 * i] = s.D46[2 * vi]; s.D[2 * i + 1] = s.D46[2 * vi + 1]; } }
    s.depth = bz; s.n = bz > 0.5 ? (W / 2) / VW.tanX * MPU / bz : 0;
    s.spanPx = s.d.span * s.n * k;                       // (today's ink span on the window, device px: the LOD, the pen floor, the filter)
    s.floorPx = clamp(Math.round(4 * clamp(1.3 + 0.035 * s.spanPx / k, LINE[0], LINE[1])) / 4 * k, 1, 2.5 * k);   // (way-form) today's pen: the wing's leading edge stroked as the tattoo's line, at its width for this size
    s.bodyPx = BODY_R * s.d.model * s.n * k;             // (fix round) the body's radius at the chest (device px): a body seen from any side ...
    /* (physics) no body: BODY_R 0 */
    s.filt = FILTER[0] + (FILTER[1] - FILTER[0]) * clamp((24 - s.spanPx) / 20, 0, 1);
    s.lod = FP.lodK(s.spanPx / k);                       // (physics: the facets' share by its ink span, CSS px: the one tone under 20, the facets in full from 64)
    var pad = 0.5 * s.floorPx + s.filt + 1;
    s.halo = HOST.night ? HOST.night() : 0;
    var he = (W < 600 ? HALO_E[1] : HALO_E[0]) * k;
    s.haloE = he;
    var hp = s.halo > 0 && HALO_IN_BOX && !FORCED ? 4 * he : 0;
    /* the exact box, CSS px (y down), the halo's reach counted at night */
    s.bx0 = (x0 - pad - hp) / k; s.bx1 = (x1 + pad + hp) / k; s.by0 = H - (y1 + pad + hp) / k; s.by1 = H - (y0 - pad - hp) / k;
    s.px = (x0 + x1) / 2 / k; s.py = H - (y0 + y1) / 2 / k;
    /* the M's legibility (render 3.3): the leading edge's height across its tips' line, over that line's length */
    var tx = s.D[12] - s.D[0], ty = s.D[13] - s.D[1], tl = Math.sqrt(tx * tx + ty * ty) || 1, hmax = 0;
    for (var q = 1; q < 3; q++) { var j = [1, 7][q - 1]; var hh = Math.abs(((s.D[2 * j] - s.D[0]) * ty - (s.D[2 * j + 1] - s.D[1]) * tx) / tl); if (hh > hmax) hmax = hh; }
    s.legib = hmax / tl; s.tipsPx = tl;
    return true;
  }
  /* (physics) the world's light on the paper: facetpose's own (the form designer's option 5, "white paper lit like
     cloud"), facet by facet: each facet's normal (area-weighted over its triangles, on the posed flexing form) turned
     toward the eye; its light (FE) for the near bird's planes and the bird's ONE TONE (the last round's constants over
     the same facets, area-weighted on the window: the bright white the hold and the true-size outline are tuned on),
     eased (TONE_T). The world is y up, facetpose z up: every vector handed to it has y and z swapped (a reflection:
     dot products kept; the normals' sign it turns toward the eye itself) */
  var LZ = { sunDir: [0, 0, 1], sunVis: 0, sunC: [1, 1, 1], ambU: [0.3, 0.35, 0.45], ambD: [0.25, 0.25, 0.3], clLit: [0.7, 0.65, 0.7] }, EYEZ = [0, 0, 1];
  /* the bird's one tone alone (facetpose.light's ONE: its lit1 with LT.ONE, area-weighted), for a bird whose planes do
     not show: the same sums, half the work */
  var ONE3 = new Float64Array(3);
  function oneTone(N, eye, L, area) {
    var LT = FP2.LT, C = LT.ONE, sd = L.sunDir, sv = L.sunVis === undefined ? 1 : L.sunVis, sc = L.sunC, au = L.ambU, ad = L.ambD, cl = L.clLit, f, k, ma = 0;
    var seaLit = Math.min(1, Math.max(0, (0.2126 * ad[0] + 0.7152 * ad[1] + 0.0722 * ad[2]) / Math.max(1e-4, 0.2126 * cl[0] + 0.7152 * cl[1] + 0.0722 * cl[2])));
    var back = Math.max(0, -(eye[0] * sd[0] + eye[1] * sd[1] + eye[2] * sd[2]));
    ONE3[0] = ONE3[1] = ONE3[2] = 0;
    for (f = 0; f < NFAC; f++) {
      var nx = N[3 * f], ny = N[3 * f + 1], nz = N[3 * f + 2], ne = nx * eye[0] + ny * eye[1] + nz * eye[2];
      if (ne < 0) { nx = -nx; ny = -ny; nz = -nz; ne = -ne; }
      var dS = nx * sd[0] + ny * sd[1] + nz * sd[2];
      var direct = sv * Math.min(1, Math.max(0, (dS + C.WRAP) / (1 + C.WRAP))), through = sv * C.TRANS * Math.max(-dS, 0);
      var wsky = C.SKYT + (1 - C.SKYT) * (0.5 + 0.5 * nz), bnc = C.BOUNCE * Math.max(-nz, 0) * seaLit;
      var rim = sv * C.RIM * Math.pow(1 - ne, LT.RIM_P) * (0.4 + 0.6 * back), a = area ? area[f] : 1;
      for (k = 0; k < 3; k++) ONE3[k] += a * LT.GAIN * LT.PAPER[k] * (C.SUN_K * sc[k] * (direct + through + rim) + ad[k] + (au[k] - ad[k]) * wsky + bnc * cl[k]);
      ma += a;
    }
    if (ma > 0) { ONE3[0] /= ma; ONE3[1] /= ma; ONE3[2] /= ma; }
    return ONE3;
  }
  var TRIS = {};
  function lum3(r, g, b) { return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
  function lightBird(s, L, rest, dt) {
    var kind = s.kind, FK = LB.flexKind(kind), T = FK.tri, tf = FK.tf, X = s.X46, VZ = s.VZ, i, f;
    for (i = 0; i < NV; i++) { VZ[3 * i] = X[3 * i]; VZ[3 * i + 1] = X[3 * i + 2]; VZ[3 * i + 2] = X[3 * i + 1]; }
    FP2.facetNormals(kind, VZ, s.NZ);
    var ex = -s.body[0], ey = -s.body[1], ez = -s.body[2], el = Math.sqrt(ex * ex + ey * ey + ez * ez) || 1;
    EYEZ[0] = ex / el; EYEZ[1] = ez / el; EYEZ[2] = ey / el;
    var sd = L && L.sunDir;
    if (sd) { LZ.sunDir[0] = sd[0]; LZ.sunDir[1] = sd[2]; LZ.sunDir[2] = sd[1]; } else { LZ.sunDir[0] = 0; LZ.sunDir[1] = 0; LZ.sunDir[2] = 1; }
    LZ.sunVis = L ? (L.sunVis === undefined ? 1 : L.sunVis) : 0;
    LZ.sunC = L && L.sunC ? L.sunC : [1, 1, 1]; LZ.ambU = L && L.ambU ? L.ambU : [0.3, 0.35, 0.45]; LZ.ambD = L && L.ambD ? L.ambD : [0.25, 0.25, 0.3]; LZ.clLit = L && L.clLit ? L.clLit : [0.7, 0.65, 0.7];
    for (f = 0; f < NFAC; f++) s.FA[f] = 1e-3;
    for (i = 0; i < tf.length; i++) s.FA[tf[i]] += Math.abs(triA(s.D46, T[3 * i], T[3 * i + 1], T[3 * i + 2]));   // (each facet's area on the window, device px)
    var one = s.lod > 0 && !FORCED && !(s.halo > 0) ? FP2.light(kind, s.NZ, EYEZ, LZ, s.FE, s.FA) : oneTone(s.NZ, EYEZ, LZ, s.FA);
    var e = rest || !s.eOk ? 1 : 1 - Math.exp(-dt / TONE_T);
    for (var k2 = 0; k2 < 3; k2++) s.E[k2] += (one[k2] - s.E[k2]) * e;
    s.eOk = true;
    s.fold[0] = s.fold[1] = s.fold[2] = s.fold[3] = s.fold[4] = s.fold[5] = 1;
    /* (dev) each wing's own light, area-weighted (its facets' ONE light): the left wing's facets 0-14, the right's 15-29 */
    if (!(s.lod > 0) || FORCED || s.halo > 0) { s.wingL = null; return; }   // (the facets' light only where the planes show)
    var wl = 0, wa = 0, wr = 0, wb = 0, ym = lum3(one[0], one[1], one[2]);
    for (f = 0; f < NFAC; f++) { var yl = lum3(s.FE[3 * f], s.FE[3 * f + 1], s.FE[3 * f + 2]); if (f < 15) { wl += yl * s.FA[f]; wa += s.FA[f]; } else { wr += yl * s.FA[f]; wb += s.FA[f]; } }
    s.wingL = [wl, wa, wr, wb, ym];
  }
  function triA(D, a, b, c) { return 0.5 * ((D[2 * b] - D[2 * a]) * (D[2 * c + 1] - D[2 * a + 1]) - (D[2 * c] - D[2 * a]) * (D[2 * b + 1] - D[2 * a + 1])); }
  /* the bird's lightness as the composite would show it (OKLab L of its light graded: exposure, lift and gain,
     saturation, the shoulder, without the air): for the hold */
  function encL(c) { return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; }
  function decL(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  var GCOL = [0, 0, 0];
  function gradedL(E, Gd, scale) {
    var x = Gd ? Gd.exposure : 1, i, c = GCOL;
    for (i = 0; i < 3; i++) c[i] = (Gd ? Gd.lift[i] : 0) + E[i] * scale * x * (Gd ? Gd.gain[i] : 1);
    var y = lum3(c[0], c[1], c[2]), st = Gd ? Gd.sat : 1;
    for (i = 0; i < 3; i++) c[i] = Math.max(y + (c[i] - y) * st, 0);
    var mx = Math.max(c[0], c[1], c[2]), K = 0.78;
    if (mx > K) { var mm = K + (1 - K) * (1 - Math.exp(-(mx - K) / (1 - K))); for (i = 0; i < 3; i++) c[i] *= mm / mx; }
    for (i = 0; i < 3; i++) c[i] = decL(encL(Math.min(1, c[i])));   // (8-bit as shown)
    return okL(c[0], c[1], c[2]);
  }
  function okL(r, g, b) {
    return 0.2104542553 * Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b) + 0.7936177850 * Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b) - 0.0040720468 * Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  }
  /* the hold: never melting into its ground. The ground under its body and wrists (the world without the birds, a read
     or a few late); a bird within HOLD_DL of it is darkened to HOLD_DL under it, eased over HOLD_TT s, and let go only
     past HOLD_OUT: one bird at a time (never two-toned), slow, hysteretic; only ever darker (lit paper is never made
     lighter than itself); off at night, inside the distance fade */
  function holdTone(s, F, rest, dt) {
    var Gd = HOST.grade(), g = -1, gn = 0, gs = 0, q, i;
    if (HOST.groundAt) for (q = 0; q < 3; q++) {
      i = [2, 1, 7][q];   // (the body (shoulder), the wrists)
      var cx = s.D[2 * i] / (VW.outW / W), cy = H - s.D[2 * i + 1] / (VW.outW / W);
      if (q === 0) { cx = (s.D[4] + s.D[16]) / 2 / (VW.outW / W); cy = H - (s.D[5] + s.D[17]) / 2 / (VW.outW / W); }
      var gq = HOST.groundAt(cx, cy); if (gq >= 0) { gs += gq; gn++; g = Math.max(g, gq); }
    }
    s.groundL = gn ? gs / gn : -1;
    s.birdL = gradedL(s.E, Gd, 1);
    var off = FORCED || s.halo > 0.5 || !(s.groundL >= 0);   // (fix round: held inside the distance fade too: a far bird against the sun was left lighter than its ground)
    var want = 1;
    /* (fix round) a decisive tone, never near its ground: white paper where its light clears the ground by LIGHT_IN, else
       grey, HOLD_DL under it (round 2 held a bird only within +-0.08: on a pale sky a white bird sat 0.06-0.10 over its
       ground, half held and half not; the judge found 31 % of the phone's birds within 0.08 of the sky); and backlit
       (the line of sight within BACK_IN deg of the sun, the sun out) always grey, as paper against the light is. Let go
       past LIGHT_OUT and BACK_OUT: hysteretic, eased over HOLD_TT */
    var sa = sunAng(s), Lt = HOST.light(), sv = Lt ? (Lt.sunVis === undefined ? 1 : Lt.sunVis) : 0;
    s.backlit = sa !== null && sv > 0.3 && sa < (s.backlit ? BACK_OUT : BACK_IN);
    if (!off) {
      var dl = s.birdL - s.groundL;
      if (!s.holding && (dl < LIGHT_IN || s.backlit)) s.holding = true;
      else if (s.holding && dl > LIGHT_OUT && !s.backlit) s.holding = false;
      if (s.holding) {
        var tL = Math.min(s.birdL, s.groundL - HOLD_DL);
        /* (fix round) the light's scale that shows it at tL, by bisection on the composite's own grade (round 2's two cube
           steps landed about 0.01 short in the shoulder: a held bird sat at -0.07 to -0.08, not under HOLD_DL) */
        var lo = 0.02, hi = 1;
        if (gradedL(s.E, Gd, lo) >= tL) want = lo;
        else { for (var it = 0; it < 14; it++) { var mid = 0.5 * (lo + hi); if (gradedL(s.E, Gd, mid) > tL) hi = mid; else lo = mid; } want = lo; }
      }
    } else s.holding = false;
    var e = rest || s.holdOk !== true ? 1 : 1 - Math.exp(-dt / HOLD_TT);
    s.hold += (want - s.hold) * e; s.holdOk = true;
    s.hold = clamp(s.hold, 0.02, 1);
  }
  /* how much of the cloud before it stands in front of it: at its left tip, its body and its right tip, the clouds'
     lobes between the camera and each (eased by CLOUD_IN m), at least the cover over the view; worked out every CW_DT
     s on a share of the birds each frame, each held at its most CW_HOLD s */
  function cloudWeights(s, C, tr, force) {
    if (FORCED) { s.cw[0] = s.cw[1] = s.cw[2] = 0; return; }
    var cov = HOST.cover();
    if (force || !(tr < s.cwNext) || !(tr >= s.cwAt)) {
      var pts = [0, -1, 6];
      for (var q = 0; q < 3; q++) {
        var x, y, z;
        if (pts[q] < 0) { x = s.body[0]; y = s.body[1]; z = s.body[2]; } else { x = s.X16[3 * pts[q]]; y = s.X16[3 * pts[q] + 1]; z = s.X16[3 * pts[q] + 2]; }
        var len = FX.cloud ? HOST.cloudBetween(C.pos[0], C.pos[1], C.pos[2], C.pos[0] + x, C.pos[1] + y, C.pos[2] + z) : 0, v = ease(len / CLOUD_IN);
        if (v >= s.cwH[q] || tr - s.cwHt[q] > CW_HOLD || !(tr >= s.cwHt[q])) { s.cwH[q] = v; s.cwHt[q] = tr; }
        s.cwNow[q] = v;
      }
      s.cwAt = tr; s.cwNext = tr + CW_DT;
    }
    for (var k = 0; k < 3; k++) s.cw[k] = Math.max(tr - s.cwHt[k] <= CW_HOLD ? s.cwH[k] : s.cwNow[k], cov);
    s.wf = s.cw[1];
  }

  /* ---------------- the pass: one instanced draw, every bird a quad about its paper ---------------- */

  /* (physics) drawn after the composite, at the canvas's own resolution (the ink's slot; RENDER.md 2): 7 instance
     attributes (28 floats) a bird, and its row of the points' texture (its 46 points on the window, device px, with their
     1/depth; its 30 facets' light). The coverage is worked out per fragment, exactly, over the flexing form's 58
     triangles (the outline antialiased by a box filter, the edges the mesh shares inside the bird hard), the nearest
     facet by its depth (1/depth is affine on the window for a plane) taking the colour: the one tone mixed with the
     facet's own light by lodK (0 at true size: the one tone, as before); the pen floor along the leading edge's M (the
     form's chain); at night the halo about the outline's own edges. The two topologies (one surface: gull, swallow,
     finch; slotted fingers: goose, heron, ibis, crow, stork) are written into the shader from labbird's flexKind */
  var PASS_TOPO = (function () {
    function topo(kind) {
      var F = LB.flexKind(kind), T = F.tri, nT = T.length / 3, E = {}, i, j, out = [], bnd = [];
      function key(a, b) { return a < b ? a + '_' + b : b + '_' + a; }
      for (i = 0; i < nT; i++) for (j = 0; j < 3; j++) { var k = key(T[3 * i + j], T[3 * i + (j + 1) % 3]); E[k] = (E[k] || 0) + 1; }
      for (i = 0; i < nT; i++) {
        var inn = 0;
        for (j = 0; j < 3; j++) if (E[key(T[3 * i + j], T[3 * i + (j + 1) % 3])] > 1) inn |= 1 << j;
        out.push('ivec4(' + T[3 * i] + ', ' + T[3 * i + 1] + ', ' + T[3 * i + 2] + ', ' + (F.tf[i] + 256 * inn) + ')');
      }
      for (var k2 in E) if (E[k2] === 1) { var ab = k2.split('_'); bnd.push('ivec2(' + ab[0] + ', ' + ab[1] + ')'); }
      return { n: nT, tri: out.join(', '), nb: bnd.length, bnd: bnd.join(', ') };
    }
    var a = topo('gull'), b = topo('goose');
    return { n: a.n, src: 'const ivec4 TRI0[' + a.n + '] = ivec4[' + a.n + '](' + a.tri + ');\nconst ivec4 TRI1[' + b.n + '] = ivec4[' + b.n + '](' + b.tri + ');\n' +
      'const ivec2 BE0[' + a.nb + '] = ivec2[' + a.nb + '](' + a.bnd + ');\nconst ivec2 BE1[' + b.nb + '] = ivec2[' + b.nb + '](' + b.bnd + ');\n' +
      'const int NBE0 = ' + a.nb + ', NBE1 = ' + b.nb + ', NTRI = ' + a.n + ';\nconst int CH[7] = int[7](' + CHAIN.join(', ') + ');\n' };
  })();
  var GRADE_GLSL = `
vec3 shoulder(vec3 c) { float m = max(c.r, max(c.g, c.b)); const float K = 0.78; if (m <= K) return c;
  float mm = K + (1.0 - K) * (1.0 - exp(-(m - K) / (1.0 - K))); vec3 h = c * (mm / m); float over = clamp((m - 1.0) / 3.0, 0.0, 1.0); return mix(h, vec3(mm), over * 0.75); }
vec3 enc(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
vec3 gradeOut(vec3 c) { c *= uGr.x; c = uLift + c * uGain; float y = dot(c, LUM); c = max(mix(vec3(y), c, uGr.y), 0.0); return enc(clamp(shoulder(c), 0.0, 1.0)); }
`;
  var VS_PAPER = HOST.glsl.HEAD + HOST.glsl.FRAME_U + (HOST.glsl.AIR || HOST.glsl.LIB) + `
const vec3 LUM = vec3(0.2126, 0.7152, 0.0722);
layout(location = 0) in vec4 aBox;  // the 46 points' box (device px, y up): lo, hi
layout(location = 1) in vec4 aK1;   // its row of the points' texture; its topology (1: slotted); the pen floor (device px); the filter (device px)
layout(location = 2) in vec4 aE;    // the bird's one tone (linear, before the air and the grade: the paper lit), its opacity
layout(location = 3) in vec4 aB;    // its body from the camera (m), the land's slack (m)
layout(location = 4) in vec4 aC;    // how much of the cloud before it stands in front of it: at the left tip, the body, the right tip; the night (0 .. 1)
layout(location = 5) in vec4 aM;    // the halo's e-folding (device px); the hold (the light's scale, 1 none); the gift's write-on (s, -1 none); its way along the M
layout(location = 6) in vec4 aL;    // the facets' share (lodK), a guest (1: the words' keep-off and the land's depth not applied), -, -
uniform vec2 uOut;                  // the canvas (device px)
uniform vec4 uGr;                   // the composite's exposure, saturation; -; the air (1 on)
uniform vec3 uLift, uGain;
uniform vec4 uMode;                 // forced colours (1); the glow's grey as encoded at night; the halo's strength; -
uniform vec3 uInkF;                 // forced colours: CanvasText (sRGB)
flat out vec4 vK1, vCol, vZ, vC, vW, vAir, vL;
` + GRADE_GLSL + `
void main() {
  float halo = uMode.x > 0.5 ? 0.0 : aC.w * uMode.z;
  float pad = aK1.z + 2.0 * aK1.w + 1.0 + (halo > 0.0 ? 4.0 * aM.x : 0.0) + (aM.z >= 0.0 ? 6.0 : 0.0);
  vec2 lo = aBox.xy - pad, hi = aBox.zw + pad;
  int c = gl_VertexID;
  vec2 q = vec2((c & 1) == 1 ? hi.x : lo.x, (c & 2) == 2 ? hi.y : lo.y);
  gl_Position = aE.w <= 0.0 ? vec4(2.0, 2.0, 2.0, 1.0) : vec4(q / uOut * 2.0 - 1.0, 0.0, 1.0);
  vK1 = aK1;
  vec3 P = aB.xyz; float t = length(P); vec3 rd = P / max(t, 1e-3);
  vec3 o, B0 = vec3(0.0); float A0 = 1.0;
  if (uMode.x > 0.5) o = uInkF;   // forced colours: CanvasText, flat, at full strength
  else {
    /* the air between, as the land's (far birds go into the haze): affine in the light, A0 c + B0, so a facet's own
       light takes the same air in the fragment */
    if (uGr.w > 0.0) { B0 = atmos(vec3(0.0), rd, t); A0 = atmos(vec3(1.0), rd, t).g - B0.g; }
    o = gradeOut(A0 * aE.rgb * aM.y + B0);   // (the hold: the paper's light scaled down where it would melt into its ground)
  }
  vCol = vec4(o, aE.w); vAir = vec4(B0, A0); vL = aL;
  vZ = vec4(dot(P, uCamF), aB.w, aM.x, halo);
  vC = aC; vW = aM;
}`;
  var FS_PAPER = HOST.glsl.HEAD + HOST.glsl.FRAME_U + `
const vec3 LUM = vec3(0.2126, 0.7152, 0.0722);
uniform sampler2D uDepth, uCloud, uHz, uInkKeep, uBloom;
uniform highp sampler2D uPts; // the birds' rows: 46 points (device px, y up; 1/depth), then 30 facets' light (linear)
uniform vec2 uOut;
uniform vec4 uSc;     // the scene's uv scale (x, y), the clouds' (x, y)
uniform vec4 uMk;     // the keep-off mask's uv scale (x, y), the clouds' last texel (x, y)
uniform vec4 uLand;   // the land hides (1 on), the clouds hide (1 on), the canvas's px over the device's (the edge), the words' mask (1 on)
uniform vec4 uBl;     // the bloom's uv scale (x, y), its gain, the light wrap (1 on)
uniform vec4 uGl;     // the light wrap: the bloom's light from, to; the paper thinned by, lifted by
uniform vec4 uMode;   // forced colours (1); the glow's grey as encoded at night; the halo's strength; -
uniform vec4 uGr; uniform vec3 uLift, uGain;
flat in vec4 vK1, vCol, vZ, vC, vW, vAir, vL;
out vec4 oC;
` + PASS_TOPO.src + GRADE_GLSL + `
float ed(vec2 q, vec2 a, vec2 b) { vec2 e = b - a; float l = length(e); return l < 1e-5 ? -1e4 : dot(q - a, vec2(e.y, -e.x)) / l; }
float sdSeg(vec2 q, vec2 a, vec2 b) { vec2 pa = q - a, ba = b - a; float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-9), 0.0, 1.0); return length(pa - ba * h); }
float linZ(float d) { return d >= 1.0 ? 6.0e4 : 2.0 * uProj.z * uProj.w / (uProj.w + uProj.z - (d * 2.0 - 1.0) * (uProj.w - uProj.z)); }
void main() {
  vec2 q = gl_FragCoord.xy, uv = q / uOut;
  int row = int(vK1.x + 0.5); bool sl = vK1.y > 0.5;
  vec3 p[46];
  for (int i = 0; i < 46; i++) p[i] = texelFetch(uPts, ivec2(i, row), 0).xyz;
  /* the light wrap: in the sun's own glare (its bloom strong under the bird) the light eats into the paper (thinner,
     lifted toward the light), as into every silhouette the bloom touches; added light only */
  float g = 0.0;
  if (uBl.w > 0.5) g = smoothstep(uGl.x, uGl.y, dot(texture(uBloom, uv * uBl.xy).rgb, LUM) * uBl.z);
  float w = max(vK1.w * uLand.z, 0.5), cov = 0.0, fz = -1.0;
  int ff = -1, fc = -1;
  for (int i = 0; i < NTRI; i++) {
    ivec4 T = sl ? TRI1[i] : TRI0[i];
    vec2 a = p[T.x].xy, b = p[T.y].xy, c = p[T.z].xy;
    float ar = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    if (abs(ar) < 1e-4) continue;
    vec2 lo3 = min(a, min(b, c)) - w, hi3 = max(a, max(b, c)) + w;
    if (q.x < lo3.x || q.y < lo3.y || q.x > hi3.x || q.y > hi3.y) continue;
    float sg = ar > 0.0 ? 1.0 : -1.0, d[3];
    d[0] = sg * ed(q, a, b); d[1] = sg * ed(q, b, c); d[2] = sg * ed(q, c, a);
    float s = 0.0, n = 0.0, hard = 1.0; int inn = T.w >> 8;
    for (int k = 0; k < 3; k++) {
      if (((inn >> k) & 1) == 1) hard *= d[k] <= 1e-3 ? 1.0 : 0.0;
      else { s += clamp(0.5 - (d[k] + uGl.z * g) / w, 0.0, 1.0); n += 1.0; }
    }
    float ci = (n > 0.0 ? clamp(s - (n - 1.0), 0.0, 1.0) : 1.0) * hard;
    if (ci <= 0.0) continue;
    /* its nearness here: 1/depth, barycentric on the window (exact for a plane seen in perspective) */
    float la = clamp(((b.x - q.x) * (c.y - q.y) - (b.y - q.y) * (c.x - q.x)) / ar, 0.0, 1.0), lb = clamp(((c.x - q.x) * (a.y - q.y) - (c.y - q.y) * (a.x - q.x)) / ar, 0.0, 1.0), lc = max(0.0, 1.0 - la - lb);
    float iz = la * p[T.x].z + lb * p[T.y].z + lc * p[T.z].z;
    if (ci >= 0.5 && iz > fz) { fz = iz; ff = T.w & 255; }
    if (ci > cov) { cov = ci; fc = T.w & 255; }
  }
  int facet = ff >= 0 ? ff : fc;
  /* the pen floor along the leading edge's M: a wing seen edge-on is still the tattoo's line (in the one tone) */
  float hw = 0.5 * vK1.z * (1.0 - uGl.z * g);
  float ds = 1e9;
  for (int i = 0; i < 6; i++) ds = min(ds, sdSeg(q, p[CH[i]].xy, p[CH[i + 1]].xy));
  float gfill = 1.0;
  if (vW.z >= 0.0 && uMode.x < 0.5) {
    /* the gift (S5, SIMULATED): the leading edge's M written from the back tip to the front tip, then the paper filled.
       Added light only. */
    float gE = vW.z, wr = clamp(gE / 0.7, 0.0, 1.0); gfill = clamp((gE - 0.7) / 0.3, 0.0, 1.0);
    float Lt = 0.0; for (int i = 0; i < 6; i++) Lt += length(p[CH[i + 1]].xy - p[CH[i]].xy);
    float acc = 0.0, best = 1e9, tq = 0.0;
    for (int i = 0; i < 6; i++) {
      vec2 a = p[CH[i]].xy, ba = p[CH[i + 1]].xy - a; float sl2 = length(ba), h = clamp(dot(q - a, ba) / max(dot(ba, ba), 1e-9), 0.0, 1.0), dd = length(q - a - ba * h);
      if (dd < best) { best = dd; tq = acc + h * sl2; }
      acc += sl2;
    }
    if (vW.w < 0.0) tq = Lt - tq;
    float head = wr * Lt, written = clamp((head - tq) / w + 0.5, 0.0, 1.0);
    float lh = max(hw, 0.7 * w), cl = (clamp(0.5 + (lh - best) / w, 0.0, 1.0) + clamp(0.5 + (lh + best) / w, 0.0, 1.0) - 1.0) * written;
    float cpaper = cov * gfill;
    cov = max(cpaper, cl); if (cl > cpaper) facet = -1;
  } else if (hw > 0.0) {
    float cs = clamp(0.5 + (hw - ds) / w, 0.0, 1.0) + clamp(0.5 + (hw + ds) / w, 0.0, 1.0) - 1.0;
    if (cs > cov) { cov = cs; facet = -1; }
  }
  /* the night's halo: the distance to the outline (the mesh's own edges: the leading edge's M, the trailing edge, the
     fingers) and to the pen floor */
  float halo = 0.0;
  if (vZ.w > 0.0 && cov < 1.0) {
    float dt = 1e9;
    if (sl) { for (int i = 0; i < NBE1; i++) dt = min(dt, sdSeg(q, p[BE1[i].x].xy, p[BE1[i].y].xy)); }
    else { for (int i = 0; i < NBE0; i++) dt = min(dt, sdSeg(q, p[BE0[i].x].xy, p[BE0[i].y].xy)); }
    float e = max(vZ.z, 0.5), dd = max(min(dt, ds) - hw, 0.0);
    halo = vZ.w * exp(-dd / e) * (1.0 - smoothstep(2.5 * e, 4.0 * e, dd)) * (1.0 - cov);
    if (vW.z >= 0.0) halo *= max(gfill, 0.5 * clamp(vW.z / 0.7, 0.0, 1.0));
  }
  if (cov <= 0.0 && halo < 1.0 / 512.0) discard;
  /* hidden by the land in front (the scene's depth, the four texels about the pixel weighted as the composite's
     bilinear put the land up: the bird's edge against a ridge is the ridge's own) */
  float vis = 1.0;
  if (uLand.x > 0.5) {
    ivec2 dsz = textureSize(uDepth, 0); vec2 dp = uv * uSc.xy * vec2(dsz) - 0.5, f = fract(dp); ivec2 d0 = ivec2(floor(dp));
    float v00 = smoothstep(-vZ.y, 0.0, linZ(texelFetch(uDepth, clamp(d0, ivec2(0), dsz - 1), 0).r) - vZ.x + 0.5 * vZ.y);
    float v10 = smoothstep(-vZ.y, 0.0, linZ(texelFetch(uDepth, clamp(d0 + ivec2(1, 0), ivec2(0), dsz - 1), 0).r) - vZ.x + 0.5 * vZ.y);
    float v01 = smoothstep(-vZ.y, 0.0, linZ(texelFetch(uDepth, clamp(d0 + ivec2(0, 1), ivec2(0), dsz - 1), 0).r) - vZ.x + 0.5 * vZ.y);
    float v11 = smoothstep(-vZ.y, 0.0, linZ(texelFetch(uDepth, clamp(d0 + ivec2(1, 1), ivec2(0), dsz - 1), 0).r) - vZ.x + 0.5 * vZ.y);
    vis = mix(mix(v00, v10, f.x), mix(v01, v11, f.x), f.y);
  }
  /* hidden by the cloud before it: the cloud's cover here, times how much of it stands in front of the bird: an opaque
     core here says so by its depth (the half-resolution depth holds the land's nearest and the cores'); without a core
     (a soft edge, a thin veil) the lobes' weight along the bird's span (from its left tip to its right tip) */
  if (uLand.y > 0.5) {
    float ca = texture(uCloud, min(uv * uSc.zw, uMk.zw)).a;
    if (ca > 0.002) {
      ivec2 hsz = textureSize(uHz, 0), hp = clamp(ivec2(uv * uSc.zw * vec2(hsz)), ivec2(0), hsz - 1);
      float zh = linZ(texelFetch(uHz, hp, 0).r);
      ivec2 dsz2 = textureSize(uDepth, 0);
      float zl = linZ(texelFetch(uDepth, clamp(ivec2(uv * uSc.xy * vec2(dsz2)), ivec2(0), dsz2 - 1), 0).r);
      vec2 t0 = p[CH[0]].xy, ax = p[CH[6]].xy - t0; float sAlong = clamp(dot(q - t0, ax) / max(dot(ax, ax), 1e-6), 0.0, 1.0);
      float wl = sAlong < 0.5 ? mix(vC.x, vC.y, sAlong * 2.0) : mix(vC.y, vC.z, sAlong * 2.0 - 1.0);
      float front = zh < zl - 2.0 ? (zh < vZ.x - 0.5 * vZ.y ? 1.0 : 0.0) : wl;
      vis *= 1.0 - ca * front;
    }
  }
  /* the words' own ground is never touched: the keep-off (their ink boxes grown 2 px), bird and halo alike */
  if (uLand.w > 0.5 && vL.y < 0.5) { vec4 kp = texture(uInkKeep, uv * uMk.xy); vis *= 1.0 - smoothstep(0.55, 0.95, max(kp.r, kp.g)); }   // (life: a guest, vL.y 1, is exempt: its path is planned clear of the line, credit and links)
  vec3 col = vCol.rgb;
  if (uMode.x < 0.5) {
    /* the near bird's planes: its facet's own light, through the same air, hold and grade, mixed in by lodK */
    if (vL.x > 0.0 && facet >= 0) { vec3 fe = texelFetch(uPts, ivec2(46 + facet, row), 0).rgb; col = mix(col, gradeOut(vAir.a * fe * vW.y + vAir.rgb), vL.x); }
    col = max(col, vec3(uMode.y * vC.w));        // at night the paper keeps a light of its own: a floor, the glow's grey as encoded
    col = mix(col, vec3(1.0), uGl.w * g);        // (the light wrap: lifted toward the glare)
  }
  float a = cov * vCol.w * vis;
  vec3 hc = uMode.x > 0.5 ? vec3(0.0) : vec3(0.92, 0.94, 1.0) * halo * vCol.w * vis;
  oC = vec4(col * a + hc, a);
}`;
  var NF = 28, UB = new Float32Array(4 * MAXP), PTW = NV + NFAC + 4, BTX = new Float32Array(MAXP * PTW * 4), BT = null, PTS_UNIT = 6;   // (physics: 7 vec4 a bird; its 46 points and 30 facet lights a row of the points' texture, unit 6)
  var PROG = null, BROKEN = false, VAO = null, VBO = null, RING = null, RI = 0, INST = new Float32Array(MAXP * NF), UGR = new Float32Array(4), USC = new Float32Array(4), UMK = new Float32Array(4), ULAND = new Float32Array(4), UBL = new Float32Array(4), UGL = new Float32Array(4), UMODE = new Float32Array(4), UINKF = new Float32Array(3);
  /* the paper's program: asked for as the module is made (the engine links it while its still sky shows, never in
     flight); drawn once it is linked */
  function makeProgram() { if (!PROG && !BROKEN) PROG = HOST.program(VS_PAPER, FS_PAPER, 'paper'); }
  /* the instance ring: three buffers, each with its own VAO (14 vec4 attributes, 224 B a bird, MAXP birds), made at
     the boot's stage B and warmed with the engine's table; a frame writes the next buffer, one last drawn three frames
     ago, so no buffer the GPU may still read is written and no VAO is made or pointed again in flight */
  function bootRing() {
    if (RING) return;
    RING = [];
    for (var k = 0; k < 3; k++) {
      var vao = gl.createVertexArray(), vbo = gl.createBuffer();
      gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferData(gl.ARRAY_BUFFER, INST.byteLength, gl.DYNAMIC_DRAW);
      for (var i = 0; i < 7; i++) { gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, 4, gl.FLOAT, false, NF * 4, i * 16); gl.vertexAttribDivisor(i, 1); }
      RING.push([vao, vbo]);
    }
    gl.bindVertexArray(null); gl.bindBuffer(gl.ARRAY_BUFFER, null);
    /* (physics) the points' texture: a row a bird (46 points: device px, 1/depth; 30 facets' light), RGBA32F, read by
       texelFetch only (no filtering) */
    BT = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + PTS_UNIT); gl.bindTexture(gl.TEXTURE_2D, BT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, PTW, MAXP); gl.bindTexture(gl.TEXTURE_2D, null); gl.activeTexture(gl.TEXTURE0);
    VAO = RING[0][0]; VBO = RING[0][1]; RI = 0;
    if (HOST.warm && PROG) HOST.warm({ n: 'birds.paper', p: PROG, vao: VAO, mode: gl.TRIANGLE_STRIP, cnt: 4, inst: 1, bl: [gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE] });
  }
  var SAMPLERS = false;
  function ready() {
    if (BROKEN) return false;
    makeProgram();
    var r = HOST.linked(PROG);
    if (r === 'lost' || r === false) { if (r === false && PROG.u && !PROG.ok) BROKEN = true; return false; }
    if (!RING) bootRing();   // (the harness's stills and forced colours, which have no boot: made at the first draw)
    if (!SAMPLERS) {   // (the samplers' units, once: uDepth 2, uCloud 4, uBloom 5, uInkKeep 12, uHz 14)
      gl.useProgram(PROG.p); var u = PROG.u;
      if (u.uDepth) gl.uniform1i(u.uDepth, 2); if (u.uCloud) gl.uniform1i(u.uCloud, 4); if (u.uBloom) gl.uniform1i(u.uBloom, 5);
      if (u.uInkKeep) gl.uniform1i(u.uInkKeep, 12); if (u.uHz) gl.uniform1i(u.uHz, 14); if (u.uPts) gl.uniform1i(u.uPts, PTS_UNIT);
      SAMPLERS = true;
    }
    return true;
  }

  var tmp3 = {}, GW = new Float32Array(4 * 16), gwI = 0, DUMP = null, lastDraw = -1, NOGL = false;
  /* every bird where it is now (between the last two steps), posed afresh every frame */
  /* (fix round) SEPARATION: two birds of one flight never touching on the window. The planner keeps them apart as it
     plans (its boxes, the whole way); what it cannot foresee there (the guard's later turns and paces, the view's own
     error, the beat's widest wings against the box's) is caught as drawn: two birds whose outlines, as last drawn, come
     within SEP_PX device px (and their pens and filters) have the farther eased aside on the window, square to the line
     of sight (over SEP_T s), held while within SEP_CLEAR px more, and let back slowly (SEP_BACK s) once clear; at most
     SEP_MAX of its span. A correction of a few px, never a steering: the planner's places are the flight's */
  var OUTL = [0, 1, 2, 8, 7, 6, 11, 10, 9, 3, 4, 5];   // (way-path: the wings' outline only)
  var SEP_PX = 3, SEP_CLEAR = 4, SEP_T = 0.35, SEP_BACK = 3, SEP_MAX = 0.6, SEP_ON = true;
  function ptSeg(px, py, ax, ay, bx, by) { var ex = bx - ax, ey = by - ay, l = ex * ex + ey * ey, h = l > 1e-12 ? ((px - ax) * ex + (py - ay) * ey) / l : 0; h = h < 0 ? 0 : h > 1 ? 1 : h; var dx = px - ax - ex * h, dy = py - ay - ey * h; return Math.sqrt(dx * dx + dy * dy); }
  function crosses(ax, ay, bx, by, cx, cy, dx, dy) {
    var d1 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx), d2 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx), d3 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax), d4 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
    return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
  }
  function inOutline(D, x, y) { var c = false, n = OUTL.length; for (var i = 0, j = n - 1; i < n; j = i++) { var a = OUTL[i], b = OUTL[j], ya = D[2 * a + 1], yb = D[2 * b + 1]; if ((ya > y) !== (yb > y) && x < (D[2 * b] - D[2 * a]) * (y - ya) / (yb - ya) + D[2 * a]) c = !c; } return c; }
  /* the gap between two birds' outlines (device px; 0 where they cross or one holds the other) */
  function outlineGap(A, B) {
    var n = OUTL.length, g = 1e9, i, j;
    for (i = 0; i < n; i++) {
      var a = OUTL[i], b = OUTL[(i + 1) % n], ax = A[2 * a], ay = A[2 * a + 1], bx = A[2 * b], by = A[2 * b + 1];
      for (j = 0; j < n; j++) {
        var c = OUTL[j], d = OUTL[(j + 1) % n], cx = B[2 * c], cy = B[2 * c + 1], dx = B[2 * d], dy = B[2 * d + 1];
        if (crosses(ax, ay, bx, by, cx, cy, dx, dy)) return 0;
        var e = Math.min(ptSeg(ax, ay, cx, cy, dx, dy), ptSeg(bx, by, cx, cy, dx, dy), ptSeg(cx, cy, ax, ay, bx, by), ptSeg(dx, dy, ax, ay, bx, by));
        if (e < g) g = e;
      }
    }
    if (inOutline(A, B[24], B[25]) || inOutline(B, A[24], A[25])) return 0;   // (one's head inside the other)
    return g;
  }
  function boxD(D, o) { var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (var i = 0; i < 16; i++) { var x = D[2 * i], y = D[2 * i + 1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } o[0] = x0; o[1] = y0; o[2] = x1; o[3] = y1; return o; }
  var SBA = [0, 0, 0, 0], SBB = [0, 0, 0, 0];
  function separate(F, dt) {
    var M = F.m, i, j, sa, sb, k = VW.outW / Math.max(1, W);
    for (i = 0; i < M.length; i++) { sa = M[i].s; if (sa) { sa.pushX = 0; sa.pushY = 0; sa.pushN = 0; sa.sepHold = false; } }
    for (i = 0; i < M.length; i++) {
      sa = M[i].s; if (!sa || !sa.on || !(sa.lastOp > 0.02)) continue;
      boxD(sa.D, SBA);
      for (j = i + 1; j < M.length; j++) {
        sb = M[j].s; if (!sb || !sb.on || !(sb.lastOp > 0.02)) continue;
        var want = SEP_PX * k + 0.5 * (sa.floorPx + sb.floorPx) + sa.filt + sb.filt;
        boxD(sb.D, SBB);
        if (Math.max(SBA[0] - SBB[2], SBB[0] - SBA[2], SBA[1] - SBB[3], SBB[1] - SBA[3]) > want + SEP_CLEAR * k) continue;
        var g = outlineGap(sa.D, sb.D);
        if (g >= want + SEP_CLEAR * k) continue;
        var far = sa.n < sb.n ? sa : sb, near = far === sa ? sb : sa, fb = far === sa ? SBA : SBB, nb = far === sa ? SBB : SBA;
        if (g < want) {
          var vx = (fb[0] + fb[2] - nb[0] - nb[2]) / 2, vy = (fb[1] + fb[3] - nb[1] - nb[3]) / 2, vl = Math.sqrt(vx * vx + vy * vy);
          if (!(vl > 1e-3)) { vx = 0; vy = 1; vl = 1; }
          var need = (want - g) / k;
          far.pushX += vx / vl * need; far.pushY += vy / vl * need; far.pushN++;
        } else far.sepHold = true;
      }
    }
    for (i = 0; i < M.length; i++) {
      sa = M[i].s; if (!sa) continue;
      if (sa.pushN) { var e = 1 - Math.exp(-dt / SEP_T); sa.nudX = (sa.nudX || 0) + sa.pushX * e; sa.nudY = (sa.nudY || 0) + sa.pushY * e; STATS.sep = (STATS.sep || 0) + 1; }
      else if (!sa.sepHold && (sa.nudX || sa.nudY)) { var e2 = Math.exp(-dt / SEP_BACK); sa.nudX *= e2; sa.nudY *= e2; if (Math.abs(sa.nudX) + Math.abs(sa.nudY) < 0.02) sa.nudX = sa.nudY = 0; }
      var lim = SEP_MAX * (sa.spanPx || 10) / k, L = Math.sqrt((sa.nudX || 0) * (sa.nudX || 0) + (sa.nudY || 0) * (sa.nudY || 0));
      if (L > lim) { sa.nudX *= lim / L; sa.nudY *= lim / L; }
    }
  }
  function drawPaper() {
    var C = camDrawn(), al = HOST.alpha(), moving = !HOST.reduced(), tr = moving ? t - (1 - al) * STEP_DT : t, i, j, F, m, s, tau, nB = 0, o, k;
    var dt = lastDraw >= 0 && tr >= lastDraw ? Math.min(tr - lastDraw, 0.1) : 1 / 60; lastDraw = tr;
    measureIf();
    FW.ox = C.pos[0]; FW.oy = C.pos[1]; FW.oz = C.pos[2];
    flightNow(); camEscort(moving);
    var L = FORCED ? null : HOST.light(), nGw = 0, N = FORCED ? 0 : (HOST.night ? HOST.night() : 0);
    if (DUMP) DUMP.length = 0;
    for (var li = 0; li < 2; li++) for (i = 0; i < (li ? PLACES : flights).length; i++) {
      F = (li ? PLACES : flights)[i]; tau = tr - F.t0;
      var gone = F.gone ? clamp(1 - (tr - F.gone) / (F.goneT || GONE_T), 0, 1) : 1;
      if (moving && !FORCED && SEP_ON && F.m.length > 1) separate(F, dt);
      for (j = 0; j < F.m.length; j++) {
        m = F.m[j]; s = m.s; if (!s) continue;
        where(F, m, tau, wb); projReal(wb.x, wb.y, wb.z, C, tmp3);
        var n = tmp3.n, a = fadeFor(F, n), d = s.d;
        if (!(a >= 0.02) || !(tmp3.z > 1) || !inView(tmp3.x, tmp3.y, d.hw * n, d.hh * n) || nB >= DRAW_MAX) { s.on = false; s.lastOp = 0; s.rollOk = false; s.eOk = false; continue; }
        s.kind = kindOf(F);
        if (!s.spanPx) s.spanPx = d.span * n * VW.outW / Math.max(1, W);
        var gE = -1;   // (the gift, S5 SIMULATED: each bird written on as it crosses the edge: its outline 0.7 s, the paper 0.3 s; no spark)
        if (F.gift && moving && !FORCED) { gE = s.shownT >= 0 ? tr - s.shownT : 0; s.gW = gE < GIFT_T ? 1 : clamp(1 - (gE - GIFT_T) / 0.3, 0, 1); if (gE >= GIFT_T) gE = -1; } else s.gW = 0;
        s.gE = gE;
        poseBird(F, m, tau, !moving, C, s, dt);
        if (!projectBird(s, C)) { s.on = false; s.lastOp = 0; continue; }
        s.on = true;
        var back = s.shownT >= 0 && !s.vis && s.outT > -1e8 && t - s.outT <= LEAVE_T;
        var app = moving ? (s.still ? 1 : s.shownT >= 0 && (s.vis || back) ? clamp((tr - s.shownT) / (s.appT || APPEAR_T), 0, 1) : 0) : 1;
        if (gE >= 0 || (F.gift && s.gW > 0)) app = 1;
        if (F.live) app = 1;   // (the living sky: a bird shows by crossing the window's edge or coming out of the distance, never by a fade in time)   // (the gift's write-on is its entry: no fade beside it)
        if (!moving) s.still = true;
        /* the step back from the words, on the exact box (the halo's reach counted at night) */
        var sw = moving ? sweepNow() : 0, hwx = (s.bx1 - s.bx0) / 2, hhy = (s.by1 - s.by0) / 2, sb = stepBack((s.bx0 + s.bx1) / 2, (s.by0 + s.by1) / 2, hwx, hhy, sw > DRAG_PX ? sw * SB_LEAD : 0);
        if (moving && s.sbT >= 0) sb = Math.min(sb, s.sbS + SB_UP * Math.max(0, tr - s.sbT));
        /* (fix round) held at its lowest for SB_HOLD_T s before it may rise (at SB_UP a second): the beat's wings moving
           the exact box in and out of the margin no longer blink the bird at the beat's rate (round 2: 0.80, 0.24, 0.75,
           0.21, 0.70 in a second beside the name at night); a fall is followed at once */
        if (moving) { if (!(s.sbH <= 1) || sb <= s.sbH) { s.sbH = sb; s.sbHT = tr; } else if (tr - s.sbHT > SB_HOLD_T) s.sbH = Math.min(sb, s.sbH + SB_UP * dt); sb = s.sbH; }
        if (F.gone) { if (!(s.sbG <= 1)) s.sbG = sb; sb = s.sbG = Math.min(s.sbG, sb); } else s.sbG = undefined;
        if (F.live) sb = 1;   // (the living sky: no step back, which eases in time; the words' keep-off hides its ink where the words stand)
        var op = (FORCED ? 1 : fadeFor(F, s.n)) * app * gone * sb * (1 - ease((s.n - NEAR_FADE[0]) / (NEAR_FADE[1] - NEAR_FADE[0])));
        s.lastOp = op; s.lastApp = app; s.lastSB = sb; s.op = op;
        if (op <= 0.003) continue;
        lightBird(s, L, !moving, dt);
        holdTone(s, F, !moving, dt);
        cloudWeights(s, C, tr, !moving);
        var gdir = 1;
        if (gE >= 0) { var fc = s.face || F.dir || 1; gdir = (fc > 0) === (s.D[0] < s.D[12]) ? 1 : -1; }   // (written from the back tip to the front tip, on the window)
        packBird(nB, s, op, NEARMOST * d.span * MPU * MODEL_K + 2, FX.cloud, N, s.haloE, s.hold, gE, gdir, FORCED ? Math.max(s.floorPx, 1.5 * VW.outW / Math.max(1, W)) : s.floorPx);
        if (nGw < 16 && !FORCED) { GW[4 * nGw] = s.bx0; GW[4 * nGw + 1] = s.by0; GW[4 * nGw + 2] = s.bx1; GW[4 * nGw + 3] = s.by1; nGw++; }
        if (DUMP) DUMP.push(dumpBird(F, m, s, tau, op));
        nB++;
      }
    }
    if (PINS.length) nB = drawPins(C, dt, L, N, nB);
    if (GU.list.length && !FORCED && moving) nB = drawGuests(C, dt, L, N, nB, tr);
    STATS.drawn = nB;
    if (HOST.groundWant) HOST.groundWant(GW, nGw);
    if (!nB || NOGL) return;   // (way-path, dev: the poses alone, no drawing)
    var P = PROG, E = HOST.grade(), tex = !FORCED && HOST.bindTextures();
    HOST.target();
    gl.useProgram(P.p); if (!FORCED) HOST.frameUniforms(P);
    RI = (RI + 1) % RING.length; VAO = RING[RI][0]; VBO = RING[RI][1];
    gl.bindVertexArray(VAO); gl.bindBuffer(gl.ARRAY_BUFFER, VBO); gl.bufferSubData(gl.ARRAY_BUFFER, 0, INST, 0, nB * NF);
    gl.activeTexture(gl.TEXTURE0 + PTS_UNIT); gl.bindTexture(gl.TEXTURE_2D, BT); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, PTW, nB, gl.RGBA, gl.FLOAT, BTX, 0); gl.activeTexture(gl.TEXTURE0);   // (physics: the drawn birds' rows)
    HOST.view(VW);
    UGR[0] = E ? E.exposure : 1; UGR[1] = E ? E.sat : 1; UGR[2] = 0; UGR[3] = FX.air ? 1 : 0;
    USC[0] = VW.sUx; USC[1] = VW.sUy; USC[2] = VW.hUx; USC[3] = VW.hUy;
    UMK[0] = VW.mUx; UMK[1] = VW.mUy; UMK[2] = VW.hUx - 0.5 / Math.max(1, VW.outW / 2); UMK[3] = VW.hUy - 0.5 / Math.max(1, VW.outH / 2);
    ULAND[0] = FX.land && tex ? 1 : 0; ULAND[1] = FX.cloud && tex ? 1 : 0; ULAND[2] = clamp((VW.ddpr || VW.dpr) / Math.max(VW.dpr, 0.5), 1, 2) > 1 ? 1 / clamp((VW.ddpr || VW.dpr) / Math.max(VW.dpr, 0.5), 1, 2) : 1; ULAND[3] = tex && FX.mask ? 1 : 0;
    UBL[0] = VW.bUx || 1; UBL[1] = VW.bUy || 1; UBL[2] = VW.bloom || 0; UBL[3] = FX.glare && tex ? 1 : 0;
    UGL[0] = GLARE_P[0]; UGL[1] = GLARE_P[1]; UGL[2] = GLARE_P[2]; UGL[3] = GLARE_P[3];
    var fc = FORCED && HOST.forced ? HOST.forced() : null;
    UMODE[0] = FORCED ? 1 : 0; UMODE[1] = GLOW_ENC; UMODE[2] = HALO_A; UMODE[3] = 0;
    if (fc) { UINKF[0] = fc.ink[0]; UINKF[1] = fc.ink[1]; UINKF[2] = fc.ink[2]; }
    var u = P.u;
    gl.uniform2f(u.uOut, VW.outW, VW.outH); gl.uniform4fv(u.uGr, UGR);
    gl.uniform3fv(u.uLift, E ? E.lift : [0, 0, 0]); gl.uniform3fv(u.uGain, E ? E.gain : [1, 1, 1]);
    gl.uniform4fv(u.uSc, USC); gl.uniform4fv(u.uMk, UMK); gl.uniform4fv(u.uLand, ULAND);
    gl.uniform4fv(u.uBl, UBL); gl.uniform4fv(u.uGl, UGL); gl.uniform4fv(u.uMode, UMODE); gl.uniform3fv(u.uInkF, UINKF);
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.depthMask(false);
    gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, nB);
    gl.disable(gl.BLEND); gl.depthMask(true);
    gl.bindVertexArray(null);
    if (tex) { gl.activeTexture(gl.TEXTURE14); gl.bindTexture(gl.TEXTURE_2D, null); gl.activeTexture(gl.TEXTURE0); }   // (TG.hz off unit 14 again: the clouds' accumulation binds its own there)
    gl.activeTexture(gl.TEXTURE0 + PTS_UNIT); gl.bindTexture(gl.TEXTURE_2D, null); gl.activeTexture(gl.TEXTURE0);
    HOST.count(1, nB);
  }
  /* (physics) one bird's instance (7 vec4) and its row of the points' texture (its 46 points, device px and 1/depth;
     its 30 facets' light, linear, when its planes show) */
  function packBird(nB, s, op, slack, cloudOn, N, haloE, hold, gE, gdir, floor) {
    var o = nB * NF, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, i, r = nB * PTW * 4, D = s.D46;
    for (i = 0; i < NV; i++) { var x = D[2 * i], y = D[2 * i + 1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; BTX[r + 4 * i] = x; BTX[r + 4 * i + 1] = y; BTX[r + 4 * i + 2] = s.IZ[i]; BTX[r + 4 * i + 3] = 0; }
    var lod = FORCED || N > 0 ? 0 : s.lod;                // (the night's one tone, its glow: no planes; forced colours flat)
    if (lod > 0) for (i = 0; i < NFAC; i++) { BTX[r + 4 * (NV + i)] = s.FE[3 * i]; BTX[r + 4 * (NV + i) + 1] = s.FE[3 * i + 1]; BTX[r + 4 * (NV + i) + 2] = s.FE[3 * i + 2]; BTX[r + 4 * (NV + i) + 3] = 0; }
    INST[o] = x0; INST[o + 1] = y0; INST[o + 2] = x1; INST[o + 3] = y1;
    INST[o + 4] = nB; INST[o + 5] = LB.flexKind(s.kind).slotted ? 1 : 0; INST[o + 6] = floor; INST[o + 7] = s.filt;
    INST[o + 8] = s.E[0]; INST[o + 9] = s.E[1]; INST[o + 10] = s.E[2]; INST[o + 11] = op;
    INST[o + 12] = s.body[0]; INST[o + 13] = s.body[1]; INST[o + 14] = s.body[2]; INST[o + 15] = slack;
    INST[o + 16] = cloudOn ? s.cw[0] : 0; INST[o + 17] = cloudOn ? s.cw[1] : 0; INST[o + 18] = cloudOn ? s.cw[2] : 0; INST[o + 19] = N;
    INST[o + 20] = haloE; INST[o + 21] = hold; INST[o + 22] = gE; INST[o + 23] = gdir;
    INST[o + 24] = lod; INST[o + 25] = 0; INST[o + 26] = 0; INST[o + 27] = 0;   // (life: [25] 1 a guest)
  }
  var GIFT_T = 1.0;   // s: the gift's write-on, whole (outline 0.7, paper 0.3; fix round: no spark)
  var GLARE_P = [0.02, 0.09, 0.35, 0.5];   // the light wrap: the bloom's light under the bird from, to; the paper thinned by (px), lifted by
  /* (dev) one drawn bird, for the judge: read-only */
  function r4(v) { return Math.round(v * 1e4) / 1e4; }
  function sunAng(s) { var L = HOST.light(), sd = L && L.sunDir; if (!sd) return null; var l = Math.sqrt(s.body[0] * s.body[0] + s.body[1] * s.body[1] + s.body[2] * s.body[2]) || 1; return r4(Math.acos(clamp((s.body[0] * sd[0] + s.body[1] * sd[1] + s.body[2] * sd[2]) / l, -1, 1)) / DEG); }   // (deg between the line of sight to the bird and the sun: backlit under 35)
  function dumpBird(F, m, s, tau, op) {
    var k = VW.outW / Math.max(1, W), pts = [];
    for (var i = 0; i < 16; i++) pts.push(+(s.D[2 * i] / k).toFixed(2), +(H - s.D[2 * i + 1] / k).toFixed(2));
    return { f: F.place ? 'p' + F.key : F.id, j: F.m ? F.m.indexOf(m) : -1, kind: s.kind, stage: F.stage || null, mk: F.live ? F.pat : F.kind, n: r4(s.n), span: +s.spanPx.toFixed(2), pts: pts, box: [+s.bx0.toFixed(1), +s.by0.toFixed(1), +s.bx1.toFixed(1), +s.by1.toFixed(1)],
      ph: s.ph === undefined ? null : r4(s.ph), mode: s.mode, fw: r4(s.flapW || 0), v: [r4(s.vw[0]), r4(s.vw[1]), r4(s.vw[2])], va: s.va ? [r4(s.va[0]), r4(s.va[1]), r4(s.va[2])] : null, wingL: s.wingL ? [r4(s.wingL[0] / Math.max(s.wingL[1], 1e-6)), r4(s.wingL[2] / Math.max(s.wingL[3], 1e-6)), r4(s.wingL[4])] : null, wind: s.wind ? [r4(s.wind[0]), r4(s.wind[1])] : null, a: [r4(s.aw[0]), r4(s.aw[1]), r4(s.aw[2])],
      roll: r4(s.roll), rollT: r4(s.rollT), coord: r4(s.coord), trim: r4(s.trim || 0), set: r4(s.setNow || 0), nud: [r4(s.nudX || 0), r4(s.nudY || 0)], backlit: !!s.backlit, bodyPx: r4(s.bodyPx || 0), pitch: r4(s.pitch), climb: r4(s.climb), slip: r4(s.slip), az: r4(s.az), el: r4(s.el),
      E: [r4(s.E[0]), r4(s.E[1]), r4(s.E[2])], L: r4(s.birdL || 0), Lh: s.E ? r4(gradedL(s.E, HOST.grade(), s.hold || 1)) : null, gL: r4(s.groundL), hold: r4(s.hold), holding: !!s.holding, cw: [r4(s.cw[0]), r4(s.cw[1]), r4(s.cw[2])], op: r4(op),
      legib: r4(s.legib || 0), floor: r4(s.floorPx), filt: r4(s.filt), N: r4(s.halo || 0), depth: r4(s.depth), tau: r4(tau), mi: F.m.indexOf(m), body: [r4(s.body[0]), r4(s.body[1]), r4(s.body[2])],
      hz: m.f ? r4(m.f) : null, hzF: F.f ? r4(F.f) : null, glide: m.glide ? r4(m.glide) : null, sun: sunAng(s), dspan: s.d ? r4(s.d.span) : null, side: F.sideShare !== undefined ? r4(F.sideShare) : null, tat: F.tattoo !== undefined ? r4(F.tattoo) : null, near: !!F.near,
      fwd: [r4(s.fw[0]), r4(s.fw[1]), r4(s.fw[2])], left: [r4(s.lw3[0]), r4(s.lw3[1]), r4(s.lw3[2])], gE: s.gE === undefined ? -1 : r4(s.gE), gift: !!F.gift,
      /* (physics) the 46 points (CSS px, y down), the form's topology (1 slotted), the facets' share, the wing's state */
      eg: r4(s.egW || 0), cls: F.cls || null, roost: !!F.roost, rig: s.P22 ? [r4(s.P22[0]), r4(s.P22[NP]), r4(s.P22[4]), r4(s.P22[NP + 4])] : null, p46: p46of(s, k), topo: s.kind && LB.flexKind(s.kind).slotted ? 1 : 0, lod: r4(s.lod || 0), sw: r4(s.swing === undefined ? 1 : s.swing),
      wg: s.LS ? { e: r4(s.LS.e), a: r4(s.LS.a), psi: r4(s.LS.psi), flap: s.LS.flap, k: r4(s.LS.k), D: r4(s.LS.D), pause: s.LS.pause, lock: r4(s.LS.lock || 0), bank: r4(s.LS.bank || 0), trim: r4(s.LS.trim || 0) } : null, f0: m && m.w && m.w.wing ? r4(m.w.wing.f) : null };
  }
  function p46of(s, k) { if (!s.D46) return null; var o = []; for (var i = 0; i < NV; i++) o.push(+(s.D46[2 * i] / k).toFixed(2), +(H - s.D46[2 * i + 1] / k).toFixed(2)); return o; }

  /* the forced colours' view-projection: the still camera's (the points are from the camera, so only its turn) */
  var FVP = new Float32Array(16);
  function forcedVP() {
    var C = FCAM, sx = 1 / VW.tanX, sy = 1 / VW.tanY, n = 0.5, f = 1e5;
    /* rows: x = sx (p . r), y = sy (p . u), w = p . f (z unused by the ink) */
    FVP[0] = sx * C.r[0]; FVP[4] = sx * C.r[1]; FVP[8] = sx * C.r[2]; FVP[12] = 0;
    FVP[1] = sy * C.u[0]; FVP[5] = sy * C.u[1]; FVP[9] = sy * C.u[2]; FVP[13] = 0;
    FVP[2] = C.f[0] * (f + n) / (f - n); FVP[6] = C.f[1] * (f + n) / (f - n); FVP[10] = C.f[2] * (f + n) / (f - n); FVP[14] = -2 * f * n / (f - n);
    FVP[3] = C.f[0]; FVP[7] = C.f[1]; FVP[11] = C.f[2]; FVP[15] = 0;
    return FVP;
  }
  /* a bird near the words steps back: by its ink box's distance to theirs, faded within their margin (WORDS, LINKS),
     gone at SB_GONE of it (round 2: the live's "ink never within 12 px of the words" holds when a drag, which no plan
     foresees, sweeps a bird toward them; round 1 faded it out only at the box: ink at a third, 11 px off, in W8).
     (world5 E0, Fix 2) gone at three quarters of the margin, 18 px from the name's ink, no longer at half (12 px): the
     lettered page's words are smaller than the bio's were, a drag sweeps birds nearer them, and the faint ink left
     between 12 and 18 px was the least distance the judged runs measured (14.6 px against round 3's 17.9) */
  var SB_GONE = 0.75;
  /* (world5 E0, Fix 3: the drag policy, for E4 to confirm) while the visitor drags the view (the window swept faster
     than DRAG_PX) the step back begins further out, by SB_LEAD s of the sweep (`ext`, px), so a bird swept toward the
     words at 800 px/s fades over a fifth of a second instead of vanishing in one frame across the 6 px of the band
     (verify-regress-2: 2 vanishes in DUNES s21's drag); it is gone at the same 18 px. And a flight a drag sweeps into
     the words' margin goes whole (track: SWEPT), as the live's flight the words moved onto goes, rather than stepping
     back bird by bird and coming out from behind the words when the drag ends */
  var SB_AHEAD = 1.2, SB_AHEAD_CAM = 0.45, SB_GO_T = 0.9, SB_PRED = 0.6, SB_PROBES = 6;   // (E1.1: how far ahead in time a bird's way on the window is foreseen; its flight's quick fade, s; the step back foreseen that lets it go. Fix 2: 0.45 -> 1.2 s along its planned path, the camera's sweep at most 0.45 s of it; the fade 0.3 -> 0.9 s)
  var SB_LEAD = 0;
  var SB_HOLD_T = 0.6;   // (fix round) s: a beat and more: the step back's lowest held this long   // (Fix 3: tried at 0.2 s, the suite's step-backs went 7 -> 32 and its re-entries 30 -> 45 for one vanish fewer (2 -> 1): off)
  function stepBack(x, y, hw, hh, ext) {
    var f = 1, i, o, dx, dy, g, m;
    ext = ext > 0 ? ext : 0;
    for (i = 0; i < words.length; i++) {
      o = words[i]; m = o.m;
      dx = Math.max(o.l - x - hw, x - hw - o.r, 0); dy = Math.max(o.t - y - hh, y - hh - o.b, 0);
      g = Math.sqrt(dx * dx + dy * dy);
      if (g < m + ext) f = Math.min(f, ease((g - SB_GONE * m) / ((1 - SB_GONE) * m + ext)));
    }
    return f;
  }
  var FLIGHT_ID = 0;
  var STATS = { drawn: 0, planned: 0, steps: 0, workMax: 0, landed: { unseen: 0, never: 0, cloud: 0, words: 0, done: 0 }, fails: {}, jobs: [], costs: {}, guard: { n: 0, eased: 0, gone: 0, wheeled: 0, held: 0, paced: 0, hold: 0 }, away: 0, back: 0 };
  /* (development) the live mark's tips' line: its angle on the window, rising toward the front (deg) */
  function tipsLean(B) { shape(B, 1, false, SH, 0); return Math.atan2(-(SH[9] - SH[1]), SH[8] - SH[0]) / DEG; }

  /* ---------------- the sky's clock (the engine's fixed steps; no clock is read) ---------------- */

  var t = 0, phase = -1, tNext = 0, misses = 0, stills = 0, firstNext = true, STEP_DT = 1 / 60, GONE_T = 1.2, APPEAR_T = 1, SB_UP = 2, STILL_Q = 1500, STILL_G = 40;

  /* how long a flight is in view, near enough (as its trial saw it through the coming view) */
  function inViewFor(F) { return Math.max(4, F.seenSpan || (F.dur - F.from - 2 * OUT / (F.v * F.n0 || SPEED[1]))); }
  function gapAfter(F) {
    var g0 = inViewFor(F) * pick(F.r, GAP) * (1 + Math.min(THIN_MAX, t / THIN)) * (1.1 - 0.2 * fTraffic) * OPEN_SKY * GAP_K * crowd(), LC = LIFE[F.cls];
    if (!LC) return g0;
    return Math.min(g0 * LC.gap, inViewFor(F) + LC.empty - 12);   // (life: x the class's gap; the empty spell after it never over the class's longest, less the next one's set-off and entry)
  }
  /* a job is done: when the next flight comes */
  function planned(F, mode) {
    if (mode === 'still') { if (F && ++stills < (W >= WIDE ? 2 : 1)) startJob('still'); return; }   // the still sky: a second flight on a wide one
    if (F) { misses = 0; tNext = t + (mode === 'first' ? pick(F.r, [0.12, 0.25]) * inViewFor(F) : gapAfter(F)); }   // the second a few seconds after the first
    else { misses++; tNext = t + Math.min(2 * RETRY, RETRY * misses) * OPEN_SKY * (t - lastSeenAny > EMPTY_T ? 0.35 : 1); }   // no room (the bands are taken): look again a little later (soon, in an empty sky)
  }
  var lastSeenAny = 0, EMPTY_T = 1.5, BACK_T = 2;
  var GAP_K = 1;               // (round 3) the gaps between flights, on the live's
  /* (round 3) the sky's own measure of how full it has been: the birds on the window, a running mean over CROWD_T s; the
     gaps stretched as far as it is over the live's own (3.3 birds on a phone, 4.2 at 1440: a flight in the turning
     world is on the window longer than its trial could see, and the sky held half again the live's birds) */
  var CROWD_T = 60, crowdN = 0, CROWD = [3.3, 4.2], CROWD_OVER = 1.5, CROWD_UP = 3.5;
  function crowdTarget() { return CROWD[0] + (CROWD[1] - CROWD[0]) * clamp((W - 390) / 1050, 0, 1); }
  function crowd() { var k = crowdN / crowdTarget(); return clamp(k * k, 1, 4); }
  /* into a sky a flight has left unseen, the next comes as the first did, within a second or two */
  function nextAsFirst(now) {   // (E1.1 Fix 2: now, the words' guard letting a flight go: the next planned at once, while it fades, not 0.5 s on)
    /* (round 3) only into a sky no other flight is in or coming into: with others there, the rhythm goes on as it was
       (round 2 brought the next as the first, a second or two later, whenever any flight went: the sky over-filled) */
    for (var i = 0; i < flights.length; i++) { var G = flights[i]; if (!G.gone && !G.away && (t - (G.lastSeen || -1e9) < 1 || (G.firstSeen === undefined && t - G.t0 < (G.enterT || 0) + 2))) return; }
    firstNext = true; tNext = Math.min(tNext, t + (now ? 0 : 0.5)); misses = 0;
  }
  /* is any bird of a flight seen through the world's camera C (beyond its planned end: the camera may have turned to it) */
  function seenReal(F, tau, C) {
    for (var i = 0; i < F.m.length; i++) {
      var m = F.m[i], d = m.d;
      where(F, m, tau, wb); projReal(wb.x, wb.y, wb.z, C, tmp3);
      if (tmp3.z > 1 && fadeFor(F, tmp3.n) >= 0.02 && inView(tmp3.x, tmp3.y, d.hw * tmp3.n, d.hh * tmp3.n)) return true;
    }
    return false;
  }
  function measureIf() { if (dirty || changed()) relayout(); }
  /* each bird, 12 times a second on the flight's own steps (so a still is the same drawn alone or in a film): when it
     comes into view (its appear begins), and which way it faces: the way it goes on the window against the world (the
     camera's turn left out: a bird swept back by a turn of the view still faces the way it flies), turning only past
     FACE_HYST (the live's hysteresis); and, a flight's, when any bird of it was last seen and how long all its birds
     on the window have been behind cloud */
  var seenNow = 0;
  function track(C) {
    var i, j, F, m, s, tau, c, dx, dy, d, vis, li, any, cl, on, sbN, held, quick;
    seenNow = 0;
    var dragging = sweepNow() > DRAG_PX;
    for (li = 0; li < 2; li++) for (i = 0; i < (li ? PLACES : flights).length; i++) {
      F = (li ? PLACES : flights)[i]; tau = t - F.t0; any = false; cl = true; on = 0; held = false; quick = false;
      for (j = 0; j < F.m.length; j++) {
        m = F.m[j]; s = m.s; if (!s) continue; d = s.d;
        where(F, m, tau, wb); projReal(wb.x, wb.y, wb.z, C, tmp3);
        vis = tmp3.z > 1 && fadeFor(F, tmp3.n) >= 0.02 && inView(tmp3.x, tmp3.y, d.hw * tmp3.n, d.hh * tmp3.n);
        if (!vis) { if (s.vis) { s.vis = false; s.outT = t; } s.still = false; s.sbT = -1; s.sbLow = 0; s.wpT = -1; continue; }   // (out of view: when it is back, below)
        on++; if (!(s.wf > 0.5)) cl = false; if (!li) seenNow += F.kind === 'ribbon' ? 0.2 : 1;   // (birds3d: a speck a fifth of a bird)
        /* (seen: in view, and neither behind the words' veil nor behind cloud: a flight the turn of the view has carried
           behind the words, or the clouds hide, is not kept for the sky as if it were seen) */
        sbN = stepBack(tmp3.x, tmp3.y, d.hw * tmp3.n, (d.hh + BOB * d.span) * tmp3.n);
        if (!(s.wf > 0.5) && sbN > 0.3) any = true;
        /* (round 2) its step back from the words as drawn: at once toward them, back out at SB_UP a second (a fast sweep
           crosses the 12 px of the fade in a frame: without this a bird swept clear of the words flashed back in full) */
        s.sbS = s.sbT >= 0 ? Math.min(sbN, s.sbS + SB_UP * (t - s.sbT)) : sbN; s.sbT = t;
        /* (round 3) a bird the words' margin holds for a moment (the guard foresees nearly all: a drag does not): its
           whole flight goes, fading together, as the live's flight the words moved onto goes; the per-bird fade only
           keeps the words clear meanwhile. Round 2 kept the rest flying while one bird after another dissolved */
        s.sbLow = sbN < 0.95 && !dragging ? (s.sbLow || 0) + 5 * STEP_DT : 0;   // (a drag, the visitor's own sweep, carries birds across the words in a moment: the per-bird fade alone, then)
        if (s.sbLow > SB_HOLD) held = true;
        if (dragging && SWEPT && sbN < 0.95) { held = true; quick = true; }   // (Fix 3: a flight a drag sweeps into the words' margin goes whole; E1.1: quickly)
        /* (E1.1) the bird's own speed on the window, as drawn (its flight's motion and the camera's, a drag's
           included): from where it was last step, eased over about 0.08 s */
        if (s.wpT > 0 && t - s.wpT > 0 && t - s.wpT < 0.2) {
          var wdt = t - s.wpT, wvx = (tmp3.x - s.wpX) / wdt, wvy = (tmp3.y - s.wpY) / wdt, wk = Math.min(1, wdt / 0.08);
          if (s.wvOk) { s.wvx += (wvx - s.wvx) * wk; s.wvy += (wvy - s.wvy) * wk; } else { s.wvx = wvx; s.wvy = wvy; s.wvOk = true; }
        } else s.wvOk = false;
        s.wpX = tmp3.x; s.wpY = tmp3.y; s.wpT = t;
        where(F, m, tau + 0.25, wa); projReal(wa.x, wa.y, wa.z, C, pa);
        dx = pa.x - tmp3.x; dy = pa.y - tmp3.y; c = dx / (Math.sqrt(dx * dx + dy * dy) || 1);
        /* (world5 E1.1, item 4) a flight a bird of which will be well inside the words' margin within SB_AHEAD s (its
           step back there under SB_PRED, at a third, two thirds and the whole of it, along its own speed on the window
           as drawn: its flight's motion and the camera's, a drag's included) goes whole now and quickly (SB_GO_T): Fix 3
           let it go only once a bird was in the margin (or held there SB_HOLD s), with the whole GONE_T fade, so its
           birds stepped back to nothing first and, where the drag or a thermal's circle carried them out again, came
           back while it faded (the judged seven: DUNES s21's line of geese in its vertical drag, 5 out and back; DUNES
           s13's thermal stork, 1). (The first cut foresaw it by the band widened by that speed in every direction and
           let go at 0.95: no dissolve and no return in the seven, but flights that only skimmed the margin went too,
           and the empty sky grew in four of them: 7.2 -> 8.1 % in DUNES s5) */
        /* (E1.1 Fix 2, verify-regress-1 defect 5: the quick fade took a whole flight from full ink to 0.17 in 0.27 s
           mid-sky) foreseen SB_AHEAD (1.2 s) ahead, so the fade (SB_GO_T 0.9 s) is all but done before a bird reaches
           the margin: the bird's own way on its planned path (a thermal's circle followed, not its tangent), seen
           through this frame's camera, plus the camera's own sweep of the window (its speed as drawn less the bird's
           own: the look at the ground's, carried the whole way; a drag's at most SB_AHEAD_CAM, 0.45 s, as it stops when
           the finger does), at SB_PROBES points (every 0.2 s: at three, a thermal's circle dipping into the margin
           between two of them was seen only 0.67 s before it got there) */
        if (!held && !F.gone && !FORCED && s.wvOk) {
          var ovx = dx / 0.25, ovy = dy / 0.25, cvx = s.wvx - ovx, cvy = s.wvy - ovy;
          for (var q3 = 1; q3 <= SB_PROBES && !held; q3++) {
            var ah = SB_AHEAD * q3 / SB_PROBES, ahc = dragging ? Math.min(ah, SB_AHEAD_CAM) : ah;   // (the camera's own slow sweep, the look at the ground, carried the whole way; a drag's only SB_AHEAD_CAM)
            where(F, m, tau + ah, wc); projReal(wc.x, wc.y, wc.z, C, pc);
            if (!(pc.z > 1)) continue;
            if (stepBack(pc.x + cvx * ahc, pc.y + cvy * ahc, d.hw * pc.n, (d.hh + BOB * d.span) * pc.n) < SB_PRED) { held = true; quick = true; }
          }
        }
        if (!s.vis) {
          s.vis = true;
          /* its appear: the live's 1 s, the first time it is seen. (round 3) Back in view within LEAVE_T, it carries on
             at its ink: it crosses back over the edge it left by, as the land does (round 2 faded it in again from
             nothing, already well inside the window); back after longer, its appear again, done within about 30 px of
             the edge at the speed the window carries it in */
          if (s.still) { if (s.shownT < 0) { s.shownT = t; s.appT = APPEAR_T; } }   // (the still sky's: shown already, facing as it was drawn)
          else if (s.shownT < 0) { s.shownT = t; s.appT = APPEAR_T; s.face = dx < 0 ? -1 : 1; }
          else if (t - s.outT > LEAVE_T) { s.shownT = t; s.appT = clamp(30 / Math.max(1, Math.sqrt(dx * dx + dy * dy) / 0.25 + sweepNow()), 0.15, APPEAR_T); }
        }
        if (c === c) {
          if (s.face > 0 && c < -FACE_HYST) s.face = -1;        // turn to face left (mirrored)
          else if (s.face < 0 && c > FACE_HYST) s.face = 1;     // face right (as drawn)
        }
      }
      if (any) { F.lastSeen = t; lastSeenAny = t; if (F.firstSeen === undefined) F.firstSeen = t; F.away = false; }
      F.cloudT = on && cl && !FORCED ? (F.cloudT || 0) + 5 * STEP_DT : 0;
      F.backT = on && !any && !cl ? (F.backT || 0) + 5 * STEP_DT : 0;   // (in view, but all behind the words' veil)
      if (held && !F.gone && !F.live) { F.gone = t; F.goneT = quick ? SB_GO_T : GONE_T; STATS.landed.words++; STATS.guard.held++; if (quick) STATS.guard.ahead = (STATS.guard.ahead || 0) + 1; if (!F.place) nextAsFirst(true); }   // (Fix 2: its successor planned at once, while it fades)   // (a place's thermal too: the words came onto it, all its birds go; E1.1: ahead of the margin, quickly)
    }
  }
  /* (round 3) the window's sweep under a bird now: f x the camera's turn (its last quarter second), across and (a drag
     tilts the view too) up and down */
  function sweepNow() {
    if (CH.n < 2) return 0;
    var a = (CH.i + 31) % 32, b = (CH.i + 32 - Math.min(CH.n, 16)) % 32, dt = CH.t[a] - CH.t[b];
    if (!(dt > 0)) return 0;
    var sx = cam.f * angDiff(CH.yaw[a], CH.yaw[b]) / dt, sy = cam.f * (CH.pitch[a] - CH.pitch[b]) / dt;
    return Math.sqrt(sx * sx + sy * sy);
  }
  var DRAG_PX = 150;            // px/s: the window swept faster than this (the visitor's drag; the autopilot's calm turn is 10-20)
  var SWEPT = true;             // (Fix 3) a flight a drag sweeps into the words' margin goes whole (false: Fix 2's per-bird step back alone)
  function activeFlights() { var n = 0; for (var i = 0; i < flights.length; i++) if (!flights[i].away && !flights[i].gone) n++; return n; }
  /* (round 3) the calm asked of the camera while the birds fly (a sky with birds in it, or one about to have them: a
     flight is planned before it comes, through the camera's coming turn, so the calm is asked for all along): its turn
     sweeping the land across the window at most CALM_K of the live's median pace there (HOST.calm; the engine eases it
     in and out over 2 s; under reduced motion or forced colours the birds ask nothing) */
  var calmOn = -1, coverAvg = 0, COVER_PLAN = 0.5;
  /* the calm's rate (rad/s): the camera's own turn sweeps the land across the window at CALM_K of the live's median pace */
  function calmBase() { return cam.f >= 2 ? CALM_K * (W / across(CALM)) / cam.f : 0; }
  function calmAsk() {
    if (!HOST.calm || cam.f < 2) return;
    var base = !FORCED && !HOST.reduced() ? calmBase() : 0, rate = t < HOLD.until ? base * HOLD_K : base;   // (round 3: held while a flight needs it: the guard's)
    if (Math.abs(rate - calmOn) > 1e-7) { calmOn = rate; HOST.calm(rate, base * CALM_EV); }
  }

  /* one fixed step: the frames, the clock, the planning (a share of it), the flights that are done */
  function step(dt) {
    STEP_DT = dt;
    forcedCheck();
    if (!frameStep()) return;
    var moving = !HOST.reduced(), cover = FORCED ? 0 : HOST.cover(), F, mode, i, C = camStep();
    if (moving) t += dt;
    measureIf();
    STATS.steps++;
    if (C) { camHistory(C); if (moving) camVelStep(C); }
    if (moving && STATS.steps % 6 === 0) errLearn();
    calmAsk();
    /* (round 2) an empty sky is not kept waiting: no bird seen a second and a half, and the next comes as the first did
       (the view turns flights out of sight sooner than the live's sky ended them) */
    if (moving && !job && t - lastSeenAny > EMPTY_T && !firstNext) {
      firstNext = true; tNext = Math.min(tNext, t); misses = 0;
      /* (the flights out of sight that are not about to come into it are let go: the new one is not kept from their bands) */
      for (i = flights.length - 1; i >= 0; i--) { F = flights[i]; if (!F.gone && F.firstSeen === undefined && !(t - F.t0 < (F.enterT || 0) + 1.5) && !(C && seenReal(F, t - F.t0, C)) && !drawnNow(F)) { land(F); STATS.landed.unseen++; } }   // (round 3: a flight seen before is kept: the view may come back to it)
    }
    var w0 = work;
    /* (round 3) the view clearing (a passage's cloud thinning out, the cover falling under COVER_PLAN): the next flight is
       planned as it clears, there as it has (round 2 waited for the cover all but gone: every passage between realms left
       the sky empty some 2 s longer) */
    coverAvg += (cover - coverAvg) * Math.min(1, dt / 0.5);
    var clearing = cover < COVER_PLAN && cover < coverAvg - 0.01;
    if (C && moving && !FORCED && !liveOn()) stageStep(C);
    if (C && moving && !FORCED && liveOn()) liveStep(C, dt);   // (round 3: the living sky)   // (birds3d: the staging's clock and its job)
    if (!liveOn() && !job && !STG.job && moving && (cover < 0.05 || clearing) && t >= tNext && !(t > STG.hush[0] && t < STG.hush[1]) && activeFlights() < maxFlights() && seenNow < crowdTarget() + CROWD_OVER) {   // (round 3: nor while the window already holds more than the live's sky)
      if (!startJob(firstNext ? 'first' : 'next')) planned(null, 'next');
    }
    if (job) {
      if (cover > 0.5 && job.mode !== 'still') job = null;   // (the view is covered: no flight is planned behind it)
      else {
        mode = job.mode;
        F = workJob(QUOTA_STEP - (work - w0));            // (a job's start, the coming view's first samples, counted in the step's quota)
        STATS.workMax = Math.max(STATS.workMax, work - w0);
        if (F || !job) { if (F) { firstNext = false; STATS.planned++; } planned(F, moving ? mode : 'still'); }
      }
    }
    if (C && STATS.steps % 5 === 0) { track(C); if (moving) crowdN += (seenNow - crowdN) * 5 * dt / CROWD_T; }
    if (C && moving && !FORCED) for (i = 0; i < flights.length; i++) if ((STATS.steps + 3 * i) % GUARD_EVERY === 0) guard(flights[i]);   // (round 3: each flight a few seconds ahead, on a step of its own)
    if (STATS.steps % 30 === 0 && !FORCED && skyCls() === 'day' && !liveOn()) placeStep(C, cover);   // (life: no landmark thermals after sunset)
    if (moving) guestStep(dt);   // (life: the guests, after every ordinary bird's step: nothing of theirs is read back)
    if (PLACES.length && FL.ok) placeLift(dt);
    for (i = flights.length - 1; i >= 0; i--) {           // done: past its end and seen no more (or faded out); or let go unseen
      F = flights[i];
      var tau = t - F.t0;
      var endNow = F.gone && t - F.gone > (F.goneT || GONE_T), due = !endNow && ((tau > F.dur && (!C || !seenReal(F, tau, C))) || tau > F.dur + 40);
      /* (fix round) a flight is done only when none of its birds is drawn: one still drawn (the planner's end against the
         turning view, or its 40 s past its span) goes as a flight the words moved onto goes, fading together over
         LATE_T, never popped out mid-sky (round 2: a skein at full ink 79 px inside the edge gone in a frame) */
      if (due && drawnNow(F)) { if (!F.gone) { F.gone = t; F.goneT = LATE_T; STATS.landed.late = (STATS.landed.late || 0) + 1; } due = false; }
      if (endNow || due) { land(F); STATS.landed.done++; continue; }
      if (F.gone || !moving) continue;
      if (F.firstSeen !== undefined && t - F.lastSeen > LEAVE_T && !(C && seenReal(F, tau, C))) {   // the view has turned from it
        /* (round 3) kept, unseen, while its planned span lasts (AWAY_T at most): the visitor may look back to it (round
           2 let it go after LEAVE_T, and a skein looked away from for 4 s was gone when the view came back); its band is
           free meanwhile, the next flight comes as the first did, and it gives way to one that needs its birds */
        if (tau < F.dur && t - F.lastSeen < AWAY_T) { if (!F.away) { F.away = true; STATS.away++; nextAsFirst(); } continue; }
        if (drawnNow(F)) { F.gone = t; F.goneT = LATE_T; STATS.landed.late = (STATS.landed.late || 0) + 1; continue; }   // (fix round: drawn, it fades)
        land(F); STATS.landed.unseen++; if (!F.away) nextAsFirst(); continue;
      }
      if (F.firstSeen === undefined && tau > (F.enterT || 0) + UNSEEN_T && !(C && seenReal(F, tau, C))) { if (drawnNow(F)) { F.gone = t; F.goneT = LATE_T; continue; } land(F); STATS.landed.never++; nextAsFirst(); continue; }   // it never came into view
      if (F.cloudT > CLOUD_T && !(F.stage === 'S3' && tau < (F.revealEnd || 0) + 1)) { F.gone = t; STATS.landed.cloud++; nextAsFirst(); continue; }   // hidden by cloud: let go while it is hidden (birds3d: not S3 before its reveal)
      if (F.backT > BACK_T) { F.gone = t; STATS.landed.words++; nextAsFirst(); }   // carried behind the words by the camera (its birds stepped back): the whole flight let go together, as the live site lets a flight go the words moved onto
    }
  }
  /* forced colours came or went: the sky begins again in the other view */
  function forcedCheck() {
    var f = !!(HOST.forced && HOST.forced().on);
    if (f === FORCED) return;
    FORCED = f; clearAll(); dirty = true;
  }

  /* the window changed shape, or the words moved: the planner's camera is aimed again; a flight the words moved onto
     fades away (never popping), and into a sky left empty the next comes as the first did */
  function relayout() {
    var w0 = W, h0 = H, i, F, gone = 0;
    measure();
    camera();
    if (FORCED) forcedCam();
    if (!flights.length) { if (job) resetJob(); return; }
    if (W !== w0 || Math.abs(H - h0) > 120) { for (i = 0; i < flights.length; i++) if (!flights[i].gone) { flights[i].gone = t; gone++; } }
    else {
      held = 0.5;
      viewPredict(HOST.reduced());
      for (i = flights.length - 1; i >= 0; i--) { F = flights[i]; if (!F.gone && trial(F, t - F.t0) < 0) { F.gone = t; gone++; } }
      held = 1;
    }
    if (gone) { firstNext = true; tNext = Math.min(tNext, t + GONE_T); }
    if (job) resetJob();
  }
  /* the sky begins again (a visit, a reset): every flight gone, the first comes as at the start */
  function clearAll() { STILL.on = false; HOLD.until = -1e9; GVT = -1e9; lastSeenAny = t; clearSky(); while (PLACES.length) landPlace(PLACES[0]); placeDone = {}; job = null; stills = 0; firstNext = true; tNext = t; misses = 0; phase = -1; }

  /* reduced motion: a still sky, a photograph: the flight planned whole, every bird at rest. (round 3) A share of it
     at a time: the engine asks prepare() each frame while its still sky shows, before its one still frame (round 2
     planned it all inside that frame's draw: 49 ms cold at 1440); a draw that finds it unfinished finishes it */
  var STILL = { on: false };
  function stillStep(quota) {
    if (!STILL.on) {
      if (flights.length || BUSY) return true;            // (planned already)
      BUSY = true; forcedCheck(); measure(); camera(); if (FORCED) forcedCam(); stills = 0; BUSY = false;
      if (!frameStep()) return false;
      if (!startJob('still')) return true;
      STILL.on = true;
    }
    /* (round 3, second part) as many of the job's stages a call as its quota of bird-steps allows: a stage a call (a
       path's halves, a trial's slice, a judging, each on a call of its own, as a moving sky's are on steps of their own)
       left a wide still sky unplanned after the engine's 120 calls, and the draw finished it (21 ms at 1440, DUNES s5;
       17-137 ms in the fake world) */
    var w0 = work, F, g;
    for (g = 0; g < STILL_G; g++) {
      F = workJob(quota - (work - w0));
      if (F || !job) planned(F, 'still');
      if (!job) { STILL.on = false; return true; }
      if (work - w0 >= quota || (HOST.budget && HOST.budget() <= 0)) break;   // (and the engine's time for it this frame)
    }
    return false;
  }
  function stillSky() { if (BUSY) return; for (var g = 0; g < 400 && !stillStep(1e9); g++); }
  var BUSY = false;

  /* ---------------- the staging (birds3d): S3 out from behind the cloud tower, S1 the ribbon, S2 the wheel ---------------- */

  /* The owner, of the bigger staging (streams of birds, flocks wheeling round landmarks, gulls coming out from behind the
     cloud tower): "Yes, calmly". Three staged moments (SPEC 6), rare, one at a time, each planned whole before a bird is
     seen, through the camera's course (its heading held: the course is the flight itself), as every flight is:
       S3: a file of gulls (or ibis, geese) keeping pace behind a cloud tower's inner flank, revealed edge by edge as the
           tower slides past (each bird starts wholly behind it, its cover falling once to nothing, never covered again),
           then crossing under the words and out by the far edge;
       S1: a ribbon of far specks low over the sea under the words, weaving (a yaw weave and a rise and fall), curved from
           its first frame, in and out across the side edges;
       S2: a wheel: a loose clump going round a landmark, fixed in the world, coming out of the distance and swept out
           with the land (or away on its tangent before it would come too near).
     The stage clock: the first FIRST_STAGE s after the world shows, then STAGE_GAP after the last one left (stretched as
     the visit goes); when due it looks every STAGE_LOOK s for up to STAGE_LOOK_MAX s, else waits RETRY_STAGE s. While a
     stage is planned nothing else is (the hush); while one is in view the sky takes one flight fewer. */
  var FIRST_STAGE = 40, STAGE_GAP = [110, 180], STAGE_LOOK = 5, STAGE_LOOK_MAX = 60, RETRY_STAGE = 30, HUSH_T = 6;
  var STAGE_W = [['S3', 40], ['S2', 35], ['S1', 25]];
  var REVEAL_CLEAR = 60, RIBBON_CLEAR = 48, WHEEL_GROW = 0.03, STAGE_QUOTA = 400, STAGE_CANDS = 10;
  var S3_N = [[3, 35], [5, 40], [7, 25]], S3_SORT = [['gull', 70], ['ibis', 15], ['goose', 15]], S3_MPS = [4, 6], S3_HEAD = [10, 12];
  var S1_SORT = [['goose', 50], ['ibis', 30], ['gull', 20]], S1_RANK = [1.6, 3.0], S1_ABREAST = [[1, 1], [2, 2], [3, 2], [4, 1]], S1_YAW = [22, 28], S1_LAM = [380, 520], S1_RISE = [11, 16], S1_LAM2 = 260, S1_MPS = [7, 10], S1_N0 = [0.24, 0.32], S1_MAXT = 70;
  var S2_N = [[5, 25], [7, 40], [9, 25], [11, 10]], S2_SORT = [['gull', 50], ['stork', 25], ['ibis', 15], ['crow', 10]], S2_MPS = [9, 12], S2_ARC = [20, 60], S2_LEAD = 25, S2_BANK = 8;   // (S2_LEAD s: the latest a wheel may first be seen after its look)
  var STG = { due: FIRST_STAGE, lookFrom: -1, nextLook: 0, last: null, cur: null, job: null, log: [], force: null, inView: false, n: 0, why: {}, hush: [-1, -1], failT: {} };
  STG.reset = function () { STG.due = FIRST_STAGE; STG.lookFrom = -1; STG.nextLook = 0; STG.last = null; STG.cur = null; STG.job = null; STG.log = []; STG.force = null; STG.inView = false; STG.n = 0; STG.why = {}; STG.hush = [-1, -1]; STG.failT = {}; };
  var FIRST_LEAD_IN = 2;   // s: a flight set off is in view this soon or later (the hush's lead)
  STG.state = function () { return { due: +STG.due.toFixed(1), last: STG.last, cur: STG.cur ? { stage: STG.cur.stage, id: STG.cur.id || STG.cur.key, t0: STG.cur.t0 } : null, job: STG.job ? STG.job.kind : null, log: STG.log.slice(-12), inView: STG.inView, why: STG.why }; };
  /* (dev) a candidate of a kind made and walked, its numbers: why a stage finds no room */
  STG.debug = function (kind) {
    var J = { kind: kind, r: vstream(7777), c: 0 }, out = { kind: kind };
    stageCourse(J); out.cam = { f: cam.f, pitch: Math.atan2(cam.s, cam.c) / DEG, y0: cam.y0, hy: cam.hy }; out.camY = VP.y[0]; out.ground = FL.ok ? HOST.ground(VP.x[0], VP.z[0]) : null; out.floorY = floorY;
    if (kind === 'S1') {
      var F = s1Make(J); out.n0 = F.n0; out.depth = cam.f * MPU / F.n0;
      var ok = s1Path(J, F); out.ok = ok; out.sa = F.sa; out.len = F.len; out.edges = F.edges; out.dur = F.dur;
      if (F.path) { var probe = []; for (var s2 = -2000; s2 <= 2000; s2 += 400) { path3(F, s2, wp); proj(wp.x, wp.y, wp.z, pp); probe.push([s2, +wp.y.toFixed(1), +pp.x.toFixed(0), +pp.y.toFixed(0), +pp.n.toFixed(3), walkAt(F, s2)]); } out.probe = probe; }
    }
    if (kind === 'S3') {
      J.tws = s3Towers(); out.towers = J.tws.map(function (q) { return [Math.round(q.al), Math.round(q.lat), Math.round(q.p.r), Math.round(q.flank), Math.round(q.p.top || 0)]; });
      wayOf(WAY); out.all = TOW.filter(function (p) { return p.kind === 'tower'; }).map(function (p) { return [Math.round((p.x - FL.x) * WAY.fx + (p.z - FL.z) * WAY.fz), Math.round((p.x - FL.x) * WAY.rx + (p.z - FL.z) * WAY.rz), Math.round(p.r), Math.round(p.pass), p.w ? Math.round(p.w) : null]; }); out.speed = FL.speed; out.dmax = cam.f * MPU / 0.44;
      out.tries = [];
      for (var c3 = 0; c3 < 8 && J.tws.length; c3++) {
        J.tw = J.tws[c3 % J.tws.length]; var cd = s3Cand(J), rec = { cand: cd ? { lead: +cd.lead.toFixed(1), kL: cd.kL, qx: Math.round(cd.qx), qy: Math.round(cd.qy), n0: +cd.n0.toFixed(2) } : null };
        if (cd) {
          var iK = Math.min(cd.kL, VP.n - 1), tp = J.tw.p;
          rec.cbCenter = +HOST.cloudBetween(VP.x[iK], VP.y[iK], VP.z[iK], tp.x, VP.y[iK], tp.z).toFixed(1);
          rec.cbTop = +HOST.cloudBetween(VP.x[iK], VP.y[iK], VP.z[iK], tp.x, (tp.base + tp.top) / 2, tp.z).toFixed(1);
          rec.tower = { base: Math.round(tp.base), top: Math.round(tp.top), r: Math.round(tp.r), camY: Math.round(VP.y[iK]) };
        }
        if (cd) { var F3 = s3Make(J, cd); rec.made = !!F3; if (F3) {
          spot(F3, F3.m[0], 0, tmp); airWorldK(F3, tmp.ax, tmp.ay, tmp.az, cd.kL, PW); rec.bird = [Math.round(PW.x - tp.x), Math.round(PW.y), Math.round(PW.z - tp.z)]; rec.cbBird = +HOST.cloudBetween(PW.cx, PW.cy, PW.cz, PW.x, PW.y, PW.z).toFixed(1); J.F = F3; stageTrialInit(J, cd.kL); var r3 = s3Trial(J, 1e9); rec.res = r3; rec.why = J.it.why; rec.k = J.it.k; rec.st = Array.from(J.it.st); rec.cmin = Array.from(J.it.cmin).map(function (v) { return +v.toFixed(2); }); rec.rx = J.it.rx; rec.sort = F3.sort; rec.n = F3.m.length; } }
        out.tries.push(rec);
      }
    }
    if (kind === 'S2w') {   // (dev: the stage's own course, one look run whole)
      STG.force = 'S2'; STG.why = {}; var okS = stageStart(), J2 = STG.job, ks = [];
      if (okS && J2) { var w1 = work; while (STG.job === J2 && work - w1 < 1e7) { if (J2.F && J2.it) ks.push([J2.c, J2.it.k, J2.it.k0, VP.n, J2.mk && J2.mk.p.kind]); stageWork(500); } }
      out.ok = okS; out.log = STG.log.slice(-2); out.why = STG.why; out.ks = ks.slice(0, 40); out.VPn = VP.n; return out;
    }
    if (kind === 'S2') {
      J.mks = s2Marks(); out.marks = J.mks.map(function (q) { return [q.p.kind, Math.round(q.al), Math.round(q.lat), Math.round(q.p.r), Math.round(q.p.top || q.p.y)]; });
      J.mk = J.mks[0];
      if (J.mk) {
        var P = s2Make(J); out.P = P ? { cx: P.cx, cy: P.cy, cz: P.cz, R: P.R, n: P.m.length } : null;
        if (P) { var rows = []; for (var k = 0; k < 300; k += 10) { viewNeed(k + 1); if (k >= VP.n) break; wheelSpot(P, P.m[0], k * STEP, wq); worldOnK(wq.x, wq.y, wq.z, k, pv); rows.push([k, +pv.x.toFixed(0), +pv.y.toFixed(0), +pv.n.toFixed(3)]); } out.rows = rows; out.VPn = VP.n;
          J.F = P; stageTrialInit(J, Math.round(1 / STEP)); var res = s2Trial(J, 1e9); if (res < 0 && J.it.redo) { stageTrialInit(J, J.it.k0); res = s2Trial(J, 1e9); }
          out.trial = { res: res, why: J.it.why, k: J.it.k, enter: J.it.enter, last: J.it.last, near: J.it.near, g98: J.it.g98, tx: P.m[0].tx }; }
      }
    }
    return out;
  };
  STG.dev = function (o) {
    if (o && o.debug) return STG.debug(o.debug);
    if (o && o.force) { STG.force = o.force; STG.film = !!o.film; if (o.now !== false) { STG.due = Math.min(STG.due, t); STG.nextLook = t; STG.lookFrom = -1; } }   // (film, dev: a wheel already in the sky at the film's first frame, as S4's, near the camera's way: for a film with the camera slowed, SIMULATED)
    if (o && o.off) { STG.due = 1e9; }
    return STG.state();
  };
  function stageWhy(k) { STG.why[k] = (STG.why[k] || 0) + 1; }
  function pickW(r, list) { return weighted(r, list); }
  /* the stage's own fade for far specks and a far wheel (a travelling flight's: FAR 0.42 .. FADE 0.54) */
  function stageFade(F, n) { var a = F.fadeS; return n >= a[1] ? 1 : n <= a[0] ? 0 : ease((n - a[0]) / (a[1] - a[0])); }

  /* the course from now, and the still view as the stage sets off: the planner's own (viewPredict, camera) */
  function stageCourse(J) {
    viewPredict(false);
    camera(VP.pitch[0]);
    J.yaw = VP.yaw[0]; J.t = t;
  }
  /* the camera's way (level), its right, and where a world point lies along and beside it */
  function wayOf(o) { var fx = Math.sin(FL.psi), fz = Math.cos(FL.psi); o.fx = fx; o.fz = fz; o.rx = -fz; o.rz = fx; return o; }
  var WAY = {};
  /* a point of the world (m) through the course's camera at sample k: on the window (CSS px) and its nearness */
  var SGF = { yaw: 0, cyw: 1, syw: 0 };
  function worldOnK(x, y, z, k, o) {
    var i = VP.still ? 0 : Math.min(Math.max(k, 0), VP.n - 1);
    setYaw(SGF, VP.yaw[i]); viewAtK(SGF, k);
    var dx = (x - VP.x[i]) / MPU, dy = (y - VP.y[i]) / MPU, dz = (z - VP.z[i]) / MPU, c = SGF.cyw, s = SGF.syw;
    return projV(-c * dx + s * dz, dy, s * dx + c * dz, o);
  }
  /* the cover of the clouds between the camera at sample k and a world point (0 .. 1) */
  function coverK(x, y, z, k) {
    var i = VP.still ? 0 : Math.min(Math.max(k, 0), VP.n - 1);
    work += 4;
    return FX.cloud ? ease(HOST.cloudBetween(VP.x[i], VP.y[i], VP.z[i], x, y, z) / CLOUD_IN) : 0;
  }
  /* a box (centre, half-extents) against the words: the stack's margin (m0: WORDS, or more), the links' (LINKS) */
  function clearStage(x, y, hw, hh, m0, sx, sy) {
    for (var i = 0, o, m; i < words.length; i++) {
      o = words[i]; m = i === 0 ? Math.max(o.m, m0 || 0) : o.m;
      if (x + hw > o.l - m - sx && x - hw < o.r + m + sx && y + hh > o.t - m - sy && y - hh < o.b + m + sy) return false;
    }
    return true;
  }
  function gapWords(x, y, hw, hh) {
    var g = 1e9;
    for (var i = 0; i < words.length; i++) { var o = words[i], dx = Math.max(o.l - x - hw, x - hw - o.r, 0), dy = Math.max(o.t - y - hh, y - hh - o.b, 0); g = Math.min(g, Math.sqrt(dx * dx + dy * dy)); }
    return g;
  }
  /* a travelling flight of a forced kind (the stage's own weights), made by the planner's own newFlight */
  function stageFlight(kind, n, dir, r, sortW) {
    var keep = SORT_OF[kind]; SORT_OF[kind] = sortW;
    var F = null; try { F = newFlight(kind, n, dir, r, false, false, false); } finally { SORT_OF[kind] = keep; }
    return F;
  }

  /* ---- S3: out from behind the cloud tower ---- */
  var TOW = [], S3_LEAD = [2, 22];
  function s3Towers() {
    var out = [], i, p, al, lat, fl, spd = Math.max(6, FL.speed || 12), dmax = cam.f * MPU / 0.44;
    if (!HOST.pois) return out;
    HOST.pois(1400, TOW); wayOf(WAY);
    for (i = 0; i < TOW.length; i++) {
      p = TOW[i]; if (p.kind !== 'tower' || !(p.r > 0)) continue;
      al = (p.x - FL.x) * WAY.fx + (p.z - FL.z) * WAY.fz; lat = (p.x - FL.x) * WAY.rx + (p.z - FL.z) * WAY.rz; fl = Math.abs(lat) - p.r;
      if (fl < 25 || fl > (W < 600 ? 140 : 190)) continue;
      if (al - p.r < 60 || (al - 0.8 * dmax) / spd > S3_LEAD[1]) continue;   // (near enough that its flank will hide a file within S3_LEAD s)
      out.push({ p: p, al: al, lat: lat, flank: fl });
    }
    out.sort(function (a, b) { return a.al - b.al; });
    return out;
  }
  /* a candidate: the lead (s) until the tower stands where the file can hide behind its flank at its distance; the
     birds' height (under the words where the floor lets them, else just over the horizon, beside the words); a window
     point inside the flank; its heading after the reveal (across under the words, or angling away into the distance) */
  function s3Cand(J) {
    var r = J.r, T = J.tw, p = T.p, d = W < 600, n0 = pick(r, d ? [0.5, 0.62] : [0.4, 0.55]), depth = cam.f * MPU / n0;
    /* the lead: the tower's centre a little nearer than the birds (they are behind its body, just inside its flank) */
    var spd = Math.max(6, FL.speed || 12), lead = (T.al - (0.92 * depth - mix(r(), 0.1, 0.5) * p.r)) / spd;
    if (lead < S3_LEAD[0] || lead > S3_LEAD[1] + 4) { stageWhy('s3.lead'); return null; }
    var kL = Math.round(lead / STEP); viewNeed(kL + 4); if (kL >= VP.n - 4) return null;
    var i = Math.min(kL, VP.n - 1), cy = VP.y[i], side = T.lat > 0 ? 1 : -1;   // (+: the tower right of the way)
    /* the birds behind the body's lower part (the world lifts a cloud's body whole over the flight band: its lobes stand
       where they stand), over the floor; under the words where that is below the eye, else above the horizon */
    var by = p.base + mix(r(), 0.12, 0.35) * Math.max(20, p.top - p.base), fx0 = VP.x[i] + WAY.fx * depth, fz0 = VP.z[i] + WAY.fz * depth, gnd = FL.ok ? HOST.ground(fx0, fz0) : -1e4;
    by = Math.max(by, gnd + FLOOR_T + 15);
    var dep = Math.atan2(cy - by, depth), low = dep > 0;
    var pitch = Math.atan2(cam.s, cam.c), qy = cam.y0 + cam.f * Math.tan(pitch + dep);
    var fr = mix(r(), 0.5, 0.82), fx = p.x - side * p.r * fr * WAY.rx, fz = p.z - side * p.r * fr * WAY.rz;
    worldOnK(fx, by, fz, kL, pv); if (!(pv.n > 0)) return null;
    var qx = pv.x;
    if (qx < -40 || qx > W + 40) return null;
    /* the way out: low, across under the words to the far edge; high, angling away (into the distance, or out by the near edge) */
    var u = r(), hd, dir;
    if (low) { hd = pick(r, S3_HEAD) * DEG; dir = -side; }
    else if (u < 0.6) { hd = pick(r, [35, 60]) * DEG; dir = -side; }
    else { hd = pick(r, [25, 45]) * DEG; dir = side; }
    return { n0: n0, lead: lead, kL: kL, qx: qx, qy: qy, dir: dir, side: side, dep: dep, low: low, hd: hd };
  }
  function s3Make(J, c) {
    var r = J.r, n = pickW(r, S3_N), F = stageFlight('line', n, c.dir, r, S3_SORT);
    if (!F) { stageWhy('s3.flight'); return null; }
    setYaw(F, J.yaw); F.n00 = F.n0 = c.n0; F.stage = 'S3'; F.dir = c.dir; F.fadeS = [0.3, 0.38];
    var mps = pick(r, S3_MPS); F.vw = F.v = mps / MPU; F.vPx = F.v * F.n0;
    if (!pathThrough(F, c.qx, c.qy, c.hd, 0, c.low ? 0 : pick(r, [0, 4]) * DEG)) { stageWhy('s3.path'); return null; }
    if (!paced(F)) { stageWhy('s3.paced'); return null; }
    F.v = Math.min(F.v, mps / MPU); F.q = Math.min(F.q, 1);
    var lap = 0; F.m.forEach(function (m) { lap = Math.max(lap, Math.max(m.lag, m.lx || 0) + (m.stragL || 0) + F.span); });
    F.s0 = -F.sa; F.lap = lap; F.dur = (F.len + lap - F.s0) / F.v; F.from = 0;
    F.ev0 = 1e9;   // (no gathering: a file revealed as it is)
    F.m.forEach(function (m) { m.gT = 0; m.stragL = 0; m.swapT = 0; });
    return F;
  }
  /* the S3 trial: from the lead's sample to the end; each bird hidden at its first frame, its cover falling once to
     nothing (never peeking out and back), revealed REVEAL_CLEAR from the words, never covered again; clear of the
     words, the edges it does not cross, near, calm */
  function s3Trial(J, budget) {
    var F = J.F, it = J.it, w0 = work, M = F.m, i, m, tau, k, c, hw, hh;
    for (;;) {
      if (work - w0 >= budget) return 0;
      k = it.k0 + it.k; tau = it.k * STEP;
      if (tau > F.dur + 2 || k >= VP.n - 1 && VP.n >= VP_N) { it.end = tau; break; }
      viewNeed(k + 1); if (k >= VP.n) { it.end = tau; break; }
      viewAtK(F, k);
      if (tau >= 0 && !steady(F, tau)) return stageFail(it, 'calm');
      var any = false;
      for (i = 0; i < M.length; i++) {
        m = M[i]; spot(F, m, tau, tmp); projV(tmp.ax, tmp.ay, tmp.az, pv);
        if (!(pv.n > 0)) { if (it.st[i] === 2) it.st[i] = 3; continue; }
        hw = m.d.hw * pv.n; hh = (m.d.hh + BOB * m.d.span) * pv.n;
        if (fadeFor(F, pv.n) < 0.02 || !inView(pv.x, pv.y, hw, hh)) { if (it.st[i] === 2) it.st[i] = 3; continue; }
        any = true;
        if (pv.n > NEAR_MAX) return stageFail(it, 'near');
        if (!clearStage(pv.x, pv.y, hw, hh, 0, 2, 2)) return stageFail(it, 'words');
        if (!withinEdges(pv.x, pv.y, hw, hh, F.edges | 3)) return stageFail(it, 'edge');
        it.near = Math.min(it.near, gapWords(pv.x, pv.y, hw, hh));
        it.yLo = Math.min(it.yLo, pv.y - hh); it.yHi = Math.max(it.yHi, pv.y + hh); it.xLo = Math.min(it.xLo, pv.x - hw); it.xHi = Math.max(it.xHi, pv.x + hw);
        if (it.st[i] === 3) return stageFail(it, 'back');   // (in view again after it left: no)
        if (it.st[i] < 2 || it.k % 3 === 0) {
          airWorldK(F, tmp.ax, tmp.ay, tmp.az, k, PW);
          c = coverK(PW.x, PW.y, PW.z, k);
          if (it.st[i] === 0) { if (c < 0.95) return stageFail(it, 'shown'); it.st[i] = 1; it.cmin[i] = c; }
          else if (it.st[i] === 1) {
            if (c > it.cmin[i] + 0.05) return stageFail(it, 'peek');
            it.cmin[i] = Math.min(it.cmin[i], c);
            if (c < 0.5 && it.rv[i] < 0) { it.rv[i] = tau; if (gapWords(pv.x, pv.y, hw, hh) < REVEAL_CLEAR) return stageFail(it, 'reveal'); it.rx.push(+pv.x.toFixed(1), +pv.y.toFixed(1)); }
            if (c <= 0.05) { it.st[i] = 2; it.re[i] = tau; if (it.rv[i] < 0) it.rv[i] = tau; }
          } else if (c > 0.2) return stageFail(it, 'recover');
        }
      }
      if (any) { if (it.enter < -1e8) it.enter = tau; it.last = tau; }
      else if (it.enter > -1e8 && tau - it.last > LEAVE_T) { it.end = tau; break; }
      it.k++;
    }
    for (i = 0; i < M.length; i++) if (it.st[i] < 2) return stageFail(it, 'unrevealed');
    return 1;
  }
  function stageFail(it, why) { it.why = why; stageWhy('s3.' + why); return -1; }

  /* ---- S1: the ribbon ---- */
  /* a weaving path: its heading weaves about across the window by +-yaw (wavelength lam), its height rises and falls
     by +-rise (wavelength lam2), all in air units; sampled at ds and integrated (path3 reads it) */
  function weavePath(F, x0, y0, z0, h0, yaw, lam, rise, lam2, ph1, ph2, S) {
    var ds = 4, n = Math.ceil(2 * S / ds) + 1, tab = new Float64Array(4 * n), i, s, h, x = 0, z = 0, xs, zs;
    /* integrate from -S to S, then shift so s = 0 is at (x0, z0) */
    var hs = function (s) { return h0 + yaw * Math.sin(TAU * s / lam + ph1); };
    for (i = 0; i < n; i++) {
      s = -S + i * ds; h = hs(s);
      if (i) { var hm = hs(s - ds / 2); x += ds * Math.cos(hm); z += ds * Math.sin(hm); }
      tab[4 * i] = x; tab[4 * i + 1] = z; tab[4 * i + 2] = h; tab[4 * i + 3] = rise * Math.sin(TAU * s / lam2 + ph2);
    }
    var i0 = Math.round(S / ds); xs = tab[4 * i0]; zs = tab[4 * i0 + 1]; var ys = tab[4 * i0 + 3];
    for (i = 0; i < n; i++) { tab[4 * i] += x0 - xs; tab[4 * i + 1] += z0 - zs; tab[4 * i + 3] += y0 - ys; }
    F.path = { tab: tab, ds: ds, S: S, n: n, x: x0, y: y0, z: z0, h: h0, k: 0, s1: 0, s2: 0, g: 0, sp: null };
  }
  function path3tab(P, s, o) {
    var f = (s + P.S) / P.ds, i = Math.floor(f), a, T = P.tab;
    if (i < 0) { i = 0; a = f; } else if (i >= P.n - 1) { i = P.n - 2; a = f - i; } else a = f - i;
    var j = 4 * i, k = j + 4;
    o.x = T[j] + (T[k] - T[j]) * a; o.z = T[j + 1] + (T[k + 1] - T[j + 1]) * a; o.h = T[j + 2] + (T[k + 2] - T[j + 2]) * a; o.y = T[j + 3] + (T[k + 3] - T[j + 3]) * a;
    if (f < 0 || f > P.n - 1) { var e = f < 0 ? f * P.ds : (f - (P.n - 1)) * P.ds; o.x = (f < 0 ? T[0] : T[4 * (P.n - 1)]) + e * Math.cos(o.h); o.z = (f < 0 ? T[1] : T[4 * (P.n - 1) + 1]) + e * Math.sin(o.h); o.y = f < 0 ? T[3] : T[4 * (P.n - 1) + 3]; }
    return o;
  }
  function s1Count() { return W >= 1024 ? [24, 36] : W >= 700 ? [18, 28] : [12, 20]; }
  function s1Make(J) {
    var r = J.r, c = s1Count(), n = Math.round(pick(r, c)), sort = pickW(r, S1_SORT), S = SORTS[sort], dir = r() < faithful ? season : -season;
    var F = { kind: 'ribbon', stage: 'S1', sort: sort, S: S, n: n, dir: dir, r: r, soar: null, m: [], path: null, w: null, q: 1, inS: 0, flat: 1, calm: false, still: false, loose: 1,
      t0: 0, s0: 0, sa: 0, len: 0, dur: 0, edges: 3, ev0: 1e9, from: 0, loosen: false, latFirst: false, n0: pick(r, S1_N0),
      wKey: Math.floor(r() * NOISE_N), wLam: 400, wAmp: 0, hKey: Math.floor(r() * NOISE_N), hT: 12, hAmp: 0, fadeS: [0.12, 0.16] };
    F.n00 = F.n0; setYaw(F, J.yaw);
    F.span = SPAN * view * S.size; F.f = pick(r, S.hz) * tempo; F.air = 1;
    F.flaps = S.flaps ? [[2, 4], [2.5, 5.5]] : null;   // (gliding at least 70 % of the time: a few beats, long glides)
    var mps = pick(r, S1_MPS); F.vw = F.v = mps / MPU; F.vPx = F.v * F.n0;
    /* the ranks: 1-4 abreast, 1.6-3 spans apart, each speck up to 1.4 spans aside and 1 up or down, drifting 0.12 */
    var lag = 0, k = 0, rank = 0, M = [];
    while (k < n) {
      var ab = Math.min(n - k, pickW(r, S1_ABREAST)), j;
      for (j = 0; j < ab; j++, k++) {
        var m = member(F, lag, (j - (ab - 1) / 2) * 1.1 * F.span + (r() * 2 - 1) * 0.3 * F.span, rank);
        m.lat = clamp(m.lat, -1.4 * F.span * Math.max(1, ab / 2), 1.4 * F.span * Math.max(1, ab / 2)); m.up = (r() * 2 - 1) * F.span;
        m.aL = 0.12 * F.span; m.aP = 0.12 * F.span; m.gain = 1;
        M.push(m);
      }
      lag += pick(r, S1_RANK) * F.span * (1 + 0.25 * (r() * 2 - 1)); rank++;
    }
    F.m = M; F.d = M[0].d; F.probe = [0, M.length - 1]; F.lap = lag + F.span;
    unlock(F);
    return F;
  }
  /* the ribbon's path: the leader across the window, low under the words, weaving, at its distance */
  function s1Path(J, F) {
    var r = J.r, d = W < 600, dep = pick(r, d ? [9, 13] : [6, 12]) * DEG, depth = cam.f * MPU / F.n0, room = (FL.ok ? (VP.y[0] - HOST.ground(VP.x[0], VP.z[0])) : 100) - FLOOR_T - 18;
    if (depth * Math.tan(dep) > room) dep = Math.atan(Math.max(0, room) / depth);
    if (dep < (d ? 7 : 4) * DEG) return false;
    var qy = cam.y0 + cam.f * Math.tan(Math.atan2(cam.s, cam.c) + dep), qx = W * mix(r(), 0.3, 0.7);
    unproj(qx, qy, F.n0, wp);
    var yaw = pick(r, S1_YAW) * DEG, lam = pick(r, S1_LAM) / MPU, rise = pick(r, S1_RISE) / MPU, lam2 = S1_LAM2 / MPU, S = 2.4 * W / F.n0 + 2 * F.lap;
    weavePath(F, wp.x, wp.y, wp.z, F.dir > 0 ? 0 : Math.PI, yaw, lam, rise, lam2, TAU * r(), TAU * r(), S);
    var sOut = walk(F, 1); if (sOut === null) return false;
    var sIn = walk(F, -1); if (sIn === null) return false;
    F.sa = sIn; F.len = sOut - sIn; F.edges = endEdge(F, sIn) | endEdge(F, sOut);
    if (F.edges & 12 && !(F.edges & 3)) return false;
    /* the time across: at most S1_MAXT s (a quicker pace within its calm, else not this one) */
    var across = (F.len + F.lap) / F.v;
    if (across > S1_MAXT + 8) { F.v *= across / (S1_MAXT + 8); if (F.v * MPU > 1.15 * S1_MPS[1]) return false; }
    F.s0 = 0; F.dur = (F.len + F.lap) / F.v;
    return true;
  }
  /* the S1 trial: every speck clear of the stack by RIBBON_CLEAR and of the links by LINKS, inside the top and bottom
     edges, never on another of its ranks on the window, over the floor; its whole crossing at most S1_MAXT s */
  function s1Trial(J, budget) {
    var F = J.F, it = J.it, w0 = work, M = F.m, i, j, m, tau, k, hw, hh, cnt = it.probe ? F.probe.length : M.length;
    for (;;) {
      if (work - w0 >= budget) return 0;
      k = it.k0 + it.k; tau = it.k * STEP;
      if (tau > F.dur + 2) { it.end = tau; break; }
      viewNeed(k + 1); if (k >= VP.n) { it.end = tau; break; }
      viewAtK(F, k);
      var any = false;
      for (i = 0; i < cnt; i++) {
        m = M[it.probe ? F.probe[i] : i]; it.bx[4 * i] = NaN;
        spot(F, m, tau, tmp); projV(tmp.ax, tmp.ay, tmp.az, pv);
        if (!(pv.n > 0) || stageFade(F, pv.n) < 0.02) continue;
        hw = m.d.hw * pv.n; hh = (m.d.hh + BOB * m.d.span) * pv.n;
        if (!inView(pv.x, pv.y, hw, hh)) continue;
        if (tau < 0.5 && it.k === 0) return stageFail(it, 'r.pop');
        any = true;
        if (!clearStage(pv.x, pv.y, hw, hh, RIBBON_CLEAR, 2, 2)) return stageFail(it, 'r.words');
        if (!withinEdges(pv.x, pv.y, hw, hh, F.edges | 3)) return stageFail(it, 'r.edge');
        it.near = Math.min(it.near, gapWords(pv.x, pv.y, hw, hh));
        it.yLo = Math.min(it.yLo, pv.y - hh); it.yHi = Math.max(it.yHi, pv.y + hh); it.xLo = Math.min(it.xLo, pv.x - hw); it.xHi = Math.max(it.xHi, pv.x + hw);
        it.bx[4 * i] = pv.x; it.bx[4 * i + 1] = pv.y; it.bx[4 * i + 2] = hw; it.bx[4 * i + 3] = hh;
        if (it.k % 4 === 0 && (i === 0 || i === cnt - 1)) {   // (over the floor: the sea of cloud or the land under it)
          airWorldK(F, tmp.ax, tmp.ay, tmp.az, k, PW); work += 2;
          if (FL.ok && PW.y - HOST.ground(PW.x, PW.z) < FLOOR_T) return stageFail(it, 'r.floor');
        }
      }
      if (!it.probe) for (i = 0; i < cnt; i++) {   // (each speck against its 8 rank-neighbours on the window)
        if (it.bx[4 * i] !== it.bx[4 * i]) continue;
        for (j = i + 1; j < Math.min(cnt, i + 9); j++) {
          if (it.bx[4 * j] !== it.bx[4 * j]) continue;
          var g = Math.max(Math.abs(it.bx[4 * i] - it.bx[4 * j]) - it.bx[4 * i + 2] - it.bx[4 * j + 2], Math.abs(it.bx[4 * i + 1] - it.bx[4 * j + 1]) - it.bx[4 * i + 3] - it.bx[4 * j + 3]);
          if (g < SPACE_SEEN - 1.5) return stageFail(it, 'r.space');
        }
      }
      if (any) { if (it.enter < -1e8) it.enter = tau; it.last = tau; }
      else if (it.enter > -1e8 && tau - it.last > LEAVE_T) { it.end = tau; break; }
      it.k++;
    }
    if (it.enter < -1e8) return stageFail(it, 'r.never');
    if (it.last - it.enter > S1_MAXT + 6) return stageFail(it, 'r.long');
    return 1;
  }

  /* ---- S2: the wheel ---- */
  var LMK = [];
  function s2Marks() {
    var out = [], i, p, al, lat, d = W < 600, ck = FL.camk > 0 && FL.camk < 1 ? FL.camk : 1;   // (ck: the world's dev pace for a film; its distances in the camera's seconds, so a wheel looms no faster)
    if (!HOST.pois) return out;
    HOST.pois(1500, LMK); wayOf(WAY);
    for (i = 0; i < LMK.length; i++) {
      p = LMK[i]; if (p.kind === 'canyon') continue;
      al = (p.x - FL.x) * WAY.fx + (p.z - FL.z) * WAY.fz; lat = (p.x - FL.x) * WAY.rx + (p.z - FL.z) * WAY.rz;
      if (STG.film) { if (al < 150 || al > 360 || (!d && Math.abs(lat) < 40)) continue; }   // (dev film: near, already in view)
      else if (al < (d ? 600 : 750) * ck || al > 1450 * ck) continue;   // (far enough that its birds come out of the distance: the place's fade)
      if (!d && !STG.film && Math.abs(lat) < 200 * ck) continue;             // (the desk's: beside, at least 200 m off the way)
      if (d && (STG.film ? Math.abs(lat) > 90 : p.kind !== 'tower' && p.kind !== 'island' || Math.abs(lat) > 160)) continue;   // (dev film: any landmark near its way)   // (the phone's: below, a small tower's waist or an island's stem)
      out.push({ p: p, al: al, lat: lat });
    }
    out.sort(function (a, b) { return a.al - b.al; });
    return out;
  }
  function s2Make(J) {
    var c2 = skyCls(), r = J.r, L = J.mk, p = L.p, d = W < 600, n = pickW(r, S2_N), sort = pickW(r, c2 === 'moon' || c2 === 'first' ? [['gull', 1]] : c2 === 'glow' || c2 === 'blue' ? [['gull', 55], ['ibis', 20], ['crow', 25]] : S2_SORT), S = SORTS[sort], i, m;   // (fix: at dusk no stork, at night no crow: they roost)
    if (n > freeSlots()) n = freeSlots() >= 5 ? (freeSlots() % 2 ? freeSlots() : freeSlots() - 1) : 0;
    if (n < 5) return null;
    var eye = FL.y || 0, R, cy;
    if (!d) { R = Math.max(mix(r(), 40, 60), Math.min(p.r + 25, 160)); cy = clamp((p.top || p.y) + 10, eye + 20, eye + 60); }
    else { R = Math.min(p.r, 80) + mix(r(), 30, 40); cy = eye - mix(r(), 50, 90); }
    var v = pick(r, S2_MPS), sense = r() < 0.5 ? 1 : -1, arc = pick(r, S2_ARC) * DEG, th0 = TAU * r();
    R = Math.max(30, Math.min(R, v * v / (9.81 * Math.tan(S2_BANK * DEG))));   // (round 2: the bank physical and at least S2_BANK, SPEC 6.4's 8-20 deg: round a big landmark the ring was 160 m and banked 3 deg; now it circles over it)
    var P = { place: true, kind: 'wheel', stage: 'S2', sort: sort, S: S, n: n, key: (p.id || 1) * 7 + 13, cx: p.x, cy: cy, cz: p.z, base: cy, up: 0, t0: 0, m: [], dur: 1e9, r: r, fadeS: [0.16, 0.26], R: R, v: v, mark: p.kind };
    var f = pick(r, S.hz) * tempo;
    for (i = 0; i < n; i++) {
      m = { d: measureBird3D(drawBird(r, S), sort, SPAN * view * S.size * (1 + SIZE_VAR * (r() * 2 - 1))), R: R * mix(r(), 0.94, 1.06), th0: th0 + sense * arc * (i / Math.max(1, n - 1) - 0.5) + (r() - 0.5) * 0.15 * arc / n,
            dy: (r() * 2 - 1) * mix(r(), 3, 6), f: f * (1 + DETUNE * (r() * 2 - 1)), delay: 0, half: r(), rest: r(), glide: pick(r, S.glide), n: 1, s: null, lag: 0, lat: 0, bR: TAU * r(), bY: TAU * r(), tx: 1e9 };
      m.om = sense * v / m.R;
      m.w = placeWing(sort, r); m.f = m.w.f;   // (physics: the lab's measured wing)
      P.m.push(m);
    }
    return P;
  }
  /* a wheel's bird at its time: round the ring (its radius breathing +-6 %, its height +-dy), or away on its tangent */
  function wheelSpot(P, m, tau, o) {
    var tt = Math.min(tau, m.tx), th = m.th0 + m.om * tt, R = m.R * (1 + 0.06 * Math.sin(0.11 * tt + m.bR));
    o.x = P.cx + R * Math.cos(th); o.z = P.cz + R * Math.sin(th);
    o.y = P.cy + m.dy * Math.sin(0.17 * tt + m.bY);
    if (tau > m.tx) {   // (the tangent at tx, gliding a little downhill: the turn's bank comes off as it straightens)
      var e = tau - m.tx, v = Math.abs(m.om) * m.R, tth = th + (m.om > 0 ? 1 : -1) * Math.PI / 2;
      o.x += v * e * Math.cos(tth); o.z += v * e * Math.sin(tth); o.y -= v * e * Math.tan(3 * DEG);
    }
    return o;
  }
  /* the S2 trial: through the course, every bird where it is seen (its place's fade) clear of the words from its first
     faint frame, its own looming (the camera held still) under WHEEL_GROW at the 98th percentile, its own pace under
     the window's top speed, never nearer than NEAR_MAX (else away on the tangent 1.5 laps before) */
  var S2BX = new Float64Array(4 * MAXP);
  function s2Trial(J, budget) {
    var P = J.F, it = J.it, w0 = work, M = P.m, i, m, tau, k, hw, hh, n1;
    for (;;) {
      if (work - w0 >= budget) return 0;
      k = it.k0 + it.k; tau = it.k * STEP;
      viewNeed(k + 2);   // (the course out past this sample: k + 1 left the trial ending at the first chunk's end, never seeing a wheel)
      if (k >= VP.n - 2 || tau > 150) { it.end = tau; break; }
      var any = false, nb2 = 0;
      for (i = 0; i < M.length; i++) {
        m = M[i]; wheelSpot(P, m, tau, wq); worldOnK(wq.x, wq.y, wq.z, k, pv); work += 3;
        if (!(pv.n > 0)) continue;
        var a = stageFade(P, pv.n); if (a < 0.02) continue;
        hw = m.d.hw * pv.n; hh = (m.d.hh + BOB * m.d.span) * pv.n;
        if (!inView(pv.x, pv.y, hw, hh)) continue;
        /* (fix round) two of its birds never on top of one another on the window (round 2's wheel had no spacing check:
           its specks overlapped by up to 94 %) */
        var hp2 = (m.d.halo || 0) * pv.n;
        for (var q2 = 0; q2 < nb2; q2++) if (Math.max(Math.abs(pv.x - S2BX[4 * q2]) - (hw - hp2) - S2BX[4 * q2 + 2], Math.abs(pv.y - S2BX[4 * q2 + 1]) - (hh - hp2) - S2BX[4 * q2 + 3]) < SPACE_SEEN) return stageFail(it, 'w.space');
        S2BX[4 * nb2] = pv.x; S2BX[4 * nb2 + 1] = pv.y; S2BX[4 * nb2 + 2] = hw - hp2; S2BX[4 * nb2 + 3] = hh - hp2; nb2++;
        if (it.k === 0 && !STG.film) return stageFail(it, 'w.pop');
        any = true;
        if (pv.n > NEAR_MAX - 0.1 && m.tx > 1e8) {   // (it would come too near: away on its tangent 1.5 laps before, if it can; then the trial again)
          var lapT = TAU / Math.abs(m.om), tx = Math.max(2, tau - 1.5 * lapT);
          for (var q = 0; q < M.length; q++) M[q].tx = tx + 0.4 * q;
          it.redo = true; return stageFail(it, 'w.near');
        }
        if (pv.n > NEAR_MAX) return stageFail(it, 'w.near2');
        if (!clearStage(pv.x, pv.y, hw, hh, 0, 2, 2)) return stageFail(it, 'w.words');
        it.near = Math.min(it.near, gapWords(pv.x, pv.y, hw, hh));
        it.yLo = Math.min(it.yLo, pv.y - hh); it.yHi = Math.max(it.yHi, pv.y + hh); it.xLo = Math.min(it.xLo, pv.x - hw); it.xHi = Math.max(it.xHi, pv.x + hw);
        /* its own motion, the camera held still (this sample's): looming and pace */
        var x1 = pv.x, y1 = pv.y; n1 = pv.n;
        wheelSpot(P, m, tau + 0.5, wa3); worldOnK(wa3.x, wa3.y, wa3.z, k, pv2);
        if (pv2.n > 0 && a > 0.3) {
          it.grow.push(Math.log(pv2.n / n1) / 0.5);
          var sp = Math.sqrt((pv2.x - x1) * (pv2.x - x1) + (pv2.y - y1) * (pv2.y - y1)) / 0.5;
          if (sp > 1.18 * topSpeed()) return stageFail(it, 'w.pace');
        }
      }
      if (any) { if (it.enter < -1e8) it.enter = tau; it.last = tau; }
      else if (it.enter > -1e8 && tau - it.last > LEAVE_T) { it.end = tau; break; }
      else if (it.enter < -1e8 && tau > S2_LEAD) return stageFail(it, 'w.late');   // (the course is a forecast: a wheel first seen a minute on was, in the films, never seen at all)
      it.k++;
    }
    if (it.enter < -1e8) return stageFail(it, 'w.never');
    if (it.last - it.enter < 6) return stageFail(it, 'w.short');
    if (it.grow.length) { var g = it.grow.slice().sort(function (a, b) { return a - b; }), p98 = g[Math.min(g.length - 1, Math.floor(0.98 * g.length))]; if (p98 > WHEEL_GROW) return stageFail(it, 'w.grow'); it.g98 = p98; }
    return 1;
  }

  /* ---- the stage clock and its job ---- */
  function stageTrialInit(J, k0) { var n = J.F.m.length; J.it = { k: 0, k0: k0, near: 1e9, yLo: 1e9, yHi: -1e9, xLo: 1e9, xHi: -1e9, enter: -1e9, last: -1e9, end: 0, why: '', st: new Int8Array(n), cmin: new Float64Array(n), rv: new Float64Array(n).fill(-1), re: new Float64Array(n).fill(-1), rx: [], bx: new Float64Array(4 * n), grow: [], probe: J.kind === 'S1' }; }
  function stageFeasible(kind) {
    if (kind === 'S3') return s3Towers().length > 0;
    if (kind === 'S2') return s2Marks().length > 0;
    if (kind === 'S1') return W >= 360;
    return false;
  }
  function stageStart() {
    var r = vstream(5000 + (STG.n++)), kinds = [], i, k;
    for (i = 0; i < STAGE_W.length; i++) { k = STAGE_W[i][0]; if ((STG.force ? k === STG.force : true) && stageFeasible(k)) kinds.push(STAGE_W[i]); }
    var fresh = kinds.filter(function (q) { return !(STG.failT[q[0]] > t - STAGE_LOOK_MAX); });   // (a kind that found no room this last minute steps aside while another can look)
    if (fresh.length) kinds = fresh;
    if (kinds.length > 1 && STG.last) kinds = kinds.filter(function (q) { return q[0] !== STG.last; });
    if (!kinds.length) { stageWhy('none'); return false; }
    var kind = pickW(r, kinds), J = { kind: kind, r: r, c: 0, best: null, bestSc: -1e9, F: null, it: null };
    stageCourse(J);
    if (kind === 'S3') { J.tws = s3Towers(); J.tw = J.tws[0]; if (!J.tw) return false; }
    if (kind === 'S2') { J.mks = s2Marks(); J.mk = J.mks[0]; if (!J.mk) return false; }
    STG.job = J;
    return true;
  }
  /* a candidate made and its trial begun; true while there is one */
  function stageNext(J) {
    var F = null, c, tries = 0;
    while (!F && J.c < STAGE_CANDS && tries++ < 4) {
      J.c++;
      if (J.kind === 'S3') { J.tw = J.tws[(J.c - 1) % J.tws.length]; c = s3Cand(J); if (c) { F = s3Make(J, c); if (F) { F.cand = c; J.F = F; stageTrialInit(J, c.kL); } } else stageWhy('s3.cand'); }
      else if (J.kind === 'S1') { F = s1Make(J); if (F && s1Path(J, F)) { J.F = F; stageTrialInit(J, Math.round(1 / STEP)); } else { F = null; stageWhy('s1.path'); } }
      else { J.mk = J.mks[(J.c - 1) % J.mks.length]; F = s2Make(J); if (F) { J.F = F; stageTrialInit(J, Math.round(1 / STEP)); } }   // (each landmark in turn)
    }
    return !!F;
  }
  function stageWork(quota) {
    var J = STG.job, w0 = work, res;
    while (STG.job === J && work - w0 < quota) {
      if (!J.F) { if (!stageNext(J)) { stageDone(J); return; } continue; }
      res = J.kind === 'S3' ? s3Trial(J, quota - (work - w0)) : J.kind === 'S1' ? s1Trial(J, quota - (work - w0)) : s2Trial(J, quota - (work - w0));
      if (res === 0) return;
      if (res > 0 && J.it.probe) { J.it.probe = false; var k0 = J.it.k0; stageTrialInit(J, k0); J.it.probe = false; continue; }
      if (res > 0) {
        var sc = Math.min(J.it.near, 200) + 10 * J.r();
        if (sc > J.bestSc) { J.bestSc = sc; J.best = { F: J.F, it: J.it }; }
        if (J.kind !== 'S3' || J.bestSc > 120) { stageDone(J); return; }   // (a wheel or a ribbon that fits is flown; a reveal, the roomiest of a few)
      } else if (J.kind === 'S2' && J.it.redo) { var Pf = J.F; stageTrialInit(J, J.it.k0); J.F = Pf; continue; }
      J.F = null; J.it = null;
      if (J.c >= STAGE_CANDS) { stageDone(J); return; }
    }
  }
  function stageDone(J) {
    STG.job = null;
    if (!J.best) { STG.failT[J.kind] = t; STG.log.push({ t: +t.toFixed(1), kind: J.kind, ok: false, c: J.c }); if (STG.log.length > 40) STG.log.shift(); stageLookLater(); return; }
    var F = J.best.F, it = J.best.it;
    if (J.kind === 'S2') {
      if (F.m.length > freeSlots()) { STG.log.push({ t: +t.toFixed(1), kind: J.kind, ok: false, why: 'slots' }); return; }
      F.t0 = J.t + it.k0 * STEP; F.yLo = it.yLo; F.yHi = it.yHi; F.xLo = it.xLo; F.xHi = it.xHi; F.enterT = it.enter;
      for (var i = 0, j = 0; i < slots.length && j < F.m.length; i++) if (!slots[i].busy) { slots[i].busy = true; F.m[j].s = slots[i]; dress(slots[i], F.m[j].d); j++; }
      PLACES.push(F); F.id = 'w' + (++FLIGHT_ID);
    } else {
      if (F.m.length > freeSlots() + awaySlots()) { STG.log.push({ t: +t.toFixed(1), kind: J.kind, ok: false, why: 'slots' }); return; }
      F.id = ++FLIGHT_ID; F.yLo = it.yLo; F.yHi = it.yHi; F.xLo = it.xLo; F.xHi = it.xHi;
      F.enterT = J.kind === 'S3' ? Math.max(0, Math.min.apply(null, Array.prototype.slice.call(it.rv))) : it.enter;
      F.revealEnd = J.kind === 'S3' ? Math.max.apply(null, Array.prototype.slice.call(it.re)) : 0;
      F.seenSpan = Math.max(4, it.last - Math.max(it.enter, 0)); F.pitch0 = Math.atan2(cam.s, cam.c);
      commit(F, J.t + it.k0 * STEP);
    }
    STG.cur = F; STG.last = J.kind; STG.force = null; STG.film = false; STG.lookFrom = -1;
    STG.log.push({ t: +t.toFixed(1), kind: J.kind, ok: true, id: F.id, sort: F.sort, n: F.m.length, t0: +F.t0.toFixed(1), enter: +(F.t0 + (F.enterT || 0)).toFixed(1), near: +it.near.toFixed(1), seen: +(it.last - Math.max(it.enter, 0)).toFixed(1), x: [Math.round(it.xLo), Math.round(it.xHi)], y: [Math.round(it.yLo), Math.round(it.yHi)], rx: it.rx ? it.rx.slice(0, 14) : null, g98: it.g98 });
    /* the hush: no travelling flight sets off to enter in the HUSH_T s before the stage's first bird is seen */
    var E = F.t0 + (F.enterT || 0); STG.hush[0] = E - HUSH_T - FIRST_LEAD_IN; STG.hush[1] = E;   // (a flight set off now enters a second or two later)
  }
  /* nothing staged this look: look again in STAGE_LOOK s, for up to STAGE_LOOK_MAX s; then wait RETRY_STAGE s */
  function stageLookLater() {
    STG.nextLook = t + STAGE_LOOK;
    if (STG.lookFrom >= 0 && t - STG.lookFrom > STAGE_LOOK_MAX) { STG.due = t + RETRY_STAGE; STG.lookFrom = -1; }
  }
  /* each step: the stage that is on (done when its birds are), the clock, and the job a share at a time */
  function stageStep(C) {
    if (FORCED || HOST.reduced()) return;
    var F = STG.cur;
    if (F) {
      var on = F.place ? PLACES.indexOf(F) >= 0 : flights.indexOf(F) >= 0;
      STG.inView = on && F.lastSeen !== undefined && t - F.lastSeen < 1;
      if (!on) { STG.cur = null; STG.inView = false; STG.due = t + pick(vstream(6000 + STG.n), STAGE_GAP) * Math.min(2, 1 + t / 720); STG.nextLook = STG.due; }
      return;
    }
    if (STG.job) { if (!job) stageWork(STAGE_QUOTA); return; }
    if (t < STG.due || t < STG.nextLook || job) return;
    if (STG.lookFrom < 0) STG.lookFrom = t;
    if (!stageStart()) stageLookLater();
  }

  function stageReset() { STG.reset(); }
  function stageDev(o) { return STG.dev(o); }
  function stageState() { return STG.state(); }

  /* ================ GUESTS (life, the birds' play) ================
     A guest is a bird of its own, on its own stream (guestRng: vstream(8000 + k), split from the visit's one seed), that
     lands on something fixed to the window: the pointer resting in open sky (P1), the lettered name's strokes (W1) or a
     link word (W2), sits in the owner's chosen shape (PERCH: perch A, the folded chevron) and leaves. It flies in the
     camera's own space (its place on the window and its nearness), so a turn of the view does not sweep a bird that is
     landing on the words. Nothing here is read by the ordinary planner, the guard, the hold or the camera: no band, no
     HOST.calm, no flight list written (the twin test, L13); the guest reads the ordinary birds' last boxes (to keep away
     from them) and nothing else of theirs. Drawn by the same instanced pass, behind the words (the words always on
     top: a bird on a stroke sits on it, the stroke covering its sliver), exempt from the words' keep-off (aL.y), its
     path planned clear of the line, the credit and the links (12 px) */
  var PERCH = (function () {   /* the perched shape: ONE swappable piece (perch.js A 704d1048: its poses, keys, rest rule) */
    function side(a) { var p = FP.pose(); for (var i = 0; i < 11; i++) { p[i] = a[i]; p[11 + i] = a[i]; } return p; }
    var P = { flare: side([55, 26, 26, 1, -16, 6, 10, 14, 0, 0, 12]), touch: side([62, 10, 12, 0.95, -40, 0, 4, 6, 0, 0, 8]),
      fold: side([0, -78, 88, 0.48, 0, -14, 0, 0, -6, 0, 0]), foldHalf: side([40, -20, 30, 0.8, -40, -25, 0, 0, -5, 0, 6]),
      foldLoose: side([8, -62, 70, 0.6, -6, -10, 0, 0, -4, 0, 2]), open: side([40, 8, 6, 0.9, -30, -10, 4, 0, -4, 0, 6]) };
    function K(t, p, pitch, yaw, lift) { return { t: t, p: P[p], n: p, pitch: pitch, yaw: yaw, lift: lift || 0 }; }
    /* (perch lane) the same shape and the keys' rhythm, seen side-on (yaw about 95: its profile) with the body pitched up
       about 30 deg, as a bird stands on a ledge, barely tilted toward the eye: at true size the folded M is a small upright
       bird, its two folded tips under it like feet (seen at 3/4 from above, yaw 52 and el 24, it was a flat leaf or a hook) */
    return { name: 'A', poses: P, rest: 'low', life: { arm: 3.0, hand: 2.2, roll: 0 }, scale: 3.4, el: 4,
      keys: [K(0, 'touch', 38, 70), K(0.3, 'foldHalf', 32, 84), K(0.8, 'fold', 30, 94), K(1.1, 'fold', 30, 97, 0.05), K(1.3, 'fold', 30, 95),
        K(2.6, 'fold', 30, 95), K(2.85, 'foldLoose', 33, 95), K(3.2, 'fold', 30, 95), K(4.0, 'fold', 30, 95), K(4.12, 'fold', 26, 95, -0.03), K(4.3, 'fold', 30, 95), K(5.0, 'fold', 30, 95)] };
  })();
  /* the name's perches (viewBox units of the drawing, 1310 x 314: the top edge of the stroke, read offline from the path
     rasterised, tools/name_raster.js on index.html's path md5 46b5e199): the u's exit flourish tip, the D's entry stroke,
     the floor inside the D's bowl. Never the Z's bar, an ascender's tip, the o's top (a chevron there is a diacritic) */
var NAME_PERCH = {
    Dtop: { dir: -1, at: 124, pts: [[68, 14.75], [76, 8.5], [84, 6.25], [92, 4.75], [100, 4], [108, 4.25], [116, 4.75], [124, 5.5], [132, 6.5], [140, 8], [148, 10.25], [156, 13.25], [164, 17.25], [172, 22.75], [180, 30.25]] },
    Ztop: { dir: 1, at: 820, pts: [[760, 62], [768, 59.25], [776, 57.5], [784, 56.5], [792, 56], [800, 55.75], [808, 55.75], [816, 55.75], [824, 55.75], [832, 55.5], [840, 55.25], [848, 55.25], [856, 56.25], [864, 58], [872, 60.25], [880, 61.75]] },
    ktail: { dir: 1, at: 638, pts: [[596, 254.25], [604, 256.25], [612, 254.75], [620, 250], [628, 248.25], [636, 244], [644, 239], [652, 234], [660, 229], [668, 224.75], [676, 223.25], [680, 227]] },
    utail: { dir: 1, at: 1264, pts: [[1228, 256.5], [1236, 255.25], [1244, 252.25], [1252, 248.5], [1260, 244.25], [1268, 239.25], [1276, 234], [1284, 228.25], [1292, 223], [1300, 220.5]] },
    dinside: { dir: -1, at: 114, pts: [[78, 244.75], [86, 244], [94, 242.25], [102, 240], [110, 237.5], [118, 234.25], [126, 229.5], [134, 223.25], [142, 217], [150, 209.75]] }
  };
  /* the link perches: past the word's end (the bird's rear on the underline's last 3 px), or on an ascender's top (fractions
     of the word's box, measured offline in the served Geist subset: tools/link_glyphs.js); the baseline 0.4286 em over the
     box's bottom, the underline .18em under it, an ascender 0.72 em over it */
  /* (perch lane) the owner's rule: on TOP of a word (its ascenders' tops: Email's i and l, LinkedIn's d) or just past its
     end on the same line (standing at the baseline, 3 px past the box: the underline, 0.21 em under the baseline, never
     touched); measured in perch/places/PLACES.json. G_LINK_K, G_PTR_K: those guests' size against the name's */
  var LINK_PERCH = { eend: { link: 0, end: true }, lend: { link: 1, end: true }, etop: { link: 0, fx: [0.83, 0.99] }, ltop: { link: 1, fx: [0.64, 0.78] } }, G_LINK_K = 0.62, G_PTR_K = 0.75;
  var NAME_INK_S = '0,314|0,248;258,314|0,245;262,314|0,245;265,314|0,247;264,314|0,248;264,314|0,248;266,314|0,246;306,314|0,228;289,314|0,206;261,314|0,187;237,245;261,314|0,168;223,246;262,314|0,12;22,148;201,246;262,314|0,9;24,131;185,246;262,314|0,8;24,112;170,246;261,314|0,7;25,85;154,245;259,314|0,6;25,76;140,243;258,314|0,6;26,72;127,241;257,314|0,6;28,71;112,240;256,314|0,6;29,74;99,238;255,314|0,7;32,235;253,314|0,8;34,231;250,314|0,9;37,227;247,314|0,10;40,222;243,314|0,12;44,217;239,314|0,14;49,212;234,314|0,17;53,205;229,314|0,21;59,196;223,314|0,25;66,187;217,314|0,31;75,176;211,314|0,38;86,162;203,314|0,45;194,314|0,53;184,230;232,314|0,63;170,228;234,314|0,76;151,226;234,314|0,103;115,221;241,314|0,203;253,314|0,194;259,314|0,187;204,218;229,246;262,314|0,182;195,218;227,250;264,314|0,176;190,216;224,252;265,314|0,173;188,214;222,253;266,314|0,170;188,210;219,253;265,314|0,171;189,205;215,252;263,314|0,173;211,249;261,314|0,176;206,246;257,314|0,184;198,241;253,314|0,236;248,314|0,231;243,314|0,226;238,314|0,221;232,314|0,216;227,314|0,210;222,314|0,202;216,314|0,195;211,314|0,191;206,233;252,314|0,187;202,221;261,314|0,183;201,210;265,314|0,170;267,314|0,159;227,253;268,314|0,167;219,254;267,314|0,186;210,254;266,314|0,187;205,253;264,314|0,187;201,251;262,314|0,191;195,248;258,314|0,244;255,314|0,239;250,314|0,235;247,314|0,214;247,314|0,200;255,314|0,192;259,314|0,186;201,220;232,247;262,314|0,180;193,219;229,250;264,314|0,175;189,216;225,252;265,314|0,172;187,212;221,252;265,314|0,170;188,209;217,252;264,314|0,171;190,203;213,251;262,314|0,173;209,248;259,314|0,178;204,244;256,314|0,188;194,239;252,314|0,234;247,264;269,314|0,228;245,254;270,314|0,223;265,314|0,216;259,314|0,208;253,314|0,201;245,314|0,195;236,314|0,188;235,314|0,180;204,224;232,314|0,171;197,221;228,314|0,160;191,214;225,314|0,147;185,203;225,314|0,133;151,157;178,193;233,314|0,119;139,157;172,185;201,210;242,314|0,108;131,153;167,179;192,210;251,314|0,99;121,145;163,176;190,209;222,228;259,314|0,91;110,138;157,176;219,237;265,314|0,85;100,132;150,179;216,246;268,314|0,81;93,126;143,184;210,253;271,314|0,76;88,118;137,257;272,314|0,73;87,111;131,258;272,314|0,71;87,106;124,257;270,314|0,72;93,99;116,256;268,314|0,76;108,254;266,314|0,86;98,252;263,314|0,249;260,314|0,246;257,314|0,242;254,314|0,238;250,314|0,234;246,314|0,231;243,314|0,227;239,314|0,225;234,314|0,314|0,314|0,314|0,314|0,314|0,314|0,273;289,314|0,269;291,314|0,265;288,314|0,260;285,314|0,95;109,254;283,314|0,77;108,248;281,314|0,70;91,242;280,314|0,66;81,236;279,314|0,63;77,229;278,314|0,61;75,222;252,260;278,314|0,59;74,215;247,260;278,314|0,58;73,207;242,260;278,314|0,58;72,200;235,260;278,314|0,57;71,192;229,260;278,314|0,57;71,184;221,260;278,314|0,57;71,176;213,260;278,314|0,57;71,166;204,259;278,314|0,57;72,157;195,259;277,314|0,57;72,149;188,258;276,314|0,57;72,142;182,257;274,314|0,57;73,134;176,256;272,314|0,57;74,127;168,255;270,314|0,57;75,119;157,254;267,314|0,58;77,111;145,314|0,59;79,101;133,314|0,61;81,91;123,314|0,62;114,314|0,63;108,314|0,64;102,264;278,314|0,65;94,254;273,314|0,66;89,246;268,314|0,72;82,220;262,314|0,209;255,314|0,203;245,314|0,197;240,314|0,189;237,314|0,180;205,216;233,314|0,170;200,214;230,314|0,158;193,211;227,314|0,144;186,208;225,314|0,130;149,164;181,206;225,314|0,118;140,161;176,205;233,314|0,108;130,154;171,206;261,314|0,100;120,146;165,209;269,314|0,94;110,140;158,213;273,314|0,89;102,134;152,224;235,255;274,314|0,84;96,127;146,260;274,314|0,80;93,120;140,260;273,314|0,78;93,114;133,260;271,314|0,78;97,108;125,259;270,314|0,81;117,257;268,314|0,88;109,254;266,314|0,251;263,314|0,230;238,248;258,314|0,214;256,314|0,203;258,314|0,194;228,244;261,314|0,187;217,247;263,314|0,181;209,247;264,314|0,177;202,246;263,314|0,173;196,244;262,314|0,170;191,239;260,314|0,168;188,232;257,314|0,167;187,224;252,314|0,168;186,216;248,314|0,169;187,210;241,314|0,171;234,314|0,174;225,314|0,178;218,314|0,187;217,314|0,200;216,242;265,314|0,200;216,229;273,314|0,197;278,314|0,195;243,255;280,314|0,199;229,261;279,314|0,261;278,314|0,259;275,314|0,256;271,314|0,251;267,314|0,245;262,314|0,238;261,314|0,220;266,314|0,204;272,314|0,191;275,314|0,185;217,255;277,314|0,192;201,258;276,314|0,258;274,314|0,257;271,314|0,255;268,314|0,252;265,314|0,249;262,314|0,246;258,314|0,242;255,314|0,238;251,314|0,234;247,314|0,230;243,314|0,226;239,314|0,223;233,314|0,314|0,314', NAME_INK = null;   // (the name's ink, viewBox units: per 6-unit column its y spans, grown 1 unit; perch/places/name_mask.png)
  function gInkHit(x0, y0, x1, y1) {   // (does a box, CSS px, touch the name's ink?)
    var nm = nameMap(); if (!nm) return false;
    if (!NAME_INK) NAME_INK = NAME_INK_S.split('|').map(function (c) { return c ? c.split(';').map(function (q) { var a = q.split(','); return [+a[0], +a[1]]; }) : []; });
    var u0 = (x0 - nm[0]) / nm[2], u1 = (x1 - nm[0]) / nm[2], v0 = (y0 - nm[1]) / nm[2], v1 = (y1 - nm[1]) / nm[2];
    if (u1 < 0 || u0 > 1310 || v1 < 0 || v0 > 314) return false;
    for (var c = Math.max(0, Math.floor(u0 / 6)), ce = Math.min(NAME_INK.length - 1, Math.floor(u1 / 6)); c <= ce; c++) { var I = NAME_INK[c]; for (var i = 0; i < I.length; i++) if (I[i][1] >= v0 && I[i][0] <= v1) return true; }
    return false;
  }
  var LINK_GLYPHS = [   /* [fx0, fx1, top em over the baseline] (tools/link_glyphs.js, the served Geist subset at 14 px) */
    [[0.028, 0.227, 0.72], [0.268, 0.581, 0.57], [0.585, 0.812, 0.57], [0.829, 0.885, 0.72], [0.922, 1.0, 0.72]],
    [[0.018, 0.147, 0.72], [0.155, 0.192, 0.72], [0.219, 0.348, 0.57], [0.368, 0.42, 0.72], [0.42, 0.497, 0.57], [0.488, 0.636, 0.57], [0.631, 0.778, 0.72], [0.797, 0.834, 0.72], [0.868, 0.997, 0.57]] ];
  function wordTops(L0, b, base, em, upto) {   // (the glyphs' tops as one surface, a step at each glyph: the lowest bird point over each glyph on its top)
    var G = LINK_GLYPHS[L0.link], o = [], w = b[2] - b[0];
    for (var i = 0; i < G.length; i++) { var y = base - G[i][2] * em; o.push([b[0] + G[i][0] * w, y], [b[0] + Math.min(G[i][1], 1) * w - 0.01, y]); }
    return o;
  }
  var G_SETOUT = 1.0, G_FIRST_PTR = 6, G_FIRST = 20, G_WORD_MEAN = 180, G_WORD_MIN = 90, G_WORD_MAX = 5, G_PTR_GAP = 90, G_PTR_MAX = 4, G_FLUSH_T = 120, G_REST = 2.0, G_KEEP = 12;
  var GU = { list: [], k: 0, nWord: 0, nPtr: 0, lastWord: -1e9, nextWord: G_FIRST, lastPtr: -1e9, flushAt: -1e9, flushN: 0, firstRest: true, log: [], force: null, on: true,   /* (the perched guests on the words; the pointer's perch needs the hover listener, which the world does not have: its HOVER stays gone, so it never comes) */
    p: { x: -1, y: -1, n: 0, gone: true, down: false, steer: false }, px: -1, py: -1, vx: 0, vy: 0, sp: 0, restT: 0, restX: 0, restY: 0, restUsed: false, seenN: -1 };
  function guestRng() { return vstream(8000 + GU.k++); }
  var GDEV = {};   // (dev, the perch lab: overrides of the perched look, set only through the dev hook; empty in production)
  var GTMP = { x: 0, y: 0, n: 0, z: 0 }, GMEAN = {}, GOPT = { k: 1, D: undefined }, GBODY = new Float64Array(3);
  function gss(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function gmix(o, a, b, w) { for (var i = 0; i < 22; i++) o[i] = a[i] + (b[i] - a[i]) * w; return o; }
  function gbeat(kind, ph, k, out) { GOPT.k = k; GOPT.D = undefined; LB.cycle(kind, ph - Math.floor(ph), GOPT, out, GBODY); return out; }
  function gmean(kind) { if (GMEAN[kind]) return GMEAN[kind]; var M = FP.pose(), T = FP.pose(); for (var i = 0; i < 120; i++) { gbeat(kind, i / 120, 1, T); for (var j = 0; j < 22; j++) M[j] += T[j] / 120; } return (GMEAN[kind] = M); }
  /* the words' boxes, CSS px: 0 name (its ink), 1 line, 2 credit, 3 Email, 4 LinkedIn */
  function gWords() { var b = HOST.words().boxes, k = 1 / (VW.bdpr || VW.dpr || 1), o = []; for (var i = 0; i < 5; i++) o.push([b[4 * i] * k, b[4 * i + 1] * k, b[4 * i + 2] * k, b[4 * i + 3] * k]); return o; }
  function nameMap() { var nv = HOST.words().nvb; if (!nv) return null; var k = 1 / (VW.bdpr || VW.dpr || 1); return [nv[0] * k, nv[1] * k, nv[2] * k]; }
  function boxGap(x0, y0, x1, y1, b) { var dx = Math.max(b[0] - x1, x0 - b[2], 0), dy = Math.max(b[1] - y1, y0 - b[3], 0); return Math.sqrt(dx * dx + dy * dy); }
  function openSkyAt(x, y) {   // (P1: outside every word box + 24 px, 60 px from the edges)
    if (x < 60 || y < 60 || x > W - 60 || y > H - 60) return false;
    var B = gWords(); for (var i = 0; i < 5; i++) if (B[i][2] > B[i][0] && boxGap(x, y, x, y, B[i]) < 24) return false;
    return true;
  }
  /* a perch resolved on this window: { pts: [[x, y] CSS px, ...] the surface, x (where it sits), dir (the side it comes
     from), kind ('name' | 'link' | 'pointer') } */
  function perchOf(spec) {
    var B = gWords(), pts = [], i;
    if (spec.type === 'name') {
      var nm = nameMap(), N0 = NAME_PERCH[spec.id]; if (!nm || !N0) return null;
      for (i = 0; i < N0.pts.length; i++) pts.push([nm[0] + N0.pts[i][0] * nm[2], nm[1] + N0.pts[i][1] * nm[2]]);
      return { kind: 'name', id: spec.id, pts: pts, x: nm[0] + N0.at * nm[2], dir: N0.dir };
    }
    if (spec.type === 'link') {
      var L0 = LINK_PERCH[spec.id], b = B[3 + L0.link]; if (!(b[2] > b[0])) return null;
      var em = (b[3] - b[1]) / 1.5, base = b[3] - 0.4286 * em;   // (the link's box is its line box: 1.5 em at .875rem)
      var tops = wordTops(L0, b, base, em);
      if (L0.end) { var sq = gSpanPx({ kind: spec.gkind || spec.kind || 'gull' }) * G_LINK_K, xr = b[2] + Math.max(3, 0.214 * em), bw = 0.45 * sq;
        if (L0.link === 0 && B[4][2] > B[4][0] && xr + bw + 3 > B[4][0]) return null;   // (between the words only if it fits)
        pts = [[xr, base], [xr + 1.6 * sq, base]]; return { kind: 'link', id: spec.id, end: true, pts: pts, x: xr + 0.42 * sq, dir: 1, qa: L0.link === 0 ? 75 : 45, qe: L0.link === 0 ? 60 : 16, keepX: b[2] + 1, sk: G_LINK_K, wb: b, topY: base }; }
      var xa = b[0] + L0.fx[0] * (b[2] - b[0]), xb = b[0] + L0.fx[1] * (b[2] - b[0]);
      return { kind: 'link', id: spec.id, pts: tops, x: 0.5 * (xa + xb), dir: b[2] < W / 2 ? 1 : -1, qa: 55, qe: 22, sk: G_LINK_K, wb: b, topY: base - 0.72 * em };
    }
    return { kind: 'pointer', pts: [[spec.x - 1.5, spec.y], [spec.x + 1.5, spec.y]], x: spec.x, dir: spec.dir || (spec.x < W / 2 ? -1 : 1), sk: G_PTR_K };
  }
  function surfY(pts, x) { if (x < pts[0][0] || x > pts[pts.length - 1][0]) return NaN; for (var i = 1; i < pts.length; i++) if (x <= pts[i][0]) { var w = (x - pts[i - 1][0]) / Math.max(1e-6, pts[i][0] - pts[i - 1][0]); return pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * w; } return NaN; }
  function surfTop(pts) { var y = 1e9; for (var i = 0; i < pts.length; i++) y = Math.min(y, pts[i][1]); return y; }
  /* the guest's size: its kind's span at nearness 1 times the perch's scale (and 1.5 on a phone if asked) */
  function gSpanPx(g) { return SPAN * view * (SORTS[g.kind] ? SORTS[g.kind].size : 1) * (GDEV.scale || PERCH.scale); }
  /* the plan, whole, when committed: times (s from g.t0) and places (CSS px).
     (fix) THE APPROACH, as birds land (judge-eye1: a level slide at a constant pace, stopped dead by the flare): flapping
     in (a Hermite from beyond the edge to G), then a descending glide G -> the perch that slows the whole way, its pace
     falling evenly from the cruise to a quarter of it at touch-down (CHECKS L11's 0.2-0.3), its path a quadratic curve
     that leaves G qa below level and rounds out to qe at the perch; the flare on its last 0.6 s. Its glide is Lg long
     (pointer 3 spans, the link's end 4.5, the name 5.5); its start the nearest clear one */
  function gBez(g, u, o) { var a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u; o.x = a * g.G[0] + b * g.Cp[0] + c * g.T[0]; o.y = a * g.G[1] + b * g.Cp[1] + c * g.T[1]; return o; }
  function gArcU(g, sL) { var A = g.arc, n = A.length - 1; if (sL <= 0) return 0; if (sL >= A[n]) return 1; var i = 1; while (A[i] < sL) i++; return (i - 1 + (sL - A[i - 1]) / Math.max(1e-9, A[i] - A[i - 1])) / n; }
  var GTMP3 = { x: 0, y: 0, u: 0, vk: 1 };
  function gPlan(g, P) {
    var sp = gSpanPx(g) * (P.sk || 1), dir = P.dir, sy = surfY(P.pts, P.x); if (!(sy === sy)) sy = surfTop(P.pts);
    var vc = P.kind === 'pointer' ? clamp(1.4 * topSpeed(), 18, 50) : clamp(1.25 * topSpeed(), 18, 48), B = gWords(), i;
    g.sp = sp; g.vc = vc; g.dir = dir; g.face = -dir; g.px0 = P.x; g.py0 = sy;
    var Lg = (P.kind === 'pointer' ? 2.6 : P.kind === 'link' ? 4.5 : 5.5) * sp, qa = (P.qa !== undefined ? P.qa : P.kind === 'name' ? 40 : 24) * DEG, qe = (P.qe !== undefined ? P.qe : P.kind === 'name' ? 18 : 8) * DEG;   // (perch lane: onto a stroke from above)
    g.T = [P.x, sy - 0.22 * sp]; g.yEnd = g.T[1];
    g.G = [g.T[0] + dir * Lg * Math.cos(qa), g.T[1] - Lg * Math.sin(qa)];
    g.Cp = [g.T[0] + dir * 0.45 * Lg * Math.cos(qe), g.T[1] - 0.45 * Lg * Math.sin(qe)];
    g.Q = g.G; g.Lr = Lg; g.arc = [0];
    var ox = g.G[0], oy = g.G[1];
    for (i = 1; i <= 32; i++) { gBez(g, i / 32, GTMP); g.arc.push(g.arc[i - 1] + Math.sqrt((GTMP.x - ox) * (GTMP.x - ox) + (GTMP.y - oy) * (GTMP.y - oy))); ox = GTMP.x; oy = GTMP.y; }
    g.Lb = g.arc[32];
    var tdx = g.Cp[0] - g.G[0], tdy = g.Cp[1] - g.G[1], tdl = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
    /* the start: (fix) out along the glide's own line, back from G to beyond the window's edge, or turned off it by up to
       50 deg (never from below): of these, the first by its time in plus a second for every 12 deg it turns (a straight
       way in has no turn; judge-bio1: the approach turned 25-29 deg/s on the window), whose path keeps 12 px from the line,
       credit and links (24 px from the name for a pointer guest) and 2 spans from every ordinary bird where it will be */
    var ga = Math.atan2(-tdy, -tdx), tries = [], DA = [0, 12, -12, 24, -24, 36, -36, 50, -50], m2 = 2 * sp;
    for (i = 0; i < DA.length; i++) {
      var aa = ga + DA[i] * DEG, ux = Math.cos(aa), uy = Math.sin(aa); if (uy > 0.15) continue;
      var dE = 1e9; if (ux > 1e-6) dE = Math.min(dE, (W + m2 - g.Q[0]) / ux); if (ux < -1e-6) dE = Math.min(dE, (-m2 - g.Q[0]) / ux); if (uy < -1e-6) dE = Math.min(dE, (-m2 - g.Q[1]) / uy);
      if (!(dE < 1e8) || dE < m2) continue;
      tries.push([g.Q[0] + ux * dE, g.Q[1] + uy * dE, dE * 1.12 / vc + Math.abs(DA[i]) / 12]);
    }
    tries.sort(function (a, b) { return a[2] - b[2]; });
    for (i = 0; i < tries.length; i++) {
      g.S = [tries[i][0], tries[i][1]];
      var dx = g.Q[0] - g.S[0], dy = g.Q[1] - g.S[1], L = Math.sqrt(dx * dx + dy * dy);
      g.L = L; g.mQ = [tdx / tdl * L, tdy / tdl * L]; g.mS = [dx, dy];
      g.Ti = L * 1.12 / vc; g.vg = L / g.Ti; g.ve = 0.24 * g.vg; g.Tr = 2 * g.Lb / (g.vg + g.ve);   // (the Hermite's way a little longer than the chord; its end pace the glide's start)
      if (gPathClear(g, P, B)) break;
    }
    if (i === tries.length) return false;
    g.tF = g.Ti + g.Tr - 0.6; g.tT = g.Ti + g.Tr;   // (the flare: the last 0.6 s of the glide)
    /* and nobody coming to its perch while it would sit there (the ordinary birds' pace carried on 8 s past touch-down) */
    for (var k2 = g.tT; k2 <= g.tT + 8; k2 += 0.5) if (!gOrdClearAt(g.px0, g.py0, k2, 3 * sp)) return false;
    g.sit = P.kind === 'pointer' ? pick(g.r, [25, 60]) : P.kind === 'name' ? pick(g.r, [10, 24]) : pick(g.r, [8, 20]);
    g.tO = g.tT + g.sit; g.tE = g.tO + 60;
    g.steps = P.kind === 'pointer' ? [] : (g.r() < 0.5 ? [0.55] : [0.55, 1.15]);   // (1-2 sidling steps in the first 1.5 s)
    g.stepD = (g.r() < 0.5 ? -1 : 1) * pick(g.r, [0.06, 0.14]) * sp;
    /* (fix) its body language while it sits (judge-eye1: frozen for 14 s, read as a glyph): every 4-9 s a stretch (the
       wings half raised and let down: the M shows for a moment), a rouse (a quick shake of the wings), or on the words a
       shuffle (a small step along the perch, the body turned a little); the first stretch soon after it settles */
    g.acts = []; var ta = pick(g.r, [1.4, 2.0]);   // (perch lane: sooner)
    while (ta < g.sit - 1.2) {
      var ur = g.r(), ty = ur < 0.45 ? 1 : ur < 0.75 || P.kind === 'pointer' ? 2 : 3;
      g.acts.push([ta, ty, ty === 1 ? pick(g.r, [0.9, 1.3]) : ty === 2 ? pick(g.r, [0.45, 0.6]) : 0.45, (g.r() < 0.5 ? -1 : 1) * pick(g.r, [0.05, 0.1]) * sp, (g.r() < 0.5 ? -1 : 1) * pick(g.r, [6, 14])]);
      ta += pick(g.r, [2.5, 4.5]);   // (perch lane: a visible change every few seconds)
    }
    return true;
  }
  function px0q(g) { return g.px0; }
  /* (perch lane) the click's bird: a click or tap on the page (not a drag, not a link: HOST.clicks) starts a gull there,
     folded as perch A, that springs off at once (no crouch: the pointer's take-off) up and away on its own course (a way up
     drawn from its own stream, leaning to the click's side, clear of the line, the credit, the links and the name's
     strokes) and recedes as it goes (G_CLICK_RECEDE a second: nothing looms) until it is out of view or too small to see:
     never a fade. At most G_CLICK_MAX in the air at once; the perches' own guests are not held up by them */
  var G_CLICK_MAX = 4, G_CLICK_RECEDE = 0.09, GCLK = [];
  function gBusy() { for (var i = 0; i < GU.list.length; i++) if (!GU.list[i].click) return true; return false; }
  function gClick(x, y) {
    var nC = 0, i; for (i = 0; i < GU.list.length; i++) if (GU.list[i].click) nC++;
    if (nC >= G_CLICK_MAX || !(x >= 0 && y >= 0 && x <= W && y <= H)) { GU.log.push({ t: +t.toFixed(2), ev: 'click-skip', n: nC }); return false; }
    var r = guestRng(), P = { kind: 'pointer', pts: [[x - 1.5, y], [x + 1.5, y]], x: x, dir: x < W / 2 ? -1 : 1, sk: G_PTR_K };
    var g = { r: r, kind: 'gull', why: 'click', click: true, spec: { type: 'click', id: 'click', x: x, y: y }, t0: t, phase: 'sit', id: 'c' + GU.k, ph0: r(), rate: BW.LB.rate('gull', RATE_MODE), ride: [0, 0], leaveAt: -1, away: [0, -1], P: P, Tfix: true };
    g.sp = gSpanPx(g) * P.sk; g.vc = clamp(1.4 * topSpeed(), 18, 50); g.dir = P.dir; g.face = -P.dir; g.px0 = x; g.py0 = y; g.T = [x, y];
    g.Ti = 0; g.Tr = 0; g.tF = -10; g.tT = -10; g.sit = 0; g.tO = 0.05; g.tE = 90; g.steps = []; g.acts = [];   // (no way in: drawn a hair before its own clock starts, it is already sitting)
    var a = -Math.PI / 2 + (x < W / 2 ? -1 : 1) * (0.25 + 0.7 * r()) * (r() < 0.8 ? 1 : -1);   // (up, leaning out to its side, now and then across)
    GU.list.push(g); gLeave(g, 'click', -Math.cos(a), -Math.sin(a));
    GU.log.push({ t: +t.toFixed(2), ev: 'click', id: g.id, x: +x.toFixed(1), y: +y.toFixed(1), away: [+g.away[0].toFixed(2), +g.away[1].toFixed(2)] });
    return true;
  }
  function gAvoid(B, P) { var o = []; for (var i = 1; i < 5; i++) if (B[i][2] > B[i][0]) o.push(B[i]); if (P.kind === 'pointer' && B[0][2] > B[0][0]) o.push([B[0][0] - 12, B[0][1] - 12, B[0][2] + 12, B[0][3] + 12]); return o; }
  function gPathClear(g, P, B) {
    var A = gAvoid(B, P), n = 40, i, j, hw = 0.6 * g.sp, hh = 0.35 * g.sp, TT = g.Ti + g.Tr;
    for (i = 0; i <= n; i++) {
      var ti = TT * i / n; gPos(g, ti, GTMP);
      if (!gOrdClearAt(GTMP.x, GTMP.y, ti, 2 * g.sp)) return false;   // (fix: every ordinary bird where it will be then, not only where it enters)
      if (P.kind === 'link' && Math.abs(GTMP.x - g.px0) < 1.5 * g.sp && Math.abs(GTMP.y - g.py0) < 1.5 * g.sp) { var nT = Math.sqrt((GTMP.x - g.T[0]) * (GTMP.x - g.T[0]) + (GTMP.y - g.T[1]) * (GTMP.y - g.T[1])) < 0.8 * g.sp; if (P.end && GTMP.x - (nT ? 0.2 : 0.5) * hw < P.keepX && GTMP.y + 0.5 * hh > P.wb[1]) return false; if (!P.end && GTMP.y + 0.5 * hh > P.topY && GTMP.x + 0.5 * hw > P.wb[0] && GTMP.x - 0.5 * hw < P.wb[2]) return false; continue; }   // (perch lane)   // (the link guest at its own perch: never over the word's letters)
      for (j = 0; j < A.length; j++) if (boxGap(GTMP.x - hw, GTMP.y - hh, GTMP.x + hw, GTMP.y + hh, A[j]) < G_KEEP) return false;
      if (P.kind !== 'name' && B[0][2] > B[0][0] && boxGap(GTMP.x - hw, GTMP.y - hh, GTMP.x + hw, GTMP.y + hh, B[0]) < 4) return false;
      if (P.kind === 'name' && Math.sqrt((GTMP.x - g.T[0]) * (GTMP.x - g.T[0]) + (GTMP.y - g.T[1]) * (GTMP.y - g.T[1])) > 1.0 * g.sp && gInkHit(GTMP.x - 0.8 * hw, GTMP.y - hh, GTMP.x + 0.8 * hw, GTMP.y + 0.4 * hh)) return false;   // (perch lane)
    }
    return true;
  }
  /* (fix) the ordinary birds as the guests see them: each drawn bird's middle, half-size and pace on the window (CSS px,
     px/s, eased over 0.3 s), read off their drawn boxes after their step (nothing of the guests' is read by them) */
  var GORD = [], GORDK = {};
  function gOrdUpdate() {
    GORD.length = 0;
    function take(F, mm, key) {
      var sl = mm.s; if (!sl || !sl.on || !(sl.lastOp > 0.05)) return;
      var cx = 0.5 * (sl.bx0 + sl.bx1), cy = 0.5 * (sl.by0 + sl.by1), rr = 0.5 * Math.max(sl.bx1 - sl.bx0, sl.by1 - sl.by0), q = GORDK[key];
      if (!q || t - q[2] > 0.5 || t <= q[2]) q = GORDK[key] = [cx, cy, t, 0, 0];
      else { var dq = t - q[2], kq = 1 - Math.exp(-dq / 0.3); q[3] += ((cx - q[0]) / dq - q[3]) * kq; q[4] += ((cy - q[1]) / dq - q[4]) * kq; q[0] = cx; q[1] = cy; q[2] = t; }
      GORD.push(cx, cy, q[3], q[4], rr);
    }
    var i, j;
    for (i = 0; i < flights.length; i++) { var F = flights[i]; if (F.gone) continue; for (j = 0; j < F.m.length; j++) take(F, F.m[j], F.id + ':' + j); }
    for (i = 0; i < PLACES.length; i++) for (j = 0; j < PLACES[i].m.length; j++) take(PLACES[i], PLACES[i].m[j], 'p' + PLACES[i].key + ':' + j);
    if ((t * 10 | 0) % 50 === 0) for (var kk in GORDK) if (t - GORDK[kk][2] > 2) delete GORDK[kk];
  }
  /* is (x, y) at k s from now clear of every ordinary bird (where its pace carries it) by d px past its own half-size? */
  function gOrdClearAt(x, y, k, d) {
    for (var i = 0; i < GORD.length; i += 5) { var bx = GORD[i] + GORD[i + 2] * k - x, by = GORD[i + 1] + GORD[i + 3] * k - y; if (Math.sqrt(bx * bx + by * by) - GORD[i + 4] < d) return false; }
    return true;
  }
  function gNearOrdinary(x, y, d) { return !gOrdClearAt(x, y, 0, d); }
  /* the path: in (a Hermite from S to G, flapping, then gliding its last second), the glide G -> perch (slowing evenly
     to a quarter of its pace, rounding out), the perch; returns the place (CSS px), the glide's progress u (-1 before
     it) and its pace over the glide's start (vk) */
  function gPos(g, tt, o) {
    if (tt < g.Ti) {
      var u = tt / g.Ti, u2 = u * u, u3 = u2 * u, h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
      o.x = h00 * g.S[0] + h10 * g.mS[0] + h01 * g.Q[0] + h11 * g.mQ[0]; o.y = h00 * g.S[1] + h10 * g.mS[1] + h01 * g.Q[1] + h11 * g.mQ[1]; o.u = -1; o.vk = 1; return o;
    }
    var tau = clamp(tt - g.Ti, 0, g.Tr), sL = g.vg * tau - (g.vg - g.ve) * tau * tau / (2 * g.Tr);
    gBez(g, gArcU(g, sL), o); o.u = sL / g.Lb; o.vk = 1 - (1 - g.ve / g.vg) * tau / g.Tr;
    return o;
  }
  var GTMP2 = { x: 0, y: 0, u: 0 };
  /* a way out from (x, y): of every 15 deg from level left through up to level right (and, flying, down to 45 deg below
     level), the nearest the wanted way (cx, cy) whose straight path to the window's edge keeps 12 px from the line, the
     credit and the links (and from the name for a pointer's guest or one flying by), past its first 1.5 spans; (fix) and
     2 spans from every ordinary bird where it will be (at speed v px/s, starting k0 s from now) over the next 8 s.
     Returns null if no way is clear of both (o.best then the way clear of the words that keeps farthest from the birds) */
  var GWO = { best: null };
  function gOrdWay(x0, y0, ux, uy, v, k0, sp, acc) {
    var worst = 1e9;
    for (var k = 0; k <= 8; k += 0.25) {
      var ul = Math.max(0, k - k0), d = acc ? (ul < 1.4 ? v * ul * ul / 2.8 : v * (ul - 0.7)) : v * ul, x = x0 + ux * d, y = y0 + uy * d;
      if (!inView(x, y, sp, sp) && ul > 0.5) break;
      for (var i = 0; i < GORD.length; i += 5) { var bx = GORD[i] + GORD[i + 2] * k - x, by = GORD[i + 1] + GORD[i + 3] * k - y; worst = Math.min(worst, Math.sqrt(bx * bx + by * by) - GORD[i + 4]); }
    }
    return worst;
  }
  function gWayOut(g, x0, y0, cx, cy, perched) {
    var l = Math.sqrt(cx * cx + cy * cy) || 1; cx /= l; cy /= l;
    var B = gWords(), A = gAvoid(B, g.P), best = null, bs = -2, hw = 0.6 * g.sp, hh = 0.35 * g.sp, q, nq = perched ? 12 : 16, far = null, fd = -1e9;
    if (!perched && B[0][2] > B[0][0] && g.P.kind !== 'pointer') A = A.concat([[B[0][0] - 4, B[0][1] - 4, B[0][2] + 4, B[0][3] + 4]]);
    for (q = 0; q <= nq; q++) {
      var an = Math.PI + q * Math.PI / 12, ux = Math.cos(an), uy = Math.sin(an), sc = ux * cx + uy * cy, ok = true;
      if (Math.abs(uy) < 1e-9) uy = 0;
      for (var dd = 1.5 * g.sp; ok && dd < W + H; dd += 0.5 * g.sp) {
        var x = x0 + ux * dd, y = y0 + uy * dd; if (!inView(x, y, hw, hh)) break;
        if (gInkHit(x - hw, y - hh, x + hw, y + hh)) { ok = false; break; }   // (perch lane)
        for (var j = 0; j < A.length; j++) if (boxGap(x - hw, y - hh, x + hw, y + hh, A[j]) < G_KEEP) { ok = false; break; }
      }
      if (!ok) continue;
      var od = gOrdWay(x0, y0, ux, uy, 0.9 * g.vc, 0, g.sp, false);
      if (od > fd) { fd = od; far = [ux, uy]; }
      if (od >= 2 * g.sp && sc > bs) { bs = sc; best = [ux, uy]; }
    }
    GWO.best = far;
    return best || far || [x0 < W / 2 ? -1 : 1, 0];
  }
  function gStart(spec, why) {
    if (gBusy()) return false;
    var cls = skyCls(), r = guestRng(), kind;
    kind = 'gull';   // (perch lane: perch A is the gull's folded M, the tattoo's; a crow's fingered tips folded read as a fork)
    if (spec.kind) kind = spec.kind;
    spec.gkind = kind; var P = perchOf(spec); if (!P) return false;
    var g = { r: r, kind: kind, why: why, spec: spec, t0: t, phase: 'in', id: 'g' + GU.k, ph0: r(), rate: BW.LB.rate(kind, RATE_MODE), ride: [0, 0], leaveAt: -1, away: [0, -1], P: P };
    if (!gPlan(g, P) && (P.end || (P.dir = -P.dir, !gPlan(g, P)))) { GU.log.push({ t: +t.toFixed(2), ev: 'noroom', why: why, id: spec.id || 'pointer' }); return false; }   // (perch lane)
    /* (the perch disqualified where the perched bird would come within 12 px of the line or the credit) */
    var B = gWords(); for (var i = 1; i < 3; i++) if (B[i][2] > B[i][0] && boxGap(P.x - 0.4 * g.sp, g.py0 - 0.3 * g.sp, P.x + 0.4 * g.sp, g.py0 + 2, B[i]) < G_KEEP) { GU.log.push({ t: +t.toFixed(2), ev: 'perch-too-near', id: spec.id }); return false; }
    GU.list.push(g);
    GU.log.push({ t: +t.toFixed(2), ev: 'start', why: why, id: spec.id || 'pointer', kind: kind, Ti: +g.Ti.toFixed(2), Tr: +g.Tr.toFixed(2), sit: +g.sit.toFixed(1), x: +P.x.toFixed(1), y: +g.py0.toFixed(1) });
    return true;
  }
  function gLeave(g, why, ax, ay) {   /* leave now: the crouch, the leap up and away (from the words' centre or the pointer's motion) */
    if (g.phase === 'off' || g.phase === 'by' || g.leaving) return;
    var tt = t - g.t0;
    if (g.phase === 'in') {   // (before touch-down: a fly-by, on along its way and up out of the window: never turning back)
      gPos(g, tt, GTMP); gPos(g, tt + 0.1, GTMP2);
      var w0 = gWayOut(g, GTMP.x, GTMP.y, GTMP2.x - GTMP.x, GTMP2.y - GTMP.y, false);
      g.phase = 'by'; g.byT = tt; g.byX = GTMP.x; g.byY = GTMP.y; g.byU = w0; g.byA0 = Math.atan2(GTMP2.y - GTMP.y, GTMP2.x - GTMP.x); g.byV0 = Math.sqrt((GTMP2.x - GTMP.x) * (GTMP2.x - GTMP.x) + (GTMP2.y - GTMP.y) * (GTMP2.y - GTMP.y)) / 0.1; GU.log.push({ t: +t.toFixed(2), ev: 'flyby', why: why, way: [+w0[0].toFixed(2), +w0[1].toFixed(2)] });
      return;
    }
    var ptrGo = g.P.kind === 'pointer' && why !== 'done'; if (ptrGo) g.noCrouch = true;   // (perch lane: judge-eye2's 0.45 s hang in the air)
    var tO1 = Math.min(g.tO, tt + (ptrGo ? 0 : why === 'flush' ? 0.05 : pick(g.r, [0.1, 0.3])));
    var B = gWords(), cx, cy;
    if (ax !== undefined) { cx = -ax; cy = -ay; } else { cx = g.px0 - 0.5 * (B[0][0] + B[0][2]); cy = -1; }
    if (g.P.end && (ax === undefined || ax > 0)) { cx = 1; cy = -1.2; }   // (perch lane: away from its word)
    var l = Math.sqrt(cx * cx + cy * cy) || 1; cx /= l; cy /= l;
    if (cy > -0.35) { cy = -0.6; cx = cx >= 0 ? 0.8 : -0.8; }   // (always up first: never a drop toward the line)
    /* the way out: of the ways up and out (every 15 deg from level left to level right), the nearest the wanted one whose
       straight path to the window's edge keeps 12 px from the line, the credit and the links (and 4 from the name for a
       pointer's guest), and within 60 deg of it if any is */
    var A = gAvoid(B, g.P), best = null, bs = -2, hw = 0.6 * g.sp, hh = 0.35 * g.sp, farL = null, fdL = -1e9;
    for (var q = 0; q <= 12; q++) {
      var an = Math.PI + q * Math.PI / 12, ux = Math.cos(an), uy = Math.sin(an) * (q === 0 || q === 12 ? 0 : 1), sc = ux * cx + uy * cy, ok = true;
      for (var dd = 1.5 * g.sp; ok && dd < W + H; dd += 0.5 * g.sp) {   // (its first 1.5 spans: beside its own perch)
        var x = g.px0 + ux * dd, y = g.py0 + uy * dd - 0.35 * g.sp; if (!inView(x, y, hw, hh)) break;
        if (gInkHit(x - hw, y - hh, x + hw, y + hh)) { ok = false; break; }   // (perch lane: never across a stroke)
        for (var j = 0; j < A.length; j++) if (boxGap(x - hw, y - hh, x + hw, y + hh, A[j]) < G_KEEP) { ok = false; break; }
      }
      if (!ok) continue;
      var od = gOrdWay(g.px0, g.py0 - 0.35 * g.sp, ux, uy, 0.95 * g.vc, tO1 - tt + 0.24, g.sp, true);   // (fix: and clear of the ordinary birds where they will be as it climbs away)
      if (od > fdL) { fdL = od; farL = [ux, uy]; }
      if (od >= 2 * g.sp && sc > bs) { bs = sc; best = [ux, uy]; }
    }
    /* (fix) its own time up and no way clear of the birds: it sits on a while (at most 30 s more), and looks again */
    if (!best && why === 'done' && (g.post || 0) < 20) { g.post = (g.post || 0) + 1; g.tO = tt + 1.5; GU.log.push({ t: +t.toFixed(2), ev: 'sit-on', n: g.post }); return; }
    if (!best) best = farL;
    g.leaving = true; g.tO = tO1; g.tE = g.tO + 60; g.leaveWhy = why;
    if (best) { cx = best[0]; cy = best[1]; } else { cx = g.px0 < W / 2 ? -1 : 1; cy = 0; }   // (no way up is clear: level, out by the nearer side)
    g.away = [cx, cy];
    GU.log.push({ t: +t.toFixed(2), ev: 'leave', why: why, away: [+cx.toFixed(2), +cy.toFixed(2)], sat: +(tt - g.tT).toFixed(2) });
  }
  /* each step: the pointer read, the guests' clocks, the schedule */
  function guestStep(dt) {
    if ((!GU.on && GU.clickOn === false) || FORCED || HOST.reduced()) { if (GU.list.length) GU.list.length = 0; return; }
    if (!GU.on) for (i = GU.list.length - 1; i >= 0; i--) if (!GU.list[i].click) GU.list.splice(i, 1);   // (perch lane: the perches off, the click's birds on)
    var p = GU.p, i;
    if (HOST.pointer) HOST.pointer(p); else p.gone = true;
    gOrdUpdate();
    if (HOST.clicks) { HOST.clicks(GCLK); for (i = 0; i + 1 < GCLK.length; i += 2) gClick(GCLK[i], GCLK[i + 1]); }   // (perch lane: each click spawns a bird)
    /* the pointer's speed: a follower of its moves (tau 0.35 s) */
    if (!p.gone && p.x >= 0) {
      if (GU.px < 0) { GU.px = p.x; GU.py = p.y; GU.vx = GU.vy = 0; }
      var k = 1 - Math.exp(-dt / 0.35), ivx = (p.x - GU.px) / dt, ivy = (p.y - GU.py) / dt;
      GU.vx += (ivx - GU.vx) * k; GU.vy += (ivy - GU.vy) * k; GU.px = p.x; GU.py = p.y;
      GU.sp = Math.sqrt(GU.vx * GU.vx + GU.vy * GU.vy);
      if (GU.sp < 20 && !p.down) { if (GU.restT === 0 || Math.abs(p.x - GU.restX) > 6 || Math.abs(p.y - GU.restY) > 6) { GU.restT = t; GU.restX = p.x; GU.restY = p.y; GU.restUsed = false; } }
      else { GU.restT = 0; }
    } else { GU.px = -1; GU.restT = 0; GU.sp = 0; }
    var resting = GU.restT > 0 && t - GU.restT >= G_SETOUT && !p.gone && !p.down;   // (fix: it sets out after G_SETOUT s of rest; it lands 5-10 s after the rest began)
    /* the guests */
    for (i = GU.list.length - 1; i >= 0; i--) {
      var g = GU.list[i], tt = t - g.t0;
      if (g.phase === 'in' && tt >= g.tT) { g.phase = 'sit'; GU.log.push({ t: +t.toFixed(2), ev: 'touch', id: g.spec.id || 'pointer', after: +(t - (g.restAt || g.t0)).toFixed(2) }); }
      if (g.phase === 'sit' && !g.leaving && tt >= g.tO - 0.3) gLeave(g, 'done');   // (its own time up: the way out chosen as for any leave)
      if (g.phase === 'sit' && tt >= g.tO) g.phase = 'off';
      if ((g.phase === 'off' && tt >= g.tE) || (g.phase === 'by' && tt - g.byT > 40) || g.done) { GU.list.splice(i, 1); GU.log.push({ t: +t.toFixed(2), ev: 'done', id: g.id }); continue; }
      if (g.why === 'pointer') {
        if (g.phase === 'in' && (p.gone || p.down || Math.abs(p.x - g.spec.x) > 6 || Math.abs(p.y - g.spec.y) > 6)) gLeave(g, 'moved');
        else if (g.phase === 'sit') {
          var mdx = p.x - g.spec.x, mdy = p.y - g.spec.y;
          if (p.gone || p.down || p.steer) gLeave(g, p.down ? 'press' : 'gone', GU.vx, GU.vy);
          else if (Math.abs(mdx) + Math.abs(mdy) >= 6) gLeave(g, 'moved', GU.vx || mdx, GU.vy || mdy);
          else { g.ride[0] = mdx; g.ride[1] = mdy; }   // (a creep under 6 px: it rides)
        }
      } else if (g.phase === 'sit' || g.phase === 'in') {
        /* a perched guest on the words: a pointer coming close faster than a creep (or a press near) flushes it */
        if (!p.gone && p.x >= 0) {
          var fd = Math.max(2.5, 5 * Math.pow(0.85, GU.flushN)) * g.sp, ddx = p.x - g.px0, ddy = p.y - g.py0, dd = Math.sqrt(ddx * ddx + ddy * ddy);
          if (g.phase === 'sit' && ((GU.sp > 130 && dd < fd) || (p.down && dd < 8 * g.sp))) { gLeave(g, 'flush', ddx, ddy); GU.flushAt = t; GU.flushN++; GU.log[GU.log.length - 1].fd = +(fd / g.sp).toFixed(2); }
        }
        if (g.phase === 'sit' && tt - g.tT > 8 && !g.early && gNearOrdinary(g.px0, g.py0, 6 * g.sp)) { g.early = true; if (g.r() < 0.15) gLeave(g, 'flock'); }   // (fix: never before 8 s on the perch)
      }
      if (g.phase === 'sit' && !g.leaving && tt - g.tT > 1 && !gOrdClearAt(g.px0, g.py0, 0.8, 1.2 * g.sp)) gLeave(g, 'crowd');   // (fix: only a bird about to come onto it: its approach looked ahead for one)
    }
    if (!GU.on) return;   // (perch lane: below, the perches' own schedule)
    /* P1: a resting pointer in open sky gets a gull (or a crow) */
    if (resting && !GU.restUsed && !gBusy() && t >= G_FIRST_PTR && t - GU.lastPtr >= G_PTR_GAP && GU.nPtr < G_PTR_MAX && skyCls() !== 'none' && openSkyAt(p.x, p.y)) {
      var rr = vstream(7900 + GU.nPtr * 7 + Math.floor(GU.restT));
      if (!(t < GU.ptrRetry)) {
        if (GU.firstRest || rr() < 0.5) {
          if (gStart({ type: 'pointer', x: p.x, y: p.y }, 'pointer')) { GU.restUsed = true; GU.firstRest = false; GU.nPtr++; GU.lastPtr = t; GU.list[GU.list.length - 1].restAt = GU.restT; }
          else GU.ptrRetry = t + 1;
        } else GU.restUsed = true;
      }
    }
    /* W1, W2: the word play's own clock */
    if (GU.force && !gBusy()) { var fs = GU.force; GU.force = null; if (gStart(fs, fs.type)) { GU.nWord++; GU.lastWord = t; } else if ((fs.tries = (fs.tries || 0) + 1) < 40) GU.force = fs; }
    if (!gBusy() && t >= GU.nextWord && GU.nWord < G_WORD_MAX && t - GU.flushAt >= G_FLUSH_T && t - GU.lastWord >= G_WORD_MIN * (W < 700 ? 1.6 : 1) && skyCls() !== 'none') {   // (perch lane: wider on a phone; a click's bird does not hold it up)
      var rw = vstream(7800 + GU.nWord * 13 + GU.k), spec;
      GU.nextWord = t + Math.max(G_WORD_MIN, -G_WORD_MEAN * Math.log(1 - 0.999 * rw()));
      if (!(resting && !p.gone)) {
        /* (fix) the name's perches: the D's entry stroke and the floor inside its bowl (the u's tip read as an arrowhead on the letter: judge-eye1); the links: just past LinkedIn's end (on Email's end it would stand over LinkedIn's L; on a letter's top it read as an accent) */
        var NM = ['Dtop', 'ktail', 'utail'], LK = ['lend'], ls = rw() < 0.6 ? NM : LK, li = Math.floor(rw() * ls.length);   // (perch lane)
        if (ls[li] === GU.lastId) li = (li + 1) % ls.length;
        spec = { type: ls === NM ? 'name' : 'link', id: ls[li] }; GU.lastId = spec.id;
        if (gStart(spec, spec.type)) { GU.nWord++; GU.lastWord = t; } else GU.nextWord = t + 10;   // (no room now: tried again soon)
      }
    }
  }
  /* the guest as drawn at time tt: its place (CSS px), its body's attitude (camera frame: yaw 0 straight away, + to its
     right; pitch + nose up; roll + right wing down; el: the perched bird seen a little from above), its 22 floats */
  var GP22 = FP.pose(), GT1 = FP.pose(), GT2 = FP.pose(), GA = { x: 0, y: 0, yaw: 0, pitch: 0, roll: 0, el: 0, op: 1, phase: '', u: -1, lowFix: false };
  function gKey(tt, o) {
    var ks = PERCH.keys, i = 0;
    if (tt <= ks[0].t) { for (var q = 0; q < 22; q++) o[q] = ks[0].p[q]; return ks[0]; }
    while (i < ks.length - 1 && ks[i + 1].t < tt) i++;
    if (i >= ks.length - 1) { var l = ks[ks.length - 1]; for (q = 0; q < 22; q++) o[q] = l.p[q]; return l; }
    var a = ks[i], b = ks[i + 1], w = gss((tt - a.t) / Math.max(1e-6, b.t - a.t));
    gmix(o, a.p, b.p, w); GKO.pitch = a.pitch + (b.pitch - a.pitch) * w; GKO.yaw = a.yaw + (b.yaw - a.yaw) * w; GKO.lift = a.lift + (b.lift - a.lift) * w; return GKO;
  }
  var GKO = { pitch: 0, yaw: 0, lift: 0 };
  function gLife(tt, o) { var A = PERCH.life, a = A.arm * Math.sin(TAU * tt / 2.9 + 0.6), h = A.hand * Math.sin(TAU * tt / 2.9 - 0.4); o[0] += a; o[NP] += a; o[4] += h; o[NP + 4] += h; }
  function guestAt(g, tt, o) {
    var kind = g.kind, GL = glide22(kind, GT2), M = gmean(kind), j, sit = PERCH.keys[PERCH.keys.length - 1].t;
    o.el = 0; o.roll = 0; o.op = 1; o.lowFix = false; o.fixW = 0; o.lift = 0; o.holdFix = false;
    var air = (FL.speed || 12);   // m/s: the camera's way through the air, which the guest flies with (its world way: the camera's and its own)
    var mpp = g.dist * VW.tanX / (W / 2);
    if (g.phase === 'by') {
      /* (fix) on from where it was, turning to its way out at a bird's rate (its heading eased, at most about 14 deg a
         second on the window) and its pace eased to the calm's (judge-bio1: the fly-by turned at once) */
      var ub = tt - g.byT, a0b = g.byA0 === undefined ? Math.atan2(g.byU[1], g.byU[0]) : g.byA0, dab = angDiff(Math.atan2(g.byU[1], g.byU[0]), a0b), Tt = Math.max(1, 1.5 * Math.abs(dab) / (14 * DEG)), v0b = g.byV0 === undefined ? 0.9 * g.vc : g.byV0;
      var nb = Math.max(1, Math.ceil(ub * 30)), du = ub / nb, xb = g.byX, yb = g.byY, ab = a0b;
      for (j = 0; j < nb; j++) { var tq = (j + 0.5) * du; ab = a0b + dab * gss(tq / Tt); var vb = v0b + (0.9 * g.vc - v0b) * gss(tq / 1.5); xb += vb * Math.cos(ab) * du; yb += vb * Math.sin(ab) * du; }
      o.x = xb; o.y = yb;
      gbeat(kind, g.ph0 + g.rate * tt, 1, GT1); gmix(GP22, GL, GT1, gss(ub / 0.8));
      o.yaw = Math.atan2(Math.cos(ab) * g.vc * mpp, air) / DEG; o.pitch = 4; o.phase = 'by';
      o.op = inView(o.x, o.y, g.sp, g.sp) ? 1 : 0; if (!o.op && ub > 1) g.done = true;
      return o;
    }
    if (tt < g.tF) {   /* flying in: the measured beat, then the glide (the last 6 spans) */
      gPos(g, tt, o); gPos(g, tt + 0.1, GTMP);
      var vx = (GTMP.x - o.x) / 0.1, vy = (GTMP.y - o.y) / 0.1, eF = 1 - gss((tt - (g.Ti - 1.2)) / 1.2), vk = o.vk === undefined ? 1 : o.vk;
      gbeat(kind, g.ph0 + g.rate * tt, 1, GT1); gmix(GP22, GL, GT1, eF);
      /* (perch lane) it banks into its turns (its heading's rate on the window, right wing down turning right) and rocks */
      gPos(g, Math.max(0, tt - 0.125), GTMP2); var hr = Math.atan2(vy, vx) - Math.atan2(o.y - GTMP2.y, o.x - GTMP2.x);
      hr = tt > 0.13 ? Math.atan2(Math.sin(hr), Math.cos(hr)) / DEG / 0.125 * (vx >= 0 ? 1 : -1) : 0;
      o.roll = clamp(0.9 * hr, -32, 32) + (3.6 * Math.sin(TAU * 0.31 * tt + 2 * g.ph0) + 2.7 * Math.sin(TAU * 0.83 * tt + 5 * g.ph0)) * (1 - 0.6 * eF);
      if (tt >= g.Ti) {   /* (fix) the glide in: as it slows its wings come up and forward a little (the angle of attack raised), never quite still (perch lane: a real glide's trims, each wing its own, the primaries splaying as it slows) */
        gmix(GP22, GP22, PERCH.poses.flare, 0.4 * (1 - vk));
        var trm = 6.5 * Math.sin(TAU * 0.55 * tt + 6 * g.ph0) + 4.5 * Math.sin(TAU * 1.3 * tt + g.ph0), trm2 = 6.5 * Math.sin(TAU * 0.55 * tt + 6 * g.ph0 + 0.9) + 4.5 * Math.sin(TAU * 1.1 * tt + 2 * g.ph0), trh = 4 * Math.sin(TAU * 0.8 * tt + 3 * g.ph0);
        GP22[0] += trm; GP22[NP] += trm2; GP22[4] += trh; GP22[NP + 4] += 0.8 * trh; GP22[10] += 6 * (1 - vk); GP22[NP + 10] += 6 * (1 - vk);
      }
      o.yaw = Math.atan2(vx * mpp, air) / DEG; o.pitch = Math.atan2(-vy * mpp, air) / DEG + 4 + 12 * (1 - vk); o.phase = eF > 0.5 ? 'in' : 'glide';
      o.op = 1;   // (perch lane: no fades; its way in starts 2 spans beyond the window's edge)
      o.fixW = 0;
      g.yawLand = o.yaw; g.flap = eF;
      return o;
    }
    var sitT = tt - g.tT;
    if (tt < g.tT) {   /* the flare: wings up and forward (airbrakes), two braking beats, the body pitched up, onto the perch */
      gPos(g, tt, o);
      var uf = (tt - g.tF) / 0.6, wf = gss(uf * 1.4);
      gmix(GT1, GL, PERCH.poses.flare, wf); gbeat(kind, g.rate * 1.45 * (tt - g.tF), 0.9, GP22);
      var wb = (g.P.kind === 'pointer' ? 0.85 : 0.35) * (1 - gss((uf - 0.55) / 0.45));   // (perch lane)
      for (j = 0; j < 22; j++) GP22[j] = GT1[j] + wb * (GP22[j] - M[j]);
      o.yaw = g.yawLand + (g.face * PERCH.keys[0].yaw - g.yawLand) * gss(uf); o.pitch = 10 + 48 * gss(uf * 1.3) - 18 * gss((uf - 0.8) / 0.2); o.el = PERCH.el * gss(uf);
      o.phase = 'flare'; o.fixW = 0;   // (fix: the rest is found after touch-down, in the settle: its easing made the flare's way turn 40-190 deg/s)
      return o;
    }
    if (tt < g.tO) {   /* on the perch: A's keys, its breath, a sidling step or two */
      var K0 = gKey(Math.min(sitT, sit), GP22);
      gLife(sitT, GP22);
      o.x = g.px0 + g.ride[0]; o.y = g.py0 + g.ride[1];
      for (j = 0; j < g.steps.length; j++) o.x += g.stepD * gss((sitT - g.steps[j]) / 0.22) * (j % 2 ? -0.6 : 1);
      o.yaw = sitT < 0.7 ? g.face * (PERCH.keys[0].yaw + (K0.yaw - PERCH.keys[0].yaw) * gss(sitT / 0.7)) : g.face * K0.yaw;
      /* (fix) its body language: the stretch, the rouse, the shuffle (gPlan's acts) */
      var shx = 0, shy = 0;
      for (j = 0; j < (g.acts ? g.acts.length : 0); j++) {
        var ac = g.acts[j], ua = sitT - ac[0]; if (ua < 0) continue;
        if (ac[1] === 3) { var ws = gss(ua / ac[2]); shx += ac[3] * ws; shy += ac[4] * ws; continue; }
        if (ua > ac[2]) continue;
        var wa = Math.sin(Math.PI * ua / ac[2]);
        if (ac[1] === 1) gmix(GP22, GP22, PERCH.poses.foldHalf, 0.42 * gss(1.6 * wa));   // (the wings lifted a little over the back, and let down; perch lane: 0.9 read as an arrow side-on)
        else { var sk = 7 * wa * Math.sin(TAU * 7.5 * ua); GP22[0] += sk; GP22[NP] += sk; GP22[4] -= 0.7 * sk; GP22[NP + 4] -= 0.7 * sk; }   // (a quick shake)
      }
      o.x += clamp(shx, -0.22 * g.sp, 0.22 * g.sp); o.yaw += g.face * clamp(shy, -18, 18);
      if (GDEV.p22) for (j = 0; j < 22; j++) GP22[j] = GDEV.p22[j];
      if (GDEV.yaw !== undefined) o.yaw = g.face * GDEV.yaw;
      // (perch lane: its breath, a slow sway; GDEV.lp: the link guest pitched down, a lab knob: level it sat down among the letters)
      o.pitch = K0.pitch + (GDEV.pitch || 0) + 2.6 * Math.sin(TAU * sitT / 3.7 + 1.3) + 1.4 * Math.sin(TAU * sitT / 1.9) - (g.P.kind === 'link' ? (GDEV.lp !== undefined ? GDEV.lp : 0) : 0); o.el = GDEV.el !== undefined ? GDEV.el : PERCH.el; o.lift = (K0.lift - 0.045 * Math.sin(Math.PI * clamp(sitT / 0.32, 0, 1))) * g.sp + (g.P.kind === 'pointer' ? 0 : 1.2); o.fixW = 1;   // (fix: 1.2 px over a stroke or the underline, its ink off the letters' ink: L14)
      o.phase = sitT < 0.25 ? 'touch' : sitT < 1.2 ? 'settle' : 'sit';
      return o;
    }
    /* leaving: the crouch (0.24 s), the wings open to the stroke's top, the big quick beats, up and away */
    var uo = tt - g.tO, tC = g.noCrouch ? 0 : 0.24, tB = g.noCrouch ? 0.1 : 0.32;
    gKey(sit, GT1);
    if (uo < tB) { gbeat(kind, 0, 1.35, GT2); if (uo < tB - 0.12) gmix(GP22, GT1, PERCH.poses.open, gss(uo / 0.2)); else gmix(GP22, g.noCrouch ? GT1 : PERCH.poses.open, GT2, gss((uo - Math.max(0, tB - 0.12)) / 0.12)); }
    else { var ph = 0, n = Math.ceil((uo - tB) * 60), du = (uo - tB) / Math.max(1, n); for (j = 0; j < n; j++) ph += du * g.rate * (1.5 + (1.12 - 1.5) * gss(((j + 0.5) * du - 0.6) / 1.0)); gbeat(kind, ph, g.noCrouch ? 1.35 + (1.1 - 1.35) * gss((uo - tB - 0.8) / 0.8) : 0.75 + (1.1 - 0.75) * gss((uo - tB) / 0.9), GP22); }
    var crouch = tC ? -0.05 * g.sp * Math.sin(Math.PI * clamp(uo / tC, 0, 1)) : 0, ul = Math.max(0, uo - tC), TA = g.noCrouch ? 0.6 : 1.4;
    var d = ul < TA ? 0.95 * g.vc * ul * ul / (2 * TA) : 0.95 * g.vc * (ul - TA / 2);   // (from rest to the calm pace over 1.4 s)
    o.x = g.px0 + g.ride[0] + g.away[0] * d; o.y = g.py0 + g.ride[1] - crouch + g.away[1] * d - (g.noCrouch ? 0 : 0.3 * g.sp * gss(ul / 0.18));   // (perch lane: the leap)   // (fix: straight out along its way, no hop up first: judge-bio1's leave turns)
    var yS = PERCH.keys[PERCH.keys.length - 1].yaw, pS = PERCH.keys[PERCH.keys.length - 1].pitch;   // (perch lane: from the sitting attitude)
    o.yaw = g.face * yS + (Math.atan2(g.away[0] * g.vc * mpp, air) / DEG - g.face * yS) * gss(ul / 0.6);
    o.pitch = uo < tC ? pS - 8 * Math.sin(Math.PI * clamp(uo / tC, 0, 1)) : (g.noCrouch ? pS + (30 - pS) * gss(ul / 0.25) : 30) + (8 - 30) * gss(ul / 0.9); o.el = PERCH.el * (1 - gss(ul / 0.6)); o.fixW = 0; o.holdFix = true;   // (fix: the rest's offset held as it leaves: let go, it jumped the drawn bird sideways)
    o.op = inView(o.x, o.y, 2 * g.sp, 2 * g.sp) ? 1 : 0; if (!o.op && ul > 1) g.done = true;
    o.phase = uo < tC ? 'crouch' : uo < tC + 0.66 ? 'takeoff' : 'away';
    return o;
  }
  /* one guest posed in front of the camera (as a pin: the body at its place on the window, at the distance its span
     asks), its lowest points put on the perch's surface (the rest rule 'low', solved in the drawn perspective) */
  var GSLOT = [], GHALO = 1, GLOWX = 0;
  function guestBird(g, s, C, dt, L, tt) {
    var kind = g.kind, i;
    s.kind = kind; if (!s.X46) slotArrays(s);
    var spm = B_SPAN * (SORTS[kind] ? SORTS[kind].size : 1) * MODEL_K;
    g.dist = (spm / MODEL_K) * (W / 2) / (VW.tanX * gSpanPx(g) * (g.P.sk || 1));
    if (g.click && tt > g.tO + 0.5) { var rk = Math.exp(G_CLICK_RECEDE * (tt - g.tO - 0.5)); g.dist *= rk; if (gSpanPx(g) * (g.P.sk || 1) / rk < 3) { g.done = true; return null; } }   // (perch lane)
    var A = guestAt(g, tt, GA);
    if (!(A.op > 0.003)) return null;
    /* the attitude: forward from the camera's forward, yawed about its up, pitched, rolled; then tilted toward the eye */
    var yw = A.yaw * DEG, pt = A.pitch * DEG, rl = A.roll * DEG, el = A.el * DEG;
    var f0 = [C.f[0] * Math.cos(yw) + C.r[0] * Math.sin(yw), C.f[1] * Math.cos(yw) + C.r[1] * Math.sin(yw), C.f[2] * Math.cos(yw) + C.r[2] * Math.sin(yw)];
    var l0 = [-(C.r[0] * Math.cos(yw) - C.f[0] * Math.sin(yw)), -(C.r[1] * Math.cos(yw) - C.f[1] * Math.sin(yw)), -(C.r[2] * Math.cos(yw) - C.f[2] * Math.sin(yw))];
    var u0 = [f0[1] * l0[2] - f0[2] * l0[1], f0[2] * l0[0] - f0[0] * l0[2], f0[0] * l0[1] - f0[1] * l0[0]];
    var fx = f0[0] * Math.cos(pt) + u0[0] * Math.sin(pt), fy = f0[1] * Math.cos(pt) + u0[1] * Math.sin(pt), fz = f0[2] * Math.cos(pt) + u0[2] * Math.sin(pt);
    var ux = u0[0] * Math.cos(pt) - f0[0] * Math.sin(pt), uy = u0[1] * Math.cos(pt) - f0[1] * Math.sin(pt), uz = u0[2] * Math.cos(pt) - f0[2] * Math.sin(pt);
    var cr = Math.cos(rl), sr = Math.sin(rl);
    var lx = l0[0] * cr + ux * sr, ly = l0[1] * cr + uy * sr, lz = l0[2] * cr + uz * sr, zx = ux * cr - l0[0] * sr, zy = uy * cr - l0[1] * sr, zz = uz * cr - l0[2] * sr;
    if (el) {   /* about the camera's right: the bird's top toward the eye (its back and the folded panels show) */
      var ce = Math.cos(el), se = Math.sin(el);
      function tilt(v) { var a = v[0] * C.u[0] + v[1] * C.u[1] + v[2] * C.u[2], b = v[0] * C.f[0] + v[1] * C.f[1] + v[2] * C.f[2], c = v[0] * C.r[0] + v[1] * C.r[1] + v[2] * C.r[2];
        var a2 = a * ce + b * se, b2 = b * ce - a * se; return [C.r[0] * c + C.u[0] * a2 + C.f[0] * b2, C.r[1] * c + C.u[1] * a2 + C.f[1] * b2, C.r[2] * c + C.u[2] * a2 + C.f[2] * b2]; }
      var F2 = tilt([fx, fy, fz]), L2 = tilt([lx, ly, lz]), Z2 = tilt([zx, zy, zz]);
      fx = F2[0]; fy = F2[1]; fz = F2[2]; lx = L2[0]; ly = L2[1]; lz = L2[2]; zx = Z2[0]; zy = Z2[1]; zz = Z2[2];
    }
    LB.geom(kind, GP22, null, s.V46, 'this');
    if (!g.probe) { if ((A.fixW || 0) > 0 && !(g.pfw > 0) && g.last && g.cS !== undefined) { g.cS = g.last.y - A.y; g.cX = g.last.x - A.x; } g.pfw = A.fixW || 0; }
    var fixW = A.fixW || 0, lift = A.lift || 0, need = 0, needX = 0, py = A.y, cK = 1 - Math.exp(-Math.max(dt, 1e-3) / 0.35), bx, by, bz, it, NIT = fixW > 0 ? 5 : 1, ptr = g.P.kind === 'pointer';
    for (it = 0; it < NIT; it++) {
      var last = it === NIT - 1, pyd = last ? py - fixW * need - lift : py - fixW * need, pxd = A.x + fixW * needX;
      if (last) {
        var cy0 = pyd - A.y, cx0 = pxd - A.x;
        if (g.probe) { g.cS = cy0; g.cX = cx0; /* (the probe: the solved place itself) */ } else if (A.holdFix && g.cS !== undefined) { /* (fix: held) */ } else if (g.cS === undefined || fixW === 0) { g.cS = cy0; g.cX = cx0; } else { g.cS += (cy0 - g.cS) * cK; g.cX += (cx0 - g.cX) * cK; }
        pyd = A.y + g.cS; pxd = A.x + g.cX;
      }
      var nx = (2 * pxd / W - 1) * VW.tanX, ny = (1 - 2 * pyd / H) * VW.tanY;
      var dx = C.f[0] + C.r[0] * nx + C.u[0] * ny, dy = C.f[1] + C.r[1] * nx + C.u[1] * ny, dz = C.f[2] + C.r[2] * nx + C.u[2] * ny, dl = Math.sqrt(dx * dx + dy * dy + dz * dz);
      bx = dx * g.dist; by = dy * g.dist; bz = dz * g.dist;   // (at a fixed depth: its drawn size the same anywhere on the window)
      for (i = 0; i < NV; i++) {
        var x = s.V46[3 * i] * spm, y = s.V46[3 * i + 1] * spm, z = s.V46[3 * i + 2] * spm;
        s.X46[3 * i] = bx + x * fx + y * lx + z * zx; s.X46[3 * i + 1] = by + x * fy + y * ly + z * zy; s.X46[3 * i + 2] = bz + x * fz + y * lz + z * zz;
      }
      if (last) { A.yDrawn = pyd; A.xDrawn = pxd; break; }
      /* the rest rule: the lowest drawn point over the perch's surface on it (nothing over it: the lowest of all) */
      var worst = -1e9, k2 = (W / 2) / VW.tanX, anyOn = false, lowAll = -1e9, sx0 = 1e9, sx1 = -1e9;
      for (i = 0; i < NV; i++) {
        var X = s.X46[3 * i], Y = s.X46[3 * i + 1], Z = s.X46[3 * i + 2], zc = X * C.f[0] + Y * C.f[1] + Z * C.f[2];
        var sx = W / 2 + (X * C.r[0] + Y * C.r[1] + Z * C.r[2]) / zc * k2, sy = H / 2 - (X * C.u[0] + Y * C.u[1] + Z * C.u[2]) / zc / VW.tanY * (H / 2);
        if (sy > lowAll) GLOWX = sx; lowAll = Math.max(lowAll, sy); sx0 = Math.min(sx0, sx); sx1 = Math.max(sx1, sx);
        if (ptr) continue;
        var sfc = surfY(g.P.pts, sx - g.ride[0]); if (sfc === sfc) { anyOn = true; worst = Math.max(worst, sy - (sfc + g.ride[1])); }
      }
      if (!anyOn) worst = lowAll - (surfTop(g.P.pts) + g.ride[1]);
      need += worst / Math.max(fixW, 1e-3);
      needX += (A.x - (ptr ? GLOWX : 0.5 * (sx0 + sx1))) / Math.max(fixW, 1e-3);   // (its drawn middle over the perch's middle; perch lane: on the pointer its lowest point on the tip)
    }
    for (i = 0; i < 16; i++) { var vi = P16MAP[i]; if (vi < 0) { s.X16[3 * i] = bx; s.X16[3 * i + 1] = by; s.X16[3 * i + 2] = bz; } else { s.X16[3 * i] = s.X46[3 * vi]; s.X16[3 * i + 1] = s.X46[3 * vi + 1]; s.X16[3 * i + 2] = s.X46[3 * vi + 2]; } }
    s.body[0] = bx; s.body[1] = by; s.body[2] = bz; s.nb[0] = zx; s.nb[1] = zy; s.nb[2] = zz;
    s.fw[0] = fx; s.fw[1] = fy; s.fw[2] = fz; s.lw3[0] = lx; s.lw3[1] = ly; s.lw3[2] = lz; s.roll = A.roll; s.pitch = A.pitch;
    s.d = { span: spm / MODEL_K / MPU, model: spm / MPU };
    if (!projectBird(s, C)) return null;
    lightBird(s, L, true, dt);
    if (GDEV.tone) { var tw = GDEV.tone, tm = Math.max(s.E[0], s.E[1], s.E[2], GDEV.white || 0); for (i = 0; i < 3; i++) s.E[i] += (tm - s.E[i]) * tw; }
    s.hold = 1; s.birdL = gradedL(s.E, HOST.grade(), 1); s.groundL = -1;
    cloudWeights(s, C, 0, true);
    g.last = { x: A.xDrawn, y: A.yDrawn, phase: A.phase, yaw: A.yaw, pitch: A.pitch, el: A.el, op: A.op, flap: g.flap };
    return A;
  }
  function drawGuests(C, dt, L, N, nB, tr) {
    for (var i = 0; i < GU.list.length && nB < MAXP; i++) {
      var g = GU.list[i]; while (GSLOT.length <= i) GSLOT.push(null);
      if (!GSLOT[i]) { pinSlot(PIN_SLOTS.length); GSLOT[i] = PIN_SLOTS.pop(); GSLOT[i].key = 991 + i; }
      var s = GSLOT[i];
      if (!g.Tfix && g.phase === 'in' && tr - g.t0 >= g.Ti && g.Tr > 0.8) {   // (fix: the probe, once)
        g.Tfix = true; var kl = g.last, kS = g.cS, kX = g.cX, kp = g.pfw; g.probe = true; var Ap = guestBird(g, s, C, dt, L, g.tT + 1e-3); g.probe = false; g.last = kl; g.cS = kS; g.cX = kX; g.pfw = kp;
        if (Ap && Ap.xDrawn === Ap.xDrawn && Math.abs(Ap.xDrawn - g.T[0]) < 2 * g.sp && Math.abs(Ap.yDrawn - g.T[1]) < 2 * g.sp) {
          g.T = [Ap.xDrawn, Ap.yDrawn]; g.arc = [0]; var ox = g.G[0], oy = g.G[1];
          for (var q = 1; q <= 32; q++) { gBez(g, q / 32, GTMP); g.arc.push(g.arc[q - 1] + Math.sqrt((GTMP.x - ox) * (GTMP.x - ox) + (GTMP.y - oy) * (GTMP.y - oy))); ox = GTMP.x; oy = GTMP.y; }
          g.Lb = g.arc[32]; g.ve = Math.max(0.1 * g.vg, 2 * g.Lb / g.Tr - g.vg);
          GU.log.push({ t: +t.toFixed(2), ev: 'rest', dx: +(g.T[0] - g.px0).toFixed(2), dy: +(g.T[1] - g.py0).toFixed(2) });
        }
      }
      var A = guestBird(g, s, C, dt, L, tr - g.t0);
      if (!A) continue;
      packBird(nB, s, A.op, 1e5, false, N, g.P.kind === 'pointer' ? s.haloE : Math.min(s.haloE, GHALO), 1, -1, 1, s.floorPx);   // (at night its own light, as every bird's; its halo held small by the words)
      INST[nB * NF + 25] = 1;   // (the guest: exempt from the words' keep-off and from the land's depth: it is on the window's words)
      if (DUMP) { var db = dumpBird({ id: g.id, kind: 'guest', m: [] }, {}, s, tr - g.t0, A.op); db.guest = { why: g.why, perch: g.spec.id || 'pointer', phase: A.phase, x: +g.last.x.toFixed(2), y: +g.last.y.toFixed(2), yaw: +A.yaw.toFixed(2), pitch: +A.pitch.toFixed(2), el: +A.el.toFixed(2), sp: +g.sp.toFixed(2), pts: g.P.pts.map(function (q) { return [+q[0].toFixed(2), +q[1].toFixed(2)]; }), ride: g.ride.slice(), vc: +g.vc.toFixed(2) }; DUMP.push(db); }
      nB++;
    }
    return nB;
  }
  function guestReset() { GU.list.length = 0; GU.k = 0; GU.nWord = 0; GU.nPtr = 0; GU.lastWord = -1e9; GU.nextWord = G_FIRST; GU.lastPtr = -1e9; GU.flushAt = -1e9; GU.flushN = 0; GU.firstRest = true; GU.log.length = 0; GU.restT = 0; GU.px = -1; GU.ptrRetry = -1e9; }
  /* ================ end of GUESTS ================ */

  /* ---------------- (dev) pinned birds: a bird posed by hand in front of the camera, drawn by the same pass in the
     world's light (the turntable, the beat sheet): never in production (only through the dev hooks) ---------------- */
  var PINS = [], PIN_SLOTS = [];
  function pinSlot(i) {
    while (PIN_SLOTS.length <= i) PIN_SLOTS.push({ key: 777 + PIN_SLOTS.length, busy: true, on: true, d: null, kind: 'gull', P16: new Float64Array(48), X16: new Float64Array(48), D: new Float32Array(32), body: new Float64Array(3), nb: new Float64Array(3), fw: new Float64Array(3), lw3: new Float64Array(3), vw: new Float64Array(3), aw: new Float64Array(3),
      roll: 0, E: new Float64Array(3), eOk: false, fold: new Float64Array(6), hold: 1, cw: new Float64Array(3), cwH: new Float64Array(3), cwHt: new Float64Array(3).fill(-1e9), cwNow: new Float64Array(3), cwNext: -1, cwAt: -1e9, spanPx: 0, floorPx: 1, filt: 1, halo: 0, haloE: 3, legib: 0 });
    return PIN_SLOTS[i];
  }
  var PINW = { kind: 'gull', trim: ZTRIM }, PINS0 = { flap: 1, ph: 0, k: 1, D: 0.5, a: 0, e: 0 };
  /* a pin: { kind, x, y (CSS px: where its body is on the window), dist (m), yaw (deg: 0 flying straight away from the
     camera, + turned to its right), pitch (deg, + nose up), roll (deg, + right wing down), pose: 'glide' | 'flap' | 'shut',
     ph (the beat's phase), glide (its arm's set), span (m; default the kind's B_SPAN x size x MODEL_K), op } */
  function pinBird(Pn, s, C, dt, L) {
    var kind = FP.kinds[Pn.kind] && KMD[Pn.kind] ? Pn.kind : 'gull', i;
    s.kind = kind;
    if (!s.X46) slotArrays(s);
    var k = VW.outW / Math.max(1, W), nx = (2 * Pn.x / W - 1) * VW.tanX, ny = (1 - 2 * Pn.y / H) * VW.tanY;
    var dx = C.f[0] + C.r[0] * nx + C.u[0] * ny, dy = C.f[1] + C.r[1] * nx + C.u[1] * ny, dz = C.f[2] + C.r[2] * nx + C.u[2] * ny, dl = Math.sqrt(dx * dx + dy * dy + dz * dz);
    var bx = dx / dl * Pn.dist, by = dy / dl * Pn.dist, bz = dz / dl * Pn.dist;
    /* its attitude in the camera's frame: forward from the camera's forward, yawed about the camera's up, pitched, rolled */
    var yw = (Pn.yaw || 0) * DEG, pt = (Pn.pitch || 0) * DEG, rl = (Pn.roll || 0) * DEG;
    var f0 = [C.f[0] * Math.cos(yw) + C.r[0] * Math.sin(yw), C.f[1] * Math.cos(yw) + C.r[1] * Math.sin(yw), C.f[2] * Math.cos(yw) + C.r[2] * Math.sin(yw)];
    var l0 = [-(C.r[0] * Math.cos(yw) - C.f[0] * Math.sin(yw)), -(C.r[1] * Math.cos(yw) - C.f[1] * Math.sin(yw)), -(C.r[2] * Math.cos(yw) - C.f[2] * Math.sin(yw))];   // (its left: the camera's left turned with it)
    var u0 = [f0[1] * l0[2] - f0[2] * l0[1], f0[2] * l0[0] - f0[0] * l0[2], f0[0] * l0[1] - f0[1] * l0[0]];
    var fx = f0[0] * Math.cos(pt) + u0[0] * Math.sin(pt), fy = f0[1] * Math.cos(pt) + u0[1] * Math.sin(pt), fz = f0[2] * Math.cos(pt) + u0[2] * Math.sin(pt);
    var ux = u0[0] * Math.cos(pt) - f0[0] * Math.sin(pt), uy = u0[1] * Math.cos(pt) - f0[1] * Math.sin(pt), uz = u0[2] * Math.cos(pt) - f0[2] * Math.sin(pt);
    var cr = Math.cos(rl), sr = Math.sin(rl);
    var lx = l0[0] * cr + ux * sr, ly = l0[1] * cr + uy * sr, lz = l0[2] * cr + uz * sr, zx = ux * cr - l0[0] * sr, zy = uy * cr - l0[1] * sr, zz = uz * cr - l0[2] * sr;
    /* (physics) the lab's poses: 'glide' (its load), 'flap' (the cycle at ph, blended by w, the stroke k), 'shut', or
       Pn.p22 (22 floats, as given) */
    PINW.kind = kind; PINS0.ph = Pn.ph || 0; PINS0.k = Pn.k === undefined ? 1 : Pn.k; PINS0.D = KMD[kind].D; PINS0.a = PINS0.e = Pn.pose === 'flap' ? (Pn.w === undefined ? 1 : Pn.w) : 0;
    if (Pn.p22) { for (i = 0; i < 22; i++) s.P22[i] = Pn.p22[i]; s.B3[0] = s.B3[1] = s.B3[2] = 0; if (Pn.b3) { s.B3[0] = Pn.b3[0]; s.B3[1] = Pn.b3[1]; s.B3[2] = Pn.b3[2]; } }
    else { WO.swing = 1; WO.shut = Pn.pose === 'shut' ? shut22(kind) : null; BW.poseS(PINW, PINS0, 0, s.P22, s.B3, WO); WO.shut = null; }
    if (Pn.set && Pn.pose !== 'shut') { s.P22[0] += Pn.set; s.P22[NP] -= Pn.set; }   // (fix round: the tattoo's set, + the left arm up)
    LB.geom(kind, s.P22, s.B3, s.V46, 'this');
    var sp = Pn.span || B_SPAN * (SORTS[kind] ? SORTS[kind].size : 1) * MODEL_K;
    var ox = bx, oy = by, oz = bz;
    for (i = 0; i < NV; i++) {
      var x = s.V46[3 * i] * sp, y = s.V46[3 * i + 1] * sp, z = s.V46[3 * i + 2] * sp;
      s.X46[3 * i] = ox + x * fx + y * lx + z * zx; s.X46[3 * i + 1] = oy + x * fy + y * ly + z * zy; s.X46[3 * i + 2] = oz + x * fz + y * lz + z * zz;
    }
    for (i = 0; i < 16; i++) { var vi = P16MAP[i]; if (vi < 0) { s.X16[3 * i] = ox; s.X16[3 * i + 1] = oy; s.X16[3 * i + 2] = oz; } else { s.X16[3 * i] = s.X46[3 * vi]; s.X16[3 * i + 1] = s.X46[3 * vi + 1]; s.X16[3 * i + 2] = s.X46[3 * vi + 2]; } }
    s.body[0] = ox; s.body[1] = oy; s.body[2] = oz; s.nb[0] = zx; s.nb[1] = zy; s.nb[2] = zz;
    s.fw[0] = fx; s.fw[1] = fy; s.fw[2] = fz; s.lw3[0] = lx; s.lw3[1] = ly; s.lw3[2] = lz; s.roll = Pn.roll || 0; s.pitch = Pn.pitch || 0;
    s.d = { span: sp / MODEL_K / MPU, model: sp / MPU };
    if (!projectBird(s, C)) return false;
    lightBird(s, L, true, dt);
    s.hold = 1; s.birdL = gradedL(s.E, HOST.grade(), 1); s.groundL = -1;
    cloudWeights(s, C, 0, true);
    return true;
  }
  function drawPins(C, dt, L, N, nB) {
    for (var i = 0; i < PINS.length && nB < MAXP; i++) {
      var Pn = PINS[i], s = pinSlot(i);
      if (!pinBird(Pn, s, C, dt, L)) continue;
      if (Pn.lod !== undefined) s.lod = Pn.lod;
      packBird(nB, s, Pn.op === undefined ? 1 : Pn.op, 0.6 * s.d.model * MPU + 2, !Pn.noocc, Pn.N !== undefined ? Pn.N : N, s.haloE, 1, -1, 1, Pn.floor !== undefined ? Pn.floor : s.floorPx);
      if (DUMP) DUMP.push(dumpBird({ id: 'pin' + i, kind: 'pin', m: [] }, {}, s, 0, 1));
      nB++;
    }
    return nB;
  }

  /* (physics, dev) a bird's wing now: [e, a, psi, flap, its rate] */
  function wingDev(m, tau) { if (!m.w || !m.w.wing) return null; var S = BW.state(m.w.wing, tau, BSt); return [+S.e.toFixed(4), +S.a.toFixed(4), +S.psi.toFixed(4), S.flap, +m.w.wing.f.toFixed(4)]; }

  /* ---------------- the hooks ---------------- */

  weather(); r2 = vstream(2); r2x = r2(); r2y = r2(); errInit(); roostPsi = TAU * vstream(7001)();
  makeProgram();   // (asked for now: the engine links it while its still sky shows)
  return {
    step: step,
    /* (round 3) reduced motion: the still sky planned a share a call while the engine's still sky shows; true once done */
    prepare: function () { forcedCheck(); if (!HOST.reduced()) return true; return stillStep(STILL_Q); },
    draw: function () {
      forcedCheck();
      if (!ready()) return;
      if (!FORCED && !HOST.bindTextures()) return;
      if (HOST.reduced()) stillSky();
      if (FORCED) { HOST.view(VW); forcedCam(); }
      drawPaper();
    },
    visit: function () { clearAll(); guestReset(); CVH.n = 0; CVH.i = 0; },
    reset: function () { roostPsi = TAU * vstream(7001)(); roostCls = ''; roostK = 0; LPEND = null; guestReset(); t = 0; flightNo = 0; crowdN = 0; HIDJOB = -1e9; weather(); r2 = vstream(2); r2k = 0; r2x = r2(); r2y = r2(); WK[20] = -1; dirty = true; clearAll(); errInit(); CH.n = 0; CH.i = 0; GVT = -1; calmOn = -1; HOLD.until = -1e9; HOLD.rest = -1e9; HOLD.on = 0; HOLD.refused = 0; HOLD.spared = 0; STILL.on = false; CVH.n = 0; CVH.i = 0; stageReset(); },
    lost: function () { PROG = null; VAO = null; VBO = null; RING = null; BT = null; BROKEN = false; SAMPLERS = false; makeProgram(); },
    boot: function () { makeProgram(); bootRing(); },   // (E1: the boot's stage B: the instance ring and its warm entry)
    repose: function () { lastDraw = -1; },   // (development: the next draw poses every bird afresh)
    /* development: the model measured (a kind's box table), pins, the A/B switch and a frame's dump */
    dev: {
      measure: function (kind, fresh) { return measureNorm(kind, fresh); },
      /* (physics) the one tone two ways for random facets and lights: oneTone against facetpose's own light()'s ONE */
      oneCheck: function (n) { var r = LB.rng(99), d = 0, N = new Float64Array(3 * NFAC), FE = new Float64Array(3 * NFAC), A = new Float64Array(NFAC), e = [0, 0, 1];
        function u3(o, i) { var x = r() * 2 - 1, y = r() * 2 - 1, z = r() * 2 - 1, l = Math.sqrt(x * x + y * y + z * z) || 1; o[i] = x / l; o[i + 1] = y / l; o[i + 2] = z / l; }
        for (var q = 0; q < (n || 200); q++) { for (var f = 0; f < NFAC; f++) { u3(N, 3 * f); A[f] = r() * 10; } u3(e, 0); var L = { sunDir: [0, 0, 1], sunVis: r(), sunC: [r() * 2, r() * 2, r() * 2], ambU: [r(), r(), r()], ambD: [r(), r(), r()], clLit: [r(), r(), r()] }; u3(L.sunDir, 0);
          var a = FP2.light('gull', N, e, L, FE, A), b = oneTone(N, e, L, A); for (var k = 0; k < 3; k++) d = Math.max(d, Math.abs(a[k] - b[k])); }
        return d; },
      pins: function (list) { PINS = list || []; },
      trim: function (v) { if (v !== undefined) LEAN_TRIM = +v; return LEAN_TRIM; },
      dump: function (on) { DUMP = on ? [] : null; },
      frame: function () { return DUMP ? DUMP.slice() : null; },
      stage: function (o) { return stageDev(o); },
      cam: function () { return { v: Array.from(CAMV), a: Array.from(CAMA), n: CVH.n }; }
    },
    state: function (o) {
      if (o && o.fx) for (var k in o.fx) FX[k] = !!o.fx[k];
      if (o && o.trim !== undefined) LEAN_TRIM = +o.trim;
      if (o && o.set !== undefined) SET_ON = !!o.set;   // (fix round, dev: the tattoo's set off for the A film)
      if (o && o.wind !== undefined) WIND_ON = !!o.wind;   // (way-other, dev: the air still, as before, for the A runs)
      if (o && o.windAir !== undefined) WIND_K = Math.max(0, +o.windAir) / 6.5;   // (shape, dev: the world's wind as if it blew this many m/s at the birds' height)
      if (o && o.leanair !== undefined) LEAN_AIR = !!o.leanair;
      if (o && o.leanh !== undefined) LEAN_H = clamp(+o.leanh, 0, 1);   // (shape, dev: step 4d's share, for its trial)
      if (o && o.lean !== undefined) { var lo0 = o.lean; if (lo0.w !== undefined) LEAN_W = +lo0.w; if (lo0.mode !== undefined) LEAN_MODE = +lo0.mode; if (lo0.psi) LEAN_PSI = lo0.psi.slice(); if (lo0.pace !== undefined) LEAN_PACE = +lo0.pace; }   // (shape, dev: step 6's dials, for their trials)   // (shape, dev: the join off, the planner's lean in still air)
      if (o && o.sep !== undefined) SEP_ON = !!o.sep;   // (fix round, dev: the separation off)
      if (o && o.rate !== undefined) RATE_MODE = o.rate === 'real' || o.rate === 'scaled' ? o.rate : 'class';   // (physics, dev: the owner's decision 1, for the next flights)
      if (o && o.sched !== undefined) SCHED_MODE = o.sched === 'calm' || o.sched === 'continuous' ? o.sched : 'measured';   // (physics, dev: decision 2)
      if (o && o.dump !== undefined) DUMP = o.dump ? [] : null;
      if (o && o.guest !== undefined) { var go = o.guest; if (go.dev) GDEV = go.dev; if (go.force) GU.force = go.force; if (go.on !== undefined) GU.on = !!go.on; if (go.clicks !== undefined) GU.clickOn = !!go.clicks; if (go.next !== undefined) GU.nextWord = +go.next; if (go.log) return { log: GU.log.slice(), list: GU.list.map(function (g) { return { id: g.id, why: g.why, phase: g.phase, kind: g.kind, last: g.last || null, tO: g.tO, tT: g.tT, t0: g.t0 }; }), nWord: GU.nWord, nPtr: GU.nPtr, sp: GU.sp, restT: GU.restT }; return true; }
      if (o && o.roost) return { psi: roostPsi, cls: skyCls(), flights: flights.map(function (F) { return { id: F.id, cls: F.cls, roost: F.roost, kind: F.kind, sort: F.sort, n: F.n, eg: F.eg || null, egSet: F.egSet || 0 }; }) };
      if (o && o.pins !== undefined) PINS = o.pins || [];
      if (o && o.stage !== undefined) return stageDev(o.stage);
      if (o && o.next !== undefined) { NEXT_FORCE = o.next; if (o.now) { tNext = Math.min(tNext, t); firstNext = true; } return true; }
      if (o && o.frame) return DUMP ? DUMP.slice() : null;
      if (o && o.leanprobe) return leanProbe();   // (shape, dev: the join's test: leanAir's five points for every drawn travelling bird, now)
      if (o && o.pose) { forcedCheck(); NOGL = true; try { if (HOST.reduced()) stillSky(); drawPaper(); } finally { NOGL = false; } return DUMP ? DUMP.slice() : null; }   // (way-path, dev: a frame's poses and dump without its draw: a ticked survey)
      if (o && o.trials !== undefined) { var tl = TRIALLOG; TRIALLOG = o.trials ? [] : null; if (tl) return tl; }
      if (o && o.guardlog !== undefined) { var gl0 = GLOG; GLOG = o.guardlog ? [] : null; if (gl0) return gl0; }
      var C = camDrawn(), CS0 = camStep();
      var out = { t: t, flights: [], drawn: STATS.drawn, planned: STATS.planned, steps: STATS.steps, workMax: STATS.workMax, costs: STATS.costs, landed: Object.assign({}, STATS.landed), fails: Object.assign({}, STATS.fails), jobs: (o && o.jobs) ? STATS.jobs.slice() : undefined,
        guard: Object.assign({}, STATS.guard), away: STATS.away, holds: HOLD.on, holdRefused: HOLD.refused, holdSpared: HOLD.spared, holding: t < HOLD.until, err90: [1, 2, 4, 6, 8, 10, 12, 15, 20].map(function (h) { return +errAt(h).toFixed(2); }), calm: calmOn,
        job: job ? job.mode : null, tNext: tNext, fx: Object.assign({}, FX), fills: STATS.fill || 0, lv: { on: liveOn(), made: STATS.lvMade || 0, nospawn: STATS.lvNoSpawn || 0, drop: STATS.lvDrop || 0, gone: STATS.lvGone || 0, rescue: STATS.lvRescue || 0, avoid: STATS.lvAvoid || 0, words: STATS.landed.words || 0, why: STATS.lvWhy || null, last: STATS.lvSeenLast || null }, W: W, H: H, mpu: MPU, forced: FORCED, openSky: OPEN_SKY, fit: FIT_K, trim: LEAN_TRIM, set: SET_ON, sep: SEP_ON, stage: stageState(), rate: RATE_MODE, sched: SCHED_MODE,
        cam: { f: cam.f, pitch: Math.atan2(cam.s, cam.c), floorY: floorY },
        CB: CS0 ? { pos: Array.from(CS0.pos), f: Array.from(CS0.f), r: Array.from(CS0.r), u: Array.from(CS0.u) } : null,
        CD: C ? { pos: Array.from(C.pos), f: Array.from(C.f), r: Array.from(C.r), u: Array.from(C.u) } : null,
        VW: { tanX: VW.tanX, tanY: VW.tanY, dpr: VW.dpr, bdpr: VW.bdpr, cssW: VW.cssW, cssH: VW.cssH, outW: VW.outW, outH: VW.outH },
        FL: { view: FL.view, psi: FL.psi, speed: FL.speed, y: FL.y, ground: FL.ground },
        words: words.map(function (q) { return [q.l, q.t, q.r, q.b, q.m]; }) };
      FW.ox = C.pos[0]; FW.oy = C.pos[1]; FW.oz = C.pos[2];
      flights.concat(PLACES).forEach(function (F) {
        var tau = t - F.t0, b = [];
        F.m.forEach(function (m) {
          where(F, m, tau, wb); projReal(wb.x, wb.y, wb.z, C, tmp3);
          var s = m.s, pl = null;
          if (!F.place) { spot(F, m, tau, tmp2); pl = [+tmp2.x.toFixed(2), +tmp2.y.toFixed(2)]; }   // (where the planner's still view sees it: against the world)
          b.push({ pl: pl, x: +tmp3.x.toFixed(2), y: +tmp3.y.toFixed(2), n: +tmp3.n.toFixed(3), z: +tmp3.z.toFixed(1), w: [+wb.x.toFixed(2), +wb.y.toFixed(2), +wb.z.toFixed(2)], on: !!(s && s.on), op2: s ? +(s.lastOp || 0).toFixed(4) : 0, app: s ? s.lastApp : 0, sb: s ? s.lastSB : 1,
            shown: s ? s.shownT : -1, vis: s ? s.vis : false, hw: m.d.hw, hh: m.d.hh, face: s ? s.face : 0, wf: s ? +s.wf.toFixed(2) : 0, ph: beat(m, tau), wg: wingDev(m, tau), span: +(m.d.span * MPU).toFixed(2), roll: s ? +s.roll.toFixed(2) : 0, spanPx: s ? +(s.spanPx || 0).toFixed(2) : 0, box: s && s.on ? [+s.bx0.toFixed(1), +s.by0.toFixed(1), +s.bx1.toFixed(1), +s.by1.toFixed(1)] : null });
        });
        out.flights.push({ id: F.place ? 'p' + F.key : F.id, kind: F.live ? F.pat : F.kind, beh: F.beh || null, sort: F.sort, n: F.n, dir: F.dir, role: F.role || null, ws: F.ws === undefined ? null : +F.ws.toFixed(3), wsKind: F.wsKind || null, dirRole: F.dirRole || 0, swept: !!F.swept, tau: +tau.toFixed(2), dur: +F.dur.toFixed(2), v: F.v, vPx: F.vPx, n0: F.n0, gone: F.gone || 0, place: !!F.place, stage: F.stage || null, gift: !!F.gift, near: !!F.near,
          yawW: F.place ? null : F.yaw, tat: F.tattoo === undefined ? null : +(+F.tattoo).toFixed(4), lean: !!F.lean, path: F.path && !F.place ? { h: F.path.h, k: F.path.k, s1: F.path.s1, s2: F.path.s2, g: F.path.g, x: F.path.x, y: F.path.y, z: F.path.z, sa: F.sa, len: F.len, s0: F.s0, q: F.q } : null, lastSeen: F.lastSeen, firstSeen: F.firstSeen, enterT: F.enterT, seenSpan: F.seenSpan, away: !!F.away, birds: b });
      });
      return out;
    }
  };
  });
})();
