// The eight rock meshes as an OBJ, for a look in Blender: node tools/world/rock_sheet.mjs out.obj
import fs from 'node:fs';
globalThis.GPUBufferUsage = {};
const src = fs.readFileSync(new URL('../../src/gfx/rocks.js', import.meta.url), 'utf8');
const body = src.slice(src.indexOf('function rng'), src.indexOf('const ROCK = COMMON'));
const { verts, idx, parts } = new Function(`const VARIANTS = 8, LODS = 3; ${body}; return rockMeshes();`)();
let o = '';
for (let i = 0; i < verts.length; i += 6) o += `v ${verts[i]} ${verts[i + 1]} ${verts[i + 2]}\nvn ${verts[i + 3]} ${verts[i + 4]} ${verts[i + 5]}\n`;
for (let k = 0; k < 8; k++) {
  const p = parts[k];
  o += `o rock_${k}\n`;
  for (let t = p.first; t < p.first + p.count; t += 3) o += `f ${idx[t] + 1}//${idx[t] + 1} ${idx[t + 1] + 1}//${idx[t + 1] + 1} ${idx[t + 2] + 1}//${idx[t + 2] + 1}\n`;
}
fs.writeFileSync(process.argv[2], o);
console.log('rocks', parts.map((p) => p.count / 3).join(' '));
