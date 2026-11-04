# The Bone Hydra's skeleton, atlas and weights. Input: build/surgery.blend, one object per part. Output: build/rigged.blend
# Faces -Y, Z up. Unlike the Gravehart it isn't one skin: the source's parts are separate shells that overlap, and the necks are
# cut further here, so that in the game a head, an upper neck, a gore drape or the tail tip can come off whole. Nothing is
# weighted across a cut. Each cut is closed with a gore-coloured fan on both sides: hidden while the two sides meet, and the
# raw end once a piece has gone.
import bpy, bmesh, heapq, os
import numpy as np
from mathutils import Matrix, Vector
HERE=os.path.dirname(os.path.abspath(__file__));W=os.path.join(HERE,'build')
sc=bpy.context.scene
P={o.name.replace('tripo_part_',''):o for o in bpy.data.objects if o.type=='MESH'}

# ---------------- skeleton: name, head, tail, parent ----------------
BONES=[('root',(0,0,0),(0,-.15,0),None),('cog',(0,-.02,.33),(0,-.02,.45),'root'),
 ('pelvis',(0,-.02,.33),(0,.12,.3),'cog'),
 ('spine_1',(0,-.02,.33),(0,-.1,.37),'cog'),('spine_2',(0,-.1,.37),(0,-.2,.4),'spine_1'),('chest',(0,-.2,.4),(0,-.3,.42),'spine_2')]
# Each head turns on the place its shell actually meets the neck, so the joint opens as little as a joint can.
NECK={'m':[(.01,-.29,.44),(.01,-.285,.558),(.01,-.237,.666),(.01,-.177,.75),(.01,-.19,.834),(.015,-.25,.865)],
      'r':[(.15,-.32,.46),(.2,-.25,.55),(.25,-.19,.66),(.255,-.2,.74),(.255,-.245,.765),(.26,-.276,.744)],
      'l':[(-.06,-.26,.47),(-.16,-.14,.56),(-.245,-.055,.63),(-.26,-.09,.72),(-.262,-.135,.75),(-.265,-.17,.74)]}
HEAD={'m':((.015,-.25,.865),(.01,-.41,.834),(.01,-.275,.81),(.01,-.37,.755)),
      'r':((.26,-.276,.744),(.25,-.42,.69),(.25,-.3,.695),(.25,-.36,.605)),
      'l':((-.265,-.17,.74),(-.25,-.335,.69),(-.25,-.2,.69),(-.25,-.28,.61))}
for k,pts in NECK.items():
    for i in range(5):
        BONES.append((f'{k}_{i+1}',pts[i],pts[i+1],'chest' if i==0 else f'{k}_{i}'))
    h=HEAD[k];BONES.append((f'{k}_head',h[0],h[1],f'{k}_5'));BONES.append((f'{k}_jaw',h[2],h[3],f'{k}_head'))
FORE={'R':[(.16,-.16,.44),(.17,-.205,.31),(.185,-.272,.205),(.2,-.291,.096),(.2,-.33,.05),(.2,-.407,.012)],
      'L':[(-.16,-.16,.44),(-.15,-.212,.31),(-.17,-.257,.2),(-.18,-.295,.1),(-.185,-.33,.05),(-.19,-.4,.012)]}
HIND={'R':[(.16,-.02,.3),(.215,-.045,.135),(.23,-.003,.075),(.23,-.01,.04),(.235,-.075,.012)],
      'L':[(-.15,-.02,.3),(-.2,-.04,.135),(-.215,0.,.075),(-.215,-.01,.04),(-.22,-.075,.012)]}
for s,p in FORE.items():
    for i,n in enumerate(('scap','upper','fore','paw','toe')):
        BONES.append((f'{s}_fore_{n}',p[i],p[i+1],'chest' if i==0 else f"{s}_fore_{('scap','upper','fore','paw')[i-1]}"))
for s,p in HIND.items():
    for i,n in enumerate(('thigh','shin','meta','paw')):
        BONES.append((f'{s}_hind_{n}',p[i],p[i+1],'pelvis' if i==0 else f"{s}_hind_{('thigh','shin','meta')[i-1]}"))
