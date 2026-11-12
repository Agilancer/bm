@echo off
rem The hero viewer: the other Tessariels, their names, guilds, armour colours and moves. Saving writes
rem assets\game\heroes\people.json (close this window to stop).
cd /d "%~dp0"
python tools\heroes\viewer\serve.py
if errorlevel 1 pause
