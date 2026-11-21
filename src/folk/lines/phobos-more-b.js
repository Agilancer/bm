// The words of City State Phobos's quests, set B (their workings: src/folk/phobos-quests-b.js): the Librarian's household's
// work in four of Castle Velscour's dungeons (src/core/delve-castle-b.js). Taken into src/folk/lines/phobos-hubs.js's LINES
// and QUESTS. As src/folk/lines/phobos-castle.js: the household is loyal to someone it never names (the V and T rule: no
// name of whom they serve, no mark, nothing that rings), and to the castle they are five people who keep his books, his
// maps, his horns and his stores.
//   Master Aldric Pell, the Librarian: old, courtly, dry. Wynn Pell, his ward, the map-maker: quick, sharp. Ondine, once a
//   sister of his Sanctuaries: quiet, exact. Jory Tallis, once quartermaster: counts everything. Pip Carrow, the
//   horn-blower: twelve, loud, fearless.
// (No new people here: these four dungeons' quests are all given by the five.)
export const LINES_B = {};

export const QUESTS_B = {
  // ==== the Clockworks ========================================================================================================
  the_clock_that_strikes: {
    title: 'The Clock That Strikes',
    giver: 'ph_pip',
    needs: 'the_hornwings',
    offer: [
      "You know why I blow the horns? Because his clock tells me to. Every hour it goes BONG and I go PAAARP. Nobody's ever seen what goes bong. I've asked. Jory says it's none of my business. That means he doesn't know.",
      "First go and hear it properly. Not from in here: from down on the Castle Approach, at night, when it strikes and the whole city holds still. Then get the Clock Tower's door open, at the end of my galleries, and go in and look. Just look! And tell me what's in there.",
    ],
    accept: "I'll hear it strike, then look inside.",
    acceptLine: "The Approach, after dark: stand there till it strikes. Then the door at the far end of the Horn Galleries, with his mark over it. It wants a key. Wynn says the key's painted into a picture, which is the stupidest place for a key I ever heard of.",
    decline: 'Not now, Pip.',
    declineLine: "Fine. It'll go bong at you whether you look or not.",
    journal: [
      'Pip Carrow has blown the castle\'s horns to the stroke of a clock nobody has ever seen inside. First hear it as the city does: stand on the Castle Approach at night.',
      "Go into the Clockworks, through the Clock Tower's door at the end of the Horn Galleries (it wants the Painted Key).",
      'Go back to Pip Carrow in the Librarian\'s rooms.',
    ],
    progress: [
      "The Approach, at night, to hear it. Then the Clock Tower's door, at the end of my galleries. Have you got it open yet?",
    ],
    done: [
      "GONGS. Iron gongs! I knew it wasn't a... I knew it was something. And a great lump with a hammer that hits them. That's who I've been taking orders from. A lump!",
      "Here. Master Pell says I'm to pay people properly and not in buttons.",
    ],
    after: [
      "I blew a wrong note at noon yesterday, on purpose. Nothing happened. I've been thinking about that ever since.",
    ],
  },

  stopping_the_train: {
    title: 'Stopping the Train',
    giver: 'ph_jory',
    needs: 'the_clock_that_strikes',
    offer: [
      "Forty-one gates in this castle go up and down by the clock. I've counted them. Not by a man at a winch: by the clock. A set of wheels low in the works they call the Going Train drives every one.",
      "There are little armoured wrights who keep it turning. Five of them fewer, and it stops, and forty-one gates stay where they are until somebody finds a winch. I know where the winches are. He doesn't.",
    ],
    accept: "Five of the wrights. I'll stop it.",
    acceptLine: "The Going Train is west off the Weight Shaft, the first great room inside. You'll hear it before you see it. And if you ever go up against the one who made it all: he'll have fewer hands, with his Train stopped.",
    decline: 'Not yet.',
    declineLine: "Then forty-one gates go on shutting on the hour. I'll keep counting.",
    journal: [
      'Jory Tallis has counted forty-one gates that open and shut by the clock. Put down five of the Gearwrights who keep the Going Train turning, west off the Weight Shaft in the Clockworks.',
      "Go back to Jory Tallis in the Librarian's rooms.",
    ],
    progress: [
      'Five of them, in the Going Train. West off the Weight Shaft.',
    ],
    done: [
      "It's stopped. The East Range portcullis has been half down for an hour and three of his knights are stood under it arguing. Forty-one. I'll go round and see which.",
      'Your share. Counted twice.',
    ],
    after: [
      'Thirty-eight of the forty-one are stuck open. The other three are stuck shut, and those were the three I wanted shut.',
    ],
  },

  behind_the_dial: {
    title: 'Behind the Dial',
    giver: 'ph_wynn',
    needs: 'the_clock_that_strikes',
    offer: [
      "There's a room behind the clock's face. There has to be: the hands go through the wall. And from behind that dial you could see the whole castle laid out, every roof. I've drawn it from the ground for six years. I want it from above.",
      "And the Escapement, while you're up there. The plans show it and then somebody's scratched it out. I don't like things scratched out.",
    ],
    accept: "I'll stand in both for you.",
    acceptLine: "Up the Pendulum Stair, then east for the dial and west for the Escapement. Or up the Hammer Stair off the Striking Floor, if you'd rather not walk under the pendulums. I would rather not.",
    decline: 'Not now.',
    declineLine: "Then it stays a blank with 'clock?' written on it. Which is embarrassing.",
    journal: [
      'Wynn Pell wants two rooms of the Clockworks for her map: the room behind the Great Dial, and the Escapement. Stand in both.',
      "Go back to Wynn Pell in the Librarian's rooms.",
    ],
    progress: [
      'Behind the Great Dial, east of the Pendulum Hall. The Escapement, west of it.',
    ],
    done: [
      "From behind the dial you can see the Keep's stair. You can see which roofs join. I've had three of them wrong for six years. Three!",
      "Take this. It's the castle from above, as much as I can draw from what you've told me. The rest I'll have to go and see. Don't tell him I said that.",
    ],
    after: [
      "I asked you what was behind the wheel in the Escapement and you went quiet. So there's something behind the wheel in the Escapement.",
    ],
  },

  the_striker: {
    title: 'The Striker',
    giver: 'ph_pip',
    needs: 'the_clock_that_strikes',
    offer: [
      "That lump with the hammer. The Striker. I've done what it said since I was six. Up at four to blow the watch on. Up at midnight to blow it off. I've never once had a whole night's sleep, and it's because of a lump.",
      "Break it. He gets wound tighter the longer you fight him, Jory says: there's a plate in the floor, black rings, that lets his spring down. Stand on it. Then hit him while he's stopped.",
    ],
    accept: "I'll break the Striker.",
    acceptLine: 'The Striking Floor, east off the Weight Shaft. Mind the hammers: they come down in rows. Stand between the rows.',
    decline: 'Not yet, Pip.',
    declineLine: "No. All right. I'll be up at four, then.",
    journal: [
      'The Striker beats the hours on iron gongs, and Pip Carrow has blown the horns to them since he was six. Destroy it, on the Striking Floor of the Clockworks: stand on the release plate when it is wound tight.',
      "Go back to Pip Carrow in the Librarian's rooms.",
    ],
    progress: [
      'The Striking Floor, east off the Weight Shaft. The black rings in the floor let his spring down.',
    ],
    done: [
      "It's quiet. It's actually quiet. Is this what it's like everywhere else? All the time?",
      "I slept till NINE. Master Pell came to see if I'd died. Here: I found this up in the galleries years ago and I was saving it for something good.",
    ],
    after: [
      "I still blow the horns. But I blow them when I think it's about time. Nobody's noticed. I'm quite good at about time.",
    ],
  },

  the_regulator: {
    title: 'The Regulator',
    giver: 'ph_ondine',
    needs: 'the_clock_that_strikes',
    offer: [
      "In the Sanctuaries we sang to a count. Not ours. It came down through the wall from the Pendulum Hall, and if a sister fell behind it she was taken out and another put in her place. The one who keeps that count is called the Regulator.",
      "Stop him. When he stops his clock, do not move: I have seen what is done to what moves out of time. And keep off the iron sills in the floor. The pendulums come along them.",
    ],
    accept: "I'll stop the Regulator.",
    acceptLine: 'Up the Pendulum Stair, at the far end of the Weight Shaft. Three pendulums swing the width of his hall, in turn. Count them. He does.',
    decline: 'Not yet.',
    declineLine: 'No. It is a hard thing to walk under. I walked under it for eleven years.',
    journal: [
      "The Regulator keeps the count the sisters of the Sanctuaries were made to sing to. Kill him in the Pendulum Hall of the Clockworks: keep off the pendulums' sills, and stand still when he stops the clock.",
      "Go back to Ondine in the Librarian's rooms.",
    ],
    progress: [
      'The Pendulum Hall, up the stair from the Weight Shaft. When he stops the clock, be still.',
    ],
    done: [
      'I sang this morning and nothing counted me. I lost my place twice. I have never been so glad to lose my place.',
      'This was made for a sister who fell behind. It was never worn. Wear it out of time.',
    ],
    after: [
      'The pendulums still swing, you say. Let them. Nobody is being counted by them.',
    ],
  },

  the_clockmaker: {
    title: 'The Clockmaker',
    giver: 'ph_librarian',
    needs: 'the_striker',
    offer: [
      "There is a lift at the top of the Clock Tower. I have the drawings: it goes up into the High Ward, behind every gate he has. It wants winding with a key the length of your arm, and the Clockmaker wears that key and has never once taken it off.",
      "He will try to turn back the hour on you: put right whatever you have done to him. His winders do the turning, at two posts. Cut them down before the hour is turned. If the Escapement were jammed, he could not do it at all.",
    ],
    accept: "I'll bring you the Winding Key.",
    acceptLine: "The Lift Head, at the very top. His doors stay shut while the Striker and the Regulator live. And keep ahead of the long hand when it comes round. I'm told it does not stop for anyone, which is the whole trouble with clocks.",
    decline: 'Not yet.',
    declineLine: 'No. He has had two hundred years to get ready for you. A little longer will not change the odds.',
    journal: [
      'The Clockmaker wears the Winding Key, which winds the lift at the top of the Clock Tower up into the High Ward. Kill him at the Lift Head of the Clockworks: cut his winders down before he turns back the hour.',
      'Go back to Master Aldric Pell in his rooms off the Ancient Library.',
    ],
    progress: [
      'The Lift Head, at the top of the Clockworks. His two first: the Striker, the Regulator.',
    ],
    done: [
      "So that is the key. Heavier than it looks in the drawings. Keep it: you will be the one riding the lift, and I am too old to be wound up into anything.",
      "And this, for the trouble. It was the long hand of a much smaller clock, once. I'm told you'll know what to do with it.",
    ],
    after: [
      "His clock has stopped at a quarter past something. The court is late for everything. I find I do not mind at all.",
    ],
  },

  // ==== the Menagerie of Chains ===============================================================================================
  what_is_fed: {
    title: 'What Is Fed',
    giver: 'ph_ondine',
    needs: 'the_household',
    offer: [
      "I told you I sang over his feasts until I saw what was carried in to them. I did not tell you where it was carried from. There is a door in the far wall of the Conservatory. Things go in through it alive, on carts.",
      "I have never been through it. I need to know that I was right to stop singing. Walk the Cage Rows, and the Larder past them, and come back and tell me.",
    ],
    accept: "I'll go and see.",
    acceptLine: "The Menagerie's door, in the Conservatory. It is locked: the Iron Marshal has its key, under the castle yard. The Cage Rows are the first hall. The Larder is south of them. You will know it.",
    decline: 'Not now.',
    declineLine: 'No. I would not, either. But somebody should.',
    journal: [
      "Ondine stopped singing at his feasts when she saw what was carried in to them. Go into the Menagerie of Chains, through the door in the Conservatory's far wall (it wants the Marshal's Key).",
      'Walk the Cage Rows, the first hall of the Menagerie, and the Larder south of them.',
      "Go back to Ondine in the Librarian's rooms.",
    ],
    progress: [
      'The Cage Rows, and the Larder south of them. Through the door in the Conservatory.',
    ],
    done: [
      'Then I was right. I had hoped, a little, to have been a fool.',
      'Thank you for looking. Take this. I will not ask you to look at anything else for a while.',
    ],
    after: [
      'I think of the cages that stood open. Something got out of those, once. I hope it got far.',
    ],
  },

  the_wolf_runs: {
    title: 'The Wolf Runs',
    giver: 'ph_jory',
    needs: 'what_is_fed',
    offer: [
      "I kept the Armoury's rolls for nineteen years, and there was a line on them I never understood. 'Hounds, the pit's: forty.' Forty, every year. They eat a hound a week down there and it's always forty. Somebody's breeding them.",
      "It's the Wolf Runs, east of the Cage Rows. Five fewer, and the number's wrong for the first time in nineteen years. Then go down into the city and tell Maud Treller at the dye works. It's her people those hounds are loosed on, when they try his walls.",
    ],
    accept: "Five hounds, then word to the dye works.",
    acceptLine: "East off the Cage Rows. Three long pens. The one in the middle stands open, which I do not like the sound of. Then the Tanners' Steps: tell the captain the wall has five hounds fewer. She'll know which night to use.",
    decline: 'Not yet.',
    declineLine: 'Forty it stays, then.',
    journal: [
      "Jory Tallis's rolls have shown forty pit hounds every year for nineteen years. Put down five in the Wolf Runs, east of the Cage Rows in the Menagerie of Chains.",
      "Go down into the city, to the dye works on the Tanners' Steps, and tell Maud Treller the wall has five hounds fewer.",
    ],
    progress: [
      "Five of them, in the Wolf Runs. Then word to Maud Treller at the dye works, on the Tanners' Steps.",
    ],
    others: {
      ph_watch: ["Five fewer. ...Then it's thirty-five on the wall, and they run them in sevens. That's a gap of one watch in five, and Jory will have worked out which. Tell him we'll use it. Tell him nothing else: he'll want to count us."],
    },
    done: [
      "Thirty-five. I've written it down. Thirty-five! Nineteen years I've wanted to write a different number on that line. And the captain knows which watch is short.",
      "Here. And if you empty the Runs altogether, their Keeper can't loose a single wolf at you. I'd empty them.",
    ],
    after: [
      "I've left the roll open at that page. Thirty-five. I look at it when I want cheering up.",
    ],
  },

  under_the_great_cage: {
    title: 'Under the Great Cage',
    giver: 'ph_wynn',
    needs: 'what_is_fed',
    offer: [
      "The Menagerie's roof is wrong. From outside there's a drum on the south-west corner taller than the hall it stands on, and nothing in the plans under it. A room that tall is a cage. For something that flies.",
      "And there's water down there somewhere: the Aqueduct loses a tenth of what goes into it, and I've never found where. Find me the tall room and the wet one.",
    ],
    accept: "I'll find them both.",
    acceptLine: "The tall one's south-west of the Cage Rows, I'd bet a week's ink. The wet one, east. If something screams at you in the tall one, get behind something. That's not advice from the plans, that's just advice.",
    decline: 'Not now.',
    declineLine: 'Then I keep drawing a roof with nothing under it.',
    journal: [
      "Wynn Pell's map has a roof with nothing under it and an aqueduct that loses water. Stand in the Aviary and by the Wyrm Tank, in the Menagerie of Chains.",
      "Go back to Wynn Pell in the Librarian's rooms.",
    ],
    progress: [
      'The Aviary, south-west of the Cage Rows. The Wyrm Tank, east past the Wolf Runs.',
    ],
    done: [
      "Dead trees. Indoors. With cages hung in them. And he keeps WYRMS in the castle's drinking water. I have been drinking that water. I have been drinking that water for nineteen years.",
      "Take this. I found it in the Aqueduct's silt and never knew what it was out of. Now I think I do.",
    ],
    after: [
      "I've drawn the Aviary. I've drawn it very small, and put a great many trees in it.",
    ],
  },

  old_hunger: {
    title: 'Old Hunger',
    giver: 'ph_librarian',
    needs: 'what_is_fed',
    offer: [
      "His court bets, you know. Not on cards. There is a pit, west of the cages, and a thing on a chain in it that has never lost. They call it Old Hunger. The book on it is in my library, in a hand I am sorry to say I recognise.",
      "It mends by eating. Whatever dies in that pit, it eats, and is the stronger. If you would kill it, do not let it feed: stand on the carcass, and kick it down the drain before the thing can reach it.",
    ],
    accept: "I'll kill Old Hunger.",
    acceptLine: 'The Baiting Pit, west off the Cage Rows, down a ramp. They let hounds in to it by three gates. Kill the hounds near the drain, if you can choose.',
    decline: 'Not yet.',
    declineLine: 'No. The odds on you were very long, in any case. I looked.',
    journal: [
      "His court bets on a thing chained in the Baiting Pit that has never lost. Kill Old Hunger, in the Menagerie of Chains: stand on what dies in his pit, and kick it into the drain before he eats.",
      'Go back to Master Aldric Pell in his rooms off the Ancient Library.',
    ],
    progress: [
      'The Baiting Pit, west off the Cage Rows. Do not let him feed.',
    ],
    done: [
      "Dead. Then a great many people at court have lost a great deal of money this morning, and I shall have to pretend to be sorry for them at dinner.",
      "The book is closed. I have closed it myself. This was the stake on the last page: nobody else is going to collect.",
    ],
    after: [
      "They have nothing to bet on now. One of them tried to start a book on the weather. He was not popular.",
    ],
  },

  the_matron_of_wings: {
    title: 'The Matron of Wings',
    giver: 'ph_pip',
    needs: 'what_is_fed',
    offer: [
      "You cleared the hornwings out of my galleries. They came back. They ALWAYS come back, because there's a big one somewhere that keeps having more. Wynn found where. There's a room as tall as the sky with dead trees in it.",
      "Kill the big one. When she takes a breath, a great big one, get behind a tree. I've heard her through four walls and it made my teeth hurt. Behind. A. Tree.",
    ],
    accept: "I'll kill their mother.",
    acceptLine: "The Aviary. South-west of the Cage Rows, or up from the pit. When she shrieks, anything she can see gets it. So don't let her see you. That's the whole trick!",
    decline: 'Not yet, Pip.',
    declineLine: "Then I'll go on shooing them with a broom. It doesn't work. I just like doing something.",
    journal: [
      'The hornwings that plague the Horn Galleries are bred by one great one. Kill the Matron of Wings, in the Aviary of the Menagerie of Chains: when she draws breath to shriek, get a dead tree between you and her.',
      "Go back to Pip Carrow in the Librarian's rooms.",
    ],
    progress: [
      "The Aviary, south-west of the Cage Rows. Behind a tree when she breathes in!",
    ],
    done: [
      "No more hornwings? Ever? I'm going to leave my bread on the rail tonight. On the RAIL. Just to see it still there in the morning.",
      "This was hers, I think. It fell down the stair once and I kept it, and it's hummed ever since. You have it. It gives me a headache.",
    ],
    after: [
      "The bread was still there. I ate it. Best bread I ever had.",
    ],
  },

  the_keeper_of_chains: {
    title: 'The Keeper of Chains',
    giver: 'ph_librarian',
    needs: 'old_hunger',
    offer: [
      "The Keeper of Chains has a ring of keys. Every cage in the Menagerie, and one that is not a cage's: it opens the Hall of Mirrors, up on the High Ward, where his court goes to look at itself. I should like that door open.",
      "His chain will take one of you and reel you in. Put a post between you and him: it snags, and he goes over. And whatever beasts are left in his wings, he will loose: the wolves, the spiders, the wyrmlings. Leave him none.",
    ],
    accept: "I'll bring you his ring.",
    acceptLine: "The Ring of Chains, past his lodge, at the Menagerie's far end. His gate stays shut while Old Hunger and the Matron live. Empty the Wolf Runs, the south Cage Rows and the Wyrm Tank first, and he fights alone.",
    decline: 'Not yet.',
    declineLine: 'No. A man who has never been caught is entitled to think it over.',
    journal: [
      "The Keeper of Chains carries the Keeper's Key, which opens the Hall of Mirrors on the High Ward. Kill him in the Ring of Chains: put a chain post between you and his chain. He looses the beasts of every wing you did not empty.",
      'Go back to Master Aldric Pell in his rooms off the Ancient Library.',
    ],
    progress: [
      'The Ring of Chains, at the far end of the Menagerie. His two first: Old Hunger, the Matron.',
    ],
    done: [
      "The whole ring. Forty-odd cages and one door. Keep it: I have no wish to open a cage, and you will want the door.",
      "And his coat, which I'm told was the only thing in that place he ever looked after. It will look better on almost anyone.",
    ],
    after: [
      "Ondine tells me the cages stand open and empty. She asked me to thank you. She did not say for what, and I did not ask.",
    ],
  },

  // ==== the Ossuary ===========================================================================================================
  where_she_sang: {
    title: 'Where She Sang',
    giver: 'ph_ondine',
    needs: 'the_feast_that_walks',
    offer: [
      "Before the Sanctuaries I sang in his Ossuary, on the High Ward's east terrace. One winter. Its walls are bone. I was told they were the castle's builders, and that it was an honour to them. I was fourteen. I believed it.",
      "I have not been back. I would like to know whether it is as I remember, or whether a child made it worse than it was. Go in, only as far as the porch, and tell me.",
    ],
    accept: "I'll go as far as the porch.",
    acceptLine: 'On the east terrace of the High Ward: a long house with no windows. The door is not locked. Nothing that goes in there is expected to want to leave.',
    decline: 'Not now.',
    declineLine: 'No. Some doors are better remembered than opened.',
    journal: [
      "Ondine sang one winter in his Ossuary, on the High Ward's east terrace, and wants to know if it is as she remembers. Go in, as far as the Bone Porch.",
      "Go back to Ondine in the Librarian's rooms.",
    ],
    progress: [
      "His Ossuary, on the High Ward's east terrace. Only as far as the porch.",
    ],
    done: [
      'Then the child did not make it worse. I had wondered, for twenty years, if I was unjust to him. I was not.',
      'Thank you. That is worth more to me than you would think. Take this.',
    ],
    after: [
      'I remember a red light in the middle of the nave. We were told not to stand in it. I never asked why.',
    ],
  },

  names_in_the_wall: {
    title: 'Names in the Wall',
    giver: 'ph_librarian',
    needs: 'where_she_sang',
    offer: [
      "My master kept this library before me, and his before him. Each of them, at the end, was sent for by the Bone Prior, and I have not found one grave. I know where they are. I should like to know where in it.",
      "The newest go to the Charnel Aisle, to be sorted. The honoured go under, to the crypt. The rest are in the nave. Walk all three. If there is a name anywhere, on anything, bring it back to me.",
    ],
    accept: "I'll look for their names.",
    acceptLine: "The nave is straight on from the porch. The Charnel Aisle is west of it, through two arches. The crypt is down a stair from the aisle's far end. I do not expect a name. He does not keep them. But I should like to have looked.",
    decline: 'Not now.',
    declineLine: 'No. It is not a pleasant errand, and it has waited sixty years. It can wait.',
    journal: [
      "Every Librarian before Master Pell was sent for by the Bone Prior at the end, and has no grave. Walk the Nave of Skulls, the Charnel Aisle and the Under-Crypt of his Ossuary, looking for a name.",
      'Go back to Master Aldric Pell in his rooms off the Ancient Library.',
    ],
    progress: [
      'The Nave of Skulls, the Charnel Aisle west of it, the Under-Crypt down its stair.',
    ],
    done: [
      "No names. No. He would not. Then they are all of them my master, every one in that wall, and I shall think of them so.",
      "This is the last thing my master wrote, before he was sent for. It is a plan of the Ossuary, with one room on it that is on no other. I think he meant it for whoever came after me.",
    ],
    after: [
      "I have started a book of names. Everyone I can remember who was sent for. It is not a grave. It is a little like one.",
    ],
  },

  the_cantor_of_jaws: {
    title: 'The Cantor of Jaws',
    giver: 'ph_ondine',
    needs: 'where_she_sang',
    offer: [
      "She taught me. The Cantor of Jaws. She stood behind us in the choir, and when a girl's voice broke, she tithed her: that was the word. Bone came up out of the floor where the girl stood. It stayed there. We sang round it.",
      "Take her tithe to the walls, so the floor stays clear. And when she gathers it in, every one of them bursts: be ready to jump. Then stop her voice. I am asking you plainly.",
    ],
    accept: "I'll stop her voice.",
    acceptLine: 'The Choir of Jaws, east off the nave. She will have her choir with her, before the end. They are children. They were children.',
    decline: 'Not yet.',
    declineLine: 'No. I could not, either. That is why I am asking you.',
    journal: [
      "The Cantor of Jaws taught Ondine to sing, and tithed the girls whose voices broke. Kill her in the Choir of Jaws of his Ossuary: take her tithe of bone to the walls, and jump the rings when she gathers it in.",
      "Go back to Ondine in the Librarian's rooms.",
    ],
    progress: [
      'The Choir of Jaws, east off the Nave of Skulls. Her tithe to the walls.',
    ],
    done: [
      'I thought I would feel lighter. I do not, yet. But I think the girls do.',
      'This was in her stall. She would not have wanted me to have it. That is reason enough for you to.',
    ],
    after: [
      'I sang the old verse through last night, the one she tithed for. All of it. Nothing came up out of the floor.',
    ],
  },

  the_old_priors: {
    title: 'The Old Priors',
    giver: 'ph_jory',
    needs: 'where_she_sang',
    offer: [
      "Every Prior that ossuary ever had is still on its books. Drawing stores! Wax, wine, cloth. Dead a hundred and fifty years, some of them, and I signed for their candles every quarter. Down in the crypt, the lot of them.",
      "They get up, when the one upstairs calls. Lay six of them down again, and bring me eight of the bones: I'll weigh them against what they've drawn, and strike them off by the pound. And when you go for him, he'll call, and nobody'll come.",
    ],
    accept: 'Six in the crypt, and eight bones.',
    acceptLine: "Down the Crypt Stair, from the far end of the Charnel Aisle. There's water standing on the floor. Don't ask me whose stores that comes out of. Any bones will do me. They none of them kept their own.",
    decline: 'Not yet.',
    declineLine: "Then I go on signing for a dead man's candles.",
    journal: [
      "His Ossuary's dead priors still draw stores on Jory Tallis's books, and rise when the Bone Prior calls. Put down six of what lies in the Under-Crypt, down the stair from the Charnel Aisle.",
      "Bring eight Bone Shards to Jory Tallis in the Librarian's rooms, to be weighed against what the dead have drawn.",
    ],
    progress: [
      'Six, in the Under-Crypt, down the stair from the Charnel Aisle. And eight of the bones, to weigh.',
    ],
    done: [
      "Eight bones. Two pound four. And they drew forty-eight pound of wax a year between them. Struck off, the six of them. He'll never know to thank me.",
      'Here. Out of what I saved.',
    ],
    after: [
      "I found a seventh on the books this morning, under another name. They're cleverer dead than they were alive.",
    ],
  },

  the_bone_prior: {
    title: 'The Bone Prior',
    giver: 'ph_librarian',
    needs: 'the_cantor_of_jaws',
    offer: [
      "The Bone Prior sent for my master. He will send for me, in my turn: I had the letter in the spring. I have not answered it. I had thought to let you answer it for me.",
      "He names one of you, and the named must kneel: not a step, until the bone has come up. He drinks what it costs you if you stir. The rest of you, stand clear of the one kneeling. That is all his art. It has been enough for a long time.",
    ],
    accept: "I'll answer his letter.",
    acceptLine: "The Sanctuary, at the head of the nave. Its doors stay shut while his Cantor lives. Empty the crypt first, and his old priors lie still when he calls. Empty the Charnel Aisle, and he has no bone to pull down on you.",
    decline: 'Not yet.',
    declineLine: 'No. There is no hurry. He said the autumn.',
    journal: [
      'The Bone Prior has sent for every Librarian in turn, and now for Master Pell. Kill him in the Sanctuary of his Ossuary: when he names you, kneel, and do not move; when he names another, stand clear of them.',
      'Go back to Master Aldric Pell in his rooms off the Ancient Library.',
    ],
    progress: [
      "The Sanctuary, at the head of the Nave of Skulls. His Cantor first.",
    ],
    done: [
      "Then I shall not be going, in the autumn. Do you know, I had quite made up my mind to it? I shall have to find something else to do with October.",
      "This was the pall they laid over a Librarian, when he was sent for. It was to have been mine. I should much rather you had the wearing of it.",
    ],
    after: [
      "I burned his letter. Sixty years in a library, and that is the first piece of writing I have ever burned. I enjoyed it very much.",
    ],
  },

  // ==== the Hall of Mirrors ===================================================================================================
  the_silvered_door: {
    title: 'The Silvered Door',
    giver: 'ph_wynn',
    needs: 'the_household',
    offer: [
      "There's a hall on the High Ward's south terrace that I can't draw. Not won't. Can't. I went as far as its door once and the door had me in it, drawn better than I draw. I came home.",
      "Its door's locked now anyway: the Keeper of Chains has the key, down in the Menagerie. But if you ever get it open, go through. Just through. And tell me whether the rooms are where rooms should be.",
    ],
    accept: "I'll go through the Silvered Door.",
    acceptLine: "South terrace of the High Ward: the long hall with all the windows that aren't windows. Don't look at anything for too long. That's not a map-maker's rule. That's just mine.",
    decline: 'Not now.',
    declineLine: "Good. I mean: fine. It'll keep.",
    journal: [
      "Wynn Pell can't draw the hall on the High Ward's south terrace. Go into the Hall of Mirrors, through the Silvered Door (it wants the Keeper's Key).",
      "Go back to Wynn Pell in the Librarian's rooms.",
    ],
    progress: [
      "The Silvered Door, on the High Ward's south terrace. It wants the Keeper's Key.",
    ],
    done: [
      "A gallery, then rooms off it, then a hall. That's all? That's an ordinary plan! I've been frightened of an ordinary plan for three years.",
      "Here. I'd say I wasn't frightened but you saw my face when you came in.",
    ],
    after: [
      "I've drawn the gallery. I drew it with my back to my own mirror. Came out fine.",
    ],
  },

  cover_the_glasses: {
    title: 'Cover the Glasses',
    giver: 'ph_ondine',
    needs: 'the_silvered_door',
    offer: [
      "When a sister died in the Sanctuaries we covered every glass in the house, so that nothing of her would stay in one. I thought it was only a custom. In that hall it is not a custom. Things have stayed.",
      "There are three great glasses uncovered: in the Cabinet of Faces, in the Dressing Rooms, and at the heart of the maze. What keeps each room keeps its glass open. Empty the rooms, and the glasses will be draped.",
    ],
    accept: "I'll empty all three rooms.",
    acceptLine: 'The Cabinet is east off the Long Glass. The Dressing Rooms west, and the Glass Maze past them. Whoever rules that hall calls an image out of every glass left uncovered. Leave her none.',
    decline: 'Not yet.',
    declineLine: 'No. Then do not stand long in front of them.',
    journal: [
      'Three great glasses stand uncovered in the Hall of Mirrors. Put down five of what keeps the Cabinet of Faces, east off the Long Glass.',
      'Put down five of what keeps the Dressing Rooms, west off the Long Glass.',
      'Put down three of what keeps the Glass Maze, past the Dressing Rooms.',
      "Go back to Ondine in the Librarian's rooms.",
    ],
    progress: [
      'The Cabinet of Faces, the Dressing Rooms, the Glass Maze. Empty all three.',
    ],
    done: [
      'Draped. All three. Then whatever was in them can rest, or can at least not look out.',
      'We gave a coin to whoever covered the glasses. I have no such coin. This is better than a coin.',
    ],
    after: [
      'I have covered the glass in my own room. I know there is nothing in it. I covered it anyway.',
    ],
  },

  the_room_on_no_plan: {
    title: 'The Room on No Plan',
    giver: 'ph_wynn',
    needs: 'the_silvered_door',
    offer: [
      "The Long Glass is sixty-eight paces. You told me so. The wall it's built against is seventy-eight. Ten paces of wall with nothing behind it? There's a room in there. Somebody's hidden a room behind a mirror, in a hall of mirrors. That's almost funny.",
      "Find it. It'll be behind a glass that's covered: you don't hide a door behind something people look into. And walk the maze. Then ask Ondine who'd want a room like that. She knows that hall. She won't tell me. She might tell you.",
    ],
    accept: "I'll find your room, and ask her.",
    acceptLine: "West wall of the Long Glass, near the door end, a draped one. For the maze: it goes round before it goes in. If you find yourself at the Hall's door, you've gone round and not in.",
    decline: 'Not now.',
    declineLine: "Ten paces! It's going to keep me awake.",
    journal: [
      "Wynn Pell's sums say a room is hidden behind the Long Glass's west wall. Find the Covered Room, behind a draped glass in the Long Glass; and stand in the Glass Maze.",
      "Ask Ondine, in the Librarian's rooms, who sat in the Covered Room.",
      "Go back to Wynn Pell in the Librarian's rooms.",
    ],
    progress: [
      "A draped glass in the Long Glass's west wall, near the door. And the Glass Maze, west past the Dressing Rooms. Then ask Ondine.",
    ],
    others: {
      ph_ondine: [
        "A chair turned to the wall, and every glass covered. ...Yes. A sister of ours was sent to that hall, to sing while the court looked at itself. She would not be looked at. She sat there four years.",
        "Then one morning the chair was empty and the door was shut from outside. Tell Wynn she got out. I have always told myself she got out.",
      ],
    },
    done: [
      "Four years with her back to them. In HIS castle. And Ondine says she got out? Then there's a way out of that hall that isn't on my plan either. I like her already.",
      "Here's the Hall as I have it now, with your room on it. First plan of that place with no blanks. Don't fold it on the mirrors.",
    ],
    after: [
      "I've started looking for the way she went. Ten paces of wall, a covered glass. If she found one, there's another.",
    ],
  },

  the_glazier: {
    title: 'The Glazier',
    giver: 'ph_jory',
    needs: 'the_silvered_door',
    offer: [
      "Quicksilver. Eleven hundredweight a year, signed for by 'the Glazier', and not one mirror in this castle has ever been mended. I asked what he did with it. I was told to stop asking. So I counted instead.",
      "He's making more. Not glasses: what's in them. He pulls a reflection out and stands it up, and it throws back whatever he throws. Break them as they come, or you'll be fighting a roomful of him.",
    ],
    accept: "I'll put a stop to the Glazier.",
    acceptLine: "His shop's east of the Long Glass's foot, or through the Cabinet. Five glasses round the walls: that's five reflections, if you let him. Don't let him.",
    decline: 'Not yet.',
    declineLine: "Eleven hundredweight. I'll go on signing, then.",
    journal: [
      "The Glazier draws eleven hundredweight of quicksilver a year and mends nothing. Kill him in his shop in the Hall of Mirrors: break the reflections he pulls out of the glass, each of which throws his glare back at you.",
      "Go back to Jory Tallis in the Librarian's rooms.",
    ],
    progress: [
      "The Glazier's Shop, east off the foot of the Long Glass. Break the reflections.",
    ],
    done: [
      "No more quicksilver on the books. That's the cleanest page I've had since the Armoury. I could frame it. In anything but a mirror.",
      'Your share. And this: it came up from his shop in a crate marked breakages.',
    ],
    after: [
      "Someone's signed for a hundredweight this morning in his name. So either he's got an apprentice or his reflection can write.",
    ],
  },

  the_duchess_and_her_glass: {
    title: 'The Duchess and Her Glass',
    giver: 'ph_librarian',
    needs: 'the_glazier',
    offer: [
      "The Duchess has kept the Hall of Mirrors since before I was born, and has not, in that time, grown a day older. I have her portrait at twenty, and I have seen her this year. It is the one thing in this castle I envy.",
      "There are two of her in that hall. One is the Duchess: she bleeds. The other is only in the glass, and nothing touches it. They change places. Strike the one that bleeds, and when they change, find her again. She keeps the key to his antechambers.",
    ],
    accept: "I'll find the one that bleeds.",
    acceptLine: "The Hall, at the end of the Narrowing. Shut while her Glazier lives. What she throws is red; what the glass throws is pale. And every great glass left uncovered sends her an image: Ondine will have told you what to do about those.",
    decline: 'Not yet.',
    declineLine: 'No. She has all the time in the world. It is rather the point of her.',
    journal: [
      'The Duchess keeps the Silvered Key, to the Throne Antechambers. Kill her in the Hall of Mirrors: of the two of her, strike the one that bleeds, and find her again when they change places.',
      'Go back to Master Aldric Pell in his rooms off the Ancient Library.',
    ],
    progress: [
      'The Hall of Mirrors, at the end of the Narrowing. Her Glazier first. Strike the one that bleeds.',
    ],
    done: [
      "Dead, and old at last, I expect. I shall take her portrait down. No: I shall leave it up. Somebody should remember her at twenty, and it will not be her glass.",
      "The key is yours to carry. And this was hers. You can see the door it opens in it, if you hold it right, which I find I would rather not do.",
    ],
    after: [
      "I looked in a glass this morning, for the first time in some years. An old man looked back. It was only me. I was very relieved.",
    ],
  },
};
