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
  const found = new Set(), all = [];
  for (const [rel, p] of models(fileURLToPath(assets))) {
    const b = fs.readFileSync(p);
    if (b.readUInt32LE(0) !== 0x46546c67) continue;
    const jl = b.readUInt32LE(12), json = JSON.parse(b.subarray(20, 20 + jl).toString()), start = 20 + jl + 8;
    (json.images || []).forEach((im, k) => {
      if (im.bufferView === undefined) return;
      const bv = json.bufferViews[im.bufferView], bytes = b.subarray(start + (bv.byteOffset || 0), start + (bv.byteOffset || 0) + bv.byteLength);
      all.push([rel, k, bytes, pictureKey(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.length))]);
    });
  }
  // The game finds a copy by the bytes alone, so none may be found for any picture of Lisandra's, in her files or another's.
  const hers = new Set(all.filter(([rel]) => rel.startsWith('game/lisandra/')).map(([, , , key]) => key));
  assert.ok(hers.size > 0, "(Lisandra's pictures were looked at)");
  for (const [rel, k, bytes, key] of all) {
    const e = list.pictures[key];
    if (hers.has(key)) { assert.ok(!e, `${rel} #${k}: a copy of a picture of Lisandra's`); continue; }
    const [w, h] = sides(bytes);
    if (w * h < 1.5 * 1024 * 1024) continue;
    if (!e && list.left[key]) continue;
    assert.ok(e, `${rel} #${k} (${w}x${h}) has no copy: run python tools/lean_pictures/make.py`);
    assert.deepEqual(e.size, [w, h]);
    assert.equal(e.sha1, crypto.createHash('sha1').update(bytes).digest('hex'), `${rel} #${k}: another picture with its key`);
    const copy = fs.readFileSync(new URL(`lean/${e.file}`, assets));
    assert.deepEqual(sides(copy), e.copy, e.file);
    assert.equal(Math.max(...e.copy), 1024);
    found.add(key);
  }
  assert.deepEqual(Object.keys(list.pictures).filter((k) => !found.has(k)), [], 'copies no model holds');
  const held = new Set(all.map(([, , , key]) => key));
  assert.deepEqual(Object.keys(list.left).filter((k) => !held.has(k)), [], 'pictures left that no model holds');
  const files = new Set(Object.values(list.pictures).map((e) => e.file));
  assert.deepEqual(fs.readdirSync(new URL('lean/', assets)).filter((f) => f !== 'pictures.json' && !files.has(f)), [], 'files not in the list');
});

// A model of one picture, its bytes those given.
const glbOf = (u8) => ({ json: { images: [{ bufferView: 0, mimeType: 'image/jpeg' }], bufferViews: [{ byteLength: u8.length }] }, buffer: u8.buffer, binStart: 0 });

function rig({ size = [4096, 4096], copy = [1024, 1024], listFails = false, copyFails = false, copyBad = false, copyIs = copy } = {}) {
  const bytes = new Uint8Array(30000).map((_, i) => (i * 31) >> 3);
  const key = pictureKey(bytes), small = new Blob(['copy']);
  const asked = [], decoded = [], resized = [], live = new Set();
  const get = async (url, as) => {
    asked.push(url.split('/').pop());
    if (url.endsWith('pictures.json')) { if (listFails) throw new Error('404'); return { pictures: { [key]: { file: `${key}.jpg`, size, copy } } }; }
    if (copyFails) throw new Error('offline');
    return small;
  };
  const r = Object.create(Renderer.prototype);
  r.leanPics = new LeanPictures('base/', true, get);
  const blob = pictureOf(glbOf(bytes), 0);
  const bitmap = (width, height) => { const b = { width, height, close() { live.delete(b); } }; live.add(b); return b; };
  globalThis.createImageBitmap = async (src, opts) => {
    if (src === blob) { decoded.push('original'); return bitmap(size[0], size[1]); }
    if (src === small) { decoded.push('copy'); if (copyBad) throw new Error('bad copy'); return bitmap(copyIs[0], copyIs[1]); }
    resized.push(`${opts.resizeWidth}x${opts.resizeHeight}`);
    return bitmap(opts.resizeWidth, opts.resizeHeight);
  };
  // (What's made, with every bitmap made on the way closed but it.)
  const make = async (scale, cap = 0, step = 1) => { const b = await r.decodePicture(blob, scale, cap, step); assert.deepEqual([...live], [b]); b.close(); return [b.width, b.height]; };
  return { r, blob, asked, decoded, resized, make };
}

