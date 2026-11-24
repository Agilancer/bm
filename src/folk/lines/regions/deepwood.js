// The Deepwood and the Sorrowhorn: what its people say (LINES, by their id, as src/folk/lines/land.js) and every word of the quests given
// there (QUESTS, by the quest's id; their workings: src/folk/regions/deepwood.js). Taken into src/folk/lines/land.js.
// Plain folk's, all of it: nobody at a camp names Velscour or Tessariel, and no line anywhere names anything of the one
// beside anything of the other (README "The two sides"; tests/quests-beyond.test.mjs reads every line for it). Up here the
// palmers' seven stations are the walk (Old Perrin Lowe's, src/folk/lines/regions/bellmourn.js): the first at Mossgate, the
// seventh at the Broken Stair. The door in the Crown is the Elder Dragon Gods' and nobody's side (docs/ELDER-DRAGONS.md).
//
// Each with a voice of their own (tools/folk/cast.md, "The Deepwood and the Sorrowhorn"): Fenn Hollis the trapper (sees you
// first; rules about what he sets for), Merry Cotter the palmer with the foot (cheerful, sure it's tomorrow), Old Bede the
// hermit (tells the bees everything, takes nothing), Isla Crag the guide (looks at your boots; the shoulder, never the face),
// Ebba Dunn the palmer at the seventh stone (losing her mother's words for it, a verse a night), and Yrsa on the Crown
// (copied maps; writes everything down, the time first).
// No animals stand at the camps or the hollow: Bede's hives are silent, Fenn's catch is what he tells of.

const DELVE_HINT = "The arch won't open for one alone: come with a company at your back. The Free Company's quartermasters in Bellmourn hire them out.";

