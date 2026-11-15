
layout(location = 0) in vec2 aQ;   // x: 0 (at the brink) .. 1 (its downwind end), y: -1 .. 1 along the brink
uniform vec4 uRa;    // box (m), length (m), width along the brink (m), lift (m)
uniform vec3 uWind; uniform vec4 uPc;
uniform vec4 uRb;    // a gust's period (s), -, -, -
uniform vec4 uPm;    // (large world) the camera modulo the box (x, z), and its whole boxes (x, z): the JS's doubles
out vec4 vCol; out vec3 vW; out vec2 vQ;
void main() {
  int id = gl_InstanceID;
  uint h = ih(uint(id) * 2246822519u + 31u);
  float r1 = hf(h), r2 = hf(ih(h + 1u)), r3 = hf(ih(h + 2u)), r4 = hf(ih(h + 3u));
  vec2 rel0 = mod(vec2(r2, r3) * uRa.x - uPm.xy + 0.5 * uRa.x, uRa.x) - 0.5 * uRa.x;
  vec2 p0 = uRa.x * uPm.zw + (rel0 + uPm.xy);   // (whole boxes, then the rest: the same p0 while the camera moves, never one rounded off the camera)
  vec4 sp = veilSpot(p0);
  vec2 w = normalize(uWind.xz), pp = vec2(-w.y, w.x);
  float L = uRa.y * (0.45 + 0.55 * r4), Wd = uRa.z * (0.6 + 0.8 * r1), x = aQ.x, y = aQ.y;
  float g = uT / (uRb.x * (0.8 + 0.4 * r2)) + r1 * 7.0, gust = smoothstep(0.1, 0.35, fract(g)) * (1.0 - smoothstep(0.55, 0.95, fract(g)));
  vec2 xz = sp.xy + w * x * L + pp * y * Wd * (1.0 + 0.7 * x);
  vW = vec3(xz.x, sp.z + 0.15 + uRa.w * x * (0.6 + 0.8 * r2) - L * 0.12 * x * x, xz.y);
  gl_Position = uVP * vec4(eyeRel(vW), 1.0);
  vec3 ve = eyeRel(vW); float dist = length(ve); vec3 rd = ve / dist;
  float back = pow(max(dot(rd, uSun), 0.0), 3.0);
  float edge = 1.0 - smoothstep(0.38 * uRa.x, 0.5 * uRa.x, max(abs(rel0.x), abs(rel0.y)));
  float a = uPc.a * gust * sp.w * edge * smoothstep(6.0, 18.0, dist) * (1.0 - smoothstep(140.0, 230.0, dist));
  vCol = vec4(atmos(uPc.rgb * (0.85 + 1.8 * back), rd, dist), a); vQ = aQ;
}