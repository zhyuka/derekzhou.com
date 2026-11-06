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

uniform vec3 uCam; uniform vec3 uCamR, uCamU, uCamF; uniform vec4 uProj; uniform mat4 uVP;
uniform vec2 uRes; uniform float uT; uniform int uDbg;
uniform vec3 uSun; uniform vec3 uSunC;
uniform vec4 uTwM;    // (tod fix3) the twilight's low mist as the light crosses the inks' band: its amount (0: none), its half-height and feather about the horizon (sines of elevation)
uniform vec3 uSkyS;   // (tod) the sky's own light: its glow, its warmth and its disc (the key light's azimuth at the sky's own elevation; the key itself by day)
uniform vec3 uSky[6]; uniform vec4 uSkyE; uniform vec3 uSkyW; uniform vec4 uSkyK;
uniform vec4 uGlow; uniform vec3 uGlowC; uniform vec4 uFog; uniform vec4 uFog2; uniform vec4 uFogB;
uniform vec4 uSkyN;   // (fast500 no-fades, the sun and moon) w 1 only in a change between a twilight sky and a night sky (0 everywhere else: every branch on it skipped), xyz the key (the night's own light)
uniform vec3 uGlowN, uSkyWT, uSkyWN, uHzT, uHzN; uniform vec4 uSkyKT, uSkyKN, uSunK;   // (with it) the night's glow about the key; the twilight's and the night's warm colours and amounts; the haze's warm side at each end (toward the light less away); the sun's depth under the twilight's own (deg), its share (band), the night's (QN), the wisps' shadow line (deg)
uniform vec4 uHaze; uniform vec3 uHazeC, uHazeW;   // the ground haze: density at its base (1/m), scale height (m), its base below the eye (m), -; colour, toward the sun
uniform vec3 uAmbU, uAmbD;
uniform vec3 uClLit, uClShade, uClDeep, uClRim; uniform vec4 uClK, uClK2;
uniform vec4 uP[24];   // the realm's parameters for this visit
uniform uint uSalt;    // the visit's salt for the layout's hashes (cellHash)
uniform sampler3D uN3;
uniform highp sampler2D uGround; uniform vec4 uGC;   // the ground's height cached around the camera: origin x, z; cell (m); texels across
uniform float uSunVis;  // how much of the sun the sky shows (its disc, glare, halo, streak, glint): 0 where there is none (an interior, an overcast)
uniform vec4 uWet;      // water: the rain's rings (0 .. 1), the ripples' strength, the wind's direction (x, z)

uniform sampler3D uTex3; uniform vec3 uHalf, uDims, uScale, uSunL; uniform float uLayer, uSigma, uSD, uVox;
uniform vec2 uYawCS;
out vec4 oC;
float dens(vec3 u) { if (any(lessThan(u, vec3(0.0))) || any(greaterThan(u, vec3(1.0)))) return 0.0; return clamp((texture(uTex3, u * uScale).r - 0.5) * uSD, 0.0, 1.0); }
void main() {
  vec3 uvw = vec3(gl_FragCoord.xy, uLayer + 0.5) / uDims;
  float d0 = texture(uTex3, uvw * uScale).r;
  vec3 q = uvw; float tl = 0.0, ds = uVox * 0.6;
  for (int i = 0; i < 18; i++) { q += uSunL * (ds / (2.0 * uHalf)); tl += dens(q) * ds; ds *= 1.22; }
  tl *= uSigma;
  float ta = 0.0;
  for (int k = 0; k < 3; k++) {
    vec3 dw = k == 0 ? vec3(0.0, 1.0, 0.0) : (k == 1 ? vec3(0.62, 0.78, 0.0) : vec3(-0.44, 0.78, 0.44));
    vec3 dir = vec3(uYawCS.x * dw.x - uYawCS.y * dw.z, dw.y, uYawCS.y * dw.x + uYawCS.x * dw.z);
    vec3 r = uvw; float s = 0.0; ds = uVox * 0.6;
    for (int i = 0; i < 10; i++) { r += dir * (ds / (2.0 * uHalf)); s += dens(r) * ds; ds *= 1.35; }
    ta += s * uSigma / 3.0;
  }
  oC = vec4(d0, clamp(tl / 24.0, 0.0, 1.0), clamp(ta / 12.0, 0.0, 1.0), texture(uTex3, uvw * uScale).g);
}