
uniform sampler2D uTex; uniform vec2 uTexel; uniform vec2 uLim; out vec4 oC;
vec3 tp(vec2 q) { return texture(uTex, min(q, uLim)).rgb; }
void main() { vec2 uv = gl_FragCoord.xy * 2.0 * uTexel; vec2 h = uTexel;
  vec3 s = tp(uv) * 4.0 + tp(uv + vec2(-h.x, -h.y)) + tp(uv + vec2(h.x, -h.y)) + tp(uv + vec2(-h.x, h.y)) + tp(uv + vec2(h.x, h.y));
  oC = vec4(s / 8.0, 1.0); }