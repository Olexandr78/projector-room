@echo off
setlocal
cd /d "%~dp0"
title Projector Room Installer

echo ========================================================
echo      PROJECTOR ROOM - INSTALLER
echo ========================================================
echo.

echo [1/3] Checking Python 3...
set "PYTHON_EXE="
where python >nul 2>&1 && set "PYTHON_EXE=python"
if defined PYTHON_EXE goto :PythonFound
where py >nul 2>&1 && set "PYTHON_EXE=py -3"
if defined PYTHON_EXE goto :PythonFound
where python3 >nul 2>&1 && set "PYTHON_EXE=python3"
if defined PYTHON_EXE goto :PythonFound

echo [ERROR] Python 3 was not found.
echo Install Python from https://www.python.org/ and enable "Add Python to PATH".
pause
exit /b 1

:PythonFound
%PYTHON_EXE% --version
if errorlevel 1 goto :PythonFailed

echo.
echo [2/3] Checking installer files...
if not exist "%~dp0installer.py" (
  echo [ERROR] installer.py was not found in this folder.
  pause
  exit /b 1
)
if not exist "%~dp0main.py" (
  echo [ERROR] main.py was not found in this folder.
  pause
  exit /b 1
)

echo.
echo [3/3] Installing dependencies and starting Projector Room...
%PYTHON_EXE% "%~dp0installer.py"
if errorlevel 1 goto :InstallFailed

echo.
echo Installer finished.
exit /b 0

:PythonFailed
echo [ERROR] Python could not start.
pause
exit /b 1

:InstallFailed
echo.
echo [ERROR] Installation failed. Read the error messages above.
pause
exit /b 1
