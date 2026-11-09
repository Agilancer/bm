// Every line Lisandra says aloud, read from the game's own data (src/core/opening-script.js), written out as JSON for the
// recorder (record.py): [{ voice, text, key, say, how }], in the order they're first heard.
//   node tools/voice/script.mjs lines.json
// voice: which of her voices (voiceOf: young while you see her lovely, old while you see the witch); text: the words she
// says (spoken: the line, or its `say`); key: voiceKey(text), the file the game looks for; say: the same words as the voice
// model should read them (plain quotes, a dash as a trailing-off, shouting in plain case); how: a delivery note for the
// model, where the words alone don't carry it.
import { writeFileSync } from 'node:fs';
import { OPENING } from '../../src/core/opening.js';
import { CUES, SCRIPT, spoken, voiceOf } from '../../src/core/opening-script.js';
import { voiceKey } from '../../src/core/voicekey.js';

const KIND = {
  vo: 'Whispering an incantation, low and hypnotic, as if from far away, at an easy, flowing pace.',
  mutter: 'Muttering under her breath to herself, quiet and sour.',
  big: 'Shouting at the top of her voice, furious.',
  off: 'Calling out from somewhere out of sight, strained and pleading, as stone shifts around her.',
};
const HOW = {
  'Shh. Everyone’s frightened at first.': 'Softly and quickly, soothing, close by.',
  'Let me be the first beautiful thing you—': 'Softly and seductively, flowing quickly, cut off suddenly at the end.',
  '…Oh.': 'Small and stunned, a horrified realisation.',
  'Oh, no.': 'Quietly dismayed.',
  'Right. The short version.': 'Brisk, recovering her composure.',
  'You are Tessariel, reborn. Beacon of the Infinite. The light that does not set.': 'Rattled off quickly, a grand proclamation she has made a hundred times.',
  'You were brought here to kill Velscour, Dark Lord of Eldravayne.': 'Matter-of-fact and brisk.',
  'It’s foretold. Thoroughly. You’ll be marvellous.': 'Briskly reassuring, quick.',
  'Your name. The one you were born with. Quickly.': 'Impatient and urgent.',
  'It’s your own name.': 'Impatiently prompting.',
  'You’ve had it all your life.': 'Dryly exasperated.',
  'Lovely.': 'Flatly, not meaning it.',
  'Out’s through there.': 'Brisk, pointing the way.',
  'Go on. Don’t look at me. Don’t look at anything.': 'Nervous and hurried, shooing.',
  'I’ll be right behind you. I just need to… tidy.': 'Falsely bright, hiding something.',
  'No— no, no, no—': 'Panicked, rising in horror.',
  'I’ve held that door open since before that town had a name. You walk through it once—': 'Bitter and furious, her voice shaking, building.',
  '…Why are you looking at me like that?': 'Suddenly suspicious and self-conscious.',
  'No. Don’t answer that.': 'Quickly, embarrassed.',
  'Lisandra.': 'Introducing herself, cool and proud.',
  'Bellmourn. You’re taking me there.': 'Firm and decided, an order.',
  'And if anyone screams when they see me— keep walking.': 'Wry and weary.',
  'Out!': 'Snapping angrily.',
  'The others made speeches. Every one of them. On this road.': 'Dry and wistful, remembering.',
  'Stay on the road. The dead in those pines don’t read prophecies.': 'A dry warning.',
  '…You’ll do.': 'Grudgingly impressed, half to herself.',
  'Velscour used to laugh at his own jokes.': 'Fondly wistful.',
  'Before. So I’m told.': 'Quickly covering herself.',
  'There it is. Let me do the talking.': 'Firm, a little anxious.',
  'Keep walking.': 'Low and tense.',
  'Slow down! Some of us just lost a cave.': 'Calling after someone far ahead, breathless and annoyed.',
  'Wait!': 'Calling urgently after someone running ahead.',
  // The road down: she leads, and talks over her shoulder the whole way.
  'This way. Stay close, and mind the edge.': 'Brisk and businesslike, over her shoulder, leading the way.',
  'Three thousand years in that cave. I had it just how I liked it.': 'Wistful and a little sour, half to herself.',
  'You don’t say much, do you? I like that in a legend.': 'Dry and amused, teasing.',
  'My good kettle’s under that rock. And my books. And my other kettle.': 'Grumbling, with comic indignation.',
  'Don’t look at me like that. It’s the dust. I am not crying.': 'Brittle and defensive, quickly covering.',
  'The last one who stopped to admire this view went over that edge.': 'Dry, deadpan warning.',
  'Bellmourn’s at the bottom. Bells, mud and gossip. You’ll love it.': 'Sardonic, a wry sales pitch.',
  'There! In the trees! Don’t let them close!': 'Sharp and alarmed, calling out a warning.',
  'Burn them! That’s what the hands are for!': 'Urgent and fierce, shouting encouragement.',
  'The dead didn’t used to get up round here. Not till Velscour stirred.': 'Low and grim, matter-of-fact.',
  'In Bellmourn they call me Old Lis. You’ll hear worse. Most of it’s true.': 'Wry and unbothered, a little proud.',
  'They see a crone with a stick. What you see is your own business.': 'Cool and pointed, not looking at him.',
  'Bram Kettle keeps the inn, north of the well. Tell him I sent you. Then duck.': 'Brisk directions, dry at the end.',
  'And don’t buy Elspeth’s candles. She says beeswax. It’s sheep.': 'Gossipy and scornful, conspiratorial.',
  'If you hear the bell at midnight, stay in. Nobody living rings it.': 'Quiet and serious, a real warning.',
  'This way!': 'Calling back to someone lagging behind, impatient.',
  'Bellmourn’s down the hill. It won’t come up and fetch you.': 'Calling back, exasperated.',
  'I’m not carrying you.': 'Calling back, sharp and annoyed.',
  'Oh, we’re riding, are we? Fine. Don’t you dare laugh.': 'Startled, then gamely indignant, slightly breathless.',
  'Three thousand years, and nobody ever showed me this!': 'Breathless and delighted, laughing with the speed.',
};

