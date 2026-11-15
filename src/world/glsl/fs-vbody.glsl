
uniform sampler3D uVol; uniform sampler2D uLinD; uniform vec3 uVC, uVH; uniform vec2 uVY;   // centre, half size, yaw (cos, sin)
uniform vec4 uVR;   // extinction (1/m), most steps, the fine billows' scale (m), their depth (m)
uniform vec4 uVS;   // the stored distance's range (m), the soft band (m), the ceiling a forming cloud rises under (world y), a passage cloud's near reach (m)
uniform vec4 uVR2;  // how far the billows reach out of the smooth form (m), its fade (0 .. 1), the camera inside it (1), its flat base (world y; -1e5 none)
uniform float uVVox;   // the body's voxel (m)
uniform vec2 uVK;  // the most pieces a band segment is cut into, and 1 for the crisp edge, 0 the soft one (the look's tier,
                   // LOOKD from hour.js's data-look: 48 and 1 on the desktop look, 1 and 0 the rest)
float segRamp(float s0, float s1, float bE) {   // the band's ramp clamp(-s / bE, 0, 1) over a piece, its mean with s linear between its ends
  float G0 = s0 >= 0.0 ? 0.0 : (s0 > -bE ? s0 * s0 / (2.0 * bE) : -s0 - 0.5 * bE), G1 = s1 >= 0.0 ? 0.0 : (s1 > -bE ? s1 * s1 / (2.0 * bE) : -s1 - 0.5 * bE), ds = s1 - s0;
  return abs(ds) < 1e-3 * bE ? clamp(-0.5 * (s0 + s1) / bE, 0.0, 1.0) : (G0 - G1) / ds;
}
in vec3 vW; out vec4 oC;
void main() {
  vec3 rd = normalize(vW - uCam), d0 = uCam - uVC;
  vec3 ro = vec3(uVY.x * d0.x - uVY.y * d0.z, d0.y, uVY.y * d0.x + uVY.x * d0.z), rl = vec3(uVY.x * rd.x - uVY.y * rd.z, rd.y, uVY.y * rd.x + uVY.x * rd.z);
  vec3 inv = 1.0 / rl, ta = (-uVH - ro) * inv, tb = (uVH - ro) * inv, t0 = min(ta, tb), t1 = max(ta, tb);
  float tn = max(max(max(t0.x, t0.y), t0.z), 0.0), tf = min(min(t1.x, t1.y), t1.z);
  float zs = linFetch(uLinD, ivec2(gl_FragCoord.xy)) / max(dot(rd, uCamF), 1e-3);
  tf = min(tf, zs);
  if (tf <= tn) discard;
  float cs = dot(rd, uSun), g = uClK.z;
  float P0 = mix(hgN(cs, g), hgN(cs, -0.25), 0.22), P1 = hgN(cs, g * 0.6), P2 = hgN(cs, g * 0.36);
  float vox = uVVox, band = uVS.y, amp = uVR.w;
  float dIn = max(vox * 0.75, band * 1.2), dEdge = max(band * 0.6, 1.0);
  // (no glitter) the march, stable from one frame to the next:
  // - no start offset: a fixed per-pixel offset (an R2 pattern on the window, up to one edge step) is a pattern the
  //   moving cloud crawls through. The march begins where the ray enters the body's box (a place fixed on the cloud:
  //   moving along the ray, the camera meets the same samples), or at the eye;
  // - the density integrated over each segment between two samples (the distance taken as linear between them, the
  //   soft band's ramp integrated exactly), lit at the segment's front: where a sample falls then moves the answer
  //   only a little (point samples, a step or more apart across a band about a step wide, turn each small move of the
  //   view into a jump of the cloud's edge, pixel by pixel). A leap's start is a segment's front too (its distance
  //   without the billows: their mean), so a leap that ends past the cloud's face still counts the face (a leap is at
  //   least a band step long, and where one lands beyond the face, the face uncounted would be skipped or not as the
  //   samples move: the far towers' speckle);
  // - no step inside the cloud shorter than the rest of the ray over the steps left, so every ray reaches its end (the
  //   land, or the box's far side) within its budget (uVR.y: 48 steps on the desktop look (LOOKD), 32 on the rest, 48 on every look within 1.3 radii of
  //   a body, eased to 1.7 (410)): a ray cut where its
  //   budget runs out, the rest left clear, shows the sea through a cloud's wispy flank, in holes that open and shut
  //   as the samples move (leaps are never stretched: a leap is bounded by the distance to the cloud);
  // - the fine billows' noise at an explicit LOD: its texel (32 to a tile) no finer than two of the half-resolution
  //   pixel's footprints at the sample, nor than half the band's step there (inside this loop the implicit LOD's
  //   derivatives are undefined, and each GPU picks its own mip pixel by pixel; billows finer than the march's own
  //   pixel or step are sampled as aliases that crawl and blink at the cloud's edges);
  // - the band at least 2 half-resolution pixels soft at the sample (an edge sharper than its pixel crawls on the
  //   half-resolution grid);
  // - (the edge's boil, 2026-11-14) a segment that can reach the band is cut into pieces no longer than half the
  //   billows' texel at its LOD (at most uVK), the billows read again at each cut and the smooth form taken linear
  //   between the two samples: the samples are forced 3-12 m apart (mS) across billows of 2.5 m texels, and the ramp
  //   integrated with the distance linear between two such samples catches or misses whole billows as the samples move
  //   with the camera. Each segment is lit at its middle, and the first face's normal taken where the smooth form
  //   crosses into the band between the two samples, not at the first sample;
  // - the billows' noise at body-relative coordinates (the body's centre, as a fraction of the billows' tile, kept
  //   apart from the sample's place within the body).
  // The same samples and texture reads as plain point sampling; a few more instructions a step.
  float t = tn, pxA = 2.0 * uProj.y / uRes.y;   // (pxA: a half-resolution pixel's angle; its footprint is t x pxA)
  vec3 acc = vec3(0.0); float T = 1.0, taken = 0.0, leaps = 0.0;   // (the band's samples against uVR.y; the leaps against their own 32)
  vec3 sunL = vec3(uVY.x * uSun.x - uVY.y * uSun.z, uSun.y, uVY.y * uSun.x + uVY.x * uSun.z), nrm = vec3(0.0, 1.0, 0.0);
  float wrapL = 1.0, facing = 1.0; bool hit = false;
  // the last sample (a band sample or a leap's start): its distance to the cloud, place, light depths, own density and fade (tP < 0: none yet)
  float sP = 0.0, sBP = 0.0, tP = -1.0, gP = 0.0, bP = 0.0, dP = 0.0, fP = 1.0; bool last = false;   // (sBP: the last sample's distance without the billows)
  vec3 nOff = fract(uVC / uVR.z); float texel = uVR.z / 32.0;
  for (int i = 0; i < 96; i++) {
    if (t > tf || last || taken >= uVR.y) break;
    if (t >= tf) { t = tf; last = true; }   // (the ray's end is a sample, so its last segment is counted)
    vec3 p = ro + rl * t;
    vec4 v = texture(uVol, p / (2.0 * uVH) + 0.5);
    float dE = max(dEdge, t * 0.012);
    float yb = uVR2.w - p.y - uVC.y;   // under the body's flat base: outside it
    float s = max(max((0.5 - v.r) * uVS.x, p.y + uVC.y - uVS.z), yb);
    float sl = max(max((0.5 - v.a) * uVS.x * 2.0 - uVR2.x, p.y + uVC.y - uVS.z), yb) - amp;
    if ((sl > band || s > band + amp) && leaps < 32.0) {   // a leap: its start kept as the next segment's front (above); past 32 leaps, band steps
      leaps += 1.0;
      vec3 fqL = (uVH - abs(p)) / uVH; float fzL = smoothstep(0.0, 0.07, min(min(fqL.x, fqL.y), fqL.z));
      if (uVS.w > 0.0) fzL *= smoothstep(uVS.w * 0.2, uVS.w, t);
      sP = s; sBP = s; tP = t; gP = v.g; bP = v.b; dP = 0.0; fP = fzL;
      t += sl > band ? max(sl * 0.9, dE) : max((s - amp) * 0.6, dE); continue;
    }
    taken += 1.0;
    float mS = (tf - t) / max(uVR.y - taken + 1.0, 1.0);   // (the shortest step that still reaches the ray's end: the band's steps left)
    float sB = s;
    if (!hit) {
      hit = true;
      // (where the smooth form crosses into the band between the last sample and this one: a place on the cloud)
      float tc = tP >= 0.0 && sBP > sB ? mix(tP, t, clamp((sBP - band - amp) / (sBP - sB), 0.0, 1.0)) : t;
      vec3 uv0 = (ro + rl * tc) / (2.0 * uVH) + 0.5, e = 1.2 / vec3(textureSize(uVol, 0)); vec2 kk = vec2(1.0, -1.0);
      vec3 gg = kk.xyy * texture(uVol, uv0 + kk.xyy * e).r + kk.yyx * texture(uVol, uv0 + kk.yyx * e).r + kk.yxy * texture(uVol, uv0 + kk.yxy * e).r + kk.xxx * texture(uVol, uv0 + kk.xxx * e).r;
      nrm = normalize(-gg / (2.0 * uVH) + vec3(0.0, 1e-6, 0.0));
      wrapL = clamp((dot(nrm, sunL) + 0.35) / 1.35, 0.0, 1.0); facing = 0.5 + 0.5 * nrm.y;
    }
    float lod = clamp(log2(max(max(2.0 * t * pxA, 0.5 * dE) * 32.0 / uVR.z, 1e-4)), 0.0, 5.0);
    float dn = textureLod(uN3, p / uVR.z + nOff, lod).g;
    s -= (dn - 0.5) * amp * 2.0;
    float dt = max(s > 0.0 ? max(dE, s * 0.5) : (s > -band ? dE : max(dIn, dE)), mS);
    // (no face of the box can draw an edge: the density thins over its outer few per cent)
    vec3 fq = (uVH - abs(p)) / uVH; float fz = smoothstep(0.0, 0.07, min(min(fq.x, fq.y), fq.z));
    if (uVS.w > 0.0) fz *= smoothstep(uVS.w * 0.2, uVS.w, t);
    // (the crisp edge, the desktop: 1.25 half-resolution pixels near, widening to the soft band by 350 m;
    // its cuts a sixteenth of a texel, as they must be for an edge that hard over billows that deep not to boil (half a
    // texel lets whole billows dip in and out between two cuts). Elsewhere the soft band, cut at half a texel, as before.)
    float cw = uVK.y > 0.5 ? smoothstep(150.0, 350.0, t) : 1.0, pf = uVK.y > 0.5 ? 0.0625 : 0.5;
    float bE = max(band * cw, mix(1.25, 2.0, cw) * t * pxA);
    if (tP >= 0.0) {
      // the segment from the last band sample to this one: the band's ramp integrated with s linear over each piece; a
      // segment that can reach the band (on either side of it, the billows' depth allowed) cut into K pieces
      float K = min(sBP, sB) - amp < 0.5 * bE && max(sBP, sB) + amp > -bE ? clamp(ceil((t - tP) / (pf * texel * exp2(lod))), 1.0, uVK.x) : 1.0;
      float dsum = 0.0, sa = sP;
      for (int k = 1; k < 48; k++) {
        if (float(k) >= K) break;
        float u = float(k) / K, sk = mix(sBP, sB, u) - (textureLod(uN3, (ro + rl * mix(tP, t, u)) / uVR.z + nOff, lod).g - 0.5) * amp * 2.0;
        dsum += segRamp(sa, sk, bE); sa = sk;
      }
      dsum += segRamp(sa, s, bE);
      float d = dsum / K * 0.5 * (fP + fz);
      float a = 1.0 - exp(-d * uVR.x * (t - tP));
      if (a > 0.0005) {   // (lit at the segment's middle)
        float tl = (gP + v.g) * 12.0, sky = exp(-(bP + v.b) * 0.5 * 12.0 * 0.85), tM = 0.5 * (tP + t);
        float ms = exp(-tl) * P0 + 0.5 * exp(-tl * 0.45) * P1 + 0.25 * exp(-tl * 0.2) * P2;
        vec3 amb = mix(uClDeep, uClShade, sky * (0.7 + 0.3 * facing));
        amb = mix(amb, uClLit * 0.9, 0.38 * facing * facing * sky);
        float fk = 0.7 * (1.0 - smoothstep(0.35, 0.92, cs) * exp(-tl * 0.5));
        vec3 c = mix(amb, uClLit, (1.0 - exp(-ms * uClK2.y)) * (0.5 + 0.5 * sky) * mix(1.0, wrapL, fk)) + uClRim * exp(-tl * 1.5) * max(P0 - 1.2, 0.0) * 0.045 * uClK.w * (1.0 - dP);
        // near the eye, a cloud the camera is in (or a passage's) is its own lit mist: never a dark wall
        float nearK = max(uVS.w > 0.0 ? 0.55 * (1.0 - smoothstep(uVS.w * 0.3, uVS.w * 1.8, tM)) : 0.0, uVR2.z * 0.6 * (1.0 - smoothstep(30.0, 260.0, tM)));
        c = mix(c, uClLit, nearK);
        acc += T * a * c; T *= 1.0 - a;
        if (T < 0.015) { T = 0.0; break; }   // (opaque: nothing behind it prints through)
      }
    }
    sP = s; sBP = sB; tP = t; gP = v.g; bP = v.b; dP = clamp(-s / bE, 0.0, 1.0) * fz; fP = fz;
    t = min(t + dt, tf);   // (a step past the ray's end stops at it, so the last segment is never dropped)
  }
  if (T > 0.996) discard;
  float al = 1.0 - T;
  // the land's own aerial perspective (atmos, the curve the hills take) at the body's real range (a quarter of the way
  // through it: where its light mostly comes from), and never darker than the land would be at that same range: its
  // colour floored at the land's own paint (the dunes' sand, its shade and lit paint halved: dunes-glsl's SAND_SHADE
  // and SAND_LIT, uP[2] and uP[0], as the sky paints them) taken through the same haze along the level ray (the land
  // lies at the horizon, under the bank). So a far bank is never a dark shape in front of the hazed hills behind it,
  // and ends at the stream's edge already near the land's hazed colour (the hub's ruling on #240, round 2). Light
  // added to the cloud's own, a floor, never a darkening: nothing here reads the words
  float tB = tn + (tf - tn) * 0.25;
  vec3 c0 = acc / al, fl = atmos(0.5 * (uP[2].rgb + uP[0].rgb), normalize(vec3(rd.x, min(rd.y, 0.0), rd.z)), tB);
  vec3 col = max(atmos(c0, rd, tB), fl);
  // a far body keeps its own colour (atmos above has taken it into the haze by its distance) and stays opaque
  // until the last quarter of its distance's weight (uVR2.y: 1 near, 0 at the cells' reach), then fades by its opacity
  // into the sky the sky pass drew behind it: faded by its opacity over the whole weight, a far bank let the stars and
  // the night's sky through (cloud-far-banks-opaque, 2026-11-14); its colour mixed toward a haze colour instead drew a
  // flat silhouette off the sky (the hub's review: hazeCol is not the sky behind it, whose glow and veil the sky pass
  // adds). Its opacity, not its extinction, takes that last quarter: scaled so, a thick tower is a third opaque at 2% of
  // its weight (a pop-in)
  oC = vec4(col * al, al) * smoothstep(0.0, 0.25, uVR2.y);
  if (oC.a < 0.0005) discard;
}