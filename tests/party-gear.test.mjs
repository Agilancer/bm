// The party's gear (src/items/partygear.js), rolled from the real files: what drops fits who it's for, a boss's hoard
// always has some, old companions catch up while you're away, and every piece has a picture and something to lie on the
// ground as.   node --test tests/party-gear.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { goldOf, harmonize, hsvOf, lumOf, paintProp, plainRamp, rampMap, richer } from '../src/gfx/recolour.js';
import { useKit, outfitRamps, setsWorn, rampFor, lookOf, bareHead, rollPartyGear, partyDrops, catchUp, fits, score, bestOf, gearStats, groundModelOf, sizeOfHG, hgLines, hgWorth, kindsOf, shapeShows, HG_SLOTS, HG_ARMOUR, SHIELD_KINDS, PROP_PALS } from '../src/items/partygear.js';
import { makeRng } from '../src/items/items.js';

const root = new URL('../', import.meta.url);
const json = (p) => JSON.parse(fs.readFileSync(new URL(p, root), 'utf8'));
const kit = json('assets/game/heroes/kit.json'), roster = json('assets/game/heroes/roster.json'), looks = json('assets/game/heroes/looks.json');
useKit(kit, looks, roster);
const exists = (p) => fs.existsSync(new URL(p, root));
// Everyone as a party member would be: their body, class, sex, kit and a level.
const WHO = roster.map((r, i) => ({ body: r.id, cls: r.cls, sex: r.sex, kit: kit.heroes[r.id] || kit.heroes[Object.keys(kit.heroes)[i]], level: 10 + (i % 30) }));

test('the looks are the player\'s skin sets, each part five colours', () => {
  assert.ok(looks.sets.length >= 100);
  for (const s of looks.sets) for (const part of ['head', 'shoulders', 'chest', 'legs', 'feet']) {
    assert.equal(s.ramps[part]?.length, 5, `${s.id} ${part}`);
    for (const c of s.ramps[part]) assert.ok(c.length === 3 && c.every((v) => Number.isInteger(v) && v >= 0 && v <= 255));
  }
});

test('whatever is rolled for someone fits them, and has a name, a size, a worth, words, a picture and a ground model', () => {
  const rng = makeRng(5);
  for (const who of WHO) {
    for (const slot of HG_SLOTS) {
      for (let rarity = 0; rarity < 6; rarity++) {
        const it = rollPartyGear(rng, { who, slot, ilvl: who.level, rarity });
        if (it.slot !== slot) { assert.ok(slot === 'weapon' || slot === 'off', `${who.body}: only a hand slot can be missing`); continue; }
        assert.ok(fits(it, who), `${who.body} ${slot}: fits`);
        assert.ok(it.name && !/undefined|null/.test(it.name), `${who.body} ${slot}: named (${it.name})`);
        const z = sizeOfHG(it);
        assert.ok(z.w >= 1 && z.h >= 2);
        assert.ok(hgWorth(it) > 0);
        assert.ok(hgLines(it, who).length >= 3);
        const g = groundModelOf(it);
        if (slot === 'weapon' || slot === 'off') {
          assert.ok(kit.props[it.prop], `${it.prop} is one of theirs`);
          assert.ok(it.pal === 'own' || PROP_PALS[it.pal], `${it.pal} is a palette`);
          assert.equal(g.sword, `kit/${it.prop}|${it.pal}`);
          assert.ok(exists(`assets/game/heroes/icons/${it.prop}.webp`), `${it.prop} has a picture`);
          if (slot === 'off') assert.ok(SHIELD_KINDS.has(it.kind), 'a shield in the off hand');
        } else {
          assert.ok(it.look && it.shape, `${who.body} ${slot}: a look and a shape`);
          assert.ok(shapeShows(it, who), `${who.body} ${slot}: its shape is one of their class and sex (${it.shape})`);
          assert.ok(exists(`assets/game/items/${g.plain}.glb`), `${g.plain} lies on the ground`);
          assert.ok(!g.plain.startsWith('t_'), "never as one of Tessariel's suits");
          assert.ok(exists(`assets/game/heroes/icons/${it.shape}_${slot}.webp`), `${it.shape}_${slot} has a picture`);
        }
      }
    }
  }
});

test('a weapon or shield is only for whoever uses that kind', () => {
  const rng = makeRng(9);
  const lancer = WHO.find((w) => w.cls === 'lancer'), archer = WHO.find((w) => w.cls === 'archer');
  const lance = rollPartyGear(rng, { who: lancer, slot: 'weapon', ilvl: 10, rarity: 2 });
  assert.equal(lance.kind, kindsOf(lancer.kit).weapon);
  assert.ok(!fits(lance, archer));
  const plate = rollPartyGear(rng, { who: lancer, slot: 'chest', ilvl: 10, rarity: 2 });
  assert.ok(!fits(plate, archer), 'plate isn\'t for an archer');
});

