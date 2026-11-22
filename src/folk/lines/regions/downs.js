// The Green Downs: what its people say (LINES, by their id, as src/folk/lines/land.js) and every word of the quests given
// there (QUESTS, by the quest's id; their workings: src/folk/regions/downs.js). Taken into src/folk/lines/land.js.
// No line anywhere names anything of the one power beside anything of the other (README "The two sides";
// tests/quests-beyond.test.mjs reads every line for it). Out here that falls three ways:
//   Cairnwatch, Dunmow Fold, Kestrel Hide and Stonecarters' Halt are camps, and Millhaven a hamlet: plain folk's. Nobody
//   at them names Velscour or Tessariel. They say "the knoll", "the old one in white", "the one in iron".
//   The Bell Tower's two (Ser Anselm Toller and Ser Hale Orrowick, whose own lines are in beyond.js and land.js) are
//   Tessariel's: nothing they say here names Velscour, his keep or anything of his.
//
// Each with a voice of their own (tools/folk/cast.md, "The Green Downs"): Cuddy Stone the cairn-keeper (sees everything
// from his platform and goes nowhere; counts; bearings and paces), Abel Fenwick the farmer (put upon; reckons what each
// thing has cost him), Joan Millward the miller's daughter (weights and measures, the sixteenth), Rafe Dunmow the shepherd
// (slow; counts yan, tan, tethera; a fold with nothing in it), Sib Kestrel the fowler (speaks low, listens, looks up). And
// a second at each camp, with one quest of their own: Ede Lowry, Madge Wattle, Joss Kestrel.
// No animals are built at the camps or the hamlet, and none is said to stand there: Rafe's flock is gone (it's found, in
// the end, in Thornwick's pound), Sib's sky is empty, Joss's snares too.

