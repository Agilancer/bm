"""Serves bm and opens the hero viewer (heroes.html), where the other Tessariels can be named, put in guilds and dyed.
Its Save button POSTs here, and this writes assets/game/heroes/people.json, which the game reads at each start
(src/core/heroes.js makeCast). Commit that file to keep the changes.

    python tools/heroes/viewer/serve.py [port] [--no-open]
"""
import http.server
import json
import os
import sys
import urllib.parse
import webbrowser

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
PEOPLE = os.path.join(ROOT, "assets", "game", "heroes", "people.json")
SLOTS = {"helm", "chest", "shoulders", "arms", "legs", "boots"}


def clean(doc):
    """people.json as the game reads it: {about, heroes: {body: {name?, epithet?, guild?, colours?}}}, nothing else."""
    if not isinstance(doc, dict) or not isinstance(doc.get("heroes"), dict):
        raise ValueError("expected {\"heroes\": {...}}")
    with open(os.path.join(ROOT, "assets", "game", "heroes", "roster.json"), encoding="utf-8") as f:
        bodies = {h["id"] for h in json.load(f)}
    out = {}
    for body, p in sorted(doc["heroes"].items()):
        if body not in bodies or not isinstance(p, dict):
            continue
        e = {}
        for k in ("name", "epithet"):
            if isinstance(p.get(k), str) and p[k].strip():
                e[k] = p[k].strip()[:60]
        if isinstance(p.get("guild"), str):
            e["guild"] = p["guild"].strip()[:60]
        if isinstance(p.get("colours"), dict):
            c = {s: v for s, v in p["colours"].items() if s in SLOTS and isinstance(v, dict) and v}
            if c:
                e["colours"] = c
        if e:
            out[body] = e
    about = doc.get("about") or "Who each of the other Tessariels is, by body (roster.json id), as set in heroes.html."
    return {"about": about, "heroes": out}


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        # (The viewer asks whether it can save here: only this server says yes.)
        if urllib.parse.urlparse(self.path).path == "/people":
            body = b'{"saves": true}'
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def do_POST(self):
        if urllib.parse.urlparse(self.path).path != "/people":
            self.send_error(404)
            return
        try:
            doc = clean(json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"null"))
        except (ValueError, TypeError) as e:
            self.send_error(400, str(e))
            return
        with open(PEOPLE, "w", encoding="utf-8", newline="\n") as f:
            json.dump(doc, f, indent=2, ensure_ascii=False)
            f.write("\n")
        body = json.dumps({"saved": len(doc["heroes"])}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    port = int(args[0]) if args and args[0].isdigit() else 8403
    if "--no-open" not in sys.argv:
        webbrowser.open(f"http://localhost:{port}/heroes.html")
    print(f"http://localhost:{port}/heroes.html (close this window to stop)")
    http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
