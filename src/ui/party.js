// Your party, of the Free Company: the quartermasters' panel (hire up to four, let them go), the frames down the left with
// each one's life, and the Hollowfang Warrens' calls, the boss's bar and the word at the portal (src/sim/dungeon.js).
//
// Who can be hired is whoever of the other Tessariels isn't hired already (src/core/heroes.js makeCast): the quartermaster
// gives each a name of the Company's and a level near yours, and the sim takes the body into your party (HeroWorld.hire).
// Lancers take the blows, paladins heal, everyone else does the damage (roleOf in src/core/dungeon.js).
import { CLASSES } from '../core/heroes.js';
import { BOSSES, DELVE, DELVES, PARTY, WARNINGS, roleOf } from '../core/dungeon.js';
import { C, CHARS_START, C_HERO, C_SIZE } from '../core/layout.js';
import { priceText } from '../folk/shops.js';
import { CLOSE_X } from './menu-x.js';

const ROLE = { tank: ['Tank', '#7fb6ff', '⛨'], heal: ['Healer', '#8fe0a0', '✚'], dps: ['Damage', '#ff9a7a', '⚔'] };
const OFFERS = 6;
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
// What a sword-arm costs, in copper, for as long as you keep them: by their level.
export const hirePrice = (level) => (6 + level * 2) * 10;

export class PartyUI {
  // o: { base, cast, sim (the worker), pack, level () => the player's level, firstHero () => the first hero's char index,
  //      tip (text, secs), opened, closed, click, heroTalk }
  constructor(o) {
    Object.assign(this, o);
    this.members = [];         // { slot, name, level, off, cls }
    this.open = null;          // the quartermaster whose panel is up
    this.offers = null; this.offersFor = -1;
    this.boss = null;          // { key, ids, name }
    this.warrens = null;       // the sim's last word on the fight (auto-play reads it too)
    this.names = null;
    fetch(`${this.base}assets/game/heroes/names.json`).then((r) => r.json()).then((n) => { this.names = n; }).catch(() => {});
    this.buildDom();
    window.addEventListener('keydown', (e) => this.key(e));
  }

