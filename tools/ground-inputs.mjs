// ground-inputs.mjs: are the recorded ground's GLSL inputs (test/ground.mjs INPUTS) every shader text the world's
// ground probe compiles? (tools/checks/39-ground-inputs.sh)
//   node tools/ground-inputs.mjs SITE
// The recording (tools/gpu/record-ground.mjs) is the probe program's output, so its freshness hash (landHash) need
// only cover what that program is made from: the JS inputs that assemble it, and the .glsl files whose text is in it.
// Listing every .glsl file (as before, 2026-11-14) made each sky, cloud or star shader edit need a re-record on the
// 4090. This measures instead: SITE (a plain build) is opened under SwiftShader, every shader source the page hands
// WebGL is captured, the probe's fragment source picked (its uPm uniform and hgt(); one source on every device: both
// bodies behind #ifdef HPSPLIT), and every .glsl file NOT in INPUTS is searched for in it: any of its lines (minified
// as the build minifies, over 30 characters, and in no INPUTS file) found there fails, naming the file to list.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import * as H from '../.github/ci/harness.mjs';
import { serve } from '../.github/ci/serve.mjs';
import { minGlsl } from './glslmin.mjs';
import { INPUTS, ROOT } from '../test/ground.mjs';

const site = process.argv[2];
if (!site) { console.error('usage: ground-inputs.mjs SITE'); process.exitCode = 2; }
else {
  const glslDirs = ['src/glsl'].concat(fs.readdirSync(path.join(ROOT, 'src'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => 'src/' + d.name + '/glsl')).filter((d) => fs.existsSync(path.join(ROOT, d)));
  const all = []; for (const d of glslDirs) for (const n of fs.readdirSync(path.join(ROOT, d)).sort()) if (n.endsWith('.glsl')) all.push(d + '/' + n);
  const listed = (f) => INPUTS.some((p) => f === p || f.startsWith(p + '/'));
  const lines = (f) => minGlsl(fs.readFileSync(path.join(ROOT, f), 'utf8')).split('\n').map((l) => l.trim()).filter((l) => l.length > 30);
  const inLines = new Set(all.filter(listed).flatMap(lines));
  const S = await serve(path.resolve(site)), br = await H.launch();
  try {
    const nc = br.newContext.bind(br);
    br.newContext = async (o) => { const c = await nc(o); await c.addInitScript(() => { window.__srcs = []; const P = WebGL2RenderingContext.prototype, sh = P.shaderSource; P.shaderSource = function (s, t) { window.__srcs.push(t); return sh.call(this, s, t); }; }); return c; };
    const arm = await H.openPage(br, S.url, { vp: [1440, 900, 1], persona: 'nvidia', epoch: Date.parse('2026-11-05T12:00:00Z'), seeds: [11] });
    await H.stepToShow(arm);
    const probe = (await arm.page.evaluate(() => window.__srcs)).filter((t) => /\buPm\b/.test(t) && /\bhgt\s*\(|texelFetch\(uHP/.test(t));
    if (!probe.length) throw new Error('the probe program\'s source was not captured (no shader with uPm and hgt)');
    const text = probe.join('\n'), bad = [];
    for (const f of all.filter((g) => !listed(g))) {
      const hit = lines(f).filter((l) => !inLines.has(l) && text.includes(l));
      if (hit.length) bad.push(f + ' (' + hit.length + ' line(s), e.g. ' + hit[0].slice(0, 80) + ')');
    }
    const used = all.filter(listed).filter((f) => lines(f).some((l) => text.includes(l)));
    if (bad.length) { console.log('::error::the ground probe compiles text from .glsl files not in test/ground.mjs INPUTS (add them, then re-record on the 4090): ' + bad.join('; ')); process.exitCode = 1; }
    else console.log(`ground inputs: the probe (${probe.length} source, ${text.split('\n').length} lines) uses ${used.join(', ')}; none of the other ${all.filter((g) => !listed(g)).length} .glsl files`);
  } finally { await br.close(); await S.close(); }
}
