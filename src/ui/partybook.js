// The party's book, K: for each of those with you, and each old companion on your roster (src/ui/party.js), their gear,
// their bag and their skill tree. What they wear comes out of their own bag (or one of the party's with you: only what fits
// them, src/items/partygear.js) and goes back into it; party gear is never in your pack. A point goes in a node of their
// tree (src/core/partytree.js) with a click, or they spend their own as they level.
import { CLASSES } from '../core/heroes.js';
import { roleOf } from '../core/dungeon.js';
import { RARITIES } from '../items/items.js';
import { HG_SLOTS, HG_SLOT_NAME, HG_STATS, STAT_LINE, fits, gearStats, hgLines, outfitRamps, score, setsWorn, shapeShows } from '../items/partygear.js';
import { BAG_MAX } from './party.js';
import { NODES, PASSIVE_TEXT, TREES, autoSpend, pointsAt, pointsLeft, rank, respecCost, spend, spentIn, treeMods, why } from '../core/partytree.js';
import { hgIcon } from './hgicons.js';
import { CLOSE_X } from './menu-x.js';
import { priceText } from '../folk/shops.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ROLE = { tank: 'Tank', heal: 'Healer', dps: 'Damage' };

export class PartyBook {
  // o: { party (PartyUI), pack, inventory, base, touch, tip, canOpen, opened, closed, click, gold: { have, pay } }
  constructor(o) {
    Object.assign(this, o);
    this.open = false;
    this.sel = null;       // the roster entry's id shown
    this.pick = null;      // the gear slot whose choices are up
    this.sure = false;     // a respec asked once
    this.buildDom();
    window.addEventListener('keydown', (e) => this.key(e), true);
  }