// Takes chosen over the first (record.py's seed shift), for a line that came out too high for her, with words that weren't
// there, or too long for its moment; and lines whose pauses are shortened (s) to fit before the next.
const TAKE = {
  '…by the light that does not set… cross over. Come home.': 1, 'It’s foretold. Thoroughly. You’ll be marvellous.': 1, '…You’ll do.': 5,
  'No. Don’t answer that.': 1, 'I seem to have lost my home.': 2, 'Velscour used to laugh at his own jokes.': 1,
  'Slow down! Some of us just lost a cave.': 1, 'Of all the times to get it right.': 1,
  'I’ll be right behind you. I just need to… tidy.': 1, 'Lovely.': 2, 'Hold. Please hold. Not now…': 1, 'Out!': 1, 'OUT.': 1,
};
const PAUSE = {
  '…by the light that does not set… cross over. Come home.': 0.3, 'Shh. Everyone’s frightened at first.': 0.3,
  'Let me be the first beautiful thing you—': 0.3, 'You are Tessariel, reborn. Beacon of the Infinite. The light that does not set.': 0.3,
  'It’s foretold. Thoroughly. You’ll be marvellous.': 0.3,
};

// The words as the voice model should read them.
const plain = (t) => {
  let s = t.replace(/[‘’]/g, "'").replace(/…/g, '...').replace(/\s*—\s*$/, '...').replace(/\s*—\s*/g, '... ');
  if (s === s.toUpperCase()) s = (s.charAt(0) + s.slice(1).toLowerCase()).replace(/\.$/, '!');
  return s;
};

const lines = [];
const seen = new Set();
const add = (stage, l) => {
  const text = spoken(l);
  if (!text) return;
  const voice = voiceOf(stage, l), k = voice + '|' + text;
  if (seen.has(k)) return;
  seen.add(k);
  const how = [HOW[text], ...['vo', 'mutter', 'big', 'off'].filter((f) => l[f]).map((f) => KIND[f])].filter(Boolean).join(' ');
  lines.push({ voice, text, key: voiceKey(text), say: plain(text), how, ...(TAKE[l.text] ? { take: TAKE[l.text] } : {}), ...(PAUSE[text] ? { pause: PAUSE[text] } : {}) });
};
for (const [stage, ls] of Object.entries(SCRIPT)) for (const l of ls) add(Number(stage), l);
for (const l of Object.values(CUES)) add(OPENING.ESCORT, l);
writeFileSync(process.argv[2] || 'lines.json', JSON.stringify(lines, null, 1));
const by = {};
for (const l of lines) by[l.voice] = (by[l.voice] || 0) + 1;
console.log(lines.length, 'lines:', Object.entries(by).map(([v, n]) => `${v} ${n}`).join(', '));
