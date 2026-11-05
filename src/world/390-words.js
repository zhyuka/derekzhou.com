  /* ---------------------------------------------------------------- the words */
  var WORDS = new Float32Array(20), WORDCOL = null, KEEPDIRTY = true, WLINE = [];   // ((line2 fix) WLINE: the line's own line boxes, canvas px (x0, y0, x1, y1 each), one a line: the client rects of the span its text is set in; [] none known)
  var wordEls = { name: document.querySelector('h1'), bio: document.querySelector('.words'),   /* (line2) the old bio's slot: the page's line under the name (the ink birds' keep-off covers it; the words' read takes it as block 3) */ credit: document.querySelector('.credit'), links: document.querySelectorAll('footer a') };
  /* (E0) the name is lettered (an inline SVG in the h1, no bio): its box is the ink's own, the path's bounds in the
     drawing put where the svg stands (read once, then only scaled); without it, the h1's box */
  var nameSvg = wordEls.name ? wordEls.name.querySelector('svg') : null, namePath = nameSvg ? nameSvg.querySelector('path') : null, NAMEBB = null;
  function nameInk(cr, k) {
    try {
      var vb = nameSvg.viewBox && nameSvg.viewBox.baseVal, r = nameSvg.getBoundingClientRect();
      if (!vb || !vb.width || !vb.height || r.width < 1 || r.height < 1) return false;
      if (!NAMEBB) { var b = namePath.getBBox(); if (!b || !b.width) return false; NAMEBB = [b.x, b.y, b.width, b.height]; }
      var s = Math.min(r.width / vb.width, r.height / vb.height), ox = r.left + (r.width - vb.width * s) / 2, oy = r.top + (r.height - vb.height * s) / 2;
      WORDS[0] = (ox + (NAMEBB[0] - vb.x) * s - cr.left) * k; WORDS[1] = (oy + (NAMEBB[1] - vb.y) * s - cr.top) * k;
      WORDS[2] = (ox + (NAMEBB[0] + NAMEBB[2] - vb.x) * s - cr.left) * k; WORDS[3] = (oy + (NAMEBB[1] + NAMEBB[3] - vb.y) * s - cr.top) * k;
      HW.nvb = [(ox - vb.x * s - cr.left) * k, (oy - vb.y * s - cr.top) * k, s * k];   // (life: the drawing's viewBox in canvas px, for the name's perches)
      return true;
    } catch (e) { return false; }
  }
  function measureWords() {
    var cr = canvas.getBoundingClientRect(), k = OUT.w / Math.max(cr.width, 1);
    WORDSIH = window.innerHeight;   // (fast500 no-fades: the height the boxes were measured at, for the moon's plan: a read, nothing built)
    function box(el, i) {
      if (!el) { WORDS[i * 4] = 0; WORDS[i * 4 + 1] = 0; WORDS[i * 4 + 2] = 0; WORDS[i * 4 + 3] = 0; return; }
      var b = el.getBoundingClientRect();
      WORDS[i * 4] = (b.left - cr.left) * k; WORDS[i * 4 + 1] = (b.top - cr.top) * k; WORDS[i * 4 + 2] = (b.right - cr.left) * k; WORDS[i * 4 + 3] = (b.bottom - cr.top) * k;
    }
    if (!(namePath && nameInk(cr, k))) box(wordEls.name, 0);
    box(wordEls.bio, 1); box(wordEls.credit, 2); box(wordEls.links[0], 3); box(wordEls.links[1], 4);
    /* (line2 fix) the line's own line boxes: the client rects of the span its text is set in, one a line (a read of the
       layout, as the boxes above; nothing built). The line's ground is read under them alone, never under its ragged
       right or the empty end of its last line (ground under no letter). No span: none, and the line is not read */
    WLINE.length = 0;
    var le = wordEls.bio && wordEls.bio.querySelector ? wordEls.bio.querySelector(':scope > span') : null, lr = le ? le.getClientRects() : [];
    for (var i = 0; i < lr.length; i++) if (lr[i].right - lr[i].left >= 1 && lr[i].bottom - lr[i].top >= 1) WLINE.push((lr[i].left - cr.left) * k, (lr[i].top - cr.top) * k, (lr[i].right - cr.left) * k, (lr[i].bottom - cr.top) * k);
    KEEPDIRTY = true;
  }
  function drawInkKeep() {   // (world6w) the ink birds' keep-off, when the words move
    if (!KEEPDIRTY || !TG || !lateReady(EP.inkkeep)) return;   // (fast500 step 9: dirty until its program can draw)
    KEEPDIRTY = false;
    var P = EP.inkkeep; gl.useProgram(P.p);
    gl.bindFramebuffer(gl.FRAMEBUFFER, TG.inkKeep.f); gl.viewport(0, 0, TG.inkKeep.w, TG.inkKeep.h);
    gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST);
    gl.uniform4fv(P.u.uWords, WORDS); gl.uniform2f(P.u.uOut, OUT.w, OUT.h); gl.uniform1f(P.u.uMS, OUT.w / TG.inkKeep.w); gl.uniform1f(P.u.uDpr, OUT.dpr || 1);
    gl.bindVertexArray(FULLVAO); gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  /* (world6w, the owner's word of 2026-10-21: "remove that white background behind the text. it's fine failing
     accesibility") the words' colours. Nothing is done to the world for the words: no lift, no floor, no gain, no toe;
     the composite takes nothing from them (the same frame with the words' machinery on or off). (stage2, the owner's
     word of 2026-11-03: "lets only use white text for everything so never use any scenes that dont pass white text")
     Every sky's words are light, so the words are always the light set, from the stylesheet's first paint on: no ground
     rule, no flip, no dark ink (the skies hold their own light under the light ceiling, so near-white reads on them).
     (stage2 check) Every colour of the words is a constant, the same in the stylesheet and here, for every sky and
     every moment, chosen against the light ceiling itself (W8: no pixel the world draws stands above OKLab L 0.53
     outside the moon's footprint, which keeps off the words, and the ink birds, which keep off them too): the text
     #fdfcf7 reads 5.13:1 on L 0.53, the dimmed grey #ebeffa (the credit; the links' underline) 4.59:1, the ring #f4e2b0
     4.1:1. A grey worked out from the read-back (the composite at an eighth, for the credit's lightest ground x1.2) fell
     to 4.27:1 at 1920x1080 (seed 11, the moonlit sky): an eighth averages a thin lit edge under the credit away. So the
     words' machinery is off (AG.on false): no read-back, no take, nothing set on .stack or the footer; the root takes
     the set (setWords) as the stylesheet has it. The code below is the record's, unreached */
  var WORDSETS = { light: { text: '#fdfcf7', dimmed: '#ebeffa', focus: '#f4e2b0', selection: '#3b3f55' } }, INK = 'light';
  var INK_YC = 0.356;   // (the light grey's default ground, before a reading)
  var INK_TAKE = 0.5, INK_TAKEN = 3;   // (the take: the readings of the frames shown in the generation's first INK_TAKE s, at least INK_TAKEN of them, once the canvas has been shown INK_TAKE s)
  var GS_K = 8, AG_R = 4.7, AG_PAGE = 1, AG_PSTEP = 0.25;   // ((line2) AG_PAGE: a read made without the line's block keeps the line's last reading of the generation, at most AG_PAGE s older)   // ((line2 fix) AG_PSTEP: in flight the line's block is read with the words at most once in AG_PSTEP s of frames, and only where it crowds no other read (agLineDue))
  var AG_LRING = '#f4e2b0', AG_LGREY = hex('#c9cdd6'), AG_LSPARE = 1.2;   // ((tod fix3) AG_LSPARE: the light grey worked out on the credit's lightest ground read x1.2, a fifth to spare, as sky.v3.js does)
  /* AG: the grounds (per block: 0 the name, 1 the credit, 2 the links, 3 (line2) the line under the name: yd the 3rd
     percentile, ym the lightest, y0 the darkest; AGL the block's sorted luminances), the groups (GQ: 0 the stack, 1 the
     links: p10, p50, p90, their worst grounds lo and hi, the take), the inks (sk the stack's, lk the links'; null: none
     set yet; stage2: always light) and the credit's grey worked out (sdl, shown as sdim) */
  var AG = { on: false, n: 0, yd: [-1, -1, -1, -1], ym: [-1, -1, -1, -1], y0: [-1, -1, -1, -1], u0: [-1, -1, -1, -1], ud: [-1, -1, -1, -1], u97: [-1, -1, -1, -1], um: [-1, -1, -1, -1], un: [0, 0, 0, 0], pg: -1, pt: -1, pl: -1, ph: -1, pq: -1e9, qg: -1, trim: 0, miss: 0, sdim: '', reads: 0, rd: -1,
    lk: null, flips: 0, sk: null, sflips: 0, log: [], rgb: [null, null, null], sh: [0, 0], sdl: '', gen: 0, rg: -1, tk: [-1, -1], t0: -1, w0: -1e9, rt: -1, wn: 0, ink: false, ik: [false, false], fz: -1 };   // (ink fix) t0: the generation's start on the clock (-1: not shown); w0: the first frame shown, on the wall; fz: the wall when the flight's clock last ran (reduced motion's rule clock); rt: the frame the read last landed was drawn at; wn: the readings in the take; ink: the words' colours are the world's (from the first take); ik: each group's (the credit's grey from the stack's take, the links' underline and ring from the links')   // (ink load fix) gen: the words' reading's generation (inkRestart); rg: the generation of the read last landed; tk: when each group last took its ink at once   // (line2) pg, pt: the generation and frame time of the line's block last landed; pl, ph: the line's darkest and lightest tenth as last counted in the stack's worst grounds (-1: not counted); trim: the words' reads made without the line's block for want of room in the slot (the old read); miss: those refused even so (no room for the old read, or no slot free)   // ((line2 fix) pq, qg: the frame time and generation of the last read sent with the line's block)
  var AGL = [null, null, null, null];
  var GQ = [{ p10: -1, p50: -1, p90: -1, n: 0, lo: -1, hi: -1, took: -1, ulo: -1, uhi: -1 }, { p10: -1, p50: -1, p90: -1, n: 0, lo: -1, hi: -1, took: -1 }];
  var AGW = { lo: [[], []], hi: [[], []], md: [[], []], yd: [2, 2] };   // (ink fix) the take's readings: each group's worst grounds (lo, hi) and median; the credit's and the links' darkest
  var stackEl = document.querySelector('.stack'), footEl = document.querySelector('footer');
  function agL2s(c) { return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; }
  function agHex(base, y) {   // the colour of base's hue at luminance y (scaled in linear light), as #rrggbb
    var k = y / Math.max(lum(base), 1e-6), s = '#';
    for (var i = 0; i < 3; i++) { var v = Math.round(clamp(agL2s(Math.min(base[i] * k, 1)), 0, 1) * 255); s += (v < 16 ? '0' : '') + v.toString(16); }
    return s;
  }
  /* a group's ground from its blocks' sorted luminances: p10, p50, p90 (the record's) */
  function agGroup(G, a) {
    var n = a ? a.length : 0; G.n = n;
    if (!n) { G.p10 = G.p50 = G.p90 = -1; return; }
    G.p10 = a[Math.min(n - 1, Math.floor(n * 0.1))]; G.p50 = a[Math.min(n - 1, Math.floor(n * 0.5))]; G.p90 = a[Math.min(n - 1, Math.floor(n * 0.9))];
  }
  /* (ink step, fix round) a group's worst grounds, as the read-back gives them under the words' own ink boxes (ungrown:
     the name's path bounds, the credit's box, each link's own box): dark ink's the darkest cell (AG.u0), light ink's the
     lightest (AG.um), one cell of the eighth-size composite each (6.4 CSS px on a phone at three device px a CSS px, 8
     at one: about a footer letter). (The ink step's
     first cut read the boxes grown 5-7 px for the ring's grey, dark on their 3rd percentile, light on their lightest
     cell: ground under no letter, leaning the links to dark.) */
  function inkWorst(G, bs, yd, ym) {
    var lo = 2, hi = -1;
    for (var i = 0; i < bs.length; i++) { var b = bs[i]; if (yd[b] >= 0 && ym[b] >= 0) { lo = Math.min(lo, yd[b]); hi = Math.max(hi, ym[b]); } }
    G.lo = hi >= 0 ? lo : -1; G.hi = hi;
  }
  /* (ink step, fix round) the stack's worst grounds: its ground's darkest tenth for dark ink (G.p10) and its lightest
     tenth for light ink (G.p90), as agGroup read them: the name is ten letters, its worst letter about a tenth of its
     ground; one dark cell under the credit's box (a cell is 8 CSS px) must not turn the whole name light on a mid-bright
     ground (step C's landing: 20% of 30 minutes, the median letter at |Lc| 31 where black read 64) */
  function inkDeciles(G) { G.lo = G.n > 0 ? G.p10 : -1; G.hi = G.n > 0 ? G.p90 : -1; }
  /* (ink load fix) the words' reading starts again: the next read taken from now on is each group's first, and sets its
     ink at once (agUpdate); the grounds read before are forgotten (a read queued earlier lands with its own generation
     and is not taken for the groups) */
  function inkRestart(show) {   // (ink fix: show, the first frame shown: the take waits for the dissolve, from the moment the canvas shows (render sets AG.w0 after the frame is drawn); a restart while the canvas is hidden opens no window until it shows)
    AG.gen++; GQ[0].n = 0; GQ[1].n = 0; AG.wn = 0; AG.t0 = show || shown ? SIM.t : -1; if (show) AG.w0 = 1e15;
    for (var k = 0; k < 2; k++) { AGW.lo[k].length = 0; AGW.hi[k].length = 0; AGW.md[k].length = 0; }
    AGW.yd[0] = AGW.yd[1] = 2;
  }
  /* (ink fix) a reading of a frame shown since the generation began, into its take: each group's worst grounds and
     median, the credit's and the links' darkest (the greys' grounds at the take) */
  function inkWin() {
    if (AG.wn >= 256) return;
    for (var k = 0; k < 2; k++) if (GQ[k].n > 0 && GQ[k].hi >= 0) { AGW.lo[k].push(GQ[k].lo); AGW.hi[k].push(GQ[k].hi); AGW.md[k].push(GQ[k].p50); }
    if (AG.yd[1] >= 0) AGW.yd[0] = Math.min(AGW.yd[0], AG.yd[1]); if (AG.yd[2] >= 0) AGW.yd[1] = Math.min(AGW.yd[1], AG.yd[2]);
    AG.wn++;
  }
  function inkMedOf(a) { var b = a.slice().sort(function (x, y) { return x - y; }), n = b.length; return n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2; }
  function inkMed() { for (var k = 0; k < 2; k++) if (AGW.lo[k].length) { GQ[k].lo = inkMedOf(AGW.lo[k]); GQ[k].hi = inkMedOf(AGW.hi[k]); GQ[k].p50 = inkMedOf(AGW.md[k]); } }   // (each group's grounds for its take: the medians over the take's readings)
  function agStack(kind) {   // (stage2: kind is always INK, light; AG.sflips counts any change, for the record: never one)
    if (AG.sk === kind || !stackEl) return;
    if (AG.sk !== null) { AG.sflips++; if (AG.log.length < 400) AG.log.push([+SIM.t.toFixed(2), 's', kind, SKYI.id, +SKYI.k.toFixed(3)]); }
    AG.sk = kind; AG.sdim = '';
    stackEl.style.setProperty('--color-text', WORDSETS[kind].text);
  }
  function agLinks(kind) {
    if (AG.lk === kind || !footEl) return;
    if (AG.lk !== null) { AG.flips++; if (AG.log.length < 400) AG.log.push([+SIM.t.toFixed(2), 'l', kind, SKYI.id, +SKYI.k.toFixed(3)]); }
    AG.lk = kind;
    var s = footEl.style;
    s.setProperty('--color-text', WORDSETS[kind].text); s.setProperty('--color-dimmed', WORDSETS[kind].dimmed); s.setProperty('--color-focus', AG_LRING);   // (the links' underline and ring: the light set's, the ring a little lighter for the sea under them)
  }
  /* the measured grounds to the shown colours. (stage2, the owner's word of 2026-11-03: "lets only use white text for
     everything") Every sky's words are light, so the words' ink is always the light set (#fdfcf7; the links' underline
     #c9cdd6, their ring AG_LRING), from the stylesheet's first paint on: no ground rule, no flip, no dark ink. The
     read-back stays for one thing: the credit's light grey, worked out for AG_R on the credit's lightest ground (with
     AG_LSPARE to spare), from the stack's take on; the groups' grounds are kept for the record */
  function agUpdate() {
    if (!AG.on) return;
    var now = SIM.t, still = STILLMODE ? !SW.wlive : reduced(), hs = STILLMODE && !SW.wlive;   // (still: a frame that is all there is, its own colours (the harness's stills, reduced motion's still); hs: the harness's stills, each frame its own at once)
    if (!STILLMODE) { if (!reduced()) AG.fz = clockNow(); else { var z = AG.fz >= 0 ? AG.fz : AG.w0; if (z > -1e8) now += Math.max(0, clockNow() - z) / 1000; } }
    if (AG.reads !== AG.rd && AG.rg === AG.gen) {   // (a new read of this generation: the groups' grounds, for the record)
      AG.rd = AG.reads;
      var st = (AGL[0] || []).concat(AGL[1] || []); st.sort(function (x, y) { return x - y; });
      agGroup(GQ[0], st); agGroup(GQ[1], AGL[2]);
      inkDeciles(GQ[0]); inkWorst(GQ[1], [2], AG.u0, AG.um);
      var pa = AGL[3], pn = pa && AG.pg === AG.gen && AG.rt - AG.pt <= AG_PAGE ? pa.length : 0; AG.pl = AG.ph = -1; GQ[0].ulo = GQ[0].uhi = -1;   // ((line2) the line under the name, its own block, counted as a worst-of)
      if (pn > 0 && GQ[0].n > 0) { AG.pl = pa[Math.min(pn - 1, Math.floor(pn * 0.1))]; AG.ph = pa[Math.min(pn - 1, Math.floor(pn * 0.9))]; GQ[0].ulo = GQ[0].lo; GQ[0].uhi = GQ[0].hi; GQ[0].lo = Math.min(GQ[0].lo, AG.pl); GQ[0].hi = Math.max(GQ[0].hi, AG.ph); }
      if (AG.t0 >= 0 && AG.rt >= AG.t0) inkWin();
    }
    /* the take: once the generation's readings cover its first INK_TAKE s shown (at least INK_TAKEN of them; under
       reduced motion the still's own) and the canvas has been shown INK_TAKE s (the dissolve); the harness's stills at
       once. From it the credit's grey is the world's */
    var due = hs || AG.wn > 0 && (STILLMODE || clockNow() - AG.w0 >= INK_TAKE * 1000) && (still || AG.wn >= INK_TAKEN && AG.rt >= AG.t0 + INK_TAKE);
    var fs = due && GQ[0].n > 0 && GQ[0].took !== AG.gen, fl = due && GQ[1].n > 0 && GQ[1].took !== AG.gen;
    if (fs || fl) { inkMed(); AG.ink = true; } if (fs) AG.ik[0] = true; if (fl) AG.ik[1] = true;
    agStack(INK); agLinks(INK);
    if (fs) { GQ[0].took = AG.gen; AG.tk[0] = now; } if (fl) { GQ[1].took = AG.gen; AG.tk[1] = now; }
    if (!AG.ink) return;   // (before the first take the page keeps its own colours: the stylesheet's grey)
    if (stackEl && AG.ik[0]) {   // the credit's light grey for AG_R over the credit's lightest ground, a fifth to spare (AG_LSPARE): the read-back's eighth steps over a thin lit top under the credit
      var yc = AG.ym[1] >= 0 ? AG.ym[1] : INK_YC, yg = clamp(AG_R * (yc * AG_LSPARE + 0.05) - 0.05, lum(AG_LGREY), 0.96); AG.sdl = agHex(AG_LGREY, yg);
      if (AG.sdl !== AG.sdim) { AG.sdim = AG.sdl; stackEl.style.setProperty('--color-dimmed', AG.sdl); }
    }
  }
  /* the ground's read: the blocks' boxes in TG.gs (grown 4 px), RGBA bytes, bottom-up rows */
  var AGR = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], AGBUF = null, AGY = new Float32Array(16384), AG_GROW = [5, 5, 7, 5];   // ((line2) block 3, the line under the name: grown as the credit's)
  var AGRI = [[], [], [], []], AGU = new Float32Array(16384);   // (ink step, fix round) each block's ink boxes ungrown, in the read-back's cells ([x0, y0, x1, y1] each, bottom-up rows): the grounds under the words themselves   // (the ink's boxes and the ring's few pixels, window px a device px)
  function agRects() {
    var gw = TG.gs.w, gh = TG.gs.h, k = 1 / GS_K, n = 0;
    var B = [[0], [2], [3, 4], [1]];   // ((line2) the line under the name (slot 1) its own block, last: blocks 0-2 as before, at their own offsets in the read)
    for (var b = 0; b < B.length; b++) {
      var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (var j = 0; j < B[b].length; j++) { var i = B[b][j] * 4; if (WORDS[i + 2] - WORDS[i] < 1) continue; x0 = Math.min(x0, WORDS[i]); y0 = Math.min(y0, WORDS[i + 1]); x1 = Math.max(x1, WORDS[i + 2]); y1 = Math.max(y1, WORDS[i + 3]); }
      if (x1 < x0 || b === 3 && !WLINE.length) { AGR[b][2] = 0; continue; }   // ((line2 fix) the line read only where its line boxes are known)
      var RI = AGRI[b]; RI.length = 0;
      if (b === 3) for (j = 0; j < WLINE.length; j += 4) RI.push(Math.round(WLINE[j] * k), Math.round(gh - WLINE[j + 3] * k), Math.round(WLINE[j + 2] * k), Math.round(gh - WLINE[j + 1] * k));   // ((line2 fix) the line's ink boxes: its own line boxes, the cells whose centres lie in them (not every cell they touch), so its tenths are the ground under its letters)
      else for (j = 0; j < B[b].length; j++) { i = B[b][j] * 4; if (WORDS[i + 2] - WORDS[i] < 1) continue; RI.push(Math.floor(WORDS[i] * k), Math.floor(gh - WORDS[i + 3] * k), Math.ceil(WORDS[i + 2] * k), Math.ceil(gh - WORDS[i + 1] * k)); }
      var gr = AG_GROW[b] * (OUT.dpr || 1);
      var rx0 = clamp(Math.floor((x0 - gr) * k), 0, gw - 1), rx1 = clamp(Math.ceil((x1 + gr) * k), rx0 + 1, gw), ry0 = clamp(Math.floor(gh - (y1 + gr) * k), 0, gh - 1), ry1 = clamp(Math.ceil(gh - (y0 - gr) * k), ry0 + 1, gh);
      AGR[b][0] = rx0; AGR[b][1] = ry0; AGR[b][2] = rx1 - rx0; AGR[b][3] = ry1 - ry0; n++;
    }
    return n;
  }
  function agLand(b, px, off, w, h, R0, RI) {   // a block's bytes: its luminances, sorted (AGL), its robust darkest, lightest, darkest; and those of the cells under its ink boxes (ungrown: u0, ud, u97, um)
    var n = w * h, m = 0, r = RI || [], x0 = R0 ? R0[0] : 0, y0 = R0 ? R0[1] : 0;
    if (AGY.length < n) { AGY = new Float32Array(n); AGU = new Float32Array(n); }   // ((line2) never a block cut short: reduced motion's read made at once can pass 16,384 cells at a large text size; the ring's slot bounds its own)
    for (var i = 0; i < n; i++) {
      var q = off + i * 4; AGY[i] = 0.2126 * s2l(px[q] / 255) + 0.7152 * s2l(px[q + 1] / 255) + 0.0722 * s2l(px[q + 2] / 255);
      var cx = x0 + i % w, cy = y0 + (i / w | 0);
      for (var j = 0; j < r.length; j += 4) if (cx >= r[j] && cx < r[j + 2] && cy >= r[j + 1] && cy < r[j + 3]) { AGU[m++] = AGY[i]; break; }
    }
    var a = Array.prototype.slice.call(AGY.subarray(0, n)).sort(function (x, y) { return x - y; });
    AGL[b] = a; AG.yd[b] = a[Math.min(n - 1, Math.floor(n * 0.03))]; AG.ym[b] = a[n - 1]; AG.y0[b] = a[0];
    if (m > 0) { var u = Array.prototype.slice.call(AGU.subarray(0, m)).sort(function (x, y) { return x - y; }); AG.u0[b] = u[0]; AG.ud[b] = u[Math.min(m - 1, Math.floor(m * 0.03))]; AG.u97[b] = u[Math.min(m - 1, Math.floor(m * 0.97))]; AG.um[b] = u[m - 1]; }
    else { AG.u0[b] = AG.y0[b]; AG.ud[b] = AG.yd[b]; AG.u97[b] = a[Math.min(n - 1, Math.floor(n * 0.97))]; AG.um[b] = AG.ym[b]; }
    AG.un[b] = m; AG.reads++;
    if (b === 3) { AGL[3] = m > 0 ? u : null; AG.pg = AG.rg; AG.pt = AG.rt; }   // ((line2) the line's reading: its generation and frame time)   // ((line2 fix) the line's sorted luminances: the cells under its own line boxes alone)
  }
  function wordsGroundDeliver(e) { if (e.g !== AG.gen) return; AG.rg = e.g; AG.rt = e.t; for (var b = 0; b < e.r.length; b++) if (e.r[b][2] > 0) agLand(b, RB.buf, e.off + e.o[b], e.r[b][2], e.r[b][3], e.r[b], e.ri[b]); }
  /* (line2 fix) in flight the line's block goes with the words' read once in AG_PSTEP s of frames at most, and where it
     crowds no other read: as the last read its slot takes (the jobs before the draws, and the slot fenced after this
     frame's flush with a fence free, or at the next frame's start by fenceDue's rhythm a frame on, a fence free then:
     fewer than RB_FENCES now, or this frame's poll found the GPU caught up, so the next pops one). In a new generation
     at once (the take's readings count the line); with the jobs after the draws (no read is a slot's last) only as the
     line's reading nears AG_PAGE / 2. Otherwise the read is the old one; a line not read for AG_PAGE s is not counted */
  function agLineDue() {
    if (AG.qg === AG.gen && SIM.t - AG.pq >= 0 && SIM.t - AG.pq < AG_PSTEP) return false;
    if (AG.pg !== AG.gen) return true;
    if (SW.order !== 0) return !(SIM.t - AG.pt >= 0 && SIM.t - AG.pt < AG_PAGE / 2);
    var f = SW.fence, n = FRAMEN + 1, free = RB.fences.length < RB_FENCES;
    return f === 3 ? free : (free || !RB.lagged) && (f === 1 || (f === 2 ? n % 2 === 0 : n % 8 === 0));
  }
  /* after the ground pass (TG.gs bound): read now (the harness) or through the ring (in flight) */
  function wordsGroundRead() {
    if (!agRects()) return;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, TG.gs.f);
    var b, bytes = 0, nb = AGR.length, o = [];
    for (b = 0; b < nb; b++) { o[b] = bytes; bytes += AGR[b][2] * AGR[b][3] * 4; }
    if (STILLMODE ? !SW.wlive || SW.wsync : reduced()) {   // (dev wsync: read at once, the inks' live rule kept; (ink load fix) reduced motion's still, drawn once: its ground read at once)
      AG.rg = AG.gen; AG.rt = SIM.t;   // (ink fix: the frame's time, for the take)
      if (!AGBUF || AGBUF.length < bytes) AGBUF = new Uint8Array(bytes);
      for (b = 0; b < nb; b++) if (AGR[b][2] > 0) { var v = new Uint8Array(AGBUF.buffer, o[b], AGR[b][2] * AGR[b][3] * 4); gl.readPixels(AGR[b][0], AGR[b][1], AGR[b][2], AGR[b][3], gl.RGBA, gl.UNSIGNED_BYTE, v); agLand(b, AGBUF, o[b], AGR[b][2], AGR[b][3], AGR[b], AGRI[b]); }
    } else {
      /* (line2) never refused unseen: a read that has no room in the slot is made without its last block (the line's: the
         read is then the old one, blocks 0-2 at their own offsets, and fits wherever the old one did), counted (AG.trim);
         one refused even so is counted (AG.miss) */
      var sk = RB.skipped, pb = nb > 3 ? AGR[3][2] * AGR[3][3] * 4 : 0, S;
      if (pb > 0 && !agLineDue()) { bytes -= pb; nb = 3; pb = 0; }   // ((line2 fix) the line's block yields to the ring's other reads (agLineDue); the reads between are the old ones, the line's last reading counted AG_PAGE s)
      S = rbSlot(bytes);
      if (!S && pb > 0 && RB.skipped === sk) { S = rbSlot(bytes - pb); if (S) { bytes -= pb; nb = 3; AG.trim++; } }
      if (!S) AG.miss++;
      if (S && nb > 3 && pb > 0) { AG.pq = SIM.t; AG.qg = AG.gen; }
      if (S) {
        var ent = { k: 'words', g: AG.gen, t: SIM.t, r: AGR.slice(0, nb).map(function (r) { return r.slice(); }), ri: AGRI.slice(0, nb).map(function (r) { return r.slice(); }), o: o.slice(0, nb), off: 0, bytes: 0 }, start = S.used;
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, S.pbo);
        for (b = 0; b < nb; b++) if (AGR[b][2] > 0) gl.readPixels(AGR[b][0], AGR[b][1], AGR[b][2], AGR[b][3], gl.RGBA, gl.UNSIGNED_BYTE, start + o[b]);
        gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
        ent.off = start; ent.bytes = bytes; S.used += bytes; S.ents.push(ent);
        if (REC) REC.fr.rbBytes += bytes;
      }
    }
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
  }
  /* (birds3d) the ground under the paper birds, for their hold (a bird never melts into its ground: HOST.groundAt): the
     same composite at an eighth the words read (TG.gs), the cells under each bird the module asks for (HOST.groundWant:
     its boxes, CSS px), at most every BGR_DT s and only while a bird is drawn. Its bytes ride the slot the words' read is
     filling this frame and only that: it never takes a slot of its own, so the words' reads land exactly as without it
     (A13). The harness's synchronous frames read the whole of TG.gs at once. OKLab L a cell, kept with its time */
  var BGR = { n: 0, rects: new Float32Array(4 * 16), L: null, T: null, w: 0, h: 0, last: -1e9, reads: 0, skipped: 0 }, BGR_DT = 0.25, BGR_MAX = 16, BGR_CELLS = 64;
  function bgrSize() { var w = TG.gs.w, h = TG.gs.h; if (BGR.w !== w || BGR.h !== h || !BGR.L) { BGR.w = w; BGR.h = h; BGR.L = new Float32Array(w * h).fill(-1); BGR.T = new Float64Array(w * h).fill(-1e9);   /* (fix round: the read's time kept whole: as a float32 a stepped clock's 24.4999999 rounded up to 24.5, every read after about 24 s looked as if from the future and was refused, and the birds' hold let go) */ } }
  function bgrL(px, q) { var r = s2l(px[q] / 255), g = s2l(px[q + 1] / 255), b = s2l(px[q + 2] / 255); return Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b) * 0.2104542553 + Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b) * 0.7936177850 - Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b) * 0.0040720468; }
  function bgrLand(px, off, x0, y0, w, h, t) { for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) { var c = (y0 + j) * BGR.w + x0 + i, q = off + (j * w + i) * 4; BGR.L[c] = bgrL(px, q); BGR.T[c] = t; } }
  function birdsGroundDeliver(e) { if (BGR.w !== e.gw || BGR.h !== e.gh) return; for (var i = 0; i < e.r.length; i += 5) bgrLand(RB.buf, e.off + e.r[i + 4], e.r[i], e.r[i + 1], e.r[i + 2], e.r[i + 3], e.t); }
  var BGRBUF = null;
  function birdsGroundRead() {
    if (!BGR.n || SIM.t - BGR.last < BGR_DT && SIM.t >= BGR.last) return;
    bgrSize();
    var gw = TG.gs.w, gh = TG.gs.h, k = (OUT.w / Math.max(OUT.cssW || OUT.w, 1)) / GS_K, i;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, TG.gs.f);
    if (STILLMODE ? !SW.wlive || SW.wsync : reduced()) {   // (with the words' read made at once: the whole ground, at once)
      if (!BGRBUF || BGRBUF.length < gw * gh * 4) BGRBUF = new Uint8Array(gw * gh * 4);
      gl.readPixels(0, 0, gw, gh, gl.RGBA, gl.UNSIGNED_BYTE, BGRBUF);
      bgrLand(BGRBUF, 0, 0, 0, gw, gh, SIM.t); BGR.reads++;
    } else {
      var S = null; for (i = 0; i < RB.slots.length; i++) if (RB.slots[i].st === 1) { S = RB.slots[i]; break; }   // (only the slot the words are filling now)
      var rr = [], bytes = 0;
      for (i = 0; i < BGR.n; i++) {
        var x0 = clamp(Math.floor(BGR.rects[4 * i] * k) - 1, 0, gw - 1), x1 = clamp(Math.ceil(BGR.rects[4 * i + 2] * k) + 1, x0 + 1, gw);
        var y0 = clamp(Math.floor(gh - BGR.rects[4 * i + 3] * k) - 1, 0, gh - 1), y1 = clamp(Math.ceil(gh - BGR.rects[4 * i + 1] * k) + 1, y0 + 1, gh);
        var w = Math.min(x1 - x0, 8), h = Math.min(y1 - y0, 8); if (w * h > BGR_CELLS) h = Math.max(1, Math.floor(BGR_CELLS / w));
        rr.push(x0, y0, w, h, bytes); bytes += w * h * 4;
      }
      if (!S || S.used + bytes > RB_SLOT) { BGR.skipped++; gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null); return; }
      var ent = { k: 'birds', t: SIM.t, gw: gw, gh: gh, r: rr, off: S.used, bytes: bytes };
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, S.pbo);
      for (i = 0; i < rr.length; i += 5) gl.readPixels(rr[i], rr[i + 1], rr[i + 2], rr[i + 3], gl.RGBA, gl.UNSIGNED_BYTE, S.used + rr[i + 4]);
      gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
      S.used += bytes; S.ents.push(ent); BGR.reads++;
      if (REC) REC.fr.rbBytes += bytes;
    }
    BGR.last = SIM.t;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
  }
  function setWords(kind) {
    if (WORDCOL === kind) return;
    if (REC && WORDCOL !== null) { REC.flips.push([+SIM.t.toFixed(2), WORDCOL + '>' + kind, 'root', SKYI.id]); if (REC.firstFlip === null && REC.dissolveEnd > 0) REC.firstFlip = +((clockNow() - REC.dissolveEnd) / 1000).toFixed(2); }
    WORDCOL = kind;
    var W = WORDSETS[kind], s = root.style;
    s.setProperty('--color-text', W.text); s.setProperty('--color-selection', W.selection);
    if (!(SW.words && AG.on)) { s.setProperty('--color-dimmed', W.dimmed); s.setProperty('--color-focus', W.focus); }   // (with the words' machinery on, the credit's grey is agUpdate's (on .stack) and the links' underline and ring agLinks' (on the footer); the root keeps the stylesheet's)
  }
  function clearWords() { WORDCOL = null; ['--color-text', '--color-dimmed', '--color-focus', '--color-selection'].forEach(function (p) { root.style.removeProperty(p); }); if (stackEl) { stackEl.style.removeProperty('--color-text'); stackEl.style.removeProperty('--color-dimmed'); } if (footEl) ['--color-text', '--color-dimmed', '--color-focus'].forEach(function (p) { footEl.style.removeProperty(p); }); AG.sk = null; AG.lk = null; AG.sdim = ''; AG.ink = false; AG.ik[0] = AG.ik[1] = false; inkRestart(); }   // (ink load fix: the stylesheet's colours again; the next reading sets the inks at once)

