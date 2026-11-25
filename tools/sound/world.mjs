// world.mjs: the world running in headless Chromium, for the sound's tools (page.mjs --world, cpu.mjs). Not served.
// On a CPU renderer the world keeps its still sky (src/world/520-start.js), so a headless press would hear the score
// with nothing beside it; a phone has the world running. As the gate's harness does (.github/ci/harness.mjs): Chromium
// on SwiftShader under a phone GPU's name, fences reported signalled and parallel compiles complete, in a 180x390
// window (a phone's shape, few pixels: the world's own work on the main thread runs as on a phone, its governor
// filling each frame, and its pixels, a phone GPU's work, cost SwiftShader little; at 390x844 they took the machine).
export const WORLD_ARGS = ['--use-gl=angle', '--use-angle=swiftshader-webgl', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
export const WORLD_VIEWPORT = { width: 180, height: 390 };
export function worldStub() {   // (an init script: page.addInitScript(worldStub))
  if (!window.WebGL2RenderingContext) return;
  const G = WebGL2RenderingContext.prototype, gp = G.getParameter, gpp = G.getProgramParameter, gsp = G.getShaderParameter, gsy = G.getSyncParameter, ge = G.getExtension, gse = G.getSupportedExtensions;
  G.getParameter = function (q) { if (q === 0x9246) return 'ANGLE (Qualcomm, Adreno (TM) 610, OpenGL ES 3.2)'; if (q === 0x9245) return 'Google Inc. (Qualcomm)'; return gp.call(this, q); };
  G.clientWaitSync = function () { return 0x911A; };
  G.getSyncParameter = function (s, q) { return q === 0x9114 ? 0x9119 : gsy.call(this, s, q); };
  G.getProgramParameter = function (p, q) { return q === 0x91B1 ? true : gpp.call(this, p, q); };
  G.getShaderParameter = function (s, q) { return q === 0x91B1 ? true : gsp.call(this, s, q); };
  const PAR = { COMPLETION_STATUS_KHR: 0x91B1, maxShaderCompilerThreadsKHR() {} };
  G.getExtension = function (n) { return n === 'KHR_parallel_shader_compile' ? PAR : ge.call(this, n); };
  G.getSupportedExtensions = function () { const l = gse.call(this); return l && l.concat(['KHR_parallel_shader_compile']); };
}
