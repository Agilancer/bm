# Bellmourn: the townsfolk

The bible for everyone who lives in the town of Bellmourn, for the writers of their lines and for anyone judging them.
The game is **Bellmourn : Velscour's Throne** (never any other title). The data lives in `src/folk/people.js` (who, where,
what they do) and `src/folk/lines/*.js` (what they say).

## The world, in brief

- The kingdom is **Eldravayne**. Its king is **Velscour**, the Dark Lord: a demon lord, ancient, rarely seen, obeyed. His
  tithe is collected in every town. Saying his name loudly is unwise; folk say "the Dark Lord", "His Lordship", "the Throne",
  or (the brave and the drunk) "Old Horns".
- **Tessariel** is the other power: the Beacon of the Infinite, "the light that does not set". A saint, a god, a story,
  depending who you ask. His faith is forbidden under Velscour. A few still keep it in secret. Old folk remember when the
  cathedral bells rang for him.
- **The rule of the two letters** (the owner's HUGE RULE): V = Velscour, T = Tessariel. Nothing of Velscour's and nothing of
  Tessariel's are ever near each other. The cathedral and its catacombs are Velscour's now: the knight, the dead, the iron.
  Nothing of Tessariel's is there, and nobody in town keeps anything of Tessariel's anywhere near it. (Writers: Tessariel
  keepsakes, prayers and shrines belong in homes in town, never at the church.)
- **Bellmourn** is a small market town on the Long Road. Its name is its cathedral's great bell, which has not been rung
  by a living hand in forty years. Lately it tolls on its own, at midnight, three times. Nobody likes that.
- **The cathedral** stands out past the east end of town, a field away along the east road (folk call it the hill road),
  up on a rise: "up the hill", never "in a hollow". Its churchyard is there, and the catacombs beneath.
  It's the Dark Lord's. No services, no burials, no bell-ringer. The dead it holds are not resting.
- **The player** woke in a cave far up the Long Road, in a circle of candles, and was told by a woman they are **Tessariel
  reborn**, sent to kill Velscour. The cave fell in. They walked down to Bellmourn with an old woman at their side. Unlike
  every other "Tessariel" who has come through, this one has **no armour and no sword**: robes, a staff, a skull in the left
  hand, and real magic that burns and freezes and breaks things. The town has never seen anything like it. They don't know
  the player's name until they've been told it (the game knows it: `{name}`).

## What everyone's talking about

These are the threads every conversation pulls on. Each person knows a different part and believes a different version.

1. **The Tessariels.** For a few months, strangers in Tessariel's armour (silver and blue, the old sunburst) have been
   wandering into town, one at a time, dazed, each one certain *he* is Tessariel reborn, the chosen one, the Beacon. Every
   one of them talks about a beautiful woman who told him so. They give speeches in the square. Some ask the way to the
   Dark Lord. Bram the innkeeper keeps a tally of them chalked on a slate behind the bar: **the Tally**, which stands at
   twelve. (The player makes thirteen. People notice the number.) More are coming: soon they'll be walking the town
   themselves. The townsfolk find them funny, sad, frightening, and bad for business, in about equal parts.
2. **The black knight.** A knight in black plate arrived at the cathedral at the last new moon and stands before its great
   door, and kills anyone who comes near: not a word, not a warning. Three of the Tessariels went up the hill to "cast down
   the servant of darkness". Only their shouting came back. Since then: no burials (Silas the undertaker's coffins are
   stacking up in his yard), no going near the churchyard, and the dead don't stay in their graves.
3. **The dead are walking.** The hunter has seen them in the pines west and north, in packs. They come out of the catacombs
   somehow. They don't come into town (the watch says the town's lights keep them off; Orrin says it's older than that),
   but the roads aren't safe after dark. Things down there are getting stronger.
4. **Old Lis.** An old witch, "Old Lis", lives (lived) in a cave far up the Long Road. She comes down twice a year, ugly as
   sin and twice as rude, trades herbs for salt, and leaves. She's just come down with the new stranger, saying her cave
   fell in. Townsfolk see her as a hag by day. **At night, they see a beautiful woman**: there's a beautiful stranger on the
   roads and in the lanes after dark, and every Tessariel describes a beautiful woman. Hardly anyone has put it together.
   A couple of sharp ones have half put it together and don't want to finish the thought.
5. **The two lion houses.** Bellmourn's lords were one family once, under the gold lion. When Velscour's rule came the family
   split: the **Ashbys** (red and gold) bent the knee and hold the reeveship; the **Halloways** (blue and gold) kept their
   name and lost their lands, and are suspected of keeping the old faith. They are polite to each other in the square. Their
   eldest children are in love.
6. **The tithe** is due at month's end. The reeve collects it; Garth carts it to the tithe barn. The town is poorer every year.
7. **Small things**: the bell tolling itself at midnight; crows sitting in rows on the tithe barn; a purple light seen once on
   the hill road; milk souring overnight; Homunculus the smith insisting *he* is the real Tessariel.
8. **The silver knight.** A knight in silver walks a slow square round the green south of the square, all day, stops, folds
   his arms, walks on. Friendly, says good evening, never asks the way anywhere, never comes through Bram's door. The town has
   got used to him and knows next to nothing. Tilly has put stones on his corners. He's Tessariel's (silver and the Light),
   so he is a **T** thing: nobody puts him in a line with the church, the black knight, the bell's warden or the Ashbys, and
   no Ashby speaks of him. Write him in lightly; don't explain him.

## Tone and voice (for the writers)

- Grim, wry, warm. People who live under a demon king and get on with it: bread, beer, babies, gossip. Humour is the
  townsfolk's armour, but the fear is real, and it shows in the gaps.
- Plain, concrete, physical language, rural and a little old-fashioned in rhythm, but **no fake-medieval** ("forsooth",
  "thee/thou", "m'lord" spelt like that, "aye" in every line). An "aye" or a "mind" is fine now and then, from the right
  mouth. No modern idiom ("okay", "deal with it", "literally", "vibe", "no way", "you guys").
- Every person has their own voice: their own words, sentence length, what they notice, what they won't say. If you can
  swap two people's lines and nobody notices, both lines are wrong.
- Show, don't explain. Nobody delivers lore; they complain, boast, joke, worry, and the lore leaks out.
- Specific beats generic: "Silas has nine coffins in his yard and no one to put in the ground" beats "people are dying".
- No video-game clichés: no "arrow in the knee", no "I used to be an adventurer", no "greetings, traveller", no "you look
  like you can handle yourself", no fetch-quest winking. No meta jokes about the game.
- Short. A balloon line (said aloud in the street) is at most **90 characters**. A panel line (said to the player face to
  face) is at most **280 characters**, usually much less. Two short sentences beat one long one.
- Kids talk like kids: bossy, literal, obsessive, funny without trying, and scared of the right things.
- Velscour is feared, not mocked to his face. Tessariel is spoken of carefully. Nobody in town is evil; a few are cowards;
  a few are braver than they look.
- `{name}` is the player's name. Folk only use it once they've been told it (the game sends `first` lines before that).
  Don't open with it: most greetings shouldn't use it at all.
- **The first meeting** is the line people remember. Only Bram, Pip, Kit, Tilly, Corwin, Isolde and Jory say "thirteen" in
  it; only Homunculus, Wren, Cedric, Aldric and Hob remark on the missing armour or sword; only Sabine and Elowen mention
  coming down with Old Lis. Everyone else finds something of their own to notice.
- **No joke twice.** A joke, a turn of phrase or a bit of business belongs to one person. Counting is Bram's; "Course you
  are" is Bram's; "Let me look at you" is Margery's.

## How lines are kept for later (src/folk/quests.js `sayable`)

Any list of lines can hold, besides plain strings:
- `{ before: 'toll_of_bell', say }` (the helper `ringing(say)`): only while the bell still tolls each midnight; and
  `{ after: 'toll_of_bell', say }` (`quiet(say)`): only once its warden is put down. Anyone whose lines count the bell has
  both, so their talk changes when the bell stops. `before`/`after` take a quest id (meaning handed in) or a flag as it stands
  (`'quest:dead_cant_wait'`: taken; `'arrived'`).
- `{ met: 'bram', say }` in `first`: said instead once the player's had a word with that person. The panel says the last
  `first` line that fits, so a person's plain first line comes first and the ones that know who you've met follow it.
- `gift` (Agnes, Maudie): food for nothing, once, to a player with no coin: a little health and a note. Agnes's roll on
  meeting, Maudie's heel of bread as she sees you off.
- `old`: what Bram, Nell, Orrin and Sabine say, a line at a time, when the player answers the tale of the twelve and their
  beautiful woman with "She wasn't beautiful. She was old."
- `ask.silver`: the silver knight, for the few who'd say anything about him.
- Silas's counter: `shop.sell` thanks you for a skull, `shop.sell_bone` for bone shards.
Scenes take `after` and `until` the same way (src/folk/lines/scenes.js). Small talk is tagged with who may have it: a
married pair, kin, parents of little ones, townsfolk or gentry, the old, those who keep a counter.

## The cast

Ages are rough. `model` is the body (tools/folk/models.json; `swap` = a recoloured copy of another body). `home` is the
house they sleep in (village house index in brackets, from tools/village/build_village.py; NEW = built for this).

### The Tolling Bell (the inn) [0]: the Kettles
- **Bram Kettle**, 50, innkeeper (`elder`). Dry, unhurried, counts everything: coins, mugs, Tessariels. Keeps **the Tally**
  on a slate behind the bar and greets the player with their number ("Thirteen. Course you are."). Fair, tight with credit,
  quietly kind. Notices more than he says. Rents beds. Gives the first quest.
- **Maudie Kettle**, 48, his wife, the inn's cook (`wife_jolly`). Loud, warm, bossy, sings while she cooks (old songs, some of
  them Tessariel hymns with the words changed). Feeds everyone. Fears for Nell.
- **Nell Kettle**, 19, their daughter, serves at the bar (`young_2`). Quick, sharp-tongued, bored, wants out of Bellmourn;
  the Tessariels are the most interesting thing that's ever happened here and she knows it's sad. Kind under it.
- **Pip Kettle**, 10 (`boy_1`). Runs errands, sells "news" for a copper, cheeky, collects Tessariel stories and acts them out.
- **Kit Kettle**, 7 (`kit`, swap of boy_1, a little smaller). Pip's shadow. Copies everything Pip says, a beat late.
- **Orrin Vey**, 70, lodger in the inn's back room (`sage`). A scholar who came to study the cathedral's library twenty years
  ago and never left. Pedantic, kind, forgetful, a little brave. Knows the old faith's history and the catacombs' plan from
  books. **Sells spell scrolls.** Half-suspects what Old Lis is.

### The chandler's [1]: the Tallow twins
- **Elspeth Tallow**, 74, chandler, widow (`crone`). Candles, lamp oil, tallow, wax. Sour, sharp, nosy, honest to a fault,
  and secretly soft on her granddaughter. Hates "those tin-pot Tessariels". Her twin sister is a liar and she'll tell you so.
- **Magda Tallow**, 74, Elspeth's twin, widow (`magda`, swap of crone). Runs **the curio stall** in the square: gems, oddments,
  and she'll buy anything you dragged out of a hole. Sweet, chatty, a gentle swindler, believes every rumour and starts half
  of them. The twins haven't agreed on anything in seventy years, and they share a bed because neither will take the floor.
- **Wren Tallow**, 12, their granddaughter (`girl_3`). Wears goggles. Tinkers. Has appointed herself squire to Homunculus the
  smith and believes in him completely. Practical, fearless, scornful of the other children's games (and joins them anyway).

### The stone manor at the east end [12]: the Ashbys (red and gold)
The reeve's house: the new stone manor at the far east end of town, the house nearest the church.
- **Reeve Corwin Ashby**, 55 (`lord_red`). Collects the Dark Lord's tithe; keeps order; pompous, anxious, insists on his title,
  quotes regulations, frightened of his masters and of his wife. Not cruel; small. Thinks the black knight is a sign the
  Throne is "taking an interest" in Bellmourn, which terrifies him.
