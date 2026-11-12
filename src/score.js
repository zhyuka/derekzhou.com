/* The sound icon's score: music that follows the sky (the owner, 2026-11-12: "ship it", of the live score that follows
   the sky as it changes and never repeats; chosen by ear over seventeen rounds of sketches).

   Loaded deferred on every visit, but silent and idle until the visitor presses the icon: sound.js (the switch) makes
   the one audio context, fetches the one sheet of notes (real recordings: strings, clarinet, horn, harp, piano,
   contrabass, tuba; CC0) and hands both here. Nothing here fetches, makes a context or reads a clock of the page's:
   its time is the audio context's own (now, passed in by the switch about twice a second), and its one entropy is a
   seed the world hands it from the visit's one read (WORLD.sky().seed). It reads the sky (WORLD.sky(): the sky on
   show, the next and when the change comes, how much of the view is cloud) and never writes to the world.

   What it plays (round seventeen, the owner's pick): the strings hold slow chords (a new one every 16-24 s, notes two
   chords share held, never struck again), each sky its own key and its own colour on top (afterglow horns, Milky Way
   and aurora harp, blue hour piano, the moonlit sea low strings and clarinet, first light the strings alone); now and
   then the colour says two or three notes and is quiet again (never a tune); the strings breathe (a voice rests and
   swells back; one soft breath a sky); once a sky a borrowed chord. Under it a deep end you feel more than hear: a
   tuba played at half speed, kept to its fundamental, with a contrabass. A sky change is planned with the world's
   own: two chords both keys share (near) or the mist (far: the strings alone, thinning, no deep end), and the music
   swells to the moment the colour changes, always on a major chord. Over the cloud it lightens. No two notes closer
   than a minor third at once, nothing closer than a fifth low down, one deep note at a time. A faint air under it
   all, a long dark room, the ear's sensitive band eased; about -26 LUFS; no compression. */
