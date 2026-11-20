// City State Phobos's street quests: work from the people who live in its districts (src/folk/people.js, the forty-nine of
// tools/phobos/crowd_roster2.json), each about their own quarter, and woven through what they've said of each other (their
// lines, src/folk/lines/crowd/part7 to part10). Their workings: src/folk/phobos-quests.js STREET_RULES. They walk their
// own quarter while you're near it (src/folk/brain.js): you find them there.
export const QUESTS = {
  shoes_for_the_gate: {
    title: 'Shoes for the Gate',
    giver: 'ph_shoe',
    offer: [
      "Every horse that comes through the Drawbridge Gate comes past my anvil first, and half of them leave without paying. The ostler swears it's the carters. The carters swear it's the ostler.",
      "You've no horse and no reason to lie to me. Go and ask Dunk Harrow at the stables, and Gil Wainwright with his wagon, who owes me for the grey mare's shoes. Then come and tell me which of them looked away.",
    ],
    accept: "I'll ask them.",
    acceptLine: "Dunk's by the stables under the gate, smelling of them. Gil's wagon's along the wall. Watch his whip hand.",
    decline: 'Not now.',
    declineLine: "No. Then I'll go on shoeing for nothing, like a fool. I'm good at it.",
    journal: [
      "Brida Nail, the Barbican's farrier, is owed for her shoeing, and nobody will say by whom. Ask Dunk Harrow the ostler.",
      "Ask Gil Wainwright the carter.",
      "Go back to Brida Nail at her anvil in the Barbican.",
    ],
    progress: ["Dunk at the stables, Gil at his wagon."],
    others: {
      ph_ostler: ["Owes her? I owe her nothing. I owe her a dinner, maybe, if she'd come. ...It's Gil. Ask him about the grey mare. Watch him go red."],
      ph_cart: ["Who told you that? ...Dunk. Course it was Dunk. Fine. Fine! Here's her silver. Tell her it was always coming. Tell her I'm a busy man."],
    },
    done: [
      "Gil paid? Gil Wainwright put silver in your hand without being held upside down? You're wasted on whatever you do.",
      "Half of it's yours. And Dunk can have his dinner. Don't tell him I said so.",
    ],
    after: ["Gil nods to me now. Like a man who's been caught and knows it. It's the best thing that's happened at this gate all year."],
  },

  ink_and_gall: {
    title: 'Ink and Gall',
    giver: 'ph_gall2',
    offer: [
      "The old ink-house up the Rise, where my master boiled galls for forty years. It's not empty any more. Something in there drinks the black out of the vats and walks about in it.",
      "Three of them, maybe more. My whole stock's in there. Put them down and I'll pay you in silver, not in ink, I promise.",
    ],
    accept: "I'll go in.",
    acceptLine: "Up the Rise, past the scribes' stair. You'll know it by the stain on the door. Everything there's stained.",
    decline: 'Not today.',
    declineLine: "Then the Rise writes in charcoal this month. They'll grumble. They always grumble.",
    journal: [
      "Something has taken the old ink-house on the Mages' Rise and drinks the vats dry. Put down three of the things there for Sabine Hollow.",
      "Go back to Sabine Hollow on the Mages' Rise.",
    ],
    progress: ["The old ink-house up the Rise. Three of them."],
    done: [
      "Gone? Then the vats are mine again. Look at my hands. They'll be black till I'm buried, and I'm glad of it.",
      "Silver. As I said. Not a drop of ink on it, either. Well. Hardly a drop.",
    ],
    after: ["Every scribe on the Rise is writing in my black again. They don't know who to thank. I've let them think it was me."],
  },

  rivets_from_the_dead: {
    title: 'Rivets from the Dead',
    giver: 'ph_mail',
    offer: [
      "The garrison wants mail mended faster than I can draw the wire, and the smelters won't sell me iron, only to the Keep. So I go where the iron's free.",
      "Coffin nails, hinges, the fittings off the old dead. Bring me eight of them and I'll make rivets of them. Don't ask whose they were. I don't.",
    ],
    accept: "I'll bring the iron.",
    acceptLine: "Eight. Grave iron, the old dead have it. I'll have the fire ready.",
    decline: 'Not that.',
    declineLine: "Squeamish? So's everyone, till their mail gives at the shoulder.",
    journal: [
      "Hanne Riveter, an armourer in the Barracks quarter, needs iron the smelters won't sell her. Bring her eight pieces of grave iron.",
    ],
    progress: ["Eight pieces of grave iron, for Hanne Riveter."],
    done: [
      "Eight. Good iron, this, whatever it was holding shut. It'll hold a rivet better than any of the Keep's.",
      "Here. And if your own gear ever wants mending, you know where the anvil is.",
    ],
    after: ["Your iron's in the shoulder of every second mail shirt on the drill yard now. They don't know. They'd not sleep if they did."],
  },

  lamechs_keys: {
    title: "Lamech's Keys",
    giver: 'ph_sexton',
    offer: [
      "A hundred and thirteen keys on this ring, and every one of them opens something in the Bone Yards. Last night four of the things I lock in got out, and they've taken to the rows.",
      "I'm too old to put them back. You're not. Four of them. Then I can lock up again and sleep, or what passes for it.",
    ],
    accept: "I'll put them down.",
    acceptLine: "In the rows by the charnel wall. They'll be standing where they were buried. They always go back to where they were buried.",
    decline: 'Not tonight.',
    declineLine: "No. Then I'll sit up with my keys again. I'm used to it. They're used to me.",
    journal: [
      "Four of the dead that Old Lamech the sexton keeps locked away have got out into the Bone Yards' rows. Put them down.",
      "Go back to Old Lamech in the Bone Yards.",
    ],
    progress: ["Four in the rows, by the charnel wall."],
    done: [
      "Four. Back where they belong, and locked. Hear that? That's a hundred and thirteen keys with nothing to do.",
      "Take this. It was under the floor of a grave I dug in my first year. Its owner won't miss it.",
    ],
    after: ["I slept, last night. First time since the frost. Didn't dream of keys at all."],
  },

  contraband: {
    title: 'Contraband',
    giver: 'ph_tide',
    offer: [
      "There's a barge that goes up the Slough by night as far as the Tanners' Steps, with nothing in it. Nothing anyone can find. Ulf Keelson built it.",
      "I need someone the tithe-men don't know to walk the Steps after dark, see if they're watching the water, and then tell Ulf the barge is to go or stay. You've the face for it. Nobody'd suspect it.",
    ],
    accept: "I'll walk the Steps.",
    acceptLine: "After dark. Look at the water, not at the men. Then Ulf, at the slip by the Wharf. Say 'go' or 'stay'. Nothing else.",
    decline: 'Not my trade.',
    declineLine: "Pity. You'd have been good at it. The ones who say no always would have been.",
    journal: [
      "Nan Brackwater wants to know if the tithe-men watch the Slough at the Tanners' Steps by night. Walk the Steps after dark.",
      "Tell Ulf Keelson at the Drowned Wharf whether the barge is to go.",
      "Go back to Nan Brackwater on the Drowned Wharf.",
    ],
    progress: ["The Tanners' Steps, after dark. Then Ulf."],
    others: {
      ph_adze: ["She sent you? ...Go, then. The floor's dry and the hold smells of hides, and if the tithe-men lift the boards they'll find hides. Under them, they'd find a good deal more. They won't lift them."],
    },
    heard: { 'ph:tanners': "Nobody on the Steps but a dyer emptying a vat. The water's black and still. Nobody's watching it." },
    done: [
      "It went, and it came back, and nobody lifted a board. You've done this before. Don't tell me. I like you better not knowing.",
      "Here. Your share. There's always a share. That's what keeps everyone's mouth shut.",
    ],
    after: ["The barge goes every third night now. If anyone asks you, it carries hides. It does. Mostly."],
  },

  pawned: {
    title: 'Pawned',
    giver: 'ph_pawn',
    offer: [
      "A young lord brought me his grandfather's signet ring three weeks gone, for twenty silver, and swore he'd be back in a week. A lord's oath. I've had better from the rats.",
      "I don't want the ring. I can't sell a lord's ring, they'd hang me for it. Go to Lord Peregrine and remind him. If he can't pay, his great-aunt can. The Dowager. She'd sooner pay than have it known.",
    ],
    accept: "I'll remind him.",
    acceptLine: "Dukes' Row. He'll be the one with the sword he can't use. She'll be the one in black who frightens it out of him.",
    decline: 'Not my business.',
    declineLine: "No. Nobody's business is anybody's business, in the Rookeries. That's why I'm still poor.",
    journal: [
      "Lord Peregrine Asche pawned his grandfather's signet to Silas Mote the pawnbroker for twenty silver. Remind him of it.",
      "Ask the Dowager Cressida, his great-aunt, to pay.",
      "Go back to Silas Mote in the Rookeries.",
    ],
    progress: ["Lord Peregrine, then the Dowager. Dukes' Row."],
    others: {
      ph_fop: ["The signet? Keep your voice down! ...I'll have it, I'll have it by the new moon. Don't, whatever you do, tell my great-aunt. She'd skin me and have the skin made into gloves."],
      ph_dowager: ["My grandson's ring, in a pawnshop in the Rookeries. Of course it is. Here. Twenty, and five for the pawnbroker's silence. And tell my great-nephew I know, and that I'll be speaking to him. He'll understand."],
    },
    done: [
      "Twenty-five! She paid for my silence too. I've never been paid for silence. I'll keep it all my life now, out of gratitude.",
      "Take the ring back to him, would you? No, I'll keep it till he comes for it. He should have to come for it.",
    ],
    after: ["Lord Peregrine came in for his ring with his eyes on the floor. I gave it him with a bow. Best day's trade I've had."],
  },

  the_old_furnace: {
    title: 'The Old Furnace',
    giver: 'ph_glassb',
    offer: [
      "There's a furnace-house off Ash Lane that went cold the night the Keep's men took the master. It doesn't stay cold. Something's lit it again, and it isn't anybody's apprentice.",
      "I want that furnace. Best draught in the Cinder. Three of them in there that I've seen through the door. Clear it and the first thing I blow in it is yours.",
    ],
    accept: "I'll clear it.",
    acceptLine: "Off Ash Lane, the one with the chimney still smoking and nobody feeding it. Don't breathe the smoke.",
    decline: 'Another time.',
    declineLine: "Then I'll go on blowing in a furnace that wheezes like an old man. My glass knows the difference.",
    journal: [
      "Something has lit the cold furnace-house off Ash Lane in the Cinder Quarter. Put down three of them for Renaud Fyre the glassblower.",
      "Go back to Renaud Fyre in the Cinder Quarter.",
    ],
    progress: ["The furnace-house off Ash Lane. Three."],
    done: [
      "Empty? And the fire? ...Still burning. Of course it is. It's a good fire. It didn't know who it was burning for.",
      "Here. The first thing I blew in it. A little bird. Don't drop it. Or do. I'll blow another.",
    ],
    after: ["The furnace draws like a dream. I've made more glass this month than in the year. Some of it's even good."],
  },

  what_the_stars_say: {
    title: 'What the Stars Say',
    giver: 'ph_orrery',
    offer: [
      "Forty years I've watched the sky over this city, and for forty years the crown fire on the Keep has burned the same red. These three nights it's burned whiter. I can't see why from the Rise: the towers are in the way.",
      "Go up the Approach, by night, as near as they'll let you, and look at it. Then come and tell an old man what colour it is. That's all. Colours are all I've ever wanted to know.",
    ],
    accept: "I'll go up and look.",
    acceptLine: "By night. As high on the Approach as you dare. Look at the fire, not at the guards. The guards are never interesting.",
    decline: 'Not tonight.',
    declineLine: "Then I'll guess. I'm usually right. I'm usually right in ways that do me no good.",
    journal: [
      "Master Thibault Vane, the astrologer of the Mages' Rise, says the crown fire on the Keep has burned whiter these three nights. Go up the Castle Approach by night and see.",
      "Go back to Master Thibault Vane on the Mages' Rise.",
    ],
    progress: ["The Approach, by night. The crown fire."],
    heard: { 'ph:approach': "The crown fire on the Keep, close to: red at its heart, and round it a ring of something paler, turning slowly, like breath on a cold night." },
    done: [
      "Paler round the edge, and turning. ...Then it's waking, or he is. I'll write it down. Nobody will read it. That's what I write things down for.",
      "Take this for your eyes. Mine are no good past the end of my own nose any more. The stars are kind about it.",
    ],
    after: ["Whiter again last night. I've stopped telling anyone. I tell you, because you went and looked."],
  },

  the_cheese_round: {
    title: 'The Cheese Round',
    giver: 'ph_rind',
    offer: [
      "Wheels for the Gutted Lamb in the Rookeries and the eel-women down the Wharf, and my boy's laid up with the cough. Nobody steals from a stranger with a staff.",
      "Carry them round for me, would you? The Rookeries, then the Wharf. They'll know whose cheese it is. Everyone knows my cheese.",
    ],
    accept: "I'll carry them.",
    acceptLine: "The Rookeries first, the Lamb's back door. Then the Wharf. Don't sit on them.",
    decline: 'Not today.',
    declineLine: "No? Then they'll go hungry, and I'll eat cheese till I'm sick. There are worse fates.",
    journal: [
      "Matilde Curd's boy is ill. Carry her cheeses round the Rookeries and the Drowned Wharf.",
      "Go back to Matilde Curd in Chainmarket.",
    ],
    progress: ["The Rookeries, then the Wharf."],
    heard: {
      'ph:rookeries': "Bessie Tallow takes two wheels at the Lamb's back door, sniffs them, and nods as if she'd been paid a compliment.",
      'ph:wharf': "Peg Slither takes the last wheel under one arm and an eel in the other hand, and can't decide which to put down.",
    },
    done: [
      "Every wheel? And nothing nibbled? You've a better character than my boy. Don't tell him I said so.",
      "Here. And a heel of the good one. No, take it. Cheese is the only thing I've ever had too much of.",
    ],
    after: ["My boy's up again, and asking who the stranger was who did his round. I said a wizard. He's not stopped asking since."],
  },

  eels_gone_wrong: {
    title: 'Eels Gone Wrong',
    giver: 'ph_eel',
    offer: [
      "Something's in the Slough under the Wharf that eats my eels out of the traps and leaves the heads. Three of them, longer than a boat, and they come up at the slack water.",
      "I can't sell heads. Nobody's that hungry, not even here. Put them down for me, and I'll give you the price of a season's eels.",
    ],
    accept: "I'll see to them.",
    acceptLine: "Under the Wharf, where the piles go into the black. You'll know by the heads.",
    decline: 'Not now.',
    declineLine: "Then I'll sell heads. Somebody'll buy them. Somebody always does, in Phobos.",
    journal: [
      "Something under the Drowned Wharf is eating Peg Slither's eels out of the traps. Put down three of them.",
      "Go back to Peg Slither on the Drowned Wharf.",
    ],
    progress: ["Under the Wharf, where the piles go into the black. Three."],
    done: [
      "Gone? Three full traps this morning, every eel with its head on. I could weep. I won't. There's eels to gut.",
      "There. The season's price, as I said. Don't spend it on eels. You'll never look at one the same.",
    ],
    after: ["Traps full every tide. I've put the price up. Somebody has to pay for the excitement."],
  },

  the_dead_watch: {
    title: 'The Dead Watch',
    giver: 'ph_wake',
    offer: [
      "Every night I walk the Bone Yards with my lantern, and every night they come up, and I put back the ones I can. Last month I put back my own wife. I'll not talk about it.",
      "There are three I can't put back. Big ones, from the old rows. Walk the yards with me by night, and help me with those three. Then I can sleep a night.",
    ],
    accept: "I'll walk with you.",
    acceptLine: "By night. Keep the lantern side of me. They don't like the light, but they come to it all the same.",
    decline: 'Not tonight.',
    declineLine: "No. Then I walk alone again. I always have. It's only that I'd hoped.",
    journal: [
      "Corwin Lamp walks the Bone Yards' dead-watch alone. Go there by night.",
      "Put down three of the big dead from the old rows.",
      "Go back to Corwin Lamp in the Bone Yards.",
    ],
    progress: ["The Bone Yards, by night. Three from the old rows."],
    done: [
      "Three. Thank you. ...I'll sleep tonight. I'll dream of Ada, I expect. That's all right. I'd rather dream of her than walk with her.",
      "Take this. It was hers. She'd want it used, not kept.",
    ],
    after: ["I slept the night through. First in a year. The lantern burned down to nothing and nobody came up. Nobody at all."],
  },

  fresh_stock: {
    title: 'Fresh Stock',
    giver: 'ph_relic',
    offer: [
      "Pilgrims come up the Approach every day wanting something of the Keep's to take home, a tooth, a knuckle, a nail. I've sold every one I had. Twice, some of them.",
      "There are things in the ditch under the Approach that are mostly teeth. Put down four of them and bring me what's left. Fresh stock, dear. Nobody can tell the difference.",
    ],
    accept: "Four of them.",
    acceptLine: "Down in the ditch under the walls. They come out at the pilgrims. Mind your fingers, I'd hate to sell yours.",
    decline: "That's ghoulish.",
    declineLine: "Ghoulish? It's trade. Everything's ghoulish, in the Approach. At least I'm honest about it.",
    journal: [
      "Gammer Pyx sells relics to the pilgrims on the Castle Approach, and she's sold out. Put down four of the things in the ditch under it.",
      "Go back to Gammer Pyx on the Castle Approach.",
    ],
    progress: ["The ditch under the Approach. Four."],
    done: [
      "Four? Look at these teeth. Look at them! I'll get a month of pilgrims out of these. Two months, if I'm clever, and I am.",
      "Here's your share. Don't go telling them where my relics come from. They'd stop believing in them, and then where would we be?",
    ],
    after: ["A pilgrim wept over one of your teeth this morning. Paid me double for it. I nearly told her. I didn't."],
  },

  // ---- the second dozen (the owner, 2026-11-20: 'start adding more and more quests') ----
  bitter_caps: {
    title: 'Bitter Caps',
    giver: 'ph_nettle',
    offer: [
      "There's a pale cap that grows down the drains on what's died there. Bitter as a tithe-man, and it takes a fever down in a night. The apothecaries pay me double for it and ask no questions.",
      "My knees won't do ladders. Six of them, out of the West Drains, and I'll make it worth the smell. You'll have the smell for a week. That's the price of medicine.",
    ],
    accept: "Six caps.",
    acceptLine: "Down past the Great Grate. Where the dead things lie, they grow. Don't eat one. You'd think you could fly.",
    decline: 'Not the drains.',
    declineLine: "No. Nobody wants the drains. That's why there's money in them.",
    journal: ["Old Nettle the herbalist wants six drain caps from the West Drains under Phobos, for a fever cure."],
    progress: ["Six drain caps, from the West Drains."],
    done: [
      "Six, and fat ones. You've a gift. Most bring me the little ones that taste of nothing.",
      "Here. And a twist of the cure, for when you've a fever. You will. Everyone does, down there.",
    ],
    after: ["Three children on the Rise were burning up last week. They're up and shouting now. Your caps did that."],
  },

  the_burnt_binding: {
    title: 'The Burnt Binding',
    giver: 'ph_binder',
    offer: [
      "A treatise I bound for Magister Pell went missing between my bench and his door. Eleven silver he owes me, and now he says he'll not pay for a book he never had.",
      "Someone sold it on. Walk the Rise and Dukes' Row, where a book like that would sell, and then go and tell Pell where it went. He'll pay once he knows I didn't lose it.",
    ],
    accept: "I'll find where it went.",
    acceptLine: "Black calf, gilt tooled, the size of a tile. Ask the stalls. Then Pell, at the tutors' hall.",
    decline: 'Not today.',
    declineLine: "Then Pell keeps his eleven silver, and I keep my temper. Barely.",
    journal: [
      "Ansel Thorpe the bookbinder's work for Magister Pell went missing. Walk the Mages' Rise and Dukes' Row for word of it.",
      "Tell Magister Odo Pell where it went.",
      "Go back to Ansel Thorpe on the Mages' Rise.",
    ],
    progress: ["The Rise and Dukes' Row, then Pell."],
    heard: {
      'ph:mages': "A stall-keeper on the Rise remembers a black calf book with gilt tooling. A servant in plum livery bought it.",
      'ph:dukes': "A maid on Dukes' Row says the majordomo of the house of Vell bought a book for his master's shelves. Nobody's read it.",
    },
    others: {
      ph_tutor: ["The house of Vell? On their shelves? ...Then it was bound, and delivered, and stolen from my own doorstep by somebody's footman. Very well. Tell Thorpe he'll have his silver. And tell him not to look so pleased."],
    },
    done: [
      "He'll pay? Pell will pay? You must have told it very well. Or very loudly.",
      "Here. A binder's thanks. And if you ever have a book worth binding, bring it to me.",
    ],
    after: ["Pell came by with eleven silver and a face like a dropped pie. Best morning I've had all year."],
  },

  grave_wax: {
    title: 'Grave Wax',
    giver: 'ph_flask',
    offer: [
      "Master needs grave wax for a working, the candle-ends off the old crypt shelves. Don't ask what for. I don't, and I've still got my eyebrows. Some of them.",
      "Six pieces. The old crypts west of here have them, if you've been down one. Bring them and I'll owe you a favour. A small one. Nothing that explodes.",
    ],
    accept: "Six pieces of wax.",
    acceptLine: "From the crypt shelves. The old dead's candles. They burn green, if you're curious. Don't be curious.",
    decline: 'Not that.',
    declineLine: "Fine. I'll use tallow, and it'll go bang, and it'll be your fault. Partly.",
    journal: ["Wenna Crale, an alchemist's assistant on the Mages' Rise, needs six pieces of grave wax for her master's working."],
    progress: ["Six pieces of grave wax."],
    done: [
      "Six! And they're the green-burning ones. He'll be pleased. He'll be pleased in that way that makes the windows rattle.",
      "Here's your favour, in advance. It's money. I thought you'd prefer it to the other kind.",
    ],
    after: ["The working went off. Mostly as it should. The ceiling's higher now. Master says that was on purpose."],
  },

  silk_for_the_shafts: {
    title: 'Silk for the Shafts',
    giver: 'ph_fletch',
    offer: [
      "The garrison wants a thousand arrows by the month's end and the feather-binding's run out. The best binding there is, it turns out, is shroud silk. Don't make that face.",
      "Four lengths. The old dead go down in it. You've a strong stomach, by the look of you. I'll fletch the first quiver for you, free.",
    ],
    accept: "Four lengths of silk.",
    acceptLine: "Shroud silk. The dead won't miss it. Mind you don't tear it.",
    decline: 'Not shrouds.',
    declineLine: "No. Then it's wet twine, and the arrows fly like drunk geese.",
    journal: ["Linnet Shaft, a fletcher in the Barracks quarter, needs four lengths of shroud silk for binding feathers."],
    progress: ["Four lengths of shroud silk."],
    done: [
      "Four, and whole. You'd make a fletcher. You've the patience. And the stomach.",
      "Here. Your quiver, as promised, and silver besides.",
    ],
    after: ["The sergeant says the new arrows fly true. He doesn't know what's on them. I'm keeping it that way."],
  },

  the_garrison_round: {
    title: 'The Garrison Round',
    giver: 'ph_stew',
    offer: [
      "Three hundred mouths in that garrison and every one of them empty by noon. The cheesemonger's late with her wheels and the eel-woman's late with her eels.",
      "Go and tell Matilde Curd and Peg Slither that Mother Gruel is waiting, and that Mother Gruel does not like to wait. Say it just like that. They'll know.",
    ],
    accept: "I'll hurry them.",
    acceptLine: "Chainmarket for the cheese, the Wharf for the eels. Tell them I've a ladle and I'm not afraid to use it.",
    decline: 'Not my errand.',
    declineLine: "Then three hundred men eat bread and water, and they'll know who to blame. Me. And then you.",
    journal: [
      "Mother Gruel, the garrison cook, is waiting on her cheese. Hurry Matilde Curd in Chainmarket.",
      "Hurry Peg Slither on the Drowned Wharf.",
      "Go back to Mother Gruel in the Barracks quarter.",
    ],
    progress: ["Matilde Curd, then Peg Slither."],
    others: {
      ph_rind: ["Mother Gruel sent you? ...With the ladle? Tell her the wheels are on the cart this minute. This very minute. Go on, tell her."],
      ph_eel: ["Gruel! That woman. Fine, fine, a basket's going up now, and tell her if she wants them faster she can catch them herself."],
    },
    done: [
      "Cheese on the cart and eels in the pot. You've a voice for it. They heard me in it.",
      "Take this, and a bowl of the stew. No? Wise. Take the silver then.",
    ],
    after: ["Not a day late since. They say a stranger came round with my name in their mouth. I like that."],
  },

  the_warm_heaps: {
    title: 'The Warm Heaps',
    giver: 'ph_sift',
    offer: [
      "Sixty years I've sifted the ash heaps for what's worth having, and the heaps are warm of a morning now. Warm, and some of them get up and walk.",
      "Four of them, burnt black and moving. Put them down and I'll give you what I've found this year. It's more than you'd think.",
    ],
    accept: "I'll put them down.",
    acceptLine: "Behind the smelters, where the slag goes. They come up out of the heaps grey as I am.",
    decline: 'Not today.',
    declineLine: "No. Well. I've outlived worse. Probably.",
    journal: [
      "Something comes up out of the warm ash heaps in the Cinder Quarter. Put down four of them for Granny Ash.",
      "Go back to Granny Ash in the Cinder Quarter.",
    ],
    progress: ["The ash heaps behind the smelters. Four."],
    done: [
      "Down? All four? Then I can sift in peace again. Peace and ash. My two favourite things.",
      "Here. A ring, three buttons and a tooth with gold in it. And silver, for you. The rest I'm keeping.",
    ],
    after: ["The heaps are cold again. Tam says it's dull now. Tam's a fool. Dull's lovely."],
  },

  coal_by_night: {
    title: 'Coal by Night',
    giver: 'ph_heave',
    offer: [
      "The furnaces in the Cinder want coal before dawn and the carts won't run the lanes after dark. Something on Ash Lane at night that the carters won't name.",
      "Walk the Cinder by night and see if the lanes are safe. Then tell Brann Cinder at the furnaces that the coal's coming or it isn't. I'll carry it either way.",
    ],
    accept: "I'll walk the lanes.",
    acceptLine: "After dark. Ash Lane and round. Then Brann, at the furnaces.",
    decline: 'Not by night.',
    declineLine: "No one will. That's the trouble.",
    journal: [
      "The coal carts won't run the Cinder Quarter's lanes after dark. Walk them by night for Big Ottar.",
      "Tell Brann Cinder at the furnaces whether the coal can come.",
      "Go back to Big Ottar in the Cinder Quarter.",
    ],
    progress: ["The Cinder, by night. Then Brann."],
    others: {
      ph_brann: ["Safe? Nothing on the lanes but a dog and a drunk? ...Then the carts come tonight, and the fires burn, and I'm not cut for idling. Tell Ottar. Tell him to bring two loads."],
    },
    done: [
      "Two loads, he said? Ha! Then I carry two. You did well. The lanes are only dark. Dark's nothing.",
      "Here. Coal money's good money. Black, but good.",
    ],
    after: ["Carts every night now. I sleep in the day, like an owl. A big owl."],
  },

  a_duel_at_dawn: {
    title: 'A Duel at Dawn',
    giver: 'ph_fop',
    offer: [
      "I've been insulted. Gravely. By a majordomo, of all people, who said my doublet was the colour of a bruised plum. I've called him out. At dawn.",
      "Now I find I'd rather not die. Go and ask Madame Isaure how a gentleman gets out of a duel with his honour, and then take her answer to Quillfeather. Discreetly.",
    ],
    accept: "I'll settle it.",
    acceptLine: "Madame Isaure first. She knows everything about everyone. Then Quillfeather. Don't mention the plum.",
    decline: 'Fight your own duels.',
    declineLine: "That's exactly what I'm trying not to do!",
    journal: [
      "Lord Peregrine Asche has called a majordomo out over an insult to his doublet. Ask Madame Isaure how to undo it.",
      "Take her answer to Ambrose Quillfeather, majordomo of the house of Vell.",
      "Go back to Lord Peregrine on Dukes' Row.",
    ],
    progress: ["Madame Isaure, then Quillfeather."],
    others: {
      ph_silk: ["Darling boy. Tell the majordomo that Lord Peregrine withdraws because he cannot bring himself to harm the only man on the Row with taste. Quillfeather will be so flattered he'll forget the plum entirely."],
      ph_major: ["...The only man on the Row with taste. Did he say that? Then I accept his withdrawal, and you may tell him the doublet is more of a damson. A forgivable damson."],
    },
    done: [
      "Damson! Forgivable! I live! I'll never wear it again, of course, but I live.",
      "Here. And don't tell my great-aunt. She was looking forward to the funeral.",
    ],
    after: ["Quillfeather bows to me now. Deeply. It's unsettling. I think I prefer the duel."],
  },

  the_slab_walkers: {
    title: 'The Slab Walkers',
    giver: 'ph_wash',
    offer: [
      "I wash them for the ground. That's all. I wash them and they go in. But last night five got up off the slab before I'd finished, and walked out into the rows wet.",
      "Five. Find them in the rows and put them down, and I'll finish what I started. I like a thing finished.",
    ],
    accept: "I'll find all five.",
    acceptLine: "They'll still be damp. And they'll be walking towards the charnel wall. They always do.",
    decline: 'Not tonight.',
    declineLine: "Then they walk till morning. Same as last time. And the time before.",
    journal: [
      "Five of the dead got up off Hild the Washer's slab and walked into the Bone Yards' rows. Put them down.",
      "Go back to Hild the Washer in the Bone Yards.",
    ],
    progress: ["The rows, towards the charnel wall. Five."],
    done: [
      "All five. I'll finish washing them in the morning. Gently. They had a bad night.",
      "Here's for your trouble. Wash your hands before you eat. I mean it.",
    ],
    after: ["Not one off the slab since. I hum while I work now. I'd stopped humming."],
  },

  a_sailors_tale: {
    title: "A Sailor's Tale",
    giver: 'ph_salt',
    offer: [
      "I owe a drink in every tavern on the water, and I've a tale for each of them that'll square it. Trouble is, I'm banned from half. Something about a goat.",
      "Walk them for me: the Wharf, the Tanners' Steps, the Rookeries. Tell the tale. You'll know it by heart by the third. Then come back and tell me who laughed.",
    ],
    accept: "I'll tell your tale.",
    acceptLine: "It's about a mermaid and a tithe-collector. It's mostly true. Leave out the goat.",
    decline: 'Not my tale to tell.',
    declineLine: "Pity. It's a good one. The goat's the best part.",
    journal: [
      "Jack Brine wants his tale told in the taverns on the water. Walk the Drowned Wharf, the Tanners' Steps and the Rookeries.",
      "Go back to Jack Brine on the Drowned Wharf.",
    ],
    progress: ["The Wharf, the Steps, the Rookeries."],
    heard: {
      'ph:wharf': "A boatman laughs till he chokes at the part with the tithe-collector. He stands you a drink, which you're to give to Jack.",
      'ph:tanners': "A tanner doesn't laugh, but nods slowly, as if he's met the mermaid.",
      'ph:rookeries': "The Gutted Lamb goes quiet, then roars. Someone asks after the goat.",
    },
    done: [
      "They laughed? All three? Even the tanners? Then I'm square. Square as a sail.",
      "Here. And if they ask about the goat, it was a different sailor.",
    ],
    after: ["I'm unbanned from two of them. The third wants to hear about the goat first. I'm considering it."],
  },

  the_glovers_order: {
    title: "The Glover's Order",
    giver: 'ph_glove',
    offer: [
      "An order from Dukes' Row for twelve pairs of the finest gloves, and the currier's late with the leather and the skinner's later with the hides.",
      "Go and remind Abner Hyde and Rook Flaye that a glover with no leather is a glover with no customers, and a glover with no customers has a long memory.",
    ],
    accept: "I'll remind them.",
    acceptLine: "Abner at the currying shed, Rook down by the vats. Mind your shoes.",
    decline: 'Not today.',
    declineLine: "Then Dukes' Row wears last year's gloves, and blames me.",
    journal: [
      "Clemence Fyne, a glover on the Tanners' Steps, is waiting on leather. Remind Abner Hyde the currier.",
      "Remind Rook Flaye the skinner.",
      "Go back to Clemence Fyne on the Tanners' Steps.",
    ],
    progress: ["Abner Hyde, then Rook Flaye."],
    others: {
      ph_curry: ["Clemence sent you? ...The kid's nearly dressed. Tell her tomorrow. No, tonight. Tell her tonight."],
      ph_flay: ["The hides are hung. She'll have them when they're ready and not before. ...Tell her by the morning, then. Tell her I said it civil."],
    },
    done: [
      "By tonight and by morning! Then I'll have the Row's gloves by the new moon. You've a way of asking.",
      "Here. And a pair for you, when they're made. Fine as anything on the Row.",
    ],
    after: ["Twelve pairs, and they asked for twelve more. I've hired a girl. I'm a business now."],
  },

  a_room_for_the_night: {
    title: 'A Room for the Night',
    giver: 'ph_flop',
    offer: [
      "Lucky Ferris has had my best room four weeks on credit, and every night he's at the cards winning someone else's money and none of it comes to me.",
      "Find him in the Rookeries and tell him Widow Crake wants her rent tonight, all of it, or his things go out the window. He'll laugh. Then he'll pay. They all do.",
    ],
    accept: "I'll tell him.",
    acceptLine: "He'll be at the Lamb, at the back, with someone else's coins in front of him.",
    decline: 'Collect your own rent.',
    declineLine: "I usually do. With a cudgel. I thought I'd try asking nicely, for once.",
    journal: [
      "Lucky Ferris owes Widow Crake four weeks' rent. Find him in the Rookeries and tell him.",
      "Go back to Widow Crake in the Rookeries.",
    ],
    progress: ["Lucky Ferris, at the Lamb."],
    others: {
      ph_knave: ["The widow wants paying? ...With the window, she said? Ha. Here. All of it, and a bit over, for her trouble. Tell her she's the only woman in the Rookeries I'm afraid of."],
    },
    done: [
      "All of it? And a bit over? Afraid of me, is he? Good. He should be.",
      "Here's your share. I'll keep the room for you, any time. Paid in advance, mind.",
    ],
    after: ["Ferris pays on the nail now. Calls me Madam. I've half a mind to charge him for it."],
  },
};
