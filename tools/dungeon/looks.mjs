// node tools/dungeon/looks.mjs [delve ...] [--all] : prints the arguments for tools/world/views.mjs that look at each
// delve from inside: across three of its rooms (--all: every room) from head height, and close on a wall light and a standing one in each.
//   node tools/world/views.mjs $(node tools/dungeon/looks.mjs warrens)
// (Pictures go to tools/build/shots/<delve>_<n>.png, <delve>_torch.png, <delve>_fire.png.)
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const { DELVES, torches, braziers, caveFloorY, caveRoom } = await import(path.join(ROOT, 'src/core/dungeon.js'));
const args = process.argv.slice(2), ai = args.indexOf('--all'), all = ai >= 0 && !!args.splice(ai, 1), tag = process.env.TAG || '';
const f = (n) => n.toFixed(1);
const out = [];
for (const d of DELVES) {
  if (args.length && !args.includes(d.key)) continue;
  d.rooms.forEach((r, i) => {
    const n = d.rooms.length; if (!all && ![Math.round(n * 0.3), Math.round(n * 0.65), n - 1].includes(i)) return;
    const R = r.r ?? Math.max(r.hx, r.hz), cx = d.x + r.x, cz = d.z + r.z, a = i * 2.4 + 0.7;
    // (Stood well inside the room, looking across its middle to the far wall.)
    let k = 0.62, ex, ez; do { ex = cx + Math.cos(a) * (r.r ?? r.hx) * k; ez = cz + Math.sin(a) * (r.r ?? r.hz) * k; k -= 0.1; } while (caveRoom(ex, ez) < 1 && k > 0);
    const y = caveFloorY(ex, ez);
    out.push(`${d.key}${tag}_${i}:${f(ex)},${f(y + 1.75)},${f(ez)}:${f(cx - Math.cos(a) * R * 0.5)},${f(caveFloorY(cx, cz) + 1.6)},${f(cz - Math.sin(a) * R * 0.5)}`);
  });
  // (A wall light with room before it to stand in, from part way down the delve.)
  const T = torches(d), open = (q) => caveRoom(q[0] + q[3] * 2.2 - q[4] * 1.1, q[2] + q[4] * 2.2 + q[3] * 1.1) > 0.8 && caveRoom(q[0] + q[3] * 1.2, q[2] + q[4] * 1.2) > 0.8;
  const t = T.slice(Math.floor(T.length * 0.4)).find(open) || T.find(open), b = braziers(d).filter((q) => q[3] === undefined)[3];
  if (t) { const [x, y, z, nx, nz] = t; out.push(`${d.key}${tag}_torch:${f(x + nx * 2.2 - nz * 1.1)},${f(y - 0.3)},${f(z + nz * 2.2 + nx * 1.1)}:${f(x)},${f(y - 0.1)},${f(z)}`); }
  if (b) { const [x, y, z] = b; let a = 0; while (caveRoom(x + Math.cos(a) * 3, z + Math.sin(a) * 3) < 0.8 && a < 6) a += 0.5; out.push(`${d.key}${tag}_fire:${f(x + Math.cos(a) * 3)},${f(y + 1.9)},${f(z + Math.sin(a) * 3)}:${f(x)},${f(y + 1.2)},${f(z)}`); }
}
console.log(out.join(' '));
