// The Rustwood: what its people say (LINES, by their id, as src/folk/lines/land.js) and every word of the quests given
// there (QUESTS, by the quest's id; their workings: src/folk/regions/rustwood.js). Taken into src/folk/lines/land.js.
// Plain folk's, all of it but the abbey: nobody at a camp, the quarry or the cutters' names Velscour or Tessariel, and no
// line anywhere names anything of the one beside anything of the other (README "The two sides"; tests/quests-beyond.test.mjs
// reads every line for it). Brother Caddoc is Tessariel's: he speaks of the order, its watches and its saint, and of
// nothing of his.
//
// Each with a voice of their own (tools/folk/cast.md, "The Rustwood"): Jem Sledge the stone-carter (loads and weights,
// and a thing he hasn't said), Lew Rudd his lodger (says twenty and means four), Marta Rudd the quarry-mistress (reads
// stone, not people), Brother Caddoc the almoner (the rule, and what it doesn't say), Rowan Slate the fire-watcher (a book
// of smokes, by the hour), Hollis Wick the charcoal-burner (slow fire, starved), Dilly Roe the mushroomer (everything's
// food to something), Huw Axton the foreman (his grandfather's rules), Bryn Pitt the sawyer (bottom man in the pit),
// Mother Tibb (a head-count every night), and Corin Vale the outrider (there and back, in hours).
const DELVE_HINT = "The way down won't take one alone: Ensign Wren Aldery, on the terrace beside it, hires out a company.";

