
uniform vec3 uCrL, uCrS, uCrE;   // lit and shaded colour; its own light (linear, HDR: moths, jellies, caps)
uniform float uCrA;              // drawn added (jellies: translucent light), else 0
uniform float uCrF;              // (world6 fix) how far in out of the haze (0: the air's far colour, 1: as seen)
centroid in vec3 vW; centroid in vec3 vN; centroid in float vLit; centroid in float vGlow; out vec4 oC;
void main() {
  vec3 v = vW - uCam; float t = length(v); vec3 rd = v / t;
  vec3 n = normalize(vN); if (dot(n, rd) > 0.0) n = -n;
  float dif = clamp(dot(n, uSun) * 0.6 + 0.4, 0.0, 1.0);
  vec3 c = mix(uCrS, uCrL, dif) * (0.92 + 0.16 * vLit);
  c += uCrL * 0.35 * pow(max(dot(rd, uSun), 0.0), 12.0);   // backlit: the wings glow at their edges
  if (uCrA > 0.5) {   // light added: a translucent bell, brighter at its rim, taken by the air
    float rim = 1.0 - abs(dot(n, rd));
    oC = vec4(uCrE * vGlow * (0.35 + 0.9 * rim * rim) * (1.0 - fogAmt(rd, t)) * (1.0 - hazeAmt(rd, t)), 0.0);
    return;
  }
  c += uCrE * vGlow;
  oC = vec4(mix(atmos(c, rd, 1.0e5), atmos(c, rd, t), uCrF), zcode());
}