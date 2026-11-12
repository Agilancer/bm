// The Test Dungeon on the page (src/core/testhall.js says where everything is, src/sim/testhall.js runs it): its three
// counters and what each one's panel does, and the line at the top of the screen that says how the fight stands.
//
//   - The Hall Stores (Captain Merrow Vale): any staff, skull, shield, robe or gem in the game, at any rarity, for nothing;
//     and your level, set to whatever you like, with your life and mana filled.
//   - The Free Company (Aldous Fenn): the quartermaster's own books (src/ui/party.js), and nobody asks to be paid.
//   - The Summoning (Ysolde Marr): every monster in the game (src/core/testhall-foes.js), how many of each, and a Summon that
//     stands them past the door and raises it. Once they're all down, and you're back this side of it, it comes down again.
//
// Nothing in here is kept: a save isn't made while the Test Dungeon's on, and the game you were playing is where you left it.
import { DOOR, HALL, STATIONS, STATION_REACH, hallAt, setHallDoor } from '../core/testhall.js';
import { FAMILIES, hallFoes } from '../core/testhall-foes.js';
import { TRIPO_BASE, withVariants } from '../core/tripo-monsters.js';
import { BASES, GEMS, GEM_GRADES, RARITIES, ROBES, ROBE_PALETTES, ROBE_SETS, SET_PARTS, SHIELDS, SKULLS, makeRng, nameOf, rollGem, rollRobe, rollShield, rollSkull, rollWeapon } from '../items/items.js';
import { CLOSE_X } from './menu-x.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TABS = [['staff', 'Staffs'], ['skull', 'Skulls'], ['shield', 'Shields'], ['robe', 'Robes'], ['set', 'Gear sets'], ['gem', 'Gems'], ['you', 'Yourself']];
const LEVELS = [1, 5, 10, 15, 20, 30, 40, 50];
// (No V's and no T's in the stores: those shields are the knights' own, and never anyone else's. See CLAUDE.md.)
const STAFFS = Object.keys(BASES).filter((b) => BASES[b].grade === 'common' || BASES[b].grade === 'staff').sort((a, b) => (BASES[a].tier ?? 0) - (BASES[b].tier ?? 0) || BASES[a].name.localeCompare(BASES[b].name));
const PLAIN_SHIELDS = Object.keys(SHIELDS).filter((b) => !SHIELDS[b].side).sort((a, b) => SHIELDS[a].rarity - SHIELDS[b].rarity || SHIELDS[a].name.localeCompare(SHIELDS[b].name));
const STATE_LINE = {
  shut: (m) => (m.summoned ? 'The door is down.' : 'The door is down. Ysolde Marr, by the door, summons whatever you would fight.'),
  muster: () => 'The summoned are taking their places past the door…',
  opening: () => 'The door is rising!',
  open: (m) => `${m.alive} left past the door${m.label ? `: ${m.label}` : ''}.`,
  clear: () => 'All down. Come back through the door and it shuts behind you.',
  closing: () => 'The door comes down. Summon again when it is shut.',
};

export class HallUI {
  // o: { base, sim (the worker), pack, renderer, audio, party () => PartyUI, heroTalk () => HeroTalk, arm, give (item),
  //      fill (), tip (text, secs), opened, closed, click, inventory () }
  constructor(o) {
    Object.assign(this, o);
    this.on = false;
    this.open = null;              // the station whose panel is up
    this.tab = 'staff'; this.rarity = 2;
    this.foes = null; this.pick = null; this.wave = []; this.search = '';
    this.hall = null;              // the sim's last word
    this.rng = makeRng((Math.random() * 4294967296) >>> 0);
    this.ids = 0;
    this.buildDom();
    window.addEventListener('keydown', (e) => this.key(e));
  }

