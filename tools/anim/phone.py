# The gait viewer (anim.html) as a folder that can be hosted anywhere and opened on a phone: tools/build/phone.
#   python tools/anim/phone.py        (needs npx esbuild and Pillow)
# The page's script and the game code it runs are bundled into app.js; the files it loads are copied beside it at the
# paths it asks for. Lisandra's two files are 25 and 32 MB as the game has them, so the copies here have their pictures
# shrunk to 1024 and only the clips the walker uses (the copies only: nothing in assets/ is touched; her mesh, skin and clips are the same bytes).
import io, json, os, re, shutil, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import write as W
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'tools', 'build', 'phone')
HEROES = ['lancer_m1', 'paladin_f1', 'archer_f1', 'bard_m1']
COPY = ['assets/game/player/wizard.glb', 'assets/game/clips.json', 'assets/game/clips.bin', 'assets/game/items/amethyst_staff.glb',
        'assets/game/items/skull_01.glb', 'assets/game/items/kite_tree.glb'] + [f'assets/game/heroes/{h}.glb' for h in HEROES]
SLIM = ['assets/game/lisandra/pretty.glb', 'assets/game/lisandra/witch.glb']


def slim(src, dst, size=1024):
    js, blob = W.load_glb(src)
    # (Only the clips the game's walker asks for, and the old run for comparing.)
    keep = set(json.load(open(os.path.join(ROOT, 'tools', 'build', 'anim', 'opening_clips.json')))) | {'walk', 'idle', 'run_old', 'walk_gown', 'Walk_Loop'}
    js['animations'] = [a for a in js['animations'] if a.get('name') in keep]
    W.compact(js, blob); blob = W.blob_of(js)
    views = js['bufferViews']; new = bytearray(); out = []
    pics = {im['bufferView']: im for im in js.get('images', []) if 'bufferView' in im}
    for i, v in enumerate(views):
        o = v.get('byteOffset', 0); data = bytes(blob[o:o + v['byteLength']])
        if i in pics:
            im = Image.open(io.BytesIO(data))
            alpha = im.mode in ('RGBA', 'LA') and im.getextrema()[-1][0] < 255
            im.thumbnail((size, size), Image.LANCZOS)
            b = io.BytesIO()
            if alpha: im.save(b, 'PNG', optimize=True); pics[i]['mimeType'] = 'image/png'
            else: im.convert('RGB').save(b, 'JPEG', quality=86); pics[i]['mimeType'] = 'image/jpeg'
            data = b.getvalue()
        while len(new) % 4: new.append(0)
        v = dict(v); v['byteOffset'] = len(new); v['byteLength'] = len(data); new.extend(data); out.append(v)
    js['bufferViews'] = out
    js['buffers'][0]['byteLength'] = len(new) + (-len(new) % 4)
    W.save_glb(dst, js, new)
    return os.path.getsize(dst) / 1048576


def main():
    os.makedirs(OUT, exist_ok=True)
    html = open(os.path.join(ROOT, 'anim.html'), encoding='utf-8').read()
    m = re.search(r'<script type="module">\n(.*?)</script>', html, re.S)
    code = m.group(1).replace(' Her files are 25 MB each: a moment to load.', '').replace("const HEROES = ['lancer_m1', 'paladin_f1', 'archer_f1', 'bard_m1', 'dragoon_f1', 'ninja_m1', 'rogue_m1', 'boomerang_f1'];", f'const HEROES = {json.dumps(HEROES)};')
    # (The host serves no .glb or .bin: they go up named .wasm, which it serves as bytes, and are asked for by that name.)
    code = r"const fetch0 = globalThis.fetch; globalThis.fetch = (u, ...a) => fetch0(typeof u === 'string' && /\.(glb|bin)$/.test(u) ? u + '.wasm' : u, ...a);" + '\n' + code
    entry = os.path.join(ROOT, '_phone_entry.mjs')
    open(entry, 'w', encoding='utf-8').write(code)
    try:
        subprocess.run('npx --yes esbuild _phone_entry.mjs --bundle --format=esm --minify --external:three --external:three/addons/* --outfile=tools/build/phone/app.js', shell=True, cwd=ROOT, check=True)
    finally:
        os.remove(entry)
    page = html[:m.start()] + '<script type="module" src="app.js"></script>' + html[m.end():]
    # (A hosted page is given its own doctype and head: what's ours starts at the title.)
    page = page[page.index('<title>'):].replace('<title>', '<meta name="claude:viewport-fit-sides" content="cover">\n<title>', 1)
    page = '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n' + page
    page = page.replace('python tools/serve.py', 'this page').replace(' Her files are 25 MB each: a moment to load.', '')
    open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(page)
    files = {'app.js': 'app.js'}
    for f in COPY:
        d = os.path.join(OUT, f); os.makedirs(os.path.dirname(d), exist_ok=True); shutil.copyfile(os.path.join(ROOT, f), d); files[f] = f
    for f in SLIM:
        d = os.path.join(OUT, f); os.makedirs(os.path.dirname(d), exist_ok=True)
        print(f, f'{slim(os.path.join(ROOT, f), d):.1f} MB'); files[f] = f
    for f in list(files):
        if f.endswith(('.glb', '.bin')):
            os.replace(os.path.join(OUT, f), os.path.join(OUT, f + '.wasm')); del files[f]; files[f + '.wasm'] = f + '.wasm'
    json.dump(files, open(os.path.join(OUT, 'files.json'), 'w'), indent=1)
    print('total', round(sum(os.path.getsize(os.path.join(OUT, f)) for f in files) / 1048576, 1), 'MB')
    print(json.dumps(files))


if __name__ == '__main__': main()
