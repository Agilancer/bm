// The words of City State Phobos's quests, set A (their workings: src/folk/phobos-quests-a.js): to and through three of
// Castle Velscour's dungeons, the Drowned Archive, the Gallery of a Thousand Portraits and the Alchemists' Undercroft
// (src/core/delve-castle-a.js). Taken into src/folk/lines/phobos-hubs.js's LINES and QUESTS. As src/folk/lines/phobos-castle.js.
// Nobody new speaks here: the Librarian's household (who show nothing of whom they're loyal to: no name, no oath, no
// mark), Princess Apricot, Maud Treller of the Quiet Watch (who names nobody), Edda Grail of the Ashwardens.
export const LINES_A = {};

export const QUESTS_A = {
  // ==== the Drowned Archive ====================================================================================================
  the_drowned_archive: {
    title: 'The Drowned Archive',
    giver: 'ph_librarian',
    needs: 'dust_in_the_stacks',
    offer: [
      "This library had a floor under it, once. The lower stacks. He couldn't make my master's archivists unwrite what was in them, so he had the cistern broken over the lot. Books, archivists and all.",
      "That was before my time. The door's still there, at the foot of the south wall outside, and I've never had anyone to send down it. Go and look. Only look. Tell me what the water left.",
    ],
    accept: "I'll go down and look.",
    acceptLine: "Out of the ward by the Postern, and round to the south side of the Library: the Sunk Door's at the foot of the wall. Take company, if you keep any. The ones who stayed down there never came up.",
    decline: 'Not yet.',
    declineLine: "No. It's waited this long. Water is patient. So, I'm told, am I.",
    journal: [
      "Under the Ancient Library are its old lower stacks, drowned when the cistern over them was broken. Go down the Sunk Door, at the foot of the Library's south wall in the Middle Ward, into the Drowned Archive.",
      'Go back to Master Aldric Pell in his rooms off the Ancient Library.',
    ],
    progress: [
      "The Sunk Door, at the foot of the Library's south wall, outside. Only look.",
    ],
    done: [
      "The lamps are lit? Then somebody trims them. Forty years I've sat over the top of that, reading, and somebody below me has been trimming the lamps.",
      "Sit down a moment. No. I will. Take this, and give me until tomorrow to think what to ask you for next.",
    ],
    after: [
      "I hear it now, at night. Water, moving under the floor. I never used to. I suppose I never used to listen.",
    ],
  },
  what_the_water_kept: {
    title: 'What the Water Kept',
    giver: 'ph_librarian',
    needs: 'the_drowned_archive',
    offer: [
      "My master's master kept a stack apart from the rest. The books he wouldn't lend a lord. It's on no plan of the Archive, and I've read every plan. I only know it was near the Bindery, because the binders complained of the draught.",
      "Go through the Scriptorium first and see what the copyists were at when the water came. Then find me that stack. If one case in the Bindery stands out from its wall, look behind it.",
    ],
    accept: "I'll find it.",
    acceptLine: "The Scriptorium's south of the Catalogue, on the west side. The Bindery's east, off the Reading Room. A case that stands a hand out from the wall. Binders are tidy people. It will look wrong.",
    decline: 'Another day.',
    declineLine: "Quite right. A book that's waited eighty years can wait for your boots to dry.",
    journal: [
      "The old Librarians kept a stack apart, on no plan of the Drowned Archive. Walk the Scriptorium, then find the Sealed Stack: behind a case in the Bindery that stands out from the wall.",
      'Go back to Master Aldric Pell.',
    ],
    progress: [
      "The Scriptorium, and then the stack by the Bindery. A case that stands out from its wall.",
    ],
    done: [
      "Dry. All of it dry. He broke a cistern to drown them and they sat behind a bookcase the whole time with their feet up. ...Forgive me. I don't often laugh. It's undignified at my age.",
      "Here. From the high shelves: one I can spare. You've earned the reading of it.",
    ],
    after: [
      "I've begun a list of what's in that stack, from memory of my master's memory. It runs to nine pages. I'm on the first.",
    ],
  },
  the_sluice_wardens: {
    title: 'The Sluice Wardens',
    giver: 'ph_jory',
    needs: 'the_drowned_archive',
    offer: [
      "Two sluices. West and east, off the long flooded nave. I've got the keys to both gates on the ring, numbers sixty and sixty-one, never used. Somebody's posted wardens on each, which tells you the gates still work.",
      "Whatever sits at the bottom of that Archive lives by the water. Take the wardens off both sluices and the water answers to us. Four at each will do it. I counted the bunks on the plan.",
    ],
    accept: 'Four at each sluice.',
    acceptLine: "West Sluice first: it's the further. Off the Long Flood's west side, or round through the Scriptorium. Then the East, straight across the nave. Mind the big ones. They keep the wheels.",
    decline: 'Not now.',
    declineLine: "Then sixty and sixty-one stay on the ring. They've been patient. Keys are.",
    journal: [
      "The Drowned Archive's two sluices are held by his wardens. Put down four of whatever holds the West Sluice, off the Long Flood's west side.",
      'Put down four of whatever holds the East Sluice, across the Long Flood.',
      'Go back to Jory Tallis in the Librarian\'s rooms.',
    ],
    progress: [
      'Four at the West Sluice, four at the East. Off the Long Flood, either side.',
    ],
    done: [
      "Both. Good. That's two gates in his castle that open on my say and not his. Sixty and sixty-one. I've put a tick by each.",
      "Your share. Counted twice. Whatever's down at the end of that nave will find its tide runs out quicker than it's used to.",
    ],
    after: [
      "I had Pip listen at the floor. He says the water's lower. He also says he heard a fish. I've ticked the first and not the second.",
    ],
  },
  where_the_flood_goes: {
    title: 'Where the Flood Goes',
    giver: 'ph_pip',
    needs: 'the_drowned_archive',
    offer: [
      "Is it true there's a whole room under us full of water? With books in? Wynn says it has to go somewhere or it'd come up through the floor. She says water always goes somewhere.",
      "I bet her my second-best horn it just stays. Will you go and see? The big long flooded bit, and then wherever it drains. If it drains. Which it doesn't. Probably.",
    ],
    accept: "I'll see where it goes.",
    acceptLine: "It's called the Long Flood. Wynn drew it from the old plans. And she's drawn a little room past the west sluice with a question mark in. Go there. Don't fall in anything!",
    decline: 'Not today, Pip.',
    declineLine: "Aw. Well, I'm not giving her the horn till somebody's looked.",
    journal: [
      "Pip Carrow has bet Wynn the Archive's water doesn't drain. Walk the Long Flood, south of the Drowned Reading Room, and find where it goes: past the West Sluice.",
      "Go back to Pip Carrow in the Librarian's rooms.",
    ],
    progress: [
      'The Long Flood, and then the little room past the West Sluice.',
    ],
    done: [
      "A drain? A real one? Going DOWN? What's under under-the-library? ...I've lost my second-best horn, haven't I.",
      "Here, you have this, I found it. Don't tell Wynn where the drain goes. No, do. No. Let me tell her. I want to see her face.",
    ],
    after: [
      "Wynn's got my horn on her shelf. She can't even blow it. She just looks at it and smiles. It's the worst thing that's ever happened.",
    ],
  },
  struck_from_the_index: {
    title: 'Struck from the Index',
    giver: 'ph_ondine',
    needs: 'the_drowned_archive',
    offer: [
      "When I sang for him, there was a woman who came up to the Sanctuaries twice a year with a book. She read names from it. The people she named weren't seen again. Not taken. Just not there, the way a word isn't when it's scraped off the page.",
      "She keeps the Catalogue, down in the Archive. She's still reading. I'd like the book shut. When she reads a name down there, and it's yours, don't move. I watched what happened to the ones who ran.",
    ],
    accept: "I'll shut her book.",
    acceptLine: "The Catalogue is west off the Drowned Reading Room. When she opens the book and reads, whoever she names stands still until she closes it. It isn't long. It feels long.",
    decline: 'Not yet.',
    declineLine: "No. I understand. I stood in that room twice a year and never once moved either.",
    journal: [
      "The Indexer keeps the Catalogue in the Drowned Archive, and reads names out of her book. Kill her. When she reads a name, whoever is named must stand still till the book is shut.",
      "Go back to Ondine in the Librarian's rooms.",
    ],
    progress: [
      "The Catalogue, west of the Drowned Reading Room. When she reads your name, don't move.",
    ],
    done: [
      "Shut. Then the names that are left in it stay in it. That's all anyone can do for them now. It's more than I did.",
      "This was a reader's, down there, before the water. It's blue because his readers wore blue. It doesn't have to mean that on you.",
    ],
    after: [
      "I said some of the names over, last night. The ones I remembered her reading. Just so they'd been said by someone who wanted them back.",
    ],
  },
  bound_in_calf: {
    title: 'Bound in Calf',
    giver: 'ph_wynn',
    needs: 'the_drowned_archive',
    offer: [
      "The Bindery's on the old plans. Presses, glue, a note in the margin that says 'calf'. I thought it meant the leather. Then I found the receipts. There's no calf on the receipts. There's no leather bought at all.",
      "Whatever runs those presses now is still binding, and I don't want to know in what. I want it stopped. His big press comes down on one of you: don't scatter. Stand under it together. It's less each.",
    ],
    accept: "I'll stop the presses.",
    acceptLine: "East off the Reading Room. He's as big as his own press. When the great one comes down, everybody under it, together. I worked that out from the floor plan. The floor's cracked in one place. One.",
    decline: 'Not now.',
    declineLine: "Fine. But I'm not drawing that room till it's empty, and that's a hole in my map with your name on.",
    journal: [
      "The Binder still works the presses of the Drowned Archive's Bindery. Kill him. When his great press comes down on one of you, stand under it together: what lands is shared.",
      "Go back to Wynn Pell in the Librarian's rooms.",
    ],
    progress: [
      'The Bindery, east off the Drowned Reading Room. Under the press together.',
    ],
    done: [
      "Good. Good. I'll draw it now. Presses, three. Vats, two. Him, none. That's the best line I've put on a map all year.",
      "He had this stuck in his apron like a pin. It's a bodkin. It's as long as my arm. You keep it. I don't want it in the room.",
    ],
    after: [
      "I've drawn the Bindery. I left the stain on the floor out. A map doesn't have to have everything.",
    ],
  },
  the_drowned_lector: {
    title: 'The Drowned Lector',
    giver: 'ph_librarian',
    needs: 'struck_from_the_index',
    offer: [
      "There was a Lector, when the cistern broke. The man who read aloud to the stacks at the day's end. He wouldn't leave. I'd assumed he'd had the decency to die of it. He hasn't. He's had the water do as he tells it instead.",
      "He'll have the key to the stair in my Long Stacks. It was the Lector's to carry. His hall floods to the roof-beams when he calls, all but one dry stack, the one he lights. Be standing on it.",
    ],
    accept: "I'll bring you his key.",
    acceptLine: "The Lectorium, at the far end of the Long Flood. Its doors won't open while the Indexer and the Binder live. And Jory's sluices: if you've emptied them, his tide won't hold. I'd empty them.",
    decline: 'Not yet.',
    declineLine: "Then the stair stays locked, and I go on looking at it over the top of my book. I've had practice.",
    journal: [
      "The Drowned Lector holds the Lectorium at the end of the Long Flood, and carries the key to the Sanctuaries Stair. Kill him. When he calls the tide, get onto the one dry stack he lights. His doors open once the Indexer and the Binder are dead.",
      'Go back to Master Aldric Pell.',
    ],
    progress: [
      "The Lectorium, past the Long Flood. When the tide comes, the lit stack.",
    ],
    done: [
      "The Drowned Key. Still wet. Do you know, I've imagined holding this every evening for forty years, and in none of them was it this cold.",
      "The stair in the Long Stacks will turn for it. Up there is the High Ward, and nobody of mine has seen it since Ondine came down. Take this. You'll want it up there.",
    ],
    after: [
      "The floor's quiet. No water. I find I can't read for the silence. I shall get used to it. I got used to worse.",
    ],
  },

  // ==== the Gallery of a Thousand Portraits ====================================================================================
  a_thousand_faces: {
    title: 'A Thousand Faces',
    giver: 'ph_wynn',
    needs: 'wynns_map',
    offer: [
      "The Portrait Gallery in this ward is the short one. There's another behind the wing, with its own door outside, east face. A thousand portraits. I've counted the frames on the bills: a thousand and four, but nobody says that.",
      "I can't draw a room I haven't a size for. There's a round one in the middle of it, the Rotunda. Get that far, stand in the middle, and tell me how it feels. I can work out a size from how it feels.",
    ],
    accept: "I'll stand in the Rotunda.",
    acceptLine: "Out by the Postern, round to the Gallery wing's east face: the Varnished Door, between two of the patio's piers. Down the Long Gallery and it opens out. Don't touch the frames.",
    decline: 'Not now.',
    declineLine: "Fine. A thousand and four faces and not one of them going anywhere. Neither am I, apparently.",
    journal: [
      "Behind the Portrait Gallery's wing is the Gallery of a Thousand Portraits. Go in by the Varnished Door, in the wing's east face in the Middle Ward.",
      'Stand in the middle of the Rotunda of the House, at the end of the Long Gallery.',
      "Go back to Wynn Pell in the Librarian's rooms.",
    ],
    progress: [
      "The Varnished Door, east face of the Gallery wing, outside. Then the round room.",
    ],
    done: [
      "They look at you. I knew it. Then it's forty paces across, because under forty you'd feel crowded, and over it you'd feel safe. See? Sizes.",
      "Take this. And don't tell Master Pell I sent you in there on a feeling. He likes me to use a chain and pegs.",
    ],
    after: [
      "I've drawn the Rotunda forty paces. If it's thirty-eight, don't tell me. I've inked it.",
    ],
  },
  the_frame_that_isnt: {
    title: "The Frame That Isn't",
    giver: 'ph_pip',
    needs: 'a_thousand_faces',
    offer: [
      "Wynn says a thousand and four frames on the bills. I asked which four. She said what do you mean which four. I said if everybody says a thousand, four of them aren't for looking at. She went quiet. I WON.",
      "There's one in the Long Gallery that isn't flat on the wall. I bet you. There always is. The painting door in OUR gallery sticks out too. Go and find the one that sticks out and see what's behind it!",
    ],
    accept: "I'll find the one that sticks out.",
    acceptLine: "Down the Long Gallery, on the east side I bet, because ours is on the west and they'd do it backwards. Look for scratches on the floor. Doors leave scratches.",
    decline: 'Not now, Pip.',
    declineLine: "But it's a SECRET DOOR. ...Fine. It'll still be secret later.",
    journal: [
      "Pip Carrow is sure one frame in the Long Gallery of the Thousand Portraits is a door. Find the frame that stands out from the east wall, and what's behind it.",
      "Go back to Pip Carrow in the Librarian's rooms.",
    ],
    progress: [
      'The Long Gallery. The frame that stands out from the wall, with scratches on the floor under it.',
    ],
    done: [
      "A room of LITTLE ones? Like for a doll's castle? How many? Were any of them of anybody we know? Were any of them of ME?",
      "You can have this, it's shiny, Jory says it's worth something. I'd rather have had a little painting. But you can't have everything, Master Pell says. He says it a lot.",
    ],
    after: [
      "I told Wynn about the little room. She's drawn it. She put 'found by P. Carrow' on it. Very small. But it's there.",
    ],
  },
  sitters_down: {
    title: 'Sitters, Down',
    giver: 'ph_librarian',
    needs: 'a_thousand_faces',
    offer: [
      "A portrait from that gallery was carried through my reading room last month, face to the wall, and the man carrying it would not turn it round for anything. I thought it a discourtesy. I now think it a precaution.",
      "The sitters get down. You'll have seen. A dozen fewer of them walking about would make the whole Middle Ward breathe easier, and they are, after all, only paint. Mostly.",
    ],
    accept: 'A dozen of them.',
    acceptLine: "Anything that walks in that gallery will do: the sitters, the court knights in the Rotunda, the things that crawl out from behind the frames. A dozen. I'd not linger under the faces in the last passage.",
    decline: 'Later.',
    declineLine: "As you please. They'll sit for it. Sitting is the one thing they've always done well.",
    journal: [
      "The sitters of the Gallery of a Thousand Portraits get down out of their frames. Put down twelve of whatever walks that gallery.",
      'Go back to Master Aldric Pell.',
    ],
    progress: [
      'Twelve, anywhere in the Gallery of a Thousand Portraits.',
    ],
    done: [
      "A dozen. I'm obliged. I had a look in our own gallery this morning and every frame of it was full, and I have never been so glad to be stared at.",
      "For your trouble. And if you find a canvas turned to the wall anywhere in this castle, leave it so.",
    ],
    after: [
      "Wynn asked me whether a painted man is a man. I said it's a question for a philosopher. She said we've three shelves of those and none of them say. She's right. I looked.",
    ],
  },
  through_the_frame: {
    title: 'Through the Frame',
    giver: 'ph_wynn',
    needs: 'a_thousand_faces',
    offer: [
      "Our Portrait Gallery and theirs share a wall. They must. I've paced ours and added up the wing outside, and there's a thickness left over that's exactly one wall and nothing else.",
      "So somewhere in theirs there's a frame with our gallery on the other side of it. An empty one, it'd have to be. Their restorers would keep it. Find the Restorers' Room and go through. If I'm right you'll come out thirty paces from this chair.",
    ],
    accept: "I'll come out the other side.",
    acceptLine: "South of the Salon, on their west side. A great empty frame against the wall. It'll only open from their side, the first time: there's a bar on ours I've never found the use of. Until now.",
    decline: 'Not now.',
    declineLine: "Then I'll go on having a wall with nothing in it. I hate that. It's like a tooth that isn't there.",
    journal: [
      "Wynn Pell is sure the two galleries share a wall. Find the Restorers' Room in the Gallery of a Thousand Portraits, south of the Salon of the Dowagers.",
      'Go through the great empty frame against its wall, and come out in the Middle Ward.',
      "Go back to Wynn Pell in the Librarian's rooms.",
    ],
    progress: [
      "The Restorers' Room, south of their Salon. The empty frame. Through it.",
    ],
    done: [
      "Thirty paces! I said thirty! ...Thirty-one. Fine. But I was RIGHT about the wall, and it's open from both sides now, and that's a way into their gallery that isn't past anybody's door.",
      "Here. That's for the wall. I'd pay double if you could find me the other three things in this ward that don't add up.",
    ],
    after: [
      "I've drawn the frame on both maps, theirs and ours, with a line between. It's the first line I've ever drawn through a wall. It felt like cheating. It felt wonderful.",
    ],
  },
  the_dowager_in_oils: {
    title: 'The Dowager in Oils',
    giver: 'ph_ondine',
    needs: 'a_thousand_faces',
    offer: [
      "There was an old lady of his house who came to hear us sing, and died, and went on coming. I thought I'd imagined it. Then one of the sisters curtsied to her, and she inclined her head, and she was still wet. Paint doesn't dry quickly in the cold.",
      "She holds a salon, in that gallery. She steps into one frame and out of another. While she's in the paint, nothing you do reaches her. The frame she'll step down from is the lit one. Don't be standing by it.",
    ],
    accept: "I'll scrape her down.",
    acceptLine: "The Salon is west off the Rotunda. Four great frames round the walls. When she goes in, save your strength; watch which frame lights; be across the room from it.",
    decline: 'Not yet.',
    declineLine: "No. She'll receive you whenever you call. She never did turn anyone away. That was the worst of her.",
    journal: [
      "The Dowager in Oils holds the Salon of the Dowagers, west of the Rotunda. Kill her. When she steps into the paint nothing touches her: stand clear of the lit frame, where she'll step down.",
      "Go back to Ondine in the Librarian's rooms.",
    ],
    progress: [
      'The Salon, west off the Rotunda. Stand clear of the lit frame.',
    ],
    done: [
      "Then she's only a picture. That's all she ever ought to have been. I hope whoever she was is somewhere that isn't a wall.",
      "She wore this in the frame, they say, and out of it. I'd have it cleaned before you put it on. I'd have it cleaned twice.",
    ],
    after: [
      "I sang the old lady's favourite last night. Not for her. For the girl who curtsied. I never learned what became of that girl.",
    ],
  },
  the_framer: {
    title: 'The Framer',
    giver: 'ph_jory',
    needs: 'a_thousand_faces',
    offer: [
      "Gold leaf. I kept the Armoury's books nineteen years and the one line I never balanced was gold leaf: forty books of it a quarter, signed for by the Framer, for a gallery that already had its frames.",
      "A thousand and four frames don't eat forty books a quarter. He's gilding something else, or someone. I want that line closed. When he sets his brush turning, walk round with it. I've seen what it does to a floor.",
    ],
    accept: "I'll close the line.",
    acceptLine: "The Framers' Shop: east off the Rotunda. He goes to the middle of his floor and the brush sweeps the whole room, both ways from him. Keep ahead of it or get in behind it. Don't stand and think.",
    decline: 'Not now.',
    declineLine: "Then it stays open. Nineteen years and one quarter. I'll carry it forward. I always do.",
    journal: [
      "The Framer keeps the Framers' Shop, east of the Rotunda in the Gallery of a Thousand Portraits. Kill him. When he sets his gilding brush turning from the middle of his shop, walk round ahead of it.",
      "Go back to Jory Tallis in the Librarian's rooms.",
    ],
    progress: [
      "The Framers' Shop, east off the Rotunda. Keep ahead of the brush.",
    ],
    done: [
      "Closed. I've ruled it off. Forty books a quarter, and I still don't know what he gilded, and now I find I'd rather not. Write 'sundries', Tallis. Sundries.",
      "His rod, for the mitres. It's true to a hair, which is more than his accounts were. Yours.",
    ],
    after: [
      "I went back through the gold leaf line last night, year by year. It starts the year the first sitter got down. I've stopped looking at it now.",
    ],
  },
  the_unfinished_sitting: {
    title: 'The Unfinished Sitting',
    giver: 'apricot',
    needs: 'the_dowager_in_oils',
    offer: [
      "I sat for my portrait once. Did I say? Three sittings, up in the castle, for a little grey man who never spoke and never blinked. Then I came down here instead, and he never had his fourth.",
      "I'm told he's kept the canvas. I'm told that what he finishes gets down and walks. I should very much prefer not to meet myself on the stair, so: the Painter, please. Before he remembers my chin.",
    ],
    accept: "He won't finish it.",
    acceptLine: "The Unfinished Hall, past the Gallery of Eyes, once his Dowager and his Framer are gone. When he sets up a canvas, drop everything and cut it down. If he finishes one of you, there'll be two of you, and one will be rude.",
    decline: 'Not yet.',
    declineLine: "Oh, do think it over. I've only the one face, and I've grown rather attached to being the only one in it.",
    journal: [
      "The Painter in the Unfinished Hall still has Princess Apricot's portrait, three sittings done. Kill him. When he sets up a canvas, cut it down before the likeness is finished. His doors open once the Dowager and the Framer are dead.",
      'Go back to Princess Apricot in the Sunk Garden, at the far end of the High Conduits.',
    ],
    progress: [
      'The Unfinished Hall, past the Gallery of Eyes. Cut the canvas down before he finishes.',
    ],
    done: [
      "Dead. And my canvas? ...Three sittings and no chin. Good. Then there is still exactly one of me, which is, I've always felt, the correct number.",
      "He carried this key, you say, the painted one? Keep it: it's for a door at the end of the Horn Galleries, and I've no head for heights. And this, for my chin's sake.",
    ],
    after: [
      "I've been wondering what she'd have been like. The other me. Taller, I expect. They always paint one taller.",
    ],
  },

  // ==== the Alchemists' Undercroft =============================================================================================
  under_the_stills: {
    title: 'Under the Stills',
    giver: 'ph_watch',
    needs: 'the_quiet_watchs_steel',
    offer: [
      "Three wells in this city went bad last winter. Not foul. Bad. People who drank from them got quiet, then got biddable, then walked up the Approach on their own feet. We shut the wells. Nobody upstairs complained, which told me who'd done it.",
      "My dyers know a still when they smell one. There's a door at the foot of the Alchemists' Wing, north side, and what comes out of its flue isn't dye. Go down. Tell me what's there. Just that, first.",
    ],
    accept: "I'll go down and see.",
    acceptLine: "Up through the castle to the Middle Ward. The Alchemists' Wing is the long hall on the north side; the door's at the foot of its north wall, across a court from the Menagerie. Take people. It's not a one-body job.",
    decline: 'Not yet.',
    declineLine: "Your choice. I've three wells nailed shut and a street that wants them back. I'll be here.",
    journal: [
      "Three of the city's wells went bad, and the Quiet Watch think it came from under the Alchemists' Wing. Go down the door at the foot of the wing's north wall, in the Middle Ward, into the Alchemists' Undercroft.",
      'Go back to Maud Treller at the dye works on the Tanners\' Steps.',
    ],
    progress: [
      "The door at the foot of the Alchemists' Wing, north side, in the Middle Ward. Just look.",
    ],
    done: [
      "Grow things. In jars. And pump it down to something. Right. That's worse than I'd costed for, and I'd costed for bad.",
      "Here's for the looking. Now I know what to ask you to break. Give me a day to put it in order: there's a right order to breaking a works, same as running one.",
    ],
    after: [
      "I've had the three wells sounded. Still bad. They'll stay nailed till whatever's under those stills is dead and a month past it.",
    ],
  },
  the_poison_cupboard: {
    title: 'The Poison Cupboard',
    giver: 'ph_watch',
    needs: 'under_the_stills',
    offer: [
      "Every works keeps its worst stuff apart, under lock, where the hands can't get at it by mistake. I do. They will. And a locked cupboard in a place like that has labels on it, and labels say where a thing's going.",
      "Find it. It won't be on the main floor. Look where the jars are thickest and one shelf doesn't sit true to the wall. Read me the labels. I want to know which wells are next.",
    ],
    accept: "I'll read you the labels.",
    acceptLine: "West side, the Hall of Jars. There's a thing lives in that hall: go round it or through it, I don't mind which. A shelf standing out from the west wall. Behind that.",
    decline: 'Not now.',
    declineLine: "Then I guess which wells. I've a street of people who'd rather I didn't guess.",
    journal: [
      "The Alchemists keep their worst apart, behind a shelf that stands out from the west wall of the Hall of Jars. Find the Poison Cupboard.",
      'Go back to Maud Treller at the dye works.',
    ],
    progress: [
      'The Hall of Jars, west off the Great Stillroom. Behind the shelf that stands out from the west wall.',
    ],
    done: [
      "Labelled for the city. By well. By street. Chainmarket, the Rookeries, the Steps. Mine's on there. My own yard's well is on there.",
      "Take this, it's from the cupboard's own shelf by the look: you may as well have the use of it. I've wells to nail and people to walk to the far pumps. Go.",
    ],
    after: [
      "Eleven wells shut, on your labels. Folk are carrying water half a mile and cursing me for it. Good. Cursing's a thing the quiet ones couldn't do.",
    ],
  },
  stop_the_pumps: {
    title: 'Stop the Pumps',
    giver: 'ph_jory',
    needs: 'under_the_stills',
    offer: [
      "A works that size has pumps. I asked the watchwoman's runner how many vats and he said he'd lost count at nine, so: two pumps, north and south of a gallery, a crew to each. That's how I'd lay it out. That's how anyone would.",
      "Whatever they're feeding at the bottom, it eats through those pipes. Stop both crews and it goes hungry. Eight hands should cover the two pumps. Take the big ones first: they're the ones on the handles.",
    ],
    accept: 'Both pumps. Eight hands.',
    acceptLine: "The Feeding Gallery: south out of the Great Stillroom, a long passage with a channel down it. One pump near the top, one near the bottom. Eight, between them.",
    decline: 'Not now.',
    declineLine: "Then it goes on being fed. I don't like feeding a thing I've not counted.",
    journal: [
      "Two pumps in the Feeding Gallery of the Alchemists' Undercroft send the vats' work down to the Growing Vault. Put down eight of the Feeders who work them.",
      "Go back to Jory Tallis in the Librarian's rooms.",
    ],
    progress: [
      'The Feeding Gallery, south of the Great Stillroom. Eight of them, between the two pumps.',
    ],
    done: [
      "Both stopped. Then the bottom of that place is on short commons as of today. I've started a column for it. 'Fed: nil.' I'll add to it daily. It's a pleasure to write.",
      "Your eight, at the going rate, and a little over. Starved things fight worse. I've seen it in garrisons.",
    ],
    after: [
      "'Fed: nil.' Nine days running. Best column I keep.",
    ],
  },
  up_the_hatch: {
    title: 'Up the Hatch',
    giver: 'ph_pip',
    needs: 'under_the_stills',
    offer: [
      "You know the Alchemists' Wing, down the Reading Walk? There's a bit of floor in there that goes BONK. Not thud. Bonk. I jumped on it. Lots. A stillwarden nearly got me.",
      "Bonk means hollow and hollow means a trapdoor and a trapdoor means there's stairs under it! From the under-place! Will you find the bottom of them and come up? I want to see the floor open. From a safe distance.",
    ],
    accept: "I'll come up through the floor.",
    acceptLine: "It'll be past somewhere cold. Under-places always put the stairs past somewhere cold, so the hands don't dawdle. Jory says. Look for a little room with a ladder!",
    decline: 'Not today.',
    declineLine: "Okay. I'll just keep jumping on it. Bonk. Bonk. Bonk.",
    journal: [
      "Pip Carrow has found a hollow floor in the Alchemists' Wing. In the Undercroft, find the Hatch Stair: past the Cold Store, off the Feeding Gallery.",
      'Go up through the trapdoor, and come out in the Middle Ward.',
      "Go back to Pip Carrow in the Librarian's rooms.",
    ],
    progress: [
      'The Hatch Stair, past the Cold Store. Up through the trapdoor.',
    ],
    done: [
      "It OPENED! I saw it! The whole flagstone went up and you came out like a mushroom! A stillwarden dropped a jar! This is the best day!",
      "You can have my lucky thing. I've got another. And now there's a way down there that's ours, Wynn's drawing it already, she's cross I found it first.",
    ],
    after: [
      "I'm not allowed to jump on the bonk floor any more. Master Pell says it's a door now, and one doesn't jump on doors. I do a bit. When he's reading.",
    ],
  },
  the_jar_mother: {
    title: 'The Jar-Mother',
    giver: 'ph_ondine',
    needs: 'under_the_stills',
    offer: [
      "Sisters who left the Sanctuaries with child were sent down to the Alchemists to be 'looked after'. That was the word. I asked one of the stillwardens, years ago, who looks after them. He said: the Mother does. He thought it was funny.",
      "She keeps a hall of jars. I don't want to be told what's in them. I want her dead. They say she can hardly be hurt, except stood in what her own brood leave on the floor when they die. So kill them where you want her standing.",
    ],
    accept: "I'll put an end to her.",
    acceptLine: "The Hall of Jars, west off the Great Stillroom. Her brood come out of the big jars in the corners. Where one dies, its brine lies a while: whoever holds her, walk her into it. Out of it, you'll barely mark her.",
    decline: 'Not yet.',
    declineLine: "No. Take your time. I've had years to think about that hall and I still can't make myself go and stand outside the door.",
    journal: [
      "The Jar-Mother keeps the Hall of Jars in the Alchemists' Undercroft. Kill her. She shrugs off most of a blow unless she stands in the brine her brood leave where they die: kill them where you want her, and bring her into it.",
      "Go back to Ondine in the Librarian's rooms.",
    ],
    progress: [
      'The Hall of Jars, west off the Great Stillroom. Fight her in the brine.',
    ],
    done: [
      "Thank you. I won't ask what you saw. If the jars are quiet, they're quiet, and that's the first rest anything in that hall has had.",
      "This was hers. An apron. Take it away from here and make it be something else. Things can be something else. I'm told. I'm trying.",
    ],
    after: [
      "I've begun a song with no words to it, for the hall. Just the tune. Words would have to say what was in the jars.",
    ],
  },
  the_distiller: {
    title: 'The Distiller',
    giver: 'ph_ash',
    needs: 'under_the_stills',
    offer: [
      "Treller sent word you've been under the castle's stills. Then hear this. The rows by my north wall don't stir on their own. Something's in the ground, coming down off the crag with the rain, and where it soaks, they get up.",
      "My sexton boiled a pail of that ground. What came off it, he'd smelled once before: at a still. There'll be a master of that works. Put him out. He'll flood his room with the stuff from vents in the floor: there'll be a wheel to each. Shut them.",
    ],
    accept: "I'll put him out.",
    acceptLine: "Treller's people say the big retort's east off the main stillroom. Vents in the floor, a wheel-post by each. Whoever's nearest when one opens: get on that wheel and stay on it. The rest of you keep him busy.",
    decline: 'Not yet.',
    declineLine: "Then I go on putting the same dead down every night. I can. I'd rather not have to.",
    journal: [
      "The Distiller's fume comes down off the crag into the Bone Yards' ground. He keeps the Retort Room, east of the Great Stillroom in the Alchemists' Undercroft. Kill him. When a vent opens, someone must hold its wheel till it shuts.",
      "Go back to Edda Grail in the Ashwardens' yard, at the Bone Yards' north end.",
    ],
    progress: [
      'The Retort Room, east off the Great Stillroom. Shut the vents at their wheels.',
    ],
    done: [
      "Out. Good. We'll know it's true in a month, when it's rained a few times and the north rows lie still through it. I'll send to you if they don't.",
      "This was his? Long enough to stir a vat from the far side. It'll serve you better than it served the ground. Take it, with the Ashwardens' thanks.",
    ],
    after: [
      "Rained twice since. North rows didn't stir. First quiet rain I've stood a watch through in six years.",
    ],
  },
  the_great_work: {
    title: 'The Great Work',
    giver: 'ph_librarian',
    needs: 'the_jar_mother',
    offer: [
      "Every alchemist who ever had a lord's purse has promised him the same thing, and I have the books to prove it: a servant grown, not born, who needn't be paid, fed or persuaded. They call it the Great Work. They never finish. It's the unfinishing that keeps them in funds.",
      "His have finished. It's in the vault under the stills, and it carries the key to the Crypt door at the bottom of the Oubliettes: the other way up to the High Ward. Its fume comes heavy or light. Be on the gallery for the one, off it for the other.",
    ],
    accept: "I'll unmake it.",
    acceptLine: "The Growing Vault, at the end of the Feeding Gallery, once its Jar-Mother and its Distiller are dead. Heavy fume lies on the floor: up onto the gallery at the far end. Light fume rises: down off it. And stop Jory's pumps first. It's fed through them.",
    decline: 'Not yet.',
    declineLine: "Just so. It isn't going anywhere. That, I gather, was rather the point of it.",
    journal: [
      "The Great Work stands in the Growing Vault under the Alchemists' Wing, and carries the Glass Key. Kill it. In the heavy fume, get up onto the gallery at the vault's far end; in the light, get down off it. Its doors open once the Jar-Mother and the Distiller are dead.",
      'Go back to Master Aldric Pell.',
    ],
    progress: [
      'The Growing Vault, past the Feeding Gallery. The gallery for the heavy fume; the floor for the light.',
    ],
    done: [
      "A key of glass. Flick it. ...There. My master said the Crypt door sang when it was opened, and I thought it a figure of speech. He never used figures of speech. I should have known.",
      "Two ways up to the High Ward now, the stair and the crypt, and both of them in your pocket. Take this as well. You'll forgive an old man if he sits down."
    ],
    after: [
      "I've taken the alchemists' books down off the open shelves. All of them. Nobody who reads them ought to be able to find them easily. That's not what a librarian is for, but there it is.",
    ],
  },
};
