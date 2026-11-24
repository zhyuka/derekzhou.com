// (physics: light/cloud-shadow) a cloud lobe's shadow on the level plane: the ellipse a sphere throws along the key
layout(location = 0) in vec4 aL;   // the lobe: its centre (x, z from the map's origin; y over the plane), its radius (m)
uniform vec3 uSun;    // the live key (unit, up)
uniform vec4 uCShP;   // the map's origin (x, z), its half extent (m), the plane's height
uniform vec2 uCShK;   // the lobes' extinction (1/m), the key's angular radius (rad)
out vec2 vP; flat out vec4 vL;
void main() {
  float sy = max(uSun.y, 0.02);   // (the pass draws nothing under 0.02: the key's true elevation, as the fragments' and the land's)
  vec2 c = aL.xz - uSun.xz * aL.y / sy;   // (the lobe's centre carried down the key to the plane)
  vec2 u = length(uSun.xz) > 1e-4 ? normalize(uSun.xz) : vec2(1.0, 0.0), v = vec2(-u.y, u.x);
  float pen = uCShK.y * (aL.y + aL.w) / (sy - uCShK.y), tx = 2.0 * uCShP.z / 512.0;   // (the penumbra's half width at the far end's ray, whose own length grows with it: pen = k (y + R + pen) / s.y; a texel's margin)
  float a = (aL.w + pen) / sy + tx, b = aL.w + pen + tx;   // (the ellipse's half axes: along the key's way (stretched by 1 / s.y), across it)
  vec2 q = vec2(gl_VertexID & 1, gl_VertexID >> 1) * 2.0 - 1.0;
  vP = c + u * q.x * a + v * q.y * b;
  vL = aL;
  gl_Position = vec4(vP / uCShP.z, 0.0, 1.0);
}
