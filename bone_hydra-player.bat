@echo off
rem The Bone Hydra viewer: serves this folder and opens bone_hydra.html (close this window to stop).
cd /d "%~dp0"
start "" http://localhost:8402/bone_hydra.html
python -m http.server 8402
if errorlevel 1 pause
