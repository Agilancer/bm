# The Bone Hydra's clips, baked to bones. Output (in tools/bone_hydra/build): anim.blend, clips.json, metrics.json
# Faces -Y, Z up, in metres at a body height of about .86. Clips are in place; gait clips report their floor speed.
# Rotations are (pitch, roll, yaw) deltas in rest axes: +pitch drops the nose, +yaw turns the nose toward +x.
# The heads are held in world space and the necks hang between them and the chest, as a snake's or a bird's does, so a head
# stays on its target while the body heaves underneath it. Link 3 barely bends: the upper neck's cut is there.
import bpy, os, json, math
import numpy as np
from mathutils import Vector, Euler, Quaternion, Matrix
W=os.path.join(os.path.dirname(os.path.abspath(__file__)),'build')
FPS=30;TAU=2*math.pi
G=5.0  # the fall this big an animal reads best at, in model units
arm=bpy.data.objects['hydra_rig'];me=bpy.data.objects['hydra_mesh'];sc=bpy.context.scene
sc.render.fps=FPS
PB=arm.pose.bones;RB=arm.data.bones
LEGS=['LF','RF','LH','RH'];NK=('l','m','r')
def bn(l,part): return f"{l[0]}_{'fore' if l[1]=='F' else 'hind'}_{part}"
SIDE={'L':-1,'R':1}
def H(n): return Vector(RB[n].head_local)
def T(n): return Vector(RB[n].tail_local)
PIV={l:(H(bn(l,'toe')) if l[1]=='F' else T(bn(l,'paw'))) for l in LEGS}    # the point a paw rolls about, on the floor
ANK={l:H(bn(l,'paw')) for l in LEGS}
PH={'l':0.,'m':2.1,'r':4.2}

def ss(a,b,x):
    t=min(max((x-a)/(b-a),0),1);return t*t*(3-2*t)
def K(t,keys):
    """Eased keys: (time,value[,ease]); the ease belongs to the segment arriving at that key."""
    if t<=keys[0][0]: return keys[0][1]
    for a,b in zip(keys,keys[1:]):
        if t<=b[0]:
            u=(t-a[0])/(b[0]-a[0]);e=b[2] if len(b)>2 else 'ss'
            u={'ss':u*u*(3-2*u),'in':u*u*u,'out':1-(1-u)**3,'lin':u,'in2':u*u,'out2':1-(1-u)**2}[e]
            return a[1]+(b[1]-a[1])*u
    return keys[-1][1]
def hermite(p0,p1,m0,m1,u):
    return (2*u**3-3*u**2+1)*p0+(u**3-2*u**2+u)*m0+(-2*u**3+3*u**2)*p1+(u**3-u**2)*m1
def v3(*a): return np.array(a,float)
def rest(l): return v3(*PIV[l])
def stance(): return {l:dict(k=rest(l),p=0.,t=0.) for l in LEGS}
def base():
    P=dict(cog=np.zeros(3),rot=np.zeros(3),pelvis=np.zeros(3),sp1=np.zeros(3),sp2=np.zeros(3),chest=np.zeros(3),
           n={k:[np.zeros(3) for _ in range(5)] for k in NK},aim={k:np.zeros(3) for k in NK},jaw={k:.03 for k in NK},
           tail=[np.zeros(3) for _ in range(6)],feet=stance(),scap={'L':0.,'R':0.})
    return P
LINK=(.3,.3,.06,.2,.14);CURL=(.42,.38,.0,-.5,-.4);WAVE=(.15,.2,.08,.25,.3)
def head(P,k,pitch=0,yaw=0,roll=0,curl=0,wave=0,ph=0,jaw=None,bend=.6,ap=None,ay=None):
    """Aims one head. curl>0 stretches the neck out in front at the height it's at, curl<0 coils it back. bend is how much of the turn the neck takes."""
    for i in range(5):
        P['n'][k][i]=v3(pitch*bend*LINK[i]+curl*CURL[i],roll*.5*LINK[i],yaw*bend*LINK[i]+wave*WAVE[i]*math.sin(ph+PH[k]-i*.9))
    P['aim'][k]=v3(pitch if ap is None else ap,roll,yaw if ay is None else ay)
    if jaw is not None: P['jaw'][k]=jaw
def spine(P,flex=0,side=0,twist=0):
    """flex>0 arches the back; side bends it, nose toward +x."""
    P['pelvis']=v3(-flex*.8,-twist*.5,-side*.6);P['sp1']=v3(flex*.3,twist*.17,side*.33);P['sp2']=v3(flex*.3,twist*.17,side*.33);P['chest']=v3(flex*.3,twist*.17,side*.33)
def tail(P,pitch,yaw=0,wave=0,ph=0):
    for i in range(6): P['tail'][i]=v3(pitch*(1-.1*i),0,yaw*(.1+.03*i)+wave*math.sin(ph-i*.8)*(.3+.12*i))
def foot(l,phi,v,T_,duty,lift,fore=0,spread=0,pk=.8,hes=False):
    """Stance slides at exactly v; the paw rolls up off its toes, flexes through the swing and opens before it lands."""
    p=phi%1;k=rest(l)+v3(SIDE[l[0]]*spread,fore,0);st=v*duty*T_
    if p<duty:
        k[1]+=st*(-.5+p/duty);return dict(k=k,p=pk*.5*ss(duty*.72,duty,p),t=0.)
    u=(p-duty)/(1-duty);Ts=(1-duty)*T_
    if hes:   # lifts, reaches, hangs in the air, then places its weight down
        k[1]+=st/2-st*(.86*ss(0,.5,u)+.14*ss(.74,1,u));k[2]+=lift*ss(0,.38,u)*(1-ss(.8,1,u))
    else:
        k[1]+=hermite(st/2,-st/2,v*Ts,v*Ts,u);k[2]+=lift*math.sin(math.pi*u**.8)**2
    return dict(k=k,p=pk*(.5+.5*math.sin(math.pi/2*min(u/.35,1)))*(1-ss(.42,.96,u)),t=.45*math.sin(math.pi*u))
def lat(duty,order): return {l:(duty-s)%1 for l,s in order.items()}
def shoulders(P):
    for s in 'LR': P['scap'][s]=(P['feet'][s+'F']['k'][1]-PIV[s+'F'].y)*2.4
def arc(f,t0,t1,dst,h):
    x=min(max((f-t0)/(t1-t0),0),1);u=ss(t0,t1,f);z=h*math.sin(math.pi*x**1.5)
    return v3(*dst)*u+v3(0,0,z)
def add(P,steps,f):
    for l,s_ in steps.items():
        for a,b,d,h in s_:
            P['feet'][l]['k']=P['feet'][l]['k']+arc(f,a,b,d,h)
            if a<f<b: P['feet'][l]['p']+=.6*math.sin(math.pi*(f-a)/(b-a));P['feet'][l]['t']+=.2*math.sin(math.pi*(f-a)/(b-a))
def travelled(name,x):
    """The clip's root motion by frame x: speed ramps up and down over `ramp`, as the viewer and the game do it."""
    R=ROOT.get(name)
    if not R: return 0.
    s,e,d,r=R['start'],R['end'],R['dist'],max(R.get('ramp',0),1e-3);Tt=e-s;t=min(max(x-s,0),Tt);v=d/(Tt-r)
    if t<r: return v*t*t/(2*r)
    if t<Tt-r: return v*(t-r/2)
    return d-v*(Tt-t)**2/(2*r)
def carry(P,name,f,steps,only=LEGS):
    """Holds planted feet still in the world while the root moves the animal over them; each step brings its share back."""
    x=travelled(name,f)
    for l in only: P['feet'][l]['k']=P['feet'][l]['k']+v3(0,x,0)
    add(P,{l:[(a,b,(0,-d,0),h) for a,b,d,h in s_] for l,s_ in steps.items()},f)
def strike(f,t,coil=.45,shot=1.05,hold=8,back=20,dive=.8):
    """A snake's strike timed to land on frame t: slow coil, five frames out, a hold on the bite, a heavy return. Gives curl, pitch and jaw. dive takes the neck down to something standing on the ground."""
    c=K(f,[(t-16,0.),(t-6,-coil),(t-5,-coil),(t,shot,'out2'),(t+hold,shot*.82),(t+hold+back,0.)])
    p=K(f,[(t-16,0.),(t-6,-.22),(t-5,-.22),(t,.3+dive,'out2'),(t+hold,.26+dive*.85),(t+hold+back,0.)])
    j=K(f,[(t-16,.03),(t-7,.28),(t-2,.95),(t-.5,.98),(t+1,-.2,'in'),(t+hold,-.2),(t+hold+8,.2),(t+hold+back,.03)])
    return c,p,j
