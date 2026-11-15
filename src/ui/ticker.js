// The emergency ticker: a red bar across the top of the screen that a boss fight's calls crawl along in bold capitals,
// right to left, fast but slow enough to read. The bar drops in and flashes as each call comes; the EMERGENCY tag at its
// left blinks while anything is crawling; it goes back up when the last call has gone off the left edge.
//
// A call is cut in two where it turns from what's happening to what to do ("A squall line sweeps the disc" » "Find the
// gap in it"): the first half in white, the second in pale gold. Calls that come while one is still crawling join the end
// of the line, and the belt runs faster while one is waiting to come on, so a new call is never long off the screen.
// (src/ui/party.js sends the fight's calls here; a god's own words and the delves' calm lines stay where they were.)

const SPEED = 13.5; // em a second, about eighteen letters a second in Cinzel's capitals
const GAP = 3.4; // em between the end of one call and the start of the next
const RUSH = 2.6; // the most the belt speeds up by while a call waits to come on
// What sits along the top of the screen, which slides down out of the bar's way while it's out: the clock, the foe's bar,
// the corner map, the boss's bar, the bounty tracker, the calm words and the test hall's word.
const MAKE_ROOM = ['clock', 'foe', 'mapMini', 'mapRing', 'bossFrame', 'wildTrack', 'raidWarn', 'hallStatus'];
// On a phone everything along the top is set down from the screen's top inset, --st (src/ui/hud.css): the bar adds its
// own height to that, --tk-dy, so the whole top band (level, life, dock, map, boss, party) comes down together. These
// are the topmost of it, to measure how far.
const PHONE_TOP = ['levelBox', 'vitals', 'dock', 'mapMini'];
try { CSS.registerProperty({ name: '--tk-dy', syntax: '<length>', inherits: true, initialValue: '0px' }); } catch { /* (registered already, or no such API: it jumps, not slides) */ }

// Where a call turns from what's happening to what to do: its first "!", or else its first ":", or else its first full stop.
export function callParts(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  const at = [/!\s+/, /:\s+/, /(?<!\.)\.\s+/].map((re) => re.exec(t)).find(Boolean);
  const head = at ? t.slice(0, at.index) : t, rest = at ? t.slice(at.index + at[0].length) : '';
  const trim = (s) => s.replace(/[!.:;,]+$/, '').replace(/(\w)\.{3}$/, '$1...').trim().toUpperCase();
  return [trim(head), trim(rest)];
}

const SIGN = '<svg viewBox="0 0 24 22" aria-hidden="true"><path d="M12 1.6 23 20.4H1z" fill="#ffd23a" stroke="#1a0303" stroke-width="1.7" stroke-linejoin="round"/>'
  + '<path d="M12 7.6v6.6" stroke="#1a0303" stroke-width="2.7" stroke-linecap="round"/><circle cx="12" cy="17.2" r="1.5" fill="#1a0303"/></svg>';
