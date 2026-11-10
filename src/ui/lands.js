// Out past the town: the seals you travel by, the charms in their pouch, the sounds of the countries, and Velscour's Skull (the
// debug menu, behind the word 6669). All three came over from the first Bellmourn (Agilancer/Bellmourn src/fps: portals.js,
// charms.js, debug.js); here they're one small window manager over the game's own pieces, which main.js hands in.
//
// The seals: a ring of pale stones with a blue face (src/core/sites.js SEALS), one by Bellmourn's south road and one at each
// great place. Walk onto one and it wakes; E on a woken one lists every other woken one, and takes you there.
//
// The skull: beside the corner map (with the mouse free: Esc first), or the ` key. The right word opens the menu; the cheats
// last until the page is reloaded. Another word, Jamie, wakes the Auto button under it (src/ui/autoplay.js).

import { SEALS } from '../core/sites.js';
import { CLIFF, POOL, SITES, WATERS, countryAt } from '../core/lands.js';
import { roomAt } from './places.js';
import { ABIL, H, INPUT } from '../core/layout.js';

const PASSWORD = '6669';
// The word for auto-play: any case.
const AUTO_WORD = 'jamie';
// The countries thick with trees, where the woods' own sounds are heard.
const WOODS = new Set(['darkwood', 'deepwood', 'rustwood', 'gallows']);
const SKULL = 'assets/ui/velscour_skull.png';
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

// ---------------------------------------------------------------- charms

export const CHARM_SLOTS = 20;
export const CHARM_COLOR = '#c9b8ff';
export const ABILITIES = {
  doubleJump: { bit: ABIL.DOUBLE_JUMP, name: 'Double Jump', desc: 'Press jump again while in the air to leap a second time.' },
  sureFoot: { bit: ABIL.SURE_FOOT, name: 'Sure Footing', desc: 'A long fall jars you less, and steep stone holds your feet.' },
  darkSight: { bit: 0, name: 'Glimmer', desc: 'Below ground, a faint light goes with you.' },
};
export const CHARMS = {
  wingbell: { name: 'The Wingbell', ability: 'doubleJump',
    lore: 'A silver bell no bigger than a thumb, a swift\'s wing cast on its shoulder. Ring it in the air and the air rings back, and holds you up for one more step.' },
  goatfoot: { name: 'The Goatfoot', ability: 'sureFoot',
    lore: 'A cloven hoof shod in iron, hung on a thong. Where the stone is too steep for a man it is not too steep for a goat.' },
  glimmerstone: { name: 'The Glimmerstone', ability: 'darkSight',
    lore: 'A shard of pale crystal on a silver wire. Underground it wakes, and gives back a little of the light it drank.' },
};
// 16x16 pixel icons, a character a pixel, each charm its own colours.
const ICONS = {
  wingbell: ['......vv........', '.....v..v.......', '......vv........', '......ss........', '....slllss......', '...slllllss..ww.',
    '...sllllsss.wwww', '..sllllsssswwww.', '..slllssssswww..', '..sllsssssssw...', '.sllssssssssd...', '.ssssssssssssd..',
    '.ddddddddddddd..', '......dyyd......', '.......yy.......', '................'],
  goatfoot: ['.......rr.......', '......r..r......', '.......rr.......', '.......tt.......', '......tt........', '.....tt.........',
    '....hhhhhh......', '...hkkkkkkh.....', '...hkkkkkkkh....', '...hkkkh.kkh....', '...hkkkh.kkkh...', '...hkkh...kkh...',
    '..iiiih...iiii..', '..illli...illi..', '..iiiii...iiii..', '................'],
  glimmerstone: ['.......ww.......', '......w..w......', '.......ww.......', '.......w........', '......dcl.......', '.....dccl.......',
    '.....dcclc......', '....dccclc......', '....dcccllc.....', '...ddcccllc.....', '...dcccccllc....', '...ddccccclc....',
    '....ddcccccc....', '.....dddccc.....', '.......ddd......', '................'],
};
const PAL = { wingbell: { v: '#8a5cff', s: '#b8bcc8', l: '#f4f6ff', d: '#5a5e6e', w: '#e8e0ff', y: '#ffd870' },
  goatfoot: { r: '#c8a048', t: '#8a5a30', h: '#2e2420', k: '#6a5444', i: '#8a909a', l: '#d8dce4' },
  glimmerstone: { w: '#c0c4cc', d: '#2a7ca0', c: '#6ad8f8', l: '#e8ffff' } };
