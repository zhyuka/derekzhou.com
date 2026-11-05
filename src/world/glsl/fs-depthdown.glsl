
uniform sampler2D uDepth; uniform vec2 uScale; out vec4 oC;   // uScale: the last texel of the scene as drawn
float lin(float d) { float n = uProj.z, f = uProj.w, z = d * 2.0 - 1.0; return 2.0 * n * f / (f + n - z * (f - n)); }
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy) * 2, lim = ivec2(uScale), p1 = min(p + 1, lim);
  float a = texelFetch(uDepth, min(p, lim), 0).r, b = texelFetch(uDepth, ivec2(p1.x, p.y), 0).r, c = texelFetch(uDepth, ivec2(p.x, p1.y), 0).r, d = texelFetch(uDepth, p1, 0).r;
  float m = min(min(a, b), min(c, d));
  float v = m >= 1.0 ? 6.0e4 : min(lin(m), 5.9e4);
#ifdef LIND_PACKED
  vec4 e = fract(clamp(v / 65536.0, 0.0, 0.99999) * vec4(1.0, 255.0, 65025.0, 16581375.0));
  oC = e - e.yzww * vec4(1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0, 0.0);
#else
  oC = vec4(v, 0.0, 0.0, 1.0);
#endif
  gl_FragDepth = m;
}