// world.d.ts: what tsc --checkJs needs to read the assembled world (node tools/tsc.mjs), never built or served.
// The browser APIs the world reads that TypeScript's DOM types lack, and the plan's spans' require (renamed in
// tools/tsc.mjs's copy: each span also runs, in the plan's worker and the unit tests, as a CommonJS module).
declare function CJS_REQUIRE(name: string): any;   // (tools/tsc.mjs's copy: the spans' require, renamed)
interface Navigator { deviceMemory?: number; gpu?: unknown }
interface PerformanceEntry { domInteractive?: number; domContentLoadedEventStart?: number; loadEventStart?: number; url?: string }   // (url: a paint entry's, 520's afterStill)
interface EventListenerOptions { passive?: boolean }
// window.WORLD (510): what the realm scripts and the ink birds register with and read; forms is set by realm-kit.js
interface WorldApi { realm(def: object): void; kit: KitApi; birds(factory: Function): void; sky(): SkyFeed | null; stamp(name: string): void; forms?: any }
// WORLD.sky() (512): the score's read-only copy of the sky (docs/sound.md)
interface SkyFeed { t: number; seq: { id: string; at: number; hold: number; move: number; far: boolean }[]; wc: number; still: boolean; seed: number }
interface Window { WORLD: WorldApi }
// The world's shared objects (their members are set across sections, so tsc cannot infer them from one literal):
// a render target (080's target(), 383's sceneTwin) and a multisampled one (383's targetMS); the window's targets,
// TG (383's allocTargets; held: 450's free of them while the world is held); the context's extensions, EXT (050).
interface RT { w: number; h: number; f: WebGLFramebuffer; t?: WebGLTexture; d?: WebGLTexture; twin?: boolean }
interface MSRT { w: number; h: number; n: number; f: WebGLFramebuffer; c: WebGLRenderbuffer; d: WebGLRenderbuffer }
interface Targets { W: number; H: number; scene: RT; lind: RT; cloud: RT; bd: RT[]; bu: RT[]; ms: MSRT | null; sceneH: RT | null;
  ch: RT[]; hz: WebGLTexture; sb: RT; win: RT; held?: boolean }
interface Ext { cbf: EXT_color_buffer_float | null; cbh: EXT_color_buffer_half_float | null; par: KHR_parallel_shader_compile | null;
  parAll: KHR_parallel_shader_compile | null; renderer: string; issueAll: boolean; wkMac: boolean; hp: boolean }
// the ink birds' module as the engine sees it (inkbirds.js's factory returns it; 490's header names the four hooks):
// BIRDS, the boot's, and BIRDL, one made late (495)
interface BirdsModule { step(dt: number): void; draw(): void; visit(k: number): void; lost(): void; boot?(): void; prepare?(): boolean;
  after?(seed: number): void }   // (after: the frame after the opening's cut, the visit's own read, 460)
// WORLD.kit (510's KITAPI): the engine's mesh builders and helpers, as the realm scripts call them. A mesh is built
// into a Builder (110), a colour is linear RGB (030), a vector is [x, y, z], a stream is 020's RNG
type V3 = number[];
interface Stream { f(): number; r(a: number, b: number): number; i(n: number): number; pick<T>(a: T[]): T; n(): number; sign(): number; seed(): number }
interface KitApi {
  Builder: new (cap?: number) => any;
  box(B: any, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, bev?: number, col?: any): any;
  prism(B: any, poly: number[][], y0: number, tops: any, topScale?: any, dx?: number, dz?: number, col?: any, noBottom?: boolean): any;
  lathe(B: any, prof: number[][], seg: number, flat?: any, col?: any, phase?: number): any;
  rock(B: any, rng: Stream, r: number, flatten?: number, col?: any): any;
  cumulus(PF: any, rng: Stream, x: number, y0: number, z: number, W: number, H: number, o?: object): any;
  bank(PF: any, rng: Stream, x: number, y: number, z: number, W: number, H: number, D: number, R0?: number, n?: number): any;
  range(PF: any, rng: Stream, x0: number, y0: number, z0: number, dir: number, len: number, W: number, H: number, o?: object): any;
  wall(PF: any, rng: Stream, x0: number, y0: number, z0: number, dir: number, len: number, thick: number, H: number, o?: object): any;
  mound(PF: any, rng: Stream, x: number, y0: number, z: number, W: number, H: number, o?: object): any;
  lch(L: number, C: number, h: number, k?: number): V3; lab(L: number, C: number, h: number): V3; hex(h: string): V3; lum(c: V3): number;
  dirAzEl(az: number, el: number): V3; norm(a: V3): V3; cross(a: V3, b: V3): V3; add(a: V3, b: V3): V3; sub(a: V3, b: V3): V3;
  mul(a: V3, s: number): V3; dot(a: V3, b: V3): number;
  clamp(x: number, a: number, b: number): number; smooth(a: number, b: number, x: number): number; lerp(a: number, b: number, t: number): number;
  RNG(seed: number): Stream; cellHash(ix: number, iz: number, salt: number): number; ihash(x: number): number; hfl(h: number): number;
  hk(h: number, k: number): number; angDiff(a: number, b: number): number; glowBake(B: any, v0: number, v1: number, lamps: any): any;
}
