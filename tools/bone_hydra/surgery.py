# Takes the Bone Hydra down to three heads. The fourth head (part 9), the gore hanging from it (14) and its stub (15) are
# separate shells and come straight off. That leaves a socket on the front of the right neck's base. It's closed with a piece
# of the same neck's sculpt, turned to face out of the socket and sunk in at its edge, so the patch has the model's own detail
# and texture. The left shoulder's red collar, mirrored, covers the join to the chest.
# Output: tools/bone_hydra/build/surgery.blend, one object per surviving part.
import bpy, bmesh, os
import numpy as np
from mathutils import Matrix, Vector
HERE=os.path.dirname(os.path.abspath(__file__));ROOT=os.path.dirname(os.path.dirname(HERE));W=os.path.join(HERE,'build')
os.makedirs(W,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'art','bone_hydra','bone_hydra_source.glb'))
P={int(o.name.split('_')[-1]):o for o in bpy.data.objects if o.type=='MESH'}
for o in P.values():
    mw=o.matrix_world.copy();o.parent=None;o.data.transform(mw);o.matrix_world=Matrix.Identity(4)
bpy.data.objects.remove(bpy.data.objects['ROOT'])
for i in (9,14,15):
    bpy.data.objects.remove(P.pop(i))

def surface(o):
    """Each vertex's position, normal, brightness and green-to-red ratio (bone is yellow, gore is red), from the texture."""
    me=o.data;V=np.array([list(v.co) for v in me.vertices]);Nn=np.array([list(v.normal) for v in me.vertices])
    img=next(n.image for n in me.materials[0].node_tree.nodes if n.type=='TEX_IMAGE');iw,ih=img.size;px=np.array(img.pixels[:],dtype=np.float32).reshape(ih,iw,4)
    uv=np.zeros(len(me.uv_layers[0].data)*2);me.uv_layers[0].data.foreach_get('uv',uv);uv=uv.reshape(-1,2)
    lv=np.zeros(len(me.loops),dtype=int);me.loops.foreach_get('vertex_index',lv)
    tc=px[np.clip((uv[:,1]*ih).astype(int),0,ih-1),np.clip((uv[:,0]*iw).astype(int),0,iw-1),:3]
    C=np.zeros((len(V),3));n=np.zeros(len(V));np.add.at(C,lv,tc);np.add.at(n,lv,1);C/=np.maximum(n,1)[:,None]
    return V,Nn,C.mean(1),C[:,1]/np.maximum(C[:,0],1e-4)

V3,N3,L3,GR=surface(P[3])
dark=(L3<.07)&(V3[:,0]>.1)&(V3[:,1]<-.28)&(V3[:,2]>.36)&(V3[:,2]<.56)
SOCKET=V3[dark].mean(0)
# what faces out of the socket: from the neck's middle, through the opening
mid=V3[(np.linalg.norm(V3-SOCKET,axis=1)<.13)].mean(0)
OUT=SOCKET-mid;OUT[2]*=.5;OUT/=np.linalg.norm(OUT)
print('socket',SOCKET.round(3),'faces',OUT.round(3),'dark verts',int(dark.sum()))
R0,R1=.06,.095
# the neck's own front face, just above the socket: it already looks the way the patch has to, and has the honeycomb around it
best=(-9,None)
for i in np.flatnonzero((V3[:,2]>.56)&(V3[:,2]<.66))[::10]:
    m=np.linalg.norm(V3-V3[i],axis=1)<.045
    if m.sum()<15 or (GR[m]<.22).mean()>.05 or N3[m].mean(0)@OUT<.35: continue
    score=float(V3[i]@OUT)
    if score>best[0]: best=(score,i)
SRC=V3[best[1]].copy();SN=N3[np.linalg.norm(V3-SRC,axis=1)<.045].mean(0);SN/=np.linalg.norm(SN)
print('source',SRC.round(3),'facing',SN.round(3),'score',round(best[0],3))
Q=Vector(SN).rotation_difference(Vector(OUT)).to_matrix()
ob=P[3].copy();ob.data=P[3].data.copy();ob.name='patch_cap';ob.data.name='patch_cap';bpy.context.scene.collection.objects.link(ob)
bm=bmesh.new();bm.from_mesh(ob.data)
d={v:np.linalg.norm(np.array(v.co)-SRC) for v in bm.verts}
bmesh.ops.delete(bm,geom=[f for f in bm.faces if max(d[v] for v in f.verts)>R1 or float(np.mean([np.array(v.co)-SRC for v in f.verts],axis=0)@SN)<-.035],context='FACES')  # the near side of the neck only
bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS')
for v in bm.verts:
    p=np.array(v.co)-SRC;t=np.clip((np.linalg.norm(p)-R0)/(R1-R0),0,1);t=t*t*(3-2*t)
    q=np.array(Q@Vector(p))*1.12
    v.co=tuple(SOCKET+OUT*(.05-.055*t)+q)
bm.normal_update();bm.to_mesh(ob.data);bm.free()
print('cap',len(ob.data.vertices))

# the collar: the left shoulder's red, mirrored across the patch's join to the chest
src=P[12];c=np.array((-.17,-.2,.46));r0,r1=.07,.12
ob=src.copy();ob.data=src.data.copy();ob.name='patch_collar';ob.data.name='patch_collar';bpy.context.scene.collection.objects.link(ob)
bm=bmesh.new();bm.from_mesh(ob.data)
d={v:np.linalg.norm(np.array(v.co)-c) for v in bm.verts}
bmesh.ops.delete(bm,geom=[f for f in bm.faces if max(d[v] for v in f.verts)>r1],context='FACES')
bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS')
for v in bm.verts: v.co=(-v.co.x,v.co.y,v.co.z)
bmesh.ops.reverse_faces(bm,faces=bm.faces)  # mirroring turned it inside out
bm.normal_update();bm.to_mesh(ob.data);bm.free()
print('collar',len(ob.data.vertices))

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(W,'surgery.blend'))
