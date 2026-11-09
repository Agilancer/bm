@echo off
rem The Lisandra (Pretty) viewer: serves this folder and opens lisandra.html (close this window to stop).
cd /d "%~dp0"
start "" http://localhost:8402/lisandra.html
python -m http.server 8402
if errorlevel 1 pause
