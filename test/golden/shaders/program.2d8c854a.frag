#version 300 es
#define HPSPLIT
#define NO_TWILIGHT
#define NO_RAIN
#define NO_WATER
#define NO_PKWX
precision highp float;
precision highp int;
precision highp sampler3D;
precision highp sampler2D;

uniform vec3 uCam;uniform vec3 uCamR,uCamU,uCamF;uniform vec4 uProj;uniform mat4 uVP;
uniform vec2 uRes;uniform float uT;uniform int uDbg;
uniform vec3 uSun;uniform vec3 uSunC;
uniform vec4 uTwM;
uniform vec3 uSkyS;
uniform vec3 uSky[6];uniform vec4 uSkyE;uniform vec3 uSkyW;uniform vec4 uSkyK;
uniform vec4 uGlow;uniform vec3 uGlowC;uniform vec4 uFog;uniform vec4 uFog2;uniform vec4 uFogB;
uniform vec4 uSkyN;
uniform vec3 uGlowN,uSkyWT,uSkyWN,uHzT,uHzN;uniform vec4 uSkyKT,uSkyKN,uSunK;
uniform vec4 uHaze;uniform vec3 uHazeC,uHazeW;
uniform vec3 uAmbU,uAmbD;
uniform vec3 uClLit,uClShade,uClDeep,uClRim;uniform vec4 uClK,uClK2;
uniform vec4 uP[24];
uniform uint uSalt;
uniform sampler3D uN3;
uniform highp sampler2D uGround;uniform vec4 uGC;
uniform float uSunVis;
uniform vec4 uWet;

const float PI=3.14159265;
float gLodD=0.0;
float gEmit=0.0,gPhase=0.0,gWater=0.0;
const vec3 LUMA=vec3(0.2126,0.7152,0.0722);
uint ih(uint x){x^=x>>16;x*=0x7feb352dU;x^=x>>15;x*=0x846ca68bU;x^=x>>16;return x;}
uint ih2(ivec2 p){return ih(uint(p.x)*0x8da6b343U^ih(uint(p.y)+0x68e31da4U));}
uint cellHash(ivec2 c){return ih(ih2(c)^uSalt);}
float hf(uint h){return float(h>>8)*(1.0/16777216.0);}
float h12(vec2 p){return hf(ih2(ivec2(floor(p))));}
vec2 g2(ivec2 p){uint h=ih2(p);return vec2(float(h&0xffffU),float(h>>16))*(2.0/65535.0)-1.0;}
vec3 gnd(vec2 p){
vec2 i=floor(p),f=p-i;ivec2 ii=ivec2(i);
vec2 u=f*f*f*(f*(f*6.0-15.0)+10.0),du=30.0*f*f*(f*(f-2.0)+1.0);
vec2 ga=g2(ii),gb=g2(ii+ivec2(1,0)),gc=g2(ii+ivec2(0,1)),gd=g2(ii+ivec2(1,1));
float va=dot(ga,f),vb=dot(gb,f-vec2(1.0,0.0)),vc=dot(gc,f-vec2(0.0,1.0)),vd=dot(gd,f-vec2(1.0,1.0));
float k=va-vb-vc+vd;
return vec3(va+u.x*(vb-va)+u.y*(vc-va)+u.x*u.y*k,
ga+u.x*(gb-ga)+u.y*(gc-ga)+u.x*u.y*(ga-gb-gc+gd)+du*(u.yx*k+vec2(vb-va,vc-va)));
}
float gn(vec2 p){
vec2 i=floor(p),f=p-i;ivec2 ii=ivec2(i);
vec2 u=f*f*f*(f*(f*6.0-15.0)+10.0);
float va=dot(g2(ii),f),vb=dot(g2(ii+ivec2(1,0)),f-vec2(1.0,0.0)),vc=dot(g2(ii+ivec2(0,1)),f-vec2(0.0,1.0)),vd=dot(g2(ii+ivec2(1,1)),f-vec2(1.0,1.0));
return mix(mix(va,vb,u.x),mix(vc,vd,u.x),u.y);
}
float fbm(vec2 p,int o){float s=0.0,a=0.5;for(int i=0;i<8;i++){if(i>=o)break;s+=a*gn(p);p=mat2(1.6,1.2,-1.2,1.6)*p;a*=0.5;}return s;}
vec3 dN(vec2 p,mat2 M){vec3 n=gnd(M*p);return vec3(n.x,transpose(M)*n.yz);}
vec3 dAbs(vec3 a,float e){float s=sqrt(a.x*a.x+e*e);return vec3(s,a.yz*(a.x/s));}
vec3 dMul(vec3 a,vec3 b){return vec3(a.x*b.x,a.x*b.yz+b.x*a.yz);}
vec3 dSmax(vec3 a,vec3 b,float k){float h=clamp(0.5+0.5*(a.x-b.x)/k,0.0,1.0);return vec3(mix(b.x,a.x,h)+k*h*(1.0-h),mix(b.yz,a.yz,h));}
vec3 dSmin(vec3 a,vec3 b,float k){float h=clamp(0.5+0.5*(b.x-a.x)/k,0.0,1.0);return vec3(mix(b.x,a.x,h)-k*h*(1.0-h),mix(b.yz,a.yz,h));}
vec3 dSstep(float e0,float e1,vec3 a){float x=clamp((a.x-e0)/(e1-e0),0.0,1.0);return vec3(x*x*(3.0-2.0*x),a.yz*(6.0*x*(1.0-x)/(e1-e0)));}
vec3 dPow2(vec3 a){return vec3(a.x*a.x,2.0*a.x*a.yz);}
float sstepDown(float e0,float e1,float x){return 1.0-smoothstep(e1,e0,x);}
float n3(vec3 p){return texture(uN3,p).r;}
vec4 n3v(vec3 p){return texture(uN3,p);}

