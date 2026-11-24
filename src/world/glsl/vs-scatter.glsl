
uniform float uPxK;   // this window's pixels a pixel of the display's world (1; 4 in the 4x supersampled reference): every pixel-size floor and fade is in the display's pixels, so a supersampled frame is the same scene drawn finer
layout(location = 0) in vec3 aP; layout(location = 1) in vec3 aN; layout(location = 2) in vec4 aC; layout(location = 3) in float aY; layout(location = 4) in float aE;
uniform vec4 uSc;    // cell size, cells across, density, salt
uniform vec4 uSc2;   // scale min, max, sink (fraction of size), tilt (rad)
uniform vec4 uSc3;   // -, height stretch, -, -
centroid out vec3 vW; centroid out vec3 vN; centroid out vec4 vC; centroid out float vY; centroid out vec2 vE; centroid out float vMT;   // (delight-weather 1) the mist pools' top over the vertex
mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
mat3 rotZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }
void main() {
  int n = int(uSc.y), id = gl_InstanceID;
  ivec2 base = ivec2(floor(uCam.xz / uSc.x));
  ivec2 cell = base + ivec2(id % n, id / n) - ivec2(n / 2);
  uint h = ih(ih2(cell + ivec2(int(uSc.w) * 7919, int(uSc.w) * 104729)) ^ uSalt);
  float r1 = hf(h), r2 = hf(ih(h + 1u)), r3 = hf(ih(h + 2u)), r4 = hf(ih(h + 3u)), r5 = hf(ih(h + 4u)), r6 = hf(ih(h + 5u)), r7 = hf(ih(h + 6u));
  vec2 pos = (vec2(cell) + vec2(r1, r2)) * uSc.x;
  float dens = uSc.z * scatterDensity(pos, int(uSc.w));
  float keep = step(r3, dens);
  vec2 dd = abs(pos - uCam.xz) / (float(n) * 0.5 * uSc.x);
  float fade = 1.0 - smoothstep(0.72, 0.97, max(dd.x, dd.y));
  float gy = groundH(pos);
  // (never a stone under the camera's nose: near it and low under it, they shrink away)
  float near = mix(1.0, smoothstep(5.0, 13.0, length(pos - uCam.xz)), step(uCam.y - gy, 10.0));
  float s = mix(uSc2.x, uSc2.y, r4 * r4) * keep * fade * near;
  // a stone smaller on the window than about two pixels shrinks away: a pebble one or two pixels across, light in a
  // dune's shade, crawls and blinks across the pixels as the view moves (the still-view film's blinks, 2.8 a frame
  // against the 4x reference's 0.8 in Chromium), which four samples a pixel cannot hold
  float dz = max(dot(vec3(pos.x, gy, pos.y) - uCam, uCamF), 1.0), pxs = s * uRes.y / (dz * uProj.y);
  // (and one whose height on the window is under about two pixels: a flat pebble far off, seen low across the sand, is
  // a sliver a few pixels wide and one or two high that steps from row to row and blinks (the dunes film at t 120:
  // 1.56 blinks a frame against the reference's 0.44). Its height there: what stands above the sand (the mesh's half
  // height, 0.6 of its size, stretched, less what is sunk) and its top's depth seen from above (twice its size by the
  // sine of the view's angle down to it)
  float sinE = clamp((uCam.y - gy) / length(vec3(pos.x, gy, pos.y) - uCam), 0.0, 1.0);
  float pxv = pxs * (max(0.6 * mix(1.0, uSc3.y, r6) - uSc2.z, 0.12) + 2.0 * sinE);
  s *= smoothstep(1.0 * uPxK, 2.6 * uPxK, pxs) * smoothstep(1.2 * uPxK, 2.4 * uPxK, pxv);   // (the sizes in the display's pixels, uPxK)
  mat3 R = rotY(r5 * 6.2831853) * rotX((r6 - 0.5) * uSc2.w) * rotZ((r7 - 0.5) * uSc2.w);
  vec3 sc = vec3(1.0, mix(1.0, uSc3.y, r6), 1.0) * s;
  vec3 lp = R * (aP * sc);
  vW = vec3(pos.x, gy - uSc2.z * s, pos.y) + lp;
  vN = R * (aN / max(sc, vec3(1e-4)));
  vC = vec4(aC.rgb * 2.0, floor(aC.a * 255.0 + 0.5)); vY = lp.y - uSc2.z * s; vE = vec2(aE * 15.9375, r7); vMT = mistTopAt(vW.xz);
  gl_Position = s > 1e-4 ? uVP * vec4(eyeRel(vW), 1.0) : vec4(0.0, 0.0, -2.0, 1.0);
}