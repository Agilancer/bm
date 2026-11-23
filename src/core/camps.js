// What's built at the camps (src/core/camps-data.js): plain geometry from the sites' own pieces (src/core/sites.js Kit,
// src/core/places.js PIECES), as the lesser places are. Each camp is a trodden yard with a fire and its logs, shelter of
// its own kind (STYLES), the sutler's cart and board, a lantern where its way comes in, and a landmark (MARKS) stood
// tall at its back so it can be picked out from the road or across a valley. Called by buildSites.
//
// Where people stand (CAMP_POSTS) is kept clear, and K.spots has each (`<camp>_0`...). Nothing is laid on a road or in
// water. Plain folk's: no letter, no cross or T, none of Velscour's red and none of Tessariel's blue and gold on any of
// it (README, "The two sides"); the cloth is undyed, moss or umber.
import { terrainHeight } from './terrain.js';
import { routeDist, waterAt } from './lands.js';
import { hash2 } from './terrain-noise.js';
import { CAMPS, CAMP_POSTS, campAt } from './camps-data.js';

const TAU = Math.PI * 2, PI = Math.PI;
const Y = (x, z) => terrainHeight(x, z);
// The cloth each kind of camp is under.
const CLOTH = { halt: 'cloth_oat', drovers: 'umber:cloth_oat', fold: 'cloth_oat', pilgrims: 'pale:cloth_oat', reeds: 'moss:cloth_oat', watch: 'slate:cloth_oat', hunters: 'moss:cloth_oat',
  diggers: 'umber:cloth_oat', scouts: 'soot:cloth_oat', refugees: 'cloth_oat', peat: 'umber:cloth_oat', players: 'pale:cloth_oat' };

