@echo off
rem The Gravehart viewer: serves this folder and opens gravehart.html (close this window to stop).
cd /d "%~dp0"
start "" http://localhost:8402/gravehart.html
python -m http.server 8402
if errorlevel 1 pause
