#!/usr/bin/env python3
"""
AyurAyush AI - Lightweight Backend Server & Excel Login Logger
-------------------------------------------------------------
Zero External Dependencies (Uses Python standard library only).
Saves all user login sessions directly into 'user_logins.csv' (Excel-compatible)
and serves the web application.

Usage:
    python server.py
Then open http://localhost:8000 in your browser.
"""

import http.server
import socketserver
import json
import csv
import os
import sys
from datetime import datetime

PORT = 8000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_FILE = os.path.join(BASE_DIR, 'user_logins.csv')
JSON_FILE = os.path.join(BASE_DIR, 'user_logins.json')

def init_excel_file():
    """Ensure the user_logins.csv file exists with UTF-8 BOM and headers for Microsoft Excel."""
    if not os.path.exists(CSV_FILE):
        with open(CSV_FILE, mode='w', newline='', encoding='utf-8-sig') as f:
            writer = csv.writer(f)
            writer.writerow([
                'Log ID',
                'User Full Name',
                'Email / Mobile ID',
                'Portal Role',
                'Login Date & Time',
                'Device Platform',
                'Session Status'
            ])
        print(f"[INIT] Created Excel login store: {CSV_FILE}")

class AyurAyushHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def do_GET(self):
        # API: Export Login Logs CSV directly
        if self.path == '/api/export-logins':
            init_excel_file()
            try:
                with open(CSV_FILE, 'rb') as f:
                    content = f.read()
                self.send_response(200)
                self.send_header('Content-Type', 'text/csv; charset=utf-8')
                self.send_header('Content-Disposition', 'attachment; filename="AyurAyush_User_Logins.csv"')
                self.send_header('Content-Length', str(len(content)))
                self.end_headers()
                self.wfile.write(content)
                return
            except Exception as e:
                self.send_error(500, f"Error reading CSV: {str(e)}")
                return

        # API: Get Logins in JSON
        if self.path == '/api/logins':
            init_excel_file()
            records = []
            try:
                if os.path.exists(CSV_FILE):
                    with open(CSV_FILE, mode='r', encoding='utf-8-sig') as f:
                        reader = csv.DictReader(f)
                        for row in reader:
                            records.append({
                                'id': row.get('Log ID', ''),
                                'name': row.get('User Full Name', ''),
                                'email': row.get('Email / Mobile ID', ''),
                                'role': row.get('Portal Role', ''),
                                'loginTime': row.get('Login Date & Time', ''),
                                'device': row.get('Device Platform', ''),
                                'status': row.get('Session Status', '')
                            })
                payload = json.dumps({'success': True, 'records': records}).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
                return
            except Exception as e:
                self.send_error(500, str(e))
                return

        # API: Health Status
        if self.path == '/api/status':
            payload = json.dumps({
                'status': 'online',
                'backend': 'Python Standalone Server',
                'excel_file': os.path.basename(CSV_FILE),
                'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return

        # Default: Serve static files
        super().do_GET()

    def do_POST(self):
        # API: Record a new login event directly to Excel CSV file
        if self.path == '/api/login-log':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
            except Exception as e:
                self.send_error(400, f"Invalid JSON payload: {str(e)}")
                return

            init_excel_file()

            log_id = data.get('id', 'LOG-' + datetime.now().strftime('%f')[:6])
            user_name = data.get('name', 'Anonymous User')
            email = data.get('email', 'N/A')
            role = data.get('role', 'KIOSK').upper()
            login_time = data.get('loginTime', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
            device = data.get('device', 'Web Browser')
            status = data.get('status', 'Success')

            # Append to Excel-compatible CSV file
            try:
                with open(CSV_FILE, mode='a', newline='', encoding='utf-8-sig') as f:
                    writer = csv.writer(f)
                    writer.writerow([log_id, user_name, email, role, login_time, device, status])
                
                print(f"[EXCEL LOG SAVED] {log_id} | {user_name} ({role}) | {login_time} -> {os.path.basename(CSV_FILE)}")

                response_payload = json.dumps({
                    'success': True,
                    'message': f"Login details stored in Excel ({os.path.basename(CSV_FILE)})",
                    'file': os.path.basename(CSV_FILE),
                    'record': {
                        'id': log_id,
                        'name': user_name,
                        'email': email,
                        'role': role,
                        'loginTime': login_time
                    }
                }).encode('utf-8')

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(response_payload)))
                self.end_headers()
                self.wfile.write(response_payload)
            except Exception as e:
                self.send_error(500, f"Failed to write to Excel CSV: {str(e)}")
            return

        self.send_error(404, "Endpoint not found")

def run():
    init_excel_file()
    print("=" * 65)
    print("  AyurAyush AI - Standalone Backend Server & Excel Logger")
    print(f"  Server URL: http://localhost:{PORT}")
    print(f"  Login Excel File: {CSV_FILE}")
    print("=" * 65)
    
    # Allow address reuse
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), AyurAyushHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n[SHUTDOWN] Server stopped.")

if __name__ == '__main__':
    run()
