// Auto-play's notebook, for balancing: what it took to get through the game. Every level and when it came, every quest from
// taken to done, every fight (how long, what it cost in life, how close it came), every kill by what it was, and every time it
// was beaten back. Kept in this browser (localStorage) across reloads, so a long run can be read afterwards; the Auto-play log
// panel (src/ui/autoplay.js) shows it and saves it as JSON. Times are auto-play's own: seconds of play with it on.
import { RULES } from '../folk/quests.js';
import { QUESTS } from '../folk/lines/quests.js';
import { countryAt } from '../core/lands.js';

const KEY = 'bm.autoplay.log';
const fresh = () => ({ v: 1, started: new Date().toISOString(), t: 0, level: 0, levels: [], quests: {}, fights: {}, kills: {}, falls: [], gold: 0, bosses: {} });

export class AutoLog {
  constructor() {
    try { this.d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { this.d = null; }
    if (!this.d || this.d.v !== 1) this.d = fresh();
    this.saveT = 0; this.fight = null; this.calmT = 0;
  }

  reset() { this.d = fresh(); this.save(); }
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.d)); } catch { /* full, or private */ } }

  // Every frame it's on: the clock, the level, the quests as they move, a fight as it goes.
  tick(dt, m, pack, Q, fighting) {
    const d = this.d;
    d.t += dt;
    d.gold = pack.purse() / 10;
    if (pack.level !== d.level) {
      if (pack.level > d.level) d.levels.push({ level: pack.level, t: Math.round(d.t), hour: +m.hour.toFixed(1) });
      d.level = pack.level;
    }
    for (const id of Object.keys(RULES)) {
      const s = Q.state(id);
      if (!s) continue;
      const q = d.quests[id] || (d.quests[id] = { title: QUESTS[id].title, taken: Math.round(d.t), levelTaken: pack.level, falls: 0 });
      if (s.stage === 'done' && q.done === undefined) { q.done = Math.round(d.t); q.levelDone = pack.level; q.minutes = +((q.done - q.taken) / 60).toFixed(1); }
    }
    // A fight: from the first foe to three quiet seconds after the last.
    if (fighting) {
      if (!this.fight) this.fight = { t0: d.t, hp: m.hp, lost: 0, low: m.hpf, kills: 0, level: pack.level, where: m.below ? 'below' : countryAt(m.x, m.z) || 'bellmourn' };
      this.calmT = 0;
    }
    if (this.fight) {
      const f = this.fight;
      if (m.hp < f.hp) f.lost += f.hp - m.hp;
      f.hp = m.hp; f.low = Math.min(f.low, m.hpf);
      if (!fighting && (this.calmT += dt) > 3) this.endFight();
    }
    if ((this.saveT += dt) > 10) { this.saveT = 0; this.save(); }
  }

  endFight() {
    const f = this.fight;
    this.fight = null;
    if (!f) return;
    const k = String(f.level), b = this.d.fights[k] || (this.d.fights[k] = { n: 0, secs: 0, lost: 0, kills: 0, low: 1, where: {} });
    b.n++; b.secs += this.d.t - f.t0 - 3; b.lost += f.lost; b.kills += f.kills; b.low = Math.min(b.low, f.low);
    b.where[f.where] = (b.where[f.where] || 0) + 1;
  }

  // A spell cast, or a shot of the staff.
  cast(key) { const c = (this.d.casts ||= {}); c[key] = (c[key] || 0) + 1; }

  kill(name) {
    this.d.kills[name] = (this.d.kills[name] || 0) + 1;
    if (this.fight) this.fight.kills++;
  }

  // A boss (the black knight): each go at him, and when he went down, at what level and after how long.
  boss(key, what, m) {
    const b = (this.d.bosses ||= {})[key] || (this.d.bosses[key] = { tries: 0 });
    if (what === 'try') { b.tries++; b.lastTry = Math.round(this.d.t); b.levelTry = this.d.level; }
    if (what === 'killed' && b.killed === undefined) { b.killed = Math.round(this.d.t); b.level = this.d.level; b.minutes = +((b.killed - (b.lastTry ?? b.killed)) / 60).toFixed(1); }
    this.save();
  }

  // Beaten back to the town's edge: when, at what level, where, doing what.
  fell(m, level, doing, quest) {
    this.d.falls.push({ t: Math.round(this.d.t), level, where: m.below ? 'below the cathedral' : countryAt(m.x, m.z) || 'bellmourn', doing: doing || '' });
    if (quest && this.d.quests[quest]) this.d.quests[quest].falls++;
    if (this.fight) { this.fight.low = 0; this.endFight(); }
    this.save();
  }

  // The panel's tables, as HTML.
  html() {
    const d = this.d, min = (s) => (s / 60).toFixed(1);
    const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
    const rows = (head, list) => `<table><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr>${list.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${head.length}">Nothing yet.</td></tr>`}</table>`;
    const qs = Object.entries(d.quests).sort((a, b) => a[1].taken - b[1].taken);
    const fights = Object.entries(d.fights).sort((a, b) => +a[0] - +b[0]);
    const kills = Object.entries(d.kills).sort((a, b) => b[1] - a[1]);
    return `<p>${min(d.t)} minutes of auto-play since ${esc(d.started.slice(0, 16).replace('T', ' '))}. Level ${d.level}, ${Math.round(d.gold)} gold, beaten back ${d.falls.length} times.</p>
      <h3>Levels</h3>${rows(['Level', 'At (min)', 'Took (min)', 'Hour'], d.levels.map((l, i) => [l.level, min(l.t), min(l.t - (i ? d.levels[i - 1].t : 0)), l.hour]))}
      <h3>Quests</h3>${rows(['Quest', 'Taken (min, lvl)', 'Done (min, lvl)', 'Took (min)', 'Beaten back'], qs.map(([, q]) => [q.title, `${min(q.taken)}, ${q.levelTaken}`, q.done !== undefined ? `${min(q.done)}, ${q.levelDone}` : '—', q.minutes ?? '—', q.falls]))}
      <h3>Fights by level</h3>${rows(['Level', 'Fights', 'Avg secs', 'Avg life lost', 'Kills', 'Lowest life', 'Where'], fights.map(([k, b]) => [k, b.n, (b.secs / b.n).toFixed(1), (b.lost / b.n).toFixed(0), b.kills, `${Math.round(b.low * 100)}%`, Object.entries(b.where).map(([w, n]) => `${w} ${n}`).join(', ')]))}
      <h3>Bosses</h3>${rows(['Boss', 'Goes at him', 'Down at (min, lvl)', 'Last go took (min)'], Object.entries(d.bosses || {}).map(([k, b]) => [k === 'black' ? 'The black knight' : k, b.tries, b.killed !== undefined ? `${min(b.killed)}, ${b.level}` : '—', b.minutes ?? '—']))}
      <h3>Spells and the staff</h3>${rows(['Cast', 'Times'], Object.entries(d.casts || {}).sort((a, b) => b[1] - a[1]))}
      <h3>Kills</h3>${rows(['Foe', 'Killed'], kills)}
      <h3>Beaten back</h3>${rows(['At (min)', 'Level', 'Where', 'Doing'], d.falls.map((f) => [min(f.t), f.level, f.where, f.doing]))}`;
  }
}
