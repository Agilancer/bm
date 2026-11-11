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

// A scene, in order. w: seconds of silence (her moves) before; m: a moment named there; hold: seconds held after the
// moment, before what comes next. A line: its words, and as in opening-script.js (emote, feel, big, mutter, say); eye: the
// view eases back to her for it; gap: seconds to the next instead of GAP; young: said in her young voice.
// The cave, from the flash to the name prompt.
const STORY = [
  // Seen. She snatches her hand back and scrambles two steps away, her hands up; then they come down, slowly.
  { w: 1.6, m: 'oh', text: '…You’re looking straight at me.' },
  { w: 0.5, m: 'drop', text: 'Not at the girl. At me.', emote: 'sweat', feel: 2.2 },
  // The snap. She backs away among her things, working her cold fingers, and raises the right hand at you.
  { w: 0.5, m: 'backOff', hold: 3.2 },
  { m: 'aim', text: 'Hold still. It doesn’t hurt. It never hurts.' },
  // SNAP. The door's hum cuts dead; a breath of silence; the candles catch in a wave from her hand, past you, and the
  // fire in her hearth with them.
  { w: 0.3, m: 'snap', hold: 1.0 },
  { m: 'candles', hold: 1.8 },
  // She comes back through her things, watching your eyes the whole way, stops close, and leans in.
  { m: 'comeBack', hold: 4.0 },
  { m: 'lean', text: 'That was a charm. Whoever it touches believes the next thing I tell them.', eye: true },
  { text: 'It has worked on forty-three people. It hasn’t worked on you.' },
  // She straightens, steps back, and folds her arms.
  { w: 0.8, m: 'fold', text: 'So you’d better have the truth. Bear with me. I’m out of practice.' },
  // Who she is. Her hand to her heart, and a slow, stiff bow. Her name comes up.
  { w: 0.5, m: 'bow', hold: 1.3 },
  { m: 'named', text: 'My name is Lisandra. The girl was a glamour. Nobody follows an old woman into a war.' },
  // Her hand goes out past you, at the door you came through.
  { w: 0.5, m: 'doorPoint', text: 'That is a door behind you. You came through it a minute ago, from a long way off.' },
  // The old story, told at her hearth: she crosses to it, holds her hands to the fire, and tells it into the flames.
  { w: 0.5, m: 'toHearth', text: 'This country is Eldravayne. It belongs to Velscour, the Dark Lord.' },
  { text: 'Two hundred years ago, a stranger called Tessariel broke him on his own throne.' },
  { w: 0.3, m: 'turn', text: 'Then Tessariel left by that door, swearing to come back if he ever rose again.' },
  // The old lantern on her table: she looks at it, and lays a hand on it.
  { w: 0.5, m: 'lantern', text: 'I carried Tessariel’s lantern in that war. I have kept the door ever since.' },
  { w: 0.4, m: 'rose', text: 'He rose. For forty years now, he has had his throne back.' },
  // The forty-three. She looks down the room to the ledger on its stand by the tunnel; then at the floor.
  { w: 0.6, m: 'ledger', text: 'A season ago, the door began to answer. Forty-three times, and every one the wrong person.' },
  { text: 'So I told each of them what I told you, put a sword in their hand, and sent them off to fight him.' },
  { w: 0.5, m: 'shame', text: 'I had stopped believing the real one would come.', mutter: true, emote: 'gloom', feel: 2.6 },
  // The three proofs. She comes back across the cave to you.
  { w: 0.7, m: 'toYou', text: 'Then it sent you. And three things tell me you are not like them.', eye: true },
  { w: 0.3, m: 'one', text: 'One. It drops the others in ditches, all over the country. It put you here, at my feet.' },
  { w: 0.3, m: 'two', text: 'Two. You saw my real face. The old songs say nothing false gets past Tessariel’s eyes.' },
  { w: 0.4, m: 'steps', text: 'And the third is in your right hand. Look down.', eye: true },
  // The view tips down to your staff, embers on your knuckles. Cast, and a spark leaps to the nearest candle; or it
  // goes on its own after the wait.
  { m: 'hands', hold: 1.1 },
  { m: 'cast', hold: 4.0 },
  { m: 'spark', hold: 1.6 },
  { m: 'magic', text: 'That is magic. Nobody in this world has been born with it in two hundred years.' },
  { text: 'When he was broken, he drank every spark of it to stay alive.' },
  { w: 0.3, m: 'yours', text: 'And you have just walked in with a fistful of fire.' },
  // Who you are. A slow half circle round you, to stand between you and the door.
  { w: 0.5, m: 'round', text: 'So I’ll say it again, and this time it’s true.', eye: true },
  // On the name, the door's hum comes back for one breath, the portal swells and every flame leans toward you.
  { w: 1.2, m: 'reveal', text: 'You are Tessariel. You said you’d come back, and you have.', eye: true },
  { w: 1.2, m: 'after', text: 'You won’t remember. Two hundred years beyond that door would wash anyone clean.' },
  { text: 'But he will know you. Every spark you throw is one he has lost, and he will feel it.' },
  { text: 'He is hunting forty-three of you already. My lies have bought you a little time.' },
  // What to do. She points down the cave, to the tunnel and the world.
  { w: 0.7, m: 'plan', text: 'So here is what you do with it.' },
  { m: 'pointOut', text: 'Take the Long Road down the hill to a town called Bellmourn. They need help there.' },
  { text: 'Learn what those hands can do. Then go and finish what you started.' },
  // A look over her shoulder at the door behind her.
  { w: 0.5, m: 'cant', text: 'I can’t come. That door keeps me alive, and I have never left it for long.' },
  // The name. She comes round in front of you, and only now holds out her hand: the old one.
  { w: 0.6, m: 'toOffer', text: 'One last thing. The others, I named myself. You, I’m asking.' },
  { w: 0.4, m: 'offer', text: 'What did they call you, on the far side?', eye: true },
  { w: 0.5, m: 'prompt' },
];

