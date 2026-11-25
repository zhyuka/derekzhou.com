// world.d.ts: what tsc --checkJs needs to read the assembled world (node tools/tsc.mjs), never built or served.
// The browser APIs the world reads that TypeScript's DOM types lack, and the plan's spans' require (renamed in
// tools/tsc.mjs's copy: each span also runs, in the plan's worker and the unit tests, as a CommonJS module).
declare function CJS_REQUIRE(name: string): any;   // (tools/tsc.mjs's copy: the spans' require, renamed)
declare var CJS_MODULE: any;   // (tools/tsc.mjs's copies: module, renamed: the world's (130 sets it), the wing model's tails)
interface Navigator { deviceMemory?: number; gpu?: unknown }
interface PerformanceEntry { domInteractive?: number; domContentLoadedEventStart?: number; loadEventStart?: number; url?: string }   // (url: a paint entry's, 520's afterStill)
interface EventListenerOptions { passive?: boolean }
// window.WORLD (510): what the realm scripts and the ink birds register with and read; forms is set by realm-kit.js
interface WorldApi { realm(def: object): void; kit: KitApi; air: AirApi; events: EventsApi; dest(): { x: number, z: number, d: number, bearing: number, seed: number, kind: 'isle' | 'rock' }; birds: BirdsHook; sky(): SkyFeed | null;
  stamp(name: string): void; forms?: any }
// WORLD.air (215's AIRAPI): the one air, as the realms and the score read it. V is a visit (200's), t the flight's time
// (SIM.t when undefined); an object or array marked (reused) is the one the air fills in place, not a fresh one
type XZ = { x: number; z: number };
interface AirWx { mist: number; moist: number; oro: number; ridge: number; oroU: number; N: number; vis: number; dust: number }
interface AirHeard extends XZ { gust: number; sigma: number; phase: number; carry: number; y: number }
interface AirMoon { d: V3; w: number; az: number; el: number; up: boolean }
interface SkySphere { M: Float32Array; pole: V3; ecl: V3; galPole: V3; galCentre: V3; sun: V3; lat: number; lst: number; sunDec: number }
interface AirApi {
  draw(R: Stream, V: any): number[];   // (the visit's wind, toward: [x, z], unit)
  windAt(x: number, z: number, y: number, t: number | undefined, V: any): XZ;   // (reused)
  heard(x: number, z: number, y: number, t?: number, V?: any): AirHeard;
  wx(t: number | undefined, V: any): AirWx;   // (reused)
  MIST(): { [sky: string]: number };
  share(y: number, t: number): number; carried(y: number, t: number): number; clock(t: number): number[];   // (clock: reused)
  BYSKY(): { [sky: string]: number[] }; day(x: number, z: number, y: number, V: any): XZ;
  gustAt(x: number, z: number, y: number, t: number | undefined, V: any): number;
  gustPhase(x: number, z: number, y: number, t?: number, V?: any): number; gustSigma(y: number, V: any, t?: number): number;
  u10(V?: any): number; vec3(V: any, y: number, lift: number, k?: number): V3; upwind(V: any): number;
  H: { veils: number; birds: number; clouds: number; deck: number };
  KEY_EL: number[]; KEY_AZ: number; keyAt(V: any): V3; skySun(V: any, el: number | null): V3;
  moonAt(t: number): object; moonDir(): AirMoon;   // (moonDir: reused)
  skyFrame(tS: number, V?: any): number[]; skySphere(tS: number, V?: any): SkySphere;   // (both reused)
  weather(t: number): number[];   // ([s, j, g], reused)
  SKY_RATE: number; APART: { [reader: string]: string };
}
// WORLD.events (216's EVAPI): the sites of the land's events (a fog pool, a murmuration), copies of its tables
interface EventsApi {
  near(x: number, z: number, r: number): { tier: number; kind: string; x: number; z: number; id: string; d: number }[];   // (tier: an index of TIERS)
  poolDepth(s: any, mist: number): number;
  POOL: { r: number[]; catch: number; top: number }; REACH: number; TIERS: { name: string; D: number; kinds: string[] }[];
}
// WORLD.sky() (512): the score's read-only copy of the sky (docs/sound.md)
interface SkyFeed { t: number; seq: { id: string; at: number; hold: number; move: number; far: boolean }[]; wc: number; still: boolean; seed: number }
interface Window { WORLD: WorldApi; SCORE: ScoreApi; FACETFORM: FacetForm; FACETPOSE: FacetPoseFn; WINGMODEL: WingModelFn; WINGMODEL_DATA: WingModelData;
  LABBIRD: LabBirdFn; BIRDWING: BirdWingFn }
