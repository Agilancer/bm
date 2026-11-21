// Run with node --test tests/*.test.mjs. No browser or GPU required.
// The phone's copies of the models' big pictures (tools/lean_pictures/make.py, assets/lean/, src/gfx/lean-pictures.js):
// every one there should be, found by the original's own bytes, none of Lisandra's, none left over; and the game decodes
// a copy only where what it makes is no bigger, sized as it would have been from the original.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LeanPictures, pictureKey, pictureOf } from '../src/gfx/lean-pictures.js';
import { Renderer } from '../src/gfx/renderer.js';

globalThis.GPUTextureUsage = { TEXTURE_BINDING: 1, COPY_DST: 2, RENDER_ATTACHMENT: 4 };
const assets = new URL('../assets/', import.meta.url);
const list = JSON.parse(fs.readFileSync(new URL('lean/pictures.json', assets), 'utf8'));

// A picture's sides from its header: PNG, JPEG or WebP.
function sides(b) {
  if (b[0] === 0x89 && b[1] === 0x50) return [b.readUInt32BE(16), b.readUInt32BE(20)];
  if (b[0] === 0xff && b[1] === 0xd8) {
    for (let i = 2; i < b.length - 8;) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m === 0xd8 || m === 0x01 || m === 0xff || (m >= 0xd0 && m <= 0xd7)) { i += m === 0xff ? 1 : 2; continue; }
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  if (b.subarray(0, 4).toString() === 'RIFF') {
    const t = b.subarray(12, 16).toString();
    if (t === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
    if (t === 'VP8L') { const v = b.readUInt32LE(21); return [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1]; }
    if (t === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  }
  throw new Error('not a picture this knows');
}

function* models(dir, rel = '') {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name), r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) { if (r !== 'lean') yield* models(p, r); } else if (e.name.toLowerCase().endsWith('.glb')) yield [r, p];
  }
}

test("every big picture in a model has its phone copy, found by its own bytes, at 1024; none of Lisandra's; none left over", () => {
  const found = new Set();
  let lisandra = 0;
  for (const [rel, p] of models(fileURLToPath(assets))) {
    const b = fs.readFileSync(p);
    if (b.readUInt32LE(0) !== 0x46546c67) continue;
    const jl = b.readUInt32LE(12), json = JSON.parse(b.subarray(20, 20 + jl).toString()), start = 20 + jl + 8;
    (json.images || []).forEach((im, k) => {
      if (im.bufferView === undefined) return;
      const bv = json.bufferViews[im.bufferView], bytes = b.subarray(start + (bv.byteOffset || 0), start + (bv.byteOffset || 0) + bv.byteLength);
      const [w, h] = sides(bytes);
      if (w * h < 1.5 * 1024 * 1024) return;
      const key = pictureKey(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.length)), e = list.pictures[key];
      if (rel.startsWith('game/lisandra/')) { lisandra++; assert.ok(!e || !e.in.some((s) => s.startsWith('game/lisandra/')), `${rel} #${k} has a copy`); return; }
      assert.ok(e, `${rel} #${k} (${w}x${h}) has no copy: run python tools/lean_pictures/make.py`);
      assert.deepEqual(e.size, [w, h]);
      assert.equal(e.sha1, crypto.createHash('sha1').update(bytes).digest('hex'), `${rel} #${k}: another picture with its key`);
      const copy = fs.readFileSync(new URL(`lean/${e.file}`, assets));
      assert.deepEqual(sides(copy), e.copy, e.file);
      assert.equal(Math.max(...e.copy), 1024);
      found.add(key);
    });
  }
  assert.ok(lisandra > 0, "(Lisandra's pictures were looked at)");
  assert.deepEqual(Object.keys(list.pictures).filter((k) => !found.has(k)), [], 'copies no model holds');
  const files = new Set(Object.values(list.pictures).map((e) => e.file));
  assert.deepEqual(fs.readdirSync(new URL('lean/', assets)).filter((f) => f !== 'pictures.json' && !files.has(f)), [], 'files not in the list');
});

