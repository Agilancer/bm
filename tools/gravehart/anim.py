# The Gravehart's clips, baked to bones. Output (in tools/gravehart/build): anim.blend, clips.json, metrics.json
# Faces -Y, Z up, in metres at a body length of about 1. Clips are in place; gait clips report their floor speed.
# Rotations are (pitch, roll, yaw) deltas in rest axes: +pitch drops the nose, +yaw turns the nose toward +x.
import bpy, os, json, math
import numpy as np
from mathutils import Vector, Euler, Quaternion, Matrix
W=os.path.join(os.path.dirname(os.path.abspath(__file__)),'build')
FPS=30;TAU=2*math.pi
G=5.0  # the fall this big an animal reads best at, in model units
arm=bpy.data.objects['gravehart_rig'];me=bpy.data.objects['gravehart_mesh'];sc=bpy.context.scene
sc.render.fps=FPS
PB=arm.pose.bones;RB=arm.data.bones
LEGS=['LF','RF','LH','RH'];NM={'L':'L','R':'R'}
def bn(l,part): return f"{l[0]}_{'fore' if l[1]=='F' else 'hind'}_{part}"
SIDE={'L':-1,'R':1}
def H(n): return Vector(RB[n].head_local)
def T(n): return Vector(RB[n].tail_local)
PIV={l:(H(bn(l,'toe')) if l[1]=='F' else T(bn(l,'paw'))) for l in LEGS}    # the point a paw rolls about, on the floor
ANK={l:H(bn(l,'paw')) for l in LEGS}
STAND={'F':(.178,-.262),'H':(.168,.262)}

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
def stance():
    d={}
    for l in LEGS:
        x,y=STAND[l[1]];d[l]=dict(k=v3(SIDE[l[0]]*x,y,PIV[l].z),p=0.,t=0.)
    return d
def base():
    P=dict(cog=np.zeros(3),rot=np.zeros(3),pelvis=np.zeros(3),sp1=np.zeros(3),sp2=np.zeros(3),chest=np.zeros(3),n1=np.zeros(3),n2=np.zeros(3),head=np.zeros(3),
           jaw=0.,ear=0.,tail=[np.zeros(3) for _ in range(5)],feet=stance(),scap={'L':0.,'R':0.})
    look(P,0,0);return P
def look(P,pitch,yaw,roll=0):
    """Aims the head from the base of the neck. Includes the turn that straightens the source's head."""
    yaw=yaw+.52
    P['n1']=v3(pitch*.25,roll*.15,yaw*.26);P['n2']=v3(pitch*.3,roll*.3,yaw*.34);P['head']=v3(pitch*.45,roll*.55,yaw*.4)
def spine(P,flex=0,side=0,twist=0):
    """flex>0 arches the back; side bends it, nose toward +x."""
    P['pelvis']=v3(-flex*.8,-twist*.5,-side*.6);P['sp1']=v3(flex*.3,twist*.17,side*.33);P['sp2']=v3(flex*.3,twist*.17,side*.33);P['chest']=v3(flex*.3,twist*.17,side*.33)
def tail(P,pitch,yaw=0,wave=0,ph=0):
    for i in range(5): P['tail'][i]=v3(pitch*(1-.12*i),0,yaw*.2+wave*math.sin(ph-i*.8)*(.4+.15*i))
def foot(l,phi,v,T_,duty,lift,fore=0,spread=0,pk=.8,hes=False):
    """Stance slides at exactly v; the paw rolls up off its toes, flexes through the swing and opens before it lands."""
    p=phi%1;x,y=STAND[l[1]];k=v3(SIDE[l[0]]*(x+spread),y+fore,PIV[l].z);st=v*duty*T_
    if p<duty:
        k[1]+=st*(-.5+p/duty);return dict(k=k,p=pk*.5*ss(duty*.72,duty,p),t=0.)
    u=(p-duty)/(1-duty);Ts=(1-duty)*T_
    if hes:   # lifts, reaches, hangs in the air, then places: a predator testing the ground
        k[1]+=st/2-st*(.86*ss(0,.5,u)+.14*ss(.74,1,u));k[2]+=lift*ss(0,.38,u)*(1-ss(.8,1,u))
    else:
        k[1]+=hermite(st/2,-st/2,v*Ts,v*Ts,u);k[2]+=lift*math.sin(math.pi*u**.8)**2
    return dict(k=k,p=pk*(.5+.5*math.sin(math.pi/2*min(u/.35,1)))*(1-ss(.42,.96,u)),t=.45*math.sin(math.pi*u))
def lat(duty,order):
    """Phase offsets that start each swing at its given fraction of the cycle."""
    return {l:(duty-s)%1 for l,s in order.items()}
def shoulders(P):
    for s in 'LR':
        P['scap'][s]=(P['feet'][s+'F']['k'][1]-STAND['F'][1])*1.1
def arc(f,t0,t1,dst,h):
    x=min(max((f-t0)/(t1-t0),0),1);u=ss(t0,t1,f);z=h*math.sin(math.pi*x**1.5)
    return v3(*dst)*u+v3(0,0,z)
def add(P,steps,f):
    for l,ss_ in steps.items():
        for a,b,d,h in ss_: P['feet'][l]['k']=P['feet'][l]['k']+arc(f,a,b,d,h)

