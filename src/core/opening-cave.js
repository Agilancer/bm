// The cave, told on one clock (docs/OPENING-SCRIPT.md, beats 1 to 10): what she says from the flash to the name prompt, the
// silences and moves between, and the moments the rest of the game keys off, laid end to end by how long each line takes
// to say. A recorded line takes its recording's length (src/core/voiced.js); one not yet recorded, her measured pace. So
// the scene re-times itself as the recordings come in. (Shared by the sim, the screen, the sound and the cave's drawing.)
import { VOICE_SECONDS } from './voiced.js';
import { voiceKey } from './voicekey.js';

// Before the flash, set by hand: your eyes come open (if hazy) at GLAMOUR_AT, and the flash breaks the glamour at SWAP_AT.
export const GLAMOUR_AT = 7.6;
export const SWAP_AT = 21.0;
const OLD = 'LisandraWitch';
const GAP = 0.45;           // s between one line and the next, unless a line says otherwise
const MAX_SUB = 90;         // characters a subtitle holds; a longer line is shown in parts

// How long a line takes her to say: its recording, or her pace (the old voice about 11.8 characters a second on long
// lines, slower on short ones, as measured on her takes), with a breath either side.
const SECS = new Map();
for (const [v, s] of Object.entries(VOICE_SECONDS || {})) {
  for (const e of s.split(' ')) { const [k, n] = e.split(':'); if (n) SECS.set(`${v}/${k}`, Number(n)); }
}
export function speechSecs(voice, text) {
  const rec = SECS.get(`${voice}/${voiceKey(text)}`);
  if (rec) return rec;
  const n = text.length;
  return n / (n >= 40 ? 11.8 : n >= 20 ? 9.9 : 7.9) + 0.3;
}

