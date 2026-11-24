uniform vec3 uOccOff;   // (physics: clouds/drift) an air cell's carry: its cores where the air has taken them
layout(location = 0) in vec3 aV; layout(location = 1) in vec4 aO;
void main() { gl_Position = uVP * vec4(eyeRel(aO.xyz + uOccOff + aV * aO.w), 1.0); }