TAIL=[(-.02,.06,.21),(-.07,.15,.135),(-.14,.255,.065),(-.179,.3,.055),(-.13,.44,.19),(-.06,.455,.26),(.016,.46,.332)]
for i in range(6): BONES.append((f'tail_{i+1}',TAIL[i],TAIL[i+1],'pelvis' if i==0 else f'tail_{i}'))
BONES+=[('drape_L',(-.22,-.13,.62),(-.2,-.13,.44),'l_2'),('drape_R',(.22,-.18,.62),(.21,-.18,.44),'r_2')]
arm_d=bpy.data.armatures.new('hydra_rig');arm=bpy.data.objects.new('hydra_rig',arm_d)
sc.collection.objects.link(arm);bpy.context.view_layer.objects.active=arm
bpy.ops.object.mode_set(mode='EDIT')
for n,h,t,p in BONES:
    b=arm_d.edit_bones.new(n);b.head=h;b.tail=t;b.use_deform=True
    if p: b.parent=arm_d.edit_bones[p]
bpy.ops.object.mode_set(mode='OBJECT')
Bd={n:(np.array(h,float),np.array(t,float)) for n,h,t,_ in BONES}

# ---------------- one atlas: the renderer takes one material per creature ----------------
A=3072;atlas=np.zeros((A,A,4),np.float32);atlas[...,3]=1
SLOTS={'0':(0,0,1536),'1':(1536,0,768),'3':(2304,0,768),'5':(1536,768,768),'8':(2304,768,768),'7':(0,1536,768),'2':(768,1536,768),'4':(1536,1536,768),'6':(2304,1536,768),
       '10':(0,2304,384),'11':(384,2304,384),'12':(768,2304,384),'13':(1152,2304,384),'16':(1536,2304,384)}
def tex(o): return next(n.image for n in o.data.materials[0].node_tree.nodes if n.type=='TEX_IMAGE')
for n,(x,y,s) in SLOTS.items():
    img=tex(P[n]).copy();img.scale(s,s);px=np.array(img.pixels[:],dtype=np.float32).reshape(s,s,4);bpy.data.images.remove(img)
    atlas[A-y-s:A-y,x:x+s]=px
def remap(o,n):
    x,y,s=SLOTS[n];u=o.data.uv_layers[0].data;a=np.zeros(len(u)*2);u.foreach_get('uv',a);a=a.reshape(-1,2);a=np.clip(a,.002,.998)
    a=(a*s+np.array((x,A-y-s)))/A;u.foreach_set('uv',a.ravel())
for n in SLOTS: remap(P[n],n)
# the patches were cut from parts 3 and 12, with their UVs
remap(P['patch_cap'],'3');remap(P['patch_collar'],'12')
im=bpy.data.images.new('bone_hydra_albedo',A,A,alpha=False);im.pixels.foreach_set(atlas.ravel());im.pack();im.colorspace_settings.name='sRGB'
def flat(name,c):
    i=bpy.data.images.new(name,4,4,alpha=False);i.pixels.foreach_set(np.tile(np.array(c,np.float32),16));i.pack();i.colorspace_settings.name='Non-Color';return i
mat=bpy.data.materials.new('bone_hydra');mat.use_nodes=True;nt=mat.node_tree;bs=next(n for n in nt.nodes if n.type=='BSDF_PRINCIPLED')
t=nt.nodes.new('ShaderNodeTexImage');t.image=im;nt.links.new(t.outputs['Color'],bs.inputs['Base Color'])
tn=nt.nodes.new('ShaderNodeTexImage');tn.image=flat('bone_hydra_normal',(.5,.5,1,1));nm=nt.nodes.new('ShaderNodeNormalMap');nt.links.new(tn.outputs['Color'],nm.inputs['Color']);nt.links.new(nm.outputs['Normal'],bs.inputs['Normal'])
tm=nt.nodes.new('ShaderNodeTexImage');tm.image=flat('bone_hydra_mr',(0,.9,0,1));sp=nt.nodes.new('ShaderNodeSeparateColor');nt.links.new(tm.outputs['Color'],sp.inputs['Color']);nt.links.new(sp.outputs['Green'],bs.inputs['Roughness']);nt.links.new(sp.outputs['Blue'],bs.inputs['Metallic'])

