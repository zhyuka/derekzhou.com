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

uniform sampler3D uTex3;uniform vec3 uHalf,uDims,uScale,uSunL;uniform float uLayer,uSigma,uSD,uVox;
uniform vec2 uYawCS;
out vec4 oC;
float dens(vec3 u){if(any(lessThan(u,vec3(0.0)))||any(greaterThan(u,vec3(1.0))))return 0.0;return clamp((texture(uTex3,u*uScale).r-0.5)*uSD,0.0,1.0);}
void main(){
vec3 uvw=vec3(gl_FragCoord.xy,uLayer+0.5)/uDims;
float d0=texture(uTex3,uvw*uScale).r;
vec3 q=uvw;float tl=0.0,ds=uVox*0.6;
for(int i=0;i<18;i++){q+=uSunL*(ds/(2.0*uHalf));tl+=dens(q)*ds;ds*=1.22;}
tl*=uSigma;
float ta=0.0;
for(int k=0;k<3;k++){
vec3 dw=k==0?vec3(0.0,1.0,0.0):(k==1?vec3(0.62,0.78,0.0):vec3(-0.44,0.78,0.44));
vec3 dir=vec3(uYawCS.x*dw.x-uYawCS.y*dw.z,dw.y,uYawCS.y*dw.x+uYawCS.x*dw.z);
vec3 r=uvw;float s=0.0;ds=uVox*0.6;
for(int i=0;i<10;i++){r+=dir*(ds/(2.0*uHalf));s+=dens(r)*ds;ds*=1.35;}
ta+=s*uSigma/3.0;
}
oC=vec4(d0,clamp(tl/24.0,0.0,1.0),clamp(ta/12.0,0.0,1.0),texture(uTex3,uvw*uScale).g);
}