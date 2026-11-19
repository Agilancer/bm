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

- **Cut, November 2026.** The opening was cut by about half at the owner's word ("janky, doesn't feel good"), and
  reviewed by two critics (see "The cut, and the two critics" at the end). The cave came to the name prompt at 4:51,
  with your first cast at 4:00; now it's 2:42, and you cast at about 0:58. Twelve of the cave's thirty-four lines went,
  and the three proofs became one thing you do: she sees fire in your hand, and you throw it.
- **Order.** She starts her usual speech, is caught, tries the charm, sees your hand, and then tells it straight: who
  she is, the door, the forty-three, who you are, what to do. Her own past with Velscour is kept for the road.
- **Time.** Her words are read, not heard (her recordings aren't played), so every line is up as long as it takes to
  read, at 15 characters a second and a moment to find it (`readSecs` in `src/core/opening-cave.js`), and the next
  waits for it. Every scene is laid end to end that way (`lay`). `tests/opening-script.test.mjs` holds the lines to it.
- **The view is hers** from your waking until she has sent you out, but from the flash on you can look a little way
  round it (the mouse, once the game has it), eased back when you let go. Holding to skip stays.
- **Lines written for her voice** (docs/VOICES.md): whole sentences, no lone words or barks. The lines written in the
  cut aren't recorded yet.

## WAKE — the cave

### 1 · The glamour (0:00 – 0:22, young voice)

*Black. The door's hum, violet light from the portal behind you. She reads the summons from her book across the cave, then comes to you through her things, lovely, her hand held out. Your sight is hazed: you are still waking. She is giving you the speech she has given forty-three times when the flash cuts her off.*

**LISANDRA** *(heard before she's seen)*: By the light that does not set, I call you back. Cross over. Come home.

**LISANDRA**: Shh. There you are, little star. Don’t be afraid.

**LISANDRA**: Look at me. Only at me. I’m going to tell you who you are.

**LISANDRA**: You are Tessariel. And I have waited two hundred years for you to—

### 2 · Seen (0:22 – 0:30)

*The flash. The glamour goes out like a struck lamp: an old woman stands where the girl was, her hand still out. She snatches it back and scrambles two steps away, her hands up; then they come down, one by way of her own cheek.*

**LISANDRA**: …You’re looking straight at me.

**LISANDRA**: Not at the girl. At me.

### 3 · The snap (0:30 – 0:54)

*She backs away among her things, working her cold fingers, raises her right hand at you, and snaps. The hum cuts dead. A breath of silence. Then the candles catch in a wave from her hand, across the cave and past you, and the fire in her hearth with them. She comes back, watching your eyes the whole way, and leans in.*

**LISANDRA**: Hold still. It doesn’t hurt. It never hurts.

**LISANDRA**: That was a charm. Whoever it touches believes the next thing I say.

**LISANDRA**: It has worked on forty-three people. It hasn’t worked on you.

### 4 · Your hand (0:54 – 1:12)

*Her eyes drop to your hand, and she points. The view tips down to it: embers on your knuckles, the staff in your grip.
"Press F to cast" (on a phone, the cast button). Cast, and a spark leaps from your hand and bursts the nearest candle;
leave it, and it goes on its own after five seconds. She flinches.*

**LISANDRA**: …And what is that in your hand? Look down.

**LISANDRA**: Magic. Nobody in this world has been born with it in two hundred years.

### 5 · Who she is, and the old story (1:12 – 1:52)

*A step back from you. Her hand to her heart, and a slow, stiff bow: her name comes up on screen. Then across to her
hearth, her hands held to the fire, telling it into the flames; round from it, her hand out past you at the door you
came through. Then a hand down the room at the ledger on its stand by the tunnel, and her eyes on the floor.*

**LISANDRA**: My name is Lisandra. The girl was a glamour. Nobody follows an old woman into a war.

**LISANDRA**: Two hundred years ago, a stranger broke the Dark Lord Velscour on his own throne.

**LISANDRA**: Then the stranger left by that door, swearing to come back if he ever rose. Forty years ago, the Dark Lord rose.

**LISANDRA**: A season ago, the door began to answer. Forty-three times, and always the wrong person.

**LISANDRA**: I told each of them what I told you, and sent them off to fight him.

**LISANDRA** *(under her breath)*: I had stopped believing the real one would come.

### 6 · Who you are (1:52 – 2:18)

*Back across the cave to you; then a slow half circle round you, to stand between you and the door. On the name the
door's hum comes back for one breath, the portal swells and every flame leans toward you.*

**LISANDRA**: But you saw through me. And you came through with fire in your hand.

**LISANDRA**: So I’ll say it again, and this time it’s true.

**LISANDRA**: You are Tessariel. You said you’d come back, and you have.

**LISANDRA**: When you broke him, he drank every spark of magic there was, to stay alive. Every one you throw, he will feel.

### 7 · What to do, and the name (2:18 – 2:42)

*Her hand out down the cave, past you, to the tunnel and the world. A look over her shoulder at the door behind her.
Then round in front of you again, and only now does she hold out her hand: the old one.*

**LISANDRA**: Take the Long Road down the hill to Bellmourn. They need help there, and you need practice.

**LISANDRA**: I can’t come. That door keeps me alive, and I have never left it for long.

**LISANDRA**: One last thing. The others, I named myself. You, I’m asking.

**LISANDRA**: What did they call you, on the far side?

*The name prompt.*

## NAME — while the prompt waits

**LISANDRA** *(at 10 s)*: It’s your own name. The one you had on the far side.

**LISANDRA** *(at 20 s)*: You’ve had it all your life. It will come back to you.

**LISANDRA** *(at 32 s)*: Take your time. I’ve waited two hundred years. I can wait a minute more.

## HERD — she takes the name and sends you out

*She takes the name where she stands, points down the cave, and goes ahead of you to the lectern by the tunnel. You can
look and walk again 16 seconds after the name. When you pass the lectern she is writing your name in the ledger.*

**LISANDRA**: {name}. *(on screen only; the name can't be recorded)*

**LISANDRA**: Good. That goes in the book: the first name in it I didn’t choose.

**LISANDRA**: The way out is down that tunnel. Go on ahead of me.

| When | Line |
|---|---|
| You turn back toward the door | Not that way. You’ve only just come through it. The way out is down the tunnel. |
| And again | I said out. That door doesn’t open for the asking. Down the tunnel with you. |
| You pass her at the lectern, writing | I’ll see you as far as the ledge. After that, I’ve a door to mind. |
| In the tunnel, the door straining (her voice from behind you) | Hold, door. Please. You’ve held for two hundred years. Hold one more morning… |
| A few seconds on, or a few strides deeper: the door lets go | *(shouted from behind you)* It’s letting go! Run for the light, and don’t you stop! |

**The escape.** Until the door lets go you keep to a walk in the cave. Then the roof groans and cracks all round you,
dust and stones come down ahead of you, the view shakes, and you can run: out of the tunnel's last fifteen metres and
into the sun (`QUAKE` in `src/sim/opening.js`).

## COLLAPSE — the ledge

*You come out onto the ledge, into the morning sun, the valley and the town far below. Behind you the door gives way
and the tunnel falls in. She comes out of the dust at a run and down on one knee; in the sunlight she is the girl
again, and from the dust on she speaks in her young voice. She has it out with you; turns to the rubble; catches you
staring; looks at her own hands in the sun; and points you along the shelf. The scene ends at about 0:58.*

**LISANDRA**: No. No, no, no.

**LISANDRA** *(shouting)*: WHAT HAVE YOU DONE?!

**LISANDRA**: Two hundred years I kept that door open. You walk through it once, and it lets go.

**LISANDRA** *(under her breath)*: It was only ever waiting for you.

**LISANDRA**: …Why are you staring at me like that?

**LISANDRA**: Oh. The sun. That’s no glamour: daylight gives me back the face I had when I took up the door.

**LISANDRA** *(under her breath)*: Well. I seem to have lost my home.

**LISANDRA**: So I’m coming to Bellmourn with you, {name}. Somebody has to get you down this road in one piece.

**LISANDRA**: Down there I’m Old Lis, who trades herbs for salt. Nobody but you sees this face.

## The way down

From the ledge: a shelf cut across the hillside, four flights of stone steps that double back on each other, a path
along the foot of the hill, and then the Long Road to the town's edge: 439 m in all, 142 m of it before
the road (`WAY` in `src/core/opening.js`, `src/core/escort.js`). She leads, about five metres ahead, at your pace. Stop,
and once she's a few steps on she stops, turns round and looks at you; she turns back and goes on when you've come up
to her, or gone past. You keep to a walk on the shelf and the steps; after that, your own pace.

Her lines queue and never overlap, and each waits until you are near her (a call doesn't). Seconds are how long each
stays up: as long as it takes to read.

| Where | Line | Seconds |
|---|---|---|
| The ledge, as the walk starts | This way. Stay close, and mind the edge. | 3.7 |
|  | No door to keep me alive now. One day I’ll die, like everyone else. I’d quite forgotten. | 6.9 |
| Along the shelf | I cut this shelf out of the hill myself. It took ten years. I had the time. | 6 |
| The head of the steps, 26 m | Mind the steps. Two hundred winters of frost, and I only ever mended the ones I tripped on. | 7.1 |
| Partway down them | You don’t say much, do you? Good. The others all made speeches. | 5.2 |
| The road, 142 m | This is the Long Road. Bellmourn is at the bottom, on the far side of those pines. | 6.5 |
|  | That staff is not a walking stick. When something comes at you, point it and let fly. | 6.7 |
|  | And keep your distance. The others had armour. You have a robe. | 5.2 |
| With nothing else to say, above the pines (in turn) | Everything I own is under that rock. I had a very good kettle. | 5.1 |
|  | Don’t look at me like that. It’s the dust. I am not crying. | 4.9 |
|  | It’s a small town. Bells, mud and gossip. By nightfall they’ll all have an opinion of you. | 7 |
| The pines | Stay on the road through the pines. The dead are in there, and they don’t read prophecies. | 7 |
| The dead come up | There, in the trees! They’re coming up! Don’t let them near you! | 5.3 |
|  | Point the staff and burn them! That’s what the fire is for! | 4.9 |
| The second wave | More of them, and children with them. He never lets anyone go. Not even the little ones. | 6.9 |
| The necromancers | Necromancers, out of the trees! Burn them first, or the dead won’t stay down! | 6.1 |
| The last of them down | Well. You’ll do. You’ll do very nicely. | 3.6 |
| Who Velscour was | You’ll want to know why the dead get up and walk. It began as a kindness. | 5.9 |
|  | Velscour was a healer once. He sat up with the dying every night, and held their hands until they went cold. | 8.2 |
|  | Then he lost a little girl he’d sat with nine nights, and decided death was a door he could close. | 7.5 |
|  | So he closed it, and the dead stopped staying dead. When you broke him, it swung open again. | 7.1 |
|  | Now he’s back, and leaning on it. That is why the dead won’t lie still. | 5.7 |
|  | He still calls it mercy. | 2.6 |
| And what he was to her | I know, because I was there. We were to be married in the spring. | 5.3 |
|  | Then I went looking for someone who could stop him, and I found you. | 5.5 |
| Nearing the town (in turn, as there's room) | Now, Bellmourn. Twelve of my forty-three walked in there before you, so they’ve stopped being impressed. | 7.9 |
|  | Bram Kettle keeps the inn, north of the well. He counts them on a slate. You’ll be his thirteenth. | 7.5 |
|  | The cathedral is on the hill past the far end of town. It’s the Dark Lord’s now, and his knight is on the door. | 8.4 |
|  | Three of the twelve went up to fight that knight. Stay off that hill until I say. | 6.4 |
|  | And if you hear the bell at midnight, stay indoors. Nobody living rings it. | 6 |
| Bellmourn in sight | There it is. Bellmourn. Let me do the talking. | 4.1 |
| At the town's edge, after a scream from the far side of it | That came from the cathedral hill. Keep walking. There’s nothing you can do for them yet. | 6.9 |
| You fall behind | This way! Keep up! | 2.2 |
|  | Bellmourn’s down the hill. It won’t come up and fetch you. | 4.9 |
|  | I’m not carrying you, {name}. | 2.9 |
| You run on ahead | Slow down! Some of us just lost a cave. | 3.6 |
|  | {name}! Wait for me! | 2.3 |
| You ride your shield | Oh, we’re riding, are we? Fine. Don’t you dare laugh. | 4.5 |
|  | Two hundred years, and nobody ever showed me this! | 4.3 |
|  | …Again. Later. When nobody’s looking. | 3.5 |

**The fight** (`fight` in `src/sim/opening.js`, `openingRaise` in `src/sim/undead.js`). In the pines, eight of the
dead come up out of the ground, four at a time. When three or fewer are left, six more come up, four of their children
among them. When four or fewer of those are left, a necromancer runs out of the trees on each side of the road; they
raise what has fallen round them. All of them are easy: it is your first fight, and on the road you can't die (you're
knocked flat and come to beside her). She stands with you and throws a weak fire bolt every couple of seconds at
whichever of them is nearest her. The second wave's line and the necromancers' are called over whatever she's saying.
When every one is down she tells you why the dead walk, and you go on to town. (It was fifty of the dead before the
cut: the critics found it went on long past teaching anything.)

## The town's edge — her quest

*At the edge of Bellmourn she stops, and everyone looks at her. Talk to her.*

**LISANDRA**: Stop there a moment. I've a word for you before you go in.

**LISANDRA**: There it is. Forty roofs, one well, and the Dark Lord's cathedral looking down on all of it. You're not ready for that hill. You're not ready for his knight. You're ready for Bellmourn.

**LISANDRA**: Nobody follows a prophecy, {name}. They follow whoever mended their roof. So be useful. Everyone in that town with a trouble worth the name: find them, and take it off their hands. That's how you'll learn what your own can do.

**LISANDRA**: Start with Bram Kettle at the inn. He counts strangers, so let him count you. Then the rest. You'll know them. They're the ones looking at you as if you might be the answer to something.

*You: "I'll find them."*

**LISANDRA**: Good. I'll be here, being stared at. Come back when every one of them has given you something to do.

*The quest: Known in Bellmourn. Find everyone in town with work to give, and take some of it from each.*
