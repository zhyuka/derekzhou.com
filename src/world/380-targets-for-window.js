  /* ---------------------------------------------------------------- targets for the window */
  /* the world is drawn at OUT (the tier's density: worldDpr); the canvas itself is FULL, the device's own
     resolution (the birds' ink is drawn at it, crisp at the device's own px; the world's finished frame is put up
     to it with one bilinear pass) */
  /* the canvas at most FULL_DPR device px a CSS px and FULL_PX in all; where that is the world's own size
     (DIRECT: a window at 1 or 1.25 device px a CSS px) the composite is drawn straight onto it, and TG.win holds only
     what lies under the birds (HOST.under: their boxes copied in) */
  var FULL_DPR = 2, FULL_PX = 2.5e6, DIRECT = false;
  /* (the owner's word of 2026-11-03: "the clouds and stuff looks blurry from afar too.. everything
     should be 10x quality") the world's own density by the device's memory tier (memTier): at most QDPR[tier][0]
     device px a CSS px and QDPR[tier][1] px in all. At the base density (baseDpr: 1.25 and 1.3 Mpx) the owner's
     393x852@3 phone's world is 491 x 1065, 17% of its screen's px, stretched twice; at its tier it is 786 x 1704,
     the canvas's own size (DIRECT: no resample but the browser's), and a Retina 1440x900 window's 2880 x 1800.
     QK is the base size over the tier's: the governor's ladder keeps the base's five rungs (QK x 1, 0.85, 0.72, 0.6,
     0.5: the base's bottom, in absolute px) with rungs above them to the tier's top, and stage G's trials are the
     base's (0.35, 0.5, 0.7 and 1 of the base size, its floor the base's floor) and the tier's top. lowA (other
     Android) keeps the base size, so its ladder is the base's */
  var QDPR = { desktop: [2, 6e6], full: [2, 1.4e6], low: [1.5, 1.6e6], lowA: [1.25, 1.3e6] }, QK = 1, QRUNGS = [1, 0.85, 0.72, 0.6, 0.5], QTOP = [1, 0.85, 0.72, 0.6];
  function baseDpr(cw, ch) { var a = Math.max(cw * ch, 1); return Math.min(window.devicePixelRatio || 1, SW.dpr1 ? 1 : 1.25, Math.sqrt(1.3e6 / a)); }   // (the base world)
  function worldDpr(cw, ch) { var a = Math.max(cw * ch, 1), T = QDPR[memTier()] || QDPR.lowA; return SW.dpr1 ? baseDpr(cw, ch) : Math.min(window.devicePixelRatio || 1, T[0], Math.sqrt(T[1] / a)); }
  function qLadder(k) {   // (the rungs as shares of the tier's top: those above the base size a step of at least 8% apart, then the base's five)
    var R = [], i;
    for (i = 0; i < QTOP.length; i++) if (QTOP[i] > k * 1.08) R.push(QTOP[i]);
    for (i = 0; i < QRUNGS.length; i++) R.push(+(k * QRUNGS[i]).toFixed(4));
    return R;
  }
  function gsScales(k) {   // (stage G's trial scales: the base's four of the base size, and the tier's top above them)
    GS.sc = (k < 0.98 ? [0.35 * k, 0.5 * k, 0.7 * k, k, 1] : [0.35, 0.5, 0.7, 1]).map(function (v) { return +v.toFixed(4); });
    GS.i = GS.sc.length - 1; GS.tr = GS.sc.map(function () { return []; }); GS.med = GS.sc.map(function () { return null; });
  }
  /* the scene's samples chosen by memory, against the design's memory caps. 4x MSAA is in no budget: at 393x852@3
     its renderbuffers (RGBA16F and DEPTH24, 4 samples: 48 B a pixel) are 23.9 MB of a world of 491 x 1065,
     over the high iPhone's 115 MB with the tier's planned pools. The plan, made once when the context is (and again
     after a restore: the same answer), for the largest window this screen can give (the screen's own size: a phone's bars
     can hide, a desktop window can be made full), as resize() sizes the world and the canvas there: the targets as
     allocTargets makes them, the canvas's back buffers (3 x RGBA8 at the canvas's size, the browser's), and the
     design's other lines for the device's memory tier (clipmap, air, cloud volumes, re-bake, meshes, instances, rings:
     the pools sized from the cap). The scene's samples, with the scene's second colour texture they bring (FS_COMP's
     outlines), may take from those pools at most MEMGIVE (15%) of their plan: the largest count the context offers (up
     to the switch aa, 4) that leaves the pools that much is taken, else 2, else none (FXAA). Fixed for the context's
     life, so no pipeline key changes with a resize. The tiers: full pools, 115 MB: iPhones 390 pt and wider at
     3x, Android with 8 GB; low pools, 80 MB: other iPhones, iPads; 64 MB: other Android; desktops 160 MB. On the
     owner's 393x852@3 iPhone: 2x where the context offers it (122.3 MB with 2x and the twin, its pools then at 68.7 of
     76 MB: 90%); 4x would leave them 56.8 (75%), so where 4 is the only count offered (this WebKit's and Chromium's
     RGBA16F: [4]) none, with the twin alone (110.3 MB). The tier is a guess at the device's class */
  /* (the owner's rule, no glitter, outranks the design's caps, which are the design's estimate and not a measured
     limit) the full tier (the owner's 393x852@3 phone's class) and the desktop tier take the largest count the context
     offers, wherever its target is made whole (targetMS: a format the driver will not make, or an incomplete
     framebuffer, falls back to one sample); the low tiers (3-4 GB iPhones, iPads, other Android: where a jetsam kill
     reloads the page) keep the plan by MEMGIVE. MEMGIVE 0.25 is not enough at 393x852@3 (4x leaves the pools
     74.6 % of their plan: the least MEMGIVE that gives 4x there is 0.2536, at 430x932@3 0.41), hence the tier rule,
     not a figure. The record files the plan with the memory facts (rec.device.memPlan: aa, the targets' MB, losses, restores, the give-up) */
  var MEMGIVE = 0.15, MEMP = null, TWIN0 = false, MEMALL = { full: 1, desktop: 1 };   // (TWIN0: the scene's second colour texture without samples, where it fits)
  var MEMN = { lost: 0, restored: 0, msFail: 0 };   // (the context's losses and restores, and samples the driver would not make, for the record)
  var MEMTIERS = { full: [115, 76], low: [80, 35], lowA: [64, 35], desktop: [160, 104] };   // (cap, the design's other lines in MB)
  function memTier() {
    if (SW.memtier && MEMTIERS[SW.memtier]) return SW.memtier;   // (dev: a tier named)
    var nav = navigator, dpr = window.devicePixelRatio || 1, sw = Math.min(screen.width || 0, screen.height || 0), coarse = false;
    try { coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); } catch (e) { coarse = false; }
    var apple = /Apple/i.test(EXT.renderer || '') || /iPhone|iPad|Macintosh/.test(nav.userAgent || '');
    if (!coarse && !(nav.maxTouchPoints > 1)) return 'desktop';
    if (apple) return sw >= 390 && sw < 600 && dpr >= 2.9 ? 'full' : 'low';
    return (nav.deviceMemory || 0) >= 8 ? 'full' : 'lowA';
  }
  function memWorld(cw, ch) {   // (resize()'s sizes for a window of cw x ch CSS px)
    var dpr0 = window.devicePixelRatio || 1, area = Math.max(cw * ch, 1), d = worldDpr(cw, ch);   // (the tier's world)
    var W = Math.max(1, Math.round(cw * d)), H = Math.max(1, Math.round(ch * d)), fd = Math.max(d, Math.min(dpr0, SW.dpr1 ? 1 : FULL_DPR, Math.sqrt(FULL_PX / area)));
    return [W, H, Math.max(W, Math.round(cw * fd)), Math.max(H, Math.round(ch * fd))];
  }
  function memTargets(W, H) {   // (allocTargets' bytes at SS 1)
    var cb = FLOAT_RT ? 8 : 4, w2 = Math.ceil(W / 2), h2 = Math.ceil(H / 2), b = W * H * (cb + 4) + w2 * h2 * ((FLOAT_RT ? 2 : 4) + cb + 4 + 2 * cb), bw = w2, bh = h2;
    for (var i = 0; i < 5; i++) { b += Math.max(1, bw) * Math.max(1, bh) * cb * (i < 4 ? 2 : 1); bw = Math.ceil(bw / 2); bh = Math.ceil(bh / 2); }
    return b + Math.ceil(W / 4) * Math.ceil(H / 4) * (cb * 2 + 4) + W * H * 4;
  }
  function memPlanAA() {
    var MB = 1048576, tier = memTier(), T = MEMTIERS[tier], sw = Math.max(screen.width || 0, 1), sh = Math.max(screen.height || 0, 1);
    var r = canvas.getBoundingClientRect(), cw = Math.max(r.width || 0, sw > sh === (r.width > r.height) ? sw : sh), ch = Math.max(r.height || 0, sw > sh === (r.width > r.height) ? sh : sw);
    var wd = memWorld(cw, ch), W = wd[0], H = wd[1], base = memTargets(W, H) + wd[2] * wd[3] * 12, n = 0, rows = {};
    var cands = AASUP.slice().sort(function (a, b) { return b - a; });
    for (var i = 0; i < cands.length; i++) {
      var k = cands[i], extra = W * H * k * ((FLOAT_RT ? 8 : 4) + 4) + W * H * (FLOAT_RT ? 8 : 4), pools = T[0] - (base + extra) / MB;
      rows[k] = { totalMB: +((base + extra) / MB + T[1]).toFixed(1), poolsMB: +pools.toFixed(1) };
      if (!n && (MEMALL[tier] || pools >= T[1] * (1 - MEMGIVE))) n = k;
    }
    /* no arm of the samples (4x or none by the visit's number: half the owner's visits would glitter); the preview
       draws as production plans */
    /* without samples (none fits, none is offered: this WebKit offers RGBA16F only at 4, so no 2x is ever
       there), the scene's second colour texture alone where it fits the pools as above: the
       composite then mixes in the last frame (FS_COMP's uStb) on one sample a pixel, the half of 4x's help that costs
       a quarter of 4x's memory. At 393x852@3: 110.3 MB of 115 */
    var tw0 = W * H * (FLOAT_RT ? 8 : 4), poolsT = T[0] - (base + tw0) / MB;
    var aaUse = n;
    TWIN0 = !aaUse && poolsT >= T[1] * (1 - MEMGIVE);
    MEMP = { tier: tier, capMB: T[0], otherMB: T[1], give: MEMGIVE, screen: [sw, sh], planned: [W, H, wd[2], wd[3]], targetsMB: +(memTargets(W, H) / MB).toFixed(1), canvasMB: +(wd[2] * wd[3] * 12 / MB).toFixed(1),
      noneMB: +(base / MB + T[1]).toFixed(1), twin0MB: +((base + tw0) / MB + T[1]).toFixed(1), twin0: TWIN0, offered: AASUP.slice(), options: rows, planned_aa: n, rule: MEMALL[tier] ? 'largest offered' : 'MEMGIVE', aa: aaUse,
      aaMB: aaUse ? rows[aaUse].totalMB : (TWIN0 ? +((base + tw0) / MB + T[1]).toFixed(1) : +(base / MB + T[1]).toFixed(1)) };
    return MEMP.aa;
  }
