
uniform vec3 uCam; uniform vec3 uCamL; uniform vec3 uCamR, uCamU, uCamF; uniform vec4 uProj; uniform mat4 uVP;   // (uCamL: what fp32 drops of the camera's position: uCam + uCamL is the camera to the double; eyeRel)
uniform vec2 uRes; uniform float uT; uniform int uDbg;
uniform vec3 uSun; uniform vec3 uSunC;
uniform float uKeyD;  // (physics: light/twilight-key) the key's diffuse share: 0 a direct key (a night's moon; 0 where unset), 1 the sky's light alone (the sun 7 deg down)
uniform vec4 uTwM;    // the twilight's low mist as the light crosses the inks' band: its amount (0: none), its half-height and feather about the horizon (sines of elevation)
uniform vec3 uSkyS;   // the sky's own light: its glow, its warmth and its disc (the key light's azimuth at the sky's own elevation; the key itself by day)
uniform vec3 uSky[6]; uniform vec4 uSkyE; uniform vec3 uSkyW; uniform vec4 uSkyK;
uniform vec4 uGlow; uniform vec3 uGlowC; uniform vec4 uFog; uniform vec4 uFog2;
uniform vec4 uSkyN;   // (the sun and moon) w 1 only in a change between a twilight sky and a night sky (0 everywhere else: every branch on it skipped), xyz the key (the night's own light)
uniform vec3 uGlowN, uSkyWT, uSkyWN, uHzT, uHzN; uniform vec4 uSkyKT, uSkyKN, uSunK;   // (with it) the night's glow about the key; the twilight's and the night's warm colours and amounts; the haze's warm side at each end (toward the light less away); the sun's depth under the twilight's own (deg), its share (band), the night's (QN), the wisps' shadow line (deg)
uniform vec4 uAer;    // the aerosol (lib-air: atmos): its optical depth's scale by the visit's dust and moisture, the forward peak's g, its amount, -
uniform vec4 uHaze; uniform vec3 uHazeC, uHazeW;   // the ground haze: density at its base (1/m), scale height (m), its base below the eye (m), -; colour, toward the sun
uniform vec3 uAmbU, uAmbD;
uniform vec4 uFogP;   // (the fog pools) the pool in view: its site (x, z), its basin's radius (m), its top (m; -1e4: none)
uniform vec4 uMist;   // (delight-weather 1) the mist pools: their depth over the dunes' floor (m), the depth they turn opaque within (m)
uniform vec3 uClLit, uClShade, uClDeep, uClRim; uniform vec4 uClK, uClK2;
uniform vec4 uP[24];   // the realm's parameters for this visit
uniform uint uSalt;    // the visit's salt for the layout's hashes (cellHash)
uniform sampler3D uN3;
uniform highp sampler2D uGround; uniform vec4 uGC;   // the ground's height cached around the camera: origin x, z; cell (m); texels across
uniform float uSunVis;  // how much of the sun the sky shows (its disc, glare, halo, streak, glint): 0 where there is none (an interior, an overcast)
uniform vec4 uWet;      // water: the rain's rings (0 .. 1), the ripples' strength, the wind's direction (x, z)
/* (large world) a world point relative to the eye, as the double camera stands: w - uCam is exact (two fp32 values
   near one another), then what fp32 dropped of the camera (uCamL) comes off. Every vertex stage's clip position goes
   through it, so the camera's own rounding (4 mm 86 km out: a 1.3 px judder at 3 m) never reaches the screen */
vec3 eyeRel(vec3 w) { return (w - uCam) - uCamL; }
/* (physics: light/twilight-key) the key's cosine on a face as the land and the clouds are shaded: with the sun under
   the horizon no direct sunlight reaches them, only the sky's, so as the sun sinks (uKeyD: 1 - smoothstep(-6, 0, the
   sky's sun): 0.5 at -3, 1 from -6) the face's own cosine gives way to the twilight sky's diffuse light: brightest
   toward the sun's side (the sky's light is the glow's, low over its azimuth), so a face takes 0.5 + 0.5 n.g, g up
   tilted 31 deg toward the key's azimuth, scaled so a level face keeps the key's own height (the lit land's mean held) */
float ndlK(vec3 n) { vec3 g = normalize(vec3(0.6 * uSun.x, length(uSun.xz), 0.6 * uSun.z)); return mix(dot(n, uSun), uSun.y * (0.5 + 0.5 * dot(n, g)) / (0.5 + 0.5 * g.y), uKeyD); }
