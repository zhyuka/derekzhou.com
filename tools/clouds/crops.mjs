// tools/clouds/crops.mjs: base|head crops of the world in a cloud session (headless SwiftShader on T1's harness), for a
// visible PR's review branch (claude/review-<N>-crops), with no GPU and no one's own machine.
//   node tools/clouds/crops.mjs --base REF --head REF --out DIR [--seed N] [--aim KIND | --cam X,Z,PSI] [--dist M]
//        [--vp 960x600] [--frames 600] [--epoch ISO] [--crop X0,Y0,X1,Y1] [--walk 16] [--shots 1 --every 1250] [--stepvp 160x100]
// Each REF (a commit, branch or tag) is checked out in a temporary worktree of this repository (node_modules linked from
// here), built plain (tools/build.mjs --plain), and its world script remade as a SCRATCH TWIN: the shipped assembly
// (tools/parts.mjs assemble --ship), one line after `window.WORLD = {...}` handing the harness the camera, the clock and
// the air (window.__D), then minified by the ref's own tools/minify.mjs --build, as tools/gpu/twin.js remakes one. The
// twin is never deployed: it lives in the temporary folders only. Both twins are served as Pages serves them
// (.github/ci/serve.mjs) and driven by T1's own harness (.github/ci/harness.mjs: openPage's paused clock and fakes, the
// opening fixed by --seed through the one entropy read, stepToShow, step: one frame a 16 ms step).
// The camera: --cam holds it at X, Z, heading PSI (radians); base is held at the head's settled height too; --aim KIND walks the HEAD's camera along the opening's
// heading, 3 km a hop (--walk hops at most), until a streamed cell holds a cloud of that kind (lens, range, tower,
// cumulus, ...), then holds it --dist m (3000) short of that cloud, facing it. Base is held at the same place and heading.
// Each arm then steps --frames frames (600) and its canvas is saved. Out: base.png, head.png, crop.png (base left, head
// right, --crop's box or the whole frame), diff.png (the largest channel difference x8) and crops.json (the camera, the
// aimed cloud, the changed pixels by row band). --shots N saves N in time, --every F frames apart (1250: 20 s), each arm
// held where it is: shot k > 0 as base.k.png, head.k.png, crop.k.png and diff.k.png.
// The arms' page clocks differ by the head's walk, so a cloud the wind carries sits a little apart between them; the
// diff says so by band. Slow on SwiftShader: minutes an arm at 960x600.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const TWIN_ANCHOR = /\n([ \t]*)window\.WORLD = \{ realm[^\n]*\n/;
export const TWIN_LINE = 'window.__D = { CS: CS, CSP: CSP, SIM: SIM, AIR: AIRAPI };   // (crops.mjs scratch twin: the harness reads the camera; never deployed)';

// the twin's one edit: the line after window.WORLD's, found exactly once (else throw, naming the anchor)
export function twinEdit(src) {
  const all = src.match(new RegExp(TWIN_ANCHOR.source, 'g')) || [];
  if (all.length !== 1) throw new Error(`crops: window.WORLD's line found ${all.length} times in the world script (want 1)`);
  const m = TWIN_ANCHOR.exec(src);
  return src.slice(0, m.index + m[0].length) + m[1] + TWIN_LINE + '\n' + src.slice(m.index + m[0].length);
}

function args(argv) {
  const A = { seed: 1, dist: 3000, vp: '960x600', frames: 600, epoch: '2026-11-24T15:00:00Z', walk: 16 };
  for (let i = 0; i < argv.length; i++) { const k = argv[i].replace(/^--/, ''); A[k] = argv[++i]; }
  for (const k of ['base', 'head', 'out']) if (!A[k]) { console.error(`crops: --${k} is required`); process.exit(2); }
  return A;
}

// a ref's served build with its world script as the scratch twin, in a new temporary folder
function twinOf(ref, tmp) {
  const run = (cwd, cmd, a) => execFileSync(cmd, a, { cwd, stdio: ['ignore', 'pipe', 'inherit'] }).toString();
  const wt = path.join(tmp, 'wt'), site = path.join(tmp, 'site'), ship = path.join(tmp, 'ship'), min = path.join(tmp, 'min');
  run(ROOT, 'git', ['worktree', 'add', '--detach', '-q', wt, ref]);
  fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(wt, 'node_modules'));
  run(wt, process.execPath, ['tools/build.mjs', '--plain', site]);
  run(wt, process.execPath, ['tools/parts.mjs', 'assemble', '--ship', 'src', ship]);
  const worlds = fs.readdirSync(ship).filter((f) => /^world(\.v\d+)?\.js$/.test(f));
  if (worlds.length !== 1) throw new Error(`crops: ${ref}: want one world script in the shipped assembly, found ${worlds.join(', ')}`);
  fs.writeFileSync(path.join(ship, worlds[0]), twinEdit(fs.readFileSync(path.join(ship, worlds[0]), 'utf8')));
  fs.mkdirSync(min); run(wt, process.execPath, ['tools/minify.mjs', '--build', ship, min]);
  fs.copyFileSync(path.join(min, worlds[0]), path.join(site, worlds[0]));
  return { site, wt };
}

