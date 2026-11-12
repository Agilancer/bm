import sys; sys.path.insert(0,'/home/user/bm/tools/monsters')
from meshkit import *
H='/home/user/bm/assets/game/heroes'
names=['paladin_m1','paladin_m2','paladin_f1','paladin_f2','lancer_m1','lancer_m2','lancer_m3','lancer_m4','dragoon_m1','dragoon_m2','dragoon_m3','dragoon_m4']
pics=[]
for n in names:
    m=Model(f"{H}/{n}.glb"); P,N=m.mesh.P,m.mesh.N
    if n=='paladin_m1': print(np.abs(P-m.mesh.P).max(), m.albedo.size, P.min(0),P.max(0))
    pics+=[draw(P,N,m.mesh,m.albedo,yaw=y,size=(300,340),centre=[0,1.0,0],span=2.15,light=1.5) for y in (0,180)]
sheet(pics[:12],6).save('heroes_a.png'); sheet(pics[12:],6).save('heroes_b.png')
