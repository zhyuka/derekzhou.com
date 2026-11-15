import fs from 'node:fs'; import vm from 'node:vm';
const W = fs.readFileSync('asmfix/src/world.js', 'utf8'); const i = W.indexOf('  var RELN = 6;'), j = W.indexOf('  var IDLE_K = 0;');
const f = vm.runInThisContext('(function(){' + W.slice(i, j) + ' return relRate; })')();
const dt = 1 / 60, R = new Float32Array(12);
function fill(pos) { let ri = 0; for (let k = 0; k < 12; k++) { R[ri] = pos(k + 1) - pos(k); ri = (ri + 1) % 12; } return ri; }
let ri = fill((k) => 0.01 * k); console.log('constant 0.01/step -> rate', f(R, ri, dt).toFixed(4), 'expect', (0.01 / dt).toFixed(4));
ri = fill((k) => { const s = Math.min(1, k / 18); return 0.17 * s * s * (3 - 2 * s); }); console.log('smoothstep ending at rest', f(R, ri, dt).toFixed(4));
ri = fill((k) => { const s = Math.min(1, k / 12); return 0.17 * s * s * (3 - 2 * s); }); console.log('smoothstep ending exactly at the last', f(R, ri, dt).toFixed(4));
