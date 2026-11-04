# Author all clips on rigged.blend, baked to bones. Output (in tools/crab_monster/build): anim.blend, clips.json, metrics.json
# Convention: creature faces -Y, Z up, metres. Clips are in place; gait clips report floor speed in clips.json.
import bpy, os, json, math
import numpy as np
from mathutils import Vector, Euler, Quaternion, Matrix
W=os.path.join(os.getcwd(),'tools','crab_monster','build')
FPS=30
arm=bpy.data.objects['crab_rig'];me=bpy.data.objects['crab_mesh'];sc=bpy.context.scene
sc.render.fps=FPS
PB=arm.pose.bones;RB=arm.data.bones
LEGS=[s+str(i) for s in 'LR' for i in (1,2,3,4)]
REST={l:np.array(RB[f'{l[0]}_leg{l[1]}_4'].tail_local) for l in LEGS}
SIDE={'L':-1,'R':1}
TEND=[f'tendril{i}' for i in range(9)]
TPOS=np.array([RB[t+'_1'].head_local for t in TEND])
TLEN=[.25-RB[t+'_2'].tail_local.z for t in TEND]
FORE={'1':0.,'2':-.012,'3':-.04,'4':-.085}   # stance centres pulled under the hips so rear legs keep reach
TAU=2*math.pi

def ss(a,b,x):
    t=min(max((x-a)/(b-a),0),1);return t*t*(3-2*t)
def K(t,keys):
    """Eased keys: (time,value[,ease]), ease belongs to the segment arriving at that key."""
    if t<=keys[0][0]: return keys[0][1]
    for a,b in zip(keys,keys[1:]):
        if t<=b[0]:
            u=(t-a[0])/(b[0]-a[0]);e=b[2] if len(b)>2 else 'ss'
            u={'ss':u*u*(3-2*u),'in':u*u*u,'out':1-(1-u)**3,'lin':u,'in2':u*u}[e]
            return a[1]+(b[1]-a[1])*u
    return keys[-1][1]
def hermite(p0,p1,m0,m1,u):
    return (2*u**3-3*u**2+1)*p0+(u**3-2*u**2+u)*m0+(-2*u**3+3*u**2)*p1+(u**3-u**2)*m1
def gait_foot(l,phi,v,T,duty,lift,spread=0,fore=0,hes=False):
    """Stance slides the foot backward (+Y) at exactly v; swing returns it on a velocity-matched path."""
    p=phi%1;b=REST[l].copy();b[2]=0;st=v*duty*T
    b[0]+=SIDE[l[0]]*spread;b[1]+=fore+FORE[l[1]]
    if p<duty:
        b[1]+=st*(-.5+p/duty);return b
    u=(p-duty)/(1-duty);Ts=(1-duty)*T
    if hes:   # lift, reach, hang in the air, then place: a predator testing the ground
        q=.86*ss(0,.5,u)+.14*ss(.74,1,u);b[1]+=st/2-st*q
        b[2]+=lift*ss(0,.38,u)*(1-ss(.76,1,u))
    else:
        b[1]+=hermite(st/2,-st/2,v*Ts,v*Ts,u);b[2]+=lift*math.sin(math.pi*u**.75)**2
    b[0]+=SIDE[l[0]]*.018*math.sin(math.pi*u)
    return b
def stance_feet():
    d={}
    for l in LEGS:
        b=REST[l].copy();b[2]=0;d[l]=b
    return d
def base_pose():
    return dict(cog=np.zeros(3),rot=np.zeros(3),front=np.zeros(3),rear=np.zeros(3),mouth=0.,fang=np.zeros(3),feet=stance_feet(),pin={'L':0.,'R':0.})
def step_arc(f,t0,t1,dst,h):
    u=ss(t0,t1,f);z=h*math.sin(math.pi*min(max((f-t0)/(t1-t0),0),1))**2
    return np.array(dst,float)*u+np.array((0,0,z))