vec3 skyGrad(float e){
if(e<0.0)return mix(uSky[1],uSky[0],smoothstep(0.0,14.0,-e));
vec3 c=mix(uSky[1],uSky[2],smoothstep(0.0,uSkyE.x,e));
c=mix(c,uSky[3],smoothstep(uSkyE.x,uSkyE.y,e));
c=mix(c,uSky[4],smoothstep(uSkyE.y,uSkyE.z,e));
return mix(c,uSky[5],smoothstep(uSkyE.z,uSkyE.w,e));
}
float sunSide(vec3 rd){vec2 h=normalize(rd.xz+vec2(1e-6,0.0)),s=normalize(uSkyS.xz+vec2(1e-6,0.0));return 0.5+0.5*dot(h,s);}
vec3 skyWarmN(vec3 c,float e,float side){
float lt=exp(-max(e+uSunK.x,0.0)/uSkyKT.y)*uSunK.y,ln=exp(-max(e,0.0)/uSkyKN.y)*uSunK.z;
c=mix(c,uSkyWT,uSkyKT.x*side*side*lt);
c*=1.0-uSkyKT.z*(1.0-side)*lt;
c=mix(c,uSkyWN,uSkyKN.x*side*side*ln);
return c*(1.0-uSkyKN.z*(1.0-side)*ln);
}
vec3 skyCol0(vec3 rd){
float e=degrees(asin(clamp(rd.y,-1.0,1.0)));
vec3 c=skyGrad(e);
float side=sunSide(rd),low=exp(-max(e,0.0)/uSkyK.y);
c=mix(c,uSkyW,uSkyK.x*side*side*low);
c*=1.0-uSkyK.z*(1.0-side)*low;
float cs=max(dot(rd,uSkyS),0.0);
c+=uGlowC*(uGlow.x*pow(cs,uGlow.y)+uGlow.z*pow(cs,uGlow.w));
return c;
}
vec3 skyCol(vec3 rd){
vec3 c=skyCol0(rd);
if(uSkyN.w>0.0){
float e=degrees(asin(clamp(rd.y,-1.0,1.0))),cn=max(dot(rd,uSkyN.xyz),0.0);vec3 g=skyGrad(e);
c+=skyWarmN(g,e,sunSide(rd))-g+uGlowN*(uGlow.x*pow(cn,uGlow.y)+uGlow.z*pow(cn,uGlow.w));
}
return c;
}
vec3 fogCol(vec3 rd){return skyCol(normalize(vec3(rd.x,max(rd.y,0.0)*uFog2.x+uFog2.y,rd.z)));}
float fogAmt(vec3 rd,float t){
float b=uFog.y,k=b*rd.y*t;
float f=abs(k)<1e-4?1.0-0.5*k:(1.0-exp(-k))/k;
float od=uFog.x*exp(-b*(uCam.y-uFog.z))*t*f+uFog.w*t;
return 1.0-exp(-od);
}
float hazeAmt(vec3 rd,float t){
if(uHaze.x<=0.0)return 0.0;
float H=uHaze.y,a0=uHaze.x*exp(-uHaze.z/H);
if(rd.y>=0.0){float k=rd.y*t/H,f=k<1e-4?1.0-0.5*k:(1.0-exp(-k))/k;return 1.0-exp(-a0*t*f);}
float s1=uHaze.z/-rd.y,tt=min(t,s1),k=-rd.y*tt/H,f=k<1e-4?1.0+0.5*k:(exp(k)-1.0)/k;
return 1.0-exp(-(a0*tt*f+uHaze.x*0.22*max(t-s1,0.0)));
}
float hazeSky(vec3 rd){if(uHaze.x<=0.0)return 0.0;return 1.0-exp(-uHaze.x*exp(-uHaze.z/uHaze.y)*uHaze.y/max(rd.y,2e-3));}
vec3 hazeCol0(vec3 rd){float cs=max(dot(normalize(vec3(rd.x,0.0,rd.z)+1e-6),normalize(vec3(uSkyS.x,0.0,uSkyS.z)+1e-6)),0.0);return mix(uHazeC,uHazeW,cs*cs*cs);}
vec3 hazeCol(vec3 rd){
if(uSkyN.w<=0.0)return hazeCol0(rd);
float cs=max(dot(normalize(vec3(rd.x,0.0,rd.z)+1e-6),normalize(vec3(uSkyS.x,0.0,uSkyS.z)+1e-6)),0.0),e=degrees(asin(clamp(rd.y,-1.0,1.0)));
float st=exp(-(max(e+uSunK.x,0.0)-max(e,0.0))/uSkyKT.y)*uSunK.y;
return uHazeC+cs*cs*cs*(uHzT*st+uHzN*uSunK.z);
}
vec3 atmos(vec3 c,vec3 rd,float t){
float f=fogAmt(rd,t);
vec3 fc=mix(mix(fogCol(rd),uFogB.rgb,uFogB.a),fogCol(rd),smoothstep(0.25,0.95,f));
c=mix(c,fc,f);
c=mix(c,hazeCol(rd),hazeAmt(rd,t));
#ifndef NO_TWILIGHT
if(uTwM.x>0.0)c=mix(c,fogCol(rd),uTwM.x*(1.0-smoothstep(uTwM.y,uTwM.y+uTwM.z,abs(rd.y))));
#endif
return c;
}
vec3 ambient(vec3 n){return mix(uAmbD,uAmbU,0.5+0.5*n.y);}
vec2 rainRings(vec2 p,float t){
vec2 g=vec2(0.0);
for(int k=0;k<2;k++){
vec2 q=p/0.7+float(k)*vec2(0.37,0.61),c=floor(q),f=q-c;
uint h=ih2(ivec2(c)+ivec2(k*101,k*37));
vec2 d=f-(vec2(hf(h),hf(ih(h+1u)))*0.6+0.2);
float ph=fract(t*(0.9+0.3*hf(ih(h+2u)))+hf(ih(h+3u))),r=length(d),x=(r-ph*0.45)*28.0;
g+=(r>1e-4?d/r:vec2(0.0))*x*exp(-x*x)*(1.0-ph)*(1.0-ph);
}
return g;
}
vec3 waterNormal(vec3 p,float fp){
vec2 w=uWet.zw;float t=uT;
vec3 a=gnd(p.xz*0.35+w*t*0.35),b=gnd(mat2(0.8,0.6,-0.6,0.8)*p.xz*0.9-w*t*0.5);
vec2 g=(a.yz*0.21+b.yz*0.27)*uWet.y*(1.0-smoothstep(0.05,0.6,fp));
#ifndef NO_RAIN
if(uWet.x>0.0)g+=rainRings(p.xz,t)*0.25*uWet.x*(1.0-smoothstep(0.02,0.12,fp));
#endif
return normalize(vec3(-g.x,1.0,-g.y));
}
vec3 waterRefl(vec3 rd,vec3 n){
vec3 r=reflect(rd,n);r.y=abs(r.y)+1e-3;
return skyCol(r)+uSunC*uSunVis*6.0*pow(max(dot(r,uSun),0.0),300.0);
}
vec3 waterShade(vec3 p,vec3 rd,float t,float fp,vec3 body){
vec3 n=waterNormal(p,fp);
float cv=clamp(dot(n,-rd),0.0,1.0),F=0.02+0.98*pow(1.0-cv,5.0);
gWater=F;
return mix(body,waterRefl(rd,n),F);
}
float hgN(float c,float g){float g2=g*g;return(1.0-g2)/pow(max(1.0+g2-2.0*g*c,1e-4),1.5);}
vec3 cloudLight2(vec3 n,vec3 na,vec3 rd,float tauL,float ao,float hgt,float thin){
float ndl=dot(n,uSun),cs=dot(rd,uSun);
float ms=0.0,aw=1.0,bw=1.0,gw=uClK.z;
for(int o=0;o<3;o++){ms+=aw*exp(-tauL*bw)*mix(hgN(cs,gw),hgN(cs,-0.25*gw),0.3);aw*=0.5;bw*=0.5;gw*=0.6;}
float wrap=clamp((ndl+uClK2.w)/(1.0+uClK2.w),0.0,1.0);
float lit=wrap*(0.55+0.45*min(ms,2.4))*exp(-tauL*uClK.y);
float sky=clamp(ao*(0.45+0.55*(0.5+0.5*na.y))*mix(uClK2.z,1.0,hgt),0.0,1.0);
vec3 sh=mix(uClDeep,uClShade,sky);
vec3 c=mix(sh,uClLit,clamp(lit,0.0,1.0))*mix(1.0,ao,uClK2.x);
c+=uClRim*hgN(cs,0.86)*thin*exp(-tauL*0.6)*uClK.w;
return c;
}
vec3 cloudLight(vec3 n,vec3 rd,float tauL,float ao,float hgt,float thin){return cloudLight2(n,n,rd,tauL,ao,hgt,thin);}

