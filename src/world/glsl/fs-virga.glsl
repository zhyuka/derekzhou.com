uniform sampler2D uLinD;
in vec3 vW; in vec2 vQ; in float vA; out vec4 oC;
/* virga (physics: clouds/virga): a soft strand of falling drops under its body's base, lit as the cloud's own shade
   (its underside's light, cloudLight looking up into it), thinning across (a bell curve) and along (the drops evaporate:
   none left at its end) by place on the strand alone, never by the clock; cut where the land stands nearer */
void main() {
  vec3 rd = normalize(vW - uCam);
  if (dot(vW - uCam, uCamF) > linFetch(uLinD, ivec2(gl_FragCoord.xy))) discard;
  float a = vA * exp(-2.6 * vQ.y * vQ.y) * smoothstep(0.0, 0.08, vQ.x) * (1.0 - smoothstep(0.25, 1.0, vQ.x));
  vec3 c = cloudLight(vec3(0.0, -1.0, 0.0), rd, 1.6, 0.8, 0.0, 0.0);
  oC = vec4(c * a, a);
}
