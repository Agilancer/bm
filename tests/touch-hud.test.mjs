// Run with node --test tests/*.test.mjs. No browser required.
// A phone's screen (src/ui/thumbs.js, src/ui/hud.css, index.html #touch) and the interface's art kit (tools/ui/): nothing
// under a thumb overlaps anything else on any phone, every button has its picture, the stylesheet and the table agree, and the
// kit, the importer and the game name the same pieces.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { ARC, SLOTS, VARS, boxes, unitOf } from '../src/ui/thumbs.js';
import { ICONS } from '../src/ui/icons.js';
import { GLYPHS } from '../src/ui/spellglyphs.js';
import { rulesFor } from '../src/ui/skin.js';
import { SPELLS } from '../src/sim/spells.js';
import { GEMS, GEM_GRADES } from '../src/items/items.js';
import { SHEETS, pieces, specText } from '../tools/ui/pieces.mjs';

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const html = read('../index.html'), css = read('../src/ui/hud.css');
// Phones on their sides, small to large, and a tablet: CSS pixels.
const SCREENS = [[568, 320], [640, 360], [667, 375], [740, 360], [780, 360], [844, 390], [915, 412], [932, 430], [1024, 768], [1180, 820]];

test('nothing under a thumb overlaps anything else, on any phone', () => {
  for (const [w, h] of SCREENS) {
    const all = boxes(w, h);
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const a = all[i], b = all[j];
      if ((a.id === 'bAttack' && b.id === 'bCast') || (a.id === 'bCast' && b.id === 'bAttack')) continue;   // (one or the other: the cave's cast stands where the staff's will)
      // (the corner map is a square: how far the other's edge is from its nearest side or corner)
      const sq = a.square ? a : b.square ? b : null, o = sq === a ? b : a;
      const gap = sq ? Math.hypot(Math.max(0, Math.abs(o.x - sq.x) - sq.r), Math.max(0, Math.abs(o.y - sq.y) - sq.r)) - o.r : Math.hypot(a.x - b.x, a.y - b.y) - a.r - b.r;
      assert.ok(gap >= 2, `${w}x${h}: ${a.id} and ${b.id} are ${gap.toFixed(1)} px apart`);
    }
    for (const b of all) assert.ok(b.x - b.r >= 0 && b.x + b.r <= w && b.y - b.r >= 0 && b.y + b.r <= h, `${w}x${h}: ${b.id} is off the screen`);
  }
});

test('the right thumb\'s buttons keep clear of where the left thumb\'s stick is taken up', () => {
  // (src/input.js: a touch in the left 42% of the screen is the stick.)
  for (const [w, h] of SCREENS) {
    for (const b of boxes(w, h)) if (ARC[b.id] || b.id.startsWith('slot')) assert.ok(b.x - b.r > w * 0.42, `${w}x${h}: ${b.id} reaches into the stick's side`);
  }
});

test('a thumb\'s button is never smaller than a thumb can hit', () => {
  const u = unitOf(320);
  for (const [id, p] of Object.entries(ARC)) assert.ok(p.s * u >= 44, `${id} is ${(p.s * u).toFixed(0)} px on the smallest phone`);
  for (const p of SLOTS) assert.ok(p.s * u >= 36, 'a spell\'s slot on the smallest phone');
});

test('every button on the page has its place and its picture', () => {
  for (const id of Object.keys(ARC)) assert.ok(html.includes(`id="${id}"`), `${id} is in thumbs.js and not on the page`);
  const marked = [...html.matchAll(/data-ic="([a-z0-9_]+)"/g)].map((m) => m[1]);
  assert.ok(marked.length >= 12);
  for (const name of marked) assert.ok(ICONS[name], `no drawing for ${name} in src/ui/icons.js`);
  // What main.js and view.js put on a button as things change.
  for (const name of ['take', 'talk', 'open', 'shut', 'locked', 'view1', 'view3']) assert.ok(ICONS[name], name);
  for (const id of ['bPause', 'bPack', 'bBook', 'bJournal', 'bMap', 'bTake', 'bView']) assert.ok(read('../src/main.js').includes(`$('${id}')`) || read('../src/ui/view.js').includes(`'${id}'`), `${id} is on the page with nothing listening`);
});

test('the stylesheet\'s numbers are the table\'s', () => {
  const seen = new Set();
  for (const m of css.matchAll(/var\(--t-([a-z-]+), (\d+(?:\.\d+)?)\)/g)) {
    assert.ok(m[1] in VARS, `hud.css reads --t-${m[1]}, which thumbs.js doesn't give`);
    assert.equal(+m[2], VARS[m[1]], `--t-${m[1]} falls back to ${m[2]} in hud.css; the table says ${VARS[m[1]]}`);
    seen.add(m[1]);
  }
  for (const k of Object.keys(VARS)) assert.ok(seen.has(k), `--t-${k} is in the table and nothing reads it`);
  // What's said beside the take button sits by the take button.
  assert.ok(css.includes(`+ ${ARC.bTake.dx} - ${ARC.bTake.s / 2})`), 'the take button\'s word has moved away from it');
});

