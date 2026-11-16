"""Draw the Phobos layout bible's maps from tools/phobos/layout.json into art/phobos/layout/, and check its rules.

    python tools/phobos/draw_layout.py

overview.png  the east from the old world edge to the Keep, with Tessariel's two eastern sites and their 1.5 km rings.
city.png      the walled city: districts, gates, the King's Mile, the Slough, hubs, dungeons, seals, world bosses, and
              the sewers' entrances and outfalls.
castle.png    the castle's wings by ward and the stairs between them (a diagram, not to scale): dungeons, key gates.
keep.png      the Keep's towers and the bridges, balconies and outside stairs between them, in the order they open.
Checks printed: every V place at least 1.5 km from every T site; every wing reachable from the gatehouse without a
key or the idol except the locked ones; every locked wing's key comes from a dungeon reachable before it.
"""
import json
import math
import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
L = json.load(open(os.path.join(ROOT, "tools", "phobos", "layout.json"), encoding="utf-8"))
OUT = os.path.join(ROOT, "art", "phobos", "layout")
os.makedirs(OUT, exist_ok=True)


def font(size):
    for f in ("arial.ttf", "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(f, size)
        except OSError:
            pass
    return ImageFont.load_default()


F12, F14, F18, F26 = font(12), font(14), font(18), font(26)
INK, PAPER = (30, 26, 22), (232, 224, 204)
V, T, SAFE, DUN, SEAL, BOSS, WATER = (150, 40, 40), (40, 80, 170), (40, 130, 70), (110, 50, 140), (200, 150, 30), (200, 80, 20), (90, 130, 160)


class Map:
    def __init__(self, x0, z0, x1, z1, w, title):
        self.x0, self.z0 = x0, z0
        self.s = w / (x1 - x0)
        self.im = Image.new("RGB", (w, int((z1 - z0) * self.s) + 60), PAPER)
        self.d = ImageDraw.Draw(self.im)
        self.d.text((16, 12), title, fill=INK, font=F26)

    def p(self, x, z):
        return ((x - self.x0) * self.s, (z - self.z0) * self.s + 60)

    def dot(self, x, z, col, r=6, label=None, f=F12, dx=9, dy=-7):
        px, py = self.p(x, z)
        self.d.ellipse([px - r, py - r, px + r, py + r], fill=col, outline=INK)
        if label:
            self.d.text((px + dx, py + dy), label, fill=INK, font=f)

    def line(self, pts, col, w=3):
        self.d.line([self.p(*q) for q in pts], fill=col, width=w, joint="curve")

    def ring(self, x, z, r, col, w=2):
        px, py = self.p(x, z); rr = r * self.s
        self.d.ellipse([px - rr, py - rr, px + rr, py + rr], outline=col, width=w)

    def poly(self, pts, col, w=3, fill=None, grow=0):
        # (grow: metres out from the middle of the points, for the moat round the wall)
        mx = sum(p[0] for p in pts) / len(pts); mz = sum(p[1] for p in pts) / len(pts)
        q = []
        for x, z in pts:
            d = math.hypot(x - mx, z - mz) or 1
            q.append(self.p(x + (x - mx) / d * grow, z + (z - mz) / d * grow))
        self.d.polygon(q, outline=col, fill=fill, width=w)

    def ellipse(self, x, z, a, b, col, w=3, fill=None):
        px, py = self.p(x, z)
        self.d.ellipse([px - a * self.s, py - b * self.s, px + a * self.s, py + b * self.s], outline=col, width=w, fill=fill)

    def save(self, name):
        self.im.save(os.path.join(OUT, name)); print("drew", name, self.im.size)


def legend(m, items, x, y):
    for k, (col, text) in enumerate(items):
        m.d.ellipse([x, y + k * 20, x + 12, y + k * 20 + 12], fill=col, outline=INK)
        m.d.text((x + 20, y + k * 20 - 2), text, fill=INK, font=F14)


C = L["city"]; cx, cz = C["centre"]

# ---- overview
m = Map(3400, -5600, 11900, 5600, 2000, "City State Phobos : Castle Velscour, the east (1 km grid)")
for gx in range(4000, 11900, 1000):
    m.line([(gx, -5600), (gx, 5600)], (212, 204, 184), 1); m.d.text(m.p(gx + 20, -5580), f"x {gx}", fill=(150, 140, 120), font=F12)
for gz in range(-5000, 5600, 1000):
    m.line([(3400, gz), (11900, gz)], (212, 204, 184), 1)
m.line([(5600, -5600), (5600, 5600)], (120, 110, 90), 2); m.d.text(m.p(5620, 5300), "the world's edge today (x 5,600)", fill=(100, 90, 70), font=F14)
m.line([(L["edge"]["east"], -5600), (L["edge"]["east"], 5600)], (120, 110, 90), 2); m.d.text(m.p(L["edge"]["east"] - 900, 5300), "new east edge (x 11,700)", fill=(100, 90, 70), font=F14)
for b in L["bands"]:
    m.d.text(m.p((b["x0"] + b["x1"]) / 2 - 300, -5450 + (160 if b["x1"] - b["x0"] < 700 else 0)), b["name"], fill=INK, font=F18)
for x in (7300, 7700):
    m.line([(x, -5600), (x, 5600)], (140, 120, 90), 5)
for t in L["t_sites"]:
    m.dot(t["x"], t["z"], T, 8, t["name"] + " (Tessariel's)", F14); m.ring(t["x"], t["z"], 1500, T, 2)
M = L["marches"]
for r in M["roads"]:
    m.line(r["pts"], (140, 100, 60), 3)
for k in M["keeps"]:
    m.dot(k["x"], k["z"], V, 9 if k["kind"] == "keep" else 6, k["name"], F14)
m.dot(M["pass"]["x"], M["pass"]["z"], INK, 6, M["pass"]["name"], F14, -60, 12)
m.line(M["chasm"]["pts"], (90, 70, 50), 8)
m.dot(M["chasm"]["sill"]["x"], M["chasm"]["sill"]["z"], SEAL, 7, M["chasm"]["sill"]["name"], F14, -150, -26)
m.poly(C["wall"]["pts"], WATER, 6, None, 60)
m.poly(C["wall"]["pts"], V, 4, (214, 196, 176))
m.d.text(m.p(cx - 330, cz - 60), "THE CITY STATE", fill=INK, font=F18)
kx, kz = L["castle"]["centre"]; m.ellipse(kx, kz, 320, 300, V, 4, (196, 170, 150)); m.d.text(m.p(kx - 250, kz + 320), "CASTLE VELSCOUR", fill=INK, font=F18)
tx, tz = L["keep"]["centre"]; m.ellipse(tx, tz, 120, 130, INK, 4, (150, 110, 100)); m.d.text(m.p(kx - 250, kz - 420), "THE KEEP (on top)", fill=INK, font=F18)
for b in L["marches_bosses"]:
    m.dot(b["x"], b["z"], BOSS, 7)
legend(m, [(V, "Velscour's keeps and towers"), (T, "Tessariel's sites, with 1.5 km rings (the V and T rule)"), (BOSS, "world boss"), (SEAL, "seal (fast travel)")], 3440 * 0 + 20, m.im.size[1] - 100)
m.save("overview.png")

# ---- city
m = Map(8850, -950, 11500, 950, 2400, "The City State and what stands over it (100 m grid)")
for gx in range(8900, 11500, 100):
    m.line([(gx, -950), (gx, 950)], (220, 212, 192), 1)
for gz in range(-900, 950, 100):
    m.line([(8850, gz), (11500, gz)], (220, 212, 192), 1)
m.poly(C["wall"]["pts"], WATER, 10, None, C["moat"] + 10)
m.poly(C["wall"]["pts"], V, 5, (224, 212, 192))
for d in C["districts"]:
    sh = 236 - d["height"] * 1.6
    m.ellipse(d["x"], d["z"], d["r"], d["r"], (150, 130, 110), 2, (int(sh), int(sh - 10), int(sh - 28)))
m.line(C["canal"]["pts"], WATER, 9); m.line(C["spine"]["pts"], (120, 80, 40), 6)
for st in C.get("streets", []):
    m.line(st["pts"], (160, 120, 80), 3)
    m.d.text(m.p(st["pts"][1][0] + 8, st["pts"][1][1] - 16), st["name"], fill=(110, 80, 50), font=F12)
for tw in C.get("towers", []):
    ang = math.radians(tw["deg"]); x = cx + C["a"] * math.cos(ang); z = cz - C["b"] * math.sin(ang)
    px, py = m.p(x, z); m.d.rectangle([px - 7, py - 7, px + 7, py + 7], fill=V, outline=INK); m.d.text((px + 10, py - 6), tw["name"], fill=V, font=F12)
for d in C["districts"]:
    m.d.text(m.p(d["x"] - d["r"] * 0.8, d["z"] - 12), d["name"], fill=INK, font=F18)
    m.d.text(m.p(d["x"] - d["r"] * 0.8, d["z"] + 12), f"lvl {d['levels'][0]}-{d['levels'][1]}, +{d['height']} m", fill=(90, 80, 70), font=F12)
for g in C["gates"]:
    px, py = m.p(g["x"], g["z"]); m.d.rectangle([px - 9, py - 9, px + 9, py + 9], fill=INK); m.d.text((px - 70, py + 12), g["name"], fill=INK, font=F14)
for h in C["hubs"] + L["sewers"]["hubs"]:
    m.dot(h["x"], h["z"], SAFE, 9, h["name"], F14)
for q in C["dungeons"]:
    m.dot(q["x"], q["z"], DUN, 8, f"{q['n']}. {q['name']} ({q['level']})", F14, 10, 4)
for s in C["seals"]:
    m.dot(s["x"], s["z"], SEAL, 5)
for b in C["bosses"] + L["sewers"]["bosses"]:
    m.dot(b["x"], b["z"], BOSS, 7, b["name"], F12, 9, 6)
for e in L["sewers"]["entrances"]:
    px, py = m.p(e["x"], e["z"]); m.d.rectangle([px - 4, py - 4, px + 4, py + 4], outline=INK, width=2)
for f in C.get("forts", []):
    px, py = m.p(f["x"], f["z"]); m.d.polygon([(px, py - 9), (px + 9, py), (px, py + 9), (px - 9, py)], fill=V, outline=INK)
for o in L["sewers"]["outfalls"]:
    px, py = m.p(o["x"], o["z"]); m.d.polygon([(px, py - 8), (px - 7, py + 6), (px + 7, py + 6)], fill=WATER, outline=INK)
m.line([(M["chasm"]["sill"]["x"], 0), (9350, 0)], (120, 80, 40), 5)
m.dot(M["chasm"]["sill"]["x"], 0, SEAL, 7, "The Sill: first sight", F14, -40, 14)
m.ellipse(kx, kz, 320, 300, V, 5, (204, 184, 164))
for w in L["castle"]["wards"]:
    m.d.text(m.p(w["x"] - 70, -40 + 70 * L["castle"]["wards"].index(w) - 70), f"{w['name']} +{w['height']} m", fill=INK, font=F14)
m.d.text(m.p(kx - 150, kz - 280), "CASTLE VELSCOUR", fill=INK, font=F18)
m.ellipse(tx, tz, 120, 130, INK, 5, (160, 124, 112)); m.d.text(m.p(tx - 105, tz + 135), f"VELSCOUR'S KEEP, on top: +{L['keep']['base']} to +{L['keep']['top']} m", fill=INK, font=F18)
legend(m, [(SAFE, "safe hub"), (DUN, "dungeon entrance (level)"), (SEAL, "seal"), (BOSS, "world boss"), (WATER, "moat, the Slough, sewer outfalls (triangles)"), (INK, "gates (squares); small open squares: sewer entrances")], 20, m.im.size[1] - 140)
m.save("city.png")

# ---- castle diagram
K = L["castle"]
W, H = 2200, 1250
im = Image.new("RGB", (W, H), PAPER); d = ImageDraw.Draw(im)
d.text((16, 12), "Castle Velscour: wings and the stairs between them (diagram, not to scale)", fill=INK, font=F26)
pos = {w["key"]: (150 + w["sx"] * 235, 140 + w["sy"] * 135) for w in K["wings"]}
for k, wd in enumerate(K["wards"]):
    x0 = 30 + (0, 600, 1310)[k]; x1 = (600, 1310, 2170)[k]
    d.rectangle([x0, 70, x1, H - 90], outline=(150, 130, 110), width=2)
    d.text((x0 + 10, 76), f"{wd['name']}  (+{wd['height']} m, lvl {wd['levels'][0]}-{wd['levels'][1]})", fill=INK, font=F18)
lockset = {frozenset((l["a"], l["b"])): l for l in K.get("locked_links", [])}
for a, b in K["stairs"]:
    l = lockset.get(frozenset((a, b)))
    d.line([pos[a], pos[b]], fill=V if l else (120, 90, 60), width=6 if l else 3)
    if l:
        mx, my = (pos[a][0] + pos[b][0]) / 2, (pos[a][1] + pos[b][1]) / 2
        d.text((mx - 80, my - 16), f"{l['name']}: key from {l['key']}", fill=V, font=F12)
for w in K["wings"]:
    x, y = pos[w["key"]]
    col = (236, 226, 206)
    if w.get("keys"):
        col = (236, 196, 186)
    d.rounded_rectangle([x - 105, y - 34, x + 105, y + 36], 8, fill=col, outline=INK, width=2)
    d.text((x - 98, y - 28), w["name"], fill=INK, font=F12)
    line = []
    if w.get("dungeon"): line.append("DUNGEON: " + w["dungeon"])
    if w.get("hub"): line.append(w["hub"])
    d.text((x - 98, y - 12), "; ".join(line)[:44], fill=DUN, font=F12)
    tag = ("locked: " + " + ".join(w["keys"])) if w.get("keys") else ("rest point (seal)" if w.get("rest") else "")
    d.text((x - 98, y + 4), tag[:46], fill=V if w.get("keys") else SAFE, font=F12)
    d.text((x - 98, y + 18), w.get("room", "")[:46], fill=(90, 80, 70), font=F12)
d.text((30, H - 78), "Red boxes are locked until a dungeon boss's key (or the idol) opens them. Every wing loops back to a rest point by a door opened from its far side.", fill=INK, font=F14)
d.text((30, H - 54), "World bosses: " + "; ".join(f"{b['name']} ({b['wing']}, lvl {b['level']})" for b in K["bosses"]), fill=BOSS, font=F14)
d.text((30, H - 30), "The idol: " + K["idol"]["needs"], fill=INK, font=F14)
im.save(os.path.join(OUT, "castle.png")); print("drew castle.png", im.size)

# ---- keep diagram
P = L["keep"]
im = Image.new("RGB", (1500, 1000), PAPER); d = ImageDraw.Draw(im)
d.text((16, 12), "Velscour's Keep, on top of the castle: towers, and the crossings where the bosses stand (diagram)", fill=INK, font=F26)
pos = {t["key"]: (220 + t["sx"] * 265, 170 + t["sy"] * 170) for t in P["towers"]}
for k, l in enumerate(P["links"]):
    a, b = pos[l["a"]], pos[l["b"]]
    d.line([a, b], fill=(120, 90, 60), width=7)
    mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
    d.text((mx - 90, my - 34), f"{k + 1}. {l['name']} ({l['kind']}, +{l['leaves']} to +{l['lands']} m, seal)", fill=INK, font=F14); d.text((mx - 90, my - 16), "boss: " + l["boss"], fill=BOSS, font=F12)
for t in P["towers"]:
    x, y = pos[t["key"]]; r = 70 if t["key"] == "throne" else 56
    d.ellipse([x - r, y - r, x + r, y + r], fill=(196, 170, 150) if t["key"] != "throne" else (150, 100, 100), outline=INK, width=3)
    d.text((x - r + 8, y - 24), t["name"], fill=INK, font=F12); d.text((x - r + 8, y - 8), f"{t['floors']} floors, lvl {t['level']}", fill=INK, font=F12)
    d.text((x - r + 8, y + 8), ("x5 -> " + t["opens"][:20]) if t.get("opens") else "one run: Velscour", fill=V, font=F12)
    d.text((x - r + 4, y + r + 4), f"+{t['foot']} to +{t['top']} m: {t['rule']}"[:62], fill=INK, font=F12)
d.text((30, 900), "Each spire: five clears, no two alike; two routes up (inside floors, outside ledges). Each crossing won drops a lift to the Crown Court (rest point).", fill=INK, font=F14)
d.text((30, 922), "The Throne Tower is one run. The route on foot is about 2.5 times the straight line, doubling back round the Throne Tower.", fill=INK, font=F14)
d.text((30, 946), "World boss: " + P["boss"]["name"] + ", " + P["boss"]["where"] + f" (lvl {P['boss']['level']})", fill=BOSS, font=F14)
im.save(os.path.join(OUT, "keep.png")); print("drew keep.png", im.size)

# ---- checks
SG = L["sight"]; tg = SG["target"]
for f in SG["from"]:
    dist = math.hypot(tg["x"] - f["x"], tg["z"] - f["z"])
    blocked = [w["name"] for w in SG["walls"] if f["x"] < w["x"] < tg["x"] and f["h"] + (tg["h"] - f["h"]) * (w["x"] - f["x"]) / (tg["x"] - f["x"]) < w["h"]]
    spire = math.degrees(math.atan2(tg["h"] - L["keep"]["base"], dist))
    print(f"sight: {f['name']:18s} {dist:5.0f} m, the Keep stands {spire:4.1f} deg tall,", "BLOCKED by " + ", ".join(blocked) if blocked else "top in view")
vs = [(k["name"], k["x"], k["z"]) for k in M["keeps"]] + [("the city wall", cx - C["a"], cz), ("Widow's Notch", M["pass"]["x"], M["pass"]["z"])]
worst = min((math.hypot(x - t["x"], z - t["z"]), n, t["name"]) for n, x, z in vs for t in L["t_sites"])
print("V/T: nearest V place to a T site:", worst[1], "to", worst[2], round(worst[0]), "m", "OK" if worst[0] >= 1500 else "TOO CLOSE")
wings = {w["key"]: w for w in K["wings"]}
adj = {k: set() for k in wings}
for a, b in K["stairs"]:
    adj[a].add(b); adj[b].add(a)
linkkey = {frozenset((l["a"], l["b"])): l["key"] for l in K.get("locked_links", [])}
dun_wing = {w["dungeon"]: w["key"] for w in K["wings"] if w.get("dungeon")}
have, reach = set(), {"gate", "aqueduct"}
grew = True
while grew:
    grew = False
    for a in list(reach):
        for b in adj[a]:
            lk = linkkey.get(frozenset((a, b)))
            if b not in reach and (not lk or lk in have) and all(k in have for k in wings[b].get("keys", [])):
                reach.add(b); grew = True
    for dname, wk in dun_wing.items():
        if wk in reach and dname not in have:
            have.add(dname); grew = True
    if len(have & set(dun_wing)) == len(dun_wing) and "the sacrificial idol" not in have:
        have.add("the sacrificial idol"); grew = True
print("castle: wings reachable in order with keys:", len(reach), "of", len(wings), "| dungeons reachable:", len(have & set(dun_wing)), "of", len(dun_wing), "OK" if len(reach) == len(wings) else "STUCK: " + str(set(wings) - reach))

# ---- section: the city, the castle and the Keep on top, from the south, to scale
SX0, SX1, HMAX = 8850, 11500, 360
sc = 2400 / (SX1 - SX0)
im = Image.new("RGB", (2400, int(HMAX * sc) + 190), PAPER); d = ImageDraw.Draw(im)
d.text((16, 12), "Section looking north, to scale: the Sill, the city, the three wards, and the Keep on top of the castle", fill=INK, font=F26)
base = int(HMAX * sc) + 80
X = lambda x: (x - SX0) * sc
Y = lambda h: base - h * sc
ground = [(8850, 60), (8950, 60), (8990, 0), (9320, 0), (9350, 0)] + [(dd["x"], dd["height"]) for dd in sorted(C["districts"], key=lambda q: q["x"])] + [(10745, 60), (10760, 70), (10950, 70), (10950, 90), (11150, 90), (11150, 115), (11400, 115), (11420, 40), (11500, 30)]
d.polygon([(X(x), Y(h)) for x, h in ground] + [(X(11500), base + 30), (X(8850), base + 30)], fill=(196, 180, 156), outline=INK)
d.rectangle([X(9320), Y(0), X(9350), Y(-6)], fill=WATER)
for w in L["sight"]["walls"]:
    gh = 0 if w["x"] < 9400 else {10760: 60, 10950: 70, 11150: 90}[w["x"]]
    d.rectangle([X(w["x"]) - 4, Y(w["h"]), X(w["x"]) + 4, Y(gh)], fill=V); d.text((X(w["x"]) - 40, Y(w["h"]) - 16), f"{w['name']} +{w['h']}", fill=INK, font=F12)
for k, wd in enumerate(K["wards"]):
    d.text((X(wd["x"]) - 60, Y(wd["height"]) + 6), f"{wd['name']} +{wd['height']} m", fill=INK, font=F14)
d.text((X(11210), Y(115) + 24), "the Crown Court +115 m", fill=SAFE, font=F14)
for t in sorted(P["towers"], key=lambda q: q["key"] != "throne"):
    wdt = 36 if t["key"] == "throne" else 24
    col = (150, 100, 100) if t["key"] == "throne" else (176, 150, 132)
    d.rectangle([X(t["x"]) - wdt * sc / 2, Y(t["top"]), X(t["x"]) + wdt * sc / 2, Y(115)], fill=(208, 196, 178), outline=(150, 130, 110))
    d.rectangle([X(t["x"]) - wdt * sc / 2, Y(t["top"]), X(t["x"]) + wdt * sc / 2, Y(t["foot"])], fill=col, outline=INK, width=2)
    d.text((X(t["x"]) - 30, Y(t["top"]) - 30 - (14 if t["key"] in ("bone", "blood") else 0)), f"{t['name'].replace('The ', '')} +{t['top']}", fill=INK, font=F12)
for l in P["links"]:
    ta = next(t for t in P["towers"] if t["key"] == l["a"]); tb = next(t for t in P["towers"] if t["key"] == l["b"])
    d.line([X(ta["x"]), Y(l["leaves"]), X(tb["x"]), Y(l["lands"])], fill=BOSS, width=4)
tg = L["sight"]["target"]
for f in L["sight"]["from"][:1] + L["sight"]["from"][5:6]:
    d.line([X(f["x"]), Y(f["h"] + 1.7), X(tg["x"]), Y(tg["h"])], fill=SEAL, width=2); d.text((X(f["x"]) - 30, Y(f["h"]) - 30), f["name"], fill=INK, font=F14)
d.text((X(9500), Y(0) + 8), "THE CITY STATE (districts' ground heights)", fill=INK, font=F14)
d.text((30, base + 40), "Pale lower parts of each spire are what carries it: " + "; ".join(f"{t['name'].replace('The ', '')} on {t['stands_on']}" for t in P["towers"])[:230], fill=INK, font=F12)
d.text((30, base + 58), "Orange lines: the five crossings, in order, each a boss fight. Yellow lines: the first-sight view from the Sill and the view from the parade ground.", fill=INK, font=F12)
im.save(os.path.join(OUT, "section.png")); print("drew section.png", im.size)

# ---- the sewers
S = L["sewers"]
m = Map(9250, -850, 10800, 880, 2000, "The Sewers: four halls, the tunnels between them, and the ways in and out (100 m grid)")
for gx in range(9300, 10800, 100):
    m.line([(gx, -850), (gx, 880)], (220, 212, 192), 1)
for gz in range(-800, 880, 100):
    m.line([(9250, gz), (10800, gz)], (220, 212, 192), 1)
m.ellipse(cx, cz, C["a"], C["b"], (190, 170, 150), 2)
cols = [(90, 150, 80), (70, 120, 190), (140, 90, 170), (200, 150, 60)]
for t in S["tunnels"]:
    m.line(t["pts"], cols[t["sector"]] if t["sector"] >= 0 else (120, 120, 120), 7)
    if t.get("name"):
        m.d.text(m.p(t["pts"][1][0] - 120, t["pts"][1][1] + 30), t["name"], fill=INK, font=F12)
for h in S["halls"]:
    m.dot(h["x"], h["z"], cols[h["sector"]], 16, f"{h['name']} ({S['sectors'][h['sector']]['name']}, lvl {S['sectors'][h['sector']]['levels'][0]}-{S['sectors'][h['sector']]['levels'][1]}; seal)", F14, 20, -8)
for e in S["entrances"]:
    px, py = m.p(e["x"], e["z"]); m.d.rectangle([px - 6, py - 6, px + 6, py + 6], fill=PAPER, outline=INK, width=2); m.d.text((px + 9, py + 6), e["name"], fill=INK, font=F12)
for o in S["outfalls"]:
    px, py = m.p(o["x"], o["z"]); m.d.polygon([(px, py - 10), (px - 9, py + 8), (px + 9, py + 8)], fill=WATER, outline=INK); m.d.text((px + 12, py - 6), o["name"], fill=INK, font=F12)
for hb in S["hubs"]:
    m.dot(hb["x"], hb["z"] + 26, SAFE, 9, hb["name"], F14)
for b in S["bosses"]:
    m.dot(b["x"], b["z"], BOSS, 8, f"{b['name']} ({b['level']})", F12, 10, 6)
legend(m, [(SAFE, "safe hub"), (BOSS, "world boss"), (WATER, "outfall to the moat (downstream is out)"), (INK, "squares: entrances from the districts above")], 20, m.im.size[1] - 100)
m.save("sewers.png")
