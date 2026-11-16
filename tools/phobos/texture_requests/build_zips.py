"""Build the texture-request zips for ChatGPT, twenty items each (tools/phobos/texture_requests/request_list.py).

python tools/phobos/texture_requests/build_zips.py  ->  art/phobos/texture-requests/PH2_BATCH_<nn>_<slug>.zip
Each zip: README_FOR_CHATGPT.md, STYLE_GUIDE.md, REQUEST.json/.md, scripts/, ref/<id>_match.jpg and _palette.png,
templates/<id>_guide.png. What comes back (RETURN_PH2_BATCH_<nn>.zip) goes through tools/phobos/textures (seamless,
grading, sets) like the earlier batches.
"""
import io, json, os, re, sys, zipfile
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
sys.path.insert(0, os.path.dirname(__file__))
from request_list import BATCHES  # noqa: E402

KIT = os.path.join(os.path.dirname(__file__), 'kit')
OUT = os.path.join(ROOT, 'art', 'phobos', 'texture-requests')
SIZE = {'square': (1024, 1024), 'wide': (1536, 1024), 'tall': (1024, 1536)}

RULES = ('Flat even diffuse light: no sun, no cast shadows, no highlights, no vignette, no darker corners. '
         'Midtone exposure, detail kept in the darks. Photoreal, weathered, dark fantasy, muted palette. '
         'No text, letters, numbers, runes, monograms, watermark, crosses, sunbursts, bells, haloes or holy signs.')


def wrap_of(kind, aspect, key):
    if kind == 'tile': return 'xy'
    if kind == 'strip': return 'x'
    if kind == 'mask':
        return {'railing_mask': 'x', 'dead_ivy': 'x', 'chain_strip': 'y'}.get(key, 'xy')
    return ''


def prompt_for(kind, aspect, metres, desc, palette_words):
    w, h = SIZE[aspect]
    desc = desc[0].upper() + desc[1:]
    if kind == 'tile':
        head = (f'ONE seamless tiling base-color (albedo) texture for a videogame, {w}x{h}. {desc}. The picture shows '
                f'about {metres} m of the real surface across. Orthographic, straight-on, the whole image is the material, '
                f'no perspective, no scene, no border. Seamless: everything continues across opposite edges, left-right '
                f'and top-bottom.')
    elif kind == 'strip':
        head = (f'ONE horizontal architectural band texture for a videogame, {w}x{h}. {desc}. The band fills the whole '
                f'frame from top edge to bottom edge, straight-on, no perspective, and repeats seamlessly left-right '
                f'(the left and right edges continue into each other). About {metres} m of band shown across.')
    elif kind == 'single':
        head = (f'ONE videogame texture of a single object, {w}x{h}. {desc}. Straight-on and orthographic, the object '
                f'fills the frame edge to edge, about {metres} m wide in the world.')
    elif kind == 'mask':
        head = (f'ONE greyscale mask texture for a videogame, {w}x{h}: pure white shapes on a pure black background, no '
                f'colour, no grey background. {desc}. Seamless where it repeats (see wrap), about {metres} m across.')
    else:
        head = (f'ONE greyscale decal texture for a videogame, {w}x{h}: white on pure black, no colour. {desc}. The black '
                f'margin all round must stay empty. About {metres} m across.')
    pal = f' Palette: {palette_words}.' if kind not in ('mask', 'decal') else ''
    return head + pal + ' ' + RULES


def hex2rgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def words(pal):
    # (Plain colour words from the hexes, so the prompt doesn't carry codes the tool might paint as text.)
    out = []
    for h in pal:
        r, g, b = hex2rgb(h); v = (r + g + b) / 765
        tone = 'near-black' if v < 0.1 else 'dark' if v < 0.25 else 'mid' if v < 0.5 else 'pale'
        mx = max(r, g, b); mn = min(r, g, b)
        if mx - mn < 18: hue = 'grey'
        elif r >= g and r >= b: hue = 'red' if g < r * 0.55 else 'brown' if b < g * 0.8 else 'warm grey'
        elif g >= r and g >= b: hue = 'green' if r < g * 0.85 else 'olive'
        else: hue = 'blue-grey' if mx - mn < 50 else 'blue'
        out.append(f'{tone} {hue}')
    return ', '.join(dict.fromkeys(out))


