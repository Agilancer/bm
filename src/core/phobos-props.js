// What stands in a body's way in City State Phobos's streets and alleys (src/core/phobos-build.js keepProps), packed small:
// baked for the whole city by tools/paths/props.mjs into src/core/phobos-props-data.js, stood up as colliders by
// buildSites() (src/core/sites.js), so the sim, auto-play's walking thread and the walking map's bake all know them.
// Eight bytes a box: x and z to 5 cm over the east's box, its half sizes to the centimetre, its turn, its height to 2 cm.
// (Low things, a sack, a heap of ash, are left out: a body's feet go over them, and the box would only snag it.)
import { PROPS } from './phobos-props-data.js';

const X0 = 9000, Z0 = -860, Q = 0.05, LOW = 0.3;
const b64 = (u8) => (typeof Buffer !== 'undefined' ? Buffer.from(u8).toString('base64') : btoa(String.fromCharCode(...u8)));
const unb64 = (s) => {
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(s, 'base64'));
  const bin = atob(s), u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
};

// The module tools/paths/props.mjs writes.
export function packProps(list) {
  const keep = list.filter((c) => c.b === undefined && c.h > LOW && c.hx > 0.02 && c.hz > 0.02);
  const u8 = new Uint8Array(keep.length * 8), dv = new DataView(u8.buffer);
  keep.forEach((c, k) => {
    const o = k * 8, yaw = ((c.yaw % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    dv.setUint16(o, Math.round((c.x - X0) / Q), true);
    dv.setUint16(o + 2, Math.round((c.z - Z0) / Q), true);
    u8[o + 4] = Math.min(255, Math.round(c.hx * 100));
    u8[o + 5] = Math.min(255, Math.round(c.hz * 100));
    u8[o + 6] = Math.round(yaw / (2 * Math.PI) * 256) & 255;
    u8[o + 7] = Math.min(255, Math.round(c.h / 0.02));
  });
  return `// Made by tools/paths/props.mjs from src/core/phobos-build.js: don't edit. ${keep.length} boxes (src/core/phobos-props.js).\nexport const PROPS = '${b64(u8)}';\n`;
}

// The boxes, as Kit.collide makes them ({ x, z, hx, hz, yaw, h }) with their turn's sine and cosine as World keeps them (s,
// co: made here, all one shape, which keeps them small: 23 thousand of them in each of two threads), a fresh list each call.
export function phobosProps() {
  const u8 = unb64(PROPS), dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), out = [];
  for (let o = 0; o + 8 <= u8.length; o += 8) {
    const yaw = u8[o + 6] / 256 * 2 * Math.PI;
    out.push({ x: X0 + dv.getUint16(o, true) * Q, z: Z0 + dv.getUint16(o + 2, true) * Q, hx: u8[o + 4] / 100, hz: u8[o + 5] / 100, yaw, h: u8[o + 7] * 0.02, s: Math.sin(yaw), co: Math.cos(yaw) });
  }
  return out;
}
