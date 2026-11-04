@echo off
rem The crab monster viewer: serves this folder and opens crab.html (close this window to stop).
cd /d "%~dp0"
start "" http://localhost:8402/crab.html
python -m http.server 8402
if errorlevel 1 pause
