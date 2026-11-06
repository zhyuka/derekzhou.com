
layout(location = 0) in vec3 aV; layout(location = 1) in vec4 aO;
void main() { gl_Position = uVP * vec4(aO.xyz + aV * aO.w - uCam, 1.0); }