// The card on the pause screen (index.html #pause .pz-card), beside its menu: who you are and your level, how far to the next,
// where you stand, how long you've played, your purse and the day; then the quest you follow, what it wants of you now, and a
// button to the quest log. The same words for where you stand go on a save's card (src/title.js, src/saves.js setCard).

import { COUNTRIES, SITES, countryAt, siteAt } from '../core/lands.js';
import { delveOf } from '../core/dungeon.js';
import { inTown } from '../core/town.js';
import { PHOBOS } from '../core/phobos-data.js';
import { MAX_LEVEL, xpFor } from '../items/levels.js';
import { QUESTS } from '../folk/lines/quests.js';
import { objectivesOf, shortOf, standOf } from './questlog.js';
import { icon } from './icons.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Where (x, y, z) is, in words: a dungeon, under the cathedral, Bellmourn, a quarter of Phobos, a place on the land, or its country. */
export function whereWords(x, y, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return '';
  const d = delveOf(x, z);
  if (d) return d.name || 'A dungeon';
  if (y < -6 && inTown(x, z, 120)) return 'Under the cathedral';
  if (inTown(x, z, 25)) return 'Bellmourn';
  const q = PHOBOS.districts?.find((k) => Math.hypot(x - k.x, z - k.z) < k.r);
  if (q) return `${q.name}, Phobos`;
  const s = siteAt(x, z, 15);
  if (s) return SITES[s].name;
  return COUNTRIES[countryAt(x, z)]?.name || 'Out in the land';
}

/** Seconds played, in words: "3 h 05 min", "12 min" (m is metres in this game). */
export function playedWords(sec) {
  const m = Math.floor((sec || 0) / 60), h = Math.floor(m / 60);
  return h ? `${h} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`;
}

/** How far through the level you are: 0..1. */
export function levelPart(xp, level) {
  if (level >= MAX_LEVEL) return 1;
  const a = xpFor(level), b = xpFor(level + 1);
  return b > a ? Math.max(0, Math.min(1, (xp - a) / (b - a))) : 0;
}

/**
 * The card's markup. o: { name, level, xp, where, played (s), gold, copper, day, hour, quest: { id, title, line } | null,
 * Q, mats, today } (Q, mats, today: for the quest's line, src/ui/questlog.js shortOf).
 */
export function pauseCard(o) {
  const lvl = o.level || 1, part = levelPart(o.xp || 0, lvl);
  const toNext = lvl >= MAX_LEVEL ? 'The highest level' : `${Math.max(0, xpFor(lvl + 1) - (o.xp || 0)).toLocaleString('en-GB')} experience to level ${lvl + 1}`;
  const h = ((o.hour ?? 12) + 24) % 24, clock = `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`;
  const time = h < 5 || h >= 21 ? 'night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  const fact = (ic, k, v) => `<dt><span class="m-ic" data-ic="${ic}">${icon(ic)}</span>${k}</dt><dd>${esc(v)}</dd>`;
  const q = o.quest;
  // (What it wants of you now: who to go back to, once it's ready; else the step under way, with its count.)
  let line = '';
  if (q && o.Q) {
    const mats = o.mats || {}, day = o.today || 0, now = objectivesOf(q.id, o.Q, mats, day).at(-1);
    line = standOf(q.id, o.Q, mats, day) ? shortOf(q.id, o.Q, mats, day) : `${now?.text || q.line || ''}${now?.need > 1 ? ` (${Math.min(now.have, now.need)} / ${now.need})` : ''}`;
  } else if (q) line = q.line || '';
  return `<div class="pz-name"><b>${esc(o.name || 'Tessariel')}</b><span>Level <i class="m-n">${lvl}</i></span></div>
    <div class="pz-xp" title="${esc(toNext)}"><i style="width:${(part * 100).toFixed(1)}%"></i></div><div class="pz-xpw">${esc(toNext)}</div>
    <dl class="pz-facts">${fact('map', 'Where', o.where || 'Bellmourn')}${fact('resume', 'Played', playedWords(o.played))}${fact('gold', 'Purse', `${o.gold || 0} gold, ${o.copper || 0} copper`)}${fact('centre', 'Day', `Day ${(o.day || 0) + 1}, ${time} (${clock})`)}</dl>
    ${q ? `<div class="pz-quest"><h5><span class="m-ic" data-ic="quest">${icon('quest')}</span>Following</h5><b>${esc(q.title)}</b>${line ? `<p>${esc(line)}</p>` : ''}<button type="button" class="m-btn" data-p="quests"><span class="m-ic" data-ic="journal">${icon('journal')}</span>Quest Log</button></div>`
    : `<div class="pz-quest none"><h5><span class="m-ic" data-ic="quest">${icon('quest')}</span>Following</h5><p>No quest. A yellow ! over someone's head means they have work for you.</p><button type="button" class="m-btn" data-p="quests"><span class="m-ic" data-ic="journal">${icon('journal')}</span>Quest Log</button></div>`}`;
}

/** The quest you follow, for the card: { id, title, line } or null. */
export function followedFor(Q) {
  const id = Q.followed();
  return id && id !== 'start' && QUESTS[id] ? { id, title: QUESTS[id].title, line: Q.journalLine(id) } : null;
}
