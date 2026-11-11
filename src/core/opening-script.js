import { OPENING, SPARK_AT, SWAP_AT, prettyShown } from './opening.js';
import { CAVE_LINES, FALL_LINES, HERD_LINES, speechSecs } from './opening-cave.js';

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
    { at: 0.2, dur: 6.0, text: 'By the light that does not set, I call you back. Cross over. Come home.', vo: true },
    // Your eyes open on her, lovely, and she comes to you across the cave, taking her time over you: the glamour, before
    // it breaks. She's giving you the charm's usual story when the flash cuts her off.
    { at: 7.4, dur: 4.0, text: 'Shh. There you are, little star. Don’t be afraid.' },
    { at: 11.8, dur: 4.6, text: 'Look at me. Only at me. I’m going to tell you who you are.' },
    { at: SWAP_AT - 5.2, dur: 6.4, text: 'You are Tessariel. And I have waited two hundred years for you to—', words: true, from: SWAP_AT - 4.9, land: SWAP_AT },
    // From the flash to the name prompt: the long story, timed in src/core/opening-cave.js.
    ...CAVE_LINES,
  ],
  // While the prompt waits: times since it came up.
  [OPENING.NAME]: [
    { at: 10, dur: 4.2, text: 'It’s your own name. The one you had on the far side.' },
    { at: 20, dur: 4.2, text: 'You’ve had it all your life. It will come back to you.' },
    { at: 32, dur: 5.6, text: 'Take your time. I’ve waited two hundred years. I can wait a minute more.' },
  ],
  // She takes the name where she stands, and sends you out ahead of her.
  [OPENING.HERD]: HERD_LINES,
  [OPENING.COLLAPSE]: [
    { at: 4.0, dur: 1.8, text: 'No. No, no, no.', emote: 'panic', feel: 2.8 },
    { at: 12.0, dur: 2.0, text: 'WHAT HAVE YOU DONE?!', say: 'What have you done?!', big: true, emote: 'anger', feel: 2.6 },
    // From there, laid end to end by how long she takes to say it (src/core/opening-cave.js).
    ...FALL_LINES,
  ],
};

