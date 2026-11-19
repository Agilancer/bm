// The game out of sight: another tab in front, the window put down, a phone on another app. A browser stops the frames
// (requestAnimationFrame) then, and slows the page's own timers to one a second, or one a minute after five; a worker's
// timer it leaves alone, and a message from one comes in on time. So while the page is hidden a little worker beats, and
// each beat is a frame for everything but the picture (GameView.run in src/main.js). Visible, it's still.
//
// (What a browser does past that is its own: Chrome keeps a tab that's playing sound awake, which is why the sound plays
// on unless Settings says not; an iPhone stops a page the moment it's left, and nothing a page can do keeps it going.)

const SRC = 'let t = 0; onmessage = (e) => { clearInterval(t); t = e.data > 0 ? setInterval(() => postMessage(0), e.data) : 0; };';

export function beat(ms, fn) {
  let w;
  try { w = new Worker(URL.createObjectURL(new Blob([SRC], { type: 'text/javascript' }))); } catch { return null; }
  w.onmessage = () => { if (document.hidden) fn(performance.now()); };
  const set = () => w.postMessage(document.hidden ? ms : 0);
  document.addEventListener('visibilitychange', set);
  set();
  return w;
}

// The screen kept on while auto-play plays, so a phone left on the table doesn't go dark and stop it. (A browser lets the
// lock go by itself when the page is hidden; it's asked for again when it's back.)
let lock = null, asking = false;
export function keepAwake(want) {
  if (!navigator.wakeLock) return;
  if (want && !lock && !asking && !document.hidden) {
    asking = true;
    navigator.wakeLock.request('screen').then((l) => { lock = l; l.addEventListener('release', () => { if (lock === l) lock = null; }); })
      .catch(() => { /* (refused: low battery, or no gesture yet) */ }).finally(() => { asking = false; });
  } else if (!want && lock) { const l = lock; lock = null; l.release().catch(() => {}); }
}