  buildDom() {
    const css = document.createElement('style');
    css.textContent = `
      #partyBook { position: fixed; z-index: 13; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(1060px, 96vw); max-height: 92vh; overflow-y: auto; display: none; flex-direction: column; gap: 8px; padding: 12px 16px 14px;
        background: rgb(11,9,7); border: 1px solid var(--gold-dim, #8c7344); box-shadow: 0 10px 40px #000c; color: var(--bone, #e9dfc8); font-family: Georgia, serif; }
      #partyBook .pb-head { display: flex; align-items: baseline; gap: 12px; border-bottom: 1px solid rgba(140,115,68,.42); padding-bottom: 6px; }
      #partyBook .pb-title { font: 700 19px Cinzel, Georgia, serif; color: #f1d68a; letter-spacing: .06em; }
      #partyBook .pb-head .menu-x { margin-left: auto; align-self: center; }
      #partyBook .pb-tabs { display: flex; flex-wrap: wrap; gap: 5px; }
      #partyBook .pb-tab { padding: 4px 10px; border: 1px solid rgba(140,115,68,.45); border-radius: 3px; cursor: pointer; font-size: 13.5px; color: #d6c8a5; background: rgba(0,0,0,.25); }
      #partyBook .pb-tab.on { background: rgba(201,163,92,.22); color: #fff4da; border-color: #c9a35c; }
      #partyBook .pb-tab.away { opacity: .72; font-style: italic; }
      #partyBook .pb-tab small { opacity: .7; margin-left: 4px; }
      #partyBook .pb-body { display: grid; grid-template-columns: 330px 1fr; gap: 14px; align-items: start; }
      #partyBook h4 { margin: 2px 0 6px; font: 600 12.5px Georgia, serif; color: #c9a35c; letter-spacing: .08em; text-transform: uppercase; }
      #partyBook .pb-who { font-size: 15px; margin-bottom: 6px; } #partyBook .pb-who b { color: #bfe0ff; font: 700 16px Cinzel, Georgia, serif; }
      #partyBook .pb-gear { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
      #partyBook .pb-slot { display: flex; gap: 7px; align-items: center; min-height: 58px; padding: 4px 6px; border: 1px solid rgba(140,115,68,.35); border-radius: 3px; cursor: pointer; background: rgba(0,0,0,.28); }
      #partyBook .pb-slot:hover, #partyBook .pb-slot.on { background: rgba(201,163,92,.15); border-color: #c9a35c; }
      #partyBook .pb-slot .pic { flex: none; width: 60px; height: 64px; display: flex; align-items: center; justify-content: center; }
      #partyBook .pb-slot .pic .ico { width: 100%; height: 100%; background-size: contain; background-position: center; background-repeat: no-repeat; }
      #partyBook .pb-slot .tx { font-size: 12px; line-height: 1.25; } #partyBook .pb-slot .tx em { display: block; font-style: normal; opacity: .6; font-size: 11px; } #partyBook .pb-slot .tx em .setof { color: #6fd36f; }
      #partyBook .pb-sum { margin: 2px 0 4px; font-size: 12px; line-height: 1.35; color: #cfc2a0; }
      #partyBook .pb-sets { margin: 4px 0 2px; font-size: 13px; opacity: .92; }
      #partyBook .pb-sets .set { color: #6fd36f; font-weight: 600; }
      #partyBook .pb-sets .miss { opacity: .75; } #partyBook .pb-sets .whole { display: block; font-size: 12px; opacity: .7; margin-top: 1px; }
      #partyBook .pb-btns { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
      #partyBook button:not(.menu-x) { font: 13px Georgia, serif; color: #f1e4c4; background: rgba(60,44,22,.85); border: 1px solid #8c7344; border-radius: 3px; padding: 4px 10px; cursor: pointer; }
      #partyBook button:not(.menu-x):hover { background: rgba(110,80,36,.9); } #partyBook button:disabled { opacity: .45; cursor: default; }
      #partyBook .pb-pick { margin-top: 8px; border-top: 1px solid rgba(140,115,68,.35); padding-top: 6px; }
      #partyBook .pb-pick li { list-style: none; display: flex; gap: 8px; align-items: center; padding: 4px 6px; cursor: pointer; border-radius: 3px; font-size: 12.5px; }
      #partyBook .pb-pick li:hover { background: rgba(201,163,92,.15); } #partyBook .pb-pick ol { margin: 0; padding: 0; max-height: 260px; overflow-y: auto; }
      #partyBook .pb-pick .pic { flex: none; width: 34px; height: 38px; } #partyBook .pb-pick .pic .ico { width: 100%; height: 100%; background-size: contain; background-position: center; background-repeat: no-repeat; }
      #partyBook .up { color: #7fd67f; } #partyBook .down { color: #e0705a; }
      #partyBook .pb-bag { margin-top: 8px; }
      #partyBook .pb-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; }
      #partyBook .pb-cell { position: relative; aspect-ratio: 1 / 1.1; border: 1px solid rgba(140,115,68,.3); border-radius: 3px; background: rgba(0,0,0,.35); cursor: pointer; padding: 3px; }
      #partyBook .pb-cell .ico { width: 100%; height: 100%; aspect-ratio: auto !important; background-size: contain; background-position: center; background-repeat: no-repeat; }
      #partyBook .pb-cell:hover, #partyBook .pb-cell.on { background: rgba(201,163,92,.18); }
      #partyBook .pb-cell .mk { position: absolute; right: 2px; bottom: 0; font-size: 12px; text-shadow: 0 1px 2px #000; }
      #partyBook .pb-cell.empty { cursor: default; opacity: .35; }
      #partyBook .pb-cellsel { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-top: 5px; font-size: 12.5px; min-height: 26px; }
      #partyBook .pb-cellsel button { padding: 2px 8px !important; font-size: 12px !important; }
      #partyBook .pb-tree { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
      #partyBook .pb-br { border: 1px solid rgba(140,115,68,.35); border-radius: 3px; padding: 6px; background: rgba(0,0,0,.22); }
      #partyBook .pb-br h5 { margin: 0 0 5px; font: 700 14px Cinzel, Georgia, serif; color: #e8c97a; display: flex; justify-content: space-between; } #partyBook .pb-br h5 small { font: 12px Georgia, serif; opacity: .65; }
      #partyBook .pb-node { display: flex; justify-content: space-between; gap: 6px; padding: 3px 6px; margin-bottom: 3px; border-radius: 3px; font-size: 12.5px; cursor: pointer; border: 1px solid transparent; }
      #partyBook .pb-node:hover { border-color: rgba(201,163,92,.6); }
      #partyBook .pb-node.move { background: rgba(70,90,130,.22); } #partyBook .pb-node.passive { background: rgba(70,110,70,.18); } #partyBook .pb-node.cap { background: rgba(140,100,40,.25); }
      #partyBook .pb-node.shut { opacity: .45; } #partyBook .pb-node.full { box-shadow: inset 0 0 0 1px rgba(241,214,138,.5); }
      #partyBook .pb-node .rk { flex: none; color: #f1d68a; font-variant-numeric: tabular-nums; }
      #partyBook .pb-node .nt { display: block; font-size: 11px; opacity: .65; }
      #partyBook .pb-pts { font-size: 14px; color: #f1d68a; margin-bottom: 6px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
      #partyBook .pb-none { font-size: 15px; line-height: 1.5; padding: 10px 0; }
      #partyBook .pb-tip { min-height: 1.3em; font-size: 12.5px; color: #e8c97a; }
      @media (max-width: 760px) { #partyBook .pb-body { grid-template-columns: 1fr; } #partyBook .pb-tree { grid-template-columns: 1fr; } }
    `;
    document.head.appendChild(css);
    this.el = document.createElement('div');
    this.el.id = 'partyBook';
    document.body.appendChild(this.el);
    this.el.addEventListener('click', (e) => this.onClick(e));
    this.el.addEventListener('contextmenu', (e) => e.preventDefault());
    for (const t of ['touchstart', 'touchmove', 'touchend']) this.el.addEventListener(t, (e) => e.stopPropagation(), { passive: true });
  }

