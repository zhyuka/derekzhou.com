/* score.js — the score: the sky, heard.

   The owner chose it on 2026-10-02 ("Opt-in generative score") and brought it back on 2026-11-07: "bring it back,
   opt-in. using an icon that fits with the rest of the design". Every visit starts silent. Nothing of this file is
   fetched before the visitor presses the sound icon (sound.js, the switch, sets the src of the empty script slot in
   index.html inside that press); it then hands itself to the switch (SOUND.score) and is run on the switch's audio
   context. A second press fades it out and lets the audio device go.

   Every sound is made here, live: an oscillator, a buffer worked out here (a plucked string, a room's air, rain's
   drops), or noise shaped by filters. Nothing is recorded, and no stretch of it comes back as it was.

   THE SKY, READ. Four times a second the score reads the world's sky (WORLD.sky(): the sky on show and the next, how
   far the change between them has gone, whether it goes through the mist, the cloud sea's share of the land below);
   it only reads, and never steers it. With no sky drawn (no WebGL2, forced colours, a world not yet shown) it reads
   the hour's data-sky: one light, still generative within itself. Under reduced motion the world is one still frame,
   so the score reads that still sky and plays on in it. Its seed is the world's (one of the world's own streams from
   its one entropy read: no second draw); its one clock is the audio context's own time, on which every note is
   scheduled, and the sky's cycle.

   ONE THREAD. Every light's mode holds D and A, the open fifth (the switch's chime is that fifth struck, and a
   twilight strikes it again): whatever two lights a change joins, the thread is in both keys.

   THE SIX LIGHTS, the world's six skies, each give a key and a harmonic field in just intonation (the held chords'
   thirds and fifths pure, so they do not beat, and no two held tones within a whole tone of each other unless the
   softer is 12 dB down, nor two overtones a semitone apart that a phone could hear, so they never roughen), a mode
   by their light (brighter modes for the brighter lights, darker toward the night, thinner and slower at night):
   first light Lydian on D (the light before sunrise, its tops lit first), the afterglow Aeolian, the blue hour
   Dorian on G, the moonlit sea F major, the Milky Way a pentatonic of pure fifths, the aurora Lydian on F (the
   night's awe). Dusk and night share one set of seven notes, so their changes move the centre. Each light's held
   chord stands on its centre and its fifth, two colour tones of its own beside them, and the mode's third wherever it
   has one, so the key and mode heard are the light's. Each light also brings its instrument (glass, bowls, bells,
   plucked strings, a breathed tone, a far star), its pace and its register. Every sky's words are light, so every
   light's struck notes are its evening's: soft mallets, soft fingers (dark).

   THE TWO PLACES, the world's two kits, each give the held chords a voice and the music a space: above the sea of
   cloud thin air (near-pure tones, a long bright air over the cloud); over the dunes a warmer voice, the far rock's
   echoes and the wind's sand. The world blends the two by the flight's place; the score takes the nearer, and
   changes its space (two rooms, crossfaded) as the flight passes from one to the other.

   THE WEATHER gives the textures: the wind (its gusts, and a whistle that sings the thread), the mist (it veils the
   high notes and lengthens the air), the cloud (a fuller chord). The score listens to its own air and holds it under
   the music: weather is heard arriving, and never buries the music.

   EVENTS give rare motifs, always in key: first light sliding down the crowns, a murmuration's cloud of notes, the
   moon rising a fifth, the aurora's slow shimmer, a single star.

   CHANGES are modulations by common tones: the tones the two lights share are held through the change (gliding by a
   comma where their tunings differ), the rest go out in its first half and come in in its second, on the change's
   own k; between the two, the music moves only on their common notes (a pivot). A change into or out of the night
   (the sun sinking or coming back below the sea) is marked by the thread struck once, softly; a change through the
   mist swells into a hush, the place's space changing inside it, and clears.

   EMPTY TIME: lulls of 20-40 s with only the held chord and the air, every few minutes (a hush counts as one); few
   notes and long gaps always, never more in a minute than the light's cap; a long listen thins. Nothing starts with
   a jolt: every level, colour and space follows a time constant that takes over two seconds, and every note has a
   soft attack. These slow swells are the sound's own; nothing on the page fades.

   LOUDNESS: about -26 LUFS for every light in every place (trims measured offline by tools/sound/measure.mjs, and a
   slow level that hears the whole and holds it within 0.5 LU of -26, by at most 4 dB, still in a lull), a soft
   ceiling at -11.7 dBFS no note should reach; the identity at D4 and up, so a phone's speaker keeps it.

   No listener, no DOM, no clock but the audio context's, no entropy: the switch's press is the one handler. */
