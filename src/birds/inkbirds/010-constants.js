  /* ---------------- constants ---------------- */

  /* the hand */
  var SPAN = 22;               // px across: a mid-sized bird at middle distance (nearness 1), on a large window
  var LINE = [1.5, 2.5];       // stroke width, px: finer far off, bolder near (the pen's pressure)
  var SIZE_VAR = 0.08;         // birds of one flight differ in size by up to this share

  /* the kinds of bird: their size, their wing-beat (Hz) and flapping, the old marks' drawing numbers (unused now but the
     size), their paths' tilt; and which kinds fly which patterns, and how often */
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
  var SORT_OF = {
    skein: [['goose', 75], ['ibis', 25]],
    line: [['ibis', 40], ['goose', 35], ['gull', 25]],
    pair: [['gull', 40], ['goose', 20], ['crow', 20], ['swallow', 10], ['finch', 10]],
    single: [['gull', 35], ['heron', 30], ['crow', 20], ['swallow', 10], ['finch', 5]],   // mostly the big, slow-beating kinds:
    loose: [['crow', 35], ['gull', 30], ['finch', 20], ['swallow', 15]],                 // the small quick ones now and then
    soar: [['stork', 1]]
  };
  /* (life) the world's skies read as times of the evening (cls: glow the afterglow; blue the blue hour; first the first
     light; moon the night skies); a day sky the tables above. Per class: the patterns, the kinds a pattern flies */
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
  var LIFE_N = { skein: [[5, 8], [6, 5], [7, 32], [9, 35], [11, 20]],   // (round 3, step 3: drawn larger, as the room makes many of them fly as fives)
                 skeinI: [[3, 35], [5, 35], [6, 10], [7, 20]], skeinN: [[5, 20], [7, 45], [9, 35]],
                 line: [[3, 40], [5, 35], [6, 25]], pair: [[2, 1]], single: [[1, 1]], loose: [[5, 40], [6, 35], [7, 25]] };   // (fix: 5-7, so a loose flock finds room under the calm's cap)
  var V_GEOM = { goose: { x: [1.9, 3.0], y: [1.15, 1.45] }, ibis: { x: [0.8, 1.0], y: [0.75, 0.9] } };   // (fix: in the birds' own spans; the goose's aside 1.0-1.25 for a full angle of 35-60 deg about its way (DESIGN L4), no FORM_K; laid along their way through the air, spot())   // (spans back, aside per place: the goose's V 35-60 deg, the ibis's 80-90)
  function skyCls() { var id = HOST.sky ? HOST.sky() : ''; return SKY_CLS[id] || 'day'; }