async function main() {
  const A = args(process.argv.slice(2));
  const { launch, openPage, stepToShow, step } = await import(pathToFileURL(path.join(ROOT, '.github/ci/harness.mjs')).href);
  const { serve } = await import(pathToFileURL(path.join(ROOT, '.github/ci/serve.mjs')).href);
  const [vw, vh] = A.vp.split('x').map(Number), SV = A.stepvp ? A.stepvp.split('x').map(Number) : null, VP = SV ? [SV[0], SV[1], 1] : [vw, vh, 1], EPOCH = Date.parse(A.epoch), seed = +A.seed;
  fs.mkdirSync(A.out, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'crops-')), tb = path.join(tmp, 'base'), th = path.join(tmp, 'head');
  fs.mkdirSync(tb); fs.mkdirSync(th);
  const B = twinOf(A.base, tb), H = twinOf(A.head, th);
  // (y: the height too, when given; base takes the head's, which its own flight had settled over the walk)
  const hold = (arm, x, z, psi, y) => arm.page.evaluate(([x, z, psi, y]) => {
    const D = window.__D; D.hold = { x, z, psi, y };
    if (!D.holding) { D.holding = true; const f = () => { const h = D.hold; for (const S of [D.CS, D.CSP]) { S.x = h.x; S.z = h.z; S.psi = h.psi; if ('yawV' in S) S.yawV = h.psi; if (h.y !== null) S.y = h.y; } requestAnimationFrame(f); }; requestAnimationFrame(f); }
  }, [x, z, psi, y === undefined ? null : y]);
  const find = (arm, kind) => arm.page.evaluate((kind) => {
    const V = window.__D.SIM.V, L = []; if (!V || !V.cellList) return L;
    for (const C of V.cellList) for (const cl of C.clouds || []) if (cl.kind === kind) L.push({ x: cl.x, z: cl.z, base: cl.base });
    return L;
  }, kind);
  const png = (arm) => arm.page.evaluate(() => document.querySelector('canvas.sky').toDataURL('image/png'));
  const T0 = Date.now(), say = (m) => { if (A.verbose) console.error(`crops: ${((Date.now() - T0) / 1000).toFixed(0)} s ${m}`); };
  const browser = await launch(), sb = await serve(B.site), sh = await serve(H.site);
  const rec = { base: A.base, head: A.head, seed, vp: A.vp, frames: +A.frames };
  try {
    const h = await openPage(browser, sh.url, { vp: VP, epoch: EPOCH, seeds: [seed] });
    say('head built, opening'); if ((await stepToShow(h)) < 0) throw new Error('crops: the head never showed'); say('head shown');
    const st = await h.page.evaluate(() => { const D = window.__D, V = D.SIM.V, w = D.AIR.wx ? D.AIR.wx(0, V) : null; return { x: D.CS.x, z: D.CS.z, psi: D.CS.psi, oro: w ? w.oro : null }; });
    rec.opening = st;
    let cam;
    if (A.cam) cam = A.cam.split(',').map(Number);
    else if (A.aim) {
      let L = [], x = st.x, z = st.z;
      for (let k = 0; k < +A.walk && !L.length; k++) {
        await hold(h, x, z, st.psi); await step(h, 90); L = await find(h, A.aim);
        if (!L.length) { x += Math.sin(st.psi) * 3000; z += Math.cos(st.psi) * 3000; }
      }
      if (!L.length) throw new Error(`crops: no ${A.aim} laid out within ${+A.walk * 3} km of the opening's way (seed ${seed}; the gate of a held kind may be shut: oro ${st.oro})`);
      const c = L[0], d0 = Math.hypot(c.x - x, c.z - z) || 1, ux = (c.x - x) / d0, uz = (c.z - z) / d0;
      cam = [c.x - ux * +A.dist, c.z - uz * +A.dist, Math.atan2(ux, uz)]; rec.aimed = { kind: A.aim, ...c, laidOut: L.length };
    } else cam = [st.x, st.z, st.psi];
    const shots = Math.max(1, +(A.shots || 1)), every = +(A.every || 1250), small = SV, size = (arm, wh) => arm.page.setViewportSize({ width: wh[0], height: wh[1] }),
      settle = async (arm, wh) => { for (let i = 0; i < 120; i++) { if (await arm.page.evaluate(([w, h]) => { const c = document.querySelector('canvas.sky'); return c.width === w && c.height === h; }, wh)) { await step(arm, 3); return; } await step(arm, 1); } throw new Error(`crops: the canvas never took ${wh.join('x')}`); },   // (the world sizes its canvas on its own frames)
      shoot = async (arm) => { if (small) { await size(arm, [vw, vh]); await settle(arm, [vw, vh]); } const u = await png(arm); if (small) { await size(arm, small); await settle(arm, small); } return u; },
      series = async (arm) => { const o = [await shoot(arm)]; say('shot 0'); for (let k = 1; k < shots; k++) { await step(arm, every); o.push(await shoot(arm)); say(`shot ${k}`); } return o; };   // (--stepvp WxH: the clock stepped at a small viewport, each shot at --vp: the frames between cost little)
    await hold(h, cam[0], cam[1], cam[2]); await step(h, +A.frames);
    say('aimed and settled'); cam[3] = await h.page.evaluate(() => window.__D.CS.y); rec.cam = cam;   // (the head's settled height: base is held at it)
    const HP = await series(h); rec.headErrors = h.logs; await h.ctx.close();
    const b = await openPage(browser, sb.url, { vp: VP, epoch: EPOCH, seeds: [seed] });
    say('base opening'); if ((await stepToShow(b)) < 0) throw new Error('crops: the base never showed'); say('base shown');
    await hold(b, cam[0], cam[1], cam[2], cam[3]); await step(b, +A.frames);
    const BP = await series(b); rec.baseErrors = b.logs; await b.ctx.close();
    // the crop and the diff, composed in a blank page (canvas 2D: no image library)
    const page = await (await browser.newContext()).newPage();
    const box = A.crop ? A.crop.split(',').map(Number) : [0, 0, vw, vh];
    rec.shots = shots; rec.every = every; rec.changedByRowTenth = [];
    for (let k = 0; k < shots; k++) {
    const bp = BP[k], hp = HP[k], sfx = k ? `.${k}` : '';
    const r = await page.evaluate(async ([bp, hp, box]) => {
      const load = (u) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = u; });
      const [bi, hi] = await Promise.all([load(bp), load(hp)]), w = bi.width, h = bi.height;
      const px = (im) => { const c = new OffscreenCanvas(w, h), g = c.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, w, h).data; };
      const a = px(bi), b = px(hi), d = new ImageData(w, h), bands = new Array(10).fill(0);
      for (let i = 0; i < a.length; i += 4) {
        const m = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
        d.data[i] = d.data[i + 1] = d.data[i + 2] = Math.min(255, m * 8); d.data[i + 3] = 255;
        if (m > 2) bands[Math.min(9, Math.floor((i / 4 / w) / h * 10))]++;
      }
      const dc = new OffscreenCanvas(w, h); dc.getContext('2d').putImageData(d, 0, 0);
      const [x0, y0, x1, y1] = box, cw = x1 - x0, ch = y1 - y0, cc = new OffscreenCanvas(cw * 2 + 8, ch), cg = cc.getContext('2d');
      cg.fillStyle = '#fff'; cg.fillRect(0, 0, cc.width, ch); cg.drawImage(bi, x0, y0, cw, ch, 0, 0, cw, ch); cg.drawImage(hi, x0, y0, cw, ch, cw + 8, 0, cw, ch);
      const url = async (c) => { const bl = await c.convertToBlob({ type: 'image/png' }); return new Promise((ok) => { const f = new FileReader(); f.onload = () => ok(f.result); f.readAsDataURL(bl); }); };
      return { diff: await url(dc), crop: await url(cc), bands };
    }, [bp, hp, box]);
    const save = (name, u) => fs.writeFileSync(path.join(A.out, name), Buffer.from(u.split(',')[1], 'base64'));
    save(`base${sfx}.png`, bp); save(`head${sfx}.png`, hp); save(`crop${sfx}.png`, r.crop); save(`diff${sfx}.png`, r.diff);
    rec.changedByRowTenth.push(r.bands);
    }
    rec.crop = box;
    fs.writeFileSync(path.join(A.out, 'crops.json'), JSON.stringify(rec, null, 1) + '\n');
    console.log(`crops: ${A.out}: ${shots} shot(s) of base, head, crop and diff; changed px by tenth of the frame's height ${rec.changedByRowTenth.map((b) => b.join(' ')).join(' | ')}`);
  } finally {
    await sb.close(); await sh.close(); await browser.close();
    for (const T of [B, H]) execFileSync('git', ['worktree', 'remove', '--force', T.wt], { cwd: ROOT, stdio: 'ignore' });
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e.message); process.exit(1); });
