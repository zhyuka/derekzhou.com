layout(location = 0) in vec2 aQ;   // x: 0 (at the body's base) .. 1 (the strand's end), y: -1 .. 1 across it
uniform vec3 uGA;          // the strand's top: where it hangs from its body's flat base (world)
uniform vec3 uGP[17];      // its path from the top, m (213-virga.js: virgaPath, in the body's frame)
uniform vec2 uGW;          // its half width (m), and its alpha
out vec3 vW; out vec2 vQ; out float vA; out float vK;
void main() {
  float s = aQ.x * 16.0; int i0 = min(int(floor(s)), 15); float f = s - float(i0);
  vec3 p = mix(uGP[i0], uGP[i0 + 1], f), t = normalize(uGP[i0 + 1] - uGP[i0]);
  vec3 w = uGA + p, e = w - uCam, sd = cross(t, e); float sl = length(sd);
  sd = sl > 1e-3 ? sd / sl : uCamR;
  float d = max(dot(e, uCamF), 1.0), px = 2.0 * d * uProj.x / uRes.x;   // (a pixel of the full frame at this depth, m)
  float hw = uGW.x * (1.0 - 0.55 * aQ.x), hx = max(hw, 3.0 * px);   // (narrowing to its end; never under three pixels a side: no sub-pixel strand to fizz)
  vA = uGW.y * hw / hx; vK = hw / hx;   // (widened past its width, the same light spread thinner, and its streaks gone with it)
  w += sd * hx * aQ.y; vW = w; vQ = aQ;
  gl_Position = uVP * vec4(eyeRel(w), 1.0);
}