const iconCache = {};
export function charmIcon(id) {
  if (iconCache[id]) return iconCache[id];
  const cv = document.createElement('canvas'); cv.width = cv.height = 16;
  const g = cv.getContext('2d');
  ICONS[id].forEach((row, y) => [...row].forEach((ch, x) => { if (PAL[id][ch]) { g.fillStyle = PAL[id][ch]; g.fillRect(x, y, 1, 1); } }));
  return (iconCache[id] = cv.toDataURL());
}
export const charmTip = (id) => { const C = CHARMS[id], A = ABILITIES[C.ability]; return `${C.name}: ${A.name}. ${A.desc}\n\n${C.lore}`; };

// ---------------------------------------------------------------- the windows

const CSS = `
#vskull { position: fixed; top: 200px; right: 26px; width: 46px; height: 46px; z-index: 45; padding: 0; border: 1px solid #5a2a22; border-radius: 50%;
  background: radial-gradient(#2a1410, #0b0706); cursor: pointer; opacity: .78; box-shadow: 0 0 10px #000; }
#vskull img { width: 100%; height: 100%; object-fit: contain; pointer-events: none; }
#vskull:hover, #vskull.lit { opacity: 1; box-shadow: 0 0 14px #c0302088; }
#vskull.off { display: none; }
#vskullTag { position: fixed; top: 250px; right: 10px; width: 78px; text-align: center; z-index: 45; font: 700 9px Cinzel, Georgia, serif; color: #e05040; letter-spacing: .08em; pointer-events: none; }
.lands-panel { position: fixed; z-index: 46; left: 50%; top: 50%; transform: translate(-50%, -50%); max-height: 86vh; overflow: auto; width: min(520px, 92vw);
  background: rgba(11, 9, 7, .96); border: 1px solid #6a5232; box-shadow: 0 10px 40px #000c; color: #e8dcc0; font: 14px Georgia, serif; padding: 18px 20px; display: none; }
.lands-panel.on { display: block; }
.lands-panel h2 { font: 700 20px Cinzel, Georgia, serif; color: #d8b45a; margin: 0 0 6px; letter-spacing: .05em; }
.lands-panel h3 { font: 700 12px Cinzel, Georgia, serif; color: #a08a60; margin: 14px 0 6px; letter-spacing: .12em; text-transform: uppercase; }
.lands-panel .head { display: flex; align-items: center; gap: 12px; }
.lands-panel .head img { width: 54px; height: 54px; }
.lands-panel button { font: inherit; color: inherit; background: #1b1510; border: 1px solid #4a3a26; padding: 8px 10px; cursor: pointer; text-align: left; }
.lands-panel button:hover:not(:disabled) { border-color: #c8a048; background: #241b12; }
.lands-panel button:disabled { opacity: .45; cursor: default; }
.lands-panel .row { display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%; margin: 4px 0; }
.lands-panel .row b { display: block; color: #f0e2c0; } .lands-panel .row em { display: block; font-size: 12px; color: #a89878; font-style: normal; }
.lands-panel .sw { font: 700 11px Cinzel, Georgia, serif; color: #777; min-width: 34px; text-align: right; }
.lands-panel .on .sw { color: #6fd06a; } .lands-panel .god.on .sw { color: #ff5a3a; }
.lands-panel .pair { display: flex; gap: 8px; } .lands-panel .pair button { flex: 1; }
.lands-panel .lvl { display: flex; align-items: center; gap: 12px; } .lands-panel .lvl button { width: 40px; text-align: center; font-size: 18px; }
.lands-panel .note { min-height: 18px; color: #d8b45a; font-size: 13px; margin-top: 10px; }
.lands-panel .foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; }
.lands-panel input { font: 18px Georgia, serif; width: 100%; box-sizing: border-box; background: #0b0807; color: #f0e2c0; border: 1px solid #6a5232; padding: 8px; letter-spacing: .4em; text-align: center; }
#sealPanel .seal { width: 100%; margin: 3px 0; }
#sealPanel .seal em { color: #7fb0e8; }
#charmRow { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
#charmRow .ch { width: 30px; height: 30px; border: 1px solid #4a3e5e; background: #120f18; display: flex; align-items: center; justify-content: center; }
#charmRow .ch img { width: 24px; height: 24px; image-rendering: pixelated; }
/* A short screen: two rows of ten, small, so the pack fits (index.html sizes its cells to this). */
@media (max-height: 640px) {
  #charmRow { display: grid; grid-template-columns: repeat(10, 22px); gap: 3px; margin-top: 5px; }
  #charmRow .ch { width: 22px; height: 22px; }
  #charmRow .ch img { width: 18px; height: 18px; }
}
`;