# ------------- locomotion -------------
def walk_stalk(t,T):
    phi=t/T;P=base_pose();v=.10;duty=.90
    # one leg at a time, rear to front, alternating sides
    ph={'L4':.875,'L3':.75,'L2':.625,'L1':.5,'R4':.375,'R3':.25,'R2':.125,'R1':0.}  # a larger offset swings earlier
    for l in LEGS:
        P['feet'][l]=gait_foot(l,phi+ph[l],v,T,.84 if l[1]=='1' else duty,.095 if l[1]=='1' else .06,spread=.015,fore=-.02,hes=l[1]=='1')
    w=TAU*phi
    P['cog'][2]=-.07+.006*math.cos(4*w)
    P['cog'][1]=.006*math.cos(4*w+.5)
    P['cog'][0]=.012*math.sin(w+.6)
    P['rot']=np.array((.12+.008*math.cos(4*w+1),.022*math.sin(w+.6),.03*math.sin(w)))
    P['front']=np.array((.03,0,-.07*math.sin(w+1.2)))     # slow head scan
    P['rear']=np.array((-.02,0,.03*math.sin(w+.3)))
    P['mouth']=.08+.1*math.sin(2*w+1)
    P['fang']=np.array((.03*math.sin(2*w),.05*math.sin(w+.5),0))
    return P,v
def walk_skitter(t,T):
    phi=t/T;P=base_pose();duty=.76;v=.32
    w4={'4':.75,'3':.5,'2':.25,'1':0.}   # lift order runs rear to front
    for l in LEGS:
        P['feet'][l]=gait_foot(l,phi+w4[l[1]]+(.5 if l[0]=='R' else 0),v,T,duty,.055,spread=.035,fore=-.01)
    w=TAU*phi
    P['cog'][2]=-.018+.004*math.cos(4*w)
    P['cog'][0]=.008*math.sin(w)
    P['rot']=np.array((.015*math.sin(2*w),.035*math.sin(w+.8),.05*math.sin(w+.3)+.025*math.sin(3*w)))
    P['front']=np.array((.02*math.cos(2*w),0,-.06*math.sin(w+1)))
    P['rear']=np.array((-.02*math.cos(2*w),0,.05*math.sin(w+1)))
    P['mouth']=.05+.22*max(0,math.sin(2*w))**4
    P['fang']=np.array((.06*math.sin(4*w),.08*math.sin(2*w+1),0))
    return P,v
def run_scuttle(t,T):
    phi=t/T;P=base_pose();duty=.5;v=.32/(.5*T)
    ph={'L1':0,'R2':.02,'L3':.04,'R4':.06,'R1':.5,'L2':.52,'R3':.54,'L4':.56}
    for l in LEGS: P['feet'][l]=gait_foot(l,phi+ph[l],v,T,duty,.09,spread=.03,fore=-.03)
    w=TAU*phi
    P['cog'][2]=-.035+.018*math.cos(2*w+1.3)
    P['cog'][1]=-.02
    P['rot']=np.array((.17+.035*math.cos(2*w+2.2),.05*math.sin(w+.6),.05*math.sin(w+.2)))
    P['front']=np.array((.05*math.cos(2*w+.3),0,-.06*math.sin(w)))
    P['rear']=np.array((-.05*math.cos(2*w+.9),0,.06*math.sin(w)))
    P['mouth']=.25+.15*math.sin(2*w)
    P['fang']=np.array((-.12+.05*math.sin(2*w),.12,0))
    return P,v
def run_gallop(t,T):
    phi=t/T;P=base_pose();duty=.32;v=.34/(duty*T)
    ph={'L1':.0,'R1':.04,'L2':.02,'R2':.06,'L3':.52,'R3':.56,'L4':.50,'R4':.54}
    for l in LEGS:
        P['feet'][l]=gait_foot(l,phi+ph[l],v,T,duty,.15 if l[1] in '12' else .12,spread=.04,fore=-.04)
    w=TAU*phi
    # low about two frames after each pair lands (phi .125, .625), high in the flight windows
    P['cog'][2]=-.03-.045*math.sin(2*w)
    P['cog'][1]=-.03+.025*math.cos(w+.5)
    P['rot']=np.array((.13+.19*math.sin(w+1.9),.02*math.sin(w),.025*math.sin(w+1)))
    P['front']=np.array((.09*math.sin(w+2.5),0,0))
    P['rear']=np.array((.11*math.sin(w+.9),0,0))
    P['mouth']=.4+.3*math.sin(w+2.2)
    P['fang']=np.array((-.18+.1*math.sin(w+2),.16,0))
    return P,v

