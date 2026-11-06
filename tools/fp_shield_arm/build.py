"""Rigs LEFT SHIELD ARM 2.glb (source in lib.py) to the owner's arm photo: positions untouched, new bones and weights,
ShieldSocket, and raise/lower clips that move only ArmRoot. Numbers per iteration are in tune.py. Run from this folder."""
from lib import *
import sys,os,shutil
BM=os.path.abspath("../..")  # run from tools/fp_shield_arm
# ---- tunables (per iteration)
ELBOW_DEG=95.0     # interior elbow angle in hold
SCALE=.49          # model units to metres
EL_PX=(-285,250)   # elbow in reference px, relative to image centre; forearm level
FOREARM_PX=860     # forearm length on screen (ref 724; larger so the cut shoulder stays off frame)
FOCAL=1299         # 60 deg vertical on the 2000x1500 reference
ROLL=0.0
LOW_PX=(-770,520)  # blue arrow
SH_POS=0.68        # shield centre along forearm, from the outline
SH_ABOVE=1.2       # forearm-lengths from forearm line up to top of shield (reference)
SH_W_FA=1.99       # shield width in forearm lengths (reference)
if os.path.exists('tune.py'): exec(open('tune.py').read())
j,b=load();pr=j['meshes'][0]['primitives'][0]
P=acc(j,b,pr['attributes']['POSITION']).astype(float)
def nz(v):return v/np.linalg.norm(v)
def rot(ax,a):
    ax=nz(ax);K=np.array([[0,-ax[2],ax[1]],[ax[2],0,-ax[0]],[-ax[1],ax[0],0]]);return np.eye(3)+np.sin(a)*K+(1-np.cos(a))*K@K
def M(R=np.eye(3),t=(0,0,0),s=1.):
    m=np.eye(4);m[:3,:3]=R*s;m[:3,3]=t;return m
# measured landmarks (mesh space)
W=np.array([-.291,.139,-.217]);capC=np.array([.427,.145,.294]);grip=np.array([-.3456,.1786,-.3548])
fa0=nz(W-np.array([.084,.136,.209]));ua=nz(np.array([.99,-.03,.13]))
# elbow = where forearm and upper-arm axes cross
a0=np.array([.084,.136,.209]);b0=np.array([.082,.157,.241])
A=np.c_[fa0,-ua];t=np.linalg.lstsq(A,b0-a0,rcond=None)[0];Ee=(a0+fa0*t[0]+b0+ua*t[1])/2
fa=nz(W-Ee);print('elbow',Ee,'bind interior angle',np.degrees(np.arccos(fa@ua)))
gaxis=np.array([.5728,-.7304,-.3721]);palm=-nz(np.cross(fa,gaxis))
hinge=nz(np.cross(fa,ua))
bindang=np.arccos(fa@ua);bend=bindang-np.radians(ELBOW_DEG)
# Forearm goes to the screen: fa->+X, palm->+Z, up = palm x fa
Y=nz(np.cross(palm,fa));Z=nz(np.cross(fa,Y));Rf=np.c_[fa,Y,Z].T
depth=(np.linalg.norm(W-Ee)*SCALE)*FOCAL/FOREARM_PX
eF=np.array([EL_PX[0]/FOCAL*depth,-EL_PX[1]/FOCAL*depth,-depth])
# Upper arm in hold: rotate about hinge so the interior angle closes
Rb=None
for sgn in(1,-1):
    Rt=rot(hinge,sgn*bend)
    if abs((Rt@ua)@fa-np.cos(np.radians(ELBOW_DEG)))<1e-6:Rb=Rt
Ru=Rf@Rb
def Sk(R):return M(R,eF-R@Ee*SCALE,SCALE)
Su,Sf=Sk(Ru),Sk(Rf)
print('upper arm dir world',np.round(Ru@ua,3),'palm',np.round(Rf@palm,3),'grip',np.round(Rf@gaxis,3))
# ---- weights: elbow on the bisector plane, wrist band
m=nz(fa-ua);ss=lambda e0,e1,x:(lambda u:u*u*(3-2*u))(np.clip((x-e0)/(e1-e0),0,1))
ELW=.085
if 'ELW_T' in globals(): ELW=ELW_T
wf=ss(-ELW,ELW,(P-Ee)@m)
wh=ss(-.02,.035,(P-W)@fa)*(wf>.999)
wU=1-wf;wH=wf*wh;wF=wf*(1-wh)
JT=np.zeros((len(P),4),'u1');WT=np.zeros((len(P),4),'f4')
JT[:,0]=1;JT[:,1]=2;JT[:,2]=3;WT[:,0]=wU;WT[:,1]=wF;WT[:,2]=wH
print('verts upper %d fore %d hand %d blended %d'%((wU>.5).sum(),(wF>.5).sum(),(wH>.5).sum(),((wU>.02)&(wU<.98)).sum()))
# ---- skinned world (hold)
Pu=(P*SCALE)@Ru.T+Su[:3,3];Pf=(P*SCALE)@Rf.T+Sf[:3,3]
Pw=wU[:,None]*Pu+(wF+wH)[:,None]*Pf
# ---- shield seat, tested against the kite's inner face
sj,sb=load(BM+'/assets/game/items/thorned_kite.glb');sp=sj['meshes'][0]['primitives'][0]
SP=acc(sj,sb,sp['attributes']['POSITION']).astype(float);SI=acc(sj,sb,sp['indices']).ravel()
par=np.arange(len(SP))
def fd(a):
    while par[a]!=a:par[a]=par[par[a]];a=par[a]
    return a
