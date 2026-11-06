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

layout(location=0)in vec3 aV;layout(location=1)in vec4 aO;
void main(){gl_Position=uVP*vec4(aO.xyz+aV*aO.w-uCam,1.0);}