// Makes the interface's art kit: what goes to ChatGPT (or anyone) to paint the game's buttons, frames, bars and icons, and
// what the game needs to take them back.
//
//   node tools/ui/build_kit.mjs                 writes tools/ui/spec.json, renders a template for every sheet, and zips the
//                                               kit to art/ui/bellmourn_ui_kit.zip (and leaves it open in tools/build/)
//   node tools/ui/build_kit.mjs --mock DIR      also draws every sheet in plain lines into DIR, as stand-in art: for trying
//                                               the kit's check and the importer end to end without a painter
//   node tools/ui/build_kit.mjs --spec          only spec.json (no browser needed)
//
// The list of sheets is tools/ui/pieces.mjs. The words that go in the kit are tools/ui/kit/ (README.md, PROMPT.md, STYLE.md)
// and its scripts tools/ui/kit/scripts/. Templates are drawn in a headless browser (Playwright: npm install -g playwright),
// each with the game's own drawn icon faint in its cell, so the painter can see what every picture is of.
import { createRequire } from 'node:module';
import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PHONE, SHEETS, specText } from './pieces.mjs';
import { ICONS } from '../../src/ui/icons.js';
import { GLYPHS, MARKS } from '../../src/ui/spellglyphs.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const OUT = path.join(ROOT, 'tools', 'build', 'bellmourn_ui_kit');
const ZIP = path.join(ROOT, 'art', 'ui', 'bellmourn_ui_kit.zip');
const args = process.argv.slice(2);
const mockDir = args.includes('--mock') ? path.resolve(args[args.indexOf('--mock') + 1]) : null;

// ---- spec.json: the sheets, and where things sit on a phone (for the check's picture of one) -------------------------------
const SPEC = JSON.parse(specText());
fs.writeFileSync(path.join(HERE, 'spec.json'), specText());
console.log(`spec.json: ${SHEETS.length} sheets`);
if (args.includes('--spec')) process.exit(0);

// ---- drawing ---------------------------------------------------------------------------------------------------------------
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const glyphSvg = (g) => { const line = g.startsWith('s:'); return `<path ${line ? 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"' : 'fill="currentColor"'} d="${line ? g.slice(2) : g}"/>`; };
// The game's own drawing of a picture, if it has one: the faint sketch in a template's cell.
function sketch(name) {
  if (ICONS[name]) return ICONS[name];
  if (GLYPHS[name]) return glyphSvg(GLYPHS[name]);
  if (name === 'mark_branch') return glyphSvg(MARKS.branch);
  if (name === 'mark_mastery') return glyphSvg(MARKS.mastery);
  const round = (r, extra = '') => `<circle cx="12" cy="12" r="${r}" fill="none" stroke="currentColor" stroke-width="1"/>${extra}`;
  const SHAPES = {
    btn_round: round(10.5, round(8)), btn_round_on: round(10.5, round(8) + '<circle cx="12" cy="12" r="5" fill="currentColor" opacity=".3"/>'),
    btn_main: round(10.8, round(9.2) + round(7.4)), btn_main_on: round(10.8, round(9.2) + '<circle cx="12" cy="12" r="6" fill="currentColor" opacity=".3"/>'),
    slot_spell: round(10.5, round(9.3)), slot_spell_on: round(10.5, round(9.3) + '<circle cx="12" cy="12" r="9.300" fill="currentColor" opacity=".18"/>'),
    slot_item: '<rect x="1.500" y="1.500" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1"/><rect x="3.500" y="3.500" width="17" height="17" fill="none" stroke="currentColor" stroke-width=".6"/>',
    medallion: round(10.5, round(7.5)), frame_map: '<rect x="1" y="1" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1"/><rect x="2.800" y="2.800" width="18.400" height="18.400" fill="none" stroke="currentColor" stroke-width=".6"/>', stick_base: round(10.5, '<circle cx="12" cy="12" r="3" fill="currentColor" opacity=".25"/>'), stick_nub: round(8, '<circle cx="12" cy="12" r="8" fill="currentColor" opacity=".25"/>'),
  };
  if (SHAPES[name]) return SHAPES[name];
  if (name?.startsWith('gem_')) return name.endsWith('_0') ? '<path d="M12 3l7 4 1.500 8-6.500 6-8-2-3-9z" fill="currentColor" opacity=".7"/>' : name.endsWith('_1') ? '<path d="M12 2.500l8.500 5v9L12 21.500 3.500 16.500v-9z" fill="currentColor" opacity=".8"/><path d="M12 7l4.500 2.700v5.600L12 18l-4.500-2.700V9.700z" fill="#fff" opacity=".3"/>' : '<path d="M7 3h10l5 6-10 13L2 9z" fill="currentColor"/><path d="M7 3h10l-2 6H9z" fill="#fff" opacity=".45"/>';
  if (name?.startsWith('quest_')) return `<text x="12" y="20" text-anchor="middle" font-family="Georgia, serif" font-weight="900" font-size="22" fill="currentColor">${name === 'quest_offer' ? '!' : '?'}</text>`;
  if (name?.startsWith('role_')) return ICONS[{ role_tank: 'guard', role_heal: 'take', role_dps: 'staff' }[name]];
  if (name?.startsWith('slot_')) return ICONS[{ slot_main: 'staff', slot_off: 'guard' }[name]] || '<rect x="5" y="4" width="14" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="1.4"/>';
  if (name?.startsWith('school_')) return glyphSvg(GLYPHS[{ school_fire: 'firebolt', school_ice: 'frost', school_earth: 'stone', school_arcane: 'crescent', school_lightning: 'spark', school_utility: 'wisp' }[name]] || GLYPHS.wisp);
  return '<circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2 2"/>';
}
const svg = (inner, style = '') => `<svg viewBox="0 0 24 24" style="${style}">${inner}</svg>`;
const PAGE = (w, h, body, bg, css = '') => `<!doctype html><meta charset="utf-8"><style>
  html, body { margin: 0; width: ${w}px; height: ${h}px; background: ${bg}; overflow: hidden; font: 13px/1.25 Arial, Helvetica, sans-serif; color: #dfe9ee; }
  .c { position: absolute; box-sizing: border-box; } .g { border: 1px solid #39c5e8; } .lab { position: absolute; left: 6px; right: 6px; }
  .n { top: 5px; font-weight: 700; font-size: 15px; color: #39c5e8; } .nm { bottom: 5px; font-size: 12px; color: #9fb6bf; text-align: center; }
  .safe { position: absolute; border: 1px dashed #6f7f86; } svg { position: absolute; }
  ${css}</style><body>${body}</body>`;

