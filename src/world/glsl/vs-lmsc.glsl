/* the landmarks' and the scatter's program in one, where both shade alike: their fragment shader is the same text,
   and ANGLE-D3D11 compiles a program's fragment shader with FXC once a program (two programs: the same DXBC twice,
   ~0.35 s of FXC on a desktop). The scatter's main is scMain; a cell's own mesh, as in VS_LANDMARK, the rest. uScat 0
   (as linked): the landmarks */
uniform int uScat;
void main() {
  if (uScat == 1) { scMain(); return; }
  vW = aP; vN = aN; vC = vec4(aC.rgb * 2.0, floor(aC.a * 255.0 + 0.5)); vY = aY; vE = vec2(aE * 15.9375, 0.0); vMT = mistTopAt(vW.xz);
  gl_Position = uVP * vec4(vW - uCam, 1.0);
}
