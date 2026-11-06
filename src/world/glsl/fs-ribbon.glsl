
uniform vec3 uWind;
in vec4 vCol; in vec3 vW; in vec2 vQ; out vec4 oC;
void main() {
  vec2 w = normalize(uWind.xz), pp = vec2(-w.y, w.x);
  float s = n3v(vec3(dot(vW.xz, w) * 0.035 - uT * 0.22, dot(vW.xz, pp) * 0.28, 0.37)).a * 1.4 - 0.2;
  float a = vCol.a * clamp(s, 0.0, 1.0) * (1.0 - vQ.y * vQ.y) * smoothstep(0.0, 0.12, vQ.x) * (1.0 - smoothstep(0.35, 1.0, vQ.x));
  oC = vec4(vCol.rgb * a, a);
}