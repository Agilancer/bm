import { terrainHeight } from '/home/user/bm/src/core/terrain.js';
import { countryAt, SITES, routeDist } from '/home/user/bm/src/core/lands.js';
const C = { thornwick: [2400, 1800], thornwick2:[2330,1640], cinderford: [-2100, -200], cinderford2:[-2000,-330], deeps: [520, 4090], deeps2:[880,3990], cairns:[1250,-420], causeway:[-420,-2700], tor:[1500,4600], charmill:[-3150,-1000], ferry:[60,-2300], coldharbour:[380,2500], wayside:[1250,90], ravenstor:[3300,-900], lastlight:[-2900,-420] };
for (const [k, [x, z]] of Object.entries(C)) {
  let lo = 1e9, hi = -1e9;
  for (let a = 0; a < 16; a++) for (const r of [15, 35, 60]) { const h = terrainHeight(x + Math.cos(a / 16 * 6.283) * r, z + Math.sin(a / 16 * 6.283) * r); lo = Math.min(lo, h); hi = Math.max(hi, h); }
  let near = null, nd = 1e9; for (const [sk, s] of Object.entries(SITES)) { const d = Math.hypot(s.x - x, s.z - z); if (d < nd) { nd = d; near = sk; } }
  console.log(k, x, z, countryAt(x, z), 'h', terrainHeight(x, z).toFixed(1), 'relief60', (hi - lo).toFixed(1), 'road', routeDist(x, z).d.toFixed(0), 'nearest', near, nd.toFixed(0));
}
