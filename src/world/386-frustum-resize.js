  /* ---------------------------------------------------------------- the frustum and the window's resize */
  /* the frustum: 72 deg across a wide window's width; a tall window at least 42 deg across and at most 80 tall; a
     change of height alone (a phone's toolbar) eases the view over a second, any other change re-aims at once */
  function setFrustum(snap) {
    var aspect = OUT.w / Math.max(OUT.h, 1), tl = Math.tan(FOV_LONG * DEG / 2);
    TALLK = smooth(0.95, 1.75, OUT.h / Math.max(OUT.w, 1));
    WIDEKT = wideWin() ? 1 : 0;   // (the tilt, basePitch: the stylesheet's wide windows)
    if (aspect >= 1) { FRT.tanX = tl; FRT.tanY = tl / aspect; }
    else { FRT.tanX = Math.max(tl * aspect, Math.tan(21 * DEG)); FRT.tanY = Math.min(FRT.tanX / aspect, Math.tan(40 * DEG)); FRT.tanX = FRT.tanY * aspect; }
    if (snap) { FR.tanX = FRT.tanX; FR.tanY = FRT.tanY; WIDEK = WIDEKT; }
  }
  function easeFrustum(dt) { var k = 1 - Math.exp(-dt / 0.35); FR.tanY += (FRT.tanY - FR.tanY) * k; FR.tanX = FR.tanY * OUT.w / Math.max(OUT.h, 1); WIDEK += (WIDEKT - WIDEK) * k; }
  function resize() {
    if (LOST) return false;
    // the world at the tier's density (worldDpr); the canvas at the device's own px (at most FULL_DPR a CSS px,
    // FULL_PX in all), for the birds' ink
    var r = canvas.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;   // (hidden: nothing is sized while it is)
    var dmax = SW.dpr1 ? 1 : 1.25, fmax = SW.dpr1 ? 1 : FULL_DPR;   // (the switch: the canvas at 1.0 device px a CSS px)
    var area = Math.max(r.width * r.height, 1), dpr = worldDpr(r.width, r.height);   // (the tier's density; dmax is the base's, as in baseDpr)
    var w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    var fdpr = Math.max(dpr, Math.min(window.devicePixelRatio || 1, fmax, Math.sqrt(FULL_PX / area)));   // (2 and 2.5 Mpx: 3 and 8.3 Mpx cost a phone 1.4 GB/s of copies for 0.6 % of its pixels in ink)
    var fw = Math.max(w, Math.round(r.width * fdpr)), fh = Math.max(h, Math.round(r.height * fdpr));
    if (DEVMODE && OPT.cvs) { var cvm = /^(\d+)x(\d+)$/.exec(OPT.cvs); if (cvm) { w = fw = +cvm[1]; h = fh = +cvm[2]; dpr = w / r.width; } }   // (dev: a fixed small canvas: CPU timing and presented runs)
    if (w === OUT.w && h === OUT.h && fw === FULL.w && fh === FULL.h && (TG || forced())) return false;   // (under forced colours no target is made, below: the canvas alone is sized, once a size)
    var heightOnly = TG && w === OUT.w && Math.abs(h - OUT.h) < 0.15 * OUT.h;
    /* the ladder for this window; the density being drawn kept (the rung nearest it in device px a CSS px, absolute
       px, so a rotation or a drag never ratchets it down), so a resize neither sharpens nor softens it */
    var qk = Math.min(1, baseDpr(r.width, r.height) / Math.max(dpr, 1e-6)), qab = TG && OUT.w ? RUNGS[RUNG] * OUT.dpr : 0;
    RUNGS = qLadder(qk); QK = qk;
    if (qab > 0) { var qb = Infinity; for (var qi = 0; qi < RUNGS.length; qi++) { var qe = Math.abs(Math.log(RUNGS[qi] * dpr / qab)); if (qe < qb - 1e-6) { qb = qe; RUNG = qi; } } } else RUNG = Math.min(RUNG, RUNGS.length - 1);
    if (!GS.done && !GS.tr.some(function (a) { return a.length; })) gsScales(qk);
    OUT.w = w; OUT.h = h; OUT.dpr = dpr; OUT.cssW = r.width; OUT.cssH = r.height;
    FULL.w = fw; FULL.h = fh; FULL.dpr = fw / Math.max(r.width, 1);
    DIRECT = fw === w && fh === h;
    CAMLIFT = clamp(h / w - 1, 0, 1) * 0.9;
    canvas.width = fw; canvas.height = fh;
    if (TG || !forced()) allocTargets();   // (forced colours draw the ink birds alone, reading no target of the world's (inkbirds: tex = !FORCED && HOST.bindTextures()), so none is made while they hold; a world holding them already (forced colours begun in a visit) remakes them at the new size, so it comes back as it would have; once they end frameBody's resize (!READY && !TG) or NEEDSIZE's makes them: with TG null resize() comes on to here)
    setFrustum(!heightOnly);
    measureWords();
    moonResized(heightOnly);   // (the moon's plan for the new window)
    touchMode();
    return true;
  }

