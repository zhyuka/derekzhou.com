uniform sampler2D uLinD;
in vec3 vW; in vec2 vQ; in float vA; in float vK; out vec4 oC;
/* virga (physics: clouds/virga): a soft strand of falling drops under its body's base, lit as the cloud's own shade
   (its underside's light, cloudLight looking up into it), thinning across (a bell curve) and along (the drops evaporate:
   none left at its end) by place on the strand alone, never by the clock; cut where the land stands nearer */
void main() {
  vec3 rd = normalize(vW - uCam);
  if (dot(vW - uCam, uCamF) > linFetch(uLinD, ivec2(gl_FragCoord.xy))) discard;
  float st = 0.62 + 0.38 * (0.5 * sin(vQ.y * 7.3 + 1.1) + 0.3 * sin(vQ.y * 13.1 + 4.2) + 0.2 * sin(vQ.y * 3.7 + 2.6));   // (its shafts: a few fixed across it, the strand's own, never the clock's)
  float a = vA * exp(-2.2 * vQ.y * vQ.y) * mix(1.0, st, smoothstep(0.5, 1.0, vK)) * smoothstep(0.0, 0.05, vQ.x) * (1.0 - smoothstep(0.45, 1.0, vQ.x));
  vec3 c = cloudLight(vec3(0.0, -1.0, 0.0), rd, 1.6, 0.8, 0.0, 0.0);
  oC = vec4(c * a, a);
}
