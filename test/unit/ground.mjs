// test/unit/ground.mjs: the recorded ground's freshness hash (test/ground.mjs landHash) is the land's text, not its
// files: a byte-for-byte split of an input section keeps it (no re-record on the 4090), an edit to the code changes it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { landHash, INPUTS, ROOT } from '../ground.mjs';

function copyInputs() {   // the land's inputs, copied to a scratch root (paths as in the repository)
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'landhash-'));
  for (const p of INPUTS) fs.cpSync(path.join(ROOT, p), path.join(root, p), { recursive: true });
  return root;
}
const FILE = 'src/world/160-weights-grids.js', GLSL = 'src/glsl/dunes-glsl.glsl';

test('ground: the hash of the copied inputs is the repository\'s', () => {
  const root = copyInputs();
  try { assert.equal(landHash(root), landHash()); } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('ground: a section split byte for byte keeps the hash; a comment edit too', () => {
  const root = copyInputs();
  try {
    const h0 = landHash(root), f = path.join(root, FILE), s = fs.readFileSync(f, 'utf8');
    const lines = s.split('\n'), cut = lines.length >> 1, name = FILE.replace('160-weights-grids', '161-weights-grids-split');
    fs.writeFileSync(f, lines.slice(0, cut).join('\n') + '\n');
    fs.writeFileSync(path.join(root, name), lines.slice(cut).join('\n'));
    const inputs = INPUTS.slice(); inputs.splice(inputs.indexOf(FILE) + 1, 0, name);
    assert.equal(landHash(root, inputs), h0, 'the split: the same text in two files');
    fs.appendFileSync(f, '  // a comment, nothing else\n');
    assert.equal(landHash(root, inputs), h0, 'a comment added');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('ground: an edit to the land\'s code, a missing input or a reordering changes the hash', () => {
  const root = copyInputs();
  try {
    const h0 = landHash(root), g = path.join(root, GLSL), s = fs.readFileSync(g, 'utf8');
    assert.ok(s.includes('return 40.0 * '), 'the plant\'s constant is where 37-ground-fresh plants it');
    fs.writeFileSync(g, s.replace('return 40.0 * ', 'return 41.0 * '));
    assert.notEqual(landHash(root), h0, 'a land constant changed');
    fs.writeFileSync(g, s);
    assert.equal(landHash(root), h0, 'and put back');
    assert.notEqual(landHash(root, INPUTS.concat(['src/world/999-not-there.js'])), h0, 'a missing input');
    const f = path.join(root, FILE), t = fs.readFileSync(f, 'utf8');
    fs.rmSync(f); fs.writeFileSync(path.join(root, 'src/world/001-weights-grids.js'), t);
    const moved = INPUTS.map((p) => (p === FILE ? 'src/world/001-weights-grids.js' : p));
    assert.notEqual(landHash(root, moved), h0, 'the same file moved to another place in the order');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
