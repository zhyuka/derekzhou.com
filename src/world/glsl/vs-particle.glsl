
uniform float uPxK;   // (as VS_SCATTER's)
layout(location = 0) in vec2 aQ;   // x: 0 tail .. 1 head, y: -1 .. 1 across
uniform vec4 uPa;    // box (m), height range (m), streak (s), size (px)
uniform vec3 uWind;  // m/s
uniform vec4 uPc;    // colour (rgb), opacity
uniform vec4 uPb;    // hop amplitude (m), hop rate, lift (m), kind
uniform vec4 uPd;    // rain: fall (m/s), the splash's life (s), gusts (0 .. 1), -; drifting: rise (m/s; < 0 sinks), life (s), wander (m/s), tumble or flicker (Hz)
uniform vec4 uPe;    // a second colour (rgb), its share
uniform vec4 uPf;    // a third colour (rgb), its share
uniform vec4 uPg;    // blink (the share of a cycle lit; 0: none), flicker (0 .. 1), the share drawn (0 .. 1: the rain's amount, an area's), -
uniform mat4 uPVP2; uniform vec3 uPCam2; uniform float uMB, uMBdt; uniform vec4 uAir;   // the last frame's view and camera; the share of its motion a mote is drawn along (0: none); the time since the last frame (s, the shaders' clock)
/* (large world) the box's wrap worked in the JS's doubles, so no world-sized value meets fp32 here (86 km out, the
   camera and the wind's drift since the start rounded to 8 mm: the motes jittered): uPm the camera modulo the box (x,
   z) and the wind's drift at the air's clock (uAir.x) in boxes, its fraction (x, z); uPn that drift's whole boxes modulo 256 (x,
   z), the rain's fall since the start in columns, its fraction and its whole columns modulo 256; uPCamD this camera
   less the last frame's (m). Positions here are the eye's (eyeRel's): head, tail and prev */
