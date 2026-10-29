#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Автоматический инсталлятор «Проекторная комната».
Выполняет полную настройку системы в один клик:
1. Включает режим расширения экрана на второй монитор/проектор (Extend Displays).
2. Проверяет и устанавливает необходимые библиотеки Python (Pillow, VLC, PyMuPDF, PPTX).
3. Создает конфигурационные файлы и базу классов (projector_config.json).
4. Создает ярлык запуска на рабочем столе.
5. Запускает приложение.
"""

import os
import sys
import subprocess
import json
import shutil
import platform

APP_NAME = "Проекторная комната"
DIR_PATH = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(DIR_PATH, "projector_config.json")
REQUIREMENTS_PATH = os.path.join(DIR_PATH, "requirements.txt")
MAIN_SCRIPT_PATH = os.path.join(DIR_PATH, "main.py")

DEFAULT_CONFIG = {
  "room_name": "",
  "teacher_name": "",
  "school_name": "",
  "aspect_ratio": "16:9",
  "resolution_preset": "",
  "screen_number": 1,
  "active_class_id": "",
  "classes": [],
  "projector_bounds": {
    "left_margin": 0,
    "right_margin": 0,
    "top_margin": 0,
    "bottom_margin": 0,
    "scale_x": 100,
    "scale_y": 100,
    "offset_x": 0,
    "offset_y": 0,
    "aspect_ratio": "16:9",
    "calibrated": False
  }
}


def log(msg, symbol="✦"):
    print(f"[{symbol}] {msg}")


def enable_screen_extension():
    """Включение режима 'Расширить эти экраны' (Windows / Linux)"""
    system = platform.system()
    log(f"Определение операционной системы: {system}...")

    if system == "Windows":
        try:
            log("Включение режима расширения экрана через displayswitch.exe /extend...")
            result = subprocess.run(["displayswitch.exe", "/extend"], check=False)
            if result.returncode == 0:
                log("Команда расширения экранов передана Windows.", "✔")
            else:
                log(f"Windows не подтвердила переключение экранов (код {result.returncode}).", "⚠")
        except Exception as e:
            log(f"Не удалось запустить displayswitch: {e}", "⚠")
    elif system == "Linux":
        try:
            log("Поиск подключенных видеовыходов через xrandr...")
            out = subprocess.check_output(["xrandr"]).decode("utf-8")
            connected = [line.split()[0] for line in out.splitlines() if " connected" in line]
            if len(connected) >= 2:
                primary = connected[0]
                secondary = connected[1]
                log(f"Настройка расширения экрана: {secondary} справа от {primary}...")
                subprocess.run(["xrandr", "--output", secondary, "--auto", "--right-of", primary], check=False)
                log(f"Экраны объединены: {primary} + {secondary}", "✔")
            else:
                log("Обнаружен один активный дисплей. Подключите проектор к разъему HDMI/VGA.", "ℹ")
        except Exception as e:
            log(f"Команда xrandr недоступна: {e}", "ℹ")


def install_python_libraries():
    """Проверка и установка необходимых pip пакетов"""
    log("Проверка установленных библиотек Python...")
    required_packages = [
        "Pillow",
        "python-vlc",
        "PyMuPDF",
        "python-pptx"
    ]
    if platform.system() == "Windows":
        required_packages.append("comtypes")

    # Retry transient TLS/network failures and avoid reusing a partially
    # downloaded/corrupted wheel from pip's cache.
    pip_cmd = [
        sys.executable, "-m", "pip", "install",
        "--retries", "10",
        "--timeout", "60",
        "--no-cache-dir",
        "--disable-pip-version-check",
    ]
    if os.path.exists(REQUIREMENTS_PATH):
        cmd = pip_cmd + ["-r", REQUIREMENTS_PATH]
    else:
        cmd = pip_cmd + required_packages

    try:
        log("Установка библиотек (Pillow, VLC, PyMuPDF 1.x, PPTX)... Пожалуйста, подождите...")
        log("Для временных ошибок сети предусмотрено до 10 повторных попыток.", "ℹ")
        subprocess.run(cmd, check=True)
        log("Все библиотеки успешно установлены!", "✔")
    except subprocess.CalledProcessError as e:
        log(f"Не удалось установить необходимые библиотеки: {e}", "✖")
        log("Проверьте интернет-соединение и повторите запуск установщика. Частично скачанные файлы не будут взяты из кэша.", "ℹ")
        return False
    except OSError as e:
        log(f"Не удалось запустить pip: {e}", "✖")
        return False
    return True


def build_frontend():
    """Install and compile the existing React website for the desktop WebView."""
    package_json = os.path.join(DIR_PATH, "package.json")
    if not os.path.isfile(package_json):
        log("Не найден package.json: исходный веб-интерфейс отсутствует.", "✖")
        return False

    npm = shutil.which("npm") or shutil.which("npm.cmd")
    if not npm:
        log("Для сборки встроенного интерфейса нужен Node.js с npm.", "✖")
        log("Установите LTS-версию Node.js с https://nodejs.org/ и снова запустите установщик.", "ℹ")
        return False

    commands = [
        [npm, "install", "--no-audit", "--no-fund", "--fetch-retries=5", "--fetch-timeout=120000"],
        [npm, "run", "build"],
    ]
    for command in commands:
        try:
            log("Подготовка веб-интерфейса Projector Room: " + " ".join(command[1:]), "ℹ")
            subprocess.run(command, cwd=DIR_PATH, check=True)
        except (subprocess.CalledProcessError, OSError) as exc:
            log("Не удалось собрать веб-интерфейс: {}".format(exc), "✖")
            return False

    built_index = os.path.join(DIR_PATH, "dist", "index.html")
    if not os.path.isfile(built_index):
        log("Сборка завершилась без dist/index.html.", "✖")
        return False
    log("Веб-интерфейс собран и готов к запуску в настольном окне.", "✔")
    return True


def initialize_config_and_classes():
    """Создание файла конфигурации с базой классов и калибровкой граней"""
    if not os.path.exists(CONFIG_PATH):
        log(f"Создание конфигурационного файла: {CONFIG_PATH}...")
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(DEFAULT_CONFIG, f, ensure_ascii=False, indent=2)
        log("Конфигурация с базой классов и гранями проектора создана!", "✔")
    else:
        log(f"Файл {CONFIG_PATH} уже существует, сохраняем пользовательские настройки.", "✔")


def create_desktop_shortcut():
    """Создание ярлыка запуска на Рабочем столе"""
    system = platform.system()
    desktop_dir = os.path.expanduser("~/Desktop")
    if not os.path.exists(desktop_dir):
        desktop_dir = os.path.expanduser("~/Рабочий стол")

    if os.path.exists(desktop_dir):
        if system == "Windows":
            # Write desktop launcher and local start.bat & install_projector_room.bat
            desk_bat = os.path.join(desktop_dir, "Projector_Room.bat")
            content = (
                "@echo off\r\n"
                f'cd /d "{DIR_PATH}"\r\n'
                "if exist start.bat goto :RunStart\r\n"
                'start "" python main.py\r\n'
                "exit /b 0\r\n"
                "\r\n"
                ":RunStart\r\n"
                "call start.bat\r\n"
                "exit /b 0\r\n"
            )
            try:
                with open(desk_bat, "wb") as f:
                    f.write(content.encode("ascii", errors="replace"))
                log(f"Ярлык программы создан на Рабочем столе: {desk_bat}", "✔")
            except Exception as e:
                log(f"Не удалось записать ярлык на рабочий стол: {e}", "ℹ")
        elif system == "Linux":
            desktop_file = os.path.join(desktop_dir, "projector_room.desktop")
            try:
                content = f"""[Desktop Entry]
