  /* ---------------------------------------------------------------- GLSL: the shared library */
  var HEAD = '#version 300 es\nprecision highp float;\nprecision highp int;\nprecision highp sampler3D;\nprecision highp sampler2D;\n';
  var FRAME_U = `@glsl frame-u`;
  /* the air: the sky's light, its glow, the fog and the ground haze, the ambient (its own string, so a program that
     needs only these, the birds' ink, compiles only these) */
  var LIB_AIR = `@glsl lib-air`;
  var LIB = `@glsl lib` + LIB_AIR + `@glsl lib-2`;
  var VS_FULL = HEAD + 'void main() { vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }';
  // the sky's triangle lies on the far plane: drawn after the land, it is shaded only where nothing else stands
  var VS_FAR = HEAD + 'void main() { vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(p * 2.0 - 1.0, 1.0, 1.0); }';

