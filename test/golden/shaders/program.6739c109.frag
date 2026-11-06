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

float linFetch(sampler2D s,ivec2 q){
#ifdef LIND_PACKED
return dot(texelFetch(s,q,0),vec4(1.0,1.0/255.0,1.0/65025.0,1.0/16581375.0))*65536.0;
#else
return texelFetch(s,q,0).r;
#endif
}

uniform sampler2D uCloud,uHist,uLinD;uniform vec4 uCA;
uniform mat3 uRM;
uniform vec2 uHS;
out vec4 oC;
vec4 histCR(vec2 hp){
vec2 t1=floor(hp-0.5)+0.5,f=hp-t1,lo=vec2(0.5),hi=uCA.zw-0.5;
vec2 w0=f*(-0.5+f*(1.0-0.5*f)),w1=1.0+f*f*(-2.5+1.5*f),w2=f*(0.5+f*(2.0-1.5*f)),w3=f*f*(-0.5+0.5*f);
vec2 w12=w1+w2,t0=clamp(t1-1.0,lo,hi)/uHS,t3=clamp(t1+2.0,lo,hi)/uHS,t12=clamp(t1+w2/w12,lo,hi)/uHS;
vec4 r=texture(uHist,vec2(t12.x,t0.y))*(w12.x*w0.y)+texture(uHist,vec2(t0.x,t12.y))*(w0.x*w12.y)+texture(uHist,t12)*(w12.x*w12.y)
+texture(uHist,vec2(t3.x,t12.y))*(w3.x*w12.y)+texture(uHist,vec2(t12.x,t3.y))*(w12.x*w3.y);
return r/(w12.x*w0.y+w0.x*w12.y+w12.x*w12.y+w3.x*w12.y+w12.x*w3.y);
}
void main(){
ivec2 p=ivec2(gl_FragCoord.xy),mx=ivec2(uCA.zw)-1;
vec4 c=texelFetch(uCloud,p,0),lo=c,hi=c;
float z0=min(linFetch(uLinD,p),8000.0);
for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){
if(i==0&&j==0)continue;
ivec2 pq=clamp(p+ivec2(i,j),ivec2(0),mx);
if(min(linFetch(uLinD,pq),8000.0)>2.0*max(z0,1.0))continue;
vec4 q=texelFetch(uCloud,pq,0);lo=min(lo,q);hi=max(hi,q);
}
vec3 r=uRM*vec3(gl_FragCoord.xy/uCA.zw*2.0-1.0,1.0);
vec4 h=c;float w=uCA.x;
if(r.z>1e-4){
vec2 hp=(r.xy/r.z*0.5+0.5)*uCA.zw;
if(hp.x<0.5||hp.y<0.5||hp.x>uCA.z-0.5||hp.y>uCA.w-0.5)w=1.0;
else h=histCR(hp);
}else w=1.0;
oC=mix(clamp(h,lo,hi),c,w);
}