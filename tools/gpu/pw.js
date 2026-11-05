'use strict';
// The PC's playwright-core (PW_CORE), with the cloud tools' launches mapped to this machine.
// The cloud drew on Mesa llvmpipe ('--use-gl=angle', '--use-angle=gl-egl'); here those launches get Chrome
// (channel 'chrome', or CHROME_PATH) on the GPU through ANGLE D3D11. A launch that asks for a software or no-WebGL
// browser on purpose (--use-angle=swiftshader, --disable-webgl, --disable-3d-apis, --disable-gpu) keeps its flags.
// Every GPU launch checks the real renderer (before any page's own faking) and refuses to run on anything but the
// NVIDIA GPU; PW_PROBE=0 skips the check. A Linux executablePath that does not exist here is dropped.
const fs = require('fs');
// (CI, tools/gpu) PW_CORE names the playwright-core folder; without it, the playwright-core package from node's own
// resolution (the workflow installs it). GPU_PROFILE_DIR (a folder kept between runs): each launch uses a persistent
// Chrome profile there instead of a temporary one (one at a time: the caller gives each parallel slot its own), so
// Chrome's GPU program cache answers shaders a run has compiled before and FXC is skipped. Never for timing.
const real = require(process.env.PW_CORE || 'playwright-core');

const CLOUD = new Set(['--use-gl=angle', '--use-angle=gl-egl', '--enable-unsafe-swiftshader']);
const SOFT = /^--(use-angle=swiftshader|disable-webgl|disable-3d-apis|disable-gpu)$/;
const BG = ['--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--disable-backgrounding-occluded-windows'];
let said = false;

function map(o) {
  o = Object.assign({}, o || {});
  let args = (o.args || []).filter((a) => a !== '--no-sandbox');
  const soft = args.some((a) => SOFT.test(a));
  const ready = args.some((a) => /^--use-angle=(d3d11|d3d9|vulkan)/.test(a));
  if (o.executablePath && !fs.existsSync(o.executablePath)) delete o.executablePath;
  if (!o.executablePath && !o.channel) {
    if (process.env.CHROME_PATH) o.executablePath = process.env.CHROME_PATH; else o.channel = 'chrome';
  }
  if (!soft && !ready) {
    args = args.filter((a) => !CLOUD.has(a));
    args.unshift('--use-angle=d3d11');
    if (!args.includes('--ignore-gpu-blocklist')) args.push('--ignore-gpu-blocklist');
  }
  // The owner: no browser windows on the PC's desktop (LOCAL-WORKERS.md, "Browsers run in the background"). Every
  // launch is headless, with the three flags that keep a background page from being throttled; PW_HEADED=1 alone
  // brings a window back, off-screen.
  for (const f of BG) if (!args.includes(f)) args.push(f);
  o.headless = process.env.PW_HEADED !== '1';
  if (!o.headless) args.push('--window-position=-32000,0');
  o.args = args;
  return { o, gpu: !soft };
}

async function renderer(b) {
  const p = await b.newPage();
  try {
    return await p.evaluate(() => {
      const c = document.createElement('canvas').getContext('webgl2');
      if (!c) return 'no webgl2';
      const d = c.getExtension('WEBGL_debug_renderer_info');
      return d ? c.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'no debug ext';
    });
  } finally { await p.context().close(); }
}

// a persistent profile behind a browser's face: the caller's one newContext(options) becomes the persistent context
// (gstep, hbits and fsbits make exactly one), newPage/close/version as a browser's
function persistent(o) {
  let ctx = null; const dir = process.env.GPU_PROFILE_DIR;
  // (a kept profile must never answer a page's files from an earlier run: the HTTP cache goes to a folder of this run's
  // own, under the job's temp folder, which the runner clears; the GPU program cache, a cache of its own, stays)
  const hc = require('path').join(process.env.RUNNER_TEMP || require('os').tmpdir(), 'gpu-http-' + process.pid + '-' + Date.now());
  const o2 = Object.assign({}, o, { args: (o.args || []).concat(['--disk-cache-dir=' + hc, '--disk-cache-size=1']) });
  const open = async (co) => { if (!ctx) { fs.mkdirSync(dir, { recursive: true }); ctx = await real.chromium.launchPersistentContext(dir, Object.assign({}, o2, co || {})); } return ctx; };
  return {
    newContext: async (co) => open(co),
    newPage: async () => (await open()).newPage(),
    close: async () => { if (ctx) await ctx.close(); ctx = null; },
    version: () => (ctx && ctx.browser() ? ctx.browser().version() : 'persistent'),
  };
}

async function launch(opts) {
  const { o, gpu } = map(opts);
  if (process.env.GPU_PROFILE_DIR) return persistent(o);   // (the renderer is checked by the caller's own first page)
  const b = await real.chromium.launch(o);
  if (gpu && process.env.PW_PROBE !== '0') {
    const r = await renderer(b);
    if (!/NVIDIA|RTX/i.test(r)) { await b.close(); throw new Error('[pw] not on the GPU: ' + r); }
    if (!said) { console.error('[pw] renderer: ' + r); said = true; }
  }
  return b;
}

const chromium = new Proxy(real.chromium, {
  get(t, k) { if (k === 'launch') return launch; const v = t[k]; return typeof v === 'function' ? v.bind(t) : v; },
});
module.exports = new Proxy(real, { get(t, k) { return k === 'chromium' ? chromium : k === '__map' ? map : t[k]; } });
