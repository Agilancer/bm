# The Gravehart's skeleton and weights, diffused across the welded surface. Output: tools/gravehart/build/rigged.blend
# The source is yawed off its own axis with its head turned, in mid-stride. It's squared up here, to face -Y on Z up;
# the clips straighten the head and even out the stance.
import bpy, os, math, colorsys
import numpy as np
from mathutils import Matrix
HERE=os.path.dirname(os.path.abspath(__file__));ROOT=os.path.dirname(os.path.dirname(HERE));W=os.path.join(HERE,'build')
for o in list(bpy.data.objects): bpy.data.objects.remove(o)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT,'art','gravehart','gravehart_source.glb'))
me=next(o for o in bpy.data.objects if o.type=='MESH' and 'tripo_node' in o.name)
mw=me.matrix_world.copy()
me.modifiers.clear();me.parent=None;me.data.transform(mw);me.matrix_world=Matrix.Identity(4)
me.data.transform(Matrix.Translation((.05742775648832321,0,0))@Matrix.Rotation(math.radians(332.35),4,'Z'))
me.vertex_groups.clear();me.name='gravehart_mesh';me.data.name='gravehart_mesh'
for o in list(bpy.data.objects):
    if o is not me: bpy.data.objects.remove(o)
V=np.array([list(v.co) for v in me.data.vertices]);N=len(V)

# Colour of each vertex, from the albedo: it tells antler from fur and rag where they cross in space.
mat=me.data.materials[0];bs=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
img=bs.inputs['Base Color'].links[0].from_node.image
iw,ih=img.size;px=np.array(img.pixels[:],dtype=np.float32).reshape(ih,iw,4)
uv=np.zeros(len(me.data.uv_layers[0].data)*2);me.data.uv_layers[0].data.foreach_get('uv',uv);uv=uv.reshape(-1,2)
lv=np.zeros(len(me.data.loops),dtype=int);me.data.loops.foreach_get('vertex_index',lv)
Cv=np.zeros((N,3));cn=np.zeros(N)
tc=px[np.clip((uv[:,1]*ih).astype(int),0,ih-1),np.clip((uv[:,0]*iw).astype(int),0,iw-1),:3]
np.add.at(Cv,lv,tc);np.add.at(cn,lv,1);Cv/=np.maximum(cn,1)[:,None]
mx=Cv.max(1);mn=Cv.min(1);sat=(mx-mn)/np.maximum(mx,1e-5)
hue=np.zeros(N);dl=np.maximum(mx-mn,1e-5);r,g,b=Cv.T
hue=np.where(mx==r,((g-b)/dl)%6,np.where(mx==g,(b-r)/dl+2,(r-g)/dl+4))*60
RED=(sat>.55)&((hue<22)|(hue>345))
GOLD=(sat>.42)&(hue>=22)&(hue<55)

# The model is one continuous surface once its UV-seam duplicates are welded.
_,wid=np.unique(np.round(V/1e-5).astype(np.int64),axis=0,return_inverse=True);wid=wid.ravel();NW=wid.max()+1
Eg=np.array([e.vertices[:] for e in me.data.edges]);Eg=wid[Eg];Eg=Eg[Eg[:,0]!=Eg[:,1]];Eg=np.unique(np.sort(Eg,axis=1),axis=0)
# ---------------- skeleton: name, head, tail, parent ----------------
BONES=[('root',(0,0,0),(0,-.15,0),None),('cog',(0,.06,.42),(0,.06,.54),'root'),
 ('pelvis',(0,.06,.42),(0,.27,.42),'cog'),
 ('spine_1',(0,.06,.42),(0,-.03,.44),'cog'),('spine_2',(0,-.03,.44),(0,-.12,.44),'spine_1'),('chest',(0,-.12,.44),(0,-.2,.44),'spine_2'),
 ('neck_1',(0,-.2,.44),(-.005,-.29,.46),'chest'),('neck_2',(-.005,-.29,.46),(-.015,-.36,.47),'neck_1'),
 ('head',(-.015,-.36,.47),(-.07,-.525,.41),'neck_2'),('jaw',(-.025,-.385,.395),(-.06,-.48,.32),'head'),
 ('ear_L',(-.115,-.42,.47),(-.155,-.40,.50),'head'),('ear_R',(.05,-.42,.49),(.115,-.40,.525),'head'),
 ('antler_L_1',(-.07,-.43,.52),(-.14,-.32,.63),'head'),('antler_L_2',(-.14,-.32,.63),(-.215,-.2,.79),'antler_L_1'),
 ('antler_R_1',(.02,-.46,.52),(.12,-.48,.63),'head'),('antler_R_2',(.12,-.48,.63),(.19,-.5,.79),'antler_R_1'),
 ('charm_L',(-.2,-.2,.64),(-.2,-.2,.46),'antler_L_1'),('charm_R',(.17,-.44,.58),(.17,-.44,.44),'antler_R_1'),
 ('tail_1',(0,.3,.47),(0,.38,.43),'pelvis'),('tail_2',(0,.38,.43),(0,.45,.37),'tail_1'),('tail_3',(0,.45,.37),(-.005,.51,.30),'tail_2'),
 ('tail_4',(-.005,.51,.30),(-.015,.56,.23),'tail_3'),('tail_5',(-.015,.56,.23),(-.03,.61,.16),'tail_4'),
]
LEG={'R_fore':[(.13,-.1,.53),(.135,-.14,.37),(.15,-.05,.235),(.185,-.205,.105),(.182,-.3,.05),(.19,-.375,.012)],
     'L_fore':[(-.13,-.08,.53),(-.135,-.11,.37),(-.135,-.01,.235),(-.155,-.155,.105),(-.165,-.245,.05),(-.2,-.32,.012)],
     'R_hind':[(.1,.22,.44),(.125,.17,.25),(.135,.36,.135),(.15,.345,.06),(.175,.26,.012)],
     'L_hind':[(-.1,.24,.44),(-.125,.2,.25),(-.135,.375,.135),(-.155,.36,.06),(-.185,.27,.012)]}
