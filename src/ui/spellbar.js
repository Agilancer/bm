// The spell in hand and its neighbours along the bottom of the screen, the mana beside the life, and the book of all twenty.
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

export class SpellBar {
  // openBook and closeBook stop and start the game around the book, as the pack does.
  constructor(shared, input, { openBook, closeBook }) {
    this.shared = shared; this.input = input; this.closeBook = closeBook;
    this.i = 0;
    this.el = $('spells');
    this.manaEl = $('mana').firstElementChild;
    this.slots = [];
    for (let i = -2; i <= 2; i++) {
      const s = document.createElement('div');
      s.className = i === 0 ? 'spell now' : 'spell';
      s.dataset.off = i;
      // (Tap the one in the middle for the book, or either side to turn it.)
      const press = (e) => { e.preventDefault(); e.stopPropagation(); if (!input.enabled) return; if (i === 0) openBook(); else this.turn(i); };
      s.addEventListener('touchstart', press, { passive: false });
      s.addEventListener('mousedown', press);
      this.el.appendChild(s);
      this.slots.push(s);
    }
    this.nameEl = document.createElement('div');
    this.nameEl.id = 'spellName';
    this.el.appendChild(this.nameEl);
    this.draw();
    const book = $('spellGrid');
    book.innerHTML = SPELLS.map((d, i) => `<button class="card" data-i="${i}" style="--c:${COLOURS[d.elem]}"><span class="ic">${glyph(d)}</span><span class="tx"><b>${d.name}</b><i>${d.hands === 2 ? 'two hands' : 'one hand'} &middot; ${d.mana}${d.channel ? ` +${d.drain}/s` : ''} mana</i><span>${d.desc}</span></span><kbd>${i < 10 ? (i + 1) % 10 : ''}</kbd></button>`).join('');
    book.addEventListener('click', (e) => {
      const c = e.target.closest('.card');
      if (!c) return;
      this.pick(+c.dataset.i);
      closeBook();
    });
    $('spellClose').onclick = () => closeBook();
    window.addEventListener('wheel', (e) => {
      if (!input.enabled || input.menu || !document.pointerLockElement) return;
      this.turn(e.deltaY > 0 ? 1 : -1);
    }, { passive: true });
    window.addEventListener('keydown', (e) => {
      if (!input.enabled || input.menu || e.repeat) return;
      const m = /^Digit(\d)$/.exec(e.code);
      if (m) this.pick((+m[1] + 9) % 10);
    });
  }

  turn(by) { this.pick((this.i + by + SPELLS.length) % SPELLS.length); }

  pick(i) {
    if (i === this.i) return;
    this.i = i;
    this.shared.input[INPUT.SPELL] = i;
    this.draw();
  }

  draw() {
    this.slots.forEach((s, k) => {
      const d = SPELLS[(this.i + k - 2 + SPELLS.length) % SPELLS.length];
      s.innerHTML = glyph(d);
      s.style.setProperty('--c', COLOURS[d.elem]);
    });
    const d = SPELLS[this.i];
    this.nameEl.textContent = `${d.name} · ${d.mana}${d.channel ? ` +${d.drain}/s` : ''}`;
    const cards = document.querySelectorAll('#spellGrid .card');
    cards.forEach((c, k) => c.classList.toggle('on', k === this.i));
    this.drawnShort = null;
  }

  update(snap) {
    const m = snap[H.MANA];
    this.manaEl.style.transform = `scaleX(${Math.max(0, Math.min(1, m / (snap[H.MAX_MANA] || 1)))})`;
    const short = m < SPELLS[this.i].mana;
    if (short !== this.drawnShort) { this.drawnShort = short; this.slots[2].classList.toggle('short', short); }
    const up = snap[H.SPELL_RIG] > 0;
    if (up !== this.drawnUp) { this.drawnUp = up; this.slots[2].classList.toggle('up', up); }
  }
}
