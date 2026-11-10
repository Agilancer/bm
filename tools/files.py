"""files.json: the version of every file the game can fetch, for coi-sw.js, which keeps the game on the player's device
and downloads again only what changed.

tools/serve.py makes it fresh on every request (from each file's size and time, so an edit shows at once), and nothing
needs writing. For a static host, write it beside index.html each time the game is put up, from the files' contents:

    python tools/files.py

files.json is not committed (.gitignore): one left behind from an older copy would tell players' devices that changed
files hadn't.
"""
import hashlib
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIRS = ("src", "assets")
ROOT_FILES = (".html", ".webmanifest")


def game_files(root=ROOT):
    """Every file the game may ask for, as paths from the root with forward slashes. Not tools, art or dotfiles."""
    out = []
    for name in os.listdir(root):
        if name.endswith(ROOT_FILES) and os.path.isfile(os.path.join(root, name)):
            out.append(name)
    for d in DIRS:
        for base, dirs, files in os.walk(os.path.join(root, d)):
            dirs[:] = [x for x in dirs if not x.startswith(".")]
            for f in files:
                if not f.startswith("."):
                    out.append(os.path.relpath(os.path.join(base, f), root).replace(os.sep, "/"))
    return sorted(out)


def listing(root=ROOT, hashed=False):
    """{"files": {path: version}}: by content (hashed), or by size and modified time, which is quick."""
    files = {}
    for p in game_files(root):
        full = os.path.join(root, p)
        if hashed:
            h = hashlib.sha1()
            with open(full, "rb") as f:
                for chunk in iter(lambda: f.read(1 << 20), b""):
                    h.update(chunk)
            files[p] = h.hexdigest()[:16]
        else:
            st = os.stat(full)
            files[p] = f"{st.st_size:x}.{st.st_mtime_ns:x}"
    return {"files": files}


if __name__ == "__main__":
    data = listing(hashed=True)
    path = os.path.join(ROOT, "files.json")
    with open(path, "w") as f:
        json.dump(data, f, separators=(",", ":"))
    print(f"{len(data['files'])} files in {os.path.relpath(path)}", file=sys.stderr)
