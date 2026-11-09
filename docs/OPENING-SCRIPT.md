# Bellmourn : Velscour's Throne — the opening, draft 3 (final)

Both critics approved this draft in round 3, 9 / 10 each. Their last small fixes are in, listed at the end.

## The logic in eight sentences

1. Three thousand years ago Tessariel broke Velscour on his throne, and swore to come back if he ever rose. Lisandra held Tessariel's lantern that night; before that, she had been Velscour's.
2. She keeps the door Tessariel is meant to come back through. The door keeps her alive while she keeps it. It doesn't keep her young: in the dark she is every one of her years, and only in the sun is she the girl she was.
3. The door stood dark from the night the sky burned until a season ago. Then it woke, and it has been dropping ordinary people across the land ever since: forty-three of them.
4. She meets each one wearing her old face, snaps, lights the candles, and the charm takes: she tells them they are Tessariel and sends them out in Tessariel's colours, so Velscour will chase forty-three Tessariels and never find the real one.
5. You are the first the door has put in her own circle, and the first the charm can't touch. The old songs give one pair of eyes that no glamour fools. So you are Tessariel, and the songs say you only come back when the dark is at its worst.
6. And you came through with fire in your hands. Nobody has been born with magic since Velscour drank every spark in the world to live through his defeat. Every spark you throw is one he has lost, and he will feel it, and squeeze.
7. He was a healer who couldn't bear to lose anyone, so he shut the door of death. When Tessariel broke him it swung open; now he's back and leaning on it, which is why the dead here won't lie still. (Told on the road, after your first fight with the dead.)
8. The door was only ever waiting for you. Once you're through, it lets go and falls in, and she has to come down to Bellmourn with you, where she has always been Old Lis.

Her looks, as the engine already shows them (`prettyShown`), follow one rule: **to your eyes she is what the light makes her.** In the dark cave, and in town at night, you see the old woman. In the sun, on the road and in town by day, you see the girl. The townsfolk see only her glamours: the crone they call Old Lis by day, and now and then a beautiful stranger by night. The clock is held at morning from WAKE to ARRIVED, so the sun is always up when she says it is.

## Two things for the owner to decide

1. **The true running time.** The cave is **3,106 spoken characters**, about **4:40 to 5:00 of speech** at her measured pace. With the silences and moves written below, it is **about 5:40 to 6:00 to the name prompt**. Both critics timed her recorded clips (the old voice speaks about 11.8 characters a second on long lines and slower on short ones; the young about 13). Draft 2 claimed 4:40 because it was timed at the subtitle cap; measured the same way it was really about 6:30. You can look round her cave the whole time from beat 4, you throw a spark in beat 8, and hold-to-skip stays. The full table is at the end.
2. **The decoys.** In beat 8 she says: *"I sent them all out in your colours, so he'd chase forty-three Tessariels and never find you."* This is why she lied to the others. It also means all 43 AI heroes, and the three who died on the hill, were bait she sent out. Their own script was written without it. If you'd rather not, the line can go, and beat 8 still works.

## Voices, names, recording