for tri in SI.reshape(-1,3):
    for k in(1,2):par[fd(tri[0])]=fd(tri[k])
roots=np.array([fd(i) for i in range(len(SP))]);parts={r:np.where(roots==r)[0] for r in set(roots)}
for r,idx in parts.items():print('shield part',len(idx),np.round(SP[idx].min(0),3),np.round(SP[idx].max(0),3))
fa_w=np.linalg.norm(W-Ee)*SCALE
sc=(fa_w*SH_W_FA)/np.ptp(SP[:,0])
print('shield scale',sc,'width',np.ptp(SP[:,0])*sc)
elbW=eF
cx=elbW[0]+SH_POS*fa_w
cy=elbW[1]+SH_ABOVE*fa_w-SP[:,1].max()*sc
hm=np.zeros(len(SP),bool)
for r,idx in parts.items():
    if SP[idx,2].max()>.03 and np.ptp(SP[idx,0])<.25:hm[idx]=True
for r,idx in parts.items():
    if abs(SP[idx,0]).max()<.035 and SP[idx,1].max()<-.1 and SP[idx,1].min()>-.21:hm[idx]=True
print('handle verts',hm.sum(),np.round(SP[hm].min(0),3) if hm.any() else '',np.round(SP[hm].max(0),3) if hm.any() else '')
# inner face height map (largest z per cell), handle excluded
tris=SI.reshape(-1,3);tris=tris[~hm[tris].any(1)]
res=.006;xs=np.arange(-.32,.32,res);ys=np.arange(-.5,.46,res);H=np.full((len(xs),len(ys)),np.nan)
for t3 in tris:
    a,b1,c=SP[t3];d=(b1[1]-c[1])*(a[0]-c[0])+(c[0]-b1[0])*(a[1]-c[1])
    if abs(d)<1e-10:continue
    ix0,ix1=np.searchsorted(xs,[min(a[0],b1[0],c[0]),max(a[0],b1[0],c[0])]);iy0,iy1=np.searchsorted(ys,[min(a[1],b1[1],c[1]),max(a[1],b1[1],c[1])])
    if ix0>=ix1 or iy0>=iy1:continue
    X,Yg=np.meshgrid(xs[ix0:ix1],ys[iy0:iy1],indexing='ij')
    l1=((b1[1]-c[1])*(X-c[0])+(c[0]-b1[0])*(Yg-c[1]))/d;l2=((c[1]-a[1])*(X-c[0])+(a[0]-c[0])*(Yg-c[1]))/d;l3=1-l1-l2
    ins=(l1>=-1e-6)&(l2>=-1e-6)&(l3>=-1e-6);Z2=l1*a[2]+l2*b1[2]+l3*c[2]
    cur=H[ix0:ix1,iy0:iy1];cur[ins]=np.fmax(cur[ins],Z2[ins])
KY=0.
def gaps(cz):
    gx=np.clip(((Pw[:,0]-cx)/sc+.32)/res,0,len(xs)-1).astype(int);gy=np.clip(((Pw[:,1]-cy)/sc+.5)/res,0,len(ys)-1).astype(int)
    return Pw[:,2]-(H[gx,gy]*sc+cz+KY*(Pw[:,0]-cx))
g=gaps(0)
mask=(wU<.5)&~np.isnan(g)
cz=g[mask].min()
g2=gaps(cz);xw=(Pw[:,0]-elbW[0])/fa_w
hs=mask&(xw>=1.1)&(xw<1.4);el=mask&(xw>=-.1)&(xw<.15)
KY=(g2[hs].min()+EMBED-g2[el].min())/(Pw[hs,0].mean()-Pw[el,0].mean())
g=gaps(0);cz=g[mask&~hs&(xw<1.1)].min();g2=gaps(cz);print('board yaw deg',np.degrees(np.arctan(KY)))
print('seat z',cz,'min gap all mm',np.nanmin(g2)*1000)
xw=(Pw[:,0]-elbW[0])/fa_w
for a,c in((-.1,.15),(.15,.4),(.4,.65),(.65,.9),(.9,1.1),(1.1,1.4),(1.4,1.8)):
    s=mask&(xw>=a)&(xw<c)
    if s.any():print('along forearm %.2f-%.2f  back-to-board gap %.1f mm'%(a,c,g2[s].min()*1000))
