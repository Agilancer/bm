"""Lift a built monster's colour texture when Tripo baked it too dark to read in the game's light.

    python tools/monsters/texture.py dragonling_black 0.78

gamma < 1 lifts the shadows and mids and leaves the highlights; the colour map gets re-encoded in place.
"""
import io
import json
import os
import struct
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from stretch import ROOT, load  # noqa: E402


def lift(id_, gamma, path=None):
    path = path or os.path.join(ROOT, 'assets', 'monsters', 'tripo', id_ + '.glb')
    doc, buf = load(path)
    buf = bytearray(buf)
    done = set()
    for m in doc.get('materials', []):
        t = m.get('pbrMetallicRoughness', {}).get('baseColorTexture')
        if not t:
            continue
        img = doc['textures'][t['index']]['source']
        if img in done:
            continue
        done.add(img)
        im = doc['images'][img]
        bv = doc['bufferViews'][im['bufferView']]
        o = bv.get('byteOffset', 0)
        a = np.asarray(Image.open(io.BytesIO(bytes(buf[o:o + bv['byteLength']]))).convert('RGB'), float) / 255
        out = io.BytesIO()
        Image.fromarray((np.clip(a ** gamma, 0, 1) * 255).astype(np.uint8)).save(out, 'JPEG', quality=90)
        raw = out.getvalue()
        while len(buf) % 4:
            buf.append(0)
        doc['bufferViews'].append({'buffer': 0, 'byteOffset': len(buf), 'byteLength': len(raw)})
        buf.extend(raw)
        im['bufferView'] = len(doc['bufferViews']) - 1
        im['mimeType'] = 'image/jpeg'
    while len(buf) % 4:
        buf.append(0)
    doc['buffers'][0]['byteLength'] = len(buf)
    js = json.dumps(doc, separators=(',', ':')).encode()
    js += b' ' * (-len(js) % 4)
    with open(path, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, 28 + len(js) + len(buf)))
        f.write(struct.pack('<II', len(js), 0x4E4F534A) + js)
        f.write(struct.pack('<II', len(buf), 0x004E4942) + bytes(buf))
    return len(done)


if __name__ == '__main__':
    print(lift(sys.argv[1], float(sys.argv[2])), 'colour maps lifted')
