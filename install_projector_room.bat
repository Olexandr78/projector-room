@echo off
cd /d "%~dp0"
title Projector Room - Auto Installer and Launcher

echo ========================================================
echo      PROJECTOR ROOM - Classroom Projection Hub
echo ========================================================
echo.

echo [1/4] Enabling Screen Extension mode: displayswitch /extend
start "" displayswitch.exe /extend
ping 127.0.0.1 -n 2 >nul 2>&1

echo [2/4] Checking Python 3 installation...
set "PYTHON_EXE="
where python >nul 2>&1 && set "PYTHON_EXE=python"
if defined PYTHON_EXE goto :PythonFound
where py >nul 2>&1 && set "PYTHON_EXE=py -3"
if defined PYTHON_EXE goto :PythonFound
where python3 >nul 2>&1 && set "PYTHON_EXE=python3"
if defined PYTHON_EXE goto :PythonFound

echo [ERROR] Python 3 was not found in PATH!
echo Please install Python 3 from https://www.python.org/
echo Make sure to check "Add Python to PATH" during installation.
echo.
pause
exit /b 1

:PythonFound
echo Python detected: %PYTHON_EXE%

if exist "%~dp0requirements.txt" goto :InstallReqFile

echo [3/4] Installing default packages: Pillow python-vlc PyMuPDF python-pptx yt-dlp
%PYTHON_EXE% -m pip install Pillow python-vlc PyMuPDF python-pptx yt-dlp
goto :LaunchApp

:InstallReqFile
echo [3/4] Installing required libraries from requirements.txt
%PYTHON_EXE% -m pip install --upgrade pip
%PYTHON_EXE% -m pip install -r "%~dp0requirements.txt"

:LaunchApp
echo [4/4] Starting Projector Room main.py...
start "" %PYTHON_EXE% "%~dp0main.py"

echo.
echo ========================================================
echo SUCCESS: Projector Room is running!
echo ========================================================
ping 127.0.0.1 -n 3 >nul 2>&1
exit /b 0