// What the cheat switches are: [key, name, what it does, the bit it sets].
const TOGGLES = [
  ['noDamage', 'No Enemy Damage', 'Nothing an enemy does can hurt you', ABIL.NO_DAMAGE],
  ['fly', 'No-Clip / Inspect', 'Fly where you look, through anything: Space up, Shift fast', ABIL.FLY],
  ['god', 'GOD MODE', 'No damage, and everything dies at one blow', ABIL.GOD],
  ['doubleJump', 'Double Jump', 'Jump again in the air, with no charm', ABIL.DOUBLE_JUMP],
];
const TAGS = { god: 'GOD', fly: 'NO-CLIP', noDamage: 'NO DMG', doubleJump: '2X JUMP' };

export class Lands {
  /** o: { shared, input, hud, audio, pack, worldMap, cmd(code, a, b, c), snap(), hour(), opened(), closed(), canMenu(), arm(),
   * level(+1|-1), gear('god'|'peasant') -> line, bells(), autoplay() (the word Jamie: the Auto button) } */
  constructor(o) {
    this.o = o;
    this.cheats = { noDamage: false, fly: false, god: false, doubleJump: false };
    this.awake = new Set(['bellmourn']);
    this.nearSeal = null;
    this.note = '';
    const style = el('style'); style.textContent = CSS; document.head.append(style);
    this.skull = el('button', null, `<img src="${SKULL}" alt="" draggable="false">`);
    this.skull.id = 'vskull'; this.skull.type = 'button'; this.skull.title = "Velscour's Skull";
    this.tag = el('div'); this.tag.id = 'vskullTag';
    this.skull.addEventListener('click', (e) => { e.stopPropagation(); this.skull.blur(); this.ask(); });
    this.skull.addEventListener('touchend', (e) => { e.preventDefault(); e.stopPropagation(); this.ask(); }, { passive: false });
    this.pass = el('div', 'lands-panel', `<div class="head"><img src="${SKULL}" alt=""><div><h2>Velscour's Skull</h2><div>Speak the word, and the skull will answer.</div></div></div>
      <form autocomplete="off" style="margin-top:12px"><input type="password" inputmode="text" autocapitalize="off" spellcheck="false" maxlength="16" aria-label="The word" placeholder="&bull; &bull; &bull; &bull;">
      <div class="foot"><button type="button" class="cancel">Cancel</button><button type="submit">Unlock</button></div></form>`);
    this.word = this.pass.querySelector('input');
    this.pass.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); this.unlock(); });
    this.pass.querySelector('.cancel').onclick = () => this.close();
    this.menu = el('div', 'lands-panel');
    this.travel = el('div', 'lands-panel'); this.travel.id = 'sealPanel';
    document.body.append(this.skull, this.tag, this.pass, this.menu, this.travel);
    for (const p of [this.pass, this.menu, this.travel]) p.addEventListener('pointerdown', (e) => e.stopPropagation());
    addEventListener('keydown', (e) => {
      if (this.isOpen) {
        e.stopPropagation();
        if (e.code === 'Escape' || (e.code === 'KeyE' && this.travel.classList.contains('on'))) { e.preventDefault(); this.close(); }
        return;
      }
      if (e.code === 'Backquote' && this.o.canMenu()) { e.preventDefault(); this.ask(); }
    }, true);
    this.showTag();
  }

  get isOpen() { return [this.pass, this.menu, this.travel].some((p) => p.classList.contains('on')); }

  open(p) {
    if (this.isOpen) return false;
    this.o.audio.play('uiOpen', null, 0, 0, 0.4, 1, false);
    this.o.opened();
    p.classList.add('on');
    return true;
  }

  close() {
    if (!this.isOpen) return;
    this.o.audio.play('uiClose', null, 0, 0, 0.4, 1, false);
    for (const p of [this.pass, this.menu, this.travel]) p.classList.remove('on');
    document.activeElement?.blur?.();
    this.o.closed();
  }

  ask() {
    if (!this.open(this.pass)) return;
    this.word.value = '';
    setTimeout(() => this.word.focus({ preventScroll: true }), 0);
  }

  unlock() {
    const word = this.word.value.trim();
    const ok = word === PASSWORD;
    this.word.value = '';
    this.pass.classList.remove('on');
    // (Not closed() here: that hands the mouse back to the game, and the Auto button wants clicking. Auto-play keeps it free.)
    if (word.toLowerCase() === AUTO_WORD && this.o.autoplay) {
      this.o.autoplay();
      return;
    }
    if (!ok) { this.o.closed(); this.o.hud.tip('The skull says nothing.', 2); return; }
    this.note = '';
    this.render();
    this.menu.classList.add('on');
  }

  showTag() {
    const on = Object.keys(TAGS).filter((k) => this.cheats[k]).map((k) => TAGS[k]);
    this.tag.textContent = on.join(' · ');
    this.skull.classList.toggle('lit', on.length > 0);
  }

  render() {
    const M = this.menu, c = this.cheats, P = this.o.pack;
    M.innerHTML = `<div class="head"><img src="${SKULL}" alt=""><h2>Velscour's Skull</h2></div><h3>Cheats</h3>`;
    for (const [k, name, desc] of TOGGLES) {
      const b = el('button', `row${k === 'god' ? ' god' : ''}${c[k] ? ' on' : ''}`, `<span><b>${name}</b><em>${desc}</em></span><i class="sw">${c[k] ? 'ON' : 'OFF'}</i>`);
      b.onclick = () => { c[k] = !c[k]; if (k === 'god') this.o.arm(); this.showTag(); this.act(`${name}: ${c[k] ? 'on' : 'off'}.`); };
      M.append(b);
    }
    M.append(el('h3', null, 'World'));
    const all = SEALS.length, awake = this.awake.size;
    const port = el('button', 'row', `<span><b>Unlock All Portals</b><em>${awake >= all ? `All ${all} seals are awake: stand on any and travel to any other` : `Wake every seal in the land (${awake} of ${all} awake)`}</em></span>`);
    port.disabled = awake >= all;
    port.onclick = () => { for (const s of SEALS) this.awake.add(s.key); this.showPortals(); this.act(`All ${all} seals wake. Stand on one and press E to travel.`); };
    const bells = el('button', 'row', '<span><b>Ring the Bells</b><em>A peal heard all over the land (a sound test)</em></span>');
    bells.onclick = () => { this.o.audio.once('title_bells', 0.9); this.act('The bells ring out over the downs.'); };
    const travel = el('button', 'row', '<span><b>Travel</b><em>To any seal, woken or not, from wherever you stand</em></span>');
    travel.onclick = () => { this.menu.classList.remove('on'); this.listSeals(true); };
    M.append(port, bells, travel);
    M.append(el('h3', null, 'Gear'));
    const pair = el('div', 'pair');
    const god = el('button', null, '<b>GEAR GOD</b><em style="display:block;font-size:12px;color:#a89878">Epic, Legendary, Mythical: skulls, staffs, shields, robes, gems, and gold</em>');
    const peas = el('button', null, '<b>GEAR PEASANT</b><em style="display:block;font-size:12px;color:#a89878">Common, Uncommon, Rare: the same, and gold</em>');
    god.onclick = () => this.act(this.o.gear('god'));
    peas.onclick = () => this.act(this.o.gear('peasant'));
    pair.append(god, peas);
    const have = Object.keys(CHARMS).filter((k) => P.charms.includes(k)).length, allC = Object.keys(CHARMS).length;
    const charms = el('button', 'row', `<span><b>Give All Charms</b><em>${have >= allC ? `All ${allC} charms are in your pouch` : `Every charm there is, into your charm pouch (${have} of ${allC})`}</em></span>`);
    charms.disabled = have >= allC;
    charms.onclick = () => { for (const k of Object.keys(CHARMS)) this.addCharm(k, true); this.act('Every charm is in your pouch.'); };
    M.append(pair, charms);
    M.append(el('h3', null, 'Level'));
    const lv = el('div', 'lvl');
    const dn = el('button', null, '&minus;'), up = el('button', null, '+');
    dn.disabled = P.level <= 1; up.disabled = P.level >= 50;
    dn.onclick = () => this.act(this.o.level(-1)); up.onclick = () => this.act(this.o.level(1));
    lv.append(dn, el('div', null, `<b>Level ${P.level}</b> <span style="color:#a89878">of 50</span>`), up);
    M.append(lv);
    const note = el('div', 'note'); note.textContent = this.note;
    const foot = el('div', 'foot'); const done = el('button', null, 'Close'); done.onclick = () => this.close(); foot.append(done);
    M.append(note, foot, el('div', null, '<span style="font-size:11px;color:#7a6a50">The cheats last until the page is reloaded.</span>'));
  }

  act(said) {
    this.note = typeof said === 'string' ? said : '';
    const top = this.menu.scrollTop;
    this.render();
    this.menu.scrollTop = top;
  }

  // ---- the seals

  showPortals() { this.o.worldMap.portals = SEALS.filter((s) => this.awake.has(s.key)).map((s) => [s.x, s.z]); }

  // E: true if there's a seal under you to use.
  use() {
    if (!this.nearSeal) return false;
    this.listSeals(false);
    return true;
  }

  listSeals(any) {
    const T = this.travel, here = this.nearSeal;
    T.innerHTML = `<h2>${any ? 'Travel' : esc(here.name)}</h2><div style="color:#a89878">${any ? 'Every seal in the land.' : 'The seal knows the others that have woken. Choose one, and step through.'}</div>`;
    const list = SEALS.filter((s) => s !== here && (any || this.awake.has(s.key)));
    if (!list.length) T.append(el('div', 'note', 'No other seal has woken yet. Find them out in the land: each great place has one.'));
    const snap = this.o.snap(), px = snap[H.PX], pz = snap[H.PZ];
    for (const s of list) {
      const km = (Math.hypot(s.x - px, s.z - pz) / 1000).toFixed(1);
      const b = el('button', 'seal', `<b>${esc(s.name)}</b> <em>${km} km</em>`);
      b.onclick = () => this.go(s);
      T.append(b);
    }
    const foot = el('div', 'foot'); const x = el('button', null, 'Stay'); x.onclick = () => this.close(); foot.append(x); T.append(foot);
    if (!this.isOpen) this.open(T); else T.classList.add('on');
  }

  go(s) {
    this.close();
    // (Out to the side of the face, so you don't arrive standing on it with the list up again.)
    const a = Math.atan2(-s.z, -s.x);
    this.o.cmd(19, 0, s.x + Math.cos(a) * 5.5, s.z + Math.sin(a) * 5.5);
    this.awake.add(s.key);
    this.o.audio.once('lock_unlock', 0.7);
    this.o.hud.tip(s.name, 3);
  }

  // ---- charms

  addCharm(id, quiet) {
    const P = this.o.pack;
    if (!CHARMS[id] || P.charms.includes(id) || P.charms.length >= CHARM_SLOTS) return false;
    P.charms.push(id);
    if (!quiet) this.o.hud.tip(`${CHARMS[id].name}: ${ABILITIES[CHARMS[id].ability].desc}`, 5);
    return true;
  }

  abilityBits() {
    let b = 0;
    for (const k of this.o.pack.charms) b |= ABILITIES[CHARMS[k]?.ability]?.bit || 0;
    for (const [k, , , bit] of TOGGLES) if (this.cheats[k]) b |= bit;
    return b;
  }

  // ---- each frame

  frame(snap) {
    if (!snap) return;
    this.o.shared.input[INPUT.ABIL] = this.abilityBits();
    this.skull.classList.toggle('off', !(this.o.input.enabled && (this.o.input.touch || !document.pointerLockElement || this.isOpen)));
    const px = snap[H.PX], pz = snap[H.PZ];
    let near = null;
    for (const s of SEALS) if (Math.abs(s.x - px) < 4 && Math.abs(s.z - pz) < 4 && Math.hypot(s.x - px, s.z - pz) < 3.2) near = s;
    if (near && !this.awake.has(near.key)) {
      this.awake.add(near.key);
      this.showPortals();
      this.o.audio.once('lock_unlock', 0.8);
      this.o.hud.tip(`The seal of ${near.name} wakes. E on any woken seal to travel.`, 5);
    } else if (near && near !== this.nearSeal) this.o.hud.tip(`${near.name}: E to travel`, 2.5);
    this.nearSeal = near;
    this.sounds(px, snap[H.PY], pz);
  }

  // The countries' sounds, eased in and out by where you are. Under a roof the land's own come through faint; under the
  // ground, not at all, and the place's own take over (src/ui/places.js roomAt).
  sounds(px, py, pz) {
    this.soundT = (this.soundT || 0) + 1;
    if (this.soundT % 15) return;
    const A = this.o.audio, hr = this.o.hour(), night = hr < 5 || hr > 20.5;
    const near = (x, z, r) => Math.max(0, 1 - Math.hypot(x - px, z - pz) / r);
    const room = roomAt(px, py, pz), out = room === 'out' ? 1 : room === 'house' || room === 'cathedral' ? 0.15 : 0;
    const c = countryAt(px, pz), woods = WOODS.has(c) ? 1 : 0, fen = c === 'fen' ? 1 : 0;
    // A storm over Velscour's ground in the Ashen Waste: thickest at his keep.
    const k = SITES.keep, o = SITES.obelisks, bf = SITES.bones;
    const storm = Math.min(1, 1.5 * Math.max(near(k.x, k.z, 700), near(o.x, o.z, 380), near(bf.x, bf.z, 380)));
    const fair = (1 - storm) * (1 - fen);
    // The birds and the wind, and the woods by day and by night (the Weeping Fen's in the rain).
    A.bed('birds', night ? 0 : 0.16 * out * fair * (1 - woods));
    A.bed('wind_calm', 0.34 * out * (1 - 0.6 * storm));
    A.bed('forest_day', night ? 0 : 0.5 * out * woods * fair);
    A.bed('forest_night', night ? 0.45 * out * woods * fair : 0);
    A.bed('night', night ? 0.3 * out * (1 - woods) * fair : 0);
    A.bed(night ? 'forest_night_rain' : 'forest_day_rain', 0.5 * out * fen);
    A.bed(night ? 'forest_day_rain' : 'forest_night_rain', 0);
    A.bed(night ? 'forest_night_storm' : 'forest_day_storm', 0.6 * out * storm);
    A.bed(night ? 'forest_day_storm' : 'forest_night_storm', 0);
    A.bed('wind_forest', out * (woods * 0.22 + 0.5 * Math.min(1, Math.max(0, (py - 260) / 400))));
    // Water: the falls (their roar far off, the water's fall close to), the pool churning under them, the meres, Sallowmere's shore.
    const f = SITES.falls;
    A.bed('waterfall_strong', 0.7 * out * near(f.x + 40, f.z, 220) ** 1.5);
    A.bed('waterfall_loop', 0.6 * out * near(CLIFF.x + 30, POOL.z, 90) ** 1.2);
    A.bed('river_loop', 0.4 * out * near(POOL.x, POOL.z, POOL.r + 35));
    let water = 0;
    for (const w of WATERS) if (!w.frozen) water = Math.max(water, near(w.x, w.z, w.r + 70));
    A.bed('stream', 0.35 * out * water);
    const sm = WATERS.find((w) => w.key === 'sallow');
    A.bed('beach_rain', 0.45 * out * near(sm.x, sm.z, sm.r + 60) ** 0.7);
    A.bed('fire_medium', 0.35 * out * Math.max(near(k.x + 90, k.z, 140), near(o.x, o.z, 60)));
    A.bed('cave_drips', 0.3 * out * near(SITES.barrows.x, SITES.barrows.z, 120));
    // Inside: a house's quiet (and the Test Dungeon's, by day whatever the hour), the dark lord's cathedral with the storm on
    // its roof, the catacombs, the Rift's rumble.
    A.bed('inside_day', (room === 'house' && !night) || room === 'hall' ? 0.5 : 0);
    A.bed('inside_night', room === 'house' && night ? 0.5 : 0);
    A.bed('inside_day_storm', room === 'cathedral' && !night ? 0.45 : 0);
    A.bed('inside_night_storm', room === 'cathedral' && night ? 0.45 : 0);
    A.bed('cave', room === 'catacombs' ? 0.55 : 0);
    A.bed('cave_storm', room === 'rift' ? 0.6 : 0);
    // The nearest fire's crackle, heard from where it burns (as low as a banked hearth's, src/gfx/homelights.js).
    let best = null, bd = 9;
    for (const L of this.o.flames || []) {
      const dy = L.p[1] - py;
      if (dy < -3 || dy > 6) continue;
      const d = Math.hypot(L.p[0] - px, L.p[2] - pz);
      if (d < bd) { bd = d; best = L; }
    }
    if (best) A.spot('torch', 'torch_loop', best.p[0], best.p[1], best.p[2], 0.55 * (best.dim ?? 1));
    else A.spot('torch', 'torch_loop', px, py, pz, 0);
    // The Woodcutters' Camp, at work by day.
    const cut = SITES.cutters, cd = near(cut.x, cut.z, 90);
    if (cd > 0 && !night && hr > 7 && hr < 18 && Math.random() < 0.35) {
      A.play('chop', cut.x + (Math.random() - 0.5) * 30, py + 1, cut.z + (Math.random() - 0.5) * 30, 1.6);
    }
  }

  save() { return { awake: [...this.awake] }; }

  load(d) {
    this.awake = new Set(['bellmourn', ...(d?.awake || [])]);
    this.showPortals();
  }
}
