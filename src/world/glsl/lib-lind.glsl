
float linFetch(sampler2D s, ivec2 q) {
#ifdef LIND_PACKED
  return dot(texelFetch(s, q, 0), vec4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0)) * 65536.0;
#else
  return texelFetch(s, q, 0).r;
#endif
}
