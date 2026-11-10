"""Serves bm with the headers that give the game shared memory across threads. POST /shot?name=x saves a
screenshot to tools/build/shots/x.png, for reviews. GET /files.json is made fresh each time (tools/files.py): the
version of every game file, which the game's service worker reads at each start to keep the game on the player's device
and download only what changed.

    python tools/serve.py [port] [--no-open]

WebGPU needs a secure context, so a phone on your network needs HTTPS. With a certificate, this serves your
whole LAN (e.g. from mkcert, whose root the phone trusts):

    python tools/serve.py 8443 --lan --cert cert.pem --key key.pem
"""
import http.server
import os
import re
import socket
import ssl
import sys
import threading
import urllib.parse
import webbrowser

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from files import listing  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = os.path.join(ROOT, "tools", "build", "shots")


_files = {"t": 0.0, "body": b""}
_files_lock = threading.Lock()


def files_json():
    """files.json from the files as they are now (a second's grace, for the burst of requests at a start)."""
    import time
    with _files_lock:
        now = time.monotonic()
        if now - _files["t"] > 1.0:
            import json
            _files["body"] = json.dumps(listing(ROOT), separators=(",", ":")).encode()
            _files["t"] = now
        return _files["body"]


class ServerV6(http.server.ThreadingHTTPServer):
    address_family = socket.AF_INET6


class Handler(http.server.SimpleHTTPRequestHandler):
    lan = False
    protocol_version = "HTTP/1.1"  # keep connections open: a load is about a hundred small files
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".js": "text/javascript", ".webp": "image/webp", ".glb": "model/gltf-binary", ".webmanifest": "application/manifest+json"}

    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def end_headers(self):
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def _hidden(self):
        """On a network, nothing but the game: no dotfiles such as .git, no tools."""
        parts = urllib.parse.unquote(urllib.parse.urlparse(self.path).path).split("/")
        return self.lan and (any(p.startswith(".") and p not in ("", ".") for p in parts) or (len(parts) > 1 and parts[1] in ("tools", "art")))

    def do_GET(self):
        if self._hidden():
            self.send_error(404)
            return
        if urllib.parse.urlparse(self.path).path == "/files.json":
            body = files_json()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def do_HEAD(self):
        if self._hidden():
            self.send_error(404)
            return
        super().do_HEAD()

    def do_POST(self):
        u = urllib.parse.urlparse(self.path)
        if u.path != "/shot" or self.lan:
            self.send_error(404)
            return
        name = re.sub(r"[^\w.-]", "_", urllib.parse.parse_qs(u.query).get("name", ["shot"])[0])
        os.makedirs(SHOTS, exist_ok=True)
        with open(os.path.join(SHOTS, name + ".png"), "wb") as f:
            f.write(self.rfile.read(int(self.headers.get("Content-Length", 0))))
        self.send_response(200)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    port = int(args[0]) if args and args[0].isdigit() else 8402
    if "--no-open" not in sys.argv:
        webbrowser.open(f"http://localhost:{port}/")
    print(f"http://localhost:{port}/ (close this window to stop)")
    if "--lan" in sys.argv:
        Handler.lan = True
        server = http.server.ThreadingHTTPServer(("0.0.0.0", port), Handler)
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ctx.load_cert_chain(sys.argv[sys.argv.index("--cert") + 1], sys.argv[sys.argv.index("--key") + 1])
        server.socket = ctx.wrap_socket(server.socket, server_side=True)
        print(f"https://<this machine>:{port}/")
        server.serve_forever()
    # Both loopback addresses: on Windows a browser that tries ::1 first otherwise stalls on every connection.
    try:
        threading.Thread(target=ServerV6(("::1", port), Handler).serve_forever, daemon=True).start()
    except OSError:
        pass
    http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
