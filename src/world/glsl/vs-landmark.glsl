
layout(location = 0) in vec3 aP; layout(location = 1) in vec3 aN; layout(location = 2) in vec4 aC; layout(location = 3) in float aY; layout(location = 4) in float aE;
centroid out vec3 vW; centroid out vec3 vN; centroid out vec4 vC; centroid out float vY; centroid out vec2 vE; centroid out float vMT;   // (delight-weather 1) the mist pools' top over the vertex
void main() {
  vW = aP; vN = aN; vC = vec4(aC.rgb * 2.0, floor(aC.a * 255.0 + 0.5)); vY = aY; vE = vec2(aE * 15.9375, 0.0); vMT = mistTopAt(vW.xz);
  gl_Position = uVP * vec4(vW - uCam, 1.0);
}