  buildDom() {
    const css = document.createElement('style');
    css.textContent = `
      #hallStatus { position: fixed; left: 50%; top: calc(80px + env(safe-area-inset-top)); transform: translateX(-50%); z-index: 5; display: none; pointer-events: none; max-width: min(760px, 90vw);
        padding: 4px 14px 5px; background: rgba(12,14,18,.55); border: 1px solid rgba(220,225,235,.35); border-radius: 4px; font: 14px Georgia, serif; color: #eef1f6; text-align: center; text-shadow: 0 1px 2px #000; }
      #hallStatus b { font: 700 12px Cinzel, Georgia, serif; letter-spacing: .12em; color: #fff; margin-right: 8px; }
      #hallPanel { position: fixed; z-index: 12; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(980px, 96vw); max-height: 88vh; display: none; flex-direction: column;
        background: rgba(11,9,7,.97); border: 1px solid var(--gold-dim, #8c7344); box-shadow: 0 10px 34px #000b; color: var(--bone, #e9dfc8); font-family: Georgia, serif; padding: 13px 18px 12px; }
      #hallPanel .tk-head { display: flex; align-items: baseline; gap: 10px; border-bottom: 1px solid rgba(140,115,68,.42); padding-bottom: 6px; margin-bottom: 8px; }
      #hallPanel .tk-name { font: 700 18px Cinzel, Georgia, serif; color: #bfe0ff; letter-spacing: .05em; }
      #hallPanel .tk-title { font-size: 13px; opacity: .62; font-style: italic; }
      #hallPanel .tk-head .menu-x { margin-left: auto; align-self: center; margin-top: -6px; margin-right: -10px; }
      #hallPanel .line { font-size: 15px; line-height: 1.45; margin-bottom: 8px; }
      #hallPanel .row { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; align-items: center; }
      #hallPanel button.hb { font: 14px Georgia, serif; color: #e9dfc8; background: rgba(201,163,92,.08); border: 1px solid rgba(140,115,68,.5); border-radius: 3px; padding: 3px 9px; cursor: pointer; }
      #hallPanel button.hb:hover { background: rgba(201,163,92,.2); color: #fff4da; }
      #hallPanel button.hb.on { background: rgba(201,163,92,.32); border-color: #c9a35c; color: #fff; }
      #hallPanel button.hb:disabled { opacity: .4; cursor: default; }
      #hallPanel button.big { font: 700 16px Cinzel, Georgia, serif; letter-spacing: .08em; padding: 6px 22px; color: #fff; background: rgba(150,40,30,.55); border-color: #d0694f; }
      #hallPanel button.big:hover { background: rgba(190,60,40,.75); }
      #hallPanel .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 4px; overflow-y: auto; max-height: 52vh; padding-right: 4px; }
      #hallPanel .grid button { text-align: left; }
      #hallPanel h4 { margin: 8px 0 4px; font: 600 12.5px Georgia, serif; color: #c9a35c; letter-spacing: .08em; text-transform: uppercase; }
      #hallPanel .cols { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: 16px; min-height: 0; }
      #hallPanel .book { overflow-y: auto; max-height: 62vh; padding-right: 6px; border-right: 1px solid rgba(140,115,68,.25); }
      #hallPanel .book li { list-style: none; display: flex; gap: 8px; align-items: baseline; padding: 2px 8px; cursor: pointer; font-size: 14.5px; color: #d6c8a5; border-radius: 3px; }
      #hallPanel .book li:hover { background: rgba(201,163,92,.14); color: #fff4da; }
      #hallPanel .book li.on { background: rgba(201,163,92,.3); color: #fff; }
      #hallPanel .book li em { font-style: normal; font-size: 12px; opacity: .55; margin-left: auto; white-space: nowrap; }
      #hallPanel .book ol { margin: 0 0 6px; padding: 0; }
      #hallPanel .side { display: flex; flex-direction: column; gap: 6px; min-height: 0; }
      #hallPanel .pickName { font: 700 16px Cinzel, Georgia, serif; color: #f1d68a; }
      #hallPanel .note { font-size: 13.5px; opacity: .75; font-style: italic; }
      #hallPanel input[type=number], #hallPanel input[type=search], #hallPanel select { font: 14px Georgia, serif; background: #1a1611; color: #f3ead6; border: 1px solid rgba(140,115,68,.6); border-radius: 3px; padding: 3px 6px; }
      #hallPanel input[type=number] { width: 4.2em; text-align: center; }
      #hallPanel input[type=search] { width: 100%; box-sizing: border-box; margin-bottom: 6px; }
      #hallPanel .wave { list-style: none; margin: 0; padding: 0; overflow-y: auto; max-height: 26vh; }
      #hallPanel .wave li { display: flex; gap: 8px; align-items: baseline; padding: 2px 4px; font-size: 14.5px; }
      #hallPanel .wave li button { margin-left: auto; padding: 0 7px; }
      #hallPanel .dim { opacity: .55; }
    `;
    document.head.appendChild(css);
    this.status = document.createElement('div'); this.status.id = 'hallStatus';
    this.panel = document.createElement('div'); this.panel.id = 'hallPanel';
    document.body.append(this.status, this.panel);
  }