Type=Application
Name={APP_NAME}
Comment=Пульт управления проектором
Exec={sys.executable} {MAIN_SCRIPT_PATH}
Path={DIR_PATH}
Terminal=false
Categories=Education;Utility;
"""
                with open(desktop_file, "w", encoding="utf-8") as f:
                    f.write(content)
                os.chmod(desktop_file, 0o755)
                log(f"Ярлык создан на Рабочем столе: {desktop_file}", "✔")
            except Exception as e:
                log(f"Не удалось записать .desktop файл: {e}", "ℹ")


def launch_application():
    """Запуск основного приложения"""
    log("Запуск «Проекторная комната»...")
    if not os.path.isfile(MAIN_SCRIPT_PATH):
        log(f"Не найден основной файл: {MAIN_SCRIPT_PATH}", "✖")
        return False
    try:
        subprocess.Popen([sys.executable, MAIN_SCRIPT_PATH], cwd=DIR_PATH)
        log("Программа запущена.", "✔")
        return True
    except OSError as e:
        log(f"Не удалось запустить приложение: {e}", "✖")
        return False


def main():
    print("=" * 60)
    print("      ИНСТАЛЛЯТОР И НАСТРОЙКА «ПРОЕКТОРНАЯ КОМНАТА»")
    print("=" * 60)

    # 1. Включаем расширение экранов
    enable_screen_extension()

    # 2. Устанавливаем библиотеки Python
    if not install_python_libraries():
        log("Установка остановлена: исправьте ошибку установки библиотек и повторите запуск.", "✖")
        return 1

    # 3. Собираем существующий React-интерфейс для настольного WebView
    if not build_frontend():
        log("Установка остановлена: сначала исправьте проблему со сборкой интерфейса.", "✖")
        return 1

    # 4. Создаем конфигурацию и параметры проектора
    initialize_config_and_classes()

    # 5. Создаем ярлык на рабочем столе
    create_desktop_shortcut()

    # 6. Запуск
    print("-" * 60)
    if not launch_application():
        return 1
    log("Установка и настройка завершена.", "★")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
    """Создание файла конфигурации с базой классов и калибровкой граней"""
    if not os.path.exists(CONFIG_PATH):
        log(f"Создание конфигурационного файла: {CONFIG_PATH}...")
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(DEFAULT_CONFIG, f, ensure_ascii=False, indent=2)
        log("Конфигурация с базой классов и гранями проектора создана!", "✔")
    else:
        log(f"Файл {CONFIG_PATH} уже существует, сохраняем пользовательские настройки.", "✔")


def create_desktop_shortcut():
    """Создание ярлыка запуска на Рабочем столе"""
    system = platform.system()
    desktop_dir = os.path.expanduser("~/Desktop")
    if not os.path.exists(desktop_dir):
        desktop_dir = os.path.expanduser("~/Рабочий стол")

    if os.path.exists(desktop_dir):
        if system == "Windows":
            # Write desktop launcher and local start.bat & install_projector_room.bat
            desk_bat = os.path.join(desktop_dir, "Projector_Room.bat")
            content = (
                "@echo off\r\n"
                f'cd /d "{DIR_PATH}"\r\n'
                "if exist start.bat goto :RunStart\r\n"
                'start "" python main.py\r\n'
                "exit /b 0\r\n"
                "\r\n"
                ":RunStart\r\n"
                "call start.bat\r\n"
                "exit /b 0\r\n"
            )
            try:
                with open(desk_bat, "wb") as f:
                    f.write(content.encode("ascii", errors="replace"))
                log(f"Ярлык программы создан на Рабочем столе: {desk_bat}", "✔")
            except Exception as e:
                log(f"Не удалось записать ярлык на рабочий стол: {e}", "ℹ")
        elif system == "Linux":
            desktop_file = os.path.join(desktop_dir, "projector_room.desktop")
            try:
                content = f"""[Desktop Entry]
