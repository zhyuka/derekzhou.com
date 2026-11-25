uniform sampler2D uLinD;
in vec3 vW; in vec2 vQ; in float vA; out vec4 oC;
/* virga (physics: clouds/virga): a soft strand of falling drops under its body's base, in the cloud's own deepest
   shade (so never lighter than the base over it), thinning across (a bell curve) and along (the drops evaporate:
   none left at its end) by place on the strand alone, never by the clock; cut where the land stands nearer */
void main() {
  if (dot(vW - uCam, uCamF) > linFetch(uLinD, ivec2(gl_FragCoord.xy))) discard;
  float a = vA * exp(-2.2 * vQ.y * vQ.y) * smoothstep(0.0, 0.05, vQ.x) * (1.0 - smoothstep(0.45, 1.0, vQ.x));
  vec3 c = min(uClDeep, uClShade);   // (never lighter than the base over it: the body's own light starts from mix(uClDeep, uClShade) and only rises toward uClLit, so this floor of it is under every base, channel by channel)
  oC = vec4(c * a, a);
}
