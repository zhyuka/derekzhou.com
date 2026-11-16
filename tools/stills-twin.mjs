// stills-twin.mjs: the still's preload put back in the twin the PC bakes (stills.yml, before bake-stills.js).
//   node tools/stills-twin.mjs SITE_INDEX TWIN_DIR
// SITE_INDEX is the commit's site/index.html; TWIN_DIR the settled twin of its plain build (served/head-twin), whose
// index.html has no preload (tools/build.mjs takes it out of a build with no stills): without it the page asks for no
// still and the bake stops at its first ("the page asked for  (sky dawn)", run 43409850998). Edits TWIN_DIR/index.html
// in place (tools/stills.mjs withPreload); the world key is read from served/head, never the twin, so it is unchanged.
import fs from 'fs';
import path from 'path';
import { withPreload } from './stills.mjs';

const [src, twin] = process.argv.slice(2);
if (!src || !twin) { console.error('usage: stills-twin.mjs SITE_INDEX TWIN_DIR'); process.exitCode = 2; }
else {
  const ix = path.join(twin, 'index.html'), built = fs.readFileSync(ix, 'utf8'), out = withPreload(fs.readFileSync(src, 'utf8'), built);
  if (out !== built) fs.writeFileSync(ix, out);
  console.log('stills-twin: ' + (out === built ? 'the preload is there already' : 'the still preload put back in ' + ix));
}
