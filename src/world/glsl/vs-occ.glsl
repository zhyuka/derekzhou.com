
layout(location = 0) in vec3 aV; layout(location = 1) in vec4 aO;
void main() { gl_Position = uVP * vec4(eyeRel(aO.xyz + aV * aO.w), 1.0); }