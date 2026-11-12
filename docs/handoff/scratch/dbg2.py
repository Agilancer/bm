import sys; sys.path.insert(0,'/home/user/bm/tools/monsters')
from meshkit import *
M=Model(f'{TRIPO}/possessed_knight_3.glb'); K=Model(f'{TRIPO}/velscour_lancer.glb')
P,N=M.posed(); kh=K.rest_world('Head')
nb=len(P)-0
# faces that are black-textured and near the face
T=np.asarray(M.albedo); uvc=M.mesh.UV[M.mesh.F].mean(1); px=T[np.clip((uvc[:,1]*4096).astype(int),0,4095),np.clip((uvc[:,0]*4096).astype(int),0,4095)]
c=P[M.mesh.F].mean(1)
s=(px.sum(1)<12)&(np.linalg.norm(c-kh-[0,0.04,0.03],axis=1)<0.06)
print(s.sum()); 
names=[n.split(':')[-1] for n in M.names]
for f in np.where(s)[0][:12]:
    print(f, len(M.mesh.F), c[f].round(3), uvc[f].round(4), M.mesh.UV[M.mesh.F[f]].round(4).tolist(), [(names[j],round(w,2)) for j,w in zip(M.mesh.J[M.mesh.F[f][0]],M.mesh.W[M.mesh.F[f][0]]) if w>0])
hj=M.joint('Head')
isnew=(M.mesh.J[:,0]==hj)&(M.mesh.W[:,0]>0.999)
a=M.mesh.verts_where(isnew); b=M.mesh.verts_where(~isnew)
pics=[]
for part in (a,b):
    Pp,Np=M.posed(part)
    pics+=[draw(Pp,Np,part,M.albedo,yaw=y,size=(340,340),centre=kh+[0,0.05,0],span=0.34,light=2.2) for y in (0,50)]
sheet(pics).save('dbg.png')
