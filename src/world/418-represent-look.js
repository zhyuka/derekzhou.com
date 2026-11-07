  /* the last frame put up again as it was, for reduced motion's still in its first tenth of a second (the canvas must
     be drawn every frame of it: WebKit, its buffer not preserved, puts up a cleared one): nothing
     else has drawn since, so the composite's inputs and its program's uniforms are as the frame left them, and the
     window is composited again (or its copy put up again) with the birds' ink over it: a pass or two a frame, not the
     whole scene (on a CPU renderer the whole scene again each frame holds the page's frames back for seconds). False
     when the targets changed since: drawn whole instead */
  var REPTG = null;
  function represent() {
    if (LOST || DEAD || gl.isContextLost() || !TG || REPTG !== TG || !LASTE) return false;
    var P;
    gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.depthMask(false);
    if (DIRECT) {
      useTarget(null, OUT.w, OUT.h); P = EP.comp; gl.useProgram(P.p);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, TG.scene.d);
      gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, TG.scene.t);
      gl.activeTexture(gl.TEXTURE4); gl.bindTexture(gl.TEXTURE_2D, CLT.t);
      gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, TG.bu[0].t);
      gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D, TG.sb.t);
      gl.activeTexture(gl.TEXTURE9); gl.bindTexture(gl.TEXTURE_2D, TG.lind.t);
    } else {
      useTarget(null, FULL.w, FULL.h); P = EP.blit; gl.useProgram(P.p);
      gl.activeTexture(gl.TEXTURE7); gl.bindTexture(gl.TEXTURE_2D, TG.win.t);
    }
    gl.activeTexture(gl.TEXTURE0);
    gl.bindVertexArray(FULLVAO); dc(gl.TRIANGLES, 3);
    gl.bindVertexArray(null); gl.depthMask(true);
    if (BIRDS && SW.birds && !SW.noanim) { BIRDS.draw(); gl.bindVertexArray(null); }
    return true;
  }
  var NOOCC = false;
  /* (dev) the look aside: the drawn camera turned about the vertical by a (rad), the flight left as it is */
  var FRZT = null;
  function devLook(c, a) {
    var ca = Math.cos(a), sa = Math.sin(a);
    function r(v) { var x = v[0] * ca + v[2] * sa, z = -v[0] * sa + v[2] * ca; v[0] = x; v[2] = z; }
    r(c.f); r(c.r); r(c.u);
  }

