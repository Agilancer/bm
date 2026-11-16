"""The new dragons into the game: art/dragons/anim/dragon_<color>.glb (clips.py's bake) over assets/monsters/tripo/, and their
roster.json entries brought up to them.

    python tools/dragons/install.py            # all four
    python tools/dragons/install.py green      # one

Each entry keeps its id, kind, height, group and breath. What changes: the clips (every one, and the game's old names that
point at them, extras.alias), rigTop and bytes, the mouth (the head joint, with mouthTip: where the mouth is from it, in the
head's own frame, in the model's units, measured off the skin: the snout's tip and the chin's, halfway), and hover, which
goes: the new flights carry their own height in the clip (src/sim/tripo.js rig.flies).
"""
import json
import os
import shutil
import struct
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
ANIM = os.path.join(ROOT, 'art', 'dragons', 'anim')
TRIPO = os.path.join(ROOT, 'assets', 'monsters', 'tripo')
ROSTER = os.path.join(TRIPO, 'roster.json')

CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}


def load(path):
    f = open(path, 'rb').read()
    n = struct.unpack('<I', f[12:16])[0]
    doc = json.loads(f[20:20 + n])
    b0 = 20 + n
    bl = struct.unpack('<I', f[b0:b0 + 4])[0]
    return doc, f[b0 + 8:b0 + 8 + bl]


def acc(doc, buf, i):
    a = doc['accessors'][i]
    bv = doc['bufferViews'][a['bufferView']]
    dt, nc = CT[a['componentType']], NC[a['type']]
    size = np.dtype(dt).itemsize * nc
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    st = bv.get('byteStride') or size
    raw = np.frombuffer(buf, np.uint8, (a['count'] - 1) * st + size, off)
    v = np.lib.stride_tricks.as_strided(raw, (a['count'], size), (st, 1)).copy().view(dt).reshape(a['count'], nc).astype(np.float64)
    if a.get('normalized'):
        v /= {5120: 127, 5121: 255, 5122: 32767, 5123: 65535}[a['componentType']]
    return v


def mouth_tip(doc, buf):
    """The mouth from the head joint, in its frame: halfway between the snout's tip and the chin's (the furthest forward of
    the skin the head holds, and of the jaw's), or the snout's alone where the jaw holds next to none of it."""
    pr = doc['meshes'][0]['primitives'][0]['attributes']
    P, J, W = acc(doc, buf, pr['POSITION']), acc(doc, buf, pr['JOINTS_0']).astype(int), acc(doc, buf, pr['WEIGHTS_0'])
    skin = doc['skins'][0]
    names = [doc['nodes'][k]['name'] for k in skin['joints']]
    ibm = acc(doc, buf, skin['inverseBindMatrices']).reshape(-1, 4, 4)
    hi, ji = names.index('head'), names.index('jaw')
    wh, wj = (W * (J == hi)).sum(1), (W * (J == ji)).sum(1)
    up = P[wh > 0.5]
    tip = up[np.argmax(up[:, 2])]
    if (wj > 0.3).sum() > 20:
        lo = P[wj > 0.3]
        tip = (tip + lo[np.argmax(lo[:, 2])]) / 2
    return [round(float(x), 4) for x in (ibm[hi].T @ np.r_[tip, 1])[:3]]


def install(color, roster):
    src = os.path.join(ANIM, f'dragon_{color}.glb')
    dst = os.path.join(TRIPO, f'dragon_{color}.glb')
    doc, buf = load(src)
    extras = doc['scenes'][0]['extras']
    clips = {a['name']: round(extras['clips'][a['name']]['dur'], 3) for a in doc['animations']}
    for alias, of in extras.get('alias', {}).items():
        if of in clips:
            clips[alias] = clips[of]
    pos = doc['accessors'][doc['meshes'][0]['primitives'][0]['attributes']['POSITION']]
    e = roster[f'dragon_{color}']
    e['clips'] = clips
    e['rigTop'] = round(pos['max'][1] - pos['min'][1], 4)
    e['mouth'] = 'head'
    e['mouthTip'] = mouth_tip(doc, buf)
    e['mouthDir'] = [0, 0, 1]
    e['mouthOff'] = 0
    e['breathWin'] = [round(v, 3) for v in extras['clips']['breath']['breathWin']]
    e.pop('hover', None)
    shutil.copyfile(src, dst)
    e['bytes'] = os.path.getsize(dst)
    print(f'dragon_{color}: {len(clips)} clips ({len(doc["animations"])} own), {e["bytes"] / 1e6:.2f} MB, mouthTip {e["mouthTip"]}')


def main(argv):
    colors = [a for a in argv if a in ('black', 'green', 'red', 'undead')] or ['black', 'green', 'red', 'undead']
    roster = json.load(open(ROSTER, encoding='utf-8'))
    for c in colors:
        install(c, roster)
    with open(ROSTER, 'w', encoding='utf-8', newline='\n') as f:
        f.write(json.dumps(roster, indent=1) + '\n')


if __name__ == '__main__':
    main(sys.argv[1:])
