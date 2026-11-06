
uniform sampler2D uTex; uniform vec4 uSh; uniform vec2 uRes2; uniform vec2 uLim; out vec4 oC;
void main() {
  vec2 uv = gl_FragCoord.xy / uRes2, d = (uSh.xy - uv) * (uSh.w / 40.0);
  vec3 acc = vec3(0.0); float w = 1.0, ws = 0.0;
  for (int i = 0; i < 40; i++) { acc += texture(uTex, clamp(uv, vec2(0.0), uLim)).rgb * w; ws += w; w *= 0.965; uv += d; }
  oC = vec4(acc / ws, 1.0);
}