  // ---- on and off -------------------------------------------------------------------------------------------------------

  setOn(on) {
    this.on = on;
    if (!on) { this.close(); this.hall = null; this.wave = []; }
    this.status.style.display = on ? 'block' : 'none';
    if (on) this.showStatus({ state: 'shut', alive: 0, summoned: 0 });
    if (this.renderer) { this.renderer.hallDoorWant = 0; this.renderer.hallDoorSync = 0; }
  }

  // The sim's word on the hall, a few times a second.
  onHall(m) {
    const was = this.hall;
    this.hall = m;
    if (!this.on) return;
    if (this.renderer) { this.renderer.hallDoorWant = m.want; this.renderer.hallDoorSync = m.k; }
    // (The way under it, as the sim has it, for auto-play's paths on this thread: src/ui/autobrain.js.)
    setHallDoor(m.want > 0 && m.k >= 0.55);
    // The door's grind, as it starts up or down.
    if (was && was.want !== m.want) this.audio?.play('portcullis', HALL.x, HALL.y + 3, HALL.z + (DOOR.z0 + DOOR.z1) / 2, 1, 1, true);
    if (was?.state !== m.state && m.state === 'clear') this.tip?.('The arena is clear.', 3);
    this.showStatus(m);
    if (this.open === 'foes') this.showFoes(true);
  }

  showStatus(m) {
    const line = (STATE_LINE[m.state] || STATE_LINE.shut)(m);
    this.status.innerHTML = `<b>TEST DUNGEON</b>${esc(line)}`;
  }

  onSummoned(m) {
    this.lastReply = m;
    if (m.n) this.tip?.(m.note || `${m.n} summoned. The door rises on them.`, 4);
    else this.tip?.(m.note || 'Nothing came.', 4);
  }

  // ---- the counters -----------------------------------------------------------------------------------------------------

  // The counter you're at and facing, if any: { key, label }.
  nearest(px, py, pz, yaw) {
    if (!this.on || this.open) return null;
    if (Math.abs(py - HALL.y) > 2) return null;
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    let best = null, bs = Infinity;
    for (const s of STATIONS) {
      const [ax, az] = hallAt(s.at[0], s.at[1]), [nx, nz] = hallAt(s.x, s.z);
      const d = Math.hypot(ax - px, az - pz);
      if (d > STATION_REACH) continue;
      const dx = nx - px, dz = nz - pz, L = Math.hypot(dx, dz) || 1;
      if ((dx * fx + dz * fz) / L < 0.2) continue;
      if (d < bs) { bs = d; best = s; }
    }
    if (!best) return null;
    const who = this.person(best.who);
    return { key: best.key, label: who ? `Talk to ${who.p.name}` : best.name, busy: false };
  }

  // The hero standing at a counter (a quartermaster's body: src/core/heroes.js BROKERS), or null.
  person(who) { return this.heroTalk?.()?.heroes?.find((h) => h.p.broker === who) || null; }