export const LINES = {
  // ---------------------------------------------------------------- Mossgate Hide
  fenn: {
    first: ["Stand there. I saw you a hundred paces back. Fenn Hollis. Trapper. Don't touch the lines."],
    greet: {
      morning: [
        "Morning. Two snares sprung in the night, and nothing in them.",
        "Frost on the runs. Good. You can see what's walked them.",
      ],
      day: [
        "Quiet. I'm listening to the wood. It's saying you're here.",
        "Selling? Lay it on the stump. I'll look at it when I've done looking at you.",
      ],
      evening: [
        "Fire's banked low. I like to see out, not be seen.",
        "This hour the palmers used to come up wanting soup. I'd make it. I'd complain. I'd make it.",
      ],
      night: [
        "Don't walk about. Half of what's set out there is mine, and the other half isn't.",
        "Something's on the road, going down, not up. Let it go by.",
      ],
    },
    about: [
      "Fenn Hollis. I trap the wood's edge from Mossgate Hide, and I keep the first station's peg in tokens for old Perrin.",
      "Fox, marten, hare. Four legs. I've a rule: I don't set for anything that walks on two. This summer that's most of what's out there.",
    ],
    ask: {
      station: [
        "The three stones at my back. A palmer touches the middle one and takes a token off the peg. I cast them in a spoon. Thirty took one since midsummer. That's a lot of spoons.",
      ],
      wood: [
        "West is webs. East there's a clearing nobody cut, with folk stood in it who aren't. South, the wolfkin. North, the hermit's lane, and dolls in it. I used to tell palmers it was a quiet wood.",
      ],
      perrin: [
        "Perrin taught me to cast. I taught him to set a snare. He's no good at it. He feels sorry for the hare before it's in.",
      ],
    },
    topics: { station: 'The first station', wood: 'The wood', perrin: 'Old Perrin' },
    bye: ["Go quiet.", "Mind the lines."],
    barks: {
      player: ["Seen you.", "Mind the lines."],
      morning: ["Sprung. Empty."],
      evening: ["Low fire."],
      night: ["Let it go by."],
      magic: ["That'll empty my sets for a mile.", "Hm. Not near the runs."],
    },
    shop: {
      open: [
        "Pelts I don't want, I sell. Things I can use, I buy. Rolls from Perrin's, and a dressing; palmers' feet.",
        "Lay it on the stump.",
      ],
      closed: ["Not now."],
      buy: ["Yours."],
      sell: ["Done."],
    },
  },

  merry: {
    first: [
      "Oh, you're real. Fenn said someone was coming and I thought he meant a fox. Merry Cotter. Palmer. Well: palmer of one station. Sit. I can't get up; it's the foot.",
    ],
    greet: {
      morning: ["Morning! It's better. It's nearly better. Tomorrow, I should think."],
      day: ["Have you come up the road or down it? Up. Everybody's up. Nobody comes down but in the night, and Fenn won't say who."],
      evening: [
        "From here at dusk you can see through the trees to a clearing east. My company's sat in it. Fenn says not. Fenn says not about most things.",
        { after: 'the_resting_company', say: "Evening. I looked east just now. Trees. I've never been so pleased by trees." },
      ],
      night: ["I sleep sat up, facing the road. In case they come down and go by without stopping. They would. Kit would."],
    },
    about: [
      "Merry Cotter. My father drove beasts for the Drays at the Forkstone. Five of us came up together for the seven: me, my cousin Kit, the two Ashe boys, and Old Wen, who'd done it twice and wanted a third for luck.",
      "I turned my foot on the first stone. On the stone! Wen said it was a sign. They went on to wait for me at the second. That was eleven days ago.",
    ],
    ask: {
      company: [
        "Kit sings. Badly, on purpose, so you'll tell him to stop, and then you're talking. The Ashes carry everybody's bread. Wen knows the words for each stone. They'll be at the seventh by now. Or coming down.",
      ],
      foot: [
        "It's not broken. Fenn looked at it the way he looks at a hare, and said 'it'll do'. He says that of hares too. Just before.",
      ],
    },
    topics: { company: 'Her company', foot: 'The foot' },
    bye: ["Go on. If you meet a man singing badly, that's Kit.", "Mind your feet. Learn from mine."],
    barks: {
      player: ["Is it them? Oh. It's you.", "Up or down?"],
      morning: ["Tomorrow, I should think."],
      evening: ["Look east. No, don't."],
      magic: ["Ooh. Does it do feet?"],
    },
  },

  // ---------------------------------------------------------------- the Hermit's Hollow
  bede: {
    first: [
      "Wait. ...There. I've told them you've come. They like to know who's at the gate. Bede. I'm Bede. Those are the bees. Were.",
    ],
    greet: {
      morning: ["Morning. I've told the hives it's morning. Somebody should."],
      day: ["Sit on the stump. That one; the other's kept for whoever's died. There's always somebody."],
      evening: ["They'd be coming in now, heavy, over the fence, one after another like late guests. Listen. That's what nothing sounds like."],
      night: ["Late. There's a candle in the lantern for the road. My own wax. The last of it, near enough."],
    },
    about: [
      "Bede. Forty years in this hollow. I came up as a palmer, got this far, and stopped. It's a fair station, if you're not in a hurry.",
      "Bees, a garden, a spring. I sell nothing; I want nothing. Fenn brings salt and I give him honey. There's been no honey since midsummer, and he's still brought the salt. That's Fenn.",
    ],
    ask: {
      bees: [
        "You tell the bees everything. A birth. A wedding. A death, most of all: you go to each skep and knock, and say who. If you don't, they go off to find out for themselves, and they don't come back to say.",
      ],
      road: [
        "Palmers stop at my gate for water, going up to the seventh. They did. The ones going up this summer didn't knock. I watched them go by and up the road. Not one looked in.",
      ],
    },
    topics: { bees: 'Telling the bees', road: 'The palmers' },
    bye: ["Go on. I'll tell them you went.", "Shut the gate. Not for me. Habit."],
    barks: {
      player: ["I'll tell them.", "Mind the hives."],
      morning: ["Morning, all."],
      evening: ["Listen. Nothing."],
      magic: ["Mm. They'd not have liked that.", "Bright. Like a swarm going over."],
    },
  },

  // ---------------------------------------------------------------- the Broken Stair
  isla: {
    first: [
      "Show me your boots. ...They'll do to the shoulder. Not past it. Isla Crag. I take folk up the Horn, when there's folk. There's been one, this year.",
    ],
    greet: {
      morning: ["Morning. Cloud on the top. Nobody goes up into cloud. Nobody's going up anyway."],
      day: [
        "Rope, bread, a dressing for your heels: I've all three and nobody to sell them to. Lay out what you've carried.",
        "That's the seventh stone, by the arch. Palmers touch it and go home. They don't look up. I look up for a living.",
      ],
      evening: ["The top catches the last of the light. Always the top. You'd think it was showing off."],
      night: ["Stay by the fire. The stair's no place in the dark: half the steps are lying on the other half."],
    },
    about: [
      "Isla Crag. My mother took folk from the seventh station to the Crown and down, and her father before her. Up by the shoulder, never by the face. Twenty-two years I've done it.",
      "The palmers stop here; what they come for is done at the stone. The Crown's for those who want to see over the rim. I take them, for a fee and a promise to do as they're told.",
    ],
    ask: {
      shoulder: [
        "The face is quicker and it kills you. The shoulder goes round, past Greywatch, the old tower with its head off, then up the long rib and over. You'll not be told twice which to take.",
      ],
      yrsa: [
        "Last autumn. A woman with a book. Paid in silver, did as she was told, and at Greywatch she sat down and said she'd stop there and watch the winter out. I came down without her.",
        { after: 'the_night_book', say: "She went up. On her own, at midwinter, with a book. I'd have said nobody could. I'd have been right about anybody else." },
      ],
    },
    topics: { shoulder: 'The way up', yrsa: 'The last she took up' },
    bye: ["The shoulder. Not the face.", "Mind your boots."],
    barks: {
      player: ["Boots?", "Shoulder, not face."],
      morning: ["Cloud on the top."],
      evening: ["Showing off."],
      magic: ["Don't do that on my stair.", "That'd light a climb."],
    },
    shop: {
      open: ["Rope I'll not sell you; you'd use it. Bread, rolls, dressings for heels. And I'll buy what you carried up, so you're lighter for the climb."],
      closed: ["Not now. I'm looking at the top."],
      buy: ["Yours. Carry it high."],
      sell: ["Done. That's weight off."],
    },
  },

  ebba: {
    first: [
      "Don't be kind to me; I'll weep, and I've no time. Ebba Dunn. Seven stations' worth of walking, and six tokens. The seventh's that stone. I've not touched it.",
    ],
    greet: {
      morning: ["Morning. Another one. I sat up through it."],
      day: ["You can touch the stone, if you're going by. It's nobody's. I'm saving mine."],
      evening: ["This is when you'd go down to the Wakehouse with your candle. My mother did. Her mother did."],
      night: [
        "Say the words with me. 'Seventh, and the last, I come...' ...No. There's more. There was more this morning.",
        { after: 'the_broken_vigil', say: "Night. I've my own words now. I say them over. They stay." },
      ],
    },
    about: [
      "Ebba Dunn, from the downs. Forty-four years I meant to walk the seven, and at sixty-six I have, all but the last stone. You keep the night before it at the Wakehouse, the old house below the stair. It's the rule. I'll not break it this near.",
      "My mother taught me the words for each stone, the way hers taught her. Seven verses. I had all seven at the fifth station. I've lost a little every night since.",
    ],
    ask: {
      vigil: [
        "A night's wake, with a candle, in the house below the stair, before the seventh stone. You sit up and say the words over till morning, then come up and touch it. Nobody's kept it since spring. Things keep it now. They feed on what you're saying.",
      ],
      stone: [
        "It's a stone. Grey, with a hollow worn in the top from hands. I'll not go a step past it, to the Crown or anywhere. What's up there isn't the walk.",
      ],
    },
    topics: { vigil: 'The Wakehouse', stone: 'The seventh stone' },
    bye: ["Go on.", "Mind the steps. They're old."],
    barks: {
      player: ["Don't be kind.", "Mm?"],
      night: ["'Seventh, and the last...'"],
      magic: ["Put that out. It's a station."],
    },
  },

  // ---------------------------------------------------------------- the Crown of Teeth
  yrsa: {
    first: [
      "Stay off the ice. And keep this side of it. There. Yrsa. I'd shake your hand, but I'm writing. You came up the shoulder? Of course you did. Isla.",
    ],
    greet: {
      morning: ["Morning. The red one turned over at first light. It does, most days. I write the time."],
      day: ["Sit, if you like. The pillars are warmer than they look. Twelve. Three broken. I've drawn all of them."],
      evening: ["Evening. Nothing came out of the door today. That's a hundred and ninety-one days."],
      night: ["Cold enough up here to stop a heart. Mine's stubborn. Keep moving, or sit by me and say things."],
    },
    about: [
      "Yrsa. I copied maps, in a town you'll not have heard of, for a man who sold them. One had this mountain, and a word by the lake on its top he said was old, for 'where the gods are kept'. I came to see the word.",
      "I sat at Greywatch a winter to watch from below. Then I came up to watch from closer. I've a book. Everything goes in it, the time first.",
    ],
    ask: {
      door: [
        "The arch on the south shore, with a light stood in it. A man of the Free Company keeps by it and tells whoever comes up that they're not ready. He's told me eleven times. I've never asked.",
      ],
      red: [
        "A red one. It sleeps on the shore by the door, stands up when anyone comes near it, and lies down again when they go. It's never gone for the warden. It isn't guarding the door. I think it's waiting for what's in it.",
        { after: 'red_on_the_shore', say: "The shore's empty. I keep looking where it lay. You get used to a thing, in a hundred and ninety-one days. Even a dragon." },
      ],
      // (The four Heralds out in the land, src/core/wilds.js WORLD_BOSSES: one quest each, at Kestrel Hide, Climbers' Rest,
      // the Hollow Watch and the Broken Stair. She hears of each one put down.)
      heralds: [
        "Four of them, the palmers' books say: heralds, one for each of what sleeps behind the door. They come down off the edges of the world when it stirs, and walk this way. Green, red, bone and black. I've written where each was seen. The time first.",
        { after: 'the_empty_sky', say: "The green one's down, on the downs? I'll write it. The wind behind the door went quiet the same hour. I can't tell you if that's sleep, or holding its breath." },
        { after: 'the_cold_that_remembers', say: "The bone one, on the fells. Down. The frost on the arch of the door melted the same night, and froze again by morning in a new shape. I've drawn both." },
        { after: 'the_heat_under_the_world', say: "The red herald, out in the Waste, down? The ice on the lake cracked at noon, all the way across, with nothing on it. I've written the time. I don't like the time." },
        { after: 'a_tooth_of_the_star', say: "The black one was coming up the palmers' way. To here. To the door. You put it down a morning's walk below me, and I never knew. I'll be writing that one a long while." },
      ],
    },
    topics: { door: 'The door', red: 'The red one', heralds: 'The heralds' },
    bye: ["Keep this side of the ice.", "Mind the rim going down. It's worse than coming up."],
    barks: {
      player: ["Stay off the ice.", "This side."],
      day: ["Nothing yet."],
      night: ["Write the time."],
      magic: ["Again. Slower. I'm writing it down."],
    },
  },
};

