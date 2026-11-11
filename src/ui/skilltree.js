// The six trees, drawn in the book under the bar's slots (src/ui/spellbar.js): a tab a school, its spells left to right by
// tier with the lines of what grows from what, each spell's two branches hanging under it, and the school's mastery. Beside
// it, whatever is picked out: what it does, its numbers now and at the next rank, why a point can't go in if it can't, the
// button that spends one, and for a spell you know the six slots to put it in.
import { SPELLS } from '../sim/spells.js';
import { MASTERY, MAX_RANK, NODES, TIER_LEVEL, TIER_POINTS, TREES, statLines } from '../sim/skills.js';
import { COLOURS, MARKS, glyph, svg } from './spellglyphs.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// Where things stand in a tree's picture, in pixels: a column a tier, three rows.
const CW = 178, RH = 150, TOP = 30, NODE = 56, TWIG = 30, OUT = 44;
const TIERS = TIER_LEVEL.length, W = CW * TIERS, HGT = TOP + RH * 3;
const HANDS = ['', 'one hand', 'two hands'];

export class SkillTree {
  // bar: the SpellBar (its skills, its slots). gold: { have(), pay(n) }, for unlearning.
  constructor(bar, { tip, gold, sound } = {}) {
    this.bar = bar; this.skills = bar.skills; this.tip = tip; this.gold = gold; this.sound = sound;
    this.tab = 0;
    this.sel = TREES[0].spells.find((n) => n.tier === 0).id;
    this.sure = false;
    this.tabsEl = $('treeTabs'); this.viewEl = $('treeView'); this.infoEl = $('treeInfo');
    this.tabsEl.addEventListener('click', (e) => {
      const b = e.target.closest('[data-tab]');
      if (!b) return;
      this.tab = +b.dataset.tab;
      this.pick(TREES[this.tab].spells.find((n) => n.tier === 0).id);
    });
    // A click picks a node out; a second click on it within a moment spends a point in it. (The picture is drawn afresh at
    // every pick, so the browser's own double click never sees the same element twice.)
    this.viewEl.addEventListener('click', (e) => {
      const n = e.target.closest('.tnode');
      if (!n || this.bar.dragged) return;
      const id = n.dataset.id, again = this.lastClick === id && performance.now() - this.lastAt < 400;
      this.lastClick = again ? null : id; this.lastAt = performance.now();
      // (Not on a touch screen: two taps of a thumb are too easy to make by mistake, and a point costs gold to take back.)
      if (again && !this.bar.input.touch) this.spend(id); else this.pick(id);
    });
    this.viewEl.addEventListener('mouseover', (e) => { const n = e.target.closest('.tnode.known[data-spell]'); this.bar.hover = n ? +n.dataset.spell : -1; });
    this.infoEl.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.spend) this.spend(b.dataset.spend);
      else if (b.dataset.pick) this.pick(b.dataset.pick);
      else if (b.dataset.slot) { this.bar.assign(+b.dataset.slot, NODES[this.sel].spell); this.bar.armed = -1; this.bar.drawMenu(); }
      else if (b.dataset.unlearn !== undefined) this.unlearn();
    });
  }

  // A node picked out. A spell you know is taken up as well, ready for a slot.
  pick(id) {
    const n = NODES[id];
    if (!n) return;
    this.sel = id; this.sure = false;
    if (n.tree !== this.tab) this.tab = n.tree;
    this.bar.armed = n.kind === 'spell' && this.skills.rank(id) > 0 ? n.spell : -1;
    this.bar.drawMenu();
  }

  spend(id) {
    const why = this.skills.why(id);
    if (why) { this.tip?.(why); return false; }
    const n = NODES[id], first = n.kind === 'spell' && this.skills.rank(id) === 0;
    this.sel = id;
    this.skills.spend(id);
    this.sound?.(first ? 'scroll' : 'uiConfirm');
    // (A spell just learned goes into the first empty slot, as one read from a scroll does.)
    if (first) { const k = this.bar.loadout.indexOf(-1); if (k >= 0) this.bar.assign(k, n.spell); }
    return true;
  }

  // Every point back, for gold. Asked twice.
  unlearn() {
    const cost = this.skills.respecCost;
    if (!this.skills.spent) return;
    if (this.gold && this.gold.have() < cost) { this.tip?.(`Unlearning costs ${cost} gold, and you have ${this.gold.have()}.`); return; }
    if (!this.sure) { this.sure = true; this.drawInfo(); return; }
    this.sure = false;
    this.gold?.pay(cost);
    this.skills.unlearn();
    this.sound?.('uiCancel');
  }

  draw() {
    if (!this.tabsEl) return;
    const S = this.skills;
    this.tabsEl.innerHTML = TREES.map((t, i) => {
      const n = t.spells.filter((q) => S.rank(q.id) > 0).length;
      return `<button data-tab="${i}" class="${i === this.tab ? 'on' : ''}" style="--c:${COLOURS[t.elem]}">${esc(t.name)}<i>${n}/${t.spells.length}</i></button>`;
    }).join('') + `<span id="treePoints" class="${S.points ? 'have' : ''}">${S.points} point${S.points === 1 ? '' : 's'} to spend</span>`;
    this.drawTree();
    this.drawInfo();
  }

  drawTree() {
    const S = this.skills, t = TREES[this.tab], c = COLOURS[t.elem], bar = this.bar;
    const cx = (n) => n.tier * CW + CW / 2, top = (n) => TOP + n.row * RH + 6, cy = (n) => top(n) + NODE / 2;
    const state = (id) => `${S.rank(id) > 0 ? 'known' : ''} ${S.rank(id) >= NODES[id].max ? 'full' : ''} ${S.why(id) ? '' : 'can'} ${id === this.sel ? 'sel' : ''}`;
    let lines = '', html = '';
    for (let k = 0; k < TIERS; k++) html += `<div class="thead" style="left:${k * CW}px;width:${CW}px">Level ${TIER_LEVEL[k]}${TIER_POINTS[k] ? ` &middot; ${TIER_POINTS[k]} points in` : ''}</div>`;
    html += `<div class="tblurb" style="left:6px;top:${TOP + 4}px;width:${CW - 12}px">${esc(t.blurb)}</div>`;
    for (const n of t.spells) {
      const d = SPELLS[n.spell], x = cx(n), y = top(n), r = S.rank(n.id), slot = bar.loadout.indexOf(n.spell);
      for (const k of n.req) { const p = NODES[k], x1 = cx(p) + NODE / 2, y1 = cy(p), x2 = x - NODE / 2, y2 = cy(n); lines += `<path class="${S.rank(k) > 0 ? 'on' : ''}" d="M${x1} ${y1}C${x1 + 34} ${y1} ${x2 - 34} ${y2} ${x2} ${y2}"/>`; }
      html += `<button class="tnode spell ${state(n.id)}" data-id="${n.id}" data-spell="${n.spell}" style="left:${x - NODE / 2}px;top:${y}px">${glyph(d)}<b>${r}/${n.max}</b>${slot >= 0 ? `<kbd>${slot + 1}</kbd>` : ''}</button>`;
      html += `<div class="tname ${r > 0 ? 'known' : ''}" style="left:${n.tier * CW}px;top:${y + NODE + 3}px;width:${CW}px">${esc(d.name)}</div>`;
      n.augs.forEach((a, i) => {
        const ax = x + (i ? OUT : -OUT), ay = y + 92, ar = S.rank(a.id);
        lines += `<path class="${ar > 0 ? 'on' : ''}" d="M${x} ${y + NODE + 18}L${ax} ${ay}"/>`;
        html += `<button class="tnode twig ${state(a.id)}" data-id="${a.id}" style="left:${ax - TWIG / 2}px;top:${ay}px">${svg(MARKS.branch)}${a.max > 1 || ar ? `<b>${ar}/${a.max}</b>` : ''}</button>`;
        html += `<div class="twname ${ar > 0 ? 'known' : ''}" style="left:${ax - 43}px;top:${ay + TWIG + 2}px">${esc(a.name)}</div>`;
      });
    }
    const m = NODES[`@${t.key}`], mx = CW / 2, my = TOP + 2 * RH + 6;
    html += `<button class="tnode mastery ${state(m.id)}" data-id="${m.id}" style="left:${mx - NODE / 2}px;top:${my}px">${svg(MARKS.mastery)}<b>${S.rank(m.id)}/${m.max}</b></button>`;
    html += `<div class="tname ${S.rank(m.id) > 0 ? 'known' : ''}" style="left:0;top:${my + NODE + 3}px;width:${CW}px">${esc(m.name)}</div>`;
    this.viewEl.style.setProperty('--c', c);
    this.viewEl.innerHTML = `<div class="tcanvas" style="width:${W}px;height:${HGT}px"><svg width="${W}" height="${HGT}" viewBox="0 0 ${W} ${HGT}">${lines}</svg>${html}</div>`;
  }

  drawInfo() {
    const S = this.skills, n = NODES[this.sel], t = TREES[n.tree], c = COLOURS[t.elem], r = S.rank(n.id), why = S.why(n.id);
    const spendBtn = (label) => (r >= n.max ? '<div class="twhy">As far as it goes.</div>' : why ? `<div class="twhy">${esc(why)}</div>` : `<button class="tspend" data-spend="${n.id}">${label} &middot; 1 point</button>`);
    let h = '';
    if (n.kind === 'spell') {
      const d = S.spells()[n.spell];
      h += `<h3 style="color:${c}">${glyph(d)}${esc(d.name)}</h3>`;
      h += `<div class="tsub">${esc(t.name)} &middot; ${HANDS[d.hands]}${d.channel ? ' &middot; held' : d.gather ? ' &middot; gathered' : ''} &middot; ${r ? `rank ${r} of ${MAX_RANK}` : 'not learned'}</div>`;
      h += `<p>${esc(d.desc)}</p>`;
      h += `<table>${statLines(n.spell, S.ranks).map(([label, a, z]) => `<tr><td>${label}</td><td>${a}</td><td>${z ? `&rarr; ${z}` : ''}</td></tr>`).join('')}</table>`;
      h += spendBtn(r ? `Raise to rank ${r + 1}` : 'Learn it');
      if (r > 0) h += `<div class="tslots"><span>On the bar:</span>${this.bar.loadout.map((s, k) => `<button data-slot="${k}" class="${s === n.spell ? 'on' : ''}">${k + 1}</button>`).join('')}</div>`;
      h += '<h4>Its branches: one or the other</h4>';
      for (const a of n.augs) h += `<button class="tbranch ${S.rank(a.id) ? 'on' : ''}" data-pick="${a.id}"><b>${esc(a.name)}</b><i>${S.rank(a.id)}/${a.max}</i><span>${esc(a.desc)}</span></button>`;
    } else if (n.kind === 'branch') {
      const d = SPELLS[n.of.spell], other = n.of.augs.find((a) => a !== n);
      h += `<h3 style="color:${c}">${svg(MARKS.branch)}${esc(n.name)}</h3>`;
      h += `<div class="tsub">A branch of ${esc(d.name)} &middot; rank ${r} of ${n.max}</div>`;
      h += `<p>${esc(n.desc)}</p>`;
      h += spendBtn(r ? `Raise to rank ${r + 1}` : 'Take it');
      h += `<h4>Or, in its place</h4><button class="tbranch ${S.rank(other.id) ? 'on' : ''}" data-pick="${other.id}"><b>${esc(other.name)}</b><i>${S.rank(other.id)}/${other.max}</i><span>${esc(other.desc)}</span></button>`;
      h += `<button class="tback" data-pick="${n.of.id}">&larr; ${esc(d.name)}</button>`;
    } else {
      h += `<h3 style="color:${c}">${svg(MARKS.mastery)}${esc(n.name)}</h3>`;
      h += `<div class="tsub">${esc(t.name)}'s mastery &middot; rank ${r} of ${n.max}</div>`;
      h += `<p>${esc(n.desc)}</p>`;
      h += `<table><tr><td>${esc(t.name)} spells do</td><td>+${Math.round(MASTERY.dmg * r * 100)}%</td><td>${r < n.max ? `&rarr; +${Math.round(MASTERY.dmg * (r + 1) * 100)}%</td>` : '</td>'}</tr><tr><td>and cost</td><td>-${Math.round(MASTERY.mana * r * 100)}%</td><td>${r < n.max ? `&rarr; -${Math.round(MASTERY.mana * (r + 1) * 100)}%` : ''}</td></tr></table>`;
      h += spendBtn(r ? `Raise to rank ${r + 1}` : 'Take it');
    }
    const cost = S.respecCost;
    h += `<div class="tfoot"><span>${S.spent} of ${S.earned} points spent</span>${S.spent ? `<button data-unlearn>${this.sure ? `Sure? Every point back, for ${cost} gold` : `Unlearn everything &middot; ${cost} gold`}</button>` : ''}</div>`;
    this.infoEl.innerHTML = h;
  }
}