const CHEVRON = '<svg class="tk-chev" viewBox="0 0 16 12" aria-hidden="true"><path d="M2 1.5 6.5 6 2 10.5M8.5 1.5 13 6l-4.5 4.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const CSS = `
  #ticker { position: fixed; left: 0; right: 0; top: 0; z-index: 8; height: 2.1em; display: flex; align-items: stretch; overflow: hidden; pointer-events: none;
    font: 900 17px/1 Cinzel, Georgia, serif; letter-spacing: .07em; color: #fff;
    background: linear-gradient(#c0170f, #8a0a07 42%, #5c0505 100%);
    box-shadow: inset 0 1px 0 #ff6a4c, inset 0 -1px 0 #ff3b24, 0 2px 0 rgba(20,0,0,.85), 0 0 22px rgba(255,36,14,.45);
    transform: translateY(-115%); transition: transform .22s cubic-bezier(.2,.9,.3,1.15); }
  #ticker.on { transform: none; animation: tkThrob 1.8s ease-in-out infinite; }
  /* (A faint diagonal grain that keeps running, so the bar looks alive even between calls.) */
  #ticker::before { content: ''; position: absolute; top: 0; bottom: 0; left: 0; right: -2.2em; opacity: .14;
    background: repeating-linear-gradient(-45deg, #000 0 .5em, transparent .5em 1em); animation: tkGrain 1.1s linear infinite; }
  /* (The flash as a call comes in: a hot white-red wash over the whole bar, three beats.) */
  #ticker::after { content: ''; position: absolute; inset: 0; opacity: 0; background: linear-gradient(#fff3d8, #ff5a2a 60%, #ff2a10); mix-blend-mode: screen; }
  #ticker.flash::after { animation: tkFlash .95s ease-out; }
  #ticker .tk-tag { position: relative; z-index: 1; flex: none; display: flex; align-items: center; gap: .45em; padding: 0 1.25em 0 .7em;
    background: linear-gradient(#240404, #0c0101); clip-path: polygon(0 0, calc(100% - .85em) 0, 100% 50%, calc(100% - .85em) 100%, 0 100%);
    font-size: .74em; letter-spacing: .24em; color: #ffd23a; text-shadow: 0 0 8px rgba(255,170,40,.55); }
  #ticker.on .tk-tag span { animation: tkBlink 1.1s steps(1, end) infinite; }
  #ticker .tk-tag svg { width: 1.55em; height: 1.42em; flex: none; filter: drop-shadow(0 0 4px rgba(255,190,40,.7)); }
  #ticker.on .tk-tag svg { animation: tkSign 1.1s ease-in-out infinite; }
  #ticker .tk-lane { position: relative; z-index: 1; flex: 1; min-width: 0; overflow: hidden;
    -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 1.2em, #000 calc(100% - 1.6em), transparent 100%);
    mask-image: linear-gradient(90deg, transparent 0, #000 1.2em, #000 calc(100% - 1.6em), transparent 100%); }
  #ticker .tk-call { position: absolute; left: 0; top: 0; bottom: 0; display: flex; align-items: center; white-space: nowrap; will-change: transform;
    text-shadow: 0 1px 0 #2a0000, 0 2px 3px rgba(0,0,0,.75), 0 0 10px rgba(0,0,0,.45); }
  #ticker .tk-call i { flex: none; width: .5em; height: .5em; margin-right: .75em; transform: rotate(45deg); background: #ffd23a; box-shadow: 0 0 0 1.5px #3a0606, 0 0 8px rgba(255,200,60,.85); }
  #ticker .tk-call em { font-style: normal; font-weight: 700; color: #ffdca0; }
  #ticker .tk-chev { width: .95em; height: .72em; margin: 0 .6em; color: #ffd23a; filter: drop-shadow(0 1px 1px #2a0000); }
  #ticker .tk-said { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  @keyframes tkFlash { 0% { opacity: .95; } 16% { opacity: .08; } 30% { opacity: .78; } 46% { opacity: .05; } 60% { opacity: .5; } 100% { opacity: 0; } }
  @keyframes tkThrob { 50% { box-shadow: inset 0 1px 0 #ff8a66, inset 0 -1px 0 #ff5236, 0 2px 0 rgba(20,0,0,.85), 0 0 34px rgba(255,46,16,.75); } }
  @keyframes tkGrain { to { transform: translateX(-1.4142em); } }
  @keyframes tkBlink { 50% { color: #ff4a2e; text-shadow: 0 0 10px rgba(255,60,30,.9); } }
  @keyframes tkSign { 50% { transform: scale(.86); filter: drop-shadow(0 0 7px rgba(255,90,40,.95)); } }
  body.touch { --st: calc(env(safe-area-inset-top, 0px) + var(--tk-dy, 0px)); }
  body.touch #ticker { top: env(safe-area-inset-top, 0px); font-size: calc(12.5 * var(--u, 1px)); }
  body.ui-bare #ticker { visibility: hidden !important; }
  @media (prefers-reduced-motion: reduce) { #ticker::before, #ticker.on, #ticker.on .tk-tag svg { animation: none; } }
`;

export class Ticker {
  constructor() {
    const css = document.createElement('style');
    css.textContent = CSS;
    document.head.appendChild(css);
    this.el = document.createElement('div'); this.el.id = 'ticker';
    this.el.innerHTML = `<div class="tk-tag">${SIGN}<span>Emergency</span></div><div class="tk-lane" aria-hidden="true"></div><div class="tk-said" aria-live="assertive"></div>`;
    this.lane = this.el.querySelector('.tk-lane');
    this.said = this.el.querySelector('.tk-said');
    document.body.appendChild(this.el);
    this.calls = []; this.raf = 0; this.last = 0; this.moved = new Map();
    this.tick = (now) => this.step(now);
  }

  // The top of the screen's things slide down out of the bar's way (by), or back up (0). (By the Web Animations API, on
  // `translate`, so none of their own transforms or fades is touched; and once back up, nothing is left on them. On a
  // phone, on --tk-dy, which every piece along the top is set down by.)
  room(by) {
    const fit = { duration: 220, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'forwards' };
    if (document.body.classList.contains('touch')) {
      const from = getComputedStyle(document.body).getPropertyValue('--tk-dy').trim() || '0px';
      this.phone?.cancel();
      const a = this.phone = document.body.animate([{ '--tk-dy': from }, { '--tk-dy': `${by}px` }], fit);
      if (!by) a.onfinish = () => { a.cancel(); if (this.phone === a) this.phone = null; };
      return;
    }
    for (const e of MAKE_ROOM.map((id) => document.getElementById(id)).filter(Boolean)) {
      const from = getComputedStyle(e).translate;
      this.moved.get(e)?.cancel();
      if (!by && (from === 'none' || from === '0px')) { this.moved.delete(e); continue; }
      const a = e.animate([{ translate: from === 'none' ? '0px 0px' : from }, { translate: `0px ${by}px` }], fit);
      if (!by) a.onfinish = () => { a.cancel(); this.moved.delete(e); };
      this.moved.set(e, a);
    }
  }

  // How far the top of the screen's things must come down to clear the bar, with a little room under it.
  roomNeeded() {
    const phone = document.body.classList.contains('touch');
    const tops = (phone ? PHONE_TOP : MAKE_ROOM).map((id) => document.getElementById(id)?.getBoundingClientRect()).filter((r) => r && r.width > 0 && r.height > 0).map((r) => r.top);
    return tops.length ? Math.max(0, Math.ceil(this.el.offsetTop + this.el.offsetHeight + (phone ? 3 : 6) - Math.min(...tops))) : 0;
  }

  // A call to crawl along the bar. (The same call again while it's still on the bar only flashes it.)
  push(text) {
    const [head, rest] = callParts(text);
    if (!head) return;
    const key = `${head}|${rest}`;
    this.show();
    this.flash();
    this.said.textContent = text;
    if (this.calls.some((c) => c.key === key && c.x > 0)) return;
    const el = document.createElement('div'); el.className = 'tk-call';
    el.append(document.createElement('i'), Object.assign(document.createElement('b'), { textContent: head }));
    if (rest) { el.insertAdjacentHTML('beforeend', CHEVRON); el.append(Object.assign(document.createElement('em'), { textContent: rest })); }
    this.lane.appendChild(el);
    const em = parseFloat(getComputedStyle(this.lane).fontSize) || 17, laneW = this.lane.clientWidth;
    const tail = this.calls.at(-1);
    const x = Math.max(laneW, tail ? tail.x + tail.w + GAP * em : -Infinity);
    const call = { key, el, x, w: el.offsetWidth };
    el.style.transform = `translate3d(${x}px,0,0)`;
    this.calls.push(call);
    if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame(this.tick); }
  }

  step(now) {
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    const em = parseFloat(getComputedStyle(this.lane).fontSize) || 17, laneW = this.lane.clientWidth || 1;
    // (How far the newest call still is from coming on: the further, the faster the belt, up to RUSH times.)
    const wait = Math.max(0, (this.calls.at(-1)?.x ?? 0) - laneW);
    const v = SPEED * em * (1 + Math.min(1, wait / (0.5 * laneW)) * (RUSH - 1));
    for (const c of this.calls) { c.x -= v * dt; c.el.style.transform = `translate3d(${c.x.toFixed(1)}px,0,0)`; }
    while (this.calls.length && this.calls[0].x + this.calls[0].w < 0) this.calls.shift().el.remove();
    if (this.calls.length) this.raf = requestAnimationFrame(this.tick);
    else { this.raf = 0; this.hide(); }
  }

  show() {
    if (this.el.classList.contains('on')) return;
    this.room(this.roomNeeded());
    this.el.classList.add('on');
  }

  hide() {
    this.el.classList.remove('on', 'flash');
    this.room(0);
  }

  flash() {
    this.el.classList.remove('flash');
    void this.el.offsetWidth; // (so the flash runs again from the start)
    this.el.classList.add('flash');
  }

  // Off the bar at once: out of the delve, or the party wiped.
  clear() {
    for (const c of this.calls) c.el.remove();
    this.calls = [];
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.hide();
  }
}
