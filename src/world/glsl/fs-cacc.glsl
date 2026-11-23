
uniform sampler2D uCloud, uHist, uLinD; uniform vec4 uCA;
uniform mat3 uRM;    // this frame's rays (ndc, 1) into the last frame's view: x/z, y/z its ndc
uniform vec2 uHS;    // the history texture's size (texels)
out vec4 oC;
// the history read by a cubic interpolating spline (five bilinear reads, the corners dropped; the coordinates held to the
// drawn part): a bilinear read blurs by how far the ray falls between texels, which changes from frame to frame in a
// turn and flickers (the drag film's flicker p99 0.292 against 0.269 without the accumulation); on a texel's centre
// (held still) it is that texel exactly
vec4 histCR(vec2 hp) {
  vec2 t1 = floor(hp - 0.5) + 0.5, f = hp - t1, lo = vec2(0.5), hi = uCA.zw - 0.5;
  vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f)), w1 = 1.0 + f * f * (-2.5 + 1.5 * f), w2 = f * (0.5 + f * (2.0 - 1.5 * f)), w3 = f * f * (-0.5 + 0.5 * f);
  vec2 w12 = w1 + w2, t0 = clamp(t1 - 1.0, lo, hi) / uHS, t3 = clamp(t1 + 2.0, lo, hi) / uHS, t12 = clamp(t1 + w2 / w12, lo, hi) / uHS;
  vec4 r = texture(uHist, vec2(t12.x, t0.y)) * (w12.x * w0.y) + texture(uHist, vec2(t0.x, t12.y)) * (w0.x * w12.y) + texture(uHist, t12) * (w12.x * w12.y)
         + texture(uHist, vec2(t3.x, t12.y)) * (w3.x * w12.y) + texture(uHist, vec2(t12.x, t3.y)) * (w12.x * w3.y);
  return r / (w12.x * w0.y + w0.x * w12.y + w12.x * w12.y + w3.x * w12.y + w12.x * w3.y);
}
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy), mx = ivec2(uCA.zw) - 1;
  vec4 c = texelFetch(uCloud, p, 0), lo = c, hi = c;
  // the neighbourhood that bounds the history: not the texels more than twice as far as this one (everything beyond
  // 8 km one surface, as the composite takes it), so across the land's edge (a floating rock before a bright tower)
  // the cloud behind is not held where the rock now stands: a whole 3 x 3 lets a tower's light linger on a rock's
  // texel as it moves over it, fading by halves (491 x 1065: a rock pixel 62, 114, 92, 79, 71 codes). Only the farther
  // are left out: a far texel beside a near one still bounds it (leaving those out too loses the history at every
  // edge: the 491 x 668 cloud-edge film's moving reading 0.050 -> 0.082)
  float z0 = min(linFetch(uLinD, p), 8000.0);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    if (i == 0 && j == 0) continue;
    ivec2 pq = clamp(p + ivec2(i, j), ivec2(0), mx);
    if (min(linFetch(uLinD, pq), 8000.0) > 2.0 * max(z0, 1.0)) continue;
    vec4 q = texelFetch(uCloud, pq, 0); lo = min(lo, q); hi = max(hi, q);
  }
  // the last accumulation read where this pixel's ray stood in the last frame's view (the view's turn
  // taken out; the camera's travel in a frame is within the clamp at a cloud's distance), by a cubic interpolating spline; where
  // that falls off the last view (the edge a turn brings in) this frame's own
  vec3 r = uRM * vec3(gl_FragCoord.xy / uCA.zw * 2.0 - 1.0, 1.0);
  vec4 h = c; float w = uCA.x;
  if (r.z > 1e-4) {
    vec2 hp = (r.xy / r.z * 0.5 + 0.5) * uCA.zw;
    if (hp.x < 0.5 || hp.y < 0.5 || hp.x > uCA.z - 0.5 || hp.y > uCA.w - 0.5) w = 1.0;
    else h = histCR(hp);
  } else w = 1.0;
  oC = mix(clamp(h, lo, hi), c, w);
}