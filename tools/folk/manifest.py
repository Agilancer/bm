"""assets/game/folk/folk.json, which the game loads: build_folk.py writes each body's line (glb, height, hips, head,
joints, tris, skirt), paint.py its maps (c, n, m) and the palette swaps. Each changes only its own part."""
import json
import os

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
ORDER = list(json.load(open(os.path.join(ROOT, "tools", "folk", "models.json")))["models"])


def update(out, change):
    path = os.path.join(out, "folk.json")
    doc = json.load(open(path)) if os.path.exists(path) else {}
    doc.setdefault("models", {})
    doc.setdefault("swaps", {})
    change(doc)
    doc["models"] = {k: doc["models"][k] for k in ORDER if k in doc["models"]}
    with open(path, "w") as f:
        f.write(text(doc))


def text(doc):
    """One line per body and per swap, so a diff shows what changed."""
    lines = ["{"]
    for part, last in (("models", False), ("swaps", True)):
        lines.append(f'  "{part}": {{')
        items = list(doc[part].items())
        for i, (k, v) in enumerate(items):
            lines.append("    " + json.dumps(k) + ": " + json.dumps(v, separators=(", ", ": ")) + ("," if i < len(items) - 1 else ""))
        lines.append("  }" + ("" if last else ","))
    lines.append("}")
    return "\n".join(lines) + "\n"
