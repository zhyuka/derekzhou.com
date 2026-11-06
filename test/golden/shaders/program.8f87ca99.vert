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

layout(location=0)in vec4 aV;
uniform vec4 uFa,uFb,uFc;
uniform vec4 uFd,uFe;
centroid out vec3 vW;centroid out vec3 vN;centroid out float vLit;centroid out float vGlow;
void main(){
int i=gl_InstanceID;int kind=int(uFb.w+0.5);
uint h=ih(uint(i)*2654435761u+uint(abs(uFa.w)*13.0)+77u);
float r1=hf(h),r2=hf(ih(h+1u)),r3=hf(ih(h+2u)),r4=hf(ih(h+3u)),r5=hf(ih(h+4u));
float u=uT-40.0-uFa.w;
vec3 ctr=uFa.xyz+vec3(uFb.x,0.0,uFb.y)*u;
float om=uFc.x*(0.8+0.4*r1)*(r5<0.5?1.0:0.92),rho=uFb.z*(0.3+0.7*sqrt(r2)),th=r3*6.2831853+om*u;
float yy=uFc.w*(r4-0.5)+0.12*uFc.w*sin(u*0.6+r1*6.28);
vec3 pos=ctr+vec3(rho*cos(th),yy,rho*sin(th));
vec3 vel=vec3(uFb.x,0.0,uFb.y)+rho*om*vec3(-sin(th),0.0,cos(th))+vec3(0.0,0.07*uFc.w*cos(u*0.6+r1*6.28),0.0);
if(uFd.z>0.5){
if(uFd.z<1.5){float a=float(i)*uFe.y+uFe.w*u;pos=ctr+vec3(uFe.x*cos(a),float(i)*uFe.z,uFe.x*sin(a));}
else{float a=r3*6.2831853;pos=ctr+vec3(rho*cos(a),uFc.w*(r4-0.5),rho*sin(a));}
vel=vec3(uFb.x,0.0,uFb.y)+vec3(1e-3,0.0,0.0);
}
if(uFd.x>0.0){pos.y+=uFd.x*sin(u*uFd.y*(0.85+0.3*r2)+r1*6.2831853);vel.y+=uFd.x*uFd.y*cos(u*uFd.y+r1*6.2831853);}
vec3 v=aV.xyz*uFc.y;
vGlow=0.0;vLit=r1;
if(kind>=4){
float yaw=r3*6.2831853+u*(kind==5?0.06:0.1)*(r5<0.5?1.0:-1.0),cy=cos(yaw),sy=sin(yaw);
vec3 nl;
if(kind==4){
float ph=fract(uFc.z*u+r4),p=smoothstep(0.0,0.25,ph)*(1.0-smoothstep(0.35,1.0,ph));
pos.y+=0.35*uFc.y*sin(6.2831853*(uFc.z*u+r4)-0.6);
if(aV.w<0.5){v.xz*=1.0-0.2*p;v.y*=1.0-0.15*p;vGlow=1.0;nl=normalize(aV.xyz*vec3(1.0,1.5,1.0)+vec3(0.0,0.25,0.0));}
else{float k=aV.w-1.0;v.xz+=0.18*uFc.y*k*vec2(sin(6.2831853*uFc.z*u-k*2.5+r1*6.0),cos(6.2831853*uFc.z*u*0.8-k*2.0+r2*6.0));v.y*=1.0+0.12*p;vGlow=0.6*(1.0-0.5*k);nl=vec3(0.0,1.0,0.0);}
}else{
vGlow=aV.w>1.5?0.6:(aV.w>0.5?1.0:0.12);
vGlow*=1.0+0.1*sin(u*(1.3+0.4*r2)+r1*6.28);
nl=aV.w>1.5?vec3(0.0,-1.0,0.0):normalize(aV.xyz*vec3(1.0,2.2,1.0)+vec3(0.0,0.2,0.0));
}
vW=pos+vec3(cy*v.x+sy*v.z,v.y,-sy*v.x+cy*v.z);
vN=vec3(cy*nl.x+sy*nl.z,nl.y,-sy*nl.x+cy*nl.z);
gl_Position=uVP*vec4(vW-uCam,1.0);
return;
}
vec3 fw=normalize(vel+vec3(1e-4,0.0,0.0)),rt=normalize(cross(vec3(0.0,1.0,0.0),fw)),up=cross(fw,rt);
float bank=clamp(-om*0.45,-0.6,0.6);
vec3 rt2=rt*cos(bank)+up*sin(bank),up2=up*cos(bank)-rt*sin(bank);
if(kind==3){
float burst=smoothstep(0.3,0.55,gn(vec2(u*0.6+r1*19.0,r2*7.0))+0.5);
float s0=sin(6.2831853*uFc.z*(0.9+0.2*r4)*u+r5*6.28-(aV.w>1.5?0.6:0.0));
float a=mix(0.55,0.45+0.75*s0,burst),x=abs(v.x);
v=vec3(sign(v.x)*x*cos(a),v.y+x*sin(a),v.z);
vGlow=1.0;
}else if(aV.w>=0.0){
float burst=smoothstep(0.35,0.6,gn(vec2(u*0.35+r1*19.0,r2*7.0))+0.5);
float fl=mix(0.18,0.75*sin(6.2831853*uFc.z*(0.9+0.2*r4)*u+r5*6.28)+0.05,burst);
float a=fl*(aV.w>1.5?1.45:1.0)*min(aV.w,1.0)+(aV.w>1.5?0.25*fl:0.0);
float x=abs(v.x);v=vec3(sign(v.x)*x*cos(a),v.y+x*sin(a),v.z);
}else{
float sp=-aV.w-1.0;
v.y+=uFc.y*0.12*sp*sin(6.2831853*uFc.z*u-aV.z*3.0+r1*6.28);
}
vW=pos+rt2*v.x+up2*v.y+fw*v.z;
vN=up2;
gl_Position=uVP*vec4(vW-uCam,1.0);
}