// A model of one picture, its bytes those given.
const glbOf = (u8) => ({ json: { images: [{ bufferView: 0, mimeType: 'image/jpeg' }], bufferViews: [{ byteLength: u8.length }] }, buffer: u8.buffer, binStart: 0 });

function rig({ size = [4096, 4096], copy = [1024, 1024], listFails = false, copyFails = false, copyBad = false } = {}) {
  const bytes = new Uint8Array(30000).map((_, i) => (i * 31) >> 3);
  const key = pictureKey(bytes), small = new Blob(['copy']);
  const asked = [], decoded = [];
  const get = async (url, as) => {
    asked.push(url.split('/').pop());
    if (url.endsWith('pictures.json')) { if (listFails) throw new Error('404'); return { pictures: { [key]: { file: `${key}.jpg`, size, copy } } }; }
    if (copyFails) throw new Error('offline');
    return small;
  };
  const r = Object.create(Renderer.prototype);
  r.leanPics = new LeanPictures('base/', true, get);
  const blob = pictureOf(glbOf(bytes), 0);
  globalThis.createImageBitmap = async (src, opts) => {
    if (src === blob) { decoded.push('original'); return { width: size[0], height: size[1], close() {} }; }
    if (src === small) { decoded.push('copy'); if (copyBad) throw new Error('bad copy'); return { width: copy[0], height: copy[1], close() {} }; }
    return { width: opts.resizeWidth, height: opts.resizeHeight, close() {} };
  };
  const make = async (scale, cap = 0, step = 1) => { const b = await r.decodePicture(blob, scale, cap, step); return [b.width, b.height]; };
  return { r, blob, asked, decoded, make };
}

test("a copy is decoded only where what's made is no bigger than it, and comes out the size the original would have made", async () => {
  // A phone's colour picture of a monster: 256 a side, from the copy.
  let t = rig();
  assert.deepEqual(await t.make(0.25, 256, 4), [256, 256]);
  assert.deepEqual(t.decoded, ['copy']);
  // A body's (full: 1024, the copy itself) and its normals at half that.
  assert.deepEqual(await t.make(0.25, 0, 4), [1024, 1024]);
  assert.deepEqual(await t.make(0.125, 0, 4), [512, 512]);
  assert.deepEqual(t.decoded, ['copy', 'copy', 'copy']);
  // Medium's 2048 is more than the copy holds: the original.
  assert.deepEqual(await t.make(0.5), [2048, 2048]);
  assert.deepEqual(t.decoded.at(-1), 'original');
  // A long picture (the pale gauntlets', 3072 by 1024): as from the original, to the block.
  t = rig({ size: [3072, 1024], copy: [1024, 341] });
  assert.deepEqual(await t.make(0.25, 0, 4), [768, 256]);
  assert.deepEqual(await t.make(0.25, 256, 4), [256, 84]);
  assert.deepEqual(t.decoded, ['copy', 'copy']);
  // (What a picture with no copy, as Lisandra's, makes: from itself.)
  const plain = new Blob(['x']);
  globalThis.createImageBitmap = async (src, opts) => (src === plain ? { width: 4096, height: 4096, close() {} } : { width: opts.resizeWidth, height: opts.resizeHeight, close() {} });
  const b = await t.r.decodePicture(plain, 0.25, 512, 4);
  assert.deepEqual([b.width, b.height], [512, 512]);
});

test("without its copy or the list, a picture is decoded from its model, the same size", async () => {
  for (const how of [{ copyFails: true }, { copyBad: true }, { listFails: true }]) {
    const t = rig(how);
    const was = console.warn; console.warn = () => {};
    try { assert.deepEqual(await t.make(0.25, 256, 4), [256, 256], JSON.stringify(how)); } finally { console.warn = was; }
    assert.equal(t.decoded.at(-1), 'original');
  }
  // Off (a tier at full size, or ?lean=0): the list isn't even fetched.
  const asked = [];
  const off = new LeanPictures('', false, async (u) => { asked.push(u); return {}; });
  await off.ready;
  assert.equal(off.find(new Blob(['x'])), null);
  assert.deepEqual(asked, []);
});

