// tools/clouds/shimmer.mjs: does a change make the world's shading step from frame to frame (sparkle, crawl, fizz)
// where it changed? Base and head flown the same way (the opening's own cruise, nothing held), headless SwiftShader
// on T1's harness, no one's own machine.
//   node tools/clouds/shimmer.mjs --base REF --head REF --out DIR [--seeds 11,22] [--epoch ISO] [--vp 1440x900]
//        [--pairs 30] [--every 60] [--start 600] [--stepvp 160x100] [--edge 3] [--gap 1]
// Each arm steps the clock at the small --stepvp (the frames between cost little) and, --every frames apart, --pairs
// times, renders two frames --gap apart (1: consecutive at 60 fps, 2: at 30 fps) at --vp (once the world's canvas has taken --vp: its frames are checked to be). The flight is the same in both arms (shading never steers it), and both
// arms count from the page's own first frame (--start: past both shows), so pair k of base and of head see the same
// place from the same camera. The change's pixels in a pair: where head and
// base differ by over 2 levels (8 bits, the largest channel) in its first frame; its EDGE: those within --edge px of
// one that does not. A pixel STEPS when its largest channel moves over 2 levels between the pair's two frames.
// Reported per pair, at the edge pixels: the share stepping in head, the share stepping in base (the world's own
// motion there), and the excess: head's step over base's own step there, scaled by head's brightness over base's
// (a shadow multiplies the light, so it scales the world's own motion by as much), by over 2 levels: the step the
// change itself adds, its shimmer. Out: DIR/shimmer.json.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function args(argv) {
  const A = { seeds: '11,22', epoch: '2026-11-05T22:30:00Z', vp: '1440x900', pairs: 30, every: 60, start: 600, stepvp: '160x100', edge: 3, gap: 1 };
  for (let i = 0; i < argv.length; i++) { const k = argv[i].replace(/^--/, ''); A[k] = argv[++i]; }
  for (const k of ['base', 'head', 'out']) if (!A[k]) { console.error(`shimmer: --${k} is required`); process.exit(2); }
  return A;
}

// a ref's served build (plain), in a new temporary worktree
function siteOf(ref, tmp) {
  const wt = path.join(tmp, 'wt'), site = path.join(tmp, 'site');
  execFileSync('git', ['worktree', 'add', '--detach', '-q', wt, ref], { cwd: ROOT, stdio: 'ignore' });
  fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(wt, 'node_modules'));
  execFileSync(process.execPath, ['tools/build.mjs', '--plain', site], { cwd: wt, stdio: 'ignore' });
  return { site, wt };
}

// one pair's numbers from four PNG data URLs (base a, b; head a, b), in a blank page (canvas 2D: no image library)
const MEASURE = async ([ba, bb, ha, hb, E]) => {
  const load = (u) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = u; });
  const ims = await Promise.all([ba, bb, ha, hb].map(load)), w = ims[0].width, h = ims[0].height;
  const px = (im) => { const c = new OffscreenCanvas(w, h), g = c.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, w, h).data; };
  const [BA, BB, HA, HB] = ims.map(px), n = w * h;
  const d = (P, Q, i) => Math.max(Math.abs(P[i] - Q[i]), Math.abs(P[i + 1] - Q[i + 1]), Math.abs(P[i + 2] - Q[i + 2]));
  const ch = new Uint8Array(n);
  for (let p = 0; p < n; p++) ch[p] = d(BA, HA, p * 4) > 2 ? 1 : 0;
  let changed = 0, edge = 0, sh = 0, sb = 0, ex = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x; if (!ch[p]) continue; changed++;
    let e = false;
    for (let j = -E; j <= E && !e; j++) for (let i = -E; i <= E && !e; i++) { const xx = x + i, yy = y + j; if (xx >= 0 && yy >= 0 && xx < w && yy < h && !ch[yy * w + xx]) e = true; }
    if (!e) continue; edge++;
    const dh = d(HA, HB, p * 4), db = d(BA, BB, p * 4), q = p * 4;
    const r = Math.max(HA[q], HA[q + 1], HA[q + 2]) / Math.max(BA[q], BA[q + 1], BA[q + 2], 1);   // (the change's own scale here: the shadow multiplies the light, so it scales the world's own step by as much)
    if (dh > 2) sh++; if (db > 2) sb++; if (dh > db * r + 2) ex++;
  }
  return { changed, edge, headStep: sh, baseStep: sb, excess: ex };
};

