// What the player carries: a grid of cells, and the slots on the body. Items take a footprint of cells. It's a part of every save
// (main.js), and it stays with you through a new fight; only New Game starts it over.
import { GEAR, GEAR_SLOTS, GEMS, MAX_SOCKETS, makeRng, rollArmor, rollGem, rollShield, rollWeapon } from './items.js';

export const PACK_W = 12, PACK_H = 8;
export const SLOTS = ['head', 'neck', 'main', 'chest', 'off', 'shoulders', 'hands', 'ring1', 'legs', 'feet', 'ring2'];

// One of every sword and a pouch of gems, to try it all out before there is much to fight for. The game proper starts with the
// wheel greatsword alone: set this false.
const TEST_KIT = true;

export const sizeOf = (item) => (item.type === 'weapon' ? { w: 1, h: 4 } : item.type === 'shield' ? { w: 2, h: 3 } : item.type === 'armor' ? GEAR_SLOTS[GEAR[item.base].slot].size : { w: 1, h: 1 });

export class Pack {
  constructor() {
    this.slots = Object.fromEntries(SLOTS.map((s) => [s, null]));
    this.entries = [];   // { item, x, y }
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
    if (weapon.type !== 'weapon' || gem.type !== 'gem' || weapon.gems.length >= Math.min(weapon.sockets, MAX_SOCKETS) || !GEMS[gem.kind]) return false;
    weapon.gems.push(gem);
    return true;
  }

  // What goes in a save. Items are plain data.
  save() { return structuredClone({ slots: this.slots, entries: this.entries, kite: true }); }

  // A saved pack back in hand, or with null, what a new game starts with.
  load(d) {
    this.slots = Object.fromEntries(SLOTS.map((s) => [s, null]));
    this.entries = [];
    if (!d) { this.startingKit(); return; }
    Object.assign(this.slots, d.slots);
    this.entries = d.entries;
    // A save from before the kite shields: everyone starts with one.
    if (!d.kite && !this.slots.off) this.slots.off = rollShield(makeRng(1793), { base: 'kite_cross' });
    // A save from when the old greatsword was still about.
    for (const item of [...Object.values(this.slots), ...this.entries.map((e) => e.item)]) if (item?.base === 'greatsword') item.base = 'wheel_greatsword';
  }

  startingKit() {
    const rng = makeRng(1793);
    this.add(rollWeapon(rng, { base: 'wheel_greatsword', rarity: 0, sockets: 0 }));
    this.slots.off = rollShield(rng, { base: 'kite_cross' });
    if (!TEST_KIT) return;
    const swords = [
      ['frost_sword', 3, 4], ['crimson_sword', 3, 3], ['gilded_sword', 2, 3], ['thornvine_sword', 2, 2],
      ['swept_rapier', 2, 1], ['brass_sabre', 1, 2], ['bronze_broadsword', 1, 1], ['ringed_sword', 0, 0],
      ['fluked_greatsword', 2, 2], ['bluegrip_greatsword', 1, 1], ['wheel_greatsword', 0, 1], ['greengrip_greatsword', 1, 0],
      ['crystal_staff', 1, 1], ['greenwood_staff', 1, 1], ['skullhorn_staff', 1, 1], ['gnarled_crook', 0, 0],
    ];
    for (const [base, rarity, sockets] of swords) this.add(rollWeapon(rng, { base, rarity, sockets }));
    for (const kind of Object.keys(GEMS)) this.add(rollGem(rng, { kind, grade: 1 }));
    // A set of gauntlets to try on, one of each suit: one worn, since the pack only has room for four.
    this.slots.hands = rollArmor(rng, { base: 'knight_hands', rarity: 2 });
    for (const suit of ['t_pale', 't_silver', 't_white', 't_purple']) this.add(rollArmor(rng, { base: `${suit}_hands`, rarity: 2 }));
  }
}
