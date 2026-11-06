
uniform sampler2D uScene, uCloud; uniform vec4 uBl; uniform vec4 uBlL;   // threshold, knee, scene uv scale; the scene's and cloud's last texel (uv)
out vec4 oC;
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec3 s = texture(uScene, min(uv * uBl.zw, uBlL.xy)).rgb; vec4 cl = texture(uCloud, min(uv * uBl.zw, uBlL.zw));
  vec3 c = min(s, vec3(1.0 + 3.0 * (1.0 - cl.a))) * (1.0 - cl.a) + cl.rgb;
  float m = max(c.r, max(c.g, c.b)), k = uBl.y, r = clamp(m - uBl.x + k, 0.0, 2.0 * k);
  float w = max(r * r / (4.0 * k + 1e-4), m - uBl.x) / max(m, 1e-4);
  oC = vec4(c * w, 1.0);
}