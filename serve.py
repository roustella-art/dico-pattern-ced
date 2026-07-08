#!/usr/bin/env python3
import http.server, socketserver, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
PORT = 8766
class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"http://localhost:{PORT}")
    httpd.serve_forever()
