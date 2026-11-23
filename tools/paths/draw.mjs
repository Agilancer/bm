// A picture of the east's walking map (tools/paths/map.mjs's reach.bin): per half-metre cell, green: walked to and back from
// the gate; red: got into, no way back; dark grey: a body fits but it's never got to; black: nothing to stand on. Brighter:
// higher up. A box of it with x0 z0 x1 z1 (metres), at a pixel a cell, or the whole at one pixel per 2 cells.
//   node tools/paths/draw.mjs out.png [x0 z0 x1 z1] [--trails]   (--trails: the streets and road yellow, the trails laid to them
// orange: src/core/phobos-trails.js)
import fs from 'node:fs';
import zlib from 'node:zlib';
import { CELL, W, H, X0, Z0 } from './grid.mjs';
import { loadFine } from './map.mjs';
const F = loadFine(), reach = fs.readFileSync(new URL('../build/paths/reach.bin', import.meta.url));
const TR = process.argv.includes('--trails'), [out, ...b] = process.argv.slice(2).filter((a) => a !== '--trails');
const box = b.length ? b.map(Number) : [X0, Z0, X0 + W * CELL, Z0 + H * CELL], step = b.length ? 1 : 2;
const i0 = Math.floor((box[0] - X0) / CELL), j0 = Math.floor((box[1] - Z0) / CELL), i1 = Math.floor((box[2] - X0) / CELL), j1 = Math.floor((box[3] - Z0) / CELL);
const w = Math.floor((i1 - i0) / step), h = Math.floor((j1 - j0) / step), px = Buffer.alloc(w * h * 3);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const k = (j0 + y * step) * W + i0 + x * step;
  let best = 0, by = 0;
  for (let q = F.start[k]; q < F.start[k + 1]; q++) { const r = reach[q] === 1 ? 3 : reach[q] === 2 ? 2 : F.fit[q] ? 1 : 0; if (r > best || (r === best && F.ys[q] > by)) { best = r; by = F.ys[q]; } }
  const lift = Math.max(0, Math.min(1, by / 400)), o = (y * w + x) * 3;
  const c = best === 3 ? [30 + 120 * lift, 110 + 145 * lift, 40 + 60 * lift] : best === 2 ? [180 + 75 * lift, 30, 30] : best === 1 ? [60 + 60 * lift, 60 + 60 * lift, 70 + 60 * lift] : [0, 0, 0];
  px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2];
}
if (TR) {
  const { trailRoots } = await import('../../src/core/phobos-trails.js'), { TRAILS } = await import('../../src/core/phobos-trails-data.js');
  const dot = (x, z, c) => { const px_ = Math.floor(((x - X0) / CELL - i0) / step), py = Math.floor(((z - Z0) / CELL - j0) / step); for (let a = -1; a <= 1; a++) for (let q = -1; q <= 1; q++) { const X = px_ + a, Y = py + q; if (X >= 0 && Y >= 0 && X < w && Y < h) { const o = (Y * w + X) * 3; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; } } };
  const draw = (L, c) => { for (let i = 0; i + 1 < L.length; i++) { const [ax, az] = L[i], [bx, bz] = L[i + 1], n = Math.ceil(Math.hypot(bx - ax, bz - az) / (CELL * step)) + 1; for (let k = 0; k <= n; k++) dot(ax + (bx - ax) * k / n, az + (bz - az) * k / n, c); } };
  for (const t of TRAILS) draw(t.pts, [255, 140, 0]);
  for (const L of trailRoots()) draw(L, [255, 235, 40]);
}
const crc = (buf) => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } c = 0xffffffff; for (const v of buf) c = t[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const raw = Buffer.alloc((w * 3 + 1) * h);
for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; px.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
fs.writeFileSync(out, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
console.log(out, w, 'x', h);
