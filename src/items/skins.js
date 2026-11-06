// What a skull is made of, and how its gems are laid out on it. A skin recolours only the bone of the held skull: the hand stays a hand (src/gfx/renderer.js).
// a, b, c: the bone's darks, middles and lights. metal, rough. fx: 0 none, 1 slime, 2 cracks that glow, 3 nexus, 4 molten, 5 oil-slick, 6 gold in the cracks, 7 frost.
// glow: fx colour; power: how hard. eyes: a pair of colours in place of the usual two, from epic up. aura: 1 rising motes, 2 a turning crown of light.
const S = (name, a, b, c, metal, rough, fx = 0, glow = [0, 0, 0], power = 0, more = {}) => ({ name, a, b, c, metal, rough, fx, glow, power, ...more });

export const SKINS = {
  // Common: only ever bone, of one kind or another.
  bone: S('Yellowed', [0.1, 0.07, 0.04], [0.62, 0.5, 0.33], [0.95, 0.88, 0.7], 0, 0.75),
  ash: S('Ashen', [0.04, 0.04, 0.05], [0.3, 0.3, 0.32], [0.7, 0.7, 0.72], 0, 0.85),
  soot: S('Sooted', [0.01, 0.01, 0.01], [0.09, 0.08, 0.08], [0.32, 0.3, 0.28], 0, 0.7),
  sand: S('Sandworn', [0.14, 0.07, 0.03], [0.55, 0.36, 0.17], [0.88, 0.7, 0.42], 0, 0.9),
  grave: S('Grave', [0.03, 0.04, 0.02], [0.28, 0.27, 0.16], [0.6, 0.58, 0.38], 0, 0.9),
  // Uncommon: something has been at it.
  rust: S('Rusted', [0.05, 0.015, 0.005], [0.42, 0.14, 0.04], [0.8, 0.42, 0.16], 0.55, 0.7),
  moss: S('Mossgrown', [0.01, 0.03, 0.005], [0.12, 0.3, 0.06], [0.55, 0.65, 0.25], 0, 0.85),
  verdigris: S('Verdigris', [0.02, 0.07, 0.05], [0.1, 0.42, 0.32], [0.45, 0.8, 0.65], 0.5, 0.55),
  slime: S('Green Slime', [0.0, 0.05, 0.0], [0.08, 0.5, 0.05], [0.6, 1, 0.25], 0, 0.15, 1, [0.25, 1, 0.1], 0.6),
  blueslime: S('Blue Slime', [0.0, 0.02, 0.08], [0.03, 0.2, 0.7], [0.3, 0.75, 1], 0, 0.15, 1, [0.1, 0.5, 1], 0.6),
  // Rare: metals, and worse.
  iron: S('Iron', [0.02, 0.02, 0.025], [0.2, 0.2, 0.22], [0.5, 0.5, 0.54], 1, 0.42),
  silver: S('Silver', [0.12, 0.13, 0.15], [0.62, 0.64, 0.68], [0.97, 0.98, 1], 1, 0.2),
  gold: S('Golden', [0.2, 0.09, 0.01], [0.85, 0.55, 0.12], [1, 0.86, 0.45], 1, 0.22),
  copper: S('Copper', [0.12, 0.03, 0.01], [0.72, 0.3, 0.13], [1, 0.66, 0.45], 1, 0.3),
  obsidian: S('Obsidian', [0.0, 0.0, 0.005], [0.015, 0.012, 0.025], [0.1, 0.09, 0.15], 0.9, 0.08),
  blood: S('Bloodstone', [0.03, 0.0, 0.0], [0.28, 0.01, 0.01], [0.7, 0.07, 0.05], 0.3, 0.2),
  kintsugi: S('Mended', [0.03, 0.03, 0.04], [0.38, 0.38, 0.42], [0.86, 0.85, 0.82], 0, 0.5, 6, [1, 0.7, 0.2], 1),
  frost: S('Hoarfrost', [0.05, 0.14, 0.26], [0.36, 0.62, 0.86], [0.88, 0.97, 1], 0.2, 0.25, 7, [0.6, 0.9, 1], 0.8),
  // Epic: it glows, and it looks back at you with other eyes.
  hellfire: S('Hellfire', [0.01, 0.003, 0.002], [0.1, 0.03, 0.02], [0.38, 0.17, 0.1], 0.2, 0.55, 2, [1, 0.28, 0.03], 3.5, { eyes: [[1, 0.2, 0.02], [1, 0.45, 0.04]] }),
  voidcrack: S('Voidcracked', [0.005, 0.0, 0.015], [0.05, 0.02, 0.1], [0.24, 0.14, 0.38], 0.4, 0.35, 2, [0.6, 0.12, 1], 3.5, { eyes: [[0.7, 0.2, 1], [0.95, 0.4, 1]] }),
  toxic: S('Toxic', [0.0, 0.03, 0.0], [0.05, 0.4, 0.03], [0.5, 1, 0.1], 0, 0.1, 1, [0.4, 1, 0.05], 2.2, { eyes: [[0.5, 1, 0.1], [0.1, 1, 0.4]] }),
  oilslick: S('Oilslick', [0.0, 0.0, 0.01], [0.04, 0.04, 0.07], [0.2, 0.2, 0.28], 1, 0.14, 5, [1, 1, 1], 1, { eyes: [[1, 0.2, 0.7], [0.15, 0.9, 1]] }),
  spectral: S('Spectral', [0.0, 0.05, 0.08], [0.1, 0.45, 0.55], [0.7, 1, 1], 0, 0.3, 2, [0.3, 1, 1], 2.5, { eyes: [[0.3, 1, 1], [0.7, 1, 1]] }),
  // Legendary: it moves, and things rise off it.
  molten: S('Molten', [0.02, 0.005, 0.003], [0.08, 0.025, 0.015], [0.26, 0.1, 0.06], 0.2, 0.6, 4, [1, 0.35, 0.03], 5, { eyes: [[1, 0.75, 0.2], [1, 0.75, 0.2]], aura: 1 }),
  nexus: S('Nexus', [0.0, 0.0, 0.015], [0.015, 0.01, 0.06], [0.1, 0.08, 0.26], 0.6, 0.15, 3, [0.5, 0.25, 1], 3.5, { eyes: [[0.55, 0.3, 1], [0.3, 0.8, 1]], aura: 1 }),
  royal: S('Royal', [0.14, 0.05, 0.005], [0.8, 0.48, 0.08], [1, 0.84, 0.4], 1, 0.16, 2, [1, 0.8, 0.3], 4, { eyes: [[1, 0.9, 0.5], [1, 0.9, 0.5]], aura: 1 }),
  storm: S('Stormcaller', [0.01, 0.015, 0.04], [0.09, 0.14, 0.3], [0.45, 0.58, 0.85], 0.7, 0.25, 2, [0.4, 0.75, 1], 5, { eyes: [[0.7, 0.9, 1], [0.7, 0.9, 1]], aura: 1 }),
  // Mythical: there's nothing else like these.
  aurora: S('Aurora', [0.0, 0.0, 0.01], [0.01, 0.015, 0.05], [0.08, 0.1, 0.2], 0.7, 0.1, 3, [0.2, 1, 0.7], 5, { eyes: [[0.2, 1, 0.7], [1, 0.3, 0.9]], aura: 2, cycle: 1 }),
  sun: S('Sunborn', [0.3, 0.12, 0.01], [1, 0.62, 0.1], [1, 0.95, 0.6], 1, 0.12, 4, [1, 0.72, 0.15], 6, { eyes: [[1, 1, 0.8], [1, 1, 0.8]], aura: 2 }),
  prism: S('Prismatic', [0.01, 0.01, 0.02], [0.06, 0.06, 0.1], [0.3, 0.3, 0.4], 1, 0.06, 5, [1, 1, 1], 3, { eyes: [[1, 1, 1], [1, 1, 1]], aura: 2, cycle: 1 }),
};
const POOL = [
  ['bone', 'ash', 'soot', 'sand', 'grave'], ['rust', 'moss', 'verdigris', 'slime', 'blueslime'],
  ['iron', 'silver', 'gold', 'copper', 'obsidian', 'blood', 'kintsugi', 'frost'], ['hellfire', 'voidcrack', 'toxic', 'oilslick', 'spectral'],
  ['molten', 'nexus', 'royal', 'storm'], ['aurora', 'sun', 'prism'],
];
export const rollSkin = (rng, rarity) => { const p = POOL[rarity]; return p[Math.floor(rng() * p.length)]; };

