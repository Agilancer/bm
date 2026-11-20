// What the game was doing when the page last went away, kept in this browser, so a start can tell a page that was closed
// from one the browser killed. A phone's browser kills a page that asks for more memory than it'll give: the screen goes
// white and the page loads again, with nothing said and nothing a page can catch. So the game leaves a note as it goes
// (loading, at the title, playing and for how long and where), marks it when the page is left or hidden in the ordinary
// way, and a note found unmarked at the next start is a page that died. src/main.js tells the player so, offers Continue,
// and on a phone starts lighter (LIGHT below). README.md, "When the browser closes the game".

const KEY = 'velscour.lastRun', LIGHT_KEY = 'velscour.light';
const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* no storage, or full */ } };

// How much lighter a phone loads, from how often it's been killed: 0 as the tier says, 1 after one death, 2 after another.
// (What each level does is where it's used: the models' pictures in src/gfx/gpu.js lighten. Never the other heroes'
// number: a party for the Warrens is hired from them. tests/crash-party.test.mjs.) ?light=N sets it by hand, and keeps it.
export const LIGHT_MOST = 2;
// On a PC, how soon into play a death or a lost GPU says the game didn't fit (beginRun pc).
export const PC_EARLY_MINS = 5;

let note = null;

/**
 * At a start, before anything else: the last run's note, taken and judged, and a new one begun.
 * Returns { died, light }: died is null, or { stage, mins, where, gpu } of a run the browser ended; light is the level to load at.
 * pc: on a PC (where the level steps Auto's graphics down: src/gfx/gpu.js lighterPC) only a run that went while it loaded or
 * in its first few minutes of play counts, the way a page that wants more memory than there is goes; and so does a GPU lost
 * then, which a laptop's GPU on the processor does when the game's pictures don't fit in the memory it shares.
 */
export function beginRun(params = new URLSearchParams(), { pc = false } = {}) {
  const last = read(KEY);
  let light = Math.max(0, Math.min(LIGHT_MOST, Number(read(LIGHT_KEY)) || 0));
  // (A note a week old is no news. One that says the GPU was lost was the game's own reload: src/main.js device.lost.)
  const recent = last && Date.now() - last.at < 7 * 86400e3;
  // (after: how long the note went on being kept after the trail's last word, the note being kept every 8 s while the page
  // is seen: whether that last thing did it, or the game kept going a while.)
  const lastE = last?.trail?.at(-1);
  const after = lastE && last.at0 ? Math.max(0, Math.round((last.at - last.at0) / 1000) - lastE.s) : 0;
  const died = recent && last.ended === false ? { stage: last.stage, mins: last.mins || 0, where: last.where || '', gpu: last.gpu || '', ...(last.trail?.length ? { trail: last.trail, after } : {}) } : null;
  const early = recent && (last.stage !== 'playing' || (last.mins || 0) < PC_EARLY_MINS);
  // (And either kind, at any time, after the GPU said it was out of memory: src/main.js, the device's uncapturederror.)
  // (A phone that lost its GPU, at any time: it takes it back for want of memory as often as for anything, and one that
  // loses it every run would otherwise come back the same weight every time.)
  if ((pc ? early && (died || last.ended === 'gpu') : died || (recent && last.ended === 'gpu')) || (recent && last.oom)) light = Math.min(LIGHT_MOST, light + 1);
  if (params.has('light')) light = Math.max(0, Math.min(LIGHT_MOST, Number(params.get('light')) || 0));
  write(LIGHT_KEY, light);
  // (Begun out of sight, as a reload for a lost GPU can be: put away already, so a page let go there isn't taken for one that died.)
  const unseen = typeof document !== 'undefined' && document.hidden === true;
  note = { at: Date.now(), at0: Date.now(), stage: 'starting', ended: unseen ? 'hidden' : false, mins: 0, where: '', gpu: '', deaths: (last?.deaths || 0) + (died ? 1 : 0), trail: [] };
  write(KEY, note);
  // Kept every 8 s while the page is seen, in a menu or on the map as in play (where src/main.js keeps it too, with how long
  // and where), so `after` above says how long the game went on.
  if (typeof setInterval === 'function') setInterval(() => { if (note?.ended === false) { note.at = Date.now(); write(KEY, note); } }, 8000)?.unref?.();
  if (typeof addEventListener === 'function') {
    // Left or put away in the ordinary way; and back again.
    addEventListener('pagehide', () => noteRun({ ended: 'left' }));
    addEventListener('pageshow', () => { if (note.ended === 'left') noteRun({ ended: false }); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { if (note.ended === false) noteRun({ ended: 'hidden' }); } else if (note.ended === 'hidden') noteRun({ ended: false });
    });
  }
  return { died, light };
}

/** The note brought up to date: stage ('loading', 'title', 'playing'), mins played, where, gpu (what it was doing), ended. */
export function noteRun(patch) {
  if (!note) return;
  Object.assign(note, patch, { at: Date.now() });
  write(KEY, note);
}