// A template: the guides a sheet is painted to.
function template(s) {
  const [W, H] = s.size;
  let body = '';
  if (s.kind === 'grid') {
    const cw = W / s.cols, ch = H / s.rows, m = Math.min(cw, ch);
    s.cells.forEach((c, k) => {
      const x = (k % s.cols) * cw, y = Math.floor(k / s.cols) * ch;
      const inset = s.fill ? 0.04 : 0.1;
      const guide = `<div class="safe" style="left:${(cw - m * (1 - 2 * inset)) / 2}px;top:${(ch - m * (1 - 2 * inset)) / 2}px;width:${m * (1 - 2 * inset)}px;height:${m * (1 - 2 * inset)}px;${s.fill && c.name !== 'slot_item' && c.name !== 'frame_map' ? 'border-radius:50%' : 'border-radius:6%'}"></div>`;
      // (the map's frame: its band is 8% of its width on each side, which is what src/ui/hud.css draws the map in by)
      const inner = c.name === 'frame_map' ? `<div class="safe" style="left:${cw / 2 - m * 0.92 * 0.42}px;top:${ch / 2 - m * 0.92 * 0.42}px;width:${m * 0.92 * 0.84}px;height:${m * 0.92 * 0.84}px"></div>` : '';
      const sz = m * (s.fill ? 0.92 : 0.5);
      body += `<div class="c g" style="left:${x}px;top:${y}px;width:${cw}px;height:${ch}px">${c.name ? guide + inner + svg(sketch(c.name), `left:${(cw - sz) / 2}px;top:${(ch - sz) / 2}px;width:${sz}px;height:${sz}px;color:${c.colour || (c.name.startsWith('gem_') ? GEM_TINT[c.name.split('_')[1]] : '#ffffff')};opacity:.3`) : ''}
        <div class="lab n">${k + 1}</div><div class="lab nm">${c.name ? esc(c.name) : 'leave empty'}</div></div>`;
    });
  } else if (s.kind === 'boxes') {
    for (const b of s.boxes) {
      const [x, y, w, h] = b.rect;
      body += `<div class="c g" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"></div><div class="c" style="left:${x}px;top:${y - 20}px;color:#39c5e8;font-weight:700">${esc(b.name)}</div>`;
      if (!b.keep) body += `<div class="safe" style="left:${x + w * 0.2}px;top:${y}px;width:${w * 0.6}px;height:${h}px;border-width:0 1px"></div><div class="c" style="left:${x + w * 0.2 + 8}px;top:${y + h / 2 - 8}px;color:#6f7f86">plain middle: stretched</div>`;
    }
  } else if (s.kind === 'nine') {
    const q = s.slice;
    for (const [x, y] of [[0, 0], [W - q, 0], [0, H - q], [W - q, H - q]]) body += `<div class="c g" style="left:${x}px;top:${y}px;width:${q}px;height:${q}px;background:rgba(57,197,232,.12)"><div class="lab n" style="font-size:13px">CORNER</div><div class="lab nm" style="bottom:auto;top:${q / 2 - 14}px">all ornament<br>stays in here</div></div>`;
    for (const [x, y, w, h, t] of [[q, 0, W - 2 * q, q, 'SIDE: plain, the same all along its length (it is stretched)'], [q, H - q, W - 2 * q, q, 'SIDE: plain, the same all along'], [0, q, q, H - 2 * q, 'SIDE'], [W - q, q, q, H - 2 * q, 'SIDE']]) body += `<div class="c g" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-style:dashed"><div class="lab nm" style="bottom:auto;top:${h / 2 - 8}px">${t}</div></div>`;
    body += `<div class="c" style="left:${q}px;top:${H / 2 - 20}px;width:${W - 2 * q}px;text-align:center;color:#9fb6bf">CENTRE: plain and even, edge to edge (it is stretched)<br>the frame fills the whole sheet, right to its edges</div>`;
  } else {
    body += `<div class="safe" style="left:${W * 0.15}px;top:${H * 0.15}px;width:${W * 0.7}px;height:${H * 0.7}px;border-radius:50%"></div><div class="c" style="left:0;top:${H * 0.87}px;width:${W}px;text-align:center;color:#9fb6bf">the subject stays inside the circle; the picture fills the whole square, no transparency</div>`;
  }
  return PAGE(W, H, body, '#26282b');
}

