// The cave, told on one clock (docs/OPENING-SCRIPT.md): what she says from the flash to the name prompt, the
// silences and moves between, and the moments the rest of the game keys off, laid end to end by how long each line takes
// to say. A recorded line takes its recording's length (src/core/voiced.js); one not yet recorded, her measured pace. So
// the scene re-times itself as the recordings come in. (Shared by the sim, the screen, the sound and the cave's drawing.)
import { VOICE_SECONDS } from './voiced.js';
import { voiceKey } from './voicekey.js';

// Before the flash, set by hand: your eyes come open (if hazy) at GLAMOUR_AT, and the flash breaks the glamour at SWAP_AT.
export const GLAMOUR_AT = 7.6;
export const SWAP_AT = 22.0;
const OLD = 'LisandraWitch', YOUNG = 'Lisandra';
const GAP = 0.45;           // s between one line and the next, unless a line says otherwise
const MAX_SUB = 90;         // characters a subtitle holds; a longer line is shown in parts

// How long a line takes her to say: its recording, or her pace (the old voice about 11.8 characters a second on long
// lines, slower on short ones, as measured on her takes; the young a little quicker), with a breath either side.
const SECS = new Map();
for (const [v, s] of Object.entries(VOICE_SECONDS || {})) {
  for (const e of s.split(' ')) { const [k, n] = e.split(':'); if (n) SECS.set(`${v}/${k}`, Number(n)); }
}
export function speechSecs(voice, text) {
  const rec = SECS.get(`${voice}/${voiceKey(text)}`);
  if (rec) return rec;
  const n = text.length, q = voice === YOUNG ? 1.08 : 1;
  return n / ((n >= 40 ? 11.8 : n >= 20 ? 9.9 : 7.9) * q) + 0.3;
}

// How long a line takes to read in a bubble: READ_CPS characters a second, and a moment to find it.
export const READ_CPS = 15;
export const readSecs = (text) => text.length / READ_CPS + 0.6;

// A scene, in order. w: seconds of silence (her moves) before; m: a moment named there; hold: seconds held after the
// moment, before what comes next. A line: its words, and as in opening-script.js (emote, feel, big, mutter, say); eye: the
// view eases back to her for it; gap: seconds to the next instead of GAP; young: said in her young voice.
// The cave, from the flash to the name prompt.
const STORY = [
  // Seen. She snatches her hand back and scrambles two steps away, her hands up; then they come down, slowly.
  { w: 1.6, m: 'oh', text: '…You’re looking straight at me.' },
  { w: 0.5, m: 'drop', text: 'Not at the girl. At me.', emote: 'sweat', feel: 2.2 },
  // The snap. She backs away among her things, working her cold fingers, and raises the right hand at you.
  { w: 0.5, m: 'backOff', hold: 2.4 },
  { m: 'aim', text: 'Hold still. It doesn’t hurt. It never hurts.' },
  // SNAP. The door's hum cuts dead; a breath of silence; the candles catch in a wave from her hand, past you, and the
  // fire in her hearth with them.
  { w: 0.3, m: 'snap', hold: 1.0 },
  { m: 'candles', hold: 1.8 },
  // She comes back through her things, watching your eyes the whole way, stops close, and leans in.
  { m: 'comeBack', hold: 3.0 },
  { m: 'lean', text: 'That was a charm. Whoever it touches believes the next thing I say.', eye: true },
  { text: 'It has worked on forty-three people. It hasn’t worked on you.' },
  // And then she sees your hand: embers on your knuckles.
  { w: 0.6, m: 'steps', text: '…And what is that in your hand? Look down.', eye: true, emote: 'question', feel: 1.8 },
  // The view tips down to your staff. Cast, and a spark leaps to the nearest candle; or it goes on its own after the wait.
  { m: 'hands', hold: 1.1 },
  // (A first time, mid-scene, finding the key takes a while: she waits, eggs you on, and only then does it go by itself.)
  { m: 'cast', hold: 7.0 },
  { m: 'goOn', text: 'Go on. Throw it.' },
  { w: 2.4, m: 'spark', hold: 1.6 },
  { m: 'magic', text: 'Magic. Nobody has been born with that since the Dark Lord drank it all, to live.' },
  // Who she is. Her hand to her heart, and a slow, stiff bow. Her name comes up.
  { w: 0.5, m: 'bow', hold: 1.3 },
  { m: 'named', text: 'My name is Lisandra. The girl was a glamour. Nobody follows an old woman into a war.' },
  // The old story, told at her hearth: she crosses to it, holds her hands to the fire, and tells it into the flames; then
  // turns, and her hand goes out past you, at the door you came through.
  { w: 0.5, m: 'toHearth', text: 'Two hundred years ago, a stranger broke the Dark Lord Velscour on his own throne.' },
  { w: 0.3, m: 'turn', text: 'We called him Tessariel. He left by that door, and swore to come back if his enemy ever rose.' },
  { w: 0.3, text: 'Forty years ago, the Dark Lord rose. I’ve called through that door every night since.' },
  // The forty-three. She looks down the room to the ledger on its stand by the tunnel; then at the floor.
  { w: 0.6, m: 'ledger', text: 'A season ago, the door began to answer. Forty-three times, and always the wrong person.' },
  { text: 'I told each of them what I told you, and sent them off to fight him.' },
  { w: 0.4, m: 'shame', text: 'I had stopped believing the real one would come.', mutter: true, emote: 'gloom', feel: 2.6 },
  // Back across the cave to you.
  { w: 0.7, m: 'toYou', text: 'But you saw through me. And you came through with fire in your hand.', eye: true },
  // Who you are. A slow half circle round you, to stand between you and the door.
  { w: 0.4, m: 'round', text: 'So I’ll say it again, and this time it’s true.', eye: true },
  // On the name, the door's hum comes back for one breath, the portal swells and every flame leans toward you.
  { w: 1.2, m: 'reveal', text: 'You are Tessariel. You said you’d come back, and you have.', eye: true },
  { w: 1.0, m: 'after' },
  // What to do. She points down the cave, to the tunnel and the world.
  { w: 0.5, m: 'pointOut', text: 'Take the Long Road down the hill to Bellmourn. They need help there, and you need practice.' },
  // The name. She comes round in front of you, and only now holds out her hand: the old one.
  { w: 0.5, m: 'toOffer', hold: 2.6 },
  { m: 'offer', text: 'Tessariel is what we called you. What did they call you, on the far side?', eye: true },
  { w: 0.5, m: 'prompt' },
];

