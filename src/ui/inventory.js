// The pack and what's on the body. An item is lifted with a click and follows the pointer until it's set down, or dragged and let
// go: a drag that lets go where it can't go puts it back where it came from, and what it swaps out goes to the spot it left. A
// right-click, a double click or a double tap equips or stows. A gem set down on a staff goes in its next open socket, for good.
import { CHARM_SLOTS, charmIcon, charmTip } from './lands.js';
import { skinFilter } from '../items/skins.js';
import { art } from './skin.js';
import { GEMS, GEM_GRADES, colorOf, compareLines, linesOf, nameOf, statsOf, wornSlot } from '../items/items.js';
import { PACK_W, SLOTS, sizeOf } from '../items/pack.js';
import { BEACON, COOLDOWN, isBeacon } from '../items/beacon.js';
import { hgIcon } from './hgicons.js';

const $ = (id) => document.getElementById(id);
const SLOT_LABEL = { head: 'Head', neck: 'Neck', main: 'Staff', chest: 'Chest', off: 'Shield', shoulders: 'Shoulders', skull: 'Skull', ring1: 'Ring', legs: 'Legs', feet: 'Feet', ring2: 'Ring' };
const DOUBLE_MS = 450;
const DOUBLE_PX = 24;   // A quick second press elsewhere is setting it down: socketing can't be undone, so it mustn't be misread.

// Five cuts of stone, rougher to finer, with facets laid over the colour: the last two (only ever made, three into one) a round
// brilliant with a star of facets, and a great pointed stone in a halo with a four-pointed glint.
const GEM_SVG = [
  '<polygon points="12,2.5 19.5,6.5 21,15 14.5,21.5 6,19.5 2.8,10.5" fill="C"/><polygon points="12,2.5 14,10.5 6,19.5 2.8,10.5" fill="#fff" opacity=".22"/><polygon points="14,10.5 21,15 14.5,21.5 6,19.5" fill="#000" opacity=".25"/>',
  '<polygon points="12,2 20.5,7 20.5,17 12,22 3.5,17 3.5,7" fill="C"/><polygon points="12,6.5 16.5,9.2 16.5,14.8 12,17.5 7.5,14.8 7.5,9.2" fill="#fff" opacity=".28"/><polygon points="3.5,17 7.5,14.8 12,17.5 12,22" fill="#000" opacity=".28"/><polygon points="20.5,17 16.5,14.8 12,17.5 12,22" fill="#000" opacity=".16"/><polygon points="12,2 20.5,7 16.5,9.2 12,6.5" fill="#fff" opacity=".18"/>',
  '<polygon points="7,3 17,3 22,9 12,22 2,9" fill="C"/><polygon points="7,3 17,3 15,9 9,9" fill="#fff" opacity=".42"/><polygon points="2,9 9,9 12,22" fill="#fff" opacity=".12"/><polygon points="22,9 15,9 12,22" fill="#000" opacity=".28"/><polygon points="17,3 22,9 15,9" fill="#fff" opacity=".2"/><polygon points="7,3 2,9 9,9" fill="#000" opacity=".12"/>',
  '<circle cx="12" cy="12" r="11.4" fill="C" opacity=".2"/><polygon points="12,2.2 18.9,5.1 21.8,12 18.9,18.9 12,21.8 5.1,18.9 2.2,12 5.1,5.1" fill="C"/><polygon points="12,2.2 18.9,5.1 15.4,8.6 12,7.2" fill="#fff" opacity=".4"/><polygon points="12,2.2 5.1,5.1 8.6,8.6 12,7.2" fill="#fff" opacity=".24"/><polygon points="2.2,12 5.1,5.1 8.6,8.6 7.2,12" fill="#fff" opacity=".1"/><polygon points="21.8,12 18.9,18.9 15.4,15.4 16.8,12" fill="#000" opacity=".22"/><polygon points="12,21.8 18.9,18.9 15.4,15.4 12,16.8" fill="#000" opacity=".32"/><polygon points="12,21.8 5.1,18.9 8.6,15.4 12,16.8" fill="#000" opacity=".2"/><polygon points="12,7.2 15.4,8.6 16.8,12 15.4,15.4 12,16.8 8.6,15.4 7.2,12 8.6,8.6" fill="#fff" opacity=".3"/><polygon points="12,8.4 13,11 15.6,12 13,13 12,15.6 11,13 8.4,12 11,11" fill="#fff" opacity=".7"/>',
  '<circle cx="12" cy="12" r="11.8" fill="C" opacity=".16"/><circle cx="12" cy="12" r="9.6" fill="C" opacity=".22"/><polygon points="12,1.6 18.2,6.2 20.6,12 12,22.6 3.400,12 5.800,6.2" fill="C"/><polygon points="12,1.6 18.2,6.2 15,9 9,9 5.800,6.2" fill="#fff" opacity=".46"/><polygon points="5.800,6.2 9,9 7.6,12 3.400,12" fill="#fff" opacity=".2"/><polygon points="18.2,6.2 20.6,12 16.4,12 15,9" fill="#fff" opacity=".12"/><polygon points="9,9 15,9 16.4,12 7.6,12" fill="#fff" opacity=".3"/><polygon points="3.400,12 7.6,12 12,22.6" fill="#fff" opacity=".1"/><polygon points="20.6,12 16.4,12 12,22.6" fill="#000" opacity=".3"/><polygon points="7.6,12 16.4,12 12,22.6" fill="#000" opacity=".12"/><polygon points="16.6,2 17.4,5.2 20.6,6 17.4,6.800 16.6,10 15.800,6.800 12.6,6 15.800,5.2" fill="#fff" opacity=".95"/><polygon points="6.5,14.6 6.900,16.1 8.4,16.5 6.900,16.9 6.5,18.4 6.1,16.9 4.6,16.5 6.1,16.1" fill="#fff" opacity=".7"/>',
];

