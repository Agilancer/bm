import { buildSites } from '../../src/core/sites.js';
import { castleTowers } from "../../src/core/phobos-build.js";
const S = buildSites();
const east = S.floors.filter((p) => p.x > 9000 && p.x < 11800 && Math.abs(p.z) < 900);
const keys = new Map(); for (const p of east) { const k = Object.keys(p).sort().join(','); keys.set(k, (keys.get(k) || 0) + 1); }
console.log(keys);
console.log(JSON.stringify(east.find(p=>p.over)).slice(0,400));
const CT = castleTowers(); console.log(Object.keys(CT), CT.towers?.length, JSON.stringify(CT.towers[0]).slice(0, 600)); console.log(JSON.stringify(CT.bridges?.[0]).slice(0,400));
