float hgN(float c, float g) { float g2 = g * g; return (1.0 - g2) / pow(max(1.0 + g2 - 2.0 * g * c, 1e-4), 1.5); }
/* cloud lit as cloud: light carried on through it (octaves of scattering, each dimmer, deeper, less forward), its
   colour the light's where thin and the sky's saturated colour where deep, the edge toward the sun silvered */
vec3 cloudLight2(vec3 n, vec3 na, vec3 rd, float tauL, float ao, float hgt, float thin) {
  // n: the form the sun lights; na: the form the sky lights (a lobe's own top catches the sky)
  float ndl = dot(n, uSun), cs = dot(rd, uSun);
  float ms = 0.0, aw = 1.0, bw = 1.0, gw = uClK.z;
  for (int o = 0; o < 3; o++) { ms += aw * exp(-tauL * bw) * mix(hgN(cs, gw), hgN(cs, -0.25 * gw), 0.3); aw *= 0.5; bw *= 0.5; gw *= 0.6; }
  float wrap = clamp((ndl + uClK2.w) / (1.0 + uClK2.w), 0.0, 1.0);
  float lit = wrap * (0.55 + 0.45 * min(ms, 2.4)) * exp(-tauL * uClK.y);
  float sky = clamp(ao * (0.45 + 0.55 * (0.5 + 0.5 * na.y)) * mix(uClK2.z, 1.0, hgt), 0.0, 1.0);
  vec3 sh = mix(uClDeep, uClShade, sky);
  vec3 c = mix(sh, uClLit, clamp(lit, 0.0, 1.0)) * mix(1.0, ao, uClK2.x);
  c += uClRim * hgN(cs, 0.86) * thin * exp(-tauL * 0.6) * uClK.w;
  return c;
}
vec3 cloudLight(vec3 n, vec3 rd, float tauL, float ao, float hgt, float thin) { return cloudLight2(n, n, rd, tauL, ao, hgt, thin); }