# ------------- idle -------------
def idle(t,T_):
    # three animals on one body: the middle one keeps watch, the right one noses the ground, the left one looks behind and snaps at the middle
    P=base();f=t*FPS;w=TAU*t/T_;br=math.sin(3*w)
    P['cog']=v3(.005*math.sin(w+.7),.003*math.sin(w),-.01+.004*br)
    P['rot']=v3(.006*br,.012*math.sin(w+.7),0)
    spine(P,.02*br+.01,.018*math.sin(w))
    flinch=K(f,[(108,0.),(114,1.,'out'),(126,0.)])
    head(P,'m',K(f,[(0,.05),(30,.05),(42,-.12),(78,-.12),(92,.18),(124,.18),(138,.05),(180,.05)])-.1*flinch,
         K(f,[(0,0.),(30,0.),(42,.3),(78,.3),(92,-.2),(124,-.2),(138,0.),(180,0.)])+.32*flinch,-.15*flinch,wave=.14,ph=2*w,
         jaw=.03+.04*max(0,br)+K(f,[(114,0.),(118,.5),(130,0.)]))
    head(P,'r',K(f,[(0,0.),(18,0.),(34,.6),(70,.6),(84,-.05),(150,-.05),(166,0.),(180,0.)])+ss(34,40,f)*(1-ss(64,70,f))*.03*math.sin(f*1.5),
         K(f,[(0,.1),(18,.1),(34,.3),(70,.15),(84,.5),(150,.5),(166,.1),(180,.1)]),curl=K(f,[(0,0.),(18,0.),(34,.65),(70,.65),(84,0.)]),wave=.14,ph=2*w+1,
         jaw=.03+K(f,[(40,0.),(44,.2),(50,.04),(58,.2),(64,0.)]))
    head(P,'l',K(f,[(0,0.),(50,0.),(64,-.1),(96,-.1),(108,.05),(112,.14,'out'),(126,.1),(140,0.),(180,0.)]),
         K(f,[(0,-.12),(50,-.12),(64,-.75),(96,-.75),(108,.25),(112,.42,'out'),(126,.36),(142,-.12),(180,-.12)]),curl=K(f,[(96,0.),(106,-.15),(112,.42,'out'),(126,.3),(142,0.)]),wave=.14,ph=2*w+2,
         jaw=K(f,[(0,.04),(100,.04),(109,.75),(112.5,-.02,'in'),(126,0.),(140,.04)]))
    tail(P,.01*br,0,.13,2*w)
    add(P,{'LF':[(70,80,(.0,-.018,0),.022),(150,160,(.0,.018,0),.018)]},f)
    shoulders(P)
    return P,0
# ------------- walks -------------
def walk_stalk(t,T_):
    # belly low, necks out and snaking, the heads gliding dead level: each forepaw is hung and placed, because it weighs what it weighs
    phi=t/T_;P=base();v=.1;duty=.8;w=TAU*phi
    ph=lat(duty,{'LH':0,'LF':.25,'RH':.5,'RF':.75})
    for l in LEGS:
        fore=l[1]=='F';P['feet'][l]=foot(l,phi+ph[l],v,T_,duty,.05 if fore else .035,fore=.005,spread=.008,pk=.6 if fore else .7,hes=fore)
    P['cog']=v3(.012*math.sin(w+.4),0,-.055+.005*math.cos(2*w))
    P['rot']=v3(.03+.008*math.cos(2*w+1),.03*math.sin(w+.4),.012*math.sin(w))
    spine(P,-.02+.012*math.cos(2*w+.5),.05*math.sin(w+.9),.08*math.sin(w+.2))
    for k,y in zip(NK,(-.1,0.,.1)): head(P,k,.14,y,curl=.62,wave=.42,ph=w,jaw=.05+.05*math.sin(w+PH[k]))
    tail(P,.02,0,.16,w);shoulders(P)
    return P,v
def walk_lumber(t,T_):
    # the road gait: rolling shoulders, heads high, each one nodding on its own count
    phi=t/T_;P=base();v=.24;duty=.66;w=TAU*phi
    ph=lat(duty,{'LH':0,'LF':.25,'RH':.5,'RF':.75})
    for l in LEGS: P['feet'][l]=foot(l,phi+ph[l],v,T_,duty,.07 if l[1]=='F' else .05,fore=.008,pk=.85)
    P['cog']=v3(.016*math.sin(w+.3),0,-.02+.008*math.cos(2*w+.6))
    P['rot']=v3(.008+.012*math.cos(2*w+2.1),.035*math.sin(w+.3),.018*math.sin(w))
    spine(P,.008*math.cos(2*w),.06*math.sin(w+1),.1*math.sin(w))
    for k,y in zip(NK,(-.16,.02,.2)):
        head(P,k,-.03+.09*math.cos(2*w+PH[k]),y+.05*math.sin(w+PH[k]),curl=.16,wave=.36,ph=w,jaw=.04+.03*math.sin(w+PH[k]))
    tail(P,.02,0,.26,w);shoulders(P)
    return P,v
# ------------- runs -------------
def run_lumber(t,T_):
    # a rocking three-beat run, necks streamed out in front to balance it
    phi=t/T_;P=base();duty=.46;st=.22;v=st/(duty*T_);w=TAU*phi
    ph=lat(duty,{'RH':0.,'LH':.2,'RF':.22,'LF':.42})
    for l in LEGS: P['feet'][l]=foot(l,phi+ph[l],v,T_,duty,.075 if l[1]=='F' else .07,fore=.012,spread=.012 if l[1]=='H' else -.006,pk=.55 if l[1]=='F' else .8)
    rock=math.sin(w+.5)
    P['cog']=v3(.008*math.sin(w),0,-.04+.015*math.cos(w+3.14))
    P['rot']=v3(.03+.06*rock,.02*math.sin(w+1),.02*math.sin(w))
    spine(P,.05*math.sin(w+2.4),.02*math.sin(w),.05*math.sin(w+.5))
    for k,y in zip(NK,(-.08,0.,.08)):
        head(P,k,.05-.12*math.sin(w+.5+.4*PH[k]),y,curl=.75,wave=.2,ph=w,jaw=.2+.12*math.sin(w+PH[k]),bend=.3)
    tail(P,.14+.1*math.sin(w+1.7),0,.2,w);shoulders(P)
    return P,v
GAL=dict(duty=.34,st=.23,order={'RH':.0,'LH':.16,'LF':.38,'RF':.54})
def run_charge(t,T_):
    # the flat-out gallop, one foot after another and one gathered moment in the air: the back folds and opens under necks that ride it, each its own way
    phi=t/T_;P=base();v=GAL['st']/(GAL['duty']*T_);w=TAU*phi
    ph=lat(GAL['duty'],GAL['order'])
    for l in LEGS: P['feet'][l]=foot(l,phi+ph[l],v,T_,GAL['duty'],.07 if l[1]=='F' else .075,fore=.008,spread=.018 if l[1]=='H' else -.012,pk=.35 if l[1]=='F' else .45)
    c=math.cos(TAU*(phi-.645));n=math.cos(TAU*(phi-.55));z=.022*math.cos(2*TAU*(phi-.145));pit=.1*n
    P['cog']=v3(0,-.012*c,-.015+z)
    P['rot']=v3(.03+pit*.6,.012*math.sin(w),.012*math.sin(w+.6))
    flex=.13*c
    spine(P,.02+flex,0,.03*math.sin(w))
    ride=pit*.6+.9*flex   # what the chest's doing: the necks take most of it out
    for k,y in zip(NK,(-.06,0.,.06)):
        head(P,k,.08-.8*ride+.17*math.sin(w+PH[k]),y,curl=1.05,wave=.1,ph=w,jaw=.42+.2*math.cos(w+PH[k]),bend=.9,ap=.08-.1*ride+.08*math.sin(w+PH[k]))
    tail(P,.2-.14*c,0,.1,w);shoulders(P)
    return P,v
# ------------- attacks -------------
def attack_bite(t,T_):
    # the middle head draws back and shoots out as the body drives behind it, snaps, and wrenches; the other two swing clear and hiss
    P=base();f=t*FPS;H0=20
    env=K(f,[(H0,0.),(H0+2,1.),(H0+6,.7),(H0+12,0.)]);sw=math.sin((f-H0)*TAU/(7+(f-H0)*.15))
    P['cog']=v3(.02*env*sw,K(f,[(0,0.),(12,.04),(15,.045),(H0,-.05,'out'),(36,-.04),(56,0.)]),K(f,[(0,0.),(12,-.04),(15,-.04),(H0,-.02,'out'),(36,-.03),(56,0.)]))
    P['rot']=v3(K(f,[(0,0.),(12,-.08),(15,-.08),(H0,.09,'out'),(36,.06),(56,0.)]),.04*env*sw,.08*env*sw)
    spine(P,K(f,[(0,0.),(12,.12),(15,.12),(H0,-.06,'out'),(36,-.02),(56,0.)]),.07*env*sw)
    c,p,j=strike(f,H0)
    head(P,'m',p,.3*env*sw,.45*env*sw,curl=c,jaw=j,bend=.95,ap=p*.42,ay=.6*env*sw)
    for k,sg in (('r',1),('l',-1)):
        a=K(f,[(0,0.),(14,1.),(36,1.),(54,0.)]);head(P,k,-.1*a,sg*.45*a,curl=-.15*a,wave=.1,ph=f*.1,jaw=.04+.4*a)
    tail(P,K(f,[(0,0.),(12,.12),(H0,.32,'out'),(40,.14),(56,0.)]),0,.14*env,f*.9)
    carry(P,'attack_bite',f,{'RF':[(11,20,.16,.06)],'LF':[(13,22,.16,.06)],'RH':[(7,16,.16,.04)],'LH':[(16,25,.16,.04)]})
    shoulders(P)
    return P,0
