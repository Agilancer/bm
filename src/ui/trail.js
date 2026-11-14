// The quest trail: a line of gold dots on the ground, from your feet toward what the quest you follow wants of you (picked in
// the journal: src/folk/quests.js followed), drifting the way you're to go. In the opening it's the road down to Bellmourn,
// after Lisandra. The way there: in town, round the houses by the townsfolk's own walking grid (its worker's A*:
// src/folk/ground.js); out past it, along the roads and paths where they help (overLand in src/core/roads.js: every way
// there is, the same one the other Tessariels and auto-play walk), straight over the land for the rest; and into the
// cathedral, its own way down to the dead (the way tools/interior/check.mjs walks).
// Drawn by src/gfx/trail.js.
import { CHURCH_DOOR, churchAt, inChurch } from '../core/church.js';
import { ROUTE, routeNear } from '../core/escort.js';
import { groundAt } from '../core/interior.js';
import { H } from '../core/layout.js';
import { SITES } from '../core/lands.js';
import { clamp, smoothstep } from '../core/math.js';
import { OPENING } from '../core/opening.js';
import { overLand as roadsOverLand } from '../core/roads.js';
import { inTown } from '../core/town.js';
import { RULES, areaAt, placeSpot } from '../folk/quests.js';
import { BOSSES } from '../core/dungeon.js';
import { CAMPS } from '../sim/slimes.js';
import { QUESTS } from '../folk/lines/quests.js';

const SPACING = 1.3;     // m between dots
const AHEAD = 40;        // m of trail shown
const FLOW = 1.1;        // m/s the dots drift along it
const SIZE = 0.12;       // a dot's radius
const LIFT = 0.1;        // over the ground (the drawn ground can sit a little over the sampled height)
const REPLAN = 0.3;      // s between workings-out of the way
const OFF = 1.5;         // a metre over open ground counts as this many along a road
const MAX_DOTS = 80;

// The town's walking grid (BOUNDS in src/folk/folk.worker.js, less a margin): in here the way is the townsfolk's.
const TOWN_BOX = { x0: -76, x1: 106, z0: -71, z1: 76 };
const inBox = (x, z) => x > TOWN_BOX.x0 && x < TOWN_BOX.x1 && z > TOWN_BOX.z0 && z < TOWN_BOX.z1;

// Into the cathedral and down the long stair to the Bell Crypt: by the great door and the nave, or by the Sexton's Door
// once Silas has given you his key.
const GREAT_WAY = [[68, 0], [106, -8], [110, -9.5], [111.4, -11], [114.3, -11], [114.3, -4], [115, 0], [123, 0], [126, 0], [172, 0]].map(([x, z]) => churchAt(x, z));
const SEXTON_WAY = [[121, 14], [126.9, 10.6], [126.9, 2.6], [127.2, 0.6], [134, 0], [172, 0]].map(([x, z]) => churchAt(x, z));
const CRYPT = churchAt(186, 0);
// The pines, where Corran's dead walk: off the Long Road, west of town.
const PINES = [-214, 180];

// ---- the roads -----------------------------------------------------------------------------------------------------------
// The way from (ax, az) to (bx, bz): along the land's roads and paths where that's shorter (src/core/roads.js, the graph the
// other Tessariels and auto-play walk too), counting open ground at OFF and looking 150 m for a road to get onto; a list of
// [x, z].
const overLand = (ax, az, bx, bz) => roadsOverLand(ax, az, bx, bz, OFF, 150);

// The nearest point of a polyline to (x, z): which segment, and the point.
function nearestOn(line, x, z) {
  let best = Infinity, at = 0, px = line[0][0], pz = line[0][1];
  for (let i = 0; i + 1 < line.length; i++) {
    const [ax, az] = line[i], [bx, bz] = line[i + 1], dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
    const t = clamp(((x - ax) * dx + (z - az) * dz) / l2, 0, 1), qx = ax + dx * t, qz = az + dz * t, d = Math.hypot(qx - x, qz - z);
    if (d < best) { best = d; at = i; px = qx; pz = qz; }
  }
  return { i: at, p: [px, pz], d: best };
}

export class QuestTrail {
  // o: { renderer, townUI, town (src/folk/client.js) }
  constructor(o) {
    Object.assign(this, o);
    this.path = null;
    this.planT = 0;
    this.leg = null;          // the town's way, last asked for: { ax, az, bx, bz, pts }
    this.asking = false;
    this.dots = new Float32Array(MAX_DOTS * 5);
    this.flow = 0;
  }

