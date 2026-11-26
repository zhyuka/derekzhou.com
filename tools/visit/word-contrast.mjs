// tools/visit/word-contrast.mjs: each role of the words (the lettered name, the line, the credit, the links) against the
// brightest ground pixel under its box, in an opening's first shown frame, as docs/verify.md's contrast reads it: the role's
// own colour (getComputedStyle), the ground the world's canvas pixels (no words in them), WCAG's (Y1 + 0.05) / (Y2 + 0.05).
// Drawn as T1 draws (the gate's harness: SwiftShader, the clock paused and stepped, the visit's entropy fixed), on the two
// bright horizons: the phone at dawn and the laptop at sunset. Each role also gives where its brightest ground pixel stands
// (canvas px) and its Y, so a low cell can be traced to what lies under it (a cloud's rim, a skyline).
//   node tools/visit/word-contrast.mjs --build build/site --out FILE.json [--k 0,1,...] [--view phone-dawn|laptop-sunset] [--png DIR]
// FILE.json is resumed (a cell already in it is not measured again); --png keeps each frame as the page shows it.
import fs from 'node:fs';
import path from 'node:path';
import { serve } from '../../.github/ci/serve.mjs';
import * as H from '../../.github/ci/harness.mjs';

const arg = (f, d) => { const i = process.argv.indexOf(f); return i >= 0 ? process.argv[i + 1] : d; };
const BUILD = path.resolve(arg('--build', 'build/site')), OUT = arg('--out', 'build/word-contrast.json'), PNG = arg('--png', null), VIEW = arg('--view', null);
const LANDS = arg('--k', null) ? arg('--k').split(',').map(Number) : [...Array(16).keys()];
const VIEWS = [
  { name: 'phone-dawn', vp: [393, 852, 3], mobile: true, at: '2026-11-05T06:30:00Z' },
  { name: 'laptop-sunset', vp: [1440, 900, 1], at: '2026-11-05T17:30:00Z' },
].filter((v) => !VIEW || v.name === VIEW);
const ROLES = { name: '.name svg', line: '.words span', credit: '.credit', links: 'footer a' };
const lin = (c) => { c /= 255; return c > 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92; };
const Y = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

const res = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
if (PNG) fs.mkdirSync(PNG, { recursive: true });
const s = await serve(BUILD);
try {
  for (const k of LANDS) for (const v of VIEWS) {
    const key = `${k}/${v.name}`; if (res[key]) continue;
    const b = await H.launch();
    try {
      const arm = await H.openPage(b, s.url, { vp: v.vp, mobile: !!v.mobile, epoch: Date.parse(v.at), seeds: [k] });
      if ((await H.stepToShow(arm)) < 0) throw new Error('never shown');
      const page = await arm.page.evaluate((roles) => {
        const o = {};
        for (const [r, sel] of Object.entries(roles)) {
          const boxes = []; let color = null;
          for (const e of document.querySelectorAll(sel)) { const q = e.getBoundingClientRect(); if (q.width && q.height) boxes.push([q.left, q.top, q.right, q.bottom]); color = getComputedStyle(e).color; }
          o[r] = { boxes, color };
        }
        return { roles: o, w: innerWidth, h: innerHeight };
      }, ROLES);
      const cap = await H.capture(arm, { pixels: true }), raw = Buffer.from(cap.rgba, 'base64'), W = cap.w, Hh = cap.h, sx = W / page.w, sy = Hh / page.h;
      const px = (x, y) => { const i = ((Hh - 1 - y) * W + x) * 4; return Y(raw[i], raw[i + 1], raw[i + 2]); };   // (readPixels: bottom row first)
      const row = {};
      for (const [r, o] of Object.entries(page.roles)) {
        const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/.exec(o.color || ''); if (!m) continue;
        const yt = Y(+m[1], +m[2], +m[3]); let yg = 0, at = null;
        for (const [x0, y0, x1, y1] of o.boxes) for (let y = Math.max(0, Math.floor(y0 * sy)); y < Math.min(Hh, Math.ceil(y1 * sy)); y++) for (let x = Math.max(0, Math.floor(x0 * sx)); x < Math.min(W, Math.ceil(x1 * sx)); x++) { const yy = px(x, y); if (yy > yg) { yg = yy; at = [x, y]; } }
        row[r] = { ratio: +((yt + 0.05) / (yg + 0.05)).toFixed(2), groundY: +yg.toFixed(4), at };
      }
      if (PNG) fs.writeFileSync(path.join(PNG, `k${k}-${v.name}.png`), await arm.page.screenshot());
      res[key] = row; fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
      console.log(key, Object.entries(row).map(([r, q]) => `${r} ${q.ratio}`).join(', '));
    } catch (e) { console.log(key, 'error', e.message); } finally { await b.close(); }
  }
} finally { s.server ? s.server.close() : s.close && s.close(); }
