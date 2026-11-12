// world.d.ts: what tsc --checkJs needs to read the assembled world (node tools/tsc.mjs), never built or served.
// The browser APIs the world reads that TypeScript's DOM types lack, and the plan's spans' require (renamed in
// tools/tsc.mjs's copy: each span also runs, in the plan's worker and the unit tests, as a CommonJS module).
declare function CJS_REQUIRE(name: string): any;   // (tools/tsc.mjs's copy: the spans' require, renamed)
interface Navigator { deviceMemory?: number; gpu?: unknown }
interface PerformanceEntry { domInteractive?: number; domContentLoadedEventStart?: number; loadEventStart?: number }
interface EventListenerOptions { passive?: boolean }
interface Window { WORLD: unknown }