export function camps(K) {
  CAMPS.forEach((c, n) => {
    const h = (k) => hash2(n * 13 + k, n * 7 - k * 5 + 1), cloth = CLOTH[c.style] || 'cloth_oat';
    // A point of the camp's frame (u across, w out the front); the land's height there; and a yaw turned from the camp's.
    const P = (u, w) => campAt(c, u, w), V = (u, w, v = 0) => { const [x, z] = P(u, w); return [x, Y(x, z) + v, z]; }, T = (a) => c.yaw + a;
    const posts = CAMP_POSTS.map((p) => P(p.u, p.w));
    // Whether something r wide can stand at (u, w): off the roads, out of water, and clear of where anyone stands.
    const free = (u, w, r = 0.8) => { const [x, z] = P(u, w); return routeDist(x, z).d > 3 + r && waterAt(x, z) === null && posts.every(([px, pz]) => Math.hypot(px - x, pz - z) > r + 1.5); };
    const at = (u, w, r, fn) => { if (free(u, w, r)) fn(...P(u, w)); };
    CAMP_POSTS.forEach((p, i) => { const [x, z] = posts[i]; K.spots[`${c.key}_${i}`] = [x, Y(x, z), z, T(p.face)]; });

    // ---- what every camp has: the fire and its logs, the sutler's cart and board, stores, a lantern at the way in.
    at(-1.2, 0, 0.7, (x, z) => { K.campfire(x, z, c.style !== 'scouts'); if (c.style !== 'scouts') (K.lamps ||= []).push({ p: [x, Y(x, z) + 0.7, z], c: [1, 0.55, 0.22], r: 9, i: 5, flicker: 0.8 }); });
    // (What a phone's land leaves out, K.lean, and what nobody's stopped by on any machine: the small things. What stops
    // a body is the same everywhere, src/core/sites.js buildSites, so only what a phone has too keeps its collider.)
    const extra = (fn) => { if (K.lean) return; const nc = K.colliders.length; fn(); K.colliders.length = nc; };
    at(-1.2, 2.6, 0.9, (x, z) => K.bench(x, z, T(0), 1.0, 'bark'));
    extra(() => { for (const [u, w, a] of [[1.4, -0.6, PI / 2], [-1.6, -2.4, 0.2]]) at(u, w, 0.9, (x, z) => K.bench(x, z, T(a), 1.0, 'bark')); });
    at(8.6, 1.4, 1.8, (x, z) => K.cart(x, z, T(PI / 2 + 0.15), { load: c.style === 'peat' ? 'dark:rubble' : c.style === 'diggers' ? 'rubble' : 'cloth_oat' }));
    at(7.0, -1.4, 1.0, (x, z) => K.table(x, z, T(0.1), 1.2));
    extra(() => { at(8.8, -2.6, 0.5, (x, z) => K.barrel(x, z)); at(9.6, -1.9, 0.5, (x, z) => K.barrel(x, z, 0.3, 0.8)); at(7.4, -3.6, 1.2, (x, z) => K.goods(x, z, 4, 1.1)); });
    for (const sd of [-1, 1]) at(sd * 3.2, 15.5, 0.3, (x, z) => K.lantern(x, z, 2.6, T(sd > 0 ? PI : 0)));

    // ---- its own shelter, by its kind.
    const tent = (u, w, a, big = 1, layer = cloth) => at(u, w, 2 * big, (x, z) => K.tent(x, z, T(a), 1.7 * big, 1.35 * big, 1.75 * big, layer));
    const leanTo = (u, w, a, hx = 2.4, hz = 1.6, hh = 2.3, roof = 'roof_1') => at(u, w, hx, (x, z) => K.leanTo(x, z, T(a), hx, hz, hh, roof));
    const rack = (u, w, a, hang = cloth) => at(u, w, 1.4, (x, z) => K.rack(x, z, T(a), 1.3, hang, 1.7));
    const pile = (u, w, a) => at(u, w, 1.5, (x, z) => K.woodpile(x, z, T(a)));
    const fence = (pts) => { const q = pts.filter(([u, w]) => free(u, w, 0.2)).map(([u, w]) => P(u, w)); if (q.length > 1) K.fence(q, 1.1); };
    // (First the one shelter every machine has, solid; then the rest of it, a PC's alone and stopping nobody.)
    switch (c.style) {
      case 'halt': leanTo(-9, -3, PI / 2, 3.4, 1.8, 2.5); break;
      case 'drovers': case 'fold': leanTo(-9.5, 5.5, PI / 2 - 0.2, 2.6, 1.7, 2.2, 'roof_3'); break;
      case 'pilgrims': at(-8, -5, 2.6, (x, z) => { K.pavilion(x, z, 2.3, 3.3, cloth); K.collide(x, z, 1.8, 1.8, 0, Y(x, z) + 3); }); break;
      case 'reeds': leanTo(-9, -2.5, PI / 2, 2.8, 1.7, 2.2, 'cloth_oat'); break;
      case 'watch': tent(-6, -6.5, 0.4); break;
      case 'hunters': leanTo(-8.5, -3.5, PI / 2 + 0.2, 2.4, 1.6, 1.9, 'moss:roof_3'); break;
      case 'diggers': tent(-5, -8.5, 0.2); break;
      case 'scouts': leanTo(-8, -3, PI / 2 + 0.1, 2.4, 1.5, 1.6, 'soot:roof_3'); break;
      case 'refugees': tent(-5, -8, 0.2, 0.8); break;
      case 'peat': leanTo(-3.5, -9, 0.1, 2.6, 1.7, 2.1, 'roof_3'); break;
      case 'players': at(-7, -6, 3.2, (x, z) => { const y = Y(x, z); K.box('wood', x, y - 0.2, z, 3, 0.75, 2.2, T(0.2)); K.box('wood', x, y + 0.5, z, 0.08, 3.2, 0.08, 0, { collide: false }); }); break;
      default: tent(-5, -8, 0.2);
    }
    extra(() => { switch (c.style) {
      case 'halt':       // carters: a long lean-to for the beasts, a trough, a second cart, the carters' two tents
        at(-8.6, 2.4, 1.3, (x, z) => K.trough(x, z, T(0.1), 1.3));
        tent(-4.5, -8, 0.3); tent(1.5, -9, -0.2);
        at(-6, 8, 1.8, (x, z) => K.cart(x, z, T(0.6), { load: 'wood' })); pile(4, 8.5, 0.2);
        at(-11, 6, 1.5, (x, z) => K.hayrick(x, z, 1.3, 2.1));
        break;
      case 'drovers': case 'fold':   // drovers and shepherds: hurdle pens, a bothy of sods, hay, crooks on a rack
        fence([[-14, -2], [-14, -11], [-5, -12], [-5, -4], [-14, -2]]); if (c.style === 'fold') fence([[4, -14], [12, -13], [13, -6], [5, -6], [4, -14]]);
        tent(2, -8.5, 0.1, 0.9);
        at(-10.5, -7, 1.4, (x, z) => K.hayrick(x, z, 1.2, 1.9)); at(-12.5, 1, 1.3, (x, z) => K.trough(x, z, T(PI / 2), 1.2));
        rack(4.5, 8, 0.4, null);
        break;
      case 'pilgrims':   // palmers: a round pavilion, benches in rows before a bare standing board, a well
        // (its one solid thing is above)
        tent(-2, -9, 0.2, 0.9); tent(3.5, -8.5, -0.3, 0.9);
        for (const w of [6, 8, 10]) for (const u of [-7.5, -5]) at(u, w, 0.9, (x, z) => K.bench(x, z, T(0), 1.0));
        at(4.5, 8.5, 1.4, (x, z) => K.well(x, z, T(0.3), { roof: 'roof_1', stone: 'pale:rubble' }));
        break;
      case 'reeds':      // reed-cutters and eel-catchers: bundles stooked, drying racks, a punt drawn up, withy hurdles
        tent(-3, -9, 0.2);
        for (const [u, w] of [[3, -8.5], [5, -9.5], [4, -11], [-12, 4], [-10.6, 5.4]]) at(u, w, 0.7, (x, z) => { K.cone('cloth_oat', x, Y(x, z) - 0.1, z, 0.55, 1.9, 7); });
        rack(-6.5, 7.5, 0.3, 'wall_13'); rack(-2.5, 9.5, -0.2, 'wall_13'); rack(3.5, 8.5, 0.5, cloth);
        at(-12.5, -8, 2.4, (x, z) => K.boat(x, Y(x, z) + 0.1, z, T(0.7), 4.6, { roll: 0.25 }));
        break;
      case 'watch':      // a lookout's post: a palisade arc at its back, two tents, arms on a rack, a woodpile for the beacon
        { const arc = []; for (let i = 0; i <= 8; i++) { const a = PI * (0.62 + i * 0.095); arc.push(P(Math.sin(a) * 15.5, Math.cos(a) * 15.5)); }
          K.palisade(arc.filter(([x, z]) => routeDist(x, z).d > 4), 2.6, { layer: 'bark' }); }
        tent(-9.5, 0.5, PI / 2);
        rack(-6.5, 7, 0.2, null); pile(3, -8.5, 0.1); pile(4.6, 8.4, 0.3);
        break;
      case 'hunters':    // a hide: low shelters under boughs, skins stretched on frames, a smoking rack, a game pole
        leanTo(-3, -9, 0.15, 2.2, 1.5, 1.8, 'moss:roof_3');
        rack(3.6, -8.6, -0.3, 'wall_13'); rack(-6.8, 6.8, 0.5, 'wall_13'); rack(4.4, 8.2, 0.1, 'wall_13');
        at(-11, 5, 0.4, (x, z) => { const y = Y(x, z); for (let i = 0; i < 3; i++) { const a = i * TAU / 3 + 0.4; K.beam('bark', [x + Math.cos(a) * 1.1, y - 0.1, z + Math.sin(a) * 1.1], [x - Math.cos(a) * 0.12, y + 3.3, z - Math.sin(a) * 0.12], 0.07); } });
        for (const [u, w] of [[-12, -7], [1, -12.5], [11.5, -11]]) at(u, w, 0.6, (x, z) => K.stump(x, z, 0.32, 0.5));
        break;
      case 'diggers':    // diggers and salvagers: spoil in heaps, a sieve frame, ladders, crates of finds, three tents
        tent(0.5, -9.5, -0.1); tent(-9.5, -1.5, PI / 2);
        for (const [u, w, r] of [[-12.5, 6.5, 2.4], [-9, 9.5, 1.7], [4.5, 10, 1.9]]) at(u, w, r, (x, z) => K.heap(c.key === 'scavengers' ? 'dark:rubble' : 'rubble', x, z, r, r * 0.6, 8, { collide: false }));
        at(-6, 6.5, 1.3, (x, z) => K.goods(x, z, 6, 1.3)); rack(4.2, -8.4, 0.3, null);
        at(-12.6, 6.6, 0.3, (x, z) => { const y = Y(x, z); K.ladder(x + 2.2, z + 1.6, x, y + 1.3, z, 0.5); });
        break;
      case 'scouts':     // hidden: no light, low shelters dug in behind a screen of stakes and hung cloth, nothing tall
        leanTo(-2.5, -8.5, 0.1, 2.4, 1.5, 1.6, 'soot:roof_3'); leanTo(3.8, -8, -0.4, 2.0, 1.4, 1.6, 'soot:roof_3');
        { const arc = []; for (let i = 0; i <= 6; i++) { const a = -0.55 + i * 0.18; arc.push(P(Math.sin(a) * 16, Math.cos(a) * 16)); }
          const q = arc.filter(([x, z]) => routeDist(x, z).d > 4); for (let i = 0; i + 1 < q.length; i += 2) K.palisade([q[i], q[i + 1]], 1.9, { layer: 'dark:bark' }); }
        rack(-6.5, 7, 0.3, cloth); rack(5, 8, -0.2, cloth);
        break;
      case 'refugees':   // whoever got out: carts for walls, small tents close together, bundles, a pot on a tripod
        for (const [u, w, a, s] of [[-1, -9.5, -0.1, 0.8], [3, -9, 0.3, 0.8], [-9.5, -4, PI / 2, 0.8], [-10.5, 1.5, PI / 2 + 0.2, 0.8], [-8, 6.5, 0.9, 0.8]]) tent(u, w, a, s);
        at(-12.5, -9, 1.8, (x, z) => K.cart(x, z, T(0.9), { load: 'cloth_oat' })); at(5.5, 9.5, 1.8, (x, z) => K.cart(x, z, T(-0.4), { wreck: true }));
        for (const [u, w] of [[-3.5, 6.5], [-2.4, 7.4], [1.5, 9]]) at(u, w, 0.4, (x, z) => K.sack(x, z, 0.32));
        break;
      case 'peat':       // peat-cutters: turves stacked in long ricks to dry, a sod bothy, barrows, the cut face
        for (const [u, w, a, l] of [[-11, -6, 0.2, 3.2], [-10, -1, 0.15, 2.8], [-9.5, 4.5, 0.25, 3.0], [3, -10, PI / 2 + 0.1, 2.6]]) at(u, w, l * 0.6, (x, z) => K.box('dark:rubble', x, Y(x, z) - 0.2, z, l, 1.5, 0.6, T(a)));
        tent(-5.5, 8, 0.6, 0.9);
        at(4.5, 8.5, 1.8, (x, z) => K.cart(x, z, T(0.3), { load: 'dark:rubble', len: 1.2 }));
        break;
      case 'players':    // the company's survivors: props in crates, costumes on racks, a stage of boards, the lamps of a play
        // (its one solid thing is above)
        rack(-7.5, 5.5, 0.5, cloth); rack(-4, 8.5, 0.1, 'moss:cloth_oat'); rack(4, 8.5, -0.3, 'umber:cloth_oat');
        tent(2.5, -9, -0.2); at(-11.5, 1, 1.3, (x, z) => K.goods(x, z, 7, 1.4));
        for (const [u, w] of [[-10.5, -8.5], [-3.6, -8.6]]) at(u, w, 0.3, (x, z) => K.lantern(x, z, 3, T(0.2)));
        break;
      default: tent(1, -9, -0.1);
    } });

    // ---- its landmark, at its back to one side, tall.
    const [mu, mw] = [12.5, -11.5], [mx, mz] = P(mu, mw), my = Y(mx, mz);
    if (routeDist(mx, mz).d > 5 && waterAt(mx, mz) === null) switch (c.mark) {
      case 'waystone':   // a squared stone twice a man's height on a stepped foot, the miles cut in it as plain strokes
        K.box('pale:stone', mx, my - 0.4, mz, 1.5, 0.75, 1.5, T(0.3)); K.box('pale:stone', mx, my + 0.35, mz, 1.05, 0.4, 1.05, T(0.3), { collide: false });
        K.box('stone', mx, my + 0.75, mz, 0.55, 4.6, 0.42, T(0.3), { collide: false }); K.cone('stone', mx, my + 5.35, mz, 0.6, 0.7, 4, T(0.3) + PI / 4);
        for (let i = 0; i < 4; i++) K.box('dark:stone', ...V(mu - 0.25 + i * 0.17, mw + 0.47, 2.6), 0.03, 0.42, 0.02, T(0.3), { collide: false });
        break;
      case 'stone':      // one great leaning stone, older than the roads, a smaller fallen by it
        K.spike('dark:stone', mx, my - 0.6, mz, 1.5, 7.6, 5, n, [0.09, 0.05]);
        K.box('dark:stone', ...V(mu - 4, mw + 2.5, -0.2), 2.2, 0.8, 0.7, T(1.1));
        break;
      case 'arch':       // the last arch of something, its neighbour fallen: open to the sky, wide enough to walk through
        K.arch('pale:stone', mx, mz, T(0.5), { a: 2.2, hs: 4.4, pw: 1.0, t: 1.1, ring: 0.7, y: my - 0.3 });
        K.arch('pale:stone', ...P(mu + 5.2, mw + 2.8), T(0.5), { a: 2.2, hs: 4.4, pw: 1.0, t: 1.1, ring: 0.7, broken: 0.1, y: my - 0.3 });
        for (const [du, dw, r] of [[3, -1.5, 0.9], [4.4, 0.4, 0.6], [1.6, 2.2, 0.5]]) K.rock('pale:stone', ...P(mu + du, mw + dw), r, r * 0.8, { collide: false, turn: du });
        break;
      case 'hull':       // a big boat's hull turned over on posts for a roof, tarred black
        for (const [du, dw] of [[-2.6, -1.1], [2.6, -1.1], [-2.6, 1.1], [2.6, 1.1]]) K.box('bark', ...V(mu + du, mw + dw, -0.3), 0.14, 2.9, 0.14, T(0.4));
        K.boat(mx, my + 3.9, mz, T(0.4 + PI / 2), 9.5, { layer: 'dark:wood' });
        K.boat(...V(mu - 6, mw + 1.5, 0.15), T(1.3), 4.4, { roll: 0.2 });
        break;
      case 'beacon':     // a timber signal tower: four legs, a platform, a ladder, the fire-basket on its mast
        { const hh = 8.5; for (const [du, dw] of [[-1.5, -1.5], [1.5, -1.5], [1.5, 1.5], [-1.5, 1.5]]) { const [x, , z] = V(mu + du, mw + dw); K.beam('bark', [x, my - 0.4, z], [mx + (x - mx) * 0.55, my + hh, mz + (z - mz) * 0.55], 0.14); }
          K.collide(mx, mz, 1.7, 1.7, T(0), my + 2.4);
          K.box('wood', mx, my + hh - 0.1, mz, 1.5, 0.14, 1.5, T(0), { collide: false });
          for (const [a, b] of [[[-1.5, -1.5], [1.5, -1.5]], [[1.5, -1.5], [1.5, 1.5]], [[1.5, 1.5], [-1.5, 1.5]]]) K.beam('wood', [...P(mu + a[0], mw + a[1])].reduce((q, v, i) => (i ? [q[0], my + hh + 1, v] : [v]), []), [...P(mu + b[0], mw + b[1])].reduce((q, v, i) => (i ? [q[0], my + hh + 1, v] : [v]), []), 0.05);
          K.ladder(...P(mu - 3.2, mw + 0.2), ...((q) => [q[0], my + hh, q[1]])(P(mu - 1.4, mw + 0.2)), 0.55);
          K.box('bark', mx, my + hh, mz, 0.09, 2.6, 0.09, 0, { collide: false });
          K.drum('iron', mx, my + hh + 2.5, mz, 0.45, 0.5, 8, { r2: 0.7, collide: false, open: true }); K.cone('flame', mx, my + hh + 2.6, mz, 0.45, 1.3, 6);
          (K.lamps ||= []).push({ p: [mx, my + hh + 3, mz], c: [1, 0.5, 0.18], r: 16, i: 9, flicker: 0.6 }); }
        break;
      case 'cairn':      // a cairn as tall as a house, every traveller's stone on it, a pole in its top
        K.cairn(mx, mz, 3.4, 5.6, 'rubble'); K.box('bark', mx, my + 5.2, mz, 0.08, 3, 0.08, 0, { collide: false });
        K.cairn(...P(mu - 5, mw + 1.5), 1.1, 1.3, 'rubble');
        break;
      case 'crane':      // a spoil crane: a mast, its jib out over a shaft's mouth ringed with timber, a block on the rope
        { const top = [mx, my + 8.2, mz], j = V(mu - 3.4, mw + 2.4), jib = [j[0], my + 9.4, j[2]];
          K.box('wood', mx, my - 0.3, mz, 0.18, 8.5, 0.18, T(0)); K.beam('wood', [mx, my + 4.4, mz], jib, 0.17); K.beam('wood', top, jib, 0.07);
          for (const [du, dw] of [[2.6, 1.4], [0.8, -2.8]]) K.beam('wood', V(mu + du, mw + dw), [mx, my + 5.4, mz], 0.12);
          K.beam('cloth_oat', jib, [j[0], my + 2.6, j[2]], 0.04); K.box('rubble', j[0], my + 1.7, j[2], 0.5, 0.9, 0.45, T(0.3), { collide: false });
          K.drum('bark', j[0], my - 0.2, j[2], 1.7, 0.9, 8, { r2: 1.6, open: true, collide: false }); K.drum('dark:rubble', j[0], my - 0.15, j[2], 1.5, 0.2, 8, { collide: false });
          K.collide(j[0], j[2], 1.6, 1.6, 0, my + 0.9); }
        break;
      case 'mast':       // a ship's mast stepped in the ground, a crow's nest, a long plain pennon, stays to pegs
        K.box('bark', mx, my - 0.5, mz, 0.2, 12.5, 0.2, T(0.2)); K.drum('wood', mx, my + 8.6, mz, 0.9, 0.8, 8, { r2: 1.05, open: true, collide: false });
        K.drum('wood', mx, my + 8.55, mz, 0.9, 0.08, 8, { collide: false });
        for (let i = 0; i < 3; i++) { const a = T(i * TAU / 3); K.beam('cloth_oat', [mx, my + 8.4, mz], [mx + Math.sin(a) * 5.5, Y(mx + Math.sin(a) * 5.5, mz + Math.cos(a) * 5.5), mz + Math.cos(a) * 5.5], 0.03); }
        K.quad(cloth, [mx, my + 11.9, mz], [mx, my + 11.2, mz], ...((a) => [[mx + Math.sin(a) * 3.2, my + 10.9, mz + Math.cos(a) * 3.2], [mx + Math.sin(a) * 3.2, my + 11.2, mz + Math.cos(a) * 3.2]])(T(1.2)));
        break;
      case 'ribs':       // the ribs of something vast, bleached, standing out of the ground in two rows; its skull's long gone
        for (let i = 0; i < 6; i++) for (const sd of [-1, 1]) { const [x, y, z] = V(mu - 5 + i * 2.1, mw + sd * (2.2 - Math.abs(i - 2.5) * 0.3), -0.4), hh = 5.6 - Math.abs(i - 2.5) * 0.8, a = T(0);
          K.spike('pale:stone', x, y, z, 0.3, hh, 5, i + sd, [-sd * 0.33 * Math.sin(a), -sd * 0.33 * Math.cos(a)]); }
        K.box('pale:stone', ...V(mu, mw, -0.1), 6.2, 0.5, 0.35, T(0), { collide: false });
        break;
      case 'stones':     // seven stones in a ring, one fallen, older than anyone's letters
        for (let i = 0; i < 7; i++) { const a = i / 7 * TAU, [x, y, z] = V(mu + Math.sin(a) * 4.6, mw + Math.cos(a) * 4.6, -0.5), hh = 3.2 + h(40 + i) * 2.2;
          if (i === 4) K.box('dark:stone', x, y + 0.3, z, 0.6, 0.7, hh * 0.5, T(a + 0.4)); else K.spike('dark:stone', x, y, z, 0.75, hh, 4, a, [(h(50 + i) - 0.5) * 0.12, (h(60 + i) - 0.5) * 0.12]); }
        K.box('dark:stone', mx, my - 0.3, mz, 1.3, 0.75, 0.8, T(0.2));
        break;
      case 'block':      // a block for the abbey's pillars, squared, on its sledge where the team died; drums beside it
        K.box('pale:stone', mx, my + 0.35, mz, 2.6, 2.4, 1.6, T(0.5)); for (const sd of [-1, 1]) K.box('wood', ...V(mu + Math.sin(0.5) * sd * 1.2, mw + Math.cos(0.5) * sd * 1.2, -0.05), 3.4, 0.4, 0.16, T(0.5), { collide: false });
        for (const [du, dw, t] of [[-5, 1.5, 0], [-6.4, 3.2, 1]]) K.drum('pale:stone', ...V(mu + du, mw + dw, -0.1), 0.85, 1.2, 10, { turn: t });
        K.ladder(...P(mu + 3.6, mw + 2.2), ...((q) => [q[0], my + 2.75, q[1]])(P(mu + 2.2, mw + 1.2)), 0.5);
        break;
      case 'deadtree':   // a lightning-struck trunk, bare, a crow's lookout: all the Hollow Watch lets show
        K.spike('dark:bark', mx, my - 0.5, mz, 0.7, 9.5, 6, n, [0.05, -0.03]);
        for (let i = 0; i < 4; i++) { const a = h(70 + i) * TAU, y0 = my + 4 + i * 1.3; K.beam('dark:bark', [mx, y0, mz], [mx + Math.cos(a) * 2.6, y0 + 1.2, mz + Math.sin(a) * 2.6], 0.12); }
        break;
      case 'wagon':      // the company's wagon: a house on wheels, its side let down for a stage, lamps along it
        K.box('wood', mx, my + 0.75, mz, 3.3, 2.5, 1.35, T(0.3)); K.box('roof_3', mx, my + 3.25, mz, 3.5, 0.3, 1.55, T(0.3), { collide: false });
        for (const [du, dw] of [[-2.2, 1.5], [2.2, 1.5], [-2.2, -1.5], [2.2, -1.5]]) { const q = campAt({ x: mx, z: mz, yaw: T(0.3) }, du, dw); K.wheel(q[0], my + 0.75, q[1], T(0.3) + PI / 2, 0.78); }
        { const q = campAt({ x: mx, z: mz, yaw: T(0.3) }, 0, 2.9); K.box('wood', q[0], my + 0.35, q[1], 3.1, 0.5, 1.4, T(0.3)); for (const du of [-2.8, 2.8]) { const l = campAt({ x: mx, z: mz, yaw: T(0.3) }, du, 4.2); K.lantern(l[0], l[1], 2.6, T(0.3)); } }
        K.quad(cloth, ...[[-3.2, 3.2], [3.2, 3.2], [3.2, 1.4], [-3.2, 1.4]].map(([du, v]) => { const q = campAt({ x: mx, z: mz, yaw: T(0.3) }, du, 1.42); return [q[0], my + v, q[1]]; }));
        break;
      default:
    }
  });
}