const GEM_TINT = { ruby: '#d8362c', topaz: '#e2a63a', emerald: '#3fb56a', sapphire: '#3f7fe0', amethyst: '#a45ad6', diamond: '#cfe6ee' };
// Stand-in art for a sheet, in plain lines: the right shapes in the right places, on nothing.
function mock(s) {
  const [W, H] = s.size;
  const gold = 'filter:drop-shadow(0 0 3px #000) drop-shadow(0 2px 2px #000)';
  let body = '';
  const disc = (name, x, y, d) => {
    const on = name.endsWith('_on');
    if (name === 'frame_map') return `<div class="c" style="left:${x}px;top:${y}px;width:${d}px;height:${d}px;border:${d * 0.08}px solid #4f6f8a;box-shadow:inset 0 0 0 ${d * 0.012}px #cfe6f4"></div>`;
    if (name === 'slot_item') return `<div class="c" style="left:${x}px;top:${y}px;width:${d}px;height:${d}px;background:#101820;border:${d * 0.04}px solid #4f6f8a;box-shadow:inset 0 0 ${d * 0.1}px #000"></div>`;
    if (name === 'stick_nub') return `<div class="c" style="left:${x + d * 0.1}px;top:${y + d * 0.1}px;width:${d * 0.8}px;height:${d * 0.8}px;border-radius:50%;background:radial-gradient(circle at 40% 32%,#e8f4fb,#7fa3bd 70%);border:${d * 0.03}px solid #20303c"></div>`;
    if (name === 'stick_base') return `<div class="c" style="left:${x}px;top:${y}px;width:${d}px;height:${d}px;border-radius:50%;background:rgba(10,16,22,.35);border:${d * 0.02}px solid #6f93ad"></div>`;
    const rim = name.startsWith('btn_main') ? 0.085 : name.startsWith('slot_spell') ? 0.04 : 0.06;
    return `<div class="c" style="left:${x}px;top:${y}px;width:${d}px;height:${d}px;border-radius:50%;background:radial-gradient(circle at 50% 36%,${on ? '#4d7ea3' : '#2c3e4d'},#0c141b 72%);border:${d * rim}px solid ${on ? '#d6efff' : '#6f93ad'};box-shadow:inset 0 0 0 ${d * 0.02}px #0a1016${on ? `, inset 0 0 ${d * 0.2}px #9fd8ff` : ''}"></div>`;
  };
  if (s.kind === 'grid') {
    const cw = W / s.cols, ch = H / s.rows, m = Math.min(cw, ch);
    s.cells.forEach((c, k) => {
      if (!c.name) return;
      const x = (k % s.cols) * cw, y = Math.floor(k / s.cols) * ch;
      if (s.fill) { const d = m * 0.9; body += disc(c.name, x + (cw - d) / 2, y + (ch - d) / 2, d); return; }
      const sz = m * 0.74;
      body += svg(sketch(c.name), `left:${x + (cw - sz) / 2}px;top:${y + (ch - sz) / 2}px;width:${sz}px;height:${sz}px;color:${c.colour || (c.name.startsWith('gem_') ? GEM_TINT[c.name.split('_')[1]] : c.group === 'goods' ? '#e8c08a' : '#bfe4ff')};${gold}`);
    });
  } else if (s.kind === 'boxes') {
    for (const b of s.boxes) {
      const [x, y, w, h] = b.rect, on = b.name.endsWith('_on');
      if (b.name === 'rule') body += `<div class="c" style="left:${x}px;top:${y + h / 2 - 3}px;width:${w}px;height:6px;background:linear-gradient(90deg,transparent,#8fc4e8 30%,#8fc4e8 70%,transparent)"></div><div class="c" style="left:${x + w / 2 - 14}px;top:${y + h / 2 - 14}px;width:28px;height:28px;transform:rotate(45deg);background:#d6efff;border:3px solid #0a1016"></div>`;
      else if (b.name.startsWith('bar_') && b.name !== 'bar_frame') body += `<div class="c" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:linear-gradient(180deg,#fff8,transparent 30%),${{ bar_life: '#c2281c', bar_mana: '#2f7de0', bar_stamina: '#e0c878', bar_foe: '#8a1410' }[b.name]}"></div>`;
      else body += `<div class="c" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:${b.name === 'bar_frame' ? 'rgba(6,10,14,.8)' : on ? '#2d4a60' : '#16222c'};border:${h * 0.09}px solid ${on ? '#d6efff' : '#6f93ad'};border-radius:${b.name.startsWith('tab') ? `${h * 0.25}px ${h * 0.25}px 0 0` : `${h * 0.12}px`};box-shadow:inset 0 0 0 ${h * 0.03}px #0a1016"></div>`;
    }
  } else if (s.kind === 'nine') {
    const paper = s.name === 'paper';
    body += `<div class="c" style="left:0;top:0;width:${W}px;height:${H}px;background:${paper ? '#e6d6b0' : '#0d141a'};border:${s.slice * 0.34}px solid ${paper ? '#b89a66' : '#4f6f8a'};box-shadow:inset 0 0 0 ${s.slice * 0.06}px ${paper ? '#8a6f44' : '#cfe6f4'}"></div>`;
    if (!paper) for (const [x, y] of [[0, 0], [W - s.slice, 0], [0, H - s.slice], [W - s.slice, H - s.slice]]) body += `<div class="c" style="left:${x + s.slice * 0.2}px;top:${y + s.slice * 0.2}px;width:${s.slice * 0.6}px;height:${s.slice * 0.6}px;transform:rotate(45deg);background:#cfe6f4;border:6px solid #0a1016"></div>`;
  } else {
    body += `<div class="c" style="left:0;top:0;width:${W}px;height:${H}px;background:radial-gradient(circle at 50% 60%,#3a2414,#0b0907 70%)"></div>${svg('<path fill="#c9a35c" stroke="#3a2a12" stroke-width=".5" d="M12 4c-3.200 0-5 2.500-5 6v4.500L5 17.500h14l-2-3V10c0-3.500-1.800-6-5-6zM10.500 18.500a1.500 1.500 0 0 0 3 0z"/>', `left:${W * 0.2}px;top:${H * 0.18}px;width:${W * 0.6}px;height:${H * 0.6}px`)}`;
  }
  return PAGE(W, H, body, s.kind === 'full' ? '#0b0907' : 'transparent');
}