// Said when something happens rather than at a time: walking out, and on the way down. witch: said walking out, while you'd
// still see the witch (the rest are on the way down, where she's lovely to you). She leads you down and talks the whole
// way: her lines wait their turn and never overlap (src/sim/opening.js talk), and each waits until you're near enough to
// hear it, but for a call: shouted back to you, from wherever she is. A line stays up as long as it takes her to say.
export const CUES = {
  // (Orders said late in a whole sentence: a lone "Out!" never came out in her voice, by the voice critics' review.)
  back: { text: 'Not that way. You’ve only just come through it. The way out is down the tunnel.', emote: 'anger', witch: true },
  back2: { text: 'I said out. That door doesn’t open for the asking. Down the tunnel with you.', emote: 'anger', witch: true },
  // You pass her at the lectern, writing your name in the ledger.
  pass: { text: 'I’ll see you as far as the ledge. After that, I’ve a door to mind.', witch: true },
  tunnel: { text: 'Hold, door. Please. You’ve held for two hundred years. Hold one more morning…', off: true, witch: true },
  // Off the ledge, along the shelf, down the steps and the path to the road.
  lead: { text: 'This way. Stay close, and mind the edge.' },
  door: { text: 'No door to keep me alive now. One day I’ll die, like everyone else. I’d quite forgotten.' },
  shelf: { text: 'I cut this shelf out of the hill myself. It took ten years. I had the time.' },
  steps: { text: 'Mind the steps. Two hundred winters of frost, and I only ever mended the ones I tripped on.' },
  speech: { text: 'You don’t say much, do you? Good. The others all made speeches.' },
  foot: { text: 'This is the Long Road. Bellmourn is at the bottom, on the far side of those pines.' },
  staff: { text: 'That staff is not a walking stick. When something comes at you, point it and let fly.' },
  staff2: { text: 'And keep your distance. The others had armour. You have a robe.' },
  // Said in turn while there's nothing else to say, above the pines.
  hill1: { text: 'Two hundred years in that cave. I only left it for salt, and to fetch whoever the door had dropped.', emote: 'gloom', feel: 2.4 },
  hill2: { text: 'Everything I own is under that rock. I had a very good kettle.' },
  hill3: { text: 'Don’t look at me like that. It’s the dust. I am not crying.', emote: 'sweat', feel: 2.2 },
  hill4: { text: 'I’ve walked this road twice a year since before Bellmourn had an inn. It doesn’t get any shorter.' },
  hill5: { text: 'It’s a small town. Bells, mud and gossip. By nightfall they’ll all have an opinion of you.' },
  woods: { text: 'Stay on the road through the pines. The dead are in there, and they don’t read prophecies.' },
  // The dead, coming up out of the ground in the pines: she fights beside you, with what fire she has left.
  risen: { text: 'There, in the trees! They’re coming up! Don’t let them near you!', emote: 'panic', feel: 2.2, call: true },
  fight: { text: 'Point the staff and burn them! That’s what the fire is for!', call: true },
  tricks: { text: 'I’ve a few old tricks left. Keep them off me, and I’ll light what I can.', call: true },
  wave2: { text: 'More of them, and children with them. He never lets anyone go. Not even the little ones.', emote: 'gloom', feel: 2.4, call: true },
  necro: { text: 'Necromancers, out of the trees! Burn them first, or the dead won’t stay down!', emote: 'panic', feel: 2.2, call: true },
  after: { text: 'Well. You’ll do. You’ll do very nicely.', mutter: true },
  // After the fight: who Velscour was, and what he did. She keeps to her own pace for it, and so do you.
  heal0: { text: 'You’ll want to know why the dead get up and walk. It began as a kindness.' },
  heal1: { text: 'Velscour was a healer once. He sat up with the dying every night, and held their hands until they went cold.' },
  heal2: { text: 'Then he lost a little girl he’d sat with nine nights, and decided death was a door he could close.' },
  heal3: { text: 'So he closed it, and the dead stopped staying dead.' },
  heal4: { text: 'When you broke him, it swung open again, and they could rest.' },
  heal5: { text: 'Now he’s back, and leaning on it. That is why the dead here won’t lie still.' },
  heal6: { text: 'He still calls it mercy.', mutter: true },
  wed: { text: 'I know, because I was there. We were to be married in the spring.', emote: 'gloom', feel: 2.6 },
  wed2: { text: 'The little girl died that winter. There was no spring.' },
  wed3: { text: 'I left him the night the first of them got up and walked.' },
  wed4: { text: 'Then I went looking for someone who could stop him, and I found you.' },
  // The last stretch, and the town.
  star: { text: 'He named a star for me once. I can’t find it any more. I think he took it back.' },
  low1: { text: 'Now, Bellmourn. Twelve of my forty-three walked in there before you, so they’ve stopped being impressed.' },
  low2: { text: 'Bram Kettle keeps the inn, north of the well. He counts them on a slate. You’ll be his thirteenth.' },
  low3: { text: 'The cathedral is on the hill past the far end of town. It’s the Dark Lord’s now, and his knight is on the door.' },
  low4: { text: 'Three of the twelve went up to fight that knight. Stay off that hill until I say.' },
  low5: { text: 'And if you hear the bell at midnight, stay indoors. Nobody living rings it.' },
  sight: { text: 'There it is. Bellmourn. Let me do the talking.' },
  scream: { dur: 1.8, text: '[a scream]', caption: true },
  walk: { text: 'That came from the cathedral hill. Keep walking. There’s nothing you can do for them yet.', emote: 'sweat' },
  // You've fallen behind, and she's waiting for you; or you've run on past her.
  keep1: { text: 'This way! Keep up!', call: true },
  keep2: { text: 'Bellmourn’s down the hill. It won’t come up and fetch you.', call: true },
  keep3: { text: 'I’m not carrying you, {name}.', say: 'I’m not carrying you.', emote: 'anger', feel: 1.6, call: true },
  slow: { text: 'Slow down! Some of us just lost a cave.', emote: 'anger', feel: 2.0, call: true },
  wait: { text: '{name}! Wait for me!', say: 'Wait for me!', emote: 'startle', call: true },
  // You ride your shield, and so does she, to stay ahead of you.
  board: { text: 'Oh, we’re riding, are we? Fine. Don’t you dare laugh.', emote: 'sweat', feel: 2.0, call: true },
  fast: { text: 'Two hundred years, and nobody ever showed me this!', call: true },
  off: { text: '…Again. Later. When nobody’s looking.', mutter: true },
};
export const CUE_IDS = Object.keys(CUES);

// Her two voices: young while you see her lovely, old while you see the witch (prettyShown), so the glamour breaks in
// your ears as well. The recordings are filed under these names (assets/voice/<voice>/<key>.mp3).
export const VOICE = { pretty: 'Lisandra', witch: 'LisandraWitch' };
export const voiceOf = (stage, l) => (l.witch || !prettyShown(stage, l.at ?? 0) ? VOICE.witch : VOICE.pretty);
// The words she says aloud (none for a caption, like the scream).
export const spoken = (l) => (l.caption ? '' : l.say ?? l.text);
// Each cue stays up as long as it takes her to say (its recording's length, or her pace: src/core/opening-cave.js).
for (const l of Object.values(CUES)) l.dur ??= Math.max(1.5, Math.round((speechSecs(l.witch ? VOICE.witch : VOICE.pretty, spoken(l)) + 0.4) * 10) / 10);

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
