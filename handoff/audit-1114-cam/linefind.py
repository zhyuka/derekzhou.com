import numpy as np, sys
from PIL import Image
# find the bright thin line in each frame: difference from the median of neighbours (f-2,f+2 frames), lower half
D='vid/a30/'
def load(i): return np.asarray(Image.open(D+'f%03d.png'%i).convert('L'),dtype=np.float32)
res=[]
for i in range(4,276):
    a=load(i); b=load(i-3); c=load(i+3)
    d=a-np.maximum(b,c)
    H=a.shape[0]
    lo=d[H//3:]
    m=(lo>25)
    n=m.sum()
    if n>300:
        ys,xs=np.nonzero(m)
        # fit line y = p x + q
        p,q=np.polyfit(xs,ys+H//3,1)
        res.append((i,n,round(p,4),round(q,1),xs.min(),xs.max()))
for r in res: print(r)
