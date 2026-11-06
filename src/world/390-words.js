  /* ---------------------------------------------------------------- the words */
  var WORDS = new Float32Array(20), WORDCOL = null;
  var wordEls = { name: document.querySelector('h1'), bio: document.querySelector('.words'),   /* (line2) the old bio's slot: the page's line under the name */ credit: document.querySelector('.credit'), links: document.querySelectorAll('footer a') };
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
  }
  /* (world6w, the owner's word of 2026-10-21: "remove that white background behind the text. it's fine failing
     accesibility"; stage2, the owner's word of 2026-11-03: "lets only use white text for everything so never use any
     scenes that dont pass white text") the words' colours: constants, the same in the stylesheet and here, for every
     sky and every moment, chosen against the light ceiling itself (W8: no pixel the world draws stands above OKLab L
     0.53 outside the moon's footprint, which keeps off the words, and the ink birds, which fly behind them freely: the
     owner, 2026-11-05): the text #fdfcf7 reads 5.13:1 on L 0.53, the dimmed grey #ebeffa (the credit; the links'
     underline) 4.59:1, the ring #f4e2b0 4.1:1. Nothing is read from the world for the words and nothing is done to
     the world for them: the root takes the set (setWords) as the stylesheet has it. (fast500's deep sweep, 2026-11-05: the read-back that
     once worked a grey out from the composite is gone; it had been off since stage2) */
  var WORDSETS = { light: { text: '#fdfcf7', dimmed: '#ebeffa', focus: '#f4e2b0', selection: '#3b3f55' } }, INK = 'light';
  function agL2s(c) { return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; }
  function setWords(kind) {
    if (WORDCOL === kind) return;
    if (REC && WORDCOL !== null) { REC.flips.push([+SIM.t.toFixed(2), WORDCOL + '>' + kind, 'root', SKYI.id]); if (REC.firstFlip === null && REC.dissolveEnd > 0) REC.firstFlip = +((clockNow() - REC.dissolveEnd) / 1000).toFixed(2); }
    WORDCOL = kind;
    var W = WORDSETS[kind], s = root.style;
    s.setProperty('--color-text', W.text); s.setProperty('--color-selection', W.selection);
    s.setProperty('--color-dimmed', W.dimmed); s.setProperty('--color-focus', W.focus);
  }
  function clearWords() { WORDCOL = null; ['--color-text', '--color-dimmed', '--color-focus', '--color-selection'].forEach(function (p) { root.style.removeProperty(p); }); }   // (the stylesheet's colours again)

