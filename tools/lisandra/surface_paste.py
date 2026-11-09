"""Copy texture across a model's own surface: take what one part of her looks like and lay it over another part.

    python tools/lisandra/surface_paste.py IN.glb OUT.glb FIXES.py [--preview DIR]

Tripo's atlases are hundreds of scattered islands, so nothing here cuts rectangles out of the image. Every fix works on
the 3D surface: each texel of the parts being fixed is placed back on the model (bind pose), moved by the fix's map (a
mirror across her middle, or a shift), and filled from the nearest point of the source parts, from all three textures:
colour, metal/rough, and the normal map (each normal turned out of the source triangle's frame and into the target's,
the way the game's shader reads them: src/gfx/shaders.js perturbD). The fix's edge is feathered in 3D, so it blends.

FIXES.py defines FIXES, a list of dicts:
    box:      [[x0, y0, z0], [x1, y1, z1]]  the part to fix, in the model's bind-pose space (y up, z forward)
    at:       [[x, y, z], ...]  fix whole UV islands instead of a box: each one holding the face nearest a point; no feather
    faces:    a function (model) -> face indices, for any other choice of faces (with `at`, the two are joined)
    paint:    [r, g, b]  fill with a flat colour instead (for checking which texels a fix reaches)
    feather:  metres over which the fix fades out at the box's edge (default 0.015)
    mirror:   True to take the source across x = 0 (her other side)
    scale:    [sx, sy, sz] about `pivot` (default [0, 0, 0]), to stretch or squeeze where the source is read
    shift:    [dx, dy, dz] added to each point before looking for the source
    source:   [[x0, y0, z0], [x1, y1, z1]]  only take texture from faces inside this box (default: anywhere outside `box`),
              or a function (model) -> face indices
    facing:   [[nx, ny, nz], min_dot]  only fix faces whose normal points this way
    mix:      0..1, how much of the source goes in (default 1)
FIXES.py may also set PAD = n: after the fixes, every island's edge texels are bled n texels out into the empty
atlas around it, on all three textures, so mipmaps don't pull in the background at the seams.
Needs NumPy, SciPy and Pillow.
"""
import io
import json
import runpy
import struct
import sys

import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
from scipy.spatial import cKDTree


def load(path):
    data = open(path, 'rb').read()
    n = struct.unpack_from('<I', data, 12)[0]
    doc = json.loads(data[20:20 + n])
    off = 20 + n
    m = struct.unpack_from('<I', data, off)[0]
    return doc, bytearray(data[off + 8:off + 8 + m])


def accessor(doc, buf, i):
    a = doc['accessors'][i]
    width = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[a['type']]
    dtype = {5126: np.float32, 5123: np.uint16, 5121: np.uint8, 5125: np.uint32}[a['componentType']]
    v = doc['bufferViews'][a['bufferView']]
    size = np.dtype(dtype).itemsize
    stride = v.get('byteStride', width * size)
    start = v.get('byteOffset', 0) + a.get('byteOffset', 0)
    return np.ndarray((a['count'], width), dtype, buf, start, (stride, size)).copy()


