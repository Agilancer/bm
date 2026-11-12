// Where everything on a phone's screen sits (index.html #touch, src/ui/hud.css). One table, so the page and the test that
// checks nothing overlaps (tests/touch-hud.test.mjs) read the same numbers.
//
// Everything is measured in units: a unit is a pixel on a phone 390 high, and shrinks or grows with the height of the screen
// (unitOf). The right thumb's buttons are placed from the middle of the biggest of them, the staff: so many units to its left
// (dx) and above it (dy). The staff is in the corner, what you press most is in a ring round it, and the six spells are in a
// wider ring round that, one to six from the bottom up.
export const UNIT_AT = 390;
/** A unit, in pixels, on a screen so high. */
export const unitOf = (h) => Math.min(1.3, Math.max(0.8, h / UNIT_AT));

// The staff's middle, from the right and the bottom edges (inside the safe area).
export const HOME = { right: 66, bottom: 62 };
const at = (r, deg, s) => { const a = (deg * Math.PI) / 180; return { dx: +(r * Math.cos(a)).toFixed(1), dy: +(r * Math.sin(a)).toFixed(1), s }; };
const INNER = 94, OUTER = 166;
// deg: 0 is straight left of the staff, 90 straight above it.
export const ARC = {
  bAttack: { dx: 0, dy: 0, s: 84 },
  bCast: { dx: 0, dy: 0, s: 84 },          // (the opening's own cast, in the cave: nothing else is there then)
  bDodge: at(INNER, 0, 56),
  bWide: at(INNER, 45, 56),
  bJump: at(INNER, 90, 56),
  bTake: { dx: 228, dy: 46, s: 58 },
};
export const SLOT_SIZE = 46;
export const SLOTS = [0, 18, 36, 54, 72, 90].map((deg) => at(OUTER, deg, SLOT_SIZE));

// The top of the screen: your life on the left, the corner map on the right, and the row of small buttons beside it.
export const TOP = { pad: 8, side: 10, medal: 44, bars: 150, mini: 92, dock: 38, gap: 5 };
// The left thumb: the run button, and where the stick's ring waits.
export const LEFT = { sprint: { left: 18, bottom: 152, s: 50 }, stick: { left: 34, bottom: 26, s: 112 } };

/** Each button's box on a screen w by h (CSS pixels, no safe area): { id, x, y, r } with x, y its middle (square: a square of
 * side 2r, not a round). For the test. */
export function boxes(w, h) {
  const u = unitOf(h), out = [];
  const cx = w - HOME.right * u, cy = h - HOME.bottom * u;
  for (const [id, p] of Object.entries(ARC)) out.push({ id, x: cx - p.dx * u, y: cy - p.dy * u, r: (p.s / 2) * u });
  SLOTS.forEach((p, k) => out.push({ id: `slot${k + 1}`, x: cx - p.dx * u, y: cy - p.dy * u, r: (p.s / 2) * u }));
  const s = LEFT.sprint;
  out.push({ id: 'bSprint', x: (s.left + s.s / 2) * u, y: h - (s.bottom + s.s / 2) * u, r: (s.s / 2) * u });
  const m = TOP;
  out.push({ id: 'mapMini', x: w - (m.side + m.mini / 2) * u, y: (m.pad + m.mini / 2) * u, r: (m.mini / 2) * u, square: true });     // (the corner map is a square: r is half its side)
  // The dock, right to left from the map: Auto, then the menu, the pack, the book, the journal, the view.
  ['autoBtn', 'bPause', 'bPack', 'bBook', 'bJournal', 'bView'].forEach((id, k) => {
    out.push({ id, x: w - (m.side + m.mini + m.pad + m.dock / 2 + k * (m.dock + m.gap)) * u, y: (m.pad + m.dock / 2) * u, r: (m.dock / 2) * u });
  });
  return out;
}

/** The table as the stylesheet's own numbers: what src/ui/hud.css reads as var(--t-...). (It carries the same numbers as
 * fall-backs, so the page is right before this has run: tests/touch-hud.test.mjs holds the two together.) */
export const VARS = {
  'home-r': HOME.right, 'home-b': HOME.bottom,
  pad: TOP.pad, side: TOP.side, medal: TOP.medal, bars: TOP.bars, mini: TOP.mini, dock: TOP.dock, gap: TOP.gap,
  'stick-l': LEFT.stick.left, 'stick-b': LEFT.stick.bottom, 'stick-s': LEFT.stick.s,
  'sprint-l': LEFT.sprint.left, 'sprint-b': LEFT.sprint.bottom, 'sprint-s': LEFT.sprint.s,
};

/** Hands the page the table, and each button its place (--dx, --dy, --s). */
export function place(doc = document) {
  for (const [k, v] of Object.entries(VARS)) doc.documentElement.style.setProperty(`--t-${k}`, v);
  for (const [id, p] of Object.entries(ARC)) {
    const el = doc.getElementById(id);
    if (el) { el.style.setProperty('--dx', p.dx); el.style.setProperty('--dy', p.dy); el.style.setProperty('--s', p.s); }
  }
}
export function placeSlot(el, k) {
  const p = SLOTS[k];
  el.style.setProperty('--dx', p.dx); el.style.setProperty('--dy', p.dy); el.style.setProperty('--s', p.s);
}
