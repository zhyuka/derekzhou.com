// world.d.ts: what tsc --checkJs needs to read the assembled world (node tools/tsc.mjs), never built or served.
// The browser APIs the world reads that TypeScript's DOM types lack, and the plan's spans' require (renamed in
// tools/tsc.mjs's copy: each span also runs, in the plan's worker and the unit tests, as a CommonJS module).
declare function CJS_REQUIRE(name: string): any;   // (tools/tsc.mjs's copy: the spans' require, renamed)
interface Navigator { deviceMemory?: number; gpu?: unknown }
interface PerformanceEntry { domInteractive?: number; domContentLoadedEventStart?: number; loadEventStart?: number }
interface EventListenerOptions { passive?: boolean }
interface Window { WORLD: unknown }
// The world's shared objects (their members are set across sections, so tsc cannot infer them from one literal):
// a render target (080's target(), 383's sceneTwin) and a multisampled one (383's targetMS); the window's targets,
// TG (383's allocTargets; held: 450's free of them while the world is held); the context's extensions, EXT (050).
interface RT { w: number; h: number; f: WebGLFramebuffer; t?: WebGLTexture; d?: WebGLTexture; twin?: boolean }
interface MSRT { w: number; h: number; n: number; f: WebGLFramebuffer; c: WebGLRenderbuffer; d: WebGLRenderbuffer }
interface Targets { W: number; H: number; scene: RT; lind: RT; cloud: RT; bd: RT[]; bu: RT[]; ms: MSRT | null; sceneH: RT | null;
  ch: RT[]; hz: WebGLTexture; sb: RT; win: RT; held?: boolean }
interface Ext { cbf: EXT_color_buffer_float | null; cbh: EXT_color_buffer_half_float | null; par: KHR_parallel_shader_compile | null;
  parAll: KHR_parallel_shader_compile | null; renderer: string; issueAll: boolean; hp: boolean }
// the ink birds' module as the engine sees it (inkbirds.js's factory returns it; 490's header names the four hooks):
// BIRDS, the boot's, and BIRDL, one made late (495)
interface BirdsModule { step(dt: number): void; draw(): void; visit(k: number): void; lost(): void; boot?(): void; prepare?(): boolean }
