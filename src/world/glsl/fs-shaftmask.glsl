
uniform sampler2D uScene, uCloud, uLinD; uniform vec4 uSh; // sun uv x, y, radius, -
uniform vec4 uShS;   // scene uv scale, cloud uv scale
uniform vec4 uShL;   // the scene's and cloud's last texel (uv)
out vec4 oC;
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float d = linFetch(uLinD, min(ivec2(uv * uShS.zw * vec2(textureSize(uLinD, 0))), textureSize(uLinD, 0) - 1));
  vec3 s = texture(uScene, min(uv * uShS.xy, uShL.xy)).rgb; float ca = texture(uCloud, min(uv * uShS.zw, uShL.zw)).a;
  float open = step(5.5e4, d) * (1.0 - ca);
  vec2 dv = (uv - uSh.xy) * vec2(uRes.x / uRes.y, 1.0);
  float fall = exp(-dot(dv, dv) / (uSh.z * uSh.z));
  oC = vec4(s * open * fall, 1.0);
}