(function () {
  'use strict';

  /* ---------------- tunables ---------------- */

  var TICK = 0.25;            // s: the scheduler wakes this often and reads the sky
  var AHEAD = 1.5;            // s: and schedules this far ahead (a throttled timer still keeps time)
  var REF = 293.665;          // Hz: D4, the score's D (the switch strikes the same D and A)
  var FADE = 3;               // s: the held chord comes in over this at the press
  var ROOM_MAX = 3.6;        // s: a room's impulse at most this long (the above-cloud air's 5.4 s decay is 40 dB down by 3.6 s)
  var TAU = 0.9;              // s: every level, colour and space follows this time constant: a step takes over 2 s
  var STAR_HI = 2100;         // Hz: the stars' and glints' highest (a fundamental over ~2 kHz sits in the band a phone makes harsh)
  var GAP_MIN = 0.15;         // s: unrelated struck notes never closer than this (no accidental flam)
  var VOICES = 9;             // struck voices ringing at once, at most (CPU on a phone)
  var LOOP_P = [17.3, 19.9, 22.9, 26.3, 30.2, 34.7];   // s: the visit's loops, each a pitch on its own period, none a ratio of
                              //  another, so they never line up again
  var LULL = [150, 240];      // s between lulls ...
  var LULL_T = [20, 40];      // ... of this long, only the held chord and the air (the pause calms)
  var THIN = 480;             // s: a long listen thins after this, to 0.7 by twice it
  var CHORD_T = [38, 62];     // s: the held chord turns to its next voicing this often within a light ...
  var CHORD_X = 12;           // ... over this long
  var ENTER = 8;              // s after the press before the first struck note (the chord first)
  var OCT = [0, 0, 0.1, 0.3, 0.85, 1, 0.8, 0.5];    // a held tone's level by its octave: the identity at D4 and up, the low tones a
                              //  bloom for headphones (a phone's speaker loses all below ~300 Hz)
  var ROLE = [1, 0.5, 0.7];   // ... and by its part: the light's centre, its fifth at -6 dB and its colour tones at -3 dB re the centre
  var SHIMMER = 0.1;          // the chord's highest centre doubled an octave up, this loud
  var SWELL = 0.2;            // each held tone swells this much about its level (-4.4 dB at its lowest) ...
  var BREATH = [1.5, 2.9];    // dB: ... and the whole chord, and the whole air, breathe this much, slowly (never a pulse)

  /* ---------------- tuning: just intonation on D ---------------- */

  /* pitch classes from D (0) to C# (11), and each one's ratio above D: 5-limit, the thirds pure, C a minor seventh of
     9/5 so F-C is a pure fifth; a light may retune a note for its own pure chords */
  var NAMES = { C: 10, 'C#': 11, D: 0, 'D#': 1, Eb: 1, E: 2, F: 3, 'F#': 4, G: 5, 'G#': 6, A: 7, Bb: 8, B: 9 };
  var GAMUT = [1, 16 / 15, 9 / 8, 6 / 5, 5 / 4, 4 / 3, 45 / 32, 3 / 2, 8 / 5, 5 / 3, 9 / 5, 15 / 8];

  /* THE LIGHTS, by the world's sky ids. mode: its notes, the first its centre; tri: the line's answering chord; pads:
     the held chord's voicings (scientific octaves; 'D4:.7' a tone and its level, else by OCT and ROLE; no held pair
     within 30 cents of a perfect consonance and off it, no two tones within a whole tone unless the softer is 12 dB
     down, a major third above its root's loud octave, a minor chord's low root soft under its third); line: the
     line's lowest note; loops: the loops' pitches, the first the centre (the first struck note; the most dissonant
     last, on the longest period); inst: its instrument (inst2 for every other loop, or for the loops named in alt);
     mt: the line's instrument (a melody walking the mode by step from its centre and home, answered by the chord's
     nearest tone below it); rate: struck notes a minute, and cap: at most this many in any minute, loops, line and
     motifs together (dawn 6-9, dusk 3-5, night 1-2, a motif's few over); slow: its loops' periods stretched (night
     slower); lp: the held chord's brightness (Hz); tilt: the whole's (dB above 2.6 kHz); br: how deeply it breathes
     (x BREATH); wx: its weather; ev: its events; night: 1 for the night's three (a change across it is a twilight,
     the thread struck); dark: how far its struck notes soften (every sky's words are light: dusk's softness, or
     near it at first light and in the afterglow) */
  var LIGHTS = {
    firstlight: { mode: 'D E F# G# A B C#', tri: 'D F# A', pads: ['A4:.3 D5:.7 B5:.3 D6:1 F#6:.3', 'A4:.3 D5:.6 F#5:.3 D6:1 E6:.2'], loops: 'D5 G#5 A5 F#5 E5 B5',
      inst: 'glass', inst2: 'bowl', mt: 'pluck', line: 'A4', rate: 6, cap: 9, slow: 1.1, lp: 2100, tilt: 0, br: 1.1, wx: { fog: 0.15 }, ev: ['ignition', 'star'], dark: 0.55 },
    afterglow: { mode: 'D E F G A Bb C', tri: 'D F A', pads: ['D3:.2 D4:.7 F4:.5 A4:.5 D5:.85 F5:.3', 'D3:.2 D4:.7 F4:.45 A4:.4 D5:.85 G5:.15'], loops: 'D5 Bb5 A5 G5 E5 F5',
      inst: 'bowl', inst2: 'glass', mt: 'pluck', line: 'A4', rate: 5, cap: 6, slow: 1.2, lp: 1750, tilt: -0.5, br: 1.5, wx: {}, ev: ['murmuration', 'moonrise'], dark: 0.85 },
    bluehour: { mode: 'G A Bb C D E F', ji: { E: 10 / 9 }, tri: 'G Bb D', pads: ['G3:.25 G4:.7 Bb4:.55 D5:.65 G5:.65', 'G3:.2 G4:.7 Bb4:.45 D5:.6 G5:.55 E6:.2'], loops: 'G4 F5 D5 E5 A4 Bb4',
      inst: 'bell', inst2: 'star', alt: [3, 5], rate: 4, cap: 6, slow: 1.3, lp: 1550, tilt: -1, br: 1.2, wx: { wind: 0.15 }, ev: ['star', 'nlc'], dark: 1 },
    moonlit: { mode: 'F G A Bb C D E', tri: 'F A C', pads: ['F2:.4 F3:.6 C4:.45 F4:1 C5:.25 A5:.35', 'F2:.4 C3:.35 F3:.6 C4:.4 F4:1 A5:.35 D6:.15'], loops: 'F5 G5 C6 Bb5 A5 D6',
      inst: 'glass', inst2: 'star', rate: 2, cap: 4, slow: 1.4, lp: 1800, tilt: -0.5, br: 1, wx: { wind: 0.1 }, ev: ['mooncross'], night: 1, dark: 1 },
    milkyway: { mode: 'D E G A B', ji: { B: 27 / 16 }, tri: 'D A', pads: ['D4:.8 A4:.55 E5:.45 B5:.4 D6:.5', 'D4:.8 A4:.5 E5:.4 B5:.4 D6:.5 G5:.25'], loops: 'D5 B5 A5 G5 E5',
      inst: 'star', inst2: 'glass', rate: 2, cap: 4, slow: 1.6, lp: 1450, tilt: -1, br: 1, wx: { wind: 0.1 }, ev: ['star'], night: 1, dark: 1 },
    aurora: { mode: 'F G A B C D E', ji: { B: 27 / 16 }, tri: 'F A C', pads: ['F3:.35 C4:.45 F4:.6 A5:.5 F5:1 D6:.25', 'F3:.3 F4:.5 C5:.55 F5:1 A5:.5 D6:.3'], loops: 'F5 A5 C6 B5 G5 D6',
      inst: 'glass', inst2: 'star', mt: 'breath', line: 'C5', rate: 3, cap: 5, slow: 1.4, lp: 1500, tilt: -1, br: 1.2, wx: { wind: 0.1 }, ev: ['aurora', 'star'], night: 1, dark: 1 }
  };
  /* the hour's time of day, when no sky is drawn: the light the world would open on (hour.js) */
  var HOURS = { dawn: 'firstlight', day: 'firstlight', rain: 'afterglow', sunset: 'afterglow', dusk: 'bluehour', night: 'moonlit' };

  /* THE PLACES, by the world's kits. wave: the held chord's voice (harmonic amplitudes); lp: its brightness (x the
     light's); room: the air's decay [s, low and high] and its first reflection (s); er: the near reflections; wet:
     how much air; bed: the place's own sound; air, whistle: the wind's level and its whistle's; airF: the wind's band
     [Hz in still air, Q]; width: how wide the held chord stands; decay: struck notes ring this much longer; ks: a
     plucked string's [brightness, ring at D5 (s)]; echo: the far rock's echoes; br: how deeply it breathes */
  var PLACES = {
    above: { width: 0.55, wave: [1, 0.45, 0.22, 0.1, 0.05], lp: 1.25, room: [5.4, 2.8, 0.045], er: 0.12, wet: 1, bed: 'air', air: 0.6, airF: [1400, 0.75], whistle: 1, decay: 1.15, ks: [0.85, 3.8], echo: 0, br: 1 },
    dunes: { width: 0.45, wave: [1, 0.42, 0.22, 0.12, 0.07, 0.04], lp: 0.9, room: [3.6, 1.8, 0.025], er: 0.28, wet: 0.8, bed: 'sand', air: 0.5, airF: [1300, 0.9], whistle: 0.45, decay: 1.05, ks: [0.6, 3.3], echo: 0.22, br: 1.1 }
  };

  /* loudness: dB for each light and place, measured offline (BS.1770, the steady state after the press: tools/sound/
     measure.mjs --fit solves them by least squares on every light in every place, the place trims summing to zero);
     the slow level (earMix) holds the rest */
  var TRIM = { firstlight: 4.98, afterglow: 5.28, bluehour: 6.08, moonlit: 4.79, milkyway: 6.53, aurora: 5.54 };
  var TRIM_P = { above: -0.21, dunes: 0.21 };
  var GAIN = -14;             // dB: the whole, before the trims
  var TARGET = -26;           // LUFS: the score's loudness, every light, every place
  var LEVEL_DB = 0.5, LEVEL_MAX = 4;   // LU: the slow level's dead band about TARGET, and its reach either way
  var PAD_DB = 3, SIG_DB = 15, BED_DB = 7;   // dB: the three layers (the held chord, the struck notes, the air)
  var BED_UNDER = -4.5;       // LU: the air at least this far under the held chord, as heard
  var BED_MAX = -28;          // LUFS: the air and the weather together, at most, as heard (K-weighted, over ~12 s, after the trims)

  /* the struck instruments: [ratio, level, ring (share of the note's)] (modal synthesis) */
  var GLASS = [[1, 1, 1], [2.756, 0.42, 0.45], [5.404, 0.18, 0.22], [8.933, 0.07, 0.12], [13.344, 0, 0], [18.638, 0, 0]];   // a free bar's modes
  var HIT = [0, 0, 0, 0.5, 0.4, 0.35], HIT_T = 0.06;   // the strike: the glass's modes from 8.9x up ring on their own for ~0.15 s, all above
                              //  5 kHz, so the attack is bright and adds nothing in 2-5 kHz, where a phone is harsh
  var TAME = [0.6, 0.75, 0.8];   // a struck mode near 3.2 kHz is this much quieter (a bell curve 0.8 octave wide), by day and by night
  var DS = [0.006, 3, 8, 0.008, 4];   // the de-esser: its threshold (the band's power), its ratio, its deepest cut (dB), its lead (s), the band's gain
  var DS_REST = [-1, -4];     // dB: its resting cut at 3.2 kHz by day and by night
  var BOWL = [[1, 1, 1], [2.77, 0.45, 0.62], [5.17, 0.22, 0.36], [8.13, 0.1, 0.22]];   // a singing bowl, each mode a beating doublet
  var BELL = [[0.5, 0.42, 1.4], [1, 0.45, 1], [1.2, 0.3, 0.8], [1.5, 0.16, 0.55], [2, 0.5, 0.7], [2.52, 0.1, 0.32], [2.67, 0.05, 0.2], [3.01, 0.08, 0.22],
    [4.03, 0.05, 0.14], [5.07, 0.035, 0.1], [5.4, 0.025, 0.08], [6.09, 0.02, 0.07], [6.7, 0.014, 0.06], [8.1, 0.012, 0.05]];   // a true-harmonic bell: hum, prime,
                              //  tierce, quint, nominal (tuned true, so the held part is consonant); above it a cast bell's upper partials,
                              //  stretched a few cents sharp and short-lived
  var BELL_HIT = 0.75;        // the clapper: each partial from the nominal up rings this much louder for its first ~0.1 s
  function bellOf(tr) { return BELL.map(function (m, i) { return i === 2 ? [tr || 1.2, m[1], m[2]] : m; }); }   // (its tierce: 1.2 minor, 1.25 major)
  var RING = { glass: 3.4, bowl: 9, bell: 6.5, breath: 2.6, star: 2.4 };   // s: each one's ring
  var WET = { glass: 0.6, bowl: 0.5, bell: 0.55, pluck: 0.42, breath: 0.55, star: 0.8 };
  var LEVEL = { glass: 0.035, bowl: 0.044, bell: 0.042, pluck: 0.07, breath: 0.018, star: 0.07 };
  var LINE = { pluck: 1, breath: 1 };   // the line's notes over the loops'

  /* ---------------- small things ---------------- */

  function stream(s) {   // splitmix32
    s = s >>> 0;
    return function () {
      s = (s + 0x9e3779b9) >>> 0;
      var z = s;
      z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
      z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
      return ((z ^ (z >>> 16)) >>> 0) / 4294967296;
    };
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function mix(a, b, k) { return a + (b - a) * k; }
  function smooth(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function pick(r, a) { return a[Math.floor(r() * a.length) % a.length]; }
  function range(r, a) { return mix(a[0], a[1], r()); }
  function db(x) { return Math.pow(10, x / 20); }
  function num(x) { return typeof x === 'number' && isFinite(x); }

  /* ---------------- the lights, worked out ---------------- */

  function note(L, s) {
    var m = /^([A-G][#b]?)([0-9])(?::([.0-9]+))?$/.exec(s), pc = NAMES[m[1]], o = +m[2] - (pc >= 10 ? 1 : 0);   // (C and C# sit in the D-octave below)
    return { pc: pc, o: o, f: REF * L.ratio[pc] * Math.pow(2, o - 4), key: pc + '.' + o, w: m[3] ? +m[3] : -1 };
  }
  function prep(id) {
    var L = LIGHTS[id], n;
    L.id = id;
    L.ratio = GAMUT.slice();
    for (n in L.ji || {}) L.ratio[NAMES[n]] = L.ji[n];
    L.pcs = L.mode.split(' ').map(function (x) { return NAMES[x]; });
    L.step = L.pcs.slice().sort(function (a, b) { return L.ratio[a] - L.ratio[b]; });
    L.triad = L.tri.split(' ').map(function (x) { return NAMES[x]; });
    L.voicings = L.pads.map(function (p) {
      var v = p.split(' ').map(function (x) { return note(L, x); }), e = 0, i, w;
      for (i = 0; i < v.length; i++) { w = v[i].w >= 0 ? v[i].w : OCT[v[i].o] * ROLE[v[i].pc === L.pcs[0] ? 0 : (v[i].pc === (L.pcs[0] + 7) % 12 ? 1 : 2)]; v[i].a = w; e += w * w; }
      for (i = 0; i < v.length; i++) v[i].a /= Math.sqrt(e / 2.2);   // (every voicing the same power: a turn of the chord is no step in level)
      return v;
    });
    L.pool = L.loops.split(' ').map(function (x) { return note(L, x); });
    L.lineLo = L.line ? note(L, L.line).f : 0;
    L.night = L.night || 0;
  }
  for (var lid in LIGHTS) prep(lid);
  function has(L, pc) { return L.pcs.indexOf(pc) >= 0; }
  function freqOf(L, pc, o) { return REF * L.ratio[pc] * Math.pow(2, o - 4); }

  /* ---------------- the score ---------------- */

  /* score(ctx, out): the score on CTX, into the node OUT; returns { wake, rest, tick } (wake starts its scheduler,
     rest stops it; tick is one step of it, for an offline render). It reads no clock but ctx.currentTime. */
  function score(ctx, out) {
    var SR = ctx.sampleRate, t0 = ctx.currentTime, running = false, timer = 0, ticks = 0;
    var W0 = null;
    try { W0 = self.WORLD && typeof self.WORLD.sky === 'function' ? self.WORLD.sky() : null; } catch (e) { W0 = null; }
    var SEED = W0 && num(W0.seed) ? W0.seed >>> 0 : 1;   // (the world's own stream for the score: its one entropy read)
    var front = stream(SEED);
    function sub() { return stream(front() * 4294967296); }
    var rPad = sub(), rLoop = sub(), rNote = sub(), rMt = sub(), rAir = sub(), rBed = sub(), rEv = sub(), rIr = sub(), rNoise = sub(), rLull = sub();
    function hash(s) { var h = SEED ^ 0x811c9dc5, i; for (i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193); return ((h >>> 0) % 100000) / 100000; }

    function gain(v) { var g = ctx.createGain(); g.gain.value = v; return g; }
    var FLAT = -3.01;   // (a low- or high-pass's Q is in dB in Web Audio: -3.01 dB is maximally flat, no bump)
    function biquad(type, f, q) { var b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
    function panner(p) { var s = ctx.createStereoPanner(); s.pan.value = clamp(p, -1, 1); return s; }
    function follow(param, v, now, tau) { param.setTargetAtTime(v, now, tau || TAU); }
    /* nodes let go once they have rung out: no handler, the tick sweeps them */
    var gc = [];
    function later(t, a, b) { gc.push([t, a, b]); }
    function sweep(now) { gc = gc.filter(function (x) { if (x[0] > now) return true; if (x[1]) x[1].disconnect(); if (x[2]) x[2].disconnect(); return false; }); }

    /* the mix: everything into one sum, the air's return too; then a high-pass (nothing below what a speaker plays),
       a tilt for the light, the trims, and a soft ceiling no note should reach */
    var sum = gain(1), hp = biquad('highpass', 32, FLAT), tilt = biquad('highshelf', 2600, 0), trim = gain(0), level = gain(1), ceil = ctx.createWaveShaper();
    ceil.curve = curve(); ceil.oversample = '2x';   // (oversampled: where it rounds a peak off, no alias folds back)
    sum.connect(hp); hp.connect(tilt); tilt.connect(trim); trim.connect(level); level.connect(ceil); ceil.connect(out);
    function curve() {   // straight to -14 dBFS, then rounding off toward -11.7 (a safety for a rare peak, never the sound)
      var n = 4097, c = new Float32Array(n), i, x, a;
      for (i = 0; i < n; i++) { x = i / (n - 1) * 2 - 1; a = Math.abs(x); c[i] = a < 0.2 ? x : (x < 0 ? -1 : 1) * (0.2 + 0.062 * Math.tanh((a - 0.2) / 0.062)); }
      return c;
    }

    var wetIn = gain(1);
    var padBus = gain(1), padLP = biquad('lowpass', 1800, FLAT), padSend = gain(0.32);
    padBus.connect(padLP); padLP.connect(sum); padLP.connect(padSend); padSend.connect(wetIn);
    var sigBus = gain(1), sigLP = biquad('lowpass', 12000, FLAT);   // the struck notes; the mist closes this
    /* and their de-esser: a dynamic cut at 3.2 kHz (where a phone's speaker is harshest), led by the band itself 8 ms
       ahead of the sound, so a strike's brightest moment is tamed as it happens and the ring keeps its sparkle; its
       resting cut deeper and its threshold 6 dB lower as the light darkens */
    var dsDark = gain(1), dsLead = ctx.createDelay(0.05), dsHP = [biquad('highpass', 2000, FLAT), biquad('highpass', 2000, FLAT)], dsLo = biquad('lowpass', 5000, FLAT), dsSq = ctx.createWaveShaper(), dsEnv = biquad('lowpass', 16, FLAT), dsMap = ctx.createWaveShaper(), deess = biquad('peaking', 3200, 1);
    dsLead.delayTime.value = DS[3]; dsSq.curve = sq(); dsMap.curve = cut(); deess.gain.value = 0;
    sigBus.connect(sigLP); sigLP.connect(dsLead); dsLead.connect(deess); deess.connect(sum);
    sigLP.connect(dsHP[0]); dsHP[0].connect(dsHP[1]); dsHP[1].connect(dsLo); dsLo.connect(dsDark); dsDark.connect(dsSq); dsSq.connect(dsEnv); dsEnv.connect(dsMap); dsMap.connect(deess.gain);   // (the band: 2-5 kHz)
    function sq() { var n = 8193, c = new Float32Array(n), i, x; for (i = 0; i < n; i++) { x = (i / (n - 1) * 2 - 1) * DS[4]; c[i] = x * x; } return c; }   // (the band's power)
    function cut() {   // (power to a cut in dB: none below DS[0], then DS[1]:1 above it, at most DS[2] dB)
      var n = 16385, c = new Float32Array(n), i, u;
      for (i = 0; i < n; i++) { u = i / (n - 1) * 2 - 1; c[i] = u > DS[0] ? -Math.min(DS[2], 10 * Math.log10(u / DS[0]) * (1 - 1 / DS[1])) : 0; }
      return c;
    }
    var sendBus = gain(1), sendLP = biquad('lowpass', 9000, FLAT);   // each note's own share of air
    sendBus.connect(sendLP); sendLP.connect(wetIn);
    var bedBus = gain(1), bedCap = gain(1), bedAir = gain(1), bedSend = gain(0.22);   // the air and the weather; their cap; their breath
    bedBus.connect(bedCap); bedCap.connect(bedAir); bedAir.connect(sum); bedAir.connect(bedSend); bedSend.connect(wetIn);
    /* (the weather never answers the music: nothing here moves with a note) */
    /* the air, listened to, and the held chord beside it: BS.1770's K-weighting (its shelf and its high-pass), each
       channel's power, so the cap knows how loud the air has grown, alone and against the music */
    function ear(from, tau) {
      var h = biquad('highpass', 38.13, -6.02), sh = biquad('highshelf', 1681.97, 0), sp = ctx.createChannelSplitter(2), a = [ctx.createAnalyser(), ctx.createAnalyser()];
      sh.gain.value = 4; from.connect(h); h.connect(sh); sh.connect(sp);
      a.forEach(function (x, i) { x.fftSize = kbuf.length; sp.connect(x, i); });
      return { a: a, ms: 0, tau: tau || 6 };
    }
    function loud(e) { var ms = 0, i, j; for (j = 0; j < 2; j++) { e.a[j].getFloatTimeDomainData(kbuf); for (i = 0; i < kbuf.length; i++) ms += kbuf[i] * kbuf[i]; } e.ms += (ms / kbuf.length - e.ms) * (1 - Math.exp(-TICK / e.tau)); return -0.691 + 10 * Math.log10(Math.max(e.ms, 1e-12)); }
    var kbuf = new Float32Array(8192), earBed = ear(bedBus), earPad = ear(padLP, 20), bedLufs = -99, padLufs = -99, capDb = 0;
    /* the whole, heard (after the trims, before the level): a slow level holds what the trims cannot. It hears ~10 s,
       acts only beyond LEVEL_DB of -26 and by at most LEVEL_MAX, over ~4 s; it holds still through a lull and lets go
       in a hush (the quiet that is meant) */
    var earMix = ear(trim, 10), mixLufs = TARGET, levelDb = 0;
    earMix.ms = Math.pow(10, (TARGET + 0.691) / 10);

    /* the far rock's echoes: two flanks, left and right, darker each time */
    var echoIn = gain(0), d1 = ctx.createDelay(2), d2 = ctx.createDelay(2), efb = gain(0.3), elp = biquad('lowpass', 2200, FLAT), eL = panner(-0.65), eR = panner(0.65);
    d1.delayTime.value = 0.47; d2.delayTime.value = 0.29;
    deess.connect(echoIn); echoIn.connect(d1); d1.connect(elp); elp.connect(d2); d2.connect(efb); efb.connect(d1);
    d1.connect(eL); d2.connect(eR); eL.connect(sum); eR.connect(sum); eL.connect(wetIn);

    /* the air: two rooms, so a change of place crossfades between spaces */
    var rooms = [hall(), hall()], roomNow = -1;
    function hall() { var c = ctx.createConvolver(), g = gain(0); c.connect(g); g.connect(sum); return { c: c, g: g, place: '', fed: false, quiet: 0 }; }

    padBus.gain.value = db(PAD_DB); sigBus.gain.value = db(SIG_DB); sendBus.gain.value = db(SIG_DB); bedBus.gain.value = db(BED_DB);

    /* ---------------- noise, worked out once (seamless loops) ----------------
       The loops are long (the pink 17.1 s: an ear holds a frozen noise for a few seconds, and only with practice for
       10-20); each texture plays them at its own rate from its own point, and that rate wanders by about 1% over a
       minute or two, so even a loop never comes back quite as it was. */

    var pink = null, white = null, irs = {}, jobs = [];
    /* heavy buffers are worked out a second of samples at a time, a stretch a tick, so no task is long */
    function slices(total, fn, done, each) {
      var at = 0;
      function job() { var to = Math.min(total, at + (each || SR)); fn(at, to); at = to; if (at < total) jobs.unshift(job); else done(); }
      jobs.push(job);
    }
    function noise(sec, colour, done) {
      var n = Math.floor(sec * SR), X = Math.floor(0.2 * SR), tmp = [new Float32Array(n + X), new Float32Array(n + X)], st = [[0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0]];
      slices(n + X, function (a, z) {
        for (var ch = 0; ch < 2; ch++) {
          var x = tmp[ch], b = st[ch], i, w;
          for (i = a; i < z; i++) {
            w = rNoise() * 2 - 1;
            if (colour) {   // (a refined pink: -3 dB an octave, seven one-pole sections)
              b[0] = 0.99886 * b[0] + w * 0.0555179; b[1] = 0.99332 * b[1] + w * 0.0750759; b[2] = 0.969 * b[2] + w * 0.153852;
              b[3] = 0.8665 * b[3] + w * 0.3104856; b[4] = 0.55 * b[4] + w * 0.5329522; b[5] = -0.7616 * b[5] - w * 0.016898;
              x[i] = (b[0] + b[1] + b[2] + b[3] + b[4] + b[5] + b[6] + w * 0.5362) * 0.11; b[6] = w * 0.115926;
            } else x[i] = w * 0.5;
          }
        }
      }, function () {
        var buf = ctx.createBuffer(2, n, SR), ch, d, i, g;
        for (ch = 0; ch < 2; ch++) {
          d = buf.getChannelData(ch); d.set(tmp[ch].subarray(0, n));
          for (i = 0; i < X; i++) { g = i / X; d[i] = tmp[ch][i] * Math.sqrt(g) + tmp[ch][n + i] * Math.sqrt(1 - g); }   // (the seam crossfaded)
        }
        done(buf);
      });
    }
    /* a place's air: a synthesised impulse, each channel its own noise; the lows ring longer than the highs, a soft
       onset after the first reflection, a few near reflections (the rock's); as long as the lows' decay, but at most
       ROOM_MAX (where the longest air's tail is already 40 dB down: a convolver prepares its whole impulse at once when
       it is given it, a stall that grows with the impulse's length), its last 0.3 s faded, so no tail is cut off */
    function room(P, done) {
      var len = Math.min(ROOM_MAX, P.room[0]), n = Math.floor(len * SR), pre = Math.floor(P.room[2] * SR), c = 1 - Math.exp(-2 * Math.PI * 1100 / SR);
      var m1 = Math.exp(-6.9078 / (P.room[0] * SR)), m2 = Math.exp(-6.9078 / (P.room[1] * SR)), D = [new Float32Array(n), new Float32Array(n)], st = [[0, 1, 1], [0, 1, 1]];
      slices(n, function (a, z) {
        for (var ch = 0; ch < 2; ch++) {
          var d = D[ch], q = st[ch], i, w;
          for (i = Math.max(a, pre); i < z; i++) {
            w = rIr() * 2 - 1; q[0] += (w - q[0]) * c;
            d[i] = (q[0] * 2.2 * q[1] + (w - q[0]) * 0.55 * q[2]) * Math.min(1, (i - pre) / (0.012 * SR));
            q[1] *= m1; q[2] *= m2;
          }
        }
      }, function () {
        var b = ctx.createBuffer(2, n, SR), ch, j, i, F;
        for (ch = 0; ch < 2; ch++) {
          for (j = 0; j < 7; j++) { i = pre + Math.floor((0.003 + 0.045 * rIr()) * SR); if (i < n) D[ch][i] += (rIr() - 0.35) * P.er; }
          for (j = 0, F = Math.floor(0.3 * SR); j < F; j++) D[ch][n - 1 - j] *= 0.5 - 0.5 * Math.cos(Math.PI * j / F);   // (its end faded, never cut)
          b.getChannelData(ch).set(D[ch]);
        }
        done(b);
      });
    }
    function source(buf, rate, loop) {
      var s = ctx.createBufferSource(); s.buffer = buf; s.loop = loop !== false; s.playbackRate.value = rate || 1;
      s.start(ctx.currentTime, buf.duration * rNoise()); return s;
    }

    /* ---------------- the sky, read ---------------- */

    var H = { a: null, b: null, k: 0, pass: '', place: '', wx: null, va: 0, vb: 0, vk: 1, nextChord: 0 };
    var still = null;   // the light when no sky is drawn
    function weather(L, fogUp) {
      var d = L.wx, out = {};
      out.wind = num(d.wind) ? d.wind : 0.3;
      out.fog = Math.max(d.fog || 0, fogUp || 0);
      out.cover = num(d.cover) ? d.cover : 0.2;
      out.calm = 1 - out.wind;
      return out;
    }
    function read() {
      var c = null, s = {};
      try { c = self.WORLD && typeof self.WORLD.sky === 'function' ? self.WORLD.sky() : null; } catch (e) { c = null; }
      if (c && LIGHTS[c.sky]) {   // the world's sky: the one on show, the next, the change's k, through the mist or not
        s.a = LIGHTS[c.sky];
        s.b = LIGHTS[c.next] || s.a;
        s.k = s.b === s.a ? 0 : clamp(+c.k || 0, 0, 1);
        s.pass = s.b === s.a ? '' : (c.far ? 'cloud' : (s.a.night !== s.b.night ? 'twilight' : 'direct'));
        var w = num(c.w) ? clamp(c.w, 0, 1) : 0.5;   // (the cloud sea's share of the land below: the nearer kit, with a margin either way)
        s.place = w > 0.6 ? 'above' : (w < 0.4 ? 'dunes' : (H.place || 'above'));
      } else {   // no sky drawn: the hour's own, one light
        if (!still) still = { a: LIGHTS[HOURS[document.documentElement.getAttribute('data-sky')] || 'firstlight'], place: rEv() < 0.5 ? 'above' : 'dunes' };
        s.a = s.b = still.a; s.k = 0; s.pass = ''; s.place = still.place;
      }
      return s;
    }
    function darkNow() { return H.a ? mix(H.a.dark, H.b.dark, smooth(H.k)) : 1; }

    /* ---------------- the held chord ---------------- */

    var pad = {}, waves = {};
    function wave(place) {
      if (!waves[place]) {
        var h = PLACES[place].wave, re = new Float32Array(h.length + 1), im = new Float32Array(h.length + 1), i, e = 0;
        for (i = 0; i < h.length; i++) e += h[i] * h[i];
        for (i = 0; i < h.length; i++) im[i + 1] = h[i] / Math.sqrt(e);   // (every place's voice the same power: their loudness differs only by colour)
        waves[place] = ctx.createPeriodicWave(re, im, { disableNormalization: true });
      }
      return waves[place];
    }
    /* a held tone: its voice, and a quieter twin a fraction of a hertz away (each tone its own rate, 0.06-0.2 Hz, so
       the chord shimmers by about 3 dB and never pulses together) */
    function voice(key, f, place, now) {
      var v = { o: [ctx.createOscillator(), ctx.createOscillator()], g: gain(0), f: f, quiet: 0 }, twin = gain(0.36), beat = 0.06 + 0.14 * hash(key + 'd'), i;
      for (i = 0; i < 2; i++) { v.o[i].setPeriodicWave(wave(place)); v.o[i].frequency.value = f; }
      v.o[1].detune.value = 1200 * Math.log(1 + beat / f) / Math.LN2 * (hash(key + 'e') < 0.5 ? 1 : -1);
      v.o[0].connect(v.g); v.o[1].connect(twin); twin.connect(v.g);
      v.o[0].start(now); v.o[1].start(now + 0.04 * hash(key + 'f'));   // (the twin a few cycles late: each beat starts at its own point)
      v.p = panner((hash(key + 'q') * 2 - 1) * PLACES[place].width); v.g.connect(v.p); v.p.connect(padBus);   // (each tone its own place in the field)
      pad[key] = v;
      return v;
    }
    /* a tone's own slow swell (19-47 s, on two incommensurate waves): the chord breathes, never twice alike */
    function swell(key, t) {
      var p = 19 + 28 * hash(key + 'p'), f1 = hash(key + 'a') * 6.283, f2 = hash(key + 'b') * 6.283;
      return 1 - SWELL + SWELL * (0.6 * Math.sin(6.2832 * t / p + f1) + 0.4 * Math.sin(6.2832 * t / (p * 1.618) + f2));
    }
    function near(f, F) {   // (a semitone or so apart, the tones or their 2nd and 3rd harmonics)
      var j, m, n, c;
      for (j = 0; j < F.length; j++) for (m = 1; m < 4; m++) for (n = 1; n < 4; n++) { c = Math.abs(1200 * Math.log(f * m / (F[j] * n)) / Math.LN2); if (c > 50 && c < 175) return true; }
      return false;
    }
    /* the chord to hold now: the light's voicing (turning to the next), and in a change the next light's, the tones
       they share held through it */
    function chord() {
      var A = H.a, B = H.b, k = H.k, T = {}, place = H.place, i, x, w, key;
      function add(tones, wt, other, L) {
        for (i = 0; i < tones.length; i++) {
          x = tones[i];
          var kk = place + ':' + x.key, shared = other && other.some(function (y) { return y.key === x.key; });
          w = shared ? 1 : wt;
          if (!T[kk] || T[kk].w < w) T[kk] = { f: x.f, w: w, pc: x.pc, o: x.o, a: x.a, L: L };
        }
      }
      var VA = A.voicings[H.va], VB = A.voicings[H.vb];
      if (H.vk < 1 && k === 0) {
        add(VA, 1 - smooth(H.vk * 1.25), VB, A);
        add(VB, smooth(H.vk * 1.25 - 0.25), VA, A);
      } else add(VA, 1, null, A);
      if (B !== A && k > 0) {
        var VN = B.voicings[0], leaving = [];
        for (key in T) if (!VN.some(function (y) { return place + ':' + y.key === key; })) { T[key].w *= 1 - smooth((k - 0.05) / 0.5); leaving.push(T[key].f); }
        for (i = 0; i < VN.length; i++) {
          x = VN[i];
          var kn = place + ':' + x.key;
          if (T[kn]) { T[kn].f = T[kn].f * Math.pow(x.f / T[kn].f, smooth(k)); T[kn].a = mix(T[kn].a || 0.5, x.a, smooth(k)); }   // (a shared tone glides by its
                                                                    //  comma, if any, and to its level in the next light)
          else T[kn] = { f: x.f, w: smooth((k - 0.45) / 0.5) * (near(x.f, leaving) ? smooth((k - 0.55) / 0.1) : 1), pc: x.pc, o: x.o, a: x.a, L: B };
        }   // (a tone a semitone or so from one that leaves, or whose overtones are, waits until it has gone: the two never beat)
      }
      var L = k < 0.5 ? A : B, top = null, c0 = L.pcs[0];
      for (key in T) if (T[key].w > 0.01 && T[key].pc === c0 && (!top || T[key].f > top.f)) top = T[key];
      if (top && top.o < 6) {   // (the shimmer: the highest centre an octave up)
        var sk = place + ':s' + top.pc + '.' + (top.o + 1);
        T[sk] = { f: top.f * 2, w: top.w * SHIMMER, pc: top.pc, o: top.o + 1, a: top.a, s: 1 };
      }
      return T;
    }
    var held = { top: 0, f: [], a: [], o: [], oa: [] };   // the held chord's tones now and their levels (the line keeps above and apart), and
                                                        //  their audible partials (each tone, its 2nd and 3rd harmonics): a bell keeps clear of all of them
    function holdChord(now) {
      var T = chord(), key, v, t, c = cloud(H.k), lvl = 0.9 + 0.25 * H.wx.cover, first = smooth((now - t0) / FADE);
      var Wv = PLACES[H.place].wave, fc = Math.max(200, padLP.frequency.value), h, a1, P = 0;
      function lpg(f) { return 1 / Math.sqrt(1 + Math.pow(f / fc, 4)); }
      held.top = 0; held.f = []; held.a = []; held.o = []; held.oa = [];
      for (key in T) {
        if (T[key].w > 0.05) {
          a1 = T[key].w * (T[key].a || 0.5) * (T[key].s ? SHIMMER : 1) * 0.11 / 1.36; held.f.push(T[key].f); held.a.push(a1);
          for (h = 1; h <= 3 && h <= Wv.length; h++) { held.o.push(T[key].f * h); held.oa.push(a1 * Wv[h - 1] / Wv[0] * lpg(T[key].f * h) / lpg(T[key].f)); }
          if (!T[key].s && T[key].f > held.top) held.top = T[key].f;
        }
        if (!T[key].s) P += Math.pow(T[key].w * (T[key].a || 0.5), 2);
      }
      var carry = clamp(Math.sqrt(2.2 / Math.max(P, 1e-6)), 1, 1.6);   // (in a pivot or a turn of the voicing, the tones that stay carry the
      for (key in T) {                                                 //  chord's weight: as loud as a whole voicing, by at most 4 dB)
        t = T[key];
        v = pad[key] || voice(key, t.f, H.place, now);
        var thread = t.pc === 0 || t.pc === 7, a = t.w * (t.a || 0.5) * carry * swell(key, now) * lvl / 1.36 * (thread ? 1 - 0.3 * c : 1 - 0.75 * c) * first;
        follow(v.g.gain, a * 0.11, now, H.k > 0 ? 1.4 : TAU * 2);
        if (Math.abs(t.f / v.f - 1) > 0.0002) { follow(v.o[0].frequency, t.f, now, 3); follow(v.o[1].frequency, t.f, now, 3); v.f = t.f; }
        v.seen = ticks;
      }
      for (key in pad) {
        v = pad[key];
        if (v.seen !== ticks) {
          follow(v.g.gain, 0, now, 1.6);
          if (++v.quiet > 40) { v.o[0].stop(now + 0.1); v.o[1].stop(now + 0.1); later(now + 0.3, v.p); delete pad[key]; }
        } else v.quiet = 0;
      }
    }
    /* a hush through the mist: it swells over the first third, holds, clears over the last half */
    function cloud(k) { return H.pass === 'cloud' ? smooth((k - 0.04) / 0.26) * (1 - smooth((k - 0.5) / 0.32)) : 0; }

    /* ---------------- the struck notes ---------------- */

    var ringing = [], hits = [];
    /* a bell's strong partials are no harmonics of its note: one a semitone or so (50-175 cents) from an audible held
       tone or its 2nd or 3rd harmonic, and not already 12 dB under it, would beat with it, so it is damped to 12 dB
       under that one (a bell tuned to the chord and its overtones) */
    function sour(fr, lv) {
      var k = 1, i, c, h, top = 0;
      for (i = 0; i < held.a.length; i++) if (held.a[i] > top) top = held.a[i];
      for (i = 0; i < held.o.length; i++) {
        if (held.oa[i] < top / 10) continue;
        c = Math.abs(1200 * Math.log(fr / held.o[i]) / Math.LN2); h = held.oa[i] * db(PAD_DB - SIG_DB);   // (the held partial on the struck notes' scale)
        if (c > 50 && c < 175 && lv * k > h / 4) k = h / 4 / lv;
      }
      return k;
    }
    function free(now) { ringing = ringing.filter(function (e) { return e > now; }); return ringing.length < VOICES; }
    /* the light's cap: struck notes in the last minute (loops, the line, motifs), a motif a few over */
    function struck(t) { hits.push(t); }
    function spare(over) { var L = H.k < 0.5 ? H.a : H.b, t = ctx.currentTime; hits = hits.filter(function (x) { return x > t - 60; }); return hits.length < L.cap + (over || 0); }
    function outlet(pan, wet) {
      var p = panner(pan), s = gain(wet * PLACES[H.place].wet);
      p.connect(sigBus); p.connect(s); s.connect(sendBus);
      return { p: p, s: s };
    }
    var phases = [];
    function phased() {   // a sine at one of eight phases (worked out once)
      var k = Math.floor(rNote() * 8), p = k * Math.PI / 4;
      if (!phases[k]) phases[k] = ctx.createPeriodicWave(new Float32Array([0, Math.cos(p)]), new Float32Array([0, Math.sin(p)]), { disableNormalization: true });
      return phases[k];
    }
    function strike(kind, f, t, vel, pan, tr) {
      var table = kind === 'bowl' ? BOWL : (kind === 'bell' ? bellOf(tr) : GLASS), T = RING[kind] * PLACES[H.place].decay * (1 + 0.5 * H.wx.fog * (kind === 'glass' ? 1 : 0.5));
      var glass = kind === 'glass', bell = kind === 'bell', dk = darkNow(), end = t, i, j, fr, T60, o, g, pk, tm;
      var dim = kind === 'bowl' ? Math.max(H.wx.fog, dk) : 0;   // (a bowl in mist or at dusk: struck softer and slower, so it never pops out of a quiet air)
      var att = kind === 'bowl' ? 0.014 + 0.018 * dim : (bell ? 0.004 + 0.003 * dk : 0.006 + 0.005 * dk + 0.012 * H.wx.fog);   // (glass: 6 ms by day, 11 by night, a felt mallet)
      if (dim) vel *= 1 - 0.45 * Math.max(H.wx.fog, 0.55 * dk);
      var dest = outlet(pan, WET[kind]), hard = clamp(vel / LEVEL[kind], 0.3, 1.2) * (1 - 0.45 * dk);   // (the mallet softer as the light goes)
      if (glass && white && dk < 0.5) {   // (in the lighter skies the mallet's click: 5 ms of noise far above the phone's harsh band)
        var ns = ctx.createBufferSource(), nb = biquad('bandpass', clamp(f * 9, 6500, 11000), 1.4), ng = gain(0);
        ns.buffer = white; ns.connect(nb); nb.connect(ng); ng.connect(dest.p);
        ng.gain.setValueAtTime(0, t); ng.gain.linearRampToValueAtTime(vel * 0.2 * hard * (1 - 2 * dk), t + 0.0015); ng.gain.setTargetAtTime(0, t + 0.0015, 0.0016);
        ns.start(t, white.duration * rNote() * 0.9, 0.03);
      }
      for (i = 0; i < table.length; i++) {
        fr = f * table[i][0];
        tm = 1 - mix(TAME[0], TAME[1], dk) * Math.exp(-Math.pow(Math.log(fr / 3200) / Math.LN2, 2) / (2 * TAME[2] * TAME[2]));   // (quieter about 3.2 kHz)
        if (bell && i <= 4) tm *= sour(fr, vel * table[i][1] * tm);   // (a strong partial that would beat with a held tone: damped under it)
        if (kind === 'bowl' && i === 1) tm *= 1 - 0.3 * Math.max(dk, H.wx.fog);   // (a bowl's 2.77 mode, its sustained brightness, softer at dusk and in mist)
        if ((glass && HIT[i] || bell && i >= 4) && fr < 12500) {   // (the strike's own ring at the mode: the glass's high modes, the bell's upper partials)
          var so = ctx.createOscillator(), sg = gain(0), sl = glass ? HIT[i] : BELL_HIT * (0.6 + 0.4 * table[i][2] / 0.7), st = glass ? HIT_T : 0.045;
          so.frequency.value = fr; so.setPeriodicWave(phased());
          sg.gain.setValueAtTime(0, t); sg.gain.linearRampToValueAtTime(vel * sl * hard * tm, t + 0.002 + 0.002 * dk); sg.gain.setTargetAtTime(0, t + 0.002 + 0.002 * dk, st);
          so.connect(sg); sg.connect(dest.p); so.start(t); so.stop(t + 0.004 + st * 9);
        }
        if (fr > 9500 || !table[i][1]) continue;
        T60 = T * table[i][2] * Math.min(1, 700 / fr + 0.4);   // (the higher a mode, the sooner it dies)
        var copies = kind === 'glass' || i > 1 ? 1 : 2, dr = bell ? 0.3 : 0.55;   // (a bowl's and a bell's low modes beat: doublets, the second weaker,
        for (j = 0; j < copies; j++) {                                        //  so the beat warbles 5-11 dB and never cancels)
          o = ctx.createOscillator(); o.frequency.value = fr + (j ? 0.4 + 0.8 * rNote() : 0);
          if (glass && i || bell && i > 4) o.setPeriodicWave(phased());   // (a struck bar's modes, a bell's upper partials, do not start in step)
          g = gain(0); pk = vel * table[i][1] * tm * (copies > 1 ? (j ? dr : 1) / (1 + dr) : 1);
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(pk, t + att); g.gain.setTargetAtTime(0, t + att, T60 / 6.9);
          o.connect(g); g.connect(dest.p); o.start(t); o.stop(t + att + T60);
          if (t + att + T60 > end) end = t + att + T60;
        }
      }
      later(end + 0.2, dest.p, dest.s);
      ringing.push(end);
    }
    /* a plucked string (a delay-line loop worked out in a buffer, since a delay in a loop is held to 128 frames),
       every pluck its own: a fresh excitation built harmonic by harmonic, its brightness by the pluck's strength (two
       poles: a finger, not a pick), a pick's position (a comb at 0.1-0.25 of the string), its mean taken out. In the
       loop: a tuning allpass, a stretched one-zero loss (less up high, so a high string rings and is no plink) and a
       gain a period worked out from the ring wanted, never above unity at DC. Then a small body (three resonances near
       200, 450 and 1100 Hz, soft above 2 kHz) and a DC blocker; rung out to -60 dB (at most 6.5 s), never cut. Worked out
       at 24 kHz (PLUCK_SR; the context resamples it): a string's content is all under 4 kHz, and half the samples halve
       the main thread's work for each pluck (at a phone's 6x slower CPU a pluck at 48 kHz held it 130-145 ms) */
    var PLUCK_SR = Math.min(SR, 24000);
    function string(f, vel) {
      var SR = PLUCK_SR, dk = darkNow(), P = PLACES[H.place], per = SR / f, S = clamp(0.32 * Math.pow(587 / f, 1.5), 0.04, 0.32), w = 2 * Math.PI * f / SR, i;
      var ld = Math.atan2(S * Math.sin(w), (1 - S) + S * Math.cos(w)) / w;   // (the loss's own delay at f)
      var N = Math.floor(per - ld - 0.1), fr = per - ld - N, eta = (1 - fr) / (1 + fr);
      var T60 = P.ks[1] * Math.pow(f / 587, -0.35), H0 = Math.sqrt((1 - S) * (1 - S) + S * S + 2 * S * (1 - S) * Math.cos(w));
      var gp = Math.min(0.99995, Math.pow(10, -3 * per / (SR * T60)) / H0), s0 = (1 - S) * gp, s1 = S * gp;
      var line = new Float32Array(N + 1), ex = new Float32Array(N + 1), lp = 0, mean = 0, pickAt = Math.max(1, Math.round(N * mix(0.1, 0.25, rNote())));
      var cutf = 1 - Math.exp(-2 * Math.PI * Math.min(0.45 * SR, Math.min(3000, Math.max(Math.min(mix(800, 1600, clamp(vel, 0, 1)), Math.max(700, f * 0.85)), f * 1.4)) * (0.6 + 0.5 * P.ks[0]) * (1 - 0.35 * dk)) / SR), lp2 = 0;   // (a softer finger as the light darkens)
      var M = N + 1, rw = new Float32Array(M), K = Math.floor(M / 2), k, ak, pk;
      for (k = 1; k <= K; k++) { ak = (0.6 + 0.8 * rNote()) / Math.sqrt(k); pk = rNote() * 6.2832; for (i = 0; i < M; i++) rw[i] += ak * Math.cos(6.2832 * k * i / M + pk); }   // (each harmonic its own phase,
                                                                                                                                                                         //  its level within 3 dB)
      for (i = 0; i < 3 * M; i++) { lp += (rw[i % M] - lp) * cutf; lp2 += (lp - lp2) * cutf; if (i >= 2 * M) ex[i - 2 * M] = lp2; }   // (filtered round the loop: no seam)
      for (i = 0; i < M; i++) { line[i] = ex[i] - ex[(i - pickAt + M) % M]; mean += line[i]; }
      mean /= N + 1; for (i = 0; i <= N; i++) line[i] -= mean;
      var ON = Math.round(0.006 * SR), max = Math.floor(6.5 * SR), d = new Float32Array(max), idx = 0, x1 = 0, y1 = 0, a, avg, y, peak = 0, env = 0, n = max;
      var body = [peaking(200, 3, 1.2, SR), peaking(450, 2.5, 1.6, SR), peaking(1100, 2, 2, SR)], dc = 0, dcx = 0, warm = 0, wc = 1 - Math.exp(-2 * Math.PI * Math.max(2000, 1.7 * f) * (1 - 0.3 * dk) / SR);
      for (i = 0; i < max; i++) {
        a = line[idx]; avg = s1 * a + s0 * line[(idx + 1) % (N + 1)];   // (the older sample weighs S, the newer 1 - S)
        y = eta * avg + x1 - eta * y1; x1 = avg; y1 = y;
        line[idx] = y; idx = (idx + 1) % (N + 1);
        a = run(body[2], run(body[1], run(body[0], a)));
        dc = a - dcx + 0.995 * dc; dcx = a; a = dc;   // (the DC blocker)
        warm += (a - warm) * wc; a = warm;            // (and the body's own softness above 2 kHz: no glint on a phone)
        d[i] = a * (i < ON ? i / ON : 1);             // (a 6 ms onset: a finger, not a click)
        env = Math.max(Math.abs(a), env * 0.9995); if (env > peak) peak = env;
        if (i > SR * 0.5 && env < peak * 0.001) { n = i + 1; break; }   // (rung out: -60 dB)
      }
      var F = Math.min(n, Math.floor(0.4 * SR)), b = ctx.createBuffer(1, n, SR), o = b.getChannelData(0), e = 0, Q = Math.min(n, Math.floor(0.25 * SR));
      for (i = 0; i < F; i++) d[n - 1 - i] *= 0.5 - 0.5 * Math.cos(Math.PI * i / F);
      for (i = 0; i < Q; i++) e += d[i] * d[i];
      e = 0.25 / Math.sqrt(e / Q + 1e-12); for (i = 0; i < n; i++) d[i] *= e;   // (every string as loud in its first quarter second)
      o.set(d.subarray(0, n));
      return b;
    }
    function peaking(fc, gdb, q, SR) {   // (the standard peaking biquad, run by hand on a buffer at rate SR)
      var A = Math.pow(10, gdb / 40), w = 2 * Math.PI * fc / SR, al = Math.sin(w) / (2 * q), cs = Math.cos(w), a0 = 1 + al / A;
      return { b0: (1 + al * A) / a0, b1: -2 * cs / a0, b2: (1 - al * A) / a0, a1: -2 * cs / a0, a2: (1 - al / A) / a0, x1: 0, x2: 0, y1: 0, y2: 0 };
    }
    function run(q, x) { var y = q.b0 * x + q.b1 * q.x1 + q.b2 * q.x2 - q.a1 * q.y1 - q.a2 * q.y2; q.x2 = q.x1; q.x1 = x; q.y2 = q.y1; q.y1 = y; return y; }
    function pluck(f, t, vel, pan) {
      var s = ctx.createBufferSource(), g = gain(vel * 0.9), dest = outlet(pan, WET.pluck);
      s.buffer = string(f, vel / (LEVEL.pluck * LINE.pluck)); s.playbackRate.value = Math.pow(2, mix(-3, 3, rNote()) / 1200);   // (each pluck a hair apart in tune)
      s.connect(g); g.connect(dest.p); s.start(t);
      later(t + s.buffer.duration + 0.2, dest.p, dest.s);
      ringing.push(t + Math.min(3.2, s.buffer.duration));
    }
    /* a breathed tone, held: a triangle and its octave through a low-pass, dark at the attack and opening as the tone
       speaks, a slow swell to its level, held while the note is held, released over ~1.5 s; breath under the whole
       note (noise about its octave, -20 dB) and a low puff at its start; its pitch drifting a few cents, a light
       vibrato from 0.4 s */
    function breath(f, t, vel, pan, hold) {
      hold = hold || mix(1.2, 2.2, rNote());
      var dest = outlet(pan, WET.breath), o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = gain(0), lp = biquad('lowpass', f * 1.2, FLAT), g2 = gain(0), end = t + hold + 1.7;
      var vib = ctx.createOscillator(), vd = gain(0), drift = mix(-3, 3, rNote()), i;
      o.type = 'triangle'; o.frequency.value = f; o2.frequency.value = f * 2.001;
      o.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(dest.p);
      for (i = 0; i < 2; i++) { var dt = (i ? o2 : o).detune; dt.setValueAtTime(drift, t); dt.linearRampToValueAtTime(drift + mix(-3, 3, rNote()), end); }
      vib.frequency.value = mix(4.4, 5.4, rNote()); vib.connect(vd); vd.connect(o.detune); vd.connect(o2.detune);
      vd.gain.setValueAtTime(0, t); vd.gain.setValueAtTime(0, t + 0.4); vd.gain.linearRampToValueAtTime(mix(3, 5, rNote()), t + 1.2);
      lp.frequency.setValueAtTime(f * 1.2, t); lp.frequency.setTargetAtTime(f * 4, t + 0.12, 0.3);
      g2.gain.setValueAtTime(0.03, t); g2.gain.setTargetAtTime(0.65, t + 0.15, 0.25);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * 0.7, t + 0.4); g.gain.setTargetAtTime(vel * 0.55, t + 0.4, 0.5);
      g.gain.setValueAtTime(vel * 0.55, t + hold); g.gain.setTargetAtTime(0, t + hold, 0.33);
      o.start(t); o2.start(t); vib.start(t); o.stop(end); o2.stop(end); vib.stop(end);
      if (pink) {
        var n = source(pink, 1, true), bp = biquad('bandpass', f * 1.05, 1.6), ng = gain(0), n2 = source(pink, 1.01, true), bp2 = biquad('bandpass', f * 2, 2.2), ng2 = gain(0);
        ng.gain.setValueAtTime(0, t); ng.gain.linearRampToValueAtTime(vel * 0.3, t + 0.05); ng.gain.setTargetAtTime(0, t + 0.08, 0.1);   // (the puff)
        ng2.gain.setValueAtTime(0, t); ng2.gain.linearRampToValueAtTime(vel * 0.08, t + 0.4); ng2.gain.setValueAtTime(vel * 0.08, t + hold); ng2.gain.setTargetAtTime(0, t + hold, 0.3);   // (the breath)
        n.connect(bp); bp.connect(ng); ng.connect(dest.p); n.stop(t + 1); n2.connect(bp2); bp2.connect(ng2); ng2.connect(dest.p); n2.stop(end);
      }
      later(end + 0.2, dest.p, dest.s);
      ringing.push(t + hold + 0.6);
    }
    /* a far star: a high, bell-like FM tone (an inharmonic 3.5 ratio), gone in two seconds; its glint eased in over
       7 ms (a 3 ms onset put its first sidebands' click in the band a phone makes harsh) */
    function star(f, t, vel, pan) {
      var dest = outlet(pan, WET.star), c = ctx.createOscillator(), m = ctx.createOscillator(), mg = gain(0), g = gain(0), T = RING.star;
      c.frequency.value = f; m.frequency.value = f * 3.5;
      mg.gain.setValueAtTime(f * 1.1 * (1 - 0.55 * darkNow()), t); mg.gain.setTargetAtTime(0, t, 0.09);   // (its index lower at night: a softer glint)
      m.connect(mg); mg.connect(c.frequency); c.connect(g); g.connect(dest.p);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel * 0.55, t + 0.007); g.gain.setTargetAtTime(0, t + 0.007, T / 6.9);
      c.start(t); m.start(t); c.stop(t + T + 0.1); m.stop(t + T + 0.1);
      later(t + T + 0.3, dest.p, dest.s);
      ringing.push(t + T);
    }
    /* no flams: two struck notes that do not belong together never land within GAP_MIN of each other; the later waits
       0.2-0.5 s (a figure's own notes, and the line's dyad, keep their timing) */
    var onsets = [], gid = 0;
    function apart(t, g) {
      var now = ctx.currentTime, n, moved = false, close = function (o) { return (moved || o[1] !== g) && Math.abs(o[0] - t) < GAP_MIN; };
      onsets = onsets.filter(function (o) { return o[0] > now - 1; });
      for (n = 0; n < 6 && onsets.some(close); n++) { t += mix(0.2, 0.5, rNote()); moved = true; }
      return t;
    }
    function onset(t, g) { onsets.push([t, g]); }
    var lastOn = -1e9;   // (a struck note after 5 s of none comes in softer, -2 dB: out of the quiet a note need not be loud to be heard)
    function play(kind, f, t, vel, pan, tr, hold) {
      if (/glass|bowl|bell/.test(kind) && t - lastOn > 5) vel *= 0.8;
      if (kind === 'bell' && sour(f, vel * BELL[1][1]) < 1) kind = 'glass';   // (a bell whose note itself would beat with a held tone: glass)
      if (t > lastOn) lastOn = t;
      if (kind === 'pluck') pluck(f, t, vel, pan);
      else if (kind === 'breath') breath(f, t, vel, pan, hold);
      else if (kind === 'star') star(f, t, vel, pan);
      else strike(kind, f, t, vel, pan, tr);
    }

    /* ---------------- the loops, the line, the motifs ---------------- */

    var loops = LOOP_P.map(function (P, i) {
      return { P: P * mix(0.97, 1.03, rLoop()), at: t0 + ENTER + rLoop() * P, vel: mix(0.7, 1, rLoop()), pan: (i % 2 ? 1 : -1) * mix(0.15, 0.6, rLoop()) };
    });
    var line = { at: t0 + mix(16, 24, rMt()), left: 0, m: 0, L: null, first: true, prev: [], tries: 0, wait: 0 };
    var queue = [];   // motifs' notes, played as their time comes
    var lull = { at: t0 + range(rLull, LULL), end: 0 };

    /* how much sounds now: the light's rate, a lull, a long listen's thinning, the press's entry */
    function density(now) {
      var d = 1, age = now - t0;
      if (cloud(H.k) > 0.2) lull.at = Math.max(lull.at + TICK, now + 40);   // (a hush is a lull: the next waits out its length, and 40 s after it)
      if (now > lull.at) { lull.end = now + range(rLull, LULL_T); lull.at = lull.end + range(rLull, LULL); }
      if (now < lull.end) return 0;
      d *= 1 - 0.3 * smooth((age - THIN) / THIN);
      d *= 0.86 + 0.14 * Math.sin(age / 67 + 6.283 * hash('w'));   // (a slow weather of density)
      return d;
    }
    /* in a change, only the notes the two lights share (the pivot); the centre turns at its middle */
    function usable(pc) {
      var k = H.k;
      if (H.a === H.b || k <= 0.2 || k >= 0.8) return true;
      return has(H.a, pc) && has(H.b, pc) && cloud(k) < 0.3;
    }
    function loopsTick(now, until, dens) {
      var L = H.k < 0.5 ? H.a : H.b, n = L.pool.length, i, lp, x, per = 0, p;
      for (i = 0; i < n; i++) per += 60 / (loops[i].P * L.slow);
      p = clamp(L.rate * (L.mt ? 0.62 : 1) * dens / per * (now - t0 < 70 ? 1.15 : 1), 0, 0.9);   // (the first minute a little fuller)
      for (i = 0; i < n; i++) {
        lp = loops[i];
        while (lp.at < until) {
          if (lp.at >= now - 0.05 && rLoop() < p) {
            x = L.pool[i];
            var lg = ++gid, at = apart(lp.at, lg);
            if (usable(x.pc) && free(at) && spare(0)) {
              var kind = L.inst2 && (L.alt ? L.alt.indexOf(i) >= 0 : i % 2) ? L.inst2 : L.inst;
              if (kind === 'bell' && !tierce(L, x.pc)) kind = 'glass';
              play(kind, freqOf(L, x.pc, x.o), at, LEVEL[kind] * lp.vel * mix(0.7, 1, rNote()), lp.pan + mix(-0.15, 0.15, rNote()), tierce(L, x.pc));
              struck(at); onset(at, lg);
            }
          }
          lp.at += lp.P * L.slow;
        }
      }
    }
    /* a bell sounds a third above its note (its tierce): a minor third where that is in the mode, else a major third,
       else no bell: glass */
    function tierce(L, pc) { return has(L, (pc + 3) % 12) ? 1.2 : (has(L, (pc + 4) % 12) ? 1.25 : 0); }
    function pcOf(f) { return ((Math.round(12 * Math.log(f / REF) / Math.LN2) % 12) + 12) % 12; }
    /* the line's register: from the light's line note (A4-C5) up about an octave and a fourth, the mode's notes (under
       the band a phone's speaker makes harsh, and where the struck notes sing) */
    function lineScale(L) { var lo = L.lineLo * 0.99; return tones(L, lo, lo * 2.3); }
    function home(S, m, c) { var best = m, d = 99, i; for (i = 0; i < S.length; i++) if (pcOf(S[i]) === c && Math.abs(i - m) < d) { d = Math.abs(i - m); best = i; } return best; }
    function unison(f) {   // (on a held tone itself, or a semitone or so beside an audible held partial, which the note would beat with as it rang)
      var i, c, top = 0;
      for (i = 0; i < held.f.length; i++) if (Math.abs(f / held.f[i] - 1) < 0.012) return true;
      for (i = 0; i < held.a.length; i++) if (held.a[i] > top) top = held.a[i];
      for (i = 0; i < held.o.length; i++) { if (held.oa[i] < top / 10) continue; c = Math.abs(1200 * Math.log(f / held.o[i]) / Math.LN2); if (c > 50 && c < 175) return true; }
      return false;
    }
    function bounce(m, step, n) { m += step; if (m < 0) m = -m; if (m > n - 1) m = 2 * (n - 1) - m; return clamp(m, 0, n - 1); }   // (reflected at the edges)
    /* the line: a melody walks the mode by step, setting out from the light's centre and coming home to it (a phrase
       of 4-7 notes, its last the centre); it never lands on a held tone itself, nor a semitone or so beside an audible
       held tone or overtone, and never strikes one pitch three times running; a change brings a phrase home at once,
       and none sets out in one. Each of its notes is answered by the light's chord's nearest tone below it, within an
       octave: consonance is the point */
    function lineTick(now, until, dens) {
      var L = H.k < 0.5 ? H.a : H.b, S, f, pc, tf, j, q, c, last, cad, ok, passing = H.k > 0 && H.a !== H.b;
      if (!L.mt || dens <= 0) { if (line.at < until) line.at = until + 2; return; }
      if (line.at < now - 0.05) line.at = now + mix(1, 3, rMt());   // (late, after a stall: the line picks up, never a pile of overdue notes)
      while (line.at < until) {
        S = lineScale(L); c = L.pcs[0];
        if (line.L !== L) { line.L = L; if (line.left !== 1) line.left = 0; }   // (a new light: a phrase under way ends)
        if (passing && line.left > 1) line.left = 1;   // (a change begins: the phrase comes home now, never cut off mid-air)
        if (line.left <= 0) {
          if (passing) { line.at += mix(6, 12, rMt()); continue; }   // (no phrase sets out in a change)
          if (line.first || rMt() < 0.8 * dens) {
            line.first = false; line.left = 4 + Math.floor(rMt() * 4); line.m = home(S, Math.floor(rMt() * S.length), c); line.prev = []; line.tries = 0; line.wait = 0;
          } else { line.at += mix(8, 20, rMt()); continue; }
        } else if (line.wait) line.wait = 0;
        else {
          last = line.m;
          line.m = bounce(line.m, pick(rMt, [-2, -1, -1, 1, 1, 2]), S.length);
          if (line.left === 1) line.m = home(S, line.m, c);   // (and comes home: its last note the light's centre)
          else {
            for (j = 0; j < 3 && unison(S[line.m]); j++) line.m = bounce(line.m, line.m > last ? 1 : -1, S.length);
            for (j = 1; j < S.length && unison(S[line.m]); j++) {   // (still on or beside a held tone: the nearest clear step, below first)
              if (line.m - j >= 0 && !unison(S[line.m - j])) line.m -= j;
              else if (line.m + j < S.length && !unison(S[line.m + j])) line.m += j;
            }
            if (line.left === 2 && pcOf(S[line.m]) === c) line.m = bounce(line.m, line.m > 0 ? -1 : 1, S.length);   // (the step before home is not home)
          }
          if (line.prev.length > 1 && S[line.m] === line.prev[line.prev.length - 1] && S[line.m] === line.prev[line.prev.length - 2]) {   // (not three times running)
            for (var u = 0, alt = [1, -1, 2, -2, 3, -3, 4, -4], to; u < 8; u++) { to = bounce(line.m, alt[u], S.length); if (S[to] !== S[line.m] && !unison(S[to])) break; }
            line.m = u < 8 ? to : bounce(line.m, 1, S.length);
          }
        }
        f = S[line.m]; pc = pcOf(f); cad = line.left === 1;
        var mg = ++gid; line.at = apart(line.at, mg);
        ok = usable(pc) && free(line.at) && spare(cad ? 3 : 0);   // (the coming home may go over the cap, as a motif may)
        if (!ok && line.tries < (cad || !line.prev.length ? 8 : 3)) { line.tries++; if (cad || !line.prev.length) line.wait = 1; else if (last !== undefined) line.m = last; line.at += mix(1, 2.5, rMt()); continue; }   // (a note that cannot sound now waits a moment)
        if (ok) {
          var vel = LEVEL[L.mt] * LINE[L.mt] * mix(0.75, 1, rMt()), pan = mix(-0.35, 0.35, rMt()), hold = mix(1.4, 2.6, rMt());
          play(L.mt, f, line.at, vel, pan, 0, hold);
          for (tf = 0, j = 0; j < L.triad.length; j++) for (q = 2; q <= 7; q++) {
            var tc = freqOf(L, L.triad[j], q); if (tc < f * 0.97 && tc > f * 0.49 && tc > tf && usable(L.triad[j])) tf = tc;
          }
          var tT = tf ? line.at + mix(0.04, 0.09, rMt()) : 0;
          if (tf) play(L.mt, tf, tT, vel * 0.5, -pan, 0, hold);
          struck(line.at); onset(line.at, mg); if (tf) onset(tT, mg); line.prev.push(f); line.tries = 0;
        }
        line.left--;
        line.at += mix(4.5, 9, rMt()) * (rMt() < 0.15 ? 1.5 : 1) + (line.left <= 0 ? mix(18, 45, rMt()) : 0);
      }
    }
    /* the motifs: each event's own figure, in the light's notes */
    function tones(L, lo, hi) {
      var o, i, r = [];
      for (o = 2; o < 8; o++) for (i = 0; i < L.step.length; i++) { var f = freqOf(L, L.step[i], o); if (f >= lo && f <= hi) r.push(f); }
      return r;
    }
    function motif(kind, now) {
      var L = H.k < 0.5 ? H.a : H.b, t = now + 0.6, T = tones(L, 440, 2400), i, f, inst = L.inst, mg = ++gid, u = 0;
      function add(dt, k, fq, v, p) { queue.push({ t: t + dt, k: k, f: fq, v: v, p: p, g: mg }); }
      function after(a, b) { var x = u; u += mix(a, b, rEv()); return x; }   // (a figure's steps, each its own length: never two notes at once)
      var A = freqOf(L, 7, 5), D = freqOf(L, 0, 5);
      if (kind === 'ignition') { for (i = 0; i < 6; i++) add(after(1.4, 2), 'glass', T[T.length - 1 - i * 2] || T[0], 0.8 - i * 0.08, 0.5 - i * 0.18); }   // (first light down the crowns)
      else if (kind === 'murmuration') { for (i = 0; i < 26; i++) add(mix(0, 18, Math.sin(i / 26 * Math.PI / 2)), i % 3 ? 'glass' : 'pluck', pick(rEv, T), 0.32 + 0.3 * Math.sin(i / 26 * Math.PI), mix(-0.8, 0.8, rEv())); }
      else if (kind === 'moonrise') { add(0, 'bell', D / 2, 0.6, -0.2); add(3.2, 'bell', A / 2, 0.6, 0.2); add(9, 'glass', D, 0.45, -0.1); add(12, 'glass', A, 0.45, 0.1); }
      else if (kind === 'mooncross') { add(0, 'glass', A, 0.55, -0.3); add(2.8, 'glass', pick(rEv, T), 0.45, 0.3); }
      else if (kind === 'aurora') { aurora(now, L); }
      else if (kind === 'star' || kind === 'nlc') { add(0, 'star', pick(rEv, tones(L, 1150, STAR_HI)), 0.55, mix(-0.6, 0.6, rEv())); if (rEv() < 0.5) add(mix(6, 12, rEv()), 'star', pick(rEv, tones(L, 1150, STAR_HI)), 0.4, mix(-0.6, 0.6, rEv())); }
      else if (kind === 'thread') { add(0, 'glass', D, 0.42, -0.25); add(0.9, 'glass', A, 0.36, 0.25); }
      else { for (i = 0; i < 3; i++) add(i * 1.8, inst, pick(rEv, T), 0.5, mix(-0.5, 0.5, rEv())); }
    }
    /* the aurora: high tones swelling slowly, each drifting a little in pitch and across the sky, then gone */
    function aurora(now, L) {
      var T = tones(L, 600, 1800), i, t = now + 0.5;
      for (i = 0; i < 3; i++) {
        var f = pick(rEv, T), o = ctx.createOscillator(), g = gain(0), p = panner(mix(-0.6, 0.6, rEv())), s = gain(0.7);
        o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * Math.pow(2, (rEv() - 0.5) * 12 / 1200), t + 26);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.012, t + 9 + i * 2); g.gain.linearRampToValueAtTime(0.012, t + 16); g.gain.linearRampToValueAtTime(0, t + 28);
        p.pan.setValueAtTime(p.pan.value, t); p.pan.linearRampToValueAtTime(-p.pan.value, t + 28);
        o.connect(g); g.connect(p); p.connect(sigBus); p.connect(s); s.connect(sendBus); o.start(t); o.stop(t + 28.2);
        later(t + 28.5, p, s);
      }
    }
    function queueTick(now, until) {
      var rest = [], q, i;
      for (i = 0; i < queue.length; i++) {
        q = queue[i];
        if (q.t >= until) { rest.push(q); continue; }
        var QL = H.k < 0.5 ? H.a : H.b, tr = tierce(QL, pcOf(q.f)), kind = q.k === 'bell' && !tr ? 'glass' : q.k;   // (a bell only where its tierce is in the mode)
        if (q.t < now - 0.1) continue;
        var qt = apart(Math.max(q.t, now), q.g);
        if (usable(pcOf(q.f)) && free(qt) && spare(3)) { play(kind, q.f, qt, LEVEL[kind] * q.v, q.p, tr); struck(qt); onset(qt, q.g); }   // (in a pivot, common tones only)
      }
      queue = rest;
    }
    /* the light's own events, about one hold in two, never in a change or a lull */
    var own = { at: t0 + mix(30, 55, rEv()), ok: rEv() < 0.5 };
    function eventsTick(now) {
      if (now <= own.at) return;
      if (own.ok && !(H.k > 0 && H.a !== H.b) && !(now < lull.end)) motif(pick(rEv, H.a.ev), now);
      own.at = now + mix(70, 100, rEv()); own.ok = rEv() < 0.45;
    }

    /* ---------------- the air, the place ---------------- */

    var bed = {};
    function chain(name, buf, rate, build) {   // a noise source through its filters, made once it is first wanted
      if (!bed[name] && buf) { var s = source(buf, rate), c = build(), g = gain(0), i; s.connect(c[0]); c[c.length - 1].connect(g); g.connect(bedBus); for (i = 0; i < c.length - 1; i++) c[i].connect(c[i + 1]); bed[name] = { s: s, f: c, g: g, rate: rate }; }
      return bed[name];
    }
    var gust = 0, gustTo = 0, gustAt = 0;
    function airTick(now) {
      if (!pink) return;
      var P = PLACES[H.place], Wx = H.wx, c = cloud(H.k), age = now - t0, base, speed, a, f, n;
      for (n in bed) if (bed[n] && bed[n].rate) follow(bed[n].s.playbackRate, bed[n].rate * (1 + 0.012 * Math.sin(age / (8 + 9 * hash(n + 'r')) + 6.283 * hash(n))), now, 3);   // (each loop's rate wanders)
      if (now > gustAt) { gustTo = rAir() * (0.25 + 0.75 * Wx.wind); gustAt = now + mix(4, 10, rAir()); }
      gust += (gustTo - gust) * 0.045;   // (a gust builds over ~5 s)
      base = 0.5 + 0.5 * Math.sin(age * 6.2832 * 0.045 + hash('wind') * 6.283);
      speed = clamp(0.15 + 0.45 * Wx.wind + 0.25 * base + 0.5 * gust - 0.2 * (1 - Wx.calm), 0, 1);
      a = chain('air', pink, 1, function () { return [biquad('bandpass', 700, 0.75)]; });
      follow(a.f[0].frequency, P.airF[0] * (0.6 + speed), now, 0.5); follow(a.f[0].Q, P.airF[1], now, 2);
      follow(a.g.gain, 0.66 * P.air * (0.45 + 0.55 * speed * speed) * (1 + 0.6 * c), now, 1.2);
      a = chain('thin', pink, 1.07, function () { return [biquad('highpass', 2600, FLAT), biquad('lowpass', 9000, FLAT)]; });   // (and its hiss, high and faint: thin air)
      follow(a.g.gain, 0.04 * P.air * (0.5 + 0.5 * speed) * (1 - 0.5 * c), now, 1.5);
      f = freqOf(H.a, 7, H.place === 'above' ? 6 : 5);   // the whistle sings the thread's A
      a = chain('whistle', white, 0.97, function () { return [biquad('bandpass', f, 42)]; });
      if (a) { follow(a.f[0].frequency, f, now, 2); follow(a.g.gain, 0.6 * P.whistle * Math.pow(Math.max(0, speed - 0.5), 2) * 4 * (1 - c), now, 1.2); }
      a = chain('sand', pink, 1.04, function () { return [biquad('highpass', 3000, FLAT), biquad('lowpass', 8000, FLAT)]; });   // the dunes' sand, lifted by the wind
      follow(a.g.gain, P.bed === 'sand' ? 0.05 * Math.pow(speed, 1.5) * (1 - 0.5 * c) : 0, now, 2);
      var h = 0.03 * Wx.fog + 0.06 * c;   // the mist's and the hush's own air
      if (h > 0.0005 || bed.hush) { a = chain('hush', pink, 0.91, function () { return [biquad('highpass', 2500, FLAT), biquad('lowpass', 9000, FLAT)]; }); follow(a.g.gain, h, now, 2.5); }
      follow(sigLP.frequency, 12000 * (1 - 0.68 * Wx.fog) * (1 - 0.6 * c) * (1 - 0.45 * darkNow()), now, 2);
      follow(deess.gain, mix(DS_REST[0], DS_REST[1], darkNow()), now, 2); follow(dsDark.gain, 1 + darkNow(), now, 2);
      follow(sendLP.frequency, 9000 * (1 - 0.4 * Wx.fog), now, 2);
    }
    function roomTick(now) {
      var P = PLACES[H.place], i, r;
      if (rooms[roomNow] && rooms[roomNow].place === H.place) {
        follow(rooms[roomNow].g.gain, P.wet * (1 + 0.5 * H.wx.fog + 0.4 * cloud(H.k)), now, 2);
        for (i = 0; i < 2; i++) if (i !== roomNow && rooms[i].fed) { follow(rooms[i].g.gain, 0, now, 2.5); if (rooms[i].quiet++ > 40) { wetIn.disconnect(rooms[i].c); rooms[i].fed = false; } }
        return;
      }
      if (!irs[H.place]) { if (!irs['_' + H.place]) { var at = H.place; irs['_' + at] = 1; room(P, function (b) { irs[at] = b; }); } return; }
      i = roomNow < 0 ? 0 : 1 - roomNow; r = rooms[i];
      if (r.fed) wetIn.disconnect(r.c);
      r.c = ctx.createConvolver(); r.c.connect(r.g); r.c.buffer = irs[H.place];   // (a fresh convolver: some engines refuse a second buffer)
      wetIn.connect(r.c); r.fed = true; r.quiet = 0; r.place = H.place;
      r.g.gain.setValueAtTime(0, now);
      roomNow = i;
    }

    /* ---------------- the tick ---------------- */

    var marked = false, entered = false, lastNow = -1;
    function tick() {
      if (ticks && ctx.currentTime === lastNow) return;   // (a clock that does not move: nothing is scheduled against it, so nothing piles up)
      lastNow = ctx.currentTime;
      var now = ctx.currentTime, until = now + AHEAD, S = read(), i, dens;
      ticks++;
      sweep(now);
      if (ticks === 2) { noise(17.1, 1, function (b) { pink = b; }); noise(3.1, 0, function (b) { white = b; }); }   // (after the first room: the chord's air first)
      for (i = 0; i < 2 && jobs.length; i++) jobs.shift()();   // (heavy buffers a second of samples at a time: no long task)
      if (!H.a) { H.a = S.a; H.b = S.b; H.va = 0; H.vb = 0; H.vk = 1; H.nextChord = now + range(rPad, CHORD_T); }
      if (S.a !== H.a) { H.va = 0; H.vb = 0; H.vk = 1; H.nextChord = now + range(rPad, CHORD_T); }   // (a new light: its first voicing, as the change ended on)
      if (S.a === H.a && S.b !== H.b && S.k > 0 && H.vk < 1) { H.va = H.vb; H.vk = 1; }
      H.a = S.a; H.b = S.b; H.k = S.k; H.pass = S.pass;
      H.wx = weather(H.k < 0.5 ? H.a : H.b, 0.8 * cloud(H.k));   // (through the mist, the mist's own veil)
      if (S.place !== H.place && (!H.place || H.pass !== 'cloud' || cloud(H.k) > 0.6 || H.k > 0.5)) H.place = S.place;   // (through the mist, the new place inside the hush)
      if (H.k === 0 && now > H.nextChord && H.vk >= 1 && H.a.voicings.length > 1) { H.vb = (H.va + 1) % H.a.voicings.length; H.vk = 0; H.nextChord = now + range(rPad, CHORD_T); }
      if (H.vk < 1) { H.vk = Math.min(1, H.vk + TICK / CHORD_X); if (H.vk >= 1) H.va = H.vb; }
      var L = H.k < 0.5 ? H.a : H.b;
      holdChord(now);
      roomTick(now);
      airTick(now);
      var d0 = density(now);
      dens = d0 * (now < t0 + ENTER ? 0 : 0.75 + 0.25 * smooth((now - t0 - ENTER) / 25));
      if (!entered && now + AHEAD > t0 + ENTER && d0 > 0) {   // (the first struck note: the light's own, a breath after the chord)
        entered = true;
        var E = L.pool[0], ek = L.inst === 'bell' && !tierce(L, E.pc) ? 'glass' : L.inst;
        play(ek, freqOf(L, E.pc, E.o), t0 + ENTER, LEVEL[ek] * 0.65, -0.2, tierce(L, E.pc)); struck(t0 + ENTER); onset(t0 + ENTER, ++gid);
      }
      if (H.pass === 'twilight' && H.k > 0.48 && !marked) { marked = true; motif('thread', now); }   // (into or out of the night: the thread struck once)
      if (H.k === 0) marked = false;
      var trimDb = GAIN + mix(TRIM[H.a.id], TRIM[H.b.id], smooth(H.k)) + TRIM_P[H.place];
      follow(trim.gain, db(trimDb), now, 1.5);
      bedLufs = loud(earBed) + trimDb; padLufs = loud(earPad) + trimDb;   // (the air's cap: as heard, after the trims)
      capDb = clamp(Math.min(BED_MAX - bedLufs, padLufs + BED_UNDER + 8 * cloud(H.k) - bedLufs), -12, 0);   //  and under the held chord, but in a hush
      follow(bedCap.gain, db(capDb), now, 2);
      if (cloud(H.k) >= 0.05) { levelDb = 0; follow(level.gain, 1, now, 6); }   // (a hush is the sky's: the level lets go)
      else if (now > t0 + ENTER + 4 && !(now < lull.end)) {   // (the slow level: see earMix)
        earMix.tau = now - t0 < 60 ? 5 : 10;   // (it finds its feet in the first minute)
        mixLufs = loud(earMix);
        var dev = mixLufs - TARGET;
        levelDb = clamp(dev > LEVEL_DB ? LEVEL_DB - dev : (dev < -LEVEL_DB ? -LEVEL_DB - dev : 0), -LEVEL_MAX, LEVEL_MAX);
        follow(level.gain, db(levelDb), now, 4);
      }
      follow(tilt.gain, mix(H.a.tilt, H.b.tilt, smooth(H.k)) - 1.2 * H.wx.fog, now, 2);
      follow(padLP.frequency, mix(H.a.lp, H.b.lp, smooth(H.k)) * PLACES[H.place].lp * (1 - 0.35 * H.wx.fog) * (1 - 0.15 * H.wx.cover) * (1 + 0.18 * Math.sin((now - t0) / 7.3)), now, 2);
      follow(echoIn.gain, PLACES[H.place].echo, now, 2);
      var age = now - t0, br = mix(H.a.br, H.b.br, smooth(H.k)) * PLACES[H.place].br;   // (the chord and the air breathe, each on two slow waves of its own)
      follow(padBus.gain, db(PAD_DB + br * BREATH[0] * (0.6 * Math.sin(age / 5.1 + 6.283 * hash('b1')) + 0.4 * Math.sin(age / 11.9 + 6.283 * hash('b2')))), now, 2);
      follow(bedAir.gain, db(br * BREATH[1] * (0.6 * Math.sin(age / 6.2 + 6.283 * hash('b3')) + 0.4 * Math.sin(age / 13.9 + 6.283 * hash('b4')))), now, 2);
      if (dens > 0 && cloud(H.k) < 0.5) {
        loopsTick(now, until, dens);
        lineTick(now, until, dens);
      } else {
        for (i = 0; i < loops.length; i++) while (loops[i].at < until) loops[i].at += loops[i].P * L.slow;
        if (line.at < until) line.at = until + 2;
      }
      queueTick(now, until);
      eventsTick(now);
    }
    function loop() { if (!running) return; tick(); timer = setTimeout(loop, TICK * 1000); }

    return {
      tick: tick,
      wake: function () { if (!running) { running = true; loop(); } },
      rest: function () { running = false; clearTimeout(timer); },
      level: function () { return { mix: mixLufs, level: levelDb, cap: capDb, light: H.a && H.a.id, place: H.place }; }
    };
  }

  if (self.SOUND && typeof self.SOUND.score === 'function') self.SOUND.score(score);
})();
