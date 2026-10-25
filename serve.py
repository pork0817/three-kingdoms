# 本機伺服器（停用快取，方便開發）：python3 serve.py  → http://localhost:8123
import http.server, functools, os, sys
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
os.chdir(os.path.dirname(os.path.abspath(__file__)))
http.server.ThreadingHTTPServer(('', PORT), H).serve_forever()