  // A button beside the quest log's (main.js), K on it.
  addButton(after) {
    const b = document.createElement('div');
    b.id = 'partyOpen'; b.title = 'Party book (K)';
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="2.6"/><circle cx="16" cy="8" r="2.6"/><path d="M3.5 19c.5-3.5 2.3-5.5 4.5-5.5s4 2 4.5 5.5M11.5 19c.5-3.5 2.3-5.5 4.5-5.5s4 2 4.5 5.5"/></g></svg><kbd>K</kbd>';
    // (It takes the quest log's own look: src/ui/hud.css #questOpen.)
    b.className = after.className;
    b.style.cssText = after.style.cssText;
    const go = (e) => { e.preventDefault(); e.stopPropagation(); this.toggle(); };
    b.addEventListener('mousedown', go);
    b.addEventListener('touchstart', go, { passive: false });
    after.after(b);
    this.btn = b;
  }

  toggle() { if (this.open) this.close(); else this.show(); }

  show() {
    if (this.open || !this.canOpen()) return;
    const P = this.party;
    if (!P.roster.length && !P.members.length) { this.tip?.("You've no party yet. The Free Company's quartermasters hire them out: Aldous Fenn in town, Captain Merrow Vale at the Warrens.", 5); return; }
    this.open = true;
    const first = P.members[0] ? P.entryOf(P.members[0]) : P.roster[0];
    if (!this.sel || !P.roster.some((e) => e.id === this.sel)) this.sel = first?.id ?? null;
    this.pick = null; this.sure = false; this.say = '';
    this.opened?.();
    this.el.style.display = 'flex';
    this.render();
  }

  close() {
    if (!this.open) return;
    this.open = false;
    this.el.style.display = 'none';
    this.closed?.();
  }

  key(e) {
    if (e.repeat) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
    if (this.open && (e.code === 'Escape' || e.code === 'KeyK')) { e.preventDefault(); e.stopPropagation(); this.close(); return; }
    if (!this.open && e.code === 'KeyK' && !this.party.open) { if (this.canOpen()) { e.preventDefault(); this.show(); } }
  }

  entry() { return this.party.roster.find((e) => e.id === this.sel) || null; }
  memberOf(e) { return this.party.members.find((m) => m.rid === e.id) || null; }

  // Their numbers to the sim and their looks to the renderer, if they're with you; and the book drawn again.
  redress(e) {
    const m = this.memberOf(e);
    if (m) this.party.dress(m);
    this.party.onChange?.();
    this.render();
  }

