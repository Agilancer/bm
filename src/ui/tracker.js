// The quest tracker, down the right under the map (index.html #qTrack, src/ui/menus.css), as the big games keep one: the quests
// you track from the quest log (src/folk/quests.js watch, up to WATCH_MAX), each coloured by its level against yours, with what
// it wants of you now and how far along you are; the one whose trail you follow marked, and first. A click or a tap on one
// opens the quest log on it. Settings, Interface: Quest tracker shows it or hides it.
//
// On a phone it's down the left under life and mana, which it shares with the party's frames and calls (src/ui/hud.css): with
// a party up it starts under them and stops above the chat, and when there's only room for one, that's the one you follow.
// The thumb stick's layer (#touch) lies over it there, so it never steals a drag: a tap is handed to it by src/input.js
// (onPick, through src/main.js), and only a tap.

import { QUESTS } from '../folk/lines/quests.js';
import { levelTone, objectivesOf, questLevel, shortOf, standOf, tallyOf } from './questlog.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export class Tracker {
  // o: { el, quests (a QuestBook), pack, day(), open(id) }
  constructor(o) {
    Object.assign(this, o);
    this.shown = true; this.drawn = null; this.next = 0; this.laid = null;
    this.el.addEventListener('click', (e) => { const q = e.target.closest('[data-q], .qt-more'); if (q) this.open?.(q.dataset.q || null); });
  }

  setOn(on) { this.shown = on; this.el.classList.toggle('on', on); this.drawn = null; this.next = 0; this.update(); if (!on) this.capChat(null); }

  /** Each frame: drawn again when what it shows, or the room it has, has changed (looked at twice a second, by the clock on
   *  the wall: the game's own runs slow when frames are dear, and the tracker shouldn't lag for it). */
  update() {
    const now = performance.now();
    if (!this.shown || now < (this.next || 0)) return;
    this.next = now + 500;
    const html = this.html(), room = this.el.getClientRects().length ? this.room() : null;
    const laid = room ? `${innerHeight}|${room.top}|${room.end}` : '';   // (laid out again when it's shown, or its room changes)
    if (html !== this.drawn || laid !== this.laid) { this.drawn = html; this.laid = laid; this.el.innerHTML = html; this.fit(room); this.capChat(room); }
  }

  // Under a party on a phone, the chat's lines below grow up only so far as the tracker's foot, or the calls' with nothing
  // tracked: the oldest go out of sight at the top (src/ui/hud.css). src/ui/heroplay.js placeCalls keeps the same rule. With
  // no party, the chat is its own height again.
  capChat(room) {
    const chat = document.getElementById('heroChat'), B = document.body.classList;
    if (!chat || !B.contains('touch')) return;
    if (!B.contains('has-party')) { chat.style.maxHeight = ''; return; }
    const calls = document.getElementById('heroCalls')?.getBoundingClientRect(), me = this.el.getBoundingClientRect();
    const foot = Math.max(calls?.height ? calls.bottom : 0, room && me.height ? me.bottom + 2 : 0);
    if (!foot) return;
    const bottom = innerHeight - (parseFloat(getComputedStyle(chat).bottom) || 0);
    chat.style.maxHeight = `${Math.max(40, Math.round(bottom - foot - 4))}px`;
  }

  /** A tap on the screen at (x, y), from src/input.js: true if it was on a tracked quest (which opens in the quest log), or on
   *  the "+ n more" line under them (the log opens). False when the log can't open just now (open says so): the tap goes on
   *  to whatever else is under it. */
  tapAt(x, y) {
    if (!this.shown || !this.el.classList.contains('on') || !this.el.getClientRects().length || getComputedStyle(this.el).visibility === 'hidden') return false;
    for (const q of this.el.querySelectorAll('.qt-q:not([hidden]), .qt-more:not([hidden])')) {
      const r = q.getBoundingClientRect();
      if (x >= r.left - 8 && x <= r.right + 8 && y >= r.top - 8 && y <= r.bottom + 8) return this.open?.(q.dataset.q || null) !== false;
    }
    return false;
  }

  // Where it may lie on a phone: under the party's frames and calls when they're up beside it, down to 100 px from the foot
  // (the chat gives way to it: capChat). Null where it keeps its own place (a PC; a phone with no party).
  room() {
    if (!document.body.classList.contains('touch')) return null;
    const me = this.el.getBoundingClientRect();
    const box = (sel) => {
      const e = document.querySelector(sel);
      if (!e || !e.getClientRects().length || getComputedStyle(e).visibility === 'hidden') return null;
      const r = e.getBoundingClientRect();
      return r.height && r.left < me.right && r.right > me.left ? r : null;
    };
    const above = ['#partyFrames', '#heroCalls'].map(box).filter(Boolean);
    if (!above.length) return null;
    return { top: Math.round(Math.max(...above.map((r) => r.bottom)) + 6), end: innerHeight - 100 };
  }

  // As many as there's room for above the spell bar (three on a phone), and the rest counted under them.
  fit(room) {
    const S = this.el.style, tight = !!room && room.end - room.top < 110;
    S.top = room ? `${room.top}px` : '';
    S.maxHeight = room ? `${Math.max(room.end - room.top, 58)}px` : '';
    this.el.classList.toggle('tight', tight);   // (no room for the heading: just the quests)
    const qs = [...this.el.querySelectorAll('.qt-q')], more = this.el.querySelector('.qt-more');
    if (!qs.length || !more) return;
    const most = document.body.classList.contains('touch') ? 3 : qs.length;
    const end = this.el.getBoundingClientRect().top + this.el.clientHeight;
    let cut = qs.findIndex((q, i) => i >= most || q.getBoundingClientRect().bottom > end + 0.5);
    if (cut < 0) return;
    more.hidden = false;
    const room2 = more.offsetHeight + 5;
    while (cut > 1 && qs[cut - 1].getBoundingClientRect().bottom + room2 > end) cut--;
    qs.slice(cut).forEach((q) => { q.hidden = true; });
    more.textContent = `+ ${qs.length - cut} more in the quest log`;
  }

  // What it shows, as markup: nothing while nothing's tracked. The quest you follow first.
  html() {
    const Q = this.quests, mats = this.pack.mats, day = this.day(), lvl = this.pack.level || 1, on = Q.followed();
    const ids = Q.watch.filter((id) => Q.state(id) && !Q.done(id)).sort((a, b) => (b === on) - (a === on));
    if (!ids.length) return '';
    return `<div class="qt-head">Quests</div>${ids.map((id) => {
      const stand = standOf(id, Q, mats, day), o = objectivesOf(id, Q, mats, day).at(-1);
      // (What's under way, in a few words where it can be, and its count kept apart, so cutting the words never cuts the count.)
      const count = !stand && o?.need > 1 ? `<em>${Math.min(o.have, o.need)}/${o.need}</em>` : '';
      const words = stand ? shortOf(id, Q, mats, day) : (count && tallyOf(id, Q)) || o?.text || Q.journalLine(id);
      return `<div class="qt-q${id === on ? ' focus' : ''}" data-q="${id}" style="--lv:var(--m-lv-${levelTone(questLevel(id), lvl)})" title="Open it in the quest log">`
        + `<b>${esc(QUESTS[id].title)}</b><span class="qt-o${stand === 'ready' ? ' ready' : ''}"><i>${esc(words)}</i>${count}</span></div>`;
    }).join('')}<div class="qt-more" hidden title="Open the quest log"></div>`;
  }
}
