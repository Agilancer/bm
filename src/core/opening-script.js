import { OPENING, SPARK_AT, SWAP_AT, prettyShown } from './opening.js';
import { CAVE_LINES } from './opening-cave.js';

// What Lisandra says in the opening, and when. You never speak. Times are seconds into each stage; dur is how long the line
// stays up (never under 1.5 s, never more than about 15 characters a second). vo: heard before she's seen. off: from out of
// sight. mutter: under her breath. big: shouted. words: revealed a word at a time from `from`, the last word landing at `land`.
// emote: the feeling over her head as she says it (src/ui/emotes.js), held for `feel` seconds (else the line's length).
// say: what she says aloud where it isn't the line itself. Her voice is recorded ahead of time (docs/VOICES.md), and nobody
// can record the name you'll type, so a line with {name} in it says the rest, and '' says nothing. parts: a line too long
// for one subtitle, shown in parts as her voice gets to each ([text, seconds in]). named: said once she's told you her
// name (the subtitles call her by it from then on).
export const SCRIPT = {
  [OPENING.WAKE]: [
    { at: 0.2, dur: 3.7, text: '…by the light that does not set… cross over. Come home.', vo: true },
    { at: 3.9, dur: 2.4, text: 'Shh. Everyone’s frightened at first.' },
    // Your eyes open on her, lovely, and she comes to you across the cave, taking her time over you: the glamour, before
    // it breaks. She's about to give you the charm's usual story when the flash cuts her off.
    { at: 7.6, dur: 2.6, text: 'There you are. Easy. Breathe.' },
    { at: 10.9, dur: 4.4, text: 'You’ve come such a long way to find me. Further than you know.' },
    { at: 15.6, dur: 2.4, text: 'Don’t get up yet. Just look at me.' },
    { at: SWAP_AT - 2.9, dur: 4.1, text: 'Now, then. Let me tell you who you are—', words: true, from: SWAP_AT - 2.4, land: SWAP_AT },
    // From the flash to the name prompt: the long story, timed in src/core/opening-cave.js.
    ...CAVE_LINES,
  ],
  // While the prompt waits: times since it came up.
  [OPENING.NAME]: [
    { at: 10, dur: 1.8, text: 'It’s your own name.' },
    { at: 20, dur: 2.2, text: 'You’ve had it all your life.' },
    { at: 32, dur: 2.6, text: 'Take your time. The door won’t.' },
  ],
  // She takes the name where she stands, and sends you out ahead of her.
  [OPENING.HERD]: [
    { at: 0.3, dur: 1.7, text: '{name}.', say: '' },
    { at: 2.4, dur: 1.5, text: 'Lovely.' },
    { at: 4.3, dur: 1.8, text: 'Out’s through there.' },
    { at: 6.4, dur: 4.0, text: 'Go on. And stop looking at me. I know what you see.', emote: 'sweat', feel: 2.2 },
  ],
  [OPENING.COLLAPSE]: [
    { at: 4.0, dur: 1.8, text: 'No. No, no, no.', emote: 'panic', feel: 2.8 },
    { at: 12.0, dur: 2.0, text: 'WHAT HAVE YOU DONE?!', say: 'What have you done?!', big: true, emote: 'anger', feel: 2.6 },
    { at: 15.2, dur: 6.4, text: 'Two hundred years I held that door open. You walk through it once, and it lets go.' },
    { at: 22.1, dur: 2.8, text: 'It was only ever waiting for you.', mutter: true },
    { at: 26.0, dur: 2.8, text: '…Why are you looking at me like that?', emote: 'question', feel: 2.2 },
    { at: 29.2, dur: 2.0, text: '…Oh. The sun’s up.' },
    { at: 31.6, dur: 2.0, text: 'No. Don’t answer that.', emote: 'sweat', feel: 1.8 },
    { at: 34.2, dur: 2.4, text: 'I seem to have lost my home.', mutter: true, emote: 'gloom' },
    { at: 37.2, dur: 3.4, text: 'Bellmourn, then. You’re taking me there, {name}.', say: 'Bellmourn, then. You’re taking me there.' },
    { at: 41.0, dur: 3.4, text: 'Somebody has to get you down this road alive.' },
    { at: 44.9, dur: 3.9, text: 'Down there I’m Old Lis. Old Lis is what they’ll see.' },
  ],
};