const SOCKETED = new Set(['weapon', 'skull', 'shield']);

// The beacon stone: a worn river stone with a ring cut in it, the ring lit while it's ready and dark while it isn't, the dark
// going round as it comes back (no letters on it, and none of either side's marks).
const beaconSvg = (left) => {
  const k = left > 0 ? Math.min(1, left / COOLDOWN) : 0, lit = k ? 0.18 : 1;
  const arc = k ? `<circle cx="12" cy="12.6" r="10.2" fill="none" stroke="#000" stroke-opacity=".45" stroke-width="20" pathLength="100" stroke-dasharray="${(k * 100).toFixed(1)} 100" transform="rotate(-90 12 12.6)" clip-path="url(#bsClip)"/>` : '';
  return `<svg class="gem" viewBox="0 0 24 24"><defs><radialGradient id="bsG" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#9aa4ad"/><stop offset=".6" stop-color="#5e6870"/><stop offset="1" stop-color="#2f363c"/></radialGradient><clipPath id="bsClip"><path d="M12 3.2c5.400 0 9 3.600 9 8.800 0 5.600-4.200 9-9 9s-9-3.400-9-9c0-5.200 3.600-8.800 9-8.800z"/></clipPath></defs>`
    + '<path d="M12 3.2c5.400 0 9 3.600 9 8.800 0 5.600-4.200 9-9 9s-9-3.400-9-9c0-5.200 3.600-8.800 9-8.800z" fill="url(#bsG)" stroke="#20262b" stroke-width=".8"/>'
    + `<g opacity="${lit}"><circle cx="12" cy="12.4" r="4.6" fill="none" stroke="#9fd6ff" stroke-width="1.5"/><circle cx="12" cy="12.4" r="1.5" fill="#d8f0ff"/><circle cx="12" cy="12.4" r="6.4" fill="none" stroke="#5cb4ff" stroke-width=".6" stroke-dasharray="1.6 1.4"/></g>`
    + `<circle cx="12" cy="12.4" r="4.6" fill="none" stroke="#1a2026" stroke-width="1.4" opacity="${1 - lit}"/>${arc}</svg>`;
};

