// The pack and what's on the body. An item is lifted with a click and follows the pointer until it's set down, or dragged and let
// go; a right-click or a double tap equips or stows. A gem set down on a sword goes in its next open socket, for good.
import { GEAR, GEMS, colorOf, hands, linesOf, nameOf, statsOf } from '../items/items.js';
import { PACK_H, PACK_W, SLOTS, sizeOf } from '../items/pack.js';

const $ = (id) => document.getElementById(id);
const SLOT_LABEL = { head: 'Head', neck: 'Neck', main: 'Sword', chest: 'Chest', off: 'Off hand', shoulders: 'Shoulders', hands: 'Hands', ring1: 'Ring', legs: 'Legs', feet: 'Feet', ring2: 'Ring' };
const DOUBLE_MS = 320;
const DOUBLE_PX = 24;   // A quick second press elsewhere is setting it down: socketing can't be undone, so it mustn't be misread.

// Three cuts of stone, rougher to finer, with facets laid over the colour.
const GEM_SVG = [
  '<polygon points="12,2.5 19.5,6.5 21,15 14.5,21.5 6,19.5 2.8,10.5" fill="C"/><polygon points="12,2.5 14,10.5 6,19.5 2.8,10.5" fill="#fff" opacity=".22"/><polygon points="14,10.5 21,15 14.5,21.5 6,19.5" fill="#000" opacity=".25"/>',
  '<polygon points="12,2 20.5,7 20.5,17 12,22 3.5,17 3.5,7" fill="C"/><polygon points="12,6.5 16.5,9.2 16.5,14.8 12,17.5 7.5,14.8 7.5,9.2" fill="#fff" opacity=".28"/><polygon points="3.5,17 7.5,14.8 12,17.5 12,22" fill="#000" opacity=".28"/><polygon points="20.5,17 16.5,14.8 12,17.5 12,22" fill="#000" opacity=".16"/><polygon points="12,2 20.5,7 16.5,9.2 12,6.5" fill="#fff" opacity=".18"/>',
  '<polygon points="7,3 17,3 22,9 12,22 2,9" fill="C"/><polygon points="7,3 17,3 15,9 9,9" fill="#fff" opacity=".42"/><polygon points="2,9 9,9 12,22" fill="#fff" opacity=".12"/><polygon points="22,9 15,9 12,22" fill="#000" opacity=".28"/><polygon points="17,3 22,9 15,9" fill="#fff" opacity=".2"/><polygon points="7,3 2,9 9,9" fill="#000" opacity=".12"/>',
];

