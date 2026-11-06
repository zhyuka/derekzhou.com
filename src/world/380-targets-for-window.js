  /* ---------------------------------------------------------------- targets for the window */
  /* the world is drawn at OUT (at most 1.25 device px a CSS px); the canvas itself is FULL, the device's own
     resolution (round 2: the birds' ink is drawn at it, crisp at the device's own px; the world's finished
     frame is put up to it with one bilinear pass, as the browser itself upscaled it before) */
  /* (round 3) the canvas at most FULL_DPR device px a CSS px and FULL_PX in all; where that is the world's own size
     (DIRECT: a window at 1 or 1.25 device px a CSS px) the composite is drawn straight onto it, and TG.win holds only
     what lies under the birds (HOST.under: their boxes copied in) */
  var FULL_DPR = 2, FULL_PX = 2.5e6, DIRECT = false;
  /* (stage2 quality Q3, the owner's word of 2026-11-03: "the clouds and stuff looks blurry from afar too.. everything
     should be 10x quality") the world's own density by the device's memory tier (memTier): at most QDPR[tier][0]
     device px a CSS px and QDPR[tier][1] px in all. It was 1.25 and 1.3 Mpx on every device: the owner's 393x852@3
     phone's world was 491 x 1065, 17% of its screen's px, stretched twice (the quality plan, 1a). Now 786 x 1704
     there, the canvas's own size (DIRECT: no resample but the browser's), and a Retina 1440x900 window's
     2880 x 1800. QK is today's size over the tier's: the governor's ladder keeps today's five rungs (QK x 1, 0.85,
     0.72, 0.6, 0.5: today's bottom, in absolute px) with rungs above them to the tier's top, and stage G's trials
     are today's (0.35, 0.5, 0.7 and 1 of today's size, its floor today's floor) and the tier's top. lowA (other
     Android) keeps today's size, so its ladder is today's */
  var QDPR = { desktop: [2, 6e6], full: [2, 1.4e6], low: [1.5, 1.6e6], lowA: [1.25, 1.3e6] }, QK = 1, QRUNGS = [1, 0.85, 0.72, 0.6, 0.5], QTOP = [1, 0.85, 0.72, 0.6];
  function baseDpr(cw, ch) { var a = Math.max(cw * ch, 1); return Math.min(window.devicePixelRatio || 1, SW.dpr1 ? 1 : 1.25, Math.sqrt(1.3e6 / a)); }   // (today's world)
  function worldDpr(cw, ch) { var a = Math.max(cw * ch, 1), T = QDPR[memTier()] || QDPR.lowA; return SW.dpr1 ? baseDpr(cw, ch) : Math.min(window.devicePixelRatio || 1, T[0], Math.sqrt(T[1] / a)); }
  function qLadder(k) {   // (the rungs as shares of the tier's top: those above today's size a step of at least 8% apart, then today's five)
    var R = [], i;
    for (i = 0; i < QTOP.length; i++) if (QTOP[i] > k * 1.08) R.push(QTOP[i]);
    for (i = 0; i < QRUNGS.length; i++) R.push(+(k * QRUNGS[i]).toFixed(4));
    return R;
  }
  function gsScales(k) {   // (stage G's trial scales: today's four of today's size, and the tier's top above them)
    GS.sc = (k < 0.98 ? [0.35 * k, 0.5 * k, 0.7 * k, k, 1] : [0.35, 0.5, 0.7, 1]).map(function (v) { return +v.toFixed(4); });
    GS.i = GS.sc.length - 1; GS.tr = GS.sc.map(function () { return []; }); GS.med = GS.sc.map(function () { return null; });
  }
  /* (E1.1, item 5) the scene's samples chosen by memory, against design-v5 5.5's caps. 4x MSAA (Fix 3) was in no budget:
     at 393x852@3 its renderbuffers (RGBA16F and DEPTH24, 4 samples: 48 B a pixel) are 23.9 MB of a world of 491 x 1065,
     over the high iPhone's 115 MB with the tier's planned pools. The plan, made once when the context is (and again
     after a restore: the same answer), for the largest window this screen can give (the screen's own size: a phone's bars
     can hide, a desktop window can be made full), as resize() sizes the world and the canvas there: the targets as
     allocTargets makes them, the canvas's back buffers (3 x RGBA8 at the canvas's size, the browser's), and design-v5
     5.5's other lines for the device's memory tier (clipmap, air, cloud volumes, re-bake, meshes, instances, rings: the
     pools E3b sizes from the cap). The scene's samples, with the scene's second colour texture they bring (FS_COMP's
     outlines), may take from those pools at most MEMGIVE (15%) of their plan: the largest count the context offers (up
     to the switch aa, 4) that leaves the pools that much is taken, else 2, else none (FXAA). Fixed for the context's
     life, so no pipeline key changes with a resize. The tiers (5.5): full pools, 115 MB: iPhones 390 pt and wider at
     3x, Android with 8 GB; low pools, 80 MB: other iPhones, iPads; 64 MB: other Android; desktops 160 MB. On the
     owner's 393x852@3 iPhone: 2x where the context offers it (122.3 MB with 2x and the twin, its pools then at 68.7 of
     76 MB: 90%); 4x would leave them 56.8 (75%), so where 4 is the only count offered (this WebKit's and Chromium's
     RGBA16F: [4]) none, with the twin alone (110.3 MB). E7 replaces the tier's guess with the device's class */
  /* (E1.1 Fix 2, the lead's ruling of 2026-10-15: the owner's rule, no glitter, outranks design-v5 5.5's caps, which
     are the design's estimate and not a measured limit) the full tier (the owner's 393x852@3 phone's class) and the
     desktop tier take the largest count the context offers, wherever its target is made whole (targetMS: a format the
     driver will not make, or an incomplete framebuffer, falls back to one sample as before); the low tiers (3-4 GB
     iPhones, iPads, other Android: where a jetsam kill reloads the page) keep the plan by MEMGIVE. The verifiers read
     MEMGIVE 0.25 (the ruling's figure) as not enough at 393x852@3 (4x leaves the pools 74.6 % of their plan: the least
     MEMGIVE that gives 4x there is 0.2536, at 430x932@3 0.41), hence the tier rule, not a figure. The record files the
     plan with the memory facts (rec.device.memPlan: aa, the targets' MB, losses, restores, the give-up) */
  var MEMGIVE = 0.15, MEMP = null, TWIN0 = false, MEMALL = { full: 1, desktop: 1 };   // (TWIN0: the scene's second colour texture without samples, where it fits)
  var MEMN = { lost: 0, restored: 0, msFail: 0 };   // (E1.1 Fix 2: the context's losses and restores, and samples the driver would not make, for the record)
  var MEMTIERS = { full: [115, 76], low: [80, 35], lowA: [64, 35], desktop: [160, 104] };   // (cap, design-v5 5.5's other lines in MB)
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
    var dpr0 = window.devicePixelRatio || 1, area = Math.max(cw * ch, 1), d = worldDpr(cw, ch);   // (stage2 quality Q3: the tier's world)
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
    /* (E1.1 Fix 2) no arm of the samples: E1.1 alternated 4x and none by the visit's number in the preview (diag's aaArm),
       which the lead's ruling retires (half the owner's visits would glitter); the preview draws as production plans */
    /* (E1.1) without samples (none fits, none is offered: this WebKit offers RGBA16F only at 4, so no 2x is ever
       there; or the record's arm), the scene's second colour texture alone where it fits the pools as above: the
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
  var TG = null, OUT = { w: 0, h: 0, dpr: 1, cssW: 0, cssH: 0 }, FULL = { w: 0, h: 0, dpr: 1 }, SS = 1, RUNG = 0, RUNGS = [1, 0.85, 0.72, 0.6, 0.5], CAMLIFT = 0;
  function allocTargets() {
    if (TG) { ['scene', 'lind', 'cloud', 'sm', 'sb', 'win'].forEach(function (k) { if (TG[k]) freeTarget(TG[k]); }); TG.bd.forEach(freeTarget); TG.bu.forEach(freeTarget); if (TG.hz) gl.deleteTexture(TG.hz); freeMS(TG.ms); if (TG.ch) TG.ch.forEach(freeTarget); if (TG.sceneH) { gl.deleteFramebuffer(TG.sceneH.f); gl.deleteTexture(TG.sceneH.t); } }
    var W = OUT.w * SS, H = OUT.h * SS, w2 = Math.max(1, Math.ceil(W / 2)), h2 = Math.max(1, Math.ceil(H / 2));
    TG = { W: W, H: H, scene: target(W, H, 'hdr', true), lind: target(w2, h2, 'r16'), cloud: target(w2, h2, 'hdr'), bd: [], bu: [], ms: null };
    // (E1 Fix 3, G0) the scene's samples: AAS a pixel, its colour and depth resolved into TG.scene before the depth pass
    if (AAS > 1) { TG.ms = targetMS(W, H, AAS); if (!TG.ms) AAS = 0; }
    // (E1.1, item 7) where the scene has its samples, a second colour texture for it (the depth shared): the frames take
    // them in turn, so the composite reads the last frame's scene as well (its samples' depth codes too), for the
    // outlines in front of a cloud (FS_COMP)
    TG.sceneH = AAS > 1 || TWIN0 ? sceneTwin(TG.scene) : null; SHIST.ok = false;   // (E1.1: without samples too where it fits, TWIN0)
    TG.ch = [target(w2, h2, 'hdr'), target(w2, h2, 'hdr')]; CACC.ok = false;   // (E1 Fix 3: the clouds' accumulation, two in turn)
    // one depth buffer under both half-resolution targets: the land's depth (from the depth pass) and the opaque cores
    // of the clouds, so a cloud box behind either is never marched
    // (birds3d) a depth texture, not a renderbuffer (the same size and content): the paper birds read the cores' depth
    // through it (HOST.bindTextures, unit 14), so a bird behind a cloud's opaque core is hidden by it
    TG.hz = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, TG.hz);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, w2, h2, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null); gl.bindTexture(gl.TEXTURE_2D, null);
    [TG.lind, TG.cloud].forEach(function (T) { gl.bindFramebuffer(gl.FRAMEBUFFER, T.f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, TG.hz, 0); });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    var bw = w2, bh = h2;
    for (var i = 0; i < 5; i++) { TG.bd.push(target(Math.max(1, bw), Math.max(1, bh), 'hdr')); if (i < 4) TG.bu.push(null); bw = Math.ceil(bw / 2); bh = Math.ceil(bh / 2); }
    for (i = 0; i < 4; i++) TG.bu[i] = target(TG.bd[i].w, TG.bd[i].h, 'hdr');
    TG.sm = target(Math.max(1, Math.ceil(W / 4)), Math.max(1, Math.ceil(H / 4)), 'hdr');
    TG.sb = target(TG.sm.w, TG.sm.h, 'hdr');
    // (the finished frame at the world's resolution, put up to the canvas's; the birds' ink reads what lies under it)
    TG.win = target(OUT.w, OUT.h, 'rgba8');
  }
  /* (E1 Fix 3) a multisampled target: n samples a pixel of the scene's colour format and DEPTH_COMPONENT24 (the scene's
     depth texture's own format, so its resolve is a plain blit), as renderbuffers that are never sampled; null if the
     driver will not make it whole (the scene is then drawn at one sample, as before) */
  function targetMS(w, h, n) {
    var T = { w: w, h: h, n: n, f: gl.createFramebuffer(), c: gl.createRenderbuffer(), d: gl.createRenderbuffer() };
    gl.bindRenderbuffer(gl.RENDERBUFFER, T.c); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, n, FLOAT_RT ? gl.RGBA16F : gl.RGBA8, w, h);
    gl.bindRenderbuffer(gl.RENDERBUFFER, T.d); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, n, gl.DEPTH_COMPONENT24, w, h);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, T.f);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, T.c);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, T.d);
    var ck = 'ms' + n, ok = FBOK[ck] ? true : gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE; if (ok) FBOK[ck] = 1;   // (E1.1: asked once, the first time)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (!ok) { freeMS(T); MEMN.msFail++; if (!gl.isContextLost()) fail('the scene\'s ' + n + ' samples incomplete: one sample'); return null; }
    return T;
  }
  function sceneTwin(T) {
    var T2 = { w: T.w, h: T.h, f: gl.createFramebuffer(), t: tex2d(T.w, T.h, FLOAT_RT ? gl.RGBA16F : gl.RGBA8, gl.RGBA, HALF, gl.LINEAR), d: T.d, twin: true };
    gl.bindFramebuffer(gl.FRAMEBUFFER, T2.f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, T2.t, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, T2.d, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return T2;
  }
  function freeMS(T) { if (!T) return; gl.deleteFramebuffer(T.f); gl.deleteRenderbuffer(T.c); gl.deleteRenderbuffer(T.d); }
  /* (E1 Fix 3) the scene's samples resolved into its texture and depth (w x h of them, from the corner), then let go:
     invalidated, so a tile GPU never stores them */
  var MSINV = null;
  function resolveMS(MS, T, w, h) {
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, MS.f); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, T.f);
    gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, gl.NEAREST);
    if (!MSINV) MSINV = [gl.COLOR_ATTACHMENT0, gl.DEPTH_ATTACHMENT];
    gl.invalidateFramebuffer(gl.READ_FRAMEBUFFER, MSINV);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
  }
  /* the frustum: 72 deg across a wide window's width; a tall window at least 42 deg across and at most 80 tall; a
     change of height alone (a phone's toolbar) eases the view over a second, any other change re-aims at once */
  function setFrustum(snap) {
    var aspect = OUT.w / Math.max(OUT.h, 1), tl = Math.tan(FOV_LONG * DEG / 2);
    TALLK = smooth(0.95, 1.75, OUT.h / Math.max(OUT.w, 1));
    WIDEKT = wideWin() ? 1 : 0;   // (camera9b: the tilt, basePitch: the stylesheet's wide windows)
    if (aspect >= 1) { FRT.tanX = tl; FRT.tanY = tl / aspect; }
    else { FRT.tanX = Math.max(tl * aspect, Math.tan(21 * DEG)); FRT.tanY = Math.min(FRT.tanX / aspect, Math.tan(40 * DEG)); FRT.tanX = FRT.tanY * aspect; }
    if (snap) { FR.tanX = FRT.tanX; FR.tanY = FRT.tanY; WIDEK = WIDEKT; }
  }
  function easeFrustum(dt) { var k = 1 - Math.exp(-dt / 0.35); FR.tanY += (FRT.tanY - FR.tanY) * k; FR.tanX = FR.tanY * OUT.w / Math.max(OUT.h, 1); WIDEK += (WIDEKT - WIDEK) * k; }
  function resize() {
    if (LOST) return false;
    // the world at the tier's density (stage2 quality Q3: worldDpr; it was at most 1.25 device px a CSS px and 1.3 Mpx
    // for every device); the canvas at the device's own px (at most FULL_DPR a CSS px, FULL_PX in all), for the birds' ink
    var r = canvas.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;   // (hidden: nothing is sized while it is)
    var dmax = SW.dpr1 ? 1 : 1.25, fmax = SW.dpr1 ? 1 : FULL_DPR;   // (E0, the switch: the canvas at 1.0 device px a CSS px)
    var area = Math.max(r.width * r.height, 1), dpr = worldDpr(r.width, r.height);   // (stage2 quality Q3: the tier's density; dmax is today's, kept by baseDpr)
    var w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    var fdpr = Math.max(dpr, Math.min(window.devicePixelRatio || 1, fmax, Math.sqrt(FULL_PX / area)));   // (round 3: 2 and 2.5 Mpx; round 2's 3 and 8.3 Mpx cost a phone 1.4 GB/s of copies for 0.6 % of its pixels in ink)
    var fw = Math.max(w, Math.round(r.width * fdpr)), fh = Math.max(h, Math.round(r.height * fdpr));
    if (DEVMODE && OPT.cvs) { var cvm = /^(\d+)x(\d+)$/.exec(OPT.cvs); if (cvm) { w = fw = +cvm[1]; h = fh = +cvm[2]; dpr = w / r.width; } }   // (dev, E0: a fixed small canvas: CPU timing and presented runs)
    if (w === OUT.w && h === OUT.h && fw === FULL.w && fh === FULL.h && (TG || forced())) return false;   // (fast500's deep sweep, 2026-11-05: under forced colours no target is made, below: the canvas alone is sized, once a size)
    var heightOnly = TG && w === OUT.w && Math.abs(h - OUT.h) < 0.15 * OUT.h;
    /* (stage2 quality Q3) the ladder for this window; the density being drawn kept (the rung nearest it in device px a
       CSS px; review 1: kept in absolute px a rotation or a drag ratcheted it down), so a resize neither sharpens nor softens it */
    var qk = Math.min(1, baseDpr(r.width, r.height) / Math.max(dpr, 1e-6)), qab = TG && OUT.w ? RUNGS[RUNG] * OUT.dpr : 0;
    RUNGS = qLadder(qk); QK = qk;
    if (qab > 0) { var qb = Infinity; for (var qi = 0; qi < RUNGS.length; qi++) { var qe = Math.abs(Math.log(RUNGS[qi] * dpr / qab)); if (qe < qb - 1e-6) { qb = qe; RUNG = qi; } } } else RUNG = Math.min(RUNG, RUNGS.length - 1);
    if (!GS.done && !GS.tr.some(function (a) { return a.length; })) gsScales(qk);
    OUT.w = w; OUT.h = h; OUT.dpr = dpr; OUT.cssW = r.width; OUT.cssH = r.height;
    FULL.w = fw; FULL.h = fh; FULL.dpr = fw / Math.max(r.width, 1);
    DIRECT = fw === w && fh === h;
    CAMLIFT = clamp(h / w - 1, 0, 1) * 0.9;
    canvas.width = fw; canvas.height = fh;
    if (TG || !forced()) allocTargets();   // (fast500's deep sweep, 2026-11-05: forced colours draw the ink birds alone, reading no target of the world's (inkbirds: tex = !FORCED && HOST.bindTextures()), so none is made while they hold; a world holding them already (forced colours begun in a visit) remakes them at the new size as before, so it comes back as it would have; once they end frameBody's resize (!READY && !TG) or NEEDSIZE's makes them: with TG null resize() comes on to here)
    setFrustum(!heightOnly);
    measureWords();
    moonResized(heightOnly);   // (fast500 no-fades: the moon's plan for the new window)
    touchMode();
    return true;
  }

