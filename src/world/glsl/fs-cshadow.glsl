// (physics: light/cloud-shadow) the key's light through one lobe, at a point of the plane: exp(-k chord), the chord the
// key's ray cuts through the sphere, its edge softened over the key's own disc (the penumbra: the ray's length to the
// lobe times the key's angular radius)
uniform vec3 uSun; uniform vec2 uCShK;
in vec2 vP; flat in vec4 vL;
out vec4 o;
void main() {
  vec3 d = vec3(vL.x - vP.x, vL.y, vL.z - vP.y);   // (the plane's point to the lobe's centre)
  float tc = dot(d, uSun);
  if (tc <= 0.0) { o = vec4(1.0); return; }   // (the lobe under the point's sky)
  float r = sqrt(max(dot(d, d) - tc * tc, 0.0)), R = vL.w, pen = tc * uCShK.y;   // (the ray's nearest pass by the centre; the penumbra's half width)
  float rr = max(r - pen, 0.0), ch = 2.0 * sqrt(max(R * R - rr * rr, 0.0)) * (1.0 - smoothstep(R - pen, R + pen, r));
  o = vec4(vec3(exp(-uCShK.x * ch)), 1.0);
}
