# Bellmourn : Velscour's Throne — the opening

The script in the game, from the first words in the dark to Lisandra's quest at the edge of Bellmourn. The owner read the
lines and had them wired in (November 2026). The words live in `src/core/opening-cave.js` (the cave, the name, the
ledge), `src/core/opening-script.js` (the summons, and everything said on the way down) and `src/folk/lines/lisandra.js`
(the town). This page is written out from them; when they change, so should it.

## The logic in eight sentences

1. Two hundred years ago a stranger called Tessariel broke Velscour on his throne, left this world by a door, and swore
   to come back through it if he ever rose. Lisandra carried Tessariel's lantern in that war, and was left to keep the door.
2. He rose, slowly, and for forty years has had his throne back. She has kept the door, calling Tessariel home.
3. A season ago the door began to answer: forty-three times, with the wrong people, dropped in ditches all over the
   country. Twelve of them got as far as Bellmourn.
4. She met each one wearing her old face, snapped her fingers (a charm: whoever it touches believes the next thing she
   says), told them they were Tessariel, put a sword in their hand and sent them off to fight him. She had stopped
   believing the real one would come.
5. You are different, by three proofs: the door put you in her own circle; the charm ran off you and you saw her real
   face (the old songs say nothing false gets past Tessariel's eyes); and you came through with fire in your hand.
6. Nobody has been born with magic since Velscour drank every spark of it to live through his defeat. Every spark you
   throw is one he has lost, and he will feel it. He is already hunting forty-three of you, which buys a little time.
7. He was a healer who lost a child and shut the door of death. When he was broken it swung open; now he's back and
   leaning on it, which is why the dead won't lie still. They were to be married. (Told on the road, after the fight.)
8. The door was only ever waiting for you. Once you're through, it lets go and falls in, and she comes down to Bellmourn
   with you, where she has always been Old Lis.

**Her looks.** To your eyes she is what the light makes her: in the dark (her cave, the town at night) the old woman; in
the sun (the ledge, the road, the town by day) the girl she was when she took up the door. She says so on the ledge.
Everyone else sees only her glamours: the crone they call Old Lis by day, and a beautiful stranger by night
(`prettyShown` in `src/core/opening.js`). The clock is held at morning from the cave to the town.

**The V and T rule in the words.** No line names both sides: where one line needs both, one of them is "he" or "you".

## How it's told

- **Order.** She starts her usual speech, is caught, tries the charm, and then tells it straight: who she is, the door,
  Velscour and Tessariel, the forty-three, three reasons you are the real one, what to do. Her own past with Velscour
  is kept for the road.
- **Time.** The cave is 2475 spoken characters and comes to the name prompt at about 4:31 at her measured
  pace. Every scene is laid end to end by how long its lines take to say (their recordings' lengths, or her pace until
  they're recorded), so it re-times itself as recordings come in (`lay` in `src/core/opening-cave.js`).
- **The view is hers** from your waking until she has sent you out: no look of your own in the cave, at the name prompt
  or while she takes your name. Holding to skip stays.
- **Lines written for her voice** (docs/VOICES.md): whole sentences, no lone words or barks.

## WAKE — the cave

### 1 · The glamour (0:00 – 0:22, young voice)

*Black. The door's hum, violet light from the portal behind you. She reads the summons from her book across the cave, then comes to you through her things, lovely, her hand held out. Your sight is hazed: you are still waking. She is giving you the speech she has given forty-three times when the flash cuts her off.*

**LISANDRA** *(heard before she's seen)*: By the light that does not set, I call you back. Cross over. Come home.

**LISANDRA**: Shh. There you are, little star. Don’t be afraid.

**LISANDRA**: Look at me. Only at me. I’m going to tell you who you are.

**LISANDRA**: You are Tessariel. And I have waited two hundred years for you to—

### 2 · Seen (0:22 – 0:31)

*The flash. The glamour goes out like a struck lamp: an old woman stands where the girl was, her hand still out. She snatches it back and scrambles two steps away, her hands up; then they come down, one by way of her own cheek.*

**LISANDRA**: …You’re looking straight at me.

**LISANDRA**: Not at the girl. At me.

### 3 · The snap (0:31 – 1:00)

*She backs away among her things, working her cold fingers, raises her right hand at you, and snaps. The hum cuts dead. A breath of silence. Then the candles catch in a wave from her hand, across the cave and past you, and the fire in her hearth with them. She comes back, watching your eyes the whole way, and leans in.*

**LISANDRA**: Hold still. It doesn’t hurt. It never hurts.

**LISANDRA**: That was a charm. Whoever it touches believes the next thing I tell them.

**LISANDRA**: It has worked on forty-three people. It hasn’t worked on you.

### 4 · The truth, then (1:00 – 1:25)

*She straightens, steps back and folds her arms. Her hand to her heart, and a slow, stiff bow: her name comes up on screen. Then her hand goes out past you, at the door you came through.*

**LISANDRA**: So you’d better have the truth. Bear with me. I’m out of practice.

**LISANDRA**: My name is Lisandra. The girl was a glamour. Nobody follows an old woman into a war.

**LISANDRA**: That is a door behind you. You came through it a minute ago, from a long way off.

### 5 · The old story (1:25 – 2:00)

*She crosses to her hearth, holds her hands to the fire, and tells it into the flames; turns round to you for the oath; steps to her table and lays a hand on the old lantern; and faces you again, arms folded.*

**LISANDRA**: This country is Eldravayne. It belongs to Velscour, the Dark Lord.

**LISANDRA**: Two hundred years ago, a stranger called Tessariel broke him on his own throne.

**LISANDRA**: Then Tessariel left by that door, swearing to come back if he ever rose again.

**LISANDRA**: I carried Tessariel’s lantern in that war. I have kept the door ever since.

**LISANDRA**: He rose. For forty years now, he has had his throne back.

### 6 · The forty-three (2:00 – 2:24)

*Her hand goes out down the room, at the ledger on its stand by the tunnel. Then her eyes go to the floor.*

**LISANDRA**: A season ago, the door began to answer. Forty-three times, and every one the wrong person.

**LISANDRA**: So I told each of them what I told you, put a sword in their hand, and sent them off to fight him.

**LISANDRA** *(under her breath)*: I had stopped believing the real one would come.

### 7 · Three proofs (2:24 – 3:18)

*She comes back across the cave to you. One: she looks down, and points, at the circle round your feet. Two: her hand to her own face. Three: she stares at your right hand. The view tips down to it: the staff, and embers crawling over your knuckles. On screen, your cast key (or the cast button, on a phone). Cast, and a spark leaps to the nearest candle, which bursts; she flinches. If you don't, the spark goes on its own after four seconds.*

**LISANDRA**: Then it sent you. And three things tell me you are not like them.

**LISANDRA**: One. It drops the others in ditches, all over the country. It put you here, at my feet.

**LISANDRA**: Two. You saw my real face. The old songs say nothing false gets past Tessariel’s eyes.

**LISANDRA**: And the third is in your right hand. Look down.

**LISANDRA**: That is magic. Nobody in this world has been born with it in two hundred years.

**LISANDRA**: When he was broken, he drank every spark of it to stay alive.

**LISANDRA**: And you have just walked in with a fistful of fire.

### 8 · Who you are (3:18 – 3:54)

*A slow half circle round you, to stand between you and the door. On the name the door's hum comes back for one breath, the portal swells behind her, and every candle flame leans toward you.*

**LISANDRA**: So I’ll say it again, and this time it’s true.

**LISANDRA**: You are Tessariel. You said you’d come back, and you have.

**LISANDRA**: You won’t remember. Two hundred years beyond that door would wash anyone clean.

**LISANDRA**: But he will know you. Every spark you throw is one he has lost, and he will feel it.

**LISANDRA**: He is hunting forty-three of you already. My lies have bought you a little time.

### 9 · What to do (3:54 – 4:20)

*Her hand out down the cave, past you, to the tunnel and the world. Then a look over her shoulder at the door behind her.*

**LISANDRA**: So here is what you do with it.

**LISANDRA**: Take the Long Road down the hill to a town called Bellmourn. They need help there.

**LISANDRA**: Learn what those hands can do. Then go and finish what you started.

**LISANDRA**: I can’t come. That door keeps me alive, and I have never left it for long.

### 10 · The name (4:20 – 4:31)

*She comes round in front of you again, and only now holds out her hand: the old one, where the young one was held out at the start.*

**LISANDRA**: One last thing. The others, I named myself. You, I’m asking.

**LISANDRA**: What did they call you, on the far side?

*The name prompt.*

## NAME — while the prompt waits

**LISANDRA** *(at 10 s)*: It’s your own name. The one you had on the far side.

**LISANDRA** *(at 20 s)*: You’ve had it all your life. It will come back to you.

**LISANDRA** *(at 32 s)*: Take your time. I’ve waited two hundred years. I can wait a minute more.

## HERD — she takes the name and sends you out

*She takes the name where she stands, points down the cave, and goes ahead of you to the lectern by the tunnel. You can
look and walk again when she has finished speaking. When you pass the lectern she is writing your name in the ledger.*

**LISANDRA**: {name}. *(on screen only; the name can't be recorded)*

**LISANDRA**: Good. That goes in the book. It’s the first name in there I didn’t choose myself.

**LISANDRA**: The way out is down that tunnel. Go on ahead of me.

**LISANDRA**: And stop looking at me like that. I know what you see.

| When | Line |
|---|---|
| You turn back toward the door | Not that way. You’ve only just come through it. The way out is down the tunnel. |
| And again | I said out. That door doesn’t open for the asking. Down the tunnel with you. |
| You pass her at the lectern, writing | I’ll see you as far as the ledge. After that, I’ve a door to mind. |
| In the tunnel, the door straining (her voice from behind you) | Hold, door. Please. You’ve held for two hundred years. Hold one more morning… |

## COLLAPSE — the ledge

*You step out onto the ledge, into the morning sun, the valley and the town far below. Behind you the door gives way
and the tunnel falls in. She comes out of the dust at a run and down on one knee; in the sunlight she is the girl
again, and from the dust on she speaks in her young voice. She has it out with you; turns to the rubble; catches you
staring; looks at her own hands in the sun; and points you along the shelf. The scene ends at about 1:10.*

**LISANDRA**: No. No, no, no.

**LISANDRA** *(shouting)*: WHAT HAVE YOU DONE?!

**LISANDRA**: Two hundred years I kept that door open. You walk through it once, and it lets go.

**LISANDRA** *(under her breath)*: I thought I was the one holding it. It was only ever waiting for you.

**LISANDRA**: …Why are you staring at me like that?

**LISANDRA**: Oh. The sun. This is no glamour. Daylight gives me back the face I had when I took up the door.

**LISANDRA**: The dark takes it away again. You are the only one who sees either.

**LISANDRA** *(under her breath)*: Well. I seem to have lost my home.

**LISANDRA**: So I’m coming to Bellmourn with you, {name}. Somebody has to get you down this road in one piece.

**LISANDRA**: Down there I’m Old Lis, a hag who trades herbs for salt. That is the face they’ll see.

## The way down

From the ledge: a shelf cut across the hillside, four flights of stone steps that double back on each other, a path
along the foot of the hill, and then the Long Road to the town's edge: 439 m in all, 142 m of it before
the road (`WAY` in `src/core/opening.js`, `src/core/escort.js`). She leads, about five metres ahead, at your pace. Stop,
and once she's a few steps on she stops, turns round and looks at you; she turns back and goes on when you've come up
to her, or gone past. You keep to a walk on the shelf and the steps, and to her pace while she tells who Velscour was.

Her lines queue and never overlap, and each waits until you are near her (a call doesn't). Seconds are how long each
stays up: its recording's length once it has one.

| Where | Line | Seconds |
|---|---|---|
| The ledge, as the walk starts | This way. Stay close, and mind the edge. | 4.1 |
|  | No door to keep me alive now. One day I’ll die, like everyone else. I’d quite forgotten. | 7.6 |
| Along the shelf | I cut this shelf out of the hill myself. It took ten years. I had the time. | 6.6 |
| The head of the steps, 26 m | Mind the steps. Two hundred winters of frost, and I only ever mended the ones I tripped on. | 7.8 |
| Partway down them | You don’t say much, do you? Good. The others all made speeches. | 5.6 |
| The road, 142 m | This is the Long Road. Bellmourn is at the bottom, on the far side of those pines. | 7.1 |
|  | That staff is not a walking stick. When something comes at you, point it and let fly. | 7.4 |
|  | And keep your distance. The others had armour. You have a robe. | 5.6 |
| With nothing else to say, above the pines (in turn) | Two hundred years in that cave. I only left it for salt, and to fetch whoever the door had dropped. | 8.5 |
|  | Everything I own is under that rock. I had a very good kettle. | 5.6 |
|  | Don’t look at me like that. It’s the dust. I am not crying. | 5.6 |
|  | I’ve walked this road twice a year since before Bellmourn had an inn. It doesn’t get any shorter. | 8.3 |
|  | It’s a small town. Bells, mud and gossip. By nightfall they’ll all have an opinion of you. | 7.8 |
| The pines | Stay on the road through the pines. The dead are in there, and they don’t read prophecies. | 7.8 |
| The dead come up | There, in the trees! They’re coming up! Don’t let them near you! | 5.7 |
|  | Point the staff and burn them! That’s what the fire is for! | 5.3 |
|  | I’ve a few old tricks left. Keep them off me, and I’ll light what I can. | 6.3 |
| The second wave | More of them, and children with them. He never lets anyone go. Not even the little ones. | 7.6 |
| The necromancers | Necromancers, out of the trees! Burn them first, or the dead won’t stay down! | 6.7 |
| The last of them down | Well. You’ll do. You’ll do very nicely. | 4.3 |
| Who Velscour was (you keep to her pace) | You’ll want to know why the dead get up and walk. It began as a kindness. | 6.4 |
|  | Velscour was a healer once. He sat up with the dying every night, and held their hands until they went cold. | 9.2 |
|  | Then he lost a little girl he’d sat with nine nights, and decided death was a door he could close. | 6.8 |
|  | So he closed it, and the dead stopped staying dead. | 4.7 |
|  | When you broke him, it swung open again, and they could rest. | 5.5 |
|  | Now he’s back, and leaning on it. That is why the dead here won’t lie still. | 6.7 |
|  | He still calls it mercy. | 2.9 |
| And what he was to her | I know, because I was there. We were to be married in the spring. | 5.8 |
|  | The little girl died that winter. There was no spring. | 4.9 |
|  | I left him the night the first of them got up and walked. | 5.2 |
|  | Then I went looking for someone who could stop him, and I found you. | 6 |
| The last stretch | He named a star for me once. I can’t find it any more. I think he took it back. | 6.9 |
| Nearing the town (in turn, as there's room) | Now, Bellmourn. Twelve of my forty-three walked in there before you, so they’ve stopped being impressed. | 8.9 |
|  | Bram Kettle keeps the inn, north of the well. He counts them on a slate. You’ll be his thirteenth. | 8.4 |
|  | The cathedral is on the hill past the far end of town. It’s the Dark Lord’s now, and his knight is on the door. | 9.4 |
|  | Three of the twelve went up to fight that knight. Stay off that hill until I say. | 7.1 |
|  | And if you hear the bell at midnight, stay indoors. Nobody living rings it. | 6.6 |
| Bellmourn in sight | There it is. Bellmourn. Let me do the talking. | 4.3 |
| At the town's edge, after a scream from the far side of it | That came from the cathedral hill. Keep walking. There’s nothing you can do for them yet. | 7.7 |
| You fall behind | This way! Keep up! | 2.8 |
|  | Bellmourn’s down the hill. It won’t come up and fetch you. | 4.6 |
|  | I’m not carrying you, {name}. | 2 |
| You run on ahead | Slow down! Some of us just lost a cave. | 3.8 |
|  | {name}! Wait for me! | 2.1 |
| You ride your shield | Oh, we’re riding, are we? Fine. Don’t you dare laugh. | 5.2 |
|  | Two hundred years, and nobody ever showed me this! | 4.4 |
|  | …Again. Later. When nobody’s looking. | 3.9 |

**The fight** (`fight` in `src/sim/opening.js`, `openingRaise` in `src/sim/undead.js`). In the pines, twenty of the
dead come up out of the ground, five at a time. When eight or fewer are left, twenty more come up, ten of their
children among them. When ten or fewer of those are left, a necromancer runs out of the trees on each side of the road;
they raise what has fallen round them. All of them are easy: it is your first fight, and on the road you can't die
(you're knocked flat and come to beside her). She stands with you and throws a weak fire bolt every couple of seconds
at whichever of them is nearest her. When every one is down she tells you why the dead walk, and you go on to town.

## The town's edge — her quest

*At the edge of Bellmourn she stops, and everyone looks at her. Talk to her.*

**LISANDRA**: Stop there a moment. I've a word for you before you go in.

**LISANDRA**: There it is. Forty roofs, one well, and the Dark Lord's cathedral looking down on all of it. You're not ready for that hill. You're not ready for his knight. You're ready for Bellmourn.

**LISANDRA**: Nobody follows a prophecy, {name}. They follow whoever mended their roof. So be useful. Everyone in that town with a trouble worth the name: find them, and take it off their hands. That's how you'll learn what your own can do.

**LISANDRA**: Start with Bram Kettle at the inn. He counts strangers, so let him count you. Then the rest. You'll know them. They're the ones looking at you as if you might be the answer to something.

*You: "I'll find them."*

**LISANDRA**: Good. I'll be here, being stared at. Come back when every one of them has given you something to do.

*The quest: Known in Bellmourn. Find everyone in town with work to give, and take some of it from each.*
