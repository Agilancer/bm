@echo off
rem Bellmourn: The Knight of Velscour. Serves the game with shared memory on, then opens it.
cd /d "%~dp0"
python tools\serve.py 8402