# ------------- attacks -------------
def attack_bite(t,T):
    P=base_pose();f=t*FPS
    # 0-16 coil, feet gather; 17-23 strike off the planted rears; 26 snap; 26-42 worry; 42-66 recover
    py=K(f,[(0,0.),(14,.05),(17,.055),(23,-.16,'out'),(42,-.15),(66,0.)])
    pz=K(f,[(0,0.),(14,-.05),(17,-.05),(23,-.03,'out'),(42,-.04),(66,0.)])
    pp=K(f,[(0,0.),(14,-.30),(17,-.32),(23,.24,'out'),(30,.20),(42,.16),(66,0.)])
    env=K(f,[(25,0.),(27,1.),(34,.8),(42,0.)]);sw=math.sin((f-25)*TAU/5)
    P['cog']=np.array((.012*env*sw,py,pz))
    P['rot']=np.array((pp,.08*env*sw,.20*env*sw))
    P['front']=np.array((.4*pp,0,.08*env*math.sin((f-26)*TAU/5)))
    P['rear']=np.array((-.25*pp,0,0))
    P['mouth']=K(f,[(0,0.),(8,-.2),(15,.5),(20,1.1),(23,1.2),(26,-.35,'in'),(42,-.35),(52,.1),(66,0.)])
    fl=K(f,[(0,0.),(14,.15),(22,.42),(25,-.1),(48,0.)]);P['fang']=np.array((-fl*.6,fl,0))
    steps={'L4':[(2,11,-.07,.03),(23,30,-.08,.03),(50,60,.15,.035)],'R4':[(4,13,-.07,.03),(24,31,-.08,.03),(53,63,.15,.035)],
           'L1':[(17,24,-.19,.05),(46,56,.19,.04)],'R1':[(18,25,-.20,.05),(49,59,.20,.04)],
           'L2':[(22,28,-.13,.04),(43,53,.13,.04)],'R2':[(24,30,-.13,.04),(46,56,.13,.04)],
           'L3':[(25,31,-.12,.03),(48,58,.12,.03)],'R3':[(23,29,-.12,.03),(51,61,.12,.03)]}
    for l,ss_ in steps.items():
        for a,b,dy,h in ss_: P['feet'][l]=P['feet'][l]+step_arc(f,a,b,(0,dy,0),h)
    v=K(f,[(0,0.),(17,.4),(23,1.),(27,0.)]);P['pin']={'L':v,'R':v}
    return P,0
def attack_claw(t,T):
    P=base_pose();f=t*FPS
    # brace 1-11, rear up to 20, left rake 20-29, right rake 31-40, settle 46-70
    pitch=K(f,[(0,0.),(5,.04),(19,-.42),(23,-.30),(29,-.06,'out'),(35,-.24),(41,.08,'out'),(50,.04),(72,0.)])
    P['rot']=np.array((pitch,K(f,[(14,0.),(20,.10),(29,-.14,'out'),(35,.05),(41,.14,'out'),(54,0.)]),K(f,[(14,0.),(20,.16),(29,-.24,'out'),(35,.16),(41,.24,'out'),(56,0.)])))
    P['cog'][1]=K(f,[(0,0.),(5,-.02),(19,.05),(29,-.05,'out'),(35,.0),(41,-.08,'out'),(72,0.)])
    P['cog'][2]=K(f,[(0,0.),(5,-.03),(19,-.02),(29,-.05),(35,-.03),(41,-.055),(50,-.02),(72,0.)])
    P['front']=np.array((.5*pitch,0,0));P['rear']=np.array((-.25*pitch,0,0))
    P['mouth']=K(f,[(0,0.),(18,.6),(26,.95),(33,.7),(39,1.0),(50,.1),(72,0.)])
    fl=K(f,[(0,0.),(20,.3),(41,.3),(54,0.)]);P['fang']=np.array((-fl,fl,0))
    for s,t0,l0 in (('L',20,6),('R',34,11)):
        l=s+'1';sg=SIDE[s];rest=P['feet'][l]
        wide=np.array((sg*.50,-.16,.40));up=np.array((sg*.50,-.30,.80));high=up+np.array((sg*.02,.03,.02))
        mid=np.array((sg*.40,-.47,.47));low=np.array((sg*.30,-.50,.17));strike=np.array((sg*.15,-.49,.012))
        tgt=K(f,[(l0,rest),(l0+5,wide),(t0-4,up),(t0,high),(t0+3,mid,'in2'),(t0+5,low,'lin'),(t0+7,strike,'out'),(t0+10,strike+np.array((sg*.03,.015,-.012)))])
        a,b=(48,62) if s=='L' else (52,66)
        ret=ss(a,b,f);tgt=tgt*(1-ret)+rest*ret+np.array((0,0,.05*math.sin(math.pi*ret)))
        tgt[2]=max(tgt[2],0);P['feet'][l]=tgt
        P['pin'][s]=K(f,[(l0,0.),(t0-3,1.),(t0+6,1.),(t0+10,.2),(62,0.)])
    # staggered bracing keeps four or more feet planted
    steps={'L2':[(1,6,(-.03,-.10,0),.05),(48,58,(.03,.10,0),.04)],'R3':[(1,6,(.02,.02,0),.03),(58,67,(-.02,-.02,0),.03)],
           'R2':[(6,11,(.03,-.10,0),.05),(54,64,(-.03,.10,0),.04)],'L3':[(6,11,(-.02,.02,0),.03),(60,69,(.02,-.02,0),.03)]}
    for l,ss_ in steps.items():
        for a,b,d,h in ss_: P['feet'][l]=P['feet'][l]+step_arc(f,a,b,d,h)
    return P,0