// The scene after the flash, in order. w: seconds of silence (her moves) before; m: a moment named there; hold: seconds
// held after the moment, before what comes next. A line: its words, and as in opening-script.js (emote, feel, big,
// mutter); eye: the view eases back to her for it; gap: seconds to the next instead of GAP.
const STORY = [
  // 2 · Seen. She snatches her hand back and scrambles two steps away.
  { w: 1.6, m: 'oh', text: '…Oh.' },
  // She steps in again, slowly, and passes her palm a hand's breadth across your eyes. You blink.
  { w: 0.3, m: 'stepIn', hold: 1.9 },
  { m: 'palm', hold: 1.7 },
  { text: 'You can see me.' },
  { text: 'Not the pretty one. Me.' },
  { w: 0.7, m: 'drop', text: 'Oh, no.', emote: 'sweat', feel: 2.2 },
  // 3 · The snap. She backs away into her clutter, working her cold fingers, and raises the right hand at you.
  { w: 0.4, m: 'backOff', hold: 3.4 },
  { m: 'aim', text: 'Hold still. It doesn’t hurt. It never hurts.' },
  // SNAP. The door's hum cuts dead; a breath of silence; the candles catch in a wave from her hand, past you.
  { w: 0.3, m: 'snap', hold: 1.0 },
  { m: 'candles', hold: 1.4 },
  // She comes back through her clutter, watching your eyes the whole way, stops close, and leans in.
  { m: 'comeBack', hold: 4.2 },
  { m: 'lean', text: 'There’s meant to be a look now. Soft. Grateful. Like a calf at a gate.', eye: true },
  { text: 'Not you. You’re still in there, looking back.' },
  // Her head turns to the ledger on the lectern by the tunnel: a page of names, every one struck through.
  { w: 0.6, m: 'ledger', text: 'Forty-three before you. Every one got the snap, the lights, and a pretty girl telling them who they were.' },
  { text: 'And every one of them believed it. I made sure.' },
  { w: 0.6, m: 'leanIn', text: 'I won’t have to make you believe anything. Will I.', emote: 'question', feel: 2.0 },
  // 4 · Why she's afraid. She steps back and folds her arms tight.
  { w: 1.0, m: 'fold', text: 'Nobody has ever seen through that face.' },
  { w: 0.5, m: 'hand', text: 'Kings have kissed this hand and called it soft.' },
  { w: 0.3, m: 'lookUp', text: 'The face held while your eyes were still waking.' },
  { text: 'The old songs give one pair of eyes that no glamour fools. The light that does not set.' },
  { text: 'That door was dark from the night the sky burned. It woke a season ago.' },
  { w: 0.4, m: 'circle', text: 'It drops the others in a ditch somewhere. Or a pigsty. It put you in my circle.' },
  { text: 'You’re not some poor farmer I dressed up in a prophecy.' },
  { w: 0.8, m: 'tremble', text: 'And the songs say you only come back when the dark is at its worst. Not a day before.', emote: 'sweat', feel: 2.4, eye: true },
  { text: 'And you see everything as it is. Me included.' },
  // 5 · Who you are. A slow half circle round you, to stand between you and the door.
  { w: 0.6, m: 'round', text: 'Two hundred years ago, you walked out of the sunrise and broke Velscour on his own throne.' },
  { text: 'You swore that if he ever rose again, you’d come back.' },
  { text: 'He rose. Slowly.' },
  { w: 0.6, m: 'door', text: 'And here you are. You kept your word.', eye: true },
  // On the name, the door's hum comes back for one breath, the portal swells and every flame leans toward you.
  { w: 1.0, m: 'reveal', text: 'Tessariel.', eye: true },
  { w: 1.3 },
  // 6 · Who she is. Her hand to her heart, and a slow, stiff bow. Her name comes up.
  { m: 'bow', hold: 2.6 },
  { m: 'named', text: 'I’m Lisandra. You won’t remember me.' },
  { text: 'I held your lantern on the last night of the war, the night the sky burned.' },
  { w: 0.5, m: 'cheek', text: 'The girl you saw was me. That was my face, the last time you saw it.' },
  // She sets off across the cave to the crate by the wall, talking as she goes.
  { w: 0.4, m: 'toCrate', text: 'The door keeps me alive while I keep it. It never promised to keep me young.' },
  { text: 'Down here, out of the sun, the dark keeps count.' },
  { w: 0.4, m: 'flick', text: 'And nobody follows a crone into a war. So I wear the girl.' },
  // 7 · Velscour. She sits on the crate, an old woman's sit, hands on her knees.
  { w: 0.5, m: 'sit', hold: 2.4 },
  { text: 'Before I carried your lantern, I was his.' },
  { w: 0.5, text: 'Velscour’s.' },
  // She looks up at the candles and gives a soft snap: the nearest flares.
  { w: 0.6, m: 'softSnap', hold: 1.3 },
  { text: 'He taught me the snap. Every candle in a winter market, all lit at once, just to make me laugh.' },
  { w: 0.6, m: 'holdHand', text: 'He was a healer, once.' },
  { w: 0.8, m: 'stand', hold: 1.9 },
  { text: 'The horns came later.' },
  // 8 · The magic. Two steps toward you, staring at your hands; the view tips down to your staff, embers on your knuckles.
  // Cast, and a spark leaps to the nearest candle; or it goes on its own after CAST_WAIT.
  { w: 0.5, m: 'steps', hold: 1.7 },
  { m: 'hands', hold: 1.1 },
  { m: 'cast', hold: 4.0 },
  { m: 'spark', hold: 1.6 },
  { text: 'And then there’s that.' },
  { text: 'I gave them swords, spears, bows. One asked for a lute. One asked for a boomerang, and I still don’t know why.' },
  { text: 'I sent them all out in your colours, so he’d chase forty-three Tessariels and never find you.' },
  { text: 'Not one of them came through with fire in their hands.', eye: true },
  { text: 'Nobody’s been born with magic since you broke him. He drank every spark to live.' },
  { w: 0.4, m: 'own', text: 'All but a few old tricks, like mine.' },
  { w: 0.4, m: 'yours', text: 'Every spark you throw is one he’s lost. He’ll know it, on his throne.' },
  { text: 'A thing like him doesn’t feel its grip slip and let go. It squeezes.' },
  // 9 · How bad it gets. Still, looking down the tunnel toward the world; then pacing, faster and faster, the candles
  // guttering and dust sifting down; then she stops dead.
  { w: 1.0, m: 'grim', text: 'Mothers will hide their children in root cellars, and the cellars won’t be deep enough.' },
  { w: 0.5, m: 'climb', text: 'His bell already rings at midnight with no hand on the rope. Soon it’ll ring at noon.', gap: 0.3 },
  { text: 'His knights will stop guarding doors, and start kicking them in.', gap: 0.25 },
  { text: 'Three heads in his Rift, and all of them hungry.', gap: 0.2 },
  { text: 'The dead will come up under Bellmourn.', gap: 0.15 },
  { text: 'They won’t wait for dark.', gap: 0.1 },
  { m: 'shout', text: 'And he’ll send it all after you! Every knight! Every dead thing! Every—', say: 'And he’ll send it all after you. Every knight. Every dead thing. Every—', big: true, emote: 'panic', feel: 3.0, gap: 0 },
  { w: 1.1, m: 'stop', text: '…I’m doing it again.', mutter: true, emote: 'gloom', feel: 3.2 },
  { text: 'Two hundred years, and nobody to say it to.' },
  // 10 · The name.
  { w: 1.0, m: 'straight', text: 'So. The real one. Of all the times to get it right.' },
  { m: 'toOffer', text: 'Go down to Bellmourn. Learn what those hands can do. And then finish him.' },
  { text: 'I can’t come with you. Somebody has to mind the door.' },
  // Only now does she hold out her hand to you: the old hand, where the young one was held out at the start.
  { w: 0.6, m: 'offer', text: 'Your name. The one you were born with. The others, I named.', eye: true },
  { w: 0.5, m: 'prompt' },
];