// WORLD.birds: the engine takes the ink birds' factory by it (490); inkbirds.js's hooks (300) set feed on it, the score's
// read of the birds (266): o.f the nearest flocks, o.w the nearest birds, o.kinds their kinds' order, written into o
interface BirdsHook { (factory: Function): void; feed?(o: BirdsFeed): BirdsFeed }
interface BirdsFeed { f: Float32Array; w: Float32Array; n: number; m: number; kinds?: string[] }
// the ink birds' wing model (src/birds/model/, served as written, loaded before inkbirds.js): each file sets one global on
// self (the page's window), and inkbirds.js reads them by name. The data files are generated (facetform.js: mkform.py,
// model.js: make.py); the four functions build the lab's bird and its wing from them, as birdwing.js's header writes:
// LB = LABBIRD(FACETFORM, FACETPOSE, WINGMODEL, MODEL), BW = BIRDWING(LB, MODEL)
interface FacetForm { kinds: { [kind: string]: { p16: number[]; chain: number[]; [k: string]: any } }; [k: string]: any }
interface WingModelData { kinds: { [kind: string]: any }; [k: string]: any }
type FacetPoseFn = (form: FacetForm) => any;
type WingModelFn = (model: WingModelData, P: any) => any;
type LabBirdFn = (form: FacetForm, facetpose: FacetPoseFn, wingmodel: WingModelFn, model: WingModelData) => any;
type BirdWingFn = (lb: any, model: WingModelData) => any;
declare var FACETFORM: FacetForm, FACETPOSE: FacetPoseFn, WINGMODEL: WingModelFn, WINGMODEL_DATA: WingModelData, LABBIRD: LabBirdFn, BIRDWING: BirdWingFn;
// window.SCORE (score.js): what the sound icon's switch (sound.js) plays; navigator.audioSession: WebKit's, not in the DOM types
interface ScoreApi { cuts: number[]; play(ctx: AudioContext, out: AudioNode, buffer: AudioBuffer | null, sliced?: boolean): any }   // cuts: the sheet's seconds up to its first parts (the switch decodes them as they arrive); play takes no buffer to fill its room and air first, then more(buffer, upto)
interface Navigator { audioSession?: { type: string } }
// The world's shared objects (their members are set across sections, so tsc cannot infer them from one literal):
// a render target (080's target(), 383's sceneTwin) and a multisampled one (383's targetMS); the window's targets,
// TG (383's allocTargets; held: 450's free of them while the world is held); the context's extensions, EXT (050).
interface RT { w: number; h: number; f: WebGLFramebuffer; t?: WebGLTexture; d?: WebGLTexture; twin?: boolean }
interface MSRT { w: number; h: number; n: number; f: WebGLFramebuffer; c: WebGLRenderbuffer; d: WebGLRenderbuffer }
interface Targets { W: number; H: number; scene: RT; lind: RT; cloud: RT; bd: RT[]; bu: RT[]; ms: MSRT | null; sceneH: RT | null;
  ch: RT[]; hz: WebGLTexture; sb: RT; win: RT; held?: boolean }
interface Ext { cbf: EXT_color_buffer_float | null; cbh: EXT_color_buffer_half_float | null; par: KHR_parallel_shader_compile | null;
  parAll: KHR_parallel_shader_compile | null; parWK: KHR_parallel_shader_compile | null; renderer: string; issueAll: boolean; wkMac: boolean; hp: boolean }
// the ink birds' module as the engine sees it (inkbirds.js's factory returns it; 490's header names the four hooks):
// BIRDS, the boot's, and BIRDL, one made late (495)
interface BirdsModule { step(dt: number): void; draw(): void; visit(k: number): void; lost(): void; boot?(): void; prepare?(): boolean;
  after?(seed: number): void }   // (after: the frame after the opening's cut, the visit's own read, 460)
// WORLD.kit (510's KITAPI): the engine's mesh builders and helpers, as the realm scripts call them. A mesh is built
// into a Builder (110), a colour is linear RGB (030), a vector is [x, y, z], a stream is 020's RNG
type V3 = number[];
interface Stream { f(): number; r(a: number, b: number): number; i(n: number): number; pick<T>(a: T[]): T; n(): number; sign(): number; seed(): number }
interface KitApi {
  box(B: any, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, bev?: number, col?: any): any;
  prism(B: any, poly: number[][], y0: number, tops: any, topScale?: any, dx?: number, dz?: number, col?: any, noBottom?: boolean): any;
  lathe(B: any, prof: number[][], seg: number, flat?: any, col?: any, phase?: number): any;
  rock(B: any, rng: Stream, r: number, flatten?: number, col?: any): any;
  cumulus(PF: any, rng: Stream, x: number, y0: number, z: number, W: number, H: number, o?: object): any;
  range(PF: any, rng: Stream, x0: number, y0: number, z0: number, dir: number, len: number, W: number, H: number, o?: object): any;
  lens(PF: any, rng: Stream, x: number, y0: number, z: number, dir: number, len: number, W: number, T: number, n: number, o?: object): any;
  wall(PF: any, rng: Stream, x0: number, y0: number, z0: number, dir: number, len: number, thick: number, H: number, o?: object): any;
  lch(L: number, C: number, h: number, k?: number): V3; norm(a: V3): V3; cross(a: V3, b: V3): V3; sub(a: V3, b: V3): V3;
  mul(a: V3, s: number): V3; smooth(a: number, b: number, x: number): number;
  RNG(seed: number): Stream; cellHash(ix: number, iz: number, salt: number): number; ihash(x: number): number; hfl(h: number): number;
  hk(h: number, k: number): number;
}
