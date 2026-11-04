// The comments in this file keep the tags and file names of the world's development record (design-v5, its rounds,
// fixes and judges; notes.md, w04b_sky.js, diag.js and the like), which lives outside this repository (CLAUDE.md).
/* inkbirds.js — the ink birds of the live site (birds.v9.js), living in the world.

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
  var GROW = 0.012;            // a bird comes nearer (grows) by at most this share of its size a second: looming pulls the eye ...
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
  var WANDER = [3, 7];         // px: the track's slow wander, by the breeze, which every bird of a flight flies through ...
  var WAVE = [260, 480];       // px: ... its wavelength
  var HEAVE = [2, 5];          // px: a gust lifting or dropping the whole flight, by the breeze ...
  var HEAVE_T = [10, 16];      // s: ... this slowly

  /* the patterns */
  var COUNT = [11, 19, 22, 0, 18, 5, 14, 4, 7];   // % of flights of 1, 2 ... 9 birds (never four)
  var ARM_X = [1.5, 1.9];      // spans back, per place along an arm of a V, a J or an echelon
  var ARM_Y = [0.9, 1.1];      // spans aside, per place (level in the air: the arms nearer and farther)
  var JITTER = 0.3;            // no slot is where a ruler would put it: each is off by up to this share
  var FILE = [1.6, 2.2];       // spans between birds in a line ...
  var FILE_Y = 0.5;            // ... the line undulating up or down by up to this many spans a bird (and aside, a third as much)
  var PAIR_X = [0.9, 1.4], PAIR_Y = [0.95, 1.2];  // spans: the second of a pair, behind and aside (nearer or farther)
  var LOOSE = [1.5, 2.6];      // spans: a loose flock's spacing
  var DRIFT_L = [0.08, 0.18];  // spans: every bird drifts about its place, forward and back ...
  var DRIFT_P = [0.15, 0.3];   // ... aside and up and down ...
  var DRIFT_T = [3, 6.5];      // s: ... this quickly, each on its own
  var SIZE_VAR = 0.08;         // birds of one flight differ in size by up to this share
  var SPACE = 4;               // px: the least ink-to-ink gap between two birds of a flight, in the air
  var BAND_GAP = 24;           // px between the heights two flights keep: one flight to a band
  var GATHER = 0.4;            // of skeins and lines: a scatter that gathers into its pattern as it crosses ...
  var LOOSEN = 0.15;           // ... or a pattern that loosens
  var GATHER_AT = [0.4, 0.9];  // s: each bird setting off for its place this long after the one ahead ...
  var GATHER_T = [6, 10];      // s: ... and taking this long to reach it
  var FILE_G = [2, 2.4];       // spans between birds in the file a V opens out of
  var REL = 0.2;               // no bird moves within its flock faster than this share of the flight's speed (birds never fly backward)
  var GATHER_MAX = 16;         // s: a gathering that would take longer does not happen
  var STRAGGLE = [0.06, 0.1];  // a straggler catches up at this much over the flight's speed ...
  var STRAGGLE_T = [14, 22];   // ... over this many seconds
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
    goose:   { size: 1, depth: [0.6, 1], pace: [2.4, 2.8], hz: [2.3, 2.7], flaps: [[16, 36], [0.4, 0.9]],
               rise: [5.2, 6.6], drop: [3.8, 5], out: [5.6, 7.2], up: [28, 36], down: [34, 42], tail: 0.05, glide: [0.85, 1.05], tilt: 4 },
    ibis:    { size: 1, depth: [0.65, 1.05], pace: [2.2, 2.6], hz: [2.6, 3], flaps: [[4, 10], [0.9, 2.2]], sink: 0.08,
               rise: [5, 6.4], drop: [3.6, 4.8], out: [5.4, 7], up: [28, 36], down: [34, 42], tail: 0.4, glide: [0.8, 1], tilt: 4 },
    gull:    { size: 1.15, depth: [0.75, 1.3], pace: [1.9, 2.3], hz: [2.2, 2.6], flaps: [[3, 7], [1.4, 3.6]], sink: 0.12,
               rise: [6.2, 8], drop: [4.4, 6], out: [6.4, 8.4], up: [22, 30], down: [28, 36], tail: 0, glide: [0.75, 1], tilt: 7, wheel: 1.6, wander: 1.5 },
    heron:   { size: 1.35, depth: [0.9, 1.3], pace: [1.8, 2.1], hz: [1.9, 2.2], flaps: [[20, 44], [0.5, 1]],
               rise: [5.8, 7.2], drop: [4.2, 5.4], out: [5.6, 7], up: [30, 38], down: [36, 44], tail: 1, glide: [0.85, 1.05], tilt: 3 },
    crow:    { size: 0.9, depth: [0.75, 1.2], pace: [2.7, 3.1], hz: [2.8, 3.2], flaps: [[14, 30], [0.3, 0.8]],
               rise: [4.8, 6], drop: [3.6, 4.6], out: [5, 6.4], up: [30, 40], down: [36, 46], tail: 0, glide: [0.85, 1.05], tilt: 5 },
    finch:   { size: 0.62, depth: [0.9, 1.3], pace: [3.2, 3.8], hz: [5, 6], flaps: [[2, 4], [0.28, 0.5]], bound: [0.35, 0.55],
               rise: [4, 5.2], drop: [3.2, 4.2], out: [4.2, 5.6], up: [30, 40], down: [36, 46], tail: 0, glide: [0.15, 0.3], tilt: 6 },
    swallow: { size: 0.75, depth: [0.85, 1.25], pace: [3, 3.6], hz: [3.8, 4.6], flaps: [[2, 4], [0.9, 2.2]], sink: 0.1,
               rise: [4.6, 5.8], drop: [3.4, 4.4], out: [6.2, 8], up: [26, 34], down: [30, 40], tail: 1, glide: [0.8, 1.05], tilt: 8, wheel: 1.8, wander: 3, wave: 1.3 },
    stork:   { size: 1.25, depth: [0.75, 1.15], pace: [1.6, 2], hz: [1.9, 2.2], flaps: null,
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
  var MAXB = 12;               // birds at once (the live site's twelve SVGs)
  var QUOTA_STEP = 300;        // path points of planning a fixed step (1/60 s), a bird's place counted at its cost (SPOT_COST; round 2: 200, a place counted as 1)
  var SHADE = 0.008;           // the ink's share of the scene's light (a dark bird's black lifted a breath toward it; round 2's 0.035, with the air on top of the live's TONE, paled a goose at mid distance to half the live black's contrast; round 3's first 0.012 with AIR_INK 0.4 left DUNES's at 73-80 %)
  var AIR_INK = 0.25;          // (round 3) the share of the air's haze the ink takes (the engine's fog and ground haze at its distance): all of it paled DUNES's birds at 40-120 m to 61-72 % of the live black's contrast (ink2.py), ABOVE's to 82-87 %; 0.4 (with SHADE 0.012) 73-80 % and 87-90 %; 0.25 80-85 % and 90-93 %
  var INK_MIN = 2;             // (round 3) dark ink held at least this contrast against the frame under it (a far bird over dark land in the haze)
  var CLEAR_BAND = 60;         // (round 2) the judge's preference for a band wholly above or below the words, on a window WIDE or wider (a path's room counts up to ROOMY 60; world5 E0 Fix 2: 20, and a drag swept flights at the lettered name's height across it)
  var GLARE = [0.62, 0.95, 0.35, 0.5];   // the light wrap: the glare where the frame's light under a stroke runs from [0] to [1] (with the bloom about it); the pen thinned by [2] of it, the ink lifted toward the light by [3] (round 2: 0.4 and 0.85 lifted a bird on ABOVE's great disc 77-93 levels, to within 18 of the disc: all but gone; now 45-64, a pale, thinner mark)
  var NIGHT = [0.3, 3.2];      // light ink (the night's words): mixed this far toward the sky's own light at the bird, and held at least this contrast against it
  var FX = { air: true, lit: true, glare: true, land: true, cloud: true };   // the effects (development: each can be turned off)

  /* (round 3) the calm on the window, the words and the course's errors */
  var CALM_K = 0.45;           // the camera's turn asked to sweep the land across the window at most this share of the live's median pace there (HOST.calm: 0.72 deg/s on a 1440 px desktop, 0.9 on a phone; tried at 0.65: the sweep, a steady 18 px/s as the autopilot turns at the cap, raced or stalled the birds on the window) ...
  var CALM_EV = 2;             // ... and its way round a cloud's body at most this many times that
  var BACK_PX = 6;             // px/s: through the trusted course no bird of a path moves against the way it faces on the window faster than this ...
  var PACE_SEEN = 1.2;         // ... nor faster across the window than the live's fastest crossing (topSpeed: 40 px/s at 1440, 26 on a phone) with the calm's sweep stretched this much (a window's edge) for more than PACE_T of it, nor ever 1.18 times that (round 3: 1.6 let the pace reach 57-60 px/s at the 98th percentile at 1440, the judges' bound 55; 1.4 tried: fewer paths refused through ABOVE's turns round a cloud's body (the view sweeping 25 px/s), at the bound's expense) ...
  var PACE_T = 1.2;            // s (and nor slower on the window than SLOW_SEEN px/s, hanging there, for more than this)
  var SLOW_SEEN = 9;           // px/s (the live's slowest 2 %: 10-11)
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
  function maxFlights() { return (W >= WIDE ? FLIGHTS[1] : FLIGHTS[0]) - (placeSeen ? 1 : 0); }   // (one fewer while a place's thermal is seen)

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
    if (VP.still) { VP.yaw[0] = VP.yaw0; VP.pitch[0] = VP.pitch0; VP.roll[0] = 0; if (C) { VP.x[0] = C.pos[0]; VP.y[0] = C.pos[1]; VP.z[0] = C.pos[2]; } VP.n = 1; }
  }
  /* the course out to sample k (more chunks as needed) */
  function viewNeed(k) {
    if (VP.still) return;
    while (VP.n <= k && VP.n < VP_N) {
      var n0 = VP.n; HOST.ahead(false, Math.min(VP_CHUNK, VP_N - VP.n), STEP, VP);
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
  (function () { for (var i = 0; i < MAXB; i++) slots.push({ key: 9100 + i * 97, busy: false, on: false, face: 1, sgn: 1, d: null, shownT: -1, vis: false, still: false, X: new Float64Array(15), J: new Float32Array(10), bob: 0, lw: 2, op: 1, wf: 0, land: 1, pw: new Float32Array(2), n: 1, ok: false, lastOp: 0, lastApp: 0, lastSB: 1, sbS: 1, sbT: -1 }); })();
  function freeSlots() { var n = 0, i; for (i = 0; i < slots.length; i++) if (!slots[i].busy) n++; return n; }
  function dress(s, d) { s.d = d; s.on = false; s.vis = false; s.still = false; s.shownT = -1; s.ok = false; s.sbS = 1; s.sbT = -1; }
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
    return pp.n < FAR ? 0 : side(pp.x, pp.y) | (wp.y <= 0 && pp.y > H ? 8 : 0);
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

  /* a bird's day on the wing: bursts of beats [start, end, start, end ...],
     each followed by a glide (or a bound), from well before the flight to its end */
  function bursts(r, f, how, from, to) {
    var out = [], t = from - r() * 10, b;
    while (t < to) {
      b = Math.round(pick(r, how[0])) / f;
      out.push(t, t + b);
      t += b + pick(r, how[1]);
    }
    return out;
  }
  /* the burst at or before t: its index in the list (even), or -2 before the first */
  function burstAt(segs, t) {
    var lo = 0, hi = segs.length / 2, m;
    if (!segs.length || t < segs[0]) return -2;
    while (hi - lo > 1) { m = (lo + hi) >> 1; if (segs[2 * m] <= t) lo = m; else hi = m; }
    return 2 * lo;
  }
  /* where a bird is in its wing-beat at time t: its phase in [0, 1) (0 the
     wrists up, as drawn), -1 while it glides, -2 while a bounding bird falls
     with its wings shut. Each bird beats at its own rate from its own point
     in the beat; in a line a bird starts its beats and its glides a little
     after the one ahead (its delay) */
  function beat(m, t) {
    var w = m.w, c, k;
    if (!w) return -1;
    t -= m.delay;
    k = burstAt(w.segs, t);
    if (k < 0) return w.bound ? -2 : -1;
    c = m.f * (t - w.segs[k]) - m.half;
    if (c < 0 || c >= Math.round((w.segs[k + 1] - w.segs[k]) * w.f)) return w.bound ? -2 : -1;
    return c - Math.floor(c);
  }
  /* the wrists through a beat: down through DOWN of it and up through the rest, easing at the top and the bottom */
  function wrists(ph) {
    return ph < DOWN ? mix(ease(ph / DOWN), WRIST[0], WRIST[1]) : mix(ease((ph - DOWN) / (1 - DOWN)), WRIST[1], WRIST[0]);
  }
  /* how far a bird is carried below its path by its wings (units of the
     air): a flap-glider sinks a little through each glide and climbs back
     through the next burst; a bounding bird rises through its beats and
     falls through the bound */
  function lift(m, t) {
    var w = m.w, s, k, a, b, n, d, h;
    if (!w || !(w.sinks || w.bound)) return 0;
    s = w.segs; t -= m.delay;
    k = burstAt(s, t);
    if (k < 0) return 0;
    a = s[k]; b = s[k + 1]; n = k + 2 < s.length ? s[k + 2] : b + 1;
    if (w.bound) {
      h = t < b ? (1 - Math.cos(Math.PI * (t - a) / (b - a))) / 2 : (1 + Math.cos(Math.PI * Math.min(1, (t - b) / (n - b)))) / 2;
      return w.bAmp * (0.5 - h);
    }
    if (t < b) {                                          // in a burst: climbing back from the glide before it
      d = k >= 2 ? w.amp * Math.min(1, (a - s[k - 1]) / 3) : 0;
      return d * (1 - ease((t - a) / (b - a)));
    }
    d = w.amp * Math.min(1, (n - b) / 3);                 // in a glide: sinking
    return d * ease((t - b) / (n - b));
  }
  /* how far that can carry it, either way */
  function liftReach(m) { var w = m.w; return !w ? 0 : w.bound ? w.bAmp / 2 : w.sinks ? w.amp : 0; }

  /* ---------------- a flight's shape: in the air, behind its leader ---------------- */

  /* a bird's place: lag behind the leader along the path, lat aside (level,
     at right angles to the path: for a crossing, nearer or farther), up */
  function member(F, lag, lat, rank) {
    var r = F.r, S = F.S, m = {
      lag: lag, lat: lat, up: 0, rank: rank, gain: Math.min(1.5, 1 + 0.1 * rank),
      d: measureBird(drawBird(r, S), F.span * (1 + SIZE_VAR * (r() * 2 - 1))),   // its own drawing, its own size
      /* its own drift about its place, its own wing-beat and glide */
      aL: pick(r, DRIFT_L) * F.span * F.loose, aP: pick(r, DRIFT_P) * F.span * F.loose * F.air, bKey: Math.floor(r() * NOISE_N), bT: pick(r, DRIFT_T) * F.loose,   // (a loose flock drifts wider, and as gently)
      f: F.f * (1 + DETUNE * (r() * 2 - 1)), delay: 0, half: (S.bound ? 0.3 : 1) * r(), rest: r(), glide: pick(r, S.glide), bob: 0,
      w: null, stragL: 0, stragT0: 0, stragT: 1, swapT0: 0, swapT: 0, gT: 0, gT0: 0, lx: 0, ly: 0, s: null,
      x: 0, y: 0, n: F.n0, a: 1, nTry: 0
    };
    m.w = F.w || wingsOf(F, m);
    return m;
  }
  /* a bird's own bursts and glides (or bounds), after its kind */
  function wingsOf(F, m) {
    if (!F.flaps) return { segs: [], f: m.f, sinks: false, amp: 0, bound: false, bAmp: 0 };   // (soaring: set by the thermal)
    return { segs: bursts(F.r, m.f, F.flaps, -12, 320), f: m.f, sinks: !!F.S.sink && !F.calm, amp: (F.S.sink || 0) * F.span * F.air,
             bound: !!F.S.bound, bAmp: F.S.bound ? pick(F.r, F.S.bound) * F.span : 0 };
  }
  /* birds beating each on its own never fall into step: their rates spread
     evenly about the flight's, and their starting points in the beat too */
  function unlock(F) {
    var M = F.m, n = M.length, i, j, k, order = [];
    if (F.w || n < 2) return;
    for (i = 0; i < n; i++) order.push(i);
    for (i = n - 1; i > 0; i--) { j = Math.floor(F.r() * (i + 1)); k = order[i]; order[i] = order[j]; order[j] = k; }
    for (i = 0; i < n; i++) {
      k = M[order[i]];
      k.f = F.f * (1 + DETUNE * (2 * i / (n - 1) - 1));   // (the whole of DETUNE either way: a chance meeting in the beat soon passes)
      k.half = (F.S.bound ? 0.3 : 1) * ((i + 0.3 + 0.4 * F.r()) / n);
      k.w = wingsOf(F, k);
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
      arm = r() < 0.5 ? 1 : -1;
      dx = pick(r, ARM_X) * sp * (2 - F.flat); dy = pick(r, ARM_Y) * sp * F.flat;   // (a narrow band: a flatter V)
      bow = r() < 0.3;                                    // a U: the ranks near the apex closer in
      u = mix(r(), 0.3, 0.7);                             // the second arm a part of a place behind the first (no V is symmetric)
      for (k = 1; k < n; k++) {
        rank = k <= a ? k : k - a;
        lag = (rank + (k > a ? u : 0)) * dx * (bow ? 0.85 + 0.075 * rank : 1) * (1 + JITTER * jit());
        lat = (k <= a ? arm : -arm) * (rank * dy * (1 + JITTER * jit()) + 0.5 * JITTER * sp * jit());
        m = member(F, lag, lat, rank);
        m.up = UP_V * sp * jit();                         // the V lies level in the air
        M.push(m);
      }
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
        gx = dl - a.d.hw - b.d.hw - a.aL - b.aL,
        gy = dp - a.d.hh - b.d.hh - a.aP - b.aP - BOB * Math.max(a.d.span, b.d.span) -
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
      for (i = 1; i < M.length; i++) { M[i].lag *= 1.12; M[i].lx *= 1.12; }
    }
    return false;
  }

  /* ---------------- where a bird is: a pure function of the flight's time ---------------- */

  var tmp = {}, tmp2 = {}, pb = {}, st = {};
  function spot(F, m, tau, o) {
    if (F.soar) return soarSpot(F, m, tau, o);
    slotAt(F, m, tau, sl);
    var q = F.q, lag = sl.lag + m.aL * q * wave(m.bKey, tau / m.bT),
        lat = sl.lat + 0.75 * m.aP * q * wave(m.bKey + 53, tau / m.bT / 1.3),     // (its drift about its place: aside and up and down,
        up = sl.up + 0.5 * m.aP * q * wave(m.bKey + 97, tau / m.bT / 1.1), s, w, sh, ch;   //  together about as much as one way alone)
    s = F.s0 + F.v * tau - lag + (F.acc ? accelS(F, tau) : 0);   // (round 3: and its changes of pace in flight, i6_steer.js)
    work += SPOT_COST - 1;   // (round 3: its drift, wander, gusts and wings: the hot path, counted at its cost)
    path3(F, F.sa + s, wp);
    w = F.wAmp * wave(F.wKey, s / F.wLam) * m.gain;       // the track's wander: every bird flies through it
    up += w; lat += 0.5 * w;
    up += (F.hAmp * wave(F.hKey, (tau - lag / F.v) / F.hT) - lift(m, tau)) * q;   // a gust reaches each bird as it reaches that air; its wings carry it
    sh = Math.sin(wp.h); ch = Math.cos(wp.h);
    o.ax = wp.x - sh * lat; o.ay = wp.y + up; o.az = wp.z + ch * lat;   // (where it is in the air: the drawing's)
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

  function newFlight(kind, n, dir, r, calm, flat, stillSky) {
    var sort = weighted(r, SORT_OF[kind]), S = SORTS[sort], F = {
      kind: kind, sort: sort, S: S, n: n, dir: dir, r: r, soar: null, m: null, path: null, w: null, q: 1, inS: 0,
      flat: flat ? 0.6 : 1, calm: !!calm, still: !!stillSky, loose: kind === 'loose' ? 1.4 : 1,
      t0: 0, s0: 0, sa: 0, len: 0, dur: 0, edges: 3, ev0: 0, from: 0, loosen: false, latFirst: false, n0: pick(r, S.depth),
      wKey: Math.floor(r() * NOISE_N), wLam: pick(r, WAVE) * (S.wave || 1),
      wAmp: mix(fBreeze, WANDER[0], WANDER[1]) * (kind === 'line' ? 1.3 : 1) * (S.wander || 1) * pick(r, [0.7, 1.1]),
      hKey: Math.floor(r() * NOISE_N), hT: pick(r, HEAVE_T), hAmp: mix(fBreeze, HEAVE[0], HEAVE[1]) * pick(r, [0.7, 1.1])
    };
    var v, g, px;
    if (calm) { F.wAmp *= 0.3; F.hAmp *= 0.3; }          // a narrow strip of sky: still air
    px = SPAN * view * S.size * F.n0;                     // its span on the window where it crosses: its kind's size, its distance
    F.span = px / F.n0;                                   // (in the air: px at nearness 1)
    v = pace * px * pick(r, S.pace);                      // in the wild: spans a second, about a span a beat ...
    F.vPx = clamp(soft(v * calmOf(), topSpeed()), SPEED[0], SPEED[1]);   // ... on the page slowed to its calm
    F.v = F.vw = F.vPx / F.n0;                            // (units of the air a second)
    F.f = pick(r, S.hz) * tempo;
    F.flaps = S.flaps && S.flaps[0][0] > 8 && F.vPx < 0.8 * px * F.f ? FLAPS_SLOW : S.flaps;   // held back: it glides between bursts ...
    g = Math.sqrt(clamp(v / F.vPx, 1, HOLD));             // ... and every kind glides the longer, the more it is slowed
    if (F.flaps && !S.bound) F.flaps = [F.flaps[0], [F.flaps[1][0] * g, F.flaps[1][1] * g]];   // (not a finch's bound: its wings shut)
    F.air = Math.sqrt(Math.min(1, F.vPx / v));            // what moves it in seconds (a gust, its drift, a glide's sink) gentled
    F.hAmp *= F.air;                                      // as it is slowed, so its path turns no sharper for the slower pace
    F.wAmp /= F.n0; F.hAmp /= F.n0; F.wLam /= F.n0;       // (the wander and the gusts, px where it crosses: in the air)
    F.climb = (kind === 'single' || kind === 'pair') && (sort === 'gull' || sort === 'crow' || sort === 'swallow') && W >= SOAR_W && r() < 0.22;
    /* a line (and a skein of ibis) beats and glides together, the beat
       passing back down it; every other flight's birds each on their own */
    if (kind === 'line' || (kind === 'skein' && sort === 'ibis'))
      F.w = { segs: bursts(r, F.f, F.flaps, -12, 320), f: F.f, sinks: !!S.sink && !calm, amp: (S.sink || 0) * F.span * F.air, bound: false, bAmp: 0 };
    if (kind === 'soar') return soarFlight(F);
    F.m = formation(F);
    F.d = F.m[0].d;
    if (!spaced(F)) return null;                        // the pattern keeps its birds apart ...
    gatherOf(F);                                          // ... and so does its gathering, if it gathers
    if (F.w) {
      var wd = pick(r, WAVE_DELAY);
      F.m.forEach(function (m) {
        m.delay = kind === 'line' ? m.rank * wd * pick(r, [0.8, 1.2]) : m.lag / F.v;   // down the line; or where the one ahead beat (ibis in V's)
        g = (m.delay * F.f) % 1;
        if (m.rank && (g < 0.2 || g > 0.8)) m.delay += 0.4 / F.f;   // (never a whole number of beats behind: that would be in step)
        m.half = 0.15 * r();
      });
    }
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
      m.w.segs = [m.tj - 6, m.tj - 6 + 4 / m.f, m.tx + 0.5, m.tx + 0.5 + 4 / m.f];   // a few beats reaching the thermal, a few leaving it
      m.delay = 0;
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
        if (!(pp.n > 0 && fadeOf(pp.n) >= 0.02 && inView(pp.x, pp.y, 0, 0))) { g0 = x0 = NaN; continue; }
        if (x0 === x0) {
          d = Math.sqrt((pp.x - x0) * (pp.x - x0) + (pp.y - y0) * (pp.y - y0)) / (ds / 2); seen = Math.min(seen, d);
          g = Math.atan2(pp.y - y0, pp.x - x0);
          if (g0 === g0) { g0 = g - g0; tr = Math.max(tr, Math.abs(Math.atan2(Math.sin(g0), Math.cos(g0))) / (ds / 2)); }
          g0 = g;
        }
        x0 = pp.x; y0 = pp.y;
      }
    }
    F.v = Math.min(F.vw, 0.92 * topSpeed() / (sig || 1), gr > 0 ? 0.9 * GROW / gr : Infinity, sh > 0 ? 0.9 * SHRINK / sh : Infinity, tr > 0 ? TURN_SEEN * DEG / tr : Infinity);
    F.vLim = Math.min(gr > 0 ? 0.9 * GROW / gr : Infinity, sh > 0 ? 0.9 * SHRINK / sh : Infinity, tr > 0 ? TURN_SEEN * DEG / tr : Infinity); F.vSig = sig;   // (round 3)
    F.q = F.v / F.vw * Math.min(1, Math.min(slow, seen) / F.n0);   // what moves it in seconds, gentled as far again, and as far as any bird of it is seen slower where it heads away: its path turns no sharper
    return F.v >= 0.45 * F.vw && F.v * slow >= SLOWEST;   // (and never so far off and slow that it seems to hang still)
  }
  /* the leader where it is in view: never growing or shrinking faster
     than GROW or SHRINK a second, nor rushing across the window */
  function steady(F, tau) {
    var s = F.sa + F.s0 + F.v * tau, e, v, x, y, n;
    path3(F, s, wp); proj(wp.x, wp.y, wp.z, pp);
    if (pp.n < FADE || !inView(pp.x, pp.y, 0, 0)) return true;
    x = pp.x; y = pp.y; n = pp.n;
    path3(F, s + F.v * 0.5, wp); proj(wp.x, wp.y, wp.z, pp);
    e = Math.log(pp.n / n) / 0.5;
    v = Math.sqrt((pp.x - x) * (pp.x - x) + (pp.y - y) * (pp.y - y)) / 0.5;
    return e <= GROW && e >= -SHRINK && v <= 1.1 * topSpeed();
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
    return fadeOf(pp.n) >= 0.02 && inView(pp.x, pp.y, F.d.hw * pp.n, F.d.hh * pp.n);
  }
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
    return { path: F.path, dir: F.dir, sa: F.sa, len: F.len, v: F.v, q: F.q, s0: F.s0, dur: F.dur, edges: F.edges, from: from, ev0: F.ev0,
             soar: F.soar ? JSON.parse(JSON.stringify(F.soar)) : null,
             m: F.m.map(function (m) {
               var c = {}, k;
               for (k in m) if (k !== 'w' && k !== 's' && k !== 'd') c[k] = m[k];
               if (F.soar) c.w = { segs: m.w.segs.slice(), f: m.w.f, sinks: m.w.sinks, amp: m.w.amp, bound: m.w.bound, bAmp: m.w.bAmp };
               return c;
             }) };
  }
  function restore(F, k) {
    F.path = k.path; F.dir = k.dir; F.sa = k.sa; F.len = k.len; F.v = k.v; F.q = k.q; F.s0 = k.s0; F.dur = k.dur; F.edges = k.edges; F.from = k.from; F.ev0 = k.ev0;
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

  function commit(F, t1) {
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
    if (pp.n < FAR) return 2;                             // gone into the distance
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
    for (;;) {
      tau = it.from + it.k * STEP;
      it.spent = work - w0;                               // (every point of a path worked out: its own birds', the other flights', the course's)
      if (it.spent >= budget) return 0;
      if (tau > it.until) { it.end = tau; it.capped = it.last >= tau - 3 * STEP; return it.enter > -1e8 || it.live ? 1 : fail(it, 'never'); }   // (capped: still seen as the trial ends)
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
        if (!probe) { if (pv.n > m.nTry) m.nTry = pv.n; bx[4 * i] = pv.x; bx[4 * i + 1] = pv.y; bx[4 * i + 2] = hw; bx[4 * i + 3] = hh; }
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
            if (Math.abs(ox) > 0.5 && Math.abs(ox) > FACE_HYST * own) fc[i] = ox < 0 ? -1 : 1;
            if (fc[i] && wx * fc[i] < -BACK_PX && fadeOf(pv.n) > 0.3) return fail(it, 'back');
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
      if (!probe && trust) for (i = 0; i < cnt; i++) {    // two of its birds, near and far, never on top of one another on the window
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
        return it.seen >= it.seenMin || it.live || F.still ? 1 : fail(it, 'short');
      }
      it.k++;
    }
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
  function trialArrays() { return { bx: new Float64Array(4 * MAXB), tp: new Float64Array(5 * MAXB), wv: new Float64Array(5 * MAXB), wt: new Float64Array(2 * MAXB), fc: new Int8Array(MAXB) }; }
  var TA = trialArrays(), TB = trialArrays();
  /* a trial of the job's flight, from the job's start (the coming view's first sample); probe: its bounding birds only */
  function trialIt(J, F, probe) {
    var still = J.mode === 'still', from = still ? 0 : VP.t0 - J.t;
    var cross = Math.max(4, F.dur - Math.max(0, F.s0 > 0 ? 0 : 0) - 2 * OUT / (F.v * F.n0 || SPEED[1]));
    return { from: from, k: 0, k0: 0, near: ROOMY, apart: 200, probe: probe, spent: 0, yLo: Infinity, yHi: -Infinity, xLo: Infinity, xHi: -Infinity,
             bx: TA.bx, tp: TA.tp.fill(NaN), wv: TA.wv.fill(NaN), wt: TA.wt.fill(NaN), fc: TA.fc.fill(0), bandT: 0, paceT: 0, slowT: 0, late: 0, enter: -1e9, last: -1e9, seen: 0, end: 0, why: '', live: false,
             enterBy: J.mode === 'first' ? ENTER_BY[0] : ENTER_BY[1], seenMin: still ? 0 : clamp(0.35 * cross, SEEN_MIN[0], SEEN_MIN[1]),
             until: still ? F.dur : Math.min(VP.t0 + (VP_N - 1) * STEP - J.t, F.dur + 30, VP.t0 + VP.end + 2 - J.t, VP.t0 + trustT() + TRIAL_PAST - J.t) };   // (round 3: no further than TRIAL_PAST past the trusted course: the course a guess there, the guard watches the flight; round 2 flew every trial up to 30 s past the flight's end, and a job could take 6 s)
  }
  /* the whole trial at once (a flight re-checked after the page moved), from now, through a fresh course */
  function trial(F, from) {
    var it = { from: from, k: 0, k0: 0, near: ROOMY, apart: 200, probe: false, spent: 0, yLo: Infinity, yHi: -Infinity, xLo: Infinity, xHi: -Infinity,
               bx: TB.bx, tp: TB.tp.fill(NaN), wv: TB.wv.fill(NaN), wt: TB.wt.fill(NaN), fc: TB.fc.fill(0), bandT: 0, paceT: 0, slowT: 0, late: 0, enter: -1e9, last: -1e9, seen: 0, end: 0, why: '', live: true,
               enterBy: 1e9, seenMin: 0, until: Math.min(F.dur, from + 30) };
    return trialRun(F, it, null, Infinity) > 0 ? it.near : -1;
  }

  /* a path in the air (or a thermal) for the job's flight; true if it is worth a trial */
  function propose(J) {
    var F = J.F, qx, qy, lap = 0, u, hd, turn, climb, plain, open, i;
    if (J.pend) { J.pend = false; return propose2(J); }
    J.a++;
    r2next(q);
    J.diag = false; J.far = false;
    setYaw(F, J.yaw);
    /* (round 3) paths found behind cloud: the next ones nearer (the flight in front of the towers, not behind them) */
    if (F.n00 === undefined) F.n00 = F.n0;
    if (!F.soar) F.n0 = Math.min(F.n00 * (J.near ? 1.6 : 1 + 0.3 * Math.min(J.hid || 0, 2)), 0.9 * NEAR_MAX);
    if (!J.bands) { BANDSLACK = slackY() + 2; J.bands = floorClip(openBands(F.lo, F.hi), F); BANDSLACK = 0; }   // (round 3: the bands clear of the words' margin and the course's slack up and down, and over the floor)
    if (F.soar) {
      qy = inBands(J.bands, q.y);
      if (qy === null) { J.a = 1e9; return false; }      // no band holds the thermal (the job's tries are up)
      unproj(mix(q.x, 0.08, 0.92) * W, qy, F.n0, wp);
      soarTimes(F, wp.x, wp.y, wp.z);
    } else {
      J.climb = F.climb && J.mode !== 'still' && J.a <= TRIES / 2;    // climbing away or coming down, if it finds room
      open = J.bands.length > 0;                          // (no open band: the words stand across the whole sky, as on a phone turned sideways)
      J.diag = J.climb || (J.a > 2 * TRIES && J.best < 0 && J.a % 2 === 0) || (!open && J.a % 2 === 0);   // no level crossing fits: try the steeper paths (now and then)
      for (i = 0; i < 8; i++, r2next(q)) {                // its middle somewhere in the open sky, never in the words ...
        qx = q.x * W;
        qy = J.diag || !open ? mix(q.y, 0.04, 0.96) * H : inBands(J.bands, q.y);   // ... a level crossing's in an open band
        if (qy !== null && clearOfWords(qx, qy, F.d.hw * F.n0, F.d.hh * F.n0) && (J.diag || unproj(qx, qy, F.n0, wp).y > floorY + 2 * F.span)) break;   // (round 3: nor under the floor where it crosses)
      }
      if (i === 8) return pfail(J, 'nopoint');
      plain = open && (J.mode === 'still' || (J.mode === 'first' && J.a > TRIES / 4));   // (the first flight, if it finds no room soon, simply crosses)
      u = plain ? 0 : weighted(F.r, [[0, open ? HEAD_W[0] : 0], [1, HEAD_W[1]], [2, HEAD_W[2]]]);   // across the window, angling away, or coming nearer (with no open band, never straight across)
      hd = pick(F.r, HEAD[u]) * DEG * (u === 0 && F.r() < 0.5 ? -1 : 1);
      turn = !plain && F.r() < TURNING * (F.S.wheel || 1) ? (F.r() < 0.5 ? 1 : -1) * pick(F.r, TURN) * DEG : 0;   // now and then wheeling as it goes
      F.dir = (J.diag || !open) && !J.climb && F.r() < 0.7 ? (qx < W / 2 ? -1 : 1) : J.dir;   // (in a narrow strip of sky, mostly out by the nearer side)
      /* (round 2) a view turning against the flight's way would leave it behind beyond its edge: as fast as it flies or
         a little faster (the two would all but cancel: a bird hanging on the window), it goes the way of the sweep
         instead; much faster, it sets off beyond the far edge, and the view passes it as it flies on (farOption) */
      J.upstream = false;
      if (J.mode !== 'still' && F.dir * J.sweep < 0) {
        if (J.mode === 'next' && Math.abs(J.sweep) > 1.25 * F.vPx) J.upstream = true;
        else if (Math.abs(J.sweep) > FLIP * F.vPx) F.dir = -F.dir;   // (round 3: 0.35 doubled the birds' pace on the window under a modest turn; now that turn slows them instead)
      }
      if (J.diag && !J.climb) {                           // steeper across the window: down and away toward the horizon, or up and nearer (now and then the other)
        climb = (F.r() < 0.5 ? 1 : -1) * pick(F.r, DIAG);
        u = (F.r() < 0.7 ? -1 : 1) * (climb > 0 ? 1 : -1);   // (+ coming nearer as it goes, - going away)
        if (!pathAcross(F, qx, qy, climb, u * F.r() * DIAG_N * (u > 0 ? GROW : SHRINK) / (F.vw * F.n0), turn)) return pfail(J, 'pathA');
        u = 3;
      } else {
        climb = J.climb ? (F.r() < 0.5 ? 1 : -1) * pick(F.r, CLIMB) : (F.r() * 2 - 1) * F.S.tilt * DEG / 3;   // (its kind's tilt: a gentle climb or descent; the heading tilts it on the window)
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
    sc += 0.25 * J.it.apart + (J.diag && !J.climb ? 0 : 40) + 8 * F.r() - 80 * hs - (J.far ? 10 : 0) - (J.mode === 'still' ? 60 * J.overLand : 0) - LATE_K * J.it.late;   // (round 3: the less, the longer it would pass near the words where the course is a guess)
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
        if (J.oi >= J.order.length) { jobLog(J, null); HIDJOB = (J.nh || 0) > 0.3 * (J.nf || 0) ? t : HIDJOB; job = null; return null; }   // (round 3: a job the clouds defeated, noted)
        o = J.order[J.oi++];
        if (makesFour(o[1], J.counts) || o[1] > freeSlots() + awaySlots()) continue;
        J.F = newFlight(o[0], o[1], J.dir, J.r, o[2], o[3], J.mode === 'still');
        J.c = 0; J.a = 0; J.best = -1; J.keep = null; J.it = null; J.bands = null; J.pend = false; J.jn = false; J.retry = 0; J.hid = 0;
        return null;                                      // (drawing a flight is a frame's work: its paths are tried from the next)
      }
      if (!J.it) {
        if (J.c >= (J.mode === 'first' || J.oi > 1 || J.retry ? TRIES / 2 : TRIES) || J.a >= 6 * TRIES) {   // (the first flight, and a second choice, in fewer tries; a path that cannot even be drawn is a cheap try)
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
            if (J.retry === 1) J.dir = -J.dir; else J.t += RETRY_LATER;
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
    n = drawCount(r, free, counts);
    /* (round 3) a lone bird only if drawn three times (a lone bird of the live's ladder of fallbacks, now and then):
       alone on the window it was the live's now and then (1-7 % of its time), and round 2's turning view, ending flights
       sooner, made it a procession of them; the live's own rate of lone birds (a ninth of its flights) left 300 s runs
       with a quarter to two fifths of them lone, by chance */
    for (i = 0; n === 1 && mode !== 'still' && i < (mode === 'first' ? 4 : LONE_REDRAW); i++) n = drawCount(r, free, counts) || 1;   // (the first flight: a flock, as the live's, unless the sky's counts allow nothing else)
    if (!n) return false;
    if (mode === 'first' && n > 3 && openSky() < 0.35 * H) n = 3;   // a small sky: a small first flight, soon in view
    kind = mode === 'still' ? (n >= 3 ? 'skein' : n === 2 ? 'pair' : 'single') : drawKind(r, n);
    dir = r() < faithful ? season : -season;              // most flights go the season's way; now and then one the other
    order = [];
    function add(o) { var k = o.join(':'); if (!seen[k]) { seen[k] = 1; order.push(o); } }
    add([kind, n]);
    if (kind === 'soar') add([n === 1 ? 'single' : n === 2 ? 'pair' : 'skein', n]);
    if (n >= 3 && kind !== 'line') {
      add(['skein', n, 0, 1]);
      for (i = n - 2; i >= 3; i -= 2) add(['skein', i === 4 ? 3 : i, 0, 1]);
      add(['line', n]);
    }
    if (n >= 5) add(['line', n - 2 === 4 ? 3 : n - 2]);
    if (n >= 3) add(['line', Math.min(n, 5) === 4 ? 3 : Math.min(n, 5), 1]);
    if (n >= 3) add(['skein', 3, 1, 1]);
    if (n >= 3) add(['pair', 2]);
    if (n >= 2) add(['single', 1]);
    add(['single', 1, 1]);
    /* (round 3) a sky the clouds have kept empty (every path behind the towers) for HIDDEN_FILL s: a lone bird near the
       eye, in front of them, fills it until the towers pass */
    if (mode !== 'still' && t - HIDJOB < 3 && t - lastSeenAny > HIDDEN_FILL) { order = [['single', 1]]; nearJob = true; } else nearJob = false;
    job = { mode: mode, r: r, order: order, oi: 0, counts: counts, dir: dir, F: null, near: nearJob };
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
    return F.sa + F.s0 + F.v * (tau + 0.1) + (F.acc ? accelS(F, tau + 0.1) : 0) + (lead.aL || 0) * 1.2 + 1;   // (and its changes of pace: without them a flight sped up was spliced behind its birds, and they leapt onto the new arc)
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
  var GPX = new Float64Array(3 * MAXB), GPOK = new Uint8Array(MAXB), GLOG = null;   // (GLOG, development: the guard's findings, when asked)

  /* once a flight is in the sky (each, every GUARD_EVERY steps, on a step of its own): ahead GUARD_T, would any of its
     birds come into the words' margin? Then: far enough ahead, ease the whole flight up or down away from them (the
     least climb that keeps every bird clear through the course; none past EASE_MAX); else, or if no ease keeps it
     clear, the whole flight goes (GONE_T: it fades together, the live's "a flight the words moved onto goes"). And
     would its birds slide backward on the window, the view turning against them faster than they fly, for most of the
     next two seconds? Then the flight wheels round toward the turn (WHEEL deg/s in the air, banked as it turns, by way
     of the distance: no bird loomed at), so it flies with it; a flight wheels at most once in WHEEL_GAP s */
  function guard(F) {
    var tau = t - F.t0, r, at, side, c, i, s, st, g0, ok = false, L;
    if (F.gone || F.place || F.still || F.soar || tau < -LEAD - 1) return;   // (past its planned span too: a turn the course did not foresee may keep it in view)
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
  var PLACE_ON = 700, PLACE_OFF = 820, PLACE_MAX = 1, PLACE_UP = [35, 70];   // m; thermals at once; m over the place's own birds or the camera, whichever is higher (so the camera passes beneath them)
  var PLACE_AHEAD = 200, LATERAL = [90, 170];   // m: a place this far ahead along the way at least; its thermal this far aside of the way
  var PLACE_FAR = [0.16, 0.26];  // nearness: a thermal's birds come out of the distance between these (the travelling flights' FAR, FADE: 0.42, 0.54)
  /* the air between: a travelling flight's birds are the live's (FADE, FAR); a thermal's are seen from further off, small
     ink over the place (the camera comes to them at its own pace, and would otherwise pass them before they showed) */
  function fadeFor(F, n) { return F.place ? (n >= PLACE_FAR[1] ? 1 : n <= PLACE_FAR[0] ? 0 : ease((n - PLACE_FAR[0]) / (PLACE_FAR[1] - PLACE_FAR[0]))) : fadeOf(n); }
  var PLACES = [], PLC = [], placeSeen = false, placeDone = {};
  function placeSpot(P, m, tau, o) {
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
      m = { d: measureBird(drawBird(r, S), SPAN * view * S.size * (1 + SIZE_VAR * (r() * 2 - 1))), R: R * mix(r(), 0.85, 1.15), th0: TAU * (i + 0.3 * r()) / n, dy: (i - (n - 1) / 2) * 6,
            f: f * (1 + DETUNE * (r() * 2 - 1)), delay: 0, half: r(), rest: r(), glide: pick(r, S.glide), n: 1, s: null, lag: 0, lat: 0 };
      m.om = sense * TAU / T;
      m.w = { segs: sort === 'stork' ? [] : bursts(r, m.f, [[3, 6], [6, 14]], -12, 4000), f: m.f, sinks: false, amp: 0, bound: false, bAmp: 0 };   // (storks hold their wings out, as the live's: SORTS.stork.flaps is null; gulls a few beats now and then)
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
    for (var i = 0; i < PLACES.length; i++) { var P = PLACES[i], want = Math.max(P.base, FL.y) + P.up; P.cy += clamp(want - P.cy, -CLIMB_T * dt, CLIMB_T * dt); }
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
      else if (dx * dx + dz * dz > PLACE_OFF * PLACE_OFF) landPlace(P);
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

  /* ---------------- the drawing: every bird afresh, in the tattoo's hand, built in 3D ---------------- */

  /* the drawing, on the hand's frames only (as the live site's): wings, bank, bob, tremor, facing, and the size, pen
     and ink of its distance. Its mark (drawBird, shape) read as the bird seen from behind: the line across its wings,
     its wrists up; each of its five points a point of the 3D chain in the bird's frontal plane (across: the span, up:
     its back); the mark's lean a bank of that plane. The plane faces the camera, turned toward the way it flies in the
     world (the camera's way at its speed and its own) by at most 39 deg (facing()); then pressed back against the
     lens's stretch (lens()), and stood back on the live mark's own diagonal (leanFix()). Seen square it is its live
     mark, exactly (orthographically) */
  var wa = {}, wb = {}, wc = {}, pa = {}, pb = {}, pc = {}, PU = new Float64Array(5), PV5 = new Float64Array(5), FWD = [0, 0, 0], SR = [0, 0, 0], UP = [0, 0, 0];
  /* the bird's frontal plane (its normal FWD, its right SR, its up UP), from the line of sight (lx, ly, lz: the camera to
     the bird) and the way it flies (FWD in): the plane faces the camera, turned toward the way it flies by atan(FACING x
     sin of the angle between the two). Going away or coming nearer it is seen square, as the live mark; flying across
     it turns at most 39 deg, foreshortened; from beside it would close to a stroke and stop reading as the tattoo's
     bird. Its up is the world's as the window shows it at its middle (the camera's roll tilts it with the horizon; the
     verticals' convergence toward the window's edges is left out: it would lean the marks there by up to 15 deg) */
  function facing(lx, ly, lz, FWD, C, k) {
    var ll = Math.sqrt(lx * lx + ly * ly + lz * lz) || 1, c, tx, ty, tz, nl, a, b, yx, yy, yz, d, ul;
    lx /= ll; ly /= ll; lz /= ll;
    c = FWD[0] * lx + FWD[1] * ly + FWD[2] * lz;
    tx = FWD[0] - c * lx; ty = FWD[1] - c * ly; tz = FWD[2] - c * lz;
    FWD[0] = lx + k * tx; FWD[1] = ly + k * ty; FWD[2] = lz + k * tz;
    nl = Math.sqrt(FWD[0] * FWD[0] + FWD[1] * FWD[1] + FWD[2] * FWD[2]) || 1; FWD[0] /= nl; FWD[1] /= nl; FWD[2] /= nl;
    /* the world's up seen at the window's middle: its parts along the camera's right and up */
    a = C.r[1]; b = C.u[1];
    yx = a * C.r[0] + b * C.u[0]; yy = a * C.r[1] + b * C.u[1]; yz = a * C.r[2] + b * C.u[2];
    d = yx * FWD[0] + yy * FWD[1] + yz * FWD[2];
    UP[0] = yx - d * FWD[0]; UP[1] = yy - d * FWD[1]; UP[2] = yz - d * FWD[2];
    ul = Math.sqrt(UP[0] * UP[0] + UP[1] * UP[1] + UP[2] * UP[2]);
    if (ul < 1e-3) { UP[0] = C.u[0]; UP[1] = C.u[1]; UP[2] = C.u[2]; ul = 1; }   // (straight overhead: the camera's up)
    UP[0] /= ul; UP[1] /= ul; UP[2] /= ul;
    SR[0] = FWD[1] * UP[2] - FWD[2] * UP[1]; SR[1] = FWD[2] * UP[0] - FWD[0] * UP[2]; SR[2] = FWD[0] * UP[1] - FWD[1] * UP[0];   // its right: forward x up
    return Math.sqrt(Math.max(0, 1 - Math.pow(FWD[0] * lx + FWD[1] * ly + FWD[2] * lz, 2)));   // (how far it is turned: the sine)
  }
  /* the lens: toward a window's edges the world's camera draws everything stretched away from the window's middle, by
     1/cos of the angle off its axis (a phone's sky, 40 deg up, by a fifth): the live marks were drawn flat wherever they
     flew, so each bird's chain is pressed back along that line by the cos (its shape, never its place; the land keeps the
     stretch, which a sky shows on nothing else) */
  function lens(lx, ly, lz, CF, X) {
    var ll = Math.sqrt(lx * lx + ly * ly + lz * lz) || 1, ca, px, py, pz, pl, i, dt;
    lx /= ll; ly /= ll; lz /= ll;
    ca = lx * CF[0] + ly * CF[1] + lz * CF[2];
    px = CF[0] - ca * lx; py = CF[1] - ca * ly; pz = CF[2] - ca * lz;   // (toward the window's middle, square to the line of sight)
    pl = Math.sqrt(px * px + py * py + pz * pz); if (pl < 1e-4 || ca <= 0.2) return;
    px /= pl; py /= pl; pz /= pl;
    for (i = 0; i < 5; i++) {
      dt = (X[3 * i] * px + X[3 * i + 1] * py + X[3 * i + 2] * pz) * (1 - ca);
      X[3 * i] -= dt * px; X[3 * i + 1] -= dt * py; X[3 * i + 2] -= dt * pz;
    }
  }
  /* (round 2) the live mark's own diagonal: the facing turn foreshortens a bird across its way (its plane turned up to
     39 deg about the world's up), which stood the tips' line 6-9 deg steeper than its own live mark near a window's
     edges (more step than gull). The chain is turned in its plane until the tips' line on the window stands where the
     same chain seen square would put it (the live mark, with the camera's roll): two steps of the secant */
  var LQ = new Float64Array(15), LA = {}, LB = {};
  function tipsAngle(X, bx, by, bz, C, face) {
    projReal(bx + X[0], by + X[1], bz + X[2], C, LA); projReal(bx + X[12], by + X[13], bz + X[14], C, LB);
    return Math.atan2(-(LB.y - LA.y), face * (LB.x - LA.x));
  }
  function rotPlane(X, k, a) {
    var c = Math.cos(a), s = Math.sin(a), i, x, y, z;
    for (i = 0; i < 5; i++) {
      x = X[3 * i]; y = X[3 * i + 1]; z = X[3 * i + 2];
      X[3 * i] = x * c + (k[1] * z - k[2] * y) * s; X[3 * i + 1] = y * c + (k[2] * x - k[0] * z) * s; X[3 * i + 2] = z * c + (k[0] * y - k[1] * x) * s;
    }
  }
  function leanFix(X, want, bx, by, bz, C, face) {
    var a0 = 0, f0 = angDiff(tipsAngle(X, bx, by, bz, C, face), want), a1 = -f0, f1, i, d;
    if (Math.abs(f0) < 0.5 * DEG || f0 !== f0) return 0;
    for (i = 0; i < 15; i++) LQ[i] = X[i];
    for (i = 0; i < 3; i++) {
      for (var q = 0; q < 15; q++) X[q] = LQ[q];
      rotPlane(X, FWD, a1);
      f1 = angDiff(tipsAngle(X, bx, by, bz, C, face), want);
      if (Math.abs(f1) < 0.3 * DEG || f1 === f0) break;
      d = (a1 - a0) / (f1 - f0); a0 = a1; f0 = f1; a1 = clamp(a1 - f1 * d, -0.6, 0.6);
    }
    return a1;
  }
  /* the rest phase of a still bird (reduced motion: a photograph): its own point in the beat, drawn from the upper part
     of it only (the wrists at least 0.6 of their rise: the steps always show, never a slash at the bottom of the beat) */
  function restPhase(u) { return u < 0.22 ? u * 0.195 / 0.22 : 0.762 + (u - 0.22) * (1 - 0.762) / 0.78; }
  var SQ = new Float64Array(15), FW2 = [0, 0, 0], TF = [0, 0, 0], TS = [0, 0, 0], TU = [0, 0, 0], PEN_NEAR = [0.13, 0.05];   // (the nearer wing's pen this much heavier, the far tip this much shorter, at the plane's most turned)
  function pose3D(F, m, tau, boil, rest, C) {
    var s = m.s, d = s.d, B = d.B, i, j, k, ph = rest ? restPhase(m.rest) : beat(m, tau), jit = rest ? 0 : hand, shut, c0x, c0y, c1x, c1y, bank = 0, n;
    if (ph >= 0) { k = wrists(ph); s.bob = rest ? 0 : BOB * d.span * MPU * (WRIST[0] - k) / (WRIST[0] - WRIST[1]); }
    else { k = ph === -2 ? 0.15 : m.glide; s.bob = 0; }   // (a glide: the wrists at its own set; a bound: shut)
    shut = ph === -2;
    /* the way it goes on the window, and how it turns there (the world's camera) */
    where(F, m, tau + 0.25, wa); projReal(wa.x, wa.y, wa.z, C, pa);
    where(F, m, tau, wb); projReal(wb.x, wb.y, wb.z, C, pb);
    c1x = pa.x - pb.x; c1y = pa.y - pb.y;                // (its facing is the tracker's: track())
    if (!rest) {                                          // ... and how it turns: it banks into the turn
      /* (a travelling flight's turn is its path's against the world, the planner's still view, the live's own: the
         camera's turns, bob and pitch move the window under every bird alike, and are not the bird's to bank to) */
      if (F.place) { where(F, m, tau - 0.25, wc); projReal(wc.x, wc.y, wc.z, C, pc); c0x = pb.x - pc.x; c0y = pb.y - pc.y; }
      else { spot(F, m, tau + 0.25, pa); spot(F, m, tau, pb); spot(F, m, tau - 0.25, pc); c1x = pa.x - pb.x; c1y = pa.y - pb.y; c0x = pb.x - pc.x; c0y = pb.y - pc.y; }
      bank = clamp(Math.atan2(c0x * c1y - c0y * c1x, c0x * c1x + c0y * c1y) / 0.25 / DEG / BANK_AT, -1, 1) * BANK * s.face;
      if (bank !== bank) bank = 0;
      if (!F.place) projReal(wb.x, wb.y, wb.z, C, pb);   // (pb again: where it is on the window)
    }
    /* the way it flies in the world: its own way in its frame, and the camera's (a travelling flight escorts it: the
       camera's way, FL.psi, at its speed, and its climb) */
    var vx = (wa.x - wb.x) / 0.25, vy = (wa.y - wb.y) / 0.25, vz = (wa.z - wb.z) / 0.25;
    if (FL.ok && !F.place) { vx += Math.sin(FL.psi) * FL.speed; vz += Math.cos(FL.psi) * FL.speed; vy += FL.vy || 0; }   // (a place's thermal is the world's own)
    var vl = Math.sqrt(vx * vx + vy * vy + vz * vz), lx = wb.x - C.pos[0], ly = wb.y - C.pos[1], lz = wb.z - C.pos[2];
    if (vl > 1e-3) { FW2[0] = vx / vl; FW2[1] = vy / vl; FW2[2] = vz / vl; } else { FW2[0] = F.syw || 0; FW2[1] = 0; FW2[2] = F.cyw || 1; }
    /* the plane turned toward its way; which wing is the mark's front: the one the bird goes toward on the window */
    FWD[0] = FW2[0]; FWD[1] = FW2[1]; FWD[2] = FW2[2];
    var turned = facing(lx, ly, lz, FWD, C, FACING + FACING_UP * ease((k - 0.6) / 0.4)), sx = SR[0] * C.r[0] + SR[1] * C.r[1] + SR[2] * C.r[2];
    if (Math.abs(sx) > 0.15) s.sgn = sx > 0 ? 1 : -1;
    for (i = 0; i < 3; i++) { TF[i] = FWD[i]; TS[i] = SR[i]; TU[i] = UP[i]; }
    /* the live mark as it is seen square (the plane facing the camera): its tips' line on the window, wanted */
    FWD[0] = FW2[0]; FWD[1] = FW2[1]; FWD[2] = FW2[2];
    facing(lx, ly, lz, FWD, C, 0);
    chain(B, d, k, shut, bank, s.face, s.sgn, FWD, SR, UP, SQ);
    lens(lx, ly, lz, C.f, SQ);
    var want = tipsAngle(SQ, wb.x, wb.y, wb.z, C, s.face);
    for (i = 0; i < 3; i++) { FWD[i] = TF[i]; SR[i] = TS[i]; UP[i] = TU[i]; }
    chain(B, d, k, shut, bank, s.face, s.sgn, FWD, SR, UP, s.X);
    lens(lx, ly, lz, C.f, s.X);
    s.lfix = want === want ? leanFix(s.X, want, wb.x, wb.y, wb.z, C, s.face) : 0;
    /* (round 2, just enough) the plane turned: the nearer wing's pen a little heavier, the far tip a little shorter */
    var tk = clamp(turned / 0.63, 0, 1), dA = s.X[0] * C.f[0] + s.X[1] * C.f[1] + s.X[2] * C.f[2], dB = s.X[12] * C.f[0] + s.X[13] * C.f[1] + s.X[14] * C.f[2];
    var nearA = dA < dB, tip = nearA ? 4 : 0, wr = nearA ? 3 : 1, fs = 1 - PEN_NEAR[1] * tk;
    for (i = 0; i < 3; i++) s.X[3 * tip + i] = s.X[3 * wr + i] + (s.X[3 * tip + i] - s.X[3 * wr + i]) * fs;
    s.pw[0] = 1 + (nearA ? PEN_NEAR[0] : -0.3 * PEN_NEAR[0]) * tk; s.pw[1] = 1 + (nearA ? -0.3 * PEN_NEAR[0] : PEN_NEAR[0]) * tk;
    for (i = 0; i < 5; i++) { j = s.key + i * 7 + boil * 131; s.J[2 * i] = nz(j) * jit * VW.dpr; s.J[2 * i + 1] = -nz(j + 61) * jit * VW.dpr; }
    /* the pen and the ink of its distance (the live's, by its size on the window) */
    n = pb.n || m.n;
    s.n = n;
    var pen = clamp(1.3 + 0.035 * d.span * n, LINE[0], LINE[1]) * Math.min(1, n / FAR), faint = Math.min(1, pen / PEN_MIN);   // (smaller than the live's farthest: thinner with it, then fainter)
    s.lw = Math.round(4 * Math.max(pen, PEN_MIN)) / 4;
    /* (round 3) with the air on, the air alone pales the far birds (the engine's own fog and haze at its distance): the
       live's TONE (0.62 at nearness 0.6 and less: "the air between", on a flat page) on top of it paled a goose at mid
       distance to half the live black's contrast. Without the air, the live's TONE */
    s.op = FORCED ? 1 : Math.round(100 * (FX.air ? TONE[1] : mix(ease((n - 0.6) / 0.6), TONE[0], TONE[1])) * fadeFor(F, n) * faint) / 100;
    /* how much cloud stands before it (its cover over the bird, per pixel, counted by this) */
    s.wf = 0;
    if (FX.cloud && !FORCED) { var ch = HOST.cloudBetween(C.pos[0], C.pos[1], C.pos[2], wb.x, wb.y, wb.z); s.wf = ease(ch / CLOUD_IN); }
    if (!FORCED) s.wf = Math.max(s.wf, HOST.cover());
    s.ok = true;
  }

  /* the 3D chain (m, the world's axes, about the body) of a bird's mark at a pose: the mark un-leaned (the live shape()
     before its lean) is the bird seen from behind, across its wings (S: its right, signed by which wing is the mark's
     front) and up its back (U); the lean banks that plane about its normal (FWD); SWEEP (off: 0) would set the wrists
     forward and the tips back along it */
  function chain(B, d, k, shut, bank, face, sgn, FWD, SR, UP, X) {
    var sg = face * sgn, cl = B.c, sl2 = B.sn, i;
    var Sx = sg * SR[0] * cl + UP[0] * sl2, Sy = sg * SR[1] * cl + UP[1] * sl2, Sz = sg * SR[2] * cl + UP[2] * sl2;
    var Ux = -sg * SR[0] * sl2 + UP[0] * cl, Uy = -sg * SR[1] * sl2 + UP[1] * cl, Uz = -sg * SR[2] * sl2 + UP[2] * cl;
    for (i = 0; i < 5; i++) {
      var kk = i === 1 || i === 3 ? k * (1 + (i === 1 ? -bank : bank)) : 1;
      if (B.tail && i === 1) kk = 0.5 + 0.5 * kk;         // (a tail swings half as far)
      var su = B.s[i] * (shut ? 0.78 : 1), hv = B.h[i] * kk * (shut ? 0.25 : 1);
      PU[i] = su * B.ux - hv * B.uy; PV5[i] = su * B.uy + hv * B.ux;
    }
    var gs = d.sc * MPU, Wg = d.gw / d.sc, fw;
    for (i = 0; i < 5; i++) {
      var u = (PU[i] - PU[2]) * gs, v = (PV5[i] - PV5[2]) * gs;
      fw = i === 2 ? 0 : i === 1 || i === 3 ? SWEEP[0] : (i === 0 && B.tail ? SWEEP[2] : SWEEP[1]);
      if (shut) fw = fw * 2 - 0.05;
      fw *= gs * Wg;
      X[3 * i] = u * Sx + v * Ux + fw * FWD[0];
      X[3 * i + 1] = u * Sy + v * Uy + fw * FWD[1];
      X[3 * i + 2] = u * Sz + v * Uz + fw * FWD[2];
    }
    return X;
  }

  /* ---------------- the ink: one instanced draw, every bird a quad about its five points ---------------- */

  /* drawn after the composite, at the canvas's own resolution (round 2: the device's px; round 1 drew into the world's
     1.25 px a CSS px and the browser upscaled the strokes 2-2.4x on a phone or a Retina window: grey, soft) */
  var VS_INK = HOST.glsl.HEAD + HOST.glsl.FRAME_U + (HOST.glsl.AIR || HOST.glsl.LIB) + `
const vec3 LUM = vec3(0.2126, 0.7152, 0.0722);
layout(location = 0) in vec4 aP0;   // the chain's points, from the camera (m): tip, wrist, body, wrist, tip; w: the ink's opacity,
layout(location = 1) in vec4 aP1;   //   the pen's half width (device px), the cover's weight, -, the land's slack (m)
layout(location = 2) in vec4 aP2;
layout(location = 3) in vec4 aP3;
layout(location = 4) in vec4 aP4;
layout(location = 5) in vec4 aJ0;   // the boil: each point's offset on the window (device px)
layout(location = 6) in vec4 aJ1;
layout(location = 7) in vec4 aJ2;   // (zw: the pen's weight on either wing: the nearer one heavier)
uniform sampler2D uWin;             // the finished frame (the world's resolution, sRGB): what lies under the bird
uniform vec2 uOut;                  // the window (device px)
uniform vec3 uInk;                  // the words' colour as light in the scene (linear: what the grade makes the words' colour)
uniform vec4 uGr;                   // the composite's exposure, saturation; the ink's share of the scene's light; the air (1 on)
uniform vec3 uLift, uGain;
uniform vec4 uMode;                 // forced colours (1), light words (1), the night's mix toward the sky's light, the contrast held
uniform vec3 uInkF;                 // forced colours: CanvasText (sRGB)
uniform vec2 uHold;                 // (round 3) dark ink held at least uHold.x contrast against the frame under it (y: 1 on)
flat out vec4 vA, vB, vC, vD, vE, vF;
vec3 shoulder(vec3 c) { float m = max(c.r, max(c.g, c.b)); const float K = 0.78; if (m <= K) return c;
  float mm = K + (1.0 - K) * (1.0 - exp(-(m - K) / (1.0 - K))); vec3 h = c * (mm / m); float over = clamp((m - 1.0) / 3.0, 0.0, 1.0); return mix(h, vec3(mm), over * 0.75); }
vec3 enc(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
vec3 dec(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
vec3 gradeOut(vec3 c) { c *= uGr.x; c = uLift + c * uGain; float y = dot(c, LUM); c = max(mix(vec3(y), c, uGr.y), 0.0); return enc(clamp(shoulder(c), 0.0, 1.0)); }
vec2 px(vec3 p, vec2 j, inout float wmin) { vec4 c = uVP * vec4(p, 1.0); wmin = min(wmin, c.w); return (c.xy / max(c.w, 1e-3) * 0.5 + 0.5) * uOut + j; }
void main() {
  float wmin = 1e9;
  vec2 p0 = px(aP0.xyz, aJ0.xy, wmin), p1 = px(aP1.xyz, aJ0.zw, wmin), p2 = px(aP2.xyz, aJ1.xy, wmin), p3 = px(aP3.xyz, aJ1.zw, wmin), p4 = px(aP4.xyz, aJ2.xy, wmin);
  float hw = aP1.w * max(aJ2.z, aJ2.w), a = aP0.w;
  vec3 P = aP2.xyz; float t = length(P); vec3 rd = P / max(t, 1e-3);
  float pad = hw + 1.5;
  vec2 lo = min(min(min(p0, p1), min(p2, p3)), p4) - pad, hi = max(max(max(p0, p1), max(p2, p3)), p4) + pad;
  int c = gl_VertexID;
  vec2 q = vec2((c & 1) == 1 ? hi.x : lo.x, (c & 2) == 2 ? hi.y : lo.y);
  gl_Position = (a <= 0.0 || wmin < 0.6) ? vec4(2.0, 2.0, 2.0, 1.0) : vec4(q / uOut * 2.0 - 1.0, 0.0, 1.0);
  vA = vec4(p0, p1); vB = vec4(p2, p3); vC = vec4(p4, aP1.w, a);
  vec3 o;
  if (uMode.x > 0.5) o = uInkF;   // forced colours: CanvasText, as the live's
  else {
    /* the ink as a thing in the world: a breath of the scene's light (the sky's from above, the sun's on its back), or,
       light ink (the night's words), a share of the sky's own light there; the air between taken as the land's is (the
       fog and the ground haze); then the grade the composite used */
    vec3 ink = uInk;
    if (uMode.y > 0.5) ink = mix(ink, skyCol(rd), uMode.z);
    else ink += uGr.z * (ambient(vec3(0.0, 1.0, 0.0)) + uSunC * uSunVis * 0.25 * max(uSun.y, 0.0));
    if (uGr.w > 0.0) ink = mix(ink, atmos(ink, rd, t), uGr.w);   // (round 3: AIR_INK of the air's haze: the whole of it paled DUNES's mid-distance birds to 61-72 % of the live black's contrast; a quarter keeps them at 80-85 %)
    o = gradeOut(ink);
    if (uMode.y > 0.5) {   // light ink keeps its contrast against the frame under it (the mean of what lies under its points)
      vec3 bg = (texture(uWin, p0 / uOut).rgb + texture(uWin, p1 / uOut).rgb + texture(uWin, p2 / uOut).rgb + texture(uWin, p3 / uOut).rgb + texture(uWin, p4 / uOut).rgb) * 0.2;
      float Lb = dot(dec(bg), LUM), li = dot(dec(o), LUM), want = uMode.w * (Lb + 0.05) - 0.05;
      if (li < want) o = enc(mix(dec(o), vec3(1.0), clamp((want - li) / max(1.0 - li, 1e-3), 0.0, 1.0)));
    } else if (uHold.y > 0.5) {   // (round 3) dark ink: never paler than uHold.x against what lies under it (a far bird in the haze over dark land)
      vec3 bg = (texture(uWin, p0 / uOut).rgb + texture(uWin, p1 / uOut).rgb + texture(uWin, p2 / uOut).rgb + texture(uWin, p3 / uOut).rgb + texture(uWin, p4 / uOut).rgb) * 0.2;
      float Lb = dot(dec(bg), LUM), li = dot(dec(o), LUM), want = (Lb + 0.05) / uHold.x - 0.05;
      if (li > want) o = enc(dec(o) * clamp(max(want, 0.0) / max(li, 1e-4), 0.0, 1.0));
    }
  }
  vD = vec4(o, aP2.w);
  vE = vec4(dot(P, uCamF), aP4.w, 0.0, 0.0);
  vF = vec4(aJ2.zw, 0.0, 0.0);
}`;
  var FS_INK = HOST.glsl.HEAD + HOST.glsl.FRAME_U + `
const vec3 LUM = vec3(0.2126, 0.7152, 0.0722);
uniform sampler2D uDepth, uCloud, uInkKeep, uBloom, uWin;
uniform vec2 uOut;
uniform vec4 uSc;     // the scene's uv scale (x, y), the clouds' (x, y)
uniform vec4 uMk;     // the mask's uv scale (x, y), the clouds' last texel (x, y)
uniform vec4 uLand;   // the land in front hides (1 on), the cloud (1 on), the device px a CSS px, the words' mask (1 on)
uniform vec4 uBl;     // the bloom's uv scale (x, y), its gain, the light wrap (1 on)
uniform vec4 uGl;     // the light wrap: the frame's light from, to; the pen thinned by, the ink lifted by
uniform float uEdge;  // (round 3) the edge's ramp narrowed by this (the device's px over the canvas's: a canvas capped under the device's resolution is put up to it, and its 1 px ramp with it)
flat in vec4 vA, vB, vC, vD, vE, vF;
out vec4 oC;
float sd(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0); return length(pa - ba * h); }
vec3 dec(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
void main() {
  vec2 p = gl_FragCoord.xy, uv = p / uOut;
  float dA = min(sd(p, vA.xy, vA.zw), sd(p, vA.zw, vB.xy)), dB = min(sd(p, vB.xy, vB.zw), sd(p, vB.zw, vC.xy));
  /* the light wrap: where the frame under the stroke is the sun's own glare (its light near white, its bloom strong),
     the light eats into the ink (the pen thinner, the ink lifted toward the light), as it does into every silhouette
     the bloom touches */
  float g = 0.0; vec3 bgS = vec3(0.0);
  if (uBl.w > 0.5) {
    bgS = texture(uWin, uv).rgb;
    float L = dot(dec(bgS), LUM), lb = dot(texture(uBloom, uv * uBl.xy).rgb, LUM) * uBl.z;
    g = smoothstep(uGl.x, uGl.y, L) * smoothstep(0.015, 0.09, lb);
  }
  float hw = vC.z * (1.0 - uGl.z * g);
  float cov = max(clamp((hw * vF.x - dA) * uEdge + 0.5, 0.0, 1.0), clamp((hw * vF.y - dB) * uEdge + 0.5, 0.0, 1.0));
  if (cov <= 0.0) discard;
  float vis = 1.0;
  if (uLand.x > 0.5) {   // the land in front of the bird (its slack: the wings reach before the body)
    ivec2 ds = textureSize(uDepth, 0);
    float dz = texelFetch(uDepth, clamp(ivec2(uv * uSc.xy * vec2(ds)), ivec2(0), ds - 1), 0).r;
    float zl = dz >= 1.0 ? 6.0e4 : 2.0 * uProj.z * uProj.w / (uProj.w + uProj.z - (dz * 2.0 - 1.0) * (uProj.w - uProj.z));
    vis = smoothstep(-vE.y, 0.0, zl - vE.x + 0.5 * vE.y);
  }
  if (uLand.y > 0.5) vis *= 1.0 - texture(uCloud, min(uv * uSc.zw, uMk.zw)).a * vD.w;   // the cloud before it
  if (uLand.w > 0.5) { vec4 kp = texture(uInkKeep, uv * uMk.xy); vis *= 1.0 - smoothstep(0.55, 0.95, max(kp.r, kp.g)); }   // (the words' own ground is never inked: the keep-off, the ink's boxes grown 2 px (world6w: r the stack's, g the links'))
  float a = cov * vC.w * vis;
  vec3 ink = mix(vD.rgb, bgS, uGl.w * g);
  oC = vec4(ink * a, a);
}`;
  var UB = new Float32Array(4 * MAXB);   // (round 3: each bird's box, CSS px: what lies under it, copied for the ink when the canvas is drawn straight)
  var PROG = null, BROKEN = false, VAO = null, VBO = null, RING = null, RI = 0, INST = new Float32Array(MAXB * 32), INK = new Float32Array(3), UGR = new Float32Array(4), USC = new Float32Array(4), UMK = new Float32Array(4), ULAND = new Float32Array(4), UBL = new Float32Array(4), UGL = new Float32Array(4), UMODE = new Float32Array(4), UINKF = new Float32Array(3);
  /* the ink's program: asked for as the module is made (the engine links it while its still sky shows, never in
     flight: round 1 compiled and linked it on the first world frame, 25-40 ms); drawn once it is linked */
  function makeProgram() { if (!PROG && !BROKEN) PROG = HOST.program(VS_INK, FS_INK, 'ink'); }
  /* (E1, design-v5 12.2) the instance ring: three buffers, each with its own VAO pointing at it (the real 8-attribute
     instanced layout), made at the boot's stage B (bootRing, through the hook boot()) and warmed with the engine's
     table (HOST.warm); a frame writes the next buffer whole (its birds' prefix), one last drawn three frames ago, so no
     buffer the GPU may still read is written and no VAO is made or pointed again in flight */
  function bootRing() {
    if (RING) return;
    RING = [];
    for (var k = 0; k < 3; k++) {
      var vao = gl.createVertexArray(), vbo = gl.createBuffer();
      gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, vbo); gl.bufferData(gl.ARRAY_BUFFER, INST.byteLength, gl.DYNAMIC_DRAW);
      for (var i = 0; i < 8; i++) { gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, 4, gl.FLOAT, false, 128, i * 16); gl.vertexAttribDivisor(i, 1); }
      RING.push([vao, vbo]);
    }
    gl.bindVertexArray(null); gl.bindBuffer(gl.ARRAY_BUFFER, null);
    VAO = RING[0][0]; VBO = RING[0][1]; RI = 0;
    if (HOST.warm && PROG) HOST.warm({ n: 'birds.ink', p: PROG, vao: VAO, mode: gl.TRIANGLE_STRIP, cnt: 4, inst: 1, bl: [gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE] });
  }
  function ready() {
    if (BROKEN) return false;
    makeProgram();
    var r = HOST.linked(PROG);
    if (r === 'lost' || r === false) { if (r === false && PROG.u && !PROG.ok) BROKEN = true; return false; }
    if (!RING) bootRing();   // (the harness's stills and forced colours, which have no boot: made at the first draw)
    return true;
  }
  /* the words' colour as light in the scene: the grade the composite used, undone (a dark word's black is no light) */
  function inkLight(text, E) {
    var v = parseInt(text.slice(1), 16), c = [(v >> 16 & 255) / 255, (v >> 8 & 255) / 255, (v & 255) / 255], i, K = 0.78, m;
    for (i = 0; i < 3; i++) c[i] = c[i] <= 0.04045 ? c[i] / 12.92 : Math.pow((c[i] + 0.055) / 1.055, 2.4);
    m = Math.max(c[0], c[1], c[2]);
    if (m > K) { var mm = K - (1 - K) * Math.log(Math.max(1 - (Math.min(m, 0.999) - K) / (1 - K), 1e-4)); for (i = 0; i < 3; i++) c[i] *= mm / m; }
    for (i = 0; i < 3; i++) INK[i] = Math.max(0, (c[i] - (E ? E.lift[i] : 0)) / (E ? E.gain[i] : 1)) / (E ? E.exposure : 1);
    return INK;
  }

  var tmp3 = {};
  /* every bird where it is now (between the last two steps), drawn afresh on the hand's frames */
  function drawBirds() {
    var C = camDrawn(), al = HOST.alpha(), moving = !HOST.reduced(), tr = moving ? t - (1 - al) * STEP_DT : t, i, j, F, m, s, tau, nB = 0, o, k, fresh, boil;
    measureIf();
    /* the frames as drawn: the camera's own place */
    FW.ox = C.pos[0]; FW.oy = C.pos[1]; FW.oz = C.pos[2];
    flightNow();
    k = Math.floor(tr * DRAW_FPS); fresh = k !== phase; phase = k;
    boil = Math.floor(tr * BOIL_FPS);
    for (var li = 0; li < 2; li++) for (i = 0; i < (li ? PLACES : flights).length; i++) {
      F = (li ? PLACES : flights)[i]; tau = tr - F.t0;
      var gone = F.gone ? clamp(1 - (tr - F.gone) / (F.goneT || GONE_T), 0, 1) : 1;
      for (j = 0; j < F.m.length; j++) {
        m = F.m[j]; s = m.s; if (!s) continue;
        where(F, m, tau, wb); projReal(wb.x, wb.y, wb.z, C, tmp3);
        var n = tmp3.n, a = fadeFor(F, n), d = s.d;
        if (!(a >= 0.02) || !(tmp3.z > 1) || !inView(tmp3.x, tmp3.y, d.hw * n, d.hh * n) || nB >= MAXB) { s.on = false; s.lastOp = 0; continue; }
        if (!s.on || fresh || !s.ok) pose3D(F, m, tau, moving ? boil : 0, !moving, C);
        s.on = true;
        /* its 1 s appear starts when it is first seen (the tracker's); a bird drawn before the tracker has seen it waits
           at nothing (round 1 drew a returning bird at the ink of its first showing for a frame or four, then faded it in) */
        /* (E1.1 Fix 2) a bird back in view within LEAVE_T carries on at its ink from the frame it is drawn again, not
           from the tracker's next look (every fifth step): it waited at nothing until then and came back whole, the
           judges' pop (DUNES s21's drag, a line of gulls swept out and back in by the drag at 251 s, 40-75 px inside the
           edge) */
        var back = s.shownT >= 0 && !s.vis && s.outT > -1e8 && t - s.outT <= LEAVE_T;
        var app = moving ? (s.still ? 1 : s.shownT >= 0 && (s.vis || back) ? clamp((tr - s.shownT) / (s.appT || APPEAR_T), 0, 1) : 0) : 1;
        if (!moving) s.still = true;   // (round 3, second part: a bird of the still sky flies on at its ink when motion is turned on, until it leaves the window; it vanished and faded in again over a second)
        var sw = moving ? sweepNow() : 0, sb = stepBack(tmp3.x, tmp3.y, d.hw * n, (d.hh + BOB * d.span) * n, sw > DRAG_PX ? sw * SB_LEAD : 0);   // (Fix 3: the band led by a drag's sweep)
        if (moving && s.sbT >= 0) sb = Math.min(sb, s.sbS + SB_UP * Math.max(0, tr - s.sbT));   // (stepping back at once, coming back as it appears: the tracker's)
        if (F.gone) { if (!(s.sbG <= 1)) s.sbG = sb; sb = s.sbG = Math.min(s.sbG, sb); } else s.sbG = undefined;   // (E1.1: a flight let go fades and never comes back out from the words' margin)
        var op = s.op * app * gone * sb * (1 - ease((n - NEAR_FADE[0]) / (NEAR_FADE[1] - NEAR_FADE[0])));   // (and one the camera comes too near steps aside)
        s.lastOp = op; s.lastApp = app; s.lastSB = sb;
        if (op <= 0.003) continue;
        o = nB * 32;
        var bx = wb.x - C.pos[0], by = wb.y + s.bob - C.pos[1], bz = wb.z - C.pos[2];
        for (var p = 0; p < 5; p++) { INST[o + p * 4] = bx + s.X[3 * p]; INST[o + p * 4 + 1] = by + s.X[3 * p + 1]; INST[o + p * 4 + 2] = bz + s.X[3 * p + 2]; }
        INST[o + 3] = op; INST[o + 7] = s.lw / 2 * VW.dpr; INST[o + 11] = FX.cloud ? s.wf : 0; INST[o + 15] = 0; INST[o + 19] = NEARMOST * d.span * MPU + 2;
        for (p = 0; p < 10; p++) INST[o + 20 + p] = s.J[p];
        INST[o + 30] = s.pw[0]; INST[o + 31] = s.pw[1];
        var bpad = s.lw + 2 * hand + 3;
        UB[4 * nB] = tmp3.x - d.hw * n - bpad; UB[4 * nB + 1] = tmp3.y - (d.hh + BOB * d.span) * n - bpad; UB[4 * nB + 2] = tmp3.x + d.hw * n + bpad; UB[4 * nB + 3] = tmp3.y + (d.hh + BOB * d.span) * n + bpad;
        nB++;
      }
    }
    STATS.drawn = nB;
    if (!nB) return;
    if (!FORCED && HOST.under) HOST.under(UB, nB);   // (round 3: the canvas drawn straight: what lies under the birds, copied for the ink to read)
    var P = PROG, E = HOST.grade(), w = HOST.words(), tex = !FORCED && HOST.bindTextures();
    HOST.target();
    gl.useProgram(P.p); if (!FORCED) HOST.frameUniforms(P);
    RI = (RI + 1) % RING.length; VAO = RING[RI][0]; VBO = RING[RI][1];   // (E1: the ring's next buffer, last drawn three frames ago)
    gl.bindVertexArray(VAO); gl.bindBuffer(gl.ARRAY_BUFFER, VBO); gl.bufferSubData(gl.ARRAY_BUFFER, 0, INST, 0, nB * 32);
    inkLight(w.text, E);
    HOST.view(VW);
    var light = w.kind === 'light';
    UGR[0] = E ? E.exposure : 1; UGR[1] = E ? E.sat : 1; UGR[2] = FX.lit && !light ? SHADE : 0; UGR[3] = FX.air ? (light ? 1 : AIR_INK) : 0;   // (round 3: the night's light ink keeps the whole of the air, as round 2 measured it: 7.2-7.8:1, the live's own night birds' tone; a quarter of it brought back round 1's white cut out of the night, 226-229 on 0-15-39)
    USC[0] = VW.sUx; USC[1] = VW.sUy; USC[2] = VW.hUx; USC[3] = VW.hUy;
    UMK[0] = VW.mUx; UMK[1] = VW.mUy; UMK[2] = VW.hUx - 0.5 / Math.max(1, VW.outW / 2); UMK[3] = VW.hUy - 0.5 / Math.max(1, VW.outH / 2);
    ULAND[0] = FX.land && tex ? 1 : 0; ULAND[1] = FX.cloud && tex ? 1 : 0; ULAND[2] = VW.dpr; ULAND[3] = tex ? 1 : 0;
    UBL[0] = VW.bUx || 1; UBL[1] = VW.bUy || 1; UBL[2] = VW.bloom || 0; UBL[3] = FX.glare && tex ? 1 : 0;
    UGL[0] = GLARE[0]; UGL[1] = GLARE[1]; UGL[2] = GLARE[2]; UGL[3] = GLARE[3];
    var fc = FORCED && HOST.forced ? HOST.forced() : null;
    UMODE[0] = FORCED ? 1 : 0; UMODE[1] = light && tex ? 1 : 0; UMODE[2] = NIGHT[0]; UMODE[3] = NIGHT[1];
    if (fc) { UINKF[0] = fc.ink[0]; UINKF[1] = fc.ink[1]; UINKF[2] = fc.ink[2]; }
    var u = P.u;
    gl.uniform2f(u.uOut, VW.outW, VW.outH); gl.uniform3fv(u.uInk, INK); gl.uniform4fv(u.uGr, UGR);
    gl.uniform3fv(u.uLift, E ? E.lift : [0, 0, 0]); gl.uniform3fv(u.uGain, E ? E.gain : [1, 1, 1]);
    gl.uniform4fv(u.uSc, USC); gl.uniform4fv(u.uMk, UMK); gl.uniform4fv(u.uLand, ULAND);
    gl.uniform4fv(u.uBl, UBL); gl.uniform4fv(u.uGl, UGL); gl.uniform4fv(u.uMode, UMODE); gl.uniform3fv(u.uInkF, UINKF);
    if (u.uHold) gl.uniform2f(u.uHold, INK_MIN, FX.air && tex && !light ? 1 : 0);
    if (u.uEdge) gl.uniform1f(u.uEdge, clamp((VW.ddpr || VW.dpr) / Math.max(VW.dpr, 0.5), 1, 2));
    if (FORCED) gl.uniformMatrix4fv(u.uVP, false, forcedVP());
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.depthMask(false);
    gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, nB);
    gl.disable(gl.BLEND); gl.depthMask(true);
    gl.bindVertexArray(null);
    HOST.count(1, nB);
  }
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
  var SB_LEAD = 0;   // (Fix 3: tried at 0.2 s, the suite's step-backs went 7 -> 32 and its re-entries 30 -> 45 for one vanish fewer (2 -> 1): off)
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
    return inViewFor(F) * pick(F.r, GAP) * (1 + Math.min(THIN_MAX, t / THIN)) * (1.1 - 0.2 * fTraffic) * OPEN_SKY * GAP_K * crowd();
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
        on++; if (!(s.wf > 0.5)) cl = false; if (!li) seenNow++;
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
      if (held && !F.gone) { F.gone = t; F.goneT = quick ? SB_GO_T : GONE_T; STATS.landed.words++; STATS.guard.held++; if (quick) STATS.guard.ahead = (STATS.guard.ahead || 0) + 1; if (!F.place) nextAsFirst(true); }   // (Fix 2: its successor planned at once, while it fades)   // (a place's thermal too: the words came onto it, all its birds go; E1.1: ahead of the margin, quickly)
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
    if (C) camHistory(C);
    if (moving && STATS.steps % 6 === 0) errLearn();
    calmAsk();
    /* (round 2) an empty sky is not kept waiting: no bird seen a second and a half, and the next comes as the first did
       (the view turns flights out of sight sooner than the live's sky ended them) */
    if (moving && !job && t - lastSeenAny > EMPTY_T && !firstNext) {
      firstNext = true; tNext = Math.min(tNext, t); misses = 0;
      /* (the flights out of sight that are not about to come into it are let go: the new one is not kept from their bands) */
      for (i = flights.length - 1; i >= 0; i--) { F = flights[i]; if (!F.gone && F.firstSeen === undefined && !(t - F.t0 < (F.enterT || 0) + 1.5) && !(C && seenReal(F, t - F.t0, C))) { land(F); STATS.landed.unseen++; } }   // (round 3: a flight seen before is kept: the view may come back to it)
    }
    var w0 = work;
    /* (round 3) the view clearing (a passage's cloud thinning out, the cover falling under COVER_PLAN): the next flight is
       planned as it clears, there as it has (round 2 waited for the cover all but gone: every passage between realms left
       the sky empty some 2 s longer) */
    coverAvg += (cover - coverAvg) * Math.min(1, dt / 0.5);
    var clearing = cover < COVER_PLAN && cover < coverAvg - 0.01;
    if (!job && moving && (cover < 0.05 || clearing) && t >= tNext && activeFlights() < maxFlights() && seenNow < crowdTarget() + CROWD_OVER) {   // (round 3: nor while the window already holds more than the live's sky)
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
    if (STATS.steps % 30 === 0 && !FORCED) placeStep(C, cover);
    if (PLACES.length && FL.ok) placeLift(dt);
    for (i = flights.length - 1; i >= 0; i--) {           // done: past its end and seen no more (or faded out); or let go unseen
      F = flights[i];
      var tau = t - F.t0;
      if ((F.gone && t - F.gone > (F.goneT || GONE_T)) || (tau > F.dur && (!C || !seenReal(F, tau, C))) || tau > F.dur + 40) { land(F); STATS.landed.done++; continue; }
      if (F.gone || !moving) continue;
      if (F.firstSeen !== undefined && t - F.lastSeen > LEAVE_T && !(C && seenReal(F, tau, C))) {   // the view has turned from it
        /* (round 3) kept, unseen, while its planned span lasts (AWAY_T at most): the visitor may look back to it (round
           2 let it go after LEAVE_T, and a skein looked away from for 4 s was gone when the view came back); its band is
           free meanwhile, the next flight comes as the first did, and it gives way to one that needs its birds */
        if (tau < F.dur && t - F.lastSeen < AWAY_T) { if (!F.away) { F.away = true; STATS.away++; nextAsFirst(); } continue; }
        land(F); STATS.landed.unseen++; if (!F.away) nextAsFirst(); continue;
      }
      if (F.firstSeen === undefined && tau > (F.enterT || 0) + UNSEEN_T && !(C && seenReal(F, tau, C))) { land(F); STATS.landed.never++; nextAsFirst(); continue; }   // it never came into view
      if (F.cloudT > CLOUD_T) { F.gone = t; STATS.landed.cloud++; nextAsFirst(); continue; }   // hidden by cloud: let go while it is hidden
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

  /* ---------------- the hooks ---------------- */

  weather(); r2 = vstream(2); r2x = r2(); r2y = r2(); errInit();
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
      drawBirds();
    },
    visit: function () { clearAll(); },
    reset: function () { t = 0; flightNo = 0; crowdN = 0; HIDJOB = -1e9; weather(); r2 = vstream(2); r2k = 0; r2x = r2(); r2y = r2(); WK[20] = -1; dirty = true; clearAll(); errInit(); CH.n = 0; CH.i = 0; GVT = -1; calmOn = -1; HOLD.until = -1e9; HOLD.rest = -1e9; HOLD.on = 0; HOLD.refused = 0; HOLD.spared = 0; STILL.on = false; },
    lost: function () { PROG = null; VAO = null; VBO = null; RING = null; BROKEN = false; makeProgram(); },
    boot: function () { makeProgram(); bootRing(); },   // (E1: the boot's stage B: the instance ring and its warm entry)
    repose: function () { phase = -1; },   // (development: the next draw poses every bird afresh, for timing it)
    /* development: a bird of a kind built in 3D, posed (k: the wrists, as the live's; shut), its chain seen along
       directions (yaw about the vertical from behind, pitch: from below +), orthographically: the 2D points (y up) */
    lab: function (sort, seed, k, shut, views, sweep, square) {
      var keep = SWEEP, keepF = FACING; if (sweep) SWEEP = sweep; if (square !== undefined) FACING = square;
      var r = sm32(seed), S = SORTS[sort], B = drawBird(r, S), d = measureBird(B, SPAN * S.size), o = [], i, v;
      var m = { s: { d: d, X: new Float64Array(15), J: new Float32Array(10), face: 1, sgn: 1, key: 0 }, rest: 0, glide: k, n: 1 };
      var F0 = [0, 0, 1], S0 = [-1, 0, 0], U0 = [0, 1, 0];
      for (v = 0; v < views.length; v++) {
        var yw = views[v][0] * DEG, pt = views[v][1] * DEG;
        /* the camera looks along the bird's way, turned by yw about the vertical and tilted up by pt (from below) */
        var f = [Math.sin(yw) * Math.cos(pt), Math.sin(pt), Math.cos(yw) * Math.cos(pt)], rr = [-f[2], 0, f[0]], rl = Math.hypot(rr[0], rr[2]); rr[0] /= rl; rr[2] /= rl;
        var uu = [rr[1] * f[2] - rr[2] * f[1], rr[2] * f[0] - rr[0] * f[2], rr[0] * f[1] - rr[1] * f[0]];
        if (FACING === null) chain(B, d, k, shut, 0, 1, 1, F0, S0, U0, m.s.X);   // (null: the plane square to its way, unturned)
        else { FWD[0] = 0; FWD[1] = 0; FWD[2] = 1; facing(f[0], f[1], f[2], FWD, { r: rr, u: uu }, FACING + (square === undefined ? FACING_UP * ease((k - 0.6) / 0.4) : 0)); chain(B, d, k, shut, 0, 1, SR[0] * rr[0] + SR[2] * rr[2] < 0 ? -1 : 1, FWD, SR, UP, m.s.X); }
        var P = []; for (i = 0; i < 5; i++) P.push([m.s.X[3 * i] * rr[0] + m.s.X[3 * i + 1] * rr[1] + m.s.X[3 * i + 2] * rr[2], m.s.X[3 * i] * uu[0] + m.s.X[3 * i + 1] * uu[1] + m.s.X[3 * i + 2] * uu[2]]);
        o.push(P);
      }
      var L = []; shape(B, k, shut, SH, 0); for (i = 0; i < 5; i++) L.push([SH[2 * i] * d.sc * MPU, -SH[2 * i + 1] * d.sc * MPU]);
      SWEEP = keep; FACING = keepF;
      return { live: L, views: o, lean: Math.atan2(B.sn, B.c) / DEG };
    },
    state: function (o) {
      if (o && o.fx) for (var k in o.fx) FX[k] = !!o.fx[k];
      if (o && o.trials !== undefined) { var tl = TRIALLOG; TRIALLOG = o.trials ? [] : null; if (tl) return tl; }
      if (o && o.guardlog !== undefined) { var gl0 = GLOG; GLOG = o.guardlog ? [] : null; if (gl0) return gl0; }
      var C = camDrawn(), CS0 = camStep();
      var out = { t: t, flights: [], drawn: STATS.drawn, planned: STATS.planned, steps: STATS.steps, workMax: STATS.workMax, costs: STATS.costs, landed: Object.assign({}, STATS.landed), fails: Object.assign({}, STATS.fails), jobs: (o && o.jobs) ? STATS.jobs.slice() : undefined,
        guard: Object.assign({}, STATS.guard), away: STATS.away, holds: HOLD.on, holdRefused: HOLD.refused, holdSpared: HOLD.spared, holding: t < HOLD.until, err90: [1, 2, 4, 6, 8, 10, 12, 15, 20].map(function (h) { return +errAt(h).toFixed(2); }), calm: calmOn,
        job: job ? job.mode : null, jobD: job && HOST.dev ? { a: job.a, c: job.c, oi: job.oi, pend: !!job.pend, F: !!job.F, it: job.it ? { k: job.it.k, from: job.it.from, until: job.it.until, probe: job.it.probe, enter: job.it.enter, last: job.it.last } : null } : null, tNext: tNext, fx: Object.assign({}, FX), W: W, H: H, mpu: MPU, forced: FORCED, openSky: OPEN_SKY,
        frame: { yaw: 0, y: FW.oy, rate: 0 }, cam: { f: cam.f, pitch: Math.atan2(cam.s, cam.c), floorY: floorY },
        FW: { yaw: 0, ox: FW.ox, oy: FW.oy, oz: FW.oz },
        CB: CS0 ? { pos: Array.from(CS0.pos), f: Array.from(CS0.f), r: Array.from(CS0.r), u: Array.from(CS0.u) } : null,
        CD: C ? { pos: Array.from(C.pos), f: Array.from(C.f), r: Array.from(C.r), u: Array.from(C.u) } : null,
        VW: { tanX: VW.tanX, tanY: VW.tanY, dpr: VW.dpr, bdpr: VW.bdpr, cssW: VW.cssW, cssH: VW.cssH },
        FL: { view: FL.view, psi: FL.psi, speed: FL.speed, y: FL.y, ground: FL.ground },
        words: words.map(function (q) { return [q.l, q.t, q.r, q.b, q.m]; }),
        VP: { n: VP.n, t0: VP.t0, still: VP.still, yaw: Array.prototype.slice.call(VP.yaw, 0, Math.min(VP.n, 200)).map(function (v) { return +v.toFixed(4); }) } };
      FW.ox = C.pos[0]; FW.oy = C.pos[1]; FW.oz = C.pos[2];
      flights.concat(PLACES).forEach(function (F) {
        var tau = t - F.t0, b = [];
        F.m.forEach(function (m) {
          where(F, m, tau, wb); projReal(wb.x, wb.y, wb.z, C, tmp3);
          var s = m.s, pts = null, pl = null, air = null;
          if (s && s.ok) { pts = []; for (var q = 0; q < 5; q++) { projReal(wb.x + s.X[3 * q], wb.y + s.bob + s.X[3 * q + 1], wb.z + s.X[3 * q + 2], C, tmp2); pts.push([+tmp2.x.toFixed(2), +tmp2.y.toFixed(2)]); } }
          if (!F.place) { spot(F, m, tau, tmp2); pl = [+tmp2.x.toFixed(2), +tmp2.y.toFixed(2)]; air = [tmp2.ax, tmp2.ay, tmp2.az]; }   // (where the planner's still view sees it: against the world)
          var Lt = HOST.light(), sd = Lt && Lt.sunDir, dxs = wb.x - C.pos[0], dys = wb.y - C.pos[1], dzs = wb.z - C.pos[2], dl = Math.sqrt(dxs * dxs + dys * dys + dzs * dzs) || 1;
          b.push({ pts: pts, pl: pl, air: air, sun: sd ? +((dxs * sd[0] + dys * sd[1] + dzs * sd[2]) / dl).toFixed(4) : 0, lean: +(Math.atan2(m.d.B.sn, m.d.B.c) / DEG).toFixed(1), leanLive: +tipsLean(m.d.B).toFixed(1),
            x: +tmp3.x.toFixed(2), y: +tmp3.y.toFixed(2), n: +tmp3.n.toFixed(3), z: +tmp3.z.toFixed(1), w: [+wb.x.toFixed(2), +wb.y.toFixed(2), +wb.z.toFixed(2)], on: !!(s && s.on), lw: s ? s.lw : 0, op: s ? s.op : 0,
            op2: s ? +(s.lastOp || 0).toFixed(4) : 0, app: s ? s.lastApp : 0, sb: s ? s.lastSB : 1, shown: s ? s.shownT : -1, vis: s ? s.vis : false, hw: m.d.hw, hh: m.d.hh, bob: s ? s.bob : 0, lfix: s ? +((s.lfix || 0) / DEG).toFixed(2) : 0, pw: s ? [s.pw[0], s.pw[1]] : null,
            face: s ? s.face : 0, wf: s ? +s.wf.toFixed(2) : 0, ph: beat(m, tau), span: +(m.d.span * MPU).toFixed(2) });
        });
        out.flights.push({ id: F.place ? 'p' + F.key : F.id, kind: F.kind, sort: F.sort, n: F.n, dir: F.dir, tau: +tau.toFixed(2), dur: +F.dur.toFixed(2), v: F.v, vPx: F.vPx, n0: F.n0, gone: F.gone || 0, place: !!F.place,
          yawW: F.place ? null : F.yaw, pitch0: F.pitch0, lastSeen: F.lastSeen, firstSeen: F.firstSeen, enterT: F.enterT, seenSpan: F.seenSpan, far: !!F.farIn, away: !!F.away, eased: F.eased || 0, wheeled: F.wheeled || 0, sp: F.path && F.path.sp ? F.path.sp.length : 0, birds: b });
      });
      return out;
    }
  };
  });
})();
