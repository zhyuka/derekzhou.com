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

const vec3 LUM=vec3(0.2126,0.7152,0.0722);
uniform sampler2D uDepth,uCloud,uHz,uBloom;
uniform highp sampler2D uPts;
uniform vec2 uOut;
uniform vec4 uSc;
uniform vec2 uCl;
uniform vec3 uLand;
uniform vec4 uBl;
uniform vec4 uGl;
uniform vec4 uMode;
uniform vec4 uGr;uniform vec3 uLift,uGain;
flat in vec4 vK1,vCol,vZ,vC,vW,vAir,vL;
out vec4 oC;
const ivec4 TRI0[58] = ivec4[58](ivec4(0, 4, 5, 1792), ivec4(0, 5, 1, 1792), ivec4(1, 5, 6, 1793), ivec4(1, 6, 2, 1793), ivec4(2, 6, 7, 1794), ivec4(2, 7, 3, 1794), ivec4(3, 7, 4, 1795), ivec4(3, 4, 0, 1795), ivec4(4, 8, 9, 1796), ivec4(4, 9, 5, 1796), ivec4(5, 9, 10, 1797), ivec4(5, 10, 6, 1797), ivec4(6, 10, 11, 1798), ivec4(6, 11, 7, 1798), ivec4(7, 11, 8, 1799), ivec4(7, 8, 4, 1799), ivec4(8, 10, 9, 1800), ivec4(8, 11, 10, 1800), ivec4(8, 30, 31, 1545), ivec4(8, 31, 12, 777), ivec4(30, 16, 14, 1034), ivec4(30, 14, 31, 1802), ivec4(12, 31, 32, 1803), ivec4(12, 32, 13, 779), ivec4(31, 14, 15, 1292), ivec4(31, 15, 32, 1804), ivec4(13, 32, 33, 1805), ivec4(13, 33, 10, 269), ivec4(32, 15, 33, 1294), ivec4(0, 18, 17, 1807), ivec4(0, 1, 18, 1807), ivec4(1, 19, 18, 1808), ivec4(1, 2, 19, 1808), ivec4(2, 20, 19, 1809), ivec4(2, 3, 20, 1809), ivec4(3, 17, 20, 1810), ivec4(3, 0, 17, 1810), ivec4(17, 22, 21, 1811), ivec4(17, 18, 22, 1811), ivec4(18, 23, 22, 1812), ivec4(18, 19, 23, 1812), ivec4(19, 24, 23, 1813), ivec4(19, 20, 24, 1813), ivec4(20, 21, 24, 1814), ivec4(20, 17, 21, 1814), ivec4(21, 22, 23, 1815), ivec4(21, 23, 24, 1815), ivec4(21, 39, 38, 792), ivec4(21, 25, 39, 1560), ivec4(38, 27, 29, 281), ivec4(38, 39, 27, 1817), ivec4(25, 40, 39, 1818), ivec4(25, 26, 40, 1562), ivec4(39, 28, 27, 1307), ivec4(39, 40, 28, 1819), ivec4(26, 41, 40, 1820), ivec4(26, 23, 41, 1052), ivec4(40, 41, 28, 1309));
const ivec4 TRI1[58] = ivec4[58](ivec4(0, 4, 5, 1792), ivec4(0, 5, 1, 1792), ivec4(1, 5, 6, 1793), ivec4(1, 6, 2, 1793), ivec4(2, 6, 7, 1794), ivec4(2, 7, 3, 1794), ivec4(3, 7, 4, 1795), ivec4(3, 4, 0, 1795), ivec4(4, 8, 9, 1796), ivec4(4, 9, 5, 1796), ivec4(5, 9, 10, 1797), ivec4(5, 10, 6, 1797), ivec4(6, 10, 11, 1798), ivec4(6, 11, 7, 1798), ivec4(7, 11, 8, 1799), ivec4(7, 8, 4, 1799), ivec4(8, 10, 9, 1800), ivec4(8, 11, 10, 1800), ivec4(8, 30, 31, 1033), ivec4(8, 31, 12, 777), ivec4(30, 16, 34, 1034), ivec4(30, 34, 36, 266), ivec4(12, 31, 32, 1291), ivec4(12, 32, 13, 779), ivec4(31, 14, 35, 1036), ivec4(31, 35, 37, 268), ivec4(13, 32, 33, 1805), ivec4(13, 33, 10, 269), ivec4(32, 15, 33, 1038), ivec4(0, 18, 17, 1807), ivec4(0, 1, 18, 1807), ivec4(1, 19, 18, 1808), ivec4(1, 2, 19, 1808), ivec4(2, 20, 19, 1809), ivec4(2, 3, 20, 1809), ivec4(3, 17, 20, 1810), ivec4(3, 0, 17, 1810), ivec4(17, 22, 21, 1811), ivec4(17, 18, 22, 1811), ivec4(18, 23, 22, 1812), ivec4(18, 19, 23, 1812), ivec4(19, 24, 23, 1813), ivec4(19, 20, 24, 1813), ivec4(20, 21, 24, 1814), ivec4(20, 17, 21, 1814), ivec4(21, 22, 23, 1815), ivec4(21, 23, 24, 1815), ivec4(21, 39, 38, 280), ivec4(21, 25, 39, 1560), ivec4(38, 42, 29, 281), ivec4(38, 44, 42, 1049), ivec4(25, 40, 39, 1306), ivec4(25, 26, 40, 1562), ivec4(39, 43, 27, 283), ivec4(39, 45, 43, 1051), ivec4(26, 41, 40, 1820), ivec4(26, 23, 41, 1052), ivec4(40, 41, 28, 285));
const ivec2 BE0[18] = ivec2[18](ivec2(8, 30), ivec2(8, 12), ivec2(16, 30), ivec2(14, 16), ivec2(12, 13), ivec2(14, 15), ivec2(10, 33), ivec2(10, 13), ivec2(15, 33), ivec2(21, 38), ivec2(21, 25), ivec2(27, 29), ivec2(29, 38), ivec2(25, 26), ivec2(27, 28), ivec2(23, 26), ivec2(23, 41), ivec2(28, 41));
const ivec2 BE1[34] = ivec2[34](ivec2(8, 30), ivec2(30, 31), ivec2(8, 12), ivec2(16, 30), ivec2(16, 34), ivec2(34, 36), ivec2(30, 36), ivec2(31, 32), ivec2(12, 13), ivec2(14, 31), ivec2(14, 35), ivec2(35, 37), ivec2(31, 37), ivec2(10, 33), ivec2(10, 13), ivec2(15, 32), ivec2(15, 33), ivec2(38, 39), ivec2(21, 38), ivec2(21, 25), ivec2(29, 42), ivec2(29, 38), ivec2(38, 44), ivec2(42, 44), ivec2(39, 40), ivec2(25, 26), ivec2(27, 43), ivec2(27, 39), ivec2(39, 45), ivec2(43, 45), ivec2(23, 26), ivec2(23, 41), ivec2(28, 41), ivec2(28, 40));
const int NBE0 = 18, NBE1 = 34, NTRI = 58;
const int CH[7] = int[7](16, 8, 4, 0, 17, 21, 29);