// Said when something happens rather than at a time: walking out, and on the road down. witch: said walking out, while you'd
// still see the witch (the rest are on the road down, where she's lovely to you). On the road she leads you down and talks
// the whole way: her lines wait their turn and never overlap (src/sim/opening.js talk), and each waits until you're near
// enough to hear it, but for a call: shouted back to you, from wherever she is.
export const CUES = {
  // (Orders said late in a whole sentence: a lone "Out!" never came out in her voice, by the voice critics' review.)
  back: { dur: 5.0, text: 'Not that way, dear. Back down the tunnel with you.', emote: 'anger', witch: true },
  back2: { dur: 5.4, text: 'I said out. Back down that tunnel before I lose my temper.', emote: 'anger', witch: true },
  // You pass her at the lectern, writing your name in the ledger.
  pass: { dur: 3.6, text: 'I’ll see you as far as the ledge. Then I’ve a door to mind.', witch: true },
  tunnel: { dur: 2.4, text: 'Hold. Please hold. Not now…', off: true, witch: true },
  // The hill, from the ledge down to the pines.
  lead: { dur: 3.2, text: 'This way. Stay close, and mind the edge.' },
  door: { dur: 6.1, text: 'No door to keep me now. One day I’ll die, like everyone else. I’d quite forgotten.' },
  bend: { dur: 4.6, text: 'The others would be making a speech by now. Every one of them.' },
  bend2: { dur: 4.0, text: 'You don’t say much, do you? I like that in a legend.' },
  jokes: { dur: 5.6, text: 'He used to laugh at his own jokes. Velscour. Before he’d finished telling them.' },
  jokes2: { dur: 2.4, text: 'I laughed too. Every time.' },
  hill1: { dur: 5.0, text: 'Two hundred years in that cave. I had it just how I liked it.', emote: 'gloom', feel: 2.4 },
  hill2: { dur: 5.2, text: 'My good kettle’s under that rock. And my books. And my other kettle.' },
  hill3: { dur: 4.5, text: 'Don’t look at me like that. It’s the dust. I am not crying.', emote: 'sweat', feel: 2.2 },
  hill4: { dur: 5.0, text: 'The last one who stopped to admire this view went over that edge.' },
  hill5: { dur: 5.0, text: 'Bellmourn’s at the bottom. Bells, mud and gossip. You’ll love it.' },
  woods: { dur: 4.6, text: 'Stay on the road. The dead in those pines don’t read prophecies.' },
  // The dead, coming up out of the pines.
  risen: { dur: 3.2, text: 'There! In the trees! Don’t let them close!', emote: 'panic', feel: 2.2, call: true },
  fight: { dur: 3.2, text: 'Burn them! That’s what the hands are for!', call: true },
  after: { dur: 1.8, text: '…You’ll do.', mutter: true },
  // After the fight: who Velscour was, and what he did. She keeps to her own pace for it, and so do you.
  heal1: { dur: 6.4, text: 'Velscour sat up with the dying every night, and held their hands until they went cold.' },
  heal2: { dur: 7.3, text: 'Then he lost a little girl he’d sat with nine nights, and decided death was a door he could close.', parts: [['Then he lost a little girl he’d sat with nine nights,', 0], ['and decided death was a door he could close.', 3.9]] },
  heal3: { dur: 3.8, text: 'So he closed it. When you broke him, it swung open.' },
  heal4: { dur: 5.3, text: 'Now he’s leaning on it again. That’s why the dead here won’t lie still.' },
  heal5: { dur: 1.7, text: 'He calls it mercy.', mutter: true },
  wed: { dur: 6.8, text: 'We were to be married in the spring. The little girl died that winter. There was no spring.', emote: 'gloom', feel: 2.6, parts: [['We were to be married in the spring.', 0], ['The little girl died that winter. There was no spring.', 2.8]] },
  // The last stretch, and the town.
  star: { dur: 5.8, text: 'He named a star for me once. I can’t find it anymore. I think he took it back.' },
  low3: { dur: 5.1, text: 'They see a crone with a stick. What you see is your own business.' },
  sight: { dur: 3.3, text: 'There it is. Let me do the talking.' },
  low4: { dur: 6.0, text: 'Bram Kettle keeps the inn, north of the well. Tell him I sent you. Then duck.' },
  low5: { dur: 4.9, text: 'And don’t buy Elspeth’s candles. She says beeswax. It’s sheep.' },
  low6: { dur: 5.1, text: 'If you hear the bell at midnight, stay in. Nobody living rings it.' },
  scream: { dur: 1.8, text: '[a scream]', caption: true },
  walk: { dur: 1.6, text: 'Keep walking.', emote: 'sweat' },
  // You've fallen behind, and she's waiting for you; or you've run on past her.
  keep1: { dur: 1.5, text: 'This way!', call: true },
  keep2: { dur: 4.5, text: 'Bellmourn’s down the hill. It won’t come up and fetch you.', call: true },
  keep3: { dur: 2.2, text: 'I’m not carrying you, {name}.', say: 'I’m not carrying you.', emote: 'anger', feel: 1.6, call: true },
  slow: { dur: 2.6, text: 'Slow down! Some of us just lost a cave.', emote: 'anger', feel: 2.0, call: true },
  wait: { dur: 1.6, text: '{name}! Wait!', say: 'Wait!', emote: 'startle', call: true },
  // You ride your shield, and so does she, to stay ahead of you.
  board: { dur: 4.1, text: 'Oh, we’re riding, are we? Fine. Don’t you dare laugh.', emote: 'sweat', feel: 2.0, call: true },
  fast: { dur: 3.7, text: 'Two hundred years, and nobody ever showed me this!', call: true },
  off: { dur: 2.9, text: '…Again. Later. When nobody’s looking.', mutter: true },
};
export const CUE_IDS = Object.keys(CUES);

