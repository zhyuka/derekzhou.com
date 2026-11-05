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

uniform vec4 uWords[5]; uniform vec2 uOut; uniform float uMS, uDpr;
out vec4 oC;
float sdBox(vec2 p, vec4 b) { vec2 c = (b.xy + b.zw) * 0.5, h = (b.zw - b.xy) * 0.5, d = abs(p - c) - h; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float msk(vec2 p, vec4 b, float core, float fe) { if (b.z <= b.x) return 0.0; float d = sdBox(p, b) - core; return d <= 0.0 ? 1.0 : (d >= fe ? 0.0 : 0.5 + 0.5 * cos(3.14159265 * d / fe)); }
void main() {
  vec2 p = gl_FragCoord.xy * uMS; p.y = uOut.y - p.y;
  float co = 2.0 * uDpr, fe = 3.0 * uDpr;
  float ks = max(msk(p, uWords[0], co, fe), max(msk(p, uWords[1], co, fe), msk(p, uWords[2], co, fe)));
  float kl = max(msk(p, uWords[3], co, fe), msk(p, uWords[4], co, fe));
  oC = vec4(ks, kl, 0.0, 1.0);
}