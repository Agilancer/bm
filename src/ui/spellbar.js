// Six numbered spell slots along the bottom of the screen, the mana beside the life, what's on you and what's cooling, and the
// book that fills the slots from the spells you've learned in the six trees (src/ui/skilltree.js draws the trees in it).
import { H, INPUT } from '../core/layout.js';
import { SPELLS } from '../sim/spells.js';
import { SCROLLS, STARTERS } from '../sim/skills.js';
import { BUFFS } from '../sim/treespells.js';
import { SkillBook } from '../items/skillbook.js';
import { COLOURS, glyph } from './spellglyphs.js';
import { SkillTree } from './skilltree.js';
import { placeSlot } from './thumbs.js';

const $ = (id) => document.getElementById(id);
// The spell that puts each of BUFFS on you, for its picture over the bar.
const BUFF_SPELL = { haste: 'fleet', stone: 'stoneskin', aegis: 'aegis', renew: 'renew', might: 'empower', inferno: 'inferno', static: 'staticfield', still: 'stillness', guard: 'nova' };

const SLOTS = 6;

export class SpellBar {
  // openBook and closeBook stop and start the game around the book, as the pack does. level: () => your level; gold: { have(),
  // pay(n) }, for unlearning; sound(name).
  constructor(shared, input, { openBook, closeBook, tip, level, gold, sound }) {
    this.shared = shared; this.input = input; this.tip = tip;
    // What you've learned (src/items/skillbook.js). A new game knows the first spell of each school, and has them on the bar.
    this.skills = new SkillBook(level);
    this.loadout = STARTERS.slice(0, SLOTS);   // what's in each slot: a spell, or -1
    this.now = 0;                        // the slot F and the middle button cast
    this.i = 0;                          // and the spell in it
    this.armed = -1;                     // in the menu: the spell picked up, waiting for a slot
    this.hover = -1;
    this.heldBy = null;                  // what's keeping a cast going: a key's code, or the pointer
    this.el = $('spells');
    // (The touch layer lies over the HUD, so on a touch screen the slots have to live on it.)
    if (input.touch) $('touch').appendChild(this.el);
    this.manaEl = $('mana').firstElementChild;
    this.buffEl = document.createElement('div');
    this.buffEl.id = 'buffs';
    this.el.appendChild(this.buffEl);
    this.buffShown = '';
    this.slots = [];
    const lift = () => this.release('pointer');
    window.addEventListener('mouseup', lift);
    for (let k = 0; k < SLOTS; k++) {
      const s = document.createElement('div');
      s.className = 'spell';
      const press = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // (Under a thumb the slot casts as a key does, kept up while it's held, and the thumb can go on to look about.)
        this.press(k, 'pointer');
        if (e.type === 'touchstart' && input.enabled && !input.menu) input.steerFrom?.(e.changedTouches[0]);
      };
      s.addEventListener('touchstart', press, { passive: false });
      s.addEventListener('mousedown', press);
      s.addEventListener('touchend', lift);
      s.addEventListener('touchcancel', lift);
      if (input.touch) placeSlot(s, k);     // (its place in the ring round the staff: src/ui/thumbs.js)
      s.classList.toggle('arc', !!input.touch);
      this.el.appendChild(s);
      this.slots.push(s);
    }
    const open = document.createElement('div');
    open.id = 'spellOpen';
    open.textContent = 'B';
    const opening = (e) => { e.preventDefault(); e.stopPropagation(); if (input.enabled && !input.menu) openBook(); };
    open.addEventListener('touchstart', opening, { passive: false });
    open.addEventListener('mousedown', opening);
    this.el.appendChild(open);
    this.nameEl = document.createElement('div');
    this.nameEl.id = 'spellName';
    this.el.appendChild(this.nameEl);