def attack_slam(t,T):
    P=base_pose();f=t*FPS
    # crouch 0-12, push 12-15, ballistic 15-33, legs give way 33-36, belly down to 39, bounce 42, rise 50-72
    v0=2.94
    if f<=15: z=K(f,[(0,0.),(10,-.12),(12,-.125),(15,.03,'in2')])
    elif f<33:
        tt=(f-15)/FPS;z=.03+v0*tt-4.9*tt*tt
    else: z=K(f,[(33,.03),(36,-.22,'lin'),(39,-.22),(42,-.18,'out'),(47,-.205),(52,-.195),(72,0.)])
    y=K(f,[(0,0.),(12,.03),(15,.03),(33,-.28,'lin'),(46,-.28),(72,0.)])
    P['cog']=np.array((0,y,z))
    pp=K(f,[(0,0.),(12,-.12),(20,-.28),(33,-.10),(36,-.14),(42,-.09),(52,-.08),(72,0.)])
    P['rot']=np.array((pp,0,0))
    jig=K(f,[(36,1.),(48,0.,'lin')]) if f>=36 else 0
    P['front']=np.array((.05*jig*math.sin((f-36)*1.6),0,0));P['rear']=np.array((-.06*jig*math.sin((f-36)*1.6),0,0))
    P['mouth']=K(f,[(0,0.),(14,-.3),(24,.6),(33,1.0),(36,-.1),(46,0.),(72,0.)])
    fl=K(f,[(0,0.),(14,-.1),(26,.4),(33,.5),(50,0.)]);P['fang']=np.array((-.3*fl,fl,0))
    tuck=.12*ss(17,22,f)*(1-ss(24,31,f))
    A=('L1','R2','L3','R4')
    for l,b in P['feet'].items():
        sg=SIDE[l[0]];c=ss(15,33,f)
        pos=b+np.array((sg*.11*c,-.28*c,0))
        if 15<f<33: pos[2]=max(0,z-.02+tuck)
        a0,a1=(46,58) if l in A else (56,68)
        pos=pos+step_arc(f,a0,a1,(-sg*.11,.28,0),.05)
        P['feet'][l]=pos
    return P,0
def jump(t,T):
    P=base_pose();f=t*FPS
    # crouch 0-16, push 16-19, ballistic until feet touch at 34, compress to 38, recover to 58
    v0=2.29
    if f<=19: z=K(f,[(0,0.),(13,-.135),(16,-.14),(19,.08,'lin')])
    elif f<33.8:
        tt=(f-19)/FPS;z=.08+v0*tt-4.9*tt*tt
    else: z=K(f,[(33.8,.02),(38,-.13,'out'),(43,-.10),(49,.012),(58,0.)])
    P['cog'][2]=z
    pitch=K(f,[(0,0.),(13,-.14),(16,-.15),(19,.05,'lin'),(26,-.10),(33,.08),(38,.14),(48,-.02),(58,0.)])
    P['rot']=np.array((pitch,0,0))
    P['front']=np.array((.5*pitch,0,0));P['rear']=np.array((-.35*pitch,0,0))
    P['mouth']=K(f,[(0,0.),(13,-.3),(19,.5),(27,.75),(33,.4),(37,-.3),(48,.1),(58,0.)])
    fl=K(f,[(0,0.),(13,-.1),(24,.25),(33,.4),(38,-.08),(54,0.)]);P['fang']=np.array((-.3*fl,fl,0))
    A=('L1','R2','L3','R4')
    tuck=ss(20,26,f)*(1-ss(26,32,f))
    trail=ss(19,23,f)*(1-ss(23,27,f))
    for l,b in P['feet'].items():
        sg=SIDE[l[0]]
        lock=ss(27,33.8,f)     # reaches out ahead of the landing, then stays put from contact on
        pos=b+np.array((sg*.05*lock,0,0))-np.array((sg*.05*tuck,0,0))
        if 17.5<f<33.8:
            pos[2]=max(0,z-.02+.13*tuck-.012*trail)
        a0,a1=(43,50) if l in A else (49,56)
        pos=pos+step_arc(f,a0,a1,(-sg*.05,0,0),.03)
        P['feet'][l]=pos
    return P,0

