#!/usr/bin/env bash
# check: No frameworks: pure HTML, CSS and JS
# kind: fast
# enforces: no-frameworks
# (RULES.json no-frameworks, automated 2026-11-07) package.json has no runtime dependency and no build tool but
# terser; no served file is a module, a model, a binary engine or a frame of another page (no import/export, no
# require, no .wasm/.glb/.gltf/.obj/.fbx, no iframe); the world is drawn in the page, in WebGL2, from code
# plant: {"file": "package.json", "find": "\"devDependencies\": {", "with": "\"dependencies\": { \"react\": \"18.3.1\" },\n  \"devDependencies\": {", "why": "a runtime framework"}
node - <<'JS'
const fs = require('fs'), path = require('path'); let bad = 0; const err = (m) => { console.log('::error::' + m); bad = 1; };
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (pkg.dependencies && Object.keys(pkg.dependencies).length) err('package.json has runtime dependencies: ' + Object.keys(pkg.dependencies).join(', '));
for (const d of Object.keys(pkg.devDependencies || {})) if (d !== 'terser') err('package.json: a build dependency other than terser: ' + d);
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
for (const f of walk('site')) {
  if (/\.(wasm|glb|gltf|obj|fbx|usdz|unity3d|pak)$/i.test(f)) err(f + ': a model or an engine file (the world is generated in code)');
  if (/\.html$/.test(f) && /<iframe\b|type=["']module["']/i.test(fs.readFileSync(f, 'utf8'))) err(f + ': an iframe or a module script');
  // (its only pictures are its own first frames) no picture is committed but the icons: the openings' stills are the
  // bake's (tools/gpu/bake-stills.js), an input folder the build copies, never site/'s
  if (/\.(png|jpe?g|webp|avif|gif|bmp|heic)$/i.test(f) && !/^site[\\/]assets[\\/](favicon|apple-touch-icon)\.png$/.test(f)) err(f + ': a picture in site/ (the only pictures are the world\'s own first frames, baked at build time)');
}
// and every picture the build serves under assets/still/ is a still by the bake's name (<sky>-<k>-<tier>-<W>x<H>.avif)
const sd = 'build/site/assets/still';
if (fs.existsSync(sd)) for (const f of fs.readdirSync(sd)) if (!/^(dawn|day|rain|sunset|dusk|night)-\d+-(hi|lo)-\d+x\d+\.avif$/.test(f)) err(sd + '/' + f + ': not a baked still by its name');
process.exit(bad);
JS
node tools/checks/nocomments.mjs build/site "$RUNNER_TEMP/nc" 2>/dev/null || node tools/checks/nocomments.mjs site "$RUNNER_TEMP/nc"
if grep -nE '^[[:space:]]*(import|export)[[:space:]]|\brequire\(' "$RUNNER_TEMP"/nc/*.js | grep -v "^$RUNNER_TEMP/nc/plan" | head -5 | grep .; then
  echo "::error::a served script imports, exports or requires (pure JS: classic scripts only)"; exit 1
fi
echo "no frameworks: no runtime dependency, terser alone to build, no module, model, engine or iframe; no picture but the icons and the baked stills"
