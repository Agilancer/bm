// Run with node --test tests/*.test.mjs. No browser or GPU required.
// Model files aren't kept whole in the page once their mesh and pictures are on the GPU: a monster model keeps only its
// colour picture (src/gfx/tripo-slots.js model), and the party's body files are kept six in all, those a look is being
// made from among them (src/gfx/herolook.js trimFiles), the rest fetched again from the browser's copy.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseGLB, imageBytes } from '../src/core/glb.js';
import { HeroLooks } from '../src/gfx/herolook.js';

const root = new URL('../', import.meta.url);
const file = (rel) => { const b = fs.readFileSync(new URL(rel, root)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
const BODIES = ['archer_f1', 'archer_f2', 'archer_f3', 'archer_f4', 'archer_f5', 'archer_f6', 'bard_f1', 'bard_f2', 'bard_f3', 'bard_m1', 'bard_m2', 'bard_m3', 'boomerang_f1'];

function fakeFetch(asked) {
  return async (url, opt) => {
    const rel = url.replace(/^.*?assets\//, 'assets/');
    asked.push([rel.split('/').pop().replace('.glb', ''), opt?.cache || '']);
    return { ok: true, json: async () => ({}), arrayBuffer: async () => file(rel) };
  };
}
const lookOf = (wearer, helm = wearer, chest = wearer, shoulders = wearer) => ({ wearer, groups: { helm, chest, shoulders, arms: wearer, legs: wearer, boots: wearer }, mail: wearer });

test("the party's body files past six are let go once no look is being made from them, oldest first, and fetched again from the cache", async () => {
  const asked = [], was = globalThis.fetch;
  globalThis.fetch = fakeFetch(asked);
  try {
    const L = new HeroLooks({}, '');
    // (The look itself left out: only which files it asks for, and when it's done.)
    let open, held = true;
    const gate = new Promise((ok) => (open = ok));
    L.build = async (rec, ids) => { const f = await Promise.all(ids.map((id) => L.body(id))); if (held) { held = false; await gate; } return { bodies: f.length }; };
    const [a, b, c, d, ...rest] = BODIES;
    // A look from four bodies, held open while eight more looks are made, each from a body of its own.
    const first = L.compose(lookOf(a, b, c, d));
    await new Promise((ok) => setTimeout(ok, 0));
    for (const id of rest.slice(0, 8)) await L.compose(lookOf(id));
    // (The four still in use, and the two newest besides: six in all.)
    assert.deepEqual([...L.files.keys()], [a, b, c, d, rest[6], rest[7]]);
    assert.deepEqual([...L.busy.keys()].sort(), [a, b, c, d].sort());
    open();
    assert.equal((await first).bodies, 4);
    assert.equal(L.busy.size, 0);
    // (Six kept, none over: nothing went when it finished.)
    assert.deepEqual([...L.files.keys()], [a, b, c, d, rest[6], rest[7]]);
    // b asked for again is the newest; one more body lets go the oldest unused, a, and not b.
    L.compose(lookOf(b));
    await L.compose(lookOf(rest[8]));
    assert.ok(!L.files.has(a) && L.files.has(b) && L.files.size === 6);
    // a again: fetched from the browser's copy. Every first fetch was a plain one.
    await L.compose(lookOf(a));
    assert.deepEqual(asked.at(-1), [a, 'force-cache']);
    assert.ok(asked.slice(0, -1).every(([, cache]) => cache === ''));
    assert.equal(new Set(asked.slice(0, -1).map(([id]) => id)).size, asked.length - 1);
  } finally { globalThis.fetch = was; }
});

test('a look that fails still lets go of its bodies, and a failed file is fetched afresh', async () => {
  const asked = [], was = globalThis.fetch;
  const ok = fakeFetch(asked);
  let down = true;
  globalThis.fetch = async (url, opt) => (down && url.includes('archer_f2') ? (asked.push(['archer_f2', opt?.cache || '']), { ok: false, status: 404 }) : ok(url, opt));
  try {
    const L = new HeroLooks({}, '');
    L.build = async (rec, ids) => { await Promise.all(ids.map((id) => L.body(id))); return {}; };
    await assert.rejects(L.compose(lookOf('archer_f1', 'archer_f2')), /archer_f2: 404/);
    assert.equal(L.busy.size, 0);
    await new Promise((r) => setTimeout(r, 0));
    assert.ok(!L.files.has('archer_f2') && L.files.has('archer_f1'));
    down = false;
    await L.compose(lookOf('archer_f1', 'archer_f2'));
    // (Never fetched before, as far as the cache goes: not from it.)
    assert.deepEqual(asked.filter(([id]) => id === 'archer_f2'), [['archer_f2', ''], ['archer_f2', '']]);
  } finally { globalThis.fetch = was; }
});

test('a monster model keeps its colour picture, not its whole file, and its plain skin is made from that', async () => {
  const { TripoSlots } = await import('../src/gfx/tripo-slots.js');
  const roster = JSON.parse(fs.readFileSync(new URL('assets/monsters/tripo/roster.json', root), 'utf8'));
  const id = 'goblin_green_1', src = roster[id].src || id;
  const was = globalThis.fetch;
  globalThis.fetch = fakeFetch([]);
  try {
    const thing = () => ({ destroy() {} });
    const given = [];
    const r = {
      chars: [], tier: { texScale: 1 }, astc: { ready: Promise.resolve(), on: false },
      makeSkinned: () => ({ srcBuf: thing(), IB: thing(), sideVB: thing(), outBuf: thing(), palette: thing(), params: thing() }), addLod: (sk) => { sk.lodIB = sk.IB; },
      imageTexture: async () => thing(), bitmapTexture: async (blob) => { given.push(blob); return thing(); },
    };
    const t = new TripoSlots(r, '', { [id]: roster[id] }, { plain: {} }, 0, 1);
    const m = await t.model(id);
    assert.equal(m.glb, undefined);
    const glb = parseGLB(file(`assets/monsters/tripo/${src}.glb`)), pr = glb.json.meshes[0].primitives[0];
    const want = imageBytes(glb, glb.json.textures[glb.json.materials[pr.material ?? 0].pbrMetallicRoughness.baseColorTexture.index].source);
    assert.ok(m.alb instanceof Blob);
    assert.equal(m.alb.size, want.size);
    assert.equal(m.alb.type, want.type);
    assert.ok(m.alb.size < file(`assets/monsters/tripo/${src}.glb`).byteLength / 3);
    assert.deepEqual(Buffer.from(await m.alb.arrayBuffer()), Buffer.from(await want.arrayBuffer()));
    assert.ok(m.hands.Right && m.hands.Left);
    await t.skin(m, id, 0);
    assert.deepEqual(given, [m.alb]);
  } finally { globalThis.fetch = was; }
});

test("a monster model or skin that failed isn't kept, gives back what it made, and is fetched again when next asked for", async () => {
  const { TripoSlots } = await import('../src/gfx/tripo-slots.js');
  const roster = JSON.parse(fs.readFileSync(new URL('assets/monsters/tripo/roster.json', root), 'utf8'));
  const id = 'goblin_green_1';
  const asked = [], was = globalThis.fetch;
  globalThis.fetch = fakeFetch(asked);
  try {
    const gone = [];
    const thing = (name) => ({ name, destroy() { gone.push(name); } });
    let maps = 0, skinFails = true;
    const r = {
      chars: [], tier: { texScale: 1 }, astc: { ready: Promise.resolve(), on: false },
      makeSkinned: () => ({ srcBuf: thing('src'), IB: thing('IB'), sideVB: thing('side'), outBuf: thing('out'), palette: thing('pal'), params: thing('par') }), addLod: (sk) => { sk.lodIB = thing('lod'); },
      // (The second map of the first try doesn't decode.)
      imageTexture: async () => { maps++; if (maps === 2) throw new Error('no decode'); return thing(`map${maps}`); },
      bitmapTexture: async () => { if (skinFails) throw new Error('no picture'); return thing('skin'); },
    };
    const t = new TripoSlots(r, '', { [id]: roster[id] }, { plain: {} }, 0, 1);
    await assert.rejects(t.model(id), /no decode/);
    await new Promise((ok) => setTimeout(ok, 0));
    assert.ok(!t.models.has(id));
    // (Everything it made: its mesh, its LOD, the one map that came, and the shared mesh's unused pose buffers.)
    assert.deepEqual(gone.sort(), ['IB', 'lod', 'map1', 'out', 'pal', 'par', 'side', 'src']);
    gone.length = 0;
    const m = await t.model(id);
    // (A model that came gives back only those pose buffers, at once: each monster has its own, cloneSkinned.)
    assert.deepEqual(gone.sort(), ['out', 'pal', 'par']);
    assert.equal(asked.filter(([n]) => n === (roster[id].src || id)).length, 2);
    assert.equal(m.nrm.name, 'map3');
    assert.equal(m.mr.name, 'map4');
    await assert.rejects(t.skin(m, id, 0), /no picture/);
    await new Promise((ok) => setTimeout(ok, 0));
    assert.ok(!t.skins.has(`${id}:0`));
    skinFails = false;
    assert.equal((await t.skin(m, id, 0)).name, 'skin');
    assert.ok(t.skins.has(`${id}:0`));
  } finally { globalThis.fetch = was; }
});