uniform int uZ;   // (fast500 D) never set: GL makes it 0 at link. Added to a loop's bound, FXC (ANGLE's D3D11 compiler) cannot count the loop, so it keeps it rolled: one copy of its body
vec3 dNg(vec3 n, mat2 M) { return vec3(n.x, transpose(M) * n.yz); }   // (fast500 D) dN's gradient turn alone: dN(p, M) = dNg(gnd(M * p), M), the same operations
uniform highp sampler2D uKW; uniform vec4 uKWc, uKFc;   // the weights' grids: KW (its window's centre x, z; texel m; texels across) and the far field KF (the same; in the rows under KW's)
vec3 gKD = vec3(1.0, 0.0, 0.0);   // the sand weight (value, d/dx, d/dz) while the dunes kit's land is raised (set by Hd)
#define HAS_GTX
float gTX = 1e4; vec3 gLV = vec3(0.0), gWC = vec3(0.0);   // (world6 fix) the land's height over the cloud sea's top (from its vertices), and Hd's last level and cloud weight
vec4 kwT(ivec2 i) { uint m = uint(uKWc.w) - 1u; return texelFetch(uKW, ivec2(uvec2(i) & uvec2(m)), 0); }
vec4 kfT(ivec2 i) { uint m = uint(uKFc.w) - 1u, W = uint(uKWc.w); uvec2 u = uvec2(i) & uvec2(m); uint L = u.y * uint(uKFc.w) + u.x; return texelFetch(uKW, ivec2(int(L % W), int(W + L / W)), 0); }
void bsW(float f, out vec4 w, out vec4 d) {
  float f2 = f * f, f3 = f2 * f;
  w = vec4(1.0 - 3.0 * f + 3.0 * f2 - f3, 4.0 - 6.0 * f2 + 3.0 * f3, 1.0 + 3.0 * f + 3.0 * f2 - 3.0 * f3, f3) / 6.0;
  d = vec4(-3.0 + 6.0 * f - 3.0 * f2, -12.0 * f + 9.0 * f2, 3.0 + 6.0 * f - 9.0 * f2, 3.0 * f2) / 6.0;
}
/* a grid's four channels at p (cubic B-spline: C2), with their gradients (per m) */
void bsGrid(bool isF, vec2 p, out vec4 v, out vec4 gx, out vec4 gz) {
  vec4 c = isF ? uKFc : uKWc; float hw = (isF ? 25.0 : 116.0) * c.z;
  vec2 q = clamp(p, c.xy - hw, c.xy + hw), t = q / c.z - 0.5, f = fract(t); ivec2 i0 = ivec2(floor(t)) - 1;
  vec4 wx, dx, wz, dz; bsW(f.x, wx, dx); bsW(f.y, wz, dz);
  v = vec4(0.0); gx = vec4(0.0); gz = vec4(0.0);
  for (int b = 0; b < 4; b++) {
    for (int a = 0; a < 4; a++) {
      vec4 s = isF ? kfT(i0 + ivec2(a, b)) : kwT(i0 + ivec2(a, b));
      v += wx.x * wz.x * s; gx += dx.x * wz.x * s; gz += wx.x * dz.x * s;   // (fast500 D) wx[a] * wz[b] ...: the weights turned, not indexed
      wx = wx.yzwx; dx = dx.yzwx;
    }
    wz = wz.yzwx; dz = dz.yzwx;
  }
  gx /= c.z; gz /= c.z;
}
float sstepD(float a, float b, float x) { float t = (x - a) / (b - a); return (t <= 0.0 || t >= 1.0) ? 0.0 : 6.0 * t * (1.0 - t) / (b - a); }
/* the kits' weights at p, each (value, d/dx, d/dz): wD the sand province's, wC the cloud sea's, lv the cloud sea's
   level and sk the land's sink (both bounded in slope by construction: world.js's grids). KW near the camera, eased
   into the far field (KF) and that into a constant by smooth weights of the distance: as world.js's kwAt */
const vec4 KW_FAR = vec4(0.5, 0.5, -65.0, 30.0);
void kitW4(vec2 p, out vec3 wD, out vec3 wC, out vec3 lv, out vec3 sk) {
  vec2 e = p - uCam.xz; float dc = length(e); vec2 u = dc > 1e-3 ? e / dc : vec2(0.0);
  float kn = 1.0 - smoothstep(5300.0, 6800.0, dc), kf = 1.0 - smoothstep(10300.0, 11800.0, dc), dkn = -sstepD(5300.0, 6800.0, dc), dkf = -sstepD(10300.0, 11800.0, dc);
  vec4 v, gx, gz;
  /* (speed S2) the near grid read at one site for both cases (it was two: three bsGrid inlined, 48 fetches each) */
  vec4 vF = KW_FAR, xF = vec4(0.0), zF = vec4(0.0), vN, xN, zN;
  if (kn < 1.0 && kf > 0.0) bsGrid(true, p, vF, xF, zF);
  vN = vF; xN = xF; zN = zF;
  if (kn > 0.0) bsGrid(false, p, vN, xN, zN);
  if (kn >= 1.0) { v = vN; gx = xN; gz = zN; }
  else {
    vec4 vM = mix(vF, vN, kn), xM = mix(xF, xN, kn) + (vN - vF) * dkn * u.x, zM = mix(zF, zN, kn) + (vN - vF) * dkn * u.y;
    v = mix(KW_FAR, vM, kf); gx = xM * kf + (vM - KW_FAR) * dkf * u.x; gz = zM * kf + (vM - KW_FAR) * dkf * u.y;
  }
  wD = vec3(v.x, gx.x, gz.x); wC = vec3(v.y, gx.y, gz.y); lv = vec3(v.z, gx.z, gz.z); sk = vec3(v.w, gx.w, gz.w);
}
void kitW(vec2 p, out vec3 wD, out vec3 wC) { vec3 a, b; kitW4(p, wD, wC, a, b); }

