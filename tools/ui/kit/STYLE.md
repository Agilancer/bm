# Bellmourn's interface: the art style lock

Everything in this kit is one set. The block below is the lock: it goes, word for word, at the top of every request to
the image tool (the prompts in `PROMPTS.md` already carry it). Don't shorten it, reword it or "improve" it between
sheets. If a sheet comes out in a different style from the ones before it, the fix is to make that sheet again with the
lock and `reference/style_anchors.png`, not to change the lock.

```
BELLMOURN INTERFACE STYLE LOCK, version 1. The same for every picture in this set.

MEDIUM: hand-painted dark-fantasy game interface art, in the manner of a gothic action role-playing game of the late 1990s
and 2000s. Painterly and a little gritty, with visible brushwork and small nicks and wear. Not vector art, not flat design,
not glossy mobile-game plastic, not pixel art, not a 3D render, not a photograph.

MATERIALS, and only these: blackened wrought iron; aged bronze-gold worked in fine filigree with a beaded inner edge;
small round cabochon garnets, deep red, used sparingly as studs; old bone and ivory; dark oiled leather; cream parchment.

COLOURS (hex): night ground #0b0907; iron #14100b, where lit #3a3024; bronze-gold #c9a35c, its highlights #f1d68a, its
shadows #8c7344; bone #e9dfc9; garnet #8e1a12, where lit #d23a22; parchment #ecdfc2. Magic takes its school's colour and
nothing else: fire #ff9a3c, ice #8fd4ff, earth #d8b184, arcane #d27bff, lightning #a79bff, light #ffd98a. Keep everything
else low in saturation: the gold, the garnets and the magic are the only strong colour.

LIGHT: one soft warm light from the upper left, a faint cool rim on the lower right. Shading stays on the object: no
long cast shadows, no glow or haze spreading away from it.

FORM: bold silhouettes that read when the picture is shrunk to the size of a fingernail (32 pixels). A dark outline two
or three pixels wide round every object. Moderate detail: a few strong shapes, not many small ones. Frames, buttons,
plates and bars are seen exactly straight on, with no tilt and no perspective. Objects on icons are seen like items in a
game's inventory: slightly from above, three-quarter view, each on its own with nothing else in the picture.

BACKGROUND: completely transparent, a true alpha channel, with nothing at all behind the art: no ground, no shadow
blob, no vignette, no frame, and never a grey-and-white checkerboard painted in to look like transparency. Only if true
transparency is impossible, use one flat pure green, #00ff00, everywhere behind the art instead, with no gradient.

NEVER: letters, numbers, words, runes or marks that read as letters, monograms, signatures, watermarks, logos. Never the
letter V or the letter T, or a shape that reads as one, on anything. No upright crosses, pentagrams, horned or demonic
skulls used as a badge, winged or haloed figures, or any heraldry or emblem of a real or invented faith or house. No extra objects that
weren't asked for. Nothing cut off by the edge of its space.

ONE SET: the same iron, the same gold, the same garnets, the same brush and the same outline weight as the attached
reference picture of the game's existing button and skull. If in doubt, plainer.
```

## Why each part is there

- **The letters V and T.** In Bellmourn V is Velscour, the demon lord, and T is Tessariel, who stands against him. The two
  are never shown together, and the interface belongs to neither: its frames and buttons sit over both sides' places. So
  nothing in this kit carries either letter, or any badge that could be taken for one side's mark. The plain human skull
  in `icons_slots` is an object the player carries, not a badge: keep it plain.
- **Transparent backgrounds.** The game lays these pieces over a moving 3D picture. Anything left behind a piece shows.
- **Straight on.** The game stretches frames, plates and bars to many sizes. A tilted or uneven one smears.
- **Reads at 32 pixels.** On a phone an icon is about 7 mm across. Fine detail turns to mud; a strong outline survives.
