# Recoloured copies of the townsfolk's colour maps for the people posted out in the land: clothes and hair moved in hue,
# saturation and value; skin (by its colour) left as it is.
import sys, colorsys, numpy as np
from PIL import Image
D='/home/user/bm/assets/game/folk/'
# id: (base, hue shift (turns), sat scale, val scale, grey-hair amount)
S={
 'dorcas': ('wife_jolly', 0.52, 0.75, 0.85, 0.5),
 'osric': ('worker', 0.22, 0.7, 0.8, 0.0),
 'wymond': ('old_man', 0.08, 0.35, 1.25, 0.0),
 'hasket': ('worker_f', 0.03, 0.5, 0.68, 0.0),
 'colm': ('elder', 0.0, 0.3, 0.55, 0.0),
 'ysolt': ('young_4', 0.0, 0.25, 0.8, 0.0),
 'garrick': ('wes', 0.55, 0.6, 0.9, 0.6),
}
def rgb2hsv(a):
    r,g,b=a[...,0],a[...,1],a[...,2]; mx=a.max(-1); mn=a.min(-1); d=mx-mn
    h=np.zeros_like(mx); m=d>1e-6
    rc=np.where(m,(mx-r)/np.where(m,d,1),0); gc=np.where(m,(mx-g)/np.where(m,d,1),0); bc=np.where(m,(mx-b)/np.where(m,d,1),0)
    h=np.where(mx==r,bc-gc,np.where(mx==g,2+rc-bc,4+gc-rc)); h=(h/6)%1; h=np.where(m,h,0)
    s=np.where(mx>1e-6,d/np.where(mx>1e-6,mx,1),0)
    return h,s,mx
def hsv2rgb(h,s,v):
    i=np.floor(h*6).astype(int)%6; f=h*6-np.floor(h*6); p=v*(1-s); q=v*(1-f*s); t=v*(1-(1-f)*s)
    r=np.choose(i,[v,q,p,p,t,v]); g=np.choose(i,[t,v,v,q,p,p]); b=np.choose(i,[p,p,t,v,v,q])
    return np.stack([r,g,b],-1)
for k,(base,dh,ss,vs,grey) in S.items():
    if len(sys.argv)>1 and k not in sys.argv[1:]: continue
    im=Image.open(D+base+'_c.webp').convert('RGB'); a=np.asarray(im).astype(np.float32)/255
    h,s,v=rgb2hsv(a)
    # skin: orange-pink hue, middling saturation, light
    hd=np.minimum(np.abs(h-0.055),1-np.abs(h-0.055))
    skin=np.clip(1-hd/0.045,0,1)*np.clip((s-0.16)/0.1,0,1)*np.clip((0.62-s)/0.1,0,1)*np.clip((v-0.42)/0.12,0,1)
    from scipy import ndimage as ndi
    skin=ndi.gaussian_filter(skin,2.0)
    skin=np.clip(skin*1.6,0,1)
    out=hsv2rgb((h+dh)%1,np.clip(s*ss,0,1),np.clip(v*vs,0,1))
    res=out*(1-skin[...,None])+a*skin[...,None]
    Image.fromarray((np.clip(res,0,1)*255).astype(np.uint8)).save(D+k+'_c.webp',quality=90,method=4)
    Image.fromarray((np.concatenate([a,res,np.repeat(skin[...,None],3,-1)],1)*255).astype(np.uint8)).resize((1536,512)).save(f'/tmp/claude-0/-home-user-bm/664887af-c493-5b19-b8c9-ef77fa41ff0d/scratchpad/pm/{k}.jpg')
    print(k,im.size)