  // Whose bag a piece is in: theirs, or one of the party's with you.
  bagOf(e, item) { return [e, ...this.party.members.map((m) => this.party.entryOf(m))].find((x) => x?.bag?.includes(item)) || null; }

  give(e, item) {
    const who = this.party.whoOfEntry(e), from = this.bagOf(e, item);
    if (!fits(item, who) || !from) return;
    this.party.unbag(from, item);
    const was = e.gear[item.slot];
    e.gear[item.slot] = item;
    // (What it took the place of: into their bag, or, if that's full, where the new piece came from.)
    if (was) (e.bag.length < BAG_MAX ? e.bag : from.bag).push(was);
    this.say = from === e ? `${e.name} has the ${item.name} on.` : `${e.name} has the ${item.name} on, out of ${from.name}'s bag.`;
    this.click?.();
    this.pick = null;
    this.redress(e);
  }

  takeOff(e, slot) {
    const it = e.gear[slot];
    if (!it) return;
    if (e.bag.length >= BAG_MAX) { this.say = `${e.name}'s bag is full.`; this.render(); return; }
    delete e.gear[slot];
    e.bag.push(it);
    this.say = `The ${it.name} is back in ${e.name}'s bag.`;
    this.click?.();
    this.redress(e);
  }

  bestFromBag(e) {
    const who = this.party.whoOfEntry(e), items = e.bag.filter((it) => fits(it, who));
    let n = 0;
    for (const slot of HG_SLOTS) {
      const best = items.filter((it) => it.slot === slot).sort((a, b) => score(b) - score(a))[0];
      if (best && score(best) > score(e.gear[slot])) { this.party.unbag(e, best); const was = e.gear[slot]; e.gear[slot] = best; if (was) e.bag.push(was); n++; }
    }
    this.say = n ? `${e.name} put on ${n} piece${n > 1 ? 's' : ''} from their bag.` : `Nothing in ${e.name}'s bag is better than what they have on.`;
    if (n) this.click?.();
    this.redress(e);
  }

  onClick(ev) {
    const t = ev.target.closest('[data-do]');
    if (!t) return;
    const e = this.entry(), d = t.dataset;
    switch (d.do) {
      case 'close': this.close(); return;
      case 'tab': this.sel = +d.id; this.pick = null; this.bagSel = null; this.sure = false; this.say = ''; this.click?.(); this.render(); return;
      default: break;
    }
    if (!e) return;
    switch (d.do) {
      case 'slot': this.pick = this.pick === d.slot ? null : d.slot; this.render(); break;
      case 'give': { const it = this.choices?.[+d.k]; if (it) this.give(e, it); break; }
      case 'off': this.takeOff(e, d.slot); break;
      case 'best': this.bestFromBag(e); break;
      case 'bagsel': this.bagSel = this.bagSel === +d.k ? null : +d.k; this.render(); break;
      case 'wear': { const it = e.bag[+d.k]; this.bagSel = null; if (it) this.give(e, it); break; }
      case 'toss': {
        const it = e.bag[+d.k];
        this.bagSel = null;
        if (!it || !this.party.unbag(e, it)) break;
        this.party.drop?.(it);
        this.say = `The ${it.name} is on the ground at your feet.`;
        this.click?.();
        this.redress(e);
        break;
      }
      case 'node': {
        const no = why(e.cls, e.tree, e.level, d.id);
        if (no) { this.say = no; this.render(); break; }
        spend(e.cls, e.tree, e.level, d.id);
        this.say = `${NODES[e.cls][d.id].name}: rank ${rank(e.cls, e.tree, d.id)}.`;
        this.click?.();
        this.redress(e);
        break;
      }
      case 'auto':
        e.tree.auto = !e.tree.auto;
        if (e.tree.auto) autoSpend(e.cls, e.tree, e.level, roleOf(e.cls));
        this.say = e.tree.auto ? `${e.name} will spend their own points as they come.` : `${e.name}'s points are yours to spend.`;
        this.redress(e);
        break;
      case 'respec': {
        const cost = respecCost(e.level, spentIn(e.cls, e.tree)) * 10;
        if (!cost) break;
        if (!this.sure) { this.sure = true; this.say = `Every point back, for ${priceText(cost)}? Press it again to pay.`; this.render(); break; }
        this.sure = false;
        if (!this.gold.pay(cost)) { this.say = `You can't pay ${priceText(cost)}.`; this.render(); break; }
        e.tree.ranks = {};
        if (e.tree.auto) autoSpend(e.cls, e.tree, e.level, roleOf(e.cls));
        this.say = `${e.name}'s points are all back to spend.`;
        this.redress(e);
        break;
      }
      default: break;
    }
  }