# ------------- idle -------------
def idle(t,T_):
    P=base();f=t*FPS;w=TAU*t/T_
    br=math.sin(3*w)                                  # slow breath, heavy in the ribs
    P['cog']=v3(.006*math.sin(w+.7),.004*math.sin(w),-.012+.004*br)
    P['rot']=v3(.006*br,.015*math.sin(w+.7),0)
    spine(P,.018*br+.01,.02*math.sin(w))
    # snaps its nose up to test the air, drops to sniff the ground, snaps over each shoulder and holds dead still to listen
    pitch=K(f,[(0,.0),(14,.0),(20,-.24),(23,-.2),(40,-.2),(47,-.2),(55,.7),(58,.62),(92,.62),(99,.02),(128,.0),(180,.0)])
    yaw=K(f,[(0,0.),(14,0.),(20,.13),(23,.1),(47,.1),(55,-.12),(99,-.12),(106,-.12),(113,.6),(116,.55),(133,.55),(142,-.56),(145,-.5),(166,-.5),(172,0.),(180,0.)])
    sniff=ss(52,58,f)*(1-ss(90,95,f))*math.sin(f*1.7)*.022+ss(20,24,f)*(1-ss(36,42,f))*math.sin(f*1.4)*.02
    look(P,pitch+sniff,yaw,.08*math.sin(w+1))
    P['jaw']=.06+.05*max(0,br)+K(f,[(0,0.),(18,.12),(40,.12),(48,0.)])
    fl=(math.exp(-((f-30)/2.5)**2)-math.exp(-((f-36)/2.5)**2)+math.exp(-((f-122)/2.5)**2)+math.exp(-((f-150)/2)**2))
    P['ear']=K(f,[(0,.0),(110,0.),(114,.5),(166,.5),(172,0.)])+.55*fl
    tail(P,-.03+.01*br,.0,.14,w*2)
    add(P,{'LF':[(66,74,(.0,-.022,0),.022),(100,108,(.0,.022,0),.018)]},f)
    return P,0
# ------------- walks -------------
def walk_prowl(t,T_):
    # belly low, shoulder blades rolling above the back, head below the withers and gliding, each forepaw hung and placed
    phi=t/T_;P=base();v=.16;duty=.8;w=TAU*phi
    ph=lat(duty,{'LH':0,'LF':.25,'RH':.5,'RF':.75})
    for l in LEGS:
        fore=l[1]=='F'
        P['feet'][l]=foot(l,phi+ph[l],v,T_,duty,.045 if fore else .035,fore=.01,spread=.012,pk=.6 if fore else .7,hes=fore)
    P['cog']=v3(.012*math.sin(w+.4),.0,-.085+.005*math.cos(2*w))
    P['rot']=v3(.05+.008*math.cos(2*w+1),.03*math.sin(w+.4),.012*math.sin(w))
    spine(P,-.03+.012*math.cos(2*w+.5),.05*math.sin(w+.9),.09*math.sin(w+.2))
    # the neck cancels the walk, so the head stays locked on its target, with a slow scan
    look(P,.3,-.06*math.sin(w+.9)+.1*math.sin(w*.5+.7)*0,-.05*math.sin(w+.2))
    P['jaw']=.02;P['ear']=.35+.25*max(0,math.sin(w*2+1))**8
    tail(P,.02,0,.1,w);shoulders(P)
    for s in 'LR': P['scap'][s]*=1.25
    return P,v
def walk_roam(t,T_):
    # an easy, swinging road gait, head nodding with each forefoot
    phi=t/T_;P=base();v=.34;duty=.66;w=TAU*phi
    ph=lat(duty,{'LH':0,'LF':.25,'RH':.5,'RF':.75})
    for l in LEGS: P['feet'][l]=foot(l,phi+ph[l],v,T_,duty,.07 if l[1]=='F' else .055,fore=.012,pk=.85)
    P['cog']=v3(.014*math.sin(w+.3),0,-.012+.008*math.cos(2*w+.6))
    P['rot']=v3(.01+.012*math.cos(2*w+2.1),.028*math.sin(w+.3),.016*math.sin(w))
    spine(P,.008*math.cos(2*w),.06*math.sin(w+1),.1*math.sin(w))
    look(P,-.05+.09*math.cos(2*w+.2),-.04*math.sin(w+1),.05*math.sin(w))
    P['jaw']=.05;P['ear']=.06*math.sin(2*w)
    tail(P,-.02,0,.2,w);shoulders(P)
    return P,v
# ------------- runs -------------
def run_lope(t,T_):
    # the three-beat canter: one hind, then the diagonal pair, then the leading fore, and a rocking back
    phi=t/T_;P=base();duty=.46;st=.36;v=st/(duty*T_);w=TAU*phi
    ph=lat(duty,{'RH':0.,'LH':.2,'RF':.22,'LF':.42})
    for l in LEGS: P['feet'][l]=foot(l,phi+ph[l],v,T_,duty,.08 if l[1]=='F' else .085,fore=.02,spread=-.006,pk=.55 if l[1]=='F' else .8)
    rock=math.sin(w+.5)
    P['cog']=v3(.008*math.sin(w),0,-.03+.022*math.cos(w+3.14))
    P['rot']=v3(.05+.1*rock,.02*math.sin(w+1),.02*math.sin(w))
    spine(P,.05*math.sin(w+2.4),.02*math.sin(w),.05*math.sin(w+.5))
    look(P,.0-.14*rock,0,.03*math.sin(w))
    P['jaw']=.18+.1*math.sin(w);P['ear']=.5
    tail(P,.14+.1*math.sin(w+1.7),0,.1,w);shoulders(P)
    return P,v
GAL=dict(duty=.3,st=.38,order={'RH':.0,'LH':.09,'LF':.5,'RF':.59})
def gallop_body(P,phi,g=1.,head=None):
    """The rotary gallop's body: folded in the suspension after the forefeet leave (.645), stretched in the one after the hinds leave (.145)."""
    w=TAU*phi;c=math.cos(TAU*(phi-.645));n=math.cos(TAU*(phi-.55))
    z=.03*math.cos(2*TAU*(phi-.145));pit=.11*n
    return c,z,pit
def run_gallop(t,T_):
    phi=t/T_;P=base();v=GAL['st']/(GAL['duty']*T_);w=TAU*phi
    ph=lat(GAL['duty'],GAL['order'])
    for l in LEGS: P['feet'][l]=foot(l,phi+ph[l],v,T_,GAL['duty'],.07 if l[1]=='F' else .085,fore=.01,spread=-.015,pk=.35 if l[1]=='F' else .45)
    c,z,pit=gallop_body(P,phi)
    P['cog']=v3(0,-.012*c,-.035+z)
    P['rot']=v3(.05+pit,.012*math.sin(w),.012*math.sin(w+.6))
    spine(P,.03+.28*c,0,.03*math.sin(w))
    look(P,-.1-pit*1.4-.1*c,0,.03*math.sin(w))
    P['jaw']=.32+.2*math.cos(w+1);P['ear']=.85
    tail(P,.2-.14*c,0,.06,w);shoulders(P)
    for s in 'LR': P['scap'][s]*=.9
    return P,v