- **Lady Isolde Ashby**, 50 (`lady_red_busty`). The real power in the house. Cold, clever, ambitious for her children, has
  plans to marry them upward (to the Throne's men). Loyal to Velscour by choice, not fear. Dangerous, elegant, funny in a
  cutting way.
- **Cedric Ashby**, 22 (`youth_red`). Hothead; swaggers; idolises the black knight ("that's what a real knight is"); wants to
  ride to the capital and serve. Secretly in love with **Elowen Halloway**. They meet by the old oak after dark.
- **Rosalind Ashby**, 20 (`lady_red_1`). The romantic: reads forbidden love stories, wants something to happen, sighs.
- **Seraphine Ashby**, 18 (`lady_red_3`). The pious one, devout to the Throne, earnest, a little frightening; reports things to
  her mother.
- **Juliana Ashby**, 16 (`lady_red_2`). The youngest: bored, sarcastic, sees through everyone, sides with whoever is losing.
  (The three sisters look alike. People confuse them. They hate it.)

### The old house on the square [2]: the Halloways (blue and gold)
The old family house on the square, by the well. Poor, draughty, kept up as well as it can be. Nothing of theirs goes east
toward the church.
- **Lord Edric Halloway**, 58 (`lord_blue`). Grave, courteous, poor. Keeps the old faith in secret (a hidden shrine in the
  house; his late father's prayer book). Watches the player very carefully: a Tessariel who can actually *do* something.
  Takes the afternoon watch at the gate on the west road, for his brother.
- **Lady Margery Halloway**, 55 (`dame_blue`). Grey, gentle, sharp-eyed. The town's peacemaker. Knows about Cedric and Elowen
  and hasn't said.
- **Elowen Halloway**, 21 (`lady_blue`). Brave, generous, restless; teaches the village children their letters; meets Cedric
  at night. Believes the Tessariels deserve kindness, even the mad ones.
- **Tobias Halloway**, 17 (`youth_blue`). Bookish, earnest, desperate to be a knight; trains with a stick; worships his uncle.

### The tower house [11]: the watch
- **Ser Aldric Halloway**, 52, captain of the watch (`knight_blue`). Edric's younger brother. An old soldier, tired, decent,
  practical. The watch's posts are the south-west road and the gate on the west road, where strangers come in; there is no
  post at the east end. Faces the facts: the town can't fight the knight or the dead; it can only keep its lamps lit. Respects the
  player's magic, distrusts prophecy.
- **Jory Pell**, 66, night watchman (`jory`, swap of worker_2). Sleeps by day, walks the town with a lantern by night.
  Superstitious, talkative, sees things (some of them real). Swears he's seen the beautiful woman, twice.

### The south cottage [3]: the Fenwicks
- **Hob Fenwick**, 30, farmer (`dude`). Steady, slow-talking, practical, worried about the harvest and the tithe.
- **Bess Fenwick**, 28, his wife (`young_3`). Brisk, funny, runs everything, including Hob.
- **Tilly Fenwick**, 9 (`girl_1`). Bossy, organises the children's games, makes up the rules as she goes.
- **Tam Fenwick**, 6 (`boy_2`). Quiet, follows Tilly, asks the questions adults won't answer ("Are the dead people cold?").
- **Dob Fenwick**, 30, Hob's twin (`dob`, swap of dude). Dreamer. Has been building a cottage for Ivy for two years and it
  still has no roof. Sleeps in the tithe barn loft meanwhile. Wants to be a Tessariel for a day ("just to see").

### The smithy [4]
- **Homunculus the Proud**, 45, blacksmith (`smith`). Enormous, magnificent, deluded. Calls himself a paladin of the Light,
  and lately insists that *he* is the true Tessariel, and the beautiful woman never came for him because she knew she couldn't
  fool him. Speaks in grand pronouncements; refers to his hammer and anvil by name; tender with children and horses. A very
  good smith. **Sells staffs, and forges new ones** from Grave Iron and Bone Shards brought up from the catacombs.
  He is the Homunculus of VELSCOUR (Agilancer/velscour, `src/data/homunculus.js`): he kept the forge at Herrington Hollow two
  hundred years ago, and has not aged a day since, which he puts down to clean living. It's the axe. On the wall of that forge
  he found a great axe under seven chains and a note that said DO NOT; he took the note down. Shut in it is **Varrow the
  Rimebound**, Knight of the Pale Rune, a death knight, whose voice he took for the Light and then for a saint ("Saint
  Varrow"), and whose borrowed power, green and cold, he takes for a paladin's. Varrow could have had him any night of those
  two hundred years, and hasn't, because he says good morning to it every morning. Here the axe hangs on a rack in his yard,
  out under the lean-to on the north side of his house, where he works all day: the fire and its bellows, the anvil
  (Patience; Gertrude was the Hollow's), the slack tub, the bench, the grindstone. First thing every day he takes the rag
  from his belt to the axe; it answers him (`src/folk/lines/smithy.js`). The owner's friend in life: he has his own model.
- **Dunstan "Dusty" Bray**, 14, his apprentice (`boy_3`). Deadpan, sooty, unimpressed, loyal. Translates Homunculus for strangers.

### The alehouse [5]: the Brewers
- **Big Hilde Brewer**, 45, alewife (`wife_big`). Brews the best ale on the Long Road, has buried two husbands ("both happy"),
  laughs from the belly, flirts with anything that stands still, fiercely protective of her girl. Sells ale at her stall.
- **Lily Brewer**, 7 (`girl_lily`). Hilde's daughter. Invents games, talks to the crows, small and fierce.
- **Ivy Thatch**, 24, Hilde's niece (`young_5`). Works the ale stall, engaged to Dob Fenwick, out of patience with the roofless
  cottage, practical and wry.

### The tithe barn [6]
- **Garth Underhill**, 40, the reeve's tithe-man and the town's labourer (`worker_2`). Huge, slow-spoken, gentle; ashamed of
  carting off his neighbours' grain for the Throne. Sleeps in the loft (with Dob, who snores).

### The tannery [7]
- **Wes Harrow**, 50, tanner (`wes`). Gruff, few words, smells of the vats and knows it, kind to children and dogs. Has strong
  opinions about the Tessariels' boots. Lives alone since his wife died; doesn't talk about it. His dog Moth is never seen:
  she's under the bench, or off at the stream, or growling at the west wall. Talk about her, never to her.

### The weaver's [8]: the Reed sisters
- **Tamsin Reed**, 32, tailor and weaver (`redhead`). Small, fierce, red-haired, foul-mouthed (in a cut-off way), brilliant with
  cloth. **Sells robes and makes them**, from Shroud Silk the dead are buried in. Has opinions about everyone's clothes,
  particularly the player's.
- **Wenna Reed**, 26, her sister, the dyer (`young_4`). Dreamy, sweet, purple to the elbows, notices colours and moods; sings.

### The hunter's lodge [9]
- **Corran Thrale**, 40, hunter and trapper (`worker`). Lives at the west edge, by the Long Road where the player first comes
  in. Haunted: he's seen what's in the pines. Practical, terse, angry at the town for pretending. Pays for the dead to be put down.

### The coffin maker's [10]
- **Silas Crane**, 68, undertaker and sexton (`old_man`). Gallows humour, gentle with the grieving. Nine coffins in his yard and
  nowhere to bury them since the knight came. Knows the catacombs and the old **Sexton's Door**, a side way down into the
  crypts that the knight at the great door can't see, and has its key. **Sells skulls**, cleaned and carved, and carves new ones
  from Bone Shards.

### The bakehouse [13], at the east end
- **Agnes Bramble**, 38, baker (`worker_f`). Up at four, done by noon, hears everything first (bread is the town's news). Widowed
  young, cheerful, practical, nosy. Sells bread.
- **Hal Bramble**, 10, her son (`hal`, swap of boy_2). Flour-dusted, wants to fight monsters, Pip's best friend and rival.

### The herbalist's [14], at the east end
- **Sabine Moss**, 34, herbalist and midwife (`young_1`). Calm, clever, rational, dry. Has traded with Old Lis for years and
  knows more about her than she lets on. **Binds wounds** for coin (heals the player).
- **Bryony Moss**, 8, her daughter (`bryony`, swap of girl_1). Collects bones, beetles and dead things; very serious about it.

Forty-one people. Plus Old Lis, who just arrived (not part of this cast; she's the intro's). Out past the town there's one
more to talk to: the Bellwright and Ser Hale (see Beyond Bellmourn), and the seven posted in the small towns.

## Merchants and trades

| Who | Where | Sells | Buys | Crafts |
| --- | --- | --- | --- | --- |
| Homunculus | smithy | staffs | staffs | staffs (Grave Iron, Bone Shards, gold; rare+ adds Soul Ember) |
| Tamsin | weaver's / her stall | robes | robes | robes (Shroud Silk; rare+ adds Grave Wax, Soul Ember) |
| Silas | coffin maker's | skulls | skulls, Bone Shards | skulls (Bone Shards; rare+ adds Grave Wax, Soul Ember) |
| Magda | curio stall | gems, oddments | anything | |
| Orrin | the inn's back room / the square | spell scrolls | scrolls | |
| Sabine | herbalist's | healing (service) | | |
| Bram | the inn | a bed till morning (service) | | |
| Hilde, Ivy | ale stall | ale (a little life back) | | |
| Agnes | bakehouse / bread stall | bread (a little life back) | | |
| Elspeth | chandler's | lamp oil, candles (flavour) | | |

Stalls open mid-morning and close at dusk; merchants pack their wares away and go home. At night a shopkeeper woken in bed
does not trade (and says so, in character).

**Crafting materials** drop from the dead in the catacombs: **Bone Shards** (common), **Grave Iron** (nails, coffin
fittings, old blades), **Shroud Silk** (burial cloth), **Grave Wax** (rarer), **Soul Ember** (rare, from the strong ones).

## Starter quests

1. **A Bed and a Bell** (Bram). The player is Tessariel number thirteen. Bram's had twelve; eleven are dead or gone mad. The
   thirteenth gets a bed and a warning, and if they actually mean to *do* something, Bram says: go and see Silas, who's got
   a problem that needs someone foolish. (Talk to Silas; then tell Bram, or just take the bed he's keeping you that night.)
   Reward: the player's first skull, a plain common one Silas sends up with his word. A new game starts with none.
   Till it's taken, the journal's first page points the player at Bram Kettle at the Tolling Bell.
2. **The Dead Can't Wait** (Silas). Nine coffins, no burials, and the crypts are emptying upward. He gives the player the key
   to the Sexton's Door, in the churchyard wall out of the black knight's sight, which leads down to the Reliquary. Put down
   the dead in the Reliquary (kill 8 undead in the catacombs). Reward: gold, and Silas will carve skulls for them.
3. **Bones for the Bone-Carver** (Silas). Bring 10 Bone Shards: he carves a skull (rare).
4. **Iron from the Dead** (Homunculus, with Dusty translating). Bring 8 Grave Iron: he forges a staff "worthy of a lesser
   Tessariel" (rare).
5. **Shroud and Thread** (Tamsin). Bring 8 Shroud Silk: she makes "something you won't be buried in" (a rare robe).
6. **What Walks in the Pines** (Corran). Put down 12 of the dead in the woods outside town. Reward: gold, and his thanks,
   which he's never given anyone.
7. **The Toll of the Bell** (Orrin). The bell tolls at midnight with no one to ring it. Orrin's books say the Bell Crypt under
   the tower holds the bell's warden. Go down at night and silence it (kill the champion in the Bell Crypt). Reward: a spell
   scroll of his choosing, and a page of history.
8. **A Letter Across the Square** (Cedric). Carry a sealed letter to Elowen Halloway, say nothing to anyone, bring her answer back.
   (Two talks. No fighting. The letters are the best writing in the town.)

Iron from the Dead, Shroud and Thread and The Toll of the Bell can be given before Silas has handed over his key: their
offers and their journal lines say that the great door has the knight in it and that Silas has the key to another way in.

After these, merchants' stocks and crafting open up, and the townsfolk's talk moves on (they react to what the player has done).

## Beyond Bellmourn (the lands, `src/core/lands.js`, `src/core/sites.js`)

Bellmourn sits in a small clearing in a very big country. Everything past the pines is far: a long walk, kilometres, not
minutes. Most townsfolk have never been further than the hill road. A few have (Corran, the carters, Hob's cousin Abel), and
they're the ones who talk about it. (The carters and Corran go out the east side, where the downs open: the downs road
forks off before the hill road climbs to the church, so nothing of the Bellwright's is on the church's road.) Writers: nobody in town has been everywhere, and what they know is second-hand and wrong
in the details.

**The countries**, by compass from the town. Each place is a **V** (Velscour's), a **T** (Tessariel's) or neither, and the
two-letter rule holds out here too: no V place is near a T place, and nobody puts the two in one line.

- **The Green Downs** (east, a long day). Sheep, barley, chalk. **Millhaven**, a hamlet with a farm and a windmill; Hob's
  cousin **Abel** farms there (not Wat: Wat Cotter is Silas's dead man). **Brightwater Falls** down the cliff, a fisher's hut on its pool. On a knoll: **the Bell Tower of the Four Watches** (T), in its walled yard, a ring of watch-stones round the knoll. West of the Abbey Road, **the Cairnfield**: dozens of cairns round a great one, some opened. Where the downs run out on the Gallows Road, **Thornwick** (below).
- **The Weeping Fen** (north). Reed, black water, mist. **Sallowmere**, the big mere, with a jetty nobody uses now; Sabine's
  bog myrtle grows on its east shore; the eel-fishers' huts stand on legs where the Fen Way meets the south shore. Further in, **the Drowned Chapel** (T), half under the water. Off the Fen Way, **the Sunken Mile**: the old pale causeway, its slabs tipped, its waymark down.
- **The Rustwood** (far north-east). Red-leaved, always autumn. **The Abbey of Saint Ossery** (T), a ruin with its bell-cote
  standing; **the Fungal Ring**; **the Woodcutters' Camp**; and on the Abbey Road **Ossery Quarry**, the pale face the abbey was cut from, its crane still up.
- **The Ashen Waste** (far west). Grey ground, no birds. **The Caravanserai of Khel**, where the carters used to rest; **the Charred Mill**, a post mill burnt where it stood, north of the road; **the Bone
  Field** (V, well south-west of Khel); **the Black Obelisks** (V), with braziers. At the end of the west road, **Blackvigil Keep** (V): Velscour's keep,
  black stone, red cloth, a curtain wall and four towers and a great keep, gibbets and braziers lit day and night all along
  **the Vigil Road**. Its gate is shut, and it has no seal: the order never had a house there. Nobody in town knows who's inside; Corwin Ashby knows more than he says and says nothing.
- **The Barrow Moor** (far south-west). Mounds. Lights at night (the jellies of bone, see below). **The Nine Maidens**, a ring of stones, the Piper standing off from them. On the Barrow Track, **the Moor Wayhouse**: a drovers' house, half of it still roofed.
- **The Rimeholt Fells** (far south). Snow, pines heavy with it. **Frostwatch**, an old watch-fort with a gate north to the road and south to the fells; **the Frozen Shrine** (T),
  where Edric's grandmother was married when it wasn't frozen. Past Frostwatch, **the Howling Mouth**, where the wind comes out of the hill; further, **Ravens' Tor**, a stack of rock with a hermit's stair cut round it.
- **The Gallowswood** (far south-east). **Hangman's Cross**, **Mother Grawl's Hut** (a witch; not Lis, and nothing like her),
  **the Twisted Grove**. On the Gallows Road before the Cross, **the Old Toll**: the tollhouse burnt, its bar broken.
- **The Deepwood** (north-west, near). **The Hermit's Hollow**. On the Vigil Road at the wood's west edge, **Cinderford** (below).
- **The Sorrowhorn** (north-west), the mountain seen from partway up the hill road on a clear day (the pines hide it from the town). **The Broken Stair** is the old way up.
  At the top, **the Crown of Teeth**: a lake frozen to the bottom, a spire of black glass standing out of it, twelve white
  pillars bearing nothing, and a rim of black stone teeth. Neither V nor T. Nobody knows whose. Orrin wants to.

**The Four Watches.** The order rang the four watches of the night on four bells hung in the Bell Tower on the downs, and
its three houses answered each from their own bell-cotes: the abbey in the Rustwood, the chapel on the fen, the shrine in the
snow. (First watch at dusk, the third the worst, the fourth done at first light; no watch by day.) While they rang, the dead in
the land kept their beds. The tower's tenor, the oldest, was cast in Bellmourn, in a pit on the green, when Bellmourn was a
crossroads; it's still hung, whole and silent, and the dead remember where it was cast. That's why they roam the pines but
don't come into the town (the watch thinks it's the lamps; Orrin always said it was older than lamps). Forty years ago the
ringing was forbidden, and stopped. (Writers: the Bellwright never says who forbade it, and never speaks of the church.)

**Ser Anselm Toller, the Bellwright** (`paladin_bellwright`, a TOWN_KNIGHTS entry; lines in `src/folk/lines/beyond.js`).
64. Sworn at fourteen; he rang the first watch himself as a boy, before the ringing stopped. The last of the order: a paladin in white plate with a gilded sword and the T on his board, who keeps four bells he's
forbidden to ring. Gruff, dry, lonely, very precise; counts the watches out loud. Not a Tessariel claimant, and he's seen the
claimants (two came over his knoll singing). He's the first person who takes the player seriously for the right reason:
the seal by his door woke when they came over the rise, the first time in forty years. A **T**: nothing of his goes near the church or the west road, he
never goes west, and no Ashby speaks of him. He has met Old Lis by day and a lovely young woman on the same road the same
night, and has thought about it.

**The seals.** Rings of pale stone, one at each house of the order and one at every road worth keeping. A woken seal lets you
step to any other woken seal. They woke for the order's wardens, then for nobody for forty years. They wake for the player.
They never woke for any of the twelve Tessariels. No seal stands at any of Velscour's places, or within a long walk of one
(`node tools/lands/check-vt.mjs` checks it). (Gameplay: `src/ui/lands.js`; there's one in a clearing just outside Bellmourn.)

**The jellies** (slimes, `src/sim/slimes.js`). Folk call them jellies. They came up out of the water a year or two back:
the mere, the fen pools, the millpond, the falls pool. Slow until they aren't; they hold on; the big ones split. The barrow
moor's are full of bones and glow at night (Jory's "lights"). Nobody knows where they came from. Neither V nor T.

**Charms.** Small old things of the order, worn not wielded. Every charm carried works. **The Wingbell** (the Bellwright's
gift: a bell the size of a thumb; ring it in the air and the air holds you one step more) gives a second jump.

## Quests beyond the town

9. to 11. (**The Long Way Round**, **Jelly in the Millpond** and **The Four Watches** were given from Bellmourn and the Bell
    Tower and sent you kilometres and back. They're the Green Downs' now, below: the millpond is Abel's own to ask about,
    why the dead walk wide of the knoll is asked on Abel's errand up it, and the Wingbell is paid for **What Answers**.)
12. (**What the Fen Keeps** was Sabine's, 3.4 km out and back. It's the Weeping Fen's now, below: the east shore is the
    ferry's landing, and Grizel Wade's to ask about. Sabine's work is **Willow Bark**, up the Fen Way to Maren Rush.)
13. **The Black Road** (Aldric). Go and look at what's at the end of the west road. Only look. (Blackvigil.)
14. (**The Crown of Teeth** was Orrin's, four kilometres off. It's Isla Crag's now, at the foot of the Sorrowhorn: the Deepwood, below.)
15. (**Lights on the Barrow Moor** was Jory's. It's Sal Mattock's now, at the Diggers' Camp beside the mounds: the Barrow Moor, below.)

## The small towns (`src/folk/people.js` POSTED, lines in `src/folk/lines/land.js`)

Seven people are posted out in the land, in the townsfolk's own bodies (recoloured: `tools/folk/posted_swaps.py`). They
stand at one spot day and night (job `posted`), so nothing they say should need them to be anywhere else. Thornwick and
Cinderford are **of neither letter**: nobody there names Velscour or Tessariel, nobody at Cinderford speaks of the Bell
Tower, and nobody at Thornwick of the keep. (`tests/quests-beyond.test.mjs` reads every line for it.)

**Thornwick** (south-east, two days by cart, where the downs run out on the Gallows Road). Sheep, mutton, and the hedge:
eight foot of laid blackthorn, "the only wall plain folk were ever let build, because it's only a hedge". The road south-east
of it, to Hangman's Cross, is shut: plague stragglers come up it from the Gallowswood, and goat men come down off the downs
to lean on the hedge.
- **Dorcas Pym**, 57, keeper of the Hare and Harrow (before its door). A widow; six rooms and no carters. Feeds first,
  asks after. Her subject is the road: who came up it and who didn't. Keeps a lamp in the south window "for whoever's still
  coming". The toll-keeper Wat Arden ate there every Thursday for thirty years. Hers: "Sit. You'll eat before you tell me."
- **Osric Thorne**, 44, hedge-reeve (inside the north-west gate). Three generations of hedgers; he's "mostly mended". Dry,
  tired, measures everything by the hedge. A billhook, not a desk. Hers and his never overlap: Dorcas talks of the road,
  Osric of the thorn.
- **Wymond Ebb**, 63, hedge-priest (by the market cross). Was a clerk in "a house with a roof and a name, and then one year
  there was neither"; he never says which. Blesses lambs, wells, weddings, the newly dead, "what's put in front of me".
  Says at night the names of everyone he's buried, in order of the letters. Gentle, wry, a little pleased with himself.
  He has met an old woman with a stick who blessed the same ewe straight after him.

**Cinderford** (west, two days along the Vigil Road, on a ford: the last free hearths before the Ashen Waste). A stockade,
a watchtower, charcoal kilns, a refugees' camp over the ford. Its captain rode west to parley and didn't come back; four of
its own came back possessed and knew the gate-word.
- **Brenna Hasket**, 39, sergeant of the watch (foot of the watchtower). Eleven on the wall where there were thirty. Speaks
  in reports: place, number, what she can't see. Calls the keep's men "red over black" and says they "don't shout, don't
  loot, and don't hurry". She wrote to Bellmourn for men; Aldric wrote back, very civil, with none.
- **Colm Burrage**, 52, charcoal burner (before the kilns). Slow; everything is a burn to him: white smoke is the wet coming
  off, blue is the wood giving up, and the trade is "saying no to a fire for five days". Sold to every forge from here to
  Khel, and to a smith in Bellmourn who sends a note about how he suffers and never the money on time. Says "Mm."
- **Ysolt Marrow**, 27, out of Khel (the camp by the ford). Kept the weighing table at the Caravanserai of Khel; was in the
  cellar after salt when the riders came and asked, very civil, for water. Looks at boots. Keeps half of everything. Her
  husband **Edmer**, who kept Khel's stables, stands possessed at the door of the Charred Mill in the blue jerkin she mended.
  Flat, careful, exact; never raises her voice.

**Frostwatch** (far south, up the Frost Road, in the snow).
- **Hew Garrick**, 48, warden (the yard). A tower, two long houses and him. Took six men down the Howling Mouth eleven
  winters back, roped, and came up with two and no rope. Says "Hm." Advice in pairs: "If you're cold, move. If you're tired,
  don't sit." Bram Kettle has owed him for three carts of venison since the winter the well froze.

**Ser Hale Orrowick, Paladin of the Fifth Watch** (`hale`; a `BEYOND` entry, his body the knight flagged `hale` in
`src/core/knights.js`; at the Bell Tower beside the Bellwright). 36. An Orrowick of the low field at Millhaven: he left
his plough stood in the furrow two springs back and went up the knoll, four miles. His harness is pieced together from what
the fallen claimants left on the downs (he buried four of them himself): none of it matches, the left pauldron swings, and
it's packed with fleece where it's big. **The fifth watch** is his own: the hour after the Bellwright's four, before the sun
is properly up, "when everyone's sure it's over and stops looking. That's when the fox comes." He swore it at the
Bellwright's door; the Bellwright said it wasn't a real oath and lent him his whetstone. They get on: he's "the ploughman",
the Bellwright is "Ser"; he holds the ladder; the Bellwright leaves the second cup out. Earnest, practical, a farmer's
figures of speech (furrows, hedges, bulls, foxes), never grand. Abel Fenwick cuts his barley and "burns too green".
He's **Tessariel's** (a T), and he gives the quests against Blackvigil, so the writing is careful: years ago he drove a cart
west to Khel for salt and saw what rides out of the keep past it (big men on black horses in twos, and one on foot behind,
"bigger than a man ought to be, with no helm. A face. Eyes like a banked forge"). He never names Velscour or Blackvigil; he
says "the keep at the end of the west road". No line of his, and no line of his quests, names anything of the order's (the
tower, the bells, the watches, the seals, the Bellwright) together with the keep or anyone in it; the journal of his
Blackvigil quests sends you "back to Ser Hale Orrowick" and doesn't say where.

**The dungeons, as people know them.** The Hollowfang Warrens: Corran knows the tracks go in; Hob has lost nine sacks and a
wheelbarrow to them. Blackvigil Keep: a knight with a shield like a door at the gate (Maldrec), a robed one with a black
book (Sorvane), two that fight as one (the Brothers), and the Castellan at the top; the lords are great knights with a
villager's face where a helm should be. The Howling Deeps: the Goat-King's Hall, past the frozen herd, where Hrymgar is (horned
like the goat men and three times the size, ice grown on him); below, something that breeds (eight legs apiece, on
threads); under that, a lake of ice with a thing asleep in it, whose breathing is the howl.

## Quests of the land (`src/folk/land-quests.js`, words in `src/folk/lines/land.js`)

Out of Bellmourn:
16. (**Word to Thornwick** was Aldric's, a 3.3 km walk to ask if the Gallows Road still runs. Cut: Thornwick opens on its own.)
17. **Tracks Going West** (Corran, after the Pines). The dead in the pines came down the Vigil Road. Ask Sergeant Hasket.
18. (**Owed to Frostwatch** was Bram's, a 4 km walk from his bar and back. Bram's purse is carried up from Fellfoot now, by
    Berin Stoat, who's carried it every autumn for eleven years: **Kettle's Slate**, the Rimeholt Fells, below.)
19. and 20. (**The Millhaven Man** and **Stones on the Cairnfield** are the Green Downs' now, below: Abel asks after Hale
    himself, and Cuddy Stone, who keeps the cairns, wants them let alone.)
21. (**The Sunken Mile**, and the Drowned Vaults' two after it, **Under the Mile** and **What Sank the Mile**, were
    Sabine's. They're Tamar Dyke's now, the salvager at Mile-End Camp beside the causeway: the Weeping Fen, below.)
22. (**The Wayhouse on the Moor** was Jory's, and the Kingsbarrow's two, **Sung Open** and **The King Under the Moor**, after it.
    They're the Barrow Moor's now: Alis Penn's at the wayhouse, and Master Lucan Dree's at the Kingsbarrow's door. Below.)
Also out of Bellmourn: **The Masons' Marks** (Orrin): kobolds tunnelling behind the face of Ossery Quarry, where each of
the abbey's masons cut his mark.
From one person of a hub to the next (a word carried, paid where it's said; each ends with the person, whose own work is
then on offer): (**A Plate at the Hare** and **The Man at the Cross**, Thornwick's, are cut), **Sacks Nobody Came
For** (Hasket to Colm), **Out of Khel** (Colm to Ysolt). And **The Arch Before the Gate** (Hasket): to the end of the Vigil
Road and through the portal before Blackvigil's gate.
(The catacombs' two, **Further Down** and **Waxed Thread**, were cut when the quests were remade round the camps: more of
the same work under the church. docs/QUEST-LOOP.md.)
The Hollowfang Warrens (`src/folk/regions/bellmourn.js`): 25. **Something Dug This** (Corran): go through, and put down
twelve goblins or kobolds while you're there (what was Hob's **Barley Thieves** is folded into it: his barrow's wheel-mark
goes in at the arch, and Corran pays him out of it). 27. **The Tunnel-King** (Corran): Grubnash. 28. **Mother of the
Warren** (Aldric): Skrit and Skrat, then Venomaw.
Thornwick: 29.-33. (Osric's, Dorcas's and Wymond's are Thornwick and the Gallowswood's now, below; **Thursdays** goes only
as far as the Old Toll, to Ann Arden, and **Salt for the Hanged** is Master Crowle's, at the Cross.)
Cinderford: 34. **They Know the Gate-Word**, 35. **Two on the Ridge**, 36. **The Vigil Road** (Hasket). 37. **Nobody at the
Weighing Table** (Colm; Khel). 38. **The Charred Mill** (Ysolt; Edmer; she pays with the cloak she carried out).
Frostwatch: 39.-44. (Garrick's, the Deeps' and **The Sleeper** that was Ser Hale's, are the Rimeholt Fells' now, below;
**Ravens' Tor** is Dain Scree's at Climbers' Rest; Ser Hale's **The Howling** is cut, and so is Garrick's **Wardens of Ash**
to Phobos.)
Ser Hale: 45. **The Gate at the End of the West Road**,
46. **Twenty of the Garrison**, 47. **The First of the Lords**, 48. **Sorvane and the Brothers**, 49. **The Castellan**
(he pays with a skull he had Silas carve, for everything Abel ever sent him).

## The four roads out (`src/folk/regions/bellmourn.js`, lines in `src/folk/lines/regions/bellmourn.js`)

A quarter of an hour out of Bellmourn on each road there's a camp with two people at it: one who has most of its work and
keeps its board (a sutler: buys anything), and a second across the fire with one quest of their own. They're the first
people a player meets out of town, and the ring steps up: Hillfoot at three to five, Withy at four to six, the Forkstone at
five to seven, Palmers' Rest at six to eight. **Plain folk's**: none of them names either power or anything of theirs. Each
camp is sent to from town by one of the eleven Lisandra sends you round to (a word carried, paid at the camp; three of the
four go through what dens beside the road on the way), and each sends you on when its last work is done. **No animals are
built at the camps**: Tobin's mare is in the lean-to and is only heard; Nan's herd is down in the dip behind the stone.

- **Tobin Wain**, 54, carter, at **Hillfoot Halt** on the Hill Road (`c_worker_2_1`). Thirty years carting barley up the
  hill to the Downs and flour down. Measured, dry, thinks in loads, wheels and gradients. His mare is Pudding, nineteen;
  she kicks the lean-to's boards for strangers and he trusts her nose over his eyes. Sleeps under the cart ("the one roof I
  trust. I know what it weighs"). His line: "Everything's a load. It's only a question of how far." Sent to by Hob (**The
  Carter's Late**). His work: **Linchpins** (kobolds draw the pins from the wheels and nothing else; none are found on
  them), **Iron on the Fence** (the tyres off his wheels, hung on Gnawbone Stockade to be beaten with bones; he can't sleep
  without the ringing after), **Candlewick** (the kobolds' diggings under the road, where the pins went; pays his father's
  cart shaft, a staff), and on: **A Light for the Bend** (to Cuddy Stone at Cairnwatch).
- **Bet Carrow**, 41, carter, stuck at Hillfoot Halt (`c_worker_f_1`). Tiles and lime down from the Downs kilns. Lost a
  wheel on the bend when the pin came out; her cart's on blocks, twelve days. Short-tempered, swears by the parts of a
  wheel ("Spokes and felloes"). One of the dead stacked her tiles for her and she doesn't tell Tobin. Gives **A Pole Across
  the Road** (three goblins who've half understood a toll; she keeps the pole for a shaft).
- **Maren Rush**, 31, withy-cutter, at **Withy Landing** on the Fen Way (`c_young_3_1`). Cuts and boils willow for
  Bellmourn's baskets, hurdles and wattle; her hands never stop and she doesn't stop for talk. "Cut it to the ground and it
  comes back thicker. I've tried that with people. It doesn't take." Sent to by Sabine (**Willow Bark**: through the three
  goblins who cut her bundles' ties and watch; one claps). Her work: **The Path to the Water** (the web across the path
  north; Odo's punt-pole is in it: "He never said he'd tried to come"), **Muddle** (after Hats: the whole camp, the one that
  plaits with it: "I can't keep a camp of thieves for the sake of one that's learning"), **The Silk Dell** (the great one in
  the middle "sits and ties, all day, like me"; pays the skull that came up on her hook), and on: **Rods for Sedgebank** (to
  Odo Marsh; say it twice).
- **Tully Rush**, 24, Maren's cousin (`c_dude_2`). Followed a light into the fen and came back a week on "with one boot
  and no opinions". Agrees with everything, commits to nothing ("Could be"), stays where he can see it's a fire. Was minding
  the racks the night the baskets went. Gives **Hats** (Muddle Camp wears Maren's eel baskets; one comes back mended, over
  and under, in rush).
- **Nan Dray**, 47, drover, at **the Forkstone** where the Barrow Track leaves the Frost Road (`c_wife_big_1`). Minds
  other folks' cattle (thirty-eight head, in the dip) and is paid by the head that comes home. Blunt, reads people by
  their feet and handles them as she handles beasts. Her husband Tam is in Lychfield, three years; she kept the name and
  the dog. Sent to by Jory (**One Fire at the Fork**: through the kobolds who rolled off her salt; he counts her fire from
  the south lamp and they wave to each other after). Her work: **What Walks Round** (three spiders that circle the herd
  outside the firelight and carry off strays; after it she lets the fire down at midnight), **Bring Me the Bells** (the
  strays hang in the Hanging Larder; she owes each owner a bell and an account; the sixth bell is nobody's, and old),
  **Whistled Up** (Lychfield, where something calls and they get up for it: "he never once came when I called him"; pays
  Tam's coat, a robe), and on: **Word Down the Track** (to Amos Tye) and **Ponies for the Winter** (to Berin Stoat, at eight).
- **Dickon**, 16, Nan's herd-lad (`c_wes_2`). Keeps the back of the herd; two summers droving; earnest, corrects himself
  downward ("a look and a stick. Well. Mostly the stick"), calls her the mistress. Gives **They Drive Them** behind her back
  (goat men who cut cattle out of the herd better than he can, and keep them well). She has known for a month.
- **Old Perrin Lowe**, 73, palmer, at **Palmers' Rest** where the Pilgrims' Road leaves the Vigil Road (`c_old_man_1`).
  Has walked the seven stations to the foot of the Sorrowhorn forty-one times and never gone up it. Gentle, exact about
  paces, wry about faith without naming any: "Nobody's ever said what 'it' is. That's why it's lasted." Notches a stick for
  everyone who goes west. Sent to by Aldric (**The Palmer's Tally**: through the kobolds who take the sleepers' left boots
  and set them out in a row, toes to the west, a pebble in each: "They think that's how it's done. I'm not sure it
  isn't"). His work: **How Far They Got** (the Thornpit, then the lead tokens thrown in its thorns; one is a seven), **The
  Halfway Stone** (goat men at the stone where he and Dag Colley met to compare tallies; Dag's stick is on it, since
  spring: "I was the one who didn't walk"), **Seven Down** (at eight: up the path to Mumblefast near enough to hear what
  it says, his stations backwards, and then the ring emptied; pays the Stations written out, a scroll), and on: **Two Tallies** (to Dag at
  Ashgate Halt) and **The First Station** (to Fenn Hollis at Mossgate Hide, after Mumblefast).
- **Hild Ames**, 17, palmer, from Millhaven way (`c_young_5_1`). Five tokens and a very large blister; the only one to
  come down the Pilgrims' Road in eleven days (the peg at the fifth station was full, so she turned back). Plain-spoken,
  stubborn, means to go back up for six and seven. Gives **The Two Who Stand** (hooded things by the road that turned
  their heads together as she passed, "and kept turning"; there was a third she never saw).

Four their errands are said to (**Amos Tye**, **Berin Stoat**, **Dag Colley**, **Fenn Hollis**) stand at their camps as
placeholders, with a line each, till their own regions are made. (Cuddy Stone is the Green Downs', Odo Marsh the
Weeping Fen's, Amos Tye the Barrow Moor's, Berin Stoat the Rimeholt Fells', and Fenn Hollis the Deepwood's: below.)

## The Green Downs (`src/folk/regions/downs.js`, lines in `src/folk/lines/regions/downs.js`)

East of Bellmourn, levels five to eleven: Cairnwatch, Millhaven, the Bell Tower, Dunmow Fold and, far off the roads,
Kestrel Hide. The camps and Millhaven are **plain folk's**: none of them names either power; they say "the knoll", "the old
one in white", "the one in iron". The Bell Tower's two are **Tessariel's** (their own paragraphs are under "Beyond
Bellmourn" and "The small towns"), and nothing they say in these quests names Velscour, his keep or anything of his.
**No animals are built at the camps or in Millhaven, and none is said to stand there**: Rafe's fold is empty, Sib's sky is
empty, Joss's snares are empty, and that is what each of them talks about.

- **Cuddy Stone**, 61, cairn-keeper, at **Cairnwatch** above the Cairnfield (`c_sage_1`). Keeps the two hundred and twelve
  cairns of Bellmourn's first dead, and the beacon over the bad bend on the hill. Hasn't left the rise in eleven years:
  he sees everything from the platform and gets to none of it. Counts (cairns, smokes at dusk, scarecrows); gives
  bearings and paces. "Stand anywhere long enough and it all comes past. Lately it comes past and stops." His line: "I
  count it anyway, mornings. None. It's the best number I've got." Sent to by Tobin (**A Light for the Bend**). His work:
  **Three I Can't Account For** (go and stand at the three things he can see and can't explain: the opened cairns, the
  scarecrows' field, Paupers' Field), **Stones on the Cairnfield** (a robed one and three raised children, opening the
  cairns and stacking the stones by size, as his father showed him), **One More Each Morning** (Strawman's Acre: none at
  midsummer, five now, all facing the camp, the newest in his other coat; nobody was seen making them: the Barley Rows
  answer it; pays the coat, a robe), and on: **Sails at a Slant** (through the goblins on the Abbey Road to Millhaven:
  a word with Joan, then Abel).
- **Ede Lowry**, 34, washerwoman, up from Bellmourn (`c_young_2_1`). Her father Ned, a thatcher, died owing and went into
  Paupers' Field under a board; this year she has the money for a stone (Silas cut it "at the family rate. I'm not
  family. He said everybody is, in the end"). Plain, restless, not used to sitting. Gives **Name-Boards** (five boards
  from round the Field: all five say Lowry, four of them new wood: something in there is learning the name).
- **Abel Fenwick**, 49, farmer, on the green at **Millhaven** (`c_worker_2_2`). Hob's cousin: Hob "got the easy land, and
  the wife who can cook". Stands by the well with a shilling for any man who'll swing a scythe, and gets no takers.
  Put upon, exact about what everything has cost him, not asking to be pitied: "I say it so you'll not stand too near."
  Keeps Hale Orrowick's hearth lit and his barley cut, and burns too green. His work: **Jelly in the Millpond** (what
  ate the ewe, by the farm: "even what eats my sheep breeds better than they do"), **The Barley Rows** (four scarecrows he
  never made, standing guard over forty ripe acres; his own, nine years old in his father's felt hat, isn't where he
  stood it: it's the big wicker one, and "He's made himself company"; pays the pole he stood it on, a staff), and on: **The Millhaven Man** (up the knoll: is Hale coming home for the
  barley, and why do the dead walk wide of that hill and straight through his field? No; and the tenor bell).
- **Joan Millward**, 38, the miller's daughter, at her board on the green (`c_wife_jolly_1`; Millhaven's sutler). Old
  Enoch Millward, 71, is the miller, abed at her aunt's with his chest (the Bellwright's "Millhaven's miller ... He
  worries"); she lifts the sacks and dresses the stones. Brisk, weighs everything. "A miller takes a sixteenth. It's the
  only law I ever liked." The sails have stood a month. Her work: **Three Under the Sails** (three who stand in the
  mill yard like men being measured; the third has a sack held open with an old penny in it: "Then it's paid. Damn it.
  Now I owe it flour"), **Flour and Water** (Mudwall Stockade emptied, then her sacks from round it: the wall is paste
  of her fine white, "It's a receipt"), and on: **Bran for Dunmow** (through the goblins who wear her sacking to Rafe).
- **Ser Anselm Toller**'s work at the tower now: **Four Ropes** (the four bell ropes he took down forty years ago lash
  Bramble Stockade; the tenor's hangs from a thorn with a kettle on it, and they pulled it: "I have wanted to for
  forty years, and it took a goblin to do it"), **What Answers** (at nine: by night to the Horned Stones, where the great
  ram knocks the tall stone once at the third watch, then the ring emptied; pays the Wingbell), and on: **A Block for
  the Frame** (to Jem Sledge at Stonecarters' Halt). **Ser Hale Orrowick**'s: **A Right Pauldron** (five pieces of
  harness from the falls' shore, among the crabs: every one a left) and **Two of the Three** (the drake on the
  cliff-top and its two goblins: any two; it isn't on the hill, so it isn't his to fight). His eight older quests, down
  the Deeps and Blackvigil, wait for those dungeons' own people; the two that needed The Millhaven Man still do.
- **Rafe Dunmow**, 68, shepherd, at **Dunmow Fold** under its great cairn (`c_old_man_2`). Three hundred and forty ewes at
  lambing; one night at shearing the hurdles were down and the fold empty. Slow, counts in the old score ("Yan, tan,
  tethera"), sleeps by the gate from habit. A stone goes on the cairn for each ewe lost; he hasn't put this year's on.
  His work: **Plucked** (wool from under the Screaming Crag: two tufts are his, one is Thornwick's, one is hair),
  **Yan, Tan, Tethera** (his tar-pot is gone, and the five goat men at the old moot stones of Bleatmoot wear Dunmow's
  mark on the near hip; the big one doesn't: "Then he did the marking"), **The Screaming Crag**
  (pays the last of last year's clip, a robe: "I was keeping it to be buried in"), and on: **Strays** (past the goat men
  on the Gallows Road to Osric Thorne: two hundred and six of his ewes are in Thornwick pound).
- **Madge Wattle**, 52, hurdle-maker, from the hazel coppice Thornwick way (`c_worker_f_2`). Brought forty hurdles up at
  shearing, and makes two a day still, with nothing to fold. Sees that Rafe eats. Gives **Six-Bar Hurdles** (two goblins
  who stand her hurdles in a ring and sit in it; they've carved faces on the heads).
- **Sib Kestrel**, 33, fowler, at **Kestrel Hide** by the ribs (`c_redhead_1`). Net, lime and call. Speaks low, shushes
  out of habit, looks up: nothing has flown over in nine days. "A call's a lie told to a bird. You have to mean it
  kindly, even then." Her work: **Borrowed Voices** (her bird-calls from round the Crooked Circle; the fifth isn't hers,
  has no stop in it, and doesn't burn), **The Crooked Circle**, **The Gnawed Hollow** (the wolfkin gnaw the ribs by
  night: "They're not feeding. They're sharpening"; pays an old skull Joss dug up as a boy). The end of its road: she's
  sent to from Thornwick, by an errand the Gallows Road's maker writes.
- **Joss Kestrel**, 29, her brother, hunts what runs (`c_dude_3`). Says half of what he hears. Gives **Off the Spit** (two
  wolfkin walked in upright, took the hare off his spit, and looked at him: "It's not hunger, that look. It's more like
  counting").
- (**Jem Sledge**, at Stonecarters' Halt, whom Block for the Frame is said to, is the Rustwood's: below.)

## The Weeping Fen (`src/folk/regions/fen.js`, lines in `src/folk/lines/regions/fen.js`)

North of Bellmourn up the Fen Way, levels six to fourteen: Sedgebank, Mile-End Camp by the Sunken Mile (the Drowned
Vaults' door), Eelpot Hythe far off the roads to the east (done before the road north), Sallowmere, and the Drowned
Chapel. The camps and Sallowmere are **plain folk's**: none of them names either power; they say "the sisters", "the
chapel road". Sister Oriel is **Tessariel's**: she speaks of the order and its four watches, and names nothing of
Velscour's. **No boats move and no lights are drawn on the mere**: Grizel's ferry is the boat tied at the half-sunk
jetty, and the lights are what she tells of. The green dragon south of the chapel (level 24) is warned of by Grizel and
by Oriel, and no quest goes near it. "Forty" is Grizel's and Oriel's word, nobody else's. The region keeps **one burying ground** for its story (Sallowmere's Yard) and **one
left standing** (the fifth on the Mile, with his hand out). A drowned den's chief is what the game stands up: the
Mere-Mother, winged, that throws blades round itself and screams, or a bog witch who throws green; the fen's goblin
kings are big and in iron, and spit up so it comes down all round them.

- **Odo Marsh**, 66, eel-catcher, under the mast at **Sedgebank** (`c_elder_1`; the camp's sutler). Forty years on the
  bank; mends things and swears at them; goes deaf when money's named ("It's the water"). His wife went to her sister's
  in Bellmourn to be dry: "She writes. I can't read. It suits us both." Cuts a notch on the mast for every hand the
  water rises. Sent to by Maren Rush (**Rods for Sedgebank**; he promised her a punt he hasn't got, and lost his pole
  in the web trying to come for rods). His work: **Empty Traps** (three children at his stakes haul his traps and tip
  the eels back, neater than he sets them: "Somebody taught them to let things go"), **A Punt in the Reeds** (the Reed
  Larder: his twelve-foot punt hangs in it, ten foot up), **A Hand a Week** (Sinkfoot Stockade has dammed the lode;
  pays his eelskin coat, a robe: "My wife said I looked like bait in it"), and on: **A Hand of Water** (the same lode
  drains the Mile: through the three by the road to Tamar Dyke).
- **Ness Carr**, 27, reed-cutter for thatch (`c_young_4_1`). The one of six cutters who didn't go home. Short with
  everyone; counts in bundles. "Everything's easier cut dead." Gives **Reed-Hooks** (five hooks from round the Reed
  Larder; the fifth is a hundred years old: somebody cut that bed before there was a Sedgebank, ran, and never came back).
- **Tamar Dyke**, 44, salvager, at **Mile-End Camp** (`c_worker_f_3`; its sutler). Lifts the Sunken Mile a slab at a time
  for lead and dressed stone: "It's not robbing. It's the other thing." Prices everything, reasons included. Eleven of
  her gang went home when the drowned turned round on the slabs. Her line: "Everything that went down is still there.
  That's the whole of my trade." Sent to by Odo. Her work: **The Sunken Mile** (four of the five on the causeway; the
  fifth has his hand out for the toll, and she pays him a penny a morning), **The Sunk Plot** (not a burying ground: the
  toll's fenced strong-ground, its takings in lead boxes under marker stones, its drowned men still at their posts; she
  has it emptied, then leaves the boxes: "I've priced not knowing. It's dear"), **Under the Mile** (the toll's strongroom, and the Bloat) and **What Sank the Mile** (Mother
  Sallow and the Leviathan: "Stone on a hard bottom doesn't sink unless something takes the bottom away"), and on:
  **His Father's Punt** (a punt off the Mile with the Hallams' mark: through Lanefast on the lane to Eelpot) and **The
  Crossing** (the Mile isn't coming up: through the huts to the ferry; keep to the road past the drake bedded down west
  of it). Pike's **The Lane** ends with her: she walks
  the punt down the lane beside the cart herself.
- **Corby Lunn**, 36, crane-hand (`c_smith_3`). Built the crane from a barge's ribs and a mill's windlass; she is "she",
  and not for leaning on. Gives **Counterweight** (Leechwater's goblins sit on her lead weights round their fire like a
  jury; empty the camp and he swings her over for them; with them back she stops pulling left: "Two years I thought
  pulling left was her nature").
- **Pike Hallam**, 43, eel-trapper, under the upturned hull at **Eelpot Hythe** (`c_worker_2_3`; its sutler). The last
  roof of nine, and it's a boat. Gets weather for news; the wind has been south-west since Martinmas. His father went out
  the night the Mile sank. Sent to by Tamar, through Lanefast. His work: **Five Knots** (the Mere Coven sells wind in
  knotted cord; he undoes one, and nothing: the Hythe was never buying wind, it was paying them not to send it), **The
  Price of Wind** (the Coven, and whichever calls the weather in the middle of it, the stone-seer or the storm-caller;
  pays a blackthorn stake off its ring, a staff), and **The Lane** (the way out is back down the lane: empty Lanefast
  on it and tell Tamar to send the punt). The end of its road.
- **Grizel Wade**, 71, ferrywoman, by her boat at the half-sunk jetty on **Sallowmere's** east shore (`c_crone_1`). The
  seventh Wade to hold the crossing: the Mile put five of them out of work, and they waited for it to fall down. A penny
  a leg, the living and the dead alike ("They sit stiller"). She rowed the most of the Yard's dead over to it herself.
  Her work: **What the Fen Keeps** (six jellies off her landing; one has her mooring-ring in it, and she'd blamed Davy),
  **The Drowned Yard** (the fen's one burying ground, laid down; pays a skull that turned up in her bows "like a
  passenger"), **Lights on the Mere** (after it, and off the road on: by night, where she sees her lights, the Yard is
  stood up again, and the ferry's notched pennies lie on the path in), and on: **One Way** (Sister Oriel's mother paid her fare both ways
  forty-seven years ago; under the harpies' pool to tell her she's owed the crossing back: she keeps it).
- **Davy Scrip**, 52, chapman, nine days waiting on a ferry that has no call to run (`c_wes_3`; Sallowmere's sutler, out
  of his pack). All patter, with something under it. "A chapman's welcome is the best there is. Everybody's glad of you
  and nobody wants you to stop." Gives **Ribbon on the Reeds** (four children from the huts met him on the west shore
  every spring and tied his ribbon on the reeds for a fair; this spring they were waiting, drowned, and he ran; the
  ribbon's tied in bows a hand apart: they'd set the fair out for him).
- **Sister Oriel**, 58, the last of eleven sisters at **the Drowned Chapel** (`c_wife_big_2`; by the graves on its north
  side, since black jellies live in the nave's water). Came at eleven with a fever, in Grizel's ferry. Exact, dry, keeps
  hours: "I keep the fourth watch. I am told it is no longer kept. I find that if one keeps it, it is." Sent to by
  Grizel. Her work: **Leaves on the Water** (the office-book's leaves from round the walls, all five washed blank: "it
  was the weight of it I wanted, not the words"), **Rung Wrong** (the goblins of the Reed Stockade hung the chapel's sunk
  bell and ring it for dinner; she wants the four hands off the rope, not the place emptied: "I am not a captain"), and
  **The Drake's Scrape** (forty years she's told everyone to come by the east; since spring a marsh drake has had its bed on
  that very way, with bog worms about it: "I have been sending them to it"; pays the hours of the watch in her own hand,
  a scroll). The end of its road.

## The Barrow Moor (`src/folk/regions/moor.js`, lines in `src/folk/lines/regions/moor.js`)

South-west of Bellmourn down the Barrow Track, levels seven to seventeen: the Drovers' Stance, the Moor Wayhouse,
Peatcutters' Rick (off the track, the end of its road), the Diggers' Camp by the Barrows (the Kingsbarrow's door) and the
Nine Maidens (the end of its road). All of it **plain folk's**: nobody names either power, and nothing of either is
built there. **No beasts stand at the Stance**: Amos's drove is lost, six of it at Nan Dray's, and that is what he talks
about. What Bellmourn used to send people out here for (Jory's lights, his wayhouse, the Kingsbarrow) is given out here
now, by whoever stands by it. The graveyards (the Hungry Plot, Sexton's Rest) are **fenced plots with a lych gate and a
dead-house at the back**, never walled. Whoever's paid on arrival talks first of what they were asked (a price, a count),
not of the fight on the way; and a fight that wants "two" of three just wants two.

- **Amos Tye**, 38, drover, holds **the Drovers' Stance** on the Barrow Track (`c_dude_1`; its sutler). Big, slow to
  heat, names every beast. Had thirty-eight blacks in the ring at Lammas; the hurdles went down in the night, six ran up
  the track to Nan, thirty-two ran north into the Hungry Plot. Walks the empty hurdles at dawn and stands at the gap at
  dusk. "A stance is grass, water and a ring of hurdles. I've two of the three." Sent to by Nan (**Word Down the Track**,
  through the four little ones on the bank: the six went to her and not home, not liking the bank). His work, the first
  two in hand at once: **Led by Nothing** (the dead seen about the Plot on his halters, leading nothing; one is Wren's,
  and Wren is at Nan's), **The Hungry Plot** (no beasts in it, no bones: the grass trodden in a ring, the way a drove
  treads a stance; pays his grandfather's drover's coat, a robe), and on: **Six, and a Man** (through the three possessed
  by the track to the widow, for her rate: she hasn't put it up).
- **Rue Tye**, 15, his daughter (`c_young_1_1`). Can drive, and says so first. Gives **The Old Drove-Road** (the
  kobolds of the Spoil Heaps, south-east, have been lifting a laid stone road, a cart wide, from under the moor: she means
  to drive the six over it in spring).
- **Alis Penn**, 57, widow, keeps **the Moor Wayhouse** (`c_wife_jolly_2`; its sutler, in the yard). A penny for the
  bed, a penny the fire, the company free "because nobody's paid for it in years"; everyone's on her slate, the dead too.
  Tom Penn kept the house thirty years and is in Sexton's Rest these six, under a cairn with his mark on the top stone,
  buried with his lamp, a light for the walk. Her work: **The Other Lamp** (Bellmourn's watchman sees hers; the other is
  carried round her windows by two in robes from the cuttings west: it's Tom's), **Sexton's Rest** (emptied, and the top
  stone off Tom's cairn brought her from inside the lych gate: a second mark cut new beside his, the way a drover
  marks a beast he's bought; pays his blackthorn stick, a staff), and on: **Forty Turves** (to the
  Rick: Hulda's kettle, then Brom, who won't go to his own rick) and **Board Owing** (past the carrion birds by the track
  short of the camp, to Lucan: "It's four").
- **Cobb Hollin**, 63, tinker, laid up since March with a leg and paying his board in mending (`c_old_man_3`). His
  granddam's sayings for everything. Gives **Iron on the Graves** (he laid new ox-cues on the graves to keep them down;
  the five come back worn bright at the toe: somebody's shod a drove with his iron and driven it. He sends word to Amos).
- **Brom Tarn**, 45, peat-cutter, at **Peatcutters' Rick** (`c_worker_3`; its sutler). Counts turves aloud, says
  little; "You'll want my mother." The peat gives up old dead, brown as boots, and you bury them deep in the dry. Sent to
  by Alis. His work: **What the Peat Gives Up** (the eleven he left lying by the deep cut, built into one thing), **Moonbite
  Hollow** (wolfkin on his long rick by night, howling: not at the moon; they face north, at Coldhowe), **A Rod of Turf**
  (he cut the rod his father left round Coldhowe, and its king walked out along the cutting with a slane in his hand,
  cutting toward them; pays a skull out of the cutting). The end of its road.
- **Hulda Tarn**, 79, his mother, cuts still and talks for him (`c_crone_3`; by the cairn, within 500 m of Alis). Widow
  of Arn, lost in the hard winter. Gives **Five Slanes** (from round the Hollow; the fifth is Brom's own, that he swore the
  wolfkin took off the rack: he dropped it at the Hollow and ran. She puts it back in the bothy and says nothing).
- **Master Lucan Dree**, 58, antiquary, at **the Diggers' Camp** under its crane (`c_sage_2`; its sutler). Measures
  everyone who comes in ("it saves argument later"), labels everything, owns the only copy of the Moor Account. Delighted
  and unafraid in a scholar's way. Sent to by Alis. His work: **The Singers** (robed ones singing at the great mound; its
  door still slabbed after: "You don't sing at a door you mean to open. You sing at what's behind it"), **Ravenhowe**
  (bring him the king's crown: it goes round your wrist; the king of Ravenhowe was a boy; pays his copy of the account on the king, a scroll), **Sung Awake** (through the Barrow
  Door with a company: the Gravewarden; pays a bog-oak staff out of the first trench) and **The King Under the Moor** (the
  Golem, then Ossivar: what the king rode, one of a pair; its mate lay down outside and is the bones Sal won't go near),
  and on: **How Many Maidens** (past the tomb drakes, to ask Morwen; he made it eleven).
- **Sal Mattock**, 42, his foreman (`c_worker_f_1`). By the yard, and no sleep since June. Warns everyone off south of
  the mounds, where the dead wyrm lies out on the moor and lifts its head at two hundred paces. Gives **Lights on the
  Barrow Moor** (jellies full of bones: "Those are our finds") and **The Sleepless Stones** (what sits on your chest at
  night; she sleeps ten hours on the spoil heap after).
- **Old Morwen**, 81, counts the Nine Maidens morning and evening (`c_crone_2`; inside the ring by the burnt-out fire).
  Nine, always: eight standing and the one lying down, "and you count her too". Sent to by Lucan. Her work: **The Ninth Circle** first, at its hedge coven's own level, then **The One
  Lying Down** (three in robes put a rope round the fallen one; a cart-rope with a drover's knot), **My Own Five** (the
  stones of her cairns, wedged at the foot of the coven's ring while it settled; the Circle's ring had a space a Maiden wide),
  and last **Cold Hearth** (her aunt's farm, the night's ruin south: emptied,
  she could live there, and won't, because who'd count them; pays her mother's counting-shawl, a robe). The end of its
  road.

## Cinderford and the Ashen Waste (`src/folk/regions/waste.js`, lines in `src/folk/lines/regions/waste.js`)

West of Palmers' Rest along the Vigil Road, levels six to nineteen: Ashgate Halt, Cinderford, the Caravanserai of Khel,
and at the two ends of the road the Hollow Watch and Scavengers' Pit. All **plain folk's**: Ashgate, Cinderford and Khel
say "the keep", "red over black", "the riders"; the Hollow Watch and the Pit hide in sight of the keep's forts and its
spire and name the keep and its lords, and nothing of the other side at all. Nobody says "the tower" out here (the
Finger is "the spire"; Hasket stands at "the watchtower"). **No animals stand anywhere**: Colm's mule is gone, Edmer's
stables are empty, the carts have stopped. Cinderford's three (above, "The small towns") give their quests here now; Ser
Hale's Blackvigil quests and Hasket's far ones are Captain Renn's, by the keep's door; the intros Hasket to Colm and Colm
to Ysolt are cut. **The time**: everything here went wrong **in spring** (the May carts, Renn's parley); never "two
years". **Counting** is Dag's and Hasket's (the sticks, the wall at dusk) and nobody else's: Sarn tells the gate, Vesna
watches fires. The salt corner is the one toll, the weights the one weighing.

- **Dag Colley**, 50, carter, at **Ashgate Halt** where the trees stop (`c_smith_1`; its sutler). Says least; keeps a
  tally stick, a notch for each who goes west and doesn't come back, long for one he knew: nineteen long since spring.
  "Short notch." Sent to by Perrin (**Two Tallies**, past the goat men back at the halfway stone). His work: **Five Miles
  to Cinderford** (the mileposts' iron plates, off the kobolds' spoil at Pickfall: all five say Cinderford, "So somebody
  told them which"), **Pickfall Delve** (the diggings and the foreman who doesn't dig; pays Hedda's waxed coat, a robe),
  and on: **The Other Tally** (`nineteen_going_west`: past the dead children in a ring by the old stones, to
  Hasket: nineteen west, alive; she's counted nineteen come east at dusk, not).
- **Hedda Colley**, 46, his sister, pannier-maker (`c_worker_f_3`). Does the talking for both. Six-stake, close-packed.
  Gives **Cut Close and Low** (withy bundles left to season by the osier beds round the Watching Acre, cut close and low
  and tied with Lettice Ware's knot: Lettice went west with the May carts, and is out there, cutting withy). Not a straw
  men quest: the Downs' Strawman's Acre is the one that pulls them down.
- **Hasket, Colm and Ysolt** at **Cinderford**: **They Know the Gate-Word** (three of the four who came back; the fourth is
  Corlew, last at muster, and she'll answer him at the wall), **Two on the Ridge** (kill one of the two knights counting
  her wall; the count goes home one short); Colm's **Bess's Shoes** (his mule's, round the Ash Den: Edmer's square-headed
  nails) and **A Quiet Wood** (the den, for his oak; pays his ash poking-staff); Ysolt's **Brass on the Straw Men** (Khel's
  tally-tags on the Rows' scarecrows; one is her own, left on the table) and on: **The Cloak** (past the knights short of
  Khel, to Sarn, for whoever puts Edmer to rest).
- **Old Sarn**, 72, the last porter of **Khel** (`c_elder_2`; by the south gate). A porter's manners; opens to everyone
  with a reason. Let the riders in at noon for water, and has written the time and nothing else. "They are waiting for me,
  and they are at the wrong wall." His work: **The Weighing Table** (five brass weights off the ground by the north wall:
  all but the quarter-ounce, which Ama has kept in her apron since that morning, so nobody comes to sell a full table;
  he's never asked her for it), **The Charred Mill** (Edmer, the tall one in the blue jerkin, and all four round him; pays Ysolt's cloak, a robe), and on:
  **The Porter Keeps the Gate** (past the lancers to the dead tree, to the captain who didn't stop on his way back).
- **Ama Tull**, 44, cook of Khel (`c_wife_big_1`; Khel's sutler). Blunt, salts everything, puts out bowls nobody comes
  for. Gives **A Corner off Each** (salt off the Mill Track: a corner cut from each loaf, the porter's toll; so Sarn was
  at the gate that morning, and she won't ask him), and, at seventeen, once the Watch is done: **Pans for Flour** (through
  the Widows' Hollow and under the Black Finger, whose men come down on anyone carrying a load, to Mab Crowe; after
  the Watch's errand).
- **Captain Tolan Renn**, 47, of **the Hollow Watch** (`c_worker_3`; its sutler). Had Cinderford's watch; rode west in
  spring with twelve to parley; Maldrec gave him back eleven "standing in a row, facing the wrong way". Didn't ride home
  because the wall would have followed him. Clipped, hard on himself. "Off the skyline." His work, both at once once
  Vesna's look at the gate is done: **The Warden of the Gate** (through the arch to Maldrec; pays his staff off the road)
  and **The Castellan** (Sorvane, the Brothers and the Castellan at the top, so one going through the keep does both;
  pays a skull off Mab's Field; "I'll go home now. Not yet: there's the fort."); last **Gallowgate Fort** (west-south-west,
  where what's left of the garrison drew back; pays a lancer's riding-cloak). The end of its road.
- **Vesna Kell**, 26, his scout (`c_young_4_2`). His runner at the parley, the ninth of them, the one behind, who rode
  back up behind him. Watches fires from the dead tree; has never seen the gate. Her work: **The Black Road** (look at the
  gate: shut; the arch is the only way), **The Vigil Road** (five of the big patrol on the road north), **The Smoke We
  Hide In** (Smokefast, whose smoke has hidden the Watch since spring: "I'd sooner be seen than hid by what they burn in
  there"; pays her Cinderford cloak).
- **Mab Crowe**, 58, of **Scavengers' Pit** under the ribs (`c_crone_3`; its sutler). Prices everything, the dead
  included. Her work: **The Sick Ones in Iron**, **The Grey Larder** (the cleft west
  where the Pit keeps its flour, spun shut by the widows in April; Ama's flour is in it), **The Black Finger** (the spire
  south whose men shoot at her diggers of an evening, for sport: they had Tad's hat; pays an iron-shod staff she'd kept
  to throw at them), and last and biggest **What Walks the Field** (the Bone Giant, knight or golem, that walks the Bone Field;
  pays a skull with a name in it). The end of its road.
- **Tad Crowe**, 19, her nephew (`c_wes_3`). Soft; keeps his forty-one green rings and names them. Gives **What the Worms
  Turn Up** (five rings off the Churned Ground: bright, small, this year's; somebody's burying people under the worms).

## The Rimeholt Fells (`src/folk/regions/fells.js`, lines in `src/folk/lines/regions/fells.js`)

South of the Forkstone up the Frost Road, levels eight to eighteen: Fellfoot, Frostwatch (the Howling Deeps' door, last
of the fells), and two roads out of the fort: west to Hoarfrost Hide and on to the Frozen Shrine (the end of its road), and
south-east to Climbers' Rest under Ravens' Tor (the end of its road). The camps and the fort are **plain folk's**: nobody
names either power. **The Frozen Shrine is Tessariel's** (the third watch's): Sister Brynn never names him or his keep.
**No beasts stand at Fellfoot**: Berin's ponies are at Nan Dray's. What Bellmourn and the Bell Tower used to send people
up here for (Bram's purse, Ser Hale's Sleeper) is given up here now, and Garrick's Tor is the climbers'.

- **Berin Stoat**, 51, packman, at **Fellfoot** (`c_dude_3`; its sutler). Small man, big voice; talks in loads,
  weights and prices, all at once. Forty-one packs on the ground and no ponies to put them on, because he arranged for
  Nan Dray to winter them, and regrets it. Counts everything. "A pony carries for you and forgets." Sent to by Nan
  (**Ponies for the Winter**, past the white wolves where the road climbs). His work: **Ten Packs of Salt** (two packs
  of the fort's salt gone, and the hill rams down at the Frozen Moot a month early: the cakes are licked to the size of a
  fist; he left salt on the fell where a ram could smell it, and shut his own road), and on: **Kettle's Slate** (past the
  rams of the Rime Ring, halfway, to Garrick with Bram's purse; Garrick has sent it down every autumn so the packman has a
  reason to climb).
- **Corrie Blane**, 69, keeps the beacon at Fellfoot (`c_crone_1`). Lights, and who they're for: "A light's for them
  that aren't here yet." Thirty-one rungs. Gives **Something at the Beacon** (the white goat men from the hollow south
  aren't butting her beacon's legs: they're rubbing on them, like a tup on a gatepost) and **The Other Light** (Chilblain
  Camp's fire, as high as hers, on the nights hers isn't lit; two drovers walked into it. It had a hide on the road side:
  the goblins lit it for their own, out on the tops. Pays the beacon's old poker, a staff).
- **Hew Garrick** (above; posted in `src/folk/people.js`, his words in `src/folk/lines/land.js`). His work, in this
  region's files: **What Sits on Your Chest** (the night things at the Mouth come as a pair: kill one and the other goes
  down like a man carrying half a load; pays the Glimmerstone), **The First Hall** (Hrymgar, in the Goat-King's Hall
  past the Frozen Herd) and **The Sleeper** (the Brood Mother, and under her the breathing that's the howl; the climbers
  at the Rest hear it from the Tor). One run down kills all three, so the last two are one quest.
- **Signy Arn**, 55, quartermaster of Frostwatch (`c_worker_f_2`; by the stores, and she buys and sells). Came up from
  Fellfoot at nineteen to keep a captain's books; the captain went. Keeps the tally: salt for sixty, mouths for two. Writes
  Garrick's "Hm" down as yes. The fells' one counter. Her work: **Counting the Wall** (Whitefang Camp's goblins under the
  south wall at night, counting in their own tongue: they'd got to two; pays the armoury's last good staff), and two on:
  **Sixteen Pelts** (past the goat men on the lane to Ulla, who sends four and is written down as sixteen) and **The
  Fort's Light** (past the goblins of the Ice Stockade to Dain: Garrick fell asleep and the tower fire was out; Dain sat up
  all night at the mast, and denies it).
- **Ulla Thorsby**, 44, trapper, at **Hoarfrost Hide** (`c_redhead_2`; its sutler). "Mind the snare." Thirty-six sets,
  walked in old Haskel's order, who had the line before her. Sent to by Signy. Her work: **My Round** (a wolf that stands
  up walks her line before her, in order; it has Haskel's boots on: it never learned her round, she learned its), **The
  Whole Trap** (her traps, found set round the White Larder: the chains are tied with a skinner's hitch; Arne has been
  trapping the spiders for white silk to sew his firsts with), and on: **Fat for the Lamps** (past the goblins of Snowgate to the shrine;
  Brynn always brings a candle, and Ulla always lights it).
- **Arne Thorsby**, 52, her husband, the skinner (`c_elder_3`). Grades everything, people too: "That's a second. Nothing
  wrong with a second." Gives **White at the Root** (the white howlers of the Frozen Scrape are grey at the root: old
  wolves, gone white; seconds, all of them; pays a skull from under the big one).
- **Sister Brynn**, 36, keeper of **the Frozen Shrine** (`c_young_3_2`; east of the steps by the near fire). Came up at
  sixteen to learn the third watch from the last sister who knew it. Brisk, laughs at herself, sweeps the steps that will
  be ice by noon. "They've never gone out. You were going to ask." Sent to by Ulla. Her work: **Never Gone Out** (the
  witches of the Rime Coven, south-west, come up at night and put her fires out with snow; they've gone out every night
  this month, and she has a flint), **Names on the Wind** (the pilgrims' strips, at Hornfrost Stones south-east, tied on
  the stones and the goat men's horns, facing the wind, names out: they know it's for something; one was her mother's,
  for her), **The First Ring** (the Hoar Circle, west, last, kept by things that never sleep: it was the sisters' own,
  where they kept the third watch before the shrine; something went up and kept it for them, badly; pays a scroll). The end of its road.
- **Dain Scree**, 40, climber, at **Climbers' Rest** under its mast (`c_wes_2`; its sutler, at the rope-chest). Bosun
  once; brought his broken ship's mast up on a cart and stepped it. "Everyone looks up first." Coils sunwise. Sent to by
  Signy. His work: **Ravens' Tor** (the harpies cut the climbers' ropes; two of the three, and the third goes south
  screaming at nothing), **The Pennon** (his pennon points at Winterfast whatever the wind; emptied, it points where the
  wind goes, which he'd forgotten was all a pennon did; pays a climber's stick, a staff). The end of its road.
- **Wynn Halse**, 24, cuts the holds on the Tor's east face (`c_young_2_2`). Two fingers short, from the north face;
  "Don't look at the hand." Gives **Five Chisels** (from round the storm harpies' Thunder Crag: four are hers, one is her
  mother's, lost off the north face the winter before she stopped climbing, and the harpies keep her fifth).

## The Deepwood and the Sorrowhorn (`src/folk/regions/deepwood.js`, lines in `src/folk/lines/regions/deepwood.js`)

North-west up the Pilgrims' Road from Palmers' Rest, levels eight to fifteen, then 24 and a hundred: Mossgate Hide (the
first station), the Hermit's Hollow up its lane, the Broken Stair (the seventh station, at the foot of the Sorrowhorn) and
the Crown of Teeth on its top, the Elder Dragon Gods' door, which sends you down off the mountain south-west to
Scavengers' Pit. All four are **plain folk's**: nobody names either power. The climb to the Crown used to be Orrin Vey's,
from Bellmourn four kilometres off, and the Gods were Sergeant Hasket's at Cinderford: both are given up here now, the
climb at the Stair and the Gods on the Crown itself, after the red dragon by the door (level 24), so the door is still
only for late. No graveyard, nobody spared. The Stair's den is **the Wakehouse** (where palmers keep the night before the
seventh stone), never "the Broken Vigil": vigils and the Vigil Road are the other side's word.

- **Fenn Hollis**, 35, trapper at **Mossgate Hide** (`c_worker_1`; the camp's sutler). Saw you a hundred paces back;
  talks about the wood as if it were telling him things; twenty years at his snares. His rule: he doesn't set for what
  walks on two legs. Gives **Coming Down** (palmers come down off the road by night into the webs west and stand among the
  spiders: three of what's in there; the walkers were facing down the hill), **Snares on the Runs** (the wolfkin of
  Howlers' Scrape walk on two legs, so he never set for them, and they read his rule off his runs and set for him; pays a
  robe), then **Salt for the Hermit** (salt up the lane, through the dolls, to Old Bede: "and look if he's living").
- **Merry Cotter**, 38, a palmer laid up across Fenn's fire (`c_wife_jolly_2`). Her company went on without her; sure her
  foot's better tomorrow. Gives **The Resting Company**: a company resting in a clearing east at dusk that won't answer
  her. Fenn calls it the Stitched Field. Straw, every one, and so her company's at the seventh, Kit singing at the stone.
- **Old Bede**, 78, of **the Hermit's Hollow** (`c_old_man_1`), by his fire above the lane. Keeps no board and takes
  nothing for anything; tells the bees everything, and his hives have gone silent. Gives **Bait-Skeps** (five skeps hung in
  the limes round the webbed hollow north-east; one has new comb in it, cut out with silk), **Telling the Bees** (the
  Weavers' Hollow itself, where they went; who died that he wasn't told? thirty palmers; pays a staff), **Candle-Ends**
  (every palmer who knocked had a candle of his wax going up; some came back down, and stand in his lane with them, never
  lit: three of what stands there, and five ends), then **The Last of the Wax** (the block he makes of the ends, up to
  Isla at the Stair for her candle, past the demons by the road).
- **Isla Crag**, 46, the guide at **the Broken Stair** (`c_worker_f_1`; sells what a climb wants). Looks at your boots; the
  shoulder, never the face. Keeps a candle lit for whoever is up the mountain. Last autumn she left a woman called Yrsa
  camped at Greywatch to watch it; at midwinter the camp was empty. Gives **The Shoulder** (black whelps on the rib above
  Greywatch, sat in the stones like hens on a clutch: on Yrsa's brass ink-horn), **The Night-Book** (four pages of Yrsa's
  book from round the empty camp: "Going up. Back before thaw"), then **The Crown of Teeth** (up by the shoulder, past the
  demons in the stones, the tin in her mother's cairn below the rim with Yrsa's name and the time in it, and over, west of
  the door, to find her). Says to keep wide of the red one on the south shore.
- **Ebba Dunn**, 66, a palmer on the stones by the shelter (`c_crone_2`), facing the mountain. Has walked forty-four years
  to keep the night before the seventh stone, saying her mother's seven verses for it; since the fifth station she's lost
  a verse a night, and has one line left. Gives **The Words for the Seventh**: what's in the Wakehouse feeds on what's said
  there. Emptied, the words don't come back; she'll make her own. Pays a skull.
- **Yrsa**, 51, who watches the door, on the shelf west of it in **the Crown of Teeth** (`c_redhead_2`). Copied maps;
  writes everything down, the time first. Went up from Greywatch and stayed, after a word on an old map for "where the gods
  are kept". Tells you plainly the red one is not for you yet: go down and come back its size. Gives **The Pillars**
  (rubbings of the marks under the frost at the feet of the four pillars on her side: the map's word, and after it
  "until"), **The Sitters** (three dark things that sit each night by the broken pillar facing the door; the stone under them is worn from hundreds of years: the pillars are a watch), **Ink for the Crown** (her ink-horn's lost and she's writing in soot and snow-water: her silver down off the
  mountain to Mab Crowe at Scavengers' Pit, who sells anything; Mab sends the ink up with Tad), and for whoever comes back
  up: **The Red on the Shore** (the red dragon asleep by the door: she thinks it's waiting for what's through it to come
  out), then the Gods: **A Storm Over the Horn** (through the door with a company, Thyrraxis) and **The Hollow Star** (the
  other three).

## The Marches and the road to Phobos (`src/folk/regions/east.js`, lines in `src/folk/lines/regions/east.js`)

East past the old edge of the world, under the keeps that line the roads (Greywarden's beacon, the Lantern's lit head,
Gatewatch's toll gate, the Needle), levels sixteen to twenty-three: Marchfoot, the March's old sheepfold at the foot of
the March Road (a fold, its cairn), where Last Hearth's word comes in; the Long Queue below Gatewatch, where Roadsend's
does; Widow's Lee under the ridge, hidden and unlit, which both send you on to; and the Sill, where Wenna Coyle, who met
you there at three, has a word for each of the city's hubs. The camps are **plain folk's**: nobody names either power;
it's "the keep", "his lancers", "the men in red". The way into Phobos used to be given in Cinderford, at Frostwatch and
at the Bell Tower; it's given on the Sill now. No graveyard, nobody spared, no scarecrows. Each twist once: the fold
draws the wolves, the clerk burns the book, the camp inks its hands, the dummies walk, the queue has sold itself its
loads, the sergeant kills her own lookouts, the people go back in.

- **Hester Pyke**, 52, keeps the fire at **Marchfoot** (`c_wife_jolly_3`; its sutler), and the cairn so people coming
  down off the March can see from the top where the road stops. She and her man kept the March's sheep from the fold;
  the keep's lancers took the flock for their table and left the pens. Sends people on west to Mother Tibb. Sent to by
  Corin Vale. Her work: **The Back of the Line** (three wolves in the gorse south take the last of each line coming down;
  they never go for Last Hearth: it's the fold, twenty years of sheep, and they find people in the pens; the hurdles go on
  the fire), **Lancers on the Slope** (four lancers on the slope north since Piers came in; they'd have a likeness, "ink
  on the right hand", so she's had everyone who's come down since ink their right hands before she sent them west; pays
  her husband's robe), and on: **Under the Lantern** (two of the Lantern's keepers down, south-east, then south over the
  hill, not by the gate, to tell Ines Mar the slope's clear). "Mind the slope. It's steeper going up."
- **Piers Lusk**, 44, across her fire (`c_sage_1`): kept the toll-book at Gatewatch nine years, every name through the
  gate, and walked out with it the morning he knew whose name was next. Sleeps in the middle of the camp. Knows the Queue
  is waiting on him ("tell Rollo Bask the book's not coming back"). Gives **Every Name** (the book's pages white in the
  gorse round the spiders in the gully north-east, where he threw it at them: he burns them without reading, "I know.
  It's me. That's enough people").
- **Rollo Bask**, 49, carter, the front of **the Long Queue** (`c_worker_3`; its sutler), twelve days in front of a
  shut gate. The toll's paid in names now and the man who wrote them ran (Piers). Gives **The Long Queue** (the men on
  Gatewatch's toll gate, north; and when it's open nobody moves: they've sold each other their loads; pays a skull he
  bought for the gate) and on: **Over the Hill** (three of the keep's men watch the Queue from the gorse south-east: two
  down, then north over the hill to the woman who buys bread in old city coin: the Queue will carry).
- **Bride Sayer**, 58, carrier, down the line from the draper's (`c_wife_big_2`). Thirty years of other people's crates,
  never opened one. Gives **Waiting Their Turn** (Cobb the draper's tailors' dummies walked up the rise east and he went
  up after them at dark with his best cloth, to dress them for the city; put them down by night and bring his cloth back:
  she'll carry it to his tailors herself, the day the gate opens).
- **Ines Mar**, 41, sergeant at **Widow's Lee** (`c_worker_f_2`; sells, mostly dressings), of the city's watch that rode
  out when it fell. Brings people over Widow's Notch and up to Marchfoot by night. No fire: "It's laid, and it stays
  laid." "Don't look at the tree." Sent to by Hester and by Rollo. Her work: **The Birds Go Up** (the harpies on the
  slope south-east, under the Notch, go up off their roost for anyone on the hill: that's how she knows where her people
  are, and how the Needle knows; she kills her own lookouts: "Now I'm as blind as they are. Fairer"), **The Toll-Giant**
  (after both of the roost's: no gate, just him in the Notch, taking coats and boots; dead, the Notch is open both ways,
  and the first thing her people ask is to go back in for the ones they left; pays her captain's staff), and on: **A Lamp
  for the Dye Works** (past the Broken Span to Wenna on the Sill: the Notch is open, light one for the dye works).
- **Oswy Holm**, 20, her fletcher (`c_dude_3`), a fletcher's boy from the Tanners' side, brought out over the Notch at
  fourteen. Making sticks with points on for want of feathers. Gives **Feathers** (quills round the harpies' roost).
- **Wenna Coyle** (the first visit's, `src/folk/lines/first-visit.js`), once Ines's word comes down, has three words
  into the city, each past one of its haunts: **Smoke in the East** (Fennick Lowe's chimney behind the chandlery has
  been cold since the new moon; he knows you from the way down, "I said come back when you'd teeth": his lancers learned
  to read the smoke), **Wardens of Ash** (her apprentice Bet watched the Ashwardens' pyres from the Sill one night and
  went down to them: is she any good? Edda Grail: "the best I've got, and she can't have her back"), and **Quiet Men**
  (Ser Hale's once: to Maud Treller at the dye works, the oath still holds; "Tell her we're fifteen"; pays a scroll).

## The Rustwood (`src/folk/regions/rustwood.js`, lines in `src/folk/lines/regions/rustwood.js`)

North-east of the Bell Tower up the Abbey Road, levels eight to fifteen: Stonecarters' Halt where the road leaves the
downs, Ossery Quarry, the Abbey of Saint Ossery, and there the road forks: north to Emberwatch and the Fungal Ring (the
Sporehold's door, the end of its road, whose word comes back down to the abbey), then south-east to the Woodcutters' Camp
and Last Hearth, which sends you on east over the March to Marchfoot. The camps, the quarry and the cutters' are **plain
folk's**: nobody names either power; they say "the brothers", "the old one in white", "the abbey". Brother Caddoc is
**Tessariel's**: he speaks of the order, its four watches and its saint, and of nothing of Velscour's. Jem's teams are
stood at the quarry while the bend is shut; Corin's horse went on to Marchfoot without her. What Orrin Vey used to send
people out here for from the Tolling Bell (the masons' marks, the ring and what's under it) is given out here now, by
whoever stands by it. The wood burns: the fire-callers and the whelps have burnt out the steadings, which is who Last
Hearth is. No two hubs open the same way: Jem is glad of anyone on the road, Marta reads your dust, Caddoc gives you noon, Rowan writes
you down, Dilly stops your feet, Huw knows who sent you, Tibb counts you.

- **Jem Sledge**, 46, stone-carter, at **Stonecarters' Halt** by his father's block (`c_smith_2`; its sutler). Talks in loads
  and weights. Sent to by the Bellwright (**Block for the
  Frame**, the Green Downs'), and says yes to a yard of stone up the knoll. His work: **A Stone in the Ring** (the
  squared stone lying in the middle of the Butting Ground, west, would save him the quarry; the rams keep it; it turns
  out grey rubble-stone, squared by somebody who'd been told what square was; pays his father's goad, a staff), and on:
  **A Yard of Freestone** (after the bend is open as well: to Marta, for freestone after all, and to say Lew is at the
  Halt).
- **Lew Rudd**, 17, Marta's son, lodging at the Halt (`c_dude_2`). Says twenty and means four. Gives **The Bend** (red
  goblins at the bend of the Abbey Road came out of the bracken at him and he ran; he was sent down to tell Jem "the
  quarry's shut" and has been eight days not saying it). Marta answers it: shut to carts, while the bend was shut.
- **Marta Rudd**, 49, quarry-mistress of **Ossery Quarry**, at the cutters' hut door with the face at her back
  (`c_wife_big_3`; sells). Reads stone, not people: the down's dust is grey, hers yellow. "You don't own a quarry. You
  get the use of it till it falls on you." Burns Orrin Vey's yearly letters about the marks to light the fire. Her work:
  **The Masons' Marks** (Orrin's, once: kobolds tunnelling behind the face; when it holds, she finds among the masons'
  marks a little hammer with a crooked haft, cut shallow: her own, at Lew's age), **Orefall** (rust-coloured kobolds over
  the rise carry off the quarry's iron; the delve was the masons' own working; pays her mother's leather, a robe), and
  on: **Stone for the Nave** (under the werebat and its two small black drakes over the road half way, to ask the
  almoner what the abbey needs).
- **Brother Caddoc**, 63, almoner of **the Abbey of Saint Ossery**, outside the precinct gate where the dole is given at
  noon (`c_sage_3`; the almonry buys and sells, for the dole). Thirty brothers when he came; now him and the rule. Rings
  the watches on the little bell in the bell-cote; nobody answers; "the rule doesn't say anything about being answered."
  Wrote "don't argue with the almoner" into the rule himself. Sent to by Marta. His work: **Pilgrims' Lead** (the lead
  badges he cast for this year's nine pilgrims, round the spiders' web-wood; one of the five is the Drowned Chapel's bell
  strung beside the Frozen Shrine's token: somebody was walking the whole round of the houses), **Lime** (robed
  fire-callers at the brothers' own lime-kiln burn the nave's fallen stone), **The Red Larder** (red spiders have the
  infirmarer's drying-hollow; his herbs are past saving, but the yarrow seeded itself through the
  silk under where he hung it; pays the abbey's rule, copied fair, a scroll), and on: **The First Watch** (past the goat men by the
  lane north, to ask Rowan if his dusk lamp is still seen: she writes it down every night, and lights a
  hand-lamp back) and, when Dilly's white hedgehogs have come down to him (**White Inside**, hers), **Timber for a Roof**
  (past the great spider's nest to Huw, with no money: Huw's grandfather roofed the nave last time, "paid in prayers").
- **Rowan Slate**, 39, fire-watcher at **Emberwatch** under the beacon (`c_redhead_2`; its sutler). Keeps a book of every
  smoke, and every walker, by the hour, nine years of it; "Smoke's a sentence. Most of them say nothing." Has lit the
  beacon nine times this year and nobody came. Her work: **Seven Fires** (a warband of red goblins at seven cook-fires
  south-west; she's never written "none" for the south-west) and **Cinderbed** (she drew a line back from every fire in
  the wood this year, and they all go east to one place, hidden from her by the one ash tree she never cut; pays a small
  horned skull out of the beacon's ash pit).
- **Hollis Wick**, 55, charcoal-burner, burnt out (`c_elder_3`). Slow fire, starved: "A good burn's nine days and you
  never see a flame." His wife is at the Hearth; they write. Fetches pitch-pine for the beacon. Gives the way on:
  **Through Brandfast** (Dilly's weekly basket stopped when the fire-callers sat down at Brandfast on the path; it turns
  out they'd been eating it, the poison cap at the bottom too, that he knows to leave).
- **Dilly Roe**, 31, mushroomer at **the Fungal Ring**, living in the tent the man who came to draw the ring left
  (`c_young_3_2`; sells, to the herb-wives in Bellmourn too). "Everything's food to something. I just like to be early."
  Opens by stopping your feet: "Don't step on that." Her work: **Morels on the Burn** (morels thick round the whelps'
  Burnt Hollow the same year as the burn; violet inside, the ring's colour: it's reaching), **Cap and Leg** (spiders and
  mould-coloured kobolds on her west side; every cap there cut low at the foot: "That's a garden, with somebody
  gardening it"), the Sporehold's two, Orrin's once (nominal pay: the delve pays its own): **The Ring Below** (Mouldfang; pays the drawing-man's scroll) and
  **What It Fruits From** (Mother Morel, then the Heart; pays his staff), and on, back down, once the west side's cleared: **White Inside** (past the
  warband's fires, the first hedgehogs off the west side, white inside, not the ring's, to the almoner who's never let a cap of hers
  through his gate).
- **Huw Axton**, 51, foreman at **the Woodcutters' Camp**, at the fire (`c_worker_2`; sells). His grandfather's rules:
  never fell before the dew's off, never leave an axe in a tree overnight, never fell the Hanging Tree. Five men of
  twelve. Sent to by Caddoc. His work: **Axes in the Trees** (the eight axes the lads left on the felling south, with red
  goblins sat among them; not one touched: "a red goblin will steal the teeth out of your head, but it won't touch an axe
  that's been left") and **The Hanging Tree** (the great oak east that something goes out of at dusk, so the lads down
  tools at four: bats; and Bryn says bats only roost in a hollow oak, so nobody ever felled it because there was nothing
  in it to fell; Huw has to tell him he can tell bad wood; pays his da's felling leather, a robe).
- **Bryn Pitt**, 34, bottom sawyer with no top man since Ned Strake went to Bellmourn for a saw in July (`c_wes_2`).
  Takes you for Ned, from behind. Huw has said, once, that he can tell good wood from bad; he keeps the bad, the cracked shakes, on the
  stump stack. Gives the way on: **A Load for Last Hearth** (a cart of his shakes, for walls at the Hearth, where they
  sleep in the wind: "A cracked board's a board").
- **Mother Tibb**, 74, keeps the fire at **Last Hearth** (`c_crone_2`; its sutler): carried out of her own steading's
  hearth in a pot the night it burned. Counts everyone at the fire at dusk, by the back of the head. Thirty-one. Sent to
  by Bryn. Her work: **Dropped on the Way** (what the people coming in dropped past the Shroudwood's edge: Ada's spoon,
  the Pell boy's clog, her own whistle, and a linchpin off the Tolley cart, which never came in). Sootpit's goblins took
  coals off her fire in the spring; it's in her talk, not her work.
- **Corin Vale**, 28, outrider for the Hearth (`c_young_5_2`). Carried letters on the Marches road before; there and
  back, in hours. Her horse went on to Marchfoot in the spring "eating better than I am". Her work: **The Shroudwood**
  (she went in after the Tolleys in June, fifty paces, saw two bundles hung the size of people, and came out; the nest
  emptied, and what keeps the wood further in, the bundles are a deer and a dog: "None of it was a Tolley. They went
  round"; pays her March staff), and on: **Over the March** (past the grey knights under the March, to Hester at Marchfoot: the Hearth will take eleven more,
  and no more).
- (**Hester Pyke**, at Marchfoot, whom Over the March is said to, is the Marches': above.)

## Thornwick and the Gallowswood (`src/folk/regions/gallows.js`, lines in `src/folk/lines/regions/gallows.js`)

Down the Gallows Road from Thornwick, levels eight to eighteen: Thornwick, the Old Toll halfway, Hangman's Cross where the
road meets the wood's lanes, and from the Cross two ways: south-west to Corpse-Candle Camp and on to the Players' Wagon
by the Twisted Grove (the Hollow Playhouse's door; the end of its road), and north-east up the lane past the old gibbet to
Mother Grawl's Hut and on to Roadsend, where the lane comes out on the Marshal's Road (on north-east to the Long Queue,
the Marches'). Every camp and place here is **plain folk's**: nobody names either power. Nothing is carried further than
the next hub, and every errand in has a fight on the way. Each hub opens differently: Osric on his hedge, Ann on the toll
nobody pays, Crowle by your weight, Tansy on the light that isn't over you, Fabian with an entrance, Grawl by your smell,
Wilf on the wool you're not carrying.

- **Thornwick** (Osric, Dorcas and Wymond, above). Osric: **Hedge-Breakers** (two of the goat men from the hollow
  north-west; the third runs south-west to the high down), **The Black Ram** (up there: the Ram is real, and his father
  was right; the Goatfoot). Dorcas: **Up from the Hanging Wood** (the plague stragglers stopped where the wool carts
  watered), **Nothing for the Pot** (Sib Kestrel's brace has stopped: past Featherfall to the hide; nothing's flown over
  in nine days, and something south of the hide whistles them down), **Thursdays** (Wat Arden's missed five Thursdays;
  past the werebat on the forked poles, to the Old Toll with his pie: he's dead, and his daughter eats it). Wymond: **Names in
  Lead** (the pest-house tags off the stragglers; one is Hal Fitch, whom he buried in March: he's at the Fs), **A Night
  Behind Me** (the Warlocks' Stones say his list back of a night, raising where he lays; empty, they'd only listened:
  "I've never had such attention"; his cut-down staff).
- **Ann Arden**, 31, Wat Arden's daughter, at the Old Toll (`c_young_4_1`). Kept house for the hangman from fifteen; came
  up when the word stopped and dug two graves by the well, his and a carter's. Plain, short; her father's habits caught
  off him (she lifts the bar at first light for nobody). Her work: **Waiting to Be Let Through** (the possessed and
  man-high dolls on the rise north face south at the bar; they came up the night it burned and he let them through, as he
  let anything that paid), **Corpses, Nothing** (the rate-board, in pieces up there; the bottom line, new this spring:
  "Corpses, nothing."), **His Way Home** (the Toll Roost, whose bats cross the road he walked home by every Thursday; his coat), and on: **The Pan on
  the Hook** (past the two tall things off the road, to Crowle: she isn't coming back).
- **Master Crowle**, 66, the hangman, retired, at Hangman's Cross (`c_old_man_1`; by the stocks). A reckoner: weight,
  height, drop; never untidy. Measures you by eye ("Eleven stone, near enough. Old habit.") and can't boil an egg. His
  work: **Salt for the Hanged** (Ebb's yearly salt, never a pinch down: the lime-pit and the Burning Ground; he puts a
  pinch on his own step, and don't tell the priest), **No Rope for Him** (the giant at the pit is the drover he hanged and
  limed in the plague year: he'd only carried it), **An Armful a Night** (the Burning Ground's fires are fed off his
  woodpile: he's been carrying it there in his sleep; the last man's skull), and on: **A Light Over the Cross** (past the giants on the lane, to
  Tansy: not yet), **Crowle's Jar** (past the gibbet, to Grawl: it's for his hands, which shake since the last one).
- **Tansy Wight**, 58, who reads the corpse-candles, at Corpse-Candle Camp (`c_worker_f_3`; sutler). Not who, only where
  to. Her work: **The Candle Road** (one light every night from the Lazar Field to Nightfall Ruin: walk it first, and
  it's gone), **Three Roads** (then three, all to the ruin: the ruin's calling; the Long Nightmare; her teacher's reading),
  and on: **Every Night Till Spring** (by the Lazar Field's edge, the Winter Company's playbill back to Fabian: she saw them go in).
- **Gil Mosse**, 38, her hunter (`c_wes_1`). Hunts by ear. His work: **Clappers** (the Lazar Field's sick have untied
  their clappers, careful, the way you'd muffle your feet; he'll wear one so they take him for theirs).
- **Master Fabian Larke**, 58, last of the Winter Company, at the Players' Wagon (`c_elder_2`; sutler). On, always on;
  did the talking, never had the money; stayed out with a cough. His work: **The Audience** (night things and the
  company's own painted figures sit in the grove at dusk facing the door), **The Winter Company** and **Last Night of the
  Run** (the Hollow Playhouse: Seamstress, then the Leading Man, then the Dollmaker, the woman with the box who paid; small pay, the delve pays its
  own), and on: **House Closed** (by Nightfall Ruin, where the company lost its last cart, to Crowle: he heard every speech from behind the beam).
- **Peg Hollin**, 24, who sold the tickets (`c_young_5_2`). Flat; minds him. Stayed out because the woman with the box
  asked how tall she was. Her work: **For Nothing** (Poxhollow, where the company played for nothing on the way in and
  he caught the cough that kept him out: he wishes every night he'd gone; she never once has).
- **Mother Grawl**, 77, at her hut (`c_crone_3`). Smells where you've been; everything costs; spite kept warm. Her work:
  **Henbane** (it grows fat round the Kennel: they've fed it), **Grawl's Kennel** (her six dogs the wood gave back upright,
  and Gnash: "Don't call him."; her walking stick), **The Burnt Ring** (a werebat and a black dragonling on a scorched bed watch her
  pot: she brews to bring them, and didn't think they'd stay), and on: **The Wrong Colour** (past the stopped carts of
  Thornwick's carters on the Marshal's Road, Wilf's dyed fleece back to him).
- **Wilf Carder**, 47, wool-factor at Roadsend (`c_smith_2`; sutler). Grades everything; out of wool. His work, the first two taken together: **Short by
  a Pound** (Thornwick's spring clip, in the grass round its stopped carters: every tally a pound light), **Laid Out
  Flat** (his old stock on the rise north, unrolled in rows, and the three tall things that lie on it), and on: **Wool for the Gate** (past the plague giant halfway up the road, to
  Rollo Bask at the Long Queue: they'll take anything at the gate).
- Lairs made for it: `carters_halt` (the carters, 16), `roadsend_demons` (17), `marshal_rd_plague` (17, halfway to the Queue);
  `grawl_bats` raised to 15 and moved off the hut, `toll_ambush` moved up onto the rise north of the toll; `gallows_bat`
  given a harpy on a roost; Grawl's Kennel made a howlers' den (14); one-of-a-kind boss slots where the words count them (src/core/tripo-monsters.js).

## Where people go (for the life sim)

- The square around the well: the market stalls (Magda's curios, Hilde and Ivy's ale, Agnes's bread, Tamsin's cloth, Orrin's
  books on fair days), benches, the children's games, gossip.
- The inn: breakfast and supper, songs in the evening (Maudie sings, Wenna sings, Hilde dances, Nell rolls her eyes), the Tally.
- Work: the smith's yard (Homunculus at his work, Dusty at the coal, Wren watching), the fields south (Hob, Bess, Dob), the tannery vats (Wes), the looms (Tamsin, Wenna),
  the coffin yard (Silas), the bakehouse oven (Agnes), the tithe barn (Garth), the herb garden (Sabine, Bryony), the woods' edge
  (Corran), the watch (Aldric by day at the tower and the two posts on the west side, Edric at the gate of an afternoon,
  Jory at night with his lantern, all the way round to the east end).
- The green south of the square: the children's games, Elowen's lesson, and the silver knight walking his square.
- The old oak south-west of the square: Cedric and Elowen, after dark.
- Night: everyone sleeps in their own bed (couples share; children share), except Jory, who walks.