for k,p in LEG.items():
    if 'fore' in k:
        names=['scap','upper','fore','paw','toe'];par='chest'
    else:
        names=['thigh','shin','meta','toe'];par='pelvis'
        names=['thigh','shin','meta','paw'];par='pelvis'
    for i,n in enumerate(names):
        BONES.append((f'{k}_{n}',p[i],p[i+1],par if i==0 else f'{k}_{names[i-1]}'))
RAG=[]
for s,sg in (('L',-1),('R',1)):
    for z,y,z0,z1,par in (('f',-.14,.33,.14,'chest'),('m',.06,.31,.12,'spine_1'),('r',.26,.46,.2,'pelvis')):
        mid=(z0+z1)/2;x=sg*.12
        BONES.append((f'rag_{s}{z}_1',(x,y,z0),(x,y,mid),par));BONES.append((f'rag_{s}{z}_2',(x,y,mid),(x,y,z1),f'rag_{s}{z}_1'))
        RAG.append((f'rag_{s}{z}',sg,y,z0,z1))
    BONES.append((f'skulls_{s}',(sg*.13,.12,.53),(sg*.13,.13,.37),'pelvis'))
BONES.append(('skull_sh',(-.2,-.2,.53),(-.2,-.2,.36),'chest'))

arm_d=bpy.data.armatures.new('gravehart_rig');arm=bpy.data.objects.new('gravehart_rig',arm_d)
bpy.context.scene.collection.objects.link(arm);bpy.context.view_layer.objects.active=arm
bpy.ops.object.mode_set(mode='EDIT')
E=arm_d.edit_bones
for n,h,t,p in BONES:
    b=E.new(n);b.head=tuple(float(x) for x in h);b.tail=tuple(float(x) for x in t);b.use_deform=True
    if p: b.parent=E[p]
bpy.ops.object.mode_set(mode='OBJECT')
Bd={n:(np.array(h,float),np.array(t,float)) for n,h,t,_ in BONES}

# ---------------- weights ----------------
def segd(P,a,b):
    ab=b-a;t=np.clip(((P-a)@ab)/(ab@ab),0,1)
    return np.linalg.norm(P-(a+t[:,None]*ab),axis=1)
def sstep(e0,e1,x):
    t=np.clip((x-e0)/(e1-e0),0,1);return t*t*(3-2*t)
bones=[b[0] for b in BONES if b[0]!='root'];idx={n:i for i,n in enumerate(bones)}
RAD={'cog':.17,'pelvis':.17,'spine_1':.18,'spine_2':.19,'chest':.19,'neck_1':.14,'neck_2':.12,'head':.07,'tail_1':.1,'tail_2':.09,'tail_3':.08,'tail_4':.07,'tail_5':.05}
for k in LEG:
    if 'fore' in k: RAD.update({k+'_scap':.09,k+'_upper':.08,k+'_fore':.06,k+'_paw':.05,k+'_toe':.04})
    else: RAD.update({k+'_thigh':.1,k+'_shin':.07,k+'_meta':.055,k+'_paw':.05})
