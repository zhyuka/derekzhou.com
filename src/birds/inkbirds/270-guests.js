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
       about 70 deg, its feet under it (the owner's iPhone: at 30 deg and grey it read as a smudge; at 45 it leaned on one tip), as a bird stands on a ledge, barely tilted toward the eye: at true size the folded M is a small upright
       bird, its two folded tips under it like feet (seen at 3/4 from above, yaw 52 and el 24, it was a flat leaf or a hook) */
    return { name: 'A', poses: P, rest: 'low', life: { arm: 3.0, hand: 2.2, roll: 0 }, scale: 4.2, el: 4, white: 1.0,
      keys: [K(0, 'touch', 66, 70), K(0.3, 'foldHalf', 68, 84), K(0.8, 'fold', 70, 94), K(1.1, 'fold', 70, 97, 0.05), K(1.3, 'fold', 70, 95),
        K(2.6, 'fold', 70, 95), K(2.85, 'foldLoose', 72, 95), K(3.2, 'fold', 70, 95), K(4.0, 'fold', 70, 95), K(4.12, 'fold', 67, 95, -0.03), K(4.3, 'fold', 70, 95), K(5.0, 'fold', 70, 95)] };
  })();
  var G_LINK_K = 0.75, G_PTR_K = 0.75;   // (a guest's size on a link or the credit, and on the pointer, against the name's)
  var LINK_GLYPHS = [   /* [fx0, fx1, top em over the baseline] (tools/link_glyphs.js, the served Geist subset at 14 px) */
    [[0.028, 0.227, 0.72], [0.268, 0.581, 0.57], [0.585, 0.812, 0.57], [0.829, 0.885, 0.72], [0.922, 1.0, 0.72]],
    [[0.018, 0.147, 0.72], [0.155, 0.192, 0.72], [0.219, 0.348, 0.57], [0.368, 0.42, 0.72], [0.42, 0.497, 0.57], [0.488, 0.636, 0.57], [0.631, 0.778, 0.72], [0.797, 0.834, 0.72], [0.868, 0.997, 0.57]] ];
  /* (the owner, 2026-11-06: "why doesn it perch on other letters too why is it only some spots. it shouldnt be any set
     value lmfao?!") Perches anywhere on the letters, chosen fresh at every landing: no table of spots. The name's ink
     (NAME_INK: the lettered path rasterised in 6-unit columns of its 1310 x 314 viewBox, each column's runs of SKY, grown
     a unit; tools/name_raster.js on index.html's path md5 46b5e199): the end of each run of sky is the top of a stroke,
     and a ledge is such a top with room above it for a standing bird and its neighbours within a few units of it (a stroke
     that runs on, flat enough to stand on: never a hairline's tip). The links' glyphs (LINK_GLYPHS: every glyph of Email
     and LinkedIn, its top) and the credit's (a cell a character of its mono line, CREDIT, its top by the character's
     class) are ledges too; never an underline. inkLedges() lists them on this window (CSS px); gPickInk picks one */
  var NAME_INK_S = '0,314|0,248;258,314|0,245;262,314|0,245;265,314|0,247;264,314|0,248;264,314|0,248;266,314|0,246;306,314|0,228;289,314|0,206;261,314|0,187;237,245;261,314|0,168;223,246;262,314|0,12;22,148;201,246;262,314|0,9;24,131;185,246;262,314|0,8;24,112;170,246;261,314|0,7;25,85;154,245;259,314|0,6;25,76;140,243;258,314|0,6;26,72;127,241;257,314|0,6;28,71;112,240;256,314|0,6;29,74;99,238;255,314|0,7;32,235;253,314|0,8;34,231;250,314|0,9;37,227;247,314|0,10;40,222;243,314|0,12;44,217;239,314|0,14;49,212;234,314|0,17;53,205;229,314|0,21;59,196;223,314|0,25;66,187;217,314|0,31;75,176;211,314|0,38;86,162;203,314|0,45;194,314|0,53;184,230;232,314|0,63;170,228;234,314|0,76;151,226;234,314|0,103;115,221;241,314|0,203;253,314|0,194;259,314|0,187;204,218;229,246;262,314|0,182;195,218;227,250;264,314|0,176;190,216;224,252;265,314|0,173;188,214;222,253;266,314|0,170;188,210;219,253;265,314|0,171;189,205;215,252;263,314|0,173;211,249;261,314|0,176;206,246;257,314|0,184;198,241;253,314|0,236;248,314|0,231;243,314|0,226;238,314|0,221;232,314|0,216;227,314|0,210;222,314|0,202;216,314|0,195;211,314|0,191;206,233;252,314|0,187;202,221;261,314|0,183;201,210;265,314|0,170;267,314|0,159;227,253;268,314|0,167;219,254;267,314|0,186;210,254;266,314|0,187;205,253;264,314|0,187;201,251;262,314|0,191;195,248;258,314|0,244;255,314|0,239;250,314|0,235;247,314|0,214;247,314|0,200;255,314|0,192;259,314|0,186;201,220;232,247;262,314|0,180;193,219;229,250;264,314|0,175;189,216;225,252;265,314|0,172;187,212;221,252;265,314|0,170;188,209;217,252;264,314|0,171;190,203;213,251;262,314|0,173;209,248;259,314|0,178;204,244;256,314|0,188;194,239;252,314|0,234;247,264;269,314|0,228;245,254;270,314|0,223;265,314|0,216;259,314|0,208;253,314|0,201;245,314|0,195;236,314|0,188;235,314|0,180;204,224;232,314|0,171;197,221;228,314|0,160;191,214;225,314|0,147;185,203;225,314|0,133;151,157;178,193;233,314|0,119;139,157;172,185;201,210;242,314|0,108;131,153;167,179;192,210;251,314|0,99;121,145;163,176;190,209;222,228;259,314|0,91;110,138;157,176;219,237;265,314|0,85;100,132;150,179;216,246;268,314|0,81;93,126;143,184;210,253;271,314|0,76;88,118;137,257;272,314|0,73;87,111;131,258;272,314|0,71;87,106;124,257;270,314|0,72;93,99;116,256;268,314|0,76;108,254;266,314|0,86;98,252;263,314|0,249;260,314|0,246;257,314|0,242;254,314|0,238;250,314|0,234;246,314|0,231;243,314|0,227;239,314|0,225;234,314|0,314|0,314|0,314|0,314|0,314|0,314|0,273;289,314|0,269;291,314|0,265;288,314|0,260;285,314|0,95;109,254;283,314|0,77;108,248;281,314|0,70;91,242;280,314|0,66;81,236;279,314|0,63;77,229;278,314|0,61;75,222;252,260;278,314|0,59;74,215;247,260;278,314|0,58;73,207;242,260;278,314|0,58;72,200;235,260;278,314|0,57;71,192;229,260;278,314|0,57;71,184;221,260;278,314|0,57;71,176;213,260;278,314|0,57;71,166;204,259;278,314|0,57;72,157;195,259;277,314|0,57;72,149;188,258;276,314|0,57;72,142;182,257;274,314|0,57;73,134;176,256;272,314|0,57;74,127;168,255;270,314|0,57;75,119;157,254;267,314|0,58;77,111;145,314|0,59;79,101;133,314|0,61;81,91;123,314|0,62;114,314|0,63;108,314|0,64;102,264;278,314|0,65;94,254;273,314|0,66;89,246;268,314|0,72;82,220;262,314|0,209;255,314|0,203;245,314|0,197;240,314|0,189;237,314|0,180;205,216;233,314|0,170;200,214;230,314|0,158;193,211;227,314|0,144;186,208;225,314|0,130;149,164;181,206;225,314|0,118;140,161;176,205;233,314|0,108;130,154;171,206;261,314|0,100;120,146;165,209;269,314|0,94;110,140;158,213;273,314|0,89;102,134;152,224;235,255;274,314|0,84;96,127;146,260;274,314|0,80;93,120;140,260;273,314|0,78;93,114;133,260;271,314|0,78;97,108;125,259;270,314|0,81;117,257;268,314|0,88;109,254;266,314|0,251;263,314|0,230;238,248;258,314|0,214;256,314|0,203;258,314|0,194;228,244;261,314|0,187;217,247;263,314|0,181;209,247;264,314|0,177;202,246;263,314|0,173;196,244;262,314|0,170;191,239;260,314|0,168;188,232;257,314|0,167;187,224;252,314|0,168;186,216;248,314|0,169;187,210;241,314|0,171;234,314|0,174;225,314|0,178;218,314|0,187;217,314|0,200;216,242;265,314|0,200;216,229;273,314|0,197;278,314|0,195;243,255;280,314|0,199;229,261;279,314|0,261;278,314|0,259;275,314|0,256;271,314|0,251;267,314|0,245;262,314|0,238;261,314|0,220;266,314|0,204;272,314|0,191;275,314|0,185;217,255;277,314|0,192;201,258;276,314|0,258;274,314|0,257;271,314|0,255;268,314|0,252;265,314|0,249;262,314|0,246;258,314|0,242;255,314|0,238;251,314|0,234;247,314|0,230;243,314|0,226;239,314|0,223;233,314|0,314|0,314', NAME_INK = null;
  var CREDIT = 'Team Lead \u00b7 Accenture Song \u00b7 2022 \u2013 Now', CREDIT_TOP = { cap: 0.70, asc: 0.74, x: 0.53, t: 0.64 };
  var INKL = { room: 34, flat: 7, span: 3, step: 2 };
  function nameInk() { if (!NAME_INK) NAME_INK = NAME_INK_S.split('|').map(function (c) { return c ? c.split(';').map(function (q) { var a = q.split(','); return [+a[0], +a[1]]; }) : []; }); return NAME_INK; }
  function inkTops(c) { var I = nameInk()[c], o = []; if (!I) return o; for (var i = 0; i < I.length; i++) if (I[i][1] < 314 && I[i][1] - I[i][0] >= INKL.room) o.push(I[i][1] - 1); return o; }
  function nearTop(c, y) { var T = inkTops(c), b = NaN; for (var i = 0; i < T.length; i++) if (Math.abs(T[i] - y) <= INKL.flat && !(Math.abs(b - y) <= Math.abs(T[i] - y))) b = T[i]; return b; }
  function inkLedges() {
    var out = [], nm = nameMap(), B = gWords(), c, i, k, y;
    if (nm) for (c = INKL.span; c < nameInk().length - INKL.span; c += INKL.step) {
      var T = inkTops(c);
      for (i = 0; i < T.length; i++) {
        var pts = [], ok = true;
        for (k = -INKL.span; k <= INKL.span && ok; k++) { y = k ? nearTop(c + k, T[i]) : T[i]; if (!(y === y)) ok = false; else pts.push([nm[0] + ((c + k) * 6 + 3) * nm[2], nm[1] + y * nm[2]]); }
        if (ok) out.push({ kind: 'name', pts: pts, x: nm[0] + (c * 6 + 3) * nm[2] });
      }
    }
    for (var L = 0; L < 2; L++) {   // (the links: every glyph's top; the box is the line box, 1.5 em at .875rem)
      var b = B[3 + L]; if (!(b[2] > b[0])) continue;
      var em = (b[3] - b[1]) / 1.5, base = b[3] - 0.4286 * em, G2 = LINK_GLYPHS[L], w = b[2] - b[0];
      for (i = 0; i < G2.length; i++) { var x0 = b[0] + G2[i][0] * w, x1 = b[0] + Math.min(G2[i][1], 1) * w; y = base - 1.5 - (G2[i][2] - 0.035) * em; out.push({ kind: 'link', pts: [[x0, y], [x1, y]], x: 0.5 * (x0 + x1), wb: b, topY: y }); }
    }
    var bc = B[2];   // (the credit: Geist Mono cells, 0.6 em each from the line's left edge; its line box 1.55 em)
    if (bc[2] > bc[0]) {
      var ce = (bc[3] - bc[1]) / 1.55, cb = bc[1] + (bc[3] - bc[1] - 1.3 * ce) / 2 + 1.005 * ce;
      for (i = 0; i < CREDIT.length; i++) {
        var ch = CREDIT.charAt(i), cl = /[A-Z0-9]/.test(ch) ? 'cap' : /[bdfhkl]/.test(ch) ? 'asc' : ch === 't' ? 't' : /[a-z]/.test(ch) ? 'x' : '';
        if (!cl) continue;
        var cx0 = bc[0] + (i + 0.18) * 0.6 * ce, cx1 = bc[0] + (i + 0.82) * 0.6 * ce; y = cb - 1 - CREDIT_TOP[cl] * ce;
        if (cx1 < bc[2]) out.push({ kind: 'link', pts: [[cx0, y], [cx1, y]], x: 0.5 * (cx0 + cx1), wb: bc, topY: y, credit: true });
      }
    }
    return out;
  }
  /* a ledge for the next landing: fresh, never the last one's nearby, and not under the pointer (avoid) */
  function gPickInk(r, p) {
    var Ls = inkLedges(), i, n = 0, pick1 = null;
    for (i = 0; i < Ls.length; i++) {
      var L1 = Ls[i];
      if (GU.lastX !== undefined && Math.abs(L1.x - GU.lastX) < 40 && Math.abs(L1.pts[0][1] - GU.lastY) < 40) continue;
      if (PTR.avoid && p && !p.gone && p.x >= 0 && Math.abs(L1.x - p.x) < 80 && Math.abs(L1.pts[0][1] - p.y) < 80) continue;
      var wgt = L1.kind === 'name' ? 1 : 2.5;   // (the name has many columns: the small words as likely as it overall)
      n += wgt; if (r() * n < wgt) pick1 = L1;
    }
    if (!pick1) return null;
    GU.lastX = pick1.x; GU.lastY = pick1.pts[0][1];
    return { type: 'ink', ledge: pick1 };
  }
  /* (pointer, the owner 2026-11-05: "the birds should be more interactive with the mouse. do u get what i mean? did u
     even research all possible 100% ways and figure out the most delightful?") The research's set (POINTER-RESEARCH.md):
     real birds notice, weigh the approach (its speed, its directness), flee up and away, and come back later, bolder with
     a gentle visitor. Each play its own switch (PTR; the preview branches try them one by one):
       flush: a perched gull notices a pointer coming (it stops idling, head up), and flushes up and away from it when
         it keeps closing fast and straight; a slow or sideways approach gets much closer; back 20-60 s later.
       shiver: a pointer sweeping past a flight: the nearest bird rolls hard and the roll passes bird to bird away from
         the pointer, every path unchanged.
       perch: the pointer left still in open sky: a bold lone gull lands on its tip, and flushes the moment it moves
         (a phone: a press held 0.8 s, the bird landing above the fingertip).
       avoid: a perch is never taken by the pointer, and a gull on its way in goes on by if the pointer comes to its perch.
       click: the click's gull flushes a perched bird near it and shivers the flights it passes.
     One personality underneath, "wary but curious": each perched bird's boldness from the visit's own streams (x0.7-1.4,
     bolder: closer), and the visit's trust (GU.trust: a gentle approach shrinks every distance 8 %, to half at most; a
     flush grows them 15 %). Only what a visitor already looks at reacts; every escape is up and away into the distance;
     reduced motion: none of it */
  var PTR = { flush: true, shiver: true, perch: true, avoid: true, click: true };
  /* (the owner, 2026-11-06: "why is the bird flying away when i just get near it instead of actually going on top of it?")
     friendly and curious, not skittish: a pointer held slow or still (under PJ.slow px/s for PJ.setout s) brings a gull
     to perch on its tip (PJ.first s into the visit at the soonest, PJ.gap s apart, PJ.max a visit); it rides a slow
     pointer (eased over PJ.rideTau s) and goes, into the world, on a jerk (over PJ.jerk px/s), a press, a click, a drag
     or the pointer leaving; a slow approach to a gull on a letter (within PJ.hop of its spans) has it hop onto the tip;
     only a fast jab (over PJ.jab px/s, coming at it) startles it off */
  var PJ = { slow: 40, setout: 1.0, first: 3, gap: [12, 22], max: 30, rideTau: 0.12, jerk: 600, jab: 300, hop: 3.2, vc: [40, 110] };
  var PF = { alert: 7, flush: 3.5, tauA: 1.2, tauF: 0.5, cosF: 0.707, gentleV: 60, gentleCos: 0.5, gentleK: 0.6, trustIn: 0.92, trustOut: 1.15, trustMin: 0.5, trustMax: 1.5, back: [20, 60], stay: 0.15, crouch: 0.125, react: 0.06 };
  var G_FIRST = 8, G_WORD_MEAN = 40, G_WORD_MIN = 20, G_WORD_MAX = 30, G_FLUSH_T = 120, G_REST = 2.0;
  var GU = { trust: 1, flushHold: 0, list: [], k: 0, nWord: 0, nPtr: 0, lastWord: -1e9, nextWord: G_FIRST, lastPtr: -1e9, flushAt: -1e9, flushN: 0, firstRest: true, log: [], force: null, on: true,   /* (the perched guests on the words; the pointer's perch needs the hover listener, which the world does not have: its HOVER stays gone, so it never comes) */
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
  function openSkyAt(x, y) {   // (P1: 40 px from the edges: the pointer anywhere else, over the words too, may have a gull)
    return !(x < 40 || y < 40 || x > W - 40 || y > H - 40);
  }
  /* a perch resolved on this window: { pts: [[x, y] CSS px, ...] the surface, x (where it sits), dir (the side it comes
     from), kind ('name' | 'link' | 'pointer') } */
  function perchOf(spec) {
    var B = gWords(), pts = [], i;
    if (spec.type === 'ink') {   // (a ledge on any letter: inkLedges)
      var Lg = spec.ledge, dr = Lg.x < W / 2 ? -1 : 1;
      return Lg.kind === 'name' ? { kind: 'name', id: 'ink', pts: Lg.pts, x: Lg.x, dir: dr } : { kind: 'link', id: Lg.credit ? 'credit' : 'ink', pts: Lg.pts, x: Lg.x, dir: dr, qa: 55, qe: 22, sk: G_LINK_K, wb: Lg.wb, topY: Lg.topY };
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
  function gPlan(g, P) {
    var sp = gSpanPx(g) * (P.sk || 1), dir = P.dir, sy = surfY(P.pts, P.x); if (!(sy === sy)) sy = surfTop(P.pts);
    var vc = P.kind === 'pointer' ? clamp(2.6 * topSpeed(), PJ.vc[0], PJ.vc[1]) : clamp(1.6 * topSpeed(), 24, 70), B = gWords(), i;   // (the owner, 2026-11-06: noticeable: it comes in 3-5 s)
    g.sp = sp; g.vc = vc; g.dir = dir; g.face = -dir; g.px0 = P.x; g.py0 = sy;
    var Lg = (P.kind === 'pointer' ? 2.6 : P.kind === 'link' ? (P.end ? 3 : 4.5) : 5.5) * sp, qa = (P.qa !== undefined ? P.qa : P.kind === 'name' ? 40 : 24) * DEG, qe = (P.qe !== undefined ? P.qe : P.kind === 'name' ? 18 : 8) * DEG;   // (perch lane: onto a stroke from above)
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
    g.steps = P.kind === 'pointer' ? [] : (g.r() < 0.5 ? [0.55] : [0.55, 1.15]); if (P.kind === 'link') g.steps = [];   // (perch lane: on a letter it stays on it)   // (1-2 sidling steps in the first 1.5 s)
    g.stepD = (g.r() < 0.5 ? -1 : 1) * pick(g.r, [0.02, 0.04]) * sp;
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
  /* (perch lane) the click's bird: a click or tap on the page (not a drag, not a link: HOST.clicks) lets a gull go into
     the world there (worldBird: from the world point under the click, up and away to the click's side, the world's own
     from then on). At most G_CLICK_MAX in the air at once; the perches' own guests are not held up by them */
  var G_CLICK_MAX = 4, GCLK = [], G_TO_WORLD = 0.3;   // (s into its leap: handed to the world)
  function gBusy() { for (var i = 0; i < GU.list.length; i++) if (!GU.list[i].click) return true; return false; }
  function gClick(x, y) {
    var nC = 0, i; for (i = 0; i < PLACES.length; i++) if (PLACES[i].click) nC++;
    if (nC >= G_CLICK_MAX || !(x >= 0 && y >= 0 && x <= W && y <= H)) { GU.log.push({ t: +t.toFixed(2), ev: 'click-skip', n: nC }); return false; }
    if (PTR.click) { gDisturb(x, y); shiverAt(x, y); }   // (pointer: the click's gull flushes a perched bird near it, and shivers the flights by it)
    var r = guestRng(), a = -Math.PI / 2 + (x < W / 2 ? -1 : 1) * (0.25 + 0.7 * r()) * (r() < 0.8 ? 1 : -1);   // (up, leaning out to its side, now and then across)
    return !!worldBird(x, y, gSpanPx({ kind: 'gull' }) * G_PTR_K, Math.cos(a), Math.sin(a), 'click');
  }
  /* (pointer) a perched guest weighs the pointer each step: inside the alert distance (or a pointer coming on to touch
     it within PF.tauA s) it notices (gw.alertW: its breath stilled, head up, within PF.react s); inside the flush distance
     still closing, or coming straight at it (within 45 deg) to touch within PF.tauF s, it flushes up and away from the
     pointer, after a crouch of one or two hand frames. Distances in its spans as drawn, shrunk by its boldness and the
     visit's trust; a slow (< PF.gentleV px/s) or sideways (> 60 deg) approach PF.gentleK of them. An approach that ends
     without a flush, gentle all the way, shrinks the visit's trust; a flush grows it. A few bold birds stay for anything
     but a touch or a press */
  function gWeigh(g, p, dt) {
    if (g.bold === undefined) { g.bold = 0.7 + 0.7 * g.r(); g.stays = g.bold > 1.2 && g.r() < PF.stay; }
    var gone = p.gone || !(p.x >= 0), ddx = p.x - g.px0, ddy = p.y - g.py0, dd = Math.sqrt(ddx * ddx + ddy * ddy) || 1e-6;
    var vc = gone ? 0 : -(GU.vx * ddx + GU.vy * ddy) / dd, cosA = GU.sp > 1 ? vc / GU.sp : 0, gentle = GU.sp < PF.gentleV || cosA < PF.gentleCos;
    var k = GU.trust / g.bold * (gentle ? PF.gentleK : 1), aR = PF.alert * g.sp * k, fR = PF.flush * g.sp * k, tau = vc > 1 ? dd / vc : Infinity;
    var alert = !gone && g.phase === 'sit' && (dd < aR || tau < PF.tauA);
    if (alert) { if (!g.alertT) { g.alertT = t; g.gentleA = true; } if (!gentle) g.gentleA = false; }
    else if (g.alertT) { if (g.gentleA) GU.trust = Math.max(PF.trustMin, GU.trust * PF.trustIn); g.alertT = 0; }
    g.alertW = (g.alertW || 0) + ((alert ? 1 : 0) - (g.alertW || 0)) * (1 - Math.exp(-dt / PF.react));
    if (gone || g.phase !== 'sit') return;
    var touch = dd < 1.2 * g.sp, press = p.down && !p.touch && dd < 8 * g.sp;
    if (PTR.perch && !p.touch && GU.sp < 1.5 * PJ.slow && dd < PJ.hop * g.sp && t - g.t0 - g.tT > 0.6) { gHop(g, p); return; }   // (a slow hand at it: onto the tip)
    var flush = GU.sp > PJ.jab && vc > 0 && (dd < fR || (tau < PF.tauF && cosA > PF.cosF)) && (!g.stays || touch);   // (only a fast jab startles it)
    if (flush || press) {
      g.fastCrouch = true; gLeave(g, 'flush', ddx, ddy); GU.flushAt = t; GU.flushN++;
      GU.trust = Math.min(PF.trustMax, GU.trust * PF.trustOut); GU.flushHold = PF.back[0] + (PF.back[1] - PF.back[0]) * g.r();
      var lg = GU.log[GU.log.length - 1]; if (lg) { lg.fd = +(dd / g.sp).toFixed(2); lg.k = +k.toFixed(2); }
    }
  }
  /* (the owner, 2026-11-06) a gull on a letter hops onto the pointer's tip: the same glide in to the tip as P1's, its
     way in from the window's edge replaced by a hop up off its letter */
  function gHop(g0, p) {
    var spec = { type: 'pointer', x: p.x, y: p.y }, P = perchOf(spec), r = guestRng();
    var g = { r: r, kind: g0.kind, why: 'pointer', spec: spec, t0: t, phase: 'in', id: 'g' + GU.k, ph0: r(), rate: g0.rate, ride: [0, 0], leaveAt: -1, away: [0, -1], P: P, hop: true };
    gPlan(g, P);   // (its glide onto the tip; its start replaced below)
    var sx = g0.px0, sy = g0.py0 - 0.5 * g.sp, dx = g.Q[0] - sx, dy = g.Q[1] - sy, L = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    var tdx = g.Cp[0] - g.G[0], tdy = g.Cp[1] - g.G[1], tdl = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
    g.S = [sx, sy]; g.L = L; g.mQ = [tdx / tdl * L, tdy / tdl * L]; g.mS = [dx, dy - 0.8 * L];   // (up off the letter first)
    g.Ti = clamp(L / (1.6 * g.vc), 0.35, 1.4); g.vg = L / g.Ti; g.ve = 0.24 * g.vg; g.Tr = 2 * g.Lb / (g.vg + g.ve);
    g.tF = Math.max(0, g.Ti + g.Tr - 0.6); g.tT = g.Ti + g.Tr; g.sit = pick(g.r, [25, 60]); g.tO = g.tT + g.sit; g.tE = g.tO + 60; g.steps = []; g.stepD = 0; g.acts = [];
    var k = GU.list.indexOf(g0); if (k >= 0) GU.list.splice(k, 1);
    GU.list.push(g); GU.nPtr++; GU.lastPtr = t; GU.restUsed = true;
    GU.trust = Math.max(PF.trustMin, GU.trust * PF.trustIn);
    GU.log.push({ t: +t.toFixed(2), ev: 'hop', from: g0.id, x: +p.x.toFixed(1), y: +p.y.toFixed(1), Ti: +g.Ti.toFixed(2), Tr: +g.Tr.toFixed(2) });
  }
  /* (pointer) the click's gull flushes a perched guest near it (within 60 px or four of its spans) */
  function gDisturb(x, y) {
    for (var i = 0; i < GU.list.length; i++) {
      var g = GU.list[i]; if (g.click || g.phase !== 'sit' || g.leaving) continue;
      var dx = x - g.px0, dy = y - g.py0;
      if (Math.sqrt(dx * dx + dy * dy) < Math.max(60, 4 * g.sp)) { g.fastCrouch = true; gLeave(g, 'flush', dx, dy); GU.flushAt = t; GU.flushHold = PF.back[0] + (PF.back[1] - PF.back[0]) * g.r(); }
    }
  }
  /* (pointer) the shiver: a pointer sweeping past a flight (within SHIV.span of a bird's spans as drawn, at SHIV.v px/s
     or more) or the click's gull: the nearest bird rolls hard (twice its bank, SHIV.deg at least) and eases back, and
     the roll passes bird to bird away from the pointer (SHIV.per s a bird, nearest first); its path, its place and its
     wings are untouched (poseBird adds the roll to the drawn body only). A flight shivers at most once in SHIV.gap s,
     and after SHIV.n shivers lets the pointer be for SHIV.rest s. Its timings are drawn from a stream of its own, so no
     flight's own draws change */
  var SHIV = { span: 5, v: 100, gap: 6, n: 3, rest: 30, deg: 20, up: 0.167, decay: 0.5, per: [0.08, 0.12], minPx: 8 }, SHR = null, SHM = [];
  function shiverAt(x, y) {
    if (!PTR.shiver || HOST.reduced() || FORCED) return;
    if (!SHR) SHR = vstream(9300);
    for (var li = 0; li < 2; li++) {
      var L = li ? PLACES : flights;
      for (var i = 0; i < L.length; i++) {
        var F = L[i]; if (F.gone || t < (F.shNext || 0)) continue;
        SHM.length = 0; var near = false;
        for (var j = 0; j < F.m.length; j++) {
          var m = F.m[j], s = m.s; if (!s || !s.on || !(s.lastOp > 0.3)) continue;
          var sp = Math.max(s.bx1 - s.bx0, s.by1 - s.by0); if (!(sp >= SHIV.minPx)) continue;
          var cx = 0.5 * (s.bx0 + s.bx1), cy = 0.5 * (s.by0 + s.by1), d = Math.sqrt((cx - x) * (cx - x) + (cy - y) * (cy - y));
          if (d < SHIV.span * sp) near = true;
          SHM.push([d, m, cx]);
        }
        if (!near) continue;
        SHM.sort(function (a, b) { return a[0] - b[0]; });
        for (var q = 0, at = t; q < SHM.length; q++) { SHM[q][1].shT = at; SHM[q][1].shS = SHM[q][2] >= x ? 1 : -1; at += SHIV.per[0] + (SHIV.per[1] - SHIV.per[0]) * SHR(); }
        F.shN = (F.shN || 0) + 1;
        if (F.shN >= SHIV.n) { F.shN = 0; F.shNext = t + SHIV.rest; } else F.shNext = t + SHIV.gap;
        GU.log.push({ t: +t.toFixed(2), ev: 'shiver', id: F.id || F.key, n: SHM.length });
      }
    }
  }
  /* the shiver's roll for a drawn bird now (deg, + right wing down), 0 outside one */
  function shiverRoll(m, coord) {
    if (m.shT === undefined) return 0;
    var u = t - m.shT; if (u < 0) return 0;
    if (u > 3) { m.shT = undefined; return 0; }
    return m.shS * Math.max(2 * Math.abs(coord), SHIV.deg) * (u < SHIV.up ? u / SHIV.up : Math.exp(-(u - SHIV.up) / SHIV.decay));
  }
  /* (the owner, 2026-11-06: "why are the birds that i click to spawn are flying stuck with the camera instead of going
     out into the world ?!") A bird let go into the world: a living-sky gull (lvMake, as every flock is made) at the
     world point seen at (x, y) on the window through the camera as drawn, at the distance where a gull spans spanPx
     there, flying off at a startled pace, climbing, its way the window's (ax, ay) turned into the world (across the view
     and away from the eye, so the camera, flying on, never runs it down): from then on it is the world's, fixed in it,
     a drag swinging the view past it, and it goes only beyond an edge or into the distance (never a fade). Returns it,
     or null (no slot, or no camera) */
  var WB = { v: 16, climb: 40, spanMin: 18, spanMax: 160, dMin: 6, dMax: 90 };   // (spanMax over every perched gull's span (70-109 px on a desktop): it leaves at the size it sat, never shrinking at the hand-off)
  function worldBird(x, y, spanPx, ax, ay, why) {
    var C = camDrawn(); if (!C || !C.f || FORCED || !liveOn()) return null;
    lvCam(C);
    var nx = (2 * x / W - 1) * VW.tanX, ny = (1 - 2 * y / H) * VW.tanY;
    var dx = C.f[0] + nx * C.r[0] + ny * C.u[0], dy = C.f[1] + nx * C.r[1] + ny * C.u[1], dz = C.f[2] + nx * C.r[2] + ny * C.u[2];
    var S = SORTS.gull, spm = B_SPAN * S.size * MODEL_K, sp = clamp(spanPx || 28, WB.spanMin, WB.spanMax);
    var D = clamp(spm * (W / 2) / VW.tanX / sp, WB.dMin, WB.dMax);   // (along the view: the depth where it spans sp px)
    var px = C.pos[0] + dx * D, py = C.pos[1] + dy * D, pz = C.pos[2] + dz * D;
    var gnd = lvGround(px, pz); if (py < gnd + 4) py = gnd + 4;
    var al = Math.sqrt(ax * ax + ay * ay) || 1; ax /= al; ay /= al;
    var side = ax === 0 ? (x < W / 2 ? -1 : 1) : ax;   // (its way across the view: the window's way, or out by the nearer side)
    var hx = C.r[0] * side * 0.85 + C.f[0] * 0.55, hz = C.r[2] * side * 0.85 + C.f[2] * 0.55;
    var P = lvMake('commute', px, py, pz, Math.atan2(hx, hz), skyCls(), ['single', 'gull', 1]);
    if (!P) return null;
    var n0 = (W / 2) / VW.tanX * MPU / D; P.fadeS = [0.15 * n0, 0.33 * n0];   // (full ink where it was let go, and until it is three times as far: then gone by distance)
    P.flee = WB.climb * (ay < -0.2 ? 1 : 0.5); P.v0 = WB.v; P.st.v = WB.v; P.st.y0 = py; P.click = why === 'click'; P.why = why; P.role = 'flee';
    for (var q = 0, j = 0; q < slots.length && j < P.m.length; q++) if (!slots[q].busy) { slots[q].busy = true; P.m[j].s = slots[q]; dress(slots[q], P.m[j].d); j++; }
    P.id = 'p' + P.key; PLACES.push(P); STATS.lvMade = (STATS.lvMade || 0) + 1; lvExtend(P, LV_AHEAD);
    GU.log.push({ t: +t.toFixed(2), ev: 'world-bird', why: why, x: +x.toFixed(1), y: +y.toFixed(1), d: +D.toFixed(1) });
    return P;
  }
  function gPathClear(g, P, B) {
    var n = 40, i, hw = 0.6 * g.sp, hh = 0.35 * g.sp, TT = g.Ti + g.Tr;
    for (i = 0; i <= n; i++) {
      var ti = TT * i / n; gPos(g, ti, GTMP);
      if (!gOrdClearAt(GTMP.x, GTMP.y, ti, 2 * g.sp)) return false;   // (fix: every ordinary bird where it will be then, not only where it enters)
      if (P.kind === 'link' && Math.abs(GTMP.x - g.px0) < 1.5 * g.sp && Math.abs(GTMP.y - g.py0) < 1.5 * g.sp) { var nT = Math.sqrt((GTMP.x - g.T[0]) * (GTMP.x - g.T[0]) + (GTMP.y - g.T[1]) * (GTMP.y - g.T[1])) < 0.8 * g.sp; if (P.end && GTMP.x - (nT ? 0.2 : 0.5) * hw < P.keepX && GTMP.y + 0.5 * hh > P.wb[1]) return false; if (!P.end && !nT && GTMP.y + 0.5 * hh > P.topY && GTMP.x + 0.5 * hw > P.wb[0] && GTMP.x - 0.5 * hw < P.wb[2]) return false; continue; }   // (perch lane)   // (the link guest at its own perch: never over the word's letters)
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
  function gPosR(g, tt, o) { gPos(g, tt, o); o.x += g.ride[0]; o.y += g.ride[1]; return o; }   // (as drawn: its path carried by the pointer's slow drift, the ride)
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
      gPosR(g, tt, GTMP); gPosR(g, tt + 0.1, GTMP2);
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
      if (GU.sp < PJ.slow && !p.down) { if (GU.restT === 0) { GU.restT = t; GU.restX = p.x; GU.restY = p.y; GU.restUsed = false; } }   // (slow or still: friendly)
      else { GU.restT = 0; }
    } else { GU.px = -1; GU.restT = 0; GU.sp = 0; }
    var setout = p.touch ? 0 : PJ.setout;   // (pointer: a second slow or still; a touch held 0.8 s already)
    if (!p.gone && !p.touch && GU.sp >= SHIV.v) shiverAt(p.x, p.y);   // (pointer: the shiver)
    var resting = GU.restT > 0 && t - GU.restT >= setout && !p.gone && !p.down;   // (fix: it sets out after the rest; it lands 4-6 s later)
    /* the guests */
    for (i = GU.list.length - 1; i >= 0; i--) {
      var g = GU.list[i], tt = t - g.t0;
      if (g.phase === 'in' && tt >= g.tT) { g.phase = 'sit'; GU.log.push({ t: +t.toFixed(2), ev: 'touch', id: g.spec.id || 'pointer', after: +(t - (g.restAt || g.t0)).toFixed(2) }); }
      if (g.phase === 'sit' && !g.leaving && tt >= g.tO - 0.3) gLeave(g, 'done');   // (its own time up: the way out chosen as for any leave)
      if (g.phase === 'sit' && tt >= g.tO) g.phase = 'off';
      if (!g.world && g.last && ((g.leaving && tt - g.tO > G_TO_WORLD) || (g.phase === 'by' && tt - g.byT > G_TO_WORLD) || (g.phase === 'in' && p.steer))) {   // (the owner, 2026-11-06: into the world, never glued to the window)
        var aw2 = g.leaving ? g.away : g.phase === 'by' ? [Math.cos(g.byA0 || 0), Math.sin(g.byA0 || 0) - 0.3] : [g.dir || 1, -0.5];
        if (worldBird(g.last.x, g.last.y, g.sp, aw2[0], aw2[1], 'leave:' + (g.leaveWhy || g.why))) { g.world = true; GU.list.splice(i, 1); continue; }
      }
      if ((g.phase === 'off' && tt >= g.tE) || (g.phase === 'by' && tt - g.byT > 40) || g.done) { GU.list.splice(i, 1); GU.log.push({ t: +t.toFixed(2), ev: 'done', id: g.id }); continue; }
      if (g.why === 'pointer') {
        var mdx = p.x - g.spec.x, mdy = p.y - g.spec.y, jerk = GU.sp > PJ.jerk;
        if ((g.phase === 'in' || g.phase === 'sit') && (p.gone || p.down || p.steer || jerk)) {
          if (g.phase === 'in') gLeave(g, jerk ? 'jerk' : 'moved');
          else { g.fastCrouch = true; gLeave(g, p.down ? 'press' : jerk ? 'jerk' : 'gone', GU.vx || mdx, GU.vy || mdy); }
        } else if (g.phase === 'in' || g.phase === 'sit') {   // (the pointer moving slowly: it rides along, gently)
          var kr = 1 - Math.exp(-dt / PJ.rideTau); g.ride[0] += (mdx - g.ride[0]) * kr; g.ride[1] += (mdy - g.ride[1]) * kr;
        }
      } else if (g.phase === 'in' && !g.click && PTR.avoid && !p.gone && p.x >= 0 && !g.leaving && GU.sp > PJ.slow && Math.abs(p.x - g.T[0]) + Math.abs(p.y - g.T[1]) < 2 * PF.flush * g.sp) {
        gLeave(g, 'moved');   // (pointer: the pointer at its perch: it goes on by, on its way and up out of the window)
      } else if (g.phase === 'sit' || g.phase === 'in') {
        /* a perched guest on the words: it notices a pointer coming, weighs it, and flushes (gWeigh) */
        if (PTR.flush) gWeigh(g, p, dt);
        if (g.phase === 'sit' && tt - g.tT > 8 && !g.early && gNearOrdinary(g.px0, g.py0, 6 * g.sp)) { g.early = true; if (g.r() < 0.15) gLeave(g, 'flock'); }   // (fix: never before 8 s on the perch)
      }
      if (g.phase === 'sit' && !g.leaving && tt - g.tT > 1 && !gOrdClearAt(g.px0, g.py0, 0.8, 1.2 * g.sp)) gLeave(g, 'crowd');   // (fix: only a bird about to come onto it: its approach looked ahead for one)
    }
    if (!GU.on) return;   // (perch lane: below, the perches' own schedule)
    /* P1: a resting pointer in open sky gets a gull (or a crow) */
    if (PTR.perch && resting && !GU.restUsed && !gBusy() && t >= PJ.first && t - GU.lastPtr >= (GU.ptrGap || PJ.gap[0]) && GU.nPtr < PJ.max && skyCls() !== 'none' && openSkyAt(p.x, p.y)) {
      var rr = vstream(7900 + GU.nPtr * 7 + Math.floor(GU.restT));
      if (!(t < GU.ptrRetry)) {
        if (gStart({ type: 'pointer', x: p.x, y: p.y }, 'pointer')) { GU.restUsed = true; GU.nPtr++; GU.lastPtr = t; GU.ptrGap = PJ.gap[0] + (PJ.gap[1] - PJ.gap[0]) * rr(); GU.list[GU.list.length - 1].restAt = GU.restT; }
        else GU.ptrRetry = t + 0.5;
      }
    }
    /* W1, W2: the word play's own clock */
    if (GU.force && !gBusy()) { var fs = GU.force; GU.force = null; if (fs.type === 'any') fs = gPickInk(guestRng(), p) || fs; if (fs.type !== 'any' && gStart(fs, fs.type)) { GU.nWord++; GU.lastWord = t; } else if ((fs.tries = (fs.tries || 0) + 1) < 40) GU.force = fs; }
    if (!gBusy() && t >= GU.nextWord && GU.nWord < G_WORD_MAX && t - GU.flushAt >= (GU.flushHold || G_FLUSH_T) && t - GU.lastWord >= G_WORD_MIN * (W < 700 ? 1.6 : 1) && skyCls() !== 'none') {   // (perch lane: wider on a phone; a click's bird does not hold it up)
      var rw = vstream(7800 + GU.nWord * 13 + GU.k), spec;
      GU.nextWord = t + Math.max(G_WORD_MIN, -G_WORD_MEAN * Math.log(1 - 0.999 * rw()));
      if (!(resting && !p.gone)) {
        spec = gPickInk(rw, p);   // (the owner, 2026-11-06: any letter, fresh each time)
        if (!spec) { GU.nextWord = t + 5; spec = null; }
        if (spec && gStart(spec, spec.type)) {
          var gn = GU.list[GU.list.length - 1];
          if (PTR.avoid && !p.gone && p.x >= 0 && Math.sqrt((p.x - gn.T[0]) * (p.x - gn.T[0]) + (p.y - gn.T[1]) * (p.y - gn.T[1])) < PF.alert * gn.sp) { GU.list.pop(); GU.log.push({ t: +t.toFixed(2), ev: 'perch-by-pointer', id: spec.id }); GU.nextWord = t + 10; }   // (pointer: not under the pointer; tried again soon)
          else { GU.nWord++; GU.lastWord = t; }
        } else if (spec) GU.nextWord = t + 6;   // (no room now: tried again soon)
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
      gPosR(g, tt, o); gPosR(g, tt + 0.1, GTMP);
      var vx = (GTMP.x - o.x) / 0.1, vy = (GTMP.y - o.y) / 0.1, eF = 1 - gss((tt - (g.Ti - 1.2)) / 1.2), vk = o.vk === undefined ? 1 : o.vk;
      gbeat(kind, g.ph0 + g.rate * tt, 1, GT1); gmix(GP22, GL, GT1, eF);
      /* (perch lane) it banks into its turns (its heading's rate on the window, right wing down turning right) and rocks */
      gPosR(g, Math.max(0, tt - 0.125), GTMP2); var hr = Math.atan2(vy, vx) - Math.atan2(o.y - GTMP2.y, o.x - GTMP2.x);
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
      gPosR(g, tt, o);
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
      o.x += g.P.kind === 'link' ? 0 : clamp(shx, -0.04 * g.sp, 0.04 * g.sp); o.yaw += g.face * clamp(shy, -18, 18);
      if (GDEV.p22) for (j = 0; j < 22; j++) GP22[j] = GDEV.p22[j];
      if (GDEV.yaw !== undefined) o.yaw = g.face * GDEV.yaw;
      // (perch lane: its breath, a slow sway; GDEV.lp: the link guest pitched down, a lab knob: level it sat down among the letters)
      var aw = g.alertW || 0;   // (pointer: it has noticed the pointer: its breath stilled, its head up)
      o.pitch = K0.pitch + (GDEV.pitch || 0) + (1 - aw) * (2.6 * Math.sin(TAU * sitT / 3.7 + 1.3) + 1.4 * Math.sin(TAU * sitT / 1.9)) + 6 * aw - (g.P.kind === 'link' ? (GDEV.lp !== undefined ? GDEV.lp : 0) : 0); o.el = GDEV.el !== undefined ? GDEV.el : PERCH.el; o.lift = g.P.kind === 'name' && Math.max(VW.ddpr || 0, VW.bdpr || 0, VW.dpr || 1) >= 2 ? 0.5 : 0; o.fixW = 1;   // (fix: 1.2 px over a stroke or the underline, its ink off the letters' ink: L14)
      o.phase = sitT < 0.25 ? 'touch' : sitT < 1.2 ? 'settle' : 'sit';
      return o;
    }
    /* leaving: the crouch (0.24 s), the wings open to the stroke's top, the big quick beats, up and away */
    var uo = tt - g.tO, tC = g.noCrouch ? 0 : g.fastCrouch ? PF.crouch : 0.24, tB = g.noCrouch ? 0.1 : 0.32;
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
  var PIN_SLOTS = [];   // (the guests' slots: drawn as any bird, apart from the ring)
  function pinSlot(i) {
    while (PIN_SLOTS.length <= i) PIN_SLOTS.push({ key: 777 + PIN_SLOTS.length, busy: true, on: true, d: null, kind: 'gull', P16: new Float64Array(48), X16: new Float64Array(48), D: new Float32Array(32), body: new Float64Array(3), nb: new Float64Array(3), fw: new Float64Array(3), lw3: new Float64Array(3), vw: new Float64Array(3), aw: new Float64Array(3),
      roll: 0, E: new Float64Array(3), eOk: false, fold: new Float64Array(6), hold: 1, cw: new Float64Array(3), cwH: new Float64Array(3), cwHt: new Float64Array(3).fill(-1e9), cwNow: new Float64Array(3), cwNext: -1, cwAt: -1e9, spanPx: 0, floorPx: 1, filt: 1, halo: 0, haloE: 3, legib: 0 });
    return PIN_SLOTS[i];
  }
  var GSLOT = [], GHALO = 1, GLOWX = 0, GFOOT = [], GFP = [];
  function guestBird(g, s, C, dt, L, tt) {
    var kind = g.kind, i;
    s.kind = kind; if (!s.X46) slotArrays(s);
    var spm = B_SPAN * (SORTS[kind] ? SORTS[kind].size : 1) * MODEL_K;
    g.dist = (spm / MODEL_K) * (W / 2) / (VW.tanX * gSpanPx(g) * (g.P.sk || 1));
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
        if (g.probe) { g.cS = cy0; g.cX = cx0; /* (the probe: the solved place itself) */ } else if (A.holdFix && g.cS !== undefined) { /* (fix: held) */ } else if (g.cS === undefined || fixW === 0) { g.cS = cy0; g.cX = cx0; } else if (tt - g.tT > 0.5) { g.cS = cy0; g.cX += (cx0 - g.cX) * cK; } else { g.cS += (cy0 - g.cS) * cK; g.cX += (cx0 - g.cX) * cK; }
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
        if (sy > lowAll) GLOWX = sx; GFP.push(sx, sy); lowAll = Math.max(lowAll, sy); sx0 = Math.min(sx0, sx); sx1 = Math.max(sx1, sx);
        if (ptr) continue;
        var sfc = surfY(g.P.pts, sx - g.ride[0]); if (sfc === sfc) { anyOn = true; worst = Math.max(worst, sy - (sfc + g.ride[1])); GFOOT.push(sy - (sfc + g.ride[1])); }
      }
      if (!anyOn) worst = lowAll - (surfTop(g.P.pts) + g.ride[1]);
      if (anyOn && !ptr) worst -= 1.6;   // (perch lane: the foot settled into the letter, the letter drawn over it: a pointed foot on a rounded top otherwise shows sky at its edges)
      GFOOT.length = 0;
      need += worst / Math.max(fixW, 1e-3);
      var fxS = 0, fxN = 0; for (var qp = 0; qp < GFP.length; qp += 2) if (GFP[qp + 1] >= lowAll - 1.5) { fxS += GFP[qp]; fxN++; } GFP.length = 0;
      needX += (A.x - (fxN ? fxS / fxN : GLOWX)) / Math.max(fixW, 1e-3);   // (its drawn middle over the perch's middle; perch lane: its lowest point, its feet, on the perch's point: on the pointer the tip, on a letter its middle; the owner: ON the letter)
    }
    for (i = 0; i < 16; i++) { var vi = P16MAP[i]; if (vi < 0) { s.X16[3 * i] = bx; s.X16[3 * i + 1] = by; s.X16[3 * i + 2] = bz; } else { s.X16[3 * i] = s.X46[3 * vi]; s.X16[3 * i + 1] = s.X46[3 * vi + 1]; s.X16[3 * i + 2] = s.X46[3 * vi + 2]; } }
    s.body[0] = bx; s.body[1] = by; s.body[2] = bz; s.nb[0] = zx; s.nb[1] = zy; s.nb[2] = zz;
    s.fw[0] = fx; s.fw[1] = fy; s.fw[2] = fz; s.lw3[0] = lx; s.lw3[1] = ly; s.lw3[2] = lz; s.roll = A.roll; s.pitch = A.pitch;
    s.d = { span: spm / MODEL_K / MPU, model: spm / MPU };
    if (!projectBird(s, C)) return null;
    lightBird(s, L, true, dt);
    if (GDEV.tone) { var tw = GDEV.tone, tm = Math.max(s.E[0], s.E[1], s.E[2], GDEV.white || 0); for (i = 0; i < 3; i++) s.E[i] += (tm - s.E[i]) * tw; }
    if (PERCH.white && A.el > 0) { var pw = clamp(A.el / PERCH.el, 0, 1) * PERCH.white, pm = Math.max(s.E[0], s.E[1], s.E[2]); if (pm < pw) for (i = 0; i < 3; i++) s.E[i] = s.E[i] * (pw / Math.max(pm, 1e-4)) * 0.35 + pw * 0.65; }   // (perch lane: only ever lighter)
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
      nB++;
    }
    return nB;
  }
  function guestReset() { GU.list.length = 0; GU.k = 0; GU.nWord = 0; GU.nPtr = 0; GU.lastWord = -1e9; GU.nextWord = G_FIRST; GU.lastPtr = -1e9; GU.flushAt = -1e9; GU.flushN = 0; GU.firstRest = true; GU.log.length = 0; GU.restT = 0; GU.px = -1; GU.ptrRetry = -1e9; GU.trust = 1; GU.flushHold = 0; GU.ptrGap = PJ.gap[0]; }
