// first-paint.mjs: the page's first paint with no stills, the build a served change ships when no set exists for its
// world's key (docs/deploy.md, "The stills"; docs/world.md, the first paint and THE OPENINGS).
//   node tools/first-paint.mjs build/site
// The plain build served as Pages would (.github/ci/serve.mjs) and opened in headless Chromium under SwiftShader on the
// gates' paused, stepped clock (.github/ci/harness.mjs), on a phone and a laptop. It fails unless:
//   - no stale still: the build has no assets/still/, no still preload and no --still, and the page fetches nothing
//     under /assets/still/ (a set is only ever the build's own key's: tools/stills.mjs fetchSet);
//   - the words first: before the world is shown, the name and the words are laid out and visible over the hour's
//     still sky (the stylesheet's background), so the first paint is never blank;
//   - the world as a cut: it is shown within the frames allowed, its first shown frame is drawn (not one flat
//     colour), the canvas is fully opaque in that frame, and neither the canvas nor .sky.on carries a transition or
//     an animation (no fade in).
import fs from 'node:fs';
import path from 'node:path';
import * as H from '../.github/ci/harness.mjs';
import { serve } from '../.github/ci/serve.mjs';

const site = path.resolve(process.argv[2] || 'build/site');
const CASES = [
  { name: 'phone-dawn', vp: [393, 852, 3], mobile: true, at: '2026-11-05T06:30:00Z', seeds: [44] },
  { name: 'laptop-night', vp: [1440, 900, 1], at: '2026-11-05T22:30:00Z', seeds: [11] },
];
const fail = [], said = [];

if (fs.existsSync(path.join(site, 'assets', 'still'))) fail.push('the build has assets/still/: it was built with a set (this check reads the build with none)');
const html = fs.readFileSync(path.join(site, 'index.html'), 'utf8');
if (/class="still"/.test(html)) fail.push('index.html keeps the still preload in a build with no stills');
if (/--still\s*:/.test(fs.readFileSync(path.join(site, 'style.css'), 'utf8').replace(/var\(--still[^)]*\)/g, ''))) fail.push('style.css sets --still itself (only hour.js may, from the build\'s own set)');

const s = await serve(site), browser = await H.launch();
try {
  for (const c of CASES) {
    const arm = await H.openPage(browser, s.url, { vp: c.vp, mobile: !!c.mobile, epoch: Date.parse(c.at), seeds: c.seeds });
    const pre = await arm.page.evaluate(() => {
      const vis = (el) => { if (!el) return false; const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility === 'visible' && +cs.opacity > 0 && cs.display !== 'none'; };
      const canvas = document.querySelector('canvas.sky'), body = getComputedStyle(document.body), root = getComputedStyle(document.documentElement);
      return {
        shown: !!canvas && canvas.classList.contains('on'),
        name: vis(document.querySelector('h1.name svg')), words: vis(document.querySelector('p.words')),
        sky: body.backgroundImage !== 'none' || !/rgba\(0, 0, 0, 0\)|transparent/.test(body.backgroundColor),
        still: root.getPropertyValue('--still').trim(),
        fetched: performance.getEntriesByType('resource').map((e) => e.name).filter((u) => /\/assets\/still\//.test(u)),
      };
    });
    if (!pre.name || !pre.words) fail.push(`${c.name}: before the show the name (${pre.name}) and the words (${pre.words}) are not both laid out and visible`);
    if (!pre.shown && !pre.sky) fail.push(`${c.name}: before the show the body has no still sky (a blank first paint)`);
    if (pre.still && pre.still !== 'none') fail.push(`${c.name}: --still is ${pre.still.slice(0, 80)} with no set in the build (a stale still)`);
    if (pre.fetched.length) fail.push(`${c.name}: the page fetched a still: ${pre.fetched[0]}`);
    const at = pre.shown ? 0 : await H.stepToShow(arm, 3000);
    if (at < 0) { fail.push(`${c.name}: the world was never shown in 3000 frames`); await arm.ctx.close(); continue; }
    const cut = await arm.page.evaluate(() => {
      const canvas = document.querySelector('canvas.sky'), cs = getComputedStyle(canvas);
      const motion = (v) => v.split(',').some((x) => parseFloat(x) > 0);
      return { opacity: +cs.opacity, fade: motion(cs.transitionDuration) || motion(cs.transitionDelay), anim: cs.animationName !== 'none' && motion(cs.animationDuration) };
    });
    const f = await H.capture(arm, { pixels: true });
    let distinct = 0;
    if (f.rgba) { const b = Buffer.from(f.rgba, 'base64'), seen = new Set(); for (let i = 0; i < b.length && seen.size < 64; i += 4 * 97) seen.add((b[i] >> 3) << 10 | (b[i + 1] >> 3) << 5 | (b[i + 2] >> 3)); distinct = seen.size; }
    if (cut.opacity !== 1) fail.push(`${c.name}: the canvas is at opacity ${cut.opacity} in its first shown frame (a fade)`);
    if (cut.fade || cut.anim) fail.push(`${c.name}: the shown canvas carries a ${cut.fade ? 'transition' : 'animation'} (a fade in)`);
    if (!f.frame || distinct < 8) fail.push(`${c.name}: the first shown frame is ${f.frame ? 'nearly one flat colour (' + distinct + ' colours sampled)' : 'not readable'}: not drawn whole`);
    if (f.errors.length) fail.push(`${c.name}: page errors: ${f.errors.slice(0, 2).join('; ')}`);
    said.push(`${c.name}: words first${pre.shown ? ' (held: shown with the first paint)' : ''}, the world shown at frame ${at}, ${distinct} colours sampled, opacity ${cut.opacity}, no fade, no still`);
    await arm.ctx.close();
  }
} finally { await browser.close(); await s.close(); }

for (const l of said) console.log(l);
if (fail.length) { for (const l of fail) console.log('::error::first paint without stills: ' + l); process.exitCode = 1; }
else console.log('first paint without stills: the words first, the world as a cut, no stale still (' + CASES.length + ' cases)');