#define SAND_LIT uP[0].rgb
#define SAND_LIT2 uP[1].rgb
#define SAND_SHADE uP[2].rgb
#define SAND_DEEP uP[3].rgb
#define ROCK_LIT uP[4].rgb
#define ROCK_SHADE uP[5].rgb
#define STONE_LIT uP[6].rgb
#define STONE_SHADE uP[7].rgb
#define SHEEN uP[8].rgb
#define WINDDIR uP[9].xy
#define GLINT uP[9].z
#define SEA_Y uP[9].w
#define ROCK_DEEP uP[10].rgb
#define PALE uP[11].rgb
const float DS = 1500.0, RS = 4500.0;
/* an area's site: its cell's hash (the visit's salt), its place jittered in the cell, its kind, four parameters */
struct Site { vec2 p; int kind; vec4 r; };
Site siteOf(ivec2 c) {
  uint h = cellHash(c); Site s;
  s.p = (vec2(c) + 0.2 + 0.6 * vec2(hf(h), hf(ih(h + 1u)))) * DS;
  uint k = ih(h + 2u) >> 24;
  s.kind = k < 77u ? 0 : (k < 123u ? 1 : (k < 169u ? 2 : (k < 205u ? 3 : 0)));   // (world6: no bays: the cloud sea is the maps')
  s.r = vec4(hf(ih(h + 3u)), hf(ih(h + 4u)), hf(ih(h + 5u)), hf(ih(h + 6u)));
  return s;
}
/* a far ridge: a great ridge of rock (centre, half-length, height; angle, width over length, tilt along it, the steep
   side's share), one face steep and one long, its crest rounded */
vec3 massif(vec2 p, vec4 m, vec4 b, float seed) {
  vec2 d = p - m.xy;
  float ca = cos(b.x), sa = sin(b.x);
  vec2 l = vec2(ca * d.x + sa * d.y, -sa * d.x + ca * d.y) / m.z;
  if (abs(l.x) > 1.3 || abs(l.y) > b.y * 2.2 + 0.2) return vec3(0.0);
  vec2 dlx = vec2(ca, sa) / m.z, dly = vec2(-sa, ca) / m.z;
  /* (fast500 D) the four taps' noise in one loop (one copy of gnd for FXC), each tap's multiply and gradient turn as before */
  vec3 g0 = vec3(0.0), g1 = g0, g2 = g0, g3 = g0;
  for (int t = 0; t < 4 + uZ; t++) {
    vec2 o = t == 0 ? vec2(seed * 57.0) : (t == 1 ? vec2(0.0) : (t == 2 ? vec2(13.0) : vec2(29.0)));
    float kk = t == 0 ? 1.1 : (t == 1 ? 2.4 : 2.2);
    vec3 g = gnd(mat2(kk / m.z) * (p + o));
    if (t == 0) g0 = g; else if (t == 1) g1 = g; else if (t == 2) g2 = g; else g3 = g;
  }
  vec3 bend = 0.12 * dNg(g0, mat2(1.1 / m.z));
  vec3 y = vec3(l.y, dly) / b.y - bend;
  float side = y.x > 0.0 ? b.w : 1.0;
  vec3 ay = vec3(abs(y.x), sign(y.x) * y.yz) / side;
  vec3 across = dSstep(1.0, 0.0, ay + 0.12 * dNg(g1, mat2(2.4 / m.z)));
  across = dMul(across, across) * 0.35 + across * 0.65;
  vec3 along = dSstep(1.15, 0.45, vec3(abs(l.x), sign(l.x) * dlx) + 0.1 * dNg(g2, mat2(2.2 / m.z)));
  vec3 top = vec3(1.0 + b.z * l.x, b.z * dlx) + 0.05 * dNg(g3, mat2(2.2 / m.z));
  return m.w * dMul(dMul(across, along), top);
}
vec3 ridges(vec2 p) {
  vec3 s = vec3(0.0); ivec2 c0 = ivec2(floor(p / RS));
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    ivec2 c = c0 + ivec2(i, j); uint h = ih(cellHash(c) ^ 0x51ed27u);
    if ((ih(h + 2u) >> 24) >= 115u) continue;
    vec2 ctr = (vec2(c) + 0.25 + 0.5 * vec2(hf(h), hf(ih(h + 1u)))) * RS;
    // (world6 step B fix, defects 7 and 10) a broad rise of rock, 30-60 m, its faces long (each side 0.6-1 of its half
    // width): the flight's envelope (w06 groundEnv) climbs any of it from within its 320 m grid on any line (the step's
    // great ridges, 240-600 m with faces of 1-6 m/m, met after a drag, threw the camera up them at 467 m/s)
    vec4 m = vec4(ctr, 900.0 + 700.0 * hf(ih(h + 3u)), 30.0 + 30.0 * hf(ih(h + 4u)));
    vec4 b = vec4(hf(ih(h + 5u)) * PI, 0.5 + 0.3 * hf(ih(h + 6u)), (hf(ih(h + 7u)) - 0.5) * 0.3, 0.6 + 0.4 * hf(ih(h + 8u)));
    s += massif(p, m, b, float(i * 3 + j));
  }
  return s;
}
/* one family of dunes: an asymmetric wave across the wind (a long windward slope, a rounded brink, a steep lee
   face, a smooth trough), its phase warped so the crests wander and break */
