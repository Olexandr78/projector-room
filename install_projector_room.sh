#!/usr/bin/env bash
# Автоматический инсталлятор «Проекторная комната» для Linux / Raspberry Pi

set -e

echo "============================================================"
echo "    АВТОМАТИЧЕСКИЙ ИНСТАЛЛЯТОР «ПРОЕКТОРНАЯ КОМНАТА»"
echo "============================================================"

# 1. Режим расширения экранов через xrandr если доступен
if command -v xrandr >/dev/null 2>&1; then
    echo "[1/4] Настройка экранов через xrandr..."
    CONNECTED_DISPLAYS=$(xrandr | grep " connected" | awk '{print $1}')
    DISPLAY_COUNT=$(echo "$CONNECTED_DISPLAYS" | wc -l)
    if [ "$DISPLAY_COUNT" -ge 2 ]; then
        DISP1=$(echo "$CONNECTED_DISPLAYS" | head -n1)
        DISP2=$(echo "$CONNECTED_DISPLAYS" | head -n2 | tail -n1)
        echo "Включение расширения: $DISP2 справа от $DISP1"
        xrandr --output "$DISP2" --auto --right-of "$DISP1" || true
    fi
fi

# 2. Установка библиотек
echo "[2/4] Установка библиотек Python..."
python3 -m pip install -r requirements.txt || true

# 3. Инициализация конфига и ярлыков
echo "[3/4] Инициализация конфигурации и классов..."
python3 installer.py

# 4. Запуск
echo "[4/4] Запуск приложения..."
python3 main.py &

echo "Готово!"
