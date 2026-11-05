
layout(location = 0) in vec2 aQ;   // the quad's corner (-1 .. 1)
layout(location = 1) in vec4 gA;   // its place (x, y, z), its size (m)
layout(location = 2) in vec4 gB;   // its colour (linear, HDR), its least size (px)
layout(location = 3) in vec4 gC;   // twinkle (0 .. 1), pulse (0 .. 1), rate (Hz), phase (0 .. 1)
layout(location = 4) in vec4 gD;   // drift about its place (m; < 0: a fall, down through that many m at rate m/s, again and again), bob (m), blink (the share of a cycle lit; 0: no blink), far (m: gone by then; 0: 3000)
uniform float uGlowK;   // the set's own fade (a cell coming into being)
out vec3 vCol; out vec2 vQ;
void main() {
  float ph = gC.w * 6.2831853, t = uT, fall = 1.0;
  vec3 p = gA.xyz;
  if (gD.x > 0.0) p += gD.x * vec3(sin(t * (0.21 + 0.07 * gC.w) + ph), 0.5 * sin(t * (0.17 + 0.05 * gC.w) + ph * 1.7), cos(t * (0.19 + 0.06 * gC.w) + ph * 2.3));
  else if (gD.x < 0.0) { float f = fract(t * gC.z / -gD.x + gC.w); p.y += gD.x * f; p.xz += 0.4 * sin(t * 0.9 + ph) * vec2(1.0, 0.7); fall = smoothstep(0.0, 0.1, f) * (1.0 - smoothstep(0.7, 1.0, f)); }
  if (gD.y > 0.0) p.y += gD.y * sin(t * (1.1 + 0.5 * gC.w) + ph);
  vec3 v = p - uCam; float dist = length(v), far = gD.w > 0.0 ? gD.w : 3000.0;
  vec4 c = uVP * vec4(v, 1.0);
  vQ = aQ;
  if (c.w < 0.3 || dist > far) { gl_Position = vec4(0.0, 0.0, -2.0, 1.0); vCol = vec3(0.0); return; }
  float rpx = gA.w * 0.25 * uRes.y / (uProj.y * c.w), rfl = max(rpx, gB.w * 0.5), k = (rpx / rfl) * (rpx / rfl);
  float I = 1.0;
  if (gC.x > 0.0) I *= 1.0 + gC.x * 1.4 * gn(vec2(t * gC.z + gC.w * 17.0, gC.w * 31.0));
  if (gC.y > 0.0) I *= 1.0 + gC.y * sin(6.2831853 * gC.z * t + ph);
  if (gD.z > 0.0) { float cy = fract(t * gC.z * 0.35 + gC.w); I *= smoothstep(0.0, 0.06, cy) * (1.0 - smoothstep(max(gD.z - 0.06, 0.0), gD.z, cy)); }
  vec3 rd = v / dist;
  I = max(I, 0.0) * k * fall * (1.0 - smoothstep(far * 0.7, far, dist)) * uGlowK * (1.0 - fogAmt(rd, dist)) * (1.0 - hazeAmt(rd, dist));
  vCol = gB.rgb * I;
  gl_Position = vec4(c.xy + aQ * rfl * 6.0 / uRes * c.w, c.z, c.w);   // (the quad holds the core and its halo: three radii)
}