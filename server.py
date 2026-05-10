import http.server
import os

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # If the path has a file extension, serve it normally
        if '.' in os.path.basename(self.path):
            super().do_GET()
        else:
            # For all other routes, serve index.html (SPA fallback)
            self.path = '/index.html'
            super().do_GET()

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    server = http.server.HTTPServer(('', 3000), SPAHandler)
    server.serve_forever()