# ------------- attacks -------------
def attack_bite(t,T_):
    # gathers on its hocks, shoots the neck out as the root drives it forward, snaps shut, wrenches its whole body side to side
    P=base();f=t*FPS
    env=K(f,[(21,0.),(23,1.),(29,.75),(35,.35),(42,0.)]);sw=math.sin((f-21)*TAU/(6+(f-21)*.12))
    P['cog']=v3(.03*env*sw,K(f,[(0,0.),(11,.05),(14,.055),(20,-.06,'out'),(40,-.05),(56,0.)]),K(f,[(0,0.),(11,-.06),(14,-.06),(20,-.02,'out'),(40,-.03),(56,0.)]))
    P['rot']=v3(K(f,[(0,0.),(11,-.1),(14,-.1),(20,.16,'out'),(40,.1),(56,0.)]),.05*env*sw,.11*env*sw)
    spine(P,K(f,[(0,0.),(11,.14),(14,.14),(20,-.08,'out'),(40,-.03),(56,0.)]),.09*env*sw,.11*env*sw)
    look(P,K(f,[(0,0.),(11,-.28),(15,-.25),(20,.0,'out'),(23,.2),(40,.2),(56,0.)]),.42*env*sw,.5*env*sw)
    P['jaw']=K(f,[(0,.03),(10,.2),(18,.85),(20,.92),(22,-.14,'in'),(38,-.14),(47,.12),(56,.03)])
    P['ear']=K(f,[(0,0.),(8,1.),(44,1.),(56,0.)])
    tail(P,K(f,[(0,0.),(11,.15),(20,.42,'out'),(44,.2),(56,0.)]),0,.14*env,f*.9)
    # the root carries it forward, so the feet lift and land where they stand
    add(P,{'RF':[(12,20,(0,0,0),.07)],'LF':[(13,21,(0,0,0),.07)],'RH':[(15,22,(0,0,0),.04)],'LH':[(16,23,(0,0,0),.04)]},f)
    shoulders(P)
    return P,0
def attack_swipe(t,T_):
    # stands up on its hind legs, as a bear does, and rakes down with one forepaw and then the other
    P=base();f=t*FPS
    pitch=K(f,[(0,0.),(8,.05),(21,-.52,'out'),(27,-.49),(33,-.26,'out'),(38,-.4),(44,-.14,'out'),(50,.06,'in2'),(55,.03),(68,0.)])
    roll=K(f,[(16,0.),(24,.1),(33,-.12,'out'),(39,.08),(45,.12,'out'),(58,0.)])
    yaw=K(f,[(16,0.),(24,.13),(33,-.22,'out'),(38,.14),(45,.24,'out'),(58,0.)])
    P['rot']=v3(pitch,roll,yaw)
    P['cog']=v3(0,K(f,[(0,0.),(8,-.02),(21,.13),(33,.04,'out'),(38,.08),(46,-.03,'out'),(68,0.)]),K(f,[(0,0.),(8,-.04),(21,.05),(33,.01),(38,.03),(46,-.05),(50,-.075,'out'),(55,-.03),(68,0.)]))
    spine(P,K(f,[(0,0.),(8,.1),(21,-.14,'out'),(33,.1,'out'),(38,-.05),(45,.12,'out'),(68,0.)]))
    look(P,K(f,[(0,0.),(8,-.05),(21,.42),(33,.5),(45,.25),(50,.0),(58,.05),(68,0.)]),-yaw*.6,-roll*.5)
    P['jaw']=K(f,[(0,.03),(16,.45),(30,.85),(36,.6),(43,.9),(52,.2),(68,.03)])
    P['ear']=K(f,[(0,0.),(12,1.),(50,1.),(68,0.)])
    tail(P,K(f,[(0,0.),(21,.62),(46,.2),(68,0.)]),0,.05,f*.5)
    for s,t0,l0 in (('R',27,9),('L',38,12)):
        l=s+'F';sg=SIDE[s];r=P['feet'][l]['k']
        lift=v3(sg*.22,-.3,.34);cock=v3(sg*.25,-.36,.66);hit0=v3(sg*.2,-.5,.44);hit1=v3(sg*.05,-.52,.2);fin=v3(sg*.02,-.44,.08);gnd=v3(sg*.02,-.44,r[2])
        tgt=K(f,[(l0,r),(l0+7,lift),(t0-5,cock),(t0-1,cock+v3(sg*.01,.03,.02)),(t0+2,hit0,'in2'),(t0+5,hit1,'lin'),(t0+8,fin,'out'),(44,fin),(49 if s=='R' else 51,gnd,'in2')])
        ret=ss(52 if s=='R' else 55,58 if s=='R' else 61,f);tgt=tgt*(1-ret)+r*ret+v3(0,0,.04*math.sin(math.pi*ret))
        tgt[2]=max(tgt[2],r[2]);P['feet'][l]=dict(k=tgt,p=K(f,[(l0,0.),(l0+7,.9),(t0-1,-.35),(t0+6,.25),(44,.3),(50,0.)]),t=K(f,[(l0,0.),(t0-1,-.35),(t0+6,.5),(50,0.)]))
        # the shoulder blade takes the height, so the arm doesn't have to twist through it
        P['scap'][s]=K(f,[(l0,0.),(t0-1,-.38),(t0+6,-.12),(50,-.2),(65,0.)])
    add(P,{'LH':[(1,6,(-.02,.03,0),.03),(60,64,(.02,-.03,0),.03)],'RH':[(3,8,(.02,.05,0),.03),(63,67,(-.02,-.05,0),.03)]},f)
    return P,0