const slotOf = wornSlot;
const hasOpenSocket = (it) => SOCKETED.has(it?.type) && (it.gems?.length || 0) < (it.sockets || 0);

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
    // The card for what's worn now, beside the tooltip of something that would go in its place.
    this.tip2El = $('invTip2') || Object.assign(document.createElement('div'), { id: 'invTip2' });
    if (!this.tip2El.isConnected) this.tipEl.after(this.tip2El);
    $('invSort').addEventListener('click', () => this.sort());
    // Combine gems: three of a kind and a cut into one of the next, all there are. (A button made here if the page has none.)
    this.combineBtn = $('invCombine') || Object.assign(document.createElement('button'), { id: 'invCombine', textContent: 'COMBINE GEMS' });
    if (!this.combineBtn.isConnected) $('invSort').before(this.combineBtn);
    this.combineBtn.addEventListener('click', () => this.combineGems());
    this.carryEl = $('invCarry');
    this.note = $('invNote');
    this.grid.style.setProperty('--pw', PACK_W);
    this.grid.style.setProperty('--ph', pack.rows);
    this.slotEls = {};
    for (const s of SLOTS) this.slotEls[s] = this.root.querySelector(`[data-slot="${s}"]`);
    this.help = touch
      ? 'Tap to lift and set down. Double tap to equip or stow. Tap outside to drop.'
      : 'Click or drag to move. Double-click or right-click to equip or stow. Set a gem on a staff, skull or shield to socket it. Click outside to drop.';
    $('invHelp').textContent = this.help;
    // On a phone the height goes to the cells: what's in your hands is said in the bar underneath, where the help is on a desk
    // (the help is shown there for a moment as the pack opens), and the charm pouch sits in the pack's heading (src/ui/hud.css).
    if (touch) $('invBar').insertBefore($('invStats'), $('invHelp'));
    this.root.addEventListener('pointerdown', (e) => this.onDown(e));
    window.addEventListener('pointermove', (e) => { if (this.open) this.onMove(e); });
    window.addEventListener('pointerup', (e) => { if (this.open) this.onUp(e); });
    window.addEventListener('pointercancel', () => { this.press = null; });
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());
    // A menu takes no part in the page's touch handling for play.
    for (const t of ['touchstart', 'touchmove', 'touchend']) this.root.addEventListener(t, (e) => e.stopPropagation(), { passive: true });
  }

  show() {
    if (!this.open) this.on.sound?.('open');
    this.open = true;
    this.root.style.display = 'flex';
    this.render();
    if (this.touch) this.flash(this.help, 6000);
  }

  hide() {
    this.putBack();
    if (this.open) this.on.sound?.('close');
    this.open = false;
    this.press = null;
    this.root.style.display = 'none';
    this.tipEl.style.display = 'none';
    this.tip2El.style.display = 'none';
    this.carryEl.style.display = 'none';
    this.hover.style.display = 'none';
    for (const s of SLOTS) this.slotEls[s].classList.remove('ok', 'bad');
  }

  // ---- drawing --------------------------------------------------------------------------------

  gemSvg(gem) {
    // (A painted one from the art kit, where there is one: src/ui/skin.js.)
    const painted = art('goods', `gem_${gem.kind}_${gem.grade}`);
    if (painted) return `<img class="gem" src="${painted}" alt="" draggable="false">`;
    return `<svg class="gem" viewBox="0 0 24 24">${GEM_SVG[gem.grade].replaceAll('"C"', `"${GEMS[gem.kind].color}"`)}</svg>`;
  }

  iconOf(item) {
    if (item.type === 'gem') return this.gemSvg(item);
    if (isBeacon(item)) return beaconSvg(BEACON.left());
    // (Gear for your party: src/ui/hgicons.js. Drawn again once its own colours are made.)
    if (item.type === 'hgear') {
      const h = hgIcon(item, this.base, (this.hgAgain ||= () => { if (this.open) this.render(); }));
      return this.hgWearable?.(item) === false ? h.replace('style="', 'style="opacity:.4;filter:grayscale(.85);') : h;
    }
    if (item.type === 'shield' || item.type === 'skull' || item.type === 'robe') {
      const { w, h } = sizeOf(item);
      const dots = (item.gems || []).map((g, i) => `<i style="position:absolute;right:${4 + i * 11}%;bottom:4%;width:12%;aspect-ratio:1;border-radius:50%;background:${GEMS[g.kind].color};box-shadow:0 0 5px ${GEMS[g.kind].color}"></i>`).join('');
      return `<div class="ico" style="position:relative;aspect-ratio:${w}/${h};background-image:url(${this.base}assets/game/items/icons/${item.base}.webp);${item.type === 'skull' ? `filter:${skinFilter(item)}` : ''}">${dots}</div>`;
    }
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
    // The rows there are (more as room's bought from Wes Harrow), and the cells of the last not bought yet, shut.
    const rows = this.pack.rows;
    if (this.rowsShown !== rows) { this.rowsShown = rows; this.grid.style.setProperty('--ph', rows); this.root.style.setProperty('--rows', rows); }
    let shut = this.grid.querySelector('.shut');
    const left = rows * PACK_W - this.pack.cells;
    if (left > 0) {
      if (!shut) { shut = document.createElement('div'); shut.className = 'shut'; shut.title = "Not your pack's yet: Wes Harrow the tanner lets packs out."; this.grid.appendChild(shut); }
      shut.style.cssText = `--x:${PACK_W - left};--y:${rows - 1};--w:${left};--h:1`;
    } else shut?.remove();
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
    $('invGold').textContent = `${this.pack.gold} gold${this.pack.copper ? ` ${this.pack.copper} copper` : ''}`;
    $('invStats').innerHTML = main
      ? `<b style="color:${colorOf(main)}">${nameOf(main)}</b><br>Fires for ${Math.round(st.min * 0.76)} to ${Math.round(st.max * 0.76)}${this.pack.slots.skull ? `, with ${nameOf(this.pack.slots.skull)} in the left hand${this.pack.slots.off ? '. The shield is only for riding: its stats do not count' : ''}` : this.pack.slots.off ? `, with ${nameOf(this.pack.slots.off)} on the arm` : ''}`
      : '<b>Bare hands</b><br>Nothing to swing.';
    // The charm pouch: every charm carried works (src/ui/lands.js).
    let row = $('charmRow');
    if (!row) { row = document.createElement('div'); row.id = 'charmRow'; if (this.touch) this.root.querySelector('.inv-head-btns').before(row); else $('invStats').after(row); }
    row.innerHTML = (this.pack.charms || []).map((k) => `<div class="ch" title="${charmTip(k).replace(/"/g, '&quot;')}"><img src="${charmIcon(k)}" alt=""></div>`).join('')
      + Array.from({ length: Math.max(0, CHARM_SLOTS - (this.pack.charms || []).length) }, () => '<div class="ch"></div>').join('');
    if (this.carry) {
      const { w, h } = sizeOf(this.carry.item);
      this.carryEl.style.cssText += `;display:block;--w:${w};--h:${h}`;
      this.carryEl.innerHTML = this.iconOf(this.carry.item);
    } else this.carryEl.style.display = 'none';
    // The combine button: dim while there aren't three of anything (what's in the hand counted).
    const can = this.canCombine();
    this.combineBtn.disabled = !can;
    this.combineBtn.title = can ? 'Combine gems: every three of the same kind and cut become one of the next cut' : 'Combine gems: nothing to combine yet. Three of the same kind and cut make the next cut.';
  }

  // Whether anything would combine: three loose gems of a kind and a cut, what's in the hand counted (it's set back first).
  canCombine() {
    if (this.pack.combinable().length) return true;
    const g = this.carry?.item;
    return g?.type === 'gem' && g.grade < GEM_GRADES.length - 1 && this.pack.looseGems(g.kind, g.grade).length >= 2;
  }

  // The button: all that can be combined, and what that makes in its turn, till nothing's left that can be. Says what came of it.
  combineGems() {
    this.putBack();
    const made = [];
    for (let got = this.pack.combineAll(); got.length; got = this.pack.combineAll()) made.push(...got);
    if (made.length) this.pack.sort();   // (and what's left closes up, with no gaps where the three were)
    // (What's said is what there is to show for it: a gem made and then gone into a finer one isn't counted.)
    const kept = made.filter((g) => this.pack.entries.some((e) => e.item === g));
    if (!kept.length) { this.flash('Nothing to combine: it takes three gems of the same kind and cut.', 3000); return; }
    const count = new Map();
    for (const g of kept.sort((a, b) => b.grade - a.grade)) count.set(nameOf(g), (count.get(nameOf(g)) || 0) + 1);
    this.on.sound?.('socket');
    this.on.change();
    this.tipFor = null;
    this.render();
    this.flash(`Combined: ${[...count].map(([name, n]) => (n > 1 ? `${n} × ${name}` : name)).join(', ')}.`, 4000);
  }

  flash(text, ms = 2200) {
    this.note.textContent = text;
    clearTimeout(this.noteT);
    this.noteT = setTimeout(() => { this.note.textContent = ''; }, ms);
  }

  linesHtml(item, lines) {
    return lines.map((l) => `<div class="l-${l.kind}"${l.kind === 'title' ? ` style="color:${colorOf(item)}"` : l.color ? ` style="color:${l.color}"` : ''}>${l.text}</div>`).join('');
  }

  // The item's card, with what it would change against what's worn; and beside it, the card of what's worn there now.
  showTip(item, e) {
    if (!item) { this.tipEl.style.display = 'none'; this.tip2El.style.display = 'none'; return; }
    const slots = this.pack?.slots;
    const worn = compareLines(item, slots).length ? slots[slotOf(item)] : null;
    if (this.tipFor !== item || this.tipEl.style.display === 'none') {
      this.tipFor = item;
      this.tipEl.innerHTML = this.linesHtml(item, [...linesOf(item, slots), ...compareLines(item, slots)]);
      this.tipEl.style.display = 'block';
      if (worn) {
        this.tip2El.innerHTML = `<div class="l-worn">Equipped</div>${this.linesHtml(worn, linesOf(worn, slots))}`;
        this.tip2El.style.display = 'block';
      } else this.tip2El.style.display = 'none';
    }
    const r = this.tipEl.getBoundingClientRect(), r2 = worn ? this.tip2El.getBoundingClientRect() : { width: 0, height: 0 };
    let x, y;
    if (this.touch) { x = 8; y = 8; } else {
      x = Math.max(8, Math.min(innerWidth - r.width - 8, e.clientX + 18));
      y = Math.max(8, Math.min(innerHeight - r.height - 8, e.clientY + 14));
    }
    this.tipEl.style.left = `${x}px`;
    this.tipEl.style.top = `${y}px`;
    if (!worn) return;
    // To the right if there's room, else to the left; on a narrow screen, under it.
    let x2 = x + r.width + 8, y2 = y;
    if (x2 + r2.width > innerWidth - 8) x2 = x - r2.width - 8;
    if (x2 < 8) { x2 = x; y2 = y + r.height + 8; }
    this.tip2El.style.left = `${x2}px`;
    this.tip2El.style.top = `${Math.max(8, Math.min(innerHeight - r2.height - 8, y2))}px`;
  }

  sort() {
    this.putBack();
    this.flash(this.pack.sort() ? 'Sorted.' : 'It won\'t all fit any tidier.');
    this.on.sound?.('equip');
    this.tipFor = null;
    this.render();
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
    return { x: Math.max(0, Math.min(PACK_W - w, Math.round(t.px - w / 2))), y: Math.max(0, Math.min(this.pack.rows - h, Math.round(t.py - h / 2))) };
  }

  // ---- hands on -------------------------------------------------------------------------------

  onDown(e) {
    if (e.target.closest('#invClose, #invX, #invSort, #invCombine')) return;
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
    } else if (p.picked) this.dragDone(this.targetAt(e));
    else this.setDown(this.targetAt(e));
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
      const gemOnSword = this.carry.item.type === 'gem' && SOCKETED.has(t.item?.type) && (t.item.gems?.length || 0) < (t.item.sockets || 0);
      this.hover.style.cssText = `display:block;--x:${x};--y:${y};--w:${w};--h:${h}`;
      // (A gem over its like, kind and cut: they combine if that makes three with what's in the pack.)
      const like = this.likeGem(this.carry.item, t.item);
      this.hover.className = gemOnSword ? 'ok' : like ? (this.pack.looseGems(like.kind, like.grade).length >= 2 ? 'ok' : 'bad') : hit && hit.length <= 1 ? 'ok' : 'bad';
    } else this.hover.style.display = 'none';
    // The slot under a carried item lights up for whether it would take it.
    for (const s of SLOTS) {
      const on = !!this.carry && t.kind === 'slot' && t.name === s;
      const ok = on && (slotOf(this.carry.item) === s || (this.carry.item.type === 'gem' && hasOpenSocket(t.item)));
      this.slotEls[s].classList.toggle('ok', on && ok);
      this.slotEls[s].classList.toggle('bad', on && !ok);
    }
    this.showTip(t.item || (this.touch && this.carry ? this.carry.item : null), e);
  }

  // A gem and another of its kind and cut that there's a finer cut than: the gem, or null.
  likeGem(a, b) {
    return a?.type === 'gem' && b?.type === 'gem' && a !== b && a.kind === b.kind && a.grade === b.grade && a.grade < GEM_GRADES.length - 1 ? a : null;
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
    if (item.type === 'gem' && SOCKETED.has(t.item?.type)) {
      if (this.pack.socket(t.item, item)) {
        this.on.sound?.('socket');
        this.carry = null;
        this.on.change();
        this.render();
        this.flash(`${nameOf(item)} set in ${nameOf(t.item)}.`);
      } else this.flash(t.item.sockets ? 'Every socket on that is full.' : 'That has no sockets.');
      return;
    }
    // A gem on its like in the pack: with a third there, the three become one of the next cut, where the one it was set on lay.
    if (t.kind === 'pack' && t.entry && this.likeGem(item, t.item)) {
      const have = this.pack.looseGems(item.kind, item.grade).length + 1;
      const made = this.pack.combine(item.kind, item.grade, { held: item, at: t.entry });
      if (!made) { this.flash(`Three of a kind make the next cut: you have ${have}.`, 3000); return; }
      this.on.sound?.('socket');
      this.carry = null;
      this.on.change();
      this.tipFor = null;
      this.render();
      this.flash(`Three ${nameOf(item)} gems combined into a ${nameOf(made)}.`, 3200);
      return;
    }
    if (t.kind === 'pack') {
      const { x, y } = this.originFor(item, t);
      const lifted = this.pack.place(item, x, y);
      if (lifted === false) { this.flash('It won\'t go there.'); return; }
      this.carry = lifted ? { item: lifted, from: null } : null;
    } else if (t.kind === 'slot') {
      if (slotOf(item) !== t.name) { this.flash(t.name === 'main' ? 'Only a staff goes in the right hand.' : t.name === 'off' ? 'Only a shield goes on the arm.' : t.name === 'skull' ? 'Only a skull goes in the left hand.' : 'That doesn\'t go there.'); return; }
      const prev = this.pack.slots[t.name];
      this.pack.slots[t.name] = item;
      this.carry = prev ? { item: prev, from: null } : null;
      this.on.sound?.(item.type === 'weapon' ? 'equipStaff' : 'equip');
      this.on.change();
    } else if (t.kind === 'ground') {
      // (The beacon stone stays with you.)
      if (isBeacon(item)) { this.flash('The beacon stone stays with you.'); return; }
      this.carry = null;
      this.on.drop(item);
    } else return;
    this.render();
  }

  // A drag let go. Whatever it couldn't set down goes back where it came from, and whatever it lifted in a swap goes to the spot
  // the dragged item left, so nothing is left in hand. Only with no room anywhere does it stay in hand.
  dragDone(t) {
    const { from } = this.carry;
    this.setDown(t);
    if (!this.carry) return;
    const { item } = this.carry;
    this.carry = null;
    if (!this.stow(item, from)) { this.carry = { item, from: null }; this.flash('No room in the pack. Set it down somewhere.'); }
    this.render();
  }

  // Into where it came from if that's free and it fits there, else the first room in the pack. False if neither.
  stow(item, from) {
    const { pack } = this;
    if (from?.slot && !pack.slots[from.slot] && slotOf(item) === from.slot) { pack.slots[from.slot] = item; this.on.change(); return true; }
    if (from && from.x !== undefined && pack.under(item, from.x, from.y)?.length === 0) { pack.entries.push({ item, x: from.x, y: from.y }); return true; }
    return pack.add(item);
  }

  // Equip it, stow it, or socket it, by whichever applies. t: what targetAt gives.
  quick(t) {
    const { pack } = this;
    if (this.carry || !t.item) return;
    // The beacon stone: used, as H uses it (src/ui/beacon.js). It starts once the pack is shut.
    if (isBeacon(t.item)) { const said = this.on.useBeacon?.(); if (said) this.flash(said, 3000); return; }
    if (t.kind === 'slot') {
      if (pack.slots[t.name]) {
        if (!pack.add(pack.slots[t.name])) { this.flash('No room in the pack.'); return; }
        pack.slots[t.name] = null;
        this.on.change();
      }
    } else if (slotOf(t.item)) {
      // What was worn there takes the spot it leaves, or the first room; with none, nothing changes.
      const slot = slotOf(t.item), prev = pack.slots[slot], { x, y } = t.entry;
      pack.remove(t.entry);
      if (prev && !this.stow(prev, { x, y })) { pack.entries.push(t.entry); this.flash('No room in the pack for what you have on.'); return; }
      pack.slots[slot] = t.item;
      this.on.sound?.(t.item.type === 'weapon' ? 'equipStaff' : 'equip');
      this.on.change();
    } else if (t.item.type === 'gem') {
      // The staff first, then the skull, then the shield.
      const into = ['main', 'skull', 'off'].map((s) => pack.slots[s]).find((it) => it && hasOpenSocket(it));
      if (into && pack.socket(into, t.item)) {
        pack.remove(t.entry);
        this.on.sound?.('socket');
        this.on.change();
        this.flash(`${nameOf(t.item)} set in ${nameOf(into)}.`);
      } else this.flash(pack.slots.main || pack.slots.skull || pack.slots.off ? 'Nothing in hand has an open socket.' : 'Nothing in hand to set it in.');
    }
    this.tipFor = null;
    this.render();
  }

  // Whatever is carried goes back where it came from, or into the first room, or else on the ground.
  putBack() {
    if (!this.carry) return;
    const { item, from } = this.carry;
    this.carry = null;
    // (Never the beacon stone on the ground: back where it was, whatever's there.)
    if (!this.stow(item, from)) { if (isBeacon(item)) this.pack.entries.push({ item, x: from?.x ?? 0, y: from?.y ?? 0 }); else this.on.drop(item); }
    this.render();
  }
}