// She takes the name where she stands, and sends you out ahead of her. You can't look or walk till she's done.
const HERD_STORY = [
  { w: 0.3, m: 'name', text: '{name}.', say: '', secs: 1.6 },
  { w: 0.3, m: 'book', text: 'Good. That goes in the book: the first name in it I didn’t choose.' },
  { w: 0.4, m: 'point', text: 'The way out is down that tunnel. Go on ahead of me.' },
  { w: 0.3, m: 'go' },
  { w: 0.1, m: 'control' },
  { w: 0.5, m: 'end' },
];

// The ledge, once she's out of the dust and has had it out with you (from FALL_FROM: before that the scene is set by
// hand, to the falling rock). She's lovely again, in the sun, and says the rest in her young voice.
export const FALL_FROM = 15.2;
const FALL_STORY = [
  { m: 'rubble', text: 'Two hundred years I kept that door open. You walk through it once, and it lets go.' },
  { text: 'It was only ever waiting for you.', mutter: true },
  // Back to you, and she catches you looking; then down at her own hands, in the sun.
  { w: 1.0, m: 'catch', text: '…Why are you staring at me like that?', emote: 'question', feel: 2.2 },
  { w: 0.9, m: 'sun', text: 'Oh. The sun. That’s no glamour: daylight gives me back the face I had when I took up the door.' },
  // (Lost her home: she says so on the road, with the kettle. What she'll be in town is her first line on the way down.)
  { w: 0.8, m: 'home', hold: 2.6 },
  { m: 'coming', text: 'So I’m coming to Bellmourn with you, {name}. Somebody has to get you down this road in one piece.', say: 'So I’m coming to Bellmourn with you. Somebody has to get you down this road in one piece.' },
  { w: 0.6, m: 'end' },
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

// Laid out: a scene's lines (as opening-script.js has them), and when each of its moments comes.
function lay(story, from, voice) {
  const marks = {}, lines = [];
  let t = from, named = false;
  for (const e of story) {
    t += e.w || 0;
    if (e.m) marks[e.m] = t;
    if (e.m === 'named') named = true;
    if (e.text) {
      // (As long as it takes to read: her words are read, not heard. Her recordings aren't played.)
      const said = e.say ?? e.text, secs = e.secs ?? readSecs(e.text);
      const { w, m, hold, gap, eye, ...rest } = e;
      lines.push({ ...rest, at: Math.round(t * 100) / 100, dur: Math.max(1.5, secs + 0.35, e.text.length / 15), secs, eye: !!eye, named, parts: parts(e.text, secs) });
      t += secs + (gap ?? GAP);
    }
    t += e.hold || 0;
  }
  return { marks, lines };
}
const cave = lay(STORY, SWAP_AT, OLD), herd = lay(HERD_STORY, 0, OLD), fall = lay(FALL_STORY, FALL_FROM, YOUNG);
export const CAVE = cave.marks, CAVE_LINES = cave.lines;
export const HERD = herd.marks, HERD_LINES = herd.lines;
export const FALL = fall.marks, FALL_LINES = fall.lines;
export const SNAP_AT = CAVE.snap;          // her snap: the drone cuts dead
export const CANDLES_AT = CAVE.candles;    // the candles pop alight
export const REVEAL_AT = CAVE.reveal;      // "You are Tessariel.": the door breathes once more
export const CAST_AT = CAVE.cast;          // the spark waits on you from here,
export const SPARK_AT = CAVE.spark;        // and goes on its own here
export const NAME_AT = CAVE.prompt;        // the name prompt
