// plan.mjs: the plan's worker (fast500 step 11), made from the world's own code. tools/build.mjs writes it into every
// build (never committed), under the name the world starts it by (new Worker('/plan.js')). A Node port of lane F's
// mkplan.py, output byte for byte the same.
// The worker runs the world's first plan (the maps, the director and its first tick, the weights' grids KW/KG/KF about
// the landing) off the page's main thread and hands it back; the page adopts it only if it is this world's plan, so the
// worker's code is the world's code, verbatim:
//   span 0  the world's angle constants (`  var PI = Math.PI, DEG = Math.PI / 180;`, its one line),
//   span 1  the maps and the director (`  var CW = (function () {` .. its `  })();`),
//   span 2  MAPS, mapsInit and kitAt (`  var MAPS = {` .. kitAt's end),
//   span 3  the weights' grids and their bake (`  var KN = 256, KSTEP = 64,` .. up to `  var KFROWS`),
// each copied byte for byte (span 0 first), inside one strict function. Their md5 (first 12 hex) is the plan's stamp:
// the worker answers with it and the page compares it with its own PW_V, so a worker of another world is never adopted
// (the page then makes the plan itself). The build fails when the world's PW_V is not the spans' stamp: after a change
// to those spans, run node tools/plan.mjs --stamp (it rewrites PW_V in its src/world/ part). CI's world_rules.py rule
// 2b checks the same spans and stamp on its own (it repeats the anchors).
//   node tools/plan.mjs WORLD_JS OUT_JS     write the worker made from WORLD_JS (an assembled world.js)
//   node tools/plan.mjs --stamp             set src/world/'s PW_V to the stamp of the spans in src/ assembled
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import * as acorn from 'acorn';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const A0 = '  var PI = Math.PI, DEG = Math.PI / 180;\n';
const A1 = '  var CW = (function () {\n', A2 = '  var MAPS = {', A3 = '  var KN = 256, KSTEP = 64,';
const E1 = '\n  })();\n', E2 = '    return w.kit(MAPS.mc, MAPS.pc, MAPS.kw);\n  }\n', E3 = '  var KFROWS = FN * FN / KN;';
const count = (s, a) => s.split(a).length - 1;

export function spans(s) {
  for (const a of [A0, A1, A2, A3]) if (count(s, a) !== 1) throw new Error('plan: anchor ' + JSON.stringify(a.slice(0, 40)) + ' found ' + count(s, a) + ' times');
  let i = s.indexOf(A1); const s1 = s.slice(i, s.indexOf(E1, i) + E1.length);
  i = s.indexOf(A2); const s2 = s.slice(i, s.indexOf(E2, i) + E2.length);
  i = s.indexOf(A3); const s3 = s.slice(i, s.indexOf(E3, i));
  return [A0, s1, s2, s3];
}
/* the spans' stamp: the md5 (first 12 hex) of their CODE alone, token by token (acorn's tokenizer: no comment, no spacing),
   so a comment or a line's layout changed in the spans leaves PW_V as it was, and only a change to what runs moves it */
export const stamp = (sp) => {
  const code = sp.join(''), toks = [];
  for (const t of acorn.tokenizer(code, { ecmaVersion: 'latest' })) toks.push(code.slice(t.start, t.end));
  return crypto.createHash('md5').update(toks.join(' '), 'utf8').digest('hex').slice(0, 12);
};

const HEAD = (name, st) => `// ${name}: the world's first plan, made in a worker (fast500 step 11). Made by tools/plan.mjs from world.js:
// its four code spans (the maps and the director; MAPS, mapsInit, kitAt; the weights' grids), minified as the world
// is, so the plan made here is the page's own, double for double. It is asked once, with the visit's seed, and answers once.
(function () {
  'use strict';
  var PLANV = '${st}';
`;
const TAIL = `  /* the one request: the seed, the first view's yaw and its half-width (the widest any window has). (world-perf lane)
     Two answers. The first: what the page's first frame reads, made as the page's planFirst makes it (mapsInit and
     kwFirst about the landing), the first tick whole (its rest committed: the director's state is whole), copied out:
     the director's state, the four gradient maxima, the grids' arrays, kwFirst's own state and the rest's order. The
     second (when kwFirst left a rest): the window's every texel, baked here (kwFollow, whole), its arrays transferred */
  addEventListener('message', function (e) {
    var q = e.data;
    if (!q || q.v !== PLANV || typeof q.seed !== 'number' || typeof q.yaw !== 'number' || typeof q.half !== 'number') { postMessage({ v: PLANV, seed: -1 }); return; }
    planFirst(q.seed, 0, 0, q.yaw, q.half);
    if (MAPS.D.rest) MAPS.D.tickRest(Infinity);
    var part = KW.part, kwr = KWR;
    var a = { kw: [KW.data.slice(), KW.ix.slice(), KW.dx.slice()], kg: [KG.v.slice(), KG.ix.slice()], kf: [KF.data.slice(), KF.ix.slice(), KF.dx.slice()] };
    var m = { v: PLANV, seed: q.seed, part: 1, inj: { W: { mg: MAPS.w.mg }, D: MAPS.D.exportState() },
      kw: { data: a.kw[0], ix: a.kw[1], dx: a.kw[2], baked: KW.baked, derived: KW.derived, dirty: KW.dirty.slice() },
      kg: { v: a.kg[0], ix: a.kg[1] },
      kf: { data: a.kf[0], ix: a.kf[1], dx: a.kf[2], baked: KF.baked, derived: KF.derived, dirty: KF.dirty },
      first: { i0: KW.i0, j0: KW.j0, fy: KW.fy, fh: KW.fh, first: KW.first, part: part }, kwr: kwr };
    postMessage(m, [a.kw[0].buffer, a.kw[1].buffer, a.kw[2].buffer, a.kg[0].buffer, a.kg[1].buffer, a.kf[0].buffer, a.kf[1].buffer, a.kf[2].buffer].concat(kwr ? [kwr.buffer] : []));
    if (part) {
      KW.part = false; KWR = null; kwFollow(0, 0, true);   // (the rest of the window: kwFollow, whole, as the first answer's grid left it)
      postMessage({ v: PLANV, seed: q.seed, part: 2, kw: { data: KW.data, ix: KW.ix, dx: KW.dx }, kg: { v: KG.v, ix: KG.ix } }, [KW.data.buffer, KW.ix.buffer, KW.dx.buffer, KG.v.buffer, KG.ix.buffer]);
    }
    close();
  });
})();
`;

