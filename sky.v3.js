/* The sky — light and cloud behind the page.

   The owner's brief, paraphrased: the background a luminous sky above a
   sea of cloud, as close as it can be made to the light and clouds of a
   world they love, with no shortcuts; every time of day, the visit opening
   on the visitor's own hour; the whole sky, behind the words too. Then:
   far richer than a palette, the reference's own techniques, and after
   the opening sky the skies in a random order, changing smoothly, with no
   clock.

   ONE CAMERA. The window is the birds' camera (birds.v10.js): it looks
   out and up over a sea of cloud, the horizon a fifth of the window's
   height above its bottom edge (lower where the words come down that
   far). The birds aim it and lend it here (skyAir.aim); everything below
   is drawn through it, so a bird far off fades into the same haze the
   clouds do, and the birds always fly nearer than any cloud.

   WHAT IS DRAWN, back to front, per pixel (WebGL2, one fragment shader):
   the sky's light (a gradient by height above the horizon, warmed toward
   the light's side and deepened away from it; the sun or the moon, their
   halos); a high deck (thin streaks, an overcast with rain under it, or a
   veil of ice); cumulus towers rising out of the sea (soft-edged volumes:
   puffs joined smoothly and eroded by 3D noise); and the sea of cloud below
   the eye (a heightfield of soft domes). Cloud is lit as cloud, the way the
   reference lights its own: light carried on through it (octaves of
   scattering, each dimmer, deeper and less forward), its colour the light's
   where the cloud is thin and the sky's own blue where it is deep (never
   grey), crevices lit by the cloud about them rather than darkened, the
   edge toward the light silvered, thin cloud beside the sun in pastel. The
   air between: everything fades with distance into the horizon's haze
   (aerial perspective), a mist on the sea. And what the light does in the
   air, sky by sky: a rainbow (and its fainter twin) opposite a low sun, a
   glory's rings on the cloud below, the 22 degree halo and a sun dog in a
   high veil of ice, the Earth's shadow and the Belt of Venus opposite a
   setting or rising sun, a pillar over it, noctilucent wisps after sunset,
   the moon's corona, the Milky Way (its core, its dark lanes, its crowd of
   stars), the aurora (curtains folding slowly, rayed, green below and red
   above), distant showers, the sun breaking through onto the sea, light
   drifting in the air. Then light shafts from the sun through the gaps, a
   soft glow (bloom), a shoulder for the highlights by the brightest
   channel (a hue keeps its hue as it brightens), and a dither before the
   frame is stored in 8 bits (no bands).

   THE SKIES (the cycle). Thirteen skies, each a time of day, a weather and
   what its light does: sunrise, the glory, fair weather, the halo,
   silver rain, the rainbow, golden hour, the afterglow, the blue hour, a
   moonlit sea, the Milky Way, the aurora, and the light before sunrise. A
   visit opens on a sky of the visitor's hour (hour.v2.js marks it), part
   way through it; after that the sky goes where the weather goes, with no
   clock: a minute or two in each sky, about a minute's change into the
   next, mostly into a neighbouring sky, now and then into any other
   through the cloud (the sea swells into mist and clears into the next sky,
   as the reference passes between its places), never back into one of the
   last few. Colours blend in OKLab; a sun or moon fades where it stands.
   Each sky is our own, worked out from the light, not taken from a picture.

   THE WORDS stay legible on every sky, and the sky is never darkened
   for them (the owner's word: not anywhere, not ever). Their ink follows
   the ground: dark on a light sky, light on a dark one, the dimmed grey
   worked out afresh for 4.7:1 on its ground, the focus ring 3.3:1 on the
   links'; the name and credit, on the sky, and the links, on the sea, each
   take theirs from their own ground. The ground is read back from what
   was drawn (the darkest and lightest under the name, the credit and the
   links, without stalling), and light ink is only ever set on a ground
   that holds it: going from dark ink to light, the flip waits for the
   ground to be dark enough; going back, it comes the moment the ground
   grows too bright for light ink (once each way in a change: no
   flicker). Under dark ink the light is lifted where it would break it
   (by the gain the words' own darkest ground needs, eased out across a
   field as wide as the window, so it reads as the light brightening; a
   floor at the words themselves as a last hold: only as a change
   crosses its twilight, for under a second). Nothing about the words is
   ever drawn less: the sky's events, the stars, the motes and the rain
   are drawn everywhere alike, the words or no words. Light ink is held
   by the sky's own light: the six skies with light ink keep all of it,
   everywhere on the window, under a light ceiling (OKLab L 0.53: their
   horizons, glows, lit tops, the moon's silver, the aurora, the galaxy
   and the wisps graded under it, a soft shoulder easing what passes it,
   the stars' light bounded at the source), but for the moon, a declared
   bright thing that stands where no words are (its glare drawn tight);
   the twilight between a light sky and a dark one is even about the
   words, and the seas of the skies after sunset, before sunrise and
   under the moon hold their light low under the links.

   CALM. The clouds drift (well under a pixel a second near the window,
   less far off) and build and dissolve over minutes; the light changes
   over a minute; rain falls on twos (12 drawings a second, as the birds'
   hand). A cloud frame is drawn in slices over about a second and a half
   and crossfaded into, so no frame is long; the window is drawn 6 times
   a second (12 while it rains, 4 on a long visit) and between drawings
   the page is left alone; a slow device steps down (LADDER) and draws it
   coarser, slower, smaller, at last still. prefers-reduced-motion: a
   still sky of the visitor's hour, drawn once. A hidden tab draws
   nothing. Forced colours: no sky. No WebGL2: the stylesheet's sky of
   the hour (and with no script at all, its day).

   THE WEATHER: one crypto.getRandomValues at init, above the INIT-END
   marker (the cloud field, the towers, the wind, the stars), and no
   clock (hour.v2.js read it). No DOM is built: the canvas is in
   index.html. */
