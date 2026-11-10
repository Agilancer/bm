// What the player carries: a grid of cells, and the slots on the body. Items take a footprint of cells. It's a part of every save
// (main.js), and it stays with you through a new fight; only New Game starts it over.
import { WEAPONS } from '../core/layout.js';
import { settleSkull } from './skins.js';
import { GEMS, MAX_SOCKETS, ROBES, SKULLS, makeRng, robeSize, rollGem, rollRobe, rollShield, rollSkull, rollStarterStaff, rollWeapon } from './items.js';

const freshRng = () => makeRng((Math.random() * 2 ** 32) >>> 0);

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
    this.gold = 0; this.copper = 0;
    this.mats = {};      // what's in the satchel, by kind (items.js MATS)
    this.xp = 0; this.level = 1;
    this.charms = [];    // the charm pouch: charm ids (src/ui/lands.js CHARMS)
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

  // Coin: gold, and the copper the town counts in. Ten copper to the gold; a purse breaks a gold piece when it has to.
  purse() { return this.gold * 10 + this.copper; }
  pay(copper) {
    if (this.purse() < copper) return false;
    let c = this.copper - copper;
    while (c < 0) { this.gold--; c += 10; }
    this.copper = c;
    return true;
  }
  earn(copper) { this.copper += copper; this.gold += Math.floor(this.copper / 10); this.copper %= 10; }
  has(kind, n) { return (this.mats[kind] || 0) >= n; }
  addMat(kind, n) { this.mats[kind] = (this.mats[kind] || 0) + n; }
  takeMat(kind, n) { if (!this.has(kind, n)) return false; this.mats[kind] -= n; return true; }

  // A gem into a weapon, for good. False if it has no open socket.
  socket(weapon, gem) {
    if (!SOCKETED.has(weapon.type) || gem.type !== 'gem' || (weapon.gems ||= []).length >= Math.min(weapon.sockets || 0, weapon.type === 'skull' ? 6 : MAX_SOCKETS) || !GEMS[gem.kind]) return false;
    weapon.gems.push(gem);
    return true;
  }

  // What goes in a save. Items are plain data.
  save() { return structuredClone({ slots: this.slots, entries: this.entries, gold: this.gold, copper: this.copper, mats: this.mats, kite: true, xp: this.xp, level: this.level, charms: this.charms }); }

  // A saved pack back in hand, or with null, what a new game starts with.
  load(d) {
    this.slots = Object.fromEntries(SLOTS.map((s) => [s, null]));
    this.entries = [];
    this.gold = d?.gold || 0; this.copper = d?.copper || 0;
    this.mats = { ...(d?.mats || {}) };
    this.xp = d?.xp || 0; this.level = d?.level || 1;
    this.charms = [...(d?.charms || [])];
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
    // (A save keeps what it has, the old test kit's eight staffs, Aurora skull and gems too if it had them; nothing is put in.)
    if (!this.slots.main) {
      const staff = this.entries.find((e) => e.item.type === 'weapon');
      if (staff) { this.slots.main = staff.item; this.remove(staff); } else this.slots.main = rollStarterStaff(freshRng());
    }
  }

  // A new game: a common staff, of a different kind most games, and a plain kite shield. No skull and no gems: the first
  // skull is the reward for Bram Kettle's errand (src/folk/quests.js bed_and_bell), and gems are found.
  startingKit() {
    const rng = freshRng();
    this.slots.main = rollStarterStaff(rng);
    this.slots.off = rollShield(rng, { base: 'kite_cross' });
    if (!TEST_KIT) return;
    for (const base of ['crystal_staff', 'greenwood_staff', 'gnarled_crook']) this.add(rollWeapon(rng, { base, rarity: 2, sockets: 3 }));
    for (const base of Object.keys(SKULLS).slice(0, 3)) this.add(rollSkull(rng, { base, rarity: 3, sockets: 3 }));
    for (const kind of Object.keys(GEMS)) this.add(rollGem(rng, { kind, grade: 2 }));
    for (const base of Object.keys(ROBES).slice(0, 4)) this.add(rollRobe(rng, { base, rarity: 2 }));
  }
}
