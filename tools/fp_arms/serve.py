"""Serves bm and opens the swing viewer (swings.html). POST /shot?name=x saves a review sheet to
tools/fp_arms/build/shots/x.png.

    python tools/fp_arms/serve.py [port] [--no-open]
"""
import http.server
import os
import re
import sys
import urllib.parse
import webbrowser

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SHOTS = os.path.join(ROOT, "tools", "fp_arms", "build", "shots")


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_POST(self):
        u = urllib.parse.urlparse(self.path)
        if u.path != "/shot":
            self.send_error(404)
            return
        name = re.sub(r"[^\w.-]", "_", urllib.parse.parse_qs(u.query).get("name", ["shot"])[0])
        os.makedirs(SHOTS, exist_ok=True)
        with open(os.path.join(SHOTS, name + ".png"), "wb") as f:
            f.write(self.rfile.read(int(self.headers.get("Content-Length", 0))))
        self.send_response(200)
        self.end_headers()

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    port = int(args[0]) if args else 8401
    if "--no-open" not in sys.argv:
        webbrowser.open(f"http://localhost:{port}/swings.html")
    print(f"http://localhost:{port}/swings.html (close this window to stop)")
    http.server.ThreadingHTTPServer(("localhost", port), Handler).serve_forever()
