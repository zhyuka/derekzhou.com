#!/usr/bin/env bash
# check: Licences on the allowlist
# kind: fast
# enforces: licences
# (RULES.json licences, automated 2026-11-07) every package in package-lock.json under MIT, BSD, Apache, ISC, zlib,
# Unlicense or CC0; every font beside its licence (site/assets/fonts/OFL.txt: Geist's SIL Open Font License)
# plant: {"file": "package-lock.json", "find": "\"license\": \"BSD-2-Clause\"", "with": "\"license\": \"GPL-3.0\"", "why": "a GPL package"}
node - <<'JS'
const fs = require('fs');
const OK = /^(MIT|BSD-[23]-Clause|0BSD|Apache-2\.0|ISC|Zlib|Unlicense|CC0-1\.0)$/;
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8')); let bad = 0, n = 0;
for (const [k, v] of Object.entries(lock.packages || {})) {
  if (!k) continue; n++;
  const l = String(v.license || '');
  if (!l.replace(/[()]/g, '').split(/\s+OR\s+/).some((x) => OK.test(x.trim()))) { console.log(`::error::${k.replace(/^node_modules\//, '')}: licence "${l}" is not on the allowlist (MIT, BSD, Apache, ISC, zlib, Unlicense, CC0)`); bad = 1; }
}
const fonts = fs.readdirSync('site/assets/fonts').filter((f) => /\.(woff2?|ttf|otf)$/.test(f));
if (fonts.length && !fs.existsSync('site/assets/fonts/OFL.txt')) { console.log('::error::site/assets/fonts: the fonts without their licence (OFL.txt)'); bad = 1; }
if (!bad) console.log(`licences: ${n} packages on the allowlist; ${fonts.length} fonts beside OFL.txt`);
process.exit(bad);
JS