- Two voices, as now: **young** (Lisandra) while you see her lovely, **old** (LisandraWitch) from the flash to the collapse.
- Say: Tessariel = **Tess-are-ee-ell**. Velscour = **Vel-scower**. Eldravayne = **El-dra-vane**. Bellmourn = **Bell-morn**. (`tools/voice/say.json` still respells Tessariel "Tessa-ree-ell" and is fixed before any recording.)
- Recording, so the voice is the same woman in every line:
  1. Design each voice once, and approve one reference clip of it.
  2. Clone every take from that clip (Qwen3-TTS's clone model), with the same seed. Nothing is described afresh.
  3. Takes are cut by **intensity**, not by beat: a run of lines in one register is one take, read straight through as a paragraph. Beat 9 is three takes (the grim open, the climb to the shout, the hush). The collapse is three (panic, the shout, the understanding). "WHAT HAVE YOU DONE?!" is its own take, checked for pitch against the lines either side.
  4. Several takes of each; the best chosen by pitch and pace; then cut into lines at the sentence breaks.
- Subtitles: no line on screen runs past about 90 characters. Longer lines split at a sentence break, or at a comma where there is none. Capitals and "?!" stay in the subtitle; the voice model gets the plain words.

## WAKE — the cave

The times on each beat are worked out at her measured pace, with the silences and moves added; the table at the end shows the sums. The free look widens from about 0.25 rad to about 0.8 rad from beat 4 to beat 9, so you can look round her cave while she talks, and eases back to her on the lines marked ●.

### 1 · The glamour (0:00 – 0:14, young voice)

*Black. The door's hum. Violet light from the portal behind you. She comes toward you out of the dark from the far side of the cave, lovely, in leathers, her hand held out. Your sight is hazed: you are still waking. By the last line she is about two metres away.*

**LISANDRA** *(heard before she's seen)*: …by the light that does not set… cross over. Come home.

**LISANDRA**: Shh. Little star. There you are.

**LISANDRA** *(softer and softer)*: Let me be the first beautiful thing you—

*The flash. Your eyes clear, and the glamour goes out like a struck lamp: an old woman in a gown and shawl is standing where the girl was, her hand still out.*

### 2 · Seen (0:14 – 0:26)

*She snatches the hand back and recoils two steps (!!).*

**LISANDRA**: …Oh.

*She steps in again, slowly, and passes her palm across your eyes, a hand's breadth from them. You blink.*

**LISANDRA**: You can see me.

**LISANDRA**: Not the pretty one. Me.

*Her hands drop. (sweat)*

**LISANDRA**: Oh, no.

### 3 · The snap (0:26 – 1:11)

*She backs away from you, four or five steps, into her clutter, working her fingers as she goes, fists opening and closing, the way an old woman loosens cold hands. Among the crates she raises the right one at you.*

**LISANDRA**: Hold still. It doesn't hurt. It never hurts.

*SNAP. The door's hum cuts dead. A breath of silence. Then the candles catch, forty-four of them, in a wave that rolls out from her hand, across the cave and past you.*

*She comes back to you through her clutter, watching your eyes the whole way, stops close, leans in, and waits.*

**LISANDRA** ●: There's meant to be a look now. Soft. Grateful. Like a calf at a gate.

**LISANDRA**: Not you. You're still in there, looking back.

*She turns her head to the lectern by the tunnel: her ledger, a page of names, every one struck through. The first candle to catch hangs over it.*

**LISANDRA**: Forty-three before you. Every one got the snap, the lights, and a pretty girl telling them who they were.

**LISANDRA**: And every one of them believed it. I made sure.

*She turns back to you, and leans in a little more. (?)*

**LISANDRA**: I won't have to make you believe anything. Will I.

### 4 · Why she's afraid (1:11 – 2:07)

*She steps back and folds her arms tight, as people hold themselves in the cold.*

**LISANDRA**: Nobody has ever seen through that face.

*One hand comes out of the fold. She turns it over and looks at it.*

**LISANDRA**: Kings have kissed this hand and called it soft.

*She looks up at you.*

**LISANDRA**: The face held while your eyes were still waking.

**LISANDRA**: The old songs give one pair of eyes that no glamour fools. The light that does not set.

**LISANDRA**: That door was dark from the night the sky burned. It woke a season ago.

*She looks down at the candle ring round your feet.*

**LISANDRA**: It drops the others in a ditch somewhere. Or a pigsty. It put you in my circle.

**LISANDRA**: You're not some poor farmer I dressed up in a prophecy.

*She grips her own arms tighter. A tremble runs through her. (sweat)*

**LISANDRA** ●: And the songs say you only come back when the dark is at its worst. Not a day before.

**LISANDRA**: And you see everything as it is. Me included.

### 5 · Who you are (2:07 – 2:35)

*She walks a slow half circle round you, so the candles turn behind her and the camera turns with her. It ends with her standing between you and the door: for the first time you see the door you came through, violet behind her.*

**LISANDRA**: Three thousand years ago, you walked out of the sunrise and broke Velscour on his own throne.

**LISANDRA**: You swore that if he ever rose again, you'd come back.

**LISANDRA**: He rose. Slowly.

**LISANDRA** ●: And here you are. You kept your word.

**LISANDRA** ●: Tessariel.

*On the name, the door's hum comes back for one breath, the portal swells behind her, and every candle flame leans toward you at once. Then the hum is gone again.*

### 6 · Who she is (2:35 – 3:13)

*Her hand goes to her heart, and she makes a slow, stiff bow. Her name comes up on screen.*

**LISANDRA**: I'm Lisandra. You won't remember me.

**LISANDRA**: I held your lantern on the last night of the war, the night the sky burned.

*Her hand goes to her cheek.*

**LISANDRA**: The girl you saw was me. That was my face, the last time you saw it.

*She sets off across the cave toward the crate by the wall, talking as she goes, and the free look follows her.*

**LISANDRA**: The door keeps me alive while I keep it. It never promised to keep me young.

**LISANDRA**: Down here, out of the sun, the dark keeps count.

*At the crate, a dry flick of her fingers back at the empty air where the girl stood.*

**LISANDRA**: And nobody follows a crone into a war. So I wear the girl.

### 7 · Velscour (3:13 – 3:40)

*She lowers herself onto the crate, an old woman's sit (Sitting_Enter), hands on her knees, looking past you.*

**LISANDRA**: Before I carried your lantern, I was his.

**LISANDRA**: Velscour's.

*She looks up at the floating candles, lifts a hand and gives a soft snap. The candle nearest her flares.*

**LISANDRA**: He taught me the snap. Every candle in a winter market, all lit at once, just to make me laugh.

*She holds one of her hands in the other.*

**LISANDRA**: He was a healer, once.

*A beat. She gets up (Sitting_Exit).*

**LISANDRA**: The horns came later.

### 8 · The magic (3:40 – 4:37)

*She takes two steps toward you from the crate and stops, staring at your hands. The view tips down, and for the first time you see your right hand: the fire staff in it, and embers crawling over your knuckles on their own. On screen: your cast key on PC, or the cast button on a phone. Press it, and a spark leaps from the staff, the nearest candle bursts into a gout of flame, and the view comes back up to her as she flinches (!!). If you don't press it within about four seconds, the spark goes on its own.*

**LISANDRA**: And then there's that.

**LISANDRA**: I gave them swords, spears, bows. One asked for a lute. One asked for a boomerang, and I still don't know why.

**LISANDRA**: I sent them all out in your colours, so he'd chase forty-three Tessariels and never find you.

**LISANDRA** ●: Not one of them came through with fire in their hands.

**LISANDRA**: Nobody's been born with magic since you broke him. He drank every spark to live.

*She looks at her own snapping hand.*

**LISANDRA**: All but a few old tricks, like mine.

*She looks back at yours.*

**LISANDRA**: Every spark you throw is one he's lost. He'll know it, on his throne.

**LISANDRA**: A thing like him doesn't feel its grip slip and let go. It squeezes.

### 9 · How bad it gets (4:37 – 5:27)

*Take one, grim and slow. She stands still and looks down the tunnel toward the world.*

**LISANDRA**: Mothers will hide their children in root cellars, and the cellars won't be deep enough.

*Take two. She starts pacing, and it runs away with her: arms going, pointing out down the tunnel. Each line is shorter and faster than the last. The candles gutter as her voice climbs, and dust sifts from the roof.*

**LISANDRA**: His bell already rings at midnight with no hand on the rope. Soon it'll ring at noon.

**LISANDRA**: His knights will stop guarding doors, and start kicking them in.

**LISANDRA**: Three heads in his Rift, and all of them hungry.

**LISANDRA**: The dead will come up under Bellmourn.

**LISANDRA**: They won't wait for dark.

**LISANDRA** *(shouting, panic)*: And he'll send it all after you! Every knight! Every dead thing! Every—

*Take three. She stops dead. The candles steady. The dust settles. (gloom)*

**LISANDRA** *(quietly)*: …I'm doing it again.

**LISANDRA**: Three thousand years, and nobody to say it to.

### 10 · The name (5:27 – 5:51)

*She straightens up.*

**LISANDRA**: So. The real one. Of all the times to get it right.

**LISANDRA**: Go down to Bellmourn. Learn what those hands can do. And then finish him.

**LISANDRA**: I can't come with you. Somebody has to mind the door.

*Only now does she hold out her hand to you: the old hand, where the young one was held out at the start.*

**LISANDRA** ●: Your name. The one you were born with. The others, I named.

*The name prompt.*

## NAME — while the prompt waits

**LISANDRA** *(at 10 s)*: It's your own name.

**LISANDRA** *(at 20 s)*: You've had it all your life.

**LISANDRA** *(at 32 s)*: Take your time. The door won't.

## HERD — she takes the name and sends you out

*She takes the name where she stands.*

**LISANDRA**: {name}. *(on screen only; the name can't be recorded)*

**LISANDRA**: Lovely.

**LISANDRA** *(pointing down the tunnel)*: Out's through there.

**LISANDRA**: Go on. And stop looking at me. I know what you see.

*She goes ahead of you to the lectern by the tunnel. When you pass it she is writing your name into the ledger, under the struck-through names, and you can stop and read the page.*

**LISANDRA** *(as you pass)*: I'll see you as far as the ledge. Then I've a door to mind.

*She follows a few steps behind you, and is still in the tunnel mouth when you reach the ledge.*

## COLLAPSE — the ledge, the cave-in

*You step out onto the ledge, into the morning sun. Behind you the door gives way with a sound like a held breath let go, and the tunnel falls in. She comes out of the dust on her knees, into the sunlight, and to you she's the girl again (young voice from here).*

*Take one, panic.*

**LISANDRA**: No. No, no, no.

*Take two, the shout.*

**LISANDRA** *(shouting)*: WHAT HAVE YOU DONE?!

*Take three, understanding.*

**LISANDRA**: Three thousand years I held that door open. You walk through it once, and it lets go.

**LISANDRA** *(quiet)*: It was only ever waiting for you.

*She looks up at you. (?)*

**LISANDRA**: …Why are you looking at me like that?

*She looks down at her own hands, in the sun, and turns them over: the same move as in the cave.*

**LISANDRA**: …Oh. The sun's up.

**LISANDRA** *(sweat)*: No. Don't answer that.

*She gets up and brushes off the dust.*

**LISANDRA** *(under her breath)*: I seem to have lost my home.

**LISANDRA**: Bellmourn, then. You're taking me there, {name}.

**LISANDRA**: Somebody has to get you down this road alive.

**LISANDRA**: Down there I'm Old Lis. Old Lis is what they'll see.

## In the cave on the way out, and on the road down

The road from the ledge to Bellmourn is 415 m (`src/sim/opening.js`). The pines start at 139 m, the dead come out of them at 173 m, and Bellmourn comes in sight at 345 m. You walk at 5.6 m/s and sprint at 8.6. She keeps a few steps behind you, in her young voice now, in the sun.

**The rule:** her lines queue and never overlap, and each one waits until you are near her. While she tells the healer story and the wedding (about 40 s), your pace is capped to hers, about 3 m/s (`sim.paceCap`, as in the cave). "There it is", the town's scream and ARRIVED all wait until the queue is empty.

| Where | Line | Seconds |
|---|---|---|
| You turn back toward the door | Out! / OUT. | |
| In the tunnel, the door straining | Hold. Please hold. Not now… | |
| The ledge, as the walk starts | No door to keep me now. One day I'll die, like everyone else. I'd quite forgotten. | 6.1 |
| The bend, 46 m | The others would be making a speech by now. Every one of them. | 4.6 |
| After the bend | He used to laugh at his own jokes. Velscour. Before he'd finished telling them. I laughed too. Every time. | 7.8 |
| The pines, 139 m | Stay on the road. The dead in those pines don't read prophecies. | 4.8 |
| After the fight, 173 m on | …You'll do. | 1.0 |
| … | Velscour sat up with the dying every night, and held their hands until they went cold. | 6.4 |
| … | Then he lost a little girl he'd sat with nine nights, and decided death was a door he could close. | 7.3 |
| … | So he closed it. When you broke him, it swung open. | 3.8 |
| … | Now he's leaning on it again. That's why the dead here won't lie still. | 5.3 |
| … | He calls it mercy. | 1.7 |
| … | We were to be married in the spring. The little girl died that winter. There was no spring. | 6.8 |
| The last stretch | He named a star for me once. I can't find it anymore. I think he took it back. | 5.8 |
| Bellmourn in sight, 345 m | There it is. Let me do the talking. | 3.3 |
| You run ahead | Slow down! Some of us just lost a cave. | |
| You're far ahead | {name}! Wait! | |

**The sums** (her young voice at about 13 characters a second, 1 to 1.5 s between lines):
- **Ledge to the pines, 139 m:** 25 s at a walk, 16 s at a sprint. "No door…", the bend line and the jokes take about 21 s with the gaps, and end by 120 m at a walk, so the pines warning comes on time. At a sprint the queue still clears by about 137 m.
- **The fight to the end, 242 m:** "…You'll do.", the five healer lines and the wedding take about 32 s of speech and 40 s with the gaps. At the capped 3 m/s that is about 120 m, so the run ends at about 300 m. The star then has 45 m of walking (8 s) for its 5.8 s, and the sight line plays at 345 m.
- If there is no fight with the dead (they are all dead already, or you went round), the healer run starts as you leave the pines.
- The star was moved to the end: it no longer fits before the pines, and after the wedding it is the last thing she says about him before the town.

## What this asks of the game (after the words are approved)

- **Timing.** WAKE runs about 5:40 to 6:00 instead of 41 s, so every time in `opening-script.js` and her moves in `src/sim/opening.js` are re-laid from the real takes.
- **Her moves.**
  - Beat 1: she walks in from `WITCH_MARK` (about 9 m off) and is about 2 m away by the flash.
  - Beat 2: the recoil; the palm passes a hand's breadth (15–20 cm) from the camera, checked against the near plane before anyone animates it; your lids close once as it passes (`lidsAt` already exists).
  - Beat 3: she backs four or five steps into the clutter, fists working, and snaps from there; the walk back and the lean; the look to the ledger.
  - Beat 4: arms folded, a hand turned over, the look up, the look to the circle, the tremble.
  - Beat 5: the half circle to the door.
  - Beat 6: hand to heart and bow, hand to cheek, the walk to the crate at s 12.2 (about 5 m) over the last two lines, the finger flick.
  - Beat 7: the sit and its beats, the soft snap, the stand. The crate is 0.64 m tall: check it against the sitting clip's seat height, and use a lower crate if it doesn't fit.
  - Beat 8: two steps toward you from the crate, the stare at your hands, the flinch, the look to her own hand and back to yours.
  - Beat 9: the still look down the tunnel, pacing and pointing, the stop.
  - Beat 10: the old hand offered.
  - HERD: she takes the name where she stands, goes ahead to the lectern and writes as you pass, then follows a few steps back and stays in the tunnel mouth.
- **The clock** is held at morning from WAKE until ARRIVED.
- **The free look** widens in beats 4 to 9 and eases back on the ● lines.
- **The reveal**: the hum's one breath back, the portal swelling, the candle flames leaning toward you.
- **Beat 7**: one candle flares on her soft snap.
- **Beat 8**: the view tips down and only your right hand is drawn, the fire staff with embers on the knuckles (the kite shield on the left stays out of frame). The cast prompt names the player's real key binding on PC; on a phone the touch cast button is shown for this beat, since the cinematic hides the HUD. Then the spark, the bursting candle, the view back up, and her flinch with the !! mark. The spark goes on its own after about four seconds.
- **Beat 9**: the candles gutter and dust sifts from the roof as she climbs; both stop when she stops.
- **The ledger page**: every name struck through, and readable up close in HERD.
- **Her name panel** moves from the collapse to "I'm Lisandra".
- **The road cues** in the order above. They queue and never overlap, and each waits until you are near her. Your pace is capped to hers (about 3 m/s) for the healer run and the wedding. The sight line, the scream and ARRIVED wait until the queue is empty.
- **Subtitles** over 90 characters split at a sentence break or a comma.
- **The heroes' bark** "No lantern, no fire. Just her. Bright enough." (origin_story) changes to "One snap, and candles everywhere. And her, brighter than all of them.", since the owner asked for the snap and the lights to stay part of how she charms them.
- **`tools/voice/say.json`**: Tessariel → Tess-are-ee-ell.
- Hold-to-skip stays; the scene never replays when a save is restored.
- Every line re-recorded as above.

## Running time, worked out

This table works the old voice at 11.8 characters a second on lines of 40 characters or more and 9.9 on shorter lines, the young at 13, with 0.4 s between lines, plus the silences and moves each beat's directions ask for. The veteran timed the shipped clips again: short lines run nearer 7.9 characters a second, and played back to back with each clip's own lead-in as the gap, the cave comes to 5:39; with 0.4 s more between lines, 6:03. So: about 5:40 to 6:00.

| Beat | Characters | Speech | Silences and moves | Beat | Runs |
|---|---|---|---|---|---|
| 1 · The glamour | 127 | 11.0 s | 3 s | 14.0 s | 0:00 – 0:14 |
| 2 · Seen | 49 | 6.5 s | 5 s | 11.5 s | 0:14 – 0:26 |
| 3 · The snap | 361 | 33.0 s | 12.5 s | 45.5 s | 0:26 – 1:11 |
| 4 · Why she's afraid | 556 | 51.4 s | 5 s | 56.4 s | 1:11 – 2:07 |
| 5 · Who you are | 210 | 20.8 s | 7 s | 27.8 s | 2:07 – 2:35 |
| 6 · Who she is | 361 | 33.6 s | 4.5 s | 38.1 s | 2:35 – 3:13 |
| 7 · Velscour | 190 | 19.0 s | 8 s | 27.0 s | 3:13 – 3:40 |
| 8 · The magic | 532 | 49.2 s | 8 s | 57.2 s | 3:40 – 4:37 |
| 9 · How bad it gets | 484 | 46.0 s | 3.5 s | 49.5 s | 4:37 – 5:27 |
| 10 · The name | 236 | 21.6 s | 2.5 s | 24.1 s | 5:27 – 5:51 |
| **Total** | **3106** | **4:52** | **0:59** | **5:51** | to the name prompt |

The silences: beat 1 the black and the flash; 2 the recoil, the palm and the blink; 3 backing off, the snap, the breath, the wave, the walk back and the lean; 4 the arms, the hand, the looks and the tremble; 5 the half circle and the door's breath; 6 the bow, the cheek and the end of the walk; 7 the sit, the soft snap, the hands and the stand; 8 her two steps from the crate, the hands shot, about 2.5 s of waiting for the cast, the spark and the flinch; 9 the look down the tunnel and the stop; 10 the hand held out.

## Round 3: the verdicts, and the last fixes

- **The veteran: APPROVE, 9 / 10**, on one condition, which changed no words: the road lines didn't fit the road. They are re-ordered above, with the queue rule, the capped pace and the sums. He also re-timed the clips: tell the owner about 5:40 to 6:00, not 5:20 to 5:50. Done, at the top.
- **The young critic: APPROVE, 9 / 10.** Two one-word must-fixes and one should-fix:
  - The road's healer story began with an unnamed "he", minutes after Velscour was last named, right after a fight. It now begins "Velscour sat up with the dying every night…".
  - "Get you down this mountain alive": in the game the mountain is the Sorrowhorn, a named place far off. Now "get you down this road alive".
  - Beat 7's "Velscour. Before the horns." stepped on "The horns came later." It is now "Velscour's."
- **The veteran's nits:** "feel" was still said in two lines running in beat 8; the first is now "He'll know it, on his throne." The crate's height goes on the build list. In beat 8 she takes two steps toward you from the crate, and those seconds are in the table.

## What changed from draft 2, critic by critic

| Note | Fix |
|---|---|
| Running time (veteran MF1; young S1) | True times, worked out at her measured pace, in the header, on every beat and in the table above. The cave is cut from 3,551 to 3,106 characters: about 5:40 to 6:00 to the name prompt, against draft 2's real 6:30 or so. The overlapping beat times and the 4:15/4:40 mismatch are gone. |
| The healer lines (veteran MF1) | Moved to the road, after your first fight with the dead, in her young voice. The cave keeps "Before I carried your lantern, I was his." / "Velscour's." / the winter-market snap / "He was a healer, once." / "The horns came later." |
| "Keep you alive long enough to finish him" (veteran MF2) | "Somebody has to get you down this road alive." The game shows her doing it (`fellT`). ("Mountain" in round 3; the young critic pointed out that the mountain is the Sorrowhorn, far off.) |
| The missing hinge (young S3) | "So he closed it. When you broke him, it swung open." on the road, and "the dead here" (veteran N1). |
| Beat 8's order (veteran S1; young S2) | The decoys now sit with the other forty-three. The magic runs straight into the squeeze: "Every spark you throw is one he's lost. He'll know it, on his throne." That ties it to the spark the player just threw and gives "grip" something to hold. "Feel" is no longer said twice in a row. |
| Beat 9's climb (veteran S2; young S4) | "Winter will come early" is cut. The climb really shortens, in characters: the bell 85, the knights 64, "Three heads in his Rift, and all of them hungry." 48, "The dead will come up under Bellmourn." 38, "They won't wait for dark." 25, then the shout in bursts: "And he'll send it all after you! Every knight! Every dead thing! Every—". "The dead" has its verb back. |
| "It held on you…" (veteran S3) | "Kings have kissed this hand…" is on the hand look; she looks up for "The face held while your eyes were still waking." |
| Where she stands (veteran S4; young S7) | About 2 m off at the flash; she backs four or five steps into her clutter and snaps from there, so the wave rolls across the cave and past you; then she comes back through it. |
| "An inch" (veteran S5) | A hand's breadth, checked in the camera. |
| The clock (veteran S6) | Held at morning from WAKE to ARRIVED. |
| Road line 4 (veteran S7) | "No door to keep me now. One day I'll die, like everyone else. I'd quite forgotten." |
| The walk to the chest (veteran S8; young S5) | She sits on the nearer crate (s 12.2, about 5 m), and walks there over "The door keeps me alive…" and "Down here, out of the sun…". |
| The cast prompt (veteran S9; young S10) | The real key on PC, the touch button on phones, only the right hand framed. |
| HERD and the lectern (young S6; veteran N7) | She speaks where she stands; you pass her writing at the lectern; she stays in the tunnel mouth. |
| Road line 2 (young S8; veteran N5) | "We were to be married in the spring. The little girl died that winter. There was no spring." |
| say.json (young S9) | In the build list. |
| The !! mark (veteran N3; young S10) | On her flinch as the view comes back up. |
| The decoys (young S11) | Put in front of the owner at the top. |
| "The prophecy was about" (young S1) | Cut; "You're not some poor farmer I dressed up in a prophecy." stays. |
| Beat 10 (veteran MF1) | "So. The real one. Of all the times to get it right." "Quickly, before the door changes its mind." is cut; the name prompt's "Take your time. The door won't." carries the hurry. |
| Other trims | "The girl you saw was me." (was "…when you woke…"). "A thing like him doesn't feel its grip slip…" (no "And"). |
| V and T (veteran N2) | "Before I carried your lantern, I was his." / "Velscour's." The lantern and the name are in separate lines. |
| Long subtitles (veteran N4; young nit) | Split at a sentence break or a comma, in the build list. |
| The change table (young nit) | Draft 2's misquotes are gone; every quote in this table is copied from the beats. |
| The hero bark (young nit) | In the build list, with a new line. |
| The ledger (veteran N6) | Every name struck through. |
