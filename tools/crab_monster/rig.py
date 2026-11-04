# Rebuild the crab monster's skeleton and weights, diffused across the welded surface. Output: tools/crab_monster/build/rigged.blend
import bpy, os, numpy as np, math
from mathutils import Matrix
W=os.path.join(os.getcwd(),'tools','crab_monster','build')
for o in list(bpy.data.objects): bpy.data.objects.remove(o)
bpy.ops.import_scene.gltf(filepath=os.path.join(os.getcwd(),'art','crab_monster','crab_monster_source.glb'))
me=next(o for o in bpy.data.objects if o.type=='MESH' and 'tripo_node' in o.name)
mw=me.matrix_world.copy()
me.modifiers.clear();me.parent=None;me.data.transform(mw);me.matrix_world=Matrix.Identity(4)
me.vertex_groups.clear();me.name='crab_mesh';me.data.name='crab_mesh'
for o in list(bpy.data.objects):
    if o is not me: bpy.data.objects.remove(o)
V=np.array([list(v.co) for v in me.data.vertices]);N=len(V)
def refine(g,r=.055):
    g=np.array(g,float);m=np.linalg.norm(V-g,axis=1)<r
    if m.sum()>4: g=.5*g+.5*V[m].mean(0)
    return g
GUIDE={
 'leg1':[(.205,-.165,.365),(.325,-.215,.385),(.395,-.235,.29),(.405,-.235,.165),(.367,-.232,.055)],
 'leg2':[(.225,.03,.385),(.345,.045,.425),(.42,.05,.305),(.465,.06,.175),(.443,.061,.052)],
 'leg3':[(.19,.13,.425),(.295,.175,.385),(.34,.205,.27),(.37,.235,.16),(.34,.207,.052)],
 'leg4':[(.165,.215,.475),(.245,.30,.46),(.27,.335,.33),(.29,.36,.17),(.263,.332,.05)],
}
PINCER=[(.325,-.195,.36),(.335,-.17,.24),(.345,-.17,.14),(.29,-.178,.022)]
FANG=[(.195,-.245,.345),(.168,-.268,.20),(.143,-.314,.112)]
FANGTIP={'R':(.095,-.34,.065),'L':(-.035,-.34,.075)}  # the asset's tusks are asymmetric: the left curls further across
def sym(pts,keep_last=True):
    R=[];L=[]
    for i,p in enumerate(pts):
        last=keep_last and i==len(pts)-1
        a=np.array(p) if last else refine(p)
        b=np.array((-p[0],p[1],p[2])) if last else refine((-p[0],p[1],p[2]))
        c=.5*(a+b*np.array((-1,1,1)))
        R.append(c);L.append(c*np.array((-1,1,1)))
    return R,L
chains={}
for k,g in list(GUIDE.items())+[('pincer',PINCER)]:
    r,l=sym(g);chains['R_'+k]=r;chains['L_'+k]=l
r,l=sym(FANG,keep_last=False)
chains['R_fang']=r+[np.array(FANGTIP['R'])];chains['L_fang']=l+[np.array(FANGTIP['L'])]

arm_d=bpy.data.armatures.new('crab_rig');arm=bpy.data.objects.new('crab_rig',arm_d)
bpy.context.scene.collection.objects.link(arm);bpy.context.view_layer.objects.active=arm
bpy.ops.object.mode_set(mode='EDIT')
E=arm_d.edit_bones
def add(name,h,t,parent=None,conn=False):
    b=E.new(name);b.head=tuple(float(x) for x in h);b.tail=tuple(float(x) for x in t);b.use_deform=True
    if parent: b.parent=E[parent];b.use_connect=conn
    return b
