#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build a single-file Windows portable edition with PyInstaller."""

from __future__ import annotations

import os
import platform
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST_DIR = ROOT / "dist"
BUILD_DIR = ROOT / "build" / "pyinstaller"
SPEC_DIR = ROOT / "build" / "pyinstaller-spec"
PORTABLE_DIR = ROOT / "portable"
EXE_PATH = PORTABLE_DIR / "ProjectorRoom.exe"
ZIP_PATH = ROOT / "ProjectorRoom-Portable-Windows-x64.zip"
README_PATH = ROOT / "README_PORTABLE.txt"


def main() -> int:
    if platform.system() != "Windows":
        print("ERROR: PyInstaller Windows builds must be run on Windows.")
        return 2

    if not (DIST_DIR / "index.html").is_file():
        print("ERROR: dist/index.html is missing. Build the React interface first.")
        return 2

    try:
        import PyInstaller  # noqa: F401
    except ImportError:
        print("ERROR: PyInstaller is not installed.")
        print(f'Run: "{sys.executable}" -m pip install -r requirements.txt pyinstaller==6.22.3')
        return 2

    PORTABLE_DIR.mkdir(parents=True, exist_ok=True)
    BUILD_DIR.mkdir(parents=True, exist_ok=True)
    SPEC_DIR.mkdir(parents=True, exist_ok=True)
    if EXE_PATH.exists():
        EXE_PATH.unlink()

    pyinstaller = [
        sys.executable, "-m", "PyInstaller",
        "--noconfirm",
        "--clean",
        "--onefile",
        "--windowed",
        "--name", "ProjectorRoom",
        "--distpath", str(PORTABLE_DIR),
        "--workpath", str(BUILD_DIR),
        "--specpath", str(SPEC_DIR),
        "--add-data", f"{DIST_DIR}{os.pathsep}dist",
        "--collect-all", "webview",
        "--collect-all", "pythonnet",
        "--collect-all", "clr_loader",
        "--collect-all", "comtypes",
        "--collect-all", "fitz",
        "--collect-all", "PIL",
        "--collect-all", "pptx",
        "--collect-all", "yt_dlp",
        "--hidden-import", "clr",
        "--hidden-import", "vlc",
        "--hidden-import", "webview.platforms.winforms",
        "--hidden-import", "webview.platforms.edgechromium",
        str(ROOT / "main.py"),
    ]

    print("Building Projector Room as a one-file Windows executable...")
    print("This bundles Python, installed dependencies and dist/ into ProjectorRoom.exe.")
    result = subprocess.run(pyinstaller, cwd=ROOT, check=False)
    if result.returncode != 0:
        print(f"ERROR: PyInstaller failed with exit code {result.returncode}.")
        return result.returncode

    if not EXE_PATH.is_file():
        print(f"ERROR: PyInstaller did not create {EXE_PATH}.")
        return 3

    shutil.copy2(README_PATH, PORTABLE_DIR / "README_PORTABLE.txt")
    if ZIP_PATH.exists():
        ZIP_PATH.unlink()

    with zipfile.ZipFile(ZIP_PATH, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        archive.write(EXE_PATH, "ProjectorRoom.exe")
        archive.write(PORTABLE_DIR / "README_PORTABLE.txt", "README_PORTABLE.txt")

    size_mb = EXE_PATH.stat().st_size / (1024 * 1024)
    zip_mb = ZIP_PATH.stat().st_size / (1024 * 1024)
    print(f"SUCCESS: {EXE_PATH} ({size_mb:.1f} MB)")
    print(f"SUCCESS: {ZIP_PATH} ({zip_mb:.1f} MB)")
    print("Next: run ProjectorRoom.exe --portable-smoke-test to check the packaged imports.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
