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
  const died = recent && last.ended === false ? { stage: last.stage, mins: last.mins || 0, where: last.where || '', gpu: last.gpu || '' } : null;
  const early = recent && (last.stage !== 'playing' || (last.mins || 0) < PC_EARLY_MINS);
  if (pc ? early && (died || last.ended === 'gpu') : died) light = Math.min(LIGHT_MOST, light + 1);
  if (params.has('light')) light = Math.max(0, Math.min(LIGHT_MOST, Number(params.get('light')) || 0));
  write(LIGHT_KEY, light);
  note = { at: Date.now(), stage: 'starting', ended: false, mins: 0, where: '', gpu: '', deaths: (last?.deaths || 0) + (died ? 1 : 0) };
  write(KEY, note);
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

/** How a death reads to the player: "while it was loading", "12 minutes into play, at (-40, 212)". */
export function deathWords(d) {
  if (d.stage === 'playing') return `${d.mins < 1 ? 'in the first minute of play' : `${Math.round(d.mins)} minute${Math.round(d.mins) === 1 ? '' : 's'} into play`}${d.where ? `, ${d.where}` : ''}`;
  return d.stage === 'title' ? 'at the main menu' : 'while it was loading';
}
