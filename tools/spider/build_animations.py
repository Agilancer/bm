import struct
import json
import numpy as np
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]

def read_glb(path):
    with Path(path).open("rb") as file:
        magic, version, length, size, kind = struct.unpack("<5I", file.read(20))
        if (magic, version, kind) != (0x46546C67, 2, 0x4E4F534A):
            raise ValueError(f"Expected a GLB 2.0 file: {path}")
        document = json.loads(file.read(size))
        bin_size, kind = struct.unpack("<2I", file.read(8))
        if kind != 0x004E4942 or length != 28 + size + bin_size:
            raise ValueError(f"Invalid GLB binary chunk: {path}")
        return document, bytearray(file.read(bin_size))

def write_glb(path, document, data):
    document["buffers"][0]["byteLength"] = len(data)
    metadata = json.dumps(document, separators=(",", ":")).encode()
    metadata += b" " * (-len(metadata) % 4)
    data += b"\0" * (-len(data) % 4)
    with Path(path).open("xb") as file:
        file.write(struct.pack("<5I", 0x46546C67, 2, 28 + len(metadata) + len(data), len(metadata), 0x4E4F534A))
        file.write(metadata)
        file.write(struct.pack("<2I", len(data), 0x004E4942))
        file.write(data)

def add_accessor(doc, data, values):
    values = np.ascontiguousarray(values, dtype="<f4")
    data.extend(b"\0" * (-len(data) % 4))
    view = len(doc["bufferViews"])
    doc["bufferViews"].append(dict(buffer=0, byteOffset=len(data), byteLength=values.nbytes))
    data.extend(values.tobytes())
    index = len(doc["accessors"])
    bounds = dict(min=values.min(axis=0).tolist(), max=values.max(axis=0).tolist()) if values.shape[1] == 1 else {}
    doc["accessors"].append(dict(bufferView=view, componentType=5126, count=len(values),
                                 type={1:"SCALAR", 3:"VEC3", 4:"VEC4"}[values.shape[1]], **bounds))
    return index

"""Build conservative spider clips from the original skinned model.

Rotations follow the eight actual leg chains, identified by geometry rather than
the unreliable generated names. Joint translations, scales and inverse binds
stay fixed. Only the coxa and knee articulate, with bounded inverse kinematics.
"""
import sys, json, math
from pathlib import Path
import numpy as np
from scipy.optimize import least_squares
from scipy.spatial.transform import Rotation




source = Path('F:/!    BM V2/!  GENERATED TRIPO MONSTERS/FLESH SPIDER DEMON.glb')
destination = ROOT / 'assets/monsters/new_creatures/flesh_spider_demon.glb'
doc, data = read_glb(source)
nodes = doc['nodes']
parents = {child: i for i, node in enumerate(nodes) for child in node.get('children', [])}
for node in nodes:
    if 'matrix' in node:
        matrix = np.array(node.pop('matrix')).reshape(4, 4).T
        scale = np.linalg.norm(matrix[:3, :3], axis=0)
        assert np.allclose(scale, scale[0], atol=2e-5), 'Unexpected nonuniform source transform'
        node['translation'] = matrix[:3, 3].tolist()
        node['rotation'] = Rotation.from_matrix(matrix[:3, :3] / scale).as_quat().tolist()
        node['scale'] = scale.tolist()

rest_q = [Rotation.from_quat(n.get('rotation', [0,0,0,1])) for n in nodes]
rest_t = [np.array(n.get('translation', [0,0,0]), dtype=float) for n in nodes]
world_q, world_t = {}, {}
def rest_world(j):
    if j not in world_q:
        if j in parents:
            pq, pt = rest_world(parents[j])
            world_q[j], world_t[j] = pq * rest_q[j], pt + pq.apply(rest_t[j])
        else:
            world_q[j], world_t[j] = rest_q[j], rest_t[j]
    return world_q[j], world_t[j]
for j in range(len(nodes)):
    rest_world(j)

