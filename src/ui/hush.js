// A boss's teaching line on the screen (src/ui/party.js warn: what it does, and what to do about it): the rest of the
// screen's news holds its tongue till it's been read. A level, a find, a quest's toast, auto-play's banners wait their turn
// (src/main.js tip, src/ui/folk.js note, src/ui/autoshow.js), so the one line that matters isn't read through five others.
let until = 0;
export const hush = (secs) => { until = Math.max(until, performance.now() + secs * 1000); };
export const hushed = () => performance.now() < until;
// f now, or once the line's gone.
export const afterHush = (f) => { const w = until - performance.now(); if (w > 0) setTimeout(f, w + 150); else f(); };
// (Long enough to be a lesson, not a call: "He charges! Out of the line." is a call, and the fight's, and doesn't hush.)
export const LESSON = 90;