  // Where the quest you follow wants you now: { x, z, near } (near: stop this far short), with `way` for the way down into the
  // cathedral; or null (nothing followed, or you're where it wants you).
  objective(px, py, pz) {
    const T = this.townUI, Q = T?.quests;
    const id = Q?.followed();
    if (!id) return null;
    const person = (who) => {
      const i = T.people.findIndex((p) => p.id === who), w = i >= 0 ? T.whereOf(i) : null;
      return w ? { x: w.x, z: w.z, near: 1.6 } : null;
    };
    // (Before any work: Lisandra, waiting where the road comes into town, if she's there; else Bram at the inn.)
    if (id === 'start') return (T.lisI !== undefined && T.whereOf(T.lisI) && person('lisandra')) || person('bram');
    const s = Q.state(id), q = QUESTS[id];
    if (!s || s.stage === 'done') return null;
    if (s.stage === 'making') return person(q.giver);
    const st = RULES[id].steps[s.step];
    if (!st) return null;
    if (st.talk) return person(st.talk);
    // Work to take on from each of a list of people: the nearest you've still to see (one with work to give you first).
    if (st.start) {
      const left = st.start.filter((p) => !(s.seen || []).includes(p)).map((p) => [p, person(p)]).filter(([, at]) => at);
      const by = (a, b) => (Q.offers(b[0]).length > 0) - (Q.offers(a[0]).length > 0) || Math.hypot(a[1].x - px, a[1].z - pz) - Math.hypot(b[1].x - px, b[1].z - pz);
      return left.sort(by)[0]?.[1] ?? null;
    }
    const below = (to) => {
      const key = !!Q.state('dead_cant_wait');
      return { x: to[0], z: to[1], near: 2, way: key ? SEXTON_WAY : GREAT_WAY, ways: [SEXTON_WAY, GREAT_WAY] };
    };
    // (Something to bring: back to the giver once you have it all, else down among the dead where it's found.)
    if (st.back || (st.bring && (T.pack?.mats?.[st.bring] || 0) >= (st.n || 1))) return person(q.giver);
    if (st.bring && !st.at) return py < -6 && inChurch(px, py + 1, pz) ? null : below(CRYPT);
    const site = (k) => ({ x: SITES[k].x, z: SITES[k].z, near: SITES[k].r * 0.8 });
    const place = (k, kill) => {
      if (k === 'catacombs') return kill && py < -6 && inChurch(px, py + 1, pz) ? null : below(CRYPT);
      if (k === 'bellcrypt') return below(CRYPT);
      if (k === 'woods') return inTown(px, pz, 10) ? { x: PINES[0], z: PINES[1], near: 6 } : null;
      // (The jellies keep the millpond, and wake only near it: not by the mill or the hamlet.)
      if (k === 'millhaven') { const c = CAMPS.find((q) => q.key === 'millpond'); return c ? { x: c.x, z: c.z, near: 20 } : site('farm'); }
      if (k === 'fen') return site('sallow');
      // A party dungeon: to its portal out in the land (down inside it, nothing leads you: the chart does, src/ui/undermap.js).
      // A lair: to its glade. Any other of the land's places: to it.
      const at = placeSpot(k);
      return at?.delve && areaAt(k, px, py, pz) ? null : at;
    };
    if (st.bring) return place(st.at, true);
    if (st.boss) { const b = BOSSES.find((q) => q.key === st.boss); return b ? place(b.delve || 'warrens', true) : null; }
    if (st.warden) return below(CRYPT);
    if (st.enter) return place(st.enter, false);
    if (st.kill) {
      const at = place(st.kill, true);
      // (Already among them: nothing to lead you to.)
      return at && !at.way && Math.hypot(at.x - px, at.z - pz) < at.near * 1.5 ? null : at;
    }
    if (st.visit) {
      const left = st.visit.filter((k) => !(s.seen || []).includes(k) && SITES[k]);
      left.sort((a, b) => Math.hypot(SITES[a].x - px, SITES[a].z - pz) - Math.hypot(SITES[b].x - px, SITES[b].z - pz));
      return left.length ? site(left[0]) : null;
    }
    return null;
  }

