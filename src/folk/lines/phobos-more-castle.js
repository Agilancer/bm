// The words of City State Phobos's quests, set CASTLE (their workings: src/folk/phobos-quests-castle.js), and of the people
// who come with them. Taken into src/folk/lines/phobos-hubs.js's LINES and QUESTS. As src/folk/lines/phobos-castle.js.
// Pell's Holdout, down the Deep Stacks behind the Librarian's bookcase (src/core/delve-highward.js): the people he has hidden
// for forty years. All loyal to Tessariel, and nothing of it shows or is said (the V and T rule): no name of whom they
// serve, no oath, no mark, no bells. They cook, mend, copy, trade and keep a door, and that's all anyone would see.
//   Hesper Vane, once a knight of his garrison: the Holdout's door. Says little, counts exits, hasn't forgiven herself.
//   Mother Coyle, the cook, and the Holdout's heart: feeds thirty on what's stolen from his larder; sizes you up by how you eat.
//   Garrick Thole, an armourer who walked out of the Forge: gruff, proud of honest iron, lights his fire only at night.
//   Ivo Marrow, a copyist: writes out again what the Censor burns. Nervous, exact, ink-stained, brave about one thing.
//   Old Nettle: buys and sells what the castle loses; has been in every cell of it. Sharp, unsentimental, funny.
//   Little Bet, nine, born down here: has never seen the sky; asks straight questions; counts everything.
// And the roof-runners in the Gargoyles' Roost, up in the High Ward, loyal to their crew and their pockets and no cause:
//   Sable Wren, a roof-runner: knows every bridge and Needle. Quick, mocking.
//   Dunmore Rook, who keeps their ledger: who guards what, and when. Patient, sour, exact about money.