vec3 duneWave(vec2 p, vec2 w, float lam, float c, vec3 warp) {
  vec3 ph = vec3(dot(p, w) / lam, w / lam) + warp;
  float f = fract(ph.x), s, ds;
  if (f < c) { float x = f / c; s = x * x * (2.0 - x); ds = (4.0 * x - 3.0 * x * x) / c; }
  else { float y = (f - c) / (1.0 - c); s = 1.0 - y * y * (3.0 - 2.0 * y); ds = -6.0 * y * (1.0 - y) / (1.0 - c); }
  return vec3(s, ph.yz * ds);
}
float swell(vec2 p) { return 40.0 * gnd(p * (1.0 / 760.0)).x + 15.0 * gnd(mat2(0.8, 0.6, -0.6, 0.8) * (1.0 / 330.0) * (p + vec2(311.0, -97.0))).x; }
/* (fast500 D) the dunes' taps: offsets and (diagonal) scales; taps 1 and 4 take a full matrix */
const vec2 D_TO[7] = vec2[7](vec2(0.0), vec2(311.0, -97.0), vec2(0.0), vec2(71.0), vec2(400.0), vec2(9.0), vec2(900.0));
const float D_TS[7] = float[7](1.0 / 760.0, 0.0, 1.0 / 340.0, 1.0 / 95.0, 0.0, 1.0 / 80.0, 1.0 / 160.0);
const mat2 D_M1 = mat2(0.8, 0.6, -0.6, 0.8) * (1.0 / 330.0);
vec3 dunes(vec2 p) {
  vec2 w = WINDDIR, pp = vec2(-w.y, w.x);
  mat2 Ma = mat2(w.x / 420.0, pp.x / 190.0, w.y / 420.0, pp.y / 190.0);
  float wSmall = 1.0 - smoothstep(900.0, 1300.0, gLodD);
  /* (fast500 D) the seven taps' noise in one loop FXC keeps rolled (one copy of gnd, not seven), each tap's own multiply
     as before and its gradient turn after (dNg, its matrix a constant as before): the same operations on the same values */
  vec3 g0 = vec3(0.0), g1 = g0, g2 = g0, g3 = g0, g4 = g0, g5 = g0, g6 = g0;
  for (int o = 0; o < (wSmall > 0.0 ? 7 : 5) + uZ; o++) {
    vec3 g;
    if (o == 1 || o == 4) g = gnd((o == 1 ? D_M1 : Ma) * (p + D_TO[o]));
    else g = gnd(mat2(D_TS[o]) * (p + D_TO[o]));
    if (o == 0) g0 = g; else if (o == 1) g1 = g; else if (o == 2) g2 = g; else if (o == 3) g3 = g; else if (o == 4) g4 = g; else if (o == 5) g5 = g; else g6 = g;
  }
  vec3 h = 40.0 * dNg(g0, mat2(1.0 / 760.0)) + 15.0 * dNg(g1, D_M1);
  vec3 warp = 0.42 * dNg(g2, mat2(1.0 / 340.0)) + 0.13 * dNg(g3, mat2(1.0 / 95.0));
  vec3 s1 = duneWave(p, w, 205.0, 0.68, warp);
  vec3 amp = dSstep(-0.42, 0.3, dNg(g4, Ma)) * 0.75 + vec3(0.25, 0.0, 0.0);
  h += 32.0 * dMul(dMul(s1, amp), gKD);   // (world6: the main dunes by the maps' sand weight)
  if (wSmall > 0.0) {
    vec2 w2 = normalize(w + 1.3 * pp);
    vec3 s2 = duneWave(p + 37.0, w2, 64.0, 0.7, 0.25 * dNg(g5, mat2(1.0 / 80.0)));
    h += (4.0 * wSmall) * dMul(dMul(s2, dSstep(-0.5, 0.4, dNg(g6, mat2(1.0 / 160.0)))), gKD);
  }
  return h;
}
vec3 ovalOut(vec2 p, vec2 c, vec2 ab, float ang) {   // metres outside an oval's rim (about), with its gradient
  vec2 dp = p - c; float cc = cos(ang), s = sin(ang);
  vec2 l = vec2(cc * dp.x + s * dp.y, -s * dp.x + cc * dp.y), ln = l / ab;
  float r = length(ln), m = min(ab.x, ab.y);
  vec2 gl = (ln / ab) / max(r, 1e-4) * m;
  return vec3((r - 1.0) * m, cc * gl.x - s * gl.y, s * gl.x + cc * gl.y);
}
/* a basin: the dunes calmed and sunk about a point (a giant shard's; gentler about the ruins) */
vec3 basinOf(vec2 p, vec3 h, Site s) {
  float R = s.kind == 1 ? 170.0 + 60.0 * s.r.x : 260.0, depth = s.kind == 1 ? 12.0 + 8.0 * s.r.y : 4.0, fl = s.kind == 1 ? 0.55 : 0.4;
  vec2 dp = p - s.p; float d = length(dp);
  if (d >= R) return h;
  vec3 w = dSstep(R, R * 0.25, vec3(d, dp / max(d, 1e-3)));
  return dMul(h, vec3(1.0, 0.0, 0.0) - fl * w) - depth * w;
}
/* a plateau: an oval of flat top, its sides in terraces (a riser, then a ledge), a stair's way cut down its -x face */
vec3 plateauOf(vec2 p, vec3 h, Site s, vec3 n17, float g8) {   // (fast500 D) n17 = dN(p + 17.0, mat2(1.0 / 140.0)), g8 = gn(p / 8.0): the same for every site, worked out once (D_Hd)
  vec2 ab = vec2(72.0 + 16.0 * s.r.x, 150.0 + 28.0 * s.r.y); float ang = s.r.z * PI;
  float rise = 46.0 + 14.0 * s.r.w, steps = s.r.w < 0.5 ? 2.0 : 3.0;
  vec3 e = ovalOut(p, s.p, ab, ang);
  float stepH = (rise + 10.0) / (steps + 0.5);
  if (e.x > stepH * 9.0 + 140.0) return h;
  float base = swell(s.p) + 8.0, top = base + rise;
  e += 5.0 * n17;
  float Pp = stepH * 2.3, u = max(e.x, 0.0) / Pp, k = floor(u), fr = u - k, x = clamp(fr / 0.3, 0.0, 1.0);
  float rs = x * x * (3.0 - 2.0 * x), drs = fr < 0.3 ? 6.0 * x * (1.0 - x) / 0.3 : 0.0;
  vec3 pl = vec3(top - stepH * (k + rs), e.x > 0.0 ? -stepH * drs / Pp * e.yz : vec2(0.0));
  // the top keeps a little of the dunes' swell (sand lies on it), none at the rim
  pl += (0.16 * sstepDown(0.0, -45.0, e.x)) * (h - vec3(base, 0.0, 0.0));
  // the stair's way down the -x face: the terraces cut to its slope (26 deg), sand drifted over some of its steps
  vec2 dp = p - s.p; float c = cos(ang), sn = sin(ang);
  float lx = c * dp.x + sn * dp.y, ly = -sn * dp.x + c * dp.y;
  if (lx < -ab.x + 4.0 && abs(ly) < 12.0) {
    float ou = -ab.x - lx, w = sstepDown(12.0, 9.5, abs(ly)), drift = 1.4 * max(g8 + 0.05, 0.0) * smoothstep(0.0, 12.0, ou);
    vec3 ramp = vec3(top - max(ou, 0.0) * 0.4877 + drift, ou > 0.0 ? 0.4877 * vec2(c, sn) : vec2(0.0));
    vec3 cut = dSmin(pl, ramp, 1.5);
    pl = vec3(mix(pl.x, cut.x, w), mix(pl.yz, cut.yz, w));
  }
  return dSmax(h, pl, 5.0);
}
vec3 D_Hd(vec2 p) {
  vec3 h = dunes(p);
  ivec2 c0 = ivec2(floor(p / DS));
  Site S[9];
  for (int j = 0; j < 3; j++) for (int i = 0; i < 3; i++) S[j * 3 + i] = siteOf(c0 + ivec2(i - 1, j - 1));
  for (int k = 0; k < 9 + uZ; k++) if (S[k].kind == 1 || S[k].kind == 2) h = basinOf(p, h, S[k]);   // (fast500 D: + uZ, kept rolled)
  vec3 n17 = dN(p + 17.0, mat2(1.0 / 140.0)); float g8 = gn(p / 8.0);   // (fast500 D) the plateaux' vertex-only taps, once
  for (int k = 0; k < 9 + uZ; k++) if (S[k].kind == 3) h = plateauOf(p, h, S[k], n17, g8);
  return h + ridges(p);
}
/* (world6) the bays' sea of cloud and its shading are gone: the cloud sea is the world's (HdSea, shadeSea) */
float D_scatterDensity(vec2 p, int layer) {
  float n = gn(p / 160.0 + float(layer) * 3.7);
  return smoothstep(-0.25, 0.35, n);
}
#ifdef GROUND_CACHE
/* where a sand veil blows from: the brink of the main dunes nearest p (walked along the wind onto the crest line, the
   crests' wander followed twice), the crest's height, and how much of a crest it is (the dunes' height there) */