test('a boss\'s hoard always has some for the party, the last boss\'s more; none with no party', () => {
  const rng = makeRng(13), party = WHO.slice(0, 4);
  for (let i = 0; i < 50; i++) {
    assert.equal(partyDrops(rng, 21, party).length, 3);
    assert.equal(partyDrops(rng, 20, party).length, 2);
    for (const it of partyDrops(rng, 21, party)) assert.ok(it.rarity >= 2, 'the last boss\'s are rare or better');
  }
  assert.deepEqual(partyDrops(rng, 21, []), []);
  let n = 0;
  for (let i = 0; i < 2000; i++) n += partyDrops(rng, 1, party).length;
  assert.ok(n > 30 && n < 160, `the plain dead now and then (${n} in 2000)`);
});

test('the best is chosen by its stats, and what\'s on adds up', () => {
  const rng = makeRng(17), who = WHO[0];
  const low = rollPartyGear(rng, { who, slot: 'helm', ilvl: 5, rarity: 0 }), high = rollPartyGear(rng, { who, slot: 'helm', ilvl: 40, rarity: 4 });
  assert.ok(score(high) > score(low));
  assert.equal(bestOf([low, high], who, {}).helm, high);
  assert.equal(bestOf([low], who, { helm: high }).helm, undefined);
  const sums = gearStats({ helm: high, chest: rollPartyGear(rng, { who, slot: 'chest', ilvl: 40, rarity: 4 }) });
  assert.ok(Object.values(sums).some((v) => v > 0));
});

test('an old companion away twenty levels comes back with moderate gear of about their level', () => {
  const rng = makeRng(21), who = { ...WHO[3], level: 40 }, gear = {};
  const got = catchUp(rng, who, gear, 5);
  assert.ok(got.length >= 1);
  for (const it of Object.values(gear)) {
    assert.ok(it.rarity <= 2, 'common to rare');
    assert.ok(it.ilvl <= who.level && it.ilvl >= who.level - 5, `about their level (${it.ilvl})`);
    assert.ok(fits(it, who));
  }
});

test('every body has a picture of each of its armour pieces', () => {
  for (const r of roster) for (const slot of HG_ARMOUR) {
    if (!r.groups?.[slot]) continue;
    assert.ok(exists(`assets/game/heroes/icons/${r.id}_${slot}.webp`), `${r.id}_${slot}`);
  }
});

test("an outfit goes together: every piece in the coat's colour, the coat's own set its own, light and dark kept, richer as it's rarer", () => {
  const rng = makeRng(29), who = WHO.find((w) => w.cls === 'archer'), gear = {};
  for (const slot of HG_ARMOUR) gear[slot] = rollPartyGear(rng, { who, slot, ilvl: 20, rarity: 3 });
  const out = outfitRamps(gear), coatRamp = rampFor(lookOf(gear.chest.look), 'chest'), coat = hsvOf(coatRamp[2]);
  assert.deepEqual(out.chest, richer(coatRamp, 3));
  const d = (a, b) => { const x = Math.abs(a - b) % 1; return Math.min(x, 1 - x); };
  for (const slot of HG_ARMOUR) {
    const own = rampFor(lookOf(gear[slot].look), slot);
    assert.equal(out[slot].length, own.length);
    out[slot].forEach((c, i) => assert.ok(Math.abs(hsvOf(c)[2] - hsvOf(own[i])[2]) < 0.02, `${slot}: its light kept`));
    if (plainRamp(own) || plainRamp(coatRamp)) continue;
    assert.ok(d(hsvOf(out[slot][2])[0], coat[0]) <= 0.055, `${slot}: in the coat's colour`);
  }
  assert.deepEqual(outfitRamps({}), {});
  // (A grey goes with anything.)
  const grey = [[20, 20, 20], [60, 60, 60], [120, 120, 120], [180, 180, 180], [230, 230, 230]];
  const red = [[40, 0, 0], [90, 10, 10], [160, 30, 30], [200, 60, 60], [240, 120, 120]];
  assert.deepEqual(harmonize(grey, red), grey);
  // (A pale lilac is no grey: it's turned too.)
  const lilac = [[70, 60, 80], [130, 115, 150], [190, 175, 215], [215, 205, 235], [240, 235, 250]];
  assert.ok(!plainRamp(lilac));
  assert.ok(d(hsvOf(harmonize(lilac, red)[2])[0], hsvOf(red[2])[0]) < 0.06, 'lilac turned to the coat');
  // (The rarer, the richer.)
  assert.ok(hsvOf(richer(red, 0)[2])[1] < hsvOf(richer(red, 4)[2])[1]);
});