export const LINES_CASTLE = {
  ho_vane: {
    first: [
      "That's far enough. ...You came by the hanging, so somebody told you. There are two ways out of this room: the one behind you, and one I won't show you. Hesper Vane. I keep the door.",
    ],
    greet: {
      morning: [
        "Morning. Nothing came by the Well in the night. I'd have heard.",
        "Thirty asleep at dusk. Thirty awake at dawn. That's a good night.",
        "You walk loud. Work on it.",
        "The wardens' round passed the Well's east door at first light. Two of them. Same as yesterday.",
      ],
      day: [
        "Stand to one side of the door. Never in it.",
        "I wore his red eleven years. I know how they walk a round, and when they get lazy. It's the only use I am.",
        "From here to the hanging, nineteen paces. From the hanging to the stair, forty. I've walked it with my eyes shut.",
        "If you hear me say 'shelves', don't ask. Take the nearest child and go where the others go.",
      ],
      evening: [
        "Evening. Thole lights his fire soon. It's the hour I like least. Smoke has only one way to go.",
        "Coyle's serving. Eat with your back to a wall. Not for you. For me. I count easier.",
        "The scriveners put their lamps out about now. Then they walk. I don't know why. I only know when.",
        "A quiet evening. I don't trust it. I don't trust the loud ones either.",
      ],
      night: [
        "I don't sleep at night. I sleep at noon, sat up, by the door.",
        "Keep your voice down. The Well carries. Six storeys of it.",
        "Three lamps lit, no more. I put the others out myself.",
        "Go and lie down. One of us awake is enough, and it's me.",
      ],
    },
    about: [
      "I was a knight of his garrison. I held a gate for him once, and I held it well. I've held this one four years. It doesn't weigh the same. It doesn't have to.",
      "What do I do? I stand here. I know who went out and who's come back. When the numbers don't agree, I go and find out why.",
      "Don't ask me why I left. Ask me how many ways there are out of a room. That I'll answer.",
    ],
    ask: {
      door: [
        "A man wide, with a hanging over it. One at a time is all that can come through. One at a time I can manage.",
        "From the Well it's cloth on a wall. They've walked past it every night for forty years. I've only counted the last four.",
        "If the hanging moves and nobody says the shelf, I don't ask twice.",
      ],
      exits: [
        "Count them when you come into a room. Before you look at anything else. Before you look at who's in it.",
        "This room: two. The Well: three you can see and two you can't. The Scriptorium: four. The Vault: two, and he can watch both.",
        "A room with one way out isn't a room. It's where they find you.",
      ],
      garrison: [
        "Good boots, bad orders. I followed both further than I should have.",
        "There was a gate, and people on the wrong side of it, and I held it shut because I was told to. That's all you get.",
        "They change the watch at dusk and at first light. In between they go slow. If you must go past them, go then.",
      ],
    },
    topics: { door: 'The door', exits: 'Ways out', garrison: 'His garrison' },
    bye: [
      "Go by the hanging. Look both ways first.",
      "Come back the same number you left.",
      "Walk soft through the Well.",
    ],
  },

  ho_coyle: {
    first: [
      "Sit. No, there, where I can see your bowl. I'm Coyle. Mother Coyle to everyone down here, whether I bore them or not. You'll eat first and talk after.",
    ],
    greet: {
      morning: [
        "Morning. Porridge. Don't pull that face, there's his honey in it.",
        "You're up before the bread. Sit, it's coming. You can stir while you wait.",
        "Thirty bowls, thirty spoons. I count them out and I count them back. Bet helps. Bet counts everything.",
        "Eat. You've a long stair in front of you and nothing on it but books.",
      ],
      day: [
        "Everything in that pot was his yesterday. It tastes better down here. Stolen always does.",
        "I can tell what a person is by how they eat. Fast eaters have been hungry. Slow ones have been safe. You eat like somebody listening for the door.",
        "Don't hover. Sit or stir.",
        "His cooks salt everything twice. I spend half my day soaking it out again.",
      ],
      evening: [
        "Supper. Everyone sits. Even Hesper sits, for the length of one bowl. I've timed it.",
        "Evening. That's his ham. It walked down here on its own, if anybody asks.",
        "Wash your hands. I don't care what you've killed. I care that it's on your hands.",
        "Thole won't come to table till his fire's lit. I send Bet over with a bowl. He pretends he didn't want it.",
      ],
      night: [
        "Can't sleep? Good. Peel.",
        "I bank the fire at night; I don't put it out. Forty years this hearth's been warm. I've had it nineteen of them.",
        "Hush. The little ones are down. Bet isn't. Bet's counting the rafters. Leave her be.",
        "There's broth by the fire for whoever's on the door. That's Hesper. It's always Hesper.",
      ],
    },
    about: [
      "I cooked in his Kitchens, under the Great Hearth, when I was a girl. Then I saw what one of the pots was for, and I walked down a stair that an old man with a book happened to leave open.",
      "Cook. And whatever else needs doing that nobody's said out loud. Somebody has to tell thirty people when to sit down.",
      "I feed them. That's all. You'd be surprised how much of keeping people alive is just that, done every day, on time.",
    ],
    ask: {
      larder: [
        "His larder's the size of this whole room and he couldn't tell you what's in it. I could. To the ham.",
        "My runners go up by the servants' ways. A sack each, no more. A sack isn't missed. A cartload is.",
        "We take from the back of the shelf. Always the back. The front's what gets counted.",
      ],
      holdout: [
        "Thirty of us. A smith, a copyist, a woman who sells things, a door with a sword, some children. And me. It's a village. It just hasn't got a sky.",
        "Master Pell's kept this room forty years. Some came for a night and stayed twenty years. Some came for twenty years and... Well. Eat up.",
        "Nobody down here asks where you were before. We ask if you've eaten.",
      ],
      bet: [
        "Born on the third cot from the end. Nine years. She's never been past the hanging. She thinks the sky is a sort of ceiling, and I haven't the heart.",
        "She counts. Spoons, steps, people. It's how she knows everyone's still here. Don't tease her for it.",
        "One day she's going up that stair in daylight. I'd like to be the one holding her hand. That's what I'm waiting for, if you want to know.",
      ],
    },
    topics: { larder: 'His larder', holdout: 'The Holdout', bet: 'Little Bet' },
    bye: [
      "Go on. And come back hungry, not hurt.",
      "Take a heel of bread. Don't argue.",
      "Mind yourself. I've only so many bowls.",
    ],
  },

  ho_thole: {
    first: [
      "Mind the anvil. It's cold; it'll still break your shin. Thole. I made armour for his garrison eleven years. I don't now. If you want something mended, come back after dark.",
    ],
    greet: {
      morning: [
        "Morning. Fire's out. Don't ask me for a heat till dark.",
        "I file in the mornings. Filing makes no smoke.",
        "That buckle of yours is on its last hole. I can see it from here.",
        "Slept badly. The anvil's cold and my hands know it.",
      ],
      day: [
        "A smith with no fire. Go on, say it. Everyone does, once.",
        "Honest iron doesn't care who's wearing it. That's its virtue. That was my excuse, too, for eleven years.",
        "I light at night, when the Forge up there burns hardest. Their smoke covers mine. They've no idea they're doing me a kindness.",
        "Don't touch the tools. They're in an order.",
      ],
      evening: [
        "Not long now. When you feel the floor go warm, that's the Forge up top. Then I light.",
        "Evening. Coyle's sent the child over with a bowl again. I didn't ask for it. Leave it there.",
        "Stand back from the pit when I strike a light. First smoke's the dangerous one.",
        "This is the hour I'm fit to talk to. Make use of it.",
      ],
      night: [
        "Fire's lit. Talk while I work or don't talk.",
        "Hear that? No. Good. A hammer wrapped in hide. Took me a year to learn to strike quiet.",
        "Night's my day. Pass me those tongs. Not those. The plain ones.",
        "Four hours of heat a night. You'd weep at what I could make with eight.",
      ],
    },
    about: [
      "Armourer. Eleven years at his Forge. I made good plate and never asked who'd be inside it. Then one day they told me what the idol at the end of the hall was for. I put my tongs down and walked out with the fire still going.",
      "I mend what the Holdout wears and carries. Hinges, mostly. Pots. Now and then a blade for Hesper. It's small work. It's mine.",
      "Proud? Of the work. Not of who I did it for. Those are two things, and it took me too long to prise them apart.",
    ],
    ask: {
      forge: [
        "Along the Coal Way from the Armoury. Six fires, and a casting pit you could lose a cart in. Best forge I ever stood in. I'd burn it down myself.",
        "They cast day and night now. The idol, at the end. I poured the first of it before I knew. That's in it still. Some of me is in that thing.",
        "No. I won't say what it's for. You'll see it. Then you'll know why a man leaves his tongs.",
      ],
      iron: [
        "Cold iron is iron that's never been through his fire. Everything up there has. You can feel it in the hand, if you've the hand for it.",
        "Honest iron: no gilding, no chasing, nothing on it but the hammer. It does one thing. That's all I ask of iron, or of anybody.",
        "I've a bar and a half left of my own stock. I'm saving it. I'll know what for when it comes down the stair.",
      ],
      fire: [
        "One way out for the smoke: up the coal chute, into the castle's yard by the gate. By day it would show. By night it's one more chimney.",
        "Hesper hates the hour I light. She's right to. I light anyway. Thirty people need hinges.",
      ],
    },
    topics: { forge: 'The Forge', iron: 'Honest iron', fire: 'His night fire' },
    bye: [
      "Go on. Come back after dark if you want it mended.",
      "Mind your buckles.",
      "Off with you. I've filing to do.",
    ],
  },

  ho_marrow: {
    first: [
      "Oh. Don't, don't lean on that, it's wet. Sorry. Ivo Marrow. I copy. He burns a book, I write it out again. I'm behind. I'm always a little behind.",
    ],
    greet: {
      morning: [
        "Morning. Is it? I haven't stopped. Sorry. Good morning.",
        "He lights his brazier at first light. I know because I can't eat till it's done.",
        "Mind the sheets on the bench. They're drying. They're always drying.",
        "I did eleven pages in the night. He did a whole book. It isn't a fair race.",
      ],
      day: [
        "I'm sorry about the ink. It's on everything. It's on Coyle's bread. She's spoken to me.",
        "I can copy a page I've read once. Twice, and I can do it with my eyes shut. It isn't cleverness. It's just a thing my head does.",
        "Please don't read over my shoulder. No, you can. No. Please don't.",
        "Every book he burns, there's a copy on these shelves a week later. He doesn't know. If he knew, I think I'd be the next thing on the brazier.",
      ],
      evening: [
        "Evening. He's finished for the day. I can hear when he stops. The Chained Stacks go quiet in a different way.",
        "I ought to eat. Has everyone eaten? I'll eat after this page.",
        "My hand shakes by evening. Not from fear. Well. Partly from fear.",
        "Sit, if you like. Not there. That's the Third Book of Tides, the middle of it.",
      ],
      night: [
        "I don't sleep much. If I sleep I lose pages. They go from the edges inward.",
        "One lamp. Hesper allows me one lamp. I've learned to write very small.",
        "Shh. I'm holding a chapter in my head and it's nearly all there.",
        "At night I can hear him turning pages in the Vault. He reads them first. Every one. That's the worst of it.",
      ],
    },
    about: [
      "I was a copyist up there, in the Scriptorium. They brought us books to copy fair, and then one day they brought us books to list for the fire. I listed three. Then I came down a stair.",
      "I copy what the Censor burns. From the book, if I can reach it before he does. From memory, if I can't. I'm frightened of nearly everything. Not of that.",
      "Thirty-four. I look older. It's the lamp.",
    ],
    ask: {
      censor: [
        "He burns what isn't to be read. But he reads it first. All of it. So it's all in him, do you see? Everything he's burnt. He's the only other copy.",
        "He has a brazier in the middle of the Restricted Vault, and ink wells as tall as a man in the corners. When he's angry he breaks them. The floor goes black to the knee.",
        "I watched him once through the crack of the Vault door. He looked up. I didn't breathe for a year.",
      ],
      copies: [
        "Four hundred and six books, on the Sleeping Shelves, behind the cots. The children sleep against them. I think that's good for children.",
        "I don't choose. People ask me which are worth saving. I don't know. He chooses, by burning them. I only follow.",
        "If I can't remember a line I leave a gap. I won't make one up. A wrong book is worse than a burnt one.",
      ],
      memory: [
        "It isn't a gift. A gift you can put down.",
        "Ask me the ninth page of anything on that shelf. Go on. ...No, not now. I'm in the middle of a page.",
      ],
    },
    topics: { censor: 'The Censor', copies: 'The copies', memory: 'His memory' },
    bye: [
      "Yes. Goodbye. Sorry. Mind the wet sheets.",
      "Go carefully. I mean it. I haven't the pages to spare for worrying.",
      "If you see a book lying about up there, bring it.",
    ],
  },

  ho_nettle: {
    first: [
      "Well. Fresh boots. Let me see your hands. ...No rings. Pity. I'm Nettle. I buy what this castle loses and sell it back to whoever lost it. Sit down, you make the stall look small.",
    ],
    greet: {
      morning: [
        "Morning. I'm open. I'm always open. At my age you don't shut anything you might not get open again.",
        "You're up early. Either you're honest or you've something to sell before its owner wakes.",
        "My knees say rain. There's no rain down here. My knees don't care.",
        "Seventy-seven years of mornings, and I've been pleased to see about nine of them.",
      ],
      day: [
        "Everything on this counter fell off the castle. I only caught it.",
        "Don't pick that up unless you're buying. It remembers who held it last, and so do I.",
        "A castle this size loses a spoon a day. In forty years that's a fortune in spoons. I've done the sum.",
        "I've been thrown in every cell he's got. You can't call it travel, but I've seen a lot of walls.",
      ],
      evening: [
        "Evening. The runners come in about now. Then I see what the castle's lost today.",
        "Coyle's banged the pot. Go and eat; I'll still be dear when you get back.",
        "My eyes go at dusk. My prices don't.",
        "Come to sell? Put it on the counter and take your hand off it. Slowly. There.",
      ],
      night: [
        "Can't sleep? Nor me. I gave it up at sixty. Waste of the dark.",
        "At night I count what I've got. Then I count what I'm owed. The second takes longer.",
        "Hush. Hesper's listening to the Well. Let her. It's cheaper than a dog.",
        "Night's when things get lost. Lovely hour.",
      ],
    },
    about: [
      "Nettle. Old Nettle, since before your mother. I buy and I sell and I don't ask, and in seventy-seven years the only thing I've ever lost is my temper.",
      "I've been in every cell of this castle at one time or another. I scratched the wall of each: a stroke a night. Add them up and that's my life, near enough. Nobody can say I didn't keep accounts.",
      "Why am I down here? Because up there I'm owed a hanging. Down here I'm only owed money.",
    ],
    ask: {
      cells: [
        "The Oubliettes are the worst. Not the dark. The damp. I did a winter there and I've had it in my hip ever since.",
        "The Quiet Man had me nine nights once. He never said a word. Nor did I. I think I won.",
        "Every cell's got a loose stone. Every one. Whoever builds a cell has never had to sit in it.",
      ],
      trade: [
        "I'll buy anything that isn't looking at me. I'll sell anything but the stall.",
        "I don't haggle. I name a price, you pull a face, I name the same price. We do that till you're tired.",
        "What the castle loses, it never looks for down here. People only ever look up for what they've dropped. I've made a living out of that.",
      ],
      marks: [
        "A stroke a night, a row for each stay. No names. No words. I don't put my name where a gaoler can find it.",
        "I hid a little something behind the marks, here and there. Not much. What a body could swallow in a hurry.",
        "Nobody scratches as neat as me. If the row's crooked it isn't mine, and you're in somebody else's cell.",
      ],
    },
    topics: { cells: 'His cells', trade: 'Buying and selling', marks: 'Her marks' },
    bye: [
      "Off you go. Lose something up there. I'll have it by the week's end.",
      "Mind your purse. Not from me. From everyone else.",
      "Come back with full pockets.",
    ],
  },

  ho_bet: {
    first: [
      "You're new. You're the thirty-first person I've ever seen. No. Thirty-second. I forgot the one who only came once. I'm Bet. Have you seen the sky? Is it true it hasn't got a top?",
    ],
    greet: {
      morning: [
        "It's morning. Mother Coyle says so. I don't know how she knows.",
        "I counted everybody. Thirty. Thirty-one with you. Are you staying?",
        "There's a hundred and twelve boards in this floor. I checked again.",
        "What does morning look like? Up there. Does it come all at once?",
      ],
      day: [
        "How many things have you killed? Is it more than ten? Hesper won't say hers.",
        "I've got lessons. I'm supposed to be at the table. I've done them. I did them twice.",
        "Why have you got a staff? Is it because of your legs?",
        "Mister Marrow let me count his books. Four hundred and six. One's only half a book. I counted it as one.",
      ],
      evening: [
        "Mister Thole lights his fire soon. I take him his bowl. He says don't, and then he eats it.",
        "It's nineteen steps from the door to the hanging. I'm not allowed the twentieth.",
        "Is the sky dark in the evening, or is that later? I get them mixed up.",
        "Mother Coyle says it's supper. She says it thirty times. Once each.",
      ],
      night: [
        "I'm not asleep. I'm counting the rafters. There's twenty-six. There's always twenty-six.",
        "Do stars make a noise? Mister Marrow says no. But he hasn't seen one for years.",
        "Shh. If Hesper hears us I have to go to bed.",
        "When you go up, will you look at the sky for me? Just once. Then tell me.",
      ],
    },
    about: [
      "I'm Bet. I'm nine. I was born on the third cot from the end and I've never been past the hanging.",
      "I count things. Then I know if one's gone. One was gone, once. A man. Nobody said where.",
      "I'm going to see the sky when I'm bigger. Mother Coyle says. She didn't say how much bigger. I asked.",
    ],
    ask: {
      sky: [
        "Is it blue all the way up, or just at the bottom?",
        "Mother Coyle says you can't count the stars. I think she just didn't finish.",
        "If there isn't a ceiling, what stops things going up? ...You don't know either.",
      ],
      counting: [
        "You have to count twice. Once is only looking.",
        "Thirty people. Thirty bowls. Twenty-six rafters. Two ways out, Hesper says. I only know one, and she won't tell.",
        "The biggest number I've got to is nine thousand and four. Then it was supper.",
      ],
      holdout: [
        "It's just home. Is yours different? Has yours got a hanging?",
        "Old Nettle gave me a button once. For nothing. She said not to tell anyone or she'd be ruined.",
      ],
    },
    topics: { sky: 'The sky', counting: 'Counting', holdout: 'Down here' },
    bye: [
      "Bye. I'll count you again when you come back.",
      "Don't forget to look up.",
      "Come back. Then it's still thirty-one.",
    ],
  },

  ho_wren: {
    first: [
      "Well, well. Somebody found the hanging. Either you followed one of mine or you're cleverer than you look. Sable Wren. This is the Roost. You haven't seen it.",
    ],
    greet: {
      morning: [
        "Morning. Slates are wet. Good day to stay in, bad day to be a guard.",
        "You're up early for somebody who walks on floors.",
        "Half my crew's asleep and the other half's not back. Keep your voice down for the first half.",
        "Dawn's the best light for bridges. You can see the frost before you're on it.",
      ],
      day: [
        "Don't touch the sacks. Those are spoken for. So are those.",
        "Every tower on this castle has a stair up it now. Makes life easy for me. Makes it easy for the guards too, mind.",
        "I don't do causes. I do roofs. A cause has never once paid on the day.",
        "You want to know a castle, don't ask who built it. Ask who's robbed it.",
      ],
      evening: [
        "Evening. Guards change at dusk. For as long as it takes two men to swap a spear, nobody's looking at anything.",
        "We go out when the lamps come on. Lamps make shadows. Shadows are free.",
        "If you're coming on a run, eat now. Nobody's sick off a Needle twice.",
        "Rook's doing the split. Don't talk to him while he's counting; he starts again and we're here all night.",
      ],
      night: [
        "Night. Working hours. What do you want?",
        "Hear the wind in the Needles? That's a west wind. Stay off the Gallows Needle in a west wind.",
        "Three of mine are out on the High Round. If they're not back by the second watch I go and look. I always go and look.",
        "The whole castle's asleep under us. Lovely, isn't it. All those pockets.",
      ],
    },
    about: [
      "Roof-runner. I go over the top of his castle and come back heavier. There's six of us in the crew. There were eight.",
      "Born in the city, under the Tanners' Steps. Came up the outside of the Keep on a rope when I was fifteen, for a wager. Never went back down. The pickings are better.",
      "Who am I loyal to? My crew. My pocket. In that order, most days. Don't tell Rook the order.",
    ],
    ask: {
      needles: [
        "Six of them, past the rim. The Cinder, the Widow's, the Gallows, the Thorn, the Red, the Ash. Thin as a finger, and nobody's ever told me what they're for.",
        "You get out to them over the bridges, from the rim towers and the spires. There's a deck under every crown. Lovely view. Don't admire it; that's when you fall.",
        "The Widow's Needle sways. It's meant to. I think it's meant to.",
      ],
      bridges: [
        "Every bridge has a wet side and a dry side. Depends on the wind. Run on the dry.",
        "Guards walk the big ones. Nobody walks the little ones but us and the gargoyles, and the gargoyles don't tell.",
        "Where a bridge meets a tower there's a landing. Stop on the landing. Listen. Then go. It's the ones who don't stop that we lose.",
      ],
      crew: [
        "Six. Me, Rook, and four you won't meet, because they don't like being met.",
        "Rook's the ledger. I'm the legs. We've hated each other for eleven years and never once been short.",
        "We lost two off the Thorn Needle, two winters back. I still pay their cut. Rook puts it down as rope.",
      ],
    },
    topics: { needles: 'The Needles', bridges: 'The bridges', crew: 'Her crew' },
    bye: [
      "Go on, then. Mind the wet side.",
      "You weren't here. Nor was I.",
      "Don't look down. Looking down's for guards.",
    ],
  },

  ho_rook: {
    first: [
      "You came through the hanging. That's a door I pay to keep quiet, so you owe me already. Dunmore Rook. I keep the ledger. Don't touch the crates.",
    ],
    greet: {
      morning: [
        "Morning. The night's takings are short by a candlestick. Somebody will tell me why before noon.",
        "You're early. Early costs the same as late.",
        "I do the sums at first light. The light's free. Nothing else in this castle is.",
        "The guards on the Crown Court changed late again. I've put it down.",
      ],
      day: [
        "Every guard on this castle has a round, and every round has a gap. I keep the gaps. Wren only runs through them.",
        "Don't look at it upside down. I can see you doing it.",
        "A thief who can't count is just somebody falling off a roof with a sack.",
        "Sixteen years of who stands where. He'd pay a good deal to know what I know about his own castle. He's never asked.",
      ],
      evening: [
        "Evening. I split the takings at dusk. Six shares, and two more that go down as rope.",
        "Sit if you're sitting. Not on that. That's sold.",
        "Wren's going out. She'll say she doesn't need the round. Then she'll ask me the round.",
        "The watch changes now. Seven breaths with nobody looking. I've timed it more nights than I've had hot suppers.",
      ],
      night: [
        "Night. I don't go out. My knees retired before I did.",
        "Three out on the roofs. I'll know by the second watch whether it's three shares or two.",
        "Quiet. I'm adding.",
        "At night you can hear the guards' boots on the bridges from here. One of them drags his left. He's on the North Belvedere tonight.",
      ],
    },
    about: [
      "I keep the roof-runners' ledger. Who guards what, when, and for how long he looks the other way. Wren thinks the crew runs on her legs. It runs on my columns.",
      "I was a clerk of his Treasury, the other side of that hanging. Sixteen years ago I found that counting his money and taking it could be the same work, and that only one of them paid.",
      "Do I care who sits in the Keep? I care what he pays his guards. He pays them badly. That's been the making of me.",
    ],
    ask: {
      ledger: [
        "Every post, every round, every man who drinks. It's kept so nobody else could follow it. I'm not a fool.",
        "It's wrong twice a year. When it's wrong, somebody doesn't come back. So I check.",
        "No, you can't see it. You can have what's in it, a line at a time, at a price.",
      ],
      guards: [
        "The Clock Tower's man sleeps. The belvederes' don't. The Crown Court has four, and two of them are counting the hours same as you.",
        "A guard's a man who's paid to stand still. Learn how long he can bear it. After that he's looking at his feet.",
        "The ones in white never get lazy. I've no line for a lazy one in white. Keep away from white.",
      ],
      money: [
        "Six shares for the six of us. Two more for the two we lost: Wren insists. I put them down as rope. What's left over keeps the Roost.",
        "Wren would give it away. To her crew, to a child, to anybody with a sad face. That's why she doesn't hold the purse.",
        "I'm owed forty by a guard on the South Belvedere. He thinks I've forgotten. It's why he's still got the post.",
      ],
    },
    topics: { ledger: 'The ledger', guards: 'The guards', money: 'Money' },
    bye: [
      "Go on. Close the hanging after you.",
      "Don't get seen. It's bad for the columns.",
      "Mind the price of things.",
    ],
  },
};

