// Six numbered spell slots along the bottom of the screen, the mana beside the life, and the menu that fills them from all twenty.
import { H, INPUT } from '../core/layout.js';
import { SPELLS } from '../sim/spells.js';

const $ = (id) => document.getElementById(id);
const COLOURS = ['#ff9a3c', '#8fd4ff', '#d27bff', '#a79bff', '#a4ec7a', '#ffd98a', '#ff5563', '#d6eab6', '#a071ff', '#a7ee4a', '#7bebff', '#d8b184'];

// Glyphs on a 24 box. `s` is drawn as lines, the rest filled.
const GLYPHS = {
  firebolt: 'M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-4 3-7 1 2 2 3 3 3 0-3-1-5 0-8z',
  frost: 'M12 2l2 8-2 3-2-3zM4 8l7 5-1 3-4-2zM20 8l-7 5 1 3 4-2zM12 14l2 4-2 4-2-4z',
  lightning: 'M13 2l-5 10h4l-2 10 7-13h-4l2-7zM5 7a9 9 0 0 0-1 10l1.500-1a7 7 0 0 1 1-8zM19 7a9 9 0 0 1 1 10l-1.500-1a7 7 0 0 0-1-8z',
  mend: 'M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z',
  wisp: 'M12 2l2 7 7 3-7 3-2 7-2-7-7-3 7-3z',
  wallfire: 'M5 22c-3-3-1-6 0-8 1 1 2 2 2 3 1-1 1-3 1-5 2 3 3 7 1 10zM12 22c-3-3-1-7 0-10 1 1 2 2 2 4 1-2 1-5 0-8 3 4 4 10 1 14zM19 22c-3-3-1-6 0-8 1 1 2 2 2 3 1 2 1 4-1 5z',
  missiles: 'M2 5l8 2-4 4zM9 12l8 2-4 4zM15 3l7 2-3 3z',
  arcaneblast: 'M2 12l19-9-5 9 5 9z',
  firebeam: 'M2 12l6-3 14-2v10L8 15zM3 6l3 1-1 1zM3 18l3-1-1-1z',
  chain: 'M4 2l6 7-3 2 6 5-2 2 8 4-4-7 2-1-6-6 2-2z',
  nova: 's:M12 2v20M3 7l18 10M21 7L3 17M12 6l-2-2M12 6l2-2M12 18l-2 2M12 18l2 2',
  meteor: 'M11 10a6 6 0 1 0 .01 0zM8 10L20 2l-5 7 7-3-8 7z',
  blizzard: 's:M6 11a4 4 0 0 1 1-8 5 5 0 0 1 10 1 4 4 0 0 1 0 7zM7 14l-1 4M12 14l-1 7M17 14l-1 4',
  drain: 'M12 2c4 6 7 9 7 13a7 7 0 0 1-14 0c0-4 3-7 7-13z',
  blink: 's:M2 12h3M7 12h3M12 12h3M17 6l5 6-5 6',
  lance: 'M22 2l-6 2L2 19l3 3L20 8z',
  well: 's:M12 12a1 1 0 0 1 2 1 3 3 0 0 1-5 1 5 5 0 0 1 6-7 7 7 0 0 1 3 10 9 9 0 0 1-13 1',
  plague: 'M9 2h6v2l-1 1v5l6 9a2 2 0 0 1-2 3H6a2 2 0 0 1-2-3l6-9V5L9 4z',
  blades: 'M5 2l14 16-2 2L3 4zM19 2L5 18l2 2L21 4z',
  spikes: 'M2 22l4-13 3 13zM8 22l5-20 4 20zM16 22l3-11 3 11z',
};

