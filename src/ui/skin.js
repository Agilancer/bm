// The painted pieces of the interface, from the art kit (tools/ui/: the kit that goes to ChatGPT, and import_kit.py that
// brings what comes back into assets/ui/kit/). The game draws every piece itself (src/ui/icons.js, src/ui/spellglyphs.js,
// src/ui/hud.css); a painted one takes its drawn one's place when the importer has listed it in assets/ui/kit/manifest.json:
//
//   { "version": 1, "pieces": { "btn_round": "btn_round.webp", ... },        frames, bars and rings: html.art-<piece> and
//                                                                            --art-<piece>, which src/ui/hud.css reads
//     "icons": { "jump": "icons/jump.webp", ... },                           over anything marked data-ic="jump"
//     "spells": { "firebolt": "spells/firebolt.webp", ... },                 over a spell's glyph (data-sp)
//     "goods": { "bed": "goods/bed.webp", ... } }                            asked for by name: art('goods', 'bed')
//
// No manifest (none has been imported yet) is the ordinary case, not an error: nothing changes.
const DIR = 'assets/ui/kit/';
const have = { pieces: {}, icons: {}, spells: {}, goods: {} };
let base = '';
const safe = (k) => /^[a-z0-9_]+$/.test(k);

/** The address of a painted picture, or null if that one hasn't been painted. */
export const art = (group, name) => (have[group]?.[name] ? `${base}${DIR}${have[group][name]}` : null);

/** What the manifest lists, as rules: one sheet in the page's head. */
export function rulesFor(manifest, at = DIR) {
  const out = [], vars = [];
  for (const [k, f] of Object.entries(manifest.pieces || {})) if (safe(k)) vars.push(`--art-${k}: url("${at}${f}")`);
  if (vars.length) out.push(`:root { ${vars.join('; ')}; }`);
  for (const [k, f] of Object.entries(manifest.icons || {})) {
    if (!safe(k)) continue;
    // What goes in an empty slot of the paper doll (index.html .slot[data-slot]; the two rings share one), in place of its word.
    if (k.startsWith('slot_')) {
      const sel = `.slot[data-slot^="${k.slice(5)}"]:not(.full)`;
      out.push(`${sel} { background: url("${at}${f}") center / 72% no-repeat; }`, `${sel} > span { visibility: hidden; }`);
      continue;
    }
    // A school's emblem on its tab in the spellbook (src/ui/skilltree.js .sch): only there once it's painted.
    if (k.startsWith('school_')) out.push(`.sch[data-ic="${k}"] { display: inline-block; }`);
    // (Over the button, not as its ground: the button's own base is its background.)
    out.push(`[data-ic="${k}"]::before { content: ""; position: absolute; inset: 0; pointer-events: none; background: url("${at}${f}") center / var(--ic-size, 62%) no-repeat; }`);
    out.push(`[data-ic="${k}"] > svg { visibility: hidden; }`);
  }
  for (const [k, f] of Object.entries(manifest.spells || {})) {
    if (!safe(k)) continue;
    out.push(`svg[data-sp="${k}"] { background: url("${at}${f}") center / contain no-repeat; }`);
    out.push(`svg[data-sp="${k}"] > * { visibility: hidden; }`);
  }
  return out.join('\n');
}

export async function loadSkin(b = '') {
  base = b;
  let m;
  try {
    const r = await fetch(`${b}${DIR}manifest.json`, { cache: 'no-cache' });
    if (!r.ok) return null;
    m = await r.json();
  } catch { return null; }
  if (!m || m.version !== 1) return null;
  for (const g of Object.keys(have)) have[g] = m[g] || {};
  const css = document.createElement('style');
  css.id = 'ui-skin';
  css.textContent = rulesFor(m, `${b}${DIR}`);
  document.head.appendChild(css);
  const root = document.documentElement.classList;
  for (const k of Object.keys(have.pieces)) if (safe(k)) root.add(`art-${k}`);
  if (Object.keys(have.spells).length) root.add('art-spells');
  if (Object.keys(have.icons).length) root.add('art-icons');
  document.dispatchEvent(new CustomEvent('ui-skin', { detail: m }));
  return m;
}