export const QUESTS_CASTLE = {
  // ---- the way down, and the Holdout's own ----
  the_bookcase: {
    title: 'The Bookcase',
    giver: 'ph_librarian',
    needs: 'the_household',
    offer: [
      "There is a bookcase in the south-east corner of these rooms that has never held a book I've lent. Behind it there is a stair. At the foot of the stair there is a library the castle forgot it had.",
      "And off that library, behind a hanging, are some people I have been keeping for forty years. Thirty of them, at present. It's time they met you. Go down, and tell the woman at the door: the third shelf.",
    ],
    accept: "I'll go down.",
    acceptLine: "The south-east corner of these rooms. Pull the case; don't push it. Down the stair to the Well of Books, and look for the hanging in its west wall. Hesper Vane keeps the door behind it. Then Mother Coyle, at her fire. She decides who eats, so she decides everything.",
    decline: 'Not yet.',
    declineLine: "No. A stair that has kept forty years will keep another day. Don't lean on that bookcase in the meantime.",
    journal: [
      "Behind the bookcase in the south-east corner of the Librarian's Rooms, off the Ancient Library in the Middle Ward, a stair goes down. Go down it into the Deep Stacks.",
      "At the stair's foot is the Well of Books. Behind a hanging in its west wall is the door of Pell's Holdout. Tell Hesper Vane, who keeps it: the third shelf.",
      "Speak to Mother Coyle, the Holdout's cook, at her fire in Pell's Holdout.",
    ],
    progress: [
      "The bookcase in the south-east corner. The stair. The hanging in the Well's west wall. Hesper Vane first, then Mother Coyle.",
    ],
    others: {
      ho_vane: ["The third shelf. ...Then he means it. Keep your hands where I can see them. You're stood in one of the two ways out of this room: move. Go and let Coyle look at you. If she feeds you, you can stay."],
      ho_coyle: [
        "Does she. Turn round. ...Thin. Tired. Killed something big lately and not eaten since. Sit. You'll have a bowl in front of you before you have a word out of anyone down here.",
        "There. You eat like somebody who means to come back. That'll do. Here: this is from all of us. Now go round and meet them. Every one of them wants something.",
      ],
    },
    done: [
      "You found them. Thirty people, a cook, a forge and a child who has never seen the sky. Now you know what the bookcase is for.",
      "Take this. And forget the third shelf. It will be a different shelf by morning.",
    ],
    after: [
      "Mother Coyle sent word up. She says you eat properly. From her, that is a letter of introduction.",
    ],
  },
  mouths_to_feed: {
    title: 'Mouths to Feed',
    giver: 'ho_coyle',
    needs: 'the_bookcase',
    offer: [
      "Thirty mouths, and every crumb in them comes out of his larder. My runners know the Kitchens and the Cellars by heart. Trouble is, lately the Kitchens and the Cellars know my runners.",
      "You go instead. Walk the Kitchens, walk the Cellars off them, see what's hanging and what's guarding it. Fill your pockets while you're there. He won't count. He's never once counted.",
    ],
    accept: "I'll walk his Kitchens and his Cellars.",
    acceptLine: "The Lower Ward. The Kitchens are at the far end of the West Range, where the Aqueduct comes up, and the Cellars open off them. Mind the scullion. She's not ours. She's not anybody's.",
    decline: 'Not now.',
    declineLine: "Then it's thin broth tomorrow, and I'll tell them whose doing it is. Go on. I'm not angry. I'm counting bowls.",
    journal: [
      "Mother Coyle feeds Pell's Holdout out of his larder, and her runners are known there now. Walk the Kitchens and the Cellars in the Lower Ward, and see what's hanging and what guards it.",
      "Go back to Mother Coyle at her fire in Pell's Holdout, down the Deep Stacks.",
    ],
    progress: [
      "The Kitchens and the Cellars, in the Lower Ward. Both. I want to know what's on the hooks.",
    ],
    done: [
      "Lighter, and nobody counted. That's the whole art of it. Sit. You'll eat what you carried; that's the rule for runners.",
      "And this is yours. Runner's pay. I keep it in the flour, where nobody looks. Blow on it first.",
    ],
    after: [
      "Ham three nights running. Bet asked if somebody had died. I said no, somebody had walked the Cellars.",
    ],
  },
  the_way_they_came: {
    title: 'The Way They Came',
    giver: 'ho_vane',
    needs: 'the_bookcase',
    offer: [
      "Everyone in this room came in by the Well. So will whatever comes for them. Chain-archivists in the Chained Stacks. Scriveners in the Scriptorium. Two wardens in blue who walk between.",
      "I can hold a door a man wide. I can't hold it against all of them at once. Thin them. Ten. Anywhere down here but this room.",
    ],
    accept: "Ten of them. I'll thin the Stacks.",
    acceptLine: "East off the Well, the Chained Stacks. Out of the Well's far end, the Scriptorium, and past it the Sump and the Scriveners' Lift. Leave the Restricted Vault. What's in there isn't one of ten.",
    decline: 'Not yet.',
    declineLine: "Then I keep counting them. Sixteen, at last light. I'd sooner it were six.",
    journal: [
      "Whatever comes for Pell's Holdout will come by the Well of Books. Put down ten of whatever keeps the Deep Stacks: in the Chained Stacks, the Scriptorium, the Sump, or by the Scriveners' Lift.",
      "Go back to Hesper Vane at the door of Pell's Holdout.",
    ],
    progress: [
      "Ten. The Chained Stacks, the Scriptorium, the Sump, the Lift. Not in here.",
    ],
    done: [
      "Ten. I heard some of it. The Well carries. ...That's ten fewer to come through a door a man wide.",
      "Take this. It's what the Holdout can spare. I didn't ask them; I told them. You've made my nights shorter.",
    ],
    after: [
      "The scriveners keep to their desks now. They've stopped walking at dusk. I've stopped listening for it. Nearly.",
    ],
  },
  cold_iron: {
    title: 'Cold Iron',
    giver: 'ho_thole',
    needs: 'the_bookcase',
    offer: [
      "Eleven years I worked his Forge. Good iron. Honest work. Then they told me what the idol was for, and I put my tongs down on the anvil and walked out. Left them there.",
      "There's four of his at my fires now. Put them down. Don't bring me the tongs. I want to know they're where I left them. That's all.",
    ],
    accept: "Four of them. I'll quiet your Forge.",
    acceptLine: "The Lower Ward. Up the Armoury's stair off the Drill Floor, then along the Coal Way. You'll smell it before you see it. Four of his at the fires. The tongs are on the near anvil. Leave them lie.",
    decline: 'Not now.',
    declineLine: "Aye. It's waited this long. So have I.",
    journal: [
      "Garrick Thole walked out of the Forge and left his tongs on the anvil, and his people work the fires now. Put down four of them in the Forge: in the Lower Ward, along the Coal Way from the Armoury.",
      "Go back to Garrick Thole at his cold anvil in Pell's Holdout.",
    ],
    progress: [
      "The Forge. Along the Coal Way from the Armoury. Four.",
    ],
    done: [
      "Where I left them. ...Aye. Then nobody's had the wit to pick them up in all this time. Good. Let them rust there. That's what they're for now.",
      "Here. A staff. I drew it out at night, a heat at a time, with their smoke over mine. It's never been near his fire. Cold iron, and honest. It'll do one thing, and do it right.",
    ],
    after: [
      "The floor was cold last night. No Forge up top. First time I ever lit my fire and was afraid of my own smoke. I lit it anyway.",
    ],
  },
  the_long_count: {
    title: 'The Long Count',
    giver: 'ho_nettle',
    needs: 'the_bookcase',
    offer: [
      "I've been in every cell of this castle at one time or another. Guest, mostly. I scratched the wall of each one: a stroke a night. It's how I know how old I am.",
      "Three I can't get back to on these knees. The Index Room, where I hid. The Sump, where I was dropped. The Oubliettes, where I was kept. Go and look. If my scratches are still there, nobody's touched the walls, or what I left by them.",
    ],
    accept: "I'll go and look at your walls.",
    acceptLine: "The Index Room's behind the bookcase that stands out of line in the Well's south-east corner. The Sump's past the Scriptorium. The Oubliettes are in the Lower Ward, down the Pit Stair from the yard. You'll know my marks. Nobody else scratches that neat.",
    decline: 'Not today.',
    declineLine: "Suit yourself. Walls keep. It's the one thing I'll say for them.",
    journal: [
      "Old Nettle scratched her marks wherever the castle kept her. Find them in three places: the Index Room (behind the bookcase out of line in the Well of Books' south-east corner), the Sump (past the Scriptorium), and the Oubliettes, down the Pit Stair in the Lower Ward.",
      "Go back to Old Nettle at her stall in Pell's Holdout.",
    ],
    progress: [
      "The Index Room, the Sump, the Oubliettes. Look low on the wall. I was sat down for most of it.",
    ],
    done: [
      "Still there. Seventy-seven years, and nobody's whitewashed me yet.",
      "Here. A stone. It sat behind a loose one in the Oubliettes till I went back for it, long ago. It's bought me out of two cells. It's yours. Don't thank me; I'll be charging you for the next thing.",
    ],
    after: [
      "I've started a new row. On the Holdout's wall, by the stall. First cell I ever chose. Longest stay by years.",
    ],
  },
  what_the_censor_burns: {
    title: 'What the Censor Burns',
    giver: 'ho_marrow',
    needs: 'the_way_they_came',
    offer: [
      "He burns a book a day in the Restricted Vault. I copy them out as fast as he burns them. From memory, the last ones. I'm... I'm four books behind.",
      "I can't fight. I can't do anything. But I've watched him. When he breaks the ink wells the floor floods, and the only dry places are the four reading daises. Get up on one. Please. Please kill him.",
    ],
    accept: "I'll put out his fire.",
    acceptLine: "East off the Well, through the Chained Stacks, and on down to the Restricted Vault. Stay out of his fire. Keep moving when the black follows you. And when the ink wells go: a reading dais. Any of the four.",
    decline: 'Not him. Not yet.',
    declineLine: "No. No, of course. He'll burn another tomorrow. I'll... I'll keep up. I'll try to keep up.",
    journal: [
      "The Censor burns a book a day in the Restricted Vault, past the Chained Stacks east of the Well of Books, and Ivo Marrow can't copy them out as fast. Kill him. When he breaks the ink wells and the floor floods, get up on a reading dais.",
      "Go back to Ivo Marrow at his table in Pell's Holdout.",
    ],
    progress: [
      "The Restricted Vault. Through the Chained Stacks. A reading dais, when the ink comes. Please.",
    ],
    done: [
      "His fire's out? Out. Then... then I can stop. No. I can catch up. Four books. I can catch up.",
      "Here. A skull, off a high shelf of the Scriptorium, years ago. I kept the one page he couldn't make burn inside it. I've never dared read it. Take both. They ought to go about with somebody brave.",
    ],
    after: [
      "I'm two books behind. Two. And nothing new to copy. I don't know what to do with my evenings. I've started reading. For pleasure. It's very strange.",
    ],
  },
  bets_lesson: {
    title: "Bet's Lesson",
    giver: 'ho_bet',
    needs: 'the_bookcase',
    offer: [
      "How high is up? Mother Coyle says the Well of Books has six storeys. I'm not allowed past the hanging. I've counted everything in here. There's nothing left to count.",
      "Will you go and stand in the Well and look up and count them? Twice. You have to count twice or it isn't counting.",
    ],
    accept: "I'll count them. Twice.",
    acceptLine: "Go out past the hanging, and stand where the stair comes down into the Well, and look up. Count the rows of shelves, going up. Then do it again. Don't look down the hole in the middle. Mister Thole says it hasn't got a bottom. I think he just didn't check.",
    decline: 'Not now, Bet.',
    declineLine: "That's what Hesper says. She says it more, though.",
    journal: [
      "Little Bet has never been past the hanging. Stand in the Well of Books at the foot of the Hidden Stair, look up, and count its storeys for her. Twice.",
      "Go back to Little Bet at the lessons table in the Sleeping Shelves, off Pell's Holdout.",
    ],
    progress: [
      "The Well. Where the stair comes down. Look UP. Twice.",
    ],
    done: [
      "Six. And then six again? ...Then it's six. Mother Coyle was right. She's right a lot. I still had to check.",
      "This is my counting money. I've counted it more than anything. You can have it. There's nothing down here to buy except Old Nettle's buttons, and she gave me one.",
    ],
    after: [
      "Six storeys. And the sky's higher than that? Higher than six? ...I'm going to need bigger numbers.",
    ],
  },

  // ---- the household's, and the princess's, up the castle's towers ----
  a_view_for_a_princess: {
    title: 'A View for a Princess',
    giver: 'apricot',
    needs: 'the_gate_captain',
    offer: [
      "Now the Gate Captain's gone, I'm told one can simply walk about his yard. I'm told there are two little turrets over it, with stairs up them. The Latch Turret and the Candle Turret. Aren't those nice names for something of his.",
      "I've never seen my Garden from above. Nobody has; that's rather the point of it. Go up both, would you, and tell me whether it shows. If it shows, I shall have to move the Dowager.",
    ],
    accept: "I'll go up both turrets.",
    acceptLine: "Up the Aqueduct and out into his yard. The Latch Turret and the Candle Turret stand over the Lower Ward's yard: each has a stair turret against it and a lookout deck under its crown. Stand on both decks. Look down. Then come back and sit.",
    decline: 'Not just now.',
    declineLine: "No, no. Sit. It's been a wall for a very long time. It can be a wall a little longer.",
    journal: [
      "Princess Apricot wants to know whether her Sunk Garden shows from above. Climb the Latch Turret and the Candle Turret, over the Lower Ward's yard, by the stair turret against each, and stand on the lookout deck under each crown.",
      "Go back to Princess Apricot in the Sunk Garden.",
    ],
    progress: [
      "The Latch Turret and the Candle Turret, over his yard. Both decks.",
    ],
    done: [
      "The wall. Only the wall? Not the caps, not the shaft? ...Then from up there it's a wall like any other. Good. The Dowager stays where she is.",
      "Take this. A princess pays her scouts. It's very nearly the only thing that tells her from a lady with mushrooms.",
    ],
    after: [
      "I've been thinking about that view. One day I might like to see it myself. Not yet. I've decided I'm allowed to be a coward about two things.",
    ],
  },
  wynns_towers: {
    title: "Wynn's Towers",
    giver: 'ph_wynn',
    needs: 'wynns_map',
    offer: [
      "I've drawn the insides. Now I want the outsides. Every lesser tower has a stair turret against it, and landings where the bridges come in, and a lookout deck under its crown. I've drawn five of them from the ground. From the ground is guessing.",
      "The Larder Tower, the Tanners' Tower, the Page's Tower, the Kitchen Tower, the Steward's Tower. Go up each one, to the deck. Count the turns of the stair. I think I'm short by one somewhere and it's driving me mad.",
    ],
    accept: "Five towers. I'll count the stairs.",
    acceptLine: "Find the foot of each one's stair turret and go up to the deck. The Page's, the Kitchen and the Steward's stand up through the Crown Court, the great patio over this ward: that's up the first of the Keep's great stairs. Count the turns. Out loud, if it helps.",
    decline: 'Not now, Wynn.',
    declineLine: "Fine. I'll go on guessing. Guessing's free. It's just wrong.",
    journal: [
      "Wynn Pell has only drawn five of the castle's lesser towers from the ground. Climb each to the lookout deck under its crown: the Larder Tower, the Tanners' Tower, and the Page's, the Kitchen and the Steward's Towers, which stand up through the Crown Court (up the first of the Keep's great stairs).",
      "Go back to Wynn Pell in the Librarian's Rooms.",
    ],
    progress: [
      "The Larder, the Tanners', the Page's, the Kitchen, the Steward's. To the deck of each. Count the turns.",
    ],
    done: [
      "The Larder Tower! I knew it. I KNEW it was the Larder Tower. One turn. One. That's four days I've been wrong about a stair.",
      "Here. I copied this out of a book he keeps on the high shelves. Don't tell him. He knows. Read it somewhere quiet; it's the kind you only need to read once.",
    ],
    after: [
      "I've redrawn the Larder Tower. Four times. It's right now. I've drawn you on its deck, as a dot. You're a bigger dot than Pip.",
    ],
  },
  pips_dare: {
    title: "Pip's Dare",
    giver: 'ph_pip',
    needs: 'the_hornwings',
    offer: [
      "I dare you. I dare you to go up the Horn Tower. All the way. To its head. I've been as far as the last landing. Then my legs went funny.",
      "It wasn't being scared. It was my legs. Go up and tell me what you can see. If you can see the whole city I'm going up tomorrow. Probably.",
    ],
    accept: "I'll go up the Horn Tower.",
    acceptLine: "The Horn Tower's over the Horn Galleries. There's a stair turret up its side, and bridges come in at the landings. Just keep going up till there isn't any more up. Don't look down on the last bit. That's where the legs happen.",
    decline: 'Not today, Pip.',
    declineLine: "Is it your legs? It's all right if it's your legs.",
    journal: [
      "Pip Carrow dares you to climb the Horn Tower, over the Horn Galleries, by its stair turret: all the way up to its head.",
      "Go back to Pip Carrow in the Librarian's Rooms.",
    ],
    progress: [
      "The Horn Tower! All the way up! To the head!",
    ],
    done: [
      "The WHOLE city? Even the Tanners' Steps? Even the gate? I'm going up. I'm going up tomorrow. Don't tell Ondine.",
      "Here. It's my dare money. I had it saved in case anybody ever did one. Nobody ever did one before.",
    ],
    after: [
      "I went up. Nearly. I went to the last landing and I looked. My legs were fine. I'm doing the last bit tomorrow.",
    ],
  },
  jorys_strongboxes: {
    title: "Jory's Strongboxes",
    giver: 'ph_jory',
    needs: 'the_household',
    offer: [
      "Three strongboxes. I put them by when they retired me. One in the Map Room, one in the Horn Galleries, one in the Conservatory. A quartermaster keeps a reserve. Nobody tells him to. He just does.",
      "I haven't laid eyes on them in two years. Go and see they're where I put them. If you can open one, what's in it is yours. That's not generosity. That's wages.",
    ],
    accept: "I'll look in on all three.",
    acceptLine: "The Map Room's off the Portrait Gallery's east side. The Horn Galleries are up from it. The Conservatory's down the Reading Walk from the library, past the Alchemists' Wing. A chest in each. Don't force the locks. I made those locks.",
    decline: 'Not now.',
    declineLine: "Suit yourself. They've sat two years. A reserve's meant to sit.",
    journal: [
      "Jory Tallis put three strongboxes by about the Middle Ward: chests in the Map Room, the Horn Galleries and the Conservatory. Go to each room and see they're where he left them.",
      "Go back to Jory Tallis in the Librarian's Rooms.",
    ],
    progress: [
      "The Map Room, the Horn Galleries, the Conservatory. A chest in each.",
    ],
    done: [
      "Two still locked. Then one's been opened, and since it was you, I'll allow it. Three boxes, three places, two years. Not one gone astray.",
      "Carrier's share. Same as before. Don't argue with a quartermaster about wages.",
    ],
    after: [
      "I've moved the third one. I won't say where. It isn't that I don't trust you. It's that I'd know.",
    ],
  },
  the_black_nave: {
    title: 'The Black Nave',
    giver: 'ph_ondine',
    needs: 'the_feast_that_walks',
    offer: [
      "I sang in his Sanctuaries from when I was a girl. The black nave. His court kneels there, to him, and his cantors sing them down onto their knees. I was one. I wore the white.",
      "The cantors still sing. Every night I can hear what they're singing, and I know every word, and I'd like not to. Go up. Stand in the nave, where I stood. Then stop the singing. Six of them: cantors, wardens, whoever is there.",
    ],
    accept: "I'll stand in the nave and stop the singing.",
    acceptLine: "Up the Sanctuaries Stair in the Long Stacks, if you have the Drowned Key for it. Or by the Crypt door in the Oubliettes, if you have the Glass Key. The nave is the first great room past the stair's head. Stand just inside, where the aisle begins.",
    decline: 'Not yet.',
    declineLine: "No. It's a long way up to be sung at. I'll go on not listening.",
    journal: [
      "Ondine sang in his Sanctuaries, and his cantors sing there still. Go up into the High Ward: by the Sanctuaries Stair in the Long Stacks (the Drowned Key turns it), or by the Crypt door at the bottom of the Oubliettes (the Glass Key).",
      "Stand in the black nave of the Sanctuaries, just inside it from the stair's head, where the aisle begins.",
      "Put down six of whatever keeps the Sanctuaries: his cantors, and the wardens in white.",
      "Go back to Ondine in the Librarian's Rooms.",
    ],
    progress: [
      "Up into the High Ward. The nave first. Then six of them.",
    ],
    done: [
      "Quiet. ...Yes. I can tell. I've listened to that room through the floors for nine years, and tonight there's nothing in it.",
      "I told you the other was the last thing I kept. It wasn't. This is the white I wore. I unpicked every skull from it, one a night. It's only a robe now. I'd like it to do better than it did on me.",
    ],
    after: [
      "I sang in the reading room last night. Loudly. Master Pell put down his book. He has never once put down his book.",
    ],
  },

  // ---- the Librarian's: the High Ward, its two great things, and the lift home ----
  up_the_sanctuaries_stair: {
    title: 'Up the Sanctuaries Stair',
    giver: 'ph_librarian',
    needs: 'the_bookcase',
    offer: [
      "I told you the stair in the Long Stacks was locked, and that its key was nowhere in this ward. Both true. The key is under this ward: in the Drowned Archive, in the keeping of whatever keeps that.",
      "Bring up the Drowned Key, turn the Sanctuaries Stair, and go up. Only look. The High Ward is his own. I have kept this library forty years and never once seen what is over my head.",
    ],
    accept: "I'll go up and look.",
    acceptLine: "The Drowned Archive first, for the Drowned Key. Then the stair in the Long Stacks, past my reading room. Should you come by the Glass Key sooner, the Crypt door at the bottom of the Oubliettes goes up as well. Either way: go up, look, come down.",
    decline: 'Not yet.',
    declineLine: "No. It has been over my head for forty years. Another week won't bring it down.",
    journal: [
      "The stair up to the High Ward is in the Long Stacks, past the Librarian's reading room, and the Drowned Key from the Drowned Archive turns it (or the Glass Key turns the Crypt door at the bottom of the Oubliettes). Go up into the High Ward.",
      "Go back to Master Aldric Pell in his rooms off the Ancient Library.",
    ],
    progress: [
      "The Drowned Key, from the Drowned Archive. Then the Sanctuaries Stair, in the Long Stacks.",
    ],
    done: [
      "In his nave. The stair from my library lets out in his nave. Forty years I have been shelving books under that. Well. One likes to know.",
      "Take this. And sit a moment. There is a good deal more for you to do up there, and none of it is looking.",
    ],
    after: [
      "I walk past that stair every morning. I used to nod to the lock. Now I nod to the door.",
    ],
  },
  the_star_reader: {
    title: 'The Star-Reader',
    giver: 'ph_librarian',
    needs: 'up_the_sanctuaries_stair',
    offer: [
      "In the Observatory there is a man who reads the sky for him. He was a scholar once. He borrowed books from me, forty years ago, and returned them on the day. I rather liked him.",
      "He doesn't read the sky now. He tells it. Kill him. He brings his sky down a quarter at a time: when he calls the eclipse, three quarters of the room burn and one is dark. Stand in the dark.",
    ],
    accept: "I'll stop his sky.",
    acceptLine: "The Observatory is east of the Treasury: from the far end of the nave down the long passage, or round by the Generals' Crypt and the Mirror Gallery. Jump his turning fire, keep ahead of the stars that follow you, and at the eclipse, the dark quarter. Quickly.",
    decline: 'Not yet.',
    declineLine: "No. He has all the time there is. He reads it off the ceiling.",
    journal: [
      "The Star-Reader keeps his sky in the Observatory, east of the Treasury in the High Ward. Kill him. When he calls the eclipse, three quarters of the room burn: stand in the dark quarter.",
      "Go back to Master Aldric Pell in his rooms off the Ancient Library.",
    ],
    progress: [
      "The Observatory, east of the Treasury. At the eclipse, the dark quarter.",
    ],
    done: [
      "Dead. And his sky has stopped. Then for the first time in forty years, nobody in this castle knows what tomorrow night is good for. The lord least of all.",
      "Hold out your hand. The arm of an orrery: an old one, older than his. My master kept it on the high shelves. It makes a staff, and it wants a sky to point at. You have just emptied one.",
    ],
    after: [
      "I looked up through the oculus last night. The stars were only stars. I had quite forgotten they could be.",
    ],
  },
  the_scriveners_lift: {
    title: "The Scriveners' Lift",
    giver: 'ph_librarian',
    needs: 'up_the_sanctuaries_stair',
    offer: [
      "There is a lift at the bottom of the Deep Stacks, past the Scriptorium. The scriveners rode it up to the High Ward with their fair copies. It is chained at the top, and has been since before my time.",
      "Its head is in a room on no map, behind a hanging in the Treasury's west wall. There are people living there. Thieves. I have never met them; I have merely missed things. Find them, and ask them to let the lift down.",
    ],
    accept: "I'll find them and ask.",
    acceptLine: "The Treasury is down the long passage from the far end of the nave. The hanging is in its west wall. Behind it: the Gargoyles' Roost. Speak to whoever speaks first; that will be the one in charge. Then ride the lift down. It lets out past the Scriptorium.",
    decline: 'Not yet.',
    declineLine: "As you like. It has been chained since before my time. The chain is in no hurry.",
    journal: [
      "The Scriveners' Lift is chained at its head, in a room on no map. In the High Ward, find the hanging in the Treasury's west wall and go through it into the Gargoyles' Roost.",
      "Speak to Sable Wren, the roof-runner, in the Gargoyles' Roost.",
      "Ride the Scriveners' Lift, in the Roost's west wall, down into the Deep Stacks.",
      "Go back to Master Aldric Pell in his rooms off the Ancient Library.",
    ],
    progress: [
      "The hanging in the Treasury's west wall. Whoever is behind it. Then the lift, down.",
    ],
    others: {
      ho_wren: [
        "People he trusts. That's nice for him. Who's Master Pell? ...The library. The old boy who never notices. Ha. He noticed.",
        "Fine. The chain's off. Not for him: a way down that isn't a rope is worth money to me. Go on, ride it. And if your trusted people have anything worth lifting, I never said that.",
      ],
    },
    done: [
      "One stair apart. The top of his castle and the bottom of my library. I have wanted that for forty years, and never had anyone to send.",
      "Take this. And if the roof-runners ask what I am, tell them: an old man who never notices. It has been a very useful thing to be.",
    ],
    after: [
      "Mother Coyle tells me a young woman came down the lift, ate two bowls, counted the spoons and left. The spoons were all there. I'm told that is a compliment.",
    ],
  },
  the_sexton: {
    title: 'The Sexton of the High Ward',
    giver: 'ph_librarian',
    needs: 'the_star_reader',
    offer: [
      "One door left. Behind the silvered door are the Throne Antechambers, and in them the Sexton of the High Ward. He buries whoever comes that far. Then he digs them up, to serve.",
      "The door wants the Silvered Key, out of the Hall of Mirrors. When you stand before him he will set his grave-lantern down, and while it burns the graves give up their dead, two at a time, without end. Don't fight the dead. Put the lantern out.",
    ],
    accept: "I'll put out his lantern.",
    acceptLine: "The silvered door is in the Treasury. The Silvered Key is in the Hall of Mirrors, off the east end of the Mirror Gallery. When the lantern is lit, go to it and put it out: nothing else matters while it burns. He carries a ring of every door he kept. Bring it.",
    decline: 'Not yet.',
    declineLine: "No. Nobody should go to that door before they're ready. He has a grave cut for everyone who did.",
    journal: [
      "The Sexton of the High Ward keeps the Throne Antechambers, behind the silvered door in the Treasury (the Silvered Key, from the Hall of Mirrors, opens it). Kill him. While his grave-lantern burns the graves give up their dead without end: put the lantern out.",
      "Go back to Master Aldric Pell in his rooms off the Ancient Library.",
    ],
    progress: [
      "The silvered door, in the Treasury. The Silvered Key first. And the lantern: out.",
    ],
    done: [
      "His ring. Every door of the High Ward that he kept. ...Do you know, I don't believe I have ever held a key I wasn't meant to have. Jory will be unbearable.",
      "And this was his lantern. It is out, and it will stay out: I have seen to that. Set in a skull, it will light your way and raise nobody. The way up into the Keep is open. Rest first. Then we shall talk about him.",
    ],
    after: [
      "There is nothing between this library and his Keep now but stairs. I find I'm not afraid. I find I'm impatient. At my age that is much worse.",
    ],
  },

  // ---- the roof-runners', in the Gargoyles' Roost: the Needles, the bridges, the high places ----
  the_high_round: {
    title: 'The High Round',
    giver: 'ho_wren',
    needs: 'the_scriveners_lift',
    offer: [
      "You want to run with us, you run the High Round first. Four Needles past the rim: the Widow's, the Gallows, the Thorn, the Red. Three bridges between them, a hand wide in places. Wider than they look. Narrower than you'd like.",
      "Stand on the deck of each. Don't get seen. And if you fall, fall quietly: I've a crew to think of.",
    ],
    accept: "Four Needles. I'll run it.",
    acceptLine: "Out over the bridges from the rim towers and the spires: every tower has its stair turret, and landings where the bridges come in. The Widow's Needle, the Gallows Needle, the Thorn Needle, the Red Needle. Up to the deck of each. Don't run on the wet side.",
    decline: 'Not tonight.',
    declineLine: "Sensible. Sensible people live ages. On the ground.",
    journal: [
      "Sable Wren won't have you run with her crew till you've run the High Round. Stand on the lookout deck of four Needles past the castle's rim: the Widow's, the Gallows, the Thorn and the Red, out over the bridges from the rim towers and the spires.",
      "Go back to Sable Wren in the Gargoyles' Roost, behind the hanging in the Treasury's west wall.",
    ],
    progress: [
      "The Widow's, the Gallows, the Thorn, the Red. And the bridges between. Unseen.",
    ],
    done: [
      "All four? And nobody saw? ...Rook, pay me. I said they'd do it. He said you'd be a stain on the Lower Ward's yard by now.",
      "Here. Greys. A roof-runner's greys: slate one side, soot the other. You've earned the wearing. Stand still on a roof in those and you're a chimney.",
    ],
    after: [
      "Two of mine ran the Round behind you last night, to see where you'd put your feet. They said: everywhere. Like a goat. From them that's high praise.",
    ],
  },
  every_needle: {
    title: 'Every Needle',
    giver: 'ho_wren',
    needs: 'the_high_round',
    offer: [
      "There's two Needles you haven't stood on. The Cinder Needle at one end of the rim, the Ash Needle at the other. Nobody in my crew's done both in a night. I have. Once.",
      "And there's the Keep's Crown. The very top of the trunk's winding stair, over everything. I've never been. I'm not saying I couldn't. I'm saying nobody's paid me. Go up all three, and I'll pay you.",
    ],
    accept: "Both ends, and the Crown.",
    acceptLine: "The Cinder Needle and the Ash Needle are the two ends of the rim: out over the bridges from the rim towers. The Keep's Crown is at the very top of the winding stair up the Keep's trunk. Go up till the stair gives out. Then look down at us. We'll be the small ones.",
    decline: 'Not yet.',
    declineLine: "No? ...No. Fair. I've been not doing it for twelve years.",
    journal: [
      "Two Needles are left, and one place higher than any. Stand on the Cinder Needle and the Ash Needle, at the two ends of the rim, and on the Keep's Crown, at the very top of the winding stair up the Keep's trunk.",
      "Go back to Sable Wren in the Gargoyles' Roost.",
    ],
    progress: [
      "The Cinder Needle, the Ash Needle, the Keep's Crown.",
    ],
    done: [
      "The Crown. You stood on his Crown. ...No, I believe you. You've got the look. Everybody who's been right up comes down a bit quiet.",
      "Take this. A gargoyle's eye, set in a skull. It came off the Roost's own roof the night we moved in. It's watched every bridge on this castle for longer than he has. Now it can watch for you.",
    ],
    after: [
      "I went up. Last night. Don't tell Rook; nobody paid me. You can see every bridge I've ever run, all at once. They looked small. I didn't like that. I liked it a lot.",
    ],
  },
  rooks_ledger: {
    title: "Rook's Ledger",
    giver: 'ho_rook',
    needs: 'the_scriveners_lift',
    offer: [
      "I keep the ledger. Who guards what, and when, and for how long he looks the other way. It's the only thing in this Roost worth more than the roof.",
      "Four lines of it I haven't had checked since the thaw. The Clock Tower's head. The North Belvedere. The South Belvedere. The Crown Court. Go and stand at each. See if the guards are where I say. If I'm wrong, I'd sooner hear it from you than from a rope.",
    ],
    accept: "I'll check your four.",
    acceptLine: "The Clock Tower's head, up its stair turret. The North and South Belvederes. And the Crown Court: the great patio over the Middle Ward, up the first of the Keep's great stairs. Stand, look, count the guards, leave. Don't improve on it.",
    decline: 'Not now.',
    declineLine: "Then it stays unchecked, and so do you.",
    journal: [
      "Dunmore Rook's ledger says who guards what. See that it's right in four places: the Clock Tower's head, the North Belvedere, the South Belvedere, and the Crown Court, the great patio over the Middle Ward (up the first of the Keep's great stairs).",
      "Go back to Dunmore Rook in the Gargoyles' Roost.",
    ],
    progress: [
      "The Clock Tower's head, the two belvederes, the Crown Court. Stand and look.",
    ],
    done: [
      "Right, is it. All four. ...Good. I don't enjoy being right. I enjoy not being wrong. There's a difference, and it's worth about four hundred gold a year.",
      "Your cut. Counted twice. Don't count it here; it upsets the crew.",
    ],
    after: [
      "I've put you in the ledger. Not as a guard. As a cost. A reasonable one.",
    ],
  },
  the_reliquary: {
    title: 'The Reliquary',
    giver: 'ho_rook',
    needs: 'rooks_ledger',
    offer: [
      "There's a line in my ledger with nothing against it. The Reliquary. Off the open court west of his nave, behind a lock like a hand of bone with a finger missing. Sixteen years, and not one of mine has been inside.",
      "The lock wants the Bone Key, and the Bone Key's in the Ossuary, off the same court. Get in. Tell me what's guarding it. What's in the chest is yours. What goes in my ledger is mine.",
    ],
    accept: "I'll get into the Reliquary.",
    acceptLine: "West off the nave, into the open court with the dry basin. The Ossuary's door is in the court's west wall: the Bone Key's somewhere in there. The Reliquary is behind the bone lock. Go in, count what's standing, and come out the way you went.",
    decline: 'Not that door.',
    declineLine: "No. Nobody has. That's why there's nothing against it.",
    journal: [
      "None of the roof-runners has been in the Reliquary: off the open court west of the black nave in the High Ward, behind a lock like a hand of bone, one finger short. The Bone Key, from the Ossuary off the same court, opens it. Go in.",
      "Go back to Dunmore Rook in the Gargoyles' Roost.",
    ],
    progress: [
      "The Reliquary, off the court west of the nave. The Bone Key first.",
    ],
    done: [
      "Guarded. By what? ...Two. That size. Hm. Then nobody's fetching the rest out without you, and I'll put that down as well.",
      "Here. A stone. It came out of that room forty years back, in somebody's boot. It's been through the ledger eleven times since. It stops with you. Your cut.",
    ],
    after: [
      "The Reliquary's line is full now. Sixteen years I looked at that gap. I don't know what I'll look at instead.",
    ],
  },

  // ---- Mother Coyle's: who's who down here ----
  the_holdout: {
    title: 'The Holdout',
    giver: 'ho_coyle',
    needs: 'the_bookcase',
    offer: [
      "Thirty of us down here, and you'll want four of them by name before you want anything else. Nobody down here does anything for a stranger. They'll do a good deal for somebody I've fed.",
      "Garrick Thole at the cold forge. Ivo Marrow, who'll be writing. Old Nettle behind her counter, and count your fingers after. And Little Bet, in the Sleeping Shelves, who'll ask you about the sky.",
    ],
    accept: "I'll go round them.",
    acceptLine: "Thole's by the east door. Marrow's at the short table. Nettle's stall is against the west wall. Bet's through the south door, at her lessons. Then come back and eat.",
    decline: 'Later.',
    declineLine: "Suit yourself. The pot's on either way.",
    journal: [
      "Mother Coyle wants you known in Pell's Holdout. Meet Garrick Thole, the armourer, at the cold forge by the east door.",
      "Meet Ivo Marrow, the copyist, at the short table by the fire.",
      "Meet Old Nettle at her counter against the west wall.",
      "Meet Little Bet in the Sleeping Shelves, through the Holdout's south door.",
      "Go back to Mother Coyle by the hearth.",
    ],
    progress: [
      "Thole, Marrow, Nettle and Bet. Then you eat.",
    ],
    others: {
      ho_thole: ["Coyle sent you. Then you've eaten her stew and lived, which is more than his garrison can say of mine. Garrick Thole. I made his plate for twenty years. I don't now. Come back when you want iron that's honest."],
      ho_marrow: ["Oh. Yes. Sorry, I was in the middle of a line. Ivo Marrow. I copy what he burns. If you're going near the Vault, come and talk to me first. Please."],
      ho_nettle: ["Coyle's feeding you, is she. Then you'll be worth my time in a week or so. Nettle. I buy what the castle loses and sell what it's looking for. Don't touch that."],
      ho_bet: ["You're from up top. Is it true the roof up there is so high you can't see it? Mother Coyle says it's called the sky. How many of you are there? I've counted thirty of us. I count every night."],
    },
    done: [
      "There. Now they'll nod to you, and Nettle will only rob you a little. Sit. Nobody leaves my fire hungry, not even the ones I don't like, and I haven't decided about you.",
      "Take this. It isn't much, but it's ours to give, which is more than he can say of anything in his larder.",
    ],
    after: [
      "Bet's told everyone about the sky. She has it wrong in four places, and I'm not correcting one of them.",
    ],
  },

  // ---- Sable Wren's: the man with the ledger ----
  the_ledger_keeper: {
    title: 'The Ledger-Keeper',
    giver: 'ho_wren',
    needs: 'the_scriveners_lift',
    offer: [
      "You want to run the roofs with us, you square it with Rook first. He keeps the ledger: which guard walks which bridge, and when, and who owes what to whom. Mostly who owes him.",
      "He's the sour one by the crates, doing sums. Go and let him look at you. He'll take against you. He takes against everybody. It passes.",
    ],
    accept: "I'll talk to him.",
    acceptLine: "By the crates at the back of the Roost. Don't lean on anything. He's counted it.",
    decline: 'Not now.',
    declineLine: "Then stay off the bridges till you have. I'm not paying his fines for you.",
    journal: [
      "Sable Wren says nobody runs the castle's roofs without Dunmore Rook's leave. Speak to him at the back of the Gargoyles' Roost.",
    ],
    progress: [
      "Rook. By the crates. Go on.",
    ],
    others: {
      ho_rook: ["Wren sent you. Wren sends me everything she can't be bothered to judge herself. Dunmore Rook. I was a clerk of his Treasury till I learned what it was paying for. Here, for your trouble in climbing this far. Now: I've work, if you can count past ten."],
    },
    done: [
      "He didn't throw anything? Then he likes you.",
      "That's as warm as Rook gets. Don't spoil it by thanking him.",
    ],
    after: [
      "Rook's put you in the ledger. Black ink. Most of us are in red.",
    ],
  },
};
