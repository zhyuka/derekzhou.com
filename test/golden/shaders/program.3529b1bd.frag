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

in vec3 vCol;in vec2 vQ;out vec4 oC;
void main(){float d=length(vQ)*3.0;oC=vec4(vCol*(exp(-d*d*1.6)+0.05*exp(-d*1.3)),0.0);}