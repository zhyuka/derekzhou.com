
layout(location = 0) in vec4 aV;   // body space (x across, y up, z forward); w: the kind's weight (birds: 0 body, 1 wrist, 2 tip; rays: -1 - the span's share; moths: 1 fore wing, 2 hind wing; jellies: 1 + along a thread; caps: 1 bead, 2 underside)
uniform vec4 uFa, uFb, uFc;        // the flock: centre at u0 (x, y, z), u0; its drift (x, z per s), the orbit's radius, kind; wheel (rad/s), size (m), flap or pulse (Hz), height spread (m)
uniform vec4 uFd, uFe;             // a bob (m), its rate (rad/s), the layout (0 orbit, 1 helix, 2 still), -; the helix's radius (m), its step (rad), its rise a step (m), its turn (rad/s)
centroid out vec3 vW; centroid out vec3 vN; centroid out float vLit; centroid out float vGlow;
void main() {
  int i = gl_InstanceID; int kind = int(uFb.w + 0.5);
  uint h = ih(uint(i) * 2654435761u + uint(abs(uFa.w) * 13.0) + 77u);
  float r1 = hf(h), r2 = hf(ih(h + 1u)), r3 = hf(ih(h + 2u)), r4 = hf(ih(h + 3u)), r5 = hf(ih(h + 4u));
  float u = uT - 40.0 - uFa.w;
  vec3 ctr = uFa.xyz + vec3(uFb.x, 0.0, uFb.y) * u;
  float om = uFc.x * (0.8 + 0.4 * r1) * (r5 < 0.5 ? 1.0 : 0.92), rho = uFb.z * (0.3 + 0.7 * sqrt(r2)), th = r3 * 6.2831853 + om * u;
  float yy = uFc.w * (r4 - 0.5) + 0.12 * uFc.w * sin(u * 0.6 + r1 * 6.28);
  vec3 pos = ctr + vec3(rho * cos(th), yy, rho * sin(th));
  vec3 vel = vec3(uFb.x, 0.0, uFb.y) + rho * om * vec3(-sin(th), 0.0, cos(th)) + vec3(0.0, 0.07 * uFc.w * cos(u * 0.6 + r1 * 6.28), 0.0);
  if (uFd.z > 0.5) {
    if (uFd.z < 1.5) { float a = float(i) * uFe.y + uFe.w * u; pos = ctr + vec3(uFe.x * cos(a), float(i) * uFe.z, uFe.x * sin(a)); }
    else { float a = r3 * 6.2831853; pos = ctr + vec3(rho * cos(a), uFc.w * (r4 - 0.5), rho * sin(a)); }
    vel = vec3(uFb.x, 0.0, uFb.y) + vec3(1e-3, 0.0, 0.0);
  }
  if (uFd.x > 0.0) { pos.y += uFd.x * sin(u * uFd.y * (0.85 + 0.3 * r2) + r1 * 6.2831853); vel.y += uFd.x * uFd.y * cos(u * uFd.y + r1 * 6.2831853); }
  vec3 v = aV.xyz * uFc.y;
  vGlow = 0.0; vLit = r1;
  if (kind >= 4) {   // jellies and caps: upright, turning slowly about their own axis
    float yaw = r3 * 6.2831853 + u * (kind == 5 ? 0.06 : 0.1) * (r5 < 0.5 ? 1.0 : -1.0), cy = cos(yaw), sy = sin(yaw);
    vec3 nl;
    if (kind == 4) {
      float ph = fract(uFc.z * u + r4), p = smoothstep(0.0, 0.25, ph) * (1.0 - smoothstep(0.35, 1.0, ph));   // (the bell's pulse: quick in, slow out)
      pos.y += 0.35 * uFc.y * sin(6.2831853 * (uFc.z * u + r4) - 0.6);
      if (aV.w < 0.5) { v.xz *= 1.0 - 0.2 * p; v.y *= 1.0 - 0.15 * p; vGlow = 1.0; nl = normalize(aV.xyz * vec3(1.0, 1.5, 1.0) + vec3(0.0, 0.25, 0.0)); }
      else { float k = aV.w - 1.0; v.xz += 0.18 * uFc.y * k * vec2(sin(6.2831853 * uFc.z * u - k * 2.5 + r1 * 6.0), cos(6.2831853 * uFc.z * u * 0.8 - k * 2.0 + r2 * 6.0)); v.y *= 1.0 + 0.12 * p; vGlow = 0.6 * (1.0 - 0.5 * k); nl = vec3(0.0, 1.0, 0.0); }
    } else {
      vGlow = aV.w > 1.5 ? 0.6 : (aV.w > 0.5 ? 1.0 : 0.12);
      vGlow *= 1.0 + 0.1 * sin(u * (1.3 + 0.4 * r2) + r1 * 6.28);
      nl = aV.w > 1.5 ? vec3(0.0, -1.0, 0.0) : normalize(aV.xyz * vec3(1.0, 2.2, 1.0) + vec3(0.0, 0.2, 0.0));
    }
    vW = pos + vec3(cy * v.x + sy * v.z, v.y, -sy * v.x + cy * v.z);
    vN = vec3(cy * nl.x + sy * nl.z, nl.y, -sy * nl.x + cy * nl.z);
    gl_Position = uVP * vec4(vW - uCam, 1.0);
    return;
  }
  vec3 fw = normalize(vel + vec3(1e-4, 0.0, 0.0)), rt = normalize(cross(vec3(0.0, 1.0, 0.0), fw)), up = cross(fw, rt);
  float bank = clamp(-om * 0.45, -0.6, 0.6);
  vec3 rt2 = rt * cos(bank) + up * sin(bank), up2 = up * cos(bank) - rt * sin(bank);
  if (kind == 3) {
    // a moth: a flutter in bursts (the wings swing up to about 70 degrees over the back and down again), the hind
    // wings a little behind the fore; between bursts a short glide, the wings held up
    float burst = smoothstep(0.3, 0.55, gn(vec2(u * 0.6 + r1 * 19.0, r2 * 7.0)) + 0.5);
    float s0 = sin(6.2831853 * uFc.z * (0.9 + 0.2 * r4) * u + r5 * 6.28 - (aV.w > 1.5 ? 0.6 : 0.0));
    float a = mix(0.55, 0.45 + 0.75 * s0, burst), x = abs(v.x);
    v = vec3(sign(v.x) * x * cos(a), v.y + x * sin(a), v.z);
    vGlow = 1.0;
  } else if (aV.w >= 0.0) {
    // the beat: bursts of beating, then glides with the wings held a little up
    float burst = smoothstep(0.35, 0.6, gn(vec2(u * 0.35 + r1 * 19.0, r2 * 7.0)) + 0.5);
    float fl = mix(0.18, 0.75 * sin(6.2831853 * uFc.z * (0.9 + 0.2 * r4) * u + r5 * 6.28) + 0.05, burst);
    float a = fl * (aV.w > 1.5 ? 1.45 : 1.0) * min(aV.w, 1.0) + (aV.w > 1.5 ? 0.25 * fl : 0.0);
    float x = abs(v.x); v = vec3(sign(v.x) * x * cos(a), v.y + x * sin(a), v.z);
  } else {
    float sp = -aV.w - 1.0;
    v.y += uFc.y * 0.12 * sp * sin(6.2831853 * uFc.z * u - aV.z * 3.0 + r1 * 6.28);
  }
  vW = pos + rt2 * v.x + up2 * v.y + fw * v.z;
  vN = up2;
  gl_Position = uVP * vec4(vW - uCam, 1.0);
}