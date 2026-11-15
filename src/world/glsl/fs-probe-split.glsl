
uniform int uPm; uniform vec4 uGCw; uniform highp sampler2D uHP0, uHP1, uHP3, uHP4, uHP7, uTex; out vec4 oC;
vec4 pack(float h) { float v = clamp((h + 4096.0) / 8192.0, 0.0, 0.99999); vec4 e = fract(v * vec4(1.0, 255.0, 65025.0, 16581375.0)); return e - e.yzww * vec4(1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0, 0.0); }
void main() {
  ivec2 q = ivec2(gl_FragCoord.xy); bool cam = uPm == 1 || uPm == 3;
  vec4 k0 = texelFetch(uHP0, q, 0), k1 = texelFetch(uHP1, q, 0), s = texelFetch(uHP3, q, 0), r = texelFetch(uHP4, q, 0);
  float h = ((s.xyz + r.xyz) - k1.xyz).x;
  if (cam) {
    vec2 p = uPm >= 2 ? uGCw.xy + gl_FragCoord.xy * uGCw.z : texelFetch(uTex, q, 0).xy;   // (delight-weather 1: over the mist pools too)
    vec4 p7 = texelFetch(uHP7, q, 0);
    h = max(max(h, mistTop(vec2(swell(p) * p7.x + p7.y - k1.x, k0.x))), k0.w + r.w * (0.4 + 0.6 * k1.w));
  }
#ifdef GC_PACKED
  oC = pack(h);
#else
  oC = uPm == 2 ? vec4(h, 0.0, 0.0, 1.0) : pack(h);
#endif
}