export const QUESTS = {
  // ================================================================ Mossgate Hide (Fenn Hollis; Merry Cotter)
  coming_down: {
    title: 'Coming Down',
    giver: 'fenn',
    about: "Old Perrin's word was that palmers are coming back down the Pilgrims' Road. Fenn Hollis has watched three this week: by night, off the road, walking down through the trees west of Mossgate Hide into the webs, where the spiders let them stand. Put down three of what's in there, spider or walker.",
    offer: [
      "Coming back down, Perrin says. Some are. Three nights this week I've watched them go by below the hide, after dark. Not on the road. Through the trees, west, the way nothing walks that's going anywhere.",
      "They go in among the webs and stand there, and the spiders don't touch them. I don't set for what walks on two legs. I've rules. I'd like them broken for me. Three of whatever's in there.",
    ],
    accept: "I'll break your rules for you.",
    acceptLine: "West, five hundred paces, where the trees go grey with web. Spiders, and the walkers stood among them; whichever comes at you, it counts. Mind the webs: they hold. I left a boot in one at midsummer.",
    decline: 'Not palmers.',
    declineLine: "No. That's my rule too. It's a good rule. It's just not working.",
    journal: [
      "Fenn Hollis has watched palmers come down by night off the Pilgrims' Road into the webs west of Mossgate Hide, where they stand among the spiders. Put down three of what's in the webs, spider or walker.",
      "Go back to Fenn Hollis at Mossgate Hide.",
    ],
    progress: ["West. The webs. Three of what's in them."],
    done: [
      "Three. ...And the walkers stood in there: which way were they facing? Down. Down the hill, towards Perrin's.",
      "Then the webs were holding them. I'd thought the spiders had them. The spiders were all that kept them off the road to Perrin's arch. I'll not thank a spider. Here. And don't tell the one by the fire what they were.",
    ],
    after: ["I've moved two sets west, to the edge of the webs. Not for the spiders. For whatever comes down next and gets through them."],
    others: {
      merry: ["Fenn's been out west. He came back and washed his hands a long while. He never washes his hands. Spiders, he says."],
    },
  },

  the_resting_company: {
    title: 'The Resting Company',
    giver: 'merry',
    about: "From the Pilgrims' Road at dusk, Merry Cotter can see a company resting in a clearing east of Mossgate Hide, some sat, some stood about, and they don't answer when she calls. Fenn Hollis says it's the Stitched Field, and straw. She wants it down, every one, and the big one in the middle, so she can stop looking.",
    offer: [
      "At dusk, through the trees east: a company resting in a clearing. Some sat, some stood about. Just as we did at the first stone, before my foot. I called. Not one of them looked round.",
      "Fenn says it's straw. 'The Stitched Field', he says, like a word everyone knows. I can't walk there to see, and I can't stop looking. Pull it down, would you? All of them. Then I'll know.",
    ],
    accept: "I'll go and see.",
    acceptLine: "East, three hundred and fifty paces, over the road and into the trees. There's a big one in the middle, Fenn says, wicker, that holds the others up. If one of them's singing badly, come back and tell me first.",
    decline: 'Not now.',
    declineLine: "No. It's only a field. I'll look at it again tonight, then.",
    journal: [
      "Merry Cotter sees a company resting in a clearing east of Mossgate Hide at dusk, and they don't answer her. Fenn Hollis calls it the Stitched Field. Empty it: every straw man in it, and the big one at its middle.",
      "Go back to Merry Cotter at Mossgate Hide.",
    ],
    progress: ["East, over the road. If one of them's singing, tell her first."],
    done: [
      "Straw? All of them? Not one singing? ...Straw. Oh, good. Then they're not in a field. They're up the road, where they said they'd be, at the seventh, and Kit singing at the stone.",
      "Here. It was for the second stone, to leave on it. I'll get to the second when I get there. Kit will laugh. Let him.",
    ],
    after: ["Tomorrow, I should think. For the foot. I've been saying it eleven days, but now I mean it."],
    others: {
      fenn: ["She's had you out to the field. ...Straw? Then I was right, and I've never been less glad of it. She'll ask me next where they are."],
    },
  },

  snares_on_the_runs: {
    title: 'Snares on the Runs',
    giver: 'fenn',
    about: "The wolfkin of Howlers' Scrape, south of Mossgate Hide, have started setting snares on Fenn Hollis's runs: bent hazel and a noose of gut, badly made, just where a man puts his foot. He put his in one this morning. Empty the Scrape: every one of them, and the big one that leads them.",
    offer: [
      "I walked my runs this morning and put my foot in a snare. Bent hazel, a noose of gut. Badly made; it'd not hold a rabbit. It nearly held me. Set right where I put my foot, on my own run.",
      "I didn't set it. Wolfkin did, out of Howlers' Scrape, south. Their marks all round it. Twenty years I've set snares, and never had one set for me. Empty the Scrape, the big one too. Before they get good at it.",
    ],
    accept: "I'll empty the Scrape.",
    acceptLine: "South, three hundred paces, down the trail. Walk where I walk to the edge of the hide; after that, look where you put your feet. If something takes your ankle, don't pull. Cut.",
    decline: 'Not wolfkin.',
    declineLine: "Then walk careful. That's all I've got. It's all I had this morning, too.",
    journal: [
      "Wolfkin out of Howlers' Scrape, south of Mossgate Hide, have been setting snares on Fenn Hollis's runs, where a man puts his foot. Empty the Scrape: every one of them, and the big one that leads them.",
      "Go back to Fenn Hollis at Mossgate Hide.",
    ],
    progress: ["South. The Scrape. Look where you put your feet."],
    done: [
      "Empty. ...You saw them stood up? On two legs, like a man, the big one and all. Then that's it. I don't set for what walks on two. Never have. My rule.",
      "And they knew my rule. Read it off my runs, like a sign. Nothing of mine would ever take them, so they could come right up and set for me. Here: my father's coat, waxed. A rule's a thing anybody can read.",
    ],
    after: ["Walked the runs. Found two more of theirs, old ones, both empty. I've left them set. Let them find out what it's like."],
    others: {
      merry: ["He came in this morning with a noose of gut round his boot and said 'don't'. So I didn't. I've been not saying it all day. It's very hard."],
    },
  },

  salt_for_the_hermit: {
    title: 'Salt for the Hermit',
    giver: 'fenn',
    needs: 'snares_on_the_runs',
    about: "Fenn Hollis has carried salt up to Old Bede at the Hermit's Hollow every month for years, and had honey for it. He hasn't been since midsummer: dolls stand in the lane below the hollow, and folk among them. Put down two of them on the way, and take Bede the salt, five hundred paces north-north-east up the lane. It's paid there.",
    offer: [
      "There's an old man up the lane, north. Bede. Keeps bees at the Hermit's Hollow. Every month I take him salt, and he gives me honey, and we don't talk. It suits.",
      "I've not been since midsummer. There's dolls in his lane, big as a man, stood about with folk among them below his gate. Take him the salt. And look if he's living. He'll be living. He's too contrary not to be.",
    ],
    accept: "I'll take him the salt.",
    acceptLine: "North-north-east, up the lane off the road, five hundred paces. The dolls stand below his gate: put two down and go by. He'll be at his fire. He'll tell somebody you've come before he tells you anything.",
    decline: 'Not yet.',
    declineLine: "He's waited since midsummer. He's patient. It's the only thing about him that is.",
    journal: [
      "Fenn Hollis sends salt up the lane to Old Bede at the Hermit's Hollow. Dolls stand below the hollow's gate, and folk among them: put down two.",
      "Give Old Bede the salt, at his fire in the Hermit's Hollow, north-north-east of Mossgate Hide up the lane.",
    ],
    progress: ["Up the lane. Two of what stands in it. Then the old man."],
    done: [
      "Wait. ...I've told them. Salt, from Fenn. He'll have asked was I living. Tell him yes. And tell him no honey; he'll know what that means.",
      "And you came up through the dolls to bring it. Sit. That's for the climb up. I've a thing wants doing, and you've a look of somebody who'd do it for an old man.",
    ],
    after: ["Bede sent a jar back down with a palmer's lad, empty, washed, with a note in it: 'Kept for when.' It's on my shelf. Kept for when."],
    others: {
      bede: [
        "Wait. ...I've told them. Salt, from Fenn. He'll have asked was I living. Tell him yes. And tell him no honey; he'll know what that means. That's yours, for the lane.",
        "And you came up through the dolls to bring it. Sit. I've a thing wants doing, and you've a look of somebody who'd do it for an old man. It's a rare look. Don't lose it on the Horn.",
      ],
      merry: ["Bede? Fenn talks about him like a bad knee. Fond, and he'd never say so."],
    },
  },

  // ================================================================ the Hermit's Hollow (Old Bede)
  bait_skeps: {
    title: 'Bait-Skeps',
    giver: 'bede',
    about: "Old Bede's hives went quiet at midsummer. In spring he'd hung five empty skeps in the limes north-east, where his bees worked, to catch a swarm if one went looking for a home; the hollow there has gone grey with web since, and he can't get to them. Bring the five back from the limes round the edge of it.",
    offer: [
      "The hives went quiet at midsummer. All nine. In spring I'd hung bait-skeps in the limes north-east, where they worked: five, empty, a smear of old comb in each, so if a swarm went looking it'd take one of mine.",
      "The hollow there's gone grey since. Webs, tree to tree. I can't get to them. Fetch me the five from round the edge of it. I'll see if anything went looking, and if anything did, which way it went.",
    ],
    accept: "I'll fetch the skeps.",
    acceptLine: "North-east, two hundred and thirty paces, through the trees. They hang low in the limes round the edge of the webs, not in them. Straw, shaped like a bell. Bring them as they are. Don't look in. I'll look.",
    decline: 'Not now.',
    declineLine: "No. They've hung since spring. They're good at hanging.",
    journal: [
      "Old Bede hung five empty bait-skeps in the limes north-east of the Hermit's Hollow, round the edge of the webbed hollow there, to catch a swarm. Bring back all five.",
      "Take the skeps back to Old Bede at the Hermit's Hollow.",
    ],
    progress: ["North-east. Five skeps, in the limes round the webs. Don't look in."],
    done: [
      "Empty. Empty. Empty. Empty. ...Not this one. Comb, look. A hand's breadth, new this summer. They went that far, and made a start in my skep, and stopped.",
      "And here, at its mouth. Silk, cut through the comb like a wire through cheese. The weavers' work: they went in after them even in my skep. Take this; it's what I'd put by for the swarm. I'll want you again.",
    ],
    after: ["I've hung the four empty ones back in the limes. The fifth's on my table. It's not much of a start. It's a start."],
    others: {},
  },

  telling_the_bees: {
    title: 'Telling the Bees',
    giver: 'bede',
    about: "Old Bede's bees went north-east from the Hermit's Hollow at midsummer, to the hollow past his limes, and never came back. It's webbed tree to tree now. Fenn Hollis calls it the Weavers' Hollow. Empty it: every spider in it, and the great one that spins.",
    offer: [
      "At midsummer my bees went north-east, the whole nine hives in one cloud, to the hollow past my limes. That hollow's grey now. Weavers, Fenn calls them. Webs tree to tree, red ones in them, and the great one at the back that spins.",
      "Bees go when they're not told. You tell them everything: a birth, a wedding, a death. Knock on each skep and say who. If you don't, they go off to find out. Empty the hollow. Then I'll work out who I forgot.",
    ],
    accept: "I'll empty the hollow.",
    acceptLine: "North-east, two hundred and seventy paces, past my limes and in. If you're fetching my skeps, it's the same walk. The great one hangs at the back; the little ones come at you first. Don't stand in the webs. They know when you do.",
    decline: 'Not spiders.',
    declineLine: "No. I'll sit with the skeps, then. They don't mind company.",
    journal: [
      "Old Bede's bees went north-east at midsummer, to the hollow past his limes, and didn't come back. Empty the Weavers' Hollow, north-east of the Hermit's Hollow: every spider in it, and the great one that spins.",
      "Go back to Old Bede at the Hermit's Hollow.",
    ],
    progress: ["North-east. The Weavers' Hollow. Don't stand in the webs."],
    done: [
      "Empty. ...And them? In the webs, I'd think, like currants in a cake. You needn't say. Now: who? Who died, that I wasn't told, so I never told them?",
      "Palmers. Thirty went up past my gate since midsummer, and none came down, and nobody told me. That's who. I'll go round and knock and say it. There's nobody in to hear. You still say it. Take my stick; I'll not walk that far again.",
    ],
    after: ["I told them. Nine skeps, thirty I didn't know the names of, so I said 'a palmer' thirty times at each. It took the morning. I feel better. I don't know that they'd care."],
    others: {},
  },

  candle_ends: {
    title: 'Candle-Ends',
    giver: 'bede',
    needs: 'telling_the_bees',
    about: "Every palmer who knocked at the Hermit's Hollow on the way up had a candle of Old Bede's wax off him, for the night before the seventh stone. The walkers in his lane below the gate came back down with theirs. Put down three of what stands in the lane, and pick up five of the candle-ends from where they stood.",
    offer: [
      "Every palmer who knocked had a candle off me, going up. My wax, for the night before the seventh stone. Thirty this summer, I'd have said, and none came back. I said it to the bees. I was wrong.",
      "Some came back. They're stood in my lane, with the dolls, and they've still their candles in their hands. I watched one drop his. Put three of them down. Then bring me the ends. It's my wax. It's all there is now.",
    ],
    accept: "I'll bring you the ends.",
    acceptLine: "South, down the lane, a hundred and eighty paces. Three of them, whichever; the dolls count, they're in the way. Then the candle-ends in the leaves round where they stand. Short, yellow, bitten at the wick. Five will make a block.",
    decline: 'Not the palmers.',
    declineLine: "No. They were somebody's. I'll let them stand a while longer with my candles, then.",
    journal: [
      "The walkers in Old Bede's lane below the Hermit's Hollow are palmers come back down, still carrying the candles of his wax he gave them going up. Put down three of what stands there.",
      "Pick up five of the candle-ends lying in the leaves round where the walkers stand, south of the Hermit's Hollow down the lane.",
      "Take the candle-ends back to Old Bede at the Hermit's Hollow.",
    ],
    progress: ["Down the lane. Three of what stands there, then five candle-ends."],
    done: [
      "Five. ...Unlit, every one. Look. Not one of them got as far as the night before the stone. They carried them up and carried them down again and never once lit them.",
      "I'll melt them in with the comb from the skep. A block. My wax went up the road thirty times, and five ends of it have come back to me down it. There. That's the last of it. Take this; it was for the swarm.",
    ],
    after: ["The block's set. It smells of the comb, and a little of the lane. I'd not have thought wax kept a smell of where it's been."],
    others: {
      fenn: ["Bede's had you picking up candle-ends among the dead? He'd have a use for the dead, Bede would. He's never wasted a thing."],
    },
  },

  the_last_of_the_wax: {
    title: 'The Last of the Wax',
    giver: 'bede',
    needs: 'candle_ends',
    about: "Isla Crag, the guide at the Broken Stair, keeps a candle of Old Bede's wax lit in the pilgrims' shelter for whoever is up the mountain. This block, made of the candle-ends from his lane, is the last of it. Take it up to her, five hundred paces north-west up the Pilgrims' Road, and put down one of the two that sit beside the road below the stair. It's paid there.",
    offer: [
      "The guide at the Broken Stair, Isla Crag, keeps a candle lit in the shelter there for whoever's up the Horn. My wax. I send her a block at the turn of the year; she sends nothing. That's our arrangement.",
      "This is the last block: the ends from the lane, and the comb. There'll be no more. Take it up to her. Something sits by the road below the stair, two of them, dark; I hear them at night. Put one down, and the other will mind you.",
    ],
    accept: "I'll take it up.",
    acceptLine: "Back down to the road, and up it, north-west. Five hundred paces to the stair, the great gate with its arch broken. They sit by the road short of it. She'll be by the gate, looking at your boots.",
    decline: 'Not yet.',
    declineLine: "It keeps. Wax keeps. It's what it's for.",
    journal: [
      "Old Bede sends the last of his wax up to Isla Crag at the Broken Stair, for the candle she keeps lit for whoever is up the mountain. Beside the Pilgrims' Road below the stair, put down one of the two that sit there.",
      "Give the wax to Isla Crag, by the gate of the Broken Stair, north-west up the Pilgrims' Road.",
    ],
    progress: ["Up the road. One of the two beside it. Then the gate, and the guide."],
    done: [
      "Show me your boots. ...Bede's wax? The last? It's been out since midwinter, that candle. The last one I took up didn't come down, and I stopped keeping it. Bede doesn't know that.",
      "I'll light it. It does no harm. Here, for the road up. And since you're on my stair with boots like those, I've work.",
    ],
    after: ["I can see the stair's smoke from the top of my lane on a still day. I go and look. I don't know what for. Smoke, I suppose."],
    others: {
      isla: [
        "Show me your boots. ...Bede's wax? The last? It's been out since midwinter, that candle. The last one I took up didn't come down, and I stopped keeping it. Bede doesn't know that. That's yours, for the road.",
        "I'll light it. It does no harm. And since you're on my stair with boots like those, I've work, if you want it.",
      ],
    },
  },

  // ================================================================ the Broken Stair (Isla Crag; Ebba Dunn)
  the_shoulder: {
    title: 'The Shoulder',
    giver: 'isla',
    about: "The way up the Sorrowhorn goes round by the shoulder, past Greywatch, and never by the face. This summer black whelps have come down onto the shoulder, which they never did, and sit in the stones on the rib like hens on something. Isla Crag won't take anyone up past them. Put two of them down, and see what they were sat on.",
    offer: [
      "The shoulder's the way up. The face is quicker, and it kills you. This summer there's black whelps on the shoulder, three, on the rib above Greywatch, where there's never been anything but wind.",
      "They sit in the stones all day, the three, like hens on a clutch. Whelps don't sit on anything but what shines. Put two down, and look under them. I'd like to know what's worth sitting on, up there.",
    ],
    accept: 'Two whelps.',
    acceptLine: "Up the path, north-west, past Greywatch: the tower with its head off. Five hundred paces. They're on the rib above it, in the stones. They're young. Young things are quick. Be the clever one.",
    decline: 'Not dragons.',
    declineLine: "Little ones. But I take your point. It's the size they'll be.",
    journal: [
      "Black whelps have come down onto the shoulder of the Sorrowhorn, on the rib above Greywatch, north-west of the Broken Stair, and sit in the stones there on something. Put two of them down.",
      "Look in the whelps' stones on the rib for what they were sat on.",
      "Go back to Isla Crag at the Broken Stair.",
    ],
    progress: ["Up past Greywatch. The rib. Two whelps, and what they were sat on."],
    done: [
      "Two. And this was under them? ...Brass. An ink-horn, with the stopper in, and a ring on it to hang at a belt. Whelps take what shines. They'll have had it off a body or off a camp.",
      "It's hers. Yrsa's. She wrote with it at my fire. So she got as far as the rib, above Greywatch. Further than I ever went to look. Here. I've not been paid for a climb all year; this is the last of the last one.",
    ],
    after: ["I've her ink-horn on a nail by the gate. Whoever goes up after her takes it. I'd like her to have it back."],
    others: {
      ebba: ["The guide's sent you up the shoulder? She's been looking up it all summer, like a wife with a husband in the alehouse."],
    },
  },

  the_night_book: {
    title: 'The Night-Book',
    giver: 'isla',
    about: "Last autumn Isla Crag took a woman called Yrsa up the shoulder as far as Greywatch, the ruined tower, where she made camp to watch the mountain and wouldn't come down. At midwinter Isla went up and found the camp frozen and empty, and couldn't make herself look further. The wind has had her book apart. Bring back four pages from round the camp.",
    offer: [
      "Last autumn I took a woman up as far as Greywatch, the old tower on the shoulder. Yrsa. Paid in silver, did as she was told, and at the tower she sat down and said she'd watch the winter out from there. With a book. Everything went in the book.",
      "At midwinter I went up. Her camp in the tower's lee, frozen, nobody in it, and her pages all over the shoulder. I came down. I've not been back. Fetch me what's left of her book. Four pages. I'd like to know what she wrote last.",
    ],
    accept: "I'll bring the pages.",
    acceptLine: "North-north-west, up the path, three hundred and seventy paces. The tower with its head off. Her tent's in its lee, the side out of the wind. The pages'll be round it, under stones, where they blew. Don't look for anything else.",
    decline: 'Not yet.',
    declineLine: "No. They've kept since midwinter. It's cold up there; things keep.",
    journal: [
      "Last autumn Isla Crag left a woman called Yrsa camped at Greywatch, the ruined tower on the shoulder north-north-west of the Broken Stair, to watch the mountain. At midwinter the camp was empty. Bring back four pages of her book from round it.",
      "Take the pages back to Isla Crag at the Broken Stair.",
    ],
    progress: ["Up to Greywatch. The camp in its lee. Four pages."],
    done: [
      "Times. Every page, times, then a line. 'Third hour. Something sounded on the top. Not wind.' 'Noon. Three whelps down the rib, fast.' ...This is the last. 'Too far to see. Going up. Back before thaw.'",
      "She went up. Alone, at midwinter, over the top of the rib, with a book. Before thaw. It's long past thaw. She'll be dead. She'll not be. I don't know which. Here: her silver, for the climb. It was never mine. Leave me the pages.",
    ],
    after: ["I've her pages in oilskin under the guide-stone. If she comes down she'll want them. If she doesn't, somebody who knew her should have them. That's me. Which isn't much."],
    others: {
      ebba: ["Isla's woman with the book? I saw her go up, last autumn. She walked like somebody going home. I remember thinking: that's the wrong way for home."],
    },
  },

  the_broken_vigil: {
    title: 'The Words for the Seventh',
    giver: 'ebba',
    about: "Palmers keep the night before the seventh stone in the Wakehouse, the roofless house south of the Broken Stair, saying over the words for it; nobody has since spring. What's in it now feeds on what you say there, and since the fifth station Ebba Dunn has lost a verse of her mother's words a night. Empty the Wakehouse: every one of them, and the worst at its heart.",
    offer: [
      "You keep the night before the seventh stone in the Wakehouse, the old house south of here, off the road. A candle, and the words for the stones, said over till morning. My mother taught me them. Hers taught her. Seven verses.",
      "I had all seven at the fifth station. Every night since I've woken with one fewer. I've a line left. Things are in that house that eat what's said in it, and it reaches up here. Empty it, and what's worst in it.",
    ],
    accept: "I'll empty the Wakehouse.",
    acceptLine: "South, three hundred and twenty paces, west of the road going down. The house with no roof. They walk about in it. The worst is at the heart. Don't say anything in there you want to keep.",
    decline: 'Not tonight.',
    declineLine: "No. I'll say my line over, then, and hope I have it in the morning.",
    journal: [
      "Palmers kept the night before the seventh stone in the Wakehouse, south of the Broken Stair, saying the words for it; nobody has since spring. What's in it feeds on what's said, and Ebba Dunn has been losing her mother's words a verse a night. Empty the Wakehouse: every one of them, and the worst.",
      "Go back to Ebba Dunn at the Broken Stair.",
    ],
    progress: ["South, west of the road. The house with no roof. Say nothing in there."],
    done: [
      "Empty? ...Then they'll come back to me. Wait. 'Seventh, and the last, I come...' ...No. Nothing. They're not coming back. What it ate, it ate.",
      "Well. My mother made them up, I expect, or hers did. Somebody did. I've forty-four years of walking; I can make seven lines. I'll say my own at the stone. Here: what I'd saved to leave on it.",
    ],
    after: ["I touched it. Grey, with a hollow worn in from hands. I said mine. They didn't scan. I said them twice, so it would know I meant them."],
    others: {
      isla: ["Ebba's had you down the Wakehouse. She asked me to go with her when she came up. I said I take folk up, not down. I'm sorry for that now."],
    },
  },

  crown_of_teeth: {
    title: 'The Crown of Teeth',
    giver: 'isla',
    needs: ['the_shoulder', 'the_night_book'],
    about: "Isla Crag's mother put a lake at the top of the Sorrowhorn that never thaws, a spire of black glass in it and a ring of teeth round it; and Yrsa went up there at midwinter. Climb by the shoulder, put down two of the demons in the stones above the whelps' rib, see whose names are in the tin in the cairn below the rim, and find her on the Crown of Teeth. It's paid there.",
    offer: [
      "My mother's tale: at the top, a lake that never thaws, and in it a spire of black glass, and round it a ring of teeth. She took eleven up in her life and none of them told it the same twice. I've been up nine times and I can't either.",
      "Yrsa went up. Take her ink-horn; if she's anywhere, she's there. Below the rim there's my mother's cairn, with a tin in it: whoever gets that high puts their name in. Look for hers. Then go over and find her. If she's not there, come down and say 'not'.",
    ],
    accept: "I'll climb it.",
    acceptLine: "The shoulder, not the face. Past the whelps' rib; above it something worse sits in the stones: put two down. Then a quarter-hour up to the cairn, and over the rim. Go west of the door, never east: a red one sleeps on the south shore.",
    decline: 'Not that climb.',
    declineLine: "Sensible. Everyone I took up was sensible too, till the shoulder. That's the trouble.",
    journal: [
      "Isla Crag sends you up the Sorrowhorn to the Crown of Teeth, to find Yrsa: by the shoulder, never the face. Above the whelps' rib, north-west of the Broken Stair, put down two of the demons that sit in the stones.",
      "Climb on north-west to the cairn Isla's mother built just below the rim of the Crown of Teeth, and take the tin out of it, with the names of all who got that high.",
      "Go over the rim, west of the door and wide of the red dragon on the south shore, and find Yrsa on the shelf on the lake's south-west side.",
    ],
    progress: ["The shoulder. Two in the stones. Then the cairn's tin, and over the rim, west of the door."],
    done: [
      "Stay off the ice. And this side of it. ...Isla sent you? Isla has my pages? Then Isla's not dead. I've had her dead since midwinter, for not coming up after me. I'm glad to be wrong. I'm not often.",
      "My name in the tin, and the time. Of course. And my ink-horn: empty, cracked in the frost. Here: the only true map of this; I drew it. Look east, at the red one by the door. That's not for you. Go down, and come back when you're its size.",
    ],
    after: ["You found her. I'll not ask how she looked. She'll come down when she comes down. I've lit the candle; it can stay lit."],
    others: {
      yrsa: [
        "Stay off the ice. And this side of it. ...Isla sent you? Isla has my pages? Then Isla's not dead. I've had her dead since midwinter, for not coming up after me. I'm glad to be wrong. I'm not often.",
        "My name in the tin, and the time. Of course. And my ink-horn: empty, cracked in the frost. Here: the only true map of this; I drew it. Now look east, at the red one by the door. That's not for you. Not yet. Go down, and come back when you're its size.",
      ],
      ebba: ["You're for the top? Then you're past the walk, and I'll not wish you a good one. I'll wish you down again. That's a palmer's wish too."],
    },
  },

  // ================================================================ the Crown of Teeth (Yrsa)
  the_pillars: {
    title: 'The Pillars',
    giver: 'yrsa',
    about: "Twelve pale pillars stand round the frozen lake in the Crown of Teeth, with nothing on them. At the foot of each there are marks under the frost that Yrsa can't make out from her shelf, and her fingers won't hold the charcoal out there any more. Take rubbings of the marks at the feet of the four on her side, north of her along the west shore.",
    offer: [
      "Twelve pillars, three broken, nothing on any of them. I've drawn them all. But there's marks round their feet, under the frost, cut small. I've looked from here a hundred and ninety-one days and I can't read them from here.",
      "My fingers won't hold the charcoal out in the wind any more. They're not what they were at midwinter. Take this paper. Rub the marks on the four on this side. North of me, along the west shore. Not the far ones: they're the red one's side.",
    ],
    accept: "I'll take the rubbings.",
    acceptLine: "North, along the west shore, the four nearest, the last of them broken. Lay the paper on the frost at the foot and rub flat with the side of the stick. Don't go round to the east ones. It looks.",
    decline: 'Not now.',
    declineLine: "No. They've kept their marks this long. They'll keep them till you're warm.",
    journal: [
      "There are marks cut small under the frost at the feet of the pillars round the lake in the Crown of Teeth. Take rubbings at the four on Yrsa's side, north of her shelf along the west shore.",
      "Take the rubbings back to Yrsa on her shelf.",
    ],
    progress: ["North along the west shore. Four pillars, a rubbing off each foot."],
    done: [
      "Let me lay them out. ...It's one word. Four times, round each foot. The map's word, the one for 'where the gods are kept'. And after it, on every one, another I've no copy of.",
      "...I have. Once. On a gaol's plan, over a cell. The man said it meant 'until'. Kept until. I'll not sleep on that. Here: what I've left that's worth anything. I'll want you once more.",
    ],
    after: ["I've pinned the rubbings round the shelf, under stones. 'Kept until.' I look at them every morning, then at the door. I write the time."],
    others: {},
  },

  the_sitters: {
    title: 'The Sitters',
    giver: 'yrsa',
    about: "Every night three dark things sit on the north shelf of the Crown of Teeth, by the broken pillar, facing the door across the ice. Yrsa has watched them since midwinter: they never move till dawn, and then they're only gone. Put down two of them.",
    offer: [
      "North of me, by the broken pillar, three of them. Dark, winged, the size of a man sat down. They come at dusk and sit facing the door till first light. They don't look at me. I've drawn them every night. The same three.",
      "I'd like to know what they're for. Things don't sit and watch a door for nothing. Put two down. Then I can go and look at where they sit, which I've not dared since I came up.",
    ],
    accept: 'Two of the three.',
    acceptLine: "North-north-east along the shelf, two hundred and fifty paces, past the pillars on this side. By the broken one. They'll get up when you come. Mind the ice behind them, and don't go round east of them.",
    decline: 'Not now.',
    declineLine: "No. They've sat there a hundred and ninety-one nights. They'll sit tonight.",
    journal: [
      "Three dark things sit each night on the north shelf of the Crown of Teeth, by the broken pillar, facing the door. Put down two of them.",
      "Go back to Yrsa on her shelf, west of the door.",
    ],
    progress: ["North along the shelf, by the broken pillar. Two of the three."],
    done: [
      "Two. ...I went and looked, while you were coming back. The stone where they sat is worn. Two hollows in it, smooth, the way a step goes. Not from this winter. From hundreds.",
      "Twelve pillars with nothing on them, round a door. I'd thought it was a temple. It's a watch. Something set them there to sit and look at it, and these three came back to their places. Here. Write that down for me.",
    ],
    after: ["The one that's left still comes at dusk, and sits, and looks at the door. I sit and look at it. Two of us on watch now."],
    others: {},
  },

  ink_for_the_crown: {
    title: 'Ink for the Crown',
    giver: 'yrsa',
    needs: 'the_pillars',
    about: "Yrsa has written everything that happens in the Crown of Teeth in her book since midwinter, the time first, but the ink-horn Isla sent back up to her is empty and cracked, and she has been writing with soot and snow-water, which runs. She sends you down off the Sorrowhorn south-west to Mab Crowe at Scavengers' Pit, who sells anything, with all her silver, for ink, by way of the necromancers who keep a little past the Pit, north-west of it. It's paid there.",
    offer: [
      "Look at this page. Soot and snow-water. It runs when it's warm and it's always warm in my hand. My ink-horn's back, and it's empty and cracked. Every page since midwinter is going grey.",
      "Down off the mountain south-west, across the Waste, there's a pit where they dig bones out of the ash and sell them. A woman called Crowe runs it. She'll sell anything, Isla says. Take her my silver. All of it. Ink.",
    ],
    accept: "I'll buy you ink.",
    acceptLine: "South-west, down the mountain, fifteen hundred paces. Ribs as tall as houses out of the ash: that's the Pit. Necromancers keep a little past it, north-west: put two down first. And if she asks what it's for, say: writing down a door. She'll charge less. Or more.",
    decline: 'Not yet.',
    declineLine: "No. I'll write smaller, then. It runs less if it's small.",
    journal: [
      "Yrsa, on the Crown of Teeth, is writing in soot and snow-water: her ink-horn is empty and cracked. Down off the Sorrowhorn south-west, a little past Scavengers' Pit, north-west of it, put down two of the necromancers who keep there.",
      "Take Yrsa's silver on to Mab Crowe at Scavengers' Pit, and buy her ink.",
    ],
    progress: ["Down off the mountain, south-west. Two of the necromancers a little past the Pit, north-west, then the Pit. Mab Crowe. Ink."],
    done: [
      "Come down off the Horn, have you? With silver for ink, from somebody sat on top of it. That's a new one, and I've had them all.",
      "Ink I've got: two pots, sealed, off a scribe the Field had. Tad'll take them up as far as he dares. Keep her silver; you walked it here. And if you're stopping, I've work, when you've the weight for it.",
    ],
    after: ["Ink. Two pots, sealed, in Isla's mother's cairn; a lad left them and ran. I've written the time with it. It doesn't run."],
    others: {
      mab: [
        "Come down off the Horn, have you? With silver for ink, from somebody sat on top of it writing a door. That's a new one, and I've had them all. ...Ink I've got. Off a scribe the Field had. Two pots, sealed.",
        "Tad'll take it up as far as he dares and leave it in the cairn; she'll find it. Keep her silver. You've walked it far enough to be owed it. I've work here too, when you've the weight for it.",
      ],
      isla: ["Yrsa's sent you down for ink? For the horn I sent up. ...Then she's writing still. That's all I wanted to know."],
    },
  },

  red_on_the_shore: {
    title: 'The Red on the Shore',
    giver: 'yrsa',
    about: "A red dragon sleeps on the south shore of the frozen lake in the Crown of Teeth, by the door in the arch. It stands up for whoever comes near it, lies down again when they go, and never troubles the warden at the door. Yrsa thinks it's waiting for whatever is through the door to come out. Kill it.",
    offer: [
      "The red one. On the south shore, by the door. A hundred and ninety-one days I've watched it, and it does three things: sleeps, turns over, and stands up when anyone comes near. It's never once gone for the warden.",
      "It isn't guarding the door. Nothing guards a door it doesn't mind folk going in by. It's waiting for something to come out. I'd sooner nothing was waiting when it does. Kill it. Come back when you're the size for it.",
    ],
    accept: "I'll kill the red one.",
    acceptLine: "East, a hundred and fifty paces, along the south shore, by the arch. It'll stand up as you come. Its fire goes where it looks: be where it isn't looking. I'll write down how long it takes.",
    decline: 'Not yet.',
    declineLine: "No. You're not the size. Come back when you are; it'll be here. It's patient. So am I.",
    journal: [
      "A red dragon sleeps by the door on the south shore of the lake in the Crown of Teeth, and stands up for whoever comes near it. Yrsa thinks it's waiting for what's through the door to come out. Kill it.",
      "Go back to Yrsa on the shelf, west of the door.",
    ],
    progress: ["South-east, across the ice. Be where it isn't looking."],
    done: [
      "Dead. ...Six hundred and some heartbeats, from its standing up to its lying down for good. I counted. I'll write it after; my hand's not steady.",
      "Now nothing waits by the door but me, and I'm not waiting for what it was. This came off it, or out of it. I'll not touch it. You have it.",
    ],
    after: ["The shore's empty. I keep looking at where it lay. You get used to a thing, in a hundred and ninety-one days. Even a dragon."],
    others: {},
  },

  // ---- the Elder Dragon Gods, through the door on the south shore (Sergeant Hasket's at Cinderford before: src/folk/lines/land.js) ----
  storm_over_the_horn: {
    title: 'A Storm Over the Horn',
    giver: 'yrsa',
    needs: 'red_on_the_shore',
    hint: DELVE_HINT,
    about: "The old map Yrsa copied had a word by the lake in the Crown of Teeth, and the man she copied it for said it meant 'where the gods are kept'. The door on the south shore goes there: the Elder Dragon Gods. Go in, with a company, past the Scale Altar and over the western bridge, and kill the storm god who keeps the Galeward.",
    offer: [
      "The map I copied had a word by this lake. The man I copied for said it was old, for 'the place where the gods are kept'. He didn't want to say which gods. He sold it for four times what he paid me.",
      "That's the door. The warden says nobody goes through it under a hundred winters of steel, with four at their back, and nobody's come back with all four. A hundred and ninety-one days, and nothing's come out. Go in. Tell me what's in it, so I can write it.",
    ],
    accept: "I'll go through the door.",
    acceptLine: "The arch on the south shore. The warden will tell you you're not ready. Listen to him, then go anyway. He says there's an altar inside, with bridges off it, and only the west one opens.",
    decline: 'Not the door.',
    declineLine: "No. Nobody sane would. I'll keep watching it. I'm the other kind.",
    journal: [
      "The old map Yrsa copied says the lake in the Crown of Teeth is where the gods are kept. Go through the door on its south shore, with a company: the Elder Dragon Gods.",
      "Past the Scale Altar, across the western bridge, the Galeward: a storm god keeps it. Kill Thyrraxis, the Gale Eternal.",
      "Go back to Yrsa on the Crown of Teeth.",
    ],
    progress: ["The door on the south shore. Take four with you, and the best four you can pay for."],
    done: [
      "Islands. Hanging over a hole in the sky, and a dragon the size of Greywatch throwing folk off them. ...I'm writing it. My hand's shaking. Isla said it would. She meant the cold.",
      "A god, on an island over nothing, and dead. The map was right, and the man who sold it never believed a word. Here. Nobody's paid you to go in. Somebody should.",
    ],
    after: ["Three more, you said, and one the others answer to. I've a page ready for each. I've not written the headings. That's bad luck."],
    others: {},
  },

  the_hollow_star: {
    title: 'The Hollow Star',
    giver: 'yrsa',
    needs: 'storm_over_the_horn',
    hint: DELVE_HINT,
    about: "Three gods are left on the islands through the door in the Crown of Teeth, and the last is the one the black teeth round the rim belonged to: Nihvaroth, the Hollow Star. Kaldurra over the eastern bridge first, then Morvekh up the Rimespire, then the last bridge, to the Lip of the Maw.",
    offer: [
      "Three more, you said, and one of them the one the others answer to. The map's word for it, the man said, was 'the hole where a star used to be'. He said it wasn't a figure of speech. I copy. I don't believe.",
      "The teeth round this rim are black. Count them; I have. I think they were its. If that thing ever tires of its islands, the first place it comes out is this lake, and I'm sat on the shore of it.",
    ],
    accept: "I'll finish it.",
    acceptLine: "The fire one first, then the cold one: the bridges won't let you past in any other order, you said. Then the last bridge. Come back and tell me it's done. Don't tell me how; I'll only write it down.",
    decline: 'Not yet.',
    declineLine: "No. Get your strength. It's had a long time. It can have a little longer. So can I.",
    journal: [
      "Three gods are left on the islands through the door in the Crown of Teeth. The eastern bridge first: kill Kaldurra, the Hearth of the World.",
      "The north-west bridge, up the Rimespire. Kill Morvekh, Who Remembers the Cold.",
      "The last bridge, to the Lip of the Maw. Kill Nihvaroth, the Hollow Star.",
      "Go back to Yrsa on the Crown of Teeth.",
    ],
    progress: ["Fire, then cold, then the last bridge. I've written the headings now. Don't make me cross them out."],
    done: [
      "It's quiet. I can't say how I know: the ice is the same, the arch is the same. It's quiet. I sat and wrote the time, and then I didn't write anything. The warden came and sat by me. He didn't say I wasn't ready. That's the whole report.",
      "This came out of the door on its own, rolling, over the ice, and stopped at my feet. The warden wouldn't touch it. I won't. I think it's yours.",
    ],
    after: ["I'm going down. In the spring. Isla can take me; she'll want to say she told me so. Somebody should write the last page. I'll write it at the bottom."],
    others: {},
  },

  // ---------------------------------------------------------------- The Heralds (docs/ELDER-DRAGONS.md "On the land")
  a_tooth_of_the_star: {
    title: 'A Tooth of the Hollow Star',
    giver: 'isla',
    needs: ['the_shoulder'],
    about: "Three hundred and eighty paces east of the Broken Stair, on the old palmers' way round the mountain, a black dragon has come down and lies across the path, and the snow round it doesn't shine. Lanterns go dim near it. Isla Crag keeps a candle in the window for whoever is up the mountain, and since it came, the candle won't stay lit. Umbraxes, the Herald of the Hollow Star. Put it down.",
    offer: [
      "I keep a candle in the window for whoever's up the mountain. It's kept since my mother's time. Four nights now it won't stay lit. No draught. It just goes small, and smaller, and out, like something's drinking it.",
      "East, three hundred and eighty paces, on the palmers' way round. A black one, lying across the path. The snow doesn't shine round it. My lantern went to nothing at two hundred paces and came back when I turned round. I'd like my candle back.",
    ],
    accept: "I'll put it down.",
    acceptLine: "It throws black lights that come after you: keep moving and they lose you. When it breathes in, long, everything goes towards it; get far off before it's done. If it marks every one of you, spread out. I'd tell you more. I turned round.",
    decline: 'Not now.',
    declineLine: "No. Then I'll light the candle again tonight, and watch it go out.",
    journal: [
      "East of the Broken Stair on the palmers' way, a black dragon lies across the path, and the light near it goes out. Umbraxes, the Herald of the Hollow Star. Put it down.",
      'Go back to Isla Crag at the Broken Stair.',
    ],
    progress: ["East, on the palmers' way. Keep moving when the black lights come. Get away when it breathes in."],
    done: [
      "It stayed lit last night. All night. I sat up and watched it, like a fool. ...Thank you.",
      "My mother said the Crown up there is a mouth, the pillars round its lake are teeth, and the door at the top is the throat. She said it to keep a child off a ledge. That black one wasn't from the Crown. It was going up to it. Here. It knows the way.",
    ],
    after: ["Candle's lit. If you're up the mountain, it's for you too. It's for whoever."],
    others: {
      ebba: ["Isla's candle's back. She came and told me, which she's never done in her life. You'll have done something."],
    },
  },
};