  // The way from you to it, as a list of [x, z].
  plan(snap) {
    const px = snap[H.PX], py = snap[H.PY], pz = snap[H.PZ], stage = snap[H.OPENING];
    // In the opening: down the road to Bellmourn, after her.
    if (stage === OPENING.ESCORT) {
      const s = routeNear(px, pz), out = [[px, pz]];
      for (let i = 0; i < ROUTE.pts.length; i++) if (ROUTE.s[i] > s + 0.5) out.push(ROUTE.pts[i]);
      return out.length > 1 ? out : null;
    }
    if (stage && stage < OPENING.ARRIVED) return null;
    const o = this.objective(px, py, pz);
    if (!o) return null;
    let path;
    if (o.way) {
      // Into the cathedral: in it already, on down its way from the nearest point of whichever you're on; outside, over the
      // land to its door, then in.
      if (inChurch(px, py + 1, pz)) {
        const [a, b] = o.ways.map((w) => nearestOn(w, px, pz));
        const [w, n] = a.d <= b.d ? [o.ways[0], a] : [o.ways[1], b];
        path = [[px, pz], n.p, ...w.slice(n.i + 1)];
      } else {
        const door = o.way === GREAT_WAY ? CHURCH_DOOR : o.way[0];
        path = [...this.over(px, pz, door[0], door[1]), ...o.way.slice(1)];
      }
      path.push([o.x, o.z]);
    } else {
      if (Math.hypot(o.x - px, o.z - pz) < o.near) return null;
      path = this.over(px, pz, o.x, o.z);
      // (Stop short of a person, rather than running into them.)
      const [ax, az] = path.at(-2), [bx, bz] = path.at(-1), l = Math.hypot(bx - ax, bz - az);
      if (l > o.near) path[path.length - 1] = [bx - (bx - ax) / l * o.near, bz - (bz - az) / l * o.near];
      else path.pop();
    }
    return path.length > 1 ? path : null;
  }

  // Over the land from (ax, az) to (bx, bz): in town, round the houses, as far as where the way leaves it.
  over(ax, az, bx, bz) {
    const land = overLand(ax, az, bx, bz);
    if (!inBox(ax, az) || !this.town) return land;
    let k = land.findIndex((p) => !inBox(p[0], p[1]));
    if (k < 0) k = land.length - 1;
    const [ex, ez] = land[k];
    const L = this.leg;
    const fresh = L && Math.hypot(L.ax - ax, L.az - az) < 3 && Math.hypot(L.bx - ex, L.bz - ez) < 3;
    if (!fresh && !this.asking) {
      this.asking = true;
      const ask = { ax, az, bx: ex, bz: ez };
      this.town.route(ax, az, ex, ez).then((pts) => { this.asking = false; this.leg = { ...ask, pts }; this.planT = 0; });
    }
    // (The town's last answer while the next is worked out, from where you are now: you've only moved a little.)
    if (L?.pts?.length > 1 && Math.hypot(L.bx - ex, L.bz - ez) < 6) {
      const n = nearestOn(L.pts, ax, az);
      if (n.d < 4) return [[ax, az], n.p, ...L.pts.slice(n.i + 1), ...land.slice(k + 1)];
    }
    return land;
  }

  frame(dt, snap) {
    const fx = this.renderer.trail;
    if (!fx) return;
    // (Nothing to follow in the Test Dungeon: src/ui/testhall.js.)
    if (this.off) { fx.set(this.dots, 0); return; }
    this.planT -= dt;
    if (this.planT <= 0) { this.planT = REPLAN; this.path = this.plan(snap); }
    const path = this.path;
    if (!path || snap[H.HP] <= 0) { fx.set(this.dots, 0); return; }
    const px = snap[H.PX], py = snap[H.PY], pz = snap[H.PZ];
    // From where you are on it now (it was worked out a moment ago), on along it.
    const n = nearestOn(path.length > 12 ? path.slice(0, 12) : path, px, pz);
    const pts = [n.p, ...path.slice(n.i + 1)];
    this.flow = (this.flow + dt * FLOW) % SPACING;
    // Brighter by day, when the ground's lit and they'd wash out; softer at night.
    const hour = this.renderer.hour ?? 12, day = smoothstep(5, 8, hour) * (1 - smoothstep(18.5, 21, hour));
    const bright = 0.55 + 0.9 * day;
    let count = 0, along = 0, d = this.flow + SPACING;
    for (let i = 0; i + 1 < pts.length && count < MAX_DOTS && d < AHEAD; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], l = Math.hypot(bx - ax, bz - az);
      while (d < along + l && d < AHEAD && count < MAX_DOTS) {
        const t = (d - along) / l, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
        const left = this.leftAfter(pts, i, t);
        const k = smoothstep(0.8, 2.6, d) * (1 - smoothstep(AHEAD - 10, AHEAD, d)) * smoothstep(0, 2.5, left);
        if (k > 0.02) {
          const o = count * 5;
          this.dots[o] = x; this.dots[o + 1] = groundAt(x, z, py + 0.6) + LIFT; this.dots[o + 2] = z;
          this.dots[o + 3] = SIZE; this.dots[o + 4] = k * bright;
          count++;
        }
        d += SPACING;
      }
      along += l;
    }
    fx.set(this.dots, count);
  }

  // How much of the way is left past a point (segment i, t along it), for fading out at its end.
  leftAfter(pts, i, t) {
    let left = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) * (1 - t);
    for (let j = i + 1; j + 1 < pts.length && left < 3; j++) left += Math.hypot(pts[j + 1][0] - pts[j][0], pts[j + 1][1] - pts[j][1]);
    return left;
  }
}