  buildDom() {
    const css = document.createElement('style');
    css.textContent = `
      #partyFrames { position: fixed; left: 14px; top: 34%; z-index: 5; display: flex; flex-direction: column; gap: 5px; pointer-events: none; font-family: Georgia, serif; }
      #partyFrames .pf { width: 184px; padding: 4px 7px 5px; background: rgba(8,6,4,.62); border: 1px solid rgba(140,115,68,.5); border-radius: 4px; }
      #partyFrames .pf .nm { display: flex; gap: 6px; align-items: baseline; font-size: 12.5px; color: #e9dfc8; white-space: nowrap; overflow: hidden; }
      #partyFrames .pf .nm em { font-style: normal; font-size: 11px; opacity: .75; margin-left: auto; }
      #partyFrames .pf .bar { height: 7px; margin-top: 3px; background: rgba(0,0,0,.6); border-radius: 2px; overflow: hidden; }
      #partyFrames .pf .bar i { display: block; height: 100%; background: linear-gradient(#5fc46a, #2f8a3a); transition: width .15s; }
      #partyFrames .pf.low .bar i { background: linear-gradient(#e4a33a, #b4661c); }
      #partyFrames .pf.dead { opacity: .5; } #partyFrames .pf.dead .bar i { width: 0 !important; }
      body.touch #partyFrames { top: 24%; transform: scale(.82); transform-origin: 0 0; }
      #bossFrame { position: fixed; left: 50%; top: 52px; transform: translateX(-50%); z-index: 6; width: min(560px, 82vw); display: none; pointer-events: none; font-family: Cinzel, Georgia, serif; text-align: center; }
      #bossFrame .bn { font-size: 17px; color: #f1d68a; letter-spacing: .08em; text-shadow: 0 0 4px #000, 0 1px 2px #000; }
      #bossFrame .bb { height: 12px; margin-top: 4px; background: rgba(0,0,0,.7); border: 1px solid rgba(140,115,68,.7); border-radius: 2px; overflow: hidden; }
      #bossFrame .bb i { display: block; height: 100%; background: linear-gradient(#d0402c, #7c1a10); transition: width .2s; }
      #raidWarn { position: fixed; left: 50%; top: 22%; transform: translateX(-50%); z-index: 7; width: min(760px, 92vw); text-align: center; pointer-events: none;
        font: 700 22px/1.3 Georgia, serif; color: #ffcf6a; text-shadow: 0 0 6px #000, 0 2px 3px #000, 0 0 14px rgba(120,30,0,.8); }
      #raidWarn div { animation: rwIn .25s ease-out; transition: opacity .6s; margin-bottom: 6px; }
      @keyframes rwIn { from { opacity: 0; transform: scale(1.15); } to { opacity: 1; transform: none; } }
      body.touch #raidWarn { font-size: 16px; top: 16%; }
      #hirePanel { position: fixed; z-index: 12; left: 50%; bottom: max(3vh, 14px); transform: translateX(-50%); width: min(720px, 95vw); max-height: 78vh; overflow-y: auto; padding: 13px 18px 12px; display: none; flex-direction: column;
        background: rgba(11,9,7,.96); border: 1px solid var(--gold-dim, #8c7344); box-shadow: 0 10px 34px #000b; color: var(--bone, #e9dfc8); font-family: Georgia, serif; }
      #hirePanel .tk-head { display: flex; align-items: baseline; gap: 10px; border-bottom: 1px solid rgba(140,115,68,.42); padding-bottom: 6px; margin-bottom: 8px; }
      #hirePanel .tk-name { font: 700 18px Cinzel, Georgia, serif; color: #bfe0ff; letter-spacing: .05em; }
      #hirePanel .tk-title { font-size: 13px; opacity: .62; font-style: italic; }
      #hirePanel .tk-purse { margin-left: auto; font-size: 13px; color: #f1d68a; }
      #hirePanel .tk-head .menu-x { align-self: center; margin: -6px -10px 0 4px; }
      #hirePanel .line { font-size: 15.5px; line-height: 1.45; margin-bottom: 8px; }
      #hirePanel h4 { margin: 8px 0 4px; font: 600 13px Georgia, serif; color: #c9a35c; letter-spacing: .08em; text-transform: uppercase; }
      #hirePanel ol { list-style: none; margin: 0; padding: 0; }
      #hirePanel li { display: flex; gap: 9px; align-items: baseline; padding: 4px 8px; cursor: pointer; font-size: 15px; color: #d6c8a5; border-radius: 3px; }
      #hirePanel li:hover { background: rgba(201,163,92,.15); color: #fff4da; }
      #hirePanel li.dim { opacity: .42; cursor: default; }
      #hirePanel li kbd { flex: none; min-width: 1.5em; text-align: center; font: 12px Georgia, serif; color: var(--gold-dim, #8c7344); border: 1px solid rgba(140,115,68,.5); border-radius: 3px; padding: 0 3px; }
      #hirePanel li .rl { flex: none; width: 1.3em; text-align: center; }
      #hirePanel li .pr { margin-left: auto; color: #f1d68a; font-size: 13px; }
    `;
    document.head.appendChild(css);
    this.frames = document.createElement('div'); this.frames.id = 'partyFrames';
    this.bossEl = document.createElement('div'); this.bossEl.id = 'bossFrame';
    this.warnEl = document.createElement('div'); this.warnEl.id = 'raidWarn';
    this.panel = document.createElement('div'); this.panel.id = 'hirePanel';
    document.body.append(this.frames, this.bossEl, this.warnEl, this.panel);
    this.frameEls = [];
  }

  // ---- the party ---------------------------------------------------------------------------------------------------------

  isBroker(p) { return !!p?.broker; }
  member(slot) { return this.members.find((m) => m.slot === slot) || null; }
  roles() { const r = { tank: 0, heal: 0, dps: 0 }; for (const m of this.members) r[roleOf(m.cls)]++; return r; }
  full() { return this.members.length >= PARTY.size; }
  // Fit for the Warrens: four, with a tank and a healer among them.
  fit() { const r = this.roles(); return this.full() && r.tank >= 1 && r.heal >= 1; }

