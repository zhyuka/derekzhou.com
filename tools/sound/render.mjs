// The score rendered offline, to measure it before it ships (docs/sound.md): node tools/sound/render.mjs OUT.wav [SECONDS]
// Plays src/score.js on the sheet in site/assets/sound/ in headless Chromium, in an OfflineAudioContext (here only: the
// site's scripts make none), against a scripted sky: afterglow, a near change into the Milky Way, the dunes giving way
// to cloud, a far change (through the mist) into blue hour, a near change into the moonlit sea (round seventeen's
// flight), with the air heard where the camera flies: a visit's 10 m wind of WIND_U m/s (6.5 unless set; 0 a calm), each
// sky its share of it (the world's AIR_BYSKY, eased through each change), at 25 m over the ground, with smooth gusts,
// the camera at 12 m/s on a slowly turning heading. Writes a 24 kHz stereo WAV and prints its loudness (ffmpeg's
// ebur128): integrated, range, true peak.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUTF = process.argv[2] || 'score.wav', T = +(process.argv[3] || 456), WIND_U = process.env.WIND_U === undefined ? 6.5 : +process.env.WIND_U;
const require = createRequire(import.meta.url);
let PW; for (const n of [process.env.PW_CORE, 'playwright-core', 'playwright'].filter(Boolean)) { try { PW = require(n); break; } catch {} }
if (!PW) { console.error('no playwright'); process.exit(2); }
const sheet = (fs.readFileSync(path.join(ROOT, 'src/sound.js'), 'utf8').match(/var SHEET = '([^']+)'/) || [])[1];
const air = fs.readFileSync(path.join(ROOT, 'src/world/215-air.js'), 'utf8').match(/var AIR_BYSKY = (\{[^;]*\});/)[1];   // (the world's wind by sky, as its feed hands it to the score)
const page = `<!doctype html><meta charset=utf-8><script>
window.AIRT = ${air};
window.FLIGHT = [{ id: 'afterglow', at: 0, hold: 63, move: 57, far: false }, { id: 'milkyway', at: 120, hold: 86, move: 58, far: true },
  { id: 'bluehour', at: 264, hold: 63, move: 57, far: false }, { id: 'moonlit', at: 384, hold: 190, move: 58, far: false }];
window.NOW = 0; window.WIND_U = ${WIND_U};
window.HEARD = function (t, i) {   // (the air heard at the camera, as 512's feed hands it: the visit's wind by the sky's share, 1.15 times it at 25 m, gusts of 0.26 of it)
  var e = FLIGHT[i], nx = FLIGHT[i + 1], k = nx ? Math.max(0, Math.min(1, (t - e.at - e.hold) / e.move)) : 0, q = k * k * (3 - 2 * k);
  var sh = AIRT[e.id][0] + ((nx ? AIRT[nx.id][0] : AIRT[e.id][0]) - AIRT[e.id][0]) * q, carry = WIND_U * sh, sp = 1.15 * carry, dir = 0.3, psi = 0.6 * Math.sin(t / 40);
  var x = sp * Math.cos(dir), z = sp * Math.sin(dir), cx = 12 * Math.cos(psi), cz = 12 * Math.sin(psi);
  var g = 0.26 * sp * (0.55 * Math.sin(t / 3.5 + 1) + 0.35 * Math.sin(t / 7.1 + 2) + 0.25 * Math.sin(t / 14.3 + 4));
  return { x: x, z: z, gust: g, sigma: 0.26 * sp, phase: t, carry: carry, bear: Math.atan2(Math.sin(dir - psi), Math.cos(dir - psi)), ax: x - cx, az: z - cz, y: 25 };
};
window.WORLD = { sky: function () { var t = NOW, i = 0; while (i < FLIGHT.length - 1 && FLIGHT[i + 1].at <= t) i++;
  var x = Math.min(1, Math.max(0, (t - 150) / 40)); return { t: t, seq: FLIGHT.slice(i), wc: x * x * (3 - 2 * x), air: AIRT, still: false, seed: 1501, wind: HEARD(t, i) }; } };
</script><script src="/src/score.js"></script>`;
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/') { r.writeHead(200, { 'content-type': 'text/html' }); r.end(page); return; }
  const f = u.startsWith('/assets/') ? path.join(ROOT, 'site', u) : path.join(ROOT, u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'audio/mpeg' }); r.end(fs.readFileSync(f));
}).listen(0, '127.0.0.1', async () => {
  const b = await PW.chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const p = await b.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('http://127.0.0.1:' + srv.address().port + '/');
  const n = await p.evaluate(async ([T, sheet]) => {
    const ctx = new OfflineAudioContext(2, Math.round(T * 24000), 24000);
    const buf = await ctx.decodeAudioData(await (await fetch(sheet)).arrayBuffer());
    const eng = window.SCORE.play(ctx, ctx.destination, buf);
    for (let t = 0; t < T; t += 0.5) { window.NOW = t; eng.tick(t); }
    const out = await ctx.startRendering(); const L = out.getChannelData(0), R = out.getChannelData(1);
    window.PCM = new Int16Array(L.length * 2);
    for (let i = 0; i < L.length; i++) { window.PCM[2 * i] = Math.max(-32768, Math.min(32767, L[i] * 32767)); window.PCM[2 * i + 1] = Math.max(-32768, Math.min(32767, R[i] * 32767)); }
    return window.PCM.length;
  }, [T, sheet]);
  const chunks = [];
  for (let i = 0; i < n; i += 1 << 20) {
    const b64 = await p.evaluate(([i, k]) => { const a = new Uint8Array(window.PCM.buffer, i * 2, Math.min(k, window.PCM.length - i) * 2); let s = ''; for (let j = 0; j < a.length; j += 32768) s += String.fromCharCode.apply(null, a.subarray(j, j + 32768)); return btoa(s); }, [i, 1 << 20]);
    chunks.push(Buffer.from(b64, 'base64'));
  }
  await b.close(); srv.close();
  if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
  const data = Buffer.concat(chunks), h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(24000, 24); h.writeUInt32LE(96000, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(OUTF, Buffer.concat([h, data]));
  const r = spawnSync('ffmpeg', ['-nostats', '-i', OUTF, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const I = (r.match(/I:\s+(-?[\d.]+) LUFS/g) || []).pop(), LRA = (r.match(/LRA:\s+(-?[\d.]+) LU/g) || []).pop(), TP = (r.match(/Peak:\s+(-?[\d.]+) dBFS/g) || []).pop();
  console.log(OUTF, T + ' s |', I, '|', LRA, '| true peak', TP);
});
