"""Which part of his gear each triangle of the body is, by the game's own slots (ROBE_SHAPES in src/items/items.js):
head (the hat), shoulders (the mantle: shoulder guards, the sleeves under them and the collar), chest (tunic, belt, skirts), legs (trousers,
knee guards and greaves) and feet (the boots). Skin, hair and eyes are 0: no gear changes them.

Tripo's sculpt is one fused mesh with one fragmented colour map, so the parts are told apart by what moves each point (its
heaviest joint), where it is in the bind pose, and what colour it's painted."""
import numpy as np

PARTS = ["none", "head", "shoulders", "chest", "legs", "feet"]
HEAD, SHOULDERS, CHEST, LEGS, FEET = 1, 2, 3, 4, 5
BOOT_TOP = 0.19          # the boots' cuffs (m, bind pose)
KNEE_TOP = 0.61          # the knee guards' tops: above, what isn't trouser is the tunic's skirt
SHOULDER_LINE = 1.405    # the mantle sits above this, out from the neck
COLLAR_LINE = 1.47
BACK_COLLAR_LINE = 1.52  # behind the neck, the collar proper starts here
SLEEVE_END = 1.2         # the sleeves' cuffs are above this


def hsv(rgb):
    mx, mn = rgb.max(-1), rgb.min(-1)
    d = mx - mn
    sat = np.where(mx > 0, d / np.maximum(mx, 1e-6), 0)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    safe = np.maximum(d, 1e-6)
    hue = np.where(mx == r, ((g - b) / safe) % 6, np.where(mx == g, (b - r) / safe + 2, (r - g) / safe + 4)) * 60
    return np.where(d < 1e-6, 0, hue), sat, mx


def is_skin(rgb):
    h, s, v = hsv(rgb)
    return (h > 8) & (h < 34) & (s > 0.24) & (s < 0.62) & (v > 0.42)


def seg_dist(p, a, b):
    ab = b - a
    t = np.clip(((p - a) @ ab) / (ab @ ab), 0, 1)
    return np.linalg.norm(p - (a + t[:, None] * ab), axis=1)


