# Bellmourn — City State Phobos : Castle Velscour

Batch 01 / 40 color textures / 10 families with four independently generated variants each.

## Files

- `textures/`: 40 original PNG color textures, each 1254 × 1254 pixels.
- `BROWSE_TEXTURES.html`: offline catalog with 1×–4× ordinary/mirrored repeat preview. Extract the ZIP first, then open this file in a browser.
- `CONTACT_SHEET.jpg`: numbered overview of all 40 textures.
- `CATALOG.csv` and `CATALOG.json`: stable IDs, intended locations, dimensions, filenames, and SHA-256 hashes.
- `GENERATION_PROMPTS.txt`: exact prompts used with the built-in ImageGen tool.
- `VALIDATION_NATIVE.json`: measured edge differences and image checks.

## Resolution and tiling status

The image generator was asked for 2048 × 2048 seamless textures but returned 1254 × 1254 images. These files preserve its native output without resizing or compression loss. They are not native 2K or 4K images.

Ordinary-repeat edge checks found mismatches. These native files are not certified seamless under ordinary Repeat. Mirrored repeat in both axes provides continuous edge colors by reflecting the image at each tile boundary, but can create visible symmetric patterns. The offline viewer exposes both modes so the distinction is reviewable. Edge repair and upscale are pending the user's finishing-method choice.

Use as sRGB color textures. This is a color-only collection, not a complete PBR material library: no normal, roughness, metallic, AO, or height maps are supplied. Generated surface shading is present; the images are not calibrated measured albedo.

## Variants on large walls

A–D are separately generated treatments of each material family, not recolors or identical copies. Course counts, block proportions, and joints can vary. They are not Wang tiles and are not guaranteed to join directly to different variants. Assign variants to separate architectural sections, or use controlled material blending with masks after checking mortar alignment. Do not simply alternate A/B/C/D across a continuous wall expecting their borders to match.

## Family register

| IDs | Family | Intended use |
| --- | --- | --- |
| 001–004 | Bastion basalt | Outer castle defenses |
| 005–008 | Curtain granite | Castle curtain walls |
| 009–012 | City clay brick | Phobos houses and alleys |
| 013–016 | Undercroft blocks | Cellars and lower fortifications |
| 017–020 | Interior limestone | Inner walls and passages |
| 021–024 | Keep dressed stone | Velscour upper walls |
| 025–028 | Rusticated plinth | Gatehouses and monumental bases |
| 029–032 | Courtyard setts | Phobos streets and courtyards |
| 033–036 | Hall flagstones | Great halls and corridors |
| 037–040 | Velscour inlay | Keep floors and noble chambers |

## Future batches

Reserve texture ID 041 onward and family ID 11 onward. This batch already covers running-bond clay brick, basalt/granite/limestone ashlar, damp undercroft blocks, fine dressed keep stone, rustication, setts, modular flagstones, and square diamond-inlay flooring. Useful distinct future families include herringbone brick, rubble masonry, plaster over stone, octagonal flooring, roof slate, carved trim, and dark polished stone. These are suggestions, not completed assets. Preserve this register alongside future batches.

## Provenance and verification

Generated for this request using the built-in ImageGen tool. No external source photographs or texture packs were supplied. This package does not assign a third-party stock license or assert copyright exclusivity.

All 40 native images were decoded and verified as square PNGs, hashes were checked for exact duplicates, and the contact sheet was visually reviewed. Representative 2×2 repeat previews were inspected. Numeric edge differences are diagnostic, not proof of visual seamlessness. No import into Bellmourn or runtime material test has been performed.
