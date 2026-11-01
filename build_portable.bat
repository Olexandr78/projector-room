@echo off
setlocal
cd /d "%~dp0"
title Projector Room - Portable EXE Builder

echo ========================================================
echo       PROJECTOR ROOM - PORTABLE WINDOWS BUILDER
echo ========================================================
echo.

where py >nul 2>&1
if %errorlevel%==0 (
    set "PYTHON=py -3.11"
) else (
    where python >nul 2>&1
    if %errorlevel%==0 (
        set "PYTHON=python"
    ) else (
        echo [ERROR] Python 3.11 was not found.
        echo Install Python 3.11, then run this file again.
        pause
        exit /b 1
    )
)

echo [1/4] Installing application requirements...
%PYTHON% -m pip install --disable-pip-version-check -r requirements.txt
if errorlevel 1 goto :Failed

echo.
echo [2/4] Installing PyInstaller...
%PYTHON% -m pip install --disable-pip-version-check pyinstaller==6.22.3
if errorlevel 1 goto :Failed

echo.
echo [3/4] Building portable EXE...
%PYTHON% build_portable.py
if errorlevel 1 goto :Failed

echo.
echo [4/4] Finished.
echo The portable package is ProjectorRoom-Portable-Windows-x64.zip
echo The executable is in the portable folder.
pause
exit /b 0

:Failed
echo.
echo [ERROR] Portable build failed. Read the error above.
pause
exit /b 1
