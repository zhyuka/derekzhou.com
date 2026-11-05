
uniform sampler3D uTex3; uniform vec3 uHalf, uDims, uScale, uSunL; uniform float uLayer, uSigma, uSD, uVox;
uniform vec2 uYawCS;
out vec4 oC;
float dens(vec3 u) { if (any(lessThan(u, vec3(0.0))) || any(greaterThan(u, vec3(1.0)))) return 0.0; return clamp((texture(uTex3, u * uScale).r - 0.5) * uSD, 0.0, 1.0); }
void main() {
  vec3 uvw = vec3(gl_FragCoord.xy, uLayer + 0.5) / uDims;
  float d0 = texture(uTex3, uvw * uScale).r;
  vec3 q = uvw; float tl = 0.0, ds = uVox * 0.6;
  for (int i = 0; i < 18; i++) { q += uSunL * (ds / (2.0 * uHalf)); tl += dens(q) * ds; ds *= 1.22; }
  tl *= uSigma;
  float ta = 0.0;
  for (int k = 0; k < 3; k++) {
    vec3 dw = k == 0 ? vec3(0.0, 1.0, 0.0) : (k == 1 ? vec3(0.62, 0.78, 0.0) : vec3(-0.44, 0.78, 0.44));
    vec3 dir = vec3(uYawCS.x * dw.x - uYawCS.y * dw.z, dw.y, uYawCS.y * dw.x + uYawCS.x * dw.z);
    vec3 r = uvw; float s = 0.0; ds = uVox * 0.6;
    for (int i = 0; i < 10; i++) { r += dir * (ds / (2.0 * uHalf)); s += dens(r) * ds; ds *= 1.35; }
    ta += s * uSigma / 3.0;
  }
  oC = vec4(d0, clamp(tl / 24.0, 0.0, 1.0), clamp(ta / 12.0, 0.0, 1.0), texture(uTex3, uvw * uScale).g);
}