export const LINES = {
  // ---------------------------------------------------------------- Stonecarters' Halt
  jem: {
    first: [
      "Somebody on the road. Good. I'd started to think it had shut for good, and nobody'd told me. Jem Sledge. Stone-carter. This is the Halt. The teams stop here before the long pull. That block's my father's, and it stopped here for good.",
    ],
    greet: {
      morning: [
        "Morning. Frost in the block. You can hear it tick.",
        "Nothing came down the road in the night. Nothing went up it either. That's two things I'm sure of.",
      ],
      day: [
        "Carters halt here. That's all it is. A place to stop being on the road.",
        "A yard of freestone's a ton and a half, near enough. You'd be surprised what people think they can carry.",
      ],
      evening: [
        "Fire's lit. That drum's the one seat here that won't walk off.",
        "The rams are in off the down. They go to the ring west of here at dusk, to fight. You'll hear them come in. Everybody hears that.",
      ],
      night: [
        "Keep in by the block. Whatever's out on the down goes round it.",
        "No teams on the road at night. No teams on it by day, either, while there's goblins at the bend.",
      ],
    },
    about: [
      "Jem Sledge. I bring stone down from Ossery on sledges, as my father did and his. Up the knoll to the old tower, down to Bellmourn for anyone who'll pay to be buried under something better than slate.",
      "The Halt's where the teams rest before the long pull. My teams are up at the quarry, eating Marta Rudd's hay and waiting on the road. The road on's had goblins on it since harvest, and I've had a cold fire and a block to sit by.",
    ],
    ask: {
      dead: [
        "My father said a good stone keeps the dead down better than a good priest. He was a carter. He'd have said the same of a good cart.",
      ],
      town: [
        "Bellmourn buys a stone a year, for a grave, and argues the price for a month. The mason there thinks Ossery stone is soft. It is. It's soft till it's laid. Then it's harder than he is.",
      ],
      block: [
        "My father's team bolted at something on the down, with that on the sledge, and went over in the traces. Two oxen and a man. The block didn't move. It's been sat there since, and I've sat by it. There's a lesson in that somewhere. I've never liked it.",
      ],
      ring: [
        "West, two hundred paces, there's a ring where the rams go to fight, and a squared stone lying in the middle of it, long as a sledge. I know every stone between here and the knoll. I've never got near enough to that one to know it.",
      ],
    },
    topics: { block: 'The block', ring: 'The stone in the ring' },
    bye: ["Go steady.", "Mind the sledge going out. Everybody kicks it once."],
    barks: {
      player: ["Mind the sledge.", "Not on the block. Sit on the drum."],
      morning: ["Hear it tick?", "Nothing on the road."],
      day: ["A ton and a half. Near enough."],
      evening: ["The rams are in."],
      night: ["Nothing on the road."],
      magic: ["Not near the block! It's stood long enough without help."],
    },
    shop: {
      open: [
        "I'll buy, and I've a little to sell. A carter's always got something under the sheet. Rolls, a dressing or two. They've been under the sheet a while. So have I.",
        "Put it on the sledge. Anything that'll go on a sledge, I'll give you something for.",
      ],
      closed: ["Not now. I'm watching the road."],
      buy: ["There. Don't drop it on your foot. Everything here's heavier than it looks."],
      sell: ["I'll have that. Weighs nothing. I'll still find somewhere to put it."],
    },
  },

  lew: {
    first: [
      "You came up the down? On your own? ...I came down it. From the quarry. On my own. Well, I ran. Lew Rudd. My mother's the quarry. I mean she keeps it. I'm stopping with Jem a while.",
    ],
    greet: {
      morning: ["Morning. Jem's been up since it was dark. He says the block ticks. I can't hear it. I say I can."],
      day: ["There were twenty of them at the bend. ...There were four. It felt like twenty."],
      evening: ["Jem weighs everybody. He said I was nine stone and a word I'd not said. I don't know how he knew about the word."],
      night: ["I'm not frightened of the dark. I'm frightened of the bend. They're different things."],
    },
    about: [
      "Lew Rudd. Marta Rudd's son, from Ossery Quarry, up the road. I can dress a stone square and I can work the crane, if someone holds the other rope.",
      "She sent me down with a word for Jem. I've been here eight days. I've not said it yet. Don't tell him that. Don't tell her either.",
    ],
    ask: {
      dead: ["My mother says the dead are like a bad seam. You don't argue with it. You cut round it and you don't put your name to that block."],
      town: ["I've been to Bellmourn twice. The second time I got lost. It's not big. I'd just never been anywhere that had corners."],
      mother: [
        "She's the quarry. She reads the face like Jem reads a load. She'll tell you where a stone wants to break before you've touched it. She's never once told me where I want to.",
      ],
    },
    topics: { mother: 'His mother' },
    bye: ["Mind the bend.", "If you see my mother, I'm well. Say I'm well."],
    barks: {
      player: ["Twenty of them. Four."],
      morning: ["I can hear it tick. I can."],
      day: ["The bend's the bad bit."],
      evening: ["Nine stone and a word."],
      magic: ["Do that at the bend! Go on. Do it at them."],
    },
  },

  // ---------------------------------------------------------------- Ossery Quarry
  marta: {
    first: [
      "Grey dust to the knee. That's the down's. You've come up from the Halt, then, and the bend let you. Ours is yellow. Marta Rudd. This is Ossery. Every stone of the abbey up the road came out of that face, and some of Bellmourn's, and I'd tell you which, but you'd not care.",
    ],
    greet: {
      morning: [
        "Morning. Face is dry. You can see the bed in it when it's dry. Wet, it lies to you.",
        "Crane's sound. I look at it first thing. It's the one thing here that'd kill you without meaning to.",
      ],
      day: [
        "If you're selling, put it on the block by the hut. If you're buying, I've rolls, and I've opinions. One of those is free.",
        "Hear that? No. That's the trouble. A quarry's meant to ring.",
      ],
      evening: [
        "Light's going off the face. That's when you see the cracks. Daytime, they hide.",
        "Lew would be coming in about now, covered in dust and pleased with himself. He's at the Halt. I know.",
      ],
      night: [
        "Behind the face, after dark. Scratching. Not a mason's sound. Too quick.",
        "Don't stand under the face at night. Don't stand under it in the day either, but at night I can't see you to shout.",
      ],
    },
    about: [
      "Marta Rudd. Quarry-mistress. My father had it, and his mother. You don't own a quarry. You get the use of it till it falls on you.",
      "Eleven masons cut here, in the good years, and each put his own mark in the face before he lifted a block. A fish, a key, three strokes and a ring. A book of names, in rock. I'm the last name in it that's still working.",
    ],
    ask: {
      dead: [
        "The abbey's dead lie in Ossery stone, under Ossery stone. I cut both. They've never complained. That's more than I can say for the brothers who paid.",
      ],
      town: [
        "There's a man at the inn in Bellmourn who writes to me every year to ask about the marks. Orrin Vey. Long letters. I use them to start the fire. I'd write back, but he'd answer.",
      ],
      marks: [
        "Cut in the face, at the height of a man's eye, where he stood to start. You can tell a left-handed mason by the slant, and a drunk one by the depth. The fish was my grandmother's grandfather. He was both.",
      ],
      stone: [
        "Ossery's freestone. It cuts any way you like, green, out of the bed. Like cheese, the carters say. Then it lies in the air a year and goes hard. It's soft when you need it soft and hard when you need it hard, which is more than you'll say of most things.",
      ],
    },
    topics: { marks: "The masons' marks", stone: 'Ossery stone' },
    bye: ["You'll go down yellow. Everybody does.", "Mind the edge. Masons fell off it sober."],
    barks: {
      player: ["Yellow to the knee now.", "Not under the face."],
      morning: ["Dry. You can see the bed."],
      day: ["A quarry's meant to ring."],
      evening: ["That's when the cracks show."],
      night: ["Scratching. Hear it?"],
      magic: ["Not at the face! It's held a hundred years without your help!"],
    },
    shop: {
      open: [
        "I'll buy. Anything that pays the men I haven't got. And I've rolls and a dressing, for the cuts. You get cuts here. Everybody does.",
        "Put it on the block. I'll weigh it with my eye. My eye's honest. The rest of me's a quarry-mistress.",
      ],
      closed: ["Not now. I'm looking at the face."],
      buy: ["There. Keep it dry."],
      sell: ["I'll take it. Don't watch me price it."],
    },
  },

  // ---------------------------------------------------------------- the Abbey of Saint Ossery
  caddoc: {
    first: [
      "Good noon. ...Is it noon? Near enough. The rule says the dole is given at the gate at noon, and doesn't say to whom. You'll do. Brother Caddoc. Almoner, of Saint Ossery's, which is the ruin behind me. I'm the part of it still standing up.",
    ],
    greet: {
      morning: [
        "Morning. I rang the fourth watch at first light. Nobody answered. Nobody has for years. I ring it anyway. The rule doesn't say anything about being answered.",
        "Eleven loaves baked, as the rule says. Ten of them will be crumbs for the birds by evening. The rule doesn't mention birds either.",
      ],
      day: [
        "The dole's at noon. You've missed it, or you're early, depending how much you want bread.",
        "Mind the drums in the nave. They were pillars. Now they're something to fall over, which is a kind of service.",
      ],
      evening: [
        "I light the lamp in the bell-cote at dusk, for the first watch. It's for the road. There's nobody on the road. It's still for the road.",
        "Vespers. I say them in the nave, because the roof's gone and the saint can hear better.",
      ],
      night: [
        "The third watch is the worst. The order always said so. I find it's the worst because I'm awake for it.",
        "Stay inside the precinct, if you're staying. What's left of the wall still means something, to some of what's out there.",
      ],
    },
    about: [
      "Brother Caddoc. Almoner: I keep the alms. Bread at the gate at noon, and a penny, and the pilgrims' badges, when there are pilgrims. There were thirty brothers when I came. There's me, and the rule, and we get on.",
      "The roof of the nave came in the winter the ringing stopped. The brothers went, by ones and twos, to the other houses. Somebody had to stay and give the dole. I said I would. I was the only one who didn't say it quickly.",
    ],
    ask: {
      dead: [
        "While the four watches were rung, the dead kept their beds. That's the order's teaching, and I've seen nothing to argue with it. I ring the watches here still, on the little bell. Nothing walks inside the wall. Outside it, I don't ask.",
      ],
      town: [
        "Bellmourn sent us its sick, once, up the Abbey Road on carts. We sent them back well, or we buried them here. Now it sends nobody, and I'm told it's healthier. I'm glad.",
      ],
      rule: [
        "Saint Ossery's rule is short. Work, pray, give at the gate, and don't argue with the almoner. I wrote the last part in myself, the year I was made almoner. Nobody's noticed. I take that as consent.",
      ],
      saint: [
        "Ossery was a mason, before. He cut the first stones here himself, out of the hill up the road, and the brothers came to watch him and stayed. Tessariel's houses are mostly built on somebody who stayed.",
      ],
    },
    topics: { rule: 'The rule', saint: 'Saint Ossery' },
    bye: ["Go in peace. Or go in a hurry, but go in peace while you do it.", "The gate's always open. It doesn't shut. It hasn't got a gate."],
    barks: {
      player: ["Good noon.", "The dole's at noon."],
      morning: ["Eleven loaves.", "Nobody answered. I rang it anyway."],
      day: ["Mind the drums."],
      evening: ["The lamp, for the road."],
      night: ["Inside the wall, please."],
      magic: ["Not in the nave. It's had enough happen to it."],
    },
    shop: {
      open: [
        "The almonry will buy, and the almonry will sell. Rolls, and a dressing; we keep both for whoever comes in hurt. The money goes to the dole. The dole's mostly bread. Bread's cheap. I've a great deal of money and nothing to do with it.",
        "Put it on the step. The rule doesn't say I can't haggle. I've looked.",
      ],
      closed: ["Not during the office. Come back after. It's short. I've made it short."],
      buy: ["There. Go carefully with it. Go carefully generally."],
      sell: ["Thank you. It goes to the dole. Whether the dole wants it is the dole's affair."],
    },
  },

  // ---------------------------------------------------------------- Emberwatch
  rowan: {
    first: [
      "One walker, from the south, an hour after noon. No smoke. ...That's you. I'm writing you down. Rowan Slate. I watch the wood for fire, from the beacon, and light it when I see one. Then people come and put it out. Then they did.",
    ],
    greet: {
      morning: [
        "Morning. Four smokes in the night. All theirs. None the wood's. I write them down either way.",
        "Dew's on the beacon. Good. A dry beacon's a beacon somebody lights by mistake.",
      ],
      day: [
        "Smoke's a sentence. Most of them say nothing. A goblin's cook-fire says 'here'. A fire in the wood says 'run'.",
        "Don't stand between me and the south-west. That's the side that talks.",
      ],
      evening: [
        "Seven fires, south-west, about now. Every evening since the spring. Watch. ...There's the first.",
        "There's a lamp at the abbey, south, at dusk. I see it every night. I write it down. It's the only light in the book that isn't a fire.",
      ],
      night: [
        "I sleep in the day. At night I'm the only one awake for a mile, and I'd like to keep it that way.",
        "Don't light anything. Not a pipe. I'll see it, and I'll have to write it down, and I'll have to think about it.",
      ],
    },
    about: [
      "Rowan Slate. Fire-watcher. The wood's dry as tinder three years in four, and when it goes, it goes for miles. I light the beacon; the woodcutters and the colliers and the brothers come with beaters. That was the arrangement.",
      "I keep a book. Every smoke, by the hour, where, how big, which way it leans. Nine years of it. You can read the wood in it like a ledger. This year the ledger's been all debts.",
    ],
    ask: {
      dead: [
        "The dead don't make smoke. It's the one good thing I can say about them. I've never had to write one down.",
      ],
      town: [
        "Bellmourn's too far to see from here. On a clear day there's a haze over it, south-west. That's chimneys. I've never written it down. It isn't mine.",
      ],
      book: [
        "Hour, bearing, size, lean, colour. White's damp wood, or a kitchen. Grey's dry wood. Black's something that oughtn't to be burning. Yellow, I've only seen twice. I've not written down what it was. I wrote 'yellow'.",
      ],
      beacon: [
        "Pitch-pine, laid crossways, a fathom high, under a hood so the rain can't get it. When I light it they see it at the abbey, at the cutters', at the Hearth. They used to. I've lit it nine times this year. Nobody came.",
      ],
    },
    topics: { book: 'The book', beacon: 'The beacon' },
    bye: ["Go on. Mind what you burn.", "If you make a fire out there, make it small. I'll know."],
    barks: {
      player: ["One walker. No smoke."],
      morning: ["Four smokes. All theirs."],
      day: ["Not between me and the south-west."],
      evening: ["There's the first of the seven."],
      night: ["Don't light anything."],
      magic: ["Put it out! ...Is it out? I have to write it down now."],
    },
    shop: {
      open: [
        "I'll buy. Up here, anything's worth something. I've rolls, and a dressing for burns, which you'll want before you want the rolls.",
        "Put it by the beacon, not on it.",
      ],
      closed: ["Not now. I'm counting smokes."],
      buy: ["There. Keep it away from sparks."],
      sell: ["I'll write it down. I write everything down."],
    },
  },

  hollis: {
    first: [
      "You'll be the one who doesn't smell of smoke. Make the most of it. Hollis Wick. Collier. I burnt charcoal in the wood, nine days to a clamp, no flame. Then the wood burnt me, in an afternoon, all flame.",
    ],
    greet: {
      morning: ["Morning. Fire's a servant if you starve it. I've told her. She knows. She lets me say it."],
      day: ["A good burn's nine days and you never see a flame. You see a flame, you've failed. The wood's been failing all year."],
      evening: ["Look at them. Seven fires, all flame. No skill in it at all."],
      night: ["I don't sleep much. A collier sleeps by his clamp, with one ear open. I've no clamp. The ear's still open."],
    },
    about: [
      "Hollis Wick. I had four clamps in the wood east of the abbey, and a hut, and a wife who said I'd burn us both one day. The whelps did it. She's at the Hearth. I'm here. We write.",
      "I fetch for the beacon now. Pitch-pine, split, stacked under the hood. It's the opposite of my trade. I'm laying a fire to be seen.",
    ],
    ask: {
      dead: ["Charcoal's wood that's died slow, with no air. Ash is wood that's died quick, with too much. I've thought about which is better for a man. I've not decided."],
      town: ["Every smith in Bellmourn's burnt my charcoal. Not one's ever asked where it came from. That's the trade. You're good when you're not thought of."],
      basket: ["The mushroomer at the ring sends me a basket a week, for a sack of charcoal I burnt her once. I'm not owed it. I'd still like to know why it stopped."],
    },
    topics: { basket: 'The basket' },
    bye: ["Mind the sparks.", "Go slow. Slow burns longest."],
    barks: {
      player: ["You don't smell of smoke."],
      morning: ["Starve it."],
      day: ["Nine days. No flame."],
      evening: ["All flame. No skill."],
      magic: ["That's wasteful. All that, and nothing cooked."],
    },
  },

  // ---------------------------------------------------------------- the Fungal Ring
  dilly: {
    first: [
      "Don't step on that. Or that. ...You can step on that, it's only bad. Dilly Roe. I pick here. Somebody came to draw the ring and left his tent, so I live in it. He'll not want it back. People who leave here quick don't come back slow.",
    ],
    greet: {
      morning: [
        "Morning. Caps up in the night. Fifteen. I count them. They count me, I think.",
        "Dew's on the ring. That's when you pick. Dry, they bruise.",
      ],
      day: [
        "Everything's food to something. I just like to be early.",
        "Selling? I'll buy. I sell to the herb-wives in Bellmourn, a basket a fortnight, and I'll sell them anything that's been near me.",
      ],
      evening: [
        "It glows a little, at dusk. The big ones. Don't tell the herb-wives. They'll want them, and they mustn't have them.",
        "Hear it? No. You never hear it. You smell it change. There. Sweeter.",
      ],
      night: [
        "Don't sleep near the ring with your mouth open. I don't say why. I say it.",
        "The soldier on the terrace stays awake all night. She says it's her orders. I think it's the smell.",
      ],
    },
    about: [
      "Dilly Roe. Mushroomer. Chanterelle, hedgehog, chicken-of-the-wood, morel in a good year. I know which kill you, and which only make you wish they had. The ring I don't pick. Nobody picks the ring.",
      "My gran picked the Rustwood all her life. She said a ring's the fruit of one growth, under the ground, as wide as the ring. This one's fifty paces across. Gran didn't come here. I've started to see why.",
    ],
    ask: {
      dead: [
        "The dead rot like anything else. Slower. Something's got to do it. I'd not want to be the thing that does it. I'd want to be the thing after.",
      ],
      town: [
        "Bellmourn's herb-wives pay well and ask nothing. I like that in a buyer. I like it in most people.",
      ],
      ring: [
        "Every one of them's the height of a man, or more. They don't rot. They don't get eaten. Nothing lays eggs in them. A cap that nothing wants is a cap I want nothing to do with.",
      ],
    },
    topics: { ring: 'The ring' },
    bye: ["Mind your feet.", "Wash your hands before you eat. Wash them twice if you've been near the ring."],
    barks: {
      player: ["Don't step on that!", "That one you can step on."],
      morning: ["Fifteen up in the night."],
      day: ["Everything's food to something."],
      evening: ["Smell it change?"],
      night: ["Mouth shut. I don't say why."],
      magic: ["Not near the caps! They like that. I can tell."],
    },
    shop: {
      open: [
        "I'll buy. I've rolls, and a dressing. The dressing's got moss in it. Good moss. I know my moss.",
        "Put it on the crate. Not that crate. That's his. He'll not want it, but it's his.",
      ],
      closed: ["Not now. I'm sorting. Good pile, bad pile, don't-touch pile."],
      buy: ["There. Don't eat it."],
      sell: ["I'll take it. Smells of you. That'll wear off."],
    },
  },

  // ---------------------------------------------------------------- the Woodcutters' Camp
  huw: {
    first: [
      "The brother sent you. He sends everybody this way, and not one of them can fell a tree. Huw Axton. Foreman. Twelve men in this camp, at the spring. Five now, and four of those I'd swap for one good one. Welcome to the Woodcutters'. It's a camp. It's not much of one.",
    ],
    greet: {
      morning: [
        "Morning. My grandad said never fell before the dew's off. I've never known why. I've never done it.",
        "Smoke from the west again. That's Redtooth's. I'd know their smoke anywhere. It's my wood.",
      ],
      day: [
        "A tree falls where it leans. So does a man. Look where you lean.",
        "If you're selling, put it on the stack. If you're buying, I've rolls and a dressing, for the axe-cuts. The lads don't cut themselves often. They cut each other.",
      ],
      evening: [
        "Men in from the felling about now. Five of them. I count the axes in, not the men. The men can look after themselves.",
        "Look east. The big oak, over the rest. My grandad said never fell it. That's the one rule of his I've kept without asking.",
      ],
      night: [
        "Keep in by the fire. There's things in the wood that don't mind fire, but they don't like being looked at.",
        "Something goes out of the east at dusk and back before light. I've never seen it go. I've seen it come back.",
      ],
    },
    about: [
      "Huw Axton. My grandad was foreman here, and my da, and they roofed half the Rustwood and Bellmourn's barns. We cut oak for beams, ash for shafts, and the brash goes to the colliers, when there are colliers.",
      "Grandad had rules. Never fell before the dew's off. Never leave an axe in a tree overnight. Never fell the Hanging Tree. I've broken the second. I'll tell you what came of it another time.",
    ],
    ask: {
      dead: [
        "Grandad said you can tell a dead man's coffin by the grain: it runs the wrong way, because they cut it in a hurry. I make them slow. Nobody's ever thanked me. Nobody's ever been in a position to.",
      ],
      town: [
        "Bellmourn's tithe barn is our oak. Four hundred years old, they say. It's ninety. My grandad cut it. They don't like hearing it.",
      ],
      tree: [
        "The big oak east, over the others. Grandad said never fell the Hanging Tree, and said it the way you'd say don't touch the stove. I always took it for a hanging. Nobody in the Rustwood remembers one. That's not proof. It's not nothing.",
      ],
    },
    topics: { tree: 'The Hanging Tree' },
    bye: ["Mind the stumps.", "Look where you lean."],
    barks: {
      player: ["Can you fell? No.", "Off the stumps."],
      morning: ["Not till the dew's off."],
      day: ["A tree falls where it leans."],
      evening: ["Count the axes in."],
      night: ["There it goes, east."],
      magic: ["Not near the stacks! That's a month's work!"],
    },
    shop: {
      open: [
        "I'll buy. Anything. The camp's short of everything but wood. I've rolls, and a dressing. We go through dressings.",
        "Put it on the stack. Not the sawn stack. Bryn'll have your hand off.",
      ],
      closed: ["Not now. I'm counting axes."],
      buy: ["There. Keep the edge on it."],
      sell: ["I'll have it. Goes on the tally."],
    },
  },

  bryn: {
    first: [
      "Ned? ...No. You're not Ned. You walk like him, from behind. Bryn Pitt. I'm the bottom sawyer. Top man stands on the log and gets the air; bottom man stands in the pit and gets the dust. I'm bottom man, and there's been no top man since July.",
    ],
    greet: {
      morning: ["Morning. I've swept the pit. I sweep it every morning. Then I stand in it and don't saw anything."],
      day: ["Two men to a saw. One to a sawyer. I'm one man and a saw, and the saw's not saying much."],
      evening: ["I count my boards at dusk. Huw counts his axes. We've each got something to count. It's a comfort."],
      night: ["Don't fall in the pit. It's not deep. You'll still feel a fool."],
    },
    about: [
      "Bryn Pitt. Sawyer. You'll know my boards: every barn door between here and the downs. Huw says I can't tell good wood from bad. I can tell it. I just like the bad ones better.",
      "My top man was Ned Strake. He went to Bellmourn in July for a new saw. He didn't come back, and nor did the saw. I'd forgive him the one.",
    ],
    ask: {
      dead: ["Huw makes the coffins. I cut the boards. He says that makes him the craftsman. I say it makes me the one who's never seen who's in them."],
      town: ["Ned went to Bellmourn. I hope he's there. I hope the saw's not."],
    },
    bye: ["Mind the pit.", "Shake your boots. That's my dust."],
    barks: {
      player: ["Not Ned. No."],
      morning: ["Swept it."],
      day: ["One man and a saw."],
      evening: ["Thirty-one boards. Thirty."],
      magic: ["Do that to the log! It'd save me a morning."],
    },
  },

  // ---------------------------------------------------------------- Last Hearth
  tibb: {
    first: [
      "Thirty-one. ...You. Thirty-two. I count everyone at the fire, every night. That's the job. Mother Tibb. Nobody's mother, as it goes. This is Last Hearth. It's the last one lit, this side of the March. I keep it lit.",
    ],
    greet: {
      morning: [
        "Morning. Thirty-one last night. I'll know tonight's at dusk. I don't guess.",
        "The fire's in. It's never out. It came here in a pot from my own hearth, the night that burned. It's not been out since.",
      ],
      day: [
        "There's work, if you're stopping. There's always work. Wood, water, and somebody to sit with Ada, who won't stop talking.",
        "Sell to me, if you've anything. I'll pay. Somebody here will want it, even if it's only to hold.",
      ],
      evening: [
        "Dusk. Stand still while I count. ...Thirty-one. And you. Good.",
        "Look south. Their fires at Sootpit. Those are mine too. They came for coals and took them.",
      ],
      night: [
        "Don't let the fire go down. If you're awake, you're on it. That's the rule here. There's only the one.",
        "Some nights I count thirty-two and there's only thirty-one of us. I count again. It comes right.",
      ],
    },
    about: [
      "Mother Tibb. I had a steading in the wood, east of the cutters', for fifty years. The wood burnt. I carried my hearth-fire out in a pot, and sat down here, and lit it again. People came to it. People do.",
      "Everybody here's from a steading that burnt, or a road that stopped. I count them in at dusk. When the count's short, Corin goes out. When it's long, I give whoever it is a blanket and don't ask.",
    ],
    ask: {
      dead: [
        "A fire's only a fire. It's who's round it. The dead don't come round it. That's the one thing I can say for a fire you've kept in fifty years: it knows who it's for.",
      ],
      town: [
        "Bellmourn's a long way west for an old woman. I've never been. They tell me it has a wall. I've a fire. We'll see which lasts.",
      ],
      count: [
        "Thirty-one. Ada, the Pell boy, the Strakes, the three from Foxley, and so on round. I could tell you each by the back of the head. Mostly, that's how I see them. They face the fire.",
      ],
    },
    topics: { count: 'The count' },
    bye: ["Back by dusk. I'll be counting.", "Mind the fire going out. The fire, not you."],
    barks: {
      player: ["Thirty-two.", "Stand still. I'm counting."],
      morning: ["Never out."],
      day: ["Wood, water, Ada."],
      evening: ["Thirty-one. And you."],
      night: ["You're awake. You're on it."],
      magic: ["Not near the fire! It's older than you!"],
    },
    shop: {
      open: [
        "I'll buy anything. I've rolls, and a dressing, and nothing else, and I'd give those away if I could afford to.",
        "Put it by the pot. Not in the pot.",
      ],
      closed: ["Not now. I'm counting."],
      buy: ["There. Don't tell Ada what you paid."],
      sell: ["I'll take it. Somebody here will want it."],
    },
  },

  corin: {
    first: [
      "You came from the cutters'? Past the Hanging Tree? Then you came the short way, and you're still in one piece. Corin Vale. Outrider, for the Hearth. I go out and I come back. That's the job. The coming back's the part they pay for.",
    ],
    greet: {
      morning: ["Morning. Back at four. Road east's clear to the March stone. Past it, I couldn't say. I didn't go past it."],
      day: ["My horse is at Marchfoot. She went on without me in the spring. She's eating better than I am, and I don't blame her."],
      evening: ["Mother's counting. Stand still or she starts again."],
      night: ["Out at midnight, back by four. If I'm not, she'll count me short, and then she'll come out herself, and nobody wants that."],
    },
    about: [
      "Corin Vale. I carried letters on the Marches road, before. Bellmourn to the March stone and back, nine days with the horse. Now it's the Hearth to the March stone, on foot, and nobody's writing.",
      "I go out when the count's short. I find who's missing, or I find what's left of the road where they were. Then I come back and tell Mother. She writes nothing down. She doesn't forget either.",
    ],
    ask: {
      dead: ["I've passed the dead on the road. They don't look at you. They look at where they were going. It's the one thing I like about them. They've still got somewhere to be."],
      town: ["Bellmourn's mail was the best-paid leg of the run. I never once had a letter going the other way. Nobody east writes to Bellmourn. I used to wonder why."],
    },
    bye: ["There and back.", "If I'm not in by four, don't wait up. Mother will."],
    barks: {
      player: ["Past the tree? Good."],
      morning: ["Back at four. Clear to the stone."],
      day: ["She's eating better than I am."],
      evening: ["Stand still. She's counting."],
      magic: ["Save that for the road."],
    },
  },
  // (Hester Pyke, at Marchfoot, is the Marches': src/folk/lines/regions/east.js. What she says to Corin's word is in its
  // quest's `others`, below.)
};

