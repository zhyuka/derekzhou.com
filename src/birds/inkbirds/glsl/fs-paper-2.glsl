
float ed(vec2 q, vec2 a, vec2 b) { vec2 e = b - a; float l = length(e); return l < 1e-5 ? -1e4 : dot(q - a, vec2(e.y, -e.x)) / l; }
float sdSeg(vec2 q, vec2 a, vec2 b) { vec2 pa = q - a, ba = b - a; float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-9), 0.0, 1.0); return length(pa - ba * h); }
/* the points are read from the row where each is used, never held in a local array: 46 points indexed by the mesh's
   tables stood in memory on a tiler's GPU (a Mali spilled 432 bytes a fragment) and in FXC's indexable temporaries;
   the same texel, so the same value. uZ (never set: 0) keeps FXC from unrolling the triangle and outline loops */
uniform int uZ;
vec2 ptXY(int i, int r) { return texelFetch(uPts, ivec2(i, r), 0).xy; }
float ptZ(int i, int r) { return texelFetch(uPts, ivec2(i, r), 0).z; }
/* one edge's share of a triangle's coverage: hard where the mesh goes on across it, else the box filter */
void edgeCov(float dk, bool inner, float w, float gw, inout float s, inout float n, inout float hard) {
  if (inner) hard *= dk <= 1e-3 ? 1.0 : 0.0;
  else { s += clamp(0.5 - (dk + gw) / w, 0.0, 1.0); n += 1.0; }
}
float linZ(float d) { return d >= 1.0 ? 6.0e4 : 2.0 * uProj.z * uProj.w / (uProj.w + uProj.z - (d * 2.0 - 1.0) * (uProj.w - uProj.z)); }
void main() {
  vec2 q = gl_FragCoord.xy, uv = q / uOut;
  int row = int(vK1.x + 0.5); bool sl = vK1.y > 0.5;
  /* the light wrap: in the sun's own glare (its bloom strong under the bird) the light eats into the paper (thinner,
     lifted toward the light), as into every silhouette the bloom touches; added light only */
  float g = 0.0;
  if (uBl.w > 0.5) g = smoothstep(uGl.x, uGl.y, dot(texture(uBloom, uv * uBl.xy).rgb, LUM) * uBl.z);
  float w = max(vK1.w * uLand.z, 0.5), cov = 0.0, fz = -1.0;
  int ff = -1, fc = -1;
  for (int i = 0; i < NTRI + uZ; i++) {
    ivec4 T = sl ? TRI1[i] : TRI0[i];
    vec2 a = ptXY(T.x, row), b = ptXY(T.y, row), c = ptXY(T.z, row);
    float ar = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    if (abs(ar) < 1e-4) continue;
    vec2 lo3 = min(a, min(b, c)) - w, hi3 = max(a, max(b, c)) + w;
    if (q.x < lo3.x || q.y < lo3.y || q.x > hi3.x || q.y > hi3.y) continue;
    float sg = ar > 0.0 ? 1.0 : -1.0, gw = uGl.z * g;
    float s = 0.0, n = 0.0, hard = 1.0; int inn = T.w >> 8;
    edgeCov(sg * ed(q, a, b), (inn & 1) == 1, w, gw, s, n, hard);
    edgeCov(sg * ed(q, b, c), ((inn >> 1) & 1) == 1, w, gw, s, n, hard);
    edgeCov(sg * ed(q, c, a), ((inn >> 2) & 1) == 1, w, gw, s, n, hard);
    float ci = (n > 0.0 ? clamp(s - (n - 1.0), 0.0, 1.0) : 1.0) * hard;
    if (ci <= 0.0) continue;
    /* its nearness here: 1/depth, barycentric on the window (exact for a plane seen in perspective) */
    float la = clamp(((b.x - q.x) * (c.y - q.y) - (b.y - q.y) * (c.x - q.x)) / ar, 0.0, 1.0), lb = clamp(((c.x - q.x) * (a.y - q.y) - (c.y - q.y) * (a.x - q.x)) / ar, 0.0, 1.0), lc = max(0.0, 1.0 - la - lb);
    float iz = la * ptZ(T.x, row) + lb * ptZ(T.y, row) + lc * ptZ(T.z, row);
    if (ci >= 0.5 && iz > fz) { fz = iz; ff = T.w & 255; }
    if (ci > cov) { cov = ci; fc = T.w & 255; }
  }
  int facet = ff >= 0 ? ff : fc;
  /* the pen floor along the leading edge's M: a wing seen edge-on is still the tattoo's line (in the one tone) */
  float hw = 0.5 * vK1.z * (1.0 - uGl.z * g);
  float ds = 1e9;
  for (int i = 0; i < 6; i++) ds = min(ds, sdSeg(q, ptXY(CH[i], row), ptXY(CH[i + 1], row)));
  float gfill = 1.0;
  if (vW.z >= 0.0 && uMode.x < 0.5) {
    /* the gift (S5, SIMULATED): the leading edge's M written from the back tip to the front tip, then the paper filled.
       Added light only. */
    float gE = vW.z, wr = clamp(gE / 0.7, 0.0, 1.0); gfill = clamp((gE - 0.7) / 0.3, 0.0, 1.0);
    float Lt = 0.0; for (int i = 0; i < 6; i++) Lt += length(ptXY(CH[i + 1], row) - ptXY(CH[i], row));
    float acc = 0.0, best = 1e9, tq = 0.0;
    for (int i = 0; i < 6; i++) {
      vec2 a = ptXY(CH[i], row), ba = ptXY(CH[i + 1], row) - a; float sl2 = length(ba), h = clamp(dot(q - a, ba) / max(dot(ba, ba), 1e-9), 0.0, 1.0), dd = length(q - a - ba * h);
      if (dd < best) { best = dd; tq = acc + h * sl2; }
      acc += sl2;
    }
    if (vW.w < 0.0) tq = Lt - tq;
    float head = wr * Lt, written = clamp((head - tq) / w + 0.5, 0.0, 1.0);
    float lh = max(hw, 0.7 * w), cl = (clamp(0.5 + (lh - best) / w, 0.0, 1.0) + clamp(0.5 + (lh + best) / w, 0.0, 1.0) - 1.0) * written;
    float cpaper = cov * gfill;
    cov = max(cpaper, cl); if (cl > cpaper) facet = -1;
  } else if (hw > 0.0) {
    float cs = clamp(0.5 + (hw - ds) / w, 0.0, 1.0) + clamp(0.5 + (hw + ds) / w, 0.0, 1.0) - 1.0;
    if (cs > cov) { cov = cs; facet = -1; }
  }
  /* the night's halo: the distance to the outline (the mesh's own edges: the leading edge's M, the trailing edge, the
     fingers) and to the pen floor */
  float halo = 0.0;
  if (vZ.w > 0.0 && cov < 1.0) {
    float dt = 1e9;
    if (sl) { for (int i = 0; i < NBE1 + uZ; i++) dt = min(dt, sdSeg(q, ptXY(BE1[i].x, row), ptXY(BE1[i].y, row))); }
    else { for (int i = 0; i < NBE0 + uZ; i++) dt = min(dt, sdSeg(q, ptXY(BE0[i].x, row), ptXY(BE0[i].y, row))); }
    float e = max(vZ.z, 0.5), dd = max(min(dt, ds) - hw, 0.0);
    halo = vZ.w * exp(-dd / e) * (1.0 - smoothstep(2.5 * e, 4.0 * e, dd)) * (1.0 - cov);
    if (vW.z >= 0.0) halo *= max(gfill, 0.5 * clamp(vW.z / 0.7, 0.0, 1.0));
  }
  if (cov <= 0.0 && halo < 1.0 / 512.0) discard;
  /* hidden by the land in front (the scene's depth, the four texels about the pixel weighted as the composite's
     bilinear put the land up: the bird's edge against a ridge is the ridge's own) */
  float vis = 1.0;
  if (uLand.x > 0.5) {
    ivec2 dsz = textureSize(uDepth, 0); vec2 dp = uv * uSc.xy * vec2(dsz) - 0.5, f = fract(dp); ivec2 d0 = ivec2(floor(dp));
    float v00 = smoothstep(-vZ.y, 0.0, linZ(texelFetch(uDepth, clamp(d0, ivec2(0), dsz - 1), 0).r) - vZ.x + 0.5 * vZ.y);
    float v10 = smoothstep(-vZ.y, 0.0, linZ(texelFetch(uDepth, clamp(d0 + ivec2(1, 0), ivec2(0), dsz - 1), 0).r) - vZ.x + 0.5 * vZ.y);
    float v01 = smoothstep(-vZ.y, 0.0, linZ(texelFetch(uDepth, clamp(d0 + ivec2(0, 1), ivec2(0), dsz - 1), 0).r) - vZ.x + 0.5 * vZ.y);
    float v11 = smoothstep(-vZ.y, 0.0, linZ(texelFetch(uDepth, clamp(d0 + ivec2(1, 1), ivec2(0), dsz - 1), 0).r) - vZ.x + 0.5 * vZ.y);
    vis = mix(mix(v00, v10, f.x), mix(v01, v11, f.x), f.y);
  }
  /* hidden by the cloud before it: the cloud's cover here, times how much of it stands in front of the bird: an opaque
     core here says so by its depth (the half-resolution depth holds the land's nearest and the cores'); without a core
     (a soft edge, a thin veil) the lobes' weight along the bird's span (from its left tip to its right tip) */
  if (uLand.y > 0.5) {
    float ca = texture(uCloud, min(uv * uSc.zw, uCl)).a;
    if (ca > 0.002) {
      ivec2 hsz = textureSize(uHz, 0), hp = clamp(ivec2(uv * uSc.zw * vec2(hsz)), ivec2(0), hsz - 1);
      float zh = linZ(texelFetch(uHz, hp, 0).r);
      ivec2 dsz2 = textureSize(uDepth, 0);
      float zl = linZ(texelFetch(uDepth, clamp(ivec2(uv * uSc.xy * vec2(dsz2)), ivec2(0), dsz2 - 1), 0).r);
      vec2 t0 = ptXY(CH[0], row), ax = ptXY(CH[6], row) - t0; float sAlong = clamp(dot(q - t0, ax) / max(dot(ax, ax), 1e-6), 0.0, 1.0);
      float wl = sAlong < 0.5 ? mix(vC.x, vC.y, sAlong * 2.0) : mix(vC.y, vC.z, sAlong * 2.0 - 1.0);
      float front = zh < zl - 2.0 ? (zh < vZ.x - 0.5 * vZ.y ? 1.0 : 0.0) : wl;
      vis *= 1.0 - ca * front;
    }
  }
  /* (the owner, 2026-11-05: "pls remove the masking boxes from behind the text completely. it's completely fine if the
     birds fly behind/in front of it") nothing about the words hides a bird: the canvas lies behind them, and a bird
     crossing them is drawn whole, under the letters */
  vec3 col = vCol.rgb;
  if (uMode.x < 0.5) {
    /* the near bird's planes: its facet's own light, through the same air, hold and grade, mixed in by lodK */
    if (vL.x > 0.0 && facet >= 0) { vec3 fe = texelFetch(uPts, ivec2(46 + facet, row), 0).rgb; col = mix(col, gradeOut(vAir.a * fe * vW.y + vAir.rgb), vL.x); }
    col = max(col, vec3(uMode.y * vC.w));        // at night the paper keeps a light of its own: a floor, the glow's grey as encoded
    col = mix(col, vec3(1.0), uGl.w * g);        // (the light wrap: lifted toward the glare)
  }
  float a = cov * vCol.w * vis;
  vec3 hc = uMode.x > 0.5 ? vec3(0.0) : vec3(0.92, 0.94, 1.0) * halo * vCol.w * vis;
  oC = vec4(col * a + hc, a);
}