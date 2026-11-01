PROJECTOR ROOM — PORTABLE WINDOWS EDITION
==========================================

CONTENTS
--------
ProjectorRoom.exe       Single-file application. Python is bundled inside.
No Python, pip or Node.js installation is required on the school computer.

FIRST RUN
---------
1. Extract ProjectorRoom-Portable-Windows-x64.zip into a writable folder
   (for example, a folder on the Desktop or a USB drive).
2. Double-click ProjectorRoom.exe.
3. Connect the projector and select Windows display mode "Extend" if needed.

REQUIREMENT: MICROSOFT EDGE WEBVIEW2 RUNTIME
--------------------------------------------
Projector Room uses pywebview with Microsoft's WebView2 engine.
The WebView2 Runtime must be installed on the school computer. It is separate
from this EXE and is normally already present on up-to-date Windows 10/11 PCs.

Check Windows Settings > Apps for "Microsoft Edge WebView2 Runtime".
If it is missing, install the Evergreen Runtime from Microsoft's official page:
https://developer.microsoft.com/microsoft-edge/webview2/

The small Evergreen Bootstrapper needs an internet connection. School IT may
need to approve or install it on managed computers.

PORTABLE DATA
-------------
The application stores projector_config.json and diagnostic logs next to
ProjectorRoom.exe. If that folder is write-protected, it falls back to:
%LOCALAPPDATA%\ProjectorRoom

The logs are:
  projector_room.log
  projector_room_threads.log

The app's bundled web interface is extracted to a temporary PyInstaller
folder at startup. Uploaded PDFs are temporary for that session.

OPTIONAL VLC FEATURE
--------------------
The local-video player uses VLC through python-vlc. For local video playback,
install VLC Media Player on the computer if the VLC engine is not available.
The rest of the application and its web browser do not require VLC.

BUILDING FROM SOURCE
--------------------
On a Windows build computer with Python 3.11:
  build_portable.bat

This uses PyInstaller to create:
  portable\ProjectorRoom.exe
  ProjectorRoom-Portable-Windows-x64.zip

The Windows EXE is built on Windows; it is not cross-compiled from Linux.

TROUBLESHOOTING
---------------
If the app does not start, keep the EXE in a writable folder and check the
diagnostic files beside it (or in %LOCALAPPDATA%\ProjectorRoom).
For missing WebView2 Runtime, contact school IT or install the official
Microsoft Evergreen Runtime.
