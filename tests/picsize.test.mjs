// How big a model's picture is made on each tier (src/gfx/picsize.js): one rule for the pictures decoded on the render
// thread and the monsters' dyed skins baked in a worker. A dyed skin used to skip the phone's cap, and came out 1024
// across where its own colours were 256.
//   node --test tests/picsize.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TALL, decodeScaledBitmap, monsterRule, picRule, picSize } from '../src/gfx/picsize.js';
import { TIERS, lighten } from '../src/gfx/gpu.js';
import { CHIEFS, withVariants } from '../src/core/tripo-monsters.js';

const mobile = TIERS.mobile, light1 = lighten(mobile, 1), light2 = lighten(mobile, 2);
const size = (w, h, tier, opts) => picSize(w, h, picRule(tier, tier.texScale, opts));

test('a phone holds a model\'s colours to 256 a side, whatever size they came', () => {
  assert.deepEqual(size(4096, 4096, mobile), [256, 256]);
  assert.deepEqual(size(2048, 2048, mobile), [256, 256]);
  assert.deepEqual(size(1024, 1024, mobile), [256, 256]);
  // (Smaller than that, the tier's quarter.)
  assert.deepEqual(size(512, 512, mobile), [128, 128]);
  // Not square: the longer side to the cap, the other in proportion.
  assert.deepEqual(size(4096, 2048, mobile), [256, 128]);
  assert.deepEqual(size(1000, 600, mobile), [250, 150]);
});

test('the lighter phones: 192, then 160; normals and metal half that', () => {
  assert.deepEqual(size(4096, 4096, light1), [192, 192]);
  assert.deepEqual(size(4096, 4096, light2), [160, 160]);
  assert.deepEqual(size(2048, 2048, light2), [160, 160]);
  for (const [tier, n] of [[mobile, 128], [light1, 96], [light2, 80]]) assert.deepEqual(size(4096, 4096, tier, { format: 'rgba8unorm' }), [n, n]);
});

test('ASTC\'s blocks: every side a whole number of 4, never over the cap', () => {
  const blocks = { blocks: true };
  assert.deepEqual(size(1000, 600, mobile, blocks), [252, 152]);
  assert.deepEqual(size(1000, 600, mobile), [250, 150]);
  assert.deepEqual(size(4096, 4096, mobile, blocks), [256, 256]);
  for (const tier of [mobile, light1, light2]) {
    for (const [w, h] of [[4096, 4096], [2048, 2048], [1024, 1024], [4096, 2048], [3000, 1000], [1022, 1022], [4, 4]]) {
      for (const opts of [{}, { near: true }, { near: true, fill: true }, { format: 'rgba8unorm' }, { format: 'rgba8unorm', near: true, fill: true }]) {
        const rule = picRule(tier, tier.texScale, { ...opts, blocks: true }), got = picSize(w, h, rule);
        for (const n of got) {
          assert.equal(n % 4, 0, `${w}x${h} ${JSON.stringify(opts)}: ${got}`);
          assert.ok(n <= rule.cap, `${w}x${h} ${JSON.stringify(opts)}: ${got} over ${rule.cap}`);
        }
      }
    }
  }
  // (Step 1, the same rule unrounded.)
  assert.equal(picRule(mobile, 0.25).step, 1);
  assert.equal(picRule(mobile, 0.25, { blocks: true }).step, 4);
});

test('seen close: 512 on a phone, 256 and 192 on the lighter ones; fill makes every source that size', () => {
  assert.deepEqual(size(4096, 4096, mobile, { near: true }), [512, 512]);
  assert.deepEqual(size(2048, 2048, mobile, { near: true }), [512, 512]);
  // Close alone keeps the tier's quarter (Lisandra and your own body, as they were); filled, the cap's size.
  assert.deepEqual(size(1024, 1024, mobile, { near: true }), [256, 256]);
  assert.deepEqual(size(1024, 1024, mobile, { near: true, fill: true }), [512, 512]);
  assert.deepEqual(size(4096, 2048, mobile, { near: true, fill: true }), [512, 256]);
  // Never grown past its own size.
  assert.deepEqual(size(256, 256, mobile, { near: true, fill: true }), [256, 256]);
  assert.deepEqual(size(4096, 4096, light1, { near: true, fill: true }), [256, 256]);
  assert.deepEqual(size(1024, 1024, light2, { near: true, fill: true }), [192, 192]);
  assert.deepEqual(size(1024, 1024, mobile, { near: true, fill: true, format: 'rgba8unorm' }), [256, 256]);
});