# ---------------- cuts ----------------
ruv=np.zeros(len(P['12'].data.uv_layers[0].data)*2);P['12'].data.uv_layers[0].data.foreach_get('uv',ruv)
RUV=np.median(ruv.reshape(-1,2),axis=0)   # the reddest stretch of that drape
SOCKET=(.177,-.38,.472)   # where the fourth head was: behind the patch, so its backing is sunk well in
def seal(bm,cutv=frozenset(),near=(),loops=None):
    """Closes what a cut left open, and any of the source's own openings named in near; the rest of its openings stay as they are.
    UV seams also read as open edges, but they come in pairs; a real opening doesn't."""
    key=lambda v:tuple(np.round(np.array(v.co)/1e-5).astype(np.int64).tolist())
    open_=[]
    for e in bm.edges:
        if e.is_boundary:
            l=e.link_loops[0];open_.append((l.vert,l.link_loop_next.vert))
    count={}
    for a,b in open_:
        k=frozenset((key(a),key(b)));count[k]=count.get(k,0)+1
    rim=[(a,b) for a,b in open_ if count[frozenset((key(a),key(b)))]==1]
    par={}
    def find(x):
        par.setdefault(x,x)
        while par[x]!=x: par[x]=par[par[x]];x=par[x]
        return x
    for a,b in rim: par[find(key(a))]=find(key(b))
    groups={}
    for a,b in rim: groups.setdefault(find(key(a)),[]).append((a,b))
    uv=bm.loops.layers.uv.active;made=0
    inner=np.mean([np.array(v.co) for v in bm.verts],axis=0)
    for edges in groups.values():
        if len(edges)<3: continue
        mid=np.mean([np.array(a.co) for a,_ in edges],axis=0)
        on=np.mean([key(a) in cutv for a,_ in edges])
        if on<.3 and not any(np.linalg.norm(mid-np.array(c))<.02 for c in near): continue
        # sunk a little into its own piece: it's a wound once it shows, and stays behind the rim until then
        d=inner-mid;c=bm.verts.new((mid+d/max(np.linalg.norm(d),1e-6)*(.06 if np.linalg.norm(mid-np.array(SOCKET))<.02 else .015)).tolist())
        if loops is not None: loops.append((mid,np.array([list(a.co) for a,_ in edges]+[list(c.co)])))
        for a,b in edges:
            f=bm.faces.new((bm.verts.new(b.co),bm.verts.new(a.co),c));f.smooth=False;made+=1
            for l in f.loops: l[uv].uv=RUV
    return made
def crumbs(bm,most=8):
    """Takes away the few-triangle scraps a cut leaves floating, which would hang in the air when the joint turns."""
    key=lambda v:tuple(np.round(np.array(v.co)/1e-5).astype(np.int64).tolist())
    par={}
    def find(x):
        par.setdefault(x,x)
        while par[x]!=x: par[x]=par[par[x]];x=par[x]
        return x
    for f in bm.faces:
        ks=[key(v) for v in f.verts]
        for k in ks[1:]: par[find(ks[0])]=find(k)
    isl={}
    for f in bm.faces: isl.setdefault(find(key(f.verts[0])),[]).append(f)
    bmesh.ops.delete(bm,geom=[f for g in isl.values() if len(g)<most for f in g],context='FACES')
LOOPS={}   # each cut piece's rims, for the skin to find them by
def cut(o,name,keep,near=()):
    """A copy of this object holding the faces whose centres pass the test, with the opening closed."""
    c=o.copy();c.data=o.data.copy();c.name=name;c.data.name=name;sc.collection.objects.link(c)
    bm=bmesh.new();bm.from_mesh(c.data);bm.faces.ensure_lookup_table()
    key=lambda v:tuple(np.round(np.array(v.co)/1e-5).astype(np.int64).tolist())
    drop=[];kept=set();gone=set()
    for f in bm.faces:
        if keep(np.array(f.calc_center_median())): kept.update(key(v) for v in f.verts)
        else: drop.append(f);gone.update(key(v) for v in f.verts)
    bmesh.ops.delete(bm,geom=drop,context='FACES');crumbs(bm);bmesh.ops.delete(bm,geom=[v for v in bm.verts if not v.link_faces],context='VERTS')
    LOOPS[name]=[];print('sealed',name,seal(bm,kept&gone,near,LOOPS[name]))
    bm.to_mesh(c.data);bm.free();return c
