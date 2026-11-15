  /* ---------------------------------------------------------------- the world's definition: the two kits, by weight */
  var WORLD_GLSL_HEAD = `
uniform int uZ;   // (fast500 D) never set: GL makes it 0 at link. Added to a loop's bound, FXC (ANGLE's D3D11 compiler) cannot count the loop, so it keeps it rolled: one copy of its body
vec3 dNg(vec3 n, mat2 M) { return vec3(n.x, transpose(M) * n.yz); }   // (fast500 D) dN's gradient turn alone: dN(p, M) = dNg(gnd(M * p), M), the same operations
uniform highp sampler2D uKW; uniform vec4 uKWc, uKFc;   // the weights' grids: KW (its window's centre x, z; texel m; texels across) and the far field KF (the same; in the rows under KW's)
vec3 gKD = vec3(1.0, 0.0, 0.0);   // the sand weight (value, d/dx, d/dz) while the dunes kit's land is raised (set by Hd)
vec3 gSK = vec3(0.0);   // (physics: sand/S1) the land's sink toward the cloud sea (sk: value, d/dx, d/dz) while the dunes are raised: the slip faces stand at repose on the ground as it is after it (set by Hd, HdProbe and the split's dunes pass)
vec2 gMB = vec2(-1e4, 0.0);   // (delight-weather 1) the mist pools' floor (the ground the dunes stand on: the swell, the basins' and the sink's change in) and their reach (the sand weight) at the last point the land was raised
vec2 gMS = vec2(1.0, 0.0);   // (delight-weather 1) the basins' change to that floor: a scale and an offset (basinOf)
vec4 gS1 = vec4(0.0); vec2 gS1D = vec2(0.0); float gS1F = 0.5, gS1W = 1.0;   // (physics: sand/S2) the main dunes at the last point the land was raised: phase, its gradient, height; the slip face's share; the sites' share of their slope
#define HAS_GTX
float gTX = 1e4; vec3 gLV = vec3(0.0), gWC = vec3(0.0);   // (world6 fix) the land's height over the cloud sea's top (from its vertices), and Hd's last level and cloud weight
vec4 kwT(ivec2 i) { uint m = uint(uKWc.w) - 1u; return texelFetch(uKW, ivec2(uvec2(i) & uvec2(m)), 0); }
vec4 kfT(ivec2 i) { uint m = uint(uKFc.w) - 1u, W = uint(uKWc.w); uvec2 u = uvec2(i) & uvec2(m); uint L = u.y * uint(uKFc.w) + u.x; return texelFetch(uKW, ivec2(int(L % W), int(W + L / W)), 0); }
void bsW(float f, out vec4 w, out vec4 d) {
  float f2 = f * f, f3 = f2 * f;
  w = vec4(1.0 - 3.0 * f + 3.0 * f2 - f3, 4.0 - 6.0 * f2 + 3.0 * f3, 1.0 + 3.0 * f + 3.0 * f2 - 3.0 * f3, f3) / 6.0;
  d = vec4(-3.0 + 6.0 * f - 3.0 * f2, -12.0 * f + 9.0 * f2, 3.0 + 6.0 * f - 9.0 * f2, 3.0 * f2) / 6.0;
}
/* a grid's four channels at p (cubic B-spline: C2), with their gradients (per m) */
void bsGrid(bool isF, vec2 p, out vec4 v, out vec4 gx, out vec4 gz) {
  vec4 c = isF ? uKFc : uKWc; float hw = (isF ? ${FSH}.0 : ${KSH}.0) * c.z;
  vec2 q = clamp(p, c.xy - hw, c.xy + hw), t = q / c.z - 0.5, f = fract(t); ivec2 i0 = ivec2(floor(t)) - 1;
  vec4 wx, dx, wz, dz; bsW(f.x, wx, dx); bsW(f.y, wz, dz);
  v = vec4(0.0); gx = vec4(0.0); gz = vec4(0.0);
  for (int b = 0; b < 4; b++) {
    for (int a = 0; a < 4; a++) {
      vec4 s = isF ? kfT(i0 + ivec2(a, b)) : kwT(i0 + ivec2(a, b));
      v += wx.x * wz.x * s; gx += dx.x * wz.x * s; gz += wx.x * dz.x * s;   // (fast500 D) wx[a] * wz[b] ...: the weights turned, not indexed
      wx = wx.yzwx; dx = dx.yzwx;
    }
    wz = wz.yzwx; dz = dz.yzwx;
  }
  gx /= c.z; gz /= c.z;
}
float sstepD(float a, float b, float x) { float t = (x - a) / (b - a); return (t <= 0.0 || t >= 1.0) ? 0.0 : 6.0 * t * (1.0 - t) / (b - a); }
/* the kits' weights at p, each (value, d/dx, d/dz): wD the sand province's, wC the cloud sea's, lv the cloud sea's
   level and sk the land's sink (both bounded in slope by construction: world.js's grids). KW near the camera, eased
   into the far field (KF) and that into a constant by smooth weights of the distance: as world.js's kwAt */
const vec4 KW_FAR = vec4(${KW_FAR[0]}, ${KW_FAR[1]}, ${KW_FAR[2]}.0, ${KW_FAR[3]}.0);
void kitW4(vec2 p, out vec3 wD, out vec3 wC, out vec3 lv, out vec3 sk) {
  vec2 e = p - uCam.xz; float dc = length(e); vec2 u = dc > 1e-3 ? e / dc : vec2(0.0);
  float kn = 1.0 - smoothstep(${KN0}.0, ${KN1}.0, dc), kf = 1.0 - smoothstep(${KF0}.0, ${KF1}.0, dc), dkn = -sstepD(${KN0}.0, ${KN1}.0, dc), dkf = -sstepD(${KF0}.0, ${KF1}.0, dc);
  vec4 v, gx, gz;
  /* (speed S2) the near grid read at one site for both cases (it was two: three bsGrid inlined, 48 fetches each) */
  vec4 vF = KW_FAR, xF = vec4(0.0), zF = vec4(0.0), vN, xN, zN;
  if (kn < 1.0 && kf > 0.0) bsGrid(true, p, vF, xF, zF);
  vN = vF; xN = xF; zN = zF;
  if (kn > 0.0) bsGrid(false, p, vN, xN, zN);
  if (kn >= 1.0) { v = vN; gx = xN; gz = zN; }
  else {
    vec4 vM = mix(vF, vN, kn), xM = mix(xF, xN, kn) + (vN - vF) * dkn * u.x, zM = mix(zF, zN, kn) + (vN - vF) * dkn * u.y;
    v = mix(KW_FAR, vM, kf); gx = xM * kf + (vM - KW_FAR) * dkf * u.x; gz = zM * kf + (vM - KW_FAR) * dkf * u.y;
  }
  wD = vec3(v.x, gx.x, gz.x); wC = vec3(v.y, gx.y, gz.y); lv = vec3(v.z, gx.z, gz.z); sk = vec3(v.w, gx.w, gz.w);
}
void kitW(vec2 p, out vec3 wD, out vec3 wC) { vec3 a, b; kitW4(p, wD, wC, a, b); }
`;
  var WORLD_GLSL = `@glsl world-glsl`;
  /* the pieces' density by the weights: a piece is kept where its own hash falls under its kit's density there (the
     dunes kit's thin out as the cloud sea closes over the land; the ABOVE kit's come in as it rises) */
  /* (world6 step B fix, defect 14) read from the raw maps (kitAt), never through the camera-blended grids: what a cell
     keeps is a function of the place alone, whatever the path to it */
  function densD(x, z) { return 1 - smooth(0.6, 0.95, kitAt(x, z).wC); }
  function densA(x, z) { return smooth(0.6, 0.9, kitAt(x, z).wC); }   // (world6 fix: the cloud sea's pieces only where it is well up; then gated on the land under them, aboveKeep)
  /* (world6 fix, the judges' defect 4) the ABOVE kit's pieces stand only where the sea is up and seen about them: the
     land under their footprint (probed: landQ) at least 0-40 m under the sea's level there, times the density above;
     kept where the piece's own hash falls under that (the same hash as at its placing), so nothing of the cloud sea
     stands on, or floats over, sand */
  var GATE = { kept: 0, dropped: 0 };
  /* (world6 step B fix, defect 7) the flight band's top at a place, path-free, from the raw maps: the cloud sea's raw
     level (SEA_LO + RISE wC: the drawn level is its envelope from below, never higher) with the heaps' most (HEAP_MAX)
     or the land under the piece (its probed most), whichever is higher, plus the most the camera can stand over its
     surface (FLY_TOP: the ceiling clear[2] and the hard ceiling's 10 m over it) and the mist's reach (BAND_M: the mist
     about the eye begins with a lobe 80 m off). No cloud body's lobe and no floating stone is ever kept under it, so
     on any line the visitor turns to the eye never meets one */
  var HEAP_MAX = 55, FLY_TOP = 55, BAND_M = 90, FORM_ALLOW = 130, BAND = { lifted: 0, liftM: 0, isles: 0 };
  /* (fix) where the dunes kit's formations can stand (within 700 m: their cones reach that far), the eye can stand over
     their envelope too: FORM_ALLOW (the tallest formation's solid, 123 m, and its margin) by the dunes' density there */
  var BQ = [[0, 0], [700, 0], [-700, 0], [0, 700], [0, -700]];
  function bandTopAt(x, z, land) {
    var wc = kitAt(x, z).wC, fd = 0;
    for (var i = 0; i < BQ.length; i++) fd = Math.max(fd, densD(x + BQ[i][0], z + BQ[i][1]));
    return Math.max(SEA_LO + RISE * wc + HEAP_MAX * (0.4 + 0.6 * wc), (land === undefined || land !== land ? -1e9 : land) + FORM_ALLOW * fd) + FLY_TOP + BAND_M;
  }
  function aboveKeep(o) {
    var wc = kitAt(o.x, o.z).wC, d = smooth(-10, 25, SEA_LO + RISE * wc + 18 * (0.4 + 0.6 * wc) - o.landMax) * densA(o.x, o.z), k = pickOf(o, 0x5bd1e995) < d;   // (fix, defect 14: the raw level, which bounds the drawn one from above)   // (world6 step B: against the sea's mean top, which now lies near the land's height)
    if (k) GATE.kept++; else GATE.dropped++;
    return k;
  }
  var KWP = [0, 0];
  /* (round 3) the owner, asked to turn the rays off but keep the storks and gulls circling over temples and islands: "yes".
     So the switch drops the rays; the realms' bird flocks stay as the places the ink thermals keep, never drawn.
     (life fix) the world's own flyers (the white flocks and the rays, a tail trailing) off: the ink birds are the sky's
     only birds, one language (judge-eye1: a dark ray with a tail line shared the sky with them). The moths, jellies and
     caps stay. Their draws are made as before; only what they would add is dropped. true: as the world was */
  var WORLD_FLYERS = false;
  function pickOf(o, salt) { return hfl(ihash(((Math.round(o.x * 8) * 0x9e3779b1) ^ (Math.round(o.z * 8) * 0x85ebca6b) ^ salt) >>> 0)); }
  function kitApi(C, kit, dens, lift) {
    var A = {}, k;
    for (k in C) A[k] = C[k];
    function keep(o) { return pickOf(o, kit === 'above' ? 0x5bd1e995 : 0x27d4eb2d) < dens(o.x, o.z); }
    function seat(o) { if (lift && o.y !== undefined) o.y += seaBaseAt(o.x, o.z); }   // (the ABOVE kit's heights are over its sea)
    A.add = function (it) { it.kit = kit; if (!keep(it)) { it._drop = true; return it; } seat(it); if (lift) it.landQ = it.r || 50; return C.add(it); };
    A.cloud = function (cl) { cl.kit = kit; if (!keep(cl)) { cl._drop = true; return cl; } seat(cl); if (lift) cl.landQ = (cl.w || cl.thick || 300) * 0.5; return C.cloud(cl); };   // (world6 fix: the land under its footprint probed: aboveKeep)
    A.flock = function (f) { if (!WORLD_FLYERS && f.kind === 'ray') return f;   // (round 3: the owner's word, the rays off; the bird flocks kept as the ink thermals' places, never drawn)
      if ((f.ref && f.ref._drop) || !keep(f)) return f; seat(f); return C.flock(f); };   // (life fix: WORLD_FLYERS)
    A.poi = function (p) { if ((p.ref && p.ref._drop) || !keep(p)) return p; seat(p); return C.poi(p); };
    A.place = function (set, x, z, o) { var q = o || {}; q.x = x; q.z = z; if (!keep(q)) return q; return C.place(set, x, z, q); };
    A.weights = function (x, z) { var k = kwAt(x, z); KWP[0] = k[0]; KWP[1] = k[3]; return KWP; };   // (world6 fix: the kits read the maps' weights: wD, wC)
    return A;
  }
  /* (phone lane) the heights the land (Hd) and the cloud sea (HdSea) can take, anywhere, for the rings' view test
     (drawFrame): a bound, worked from the GLSL's own terms, never a measure. gnd's value is under NB = 1 (each corner's
     gradient has |x|, |y| <= 1, so |dot| <= the L1 distance to that corner, and the fade's weights give at most 0.5 an
     axis), every dSstep / smoothstep in [0, 1], dAbs(x, e) in [e, sqrt(x^2 + e^2)], the weights wD, wC in [0, 1], the
     sea's level lv in [SEA_LO, 0] and the sink sk in [0, SINK] (raw texels SEA_LO and SINK, derived ones between, an
     unwritten texel 0). The land: dunes 55 NB + 36 over, 55 NB under; one basin at most (sites 600 m apart at least,
     radii under 260) sinks it 20 m more; a plateau (smooth max, never under the land) tops at swell + 8 + 60 plus 0.16
     of the land over its base, + k / 4 a site; the 9 ridges at most 60 (1.195 + 0.05 NB) each, never under 0. The sea:
     lv + A_Hd (0.4 .. 1), A_Hd within -42 NB .. 42 NB + the five domes' sqrt(NB^2 + e^2). Each widened by 10 m and 2%.
     A change to those terms' amplitudes is a change here */
  var YB = (function () {
    var NB = 1, wid = function (lo, hi) { return [lo - 10 - 0.02 * Math.abs(lo), hi + 10 + 0.02 * Math.abs(hi)]; };
    var du = 55 * NB + 36, dl = -55 * NB - 20, top = 55 * NB + 8 + 60, base = -55 * NB + 8, h = du;
    for (var k = 0; k < 9; k++) h = Math.max(h, top + 0.16 * Math.max(0, h - base)) + 5 / 4;
    var ridge = 9 * 60 * (1.195 + 0.05 * NB), dome = function (a, e) { return a * Math.sqrt(NB * NB + e * e); };
    var aU = 42 * NB + dome(28, 0.04) + dome(12, 0.05) + dome(4, 0.07) + dome(9, 0.08) + dome(3.5, 0.1);
    return { land: wid(dl - SINK, h + ridge), sea: wid(SEA_LO - 42 * NB, aU) };
  })();
  function worldDef(KD, KA) {
    return {
      id: 'world', still: KD.still,
      /* (world6 step B, the one camera) one framing everywhere (the horizon at 0.55 of a wide window's height and 0.58 of
         an upright phone's: about 6% of the height under the credit, design-v5 11.7), no look at the ground ahead
         (pitchFollow 0: one pitch), one clearance band over the surface flown (cruise: 14 m over the sand to 32 m over
         the cloud sea, by the maps ahead; flightParams), a ceiling of 60 m over the ground (a solid taller is passed
         beside, never climbed), one speed (12 m/s: the maps' pacing was worked out for it) */
      speed: KD.speed || 12, clear: [7, 14, 45], frame: [0.55, 0.58], cruise: AIR_CRUISE, marginB: KA.margin,
       look: KD.look, pitchFollow: 0, margin: KD.margin, lookT: KD.lookT, lookTan: KD.lookTan,
      glsl: WORLD_GLSL_HEAD + (KD.glsl || '') + (KA.glsl || '') + WORLD_GLSL,
      surfaces: [{ height: 'Hd', shade: 'shadeLand', gap: 'HdGap', g0: 0.35, levels: 10, split: true, yb: YB.land }, { height: 'HdSea', shade: 'shadeSea', g0: 2, levels: 10, yb: YB.sea }],
      camGround: 'HdCam', probeHgt: 'HdProbe', landmarkShade: 'shadeStone',
      layout: { scales: [KD.layout.scales[0], KD.layout.scales[1], KA.layout.scales[0]], volRes: 44 },
      field: function (R, V) {
        var fd = KD.field(R, V), fa = KA.field(RNG(subseed(V.seed, 23)), V), P = fd.params.slice(0, 12);
        while (P.length < 12) P.push([0, 0, 0, 0]);
        return { params: P.concat(fa.params) };
      },
      light: function (R, V) { return KD.light(R, V); },
      lightB: function (R, V) { return KA.light(R, V); },
      cell: function (C, R, K2) {
        if (C.scale < 2) KD.cell(kitApi(C, 'dunes', densD, false), R, K2);
        else KA.cell(kitApi(C, 'above', densA, true), R, K2);
      },
      build: function (it, B, R, K2) { return (it.kit === 'above' ? KA : KD).build(it, B, R, K2); },
      cloud: function (cl, PF, R, K2) { return (cl.kit === 'above' ? KA : KD).cloud(cl, PF, R, K2); },
      scatter: KD.scatter, particles: KD.particles, ribbons: KD.ribbons, sandFx: true,   // (world6 fix: the sand's particles drawn as the sand weight at the camera says: sandAt)
      // (world6 fix, the judges' defect 14) no events: nothing is spawned on a clock; the creatures are the cells' own,
      // world-anchored and scattered by density, coming in out of the haze (drawCreatures' distance fade)
      event: null
    };
  }
  /* the world's lights: the dunes kit's and the ABOVE kit's (one sun: the first's), blended by the cloud weight about
     the camera (climateLight), colours in OKLab, as round 3b's light by area did */
  function worldLights(V) {
    var raw = V.lightRaw, rawB = V.def.lightB(RNG(subseed(V.seed, 21)), V);
    var LB = prepOne(Object.assign({}, rawB)); LB.sunDir = keyAt(V);
    V.LA = [V.light, LB]; V.areaNames = ['dunes', 'cloud sea'];   // (the two kits' lights; skyStep replaces them, and their OKLab sets with them, with the two skies' before blendSky reads them)
    var live = prepOne(Object.assign({}, raw)); live.sunDir = keyAt(V); V.L = live;
    V.aw = new Float32Array(2); V.aw[0] = 1;
    V.lightRawB = rawB; V.paramsBase = new Float32Array(V.paramsFlat);   // (tod: the skies are laid over the kits' raw lights and the kits' own paint)
  }
  function climateLight(V) {
    if (!V.LA || !KW.ok) return;
    var w = lightWeight(CS.x, CS.z);
    V.aw[0] = 1 - w; V.aw[1] = w; V.lw = w;
    skyStep(V, w);   // (tod: the two kits by place and the two skies on show by time, w04b_sky.js)
  }

