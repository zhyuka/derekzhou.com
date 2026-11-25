  /* (fast500 lane E, the folds: ef.py) a uniform, or one component of it, whose value is fixed for the page is written
     into the program's text at its issue as the literal it always has, so the compiler folds the branch it selects.
     Declarations are never touched (their lines start "uniform"): a location stays, or goes inactive where nothing reads
     it, and every set of such a uniform is guarded. Class A (EF1): uDbg 0 where the defines say no dev use (CLA.dev).
     Class B (EFB, the parallel compile only): the composite's per-device modes, with the general composite late beside
     it (foldPick). A token a program does not hold is passed over (FOLDX.absent) */
  var FOLDX = { on: false, fixed: null, prog: {}, absent: {}, live: null, miss: 0, misses: [], used: 0, B: false };
  function foldFixed() {
    if (FOLDX.fixed) return FOLDX.fixed;
    defsA();
    var f = [];
    if (!CLA.dev) f.push(['uDbg', '0']);
    FOLDX.fixed = f; FOLDX.on = true;
    return f;
  }
  function foldTok(s, tok, lit) {   // every use of tok outside a declaration line, as lit
    var n = 0;
    if (tok.charAt(0) === '=') { var parts = s.split(tok.slice(1)); n = parts.length - 1; return { s: n ? parts.join(lit) : s, n: n }; }
    if (s.indexOf(tok) < 0) return { s: s, n: 0 };
    var re = new RegExp('\\b' + tok.replace('.', '\\.') + '(?![\\w.])', 'g');
    var out = s.replace(re, function (m, off) { var ls = s.lastIndexOf('\n', off) + 1; if (/^\s*uniform\b/.test(s.slice(ls, ls + 24))) return m; n++; return lit; });
    return { s: out, n: n };
  }
  function foldIssue(P) {   // (progIssue) the folds into P.vs and P.fs before they are given
    if (P.vs === null) return;
    var vs = P.vs, fs = P.fs, got = [], abs = [];
    function one(list) {
      var kept = [];
      for (var i = 0; i < list.length; i++) {
        var a = foldTok(vs, list[i][0], list[i][1]), b = foldTok(fs, list[i][0], list[i][1]);
        if (a.n + b.n) { vs = a.s; fs = b.s; got.push(list[i][0].replace(/^=/, '') + ' = ' + list[i][1]); kept.push(list[i]); } else abs.push(list[i][0].replace(/^=/, ''));
      }
      return kept;
    }
    one(foldFixed());
    P.vs = vs; P.fs = fs;
    if (got.length) FOLDX.prog[P.name] = got;
    if (abs.length && DEVMODE) FOLDX.absent[P.name] = abs;
  }
  var UNITS = { uN3: 0, uKW: 1, uDepth: 2, uScene: 3, uCloud: 4, uBloom: 5, uShaft: 6, uTex: 7, uTex2: 8, uTex3: 8, uLinD: 9, uVol: 10, uGround: 11, uCSh: 12, uWin: 13, uPts: 7, uHist: 14, uSceneH: 15, uHP0: 16, uHP1: 17, uHP2: 18, uHP3: 19, uHP4: 20, uHP5: 21, uHP6: 22, uHP7: 23 };
  function finish(P) {   // true: linked; false: broken; LOSTP: the context was lost (asked again after the restore)
    if (P.st === 3) return P.ok;
    if (P.st !== 2) return false;
    if (gl.isContextLost()) return LOSTP;
    var st = gl.getProgramParameter(P.p, gl.LINK_STATUS);
    if (st === null || gl.isContextLost()) return LOSTP;
    if (!st) {
      var log = P.name + ': ' + (gl.getShaderInfoLog(P.v) || '') + ' / ' + (gl.getShaderInfoLog(P.f) || '') + ' / ' + (gl.getProgramInfoLog(P.p) || '');
      if (gl.isContextLost()) return LOSTP;
      fail(log); P.u = {}; P.ok = false; P.st = 3; return false;
    }
    var u = {}, n = gl.getProgramParameter(P.p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) { var a = gl.getActiveUniform(P.p, i); if (a) u[a.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(P.p, a.name); }
    P.u = u; P.ok = true; P.st = 3;
    if (REC) recLink(P, true);   // (E0: each link's completion, for the boot's timeline)
    gl.useProgram(P.p);
    for (var k in UNITS) if (u[k]) gl.uniform1i(u[k], UNITS[k]);
    gl.deleteShader(P.v); gl.deleteShader(P.f); P.v = P.f = null;
    return true;
  }