  // ---- drawing --------------------------------------------------------------------------------------------------------

  render() {
    if (!this.open) return;
    // (One redraw for every picture that comes in, the same each time: hgicons.js calls each once a frame.)
    const P = this.party, e = this.entry(), again = (this.again ||= () => this.render());
    const inParty = (x) => P.members.some((m) => m.rid === x.id);
    const tabs = [...P.roster.filter(inParty), ...P.roster.filter((x) => !inParty(x)).sort((a, b) => b.seen - a.seen)];
    let html = `<div class="pb-head"><span class="pb-title">The Party's Book</span><span style="opacity:.65;font-size:13px">${P.members.length} with you, ${P.roster.length - P.members.length} on the roster</span>${CLOSE_X.replace('class="menu-x"', 'class="menu-x" data-do="close"')}</div>`;
    html += `<div class="pb-tabs">${tabs.map((x) => `<span class="pb-tab${x.id === this.sel ? ' on' : ''}${inParty(x) ? '' : ' away'}" data-do="tab" data-id="${x.id}">${esc(x.name)}<small>${x.level} ${esc(CLASSES[x.cls]?.title || x.cls)}</small></span>`).join('')}</div>`;
    if (!e) { this.el.innerHTML = `${html}<div class="pb-none">Nobody on your roster yet.</div>`; return; }
    const who = P.whoOfEntry(e), here = inParty(e);
    // The gear.
    let left = `<div class="pb-who"><b>${esc(e.name)}</b>, level ${e.level} ${esc(CLASSES[e.cls].title)} (${ROLE[roleOf(e.cls)].toLowerCase()})${here ? '' : `<br><span style="opacity:.7;font-size:13px">On the roster: last with you at your level ${e.lastWith}${e.got ? `. Came by ${e.got} piece${e.got > 1 ? 's' : ''} of their own since` : ''}.</span>`}</div>`;
    // (What their gear and tree come to, under their name where it's seen: at the foot of the page it was below the fold.)
    const g = gearStats(e.gear), t = treeMods(e.cls, e.tree);
    const sums = HG_STATS.map((k) => [k, (g[k] || 0) + (t[k] || 0)]).filter(([, v]) => v > 0.0005).map(([k, v]) => STAT_LINE[k](v));
    left += `<div class="pb-sum"><b style="color:#c9a35c">From gear and tree:</b> ${sums.length ? sums.join('; ') : 'nothing yet'}.</div>`;
    left += '<h4>Gear</h4><div class="pb-gear">';
    // (Each piece they wear drawn in the colours it has on them: the outfit's, not the set's alone.)
    const worn = outfitRamps(e.gear, e.cls);
    // (A piece of a set they wear more of is marked with the set's name, in the set lines' green.)
    const inSet = {};
    for (const x of setsWorn(e.gear)) for (const s of HG_SLOTS) if (e.gear[s]?.look === x.set.id) inSet[s] = x.name;
    for (const slot of HG_SLOTS) {
      const it = e.gear[slot];
      const shape = it?.shape ? (shapeShows(it, who) ? '' : ' (colours only)') : '';
      left += `<div class="pb-slot${this.pick === slot ? ' on' : ''}" data-do="slot" data-slot="${slot}" title="${esc(it ? hgLines(it, who).map((l) => l.text).join('\n') : `${HG_SLOT_NAME[slot]}: nothing`)}"><div class="pic">${it ? hgIcon(it, this.base, again, worn[slot]) : ''}</div><div class="tx">${it ? `<span style="color:${RARITIES[it.rarity].color}">${esc(it.name)}</span>${shape}` : '<span style="opacity:.5">Nothing</span>'}<em>${HG_SLOT_NAME[slot]}${inSet[slot] ? ` · <span class="setof">${esc(inSet[slot])}</span>` : ''}</em></div></div>`;
    }
    left += '</div>';
    // (The sets they're wearing more than one piece of: what the repeat drops are for.)
    const sets = setsWorn(e.gear);
    // (What's still to be found of each, and what the whole of one is: partygear.js outfitRamps.)
    if (sets.length) {
      // (What a whole set is, on the set line's tip: a line of its own under it put their bag below the fold.)
      const whole = sets[0].missing.length ? 'All six of a set: worn whole, every piece in its own colours, its accents and all.' : 'Worn whole: every piece in the set\'s own colours, its accents and all.';
      left += `<div class="pb-sets" title="${esc(whole)}">${sets.map((x) => `<span class="set">${esc(x.name)}</span> ${x.n} of ${x.of}${x.missing.length ? ` <span class="miss">· still to find: ${x.missing.map((s) => HG_SLOT_NAME[s].toLowerCase()).join(', ')}</span>` : ' <span class="miss">· the whole set</span>'}`).join('<br>')}</div>`;
    }
    if (this.pick) left += this.pickHtml(e, who, this.pick, again);
    // (Their bag next, where it's seen: the party's loot is only ever in their bags.)
    left += this.bagHtml(e, who, again);
    left += `<div class="pb-btns"><button data-do="best">Put on their best from their bag</button></div>`;
    // The tree.
    const left_ = pointsLeft(e.cls, e.tree, e.level), spent = spentIn(e.cls, e.tree), cost = respecCost(e.level, spent) * 10;
    let right = `<div class="pb-pts">Points to spend: ${left_} of ${pointsAt(e.level)}<button data-do="auto">${e.tree.auto ? 'They spend their own: on' : 'They spend their own: off'}</button><button data-do="respec" ${spent ? '' : 'disabled'}>${this.sure ? `Sure? ${priceText(cost)}` : `Every point back (${spent ? priceText(cost) : 'none spent'})`}</button></div>`;
    right += '<div class="pb-tree">';
    TREES[e.cls].forEach((br, b) => {
      right += `<div class="pb-br"><h5>${esc(br.name)}<small>${spentIn(e.cls, e.tree, b)} in</small></h5>`;
      for (const n of br.nodes) {
        const r = rank(e.cls, e.tree, n.id), no = why(e.cls, e.tree, e.level, n.id), shut = r === 0 && (e.level < n.lvl || spentIn(e.cls, e.tree, b) < n.pts);
        // (What it gives now, and what the next point would: nothing reads as nothing.)
        const gate = e.level < n.lvl ? `Opens at level ${n.lvl}` : `Wants ${n.pts} points here`, top = r >= n.max;
        const note = n.kind === 'passive' ? (r ? `${PASSIVE_TEXT[n.stat](r)}${top ? '' : `, next ${PASSIVE_TEXT[n.stat](r + 1)}`}` : shut ? gate : `A point: ${PASSIVE_TEXT[n.stat](1)}`)
          : n.kind === 'cap' ? (r ? `Every move here ${8 * r}% stronger${top ? '' : `, next ${8 * (r + 1)}%`}` : shut ? gate : 'A point: every move here 8% stronger')
          : r ? `${r === 1 ? 'Learned' : `${15 * (r - 1)}% stronger`}${top ? '' : `, next ${15 * r}% stronger`}` : shut ? gate : 'A point teaches it';
        right += `<div class="pb-node ${n.kind}${shut ? ' shut' : ''}${r >= n.max ? ' full' : ''}" data-do="node" data-id="${n.id}" title="${esc(no || 'Click to spend a point here.')}"><span>${esc(n.name)}<span class="nt">${esc(note)}</span></span><span class="rk">${r}/${n.max}</span></div>`;
      }
      right += '</div>';
    });
    right += '</div>';
    html += `<div class="pb-tip">${esc(this.say || '')}</div><div class="pb-body"><div>${left}</div><div>${right}</div></div>`;
    this.el.innerHTML = html;
  }