test('a PC: no cap at all; fill does nothing there', () => {
  for (const name of ['ultra', 'high', 'medium']) {
    const tier = TIERS[name];
    assert.equal(picRule(tier, tier.texScale).cap, 0, name);
    for (const opts of [{}, { near: true }, { near: true, fill: true }, { format: 'rgba8unorm' }]) {
      assert.deepEqual(size(4096, 4096, tier, opts), [4096 * tier.texScale, 4096 * tier.texScale], `${name} ${JSON.stringify(opts)}`);
    }
  }
  assert.deepEqual(size(4096, 2048, TIERS.medium), [2048, 1024]);
  // (A picture asked for whole, or not shrunk, isn't held on a phone either.)
  assert.deepEqual(picSize(4096, 4096, picRule(mobile, 0.25, { full: true })), [1024, 1024]);
  assert.deepEqual(picSize(4096, 4096, picRule(mobile, 1)), [4096, 4096]);
});

test('a monster\'s skin goes by how tall it stands, or whether it leads an outpost, its own colours or dyed alike', () => {
  const roster = withVariants(JSON.parse(fs.readFileSync(new URL('../assets/monsters/tripo/roster.json', import.meta.url))));
  // (What Tripo made them: the knights, the possessed and the necromancer lords 4096 across, the dragons 2048, the rest 1024.)
  const big = /^(velscour_|possessed_knight|necromancer_3|necromancer_lord)/, mid = /^dragon_/;
  const own = (m) => (big.test(m.src || m.id) ? 4096 : mid.test(m.src || m.id) ? 2048 : 1024);
  let tall = 0;
  for (const [id, m] of Object.entries(roster)) {
    const n = own({ ...m, id });
    const [w] = picSize(n, n, monsterRule(mobile, m, { blocks: true }));
    if (m.height >= TALL || m.chief) { tall++; assert.equal(w, 512, id); } else assert.equal(w, 256, id);
  }
  assert.ok(tall > 30, `${tall} tall`);
  for (const id of ['bv_castellan', 'ib_marshal', 'kb_wyrm', 'ed_thyrraxis', 'ma_tollgiant', 'pc_abbot', 'ph_dollmaker', 'ma_brannoch', 'cl_captain', 'bv_sorvane', 'ib_kennelmaster']) {
    assert.ok(roster[id].height >= TALL, `${id} is a boss seen close`);
  }
  for (const id of ['velscour_knight_1', 'velscour_lancer', 'possessed_knight_1', 'necromancer_3', 'necromancer_lord', 'goatman_black']) {
    assert.ok(roster[id].height < TALL && !roster[id].chief, `${id} is one of many`);
  }
  // Every outpost's chief is seen close, the short ones too: the Tomb-Lord (2.45 m) as Magister Sorvane (2.5) on the same
  // body, the Vigil's Magister (2.4) as its Captain (2.5), the goblins' chiefs (2.0). One also among the many is not.
  assert.ok(CHIEFS.size >= 20, `${CHIEFS.size} chiefs`);
  for (const id of CHIEFS) assert.equal(picSize(1024, 1024, monsterRule(mobile, roster[id]))[0], 512, id);
  const side = (id) => picSize(4096, 4096, monsterRule(mobile, roster[id], { blocks: true }))[0];
  assert.equal(side('w_tomb_lord'), side('bv_sorvane'));
  assert.equal(side('w_vigil_magister'), side('w_tower_captain'));
  for (const id of ['w_tomb_lord', 'w_vigil_magister', 'w_vigil_sergeant', 'w_bramble_chief']) assert.ok(roster[id].chief && roster[id].height < TALL, id);
  for (const id of ['w_grave_caller', 'w_pyromancer', 'w_fen_hag']) assert.ok(!CHIEFS.has(id) && side(id) === 256, id);
  // Normals and metal: everyone's 128, tall or not, a 512 source's too (filled). On a PC, as before.
  for (const [n, h] of [[2048, 6.4], [512, 5.2], [2048, 2]]) assert.deepEqual(picSize(n, n, monsterRule(mobile, { height: h }, { format: 'rgba8unorm' })), [128, 128], `${n} ${h}`);
  assert.deepEqual(picSize(2048, 2048, monsterRule(mobile, { height: 1.9, chief: true }, { format: 'rgba8unorm' })), [128, 128]);
  assert.deepEqual(picSize(4096, 4096, monsterRule(TIERS.medium, { height: 6.4 })), [2048, 2048]);
  assert.deepEqual(picSize(4096, 4096, monsterRule(TIERS.ultra, { height: 6.4 })), [4096, 4096]);
});