# (a piece of the neck base sits inside that box, not part of the head)
head_l=lambda p:p[1]<-.17 and p[2]>.58 and not (p[1]>-.225 and p[2]<.606)
# where each head's shell and each upper neck meet, in the source
RIM={'m':(.015,-.25,.865),'r':(.261,-.276,.744),'l':(-.265,-.17,.738)};BASE={'m':(.008,-.218,.666),'r':(.263,-.179,.66),'l':(-.254,-.072,.626)};TIP=(-.179,.3,.051)
# Each piece with its bones, and which of them has the rim of a cut all to itself, so the rim stays round and turns as a whole.
PIECES=[
 (cut(P['1'],'head_l',head_l),['l_head','l_jaw'],()),
 (cut(P['1'],'neckup_l',lambda p:not head_l(p) and p[2]>.625),['l_3','l_4','l_5'],((RIM['l'],'l_5'),(BASE['l'],'l_3'))),
 (cut(P['1'],'neck_l',lambda p:not head_l(p) and p[2]<=.625,near=((-.154,-.139,.494),)),['l_1','l_2'],((BASE['l'],'l_2'),)),
 (cut(P['7'],'head_r',lambda p:True,near=((.261,-.276,.744),)),['r_head','r_jaw'],()),
 (cut(P['3'],'neckup_r',lambda p:p[2]>.66,near=((.261,-.276,.744),)),['r_3','r_4','r_5'],((RIM['r'],'r_5'),(BASE['r'],'r_3'))),
 (cut(P['3'],'neck_r',lambda p:p[2]<=.66,near=(SOCKET,(.264,-.156,.564))),['r_1','r_2'],((BASE['r'],'r_2'),)),
 (P['patch_cap'],['r_1'],()),
 (cut(P['8'],'head_m',lambda p:True,near=((.019,-.259,.859),)),['m_head','m_jaw'],()),(P['16'],['m_5'],()),
 (cut(P['5'],'neckup_m',lambda p:p[2]>.666,near=((.014,-.241,.873),)),['m_3','m_4','m_5'],((RIM['m'],'m_5'),(BASE['m'],'m_3'))),
 (cut(P['5'],'neck_m',lambda p:p[2]<=.666),['m_1','m_2'],((BASE['m'],'m_2'),)),
 (P['0'],['pelvis','spine_1','spine_2','chest'],()),   # the legs are their own shells, overlapping it
 (cut(P['2'],'tail',lambda p:p[1]<=.3),['pelvis','tail_1','tail_2','tail_3'],((TIP,'tail_3'),)),
 (cut(P['2'],'tail_tip',lambda p:p[1]>.3),['tail_4','tail_5','tail_6'],((TIP,'tail_4'),)),
 (P['4'],['R_fore_scap','R_fore_upper','R_fore_fore','R_fore_paw','R_fore_toe'],()),
 (P['6'],['L_fore_scap','L_fore_upper','L_fore_fore','L_fore_paw','L_fore_toe'],()),
 (P['11'],['R_hind_thigh','R_hind_shin','R_hind_meta','R_hind_paw'],()),
 (P['10'],['L_hind_thigh','L_hind_shin','L_hind_meta','L_hind_paw'],()),
 (P['12'],['drape_L'],()),(P['13'],['drape_R'],()),(P['patch_collar'],['r_1'],()),
]
for n in ('1','3','5','2','7','8'): bpy.data.objects.remove(P[n])

def segd(Q,a,b):
    ab=b-a;t=np.clip(((Q-a)@ab)/(ab@ab),0,1)
    return np.linalg.norm(Q-(a+t[:,None]*ab),axis=1)
# jaws, read off each head's side view. Back of the mouth corner the jaw is under a line along the cheek, and its skin blends
# so the cheek can stretch. In front of the corner the line drops, following the lower jaw's top edge, so that the upper teeth,
# which hang well below the corner, stay in the skull. Close to the line, a vertex goes with whichever side the surface joins it to.
JAW={'l':dict(y0=-.245,z0=.681,slope=.62,rear=lambda y:.665+(y+.33)*.19,end=-.19),
     'm':dict(y0=-.345,z0=.805,slope=.55,rear=lambda y:.805+0*y,end=-.27),
     'r':dict(y0=-.335,z0=.675,slope=.875,rear=lambda y:.675+0*y,end=-.27)}
