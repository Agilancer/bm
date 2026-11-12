// The spells' pictures: a glyph each on a 24 box, and each element's colour on the page. (`s:` is drawn as lines, the rest filled.)
export const COLOURS = ['#ff9a3c', '#8fd4ff', '#d27bff', '#a79bff', '#a4ec7a', '#ffd98a', '#ff5563', '#d6eab6', '#a071ff', '#a7ee4a', '#7bebff', '#d8b184'];

// Glyphs on a 24 box. `s` is drawn as lines, the rest filled.
export const GLYPHS = {
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
  // ---- the forty the six trees added ----
  comet: 'M12 7a5 5 0 1 0 .01 0zM4 4l3.500 3-1 1zM20 4l-3.500 3 1 1zM4 20l3.500-3-1-1zM20 20l-3.500-3 1-1z',
  wyrm: 's:M3 17c3-7 6 4 9-2s5-8 8-4M17 8l4 3-4 2',
  firenova: 's:M12 5a7 7 0 1 0 .01 0M12 9c1 2 3 3 3 5a3 3 0 0 1-6 0c0-1 1-2 1.500-3 .5 1 1 1.500 1.500 1.500 0-1.500-.5-2.500 0-3.500z',
  bomb: 'M12 7a7 7 0 1 0 .01 0zM11 1h2v5h-2zM15 3l2 1-2 3-1-1z',
  phoenix: 'M12 5l2 5 8-5-5 9 3 2-6 1-2 5-2-5-6-1 3-2-5-9 8 5z',
  inferno: 'M12 1c1 5 7 7 7 12a7 7 0 0 1-14 0c0-4 3-5 4-9 1 3 2 4 3 4 0-3-1-4 0-7zM3 21h18v2H3z',
  coldcone: 's:M3 12l18-8M3 12l18 8M3 12h18M16 6v12',
  rime: 'M3 21L16 4l5-1-1 5L7 21zM13 2l1 3M22 11l-3-1',
  frostray: 's:M2 12h13M15 12l6-5M15 12l6 5M15 12h7M6 9v6M10 9v6',
  prism: 's:M9 5l7 14H2zM13 10l9-4M14.500 13.500h8M16 17l6 3',
  orb: 's:M12 7a5 5 0 1 0 .01 0M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2',
  shatter: 'M11 2l2 9-4-2zM22 6l-8 6v-4zM2 8l8 3-2 3zM14 13l7 7-8-3zM10 14l-2 8-3-6z',
  zero: 's:M12 2v20M3 7l18 10M21 7L3 17M9 3l3 3 3-3M9 21l3-3 3 3',
  stone: 'M5 9l5-5 7 2 3 6-3 7-8 1-5-5z',
  thorns: 's:M3 21L21 3M9 15l-5-1M9 15l1 5M14 10l-5-1M14 10l1 5M19 5l-4-1M19 5l1 4',
  boulder: 'M12 3l6 3 3 6-3 7-7 2-7-4-1-7 4-6zM2 21h4v2H2zM18 21h4v2h-4z',
  vine: 's:M12 22c0-6-5-6-5-11s5-4 5-9M12 22c0-6 5-7 5-11M7 11l-3-1M17 11l3-2M12 6l3-1',
  stoneskin: 'M12 2l8 3v7c0 5-4 8-8 10-4-2-8-5-8-10V5z',
  monolith: 'M8 21l1-17 4-2 3 3 1 16zM3 21h18v2H3z',
  quake: 's:M2 8h6l3 4-3 4 4 4M22 8h-5l-3 5 3 3-2 4M2 21h20',
  crescent: 'M15 2a10 10 0 1 0 7 15A8 8 0 0 1 15 2z',
  rune: 's:M12 3a9 9 0 1 0 .01 0M8 8l8 8M16 8l-8 8M12 6v12',
  stasis: 'M6 2h12v3l-5 7 5 7v3H6v-3l5-7-5-7z',
  starfall: 'M7 2l1.500 3.500L12 7 8.500 8.500 7 12 5.500 8.500 2 7l3.500-1.500zM17 9l1 2.500 2.500 1-2.500 1-1 2.500-1-2.500-2.500-1 2.500-1zM10 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z',
  disintegrate: 's:M2 12h9M13 12h2M17 12h1M20 12h2M6 8l5 4-5 4M15 7l1 2M18 16l1 2',
  spark: 'M14 2L6 13h5l-2 9 9-12h-5z',
  fork: 's:M3 12h6l5-7 4 2M9 12h12M9 12l5 7 4-2',
  seed: 'M12 8a4 4 0 1 0 .01 0zM11 1h2v4h-2zM11 19h2v4h-2zM1 11h4v2H1zM19 11h4v2h-4z',
  thunderclap: 's:M8 8a6 6 0 0 0 0 8M16 8a6 6 0 0 1 0 8M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14M12 9v6',
  stormstep: 's:M2 12h4M8 12h2M14 4l-3 8h5l-3 8M18 8l4 4-4 4',
  thunder: 'M6 10a4 4 0 0 1 1-8 5 5 0 0 1 10 1 4 4 0 0 1 0 7zM13 11l-5 7h4l-2 5 6-8h-4l2-4z',
  staticfield: 's:M12 4a8 8 0 1 0 .01 0M13 7l-3 5h4l-3 5',
  tempest: 'M5 9a4 4 0 0 1 1-7 5 5 0 0 1 10 0 4 4 0 0 1 2 7zM7 11l-2 5h2l-1 4 4-6H8l1-3zM13 11l-2 5h2l-1 5 4-7h-2l1-3zM19 11l-1 3h1.500l-1 3 3-4.500H20l.6-1.500z',
  fleet: 's:M4 8h9M2 12h12M6 16h8M15 6l6 6-6 6',
  turn: 's:M12 8a4 4 0 1 0 .01 0M12 1v4M12 19v4M1 12h4M19 12h4M4 4l3 3M17 17l3 3M20 4l-3 3M7 17l-3 3',
  aegis: 's:M12 2l8 3v7c0 5-4 8-8 10-4-2-8-5-8-10V5zM12 8v8M8 12h8',
  renew: 'M12 21C5 16 3 12 3 8a4.500 4.500 0 0 1 9-1 4.500 4.500 0 0 1 9 1c0 4-2 8-9 13z',
  empower: 'M12 2l7 8h-4v5H9v-5H5zM9 17h6v2H9zM9 21h6v1.500H9z',
  sanctuary: 's:M3 20a9 9 0 0 1 18 0zM12 11v6M9 14h6M1 20h22',
  stillness: 's:M12 3a9 9 0 1 0 .01 0M12 7v5l4 2',
};

// (data-sp: a painted picture from the art kit goes over the glyph, by its spell's key: src/ui/skin.js.)
export const glyph = (def) => svg(GLYPHS[def.key] || GLYPHS.wisp, def.key);
// The small marks in the book: a branch of a spell, a school's mastery.
export const MARKS = { branch: 'M12 3l9 9-9 9-9-9z', mastery: 'M12 2l3 6.500 7 .8-5 4.700 1.500 7-6.500-3.500L5.500 21 7 14 2 9.300l7-.8z' };
export const svg = (g, key = '') => {
  const line = g.startsWith('s:');
  const attrs = line ? 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"' : 'fill="currentColor"';
  return `<svg viewBox="0 0 24 24" aria-hidden="true"${key ? ` data-sp="${key}"` : ''}><path ${attrs} d="${line ? g.slice(2) : g}"/></svg>`;
};
