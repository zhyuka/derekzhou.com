#version 300 es
precision highp float; uniform sampler2D uT; out vec4 o;
void main() { float f = (gl_FragCoord.x - 0.5) / 63.0; o = texture(uT, vec2((0.5 + f) * 0.5, 0.5)); }