  talk(key) {
    if (!this.on) return;
    if (key === 'party') {
      const P = this.party?.();
      if (!P) { this.openPanel('party'); this.panel.innerHTML = this.head('party', 'The Free Company', 'Nobody to hire') + '<div class="line">The other Tessariels are off in Settings, so there is nobody on the Company\'s books. Turn them on (Settings, Other Tessariels) to hire a party.</div>'; this.wireClose(); return; }
      const h = this.person('town') || { p: { name: 'The Free Company', title: 'Swords for the asking', broker: 'hall' } };
      P.talkTo(h);
      return;
    }
    this.openPanel(key);
    if (key === 'gear') this.showGear();
    if (key === 'foes') this.showFoes();
  }

  openPanel(key) {
    if (!this.open) this.opened?.();
    this.open = key;
    this.panel.style.display = 'flex';
  }

  close() {
    if (!this.open) return;
    this.open = null;
    this.panel.style.display = 'none';
    this.closed?.();
  }

  head(key, title, sub) {
    const s = STATIONS.find((q) => q.key === key), who = s && this.person(s.who);
    return `<div class="tk-head"><span class="tk-name">${esc(who ? who.p.name : title)}</span><span class="tk-title">${esc(who ? title : sub)}</span>${CLOSE_X}</div>`;
  }

  wireClose() { this.panel.querySelector('.menu-x').onclick = () => this.close(); }

  key(e) {
    if (!this.open || e.repeat) return;
    if (e.target?.tagName === 'INPUT' && e.code !== 'Escape' && e.code !== 'Enter') { e.stopPropagation(); return; }
    if (e.code === 'Escape' || e.code === 'KeyE' || e.code === 'Tab') { e.preventDefault(); e.stopPropagation(); this.close(); }
  }

  // ---- the stores -------------------------------------------------------------------------------------------------------