def attack_pounce(t,T_):
    # sinks flat and works its hips as a cat does, leaps forepaws first, pins and bites down, and stays where it landed
    P=base();f=t*FPS;v0=1.6;t0,t1=24,43
    if f<=t0: z=K(f,[(0,0.),(13,-.115),(21,-.125),(24,.015,'in2')])
    elif f<t1: tt=(f-t0)/FPS;z=.015+v0*tt-.5*G*tt*tt
    else: z=K(f,[(t1,z_at(v0,t0,t1)),(49,-.115,'out2'),(53,-.1),(60,-.08),(76,0.)])
    wig=ss(8,12,f)*(1-ss(19,22,f))*math.sin((f-8)*TAU/9)
    P['cog']=v3(0,K(f,[(0,0.),(13,.03),(21,.04),(24,.02),(38,-.02),(49,-.16,'out2'),(76,0.)]),z)
    P['rot']=v3(K(f,[(0,0.),(13,.1),(21,.12),(25,-.34,'out'),(34,-.05),(43,.2),(47,.22),(60,.1),(76,0.)]),0,0)
    spine(P,K(f,[(0,0.),(13,.05),(21,.09),(25,-.18,'out'),(36,-.12),(43,.08),(50,.12),(76,0.)]))
    P['pelvis']=P['pelvis']+v3(0,.05*wig,.2*wig)       # the hips alone; the shoulders stay still
    shk=K(f,[(46,0.),(49,1.),(54,.5),(60,0.)])*math.sin((f-46)*1.15)
    look(P,K(f,[(0,0.),(13,-.08),(21,-.1),(26,.1),(43,.14),(47,.34),(58,.3),(76,0.)]),.2*shk,.3*shk)
    P['jaw']=K(f,[(0,.03),(20,.2),(30,.75),(44,.95),(46.5,-.14,'in'),(58,-.14),(66,.1),(76,.03)])
    P['ear']=K(f,[(0,.3),(13,1.),(46,1.),(76,0.)])
    tail(P,K(f,[(0,0.),(13,-.04),(21,.0),(26,-.32),(38,.36),(47,.3),(76,0.)]),0,.3*wig,(f-8)*TAU/9)
    for l,b in P['feet'].items():
        fore=l[1]=='F';sg=SIDE[l[0]];u=min(max((f-t0)/(t1-t0),0),1)
        y=-.17*ss(24,33,f)*(1-ss(33,42,f)*.7)+.051*ss(60 if l[0]=='R' else 63,68 if l[0]=='R' else 71,f) if fore else -.1*ss(27,36,f)*(1-ss(36,44,f))
        pos=b['k']+v3(sg*.015*ss(t0,t1,f),y,0)
        win=ss(23,26,f)*(1-ss(39,42,f)) if fore else ss(25,28,f)*(1-ss(43,47,f))
        pos[2]+=(max(0,z)+(.05 if fore else .08)*math.sin(math.pi*u)**2)*win
        if fore: q=(f-(60 if l[0]=='R' else 63))/8;pos[2]+=.035*math.sin(math.pi*min(max(q,0),1))
        fl=.9*math.sin(math.pi*u)
        P['feet'][l]=dict(k=pos,p=fl*(1. if not fore else .5),t=.4*fl)
    shoulders(P)
    return P,0
def z_at(v0,t0,t1):
    tt=(t1-t0)/FPS;return .015+v0*tt-.5*G*tt*tt
def attack_antler_charge(t,T_):
    # scrapes the ground, drops its antlers and explodes into a low gallop, then a planted skid and a hook that throws
    P=base();f=t*FPS;T2=18/FPS;v=GAL['st']/(GAL['duty']*T2);phi=(f-30)/18
    g=ss(28,34,f)*(1-ss(75,80,f))
    ph=lat(GAL['duty'],GAL['order'])
    for l in LEGS:
        a=P['feet'][l];b=foot(l,phi+ph[l],v,T2,GAL['duty'],.055 if l[1]=='F' else .08,fore=.01,spread=-.015,pk=.3 if l[1]=='F' else .45)
        P['feet'][l]=dict(k=a['k']*(1-g)+b['k']*g,p=b['p']*g,t=b['t']*g)
    c,z,pit=gallop_body(P,phi);c*=g;z*=g;pit*=g
    hook=K(f,[(76,0.),(82,1.,'in2'),(86,1.),(102,0.)])
    low=K(f,[(0,0.),(10,.25),(24,.42),(30,.62),(74,.62),(79,.78)])
    P['cog']=v3(0,K(f,[(0,0.),(20,.03),(28,.06),(34,-.03),(74,-.03),(80,.04),(84,-.03),(112,0.)])-.012*c,K(f,[(0,0.),(22,-.05),(28,-.08),(34,-.05),(74,-.05),(82,-.03),(90,-.05),(112,0.)])+z)
    P['rot']=v3(K(f,[(0,0.),(22,.07),(28,-.05),(34,.05),(74,.05),(80,.14),(86,-.14,'out'),(112,0.)])+pit,0,.14*hook)
    spine(P,K(f,[(0,0.),(24,.12),(30,.2),(34,.06),(74,.06),(84,-.1),(112,0.)])+.25*c,.15*hook)
    pit2=low*(1-ss(78,84,f))+K(f,[(78,.72),(84,-.5,'out'),(92,-.32),(112,0.)])*ss(78,79,f)
    shake=ss(8,16,f)*(1-ss(25,30,f))*math.sin(f*1.1)
    look(P,pit2+.06*shake-pit*.8,.3*hook+.1*shake,.7*hook-.05*shake)
    P['jaw']=K(f,[(0,.03),(14,.2),(28,.1),(38,.35),(76,.35),(84,.85),(96,.3),(112,.03)])
    P['ear']=K(f,[(0,.2),(14,1.),(84,1.),(112,0.)])
    tail(P,K(f,[(0,0.),(24,.12),(38,.32),(74,.32),(84,.05),(112,0.)])-.1*c,0,.2*shake+.05*g,f*.8)
    # scrapes the ground twice with the right forepaw before it goes
    scrape=K(f,[(2,0.),(7,1.),(11,0.,'lin'),(16,1.),(20,0.,'lin'),(26,0.)])
    up=K(f,[(2,0.),(5,1.),(7,.1),(11,0.),(13,1.),(16,.1),(20,0.)])
    q=P['feet']['RF'];P['feet']['RF']=dict(k=q['k']+v3(0,-.13*scrape,.055*up),p=q['p']+.35*up,t=q['t'])
    shoulders(P)
    return P,0
