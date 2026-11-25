// plan.d.ts: what tsc needs beside the plan's worker (tools/plan.mjs makePlan's text, checked by tools/tsc.mjs as a
// dedicated worker: --lib es2020,webworker). Never shipped: the worker is the world's own plan spans, verbatim.
declare var CJS_MODULE: any;   // (tools/tsc.mjs's copy: the spans' module, renamed, as the world's)
declare function CJS_REQUIRE(name: string): any;   // (the spans' require, renamed: Node's path only)
// The weights' grids span carries the main thread's frame guards (kwGuard, kwProbeGuard) and its boot mark; the worker
// never calls them (it answers one plan: planFirst, kwAdoptRest's texels), so the world's names they read are not there.
// Declared with the world's own shapes, so the spans check as the world checks them.
declare function bootMark(name: string): void;
declare function kwUpload(): void;
declare function angDiff(a: number, b: number): number;
declare function clamp(x: number, a: number, b: number): number;
declare var FRT: { tanX: number, tanY: number };
declare var PSCR: Float32Array;
declare var CS: { x: number, z: number, [k: string]: any };
declare var CAM: { pos: number[], [k: string]: any };