// She takes the name where she stands, and sends you out ahead of her. You can't look or walk till she's done.
const HERD_STORY = [
  { w: 0.3, m: 'name', text: '{name}.', say: '', secs: 1.6 },
  { w: 0.3, m: 'book', text: 'Good. That goes in the book. It’s the first name in there I didn’t choose myself.' },
  { w: 0.4, m: 'point', text: 'The way out is down that tunnel. Go on ahead of me.' },
  { w: 0.3, m: 'go', text: 'And stop looking at me like that. I know what you see.', emote: 'sweat', feel: 2.2 },
  { w: 0.1, m: 'control' },
  { w: 3.0, m: 'end' },
];

// The ledge, once she's out of the dust and has had it out with you (from FALL_FROM: before that the scene is set by
// hand, to the falling rock). She's lovely again, in the sun, and says the rest in her young voice.
export const FALL_FROM = 15.2;
const FALL_STORY = [
  { m: 'rubble', text: 'Two hundred years I kept that door open. You walk through it once, and it lets go.' },
  { text: 'I thought I was the one holding it. It was only ever waiting for you.', mutter: true },
  // Back to you, and she catches you looking; then down at her own hands, in the sun.
  { w: 1.0, m: 'catch', text: '…Why are you staring at me like that?', emote: 'question', feel: 2.2 },
  { w: 0.9, m: 'sun', text: 'Oh. The sun. This is no glamour. Daylight gives me back the face I had when I took up the door.' },
  { w: 0.2, m: 'only', text: 'The dark takes it away again. You are the only one who sees either.', emote: 'sweat', feel: 1.8 },
  { w: 0.8, m: 'home', text: 'Well. I seem to have lost my home.', mutter: true, emote: 'gloom' },
  { w: 0.7, m: 'coming', text: 'So I’m coming to Bellmourn with you, {name}. Somebody has to get you down this road in one piece.', say: 'So I’m coming to Bellmourn with you. Somebody has to get you down this road in one piece.' },
  { w: 0.3, m: 'oldLis', text: 'Down there I’m Old Lis, a hag who trades herbs for salt. That is the face they’ll see.' },
  { w: 0.9, m: 'end' },
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
      const said = e.say ?? e.text, secs = e.secs ?? speechSecs(voice, said);
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
