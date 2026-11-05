@echo off
rem The spell hands' casts: serves this folder and opens spells.html (close this window to stop it).
cd /d "%~dp0"
start "" http://localhost:8404/spells.html
python tools\fp_arms\serve.py 8404 --no-open
if errorlevel 1 pause