CLIPS=[('walk_stalk',walk_stalk,64,True),('walk_skitter',walk_skitter,20,True),('run_scuttle',run_scuttle,18,True),('run_gallop',run_gallop,16,True),
       ('attack_bite',attack_bite,66,False),('attack_claw',attack_claw,72,False),('attack_slam',attack_slam,72,False),('jump',jump,58,False)]

# ------------- solver -------------
def E2Q(e): return Euler(tuple(float(x) for x in e),'XYZ').to_quaternion()
def key_rot(pb,q):
    Rr=pb.bone.matrix_local.to_quaternion();pb.rotation_quaternion=Rr.inverted()@q@Rr
class Xf:
    """World transforms of the body bones for one pose."""
    def __init__(s,P):
        s.Rc=E2Q(P['rot']);s.Df=s.Rc@E2Q(P['front']);s.Dr=s.Rc@E2Q(P['rear']);s.cl=Vector(P['cog']);s.H=Vector(RB['cog'].head_local)
        s.Hf=Vector(RB['body_front'].head_local);s.Hr=Vector(RB['body_rear'].head_local)
    def c(s,p): return s.H+s.cl+s.Rc@(p-s.H)
    def f(s,p): return s.c(s.Hf)+s.Df@(p-s.Hf)
    def r(s,p): return s.c(s.Hr)+s.Dr@(p-s.Hr)
class Chain:
    """Solves a limb by scaling all its rest bend angles together (keeps the claw's curve), then aiming hip to target."""
    def __init__(self,names):
        self.names=names;self.bones=[RB[n] for n in names]
        self.hip=Vector(self.bones[0].head_local)
        self.r=[Vector(b.tail_local)-Vector(b.head_local) for b in self.bones]
        self.ax=[None];self.ang=[0]
        for a,c in zip(self.r,self.r[1:]):
            x=a.cross(c);self.ax.append(x.normalized() if x.length>1e-6 else Vector((1,0,0)));self.ang.append(a.angle(c))
        tip0=sum(self.r,Vector((0,0,0)));self.n=tip0.cross(self.r[0]+self.r[1]).normalized()
    def frame(self,d):
        x=d.normalized();z=(self.n-self.n.dot(x)*x).normalized();y=z.cross(x)
        return Matrix((x,y,z)).transposed().to_quaternion()
    def shape(self,s):
        D=Quaternion();rel=[];p=Vector((0,0,0))
        for i,v in enumerate(self.r):
            q=Quaternion() if i==0 else Quaternion(self.ax[i],self.ang[i]*(s-1))
            D=D@q;rel.append(q);p=p+D@v
        return rel,p
    def solve(self,hip_w,target):
        d=Vector(target)-hip_w;dist=d.length
        a,b=0.,2.0;dmax=self.shape(a)[1].length;err=0
        if dist>=dmax: s=a;err=dist-dmax
        else:
            for _ in range(22):
                m=.5*(a+b)
                if self.shape(m)[1].length>dist: a=m
                else: b=m
            s=.5*(a+b)
        rel,tip=self.shape(s)
        return self.frame(d)@self.frame(tip).inverted(),rel,s,err
CH={}
for s in 'LR':
    for i in (1,2,3,4): CH[f'{s}{i}']=Chain([f'{s}_leg{i}_{j}' for j in (1,2,3,4)])
    CH[f'{s}p']=Chain([f'{s}_pincer_{j}' for j in (1,2,3)])
