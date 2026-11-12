const { terrainHeight: Y } = await import('/home/user/bm/src/core/terrain.js');
const { SITES, waterAt } = await import('/home/user/bm/src/core/lands.js');
for (const k of process.argv.slice(2)) {
  const s = SITES[k]; console.log(k, s.x, s.z, 'y', Y(s.x, s.z).toFixed(1), 'pad', s.pad, 'r', s.r);
  for (const r of [10, 20, 30, 40, 50, 60, 80]) { let row = `  r${r}:`; for (let a = 0; a < 8; a++) { const x = s.x + Math.cos(a * Math.PI / 4) * r, z = s.z + Math.sin(a * Math.PI / 4) * r; row += ' ' + (Y(x, z) - Y(s.x, s.z)).toFixed(1) + (waterAt(x, z) != null ? 'w' : ''); } console.log(row + '   (E SE S SW W NW N NE)'); }
}
