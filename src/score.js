/* The sound icon's score: music that follows the sky (the owner, 2026-11-12: "ship it", of the live score that follows
   the sky as it changes and never repeats; chosen by ear over seventeen rounds of sketches).

   Loaded deferred on every visit, but silent and idle until the visitor presses the icon: sound.js (the switch) makes
   the one audio context, fetches the one sheet of notes (real recordings: strings, clarinet, horn, harp, piano,
   contrabass, tuba; CC0) and hands both here. Nothing here fetches, makes a context or reads a clock of the page's:
   its time is the audio context's own (now, passed in by the switch about twice a second), and its one entropy is a
   seed the world hands it from the visit's one read (WORLD.sky().seed). It reads the sky (WORLD.sky(): the sky on
   show, the next and when the change comes, how much of the view is cloud, the air heard where the camera flies)
   and never writes to the world.

   What it plays (round twenty-one, of "i constantly hear some type of chord": no chord held under it; the keys,
   colours and changes of round seventeen, the owner's pick): three voices (cello, viola, violins) each sing one note at a time, swelling in over seconds and dying away, then rest, each on a cycle
   of its own, so the notes meet and part and never sit as a chord; the harmony only implied, a slow walk through the
   sky's own chords, each voice taking its next note from the chord of the moment. On top the colour's own few notes
   (afterglow horns, Milky Way and aurora harp, blue hour piano, the moonlit sea clarinet, first light the violins;
   never a tune). Under it a deep end you feel more than hear, a tide: now and then at a chord's start the root two
   octaves down, a tuba played at half speed, kept to its fundamental, with a contrabass. Passages of 40-80 s change
   which voices sing and how long they rest; a note alone is a little louder, among others softer. A sky change is
   planned with the world's own and is the one chord of it all: near, two chords both keys share, then the voices
   gather into the new key's major chord one at a time as the music swells to the moment the colour changes; far,
   the mist (the strings alone, no deep end) and out of it the new key's major chord. Never a hole: where every note
   would be gone at once, the next voice comes in early. No two notes closer than a minor third at once, none a minor
   ninth apart, nothing closer than a fifth low down, one deep note at a time.

   How it sounds (round twenty-two, of "final refinement and cleanup of sounds/acoustics as per your research"): each
   held note tuned pure to the lowest note it meets, as players tune a held third (never more than 15 cents from equal
   temperament); brightening as it swells and darkening as it dies away, as a bowed string does; the sheet's notes
   kept with their bow and breath (an ear model heard them, filtered dark, as tuners and sirens) and looped as long as
   each allows. A room of 3.4 s, smooth and even (its highs dying first, its lows one in both ears, its highs apart),
   the bass kept out of it, the harp and piano nearer; drier over the open dunes, softer and darker over the cloud. The
   deep end the tuba's own low notes, felt, with a quiet trace of their partials a phone can play. A faint wind under
   it all, in gusts on the sky's own breeze, never repeating. The ear's sensitive band eased; about -23 LUFS (the owner, 2026-11-15: "yes make it louder, -23"); no
   compression.

   The night's quiet (the owner, 2026-11-16, of quieter nights: "yes go"): each sky its own level inside the -23,
   afterglow and first light fuller, the night skies about 3 dB under them, never by the whole level, so the deep end
   keeps its weight. Most of it is the strings softer under the night's colours and a note alone lifted less; the
   rest is meant as thinning (the voices resting longer, the colour coming less often and never brought in to fill a
   hole, never a third voice over two), which moves little: the floor (never a hole, never one held note alone over
   3 s) brings a voice in where one would rest, so the Milky Way and aurora begin as many notes a minute as afterglow
   and keep as many sounding (measured 2026-11-25: docs/sound.md); letting the floor wait at night lets one note
   sound alone 6-10 s, a siren. And in the Milky Way, now and then, a breath: the notes let go and for a few seconds
   only the air plays, a soft gust through it. */