def jump(t,T_):
    P=base();f=t*FPS;v0=1.45;t0,t1=19,37
    def air(x): tt=(x-t0)/FPS;return .05+v0*tt-.5*G*tt*tt
    if f<=t0: z=K(f,[(0,0.),(13,-.12),(16,-.125),(19,.05,'lin')])
    elif f<t1: z=air(f)
    else: z=K(f,[(t1,air(t1)),(43,-.125,'out2'),(48,-.09),(54,.01),(60,0.)])
    P['cog'][1]=K(f,[(31,0.),(41,-.07,'out2'),(60,0.)]);P['cog'][2]=z
    P['rot']=v3(K(f,[(0,0.),(13,.1),(16,.12),(20,-.26,'out'),(28,-.02),(35,.2),(40,.2),(50,.0),(60,0.)]),0,0)
    spine(P,K(f,[(0,0.),(13,.15),(16,.17),(20,-.14,'out'),(28,.14),(37,-.05),(42,.08),(60,0.)]))
    look(P,K(f,[(0,0.),(13,-.1),(20,.1),(28,.0),(37,-.1),(42,.25),(52,0.),(60,0.)]),0)
    P['jaw']=K(f,[(0,.03),(14,.12),(24,.3),(36,.2),(41,.02),(60,.03)]);P['ear']=K(f,[(0,0.),(14,.9),(40,.9),(60,0.)])
    tail(P,K(f,[(0,0.),(14,.08),(20,-.25),(30,.32),(38,.28),(44,-.12),(60,0.)]),0)
    for l,b in P['feet'].items():
        fore=l[1]=='F';pos=b['k'].copy();u=min(max((f-t0)/(t1-t0),0),1)
        # the forefeet leave first and land first, the hinds drive off last and come down last
        win=ss(15,18,f)*(1-ss(31,34.5,f)) if fore else ss(18,21,f)*(1-ss(35,39.5,f))
        pos[2]+=(max(0,z-.03)+.07*math.sin(math.pi*u)**2)*win
        pos[1]+=(-.05 if fore else .03)*math.sin(math.pi*u)**2
        fl=.85*math.sin(math.pi*u)
        P['feet'][l]=dict(k=pos,p=fl,t=.4*fl)
    shoulders(P)
    return P,0
# ------------- taunts -------------
def taunt_bellow(t,T_):
    # a stag's roar: fills its chest, throws its antlers back, and heaves out three long pulses of sound
    P=base();f=t*FPS
    roar=K(f,[(22,0.),(28,1.),(68,1.),(78,0.)])
    pump=sum(K(f,[(a,0.),(a+3,1.,'out'),(a+13,0.)]) for a in (26,40,54))
    tr=roar*math.sin(f*1.25)
    P['cog']=v3(.003*tr,K(f,[(0,0.),(14,-.015),(26,.05),(70,.05),(84,0.),(104,0.)])-.03*pump,K(f,[(0,0.),(14,-.04),(26,.025),(70,.02),(84,-.02),(87,-.05,'out'),(92,-.02),(104,0.)])+.002*tr-.01*pump)
    P['rot']=v3(K(f,[(0,0.),(14,.06),(26,-.2,'out'),(70,-.17),(84,.03),(104,0.)])+.09*pump,.005*tr,0)
    spine(P,K(f,[(0,0.),(14,.12),(26,-.15,'out'),(70,-.12),(84,.04),(104,0.)])+.15*pump,0,.007*tr)
    look(P,K(f,[(0,0.),(14,.3),(27,-.8,'out'),(68,-.68),(80,.15),(92,-.05),(104,0.)])+.1*pump+.014*tr,K(f,[(68,0.),(74,.35),(80,-.35),(88,.15),(98,0.)]),.03*tr+K(f,[(68,0.),(74,.4),(80,-.4),(88,.15),(98,0.)]))
    P['jaw']=K(f,[(0,.03),(14,.0),(22,.2),(28,.95),(68,.8),(76,.1),(104,.03)])-.22*(1-pump)*roar+.06
    P['ear']=K(f,[(0,0.),(14,.4),(26,1.),(70,1.),(84,0.)])
    tail(P,K(f,[(0,0.),(26,.32),(70,.3),(90,0.)]),0,.05*roar,f*1.1)
    # it ends on one hard stamp that shakes it through
    P['feet']['LF']['k']=P['feet']['LF']['k']+v3(0,0,K(f,[(76,0.),(83,.1),(86,0.,'in2')]))
    P['feet']['LF']['p']=K(f,[(76,0.),(83,.45),(86,0.,'in2')])
    shoulders(P)
    return P,0
def taunt_thrash(t,T_):
    # a rutting stag on a sapling: fast rips with uneven pauses, dying away, then a toss, and it stares at you
    P=base();f=t*FPS
    sw=K(f,[(14,0.),(18,.08),(24,.72),(31,.62),(34,.7),(41,-.78),(48,-.66),(51,-.74),(58,.6),(63,.54),(65,.58),(71,-.36),(75,-.3),(80,0.)])+.035*math.sin(f*.7)*ss(18,24,f)*(1-ss(72,80,f))
    P['cog']=v3(.05*sw,.0,K(f,[(0,0.),(14,-.05),(70,-.05),(82,.012),(100,0.),(114,0.)]))
    P['rot']=v3(K(f,[(0,0.),(14,.14),(70,.14),(82,-.1),(100,0.)]),.07*sw,.07*sw)
    spine(P,K(f,[(0,0.),(14,.06),(70,.06),(82,-.08),(100,0.)]),.16*sw,.14*sw)
    look(P,K(f,[(0,0.),(14,.42),(70,.42),(82,-.42,'out'),(92,-.05),(114,0.)]),.62*sw,.72*sw)
    P['jaw']=K(f,[(0,.03),(14,.12),(70,.2),(80,.7),(90,.1),(114,.03)]);P['ear']=K(f,[(0,0.),(14,1.),(80,1.),(92,.2),(114,0.)])
    tail(P,K(f,[(0,0.),(14,.2),(70,.22),(92,0.)]),.4*sw,.1,f*.5)
    add(P,{'LF':[(10,16,(-.05,-.03,0),.04),(76,84,(.05,.03,0),.03)],'RF':[(14,20,(.05,-.03,0),.04),(80,88,(-.05,.03,0),.03)]},f)
    shoulders(P)
    return P,0