export class Inventory {
  // manifest: assets/game/items/swords.json. on: { change() the equipped sword may be different, drop(item) let go of on the ground }.
  constructor(pack, manifest, base, touch, on) {
    Object.assign(this, { pack, manifest, base, touch, on });
    this.open = false;
    this.carry = null;      // { item, from }, from being { slot } or { x, y } or null
    this.press = null;
    this.pickedAt = { t: 0, x: 0, y: 0 };
    this.root = $('inv');
    this.grid = $('packGrid');
    this.hover = $('packHover');
    this.tipEl = $('invTip');
    this.carryEl = $('invCarry');
    this.note = $('invNote');
    this.grid.style.setProperty('--pw', PACK_W);
    this.grid.style.setProperty('--ph', PACK_H);
    this.slotEls = {};
    for (const s of SLOTS) this.slotEls[s] = this.root.querySelector(`[data-slot="${s}"]`);
    $('invHelp').textContent = touch
      ? 'Tap to lift and set down. Double tap to equip or stow. Tap outside to drop.'
      : 'Click to lift and set down. Right-click to equip or stow. Set a gem on a sword to socket it. Click outside to drop.';
    this.root.addEventListener('pointerdown', (e) => this.onDown(e));
    window.addEventListener('pointermove', (e) => { if (this.open) this.onMove(e); });
    window.addEventListener('pointerup', (e) => { if (this.open) this.onUp(e); });
    window.addEventListener('pointercancel', () => { this.press = null; });
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());
    // A menu takes no part in the page's touch handling for play.
    for (const t of ['touchstart', 'touchmove', 'touchend']) this.root.addEventListener(t, (e) => e.stopPropagation(), { passive: true });
  }

  show() {
    this.open = true;
    this.root.style.display = 'flex';
    this.render();
  }

  hide() {
    this.putBack();
    this.open = false;
    this.press = null;
    this.root.style.display = 'none';
    this.tipEl.style.display = 'none';
    this.carryEl.style.display = 'none';
    this.hover.style.display = 'none';
  }

  // ---- drawing --------------------------------------------------------------------------------

  gemSvg(gem) {
    return `<svg class="gem" viewBox="0 0 24 24">${GEM_SVG[gem.grade].replace('C', GEMS[gem.kind].color)}</svg>`;
  }

  iconOf(item) {
    if (item.type === 'gem') return this.gemSvg(item);
    if (item.type === 'shield') return `<div class="ico" style="aspect-ratio:2/3;background-image:url(${this.base}assets/game/items/icons/${item.base}.webp)"></div>`;
    if (item.type === 'armor') return `<div class="ico" style="aspect-ratio:${sizeOf(item).w}/${sizeOf(item).h};background-image:url(${this.base}assets/game/items/icons/${item.base}.webp)"></div>`;
    const m = this.manifest.swords[item.base];
    const [y0, y1] = m.frame.y;
    let dots = '';
    for (let i = 0; i < item.sockets; i++) {
      const s = m.sockets[i], g = item.gems[i];
      const style = `left:${((0.5 + s.z / (2 * m.frame.z)) * 100).toFixed(1)}%;top:${(((y1 - s.y) / (y1 - y0)) * 100).toFixed(1)}%;${g ? `background:${GEMS[g.kind].color};box-shadow:0 0 5px ${GEMS[g.kind].color}` : ''}`;
      dots += `<i class="sock" style="${style}"></i>`;
    }
    return `<div class="ico" style="background-image:url(${this.base}${m.icon})">${dots}</div>`;
  }

  render() {
    for (const s of SLOTS) {
      const it = this.pack.slots[s], el = this.slotEls[s];
      el.classList.toggle('full', !!it);
      el.style.setProperty('--rc', it ? colorOf(it) : 'transparent');
      el.innerHTML = it ? this.iconOf(it) : `<span>${SLOT_LABEL[s]}</span>`;
    }
    this.grid.querySelectorAll('.it').forEach((n) => n.remove());
    for (const e of this.pack.entries) {
      const { w, h } = sizeOf(e.item);
      const n = document.createElement('div');
      n.className = 'it';
      n.style.cssText = `--x:${e.x};--y:${e.y};--w:${w};--h:${h};--rc:${colorOf(e.item)}`;
      n.innerHTML = this.iconOf(e.item);
      this.grid.appendChild(n);
    }
    const main = this.pack.slots.main;
    const st = main ? statsOf(main) : null;
    $('invStats').innerHTML = main
      ? `<b style="color:${colorOf(main)}">${nameOf(main)}</b><br>Damage ${st.min} to ${st.max}, ${hands(main.base) === 2 ? 'two hands' : 'one hand'}${hands(main.base) === 3 ? ', fires from its head' : ''}`
      : '<b>Bare hands</b><br>Nothing to swing.';
    if (this.carry) {
      const { w, h } = sizeOf(this.carry.item);
      this.carryEl.style.cssText += `;display:block;--w:${w};--h:${h}`;
      this.carryEl.innerHTML = this.iconOf(this.carry.item);
    } else this.carryEl.style.display = 'none';
  }

  flash(text) {
    this.note.textContent = text;
    clearTimeout(this.noteT);
    this.noteT = setTimeout(() => { this.note.textContent = ''; }, 2200);
  }

  showTip(item, e) {
    if (!item) { this.tipEl.style.display = 'none'; return; }
    if (this.tipFor !== item || this.tipEl.style.display === 'none') {
      this.tipFor = item;
      this.tipEl.innerHTML = linesOf(item).map((l) => `<div class="l-${l.kind}"${l.kind === 'title' ? ` style="color:${colorOf(item)}"` : l.color ? ` style="color:${l.color}"` : ''}>${l.text}</div>`).join('');
      this.tipEl.style.display = 'block';
    }
    if (this.touch) { this.tipEl.style.left = '8px'; this.tipEl.style.top = '8px'; return; }
    const r = this.tipEl.getBoundingClientRect();
    this.tipEl.style.left = `${Math.max(8, Math.min(innerWidth - r.width - 8, e.clientX + 18))}px`;
    this.tipEl.style.top = `${Math.max(8, Math.min(innerHeight - r.height - 8, e.clientY + 14))}px`;
  }

  // ---- what's under the pointer ---------------------------------------------------------------

  targetAt(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el || !el.closest('#inv')) return { kind: 'none' };
    const slot = el.closest('[data-slot]');
    if (slot) return { kind: 'slot', name: slot.dataset.slot, item: this.pack.slots[slot.dataset.slot] };
    if (el.closest('#packGrid')) {
      const r = this.grid.getBoundingClientRect(), cell = r.width / PACK_W;
      const px = (e.clientX - r.left) / cell, py = (e.clientY - r.top) / cell;
      const entry = this.pack.at(Math.floor(px), Math.floor(py));
      return { kind: 'pack', px, py, entry, item: entry?.item };
    }
    if (el.closest('.panel') || el.closest('#invBar')) return { kind: 'none' };
    return { kind: 'ground' };
  }

  // The cell a carried item would be set at, about the pointer.
  originFor(item, t) {
    const { w, h } = sizeOf(item);
    return { x: Math.max(0, Math.min(PACK_W - w, Math.round(t.px - w / 2))), y: Math.max(0, Math.min(PACK_H - h, Math.round(t.py - h / 2))) };
  }

  // ---- hands on -------------------------------------------------------------------------------

  onDown(e) {
    if (e.target.closest('#invClose')) return;
    if (e.button === 2) { this.quick(this.targetAt(e)); return; }
    if (e.button !== 0) return;
    const t = this.targetAt(e);
    this.press = { x: e.clientX, y: e.clientY, moved: false, picked: false, double: false };
    if (!this.carry && t.item) {
      this.press.double = false;
      this.lift(t);
      this.press.picked = true;
      this.pickedAt = { t: performance.now(), x: e.clientX, y: e.clientY };
    } else if (this.carry && performance.now() - this.pickedAt.t < DOUBLE_MS && Math.hypot(e.clientX - this.pickedAt.x, e.clientY - this.pickedAt.y) < DOUBLE_PX) this.press.double = true;
    this.moveCarry(e);
    this.updateHover(e, t);
  }

  onMove(e) {
    if (this.press && Math.hypot(e.clientX - this.press.x, e.clientY - this.press.y) > 6) this.press.moved = true;
    this.moveCarry(e);
    this.updateHover(e, this.targetAt(e));
  }

  onUp(e) {
    const p = this.press;
    this.press = null;
    if (!p || !this.carry) return;
    // A click that lifted leaves it in hand, to go where the next click says.
    if (p.picked && !p.moved) return;
    if (p.double && !p.moved) {
      const { item, from } = this.carry;
      this.putBack();
      this.quick({ item, entry: this.pack.entries.find((x) => x.item === item), kind: from && from.slot ? 'slot' : 'pack', name: from && from.slot });
    } else this.setDown(this.targetAt(e));
    this.moveCarry(e);
    this.updateHover(e, this.targetAt(e));
  }

  moveCarry(e) {
    if (!this.carry) return;
    this.carryEl.style.left = `${e.clientX}px`;
    this.carryEl.style.top = `${e.clientY}px`;
  }

  updateHover(e, t) {
    if (this.carry && t.kind === 'pack') {
      const { x, y } = this.originFor(this.carry.item, t);
      const { w, h } = sizeOf(this.carry.item);
      const hit = this.pack.under(this.carry.item, x, y);
      const gemOnSword = this.carry.item.type === 'gem' && t.item?.type === 'weapon' && t.item.gems.length < t.item.sockets;
      this.hover.style.cssText = `display:block;--x:${x};--y:${y};--w:${w};--h:${h}`;
      this.hover.className = gemOnSword ? 'ok' : hit && hit.length <= 1 ? 'ok' : 'bad';
    } else this.hover.style.display = 'none';
    this.showTip(t.item || (this.touch && this.carry ? this.carry.item : null), e);
  }

  lift(t) {
    if (t.kind === 'slot') {
      this.carry = { item: t.item, from: { slot: t.name } };
      this.pack.slots[t.name] = null;
      this.on.change();
    } else {
      this.carry = { item: t.item, from: { x: t.entry.x, y: t.entry.y } };
      this.pack.remove(t.entry);
    }
    this.render();
  }

  setDown(t) {
    const { item } = this.carry;
    // A gem on a sword goes in. Anywhere else it is a thing like any other.
    if (item.type === 'gem' && t.item?.type === 'weapon') {
      if (this.pack.socket(t.item, item)) {
        this.carry = null;
        this.on.change();
        this.render();
        this.flash(`${nameOf(item)} set in ${nameOf(t.item)}.`);
      } else this.flash(t.item.sockets ? 'Every socket on that sword is full.' : 'That sword has no sockets.');
      return;
    }
    if (t.kind === 'pack') {
      const { x, y } = this.originFor(item, t);
      const lifted = this.pack.place(item, x, y);
      if (lifted === false) { this.flash('It won\'t go there.'); return; }
      this.carry = lifted ? { item: lifted, from: null } : null;
    } else if (t.kind === 'slot') {
      const fits = (t.name === 'main' && item.type === 'weapon') || (t.name === 'off' && item.type === 'shield') || (item.type === 'armor' && GEAR[item.base].slot === t.name);
      if (!fits) { this.flash(t.name === 'main' ? 'Only a sword goes in the hand.' : t.name === 'off' ? 'Only a shield goes on the arm.' : 'That doesn\'t go there.'); return; }
      const prev = this.pack.slots[t.name];
      this.pack.slots[t.name] = item;
      this.carry = prev ? { item: prev, from: null } : null;
      this.on.change();
    } else if (t.kind === 'ground') {
      this.carry = null;
      this.on.drop(item);
    } else return;
    this.render();
  }

  // Equip it, stow it, or socket it, by whichever applies. t: what targetAt gives.
  quick(t) {
    const { pack } = this;
    if (this.carry || !t.item) return;
    if (t.kind === 'slot') {
      if (pack.slots[t.name]) {
        if (!pack.add(pack.slots[t.name])) { this.flash('No room in the pack.'); return; }
        pack.slots[t.name] = null;
        this.on.change();
      }
    } else if (t.item.type === 'weapon' || t.item.type === 'shield' || t.item.type === 'armor') {
      const slot = t.item.type === 'weapon' ? 'main' : t.item.type === 'shield' ? 'off' : GEAR[t.item.base].slot, prev = pack.slots[slot], { x, y } = t.entry;
      pack.remove(t.entry);
      pack.slots[slot] = t.item;
      if (prev && !pack.add(prev)) this.on.drop(prev);
      this.on.change();
    } else if (pack.slots.main && pack.socket(pack.slots.main, t.item)) {
      pack.remove(t.entry);
      this.on.change();
      this.flash(`${nameOf(t.item)} set in ${nameOf(pack.slots.main)}.`);
    } else {
      this.flash(pack.slots.main ? 'No open socket on the sword in hand.' : 'No sword in hand to set it in.');
    }
    this.tipFor = null;
    this.render();
  }

  // Whatever is carried goes back where it came from, or into the first room, or else on the ground.
  putBack() {
    if (!this.carry) return;
    const { item, from } = this.carry;
    this.carry = null;
    if (from && from.slot && !this.pack.slots[from.slot]) { this.pack.slots[from.slot] = item; this.on.change(); } else if (from && from.x !== undefined && this.pack.under(item, from.x, from.y)?.length === 0) this.pack.entries.push({ item, x: from.x, y: from.y });
    else if (!this.pack.add(item)) this.on.drop(item);
    this.render();
  }
}