export const QUESTS = {
  // ================================================================ Stonecarters' Halt (Jem Sledge; Lew Rudd)
  the_butting_ground: {
    title: 'A Stone in the Ring',
    giver: 'jem',
    about: "Jem Sledge has said yes to the Bellwright: a yard of stone, up the knoll. There's a squared stone lying in the middle of the Butting Ground, two hundred paces west, that would save him the quarry. The rams and goat men that fight there, and the great horned one, won't let him near it. Empty it.",
    offer: [
      "I told the old one in white yes. A yard of stone, up his knoll. I've no stone. The quarry's up a road with goblins on it. But west, two hundred paces, in the ring where the rams fight, there's a squared stone lying in the middle. Somebody squared it. Somebody'll have wanted it.",
      "I've never been near enough to look. The rams go there to fight, and goat men with them, and a big one over them all, with horns like a pair of ploughs. Empty it, and I'll walk out and see what I've got. If it's freestone, I'm a day's work from done.",
    ],
    accept: "I'll empty the Butting Ground.",
    acceptLine: "Two hundred paces west, along the trodden way. Don't stand in front of anything with horns. Stand to the side. My father said that about oxen.",
    decline: 'Not now.',
    declineLine: "Then I'll go up the road to the quarry. When there's a road.",
    journal: [
      "There's a squared stone in the middle of the Butting Ground, two hundred paces west of Stonecarters' Halt, that Jem Sledge would sooner take up the knoll than go to the quarry for. Rams and goat men hold the ring, under a great horned one. Empty it, the big one and all.",
      "Go back to Jem Sledge at Stonecarters' Halt.",
    ],
    progress: [
      "West, two hundred paces. The ring. Stand to the side of anything with horns.",
    ],
    done: [
      "Empty? Then I'll go and— ...I went. While you were coming back. Grey. Grey all through, and a long way off square when you're stood beside it. Rubble-stone, squared by somebody who'd been told what square was. You couldn't hang a gate on it, let alone a bell.",
      "So it's the quarry after all, and the road with the goblins on it. I'd have been a day from done. ...Here. My father's goad. I've a team, up at the quarry, eating hay. When I've a stone to put behind it, I'll want a goad. I'll cut a new one.",
    ],
    after: [
      "The rams have gone off the down. I walked out to the ring and sat on their stone. It's a good stone to sit on. That's what it's for, I think. Somebody squared it to sit on.",
    ],
  },

  the_bend: {
    title: 'The Bend',
    giver: 'lew',
    about: "Lew Rudd came down from Ossery Quarry with a word for Jem Sledge, and ran the last of it: red goblins sit at the bend of the Abbey Road, four hundred and fifty paces north-east of the Halt, and come at anything that passes. Put down three of them.",
    offer: [
      "At the bend. On the Abbey Road, north-east, where it goes into the red trees. Twenty of them. ...Four. Red ones, the big kind, with iron on. They came out of the bracken at me and I dropped what I had and I ran. I'm a good runner. I'd not known.",
      "Nothing comes down from the quarry while they're there. Nothing goes up. Jem's teams are stood in my mother's yard eating her hay, and that's my fault, or theirs. Put three of them down, and it's theirs.",
    ],
    accept: "I'll go to the bend.",
    acceptLine: "Four hundred and fifty paces, up the road. You'll know the bend. There's a stone by it I sat on, going down, before I knew. Don't sit on it.",
    decline: 'Not yet.',
    declineLine: "No. They'll still be there. They're very good at being there.",
    journal: [
      "Red goblins sit at the bend of the Abbey Road, four hundred and fifty paces north-east of Stonecarters' Halt, and nothing passes them. Put down three.",
      "Go back to Lew Rudd at Stonecarters' Halt.",
    ],
    progress: [
      "Four of them at the bend. Three's enough, he says. He'd have settled for one.",
    ],
    done: [
      "Three? At the bend? ...Then it's open. Then I've no reason not to. Listen. My mother sent me down with a word for Jem. 'Tell Jem the quarry's shut.' I've been here eight days not saying it. He keeps looking up the road.",
      "Don't tell him. Not yet. Let him have the road open a day first. Here: it's what was in my pockets when I ran. I kept it because I'd kept it.",
    ],
    after: [
      "I've not told him. He's sending you up there anyway. If she's shut, she can tell you herself. She's better at it.",
    ],
  },

  a_yard_of_freestone: {
    title: 'A Yard of Freestone',
    giver: 'jem',
    needs: ['the_butting_ground', 'the_bend'],
    about: "The stone in the Butting Ground was rubble. Jem Sledge needs a yard of freestone for the Bellwright's frame after all, from Ossery Quarry, a quarter-hour up the Abbey Road, now the bend is open. Ask Marta Rudd for it. And tell her that Lew is at the Halt.",
    offer: [
      "A yard of freestone. The only stone that'll do is Ossery's, and the only one who'll cut it is Marta Rudd, and the only way to her is up the road you've just opened. My teams are up there already. They'll be glad of the walk back.",
      "Go up and ask her. Tell her it's for the knoll, and that I'm paying, which she'll not believe. And tell her Lew's at the Halt. He'll not tell her himself. He's been meaning to tell me something for a week.",
    ],
    accept: "I'll go to the quarry.",
    acceptLine: "Up the Abbey Road, north-east, past the bend. A cut cliff on your left, with a crane. A quarter-hour, a bit over. Mind the edge.",
    decline: 'Not yet.',
    declineLine: "Then the old one waits on his knoll, and I wait here. He's better at it.",
    journal: [
      "Jem Sledge needs a yard of freestone for the Bell Tower after all. Go up the Abbey Road, past the bend, to Ossery Quarry, ask Marta Rudd for it, and tell her that Lew is at the Halt.",
    ],
    progress: [
      "Up the road to the quarry. A yard of freestone. And Lew.",
    ],
    done: [
      "A yard, for the knoll? And Lew's at the Halt. I know; I sent him. 'Tell Jem the quarry's shut.' Shut to carts, I meant, while there's goblins at the bend. He's not said it. He'll have sat on it a week, and on a stone at the bend first.",
      "And you've come up through the bend, so it's not shut. There. That's my answer, and Lew's, and Jem's. His yard's on the bench by morning; his teams can take it down. Here. And now you're up, you can do something about my face.",
    ],
    after: [
      "Jem's yard went down the road this morning behind his own team. Lew walked beside it, all the way to the bend, and sat on the stone there, and came back. I didn't ask.",
    ],
    others: {
      marta: [
        "A yard, for the knoll? And Lew's at the Halt. I know; I sent him. 'Tell Jem the quarry's shut.' Shut to carts, I meant, while there's goblins at the bend. He's not said it. He'll have sat on it a week, and on a stone at the bend first.",
        "And you've come up through the bend, so it's not shut. There. That's my answer, and Lew's, and Jem's. His yard's on the bench by morning; his teams can take it down. Here. And now you're up, you can do something about my face.",
      ],
    },
  },

  // ================================================================ Ossery Quarry (Marta Rudd)
  ossery_quarry: {
    title: "The Masons' Marks",
    giver: 'marta',
    about: "Every stone of Saint Ossery's was cut at this quarry, and each mason cut his own mark in the face before he lifted a block: a book of names in rock. Kobolds are tunnelling in behind the face from the spoil heaps north-east of it, and if it falls, the marks go with it. Put down four of them.",
    offer: [
      "Eleven masons cut here, in the good years, and each cut his own mark in the face at the height of his eye before he lifted a block. A fish, a key, three strokes and a ring. A book of names, in rock. There's a bookman in Bellmourn would give his eyes for it.",
      "Kobolds. Behind the face, coming in from the spoil they've heaped up past it. They tunnel. I hear them at night. If the third bench goes, the marks go with it, and I'll not cut new ones. Put them down. Four will do; the rest will take the hint.",
    ],
    accept: "I'll go behind the face.",
    acceptLine: "Round the end of the face, north-east, a hundred and eighty paces, where they've tipped their spoil. Don't climb the face to get there. Masons fell off it sober.",
    decline: 'Not now.',
    declineLine: "Then I'll listen to them another night. The face has stood a hundred years. It'll stand a night. It's me that's tired.",
    journal: [
      "Kobolds are tunnelling in behind the face at Ossery Quarry, where the masons cut their marks. Their spoil is heaped a hundred and eighty paces north-east, round the end of the face. Put down four of them.",
      "Go back to Marta Rudd at the quarry and tell her the face stands.",
    ],
    progress: [
      "North-east, round the end of the face. Four of them. Don't climb.",
    ],
    done: [
      "Four? And the face? ...I went and looked while you were at it. The third bench is sound. The marks stand. The fish, the key, the strokes, the ring. And low down, by the key, a little one, a hammer with a crooked haft. Cut shallow. A child's.",
      "That's mine. My grandmother let me cut it when I was Lew's age. I'd forgotten I'd been let. Here. And don't tell the bookman. He'll want to come and see it, and he'll stand under the face.",
    ],
    after: [
      "I've told Lew about the hammer. He wants to cut one. I said when he can dress a stone square without being told twice. So, never. He's cutting it anyway. Low down, by mine.",
    ],
  },

  orefall: {
    title: 'Orefall',
    giver: 'marta',
    about: "Orefall Delve, west of Ossery Quarry, is an old iron working the masons dug themselves. Rust-coloured kobolds hold it now, under a foreman and a shaman, and they come over the hill at night for the quarry's iron: wedges, feathers, the crane's pins. Empty Orefall, every one of them.",
    offer: [
      "They don't take stone. Stone's no use to them. They take what cuts it. Wedges, feathers, the pins out of the crane, the bar I kept the hut shut with. A quarry without its iron's a hill. I've a hill.",
      "It's the red ones, from Orefall, west. Two hundred and seventy paces, over the rise. An old working; they've a foreman, and one that does things with blue light. Empty it. All of them. I want my iron, and I want the hill quiet.",
    ],
    accept: "I'll empty Orefall.",
    acceptLine: "West, over the rise, two hundred and seventy paces. There's a trodden way; they made it, carrying my iron. Kill the one in charge. The rest of them don't stop till he does.",
    decline: 'Not yet.',
    declineLine: "Then I'll cut with what I've got. Which is a mallet and opinions.",
    journal: [
      "Rust-coloured kobolds from Orefall Delve, two hundred and seventy paces west of Ossery Quarry, carry off the quarry's iron by night. Empty Orefall: every one of them, their foreman too.",
      "Go back to Marta Rudd at the quarry.",
    ],
    progress: [
      "West, over the rise. All of them, and the one in charge. Then my iron.",
    ],
    done: [
      "Empty. And my iron's lying about it. ...Orefall. You know who dug it? We did. My great-grandfather's father, for the cramps that hold the abbey's stones together. The masons' own working, and I'd let it go to them. I'd never been. It was over the rise.",
      "Here. My mother's leather. She wore it at the face thirty winters and it's turned a chisel more than once. It's no use to me: I'm the shape of a quarry-mistress now, and it was cut for a mason.",
    ],
    after: [
      "I've been over the rise. I've put a bar across Orefall's mouth. Ours, with our mark on it. They'll be back. They'll know whose it was.",
    ],
  },

  stone_for_the_nave: {
    title: 'Stone for the Nave',
    giver: 'marta',
    needs: 'orefall',
    about: "Ossery Quarry is working again, and Marta Rudd has always cut for the abbey. Go up the Abbey Road to the Abbey of Saint Ossery and ask Brother Caddoc what it needs. Half way, something big hangs in the trees over the road with two small black drakes about it, and the carters won't go under: put two of them down on the way.",
    offer: [
      "I cut for the abbey, as my mother did and hers. Every year till the roof came in. Since then, nobody's asked. The almoner's still up there, I hear. One brother, in a ruin, giving bread at a gate. That's a man who wants stone, whether he knows it or not.",
      "Go up and ask him what he needs. It's the best part of half an hour up the road. Half way, under the big trees, there's a thing hangs over it, wings like a sail, and two little black drakes that go about it like dogs. The carters won't go under. Put two of them down as you pass.",
    ],
    accept: "I'll go to the abbey.",
    acceptLine: "North-east, up the Abbey Road, past the goat men by the road. Under the big trees half way: look up. Then on, to the gate. He'll be at it. He always is.",
    decline: 'Not yet.',
    declineLine: "Then I'll cut for nobody. I've done it before. It's very restful.",
    journal: [
      "Something big hangs in the trees over the Abbey Road, half way from Ossery Quarry to the abbey, with two small black drakes about it. Put down two of them.",
      "Go on up the Abbey Road to the Abbey of Saint Ossery and ask Brother Caddoc, at the gate, what the abbey needs.",
    ],
    progress: [
      "Up the road. Look up, under the big trees. Two of them. Then the almoner, at the gate.",
    ],
    done: [
      "Marta Rudd? Asking what we need? ...A roof. A nave. Twenty-nine brothers. A wall. I'll settle for the wall. And you came under the trees, with the thing in them? Then you've done the road a kindness. The road will be grateful. I've found roads are.",
      "Tell her— no, I'll write. She likes my letters. She uses them to start the fire, I'm told. Here, from the dole. And since you're at the gate, and it's noon, or near enough: there's work.",
    ],
    after: [
      "I've written to Marta Rudd. Four pages. She'll have a good fire.",
    ],
    others: {
      caddoc: [
        "Marta Rudd? Asking what we need? ...A roof. A nave. Twenty-nine brothers. A wall. I'll settle for the wall. And you came under the trees, with the thing in them? Then you've done the road a kindness. The road will be grateful. I've found roads are.",
        "Tell her— no, I'll write. She likes my letters. She uses them to start the fire, I'm told. Here, from the dole. And since you're at the gate, and it's noon, or near enough: there's work.",
      ],
    },
  },

  // ================================================================ the Abbey of Saint Ossery (Brother Caddoc)
  pilgrims_lead: {
    title: "Pilgrims' Lead",
    giver: 'caddoc',
    about: "The pilgrims' path to the Abbey of Saint Ossery runs through a web-wood four hundred paces north-west of it, and spiders live there now. Pilgrims who came this year dropped their lead badges in it, the ones Brother Caddoc cast and gave them at the gate. Bring him five, from round the outside.",
    offer: [
      "I cast the badges myself, in the almonry: a little lead hand, the saint's, with a hole for a string. A pilgrim who's walked here gets one at the gate. This year I gave out nine. Not one of the nine has written from the next house on. Somebody always writes.",
      "The path north-west goes through a wood the spiders have strung, four hundred paces out. I've seen lead in the leaves there, catching the light. I'd like them back. Not for the lead. Go round the outside. Don't go in to the middle for my sake.",
    ],
    accept: "I'll bring the badges.",
    acceptLine: "North-west, along the pilgrims' path, four hundred paces, to where the trees are white with it. They'll be lying round the edge, I think. Lead falls where it's dropped. It doesn't wander. That's what I like about lead.",
    decline: 'Not now.',
    declineLine: "Then I'll cast more. I've a great deal of lead, and the rule says I'm to give them. It doesn't say they have to come back.",
    journal: [
      "Pilgrims dropped their lead badges in the spiders' web-wood on the path four hundred paces north-west of the Abbey of Saint Ossery. Find five, round the outside of it.",
      "Bring the badges back to Brother Caddoc at the abbey's gate.",
    ],
    progress: [
      "North-west, the pilgrims' path, the white trees. Five badges, round the edge. Not the middle.",
    ],
    done: [
      "Five. Let me see. ...That one I cast crooked and gave to a woman from Millhaven. That one's the Hames boy's: he chewed it. And this isn't mine: a little bell, the chapel's, on the fen. Strung beside a shrine-token, white. Somebody was walking the round.",
      "All the houses. The chapel, the shrine, here. Nobody's walked the whole round since I was a novice. It takes a summer. ...Then they dropped it here, at the last of them. Here. From the dole. I'm going to sit for a while.",
    ],
    after: [
      "I've hung the bell on the gate. If they come back for it, it'll ring. If they don't, it'll ring anyway, in the wind, and I'll go and look every time.",
    ],
  },

  the_kiln: {
    title: 'Lime',
    giver: 'caddoc',
    about: "The brothers' lime-kiln, four hundred paces south of the abbey, is held by robed fire-callers who call it the Kiln Coven. They come up by night and carry away the abbey's fallen stone, and burn it. Empty the Kiln Coven, and the one who leads it.",
    offer: [
      "The nave fell in, and the stone lies where it fell. Drums of pillars. Blocks from the clerestory. I've counted them every morning since. Every morning there are fewer. Stone doesn't walk. I've asked it.",
      "South, four hundred paces, the brothers built a lime-kiln, for the mortar. Robed ones have it now. They come in the night with a barrow, and in the morning there's smoke over the kiln, and a block fewer. They're burning my abbey. Into lime. Please stop them.",
    ],
    accept: "I'll empty the kiln.",
    acceptLine: "South, down the old cart-way, four hundred paces. You'll see the smoke. They'll throw fire at you; it's what they do instead of talking. The one who leads them stands back and calls it down. I'd start with him.",
    decline: 'Not yet.',
    declineLine: "Then I'll count again tomorrow. Counting's the one thing I've never run short of.",
    journal: [
      "Robed fire-callers hold the brothers' lime-kiln, four hundred paces south of the Abbey of Saint Ossery, and burn the abbey's fallen stone in it. Empty the Kiln Coven: every one of them, the one who leads them too.",
      "Go back to Brother Caddoc at the abbey's gate.",
    ],
    progress: [
      "South, the smoke. They throw fire. The one who stands back first.",
    ],
    done: [
      "Empty. And the kiln's cold? ...Ossery stone burns to the best lime in the land. The brothers knew. That's why the kiln's there. They burnt the waste from the quarry and mortared the abbey with its own dust. I'd hoped nobody else knew. Somebody did.",
      "Here, from the dole. I've a great deal of it and nothing to spend it on. And I'll go down tomorrow with a barrow, and bring back what they hadn't burnt. A drum at a time. It'll take me a year. I've a year.",
    ],
    after: [
      "Four drums back up the cart-way. One a week. I've stood them in the nave where they came from. Not on each other. I'm not a mason. Just near.",
    ],
  },

  the_red_larder: {
    title: 'The Red Larder',
    giver: 'caddoc',
    needs: 'pilgrims_lead',
    about: "West of the abbey, three hundred paces, red spiders have taken the hollow where the infirmarer hung his herbs to dry, and silked it like a larder: the Red Larder. Brother Caddoc wants it emptied, every one of them and the great one that keeps it.",
    offer: [
      "The infirmarer hung his herbs in a hollow west of the wall, out of the wind. Feverfew, comfrey, yarrow for cuts. Every dressing I sell at the gate has his yarrow in it. Had. I'm down to the last of it, and the dressings are mostly cloth now, and good intentions.",
      "Red spiders have the hollow. They've silked everything in it. Three hundred paces west. Empty it, the big one too, and I'll go down after and see what's left of his. He left in a hurry. The infirmarer did everything in a hurry but dry herbs.",
    ],
    accept: "I'll empty the Larder.",
    acceptLine: "West, three hundred paces, past the old wall's end. The trees go dead, and then white. The big one keeps to the middle. The little ones come out to you. Don't let them get behind.",
    decline: 'Not now.',
    declineLine: "Then I'll sell cloth, and call it a dressing. The saint was a mason. He'd understand a bodge.",
    journal: [
      "Red spiders hold the hollow three hundred paces west of the Abbey of Saint Ossery, where the infirmarer hung his herbs, and have silked it like a larder: the Red Larder. Empty it, the great one that keeps it too.",
      "Go back to Brother Caddoc at the abbey's gate.",
    ],
    progress: [
      "West, three hundred paces, where the trees go dead and white. The big one's in the middle.",
    ],
    done: [
      "Empty? I went down behind you. His herbs are past saving. But under where he hung them: yarrow. A bed of it, thick, where the seed-heads shook down through the silk ten years. He never sowed a thing in his life. He dried it badly, and it sowed itself.",
      "This was the abbey's rule, copied fair. I've the old one by heart. It ought to go out of the gate with somebody who'll be at the other houses. Take it. And there's a road north to the fire-watch; I've a word for it.",
    ],
    after: [
      "I've dug a clump of his yarrow and set it by the gate, where the dole's given. It'll come up in the spring, in the way of everybody's feet. Yarrow likes that. It was made for being trodden on.",
    ],
  },

  the_first_watch: {
    title: 'The First Watch',
    giver: 'caddoc',
    needs: 'the_red_larder',
    about: "Brother Caddoc lights a lamp in the bell-cote at dusk, for the first watch, as the order always did, and the fire-watch at Emberwatch, north, used to answer it with a light. Go to Rowan Slate there and ask if she still sees it. Goat men have sat down beside the lane north, five hundred paces out: put down two on the way.",
    offer: [
      "When I came here, a novice, I lit the lamp in the bell-cote at dusk, and from the north there'd be a light back, a little one, from the fire-watch on its hill. The order called it the answer. It was only the watcher, being civil. It stopped. I've gone on lighting mine.",
      "Go north and ask her, the watcher, if she sees it still. That's all. It's not the same as being answered, but it's something. Up the lane north, five hundred paces out, goat men have sat down beside it. They'll want something for letting you by. Don't give it them.",
    ],
    accept: "I'll ask the fire-watch.",
    acceptLine: "North, up the lane, five hundred paces to the goat men, and on north and a little west, up to the beacon on the hill. A quarter-hour, if the goat men let you.",
    decline: 'Not yet.',
    declineLine: "Then I'll light it again tonight, and not know. I've had practice.",
    journal: [
      "Goat men sit beside the lane north of the Abbey of Saint Ossery, five hundred paces out. Put down two of them.",
      "Go on north to Emberwatch and ask Rowan Slate, the fire-watcher, if she still sees Brother Caddoc's lamp at dusk.",
    ],
    progress: [
      "The goat men by the lane, two of them down, then north to the beacon. Does she see the lamp?",
    ],
    done: [
      "His lamp? ...I see it. Every dusk, south, a little after the sun's off the beacon. I write it down. Nine years of it. The only light in the book that isn't a fire. I'd stopped answering because nobody came when I lit the big one. I'd not thought he'd notice a small one stopping.",
      "Tell him— no. I'll do it. Tonight. The hand-lamp, on the hood of the beacon, at dusk. He'll see it. Here. And since you've walked up my hill: I've a book full of smoke that wants seeing to.",
    ],
    after: [
      "I lit the hand-lamp at dusk. His came on after mine. A breath after. He'd been waiting. I've written it in the book. 'Answered.' First time I've used the word.",
    ],
    others: {
      rowan: [
        "His lamp? ...I see it. Every dusk, south, a little after the sun's off the beacon. I write it down. Nine years of it. The only light in the book that isn't a fire. I'd stopped answering because nobody came when I lit the big one. I'd not thought he'd notice a small one stopping.",
        "Tell him— no. I'll do it. Tonight. The hand-lamp, on the hood of the beacon, at dusk. He'll see it. Here. And since you've walked up my hill: I've a book full of smoke that wants seeing to.",
      ],
    },
  },

  timber_for_a_roof: {
    title: 'Timber for a Roof',
    giver: 'caddoc',
    needs: 'white_inside',
    about: "Brother Caddoc means to roof the nave of the Abbey of Saint Ossery again, with no money to do it. Take word to Huw Axton, the foreman at the Woodcutters' Camp, a long way south-east. Half way, a great spider and its brood sit in the wood by the road: put down two of them.",
    offer: [
      "I said a roof, and I meant it, and I've eaten a mushroom since, so I'll believe anything of myself. A roof. A nave's only a field with walls until it has one. Oak, for the beams. The Woodcutters' Camp roofed it last time.",
      "I've no money. I've a great deal of dole, which is bread. Ask Huw Axton anyway. A foreman likes to be asked. The road south-east is long, a quarter-hour and the half of another, and half way there's a nest in the wood by it, a big one and its young. Two of them, at least.",
    ],
    accept: "I'll ask the woodcutters.",
    acceptLine: "South-east from the gate, through the wood. Half way, where it goes quiet, look about you: the big one sits off the road. Then on, to the fire and the stumps. Huw's the one counting.",
    decline: 'Not yet.',
    declineLine: "Then the nave stays a field. The saint's slept under the sky before. He was a mason. They do.",
    journal: [
      "Half way along the road south-east from the Abbey of Saint Ossery, a great spider and its brood sit in the wood. Put down two of them.",
      "Go on to the Woodcutters' Camp and tell Huw Axton that Brother Caddoc wants timber for a roof, and has no money.",
    ],
    progress: [
      "South-east. Two of the nest, half way. Then the foreman: a roof, and no money.",
    ],
    done: [
      "A roof. For the nave. And no money. ...My grandad roofed that nave. He said the brothers paid him in prayers, and the prayers were short weight. He said it every winter. He also said it was the best oak he ever cut, and he'd cut it again for nothing.",
      "I'll not say I'll do it for nothing. I'll say I'll do it. The money we'll talk about when I've something to cut it with: half my men are gone, and their axes are stood in the felling with goblins round them. You came through the nest. Stay and help.",
    ],
    after: [
      "I've marked six oaks for the brothers' roof. Grandad's mark, a cross-cut and a notch. I've not told the lads. They'd want paying.",
    ],
    others: {
      huw: [
        "A roof. For the nave. And no money. ...My grandad roofed that nave. He said the brothers paid him in prayers, and the prayers were short weight. He said it every winter. He also said it was the best oak he ever cut, and he'd cut it again for nothing.",
        "I'll not say I'll do it for nothing. I'll say I'll do it. The money we'll talk about when I've something to cut it with: half my men are gone, and their axes are stood in the felling with goblins round them. You came through the nest. Stay and help.",
      ],
    },
  },

  // ================================================================ Emberwatch (Rowan Slate; Hollis Wick)
  seven_fires: {
    title: 'Seven Fires',
    giver: 'rowan',
    about: "Every evening since spring, Rowan Slate has written down seven fires, south-west of Emberwatch, three hundred and sixty paces off: a warband of red goblins, six and a big one in iron. Put down five of them.",
    offer: [
      "Seven fires, south-west, every evening since the spring. I've written them down every evening. Seven. Same place, same hour, same size. A wood fire wanders. These don't. They're cook-fires, and they're goblins', and there are seven of them because there are seven goblins.",
      "Six, and one in iron, bigger, that the others go round. Three hundred and sixty paces. I can see them from here. I've watched them so long I could tell you which one burns his supper. Put five of them down. I'd like to write a smaller number.",
    ],
    accept: "I'll go to the fires.",
    acceptLine: "South-west, down the hill. Three hundred and sixty paces. They'll come at you all together: they're a band, not a crowd. The big one comes last and hits hardest.",
    decline: 'Not now.',
    declineLine: "Then it's seven again tonight. I'll write it. I've got a good seven.",
    journal: [
      "A warband of red goblins sits at seven fires three hundred and sixty paces south-west of Emberwatch. Put down five of them.",
      "Go back to Rowan Slate at Emberwatch.",
    ],
    progress: [
      "The seven fires. Five down. They come all together.",
    ],
    done: [
      "Five. ...I'll write it tonight. Two fires, or none, if the others have the sense to run. I've never written 'none' for the south-west. Nine years. I'm not sure the book knows how.",
      "Here. And the third thing, while you're up: there's a fire I've never seen lit. I've seen everything it lights.",
    ],
    after: [
      "I wrote 'none'. Then I sat up all night to be sure it was true. It was. I've never been so tired, and I've never written a better word.",
    ],
  },

  cinderbed: {
    title: 'Cinderbed',
    giver: 'rowan',
    about: "Rowan Slate has traced every fire in the wood this year back to one place by the lean of its smoke: Cinderbed, three hundred and fifty paces east of Emberwatch, a bed of whelps under an ash drake, where she can't see for the one tree she never cut. Empty it, the drake too.",
    offer: [
      "Twenty-three fires in the wood this year. Not theirs, at the seven fires: the wood's. I've drawn every one on the back page, where it started, which way it leaned. Draw a line back from each. They all go east, three hundred and fifty paces. To one place.",
      "I can't see it. There's an ash tree there I never cut, because I liked it, and it's stood in the way of the one place in the wood I needed to see. Whelps. A bed of them, and something bigger, older, grey with it. Empty it. The big one too.",
    ],
    accept: "I'll empty Cinderbed.",
    acceptLine: "East, down the far side, three hundred and fifty paces. Past my ash. The ground goes black, and warm under your feet. They'll breathe fire; get behind something that doesn't burn. There isn't much.",
    decline: 'Not yet.',
    declineLine: "Then there'll be a twenty-fourth. I'll draw it. My lines will all still go east.",
    journal: [
      "Every fire in the Rustwood this year leans back to Cinderbed, a bed of whelps under an ash drake, three hundred and fifty paces east of Emberwatch, behind the one tree Rowan Slate never cut. Empty it, the drake too.",
      "Go back to Rowan Slate at Emberwatch.",
    ],
    progress: [
      "East, past the ash. The ground goes black. The grey one too.",
    ],
    done: [
      "Empty. The grey one dead. ...I'll cut the ash tomorrow. I liked it for nine years and it hid that from me for one. That's about the usual trade, with things you like.",
      "This was in the beacon's ash pit when I came here. A small skull, horned. I took it for a goat's. I'd sooner you had it now. The road on's to the ring, north-west, through Brandfast. Hollis has a word for the ring. He's had it a while.",
    ],
    after: [
      "No fires this week. The wood's still dry. It's only that nothing's lighting it. I keep looking east. There's no tree there now, and I can see all the way.",
    ],
  },

  through_brandfast: {
    title: 'Through Brandfast',
    giver: 'hollis',
    needs: 'cinderbed',
    about: "Dilly Roe, the mushroomer at the Fungal Ring, used to leave Hollis Wick a basket of whatever was up, on the path, once a week. Since the fire-callers sat down at Brandfast, two hundred and fifty paces down that path, nothing has come. Empty Brandfast on the way, and ask Dilly after his basket.",
    offer: [
      "There's a woman picks at the ring, north-west. Dilly Roe. I burnt her a sack of charcoal once, for drying, and she's paid me for it every week since: a basket on the path, whatever's up. Ceps. Chanterelles. One I'm not to eat, at the bottom, for a joke. I know which.",
      "Then the robed ones came and sat down at Brandfast, two hundred and fifty paces down the path, and no basket. Either she's stopped, or they've had it. Empty it: all of them, the one who leads them too. Then ask her. I'd like to know which. I'd sooner it was them.",
    ],
    accept: "I'll go through Brandfast.",
    acceptLine: "North-west, down the path, two hundred and fifty paces to their circle. Fire out of their hands; keep moving. Then on, the same way, seven hundred more, to the ring. You'll smell it before you see it. Sweet.",
    decline: 'Not yet.',
    declineLine: "Then I'll eat what the beacon's hill grows, which is heather. Slowly.",
    journal: [
      "Robed fire-callers hold Brandfast, two hundred and fifty paces down the path north-west of Emberwatch. Empty it: every one of them, the one who leads them too.",
      "Go on north-west to the Fungal Ring and ask Dilly Roe after Hollis Wick's basket.",
    ],
    progress: [
      "Brandfast, down the path. All of them. Then the ring, and Dilly Roe, and a basket.",
    ],
    done: [
      "His basket? I've put it out every Friday. At the turn of the path. Every Friday it's gone by night. I thought he was fetching it. ...It was them. Sat in a circle eating ceps. And the one at the bottom, that he knows to leave.",
      "They'll not have known to leave it. ...Well. Here. You came through them, so that's paid. And you'd best take him a basket yourself, one day. I'll pack it. I'll leave the joke out. I've lost the taste for it.",
    ],
    after: [
      "I've put his basket out again. Friday, at the turn of the path. It was gone this morning, and the cloth left folded, the way he folds. He's fetching it, then.",
    ],
    others: {
      dilly: [
        "His basket? I've put it out every Friday. At the turn of the path. Every Friday it's gone by night. I thought he was fetching it. ...It was them. Sat in a circle eating ceps. And the one at the bottom, that he knows to leave.",
        "They'll not have known to leave it. ...Well. Here. You came through them, so that's paid. And you'd best take him a basket yourself, one day. I'll pack it. I'll leave the joke out. I've lost the taste for it.",
      ],
    },
  },

  // ================================================================ the Fungal Ring (Dilly Roe)
  morels_on_the_burn: {
    title: 'Morels on the Burn',
    giver: 'dilly',
    about: "Morels come up on burnt ground, and the ground round the Burnt Hollow, the whelps' bed three hundred paces north of the Fungal Ring, is all burn. Dilly Roe wants five, from round its edge, out of the whelps' way.",
    offer: [
      "Morels. The best eating in the wood. They come up on burnt ground, the spring after a fire, never the same year. The Burnt Hollow, north, three hundred paces, is nothing but burn. The whelps keep it that way. Lie in it, warm.",
      "I went up to the edge and it's thick with morels. Thick. This year's burn. That's wrong, but they're morels, and the herb-wives pay double. Bring me five, from round the edge. Don't go in to the whelps. I can't pay that much.",
    ],
    accept: "I'll pick the morels.",
    acceptLine: "North, three hundred paces, up past the ring. The ground goes black. Morels are a cap like a honeycomb on a white stalk. Pick low. Don't pull. And mind the whelps; they lie where it's warmest.",
    decline: 'Not now.',
    declineLine: "Then the whelps can have them. They'll not eat them. Nothing eats them. That's the trouble.",
    journal: [
      "Morels have come up on the burnt ground round the Burnt Hollow, the whelps' bed three hundred paces north of the Fungal Ring. Pick five, round its edge, out of the whelps' way.",
      "Bring the morels back to Dilly Roe at the Fungal Ring.",
    ],
    progress: [
      "North, the black ground. Five morels. Pick low. Mind the whelps.",
    ],
    done: [
      "Five. Good ones. Let me— ...Cut one. Here. Look inside. A morel's hollow, white inside, always. This one's violet. They're all violet. That's the ring's colour, inside the caps on the hill. They're not the fire's. They're coming up from under. It's reaching.",
      "I'll not sell these. I'll burn them tonight. Here: for the walk. And there's a way down, by the ring. The soldier on the terrace says so. I think somebody ought to go and see how far it goes.",
    ],
    after: [
      "I burnt them. Violet smoke. Rowan wrote it down, I expect. I'd like to know what she wrote. I'd like it to be a word I know.",
    ],
  },

  cap_and_leg: {
    title: 'Cap and Leg',
    giver: 'dilly',
    about: "Down the Fungal Ring's west cheek, two hundred paces from it, a brood of spiders and mould-coloured kobolds has the ground Dilly Roe used to pick, under a great red spider. Put down four of them.",
    offer: [
      "The west side of the hill, down in the trees, was my best ground. Hedgehogs, chanterelles, a chicken-of-the-wood the size of a shield. I've not picked it since the spring. Spiders came, and little ones with them, kobolds, the colour of a bad cheese.",
      "Two hundred paces, down the west cheek. There's a big one, red, with legs like a gate. Put down four of them, any four. I'd like my hedgehogs.",
    ],
    accept: "I'll clear the west side.",
    acceptLine: "West, down the cheek of the hill, two hundred paces, into the trees. They don't come up to the ring. They don't like it either. That's the one thing we've got in common.",
    decline: 'Not now.',
    declineLine: "Then I'll pick the east side again. There's nothing on the east side. I've picked it bare.",
    journal: [
      "A brood of spiders and mould-coloured kobolds holds the ground two hundred paces down the Fungal Ring's west cheek. Put down four of them.",
      "Go back to Dilly Roe at the Fungal Ring.",
    ],
    progress: [
      "West, down the cheek. Four of them. The big red one's legs like a gate.",
    ],
    done: [
      "Four. And my ground? ...You saw it? Every cap on it cut. Low, at the foot, clean, the way you're meant to, so it fruits again. Not eaten. Cut. The little ones were picking. Picking for something.",
      "That's not a brood. That's a garden, with somebody gardening it. Here: for the walk, and the hedgehogs. And if there's a gardener under that hill, I'd like to know about her before she comes up to see who's been picking her ground.",
    ],
    after: [
      "I picked the west side this morning. Hedgehogs, two baskets. I left one cap standing, at the foot of every clump. Gran said always leave one. I used to think it was for the next year.",
    ],
  },

  the_ring_below: {
    title: 'The Ring Below',
    giver: 'dilly',
    needs: 'morels_on_the_burn',
    hint: DELVE_HINT,
    about: "Whatever the Fungal Ring fruits from reaches three hundred paces under the ground. There's a way down beside it now, into the Sporehold. Go under with a company, and kill the thing that howls there: Mouldfang, in his den down the west way.",
    offer: [
      "You saw the morels. Violet. Gran would have had something to say about that, and then gone home. I'm not going home. I've nowhere else to pick that's this good, which is the trouble with it.",
      "A man camped here to draw it and left his tent. I live in it. There's a way down beside it now, where the ground fell in, with a soldier stood at it. I want to know what's under. Not to pick. To know. And something howls down there. I'd deal with the howling first.",
    ],
    accept: "I'll go under the ring.",
    acceptLine: "The way down's on the terrace by the ring, south-west of the tent. The soldier hires a company; go with one. Touch nothing that glows. The howling's west, she says, and down. Deal with that, and come up and tell me.",
    decline: 'Not under a mushroom.',
    declineLine: "Put like that, no. I'd not either. I'll go on picking round it, which is safer and worse.",
    journal: [
      "There is a way down beside the Fungal Ring, into the Sporehold. Go in, with a company.",
      "Something howls under the ring. Kill Mouldfang, in his den down the west way.",
      "Go back up to Dilly Roe at the Fungal Ring.",
    ],
    progress: [
      "Down by the terrace, with a company. West, and down, for the howling.",
    ],
    done: [
      "A hollow hill. One growth, all through it, wearing wolves. Wearing kobolds. Wearing people. Stood rooted where they stopped, you say, and turning their heads. ...Give me a moment. I asked to know, and now I do.",
      "Take this. The man who left the tent left it in the tent. I can't read it. You've been under a hill for a question. You'll read it.",
    ],
    after: [
      "I've moved the tent. Ten paces. Further from the ring. It's not far enough. I'm not sure where far enough is. I'm sure it isn't ten paces.",
    ],
  },

  what_it_fruits_from: {
    title: 'What It Fruits From',
    giver: 'dilly',
    needs: 'the_ring_below',
    hint: DELVE_HINT,
    about: "The growth under the Fungal Ring has hands: the wolf was one, and the woman who tends its pods is another. Under the Sporehold, Mother Morel gardens it; past her, the Heart of the Ring keeps itself shut while it has hands left. Kill the gardener, then the heart.",
    offer: [
      "I sat up all night. A thing like that has one heart. Everything else is hands. The little ones picking my west side: hands. The wolf: hands. The woman tending pods down there: a big hand. Cut off hands and it grows more. I know that much. I've cut a lot of hands.",
      "So it has to be the heart. In the middle, or past it, shut tight while it has hands to work with. Kill the gardener first; then it'll open; then kill what she gardens for. And I'd like to see the hill bare. I've never wanted to see bare ground before.",
    ],
    accept: "I'll find its heart.",
    acceptLine: "East from the great cavern for the gardener. Then north, where it was shut. If it has things rooted round it, feeding it, cut those first. That's not learning. That's weeding. Gran would have known.",
    decline: 'Not again.',
    declineLine: "No. Once was more than I'd a right to ask. But it's fifty paces now, and three hundred under, and it grows.",
    journal: [
      "The growth under the Fungal Ring has a gardener. Kill Mother Morel, in her bower up the east way of the Sporehold.",
      "With both its keepers dead the Heart of the Ring is open, north of the great cavern. Kill it.",
      "Go back up to Dilly Roe at the Fungal Ring.",
    ],
    progress: [
      "The gardener, east. Then the heart, north. Weed first, if it's rooted.",
    ],
    done: [
      "Dead. All of it? You're sure: the caps on the hill will tell us, by autumn. If they don't come up, you're sure. And the burn. If the morels come up white next spring, you're sure twice.",
      "I've nothing worth a hill. Have this: it was the man's, in the tent, leant in the corner. I only kept it because I couldn't lift it properly. And I'll move the tent back, I think. Ten paces. Where it was.",
    ],
    after: [
      "No caps on the hill this autumn. Bare ground, fifty paces across, and the soldier stood by a hole with nothing in it. I picked the west side. Hedgehogs. White inside. I cut every one to look.",
    ],
  },

  white_inside: {
    title: 'White Inside',
    giver: 'dilly',
    needs: ['morels_on_the_burn', 'cap_and_leg'],
    about: "Brother Caddoc gave Dilly Roe bread at his gate the year she came to the Fungal Ring, and has never let a cap of hers through it. Take him the first hedgehogs off the west side since it was cleared: white inside, not the ring's. It's near half an hour back down to the abbey, and the red goblins are back at their fires on the way: put down two.",
    offer: [
      "The brother at the abbey gave me bread at his gate, the year I came, and a dressing for my hands. I offered him a basket after. He wouldn't have it through the gate. Nothing off the ring, he said; the old almoner said it came in on the pilgrims' boots.",
      "These are off the west side, since you cleared it. I've cut every one. White, not violet: not the ring's. Take him these, and tell him where they're from. It's near half an hour down. The red ones are back at their seven fires, on your way: Rowan's had to write a seven again.",
    ],
    accept: "I'll take them to the abbey.",
    acceptLine: "South-east, back past the beacon's hill, and down past the fires. Two of them, if they get up. Then on to the gate. Don't eat any on the way. They're good. That's not the same as yours.",
    decline: 'Not yet.',
    declineLine: "Then I'll dry them. They'll keep. He's kept longer.",
    journal: [
      "The red goblins are back at their seven fires, on the way down from the Fungal Ring to the abbey. Put down two of them.",
      "Go on to the Abbey of Saint Ossery and give Brother Caddoc Dilly Roe's hedgehogs, white inside, from the west side of the ring.",
    ],
    progress: [
      "Down past the fires, two of them. Then the gate, and the brother, and a basket.",
    ],
    done: [
      "Mushrooms? From the ring? ...From the west side, white. Cut, to show me. I've not let a cap through this gate in thirty years. The old almoner said the ring's dust came in on boots. Thirty years, and she's cut them in half to make me see it.",
      "I'll eat one. At noon, at the gate, where the dole's given, so it's seen. ...If I can be wrong thirty years about a mushroom, I can be wrong about what a roof costs. Come back to the gate.",
    ],
    after: [
      "I ate one at noon, at the gate. Nobody saw. The rule doesn't say anybody has to.",
    ],
    others: {
      caddoc: [
        "Mushrooms? From the ring? ...From the west side, white. Cut, to show me. I've not let a cap through this gate in thirty years. The old almoner said the ring's dust came in on boots. Thirty years, and she's cut them in half to make me see it.",
        "I'll eat one. At noon, at the gate, where the dole's given, so it's seen. ...If I can be wrong thirty years about a mushroom, I can be wrong about what a roof costs. Come back to the gate.",
      ],
    },
  },

  // ================================================================ the Woodcutters' Camp (Huw Axton; Bryn Pitt)
  on_the_felling: {
    title: 'Axes in the Trees',
    giver: 'huw',
    about: "Red goblins came on Huw Axton's men at the felling, up the hill a hundred and seventy paces south of the Woodcutters' Camp, and the men ran and left their axes. The goblins sit among them yet. Bring four of the axes back.",
    offer: [
      "My grandad had a rule. Never leave an axe in a tree overnight. I broke it. Not me: the lads. Red goblins came out on the felling one afternoon, up the hill, south, and the lads ran, and left eight axes where they stood. They've been there a month. So have the goblins.",
      "A hundred and seventy paces. Five of them, the big kind, sat about where the axes are. I'll not send the lads back. Bring me four; the heads catch the light, you'll see them. I'll fetch the rest when there's nobody sat on them.",
    ],
    accept: "I'll fetch the axes.",
    acceptLine: "South, up the hill, a hundred and seventy paces. Look for the glint. They're sat right among them, so you'll not get the axes without the goblins. Mind the edges. They were sharp when the lads ran.",
    decline: 'Not now.',
    declineLine: "Then the axes stay up there. They're good at it. That's the trouble with a good axe.",
    journal: [
      "Red goblins sit on the felling a hundred and seventy paces south of the Woodcutters' Camp, among the axes Huw Axton's men left when they ran. Bring back four of the axes.",
      "Bring the axes back to Huw Axton at the Woodcutters' Camp.",
    ],
    progress: [
      "South, up the hill. Four axes, where they glint. The goblins sit among them.",
    ],
    done: [
      "Four. ...A month, and not one of them touched? Grandad said a red goblin will steal the teeth out of your head, but it won't touch an axe that's been left. I thought he said it so we'd not leave them. He said it because it's true.",
      "Here. And the other half of what he said, since you've earned it: an axe left out overnight is an axe that's been looked at. You don't fell with it again. You hang it over the door. I've eight axes to hang and one door.",
    ],
    after: [
      "Eight axes over the cabin door. It looks like a war. The lads won't go in under it. They say it's grandad's rules. I say it's grandad's door.",
    ],
  },

  the_hanging_tree: {
    title: 'The Hanging Tree',
    giver: 'huw',
    about: "Huw Axton has been told all his life never to fell the Hanging Tree, the great oak two hundred and eighty paces east of the Woodcutters' Camp. Now something goes out of it at dusk and comes back before light, and the lads won't work past four. Empty it: great bats, and a greater one.",
    offer: [
      "The big oak, east, over the rest. Never fell the Hanging Tree, grandad said, and I never have. I've never wanted to. But something goes out of it at dusk and over the camp, low. The lads down tools at four now, to be in by the fire before it goes. I lose two hours a day to it.",
      "I've seen it come back, before light: big, and black, and folded up. Two hundred and eighty paces east. Empty it. I'll not fell it. I'll have my two hours back, and the tree can stand there as long as it likes, with nothing in it.",
    ],
    accept: "I'll go to the Hanging Tree.",
    acceptLine: "East, two hundred and eighty paces. You can't miss it; it's the one the others lean away from. Go by day. Whatever it is, it's home by day.",
    decline: 'Not now.',
    declineLine: "Then the lads go in at four. They like going in at four. I'll not get them out of it now.",
    journal: [
      "Something goes out of the Hanging Tree, the great oak two hundred and eighty paces east of the Woodcutters' Camp, at dusk, and comes back before light. Empty it: whatever roosts there, the greatest of them too.",
      "Go back to Huw Axton at the Woodcutters' Camp.",
    ],
    progress: [
      "East, the one the others lean away from. Go by day. They're home by day.",
    ],
    done: [
      "Bats. Hung up in it by day, like washing. And a big one. ...Bryn heard you say it. He's stood there with his hat off. He says bats don't roost in a sound oak; they roost in a hollow one. So it's hollow, he says. Seventy foot of oak with a chimney up it.",
      "No use to anybody. Nobody ever felled it because there was nothing in it to fell. ...He's right. He can tell bad wood. I've said for ten years he can't. I'll have to tell him. Here: my da's leather, for the felling. Don't tell him I said so first.",
    ],
    after: [
      "I told Bryn he was right. He went down in his pit and didn't come up till dark. I think he was pleased. You can't tell, with a sawyer. They spend their lives looking up.",
    ],
  },

  a_load_for_last_hearth: {
    title: 'A Load for Last Hearth',
    giver: 'bryn',
    needs: 'the_hanging_tree',
    about: "Bryn Pitt saws more boards than he sells, and puts the cracked ones by on the stump stack, which Huw calls firewood. He's loaded a cart of them for Last Hearth, east, where the burnt-out people need roofs over them. Go ahead past the Hanging Tree and tell Mother Tibb they're coming.",
    offer: [
      "Huw says I can tell good wood from bad, now. He's said it once. I keep the bad. Shakes, the cracked ones, on the stump stack. He says burn them. A shake's no good for a barn door. But it's fine for a wall you only need till spring.",
      "There's a woman east, at Last Hearth, keeps a fire for people burnt out of the wood. Thirty of them, sleeping under whatever they carried in. I've a cart of shakes loaded. Go ahead and tell her. It's ten minutes, past the tree. The tree's quiet now. I'll follow with the cart.",
    ],
    accept: "I'll go to Last Hearth.",
    acceptLine: "East, past the Hanging Tree, ten minutes. You'll see her smoke. It's the only smoke out there that's somebody's, and not something's.",
    decline: 'Not yet.',
    declineLine: "Then I'll take them myself, and she'll not know who I am, and I'll stand there with a cart of bad boards. You see why I'd sooner you went.",
    journal: [
      "Go east from the Woodcutters' Camp, past the Hanging Tree, to Last Hearth, and tell Mother Tibb that Bryn Pitt is bringing a cart of boards. The cracked ones.",
    ],
    progress: [
      "East, past the tree, to Mother Tibb. Boards, cracked, for walls.",
    ],
    done: [
      "Boards? The cracked ones? ...Wait. I've to say this right. Everything they sleep under here has a gap in it. The wind comes through the gaps, and the children sleep in the wind. A cracked board's a board. It keeps the wind out as well as a sound one.",
      "Whoever he is, tell him thirty-one people will sleep out of the wind tonight. Thirty-two. You're counted. Here: it's what I've got. And there's work at this fire, if you're stopping. There always is.",
    ],
    after: [
      "The cart came. A sawyer drove it, and stood by it with his hat in his hand while they unloaded, and wouldn't come to the fire. He kept the worst board back. He said it was his favourite.",
    ],
    others: {
      tibb: [
        "Boards? The cracked ones? ...Wait. I've to say this right. Everything they sleep under here has a gap in it. The wind comes through the gaps, and the children sleep in the wind. A cracked board's a board. It keeps the wind out as well as a sound one.",
        "Whoever he is, tell him thirty-one people will sleep out of the wind tonight. Thirty-two. You're counted. Here: it's what I've got. And there's work at this fire, if you're stopping. There always is.",
      ],
    },
  },

  // ================================================================ Last Hearth (Mother Tibb; Corin Vale)
  dropped_on_the_way: {
    title: 'Dropped on the Way',
    giver: 'tibb',
    about: "Everyone who came to Last Hearth from the burnt steadings came in past the Shroudwood, three hundred paces north, and dropped something on the way. Spiders have the Shroudwood now. Mother Tibb wants five things from round its edge: she knows whose each one is.",
    offer: [
      "They came in from the north, mostly, out of the steadings that burnt. Past the Shroudwood, because it's the short way and they were running. Everybody who runs drops something. A spoon. A shoe. A thing they'd carried half their life and didn't notice going.",
      "The Shroudwood's spiders' now; nobody goes near. Three hundred paces north. Go round the edge, where the trail goes in, and bring me five things lying there. Any five. I'll know whose. I'll give them back. Some of them will cry, and that's all right.",
    ],
    accept: "I'll find what was dropped.",
    acceptLine: "North, three hundred paces, to where the trees go dead and grey with it. Round the edge. Don't go in. What's dropped will be at the edge; nobody running went in.",
    decline: 'Not now.',
    declineLine: "Then it lies there. It's lain there all summer. Things are patient. People aren't.",
    journal: [
      "Those who came to Last Hearth from the burnt steadings dropped things on the way, past the Shroudwood, three hundred paces north. Find five, round the outside of it.",
      "Bring them back to Mother Tibb at Last Hearth.",
    ],
    progress: [
      "North, the grey trees. Five things, round the edge. Not inside.",
    ],
    done: [
      "Five. Let me see. ...A spoon: Ada's. A clog: the Pell boy's, and he's been in one clog since May and said nothing. A comb: one of the Foxley three. A whistle. Mine. I didn't know I'd dropped it. And this. A linchpin. Off a cart.",
      "That's off the Tolley cart. The Tolleys had the only cart. Six of them on it, and their gran. The Tolley cart didn't come in. ...Here. It's what I've got. Go and see Corin. She went in, once. She'll not have told you.",
    ],
    after: [
      "I gave Ada her spoon. She cried. The Pell boy took his clog and put it on and walked about in two clogs all day as if he'd always had them. The linchpin's by the fire. I look at it when I count.",
    ],
  },

  the_shroudwood: {
    title: 'The Shroudwood',
    giver: 'corin',
    needs: 'dropped_on_the_way',
    about: "The Tolley cart, six people and their gran, never came in to Last Hearth from the steadings, and its linchpin lay at the edge of the Shroudwood, three hundred paces north. Corin Vale went in after it once, saw things hung in the trees, and came out. Empty the nest, then what keeps the wood, further in.",
    offer: [
      "Mother's shown you the linchpin. ...I went in. In June. Fifty paces, through the grey, with a torch, calling. Two bundles hung in the dead trees, the size of people. Things moving behind them. And further in, something big, that I didn't wait to look at properly. I came out.",
      "I'm an outrider. Going in and coming back is what I do. I came back. I didn't do the other half. Empty the nest. Then on in, for the big one: a hundred paces past it. And look at what's hung. I need to know what's hung.",
    ],
    accept: "I'll empty the Shroudwood.",
    acceptLine: "North, three hundred paces, where the trees go grey. In past where the things were dropped. The nest first; the big one keeps further in, a hundred paces on. Look at the bundles. Then come and tell me. Don't make a face first. Just say.",
    decline: 'Not yet.',
    declineLine: "No. I didn't either. I'd like to have gone back on my own. I'd like to like myself. Neither's going to happen this week.",
    journal: [
      "The Tolley cart never came past the Shroudwood, three hundred paces north of Last Hearth; its linchpin lay at the edge. Empty the nest there, and look at what's hung in it.",
      "Further in, a hundred paces past the nest, something greater keeps the Shroudwood, with its brood round it. Put down three of them.",
      "Go back to Corin Vale at Last Hearth.",
    ],
    progress: [
      "North, the grey trees: the nest, and what's hung. Then further in, for the big one. Then say it plain.",
    ],
    done: [
      "The bundles. ...Deer, the one. A dog, the other, a big brindle, and I know whose; it wasn't a Tolley's. None of it was a Tolley. Nothing in there was. Then they didn't go in. Then they went round. Seven of them, and the gran walking slow. They went round.",
      "Then they're somewhere. Not here. Somewhere. That's a road with an end to it, and I can ride a road. I'll walk it, then. Here: my staff. I carried it on the March for the dogs. I'll want my hands free for a while. I'll be looking.",
    ],
    after: [
      "I've been north, past the Shroudwood, on to the burnt steadings, and east. There's a track. Seven, and one walking slow, going east. Mother's put the linchpin in her apron. She says when they come in she'll give it back. She says when.",
    ],
  },

  over_the_march: {
    title: 'Over the March',
    giver: 'corin',
    needs: 'the_shroudwood',
    about: "Marchfoot, east over the March, sends the people who come down its road on to Last Hearth, and Last Hearth is full. Take Corin Vale's word to Hester Pyke there: eleven more, and no more. Knights in grey sit off the way, under the March: put down two of them as you go.",
    offer: [
      "Marchfoot's where the road comes down off the March, east. Hester Pyke keeps the fire there, like Mother does here. People come down off the March with nothing, and Hester sends them west to us. She's sent sixty since the spring. Mother's counted every one.",
      "Mother can take eleven more. She says so, and she's never said a number she didn't mean. Eleven, and then no more till the spring. Somebody has to tell Hester, and I'm going north after a track. East, a quarter-hour and over. Grey knights sit off the way, under the March.",
    ],
    accept: "I'll go over the March.",
    acceptLine: "East, and a little south, to where the grey knights sit under the March. Put two down; they stop anyone coming down to us. Then on, and down to Hester's fire, the one with people round it. Tell her eleven. She'll ask if it can be twelve. It can't.",
    decline: 'Not yet.',
    declineLine: "Then Hester sends twelve, and Mother takes twelve, and nobody gets a blanket. Somebody'll have to tell her.",
    journal: [
      "Knights in grey sit off the way east from Last Hearth, under the March, and stop whoever comes down it. Put down two of them.",
      "Go on east to Marchfoot and tell Hester Pyke that Last Hearth will take eleven more, and no more.",
    ],
    progress: [
      "East, two of the grey knights under the March, then Hester Pyke's fire. Eleven. Not twelve.",
    ],
    done: [
      "Eleven. ...I've thirty at this fire who came down off the March this week. Thirty. And Tibb says eleven, and she means it, and she's right. I'll have to choose. Tell her I hate her for it. No. Don't. Tell her I'll send them in the morning.",
      "You came from the Hearth? Then you'll have the road east in your legs already. Stop a while. There's a deal of road east, and none of it's empty.",
    ],
    after: [
      "Corin says they went: eleven, in the morning, with Hester's own cart. Mother counted them in. She said 'forty-two' and then she said nothing for an hour.",
    ],
    others: {
      hester: [
        "Eleven. ...I've thirty at this fire who came down off the March this week. Thirty. And Tibb says eleven, and she means it, and she's right. I'll have to choose. Tell her I hate her for it. No. Don't. Tell her I'll send them in the morning.",
        "You came from the Hearth? Then you'll have the road east in your legs already. Stop a while. There's a deal of road east, and none of it's empty.",
      ],
    },
  },
};