  // Their bag: what they carry beside what they wear, a grid of cells as your pack is, each in its rarity's colour and
  // marked better or worse than what they have on. A click picks one: to put on, or to throw down.
  bagHtml(e, who, again) {
    let h = `<div class="pb-bag"><h4>${esc(e.name)}'s bag <span style="opacity:.6;text-transform:none;letter-spacing:0">${e.bag.length} of ${BAG_MAX}</span></h4><div class="pb-grid">`;
    const sel = this.bagSel != null && e.bag[this.bagSel] ? this.bagSel : null;
    e.bag.forEach((it, k) => {
      const d = score(it) - score(e.gear[it.slot]), can = fits(it, who);
      const mk = can ? (d > 0 ? '<span class="mk up">▲</span>' : '<span class="mk down">▼</span>') : '<span class="mk" style="opacity:.6">✕</span>';
      h += `<div class="pb-cell${sel === k ? ' on' : ''}" data-do="bagsel" data-k="${k}" style="border-color:${RARITIES[it.rarity].color}99" title="${esc(hgLines(it, who).map((l) => l.text).join('\n'))}">${hgIcon(it, this.base, again)}${mk}</div>`;
    });
    // (The empty cells too, up to a full row, so it reads as a bag with room in it.)
    for (let k = e.bag.length; k < Math.max(6, Math.ceil(e.bag.length / 6) * 6); k++) h += '<div class="pb-cell empty"></div>';
    h += '</div>';
    if (sel != null) {
      const it = e.bag[sel], d = score(it) - score(e.gear[it.slot]), can = fits(it, who);
      h += `<div class="pb-cellsel"><span style="color:${RARITIES[it.rarity].color}">${esc(it.name)}</span>${can ? ` <span class="${d > 0 ? 'up' : 'down'}">${d > 0 ? 'better' : 'worse'}</span>` : ' <span style="opacity:.6">not theirs to wear</span>'}${can ? `<button data-do="wear" data-k="${sel}">Wear</button>` : ''}<button data-do="toss" data-k="${sel}">Drop</button></div>`;
    } else h += `<div class="pb-cellsel" style="opacity:.6">${e.bag.length ? 'Click a piece to put it on or drop it.' : 'Empty. What drops for them goes in here when you pick it up.'}</div>`;
    return `${h}</div>`;
  }

