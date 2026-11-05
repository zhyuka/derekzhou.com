
uniform sampler2D uLinD; uniform vec2 uLinS;   // the half-resolution linear depth, its last texel
flat in vec4 vA, vB, vC, vD, vE; in vec3 vW; out vec4 oC;
void main() {
  vec3 rd = normalize(vW - uCam), ax = vB.xyz - vA.xyz; float L = max(length(ax), 1e-3); vec3 a = ax / L;
  vec3 u = normalize(cross(a, abs(a.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0))), w = cross(a, u);
  float R = max(vA.w, vB.w) * 2.2;
  // the ray in the beam's frame, through its box (along: 0 .. L, across: -R .. R)
  vec3 o = uCam - vA.xyz, ro = vec3(dot(o, a), dot(o, u), dot(o, w)), rl = vec3(dot(rd, a), dot(rd, u), dot(rd, w));
  vec3 inv = 1.0 / (rl + vec3(1e-6)), t0 = (vec3(0.0, -R, -R) - ro) * inv, t1 = (vec3(L, R, R) - ro) * inv, tmn = min(t0, t1), tmx = max(t0, t1);
  float tn = max(max(max(tmn.x, tmn.y), tmn.z), 0.0), tf = min(min(tmx.x, tmx.y), tmx.z);
  ivec2 q = min(ivec2(gl_FragCoord.xy * 0.5), ivec2(uLinS));
  tf = min(tf, linFetch(uLinD, q) / max(dot(rd, uCamF), 1e-3));
  if (tf <= tn) discard;
  float drawn = vD.z < -1e8 ? 2.0 * L : (uT - vD.z) / max(vD.w, 0.05) * L;   // (m of it lit, from A)
  if (drawn <= 0.0) discard;
  float ds = (tf - tn) / 8.0, jit = 0.5;   // (hotfix G0: no per-pixel offset, a pattern the view crawled through)
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    float t = tn + (float(i) + jit) * ds;
    vec3 p = ro + rl * t; float s = clamp(p.x / L, 0.0, 1.0), rr = mix(vA.w, vB.w, s), r2 = (p.y * p.y + p.z * p.z) / (rr * rr);
    float win = smoothstep(0.0, max(vE.y, 0.02), s) * (1.0 - smoothstep(1.0 - max(vE.x, 0.02), 1.0, s)) * smoothstep(p.x - 3.0, p.x, drawn);
    float dens = exp(-r2 * 2.2), core = exp(-r2 * 22.0) * vC.w;
    vec3 pw = vA.xyz + a * p.x + u * p.y + w * p.z;
    float dust = 1.0 + vD.x * (n3(pw * 0.07 - a * uT * 0.025) * 2.0 - 1.0) * 1.2;
    acc += vC.rgb * (dens * max(dust, 0.0) + core) * win * ds / (rr * 1.8);
  }
  acc *= 1.0 + vD.y * 0.08 * sin(uT * 12.6 + dot(vA.xyz, vec3(0.37, 0.71, 0.53)));
  float tm = (tn + tf) * 0.5;
  oC = vec4(acc * (1.0 - fogAmt(rd, tm)) * (1.0 - hazeAmt(rd, tm)), 0.0);
}