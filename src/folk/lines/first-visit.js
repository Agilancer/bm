// Your first visit to Phobos's country (src/folk/first-visit.js): what Wenna Coyle says on the Sill, and the words of the
// quests, Lisandra's door out and Wenna's four and the door home. As src/folk/lines/phobos-hubs.js.
//   Wenna Coyle keeps the lamps on the way down from the Sill to the Drawbridge Gate, for whoever has to walk it. Sixty-one,
//   once Lisandra's apprentice, who left the cave forty years ago "for a man, and then for the lamps, which lasted longer".
//   She's nobody's: not his, not the other side's. She lights the way down for anyone, and says so.
// (No word of hers or Lisandra's names any sign of either side: the V and T rule.)

export const LINES = {
  fv_wenna: {
    first: [
      "Mind the edge. People come out of that door and walk straight off the Sill, and I'm sixty-one, I'm not climbing down for you. ...Wenna. Wenna Coyle. I keep the lamps.",
    ],
    greet: {
      morning: [
        "Morning. Lamps are out and trimmed. Look at it. Every morning I look at it, and every morning it's still there.",
        "First light on the Keep. Pretty, isn't it, from up here. Everything's pretty from far enough off.",
      ],
      day: [
        "Every lamp from here to the gate is mine. I walk them twice a day. Somebody has to, and nobody else wants the view.",
        "Wind's from the city. You can smell the Cinder Quarter on a day like this.",
      ],
      evening: [
        "Lighting up. Stand there and watch if you like. People find it calming. I find it a lot of stairs.",
        "Evening. His windows come on, all the way up the Keep. Like it's looking down at us. It is.",
      ],
      night: [
        "Keep by the lamps after dark. The plain's not yours at night. It's not anyone's.",
        "Can't sleep either? Nobody sleeps well on the Sill. It's the looking.",
      ],
    },
    about: [
      "Lamp-keeper. Forty years. Before that, twenty years in a cave up the Long Road learning to light candles the hard way. You know whose.",
      "I left her for a man, and then I left him for the lamps. The lamps lasted longer. Don't tell her I said so. She'll be insufferable.",
    ],
    ask: {
      lis: [
        "Lisandra? She taught me everything I know and half of what I'd rather not. If she sent you through that door, she thinks you're worth a candle. She's never been wrong about that. About everything else, constantly.",
        "She used to come down here twice a year to look at it. Just look. Then she'd go home and not speak for a week.",
      ],
      city: [
        "Phobos. His. Down there inside the wall there's ten thousand houses and most of them still have people in. They keep their heads down. You'll see.",
        "The Drawbridge Gate's the only way in from this side. They count you through. Don't give them a number they'll remember.",
      ],
      redoubt: [
        "Down the north cliff, there's a gate in the rock. His knights cut it. They sit in there and watch the way down, and anyone they don't like the look of goes into the pens.",
        "They've a commander in there, the Red Hand they call him. He's the one who hangs them on the plain.",
      ],
    },
    topics: { lis: 'Lisandra', city: 'The city', redoubt: 'The gate in the cliff' },
    bye: [
      "Go on. Keep the lamps on your left going down, and on your right coming up.",
      "Mind the edge.",
    ],
    barks: {
      player: ['Mind the edge.', 'Lamps on your left going down.'],
      morning: ['Trimmed and out.', 'Still there. Of course it is.'],
      evening: ['Lighting up.', 'Fourteen to go.'],
      magic: ["She taught you that? She never taught me that.", 'Not near the lamp oil.'],
    },
  },
};

