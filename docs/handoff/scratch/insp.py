import json,struct,sys
def load(p):
    b=open(p,'rb').read()
    jl=struct.unpack('<I',b[12:16])[0]
    j=json.loads(b[20:20+jl]); bin_=b[20+jl+8:]
    return j,bin_
for p in sys.argv[1:]:
    j,bin_=load(p)
    print('==',p,len(bin_))
    print(' nodes',len(j['nodes']),'meshes',len(j['meshes']),'skins',len(j.get('skins',[])),'anims',len(j.get('animations',[])), [a.get('name') for a in j.get('animations',[])][:30])
    for m in j['meshes']:
        for pr in m['primitives']:
            print('  prim',pr['attributes'],'idx',j['accessors'][pr['indices']]['count'],'verts',j['accessors'][pr['attributes']['POSITION']]['count'],j['accessors'][pr['attributes']['POSITION']]['min'],j['accessors'][pr['attributes']['POSITION']]['max'], {k:(j['accessors'][v]['componentType'],j['accessors'][v].get('normalized')) for k,v in pr['attributes'].items()})
    print(' mats',json.dumps(j['materials']))
    print(' images',[(i.get('mimeType'),j['bufferViews'][i['bufferView']]['byteLength']) for i in j.get('images',[])])
    print(' textures',j.get('textures'), j.get('samplers'))
    if j.get('skins'): print(' joints',[j['nodes'][n].get('name') for n in j['skins'][0]['joints']])
    tot=0
    for a in j.get('animations',[]):
        for s in a['samplers']:
            for k in ('input','output'):
                tot+=j['bufferViews'][j['accessors'][s[k]]['bufferView']]['byteLength']
    print(' anim bytes approx (dup counted)',tot, 'extras',j.get('extras'), j['asset'], [n for n in j['nodes'] if 'mesh' in n], j['scenes'])
