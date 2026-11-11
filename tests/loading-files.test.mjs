// Run with: node --test tests/loading-files.test.mjs (no dependencies or GPU).
// The start's loading: files named for the loading screen, a few in hand at once, and the land's paths worked out the
// quick way to the same numbers as the plain way.
import test from 'node:test';
import assert from 'node:assert/strict';
import { FileWatch, fileName, getFile, lanes, watchFiles, watched } from '../src/core/files.js';
import { loadTextureArray } from '../src/gfx/gpu.js';
import { CAVE_PATH, PATHS, fbm, pathAmount, pathStretches, setOpeningTerrain, sstep } from '../src/core/terrain.js';

globalThis.GPUTextureUsage = { TEXTURE_BINDING: 1, COPY_DST: 2, RENDER_ATTACHMENT: 4 };
const tick = () => new Promise((r) => setTimeout(r, 0));

test('a file is named by its path under assets, whatever the game is served from', () => {
  assert.equal(fileName('https://example.org/bm/assets/monsters/zombie/zombie_3.glb'), 'monsters/zombie/zombie_3.glb');
  assert.equal(fileName('http://localhost:8402/assets/game/tex/bark_2_c.webp?v=3'), 'game/tex/bark_2_c.webp');
  assert.equal(fileName('http://localhost:8402/src/title.js'), 'src/title.js');
});

test('the loading screen names the newest file still coming down, then the last that did', () => {
  const w = new FileWatch();
  assert.equal(w.name, '');
  w.note({ name: 'a.glb', state: 'start' });
  w.note({ name: 'b.webp', state: 'start' });
  assert.equal(w.name, 'b.webp');
  w.note({ name: 'b.webp', state: 'done' });
  assert.equal(w.name, 'a.glb');
  w.note({ name: 'a.glb', state: 'done' });
  assert.equal(w.name, 'b.webp');   // (nothing coming: the last one asked for stays up)
  assert.equal(w.count, 2);
});

test('getFile tells the watcher as a file starts and when it is all here, and a missing file is an error that names it', async () => {
  const seen = [];
  watchFiles((f) => seen.push(`${f.state} ${f.name}`));
  const real = globalThis.fetch;
  globalThis.fetch = async (url) => (String(url).endsWith('gone.glb') ? { ok: false, status: 404 } : { ok: true, json: async () => ({ a: 1 }), arrayBuffer: async () => new ArrayBuffer(4) });
  try {
    assert.deepEqual(await getFile('http://h/assets/game/x.json', 'json'), { a: 1 });
    assert.equal((await getFile('http://h/assets/game/y.glb')).byteLength, 4);
    await assert.rejects(getFile('http://h/assets/game/gone.glb'), /game\/gone\.glb: 404/);
    let finish;
    const work = watched('http://h/assets/game/tex/z.webp', new Promise((r) => { finish = r; }));
    assert.equal(seen.at(-1), 'start game/tex/z.webp');
    finish(1); await work; await tick();
    assert.equal(seen.at(-1), 'done game/tex/z.webp');
  } finally { globalThis.fetch = real; watchFiles(null); }
  assert.deepEqual(seen.slice(0, 6), ['start game/x.json', 'done game/x.json', 'start game/y.glb', 'done game/y.glb', 'start game/gone.glb', 'done game/gone.glb']);
});

test('lanes run so many at once, in the order asked, and a failure frees its lane', async () => {
  const run = lanes(2), order = [];
  let active = 0, most = 0;
  const task = (i, fail) => run(async () => {
    order.push(i); active++; most = Math.max(most, active);
    await tick();
    active--;
    if (fail) throw new Error(`no ${i}`);
    return i;
  });
  const all = await Promise.allSettled([task(0), task(1, true), task(2), task(3), task(4)]);
  assert.equal(most, 2);
  assert.deepEqual(order, [0, 1, 2, 3, 4]);
  assert.deepEqual(all.map((r) => r.status === 'fulfilled' ? r.value : r.reason.message), [0, 'no 1', 2, 3, 4]);
});

// A device that counts what's in hand: a layer is in hand from the moment its decode is asked for until the GPU has it.
function fixture() {
  const f = { inHand: 0, most: 0, uploaded: [], closed: 0, texture: { destroyed: false, destroy() { this.destroyed = true; } } };
  f.device = {
    createTexture(desc) { f.texture.desc = desc; return f.texture; },
    createCommandEncoder: () => ({ finish: () => ({}) }),
    queue: {
      copyExternalImageToTexture({ source }, { origin }) { assert.equal(f.texture.destroyed, false); f.uploaded.push([source.id, origin[2]]); },
      submit() {},
      async onSubmittedWorkDone() { await tick(); f.inHand--; },
    },
  };
  f.mip = { generate() {} };
  f.decode = async (id) => { f.inHand++; f.most = Math.max(f.most, f.inHand); await tick(); return { id, width: 4, height: 4, close() { f.closed++; } }; };
  return f;
}

