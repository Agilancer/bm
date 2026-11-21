// The places in City State Phobos and Castle Velscour auto-play must be able to walk to (tools/paths/map.mjs checks the map
// reaches them; tools/paths/trips.mjs walks to them): each delve's way in and its street mouth, the gates, hubs, forts and
// districts, every castle tower's foot and deck, every bridge's middle, every city tower. { kind, name, x, z, y (or null:
// any height), r (how near counts), dy }.
import { DELVES } from '../../src/core/dungeon.js';
import { PHOBOS } from '../../src/core/phobos-data.js';
import { castleTowers } from '../../src/core/phobos-build.js';
import { cityTowers } from '../../src/core/phobos-towers.js';
import { X0, X1, Z0, Z1 } from '../../src/sim/east-nav.js';
import { PLAIN } from '../../src/core/east.js';

export function targets() {
  const out = [];
  const add = (kind, name, x, z, y = null, r = 2, dy = 2.5) => out.push({ kind, name, x, z, y, r, dy });
  for (const d of DELVES) {
    if (d.within || !d.portal || d.portal.x < X0 || d.portal.x > X1 || d.portal.z < Z0 || d.portal.z > Z1) continue;
    add('portal', d.name, d.portal.x, d.portal.z, null, 1.5);
    for (const w of d.ways || []) add('way in', d.name, w.x, w.z, null, 1.5);
  }
  for (const g of PHOBOS.gates) add('gate', g.name, g.x, g.z, null, 12);
  for (const h of PHOBOS.hubs) add('hub', h.name, h.x, h.z, null, 25);
  for (const f of PHOBOS.forts) add('fort', f.name, f.x, f.z, null, 25);
  for (const d of PHOBOS.districts) add('district', d.name, d.x, d.z, null, 30);
  const CT = castleTowers();
  for (const t of CT.towers) {
    // (Its foot: where its stair starts, at any height: a spire's winds up its outside from the Keep's step it stands
    // against, a rim tower's from the ground or the deck it stands through.)
    if (!t.buried) add('castle tower foot', t.name || t.key, t.x, t.z, null, t.r + 8, 6);
    // (A spire's viewing deck under its crown, any other's deck: both over the moat plain. None on one buried in the Keep.)
    if (t.kind === 'spire') { if (t.levels?.length) add('castle tower deck', t.name || t.key, t.x, t.z, PLAIN + t.levels.at(-1), t.r + 8, 3); }
    else if (!t.buried && t.deck !== undefined) add('castle tower deck', t.name || t.key, t.x, t.z, PLAIN + t.deck, t.r * 1.4 + 6, 3);   // (out to its ring's edge, a square one's too)
  }
  // (A bridge's middle: over its two ends by its arch.)
  for (const b of CT.bridges) add('bridge', `${b.from} to ${b.to}`, (b.a[0] + b.b[0]) / 2, (b.a[2] + b.b[2]) / 2, (b.a[1] + b.b[1]) / 2 + (b.arch || 0), b.w + 1, 4);
  for (const t of cityTowers()) add('city tower', t.name || t.key || `${t.x.toFixed(0)},${t.z.toFixed(0)}`, t.x, t.z, null, (t.r || 4) + 4, 1e9);
  return out;
}