FANGROOT={s:Vector(RB[f'{s}_fang_1'].head_local) for s in 'LR'}
FANGTIPZ={s:RB[f'{s}_fang_3'].tail_local.z for s in 'LR'}
BOTH=Vector(RB['mouth_bot'].head_local)
_g=me.vertex_groups['mouth_bot'].index
BOTT=min((v.co for v in me.data.vertices if any(x.group==_g and x.weight>.35 for x in v.groups)),key=lambda c:c.z).copy()
print('lowest lip point',[round(x,3) for x in BOTT])
SPLAY=[np.array((0,-1.))]+[np.array((math.cos(a),math.sin(a))) for a in np.radians(np.arange(0,360,45))]

def pincer_open(s,o,phi):
    return Quaternion((1,0,0),-phi)@E2Q((-.45*o,0,SIDE[s]*.55*o))
PIN_REST=.12
def envelope(arr,lim,loop):
    # lowers nothing below its target: a fold may start early, but cannot miss the floor
    n=len(arr)
    for _ in range(2 if loop else 1):
        for i in (range(n) if loop else range(1,n)): arr[i]=np.maximum(arr[i],arr[i-1]-lim)
        for i in (range(n-1,-1,-1) if loop else range(n-2,-1,-1)): arr[i]=np.maximum(arr[i],arr[(i+1)%n]-lim)
def pincers(poses,loop):
    n=len(poses);out=[{} for _ in range(n)]
    for s in 'LR':
        c=CH[s+'1'];pc=CH[s+'p'];hb=Vector(RB[c.names[0]].head_local);sv=[];GH=[]
        for P in poses:
            x=Xf(P);hw=x.f(c.hip);G,_,v,_=c.solve(hw,P['feet'][s+'1']);sv.append(max(.7,min(1.25,v))-.25*P['pin'][s]);GH.append((G,hw+G@(pc.hip-hb)))
        sv=np.array(sv)
        for _ in range(3):
            sv=(np.roll(sv,1)+sv*2+np.roll(sv,-1))/4 if loop else np.convolve(np.r_[sv[0],sv,sv[-1]],(.25,.5,.25),'valid')
        fold=np.zeros((n,1))
        for i,P in enumerate(poses):
            G,ph=GH[i];_,tip=pc.shape(float(sv[i]));o=P['pin'][s];f=PIN_REST
            while f<1.7 and ph.z+(G@pincer_open(s,o,f)@tip).z<.008: f+=.03
            fold[i,0]=f
        envelope(fold,.20,loop)
        for _ in range(2):
            fold[:,0]=(np.roll(fold[:,0],1)+fold[:,0]*2+np.roll(fold[:,0],-1))/4 if loop else np.convolve(np.r_[fold[0,0],fold[:,0],fold[-1,0]],(.25,.5,.25),'valid')
        for i in range(n): out[i][s]=(float(sv[i]),float(fold[i,0]))
    return out
def secondary(poses,loop):
    """Springs for tendrils, plus rate-limited floor folds for tendrils and tusks, solved over the whole clip."""
    n=len(poses);dt=1/FPS;c=np.array([p['cog'] for p in poses])
    def acc(i):
        if loop: return (c[(i+1)%n]-2*c[i]+c[(i-1)%n])/dt/dt
        return (c[min(i+1,n-1)]-2*c[i]+c[max(i-1,0)])/dt/dt
    rng=np.random.RandomState(7);K0=70+rng.rand(9)*80;C0=7+rng.rand(9)*3
    # target folds
    tfold=np.zeros((n,9));ffold=np.zeros((n,2))
    for i,P in enumerate(poses):
        x=Xf(P)
        for j in range(9):
            y=TPOS[j][1];h0=Vector(TPOS[j]);rw=x.r(h0) if y>.1 else (x.f(h0) if y<-.08 else x.c(h0))
            h=max(rw.z-.012,.02)
            tfold[i,j]=math.acos(min(1,h/TLEN[j]))*1.35 if h<TLEN[j] else 0
        for j,s in enumerate('LR'):
            rw=x.f(FANGROOT[s]);L=FANGROOT[s].z-FANGTIPZ[s];h=max(rw.z-.012,.02)
            ffold[i,j]=math.acos(min(1,h/L))*1.6 if h<L else 0
    # limit the rate; the backward pass lets a fold start early rather than miss the floor
    envelope(tfold,.40,loop);envelope(ffold,.40,loop);pins=pincers(poses,loop)
    th=np.zeros((9,2));vl=np.zeros((9,2));th2=np.zeros((9,2));out=[None]*n
    for rnd in range(3 if loop else 1):
        for i in range(n):
            a=np.clip(acc(i),-25,25);pitch=poses[i]['rot'][0];roll=poses[i]['rot'][1]
            drive=np.array((-a[1],a[0]))*.3
            target=np.array((-pitch*.65,-roll*.65))
            vl+=(-(K0[:,None])*(th-target)-(C0[:,None])*vl+drive)*dt
            step=np.clip(vl*dt,-.20,.20);th=th+step
            th2+=(th-th2)*.28
            out[i]=(th.copy(),th2.copy(),tfold[i],ffold[i],pins[i])
    return out

