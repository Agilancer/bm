@echo off
rem Bellmourn : Velscour's Throne. Serves the game with shared memory on, then opens it.
cd /d "%~dp0"
python tools\serve.py 8402