export const LINES = {
  // ---------------------------------------------------------------- Cairnwatch
  cuddy: {
    first: [
      "Up through the cairns on your own feet. I had you at the Halt an hour back: one, walking, no cart. Cuddy Stone. I keep the cairns and the beacon. Sit where I can see past you.",
    ],
    greet: {
      morning: [
        "Morning. The cairns are all where I left them. I look.",
        "Mist in the bottoms. I can see the cap of the mill and nothing under it. It'll lift by ten.",
      ],
      day: [
        "You can see four roads from here. Nothing on any of them.",
        "If you're selling, lay it on the board. I see everything and get to very little of it. I'll buy what walks up.",
      ],
      evening: [
        "Light's going. That's when a beacon earns its oil.",
        "Smoke at the Halt. Smoke at Millhaven. None between. I count the smokes at dusk. It used to take longer.",
      ],
      night: [
        "Keep by the fire. The cairns aren't for walking among after dark.",
        "Don't stand in front of the basket. You'll be seen from six miles, and not all of what sees you is friendly.",
      ],
    },
    about: [
      "Cuddy Stone. Cairn-keeper at Cairnwatch, as my father was. I mind the stones and the light.",
      "I've not been off this rise in eleven years. No need. Stand anywhere long enough and it all comes past. Lately it comes past and stops.",
    ],
    ask: {
      dead: [
        "They come up the lane of an evening and stand among the cairns. Each by one cairn. I used to think they were lost. They aren't lost. They've come home and found the door shut.",
      ],
      town: [
        "Bellmourn's the smudge west and a little south. I can tell you when its baker's late and when the watch has let the tower lamp go out. I've never been in. I know it better than some who have.",
      ],
      cairns: [
        "Two hundred and twelve, and the great one in its kerb. Bellmourn's dead, from before it had a churchyard. A Stone has kept them since there was a Bellmourn to lose people. We didn't choose the name. It was what we were always stood next to.",
      ],
      beacon: [
        "A basket on a mast, a ladder, a cord of dry ash. Lit, it stands right over the bad bend on the hill, and a carter steers on it. I let it go out in spring. There's no sense lighting the way for nobody.",
      ],
    },
    topics: { cairns: 'The cairns', beacon: 'The beacon' },
    bye: [
      "Mind the path going down.",
      "I'll watch you as far as the road. After that you're your own.",
    ],
    barks: {
      player: ["I saw you coming.", "Not in front of the basket."],
      morning: ["All where I left them."],
      day: ["Four roads. Nothing."],
      evening: ["Counting the smokes."],
      night: ["Keep by the fire."],
      magic: ["That'll have been seen from Millhaven.", "Hm. Brighter than my basket."],
    },
    shop: {
      open: [
        "I've a little to sell, and I'll buy what you've carried up. Rolls from the Halt, and clean linen: a man alone on a ladder learns to bind his own shins.",
        "Lay it on the board. I'll give you what it's worth to someone who'd have to walk down for it, and won't.",
      ],
      closed: ["Not now. I'm counting."],
      buy: ["Yours. Don't drop it among the cairns. I'd see, and I couldn't fetch it."],
      sell: ["I'll have that. Something to look at that isn't four miles off."],
    },
  },

  ede: {
    first: [
      "You've not come about the stone. No. Nobody has. Ede Lowry. I'm from Bellmourn, behind the tannery. I came up to put a stone on my father, and I can't find him.",
    ],
    greet: {
      morning: ["Morning. Cuddy says the Field's the same as yesterday. He says it as if that were a comfort."],
      day: ["I take in washing, in town. I'm not used to sitting. I've wrung out everything here that'll wring."],
      evening: ["Cuddy's looking north-west again. He says don't look. He looks."],
      night: ["I'll sit up. I didn't walk four miles to sleep."],
    },
    about: [
      "Ede Lowry. I wash for the Brewers and whoever else pays. My father was Ned Lowry, a thatcher, and he died owing. So it was Paupers' Field, and a board. Nine winters back. This year I'd the money for a stone.",
      "Silas Crane cut it for me at the family rate. I'm not family. He said everybody is, in the end, and took a third off.",
    ],
    ask: {
      dead: [
        "If he's up and walking, I'd know him. He'd a limp, from the Reeds' roof. I've looked at every one that's come up the lane. I don't know if I want to see it. I look anyway.",
      ],
      town: [
        "It's four miles, and I'd never been further than the east pasture. Cuddy says you can see my own washing-line from his platform. I've not gone up. I don't want to know what's on it.",
      ],
    },
    bye: ["Go careful by the Field."],
    barks: {
      player: ["Have you been by the Field?"],
      day: ["Nothing left to wring."],
      evening: ["He's looking again."],
      magic: ["Oh! ...No. It's all right. Go on."],
    },
  },

  // ---------------------------------------------------------------- Millhaven
  abel: {
    first: [
      "You're no harvester. No. Nobody is, this year. Abel Fenwick. I've stood on this green since Lammas with a shilling for any man who'll swing a scythe, and what the road sends me is a wizard with a head in his hand.",
    ],
    greet: {
      morning: [
        "Morning. Dew's heavy. Barley wants it dry. Everything I've got wants something it isn't getting.",
        "Up early? So was I. A man can worry as well standing as lying.",
      ],
      day: [
        "No takers. Same as yesterday. I'll stand till noon, then go and look at the field, and come back worse.",
        "That's Joan's board, with the flour. If you're buying or selling, it's her. I've nothing to sell but barley, and that's still got its feet in the ground.",
      ],
      evening: [
        "I've lit Hale's hearth again. A house goes damp with nobody in it. He says I burn too green. He says it from the top of a knoll, in iron, so I let him.",
        "Light's going, and nothing cut. Put that on my stone. Not that there'll be anyone to cut the stone either.",
      ],
      night: [
        "I don't walk home by the pond after dark. I go round by the top lane. It's a quarter-mile further, and I begrudge every step.",
        "Can't sleep. I counted what I've lost till I ran out of fingers. Then I started on what I'm going to lose.",
      ],
    },
    about: [
      "Abel Fenwick. I farm the top fields and the pond meadow, and for two years the low field as well, which isn't mine. Hob Fenwick in Bellmourn's my cousin. He got the easy land, and the wife who can cook.",
      "I'm not a lucky man. I don't say it to be pitied. I say it so you'll not stand too near.",
    ],
    ask: {
      dead: [
        "They come down off the downs at dusk and walk straight through my barley. Not round. Through. They don't break a stalk; I've looked. I'd almost sooner they did. I'd know what to charge.",
      ],
      town: [
        "Bellmourn? Hob's there, with his feet up. I send him word when a thing goes wrong, so he'll know what a farm is. He sends back that he's sorry. He's always sorry. It costs nothing.",
      ],
      hale: [
        "Hale Orrowick. Had the low field, next to mine. Best ploughman on the downs: a furrow like a ruled line. Two springs back he left the plough stood in it and went up the knoll, and he's stood there since, in iron, like a gatepost with a hat on.",
      ],
      barley: [
        "Forty acres, ripe, with the ears bowed. Another fortnight and it sheds. I can cut two acres a day if my back holds, and it won't. That's the sum. I do it every night, and it comes out the same.",
      ],
    },
    topics: { hale: 'Hale Orrowick', barley: 'The barley' },
    bye: [
      "Go on, then. Everyone does.",
      "If you meet a man with a scythe, send him here. I'll not hold my breath.",
    ],
    barks: {
      player: ["Can you use a scythe? No.", "Mind the well. It's the one thing here that works."],
      morning: ["Dew's heavy."],
      day: ["A shilling a day! ...Nobody."],
      evening: ["Nothing cut."],
      night: ["Round by the top lane."],
      magic: ["Not near the ricks!", "Could that cut barley? ...No. I thought not."],
    },
  },

  joan: {
    first: [
      "Flour's a penny the quartern, and it's the last there is, so don't haggle. ...You're not buying. You're looking at the mill. Everyone does: sails at a slant, a month now. Joan Millward. It's my father's mill. I run it, when I can get near it.",
    ],
    greet: {
      morning: [
        "Morning. I've weighed out. Eleven quarterns left, and the sweepings.",
        "Wind's fair from the west. Good grinding wind. I notice it still, the way you'd notice a dinner going by.",
      ],
      day: [
        "Buying or selling? I do both, and I do them by weight.",
        "Father's in my aunt's back room with his chest. He asks if the stones are turning. I say the wind's wrong. He can see the vane from his bed. He lets me say it.",
      ],
      evening: [
        "I'm packing up the board. If you want anything, want it now.",
        "You can see the sails from the end of the street, against the sky. Stopped anyhow. A miller doesn't leave them so. It's like leaving a door open.",
      ],
      night: [
        "I sleep at my aunt's. It's the first month of my life I've not slept to the sound of the stones. I lie there waiting for it to start.",
        "Late for trade. Early for anything else.",
      ],
    },
    about: [
      "Joan Millward. Old Enoch Millward's daughter. He's the miller, and I'm the one who lifts the sacks. I've dressed the stones myself these six years; his hands shake on the bill.",
      "A miller takes a sixteenth of what he grinds. That's the toll, and it's the only law I ever liked. Everything else in the world takes more and says less about it.",
    ],
    ask: {
      dead: [
        "One came into the mill yard last winter and stood under the sails while they turned. Just stood, with its face up, like a child under a wet sheet. I let it be. It went when the wind dropped.",
      ],
      town: [
        "Bellmourn's barley comes up on Tobin Wain's cart and goes back flour. Hob Fenwick's, and the Brewers' malt. I've not seen Tobin since spring. I'd thought he was dead. Carters go quiet like that.",
      ],
      mill: [
        "Tower mill, four common sails, two pair of stones. You turn the cap into the wind with the tail-pole, and she does the rest. A quarter in an hour, in a fair wind. She's ground nothing since the three came and stood in the yard.",
      ],
      father: [
        "Enoch. Seventy-one. He set those sails every morning for fifty years, and now he's a man in a bed, who listens. The old knight on the knoll sends to ask after him. They're of an age. Neither ever said a kind word to the other.",
      ],
    },
    topics: { mill: 'The mill', father: 'Your father' },
    bye: [
      "Full measure to you.",
      "Mind how you go. And shut the gate, if you're by the mill.",
    ],
    barks: {
      player: ["Penny the quartern. Don't haggle.", "Hands off the scale."],
      morning: ["Eleven quarterns left."],
      day: ["Good grinding wind. Wasted."],
      evening: ["Packing up!"],
      night: ["No stones turning."],
      magic: ["Not near the flour! It goes up like powder.", "Well. That'd turn a sail."],
    },
    shop: {
      open: [
        "Rolls, of my own flour, so they're good. Clean linen, for binding. And I'll buy what you're carrying, by weight: I've a scale and no grain to put on it.",
        "Put it in the pan. I'll tell you what it comes to, and it'll be right. A miller who cheats on weight doesn't keep a mill.",
      ],
      closed: ["Board's shut. Come when it's light."],
      buy: ["Full measure. Count it if you like; I'd think the better of you."],
      sell: ["I'll take it. A sixteenth off for the weighing. That's a joke. Mostly."],
    },
  },

  // ---------------------------------------------------------------- Dunmow Fold
  rafe: {
    first: [
      "Yan, tan, tethera... no. You're not one of mine. Mine had four legs. Rafe Dunmow. That's the fold, that's the cairn, and I'm the shepherd. You'll have noticed what's wanting.",
    ],
    greet: {
      morning: [
        "Morning. I've been round the fold. Force of habit. It takes no time at all, now.",
        "Dew on the hurdles. A ewe'd be nosing the gate by this. I still listen for it.",
      ],
      day: [
        "Sit, if you're stopping. Trade, if you're trading. It's a shepherd's board: salve, and bread, and I'll take what you've no use for.",
        "Good grass, this year. Best I've seen. That's the joke of it.",
      ],
      evening: [
        "I count at dusk. Yan, tan, tethera, methera, pimp. I get as far as there's anything to count. It's not far.",
        "Wind's off the Crag. You'll hear them presently. Like a gate that wants oil, and then like a woman.",
      ],
      night: [
        "I don't sleep in the bothy. I sleep by the gate. Sixty years, a shepherd sleeps by the gate. Nobody told me what to do when there's nothing to come through it.",
        "Hear that, north? One voice, and then a lot of feet. That's Bleatmoot. Every night since shearing.",
      ],
    },
    about: [
      "Rafe Dunmow. Shepherd, and my father, and his. Dunmow's the fold and the fold's Dunmow. I couldn't tell you which was named for which.",
      "Three hundred and forty at lambing. I had them all at shearing. Then one night the hurdles were down on the south side and the fold was empty. Not a mark. Not a tuft. As if they'd been called.",
    ],
    ask: {
      dead: [
        "A dead man walked through my flock two summers back. They parted for him and closed up behind, like water. Never lifted their heads. I thought: well, he's no dog. That's all a sheep wants to know.",
      ],
      town: [
        "Bellmourn wears my wool and doesn't know it. It goes down to Thornwick, and from Thornwick wherever wool goes. I was in Bellmourn once, for a wedding. Too many corners.",
      ],
      cairn: [
        "Every shepherd of this fold puts a stone on for each ewe he loses. That's the rule. My father put on nine in his whole life. Look at the height of it. I've not put this year's on. I've not the stones. I've not the back.",
      ],
      count: [
        "Yan, tan, tethera, methera, pimp. Sethera, lethera, hovera, dovera, dick. That's ten. You count to a score, put a pebble in your pocket and start again. It's older than the fold. I think it's older than sheep.",
      ],
    },
    topics: { cairn: 'The cairn', count: 'The count' },
    bye: [
      "Go quiet past the Crag.",
      "Mind how you go. I've lost enough.",
    ],
    barks: {
      player: ["Not one of mine.", "Shut the gate. ...Habit."],
      morning: ["Round the fold. All none of them."],
      day: ["Good grass. Wasted."],
      evening: ["Yan, tan, tethera..."],
      night: ["That's Bleatmoot."],
      magic: ["That'd have scattered them to Thornwick.", "Hm. No dog ever did that."],
    },
    shop: {
      open: [
        "A shepherd's board. Salve that does for a cut on man or beast, bread, and I'll take what you've carried. I've nothing else to spend on.",
        "Set it on the hurdle. I'll look it over the way I'd look over a tup: slowly, and for what's wrong with it.",
      ],
      closed: ["Not now. I'm listening."],
      buy: ["Yours. Use it sparing. It's the last I boiled."],
      sell: ["I'll take it. It's something in the fold."],
    },
  },

  madge: {
    first: [
      "Mind your feet: that's cleft hazel, and it's sharp at both ends. Madge Wattle. I make hurdles. Rafe's had a fold-full off me every year for thirty. This year I brought them up, and there was nothing to put inside.",
    ],
    greet: {
      morning: ["Morning. Two made before you were up. Nobody to buy them. I make them anyway. It's that or talk to Rafe."],
      day: ["Six bars, two heads, two braces. If you can count that, you can check my work."],
      evening: ["I'll stop when the light does. Hazel doesn't split true by a fire."],
      night: ["Rafe sleeps by the gate. I sleep in the bothy, where there's a roof. One of us has sense."],
    },
    about: [
      "Madge Wattle. Hurdle-maker, from the hazel coppice down Thornwick way. A hurdle's a gate you can carry. Six-bar, cleft, pinned with its own wood. Not a nail in it.",
      "I came up at shearing with forty new, and I've stopped on. Somebody has to see he eats.",
    ],
    ask: {
      dead: [
        "One leaned on a hurdle of mine all one night, down home. Just leaned, looking in at the lambs. It held. I was that proud I forgot to be frightened.",
      ],
      town: [
        "Bellmourn buys wattle, not hurdles. Wattle's a hurdle that's given up and become a wall.",
      ],
    },
    bye: ["Mind the points."],
    barks: {
      player: ["Mind the points."],
      day: ["Six bars. Count them."],
      evening: ["Losing the light."],
      magic: ["Not near the hazel! It's dry."],
    },
  },

  // ---------------------------------------------------------------- Kestrel Hide
  sib: {
    first: [
      "Shh. ...No. Nothing. There's been nothing over in nine days; I don't know why I still do that. Sib Kestrel. Fowler. Keep your voice down anyway. It's the habit of the house.",
    ],
    greet: {
      morning: [
        "Dawn's when they fly. I was in the hide by four. I counted the sky. It came to none.",
        "Morning. Speak low. You never know.",
      ],
      day: [
        "If you've come to trade, lay it down soft. I've salt meat, and lint, and an eye for what a thing's worth plucked.",
        "Look up. Go on. Big sky, isn't it. I've never seen it so clean.",
      ],
      evening: [
        "Flighting time. Duck came over at dusk, low, talking. Came. I still stand out for it.",
        "Fire's small. We keep it small. You can't hear over a big fire.",
      ],
      night: [
        "Listen. ...That's the Hollow. They don't howl. They talk, low, like men who've forgotten most of it.",
        "Don't walk about by the ribs after dark. Something comes and works at them.",
      ],
    },
    about: [
      "Sib Kestrel. I take fowl: net, lime and call. Partridge off the stubble, plover in spring, duck at the flight. Joss hunts what runs. Between us the hide's never gone hungry, till now.",
      "Kestrel's the name, and the hide's named for us, or we for it. My mother said for the bird. There was one hung over those ribs every day of my life. It's gone too.",
    ],
    ask: {
      dead: [
        "Birds don't mind them. I've seen a wagtail ride one across the down on its shoulder, picking at its collar. That's how I knew they weren't what's wrong here.",
      ],
      town: [
        "My birds go to Thornwick, and Thornwick's carrier takes them on. Bellmourn's eaten my partridge and called it a cousin's. I've never seen the place.",
      ],
      ribs: [
        "Nobody knows. They were here before the hide, and the hide's older than the road it's not on. Higher than a hayrick, in two rows. The head's long gone. My mother said don't ask what it ate. I've wondered more what ate it.",
      ],
      calls: [
        "A call's a lie told to a bird. Quail-pipe, plover whistle, wigeon call. Cut one right and you can say 'safe', or 'here', or 'come down', and they believe you. You have to mean it kindly, even then. They can tell.",
      ],
    },
    topics: { ribs: 'The ribs', calls: 'Bird-calls' },
    bye: [
      "Go soft.",
      "Keep your eyes up. Tell me if you see anything in it.",
    ],
    barks: {
      player: ["Shh.", "Soft, there."],
      morning: ["Counted the sky. None."],
      day: ["Clean sky."],
      evening: ["Flighting time. Was."],
      night: ["That's the Hollow. Talking."],
      magic: ["...That's every bird for a mile gone. If there were any.", "Quiet magic. Thank you."],
    },
    shop: {
      open: [
        "Salt meat, and lint for binding: what we can spare. And I'll buy. I know what a thing's worth plucked and drawn.",
        "Lay it down soft. I'll go through it. I'm used to sorting what's fallen out of the sky.",
      ],
      closed: ["Not now. I'm listening."],
      buy: ["There. Keep it dry."],
      sell: ["I'll take that. It's something come in, at least."],
    },
  },

  joss: {
    first: [
      "Sib'll have shushed you. She does. Joss Kestrel. I hunt what runs: hare, roe. I'd offer you some. Ask me why I can't.",
    ],
    greet: {
      morning: ["Morning. Snares were empty. They're always empty now. Something goes round them before I do."],
      day: ["I'm mending a snare. I've mended it four times. It's not been sprung once."],
      evening: ["I sit with my back to the ribs. I like something behind me."],
      night: ["They came at night, last time. Upright. I'd like that understood. Upright."],
    },
    about: [
      "Joss Kestrel. Sib's brother. She takes what flies and I take what runs, and we've split the down that way since we could walk.",
      "I've a bow and forty snares, and I've not eaten meat of my own killing in a fortnight. Something's hunting my ground, and hunting it better.",
    ],
    ask: {
      dead: [
        "They walk through a snare and don't spring it. I've watched. I don't know how it's done. I'd pay to learn.",
      ],
      town: [
        "Never been. Sib says it's like a warren. I've nothing against a warren, from outside.",
      ],
    },
    bye: ["Watch the low ground."],
    barks: {
      player: ["Ask me about the hare."],
      day: ["Not sprung once."],
      night: ["Upright. Mark that."],
      magic: ["Do that at the Hollow."],
    },
  },

  // ---------------------------------------------------------------- placeholder: moved to the Rustwood's file when it's
  // made (the one the Bell Tower's errand on is said to; what he says to the errand is in its quest's `others`).
  jem: {
    first: ["Mind the sledge. It's going nowhere, but mind it. Jem Sledge. Stone-carter. That block's sat there since my father's team died in the traces, and I've stopped beside it ever since."],
    greet: {
      morning: ["Morning. Frost in the block. You can hear it tick."],
      day: ["Carters halt here. That's all it is. A place to stop being on the road."],
      evening: ["Fire's lit. Sit on the drum. It's the one seat that won't walk off."],
      night: ["Keep in by the block. Whatever's out on the down goes round it."],
    },
    about: ["Jem Sledge. I bring stone down from the quarry on sledges, as my father did. The Halt's where the teams rest before the long pull."],
    bye: ["Go steady."],
    shop: { open: ["I'll buy, and I've a little to sell. A carter's always got something under the sheet."], closed: ["Not now."] },
  },
};