def attack_triple_bite(t,T_):
    # right, left, middle, each with the body swung in behind it, walking forward through them
    P=base();f=t*FPS;TT={'r':20,'l':36,'m':52}
    sway=K(f,[(0,0.),(12,-.4),(20,1.,'out'),(28,.3),(36,-1.,'out'),(44,-.3),(52,0.,'out'),(84,0.)])
    drive=max(K(f,[(t_-5,0.),(t_,1.,'out'),(t_+8,.3),(t_+16,0.)]) for t_ in TT.values())
    gather=max(K(f,[(t_-12,0.),(t_-5,1.),(t_,0.,'out')]) for t_ in TT.values())
    P['cog']=v3(.022*sway,.03*gather-.04*drive,-.025-.02*gather+K(f,[(0,.025),(10,0.),(66,0.),(84,.025)]))
    P['rot']=v3(.1*drive-.06*gather,.05*sway,.15*sway)
    spine(P,.1*gather-.05*drive,.12*sway,.07*sway)
    for k,t_ in TT.items():
        c,p,j=strike(f,t_,hold=5,back=16);sg={'r':-.95,'l':.95,'m':0.}[k]
        head(P,k,p,sg*ss(t_-5,t_,f)*(1-ss(t_+5,t_+21,f)),curl=c,jaw=j,wave=.06,ph=f*.15,bend=.95,ap=p*.42,ay=.42*sg*ss(t_-5,t_,f)*(1-ss(t_+5,t_+21,f)))
    tail(P,K(f,[(0,0.),(14,.14),(60,.14),(84,0.)])+.05*drive,-1.3*sway,.1,f*.5)
    carry(P,'attack_triple_bite',f,{'RF':[(14,24,.14,.06),(44,54,.14,.06)],'LF':[(30,40,.28,.07)],'RH':[(20,30,.14,.04),(52,62,.14,.04)],'LH':[(36,46,.28,.05)]})
    shoulders(P)
    return P,0
def reach(P,s,off):
    """Where a forepaw's rolling point goes, offset from the shoulder wherever the body has got to."""
    D,Hw=fk(P);l=s+'F';sc_=bn(l,'scap');hip=Hw['chest']+D['chest']@(CH[l].hip-H('chest'))
    return np.array(hip)+v3(off[0]*SIDE[s],off[1],off[2])
def attack_claw(t,T_):
    # rears over one shoulder with one paw high, the other foot still down, and rakes across; then the other side. Nothing like the stomp, which is both feet at once
    P=base();f=t*FPS;HR,HL=30,54
    pitch=K(f,[(0,0.),(8,.04),(22,-.26,'out'),(27,-.25),(HR+2,-.04,'out'),(HL-5,-.2),(HL+2,-.02,'out'),(HL+7,.05,'in2'),(66,.03),(84,0.)])
    roll=K(f,[(6,0.),(22,-.17),(27,-.17),(HR+2,.1,'out'),(HL-5,.17),(HL-1,.17),(HL+2,-.1,'out'),(68,0.)])
    yaw=K(f,[(10,0.),(24,.2),(HR+2,-.24,'out'),(HL-5,-.22),(HL+2,.24,'out'),(68,0.)])
    P['rot']=v3(pitch,roll,yaw)
    P['cog']=v3(K(f,[(6,0.),(22,-.03),(HR+2,0.),(HL-5,.03),(HL+2,0.,'out'),(68,0.)]),K(f,[(0,0.),(8,-.015),(22,.05),(HR+2,.02,'out'),(HL-4,.04),(HL+2,-.02,'out'),(84,0.)]),K(f,[(0,0.),(8,-.03),(22,.015),(HR+2,-.01),(HL-4,.0),(HL+2,-.035),(HL+7,-.05,'out'),(66,-.02),(84,0.)]))
    spine(P,K(f,[(0,0.),(8,.08),(22,-.08,'out'),(HR+2,.08,'out'),(HL-4,-.04),(HL+2,.1,'out'),(84,0.)]),.5*yaw)
    dn=K(f,[(0,0.),(22,-.3),(HR-3,-.35),(HR+2,.3,'out'),(HL-5,-.1),(HL+2,.42,'out'),(66,.05),(84,0.)])
    for k,sg,lag in (('r',1,1),('m',0,2),('l',-1,3)):
        head(P,k,dn*1.1,sg*.3*ss(8,20,f)*(1-ss(HL+2,80,f))-yaw*.7,curl=K(f,[(0,0.),(22,-.25),(HR-3,-.3),(HL+lag,.6,'out'),(68,.2),(84,0.)]),wave=.08,ph=f*.2,
             jaw=K(f,[(0,.03),(14,.5),(HR,.85),(HL-2,.6),(HL+2,.95),(HL+14,.2),(84,.03)]))
    tail(P,K(f,[(0,0.),(22,.4),(HL+2,.16),(84,0.)]),-1.2*yaw,.06,f*.5)
    for s,t0,l0,r0 in (('R',HR,5,66),('L',HL,36,74)):
        l=s+'F';r=rest(l);mid=.5*(l0+t0-5);A=v3(.1,-.18,.02)
        if f>l0:
            st=(r-reach(P,s,(0,0,0)))*v3(SIDE[s],1,1)
            o=K(f,[(l0,st),(mid,A),(t0-5,v3(.17,-.16,.2)),(t0-1,v3(.13,-.2,.24)),(t0+3,v3(.05,-.3,-.05),'in2'),(t0+6,v3(.0,-.26,-.22),'lin'),(t0+10,v3(-.02,-.2,-.3),'out')])
            g=ss(t0+6,t0+11,f);q=reach(P,s,o)
            q=q*(1-g)+(r+v3(-SIDE[s]*.02,-.1,0))*g;ret=ss(r0,r0+8,f);q=q*(1-ret)+r*ret+v3(0,0,.03*math.sin(math.pi*ret));q[2]=max(q[2],r[2])
            P['feet'][l]=dict(k=q,p=K(f,[(l0,0.),(mid,.85),(t0-1,-.3),(t0+6,.25),(t0+10,0.)]),t=K(f,[(l0,0.),(t0-1,-.3),(t0+6,.45),(t0+10,0.)]))
        P['scap'][s]=K(f,[(l0,0.),(t0-1,-.3),(t0+6,-.1),(t0+14,0.)])
    add(P,{'LH':[(2,7,(-.018,.022,0),.025),(72,77,(.018,-.022,0),.025)],'RH':[(4,9,(.018,.03,0),.025),(75,80,(-.018,-.03,0),.025)]},f)
    return P,0
def attack_tail_sweep(t,T_):
    # slews its hips away, then throws them round and cracks the tail in a flat arc across the side and rear, heads still on the target
    P=base();f=t*FPS;HIT=30
    yaw=K(f,[(0,0.),(16,-.32),(20,-.34),(HIT,.32,'out'),(HIT+8,.38),(62,.0)])
    P['rot']=v3(K(f,[(0,0.),(16,.03),(HIT,.1),(46,.05),(70,0.)]),K(f,[(0,0.),(16,.05),(HIT,-.08,'out'),(44,-.03),(62,0.)]),yaw)
    P['cog']=v3(K(f,[(0,0.),(16,.02),(HIT,-.03,'out'),(62,0.)]),K(f,[(0,0.),(16,.01),(HIT,-.02),(62,0.)]),K(f,[(0,0.),(16,-.04),(HIT,-.02),(38,-.035),(62,0.)]))
    # the hips lead and the chest holds back, so it's the rear of the animal that swings
    spine(P,K(f,[(0,0.),(16,.06),(62,0.)]),-.55*yaw)
    for k,sg in zip(NK,(-.18,0.,.18)):
        head(P,k,K(f,[(0,0.),(16,.08),(40,.08),(66,0.)]),sg*K(f,[(0,0.),(16,1.),(50,1.),(70,0.)])-yaw*.2,curl=K(f,[(0,0.),(16,.25),(44,.25),(66,0.)]),wave=.1,ph=f*.12,bend=.75,
             jaw=K(f,[(0,.03),(14,.2),(HIT,.6),(46,.1),(70,.03)]))
    # the tail winds up to one side and sweeps through nearly straight, from the root, each joint a little after the last
    pt=K(f,[(0,0.),(18,.22),(HIT,.22),(46,.14),(66,0.)])
    for i,a in enumerate((.42,.24,.14,.09,.07,.04)):
        ty=K(f-i*1.1,[(0,0.),(16,-.95),(23,-.9),(HIT+5,.95),(HIT+12,.7),(66,0.)])
        P['tail'][i]=v3(pt*(1-.1*i),0,ty*a+.03*ss(HIT,HIT+6,f)*(1-ss(HIT+14,62,f))*math.sin(f*.8-i*.8)*(.3+.12*i))
    P['tlag']=.2
    add(P,{'RH':[(13,20,(.04,.05,0),.04),(46,54,(-.04,-.05,0),.03)],'LH':[(25,31,(-.05,-.05,0),.045),(54,62,(.05,.05,0),.03)],'RF':[(30,37,(.03,-.03,0),.05),(58,66,(-.03,.03,0),.03)],'LF':[(10,18,(.02,.03,0),.04),(62,70,(-.02,-.03,0),.03)]},f)
    shoulders(P)
    return P,0