Type=Application
Name={APP_NAME}
Comment=Пульт управления проектором
Exec={sys.executable} {MAIN_SCRIPT_PATH}
Path={DIR_PATH}
Terminal=false
Categories=Education;Utility;
"""
                with open(desktop_file, "w", encoding="utf-8") as f:
                    f.write(content)
                os.chmod(desktop_file, 0o755)
                log(f"Ярлык создан на Рабочем столе: {desktop_file}", "✔")
            except Exception as e:
                log(f"Не удалось записать .desktop файл: {e}", "ℹ")


def launch_application():
    """Запуск основного приложения"""
    log("Запуск «Проекторная комната»...")
    if not os.path.isfile(MAIN_SCRIPT_PATH):
        log(f"Не найден основной файл: {MAIN_SCRIPT_PATH}", "✖")
        return False
    try:
        subprocess.Popen([sys.executable, MAIN_SCRIPT_PATH], cwd=DIR_PATH)
        log("Программа запущена.", "✔")
        return True
    except OSError as e:
        log(f"Не удалось запустить приложение: {e}", "✖")
        return False


def main():
    print("=" * 60)
    print("      ИНСТАЛЛЯТОР И НАСТРОЙКА «ПРОЕКТОРНАЯ КОМНАТА»")
    print("=" * 60)

    # 1. Включаем расширение экранов
    enable_screen_extension()

    # 2. Устанавливаем библиотеки
    if not install_python_libraries():
        log("Установка остановлена: исправьте ошибку установки библиотек и повторите запуск.", "✖")
        return 1

    # 3. Создаем конфигурацию и параметры проектора
    initialize_config_and_classes()

    # 4. Создаем ярлык на рабочем столе
    create_desktop_shortcut()

    # 5. Запуск
    print("-" * 60)
    if not launch_application():
        return 1
    log("Установка и настройка завершена.", "★")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
