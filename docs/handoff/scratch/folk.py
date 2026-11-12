import sys; sys.path.insert(0,'/home/user/bm/tools/monsters')
from meshkit import *
import meshkit
F='/home/user/bm/assets/game/folk'
class Folk(Model):
    def __init__(s,name):
        s.path=f'{F}/{name}.glb'; s.doc,s.buf=read_glb(s.path); doc,buf=s.doc,s.buf
        a=doc['meshes'][0]['primitives'][0]['attributes']
        w=acc(doc,buf,a['WEIGHTS_0']).astype(float)
        s.mesh=Mesh(acc(doc,buf,a['POSITION']),acc(doc,buf,a['NORMAL']),acc(doc,buf,a['TEXCOORD_0']),acc(doc,buf,a['JOINTS_0']),w/np.maximum(w.sum(1,keepdims=True),1e-9),acc(doc,buf,doc['meshes'][0]['primitives'][0]['indices']).ravel())
        s.joints=doc['skins'][0]['joints']; s.names=[doc['nodes'][j].get('name','') for j in s.joints]
        s.ibm=acc(doc,buf,doc['skins'][0]['inverseBindMatrices']).astype(float).reshape(-1,4,4).transpose(0,2,1)
        s.albedo=Image.open(f'{F}/{name}_c.webp').convert('RGB')
if __name__=='__main__':
    pics=[]
    for n in ['dude','worker','worker_2','wes','smith','old_man','elder','lord_blue','young_1','young_3']:
        m=Folk(n); P,N=m.posed()
        if n=='dude': print(m.names); print(np.abs(P-m.mesh.P).max(), m.albedo.size)
        hd=[x for x in m.names if 'head' in x.lower()]
        h=m.rest_world(hd[0].split(':')[-1]) if hd else P.max(0)
        top=P[:,1].max()
        pics+=[draw(P,N,m.mesh,m.albedo,yaw=y,size=(260,260),centre=[0,top-0.13,0],span=0.42,light=1.6) for y in (0,60)]
        print(n,hd,top,h)
    sheet(pics,10).save('folk.png')