def attack_stomp(t,T_):
    # hauls its whole front end off the ground with its heads thrown back, and comes down on both forefeet; the necks land a beat late
    P=base();f=t*FPS;HIT=34
    pitch=K(f,[(0,0.),(9,.05),(24,-.5,'out'),(29,-.5),(HIT,.1,'in2'),(HIT+4,.14,'out'),(HIT+12,.06),(80,0.)])
    P['rot']=v3(pitch,K(f,[(10,0.),(24,.04),(HIT,-.02),(HIT+10,0.)]),0)
    P['cog']=v3(0,K(f,[(0,0.),(9,-.015),(24,.05),(29,.05),(HIT,-.02,'in2'),(HIT+14,-.01),(80,0.)]),K(f,[(0,0.),(9,-.05),(14,-.04),(24,.03,'out'),(29,.03),(HIT,-.04,'in2'),(HIT+3,-.055,'out'),(HIT+14,-.025),(80,0.)]))
    spine(P,K(f,[(0,0.),(9,.12),(24,-.14,'out'),(29,-.14),(HIT,.1),(HIT+6,.16,'out'),(80,0.)]))
    for k,sg,lag in (('r',1,3),('m',0,1),('l',-1,5)):
        up=K(f,[(4,0.),(24,1.),(HIT-2,1.),(HIT+3+lag,-1.1,'in2'),(HIT+7+lag,-.75,'out'),(HIT+14+lag,-.9),(74,0.)])
        head(P,k,-.42*up,sg*.3*max(0,up),curl=-.4*up,wave=.06*max(up,0),ph=f*.2,jaw=K(f,[(0,.03),(12,.2),(24,.85),(HIT+1,.95),(HIT+8,.6),(HIT+24,.15),(80,.03)]),bend=.7)
    tail(P,K(f,[(0,0.),(24,.5),(HIT,.5),(HIT+6,-.02,'out'),(HIT+12,.16),(80,0.)]))
    for s in 'LR':
        l=s+'F';r=rest(l)+v3(0,-.0,0);g=ss(HIT-5,HIT,f);u=ss(8,20,f)
        if f>8:
            q=reach(P,s,K(f,[(8,(r-reach(P,s,(0,0,0)))*v3(SIDE[s],1,1)),(20,v3(.03,-.2,-.12)),(28,v3(.04,-.21,-.09))]))
            q=q*(1-g*g)+r*g*g;q[2]=max(q[2],r[2]);P['feet'][l]=dict(k=q,p=K(f,[(8,0.),(20,.8),(30,.5),(HIT,0.,'in2')]),t=K(f,[(8,0.),(20,.3),(HIT,0.)]))
    # the root carries it forward in the air, so the hinds have to follow afterward
    carry(P,'attack_stomp',f,{'RH':[(HIT+6,HIT+16,.16,.04)],'LH':[(HIT+12,HIT+22,.16,.04)]},only=('LH','RH'))
    for s in 'LR': P['scap'][s]=K(f,[(8,0.),(20,-.32),(HIT-3,-.32),(HIT,.05,'in2'),(HIT+6,0.)])
    return P,0
def blast(f,t0,t1,n):
    """A head breathing fire from t0 to t1: draws a slow breath, throws forward into it, shudders with the force, chokes it off."""
    inh=K(f,[(t0-26,0.),(t0-8,1.),(t0-5,1.),(t0+3,0.,'out')]);on=K(f,[(t0-5,0.),(t0+3,1.,'out'),(t1-2,1.),(t1+8,0.)])
    trem=on*math.sin(f*1.15+n);jaw=K(f,[(t0-26,.03),(t0-6,.3),(t0-1,.4),(t0+1,1.),(t1,.92),(t1+5,.4),(t1+22,.03)])+.03*trem
    return inh,on,trem,jaw
def attack_fire_cone(t,T_):
    # the middle head takes a breath the whole body feels, then lays a long fire straight ahead, braced against its own force
    P=base();f=t*FPS;t0,t1=34,84
    inh,on,trem,jaw=blast(f,t0,t1,0)
    P['cog']=v3(.002*trem,.03*on-.02*inh,-.03*on+.012*inh)
    P['rot']=v3(-.14*inh+.04*on+.006*trem,0,.05*math.sin((f-t0)*TAU/50)*on)
    spine(P,-.16*inh+.1*on+.012*trem,.08*math.sin((f-t0)*TAU/50)*on)
    sweep=.22*math.sin((f-t0)*TAU/50)
    head(P,'m',-.6*inh+.12*on+.012*trem,sweep*on,curl=-.55*inh+.62*on,jaw=jaw,bend=.45)
    for k,sg in (('r',1),('l',-1)):
        a=K(f,[(0,0.),(24,1.),(t1,1.),(t1+24,0.)]);head(P,k,-.2*a,sg*.5*a,curl=-.25*a,wave=.1,ph=f*.1,jaw=.03+.3*a)
    tail(P,.3*inh+.14*on,0,.1*on,f*.3)
    add(P,{'LF':[(10,20,(-.02,-.05,0),.04),(t1+8,t1+18,(.02,.05,0),.03)],'RH':[(14,24,(.02,.04,0),.03),(t1+12,t1+22,(-.02,-.04,0),.03)]},f)
    shoulders(P)
    return P,0
def attack_fire_triple(t,T_):
    # one, then two, then all three, the outer heads angled in, so the fires cross on whatever's in front of it
    P=base();f=t*FPS;TT={'r':(36,84),'l':(44,88),'m':(52,92)}
    pul=max(K(f,[(a-26,0.),(a-5,1.),(a+2,0.)]) for a,_ in TT.values());on=min(1,sum(K(f,[(a-2,0.),(a+2,.4),(b,.4),(b+8,0.)]) for a,b in TT.values()))
    P['cog']=v3(0,.04*on-.02*pul,.012*pul-.04*on)
    P['rot']=v3(-.12*pul+.03*on,0,0);spine(P,-.14*pul+.1*on+.012*math.sin(f*1.2)*on)
    for k,sg in (('r',-.16),('l',.16),('m',0.)):
        a,b=TT[k];inh,o,trem,jaw=blast(f,a,b,PH[k]);fan=K(f,[(0,0.),(a-20,1.),(a-2,1.),(a+2,0.)])*{'r':.4,'l':-.4,'m':0.}[k]
        head(P,k,-.55*inh+.1*o+.012*trem,sg*o+fan+.08*o*math.sin((f-a)*TAU/40),curl=-.5*inh+.5*o,jaw=jaw,bend=.45)
    tail(P,.28*pul+.2*on,0,.12*on,f*.3)
    add(P,{'LF':[(8,18,(-.02,-.05,0),.04),(100,110,(.02,.05,0),.03)],'RF':[(14,24,(.02,-.05,0),.04),(104,114,(-.02,.05,0),.03)]},f)
    shoulders(P)
    return P,0
