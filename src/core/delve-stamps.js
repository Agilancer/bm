// The delves' modelled props, made in Blender (tools/dungeon/stamps.py writes src/core/delve-stamps-data.js) and laid
// here into a delve's own geometry as any of its stone is: on the game's tiled paintings, by the layer each face names, so
// a lantern costs its triangles and nothing else. '$flame', '$wall', '$foot' are the delve's own (its look).
//
// stamp(K, d, name, x, y, z, yaw, o): the prop's origin at x, y, z; turned by yaw, so its own +z (out from a wall) goes
// toward (sin yaw, cos yaw); o.s scales it. Returns its spots (where its flame burns...) in the world.

import { STAMPS } from './delve-stamps-data.js';
import { tileOf } from './sites.js';

export function stampSpots(name, x, y, z, yaw = 0, s = 1) {
  const st = STAMPS[name], c = Math.cos(yaw), sn = Math.sin(yaw), out = {};
  for (const [k, p] of Object.entries(st.spots)) out[k] = [x + (p[0] * c + p[2] * sn) * s, y + p[1] * s, z + (-p[0] * sn + p[2] * c) * s];
  return out;
}

export function stamp(K, d, name, x, y, z, yaw = 0, o = {}) {
  const st = STAMPS[name];
  if (!st) throw new Error(`no stamp called ${name}`);
  const s = o.s || 1, c = Math.cos(yaw), sn = Math.sin(yaw), L = d.look;
  if (K.geometry) {
    for (const [layer0, a] of Object.entries(st.parts)) {
      const layer = layer0 === '$flame' ? (o.flame || L.flame || 'flame') : layer0 === '$wall' ? (L.wall || 'stone') : layer0 === '$foot' ? (o.foot || L.foot || L.wall || 'stone') : layer0;
      const p = K.part(layer), [tw, th] = tileOf(layer), td = tileOf(layer)[2] || tw;
      let base = p.pos.length / 3;
      for (let i = 0; i < a.length; i += 18) {
        // (One triangle: its normal, turned; its corners' paintings by the face's way, in the world's own metres, as the
        // kit's boxes take theirs, so a lantern's iron or a grate's stone runs as the wall beside it does.)
        const nx = a[i + 3] * c + a[i + 5] * sn, ny = a[i + 4], nz = -a[i + 3] * sn + a[i + 5] * c;
        const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
        for (let k = 0; k < 3; k++) {
          const q = i + k * 6, lx = a[q] * s, ly = a[q + 1] * s, lz = a[q + 2] * s;
          const wx = x + lx * c + lz * sn, wy = y + ly, wz = z - lx * sn + lz * c;
          p.pos.push(wx, wy, wz); p.nrm.push(nx, ny, nz);
          if (ay > ax && ay > az) p.uv.push(wx / tw, wz / td);
          else if (ax > az) p.uv.push(wz / tw, -wy / th);
          else p.uv.push(wx / tw, -wy / th);
        }
        p.idx.push(base, base + 1, base + 2);
        base += 3;
      }
    }
  }
  return stampSpots(name, x, y, z, yaw, s);
}
