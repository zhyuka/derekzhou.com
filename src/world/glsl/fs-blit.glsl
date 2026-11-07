
uniform sampler2D uTex; uniform vec2 uOut;
out vec4 oC;
/* the world put up to a larger canvas by a Catmull-Rom clamped to the inner 2x2's range (one sharp resample, no
   ring: never outside the four texels it lies between) */
void main() {
  vec2 sz = vec2(textureSize(uTex, 0)), hp = gl_FragCoord.xy / uOut * sz - 0.5, f = fract(hp); ivec2 h0 = ivec2(floor(hp)), qm = ivec2(sz) - 1;
  vec2 w0c = f * (-0.5 + f * (1.0 - 0.5 * f)), w1c = 1.0 + f * f * (-2.5 + 1.5 * f), w2c = f * (0.5 + f * (2.0 - 1.5 * f)), w3c = f * f * (-0.5 + 0.5 * f);
  vec3 s = vec3(0.0), mn = vec3(1e9), mx = vec3(-1e9);
  for (int j = 0; j < 4; j++) { float wy = j == 0 ? w0c.y : (j == 1 ? w1c.y : (j == 2 ? w2c.y : w3c.y));
    for (int i = 0; i < 4; i++) { float wx = i == 0 ? w0c.x : (i == 1 ? w1c.x : (i == 2 ? w2c.x : w3c.x));
      vec3 q = texelFetch(uTex, clamp(h0 + ivec2(i - 1, j - 1), ivec2(0), qm), 0).rgb; s += q * (wx * wy);
      if (i >= 1 && i <= 2 && j >= 1 && j <= 2) { mn = min(mn, q); mx = max(mx, q); } } }
  oC = vec4(clamp(s, mn, mx), 1.0); }