def attack_fire_sweep(t,T_):
    # the two outer heads come down on either side and rake fire along the ground, closing in; the middle head holds high and roars them on
    P=base();f=t*FPS;t0,t1=32,86
    for k,sg in (('r',1),('l',-1)):
        inh,on,trem,jaw=blast(f,t0,t1,PH[k]);u=(f-t0)/(t1-t0);s_=ss(0,1,u)
        y=sg*K(f,[(0,.0),(t0-6,.95),(t1,-.1),(t1+22,0.)])
        head(P,k,-.45*inh+on*.75+.012*trem,y,curl=-.3*inh+1.1*on,jaw=jaw,bend=1.1,ap=-.45*inh+on*.08+.012*trem,ay=y*.7)
    m=K(f,[(0,0.),(22,1.),(t1+6,1.),(t1+28,0.)]);head(P,'m',-.5*m+.06*m*math.sin(f*.23),.12*m*math.sin(f*.11),curl=-.4*m,wave=.1*m,ph=f*.15,jaw=.03+(.85-.1*(.5+.5*math.sin(f*.37)))*K(f,[(0,0.),(t0-2,.15),(t0+2,1.),(t1,1.),(t1+10,0.)]),bend=.7)
    pul=K(f,[(6,0.),(t0-5,1.),(t0+2,0.,'out')]);on=K(f,[(t0-2,0.),(t0+2,1.,'out'),(t1-2,1.),(t1+8,0.)])
    P['cog']=v3(0,.02*on-.015*pul,-.05*on+.012*pul)
    P['rot']=v3(-.1*pul+.12*on,0,0);spine(P,-.12*pul+.12*on+.01*math.sin(f*1.2)*on)
    tail(P,.28*pul+.1*on,0,.14*on,f*.25)
    add(P,{'LF':[(8,18,(-.03,-.04,0),.04),(t1+8,t1+18,(.03,.04,0),.03)],'RF':[(12,22,(.03,-.04,0),.04),(t1+12,t1+22,(-.03,.04,0),.03)]},f)
    shoulders(P)
    return P,0
def jump(t,T_):
    # a huge weight getting off the ground: a deep crouch, the necks thrown up to help, and a landing that takes all of it
    P=base();f=t*FPS;v0=1.25;t0,t1=20,36
    def air(x): tt=(x-t0)/FPS;return .03+v0*tt-.5*G*tt*tt
    if f<=t0: z=K(f,[(0,0.),(14,-.06),(17,-.065),(20,.03,'lin')])
    elif f<t1: z=air(f)
    else: z=K(f,[(t1,air(t1)),(42,-.055,'out2'),(48,-.04),(56,.01),(66,0.)])
    P['cog']=v3(0,K(f,[(31,0.),(41,-.05,'out2'),(66,0.)]),z)
    P['rot']=v3(K(f,[(0,0.),(14,.09),(17,.1),(21,-.22,'out'),(28,-.02),(35,.16),(41,.18),(50,0.),(66,0.)]),0,0)
    spine(P,K(f,[(0,0.),(14,.14),(17,.15),(21,-.12,'out'),(28,.1),(37,-.04),(42,.08),(66,0.)]))
    for k,lag in zip(NK,(2,0,1)):
        up=K(f,[(0,0.),(14,.5),(21+lag,-.5,'out'),(32,.2),(40+lag,.9,'in2'),(46+lag,.45,'out'),(66,0.)])
        head(P,k,-.1+.26*up*.5,{'l':-.16,'m':0.,'r':.16}[k]*ss(10,24,f)*(1-ss(46,62,f)),curl=up*.7,jaw=K(f,[(0,.03),(14,.15),(26,.5),(36,.3),(42,.5),(66,.03)]),bend=.3)
    tail(P,K(f,[(0,0.),(14,.08),(21,-.22),(30,.32),(38,.28),(44,-.12),(66,0.)]))
    for l,b in P['feet'].items():
        fore=l[1]=='F';pos=b['k'].copy();u=min(max((f-t0)/(t1-t0),0),1)
        win=ss(16,19,f)*(1-ss(30,33.5,f)) if fore else ss(19,22,f)*(1-ss(34,38.5,f))
        pos[2]+=(max(0,z-.02)+.06*math.sin(math.pi*u)**2)*win;pos[1]+=(-.04 if fore else .025)*math.sin(math.pi*u)**2
        fl=.85*math.sin(math.pi*u);P['feet'][l]=dict(k=pos,p=fl,t=.4*fl)
    shoulders(P)
    return P,0
