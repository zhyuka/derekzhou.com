// functions/index.js: the home page's edge step (Cloudflare Pages Function, on / and /index.html alone: _routes.json).
// It picks what the visitor's own hour opens on, by the time zone Cloudflare reads for the request (request.cf.timezone,
// every plan), and one of that time of day's openings (tools/landing/table.json), and writes both into the page before
// it leaves: <html> marked data-sky, data-sky-at and data-land (the opening's seed: the world lands there, hour.js stands
// aside), the browser's bar coloured, and the picture of exactly that first view put under the canvas (the visitor's
// likely window shape inlined, so it is there at first paint; the others named, picked by the browser by the window's
// shape). The world's first frame is that picture, so the cut to it is unseen. Without a time zone, or on any failure,
// the page goes out exactly as stored (hour.js then marks it, as before). Nothing is stored or logged; the response is
// never cached (the page is max-age=0) and carries no validator, so a revisit is picked afresh.
import M from './landing.json';

const DAY = [['dawn', 5, 8, '#173a63'], ['day', 8, 13, '#173a63'], ['rain', 13, 16, '#5f3d62'], ['sunset', 16, 19, '#5f3d62'], ['dusk', 19, 21, '#38396a'], ['night', 21, 29, '#17234f']];

function hourIn(tz) {   // the visitor's local hour, 0-24 with minutes, or NaN
  try {
    const p = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const g = (t) => +p.find((x) => x.type === t).value;
    return g('hour') + g('minute') / 60;
  } catch (e) { return NaN; }
}

function pick(h) {   // hour.js's own table, the same arithmetic
  if (h < 5) h += 24;
  let i = DAY.findIndex((d) => h >= d[1] && h < d[2]); if (i < 0) i = DAY.length - 1;
  const at = Math.min(0.999, Math.max(0, (h - DAY[i][1]) / (DAY[i][2] - DAY[i][1])));
  return { sky: DAY[i][0], at: at.toFixed(3), theme: DAY[i][3] };
}

export async function onRequestGet({ request, env }) {
  const plain = new Request(request.url, { method: 'GET', headers: { 'Accept-Encoding': request.headers.get('Accept-Encoding') || '' } });   // (no validators: always the whole page)
  const res = await env.ASSETS.fetch(plain);
  try {
    const tz = request.cf && request.cf.timezone, h = tz ? hourIn(tz) : NaN;
    if (res.status !== 200 || !(res.headers.get('Content-Type') || '').includes('text/html') || !(h >= 0)) return res;
    const k = pick(h), seeds = M.groups[k.sky];
    if (!seeds || !seeds.length) return res;
    const r = new Uint32Array(1); crypto.getRandomValues(r);
    const seed = seeds[r[0] % seeds.length];
    const ua = request.headers.get('Sec-CH-UA-Mobile'), mobile = ua ? ua.includes('1') : /Mobi|Android|iPhone|iPad/.test(request.headers.get('User-Agent') || '');
    const guess = M.shapes.find((s) => s.mobile === mobile) || M.shapes[M.shapes.length - 1];
    const src = (s) => { const p = M.pictures[`${k.sky}/${seed}/${s.name}`]; return p ? (s === guess ? 'data:image/avif;base64,' + p.b64 : p.file) : null; };
    if (M.shapes.some((s) => !src(s))) return res;
    const last = M.shapes[M.shapes.length - 1];
    const pic = '<picture class="landing">' + M.shapes.slice(0, -1).map((s) => `<source media="${s.media}" srcset="${src(s)}">`).join('') +
      `<img src="${src(last)}" alt="" decoding="sync" fetchpriority="high"></picture>`;
    const headers = new Headers(res.headers); headers.delete('ETag'); headers.delete('Last-Modified'); headers.delete('Content-Length');
    headers.set('Cache-Control', 'private, max-age=0, must-revalidate');
    return new HTMLRewriter()
      .on('html', { element(e) { e.setAttribute('data-sky', k.sky); e.setAttribute('data-sky-at', k.at); e.setAttribute('data-land', String(seed)); } })
      .on('meta[name="theme-color"]', { element(e) { e.setAttribute('content', k.theme); } })
      .on('body', { element(e) { e.prepend(pic, { html: true }); } })
      .transform(new Response(res.body, { status: 200, headers }));
  } catch (e) { return res; }
}
