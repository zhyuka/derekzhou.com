// render.mjs: the landing pictures. Each opening (a time of day, a seed) drawn by the built site in the gates' browser
// (.github/ci/harness.mjs: SwiftShader, the clock stepped, the visit's entropy answered with the seed) at each window
// shape, the world's first shown frame read back and written as AVIF into site/landing/, named by its bytes; then
// functions/landing.json, the edge function's manifest (the file name and the bytes, base64, for inlining).
//   node tools/build.mjs --plain build/site && node tools/landing/render.mjs build/site [--jobs 3]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { serve } from '../../.github/ci/serve.mjs';
import * as H from '../../.github/ci/harness.mjs';

const SITE = process.argv[2] || 'build/site', JOBS = process.argv.includes('--jobs') ? +process.argv[process.argv.indexOf('--jobs') + 1] || 3 : 3;
const T = JSON.parse(fs.readFileSync(new URL('./table.json', import.meta.url)));
const OUT = 'site/landing', TMP = 'build/landing';
fs.mkdirSync(TMP, { recursive: true }); fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });   // (the frames drawn are kept in build/landing/: a run picks up where one stopped; --fresh starts over)
if (process.argv.includes('--fresh')) { fs.rmSync(TMP, { recursive: true, force: true }); fs.mkdirSync(TMP, { recursive: true }); }
const jobs = [];
for (const [g, seeds] of Object.entries(T.skies)) for (const seed of seeds) for (const s of T.shapes) jobs.push({ g, seed, s });   // (g: the sky the opening lands on)
const S = await serve(SITE);
const man = { groups: T.groups, skies: T.skies, inlineMax: T.inline_max_b64, shapes: T.shapes.map((s) => ({ name: s.name, media: s.media, mobile: s.mobile })), pictures: {} };
async function one({ g, seed, s }) {
  const p = path.join(TMP, `${g}-${seed}-${s.name}.png`);
  if (!fs.existsSync(p)) await draw({ g, seed, s }, p);
  const tmp = p.replace(/\.png$/, '.avif');
  execFileSync('python3', ['-I', '-c', 'import sys; from PIL import Image; Image.open(sys.argv[1]).convert("RGB").save(sys.argv[2], "AVIF", quality=int(sys.argv[3]))', p, tmp, String(s.q || 55)]);
  const b = fs.readFileSync(tmp), name = `${g}-${seed}-${s.name}.${crypto.createHash('sha256').update(b).digest('hex').slice(0, 8)}.avif`;
  fs.writeFileSync(path.join(OUT, name), b);
  const b64 = b.toString('base64');
  man.pictures[`${g}/${seed}/${s.name}`] = Object.assign({ file: '/landing/' + name }, s.mobile && b64.length <= T.inline_max_b64 ? { b64 } : {});   // (the bytes only where the function may inline them)
  console.log(`${g} ${seed} ${s.name}: ${name} ${b.length} B`);
}
async function draw({ g, seed, s }, p) {
  const browser = await H.launch();
  try {
    const h = T.hours[g], at = `2026-11-05T${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}:00Z`;
    const arm = await H.openPage(browser, S.url, { vp: [s.w, s.h, 2], mobile: s.mobile, epoch: Date.parse(at), seeds: [seed] });
    if (await H.stepToShow(arm, 4000) < 0) throw new Error(`${g} ${seed} ${s.name}: never shown`);
    const png = await arm.page.evaluate(() => document.querySelector('canvas.sky').toDataURL('image/png'));
    fs.writeFileSync(p, Buffer.from(png.split(',')[1], 'base64'));
  } finally { await browser.close(); }
}
const q = jobs.slice();
await Promise.all(Array.from({ length: JOBS }, async () => { while (q.length) await one(q.shift()); }));
await S.close();
fs.writeFileSync('functions/landing.json', JSON.stringify(man));
console.log(`${jobs.length} pictures; functions/landing.json ${(fs.statSync('functions/landing.json').size / 1024).toFixed(0)} KB`);
