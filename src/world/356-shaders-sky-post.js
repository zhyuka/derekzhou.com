  /* ---------------------------------------------------------------- shaders: the sky, glows, beams, volumes, post */
  /* the phase-2 sky (the galaxy, the aurora: noise reads in a loop under varying branches) compiled only in phase 2:
     a compiler that flattens such branches makes every sky pixel of every sky pay for them (every sky 23-34% dearer
     than the base on a phone's canvas, fair included) */
  var SKY_BODY = (SKY_PHASE >= 2 ? '\n#define SKY_PH2\n' : '') + `@glsl sky-body`;
  var FS_SKY = HEAD + FRAME_U + LIB + SKY_BODY;
  /* the depth, linearised to metres, at half resolution: the nearest of each 2x2 (so cloud never shows in front) */
  var FS_DEPTHDOWN = HEAD + FRAME_U + `@glsl fs-depthdown`;
  var LIB_LIND = `@glsl lib-lind`;
  /* glow sprites: points of light by the thousand (a cell's fireflies, a carpet of light-flowers, a field of embers,
     the lights of a far wall), each a soft core and a faint halo facing the camera, its size in metres with a floor in
     pixels (a far one keeps its light spread over the floor: never a fat bright dot), steady, twinkling, pulsing,
     blinking, drifting about its place or bobbing; depth-tested against the scene and taken by the air, added to the
     HDR scene (so the bloom takes the bright ones) */
  var VS_GLOW = HEAD + FRAME_U + LIB + `@glsl vs-glow`;
  var FS_GLOW = HEAD + `@glsl fs-glow`;
  /* beams: soft shafts of light as geometry (a lantern's beam to a crystal, light falling through a hole in a canopy,
     a tower's beam into the fog): a cone from A (radius rA) to B (rB), its light gathered along each pixel's ray inside
     it (eight samples: a bell-curve falloff across it, a white core, its far end faded, dust drifting along it, a shimmer), cut
     by the scene's depth (the half-resolution linear depth: no beam through a wall), taken by the air, added to the
     HDR scene; a beam drawn on from A (woken when the camera first comes near: a light event) */
  var VS_BEAM = HEAD + FRAME_U + `@glsl vs-beam`;
  var FS_BEAM = HEAD + FRAME_U + LIB + LIB_LIND + `@glsl fs-beam`;
  /* cloud volumes: each body's lobes baked once into a small 3D texture (density; the optical depth toward the sun
     and toward the sky), then ray-marched inside the body's box at half resolution */
  var FS_VDENS = HEAD + FRAME_U + LIB + `@glsl fs-vdens`;
  var FS_VLIGHT = HEAD + FRAME_U + `@glsl fs-vlight`;
  /* the clouds' opaque cores, into the depth only */
  var VS_OCC = HEAD + FRAME_U + `@glsl vs-occ`;
  var FS_OCC = HEAD + `@glsl fs-occ`;
  var VS_VBODY = HEAD + FRAME_U + `@glsl vs-vbody`;
  var FS_VBODY = HEAD + airGlsl() + FRAME_U + LIB + LIB_LIND + `@glsl fs-vbody`;
  /* bloom (dual filter): the first pass composes scene and cloud and keeps what is bright; every tap clamped to the
     part of its target this frame drew (a lower rung draws only part of each) */
  var FS_PRE = HEAD + FRAME_U + `@glsl fs-pre`;
  var FS_DOWN = HEAD + `@glsl fs-down`;
  var FS_UP = HEAD + `@glsl fs-up`;
  /* the composite */
  /* the finished frame (the world's resolution) put up to the canvas (the device's): bilinear, as the browser's own
     upscale is (the birds' ink is then drawn over it at the canvas's resolution) */
  /* the half-resolution clouds accumulated over frames: this frame's cloud (uCloud) and the last
     accumulation (uHist, the same pixel), the latter held to this frame's 3 x 3 neighbourhood (each channel's least and
     most: a cloud that moved or changed is never ghosted beyond what this frame has about it), mixed at uCA.x (this
     frame's share). The march samples a far tower's relief and a cloud's rim at half resolution, and as the view moves
     its detail crawls from one frame to the next in single texels (491 x 1065: the cloud-edge film's moving excess
     1.14 codes, the far tower's face and the rims); a few frames' average is what a finer march would show.
     Reprojected by the view's turn: read at the same pixel, the history in a drag (69 deg/s, 4-5 half-resolution
     texels a frame) leaves the clamp holding a smear of the last frames (the drag film's moving, blur-matched and
     flicker readings 1.5-2.6x those without the accumulation). Each pixel's ray is put into the last frame's view (uRM, the two views' rotations; the clouds stand 100 m and more off, so the camera's own travel in a
     frame, under a metre, is a fraction of a texel there and inside the clamp) and the history read there by a
     cubic interpolating spline; where it falls outside the last view this frame stands alone. Held still, the ray lands on its own texel's centre
     and the read is the texel itself: steady flight reads the same pixel */
  var FS_CACC = HEAD + LIB_LIND + `@glsl fs-cacc`;
  var FS_BLIT = HEAD + `@glsl fs-blit`;
  var FS_COMP = HEAD + FRAME_U + LIB + LIB_LIND + `@glsl fs-comp`;