  // A name of the Company's for someone new: not one already about.
  freshName(sex) {
    const pool = (sex === 'f' ? this.names?.female : this.names?.male) || ['Bren', 'Talla', 'Osric', 'Mira', 'Corvin', 'Elsa', 'Dain', 'Hesk'];
    const used = new Set(this.cast.map((c) => c.name));
    for (let t = 0; t < 30; t++) { const n = pool[Math.floor(Math.random() * pool.length)]; if (!used.has(n)) return n; }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Who the quartermaster has on his books today: everyone free, the first of each role first, a level about yours each.
  makeOffers() {
    const L = this.level();
    const free = this.cast.filter((c) => !c.broker && !this.member(c.slot));
    const by = { tank: [], heal: [], dps: [] };
    for (const c of free.sort(() => Math.random() - 0.5)) by[roleOf(c.cls)].push(c);
    const pickN = [...by.tank.slice(0, 2), ...by.heal.slice(0, 2), ...by.dps.slice(0, 4)].slice(0, OFFERS + 2);
    this.offers = pickN.map((c) => {
      const off = Math.floor(Math.random() * 4) - 2;
      const level = Math.max(1, L + off);
      return { slot: c.slot, cls: c.cls, sex: c.sex, name: this.freshName(c.sex), level, off, price: hirePrice(level) };
    });
    this.offersAt = performance.now();
  }

  hire(o, free = false) {
    if (this.full()) { this.tip('Your party is full: four is as many as the Company will send with you.', 3); return false; }
    if (this.member(o.slot)) return false;
    // (Nobody's paid in the Test Dungeon: src/ui/testhall.js.)
    if (!free && !this.freeHire?.() && !this.pack.pay(o.price)) { this.tip(`You can't pay ${priceText(o.price)}.`, 2.5); return false; }
    const c = this.cast[o.slot];
    c.name = o.name; c.full = o.name; c.guild = 'The Free Company'; c.level = o.level;
    this.members.push({ slot: o.slot, name: o.name, level: o.level, off: o.off ?? 0, cls: c.cls });
    this.sim.postMessage({ type: 'hire', slot: o.slot, name: o.name, level: o.level, stay: !!o.stay });
    this.heroTalk?.renamed?.(o.slot);
    if (this.offers) this.offers = this.offers.filter((x) => x.slot !== o.slot);
    this.changed();
    return true;
  }

  dismiss(slot) {
    const i = this.members.findIndex((m) => m.slot === slot);
    if (i < 0) return;
    this.members.splice(i, 1);
    this.sim.postMessage({ type: 'dismiss', slot });
    this.changed();
  }

  // A new level of yours: theirs go with it.
  levelled() {
    const L = this.level();
    for (const m of this.members) {
      m.level = Math.max(1, L + m.off);
      this.cast[m.slot].level = m.level;
      this.sim.postMessage({ type: 'hireLevel', slot: m.slot, level: m.level });
    }
  }

  changed() { this.buildFrames(); if (this.open) this.showPanel(); this.onChange?.(); }

  // ---- the quartermaster's panel ---------------------------------------------------------------------------------------

  talkTo(h) {
    this.open = h;
    if (!this.offers || performance.now() - (this.offersAt || 0) > 240000) this.makeOffers();
    this.opened?.();
    this.panel.style.display = 'flex';
    this.showPanel();
  }

  close() {
    if (!this.open) return;
    this.open = null;
    this.panel.style.display = 'none';
    this.closed?.();
  }

  showPanel(line) {
    const h = this.open;
    if (!h) return;
    const r = this.roles();
    const want = [!r.tank && 'a lancer to take the blows', !r.heal && 'a paladin to keep you standing', 'blades to do the work'].filter(Boolean);
    const need = this.fit() ? 'That is a party fit for the Hollowfang Warrens.'
      : `For the Warrens you'll want four at your back: ${want.length > 1 ? `${want.slice(0, -1).join(', ')} and ${want.at(-1)}` : want[0]}.`;
    const gratis = !!this.freeHire?.();
    const say = line || (gratis ? `In this hall the Company sends whoever you ask for, and asks nothing for them. ${need}` : h.p.broker === 'portal'
      ? `The Warrens won't let one through alone, nor two. Four at your back, or the kobolds have you before the first bend. ${need}`
      : `The Free Company, at your service. Swords for hire: paid once, up front, and they're yours till you let them go. ${need}`);
    this.opts = [];
    const li = (o) => { this.opts.push(o); return o; };
    let html = `<div class="tk-head"><span class="tk-name">${esc(h.p.name)}</span><span class="tk-title">${esc(h.p.title || 'Quartermaster')}</span><span class="tk-purse">${this.pack.purse() ? priceText(this.pack.purse()) : 'No coin'}</span>${CLOSE_X}</div>
      <div class="line">${esc(say)}</div>`;
    const row = (o, k) => `<li class="${o.dim ? 'dim' : ''}" data-k="${k}"><kbd>${k + 1}</kbd><span class="rl" style="color:${ROLE[o.role][1]}">${ROLE[o.role][2]}</span><span>${esc(o.label)}</span>${o.price ? `<span class="pr">${gratis ? 'Free' : priceText(o.price)}</span>` : ''}</li>`;
    if (this.members.length) {
      html += `<h4>Your party (${this.members.length} of ${PARTY.size})</h4><ol>`;
      for (const m of this.members) {
        const o = li({ role: roleOf(m.cls), label: `Let ${m.name} go: level ${m.level} ${CLASSES[m.cls].title}`, run: () => { this.dismiss(m.slot); this.showPanel(`${m.name} salutes and goes back on the Company's books.`); } });
        html += row(o, this.opts.length - 1);
      }
      html += '</ol>';
    }
    html += `<h4>On the Company's books</h4><ol>`;
    for (const of of this.offers || []) {
      const role = roleOf(of.cls);
      const o = li({ role, price: of.price, dim: this.full(), label: `${of.name}, level ${of.level} ${CLASSES[of.cls].title} (${ROLE[role][0].toLowerCase()})`,
        run: () => { if (this.hire(of)) this.showPanel(`${of.name} it is. They'll keep at your back.`); } });
      html += row(o, this.opts.length - 1);
    }
    if (!this.offers?.length) html += '<li class="dim">Nobody free just now.</li>';
    html += '</ol>';
    this.panel.innerHTML = html;
    this.panel.querySelector('.menu-x').onclick = () => this.close();
    for (const el of this.panel.querySelectorAll('li[data-k]')) el.onclick = () => this.choose(+el.dataset.k);
  }

  choose(k) { const o = this.opts?.[k]; if (!o || o.dim) return; this.click?.(); o.run(); }

  key(e) {
    if (!this.open || e.repeat) return;
    const n = e.code.startsWith('Digit') ? +e.code.slice(5) : e.code.startsWith('Numpad') ? +e.code.slice(6) : NaN;
    if (!Number.isNaN(n) && n > 0) { e.preventDefault(); e.stopPropagation(); this.choose(n - 1); return; }
    if (e.code === 'Escape' || e.code === 'KeyE' || e.code === 'Tab') { e.preventDefault(); e.stopPropagation(); this.close(); }
  }

  // ---- the frames --------------------------------------------------------------------------------------------------------

  buildFrames() {
    this.frames.innerHTML = '';
    this.frameEls = this.members.map((m) => {
      const el = document.createElement('div'); el.className = 'pf';
      const [rn, col, mark] = ROLE[roleOf(m.cls)];
      el.innerHTML = `<div class="nm"><span style="color:${col}">${mark}</span><span>${esc(m.name)}</span><em>${m.level} ${esc(CLASSES[m.cls].title)}</em></div><div class="bar"><i></i></div>`;
      el.title = rn;
      this.frames.appendChild(el);
      return { el, bar: el.querySelector('i'), m, w: -1, cls: '' };
    });
  }

  // Each frame: life bars, the boss's bar, the calls fading.
  update(dt, snap) {
    if (!snap) return;
    const first = this.firstHero();
    for (const f of this.frameEls) {
      const o = CHARS_START + (first + f.m.slot) * C_SIZE + C_HERO;
      const hp = Math.max(0, Math.min(1, snap[o + 5] || 0)), dead = snap[o + 9] > 0.5;
      const w = Math.round(hp * 100);
      if (w !== f.w) { f.w = w; f.bar.style.width = `${w}%`; }
      const cls = `pf${dead ? ' dead' : hp < 0.35 ? ' low' : ''}`;
      if (cls !== f.cls) { f.cls = cls; f.el.className = cls; }
    }
    if (this.boss) {
      const bars = this.boss.ids.map((id) => { const co = CHARS_START + id * C_SIZE; return snap[co + C.ACTIVE] > 0.5 ? Math.max(0, snap[co + C.HP] / (snap[co + C.MAX_HP] || 1)) : 0; });
      for (let i = 0; i < bars.length; i++) {
        const w = Math.round(bars[i] * 1000) / 10;
        if (this.boss.bars[i] && this.boss.w[i] !== w) { this.boss.w[i] = w; this.boss.bars[i].style.width = `${w}%`; }
      }
    }
    if (this.open && this.open.dist > 6) this.close();
  }

  // ---- the Warrens' word -------------------------------------------------------------------------------------------------

  warn(text, secs = 5) {
    const d = document.createElement('div');
    d.textContent = text;
    this.warnEl.appendChild(d);
    while (this.warnEl.children.length > 3) this.warnEl.firstChild.remove();
    setTimeout(() => { d.style.opacity = 0; setTimeout(() => d.remove(), 700); }, secs * 1000);
    this.warned?.(text);
  }

  showBoss(i, ids) {
    const b = BOSSES[i];
    if (!b) return;
    this.boss = { key: b.key, ids: ids.filter((x) => x >= 0), w: [], bars: [] };
    this.bossEl.innerHTML = `<div class="bn">${esc(b.name)}</div>` + this.boss.ids.map(() => '<div class="bb"><i></i></div>').join('');
    this.boss.bars = [...this.bossEl.querySelectorAll('.bb i')];
    this.bossEl.style.display = 'block';
  }

  hideBoss() { this.boss = null; this.bossEl.style.display = 'none'; }

  // EV.DELVE from the sim.
  onDelve(code, a, b, c) {
    // (Which delve, for its coming in, going out, clearing and wipe: the sim says. src/sim/dungeon.js)
    const d = DELVES[b | 0] || DELVES[0];
    switch (code | 0) {
      case DELVE.NEED: {
        const lack = [];
        if (a < PARTY.size) lack.push(`${PARTY.size - a} more in your party`);
        if (!b) lack.push('a lancer to take the blows');
        if (!c) lack.push('a paladin to heal');
        this.tip(`The portal won't open for so few. You need ${lack.join(', ')}. Captain Merrow Vale, beside it, hires them out.`, 6);
        break;
      }
      case DELVE.ENTER: this.warn(a ? `${d.name}. Your dead foes are as you left them.` : d.words.enter, 6); break;
      case DELVE.LEAVE: this.hideBoss(); break;
      case DELVE.CLEAR: this.hideBoss(); this.warn(d.words.clear, 7); this.cleared?.(d); break;
      case DELVE.WARN: this.warn(WARNINGS[a | 0] || '', 5); break;
      case DELVE.BOSS: this.showBoss(a | 0, [b | 0, c | 0]); this.warn(`${BOSSES[a | 0]?.name || ''}!`, 3); break;
      case DELVE.BOSS_DOWN: this.hideBoss(); this.warn(`${BOSSES[a | 0]?.name || 'The boss'} is dead!`, 5); this.bossDown?.(BOSSES[a | 0]?.key); break;
      case DELVE.WIPE: this.wipes = (this.wipes || 0) + 1; this.hideBoss(); this.warn(d.words.wipe, 5); break;
      default: break;
    }
  }

  // The sim's word on the fight, a few times a second (src/sim/dungeon.js post).
  onWarrens(m) {
    this.warrens = { ...m, at: performance.now() };
    if (!m.fight && this.boss) this.hideBoss();
  }

  // ---- kept in the save ----------------------------------------------------------------------------------------------

  save() { return { members: this.members.map((m) => ({ body: this.cast[m.slot].body, cls: m.cls, name: m.name, level: m.level, off: m.off })) }; }

  load(d) {
    for (const m of this.members.slice()) this.dismiss(m.slot);
    this.offers = null;
    for (const s of d?.members || []) {
      // (The same body if it's about this time, else another of its class.)
      const c = this.cast.find((x) => !x.broker && x.body === s.body && !this.member(x.slot)) || this.cast.find((x) => !x.broker && x.cls === s.cls && !this.member(x.slot));
      if (c) this.hire({ slot: c.slot, name: s.name, level: s.level, off: s.off ?? 0 }, true);
    }
  }
}
