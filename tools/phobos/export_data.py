"""The layout's numbers as a module the game can load: tools/phobos/layout.json -> src/core/phobos-data.js.

    python tools/phobos/export_data.py

Only what the builder (src/core/phobos-build.js) reads: the city's districts, streets, canal, gates, hubs, dungeons and
forts. Change layout.json, run this, never edit phobos-data.js by hand."""
import json, os
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
L = json.load(open(os.path.join(ROOT, "tools", "phobos", "layout.json"), encoding="utf-8"))
C = L["city"]
out = {
    "districts": [{k: d[k] for k in ("key", "name", "x", "z", "r", "height")} for d in C["districts"]],
    "streets": [{"name": C["spine"]["name"], "w": 8, "pts": C["spine"]["pts"]}] + [{"name": s["name"], "w": 3, "pts": s["pts"]} for s in C["streets"]],
    "canal": C["canal"]["pts"],
    "gates": [{k: g[k] for k in ("name", "x", "z")} for g in C["gates"]],
    "hubs": [{k: h[k] for k in ("name", "x", "z")} for h in C["hubs"]],
    "dungeons": [{k: d[k] for k in ("name", "x", "z", "district")} for d in C["dungeons"]],
    "forts": C["forts"],
}
js = "// Made by tools/phobos/export_data.py from tools/phobos/layout.json. Not edited by hand.\nexport const PHOBOS = " + json.dumps(out, indent=1, ensure_ascii=False) + ";\n"
open(os.path.join(ROOT, "src", "core", "phobos-data.js"), "w", encoding="utf-8", newline="\n").write(js)
print("phobos-data.js:", len(out["districts"]), "districts,", len(out["streets"]), "streets")