def classify(mesh, color):
    """mesh: tools/player/skins/glb.py load(). color: (S, S, 3) floats 0..1. Returns a part for every triangle."""
    pos, uv, tris, names = mesh["pos"], mesh["uv"], mesh["tris"], mesh["names"]
    size = color.shape[0]
    # A triangle's paint: the mean of a few points inside it (its corners sit on the islands' edges, where the map bleeds).
    c = np.zeros((len(tris), 3))
    for w in ((0.6, 0.2, 0.2), (0.2, 0.6, 0.2), (0.2, 0.2, 0.6), (1 / 3, 1 / 3, 1 / 3)):
        p = uv[tris[:, 0]] * w[0] + uv[tris[:, 1]] * w[1] + uv[tris[:, 2]] * w[2]
        c += color[np.clip((p[:, 1] * size).astype(int), 0, size - 1), np.clip((p[:, 0] * size).astype(int), 0, size - 1)]
    c /= 4
    at = pos[tris].mean(1)
    x, y, z = np.abs(at[:, 0]), at[:, 1], at[:, 2]
    # Its heaviest joint, over its three corners.
    w = np.zeros((len(tris), len(names)))
    for k in range(3):
        for s in range(4):
            np.add.at(w, (np.arange(len(tris)), mesh["joints"][tris[:, k], s]), mesh["weights"][tris[:, k], s])
    joint = np.array([n.split("_", 1)[-1] if n[:2] in ("L_", "R_") else n for n in names])[w.argmax(1)]
    h, s, v = hsv(c)
    skin = is_skin(c)
    purple = (c[:, 2] > c[:, 0] * 0.95) & (c[:, 2] > c[:, 1] * 1.12)
    dark = v < 0.2
    part = np.zeros(len(tris), np.uint8)
    on = lambda *js: np.isin(joint, js)
    J = {n: i for i, n in enumerate(names)}
    bind = lambda n: mesh["bind"][J[n]]

    # The hat: what the head carries that isn't face or hair. The brim droops to eye level and the point curls over, so height
    # alone doesn't tell: the hat is purple or gilt, and stands out from the skull or over it.
    head = on("Head", "FacialBone", "Eye", "NeckTwist01", "NeckTwist02")
    axis = bind("Head")
    r = np.hypot(at[:, 0] - axis[0], at[:, 2] - axis[2])
    gilt = (h > 28) & (h < 60) & (s > 0.18) & (v > 0.35) & ~skin
    part[head & ((y > 1.705) | (~skin & ((r > 0.135) | (gilt & (y > 1.64)) | (purple & (y > 1.565)))))] = HEAD

    # The boots.
    # (The greaves' purple hems come down over the boots' tops: those are the legs'.)
    hem = (purple | gilt) & (y > 0.13)
    part[(on("Foot", "ToeBase") | (on("Calf") & (y < BOOT_TOP))) & ~hem] = FEET
    # Trousers, knee guards and greaves. Up the thigh the tunic's skirts hang over the trousers: the trousers are the dark
    # cloth close in to the leg.
    part[(on("Calf") & (y >= BOOT_TOP)) | (on("Foot", "ToeBase", "Calf") & hem)] = LEGS
    near = np.full(len(tris), 9.0)
    for side in ("L_", "R_"):
        near = np.minimum(near, seg_dist(at, bind(side + "Thigh"), bind(side + "Calf")))
    thigh = on("Thigh", "Pelvis", "Hip", "BoneRoot")
    part[thigh & ~skin & ((y < KNEE_TOP) | ((near < 0.115) & ~purple & (s < 0.3) & (v < 0.3) & (y < 0.98)))] = LEGS

    # The tunic: everything else that's cloth, leather or gilt on the trunk, the arms and the hips.
    body = on("Waist", "Spine01", "Spine02", "Clavicle", "Upperarm", "Forearm", "Hand", "Pelvis", "Hip", "BoneRoot", "Thigh") | (head & (y < 1.6))
    part[(part == 0) & body & ~skin & ~(head & ~(purple | gilt))] = CHEST
    # The mantle: the guards on the shoulders, and the collar.
    top = (part == CHEST) & (((y > SHOULDER_LINE) & (x > 0.085) & (x < 0.4)) | (y > COLLAR_LINE))
    part[top] = SHOULDERS
    # A level line through the guards cut them raggedly, and left their lower halves the tunic's. So the mantle grows from
    # there over what it touches, across the guards and down the sleeves they're one piece with, as far as the gilt
    # rims and cuffs that end them (gilt joins it, and passes nothing on). Behind the neck the collar's line cut through
    # the hood's drape: that's the tunic's up to the collar's own top.
    xs = at[:, 0]
    part[(part == SHOULDERS) & (x < 0.15) & (z < -0.04) & (y < BACK_COLLAR_LINE)] = CHEST
    _, weld = np.unique(np.round(pos * 2000).astype(np.int64), axis=0, return_inverse=True)
    wt = weld.reshape(-1)[tris]
    rim = (h > 22) & (h < 62) & (s > 0.16) & (v > 0.3)
    can = (part == CHEST) & (y > SLEEVE_END) & (x > np.where(y < 1.38, 0.21, 0.15)) & (x < 0.46)
    reach = np.zeros(wt.max() + 1, bool)
    reach[wt[(part == SHOULDERS) & (x > 0.15)].ravel()] = True
    for _ in range(200):
        touch = reach[wt].any(1) & can & (part == CHEST)
        if not touch.any():
            break
        part[touch] = SHOULDERS
        reach[wt[touch & ~rim].ravel()] = True
    # And the line between the two smoothed: a triangle most of whose neighbours are the other's goes over to it.
    for _ in range(6):
        n2, n3 = np.zeros(wt.max() + 1), np.zeros(wt.max() + 1)
        for k in range(3):
            np.add.at(n2, wt[part == SHOULDERS][:, k], 1)
            np.add.at(n3, wt[part == CHEST][:, k], 1)
        a2 = n2[wt].sum(1) - 3 * (part == SHOULDERS)
        a3 = n3[wt].sum(1) - 3 * (part == CHEST)
        to2 = (part == CHEST) & (a2 > a3 * 1.5) & (y > 1.15)
        to3 = (part == SHOULDERS) & (a3 > a2 * 1.5) & (y > 1.15)
        part[to2] = SHOULDERS
        part[to3] = CHEST
    # (Fingers and thumbs are skin whatever shade they're painted.)
    fingers = np.array([any(f in n for f in ("Index", "Mid", "Ring", "Pinky", "Thumb")) for n in names])[w.argmax(1)]
    part[fingers] = 0
    # (Past the sleeves' cuffs the arms are bare, shadowed or not.)
    part[on("Upperarm", "Forearm", "Hand") & (x > 0.52)] = 0
    return part, {"dark": dark}
