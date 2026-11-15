// the drag's fix: the finger's place sampled once a frame on the flight's own time axis, each step reading it at its own time
export const FIX_DRAG = [
  ['    SIM.acc += Math.min(dt, DTMAX);',
   '    SIM.acc += Math.min(dt, DTMAX);\n    INP.cx += INP.dx; INP.cy += INP.dy; INP.dx = 0; INP.dy = 0;\n    INPS.push(SIM.t + SIM.acc, INP.cx, INP.cy); if (INPS.length > 24) INPS.splice(0, 3);'],
  ['    var G = (PI / 2) / Math.max(OUT.cssW || 800, 240), dx = INP.dx, dy = INP.dy, any = false;\n    INP.dx = 0; INP.dy = 0;',
   '    var G = (PI / 2) / Math.max(OUT.cssW || 800, 240), any = false;\n' +
   '    INP.cx += INP.dx; INP.cy += INP.dy; INP.dx = 0; INP.dy = 0;\n' +
   '    var fx = INP.cx, fy = INP.cy;\n' +
   '    if (INP.down && !INP.rel) { for (var q = INPS.length - 3; q >= 0; q -= 3) if (INPS[q] <= t + 1e-9) { if (q + 3 < INPS.length) { var w = (t - INPS[q]) / Math.max(INPS[q + 3] - INPS[q], 1e-9); fx = INPS[q + 1] + (INPS[q + 4] - INPS[q + 1]) * w; fy = INPS[q + 2] + (INPS[q + 5] - INPS[q + 2]) * w; } else { fx = INPS[q + 1]; fy = INPS[q + 2]; } break; } }\n' +
   '    var dx = fx - INP.ux, dy = fy - INP.uy; INP.ux = fx; INP.uy = fy;'],
  ['  var INP = { dx: 0, dy: 0, down: false, rel: false, n: 0, lastDx: 0, evT0: 0 };',
   '  var INP = { dx: 0, dy: 0, down: false, rel: false, n: 0, lastDx: 0, evT0: 0, cx: 0, cy: 0, ux: 0, uy: 0 }, INPS = [];']
];
