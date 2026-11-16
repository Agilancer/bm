"""Pack the finished textures into the zip (or zips) to hand back.

Usage:  python scripts/pack_return.py finished/
Reads:  finished/<id>.png (or .jpg/.webp), prompts_used.json if you kept one ({id: prompt}), notes.txt if any.
Writes: RETURN_PH2_BATCH_<nn>.zip, or, when everything together would be over 30 MB, several:
        RETURN_PH2_BATCH_<nn>_part1.zip, _part2.zip, ... each under 30 MB. Hand back EVERY part.
          textures/<id>.png        every finished texture, at the size the tool gave (no resizing, no compression)
          CATALOG.json             (part 1) id, name, kind, wrap, file, which part it's in, size, the check's numbers
                                   and warnings, the prompt used
          CONTACT_SHEET.jpg        (part 1) every texture repeated (2x2 for tiles), numbered by its id
          check_report.json        (part 1) from check_textures.py (run again here)
          notes.txt                (part 1) anything you want to tell us (what failed, what you changed)
"""
import json, os, sys, subprocess, zipfile
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
REQ = json.load(open(os.path.join(HERE, '..', 'REQUEST.json'), encoding='utf-8'))
LIMIT = 29_000_000                # each zip stays under this (under 30 MB however a site counts a megabyte)
ROOM = 3_000_000                  # kept free in part 1 for the catalog, contact sheet and notes


def main(folder):
    subprocess.run([sys.executable, os.path.join(HERE, 'check_textures.py'), folder], check=True)
    report = {r['id']: r for r in json.load(open('check_report.json'))}
    prompts = json.load(open('prompts_used.json', encoding='utf-8')) if os.path.exists('prompts_used.json') else {}
    found = {os.path.splitext(f)[0]: f for f in os.listdir(folder) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))}
    base = f"RETURN_PH2_BATCH_{REQ['batch']}"
    for old in os.listdir('.'):
        if old.startswith(base) and old.endswith('.zip'): os.remove(old)

    # Each texture as the PNG that goes in, and which part it lands in (in order, a new part when the next won't fit).
    os.makedirs('_pack', exist_ok=True)
    files, parts, used = [], [[]], ROOM
    for it in REQ['items']:
        f = found.get(it['id'])
        if not f: continue
        tmp = os.path.join('_pack', it['id'] + '.png')
        Image.open(os.path.join(folder, f)).convert('RGB').save(tmp)
        n = os.path.getsize(tmp)
        if used + n > LIMIT and parts[-1]: parts.append([]); used = 0
        parts[-1].append(tmp); used += n
        files.append((it['id'], tmp, len(parts)))
    many = len(parts) > 1
    name = lambda k: f'{base}_part{k}.zip' if many else f'{base}.zip'
    part_of = {i: k for i, _, k in files}

    cat, cells = [], []
    for it in REQ['items']:
        e = {k: it[k] for k in ('id', 'name', 'kind', 'wrap', 'aspect')}
        e['check'] = report.get(it['id'])
        e['prompt_used'] = prompts.get(it['id'], it['prompt'])
        if it['id'] in part_of:
            e['file'] = f"textures/{it['id']}.png"; e['zip'] = name(part_of[it['id']])
            e['size'] = list(Image.open(os.path.join('_pack', it['id'] + '.png')).size)
            pv = os.path.join('previews', it['id'] + '_repeat.jpg')
            cells.append((it['id'], Image.open(pv) if os.path.exists(pv) else Image.open(os.path.join('_pack', it['id'] + '.png'))))
        else:
            e['file'] = None
        cat.append(e)
    if cells:
        cw, n = 360, 5
        sheet = Image.new('RGB', (cw * n, (cw + 24) * ((len(cells) + n - 1) // n)), (20, 20, 20))
        d = ImageDraw.Draw(sheet)
        for k, (i, im) in enumerate(cells):
            im = im.copy(); im.thumbnail((cw - 8, cw - 8))
            x, y = (k % n) * cw, (k // n) * (cw + 24)
            sheet.paste(im, (x + 4, y + 4)); d.text((x + 6, y + cw + 4), i, fill=(230, 230, 230))
        sheet.save('CONTACT_SHEET.jpg', quality=85)

    for k, part in enumerate(parts, 1):
        with zipfile.ZipFile(name(k), 'w', zipfile.ZIP_DEFLATED) as z:
            for tmp in part: z.write(tmp, 'textures/' + os.path.basename(tmp))
            if k == 1:
                z.writestr('CATALOG.json', json.dumps({'batch': REQ['batch'], 'parts': [name(j) for j in range(1, len(parts) + 1)], 'items': cat}, indent=1, ensure_ascii=False))
                z.write('check_report.json')
                if cells: z.write('CONTACT_SHEET.jpg')
                if os.path.exists('notes.txt'): z.write('notes.txt')
        mb = os.path.getsize(name(k)) / 1024 / 1024
        print(f'wrote {name(k)}: {len(part)} textures, {mb:.1f} MB' + ('  (OVER 30 MB: one texture alone is too big; save it as JPEG quality 95)' if os.path.getsize(name(k)) > 30_000_000 else ''))
    for tmp in os.listdir('_pack'): os.remove(os.path.join('_pack', tmp))
    os.rmdir('_pack')
    print(f'{len(files)} of {len(REQ["items"])} textures in {len(parts)} zip(s). Hand back every one.')


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'finished')
