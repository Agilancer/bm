import sys; sys.path.insert(0,'/home/user/bm/tools/monsters')
from meshkit import *
pics=[]
for n,cy in [('velscour_knight_1',0.0),('velscour_knight_2',0.0),('velscour_lancer',0.0)]:
    m=Model(f'{TRIPO}/{n}.glb'); me=m.mesh
    P,N=m.posed(); hw=m.weight_of('Head'); nw=m.weight_of('Neck')
    h=m.rest_world('Head'); nk=m.rest_world('Neck')
    # weights profile by height near the head
    for y in np.arange(nk[1]-0.04,h[1]+0.06,0.01):
        s=(abs(P[:,1]-y)<0.005)&(abs(P[:,0])<0.08)
        if s.any(): print(n,f'y={y:.3f} n={s.sum():4d} head={hw[s].mean():.2f} neck={nw[s].mean():.2f} rx={abs(P[s][:,0]).max():.3f} z={P[s][:,2].min():.3f}..{P[s][:,2].max():.3f}')
    for thr in (0.5,):
        cutm,rim=clip(me,(hw+0.0*nw)-thr)
        P2,N2=m.posed(cutm)
        pics+=[draw(P2,N2,cutm,m.albedo,yaw=y,pitch=pt,size=(300,300),centre=h+[0,0.0,0],span=0.3,light=2.2) for y,pt in ((0,0),(60,20),(180,10))]
        print(n,'rim',P2[rim].min(0),P2[rim].max(0))
sheet(pics,3).save('cut.png')