export const QUESTS = {
  the_door_east: {
    title: 'A Door in the East',
    giver: 'lisandra',
    giverName: 'Lisandra',
    about: "Lisandra means you to see what you're up against before you start believing you can win. She'll open a door of candles to the Sill, the shelf above Velscour's city, where an old apprentice of hers keeps the lamps.",
    offer: [
      "You've had a day of Bellmourn. Good. Now you can be frightened properly. Come here.",
      "You've seen Bellmourn. Small, poor, and frightened. Now see what it's frightened of. East, past the Marches, there's his city. Phobos. Days on foot. Or one of my candles.",
      "There's a woman on the Sill above it keeps the lamps. Wenna. She was mine once. My apprentice, I mean; don't make that face. Tell her I sent you, and do what she asks. Then she'll send you back.",
    ],
    accept: 'Light the candle.',
    acceptLine: "Stand still. Don't breathe in. ...It always smells of burnt hair. I've never known why.",
    decline: 'Not yet.',
    declineLine: "No hurry. He's not going anywhere. That's rather the point of him.",
    journal: [
      "Lisandra's door of candles has set you down on the Sill, above Velscour's city. Find Wenna Coyle, who keeps the lamps there, and tell her who sent you.",
    ],
    progress: [
      "Through the door, on the Sill. Wenna. Grey hair, lamp-oil, a temper. You'll know her.",
    ],
    done: [
      "Here's a few coin for the walk down. Hers, probably. She always over-pays.",
    ],
    others: {
      fv_wenna: [
        "Lisandra? ...Of course it's Lisandra. Nobody else's door smells like that. She's alive, then. And sending children through it again.",
        "No, don't apologise, I was a child through it too. You looked, didn't you. Everyone has to look, the first time.",
        "That's Phobos. That's his. The wall, the city, the castle, and the Keep on top of the castle, and him somewhere at the top of that. Now you know. Now. There's work, if you're staying.",
      ],
    },
  },

  fv_the_way_down: {
    title: 'The Way Down',
    giver: 'fv_wenna',
    giverName: 'Wenna Coyle',
    about: "Wenna wants you to walk down past her lamps, in through the Drawbridge Gate, and see the city for yourself: the Barbican's square inside the gate, and the Chainmarket. Then find Fennick Lowe of the Pennyless, in the Cinder Quarter, and tell him her lamps are lit.",
    offer: [
      "You can't fight a thing you've only seen from a ledge. Go down. Walk in. See it.",
      "In through the Drawbridge Gate, through the Barbican, and up to the Chainmarket. Keep to the busy streets; there are places in there his own walk, and you're not ready for those. You'll know them. They're the empty ones.",
      "Then find Fennick Lowe. The Pennyless. Behind the burnt chandlery in the Cinder Quarter. Tell him Wenna's lamps are lit. He'll know what it means. It means you're a friend.",
    ],
    accept: "I'll go down.",
    acceptLine: 'Lamps on your left. And put that skull away at the gate. They count those too.',
    decline: 'Not yet.',
    declineLine: "It'll be there. It's always there.",
    journal: [
      "Wenna wants you to walk down into Phobos and see it: the Barbican's square inside the Drawbridge Gate, and the Chainmarket. Keep to the busy streets.",
      "Find Fennick Lowe of the Pennyless, behind the burnt chandlery in the Cinder Quarter, and tell him Wenna's lamps are lit.",
    ],
    progress: [
      "Barbican. Chainmarket. Then Lowe. Keep to the busy streets.",
    ],
    done: [
      "Take this. Mine, or Wenna's, or his; coin goes round the same few hands down here. Go back up to the Sill when you've had your look. She won't have gone anywhere. She never does.",
    ],
    heard: {
      'ph:barbican': "Through the gate. A clerk in red writes something down as you pass, and doesn't look up.",
      'ph:market': "The Chainmarket. Everything's for sale, and everyone's watching who buys it.",
    },
    others: {
      ph_penny: [
        "Wenna's lamps are lit? ...In. Off the street. Quick.",
        "Wenna Coyle doesn't send anyone. Forty years she's kept those lamps and never sent one soul down to me. You must be something.",
        "Here. If you're Wenna's, you're welcome in this yard. You're not ready for the real work. Not yet. But there's small work, three yards of it, if you want the coin.",
      ],
    },
  },

  fv_toll_runners: {
    title: "The Toll's Runners",
    giver: 'ph_penny',
    giverName: 'Fennick Lowe',
    about: "The gate's clerks take their toll, and a pack of red goblins runs the rest of it for them: they lie up in a back court off the Barbican, north of the square inside the Drawbridge Gate, and take a second toll off anyone the clerks missed. Fennick wants five of them dead.",
    offer: [
      "The clerks at the gate write you down and take their cut. That's the toll. Then there's the other toll.",
      "Red goblins. They run for the clerks, and keep half. They lie up in a back court north of the Barbican's square, and anyone of mine coming in pays twice. Kill five and the rest'll find another court.",
    ],
    accept: "I'll see to the runners.",
    acceptLine: "North of the square inside the gate. Through the arch with no door on it. When it's done, tell Wenna. She and I keep the one purse; she'll pay you.",
    decline: 'Not now.',
    declineLine: "They'll still be there. They're always still there.",
    journal: [
      "Kill five of the red goblins who run the second toll, in a back court north of the Barbican's square inside the Drawbridge Gate.",
      "The toll's runners are dead. Go back up to Wenna on the Sill and tell her: she and Fennick keep the one purse.",
    ],
    progress: [
      "North of the Barbican's square. They wear red. They think it makes them official.",
    ],
    done: [
      "Fennick's runners pay the once at the gate now? Good. That's his coin, out of my purse. Same purse.",
    ],
    others: {
      fv_wenna: [
        "The runners off the Barbican? All five? ...Fennick'll be insufferable.",
        "That's his coin, out of my purse. We've kept the one purse forty years; he lends it, I spend it. Here.",
      ],
    },
  },

  fv_chain_thieves: {
    title: 'The Chain-Thieves',
    giver: 'ph_penny',
    giverName: 'Fennick Lowe',
    about: "Kobolds have dug in under the yard behind Chainmarket's stalls, north of the gibbet tower's ring, and come up at night to strip the stalls and the carts. Fennick lends the stall-keepers their stock. Kill five of the thieves.",
    offer: [
      "Half the stalls in the Chainmarket are stocked on my coin. Half the stock walks off at night.",
      "Kobolds. They've dug in under the yard behind the stalls, north of the gibbet tower, and they come up the moment the keepers pack up. Five of them dead and the rest'll go and rob somebody who isn't me.",
    ],
    accept: "I'll clear the yard.",
    acceptLine: "Behind the stalls on the gate side of the market. The keepers will point. Then go up and tell Wenna; she pays for me.",
    decline: 'Not now.',
    declineLine: "Mind your pockets in the market, then.",
    journal: [
      "Kill five of the kobolds that come up into the yard behind Chainmarket's stalls, north of the gibbet tower.",
      "The yard behind Chainmarket is clear. Go back up to Wenna on the Sill and tell her: she pays for Fennick.",
    ],
    progress: [
      "Behind the stalls. Follow the gnawed crates.",
    ],
    done: [
      "The Chainmarket's keepers will sleep tonight. Fennick's coin. My purse.",
    ],
    others: {
      fv_wenna: [
        "The yard behind the stalls? He's been on about that yard all month. You'll have saved me hearing about it.",
        "Here. His coin, my purse. Don't tell him I said it was worth it.",
      ],
    },
  },

  fv_gutter_nest: {
    title: 'Under the Rookeries',
    giver: 'ph_penny',
    giverName: 'Fennick Lowe',
    about: "Something's been coming up the drain in the Rookeries, in a yard back from the Low Road, north of the drain's mouth: spiders the size of dogs, out of the West Drains. They've taken two of Fennick's runners. Kill four of them.",
    offer: [
      "I had two runners went into the Rookeries last week and didn't come out. Not knifed. Wrapped.",
      "Spiders. Up out of the West Drains, into a yard north of the drain's mouth, back from the Low Road. Four of them, and big. Don't go down the drain after them; you're not ready for what's down there. Just the yard.",
    ],
    accept: "I'll go and look.",
    acceptLine: "North of the drain, back from the Low Road. Where the cobbles go wet. If it's quiet, it isn't. Wenna pays for it; tell her when it's done.",
    decline: 'Not now.',
    declineLine: "Don't go up the Rookeries alone, then. Not that way.",
    journal: [
      "Kill four of the spiders come up out of the drain into a yard north of its mouth, back from the Low Road in the Rookeries.",
      "The spiders in the Rookeries are dead. Go back up to Wenna on the Sill and tell her: she pays for Fennick.",
    ],
    progress: [
      "North of the drain's mouth in the Rookeries, back from the Low Road. Where the cobbles go wet.",
    ],
    done: [
      "Four of them. He'll send someone for what's left of his runners. You'll want to wash.",
    ],
    others: {
      fv_wenna: [
        "Spiders. Out of the drains. ...And his two runners? Wrapped. I knew one of them. He trimmed wicks for me, once.",
        "Here. His coin, my purse, and something for the washing. You'll want to wash.",
      ],
    },
  },

  fv_gibbet_field: {
    title: 'The Gibbet Field',
    giver: 'fv_wenna',
    giverName: 'Wenna Coyle',
    about: "Velscour's knights hang the debtors from his gate on the plain north of the Sill, where the travellers coming down can see them. They don't stay hanged. Put them down, eight of them, and go back to Wenna.",
    offer: [
      "See the posts out on the plain, north of the path? Gibbets. The Red Hand hangs whoever can't pay the toll there, so the next ones down see them.",
      "They don't stay hanged. Something in his country won't let a body lie. They get down and walk, and the next ones down meet them on the way.",
      "Put them down. Eight, there's about eight. I'd do it myself but I've the lamps, and I'm sixty-one, and I don't want to.",
    ],
    accept: "I'll put them down.",
    acceptLine: "Thank you. They were somebody's. Most of them still owed money, but they were somebody's.",
    decline: 'Not yet.',
    declineLine: "No. They'll keep. That's the trouble with them.",
    journal: [
      "Put down the hanged debtors walking on the Gibbet Field, north of the path down from the Sill.",
      "The Gibbet Field is quiet. Go back up to Wenna on the Sill.",
    ],
    progress: [
      'North of the path, out on the plain. You can see the posts from here.',
    ],
    done: [
      "Quiet. I can hear the wind on the plain again. I'd forgotten it did that.",
      "Here. Eight fewer walking. Look at the north cliff below us on your way down: there's a gate cut in it. His.",
    ],
  },

  fv_carrion: {
    title: 'Carrion on the Sill',
    giver: 'fv_wenna',
    giverName: 'Wenna Coyle',
    about: "Dead birds that won't stay dead roost on the plain under the Sill, south of the path, and they come at the lamps and anyone carrying one. Kill five of them and go back to Wenna.",
    offer: [
      "The birds south of the path. Not birds. Were birds. Now they're bones with opinions, and they've a taste for lamp-oil and the people carrying it.",
      "Five of them. Knock them out of the air and they'll stay down a while. A good while, if you do it properly.",
    ],
    accept: "I'll knock them down.",
    acceptLine: "Mind their claws. They go for the eyes. Everything round here goes for the eyes.",
    decline: 'Not yet.',
    declineLine: "Mind them on your way down, then.",
    journal: [
      "Kill five of the dead birds roosting on the plain south of the path down from the Sill.",
      "The carrion under the Sill is dead. Go back up to Wenna.",
    ],
    progress: [
      'South of the path. Follow the noise.',
    ],
    done: [
      "There. My lamps'll last the night. Here, for your trouble, and for my lamp-oil.",
    ],
  },

  fv_the_redoubt: {
    title: 'The Redoubt under the Sill',
    giver: 'fv_wenna',
    giverName: 'Wenna Coyle',
    about: "Velscour's knights keep a redoubt cut into the Sill's north cliff, where they watch the only way down to his city and take its toll. Wenna wants it broken: go in, and kill Knight-Commander Rothgar, the Red Hand, who holds it.",
    offer: [
      "The gate in the north cliff. His knights cut that, the year they came. They sit in the rock and watch the way down, and take the toll, and whoever can't pay goes into the pens, and from the pens onto the plain.",
      "There's a commander in there. Rothgar. The Red Hand. He hangs them. Him, his hand, I've watched him do it from this ledge, and lit my lamps after.",
      "You're small yet. They've a Pen-Warden and a Master of Harness in there, and his doors won't open till you've had both of them. But you're Lisandra's, and you came back up from the plain. Go in. Break it.",
    ],
    accept: "I'll break it.",
    acceptLine: "Down the north side, to the foot of the cliff. You'll see their gate. It's the one with his mark over it. They always put his mark over things.",
    decline: 'Not yet.',
    declineLine: "Good. Be bigger first. The cliff's not going anywhere.",
    journal: [
      "Find the Redoubt's gate, cut into the foot of the Sill's north cliff, and go in.",
      "Kill Knight-Commander Rothgar, the Red Hand, in his hall at the top of the Redoubt. His doors open only once the Pen-Warden and Sir Oswin Carrow are dead.",
      "The Red Hand is dead. Go back up to Wenna on the Sill.",
    ],
    progress: [
      "The north cliff. His mark over the gate.",
      "Rothgar. The Red Hand. He's at the top of it, they always are.",
    ],
    done: [
      "The Red Hand. ...I lit every lamp on the way down when I saw you come out of that gate. All fourteen. I've not done that in forty years.",
      "Here. It's the iron I trim the wicks with. It's older than I am and it's never once gone out. Put a gem in it and it'll hit harder than it looks. So will you.",
    ],
  },

  fv_home: {
    title: 'The Candle Door',
    giver: 'fv_wenna',
    giverName: 'Wenna Coyle',
    about: "Wenna will open Lisandra's door back to Bellmourn. Go home through it, and tell Lisandra what you've seen.",
    offer: [
      "You've seen it, and you've hurt it. That's more than most do on their first look. Now go home and get bigger.",
      "She left her door open at this end. She always does; she thinks I don't notice. One candle and you're on her doorstep.",
      "Tell her... tell her the lamps are lit. And that she still owes me a candle. She'll know which one.",
    ],
    accept: 'Light it.',
    acceptLine: "Stand still. Don't breathe in. And come back. The seal on the Sill knows you now: you can come back any time it's lit.",
    decline: 'Not yet.',
    declineLine: "Stay a while, then. The view's free. Nothing else is.",
    journal: [
      "Wenna's sent you home through Lisandra's door. Tell Lisandra, where the Long Road comes into Bellmourn, what you've seen.",
    ],
    progress: [
      'Home. Tell her. And the candle.',
    ],
    done: [
      "Here. For your trouble. Don't ask where I had it.",
    ],
    others: {
      lisandra: [
        "Back. With all your fingers. ...Well? You've seen it.",
        "The ones before you saw it from the Sill and asked me how anyone could. You went down into it and broke something. That's new.",
        "Wenna said what? ...The candle. Of course she did. Forty years and she's still counting. Here. Learn something from it, and then go and help Bellmourn. You'll be back there. He'll make sure of it.",
      ],
    },
  },
};