vec4 veilSpot(vec2 p) {
  vec2 w = WINDDIR, pp = vec2(-w.y, w.x);
  for (int k = 0; k < 2; k++) {
    vec3 warp = 0.42 * dN(p, mat2(1.0 / 340.0)) + 0.13 * dN(p + 71.0, mat2(1.0 / 95.0));
    float df = 0.68 - fract(dot(p, w) / 205.0 + warp.x);
    df -= floor(df + 0.5);
    p += w * df * 205.0;
  }
  mat2 Ma = mat2(w.x / 420.0, pp.x / 190.0, w.y / 420.0, pp.y / 190.0);
  float amp = dSstep(-0.42, 0.3, dN(p + 400.0, Ma)).x;
  return vec4(p, groundH(p), smoothstep(0.3, 0.8, amp));
}
#endif
/* rock: blue stone in broad strata (each band its own tone, warmer in the sun, the lines wandering), streaked down by
   erosion, ledges of a lighter cap */
vec3 rockCol(vec3 p, vec3 n, float ndl, float fp) {
  float y = p.y + 9.0 * gn(p.xz / 260.0);
  float b1 = gn(vec2(y / 38.0, 1.7)), b2 = gn(vec2(y / 11.0, 4.1)), st = b1 * 0.8 + b2 * 0.35;
  float streak = gn(vec2(dot(p.xz, vec2(0.6, 0.8)) / 7.0 + 2.0 * gn(p.xz / 40.0), p.y / 90.0)) * (1.0 - smoothstep(0.6, 3.0, fp));
  float dif = smoothstep(-0.2, 0.7, ndl);
  vec3 shd = mix(ROCK_DEEP, ROCK_SHADE, 0.5 + 0.5 * n.y);
  vec3 lit = ROCK_LIT * mix(vec3(1.0), vec3(1.1, 0.98, 0.94), smoothstep(-0.2, 0.4, b1));
  return mix(shd, lit, dif) * (1.0 + 0.17 * st + 0.08 * streak);
}
/* (fast500 D R6) rockCol for the land's sand: four of the five taps in one loop FXC keeps rolled (uZ), each tap's input
   x * s as before (the same values; the landmarks keep rockCol: lanes/D/RESULT.md) */