export const QUESTS = {
  // ================================================================ Cairnwatch (Cuddy Stone; Ede Lowry)
  from_the_platform: {
    title: "Three I Can't Account For",
    giver: 'cuddy',
    about: "From the beacon's platform at Cairnwatch, Cuddy Stone can see three things he can't account for: stones stacked on the Cairnfield that he never stacked, a field to the north with too many scarecrows in it, and something moving in Paupers' Field. He keeps the light and won't leave it. Go and stand at each, and tell him what's there.",
    offer: [
      "I see everything from that platform. That's the trouble with it. Three things, this month, I can see and can't account for, and I'm a man who accounts.",
      "East, on the Cairnfield: stones stacked square, that I never stacked. North: a field nobody sows, with scarecrows in it. North-west, in Paupers' Field: something going about, where nobody's left to. I don't leave the beacon. You've legs. Go and stand at each, and tell me.",
    ],
    accept: "I'll go and look.",
    acceptLine: "The Cairnfield's a hundred and fifty paces east. The scarecrows, two hundred and fifty north. The Field's the far one: three hundred and fifty, north-west. There's a trodden way to each. Only look. Stand off as far as you can see from. I'll be watching, for what that's worth.",
    decline: 'Not now.',
    declineLine: "Then I'll go on looking at it. It's what I do.",
    journal: [
      "Cuddy Stone can see three things from Cairnwatch that he can't account for. Stand at each and look: the Cairnfield, east of the camp; Strawman's Acre, the scarecrows' field, north; and Paupers' Field, north-west.",
      "Go back to Cuddy Stone at Cairnwatch and tell him what's at each.",
    ],
    progress: [
      "East, north, north-west. Any order. I can see you at all three, and I still can't see what you'll see.",
    ],
    heard: {
      cairnfield: "Cairns stand open, their stones stacked square beside them. Someone small is moving among them, carrying.",
      'outpost:den_strawacre': "Scarecrows, on ground nobody has sown. Far too many to be for crows, and none of them faces the field.",
      'outpost:den_paupers': "Paupers' Field. The graves are open, and what was in them is walking the wall.",
    },
    done: [
      "Children, on the Cairnfield, carrying the stones. And one in a robe, who points. I'd seen the small ones. I took them for Millhaven's, playing. I'd meant to shout at them.",
      "And the straw ones face here, and the Field's up and walking. Well. I asked. Here: that's for the legs. I'll have work for the rest of you when I've thought which of the three I mind most.",
    ],
    after: [
      "I look at the three of them differently now. It's no better. But I know what I'm looking at, and that's all a lookout's for.",
    ],
    others: {
      ede: ["He's sent you to look at the Field? Then tell me too. No. Tell him, and I'll watch his face."],
    },
  },

  cairnfield: {
    title: 'Stones on the Cairnfield',
    giver: 'cuddy',
    about: "Bellmourn put its dead under stones on the Cairnfield before it had a churchyard, and a Stone has kept them ever since. Someone is opening the cairns: not robbing them, opening them, tidily, with the stones stacked. A robed one, with three raised children to fetch and carry. Cuddy Stone wants three of the four put down: a hundred and fifty paces east of Cairnwatch.",
    offer: [
      "Before there was a churchyard, Bellmourn put its dead out here under stones. Two hundred and twelve cairns, and the great one. I count them every morning. The count's right. It's the stones that are wrong.",
      "Six opened since Lammas. Not robbed. Opened, tidy, and the stones stacked square beside. Somebody's taking stock. A robed one, east of here, with three small ones to fetch and carry. I'll not have my people counted by a stranger. Three of the four down would end it.",
    ],
    accept: "I'll go in among the cairns.",
    acceptLine: "A hundred and fifty paces east, at the south side of the field, where the path comes up. The robed one stands back and throws; the small ones come at you. If a cairn's open, don't look in. Or look. They're Bellmourn's, and they'll not mind you.",
    decline: 'Not today.',
    declineLine: "They've lain two hundred years. But they weren't being unpacked, then.",
    journal: [
      "Someone is opening the old cairns on the Cairnfield, where Bellmourn's first dead lie. Put down three of the four at it, a robed one and the children it has raised: a hundred and fifty paces east of Cairnwatch.",
      "Go back to Cuddy Stone at Cairnwatch.",
    ],
    progress: [
      "East. The south side of the field. Whoever it is can read; they've been at the name-stones.",
    ],
    done: [
      "Down? And the stones? ...Stacked by size, the largest at the bottom. That's how I'd do it. That's how my father showed me. I don't like having a thing in common with it.",
      "Silas Crane in Bellmourn has people under six of those. I'll put them back myself; I know which stone is which. Here. It's what the parish pays me a quarter. I'm not sure the parish knows it's still paying.",
    ],
    after: [
      "I've restacked four. My knees say that's a season's work. The cairns say nothing, which is how I like them.",
    ],
    others: {
      silas: ["The Cairnfield? My great-grandfather's there, and every Crane before him. If Cuddy Stone says they're being opened, they are. He's never been wrong about a stone."],
      orrin: ["The Cairnfield! The name-stones there are older than my oldest book. If you could rub one for me... no. Cuddy Stone would see. He sees everything."],
    },
  },

  name_boards: {
    title: 'Name-Boards',
    giver: 'ede',
    about: "Ede Lowry has walked up from Bellmourn with money for a stone for her father, buried nine winters ago in Paupers' Field under a wooden board. The boards have been pulled up and thrown about outside the Field's wall, and what's inside the wall is walking. Bring her five: three lie well out, two close under the wall. North-west of Cairnwatch, three hundred and fifty paces.",
    offer: [
      "My father's in Paupers' Field. Ned Lowry. A board with his name on: that's all they give you. I've a stone paid for now. I came up to find which board's his, so they'd know where to set it.",
      "The boards are up. All of them. Pulled, and thrown about outside the wall, as if somebody'd gone through them like a drawer. I got near enough to see that, and to see what's walking inside. I can't read them from there. Bring me what you can pick up. Five. He might be in five.",
    ],
    accept: "I'll bring you five.",
    acceptLine: "North-west, three hundred and fifty paces; there's a trodden way. Three lie well out in the grass: keep wide for those. Two are close under the wall, and for those they'll see you. They're only elm board, a hand wide. Don't mind which. I'll know his.",
    decline: 'Not there.',
    declineLine: "No. I didn't either. I got as far as I could see it from, and came back.",
    journal: [
      "The name-boards have been pulled from the graves in Paupers' Field, north-west of Cairnwatch, and thrown round the outside. Pick up five for Ede Lowry: three lie well out, two close under the wall, in sight of what walks there.",
      "Take the boards back to Ede Lowry at Cairnwatch.",
    ],
    progress: [
      "Five. Any five. If one says Lowry, don't tell me from over there. Bring it, and put it in my hand.",
    ],
    done: [
      "Give them here. ...Lowry. That's him: that's the sexton's hand, and the knot in the wood I remember. And this says Lowry. And this. All five. Four of them new board, and cut with something that wasn't a chisel.",
      "Somebody's been copying him out. Over and over. Getting it wrong, and then less wrong. Learning it. Why would a thing want to learn a name? ...No. Don't say. Cuddy told me there's one in there that calls. Take this. I'm keeping the old board. The rest can burn.",
    ],
    after: [
      "I'll have the stone set outside the wall. It's not where he is. But it's where his name's safe, and I've told him so.",
    ],
    others: {
      cuddy: ["Ned Lowry? Third row, north end. I watched him put in. I watch them all put in. I'd not tell her this, but his board was the first one pulled."],
    },
  },

  one_more_each_morning: {
    title: 'One More Each Morning',
    giver: 'cuddy',
    about: "North of Cairnwatch is a field nobody has sown in Cuddy Stone's time. There were three scarecrows in it at midsummer. There is one more each morning, they face the camp and not the crows, and yesterday's was wearing his other coat. Empty Strawman's Acre: every one that moves, and the big wicker one in the middle. Two hundred and fifty paces north.",
    offer: [
      "North, two hundred and fifty paces: a field nobody's sown in my time. Three scarecrows in it at midsummer. I count them. I count everything; I can't help it. Twenty-six this morning.",
      "One more each morning. And they don't face the crows. They face here. Yesterday's was wearing my other coat, which was hung on the palisade the night before. I've not slept since. Empty it. All that move, and the big wicker one in the middle, which the rest stand round.",
    ],
    accept: "I'll empty the field.",
    acceptLine: "North, by the trodden way. They stand still till you're in among them; that's the whole of their cunning. The wicker one throws fire, in a wheel. I've watched it practise. Don't stand where the wheel's going.",
    decline: 'Not yet.',
    declineLine: "Twenty-seven tomorrow, then. I'll take the washing in.",
    journal: [
      "Scarecrows gather in Strawman's Acre, north of Cairnwatch: one more each morning, all facing the camp. Empty the field: put down every one of them, and the wicker man in their middle.",
      "Go back to Cuddy Stone at Cairnwatch.",
    ],
    progress: [
      "North. All of them. I'll count from here as they go down, and tell you if you've missed one.",
    ],
    done: [
      "None. I've counted it twice. None. And the wicker one's down. Then tell me who was making them. ...You saw nobody. No. Nor have I, and I've not taken my eyes off that field since midsummer.",
      "This was on the newest. It's my coat. It's been stuffed with straw and stood in a field looking at me, and I'll not put it on again. You've less to be particular about. And there's a thing more, when you've your breath: Millhaven.",
    ],
    after: [
      "The field's empty. I count it anyway, mornings. None. I say it out loud. None. It's the best number I've got.",
    ],
    others: {
      ede: ["The straw ones? I walked past that field coming up. I thought, that's a lot of scarecrows for no corn. Then one of them wasn't where it had been."],
    },
  },

  sails_at_a_slant: {
    title: 'Sails at a Slant',
    giver: 'cuddy',
    needs: 'one_more_each_morning',
    about: "From Cairnwatch, Cuddy Stone can see Millhaven's windmill, and its sails haven't turned in a month; and Tobin Wain is bringing barley up to be ground. Three goblins sit by the Abbey Road on the way: put down two. Then, on the green at Millhaven, ask the miller's daughter why the mill has stopped, and tell Abel Fenwick there's a cart coming. A quarter of an hour east. It's paid there.",
    offer: [
      "See the mill? South-east, on its rise, past the Abbey Road. Sails at a slant. They've not moved in a month, and I've watched for it. A miller doesn't leave them so.",
      "Tobin Wain's bringing Hob Fenwick's barley up, now the beacon's lit, to a mill that isn't turning. Ask the miller's daughter why. Then tell Abel Fenwick, Hob's cousin, what's coming. And there's goblins sat where the path meets the Abbey Road. Three. Go through them.",
    ],
    accept: "I'll go to Millhaven.",
    acceptLine: "East, a quarter of an hour. The goblins are better than halfway, this side of the Abbey Road: two down, and the third will find somewhere else to sit. Then on over the road to the street of houses. Both of them stand on the green. Fenwick's the one who looks rained on.",
    decline: 'Not now.',
    declineLine: "Then Tobin hauls barley to a dead mill. He'll thank neither of us.",
    journal: [
      "Cuddy Stone wants word taken to Millhaven. Three goblins sit beside the Abbey Road, east of Cairnwatch, on the way: put down two of them.",
      "Go on east to Millhaven. Ask Joan Millward, who keeps a board on the green, why the mill's sails have stood a month.",
      "Tell Abel Fenwick, by the well on the green, that Tobin Wain's cart is coming up the hill with his cousin's barley.",
    ],
    progress: [
      "East. Through the goblins at the Abbey Road, then on. The miller's daughter first. Then Fenwick.",
    ],
    done: [
      "A cart? Hob's barley, coming up? Now? That's Hob all over. Eleven years he sends it prompt, and the one year he's late is the year there's no mill to be late for.",
      "And Joan's told you why. Customers. Well, I've a pond, a field and a neighbour, and all three want seeing to. If you're stopping.",
    ],
    after: [
      "I watched you all the way to the green. Fenwick waved his arms about. It tells me nothing. He'd wave them at good news.",
    ],
    others: {
      joan: [
        "Cuddy Stone's seen my sails from his post? Then half the downs has. ...It's customers. Three, stood in my yard under the sails since Lammas, and I can't get by them to set the cap. Don't tell Cuddy that. Say the wind's wrong.",
        "And a cart coming? Then tell Abel; it's his cousin's barley, and he's stood there by the well. I'll have work for you after, if you've a mind. It wants somebody who isn't frightened of customers.",
      ],
      abel: [
        "A cart? Hob's barley, coming up? Now? That's Hob all over. Eleven years he sends it prompt, and the one year he's late is the year there's no mill to be late for.",
        "And Joan's told you why. Customers. That's for the walk, and for the goblins. And if you're stopping: I've a pond, a field and a neighbour, and all three want seeing to.",
      ],
    },
  },

  // ================================================================ Millhaven (Abel Fenwick; Joan Millward)
  millhaven_jelly: {
    title: 'Jelly in the Millpond',
    giver: 'abel',
    about: "Something green came up out of Abel Fenwick's pond at lambing and ate a ewe, slowly, while he watched. The pond lies beside the Hill Road just past his farmhouse, four hundred paces west of Millhaven, and there are more of them now. Put down six of the jellies there.",
    offer: [
      "I've a pond, by the farm. At lambing something came up out of it. Green, and it moves on its own, and it ate a ewe.",
      "Ate it slow. I watched. Not because I wanted to: it was between me and the gate. There's more of them now, and the pond meadow's the one field I could reach without help, if I could reach it. You've that staff. Six would give me my gate back.",
    ],
    accept: "I'll clear your pond.",
    acceptLine: "West along the road, four hundred paces, on the north side, just past the farmhouse. Don't let one sit on you. They hold on. And they come apart when you hit them, so count the pieces, not the blows.",
    decline: 'Not now.',
    declineLine: "No. Why would you. It's only sheep.",
    journal: [
      "Jellies have come up out of Abel Fenwick's pond, on the north side of the Hill Road just past Millhaven Farm, four hundred paces west of Millhaven. Put down six of them.",
      "Go back to Abel Fenwick on the green at Millhaven.",
    ],
    progress: [
      "West, by the farm. Six. They're slow till they aren't.",
    ],
    done: [
      "Six? There were three, when I last dared count. ...They come apart. Hit one and it's two. That's my luck in a bucket: even what eats my sheep breeds better than they do.",
      "Here. I'd rather pay than go and look, and I can't well afford either. I'll send word to Hob. He'll say he's sorry. He was sorry about the ewe.",
    ],
    after: [
      "I walked through my own gate this morning. First time since lambing. I stood in the pond meadow and couldn't think what I'd wanted there.",
    ],
    others: {
      joan: ["The millpond? It never turned a wheel. My grandfather dug it to wash sacks in, on Fenwick land, and we've argued whose it is for twenty years. Abel can have it. I've seen what's in it."],
      hob: ["Abel's jelly? He sent word by the carter. I'd have gone, but the barley... well. Tell him I'm sorry about the ewe."],
      tilly: ["A jelly that eats SHEEP? Can I come? I'll be quiet. I won't be quiet."],
    },
  },

  three_under_the_sails: {
    title: 'Three Under the Sails',
    giver: 'joan',
    about: "Three figures have stood in the yard of the Millhaven windmill since Lammas, under the sails, a little apart, with their arms held out from their sides. They've brought no grain and they don't knock, and Joan Millward can't get past them to set the cap. The mill is on its rise south-west of the green: four hundred paces as the crow goes, by the road and the Mill Lane. Put down two.",
    offer: [
      "Three customers in my mill yard, since Lammas, right under the sails. They don't knock. They've brought no grain. They stand a little apart with their arms out from their sides, like men being measured for a coat.",
      "I went up to the first and said, we're shut. It turned its head. All the way. I've not been back, and that's my mill, with the sails as I left them. Father says serve them and they'll go. Father's not seen them. Shift two, and I'll chance the third.",
    ],
    accept: "I'll clear your yard.",
    acceptLine: "West along the road to the farm, then up the Mill Lane: the tower on the rise. They're round the far side from the door, under the sails. They don't move till you're near. Then they're quick, and they hit like a sack falling.",
    decline: 'Not now.',
    declineLine: "Then the wind's wrong again today. I'll tell Father.",
    journal: [
      "Three figures stand under the sails of the Millhaven windmill, south-west of the green by the Hill Road and the Mill Lane, and the miller's daughter can't get near it. Put down two of them.",
      "Go back to Joan Millward on the green at Millhaven.",
    ],
    progress: [
      "The mill, on its rise. Two of the three. I'll know from here when I can go up.",
    ],
    done: [
      "Down. And inside? ...Nothing. Hollow, like a churn. Then what were they waiting to be filled with? No. Don't answer. I've a mill to run, and I'll not think about it.",
      "And the third had a sack? Held open? With a penny in it. An old one, thin as a leaf. You're sure. ...Then it's paid. Damn it. Now I owe it flour. Here, that's yours. And leave the third be. I don't rob customers.",
    ],
    after: [
      "I ground a quartern and tipped it in the sack. It's stood there yet, holding it. But the penny's gone. I don't ask.",
    ],
    others: {
      abel: ["Joan's customers? I walked by them at dusk once. I raised my hat. You do, to a stranger. I'd like that hat back. I dropped it running."],
    },
  },

  flour_and_water: {
    title: 'Flour and Water',
    giver: 'joan',
    about: "Eleven sacks of fine white went out of the Millhaven mill in one night, and the trail of it runs to Mudwall Stockade, where goblins den north of the Hill Road. Joan Millward wants the stockade emptied, its chief and all; and then her sacks, which lie all round the outside. Five would do. West of the green, three hundred paces.",
    offer: [
      "The night before the three came to my yard, eleven sacks of fine white went out of the mill. I followed the trail next morning. You can, with flour. West along the road, then north, to that stockade of theirs. Mudwall.",
      "Empty it. Then fetch me my sacks. Not the flour; that's been in goblins. The sacks: good hemp, with Father's mark, lying all round the outside. Five would do me. I don't much mind being robbed. I mind being robbed by something that can't bake.",
    ],
    accept: "The stockade, then your sacks.",
    acceptLine: "West, three hundred paces, and north of the road; there's a trodden way off it. The chief's the big one in the iron. He throws knives, a handful at a time. The sacks are in the grass round the wall. You'll know them by the mark: an ear of barley in a ring.",
    decline: 'Not now.',
    declineLine: "Then I'm sewing sacks out of my aunt's curtains. She'll not like it.",
    journal: [
      "Goblins carried Joan Millward's flour to Mudwall Stockade, west of Millhaven and north of the Hill Road. Empty the stockade: put down every goblin in it, and their chief.",
      "Up close the wall is pale, and hard as a crust. Pick up five of Joan Millward's sacks from round the outside of it.",
      "Take the sacks back to Joan Millward on the green at Millhaven.",
    ],
    progress: [
      "West, north of the road. All of them, and the big one.",
      "Five sacks, by the mark. Then home with them.",
    ],
    done: [
      "Five. Shake them out... no. Don't. What's that on your sleeve? It's set hard. ...Paste. They've daubed the whole wall with it. My fine white, and pond water. Mudwall. I thought it was a name. It's a receipt.",
      "Best wall on the downs, and it's made of bread. I'd laugh, if it weren't eleven sacks. Here. And if anyone asks what became of Millward's flour this year, tell them it's standing. Which is more than can be said for the mill.",
    ],
    after: [
      "It rained on Mudwall. The wall's risen. I'm not making that up.",
    ],
    others: {
      abel: ["Mudwall? It's on my land. I'd have said something, but there were thirty of them and one of me, and I've a bad back."],
    },
  },

  barley_rows: {
    title: 'The Barley Rows',
    giver: 'abel',
    about: "Abel Fenwick has forty acres of barley ripe south of Millhaven, and can't set foot in it: scarecrows stand all down the rows, and he put up only one. They turn to watch a man walk the headland. Empty the Barley Rows, three hundred and fifty paces south of the green: every one that moves, and the wicker one they stand round.",
    offer: [
      "I've one scarecrow. I made him myself: my father's hat, a turnip, one arm, because I ran out of pole. He's stood in the south barley nine years and never frightened a crow.",
      "Now there's a rowful. Dozens, stood down the rows where a reaper would walk, and a big wicker one in the middle. I never made them. Hale's not here to have made them. They turn and watch me along the headland. I can't cut barley that's being stood guard over. Empty it.",
    ],
    accept: "I'll empty the rows.",
    acceptLine: "South off the green, three hundred and fifty paces; there's a trodden way. They stand still till you're in among them. Mind the big one: it spins fire. In my barley. Ripe. If the field goes up, I'd as soon you didn't come back and tell me.",
    decline: 'Not yet.',
    declineLine: "Another fortnight and it sheds. Take your time. Everyone else has.",
    journal: [
      "Scarecrows that Abel Fenwick never made stand guard over his ripe barley in the Barley Rows, south of Millhaven. Empty the rows: put down every one of them, and the wicker man in their middle.",
      "Go back to Abel Fenwick on the green at Millhaven.",
    ],
    progress: [
      "South. All of them. And not a spark more than you need.",
    ],
    done: [
      "All down? And mine? Old hat, one arm, a turnip for a face? ...Not among them. Then he's still stood where I put him, doing his job. He's the only thing on this farm that ever has.",
      "Take this. It was the pole holding up the big one. Ash, and straight, and better than any I own, and I'll not have it in my field. Now I've forty acres I can get at, and nobody to cut it. Which brings me to the knoll.",
    ],
    after: [
      "I cut two acres yesterday. My back's gone. But I cut them, with the old fellow in the hat looking on. He never said a word against it.",
    ],
    others: {
      joan: ["Abel's barley's clear? Then there'll be grist, if there's hands to cut it. There's a ploughman up the knoll he might ask. He'll not like asking."],
      hale: ["The south barley? I sowed half of that, the spring before I left. Abel broadcasts like a man feeding hens. Tell him it wants cutting from the bank end."],
    },
  },

  not_for_the_barley: {
    title: 'The Millhaven Man',
    giver: 'abel',
    needs: 'barley_rows',
    about: "Two springs back Abel Fenwick's neighbour, Hale Orrowick, left his plough in the furrow and went up the knoll, where he stands yet, in iron. Abel has cut his barley for him twice and wants to know if he's to cut a third; and why the dead walk wide of that hill and straight through his field. Ask Hale, then the old knight he serves. North-east, ten minutes. It's paid there.",
    offer: [
      "My neighbour. Hale Orrowick, that had the low field. Left his plough stood in the furrow two springs back and went up the knoll. He's up there yet, in iron, stood like a post.",
      "I've cut his barley two years with my own. Am I to cut a third, with my back? Go up and ask him. And ask the old one in white a thing for me. The dead go wide round his knoll; you can see the path they've worn. They come straight through my barley. What's he got that I haven't?",
    ],
    accept: "I'll ask them both.",
    acceptLine: "East along the road and up the knoll path: ten minutes. You can see where you're going from the green. Hale's the one who isn't old. Ask him first. Then the other, by the door. Don't say I sent my regards. I didn't.",
    decline: 'Not now.',
    declineLine: "Then I cut it. I'll moan. I'd moan anyway.",
    journal: [
      "Abel Fenwick wants to know if his neighbour Hale Orrowick is ever coming home to Millhaven. He stands before the Bell Tower of the Four Watches, on the knoll north-east of Millhaven: the younger of the two in plate. Ask him.",
      "Hale won't answer for the hill. Ask the other, the Bellwright, by the tower's door, why the dead walk wide of it.",
    ],
    progress: [
      "The knoll. North-east. The one in iron who isn't old; then the one who is.",
    ],
    done: [
      "Why the dead walk wide of my hill? Because my hill has the tenor bell on it, hung and whole. They remember it, even silent. Abel Fenwick has barley. Nobody was ever kept in his bed by barley.",
      "And he wants my ploughman back. He can't have him. ...Don't tell the ploughman I said that. Now. Since the seal woke for you, and you've hands: there is work on this hill.",
    ],
    after: [
      "Not coming. Sworn, to an hour of the night. Well. Orrowicks were always particular. I've ploughed the low field myself. It's the straightest furrow on the downs, and I can't match it. I'm quite put out.",
    ],
    others: {
      hale: [
        "Abel. He'd send the king if he could, to ask about that barley. Tell him no. I'm sworn, and it isn't the sort you plough round.",
        "Tell him the low field's his till I'm back, and that he burns too green. The other thing's not mine to answer. Ask Ser Anselm. He'll pretend he hasn't been listening.",
      ],
      bellwright: [
        "Why the dead walk wide of my hill? Because my hill has the tenor bell on it, hung and whole. They remember it, even silent. Abel Fenwick has barley. Nobody was ever kept in his bed by barley.",
        "And he wants my ploughman back. He can't have him. ...Don't tell the ploughman I said that. Here: you climbed a knoll to carry a farmer's grumble, and that should be paid. Now. Since the seal woke for you, and you've hands: there is work on this hill.",
      ],
      bess: ["Hale Orrowick? He danced with me at Abel's wedding. Trod on both feet. And now he's a knight? Mind his feet."],
    },
  },

  bran_for_dunmow: {
    title: 'Bran for Dunmow',
    giver: 'joan',
    needs: 'barley_rows',
    about: "Rafe Dunmow, the shepherd at Dunmow Fold, takes forty stone of bran off Joan Millward every autumn for his ewes, and fetches it himself. This year he hasn't come and hasn't sent. Four goblins lie up beside the Hill Road west of Millhaven, and nothing she sends that way arrives: put down three, then find Rafe at the fold, south over the down. A quarter of an hour and more. It's paid there.",
    offer: [
      "Now Abel's barley can be cut, there'll be grist, and I'll have the stones turning by Michaelmas. So I'm chasing what I'm owed. Rafe Dunmow, at the fold. Forty stone of bran every autumn, for his ewes. He fetches it himself, on a hand-sledge, and pays in wool.",
      "Not come. Not sent. And Rafe's not missed in thirty years. There's goblins by the west road: four, in iron caps. Nothing I've sent that way has got there. They tip the meal out and take the sacking. Go through them, and ask Rafe what's amiss.",
    ],
    accept: "I'll go to the fold.",
    acceptLine: "West along the road, six hundred paces, past the farm: they're in the dip on the south side, just past where the Abbey Road leaves. Three down, and the last will run. Then south over the down by the path, to a cairn as tall as a house. That's Dunmow. He'll be by the gate.",
    decline: 'Not now.',
    declineLine: "Then the bran sits, and goes to weevil. Suit yourself.",
    journal: [
      "Joan Millward's bran never reaches Dunmow Fold. Four goblins lie up beside the Hill Road, west of Millhaven past the farm, on its south side: put down three of them.",
      "Go on south over the down to Dunmow Fold, under its great cairn, and tell Rafe Dunmow his bran's weighed and waiting.",
    ],
    progress: [
      "West, the dip south of the road. Then south to the cairn. Rafe Dunmow.",
    ],
    done: [
      "Joan Millward's bran. Forty stone, and she'll have weighed it true. Tell her... no. You'll not be going back that way. I've no ewes to feed it to. That's why I've not come. I couldn't think how to say it.",
      "You came by the dip? Then you've met the ones in her sacks. Three? That'll hold. Sit, if you've the legs for more. I've shepherd's work, with the sheep left out.",
    ],
    after: [
      "No ewes? Not one? ...Then I'll hold his bran till he has. It keeps a year, dry. I'll not sell Rafe Dunmow's bran to anybody else.",
    ],
    others: {
      rafe: [
        "Joan Millward's bran. Forty stone, and she'll have weighed it true. Tell her... no. You'll not be going back that way. I've no ewes to feed it to. That's why I've not come. I couldn't think how to say it.",
        "You came by the dip? Then you've met the ones in her sacks. Three? That'll hold. Here: that's for the carrying. And sit, if you've the legs for more. I've shepherd's work, with the sheep left out.",
      ],
      abel: ["Rafe Dunmow's not been for his bran? Then something's wrong at the fold. Rafe'd crawl for bran. I say that as a man who's watched him haggle."],
    },
  },

  // ================================================================ the Bell Tower of the Four Watches (Ser Anselm Toller,
  // the Bellwright; Ser Hale Orrowick). Tessariel's: nothing here names the other power, or anything of his.
  four_ropes: {
    title: 'Four Ropes',
    giver: 'bellwright',
    about: "When the ringing was forbidden, forty years ago, the Bellwright took down the tower's four bell ropes and hung them on pegs inside the door. In spring the pegs were bare. Goblins have lashed every picket of Bramble Stockade with good hemp: two hundred paces west of the tower. Empty it, chief and all, and see what's become of his ropes.",
    offer: [
      "When the ringing was forbidden I took the four ropes down. Treble, second, third, tenor. Coiled them, tallowed them, hung them on four pegs inside the door. Forty years. I have looked at them every day. In spring the pegs were bare.",
      "West, two hundred paces: a stockade of thorn, new this year. Goblins. Every picket is lashed with good hemp, three-strand, with a woollen sally worked in. I know my own ropes. I am not to ring. I was never told I was not to mind. Empty it.",
    ],
    accept: "I'll empty the stockade.",
    acceptLine: "West, down the knoll; there is a trodden way through the bracken. The chief is the big one in the iron. He throws knives, a fan of them, and stamps. Do not trouble to bring the ropes. They are cut already. I only want to know.",
    decline: 'Not yet.',
    declineLine: "Forty years they hung. They can lash a fence a little longer.",
    journal: [
      "Goblins have lashed Bramble Stockade, two hundred paces west of the Bell Tower, with the tower's four bell ropes. Empty the stockade: put down every goblin in it, and their chief.",
      "Go back to the Bellwright at the Tower of the Four Watches and tell him what's become of his ropes.",
    ],
    progress: [
      "West. All of them. And look what they have done with the long one. The tenor's.",
    ],
    done: [
      "Cut to lengths, for lashings. Three of them. I had thought as much. And the fourth? The long one?",
      "Hung from a thorn tree, with a kettle tied to the end. And they pulled it. ...Of course they did. Anyone would. I have wanted to for forty years, and it took a goblin to do it. Here. Say nothing of this to the ploughman.",
    ],
    after: [
      "I went down and took the kettle off the thorn. I left the rope. If something pulls it now, nothing will sound, and nobody can say I rang.",
    ],
    others: {
      hale: ["His ropes? He's been to look at four bare pegs every dawn since spring. I pretend not to see. It's most of what I do here."],
    },
  },

  a_right_pauldron: {
    title: 'A Right Pauldron',
    giver: 'hale',
    about: "Ser Hale Orrowick's harness is pieced from what fallen claimants left on the downs, and his left pauldron is off a bigger man. Claimants go down to Brightwater Falls to wash and to kneel, and the great crabs there take them. Bring Hale five pieces of what the crabs have left on the pool's west bank: south of the tower, four hundred and fifty paces as the crow goes.",
    offer: [
      "You'll have seen the left pauldron. It swings. It's off a bigger man. I've packed it with fleece, and it still swings. What I want is a right one that fits, and then I'd move the right across. I've thought about it a good deal. I've the time.",
      "The singing ones go down to the falls to wash, and to kneel where the water is. And there are crabs at the falls the size of a cart. What the crabs don't want is on the shore. I'm sworn to the hill; I can't go and pick it over. Five pieces. Whatever's lying.",
    ],
    accept: "Five pieces. I'll look.",
    acceptLine: "Down the knoll path and on south; you'll hear the water. Keep to the west bank. The crabs come at you from two sides at once, so don't watch one. And there's something in the pool, the colour of the sky, that wasn't there last year. I'd leave it be.",
    decline: 'Not now.',
    declineLine: "Then it swings. I've stood two years lopsided. I can stand a third.",
    journal: [
      "Ser Hale Orrowick wants harness that fits. Pick up five pieces of plate from the west bank of the pool at Brightwater Falls, south of the Bell Tower, where the great crabs have left them.",
      "Take the pieces back to Ser Hale Orrowick at the Bell Tower.",
    ],
    progress: [
      "The falls. West bank. Five of whatever's lying. I'm not particular. I can't afford to be.",
    ],
    done: [
      "Lay them out. A greave: left. Gauntlet: left. Pauldron: left. Pauldron: ...left. And another left greave. Two years I've wondered why the one side of me is so well found.",
      "They take a man from the right, then. Every time. A ploughman would have noticed sooner, if it were foxes. Here. I'll keep the pauldrons. One of them's only a little too big, and I've fleece.",
    ],
    after: [
      "I've the new left on. It swings less. Ser Anselm looked at it a long while and said 'better'. It's the most he's said about my harness in two years.",
    ],
    others: {
      bellwright: ["He has sent you to the falls for plate? Good. I have listened to that pauldron knock through every watch for two years. It is a quarter-beat behind my count."],
    },
  },

  two_of_three: {
    title: 'Two of the Three',
    giver: 'hale',
    about: "A black drake has the cliff-top above Brightwater Falls, south-east of the Bell Tower, with two goblins who feed it, or whom it feeds. Ser Hale Orrowick is sworn to the hill and can't go. He doesn't ask for all three: two, and he doesn't mind which. Three hundred and fifty paces south-east, and up the scarp.",
    offer: [
      "South-east, on top of the cliff over the falls, there's a drake. Black, the length of a plough-team. And two goblins with it. They bring it things. Or it brings them things. I've watched a fortnight and I can't tell who keeps whom.",
      "It's not on the hill, so it's not mine to fight, and Ser Anselm says a watch that leaves its post isn't one. He's right. I'd still sooner it weren't there. Two of the three would do. I don't mind which two. A drake with nobody to feed it moves on. Goblins with no drake go home.",
    ],
    accept: "Two of the three.",
    acceptLine: "South-east, three hundred and fifty paces, and up the scarp: it's steep, and it goes. The drake breathes a long way, in a line. Stand to one side of where it's looking. The goblins are only goblins.",
    decline: 'Not that.',
    declineLine: "No. It's a great deal to ask, for somebody else's oath.",
    journal: [
      "A black drake and two goblins hold the cliff-top above Brightwater Falls, south-east of the Bell Tower and up the scarp. Put down two of the three.",
      "Go back to Ser Hale Orrowick at the Bell Tower.",
    ],
    progress: [
      "South-east, up on the cliff. Two of the three. Any two.",
    ],
    done: [
      "Two of the three. Which two? ...No. Don't tell me. I said I didn't mind, and a man ought to be held to that.",
      "A farmer knows you needn't get every rat in the barn. You get enough that the rest think the barn's unlucky. Here. And say nothing to Ser Anselm. He'll know; he always does. But it's civil not to say.",
    ],
    after: [
      "The cliff-top's bare. What was left went east. I watched it go, at the fifth watch. It never looked back at the hill, and I was a little hurt.",
    ],
    others: {
      bellwright: ["The drake? I know what he has asked you. I have not heard it. A watch does not leave its post. A watch may have friends who are under no oath at all."],
    },
  },

  what_answers: {
    title: 'What Answers',
    giver: 'bellwright',
    dayHint: "By day the Horned Stones are only stones. What answers the Bellwright keeps night hours: come back after dark.",
    about: "At the third watch of the night the Bellwright counts, with nothing to ring; and since Lammas something east of the tower has answered him, once, stone on stone. Go by night to the Horned Stones, east-north-east of the tower and up the scarp, and see what keeps the third watch with him. Then empty the ring: every one of them, and the great ram. Three hundred and fifty paces.",
    offer: [
      "At the third watch I count. One. That is all there is to it, with nothing to ring. For forty years nothing has answered, and I had grown used to that. Since Lammas, something answers.",
      "East, up the scarp: a ring of stones with horns cut on them. At the third watch, a knock. Once. Stone on stone, or something as hard. Go there by night and see what keeps my watch with me. Then, if it is what I think, empty the ring. I will not be answered by that.",
    ],
    accept: "By night, then. I'll go.",
    acceptLine: "East-north-east, three hundred and fifty paces, and up the scarp: it is steep, and it goes. Go after dark; by day they only stand. The rams come head down, in a line. The great one shakes the ground. Do not stand where he has stamped.",
    decline: 'Not yet.',
    declineLine: "No. Then I count alone tonight, and am answered. I have borne worse.",
    journal: [
      "Something answers the Bellwright's count at the third watch. Go by night to the Horned Stones, east-north-east of the Bell Tower and up the scarp, near enough to see what keeps the watch there.",
      "Goat men, in a ring of standing stones; and the great ram among them puts his horns to the tallest stone, once. Empty the Horned Stones: put down every one of them, and the great ram.",
      "Go back to the Bellwright at the Tower of the Four Watches and tell him what answered.",
    ],
    progress: [
      "East, up the scarp, after dark. See it first. I would like to know what I have been keeping time with.",
      "All of them. And the one that knocks.",
    ],
    done: [
      "A ram. On the tall stone, with his horns. Once, at the third watch. ...Do you know why the third? No. Nor do I. Nor, I think, did he. Sit down. No, sit. I need a moment, and I'd rather you didn't watch.",
      "Here. The order gave these to wardens who had to cross the ice. A bell no bigger than your thumb. Ring it in the air and the air rings back, and holds you one step more. It's yours. I'm too old to jump, and tonight I shall count alone and be glad of it.",
    ],
    after: [
      "I rang the treble yesterday. Once. Very small. Nobody came to hang me. I'll do it again in a year or so.",
    ],
    others: {
      hale: ["The knock at the third? I've heard it from my post. I said nothing. He went so still, the first night, I thought he'd died standing. Then he said 'one', very quietly, and I knew he'd heard it too."],
    },
  },

  block_for_the_frame: {
    title: 'A Block for the Frame',
    giver: 'bellwright',
    needs: 'what_answers',
    about: "One of the four stones under the tenor's frame has cracked, and the Bellwright won't have a hung bell sit on a cracked stone, rung or not. The stone-carters halt north-west of the tower, by a great block that never got where it was going. Ask for Jem Sledge, and whether a yard of good stone can come up the knoll. Four hundred paces. It's paid there.",
    offer: [
      "The tenor sits in an oak frame, and the frame on four stones. One has cracked. Frost; or forty years of nothing happening to it. A bell that is never rung should at least be held up properly.",
      "The stone-carters halt north-west, four hundred paces, by a great block that has not moved in my time. Ask for a man called Sledge. His father brought me my last stone. Ask whether a yard of good freestone can come up my knoll. Tell him I pay on the nail, and in silence.",
    ],
    accept: "I'll ask the carter.",
    acceptLine: "North-west, down off the knoll, short of the Abbey Road. You will see the block before the camp: squared, grey, the height of a man. He will tell you the knoll is too steep for a sledge. His father said the same, and came up it.",
    decline: 'Not now.',
    declineLine: "Then I wedge it with oak, and listen to it creak. Go on.",
    journal: [
      "The Bellwright wants a yard of good stone for the tenor's frame. Find Jem Sledge at Stonecarters' Halt, north-west of the Bell Tower beside the Abbey Road, and ask whether it can come up the knoll.",
    ],
    progress: [
      "North-west. The block on its sledge. A man called Sledge.",
    ],
    done: [
      "A yard of freestone, up the knoll? For the old one in white? My father took the last up there with six oxen, and swore the whole way. ...Tell him yes. No: I'll take it, and tell him myself. He pays on the nail and never says a word, and I've come to value that.",
      "And you came over the down on foot, so you can look after yourself. Stop a while. There's a thing or two wrong at this Halt, and none of it's stone.",
    ],
    after: [
      "The stone came up. Six oxen, and a man swearing. I stood at the door and listened. It was his father's voice exactly.",
    ],
    others: {
      jem: [
        "A yard of freestone, up the knoll? For the old one in white? My father took the last up there with six oxen, and swore the whole way. ...Tell him yes. No: I'll take it, and tell him myself. He pays on the nail and never says a word, and I've come to value that.",
        "That's for the asking. And you came over the down on foot, so you can look after yourself. Stop a while. There's a thing or two wrong at this Halt, and none of it's stone.",
      ],
      hale: ["A stone for the frame? I offered to fetch one up on my back. He looked at me, and then at the knoll, and then at me, and said nothing. It was a long nothing."],
    },
  },

  // ================================================================ Dunmow Fold (Rafe Dunmow; Madge Wattle)
  plucked: {
    title: 'Plucked',
    giver: 'rafe',
    about: "Harpies roost on the Screaming Crag, east of Dunmow Fold. Before the flock went they would come down on a ewe, two to hold her and a third to pluck, and let her up bare. Rafe Dunmow wants to see the wool: five tufts from under the Crag, three blown well out and two close in under the nests. Three hundred paces east.",
    offer: [
      "They don't take lambs. I'd understand lambs. They come down on a ewe, two of them, and hold her, and a third plucks. Then they let her up, bare as an egg, in March. I lost eleven to the cold that way, before ever the rest went.",
      "East, three hundred paces: the Crag. They line their nests with it, and what blows out lies about. Fetch me five tufts. Three are blown well out; two are close in under the nests, and for those they'll come down. I want to see the tar. Mine are tarred on the near hip.",
    ],
    accept: "Five tufts.",
    acceptLine: "East, by the trodden way. You'll hear the Crag before you see it. Keep wide for the first three. For the others, be quick: they stoop from behind, and the big one brings the wind with her.",
    decline: 'Not now.',
    declineLine: "No. It's only wool. It's only what I had.",
    journal: [
      "Harpies on the Screaming Crag, east of Dunmow Fold, line their nests with wool plucked from living sheep. Pick up five tufts from under the Crag: three lie well out, two close in under the nests.",
      "Take the wool back to Rafe Dunmow at Dunmow Fold.",
    ],
    progress: [
      "East. Five tufts. I'll know my own by the tar, and by the feel.",
    ],
    done: [
      "Tar on this one. And this. Mine: that's Dunmow staple, I'd know it in the dark. This one's not. This is Thornwick wool, by the crimp. So they've been down that far.",
      "And this. This is off no sheep. This is hair. Long, and fair, and plucked out the same way. ...Put that one on the fire. Not the others. Here, for the fetching. I'll want that roost down, when I can bear to think about it.",
    ],
    after: [
      "I've the four tufts in my pocket. It's the most wool I've had about me since shearing. A man gets used to the smell, and misses it.",
    ],
    others: {
      madge: ["Plucked? I saw one of his ewes after. Stood in the fold pink as a pig, looking ashamed. Sheep don't know much, but they know when they've been made a fool of."],
    },
  },

  six_bar_hurdles: {
    title: 'Six-Bar Hurdles',
    giver: 'madge',
    about: "Two goblins by the Gallows Road, west of Dunmow Fold, have carried off Madge Wattle's new hurdles one at a time. She wants one of the two put down, so the other learns a hurdle is somebody's; and four hurdles back: three lie out in the grass, one close in where the goblins sit. Two hundred paces west.",
    offer: [
      "A hurdle's six bars, two heads, two braces, and a morning's work. I brought forty up at shearing. I've thirty-one. There's two goblins by the big road, west, two hundred paces, and every few nights they come and take one. Just one. They carry it between them like a bier.",
      "I went to look. They've stood them up in a ring, and they sit in the middle of it. Both of them. All day. I think somebody told them a fold's where you put what you want kept. Put one of the two down, so the other knows a hurdle's somebody's. And fetch me four back.",
    ],
    accept: "One goblin, and four hurdles.",
    acceptLine: "West, two hundred paces, this side of the road. Three have blown down and lie out in the grass. One's close in, where they sit. A hurdle's light. Carry it on your back, points up. Everyone tries it under the arm first.",
    decline: 'Not now.',
    declineLine: "Thirty by Friday, then. I can count as well as Rafe.",
    journal: [
      "Two goblins by the Gallows Road, west of Dunmow Fold, have made off with Madge Wattle's hurdles. Put down one of the two, so the other learns whose they are.",
      "Pick up four of the hurdles: three lie out in the grass, one close in where the goblins sat.",
      "Take the hurdles back to Madge Wattle at Dunmow Fold.",
    ],
    progress: [
      "West, by the road. One of the two. Either. I'm not particular which learns and which teaches.",
      "Four hurdles. Points up.",
    ],
    done: [
      "Four. Stand them there. ...They've been at the heads. Not chewed: carved. Look. A face on each, both ends. Little faces, with the tongues out. On my hurdles.",
      "Well, I'll not plane them off. A ewe won't mind, and it's more work than I'd have put in. Here. That's the price of two hurdles, which is what a morning's worth.",
    ],
    after: [
      "The one you left came back for another. On its own. It couldn't lift it. It sat down beside it and looked at me. I carried the other end as far as the gate. Don't tell Rafe.",
    ],
    others: {
      rafe: ["Madge's hurdles? I've nothing to fold in them. She makes two a day regardless. I think if she stopped, she'd have to look at the empty ones."],
    },
  },

  yan_tan_tethera: {
    title: 'Yan, Tan, Tethera',
    giver: 'rafe',
    about: "North of Dunmow Fold is Bleatmoot, a ring of stones with horns cut on them, where the goat men meet. Every night since shearing one of them has stood up on a stone while the rest file past him, and he counts them: in scores, the way a shepherd does. Rafe Dunmow won't be neighbour to that. Empty Bleatmoot, every one, and the one who counts. Two hundred and fifty paces north.",
    offer: [
      "North, two hundred and fifty paces, there's a ring of stones with horns cut on them. Bleatmoot. The goat men meet there. Since shearing, every night, one gets up on a stone and the rest go by him in a line, and he nods at each.",
      "He's counting them. I know a count when I see one. He does it in scores, and puts a pebble down for each score, the way I do. So they've a shepherd. I've sat here a month wondering who taught him, and I've come to an answer I don't like. Empty it. Him above all.",
    ],
    accept: "I'll empty Bleatmoot.",
    acceptLine: "North, by the trodden way. The rams come at you head down, in a straight line: step off the line. The one who counts is the biggest. When he stamps, the ground shakes. Keep moving.",
    decline: 'Not yet.',
    declineLine: "No. Well. He'll count them again tonight, and I'll lie here and count along. I can't help it.",
    journal: [
      "Goat men meet at Bleatmoot, a ring of horned stones north of Dunmow Fold, and one of them counts the rest like a flock. Empty Bleatmoot: put down every one of them, and the one who counts.",
      "Go back to Rafe Dunmow at Dunmow Fold.",
    ],
    progress: [
      "North. All of them. I'll know it's done when there's nobody to count along with.",
    ],
    done: [
      "All of them. And the one on the stone? ...Had he a crook? Hazel, with a ram's-horn head, and a nick near the ferrule? ...No. No. Mine's here in my hand. I only wondered where he'd seen one used.",
      "Bleatmoot. There's been a moot on that hill since before there were Dunmows. We always took it the name was for the sheep. Here. I'd give you a fleece, if this were any other year.",
    ],
    after: [
      "Quiet, north. I counted to a score last night, out of habit, and there was nobody counting against me. I slept after. First time since shearing.",
    ],
    others: {
      madge: ["He lies awake counting along with it. Yan, tan, tethera, under his breath, in time with a goat. I put my fingers in my ears, and I can still see his lips going."],
    },
  },

  the_screaming_crag: {
    title: 'The Screaming Crag',
    giver: 'rafe',
    needs: 'plucked',
    about: "The harpies of the Screaming Crag pluck living things for their nests, and not only sheep. Rafe Dunmow wants the roost down: every harpy on it, and the queen who brings the wind. East of Dunmow Fold, three hundred paces.",
    offer: [
      "I've had that hair in my head since you brought it. There's a tinker comes by at Lammas with a wife as bald as a stone. I'd thought it was a fever. I'll not ask her now.",
      "The Crag, east. All of them, and the big one they call the wind down for. A flock comes back, sometimes. They stray, they're stolen, they're found. Nothing's coming back to a fold with that hung over it. I'd not, if I were a sheep.",
    ],
    accept: "I'll bring the roost down.",
    acceptLine: "East, three hundred paces, the way you went for the wool. They stoop from behind, so keep turning. The queen sends a wind round and round that cuts: get outside it, or right in under her. Don't stand in the middle distance. That's where a ewe stands.",
    decline: 'Not yet.',
    declineLine: "No. It's a climb, and it's got claws. I've waited this long.",
    journal: [
      "Empty the Screaming Crag, east of Dunmow Fold: put down every harpy on it, and their queen.",
      "Go back to Rafe Dunmow at Dunmow Fold.",
    ],
    progress: [
      "East. Every one. And her.",
    ],
    done: [
      "Hush. ...Hear that? No. Nor me. That's the first time in two years I've stood here and heard the grass.",
      "Take this. It's the last of last year's clip, spun and wove at Thornwick. I was keeping it to be buried in. I've changed my mind about how soon. And there's a thing I'd ask at Thornwick, if you're going on.",
    ],
    after: [
      "I walked under the Crag. The nests are down, and wool in every one. I've gathered it. It'll card. It's not much. It's a start, and I'd forgotten what one felt like.",
    ],
    others: {
      madge: ["The Crag? Good. I've slept with a hurdle over my head since I came. I'd got used to it. I suppose I'll have to get used to the sky."],
    },
  },

  strays: {
    title: 'Strays',
    giver: 'rafe',
    needs: 'the_screaming_crag',
    about: "A flock that strays south off Dunmow fetches up against Thornwick's hedge, and Thornwick's hedge-reeve, Osric Thorne, pounds what comes through it. Rafe Dunmow hasn't dared ask. Two goat men stand off the Gallows Road on the way and turn back whatever comes along it: put one down, then ask Osric. South-east, the better part of half an hour. It's paid there.",
    offer: [
      "Sheep that stray off this down go south. Always have; it's the lie of the land. And south, the first thing that stops a sheep is Thornwick's hedge. Osric Thorne's the reeve. What comes through his hedge, he pounds.",
      "I've not asked. A month. While I've not asked, there might be three hundred and forty ewes in Thornwick pound. Go and ask for me. And there's two goat men stood by the Gallows Road on the way: a white and a pied. One down, and a flock could be driven home past the other.",
    ],
    accept: "I'll ask at Thornwick.",
    acceptLine: "The Gallows Road, south-east: the better part of half an hour. The goat men are a little past halfway, off the road on the west side. Then on, till you see a hedge as high as a house. Osric's the one walking along it, looking for gaps.",
    decline: 'Not now.',
    declineLine: "No. Then I'll go on not knowing. It's a kind of having them.",
    journal: [
      "Rafe Dunmow wants word from Thornwick. Two goat men stand off the Gallows Road on the way, a little past halfway, on its west side: put down one of them.",
      "Go on along the Gallows Road to Thornwick, and ask Osric Thorne, the hedge-reeve, whether tar-marked ewes came through his hedge.",
    ],
    progress: [
      "South-east, the Gallows Road. One of the goat men. Then Thornwick, and the reeve.",
    ],
    done: [
      "Tar on the near hip? Dunmow's. I thought so. Two hundred and six. They came through my hedge in the night at shearing-time and left a gap you could drive a wain through. I've not forgiven it.",
      "They're in the pound. They've eaten the pound. Tell Rafe... no. I'll send the boy. He can fetch them himself, and mend my gap while he's about it. Now, since you're here and upright: I've a hedge.",
    ],
    after: [
      "Two hundred and six. I'd made my peace with none. Now I've to make it with a hundred and thirty-four gone, which is harder. But I've stones to put on the cairn, and a reason to.",
    ],
    others: {
      osric: [
        "Tar on the near hip? Dunmow's. I thought so. Two hundred and six. They came through my hedge in the night at shearing-time and left a gap you could drive a wain through. I've not forgiven it.",
        "They're in the pound. They've eaten the pound. Tell Rafe... no. I'll send the boy. He can fetch them himself, and mend my gap while he's about it. That's for the walking, and for the goat. Now, since you're here and upright: I've a hedge.",
      ],
      madge: ["Thornwick pound? I'd not thought of the pound. If they're there, he'll want every hurdle I've made, and I'll not let him forget who went on making them."],
    },
  },

  // ================================================================ Kestrel Hide (Sib Kestrel; Joss Kestrel)
  bird_calls: {
    title: 'Borrowed Voices',
    giver: 'sib',
    about: "Sib Kestrel's bird-calls went off the game pole in the night. South of the hide, hooded folk stand among crooked stones and whistle, and the birds come down to them and don't go up again. Bring back five of her calls from round the Crooked Circle: three lie well out, two close in among the stones. Two hundred and fifty paces south.",
    offer: [
      "A fowler's calls. Quail-pipe, plover whistle, a wigeon call I had from my mother. Bone and elder, most of them. They hung on the game pole, in a bag. Nine days back the bag was there and the calls weren't.",
      "South, two hundred and fifty paces, there are stones set crooked, and people in hoods who stand among them and whistle. With my whistles. The birds come down to them. I've not seen one go up. Fetch me five back. Three they've dropped, well out. Two are in among the stones.",
    ],
    accept: "Five calls.",
    acceptLine: "South, by the trodden way. Keep wide for the three in the grass. For the others they'll see you: they throw something you don't see till it lands, and the one in the middle drops stones out of a clear sky. Don't blow any of them. Not even to see.",
    decline: 'Not now.',
    declineLine: "Then I'll go on standing under an empty sky. Go soft.",
    journal: [
      "Hooded folk at the Crooked Circle, south of Kestrel Hide, whistle the birds down with Sib Kestrel's calls. Pick up five of the calls: three lie well out from the stones, two close in among them.",
      "Take the calls back to Sib Kestrel at Kestrel Hide.",
    ],
    progress: [
      "South. Five. They're no bigger than your finger. Look for the thong.",
    ],
    done: [
      "Give them here. Quail. Plover. That's the wigeon; those are my mother's teeth-marks. Curlew. And this. ...This isn't mine. I never cut this. Bone, with no stop in it, and the hole's on the wrong side.",
      "What does it call? No. Don't. I thought of it too, just then; I had it halfway up. It goes in the fire. ...It doesn't burn. Well. Then it goes in the ground, under the ribs, and nobody blows it. Here. And I'll want that Circle empty.",
    ],
    after: [
      "I blew the plover whistle at dusk. Nothing came. But something answered, a long way off, east. An honest answer. A bird's.",
    ],
    others: {
      joss: ["Her calls? She's not said ten words since they went, and Sib could talk a teal out of the sky. It was like losing her tongue. Get them back."],
    },
  },

  off_the_spit: {
    title: 'Off the Spit',
    giver: 'joss',
    about: "Wolfkin from the Gnawed Hollow walked upright into Kestrel Hide by night, took the hare off Joss Kestrel's spit, and looked at him. They have hunted his ground bare since. He wants two of them to stop looking: at the Hollow, two hundred and fifty paces north of the hide.",
    offer: [
      "A fortnight back I'd a hare on the spit. Last I took. Two of them walked in out of the dark. Upright. On their hind legs, like men who've been ill. One lifted the hare off, spit and all. The other looked at me.",
      "Just looked. The way I'd look at a snare I meant to come back to. They've a hollow north, two hundred and fifty paces, and they've hunted this down to the bone since. I can't take the big one. I'd like two of the others to stop looking. That's all.",
    ],
    accept: "Two of them.",
    acceptLine: "North, by the trodden way, to where the ground dips. They're fast. Faster than you'll think, and they come from the side you're not watching. The big one's the colour of a cut. If he gets up, don't stay for him. He's Sib's to ask about, not mine.",
    decline: 'Not now.',
    declineLine: "No. Then it's salt meat. Again.",
    journal: [
      "Wolfkin from the Gnawed Hollow, north of Kestrel Hide, walked into the camp and robbed Joss Kestrel's spit. Put down two of them at the Hollow.",
      "Go back to Joss Kestrel at Kestrel Hide.",
    ],
    progress: [
      "North. Two. I'm not greedy.",
    ],
    done: [
      "Two? Did they look at you? ...They did. I knew it. It's not hunger, that look. I've seen hunger. I've had it. It's more like counting.",
      "Here. I went to the edge of the Hollow once, after. My spit's in there. Stuck upright in the ground, scoured clean. They ate the hare raw and kept the spit. I don't know what to do with knowing that.",
    ],
    after: [
      "Snared a hare this morning. First in a fortnight. I've not put it on the fire yet. I keep looking at the dark.",
    ],
    others: {
      sib: ["Joss and his hare. He'll tell it to anyone. He doesn't tell that he sat with the bow across his knees and never lifted it. I'd not have either."],
    },
  },

  the_crooked_circle: {
    title: 'The Crooked Circle',
    giver: 'sib',
    needs: 'bird_calls',
    about: "The hooded folk of the Crooked Circle whistle the birds down out of the sky south of Kestrel Hide, and none go up again. Sib Kestrel has her calls back, and they have others. She wants the whistling stopped. Empty the Circle: every one of them, and the seer in the middle. Two hundred and fifty paces south.",
    offer: [
      "You've brought my calls home, and they've others. I heard one at dusk: thin, with no stop in it. The sky over the stones went dark with wings, and then it didn't. Nothing came out the far side.",
      "I take birds. I'll not pretend I don't. But I take a brace and leave the covey, and I look at what I take. Whatever that is, it's emptied nine days of sky, and it's not even eating. Go back to the Circle. All of them. The one in the middle most.",
    ],
    accept: "I'll empty the Circle.",
    acceptLine: "South, the way you went. They stand apart, so you can't have two at once; that's the cunning of it. Go for the one in the middle first, if you can reach her. When she lifts her arms, the ground splits. Be somewhere else.",
    decline: 'Not yet.',
    declineLine: "No. Well. I'll stop my ears at dusk.",
    journal: [
      "Empty the Crooked Circle, south of Kestrel Hide: put down every one of the hooded folk, and the seer among the stones.",
      "Go back to Sib Kestrel at Kestrel Hide.",
    ],
    progress: [
      "South. All of them. I'm listening for it to stop.",
    ],
    done: [
      "Shh. ...There. Hear it? High up. No, you've not the ear. A lark. One. It's the first thing I've heard over this hide in nine days that had a throat.",
      "Here. That's yours. I'll go down tomorrow and look inside the stones. I know what I'll find. Feathers, deep as a bed, and no bones. I've dreamed it nine nights. Leave it. There's a worse neighbour north.",
    ],
    after: [
      "Feathers, deep as a bed. No bones. I said so. A covey of partridge went over this morning, and I let them. I'll take birds again next week. Not this one.",
    ],
    others: {
      joss: ["It's stopped? Then that's what's been setting my teeth. I'd thought it was a tooth. I'd nearly had Sib pull it."],
    },
  },

  the_gnawed_hollow: {
    title: 'The Gnawed Hollow',
    giver: 'sib',
    about: "Wolfkin from the Gnawed Hollow come down to Kestrel Hide at night and gnaw the great ribs, low down. There has been no meat on those bones in a thousand years: they are sharpening. Empty the Hollow, two hundred and fifty paces north of the hide: every one of them, and the great one the colour of a cut.",
    offer: [
      "Look at the ribs, low down, on the north side. Those marks. That's not weather. They come down from the Hollow, nights, and work at them. I lie in the hide and listen. It goes on for hours.",
      "There's been no meat on those in a thousand years. They're not feeding. They're sharpening. And they walk upright now, and they looked at Joss. I'll not sleep under bones that something's whetting its teeth on. North. All of them, and the big one.",
    ],
    accept: "I'll empty the Hollow.",
    acceptLine: "North, two hundred and fifty paces, where the ground dips. They're quick, and they come round behind. The big one's the colour of a cut, and half again your height. Don't let him close with you. Keep ground between, and keep it burning.",
    decline: 'Not yet.',
    declineLine: "No. Then keep your back to the fire tonight. We all do.",
    journal: [
      "Wolfkin from the Gnawed Hollow, north of Kestrel Hide, gnaw the great ribs by night. Empty the Hollow: put down every one of them, and the great one that leads them.",
      "Go back to Sib Kestrel at Kestrel Hide.",
    ],
    progress: [
      "North. All of them. I'll not hear the ribs worked at another night.",
    ],
    done: [
      "Dead. All of them. And him. ...Joss. Joss, come and hear this. No: he's gone to look at his snares. He'll have heard. He hears everything. He only says half.",
      "Take this. Joss dug it out of the Hollow when we were children, before anything denned there. We never knew what it was off. Not the ribs' own; that one's long gone. But it's old, and it kept us company. You've more use for a head than we have.",
    ],
    after: [
      "Slept the night through. Woke to wings. I lay there and didn't reach for a net. I'll be poor by spring, at this rate.",
    ],
    others: {
      joss: ["The Hollow? She's asked you. Good. I'd have, but I'd already asked for two, and a man shouldn't ask twice in one week."],
    },
  },
};