test('a monster\'s own colours and a dye of them come out the same size, by its height', async () => {
  const { TripoSlots } = await import('../src/gfx/tripo-slots.js');
  // (The bake worker as a stand-in: it answers each bake at the size its rule gives a 4096 picture.)
  const posted = [];
  globalThis.Worker = class {
    constructor() { this.onmessage = null; }
    postMessage(m) {
      posted.push(m.rule);
      const [w, h] = picSize(4096, 4096, m.rule);
      queueMicrotask(() => this.onmessage({ data: { id: m.id, bmp: { width: w, height: h, close() {} } } }));
    }
  };
  globalThis.createImageBitmap = async (src, o) => (o?.resizeWidth ? { width: o.resizeWidth, height: o.resizeHeight, close() {} } : { width: 4096, height: 4096, close() {} });
  // (The slots ask for the weapons' list as they're made: none here.)
  const was = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({}) });
  try {
    const made = [];
    const r = { chars: [], tier: mobile, astc: { ready: Promise.resolve(), on: true },
      // (No phone copies here: src/gfx/lean-pictures.js, tests/lean-pictures.test.mjs.)
      leanPics: { source: async (blob) => ({ blob, size: null }) }, decodePicture: (blob, ...rule) => decodeScaledBitmap(blob, ...rule),
      pictureTexture: async (bmp, format) => { made.push([bmp.width, bmp.height, format]); return { destroy() {} }; } };
    const roster = { tall: { height: 3.4 }, short: { height: 2.05 } };
    const t = new TripoSlots(r, '', roster, { Base: {}, Infernal: { sat: 1.3, tint: [1, 0.32, 0.12], tamt: 0.42 } }, 0, 0);
    const m = { alb: {} };
    for (const id of ['tall', 'short']) for (const pal of [0, 1]) await t.skin(m, id, pal);
    assert.deepEqual(made, [[512, 512, 'rgba8unorm-srgb'], [512, 512, 'rgba8unorm-srgb'], [256, 256, 'rgba8unorm-srgb'], [256, 256, 'rgba8unorm-srgb']]);
    // (The dyed ones were baked by the rule the plain ones were decoded by, ASTC's blocks and all.)
    assert.deepEqual(posted, [{ scale: 1, cap: 512, step: 4 }, { scale: 0.25, cap: 256, step: 4 }]);
    // Normals and metal: 128, a tall monster's as a short one's.
    made.length = 0;
    await t.picture('tall', {}, 'rgba8unorm');
    await t.picture('short', {}, 'rgba8unorm');
    assert.deepEqual(made, [[128, 128, 'rgba8unorm'], [128, 128, 'rgba8unorm']]);
  } finally { delete globalThis.Worker; delete globalThis.createImageBitmap; globalThis.fetch = was; }
});

test('the bake worker and the render thread size by the same rule', () => {
  const read = (p) => fs.readFileSync(new URL(`../src/gfx/${p}`, import.meta.url), 'utf8');
  assert.match(read('bake.worker.js'), /import \{[^}]*decodeScaledBitmap[^}]*\} from '\.\/picsize\.js'/);
  assert.match(read('gpu.js'), /from '\.\/picsize\.js'/);
  const slots = read('tripo-slots.js');
  assert.match(slots, /monsterRule\(/);
  // (No size worked out anywhere else: the worker is handed the rule, not a scale of its own.)
  assert.doesNotMatch(read('bake.worker.js'), /resizeWidth/);
});