test('two arrays sharing three lanes never have more than three layers in hand, and every layer lands in its own place', async () => {
  const f = fixture(), run = lanes(3);
  const a = Array.from({ length: 20 }, (_, i) => `a${i}`), b = Array.from({ length: 9 }, (_, i) => `b${i}`);
  await Promise.all([loadTextureArray(f.device, f.mip, a, f.decode, 'rgba8unorm', run), loadTextureArray(f.device, f.mip, b, f.decode, 'rgba8unorm', run)]);
  assert.equal(f.most, 3);
  assert.equal(f.closed, 29);
  assert.equal(f.uploaded.length, 29);
  for (const [id, layer] of f.uploaded) assert.equal(Number(id.slice(1)), layer);
});

test('a layer that fails among several in hand: the rest are let go, nothing more is decoded, and the texture is destroyed after', async () => {
  const f = fixture();
  let asked = 0;
  await assert.rejects(loadTextureArray(f.device, f.mip, Array.from({ length: 12 }, (_, i) => i), async (i) => {
    asked++;
    if (i === 4) { await tick(); throw new Error('decode failed'); }
    return f.decode(i);
  }, 'rgba8unorm', lanes(3)), /decode failed/);
  assert.equal(f.texture.destroyed, true);
  assert.ok(asked < 12, `${asked} decodes were asked for`);
  assert.equal(f.closed, asked - 1);   // (every bitmap that was decoded was closed: all that were asked for but the one that failed)
});

// The plain way of working out how worn the ground is, as it was before the stretches had boxes.
const segDist2 = (px, pz, ax, az, bx, bz) => {
  const dx = bx - ax, dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  const ex = ax + dx * t - px, ez = az + dz * t - pz;
  return ex * ex + ez * ez;
};
function plainPathAmount(x, z, opening) {
  const wob = (fbm(x * 0.35, z * 0.35, 3) - 0.5) * 1.6;
  let best = 0;
  for (const p of PATHS) {
    if (p === CAVE_PATH && !opening) continue;
    for (let i = 0; i + 1 < p.pts.length; i++) {
      const [ax, az] = p.pts[i], [bx, bz] = p.pts[i + 1];
      best = Math.max(best, 1 - sstep(p.w * 0.45, p.w * 1.2, Math.sqrt(segDist2(x, z, ax, az, bx, bz)) + wob));
    }
  }
  return Math.max(best, 1 - sstep(4.5, 10.5, Math.hypot((x + 1.5) * 0.9, z - 1) + wob * 1.8));
}

test('the worn ground comes out the same, to the last bit, as going over every stretch of every path', () => {
  let worn = 0;
  for (const opening of [true, false]) {
    setOpeningTerrain(opening);
    for (let j = 0; j < 520; j++) {
      for (let i = 0; i < 520; i++) {
        // (the ground map's own reach, and out along the cave's path)
        const x = j % 2 ? -128 + i * 0.4923 : -420 + i * 1.07, z = j % 2 ? -128 + j * 0.4923 : -60 + j * 0.81;
        const a = pathAmount(x, z), b = plainPathAmount(x, z, opening);
        if (!Object.is(a, b)) assert.fail(`at ${x}, ${z}: ${a} is not ${b}`);
        if (a > 0) worn++;
      }
    }
  }
  setOpeningTerrain(true);
  assert.ok(worn > 5000, `only ${worn} worn points were looked at`);
});

test('a stretch\'s box holds every point within its reach', () => {
  const reach = (w) => w + 5;
  for (const s of pathStretches(PATHS, reach)) {
    for (let k = 0; k <= 8; k++) {
      const t = k / 8, x = s.ax + (s.bx - s.ax) * t, z = s.az + (s.bz - s.az) * t, r = reach(s.w) * 0.999;
      for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r], [r * 0.7, r * 0.7], [-r * 0.7, -r * 0.7]]) {
        assert.ok(x + dx >= s.x0 && x + dx <= s.x1 && z + dz >= s.z0 && z + dz <= s.z1);
      }
    }
  }
});