err_log={}
def set_pose(P,spr):
    x=Xf(P);err_log.clear()
    pb=PB['cog'];R=pb.bone.matrix_local.to_3x3();pb.location=R.inverted()@x.cl
    key_rot(pb,x.Rc);key_rot(PB['body_front'],E2Q(P['front']));key_rot(PB['body_rear'],E2Q(P['rear']))
    for l in LEGS:
        c=CH[l];par=l[1]
        if par=='1': D0=x.Df;hw=x.f(c.hip)
        elif par=='2': D0=x.Rc;hw=x.c(c.hip)
        else: D0=x.Dr;hw=x.r(c.hip)
        G,rel,sv,e=c.solve(hw,P['feet'][l]);err_log[l]=e
        key_rot(PB[c.names[0]],D0.inverted()@G)
        for n,q in zip(c.names[1:],rel[1:]): key_rot(PB[n],q)
        if par=='1':
            # pincer: FK off the coxa with a filtered curl and a rate-limited fold about a fixed hinge (see secondary)
            sd=l[0];pc=CH[sd+'p'];sp,phi=spr[4][sd]
            rel2,_=pc.shape(sp)
            key_rot(PB[pc.names[0]],pincer_open(sd,P['pin'][sd],phi))
            for n,q in zip(pc.names[1:],rel2[1:]): key_rot(PB[n],q)
    m=P['mouth'];a=.30
    # the lower lip stops opening once it would meet the floor
    angb=m*a*1.1
    for _ in range(12):
        Rb=E2Q((angb,0,0));z=x.f(BOTH+Rb@(BOTT-BOTH)).z
        if z>=.012 or angb<-.45: break
        angb-=.05
    key_rot(PB['mouth_top'],E2Q((-m*a*.9,0,0)));key_rot(PB['mouth_bot'],E2Q((angb,0,0)))
    key_rot(PB['mouth_L'],E2Q((0,0,-m*a)));key_rot(PB['mouth_R'],E2Q((0,0,m*a)))
    fx,fy,_=P['fang'];th,th2,tf,ff,_p=spr
    for j,s in enumerate('LR'):
        sg=-SIDE[s];fo=ff[j]
        key_rot(PB[f'{s}_fang_1'],E2Q((fx*.35-fo*.55,fy*sg*.35+fo*.25*sg,0)))
        key_rot(PB[f'{s}_fang_2'],E2Q((fx*.4-fo*.35,fy*sg*.35,0)))
        key_rot(PB[f'{s}_fang_3'],E2Q((fx*.3-fo*.25,fy*sg*.3,0)))
    for i,t in enumerate(TEND):
        sx=SPLAY[i][1]*tf[i];sy=SPLAY[i][0]*tf[i]
        key_rot(PB[t+'_1'],E2Q((th[i,0]*.7+sx*.75,th[i,1]*.7-sy*.75,0)))
        key_rot(PB[t+'_2'],E2Q((th2[i,0]+sx*.55,th2[i,1]-sy*.55,0)))
def key_all(frame):
    PB['cog'].keyframe_insert('location',frame=frame)
    for b in PB:
        if b.name!='root': b.keyframe_insert('rotation_quaternion',frame=frame)

