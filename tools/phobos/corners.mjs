// How many corners the land's scenery has, on a PC and on a phone (tests/sites-lean.test.mjs ceilings: 1.8M, 950k).
//   node tools/phobos/corners.mjs
import { buildSites, dropSiteGeometry } from '../../src/core/sites.js';
const t0 = Date.now();
const count = (s) => { let v = 0; for (const p of s.parts.values()) v += p.pos.length / 3; return v; };
const pc = buildSites(true); const a = count(pc), fl = pc.floors.length, co = pc.colliders.length; dropSiteGeometry();
const ph = buildSites(true, true); const b = count(ph);
console.log(JSON.stringify({ pc: a, phone: b, floors: fl, colliders: co, ms: Date.now() - t0 }));