async function main() {
  const A = args(process.argv.slice(2));
  const { launch, openPage, stepToShow, step } = await import(pathToFileURL(path.join(ROOT, '.github/ci/harness.mjs')).href);
  const { serve } = await import(pathToFileURL(path.join(ROOT, '.github/ci/serve.mjs')).href);
  const [vw, vh] = A.vp.split('x').map(Number), SV = A.stepvp.split('x').map(Number), EPOCH = Date.parse(A.epoch);
  const pairs = +A.pairs, every = +A.every, GAP = +A.gap, START = +A.start, E = +A.edge, seeds = String(A.seeds).split(',').map(Number);
  fs.mkdirSync(A.out, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'shimmer-')), tb = path.join(tmp, 'base'), th = path.join(tmp, 'head');
  fs.mkdirSync(tb); fs.mkdirSync(th);
  const B = siteOf(A.base, tb), H = siteOf(A.head, th);
  const browser = await launch(), sb = await serve(B.site), sh = await serve(H.site);
  const png = (arm) => arm.page.evaluate(() => document.querySelector('canvas.sky').toDataURL('image/png'));
  const size = (arm, wh) => arm.page.setViewportSize({ width: wh[0], height: wh[1] });
  // the world sizes its canvas on its own frames: step until the canvas holds the viewport, then 3 more frames
  const settle = async (arm, w, h) => { for (let i = 0; i < 120; i++) { if (await arm.page.evaluate(([w, h]) => { const c = document.querySelector('canvas.sky'); return c.width === w && c.height === h; }, [w, h])) { await step(arm, 3); return; } await step(arm, 1); } throw new Error(`shimmer: the canvas never took ${w}x${h}`); };
  const dims = (u) => { const b = Buffer.from(u.split(',')[1], 'base64'); return b.readUInt32BE(16); };   // (a PNG's width: IHDR)
  const T0 = Date.now(), say = (m) => console.error(`shimmer: ${((Date.now() - T0) / 1000).toFixed(0)} s ${m}`);
  // one arm's pairs: [[a, b], ...] (data URLs)
  const fly = async (url, seed, tag) => {
    const arm = await openPage(browser, url, { vp: [SV[0], SV[1], 1], epoch: EPOCH, seeds: [seed] });
    if ((await stepToShow(arm)) < 0) throw new Error(`shimmer: ${tag} never showed`);
    if (arm.frames > START) throw new Error(`shimmer: ${tag} showed at frame ${arm.frames}, after --start ${START}`);
    await step(arm, START - arm.frames);   // (both arms from the same page frame, not from their own shows: a boot that shows later is the same flight, later)
    const out = [];
    for (let k = 0; k < pairs; k++) {
      await step(arm, every); await size(arm, [vw, vh]); await settle(arm, vw, vh);
      const a = await png(arm); await step(arm, GAP); const b = await png(arm); await size(arm, SV); await settle(arm, SV[0], SV[1]);
      const [wa, wb] = await Promise.all([a, b].map((u) => dims(u))); if (wa !== wb || wa !== vw) throw new Error(`shimmer: ${tag} pair ${k}: frames ${wa} and ${wb} px wide, want ${vw}`);
      out.push([a, b]);
    }
    const errs = arm.logs; await arm.ctx.close(); say(`${tag} flown (${pairs} pairs)`); return { out, errs, shownAt: arm.shownAt };
  };
  const rec = { base: A.base, head: A.head, vp: A.vp, epoch: A.epoch, pairs, every, gap: GAP, edge: E, flights: [] };
  try {
    const page = await (await browser.newContext()).newPage();
    for (const seed of seeds) {
      const fb = await fly(sb.url, seed, `base seed ${seed}`), fh = await fly(sh.url, seed, `head seed ${seed}`);
      if (fb.shownAt !== fh.shownAt) throw new Error(`shimmer: seed ${seed}: base showed at frame ${fb.shownAt}, head at ${fh.shownAt}: the camera's flight starts at the show, so the arms would not see the same place (run alone, nothing else on the CPU)`);
      const per = [];
      for (let k = 0; k < pairs; k++) per.push(await page.evaluate(MEASURE, [fb.out[k][0], fb.out[k][1], fh.out[k][0], fh.out[k][1], E]));
      if (seed === seeds[0]) { const save = (u, f) => fs.writeFileSync(path.join(A.out, f), Buffer.from(u.split(',')[1], 'base64')); save(fb.out[0][0], 'base.0.png'); save(fh.out[0][0], 'head.0.png'); save(fh.out[0][1], 'head.0b.png'); }
      const tot = per.reduce((s, r) => ({ edge: s.edge + r.edge, headStep: s.headStep + r.headStep, baseStep: s.baseStep + r.baseStep, excess: s.excess + r.excess }), { edge: 0, headStep: 0, baseStep: 0, excess: 0 });
      const over = per.filter((r) => r.edge && r.excess / r.edge > 0.001).length;
      rec.flights.push({ seed, shownAt: [fb.shownAt, fh.shownAt], errors: [fb.errs, fh.errs], per, total: tot, pairsOverTenthPercent: over });
      console.log(`seed ${seed}: edge px ${tot.edge}; stepping >2 levels: head ${(100 * tot.headStep / Math.max(tot.edge, 1)).toFixed(3)}%, base ${(100 * tot.baseStep / Math.max(tot.edge, 1)).toFixed(3)}%, excess ${(100 * tot.excess / Math.max(tot.edge, 1)).toFixed(3)}%; pairs with excess over 0.1% of their edge px: ${over} of ${pairs}`);
    }
    fs.writeFileSync(path.join(A.out, 'shimmer.json'), JSON.stringify(rec, null, 1) + '\n');
  } finally {
    await sb.close(); await sh.close(); await browser.close();
    for (const a of [B, H]) execFileSync('git', ['worktree', 'remove', '--force', a.wt], { cwd: ROOT, stdio: 'ignore' });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e.message); process.exit(1); });
