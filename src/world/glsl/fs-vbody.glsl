
uniform sampler3D uVol; uniform sampler2D uLinD; uniform vec3 uVC, uVH; uniform vec2 uVY;   // centre, half size, yaw (cos, sin)
uniform vec4 uVR;   // extinction (1/m), most steps, the fine billows' scale (m), their depth (m)
uniform vec4 uVS;   // the stored distance's range (m), the soft band (m), the ceiling a forming cloud rises under (world y), a passage cloud's near reach (m)
uniform vec3 uKey;  // the key the clouds' light depths are baked along (their phase, rim and wrap read it too: one light in a cloud)
uniform vec4 uVR2;  // how far the billows reach out of the smooth form (m), its fade (0 .. 1), the camera inside it (1), its flat base (world y; -1e5 none)
in vec3 vW; out vec4 oC;
void main() {
  vec3 rd = normalize(vW - uCam), d0 = uCam - uVC;
  vec3 ro = vec3(uVY.x * d0.x - uVY.y * d0.z, d0.y, uVY.y * d0.x + uVY.x * d0.z), rl = vec3(uVY.x * rd.x - uVY.y * rd.z, rd.y, uVY.y * rd.x + uVY.x * rd.z);
  vec3 inv = 1.0 / rl, ta = (-uVH - ro) * inv, tb = (uVH - ro) * inv, t0 = min(ta, tb), t1 = max(ta, tb);
  float tn = max(max(max(t0.x, t0.y), t0.z), 0.0), tf = min(min(t1.x, t1.y), t1.z);
  float zs = linFetch(uLinD, ivec2(gl_FragCoord.xy)) / max(dot(rd, uCamF), 1e-3);
  tf = min(tf, zs);
  if (tf <= tn) discard;
  float cs = dot(rd, uKey), g = uClK.z;
  float P0 = mix(hgN(cs, g), hgN(cs, -0.25), 0.22), P1 = hgN(cs, g * 0.6), P2 = hgN(cs, g * 0.36);
  float vox = max(uVH.x, max(uVH.y, uVH.z)) / 26.0, band = uVS.y, amp = uVR.w;
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
  //   land, or the box's far side) within its budget (24-48 steps; 40% of that in a passage): a ray cut where its
  //   budget runs out, the rest left clear, shows the sea through a cloud's wispy flank, in holes that open and shut
  //   as the samples move (leaps are never stretched: a leap is bounded by the distance to the cloud);
  // - the fine billows' noise at an explicit LOD: its texel (32 to a tile) no finer than two of the half-resolution
  //   pixel's footprints at the sample, nor than half the band's step there (inside this loop the implicit LOD's
  //   derivatives are undefined, and each GPU picks its own mip pixel by pixel; billows finer than the march's own
  //   pixel or step are sampled as aliases that crawl and blink at the cloud's edges);
  // - the band at least 2 half-resolution pixels soft at the sample (an edge sharper than its pixel crawls on the
  //   half-resolution grid).
  // The same samples and texture reads as plain point sampling; a few more instructions a step.
  float t = tn, pxA = 2.0 * uProj.y / uRes.y;   // (pxA: a half-resolution pixel's angle; its footprint is t x pxA)
  vec3 acc = vec3(0.0); float T = 1.0, taken = 0.0;
  vec3 sunL = vec3(uVY.x * uKey.x - uVY.y * uKey.z, uKey.y, uVY.y * uKey.x + uVY.x * uKey.z), nrm = vec3(0.0, 1.0, 0.0);
  float wrapL = 1.0, facing = 1.0; bool hit = false;
  // the last sample (a band sample or a leap's start): its distance to the cloud, place, light depths, own density and fade (tP < 0: none yet)
  float sP = 0.0, tP = -1.0, gP = 0.0, bP = 0.0, dP = 0.0, fP = 1.0; bool last = false;
  for (int i = 0; i < 64; i++) {
    if (t > tf || last || float(i) >= uVR.y) break;
    if (t >= tf) { t = tf; last = true; }   // (the ray's end is a sample, so its last segment is counted)
    taken += 1.0;
    float mS = (tf - t) / max(uVR.y - taken + 1.0, 1.0);   // (the shortest step that still reaches the ray's end)
    vec3 p = ro + rl * t;
    vec4 v = texture(uVol, p / (2.0 * uVH) + 0.5);
    float dE = max(dEdge, t * 0.012);
    float yb = uVR2.w - p.y - uVC.y;   // under the body's flat base: outside it
    float s = max(max((0.5 - v.r) * uVS.x, p.y + uVC.y - uVS.z), yb);
    float sl = max(max((0.5 - v.a) * uVS.x * 2.0 - uVR2.x, p.y + uVC.y - uVS.z), yb) - amp;
    if (sl > band || s > band + amp) {   // a leap: its start kept as the next segment's front (above)
      vec3 fqL = (uVH - abs(p)) / uVH; float fzL = smoothstep(0.0, 0.07, min(min(fqL.x, fqL.y), fqL.z));
      if (uVS.w > 0.0) fzL *= smoothstep(uVS.w * 0.2, uVS.w, t);
      sP = s; tP = t; gP = v.g; bP = v.b; dP = 0.0; fP = fzL;
      t += sl > band ? max(sl * 0.9, dE) : max((s - amp) * 0.6, dE); continue;
    }
    if (!hit) {
      hit = true;
      vec3 uv0 = p / (2.0 * uVH) + 0.5, e = 1.2 / vec3(textureSize(uVol, 0)); vec2 kk = vec2(1.0, -1.0);
      vec3 gg = kk.xyy * texture(uVol, uv0 + kk.xyy * e).r + kk.yyx * texture(uVol, uv0 + kk.yyx * e).r + kk.yxy * texture(uVol, uv0 + kk.yxy * e).r + kk.xxx * texture(uVol, uv0 + kk.xxx * e).r;
      nrm = normalize(-gg / (2.0 * uVH) + vec3(0.0, 1e-6, 0.0));
      wrapL = clamp((dot(nrm, sunL) + 0.35) / 1.35, 0.0, 1.0); facing = 0.5 + 0.5 * nrm.y;
    }
    float dn = textureLod(uN3, (p + uVC) / uVR.z + AIR_DRIFT(uT), clamp(log2(max(max(2.0 * t * pxA, 0.5 * dE) * 32.0 / uVR.z, 1e-4)), 0.0, 5.0)).g;
    s -= (dn - 0.5) * amp * 2.0;
    float dt = max(s > 0.0 ? max(dE, s * 0.5) : (s > -band ? dE : max(dIn, dE)), mS);
    // (no face of the box can draw an edge: the density thins over its outer few per cent)
    vec3 fq = (uVH - abs(p)) / uVH; float fz = smoothstep(0.0, 0.07, min(min(fq.x, fq.y), fq.z));
    if (uVS.w > 0.0) fz *= smoothstep(uVS.w * 0.2, uVS.w, t);
    float bE = max(band, 2.0 * t * pxA);
    if (tP >= 0.0) {
      // the segment from the last band sample to this one: the band's ramp clamp(-s / bE, 0, 1) integrated with s linear
      float ds = s - sP, G0 = sP >= 0.0 ? 0.0 : (sP > -bE ? sP * sP / (2.0 * bE) : -sP - 0.5 * bE), G1 = s >= 0.0 ? 0.0 : (s > -bE ? s * s / (2.0 * bE) : -s - 0.5 * bE);
      float d = (abs(ds) < 1e-3 * bE ? clamp(-0.5 * (sP + s) / bE, 0.0, 1.0) : (G0 - G1) / ds) * 0.5 * (fP + fz);
      float a = 1.0 - exp(-d * uVR.x * (t - tP));
      if (a > 0.0005) {   // (lit at the segment's front, the last sample)
        float tl = gP * 24.0, sky = exp(-bP * 12.0 * 0.85);
        float ms = exp(-tl) * P0 + 0.5 * exp(-tl * 0.45) * P1 + 0.25 * exp(-tl * 0.2) * P2;
        vec3 amb = mix(uClDeep, uClShade, sky * (0.7 + 0.3 * facing));
        amb = mix(amb, uClLit * 0.9, 0.38 * facing * facing * sky);
        float fk = 0.7 * (1.0 - smoothstep(0.35, 0.92, cs) * exp(-tl * 0.5));
        vec3 c = mix(amb, uClLit, (1.0 - exp(-ms * uClK2.y)) * (0.5 + 0.5 * sky) * mix(1.0, wrapL, fk)) + uClRim * exp(-tl * 1.5) * max(P0 - 1.2, 0.0) * 0.045 * uClK.w * (1.0 - dP);
        // near the eye, a cloud the camera is in (or a passage's) is its own lit mist: never a dark wall
        float nearK = max(uVS.w > 0.0 ? 0.55 * (1.0 - smoothstep(uVS.w * 0.3, uVS.w * 1.8, tP)) : 0.0, uVR2.z * 0.6 * (1.0 - smoothstep(30.0, 260.0, tP)));
        c = mix(c, uClLit, nearK);
        acc += T * a * c; T *= 1.0 - a;
        if (T < 0.015) { T = 0.0; break; }   // (opaque: nothing behind it prints through)
      }
    }
    sP = s; tP = t; gP = v.g; bP = v.b; dP = clamp(-s / bE, 0.0, 1.0) * fz; fP = fz;
    t = min(t + dt, tf);   // (a step past the ray's end stops at it, so the last segment is never dropped)
  }
  if (T > 0.996) discard;
  float al = 1.0 - T;
  vec3 col = atmos(acc / al, rd, tn + (tf - tn) * 0.25);
  // a body coming in out of the haze fades by its opacity (uVR2.y, 0 .. 1 over 2.5 s from its bake), not its
  // extinction: scaled so, a thick tower is a third opaque at 2% of its fade (a pop-in)
  oC = vec4(col * al, al) * uVR2.y;
  if (oC.a < 0.0005) discard;
}