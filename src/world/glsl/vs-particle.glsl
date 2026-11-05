
uniform float uPxK;   // (E1.1, as VS_SCATTER's)
layout(location = 0) in vec2 aQ;   // x: 0 tail .. 1 head, y: -1 .. 1 across
uniform vec4 uPa;    // box (m), height range (m), streak (s), size (px)
uniform vec3 uWind;  // m/s
uniform vec4 uPc;    // colour (rgb), opacity
uniform vec4 uPb;    // hop amplitude (m), hop rate, lift (m), kind
uniform vec4 uPd;    // rain: fall (m/s), the splash's life (s), gusts (0 .. 1), -; drifting: rise (m/s; < 0 sinks), life (s), wander (m/s), tumble or flicker (Hz)
uniform vec4 uPe;    // a second colour (rgb), its share
uniform vec4 uPf;    // a third colour (rgb), its share
uniform vec4 uPg;    // blink (the share of a cycle lit; 0: none), flicker (0 .. 1), the share drawn (0 .. 1: the rain's amount, an area's), -
uniform mat4 uPVP2; uniform vec3 uPCam2; uniform float uMB;   // (E1 Fix 3) the last frame's view and camera; the share of its motion a mote is drawn along (0: none)
out vec4 vCol; out vec2 vQ; flat out float vKind;
vec3 grain(int id, float t, out float edge) {
  uint h = ih(uint(id) * 2654435761u + 977u);
  float r1 = hf(h), r2 = hf(ih(h + 1u)), r3 = hf(ih(h + 2u)), r4 = hf(ih(h + 3u));
  vec3 vel = uWind * (0.65 + 0.7 * r1);
  vec2 p0 = vec2(r2, r3) * uPa.x;
  vec2 pos = p0 + vel.xz * t + vec2(gn(vec2(t * 0.3 + r4 * 10.0, r1 * 7.0)), gn(vec2(r2 * 9.0, t * 0.3))) * 3.0;
  vec2 rel = mod(pos - uCam.xz + 0.5 * uPa.x, uPa.x) - 0.5 * uPa.x;
  edge = 1.0 - smoothstep(0.36 * uPa.x, 0.5 * uPa.x, max(abs(rel.x), abs(rel.y)));
  vec2 xz = uCam.xz + rel;
  float hop = uPb.x * abs(sin(t * uPb.y * (0.7 + 0.6 * r4) + r1 * 6.28));
  float y = (uPb.w > 1.5 ? uCam.y - uPa.y * 0.5 : groundH(xz)) + uPb.z + uPa.y * r4 * r4 + hop + (uPb.w > 0.5 ? 1.5 * sin(t * 0.4 + r3 * 6.28) : 0.0);
  return vec3(xz.x, y, xz.y);
}
void hide() { gl_Position = vec4(0.0, 0.0, -2.0, 1.0); vCol = vec4(0.0); }
#ifndef NO_PKWX
void rain(int id) {
  // a drop: wrapped in a box about the camera (across) and in a column about its height; its streak the way it falls;
  // under the ground, it has landed: a splash there for its first moments, then nothing until it wraps round
  uint h = ih(uint(id) * 2654435761u + 4111u);
  float r1 = hf(h), r2 = hf(ih(h + 1u)), r3 = hf(ih(h + 2u)), r4 = hf(ih(h + 3u)), t = uT;
  float gust = 1.0 + uPd.z * 0.5 * smoothstep(0.55, 0.9, gn(vec2(t * 0.045, 3.7)) + 0.5);
  if (r4 > uPg.z * gust * 0.67) { hide(); return; }
  vec3 vel = vec3(uWind.x, -uPd.x * (0.9 + 0.2 * r1), uWind.z);
  vec2 rel = mod(vec2(r2, r3) * uPa.x + vel.xz * t - uCam.xz + 0.5 * uPa.x, uPa.x) - 0.5 * uPa.x;
  vec2 xz = uCam.xz + rel;
  float H = uPa.y, y = uCam.y + H * 0.5 - mod(-vel.y * t + r1 * H, H), g = groundH(xz);
  float edge = 1.0 - smoothstep(0.36 * uPa.x, 0.5 * uPa.x, max(abs(rel.x), abs(rel.y)));
  vec3 head = vec3(xz.x, y, xz.y), tail = head - vel * uPa.z;
  float since = (g - y) / max(-vel.y, 0.1);   // (s since it reached the ground; < 0 still falling)
  vKind = 3.0;
  if (since > 0.0) {   // its splash: a small ring of spray on the ground, for its first moments
    if (since > uPd.y) { hide(); return; }
    float k = since / uPd.y; head = vec3(xz.x, g + 0.02, xz.y); vKind = 3.5;
    vec4 c = uVP * vec4(head - uCam, 1.0); if (c.w < 0.5) { hide(); return; }
    float dist = length(head - uCam), w = max(uPa.w * 3.0 * (0.4 + 0.8 * k) * 18.0 / dist, 1.2 * uPxK);
    gl_Position = vec4(c.xy + vec2(aQ.x * 2.0 - 1.0, aQ.y) * w / uRes * 2.0 * c.w, c.z, c.w);
    vec3 rd = (head - uCam) / dist;
    vCol = vec4(atmos(uPc.rgb, rd, dist), uPc.a * 1.6 * (1.0 - k) * edge * (1.0 - smoothstep(25.0, 45.0, dist)));
    vQ = aQ; return;
  }
  vec4 ch = uVP * vec4(head - uCam, 1.0), ct = uVP * vec4(tail - uCam, 1.0);
  if (ch.w < 0.5 || ct.w < 0.5) { hide(); return; }
  vec2 sh = ch.xy / ch.w * uRes * 0.5, st = ct.xy / ct.w * uRes * 0.5, d = sh - st;
  float L = length(d); vec2 dir = L > 1e-3 ? d / L : vec2(0.0, 1.0), nrm = vec2(-dir.y, dir.x);
  float dist = length(head - uCam), w = max(uPa.w * 0.03 * 18.0 / dist * 20.0, uPa.w * uPxK);
  vec4 c = mix(ct, ch, aQ.x);
  vec2 px = c.xy / c.w * uRes * 0.5 + nrm * aQ.y * w * 0.5 + dir * (aQ.x - 0.5) * 1.5;
  gl_Position = vec4(px / (uRes * 0.5) * c.w, c.z, c.w);
  vec3 rd = (head - uCam) / dist;
  vCol = vec4(atmos(uPc.rgb, rd, dist), uPc.a * edge * smoothstep(1.0, 3.0, dist) * (1.0 - smoothstep(30.0, 48.0, dist)) * (0.75 + 0.5 * r2));
  vQ = aQ;
}
void drifter(int id) {
  // a petal, a seed, an ember, a spore, a firefly: carried by the wind and its own rise, wandering, tumbling (its
  // light twinkling as it turns) or flickering, living its own life (faded in and out), wrapped in the box
  uint h = ih(uint(id) * 2654435761u + 7919u);
  float r1 = hf(h), r2 = hf(ih(h + 1u)), r3 = hf(ih(h + 2u)), r4 = hf(ih(h + 3u)), r5 = hf(ih(h + 4u)), r6 = hf(ih(h + 5u)), t = uT;
  if (r6 > uPg.z) { hide(); return; }
  float life = uPd.y * (0.7 + 0.6 * r5), age = mod(t + r1 * life, life), born = floor((t + r1 * life) / life);
  uint h2 = ih(h + uint(born) * 31u); float q1 = hf(h2), q2 = hf(ih(h2 + 1u)), q3 = hf(ih(h2 + 2u));
  vec3 vel = uWind * (0.7 + 0.6 * r2) + vec3(0.0, uPd.x * (0.6 + 0.8 * r3), 0.0);
  vec3 wan = uPd.z * vec3(gn(vec2(t * 0.25 + q1 * 9.0, r4 * 5.0)), 0.5 * gn(vec2(t * 0.2 + q2 * 7.0, r3 * 3.0)), gn(vec2(r2 * 6.0, t * 0.25 + q3 * 11.0))) * 4.0;
  vec2 rel = mod(vec2(q1, q2) * uPa.x + vel.xz * age + wan.xz - uCam.xz + 0.5 * uPa.x, uPa.x) - 0.5 * uPa.x;
  vec2 xz = uCam.xz + rel;
  float edge = 1.0 - smoothstep(0.36 * uPa.x, 0.5 * uPa.x, max(abs(rel.x), abs(rel.y)));
  float base = uPb.w > 4.5 ? uCam.y - uPa.y * 0.5 : groundH(xz) + uPb.z;
  float y = base + mod(q3 * uPa.y + vel.y * age + wan.y, uPa.y);
  vec3 p = vec3(xz.x, y, xz.y);
  vec4 c = uVP * vec4(p - uCam, 1.0);
  if (c.w < 0.5) { hide(); return; }
  float dist = length(p - uCam), w = max(uPa.w * 18.0 / dist, 1.3 * uPxK);
  gl_Position = vec4(c.xy + vec2(aQ.x * 2.0 - 1.0, aQ.y) * w / uRes * c.w, c.z, c.w);
  float sel = hf(ih(h + 9u)); vec3 col = sel < uPe.w ? uPe.rgb : (sel < uPe.w + uPf.w ? uPf.rgb : uPc.rgb);
  float lf = sin(3.14159265 * age / life);
  float tw = uPd.w > 0.0 ? 0.55 + 0.45 * sin(6.2831853 * uPd.w * (0.8 + 0.4 * r4) * t + r5 * 6.28) : 1.0;
  if (uPg.y > 0.0) tw *= 1.0 + uPg.y * 1.4 * gn(vec2(t * 7.0 + r1 * 13.0, r2 * 5.0));
  if (uPg.x > 0.0) { float cy = fract(t * 0.4 * (0.7 + 0.6 * r3) + r4); tw *= smoothstep(0.0, 0.05, cy) * (1.0 - smoothstep(max(uPg.x - 0.05, 0.0), uPg.x, cy)); }
  vec3 rd = (p - uCam) / dist;
  float fwd = pow(max(dot(rd, uSun), 0.0), 5.0) * uSunVis;
  vCol = vec4(atmos(col * (1.0 + 1.5 * fwd), rd, dist), uPc.a * max(tw, 0.0) * lf * edge * smoothstep(0.8, 3.0, dist) * (1.0 - smoothstep(uPa.x * 0.45, uPa.x * 0.6, dist)));
  vKind = 4.0; vQ = aQ;
}
#endif
void main() {
#ifndef NO_PKWX
  if (uPb.w > 2.5 && uPb.w < 3.5) { rain(gl_InstanceID); return; }
  if (uPb.w > 3.5) { drifter(gl_InstanceID); return; }
#endif
  float edge, e2; int id = gl_InstanceID;
  vec3 head = grain(id, uT, edge), tail = uPb.w > 0.5 ? head : grain(id, uT - uPa.z, e2);
  vec4 ch = uVP * vec4(head - uCam, 1.0), ct = uVP * vec4(tail - uCam, 1.0);
  vKind = uPb.w;
  if (ch.w < 0.5 || ct.w < 0.5 || length(head - tail) > uPa.x * 0.25) { gl_Position = vec4(0.0, 0.0, -2.0, 1.0); vCol = vec4(0.0); vQ = aQ; return; }
  /* (round E1 Fix 3, G0) a mote drawn along its own motion on the window since the last frame (where it was then, seen
     from where the camera was), its light spread over that stretch: a near mote crossed the window by several pixels a
     frame as a 1.6 px dot, so each pixel it passed was lit for one frame and dark the next (the cloud-edge film's
     blinks, 1.2-2.0 a frame against the 4x reference's 0); a moving point of light is a short streak to the eye, with
     the same light in all */
  if (uPb.w > 0.5 && uMB > 0.0) {
    vec4 cp = uPVP2 * vec4(head - uPCam2, 1.0);
    if (cp.w > 0.5) ct = vec4(mix(ch.xy / ch.w, cp.xy / cp.w, uMB) * ch.w, ch.z, ch.w);
  }
  vec2 sh = ch.xy / ch.w * uRes * 0.5, st = ct.xy / ct.w * uRes * 0.5, d = sh - st;
  float L = length(d); vec2 dir = L > 1e-3 ? d / L : vec2(1.0, 0.0), nrm = vec2(-dir.y, dir.x);
  float dist = length(head - uCam), wt = uPa.w * 18.0 / dist, wo = max(wt, (uPb.w > 0.5 ? 1.6 : 0.8) * uPxK), w = max(wt, 1.6 * uPxK);   // (E1.1: the floors in the display's pixels, uPxK)   // (hotfix G0: never under 1.6 px wide (round 3b: 0.8); wo, the old width, keeps the light below)
  vec4 c = mix(ct, ch, aQ.x);
  vec2 px = c.xy / c.w * uRes * 0.5 + nrm * aQ.y * w * 0.5 + dir * (aQ.x - 0.5) * w;
  gl_Position = vec4(px / (uRes * 0.5) * c.w, c.z, c.w);
  vec3 rd = normalize(head - uCam), col;
  uint h = ih(uint(id) * 2654435761u + 31337u); float r1 = hf(h), r2 = hf(ih(h + 5u)), a;
  if (uPb.w < 0.5) {
    // (hotfix G0) no glint: a grain's facet spun through the sun at pow 60, a flash a turn (sparkle by design). Each
    // grain that glinted is lit steadily at its flash's mean over the turn: the facet's normal on a cone about the
    // vertical (cos 0.768, sin 0.640), so dot(n, h) = A + B cos(turn), and the mean of its 60th power over a turn is
    // (A + B)^60 sqrt((A + B) / (2 pi 60 B)) (Laplace; never more than the peak): the same light on average, no flash
    vec3 hg = normalize(uSun - rd); float gA = 0.7682 * hg.y, gB = 0.6402 * length(hg.xz), gm = max(gA + gB, 0.0);
    float gli = step(0.55, r2) * pow(gm, 60.0) * min(1.0, sqrt(gm / (376.99 * max(gB, 1e-3))));
    col = uPc.rgb * 0.5 + uSunC * gli * 4.0;
    a = uPc.a * (0.3 + 0.7 * min(gli * 4.0, 1.0));
  } else {
    float fwd = pow(max(dot(rd, uSun), 0.0), 5.0);
    col = uPc.rgb * (0.3 + 2.6 * fwd);
    a = uPc.a * (0.35 + 0.65 * fwd);
  }
  a *= edge * smoothstep(1.0, 4.0, dist) * (1.0 - smoothstep(60.0, 140.0, dist)) * clamp(wo / (1.2 * uPxK), 0.3, 1.0) * (wo * (L + wo)) / (w * (L + w));   // (hotfix G0: the light the old quad carried, spread over the wider one: the same in all)
  if (uPb.w > 0.5) a *= w / (L + w);   // (E1 Fix 3: a mote's light spread over its motion's stretch, L: the same in all)
  vCol = vec4(atmos(col, rd, dist), a); vQ = aQ;
}