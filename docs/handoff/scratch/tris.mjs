// triangles of everything out in the land (|x|,|z| < 5600), by rough place
const { buildSites } = await import('/home/user/bm/src/core/sites.js');
const { SITES } = await import('/home/user/bm/src/core/lands.js');
const b = buildSites(); let land = 0, all = 0; const by = {};
for (const [n, p] of b.parts) for (let i = 0; i < p.idx.length; i += 3) {
  all++; const v = p.idx[i], x = p.pos[v * 3], z = p.pos[v * 3 + 2];
  if (Math.abs(x) > 5600 || Math.abs(z) > 5600) continue; land++;
  let best = 'other', bd = 1e9; for (const k in SITES) { const d = Math.hypot(x - SITES[k].x, z - SITES[k].z) - SITES[k].r; if (d < bd) { bd = d; best = k; } }
  if (bd > 250) best = 'other'; by[best] = (by[best] || 0) + 1;
}
console.log('all', all, 'out in the land', land); console.log(by);