# The generated names misidentify a rear leg as Spine and two legs as helpers.
legs = [
    [5,6,7,8,9], [10,11,12,13,14], [15,16,17,18,19], [20,21,22,23,24,25],
    [31,32,33,34,35], [36,37,38,39,40], [41,42,43,44,45], [46,47,48,49,50,51],
]
def unit(v):
    return v / max(np.linalg.norm(v), 1e-9)

rigs = []
for index, chain in enumerate(legs):
    hip, knee = chain[1:3]
    tip = chain[-1]
    radial = world_t[knee] - world_t[hip]
    radial[1] = 0
    pitch = unit(np.cross([0,1,0], radial))
    bend = unit(np.cross(world_t[knee]-world_t[hip], world_t[tip]-world_t[knee]))
    if np.linalg.norm(bend) < .5:
        bend = pitch
    rigs.append(dict(chain=chain, hip=hip, knee=knee, tip=tip,
        yaw=world_q[hip].inv().apply([0,1,0]),
        pitch=world_q[hip].inv().apply(pitch),
        bend=world_q[knee].inv().apply(bend),
        phase=((index % 4) % 2) * .5 + (0 if index < 4 else .5)))

def pose(rig, angles):
    changes = {
        rig['hip']: rest_q[rig['hip']] * Rotation.from_rotvec(rig['yaw']*angles[0]) * Rotation.from_rotvec(rig['pitch']*angles[1]),
        rig['knee']: rest_q[rig['knee']] * Rotation.from_rotvec(rig['bend']*angles[2]),
    }
    q, t = rest_world(parents[rig['chain'][0]])
    for j in rig['chain']:
        t = t + q.apply(rest_t[j])
        q = q * changes.get(j, rest_q[j])
    return t, changes

def offset(name, u, rig):
    p = (u + rig['phase']) % 1
    if name in ['walk','run','strafe_left','strafe_right','turn_left','turn_right']:
        duty = .72 if name != 'run' else .6
        stride = .035 if name != 'run' else .055
        lift = .017 if name != 'run' else .028
        if p < duty:
            travel = stride * (.5 - p/duty)
            height = 0
        else:
            swing = (p-duty)/(1-duty)
            eased = swing*swing*(3-2*swing)
            travel = stride * (-.5 + eased)
            height = lift * math.sin(math.pi*swing)**2
        direction = np.array([0.,0.,1.])
        if name.startswith('strafe'):
            direction = np.array([1.,0.,0.]) * (1 if name.endswith('left') else -1)
        if name.startswith('turn'):
            direction = unit(np.cross([0,1,0],world_t[rig['tip']] - world_t[4]))
            direction *= 1 if name.endswith('left') else -1
        return direction * travel + [0,height,0]
    pulse = math.sin(math.pi*u)**2
    if name.startswith('attack') and rig['chain'][0] in [5,31]:
        return np.array([0,.024,.025]) * pulse
    if name == 'hit':
        return np.array([0,.008,-.012])*math.sin(math.pi*2*u)*(1-u)
    return np.zeros(3)

