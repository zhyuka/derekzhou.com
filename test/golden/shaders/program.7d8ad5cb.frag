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

#define SKY_PH2

uniform vec4 uSunD;
uniform int uZs;
uniform vec4 uHi;
uniform vec3 uHiC;
uniform vec4 uMoon;
uniform vec3 uMoonC,uMoonG;
uniform vec4 uNight;
uniform vec4 uSunB;
uniform vec4 uGal,uGalC;
uniform vec4 uAur;
out vec4 oC;
const float SKYTAU=6.2831853;
const float STC=0.04;
#ifdef SKY_PH2
vec3 galaxyAt(vec3 rd,float e){
vec3 P=uGal.xyz,C=uGalC.xyz;
float b=dot(rd,P),l=atan(dot(rd,cross(P,C)),dot(rd,C)),u=l/SKYTAU;
float band=exp(-b*b/0.0225),core=exp(-l*l/0.36)*exp(-b*b/0.05);
float n=n3v(vec3(u*7.0,b*3.15,0.13)).b*0.45+n3v(vec3(u*21.0,b*9.9,0.71)).a*0.35+n3v(vec3(u*62.0,b*29.7,0.29)).a*0.2;
float lanes=smoothstep(0.4,0.64,n3v(vec3(u*4.0,b*5.6*0.33+0.1*n3v(vec3(u*13.0,0.4,0.61)).b,0.37)).b)*exp(-pow(b-0.02*sin(l*5.0),2.0)/0.003);
return(vec3(0.9,0.86,0.8)*band*(0.25+1.1*n*n)+vec3(1.0,0.85,0.65)*core*1.3)*(1.0-0.8*lanes)*uGal.w*0.04*smoothstep(1.0,12.0,e);
}
vec3 auroraAt(vec3 rd,float e){
float az=atan(rd.x,rd.z),u=az/SKYTAU;vec3 c=vec3(0.0);
for(int j=0;j<3;j++){
float fj=float(j),sc=1.0-0.22*fj,ph=uT*(0.04+0.015*fj)+uAur.y+fj*2.1,f1=2.0+fj,f2=5.0+2.0*fj;
float base=uAur.z*sc+2.0*fj+sc*(3.5*sin(az*f1+ph)+2.0*sin(az*f2-ph*1.3)+2.4*(n3v(vec3(u*4.0+fj*0.31,ph*0.02,0.83)).b-0.5));
float slope=abs(3.5*f1*cos(az*f1+ph)+2.0*f2*cos(az*f2-ph*1.3))*sc;
float fold=0.65+0.7/(1.0+slope*0.12);
float hgt=7.0+9.0*sc,x=e-base;
if(x<-1.5||x>hgt*2.5)continue;
float rays=0.3+0.7*pow(n3v(vec3(u*(100.0+31.0*fj)+uT*0.0005,0.5+fj*0.2,0.19)).a,1.6)*(0.6+0.4*n3v(vec3(u*257.0-uT*0.0003,0.27+fj*0.1,0.47)).b);
vec3 col=mix(vec3(0.25,1.0,0.55),vec3(0.85,0.25,0.55),smoothstep(0.25,1.2,x/hgt));
c+=col*smoothstep(-0.6,0.25,x)*(1.0-smoothstep(hgt*1.6,hgt*2.5,x))*(exp(-max(x,0.0)/hgt)+0.6*exp(-max(x,0.0)/(hgt*0.15)))*rays*fold*(0.85-0.25*fj);
}
return c*uAur.w*0.09*smoothstep(0.5,6.0,e);
}
#endif
vec3 sd0(float jb,float ib,float n){float se=(jb+0.5)*STC,sa=(ib+0.5)/n*SKYTAU-PI;return vec3(sin(sa)*cos(se),sin(se),cos(sa)*cos(se));}
float starAt(vec3 rd,float el,float az,float pa,int dj,int di){
float jb=floor(el/STC)+float(dj),elc=(jb+0.5)*STC;
if(elc<=0.0||elc>=1.5)return 0.0;
float n=max(1.0,floor(SKYTAU*cos(elc)/STC));
float ib=floor((az+PI)/SKYTAU*n)+float(di);
ib=mod(ib,n);
uint h=ih(ih(uint(int(jb)+4096)*0x9e3779b1u)^uint(int(ib))*0x85ebca6bu);
float hx=hf(h),hy=hf(ih(h+1u)),hz=hf(ih(h+2u)),hw=hf(ih(h+3u));
float dens=1.0+(uGal.w>0.0?1.5*uGal.w*exp(-pow(dot(sd0(jb,ib,n),uGal.xyz),2.0)/0.03):0.0);
if(hx>0.42*dens)return 0.0;
float se=(jb+0.2+0.6*hy)*STC,sa=(ib+0.2+0.6*hz)/n*SKYTAU-PI;
vec3 sd=vec3(sin(sa)*cos(se),sin(se),cos(sa)*cos(se));
float b=pow(fract(hx*7.31+hy*3.17),6.0)*0.95+0.07;
b*=1.0+0.15*uNight.z*sin(uT*(0.6+1.2*hw)+hz*SKYTAU);
float sg=0.42*pa;vec3 dv=rd-sd;float d2=dot(dv,dv);
return b*exp(-d2/(2.0*sg*sg));
}
float veilMean(float x){return smoothstep(0.55-x,0.95-x,0.692);}
void main(){
vec2 ndc=gl_FragCoord.xy/uRes*2.0-1.0;
vec3 rd=normalize(uCamF+uCamR*ndc.x*uProj.x+uCamU*ndc.y*uProj.y);
vec3 c=rd.y<0.0?fogCol(rd):skyCol(rd);
c=mix(c,hazeCol(rd),hazeSky(rd));
float cs=dot(rd,uSkyS);
{
float kd=clamp(uSunD.w,0.0,1.0);
float ang=degrees(acos(clamp(cs,-1.0,1.0))),R=degrees(acos(uSunD.x)),px=2.0*degrees(atan(uProj.y))/uRes.y;
float disc=(1.0-smoothstep(R-px*1.2,R+px*1.2,ang))*uSunVis;
vec3 dc=uSunC*uSunD.y*(0.94+0.06*smoothstep(R*0.6,R,ang));
vec3 cA=mix(c,max(c,dc),disc);
float zr=(ang-R*1.55)/(R*0.22);
cA+=uSunC*uSunD.y*0.05*exp(-zr*zr)*(1.0-disc)*uSunVis;
float discB=smoothstep(uSunD.x-(1.0-uSunD.x)*0.35,uSunD.x+(1.0-uSunD.x)*0.2,cs);
float angB=acos(clamp(cs,-1.0,1.0)),RB=acos(uSunD.x);
float z9=(angB-RB*9.0)/(RB*1.4);
vec3 cB=c+uSunC*discB*uSunD.y*uSunVis;
cB+=uSunC*(0.32*exp(-angB/(RB*1.6))+0.05*exp(-z9*z9))*uSunVis;
vec3 dv=rd-uSkyS;float sx=dot(dv,uCamR),sy=dot(dv,uCamU);
cB+=uSunC*0.1*exp(-abs(sy)/(RB*0.35))*exp(-abs(sx)/(RB*16.0))*step(0.0,cs)*uSunVis;
c=mix(cB,cA,kd);
}
if(uHi.x>0.0&&rd.y>0.01){
vec2 P=uCam.xz+rd.xz/rd.y*(3000.0-uCam.y);
vec2 qs=P*vec2(1.0/153600.0,1.0/38400.0);
float n=n3v(vec3(qs,0.37)).a*0.66+n3v(vec3(qs*1.8+0.31,0.71)).a*0.34-0.5;
float cov=smoothstep(0.55-uHi.x,0.95-uHi.x,n*1.6+0.5)*smoothstep(0.06,0.25,rd.y);
vec3 hc=uHiC*(1.0+1.5*pow(max(cs,0.0),6.0));
float vm=veilMean(uHi.x),vk=smoothstep(0.0,0.05,uHi.x);
c=mix(c,hc,vm*uHi.y*vk*smoothstep(0.01,0.12,rd.y));
c=mix(c,hc,max(cov-vm,0.0)/max(1.0-vm,0.05)*uHi.y*vk);
}
if(uSkyN.w>0.0&&uHi.x>0.0&&rd.y>0.01){
vec2 P=uCam.xz+rd.xz/rd.y*(3000.0-uCam.y);
vec2 qs=P*vec2(1.0/153600.0,1.0/38400.0);
float n=n3v(vec3(qs,0.37)).a*0.66+n3v(vec3(qs*1.8+0.31,0.71)).a*0.34-0.5;
float cov=smoothstep(0.55-uHi.x,0.95-uHi.x,n*1.6+0.5)*smoothstep(0.06,0.25,rd.y);
vec3 hc=uHiC*(1.0+1.5*(pow(max(cs,0.0),6.0)*uSunK.y+pow(max(dot(rd,uSkyN.xyz),0.0),6.0)*uSunK.z));
float vm=veilMean(uHi.x),vk=smoothstep(0.0,0.05,uHi.x);
c=mix(c,hc,vm*uSunB.y*vk*smoothstep(0.01,0.12,rd.y));
c=mix(c,hc,max(cov-vm,0.0)/max(1.0-vm,0.05)*uSunB.y*vk);
}
float eS=degrees(asin(clamp(rd.y,-1.0,1.0)));
if(uNight.x>0.0&&eS>-1.0){
float se=degrees(asin(clamp(uSkyS.y,-1.0,1.0))),side=pow(clamp(0.5+0.5*dot(normalize(rd.xz+1e-5),normalize(-uSkyS.xz+1e-5)),0.0,1.0),2.0)*uNight.x*smoothstep(-1.0,0.0,eS);
float hs=1.0+max(-se,0.0)*1.1;
float sh=1.0-smoothstep(hs-0.8,hs+1.2,eS),bl=smoothstep(hs-0.4,hs+2.0,eS)*(1.0-smoothstep(hs+5.0,hs+13.0,eS));
c=mix(c,c*vec3(0.72,0.78,0.95),sh*side*0.55);
c+=vec3(0.95,0.6,0.66)*bl*side*dot(c,LUMA)*0.35;
}
if(uNight.y>0.0&&eS>0.5&&eS<18.0){
float side=pow(clamp(0.5+0.5*dot(normalize(rd.xz+1e-5),normalize(uSkyS.xz+1e-5)),0.0,1.0),1.5);
vec2 q=vec2(atan(rd.x,rd.z)/SKYTAU*14.0,eS*0.09);
float n=textureLod(uN3,vec3(q.x,q.y*4.0,0.21)*0.25,0.0).a*0.55+textureLod(uN3,vec3(q.x*3.0,q.y*11.0,0.53)*0.25,0.0).b*0.45;
c+=vec3(0.55,0.8,1.0)*smoothstep(0.52,0.78,n)*smoothstep(1.0,4.0,eS)*(1.0-smoothstep(9.0,17.0,eS))*side*uNight.y*0.05;
}
if(uSkyN.w>0.0&&uSunB.x>0.0&&eS>0.5&&eS<18.0){
float side=pow(clamp(0.5+0.5*dot(normalize(rd.xz+1e-5),normalize(uSkyS.xz+1e-5)),0.0,1.0),1.5);
vec2 q=vec2(atan(rd.x,rd.z)/SKYTAU*14.0,eS*0.09);
float n=textureLod(uN3,vec3(q.x,q.y*4.0,0.21)*0.25,0.0).a*0.55+textureLod(uN3,vec3(q.x*3.0,q.y*11.0,0.53)*0.25,0.0).b*0.45;
c+=vec3(0.55,0.8,1.0)*smoothstep(0.52,0.78,n)*smoothstep(1.0,4.0,eS)*(1.0-smoothstep(9.0,17.0,eS))*side*uSunB.x*0.05*smoothstep(uSunK.w-0.8,uSunK.w+1.2,eS);
}
#ifdef SKY_PH2
if(uGal.w>0.0&&eS>0.0)c+=galaxyAt(rd,eS);
if(uAur.w>0.0&&eS>0.5)c+=auroraAt(rd,eS);
#endif
if(uMoon.w>0.0){
vec3 c0=c;
float ma=degrees(acos(clamp(dot(rd,uMoon.xyz),-1.0,1.0))),mr=1.8,mpx=2.0*degrees(atan(uProj.y))/uRes.y;
float out1=max(ma-mr,0.0);
c=mix(c,max(c,uMoonG),clamp(exp(-out1/2.2)*0.9+0.08*exp(-ma/14.0)*uMoon.w,0.0,1.0));
if(ma<7.0)c+=uMoonG*0.15*(vec3(0.95,0.62,0.42)*exp(-pow((ma-2.6)/0.3,2.0))*0.5+vec3(0.4,0.75,1.0)*exp(-pow((ma-3.4)/0.35,2.0))*0.3
+vec3(0.5,1.0,0.6)*exp(-pow((ma-4.1)/0.4,2.0))*0.2+vec3(1.0,0.55,0.6)*exp(-pow((ma-4.9)/0.45,2.0))*0.22);
c=mix(c,uMoonC,1.0-smoothstep(mr-max(mpx*1.2,0.3),mr+max(mpx*1.2,0.12),ma));
c=c0+(c-c0)*(1.0-hazeSky(rd));
}
if(uSunD.z>0.0&&rd.y>0.0){
float el=asin(clamp(rd.y,-1.0,1.0)),az=atan(rd.x,rd.z),pa=2.0*atan(uProj.y)/uRes.y;
float s=0.0;
for(int c=0;c<5+uZs;c++){int dj=c==3?-1:(c==4?1:0),di=c==1?-1:(c==2?1:0);s+=starAt(rd,el,az,pa,dj,di);}
s*=uSunD.z*smoothstep(0.0,0.2,rd.y)*0.94;
float head=max(uNight.w-dot(c,LUMA),0.0);
c+=vec3(0.92,0.94,1.0)/0.94*head*(1.0-exp(-s/max(head,1e-5)));
}
#ifdef SKY_HOOK
c=skyHook(rd,c);
#endif
oC=vec4(c,1.0);
}