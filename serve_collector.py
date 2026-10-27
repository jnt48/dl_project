"""
serve_collector.py
Serves collect.html over local Wi-Fi with HTTPS for mobile camera access.
"""

import sys
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

import http.server
import ssl
import os
import socket
import subprocess

PORT = 8443

def get_lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

def ensure_ssl_cert():
    cert_file = "collector_cert.pem"
    key_file = "collector_key.pem"
    if not os.path.exists(cert_file) or not os.path.exists(key_file):
        print("Generating self-signed SSL certificate for HTTPS camera access...")
        cmd = [
            "openssl", "req", "-x509", "-newkey", "rsa:2048",
            "-keyout", key_file, "-out", cert_file,
            "-days", "365", "-nodes",
            "-subj", "/CN=NoteReaderCollector"
        ]
        try:
            subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            print("SSL certificate generated successfully.")
            return cert_file, key_file
        except Exception:
            # Fallback to python cryptography or ad-hoc
            pass
    if os.path.exists(cert_file) and os.path.exists(key_file):
        return cert_file, key_file
    return None, None

def run_server():
    lan_ip = get_lan_ip()
    handler = http.server.SimpleHTTPRequestHandler
    httpd = http.server.HTTPServer(('0.0.0.0', PORT), handler)

    cert_file, key_file = ensure_ssl_cert()
    if cert_file and key_file:
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(certfile=cert_file, keyfile=key_file)
        httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
        scheme = "https"
    else:
        scheme = "http"

    print("=" * 65)
    print(" NOTEREADER BURST COLLECTOR SERVER RUNNING")
    print("=" * 65)
    print(f"\nOpen this URL in Chrome on your phone (same Wi-Fi):")
    print(f"👉 {scheme}://{lan_ip}:{PORT}/collect.html\n")
    if scheme == "https":
        print("NOTE: Since this is a local self-signed certificate:")
        print("Tap 'Advanced' -> 'Proceed to 10.x.x.x (unsafe)' to grant camera access.")
    else:
        print("NOTE: If Chrome blocks camera over HTTP, enable in chrome://flags:")
        print(f"  unsafely-treat-insecure-origin-as-secure -> http://{lan_ip}:{PORT}")
    print("=" * 65)
    httpd.serve_forever()

if __name__ == '__main__':
    run_server()
