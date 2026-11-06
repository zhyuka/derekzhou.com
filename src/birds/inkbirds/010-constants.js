  /* ---------------- constants ---------------- */

  /* the hand */
  var SPAN = 22;               // px across: a mid-sized bird at middle distance (nearness 1), on a large window
  var LINE = [1.5, 2.5];       // stroke width, px: finer far off, bolder near (the pen's pressure)
  var BOB = 0.04;              // spans: the body lifts this much on the downstroke
  var TAIL = [10, 14.5];       // glyph units: a back wing drawn out as a tail ...
  var TAIL_UP = [12, 22];      // ... rising this many degrees off the bird's line
  var LEAN = [-14, 5];         // degrees: a bird stands at about its drops' angle (steps), give or take
  var FACE_HYST = 0.2;         // |cos heading| past this before a bird turns to face the other way

  /* the depth: the window is a camera looking out and up at the sky */
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
  var UP_V = 0.06;             // spans: a V lies level in the air, give or take this
  var SPACE_SEEN = 2;          // px: two birds of a flight never closer than this on the window (a near one passing a far one)
  var SLOWEST = 5;             // px/s: nor slower than this anywhere in view (far off, going away)
  var TURN_SEEN = 18;          // degrees a second: nor any bird of it turning faster than this on the window (a turn seen heading away sweeps round)
  var TURN_MAX = 22;           // degrees a second: and no bird, as it will be drawn (its drift, the wander, a gust), ever turning faster (the planner's check)

  /* the sky */
  var OUT = 70;                // px beyond the window where a path begins and ends
  /* (the owner, 2026-11-05: "pls remove the masking boxes from behind the text completely. it's completely fine if the birds fly behind/in front of it")
     no sky is kept clear round the words: a bird flies behind them as behind any cloud's edge, on its own way */
  var ROOMY = 60;              // px: a path this far from the window's edges is as good as any
  var EDGE = 10;               // px kept from each edge of the window a flight does not cross
  var APART = 48;              // px kept between two flights, always
  var FLIGHTS = [2, 3];        // flights in the sky at once, at most: more on a WIDE sky
  var WIDE = 900;              // px
  var STEP = 0.3;              // s: the planner's look-ahead step (a path is checked whole before a bird enters)
  var TRIES = 16;              // paths tried per flight
  var LEAD = 4;                // s: a flight is planned to set off this far ahead (still beyond the edge)

  /* the pace */
  var PACE = [0.94, 1.06];     // the visit's pace, on every kind's own
  var TEMPO = [0.95, 1.05];    // the visit's wing-beat, on every kind's own
  var SPEED = [14, 64];        // px/s where a flight crosses: never slower, never faster ...
  var CALM = [22, 52];         // s: a mid bird crosses the window in about this long (a phone's .. 1440 px and up):
                               // the page's calm, slower than the wild, every kind slowed alike, so each keeps its pace ...
  var REF = 2.04;              // ... (a mid bird: its distance, 0.85, times its 2.4 spans a second) ...
  var CROSS = [15, 36];        // s: ... and no bird across it quicker than this ...
  var KNEE = 0.75;             // ... easing toward that from this share of it, so a quick kind stays quicker than a slow one
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

