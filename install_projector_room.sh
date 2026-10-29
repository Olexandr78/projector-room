#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

trap 'status=$?; echo "[ERROR] Installer stopped at line $LINENO (exit $status)." >&2; exit "$status"' ERR

echo "============================================================"
echo "    PROJECTOR ROOM - INSTALLER"
echo "============================================================"

if ! command -v python3 >/dev/null 2>&1; then
    echo "[ERROR] Python 3 is required. Install python3 and python3-venv, then retry." >&2
    exit 1
fi
if [[ ! -f "$SCRIPT_DIR/installer.py" || ! -f "$SCRIPT_DIR/main.py" ]]; then
    echo "[ERROR] installer.py or main.py is missing from $SCRIPT_DIR." >&2
    exit 1
fi

echo "[1/3] Checking display configuration..."
if command -v xrandr >/dev/null 2>&1; then
    DISPLAY_LIST="$(xrandr --query | awk '/ connected/ {print $1}' || true)"
    DISPLAY_COUNT="$(printf '%s\n' "$DISPLAY_LIST" | awk 'NF {n++} END {print n+0}')"
    if [[ "$DISPLAY_COUNT" -ge 2 ]]; then
        DISP1="$(printf '%s\n' "$DISPLAY_LIST" | sed -n '1p')"
        DISP2="$(printf '%s\n' "$DISPLAY_LIST" | sed -n '2p')"
        echo "Enabling extended display: $DISP2 to the right of $DISP1"
        xrandr --output "$DISP2" --auto --right-of "$DISP1"
    else
        echo "Only one connected display detected; skipping display extension."
    fi
else
    echo "xrandr is unavailable; skipping display extension."
fi

echo "[2/3] Creating local Python environment..."
if [[ ! -x "$SCRIPT_DIR/.venv/bin/python" ]]; then
    python3 -m venv "$SCRIPT_DIR/.venv"
fi

echo "[3/3] Installing dependencies and launching..."
"$SCRIPT_DIR/.venv/bin/python" -m pip install --upgrade pip
"$SCRIPT_DIR/.venv/bin/python" -m pip install -r "$SCRIPT_DIR/requirements.txt"
"$SCRIPT_DIR/.venv/bin/python" "$SCRIPT_DIR/installer.py"

echo "Installer finished."
