  /* ---------------------------------------------------------------- render targets (made at full size, used in part) */
  function tex2d(w, h, ifmt, fmt, type, filter, data) {
    var t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, type, data || null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  var FBOK = {};   // (E1.1: the kinds of target whose completeness was asked)
  function target(w, h, kind, depthTex) {
    var T = { w: w, h: h, f: gl.createFramebuffer() };
    if (kind === 'hdr') T.t = tex2d(w, h, FLOAT_RT ? gl.RGBA16F : gl.RGBA8, gl.RGBA, HALF, gl.LINEAR);
    else if (kind === 'r16') T.t = tex2d(w, h, FLOAT_RT ? gl.R16F : gl.RGBA8, FLOAT_RT ? gl.RED : gl.RGBA, HALF, gl.NEAREST);
    else T.t = tex2d(w, h, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, gl.LINEAR);
    gl.bindFramebuffer(gl.FRAMEBUFFER, T.f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, T.t, 0);
    if (depthTex) {
      T.d = tex2d(w, h, gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, gl.NEAREST);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, T.d, 0);
    }
    // (E1.1, item 5; S3) asked once a kind of target, the first time it is made (at the boot, or a restore's): never again
    // on a resize, a rotation or a change of scale, where it was a synchronous call in a frame's work
    var ck = kind + (depthTex ? '+d' : '');
    if (!FBOK[ck]) { if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE && !gl.isContextLost()) fail('framebuffer ' + kind + ' incomplete'); else FBOK[ck] = 1; }
    return T;
  }
  function freeTarget(T) { if (!T) return; gl.deleteFramebuffer(T.f); gl.deleteTexture(T.t); if (T.d) gl.deleteTexture(T.d); }

