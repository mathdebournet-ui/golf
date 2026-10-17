@echo off
rem Double-clique sur ce fichier pour mettre a jour fiches.json.
chcp 65001 >nul
set PYTHONUTF8=1

rem 1) Python embarque du dossier "project claude" (deja equipe de pypdf et python-docx)
set PY=%~dp0..\..\python-runtime\python.exe
if exist "%PY%" goto lancer

rem 2) Sinon, le Python installe sur l'ordinateur
set PY=python

:lancer
"%PY%" "%~dp0maj_fiches.py"
echo.
pause
