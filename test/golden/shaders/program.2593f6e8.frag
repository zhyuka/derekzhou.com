#version 300 es
#define HPSPLIT
#define NO_TWILIGHT
#define NO_RAIN
#define NO_WATER
#define NO_PKWX
precision highp float;
precision highp int;
precision highp sampler3D;
precision highp sampler2D;

uniform sampler2D uTex; uniform vec2 uTexel; uniform vec2 uLim; out vec4 oC;
vec3 tp(vec2 q) { return texture(uTex, min(q, uLim)).rgb; }
void main() { vec2 uv = gl_FragCoord.xy * uTexel * 0.5; vec2 h = uTexel;
  vec3 s = tp(uv + vec2(-h.x * 2.0, 0.0)) + tp(uv + vec2(h.x * 2.0, 0.0)) + tp(uv + vec2(0.0, -h.y * 2.0)) + tp(uv + vec2(0.0, h.y * 2.0));
  s += (tp(uv + vec2(-h.x, h.y)) + tp(uv + vec2(h.x, h.y)) + tp(uv + vec2(-h.x, -h.y)) + tp(uv + vec2(h.x, -h.y))) * 2.0;
  oC = vec4(s / 12.0, 1.0); }