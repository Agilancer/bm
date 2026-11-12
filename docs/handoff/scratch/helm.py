import sys; sys.path.insert(0,'/home/user/bm/tools/monsters')
from meshkit import *
pics=[]
for n in ['velscour_knight_1','velscour_knight_2','velscour_lancer']:
    m=Model(f'{TRIPO}/{n}.glb'); P,N=m.posed(); hw=m.weight_of('Head'); h=m.rest_world('Head')
    s=hw>0.5; Q=P[s]-h
    print(n,'n',s.sum(),'h',h.round(3))
    for y in np.arange(-0.02,0.2,0.015):
        t=(Q[:,1]>=y)&(Q[:,1]<y+0.015)
        if t.sum()>3: print(f'   y={y:.3f} n={t.sum():4d} |x| p50={np.percentile(abs(Q[t][:,0]),50):.3f} p75={np.percentile(abs(Q[t][:,0]),75):.3f} p90={np.percentile(abs(Q[t][:,0]),90):.3f} max={abs(Q[t][:,0]).max():.3f} z={Q[t][:,2].min():.3f}..{Q[t][:,2].max():.3f}')
    pics+=[draw(P,N,m.mesh,m.albedo,yaw=y,pitch=p,size=(420,420),centre=h+[0,0.06,0],span=0.3,light=2.4) for y,p in ((0,0),(90,0),(0,89))]
sheet(pics,3).save('helms.png')
