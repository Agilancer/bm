import { OPENING, prettyShown } from './opening.js';

// What Lisandra says in the opening, and when. You never speak. Times are seconds into each stage; dur is how long the line
// stays up (never under 1.5 s, never more than about 15 characters a second). vo: heard before she's seen. off: from out of
// sight. mutter: under her breath. big: shouted. words: revealed a word at a time from `from`, the last word landing at `land`.
// emote: the feeling over her head as she says it (src/ui/emotes.js), held for `feel` seconds (else the line's length).
// say: what she says aloud where it isn't the line itself. Her voice is recorded ahead of time (docs/VOICES.md), and nobody
// can record the name you'll type, so a line with {name} in it says the rest, and '' says nothing.
export const SCRIPT = {
  [OPENING.WAKE]: [
    { at: 0.2, dur: 3.7, text: '…by the light that does not set… cross over. Come home.', vo: true },
    { at: 3.9, dur: 2.4, text: 'Shh. Everyone’s frightened at first.' },
    { at: 6.2, dur: 4.1, text: 'Let me be the first beautiful thing you—', words: true, from: 6.7, land: 9.0 },
    { at: 10.6, dur: 1.5, text: '…Oh.' },
    { at: 12.1, dur: 1.5, text: 'Oh, no.', emote: 'gloom', feel: 2.2 },
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
    { at: 0.3, dur: 1.7, text: '{name}.', say: '' },
    { at: 2.4, dur: 1.5, text: 'Lovely.' },
    { at: 4.3, dur: 1.8, text: 'Out’s through there.' },
    { at: 6.4, dur: 3.2, text: 'Go on. Don’t look at me. Don’t look at anything.', emote: 'sweat', feel: 2.2 },
    { at: 9.9, dur: 3.3, text: 'I’ll be right behind you. I just need to… tidy.' },
  ],
  [OPENING.COLLAPSE]: [
    { at: 4.0, dur: 1.8, text: 'No— no, no, no—', emote: 'panic', feel: 2.8 },
    { at: 12.0, dur: 2.0, text: 'WHAT HAVE YOU DONE?!', big: true, emote: 'anger', feel: 2.6 },
    { at: 15.2, dur: 6.0, text: 'I’ve held that door open since before that town had a name. You walk through it once—' },
    { at: 23.6, dur: 2.8, text: '…Why are you looking at me like that?', emote: 'question', feel: 2.2 },
    { at: 26.8, dur: 2.0, text: 'No. Don’t answer that.', emote: 'sweat', feel: 1.8 },
    { at: 29.4, dur: 2.4, text: 'I seem to have lost my home.', mutter: true, emote: 'gloom' },
    { at: 32.4, dur: 1.6, text: 'Lisandra.', named: true },
    { at: 34.3, dur: 3.2, text: 'Bellmourn. You’re taking me there, {name}.', say: 'Bellmourn. You’re taking me there.', named: true },
    { at: 37.8, dur: 3.8, text: 'And if anyone screams when they see me— keep walking.', named: true },
  ],
};

// Said when something happens rather than at a time: walking out, and on the road down. witch: said walking out, while you'd
// still see the witch (the rest are on the road down, where she's lovely to you). On the road she leads you down and talks
// the whole way: her lines wait their turn and never overlap (src/sim/opening.js talk), and each waits until you're near
// enough to hear it, but for a call: shouted back to you, from wherever she is.
export const CUES = {
  back: { dur: 1.5, text: 'Out!', emote: 'anger', witch: true },
  back2: { dur: 1.5, text: 'OUT.', big: true, emote: 'anger', witch: true },
  tunnel: { dur: 2.4, text: 'Hold. Please hold. Not now…', off: true, witch: true },
  // The hill, from the ledge down to the pines.
  lead: { dur: 3.2, text: 'This way. Stay close, and mind the edge.' },
  hill1: { dur: 5.0, text: 'Three thousand years in that cave. I had it just how I liked it.', emote: 'gloom', feel: 2.4 },
  bend: { dur: 4.2, text: 'The others made speeches. Every one of them. On this road.' },
  bend2: { dur: 4.0, text: 'You don’t say much, do you? I like that in a legend.' },
  hill2: { dur: 5.2, text: 'My good kettle’s under that rock. And my books. And my other kettle.' },
  hill3: { dur: 4.5, text: 'Don’t look at me like that. It’s the dust. I am not crying.', emote: 'sweat', feel: 2.2 },
  hill4: { dur: 5.0, text: 'The last one who stopped to admire this view went over that edge.' },
  hill5: { dur: 5.0, text: 'Bellmourn’s at the bottom. Bells, mud and gossip. You’ll love it.' },
  woods: { dur: 4.6, text: 'Stay on the road. The dead in those pines don’t read prophecies.' },
  // The dead, coming up out of the pines.
  risen: { dur: 3.2, text: 'There! In the trees! Don’t let them close!', emote: 'panic', feel: 2.2, call: true },
  fight: { dur: 3.2, text: 'Burn them! That’s what the hands are for!', call: true },
  after: { dur: 1.8, text: '…You’ll do.', mutter: true },
  // The low road, on down to the town.
  low1: { dur: 5.4, text: 'The dead didn’t used to get up round here. Not till Velscour stirred.' },
  half: { dur: 3.0, text: 'Velscour used to laugh at his own jokes.' },
  half2: { dur: 2.0, text: 'Before. So I’m told.' },
  low2: { dur: 5.5, text: 'In Bellmourn they call me Old Lis. You’ll hear worse. Most of it’s true.' },
  low3: { dur: 5.1, text: 'They see a crone with a stick. What you see is your own business.' },
  sight: { dur: 2.6, text: 'There it is. Let me do the talking.' },
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
  fast: { dur: 3.7, text: 'Three thousand years, and nobody ever showed me this!', call: true },
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
export const BEATS = {
  [OPENING.WAKE]: [{ at: 9.9, dur: 0.75, emote: 'startle' }],
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
