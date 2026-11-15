
layout(location = 0) in vec3 aP; layout(location = 1) in vec3 aN; layout(location = 2) in vec4 aC; layout(location = 3) in float aY; layout(location = 4) in float aE;
layout(location = 5) in vec4 iA;   // x, its seat (y), z, its turn (rad)
layout(location = 6) in vec4 iB;   // scale (x, y, z), its phase (0 .. 1)
layout(location = 7) in vec4 iC;   // tint (r, g, b: times the mesh's colours), its emission's share (times the mesh's own)
layout(location = 8) in vec4 iD;   // tilt about x and z (rad), a bob (m), the bob's rate (rad/s)
layout(location = 9) in vec4 iE;   // its spin (rad/s), -, -, -
centroid out vec3 vW; centroid out vec3 vN; centroid out vec4 vC; centroid out float vY; centroid out vec2 vE; centroid out float vMT;   // (delight-weather 1) the mist pools' top over the vertex
void main() {
  float a = iA.w + iE.x * uT, ca = cos(a), sa = sin(a), cx = cos(iD.x), sx = sin(iD.x), cz = cos(iD.y), sz = sin(iD.y);
  mat3 R = mat3(ca, 0.0, -sa, 0.0, 1.0, 0.0, sa, 0.0, ca) * mat3(1.0, 0.0, 0.0, 0.0, cx, sx, 0.0, -sx, cx) * mat3(cz, sz, 0.0, -sz, cz, 0.0, 0.0, 0.0, 1.0);
  vec3 lp = aP * iB.xyz;
  vW = iA.xyz + R * lp + vec3(0.0, iD.z * sin(uT * iD.w + iB.w * 6.2831853), 0.0);
  vN = R * (aN / iB.xyz);
  vC = vec4(aC.rgb * 2.0 * iC.rgb, floor(aC.a * 255.0 + 0.5)); vY = lp.y; vE = vec2(aE * 15.9375 * iC.w, iB.w); vMT = mistTopAt(vW.xz);
  gl_Position = uVP * vec4(vW - uCam, 1.0);
}