vec3 rockColL(vec3 p, vec3 n, float ndl, float fp) {
  float y = 0.0, b1 = 0.0, b2 = 0.0, g40 = 0.0;
  for (int o = 0; o < 4 + uZ; o++) {
    vec2 x = o < 2 ? p.xz : vec2(y, o == 2 ? 1.7 : 4.1);
    vec2 s = o == 0 ? vec2(1.0 / 260.0) : (o == 1 ? vec2(1.0 / 40.0) : vec2(o == 2 ? 1.0 / 38.0 : 1.0 / 11.0, 1.0));
    float g = gn(x * s);
    if (o == 0) y = p.y + 9.0 * g; else if (o == 1) g40 = g; else if (o == 2) b1 = g; else b2 = g;
  }
  float st = b1 * 0.8 + b2 * 0.35;
  float streak = gn(vec2(dot(p.xz, vec2(0.6, 0.8)) / 7.0 + 2.0 * g40, p.y / 90.0)) * (1.0 - smoothstep(0.6, 3.0, fp));
  float dif = smoothstep(-0.2, 0.7, ndl);
  vec3 shd = mix(ROCK_DEEP, ROCK_SHADE, 0.5 + 0.5 * n.y);
  vec3 lit = ROCK_LIT * mix(vec3(1.0), vec3(1.1, 0.98, 0.94), smoothstep(-0.2, 0.4, b1));
  return mix(shd, lit, dif) * (1.0 + 0.17 * st + 0.08 * streak);
}
vec3 shadeSand(vec3 p, vec3 n0, vec3 rd, float t, float fp) {
  vec3 n = n0;
  float steep = smoothstep(0.42, 0.66, 1.0 - n0.y);
  // ripples across the wind, near only: one tap of the noise gives their turn, wander, spacing and patches
  float rk = (1.0 - smoothstep(0.012, 0.05, fp)) * (1.0 - steep);
  if (rk > 0.002) {
    // (world6 fix, the judges' defect 6) the ripples' phase a fixed wave (along the wind, 0.9 m) and a warp of bounded
    // gradient (their wander, turn and spacing): the step divided the position by a wavelength and turned it by an angle
    // that both varied over the sand, so the pattern's frequency grew with the distance from the world's origin (at
    // x -5000 a few centimetres: fingerprint rings, a G0 risk)
    vec4 nz = n3v(vec3(p.xz / 61.0, 0.71));
    vec2 w = WINDDIR, wp = vec2(-w.y, w.x), wr = normalize(w + wp * (nz.r - 0.5) * 0.6);
    float ph = dot(p.xz, w) / 0.9 + (nz.g - 0.5) * 9.0 + (nz.a - 0.5) * 6.0;
    float sl = cos(6.2831853 * ph) + 0.35 * cos(12.566 * ph + 1.0);
    float rpatch = smoothstep(0.38, 0.62, nz.b);
    n = normalize(n - rk * rpatch * 0.06 * sl * vec3(wr.x, 0.0, wr.y));
  }
  float ndl = dot(n, uSun);
  // the low sun lights the level sand and the faces toward it; the faces turned from it fall into the sky's blue
  float dif = smoothstep(-0.08, 0.26, ndl);
  float hb = smoothstep(-40.0, 50.0, p.y);
  vec3 lit = mix(SAND_LIT, SAND_LIT2, smoothstep(0.16, 0.62, ndl));
  vec3 shd = mix(SAND_DEEP, SAND_SHADE, hb);
  vec3 c = mix(shd, lit, dif);
  float gk = 1.0 - smoothstep(0.01, 0.04, fp);   // (hotfix G0: the grain gone before its cells are under three pixels)
  if (gk > 0.0) c *= 1.0 + gk * 0.07 * (h12(p.xz * 9.0) + h12(p.xz * 9.0 + 0.5) - 1.0);
  if (steep > 0.0) c = mix(c, rockColL(p, n0, dot(n0, uSun), fp), steep);   // (fast500 D R6)
  float vd = clamp(dot(n, -rd), 0.0, 1.0), gr = 1.0 - vd;
  c += SHEEN * gr * gr * gr * gr * smoothstep(-0.05, 0.6, ndl) * (1.0 - steep);
  // (hotfix G0) no glints: one 0.22 m cell in fourteen flashed the sun at pow 140 as the view moved, a few pixels
  // each (sparkle by design). Their light on average was under 1e-4 of the sun's (7% of cells x the flash's mean over
  // the facets' spread x the spot's mean), under a hundredth of a code: nothing the sand loses
  return c;
}
/* the landmarks: col.a says what each is (1 dark stone, 2 rock: the great formations, 3 pale stone) */
vec3 D_shadeStone(vec3 p, vec3 n, vec3 rd, float t, float fp, vec4 col, float yAbove) {
  float ndl = dot(n, uSun), mat = col.a, rr = 1.0 - clamp(dot(n, -rd), 0.0, 1.0), rim = rr * rr * rr;
  vec3 c;
  if (mat > 1.5 && mat < 2.5) {
    c = rockCol(p, n, ndl, fp);
    float sandy = smoothstep(0.72, 0.9, n.y) * 0.85 + (1.0 - smoothstep(2.0, 16.0, yAbove)) * 0.7;
    vec3 sc = mix(mix(SAND_DEEP, SAND_SHADE, 0.6), SAND_LIT, smoothstep(-0.1, 0.24, ndl));
    c = mix(c, sc, clamp(sandy, 0.0, 1.0));
    c += SHEEN * 0.35 * rim * smoothstep(0.0, 0.5, ndl);
    return c;
  }
  float dif = smoothstep(-0.15, 0.8, ndl);
  if (mat > 2.5) c = (mix(STONE_SHADE * 1.7, PALE, dif) + PALE * 0.22 * max(n.y, 0.0)) * col.rgb;
  else c = mix(STONE_SHADE, STONE_LIT, dif) * col.rgb;
  c += STONE_SHADE * 0.3 * max(n.y, 0.0);
  c *= mix(0.6, 1.0, smoothstep(0.0, 3.0, yAbove));
  c += SHEEN * 0.6 * rim * smoothstep(0.0, 0.5, ndl);
  return c;
}

#define A_STONE_LIT uP[12].rgb
#define A_STONE_SHADE uP[13].rgb
#define A_GRASS uP[14].rgb
#define A_MIST uP[15].rgb
#define A_SEALIT uP[15].x
#define A_GRASS_LIT uP[16].rgb
#define A_ROCK_DEEP uP[17].rgb
const vec2 A_TO[7]=vec2[7](vec2(0.0),vec2(77.0),vec2(13.0,5.0),vec2(-41.0,19.0),vec2(7.0,-3.0),vec2(-19.0,31.0),vec2(5.0,23.0));
const float A_TS[7]=float[7](1.0/900.0,0.0,1.0/210.0,0.0,1.0/26.0,0.0,1.0/17.0);
const mat2 A_M1=mat2(0.8,0.6,-0.6,0.8)*(1.0/380.0),A_M3=mat2(0.6,0.8,-0.8,0.6)*(1.0/75.0),A_M5=mat2(0.9,-0.44,0.44,0.9)*(1.0/48.0);
vec3 A_Hd(vec2 p){
float k1=1.0-smoothstep(350.0,900.0,gLodD),k2=1.0-smoothstep(120.0,380.0,gLodD);
vec3 g0=vec3(0.0),g1=g0,g2=g0,g3=g0,g4=g0,g5=g0,g6=g0;
for(int o=0;o<5+(k1>0.0?1:0)+(k2>0.0?1:0)+uZ;o++){
vec3 g;
if(o==1||o==3||o==5)g=gnd((o==1?A_M1:(o==3?A_M3:A_M5))*(p+A_TO[o]));
else g=gnd(mat2(A_TS[o])*(p+A_TO[o]));
if(o==0)g0=g;else if(o==1)g1=g;else if(o==2)g2=g;else if(o==3)g3=g;else if(o==4)g4=g;else if(o==5)g5=g;else g6=g;
}
vec3 h=30.0*dNg(g0,mat2(1.0/900.0))+12.0*dNg(g1,A_M1);
h+=28.0*dAbs(dNg(g2,mat2(1.0/210.0)),0.04);
h+=12.0*dAbs(dNg(g3,A_M3),0.05);
h+=4.0*dAbs(dNg(g4,mat2(1.0/26.0)),0.07);
if(k1>0.0)h+=(9.0*k1)*dAbs(dNg(g5,A_M5),0.08);
if(k2>0.0)h+=(3.5*k2)*dAbs(dNg(g6,mat2(1.0/17.0)),0.1);
return h;
}
vec3 A_bump(vec2 q,float fp){
float k1=1.0-smoothstep(0.1,0.4,fp),k2=1.0-smoothstep(0.04,0.15,fp);
vec2 g=vec2(0.0);
if(k1>0.002){vec3 a=gnd(q/7.0+vec2(3.1,7.7));float s=a.x/sqrt(a.x*a.x+0.0064);g+=k1*2.2*s*a.yz/7.0;}
if(k2>0.002){vec3 c=gnd(mat2(0.8,0.6,-0.6,0.8)*q/2.6+vec2(11.3,5.9));float s=c.x/sqrt(c.x*c.x+0.0064);g+=k2*0.7*s*c.yz/2.6;}
return vec3(g.x,0.0,g.y);
}
vec3 A_shadeSea(vec3 p,vec3 n,vec3 rd,float t,float fp){
n=normalize(n-A_bump(p.xz,fp));
float hgt=smoothstep(-25.0,55.0,p.y);
float crease=smoothstep(-8.0,16.0,p.y-30.0*gn(p.xz/900.0));
float ndl=dot(n,uSun);
float tauL=(1.0-hgt)*2.8+max(0.0,-ndl)*3.6+0.6;
float rr=1.0-clamp(dot(n,-rd),0.0,1.0);
float ao=mix(0.45,1.0,hgt)*mix(0.75,1.0,crease);
vec3 c=cloudLight(n,rd,tauL,ao,hgt,rr*rr*rr*rr*0.06);
float top=smoothstep(0.84,0.985,n.y)*smoothstep(0.2,0.75,hgt)*smoothstep(-0.2,0.4,crease-0.3);
c=mix(c,uClLit*vec3(1.04,1.03,1.05)*A_SEALIT,0.78*top);
c=mix(c,uClDeep,0.35*smoothstep(0.93,0.7,n.y)*(1.0-hgt*0.5));
return c;
}
vec3 A_shadeStone(vec3 p,vec3 n,vec3 rd,float t,float fp,vec4 col,float yAbove){
float ndl=dot(n,uSun),mat=col.a,dif=smoothstep(-0.15,0.8,ndl);
float rr=1.0-clamp(dot(n,-rd),0.0,1.0),r2=rr*rr*rr;
vec3 c;
if(mat>3.5)c=mix(A_GRASS,A_GRASS_LIT,dif)*(0.85+0.15*gn(p.xz/9.0));
else if(mat>1.5&&mat<2.5)c=mix(A_ROCK_DEEP,A_STONE_SHADE,0.5+0.5*n.y)*(1.0+0.12*gn(vec2(p.y/14.0,2.0)));
else c=mix(A_STONE_SHADE,A_STONE_LIT,dif)*col.rgb+A_STONE_SHADE*0.25*max(n.y,0.0);
c+=uClRim*0.25*r2*r2*smoothstep(0.3,0.9,dot(rd,uSun));
return c;
}

