  /* ================ GUESTS (life, the birds' play) ================
     A guest is a bird of its own, on its own stream (guestRng: vstream(8000 + k), split from the visit's one seed), that
     lands on something fixed to the window: the pointer resting in open sky (P1), the lettered name's strokes (W1) or a
     link word (W2), sits in the owner's chosen shape (PERCH: perch A, the folded chevron) and leaves. It flies in the
     camera's own space (its place on the window and its nearness), so a turn of the view does not sweep a bird that is
     landing on the words. Nothing here is read by the ordinary planner, the guard, the hold or the camera: no band, no
     HOST.calm, no flight list written (the twin test, L13); the guest reads the ordinary birds' last boxes (to keep away
     from them) and nothing else of theirs. Drawn by the same instanced pass, behind the words (the words always on
     top: a bird on a stroke sits on it, the stroke covering its sliver); its way in and out may cross any word (the
     owner, 2026-11-05: no keep-out) */
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
  var LINK_GLYPHS = [   /* [fx0, fx1, top em over the baseline] (tools/link_glyphs.js, the served Geist subset at 14 px) */
    [[0.028, 0.227, 0.72], [0.268, 0.581, 0.57], [0.585, 0.812, 0.57], [0.829, 0.885, 0.72], [0.922, 1.0, 0.72]],
    [[0.018, 0.147, 0.72], [0.155, 0.192, 0.72], [0.219, 0.348, 0.57], [0.368, 0.42, 0.72], [0.42, 0.497, 0.57], [0.488, 0.636, 0.57], [0.631, 0.778, 0.72], [0.797, 0.834, 0.72], [0.868, 0.997, 0.57]] ];
  function wordTops(L0, b, base, em, upto) {   // (the glyphs' tops as one surface, a step at each glyph: the lowest bird point over each glyph on its top)
    var G = LINK_GLYPHS[L0.link], o = [], w = b[2] - b[0];
    for (var i = 0; i < G.length; i++) { var y = base - G[i][2] * em; o.push([b[0] + G[i][0] * w, y], [b[0] + Math.min(G[i][1], 1) * w - 0.01, y]); }
    return o;
  }
  var G_SETOUT = 1.0, G_FIRST_PTR = 6, G_FIRST = 20, G_WORD_MEAN = 180, G_WORD_MIN = 90, G_WORD_MAX = 5, G_PTR_GAP = 90, G_PTR_MAX = 4, G_FLUSH_T = 120, G_REST = 2.0;
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
  function openSkyAt(x, y) {   // (P1: 60 px from the edges; the words are no keep-out: the owner, 2026-11-05)
    if (x < 60 || y < 60 || x > W - 60 || y > H - 60) return false;
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
  function gPathClear(g, P, B) {
    var n = 40, i, hw = 0.6 * g.sp, hh = 0.35 * g.sp, TT = g.Ti + g.Tr;
    for (i = 0; i <= n; i++) {
      var ti = TT * i / n; gPos(g, ti, GTMP);
      if (!gOrdClearAt(GTMP.x, GTMP.y, ti, 2 * g.sp)) return false;   // (fix: every ordinary bird where it will be then, not only where it enters)
      if (P.kind === 'link' && Math.abs(GTMP.x - g.px0) < 1.5 * g.sp && Math.abs(GTMP.y - g.py0) < 1.5 * g.sp) { var nT = Math.sqrt((GTMP.x - g.T[0]) * (GTMP.x - g.T[0]) + (GTMP.y - g.T[1]) * (GTMP.y - g.T[1])) < 0.8 * g.sp; if (P.end && GTMP.x - (nT ? 0.2 : 0.5) * hw < P.keepX && GTMP.y + 0.5 * hh > P.wb[1]) return false; if (!P.end && GTMP.y + 0.5 * hh > P.topY && GTMP.x + 0.5 * hw > P.wb[0] && GTMP.x - 0.5 * hw < P.wb[2]) return false; continue; }   // (perch lane)   // (the link guest at its own perch: never over the word's letters)
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
     level), the nearest the wanted way (cx, cy) whose straight path to the window's edge keeps (fix) 2 spans from every
     ordinary bird where it will be (at speed v px/s, starting k0 s from now) over the next 8 s, past its first 1.5
     spans (the words no keep-out: the owner, 2026-11-05). Returns null if none is (o.best then the way that keeps
     farthest from the birds) */
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
    var best = null, bs = -2, hw = 0.6 * g.sp, hh = 0.35 * g.sp, q, nq = perched ? 12 : 16, far = null, fd = -1e9;
    for (q = 0; q <= nq; q++) {
      var an = Math.PI + q * Math.PI / 12, ux = Math.cos(an), uy = Math.sin(an), sc = ux * cx + uy * cy, ok = true;
      if (Math.abs(uy) < 1e-9) uy = 0;
      for (var dd = 1.5 * g.sp; ok && dd < W + H; dd += 0.5 * g.sp) {
        var x = x0 + ux * dd, y = y0 + uy * dd; if (!inView(x, y, hw, hh)) break;
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
       straight path to the window's edge keeps clear of the ordinary birds, within 60 deg of it if any is (the words
       are no keep-out: the owner, 2026-11-05) */
    var best = null, bs = -2, hw = 0.6 * g.sp, hh = 0.35 * g.sp, farL = null, fdL = -1e9;
    for (var q = 0; q <= 12; q++) {
      var an = Math.PI + q * Math.PI / 12, ux = Math.cos(an), uy = Math.sin(an) * (q === 0 || q === 12 ? 0 : 1), sc = ux * cx + uy * cy, ok = true;
      for (var dd = 1.5 * g.sp; ok && dd < W + H; dd += 0.5 * g.sp) {   // (its first 1.5 spans: beside its own perch)
        var x = g.px0 + ux * dd, y = g.py0 + uy * dd - 0.35 * g.sp; if (!inView(x, y, hw, hh)) break;
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
      if (DUMP) { var db = dumpBird({ id: g.id, kind: 'guest', m: [] }, {}, s, tr - g.t0, A.op); db.guest = { why: g.why, perch: g.spec.id || 'pointer', phase: A.phase, x: +g.last.x.toFixed(2), y: +g.last.y.toFixed(2), yaw: +A.yaw.toFixed(2), pitch: +A.pitch.toFixed(2), el: +A.el.toFixed(2), sp: +g.sp.toFixed(2), pts: g.P.pts.map(function (q) { return [+q[0].toFixed(2), +q[1].toFixed(2)]; }), ride: g.ride.slice(), vc: +g.vc.toFixed(2) }; DUMP.push(db); }
      nB++;
    }
    return nB;
  }
  function guestReset() { GU.list.length = 0; GU.k = 0; GU.nWord = 0; GU.nPtr = 0; GU.lastWord = -1e9; GU.nextWord = G_FIRST; GU.lastPtr = -1e9; GU.flushAt = -1e9; GU.flushN = 0; GU.firstRest = true; GU.log.length = 0; GU.restT = 0; GU.px = -1; GU.ptrRetry = -1e9; }
