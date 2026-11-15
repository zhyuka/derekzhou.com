
uniform vec3 uWind; uniform vec4 uAir;   // the veils' day wind; the air's clocks (uAir.x: the surface's wind clock)
in vec4 vCol; in vec3 vW; in vec2 vQ; out vec4 oC;
void main() {
  vec2 w = normalize(uWind.xz), pp = vec2(-w.y, w.x);
  // (the sand's streaks carried at the veil's own wind on the air's clock: the visit's wind at the sky's share, never a pace of their own)
  float s = n3v(vec3((dot(vW.xz, w) - uAir.x * length(uWind.xz)) * 0.035, dot(vW.xz, pp) * 0.28, 0.37)).a * 1.4 - 0.2;
  float a = vCol.a * clamp(s, 0.0, 1.0) * (1.0 - vQ.y * vQ.y) * smoothstep(0.0, 0.12, vQ.x) * (1.0 - smoothstep(0.35, 1.0, vQ.x));
  oC = vec4(vCol.rgb * a, a);
}