// ---- the kit's own words about each sheet -------------------------------------------------------------------------------
const STYLE = fs.readFileSync(path.join(HERE, 'kit', 'STYLE.md'), 'utf8');
const LOCK = STYLE.slice(STYLE.indexOf('```') + 3, STYLE.lastIndexOf('```')).trim();
function layoutWords(s) {
  const [W, H] = s.size;
  if (s.kind === 'grid') {
    const cw = Math.round(W / s.cols), ch = Math.round(H / s.rows);
    const fill = s.fill ? 'Each piece fills its cell almost to the edges (to the dashed guide in the template), perfectly centred.' : 'Each picture is centred in its cell and fills about four fifths of it, with clear empty space between it and its neighbours: nothing touches or crosses a cell\'s edge.';
    return `Canvas ${W} x ${H} pixels. An invisible grid of ${s.cols} columns by ${s.rows} rows of equal cells (${cw} x ${ch} each), read left to right, top to bottom. One picture in each cell. ${fill} All the pictures are the same size as each other and sit on one baseline grid, like stickers on a sheet. Do not draw the grid, the cell numbers or any labels.`;
  }
  if (s.kind === 'boxes') return `Canvas ${W} x ${H} pixels. The pieces are stacked on the sheet in the places the template shows, each filling its box, with clear empty space between them. Do not draw the boxes or any labels.`;
  if (s.kind === 'nine') return `Canvas ${W} x ${H} pixels. One frame fills the whole canvas, right to its edges, seen straight on, with four-way symmetry. All ornament is inside the four corner squares (each ${s.slice} x ${s.slice} pixels); between the corners each side is a plain straight band that looks the same all along its length; the centre is plain and even.`;
  return `Canvas ${W} x ${H} pixels. One picture fills the whole square, with no transparency.`;
}
function sheetWords(s) {
  const lines = [`## ${s.id}: ${s.title}`, '', `- **Save as:** \`art/${s.id}.png\`   **Size:** ${s.size[0]} x ${s.size[1]}   **Priority:** ${s.priority}`, `- **Template:** \`templates/${s.id}_template.png\``, '', '**Prompt for the image tool** (attach the template and `reference/style_anchors.png`; send all of it):', '', '```', LOCK, '', `THIS SHEET: ${s.title}.`, s.brief, '', `LAYOUT: ${layoutWords(s)}`];
  if (s.kind === 'grid') { lines.push('', 'THE PICTURES, by cell:'); s.cells.forEach((c, k) => lines.push(`${k + 1}. ${c.name ? c.what : 'Leave this cell empty.'}`)); }
  if (s.kind === 'boxes') { lines.push('', 'THE PIECES, top to bottom, left to right:'); s.boxes.forEach((b, k) => lines.push(`${k + 1}. (${b.rect[2]} x ${b.rect[3]} px, at ${b.rect[0]}, ${b.rect[1]}) ${b.what}`)); }
  lines.push('```', '');
  if (s.kind === 'grid') { lines.push('| Cell | Name in the game | What it is |', '| --- | --- | --- |'); s.cells.forEach((c, k) => lines.push(`| ${k + 1} | ${c.name ? `\`${c.name}\`` : '(empty)'} | ${c.name ? c.what.replace(/\|/g, '/') : ''} |`)); lines.push(''); }
  return lines.join('\n');
}
const ORDER = { A: 0, B: 1, C: 2 };
const sorted = [...SHEETS].sort((a, b) => ORDER[a.priority] - ORDER[b.priority]);
const PROMPTS = `# The sheets, one by one

${SHEETS.length} sheets. Do the **A** sheets first (they change the look of the whole game by themselves), then **B**, then **C**.
Any that come back are used; the game draws the rest itself as it does now.

| Sheet | Priority | Size | What |
| --- | --- | --- | --- |
${sorted.map((s) => `| \`${s.id}\` | ${s.priority} | ${s.size[0]} x ${s.size[1]} | ${s.title} |`).join('\n')}

Every prompt below starts with the same style lock (\`STYLE.md\`). Don't shorten it or reword it between sheets: it is what
makes ${SHEETS.length} pictures look like one set.

${sorted.map(sheetWords).join('\n')}`;

// ---- render, gather, zip ----------------------------------------------------------------------------------------------------
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(path.join(execSync('npm root -g').toString().trim(), 'playwright'))); }
const browser = await chromium.launch();
const shot = async (html, w, h, file, clear = false) => {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.setContent(html);
  await page.screenshot({ path: file, omitBackground: clear });
  await page.close();
};
fs.rmSync(OUT, { recursive: true, force: true });
for (const d of ['templates', 'reference', 'scripts', 'art', 'out']) fs.mkdirSync(path.join(OUT, d), { recursive: true });
for (const s of SHEETS) await shot(template(s), s.size[0], s.size[1], path.join(OUT, 'templates', `${s.id}_template.png`));
console.log(`templates: ${SHEETS.length}`);
if (mockDir) {
  fs.mkdirSync(mockDir, { recursive: true });
  for (const s of SHEETS) await shot(mock(s), s.size[0], s.size[1], path.join(mockDir, `${s.id}.png`), s.kind !== 'full');
  console.log(`stand-in art: ${mockDir}`);
}
// What the set must match: the painted pieces the game has already, and the palette.
const data = (f) => `data:image/${f.endsWith('.png') ? 'png' : 'webp'};base64,${fs.readFileSync(path.join(ROOT, f)).toString('base64')}`;
await shot(PAGE(1200, 700, `
  <div class="c" style="left:40px;top:28px;font-size:22px;color:#f1d68a">Style anchors: the painted pieces already in the game. Every new piece must look like it was made by the same hand.</div>
  <img class="c" style="left:60px;top:90px;width:300px;height:320px;object-fit:contain" src="${data('assets/ui/btn_auto.webp')}">
  <img class="c" style="left:420px;top:100px;width:300px;height:300px;image-rendering:auto" src="${data('assets/ui/velscour_skull.png')}">
  <img class="c" style="left:780px;top:180px;width:380px" src="${data('assets/title/bellmourn.webp')}">
  <div class="c" style="left:60px;top:430px;width:300px;text-align:center">A button: blackened iron, bronze-gold filigree rim, garnet studs. THE reference for metal, gold and stones. (Its word is not to be copied: no lettering on new art.)</div>
  <div class="c" style="left:420px;top:430px;width:300px;text-align:center">Bone, as painted in the game: warm ivory, dark cracks, hard outline.</div>
  <div class="c" style="left:780px;top:430px;width:380px;text-align:center">The title's gold: the highlight and shadow colours of the set's gold.</div>
  ${[['#0b0907', 'night'], ['#14100b', 'iron'], ['#3a3024', 'iron lit'], ['#8c7344', 'gold shade'], ['#c9a35c', 'gold'], ['#f1d68a', 'gold lit'], ['#e9dfc9', 'bone'], ['#8e1a12', 'garnet'], ['#d23a22', 'garnet lit'], ['#ecdfc2', 'parchment']]
    .map(([c, n], k) => `<div class="c" style="left:${40 + k * 113}px;top:540px;width:100px;height:70px;background:${c};border:1px solid #555"></div><div class="c" style="left:${40 + k * 113}px;top:616px;width:100px;text-align:center">${n}<br>${c}</div>`).join('')}`, '#1b1d20'), 1200, 700, path.join(OUT, 'reference', 'style_anchors.png'));
// Where the pieces go on a phone: the game's own layout, each place named for the piece that sits there.
const lay = SPEC.hud, K = 2;
await shot(PAGE(PHONE[0] * K, PHONE[1] * K, `
  <div class="c" style="left:0;top:0;width:100%;height:100%;background:linear-gradient(180deg,#58708c 0%,#96a098 34%,#343e2c 36%,#28321e 52%,#423e30 54%,#544c38 100%)"></div>
  ${lay.boxes.map((b) => `<div class="c" style="left:${(b.x - b.r) * K}px;top:${(b.y - b.r) * K}px;width:${b.r * 2 * K}px;height:${b.r * 2 * K}px;border-radius:${b.square ? '6px' : '50%'};background:rgba(16,12,9,.72);border:2px solid #c9a35c"></div>
    ${b.icon ? svg(sketch(b.icon), `left:${(b.x - b.r * 0.55) * K}px;top:${(b.y - b.r * 0.55) * K}px;width:${b.r * 1.1 * K}px;height:${b.r * 1.1 * K}px;color:#efe4c8`) : ''}
    <div class="c" style="left:${(b.x - 60) * K}px;top:${(b.y + b.r + 1) * K}px;width:${120 * K}px;text-align:center;font-size:${8.5 * K}px;color:#fff;text-shadow:0 0 3px #000,0 0 3px #000">${b.r < 22 && b.icon && !b.id.startsWith('slot') ? b.icon : `${b.base}${b.icon ? ` + ${b.icon}` : ''}`}</div>`).join('')}
  <div class="c" style="left:${lay.bars.x * K}px;top:${lay.bars.y * K}px;width:${lay.bars.w * K}px;height:${13 * K}px;background:#b82a1d;border:1px solid #c9a35c"></div>
  <div class="c" style="left:${lay.bars.x * K}px;top:${(lay.bars.y + 16) * K}px;width:${lay.bars.w * K}px;height:${8 * K}px;background:#4a8df0"></div>
  <div class="c" style="left:${lay.bars.x * K}px;top:${(lay.bars.y + 27) * K}px;width:${lay.bars.w * K}px;height:${5 * K}px;background:#d9c078"></div>
  <div class="c" style="left:${(lay.bars.x + lay.bars.w + 8) * K}px;top:${lay.bars.y * K}px;font-size:${8.5 * K}px;color:#fff;text-shadow:0 0 3px #000,0 0 3px #000">bar_frame, bar_life<br>bar_mana, bar_stamina</div>
  <div class="c" style="left:${250 * K}px;top:${150 * K}px;width:${330 * K}px;text-align:center;font-size:${11 * K}px;color:#fff;text-shadow:0 0 4px #000,0 0 4px #000">A phone, on its side (${PHONE[0]} x ${PHONE[1]}). Each place is named for the painted piece that sits there: a base, and the icon on it. Icons are seen about this big, so they must read at a glance.</div>`, '#000'), PHONE[0] * K, PHONE[1] * K, path.join(OUT, 'reference', 'where_pieces_go_phone.png'));
// One sheet in stand-in lines, to show the form a sheet takes (not its look).
await shot(mock(SHEETS.find((s) => s.id === 'icons_actions')), 1024, 1024, path.join(OUT, 'reference', 'form_example_NOT_the_style.png'), true);
await browser.close();

for (const f of ['README.md', 'PROMPT.md', 'STYLE.md']) fs.copyFileSync(path.join(HERE, 'kit', f), path.join(OUT, f));
for (const f of fs.readdirSync(path.join(HERE, 'kit', 'scripts'))) if (f.endsWith('.py')) fs.copyFileSync(path.join(HERE, 'kit', 'scripts', f), path.join(OUT, 'scripts', f));
fs.writeFileSync(path.join(OUT, 'PROMPTS.md'), PROMPTS);
fs.writeFileSync(path.join(OUT, 'spec.json'), specText());
fs.writeFileSync(path.join(OUT, 'art', 'PUT_YOUR_SHEETS_HERE.txt'), 'Save each finished sheet in this folder as <sheet id>.png (the ids are in PROMPTS.md), then run: python scripts/check.py\n');
fs.writeFileSync(path.join(OUT, 'out', 'README.txt'), 'scripts/check.py writes here: contact sheets, a picture of a phone\'s screen made from your pieces, report.txt, and bellmourn_ui_art.zip to give back.\n');
fs.mkdirSync(path.dirname(ZIP), { recursive: true });
fs.rmSync(ZIP, { force: true });
// (zipped with Python's own zipfile, which is there wherever the importer runs; times fixed so the same kit is the same zip)
execFileSync('python3', ['-c', `
import os, sys, zipfile
root, out = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for base, dirs, files in os.walk(root):
        dirs.sort()
        for f in sorted(files):
            p = os.path.join(base, f)
            info = zipfile.ZipInfo(os.path.join('bellmourn_ui_kit', os.path.relpath(p, root)).replace(os.sep, '/'), (2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            z.writestr(info, open(p, 'rb').read())
`, OUT, ZIP]);
console.log(`kit: ${path.relative(ROOT, ZIP)} (${(fs.statSync(ZIP).size / 1e6).toFixed(2)} MB)`);