def image_of(doc, buf, tex):
    im = doc['images'][doc['textures'][tex]['source']]
    v = doc['bufferViews'][im['bufferView']]
    raw = bytes(buf[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']])
    return Image.open(io.BytesIO(raw)), im['mimeType']


def closest_on_triangles(p, a, b, c):
    """Closest points on triangles (a, b, c) to points p, and their barycentric weights. All (N, 3)."""
    ab, ac, ap = b - a, c - a, p - a
    d1, d2 = (ab * ap).sum(1), (ac * ap).sum(1)
    bp = p - b
    d3, d4 = (ab * bp).sum(1), (ac * bp).sum(1)
    cp = p - c
    d5, d6 = (ab * cp).sum(1), (ac * cp).sum(1)
    va = d3 * d6 - d5 * d4
    vb = d5 * d2 - d1 * d6
    vc = d1 * d4 - d3 * d2
    den = np.where(np.abs(va + vb + vc) < 1e-20, 1e-20, va + vb + vc)
    v = vb / den
    w = vc / den
    bary = np.stack([1 - v - w, v, w], 1)
    # Outside the face: fall back to the nearest of its edges.
    inside = (va >= 0) & (vb >= 0) & (vc >= 0)
    if not inside.all():
        best = np.full(len(p), np.inf)
        out = bary.copy()
        for (i, j), (s, e) in zip(((0, 1), (0, 2), (1, 2)), ((a, b), (a, c), (b, c))):
            se = e - s
            t = np.clip(((p - s) * se).sum(1) / np.maximum((se * se).sum(1), 1e-20), 0, 1)
            q = s + se * t[:, None]
            d = ((p - q) ** 2).sum(1)
            take = (~inside) & (d < best)
            best = np.where(take, d, best)
            bb = np.zeros((len(p), 3))
            bb[:, i] = 1 - t
            bb[:, j] = t
            out[take] = bb[take]
        bary = np.where(inside[:, None], bary, out)
    q = a * bary[:, :1] + b * bary[:, 1:2] + c * bary[:, 2:]
    return q, bary


class Model:
    def __init__(self, doc, buf):
        self.doc, self.buf = doc, buf
        prim = doc['meshes'][0]['primitives'][0]
        self.pos = accessor(doc, buf, prim['attributes']['POSITION']).astype(np.float64)
        self.nrm = accessor(doc, buf, prim['attributes']['NORMAL']).astype(np.float64)
        self.uv = accessor(doc, buf, prim['attributes']['TEXCOORD_0']).astype(np.float64)
        self.tri = accessor(doc, buf, prim['indices']).reshape(-1, 3).astype(np.int64)
        P = self.pos[self.tri]
        U = self.uv[self.tri]
        self.cent = P.mean(1)
        fn = np.cross(P[:, 1] - P[:, 0], P[:, 2] - P[:, 0])
        self.fnorm = fn / np.maximum(np.linalg.norm(fn, axis=1, keepdims=True), 1e-20)
        # The gradients of u and v along each face: the frame the game's shader reads the normal map in.
        e1, e2 = P[:, 1] - P[:, 0], P[:, 2] - P[:, 0]
        d1, d2 = U[:, 1] - U[:, 0], U[:, 2] - U[:, 0]
        det = d1[:, 0] * d2[:, 1] - d2[:, 0] * d1[:, 1]
        det = np.where(np.abs(det) < 1e-14, 1e-14, det)
        # Position as a function of uv: dP/du, dP/dv; the shader's t and b are the gradients of u and v, which on a
        # face are the rows of the inverse map. Solve with the face normal to keep them in the face's plane.
        dPdu = (e1 * d2[:, 1:2] - e2 * d1[:, 1:2]) / det[:, None]
        dPdv = (e2 * d1[:, 0:1] - e1 * d2[:, 0:1]) / det[:, None]
        n = self.fnorm
        self.gu = np.cross(dPdv, n)
        self.gv = np.cross(n, dPdu)
        s = (self.gu * dPdu).sum(1, keepdims=True)
        s = np.where(np.abs(s) < 1e-20, 1e-20, s)
        self.gu /= s
        s = (self.gv * dPdv).sum(1, keepdims=True)
        s = np.where(np.abs(s) < 1e-20, 1e-20, s)
        self.gv /= s

        # UV islands: glTF splits a vertex wherever its uv changes, so faces sharing vertices share an island.
        F = len(self.tri)
        rows = np.repeat(np.arange(F), 3)
        g = coo_matrix((np.ones(F * 3), (rows, self.tri.ravel() + F)), shape=(F + len(self.pos),) * 2)
        _, lab = connected_components(g, directed=False)
        _, self.island = np.unique(lab[:F], return_inverse=True)

    def faces_in(self, box, facing=None):
        lo, hi = np.array(box[0]), np.array(box[1])
        sel = ((self.cent >= lo) & (self.cent <= hi)).all(1)
        if facing is not None:
            sel &= (self.fnorm @ np.array(facing[0], float) / np.linalg.norm(facing[0])) >= facing[1]
        return np.nonzero(sel)[0]


def raster(model, faces, size):
    """Every texel (at this texture size) that the faces cover, with a texel of margin: face, barycentric, (row, col)."""
    U = model.uv[model.tri[faces]] * size  # (F, 3, 2), in texel units; glTF v runs down the image
    out_f, out_b, out_rc = [], [], []
    for k, f in enumerate(faces):
        u = U[k]
        lo = np.floor(u.min(0) - 1).astype(int)
        hi = np.ceil(u.max(0) + 1).astype(int)
        lo = np.clip(lo, 0, size - 1)
        hi = np.clip(hi, 0, size - 1)
        xs, ys = np.meshgrid(np.arange(lo[0], hi[0] + 1), np.arange(lo[1], hi[1] + 1))
        px = np.stack([xs.ravel() + 0.5, ys.ravel() + 0.5], 1)
        a, b, c = u
        v0, v1, v2 = b - a, c - a, px - a
        d00, d01, d11 = v0 @ v0, v0 @ v1, v1 @ v1
        den = d00 * d11 - d01 * d01
        if abs(den) < 1e-12:
            continue
        d20, d21 = v2 @ v0, v2 @ v1
        bv = (d11 * d20 - d01 * d21) / den
        bw = (d00 * d21 - d01 * d20) / den
        bu = 1 - bv - bw
        bary = np.stack([bu, bv, bw], 1)
        # Inside, or within about a texel of the edge (so islands don't show a dark rim).
        edge = 1.2 / max(np.sqrt(abs(den)) / max(np.linalg.norm(v0), np.linalg.norm(v1), 1e-9), 1e-9)
        keep = (bary >= -edge).all(1)
        if not keep.any():
            continue
        bary = np.clip(bary[keep], 0, None)
        bary /= bary.sum(1, keepdims=True)
        out_f.append(np.full(keep.sum(), f))
        out_b.append(bary)
        out_rc.append(np.stack([ys.ravel()[keep], xs.ravel()[keep]], 1))
    if not out_f:
        return np.zeros(0, int), np.zeros((0, 3)), np.zeros((0, 2), int)
    f = np.concatenate(out_f)
    b = np.concatenate(out_b)
    rc = np.concatenate(out_rc)
    # A texel two faces both reach: keep one.
    _, first = np.unique(rc[:, 0] * size + rc[:, 1], return_index=True)
    return f[first], b[first], rc[first]


def sample(img, uv):
    """Bilinear read of an (H, W, C) float image at glTF uvs."""
    h, w = img.shape[:2]
    x = np.clip(uv[:, 0] * w - 0.5, 0, w - 1)
    y = np.clip(uv[:, 1] * h - 0.5, 0, h - 1)
    x0, y0 = np.floor(x).astype(int), np.floor(y).astype(int)
    x1, y1 = np.minimum(x0 + 1, w - 1), np.minimum(y0 + 1, h - 1)
    fx, fy = (x - x0)[:, None], (y - y0)[:, None]
    return (img[y0, x0] * (1 - fx) * (1 - fy) + img[y0, x1] * fx * (1 - fy)
            + img[y1, x0] * (1 - fx) * fy + img[y1, x1] * fx * fy)


def weight(points, box, feather):
    lo, hi = np.array(box[0]), np.array(box[1])
    d = np.minimum(points - lo, hi - points).min(1)
    t = np.clip(d / max(feather, 1e-9), 0, 1)
    return t * t * (3 - 2 * t)


def apply_fix(model, fix, images, normal_key):
    feather = fix.get('feather', 0.015)
    if fix.get('at') is not None or fix.get('faces') is not None:
        target = np.zeros(0, int)
        if fix.get('at') is not None:
            _, near = cKDTree(model.cent).query(np.array(fix['at'], float))
            target = np.nonzero(np.isin(model.island, model.island[near]))[0]
        if fix.get('faces') is not None:
            target = np.union1d(target, np.asarray(fix['faces'](model), int))
    else:
        target = model.faces_in(fix['box'], fix.get('facing'))
    if callable(fix.get('source')):
        source = np.asarray(fix['source'](model), int)
    elif fix.get('source'):
        source = model.faces_in(fix['source'])
    else:
        mask = np.ones(len(model.tri), bool)
        mask[target] = False
        source = np.nonzero(mask)[0]
    if not len(target) or not len(source):
        print(f"  {fix.get('name', '?')}: nothing to do ({len(target)} target faces, {len(source)} source faces)")
        return
    tree = cKDTree(model.cent[source])
    flip = np.array([-1.0 if fix.get('mirror') else 1.0, 1, 1])
    shift = np.array(fix.get('shift', [0, 0, 0]), float)
    scale = np.array(fix.get('scale', [1, 1, 1]), float)
    pivot = np.array(fix.get('pivot', [0, 0, 0]), float)
    total = 0
    for key, img in images.items():
        size = img.shape[0]
        f, bary, rc = raster(model, target, size)
        if not len(f):
            continue
        T = model.tri[f]
        P = (model.pos[T] * bary[:, :, None]).sum(1)
        w = (weight(P, fix['box'], feather) if 'box' in fix else np.ones(len(P))) * fix.get('mix', 1.0)
        Q = (P * flip - pivot) * scale + pivot + shift
        # The nearest point on the source faces: check the few faces whose middles are nearest.
        _, cand = tree.query(Q, k=min(8, len(source)))
        cand = source[np.atleast_2d(cand.T).T if cand.ndim == 1 else cand]
        best_d = np.full(len(Q), np.inf)
        best_f = np.zeros(len(Q), int)
        best_b = np.zeros((len(Q), 3))
        for k in range(cand.shape[1]):
            ff = cand[:, k]
            tt = model.tri[ff]
            q, bb = closest_on_triangles(Q, model.pos[tt[:, 0]], model.pos[tt[:, 1]], model.pos[tt[:, 2]])
            d = ((q - Q) ** 2).sum(1)
            take = d < best_d
            best_d[take], best_f[take], best_b[take] = d[take], ff[take], bb[take]
        S = model.tri[best_f]
        suv = (model.uv[S] * best_b[:, :, None]).sum(1)
        got = sample(img, suv)
        if fix.get('paint') is not None:
            got[:] = [0.5, 0.5, 1.0] if key == normal_key else (fix['paint'] if key == 'base' else got)
        elif key == normal_key:
            got = turn_normals(model, got, best_f, best_b, S, f, bary, T, flip)
        cur = img[rc[:, 0], rc[:, 1]]
        img[rc[:, 0], rc[:, 1]] = cur * (1 - w[:, None]) + got * w[:, None]
        total += len(rc)
    print(f"  {fix.get('name', '?')}: {len(target)} faces, {total} texels")


def turn_normals(model, got, sf, sb, S, tf, tb, T, flip):
    """Normal-map texels read in the source faces' frames, written in the target faces' frames."""
    def frame(faces, bary, tri, mirror):
        n = (model.nrm[tri] * bary[:, :, None]).sum(1)
        n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)
        gu, gv = model.gu[faces], model.gv[faces]
        inv = 1 / np.sqrt(np.maximum(np.maximum((gu * gu).sum(1), (gv * gv).sum(1)), 1e-24))
        return gu * inv[:, None] * mirror, gv * inv[:, None] * mirror, n * mirror

    m = got[:, :2] * 2 - 1
    mz = np.sqrt(np.clip(1 - (m * m).sum(1), 0, 1))
    su, sv, sn = frame(sf, sb, S, flip)
    world = su * m[:, :1] + sv * m[:, 1:2] + sn * mz[:, None]
    tu, tv, tn = frame(tf, tb, T, np.ones(3))
    # The bump is carried relative to the surface: turn it by the shortest turn that takes the source's surface normal
    # onto the target's (a shifted source can face quite another way; a plain mirror faces the same way).
    axis = np.cross(sn, tn)
    c = np.clip((sn * tn).sum(1), -0.999, 1)[:, None]
    world = world * c + np.cross(axis, world) + axis * (axis * world).sum(1, keepdims=True) / (1 + c)
    M = np.stack([tu, tv, tn], 2)  # columns
    try:
        x = np.linalg.solve(M, world[:, :, None])[:, :, 0]
    except np.linalg.LinAlgError:
        x = np.einsum('nji,nj->ni', M, world)
    x /= np.maximum(np.linalg.norm(x, axis=1, keepdims=True), 1e-12)
    x[:, 2] = np.abs(x[:, 2])
    out = got.copy()
    out[:, 0] = x[:, 0] * 0.5 + 0.5
    out[:, 1] = x[:, 1] * 0.5 + 0.5
    if out.shape[1] > 2:
        out[:, 2] = x[:, 2] * 0.5 + 0.5
    return np.clip(out, 0, 1)


def pad(model, img, n):
    """Bleed each island's edge texels n texels out into the empty atlas around it."""
    size = img.shape[0]
    _, _, rc = raster(model, np.arange(len(model.tri)), size)
    empty = np.ones(img.shape[:2], bool)
    empty[rc[:, 0], rc[:, 1]] = False
    dist, (iy, ix) = distance_transform_edt(empty, return_indices=True)
    fill = empty & (dist <= n)
    img[fill] = img[iy[fill], ix[fill]]
    return fill.sum()


def main(inp, outp, fixes_path, preview=None):
    doc, buf = load(inp)
    model = Model(doc, buf)
    spec = runpy.run_path(fixes_path)
    fixes = spec['FIXES']
    mat = doc['materials'][0]
    keys = {'base': mat['pbrMetallicRoughness']['baseColorTexture']['index'],
            'mr': mat['pbrMetallicRoughness'].get('metallicRoughnessTexture', {}).get('index'),
            'normal': mat.get('normalTexture', {}).get('index')}
    images, kinds = {}, {}
    for k, t in keys.items():
        if t is None:
            continue
        im, mime = image_of(doc, buf, t)
        images[k] = np.asarray(im.convert('RGB'), np.float64) / 255
        kinds[k] = (t, mime)
    for fix in fixes:
        apply_fix(model, fix, images, 'normal')
    if spec.get('PAD'):
        for k, arr in images.items():
            print(f'  padded {k}: {pad(model, arr, spec["PAD"])} texels')
    # Write the images back into the buffer, appended; the old views stay unused.
    for k, arr in images.items():
        t, mime = kinds[k]
        im = Image.fromarray(np.clip(arr * 255 + 0.5, 0, 255).astype(np.uint8))
        if preview:
            im.save(f'{preview}/tex_{k}.png')
        b = io.BytesIO()
        if mime == 'image/jpeg':
            im.save(b, 'JPEG', quality=93)
        else:
            im.save(b, 'PNG', optimize=True)
        raw = b.getvalue()
        while len(buf) % 4:
            buf.append(0)
        doc['bufferViews'].append({'buffer': 0, 'byteOffset': len(buf), 'byteLength': len(raw)})
        buf += raw
        doc['images'][doc['textures'][t]['source']]['bufferView'] = len(doc['bufferViews']) - 1
    compact(doc, buf, outp)


def compact(doc, buf, outp):
    """Write the GLB with only the buffer views something still uses."""
    used = set()
    for a in doc['accessors']:
        if 'bufferView' in a:
            used.add(a['bufferView'])
    for im in doc.get('images', []):
        used.add(im['bufferView'])
    remap, out = {}, bytearray()
    views = []
    for i, v in enumerate(doc['bufferViews']):
        if i not in used:
            continue
        while len(out) % 4:
            out.append(0)
        start = v.get('byteOffset', 0)
        nv = dict(v)
        nv['byteOffset'] = len(out)
        out += buf[start:start + v['byteLength']]
        remap[i] = len(views)
        views.append(nv)
    doc['bufferViews'] = views
    for a in doc['accessors']:
        if 'bufferView' in a:
            a['bufferView'] = remap[a['bufferView']]
    for im in doc.get('images', []):
        im['bufferView'] = remap[im['bufferView']]
    while len(out) % 4:
        out.append(0)
    doc['buffers'][0]['byteLength'] = len(out)
    js = json.dumps(doc, separators=(',', ':')).encode()
    js += b' ' * (-len(js) % 4)
    with open(outp, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(out)))
        f.write(struct.pack('<II', len(js), 0x4E4F534A) + js)
        f.write(struct.pack('<II', len(out), 0x004E4942) + bytes(out))
    print(f'wrote {outp} ({(28 + len(js) + len(out)) / 1e6:.1f} MB)')


if __name__ == '__main__':
    args = sys.argv[1:]
    prev = None
    if '--preview' in args:
        i = args.index('--preview')
        prev = args[i + 1]
        del args[i:i + 2]
    main(*args[:3], preview=prev)
