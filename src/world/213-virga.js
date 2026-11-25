  /* ---------------------------------------------------------------- virga (delight-weather 6) */
  /* (physics: clouds/virga) rain or snow that falls from a cloud's base and evaporates before it reaches the ground:
     very common over deserts, where the air under the base is dry (https://glossary.ametsoc.org/wiki/Virga). A strand
     hangs from the flat base of some new bodies on a dusk sky (VIRGA_SHARE: 30% of the afterglow's, 20% of the blue
     hour's; none on another sky), chosen by the body's own seed, so a still baked at build time shows the same strands.
     Each falls VIRGA_W (1-4 m/s at the base, by its seed) and slows to VIRGA_SLOW of that by its end as its drops
     shrink, and ends 40-70% of the way down from the base (VIRGA_END: its lowest point at 0.4-0.7 of the base's
     height). It rides with its body, so its shape is in the body's frame: the drops fall through the air at each height
     while the body moves at the air's wind at its own height (cloudWind's), so a height whose wind is not the body's
     carries the strand off the vertical by atan(dU / w) there (dU the wind there less the body's, w the fall then).
     The air's profile (physics: air/wind-profile) gives no shear from the low layer's 300 m up to 1500 m, so a strand
     hangs straight down to 300 m and only its part below 300 m bends, trailing back from its body (the air there slower
     and less veered than the body's): at a base of 480 m, ending at 190 m, by at most 1.95 m/s at the visits' top U10. */
  var VIRGA_SHARE = { afterglow: 0.3, bluehour: 0.2 }, VIRGA_W = [1, 4], VIRGA_SLOW = 0.4, VIRGA_END = [0.4, 0.7], VIRGA_N = 16;
  function virgaOn(seed, sky) {   // does a new body with this seed, laid out on this sky, hang a strand? (its own hash, no stream draw)
    var s = VIRGA_SHARE[sky]; return !!s && hfl(hk(seed >>> 0, 0x76a1)) < s;
  }
  function virgaSky(V) {   // the sky a body is laid out on: the sky's script set up first, as skyStep sets it (a boot's first cells come before the first frame; its draws are its own streams', so nothing moves)
    if (SKY.seed !== J.seed || SKY.hour !== HOUR || SKY.V !== V) skyInit(V);
    skyAt(SIM.t + SKY.dt); return SKY.A ? SKY.A.id : null;
  }
  function virgaPath(V, seed, base) {   // the strand of a body whose flat base stands base m over the ground: [x, y, z] x VIRGA_N + 1, m, in the body's frame from its base; and its falls
    var h = seed >>> 0, w0 = VIRGA_W[0] + (VIRGA_W[1] - VIRGA_W[0]) * hfl(hk(h, 0x76a2));
    var end = base * (VIRGA_END[0] + (VIRGA_END[1] - VIRGA_END[0]) * hfl(hk(h, 0x76a3)));
    var B = airBase(0, 0, AIR_H.clouds, V), bx = B.x, bz = B.z, P = [0, 0, 0], W = [w0], x = 0, z = 0, i, s, y, w, a, dz = (base - end) / VIRGA_N;
    for (i = 0; i < VIRGA_N; i++) {
      s = (i + 0.5) / VIRGA_N; y = base - (i + 0.5) * dz; w = w0 * (1 - (1 - VIRGA_SLOW) * s);   // (the fall, slowing as the drops shrink)
      a = airBase(0, 0, y, V); x += (a.x - bx) / w * dz; z += (a.z - bz) / w * dz;   // (the air there less the body's, over the fall: m across a metre down)
      P.push(x, -(i + 1) * dz, z); W.push(w0 * (1 - (1 - VIRGA_SLOW) * (i + 1) / VIRGA_N));
    }
    return { p: P, w: W, end: end, w0: w0 };
  }
  var VIRGA_HW = [30, 150], VIRGA_A = 0.5;   // (its half width, m: a third of its body's narrower half size, within these; its most alpha)
  function virgaBody(V, seed, baseAG, dx, dy, dz, h) {   // the strand a body carries: its top (from the body's centre: at its base, under its lobes) and its path, for 410's draw
    if (!(baseAG > 50)) return null;
    var P = virgaPath(V, seed, baseAG);
    return { dx: dx, dy: dy, dz: dz, p: new Float32Array(P.p), hw: Math.max(VIRGA_HW[0], Math.min(VIRGA_HW[1], Math.min(h[0], h[2]) / 3)), a: VIRGA_A };
  }
  function drawVirga(B, P, V) {   // a body's strand, in the body's own turn (far to near): the clouds' target, premultiplied over (410)
    var g = B.vg;
    gl.useProgram(P.p); setFrameUniforms(P, V);
    gl.uniform3f(P.u.uGA, B.c[0] + g.dx, B.c[1] + g.dy, B.c[2] + g.dz);   // (where its body is drawn now: carried and lifted with it) gl.uniform3fv(P.u.uGP, g.p); gl.uniform2f(P.u.uGW, g.hw, g.a * B.fade);
    gl.disable(gl.CULL_FACE); gl.bindVertexArray(STRIP.vaoR); dc(gl.TRIANGLE_STRIP, STRIP.n);
  }
