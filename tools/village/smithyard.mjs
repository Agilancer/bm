// The smith's yard, put into the village's own files. What's built there is src/core/smithyard.js's, drawn by the game from
// that; but what stops a body and what lights the place have to be where everything that reads the town looks for them
// (the sim, the townsfolk's walking, the map): assets/game/village.json. This writes them there (each marked `yard`, so
// they can be told from the village's own and written again), and takes out of the village what stood where the yard now
// does: the little block-and-iron anvil and the barrel under the lean-to, from village.glb and from the colliders.
// tools/village/build_village.py no longer builds those two; run this after a build.
//
//   node tools/village/smithyard.mjs          writes village.json and village.glb
//   node tools/village/smithyard.mjs --check  says whether they're as this would leave them, and changes nothing
import { readFileSync, writeFileSync } from 'node:fs';
import { YARD_COLLIDERS, YARD_LIGHTS } from '../../src/core/smithyard.js';

const check = process.argv.includes('--check');
const dir = new URL('../../assets/game/', import.meta.url);

// What was there: [who, a test for a corner of it].
const OLD = [
  ['the old anvil', (x, y, z) => x > -9.9 && x < -8.5 && z > 27.5 && z < 29.0 && y < 0.9],
  ['the barrel', (x, y, z) => Math.hypot(x + 8.075, z - 27.0) < 0.52 && y < 1.0],
];
const OLD_AT = [[-9.2, 28.25], [-8.075, 27.0]];

// ---- village.json ----
const vPath = new URL('village.json', dir), v = JSON.parse(readFileSync(vPath, 'utf8'));
const round = (o) => JSON.parse(JSON.stringify(o, (k, x) => (typeof x === 'number' ? Math.round(x * 1000) / 1000 : x)));
const colliders = v.colliders.filter((c) => !c.yard && !OLD_AT.some(([x, z]) => Math.hypot(c.x - x, c.z - z) < 0.1)).concat(round(YARD_COLLIDERS));
const lights = v.lights.filter((l) => !l.yard).concat(round(YARD_LIGHTS));
const next = JSON.stringify({ ...v, colliders, lights });
const jsonSame = next === JSON.stringify(v);

// ---- village.glb ----
const gPath = new URL('village.glb', dir), raw = readFileSync(gPath);
const jl = raw.readUInt32LE(12), js = JSON.parse(raw.subarray(20, 20 + jl).toString('utf8')), bin = 20 + jl + 8;
const view = (a) => { const acc = js.accessors[a], bv = js.bufferViews[acc.bufferView]; return { acc, at: bin + (bv.byteOffset || 0) + (acc.byteOffset || 0) }; };
let gone = 0;
for (const mesh of js.meshes) for (const pr of mesh.primitives) {
  if (!['bark', 'iron', 'wall_07'].includes(js.materials[pr.material].name)) continue;
  const P = view(pr.attributes.POSITION), I = view(pr.indices), wide = I.acc.componentType === 5125;
  const idx = (i) => (wide ? raw.readUInt32LE(I.at + i * 4) : raw.readUInt16LE(I.at + i * 2));
  const old = (i) => { const o = P.at + i * 12, x = raw.readFloatLE(o), y = raw.readFloatLE(o + 4), z = raw.readFloatLE(o + 8); return OLD.some(([, f]) => f(x, y, z)); };
  const keep = [];
  for (let t = 0; t < I.acc.count; t += 3) {
    const tri = [idx(t), idx(t + 1), idx(t + 2)];
    if (tri.every(old)) gone++; else keep.push(...tri);
  }
  if (keep.length === I.acc.count || check) continue;
  // (The corners stay where they are, unused: only the list of triangles is shorter.)
  keep.forEach((k, i) => (wide ? raw.writeUInt32LE(k, I.at + i * 4) : raw.writeUInt16LE(k, I.at + i * 2)));
  I.acc.count = keep.length;
}
if (check) {
  console.log(jsonSame && !gone ? 'the village has the yard as it stands' : `out of date: ${jsonSame ? '' : 'village.json differs; '}${gone ? `${gone} triangles of what stood there are still in village.glb` : ''}`);
  process.exit(jsonSame && !gone ? 0 : 1);
}
writeFileSync(vPath, next);
if (gone) {
  // The glb again with its triangle counts changed: the JSON chunk padded to the length it had, so nothing after it moves.
  const text = Buffer.from(JSON.stringify(js), 'utf8');
  if (text.length > jl) throw new Error('the glb\'s JSON grew');
  raw.fill(0x20, 20, 20 + jl);
  text.copy(raw, 20);
  writeFileSync(gPath, raw);
}
console.log(`village.json: ${colliders.length} colliders (${YARD_COLLIDERS.length} the yard's), ${lights.length} lights (${YARD_LIGHTS.length} the yard's); village.glb: ${gone} triangles of the old anvil and barrel taken out`);
