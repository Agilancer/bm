# Writing the people of Phobos (brief for the writers)

The game: Bellmourn : Velscour's Throne, a dark medieval fantasy RPG. The player is a stranger with a staff (a wizard),
new to **City State Phobos**, a grim walled city in the east under the crag of **Castle Velscour**, whose Keep's crown burns
red. Velscour is the demon lord who rules from the Keep: essentially Satan. His patrols in blood-red cloaks are "the Loyal";
the dead walk in the Bone Yards. People live poor, wry, scared and stubborn under him.

The roster (who everyone is, their district, their look): `tools/phobos/crowd_roster.json`. Read it all: you may and should
have characters mention each other by name (gossip, grudges, friendships, debts, love), consistently with who they are.

## The city's places (use these names)
- Districts (the roster's `area`): `barbican` the Barbican (the west gate's fort, the Drawbridge Gate); `cinder` the Cinder
  quarter (smelters, charcoal, Ash Lane, furnaces, soot); `rookeries` the Rookeries (slums, the Gutted Lamb tavern, the
  Rotting Hospice); `market` Chainmarket (stalls, the gibbet tower in its middle); `wharf` the Drowned Wharf (on the
  Slough, barges, fish, the Corpse Quay); `tanners` the Tanners' Steps (tanneries, dye vats, stink); `bones` the Bone Yards
  (graves, the dead walk at night, bone-carvers); `barracks` the Barracks quarter (his garrison, drill yards, masons);
  `mages` the Mages' Rise (scholars, apothecaries, towers); `dukes` Dukes' Row (rich houses, servants, velvet);
  `approach` the Approach (the walled causeway up to the castle gate, his red banners, pilgrims); `castle` inside Castle
  Velscour itself (its Lower Ward: kitchens, cellars, oubliettes, barracks; its Middle Ward: the Great Hall, the Library,
  the Portrait Gallery, the Horn Galleries, the court).
- Streets and things: the King's Mile (the main street, west gate to the castle), Ash Lane, the Low Road, the High Loop,
  the Slough (the dark canal), the sewers under it all, the Keep (its five spires, the crown fire), the Iron Barracks
  under the castle yard, the Pennyless (the thieves' guild), the Quiet Watch (who keep a kind of order), the Ashwardens.

## The owner's rules (break none, ever)
- Never say "Velscour" aloud. People mutter "him", "He", "the Lord in the Keep", "the Keep", "up there". (An acolyte or a
  castle creature may say "my Lord", "the Master".)
- Nothing of Tessariel (the good god) anywhere: never her name, no prayers to any good god, no "saints", no "heaven",
  no "holy", no angels. Nobody here has heard of Bellmourn.
- No bells. Never the word "bell" (not even "bellows" or "belly"). No crosses: never the words "cross", "crossed",
  "crossing", "crucify", nor "X marks". No blue beside gold.
- No modern slang, no swearing worse than "damn", "hell" (use sparingly), "piss", "bastard" (rarely).
- No letters or signs described as marks of either side.

## The voice
- Specific, wry, grim, human. Each character sounds like THEMSELVES: their trade, age, district, worries, humour, the
  people they know. Concrete detail beats atmosphere. Vary length (most 6 to 25 words; none over 40). Never repeat a line.
- Second person to the player in greet/barks/about/ask; to another townsperson in chat (who, in chat, is ANYONE: don't
  name the other person in `chat`; you may name third parties).

## The format
Write `src/folk/lines/crowd/<part>.js` (your part is named in your task):

```js
// Phobos's people, <part>: their own lines (tools/phobos/crowd_lines_brief.md). Merged over their kind's in src/folk/lines/phobos.js.
export const SAYS = {
  ph_example: {
    first: ['...', '...', '...'],                       // 3: the first time the player talks to them
    greet: { morning: [10], day: [10], evening: [10], night: [10] },   // talking to them again, by time of day
    barks: { player: [14], morning: [6], day: [6], evening: [6], night: [8], magic: [8] },   // said aloud as the player passes or stands near; magic: when the player casts nearby
    about: [10],                                        // "Who are you?"
    topics: { work: 'Your trade?', area: 'Tell me about the Cinder.', castle: 'And the castle?', word: "What's the word?", own: '<one topic of their own, a short question>' },
    ask: { work: [14], area: [14], castle: [10], word: [18], own: [10] },   // the answers to each topic
    chat: { open: [10], reply: [10], argue: [6], deal: [6] },   // to another townsperson they stop to talk to: openers; replies to anyone; a quarrel; a bit of business
  },
};
```
That is about 210 lines per character: **no fewer than 200**. Strings in single or double quotes as needed; escape
properly; the file must load as an ES module (`node -e "import('./src/folk/lines/crowd/<part>.js')"` must not throw).
The castle's eight (area `castle`): `area` is their ward ("Tell me about the Lower Ward."), and their `chat` is with each
other and the castle's household; they serve Him and speak of Him with dread or devotion.

When done: run the load check, and count every string per character (must be >= 200 each), and report the counts.