specs = [
 ('idle',3,True),('walk',1.6,True),('run',.8,True),('strafe_left',1.4,True),
 ('strafe_right',1.4,True),('turn_left',1.5,True),('turn_right',1.5,True),
 ('attack_bite',1.2,False),('attack_slam',1.6,False),('attack_lunge',1.4,False),
 ('hit',.65,False),('death',2.2,False),
]
metrics = {}
for name, duration, loop in specs:
    times = np.linspace(0,duration,round(duration*30)+1)
    tracks = {j:[] for rig in rigs for j in [rig['hip'],rig['knee']]}
    errors, angles_used = [], []
    for t in times:
        u = t/duration
        for rig in rigs:
            target = world_t[rig['tip']] + offset(name,u,rig)
            def residual(angles):
                position, _ = pose(rig,angles)
                return np.r_[position-target, angles*.012]
            solution = least_squares(residual, np.zeros(3), bounds=(-.18,.18), max_nfev=24, ftol=1e-6)
            position, rotations = pose(rig,solution.x)
            errors.append(float(np.linalg.norm(position-target)))
            angles_used.extend(abs(solution.x))
            for j, q in rotations.items():
                tracks[j].append(q.as_quat())
    # Loop endpoints are identical, including quaternion signs.
    if loop:
        for values in tracks.values():
            values[-1] = values[0]
    animation = dict(name=name,samplers=[],channels=[])
    time_accessor = add_accessor(doc,data,times[:,None])
    for j, values in tracks.items():
        output = add_accessor(doc,data,np.array(values))
        animation['channels'].append(dict(sampler=len(animation['samplers']),target=dict(node=j,path='rotation')))
        animation['samplers'].append(dict(input=time_accessor,output=output,interpolation='LINEAR'))
    doc.setdefault('animations',[]).append(animation)
    metrics[name] = dict(maxJointDegrees=float(np.degrees(max(angles_used))),maxTargetError=max(errors))
doc['scenes'][0].setdefault('extras',{})['clips']={name:dict(loop=loop) for name,duration,loop in specs}
temp = destination.with_suffix('.revised.glb')
if temp.exists():
    temp.unlink()
write_glb(temp,doc,data)
temp.replace(destination)
destination.with_suffix('.validation.json').write_text(json.dumps(metrics,indent=2))
print(json.dumps(metrics,indent=2))


import sys,math,numpy as np
from pathlib import Path
from scipy.spatial.transform import Rotation


p=ROOT / 'assets/monsters/new_creatures/flesh_spider_demon.glb'
d,b=read_glb(p);root=4;base=np.array(d['nodes'][root]['translation']);q=Rotation.from_quat(d['nodes'][root]['rotation'])
parent=3;pm=np.eye(4)
# Root motion is expressed in its parent's world axes, including imported orientation.
parents={c:i for i,n in enumerate(d['nodes']) for c in n.get('children',[])}
def world(i):
 n=d['nodes'][i];m=np.eye(4);m[:3,:3]=Rotation.from_quat(n.get('rotation',[0,0,0,1])).as_matrix();m[:3,3]=n.get('translation',[0,0,0])
 return world(parents[i])@m if i in parents else m
pr=Rotation.from_matrix(world(parent)[:3,:3]);root_world=pr*q
for a in d['animations']:
 name=a['name']
 if not(name.startswith('attack') or name=='death'):continue
 old=a['samplers'][0]['input'];acc=d['accessors'][old];v=d['bufferViews'][acc['bufferView']]
 times=np.frombuffer(b,dtype='<f4',count=acc['count'],offset=v.get('byteOffset',0)+acc.get('byteOffset',0)).copy();dur=times[-1]
 trs=[];rots=[]
 for t in times:
  u=float(t/dur);pulse=math.sin(math.pi*u)**2
  shift=np.zeros(3);rot=0
  if name=='attack_bite':shift[2]=.018*pulse;rot=-.035*pulse
  if name=='attack_slam':shift[1]=.045*pulse;rot=.045*math.sin(math.pi*2*u)*pulse
  if name=='attack_lunge':shift[2]=.055*pulse;shift[1]=.012*pulse;rot=-.055*pulse
  if name=='death':shift[1]=-.025*u*u*(3-2*u);rot=.12*u*u*(3-2*u)
  axis=root_world.inv().apply([0,0,1] if name=='death' else [1,0,0])
  trs.append(base+pr.inv().apply(shift));rots.append((q*Rotation.from_rotvec(axis*rot)).as_quat())
 for path,values in [('translation',trs),('rotation',rots)]:
  out=add_accessor(d,b,np.array(values));a['channels'].append(dict(sampler=len(a['samplers']),target=dict(node=root,path=path)));a['samplers'].append(dict(input=old,output=out,interpolation='LINEAR'))
tmp=p.with_suffix('.body.glb');write_glb(tmp,d,b);tmp.replace(p)

