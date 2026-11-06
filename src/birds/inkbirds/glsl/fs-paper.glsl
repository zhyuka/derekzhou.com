
const vec3 LUM = vec3(0.2126, 0.7152, 0.0722);
uniform sampler2D uDepth, uCloud, uHz, uBloom;
uniform highp sampler2D uPts; // the birds' rows: 46 points (device px, y up; 1/depth), then 30 facets' light (linear)
uniform vec2 uOut;
uniform vec4 uSc;     // the scene's uv scale (x, y), the clouds' (x, y)
uniform vec2 uCl;     // the clouds' last texel (x, y)
uniform vec3 uLand;   // the land hides (1 on), the clouds hide (1 on), the canvas's px over the device's (the edge)
uniform vec4 uBl;     // the bloom's uv scale (x, y), its gain, the light wrap (1 on)
uniform vec4 uGl;     // the light wrap: the bloom's light from, to; the paper thinned by, lifted by
uniform vec4 uMode;   // forced colours (1); the glow's grey as encoded at night; the halo's strength; -
uniform vec4 uGr; uniform vec3 uLift, uGain;
flat in vec4 vK1, vCol, vZ, vC, vW, vAir, vL;
out vec4 oC;
