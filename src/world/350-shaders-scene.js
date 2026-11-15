  /* ---------------------------------------------------------------- shaders: the scene */
  /* each opaque fragment's depth, coded into the scene's alpha for the composite: 0.5 + 0.5 log2(linear
     depth, m) / 16 (1 m .. 65 km), 1 on the far plane (the sky); water keeps its reflected share below 0.5 (0.49 (1 -
     F)). The scene's samples are averaged by the resolve, so where a pixel's samples stand at two depths (a floating
     rock's outline against a cloud) its alpha says how many stand near: the composite lays the cloud behind over the far
     ones only (FS_COMP). The depth resolve keeps one sample, so a composite reading it takes each such pixel as wholly
     rock or wholly cloud, and the outline crawls (29% of the edge pixels in between, the reference 51%) */
  var ZCODE = `
float zcode() {
  float d = gl_FragCoord.z; if (d >= 0.999999) return 1.0;
  float n = uProj.z, f = uProj.w, z = d * 2.0 - 1.0, lz = 2.0 * n * f / (f + n - z * (f - n));
  return lz >= 5.9e4 ? 1.0 : 0.5 + 0.5 * clamp(log2(max(lz, 1.0)) / 16.0, 0.0, 1.0);
}
float sceneA() { return gWater > 0.0 ? 0.49 * (1.0 - gWater) : zcode(); }
`;
  /* (physics: sand/S2, a crisp brink) the main dunes' phase to the land's fragments: 7 floats (the phase unwrapped, its
     gradient, the height with the sites' share; the slip face's share, the slope the vertex took from them). The
     fragment rebuilds the slope at its own phase (s1Slope) and puts it in place of the vertices' (FS_TERRAIN) */
  var S1_OUT = `
centroid out vec4 vS1; centroid out vec3 vS1g;
void s1Out(vec4 s, float fl, float sw) {
  vS1 = vec4(s.xyz, s.w * sw);
  vS1g = vec3(fl, s1Slope(fract(s.x), s.yz, vS1.w, fl, 2.0, max(0.15 * vS1.w, 0.05)));
}`;
  function VS_TERRAIN(H, G) {   // (G, a surface's gap function: its height over another surface, passed to its shading as gTX)
    return `
layout(location = 0) in vec2 aG;
uniform vec4 uLev;   // ring origin x, z in whole cells of this ring (integers); cell size; half the cells across
centroid out vec3 vW; centroid out vec3 vN; centroid out float vX;${H === 'Hd' ? S1_OUT : ''}
void main() {
  vec2 c = uLev.xy + aG, w = c * uLev.z;   // (the lattice: c whole cells, exact; one rounding of c g, the same on both rings of a seam)
  float d = max(abs(w.x - uCam.x), abs(w.y - uCam.z));
  float m = clamp((d - (uLev.w - 11.0) * uLev.z) / (8.5 * uLev.z), 0.0, 1.0);
  w = (c - mod(aG, 2.0) * m) * uLev.z;
  gLodD = length(w - uCam.xz);
  vec3 hd = ${H}(w);
  vX = ${G ? G + '(w, hd.x)' : '1e4'};
  vW = vec3(w.x, hd.x, w.y); vN = vec3(-hd.y, 1.0, -hd.z);${H === 'Hd' ? '\n  s1Out(gS1, gS1F, gS1W);' : ''}
  gl_Position = uVP * vec4(vW - uCam, 1.0);
}`;
  }
  /* the split height: the land's height (Hd, HdGap's A_Hd) evaluated by four small fragment passes,
     one RGBA32F texel a point, instead of inside the land's vertex program and the probe. The passes call the realm's
     own functions unchanged (kitW4, dunes, siteOf / basinOf / plateauOf, ridges, A_Hd); only where they are evaluated
     moves. The point a texel stands for: uHsrc 0, a clipmap vertex (x = i, y = level x 97 + j: placed and morphed as the
     land's vertex stage places it, gLodD its distance from the camera); 1, the probe's point (uTex); 2, the probe's grid
     (uGCw), gLodD 0 for both, as in the probe. Then the land's vertex program and the probe read the passes' texels and
     do the last adds as Hd, HdGap and HdProbe do: the same fp32 operations, in the same order (the gate: the one-program
     land VS against this, by transform feedback, bit-identical heights, positions and gaps). The point: the compile.
     One program holding all of Hd takes 2.3 s (land VS) and 1.6 s (probe FS) on ANGLE-D3D11; the parts compile in
     parallel */
  var HP_PARTS = ['kit', 'dunes', 'sites', 'ridges'];
  /* where the split is made: every ANGLE Direct3D11 device, the Windows GPUs (the owner, 2026-11-06: "Yes, if it saves
     100 ms+"). FXC is the same compiler on all of them, so the split's saving is the same everywhere there: the land VS
     (701 ms of FXC) and the probe (486 ms) become passes of at most ~137 ms, the compile wall 701 -> 426 ms
     (.work/hub/speed/FINDING-fxc-census.md). Its heights and gap read back exact and its slopes within one ulp on
     NVIDIA, the one Windows GPU read back (the shipped DXBC is the same for every maker; each driver compiles it to its
     own machine code). Elsewhere (Metal, Linux, Android) the one land program. Per device, so the return visit's
     program cache holds */
  function HP_DEV(r) { return /^ANGLE \(/.test(r || '') && /Direct3D11/.test(r || ''); }
  var HP_GRIDW = `@glsl hp-gridw`;
  var HP_MAIN = {
    kit: 'void main() { gridW(); vec3 wD, wC, lv, sk; kitW4(gw, wD, wC, lv, sk); o0 = vec4(wD, lv.x); o1 = vec4(sk, wC.x); }',
    dunes: 'void main() { gridW(); gKD = texelFetch(uHP0, gq, 0).xyz; gSK = texelFetch(uHP1, gq, 0).xyz; o0 = vec4(dunes(gw), gS1.x); o1 = vec4(gS1.yzw, gS1F); }',   // (physics: sand/S2: the phase and the rest to P2.w and P5)
    sites: 'void main() { gridW(); o0 = vec4(D_HdSites(gw, texelFetch(uHP2, gq, 0).xyz), gS1W); o1 = vec4(0.0); }',
    ridges: 'void main() { gridW(); o0 = vec4(ridges(gw), A_Hd(gw).x); o1 = vec4(0.0); }',
    /* the probe's own two: the one-program probe keeps only the height live (h.x; its slopes are dead), so FXC fuses
       its arithmetic as it does when only .x is written; the land's passes (every channel live, as the land VS) differ
       from it by an ulp at 0.4% of points. Written .x only, the probe's passes read back bit-identical to it */
    sitesX: 'void main() { gridW(); o0 = vec4(D_HdSites(gw, texelFetch(uHP2, gq, 0).xyz).x, 0.0, 0.0, 0.0); o1 = vec4(0.0); }',
    ridgesX: 'void main() { gridW(); o0 = vec4(ridges(gw).x, 0.0, 0.0, A_Hd(gw).x); o1 = vec4(0.0); }'
  };
  /* HP_LAND: the land VS read the passes too. Off: its slopes (the normals) cannot come out bit-identical through any
     texture boundary (the one program fuses and reorders across D_Hd - sk; read back: 1 ulp at ~25% of vertices,
     whatever the cut), so only the probe is split, and the land keeps its one program */
  var HP_LAND = true;   // (the owner, 2026-11-05: the land split's 1-ulp slopes accepted for the speed, on the split's devices only)
  var HP_PROGS = HP_LAND ? ['kit', 'dunes', 'sites', 'ridges', 'sitesX', 'ridgesX'] : ['kit', 'dunes', 'sitesX', 'ridgesX'];   // (P.hp's order: the clipmap runs 0-3, the probe the last four's kit, dunes, sitesX, ridgesX)
  var HP_PORD = HP_LAND ? [0, 1, 4, 5] : [0, 1, 2, 3];
  /* the sites' part of D_Hd (its basins and plateaux over the 3x3 sites), taken from the realm's own D_Hd as it ships
     (as written, or a rewrite of its loops): its body between `vec3 h = dunes(p);` and `return h + ridges(p);`, the h
     handed in. null when D_Hd is not of that shape (the split is then not made: the one-program land and probe) */
  function HP_SITES_FN(g) {
    var a = g.indexOf('vec3 D_Hd(vec2 p) {'); if (a < 0 || g.indexOf('vec3 D_Hd(vec2 p) {', a + 1) >= 0) return null;
    var e = g.indexOf('\n}', a); if (e < 0) return null;
    var body = g.slice(a + 'vec3 D_Hd(vec2 p) {'.length, e), A = '\n  vec3 h = dunes(p);\n', Z = '\n  return h + ridges(p);';
    if (body.indexOf(A) !== 0 || body.lastIndexOf(Z) !== body.length - Z.length || body.split(A).length !== 2 || body.split(Z).length !== 2) return null;
    return '\nvec3 D_HdSites(vec2 p, vec3 h) {\n' + body.slice(A.length, body.length - Z.length) + '\n  return h;\n}\n';
  }
  function VS_TERRAIN_SPLIT(G) {   // VS_TERRAIN with the height read from the passes (Hd - sk, HdGap's terms)
    return `
layout(location = 0) in vec2 aG;
uniform vec4 uLev;   // ring origin x, z in whole cells of this ring (integers); cell size; half the cells across
uniform int uLvl;    // the level: its rows in the passes' texels
uniform highp sampler2D uHP0, uHP1, uHP2, uHP3, uHP4, uHP5;   // kit (wD, lv), kit (sk, wC), the dunes' h (+ their phase), the sites' h (+ their share), the ridges (+ A_Hd), the dunes' phase's gradient, height and slip face
centroid out vec3 vW; centroid out vec3 vN; centroid out float vX;${S1_OUT}
void main() {
  vec2 c = uLev.xy + aG, w = c * uLev.z;   // (the lattice: c whole cells, exact; one rounding of c g, the same on both rings of a seam)
  float d = max(abs(w.x - uCam.x), abs(w.y - uCam.z));
  float m = clamp((d - (uLev.w - 11.0) * uLev.z) / (8.5 * uLev.z), 0.0, 1.0);
  w = (c - mod(aG, 2.0) * m) * uLev.z;
  ivec2 q = ivec2(aG) + ivec2(0, uLvl * 97);
  vec4 k0 = texelFetch(uHP0, q, 0), k1 = texelFetch(uHP1, q, 0), s = texelFetch(uHP3, q, 0), r = texelFetch(uHP4, q, 0);
  vec3 hd = (s.xyz + r.xyz) - k1.xyz;
  vX = ${G ? 'hd.x - k0.w > 140.0 ? 1e4 : hd.x - (k0.w + r.w * (0.4 + 0.6 * k1.w))' : '1e4'};
  vW = vec3(w.x, hd.x, w.y); vN = vec3(-hd.y, 1.0, -hd.z);
  vec4 p5 = texelFetch(uHP5, q, 0); s1Out(vec4(texelFetch(uHP2, q, 0).w, p5.xyz), p5.w, s.w);
  gl_Position = uVP * vec4(vW - uCam, 1.0);
}`;
  }
  var FS_PROBE_SPLIT = `@glsl fs-probe-split`;
  /* (physics: sand/S2) the main dune's slope at this fragment's own phase, in place of the vertices' (interpolated
     across the cell, they smeared the brink over it): the rounding max(2 m, 1.5 px) at the brink and the toe, and the
     whole put in only as far as the dunes are resolved (B, by the cycles of phase a pixel spans: the spec's band-limit) */
  var S1_IN = `
centroid in vec4 vS1; centroid in vec3 vS1g;`;
  var S1_FS = `
  if (vS1.w > 0.01) {
    vec2 g = vS1.yz; float k = length(g), fl = clamp(vS1g.x, 0.04, 0.6), H = vS1.w, L = 1.0 - fl;
    vec2 rh = normalize(rd.xz + vec2(1e-6, 0.0));
    float cp = fp * length(vec2(dot(g, rh) / max(abs(dot(n, rd)), 0.02), dot(g, vec2(-rh.y, rh.x))));
    float B = 1.0 - smoothstep(0.25, 0.5, cp);
    if (B > 0.0) {
      float wpx = 1.5 * cp / k, sB = H * k * (0.5 / L + 1.0 / fl);   // (1.5 px in metres along the wind; the slopes' sum either side)
      vec2 s = s1Slope(fract(vS1.x), g, H, fl, max(1.0, 0.5 * wpx) * sB, max(max(0.15 * H, 0.05), 0.5 * wpx * sB));
      vec2 dg = B * (s - vS1g.yz);
      n = normalize(vN - vec3(dg.x, 0.0, dg.y));
    }
  }`;
  function FS_TERRAIN(H, S) {
    return ZCODE + `
centroid in vec3 vW; centroid in vec3 vN; centroid in float vX; out vec4 oC;${H === 'Hd' ? S1_IN : ''}
void main() {
#ifdef HAS_GTX
  gTX = vX;
#endif
  vec3 v = vW - uCam;
  float t = length(v); vec3 rd = v / t;
  float fp = t * 2.0 * uProj.y / uRes.y;
  vec3 n = normalize(vN);${H === 'Hd' ? S1_FS : ''}
  vec3 c = ${S}(vW, n, rd, t, fp);
  if (uDbg == 2) { oC = vec4(vec3(clamp(dot(n, uSun), 0.0, 1.0)), 1.0); return; }
  if (uDbg == 3) { oC = vec4(n * 0.5 + 0.5, 1.0); return; }
  oC = vec4(uDbg == 1 ? c : atmos(c, rd, t), sceneA());   // (alpha: the depth's code, or water's reflected share under 0.5: E1.1)
}`;
  }