_hv=None;_prop=None;_solving=False
def _set_solving(v):
    global _solving
    _solving=v
def prop_roll(P):
    """How far this pose has to roll the head on its neck for the antlers to clear the floor."""
    global _hv
    if _hv is None:
        g=me.vertex_groups['head'].index
        _hv=np.array([list(v.co) for v in me.data.vertices if any(x.group==g and x.weight>.99 for x in v.groups)])[::7]
    def low(d):
        Q=head_roll(P,d);D,Hw=fk(Q);M=np.array(D['head'].to_matrix());return float(((_hv-np.array(H('head')))@M.T)[:,2].min()+Hw['head'].z)
    if low(0.)>=.008: return 0.
    a,b=0.,-1.5
    if low(b)<low(-b): b=-b
    for _ in range(12):
        m=.5*(a+b)
        if low(m)>=.008: b=m
        else: a=m
    return b
def head_roll(P,d):
    Q=dict(P);Q['n1']=P['n1']+v3(0,.15*d,0);Q['n2']=P['n2']+v3(0,.3*d,0);Q['head']=P['head']+v3(0,.55*d,0);return Q
def death(t,T_):
    # the forelegs go, the hindquarters follow, and it topples onto its side; an antler hits, then the head drops and bounces
    P=base();f=t*FPS;e=lambda *k:K(f,list(k))
    cl=v3(e((10,0.),(50,.14)),e((0,0.),(8,.03),(30,-.02),(50,.0)),e((0,0.),(8,.02),(24,-.09),(34,-.12),(46,-.19,'in2'),(50,-.16,'out'),(55,-.195,'in2'),(60,-.185)))
    roll=e((0,0.),(26,.05),(46,1.24,'in2'),(50,1.12,'out'),(55,1.26,'in2'),(60,1.24))
    rot=v3(e((0,0.),(8,-.14),(24,.2),(38,.1),(52,0.)),roll,e((10,0.),(50,.08)))
    P['cog']=cl;P['rot']=rot
    spine(P,e((0,0.),(8,-.1),(24,.08),(52,-.1)),e((26,0.),(52,.14)))
    look(P,e((0,0.),(8,-.4),(24,.3),(44,-.15),(50,-.15),(54,-.04,'in2'),(57,-.1,'out'),(60,-.06)),e((0,0.),(24,.15),(50,.3)),e((0,0.),(24,.2),(50,-.2),(54,.02,'in2'),(57,-.06,'out'),(60,0.)))
    P['jaw']=e((0,.03),(8,.8),(24,.4),(50,.3),(58,.42));P['ear']=e((0,0.),(8,1.),(50,0.))
    tail(P,e((0,0.),(8,.2),(30,-.05),(50,-.12)),e((30,0.),(52,.2)))
    R=E2Q(rot);Hc=H('cog')
    for l,b in P['feet'].items():
        sg=SIDE[l[0]];fore=l[1]=='F';u=ss(10,30,f) if fore else ss(22,44,f);o=ss(30,48,f)
        k=b['k']+v3(sg*.05*u,(-.05 if fore else .06)*u,.03*math.sin(math.pi*u)**2)+v3(-.12*ss(24,38,f) if sg>0 else 0,0,0)
        # once it's going over, the legs go with the body, slack
        curl=v3(0,.04 if fore else -.05,.08)
        q=Hc+Vector(cl)+R@(Vector(k+curl)-Hc)
        k=k*(1-o)+np.array(q)*o;k[2]-=e((42,0.),(50,.08),(60,.13))*ss(.1,.25,k[2])*(.8 if fore else 1);k[2]=max(k[2],PIV[l].z)
        P['feet'][l]=dict(k=k,p=.5*u+.35*o,t=.2*u)
    if not _solving:
        global _prop
        if _prop is None:
            _set_solving(True);_prop=max((prop_roll(death(g/FPS,T_)[0]) for g in range(36,63,2)),key=abs);_set_solving(False)
        d=_prop*e((26,0.),(46,1.));Q=head_roll(P,d);P['n1'],P['n2'],P['head']=Q['n1'],Q['n2'],Q['head']
    return P,0

# How far each clip carries the animal over which frames. The clips themselves stay in place.
ROOT={'attack_bite':dict(start=13,end=22,dist=.2),'attack_pounce':dict(start=26,end=42,ramp=2,dist=.95),'attack_swipe':dict(start=30,end=46,dist=.06),'jump':dict(start=20,end=34,ramp=2,dist=.55),
      'attack_antler_charge':dict(start=30,end=78,ramp=5,dist=GAL['st']/GAL['duty']*43/18)}

CLIPS=[('idle',idle,180,True),('walk_prowl',walk_prowl,72,True),('walk_roam',walk_roam,40,True),('run_lope',run_lope,20,True),('run_gallop',run_gallop,18,True),
       ('attack_bite',attack_bite,56,False),('attack_swipe',attack_swipe,68,False),('attack_pounce',attack_pounce,76,False),('attack_antler_charge',attack_antler_charge,112,False),
       ('jump',jump,60,False),('taunt_bellow',taunt_bellow,104,False),('taunt_thrash',taunt_thrash,114,False),('death',death,62,False)]

# ------------- solver -------------
def E2Q(e): return Euler(tuple(float(x) for x in e),'XYZ').to_quaternion()
def key_rot(pb,q):
    Rr=pb.bone.matrix_local.to_quaternion();pb.rotation_quaternion=Rr.inverted()@q@Rr