# ------------- taunts -------------
def taunt_roar(t,T_):
    # the three heads go up one after another and hold one long chord, fanned wide, with the chest pumping under them
    P=base();f=t*FPS;TT={'m':26,'r':34,'l':42}
    roar=K(f,[(22,0.),(30,1.),(84,1.),(94,0.)]);pump=sum(K(f,[(a,0.),(a+3,1.,'out'),(a+14,0.)]) for a in (30,48,66));tr=roar*math.sin(f*1.25)
    P['cog']=v3(.002*tr,K(f,[(0,0.),(16,-.01),(30,.04),(86,.04),(100,0.),(120,0.)])-.02*pump,K(f,[(0,0.),(16,-.03),(30,.02),(86,.015),(100,-.015),(104,-.04,'out'),(110,-.01),(120,0.)])-.008*pump)
    P['rot']=v3(K(f,[(0,0.),(16,.05),(30,-.17,'out'),(86,-.15),(100,.03),(120,0.)])+.07*pump,.004*tr,0)
    spine(P,K(f,[(0,0.),(16,.1),(30,-.13,'out'),(86,-.1),(100,.03),(120,0.)])+.12*pump,0,.006*tr)
    for k,sg in (('l',-1),('m',0),('r',1)):
        a=TT[k];u=K(f,[(a-14,0.),(a-6,-.2),(a+4,1.,'out'),(86+(a-26)//3,.85),(100+(a-26)//3,0.)])
        head(P,k,-.75*u+.012*tr,sg*.42*max(u,0)+sg*.04*roar*math.sin(f*.11),sg*.12*max(u,0),curl=-.3*u,jaw=K(f,[(a-14,.03),(a-1,.25),(a+5,1.),(84,.85),(94,.1),(110,.03)])-.1*(1-min(pump,1))*roar,bend=.75)
    tail(P,K(f,[(0,0.),(30,.3),(86,.28),(105,0.)]),0,.1*roar,f*1.1)
    P['feet']['LF']['k']=P['feet']['LF']['k']+v3(0,0,K(f,[(94,0.),(100,.09),(103,0.,'in2')]));P['feet']['LF']['p']=K(f,[(94,0.),(100,.45),(103,0.,'in2')])
    shoulders(P)
    return P,0
def taunt_bicker(t,T_):
    # the heads fall out: the right snaps at the middle, the left at the right, a scuffle, then all three at once turn and stare at you
    P=base();f=t*FPS
    s=K(f,[(10,0.),(20,.8),(26,.2),(40,-.9),(46,-.3),(58,.7),(64,.0),(84,0.)])
    P['cog']=v3(.02*s,0,K(f,[(0,0.),(14,-.015),(78,-.02),(90,.01),(108,0.)]));P['rot']=v3(0,.04*s,.08*s);spine(P,K(f,[(0,0.),(20,.05),(70,.05),(90,-.05),(108,0.)]),.1*s)
    stare=K(f,[(68,0.),(74,1.,'out'),(100,1.),(112,0.)])
    def blend(a,b): return a*(1-stare)+b*stare
    # who's at whom
    head(P,'r',blend(K(f,[(0,0.),(14,-.1),(20,.15,'out'),(30,.1),(52,-.05),(58,.2,'out'),(66,0.)]),.12),blend(K(f,[(0,.1),(14,.3),(20,-.62,'out'),(30,-.5),(38,.42,'out'),(50,.3),(58,-.62,'out'),(66,-.2)]),-.1),curl=blend(K(f,[(0,0.),(14,-.2),(20,.5,'out'),(30,.3),(38,0.),(52,-.1),(58,.45,'out')]),.45),jaw=blend(K(f,[(0,.03),(13,.8),(19.5,-.02,'in'),(30,.05),(36,.5),(50,.5),(57.5,-.02,'in'),(66,.1)]),.3),bend=.75)
    head(P,'m',blend(K(f,[(0,0.),(18,-.12),(24,-.2,'out'),(40,-.05),(56,-.05),(60,-.18,'out')]),.1),blend(K(f,[(0,0.),(16,.05),(21,.42,'out'),(34,.3),(42,-.1),(54,.25),(60,.45,'out'),(66,.3)]),0.),curl=blend(K(f,[(0,0.),(20,-.2),(40,0.)]),.55),jaw=blend(K(f,[(0,.03),(21,.2),(25,.75),(36,.55),(44,.1),(60,.7),(66,.5)]),.3),bend=.75)
    head(P,'l',blend(K(f,[(0,0.),(26,-.05),(34,-.15),(40,.14,'out'),(48,.1),(64,0.)]),.12),blend(K(f,[(0,-.1),(26,-.3),(34,-.32),(40,.5,'out'),(48,.42),(64,.1)]),.1),curl=blend(K(f,[(0,0.),(32,-.18),(40,.55,'out'),(48,.35),(64,0.)]),.45),jaw=blend(K(f,[(0,.03),(33,.85),(39.5,-.02,'in'),(50,.05),(64,.2)]),.3),bend=.75)
    tail(P,K(f,[(0,0.),(14,.14),(80,.14),(100,0.)]),-1.1*s,.1,f*.4)
    add(P,{'LF':[(14,20,(-.015,-.02,0),.03),(84,92,(.015,.02,0),.03)],'RF':[(44,50,(.015,-.02,0),.03),(90,98,(-.015,.02,0),.03)]},f)
    shoulders(P)
    return P,0
def hurt(t,T_):
    # recoils when a neck is cut: the body jerks back, the heads flinch up and away, and it finds its feet again
    P=base();f=t*FPS;J=K(f,[(0,0.),(4,1.,'out'),(12,.6),(36,0.)])
    P['cog']=v3(0,.05*J,-.035*J);P['rot']=v3(-.16*J,.04*J*math.sin(f*.8),0);spine(P,.14*J)
    for k,sg,d,a in (('l',-1,2,1.),('m',0,0,.8),('r',1,4,1.2)):
        Jk=K(f-d,[(0,0.),(4,1.,'out'),(12,.6),(36,0.)])*a;head(P,k,-.45*Jk,sg*.35*Jk,curl=-.42*Jk,wave=.22*Jk,ph=f*.6,jaw=.03+.75*Jk,bend=.7)
    tail(P,.22*J,0,.15*J,f*.5)
    add(P,{'LF':[(3,10,(0,.03,0),.04),(18,27,(0,-.03,0),.03)],'RF':[(5,12,(0,.03,0),.04),(20,29,(0,-.03,0),.03)]},f)
    shoulders(P)
    return P,0
def death(t,T_):
    # thrashes, the legs go out from under it and the belly hits; the necks stay up a moment longer, then come down one after the other, right onto the ground
    P=base();f=t*FPS;e=lambda *k:K(f,list(k))
    P['cog']=v3(e((10,0.),(44,.03)),e((0,0.),(8,.03),(44,-.01)),e((0,0.),(8,.012),(20,-.04),(32,-.045),(40,-.075,'in2'),(44,-.06,'out'),(48,-.08,'in2'),(54,-.075)))
    P['rot']=v3(e((0,0.),(8,-.14),(22,.05),(38,.09),(46,.05)),e((0,0.),(22,-.04),(40,.1),(46,.07)),e((10,0.),(44,.05)))
    spine(P,e((0,0.),(8,-.1),(24,.08),(46,-.04)),e((26,0.),(46,.06)))
    for k,t0,sg in (('m',46,0),('r',56,1),('l',68,-1)):
        up=K(f,[(0,0.),(8,1.),(t0-14,.75),(t0-6,.9),(t0,0.,'in2')])
        down=K(f,[(t0-8,0.),(t0,1.,'in2'),(t0+3,.9,'out'),(t0+6,1.,'in2'),(t0+8,.97),(t0+10,1.)])
        head(P,k,-.5*up,sg*.3*up+.25*(1-down)*math.sin(f*.5+PH[k])*min(1,up*1.4),roll=(sg or 1)*.55*down,curl=-.35*up,wave=.18*(1-down),ph=f*.5,jaw=K(f,[(0,.03),(8,.9),(t0-4,.7),(t0+2,.15),(t0+8,.3)]),bend=.9,ap=-.5*up+down*.2,ay=sg*.3*up+sg*.55*down)
        for i,a in enumerate((1.25,1.,.08,.3,.12)): P['n'][k][i]=P['n'][k][i]+down*v3(a*(1.1 if k=='l' else 1),0,sg*.45*LINK[i])
    tail(P,e((0,0.),(8,.2),(30,-.05),(46,-.08)),e((30,0.),(52,.9)))
    for l,b in P['feet'].items():
        sg=SIDE[l[0]];fore=l[1]=='F';u=ss(10,30,f) if fore else ss(18,38,f)
        k=b['k']+v3(sg*(.09 if fore else .11)*u,(-.06 if fore else .08)*u,.03*math.sin(math.pi*u)**2)
        P['feet'][l]=dict(k=k,p=.12*u,t=.1*u)
    shoulders(P)
    return P,0

# How far each clip carries the animal over which frames. The clips themselves stay in place.
ROOT={'attack_bite':dict(start=11,end=22,ramp=2,dist=.16),'attack_triple_bite':dict(start=14,end=62,ramp=6,dist=.28),'attack_stomp':dict(start=18,end=34,ramp=3,dist=.16),'jump':dict(start=21,end=35,ramp=2,dist=.42)}
# Which head does what when: the game lands its hits and lights its fires from these.
HITS={'attack_bite':[('m',20)],'attack_triple_bite':[('r',20),('l',36),('m',52)],'attack_claw':[('R',31),('L',55)],'attack_tail_sweep':[('tail',30)],'attack_stomp':[('both',34)]}
FIRE={'attack_fire_cone':[('m',34,84)],'attack_fire_triple':[('r',36,84),('l',44,88),('m',52,92)],'attack_fire_sweep':[('r',32,86),('l',32,86)]}
CLIPS=[('idle',idle,180,True),('walk_stalk',walk_stalk,72,True),('walk_lumber',walk_lumber,44,True),('run_lumber',run_lumber,20,True),('run_charge',run_charge,15,True),
       ('attack_bite',attack_bite,56,False),('attack_triple_bite',attack_triple_bite,84,False),('attack_claw',attack_claw,84,False),('attack_tail_sweep',attack_tail_sweep,72,False),('attack_stomp',attack_stomp,80,False),
       ('attack_fire_cone',attack_fire_cone,110,False),('attack_fire_triple',attack_fire_triple,122,False),('attack_fire_sweep',attack_fire_sweep,118,False),
       ('jump',jump,66,False),('taunt_roar',taunt_roar,120,False),('taunt_bicker',taunt_bicker,112,False),('hurt',hurt,36,False),('death',death,92,False)]

# ------------- solver -------------
def E2Q(e): return Euler(tuple(float(x) for x in e),'XYZ').to_quaternion()
def key_rot(pb,q):
    Rr=pb.bone.matrix_local.to_quaternion();pb.rotation_quaternion=Rr.inverted()@q@Rr
class Chain:
    """Scales all the limb's rest bends together, which keeps its shape, then aims hip to target."""
    def __init__(self,names):
        self.names=names;self.bones=[RB[n] for n in names]
        self.hip=Vector(self.bones[0].head_local)
        self.r=[Vector(b.tail_local)-Vector(b.head_local) for b in self.bones]
        self.ax=[None];self.ang=[0]
        for a,c in zip(self.r,self.r[1:]):
            x=a.cross(c);self.ax.append(x.normalized() if x.length>1e-6 else Vector((1,0,0)));self.ang.append(a.angle(c))
        # The source's legs stand nearly straight, so the limit's on the bend, not on the ratio. A hind leg shortens at the
        # knee: its hock bends the other way, and folding both together only makes a zigzag about as long as it started.
        self.g=[1,1] if len(names)==2 else [1,1,.3]
        self.fold=2.3/max(self.ang) if len(names)==2 else 2.6/self.ang[1]
        tip0=sum(self.r,Vector((0,0,0)));self.n=tip0.cross(self.r[0]).normalized()
    def frame(self,d):
        x=d.normalized();z=(self.n-self.n.dot(x)*x).normalized();y=z.cross(x)
        return Matrix((x,y,z)).transposed().to_quaternion()
    def shape(self,s):
        D=Quaternion();rel=[];p=Vector((0,0,0))
        for i,v in enumerate(self.r):
            q=Quaternion() if i==0 else Quaternion(self.ax[i],self.ang[i]*(s-1)*self.g[i])
            D=D@q;rel.append(q);p=p+D@v
        return rel,p,D
    def solve(self,hip_w,target):
        d=Vector(target)-hip_w;dist=d.length
        a,b=.05,self.fold;dmax=self.shape(a)[1].length;dmin=self.shape(b)[1].length;err=0
        if dist>=dmax: s=a;err=dist-dmax
        elif dist<=dmin:
            s=b;xy=math.hypot(d.x,d.y);z0=d.z
            d=Vector((d.x,d.y,-math.sqrt(max(dmin*dmin-xy*xy,1e-6)))) if xy<dmin else d.normalized()*dmin
            self.push=abs(z0-d.z)
        else:
            for _ in range(24):
                m=.5*(a+b)
                if self.shape(m)[1].length>dist: a=m
                else: b=m
            s=.5*(a+b)
        rel,tip,Dend=self.shape(s)
        G=self.frame(d)@self.frame(tip).inverted()
        return G,rel,G@Dend,err
CH={l:Chain([bn(l,'upper'),bn(l,'fore')] if l[1]=='F' else [bn(l,'thigh'),bn(l,'shin'),bn(l,'meta')]) for l in LEGS}
DMAX={l:CH[l].shape(.05)[1].length for l in LEGS}
BODY=[('cog','root','rot'),('pelvis','cog','pelvis'),('spine_1','cog','sp1'),('spine_2','spine_1','sp2'),('chest','spine_2','chest')]
def fk(P):
    D={'root':Quaternion()};Hw={'root':Vector((0,0,0))}
    for n,par,key in BODY:
        if n=='cog': Hw[n]=H('cog')+Vector(P['cog'])
        else: Hw[n]=Hw[par]+D[par]@(H(n)-H(par))
        D[n]=D[par]@E2Q(P[key])
    for k in NK:
        par='chest'
        for i in range(5):
            n=f'{k}_{i+1}';Hw[n]=Hw[par]+D[par]@(H(n)-H(par));D[n]=D[par]@E2Q(P['n'][k][i]);par=n
        n=f'{k}_head';Hw[n]=Hw[par]+D[par]@(H(n)-H(par));D[n]=E2Q(P['aim'][k])
    return D,Hw
def child(D,Hw,par,n,q=None):
    Hw[n]=Hw[par]+D[par]@(H(n)-H(par));D[n]=D[par]@(q if q is not None else Quaternion());return Hw[n]
def settle(P):
    """A rear or a breath goes up only as far as the legs reach: planted feet stay down and the body gives way instead."""
    dz=0.;dp=0.
    for _ in range(12):
        D,Hw=fk(P);sh={}
        for l in LEGS:
            f=P['feet'][l]
            if f['k'][2]>PIV[l].z+.002: continue
            ank=Vector(f['k'])+Vector((0,0,.03*min(max(f['p'],0),1)))+Quaternion((1,0,0),f['p'])@(ANK[l]-PIV[l])
            if l[1]=='F':
                sc_=bn(l,'scap');child(D,Hw,'chest',sc_,Quaternion((1,0,0),P['scap'][l[0]]));hw=Hw[sc_]+D[sc_]@(CH[l].hip-H(sc_))
            else: hw=Hw['pelvis']+D['pelvis']@(CH[l].hip-H('pelvis'))
            sh[l]=(ank-hw).length-DMAX[l]
        fo=max([v for l,v in sh.items() if l[1]=='F']+[0]);hi=max([v for l,v in sh.items() if l[1]=='H']+[0])
        if fo<.0004 and hi<.0004: break
        a=min(.45*fo+.6*hi,.035-dz);b=max(min(1.2*(fo-hi),.18-dp),-.18-dp);dz+=a;dp+=b
        if a<1e-5 and abs(b)<1e-5: break
        P['cog']=P['cog']+v3(0,0,-a);P['rot']=P['rot']+v3(b,0,0)
HEAD_CAP=math.radians(25)
def cap_heads(P):
    for k in NK:
        for _ in range(3):
            D,Hw=fk(P);rel=D[f'{k}_5'].inverted()@D[f'{k}_head'];a=rel.angle
            if a>math.pi: a=TAU-a
            if a<=HEAD_CAP: break
            q=Quaternion().slerp(rel,(a-HEAD_CAP)/a*.7)
            P['n'][k]=list(P['n'][k])
            P['n'][k][4]=np.array((E2Q(P['n'][k][4])@q).to_euler('XYZ'))
            P['n'][k][3]=np.array((E2Q(P['n'][k][3])@Quaternion().slerp(q,.6)).to_euler('XYZ'))
CLEAR=(.05,.055,.06,.07,.1)   # how far above the floor each neck joint has to stay: the thickness of the neck there, and the depth of the head
def floor_necks(P):
    """Bends a neck back up, link by link, where a pose would put it through the floor."""
    for k in NK:
        for i in range(5):
            def low(d):
                Q=dict(P);Q['n']=dict(P['n']);Q['n'][k]=list(P['n'][k]);Q['n'][k][i]=P['n'][k][i]-v3(d,0,0)
                D,Hw=fk(Q);n=f'{k}_{i+1}';return float((Hw[n]+D[n]@(T(n)-H(n))).z)-CLEAR[i]
            if low(0)>=0: continue
            a,b=0.,1.6
            for _ in range(10):
                m=.5*(a+b)
                if low(m)>=0: b=m
                else: a=m
            P['n'][k]=list(P['n'][k]);P['n'][k][i]=P['n'][k][i]-v3(b,0,0)

# ------------- secondary motion -------------
SINGLE=[('drape_L','l_2'),('drape_R','r_2')]
FOLLOW=(.2,.3,.05,.28,.28)
def rv(q):
    a=q.axis*q.angle if q.angle<math.pi else q.axis*(q.angle-TAU);return np.array(a)
def rvq(v):
    a=float(np.linalg.norm(v));return Quaternion(Vector(v/a),a) if a>1e-7 else Quaternion()
def envelope(arr,lim,loop):
    n=len(arr)
    for _ in range(2 if loop else 1):
        for i in (range(n) if loop else range(1,n)): arr[i]=np.maximum(arr[i],arr[i-1]-lim)
        for i in (range(n-1,-1,-1) if loop else range(n-2,-1,-1)): arr[i]=np.maximum(arr[i],arr[(i+1)%n]-lim)
def neck_weight(poses,loop):
    """Necks this long and heavy arrive late: each one is a damped spring on the chest's turn and the body's rise and fall."""
    n=len(poses);dt=1/FPS;FK=[fk(p) for p in poses]
    cz=np.array([[p['cog'][0],p['cog'][1],p['cog'][2]] for p in poses])
    ch=[rv(F[0]['chest']) for F in FK]
    for k,k0,c0 in (('l',80,10),('m',70,9),('r',90,11)):
        th=np.zeros(3);vl=np.zeros(3);out=[None]*n
        for rnd in range(3 if loop else 1):
            for i in range(n):
                a=(cz[(i+1)%n]-2*cz[i]+cz[(i-1)%n])/dt/dt if loop else (cz[min(i+1,n-1)]-2*cz[i]+cz[max(i-1,0)])/dt/dt
                a=np.clip(a,-10,10)
                d=np.array((a[2]*.09+a[1]*.04,0,-a[0]*.07))
                vl=vl+(-k0*(th+ch[i]*.45)-c0*vl+k0*d*.12)*dt;th=th+np.clip(vl*dt,-.12,.12);out[i]=th.copy()
        for i in range(n):
            lst=list(poses[i]['n'][k])
            for j in range(5):lst[j]=lst[j]+out[i]*FOLLOW[j]
            poses[i]['n'][k]=lst
def secondary(poses,loop):
    n=len(poses);dt=1/FPS;neck_weight(poses,loop)
    for p in poses: floor_necks(p);cap_heads(p);floor_necks(p)
    FK=[fk(p) for p in poses];out=[{} for _ in range(n)]
    rng=np.random.RandomState(11)
    for name,par in SINGLE:
        L=RB[name].length;k0=90+rng.rand()*50
        pos=np.array([list(Hw[par]+D[par]@(H(name)-H(par))) for D,Hw in FK])
        th=np.zeros(3);vl=np.zeros(3);c0=7+rng.rand()*3
        for rnd in range(3 if loop else 1):
            for i in range(n):
                D=FK[i][0][par]
                a=(pos[(i+1)%n]-2*pos[i]+pos[(i-1)%n])/dt/dt if loop else (pos[min(i+1,n-1)]-2*pos[i]+pos[max(i-1,0)])/dt/dt
                a=np.clip(a,-12,12)
                # hangs straight down in the world: the target undoes the parent's turn, in the parent's frame, only so far: it's still attached
                tgt=rv(D.inverted())*.8;tn=float(np.linalg.norm(tgt));tgt=tgt*min(1,.36/max(tn,1e-6))
                dr=np.array(D.inverted()@Vector((a[1],-a[0],0)))*.2
                vl=vl+(-k0*(th-tgt)-c0*vl+dr)*dt;th=th+np.clip(vl*dt,-.09,.09);out[i][name]=rvq(th.copy())
    # tail: its own pose, with the pelvis's turn delayed down its length, and lifted clear of the floor
    tb=[f'tail_{i}' for i in range(1,7)]
    base_rv=np.array([rv(F[0]['pelvis']) for F in FK])
    Ty=np.array([[list(F[1]['pelvis']+F[0]['pelvis']@(H('tail_1')-H('pelvis')))] for F in FK])[:,0]
    S=np.zeros((n,3));th=np.zeros(3);vl=np.zeros(3)
    for rnd in range(3 if loop else 1):
        for i in range(n):
            vl=vl+(-70*(th+base_rv[i]*.55)-8*vl)*dt
            th=th+np.clip(vl*dt,-.2,.2);S[i]=th
    def tailq(i,l_):
        up=FK[i][0]['pelvis'].inverted()@Vector((1,0,0));r=[]
        for j in range(6):
            d=(i-1-j*2);lagv=S[d%n] if loop else S[max(d,0)]
            r.append(rvq(np.array(poses[i]['tail'][j])+lagv*(.26+.08*j)*poses[i].get('tlag',1)+np.array(up)*l_*(.45-.06*j)))
        return r
    lift=np.zeros((n,1))
    for i in range(n):
        l_=0.
        for _ in range(6):
            x=Vector(Ty[i]);q=FK[i][0]['pelvis'];low=9.
            for t,qt in zip(tb,tailq(i,l_)):
                q=q@qt;x=x+q@(T(t)-H(t));low=min(low,x.z)
            if low>=.08: break
            l_+=(.095-low)*2.2
        lift[i,0]=l_
    envelope(lift,.1,loop)
    for i in range(n): out[i]['tail']=tailq(i,float(lift[i,0]))
    return out

err={};PUSH={}
def set_pose(P,spr):
    D,Hw=fk(P);err.clear()
    pb=PB['cog'];R=pb.bone.matrix_local.to_3x3();pb.location=R.inverted()@Vector(P['cog'])
    for n,par,key in BODY: key_rot(PB[n],E2Q(P[key]))
    for k in NK:
        for i in range(5): key_rot(PB[f'{k}_{i+1}'],E2Q(P['n'][k][i]))
        key_rot(PB[f'{k}_head'],D[f'{k}_5'].inverted()@D[f'{k}_head']);key_rot(PB[f'{k}_jaw'],E2Q((P['jaw'][k],0,0)))
    for l in LEGS:
        c=CH[l];f=P['feet'][l];k=Vector(f['k'])+Vector((0,0,.03*min(max(f['p'],0),1)));Rp=Quaternion((1,0,0),f['p'])
        ank=k+Rp@(ANK[l]-PIV[l])
        if l[1]=='F':
            q=Quaternion((1,0,0),P['scap'][l[0]]);sc_=bn(l,'scap')
            child(D,Hw,'chest',sc_,q);key_rot(PB[sc_],q)
            D0=D[sc_];hw=Hw[sc_]+D0@(c.hip-H(sc_))
        else:
            D0=D['pelvis'];hw=Hw['pelvis']+D0@(c.hip-H('pelvis'))
        c.push=0;G,rel,Dend,er=c.solve(hw,ank);err[l]=er;PUSH[l]=c.push
        key_rot(PB[c.names[0]],D0.inverted()@G)
        for n,q in zip(c.names[1:],rel[1:]): key_rot(PB[n],q)
        key_rot(PB[bn(l,'paw')],Dend.inverted()@Rp)
        if l[1]=='F': key_rot(PB[bn(l,'toe')],Quaternion((1,0,0),-f['p']+f['t']))
    for name,par in SINGLE: key_rot(PB[name],spr[name])
    for j,q in enumerate(spr['tail']): key_rot(PB[f'tail_{j+1}'],q)
def key_all(frame):
    PB['cog'].keyframe_insert('location',frame=frame)
    for b in PB:
        if b.name!='root': b.keyframe_insert('rotation_quaternion',frame=frame)

meta={};metrics={}
arm.animation_data_create()
Ed=np.array([e.vertices[:] for e in me.data.edges]);Co=np.empty(len(me.data.vertices)*3)
me.data.vertices.foreach_get('co',Co);C0=Co.reshape(-1,3);L0=np.linalg.norm(C0[Ed[:,0]]-C0[Ed[:,1]],axis=1);Em=L0>.004
def tipof(ao,l):
    return ao.pose.bones[bn(l,'toe')].head if l[1]=='F' else ao.pose.bones[bn(l,'paw')].tail
ONLY=os.environ.get('HY_ONLY','').split(',') if os.environ.get('HY_ONLY') else None
for name,fn,N,loop in CLIPS:
    if ONLY and name not in ONLY: continue
    act=bpy.data.actions.new(name);act.use_fake_user=True;arm.animation_data.action=act
    T_=N/FPS;poses=[];speed=0
    for f in range(N+1):
        p,v=fn(f/FPS,T_);p['cog']=p['cog']+v3(0,0,-.018);settle(p);poses.append(p);speed=v
    spr=secondary(poses[:-1] if loop else poses,loop)
    if loop: poses[-1]=poses[0];spr=spr+[spr[0]]
    reach_e=0;pushm=[0,'']
    for f in range(N+1):
        set_pose(poses[f],spr[f]);key_all(f)
        if max(PUSH.values())>pushm[0]: pushm=[max(PUSH.values()),f'{max(PUSH,key=PUSH.get)}@{f}']
        for l in LEGS:
            if poses[f]['feet'][l]['k'][2]<PIV[l].z+.001: reach_e=max(reach_e,err[l])
    meta[name]=dict(frames=N,loop=loop,fps=FPS,speed=speed,duration=T_)
    if name in ROOT: meta[name]['root']=ROOT[name]
    if name in HITS: meta[name]['hits']=[dict(by=a,at=b) for a,b in HITS[name]]
    if name in FIRE: meta[name]['fire']=[dict(head=a,start=b,end=c) for a,b,c in FIRE[name]]
    sc.frame_start=0;sc.frame_end=N
    lowv=[];tips={l:[] for l in LEGS};stretch2=0;stretch4=0;sw=0;prev={};pop=[0,''];gap=[9,''];clash=[9,''];k3=[0,''];hb=[0,''];far=[0,'']
    curves=dict(cog_z=[],pitch=[],foot_LF=[],foot_LH=[],foot_RF=[],jaw=[])
    for f in range(N+1):
        sc.frame_set(f);dg=bpy.context.evaluated_depsgraph_get();ao=arm.evaluated_get(dg)
        for l in LEGS: tips[l].append(list(tipof(ao,l)))
        eo=me.evaluated_get(dg);em=eo.to_mesh();em.vertices.foreach_get('co',Co);eo.to_mesh_clear();c=Co.reshape(-1,3)
        lowv.append((float(c[:,2].min()),f,int(c[:,2].argmin())))
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
        hp={k:Vector(ao.pose.bones[f'{k}_head'].tail) for k in NK}
        for a,b in (('l','m'),('m','r'),('l','r')):
            d=(hp[a]-hp[b]).length
            if d<gap[0]: gap=[d,f'{a}{b}@{f}']
        for k in NK:
            v=ao.pose.bones[f'{k}_jaw'].tail
            if -v.y>far[0]: far=[-v.y,f'{k}@{f}']
            d=poses[f]['n'][k][2];d=float(np.linalg.norm(d))
            if d>k3[0]: k3=[d,f'{k}@{f}']
            q=ao.pose.bones[f'{k}_head'].rotation_quaternion.angle
            if q>hb[0]: hb=[q,f'{k}@{f}']
        for s in 'LR':
            d=(Vector(tips[s+'F'][-1])-Vector(tips[s+'H'][-1])).length
            if d<clash[0]: clash=[d,f'{s}@{f}']
        curves['cog_z'].append(float(poses[f]['cog'][2]));curves['pitch'].append(float(poses[f]['rot'][0]));curves['jaw'].append(float(poses[f]['jaw']['m']))
        for k_,l in (('foot_LF','LF'),('foot_LH','LH'),('foot_RF','RF')): curves[k_].append(float(tips[l][-1][2]-PIV[l].z))
    slip=0
    for l in LEGS:
        a=np.array(tips[l]);z0=PIV[l].z
        for i in range(1,len(a)):
            if a[i,2]<z0+.0015 and a[i-1,2]<z0+.0015:
                # planted feet slide back at the gait's speed, or by what the root carried it this frame
                slip=max(slip,float(np.linalg.norm(a[i,:2]-a[i-1,:2]-np.array((0,speed/FPS+travelled(name,i)-travelled(name,i-1))))))
    planted=[sum(1 for l in LEGS if tips[l][i][2]<PIV[l].z+.0015) for i in range(N+1)]
    _lo=min(lowv);_vg=me.data.vertices[_lo[2]].groups;_lb=me.vertex_groups[max(_vg,key=lambda g:g.weight).group].name
    metrics[name]=dict(fold_push_mm=round(pushm[0]*1000,1),fold_push_at=pushm[1],lowest_vertex_bone=f'{_lb}@{_lo[1]}',planted_foot_reach_error_mm=round(reach_e*1000,1),planted_slip_mm_per_frame=round(slip*1000,2),whole_mesh_min_z_mm=round(_lo[0]*1000,1),edges_stretched_over_2x=stretch2,at_frame=sw,edges_stretched_over_4x=stretch4,largest_bone_step_deg=round(math.degrees(pop[0]),1),largest_step_at=pop[1],min_feet_planted=min(planted),loop_seam_mm=(round(max(float(np.linalg.norm(np.array(tips[l][0])-np.array(tips[l][-1]))) for l in LEGS)*1000,2) if loop else None),closest_heads_mm=round(gap[0]*1000),closest_heads_at=gap[1],closest_paws_mm=round(clash[0]*1000),closest_paws_at=clash[1],neck_link3_deg=round(math.degrees(k3[0]),1),neck_link3_at=k3[1],head_on_neck_deg=round(math.degrees(hb[0]),1),head_on_neck_at=hb[1],furthest_jaw=round(far[0],3),furthest_jaw_at=far[1],curves=curves)
    print(name,{k:v for k,v in metrics[name].items() if k!='curves'},flush=True)
json.dump(meta,open(os.path.join(W,'clips.json'),'w'),indent=1)
json.dump(metrics,open(os.path.join(W,'metrics.json'),'w'))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(W,'anim.blend'))
