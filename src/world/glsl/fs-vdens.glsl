
uniform vec4 uLobe[96]; uniform int uLobeN; uniform vec3 uHalf, uDims; uniform float uLayer;
uniform vec4 uVK;    // seed, erosion, noise scale (m), blend (m)
uniform vec4 uVK2;   // -, squash (the lobes' height over their width), the distance's range (m), the billows' depth (m)
out vec4 oC;
void main() {
  vec3 uvw = vec3(gl_FragCoord.xy, uLayer + 0.5) / uDims;
  vec3 p = (uvw * 2.0 - 1.0) * uHalf;
  float s = 1e5, k = uVK.w, sq = uVK2.y;
  for (int i = 0; i < 96; i++) {
    if (i >= uLobeN) break;
    vec4 L = uLobe[i]; vec3 d = p - L.xyz; d.y /= sq;
    float si = (length(d) - L.w) * min(sq, 1.0);
    float h = max(k - abs(s - si), 0.0) / k;
    s = min(s, si) - h * h * k * 0.25;
  }
  vec3 q = p / uVK.z + uVK.x;
  float n = texture(uN3, q).g * 0.8 + texture(uN3, q * 2.7 + 0.4).b * 0.2;
  float s0 = s;
  s -= (n - 0.5) * uVK.y * uVK2.w;
  oC = vec4(clamp(0.5 - s / uVK2.z, 0.0, 1.0), clamp(0.5 - s0 / (uVK2.z * 2.0), 0.0, 1.0), 0.0, 1.0);
}