class Chain:
    """Scales all the limb's rest bends together, which keeps its shape, then aims hip to target."""
    def __init__(self,names):
        self.names=names;self.bones=[RB[n] for n in names];self.fold=1.75
        self.hip=Vector(self.bones[0].head_local)
        self.r=[Vector(b.tail_local)-Vector(b.head_local) for b in self.bones]
        self.ax=[None];self.ang=[0]
        for a,c in zip(self.r,self.r[1:]):
            x=a.cross(c);self.ax.append(x.normalized() if x.length>1e-6 else Vector((1,0,0)));self.ang.append(a.angle(c))
        tip0=sum(self.r,Vector((0,0,0)));self.n=tip0.cross(self.r[0]).normalized()
    def frame(self,d):
        x=d.normalized();z=(self.n-self.n.dot(x)*x).normalized();y=z.cross(x)
        return Matrix((x,y,z)).transposed().to_quaternion()
    def shape(self,s):
        D=Quaternion();rel=[];p=Vector((0,0,0))
        for i,v in enumerate(self.r):
            q=Quaternion() if i==0 else Quaternion(self.ax[i],self.ang[i]*(s-1))
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
BODY=[('cog','root','rot'),('pelvis','cog','pelvis'),('spine_1','cog','sp1'),('spine_2','spine_1','sp2'),('chest','spine_2','chest'),('neck_1','chest','n1'),('neck_2','neck_1','n2'),('head','neck_2','head')]
def fk(P):
    D={'root':Quaternion()};Hw={'root':Vector((0,0,0))}
    for n,par,key in BODY:
        if n=='cog': Hw[n]=H('cog')+Vector(P['cog'])
        else: Hw[n]=Hw[par]+D[par]@(H(n)-H(par))
        D[n]=D[par]@E2Q(P[key])
    return D,Hw
def child(D,Hw,par,n,q=None):
    Hw[n]=Hw[par]+D[par]@(H(n)-H(par));D[n]=D[par]@(q if q is not None else Quaternion());return Hw[n]

# ------------- secondary motion -------------
DANGLE=[(f'rag_{s}{z}',f'rag_{s}{z}_1',{'f':'chest','m':'spine_1','r':'pelvis'}[z],(RB[f'rag_{s}{z}_1'].head_local.z-RB[f'rag_{s}{z}_2'].tail_local.z)) for s in 'LR' for z in 'fmr']
SINGLE=[('skulls_L','pelvis',.8),('skulls_R','pelvis',.8),('skull_sh','chest',.8),('charm_L','head',1.),('charm_R','head',1.)]
def rv(q):
    a=q.axis*q.angle if q.angle<math.pi else q.axis*(q.angle-TAU);return np.array(a)
def rvq(v):
    a=float(np.linalg.norm(v));return Quaternion(Vector(v/a),a) if a>1e-7 else Quaternion()
def envelope(arr,lim,loop):
    n=len(arr)
    for _ in range(2 if loop else 1):
        for i in (range(n) if loop else range(1,n)): arr[i]=np.maximum(arr[i],arr[i-1]-lim)
        for i in (range(n-1,-1,-1) if loop else range(n-2,-1,-1)): arr[i]=np.maximum(arr[i],arr[(i+1)%n]-lim)
def secondary(poses,loop):
    n=len(poses);dt=1/FPS;FK=[fk(p) for p in poses]
    out=[{} for _ in range(n)]
    rng=np.random.RandomState(11)
    items=[]
    for name,bone,par,L in DANGLE: items.append((name,bone,par,L,True,60+rng.rand()*50))
    for name,par,g in SINGLE: items.append((name,name,par,RB[name].length,False,90+rng.rand()*60))
    for name,bone,par,L,two,k0 in items:
        pos=[]
        for i,(D,Hw) in enumerate(FK):
            if par=='head' : pos.append(Hw['head']+D['head']@(H(bone)-H('head')))
            else: pos.append(Hw[par]+D[par]@(H(bone)-H(par)))
        pos=np.array([list(p) for p in pos])
        fold=np.zeros((n,1))
        for i in range(n):
            h=max(pos[i,2]-.035,.02);L2=L+.05;fold[i,0]=math.acos(min(1,h/L2))*1.25 if h<L2 else 0
        envelope(fold,.12,loop)
        th=np.zeros(3);vl=np.zeros(3);hist=[];c0=7+rng.rand()*3
        for rnd in range(3 if loop else 1):
            for i in range(n):
                D=FK[i][0][par]
                a=(pos[(i+1)%n]-2*pos[i]+pos[(i-1)%n])/dt/dt if loop else (pos[min(i+1,n-1)]-2*pos[i]+pos[max(i-1,0)])/dt/dt
                a=np.clip(a,-12,12)
                # hangs straight down in the world: the target undoes the parent's turn, in the parent's frame
                tgt=rv(D.inverted())*.85;tn=float(np.linalg.norm(tgt));tgt=tgt*min(1,.32/max(tn,1e-6))  # only so far: it's still sewn to the body
                # its lower end trails the push of the attach point, in world axes
                dr=np.array(D.inverted()@Vector((a[1],-a[0],0)))*.22
                vl=vl+(-k0*(th-tgt)-c0*vl+dr)*dt
                th=th+np.clip(vl*dt,-.09,.09)
                hist.append(th.copy())
                q1=rvq(th+np.array((fold[i,0],0,0)))
                lag=hist[-3] if len(hist)>2 else th
                out[i][name]=(q1,rvq((lag-th)*.7+np.array((fold[i,0]*.35,0,0))) if two else None)
    # tail: its own pose, with the pelvis's turn delayed down its length, and lifted clear of the floor
    tb=[f'tail_{i}' for i in range(1,6)]
    base_rv=np.array([rv(F[0]['pelvis']) for F in FK])
    Ty=np.array([[list(F[1]['pelvis']+F[0]['pelvis']@(H('tail_1')-H('pelvis')))] for F in FK])[:,0]
    S=np.zeros((n,3));th=np.zeros(3);vl=np.zeros(3)
    for rnd in range(3 if loop else 1):
        for i in range(n):
            vl=vl+(-70*(th+base_rv[i]*.55)-8*vl)*dt
            th=th+np.clip(vl*dt,-.2,.2);S[i]=th
    def tailq(i,l_):
        up=FK[i][0]['pelvis'].inverted()@Vector((1,0,0));r=[]
        for j in range(5):
            d=(i-1-j*2);lagv=S[d%n] if loop else S[max(d,0)]
            r.append(rvq(np.array(poses[i]['tail'][j])+lagv*(.3+.1*j)+np.array(up)*l_*(.5-.08*j)))
        return r
    # how far it has to lift to keep the whole tail off the floor, found by trying it
    lift=np.zeros((n,1))
    for i in range(n):
        l_=0.
        for _ in range(6):
            x=Vector(Ty[i]);q=FK[i][0]['pelvis'];low=9.
            for t,qt in zip(tb,tailq(i,l_)):
                q=q@qt;x=x+q@(T(t)-H(t));low=min(low,x.z)
            if low>=.075: break
            l_+=(.09-low)*2.2
        lift[i,0]=l_
    envelope(lift,.1,loop)
    for i in range(n): out[i]['tail']=tailq(i,float(lift[i,0]))
    return out