test("a copy is decoded only where what's made is no bigger than it, and comes out the size the original would have made", async () => {
  // A phone's colour picture of a monster: 256 a side, from the copy.
  let t = rig();
  assert.deepEqual(await t.make(0.25, 256, 4), [256, 256]);
  assert.deepEqual(t.decoded, ['copy']);
  // (Shrunk from the copy in halves, which Chrome filters, not in one go, which it doesn't.)
  assert.deepEqual(t.resized, ['512x512', '256x256']);
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
  t.resized.length = 0;
  assert.deepEqual(await t.make(0.25, 256, 4), [256, 84]);
  assert.deepEqual(t.resized, ['512x171', '256x86', '256x84']);
  assert.deepEqual(t.decoded, ['copy', 'copy']);
  // (From the original, as before: in one go.)
  t = rig();
  t.resized.length = 0;
  assert.deepEqual(await t.make(0.5), [2048, 2048]);
  assert.deepEqual(t.resized, ['2048x2048']);
  // (What a picture with no copy, as Lisandra's, makes: from itself.)
  const plain = new Blob(['x']);
  globalThis.createImageBitmap = async (src, opts) => (src === plain ? { width: 4096, height: 4096, close() {} } : { width: opts.resizeWidth, height: opts.resizeHeight, close() {} });
  const b = await t.r.decodePicture(plain, 0.25, 512, 4);
  assert.deepEqual([b.width, b.height], [512, 512]);
});