vec3 Hd(vec2 p){
vec3 wD,wC,lv,sk;kitW4(p,wD,wC,lv,sk);
gKD=wD;gLV=lv;gWC=wC;
vec3 h=D_Hd(p)-sk;
gKD=vec3(1.0,0.0,0.0);
return h;
}
vec3 HdSea(vec2 p){
vec3 wD,wC,lv,sk;kitW4(p,wD,wC,lv,sk);
vec3 amp=vec3(0.4,0.0,0.0)+0.6*wC;
return lv+dMul(A_Hd(p),amp);
}
const float COAST_H=14.0;
float HdGap(vec2 p,float h){if(h-gLV.x>140.0)return 1e4;return h-(gLV.x+A_Hd(p).x*(0.4+0.6*gWC.x));}
vec3 shadeSea(vec3 p,vec3 n,vec3 rd,float t,float fp);
vec3 shadeLand(vec3 p,vec3 n,vec3 rd,float t,float fp){
vec3 c=shadeSand(p,n,rd,t,fp);
if(gTX<COAST_H){float k=1.0-smoothstep(0.0,COAST_H,gTX);c=mix(c,shadeSea(vec3(p.x,p.y-max(gTX,0.0),p.z),vec3(0.0,1.0,0.0),rd,t,fp),k*k);}
return c;
}
float HdCam(vec2 p){return max(Hd(p).x,HdSea(p).x);}
float HdProbe(vec2 p,bool cam){
vec3 wD,wC,lv,sk;kitW4(p,wD,wC,lv,sk);
gKD=wD;gLV=lv;gWC=wC;
vec3 h=D_Hd(p)-sk;
gKD=vec3(1.0,0.0,0.0);
if(!cam)return h.x;
vec3 amp=vec3(0.4,0.0,0.0)+0.6*wC;
return max(h.x,(lv+dMul(A_Hd(p),amp)).x);
}
vec3 shadeSea(vec3 p,vec3 n,vec3 rd,float t,float fp){
vec3 wD,wC,lv,sk;kitW4(p.xz,wD,wC,lv,sk);
return A_shadeSea(vec3(p.x,p.y-lv.x,p.z),n,rd,t,fp);
}
vec3 shadeStone(vec3 p,vec3 n,vec3 rd,float t,float fp,vec4 col,float yAbove){
float m=col.a;
if(m>3.5)return A_shadeStone(p,n,rd,t,fp,vec4(col.rgb,m>5.5?2.0:(m>4.5?1.0:4.0)),yAbove);
return D_shadeStone(p,n,rd,t,fp,col,yAbove);
}
float scatterDensity(vec2 p,int layer){vec3 wD,wC;kitW(p,wD,wC);return D_scatterDensity(p,layer)*(1.0-smoothstep(0.4,0.8,wC.x));}


vec3 D_HdSites(vec2 p, vec3 h) {
  ivec2 c0 = ivec2(floor(p / DS));
  Site S[9];
  for (int j = 0; j < 3; j++) for (int i = 0; i < 3; i++) S[j * 3 + i] = siteOf(c0 + ivec2(i - 1, j - 1));
  for (int k = 0; k < 9 + uZ; k++) if (S[k].kind == 1 || S[k].kind == 2) h = basinOf(p, h, S[k]);   // (fast500 D: + uZ, kept rolled)
  vec3 n17 = dN(p + 17.0, mat2(1.0 / 140.0)); float g8 = gn(p / 8.0);   // (fast500 D) the plateaux' vertex-only taps, once
  for (int k = 0; k < 9 + uZ; k++) if (S[k].kind == 3) h = plateauOf(p, h, S[k], n17, g8);
  return h;
}

uniform int uHsrc;
uniform vec4 uLevA[10];uniform vec4 uGCw;uniform highp sampler2D uTex;
uniform highp sampler2D uHP0,uHP2;
layout(location=0)out vec4 o0;layout(location=1)out vec4 o1;
ivec2 gq;vec2 gw;
void gridW(){
gq=ivec2(gl_FragCoord.xy);
if(uHsrc==0){
int l=gq.y/97;vec2 aG=vec2(float(gq.x),float(gq.y-l*97));vec4 L=uLevA[l];
vec2 w=L.xy+aG*L.z;
float d=max(abs(w.x-uCam.x),abs(w.y-uCam.z));
float m=clamp((d-(L.w-11.0)*L.z)/(8.5*L.z),0.0,1.0);
w-=mod(aG,2.0)*L.z*m;
gLodD=length(w-uCam.xz);gw=w;
}else gw=uHsrc==2?uGCw.xy+gl_FragCoord.xy*uGCw.z:texelFetch(uTex,gq,0).xy;
}
void main() { gridW(); o0 = vec4(D_HdSites(gw, texelFetch(uHP2, gq, 0).xyz).x, 0.0, 0.0, 0.0); o1 = vec4(0.0); }