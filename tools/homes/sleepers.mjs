// Where Phobos's street crowd sleep (src/folk/phobos-homes.js): how many have a house and a bed, what kind of bed, nobody in
// another's spot, and where the households went. node tools/homes/sleepers.mjs
import { bedOf, phobosHomes } from '../../src/folk/phobos-homes.js';
import { CROWD } from '../../src/folk/people.js';
import { phobosHouses } from '../../src/core/phobos-build.js';

let t = performance.now();
const H = phobosHomes();
console.log('assign ms', performance.now() - t | 0, 'homed', H.size, 'of', CROWD.length);
t = performance.now();
let ok = 0, lod = 0, clash = 0, trade = 0;
const no = [], kinds = {}, same = new Map(), hs = phobosHouses();
for (const p of CROWD) {
  const b = bedOf(p.id), hm = H.get(p.id);
  if (hm?.lodger) lod++;
  if (!b) { no.push(p.id); continue; }
  ok++; kinds[b.kind] = (kinds[b.kind] || 0) + 1;
  const k = `${b.x.toFixed(2)},${b.z.toFixed(2)},${b.y.toFixed(2)}`;
  if (same.has(k)) { clash++; console.log('SAME SPOT', p.id, same.get(k)); }
  same.set(k, p.id);
  if (hs[b.house].dk !== p.area) console.log('OUT OF AREA', p.id, p.area, hs[b.house].dk);
}
console.log('beds ms', performance.now() - t | 0, 'in a bed', ok, 'none:', no.join(' ') || '-', JSON.stringify(kinds), 'lodgers', lod, 'clashes', clash);
for (const id of ['ph_tap', 'ph_bess', 'ph_wenna', 'ph_ladle', 'ph_suds', 'ph_yoke', 'ph_lady', 'ph_maid', 'ph_keys', 'ph_digger']) {
  const hm = H.get(id), b = bedOf(id);
  console.log(id, hm ? `house ${hm.house} ${hs[hm.house].dk} ${hs[hm.house].mark?.kind || ''}` : 'NONE', b ? `${b.kind} lv${b.level} y${b.y.toFixed(2)}` : '');
}