(function () {
  'use strict';

  var NOTES = [[0,36,0.5,5.0,1,0.46542],[0,40,5.65,5.0,1,0.21259],[0,43,10.8,5.0,1,0.18428],[0,47,15.95,5.0,1,0.15703],[0,50,21.1,5.0,1,0.31815],[0,53,26.25,5.0,1,0.25647],[1,55,31.4,5.0,1,0.56921],[1,59,36.55,5.0,1,0.31169],[1,62,41.7,5.0,1,0.38332],[2,62,46.85,5.0,1,0.4439],[2,66,52.0,5.0,1,0.31866],[2,69,57.15,5.0,1,0.41829],[2,72,62.3,5.0,1,0.2508],[2,76,67.45,5.0,1,0.30487],[3,58,72.6,4.0,1,0.12701],[3,62,76.75,4.0,1,0.14562],[3,65,80.9,4.0,1,0.10728],[3,70,85.05,4.0,1,0.1062],[3,74,89.2,4.0,1,0.12793],[3,77,93.35,4.0,1,0.1262],[4,43,97.5,4.0,1,0.19314],[4,46,101.65,4.0,1,0.25987],[4,50,105.8,4.0,1,0.13615],[4,53,109.95,4.0,1,0.12133],[4,57,114.1,4.0,1,0.13613],[4,60,118.25,4.0,1,0.14096],[4,74,122.4,4.0,1,0.15428],[5,28,126.55,4.0,1,0.26297],[5,30,130.7,4.0,1,0.20173],[5,31,134.85,4.0,1,0.15188],[5,34,139.0,4.0,1,0.17654],[6,41,143.15,4.0,1,0.18657],[6,50,147.3,4.0,1,0.17992],[7,41,151.45,4.5,0,0.30174],[7,45,156.1,4.5,0,0.41835],[7,48,160.75,4.5,0,0.34362],[7,52,165.4,4.5,0,0.6044],[7,55,170.05,4.5,0,0.30406],[7,59,174.7,4.5,0,0.41814],[7,62,179.35,4.5,0,0.81824],[7,65,184.0,4.5,0,0.48499],[7,69,188.65,4.5,0,2.02098],[7,72,193.3,4.5,0,0.95475],[7,76,197.95,4.5,0,0.7057],[7,79,202.6,4.5,0,1.5404],[7,83,207.25,4.416,0,1.59554],[7,86,211.816,3.8974,0,3.00466],[8,36,215.8633,6.0,0,0.45523],[8,40,222.0133,6.0,0,0.35217],[8,44,228.1633,6.0,0,0.47107],[8,48,234.3133,6.0,0,0.50064],[8,52,240.4633,6.0,0,0.35333],[8,56,246.6133,6.0,0,0.37035],[8,60,252.7633,6.0,0,0.64495],[8,64,258.9133,6.0,0,0.90187],[8,68,265.0633,6.0,0,0.586],[8,72,271.2133,6.0,0,0.87843],[8,76,277.3633,6.0,0,0.58347],[8,80,283.5133,6.0,0,1.29236],[8,84,289.6633,6.0,0,1.39523]], MARK = 0.2;   // (tools/sound/sheet.py writes this line: [instrument, midi, start s, length s, loops, gain])
  var INST = ['cello', 'viola', 'violin', 'clar', 'horn', 'cbass', 'tuba', 'harp', 'piano'];
  var H = 10, GAP = 2.5, OUT = 0.69;   // (s: how far ahead it plans; a breath's gap; the output level: about -26 LUFS, measured with tools/sound/render.mjs)
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
  var LIFTS = { horn: -3, harp: -3, piano: -1.5, clar: -1.5, strings: -1, mist: -6 };   // (dB: the strings under each colour)

  function db(x) { return Math.pow(10, x / 20); }
  function curve(f) { var a = new Float32Array(33); for (var i = 0; i < 33; i++) a[i] = f(i / 32); return a; }
  var UP = curve(function (x) { var s = Math.sin(Math.PI / 2 * x); return s * s; }), DOWN = curve(function (x) { var c = Math.cos(Math.PI / 2 * x); return c * c; });
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
  function close(m, n) { return m !== n && (Math.abs(m - n) <= 2 || (Math.min(m, n) < 48 && Math.abs(m - n) < 7)); }

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
    var both = sx.filter(function (x) { return sy.indexOf(x) >= 0; }).sort(function (a, b) { return (ty.indexOf(b) >= 0) + (tx.indexOf(b) >= 0) - (ty.indexOf(a) >= 0) - (tx.indexOf(a) >= 0); }).slice(0, 5);
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
  function Score(ctx, out, buffer, feed) {
    var R = rng((feed() || {}).seed || 0x5c0e5c0e);
    var data = buffer.getChannelData(0), sr = buffer.sampleRate, zero = 0, i, best = 0;
    for (i = 0; i < Math.min(data.length, sr * 0.5); i++) if (Math.abs(data[i]) > best) { best = Math.abs(data[i]); zero = i / sr - MARK; }   // (where the decoder put time zero)
    var bank = {};
    NOTES.forEach(function (e) { var k = INST[e[0]]; (bank[k] = bank[k] || []).push({ m: e[1], s0: e[2] + zero, len: e[3], loop: !!e[4], g: e[5] }); });
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
    var tail = chain([biquad('peaking', 160, 1.2, -3.5), biquad('peaking', 2200, 0.7, -2.5), biquad('peaking', 2000, 5.1, -1.1), biquad('peaking', 2519, 5.1, -4), biquad('peaking', 3174, 5.1, -3.1), biquad('peaking', 4000, 5.1, -3.2), biquad('peaking', 3200, 0.8, -3), biquad('highpass', 27, 0.7071), level]);
    level.connect(out);
    var mswell = ctx.createGain(), dswell = ctx.createGain(); mswell.connect(tail); dswell.connect(mswell);
    var room = ctx.createConvolver(); room.normalize = false; room.buffer = hall();
    var music = ctx.createGain(), dry = ctx.createGain(), wet = ctx.createGain(), send = ctx.createGain(), deepIn = ctx.createGain(), fund = ctx.createGain();
    dry.gain.value = 0.88; wet.gain.value = 0.42; send.gain.value = 0.15;
    music.connect(dry); dry.connect(mswell); music.connect(room);
    var wetLp = biquad('lowpass', 3500, 0.7); room.connect(wetLp); wetLp.connect(wet); wet.connect(mswell);
    chain([fund, biquad('lowpass', 70, 0.5176), biquad('lowpass', 70, 0.7071), biquad('lowpass', 70, 1.9319), deepIn]);   // (the half-speed tuba: its fundamental only, felt)
    var deepOut = ctx.createGain(); deepOut.gain.value = db(-2.5); deepIn.connect(chain([biquad('lowshelf', 62, 0, 6), biquad('highpass', 27, 0.5412), biquad('highpass', 27, 1.3066), deepOut])); deepOut.connect(dswell); deepOut.connect(send); send.connect(room);
    function hall() {   // (a long, soft room, its highs dying first: 4.2 s low, 1.8 s high, four early reflections)
      var lo = 4.2, hi = 1.8, n = Math.floor(lo * 1.15 * ctx.sampleRate), b = ctx.createBuffer(2, n, ctx.sampleRate), c, j, e = 0;
      for (c = 0; c < 2; c++) {
        var x = b.getChannelData(c), l1 = 0, l2 = 0, h1 = 0, h2 = 0, pre = Math.floor(0.03 * ctx.sampleRate), al = 1 - Math.exp(-2 * Math.PI * 700 / ctx.sampleRate), ah = 1 - Math.exp(-2 * Math.PI * 4200 / ctx.sampleRate);
        for (j = pre; j < n; j++) {
          var t = (j - pre) / ctx.sampleRate, w = R.r(-1, 1);
          l1 += al * (w - l1); l2 += al * (l1 - l2);   // (the lows: below 700 Hz)
          h1 += ah * (w - h1); h2 += ah * (h1 - h2);   // (the highs: 700 Hz to 4.2 kHz)
          x[j] = l2 * Math.exp(-6.9 * t / lo) + 0.7 * (h2 - l2) * Math.exp(-6.9 * t / hi);
          if (t < 0.04) x[j] *= t / 0.04;
        }
        for (j = 0; j < 4; j++) x[pre + Math.floor(R.r(0.006, 0.07) * ctx.sampleRate)] += R.r(0.15, 0.4) * (R.f() < 0.5 ? -1 : 1) * 0.3;
      }
      var L = b.getChannelData(0), Rr = b.getChannelData(1);
      for (j = 0; j < n; j++) { Rr[j] = 0.4 * L[j] + 0.6 * Rr[j]; e += L[j] * L[j] + Rr[j] * Rr[j]; }
      e = Math.sqrt(e / 2); for (j = 0; j < n; j++) { L[j] /= e; Rr[j] /= e; }
      return b;
    }
    /* a faint air: two slow noises (a low billow, a higher stream), drifting on their own slow cycles; over the cloud
       the billow eases and the stream rises */
    var air = [];
    (function () {
      var n = Math.floor(16 * ctx.sampleRate), j, k;
      [[70, 520, [11, 17, 29], 0.55], [450, 1500, [7, 13, 23], 0.45]].forEach(function (p) {
        var b = ctx.createBuffer(2, n, ctx.sampleRate);
        for (k = 0; k < 2; k++) { var x = b.getChannelData(k); for (j = 0; j < n; j++) x[j] = R.r(-1, 1); for (j = 0; j < 2400; j++) { var w = j / 2400; x[j] *= w; x[n - 1 - j] *= w; } }
        var s = ctx.createBufferSource(); s.buffer = b; s.loop = true;
        var g = ctx.createGain(), dg = ctx.createGain(); g.gain.value = 0; dg.gain.value = 1;
        chain([s, biquad('highpass', p[0], 0.7), biquad('lowpass', p[1], 0.7), biquad('lowpass', 1200, 0.7), dg, g, tail]);
        p[2].forEach(function (per) { var o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.value = 1 / (per * R.r(0.9, 1.1)); og.gain.value = p[3] / 3; o.connect(og); og.connect(dg.gain); o.start(ctx.currentTime + R.r(0, per)); });
        s.start(ctx.currentTime, R.r(0, 15)); air.push(g);
      });
    })();
    var AIR = 0.0035;   // (the air, about 22 dB under the music)

    function voice(inst, m, at, gdb, att, pan, half, bus) {
      var e = pick(inst, half ? m + 12 : m), rate = Math.pow(2, ((half ? m + 12 : m) - e.m) / 12) * (half ? 0.5 : 1);
      var s = ctx.createBufferSource(), g1 = ctx.createGain(), g2 = ctx.createGain(), p = ctx.createStereoPanner(), A = e.g * db(gdb);
      s.buffer = buffer; s.playbackRate.value = rate; p.pan.value = Math.max(-1, Math.min(1, pan));
      chain([s, g1, g2, p, bus || music]);
      at = Math.max(at, ctx.currentTime + 0.05);
      g1.gain.setValueAtTime(0, at);
      if (e.loop) { s.loop = true; s.loopStart = e.s0; s.loopEnd = e.s0 + e.len; s.start(at, e.s0 + R.f() * e.len * 0.8); }
      else { s.start(at, e.s0); s.stop(at + e.len / rate - 0.02); }
      if (att > 0.02) curveAt(g1.gain, scaled(UP, A), at, att); else g1.gain.setValueAtTime(A, at);
      return { s: s, g1: g1, g2: g2, A: A, at: at, att: att, t2: at, m: m, loop: e.loop };
    }
    function release(v, t, rel) {
      if (v.done) return; v.done = true;
      t = Math.max(t, v.at + v.att + 0.05, ctx.currentTime + 0.05);
      curveAt(v.g1.gain, scaled(DOWN, v.A), t, rel);
      if (v.loop) v.s.stop(t + rel + 0.05);
    }
    function breathe(v, a, b, rest) {   // (within a chord: a swell of its own, or a rest of a few seconds and back)
      var t0 = Math.max(a, v.t2, ctx.currentTime + 0.05);
      if (rest && b - t0 > 17) {
        var mid = R.r(t0 + 6, b - 11), r = R.r(6, 10);
        curveAt(v.g2.gain, DOWN, mid + 0.8, 3.5); curveAt(v.g2.gain, UP, mid + r, 4); v.t2 = mid + r + 4.05;
        return mid + r;
      }
      if (b - t0 > 4) { var s = R.r(0.02, 0.24); curveAt(v.g2.gain, curve(function (x) { return 1 + s * Math.sin(Math.PI * x); }), t0, b - t0); v.t2 = b + 0.01; }
      return 0;
    }

    /* the plan */
    var S = { sky: null, hold: null, chg: null, next: null, swaps: [], C: [], active: {}, deep: null, wc: 0, log: [], figAt: 0, swellEnd: 0 };
    function colourAt(t) { var c = SKIES[S.swaps.length ? S.swaps[0][1] : 'bluehour'].col, j; for (j = 0; j < S.swaps.length; j++) if (S.swaps[j][0] <= t) c = S.swaps[j][2]; return c; }
    function lastEnd() { return S.C.length ? S.C[S.C.length - 1].b : null; }
    function newHold(sky, a, first) { S.sky = sky; S.hold = { a: a, k: 0, i: 0, used: false, br: a + R.r(20, 45), brDone: false, first: first || null }; }

    function sync(now) {   // (the world's sky, mapped onto the audio clock: when the next change comes, and to what)
      var F = feed(), e, tc;
      S.next = null;
      if (F) { S.wc += (F.wc - S.wc) * 0.2; }
      if (!F || F.still || !F.seq.length || S.chg) return F;
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
      if (F && F.seq.length) { e = F.seq[0]; sky = (F.t > e.at + e.hold && F.seq.length > 1) ? F.seq[1].id : e.id; S.wc = F.wc; }
      S.swaps.push([-1e9, sky, SKIES[sky].col]);
      newHold(sky, now + 0.3, voiced(tonic(SKIES[sky])[0], tonic(SKIES[sky])[1]));
    }
    function commit(now) {
      var a = lastEnd(), X, Y, P, M, d, rem, notes, tag = S.sky, br = false, bm = false, sk;
      if (a === null) a = S.hold.a;
      if (S.chg) {
        P = S.chg.steps.shift();
        if (P) push(a, S.chg.a + P[1] * S.chg.M, P[2], P[3], false, false);
        else { Y = S.chg.to; X = S.chg; S.chg = null; newHold(Y, a, X.arrive); commit(now); }
        return;
      }
      if (S.next && a >= S.next.at - 6) {   // (the change, planned with the world's)
        X = SKIES[S.sky]; Y = SKIES[S.next.to]; M = S.next.M; var c0 = a, steps;
        if (!S.next.far) {
          P = nearPath(X, Y);
          steps = [[0, 0.12, voiced(tonic(X)[0], tonic(X)[1]), 'change'], [0.12, 0.4, P[0], 'change'], [0.4, 0.75, P[1], 'change']];   // (the major chord in well before the swell peaks on it)
          S.swaps.push([c0 + 0.5 * M, S.next.to, Y.col]); swell(c0 + 0.5 * M);
          S.chg = { a: c0, M: M, to: S.next.to, steps: steps, arrive: voiced(tonic(Y)[0], tonic(Y)[1]) };
        } else {
          steps = [[0, 0.3, voiced(tonic(X)[0], X.minor ? VM9 : V69), 'change'], [0.3, 0.7, mistChord(X, Y), 'mist']];
          S.swaps.push([c0 + 0.3 * M, null, 'mist']); S.swaps.push([c0 + 0.7 * M, S.next.to, Y.col]); swell(c0 + 0.7 * M + 4.5);
          S.chg = { a: c0, M: M, to: S.next.to, steps: steps, arrive: Y.minor ? voiced(Y.key + 3, V9) : voiced(tonic(Y)[0], tonic(Y)[1]) };   // (out of the mist on a major chord: a minor sky's arrives by its relative major)
        }
        S.next = null; commit(now); return;
      }
      sk = SKIES[S.sky]; d = R.r(16, 24);
      if (S.next) { rem = S.next.at - a; if (rem - d < 10) d = rem; if (d < 6) d = 6; }
      if (S.hold.first) { notes = S.hold.first; S.hold.first = null; S.hold.i = 0; }
      else if (S.hold.k === 2 && !S.hold.used && (!S.next || rem > 30) && R.f() < 0.75) { notes = voiced(sk.key + sk.sur[0], sk.sur[1]); S.hold.used = true; bm = sk.sur[1] === VM9; S.hold.i = -1; }
      else {
        S.hold.i = S.hold.i < 0 ? 0 : (S.hold.i !== 0 && R.f() < 0.35 ? 0 : (function () { var j; do j = R.i(sk.field.length); while (j === S.hold.i); return j; })());
        notes = voiced(sk.key + sk.field[S.hold.i][0], sk.field[S.hold.i][1]);
        if (S.hold.k === 0 && S.hold.i !== 0) { S.hold.i = 0; notes = voiced(tonic(sk)[0], tonic(sk)[1]); }
      }
      if (S.hold.k >= 1 && !S.hold.brDone && a >= S.hold.br && (!S.next || rem - d >= 0)) { br = true; S.hold.brDone = true; }
      S.hold.k++;
      push(a, a + d, notes, tag, br, bm);
    }
    function push(a, b, notes, tag, br, bm) {
      var c = { a: a, b: b, n: notes, tag: tag, br: br, bm: bm }; S.C.push(c);
      strings(c); colours(c); deep(c);
      while (S.C.length > 6) S.C.shift();
    }

    /* the strings: held across chords where they stay; a note that moves by a step, or low down by less than a fifth,
       lets go before its neighbour comes in; upper voices may rest a few seconds and swell back */
    function strings(c) {
      var a = c.a, act = S.active, m, k, near, st, keys = Object.keys(act).map(Number), starting = [], ending = [], D = S.deep;
      var root = c.tag === 'mist' ? null : c.n[0], turn = !D || c.br || D.root !== root;
      var old = D && turn ? [D.root - 12] : [], next = root !== null && turn ? [root - 12] : [];   // (the deep note leaving: a low string close to it waits for it to go; the deep note coming: a low string close to it lets go first)
      keys.forEach(function (m) { if (c.br || c.n.indexOf(m) < 0) ending.push(m); });
      c.n.forEach(function (m) { if (c.br || !act[m] || ending.indexOf(m) >= 0) starting.push(m); });
      ending.forEach(function (m) {
        near = starting.concat(next).some(function (n) { return close(m, n); });
        var u = R.r(-0.8, 0.8); release(act[m], (near || c.br) ? a - 0.8 + 0.8 : a + u + 0.8, (near || c.br) ? 3.5 : 5.5); delete act[m];
      });
      starting.forEach(function (m) {
        near = ending.concat(old).some(function (n) { return close(m, n); });
        st = c.br ? a + GAP + R.r(0, 0.8) : near ? a + 1.0 + R.r(0, 0.8) : a - 1.0 + R.r(-0.8, 1.4);
        var col = colourAt(st), inst = m < 55 ? 'cello' : m < 64 ? 'viola' : col === 'clar' ? 'clar' : 'violin', g = m < 55 ? -8 : inst === 'clar' ? -11 : -10;
        g += (LIFTS[col] || 0) + (m < 50 ? -3 * S.wc : 0) + R.r(-0.5, 0.5);
        act[m] = voice(inst, m, st, g, 4.0, -0.45 + 0.9 * (m - 36) / 41);
      });
      for (k in act) { m = +k; breathe(act[k], a, c.b, m >= 55 && R.f() < 0.6); }
    }
    function spread(n) { var b = n.slice(1), m; for (m = b[b.length - 1] + 3; m <= 84 && b.length < n.length + 1; m++) if (n.some(function (x) { return x % 12 === m % 12; }) && n.concat(b).every(function (x) { return Math.abs(m - x) >= 3; })) b.push(m); return b; }
    function colours(c) {
      var col = colourAt(c.a), st = c.a + (c.br ? GAP : 0), L = c.b - st, j, m, p;
      if (c.tag === 'mist' || col === 'mist' || col === 'clar' || col === 'strings') return;
      if (col === 'horn') c.n.slice(1, 4).forEach(function (m, j) { var v = voice('horn', m, st + 0.5, -11 + R.r(-0.5, 0.5), 3.0, -0.3 + 0.3 * j); release(v, st + L - 2.0, 3.5); });   // (gone before the next chord's strings arrive)
      if (col === 'harp') { p = spread(c.n); p.forEach(function (m, j) { var t = st + 2.2 + j * 0.95; voice('harp', m, t, -11 - 0.6 * j + R.r(-0.4, 0.2), 0, -0.3 + 0.6 * j / 6); S.log.push([m, t, t + 3]); }); }
      if (col === 'piano') c.n.forEach(function (m, j) { var t = st + 2.2 + j * 0.2; voice('piano', m, t, (j ? -13 : -10) + R.r(-0.6, 0.2), 0, -0.3 + 0.6 * j / 4); S.log.push([m, t, t + 4]); });
    }
    /* the deep end: an octave under the strings' bass, one note at a time; none in the mist; lighter over the cloud
       and under the borrowed minor chords; it breathes with the strings */
    function deep(c) {
      var root = c.tag === 'mist' ? null : c.n[0], gm = c.bm ? -4 : 0, D = S.deep;
      if (D && D.root === root && D.gm === gm && !c.br) return;
      if (D) { release(D.t, c.a - 1.8, 3.0); release(D.b, c.a - 1.8, 3.0); S.deep = null; }
      if (root === null) return;
      var sub = root - 12, at = c.a + (c.br ? GAP + 0.5 : 1.5), g = -2 * S.wc + gm + (sub <= 27 ? 4 : sub <= 30 ? 2 : 0);
      S.deep = { root: root, gm: gm, t: voice('tuba', sub, at, g + R.r(-0.5, 0.5), 3.5, 0, true, fund), b: voice('cbass', sub, at + 0.3, -12 + g + R.r(-0.5, 0.5), 3.5, -0.1, false, deepIn) };
    }
    function swell(p) {   // (10 s up to the moment the colour changes, 2 s held, 9 s settling: all +2.5 dB, the deep end +6.5)
      var t0 = Math.max(p - 11, ctx.currentTime + 0.05);
      if (t0 < S.swellEnd) return; S.swellEnd = t0 + 21.05;   // (never two at once: a change hard on another's heels swells once)
      curveAt(mswell.gain, curve(function (x) { var u = x * 21, e = u < 10 ? Math.pow(Math.sin(Math.PI / 2 * u / 10), 2) : u < 12 ? 1 : Math.pow(Math.cos(Math.PI / 2 * (u - 12) / 9), 2); return db(2.5 * e); }), t0, 21);
      curveAt(dswell.gain, curve(function (x) { var u = x * 21, e = u < 10 ? Math.pow(Math.sin(Math.PI / 2 * u / 10), 2) : u < 12 ? 1 : Math.pow(Math.cos(Math.PI / 2 * (u - 12) / 9), 2); return db(4 * e); }), t0, 21);
    }

    /* the gestures: now and then the colour on top says two or three notes, then nothing for a while; each a tone of
       the chord sounding, a minor third or more from every note sounding (or the same note) */
    function chordAt(t) { for (var j = S.C.length - 1; j >= 0; j--) if (S.C[j].a <= t) return S.C[j]; return null; }
    function pool(t, lo, hi, span) {
      var c = chordAt(t), on = c ? c.n.slice() : [], pcs, out = [], m;
      S.log.forEach(function (e) { if (e[1] <= t + span && e[2] >= t) on.push(e[0]); });
      pcs = (c ? c.n : []).map(function (x) { return x % 12; });
      for (m = lo; m <= hi; m++) if (pcs.indexOf(m % 12) >= 0 && on.every(function (n) { return m === n || Math.abs(m - n) >= 3; })) out.push(m);
      return out;
    }
    function run(p, j0, k) { var o = [p[j0]]; for (var j = j0 + 1; j < p.length && o.length < k; j++) if (p[j] - o[o.length - 1] >= 3) o.push(p[j]); return o; }
    function gestures(now) {
      if (!S.figAt) S.figAt = now + R.r(9, 16);
      while (S.figAt < now + H - 6 && S.figAt < lastEnd() - 8) {   // (only where the chord after is known: a gesture lasts up to six seconds)
        var t = S.figAt, c = chordAt(t), col = colourAt(t), p, seq, j;
        var bad = !c || col === 'mist' || c.tag === 'mist' || S.C.some(function (x) { return t - x.a > -8 && t - x.a < 4.5; }) || S.C.some(function (x) { return x.br && t > x.a - 1 && t < x.a + GAP + 5; });
        if (bad) { S.figAt += 2.5; continue; }
        if (col === 'horn' && (p = pool(t, 53, 70, 5)).length >= 2) {
          var lo = p.filter(function (m) { return m <= 62; }), m1 = (lo.length ? lo : p)[R.i((lo.length ? lo : p).length)], up = p.filter(function (m) { return m - m1 >= 5 && m - m1 <= 7; });
          var above = p.filter(function (m) { return m - m1 >= 3; });   // (a sigh down from a tone a third or more above: two horn notes ringing together never rub)
          seq = up.length && R.f() < 0.65 ? [m1, up[0]] : [above.length ? above[0] : m1, m1];
          if (seq[0] !== seq[1]) seq.forEach(function (m, j) { var tt = t + (j ? 1.35 : 0), v = voice('horn', m, tt, -14 + R.r(-0.5, 0.5), 0.45, 0.35); release(v, tt + (j ? 2.8 : 1.5), 2.4); S.log.push([m, tt, tt + (j ? 3.8 : 2.5)]); });
        } else if (col === 'harp' && (p = pool(t, 62, 86, 4)).length >= 3) {
          seq = run(p, R.i(Math.max(1, p.length - 3)), R.f() < 0.7 ? 3 : 2); var tt = t;
          seq.forEach(function (m, j) { voice('harp', m, tt, -15 - 0.7 * j + R.r(-0.5, 0.3), 0, 0.25 - 0.2 * j); S.log.push([m, tt, tt + 2.5]); tt += R.r(0.3, 0.48); });
        } else if (col === 'piano' && (p = pool(t, 64, 84, 4)).length >= 2) {
          seq = run(p, R.i(p.length - 1), 2); if (R.f() >= 0.6) seq.reverse(); var tp = t;
          seq.forEach(function (m) { voice('piano', m, tp, -16 + R.r(-0.6, 0.3), 0, 0.2); S.log.push([m, tp, tp + 3]); tp += R.r(0.55, 0.8); });
        } else if ((col === 'clar' || col === 'strings') && (p = pool(t, 60, 76, 5)).length >= 2) {
          j = 1 + R.i(p.length - 1); seq = [p[j], p[j - 1]];
          if (j >= 2 && R.f() < 0.4) seq.push(p[j - 2]);
          if (R.f() < 0.3) seq = [p[j - 1], p[j], p[j - 1]];
          var total = R.r(3.8, 5.2), w = seq.map(function () { return R.r(0.7, 1); }); w[w.length - 1] *= 2; var ws = w.reduce(function (x, y) { return x + y; }, 0), tc = t;
          seq.forEach(function (m, k) {   // (legato: each note into the next, the last held longer; a sigh)
            var last = k === seq.length - 1, dd = w[k] / ws * total, v = voice(col === 'clar' ? 'clar' : 'violin', m, tc, -13 + 1.6 * Math.sin(Math.PI * Math.min(1, (tc - t + dd / 2) / total / 0.8)) - 0.8, k ? 0.07 : 0.35, 0.3);
            release(v, last ? tc + dd : tc + dd - 0.16, last ? 1.1 : 0.16); S.log.push([m, tc + 0.3, tc + dd + (last ? 0.6 : 0)]); tc += dd;   // (each note gone as the next begins: no two at once)
          });
        }
        S.figAt = t + R.r(11, 22);
      }
    }

    function tick(now) {
      if (!S.sky) start(now);
      sync(now);
      var guard = 0;
      while ((lastEnd() === null || lastEnd() < now + H) && guard++ < 8) commit(now);
      gestures(now);
      S.log = S.log.filter(function (e) { return e[2] > now - 5; });
      air[0].gain.setTargetAtTime(AIR * (1 - 0.4 * S.wc), now, 3); air[1].gain.setTargetAtTime(AIR * (0.1 + 0.2 * S.wc), now, 3);
    }
    return { tick: tick };
  }

  window.SCORE = { play: function (ctx, out, buffer) { return Score(ctx, out, buffer, function () { return window.WORLD && window.WORLD.sky ? window.WORLD.sky() : null; }); } };
})();