uniform vec4 uPm, uPn; uniform vec3 uPCamD;
uniform float uAirU;   // the gust field's reference speed, the visit's U10 (as the veils')
/* a share k = q / 256 of a drift whose boxes are D = n + f (n modulo 256 and f, from the JS): k D modulo 1, exactly */
float kDrift(uint q, float n, float f) { return fract(float((q * uint(n)) & 255u) / 256.0 + float(q) / 256.0 * f); }
out vec4 vCol; out vec2 vQ; flat out float vKind;
vec3 grain(int id, float t, float tau, out float edge) {   // (tau: the air's clock, its integral over the day's speed: uAir)
  uint h = ih(uint(id) * 2654435761u + 977u);
  float r1 = hf(h), r2 = hf(ih(h + 1u)), r3 = hf(ih(h + 2u)), r4 = hf(ih(h + 3u));
  uint q = 166u + uint(r1 * 180.0); float k = float(q) / 256.0;   // (its share of the wind, 0.65-1.35, in 256ths: kDrift exact)
  vec2 p0 = vec2(r2, r3) * uPa.x, dr = uPa.x * vec2(kDrift(q, uPn.x, uPm.z), kDrift(q, uPn.y, uPm.w)) - k * uWind.xz * (uAir.x - tau);   // (the drift at the air's clock now, less its share since tau)
  vec2 pos = p0 + dr + vec2(gn(vec2(t * 0.3 + r4 * 10.0, r1 * 7.0)), gn(vec2(r2 * 9.0, t * 0.3))) * 3.0;
  vec2 rel = mod(pos - uPm.xy + 0.5 * uPa.x, uPa.x) - 0.5 * uPa.x;
  edge = 1.0 - smoothstep(0.36 * uPa.x, 0.5 * uPa.x, max(abs(rel.x), abs(rel.y)));
  vec2 xz = uCam.xz + rel;
  /* (physics: air/grain-hop) a grain's hop as high as the gust passing it makes it: the hop scales as the friction
     speed squared, so as (1 + e)^2, e the gust's excess over the wind there (the air's one field, on its clock tau: in
     the day's wind it is the gust's intensity x the gustiness x the field's unit noise, whatever the wind's size).
     Its drift stays the mean wind's (a closed form: nothing jumps); only the sand's grains (kind 0) */
  float e = uPb.w < 0.5 ? airGust(xz, normalize(uWind.xz), uAirU, uAir.z, tau) : 0.0;   // (W the gustiness alone: e is the excess over the wind)
  float hop = uPb.x * airHop(e) * abs(sin(t * uPb.y * (0.7 + 0.6 * r4) + r1 * 6.28));
  float y = (uPb.w > 1.5 ? -uPa.y * 0.5 : groundH(xz) - uCam.y) + uPb.z + uPa.y * r4 * r4 + hop + (uPb.w > 0.5 ? 1.5 * sin(t * 0.4 + r3 * 6.28) : 0.0);
  return vec3(rel.x, y - uCamL.y, rel.y);   // (the eye's)
}
void hide() { gl_Position = vec4(0.0, 0.0, -2.0, 1.0); vCol = vec4(0.0); }
#ifndef NO_PKWX
void rain(int id) {
  // a drop: wrapped in a box about the camera (across) and in a column about its height; its streak the way it falls;
  // under the ground, it has landed: a splash there for its first moments, then nothing until it wraps round
  uint h = ih(uint(id) * 2654435761u + 4111u);
  float r1 = hf(h), r2 = hf(ih(h + 1u)), r3 = hf(ih(h + 2u)), r4 = hf(ih(h + 3u));
  uint qf = 230u + uint(r1 * 51.0);   // (its fall, 0.9-1.1 of the rain's, in 256ths: kDrift exact)
  vec3 vel = vec3(uWind.x, -uPd.x * float(qf) / 256.0, uWind.z);
  vec2 rel = mod(vec2(r2, r3) * uPa.x + uPa.x * uPm.zw - uPm.xy + 0.5 * uPa.x, uPa.x) - 0.5 * uPa.x;
  vec2 xz = uCam.xz + rel;
  /* (physics: air/rain-gust) the rain's gusts are the air's one field: heavier in a band where a gust is passing, the
     band carried along the wind on the surface's clock (uAir.x), in the field's own sigmas (no private cycle of the
     screen's: the whole rain never pulses at once) */
  float gust = 1.0 + uPd.z * 0.5 * smoothstep(0.2, 1.2, airGust(xz, normalize(uWind.xz), uAirU, 1.0, uAir.x) / AIR_GUST_I);
  if (r4 > uPg.z * gust * 0.67) { hide(); return; }
  float H = uPa.y, y = H * 0.5 - H * fract(kDrift(qf, uPn.w, uPn.z) + r1) - uCamL.y, g = groundH(xz) - uCam.y - uCamL.y;   // (the eye's heights)
  float edge = 1.0 - smoothstep(0.36 * uPa.x, 0.5 * uPa.x, max(abs(rel.x), abs(rel.y)));
  vec3 head = vec3(rel.x, y, rel.y), tail = head - vel * uPa.z;
  float since = (g - y) / max(-vel.y, 0.1);   // (s since it reached the ground; < 0 still falling)
  vKind = 3.0;
  if (since > 0.0) {   // its splash: a small ring of spray on the ground, for its first moments
    if (since > uPd.y) { hide(); return; }
    float k = since / uPd.y; head = vec3(rel.x, g + 0.02, rel.y); vKind = 3.5;
    vec4 c = uVP * vec4(head, 1.0); if (c.w < 0.5) { hide(); return; }
    float dist = length(head), w = max(uPa.w * 3.0 * (0.4 + 0.8 * k) * 18.0 / dist, 1.2 * uPxK);
    gl_Position = vec4(c.xy + vec2(aQ.x * 2.0 - 1.0, aQ.y) * w / uRes * 2.0 * c.w, c.z, c.w);
    vec3 rd = head / dist;
    vCol = vec4(atmos(uPc.rgb, rd, dist), uPc.a * 1.6 * (1.0 - k) * edge * (1.0 - smoothstep(25.0, 45.0, dist)));
    vQ = aQ; return;
  }
  vec4 ch = uVP * vec4(head, 1.0), ct = uVP * vec4(tail, 1.0);
  if (ch.w < 0.5 || ct.w < 0.5) { hide(); return; }
  vec2 sh = ch.xy / ch.w * uRes * 0.5, st = ct.xy / ct.w * uRes * 0.5, d = sh - st;
  float L = length(d); vec2 dir = L > 1e-3 ? d / L : vec2(0.0, 1.0), nrm = vec2(-dir.y, dir.x);
  float dist = length(head), w = max(uPa.w * 0.03 * 18.0 / dist * 20.0, uPa.w * uPxK);
  vec4 c = mix(ct, ch, aQ.x);
  vec2 px = c.xy / c.w * uRes * 0.5 + nrm * aQ.y * w * 0.5 + dir * (aQ.x - 0.5) * 1.5;
  gl_Position = vec4(px / (uRes * 0.5) * c.w, c.z, c.w);
  vec3 rd = head / dist;
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
  vec2 rel = mod(vec2(q1, q2) * uPa.x + vel.xz * age + wan.xz - uPm.xy + 0.5 * uPa.x, uPa.x) - 0.5 * uPa.x;
  vec2 xz = uCam.xz + rel;
  float edge = 1.0 - smoothstep(0.36 * uPa.x, 0.5 * uPa.x, max(abs(rel.x), abs(rel.y)));
  float base = uPb.w > 4.5 ? uCam.y - uPa.y * 0.5 : groundH(xz) + uPb.z;
  float y = base + mod(q3 * uPa.y + vel.y * age + wan.y, uPa.y);
  vec3 p = vec3(rel.x, y - uCam.y - uCamL.y, rel.y);   // (the eye's)
  vec4 c = uVP * vec4(p, 1.0);
  if (c.w < 0.5) { hide(); return; }
  float dist = length(p), w = max(uPa.w * 18.0 / dist, 1.3 * uPxK);
  gl_Position = vec4(c.xy + vec2(aQ.x * 2.0 - 1.0, aQ.y) * w / uRes * c.w, c.z, c.w);
  float sel = hf(ih(h + 9u)); vec3 col = sel < uPe.w ? uPe.rgb : (sel < uPe.w + uPf.w ? uPf.rgb : uPc.rgb);
  float lf = sin(3.14159265 * age / life);
  float tw = uPd.w > 0.0 ? 0.55 + 0.45 * sin(6.2831853 * uPd.w * (0.8 + 0.4 * r4) * t + r5 * 6.28) : 1.0;
  if (uPg.y > 0.0) tw *= 1.0 + uPg.y * 1.4 * gn(vec2(t * 7.0 + r1 * 13.0, r2 * 5.0));
  if (uPg.x > 0.0) { float cy = fract(t * 0.4 * (0.7 + 0.6 * r3) + r4); tw *= smoothstep(0.0, 0.05, cy) * (1.0 - smoothstep(max(uPg.x - 0.05, 0.0), uPg.x, cy)); }
  vec3 rd = p / dist;
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
  vec3 head = grain(id, uT, uAir.x, edge), tail = uPb.w > 0.5 ? head : grain(id, uT - uPa.z, uAir.x - uAir.y * uPa.z, e2);
  vec4 ch = uVP * vec4(head, 1.0), ct = uVP * vec4(tail, 1.0);
  vKind = uPb.w;
  if (ch.w < 0.5 || ct.w < 0.5 || length(head - tail) > uPa.x * 0.25) { gl_Position = vec4(0.0, 0.0, -2.0, 1.0); vCol = vec4(0.0); vQ = aQ; return; }
  /* a mote drawn along its own motion on the window since the last frame (where it was then, seen from where the
     camera was), its light spread over that stretch: a near mote crosses the window by several pixels a frame, and
     as a 1.6 px dot each pixel it passes is lit for one frame and dark the next (the cloud-edge film's blinks,
     1.2-2.0 a frame against the 4x reference's 0); a moving point of light is a short streak to the eye, with the
     same light in all. Its whole motion: where the mote was a frame ago (its own wind carried it: up to 20 px a frame
     at 10 m on a windy visit), seen from where the camera was, not only the camera's motion (the hub's review of #266) */
  if (uPb.w > 0.5 && uMB > 0.0) {
    vec3 prev = grain(id, uT - uMBdt, uAir.w, e2); if (length(prev - head) > uPa.x * 0.25) prev = head;   // (a mote wrapped round its box in the frame: no streak across it)
    vec4 cp = uPVP2 * vec4(prev + uPCamD, 1.0);   // (seen from the last frame's camera: uPCamD the two cameras' difference, in the JS's doubles)
    if (cp.w > 0.5) ct = vec4(mix(ch.xy / ch.w, cp.xy / cp.w, uMB) * ch.w, ch.z, ch.w);
  }
  vec2 sh = ch.xy / ch.w * uRes * 0.5, st = ct.xy / ct.w * uRes * 0.5, d = sh - st;
  float L = length(d); vec2 dir = L > 1e-3 ? d / L : vec2(1.0, 0.0), nrm = vec2(-dir.y, dir.x);
  float dist = length(head), wt = uPa.w * 18.0 / dist, wo = max(wt, (uPb.w > 0.5 ? 1.6 : 0.8) * uPxK), w = max(wt, 1.6 * uPxK);   // (the floors in the display's pixels, uPxK)   // (never under 1.6 px wide; wo, the light's own width (1.6 px for the motes drawn along their motion, else 0.8), keeps the light below)
  vec4 c = mix(ct, ch, aQ.x);
  vec2 px = c.xy / c.w * uRes * 0.5 + nrm * aQ.y * w * 0.5 + dir * (aQ.x - 0.5) * w;
  gl_Position = vec4(px / (uRes * 0.5) * c.w, c.z, c.w);
  vec3 rd = normalize(head), col;
  uint h = ih(uint(id) * 2654435761u + 31337u); float r1 = hf(h), r2 = hf(ih(h + 5u)), a;
  if (uPb.w < 0.5) {
    // no glint: a grain's facet spun through the sun at pow 60, a flash a turn (sparkle by design). Each
    // grain that glinted is lit steadily at its flash's mean over the turn: the facet's normal on a cone about the
    // vertical (cos 0.768, sin 0.640), so dot(n, h) = A + B cos(turn), and the mean of its 60th power over a turn is
    // (A + B)^60 sqrt((A + B) / (2 pi 60 B)) (the saddle-point approximation; never more than the peak): the same light on average, no flash
    vec3 hg = normalize(uSun - rd); float gA = 0.7682 * hg.y, gB = 0.6402 * length(hg.xz), gm = max(gA + gB, 0.0);
    float gli = step(0.55, r2) * pow(gm, 60.0) * min(1.0, sqrt(gm / (376.99 * max(gB, 1e-3))));
    col = uPc.rgb * 0.5 + uSunC * gli * 4.0;
    a = uPc.a * (0.3 + 0.7 * min(gli * 4.0, 1.0));
  } else {
    float fwd = pow(max(dot(rd, uSun), 0.0), 5.0);
    col = uPc.rgb * (0.3 + 2.6 * fwd);
    a = uPc.a * (0.35 + 0.65 * fwd);
  }
  a *= edge * smoothstep(1.0, 4.0, dist) * (1.0 - smoothstep(60.0, 140.0, dist)) * clamp(wo / (1.2 * uPxK), 0.3, 1.0) * (wo * (L + wo)) / (w * (L + w));   // (the light a quad wo wide carries, spread over the wider one: the same in all)
  if (uPb.w > 0.5) a *= w / (L + w);   // (a mote's light spread over its motion's stretch, L: the same in all)
  vCol = vec4(atmos(col, rd, dist), a); vQ = aQ;
}