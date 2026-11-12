// world.d.ts: what tsc --checkJs needs to read the assembled world (node tools/tsc.mjs), never built or served.
// The browser APIs the world reads that TypeScript's DOM types lack, and the plan's spans' module wrapper (each span
// runs as the world's own code and, in the plan's worker, as a CommonJS module: `typeof module`, `require`).
declare var module: any;
declare function require(name: string): any;
interface Navigator { deviceMemory?: number; gpu?: unknown }
interface PerformanceEntry { domInteractive?: number; domContentLoadedEventStart?: number; loadEventStart?: number }
interface EventListenerOptions { passive?: boolean }
interface Window { WORLD: unknown }
