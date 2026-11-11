"""Where the townsfolk sleep, sit, eat, cook and work indoors, read off the furniture as tools/interior/build_interior.py lays
out each house (its homes()), without building or writing anything of the interior's. In a background Blender (the build
script needs bpy, though nothing here draws):

    blender -b --factory-startup --python-exit-code 1 --python tools/folk/spots.py

Writes assets/game/folk/spots.json: per village house (in tools/village's order), each piece of furniture someone uses, in
world coordinates, with its height and the way it faces:
    bed     y: the top of the mattress; dir: toward its foot
    chair   y: the seat; dir: the way you face sitting in it
    bench   y: the seat; len: its length; axis: [x, z] along it
    table   y: the top; hx, hz: half sizes in world x and z
    hearth  where the cook stands; dir: toward the fire
    oven    where the baker stands, 0.7 m off its mouth; dir: toward it
    anvil, vat, loom, trestle, coffin, chest, barrel, shelf, sacks: where they stand (a worker stands off them)
"""
import json
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SRC = os.path.join(ROOT, "tools", "interior", "build_interior.py")
g = {"ROOT_OVERRIDE": ROOT, "__name__": "folk_spots", "__file__": SRC}
exec(open(SRC, encoding="utf8").read(), g)
Home = g["Home"]
HOME_FLOOR = g["HOME_FLOOR"]
houses = []


def r3(v):
    return round(v, 3)


def world_dir(self, nx, nz):
    return (nx * self.c + nz * self.s, -nx * self.s + nz * self.c)


def rec(self, kind, lx, lz, y, nx=0.0, nz=0.0, **kw):
    x, z = self.p(lx, lz)
    dx, dz = world_dir(self, nx, nz)
    s = {"kind": kind, "x": r3(x), "z": r3(z), "y": r3(y), "dir": [r3(dx), r3(dz)], "level": 1 if y > 2.0 else 0}
    s.update(kw)
    self._spots.append(s)


def world_half(self, hx, hz):
    """Half sizes along world x and z of a box that's (hx, hz) in the house's frame."""
    hx, hz = hx * self.k, hz * self.k
    return (hz, hx) if self.turned else (hx, hz)


def wrap(name, before):
    orig = getattr(Home, name)

    def f(self, *a, **k):
        before(self, *a, **k)
        return orig(self, *a, **k)
    setattr(Home, name, f)


orig_init = Home.__init__


def init(self, h):
    orig_init(self, h)
    self._spots = []
    houses.append(self)


Home.__init__ = init


def on_table(self, lx, lz, y, hx=0.9, hz=0.45, lit=True):
    wx, wz = world_half(self, hx, hz)
    rec(self, "table", lx, lz, y + 0.775, hx=r3(wx), hz=r3(wz))


def on_chair(self, lx, lz, y, nx, nz):
    rec(self, "chair", lx, lz, y + 0.47, nx, nz)


def on_bench(self, lx, lz, y, hx, hz):
    along = (1.0, 0.0) if hx > hz else (0.0, 1.0)
    ax, az = world_dir(self, *along)
    rec(self, "bench", lx, lz, y + 0.46, len=r3(2 * max(hx, hz) * self.k), axis=[r3(ax), r3(az)])


def on_bed(self, lx, lz, y, nx, nz):
    rec(self, "bed", lx, lz, y + 0.45, nx, nz, width=r3(1.0 * self.k))


def on_hearth(self, nx, nz, at=None):
    cx, cz = at or self.chimney
    rec(self, "hearth", cx + nx * 1.35, cz + nz * 1.35, HOME_FLOOR, -nx, -nz)


def on_loom(self, lx, lz, y, across_x=True):
    # The weaver sits at the breast beam, on the +d side.
    ox, oz = (0.0, 0.95) if across_x else (0.95, 0.0)
    rec(self, "loom", lx + ox, lz + oz, y, -ox / 0.95 if ox else 0.0, -oz / 0.95 if oz else 0.0)


for name, fn in (("table", on_table), ("chair", on_chair), ("bench", on_bench), ("bed", on_bed), ("hearth", on_hearth), ("loom", on_loom)):
    wrap(name, fn)
# (dir: the side the smith stands.)
wrap("anvil", lambda self, lx, lz, y, nx=-1.0, nz=0.0: rec(self, "anvil", lx, lz, y, nx, nz))
wrap("vat", lambda self, lx, lz, y, r=0.55: rec(self, "vat", lx, lz, y, r=r3(r * self.k)))
wrap("trestle", lambda self, lx, lz, y, hx, hz, h=0.72: rec(self, "trestle", lx, lz, y + h, hx=r3(world_half(self, hx, hz)[0]), hz=r3(world_half(self, hx, hz)[1])))
wrap("coffin", lambda self, lx, lz, y, along_x=False, up=False: rec(self, "coffin", lx, lz, y, up=bool(up)))
wrap("chest_at", lambda self, lx, lz, nx, nz: rec(self, "chest", lx, lz, HOME_FLOOR, nx, nz))
wrap("barrel", lambda self, lx, lz, y, r=0.32, h=0.9: rec(self, "barrel", lx, lz, y))
wrap("shelf", lambda self, lx, lz, y, hx, hz, stock='books': rec(self, "shelf", lx, lz, y, hx=r3(world_half(self, hx, hz)[0]), hz=r3(world_half(self, hx, hz)[1])))
wrap("sacks", lambda self, lx, lz, y, nx, nz: rec(self, "sacks", lx, lz, y))
wrap("oven", lambda self, lx, lz, y, nx, nz: rec(self, "oven", lx + nx * 1.55, lz + nz * 1.55, y, -nx, -nz))

g["homes"]()
out = {"houses": [{"x": r3(h.x), "z": r3(h.z), "spots": h._spots} for h in houses]}
path = os.path.join(ROOT, "assets", "game", "folk", "spots.json")
with open(path, "w") as f:
    json.dump(out, f, separators=(",", ":"))
print("FOLK spots", [(i, len(h._spots), sum(1 for s in h._spots if s["kind"] == "bed")) for i, h in enumerate(houses)])
