import sys; sys.path.insert(0,'/home/user/bm/tools/monsters')
from meshkit import *
from possessed_knights import *
from meshkit import _raster
K=Model(f'{TRIPO}/velscour_lancer.glb'); P,N=K.posed(); hw=K.weight_of('Head'); nw=K.weight_of('Neck')
s=(P[:,1]>0.858)&(abs(P[:,0])<0.06)&(P[:,2]>-0.05)&(P[:,2]<0.13)&(hw<0.5)
print('above', s.sum()); 
names=[n.split(':')[-1] for n in K.names]
for i in np.where(s)[0][:400:20]: print(P[i].round(3), [(names[j],round(w,2)) for j,w in zip(K.mesh.J[i],K.mesh.W[i]) if w>0.01])
D=Model(f'{TRIPO}/possessed_woman_2.glb')
top,_=clip(D.mesh,0.5-D.weight_of('Head','Neck')); Pt,Nt=D.posed(top)
tex=D.albedo; size=1024
S=top.UV*size
zb, fid, bary = np.full((size, size), -1e9), np.full((size, size), -1, np.int64), np.zeros((size, size, 2))
_raster(S, np.zeros(len(S)), top.F, size, size, zb, fid, bary)
a=np.asarray(tex,np.float64)/255
hot = (fid >= 0) & (a[..., 0] > 0.8) & (a[..., 2] > 0.75) & (a.min(2) > 0.45)
f=top.F[fid[hot]]; pts=Pt[f].mean(1)
print(len(pts)); 
import collections
print(np.histogram(pts[:,1],10)); print(np.histogram(pts[:,0],10)); print(D.rest_world('Head'))
col=a[hot]; print(col.mean(0))
# saturation-based: magenta
sat=(a.max(2)-a.min(2))
hot2=(fid>=0)&(a[...,0]>0.75)&(a[...,2]>0.6)&(a[...,1]<a[...,2]-0.12)
pts2=Pt[top.F[fid[hot2]]].mean(1); print(len(pts2), np.histogram(pts2[:,1],10))
h=D.rest_world('Head')
pics=[draw(Pt,Nt,top,D.albedo,yaw=y,size=(340,340),centre=h+[0,0.05,0],span=0.34,light=2.2) for y in (0,50)]
body,rim=clip(K.mesh,np.maximum(hw-0.5,np.where(hw>0.08,P[:,1]-0.858,-1)))
Pb,Nb=K.posed(body); kh=K.rest_world('Head')
pics+=[draw(Pb,Nb,body,K.albedo,yaw=y,size=(340,340),centre=kh+[0,0.05,0],span=0.34,light=2.2) for y in (0,50)]
sheet(pics).save('dbg.png')
print(np.histogram(pts2[:,0],10))
