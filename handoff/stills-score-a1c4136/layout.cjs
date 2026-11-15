// layout.cjs URL OUT.json: the word blocks' rectangles (CSS px) at each baked window, GPU off (layout only)
const { chromium } = require(process.env.PW_CORE);
const fs = require('fs');
const ALL = ['393x861', '393x817', '393x770', '393x724', '393x676', '393x629', '393x524', '1080x1080', '1350x1080', '1728x1080', '1920x1080', '2268x1080'];
function win(shape, tier) { const [w, h] = shape.split('x').map(Number); if (tier === 'lo') { const s = 393 / Math.min(w, h); return [Math.round(w * s), Math.round(h * s), 3, true]; } return h > w ? [w, h, 3, true] : [w, h, 1, false]; }
(async () => {
  const br = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--disable-gpu'] });
  const out = {};
  try {
    for (const tier of ['hi', 'lo']) for (const shape of ALL) {
      const [w, h, dpr, mobile] = win(shape, tier);
      const ctx = await br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile });
      const p = await ctx.newPage(); await p.goto(process.argv[2], { waitUntil: 'load' }); await p.waitForTimeout(800);
      out[tier + '-' + shape] = await p.evaluate(() => {
        const r = []; for (const sel of ['.name', '.words', '.credit', '.stack footer, footer', 'button, .sound']) for (const e of document.querySelectorAll(sel)) { const b = e.getBoundingClientRect(); if (b.width > 0 && b.height > 0) r.push({ sel, x: b.x, y: b.y, w: b.width, h: b.height, text: (e.textContent || '').trim().slice(0, 30) }); }
        return { css: [innerWidth, innerHeight], boxes: r };
      });
      await ctx.close();
    }
  } finally { await br.close(); }
  fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1));
  for (const [k, v] of Object.entries(out)) console.log(k, v.css.join('x'), v.boxes.map((b) => b.sel.split(',')[0] + '@' + [b.x, b.y, b.w, b.h].map(Math.round).join(',')).join(' '));
})();