  showGear() {
    const P = this.pack;
    let html = this.head('gear', 'The Hall Stores', 'Anything, for nothing');
    html += `<div class="line">Take whatever you like: there's no charge in here. It goes in your pack, or at your feet if the pack is full.</div>`;
    html += `<div class="row">${TABS.map(([k, n]) => `<button class="hb ${this.tab === k ? 'on' : ''}" data-tab="${k}">${n}</button>`).join('')}</div>`;
    if (this.tab !== 'you' && this.tab !== 'shield' && this.tab !== 'gem') {
      const top = this.tab === 'skull' || this.tab === 'set' || this.tab === 'robe' ? 5 : 4;
      html += `<div class="row"><span class="dim">Rarity:</span>${RARITIES.slice(0, top + 1).map((r, i) => `<button class="hb ${this.rarity === i ? 'on' : ''}" data-r="${i}" style="color:${r.color}">${r.name}</button>`).join('')}</div>`;
    }
    const color = (i) => RARITIES[Math.min(i, RARITIES.length - 1)].color;
    const item = (id, name, r) => `<button class="hb" data-item="${esc(id)}" style="color:${color(r)}">${esc(name)}</button>`;
    if (this.tab === 'staff') html += `<div class="grid">${STAFFS.map((b) => item(b, BASES[b].name, Math.max(this.rarity, 0))).join('')}</div>`;
    if (this.tab === 'skull') html += `<div class="grid">${Object.keys(SKULLS).map((b) => item(b, SKULLS[b].name, this.rarity)).join('')}</div>`;
    if (this.tab === 'shield') html += `<div class="line dim">A shield comes as rare as its own make.</div><div class="grid">${PLAIN_SHIELDS.map((b) => item(b, SHIELDS[b].name, SHIELDS[b].rarity)).join('')}</div>`;
    if (this.tab === 'robe') html += `<div class="grid">${Object.keys(ROBES).map((b) => item(b, ROBES[b].name, Math.max(this.rarity, ROBE_PALETTES[ROBES[b].palette].floor))).join('')}</div>`;
    if (this.tab === 'robe') html = html.replace('<div class="grid">', '<div class="line dim">One piece, of a set of its colour that comes this rare.</div><div class="grid">');
    if (this.tab === 'set') html += `<div class="line dim">All five pieces of a set.</div><div class="grid">${Object.keys(ROBE_SETS).filter((id) => ROBE_SETS[id].rarity === this.rarity).map((id) => item(id, ROBE_SETS[id].name, this.rarity)).join('')}</div>`;
    if (this.tab === 'gem') html += `<div class="grid">${Object.keys(GEMS).flatMap((k) => GEM_GRADES.map((g, i) => `<button class="hb" data-item="${k}:${i}" style="color:${GEMS[k].color}">${esc(`${g.name} ${GEMS[k].name}`)}</button>`)).join('')}</div>`;
    if (this.tab === 'you') {
      html += `<h4>Your level: ${P.level}</h4><div class="row">${LEVELS.map((l) => `<button class="hb ${P.level === l ? 'on' : ''}" data-lv="${l}">${l}</button>`).join('')}<button class="hb" data-lvd="-1">−1</button><button class="hb" data-lvd="1">+1</button></div>`;
      const S = this.skills?.();
      if (S) html += `<h4>Your spells: ${S.points} point${S.points === 1 ? '' : 's'} to spend, ${S.spent} spent (B: your spellbook)</h4><div class="row"><button class="hb" data-act="pts5">5 more points</button><button class="hb" data-act="pts20">20 more points</button><button class="hb" data-act="all">Learn everything: every spell in full, and a branch of each</button><button class="hb" data-act="unlearn">Unlearn everything</button></div>`;
      html += `<h4>Mending</h4><div class="row"><button class="hb" data-act="fill">Fill your life and mana</button></div>`;
      html += `<h4>Your pack</h4><div class="row"><button class="hb" data-act="empty">Empty the pack (what you have on stays on)</button><button class="hb" data-act="gold">10,000 gold</button></div>`;
    }
    this.panel.innerHTML = html;
    this.wireClose();
    for (const b of this.panel.querySelectorAll('[data-tab]')) b.onclick = () => { this.click?.(); this.tab = b.dataset.tab; this.showGear(); };
    for (const b of this.panel.querySelectorAll('[data-r]')) b.onclick = () => { this.click?.(); this.rarity = +b.dataset.r; this.showGear(); };
    for (const b of this.panel.querySelectorAll('[data-item]')) b.onclick = () => this.take(b.dataset.item);
    for (const b of this.panel.querySelectorAll('[data-lv]')) b.onclick = () => this.setLevel(+b.dataset.lv);
    for (const b of this.panel.querySelectorAll('[data-lvd]')) b.onclick = () => this.setLevel(P.level + +b.dataset.lvd);
    for (const b of this.panel.querySelectorAll('[data-act]')) b.onclick = () => {
      const a = b.dataset.act;
      if (a === 'fill') { this.fill?.(); this.tip?.('Mended, and your well is full.', 2); }
      if (a === 'empty') { P.entries.length = 0; this.inventory?.()?.render?.(); this.tip?.('Your pack is empty.', 2); }
      if (a === 'gold') { P.gold += 10000; this.tip?.('10,000 gold.', 2); }
      const S = this.skills?.();
      if (S && a === 'pts5') { S.give(5); this.showGear(); }
      if (S && a === 'pts20') { S.give(20); this.showGear(); }
      if (S && a === 'all') { S.learnAll(); this.tip?.('Every spell is yours, in full. B: your spellbook.', 2.5); this.showGear(); }
      if (S && a === 'unlearn') { S.unlearn(); this.tip?.('Unlearned: every point is back.', 2); this.showGear(); }
    };
  }

  // One of whatever was asked for, rolled at the rarity chosen, into your pack.
  take(id) {
    const r = this.rng, rarity = this.rarity;
    let it = null;
    if (this.tab === 'staff') it = rollWeapon(r, { base: id, rarity: Math.min(4, rarity) });
    else if (this.tab === 'skull') it = rollSkull(r, { base: id, rarity });
    else if (this.tab === 'shield') it = rollShield(r, { base: id });
    else if (this.tab === 'robe') it = rollRobe(r, { base: id, rarity });
    else if (this.tab === 'set') {
      for (const slot of SET_PARTS) this.give?.(rollRobe(r, { set: id, slot }));
      this.tip?.(`${ROBE_SETS[id].name}: all five pieces.`, 1.6);
      return;
    }
    else if (this.tab === 'gem') { const [kind, grade] = id.split(':'); it = rollGem(r, { kind, grade: +grade }); }
    if (!it) return;
    this.give?.(it);
    this.tip?.(`${nameOf(it)}.`, 1.6);
  }