const glyph = (def) => {
  const g = GLYPHS[def.key], line = g.startsWith('s:');
  const attrs = line ? 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"' : 'fill="currentColor"';
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path ${attrs} d="${line ? g.slice(2) : g}"/></svg>`;
};

const SLOTS = 6;

export class SpellBar {
  // openBook and closeBook stop and start the game around the equip menu, as the pack does.
  constructor(shared, input, { openBook, closeBook, tip }) {
    this.shared = shared; this.input = input; this.tip = tip;
    this.loadout = [-1, -1, -1, -1, -1, -1];   // what's in each slot: a spell, or -1
    this.known = new Set();              // the spells found so far
    this.now = 0;                        // the slot F and the middle button cast
    this.i = 0;                          // and the spell in it
    this.armed = -1;                     // in the menu: the spell picked up, waiting for a slot
    this.hover = -1;
    this.heldBy = null;                  // what's keeping a cast going: a key's code, or the pointer
    this.el = $('spells');
    // (The touch layer lies over the HUD, so on a touch screen the slots have to live on it.)
    if (input.touch) $('touch').appendChild(this.el);
    this.manaEl = $('mana').firstElementChild;
    this.slots = [];
    const lift = () => this.release('pointer');
    window.addEventListener('mouseup', lift);
    for (let k = 0; k < SLOTS; k++) {
      const s = document.createElement('div');
      s.className = 'spell';
      const press = (e) => { e.preventDefault(); e.stopPropagation(); this.press(k, 'pointer'); };
      s.addEventListener('touchstart', press, { passive: false });
      s.addEventListener('mousedown', press);
      s.addEventListener('touchend', lift);
      s.addEventListener('touchcancel', lift);
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

    // The equip menu: the six slots across the top and all twenty below. Pick one up and put it in a slot, or drag it there, or press 1 to 6 over it.
    this.loadEl = $('spellSlots');
    this.loadEl.innerHTML = this.slots.map((_, k) => `<button class="lslot" data-k="${k}"></button>`).join('');
    this.hintEl = $('spellHint');
    this.cards = $('spellGrid');
    this.cards.innerHTML = SPELLS.map((d, i) => `<button class="card" data-i="${i}" style="--c:${COLOURS[d.elem]}"><span class="ic">${glyph(d)}</span><span class="tx"><b>${d.name}</b><i>${d.hands === 2 ? 'two hands' : 'one hand'} &middot; ${d.mana}${d.channel ? ` +${d.drain}/s` : ''} mana</i><span>${d.desc}</span></span><kbd></kbd></button>`).join('');
    this.cards.addEventListener('click', (e) => {
      const c = e.target.closest('.card');
      if (!c || this.dragged) return;
      this.armed = this.armed === +c.dataset.i ? -1 : +c.dataset.i;
      this.drawMenu();
    });
    this.cards.addEventListener('mouseover', (e) => { const c = e.target.closest('.card'); this.hover = c ? +c.dataset.i : -1; });
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
      const s = document.elementFromPoint(x, y)?.closest('.spell, #spellOpen');
      if (!s) return;
      if (s.id === 'spellOpen') { if (input.enabled && !input.menu) openBook(); return; }
      this.press(this.slots.indexOf(s), 'pointer');
    };
    input.softMove = (x, y) => { this.cursor.style.transform = `translate(${x}px, ${y}px)`; };
    input.softShow = (on) => { this.cursor.style.display = on ? 'block' : 'none'; };
    this.draw();
    this.drawMenu();
  }

  // ---- the bar ----

  // The slot's button or key: its spell, cast at once, and for as long as it's held.
  press(k, by) {
    if (!this.input.enabled || this.input.menu) return;
    if (this.loadout[k] < 0) { this.tip?.('Nothing in that slot. B to fill it.'); return; }
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

  // bm.spell() reaches any of the twenty, slotted or not.
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
      s.innerHTML = `<b>${k + 1}</b>${d ? glyph(d) : ''}`;
      s.classList.toggle('now', k === this.now && !!d);
      s.classList.toggle('empty', !d);
      if (d) s.style.setProperty('--c', COLOURS[d.elem]);
    });
    const d = SPELLS[this.i];
    this.nameEl.textContent = this.loadout[this.now] >= 0 ? `${d.name} · ${d.mana}${d.channel ? ` +${d.drain}/s` : ''}` : '';
    this.drawnShort = [];
    this.drawnUp = -1;
  }

  update(snap) {
    const m = snap[H.MANA];
    this.manaEl.style.transform = `scaleX(${Math.max(0, Math.min(1, m / (snap[H.MAX_MANA] || 1)))})`;
    for (let k = 0; k < SLOTS; k++) {
      const d = SPELLS[this.loadout[k]], short = !!d && m < d.mana;
      if (short !== this.drawnShort[k]) { this.drawnShort[k] = short; this.slots[k].classList.toggle('short', short); }
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
    [...this.cards.children].forEach((c, i) => {
      const k = this.loadout.indexOf(i);
      c.querySelector('kbd').textContent = k >= 0 ? k + 1 : '';
      c.classList.toggle('on', i === this.armed);
      c.classList.toggle('slotted', k >= 0);
      c.style.display = this.known.has(i) ? '' : 'none';
    });
    this.hintEl.textContent = this.armed >= 0
      ? `${SPELLS[this.armed].name}: now choose its slot.`
      : (this.input.touch ? 'Tap a spell, then a slot. Tap a slot on its own to empty it.' : 'Click a spell, then a slot, or drag it there, or press 1 to 6 over it. Click a slot on its own to empty it.');
  }

  // A spell dragged with the mouse, from the list or from another slot. (On a touch screen a finger's drag scrolls the list.)
  bindDrag() {
    const ghost = $('spellGhost'), book = $('spellbook');
    let from = -1, sx = 0, sy = 0, going = false;
    book.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      const card = e.target.closest('.card'), slot = e.target.closest('.lslot');
      this.dragged = false;
      from = card ? +card.dataset.i : slot ? this.loadout[+slot.dataset.k] : -1;
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

  save() { return { loadout: this.loadout.slice(), now: this.now, known: [...this.known] }; }

  load(d) {
    const ok = Array.isArray(d?.loadout) && d.loadout.length === SLOTS && d.loadout.every((v) => Number.isInteger(v) && v >= -1 && v < SPELLS.length);
    this.loadout = ok ? d.loadout.slice() : [-1, -1, -1, -1, -1, -1];
    // (A save from before spells were found knows them all.)
    this.known = new Set(Array.isArray(d?.known) ? d.known : ok ? SPELLS.map((_, i) => i) : []);
    this.now = ok && this.loadout[d.now] >= 0 ? d.now : Math.max(0, this.loadout.findIndex((v) => v >= 0));
    this.setSpell(this.loadout[this.now] ?? -1);
    this.drawMenu();
  }

  // Read a scroll. Into the first empty slot, if there is one. False if you knew it already.
  learn(i) {
    if (this.known.has(i)) return false;
    this.known.add(i);
    const k = this.loadout.indexOf(-1);
    if (k >= 0) { this.loadout[k] = i; if (this.loadout[this.now] < 0) this.now = k; }
    this.setSpell(this.loadout[this.now] ?? -1);
    this.drawMenu();
    return true;
  }
}
