  /* ---------------- constants ---------------- */

  /* the hand */
  var SPAN = 22;               // px across: a mid-sized bird at middle distance (nearness 1), on a large window
  var LINE = [1.5, 2.5];       // stroke width, px: finer far off, bolder near (the pen's pressure)
  var SIZE_VAR = 0.08;         // birds of one flight differ in size by up to this share

  /* the kinds of bird: their size (of a mid bird's span) */
  var SORTS = { goose: { size: 1.18 }, ibis: { size: 0.95 }, gull: { size: 1.05 }, heron: { size: 1.4 }, crow: { size: 0.8 }, finch: { size: 0.62 },
    swallow: { size: 0.5 }, stork: { size: 1.45 } };
  /* which kinds fly which patterns, and how often (a day sky) */
  var SORT_OF = {
    skein: [['goose', 75], ['ibis', 25]],
    line: [['ibis', 40], ['goose', 35], ['gull', 25]],
    pair: [['gull', 40], ['goose', 20], ['crow', 20], ['swallow', 10], ['finch', 10]],
    single: [['gull', 35], ['heron', 30], ['crow', 20], ['swallow', 10], ['finch', 5]],   // mostly the big, slow-beating kinds:
    loose: [['crow', 35], ['gull', 30], ['finch', 20], ['swallow', 15]],                 // the small quick ones now and then
    soar: [['stork', 1]]
  };
  /* the world's skies read as times of day (cls: glow the afterglow; blue the blue hour; first the first light; moon the
     night skies); any other sky is a day sky and flies the tables above. Per class: the patterns, the kinds a pattern flies */
  var SKY_CLS = { afterglow: 'glow', bluehour: 'blue', firstlight: 'first', moonlit: 'moon', milkyway: 'moon', aurora: 'moon' };
  var LIFE = {
    glow:  { pat: [['skein', 27], ['line', 15], ['pair', 18], ['single', 25], ['loose', 15]],
             kinds: { skein: [['goose', 80], ['ibis', 20]], line: [['goose', 35], ['ibis', 30], ['gull', 35]], pair: [['gull', 40], ['crow', 35], ['goose', 15], ['swallow', 10]],
                      single: [['gull', 40], ['heron', 35], ['crow', 20], ['swallow', 5]], loose: [['crow', 70], ['gull', 30]] } },
    blue:  { pat: [['skein', 32], ['line', 15], ['pair', 15], ['single', 35], ['loose', 10]],
             kinds: { skein: [['goose', 80], ['ibis', 20]], line: [['goose', 35], ['ibis', 30], ['gull', 35]], pair: [['gull', 50], ['crow', 15], ['goose', 35]],
                      single: [['gull', 45], ['heron', 45], ['crow', 10]], loose: [['crow', 60], ['gull', 40]] } },
    first: { pat: [['skein', 25], ['line', 10], ['pair', 13], ['single', 37], ['loose', 15]],
             kinds: { skein: [['goose', 1]], line: [['goose', 50], ['gull', 50]], pair: [['gull', 60], ['goose', 40]], single: [['gull', 50], ['heron', 50]], loose: [['crow', 1]] } },   // (first light: crows leave the roost in loose flocks together, before sunrise: https://doi.org/10.1016/j.cub.2022.04.032, https://doi.org/10.25225/fozo.v66.i4.a3.2017; physics: birds/day)
    moon:  { pat: [['skein', 20], ['pair', 15], ['single', 60]],
             kinds: { skein: [['goose', 1]], pair: [['gull', 60], ['goose', 40]], single: [['gull', 50], ['heron', 50]] } }
  };
  var LIFE_N = { skein: [[5, 8], [6, 5], [7, 32], [9, 35], [11, 20]],   // how many birds a flock of each pattern has: [n, weight]
                 line: [[3, 40], [5, 35], [6, 25]], pair: [[2, 1]], single: [[1, 1]], loose: [[5, 40], [6, 35], [7, 25]] };
  var V_GEOM = { goose: { x: [1.9, 3.0], y: [1.15, 1.45] }, ibis: { x: [0.8, 1.0], y: [0.75, 0.9] } };   // a skein's places, per step out from the leader: spans back (x) and aside (y), laid along its way through the air (the goose's V wide, the ibis's wider)
  function skyCls() { var id = HOST.sky ? HOST.sky() : ''; return SKY_CLS[id] || 'day'; }
