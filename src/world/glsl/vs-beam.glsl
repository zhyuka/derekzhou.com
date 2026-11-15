
layout(location = 0) in vec3 aB;   // the unit box's corner
layout(location = 1) in vec4 bA;   // from (x, y, z), its radius (m)
layout(location = 2) in vec4 bB;   // to (x, y, z), its radius
layout(location = 3) in vec4 bC;   // colour (linear, HDR), the white core's strength
layout(location = 4) in vec4 bD;   // dust (0 .. 1), shimmer (0 .. 1), woken at (the shaders' clock; -1e9: always lit; 1e9: not yet), the draw-on (s)
layout(location = 5) in vec4 bE;   // the share of its length faded at its far end, the share faded at its start, -, -
flat out vec4 vA, vB, vC, vD, vE; out vec3 vW;
void main() {
  vec3 ax = bB.xyz - bA.xyz; float L = max(length(ax), 1e-3); vec3 a = ax / L;
  vec3 u = normalize(cross(a, abs(a.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0))), w = cross(a, u);
  float R = max(bA.w, bB.w) * 2.2;
  vec3 p = bA.xyz + a * (aB.x * 0.5 + 0.5) * L + (u * aB.y + w * aB.z) * R;
  vW = p; vA = bA; vB = bB; vC = bC; vD = bD; vE = bE;
  gl_Position = uVP * vec4(eyeRel(p), 1.0);
}