(function () {
  'use strict';

  var NOTES = [[6,29,0.5,2.1785,1,0.32956],[6,34,2.8285,6.2299,1,0.22956],[1,55,9.2084,5.761,1,0.57709],[1,59,15.1194,7.0,1,0.36313],[1,62,22.2694,7.0,1,0.39555],[2,62,29.4194,7.0,1,0.57005],[2,66,36.5694,7.0,1,0.33263],[2,69,43.7194,7.0,1,0.56562],[2,72,50.8694,7.0,1,0.26029],[2,76,58.0194,7.0,1,0.48496],[0,36,65.1694,7.0,1,0.46557],[0,40,72.3194,7.0,1,0.23934],[0,43,79.4694,6.3689,1,0.19256],[0,47,85.9883,7.0,1,0.1464],[0,50,93.1383,7.0,1,0.34301],[0,53,100.2883,6.4613,1,0.25132],[5,28,106.8997,7.0,1,0.26297],[5,30,114.0497,7.0,1,0.20173],[5,31,121.1997,7.0,1,0.14179],[5,34,128.3497,7.0,1,0.17723],[3,58,135.4997,7.0,1,0.13254],[3,62,142.6497,7.0,1,0.1517],[3,65,149.7997,7.0,1,0.12627],[3,70,156.9497,7.0,1,0.08717],[3,74,164.0997,7.0,1,0.15534],[3,77,171.2497,7.0,1,0.15711],[4,43,178.3997,7.0,1,0.14411],[4,46,185.5497,7.0,1,0.26131],[4,50,192.6997,7.0,1,0.12751],[4,53,199.8497,7.0,1,0.11478],[4,57,206.9997,7.0,1,0.13412],[4,60,214.1497,7.0,1,0.12649],[4,74,221.2997,6.3918,1,0.15312],[7,41,227.8415,4.5,0,0.30143],[7,45,232.4915,4.5,0,0.41798],[7,48,237.1415,4.5,0,0.34491],[7,52,241.7915,4.5,0,0.61155],[7,55,246.4415,4.5,0,0.30623],[7,59,251.0915,4.5,0,0.4214],[7,62,255.7415,4.5,0,0.82007],[7,65,260.3915,4.5,0,0.4825],[7,69,265.0415,4.5,0,2.02154],[7,72,269.6915,4.5,0,0.9619],[7,76,274.3415,4.5,0,0.71059],[7,79,278.9915,4.5,0,1.541],[7,83,283.6415,4.416,0,1.66104],[7,86,288.2075,3.8974,0,3.25535],[8,36,292.2548,6.0,0,0.46885],[8,40,298.4048,6.0,0,0.35249],[8,44,304.5548,6.0,0,0.47431],[8,48,310.7048,6.0,0,0.51277],[8,52,316.8548,6.0,0,0.37797],[8,56,323.0048,6.0,0,0.37927],[8,60,329.1548,6.0,0,0.65936],[8,64,335.3048,6.0,0,0.92017],[8,68,341.4548,6.0,0,0.6044],[8,72,347.6048,6.0,0,0.89631],[8,76,353.7548,6.0,0,0.5836],[8,80,359.9048,6.0,0,1.30549],[8,84,366.0548,6.0,0,1.38963]], MARK = 0.2;   // (tools/sound/sheet.py writes this line: [instrument, midi, start s, length s, loops, gain])
  var INST = ['cello', 'viola', 'violin', 'clar', 'horn', 'cbass', 'tuba', 'harp', 'piano'];
  var H = 10, OUT = 1.28;   // (s: how far ahead it plans; the output level: about -23 LUFS, true peak under -1.5 dBFS, measured with tools/sound/render.mjs)
  var V9 = [0, 7, 16, 23, 26], V69 = [0, 7, 16, 21, 26], VM9 = [0, 7, 15, 22, 26], LIFT = [0, 7, 18, 21, 26];
  var MAJ = [0, 2, 4, 5, 7, 9, 11], LYD = [0, 2, 4, 6, 7, 9, 11], DOR = [0, 2, 3, 5, 7, 9, 10];
  var FMAJ = [[0, V9], [5, V69], [9, VM9], [0, LIFT], [2, VM9], [0, V69]], FLYD = [[0, V9], [0, LIFT], [2, V69], [9, VM9], [4, VM9]];
  var SKIES = {   // (each sky its key, its scale, its chords (root above the key, voicing), its borrowed chord, its colour)
    afterglow: { key: 5, sc: MAJ, field: FMAJ, sur: [5, VM9], col: 'horn' },
    bluehour: { key: 3, sc: MAJ, field: [[0, V69], [5, V9], [9, VM9], [0, V9], [5, V69]], sur: [5, VM9], col: 'piano' },
    moonlit: { key: 0, sc: DOR, field: [[0, VM9], [5, V69], [10, V9], [3, V9], [7, VM9]], sur: [0, V9], col: 'clar', minor: true },
    milkyway: { key: 8, sc: LYD, field: FLYD, sur: [5, VM9], col: 'harp' },
    aurora: { key: 10, sc: LYD, field: FLYD, sur: [5, VM9], col: 'harp' },
    firstlight: { key: 7, sc: MAJ, field: FMAJ, sur: [5, VM9], col: 'strings' }
  };
  var LIFTS = { horn: 0, harp: -3, piano: -1.5, clar: -3, strings: 0, mist: -6 };   // (dB: the strings under each colour: afterglow's horns and first light's violins over them in full, the night's harp and clarinet over them softer; the deep end the same under all)
  /* the night's quiet (delight wave one, its seventh: each sky its own level inside the -23 frame, the night skies
     about 3 dB under afterglow and first light, never by turning the level down, which at a quiet level takes the
     bass first; the strings under the colours, LIFTS above, do most of it, these little, the floor filling what they
     open: docs/sound.md): each sky how long its voices rest, how often its colour comes, how much a note alone is
     lifted, and its passages (open, warm, air, still, rich) */
  var FULL = {
    afterglow: { rest: 0.7, col: 0.75, lone: 1, kinds: [0.26, 0.2, 0.14, 0.08, 0.32], most: 9 },
    firstlight: { rest: 0.75, col: 0.8, lone: 1, kinds: [0.28, 0.18, 0.16, 0.08, 0.3], most: 9 },
    bluehour: { rest: 1, col: 1, lone: 1, kinds: [0.28, 0.2, 0.18, 0.14, 0.2], most: 9 },
    moonlit: { rest: 1.25, col: 1.35, lone: 0.5, kinds: [0.24, 0.22, 0.2, 0.24, 0.1], most: 2 },
    aurora: { rest: 1.3, col: 1.5, lone: 0.5, kinds: [0.24, 0.2, 0.22, 0.24, 0.1], most: 2 },
    milkyway: { rest: 1.4, col: 1.7, lone: 0.4, kinds: [0.22, 0.2, 0.22, 0.28, 0.08], most: 2 }
  };
  function fillOf(id) { return FULL[id] || FULL.bluehour; }

  function db(x) { return Math.pow(10, x / 20); }
  function curve(f, k) { k = k || 32; var a = new Float32Array(k + 1); for (var i = 0; i <= k; i++) a[i] = f(i / k); return a; }
  var SIN2 = curve(function (x) { var s = Math.sin(Math.PI / 2 * x); return s * s; }), COS2 = curve(function (x) { var c = Math.cos(Math.PI / 2 * x); return c * c; });
  /* a note's swell in and its dying away: sin², as the owner chose (round twenty-two tried curves even in decibels, as
     a player's; an ear model heard a horn rising so as an alarm, and sin² as a horn) */
  var UP = SIN2, DOWN = COS2;
  function curveAt(p, c, t, d) {   // (a curve that would overlap another on its parameter throws in Safari: then a plain ramp to its end)
    try { p.setValueCurveAtTime(c, t, d); } catch (e) { try { p.linearRampToValueAtTime(c[c.length - 1], t + d); } catch (f) { /* the note keeps its level */ } }
  }
  function scaled(c, k) { var a = new Float32Array(c.length); for (var i = 0; i < c.length; i++) a[i] = c[i] * k; return a; }
  function rng(seed) {   // (the world's own stream, splitmix32, on the seed it hands over)
    var s = seed | 0;
    function f() { s = (s + 0x9e3779b9) | 0; var t = s ^ (s >>> 16); t = Math.imul(t, 0x21f0aaad); t ^= t >>> 15; t = Math.imul(t, 0x735a2d97); return ((t ^ (t >>> 15)) >>> 0) / 4294967296; }
    return { f: f, r: function (a, b) { return a + (b - a) * f(); }, i: function (n) { return Math.floor(f() * n); } };
  }
  function bassOf(pc) { pc = ((pc % 12) + 12) % 12; for (var m = 36; m < 48; m++) if (m % 12 === pc && Math.abs(m - 41) <= 6) return m; return 36 + pc; }
  function voiced(pc, v) { var b = bassOf(pc), out = []; for (var i = 0; i < v.length; i++) if (b + v[i] <= 77) out.push(b + v[i]); return out; }
  function pcsOf(r, v) { return v.map(function (x) { return (r + x) % 12; }); }
  function scaleOf(S) { return S.sc.map(function (x) { return (S.key + x) % 12; }); }
  function common(a, b) { var n = 0; for (var i = 0; i < a.length; i++) if (b.indexOf(a[i]) >= 0) n++; return n; }
  function tonic(S) { return [S.key + S.field[0][0], S.field[0][1]]; }
  function isMajor(v) { return v !== VM9; }

  /* a near change: from the sky's tonic, a chord toward the new key (all its notes in one key or the other, three
     shared with the old tonic), then a major chord of the new key (the swell peaks on it), then the new sky */
  function nearPath(X, Y) {
    var sx = scaleOf(X), sy = scaleOf(Y), tx = pcsOf(tonic(X)[0], tonic(X)[1]), ty = pcsOf(tonic(Y)[0], tonic(Y)[1]), V = [V9, V69, VM9, LIFT], b1 = null, b2 = null, r, k, c, s;
    for (r = 0; r < 12; r++) for (k = 0; k < 4; k++) {
      c = pcsOf(r, V[k]);
      if (r === X.key || !c.every(function (x) { return sx.indexOf(x) >= 0 || sy.indexOf(x) >= 0; })) continue;
      s = 2 * common(c, tx) + 1.5 * c.filter(function (x) { return sy.indexOf(x) >= 0 && sx.indexOf(x) < 0; }).length + common(c, ty) - (common(c, tx) < 3 ? 99 : 0);
      if (!b1 || s > b1[0]) b1 = [s, r, V[k], c];
    }
    for (r = 0; r < 12; r++) for (k = 0; k < 4; k++) {
      c = pcsOf(r, V[k]);
      if (!isMajor(V[k]) || r === Y.key || r === b1[1] || !c.every(function (x) { return sy.indexOf(x) >= 0; })) continue;
      s = 2 * common(c, b1[3]) + common(c, ty) - (common(c, b1[3]) < 2 ? 99 : 0);
      if (!b2 || s > b2[0]) b2 = [s, r, V[k], c];
    }
    return [voiced(b1[1], b1[2]), voiced(b2[1], b2[2])];
  }
  /* the mist: four notes in the middle, of the notes both keys share (those of the two tonics first), a minor third to
     a sixth apart, upward from about E-flat 3 */
  function mistChord(X, Y) {
    var sx = scaleOf(X), sy = scaleOf(Y), tx = pcsOf(tonic(X)[0], tonic(X)[1]), ty = pcsOf(tonic(Y)[0], tonic(Y)[1]);
    var both = sx.filter(function (x) { return sy.indexOf(x) >= 0; }).sort(function (a, b) { return /** @type {any} */ (ty.indexOf(b) >= 0) + /** @type {any} */ (tx.indexOf(b) >= 0) - /** @type {any} */ (ty.indexOf(a) >= 0) - /** @type {any} */ (tx.indexOf(a) >= 0); }).slice(0, 5);
    var out = [], m, lo, hi, pass;
    for (pass = 0; pass < 2 && out.length < 4; pass++) {
      out = [];
      while (out.length < 4) {
        lo = out.length ? out[out.length - 1] + (pass ? 3 : 5) : 50; hi = out.length ? out[out.length - 1] + 9 : 56;
        for (m = lo; m <= hi; m++) if (both.indexOf(m % 12) >= 0 && (pass || out.every(function (q) { return q % 12 !== m % 12; }))) break;
        if (m > hi || m > 76) break;
        out.push(m);
      }
    }
    return out;
  }

  /* the voices: one shared buffer (the sheet), each note a region of it, looped (sustained notes) or once (harp,
     piano); every note two gains: its envelope (in over seconds, out at its end) and its breathing (rests, swells) */
  function Score(ctx, out, buffer, feed, sliced) {
    var R = rng((feed() || {}).seed || 0x5c0e5c0e);
    /* the sheet: given whole, or first a decode of its first part and then more of it as it comes (the switch reads the
       one fetch as it arrives: the sheet opens with the notes the score needs first, the tuba and the violas); an
       instrument is there once all its notes are, and until then its voice waits. Every decode starts the same, so time
       zero (the decoder's, found by the click at MARK) and every note's place are the same in each */
    var sheet = /** @type {any} */ (null), UPTO = 0, zero = 0, i, bank = /** @type {any} */ ({});
    function use(b, up) {
      if (!sheet) {
        var data = b.getChannelData(0), sr = b.sampleRate, best = 0;
        for (i = 0; i < Math.min(data.length, sr * 0.5); i++) if (Math.abs(data[i]) > best) { best = Math.abs(data[i]); zero = i / sr - MARK; }   // (where the decoder put time zero)
        NOTES.forEach(function (e) { var k = INST[e[0]]; (bank[k] = bank[k] || []).push({ m: e[1], s0: e[2] + zero, len: e[3], loop: !!e[4], g: e[5] }); });
      }
      var u = up === undefined ? Infinity : up; if (u >= UPTO) { sheet = b; UPTO = u; }   // (only ever more of it)
    }
    if (buffer) use(buffer);
    function has(inst) { var a = bank[inst]; return !!a && a.every(function (e) { return e.s0 + e.len < UPTO - 0.05; }); }
    function pick(inst, m) { var a = bank[inst], b = a[0]; for (var j = 1; j < a.length; j++) if (Math.abs(a[j].m - m) < Math.abs(b.m - m)) b = a[j]; return b; }

    /* the mix: music (strings, colours, gestures) dry and through the room; the deep end mostly dry; the swells; the
       ear's sensitive band eased; a low cut at 27 Hz; the level */
    function biquad(type, f, q, g) {   // (q as a plain quality factor: a low- or high-pass takes its Q in dB, so it is converted)
      var b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f;
      if (q) b.Q.value = type === 'lowpass' || type === 'highpass' ? 20 * Math.log10(q) : q;
      if (g) b.gain.value = g; return b;
    }
    function chain(nodes) { for (var j = 0; j < nodes.length - 1; j++) nodes[j].connect(nodes[j + 1]); return nodes[0]; }
    var level = ctx.createGain(); level.gain.value = OUT;
    var tail = chain([biquad('peaking', 160, 1.4, -3), biquad('peaking', 2200, 0.7, -2.5), biquad('peaking', 2000, 5.1, -1.1), biquad('peaking', 2519, 5.1, -4), biquad('peaking', 3174, 5.1, -3.1), biquad('peaking', 4000, 5.1, -3.2), biquad('peaking', 3200, 0.8, -3), biquad('highpass', 27, 0.7071), level]);
    level.connect(out);
    var mswell = ctx.createGain(), dswell = ctx.createGain(); mswell.connect(tail); dswell.connect(mswell);
    var room = ctx.createConvolver(); room.normalize = false;   // (its buffer: the room's last step, below)
    var music = ctx.createGain(), dry = ctx.createGain(), wet = ctx.createGain(), deepIn = ctx.createGain(), fund = ctx.createGain();
    dry.gain.value = 0.88; wet.gain.value = 0.42;
    var rin = ctx.createGain(), pre = ctx.createDelay(0.1); rin.channelCount = 1; rin.channelCountMode = 'explicit'; pre.delayTime.value = 0.03;
    chain([rin, biquad('highpass', 180, 0.7071), biquad('highpass', 180, 0.7071), pre, room]);
    music.connect(dry); dry.connect(mswell); music.connect(rin);
    var near = ctx.createGain(), nearSend = ctx.createGain(); nearSend.gain.value = db(-5); near.connect(dry); near.connect(nearSend); nearSend.connect(rin);   // (the harp and the piano: nearer, less room)
    var sbus = ctx.createGain(); sbus.connect(music);   // (the strings' and the colour's level: each passage rises and falls on it; the figures and the deep end stand outside it)
    var damp = biquad('lowpass', 5000, 0.7071); chain([room, biquad('lowshelf', 250, 0, -3), damp, wet]); wet.connect(mswell);
    chain([fund, biquad('lowpass', 70, 0.5176), biquad('lowpass', 70, 0.7071), biquad('lowpass', 70, 1.9319), deepIn]);   // (the tuba: its fundamental only, felt)
    var body = ctx.createGain(); body.gain.value = db(-22);   // (and its own partials from 150 to 500 Hz, quiet: a phone has nothing under about 250 Hz, and at a quiet level the ear hardly has the fundamental either, so the deep end is followed by these)
    chain([fund, biquad('highpass', 150, 0.7071), biquad('highpass', 150, 0.7071), biquad('lowpass', 500, 0.7071), biquad('lowpass', 500, 0.7071), body]);
    var deepOut = ctx.createGain(); deepOut.gain.value = db(-2.5); deepIn.connect(chain([biquad('lowshelf', 62, 0, 6), biquad('highpass', 27, 0.5412), biquad('highpass', 27, 1.3066), deepOut])); var dlev = ctx.createGain(); deepOut.connect(dlev); body.connect(dlev); dlev.connect(dswell);   // (dlev: the deep end under the notes above it, below)
    /* the room and the air, filled a slice of samples at a time, in the order they always were, so every draw and every
       sample is what it would be at once. Sliced (the switch), each step is its own task, so the press never holds the
       page for the whole fill (about 55 ms of a desktop core, a third of a second on a slow phone); otherwise (the unit
       test, the render tool) at once. The air's sources start with the music, when the last step is done */
    var jobs = [], starts = [], begun = false;
    /* the room: 3.4 s of noise dying away (60 dB in 4.2 s), through four one-pole low-passes whose corner falls from
       12 kHz an octave every 0.55 s, so its highs die first and smoothly (about 4 s at 125 Hz, 2.9 at 500, 1.8 at 2 kHz,
       1.5 at 8 kHz: no step in the tail, no band of noise left ringing); its lows one noise in both ears and its highs a
       noise of each ear's own (one below 300 Hz, as a head hears a room; apart above it), swelling in over 80 ms and
       tapered over its last tenth; each channel of unit energy */
    (function () {
      var n = Math.floor(3.4 * ctx.sampleRate), b = ctx.createBuffer(2, n, ctx.sampleRate), L = b.getChannelData(0), Rr = b.getChannelData(1), j = 0, sr = ctx.sampleRate;
      var a3 = Math.exp(-2 * Math.PI * 300 / sr), q0 = 0, q1 = 0, q2 = 0, fl = [0, 0, 0, 0], fr = [0, 0, 0, 0];
      jobs.push(function () {
        for (var end = Math.min(n, j + 12288); j < end; j++) {
          var t = j / sr, w0 = R.r(-1, 1), w1 = R.r(-1, 1), w2 = R.r(-1, 1), a = Math.exp(-2 * Math.PI * Math.min(11000, 12000 * Math.pow(2, -t / 0.55)) / sr), x, y, k;
          q0 = w0 + a3 * (q0 - w0); q1 = w1 + a3 * (q1 - w1); q2 = w2 + a3 * (q2 - w2);
          x = q0 + (w1 - q1); y = q0 + (w2 - q2);
          for (k = 0; k < 4; k++) { fl[k] = x + a * (fl[k] - x); x = fl[k]; fr[k] = y + a * (fr[k] - y); y = fr[k]; }
          var e = Math.exp(-6.908 * t / 4.2) * (t < 0.08 ? 0.5 - 0.5 * Math.cos(Math.PI * t / 0.08) : 1) * (j > 0.9 * n ? 0.5 + 0.5 * Math.cos(Math.PI * (j - 0.9 * n) / (0.1 * n)) : 1);
          L[j] = x * e; Rr[j] = y * e;
        }
        return j >= n;
      });
      jobs.push(function () {
        [L, Rr].forEach(function (x) { var e = 0, k; for (k = 0; k < n; k++) e += x[k] * x[k]; e = Math.sqrt(e); for (k = 0; k < n; k++) x[k] /= e; });
        room.buffer = b; return true;
      });
    })();
    /* a faint air, a wind: two noises (a low billow, 70-520 Hz; a higher stream, 450-1500 Hz), each two independent
       channels, 13.7 and 17.9 s long, looped with no seam (white noise has none to mark: no fade, nothing periodic to
       give the loop away), moved by one wind (wind(), below), each drifting slowly across the field */
    var air = [], airPan = [], airIn = ctx.createGain(); airIn.connect(tail);   // (airIn: the air's own level, which the Milky Way's breath lifts, below)
    var sand = /** @type {any} */ (null), sandPan = /** @type {any} */ (null);   // (the sand's hiss: the stream's noise again, at its other half, its own band; below, with the wind)
    (function () {
      [[70, 520, 13.7], [450, 1500, 17.9]].forEach(function (p) {
        var n = Math.floor(p[2] * ctx.sampleRate), b = ctx.createBuffer(2, n, ctx.sampleRate);
        [0, 1].forEach(function (k) {
          var x = b.getChannelData(k), j = 0;
          jobs.push(function () {
            for (var end = Math.min(n, j + 49152); j < end; j++) x[j] = R.r(-1, 1);
            return j >= n;
          });
        });
        jobs.push(function () {
          var s = ctx.createBufferSource(), g = ctx.createGain(), pn = ctx.createStereoPanner(); s.buffer = b; s.loop = true; g.gain.value = 0;
          chain([s, biquad('highpass', p[0], 0.7), biquad('lowpass', p[1], 0.7), biquad('lowpass', 1200, 0.7), g, pn, airIn]);
          var off = R.r(0, p[2] - 1); starts.push(function (t) { s.start(t, off); }); air.push(g); airPan.push(pn);
          if (p[0] === 450) {   // (the hiss: the same noise half its length on, so no new draw and no new buffer; 2.5-8 kHz, toward the band grains in flight ring in (about 8 kHz), kept under it so it never sharpens the music)
            var h = ctx.createBufferSource(), hg = ctx.createGain(), hp = ctx.createStereoPanner(), ho = (off + p[2] / 2) % (p[2] - 1); h.buffer = b; h.loop = true; hg.gain.value = 0;
            chain([h, biquad('highpass', 2500, 0.5), biquad('highpass', 2500, 0.7071), biquad('lowpass', 8000, 0.7071), hg, hp, tail]);
            starts.push(function (t) { h.start(t, ho); }); sand = hg; sandPan = hp;
          }
          return true;
        });
      });
    })();
    function begin() { var t = ctx.currentTime; starts.forEach(function (f) { f(t); }); begun = true; }
    if (!sliced) { while (jobs.length) if (jobs[0]()) jobs.shift(); begin(); }
    var ready = sliced ? new Promise(function (ok, no) {
      (function run() {
        try { if (jobs[0]()) jobs.shift(); } catch (e) { no(e); return; }
        if (jobs.length) setTimeout(run, 0); else { begin(); ok(); }
      })();
    }) : Promise.resolve();
    var AIR = 0.0044, BREATH = 18;   // (the air, about 18 dB under the music in its gusts' middle; dB: the gust through the Milky Way's breath)

    /* a held note brightens as it swells and darkens as it dies away, as a bowed string, a horn or a clarinet does (soft,
       its upper partials fall away far faster than its fundamental): a gentle low-pass on each, its corner following the
       note's level in decibels, from the first figure (soft) to the second (full) */
    var BRIGHT = { cello: [900, 6000], viola: [1600, 9000], violin: [1600, 5500], clar: [1600, 9000], horn: [1100, 8000] };
    function bright(B, up) { return curve(function (x) { var g = up ? Math.pow(Math.sin(Math.PI / 2 * x), 2) : Math.pow(Math.cos(Math.PI / 2 * x), 2); return B[0] * Math.pow(B[1] / B[0], 1 + Math.max(-42, 20 * Math.log10(Math.max(g, 1e-4))) / 42); }, 64); }
    function voice(inst, m, at, gdb, att, pan, half, bus, ct) {
      if (ct === undefined) ct = tuneOf(inst, m, at);
      var e = pick(inst, half ? m + 12 : m), rate = Math.pow(2, ((half ? m + 12 : m) - e.m) / 12 + ct / 1200) * (half ? 0.5 : 1);
      S.ct = ct; S.sus = !!e.loop;
      var s = ctx.createBufferSource(), g1 = ctx.createGain(), p = ctx.createStereoPanner(), A = e.g * db(gdb), B = BRIGHT[inst], f = null;
      s.buffer = sheet; s.playbackRate.value = rate; p.pan.value = Math.max(-1, Math.min(1, pan));
      if (e.loop && B && bus !== fund && bus !== deepIn) { f = biquad('lowpass', B[0], 0.6); try { f.frequency.automationRate = 'k-rate'; } catch (x) { /* swept a sample at a time */ } chain([s, g1, f, p, bus || music]); }
      else chain([s, g1, p, bus || music]);
      at = Math.max(at, ctx.currentTime + 0.05);
      g1.gain.setValueAtTime(0, at);
      if (e.loop) { s.loop = true; s.loopStart = e.s0; s.loopEnd = e.s0 + e.len; s.start(at, e.s0 + R.f() * e.len * 0.8); }
      else { s.start(at, e.s0); s.stop(at + e.len / rate - 0.02); }
      if (att > 0.02) { curveAt(g1.gain, scaled(UP, A), at, att); if (f) curveAt(f.frequency, bright(B, true), at, att); }
      else { g1.gain.setValueAtTime(A, at); if (f) f.frequency.setValueAtTime(B[1], at); }
      return { s: s, g1: g1, f: f, B: B, A: A, at: at, att: att, m: m, loop: e.loop };
    }
    function release(v, t, rel) {
      if (v.done) return; v.done = true;
      t = Math.max(t, v.at + v.att + 0.05, ctx.currentTime + 0.05);
      curveAt(v.g1.gain, scaled(DOWN, v.A), t, rel); if (v.f) curveAt(v.f.frequency, bright(v.B, false), t, rel);
      if (v.loop) v.s.stop(t + rel + 0.05);
    }

    /* the plan (round twenty-one, of "i constantly hear some type of chord": no chord is held under it. Each voice
       sings one note at a time, swelling in over seconds and dying away, then is quiet a while, on a cycle of its own;
       the cycles never fall in step, so the notes meet and part (a third here, a sixth there) and never sit as a
       chord. The harmony is only implied: a slow walk through the sky's own chords (a new one every 20-32 s), each
       voice taking its next note from the chord of the moment it comes in. Under it the deep end, a tide: one long
       note under a chord now and then. On top the colour's own few notes. A sky change is the one chord of it all:
       the voices gather into it, one at a time, as the music swells to the moment the colour changes, and let it
       go. And never a hole: where every note would be gone at once, the next voice comes in early) */
    var S = { sky: null, hold: null, next: null, swaps: [], R: [], N: [], B: [], P: [], wc: 0, front: 0, hf: 0, root: null, ct: 0, sus: false, swellEnd: 0, pass: { kind: 'start', until: 0 }, arcV: 1, arcEnd: 0, V: null, air: null };
    var LAYER = {   // (each voice: its range, its notes' length (s), its rest after one (s), its level (dB))
      low: { lo: 36, hi: 52, len: [9, 13], rest: [10, 20], g: -2.5 },
      mid: { lo: 53, hi: 66, len: [7.5, 11], rest: [6, 13], g: -4 },
      high: { lo: 63, hi: 74, len: [6.5, 10], rest: [9, 17], g: -5 },
      col: { rest: [6, 12] }
    };
    var LAYERS = ['low', 'mid', 'high', 'col'], LONE = true, REST = 1, TUNE = true;   // (LONE: never one held note alone for long; REST: how long the voices rest, sketch round twenty-one's take 1 (0.6 its fuller take 2))
    /* the passages: 40-80 s each, which voices sing and how long they rest (all; low and warm, no violins; high and
       open, no cello; the colour and one voice; all, closer together), never the same twice running, the strings'
       level rising to a peak and falling again over each */
    var PASS = { open: { on: 'lmhc', k: 1 }, warm: { on: 'lmc', k: 0.9 }, air: { on: 'mhc', k: 1 }, still: { on: 'mc', k: 1.25 }, rich: { on: 'lmhc', k: 0.75 } };
    var KINDS = ['open', 'warm', 'air', 'still', 'rich'];   // (how often each comes: the sky's own, FULL)

    function colourAt(t) { var c = SKIES[S.swaps.length ? S.swaps[0][1] : 'bluehour'].col, j; for (j = 0; j < S.swaps.length; j++) if (S.swaps[j][0] <= t) c = S.swaps[j][2]; return c; }
    function regionAt(t) { for (var j = S.R.length - 1; j > 0; j--) if (S.R[j].a <= t) return S.R[j]; return S.R[0]; }
    function kindAt(t) { for (var j = S.P.length - 1; j > 0; j--) if (S.P[j].a <= t) return S.P[j].kind; return S.P.length ? S.P[0].kind : 'open'; }
    function on(k, t) { return colourAt(t) === 'mist' ? k !== 'col' : PASS[kindAt(t)].on.indexOf(k.charAt(0)) >= 0; }   // (in the mist the strings alone, all of them)
    function lastEnd() { return S.R.length ? S.R[S.R.length - 1].b : null; }
    function newHold(sky, first, k) { S.sky = sky; S.hold = { k: k || 0, i: 0, used: false, first: first || null }; }
    function region(a, b, n, tag, sc) { var r = { a: a, b: b, n: n, pc: n.map(function (x) { return x % 12; }), sc: sc, tag: tag }; S.R.push(r); while (S.R.length > 12) S.R.shift(); return r; }
    function draw(c) { var s = 0, j, x; for (j = 0; j < c.length; j++) s += c[j][1]; x = R.f() * s; for (j = 0; j < c.length - 1 && x >= c[j][1]; j++) x -= c[j][1]; return c[j][0]; }
    /* the tuning: a note that comes in against held notes is tuned pure (5-limit: 16/15, 9/8, 6/5, 5/4, 4/3, 45/32, 3/2,
       8/5, 5/3, 16/9, 15/8) to the lowest of them, as string players and singers tune a held third or sixth to the bass
       (an equal-tempered third beats 5 to 30 times a second in these registers); one that comes in alone, halfway to pure
       over the chord's root, so a chain of pure intervals never drifts; never more than 15 cents from equal temperament;
       the bowed sections 0.7 of the way (their vibrato is about as wide); the harp and the piano equal-tempered. A held
       note is never retuned. Each sustained note also takes an offset of its own within 1.5 cents (an ensemble's spread) */
    var JUST = [0, 11.73, 3.91, 15.64, -13.69, -1.96, -9.78, 1.96, 13.69, -15.64, -3.91, -11.73];
    function tuneOf(inst, m, t) {
      if (!TUNE || inst === 'harp' || inst === 'piano' || !S.R.length) return 0;
      var depth = /cello|viola|violin/.test(inst) ? 0.7 : 1, h = /** @type {any} */ (null), c, root;   // (any: set in the closure below)
      S.N.forEach(function (e) { if (e.sus && e.m !== m && e.h0 <= t + 1 && e.h1 >= t + 2 && (!h || e.m < h.m)) h = e; });
      if (h) c = h.ct + (m > h.m ? JUST[(m - h.m) % 12] : -JUST[(h.m - m) % 12]) * depth;
      else { root = S.root !== null ? S.root : regionAt(t).n[0]; c = 0.5 * depth * JUST[((m - root) % 12 + 12) % 12]; }
      return Math.max(-15, Math.min(15, c + R.r(-1.5, 1.5)));
    }
    function side(m) { return Math.max(m < 59 ? -0.3 : -0.45, -0.45 + 0.9 * (m - 36) / 41); }   // (low left, high right, as the sections sit; under about 250 Hz never past 0.3, so headphones never put a low note in one ear)

    /* every note planned: its pitch, from its start to well into its release (for the spacing), and the part of it
       heard (for the holes; none for the deep end, felt more than heard) */
    function add(m, t0, t1, h0, h1, k) { S.N.push({ m: m, t0: t0, t1: t1, h0: h0, h1: h1, k: k, ct: S.ct, sus: S.sus }); S.ct = 0; S.sus = false; }
    function fits(m, t0, t1, free) {   // (a minor third or more from every note it meets, no minor ninth, a fifth low down, one deep note; outside the chord's own moment)
      var j, e, d;
      for (j = 0; j < S.N.length; j++) {
        e = S.N[j]; if (e.t1 <= t0 || e.t0 >= t1) continue;
        d = Math.abs(e.m - m);
        if (d < 3 || d % 12 === 1 || (Math.min(m, e.m) < 48 && d < 7) || (m < 36 && e.m < 36)) return false;
      }
      if (!free) for (j = 0; j < S.B.length; j++) if (t1 > S.B[j][0] + 2 && t0 < S.B[j][1]) return false;
      return true;
    }
    function blockAt(t0, t1) { for (var j = 0; j < S.B.length; j++) if (t1 > S.B[j][0] && t0 < S.B[j][1]) return S.B[j]; return null; }
    function hole(from) {   // (where, from then on, nothing planned would be heard)
      var iv = S.N.filter(function (e) { return e.h1 > from; }).sort(function (x, y) { return x.h0 - y.h0; }), cur = from;
      for (var j = 0; j < iv.length; j++) { if (iv[j].h0 > cur + 0.6) break; cur = Math.max(cur, iv[j].h1); }
      return cur;
    }
    function balance(t0, t1) {   // (as a player balances: alone, a little louder (at night less: the quiet is the night's); with two or more others, softer)
      var n = 0; S.N.forEach(function (e) { if (e.h1 > t0 && e.h0 < t1) n++; });
      return n === 0 ? 2.5 * fillOf(skyAt(t0)).lone : n === 1 ? fillOf(skyAt(t0)).lone : n === 2 ? 0 : -1.5;
    }
    function lone(from) {   // (where, from then on, fewer than two notes planned would be heard for more than 3 s: one held note alone reads as a tone, a siren)
      var x, run = 0, n, iv = S.N.filter(function (e) { return e.h1 > from && e.k !== 'deep'; });
      for (x = from; x < from + 30; x += 0.5) {
        n = 0; for (var j = 0; j < iv.length && n < 2; j++) if (iv[j].h0 <= x && iv[j].h1 >= x) n++;
        if (n < 2) { run += 0.5; if (run > 3) return x - run; } else run = 0;
      }
      return from + 30;
    }
    function sweet(m, t0, t1) {   // (a third or a sixth with a note it meets, sweeter; only fourths and fifths with all it meets, the open sound, less)
      var w = 1, open = 0, n = 0;
      S.N.forEach(function (e) { if (e.t1 <= t0 || e.t0 >= t1 || e.m < 36) return; var d = Math.abs(e.m - m) % 12; n++; if (d === 3 || d === 4 || d === 8 || d === 9) w = 1.5; if (d === 0 || d === 5 || d === 7) open++; });
      return n && open === n ? 0.55 * w : w;
    }

    function sync(now) {   // (the world's sky, mapped onto the audio clock: when the next change comes, and to what)
      var F = feed(), e, tc;
      S.next = null;
      if (F) { S.wc += (F.wc - S.wc) * 0.2; if (F.air) S.air = F.air; S.heard = F.wind || null; }
      if (!F || F.still || !F.seq.length) return F;
      e = F.seq[0]; tc = e.at + e.hold;
      if (e.id === S.sky && F.seq.length > 1 && F.seq[1].id !== S.sky) {
        if (F.t < tc) S.next = { at: now + (tc - F.t), M: e.move, far: e.far, to: F.seq[1].id };
        else if (F.t < tc + e.move) S.next = { at: now + 0.5, M: Math.max(24, tc + e.move - F.t), far: e.far, to: F.seq[1].id };   // (the world already changing: catch up, sooner and shorter)
      } else if (e.id !== S.sky && !(F.seq.length > 1 && F.seq[1].id === S.sky)) {
        S.next = { at: now + 0.5, M: 30, far: false, to: e.id };   // (the world on another sky than ours: after a long pause; go to it)
      }
      return F;
    }
    function start(now) {
      var F = feed(), sky = 'bluehour', e;
      if (F && F.seq.length) { e = F.seq[0]; sky = (F.t > e.at + e.hold && F.seq.length > 1) ? F.seq[1].id : e.id; S.wc = F.wc; S.air = F.air || null; }
      S.swaps.push([-1e9, sky, SKIES[sky].col]);
      newHold(sky, voiced(tonic(SKIES[sky])[0], tonic(SKIES[sky])[1]));
      S.a0 = now + 0.3; S.front = now - 0.9; S.hf = now + 0.3;
      S.V = { low: { k: 'low', next: now + R.r(3, 5), last: 45 }, mid: { k: 'mid', next: now + R.r(0.1, 0.4), last: 60 }, high: { k: 'high', next: now + R.r(7, 11), last: 70 }, col: { k: 'col', next: now + R.r(4.5, 8), last: 72 } };
    }

    /* the chords, planned ahead of the notes: the sky's own walk (its tonic first, a new one every 20-32 s, once a sky
       its borrowed chord), and a change planned with the world's: near, the old tonic, a chord toward the new key, then
       the new key's major chord, the one the music swells on; far, the old tonic darkened, the mist (four notes both
       keys share; strings alone, no deep end), and out of it on a major chord */
    function commit(now) {
      var a = lastEnd(), sk = SKIES[S.sky], X, Y, M, P, c0, p, d, rem, notes, bm = false, to, sx, sy, both, r1, r2, r3, mc;
      if (a === null) a = S.a0;
      if (S.next && a >= S.next.at - 6) {
        X = sk; Y = SKIES[S.next.to]; M = S.next.M; c0 = a; to = S.next.to; sx = scaleOf(X); sy = scaleOf(Y);
        both = sx.filter(function (x) { return sy.indexOf(x) >= 0; });
        if (!S.next.far) {
          P = nearPath(X, Y); p = c0 + 0.5 * M;
          passage(c0, p);
          r1 = region(c0, c0 + 0.12 * M, voiced(tonic(X)[0], tonic(X)[1]), 'change', sx);
          r2 = region(c0 + 0.12 * M, c0 + 0.4 * M, P[0], 'change', both.concat(P[0].map(function (x) { return x % 12; })));
          r3 = region(c0 + 0.4 * M, c0 + 0.75 * M, P[1], 'bloom', sy);
          S.swaps.push([p, to, Y.col]); swell(p); bloom(r3, p, null);
          ground(r1); ground(r2);
          newHold(to, voiced(tonic(Y)[0], tonic(Y)[1]));
        } else {
          p = c0 + 0.7 * M + 4.5; mc = mistChord(X, Y);
          passage(c0, p);
          r1 = region(c0, c0 + 0.3 * M, voiced(tonic(X)[0], X.minor ? VM9 : V69), 'change', sx);
          r2 = region(c0 + 0.3 * M, c0 + 0.7 * M, mc, 'mist', mc.map(function (x) { return x % 12; }));
          r3 = region(c0 + 0.7 * M, p + R.r(14, 20), Y.minor ? voiced(Y.key + 3, V9) : voiced(tonic(Y)[0], tonic(Y)[1]), 'bloom', sy);   // (out of the mist on a major chord: a minor sky's by its relative major)
          S.swaps.push([c0 + 0.3 * M, null, 'mist']); S.swaps.push([c0 + 0.7 * M, to, Y.col]); swell(p);
          if (M >= 40) mist(r2, c0 + 0.5 * M);
          bloom(r3, p, r2.b);
          ground(r1);
          if (Y.minor) newHold(to, voiced(tonic(Y)[0], tonic(Y)[1])); else newHold(to, null, 1);
        }
        S.next = null; return;
      }
      d = R.r(20, 32);
      if (S.next) { rem = S.next.at - a; if (rem - d < 12) d = rem; if (d < 8) d = 8; }
      if (S.hold.first) { notes = S.hold.first; S.hold.first = null; S.hold.i = 0; }
      else if (S.hold.k === 2 && !S.hold.used && (!S.next || rem > 30) && R.f() < 0.75) { notes = voiced(sk.key + sk.sur[0], sk.sur[1]); S.hold.used = true; bm = sk.sur[1] === VM9; S.hold.i = -1; }
      else {
        S.hold.i = S.hold.i < 0 ? 0 : (S.hold.i !== 0 && R.f() < 0.35 ? 0 : (function () { var j; do j = R.i(sk.field.length); while (j === S.hold.i); return j; })());
        notes = voiced(sk.key + sk.field[S.hold.i][0], sk.field[S.hold.i][1]);
        if (S.hold.k === 0 && S.hold.i !== 0) { S.hold.i = 0; notes = voiced(tonic(sk)[0], tonic(sk)[1]); }
      }
      passage(a, S.next ? S.next.at + 0.5 * S.next.M : 1e9);
      S.hold.k++;
      r1 = region(a, a + d, notes, 'sky', scaleOf(sk)); r1.bm = bm;
      ground(r1);
    }
    function passage(a, peak) {
      if (a < S.pass.until) return;
      var left = peak - 10 - a, kind, d = R.r(40, 80), x, k;
      if (left < 14) { S.pass.until = a + left; return; }   // (too near the swell for one of its own: this one runs on)
      if (S.pass.kind === 'start') kind = 'open';   // (the first: all the voices, as the press brings them in)
      else do { x = R.f(); for (k = 0; k < KINDS.length - 1 && x >= fillOf(S.sky).kinds[k]; k++) x -= fillOf(S.sky).kinds[k]; kind = KINDS[k]; } while (kind === S.pass.kind);
      d = Math.min(d, left - 4); S.pass = { kind: kind, a: a, until: a + d }; S.P.push(S.pass); while (S.P.length > 8) S.P.shift();
      var lo = db(R.r(-3, -1)), pk = R.r(0.35, 0.65), v0 = S.arcV, t0 = Math.max(a, S.arcEnd, ctx.currentTime + 0.05), dd = a + d - t0;
      if (dd > 4) { curveAt(sbus.gain, curve(function (u) { var e = u < pk ? Math.pow(Math.sin(Math.PI / 2 * u / pk), 2) : Math.pow(Math.cos(Math.PI / 2 * (u - pk) / (1 - pk)), 2); return u < pk ? v0 + (1 - v0) * e : lo + (1 - lo) * e; }), t0, dd); S.arcV = lo; S.arcEnd = t0 + dd + 0.01; }
    }
    function full(a, until) {   // (the swell's chord: the strings back to their full level over 4 s, all the voices)
      var t0 = Math.max(a, S.arcEnd, ctx.currentTime + 0.05), v0 = S.arcV;
      if (v0 < 0.999) { curveAt(sbus.gain, curve(function (u) { return v0 + (1 - v0) * Math.pow(Math.sin(Math.PI / 2 * u), 2); }), t0, 4); S.arcEnd = t0 + 4.01; S.arcV = 1; }
      S.pass = { kind: 'open', a: a, until: until }; S.P.push(S.pass); while (S.P.length > 8) S.P.shift();
    }

    /* the deep end: the chord's root two octaves down, now and then at a chord's start, swelling in over 4-5 s and
       away again (a tide, 12-17 s); never in the mist; lighter over the cloud and under the borrowed minor chords */
    var TUBA = 12;   // (dB: the tuba's own low notes against the half-speed one they replace, by their fundamental)
    function deepNote(m, t, hold, gm) {
      var att = R.r(4, 5), rel = R.r(5.5, 7), rs = t + att + hold, g = TUBA - 2 * S.wc + (gm || 0) + (m <= 27 ? 7 : m <= 30 ? 3 : 0), ct;
      if (!has('tuba') || !fits(m, t, rs + rel * 0.6, true) || (S.br && t < S.br[1] && rs + rel * 0.6 > S.br[0] - 1)) return false;   // (none under the breath)
      ct = tuneOf('tuba', m, t);
      release(voice('tuba', m, t, g + R.r(-0.5, 0.5), att, 0, false, fund, ct), rs, rel);
      if (m >= 28 && has('cbass')) release(voice('cbass', m, t + 0.3, -12 - TUBA + g + R.r(-0.5, 0.5), att, -0.1, false, deepIn, ct), rs + 0.3, rel);
      S.ct = ct; S.sus = true;   // (the contrabass never under its lowest recorded note: stretched down, unbowed, it reads as a siren)
      add(m, t, rs + rel * 0.6, 0, 0, 'deep'); return true;
    }
    function ground(r) {
      if (r.tag === 'mist' || r.b - r.a < 10) return;
      var k = kindAt(r.a), t = r.a + R.r(0.3, 2.5);
      if (R.f() < (PASS[k].on.indexOf('l') >= 0 ? 0.95 : 0.6)) deepNote(r.n[0] - 12, t, R.r(5, 9), r.bm ? -4 : 0);
    }

    /* the one chord: at a sky change, the voices into the new key's major chord one at a time, the bass first, the
       deep end under it, the colour's first notes on the moment it changes; then let go, the top first */
    function bloom(r, p, mistEnd) {
      var b = r.n[0], ns = [r.n[0], r.n[1], r.n[2], r.n[r.n.length - 1]], j, m, t, att, rs, rel, inst, g, col;
      full(p - 10, p + 12); S.B.push([p - 5, p + 6]); S.root = b;
      deepNote(b - 12, mistEnd ? Math.max(p - 8.5, mistEnd - 1) : p - 8.5, R.r(4, 6), 0);   // (out of the mist: only once it has cleared)
      for (j = 0; j < ns.length; j++) {
        m = ns[j]; t = (mistEnd ? p - 10 + 1.8 * j : p - 10 + 1.6 * j) + R.r(0, 0.4); att = 4 - 0.2 * j; rs = p + (mistEnd ? R.r(1, 2.5) + 0.9 * (ns.length - 1 - j) : R.r(2, 3.5) + 1.0 * (ns.length - 1 - j)); rel = R.r(5.5, 7);   // (over 5 s, the bass from 10 s before the peak: no gap before the chord, where the voices give way to it)
        while (!fits(m, t, rs + rel * 0.6, true) && t + att * 0.5 < p - 1.5) t += 1;   // (a note it meets still there: a moment later)
        if (!fits(m, t, rs + rel * 0.6, true)) continue;
        col = colourAt(t); inst = m < 55 ? 'cello' : m < 64 ? 'viola' : col === 'clar' ? 'clar' : 'violin'; g = (m < 55 ? -8 : -10) + (LIFTS[col] || 0) + (m < 50 ? -3 * S.wc : 0) + R.r(-0.5, 0.5);
        if (!has(inst)) continue;
        release(voice(inst, m, t, g, att, side(m), false, sbus), rs, rel);
        add(m, t, rs + rel * 0.6, t + att * 0.5, rs + rel * 0.5, 'bloom');
      }
      col = colourAt(p + 0.6);
      if (!has(col)) { /* its notes not decoded yet */ } else if (col === 'harp') spread(r.n).forEach(function (m, j) { var t = p + 0.6 + 0.95 * j; if (fits(m, t, t + 3.5, true)) { voice('harp', m, t, -12.5 - 0.6 * j + R.r(-0.6, 0.2), 0, -0.3 + 0.1 * j, false, near); add(m, t, t + 3.5, t, t + 3, 'col'); } });
      else if (col === 'piano') r.n.slice(1).forEach(function (m, j) { var t = p + 0.6 + 0.22 * j; if (fits(m + 12, t, t + 4, true)) { voice('piano', m + 12, t, (j ? -13 : -10.5) + R.r(-0.8, 0.2), 0, -0.3 + 0.15 * j, false, near); add(m + 12, t, t + 4, t, t + 3, 'col'); } });
      S.root = null;
    }
    function spread(n) { var b = n.slice(1), m; for (m = b[b.length - 1] + 3; m <= 84 && b.length < n.length + 1; m++) if (n.some(function (x) { return x % 12 === m % 12; }) && n.concat(b).every(function (x) { return Math.abs(m - x) >= 3; })) b.push(m); return b; }
    function mist(r, c) {   // (the heart of the mist: three of its notes together, soft, a few seconds)
      r.n.slice(0, 3).forEach(function (m, j) {
        var t = c - 4.5 + 0.9 * j, att = 3.5, rs = c + R.r(1.5, 2.5), rel = 5;
        if (!fits(m, t, rs + rel * 0.6, true) || !has(m < 55 ? 'cello' : m < 64 ? 'viola' : 'violin')) return;
        release(voice(m < 55 ? 'cello' : m < 64 ? 'viola' : 'violin', m, t, -6 + LIFTS.mist + R.r(-0.5, 0.5), att, side(m), false, sbus), rs, rel);
        add(m, t, rs + rel * 0.6, t + att * 0.5, rs + rel * 0.5, 'mist');
      });
    }
    function swell(p) {   // (10 s up to the moment the colour changes, 2 s held, 9 s settling: all +1.5 dB, the deep end +5.5)
      var t0 = Math.max(p - 11, ctx.currentTime + 0.05);
      if (t0 < S.swellEnd) return; S.swellEnd = t0 + 21.05;   // (never two at once: a change hard on another's heels swells once)
      curveAt(mswell.gain, curve(function (x) { var u = x * 21, e = u < 10 ? Math.pow(Math.sin(Math.PI / 2 * u / 10), 2) : u < 12 ? 1 : Math.pow(Math.cos(Math.PI / 2 * (u - 12) / 9), 2); return db(1.5 * e); }), t0, 21);
      curveAt(dswell.gain, curve(function (x) { var u = x * 21, e = u < 10 ? Math.pow(Math.sin(Math.PI / 2 * u / 10), 2) : u < 12 ? 1 : Math.pow(Math.cos(Math.PI / 2 * (u - 12) / 9), 2); return db(4 * e); }), t0, 21);
    }

    /* the voices: each in turn, the one due soonest; where every note would be gone before it comes, it comes early */
    function lead(v) { return v.k === 'col' ? 0 : 1.7; }   // (from a note's start to when it is heard)
    function pull(v, g) { return v.k === 'col' && fillOf(skyAt(g)).col > 1.2 ? 12 : 0; }   // (at night a hole is filled by a voice, not by the colour, which keeps to its own few notes)
    function plan(now) {
      var guard = 0, v, t, g, u;
      while (guard++ < 40) {
        v = /** @type {any} */ (null); LAYERS.forEach(function (k) { var x = S.V[k]; if (!v || x.next < v.next) v = x; });
        t = Math.max(v.next, S.front + 1.2);   // (never two notes begun within 1.2 s: no beat, no chord struck)
        if (!on(v.k, t)) { v.next = t + R.r(3, 6); continue; }
        g = Math.min(hole(S.hf), LONE ? lone(S.hf) + 2 : 1e9);
        if (S.br && g > S.br[0] - 6 && g < S.br[1]) g = S.br[1];   // (the breath left open: the next voice at its end)
        else if (t + lead(v) > g + 0.3 && g === hole(S.hf) && breath(g)) continue;
        if (t + lead(v) > g + 0.3) {   // (a hole before it: the voice best placed to fill it comes in early, not one that found nothing a moment ago)
          u = null; LAYERS.forEach(function (k) { var x = S.V[k]; if (on(k, g) && (x.wait || 0) <= g && (!u || x.next + pull(x, g) < u.next + pull(u, g))) u = x; });
          if (u) { v = u; t = Math.max(S.front + 1.2, now + 0.1, g - 0.3 - lead(v)); }
        }
        if (t > now + H) break;
        var n0 = S.N.length;
        if (!(v.k === 'col' ? colour(v, t) : sing(v, t))) v.next = v.wait = t + R.r(1.5, 3);   // (nothing fits here: a moment later)
        if (S.N.length > n0) { S.front = t; S.hf = Math.max(S.hf, S.N[n0].h0); }
      }
    }
    /* the Milky Way's breath: now and then, where every note has died away, the hole left open, 4-6 s of the air alone
       (the owner, of the silences: "i didnt say never silent"). Only in the Milky Way, the stillest sky, well inside
       it (no change, swell or chord near), a minute into the listening at least, no deep note under it, once a minute
       and a half at most */
    function breath(g) {
      var len = R.r(4, 6), e = g + len, j, in0 = -1e9;
      for (j = 0; j < S.swaps.length; j++) if (S.swaps[j][0] <= g) in0 = S.swaps[j][0];
      if (skyAt(g) !== 'milkyway' || colourAt(g) !== 'harp' || colourAt(e + 4) !== 'harp' || g - in0 < 20 || g < S.a0 + 60 || g < (S.brAt || -1e9) + 90) return false;
      if ((S.next && S.next.at < e + 15) || g < S.swellEnd + 2 || blockAt(g - 6, e + 6) || S.N.some(function (x) { return x.k === 'deep' && x.t1 > g - 1 && x.t0 < e; })) return false;
      S.br = [g, e]; S.brAt = g;
      var t0 = Math.max(g - 3, ctx.currentTime + 0.05), d = e + 3 - t0;   // (and through it a soft gust, the air swelling as the last notes die and settling as the next comes in: the breath is the air's, never a silence)
      curveAt(airIn.gain, curve(function (u) { var x = u * d, k = x < 3.5 ? Math.pow(Math.sin(Math.PI / 2 * x / 3.5), 2) : x > d - 3.5 ? Math.pow(Math.cos(Math.PI / 2 * (x - d + 3.5) / 3.5), 2) : 1; return db(BREATH * k); }), t0, d);
      LAYERS.forEach(function (k) { var x = S.V[k]; x.next = Math.max(x.next, e - 0.3 - lead(x)); });
      return true;
    }
    function sing(v, t) {   // (one note: from the chord of the moment, near its last, sweet with the notes it meets)
      var r = regionAt(t), col = colourAt(t), L = LAYER[v.k], k = v.k, ms = r.tag === 'mist' || col === 'mist', lo = ms ? 50 : L.lo, hi = ms ? 77 : L.hi;
      var len = R.r(L.len[0], L.len[1]), att = R.r(2.6, 4.4) * (ms ? 1.3 : 1), rel = R.r(4, 6.5) * (ms ? 1.2 : 1), hold, rs, t1, B, cand = [], m, w, d, pc, r2, inst, g;
      B = blockAt(t, t + len);
      if (B) { if (B[0] + 1.5 - t >= 5) len = B[0] + 1.5 - t; else { v.next = v.wait = B[1] + R.r(0.5, 4); return true; } }
      hold = Math.max(0.3, len - att - rel * 0.6); rs = t + att + hold; t1 = rs + rel * 0.6; r2 = regionAt(rs);
      if (k === 'low' && !ms && !S.N.some(function (e) { return e.k !== 'deep' && e.k !== 'low' && e.h0 <= t + att && e.h1 >= t + att + 3; })) return false;   // (the low voice only under a note already sounding: a low string alone reads as a tone, not a cello)
      if (S.N.filter(function (e) { return e.k !== 'deep' && e.h1 > t + att && e.h0 < rs; }).length >= fillOf(skyAt(t)).most) return false;   // (at night never a third voice over two)
      for (m = lo; m <= hi; m++) {
        pc = m % 12;
        if (!has(m < 55 ? 'cello' : m < 64 ? 'viola' : 'violin')) continue;   // (its strings not decoded yet: another note, or a moment later)
        if (r.sc.indexOf(pc) < 0 && !(ms && r2 !== r && r2.pc.indexOf(pc) >= 0)) continue;   // (a note out of the mist into the chord after it may be one of that chord's)
        if (((k === 'low' || ms) && r.pc.indexOf(pc) < 0 && !(ms && r2 !== r && r2.pc.indexOf(pc) >= 0)) || (r2 !== r && r2.sc.indexOf(pc) < 0) || !fits(m, t, t1)) continue;   // (the low voice keeps to the chord; a note held into the next keeps to its key)
        w = r.pc.indexOf(pc) >= 0 ? 3 : 1;
        if (pc === r.pc[0]) w *= k === 'low' ? 1.6 : 0.7;
        d = Math.abs(m - v.last); w *= d === 0 ? 0.9 : d <= 2 ? 1.6 : d <= 5 ? 1.4 : d <= 9 ? 0.9 : 0.5;
        w *= sweet(m, t, t1);
        cand.push([m, w]);
      }
      if (!cand.length) return false;
      m = draw(cand);
      inst = m < 55 ? 'cello' : m < 64 ? 'viola' : 'violin';   // (the voices are the strings; the clarinet is the moonlit sea's colour alone: as a voice, held, it read as a siren and a bell)
      g = L.g + (LIFTS[col] || 0) + (m < 50 ? -3 * S.wc : 0) + (k === 'low' ? Math.min(0, balance(t + att, rs)) : balance(t + att, rs)) + R.r(-1.5, 1);
      release(voice(inst, m, t, g, att, side(m), false, sbus), rs, rel);
      add(m, t, t1, t + att * 0.5, rs + rel * (m < 50 ? 0.3 : 0.5), k);   // (a low note's dying away counts for less: a phone plays little of it)
      v.last = m; v.next = rs + rel * 0.5 + R.r(L.rest[0], L.rest[1]) * PASS[kindAt(t)].k * REST * fillOf(skyAt(t)).rest;
      return true;
    }
    /* the colour: the harp or the piano a few notes of the chord, ringing (one, two a third or more apart, three up or
       down; now and then the note a voice just sang, higher); the horns, the clarinet or the violins one note swelling,
       or two or three legato, a sigh */
    function colour(v, t) {
      var r = regionAt(t), col = colourAt(t), P = PASS[kindAt(t)], B = blockAt(t, t + 5), p = [], seq, j, m, x, last;
      if (col === 'mist' || r.tag === 'mist') { v.next = v.wait = t + R.r(4, 8); return true; }
      if (B) { v.next = v.wait = B[1] + R.r(0.5, 3); return true; }
      if (!has(col === 'strings' ? 'violin' : col)) return false;   // (its notes not decoded yet: a moment later)
      if (col === 'harp' || col === 'piano') {
        for (m = 60; m <= 79; m++) if (r.pc.indexOf(m % 12) >= 0 && fits(m, t, t + 6)) p.push(m);
        if (p.length < 2) return false;
        x = R.f(); last = S.N.filter(function (e) { return e.k === 'mid' || e.k === 'high'; }).pop();
        if (x < 0.2 && last) { seq = p.filter(function (q) { return q % 12 === last.m % 12 && q > last.m; }).slice(0, 1); if (seq.length) { var up = p.filter(function (q) { return q - seq[0] >= 3 && q - seq[0] <= 5; }); if (up.length) seq.push(up[0]); } }
        if (!seq || !seq.length) {
          j = R.i(p.length);
          if (x < 0.55) seq = [p[j]];
          else if (x < 0.8) { var two = p.filter(function (q) { return Math.abs(q - p[j]) >= 3 && Math.abs(q - p[j]) <= 9; }); seq = two.length ? [p[j], two[R.i(two.length)]] : [p[j]]; }
          else { seq = [p[j]]; for (var q = j + 1; q < p.length && seq.length < 3; q++) if (p[q] - seq[seq.length - 1] >= 3) seq.push(p[q]); if (R.f() < 0.4) seq.reverse(); }
        }
        var tt = t, gap = col === 'harp' ? R.r(0.45, 0.9) : R.r(0.5, 0.85), bal = balance(t, t + 2);
        seq.forEach(function (m, j) {
          if (!fits(m, tt, tt + 3.5)) return;
          var hi = m > 74 ? -1.5 : 0;   // (the harp and the piano to G5, the top softer: higher, ringing, they read as a bell, an alarm)
          if (col === 'harp') voice('harp', m, tt, -10 - 0.7 * j + hi + Math.min(1, bal) + R.r(-1, 0.5), 0, -0.2 + 0.4 * R.f(), false, near);   // (a pluck's attack peaks far above its loudness: the harp 2 dB under the piano, lifted alone 1 dB at most, so at -23 LUFS its peaks keep 1 dB clear)
          else voice('piano', m, tt, -9 - 0.6 * j + hi + bal + R.r(-1, 0.5), 0, -0.2 + 0.4 * R.f(), false, near);
          add(m, tt, tt + 3.5, tt, tt + 1.8, 'col'); tt += gap * R.r(0.85, 1.2);
        });
        v.next = t + R.r(7, 13) * P.k * REST * fillOf(skyAt(t)).col; return true;
      }
      var lo = col === 'horn' ? 50 : col === 'clar' ? 60 : 64, hi = col === 'horn' ? 62 : 72, inst =   // (the clarinet and the violins to C5: above it, swelling, they read as a bell or an alarm)
        col === 'horn' ? 'horn' : col === 'clar' ? 'clar' : 'violin';
      for (m = lo; m <= hi; m++) if (r.pc.indexOf(m % 12) >= 0 && fits(m, t, t + 9)) p.push(m);
      if (!p.length) return false;
      if (R.f() < 0.55 || p.length < 2) {   // (one note, swelling)
        m = p[R.i(p.length)]; var att = R.r(2.5, 3.5), rs = t + att + R.r(0.5, 2), rel = R.r(3.5, 5);
        release(voice(inst, m, t, (col === 'horn' ? -7 : -7.5) + balance(t + att, rs) + R.r(-1, 0.5), att, 0.3, false, music), rs, rel);
        add(m, t, rs + rel * 0.6, t + att * 0.5, rs + rel * 0.5, 'col');
      } else {   // (a sigh: each note into the next, the last held longer; no two at once)
        j = 1 + R.i(p.length - 1); seq = R.f() < 0.5 ? [p[j], p[j - 1]] : [p[j - 1], p[j]];
        if (j >= 2 && R.f() < 0.35) seq.push(p[j - 2]);
        var bal = balance(t, t + 4), total = R.r(3.8, 5.2), wv = seq.map(function () { return R.r(0.7, 1); }); wv[wv.length - 1] *= 2; var ws = wv.reduce(function (x, y) { return x + y; }, 0), tc = t;
        seq.forEach(function (m, k) {
          var lastN = k === seq.length - 1, dd = wv[k] / ws * total, g = -9.5 + bal + 1.6 * Math.sin(Math.PI * Math.min(1, (tc - t + dd / 2) / total / 0.8)) - 0.8;
          if (!fits(m, tc, tc + dd + 1.2)) { tc += dd; return; }
          release(voice(inst, m, tc, g, k ? 0.07 : 0.35, 0.3, false, music), lastN ? tc + dd : tc + dd - 0.16, lastN ? 1.1 : 0.16);
          add(m, tc, tc + dd + (lastN ? 1 : 0.2), tc + 0.3, tc + dd + (lastN ? 0.6 : 0), 'col'); tc += dd;
        });
      }
      v.next = t + R.r(13, 21) * P.k * REST * fillOf(skyAt(t)).col; return true;
    }

    /* the wind: four random walks, each to a new value every 1.2, 2, 6.5 and 21 s or so (half to one and a half times
       that), each glided to over half its time, weighted as gusts are (the slower, the larger: 0.3, 0.45, 0.67, 1), on the
       sky's own breeze: the world's wind by sky (its feed's air, the world's own table, read only: each sky's share of
       the day's wind, WIND_DAY at the afterglow's 1, and its gustiness, the gusts about +-15 to 30% of it at 1: the
       afterglow the breeziest, the blue hour calmer, the nights calm, first light the stillest), which moves to the next
       sky's over about 15 s; with no world, no table: the air at its floor. The billow goes with the wind; the stream
       with its square, 0.4 s behind (calm air near silent, a gust bringing it). Over the cloud the billow eases and the
       stream rises. Planned 4 s ahead, a walk at a time in time order */
    var WK = [[1.2, 0.3], [2, 0.45], [6.5, 0.67], [21, 1]], WIND_DAY = 0.35;
    function breeze(id) { var a = S.air && S.air[id]; return a ? [WIND_DAY * a[0], a[2]] : [0, 0]; }   // (the sky's breeze, its gustiness)
    function skyAt(t) { var id = S.swaps[0][1], j; for (j = 1; j < S.swaps.length; j++) if (S.swaps[j][0] <= t && S.swaps[j][1]) id = S.swaps[j][1]; return id; }
    /* the air heard (the world's own, its feed's wind: AIR's airHeard at the camera, read only): the billow goes with the
       whole wind along its way (the wind and the gust arriving, the field's own: a gust upwind is heard when it reaches
       the camera, as the veils lift with it on screen), the stream with its square, 0.4 s behind, and both silent in a
       calm; flying into the wind about 3 dB more, with it about 3 dB less (the apparent wind's side: the camera's own
       12 m/s would drown everything in a rush, so it only shades the level); the stream toward the ear the wind comes
       from (its bearing from the eye's way), the billow near the middle (a low noise in one ear is no wind). Over the
       cloud the billow eases and the stream rises, as before. And the sand: where the wind at the crests (1.5 times the
       10 m wind, the gust in it) passes the sand's threshold (6.2 m/s at 10 m: physics, sand), a soft hiss, its level
       the flux there (u*(u*^2 - u*t^2), the threshold once moving 0.8 of the first, so it starts at the threshold and
       stops only below 0.8 of it), on the wind's side; none over the cloud. Set at each tick, eased over a few tenths
       of a second, so no edge is a step */
    var WREF = 16, SAND = [6.2, 1.5, 0.8], HISS = 0.001;   // (m/s: the wind heard that is the old breeze's 1; the sand's threshold at 10 m, the crests' speed-up, the threshold once moving; the hiss at a flux of 1, the crests at 1.5 times the threshold)
    function heard(now, A) {
      var sp = Math.hypot(A.x, A.z), all = Math.max(0, sp + (A.gust || 0)), w = all / WREF, cx = A.x - A.ax, cz = A.z - A.az, cv = Math.hypot(cx, cz), m = 0, k, r, q;
      if (cv > 0.5 && sp > 0.1) m = -(cx * A.x + cz * A.z) / (cv * sp);   // (+1 flying into the wind, -1 with it)
      k = db(3 * m); var calm = Math.min(1, w / 0.1), lr = -Math.sin(A.bear || 0);
      air[0].gain.setTargetAtTime(AIR * (1 - 0.4 * S.wc) * (0.6 + 1.6 * w) * calm * calm * k, now, 0.35);
      air[1].gain.setTargetAtTime(AIR * (0.12 + 0.25 * S.wc) * Math.pow(w / 0.3, 2) * k, now + 0.4, 0.35);
      airPan[0].pan.setTargetAtTime(0.12 * lr, now, 1.5); airPan[1].pan.setTargetAtTime(0.4 * lr, now, 1.5);
      r = sp > 0.1 ? SAND[1] * (A.carry || 0) * all / sp / SAND[0] : 0;   // (the crests' wind over the threshold)
      if (!S.sand && r >= 1) S.sand = true; else if (S.sand && r < SAND[2]) S.sand = false;
      q = S.sand ? r * (r * r - SAND[2] * SAND[2]) / (1.5 * (2.25 - SAND[2] * SAND[2])) : 0;   // (the flux, 1 at 1.5 times the threshold)
      S.hiss = q * (1 - S.wc);
      if (sand) { sand.gain.setTargetAtTime(HISS * S.hiss, now, 0.4); sandPan.pan.setTargetAtTime(0.3 * lr, now, 1.5); }
    }
    function wind(now) {
      if (S.heard) { heard(now, S.heard); return; }   // (the world's air; with no world, the walks below on the floor)
      var W = S.W || (S.W = { v: [0, 0, 0, 0], at: [now, now, now, now], m: breeze(skyAt(now))[0], g: 1, t: now }), k, j, t, g, w, sk, c;
      for (;;) {
        for (k = 0, j = 1; j < 4; j++) if (W.at[j] < W.at[k]) k = j;
        t = W.at[k]; if (t > now + 4) break;
        W.v[k] = R.r(-1, 1); W.at[k] = t + WK[k][0] * R.r(0.5, 1.5);
        for (g = 0, j = 0; j < 4; j++) g += WK[j][1] * W.v[j];
        sk = breeze(skyAt(t)); c = 1 - Math.exp(-(t - W.t) / 15); W.m += (sk[0] - W.m) * c; W.g += (sk[1] - W.g) * c; W.t = t;
        w = Math.max(0.05, W.m * (1 + 0.6 * W.g * g / 2.42));
        air[0].gain.setTargetAtTime(AIR * (1 - 0.4 * S.wc) * (0.6 + 1.6 * w), t, WK[k][0] / 2);
        air[1].gain.setTargetAtTime(AIR * (0.12 + 0.25 * S.wc) * Math.pow((w + 0.1) / 0.35, 2), t + 0.4, WK[k][0] / 2);
        if (k === 3) { airPan[0].pan.setTargetAtTime(0.25 * W.v[3], t, 8); airPan[1].pan.setTargetAtTime(-0.3 * W.v[3], t, 8); }
      }
    }
    /* the deep end felt, never bare: under no note it is 6 dB down, under one 3 dB, under two 1 dB (alone, a deep note
       reads as a foghorn), set a second at a time up to where the notes are all planned (none starts before the last
       planned one, so none is heard there yet unplanned) */
    function under(now) {
      for (var x = Math.max(S.du || now, now); x <= S.front; x += 1) {
        var n = 0; S.N.forEach(function (e) { if (e.k !== 'deep' && e.h0 <= x && e.h1 >= x) n++; });
        dlev.gain.setTargetAtTime(db(n === 0 ? -6 : n === 1 ? -3 : n === 2 ? -1 : 0), x, 1.2); S.du = x + 1;
      }
    }
    function tick(now) {
      if (!begun || !sheet) return;   // (still filling the room and the air, or no part of the sheet decoded yet)
      if (!S.sky) start(now);
      sync(now);
      var guard = 0;
      while ((lastEnd() === null || lastEnd() < now + H + 16) && guard++ < 8) commit(now);
      plan(now); under(now);
      S.N = S.N.filter(function (e) { return e.t1 > now - 5; }); S.B = S.B.filter(function (b) { return b[1] > now - 5; });
      wind(now);
      wet.gain.setTargetAtTime(0.42 * (0.85 + 0.45 * S.wc), now, 3); damp.detune.setTargetAtTime(-500 * S.wc, now, 3);   // (the room follows the world: over the open dunes drier, over the cloud softer, wetter, darker)
    }
    return { tick: tick, ready: ready, more: use };
  }

  /* the sheet's first parts, as the switch decodes them while the rest arrives: its seconds up to the end of the tuba's and
     the violas' notes (the deep end and the first voice), then of all the strings' and the contrabass's */
  var CUTS = [['tuba', 'viola'], ['violin', 'cello', 'cbass']].map(function (g) { var t = 0; NOTES.forEach(function (e) { if (g.indexOf(INST[e[0]]) >= 0) t = Math.max(t, e[2] + e[3]); }); return t; });
  window.SCORE = { cuts: CUTS, play: function (ctx, out, buffer, sliced) { return Score(ctx, out, buffer, function () { return window.WORLD && window.WORLD.sky ? window.WORLD.sky() : null; }, sliced); } };   // (sliced: ready resolves once the room and the air are filled; tick does nothing before)
})();
