
layout(location = 0) in vec3 aB;
uniform vec3 uVC, uVH; uniform vec2 uVY;
out vec3 vW;
void main() { vec3 l = aB * uVH, w = uVC + vec3(uVY.x * l.x + uVY.y * l.z, l.y, -uVY.y * l.x + uVY.x * l.z); vW = w; gl_Position = uVP * vec4(w - uCam, 1.0); }