vec3 shoulder(vec3 c){float m=max(c.r,max(c.g,c.b));const float K=0.78;if(m<=K)return c;
float mm=K+(1.0-K)*(1.0-exp(-(m-K)/(1.0-K)));vec3 h=c*(mm/m);float over=clamp((m-1.0)/3.0,0.0,1.0);return mix(h,vec3(mm),over*0.75);}
vec3 enc(vec3 c){return mix(c*12.92,1.055*pow(c,vec3(1.0/2.4))-0.055,step(0.0031308,c));}
vec3 gradeOut(vec3 c){c*=uGr.x;c=uLift+c*uGain;float y=dot(c,LUM);c=max(mix(vec3(y),c,uGr.y),0.0);return enc(clamp(shoulder(c),0.0,1.0));}

float ed(vec2 q,vec2 a,vec2 b){vec2 e=b-a;float l=length(e);return l<1e-5?-1e4:dot(q-a,vec2(e.y,-e.x))/l;}
float sdSeg(vec2 q,vec2 a,vec2 b){vec2 pa=q-a,ba=b-a;float h=clamp(dot(pa,ba)/max(dot(ba,ba),1e-9),0.0,1.0);return length(pa-ba*h);}
float linZ(float d){return d>=1.0?6.0e4:2.0*uProj.z*uProj.w/(uProj.w+uProj.z-(d*2.0-1.0)*(uProj.w-uProj.z));}
void main(){
vec2 q=gl_FragCoord.xy,uv=q/uOut;
int row=int(vK1.x+0.5);bool sl=vK1.y>0.5;
vec3 p[46];
for(int i=0;i<46;i++)p[i]=texelFetch(uPts,ivec2(i,row),0).xyz;
float g=0.0;
if(uBl.w>0.5)g=smoothstep(uGl.x,uGl.y,dot(texture(uBloom,uv*uBl.xy).rgb,LUM)*uBl.z);
float w=max(vK1.w*uLand.z,0.5),cov=0.0,fz=-1.0;
int ff=-1,fc=-1;
for(int i=0;i<NTRI;i++){
ivec4 T=sl?TRI1[i]:TRI0[i];
vec2 a=p[T.x].xy,b=p[T.y].xy,c=p[T.z].xy;
float ar=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
if(abs(ar)<1e-4)continue;
vec2 lo3=min(a,min(b,c))-w,hi3=max(a,max(b,c))+w;
if(q.x<lo3.x||q.y<lo3.y||q.x>hi3.x||q.y>hi3.y)continue;
float sg=ar>0.0?1.0:-1.0,d[3];
d[0]=sg*ed(q,a,b);d[1]=sg*ed(q,b,c);d[2]=sg*ed(q,c,a);
float s=0.0,n=0.0,hard=1.0;int inn=T.w>>8;
for(int k=0;k<3;k++){
if(((inn>>k)&1)==1)hard*=d[k]<=1e-3?1.0:0.0;
else{s+=clamp(0.5-(d[k]+uGl.z*g)/w,0.0,1.0);n+=1.0;}
}
float ci=(n>0.0?clamp(s-(n-1.0),0.0,1.0):1.0)*hard;
if(ci<=0.0)continue;
float la=clamp(((b.x-q.x)*(c.y-q.y)-(b.y-q.y)*(c.x-q.x))/ar,0.0,1.0),lb=clamp(((c.x-q.x)*(a.y-q.y)-(c.y-q.y)*(a.x-q.x))/ar,0.0,1.0),lc=max(0.0,1.0-la-lb);
float iz=la*p[T.x].z+lb*p[T.y].z+lc*p[T.z].z;
if(ci>=0.5&&iz>fz){fz=iz;ff=T.w&255;}
if(ci>cov){cov=ci;fc=T.w&255;}
}
int facet=ff>=0?ff:fc;
float hw=0.5*vK1.z*(1.0-uGl.z*g);
float ds=1e9;
for(int i=0;i<6;i++)ds=min(ds,sdSeg(q,p[CH[i]].xy,p[CH[i+1]].xy));
float gfill=1.0;
if(vW.z>=0.0&&uMode.x<0.5){
float gE=vW.z,wr=clamp(gE/0.7,0.0,1.0);gfill=clamp((gE-0.7)/0.3,0.0,1.0);
float Lt=0.0;for(int i=0;i<6;i++)Lt+=length(p[CH[i+1]].xy-p[CH[i]].xy);
float acc=0.0,best=1e9,tq=0.0;
for(int i=0;i<6;i++){
vec2 a=p[CH[i]].xy,ba=p[CH[i+1]].xy-a;float sl2=length(ba),h=clamp(dot(q-a,ba)/max(dot(ba,ba),1e-9),0.0,1.0),dd=length(q-a-ba*h);
if(dd<best){best=dd;tq=acc+h*sl2;}
acc+=sl2;
}
if(vW.w<0.0)tq=Lt-tq;
float head=wr*Lt,written=clamp((head-tq)/w+0.5,0.0,1.0);
float lh=max(hw,0.7*w),cl=(clamp(0.5+(lh-best)/w,0.0,1.0)+clamp(0.5+(lh+best)/w,0.0,1.0)-1.0)*written;
float cpaper=cov*gfill;
cov=max(cpaper,cl);if(cl>cpaper)facet=-1;
}else if(hw>0.0){
float cs=clamp(0.5+(hw-ds)/w,0.0,1.0)+clamp(0.5+(hw+ds)/w,0.0,1.0)-1.0;
if(cs>cov){cov=cs;facet=-1;}
}
float halo=0.0;
if(vZ.w>0.0&&cov<1.0){
float dt=1e9;
if(sl){for(int i=0;i<NBE1;i++)dt=min(dt,sdSeg(q,p[BE1[i].x].xy,p[BE1[i].y].xy));}
else{for(int i=0;i<NBE0;i++)dt=min(dt,sdSeg(q,p[BE0[i].x].xy,p[BE0[i].y].xy));}
float e=max(vZ.z,0.5),dd=max(min(dt,ds)-hw,0.0);
halo=vZ.w*exp(-dd/e)*(1.0-smoothstep(2.5*e,4.0*e,dd))*(1.0-cov);
if(vW.z>=0.0)halo*=max(gfill,0.5*clamp(vW.z/0.7,0.0,1.0));
}
if(cov<=0.0&&halo<1.0/512.0)discard;
float vis=1.0;
if(uLand.x>0.5){
ivec2 dsz=textureSize(uDepth,0);vec2 dp=uv*uSc.xy*vec2(dsz)-0.5,f=fract(dp);ivec2 d0=ivec2(floor(dp));
float v00=smoothstep(-vZ.y,0.0,linZ(texelFetch(uDepth,clamp(d0,ivec2(0),dsz-1),0).r)-vZ.x+0.5*vZ.y);
float v10=smoothstep(-vZ.y,0.0,linZ(texelFetch(uDepth,clamp(d0+ivec2(1,0),ivec2(0),dsz-1),0).r)-vZ.x+0.5*vZ.y);
float v01=smoothstep(-vZ.y,0.0,linZ(texelFetch(uDepth,clamp(d0+ivec2(0,1),ivec2(0),dsz-1),0).r)-vZ.x+0.5*vZ.y);
float v11=smoothstep(-vZ.y,0.0,linZ(texelFetch(uDepth,clamp(d0+ivec2(1,1),ivec2(0),dsz-1),0).r)-vZ.x+0.5*vZ.y);
vis=mix(mix(v00,v10,f.x),mix(v01,v11,f.x),f.y);
}
if(uLand.y>0.5){
float ca=texture(uCloud,min(uv*uSc.zw,uCl)).a;
if(ca>0.002){
ivec2 hsz=textureSize(uHz,0),hp=clamp(ivec2(uv*uSc.zw*vec2(hsz)),ivec2(0),hsz-1);
float zh=linZ(texelFetch(uHz,hp,0).r);
ivec2 dsz2=textureSize(uDepth,0);
float zl=linZ(texelFetch(uDepth,clamp(ivec2(uv*uSc.xy*vec2(dsz2)),ivec2(0),dsz2-1),0).r);
vec2 t0=p[CH[0]].xy,ax=p[CH[6]].xy-t0;float sAlong=clamp(dot(q-t0,ax)/max(dot(ax,ax),1e-6),0.0,1.0);
float wl=sAlong<0.5?mix(vC.x,vC.y,sAlong*2.0):mix(vC.y,vC.z,sAlong*2.0-1.0);
float front=zh<zl-2.0?(zh<vZ.x-0.5*vZ.y?1.0:0.0):wl;
vis*=1.0-ca*front;
}
}
vec3 col=vCol.rgb;
if(uMode.x<0.5){
if(vL.x>0.0&&facet>=0){vec3 fe=texelFetch(uPts,ivec2(46+facet,row),0).rgb;col=mix(col,gradeOut(vAir.a*fe*vW.y+vAir.rgb),vL.x);}
col=max(col,vec3(uMode.y*vC.w));
col=mix(col,vec3(1.0),uGl.w*g);
}
float a=cov*vCol.w*vis;
vec3 hc=uMode.x>0.5?vec3(0.0):vec3(0.92,0.94,1.0)*halo*vCol.w*vis;
oC=vec4(col*a+hc,a);
}