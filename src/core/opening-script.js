import { OPENING } from './opening.js';

// What Lisandra says in the opening, and when. You never speak. Times are seconds into each stage; dur is how long the line
// stays up (never under 1.5 s, never more than about 15 characters a second). vo: heard before she's seen. off: from out of
// sight. mutter: under her breath. big: shouted. words: revealed a word at a time from `from`, the last word landing at `land`.
export const SCRIPT = {
  [OPENING.WAKE]: [
    { at: 0.2, dur: 3.7, text: '…by the light that does not set… cross over. Come home.', vo: true },
    { at: 3.9, dur: 2.4, text: 'Shh. Everyone’s frightened at first.' },
    { at: 6.3, dur: 4.0, text: 'Let me be the first beautiful thing you—', words: true, from: 6.7, land: 9.0 },
    { at: 10.6, dur: 1.5, text: '…Oh.' },
    { at: 12.1, dur: 1.5, text: 'Oh, no.' },
    { at: 18.5, dur: 2.0, text: 'Right. The short version.' },
    { at: 20.7, dur: 5.3, text: 'You are Tessariel, reborn. Beacon of the Infinite. The light that does not set.' },
    { at: 26.2, dur: 4.3, text: 'You were brought here to kill Velscour, Dark Lord of Eldravayne.' },
    { at: 30.7, dur: 3.4, text: 'It’s foretold. Thoroughly. You’ll be marvellous.' },
    { at: 34.7, dur: 2.6, text: 'Of all the times to get it right.', mutter: true },
    { at: 37.7, dur: 3.3, text: 'Your name. The one you were born with. Quickly.' },
  ],
  // While the prompt waits: times since it came up.
  [OPENING.NAME]: [
    { at: 10, dur: 1.8, text: 'It’s your own name.' },
    { at: 20, dur: 2.2, text: 'You’ve had it all your life.' },
  ],
  [OPENING.HERD]: [
    { at: 0.3, dur: 1.7, text: '{name}.' },
    { at: 2.4, dur: 1.5, text: 'Lovely.' },
    { at: 4.3, dur: 1.8, text: 'Out’s through there.' },
    { at: 6.4, dur: 3.2, text: 'Go on. Don’t look at me. Don’t look at anything.' },
    { at: 9.9, dur: 3.3, text: 'I’ll be right behind you. I just need to… tidy.' },
  ],
  [OPENING.COLLAPSE]: [
    { at: 4.0, dur: 1.8, text: 'No— no, no, no—', off: true },
    { at: 12.0, dur: 2.0, text: 'WHAT HAVE YOU DONE?!', big: true },
    { at: 15.2, dur: 6.0, text: 'I’ve held that door open since before that town had a name. You walk through it once—' },
    { at: 23.6, dur: 2.8, text: '…Why are you looking at me like that?' },
    { at: 26.8, dur: 2.0, text: 'No. Don’t answer that.' },
    { at: 29.4, dur: 2.4, text: 'I seem to have lost my home.', mutter: true },
    { at: 32.4, dur: 1.6, text: 'Lisandra.', named: true },
    { at: 34.3, dur: 3.2, text: 'That town. You’re taking me there, {name}.', named: true },
    { at: 37.8, dur: 3.8, text: 'And if anyone screams when they see me— keep walking.', named: true },
  ],
};

// Said once, when something happens rather than at a time: walking out, and on the road down.
export const CUES = {
  back: { dur: 1.5, text: 'Out!' },
  back2: { dur: 1.5, text: 'OUT.', big: true },
  tunnel: { dur: 2.4, text: 'Hold. Please hold. Not now…', off: true },
  bend: { dur: 4.2, text: 'The others made speeches. Every one of them. On this road.' },
  woods: { dur: 4.6, text: 'Stay on the road. The dead in those pines don’t read prophecies.' },
  after: { dur: 1.8, text: '…You’ll do.', mutter: true },
  half: { dur: 3.0, text: 'Velscour used to laugh at his own jokes.' },
  half2: { dur: 2.0, text: 'Before. So I’m told.' },
  sight: { dur: 2.6, text: 'There it is. Let me do the talking.' },
  scream: { dur: 1.8, text: '[a scream]', caption: true },
  walk: { dur: 1.6, text: 'Keep walking.' },
  slow: { dur: 2.6, text: 'Slow down! Some of us just lost a cave.' },
  wait: { dur: 1.6, text: '{name}! Wait!' },
};
export const CUE_IDS = Object.keys(CUES);

// The line up at this moment of a stage, if any.
export function lineAt(stage, t) {
  const lines = SCRIPT[stage];
  if (!lines) return null;
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i];
    if (t >= l.at) return t < l.at + l.dur ? l : null;
  }
  return null;
}
