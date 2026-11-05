
in vec4 vCol; in vec2 vQ; flat in float vKind; out vec4 oC;
void main() {
#ifndef NO_PKWX
  if (vKind > 2.5) {
    float a;
    if (vKind > 3.75) { vec2 q = vec2(vQ.x * 2.0 - 1.0, vQ.y); a = vCol.a * max(1.0 - dot(q, q), 0.0); a *= a; oC = vec4(vCol.rgb * a, a * 0.3); return; }
    if (vKind > 3.25) { vec2 q = vec2(vQ.x * 2.0 - 1.0, vQ.y); float r = length(q); a = vCol.a * exp(-(r - 0.7) * (r - 0.7) * 30.0) * step(r, 1.0); oC = vec4(vCol.rgb * a, a * 0.5); return; }
    a = vCol.a * (1.0 - vQ.y * vQ.y) * smoothstep(0.0, 0.3, vQ.x) * (1.0 - smoothstep(0.85, 1.0, vQ.x));
    oC = vec4(vCol.rgb * a, a * 0.6); return;
  }
#endif
  float q = 2.0 * vQ.x - 1.0;   // (squared by hand: pow of a negative base is undefined)
  float a = vKind > 0.5 ? vCol.a * (1.0 - vQ.y * vQ.y) * (1.0 - q * q) : vCol.a * (1.0 - vQ.y * vQ.y) * smoothstep(0.0, 0.35, vQ.x) * (0.4 + 0.6 * vQ.x);
  oC = vec4(vCol.rgb * a, a * (vKind > 0.5 ? 0.25 : 0.6));   // (mostly light added: a speck or a mote brightens what is behind it)
}