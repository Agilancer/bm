@echo off
rem The swing viewer: serves this folder and opens swings.html (close this window to stop).
cd /d "%~dp0"
python tools\fp_arms\serve.py
if errorlevel 1 pause