def jaw_weights(V,wid,NW,Eg,k):
    J=JAW[k];y,z=V[:,1],V[:,2];front=y<J['y0']
    s=np.where(front,z-(J['z0']-J['slope']*(J['y0']-y)),z-J['rear'](y))   # above the line is skull
    w=np.where(front,(s<0).astype(float),np.clip(.5-s/.04,0,1)*np.clip((J['end']-y)/.02,0,1))
    # the band along the front line: nearest firm vertex over the surface decides
    ww=np.zeros(NW);ww[wid]=w;band=np.zeros(NW,bool);band[wid[front&(np.abs(s)<.012)]]=True
    Wp=np.zeros((NW,3));Wp[wid]=V;adj=[[] for _ in range(NW)]
    for a,b in Eg:
        d=float(np.linalg.norm(Wp[a]-Wp[b]));adj[a].append((b,d));adj[b].append((a,d))
    dist=np.where(band,9.,0.);lab=ww.copy();h=[(0.,int(i)) for i in np.flatnonzero(~band)]
    heapq.heapify(h)
    while h:
        d,i=heapq.heappop(h)
        if d>dist[i]: continue
        for j,e in adj[i]:
            if d+e<dist[j]: dist[j]=d+e;lab[j]=lab[i];heapq.heappush(h,(d+e,j))
    return lab[wid]
def skin(o,bones,lock=()):
    me=o.data;V=np.array([list(v.co) for v in me.vertices])
    _,wid=np.unique(np.round(V/1e-5).astype(np.int64),axis=0,return_inverse=True);wid=wid.ravel();NW=wid.max()+1
    Eg=np.array([e.vertices[:] for e in me.edges]);Eg=wid[Eg];Eg=Eg[Eg[:,0]!=Eg[:,1]];Eg=np.unique(np.sort(Eg,axis=1),axis=0)
    if len(bones)==1: Wt=np.ones((len(V),1))
    else:
        ds=np.array([segd(V,*Bd[b]) for b in bones]);Wt=(1/(ds/.05+.12)**6);Wt/=Wt.sum(0);Wt=Wt.T
        if bones[1].endswith('_jaw'):
            m=jaw_weights(V,wid,NW,Eg,bones[0][0]);Wt=np.stack((1-m,m),1)
        else:
            Ww=np.zeros((NW,len(bones)));np.add.at(Ww,wid,Wt);Ww/=np.bincount(wid,minlength=NW)[:,None]
            deg=np.zeros(NW);np.add.at(deg,Eg[:,0],1);np.add.at(deg,Eg[:,1],1)
            for _ in range(5):
                acc=np.zeros_like(Ww);np.add.at(acc,Eg[:,0],Ww[Eg[:,1]]);np.add.at(acc,Eg[:,1],Ww[Eg[:,0]])
                Ww=.5*Ww+.5*acc/np.maximum(deg,1)[:,None]
            Wt=Ww[wid]
            # Measured from the rim itself, because a neck this short has no room for a ball round each end: the two would meet.
            ws=[]
            for c,b in lock:
                pts=min(LOOPS[o.name],key=lambda L:np.linalg.norm(L[0]-np.array(c)))[1]
                d=np.min(np.linalg.norm(V[:,None,:]-pts[None,:,:],axis=2),axis=1);x=np.clip((d-.008)/.05,0,1);ws.append(1-x*x*(3-2*x))
            if ws:
                ws=np.array(ws);top=ws.max(0);sh=ws**4;sh/=np.maximum(sh.sum(0),1e-9)
                Wt=Wt*(1-top)[:,None]
                for (c,b),x in zip(lock,sh): Wt[:,bones.index(b)]+=x*top
    vg=[o.vertex_groups.new(name=n) for n in bones];order=np.argsort(-Wt,axis=1)
    for i in range(len(V)):
        t4=order[i,:4];w=Wt[i,t4];w=np.where(w<.02,0,w);s=w.sum()
        for j,x in zip(t4,w):
            if x>0: vg[j].add([i],float(x/s),'REPLACE')
    print('piece',o.name,len(V),bones)
for o,b,l in PIECES: skin(o,b,l)

# ---------------- into one mesh ----------------
objs=[o for o,_,_ in PIECES]
for o in objs:
    o.data.materials.clear();o.data.materials.append(mat)
bpy.ops.object.select_all(action='DESELECT')
for o in objs: o.select_set(True)
body=next(o for o in objs if o.name=='tripo_part_0');bpy.context.view_layer.objects.active=body
bpy.ops.object.join()
me=bpy.context.view_layer.objects.active;me.name='hydra_mesh';me.data.name='hydra_mesh'
mod=me.modifiers.new('Armature','ARMATURE');mod.object=arm;me.parent=arm
print('verts',len(me.data.vertices),'tris',sum(len(p.vertices)-2 for p in me.data.polygons),'bones',len(arm_d.bones),'zero-weight',sum(1 for v in me.data.vertices if not v.groups))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(W,'rigged.blend'))