// the worker's file name: the one the world starts (new Worker('/NAME')); null when the world starts none
export function workerName(world) {
  const m = [...world.matchAll(/new Worker\((['"])\/(plan[^'"]*\.js)\1\)/g)].map((x) => x[2]);
  if (new Set(m).size > 1) throw new Error('plan: the world starts more than one plan worker: ' + [...new Set(m)].join(', '));
  return m[0] || null;
}

// the worker made from an assembled world.js; throws when the world's PW_V is not the spans' stamp
export function makePlan(world, name) {
  if (world.includes('\r')) throw new Error('plan: the world has CR line ends');
  const sp = spans(world), st = stamp(sp);
  const pv = [...world.matchAll(/var PW_V = '([0-9a-f]*)';/g)].map((x) => x[1]);
  if (pv.length !== 1) throw new Error('plan: PW_V found ' + pv.length + ' times in the world');
  if (pv[0] !== st) throw new Error(`plan: the world's PW_V is ${pv[0]}, its plan spans' stamp ${st} (they changed: node tools/plan.mjs --stamp, then commit the part)`);
  return { text: HEAD(name, st) + sp.join('') + TAIL, stamp: st };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const a = process.argv.slice(2), die = (m) => { console.error(m); process.exit(1); };
  if (a[0] === '--stamp' && a.length === 1) {
    const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-'));
    try {
      execFileSync(process.execPath, [path.join(root, 'tools', 'parts.mjs'), 'assemble', path.join(root, 'src'), tmp], { stdio: 'ignore' });
      const st = stamp(spans(fs.readFileSync(path.join(tmp, 'world.js'), 'utf8')));
      const dir = path.join(root, 'src', 'world'), hits = fs.readdirSync(dir).filter((n) => /\.js$/.test(n) && /var PW_V = '[0-9a-f]*';/.test(fs.readFileSync(path.join(dir, n), 'utf8')));
      if (hits.length !== 1) die('plan: PW_V found in ' + hits.length + ' parts of src/world/');
      const p = path.join(dir, hits[0]), t = fs.readFileSync(p, 'utf8');
      fs.writeFileSync(p, t.replace(/var PW_V = '[0-9a-f]*';/, `var PW_V = '${st}';`));
      console.log('plan: ' + path.relative(root, p) + ' PW_V = ' + st);
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  } else if (a.length === 2 && !a[0].startsWith('--')) {
    const w = fs.readFileSync(a[0], 'utf8'), name = workerName(w) || path.basename(a[1]);
    let r; try { r = makePlan(w, name); } catch (e) { die(e.message); }
    fs.writeFileSync(a[1], r.text);
    console.log('plan: ' + a[1] + ' (stamp ' + r.stamp + ', ' + Buffer.byteLength(r.text) + ' bytes)');
  } else die('usage: plan.mjs WORLD_JS OUT_JS | --stamp');
}

// The worker as the build ships it: makePlan's text minified by terser (pinned in package.json; the world's own
// options: compress and mangle inside the worker's one function, ES5 output, Safari 10's workarounds, quotes kept),
// its header comment kept. The code is the world's spans, so terser does to them what it does to the world itself;
// test/unit/maps.mjs runs this output against the page's own plan, hash for hash.
const TERSER_VERSION = '5.51.2';
export async function buildPlan(world, name) {
  const r = makePlan(world, name), { createRequire } = await import('node:module');
  let dir; try { dir = path.dirname(createRequire(fileURLToPath(import.meta.url)).resolve('terser/package.json')); } catch (e) { throw new Error('plan: terser not found (npm ci)'); }
  const ver = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).version;
  if (ver !== TERSER_VERSION) throw new Error('plan: terser ' + ver + ' (pinned: ' + TERSER_VERSION + ')');
  const T = await import('terser'), minify = T.minify || (T.default && T.default.minify);
  const head = r.text.indexOf('(function () {');
  const out = await minify(r.text, { ecma: 5, module: false, toplevel: false, safari10: true, ie8: false,
    compress: { passes: 2, unsafe: false, drop_console: false, keep_fargs: true, keep_infinity: true },
    mangle: { safari10: true, toplevel: false },
    format: { comments: (n, c) => c.pos < head, quote_style: 3, ascii_only: false, beautify: false, semicolons: true, ecma: 5, safari10: true } });
  let text = out.code;
  if (!text.endsWith('\n')) text += '\n';
  if (!text.includes("PLANV='" + r.stamp + "'") && !text.includes('"' + r.stamp + '"') && !text.includes("'" + r.stamp + "'")) throw new Error('plan: the stamp is not in the minified worker');
  return { text, stamp: r.stamp };
}