def palette_png(pal):
    im = Image.new('RGB', (len(pal) * 128, 128))
    d = ImageDraw.Draw(im)
    for i, h in enumerate(pal): d.rectangle([i * 128, 0, i * 128 + 127, 127], fill=hex2rgb(h))
    return im


def guide_png(kind, aspect, key):
    w, h = SIZE[aspect]; w //= 4; h //= 4
    im = Image.new('RGB', (w, h), (0, 0, 0)); d = ImageDraw.Draw(im); g = (128, 128, 128)
    if kind == 'strip': d.rectangle([0, 0, w, h], fill=g)
    elif kind == 'decal':
        m = int(min(w, h) * 0.1); d.ellipse([m, m, w - m, h - m], fill=g)
    elif kind == 'single':
        if key.startswith('banner') or key == 'war_banner':
            d.polygon([(0, 0), (w, 0), (w, int(h * 0.82)), (w // 2, h), (0, int(h * 0.82))], fill=g)
        elif key == 'demon_glass':
            import math
            pts = [(0, h), (0, int(h * 0.3))] + [(int(w * (1 - math.cos(t))), int(h * 0.3 - h * 0.3 * math.sin(t))) for t in [k / 20 * math.pi / 3 for k in range(21)]]
            pts += [(int(w * math.cos(t)), int(h * 0.3 - h * 0.3 * math.sin(t))) for t in [math.pi / 3 - k / 20 * math.pi / 3 for k in range(21)]] + [(w, int(h * 0.3)), (w, h)]
            d.polygon(pts, fill=g)
        else: d.rectangle([0, 0, w, h], fill=g)
    else: return None
    return im


def main():
    os.makedirs(OUT, exist_ok=True)
    readme = open(os.path.join(KIT, 'README_FOR_CHATGPT.md'), encoding='utf-8').read()
    style = open(os.path.join(KIT, 'STYLE_GUIDE.md'), encoding='utf-8').read()
    texdirs = [os.path.join(ROOT, 'assets', 'game', 'phobos', 'tex'), os.path.join(ROOT, 'assets', 'game', 'tex')]
    made = []
    for bn, title, items in BATCHES:
        n = 0; reqs = []
        for key, name, kind, aspect, metres, use, pal, ref, desc in items:
            n += 1
            iid = f'ph2_{bn}_{n:02d}_{key}'
            reqs.append({'id': iid, 'key': key, 'name': name, 'kind': kind, 'aspect': aspect, 'size': list(SIZE[aspect]),
                         'wrap': wrap_of(kind, aspect, key), 'metres': metres, 'use': use, 'palette': pal,
                         'match': ref, 'prompt': prompt_for(kind, aspect, metres, desc, words(pal))})
        slug = re.sub(r'[^a-z0-9]+', '_', title.lower()).strip('_')
        path = os.path.join(OUT, f'PH2_BATCH_{bn}_{slug}.zip')
        with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
            z.writestr('README_FOR_CHATGPT.md', readme.replace('{BATCH}', bn).replace('{NBATCH}', str(len(BATCHES))).replace('{TITLE}', title).replace('{N}', str(len(reqs))))
            z.writestr('STYLE_GUIDE.md', style)
            z.writestr('REQUEST.json', json.dumps({'batch': bn, 'title': title, 'items': reqs}, indent=1, ensure_ascii=False))
            md = [f'# Batch {bn}: {title}\n', '| # | id | name | kind | aspect | wrap | m | where it goes |', '|---|---|---|---|---|---|---|---|']
            for k, r in enumerate(reqs, 1): md.append(f"| {k} | `{r['id']}` | {r['name']} | {r['kind']} | {r['aspect']} | {r['wrap'] or 'none'} | {r['metres']} | {r['use']} |")
            md.append('\n## Prompts\n')
            for r in reqs: md.append(f"**{r['id']}**: {r['prompt']}\n")
            z.writestr('REQUEST.md', '\n'.join(md))
            for s in ('check_textures.py', 'make_tileable.py', 'pack_return.py'): z.write(os.path.join(KIT, s), f'scripts/{s}')
            for r in reqs:
                b = io.BytesIO(); palette_png(r['palette']).save(b, 'PNG'); z.writestr(f"ref/{r['id']}_palette.png", b.getvalue())
                if r['match']:
                    name = 'roof_4' if r['match'] == 'roof' else r['match']
                    src = next((os.path.join(t, name + '_c.webp') for t in texdirs if os.path.exists(os.path.join(t, name + '_c.webp'))), None)
                    if src:
                        im = Image.open(src).convert('RGB'); im.thumbnail((512, 512))
                        b = io.BytesIO(); im.save(b, 'JPEG', quality=88); z.writestr(f"ref/{r['id']}_match.jpg", b.getvalue())
                    else:
                        print('no ref for', r['id'], r['match']); r['match'] = None
                gi = guide_png(r['kind'], r['aspect'], r['key'])
                if gi:
                    b = io.BytesIO(); gi.save(b, 'PNG'); z.writestr(f"templates/{r['id']}_guide.png", b.getvalue())
        made.append((path, len(reqs)))
        print(os.path.relpath(path, ROOT), len(reqs), f'{os.path.getsize(path) // 1024} KB')
    # The owner's side: how to feed them in.
    open(os.path.join(OUT, 'HOW_TO_USE.md'), 'w', encoding='utf-8').write(HOW)


HOW = """# Texture requests for ChatGPT (City State Phobos and Castle Velscour)

Five zips of twenty textures each, 100 in all. For each zip:

1. Start a new ChatGPT chat (one that can run code and make images), upload the zip, and paste:

   > Unzip this and read README_FOR_CHATGPT.md, then do everything it says for every item, one image per item.
   > Work through all twenty without stopping to ask me, and hand back the RETURN zip at the end.

2. If it stops part-way (out of generations or time), say "carry on from where you stopped", or ask it to pack what it
   has with `scripts/pack_return.py`.
3. Download `RETURN_PH2_BATCH_<nn>.zip` and give it to Claude (drop it anywhere and say where). If it came back in
   parts (`_part1.zip`, `_part2.zip`, ...: no zip is over 30 MB), download every part.

Claude then makes them repeat cleanly, grades them to their district, builds the normal and roughness maps, and puts
them on the city, the castle and the Keep.

| Zip | What's in it |
|---|---|
| PH2_BATCH_01 | Iron, gates, bones and streets: bars, rivets, rust, studded gates, a bone wall, copings, arch stones, setts, ash streets, wharf decks, moat water |
| PH2_BATCH_02 | Roofs, timber, doors and windows: slate, lead, blood-red tiles, burnt roofs, copper, planks, char, three doors, shutters, leaded glass by day and lit at night, awnings |
| PH2_BATCH_03 | Velscour's liveries, cloth and interiors: five livery banners and his war banner, two tapestries, thorn brocade, lacquer panelling, oxblood marble, checker floor, books, jars |
| PH2_BATCH_04 | Castle Velscour, the Keep and the crag: curtain granite, the Keep's bone-netted basalt, skull courses, demon friezes, corbels, cliffs, scree, spire roofs, bloodstone, obsidian, his stained glass |
| PH2_BATCH_05 | Grime overlays and decals: soot, damp, moss, blood, rust streaks, cracks, lichen, ash, cobwebs, gouges, scorch, puddles, dead ivy, rags, straw, bones, litter, wax, chain |
"""

if __name__ == '__main__':
    main()