soft=[n for n in RAD]
Wt=np.zeros((N,len(bones)))
ds=np.array([segd(V,*Bd[n])/RAD[n] for n in soft]);w=1/(ds+.12)**6;w/=w.sum(0)
for i,n in enumerate(soft): Wt[:,idx[n]]=w[i]
def only(mask,weights):
    # Replaces the weights of these vertices. weights: {bone: array or number}
    Wt[mask]=0
    for n,x in weights.items(): Wt[mask,idx[n]]=(x[mask] if isinstance(x,np.ndarray) else x)
# jaw: everything under the slanted mouth line, near the skull
hd=segd(V,*Bd['head'])
zl=.40+(V[:,1]+.40)*1.667
JAW=(V[:,1]<-.375)&(V[:,2]<zl)&(V[:,2]>.22)&(np.abs(V[:,0]+.04)<.105)
only(JAW,{'jaw':1.})
HEADZ=(hd<.085)&(~JAW)&(V[:,1]<-.37)
only(HEADZ,{'head':1.})
# antlers: the gold that's connected to their bases over the surface, whatever it passes near in space
dant=np.min([segd(V,*Bd[n]) for n in ('antler_L_1','antler_L_2','antler_R_1','antler_R_2')],axis=0)
CHD={n:segd(V,*Bd[n]) for n in ('charm_L','charm_R')}
CHR=(sat>.4)&((hue<18)|(hue>345))&(V[:,2]<.68)
CHV=(CHR&(np.minimum(CHD['charm_L'],CHD['charm_R'])<.11))|((CHD['charm_L']<.05)&(V[:,2]<.6))|((CHD['charm_R']<.05)&(V[:,2]<.545))
MANE=(np.abs(V[:,0])<.1)&(V[:,1]>-.31)&(V[:,1]<-.1)&(V[:,2]<.67)
GW=np.zeros(NW,bool);np.logical_or.at(GW,wid,(sat>.3)&(hue>=12)&(hue<60)&(dant<.24)&((V[:,2]>.53)|(V[:,1]<-.38))&(V[:,2]>.47)&(~CHV)&(~MANE))
SKS=GOLD&(np.linalg.norm(V-np.array((-.2,-.2,.45)),axis=1)<.085)
GW[wid[SKS]]=False
adj=[[] for _ in range(NW)]
for a_,b_ in Eg: adj[a_].append(b_);adj[b_].append(a_)
seen=np.zeros(NW,bool);st=[]
for n in ('antler_L_1','antler_R_1'):
    for i in np.flatnonzero(np.linalg.norm(V-Bd[n][0],axis=1)<.03):
        if GW[wid[i]] and not seen[wid[i]]: seen[wid[i]]=True;st.append(wid[i])
while st:
    u=st.pop()
    for w_ in adj[u]:
        if GW[w_] and not seen[w_]: seen[w_]=True;st.append(w_)
ANT=seen[wid]
only(ANT,{'head':1.})
only(SKS,{'skull_sh':1.})
for s,sg in (('L',-1),('R',1)):
    m=GOLD&(sg*V[:,0]>.06)&(V[:,1]>.03)&(V[:,1]<.2)&(V[:,2]>.36)&(V[:,2]<.56)
    only(m,{f'skulls_{s}':1.})
# rags: the red strips under the body and over the haunches, and the red charms on the antlers
for s,sg,n in (('L',-1,'charm_L'),('R',1,'charm_R')):
    m=CHV&(V[:,2]>.43)&(CHD[n]<.11)&(CHD[n]<=CHD['charm_L' if n=='charm_R' else 'charm_R'])&(~ANT)&(~SKS)
    print(n,int(m.sum()),V[m].min(0).round(3) if m.any() else '',V[m].max(0).round(3) if m.any() else '')
    only(m,{n:1.})
RG=RED&(V[:,2]<.5)&(V[:,1]>-.3)&(V[:,1]<.42)
dg=np.array([np.hypot((V[:,1]-y)/1.,V[:,0]-sg*.12) for _,sg,y,_,_ in RAG]);near=dg.argmin(0)
for i,(n,sg,y,z0,z1) in enumerate(RAG):
    m=RG&(near==i)
    t=np.clip((z0-V[:,2])/(z0-z1),0,1)
    only(m,{n+'_1':1-sstep(.35,.65,t),n+'_2':sstep(.35,.65,t)})