// A line too long for one subtitle is shown in parts, split at a sentence break (or a comma), each up when her voice gets
// to it: [text, seconds into the line].
function parts(text, secs) {
  if (text.length <= MAX_SUB) return null;
  const cut = (re) => {
    let best = -1;
    for (const m of text.matchAll(re)) { const i = m.index + m[0].length - 1; if (Math.abs(i - text.length / 2) < Math.abs(best - text.length / 2)) best = i; }
    return best;
  };
  let i = cut(/[.?!…](?= )/g);
  if (i < 0) i = cut(/,(?= )/g);
  if (i < 0) return null;
  const a = text.slice(0, i + 1), b = text.slice(i + 2);
  return [[a, 0], [b, secs * (a.length + 1) / text.length]];
}

// Laid out: the lines (as opening-script.js has them, every one in the old voice), and when each moment comes.
export const CAVE = {};
export const CAVE_LINES = [];
{
  let t = SWAP_AT, named = false;
  for (const e of STORY) {
    t += e.w || 0;
    if (e.m) CAVE[e.m] = t;
    if (e.m === 'named') named = true;
    if (e.text) {
      const said = e.say ?? e.text, secs = speechSecs(OLD, said);
      const { w, m, hold, gap, eye, ...rest } = e;
      CAVE_LINES.push({ ...rest, at: Math.round(t * 100) / 100, dur: Math.max(1.5, secs + 0.35, e.text.length / 15), secs, eye: !!eye, named, parts: parts(e.text, secs) });
      t += secs + (gap ?? GAP);
    }
    t += e.hold || 0;
  }
}
export const SNAP_AT = CAVE.snap;          // her snap: the drone cuts dead
export const CANDLES_AT = CAVE.candles;    // the candles pop alight
export const REVEAL_AT = CAVE.reveal;      // "Tessariel.": the door breathes once more
export const CAST_AT = CAVE.cast;          // the spark waits on you from here,
export const SPARK_AT = CAVE.spark;        // and goes on its own here
export const NAME_AT = CAVE.prompt;        // the name prompt
// The climb in beat 9: from its first line to the stop.
export const CLIMB = [CAVE.climb, CAVE.stop];