test("without its copy or the list, a picture is decoded from its model, the same size", async () => {
  // (copyIs: a copy smaller than the list says, as one kept from before might be, isn't blown up to the size.)
  for (const how of [{ copyFails: true }, { copyBad: true }, { listFails: true }, { copyIs: [128, 128] }]) {
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

test("a model's copies start coming down as its file is asked for, only those this tier uses, and are taken from there", async () => {
  const asked = [];
  const pictures = {
    a: { file: 'a.jpg', size: [4096, 4096], copy: [1024, 1024], in: ['game/x.glb#0', 'game/y.glb#1'] },
    b: { file: 'b.jpg', size: [2048, 2048], copy: [1024, 1024], in: ['game/x.glb#1'] },
    c: { file: 'c.jpg', size: [4096, 4096], copy: [1024, 1024], in: ['monsters/z.glb#0'] },
  };
  const get = async (url) => { asked.push(url.split('/').pop()); return url.endsWith('.json') ? { pictures } : new Blob([url]); };
  const settle = () => new Promise((r) => setTimeout(r, 5));
  // As Medium: half a 4096 picture is more than its copy holds, so that one isn't fetched ahead.
  const L = new LeanPictures('https://h/bm/', true, get, (e) => e.size[0] / 2 <= e.copy[0]);
  L.ahead('https://h/bm/assets/game/x.glb?v=2'); L.ahead('https://h/bm/assets/game/x.png'); L.ahead('https://h/bm/assets/game/x.glb');
  await settle();
  assert.deepEqual(asked, ['pictures.json', 'b.jpg']);
  // Asked for: one fetched ahead is not fetched again; one that wasn't is fetched now.
  assert.ok(await L.copy(pictures.b));
  assert.ok(await L.copy(pictures.a));
  assert.deepEqual(asked, ['pictures.json', 'b.jpg', 'a.jpg']);
  assert.equal(L.used, 2);
  // As a phone: every copy of the model.
  asked.length = 0;
  const P = new LeanPictures('', true, get);
  P.ahead('assets/monsters/z.glb'); P.ahead('assets/game/y.glb');
  await settle();
  assert.deepEqual(asked, ['pictures.json', 'c.jpg', 'a.jpg']);
  // Off: nothing.
  const off = [];
  const O = new LeanPictures('', false, async (u) => { off.push(u); return {}; });
  O.ahead('assets/game/x.glb');
  await settle();
  assert.deepEqual(off, []);
});

test('the key reads the same three samples as the tool, whatever the length', () => {
  // (tools/lean_pictures/make.py picture_key on the same bytes: the samples overlap on a short picture.)
  const of = (n) => pictureKey(new Uint8Array(n).map((_, i) => (i * 7) & 255));
  assert.equal(of(20000), '20000-b7cc8dc5');
  assert.equal(of(5000).split('-')[0], '5000');
  assert.notEqual(of(20000), of(20001));
});

test("a dyed skin is baked from the copy, sized from the original's sides, and from the picture where it can't be", async () => {
  const bytes = new Uint8Array(30000).map((_, i) => (i * 13) >> 2), key = pictureKey(bytes), small = new Blob(['copy']);
  const entry = { file: 'c.jpg', size: [4096, 4096], copy: [1024, 1024] };
  let copyFails = false;
  const L = new LeanPictures('', true, async (url) => { if (url.endsWith('.json')) return { pictures: { [key]: entry } }; if (copyFails) throw new Error('offline'); return small; });
  const blob = pictureOf(glbOf(bytes), 0);
  // In a monster's skin (src/gfx/tripo-slots.js picture): the bake worker is handed the copy and the original's sides, and
  // the rule (src/gfx/picsize.js) it's sized by; if that bake fails, the picture itself, with no sides.
  const posted = [];
  let copyBakeFails = true;
  globalThis.Worker = class {
    postMessage(msg) {
      posted.push([msg.blob === small ? 'copy' : msg.blob === blob ? 'picture' : '?', msg.size, msg.rule]);
      setTimeout(() => this.onmessage({ data: msg.blob === small && copyBakeFails ? { id: msg.id, error: 'bad copy' } : { id: msg.id, bmp: { width: 256, height: 256, close() {} } } }));
    }
  };
  const { TripoSlots } = await import('../src/gfx/tripo-slots.js');
  const mobile = { lean: true, texScale: 0.25, mapScale: 0.5, texCap: 256, texCapNear: 512 };
  const r = { chars: [], tier: mobile, astc: { ready: Promise.resolve(), on: true }, leanPics: L, pictureTexture: async () => ({ destroy() {} }) };
  const wasFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({}) });
  const t = new TripoSlots(r, '', { boss: { height: 3.4 }, knight: { height: 2.05 } }, { plain: {}, red: { hue: 0.4 }, blue: { hue: 0.7 } }, 0, 1);
  globalThis.fetch = wasFetch;
  const knight = { scale: 0.25, cap: 256, step: 4 }, boss = { scale: 1, cap: 512, step: 4 };
  const was = console.warn; console.warn = () => {};
  try {
    // A knight of the rank and file: 256, from the copy; its bake failing, from the picture.
    await t.skin({ alb: blob }, 'knight', 1);
    assert.deepEqual(posted, [['copy', [4096, 4096], knight], ['picture', null, knight]]);
    // A boss, seen close: 512, from the copy (src/gfx/picsize.js fill).
    copyBakeFails = false; posted.length = 0;
    await t.skin({ alb: blob }, 'boss', 1);
    assert.deepEqual(posted, [['copy', [4096, 4096], boss]]);
    // Where the copy can't be had: the picture, by the same rule.
    copyFails = true; posted.length = 0;
    await t.skin({ alb: blob }, 'boss', 2);
    assert.deepEqual(posted, [['picture', null, boss]]);
  } finally { console.warn = was; delete globalThis.Worker; }
});