# The model is one continuous surface once its UV-seam duplicates are welded, so weights diffuse across that surface:
# coincident vertices always match, and borders become gradients.
Ww=np.zeros((NW,Wt.shape[1]));np.add.at(Ww,wid,Wt);Ww/=np.bincount(wid,minlength=NW)[:,None]
deg=np.zeros(NW);np.add.at(deg,Eg[:,0],1);np.add.at(deg,Eg[:,1],1)
for _ in range(7):
    acc=np.zeros_like(Ww);np.add.at(acc,Eg[:,0],Ww[Eg[:,1]]);np.add.at(acc,Eg[:,1],Ww[Eg[:,0]])
    Ww=.5*Ww+.5*acc/np.maximum(deg,1)[:,None]
Wt=Ww[wid]
legs=[idx[n] for n in bones if '_fore_' in n or '_hind_' in n]
dleg=np.array([segd(V,*Bd[n])/RAD[n] for n in bones if '_fore_' in n or '_hind_' in n])
Wt[:,legs]*=np.array([1-sstep(1.9,3.,d) for d in dleg]).T
FRINGE=(V[:,2]<.27)&(np.abs(V[:,0])<.1)&(V[:,1]>-.1)&(V[:,1]<.2)
Wt[np.ix_(FRINGE,legs)]=0
Wt/=np.maximum(Wt.sum(1,keepdims=True),1e-9)
def rigid(mask,n):
    Wt[mask]=0;Wt[mask,idx[n]]=1.
rigid(ANT|(HEADZ&(V[:,1]<-.415)),'head')
rigid(JAW&(V[:,1]<-.42),'jaw')
for s_ in 'LR': rigid(GOLD&(np.abs(V[:,0])>.06)&(np.sign(V[:,0])==(-1 if s_=='L' else 1))&(V[:,1]>.03)&(V[:,1]<.2)&(V[:,2]>.38)&(V[:,2]<.56),f'skulls_{s_}')
rigid(SKS,'skull_sh')
for n,z_ in (('charm_L',.6),('charm_R',.545)):
    rigid(CHV&(CHD[n]<.05)&(V[:,2]<z_-.03)&(~ANT)&(~SKS),n)
for n in ('ear_L','ear_R'):
    m=(segd(V,*Bd[n])<.03)&(V[:,1]<-.385)&(~ANT)&(~RED);print(n,int(m.sum()));rigid(m,n)
# what's rigid stays rigid, and everything around it eases into it
PIN=np.zeros(NW,bool);np.logical_or.at(PIN,wid,Wt.max(1)>.9999)
PIN[wid[FRINGE]]=False
Ww=np.zeros((NW,Wt.shape[1]));np.add.at(Ww,wid,Wt);Ww/=np.bincount(wid,minlength=NW)[:,None]
for _ in range(6):
    acc=np.zeros_like(Ww);np.add.at(acc,Eg[:,0],Ww[Eg[:,1]]);np.add.at(acc,Eg[:,1],Ww[Eg[:,0]])
    nxt=.5*Ww+.5*acc/np.maximum(deg,1)[:,None];nxt[PIN]=Ww[PIN];Ww=nxt
Wt=Ww[wid]
print('antler L',int((ANT&(V[:,0]<-.03)).sum()),V[ANT&(V[:,0]<-.03)].min(0).round(3),V[ANT&(V[:,0]<-.03)].max(0).round(3),'R',int((ANT&(V[:,0]>=-.03)).sum()),V[ANT&(V[:,0]>=-.03)].min(0).round(3),V[ANT&(V[:,0]>=-.03)].max(0).round(3),'charm_L',int((Wt[:,idx['charm_L']]>.5).sum()),'charm_R',int((Wt[:,idx['charm_R']]>.5).sum()))
print('welded verts',NW,'surface edges',len(Eg),'antler',int(ANT.sum()),'red',int(RED.sum()),'jaw',int(JAW.sum()))
order=np.argsort(-Wt,axis=1)
vg=[me.vertex_groups.new(name=n) for n in bones]
for i in range(N):
    t4=order[i,:4];w=Wt[i,t4];w=np.where(w<.01,0,w);s=w.sum()
    for j,x in zip(t4,w):
        if x>0: vg[j].add([i],float(x/s),'REPLACE')
mod=me.modifiers.new('Armature','ARMATURE');mod.object=arm;me.parent=arm
print('zero-weight verts',sum(1 for v in me.data.vertices if not v.groups),'bones',len(arm_d.bones))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(W,'rigged.blend'))
