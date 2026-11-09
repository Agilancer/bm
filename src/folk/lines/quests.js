// The eight starter quests: every word of them. The mechanics (giver, steps, rewards) are fixed elsewhere.
// A line is a string said by the giver, or [speaker, text] when someone else cuts in (Dusty translating Homunculus); or either,
// kept for before or after something ({ before, say } / { after, say }: src/folk/quests.js sayable).
// hint: added to the journal's first step, for work that's down among the dead and can be given before Silas has handed over
// the key to the Sexton's Door (the great door has the knight in it).
// Bible: tools/folk/cast.md. Facts agree with town_a.js, town_b.js, town_c.js and scenes.js.
const notYetIn = (say) => ({ before: 'quest:dead_cant_wait', say });
const WAY_IN = notYetIn("The cathedral's great door has a knight in it. Silas Crane, the coffin maker, keeps the key to another way in.");

import { QUESTS as BEYOND_QUESTS } from './beyond.js';
import { QUESTS as LISANDRA_QUESTS } from './lisandra.js';

export const QUESTS = {
  bed_and_bell: {
    title: 'A Bed and a Bell',
    giver: 'bram',
    offer: [
      "See the slate? Twelve strokes before yours: three on the hill, two in the pines, six gone strange, one who paid. The thirteenth gets a bed and a warning.",
      "Bed's four copper, and I don't give Tessariels credit. Tonight I will. And if you mean to do something, not shout at something, go and see Silas Crane at the coffin yard. He's a problem that wants somebody foolish.",
    ],
    accept: "I'll see Silas.",
    acceptLine: "Coffin yard. Knock loud; most of his callers don't. And come back tonight. I like to know which way to count.",
    decline: 'Not yet.',
    declineLine: "Bed's there. Silas will be there. His guests aren't going anywhere either.",
    journal: [
      "Bram Kettle says Silas Crane, the coffin maker, has a problem that wants somebody foolish. Go and see him.",
      "Silas Crane has had his look at you. Go back to Bram Kettle at the Tolling Bell and tell him so, or just take the bed he's keeping you tonight.",
    ],
    progress: [
      "Silas. Coffin yard. Follow your nose on a warm day.",
      "Still here? Most of the twelve were halfway up the hill by now. I'll count that in your favour.",
    ],
    done: [
      "Silas sent word you'd been. Said you didn't laugh and didn't run. That's two things the other twelve couldn't manage between them.",
      "Your stroke's still up there with nothing owing by it and no hill. Keep it that way.",
    ],
    after: [
      "Thirteen strokes, and one of them still comes down for breakfast. I keep looking at it.",
    ],
    others: {
      silas: ["So he did send you. Bram doesn't send people; Bram counts them. Well. Sit. Not on that one, it's occupied."],
      nell: ["Dad put your bed on the slate? He's not given a Tessariel credit since the hill. Don't make him sorry."],
      maudie: ["Bram's sent you to Silas? Then eat first. Nobody should meet Silas hungry."],
    },
  },

  dead_cant_wait: {
    title: "The Dead Can't Wait",
    giver: 'silas',
    offer: [
      "Nine in the yard, stacked three high, and the Hollis girl in the shed out of the rain. Nobody goes in the ground while that knight stands at the church door. I asked him. Politely. From a long way off.",
      "Worse: what's already down there won't lie still. The crypts are emptying upward. Round the south side, low in the back wing where the stair goes down, there's a way in he can't see from where he stands. The Sexton's Door. I've the key. Go down and put them to rest. Eight would do for a start.",
    ],
    accept: 'Give me the key.',
    acceptLine: "Here. Off my belt; mind, it's heavy for its size. Turn it twice and lift. Don't talk to them down there. They were people, and they'll sound like it. They aren't anymore.",
    decline: 'Not today.',
    declineLine: "Nobody in my yard's in a hurry. I'll tell them you said so.",
    journal: [
      "Find the Sexton's Door, low in the cathedral's back wing on its south side. Leave the church road before the knight's ground and go wide round.",
      "Put down eight of the dead in the catacombs below the cathedral.",
      "Go back to Silas Crane at the coffin yard.",
    ],
    progress: [
      "Door sticks? Lift as you turn. It always wanted lifting, even when we were both young.",
      "How many? Don't tell me. I'll know by the quiet.",
    ],
    done: [
      "Quieter. I sat in the yard last night and nobody under the hill was knocking. First time in a month. Sixty gold: what I'd have charged for eight burials, and you did the hard part.",
      "And bring me bone when you find it. I'll carve you a skull worth carrying. That fellow of yours is doing his best, but I can see the mends.",
    ],
    after: [
      "Still quiet under there, mostly. Wat Cotter's still at the bottom of the stack, still complaining, but that's just Wat.",
    ],
    others: {
      orrin: ["The Sexton's Door? Silas gave you the key? Forty years he's had it and never once let me— well. Bring me anything with writing on it."],
      corran: ["Going in the side way. Good. The front door's got company."],
      aldric: ["Under the church. In by daylight, fire in hand, out before the lamps. That's my advice. Nobody's taken it yet."],
    },
  },

  bones_for_carver: {
    title: 'Bones for the Bone-Carver',
    giver: 'silas',
    offer: [
      "You've been down. You'll have seen bone lying about, nobody's in particular. Bring me ten shards. Good ones, not splinters.",
      "I'll carve you a skull. A proper one, with some of the old craft in it. Not something off Magda's stall with a beetle living in the eye.",
    ],
    accept: 'Ten shards. Done.',
    acceptLine: "Good. If one of them asks for itself back, give it. I've standards.",
    decline: 'Later.',
    declineLine: "They'll keep. Bone's very patient. It's had the practice.",
    journal: [
      "Bring ten Bone Shards up from the catacombs to Silas Crane at the coffin yard.",
    ],
    making: "Silas Crane is carving your skull overnight. Go back to the coffin yard tomorrow.",
    waiting: [
      "Not yet. Bone won't be hurried, and nor will I. Tomorrow.",
      "It's on the trestle with a cloth over it. Don't lift the cloth. Tomorrow.",
    ],
    progress: [
      "Ten. Not nine and a knuckle.",
      "Bryony's been round twice asking if you'll bring spares. Don't.",
    ],
    done: [
      "That's good bone. Old. Somebody ate well once. Give me a night with it.",
      "There. Carved round the brow, and I put a little of myself in the jaw. Hold it up in the dark. You'll see why I took my time.",
    ],
    after: [
      "How's my skull? Keeping its jaw on? If anyone asks who did the carving, it was me, and I'm not taking work.",
    ],
    others: {
      bryony: ["Mister Crane's getting ten whole shards? From you? Can I see them before he carves them? Only to say goodbye."],
      magda: ["Silas is carving for you? I'll give you nine gold for it when he's done, dear, and that's robbing myself."],
    },
  },

  iron_from_dead: {
    title: 'Iron from the Dead',
    giver: 'homunculus',
    offer: [
      "Thirteen! Little candle! Your staff offends Verdict, and Verdict is slow to offence. Verdict has struck a thousand things and forgiven every one.",
      "Go down among the dead and bring me their iron. Eight pieces! I shall forge you a staff worthy of a lesser Tessariel, which is to say, worthy of nearly anybody.",
      ['dusty', "Eight Grave Iron. Nails, coffin fittings, old blades, off the dead in the catacombs. He'll make you a staff. A good one. He's a better smith than he is a saint."],
      notYetIn(['dusty', "Not by the front door, mind. There's a knight in it. Silas Crane at the coffin yard has a key to the side way. Ask him first."]),
    ],
    accept: "Eight. I'll bring them.",
    acceptLine: "Go with the Light! Go with the blessing of Patience! Dunstan, write down that I blessed the candle.",
    decline: 'Not yet.',
    declineLine: "The Light waits! The Light is very good at waiting. It has waited for me for forty-five years.",
    journal: [
      "Bring eight Grave Iron up from the catacombs to Homunculus at the smithy.",
    ],
    hint: WAY_IN,
    progress: [
      "Is it iron? The iron of the dead? Verdict can smell it on you. Verdict is unusual.",
      "Patience is hot, little candle, and Patience is not patient about it. Bring the iron.",
    ],
    done: [
      "Behold! Iron that held the dead in their boxes, made now to hold you up. Feel the balance. Feel it forget the boxes. Feel how I did the grip three times!",
      ['dusty', "It's a really good staff. Don't tell him I said. He'll put it in a speech."],
    ],
    after: [
      "The staff I forged you: does it sing when you raise it? It should sing. If it doesn't, you're holding it wrong. Verdict never sings wrong.",
    ],
    others: {
      dusty: ["He calls everyone a lesser Tessariel. Last week it was the mule. You're above the mule. I checked."],
      wren: ["My master's forging for you? He'll want charcoal. Lots. I'll fetch it. Don't tell him he needs anything, or he'll say the Light provides."],
    },
  },

  shroud_and_thread: {
    title: 'Shroud and Thread',
    giver: 'tamsin',
    offer: [
      "Look at you. No, stand still and look at you. That robe's been dragged out of a cave and down a road, and it's given up. I can hear it giving up.",
      "The dead go down in Reed silk. My mother's stitch, every shroud in that ground, and now they're walking about in it. Bring me eight lengths and I'll make you something you won't be buried in.",
      notYetIn("And don't go in the front. Silas Crane has a key he pretends he hasn't."),
    ],
    accept: "Eight. I'll find them.",
    acceptLine: "Clean ones if you can. If not, I'll boil the dead out of it. I've done worse to wool.",
    decline: 'I like this robe.',
    declineLine: "You don't. Nobody could. It's holding you together out of pity. Come back when it stops.",
    journal: [
      "Bring eight Shroud Silk up from the catacombs to Tamsin Reed at the weaver's.",
    ],
    hint: WAY_IN,
    making: "Tamsin Reed is sewing your robe. Go back to the weaver's tomorrow.",
    waiting: [
      "Tomorrow, I said. Is it tomorrow? Then it isn't ready.",
      "Wenna's still on the thread. Go and get yourself nearly killed somewhere else for a day.",
    ],
    progress: [
      "Eight lengths. Not seven. Seven gets you a shirt and a lecture.",
      "Wenna's dyeing thread for it already. Don't keep her waiting; she sings when she's kept waiting.",
    ],
    done: [
      "Oh, that's good silk. Mother's hem; I'd know it anywhere. Somebody was loved, going down in this. Give me till tomorrow and don't touch anything.",
      "There. Put it on. Turn. Other way, you've two sides. Now that's a robe. If you get yourself killed in it, I'll be bloody— I'll be very cross.",
    ],
    after: [
      "Robe's wearing well. You're not. Stand up straight in it; it cost the dead a fortune.",
    ],
    others: {
      wenna: ["Tamsin's making you a robe? I'll do the thread. You're an ember sort of colour, inside. I'll find it."],
      silas: ["Shroud silk for Tamsin? Take it. They're not using it properly. Bring me the bones that fall out."],
    },
  },

  pines: {
    title: 'What Walks in the Pines',
    giver: 'corran',
    offer: [
      "You came in by my door, down the Long Road. You'll have seen the pines either side. You won't have seen what's in them. They let you by. They don't let everyone.",
      "Packs of six, eight, walking in step. The town lights another lamp and goes to bed. Put down twelve of them in the woods and I'll pay you eighty gold. That's my winter. It's worth it.",
    ],
    accept: "Twelve. I'll go.",
    acceptLine: "In at noon, out by dusk. Don't answer a voice you know. They use the ones they had.",
    decline: 'Not yet.',
    declineLine: "Course not. Nobody's going yet. That's how it got like this.",
    journal: [
      "Put down twelve of the dead in the woods outside town.",
      "Go back to Corran Thrale at the hunter's lodge on the Long Road.",
    ],
    progress: [
      "Count them. They're counting you.",
      "If it's quiet in there, it isn't empty. It's listening.",
    ],
    done: [
      "Twelve. Eighty gold, as I said. I've had that purse ready a month. Nobody came back to collect.",
      "...Thank you. There. Said it. Don't tell the square. They'd think I'd gone soft, and I need them frightened.",
    ],
    after: [
      "Garth carted your twelve to the burning. Said they weighed less than grain. He's not slept since. I have.",
    ],
    others: {
      aldric: ["Corran's paying you out of his own purse? Then he's seen worse than he tells me, and he tells me plenty."],
      garth: ["When they're put down, I cart them to the burning. ...I'll fetch yours. You needn't watch."],
      jory: ["The pines? In daylight, mind. Never at night. At night they aren't pines."],
    },
  },

  toll_of_bell: {
    title: 'The Toll of the Bell',
    giver: 'orrin',
    offer: [
      "Midnight, three strokes. You'll have heard it, or heard of it; Bellmourn talks of little else. Three is the old count for the dead, and no living hand has rung that bell in forty years. I have checked. I have checked every living hand in Bellmourn.",
      "My plan puts a chamber under the tower: the Bell Crypt. A warden was laid there, to keep the rope. If anything is ringing, it's that. Go down at night, when it wakes, and silence it. I'll pay in scrolls, and in history, which is worth more and sells for less.",
      notYetIn("Not by the great door, which has a knight in it. Silas Crane keeps the key to the sexton's door. Forty years I've asked to borrow it. Ask him; you look less likely to write about it."),
    ],
    accept: "I'll go down tonight.",
    acceptLine: "Splendid. Take a lamp. Take two. I would come, but my knees are older than the catacombs and not half so sturdy.",
    decline: 'Not tonight.',
    declineLine: "Of course. It's rung every night for a month; it will ring tonight without either of us. That's rather the trouble.",
    journal: [
      "Go down to the Bell Crypt beneath the cathedral tower, at night.",
      "Silence the bell's warden, the champion of the dead who keeps the crypt.",
      "Go back to Orrin Vey at the Tolling Bell.",
    ],
    hint: WAY_IN,
    progress: [
      "At night, mind. The warden keeps the bell's hours, not ours.",
      "Under the tower. Down. Further down. It is always further down than one would like.",
    ],
    done: [
      "Last night: nothing. I sat up with a candle and my pulse until one, and the bell said nothing at all. I wept a little. Don't tell Bram; he'd count it.",
      "A scroll, as promised. Choose well, or at least choose. And this: I copied it out of the cathedral's register years ago. I should like it read by somebody who has been down there.",
    ],
    page: "Of the Great Bell. In the year of the wet harvest the folk of this town gave up their pots and hinges, their ploughshares and spoons, and one widow her ring, and of these the bell was cast in the low field, and drawn up the hill by eleven oxen and every child in the town. It was rung for births and burials, for fire, and for the harvest home, and the town took its name from it. Let it be rung by a living hand, and three strokes for the dead.\n[In a later hand:] Rung last by Amos Crane, sexton, the night the church was given to the Throne. He would not give up the rope.",
    after: [
      "I slept through midnight. Through it! I haven't done that since the knight came. I woke up quite offended.",
    ],
    others: {
      jory: ["The Bell Crypt? At night? I'll keep the east lamp burning till you're back. I'll stand by it. I'll not look at the hill, but I'll stand by it."],
      silas: ["My father rang that bell last. Wouldn't give up the rope after, so they let him keep it. It's on a hook in my shed. Hasn't moved. I check."],
      bram: ["Orrin's sent you after the bell. Good. Every night I count to three. I'd like to stop counting something."],
      kit: ["Are you stopping the bell? Then I won't have to count. ...Stop it before four. Not after. Never four."],
    },
  },

  letter: {
    title: 'A Letter Across the Square',
    giver: 'cedric',
    offer: [
      "You. Thirteen. Over here, out of the light. Not that far out, I'm not a thief.",
      "There's a letter. It goes to Elowen Halloway, into her hand and nobody else's, and you say nothing to anyone. Not my sisters. Not my mother. Especially not my mother. Bring me back whatever she answers.",
    ],
    accept: "I'll carry it.",
    acceptLine: "Plain wax. If I'd used the house seal, Mother would know by supper; she can hear it being pressed. Go. And don't— just go.",
    decline: 'Carry your own letters.',
    declineLine: "I can't. That's the whole trouble. Every time I cross the square, I walk straight past her door.",
    journal: [
      "Take Cedric Ashby's sealed letter to Elowen Halloway, into her hand, and say nothing to anyone.",
      "Bring Elowen's answer back to Cedric.",
    ],
    progress: [
      "Did she read it? Don't tell me what her face did. ...Tell me. No. Don't.",
      "Seraphine's been at her window all morning. Go round by the tannery. Nobody follows anybody past the tannery.",
    ],
    done: [
      "It's open. She sent it open? Anyone could have— you read it. Of course you read it. Half of Bellmourn will have it by supper.",
      "...That's yes. Isn't it? In her way. In the square. In daylight. In front of Mother. I think I'd rather go up the hill.",
    ],
    after: [
      "Tomorrow. At the well. I'll ask her tomorrow. I said that yesterday, and I meant it then too.",
    ],
    others: {
      elowen: [
        "From Cedric? Into my hand. Of course into my hand; he never could put anything anywhere else. Wait there.",
        "Read it. Go on. You carried it; you should know what you carried. Then tell me if I'm a fool.",
        "Here's my answer. No, don't seal it. If anyone stops you, let them read it. I'm tired of whispering under trees.",
      ],
      margery: ["You're carrying something for my daughter. Don't tell me. I know the hand. He's been scratching her name on our wall since he was nine."],
      seraphine: ["You were at the Halloways' gate. You had something in your hand. I only noticed. I notice things. Mother says it's a gift."],
      juliana: ["You're Cedric's pigeon now? Good. Somebody had to be. He's been writing that letter since harvest. Don't drop it near Seraphine."],
    },
    letters: {
      cedric: "E.\n\nI went up the hill road again. Don't be angry. I stood where the three stood, and he never moved, not once, all afternoon, and I thought: that is what it is to be sure of a thing. I have only ever been sure of one.\n\nIn spring I ride to the capital. I'll serve, and make a name, and in the capital nobody asks what colour a lion was. Come with me. I won't ask twice. I haven't the nerve to ask once; that's why this is paper.\n\n(Here a line is scratched out, hard, twice.)\n\nIf it's no, burn this and say nothing, and I'll still know you at the oak.\n\nC.\n\nI wrote this nine times. This is the one with fewest blots.",
      elowen: "Cedric,\n\nI read it twice, and then I gave it to the one who carried it, because I'm tired of secrets and so should you be.\n\nYou stood where the three stood. They were fools too, and somebody loved them.\n\nYou say he's sure. So is a wall. I don't want a man who stands in a door and kills whoever comes. I want the one who wrote this nine times.\n\nI won't go where nobody asks about lions. I'd only be asked to forget mine.\n\nAsk me in the square, in daylight, in front of your mother and my father, and I'll say yes before you've finished.\n\nYou scratched out a line. I held it to the window. I could read it.\n\nWrite it again where it shows.\n\nE.",
    },
  },
};

// The quests that go out past the town (src/folk/lines/beyond.js).
Object.assign(QUESTS, BEYOND_QUESTS);
// And Lisandra's, which sends you round to all the rest (src/folk/lines/lisandra.js).
Object.assign(QUESTS, LISANDRA_QUESTS);