shieldPos=np.array([cx,cy,cz])
# ---- nodes
def frame(y,x):
    y=nz(y);x=nz(x-(x@y)*y);return np.c_[x,y,np.cross(x,y)]
Bu=M(frame(Ee-capC,hinge),capC);Bf=M(frame(fa,hinge),Ee);Bh=M(frame(grip-W,hinge),W)
RS=rot(np.array([0,1.,0]),-np.arctan(KY));Ws=M(RS,shieldPos)
# handle for the preview shield: two posts from the fist's grip ends back to the board
gc=(grip*SCALE)@Rf.T+Sf[:3,3];gw=Rf@gaxis
posts=[]
for sg in(-1,1):
    e=gc+gw*sg*.115*SCALE;lx,ly=(e[0]-cx)/sc,(e[1]-cy)/sc
    hz=H[int((lx+.32)/res),int((ly+.5)/res)]*sc
    lA=RS.T@(e-shieldPos);lB=RS.T@(np.array([e[0],e[1],hz+cz+KY*(e[0]-cx)])-shieldPos);posts.append([lA.tolist(),lB.tolist()])
print('grip to board post length mm',[round(np.linalg.norm(np.array(p[0])-p[1])*1000,1) for p in posts])
G=M(rot(np.array([1.,0,0]),np.radians(ROLL)),eF-rot(np.array([1.,0,0]),np.radians(ROLL))@eF)
Su,Sf,Ws=G@Su,G@Sf,G@Ws
Ru=G[:3,:3]@Ru;Rf=G[:3,:3]@Rf
Wu=Su@Bu;Wf=Sf@Bf;Wh=Sf@Bh
Wr=M(Ru,Su[:3,3],SCALE)
Pu=(P*SCALE)@Ru.T+Su[:3,3];Pf=(P*SCALE)@Rf.T+Sf[:3,3];Pw=wU[:,None]*Pu+(wF+wH)[:,None]*Pf
def trs(m):
    t=m[:3,3];s=np.cbrt(np.linalg.det(m[:3,:3]));R=m[:3,:3]/s
    q=np.empty(4);tr=np.trace(R)
    if tr>0:S=np.sqrt(tr+1)*2;q[:]=[(R[2,1]-R[1,2])/S,(R[0,2]-R[2,0])/S,(R[1,0]-R[0,1])/S,S/4]
    else:
        i=int(np.argmax(np.diag(R)));k=(i+1)%3;l=(i+2)%3;S=np.sqrt(1+R[i,i]-R[k,k]-R[l,l])*2
        q[i]=S/4;q[k]=(R[k,i]+R[i,k])/S;q[l]=(R[l,i]+R[i,l])/S;q[3]=(R[l,k]-R[k,l])/S
    return t.tolist(),(q/np.linalg.norm(q)).tolist(),float(s)
inv=np.linalg.inv
# ---- rewrite the glb: same mesh, textures and material; new skeleton, weights, clip
srcpos=pr['attributes']['POSITION']
nb=bytearray(b)
def pad():
    while len(nb)%4:nb.append(0)
def add(arr,ctype,atype,minmax=False):
    pad();o=len(nb);d=arr.tobytes();nb.extend(d)
    j['bufferViews'].append({'buffer':0,'byteOffset':o,'byteLength':len(d)})
    a={'bufferView':len(j['bufferViews'])-1,'componentType':ctype,'count':len(arr),'type':atype}
    if minmax:
        A2=arr.reshape(len(arr),-1);a['min']=[float(x) for x in A2.min(0)];a['max']=[float(x) for x in A2.max(0)]
    j['accessors'].append(a);return len(j['accessors'])-1
pr['attributes']['JOINTS_0']=add(JT,5121,'VEC4');pr['attributes']['WEIGHTS_0']=add(WT,5126,'VEC4')
ibm=np.stack([np.eye(4),inv(Bu),inv(Bf),inv(Bh)])
ibmacc=add(ibm.transpose(0,2,1).reshape(4,16).astype('f4'),5126,'MAT4')
def node(name,mat,children=(),**kw):
    t,r,s=trs(mat);n={'name':name,'translation':t,'rotation':r}
    if abs(s-1)>1e-6:n['scale']=[s,s,s]
    if children:n['children']=list(children)
    n.update(kw);return n
