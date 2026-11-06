  /* ---------------------------------------------------------------- engine programs (shared by every realm) */
  var EP = {}, ENG = { st: 0, k: 0, names: null };
  var NOISE3 = null, GRID = null, FULLVAO = null, QUAD_VB = null, STRIP = null, VCUBE = null, VTMP = null, ICO = null, BAKEFB = null, CREATURE = null;
  /* (E1) the engine's own resources and programs, made once (again after a lost context) by the boot's stages: B the
     objects (bootObjects), C the programs with every realm's and the birds' (progStep), E the noise (noiseStep). The
     harness's stills (and a restore under them) make all of it at once: engineStep(true) */
  function engineStep(sync) {
    if (ENG.st < 0) return false;
    if (gl.isContextLost()) return false;
    if (ENG.st === 0) { bootObjects(); ENG.st = 1; }
    var r = progStep(true, 0);
    if (r === LOSTP) return false;
    if (!progsDone() || PROGX.broken && !engineOk()) { ENG.st = -1; return false; }
    noiseStep(true);
    ENG.st = 2;
    return true;
  }
  function engineOk() { for (var k in EP) if (!EP[k].ok && !(EP[k].late && EP[k].st !== 3)) return false; return true; }   // (fast500 step 1b: the noise has no program)
  /* stage B: every object the engine draws with (the grid, the strips, the cube, the icosahedron, the bake's scratch,
     the creatures, the glows' quad, the noise, the read-back ring, the warm table's targets), and the registration of
     its programs and every realm's (compiled at stage C, all at once) */
  function bootObjects() {
    buildEngine();
    poolPre();   // (E1 Fix 3: the cells' and visits' objects made ahead)
    for (var k = 0; k < ORDER.length; k++) { var d = REALMS[ORDER[k]]; if (!d.bad) realmProgs(d); }
  }
  /* (hotfix G0, pass 2) does this GPU filter an 8-bit texture at 8 bits? Two texels 4 codes apart (the clouds' soft
     band is about four and a half codes wide), sampled at 64 points between them into a half-float target and read
     back: filtered at 8 bits the answer comes in steps of a whole code (an error up to half a code, 0.002); filtered
     in float, or with 8-bit weights on a float result, under a hundredth of a code. Where it is 8-bit (WebKit's
     renderer here) the clouds' volumes are made at 16 bits (VOL16); elsewhere (SwiftShader, and the GPUs that filter
     in float) they stay RGBA8, half the bytes and the bandwidth. Unknown (no float targets: RGBA8 as ever; a read that
     fails: 16 bits, the safe side). The record files the answer (device.vol16, device.filtErr), so the owner's next
     record says what the iPhone does. Switch vol16=0/1 forces it (dev, the record's A/B) */
  var VOL16 = false, FILTERR = -1;
  function probeFilter() {
    VOL16 = false; FILTERR = -1;
    if (!FLOAT_RT) return;
    var P = null, vs = null, fs = null, T = null, R = null, F = null;
    try {
      vs = gl.createShader(gl.VERTEX_SHADER); gl.shaderSource(vs, '#version 300 es\nvoid main() { gl_Position = vec4(float((gl_VertexID & 1) * 4 - 1), float((gl_VertexID >> 1) * 4 - 1), 0.0, 1.0); }'); gl.compileShader(vs);
      fs = gl.createShader(gl.FRAGMENT_SHADER); gl.shaderSource(fs, '#version 300 es\nprecision highp float; uniform sampler2D uT; out vec4 o;\nvoid main() { float f = (gl_FragCoord.x - 0.5) / 63.0; o = texture(uT, vec2((0.5 + f) * 0.5, 0.5)); }'); gl.compileShader(fs);
      P = gl.createProgram(); gl.attachShader(P, vs); gl.attachShader(P, fs); gl.linkProgram(P);
      if (!gl.getProgramParameter(P, gl.LINK_STATUS)) throw new Error('probe');
      gl.activeTexture(gl.TEXTURE0);
      T = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, T);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 2, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0, 4, 4, 4, 4]));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      R = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, R); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, 64, 1, 0, gl.RGBA, gl.HALF_FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      F = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, F); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, R, 0);
      gl.viewport(0, 0, 64, 1); gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE);
      gl.useProgram(P); gl.uniform1i(gl.getUniformLocation(P, 'uT'), 0); gl.bindTexture(gl.TEXTURE_2D, T);
      gl.bindVertexArray(FULLVAO); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.bindVertexArray(null);
      var px = new Float32Array(256); px.fill(-1); gl.readPixels(0, 0, 64, 1, gl.RGBA, gl.FLOAT, px);
      var e = 0; for (var i = 0; i < 64; i++) e = Math.max(e, Math.abs(px[i * 4] - i / 63 * 4 / 255));
      FILTERR = e; VOL16 = !(e < 0.0008);
    } catch (err) { VOL16 = true; FILTERR = -2; }
    if (F) gl.deleteFramebuffer(F); if (R) gl.deleteTexture(R); if (T) gl.deleteTexture(T); if (P) gl.deleteProgram(P); if (vs) gl.deleteShader(vs); if (fs) gl.deleteShader(fs);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.bindTexture(gl.TEXTURE_2D, null); gl.useProgram(null);
    if (SW.vol16 === 0) VOL16 = false; else if (SW.vol16 === 1) VOL16 = true;
  }
  function buildEngine() {
    GRID = makeGrid();
    FULLVAO = gl.createVertexArray();
    probeFilter();   // (pass 2: before any volume is made)
    var sv = [], i; for (i = 0; i <= 32; i++) sv.push(i / 32, -1, i / 32, 1);
    STRIP = { vb: gl.createBuffer(), vaoP: gl.createVertexArray(), vaoR: gl.createVertexArray(), n: 66 };
    gl.bindBuffer(gl.ARRAY_BUFFER, STRIP.vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sv), gl.STATIC_DRAW);
    gl.bindVertexArray(STRIP.vaoR); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    var qv = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, qv); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, -1, 1, -1, 0, 1, 1, 1]), gl.STATIC_DRAW);
    gl.bindVertexArray(STRIP.vaoP); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    // the unit cube a cloud volume is drawn as (36 corners), and the bake's scratch density (64 cubed)
    var cv = [], C = [[-1, -1, -1], [1, -1, -1], [-1, 1, -1], [1, 1, -1], [-1, -1, 1], [1, -1, 1], [-1, 1, 1], [1, 1, 1]];
    [[0, 2, 3, 1], [4, 5, 7, 6], [0, 1, 5, 4], [2, 6, 7, 3], [0, 4, 6, 2], [1, 3, 7, 5]].forEach(function (q) { [q[0], q[1], q[2], q[0], q[2], q[3]].forEach(function (k) { cv.push(C[k][0], C[k][1], C[k][2]); }); });
    VCUBE = { vao: gl.createVertexArray(), vb: gl.createBuffer() };
    gl.bindVertexArray(VCUBE.vao); gl.bindBuffer(gl.ARRAY_BUFFER, VCUBE.vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cv), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0); gl.bindVertexArray(null);
    (function () {   // an icosahedron, 20 faces as 60 vertices
      var t = (1 + Math.sqrt(5)) / 2, V3 = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
      var F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]], out = [], l = Math.sqrt(1 + t * t);
      F.forEach(function (f) { f.forEach(function (i) { out.push(V3[i][0] / l, V3[i][1] / l, V3[i][2] / l); }); });
      ICO = { vb: gl.createBuffer() }; gl.bindBuffer(gl.ARRAY_BUFFER, ICO.vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(out), gl.STATIC_DRAW);
    })();
    // (E1) the glows' quad, made here (round 3b made it with the first glows, in flight)
    QUAD = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, QUAD); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    VTMP = { t: gl.createTexture(), f: gl.createFramebuffer() };
    gl.activeTexture(gl.TEXTURE8); gl.bindTexture(gl.TEXTURE_3D, VTMP.t);
    gl.texImage3D(gl.TEXTURE_3D, 0, VOL16 ? gl.RG16F : gl.RG8, 64, 64, 64, 0, gl.RG, VOL16 ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);   // the distance with its billows, and without (pass 2: half floats where VOL16, as the volumes)
    tex3params(); gl.activeTexture(gl.TEXTURE0);
    var list = [
      ['sky', VS_FAR, FS_SKY], ['depth', VS_FULL, FS_DEPTHDOWN],
      ['pre', VS_FULL, FS_PRE], ['down', VS_FULL, FS_DOWN], ['up', VS_FULL, FS_UP], ['comp', VS_FULL, FS_COMP], ['blit', VS_FULL, FS_BLIT],
      ['vdens', VS_FULL, FS_VDENS], ['vlight', VS_FULL, FS_VLIGHT], ['vbody', VS_VBODY, FS_VBODY], ['occ', VS_OCC, FS_OCC], ['creature', VS_CREATURE, FS_CREATURE],
      ['glow', VS_GLOW, FS_GLOW], ['beam', VS_BEAM, FS_BEAM], ['cacc', VS_FULL, FS_CACC]
    ];
    EP = {};
    noiseInit();   // (the noise's texture, and its bake's stream: fast500 step 1b, no program)
    list.forEach(function (l) { EP[l[0]] = compile(l[1], l[2], 'engine.' + l[0]); });
    BAKEFB = gl.createFramebuffer();
    makeCreatures();
    rbInit();
    warmInit();
    return true;
  }
  function makeCreatures() {   // the meshes: a gull (an M of two jointed wings) and a ray (a diamond, its wings in strips), one buffer
    var v = [], i;
    function T(a, b, c) { v.push(a[0], a[1], a[2], a[3], b[0], b[1], b[2], b[3], c[0], c[1], c[2], c[3]); }
    [-1, 1].forEach(function (s) {
      var sh0 = [0.05 * s, 0, 0.12, 0], sh1 = [0.05 * s, 0, -0.1, 0], wr0 = [0.27 * s, 0.03, 0.07, 1], wr1 = [0.27 * s, 0.03, -0.07, 1], tip = [0.52 * s, -0.02, -0.14, 2];
      T(sh0, wr0, wr1); T(sh0, wr1, sh1); T(wr0, tip, wr1);
      T([0, 0.01, 0.34, 0], [0.05 * s, 0, 0.05, 0], [0, 0.02, -0.1, 0]); T([0, 0.02, -0.1, 0], [0.04 * s, 0, -0.08, 0], [0, 0, -0.32, 0]);
    });
    var nb = v.length / 4, S = 4;
    [-1, 1].forEach(function (s) {
      for (i = 0; i < S; i++) {
        var x0 = i / S * 0.5, x1 = (i + 1) / S * 0.5, z0f = 0.45 - x0 * 0.95, z1f = 0.45 - x1 * 0.95, z0b = -0.18 + x0 * 0.2, z1b = -0.18 + x1 * 0.2;
        T([x0 * s, 0, z0f, -1 - x0 * 2], [x1 * s, 0, z1f, -1 - x1 * 2], [x1 * s, 0, z1b, -1 - x1 * 2]);
        T([x0 * s, 0, z0f, -1 - x0 * 2], [x1 * s, 0, z1b, -1 - x1 * 2], [x0 * s, 0, z0b, -1 - x0 * 2]);
      }
      T([0, 0.01, -0.18, -1], [0.03 * s, 0, -0.2, -1], [0, 0, -0.95, -1]);
    });
    var nr = v.length / 4 - nb;
    // a moth: a slim body, a rounded fore wing and a smaller hind wing on each side (w 1 fore, 2 hind)
    var m0 = v.length / 4;
    T([0, 0.02, 0.22, 0], [0.025, 0, 0, 0], [0, 0.02, -0.2, 0]); T([0, 0.02, 0.22, 0], [0, 0.02, -0.2, 0], [-0.025, 0, 0, 0]);
    [-1, 1].forEach(function (s) {
      function wing(z0, z1, span, w) {   // a fan of triangles from the root: a rounded wing
        var pts = [], k, N = 7;
        for (k = 0; k <= N; k++) { var a = k / N * Math.PI, r = span * (0.75 + 0.25 * Math.sin(a)); pts.push([s * (0.03 + Math.sin(a) * r), 0, (z0 + z1) / 2 + Math.cos(a) * (z1 - z0) / 2 * (0.6 + 0.4 * Math.sin(a))]); }
        var root = [s * 0.03, 0, (z0 + z1) / 2, w];
        for (k = 0; k < N; k++) T(root, [pts[k][0], 0, pts[k][2], w], [pts[k + 1][0], 0, pts[k + 1][2], w]);
      }
      wing(0.2, -0.06, 0.47, 1); wing(0.0, -0.26, 0.33, 2);
    });
    var nm = v.length / 4 - m0;
    // a jelly: a bell (w 0) and five threads hanging from its rim (w 1 at the rim .. 2 at the end), each two crossed ribbons
    var j0 = v.length / 4, PR = [[0.5, 0.0], [0.47, 0.18], [0.38, 0.36], [0.24, 0.5], [0.0, 0.56]], SG = 10;
    for (var pi = 0; pi + 1 < PR.length; pi++) for (var sg = 0; sg < SG; sg++) {
      var a0 = sg / SG * 2 * Math.PI, a1 = (sg + 1) / SG * 2 * Math.PI, P0 = PR[pi], P1 = PR[pi + 1];
      var A = [P0[0] * Math.cos(a0), P0[1], P0[0] * Math.sin(a0), 0], Bv = [P0[0] * Math.cos(a1), P0[1], P0[0] * Math.sin(a1), 0];
      var Cv = [P1[0] * Math.cos(a1), P1[1], P1[0] * Math.sin(a1), 0], Dv = [P1[0] * Math.cos(a0), P1[1], P1[0] * Math.sin(a0), 0];
      T(A, Bv, Cv); T(A, Cv, Dv);
    }
    for (var th = 0; th < 5; th++) {
      var ta = th / 5 * 2 * Math.PI + 0.3, tx = Math.cos(ta) * 0.3, tz = Math.sin(ta) * 0.3, W2 = 0.025;
      for (var sgm = 0; sgm < 3; sgm++) {
        var y0 = -sgm * 0.45, y1 = -(sgm + 1) * 0.45, w0 = 1 + sgm / 3, w1 = 1 + (sgm + 1) / 3;
        T([tx - W2, y0, tz, w0], [tx + W2, y0, tz, w0], [tx + W2, y1, tz, w1]); T([tx - W2, y0, tz, w0], [tx + W2, y1, tz, w1], [tx - W2, y1, tz, w1]);
        T([tx, y0, tz - W2, w0], [tx, y0, tz + W2, w0], [tx, y1, tz + W2, w1]); T([tx, y0, tz - W2, w0], [tx, y1, tz + W2, w1], [tx, y1, tz - W2, w1]);
      }
    }
    var nj = v.length / 4 - j0;
    // a floating cap: a shallow dome (w 0), a ring of beads at its rim (w 1), a disc beneath (w 2)
    var c0 = v.length / 4, CPR = [[1.0, 0.0], [0.96, 0.1], [0.72, 0.28], [0.34, 0.41], [0.0, 0.45]], CS2 = 14;
    for (pi = 0; pi + 1 < CPR.length; pi++) for (sg = 0; sg < CS2; sg++) {
      var b0 = sg / CS2 * 2 * Math.PI, b1 = (sg + 1) / CS2 * 2 * Math.PI, Q0 = CPR[pi], Q1 = CPR[pi + 1];
      T([Q0[0] * Math.cos(b0), Q0[1], Q0[0] * Math.sin(b0), 0], [Q0[0] * Math.cos(b1), Q0[1], Q0[0] * Math.sin(b1), 0], [Q1[0] * Math.cos(b1), Q1[1], Q1[0] * Math.sin(b1), 0]);
      T([Q0[0] * Math.cos(b0), Q0[1], Q0[0] * Math.sin(b0), 0], [Q1[0] * Math.cos(b1), Q1[1], Q1[0] * Math.sin(b1), 0], [Q1[0] * Math.cos(b0), Q1[1], Q1[0] * Math.sin(b0), 0]);
    }
    for (sg = 0; sg < CS2; sg++) { var d0 = sg / CS2 * 2 * Math.PI, d1 = (sg + 1) / CS2 * 2 * Math.PI; T([0, -0.01, 0, 2], [0.85 * Math.cos(d1), -0.01, 0.85 * Math.sin(d1), 2], [0.85 * Math.cos(d0), -0.01, 0.85 * Math.sin(d0), 2]); }
    for (sg = 0; sg < 12; sg++) {
      var e = sg / 12 * 2 * Math.PI, ex = Math.cos(e) * 1.02, ez = Math.sin(e) * 1.02, q = 0.06;
      T([ex, 0.08, ez, 1], [ex + q, 0.02, ez, 1], [ex, -0.04, ez, 1]); T([ex, 0.08, ez, 1], [ex, -0.04, ez, 1], [ex - q, 0.02, ez, 1]);
      T([ex, 0.08, ez, 1], [ex, 0.02, ez + q, 1], [ex, -0.04, ez, 1]); T([ex, 0.08, ez, 1], [ex, -0.04, ez, 1], [ex, 0.02, ez - q, 1]);
    }
    var nc = v.length / 4 - c0;
    CREATURE = { vao: gl.createVertexArray(), vb: gl.createBuffer(), bird: [0, nb], ray: [nb, nr], moth: [m0, nm], jelly: [j0, nj], cap: [c0, nc] };
    gl.bindVertexArray(CREATURE.vao); gl.bindBuffer(gl.ARRAY_BUFFER, CREATURE.vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0); gl.bindVertexArray(null);
  }

