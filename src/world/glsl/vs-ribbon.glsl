
layout(location = 0) in vec2 aQ;   // x: 0 (at the brink) .. 1 (its downwind end), y: -1 .. 1 along the brink
uniform vec4 uRa;    // box (m), length (m), width along the brink (m), lift (m)
uniform vec3 uWind; uniform vec4 uPc; uniform vec4 uAir;
out vec4 vCol; out vec3 vW; out vec2 vQ;
void main() {
  int id = gl_InstanceID;
  uint h = ih(uint(id) * 2246822519u + 31u);
  float r1 = hf(h), r2 = hf(ih(h + 1u)), r3 = hf(ih(h + 2u)), r4 = hf(ih(h + 3u));
  vec2 p0 = uCam.xz + mod(vec2(r2, r3) * uRa.x - uCam.xz + 0.5 * uRa.x, uRa.x) - 0.5 * uRa.x;
  vec4 sp = veilSpot(p0);
  vec2 w = normalize(uWind.xz), pp = vec2(-w.y, w.x);
  float L = uRa.y * (0.45 + 0.55 * r4), Wd = uRa.z * (0.6 + 0.8 * r1), x = aQ.x, y = aQ.y;
  float Wv = length(uWind.xz), gust = smoothstep(0.2, 1.2, airGust(sp.xy, w, Wv, uAir.x, uAir.y * uAir.z) / max(Wv * AIR_GUST_I, 1e-4) + 0.3 * (r1 - 0.5));   // (the air's gust field at the veil's brink, in the day's sigmas: the sand lifts as a gust passes over it, and in a night's weak air seldom)
  vec2 xz = sp.xy + w * x * L + pp * y * Wd * (1.0 + 0.7 * x);
  vW = vec3(xz.x, sp.z + 0.15 + uRa.w * x * (0.6 + 0.8 * r2) - L * 0.12 * x * x, xz.y);
  gl_Position = uVP * vec4(vW - uCam, 1.0);
  float dist = length(vW - uCam); vec3 rd = (vW - uCam) / dist;
  float back = pow(max(dot(rd, uSun), 0.0), 3.0);
  float edge = 1.0 - smoothstep(0.38 * uRa.x, 0.5 * uRa.x, max(abs(p0.x - uCam.x), abs(p0.y - uCam.z)));
  float a = uPc.a * gust * sp.w * edge * smoothstep(6.0, 18.0, dist) * (1.0 - smoothstep(140.0, 230.0, dist));
  vCol = vec4(atmos(uPc.rgb * (0.85 + 1.8 * back), rd, dist), a); vQ = aQ;
}