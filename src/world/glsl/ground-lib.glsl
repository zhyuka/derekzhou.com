
#define GROUND_CACHE
float gcTex(ivec2 q) {
#ifdef GC_PACKED
  vec4 e = texelFetch(uGround, q, 0); return (dot(e, vec4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0)) * 8192.0) - 4096.0;
#else
  return texelFetch(uGround, q, 0).r;
#endif
}
float groundH(vec2 xz) {
  vec2 g = (xz - uGC.xy) / uGC.z - 0.5; vec2 f = fract(g); ivec2 i = ivec2(floor(g)), m = ivec2(int(uGC.w) - 1);
  ivec2 a = clamp(i, ivec2(0), m), b = clamp(i + ivec2(1, 0), ivec2(0), m), c = clamp(i + ivec2(0, 1), ivec2(0), m), d = clamp(i + ivec2(1, 1), ivec2(0), m);
  return mix(mix(gcTex(a), gcTex(b), f.x), mix(gcTex(c), gcTex(d), f.x), f.y);
}
