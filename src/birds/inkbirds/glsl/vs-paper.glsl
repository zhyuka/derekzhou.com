
const vec3 LUM = vec3(0.2126, 0.7152, 0.0722);
layout(location = 0) in vec4 aBox;  // the 46 points' box (device px, y up): lo, hi
layout(location = 1) in vec4 aK1;   // its row of the points' texture; its topology (1: slotted); the pen floor (device px); the filter (device px)
layout(location = 2) in vec4 aE;    // the bird's one tone (linear, before the air and the grade: the paper lit), its opacity
layout(location = 3) in vec4 aB;    // its body from the camera (m), the land's slack (m)
layout(location = 4) in vec4 aC;    // how much of the cloud before it stands in front of it: at the left tip, the body, the right tip; the night (0 .. 1)
layout(location = 5) in vec4 aM;    // the halo's e-folding (device px); the hold (the light's scale, 1 none); the gift's write-on (s, -1 none); its way along the M
layout(location = 6) in vec4 aL;    // the facets' share (lodK), -, -, -
uniform vec2 uOut;                  // the canvas (device px)
uniform vec4 uGr;                   // the composite's exposure, saturation; -; the air (1 on)
uniform vec3 uLift, uGain;
uniform vec4 uMode;                 // forced colours (1); the glow's grey as encoded at night; the halo's strength; -
uniform vec3 uInkF;                 // forced colours: CanvasText (sRGB)
flat out vec4 vK1, vCol, vZ, vC, vW, vAir, vL;
