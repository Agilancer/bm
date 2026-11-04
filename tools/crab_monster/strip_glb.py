# Removes redundant animation tracks: all scale tracks, and translation on everything except cog. Rewrites the GLB binary.
import json,struct,sys
p=sys.argv[1]
b=open(p,'rb').read();l=struct.unpack('<I',b[12:16])[0];j=json.loads(b[20:20+l]);o=20+l;bl=struct.unpack('<I',b[o:o+4])[0];bin_=b[o+8:o+8+bl]
keep={i for i,n in enumerate(j['nodes']) if n.get('name')=='cog'}
removed=0
for a in j['animations']:
    ch=[];sm=[]
    for c in a['channels']:
        t=c['target']
        if t['path']=='scale' or (t['path']=='translation' and t['node'] not in keep): removed+=1;continue
        s=a['samplers'][c['sampler']];c['sampler']=len(sm);sm.append(s);ch.append(c)
    a['channels']=ch;a['samplers']=sm
# keep rotation tracks hemisphere-continuous for engines that interpolate without a sign check
bin_=bytearray(bin_)
for a in j['animations']:
    for c in a['channels']:
        if c['target']['path']!='rotation': continue
        ac=j['accessors'][a['samplers'][c['sampler']]['output']];bv=j['bufferViews'][ac['bufferView']]
        o0=bv.get('byteOffset',0)+ac.get('byteOffset',0);n=ac['count'];vals=list(struct.unpack_from('<%df'%(4*n),bin_,o0))
        for i in range(1,n):
            if sum(vals[4*i+k]*vals[4*i-4+k] for k in range(4))<0:
                for k in range(4): vals[4*i+k]=-vals[4*i+k]
        struct.pack_into('<%df'%(4*n),bin_,o0,*vals)
# accessors still in use
used=set()
def walk(x,key=None):
    if isinstance(x,dict):
        for k,v in x.items():
            if k in('POSITION','NORMAL','TEXCOORD_0','JOINTS_0','WEIGHTS_0','TANGENT','COLOR_0','indices','inverseBindMatrices','input','output') and isinstance(v,int): used.add(v)
            else: walk(v,k)
    elif isinstance(x,list):
        for v in x: walk(v)
walk(j['meshes']);walk(j['skins']);walk(j['animations'])
amap={};acc=[]
for i,a in enumerate(j['accessors']):
    if i in used: amap[i]=len(acc);acc.append(a)
def remap(x):
    if isinstance(x,dict):
        for k,v in x.items():
            if k in('POSITION','NORMAL','TEXCOORD_0','JOINTS_0','WEIGHTS_0','TANGENT','COLOR_0','indices','inverseBindMatrices','input','output') and isinstance(v,int): x[k]=amap[v]
            else: remap(v)
    elif isinstance(x,list):
        for v in x: remap(v)
remap(j['meshes']);remap(j['skins']);remap(j['animations'])
j['accessors']=acc
vu={a['bufferView'] for a in acc}|{im['bufferView'] for im in j.get('images',[]) if 'bufferView' in im}
vm={};views=[];out=bytearray()
for i,v in enumerate(j['bufferViews']):
    if i not in vu: continue
    while len(out)%4: out.append(0)
    s=v.get('byteOffset',0);d=bin_[s:s+v['byteLength']];v=dict(v);v['byteOffset']=len(out);out+=d;vm[i]=len(views);views.append(v)
for a in acc: a['bufferView']=vm[a['bufferView']]
for im in j.get('images',[]):
    if 'bufferView' in im: im['bufferView']=vm[im['bufferView']]
j['bufferViews']=views
while len(out)%4: out.append(0)
j['buffers'][0]['byteLength']=len(out)
js=json.dumps(j,separators=(',',':')).encode();js+=b' '*((4-len(js)%4)%4)
total=12+8+len(js)+8+len(out)
open(p,'wb').write(struct.pack('<4sII',b'glTF',2,total)+struct.pack('<I4s',len(js),b'JSON')+js+struct.pack('<I4s',len(out),b'BIN\0')+out)
print('removed tracks',removed,'size MB',round(total/1e6,2),'channels',sum(len(a['channels']) for a in j['animations']))
