  /* creatures: a flock's uniforms from its description: { kind: 'bird' | 'ray' | 'moth' | 'jelly' | 'cap', n (<= 32), at,
     u0, drift [x, z] (m/s), orbit (m), wheel (rad/s), size (m), flap (Hz: the beat, the flutter, a jelly's pulse),
     spread (m: heights), lit, shade (colours), glow ([r, g, b], linear HDR: its own light; moths, jellies, caps),
     bob: [m, period s], layout: 'orbit' | 'helix' | 'still', helix: [radius m, step deg, rise m a step, turn deg/s] } */
  var FKIND = { bird: 1, ray: 2, moth: 3, jelly: 4, cap: 5 };
  /* whether any cell or event has laid out a creature this visit:
     until one is, its program is held to after the show (lateHeld); once one is, it is issued at once, and the show
     waits for it (lateSeenReady, stage G) */
  var LATEK = { creature: 0 };
  function flockOf(f) {
    var kd = FKIND[f.kind] || 1, hx = f.helix || [4, 40, 5, 0], bob = f.bob || [0, 1];
    return { ray: kd === 2, kind: kd, n: Math.min(f.n || 12, 32), a: new Float32Array([f.at[0], f.at[1], f.at[2], f.u0 || 0]), b: new Float32Array([f.drift ? f.drift[0] : 0, f.drift ? f.drift[1] : 0, f.orbit || 30, kd]),
      c: new Float32Array([f.wheel || 0.3, f.size || 1.3, f.flap || 3, f.spread || 8]), lit: new Float32Array(f.lit || [1, 1, 1]), shade: new Float32Array(f.shade || [0.6, 0.6, 0.7]), life: f.life || null,
      d: new Float32Array([bob[0], 2 * PI / Math.max(bob[1], 0.1), f.layout === 'helix' ? 1 : f.layout === 'still' ? 2 : 0, 0]), e: new Float32Array([hx[0], hx[1] * DEG, hx[2], (hx[3] || 0) * DEG]), glow: new Float32Array(f.glow || [0, 0, 0]) };
  }