meta={};metrics={}
arm.animation_data_create()
_tg={me.vertex_groups[t+k].index for t in TEND for k in ('_1','_2')};BELLY=np.array([v.index for v in me.data.vertices if v.co.x**2+v.co.y**2<.2**2 and v.co.z<.42 and sum(x.weight for x in v.groups if x.group in _tg)<.02])
Ed=np.array([e.vertices[:] for e in me.data.edges]);Co=np.empty(len(me.data.vertices)*3)
me.data.vertices.foreach_get('co',Co);C0=Co.reshape(-1,3);L0=np.linalg.norm(C0[Ed[:,0]]-C0[Ed[:,1]],axis=1);Em=L0>.004
for name,fn,N,loop in CLIPS:
    act=bpy.data.actions.new(name);act.use_fake_user=True;arm.animation_data.action=act
    T=N/FPS;poses=[];speed=0
    for f in range(N+1):
        p,v=fn(f/FPS,T);poses.append(p);speed=v
    spr=secondary(poses[:-1] if loop else poses,loop)
    if loop: spr=spr+[spr[0]]
    reach=0
    for f in range(N+1):
        set_pose(poses[f],spr[f]);key_all(f)
        for l in LEGS:
            if poses[f]['feet'][l][2]<.001: reach=max(reach,err_log[l])
    meta[name]=dict(frames=N,loop=loop,fps=FPS,speed=speed,duration=T)
    sc.frame_start=0;sc.frame_end=N
    lowv=[];tips={l:[] for l in LEGS};whole=[];belly=[];stretch2=0;stretch4=0;sw=0;prev={};pop=[0,''];cogc=[]
    curves=dict(cog_z=[],pitch=[],foot_L1=[],foot_L3=[],foot_R2=[],mouth=[])
    for f in range(N+1):
        sc.frame_set(f);dg=bpy.context.evaluated_depsgraph_get();ao=arm.evaluated_get(dg)
        for l in LEGS: tips[l].append(list(ao.pose.bones[f'{l[0]}_leg{l[1]}_4'].tail))
        eo=me.evaluated_get(dg);em=eo.to_mesh();em.vertices.foreach_get('co',Co);eo.to_mesh_clear();c=Co.reshape(-1,3)
        whole.append(float(c[:,2].min()));lowv.append((float(c[:,2].min()),f,int(c[:,2].argmin())));belly.append(float(c[BELLY,2].min()))
        r=np.linalg.norm(c[Ed[Em,0]]-c[Ed[Em,1]],axis=1)/L0[Em]
        n2=int((r>2).sum());n4=int((r>4).sum())
        if n2>stretch2: stretch2=n2;sw=f
        stretch4=max(stretch4,n4)
        for pb in ao.pose.bones:
            q=pb.matrix.to_quaternion()
            if pb.name in prev:
                d=q.rotation_difference(prev[pb.name]).angle;d=min(d,TAU-d)
                if d>pop[0]: pop=[d,f'{pb.name}@{f}']
            prev[pb.name]=q
        curves['cog_z'].append(float(poses[f]['cog'][2]));curves['pitch'].append(float(poses[f]['rot'][0]));curves['mouth'].append(float(poses[f]['mouth']))
        for k,l in (('foot_L1','L1'),('foot_L3','L3'),('foot_R2','R2')): curves[k].append(float(tips[l][-1][2]))
    slip=0;airmin=9;pl=[]
    for l in LEGS:
        a=np.array(tips[l])
        for i in range(1,len(a)):
            if a[i,2]<.0005 and a[i-1,2]<.0005:
                slip=max(slip,float(np.linalg.norm(a[i,:2]-a[i-1,:2]-np.array((0,speed/FPS)))))
    planted=[sum(1 for l in LEGS if tips[l][i][2]<.001) for i in range(N+1)]
    _lo=min(lowv);_vg=me.data.vertices[_lo[2]].groups;_lb=me.vertex_groups[max(_vg,key=lambda g:g.weight).group].name
    metrics[name]=dict(lowest_vertex_bone=f'{_lb}@{_lo[1]}',planted_foot_reach_error_mm=round(reach*1000,1),planted_slip_mm_per_frame=round(slip*1000,2),whole_mesh_min_z_mm=round(min(whole)*1000,1),belly_shell_min_z_mm=round(min(belly)*1000,1),edges_stretched_over_2x=stretch2,at_frame=sw,edges_stretched_over_4x=stretch4,largest_bone_step_deg=round(math.degrees(pop[0]),1),largest_step_at=pop[1],min_feet_planted=min(planted),loop_seam_mm=(round(max(float(np.linalg.norm(np.array(tips[l][0])-np.array(tips[l][-1]))) for l in LEGS)*1000,2) if loop else None),curves=curves)
    print(name,{k:v for k,v in metrics[name].items() if k!='curves'},flush=True)
json.dump(meta,open(os.path.join(W,'clips.json'),'w'),indent=1)
json.dump(metrics,open(os.path.join(W,'metrics.json'),'w'))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(W,'anim.blend'))