(function () {
  'use strict';

  var canvas = document.querySelector('canvas.sky');
  if (!canvas || !window.WebGL2RenderingContext) return;

  var visit = new Uint32Array(1);
  window.crypto.getRandomValues(visit);

  /* ---- INIT-END: no entropy and no clock below this line ---- */

  /* ---------------- tunables ---------------- */

  var STEP_MAX = 0.05;        // s: the longest step the sky's clock takes (a hidden tab stops it)
  var PERIOD = 1.5;           // s: a cloud frame is drawn over this, then crossfaded into
  var DRAW_FPS = [12, 6, 4];  // the window drawn 12 times a second while it rains (on twos, as the birds'
                              //  hand), else 6, and 4 once the visit is long (THIN)
  var THIN = 300;             // s: a long visit: drawn less often, frames over a longer period
  var SCALE = 0.5;            // cloud frames at this share of the window's CSS px...
  var PX_MAX = 640000;        // ... and never more pixels than this
  var CANVAS_DPR = 1.25;      // the canvas at most this many device px a CSS px
  /* a slow device steps down, one rung at a time (and back up after a
     minute's ease): the canvas at 1 device px a CSS px, frames over a
     longer period, smaller frames, smaller still, then the still sky */
  var LADDER = [{ dpr: CANVAS_DPR, period: 1, scale: 1 }, { dpr: 1, period: 1, scale: 1 }, { dpr: 1, period: 2, scale: 1 }, { dpr: 1, period: 2, scale: 0.8 }, { dpr: 1, period: 2.4, scale: 0.6 }];
  var EASE = 60;              // s: free of slowness this long, a rung back up
  var SEA_DRIFT = [0.45, 0.8];   // px/s: the sea's drift where it is nearest the window
  var TOWERS = 6;             // tower slots
  var BUILD = 90;             // s: a tower building out of the sea, or sinking back
  var LIFT_FEATHER = 2.5;     // dark ink's lift about the words, eased out across a feather this many times the window's
                              //  longer side (a Gaussian's fall): it reads as the light brightening, never as a shape
  var WORDS_CORE = 8;         // px: the floor's last hold about the name and the credit (the lettering's ink lies inside its box) ...
  var LINKS_CORE = 6;         // ... and about the links
  var STAR_TOP = 0.0911;      // the stars' light, with the sky's own under it, never above this (OKLab L 0.45, under the light
                              //  ceiling, L 0.53): softly bounded at the source, the same for every star on the whole sky
  var RATIO = 4.7;            // the words' contrast on the sky (WCAG's 4.5, with room for rounding and dither)
  var RING = 3.3;             // the focus ring's (3)
  var FLIP = 0.182;           // dark ink's floor: black on it reads at 4.64:1 (held per pixel, so only rounding and
                              //  the dither, a 1/255 step, take it lower: 4.55:1)
  var HURRY = 0.3;            // s: while dark ink's lift is on and the newer frame on show would end it, the crossfade
                              //  into that frame is done within this, and should it not, the next frame is drawn
                              //  quicker (in four drawings): the lift as brief as the frames allow
  var DWELL = 8;              // s: light ink that had to give way to dark on a dark sky comes back no sooner,
  var BACK = 0.9;             //  and only on a ground this share of the lightest it reads on (no flicker)
  var KNEE = 0.08;            // a light-words sky's ceiling (OKLab L, its own light eased under it) begins to bend this far below it
  var FOOT = 4.5;             // deg: a moon's footprint (its disc, corona and glare where they pass the light ceiling, drawn
  var KEEP = 12;              //  tight), kept this many px clear of every block of words
  var DEG = Math.PI / 180;

  /* ---------------- the visit's streams (splitmix32) ---------------- */

  function stream(s) {
    s = s >>> 0;
    return function () {
      s = (s + 0x9e3779b9) >>> 0;
      var z = s;
      z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
      z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
      return ((z ^ (z >>> 16)) >>> 0) / 4294967296;
    };
  }
  var front = stream(visit[0]);
  var rTower = stream(front() * 4294967296), rWind = stream(front() * 4294967296);
  var noiseSeed = (front() * 4294967296) >>> 0, starSeed = Math.floor(front() * 997);
  function mix(a, b, k) { return a + (b - a) * k; }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function smooth(k) { k = clamp(k, 0, 1); return k * k * k * (k * (k * 6 - 15) + 10); }

  /* ---------------- colour: OKLCH in, linear sRGB out ---------------- */

  function lab(L, C, h) { return [L, C * Math.cos(h * DEG), C * Math.sin(h * DEG)]; }
  function linOf(c) {
    var l = c[0] + 0.3963377774 * c[1] + 0.2158037573 * c[2],
        m = c[0] - 0.1055613458 * c[1] - 0.0638541728 * c[2],
        s = c[0] - 0.0894841775 * c[1] - 1.2914855480 * c[2];
    l = l * l * l; m = m * m * m; s = s * s * s;
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
            -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
            -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
  }
  function lumOf(c) { return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
  function enc(v) { v = clamp(v, 0, 1); return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055; }
  function hex(c) {
    var s = '#', i, v;
    for (i = 0; i < 3; i++) { v = Math.round(enc(c[i]) * 255); s += (v < 16 ? '0' : '') + v.toString(16); }
    return s;
  }
  /* the colour of this hue and chroma whose luminance is Y (by halving on L) */
  function ofLum(Y, C, h) {
    var lo = 0, hi = 1, i, L, c;
    for (i = 0; i < 24; i++) {
      L = (lo + hi) / 2; c = linOf(lab(L, C * Math.min(1, L * 1.6), h));
      c = [clamp(c[0], 0, 1), clamp(c[1], 0, 1), clamp(c[2], 0, 1)];
      if (lumOf(c) < Y) lo = L; else hi = L;
    }
    return c;
  }

  /* ---------------- the skies ----------------
     Each sky is a time of day and a weather, and what that light does in
     the air: not a palette but a place. sky: the light by height above the
     horizon (0, 5, 15, 32, 49 degrees; OKLCH). light: its colour and
     strength, and where it comes from ('disc', or az/el in degrees: az
     across the window, + to the right, 180 behind the eye); sun: where the
     sun stands when the light is not its own (the moon's, the stars');
     disc: the sun or moon (x a share of the window's width, el degrees up,
     or y a share of its height; r radius in degrees; i brightness; halo,
     haloI, wide its glow). amb: ambient from above (the sky) and below
     (the cloud); alb: the cloud's own colour; thick: the colour deep cloud
     takes (thin cloud takes the light's: warm where thin, the sky's blue
     where thick, never grey); ms: light scattered on through the cloud;
     g: how far forward; powder: crevices lit by the cloud about them;
     iri: thin cloud by the sun in pastel. sea: how far below the eye its
     tops lie, their height, softness, and how much they vary; seaLit: how
     much of the light reaches it (less where the sea lies in the Earth's
     shadow, or the moon's silver is held low under the links), seaMist how
     far it is lost in a low mist the colour of the sky about the words (at
     a twilight); fog, mist, fogC: the air. deck: height, cover, opacity, darkening. towers: how
     many of the slots; tall. And the sky's own events: bow (a rainbow
     opposite the sun), glory (its rings on the cloud sea below), halo and
     dogs (the 22 degree ring and the sun dogs, in a high ice veil), belt
     (the Earth's shadow and the Belt of Venus opposite a low sun), aurora,
     galaxy (the Milky Way), nlc (noctilucent wisps after sunset), curtain
     (distant showers), sbreak (once a while, sun breaking through onto the
     sea), corona (rings about the moon), pillar (a pillar over a low
     sun), motes (light drifting in the air). words: 0 dark on light, 1
     light on dark. group: the time of day it belongs to (the stylesheet's
     still sky for it, and which skies a visit can open on). near: the
     skies it passes into most naturally */
  var FX = ['bow', 'glory', 'halo', 'dogs', 'belt', 'aurora', 'galaxy', 'nlc', 'curtain', 'sbreak', 'corona', 'pillar', 'motes'];
  var BASE = {
    hold: 90, move: 60, tint: [0.95, 0.03, 80], tintAmt: 0.3, tintPow: 3, deep: 0.08, sun: null, disc: null,
    thick: [0.76, 0.1, 238], ms: 1, g: 0.65, powder: 0.6, iri: 0,
    sea: [1, 0.62, 0.05, 0.55], seaLit: 1, seaMist: 0, fog: 0.02, mist: 0.5, deck: [7, 0.25, 0.5, 0.05],
    towers: 0.6, tall: 0.9, stars: 0, rain: 0, rainC: [0.92, 0.02, 205], shafts: 0, shaftC: [0.95, 0.05, 75],
    bloom: 0.1, exposure: 1, sat: 1, ceil: 2
  };
  var SCENES = {
    dawn: {     // sunrise over the sea: lavender above, peach at the rising sun, mist, the Belt of Venus opposite
      group: 'dawn', words: 0, hold: 80, move: 55, near: ['glory', 'day', 'halo', 'rain'],
      sky: [[0.94, 0.038, 66], [0.92, 0.04, 40], [0.9, 0.036, 8], [0.85, 0.046, 316], [0.79, 0.058, 296]],
      tint: [0.95, 0.06, 64], tintAmt: 0.45, tintPow: 4, deep: 0.12,
      lightC: [0.9, 0.07, 58], lightI: 1, light: 'disc', disc: { x: 0.13, el: 2.4, r: 0.5, i: 6, halo: 65, haloI: 0.32, wide: 0.06, c: [0.97, 0.06, 72] },
      ambU: [0.76, 0.055, 296], ambUI: 0.62, ambD: [0.88, 0.045, 42], ambDI: 0.5, alb: [0.985, 0.008, 60],
      thick: [0.8, 0.07, 300], g: 0.7, iri: 0.25, mist: 0.75, fogC: [0.9, 0.04, 30],
      deck: [7, 0.32, 0.55, 0.08], deckC: [0.91, 0.045, 25], towers: 0.5, tall: 0.75, stars: 0.02,
      shafts: 0.38, shaftC: [0.95, 0.06, 65], bloom: 0.22, belt: 0.8, motes: 0.6, pillar: 0.15
    },
    glory: {    // the sun low behind the eye: the cloud sea lit full on, a glory's rings on it
      group: 'dawn', words: 0, hold: 85, move: 55, near: ['dawn', 'day', 'rainbow', 'halo'],
      sky: [[0.93, 0.04, 40], [0.915, 0.035, 12], [0.885, 0.04, 300], [0.83, 0.055, 265], [0.78, 0.07, 255]],
      tint: [0.95, 0.05, 60], tintAmt: 0.3, tintPow: 2, deep: 0.06,
      lightC: [0.95, 0.06, 70], lightI: 1.1, light: { az: 168, el: 3.5 },
      ambU: [0.8, 0.05, 265], ambUI: 0.55, ambD: [0.9, 0.03, 40], ambDI: 0.45, alb: [0.99, 0.006, 60],
      thick: [0.82, 0.06, 280], powder: 0.7, mist: 0.45, fogC: [0.92, 0.035, 30],
      deck: [7, 0.2, 0.45, 0.04], deckC: [0.93, 0.03, 30], towers: 0.55, tall: 0.8, bloom: 0.12,
      glory: 1, belt: 0.25, motes: 0.3
    },
    day: {      // fair weather: azure, big round cumulus, shadows the sky's own blue
      group: 'day', words: 0, hold: 110, move: 60, near: ['halo', 'rain', 'rainbow', 'sunset', 'glory'],
      sky: [[0.95, 0.022, 212], [0.925, 0.035, 220], [0.89, 0.058, 228], [0.805, 0.09, 236], [0.745, 0.105, 240]],
      tint: [0.975, 0.02, 100], tintAmt: 0.32, tintPow: 2.5, deep: 0.1,
      lightC: [0.99, 0.022, 88], lightI: 0.9, light: { az: -112, el: 40 },
      ambU: [0.78, 0.085, 236], ambUI: 0.55, ambD: [0.93, 0.02, 210], ambDI: 0.42, alb: [0.99, 0.005, 220],
      thick: [0.76, 0.11, 238], powder: 0.8, sea: [1, 0.66, 0.07, 0.6], fog: 0.019, fogC: [0.925, 0.025, 214],
      deck: [7, 0.24, 0.6, 0], deckC: [0.975, 0.01, 220], towers: 1, tall: 1.05, bloom: 0.12, motes: 0.15
    },
    halo: {     // a high ice veil: the 22 degree ring about the sun, a sun dog beside it, pastel at thin edges
      group: 'day', words: 0, hold: 95, move: 60, near: ['day', 'rain', 'sunset', 'glory'],
      sky: [[0.945, 0.02, 215], [0.925, 0.028, 222], [0.895, 0.045, 230], [0.83, 0.07, 236], [0.78, 0.085, 240]],
      tint: [0.98, 0.02, 95], tintAmt: 0.25, tintPow: 3, deep: 0.05,
      lightC: [0.99, 0.025, 88], lightI: 0.85, light: 'disc', disc: { x: 0.18, el: 27, r: 0.5, i: 4, halo: 40, haloI: 0.35, wide: 0.08, c: [0.99, 0.02, 90] },
      ambU: [0.82, 0.06, 232], ambUI: 0.58, ambD: [0.94, 0.018, 210], ambDI: 0.42, alb: [0.99, 0.005, 220],
      thick: [0.8, 0.08, 236], iri: 0.35, sea: [1, 0.64, 0.07, 0.55], mist: 0.45, fogC: [0.93, 0.022, 214],
      deck: [7.5, 0.9, 0.35, 0], deckC: [0.97, 0.012, 220], towers: 0.6, tall: 0.9, shafts: 0.2, bloom: 0.16,
      halo: 1, dogs: 1
    },
    rain: {     // silver rain: a light overcast, showers far off, and now and then the sun breaking through
      group: 'rain', words: 0, hold: 85, move: 60, near: ['rainbow', 'day', 'halo', 'sunset'],
      sky: [[0.91, 0.02, 200], [0.9, 0.022, 206], [0.89, 0.024, 212], [0.79, 0.028, 220], [0.82, 0.024, 226]],
      tint: [0.92, 0.02, 200], tintAmt: 0.15, tintPow: 2, deep: 0.03,
      lightC: [0.9, 0.02, 205], lightI: 0.5, light: { az: -12, el: 40 },
      ambU: [0.74, 0.03, 220], ambUI: 0.75, ambD: [0.8, 0.03, 200], ambDI: 0.55, alb: [0.95, 0.008, 205],
      thick: [0.72, 0.04, 222], ms: 0.8, g: 0.4, powder: 0.5, sea: [1, 0.55, 0.065, 0.5], fog: 0.03, mist: 0.7, fogC: [0.86, 0.025, 205],
      deck: [5, 0.96, 0.85, 0.15], deckC: [0.84, 0.025, 212], towers: 0.25, tall: 0.7, rain: 1, rainC: [0.93, 0.02, 200],
      bloom: 0.05, curtain: 0.8, sbreak: 1
    },
    rainbow: {  // after the rain: the sun low behind the eye, the bow standing on the showers ahead
      group: 'rain', words: 0, hold: 90, move: 60, near: ['day', 'sunset', 'halo', 'rain'],
      sky: [[0.88, 0.03, 215], [0.865, 0.035, 222], [0.85, 0.04, 230], [0.78, 0.055, 238], [0.72, 0.065, 242]],
      tint: [0.96, 0.05, 70], tintAmt: 0.2, tintPow: 2, deep: 0.08,
      lightC: [0.97, 0.05, 75], lightI: 1.05, light: { az: 162, el: 13 },
      ambU: [0.78, 0.06, 232], ambUI: 0.55, ambD: [0.9, 0.03, 60], ambDI: 0.45, alb: [0.99, 0.006, 80],
      thick: [0.74, 0.08, 236], powder: 0.7, sea: [1, 0.6, 0.06, 0.55], fog: 0.024, mist: 0.55, fogC: [0.88, 0.03, 215],
      deck: [6, 0.55, 0.6, 0.1], deckC: [0.86, 0.03, 215], towers: 0.5, tall: 0.85, rain: 0.15,
      bow: 1, curtain: 0.6, motes: 0.2
    },
    sunset: {   // golden hour: the sun on the sea, rim-lit towers, rays, a pillar, pastel edges by the sun
      group: 'sunset', words: 0, hold: 85, move: 60, near: ['afterglow', 'rain', 'day', 'rainbow'],
      sky: [[0.93, 0.058, 78], [0.91, 0.056, 58], [0.886, 0.06, 38], [0.825, 0.056, 352], [0.755, 0.054, 322]],
      tint: [0.945, 0.08, 80], tintAmt: 0.45, tintPow: 4, deep: 0.15,
      lightC: [0.88, 0.095, 68], lightI: 1.05, light: 'disc', disc: { x: 0.86, el: 2.2, r: 0.55, i: 7, halo: 55, haloI: 0.38, wide: 0.07, c: [0.97, 0.085, 82] },
      ambU: [0.72, 0.06, 322], ambUI: 0.6, ambD: [0.86, 0.065, 58], ambDI: 0.5, alb: [0.98, 0.02, 70],
      thick: [0.72, 0.07, 320], ms: 1.1, g: 0.75, iri: 0.3, sea: [1, 0.66, 0.05, 0.6], fog: 0.024, fogC: [0.88, 0.05, 50],
      deck: [7, 0.36, 0.6, 0.05], deckC: [0.86, 0.065, 40], towers: 1, tall: 1,
      shafts: 0.6, shaftC: [0.95, 0.085, 75], bloom: 0.26, pillar: 0.35, motes: 0.5, belt: 0.3
    },
    afterglow: {  // the sun just down: tops still pink, the sea in the Earth's shadow, the purple light
      group: 'dusk', words: 1, hold: 70, move: 60, near: ['bluehour', 'sunset', 'milkyway', 'moonlit'],
      sky: [[0.52, 0.1, 52], [0.4, 0.065, 26], [0.34, 0.06, 330], [0.315, 0.062, 290], [0.29, 0.06, 274]],
      tint: [0.53, 0.12, 48], tintAmt: 0.42, tintPow: 8, deep: 0.12,
      lightC: [0.78, 0.12, 40], lightI: 0.75, light: { az: 62, el: -2 },
      disc: { az: 62, el: -3, r: 0.5, i: 0, halo: 9, haloI: 0.12, wide: 0.02, c: [0.75, 0.12, 45] },
      ambU: [0.48, 0.06, 290], ambUI: 0.65, ambD: [0.5, 0.05, 270], ambDI: 0.45, alb: [0.95, 0.02, 40],
      thick: [0.55, 0.08, 300], g: 0.7, powder: 0.5, seaLit: 0.45, fog: 0.026, mist: 0.55, fogC: [0.5, 0.06, 300],
      deck: [7, 0.4, 0.6, 0.1], deckC: [0.5, 0.08, 20], towers: 0.7, tall: 0.95, stars: 0.05,
      shafts: 0.15, shaftC: [0.8, 0.1, 45], bloom: 0.15, belt: 0.6, ceil: 0.525
    },
    bluehour: {   // the blue hour over an amber band, noctilucent wisps low on the sunset side, the first stars
      group: 'dusk', words: 1, hold: 70, move: 60, near: ['moonlit', 'milkyway', 'aurora', 'afterglow', 'firstlight'],
      sky: [[0.52, 0.1, 52], [0.37, 0.045, 15], [0.345, 0.05, 285], [0.3, 0.06, 270], [0.27, 0.058, 266]],
      tint: [0.53, 0.11, 58], tintAmt: 0.4, tintPow: 7, deep: 0.1,
      lightC: [0.6, 0.09, 58], lightI: 0.4, light: { az: 64, el: -7 },
      disc: { az: 64, el: -6, r: 0.5, i: 0, halo: 12, haloI: 0.14, wide: 0.03, c: [0.62, 0.11, 58] },
      ambU: [0.36, 0.05, 270], ambUI: 0.7, ambD: [0.4, 0.045, 265], ambDI: 0.5, alb: [0.9, 0.02, 260],
      thick: [0.38, 0.06, 270], ms: 0.9, powder: 0.4, fog: 0.026, mist: 0.6, fogC: [0.42, 0.05, 272],
      deck: [7, 0.3, 0.5, 0.15], deckC: [0.4, 0.05, 280], stars: 0.35, shafts: 0.1, shaftC: [0.62, 0.1, 58], bloom: 0.12,
      nlc: 1, belt: 0.4, ceil: 0.525
    },
    moonlit: {    // a moonlit sea: the moon high on the right in its corona, the cloud silvered
      group: 'night', words: 1, hold: 95, move: 60, near: ['milkyway', 'aurora', 'firstlight', 'bluehour'],
      sky: [[0.4, 0.035, 250], [0.345, 0.042, 258], [0.295, 0.046, 264], [0.255, 0.048, 267], [0.225, 0.046, 269]],
      tint: [0.42, 0.04, 250], tintAmt: 0.18, tintPow: 2, deep: 0.04,
      lightC: [0.84, 0.025, 245], lightI: 0.5, light: 'disc', sun: { az: 150, el: -30 },
      disc: { x: 0.82, y: 0.14, xs: 0.9, ys: 0.08, r: 0.6, i: 1.7, halo: 600, haloI: 0.3, wide: 0.012, c: [0.94, 0.02, 245] },
      ambU: [0.34, 0.05, 262], ambUI: 0.72, ambD: [0.36, 0.04, 255], ambDI: 0.45, alb: [0.95, 0.01, 250],
      thick: [0.46, 0.06, 262], powder: 0.5, seaLit: 0.55, fogC: [0.4, 0.045, 258],
      deck: [7, 0.3, 0.4, 0.05], deckC: [0.4, 0.035, 255], towers: 0.5, tall: 0.85, stars: 0.6, bloom: 0.06, corona: 1, ceil: 0.525
    },
    milkyway: {   // no moon: the galaxy's band over the sea, its dark lanes, a sky full of stars
      group: 'night', words: 1, hold: 95, move: 60, near: ['aurora', 'moonlit', 'firstlight'],
      sky: [[0.38, 0.03, 245], [0.32, 0.035, 252], [0.27, 0.04, 262], [0.23, 0.042, 266], [0.2, 0.04, 270]],
      tint: [0.4, 0.03, 250], tintAmt: 0.05, deep: 0,
      lightC: [0.6, 0.02, 250], lightI: 0.15, light: { az: -30, el: 60 }, sun: { az: 170, el: -40 },
      ambU: [0.3, 0.045, 262], ambUI: 0.75, ambD: [0.32, 0.035, 255], ambDI: 0.5, alb: [0.92, 0.01, 250],
      thick: [0.3, 0.04, 262], ms: 0.8, g: 0.5, powder: 0.3, fog: 0.018, mist: 0.4, fogC: [0.34, 0.035, 255],
      deck: [7, 0.12, 0.3, 0.05], deckC: [0.32, 0.03, 255], towers: 0.4, tall: 0.8, stars: 1, bloom: 0.04, galaxy: 1, ceil: 0.525
    },
    aurora: {     // the aurora: green curtains folding slowly, red at their tops, their light on the cloud
      group: 'night', words: 1, hold: 100, move: 60, near: ['milkyway', 'moonlit', 'firstlight', 'bluehour'],
      sky: [[0.38, 0.035, 230], [0.32, 0.04, 240], [0.27, 0.045, 255], [0.23, 0.045, 265], [0.2, 0.042, 270]],
      tint: [0.4, 0.04, 200], tintAmt: 0.08, deep: 0,
      lightC: [0.72, 0.09, 152], lightI: 0.38, light: { az: 10, el: 25 }, sun: { az: 180, el: -35 },
      ambU: [0.34, 0.055, 172], ambUI: 0.75, ambD: [0.3, 0.035, 250], ambDI: 0.45, alb: [0.92, 0.01, 240],
      thick: [0.3, 0.04, 250], ms: 0.8, g: 0.5, powder: 0.3, fog: 0.018, mist: 0.45, fogC: [0.33, 0.04, 220],
      deck: [7, 0.1, 0.3, 0.05], deckC: [0.32, 0.03, 240], towers: 0.4, tall: 0.8, stars: 0.75, bloom: 0.1, aurora: 1, ceil: 0.525
    },
    firstlight: { // before the sunrise: tops lit first over a sea still in the Earth's shadow
      group: 'night', words: 1, hold: 70, move: 55, near: ['dawn', 'glory', 'moonlit'], land: false,
      sky: [[0.52, 0.085, 58], [0.39, 0.055, 24], [0.335, 0.052, 320], [0.31, 0.056, 286], [0.285, 0.054, 274]],
      tint: [0.53, 0.1, 58], tintAmt: 0.38, tintPow: 8, deep: 0.1,
      lightC: [0.82, 0.1, 50], lightI: 0.6, light: { az: -62, el: -3 },
      disc: { az: -62, el: -3, r: 0.5, i: 0, halo: 10, haloI: 0.12, wide: 0.02, c: [0.8, 0.1, 55] },
      ambU: [0.46, 0.05, 285], ambUI: 0.65, ambD: [0.5, 0.04, 280], ambDI: 0.45, alb: [0.95, 0.015, 50],
      thick: [0.5, 0.06, 290], g: 0.7, powder: 0.5, seaLit: 0.6, fogC: [0.5, 0.05, 290],
      deck: [7, 0.35, 0.55, 0.1], deckC: [0.5, 0.07, 30], stars: 0.12, shafts: 0.15, shaftC: [0.8, 0.1, 55], bloom: 0.14, belt: 0.6, ceil: 0.525
    }
  };
  var IDS = Object.keys(SCENES);
  var COLOURS = ['tint', 'lightC', 'ambU', 'ambD', 'alb', 'thick', 'fogC', 'deckC', 'rainC', 'shaftC'];
  var NUMBERS = ['mist', 'seaLit', 'seaMist', 'tintAmt', 'tintPow', 'deep', 'lightI', 'ambUI', 'ambDI', 'ms', 'g', 'powder', 'iri', 'fog', 'towers', 'tall', 'stars', 'rain', 'shafts', 'bloom', 'exposure', 'sat', 'ceil'].concat(FX);
  IDS.forEach(function (n) {
    var S = SCENES[n], k;
    for (k in BASE) if (S[k] === undefined) S[k] = BASE[k];
    for (k = 0; k < FX.length; k++) if (S[FX[k]] === undefined) S[FX[k]] = 0;
    S.id = n;
    S.skyL = S.sky.map(function (c) { return lab(c[0], c[1], c[2]); });
    for (k = 0; k < COLOURS.length; k++) S[COLOURS[k] + 'L'] = lab(S[COLOURS[k]][0], S[COLOURS[k]][1], S[COLOURS[k]][2]);
    if (S.disc) S.disc.L = lab(S.disc.c[0], S.disc.c[1], S.disc.c[2]);
  });

  /* the change between two skies. Most pass straight into each other; two
     that need more pass through a waypoint, halfway: where the words' ink
     flips (dark to light, or back) a twilight, the sky about the words
     even (the gradient alone: no warmth toward the light or shade away
     from it, no deck, event, ray or glow, a sun or moon gone well before)
     and well below the crossing (about a tenth under the words, as
     drawn), so light ink reads there with room, and the light passes the
     band no ink reads in without help (HI_MAX to FLIP) on the steep part
     of its way in or out, dark ink's lift raising it only while it does,
     for under a second; its hue the two skies' between (never grey: a
     twilight's purple light where they cancel); the sea lost in a low mist
     the colour of that sky, so under the links the ground is as even and
     as dark as about the name; and a change between skies that are not
     neighbours goes through the cloud: the sea swells into mist and clears
     into the next (the way the reference passes between its places) */
  var TWILIGHT = [0.48, 0.47, 0.466, 0.466, 0.43];      // (OKLab L at 0, 5, 15, 32 and 49 degrees, as drawn)
  var TWILIGHT_MIST = 0.95;                             // (how far the sea is lost in it)
  var EVEN = 1.8;                                       // (how much sooner the sky about the words is even, going in; how much later it is not, coming out)
  var STRUCT = { tintAmt: 1, deep: 1, seaMist: 1, shafts: 1, bloom: 1 };   // (what makes the sky uneven about the words: below)
  var TWILIGHT_SEA = { 0: 1.12, 1: 0.8 };                // (the sea's light there, from dark words to light, and back)
  var ways = {};
  function way(A, B, far) {
    var key = A.id + '>' + B.id + (far ? '*' : ''), C, j, f, m, ch;
    if (ways[key]) return ways[key];
    C = { id: key };
    C.skyL = A.skyL.map(function (c, j) { return lerp3(c, B.skyL[j], 0.5); });
    for (j = 0; j < COLOURS.length; j++) { f = COLOURS[j] + 'L'; C[f] = lerp3(A[f], B[f], 0.5); }
    for (j = 0; j < NUMBERS.length; j++) { f = NUMBERS[j]; C[f] = mix(A[f], B[f], 0.5); }
    for (j = 0; j < FX.length; j++) C[FX[j]] *= 0.25;
    C.sea = lerpN(A.sea, B.sea, 0.5); C.deck = lerpN(A.deck, B.deck, 0.5);
    if (A.words !== B.words) {
      C.skyL = C.skyL.map(function (c, j) {
        m = Math.hypot(c[1], c[2]); ch = Math.max(m * 0.7, 0.045);
        return m > 0.012 ? [TWILIGHT[j], c[1] / m * ch, c[2] / m * ch] : [TWILIGHT[j], ch * Math.cos(305 * DEG), ch * Math.sin(305 * DEG)];
      });
      /* even about the words: the light's warmth and the shade away from it, the high deck (its streaks and the
         light they scatter forward), the sky's events, rays and glow all gone at the crossing itself, the sky the
         gradient alone */
      C.tintL = [0.6, C.tintL[1] * 0.7, C.tintL[2] * 0.7]; C.tintAmt = 0; C.deep = 0;
      for (j = 0; j < FX.length; j++) C[FX[j]] = 0;
      C.fogCL = [0.62, C.fogCL[1] * 0.8, C.fogCL[2] * 0.8];
      C.deckCL = [0.55, C.deckCL[1] * 0.7, C.deckCL[2] * 0.7];
      C.deck[2] = 0; C.rain = 0; C.shafts = 0; C.bloom = Math.min(C.bloom, 0.03);
      f = TWILIGHT_SEA[A.words];                         // (the cloud sea under the links at the crossing as well)
      C.lightI *= 0.4 * f; C.ambUI *= 0.6 * f; C.ambDI *= 0.55 * f;
      C.seaMist = TWILIGHT_MIST;
    }
    if (far) {                                           // (through the cloud)
      C.mist = Math.max(C.mist, 1.35); C.fog *= 1.7; C.towers *= 0.45; C.sea[0] *= 0.86; C.deck[1] = Math.min(1, C.deck[1] + 0.2);
      C.shafts *= 0.5;
    }
    ways[key] = C;
    return C;
  }

  /* the order the skies come in: the visit opens on a sky of the visitor's
     hour (hour.v2.js marks it), part way through it; after that, wherever
     the weather goes: mostly into a neighbouring sky, now and then (FAR)
     into any other through the cloud, never back into one of the last few;
     skies not yet seen this visit come sooner, and after a run of skies of
     one kind of words (all light skies, or all dark) the other kind is
     likelier, so a stay of a quarter of an hour sees day and night */
  var FAR = 0.38, RECENT = 3;
  var LAND = {};
  IDS.forEach(function (n) { var S = SCENES[n]; if (S.land !== false) (LAND[S.group] = LAND[S.group] || []).push(n); });
  var root = document.documentElement;
  var rCycle = stream(front() * 4294967296);
  var openGroup = root.getAttribute('data-sky'), openAt = parseFloat(root.getAttribute('data-sky-at')), seq = [];
  var visits = {}, streak = 0;                          // (how often each sky has come; the run of one kind of words)
  if (!LAND[openGroup]) openGroup = 'day';
  if (!(openAt >= 0 && openAt <= 1)) openAt = 0.5;
  var opening = root.getAttribute('data-sky-scene');   // (the studio's: which sky to open on)
  if (!SCENES[opening]) opening = LAND[openGroup][Math.floor(rCycle() * LAND[openGroup].length)];
  pushSky(opening);
  seq[0].at = -seq[0].hold * openAt * 0.9;
  function pushSky(id) {
    var S = SCENES[id], prev = seq[seq.length - 1];
    visits[id] = (visits[id] || 0) + 1;
    seq.push({ id: id, at: prev ? prev.at + prev.hold + prev.move : 0, hold: S.hold * mix(0.9, 1.15, rCycle()), move: S.move,
               far: false, ev: mix(0.25, 0.6, rCycle()) });
  }
  /* the visit's own: the galaxy's lie (its band across the window, its core low), the aurora's folds, where the sun
     breaks through onto the sea */
  var rSky = stream(front() * 4294967296);
  var GAL = (function () {
    var best = null, bn = -1, i, j, P, U, V, g, n, lo, core, e, a;
    for (i = 0; i < 24; i++) {
      P = dirOf(mix(-180, 180, rSky()), mix(15, 60, rSky())); U = norm3(cross3(P, [0, 1, 0])); V = cross3(P, U);
      n = 0; lo = 99; core = null;
      for (j = 0; j < 90; j++) {
        a = j / 90 * 2 * Math.PI; g = [U[0] * Math.cos(a) + V[0] * Math.sin(a), U[1] * Math.cos(a) + V[1] * Math.sin(a), U[2] * Math.cos(a) + V[2] * Math.sin(a)];
        e = Math.asin(clamp(g[1], -1, 1)) / DEG;
        if (g[2] > 0.85 && e > 4 && e < 34) { n++; if (e < lo) { lo = e; core = g; } }
      }
      if (n > bn) { bn = n; best = { pole: P, core: core || U }; }
    }
    return best;
  })();
  var AUR = { ph: rSky() * 6.2832, base: mix(5, 8, rSky()) };
  var BRK = (function () { var z = mix(18, 34, rSky()), a = mix(-0.22, 0.22, rSky()); return { x: z * Math.tan(a), z: z, r: mix(4, 6.5, rSky()) }; })();
  function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function nextSky() {
    var last = seq[seq.length - 1], recent = seq.slice(-RECENT).map(function (e) { return e.id; }), far = rCycle() < FAR, c, id, w, sum = 0, i, x;
    c = (far ? IDS : SCENES[last.id].near).filter(function (n) { return recent.indexOf(n) < 0; });
    if (!c.length) c = IDS.filter(function (n) { return n !== last.id; });
    w = c.map(function (n) {
      var v = 1 / (1 + 2 * (visits[n] || 0));               // (a sky not yet seen, likelier)
      if (streak >= 4 && SCENES[n].words !== SCENES[last.id].words) v *= 4;   // (after a run of one kind, the other)
      sum += v; return v;
    });
    x = rCycle() * sum;
    for (i = 0; i < c.length - 1 && x >= w[i]; i++) x -= w[i];
    id = c[i];
    last.far = SCENES[last.id].near.indexOf(id) < 0;
    streak = SCENES[id].words === SCENES[last.id].words ? streak + 1 : 1;
    pushSky(id);
  }

  /* ---------------- the page: the window and the words ---------------- */

  /* the words: the whole stack (no tower is placed to rise behind it), the name
     (lettered: its ink lies inside the h1's box), the credit (where the
     dimmed grey is), and the links */
  var W = 0, H = 0, stackR = null, nameR = null, wordsR = null, links = [], dirty = true;
  function measure() {
    W = window.innerWidth; H = window.innerHeight;
    var a = document.querySelectorAll('footer a'), i;
    stackR = rectOf1('.stack'); nameR = rectOf1('.stack h1');
    wordsR = rectOf1('.credit');
    links = [];
    for (i = 0; i < a.length && i < 2; i++) if (a[i].getBoundingClientRect().right > a[i].getBoundingClientRect().left) links.push(boxOf(a[i].getBoundingClientRect()));
    dirty = false;
  }
  function boxOf(r) { return [r.left, r.top, r.right, r.bottom]; }
  function rectOf1(sel) { var e = document.querySelector(sel), r; if (!e) return null; r = e.getBoundingClientRect(); return r.right > r.left ? boxOf(r) : null; }
  function union(a, b) { return !a ? b : (!b ? a : [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]); }

  /* ---------------- the camera (the birds', lent; or the same, worked out here) ---------------- */

  var cam = { f: 1, c: 1, s: 0, th: 0, x0: 0, y0: 0, hy: 0, W: 0, H: 0, lent: false };
  function ownCamera() {
    var f = Math.max(W, H) / (2 * Math.tan(30 * DEG));
    var hy = clamp(Math.max(H * 0.8, (stackR ? stackR[3] : 0) + 24 + 60), H * 0.8, H * 0.95);
    setCamera(f, Math.atan((hy - H / 2) / f), W, H);
  }
  function setCamera(f, th, w, h) {
    cam.f = f; cam.th = th; cam.c = Math.cos(th); cam.s = Math.sin(th);
    cam.x0 = w / 2; cam.y0 = h / 2; cam.hy = cam.y0 + f * Math.tan(th); cam.W = w; cam.H = h;
    aimed = true;
  }
  var aimed = false;
  /* a direction in the air (x right, y up, z out) to the window, and back */
  function toWindow(d, o) {
    var yc = d[1] * cam.c - d[2] * cam.s, zc = d[1] * cam.s + d[2] * cam.c;
    o[0] = cam.x0 + cam.f * d[0] / zc; o[1] = cam.y0 - cam.f * yc / zc; o[2] = zc;
    return o;
  }
  function fromWindow(sx, sy) {
    var x = sx - cam.x0, y = cam.y0 - sy, z = cam.f, n;
    var d = [x, y * cam.c + z * cam.s, z * cam.c - y * cam.s];
    n = Math.hypot(d[0], d[1], d[2]);
    return [d[0] / n, d[1] / n, d[2] / n];
  }
  function clearOf(x, y) {
    var s = x < W / 2 ? -1 : 1, i, j, b, d, q, near;
    for (i = 0; i < 80; i++) {
      d = fromWindow(x, y);
      for (j = 0, near = false; j < 3 && !near; j++) {        // (the nearest point of each block's zone, KEEP px about it,
        b = j === 0 ? stackR : links[j - 1];                  //  at least FOOT and a tenth from the moon)
        if (!b) continue;
        q = fromWindow(clamp(x, b[0] - KEEP, b[2] + KEEP), clamp(y, b[1] - KEEP, b[3] + KEEP));
        near = Math.acos(clamp(d[0] * q[0] + d[1] * q[1] + d[2] * q[2], -1, 1)) / DEG < FOOT * 1.1;
      }
      if (!near) break;
      if (s > 0 ? x < W * 0.96 : x > W * 0.04) x += s * W * 0.01; else y -= H * 0.01;
    }
    return fromWindow(x, y);
  }
  function dirOf(az, el) { return [Math.sin(az * DEG) * Math.cos(el * DEG), Math.sin(el * DEG), Math.cos(az * DEG) * Math.cos(el * DEG)]; }
  /* a disc's direction: by its place on the window (x a share of the width, at el degrees up, or at y a share of the
     height). One placed by its height (the moon) stands higher and farther right on a window under 500 px tall (xs,
     ys), its footprint KEEP clear of every block of words; and should the words reach it there on some other window,
     it is slid out toward the window's nearer side, then up (never its light made less: the moon is moved whole) */
  function discDir(D) {
    if (D.az !== undefined) return dirOf(D.az, D.el);
    if (D.y !== undefined) return H < 500 && D.ys !== undefined ? clearOf(D.xs * W, D.ys * H) : clearOf(D.x * W, D.y * H);
    var k = (D.x * W - cam.x0) / cam.f, A = Math.cos(D.el * DEG), B = Math.sin(D.el * DEG) * cam.s,
        R = Math.sqrt(1 + k * k * cam.c * cam.c), az = Math.atan(k * cam.c) + Math.asin(clamp(k * B / (A * R), -1, 1));
    return dirOf(az / DEG, D.el);
  }

  /* ---------------- the cycle: where the sky is, blended ---------------- */

  var NOW = {};               // the sky now (a frame's own sky is blended apart)
  function blend(t, P) {
    var i, e, A, B, k, j, f, X, Y, q, C, u, env, qs;
    while (seq[seq.length - 1].at < t + 30) nextSky();
    i = seq.length - 2;
    while (i > 0 && seq[i].at > t) i--;
    if (i > 8) { seq.splice(0, i - 4); i = 4; }           // (the past let go)
    e = seq[i]; A = SCENES[e.id]; B = SCENES[seq[i + 1].id];
    k = clamp((t - e.at - e.hold) / e.move, 0, 1);
    X = A; Y = B;
    if (A.words !== B.words || e.far) {                   // (a change through a waypoint eases into it and out:
      C = way(A, B, e.far);                               //  the light lingers there)
      if (k < 0.5) { Y = C; q = smooth(k * 2); } else { X = C; q = smooth(k * 2 - 1); }
    } else q = k = smooth(k);
    /* (into a twilight, the sky about the words is even well before the light reaches the band no ink reads in
       without help, and out of one it stays even until the light has passed it: the warmth, the shade, the deck,
       the sky's events, rays and glow fade out sooner and come back later than the light, and the sea's mist
       likewise, so the words' ground is all but one light as it crosses, and dark ink's lift is brief) */
    qs = A.words === B.words ? q : k < 0.5 ? smooth(k * 2 * EVEN) : smooth((k * 2 - 1) * EVEN - (EVEN - 1));
    P.k = k; P.a = A; P.b = B; P.id = (k < 0.5 ? A : B).id; P.name = (k < 0.5 ? A : B).group;
    P.sky = [];
    for (j = 0; j < 5; j++) P.sky.push(linOf(lerp3(X.skyL[j], Y.skyL[j], q)));
    for (j = 0; j < COLOURS.length; j++) { f = COLOURS[j]; P[f] = linOf(lerp3(X[f + 'L'], Y[f + 'L'], q)); }
    for (j = 0; j < NUMBERS.length; j++) { f = NUMBERS[j]; P[f] = mix(X[f], Y[f], STRUCT[f] || FX.indexOf(f) >= 0 ? qs : q); }
    P.sea = lerpN(X.sea, Y.sea, q); P.deck = lerpN(X.deck, Y.deck, qs);
    P.words = mix(A.words, B.words, k);
    P.light = arc(lightDir(A), lightDir(B), k);
    P.sun = arc(sunDir(A), sunDir(B), k);
    f = A.words !== B.words ? 2.6 : 2;                    // (into a twilight a sun or moon is gone well before the crossing)
    P.discA = A.disc ? discOf(A.disc, smooth(1 - f * k)) : null;
    P.discB = B.disc ? discOf(B.disc, smooth(f * k - (f - 1))) : null;
    u = t - e.at - e.hold * e.ev;                         // (the sun breaking through: once, about 26 s, in the hold)
    env = smooth(u / 8) * (1 - smooth((u - 18) / 8));
    P.sbreak *= env;
    P.t = t;
    return P;
  }
  function lightDir(S) { return S.light === 'disc' ? discDir(S.disc) : dirOf(S.light.az, S.light.el); }
  function sunDir(S) { return S.sun ? dirOf(S.sun.az, S.sun.el) : lightDir(S); }
  /* from one direction to another (over the top, where they face apart) */
  function arc(a, b, k) {
    var d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2], m = lerp3(a, b, k);
    m[1] += Math.max(0, -d) * Math.sin(Math.PI * k) * 0.6;
    return norm3(m);
  }
  function discOf(D, w) { return { d: discDir(D), r: D.r, i: D.i * w, halo: D.halo, haloI: D.haloI * w, wide: D.wide * w, c: linOf(D.L) }; }
  function lerp3(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; }
  function lerpN(a, b, k) { var o = [], i; for (i = 0; i < a.length; i++) o.push(a[i] + (b[i] - a[i]) * k); return o; }
  function norm3(a) { var n = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / n, a[1] / n, a[2] / n]; }

  /* ---------------- the wind ---------------- */

  var wind = [0, 0], drift = [0, 0], windDir = (rWind() < 0.65 ? 1 : -1), windPx = mix(SEA_DRIFT[0], SEA_DRIFT[1], rWind()), windSlant = (rWind() * 2 - 1) * 0.25;
  function blow(dt) { drift[0] += wind[0] * dt; drift[1] += wind[1] * dt; }   // (how far the air has gone: a new window changes the wind, never where the clouds are)
  /* in the air's units a second: the sea's nearest tops drift windPx on the window */
  function aimWind() {
    var zNear = 1 / Math.tan(Math.max(1 * DEG, Math.atan((H - cam.hy) / cam.f)));
    var v = windPx * zNear / cam.f;
    wind[0] = windDir * v * Math.cos(windSlant); wind[1] = v * Math.sin(windSlant);
  }

  /* ---------------- the towers: cumulus rising out of the sea ---------------- */

  var towers = [];
  for (var ti = 0; ti < TOWERS; ti++) towers.push({ k: ti, on: false, p: 0, x: 0, z: 0, R: 1, ht: 1, s: [], off: 0, box: [0, 0, 0, 0] });
  function towerBox(T, p) {
    var o = [0, 0, 0], yTop = -1 + T.ht * (0.25 + 0.75 * p) + 0.3 * T.R, a, b, c;
    a = toWindow(norm3([T.x - T.R * 1.75, yTop, T.z]), [0, 0, 0]);
    b = toWindow(norm3([T.x + T.R * 1.75, yTop, T.z]), [0, 0, 0]);
    c = toWindow(norm3([T.x, -1, T.z - T.R]), o);
    return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), c[1]];
  }
  /* (where a tower is placed: not to rise behind the words; once risen it is never made to sink for them) */
  function hitsWords(b) {
    var m = 36;
    if (stackR && b[2] > stackR[0] - m && b[0] < stackR[2] + m && b[3] > stackR[1] - m && b[1] < stackR[3] + m) return true;
    return false;
  }
  /* a sun or moon standing in view is the sky's own light: no tower rises over it */
  function hidesSun(b) {
    if (!NOW.light) return false;
    var o = [0, 0, 0], D = NOW.discA && NOW.discA.i > 0 ? NOW.discA : (NOW.discB && NOW.discB.i > 0 ? NOW.discB : null), m = 40;
    if (!D) return false;
    toWindow(D.d, o);
    return o[2] > 0.05 && o[0] > b[0] - m && o[0] < b[2] + m && o[1] > b[1] - m && o[1] < b[3] + m;
  }
  function spawn(T) {
    var i, sx, z, x, room, ht, R, d, box, j, ok;
    for (i = 0; i < 16; i++) {
      sx = W * (0.04 + 0.92 * rTower()); z = mix(11, 56, Math.pow(rTower(), 0.8));
      x = (sx - cam.x0) * z * cam.c / cam.f;
      R = 1;
      /* its room: up to the words' foot where it would stand under them, else to near the top */
      room = stackR && sx > stackR[0] - 60 - W * 0.06 && sx < stackR[2] + 60 + W * 0.06 ? stackR[3] + 34 : H * mix(0.1, 0.35, rTower());
      if (room > cam.hy - 12) continue;
      d = fromWindow(sx, room);
      ht = (d[1] / Math.max(d[2], 1e-3) * z + 1) * mix(0.8, 1, rTower());
      if (ht < 0.6) continue;
      ht = Math.min(ht, 9);
      R = clamp(ht * mix(0.42, 0.85, rTower()), 0.45, 5.5);   // (from a towering congestus to a broad mound)
      T.x = x; T.z = z; T.R = R; T.ht = ht;
      box = towerBox(T, 1);
      if (hitsWords(box) || hidesSun(box)) continue;
      ok = true;
      for (j = 0; j < towers.length; j++) {
        var U = towers[j];
        if (U === T || !U.on) continue;
        if (box[2] > U.box[0] - 20 && box[0] < U.box[2] + 20 && Math.abs(U.z - z) < 12) { ok = false; break; }
      }
      if (!ok) continue;
      puffs(T);
      T.on = true; T.p = 0; T.off = rTower() * 40; T.box = box;
      return true;
    }
    return false;
  }
  /* a tower's puffs: a cumulus. A core (three broad spheres, the dome's
     bulk) and nine rounded lobes on the dome's envelope (an upper
     half-ellipsoid as wide as the tower and as tall), more of them high
     up and toward the window, each its own size: a cauliflower crown */
  function puffs(T) {
    var R = T.R, ht = T.ht, a = R * 1.25, b = ht, s = [], i, th, ph, r, k;
    s.push([-0.3 * R, 0.45 * Math.min(b, a), 0, 0.92 * Math.min(R, b * 0.6)]);
    s.push([0.35 * R, 0.35 * Math.min(b, a) + 0.2 * b, mix(-0.2, 0.2, rTower()) * R, 0.85 * Math.min(R, b * 0.55)]);
    s.push([mix(-0.2, 0.2, rTower()) * R, 0.72 * b, 0, 0.62 * Math.min(R, b * 0.5)]);
    for (i = 0; i < 9; i++) {
      k = (i + rTower()) / 9;
      th = Math.acos(1 - k * 0.95) * 0.95;                // from the top down the sides, more near the top
      ph = (i * 2.39996 + rTower()) % (2 * Math.PI);      // around (golden angle), spread
      if (Math.sin(ph) < -0.3) ph = -ph;                  // (lobes mostly on the window's side)
      r = R * mix(0.38, 0.62, rTower()) * (1 - 0.25 * Math.cos(th));
      s.push([a * 0.82 * Math.sin(th) * Math.cos(ph), Math.max(r * 0.6, b * 0.86 * Math.cos(th) + 0.15 * R), a * 0.6 * Math.sin(th) * Math.sin(ph), r]);
    }
    T.s = s;
  }
  function tendTowers(dt, P, still) {
    var i, T, want, b;
    for (i = 0; i < towers.length; i++) {
      T = towers[i];
      want = clamp(P.towers * TOWERS - i, 0, 1);
      if (!T.on) {
        if (want > 0.05 && (still || (T.wait || 0) <= 0)) {
          if (!spawn(T)) T.wait = 2 + 3 * rTower();        // (no room: look again in a few seconds)
          else if (still) T.p = want;
        }
        T.wait = (T.wait || 0) - dt;
        continue;
      }
      T.x += wind[0] * dt; T.z += wind[1] * dt;
      b = towerBox(T, T.p);
      T.box = b;
      if (b[2] < -40 || b[0] > W + 40 || T.z < 8) { T.on = false; T.p = 0; T.wait = 0; continue; }   // gone beyond the edge: free
      /* (once risen, a tower is never made to sink for the words: drifting with the wind it may pass behind them) */
      if (still) T.p = want;
      else T.p = clamp(T.p + clamp(want - T.p, -1, 1) * dt / BUILD * (want > T.p ? 1 : 1.6), 0, 1);
      if (T.p <= 0 && want === 0) { T.on = false; T.wait = 20 + 40 * rTower(); }
    }
  }

  /* ---------------- GL ---------------- */

  var gl = null, ext = {}, progs = {}, vao = null, tex = {}, ready = false, lost = false, cw = 0, ch = 0;
  var HEAD = '#version 300 es\nprecision highp float;\nprecision highp int;\nprecision highp sampler3D;\n';
  var VERT = '#version 300 es\nvoid main() { vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }';
  var HASH = [
    'uvec3 pcg3(uvec3 v) {',
    '  v = v * 1664525u + 1013904223u;',
    '  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;',
    '  v ^= v >> 16u;',
    '  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;',
    '  return v;',
    '}',
    'vec3 rnd3(vec3 c, uint s) { return vec3(pcg3(uvec3(ivec3(c)) + uvec3(s, s * 7u, s * 13u))) * (1.0 / 4294967295.0); }',
    'float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }'
  ].join('\n');

  /* the 3D noise (64 cubed, tiling): billows (Worley, three octaves), finer billows, smooth noise, fine Worley */
  var BAKE3 = HEAD + HASH + [
    'uniform float uZ; uniform uint uSeed; out vec4 o;',
    'float worley(vec3 p, float per) {',
    '  vec3 i = floor(p), f = fract(p); float d = 9.0;',
    '  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {',
    '    vec3 g = vec3(float(x), float(y), float(z));',
    '    vec3 r = g + rnd3(mod(i + g, per), uSeed) - f;',
    '    d = min(d, dot(r, r));',
    '  }',
    '  return sqrt(d);',
    '}',
    'float vn(vec3 p, float per) {',
    '  vec3 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);',
    '  float a = rnd3(mod(i, per), uSeed + 5u).x, b = rnd3(mod(i + vec3(1, 0, 0), per), uSeed + 5u).x,',
    '        c = rnd3(mod(i + vec3(0, 1, 0), per), uSeed + 5u).x, d = rnd3(mod(i + vec3(1, 1, 0), per), uSeed + 5u).x,',
    '        e = rnd3(mod(i + vec3(0, 0, 1), per), uSeed + 5u).x, g = rnd3(mod(i + vec3(1, 0, 1), per), uSeed + 5u).x,',
    '        h = rnd3(mod(i + vec3(0, 1, 1), per), uSeed + 5u).x, k = rnd3(mod(i + vec3(1, 1, 1), per), uSeed + 5u).x;',
    '  return mix(mix(mix(a, b, u.x), mix(c, d, u.x), u.y), mix(mix(e, g, u.x), mix(h, k, u.x), u.y), u.z);',
    '}',
    'void main() {',
    '  vec3 q = vec3(gl_FragCoord.xy / 64.0, uZ);',
    '  float w1 = worley(q * 4.0, 4.0), w2 = worley(q * 8.0, 8.0), w3 = worley(q * 16.0, 16.0);',
    '  float v = vn(q * 4.0, 4.0) * 0.5 + vn(q * 8.0, 8.0) * 0.3 + vn(q * 16.0, 16.0) * 0.2;',
    '  float b1 = 1.0 - (w1 * 0.625 + w2 * 0.25 + w3 * 0.125);',
    '  float b2 = 1.0 - (w2 * 0.7 + w3 * 0.3);',
    '  o = vec4(clamp(mix(b1, v, 0.25) * 1.25 - 0.15, 0.0, 1.0), clamp(b2 * 1.2 - 0.1, 0.0, 1.0), v, clamp(1.0 - w3, 0.0, 1.0));',
    '}'
  ].join('\n');

  /* the 2D noise (256 square, tiling): domes (a union of round caps, smoothly joined), small domes, smooth noise, fine noise */
  var BAKE2 = HEAD + HASH + [
    'uniform uint uSeed; out vec4 o;',
    'float domes(vec2 p, float per, float r0, float r1, uint s) {',
    '  vec2 i = floor(p), f = fract(p); float acc = 0.0, k = 0.09;',
    '  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {',
    '    vec2 g = vec2(float(x), float(y));',
    '    vec3 h = rnd3(vec3(mod(i + g, per), 0.0), s);',
    '    vec2 r = g + h.xy - f;',
    '    float rad = mix(r0, r1, h.z), d2 = dot(r, r);',
    '    if (d2 < rad * rad) acc += exp((sqrt(rad * rad - d2) / r1 - 1.0) / k);',
    '  }',
    '  return acc > 0.0 ? clamp(1.0 + k * log(acc), 0.0, 1.0) : 0.0;',
    '}',
    'float vn(vec2 p, float per, uint s) {',
    '  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);',
    '  float a = rnd3(vec3(mod(i, per), 1.0), s).x, b = rnd3(vec3(mod(i + vec2(1, 0), per), 1.0), s).x,',
    '        c = rnd3(vec3(mod(i + vec2(0, 1), per), 1.0), s).x, d = rnd3(vec3(mod(i + vec2(1, 1), per), 1.0), s).x;',
    '  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);',
    '}',
    'void main() {',
    '  vec2 p = gl_FragCoord.xy / 256.0;',
    '  float a = domes(p * 8.0, 8.0, 0.62, 1.0, uSeed);',
    '  float b = domes(p * 24.0, 24.0, 0.55, 0.95, uSeed + 1u);',
    '  float c = vn(p * 4.0, 4.0, uSeed + 2u) * 0.55 + vn(p * 8.0, 8.0, uSeed + 2u) * 0.3 + vn(p * 16.0, 16.0, uSeed + 2u) * 0.15;',
    '  float d = vn(p * 8.0, 8.0, uSeed + 3u) * 0.45 + vn(p * 16.0, 16.0, uSeed + 3u) * 0.3 + vn(p * 32.0, 32.0, uSeed + 3u) * 0.15 + vn(p * 64.0, 64.0, uSeed + 3u) * 0.1;',
    '  o = vec4(a, b, c, d);',
    '}'
  ].join('\n');

  /* the scene: sky, deck, towers and sea, per pixel, in the air's light (linear) */
  var SCENE = [
    'uniform sampler3D uN3; uniform sampler2D uN2;',
    'uniform vec4 uVp; uniform vec4 uCam; uniform vec2 uC0; uniform float uT; uniform vec2 uDrift; uniform float uPx;',
    'uniform vec3 uL; uniform vec3 uLC; uniform vec3 uSun; uniform vec3 uSk[5]; uniform vec3 uTint; uniform vec4 uTintP;',
    'uniform vec4 uDa; uniform vec4 uDaP; uniform vec3 uDaC; uniform vec4 uDb; uniform vec4 uDbP; uniform vec3 uDbC;',
    'uniform vec3 uAmbU; uniform vec3 uAmbD; uniform vec3 uAlb; uniform vec3 uThick; uniform vec4 uMs;',
    'uniform vec4 uSea; uniform float uSeaL; uniform float uSeaM; uniform vec4 uFog; uniform vec3 uFogC; uniform vec4 uDeck; uniform vec3 uDeckC;',
    'uniform vec4 uFx1; uniform vec4 uFx2; uniform vec4 uFx3; uniform vec3 uGal; uniform vec3 uGc; uniform vec4 uAur; uniform vec4 uBrk;',
    'uniform int uTwN; uniform vec4 uTw[72]; uniform vec4 uTb[6]; uniform vec4 uTx[6];',
    'out vec4 oC;',
    'const vec3 LUM = vec3(0.2126, 0.7152, 0.0722);',
    'const float PI = 3.14159265;',
    'float elev(vec3 rd) { return degrees(asin(clamp(rd.y, -1.0, 1.0))); }',
    'float azim(vec3 rd) { return atan(rd.x, rd.z); }',
    'float ang(vec3 a, vec3 b) { return degrees(acos(clamp(dot(a, b), -1.0, 1.0))); }',
    /* light through cloud: a phase (how much goes on forward), normalised to 1 for no preference */
    'float hgN(float c, float g) { float g2 = g * g; return (1.0 - g2) / pow(max(1.0 + g2 - 2.0 * g * c, 1e-4), 1.5); }',
    /* the colour deep cloud takes: the thick colour, as bright as the light */
    'vec3 deepC() { return uThick * (max(dot(uLC, LUM), 1e-4) / max(dot(uThick, LUM), 1e-4)) * 0.85; }',
    /* the sky's light */
    'vec3 grad(float e) {',
    '  e = max(e, 0.0);',
    '  vec3 c = mix(uSk[0], uSk[1], smoothstep(0.0, 5.0, e));',
    '  c = mix(c, uSk[2], smoothstep(5.0, 15.0, e));',
    '  c = mix(c, uSk[3], smoothstep(15.0, 32.0, e));',
    '  return mix(c, uSk[4], smoothstep(32.0, 49.0, e));',
    '}',
    'vec3 halo(vec3 rd, vec4 D, vec4 P, vec3 C) {',
    '  float cg = max(dot(rd, D.xyz), 0.0);',
    '  vec3 c = C * (P.z * pow(cg, P.y) + P.w * pow(cg, min(P.y * 0.06, 6.0)));',
    '  if (uFx3.z > 0.0 && P.x > 0.0) {',            // the corona: the moon through thin cloud, in rings
    '    float ps = ang(rd, D.xyz);',
    '    if (ps < 7.0) c += C * uFx3.z * 0.15 * (vec3(0.85, 0.9, 1.0) * exp(-ps * ps / 1.2) * 0.9 + vec3(0.95, 0.62, 0.42) * exp(-pow((ps - 1.75) / 0.3, 2.0)) * 0.5',
    '      + vec3(0.4, 0.75, 1.0) * exp(-pow((ps - 2.6) / 0.35, 2.0)) * 0.3 + vec3(0.5, 1.0, 0.6) * exp(-pow((ps - 3.2) / 0.4, 2.0)) * 0.2 + vec3(1.0, 0.55, 0.6) * exp(-pow((ps - 3.9) / 0.45, 2.0)) * 0.22);',
    '  }',
    '  return c;',
    '}',
    'vec3 disc(vec3 rd, vec4 D, vec4 P, vec3 C) {',
    '  if (P.x <= 0.0) return vec3(0.0);',
    '  float cg = dot(rd, D.xyz), r = 1.0 - D.w;',
    '  float limb = clamp((cg - D.w) / r, 0.0, 1.0);',
    '  return C * P.x * smoothstep(D.w - r * 0.3, D.w + r * 0.15, cg) * (0.75 + 0.25 * sqrt(limb));',
    '}',
    /* the Earth's shadow rising opposite a low sun, and the Belt of Venus above it */
    'void belt(vec3 rd, float e, inout vec3 c) {',
    '  if (uFx2.x <= 0.0 || e < -1.0) return;',
    '  float se = elev(uSun), side = pow(clamp(0.5 + 0.5 * dot(normalize(rd.xz + 1e-5), normalize(-uSun.xz + 1e-5)), 0.0, 1.0), 2.0) * uFx2.x;',
    '  float hs = 1.0 + max(-se, 0.0) * 1.1;',
    '  float sh = 1.0 - smoothstep(hs - 0.8, hs + 1.2, e), bl = smoothstep(hs - 0.4, hs + 2.0, e) * (1.0 - smoothstep(hs + 5.0, hs + 13.0, e));',
    '  c = mix(c, c * vec3(0.72, 0.78, 0.95), sh * side * 0.55);',
    '  c += vec3(0.95, 0.6, 0.66) * bl * side * dot(c, LUM) * 0.35;',
    '}',
    /* the 22 degree halo and the sun dogs, in a high veil of ice */
    'vec3 ice(vec3 rd, float e, out float dim) {',
    '  dim = 0.0;',
    '  if (uFx1.z <= 0.0 && uFx1.w <= 0.0) return vec3(0.0);',
    '  float ps = ang(rd, uSun);',
    '  vec3 c = uFx1.z * (vec3(1.0, 0.52, 0.32) * exp(-pow((ps - 21.9) / 0.38, 2.0)) + vec3(0.92, 0.95, 1.0) * step(21.9, ps) * exp(-(ps - 21.9) / 2.4) * 0.5);',
    '  dim = 0.1 * uFx1.z * (1.0 - smoothstep(17.0, 21.5, ps)) * smoothstep(3.0, 9.0, ps);',
    '  float se = elev(uSun), de = e - se, dp = 21.9 + 0.0045 * se * se;',   // (the dogs stand farther out as the sun climbs)
    '  c += uFx1.w * exp(-de * de / 0.8) * (vec3(1.0, 0.35, 0.15) * exp(-pow((ps - dp) / 0.35, 2.0)) + vec3(1.0, 0.85, 0.4) * exp(-pow((ps - dp - 0.55) / 0.4, 2.0)) * 0.9',
    '    + vec3(0.85, 0.92, 1.0) * step(dp, ps) * exp(-(ps - dp) / 3.0) * 0.5) * 1.4;',
    '  return c * dot(uLC, LUM) * 0.3;',
    '}',
    /* a pillar of light over a low sun */
    'vec3 pillar(vec3 rd, float e) {',
    '  if (uFx3.w <= 0.0) return vec3(0.0);',
    '  float se = elev(uSun), up = e - se, da = azim(rd) - atan(uSun.x, uSun.z);',
    '  if (up < 0.0) return vec3(0.0);',
    '  float x = degrees(da) * cos(radians(se));',
    '  return uLC * exp(-x * x / 0.3) * exp(-up / 7.0) * smoothstep(0.0, 1.5, up) * uFx3.w * 0.12;',
    '}',
    /* the Milky Way: a band with a bright core and dark lanes along its middle */
    'vec3 galaxy(vec3 rd, float e) {',
    '  if (uFx2.z <= 0.0 || e < 0.0) return vec3(0.0);',
    '  float b = dot(rd, uGal), l = atan(dot(rd, cross(uGal, uGc)), dot(rd, uGc));',
    '  float band = exp(-b * b / 0.0225), core = exp(-l * l / 0.36) * exp(-b * b / 0.05);',
    '  vec2 q = vec2(l * 3.0, b * 9.0);',
    '  float n = texture(uN2, q * 0.35 + 0.13).b * 0.45 + texture(uN2, q * 1.1 + 0.71).a * 0.35 + texture(uN2, q * 3.3 + 0.29).a * 0.2;',
    '  float lanes = smoothstep(0.4, 0.64, texture(uN2, vec2(l * 0.64, b * 5.6 + 0.3 * texture(uN2, vec2(l * 2.0, 0.4)).b) + 0.37).b) * exp(-pow(b - 0.02 * sin(l * 5.0), 2.0) / 0.003);',
    '  return (vec3(0.9, 0.86, 0.8) * band * (0.25 + 1.1 * n * n) + vec3(1.0, 0.85, 0.65) * core * 1.3) * (1.0 - 0.8 * lanes) * uFx2.z * 0.04 * smoothstep(1.0, 12.0, e);',
    '}',
    /* the aurora: three curtains, farther ones lower and fainter, folding slowly, green below and red above, rayed */
    'vec3 aurora(vec3 rd, float e) {',
    '  if (uFx2.y <= 0.0 || e < 0.5) return vec3(0.0);',
    '  float az = azim(rd); vec3 c = vec3(0.0);',
    '  for (int j = 0; j < 3; j++) {',
    '    float fj = float(j), sc = 1.0 - 0.22 * fj, ph = uAur.x * (0.04 + 0.015 * fj) + uAur.y + fj * 2.1, f1 = 2.2 + fj, f2 = 5.3 + 1.7 * fj;',
    '    float base = uAur.z * sc + 2.0 * fj + sc * (3.5 * sin(az * f1 + ph) + 2.0 * sin(az * f2 - ph * 1.3) + 2.4 * (texture(uN2, vec2(az * 0.6 + fj * 0.31, ph * 0.02)).b - 0.5));',
    '    float slope = abs(3.5 * f1 * cos(az * f1 + ph) + 2.0 * f2 * cos(az * f2 - ph * 1.3)) * sc;',
    '    float fold = 0.65 + 0.7 / (1.0 + slope * 0.12);',      // (brighter where a fold turns edge on)
    '    float hgt = 7.0 + 9.0 * sc, x = e - base;',
    '    if (x < -1.5 || x > hgt * 2.5) continue;',
    '    float rays = 0.3 + 0.7 * pow(texture(uN2, vec2(az * (16.0 + 5.0 * fj) + uAur.x * 0.003, 0.5 + fj * 0.2)).a, 1.6) * (0.6 + 0.4 * texture(uN2, vec2(az * 41.0 - uAur.x * 0.002, 0.27 + fj * 0.1)).b);',
    '    vec3 col = mix(vec3(0.25, 1.0, 0.55), vec3(0.85, 0.25, 0.55), smoothstep(0.25, 1.2, x / hgt));',
    '    c += col * smoothstep(-0.6, 0.25, x) * (exp(-max(x, 0.0) / hgt) + 0.6 * exp(-max(x, 0.0) / (hgt * 0.15))) * rays * fold * (0.85 - 0.25 * fj);',
    '  }',
    '  return c * uFx2.y * 0.09 * smoothstep(0.5, 6.0, e);',
    '}',
    /* noctilucent cloud: fine, bright blue wisps low on the side the sun set */
    'vec3 nlc(vec3 rd, float e) {',
    '  if (uFx2.w <= 0.0 || e < 0.5 || e > 18.0) return vec3(0.0);',
    '  float side = pow(clamp(0.5 + 0.5 * dot(normalize(rd.xz + 1e-5), normalize(uSun.xz + 1e-5)), 0.0, 1.0), 1.5);',
    '  vec2 q = vec2(azim(rd) * 2.2 + uDrift.x * 0.0008, e * 0.09);',
    '  float n = texture(uN2, q * vec2(1.0, 4.0) + 0.21).a * 0.55 + texture(uN2, q * vec2(3.1, 11.0) + 0.53).b * 0.45;',
    '  return vec3(0.55, 0.8, 1.0) * smoothstep(0.52, 0.78, n) * smoothstep(1.0, 4.0, e) * (1.0 - smoothstep(9.0, 17.0, e)) * side * uFx2.w * 0.05;',
    '}',
    'vec3 skyBase(vec3 rd) {',
    '  float e = elev(rd);',
    '  vec3 c = grad(e);',
    '  float cg = dot(rd, uL), low = 1.0 - smoothstep(0.0, 40.0, max(e, 0.0));',
    '  c = mix(c, uTint, clamp(uTintP.x * pow(0.5 + 0.5 * cg, uTintP.y) * (0.3 + 0.7 * low), 0.0, 1.0));',
    '  c *= 1.0 - uTintP.z * max(-cg, 0.0) * (1.0 - 0.5 * low);',
    '  c = mix(c, uFogC, 0.5 * (1.0 - smoothstep(0.0, 5.0, max(e, 0.0))));',
    '  belt(rd, e, c);',
    '  float dim; vec3 ic = ice(rd, e, dim);',
    '  return c * (1.0 - dim) + ic + pillar(rd, e) + galaxy(rd, e) + aurora(rd, e) + nlc(rd, e);',
    '}',
    'vec3 sky(vec3 rd) { return skyBase(rd) + halo(rd, uDa, uDaP, uDaC) + halo(rd, uDb, uDbP, uDbC); }',
    /* the haze far clouds fade into: the horizon's sky, with a third of the glow about the sun */
    'vec3 haze(vec3 rd) { vec3 h = normalize(vec3(rd.x, 0.0, rd.z)); return skyBase(h) + 0.35 * (halo(h, uDa, uDaP, uDaC) + halo(h, uDb, uDbP, uDbC)); }',
    'float fogOf(float t) { return 1.0 - exp(-t * uFog.x); }',
    'float mistOf(float y, float t) { return uFog.y * exp(-max(y + uSea.x - uSea.y * 0.55, 0.0) / uFog.z) * smoothstep(4.0, 24.0, t); }',
    /* a rainbow opposite the sun (six bands each; the secondary reversed and fainter, its dark band between, the
       supernumeraries inside) */
    'vec3 bands(float th, float c0, float dir, float w) {',
    '  return vec3(1.0, 0.1, 0.04) * exp(-pow((th - c0) / w, 2.0)) + vec3(1.0, 0.5, 0.04) * exp(-pow((th - c0 - dir * 0.4) / w, 2.0))',
    '    + vec3(0.8, 0.95, 0.08) * exp(-pow((th - c0 - dir * 0.8) / w, 2.0)) + vec3(0.08, 0.9, 0.25) * exp(-pow((th - c0 - dir * 1.2) / w, 2.0))',
    '    + vec3(0.08, 0.35, 1.0) * exp(-pow((th - c0 - dir * 1.6) / w, 2.0)) + vec3(0.4, 0.12, 0.9) * exp(-pow((th - c0 - dir * 1.95) / w, 2.0));',
    '}',
    'vec3 bow(vec3 rd, out float lift) {',
    '  lift = 0.0;',
    '  if (uFx1.x <= 0.0) return vec3(0.0);',
    '  float th = ang(rd, -uSun);',
    '  if (th > 56.0) return vec3(0.0);',
    '  vec3 c = bands(th, 42.3, -1.0, 0.42) + bands(th, 50.5, 1.0, 0.7) * 0.32',
    '    + vec3(0.5, 0.75, 0.6) * 0.18 * exp(-pow((th - 39.5) / 0.35, 2.0)) + vec3(0.7, 0.45, 0.65) * 0.1 * exp(-pow((th - 38.7) / 0.35, 2.0));',
    '  lift = uFx1.x * (0.1 * (1.0 - smoothstep(37.0, 40.3, th)) - 0.06 * smoothstep(42.6, 43.6, th) * (1.0 - smoothstep(49.4, 50.4, th)));',
    '  return c * uFx1.x * dot(uLC, LUM) * 0.12;',
    '}',
    /* the glory: rings about the point opposite the sun, on the cloud below */
    'vec3 glory(vec3 rd) {',
    '  if (uFx1.y <= 0.0) return vec3(0.0);',
    '  float th = ang(rd, -uSun);',
    '  if (th > 9.0) return vec3(0.0);',
    '  return uFx1.y * (vec3(1.0, 0.97, 0.9) * exp(-th * th / 0.81) * 0.9 + vec3(1.0, 0.65, 0.35) * exp(-pow((th - 1.9) / 0.32, 2.0)) * 0.55',
    '    + vec3(0.45, 0.7, 1.0) * exp(-pow((th - 1.45) / 0.3, 2.0)) * 0.35 + vec3(0.4, 0.95, 0.6) * exp(-pow((th - 2.9) / 0.38, 2.0)) * 0.35',
    '    + vec3(1.0, 0.45, 0.7) * exp(-pow((th - 3.5) / 0.38, 2.0)) * 0.3 + vec3(0.4, 0.8, 0.85) * exp(-pow((th - 4.8) / 0.5, 2.0)) * 0.2',
    '    + vec3(0.9, 0.5, 0.75) * exp(-pow((th - 5.5) / 0.5, 2.0)) * 0.15);',
    '}',
    /* distant showers: veils hanging under the deck, streaked, drifting */
    'float showers(vec3 rd, float e) {',
    '  if (uFx3.x <= 0.0 || e < -3.0 || e > 14.0) return 0.0;',
    '  float az = azim(rd);',
    '  float m = smoothstep(0.45, 0.75, texture(uN2, vec2(az * 0.9 - uDrift.x * 0.0012, 0.61)).b);',
    '  float st = 0.65 + 0.35 * texture(uN2, vec2(az * 14.0 - uDrift.x * 0.002, e * 0.012 + 0.3)).a;',
    '  float top = 1.0 - smoothstep(4.0, 12.0, e + 3.0 * texture(uN2, vec2(az * 3.0, 0.83)).b);',
    '  return m * st * top * smoothstep(-3.0, 1.0, e) * uFx3.x;',
    '}',
    /* the sea of cloud */
    'float seaH(vec2 xz, float lod, float t) {',
    '  vec2 q = xz - uDrift;',
    '  float a = textureLod(uN2, q * 0.05, lod).r;',
    '  float fine = 1.0 - smoothstep(10.0, 28.0, t);',
    '  float b = fine > 0.0 ? textureLod(uN2, q * 0.17 + vec2(0.31, 0.67), lod + 1.4).g : 0.5;',
    '  float m = textureLod(uN2, q * 0.011 + vec2(0.71, 0.13), 0.0).b;',
    '  return -uSea.x + uSea.y * (0.84 * a + 0.16 * mix(0.5, b, fine)) * mix(1.0 - uSea.w, 1.0, smoothstep(0.25, 0.75, m));',
    '}',
    'vec3 seaShade(vec3 p, float h, vec3 rd, float t, float den, float lod, vec3 hz) {',
    '  float e = 0.03 + t * uPx * 3.0;',
    '  vec3 n = normalize(vec3(h - seaH(p.xz + vec2(e, 0.0), lod, t), e, h - seaH(p.xz + vec2(0.0, e), lod, t)));',
    '  float hf = clamp((h + uSea.x) / max(uSea.y, 1e-3), 0.0, 1.0);',
    '  float wrap = clamp((dot(n, uL) + 0.5) / 1.5, 0.0, 1.0);',
    '  float lh = max(length(uL.xz), 1e-3); vec2 ld = uL.xz / lh; float tl = uL.y / lh;',
    '  float sh = 1.0;',
    '  for (int i = 1; i <= 2; i++) {',
    '    float s = float(i) * (0.35 + t * 0.008);',
    '    float hq = seaH(p.xz + ld * s, lod + 0.5, t);',
    '    sh *= clamp(1.0 - (hq - (h + s * tl)) * 2.2 / max(uSea.y, 1e-3), 0.3, 1.0);',
    '  }',
    '  float Tl = exp(-(1.0 - sh) * 2.5);',                                         // (through the cloud toward the light)
    '  vec3 lit = mix(deepC(), uLC, Tl) * uSeaL;',                                  // thin: the light's colour; deep: the sky's
    '  if (uBrk.w > 0.0) { vec2 dq = p.xz - uBrk.xy; float sp = exp(-dot(dq, dq) / (uBrk.z * uBrk.z)) * uBrk.w; lit = mix(lit, lit * vec3(1.0, 0.86, 0.66), sp * 0.6) * (1.0 + sp * 2.2); }',
    '  vec3 amb = mix(uAmbD, uAmbU, 0.5 + 0.5 * n.y) * mix(0.42, 1.0, hf * hf) * (1.0 + uMs.z * (1.0 - hf) * 0.35);',
    '  float cs = dot(rd, uL);',
    '  vec3 c = uAlb * (lit * wrap * (0.55 + 0.45 * Tl) + amb) + uLC * uSeaL * hgN(cs, 0.75) * (1.0 - den * 0.8) * (0.3 + 0.7 * Tl) * (0.4 + 0.6 * hf) * 0.05;',
    '  c += uLC * glory(rd) * 0.5 * (0.5 + 0.5 * hf);',
    '  return mix(mix(c, hz, clamp(fogOf(t) + mistOf(p.y, t) * 0.5, 0.0, 1.0)), uSk[2], uSeaM);',   // (at a twilight, the sky's own light)
    '}',
    'void sea(vec3 rd, vec3 hz, float jit, out vec3 acc, out float T, out float tHit) {',
    '  acc = vec3(0.0); T = 1.0; tHit = 1e6;',
    '  if (rd.y > -0.0004) return;',
    '  float t = (-uSea.x + uSea.y * 1.02) / rd.y;',
    '  t *= 1.0 + jit * 0.02;',
    '  for (int i = 0; i < 64; i++) {',
    '    if (T < 0.03 || t > 600.0) break;',
    '    vec3 p = rd * t;',
    '    float lod = log2(max(t * uPx * 0.05 * 256.0 * 1.5, 1.0));',
    '    float h = seaH(p.xz, lod, t);',
    '    float sf = uSea.z * (1.0 + t * 0.04) + t * uPx * 1.5;',
    '    float d = p.y - h;',
    '    if (d > sf) { t += clamp((d - 0.5 * sf) / -rd.y * 0.6, 0.015 + t * 0.006, 0.25 + t * 0.08); continue; }',
    '    float den = clamp(0.5 - d / (2.0 * sf), 0.0, 1.0);',
    '    float dt = clamp(sf * 0.4 / -rd.y, 0.01, 0.08 + t * 0.03);',
    '    float a = 1.0 - exp(-den * dt * 4.0 / sf);',
    '    if (T > 0.5 && T * (1.0 - a) <= 0.5) tHit = t;',
    '    acc += T * a * seaShade(p, h, rd, t, den, lod, hz);',
    '    T *= 1.0 - a;',
    '    t += dt;',
    '  }',
    '  if (tHit > 1e5) tHit = t;',
    '  acc += T * hz; T = 0.0;',
    '}',
    /* the towers */
    'float smin(float a, float b, float k) { float h = max(k - abs(a - b), 0.0) / k; return min(a, b) - h * h * k * 0.25; }',
    'float tSdf(vec3 p, int k) {',
    '  float d = 1e5;',
    '  for (int i = 0; i < 12; i++) { vec4 s = uTw[k * 12 + i]; if (s.w > 0.0) d = smin(d, length(p - s.xyz) - s.w, s.w * 0.38); }',
    '  return d;',
    '}',
    'float tSdfN(vec3 p, int k, float lod) {',
    '  float R = uTx[k].x, d = tSdf(p, k);',
    '  if (d > R * 0.45) return d;',
    '  vec3 q = p / R * 0.42 + vec3(uTx[k].w, -uT * 0.003, uTx[k].w * 1.7);',
    '  float n = textureLod(uN3, q, lod).r * 0.75 + textureLod(uN3, q * 2.3, lod + 1.5).g * 0.25;',
    '  return d + (0.5 - n) * R * 0.22;',
    '}',
    /* a tower lit as cloud: light carried on through it (octaves of scattering: dimmer, deeper, less forward), its
       colour the light's where thin and the sky's where deep, crevices lit by the cloud about them, the edge toward
       the light silvered, thin cloud by the sun in pastel */
    'vec3 tShade(vec3 p, vec3 rd, int k, float d, float sf, float t, float lod, vec3 hz) {',
    '  float R = uTx[k].x, e = sf * 0.7 + R * 0.025;',
    '  vec2 g = vec2(1.0, -1.0);',
    '  vec3 n = normalize(g.xyy * tSdfN(p + g.xyy * e, k, lod) + g.yyx * tSdfN(p + g.yyx * e, k, lod) + g.yxy * tSdfN(p + g.yxy * e, k, lod) + g.xxx * tSdfN(p + g.xxx * e, k, lod));',
    '  float wrap = clamp((dot(n, uL) + 0.45) / 1.45, 0.0, 1.0);',
    '  float s1 = tSdfN(p + uL * R * 0.3, k, lod + 1.0), s2 = tSdfN(p + uL * R * 0.85, k, lod + 1.5);',
    '  float tau = max(0.0, -s1) / (R * 0.3) * 1.6 + max(0.0, -s2) / (R * 0.85) * 1.6;',
    '  float cs = dot(rd, uL), ms = 0.0, aw = 1.0, bw = 1.0, gw = uMs.y;',
    '  for (int o = 0; o < 3; o++) { ms += aw * exp(-tau * bw) * mix(hgN(cs, gw), hgN(cs, -0.25 * gw), 0.3); aw *= 0.5; bw *= 0.5; gw *= 0.6; }',
    '  float Tl = exp(-tau), wrapL = clamp((dot(n, uL) + 0.3) / 1.3, 0.0, 1.0);',
    '  float hgt = clamp((p.y - uTx[k].y) / max(uTx[k].z - uTx[k].y, 1e-3), 0.0, 1.0);',
    '  float crev = clamp(1.0 - tSdf(p + n * R * 0.22, k) / (R * 0.22), 0.0, 1.0);',
    '  vec3 sk = mix(uAmbD, uAmbU, 0.5 + 0.5 * n.y);',
    '  vec3 shade = mix(sk, uThick * (dot(sk, LUM) / max(dot(uThick, LUM), 1e-4)), 0.65) * mix(0.55, 1.0, hgt) * (1.0 + uMs.z * crev) * 0.85;',
    '  vec3 direct = mix(deepC(), uLC, Tl) * wrapL * (0.25 + 0.75 * Tl) * (0.6 + 0.3 * min(ms * uMs.x, 2.0));',
    '  float thin = clamp(0.5 + d / (2.0 * sf), 0.0, 1.0);',
    '  vec3 c = uAlb * (direct + shade) + uLC * uMs.z * crev * 0.06;',
    '  c += uLC * hgN(cs, 0.82) * thin * Tl * 0.03;',
    '  float near = smoothstep(0.93, 0.995, dot(rd, uSun));',
    '  if (uMs.w > 0.0 && near > 0.0) c += uLC * (0.5 + 0.5 * cos(6.2832 * (vec3(0.0, 0.33, 0.67) + thin * 1.7 + hgt))) * near * thin * uMs.w * 0.3;',
    '  return mix(c, hz, clamp(fogOf(t * 0.4) + mistOf(p.y, t), 0.0, 1.0));',
    '}',
    'void tower(int k, vec3 rd, float tMax, vec3 hz, float jit, inout vec3 acc, inout float T) {',
    '  vec4 b = uTb[k];',
    '  float bb = dot(b.xyz, rd), c = dot(b.xyz, b.xyz) - b.w * b.w, q = bb * bb - c;',
    '  if (q <= 0.0) return;',
    '  q = sqrt(q);',
    '  float t1 = min(bb + q, tMax), t = max(bb - q, 0.0);',
    '  if (t >= t1) return;',
    '  float R = uTx[k].x;',
    '  t += jit * R * 0.05;',
    '  for (int i = 0; i < 56; i++) {',
    '    if (t > t1 || T < 0.03) break;',
    '    vec3 p = rd * t;',
    '    float lod = log2(max(t * uPx * 0.45 / R * 64.0, 1.0));',
    '    float sf = R * 0.05 + t * uPx * 1.5;',
    '    float d = tSdfN(p, k, lod) + max(0.0, uTx[k].y + R * 0.35 - p.y) * 0.6;',
    '    if (d > sf) { t += max(d - 0.5 * sf, R * 0.02); continue; }',
    '    float den = clamp(0.5 - d / (2.0 * sf), 0.0, 1.0), dt = sf * 0.6;',
    '    float a = 1.0 - exp(-den * dt * 4.5 / sf);',
    '    acc += T * a * tShade(p, rd, k, d, sf, t, lod, hz);',
    '    T *= 1.0 - a;',
    '    t += dt;',
    '  }',
    '}',
    /* the high deck: streaks, or an overcast, or a veil of ice */
    'vec4 deck(vec3 rd, vec3 bg) {',
    '  if (rd.y < 0.002 || uDeck.z <= 0.0) return vec4(0.0);',
    '  float t = uDeck.x / rd.y;',
    '  vec2 q = rd.xz * t - uDrift * 1.8;',
    '  float lod = log2(max(t * uPx / max(rd.y, 0.05) * 0.05 * 256.0, 1.0));',
    '  float a = textureLod(uN2, q * vec2(0.024, 0.06), lod).a, b = textureLod(uN2, q * vec2(0.075, 0.13) + 0.37, lod + 1.0).b;',
    '  float n = a * 0.72 + b * 0.28;',
    '  float cov = smoothstep(1.0 - uDeck.y, 1.0 - uDeck.y + 0.3, n);',
    '  float fwd = hgN(dot(rd, uL), 0.7) * 0.06;',
    '  vec3 c = mix(uDeckC, uDeckC * deepC() / max(dot(deepC(), LUM), 1e-3) * dot(uDeckC, LUM), cov * 0.3) * (1.0 - uDeck.w * cov) + uLC * fwd * (1.0 - cov * 0.6) * 0.6;',
    '  c = mix(c, bg, 1.0 - exp(-t * uFog.x * 0.6));',
    '  return vec4(c, cov * uDeck.z);',
    '}',
    'void main() {',
    '  vec2 fc = gl_FragCoord.xy / uVp.xy;',
    '  vec2 s = vec2(fc.x * uVp.z, (1.0 - fc.y) * uVp.w);',
    '  vec3 dc = vec3(s.x - uC0.x, uC0.y - s.y, uCam.x);',
    '  vec3 rd = normalize(vec3(dc.x, dc.y * uCam.y + dc.z * uCam.z, dc.z * uCam.y - dc.y * uCam.z));',
    '  float jit = ign(gl_FragCoord.xy);',
    '  vec3 hz = haze(rd);',
    '  vec3 sAcc; float sT, tSea;',
    '  sea(rd, hz, jit, sAcc, sT, tSea);',
    '  vec3 acc = vec3(0.0); float T = 1.0;',
    '  for (int k = 0; k < 6; k++) { if (k >= uTwN) break; tower(k, rd, tSea, hz, jit, acc, T); }',
    '  vec3 sk = sky(rd), bg = sk + disc(rd, uDa, uDaP, uDaC) + disc(rd, uDb, uDbP, uDbC);',
    '  vec4 dk = deck(rd, sk);',
    '  bg = mix(bg, dk.rgb, dk.a);',
    '  float e = elev(rd), sw = showers(rd, e), lift;',            // the showers far off, and the bow standing on them
    '  vec3 bw = bow(rd, lift);',
    '  bg = mix(bg, uDeckC * 0.82, sw * 0.45);',
    '  bg = bg * (1.0 + lift) + bw * (1.0 - dk.a * 0.5) * (0.6 + 0.6 * sw);',
    '  vec3 far = sAcc + sT * bg + bw * 0.5 * smoothstep(15.0, 60.0, tSea) * step(rd.y, 0.0);',
    '  vec3 col = acc + T * far;',
    '  oC = vec4(ENC(col), T * sT * (1.0 - dk.a));',
    '}'
  ].join('\n');

  /* light shafts: from the sky seen near the sun, toward it (half size) */
  var SHAFT = [
    'uniform sampler2D uS; uniform vec2 uRes; uniform vec2 uSun; uniform vec4 uSh; out vec4 o;',
    'void main() {',
    '  vec2 uv = gl_FragCoord.xy / uRes, d = uSun - uv;',
    '  float L = length(d * vec2(uSh.z, 1.0));',
    '  vec2 st = d / 24.0 * min(1.0, uSh.x * 2.5 / max(L, 1e-4));',
    '  vec2 p = uv + st * ign(gl_FragCoord.xy);',
    '  float w = 1.0, acc = 0.0;',
    '  for (int i = 0; i < 24; i++) {',
    '    float near = 1.0 - smoothstep(0.0, uSh.x, length((p - uSun) * vec2(uSh.z, 1.0)));',
    '    acc += textureLod(uS, p, 0.0).a * near * w;',
    '    w *= uSh.y; p += st;',
    '  }',
    '  o = vec4(acc / 24.0);',
    '}'
  ].join('\n');
  /* the glow: down, by halves, the bright part only on the first (dual filter) */
  var DOWN = [
    'uniform sampler2D uS; uniform vec2 uRes; uniform vec2 uHalf; uniform float uThr; out vec4 o;',
    'vec3 tap(vec2 uv) { return max(DEC(textureLod(uS, uv, 0.0).rgb) - uThr, 0.0); }',
    'void main() {',
    '  vec2 uv = gl_FragCoord.xy / uRes;',
    '  vec3 s = tap(uv) * 4.0 + tap(uv - uHalf) + tap(uv + uHalf) + tap(uv + vec2(uHalf.x, -uHalf.y)) + tap(uv - vec2(uHalf.x, -uHalf.y));',
    '  o = vec4(ENC(s / 8.0), 1.0);',
    '}'
  ].join('\n');
  var UP = [
    'uniform sampler2D uS; uniform sampler2D uAdd; uniform vec2 uRes; uniform vec2 uHalf; out vec4 o;',
    'vec3 tap(vec2 uv) { return DEC(textureLod(uS, uv, 0.0).rgb); }',
    'void main() {',
    '  vec2 uv = gl_FragCoord.xy / uRes, h = uHalf;',
    '  vec3 s = tap(uv + vec2(-2.0 * h.x, 0.0)) + tap(uv + vec2(2.0 * h.x, 0.0)) + tap(uv + vec2(0.0, 2.0 * h.y)) + tap(uv + vec2(0.0, -2.0 * h.y))',
    '         + 2.0 * (tap(uv + h) + tap(uv - h) + tap(uv + vec2(h.x, -h.y)) + tap(uv + vec2(-h.x, h.y)));',
    '  o = vec4(ENC(s / 12.0 + DEC(textureLod(uAdd, uv, 0.0).rgb)), 1.0);',
    '}'
  ].join('\n');
  /* the cloud frame, finished: shafts and glow added, the highlights' shoulder (by the brightest channel, so a hue
     keeps its hue as it brightens, and past white eases toward white), a light-words sky's ceiling (its own light
     eased under OKLab L ceil by a soft shoulder, hue kept, the same everywhere on the window but in a moon's
     footprint), dithered before it is stored in 8 bits */
  var FINISH = [
    'uniform sampler2D uS; uniform sampler2D uSh; uniform sampler2D uBl; uniform vec2 uRes; uniform vec3 uShC; uniform vec4 uPost; out vec4 o;',
    'uniform vec3 uCeil; uniform vec4 uFoot; uniform vec2 uWin; uniform vec4 uCam; uniform vec2 uC0;',
    'vec3 shoulder(vec3 x) {',
    '  float m = max(max(x.r, x.g), x.b);',
    '  if (m <= 0.82) return x;',
    '  float s = 0.82 + 0.18 * (1.0 - exp(-(m - 0.82) / 0.18));',
    '  return mix(x * (s / m), vec3(s), clamp((m - 1.0) / 2.0, 0.0, 1.0) * 0.6);',
    '}',
    'float okL(vec3 c) {',
    '  vec3 q = pow(max(vec3(dot(c, vec3(0.4122214708, 0.5363325363, 0.0514459929)), dot(c, vec3(0.2119034982, 0.6806995451, 0.1073969566)),',
    '    dot(c, vec3(0.0883024619, 0.2817188376, 0.6299787005))), 0.0), vec3(1.0 / 3.0));',
    '  return dot(q, vec3(0.2104542553, 0.7936177850, -0.0040720468));',
    '}',
    'void main() {',
    '  vec2 uv = gl_FragCoord.xy / uRes;',
    '  vec4 s = textureLod(uS, uv, 0.0);',
    '  vec3 c = DEC(s.rgb) + uShC * textureLod(uSh, uv, 0.0).r * uPost.x + DEC(textureLod(uBl, uv, 0.0).rgb) * uPost.y;',
    '  c = shoulder(max(c * uPost.z, 0.0));',
    '  float Y = dot(c, vec3(0.2126, 0.7152, 0.0722));',
    '  c = clamp(mix(vec3(Y), c, uPost.w), 0.0, 1.0);',
    '  if (uCeil.x - uCeil.y < 1.0) {',                    // (engaged as its knee comes under white: no step as a change brings it in)
    '    float L = okL(c), K = uCeil.x - uCeil.y;',
    '    if (L > K) {',
    '      vec2 p = vec2(uv.x * uWin.x, (1.0 - uv.y) * uWin.y);',
    '      vec3 dc = vec3(p.x - uC0.x, uC0.y - p.y, uCam.x);',
    '      vec3 rd = normalize(vec3(dc.x, dc.y * uCam.y + dc.z * uCam.z, dc.z * uCam.y - dc.y * uCam.z));',
    '      float keep = uFoot.w * (1.0 - smoothstep(uCeil.z - 0.5, uCeil.z, degrees(acos(clamp(dot(rd, uFoot.xyz), -1.0, 1.0)))));',
    '      c = mix(c * pow((K + uCeil.y * (1.0 - exp(-(L - K) / uCeil.y))) / L, 3.0), c, keep);',
    '    }',
    '  }',
    '  vec3 e = mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));',
    '  e = clamp(e + (ign(gl_FragCoord.xy) + ign(gl_FragCoord.xy + vec2(37.0, 11.0)) - 1.0) / 255.0, 0.0, 1.0);',
    '  o = vec4(mix(e / 12.92, pow((e + 0.055) / 1.055, vec3(2.4)), step(0.04045, e)), s.a);',
    '}'
  ].join('\n');
  /* what was drawn where the words stand (and the window's top edge): the credit's darkest, lightest, mean and
     spread (0, 1, 2, 4), the links' darkest and lightest (5, 7), the name's (6, 8), the top colour (3) */
  var STATS = [
    'uniform sampler2D uF; uniform vec4 uRs; uniform vec4 uRl; uniform vec4 uRn; out vec4 o;',
    'void main() {',
    '  int i = int(gl_FragCoord.x);',
    '  if (i >= 5) {',
    '    vec4 r = i == 5 || i == 7 ? uRl : uRn; float mn = 1.0, mx = 0.0;',
    '    for (int y = 0; y < 8; y++) for (int x = 0; x < 16; x++) {',
    '      float Y = dot(textureLod(uF, mix(r.xy, r.zw, (vec2(float(x), float(y)) + 0.5) / vec2(16.0, 8.0)), 0.0).rgb, vec3(0.2126, 0.7152, 0.0722));',
    '      mn = min(mn, Y); mx = max(mx, Y);',
    '    }',
    '    o = vec4(sqrt(i == 5 || i == 6 ? mn : mx), 0.0, 0.0, 1.0); return;',
    '  }',
    '  if (i == 3) {',
    '    vec3 c = vec3(0.0); float y0 = 0.995;',
    '    for (int x = 0; x < 16; x++) c += textureLod(uF, vec2((float(x) + 0.5) / 16.0, y0), 0.0).rgb;',
    '    c /= 16.0;',
    '    o = vec4(pow(c, vec3(1.0 / 2.2)), 1.0); return;',
    '  }',
    '  vec4 r = uRs;',
    '  float mn = 1.0, mx = 0.0, sm = 0.0, sq = 0.0;',
    '  for (int y = 0; y < 12; y++) for (int x = 0; x < 16; x++) {',
    '    vec2 uv = mix(r.xy, r.zw, (vec2(float(x), float(y)) + 0.5) / vec2(16.0, 12.0));',
    '    float Y = dot(textureLod(uF, uv, 0.0).rgb, vec3(0.2126, 0.7152, 0.0722));',
    '    mn = min(mn, Y); mx = max(mx, Y); sm += Y;',
    '  }',
    '  sm /= 192.0;',
    '  if (i == 4) for (int y = 0; y < 12; y++) for (int x = 0; x < 16; x++) {',
    '    vec2 uv = mix(r.xy, r.zw, (vec2(float(x), float(y)) + 0.5) / vec2(16.0, 12.0));',
    '    float Y = dot(textureLod(uF, uv, 0.0).rgb, vec3(0.2126, 0.7152, 0.0722)) - sm;',
    '    sq += Y * Y;',
    '  }',
    '  float v = i == 0 ? mn : (i == 1 ? mx : (i == 2 ? sm : sqrt(sq / 192.0)));',
    '  o = vec4(sqrt(v), 0.0, 0.0, 1.0);',
    '}'
  ].join('\n');
  /* where the words stand, for dark ink's lift: about the stack (the name and the credit, r) and the links (g), a
     field as wide as the window, falling off softly; at the words themselves (b, a), the floor's core. Drawn when
     the page moves (the sky is never drawn by it: only the window pass reads it) */
  var MASK = [
    'uniform vec4 uVp; uniform vec4 uR[4]; uniform vec4 uFe; out vec4 o;',
    'float dist(vec2 p, vec4 r) { vec2 d = max(vec2(r.x - p.x, r.y - p.y), vec2(p.x - r.z, p.y - r.w)); return length(max(d, 0.0)); }',
    'float field(vec2 p, vec4 r, float fe) { if (r.z <= r.x) return 0.0; float q = dist(p, r) / fe; return exp(-4.5 * q * q); }',
    'float core(vec2 p, vec4 r, float m) { if (r.z <= r.x) return 0.0; return 1.0 - smoothstep(m - 2.0, m + 2.0, dist(p, r)); }',
    'void main() {',
    '  vec2 fc = gl_FragCoord.xy / uVp.xy, p = vec2(fc.x * uVp.z, (1.0 - fc.y) * uVp.w);',
    '  o = vec4(max(field(p, uR[0], uFe.x), field(p, uR[1], uFe.x)), max(field(p, uR[2], uFe.y), field(p, uR[3], uFe.y)),',
    '    max(core(p, uR[0], uFe.z), core(p, uR[1], uFe.z)), max(core(p, uR[2], uFe.w), core(p, uR[3], uFe.w)));',
    '}'
  ].join('\n');
  /* the window: two cloud frames crossfaded, the stars (twinkling slowly; crowded in the galaxy's band), light
     drifting in the air, the rain, all of them everywhere, and under dark ink its lift */
  var SHOW = HASH + [
    'uniform sampler2D uA; uniform sampler2D uB; uniform sampler2D uM; uniform float uK; uniform vec4 uVp;',
    'uniform vec2 uFloor; uniform vec2 uGain; uniform float uStTop;',
    /* (under dark ink, where the ground would break it, the light is raised: about each group of words by the gain
       its own darkest ground needs, eased out across a field as wide as the window, so it reads as the light
       brightening, not as a shape; at the words themselves no darker than the floor, a last hold for a dark thread
       the samples step over. A gain of 1 or more, and a floor: nothing here lowers any light) */
    'float lift(float Y, float fl, float g, float m, float c) { return max(Y * mix(1.0, g, m), mix(Y, max(Y, fl), c)); }',
    'uniform vec4 uSt; uniform vec4 uRn; uniform vec3 uRnC; uniform vec4 uCam; uniform vec2 uC0; uniform vec3 uGal; uniform float uGx;',
    'uniform vec4 uMo; uniform vec3 uMoC; uniform float uTm; out vec4 o;',
    'vec3 h32(vec2 c, float s) { return rnd3(vec3(mod(c, 4096.0) + 4096.0, s), 17u); }',
    'float stars(vec2 p, float dens) {',
    '  vec2 c = floor(p / 23.0);',
    '  vec3 h = h32(c, uSt.y);',
    '  if (h.x > 0.45 * dens) return 0.0;',
    '  vec2 sp = (c + 0.15 + 0.7 * h.yz) * 23.0;',
    '  float b = pow(fract(h.x * 7.31 + h.y * 3.17), 6.0) * 0.95 + 0.07;',
    '  b *= 1.0 + 0.22 * sin(uTm * (1.1 + 2.3 * h.y) + h.z * 6.2832);',
    '  float r = mix(0.45, 1.0, b) * uSt.w, d = length(p - sp);',
    '  return b * exp(-d * d / (r * r));',
    '}',
    'float crowd(vec2 p, float dens) {',
    '  vec2 c = floor(p / 7.0);',
    '  vec3 h = h32(c, uSt.y + 31.0);',
    '  if (h.x > 0.5 * dens) return 0.0;',
    '  float d = length(p - (c + 0.2 + 0.6 * h.yz) * 7.0);',
    '  return (0.2 + 0.3 * h.y) * exp(-d * d / (0.5 * uSt.w * uSt.w));',
    '}',
    'float motes(vec2 p) {',
    '  vec2 q = p + vec2(-uTm * 5.0 * uMo.y, uTm * 2.2);',
    '  vec2 c = floor(q / 90.0); vec3 h = h32(c, 71.0);',
    '  if (h.x > 0.14) return 0.0;',
    '  vec2 sp = (c + 0.2 + 0.6 * h.yz) * 90.0 + vec2(sin(uTm * 0.3 + h.y * 6.28), cos(uTm * 0.23 + h.z * 6.28)) * 6.0;',
    '  float d = length(q - sp);',
    '  return exp(-d * d / 5.0) * (0.55 + 0.45 * sin(uTm * (0.4 + 0.5 * h.y) + h.z * 6.28)) * (0.4 + 0.6 * h.y);',
    '}',
    'float rain(vec2 p, float layer) {',
    '  float sl = uRn.z, cs = cos(sl), sn = sin(sl);',
    '  vec2 q = vec2(p.x * cs - p.y * sn, p.x * sn + p.y * cs);',
    '  float w = mix(9.0, 13.0, layer), col = floor(q.x / w);',
    '  vec3 h = h32(vec2(col, 37.0 + layer * 41.0), 911.0);',
    '  if (h.x > mix(0.32, 0.5, layer)) return 0.0;',
    '  float per = mix(380.0, 640.0, h.y), speed = mix(780.0, 1150.0, layer) * mix(0.85, 1.15, h.z);',
    '  float rel = mod(uRn.y / 12.0 * speed + h.y * per * 3.0 - q.y, per), len = mix(16.0, 30.0, layer);',
    '  float along = rel < len ? 1.0 - rel / len : 0.0;',
    '  float x = q.x - (col + 0.5 + (h.z - 0.5) * 0.5) * w;',
    '  return along * exp(-x * x / mix(0.22, 0.4, layer)) * mix(0.55, 1.0, layer);',
    '}',
    'void main() {',
    '  vec2 fc = gl_FragCoord.xy / uVp.xy;',
    '  vec2 p = vec2(fc.x * uVp.z, (1.0 - fc.y) * uVp.w);',
    '  vec4 c = mix(texture(uA, fc), texture(uB, fc), uK);',
    '  vec3 col = c.rgb;',
    '  vec4 mk = texture(uM, fc);',
    '  if (uSt.x > 0.0) {',
    '    float band = 0.0;',
    '    if (uGx > 0.0) {',
    '      vec3 dc = vec3(p.x - uC0.x, uC0.y - p.y, uCam.x);',
    '      vec3 rd = normalize(vec3(dc.x, dc.y * uCam.y + dc.z * uCam.z, dc.z * uCam.y - dc.y * uCam.z));',
    '      band = exp(-pow(dot(rd, uGal), 2.0) / 0.03) * uGx;',
    '    }',
    '    float s = (stars(p, 1.0 + band) + crowd(p, band)) * uSt.x * c.a * (1.0 - smoothstep(uSt.z - 70.0, uSt.z + 2.0, p.y)) * 0.94;',
    /* (the stars' light bounded at the source, one way for every star on the whole sky: softly, into the room the
       sky's own light leaves under their top, so none shines above it, nor above the light ceiling) */
    '    float head = max(uStTop - dot(col, vec3(0.2126, 0.7152, 0.0722)), 0.0);',
    '    col += vec3(0.92, 0.94, 1.0) / 0.94 * head * (1.0 - exp(-s / max(head, 1e-5)));',
    '  }',
    '  if (uMo.x > 0.0) col += uMoC * motes(p) * uMo.x * 0.25 * (0.35 + 0.65 * exp(-length(p - uMo.zw) / (0.45 * uVp.z)));',
    '  if (uRn.x > 0.0) { float r = rain(p, 0.0) * 0.6 + rain(p, 1.0); col = mix(col, uRnC, clamp(r * uRn.x * 0.32, 0.0, 1.0)); }',
    '  float Y = dot(col, vec3(0.2126, 0.7152, 0.0722));',
    '  float up = max(lift(Y, uFloor.x, uGain.x, mk.r, mk.b), lift(Y, uFloor.y, uGain.y, mk.g, mk.a));',
    '  col *= up / max(Y, 1e-4);',
    '  col = clamp(col, 0.0, 1.0);',
    '  vec3 e = mix(col * 12.92, 1.055 * pow(col, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, col));',
    '  float n = ign(gl_FragCoord.xy) + ign(gl_FragCoord.xy + vec2(17.0, 59.0)) - 1.0;',
    '  o = vec4(e + n / 255.0, 1.0);',
    '}'
  ].join('\n');

  function setup() {
    gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'low-power' });
    if (!gl) return false;
    ext.float = !!gl.getExtension('EXT_color_buffer_float');
    FORMATS = { rgba8: [gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE], rgba16f: [gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT], srgb: [gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE] };
    ext.par = gl.getExtension('KHR_parallel_shader_compile');
    var info = gl.getExtension('WEBGL_debug_renderer_info'), who = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(who)) { frozen = true; level = LADDER.length - 1; }   // (drawn on the CPU: the still sky, drawn once, small)
    var codec = ext.float ? '#define ENC(c) (c)\n#define DEC(c) (c)\n'
                          : '#define ENC(c) sqrt(clamp((c) / (1.0 + (c)), 0.0, 1.0))\n#define DEC(c) ((c) * (c) / max(1.0 - (c) * (c), 1e-4))\n';
    var vs = compile(gl.VERTEX_SHADER, VERT);
    progs.bake3 = link(vs, BAKE3);
    progs.bake2 = link(vs, BAKE2);
    progs.scene = link(vs, HEAD + codec + HASH + '\n' + SCENE);
    progs.shaft = link(vs, HEAD + codec + HASH + '\n' + SHAFT);
    progs.down = link(vs, HEAD + codec + DOWN);
    progs.up = link(vs, HEAD + codec + UP);
    progs.finish = link(vs, HEAD + codec + HASH + '\n' + FINISH);
    progs.stats = link(vs, HEAD + STATS);
    progs.mask = link(vs, HEAD + MASK);
    progs.show = link(vs, HEAD + SHOW);
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    return true;
  }
  function compile(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
  function link(vs, fsrc) {
    var p = gl.createProgram(), fs = compile(gl.FRAGMENT_SHADER, fsrc);
    gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
    p.fs = fs; p.u = {};
    return p;
  }
  /* every program linked? (without waiting, where the browser can say so) */
  function linked() {
    var k, p;
    for (k in progs) {
      p = progs[k];
      if (ext.par && !gl.getProgramParameter(p, ext.par.COMPLETION_STATUS_KHR)) return 0;
    }
    for (k in progs) {
      p = progs[k];
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        if (window.console) console.error('sky: ' + k + ': ' + (gl.getShaderInfoLog(p.fs) || gl.getProgramInfoLog(p)));
        return -1;
      }
    }
    return 1;
  }
  function U(p, name) { if (!(name in p.u)) p.u[name] = gl.getUniformLocation(p, name); return p.u[name]; }
  var FORMATS = {};
  function texture2(w, h, fmt, filter, wrap) {
    var t = gl.createTexture(), F = FORMATS[fmt];
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, F[0], w, h, 0, F[1], F[2], null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter === gl.LINEAR_MIPMAP_LINEAR ? gl.LINEAR : filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap || gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap || gl.CLAMP_TO_EDGE);
    t.w = w; t.h = h;
    return t;
  }
  function target(t) {
    var f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    f.t = t;
    return f;
  }
  function pair(w, h, fmt) { var t = texture2(w, h, fmt, gl.LINEAR); return { t: t, f: target(t) }; }
  function drop(o) { if (o) { gl.deleteFramebuffer(o.f); gl.deleteTexture(o.t); } }
  function draw(p, f, w, h) {
    gl.useProgram(p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.viewport(0, 0, w, h);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function bind(p, unit, name, t, kind) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(kind || gl.TEXTURE_2D, t);
    gl.uniform1i(U(p, name), unit);
  }

  /* the noise, baked on the GPU over the first frames (8 layers a frame), then the 2D */
  var baked = 0, bakeFb = null;
  function bakeStep() {
    var p, z;
    if (!baked) {
      tex.n3 = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_3D, tex.n3);
      gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, 64, 64, 64, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      bakeFb = gl.createFramebuffer();
    }
    if (baked < 8) {
      p = progs.bake3; gl.useProgram(p);
      gl.uniform1ui(U(p, 'uSeed'), noiseSeed);
      gl.bindFramebuffer(gl.FRAMEBUFFER, bakeFb);
      gl.viewport(0, 0, 64, 64);
      for (z = baked * 8; z < baked * 8 + 8; z++) {
        gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, tex.n3, 0, z);
        gl.uniform1f(U(p, 'uZ'), (z + 0.5) / 64);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      baked++;
      return;
    }
    gl.deleteFramebuffer(bakeFb); bakeFb = null;
    gl.bindTexture(gl.TEXTURE_3D, tex.n3);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.REPEAT);
    gl.generateMipmap(gl.TEXTURE_3D);
    tex.n2 = texture2(256, 256, 'rgba8', gl.LINEAR_MIPMAP_LINEAR, gl.REPEAT);
    var f = target(tex.n2);
    p = progs.bake2; gl.useProgram(p);
    gl.uniform1ui(U(p, 'uSeed'), noiseSeed + 11);
    draw(p, f, 256, 256);
    gl.deleteFramebuffer(f);
    gl.bindTexture(gl.TEXTURE_2D, tex.n2);
    gl.generateMipmap(gl.TEXTURE_2D);
    baked = 9;
  }

  /* the frames' textures, for this window and this rung. The frames on
     show are kept (and shown stretched) until the first new one lands:
     a new size never shows a blank sky */
  var level = 0, work = {}, finals = [], stale = [], maskDirty = true;
  function buffers() {
    var L = LADDER[level], w = Math.max(1, Math.round(W * SCALE * L.scale)), h = Math.max(1, Math.round(H * SCALE * L.scale)), k, hdr, dpr, cvw, cvh;
    if (w * h > PX_MAX) { k = Math.sqrt(PX_MAX / (w * h)); w = Math.round(w * k); h = Math.round(h * k); }
    dpr = Math.min(window.devicePixelRatio || 1, L.dpr);
    cvw = Math.max(1, Math.round(W * dpr)); cvh = Math.max(1, Math.round(H * dpr));
    if (canvas.width !== cvw) canvas.width = cvw;
    if (canvas.height !== cvh) canvas.height = cvh;
    if (w === cw && h === ch && work.s) return;
    cw = w; ch = h;
    for (k in work) drop(work[k]);
    hdr = ext.float ? 'rgba16f' : 'rgba8';
    work = { s: pair(cw, ch, hdr), sh: pair(Math.ceil(cw / 2), Math.ceil(ch / 2), 'rgba8'), b1: pair(Math.ceil(cw / 2), Math.ceil(ch / 2), hdr),
             b2: pair(Math.ceil(cw / 4), Math.ceil(ch / 4), hdr), b3: pair(Math.ceil(cw / 8), Math.ceil(ch / 8), hdr),
             u2: pair(Math.ceil(cw / 4), Math.ceil(ch / 4), hdr), u1: pair(Math.ceil(cw / 2), Math.ceil(ch / 2), hdr), m: pair(cw, ch, 'rgba8') };
    stale = stale.concat(finals);
    finals = [pair(cw, ch, 'srgb'), pair(cw, ch, 'srgb'), pair(cw, ch, 'srgb')];
    job = null; fresh = true; maskDirty = true;
    sweep();
  }
  /* the old frames no longer on show go */
  function sweep() {
    stale = stale.filter(function (o) { if (o === shown[0] || o === shown[1]) return true; drop(o); return false; });
  }

  /* ---------------- a cloud frame: set up, drawn in slices, finished ---------------- */

  var t = 0, acc = 0, job = null, fresh = true, redo = false, shown = [null, null], fk = 1, fkRate = 1 / PERIOD, frames = 0;
  function periodNow() { return PERIOD * LADDER[level].period * (t > THIN && !still ? 2 : 1); }
  function startJob(fast) {
    var per = periodNow(), ahead = fast || still ? 0 : per, S = blend(t + ahead, {}), p = progs.scene, i, n = 0, T, list = [], s, lift, R, j;
    gl.useProgram(p);
    gl.uniform4f(U(p, 'uVp'), cw, ch, W, H);
    gl.uniform4f(U(p, 'uCam'), cam.f, cam.c, cam.s, 0);
    gl.uniform2f(U(p, 'uC0'), cam.x0, cam.y0);
    gl.uniform1f(U(p, 'uT'), still ? 0 : t + ahead);
    gl.uniform2f(U(p, 'uDrift'), drift[0] + wind[0] * ahead, drift[1] + wind[1] * ahead);
    gl.uniform1f(U(p, 'uPx'), (W / cw) / cam.f);
    gl.uniform3fv(U(p, 'uL'), S.light);
    gl.uniform3fv(U(p, 'uLC'), scale3(S.lightC, S.lightI));
    gl.uniform3fv(U(p, 'uSun'), S.sun);
    gl.uniform3fv(U(p, 'uThick'), S.thick);
    gl.uniform4f(U(p, 'uMs'), S.ms, S.g, S.powder, S.iri);
    gl.uniform4f(U(p, 'uFx1'), S.bow, S.glory, S.halo, S.dogs);
    gl.uniform4f(U(p, 'uFx2'), S.belt, S.aurora, S.galaxy, S.nlc);
    gl.uniform4f(U(p, 'uFx3'), S.curtain, S.sbreak, S.corona, S.pillar);
    gl.uniform3fv(U(p, 'uGal'), GAL.pole); gl.uniform3fv(U(p, 'uGc'), GAL.core);
    gl.uniform4f(U(p, 'uAur'), still ? 0 : t + ahead, AUR.ph, AUR.base, 0);
    gl.uniform4f(U(p, 'uBrk'), BRK.x + drift[0] + wind[0] * ahead, BRK.z + drift[1] + wind[1] * ahead, BRK.r, S.sbreak);
    gl.uniform3fv(U(p, 'uSk'), flat(S.sky));
    gl.uniform3fv(U(p, 'uTint'), S.tint);
    gl.uniform4f(U(p, 'uTintP'), S.tintAmt, S.tintPow, S.deep, 0);
    discUniforms(p, 'uDa', S.discA); discUniforms(p, 'uDb', S.discB);
    gl.uniform3fv(U(p, 'uAmbU'), scale3(S.ambU, S.ambUI));
    gl.uniform3fv(U(p, 'uAmbD'), scale3(S.ambD, S.ambDI));
    gl.uniform3fv(U(p, 'uAlb'), S.alb);
    gl.uniform4fv(U(p, 'uSea'), S.sea);
    gl.uniform1f(U(p, 'uSeaL'), S.seaLit);
    gl.uniform1f(U(p, 'uSeaM'), S.seaMist);
    gl.uniform4f(U(p, 'uFog'), S.fog, S.mist, 0.35, 0);
    gl.uniform3fv(U(p, 'uFogC'), S.fogC);
    gl.uniform4fv(U(p, 'uDeck'), S.deck);
    gl.uniform3fv(U(p, 'uDeckC'), S.deckC);
    /* the towers standing now, nearest first, risen as far as they have */
    for (i = 0; i < towers.length; i++) if (towers[i].on && towers[i].p > 0.01) list.push(towers[i]);
    list.sort(function (a, b) { return a.z - b.z; });
    var tw = new Float32Array(72 * 4), tb = new Float32Array(24), tx = new Float32Array(24);
    for (i = 0; i < list.length && i < 6; i++) {
      T = list[i]; lift = T.ht * (1 - T.p) * 0.95; R = T.R * (0.55 + 0.45 * T.p);
      for (j = 0; j < 12; j++) {
        s = T.s[j];
        tw[(i * 12 + j) * 4] = T.x + s[0] * (0.6 + 0.4 * T.p); tw[(i * 12 + j) * 4 + 1] = -1 + s[1] - lift; tw[(i * 12 + j) * 4 + 2] = T.z + s[2];
        tw[(i * 12 + j) * 4 + 3] = s[3] * (0.55 + 0.45 * T.p);
      }
      tb[i * 4] = T.x; tb[i * 4 + 1] = -1 + T.ht * 0.5 - lift; tb[i * 4 + 2] = T.z; tb[i * 4 + 3] = Math.hypot(T.ht * 0.5 + 0.7 * T.R, T.R * 2.0);
      tx[i * 4] = R; tx[i * 4 + 1] = -1 - lift; tx[i * 4 + 2] = -1 + T.ht - lift; tx[i * 4 + 3] = T.off;
      n++;
    }
    gl.uniform1i(U(p, 'uTwN'), n);
    gl.uniform4fv(U(p, 'uTw'), tw); gl.uniform4fv(U(p, 'uTb'), tb); gl.uniform4fv(U(p, 'uTx'), tx);
    job = { row: 0, S: S, fast: !!fast, period: per };
  }
  function scale3(c, k) { return [c[0] * k, c[1] * k, c[2] * k]; }
  function flat(a) { var o = [], i; for (i = 0; i < a.length; i++) o.push(a[i][0], a[i][1], a[i][2]); return o; }
  function discUniforms(p, n, D) {
    if (!D) { gl.uniform4f(U(p, n), 0, 1, 0, 0.9999); gl.uniform4f(U(p, n + 'P'), 0, 1, 0, 0); gl.uniform3f(U(p, n + 'C'), 0, 0, 0); return; }
    gl.uniform4f(U(p, n), D.d[0], D.d[1], D.d[2], Math.cos(D.r * DEG));
    gl.uniform4f(U(p, n + 'P'), D.i, D.halo, D.haloI, D.wide);
    gl.uniform3fv(U(p, n + 'C'), D.c);
  }
  /* draw rows of the scene: as many as this tick's share */
  function slice(rows) {
    var p = progs.scene, y = job.row, h = Math.min(rows, ch - y);
    if (h <= 0) return;
    gl.useProgram(p);
    bind(p, 0, 'uN3', tex.n3, gl.TEXTURE_3D);
    bind(p, 1, 'uN2', tex.n2);
    gl.bindFramebuffer(gl.FRAMEBUFFER, work.s.f);
    gl.viewport(0, 0, cw, ch);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(0, y, cw, h);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disable(gl.SCISSOR_TEST);
    job.row += h;
  }
  function finishJob() {
    var S = job.S, p, sun = sunOnWindow(S), sh = S.shafts * (sun[2] ? 1 : 0), w2 = work.sh.t.w, h2 = work.sh.t.h, f;
    if (sh > 0.005) {                                     // the shafts
      p = progs.shaft; gl.useProgram(p);
      bind(p, 0, 'uS', work.s.t);
      gl.uniform2f(U(p, 'uRes'), w2, h2);
      gl.uniform2f(U(p, 'uSun'), sun[0] / W, 1 - sun[1] / H);
      gl.uniform4f(U(p, 'uSh'), 0.32, 0.95, W / H, 0);
      draw(p, work.sh.f, w2, h2);
    }
    if (S.bloom > 0.005) {                                // the glow
      down(work.s.t, work.b1, 0.75); down(work.b1.t, work.b2, 0); down(work.b2.t, work.b3, 0);
      up(work.b3.t, work.b2.t, work.u2); up(work.u2.t, work.b1.t, work.u1);
    }
    f = nextFinal();                                      // finished, into the spare frame
    f.st = null;                                          // (its read-back to come)
    p = progs.finish; gl.useProgram(p);
    bind(p, 0, 'uS', work.s.t); bind(p, 1, 'uSh', work.sh.t); bind(p, 2, 'uBl', work.u1.t);
    gl.uniform2f(U(p, 'uRes'), cw, ch);
    gl.uniform3fv(U(p, 'uShC'), S.shaftC);
    gl.uniform4f(U(p, 'uPost'), sh > 0.005 ? sh : 0, S.bloom > 0.005 ? S.bloom : 0, S.exposure, S.sat);
    gl.uniform3f(U(p, 'uCeil'), S.ceil, KNEE, FOOT);
    gl.uniform4fv(U(p, 'uFoot'), footOf(S));
    gl.uniform2f(U(p, 'uWin'), W, H);
    gl.uniform4f(U(p, 'uCam'), cam.f, cam.c, cam.s, 0);
    gl.uniform2f(U(p, 'uC0'), cam.x0, cam.y0);
    draw(p, f.f, cw, ch);
    shown = shown[1] ? [shown[1], f] : [f, f];
    fk = 0; fkRate = 1 / job.period; frames++;
    sweep();
    readStats(f, S);
    job = null;
  }
  function nextFinal() { for (var k = 0; k < finals.length; k++) if (finals[k] !== shown[0] && finals[k] !== shown[1]) return finals[k]; return finals[0]; }
  function down(src, dst, thr) {
    var p = progs.down; gl.useProgram(p);
    bind(p, 0, 'uS', src);
    gl.uniform2f(U(p, 'uRes'), dst.t.w, dst.t.h);
    gl.uniform2f(U(p, 'uHalf'), 0.5 / src.w, 0.5 / src.h);
    gl.uniform1f(U(p, 'uThr'), thr);
    draw(p, dst.f, dst.t.w, dst.t.h);
  }
  function up(src, add, dst) {
    var p = progs.up; gl.useProgram(p);
    bind(p, 0, 'uS', src); bind(p, 1, 'uAdd', add);
    gl.uniform2f(U(p, 'uRes'), dst.t.w, dst.t.h);
    gl.uniform2f(U(p, 'uHalf'), 0.5 / src.w, 0.5 / src.h);
    draw(p, dst.f, dst.t.w, dst.t.h);
  }
  /* a moon's footprint (its disc, corona and glare, where they may pass a light-words sky's ceiling: FOOT degrees
     about it): its direction, and whether there is one */
  function footOf(S) {
    var D = S.discA && S.discA.i > 0.01 ? S.discA : null;
    if (S.discB && S.discB.i > 0.01 && (!D || S.discB.i > D.i)) D = S.discB;
    return D ? [D.d[0], D.d[1], D.d[2], 1] : [0, 0, 1, 0];
  }
  /* where the sun stands on the window (or the moon), and whether it is in front of the camera */
  function sunOnWindow(S) {
    var D = S.discA && S.discB ? (S.k < 0.5 ? S.discA : S.discB) : (S.discA || S.discB), o = [0, 0, 0];
    if (!D) { toWindow(S.light, o); return [o[0], o[1], 0]; }
    toWindow(D.d, o);
    return [o[0], o[1], o[2] > 0.05 ? 1 : 0];
  }

  /* ---------------- the window: crossfaded, with the stars, the rain and dark ink's lift ---------------- */

  var lastShow = -1, lastSteer = -1, lastNow = 0;
  /* where the words stand, for dark ink's lift (drawn when the page moves) */
  function drawMask() {
    var p = progs.mask;
    gl.useProgram(p);
    gl.uniform4f(U(p, 'uVp'), cw, ch, W, H);
    gl.uniform4fv(U(p, 'uR'), rectOf(wordsR).concat(rectOf(nameR), rectOf(links[0]), rectOf(links[1])));
    gl.uniform4f(U(p, 'uFe'), LIFT_FEATHER * Math.max(W, H), LIFT_FEATHER * Math.max(W, H), WORDS_CORE, LINKS_CORE);
    draw(p, work.m.f, cw, ch);
    maskDirty = false;
  }
  function rectOf(r) { return r ? r.slice(0, 4) : [0, 0, 0, 0]; }
  function fadeK() { return still ? 1 : fk; }            // (how far the newer frame has crossfaded in)
  function show(S) {
    var p = progs.show, k = fadeK();
    gl.useProgram(p);
    bind(p, 0, 'uA', shown[0].t); bind(p, 1, 'uB', shown[1].t); bind(p, 2, 'uM', work.m.t);
    gl.uniform1f(U(p, 'uK'), k);
    gl.uniform4f(U(p, 'uVp'), canvas.width, canvas.height, W, H);
    gl.uniform2f(U(p, 'uFloor'), band.lo, bandL.lo);
    gl.uniform2f(U(p, 'uGain'), band.gn, bandL.gn);
    gl.uniform1f(U(p, 'uStTop'), STAR_TOP);
    gl.uniform4f(U(p, 'uSt'), S.stars, starSeed, cam.hy, Math.max(0.7, Math.min(1.1, canvas.width / W * 0.6)));
    gl.uniform4f(U(p, 'uRn'), still ? 0 : S.rain, Math.floor(t * 12), 0.18 * windDir, 0);
    gl.uniform3fv(U(p, 'uRnC'), S.rainC);
    var sw = sunOnWindow(S);
    gl.uniform4f(U(p, 'uCam'), cam.f, cam.c, cam.s, 0);
    gl.uniform2f(U(p, 'uC0'), cam.x0, cam.y0);
    gl.uniform3fv(U(p, 'uGal'), GAL.pole);
    gl.uniform1f(U(p, 'uGx'), S.galaxy);
    gl.uniform4f(U(p, 'uMo'), still ? 0 : S.motes, windDir, sw[0], sw[1]);
    gl.uniform3fv(U(p, 'uMoC'), S.lightC);
    gl.uniform1f(U(p, 'uTm'), t);
    draw(p, null, canvas.width, canvas.height);
  }
  /* how often the window is drawn: on twos while it rains, else less; less still on a long visit */
  function rate(S) { return S.rain > 0.01 ? DRAW_FPS[0] : (t > THIN ? DRAW_FPS[2] : DRAW_FPS[1]); }

  /* ---------------- the words' colours, from what was drawn where they stand ---------------- */

  var pbo = null, sync = null, statsOut = new Uint8Array(36), statsFor = null, statsOf = null, pending = null, asked = false, meta = document.querySelector('meta[name="theme-color"]');
  var themeOpen = meta ? meta.getAttribute('content') : '', themeWas = '';
  var trusted = false, doubts = 0, waited = 0, fadeUntil = 0;
  /* the sky's light where the words stand, as the gradient alone would have it */
  function expected(S) {
    var R = wordsR || stackR, d, e, c;
    if (!R || !S) return -1;
    d = fromWindow((R[0] + R[2]) / 2, (R[1] + R[3]) / 2); e = Math.max(0, Math.asin(clamp(d[1], -1, 1)) / DEG);
    c = lerp3(S.sky[0], S.sky[1], sstep(0, 5, e)); c = lerp3(c, S.sky[2], sstep(5, 15, e));
    c = lerp3(c, S.sky[3], sstep(15, 32, e)); c = lerp3(c, S.sky[4], sstep(32, 49, e));
    return lumOf(c);
  }
  function sstep(a, b, x) { x = clamp((x - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); }
  /* shown, once the first frame is read and looks like the sky it should (or let go) */
  function trust(ok) {
    trusted = true;
    if (ok) { canvas.classList.add('on'); fadeUntil = lastNow + 2100; return; }
    hide();
    var lc = gl.getExtension('WEBGL_lose_context');
    gl = null;
    if (lc) lc.loseContext();                             // (its memory freed)
    if (window.console) console.warn('sky: the drawn sky did not look right; the still sky stays');
  }
  function distrust() { trusted = false; doubts = 0; waited = 0; asked = false; seen = seenT = null; inkS.ink = inkL.ink = -1; lastSteer = -1; }
  function hide() {
    canvas.classList.remove('on'); unwords();
    if (meta && themeOpen) { meta.setAttribute('content', themeOpen); themeWas = ''; }
  }
  function readStats(f, S) {
    var R = wordsR || stackR, lk = links.length ? union(links[0], links[1] || null) : null, N = nameR, p = progs.stats;
    if (!R) return;
    if (sync) { pending = { f: f, S: S }; return; }       // (one at a time: this one when the last is in)
    pending = null; statsFor = S; statsOf = f; asked = true;
    if (!work.st) { work.st = pair(9, 1, 'rgba8'); pbo = gl.createBuffer(); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo); gl.bufferData(gl.PIXEL_PACK_BUFFER, 36, gl.STREAM_READ); gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null); }
    lk = lk || R; N = N || R;
    gl.useProgram(p);
    bind(p, 0, 'uF', f.t);
    gl.uniform4f(U(p, 'uRs'), R[0] / W, 1 - R[1] / H, R[2] / W, 1 - R[3] / H);
    gl.uniform4f(U(p, 'uRl'), (lk[0] - 8) / W, 1 - (lk[1] - 8) / H, (lk[2] + 8) / W, 1 - (lk[3] + 8) / H);   // (the ring is drawn 3-5 px about them)
    gl.uniform4f(U(p, 'uRn'), N[0] / W, 1 - N[1] / H, N[2] / W, 1 - N[3] / H);
    draw(p, work.st.f, 9, 1);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
    gl.readPixels(0, 0, 9, 1, gl.RGBA, gl.UNSIGNED_BYTE, 0);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
  }
  function pollStats() {
    if (!sync) return;
    var st = gl.clientWaitSync(sync, 0, 0), y, sq, top = '#', i, v;
    if (st !== gl.ALREADY_SIGNALED && st !== gl.CONDITION_SATISFIED) return;
    gl.deleteSync(sync); sync = null;
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, pbo);
    gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, 0, statsOut);
    gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
    sq = function (i) { var v = statsOut[i * 4] / 255; return v * v; };
    seenT = { mn: sq(0), mx: sq(1), mean: sq(2), sd: sq(4), lmn: sq(5), lmx: sq(7), nmn: sq(6), nmx: sq(8) };
    if (statsOf) statsOf.st = seenT;                      // (the frame's own: the two on show crossfade)
    if (!trusted) {                                       // the sky drawn as it should be? (a GPU or driver that draws
      y = expected(statsFor);                             //  nonsense is let go, and the stylesheet's sky stays)
      if (y < 0 || (seenT.mean > y / 4 && seenT.mean < y * 4 + 0.05)) trust(true);
      else if (++doubts >= 2) { trust(false); return; }
      else { seenT = null; if (statsOf) statsOf.st = null; if (still) redo = true; return; }   // (doubted once: drawn and read again)
    }
    for (i = 0; i < 3; i++) { v = statsOut[12 + i]; top += (v < 16 ? '0' : '') + v.toString(16); }
    if (meta && top !== themeWas) { meta.setAttribute('content', top); themeWas = top; }
    if (pending && gl.isTexture(pending.f.t)) readStats(pending.f, pending.S);
    else pending = null;
  }
  var TEXT_LIGHT = [0.99, 0.006, 95], TEXT_LIGHT_Y = lumOf(linOf(lab(TEXT_LIGHT[0], TEXT_LIGHT[1], TEXT_LIGHT[2]))), tokensWere = {}, tokensKey = '';
  var HI_MAX = (TEXT_LIGHT_Y + 0.05) / RATIO - 0.05;   // the lightest ground light ink reads on at RATIO
  /* the ink and the grounds it stands on, followed from what was drawn, for
     two groups of words each on its own ground: the name and the credit
     (the stack, on the sky) and the links (on the sea below the horizon).
     Dark ink reads on any ground: where the group's ground is darker than
     FLIP, the light is raised by the gain its darkest needs (gainOf: FLIP
     over the darkest on show), eased out across a field as wide as the
     window (LIFT_FEATHER), so it reads as the light brightening and never
     as a shape; at the words themselves the floor (FLIP) is a last hold for
     a dark thread the samples step over; nowhere else is anything lifted
     (on a light sky the ground is far above FLIP: nothing is lifted but as
     a change crosses its twilight; and while the lift is on, the crossfade
     into a newer frame that ends it is done within HURRY, or the next frame
     drawn quicker, so it lasts under a second); the dimmed grey is
     worked out on the credit's darkest with a tenth to spare (under light
     ink on its lightest, with a fifth: the samples step over a thin bright
     streak in a high deck; and where stars can stand behind it, on the
     stars' top), the ring on the links' with fifteen hundredths (the sea's
     fine grain the samples step over). Light ink reads only on a ground no
     lighter than HI_MAX, and nothing here may make a ground darker: so
     light ink is set only where the read-back shows the lightest ground
     under the group holds it, on what is on show (the two frames crossfade,
     linearly in light: their lightest, mixed as they are, bound it). In a
     change from a light sky to a dark one, light ink comes the moment its
     ground holds it (the twilight between is even and well below the
     crossing, so it comes on the way in, where the light falls fast: the
     lift holds a moment); in a change from a dark sky to a light one, light
     ink stays until its ground grows too bright for it (on the way out of
     the twilight), or the change is three quarters done. Never back against
     the change: one flip a change for each group. A group's lift reaches
     the other's ground too (its field is as wide as the window), so light
     ink stays only where its ground, so raised, still holds it, else it
     goes dark with the other group; toward light the two flip together,
     once both grounds hold it. On a dark sky (or in a
     change toward one) whose ground grew too bright for light ink (the
     skies with light ink keep their light under the ceiling, so it should
     not), dark ink at once, and light ink back no sooner than DWELL, on a ground a little
     darker (BACK): never a flicker */
  var seen = null, seenT = null, band = { lo: FLIP, g: FLIP, mode: 0, gn: 1 }, bandL = { lo: FLIP, g: FLIP, mode: 0, gn: 1 };   // (lo: the floor; g: the ground the grey or the ring is worked out on; gn: the gain about the words)
  var inkS = { ink: -1, at: 0, gave: false }, inkL = { ink: -1, at: 0, gave: false };
  function stackHi(s) { return Math.max(s.mx, s.nmx); }
  function linksHi(s) { return s.lmx; }
  function stackLo(s) { return Math.min(s.mn, s.nmn); }
  function linksLo(s) { return s.lmn; }
  function ends(lo, hi, want) {                           // (the newer frame on show would end dark ink's lift: its ground
    var B = shown[1] && shown[1].st;                      //  needs none, or holds the light ink the change is going to)
    return !!B && (lo(B) >= FLIP || (want === 1 && hi(B) <= HI_MAX));
  }
  function bound(f) {                                     // (a group's lightest on show)
    var A = shown[0] && shown[0].st, B = shown[1] && shown[1].st;
    return A && B && A !== B ? mix(f(A), f(B), fadeK()) : f(B || A || seenT);
  }
  function gainOf(f) { return seenT ? clamp(FLIP / Math.max(bound(f), 0.02), 1, 1.6) : 1; }   // (bound: as the frames on show crossfade)
  function starsUnder(S, r) { return S.stars > 0.001 && r && r[1] < cam.hy + 2 ? STAR_TOP : 0; }   // (a star behind the words: at most the stars' top)
  function decide(G, hi, S, turning, want) {
    if (G.ink < 0) G.ink = S.words >= 0.5 ? 1 : 0;       // (the opening sky's own ink, until its ground is read)
    if (want === 0) G.gave = false;
    if (!seenT) return;
    if (G.ink === 1) {
      if (hi > HI_MAX) { G.gave = true; G.ink = 0; G.at = t; }                 // (light ink would break: dark, at once)
      else if (turning && want === 0 && S.k >= 0.75) { G.ink = 0; G.at = t; G.gave = false; }
    } else if (want === 1 && hi <= HI_MAX * (G.gave ? BACK : 1) && (!G.gave || t - G.at >= DWELL)) { G.ink = 1; G.at = t; G.gave = false; }
  }
  function steer(dt, S) {
    var f, k, A, B, hS, hL, gS, gL, turning = S.a.words !== S.b.words && S.k > 0, want = turning ? S.b.words : S.a.words;
    if (seenT) {
      if (!seen) { seen = {}; for (f in seenT) seen[f] = seenT[f]; }
      k = still ? 1 : 1 - Math.exp(-dt / 0.6);
      for (f in seen) seen[f] += (seenT[f] - seen[f]) * k;
    }
    hS = seenT ? bound(stackHi) : 1; hL = seenT ? bound(linksHi) : 1;
    decide(inkS, hS, S, turning, want);
    decide(inkL, hL, S, turning, want);
    /* (one group's lift reaches the other's ground too, its field being as wide as the window: so light ink stays only
       where its ground, so raised, still holds it, else it goes dark with the other group; toward light the two then
       flip together, once both grounds hold it) */
    if (inkS.ink === 1 && inkL.ink === 0 && hS * gainOf(linksLo) > HI_MAX) { inkS.ink = 0; inkS.at = t; }
    if (inkL.ink === 1 && inkS.ink === 0 && hL * gainOf(stackLo) > HI_MAX) { inkL.ink = 0; inkL.at = t; }
    gS = inkS.ink === 0 ? gainOf(stackLo) : 1;           // (the gain about each: what its own darkest ground on show needs)
    gL = inkL.ink === 0 ? gainOf(linksLo) : 1;
    A = shown[0] && shown[0].st; B = shown[1] && shown[1].st;
    band.mode = inkS.ink; bandL.mode = inkL.ink;
    if (inkS.ink === 0) {                                 // (dark ink: the floor, and the grey on the credit's darkest)
      band.lo = FLIP;
      band.g = seen ? Math.max(FLIP, Math.max(seen.mn, seen.mean - 3 * seen.sd) * 0.9) : FLIP;
    } else {                                              // (light ink: no floor at all; the grey on the credit's lightest, or a star)
      band.lo = 0;
      band.g = Math.min(HI_MAX, Math.max(seen ? Math.max(seen.mx, A ? A.mx : 0, B ? B.mx : 0) * 1.2 : HI_MAX, starsUnder(S, wordsR || stackR)) * gL);   // (a fifth to spare: a thin bright streak the samples step over; raised by the links' lift)
    }
    if (inkL.ink === 0) { bandL.lo = FLIP; bandL.g = seen ? Math.max(FLIP, seen.lmn * 0.85) : FLIP; }
    else { bandL.lo = 0; bandL.g = Math.max(seen ? Math.max(seen.lmx, A ? A.lmx : 0, B ? B.lmx : 0) * 1.1 : HI_MAX, starsUnder(S, links.length ? union(links[0], links[1] || null) : null)) * gS; }
    band.gn = gS; bandL.gn = gL;
    if (!still && (band.gn > 1.0005 || bandL.gn > 1.0005)) {   // (lifted: the frame that ends it, sooner)
      if (fk < 1 && ((band.gn > 1.0005 && ends(stackLo, stackHi, want)) || (bandL.gn > 1.0005 && ends(linksLo, linksHi, want)))) fkRate = Math.max(fkRate, (1 - fk) / HURRY);
      else if (job) job.fast = true;                      // (the newer frame lies in the band too: the next one drawn quicker)
    }
  }
  /* the words' colours for their ink and grounds: black, a warm grey and a dark ochre on a light sky; a
     near-white, a cool grey and a light gold on a dark one; the stack's on the root (the birds' ink too), the
     links' on the footer (their underline's grey and the focus ring on their own ground). While the drawn sky
     fades in over the stylesheet's, the safer of the two sets (and only while the drawn sky shows at all) */
  var cssTok = null, foot = document.querySelector('footer'), tokensWereL = {}, tokensKeyL = '';
  function inkTokens(mode, g, lg) {                       // (g: the grey's ground; lg: the ring's)
    var Yd, Yf, tk = {};
    if (mode === 0) {
      Yd = Math.min(0.108, (g + 0.05) / RATIO - 0.05);
      Yf = Math.min(0.155, (lg + 0.05) / RING - 0.05);
      tk['--color-text'] = '#000000';
      tk['--color-dimmed'] = hex(ofLum(Math.max(Yd, 0), 0.009, 85));
      tk['--color-focus'] = hex(ofLum(Math.max(Yf, 0.004), 0.12, 75));
      tk['--color-selection'] = '#e6e2d6';
    } else {
      Yd = Math.min(TEXT_LIGHT_Y, Math.max(0.4, RATIO * (g + 0.05) - 0.05));
      Yf = Math.min(TEXT_LIGHT_Y, Math.max(0.45, RING * (lg + 0.05) - 0.05));
      tk['--color-text'] = hex(linOf(lab(TEXT_LIGHT[0], TEXT_LIGHT[1], TEXT_LIGHT[2])));
      tk['--color-dimmed'] = hex(ofLum(Yd, 0.014, 255));
      tk['--color-focus'] = hex(ofLum(Yf, 0.11, 85));
      tk['--color-selection'] = '#3b3f55';
    }
    return tk;
  }
  function safer(tk, mode, fading) {                      // (darker on a light sky, lighter on a dark one: safe on both)
    if (fading && cssTok && cssTok.mode === mode) ['--color-dimmed', '--color-focus'].forEach(function (k) {
      var a = lumHex(tk[k]), b = lumHex(cssTok[k]);
      if (b >= 0 && (mode === 0 ? b < a : b > a)) tk[k] = cssTok[k];
    });
    return tk;
  }
  function put(el, tk, were) { for (var k in tk) if (were[k] !== tk[k]) { el.style.setProperty(k, tk[k]); were[k] = tk[k]; } }
  function words(now) {
    var fading = now < fadeUntil, f4 = function (v) { return v.toFixed(4); };
    var key = band.mode + ':' + f4(band.g) + ':' + f4(bandL.g) + (fading ? 'f' : ''),
        keyL = bandL.mode + ':' + f4(bandL.g) + (fading ? 'f' : '');
    if (!canvas.classList.contains('on')) { unwords(); return; }
    if (key !== tokensKey) { tokensKey = key; put(root, safer(inkTokens(band.mode, band.g, bandL.g), band.mode, fading), tokensWere); }
    if (foot && keyL !== tokensKeyL) { tokensKeyL = keyL; put(foot, safer(inkTokens(bandL.mode, bandL.g, bandL.g), bandL.mode, fading), tokensWereL); }
  }
  function unwords() {
    var k;
    for (k in tokensWere) root.style.removeProperty(k);
    for (k in tokensWereL) foot.style.removeProperty(k);
    tokensWere = {}; tokensKey = ''; tokensWereL = {}; tokensKeyL = '';
  }
  function lumHex(h) {
    var m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(h).trim()), i, c = [];
    if (!m) return -1;
    for (i = 1; i < 4; i++) { c[i - 1] = parseInt(m[i], 16) / 255; c[i - 1] = c[i - 1] <= 0.04045 ? c[i - 1] / 12.92 : Math.pow((c[i - 1] + 0.055) / 1.055, 2.4); }
    return lumOf(c);
  }
  /* the stylesheet's own words for its still sky (read before any are set here) */
  function readCss() {
    var cs = window.getComputedStyle(root), o = {};
    ['--color-text', '--color-dimmed', '--color-focus'].forEach(function (k) { o[k] = cs.getPropertyValue(k).trim(); });
    o.mode = lumHex(o['--color-text']) > 0.5 ? 1 : 0;
    return o;
  }

  /* ---------------- the loop ---------------- */

  var raf = 0, last = 0, still = false, frozen = false, forcedOn = false, nameWas = '', afterTick = false, nudge = false;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)'), forced = window.matchMedia('(forced-colors: active)');
  function frame(now) {
    raf = 0;
    if (lost || forcedOn || !gl) return;
    if (!ready) {
      var l = linked();
      if (l < 0) { gl = null; return; }
      if (l === 0) { raf = requestAnimationFrame(frame); return; }
      ready = true;
    }
    if (baked < 9) { bakeStep(); raf = requestAnimationFrame(frame); return; }
    var dt = last ? Math.min((now - last) / 1000, 1) : 0, step = Math.min(dt, STEP_MAX), fps;
    last = now; lastNow = now;
    if (dirty) relayout();
    if (!still) { t += step; acc += step; fk = Math.min(1, fk + step * fkRate); blow(step); govern(dt, now); }
    fps = rate(NOW.sky ? NOW : blend(t, NOW));
    /* all the GPU's work is done on the sky's drawing ticks, each ending with
       the window drawn: a browser may show the canvas after any frame that
       drew at all (until the first sky is drawn the canvas is unseen, and the
       work goes on every frame) */
    afterTick = false;
    if (nudge && shown[1] && trusted && !(still || redo || now - lastShow >= 1000 / fps - 4)) {   // (the words moved: the lift with them, now)
      nudge = false;
      if (maskDirty) drawMask();
      steer(0, NOW); words(now); show(NOW); lastShow = now;
    }
    if (!shown[1] || still || redo || now - lastShow >= 1000 / fps - 4) {
      nudge = false;
      afterTick = true;
      lagCheck(now, fps);
      blend(t, NOW);
      tendTowers(still ? 0 : acc, NOW, still || frames === 0); acc = 0;
      if (NOW.name !== nameWas) { root.setAttribute('data-sky', NOW.name); nameWas = NOW.name; }
      if (redo || (!job && (fresh || !still || !shown[1]))) { redo = false; startJob(fresh || !shown[1]); fresh = false; }
      if (job) {
        slice(job.fast || still ? Math.ceil(ch / 4) : Math.ceil(ch / (job.period * fps) * 1.08));
        if (job.row >= ch) finishJob();
      }
      pollStats();
      if (!gl) return;
      if (maskDirty) drawMask();
      if (shown[1]) {
        steer(lastSteer < 0 ? 0 : Math.min((now - lastSteer) / 1000, 0.5), NOW); lastSteer = now;
        words(now); show(NOW); lastShow = now;
        lagMark(now);
        if (!trusted && !asked && ++waited > 3 * fps) trust(true);   // (nothing to read: no words on the page)
      }
    }
    if (!still || job || sync || pending || redo || nudge || !trusted || now < fadeUntil) raf = requestAnimationFrame(frame);
  }
  function relayout() {
    measure(); if (!cam.lent) ownCamera(); aimWind(); buffers();
    maskDirty = true; dirty = false;
  }

  /* a slow device, read two ways: the frame after each drawing tick coming
     late (against the display's own pace, learnt and relearnt), and the GPU
     still busy with one tick's work at the next. Slow for a while: a rung
     down the ladder (and, at its foot, the still sky); easy for EASE: a
     rung back up */
  var base = 0, tickLate = 0, gpuLate = 0, since = 0, lagSync = null, lagAt = 0;
  function govern(dt, now) {
    if (dt <= 0 || dt > 0.25) return;                     // (a hidden tab, a pause: not slowness)
    since += dt;
    if (!base || dt < base) base = base ? base * 0.8 + dt * 0.2 : dt;
    else base += (dt - base) * 0.03;                      // (the display's pace: falls fast, rises slowly)
    if (afterTick) tickLate = tickLate * 0.9 + (dt > base * 1.7 ? 0.1 : 0);
    if (since < 4) return;
    if (tickLate > 0.5 || gpuLate > 0.5) {
      if (level < LADDER.length - 1 || since > 10) { since = 0; tickLate = gpuLate = 0; }
      if (level < LADDER.length - 1) { level++; buffers(); }
      else if (since > 10) { frozen = still = true; }     // (slow even at the foot, a while: the still sky)
      else return;
    } else if (level > 0 && since > EASE && tickLate < 0.05 && gpuLate < 0.05) {
      since = 0; level--; buffers();
    }
  }
  function lagMark(now) { if (!lagSync) { lagSync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); lagAt = now; } }
  function lagCheck(now, fps) {
    if (!lagSync) return;
    var st = gl.clientWaitSync(lagSync, 0, 0), done = st === gl.ALREADY_SIGNALED || st === gl.CONDITION_SATISFIED;
    if (done || now - lagAt > 1000 / fps * 1.6) {
      gpuLate = gpuLate * 0.85 + (done ? 0 : 0.15);
      gl.deleteSync(lagSync); lagSync = null;
    }
  }
  function run() { if (!raf && gl && !lost && !forcedOn) raf = requestAnimationFrame(frame); }

  /* the birds lend their camera */
  window.skyAir = {
    aim: function (f, th, w, h) {
      setCamera(f, th, w, h); cam.lent = true;
      if (gl && ready) { aimWind(); job = null; fresh = true; }
      run();
    },
    /* where the sky is (read only): this sky and the next, how far the change between them has gone, and
       whether the name's ink is light (for the score to keep in step) */
    cycle: function () {
      return NOW.a ? { sky: NOW.a.id, next: NOW.b.id, k: NOW.k, words: inkS.ink < 0 ? (NOW.words >= 0.5 ? 1 : 0) : inkS.ink, group: NOW.name } : null;
    }
  };

  function onLayout() { dirty = true; nudge = true; run(); }
  function onPref() {
    still = reduce.matches || frozen;
    forcedOn = forced.matches;
    if (forcedOn) { hide(); return; }
    if (gl && !canvas.classList.contains('on')) distrust();   // (shown again once read again)
    job = null; fresh = true; run();
  }

  cssTok = readCss();
  if (!setup()) return;
  still = reduce.matches || frozen;
  forcedOn = forced.matches;
  measure();
  if (!aimed) ownCamera();
  aimWind();
  buffers();
  dirty = false;
  canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); lost = true; hide(); if (raf) cancelAnimationFrame(raf); raf = 0; });
  canvas.addEventListener('webglcontextrestored', function () {
    if (!gl) return;                                      // (let go on purpose: stays gone)
    lost = false; ready = false; progs = {}; tex = {}; work = {}; finals = []; stale = []; shown = [null, null];
    sync = null; pbo = null; pending = null; lagSync = null; cw = ch = 0; job = null; baked = 0; frames = 0;
    distrust();
    if (setup()) { still = reduce.matches || frozen; buffers(); run(); }
  });
  window.addEventListener('resize', onLayout);
  window.addEventListener('scroll', onLayout, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(onLayout);
  if (window.ResizeObserver) {                            // (the words reflowed without the window changing: text spacing, zoom)
    var watch = new ResizeObserver(onLayout);
    ['.stack', 'footer'].forEach(function (q) { var e = document.querySelector(q); if (e) watch.observe(e); });
  }
  if (reduce.addEventListener) { reduce.addEventListener('change', onPref); forced.addEventListener('change', onPref); }
  run();
})();
