// the real world under a drag: 90 deg over 3 s (8 px a step on a 1440 px window... the page's own cssW here), the slip's plans counted
import fs from 'node:fs';
import path from 'node:path';
const H = await import('/home/user/derekzhou.com/.github/ci/harness.mjs');
const { serve } = await import('/home/user/derekzhou.com/.github/ci/serve.mjs');
const A = {}; for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const srv = await serve(path.resolve(A.build));
const browser = await H.launch();
const arm = await H.openPage(browser, srv.url, { vp: [320, 200, 1], persona: 'generic', epoch: Date.parse('2026-11-05T03:30:00Z'), seeds: [+(A.seed || 11), 22, 33] });
await H.stepToShow(arm, 4000);
const res = await arm.page.evaluate(() => {
  const out = { straight: 0, turning: 0, after: 0, roll: 0, rollAfterMax: 0 };
  let r = window.__fly(600, 1); out.straight = r.reduce((a, q) => a + (q[15] || 0), 0) / 10;
  const px = 320 / 180;   // (90 deg across the window's width: the harness's window is 320 px)
  const tr = [];
  for (let k = 0; k < 180; k++) { window.__drag(px, 0, true); const q = window.__fly(1, 1); tr.push(q[0]); }
  window.__drag(0, 0, false);
  out.turning = tr.reduce((a, q) => a + (q[15] || 0), 0) / 3;
  out.roll = Math.max(...tr.map((q) => Math.abs(q[7]))) * 180 / Math.PI;
  r = window.__fly(600, 1); out.after = r.reduce((a, q) => a + (q[15] || 0), 0) / 10; out.rollAfterMax = Math.max(...r.map((q) => Math.abs(q[7]))) * 180 / Math.PI;
  out.fix = [r[r.length - 1][13], r[r.length - 1][14]]; out.psi = [tr[0][4], tr[tr.length - 1][4], r[r.length - 1][4]]; out.rows = tr.slice(0, 2);
  return out;
});
console.log(JSON.stringify(res));
await browser.close(); srv.close && srv.close(); process.exit(0);