add('root',(0,0,0),(0,-.15,0))  # stays at the origin in every clip; clips are in place
add('cog',(0,0,.42),(0,0,.56),'root')
add('body_front',(0,-.03,.42),(0,-.22,.42),'cog')
add('body_rear',(0,.03,.42),(0,.24,.42),'cog')
add('mouth_top',(0,-.14,.50),(0,-.34,.60),'body_front')
add('mouth_bot',(0,-.13,.27),(0,-.33,.17),'body_front')
add('mouth_L',(-.11,-.13,.39),(-.27,-.33,.39),'body_front')
add('mouth_R',(.11,-.13,.39),(.27,-.33,.39),'body_front')
PARENT={'leg1':'body_front','leg2':'cog','leg3':'body_rear','leg4':'body_rear'}
for s in 'LR':
    for k in GUIDE:
        p=chains[f'{s}_{k}']
        for i in range(4):
            add(f'{s}_{k}_{i+1}',p[i],p[i+1],PARENT[k] if i==0 else f'{s}_{k}_{i}',conn=i>0)
    p=chains[f'{s}_pincer']
    for i in range(3): add(f'{s}_pincer_{i+1}',p[i],p[i+1],f'{s}_leg1_1' if i==0 else f'{s}_pincer_{i}',conn=i>0)
    p=chains[f'{s}_fang']
    for i in range(3): add(f'{s}_fang_{i+1}',p[i],p[i+1],'body_front' if i==0 else f'{s}_fang_{i}',conn=i>0)

def segd(P,a,b):
    a=np.array(a);b=np.array(b);ab=b-a;t=np.clip(((P-a)@ab)/(ab@ab),0,1)
    return np.linalg.norm(P-(a+t[:,None]*ab),axis=1)
def sstep(e0,e1,x):
    t=np.clip((x-e0)/(e1-e0),0,1);return t*t*(3-2*t)
RAD={'leg1':(.09,.085,.06,.045),'leg2':(.09,.085,.06,.045),'leg3':(.09,.08,.055,.04),'leg4':(.09,.085,.06,.04),'pincer':(.05,.045,.035),'fang':(.075,.065,.065)}
limbs=[(s,k) for s in 'LR' for k in RAD]
limbd=[];dn=np.zeros((len(limbs),N))
for li,(s,k) in enumerate(limbs):
    p=chains[f'{s}_{k}']
    ds=np.array([segd(V,p[i],p[i+1])/RAD[k][i] for i in range(len(p)-1)]);limbd.append(ds);dn[li]=ds.min(0)
BC=np.array((0,-.03,.44));BR=np.array((.245,.315,.285))
ell=np.linalg.norm((V-BC)/BR,axis=1)-1
A=sstep(1.4,.8,dn)                # soft limb membership
ES=sstep(-.10,.02,ell)            # limb share fades out inside the body
# tendril clumps fitted to their real length
TG=[(0,.02)]+[(.17*math.cos(a),.02+.17*math.sin(a)) for a in np.radians(np.arange(0,360,45))]
TGa=np.array(TG);limbmask=A.max(0)>.2
dg=np.linalg.norm(V[:,None,:2]-TGa[None],axis=2)
TTIP=[]
for i in range(len(TG)):
    m=(dg[:,i]<.09)&(~limbmask)&(V[:,2]<.27)&(V[:,1]>-.2)
    TTIP.append(max(float(V[m,2].min()),.01) if m.sum() else .12)
for i,(x,y) in enumerate(TG):
    pa='body_rear' if y>.1 else ('body_front' if y<-.08 else 'cog')
    mid=.25-(.25-TTIP[i])*.45
    add(f'tendril{i}_1',(x,y,.25),(x,y,mid),pa)
    add(f'tendril{i}_2',(x,y,mid),(x,y,TTIP[i]),f'tendril{i}_1',conn=True)
bpy.ops.object.mode_set(mode='OBJECT')
print('tendril tips',[round(t,3) for t in TTIP])

