
void main() {
  float halo = uMode.x > 0.5 || aM.x <= 0.0 ? 0.0 : aC.w * uMode.z;   // (none for a speck: its e-folding 0)
  float pad = aK1.z + 2.0 * aK1.w + 1.0 + (halo > 0.0 ? 4.0 * aM.x : 0.0) + (aM.z >= 0.0 ? 6.0 : 0.0);
  vec2 lo = aBox.xy - pad, hi = aBox.zw + pad;
  int c = gl_VertexID;
  vec2 q = vec2((c & 1) == 1 ? hi.x : lo.x, (c & 2) == 2 ? hi.y : lo.y);
  gl_Position = aE.w <= 0.0 ? vec4(2.0, 2.0, 2.0, 1.0) : vec4(q / uOut * 2.0 - 1.0, 0.0, 1.0);
  vK1 = aK1;
  vec3 P = aB.xyz; float t = length(P); vec3 rd = P / max(t, 1e-3);
  vec3 o, B0 = vec3(0.0); float A0 = 1.0;
  if (uMode.x > 0.5) o = uInkF;   // forced colours: CanvasText, flat, at full strength
  else {
    /* the air between, as the land's (far birds go into the haze): affine in the light, A0 c + B0, so a facet's own
       light takes the same air in the fragment */
    if (uGr.w > 0.0) { B0 = atmos(vec3(0.0), rd, t); A0 = atmos(vec3(1.0), rd, t).g - B0.g; }
    o = gradeOut(A0 * aE.rgb * aM.y + B0);   // (the hold: the paper's light scaled down where it would melt into its ground)
  }
  vCol = vec4(o, aE.w); vAir = vec4(B0, A0); vL = aL;
  vZ = vec4(dot(P, uCamF), aB.w, aM.x, halo);
  vC = aC; vW = aM;
}