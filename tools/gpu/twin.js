'use strict';
// twin.js (tools/gpu): a build's SETTLED TWIN, for T2 only (never deployed).
//   node tools/gpu/twin.js REPO BUILD OUT
// REPO: the commit's checkout (its src/, tools/ and node_modules: npm ci done); BUILD: its plain build (tools/build.mjs
// --plain, as .github/ci/served.sh makes); OUT (new): BUILD copied, then its world script made again from the settled
// source: REPO's src assembled as shipped (tools/parts.mjs assemble --ship), the world settled (settle.js), minified with
// REPO's own minify (tools/minify.mjs --build), the same way the build makes it, and copied over OUT's.
// The twin is inert without window.__SETTLE, so only gstep --settle sees a difference.
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const [repo, build, out] = process.argv.slice(2).map((p) => p && path.resolve(p));
if (!repo || !build || !out) { console.error('usage: twin.js REPO BUILD OUT'); process.exit(2); }
if (fs.existsSync(out)) { console.error('twin: ' + out + ' exists (give a new folder)'); process.exit(2); }
fs.cpSync(build, out, { recursive: true });
const tmp = fs.mkdtempSync(path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'twin-')), ship = path.join(tmp, 'ship');
const node = (args) => execFileSync(process.execPath, args, { cwd: repo, stdio: ['ignore', 'pipe', 'inherit'] }).toString();
node([path.join(repo, 'tools', 'parts.mjs'), 'assemble', '--ship', path.join(repo, 'src'), ship]);
const worlds = fs.readdirSync(ship).filter((f) => /^world(\.v\d+)?\.js$/.test(f));
if (worlds.length !== 1) { console.error('twin: want one world script in the shipped build, found ' + worlds.join(', ')); process.exit(1); }
console.log(node([path.join(__dirname, 'settle.js'), path.join(ship, worlds[0])]).trim());
// minified into an empty folder (no index.html there, so minify makes no start file: the build's own start file and
// table stay, the settle edit changes no GLSL), then only the world script copied over the twin
const min = path.join(tmp, 'min'); fs.mkdirSync(min);
node([path.join(repo, 'tools', 'minify.mjs'), '--build', ship, min]);
fs.copyFileSync(path.join(min, worlds[0]), path.join(out, worlds[0]));
const a = fs.readFileSync(path.join(build, worlds[0])), b = fs.readFileSync(path.join(out, worlds[0]));
if (a.equals(b)) { console.error('twin: the twin\'s ' + worlds[0] + ' is the build\'s own (the settle edit did not reach it)'); process.exit(1); }
console.log('twin: ' + out + ' (' + worlds[0] + ' ' + a.length + ' -> ' + b.length + ' B)');