# 0 scene root,1 mesh,2 ArmRoot,3 UpperArm,4 Forearm,5 Hand,6 ShieldSocket
nodes=[{'name':'LeftShieldArm','children':[1,2]},
 {'name':'ArmMesh','mesh':0,'skin':0},
 node('ArmRoot',Wr,[3]),
 node('UpperArm',inv(Wr)@Wu,[4]),
 node('Forearm',inv(Wu)@Wf,[5]),
 node('Hand',inv(Wf)@Wh,[6]),
 node('ShieldSocket',inv(Wh)@Ws)]
j['nodes']=nodes;j['scenes'][0]['nodes']=[0];j['skins']=[{'name':'LeftShieldArm','joints':[2,3,4,5],'inverseBindMatrices':ibmacc,'skeleton':2}]
# clip: only the root moves, along the blue line
hi=np.array(nodes[2]['translation']);lo=hi+np.array([LOW_PX[0]/FOCAL*depth,-LOW_PX[1]/FOCAL*depth,0])
tt=np.linspace(0,.28,9,dtype='f4');ee=tt/.28;ee=(1-(1-ee)**3).astype('f4')
def clip(name,a,c):
    v=(a[None,:]*(1-ee[:,None])+c[None,:]*ee[:,None]).astype('f4')
    return {'name':name,'samplers':[{'input':add(tt,5126,'SCALAR',True),'output':add(v,5126,'VEC3'),'interpolation':'LINEAR'}],'channels':[{'sampler':0,'target':{'node':2,'path':'translation'}}]}
j['animations']=[clip('ShieldRaise',lo,hi),clip('ShieldLower',hi,lo)]
j['asset']['generator']='Bellmourn rig fix'
pad();bb=bytes(nb);j['buffers'][0]['byteLength']=len(bb)
js=json.dumps(j,separators=(',',':')).encode();js+=b' '*(-len(js)%4)
out=b'glTF'+struct.pack('<II',2,12+8+len(js)+8+len(bb))+struct.pack('<II',len(js),0x4E4F534A)+js+struct.pack('<II',len(bb),0x004E4942)+bb
open(BM+'/assets/fp/left_shield_arm.glb','wb').write(out)
keep=SI.reshape(-1,3);keep=keep[~hm[keep].any(1)].ravel().astype('u4')
ibuf=bytearray(sb);
while len(ibuf)%4:ibuf.append(0)
o=len(ibuf);ibuf.extend(keep.tobytes());sj['bufferViews'].append({'buffer':0,'byteOffset':o,'byteLength':len(keep)*4})
sj['accessors'].append({'bufferView':len(sj['bufferViews'])-1,'componentType':5125,'count':len(keep),'type':'SCALAR'});sp['indices']=len(sj['accessors'])-1
while len(ibuf)%4:ibuf.append(0)
sj['buffers'][0]['byteLength']=len(ibuf);sjs=json.dumps(sj,separators=(',',':')).encode();sjs+=b' '*(-len(sjs)%4)
open('view/kite.glb','wb').write(b'glTF'+struct.pack('<II',2,28+len(sjs)+len(ibuf))+struct.pack('<II',len(sjs),0x4E4F534A)+sjs+struct.pack('<II',len(ibuf),0x004E4942)+bytes(ibuf))
json.dump({'shieldScale':float(sc),'depth':float(depth),'focal':FOCAL,'posts':posts,'fov':float(2*np.degrees(np.arctan(750/FOCAL)))},open('view/meta.json','w'))
print('lo',lo,'hi',hi,'elbow',eF,'depth',depth,'file',len(out))
j2,b2=load(BM+'/assets/fp/left_shield_arm.glb');j0,b0_=load()
assert np.array_equal(acc(j2,b2,srcpos),acc(j0,b0_,j0['meshes'][0]['primitives'][0]['attributes']['POSITION']));print('POSITION identical to source')
cap=Pw[(P-capC)@nz(capC-Ee)>-.02]
sy=(cap[:,1]/cap[:,2]*FOCAL+750);sx=(cap[:,0]/-cap[:,2]*FOCAL+1000);print('cut shoulder px: top y %.0f (frame 1500), x %.0f..%.0f, nearest depth %.3f'%(sy.min(),sx.min(),sx.max(),-cap[:,2].max()))

F=Pw[(P-W)@fa>0];print('fist px (1500 tall frame): width %.0f height %.0f, depth %.3f'%(np.ptp(F[:,0]/-F[:,2])*FOCAL,np.ptp(F[:,1]/-F[:,2])*FOCAL,-F[:,2].mean()))
print('elbow to knuckle m %.4f (staff arm 0.4585), forearm m %.4f (staff 0.2715)'%((np.linalg.norm(W-Ee)+((P-W)@fa).max())*SCALE,np.linalg.norm(W-Ee)*SCALE))
ww=Pw[(P-W)@fa>-.02];print('fist right edge px',round((Pw[:,0]/-Pw[:,2]*FOCAL+1000).max()))
