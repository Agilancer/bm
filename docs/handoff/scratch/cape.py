import sys; sys.path.insert(0,'/home/user/bm/tools/monsters')
from meshkit import *
pics=[]
for n in ['velscour_knight_1','velscour_knight_2','velscour_lancer']:
    m=Model(f'{TRIPO}/{n}.glb'); P,N=m.posed(); me=m.mesh
    T=np.asarray(m.albedo,np.float64)/255
    c=T[np.clip((me.UV[:,1]*4096).astype(int),0,4095),np.clip((me.UV[:,0]*4096).astype(int),0,4095)]
    red=(c[:,0]>c[:,1]*1.5+0.03)&(c[:,0]>c[:,2]*1.5+0.03)
    cape=(P[:,2]<-0.06)|(red&(P[:,2]<0.0))
    cape&=np.abs(P[:,0])<0.2
    print(n,'cape verts',cape.sum(),'red',red.sum())
    jag=0.03*np.sin(P[:,0]*90)+0.02*np.sin(P[:,0]*37+1)
    cut,rim=clip(me,(0.52+jag)-P[:,1],only=cape)
    P2,N2=m.posed(cut)
    pics+=[draw(P2,N2,cut,m.albedo,yaw=y,size=(330,440),light=2.4) for y in (0,90,180,225)]
sheet(pics,4).save('cape.png')