  // What in their bag, or the bags of the party with you, would go in a slot of theirs, best first, and what each would change.
  pickHtml(e, who, slot, again) {
    const cur = e.gear[slot];
    const bags = [e, ...this.party.members.map((m) => this.party.entryOf(m)).filter((x) => x && x !== e)];
    const items = bags.flatMap((b) => b.bag.filter((it) => it.slot === slot && fits(it, who)).map((it) => ({ it, b }))).sort((a, b) => score(b.it) - score(a.it));
    this.choices = items.map((x) => x.it);
    let h = `<div class="pb-pick"><h4>${HG_SLOT_NAME[slot]}: from the bags</h4>`;
    if (cur) h += `<div class="pb-btns" style="margin:0 0 6px"><button data-do="off" data-slot="${slot}">Take the ${esc(cur.name)} back</button></div>`;
    if (!items.length) h += `<div style="font-size:12.5px;opacity:.7">Nothing in the bags fits ${esc(e.name)} there.</div>`;
    else {
      h += '<ol>';
      items.forEach(({ it, b }, k) => {
        const d = score(it) - score(cur);
        const stats = HG_STATS.filter((s) => it.stats[s]).map((s) => STAT_LINE[s](it.stats[s])).join(', ');
        h += `<li data-do="give" data-k="${k}"><div class="pic">${hgIcon(it, this.base, again)}</div><div><span style="color:${RARITIES[it.rarity].color}">${esc(it.name)}</span> <span class="${d > 0 ? 'up' : 'down'}">${d > 0 ? 'better' : 'worse'}</span>${b === e ? '' : ` <span style="opacity:.6">(${esc(b.name)}'s bag)</span>`}<br><span style="opacity:.75">${esc(stats)}</span></div></li>`;
      });
      h += '</ol>';
    }
    return `${h}</div>`;
  }
}
