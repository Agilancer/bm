// What the player carries: a grid of cells, and the slots on the body. Items take a footprint of cells. It's a part of every save
// (main.js), and it stays with you through a new fight; only New Game starts it over.
import { WEAPONS } from '../core/layout.js';
import { settleSkull } from './skins.js';
import { GEMS, MAX_SOCKETS, ROBES, SKULLS, makeRng, robeSize, rollGem, rollRobe, rollShield, rollSkull, rollWeapon } from './items.js';

const ELEMENTAL_STAFFS = ['vine_staff', 'wind_staff', 'fire_staff', 'ice_staff', 'earth_staff', 'dark_staff', 'death_staff', 'life_staff'];

export const PACK_W = 12, PACK_H = 8;
export const SLOTS = ['head', 'neck', 'main', 'chest', 'off', 'shoulders', 'skull', 'ring1', 'legs', 'feet', 'ring2'];

// A bit of everything and a pouch of gems, to try it all out. The game proper starts with a common staff and shield and nothing else: leave this false.
const TEST_KIT = false;

export const sizeOf = (item) => (item.type === 'weapon' ? { w: 1, h: 4 } : item.type === 'shield' ? { w: 2, h: 3 } : item.type === 'robe' ? robeSize(item.base) : item.type === 'skull' ? { w: 2, h: 2 } : { w: 1, h: 1 });

const SOCKETED = new Set(['weapon', 'skull', 'shield']);
// From before Tessariel put away his swords and his plate: neither comes back out of a save.
const RETIRED = (it) => it.type === 'armor' || (it.type === 'weapon' && (WEAPONS.find((w) => w?.id === it.base)?.hands || 1) !== 3);

export class Pack {
  constructor() {
    this.slots = Object.fromEntries(SLOTS.map((s) => [s, null]));
    this.entries = [];   // { item, x, y }
    this.gold = 0;
    this.xp = 0; this.level = 1;
  }

  // The entries an item would land on, at (x, y). Null if it would stick out of the grid.
  under(item, x, y) {
    const { w, h } = sizeOf(item);
    if (x < 0 || y < 0 || x + w > PACK_W || y + h > PACK_H) return null;
    return this.entries.filter((e) => {
      const o = sizeOf(e.item);
      return x < e.x + o.w && e.x < x + w && y < e.y + o.h && e.y < y + h;
    });
  }

  at(x, y) {
    return this.entries.find((e) => { const o = sizeOf(e.item); return x >= e.x && x < e.x + o.w && y >= e.y && y < e.y + o.h; }) || null;
  }

  // Sets an item at (x, y), and hands back what that lifted. False if it can't go there: off the grid, or on more than one thing.
  place(item, x, y) {
    const hit = this.under(item, x, y);
    if (!hit || hit.length > 1) return false;
    let lifted = null;
    if (hit.length) { lifted = hit[0].item; this.remove(hit[0]); }
    this.entries.push({ item, x, y });
    return lifted;
  }

  // Into the first room there is, top left first. False if there's none.
  add(item) {
    for (let x = 0; x < PACK_W; x++) {
      for (let y = 0; y < PACK_H; y++) {
        const hit = this.under(item, x, y);
        if (hit && !hit.length) { this.entries.push({ item, x, y }); return true; }
      }
    }
    return false;
  }

  remove(entry) { this.entries.splice(this.entries.indexOf(entry), 1); }

  // A gem into a weapon, for good. False if it has no open socket.
  socket(weapon, gem) {
    if (!SOCKETED.has(weapon.type) || gem.type !== 'gem' || (weapon.gems ||= []).length >= Math.min(weapon.sockets || 0, weapon.type === 'skull' ? 6 : MAX_SOCKETS) || !GEMS[gem.kind]) return false;
    weapon.gems.push(gem);
    return true;
  }

  // What goes in a save. Items are plain data.
  save() { return structuredClone({ slots: this.slots, entries: this.entries, gold: this.gold, kite: true, elementals: true, xp: this.xp, level: this.level }); }

  // A saved pack back in hand, or with null, what a new game starts with.
  load(d) {
    this.slots = Object.fromEntries(SLOTS.map((s) => [s, null]));
    this.entries = [];
    this.gold = d?.gold || 0;
    this.xp = d?.xp || 0; this.level = d?.level || 1;
    if (!d) { this.startingKit(); return; }
    Object.assign(this.slots, d.slots);
    this.entries = d.entries;
    // A save from before the kite shields: everyone starts with one.
    if (!d.kite && !this.slots.off) this.slots.off = rollShield(makeRng(1793), { base: 'kite_cross' });
    // A save from before shields had stats: roll them, keeping the gems and sockets it already has.
    for (const it of [...Object.values(this.slots), ...this.entries.map((e) => e.item)]) {
      if (it?.type !== 'shield' || it.armor !== undefined) continue;
      const { armor, affixes, power } = rollShield(makeRng((Math.random() * 2 ** 32) >>> 0), { base: it.base });
      Object.assign(it, { armor, affixes, power });
    }
    // A save from before skulls had skins and patterns.
    for (const it of [...Object.values(this.slots), ...this.entries.map((e) => e.item)]) if (it?.type === 'skull') settleSkull(it);
    // A save from when the old greatsword was still about.
    delete this.slots.hands;
    for (const k of Object.keys(this.slots)) if (this.slots[k] && RETIRED(this.slots[k])) this.slots[k] = null;
    this.entries = this.entries.filter((e) => !RETIRED(e.item));
    if (!d.elementals) this.addElementals();
    if (!this.slots.main) {
      const staff = this.entries.find((e) => e.item.type === 'weapon');
      if (staff) { this.slots.main = staff.item; this.remove(staff); } else this.slots.main = rollWeapon(makeRng(1793), { base: 'skullhorn_staff', rarity: 0, sockets: 0 });
    }
  }

  // One common of each of the eight, for a new game and for a save from before them.
  addElementals() {
    const rng = makeRng(2207);
    for (const base of ELEMENTAL_STAFFS) this.add(rollWeapon(rng, { base, rarity: 0, sockets: 0 }));
  }

  startingKit() {
    const rng = makeRng(1793);
    this.slots.main = rollWeapon(rng, { base: 'skullhorn_staff', rarity: 0, sockets: 1 });
    this.slots.off = rollShield(rng, { base: 'kite_cross', sockets: 1 });
    this.addElementals();
    if (!TEST_KIT) return;
    for (const base of ['crystal_staff', 'greenwood_staff', 'gnarled_crook']) this.add(rollWeapon(rng, { base, rarity: 2, sockets: 3 }));
    for (const base of Object.keys(SKULLS).slice(0, 3)) this.add(rollSkull(rng, { base, rarity: 3, sockets: 3 }));
    for (const kind of Object.keys(GEMS)) this.add(rollGem(rng, { kind, grade: 2 }));
    for (const base of Object.keys(ROBES).slice(0, 4)) this.add(rollRobe(rng, { base, rarity: 2 }));
  }
}