test('the key reads the same three samples as the tool, whatever the length', () => {
  // (tools/lean_pictures/make.py picture_key on the same bytes: the samples overlap on a short picture.)
  const of = (n) => pictureKey(new Uint8Array(n).map((_, i) => (i * 7) & 255));
  assert.equal(of(20000), '20000-b7cc8dc5');
  assert.equal(of(5000).split('-')[0], '5000');
  assert.notEqual(of(20000), of(20001));
});

test("a dyed skin is baked from the copy at the scale that makes it the same size, and from the picture where it can't be", async () => {
  const bytes = new Uint8Array(30000).map((_, i) => (i * 13) >> 2), key = pictureKey(bytes), small = new Blob(['copy']);
  const entry = { file: 'c.jpg', size: [4096, 4096], copy: [1024, 1024] };
  let copyFails = false;
  const L = new LeanPictures('', true, async (url) => { if (url.endsWith('.json')) return { pictures: { [key]: entry } }; if (copyFails) throw new Error('offline'); return small; });
  const blob = pictureOf(glbOf(bytes), 0);
  const was = console.warn; console.warn = () => {};
  try {
    // A phone's 4096 picture, a quarter: the copy at its own size (the worker resizes nothing at 1).
    assert.deepEqual(await L.forScale(blob, 0.25), { blob: small, scale: 1 });
    // Medium's half is more than the copy holds.
    assert.deepEqual(await L.forScale(blob, 0.5), { blob, scale: 0.5 });
    // A 2048: the copy at a half.
    const set = (e) => { L.list[key] = e; };
    set({ ...entry, size: [2048, 2048] });
    assert.deepEqual(await L.forScale(blob, 0.25), { blob: small, scale: 0.5 });
    // A long one: one scale for both sides still comes out the original's size, 768 by 256.
    set({ ...entry, size: [3072, 1024], copy: [1024, 341] });
    assert.deepEqual(await L.forScale(blob, 0.25), { blob: small, scale: 0.75 });
    // Where one scale couldn't make the copy the original's size exactly (the copy's sides out of proportion), the picture.
    set({ ...entry, size: [3000, 1000], copy: [1000, 300] });
    assert.deepEqual(await L.forScale(blob, 0.25), { blob, scale: 0.25 });
    // And where the copy can't be had.
    set(entry); copyFails = true;
    assert.deepEqual(await L.forScale(blob, 0.25), { blob, scale: 0.25 });
  } finally { console.warn = was; }

  // In a monster's skin (src/gfx/tripo-slots.js): baked from the copy; if that bake fails, from the picture.
  copyFails = false;
  const posted = [];
  let copyBakeFails = true;
  globalThis.Worker = class {
    postMessage(msg) {
      posted.push([msg.blob === small ? 'copy' : msg.blob === blob ? 'picture' : '?', msg.scale]);
      setTimeout(() => this.onmessage({ data: msg.blob === small && copyBakeFails ? { id: msg.id, error: 'bad copy' } : { id: msg.id, bmp: { width: 1024, height: 1024, close() {} } } }));
    }
  };
  const { TripoSlots } = await import('../src/gfx/tripo-slots.js');
  const thing = () => ({ destroy() {}, createView() {} });
  const r = {
    chars: [], tier: { texScale: 0.25 }, astc: { ready: Promise.resolve(), on: false, pack: async (t) => t }, leanPics: L,
    mip: { generate() {} }, device: { createTexture: () => thing(), createCommandEncoder: () => ({ finish() {} }), queue: { copyExternalImageToTexture() {}, submit() {} } },
  };
  const wasFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({}) });
  const t = new TripoSlots(r, '', {}, { plain: {}, red: { hue: 0.4 } }, 0, 1);
  globalThis.fetch = wasFetch;
  await t.skin({ alb: blob }, 'x', 1);
  assert.deepEqual(posted, [['copy', 1], ['picture', 0.25]]);
  copyBakeFails = false;
  await t.skin({ alb: blob }, 'y', 1);
  assert.deepEqual(posted.at(-1), ['copy', 1]);
});
