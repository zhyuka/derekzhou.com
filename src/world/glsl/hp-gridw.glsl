
uniform int uHsrc;   // 0 the clipmap's vertices (uLevA), 1 the probe's points (uTex), 2 the probe's grid (uGCw)
uniform vec4 uLevA[10]; uniform vec4 uGCw; uniform highp sampler2D uTex;
uniform highp sampler2D uHP0, uHP1, uHP2;
layout(location = 0) out vec4 o0; layout(location = 1) out vec4 o1; layout(location = 2) out vec4 o2;
ivec2 gq; vec2 gw;
void gridW() {
  gq = ivec2(gl_FragCoord.xy);
  if (uHsrc == 0) {
    int l = gq.y / 97; vec2 aG = vec2(float(gq.x), float(gq.y - l * 97)); vec4 L = uLevA[l];
    vec2 c = L.xy + aG, w = c * L.z;
    float d = max(abs(w.x - uCam.x), abs(w.y - uCam.z));
    float m = clamp((d - (L.w - 11.0) * L.z) / (8.5 * L.z), 0.0, 1.0);
    w = (c + mod(c, 2.0) * (mod(c, 4.0) - 2.0) * m) * L.z;
    gLodD = length(w - uCam.xz); gw = w;
  } else gw = uHsrc == 2 ? uGCw.xy + gl_FragCoord.xy * uGCw.z : texelFetch(uTex, gq, 0).xy;
}