err={};PUSH={}
def set_pose(P,spr):
    D,Hw=fk(P);err.clear()
    pb=PB['cog'];R=pb.bone.matrix_local.to_3x3();pb.location=R.inverted()@Vector(P['cog'])
    for n,par,key in BODY: key_rot(PB[n],E2Q(P[key]))
    key_rot(PB['jaw'],E2Q((P['jaw'],0,0)))
    e=P['ear']
    key_rot(PB['ear_L'],E2Q((.5*e,0,.5*e)));key_rot(PB['ear_R'],E2Q((.5*e,0,-.5*e)))
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
    for name,*_ in DANGLE:
        q1,q2=spr[name];key_rot(PB[name+'_1'],q1);key_rot(PB[name+'_2'],q2)
    for name,par,g in SINGLE:
        key_rot(PB[name],spr[name][0])
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
for name,fn,N,loop in CLIPS:
    act=bpy.data.actions.new(name);act.use_fake_user=True;arm.animation_data.action=act
    T_=N/FPS;poses=[];speed=0
    for f in range(N+1):
        p,v=fn(f/FPS,T_);poses.append(p);speed=v
    spr=secondary(poses[:-1] if loop else poses,loop)
    if loop: spr=spr+[spr[0]]
    reach=0;pushm=[0,'']
    for f in range(N+1):
        set_pose(poses[f],spr[f]);key_all(f)
        if max(PUSH.values())>pushm[0]: pushm=[max(PUSH.values()),f'{max(PUSH,key=PUSH.get)}@{f}']
        for l in LEGS:
            if poses[f]['feet'][l]['k'][2]<PIV[l].z+.001: reach=max(reach,err[l])
    meta[name]=dict(frames=N,loop=loop,fps=FPS,speed=speed,duration=T_)
    if name in ROOT: meta[name]['root']=ROOT[name]
    sc.frame_start=0;sc.frame_end=N
    lowv=[];tips={l:[] for l in LEGS};whole=[];stretch2=0;stretch4=0;sw=0;prev={};pop=[0,''];heads=[]
    curves=dict(cog_z=[],pitch=[],foot_LF=[],foot_LH=[],foot_RF=[],jaw=[])
    for f in range(N+1):
        sc.frame_set(f);dg=bpy.context.evaluated_depsgraph_get();ao=arm.evaluated_get(dg)
        for l in LEGS: tips[l].append(list(tipof(ao,l)))
        eo=me.evaluated_get(dg);em=eo.to_mesh();em.vertices.foreach_get('co',Co);eo.to_mesh_clear();c=Co.reshape(-1,3)
        whole.append(float(c[:,2].min()));lowv.append((float(c[:,2].min()),f,int(c[:,2].argmin())))
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
        curves['cog_z'].append(float(poses[f]['cog'][2]));curves['pitch'].append(float(poses[f]['rot'][0]));curves['jaw'].append(float(poses[f]['jaw']))
        for k,l in (('foot_LF','LF'),('foot_LH','LH'),('foot_RF','RF')): curves[k].append(float(tips[l][-1][2]-PIV[l].z))
    slip=0
    for l in LEGS:
        a=np.array(tips[l]);z0=PIV[l].z
        for i in range(1,len(a)):
            if a[i,2]<z0+.0015 and a[i-1,2]<z0+.0015:
                slip=max(slip,float(np.linalg.norm(a[i,:2]-a[i-1,:2]-np.array((0,speed/FPS)))))
    planted=[sum(1 for l in LEGS if tips[l][i][2]<PIV[l].z+.0015) for i in range(N+1)]
    _lo=min(lowv);_vg=me.data.vertices[_lo[2]].groups;_lb=me.vertex_groups[max(_vg,key=lambda g:g.weight).group].name
    metrics[name]=dict(fold_push_mm=round(pushm[0]*1000,1),fold_push_at=pushm[1],lowest_vertex_bone=f'{_lb}@{_lo[1]}',planted_foot_reach_error_mm=round(reach*1000,1),planted_slip_mm_per_frame=round(slip*1000,2),whole_mesh_min_z_mm=round(min(whole)*1000,1),edges_stretched_over_2x=stretch2,at_frame=sw,edges_stretched_over_4x=stretch4,largest_bone_step_deg=round(math.degrees(pop[0]),1),largest_step_at=pop[1],min_feet_planted=min(planted),loop_seam_mm=(round(max(float(np.linalg.norm(np.array(tips[l][0])-np.array(tips[l][-1]))) for l in LEGS)*1000,2) if loop else None),curves=curves)
    print(name,{k:v for k,v in metrics[name].items() if k!='curves'},flush=True)
json.dump(meta,open(os.path.join(W,'clips.json'),'w'),indent=1)
json.dump(metrics,open(os.path.join(W,'metrics.json'),'w'))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(W,'anim.blend'))
