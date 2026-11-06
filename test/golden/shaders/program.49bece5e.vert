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
vec3 skyCol(vec3 rd){
float e=degrees(asin(clamp(rd.y,-1.0,1.0)));
vec3 g=skyGrad(e),c=g;
float side=sunSide(rd),low=exp(-max(e,0.0)/uSkyK.y);
c=mix(c,uSkyW,uSkyK.x*side*side*low);
c*=1.0-uSkyK.z*(1.0-side)*low;
float cs=max(dot(rd,uSkyS),0.0);
c+=uGlowC*(uGlow.x*pow(cs,uGlow.y)+uGlow.z*pow(cs,uGlow.w));
if(uSkyN.w>0.0){
float cn=max(dot(rd,uSkyN.xyz),0.0);
c+=skyWarmN(g,e,side)-g+uGlowN*(uGlow.x*pow(cn,uGlow.y)+uGlow.z*pow(cn,uGlow.w));
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
vec3 fq=fogCol(rd),fc=mix(mix(fq,uFogB.rgb,uFogB.a),fq,smoothstep(0.25,0.95,f));
c=mix(c,fc,f);
c=mix(c,hazeCol(rd),hazeAmt(rd,t));
#ifndef NO_TWILIGHT
if(uTwM.x>0.0)c=mix(c,fq,uTwM.x*(1.0-smoothstep(uTwM.y,uTwM.y+uTwM.z,abs(rd.y))));
#endif
return c;
}
vec3 ambient(vec3 n){return mix(uAmbD,uAmbU,0.5+0.5*n.y);}

const vec3 LUM=vec3(0.2126,0.7152,0.0722);
layout(location=0)in vec4 aBox;
layout(location=1)in vec4 aK1;
layout(location=2)in vec4 aE;
layout(location=3)in vec4 aB;
layout(location=4)in vec4 aC;
layout(location=5)in vec4 aM;
layout(location=6)in vec4 aL;
uniform vec2 uOut;
uniform vec4 uGr;
uniform vec3 uLift,uGain;
uniform vec4 uMode;
uniform vec3 uInkF;
flat out vec4 vK1,vCol,vZ,vC,vW,vAir,vL;

vec3 shoulder(vec3 c){float m=max(c.r,max(c.g,c.b));const float K=0.78;if(m<=K)return c;
float mm=K+(1.0-K)*(1.0-exp(-(m-K)/(1.0-K)));vec3 h=c*(mm/m);float over=clamp((m-1.0)/3.0,0.0,1.0);return mix(h,vec3(mm),over*0.75);}
vec3 enc(vec3 c){return mix(c*12.92,1.055*pow(c,vec3(1.0/2.4))-0.055,step(0.0031308,c));}
vec3 gradeOut(vec3 c){c*=uGr.x;c=uLift+c*uGain;float y=dot(c,LUM);c=max(mix(vec3(y),c,uGr.y),0.0);return enc(clamp(shoulder(c),0.0,1.0));}

void main(){
float halo=uMode.x>0.5?0.0:aC.w*uMode.z;
float pad=aK1.z+2.0*aK1.w+1.0+(halo>0.0?4.0*aM.x:0.0)+(aM.z>=0.0?6.0:0.0);
vec2 lo=aBox.xy-pad,hi=aBox.zw+pad;
int c=gl_VertexID;
vec2 q=vec2((c&1)==1?hi.x:lo.x,(c&2)==2?hi.y:lo.y);
gl_Position=aE.w<=0.0?vec4(2.0,2.0,2.0,1.0):vec4(q/uOut*2.0-1.0,0.0,1.0);
vK1=aK1;
vec3 P=aB.xyz;float t=length(P);vec3 rd=P/max(t,1e-3);
vec3 o,B0=vec3(0.0);float A0=1.0;
if(uMode.x>0.5)o=uInkF;
else{
if(uGr.w>0.0){B0=atmos(vec3(0.0),rd,t);A0=atmos(vec3(1.0),rd,t).g-B0.g;}
o=gradeOut(A0*aE.rgb*aM.y+B0);
}
vCol=vec4(o,aE.w);vAir=vec4(B0,A0);vL=aL;
vZ=vec4(dot(P,uCamF),aB.w,aM.x,halo);
vC=aC;vW=aM;
}