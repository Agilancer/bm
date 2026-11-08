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

Forty-one people. Plus Old Lis, who just arrived (not part of this cast; she's the intro's).

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

## Where people go (for the life sim)

- The square around the well: the market stalls (Magda's curios, Hilde and Ivy's ale, Agnes's bread, Tamsin's cloth, Orrin's
  books on fair days), benches, the children's games, gossip.
- The inn: breakfast and supper, songs in the evening (Maudie sings, Wenna sings, Hilde dances, Nell rolls her eyes), the Tally.
- Work: the forge (Homunculus, Dusty, Wren), the fields south (Hob, Bess, Dob), the tannery vats (Wes), the looms (Tamsin, Wenna),
  the coffin yard (Silas), the bakehouse oven (Agnes), the tithe barn (Garth), the herb garden (Sabine, Bryony), the woods' edge
  (Corran), the watch (Aldric by day at the tower and the two posts on the west side, Edric at the gate of an afternoon,
  Jory at night with his lantern, all the way round to the east end).
- The green south of the square: the children's games, Elowen's lesson, and the silver knight walking his square.
- The old oak south-west of the square: Cedric and Elowen, after dark.
- Night: everyone sleeps in their own bed (couples share; children share), except Jory, who walks.