    // The book: the six slots across the top, and under them the six trees (src/ui/skilltree.js). Pick a spell you know and
    // put it in a slot, or drag it there, or press 1 to 6 over it.
    this.loadEl = $('spellSlots');
    this.loadEl.innerHTML = this.slots.map((_, k) => `<button class="lslot" data-k="${k}"></button>`).join('');
    this.hintEl = $('spellHint');
    this.tree = new SkillTree(this, { tip, gold, sound });
    this.skills.onChange = () => this.refresh();
    this.loadEl.addEventListener('click', (e) => {
      const b = e.target.closest('.lslot');
      if (!b || this.dragged) return;
      const k = +b.dataset.k;
      this.assign(k, this.armed >= 0 ? this.armed : -1);
      this.armed = -1;
      this.drawMenu();
    });
    this.bindDrag();
    $('spellClose').onclick = () => closeBook();
    window.addEventListener('wheel', (e) => {
      if (!input.enabled || input.menu || !document.pointerLockElement) return;
      this.turn(e.deltaY > 0 ? 1 : -1);
    }, { passive: true });
    window.addEventListener('keydown', (e) => {
      if (!input.enabled || e.repeat) return;
      const m = /^Digit([1-6])$/.exec(e.code);
      if (!m) return;
      if ($('spellbook').classList.contains('open')) {
        const sp = this.armed >= 0 ? this.armed : this.hover;
        if (sp >= 0) { this.assign(+m[1] - 1, sp); this.armed = -1; this.drawMenu(); }
      } else this.press(+m[1] - 1, e.code);
    });
    window.addEventListener('keyup', (e) => this.release(e.code));
    window.addEventListener('blur', () => this.release(this.heldBy));
    // With the pointer locked there's no cursor to reach a slot with: Alt gives you one, and takes the mouse off the view while it's held.
    this.cursor = $('softCursor');
    input.softPress = (x, y) => {
      const s = document.elementFromPoint(x, y)?.closest('.spell, #spellOpen, #viewBtn, #questOpen');
      if (!s) return;
      // (The eye beside the book: first person or third, src/ui/view.js. The quest log's J: src/main.js.)
      if (s.id === 'viewBtn' || s.id === 'questOpen') { s.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true })); return; }
      if (s.id === 'spellOpen') { if (input.enabled && !input.menu) openBook(); return; }
      this.press(this.slots.indexOf(s), 'pointer');
    };
    input.softMove = (x, y) => { this.cursor.style.transform = `translate(${x}px, ${y}px)`; };
    input.softShow = (on) => { this.cursor.style.display = on ? 'block' : 'none'; };
    this.draw();
    this.drawMenu();
  }

  // ---- the bar ----

  /** The spells you can cast, by their place in SPELLS (as a Set: the shops and auto-play read it). */
  get known() { return (this.knownNow ||= this.skills.knownSet()); }
  /** Spell i's numbers as you cast it. */
  def(i) { return this.skills.spells()[i]; }

  // Something's been learned, raised or unlearned: the sim hears of it (onSkills: src/main.js), a spell no longer known
  // comes off the bar, and everything's drawn again.
  refresh() {
    this.knownNow = null;
    this.loadout = this.loadout.map((i) => (i >= 0 && this.skills.known(i) ? i : -1));
    if (this.loadout[this.now] < 0) this.now = Math.max(0, this.loadout.findIndex((v) => v >= 0));
    this.onSkills?.(this.skills.ranks);
    this.setSpell(this.loadout[this.now] ?? -1);
    this.drawMenu();
  }

  // The slot's button or key: its spell, cast at once, and for as long as it's held.
  press(k, by) {
    if (!this.input.enabled || this.input.menu) return;
    if (this.loadout[k] < 0) { this.tip?.(this.input.touch ? 'Nothing in that slot. Your spellbook, in the top row, fills it.' : 'Nothing in that slot. B to fill it.'); return; }
    this.select(k);
    this.heldBy = by;
    this.input.castSlot = true;
    this.input.fire(INPUT.CAST_N);
  }

  release(by) {
    if (this.heldBy !== by) return;
    this.heldBy = null;
    this.input.castSlot = false;
  }

  select(k) {
    this.now = k;
    this.setSpell(this.loadout[k]);
  }

  // Round the slots that have something in them.
  turn(by) {
    for (let n = 1; n <= SLOTS; n++) {
      const k = (this.now + by * n + SLOTS * n) % SLOTS;
      if (this.loadout[k] >= 0) { this.select(k); return; }
    }
  }

  // bm.spell() reaches any spell, slotted or not.
  pick(i) {
    const k = this.loadout.indexOf(i);
    if (k >= 0) this.now = k;
    this.setSpell(i);
  }

  setSpell(i) {
    this.i = i;
    this.shared.input[INPUT.SPELL] = i;
    this.draw();
  }

  draw() {
    this.slots.forEach((s, k) => {
      const d = SPELLS[this.loadout[k]];
      s.innerHTML = `<b>${k + 1}</b>${d ? glyph(d) : ''}<i class="cd"></i>`;
      s.classList.toggle('now', k === this.now && !!d);
      s.classList.toggle('empty', !d);
      if (d) s.style.setProperty('--c', COLOURS[d.elem]);
    });
    const d = this.def(this.i);
    this.nameEl.textContent = d && this.loadout[this.now] >= 0 ? `${d.name} · ${d.mana}${d.channel ? ` +${Math.round(d.drain)}/s` : ''}` : '';
    this.drawnShort = [];
    this.drawnCool = [];
    this.drawnUp = -1;
    // (Points waiting to be spent show on the book's button.)
    const open = $('spellOpen'), pts = this.skills.points;
    for (const b of [open, $('bBook')]) if (b) { b.classList.toggle('pts', pts > 0); b.dataset.n = pts > 0 ? `+${pts}` : ''; }
  }

  update(snap) {
    const m = snap[H.MANA];
    this.manaEl.style.transform = `scaleX(${Math.max(0, Math.min(1, m / (snap[H.MAX_MANA] || 1)))})`;
    for (let k = 0; k < SLOTS; k++) {
      const i = this.loadout[k], d = i >= 0 ? this.def(i) : null, short = !!d && m < d.mana;
      if (short !== this.drawnShort[k]) { this.drawnShort[k] = short; this.slots[k].classList.toggle('short', short); }
      // How long till it's ready again, counted down over its picture.
      const cool = d ? Math.ceil(snap[H.COOL + i] - 0.05) : 0;
      if (cool !== this.drawnCool[k]) { this.drawnCool[k] = cool; this.slots[k].classList.toggle('cool', cool > 0); this.slots[k].lastElementChild.textContent = cool > 0 ? cool : ''; }
    }
    // What's on you, over the bar: its spell's picture and the seconds left of it.
    let on = '';
    for (let b = 0; b < BUFFS.length; b++) { const left = snap[H.BUFFS + b]; if (left > 0) on += `${b}:${Math.ceil(left)} `; }
    if (on !== this.buffShown) {
      this.buffShown = on;
      this.buffEl.innerHTML = on.trim().split(' ').filter(Boolean).map((p) => {
        const [b, left] = p.split(':'), d = SPELLS.find((q) => q.key === BUFF_SPELL[BUFFS[+b]]);
        return `<span style="--c:${COLOURS[d.elem]}" title="${d.name}">${glyph(d)}<i>${left}</i></span>`;
      }).join('');
    }
    const up = snap[H.SPELL_RIG] > 0 ? this.now : -1;
    if (up !== this.drawnUp) {
      this.drawnUp = up;
      this.slots.forEach((s, k) => s.classList.toggle('up', k === up));
    }
  }

  // ---- the equip menu ----

  // A spell goes in one slot only: if it's already in another, the two change places.
  assign(k, sp) {
    const other = sp >= 0 ? this.loadout.indexOf(sp) : -1;
    if (other >= 0 && other !== k) this.loadout[other] = this.loadout[k];
    this.loadout[k] = sp;
    if (this.loadout[this.now] < 0) {
      const filled = this.loadout.findIndex((v) => v >= 0);
      if (filled >= 0) this.now = filled;
    }
    if (this.loadout[this.now] >= 0) this.setSpell(this.loadout[this.now]); else this.draw();
    this.drawMenu();
  }

  drawMenu() {
    [...this.loadEl.children].forEach((b, k) => {
      const d = SPELLS[this.loadout[k]];
      b.innerHTML = `<b>${k + 1}</b>${d ? `<span class="ic">${glyph(d)}</span><span class="nm">${d.name}</span>` : '<span class="nm">empty</span>'}`;
      b.classList.toggle('empty', !d);
      if (d) b.style.setProperty('--c', COLOURS[d.elem]);
    });
    this.hintEl.textContent = this.armed >= 0
      ? `${SPELLS[this.armed].name}: now choose its slot.`
      : (this.input.touch ? 'Tap a spell you know, then a slot. Tap a slot on its own to empty it.' : 'Click a spell you know, then a slot, or drag it there, or press 1 to 6 over it. Click a slot on its own to empty it.');
    this.tree?.draw();
  }

  // A spell dragged with the mouse, from the list or from another slot. (On a touch screen a finger's drag scrolls the list.)
  bindDrag() {
    const ghost = $('spellGhost'), book = $('spellbook');
    let from = -1, sx = 0, sy = 0, going = false;
    book.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      const node = e.target.closest('.tnode.known[data-spell]'), slot = e.target.closest('.lslot');
      this.dragged = false;
      from = node ? +node.dataset.spell : slot ? this.loadout[+slot.dataset.k] : -1;
      sx = e.clientX; sy = e.clientY; going = false;
    });
    window.addEventListener('pointermove', (e) => {
      if (from < 0) return;
      if (!going && Math.hypot(e.clientX - sx, e.clientY - sy) > 7) {
        going = true;
        ghost.innerHTML = glyph(SPELLS[from]);
        ghost.style.setProperty('--c', COLOURS[SPELLS[from].elem]);
        ghost.style.display = 'block';
      }
      if (going) ghost.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    });
    window.addEventListener('pointerup', (e) => {
      if (going) {
        ghost.style.display = 'none';
        const slot = document.elementFromPoint(e.clientX, e.clientY)?.closest('.lslot');
        if (slot) this.assign(+slot.dataset.k, from);
        this.armed = -1;
        this.drawMenu();
        // (The click this release sends isn't a pick.)
        this.dragged = true;
        setTimeout(() => { this.dragged = false; });
      }
      from = -1; going = false;
    });
  }

  // ---- the save ----

  save() { return { loadout: this.loadout.slice(), now: this.now, skills: this.skills.save() }; }

  // (A save from before the trees has no `skills`: it starts with the six first spells, and every point its level has
  // earned waiting to be spent. What was on its bar and isn't known any more comes off it.)
  load(d) {
    const ok = Array.isArray(d?.loadout) && d.loadout.length === SLOTS && d.loadout.every((v) => Number.isInteger(v) && v >= -1 && v < SPELLS.length);
    this.loadout = ok ? d.loadout.slice() : STARTERS.slice(0, SLOTS);
    this.now = ok && Number.isInteger(d.now) && d.now >= 0 && d.now < SLOTS ? d.now : 0;
    this.skills.load(d?.skills ?? null);       // (refresh() comes of it: the bar's drawn and the sim's told)
    if (this.loadout.every((v) => v < 0)) { this.loadout = STARTERS.slice(0, SLOTS); this.now = 0; this.refresh(); }
  }

  // Read a scroll: the spell's first rank, for nothing, and into the first empty slot if there is one. False if you knew it
  // already, or aren't yet of a level to make sense of it (canRead).
  learn(i) {
    if (!this.skills.teach(i)) return false;
    const k = this.loadout.indexOf(-1);
    if (k >= 0) { this.loadout[k] = i; if (this.loadout[this.now] < 0) this.now = k; this.setSpell(this.loadout[this.now]); this.drawMenu(); }
    return true;
  }
  canRead(i) { return this.skills.canRead(i); }
  /** The spells no scroll is any use for now: known already, never written down, or past your level to read. For the shops. */
  noScroll() { const out = new Set(); SPELLS.forEach((_, i) => { if (!SCROLLS.includes(i) || this.skills.known(i) || !this.skills.canRead(i)) out.add(i); }); return out; }
}