test("the dye keeps gold gold, a light texel of a dark set its colour, and a weapon's tan wrap out of green", () => {
  const navy = [[8, 12, 30], [20, 30, 70], [35, 50, 110], [70, 90, 150], [140, 160, 210]];
  const px = new Uint8ClampedArray([200, 160, 50, 255, 230, 225, 215, 255, 90, 80, 75, 255, 40, 38, 36, 255]);
  const was = px.slice();
  assert.ok(goldOf(200, 160, 50) > 0.8 && goldOf(130, 80, 50) < 0.2, 'gold, not a red-brown leather');
  rampMap(px, navy, [0.1, 0.9], () => 1);
  assert.ok(Math.abs(px[0] - was[0]) < 25 && Math.abs(px[2] - was[2]) < 25, 'the gold texel kept');
  assert.ok(px[6] > px[4] && px[6] > px[5], 'a near-white texel under navy is a pale navy');
  const [h] = hsvOf([px[4], px[5], px[6]]);
  assert.ok(h > 0.55 && h < 0.7, `and its hue navy's (${h.toFixed(2)})`);
  const tan = new Uint8ClampedArray([170, 150, 120, 255, 160, 140, 110, 255]);
  paintProp(tan, PROP_PALS.azure);
  for (let k = 0; k < tan.length; k += 4) { const [th, ts] = hsvOf([tan[k], tan[k + 1], tan[k + 2]]); assert.ok(ts < 0.1 || th < 0.2 || th > 0.45, `tan to azure is never green (${th.toFixed(2)})`); }
});

test('the sets they wear are counted, and a weapon or shield leans to their coat', () => {
  const rng = makeRng(37), who = { ...WHO.find((w) => w.cls === 'paladin'), gear: {} };
  const a = rollPartyGear(rng, { who, slot: 'chest', ilvl: 20, rarity: 3 });
  who.gear.chest = a;
  who.gear.legs = { ...rollPartyGear(rng, { who, slot: 'legs', ilvl: 20, rarity: 3 }), look: a.look };
  who.gear.helm = { ...rollPartyGear(rng, { who, slot: 'helm', ilvl: 20, rarity: 3 }), look: a.look };
  const sets = setsWorn(who.gear);
  assert.equal(sets[0].n, 3);
  assert.equal(sets[0].set.id, a.look);
  const coat = rampFor(lookOf(a.look), 'chest');
  if (!plainRamp(coat)) {
    const h = hsvOf(coat[2])[0] * 360, near = (pal) => { const x = Math.abs(PROP_PALS[pal].hue - h) % 360; return Math.min(x, 360 - x); };
    let close = 0, n = 0;
    for (let i = 0; i < 300; i++) {
      const it = rollPartyGear(rng, { who, slot: 'off', ilvl: 20, rarity: 4 });
      if (it.slot !== 'off' || it.pal === 'own' || PROP_PALS[it.pal].hue == null) continue;
      n++; if (near(it.pal) <= 40) close++;
    }
    assert.ok(n > 30 && close / n > 0.5, `most painted shields go with the coat (${close} of ${n})`);
  }
});

test('no helm is a bare head, a hood is called one, and a dyed weapon has one colour in its name', () => {
  const rng = makeRng(31);
  for (const who of WHO) for (let i = 0; i < 20; i++) {
    const it = rollPartyGear(rng, { who, slot: 'helm', ilvl: 10, rarity: 2 });
    assert.ok(!bareHead(it.shape), `${who.body}: ${it.shape} has a helm`);
  }
  const rogue = WHO.find((w) => w.cls === 'rogue');
  let hood = 0;
  for (let i = 0; i < 40; i++) { const it = rollPartyGear(rng, { who: rogue, slot: 'helm', ilvl: 10, rarity: 2 }); if (/Hood/.test(it.name)) hood++; }
  assert.ok(hood > 0, "a rogue's hood is a hood");
  const COLOURS = /\b(Blue|Green|Red|Gold|Golden|White|Black|Azure|Crimson|Violet|Purple|Silver|Rose|Royal)\b/g;
  for (const who of WHO.slice(0, 20)) for (let i = 0; i < 10; i++) {
    const it = rollPartyGear(rng, { who, slot: 'weapon', ilvl: 10, rarity: 4 });
    if (it.slot !== 'weapon' || it.pal === 'own') continue;
    const words = it.name.split(' ').slice(1).join(' ');
    assert.ok(!(words.match(COLOURS) || []).some((w) => w !== it.name.split(' ').at(-1)), `${it.name}: one colour`);
  }
});