// The last few things that happened, kept in the note as they happen: a touch, the screen turned or its size changed, a
// field to type in, a skip, the picture's size stepped. Nothing can catch the kill, so what came just before it is the only
// account there is of what did it, and the player is shown it to pass on (src/main.js diedOffer).
const TRAIL = 8;
let trailAt = 0;
/** One thing that happened, in a few words ('touched', 'turned upright'). The same again within 2 s is counted, not added. */
export function noteEvent(what) {
  if (!note) return;
  const t = Date.now(), trail = (note.trail ||= []);
  const last = trail[trail.length - 1];
  if (last && last.e === what && t - trailAt < 2000) last.n = (last.n || 1) + 1;
  else { trail.push({ s: Math.round((t - (note.at0 || t)) / 1000), e: what }); if (trail.length > TRAIL) trail.shift(); }
  trailAt = t;
  note.at = t;
  write(KEY, note);
}

/** The trail as the player reads it, each thing in words with the time since the one before: "touched (x3), then 4 s later
 *  turned upright". (The time between one and the next, as that's all it knows: nothing notes the kill itself.) The
 *  picture's size stepping, noted as 'picture x0.66', reads as its sharpness, and steps one after another the same way, no
 *  more than ten seconds apart, as one: "the picture's sharpness eased back up, 66% to 100% over 12 s" (the game does that
 *  after a slowdown: src/gfx/governor.js); a turn the other way starts another, from where the last one ended. */
function trailItems(d) {
  const items = [];
  const way = (a, b) => Math.sign(b - a);
  for (const x of d?.trail || []) {
    const m = /^picture x([\d.]+)$/.exec(x.e), prev = items[items.length - 1];
    if (m && prev?.pics && x.s - prev.s1 <= 10) {
      const v = +m[1], p = prev.pics, last = p[p.length - 1];
      const run = p.length > 1 ? way(p[0], last) : 0, step = way(last, v);
      if (!run || !step || run === step) { p.push(v); prev.s1 = x.s; continue; }
      items.push({ s: prev.s1, s1: x.s, pics: [last, v], turn: true });
      continue;
    }
    items.push(m ? { s: x.s, s1: x.s, pics: [+m[1]] } : { s: x.s, s1: x.s, e: x.e, n: x.n });
  }
  // (A turn reads on from the run before it, "..., then back up, 76% to 100%", unless it's the first said.)
  const words = (t, i) => {
    if (!t.pics) return `${t.e}${t.n > 1 ? ` (x${t.n})` : ''}`;
    const p = t.pics.map((v) => `${Math.round(v * 100)}%`);
    if (p.length === 1) return `the picture's sharpness went to ${p[0]}`;
    const up = t.pics[t.pics.length - 1] > t.pics[0], on = t.turn && i > 0;
    return `${on ? '' : 'the picture\'s sharpness '}${up ? (on ? 'back up' : 'eased back up') : (on ? 'back down' : 'stepped down')}, `
      + `${p[0]} to ${p[p.length - 1]}${t.s1 > t.s ? ` over ${t.s1 - t.s} s` : ''}`;
  };
  const later = (g) => (g >= 90 ? `about ${Math.round(g / 60)} minutes later ` : `${g} s later `);
  const tr = items.slice(-4);
  return tr.map((t, i) => `${i && t.s > tr[i - 1].s1 ? later(t.s - tr[i - 1].s1) : ''}${words(t, i)}`);
}

/** The trail as one line: "touched (x3), then 4 s later turned upright". '' if there's none. */
export function trailWords(d) {
  return trailItems(d).join(', then ');
}

/** The trail as the title says it: "Just before: ...", or, when the game kept going a while after the last of it (the note
 *  being kept every 8 s while the page is seen: `after`), "The last things the game noted: .... It kept going about 3 more
 *  minutes after that." '' if there's no trail. */
export function trailSentence(d) {
  const items = trailItems(d);
  if (!items.length) return '';
  const w = items.join(', then '), a = d.after || 0;
  if (a < 10) return `Just before: ${w}.`;
  return `The last ${items.length > 1 ? 'things' : 'thing'} the game noted: ${w}. `
    + `It kept going about ${a >= 90 ? `${Math.round(a / 60)} more minutes` : `${a} more seconds`} after that.`;
}

/** How a death reads to the player: "while it was loading", "12 minutes into play, at (-40, 212)". */
export function deathWords(d) {
  if (d.stage === 'playing') return `${d.mins < 1 ? 'in the first minute of play' : `${Math.round(d.mins)} minute${Math.round(d.mins) === 1 ? '' : 's'} into play`}${d.where ? `, ${d.where}` : ''}`;
  return d.stage === 'title' ? 'at the main menu' : 'while it was loading';
}