// Ten for each number of gems from one to six: sixty. A bare name is on the midline; one in PAIRS comes in two, left and right; L or R on the end, that side only.
const PAIRS = new Set(['browI', 'browM', 'browO', 'foreI', 'foreO', 'hairI', 'temple', 'underI', 'underO', 'cheek']);
const LAYOUTS = [
  'crown', 'fore', 'high', 'glab', 'bridge', 'nose', 'browML', 'browMR', 'cheekL', 'templeR',
  'browM', 'browI', 'browO', 'foreI', 'foreO', 'hairI', 'temple', 'underI', 'underO', 'cheek',
  'glab browM', 'fore browO', 'high underO', 'crown temple', 'bridge cheek', 'nose underI', 'glab foreO', 'fore hairI', 'bridge browO', 'high cheek',
  'browI foreO', 'browM cheek', 'browO underI', 'foreI hairI', 'browM underO', 'temple underI', 'foreO cheek', 'hairI browO', 'browI temple', 'foreI underO',
  'glab browM foreO', 'fore browI temple', 'crown foreI browO', 'bridge browM cheek', 'nose underI underO', 'high browO underO', 'glab hairI cheek', 'fore browM underI', 'bridge foreO temple', 'crown browM underO',
  'browI browO foreO', 'browM foreI cheek', 'browM underI underO', 'foreI foreO hairI', 'crown glab browM temple', 'fore bridge browO cheek', 'high nose browI underO', 'browO temple underI', 'hairI browM cheek', 'crown bridge foreO underI',
];
export const PATTERNS = LAYOUTS.map((l) => l.split(' ').flatMap((n) => (PAIRS.has(n) ? [`${n}L`, `${n}R`] : [n])));
// Which of the sixty for a skull with this many sockets.
export const rollPattern = (rng, sockets) => (Math.max(1, Math.min(sockets, 6)) - 1) * 10 + Math.floor(rng() * 10);
// A skull from before all this: settled by its name, so it stays what it is.
export function settleSkull(item) {
  if (item.skin && item.pattern !== undefined) return item;
  let h = 7; for (const ch of item.base) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const p = POOL[Math.min(item.rarity, 5)];
  item.skin ||= p[h % p.length];
  item.sockets = Math.max(item.sockets || 0, 1);
  item.pattern ??= (Math.min(item.sockets, 6) - 1) * 10 + (h % 10);
  return item;
}

// The skin's colour on a skull's icon in the pack.
export function skinFilter(item) {
  const [r, g, b] = (SKINS[item.skin] || SKINS.bone).b, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  const h = d < 0.001 ? 35 : (mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
  return `sepia(1) saturate(${(1 + (d / Math.max(mx, 0.01)) * 3).toFixed(2)}) hue-rotate(${Math.round(h - 35)}deg) brightness(${(0.6 + mx * 0.6).toFixed(2)})`;
}