test('a menu, the pause or the big map puts the thumbs away, and each says so to the page', () => {
  for (const cls of ['menu-up', 'paused', 'map-up']) assert.ok(new RegExp(`body\\.touch\\.${cls} #touch`).test(css), cls);
  assert.ok(read('../src/input.js').includes("classList.toggle('menu-up'"));
  assert.ok(read('../src/main.js').includes("classList.toggle('paused'"));
  assert.ok(read('../src/ui/map.js').includes("classList.toggle('map-up'"));
});

test('nothing inside a button or a slot takes a touch', () => {
  // (A slot is drawn again as it's pressed: a thumb on what was replaced would never be heard lifting, and the cast would stay held.)
  assert.match(css.replace(/\/\*[\s\S]*?\*\//g, ''), /#spells \.spell > \*, \.tbtn > \* \{ pointer-events: none; \}/);
});

test('painted pieces are found by the names the kit gives them', () => {
  const all = pieces(), names = new Set(all.map((p) => p.name));
  assert.equal(names.size, all.length, 'two pieces of the kit share a name');
  // Frames, bars and rings: each one the stylesheet has a use for, and none it reads that the kit doesn't make.
  const read1 = new Set([...css.matchAll(/html\.art-([a-z0-9_]+)/g)].map((m) => m[1]));
  for (const p of all.filter((q) => q.group === 'pieces' && q.name !== 'app_icon')) assert.ok(read1.has(p.name), `nothing in hud.css uses the piece ${p.name}`);
  for (const k of read1) assert.ok(names.has(k) || k === 'spells' || k === 'icons', `hud.css reads html.art-${k}, which no sheet makes`);
  // Icons: by the name on the button; the paper doll's and the schools' their own way (src/ui/skin.js).
  for (const p of all.filter((q) => q.group === 'icons')) assert.ok(ICONS[p.name] || /^(slot|school|quest|role)_/.test(p.name), `the kit paints an icon ${p.name} the game has no place for`);
  for (const name of Object.keys(ICONS)) assert.ok(names.has(name), `${name} is drawn in icons.js and missing from the kit`);
  // Spells: all sixty, by their keys.
  const spells = new Set(all.filter((q) => q.group === 'spells').map((q) => q.name));
  for (const d of SPELLS) { assert.ok(spells.has(d.key), `no cell in the kit for the spell ${d.key}`); assert.ok(GLYPHS[d.key], `no glyph drawn for ${d.key}`); }
  for (const k of spells) assert.ok(SPELLS.some((d) => d.key === k) || k.startsWith('mark_'), `the kit paints ${k}, which isn't a spell`);
});

test('the corner map is a square, and the kit paints every gem, quest mark and role', () => {
  assert.ok(boxes(844, 390).find((b) => b.id === 'mapMini').square);
  assert.ok(!/arc\(R, R/.test(read('../src/ui/map.js').split('drawMini(snap, yaw) {')[1].split('drawBig(')[0]), 'the corner map is still cut round');
  const names = new Set(pieces().map((p) => p.name));
  for (const kind of Object.keys(GEMS)) for (let g = 0; g < GEM_GRADES.length; g++) assert.ok(names.has(`gem_${kind}_${g}`), `no gem_${kind}_${g} in the kit`);
  for (const k of ['quest_offer', 'quest_ready', 'quest_busy', 'role_tank', 'role_heal', 'role_dps', 'frame_map']) assert.ok(names.has(k), k);
});

test('a sheet is a size ChatGPT makes, and its cells are all accounted for', () => {
  for (const s of SHEETS) {
    assert.ok(['1024x1024', '1536x1024'].includes(s.size.join('x')), `${s.id} is ${s.size.join(' x ')}`);
    assert.ok(['A', 'B', 'C'].includes(s.priority), s.id);
    if (s.kind === 'grid') assert.equal(s.cells.length, s.cols * s.rows, `${s.id} has ${s.cells.length} cells for a grid of ${s.cols} by ${s.rows}`);
    if (s.kind === 'boxes') for (const b of s.boxes) assert.ok(b.rect[0] + b.rect[2] <= s.size[0] && b.rect[1] + b.rect[3] <= s.size[1], `${s.id}: ${b.name} runs off the sheet`);
    for (const c of s.cells || s.boxes || []) if (c.name) assert.ok(c.what && !/\b[VT]\b/.test(c.what), `${s.id}: ${c.name} needs saying what it is, with no V or T asked for`);
  }
});

test('spec.json is what pieces.mjs says (node tools/ui/build_kit.mjs --spec)', () => {
  assert.equal(read('../tools/ui/spec.json'), specText(), 'tools/ui/spec.json is stale: run node tools/ui/build_kit.mjs');
});

test('the game\'s rules for a manifest: a picture over its drawing, by name, and nothing for a name it can\'t trust', () => {
  const rules = rulesFor({ pieces: { btn_round: 'btn_round.webp' }, icons: { jump: 'icons/jump.webp', slot_ring: 'icons/slot_ring.webp', school_fire: 'icons/school_fire.webp', 'x"] { } body': 'bad.webp' }, spells: { firebolt: 'spells/firebolt.webp' } }, 'k/');
  assert.ok(rules.includes('--art-btn_round: url("k/btn_round.webp")'));
  assert.ok(rules.includes('[data-ic="jump"]::before') && rules.includes('[data-ic="jump"] > svg { visibility: hidden; }'));
  assert.ok(rules.includes('.slot[data-slot^="ring"]:not(.full)'));
  assert.ok(rules.includes('.sch[data-ic="school_fire"] { display: inline-block; }'));
  assert.ok(rules.includes('svg[data-sp="firebolt"]'));
  assert.ok(!rules.includes('bad.webp'));
  assert.equal(rulesFor({}), '');
});

test('the manifest in the game lists only files that are there', () => {
  const m = JSON.parse(read('../assets/ui/kit/manifest.json'));
  assert.equal(m.version, 1);
  for (const g of ['pieces', 'icons', 'spells', 'goods']) for (const [k, f] of Object.entries(m[g] || {})) assert.ok(fs.existsSync(new URL(`../assets/ui/kit/${f}`, import.meta.url)), `${g}.${k}: ${f} is listed and missing`);
});

test('the kit cuts a sheet into its pictures (Python, with numpy and Pillow)', (t) => {
  if (spawnSync('python3', ['-c', 'import numpy, PIL']).status !== 0) { t.skip('no python3 with numpy and Pillow here'); return; }
  const py = `
import json, sys
sys.path.insert(0, 'tools/ui/kit/scripts')
import uikit
from PIL import Image, ImageDraw
spec = uikit.load_spec('tools/ui/spec.json')
by = {s['id']: s for s in spec['sheets']}
out = {}
# Sixteen blobs on nothing, one a little off its cell's middle: sixteen pictures.
s = by['icons_actions']; im = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
for k in range(16):
    x, y = (k % 4) * 256 + 128 + (14 if k == 5 else 0), (k // 4) * 256 + 128
    d.ellipse([x - 90, y - 90, x + 90, y + 90], fill=(200, 160, 90, 255))
pics, notes = uikit.process_sheet(s, im)
out['alpha'] = [len(pics), sorted({p.size for p in pics.values()})[0], [n for n in notes if n[0] == 'error']]
# The same on flat green: taken out, and the same sixteen.
g = Image.new('RGB', (1024, 1024), (0, 255, 0)); g.paste(im, mask=im.split()[3])
pics, notes = uikit.process_sheet(s, g)
out['green'] = [len(pics), max(p.getpixel((2, 2))[3] for p in pics.values()), min(p.getpixel((96, 96))[3] for p in pics.values())]
# On white with no way to tell art from ground but the edges: still sixteen.
w = Image.new('RGB', (1024, 1024), (255, 255, 255)); w.paste(im, mask=im.split()[3])
pics, notes = uikit.process_sheet(s, w)
out['white'] = len(pics)
# One blob missing is said, by its name.
im2 = im.copy(); ImageDraw.Draw(im2).rectangle([0, 0, 255, 255], fill=(0, 0, 0, 0))
pics, notes = uikit.process_sheet(s, im2)
out['missing'] = [len(pics), [t for lv, t in notes if lv == 'error']]
# A frame filling its sheet is kept whole.
f = Image.new('RGB', (1024, 1024), (20, 16, 11)); ImageDraw.Draw(f).rectangle([40, 40, 983, 983], outline=(201, 163, 92), width=12)
pics, notes = uikit.process_sheet(by['panel'], f)
out['panel'] = [list(pics), pics['panel'].size]
print(json.dumps(out))
`;
  const r = spawnSync('python3', ['-I', '-c', py], { cwd: new URL('..', import.meta.url), encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const o = JSON.parse(r.stdout);
  assert.deepEqual(o.alpha, [16, [192, 192], []]);
  assert.equal(o.green[0], 16); assert.ok(o.green[1] < 20, 'the green is gone from the corners'); assert.ok(o.green[2] > 235, 'and the art is whole');
  assert.equal(o.white, 16);
  assert.equal(o.missing[0], 15); assert.match(o.missing[1][0], /cell 1 \(staff\) is empty/);
  assert.deepEqual(o.panel, [['panel'], [512, 512]]);
});
