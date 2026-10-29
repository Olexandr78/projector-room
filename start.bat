@echo off
cd /d "%~dp0"
title Projector Room Launcher

echo [1/2] Enabling Screen Extension mode: displayswitch /extend
start "" displayswitch.exe /extend
ping 127.0.0.1 -n 2 >nul 2>&1

echo [2/2] Launching Projector Room...
set "PYTHON_EXE="
where python >nul 2>&1 && set "PYTHON_EXE=python"
if defined PYTHON_EXE goto :LaunchPython
where py >nul 2>&1 && set "PYTHON_EXE=py -3"
if defined PYTHON_EXE goto :LaunchPython
where python3 >nul 2>&1 && set "PYTHON_EXE=python3"
if defined PYTHON_EXE goto :LaunchPython

echo [ERROR] Python 3 is not installed or not in PATH!
pause
exit /b 1

:LaunchPython
start "" %PYTHON_EXE% "%~dp0main.py"
exit /b 0