bones=[b.name for b in arm_d.bones if b.name!='root']
idx={n:i for i,n in enumerate(bones)}
Wt=np.zeros((N,len(bones)))
lm=A.max(0);lshare=lm*ES
mix=A**4;mix=mix/np.maximum(mix.sum(0),1e-9)
for li,(s,k) in enumerate(limbs):
    ds=limbd[li];w=1/(ds+.12)**6;w/=w.sum(0)
    for i in range(ds.shape[0]): Wt[:,idx[f'{s}_{k}_{i+1}']]=w[i]*mix[li]*lshare
rest=1-lshare
TZ=sstep(.27,.205,V[:,2])*sstep(-.20,-.14,V[:,1])
tw=np.exp(-(dg/.10)**2)+1e-6;tw/=tw.sum(1,keepdims=True)
midz=np.array([.25-(.25-t)*.45 for t in TTIP])
for i in range(len(TG)):
    seg=sstep(midz[i]-.03,midz[i]+.03,V[:,2])
    Wt[:,idx[f'tendril{i}_1']]+=rest*TZ*tw[:,i]*seg
    Wt[:,idx[f'tendril{i}_2']]+=rest*TZ*tw[:,i]*(1-seg)
rest2=rest*(1-TZ)
# mouth ring: four lips blended by angle, fading to the head toward the mouth axis so the centre has no singularity
ang=np.arctan2(V[:,2]-.385,V[:,0]);rho=np.hypot(V[:,0],V[:,2]-.385)
ry=sstep(-.10,-.24,V[:,1])*sstep(.05,.13,rho)
parts=[('mouth_top',np.clip(np.sin(ang),0,1)**2),('mouth_bot',np.clip(-np.sin(ang),0,1)**2),('mouth_L',np.clip(-np.cos(ang),0,1)**2),('mouth_R',np.clip(np.cos(ang),0,1)**2)]
tot=sum(w for _,w in parts)
for n,w in parts: Wt[:,idx[n]]+=rest2*ry*w/tot
rest3=rest2*(1-ry)
fr=sstep(-.02,-.14,V[:,1]);rr=sstep(.02,.14,V[:,1])
Wt[:,idx['body_front']]+=rest3*fr;Wt[:,idx['body_rear']]+=rest3*rr;Wt[:,idx['cog']]+=rest3*(1-fr-rr)
# The mesh is one continuous surface once UV-seam duplicates are welded, so every weight must diffuse across that
# surface: coincident vertices share weights (no cracks) and bone borders become gradients (no hard seams).
_,wid=np.unique(np.round(V/1e-5).astype(np.int64),axis=0,return_inverse=True);wid=wid.ravel();NW=wid.max()+1
Ww=np.zeros((NW,Wt.shape[1]));np.add.at(Ww,wid,Wt);Ww/=np.bincount(wid,minlength=NW)[:,None]
Eg=np.array([e.vertices[:] for e in me.data.edges]);Eg=wid[Eg];Eg=Eg[Eg[:,0]!=Eg[:,1]];Eg=np.unique(np.sort(Eg,axis=1),axis=0)
deg=np.zeros(NW);np.add.at(deg,Eg[:,0],1);np.add.at(deg,Eg[:,1],1)
for _ in range(14):
    acc=np.zeros_like(Ww);np.add.at(acc,Eg[:,0],Ww[Eg[:,1]]);np.add.at(acc,Eg[:,1],Ww[Eg[:,0]])
    Ww=.5*Ww+.5*acc/np.maximum(deg,1)[:,None]
Wt=Ww[wid]
print('welded verts',NW,'surface edges',len(Eg))
order=np.argsort(-Wt,axis=1)
vg=[me.vertex_groups.new(name=n) for n in bones]
for i in range(N):
    t4=order[i,:4];w=Wt[i,t4];w=np.where(w<.01,0,w);s=w.sum()
    for j,x in zip(t4,w):
        if x>0: vg[j].add([i],float(x/s),'REPLACE')
mod=me.modifiers.new('Armature','ARMATURE');mod.object=arm;me.parent=arm
print('zero-weight verts',sum(1 for v in me.data.vertices if not v.groups),'bones',len(arm_d.bones))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(W,'rigged.blend'))