  setLevel(l) {
    const P = this.pack;
    this.level?.(Math.max(1, Math.min(50, l)) - P.level);
    this.fill?.();
    this.showGear();
  }

  // ---- the summoning ----------------------------------------------------------------------------------------------------

  async loadFoes() {
    if (this.foes) return this.foes;
    let roster = {};
    try { roster = withVariants(await fetch(`${this.base}${TRIPO_BASE}roster.json`).then((r) => r.json())); } catch (e) { console.warn('roster', e); }
    let pals = ['Base'];
    try { pals = Object.keys(await fetch(`${this.base}${TRIPO_BASE}palettes.json`).then((r) => r.json())); } catch { /* the base only */ }
    this.pals = pals;
    this.foes = hallFoes(roster);
    return this.foes;
  }

  async showFoes(refresh = false) {
    if (!this.foes) { this.panel.innerHTML = this.head('foes', 'The Summoning', 'Whatever you would fight') + '<div class="line">Opening the book…</div>'; this.wireClose(); await this.loadFoes(); if (this.open !== 'foes') return; }
    // (A refresh from the sim's word only touches the door's line and the button.)
    if (refresh && this.panel.querySelector('.foes-state')) { this.panel.querySelector('.foes-state').textContent = this.doorLine(); this.panel.querySelector('[data-go]').disabled = !this.canSummon(); return; }
    const q = this.search.trim().toLowerCase();
    let html = this.head('foes', 'The Summoning', 'Whatever you would fight');
    html += `<div class="line">Choose what you would fight and how many, add them to the summoning, and summon. They stand past the door; it rises on them, and comes down again once they're all down and you're back this side of it.</div>`;
    html += `<div class="cols"><div class="book"><input type="search" placeholder="Find a monster…" value="${esc(this.search)}">`;
    for (const fam of FAMILIES) {
      const list = this.foes.filter((f) => f.family === fam.key && (!q || f.name.toLowerCase().includes(q) || fam.name.toLowerCase().includes(q)));
      if (!list.length) continue;
      html += `<h4>${esc(fam.name)}</h4><ol>${list.map((f) => `<li class="${this.pick?.id === f.id ? 'on' : ''}" data-id="${esc(f.id)}"><span>${esc(f.name)}</span><em>${f.hp ? `${f.hp} life · ` : ''}up to ${f.most}</em></li>`).join('')}</ol>`;
    }
    html += `</div><div class="side">`;
    const p = this.pick;
    if (p) {
      html += `<div class="pickName">${esc(p.name)}</div>${p.note ? `<div class="note">${esc(p.note)}</div>` : ''}`;
      html += `<div class="row"><span class="dim">How many:</span><button class="hb" data-n="-1">−</button><input type="number" min="1" max="${p.most}" value="${this.count || 1}"><button class="hb" data-n="1">+</button><button class="hb" data-n="5">+5</button>`;
      html += `<span class="dim">(up to ${p.most} at once)</span></div>`;
      if (p.sizes) html += `<div class="row"><span class="dim">Size:</span>${p.sizes.map((s) => `<button class="hb ${(this.size || p.size) === s ? 'on' : ''}" data-size="${s}">${s}</button>`).join('')}</div>`;
      if (p.pal) html += `<div class="row"><span class="dim">Colours:</span><select>${(this.pals || ['Base']).map((n) => `<option ${n === (this.pal || 'Base') ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>`;
      html += `<div class="row"><button class="hb" data-add>Add to the summoning</button></div>`;
    } else html += `<div class="note">Choose a monster from the book.</div>`;
    html += `<h4>The summoning</h4>`;
    html += this.wave.length ? `<ol class="wave">${this.wave.map((w, i) => `<li><span>${w.n} × ${esc(w.name)}${w.opt.size ? ` (${w.opt.size})` : ''}${w.opt.pal && w.opt.pal !== 'Base' ? ` (${esc(w.opt.pal)})` : ''}</span><button class="hb" data-del="${i}" aria-label="Remove">✕</button></li>`).join('')}</ol>` : '<div class="note">Nothing yet.</div>';
    html += `<div class="row"><button class="hb big" data-go ${this.canSummon() ? '' : 'disabled'}>Summon</button><button class="hb" data-clear ${this.wave.length ? '' : 'disabled'}>Clear the list</button></div>`;
    html += `<div class="note foes-state">${esc(this.doorLine())}</div>`;
    html += `</div></div>`;
    this.panel.innerHTML = html;
    this.wireClose();
    // (What's typed in the book's boxes is the box's, not the game's keys.)
    for (const i of this.panel.querySelectorAll('input')) i.onkeydown = (e) => { if (e.code !== 'Escape') e.stopPropagation(); };
    const search = this.panel.querySelector('input[type=search]');
    search.oninput = () => { this.search = search.value; this.showFoes(); const s = this.panel.querySelector('input[type=search]'); s.focus(); s.setSelectionRange(s.value.length, s.value.length); };
    for (const li of this.panel.querySelectorAll('.book li')) li.onclick = () => { this.click?.(); this.pick = this.foes.find((f) => f.id === li.dataset.id); this.count = 1; this.size = null; this.showFoes(); };
    const num = this.panel.querySelector('.side input[type=number]');
    const most = p?.most || 1;
    if (num) num.oninput = () => { this.count = Math.max(1, Math.min(most, num.value | 0)); };
    for (const b of this.panel.querySelectorAll('[data-n]')) b.onclick = () => { this.count = Math.max(1, Math.min(most, (this.count || 1) + +b.dataset.n)); this.showFoes(); };
    for (const b of this.panel.querySelectorAll('[data-size]')) b.onclick = () => { this.size = b.dataset.size; this.showFoes(); };
    const sel = this.panel.querySelector('.side select');
    if (sel) sel.onchange = () => { this.pal = sel.value; };
    const add = this.panel.querySelector('[data-add]');
    if (add) add.onclick = () => {
      const opt = {};
      if (p.sizes) opt.size = this.size || p.size;
      if (p.pal) opt.pal = this.pal || 'Base';
      const same = this.wave.find((w) => w.id === p.id && w.opt.size === opt.size && w.opt.pal === opt.pal);
      if (same) same.n = Math.min(p.most, same.n + (this.count || 1)); else this.wave.push({ id: p.id, name: p.name, n: this.count || 1, opt });
      this.showFoes();
    };
    for (const b of this.panel.querySelectorAll('[data-del]')) b.onclick = () => { this.wave.splice(+b.dataset.del, 1); this.showFoes(); };
    const clear = this.panel.querySelector('[data-clear]');
    if (clear) clear.onclick = () => { this.wave = []; this.showFoes(); };
    this.panel.querySelector('[data-go]').onclick = () => this.summon();
  }

  canSummon() { return this.wave.length > 0 && (!this.hall || this.hall.state === 'shut'); }

  doorLine() {
    const s = this.hall?.state || 'shut';
    return s === 'shut' ? 'The door is down: ready.' : s === 'clear' ? 'The last fight is won: come back through the door, and summon again once it is down.' : 'The door is open on a fight: summon again once it is won and the door is down.';
  }

  summon() {
    if (!this.canSummon()) return;
    this.send(this.wave);
    this.close();
  }

  // A summoning to the sim, each named as the book names it: [{ id, n, opt }] (bm.hall('summon', { list }) comes here too).
  async send(list) {
    await this.loadFoes();
    const named = list.map((w) => ({ id: w.id, n: w.n, opt: w.opt || {}, name: w.name || this.foes.find((f) => f.id === w.id)?.name || w.id }));
    this.sim.postMessage({ type: 'hall', cmd: 'summon', id: ++this.ids, list: named });
  }
}