// Her two voices: young while you see her lovely, old while you see the witch (prettyShown), so the glamour breaks in
// your ears as well. The recordings are filed under these names (assets/voice/<voice>/<key>.mp3).
export const VOICE = { pretty: 'Lisandra', witch: 'LisandraWitch' };
export const voiceOf = (stage, l) => (l.witch || !prettyShown(stage, l.at ?? 0) ? VOICE.witch : VOICE.pretty);
// The words she says aloud (none for a caption, like the scream).
export const spoken = (l) => (l.caption ? '' : l.say ?? l.text);

// Feelings with no words: the witch's start when the glamour breaks, as she scrambles back from you.
// And her flinch when your spark bursts the candle.
export const BEATS = {
  [OPENING.WAKE]: [{ at: SWAP_AT + 0.9, dur: 0.75, emote: 'startle' }, { at: SPARK_AT + 0.35, dur: 0.9, emote: 'startle' }],
};

// The feeling over her head at this moment, if any: { kind, age, dur }. cue and cueT: the cue said last, and how long ago.
export function emoteAt(stage, t, cue, cueT) {
  for (const l of [...(BEATS[stage] || []), ...(SCRIPT[stage] || [])]) {
    const dur = l.feel ?? l.dur;
    if (l.emote && t >= l.at && t < l.at + dur) return { kind: l.emote, age: t - l.at, dur };
  }
  const c = cue && CUES[cue];
  if (c?.emote && cueT < (c.feel ?? c.dur)) return { kind: c.emote, age: cueT, dur: c.feel ?? c.dur };
  return null;
}

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

// Of a line shown in parts, the part up this far into it.
export function partAt(l, age) {
  if (!l.parts) return l.text;
  let text = l.parts[0][0];
  for (const [p, from] of l.parts) if (age >= from) text = p;
  return text;
}
