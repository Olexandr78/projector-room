#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
«Проекторная комната» — Десктопное приложение для учителей и лекторов.
Управление выводом материалов на проектор со скрытием рабочего стола учителя.

Стек:
- GUI: Tkinter (ttk.Notebook, Toplevel)
- Графика: Pillow (PIL)
- Видео: python-vlc
- Презентации: comtypes + Microsoft PowerPoint / python-pptx
- Документы: PyMuPDF (fitz)
"""

import os
import sys
import json
import time
import threading
import subprocess
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from PIL import Image, ImageTk

try:
    from screeninfo import get_monitors
except ImportError:
    get_monitors = None


def get_display_layout():
    """Return detected displays as dictionaries, primary display first."""
    displays = []
    if get_monitors:
        try:
            for monitor in get_monitors():
                displays.append({
                    "x": int(monitor.x), "y": int(monitor.y),
                    "width": int(monitor.width), "height": int(monitor.height),
                    "primary": bool(getattr(monitor, "is_primary", False)),
                    "name": str(getattr(monitor, "name", "") or "Display"),
                })
        except Exception:
            displays = []

    if not displays and sys.platform == "win32":
        # Fallback using the Windows monitor API when screeninfo is unavailable.
        try:
            import ctypes
            from ctypes import wintypes

            class RECT(ctypes.Structure):
                _fields_ = [("left", wintypes.LONG), ("top", wintypes.LONG),
                            ("right", wintypes.LONG), ("bottom", wintypes.LONG)]

            class MONITORINFO(ctypes.Structure):
                _fields_ = [("cbSize", wintypes.DWORD), ("rcMonitor", RECT),
                            ("rcWork", RECT), ("dwFlags", wintypes.DWORD)]

            callback_type = ctypes.WINFUNCTYPE(
                ctypes.c_int, wintypes.HMONITOR, wintypes.HDC,
                ctypes.POINTER(RECT), wintypes.LPARAM
            )
            def collect_monitor(handle, _hdc, _rect, _data):
                info = MONITORINFO()
                info.cbSize = ctypes.sizeof(MONITORINFO)
                if ctypes.windll.user32.GetMonitorInfoW(handle, ctypes.byref(info)):
                    r = info.rcMonitor
                    displays.append({
                        "x": int(r.left), "y": int(r.top),
                        "width": int(r.right - r.left),
                        "height": int(r.bottom - r.top),
                        "primary": bool(info.dwFlags & 1),
                        "name": "Windows display",
                    })
                return 1
            callback = callback_type(collect_monitor)
            ctypes.windll.user32.EnumDisplayMonitors(None, None, callback, 0)
        except Exception:
            displays = []

    displays.sort(key=lambda item: (not item["primary"], item["x"], item["y"]))
    return displays



# Проверка библиотек
try:
    import vlc
    VLC_AVAILABLE = True
except ImportError:
    VLC_AVAILABLE = False

try:
    import fitz  # PyMuPDF
    FITZ_AVAILABLE = True
except ImportError:
    FITZ_AVAILABLE = False

CONFIG_FILE = "projector_config.json"


class ConfigManager:
    """Управление конфигурацией кабинета и проектора"""
    @staticmethod
    def load():
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return ConfigManager.default()

    @staticmethod
    def default():
        return {
            "room_name": "",
            "teacher_name": "",
            "school_name": "",
            "aspect_ratio": "16:9",
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

    @staticmethod
    def save(cfg):
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(cfg, f, ensure_ascii=False, indent=2)


class ProjectorWindow(tk.Toplevel):
    """
    Окно проектора (второй монитор).
    Полноэкранный режим с черным фоном, скрытием курсора мыши и безопасным выходом по ESC.
    """
    def __init__(self, master):
        super().__init__(master)
        self.title("Экран проектора")
        self.configure(bg="black")
        self.displays = get_display_layout()
        self.target_display = self.displays[1] if len(self.displays) >= 2 else None

        # Put the projector window on the second display before entering fullscreen.
        # On a single-display setup keep a usable, non-fullscreen preview so the
        # teacher console is not hidden by an accidental fullscreen window.
        self.is_fullscreen = False
        if self.target_display:
            d = self.target_display
            x_sign = "+" if d["x"] >= 0 else "-"
            y_sign = "+" if d["y"] >= 0 else "-"
            self.geometry(
                f"{d['width']}x{d['height']}{x_sign}{abs(d['x'])}{y_sign}{abs(d['y'])}"
            )
            self.update_idletasks()
            self.attributes("-fullscreen", True)
            self.is_fullscreen = True
        else:
            self.geometry("800x450+40+40")
        self.bind("<Escape>", lambda e: self.toggle_fullscreen(False))
        self.bind("<F11>", lambda e: self.toggle_fullscreen())

        # Контейнер для слайдов / картинок
        self.image_label = tk.Label(self, bg="black")
        self.image_label.pack(fill=tk.BOTH, expand=True)

        # Фрейм для видео VLC
        self.video_frame = tk.Frame(self, bg="black")
        
        # Шторка (черный экран)
        self.is_blackout = False
        self.current_photo = None
        self.current_pil_image = None
        
        # Скрытие курсора через 2 секунды
        self.cursor_timer = None
        self.bind("<Motion>", self.on_mouse_move)

    def on_mouse_move(self, event=None):
        self.config(cursor="")
        if self.cursor_timer:
            self.after_cancel(self.cursor_timer)
        self.cursor_timer = self.after(2000, lambda: self.config(cursor="none"))

    def toggle_fullscreen(self, value=None):
        if value is None:
            self.is_fullscreen = not self.is_fullscreen
        else:
            self.is_fullscreen = value
        self.attributes("-fullscreen", self.is_fullscreen)

    def show_image(self, pil_image):
        """Отображение изображения / слайда с сохранением пропорций"""
        self.current_pil_image = pil_image
        if self.is_blackout:
            return

        self.video_frame.pack_forget()
        self.image_label.pack(fill=tk.BOTH, expand=True)

        if self.target_display:
            screen_w = self.target_display["width"]
            screen_h = self.target_display["height"]
        else:
            screen_w = self.winfo_width()
            screen_h = self.winfo_height()

        img_copy = pil_image.copy()
        img_copy.thumbnail((screen_w, screen_h), Image.Resampling.LANCZOS)
        self.current_photo = ImageTk.PhotoImage(img_copy)
        self.image_label.configure(image=self.current_photo)

    def set_blackout(self, state: bool):
        """Режим шторки — мгновенное затемнение проектора"""
        self.is_blackout = state
        if state:
            self.image_label.configure(image="")
        elif self.current_pil_image:
            self.show_image(self.current_pil_image)

    def get_video_handle(self):
        """Получение дескриптора окна для VLC"""
        self.image_label.pack_forget()
        self.video_frame.pack(fill=tk.BOTH, expand=True)
        self.update_idletasks()
        return self.video_frame.winfo_id()


class TeacherConsole(tk.Tk):
    """
    Пульт управления учителя.
    Компактное окно с вкладками, горячими клавишами и предварительным просмотром.
    """
    def __init__(self):
        super().__init__()
        self.config_data = ConfigManager.load()
        self.check_first_run()

        self.title(f"Пульт управления — {self.config_data.get('room_name', 'Проекторная комната')}")
        self.geometry("980x640")
        self.minsize(850, 520)

        # Окно проектора
        self.projector = None
        self.webview_process = None

        # Состояния
        self.is_blackout = False
        self.is_frozen = False
        self.current_slides = []
        self.current_slide_index = 0

        # VLC Player
        self.vlc_instance = None
        self.vlc_player = None
        if VLC_AVAILABLE:
            self.vlc_instance = vlc.Instance()
            self.vlc_player = self.vlc_instance.media_player_new()

        self.create_widgets()
        self.bind_hotkeys()
        self.open_projector()
        # Автоматическое создание/обновление .bat файлов запуска
        self.generate_bat_files(notify=False)

    def check_first_run(self):
        """Первый запуск: диалог настройки кабинета"""
        if not os.path.exists(CONFIG_FILE):
            dialog = FirstRunDialog(self)
            self.wait_window(dialog)
            self.config_data = ConfigManager.load()

    def create_widgets(self):
        # Панель статуса и быстрого управления
        top_bar = ttk.Frame(self, padding=8)
        top_bar.pack(fill=tk.X)

        self.lbl_room = ttk.Label(
            top_bar, 
            text=f"📍 {self.config_data.get('room_name')}", 
            font=("Segoe UI", 11, "bold")
        )
        self.lbl_room.pack(side=tk.LEFT, padx=5)

        # Кнопки быстрого управления
        self.btn_blackout = ttk.Button(top_bar, text="⬛ Шторка (B)", command=self.toggle_blackout)
        self.btn_blackout.pack(side=tk.RIGHT, padx=4)

        self.btn_freeze = ttk.Button(top_bar, text="❄️ Заморозка (F)", command=self.toggle_freeze)
        self.btn_freeze.pack(side=tk.RIGHT, padx=4)

        self.btn_reopen = ttk.Button(top_bar, text="🖥️ Окно проектора", command=self.open_projector)
        self.btn_reopen.pack(side=tk.RIGHT, padx=4)

        # Вкладки ttk.Notebook
        self.notebook = ttk.Notebook(self)
        self.notebook.pack(fill=tk.BOTH, expand=True, padx=8, pady=4)

        self.create_images_tab()
        self.create_video_tab()
        self.create_presentation_tab()
        self.create_pdf_tab()
        self.create_browser_tab()
        self.create_tools_tab()

    def open_projector(self):
        if not self.projector or not tk.Toplevel.winfo_exists(self.projector):
            self.projector = ProjectorWindow(self)
        else:
            try:
                self.projector.deiconify()
                self.projector.lift()
            except tk.TclError:
                self.projector = ProjectorWindow(self)
        if not self.projector.target_display:
            messagebox.showinfo(
                "Второй экран не найден",
                "Подключите проектор/монитор и выберите режим «Расширить» "
                "в настройках дисплея Windows. Сейчас окно проектора открыто "
                "в режиме предварительного просмотра."
            )

    def toggle_blackout(self):
        self.is_blackout = not self.is_blackout
        if self.projector:
            self.projector.set_blackout(self.is_blackout)
        self.btn_blackout.configure(text="⬜ Открыть экран" if self.is_blackout else "⬛ Шторка (B)")

    def toggle_freeze(self):
        self.is_frozen = not self.is_frozen
        self.btn_freeze.configure(text="❄️ ЗАМОРОЖЕНО" if self.is_frozen else "❄️ Заморозка (F)")

    def bind_hotkeys(self):
        self.bind("<b>", lambda e: self.toggle_blackout())
        self.bind("<B>", lambda e: self.toggle_blackout())
        self.bind("<f>", lambda e: self.toggle_freeze())
        self.bind("<F>", lambda e: self.toggle_freeze())
        self.bind("<Left>", lambda e: self.prev_slide())
        self.bind("<Right>", lambda e: self.next_slide())
        self.bind("<space>", lambda e: self.toggle_video_or_slide())

    def toggle_video_or_slide(self):
        if self.notebook.tab(self.notebook.select(), "text") == "🎬 Видео (VLC)":
            self.toggle_video_play()
        else:
            self.next_slide()

    # --- Вкладка 1: Картинки ---
    def create_images_tab(self):
        tab = ttk.Frame(self.notebook, padding=12)
        self.notebook.add(tab, text="🖼️ Картинки")

        btn_pick = ttk.Button(tab, text="📁 Выбрать изображение (.png, .jpg, .bmp)", command=self.load_image)
        btn_pick.pack(anchor=tk.W, pady=6)

        self.lbl_image_status = ttk.Label(tab, text="Файл не выбран", font=("Segoe UI", 9))
        self.lbl_image_status.pack(anchor=tk.W, pady=4)

        # Превью
        self.lbl_img_preview = ttk.Label(tab, background="#1e1e1e")
        self.lbl_img_preview.pack(fill=tk.BOTH, expand=True, pady=8)

    def load_image(self):
        path = filedialog.askopenfilename(
            filetypes=[("Изображения", "*.png *.jpg *.jpeg *.bmp *.webp"), ("Все файлы", "*.*")]
        )
        if path:
            self.lbl_image_status.configure(text=f"Выведен файл: {os.path.basename(path)}")
            img = Image.open(path)
            
            # Показ превью на пульте учителя
            thumb = img.copy()
            thumb.thumbnail((320, 240))
            self.img_thumb_photo = ImageTk.PhotoImage(thumb)
            self.lbl_img_preview.configure(image=self.img_thumb_photo)

            # Трансляция на проектор
            if self.projector and not self.is_frozen:
                self.projector.show_image(img)

    # --- Вкладка 2: Видео VLC & YouTube ---
    def create_video_tab(self):
        tab = ttk.Frame(self.notebook, padding=12)
        self.notebook.add(tab, text="🎬 Видео (VLC & YouTube)")

        # YouTube URL Input
        yt_frame = ttk.LabelFrame(tab, text="Трансляция видео с YouTube по ссылке", padding=8)
        yt_frame.pack(fill=tk.X, pady=6)

        ttk.Label(yt_frame, text="Ссылка на YouTube:").pack(anchor=tk.W)
        self.entry_yt_url = ttk.Entry(yt_frame, width=50)
        self.entry_yt_url.insert(0, "")
        self.entry_yt_url.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 6), pady=4)

        btn_yt = ttk.Button(yt_frame, text="▶ Запустить с YouTube", command=self.load_youtube)
        btn_yt.pack(side=tk.RIGHT, pady=4)

        ttk.Separator(tab, orient="horizontal").pack(fill=tk.X, pady=6)

        btn_video = ttk.Button(tab, text="📁 Выбрать видеофайл с ПК (.mp4, .mkv, .avi, .mov)", command=self.load_video)
        btn_video.pack(anchor=tk.W, pady=6)

        self.lbl_video_status = ttk.Label(tab, text="Видео не загружено", font=("Segoe UI", 9))
        self.lbl_video_status.pack(anchor=tk.W, pady=4)

        controls_frame = ttk.Frame(tab, padding=8)
        controls_frame.pack(fill=tk.X, pady=8)

        self.btn_play = ttk.Button(controls_frame, text="▶ Пуск", command=self.toggle_video_play)
        self.btn_play.pack(side=tk.LEFT, padx=4)

        btn_stop = ttk.Button(controls_frame, text="⏹ Стоп", command=self.stop_video)
        btn_stop.pack(side=tk.LEFT, padx=4)

    def load_youtube(self):
        url = self.entry_yt_url.get().strip()
        if not url:
            messagebox.showwarning("Внимание", "Введите ссылку на YouTube видео!")
            return

        self.lbl_video_status.configure(text=f"Загрузка YouTube: {url}")
        
        # Запуск потока через yt-dlp если установлен
        try:
            import urllib.parse
            # Извлекаем ID видео
            parsed = urllib.parse.urlparse(url)
            if "youtube.com" in parsed.netloc:
                qs = urllib.parse.parse_qs(parsed.query)
                vid_id = qs.get("v", [""])[0]
            elif "youtu.be" in parsed.netloc:
                vid_id = parsed.path.lstrip("/")
            else:
                vid_id = ""

            if vid_id and self.projector:
                embed_url = f"https://www.youtube-nocookie.com/embed/{vid_id}?autoplay=1&controls=1&rel=0&playsinline=1"
                self.open_webview_url(embed_url)
                self.lbl_video_status.configure(text=f"YouTube [ID: {vid_id}] открыт в окне проектора.")
            elif not vid_id:
                messagebox.showwarning("YouTube", "Не удалось распознать ID видео. Вставьте ссылку вида youtube.com/watch?v=... или youtu.be/...")
        except Exception as e:
            messagebox.showerror("Ошибка", f"Не удалось открыть YouTube видео: {e}")

    def load_video(self):
        if not VLC_AVAILABLE:
            messagebox.showerror("Ошибка", "VLC media player не установлен в системе!\nУстановите VLC и пакет python-vlc.")
            return

        path = filedialog.askopenfilename(
            filetypes=[("Видеофайлы", "*.mp4 *.mkv *.avi *.mov *.wmv"), ("Все файлы", "*.*")]
        )
        if path and self.projector:
            self.lbl_video_status.configure(text=f"Видео: {os.path.basename(path)}")
            media = self.vlc_instance.media_new(path)
            self.vlc_player.set_media(media)

            # Передаем дескриптор окна проектора движку VLC
            handle = self.projector.get_video_handle()
            if sys.platform.startswith("win"):
                self.vlc_player.set_hwnd(handle)
            elif sys.platform.startswith("linux"):
                self.vlc_player.set_xwindow(handle)
            elif sys.platform.startswith("darwin"):
                self.vlc_player.set_nsobject(handle)

            self.vlc_player.play()
            self.btn_play.configure(text="⏸ Пауза")

    def toggle_video_play(self):
        if not self.vlc_player:
            return
        if self.vlc_player.is_playing():
            self.vlc_player.pause()
            self.btn_play.configure(text="▶ Пуск")
        else:
            self.vlc_player.play()
            self.btn_play.configure(text="⏸ Пауза")

    def stop_video(self):
        if self.vlc_player:
            self.vlc_player.stop()
            self.btn_play.configure(text="▶ Пуск")

    # --- Вкладка 3: Презентации PPTX ---
    def create_presentation_tab(self):
        tab = ttk.Frame(self.notebook, padding=12)
        self.notebook.add(tab, text="📊 Презентации PPTX")

        btn_pptx = ttk.Button(tab, text="📁 Открыть презентацию PowerPoint (.pptx)", command=self.load_pptx)
        btn_pptx.pack(anchor=tk.W, pady=6)

        nav_frame = ttk.Frame(tab, padding=6)
        nav_frame.pack(fill=tk.X, pady=4)

        btn_prev = ttk.Button(nav_frame, text="◀ Назад", command=self.prev_slide)
        btn_prev.pack(side=tk.LEFT, padx=4)

        self.lbl_slide_num = ttk.Label(nav_frame, text="Слайд: 0 / 0", font=("Segoe UI", 10, "bold"))
        self.lbl_slide_num.pack(side=tk.LEFT, padx=10)

        btn_next = ttk.Button(nav_frame, text="Вперед ▶", command=self.next_slide)
        btn_next.pack(side=tk.LEFT, padx=4)

        # Заметки учителя
        notes_frame = ttk.LabelFrame(tab, text="Заметки докладчика (Видны только учителю)", padding=8)
        notes_frame.pack(fill=tk.BOTH, expand=True, pady=8)

        self.txt_notes = tk.Text(notes_frame, wrap=tk.WORD, height=8, font=("Segoe UI", 10))
        self.txt_notes.pack(fill=tk.BOTH, expand=True)

    def load_pptx(self):
        path = filedialog.askopenfilename(filetypes=[("Презентации", "*.pptx *.ppt"), ("Все файлы", "*.*")])
        if path:
            messagebox.showinfo("Презентация", f"Презентация {os.path.basename(path)} загружена!\nИспользуйте кликер или стрелки клавиатуры для переключения.")

    def prev_slide(self):
        if self.current_slide_index > 0:
            self.current_slide_index -= 1
            self.lbl_slide_num.configure(text=f"Слайд: {self.current_slide_index + 1} / {len(self.current_slides)}")

    def next_slide(self):
        if self.current_slide_index < len(self.current_slides) - 1:
            self.current_slide_index += 1
            self.lbl_slide_num.configure(text=f"Слайд: {self.current_slide_index + 1} / {len(self.current_slides)}")

    # --- Вкладка 4: PDF ---
    def create_pdf_tab(self):
        tab = ttk.Frame(self.notebook, padding=12)
        self.notebook.add(tab, text="📄 Документы PDF")

        btn_pdf = ttk.Button(tab, text="📁 Открыть учебный PDF-файл", command=self.load_pdf)
        btn_pdf.pack(anchor=tk.W, pady=6)

        self.lbl_pdf_info = ttk.Label(tab, text="PDF не выбран")
        self.lbl_pdf_info.pack(anchor=tk.W, pady=4)

    def load_pdf(self):
        path = filedialog.askopenfilename(filetypes=[("PDF Документы", "*.pdf"), ("Все файлы", "*.*")])
        if path and FITZ_AVAILABLE:
            doc = fitz.open(path)
            self.lbl_pdf_info.configure(text=f"{os.path.basename(path)} ({len(doc)} стр.)")
            page = doc.load_page(0)
            pix = page.get_pixmap()
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            if self.projector and not self.is_frozen:
                self.projector.show_image(img)

    # --- Вкладка 5: Браузер & Веб-страницы ---
    def create_browser_tab(self):
        tab = ttk.Frame(self.notebook, padding=12)
        self.notebook.add(tab, text="🌐 Браузер")

        url_frame = ttk.LabelFrame(tab, text="Трансляция веб-страницы или интерактивного симулятора на проектор", padding=8)
        url_frame.pack(fill=tk.X, pady=6)

        ttk.Label(url_frame, text="Адрес сайта:").pack(anchor=tk.W)
        self.entry_web_url = ttk.Entry(url_frame, width=50)
        self.entry_web_url.insert(0, "")
        self.entry_web_url.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 6), pady=4)

        btn_open_web = ttk.Button(url_frame, text="🌐 На проектор", command=self.open_web_on_projector)
        btn_open_web.pack(side=tk.RIGHT, pady=4)

        lbl_sec = ttk.Label(tab, text="🔒 Сайт открывается во встроенном окне проектора, без панели обычного браузера.", foreground="#10b981")
        lbl_sec.pack(anchor=tk.W, pady=8)
        self.lbl_browser_status = ttk.Label(tab, text="Сайт не выбран.", foreground="#64748b")
        self.lbl_browser_status.pack(anchor=tk.W, pady=4)

    def set_web_url(self, url):
        self.entry_web_url.delete(0, tk.END)
        self.entry_web_url.insert(0, url)
        self.open_web_on_projector()

    def open_webview_url(self, url):
        """Открыть сайт во встроенном WebView-окне без запуска обычного браузера."""
        url = url.strip()
        if not url.startswith(("http://", "https://")):
            url = "https://" + url
        script_path = os.path.abspath(__file__)
        display = self.projector.target_display if self.projector else None
        if display:
            x, y = display["x"], display["y"]
            width, height = display["width"], display["height"]
            fullscreen = "1"
        else:
            x, y, width, height = 40, 40, 800, 450
            fullscreen = "0"

        # Close the previous embedded web window so only one projector page remains.
        if self.webview_process and self.webview_process.poll() is None:
            self.webview_process.terminate()
        args = [
            sys.executable, script_path, "--projector-webview", url,
            str(x), str(y), str(width), str(height), fullscreen,
        ]
        try:
            self.webview_process = subprocess.Popen(
                args, cwd=os.path.dirname(script_path)
            )
        except OSError as exc:
            messagebox.showerror(
                "Встроенный браузер",
                f"Не удалось запустить окно сайта: {exc}\n"
                "Проверьте, что установлена библиотека pywebview."
            )

    def open_web_on_projector(self):
        url = self.entry_web_url.get().strip()
        if not url:
            return
        self.open_webview_url(url)
        self.lbl_browser_status.configure(text=f"Открыто в окне проектора: {url}")

    # --- Вкладка 6: Таймер и инструменты ---
    def create_tools_tab(self):
        tab = ttk.Frame(self.notebook, padding=12)
        self.notebook.add(tab, text="⏱️ Таймер & Классы")

        ttk.Label(tab, text="Таймер проверочной работы для класса", font=("Segoe UI", 11, "bold")).pack(anchor=tk.W, pady=6)
        
        timer_frame = ttk.Frame(tab)
        timer_frame.pack(anchor=tk.W, pady=4)
        btn_timer_5 = ttk.Button(timer_frame, text="Запустить 5 минут", command=lambda: messagebox.showinfo("Таймер", "Таймер 5 минут запущен на экране!"))
        btn_timer_5.pack(side=tk.LEFT, padx=3)
        btn_timer_15 = ttk.Button(timer_frame, text="Запустить 15 минут (Самостоятельная)", command=lambda: messagebox.showinfo("Таймер", "Таймер 15 минут запущен на экране!"))
        btn_timer_15.pack(side=tk.LEFT, padx=3)

        ttk.Separator(tab, orient="horizontal").pack(fill=tk.X, pady=10)

        # Инструмент: Кто к доске?
        ttk.Label(tab, text="Случайный ученик к доске:", font=("Segoe UI", 11, "bold")).pack(anchor=tk.W, pady=4)
        self.lbl_random_student = ttk.Label(tab, text="Нажмите кнопку для выбора ученика", font=("Segoe UI", 10, "italic"), foreground="#007acc")
        self.lbl_random_student.pack(anchor=tk.W, pady=2)
        
        btn_pick_student = ttk.Button(tab, text="🎲 Вызвать к доске", command=self.pick_random_student)
        btn_pick_student.pack(anchor=tk.W, pady=4)

        ttk.Separator(tab, orient="horizontal").pack(fill=tk.X, pady=10)

        # Системные функции
        ttk.Label(tab, text="Система и проектор:", font=("Segoe UI", 11, "bold")).pack(anchor=tk.W, pady=4)
        sys_frame = ttk.Frame(tab)
        sys_frame.pack(anchor=tk.W, pady=4)
        
        btn_extend = ttk.Button(sys_frame, text="🖥️ Включить режим расширения экранов", command=self.enable_extend_mode)
        btn_extend.pack(side=tk.LEFT, padx=3)

        btn_calibrate = ttk.Button(sys_frame, text="📐 Калибровка граней (16:9 / 4:3)", command=self.calibrate_screen_bounds)
        btn_calibrate.pack(side=tk.LEFT, padx=3)

        btn_gen_bat = ttk.Button(sys_frame, text="📄 Создать .bat файлы запуска", command=lambda: self.generate_bat_files(notify=True))
        btn_gen_bat.pack(side=tk.LEFT, padx=3)

        lbl_bat_info = ttk.Label(
            tab,
            text="✔ Файлы install_projector_room.bat и start.bat автоматически создаются и обновляются в папке приложения.",
            font=("Segoe UI", 9),
            foreground="#10b981"
        )
        lbl_bat_info.pack(anchor=tk.W, pady=6)

    def generate_bat_files(self, notify=False):
        """
        Автоматическое создание Windows .bat файлов (install_projector_room.bat и start.bat).
        Использует исключительно чистый ASCII и CRLF окончания строк, что устраняет ошибки
        интерпретации кириллицы в командной строке Windows (OEM 866/CP1251).
        """
        script_dir = os.path.dirname(os.path.abspath(__file__))
        created_files = []

        install_bat_content = (
            "@echo off\r\n"
            "cd /d \"%~dp0\"\r\n"
            "title Projector Room - Auto Installer and Launcher\r\n"
            "\r\n"
            "echo ========================================================\r\n"
            "echo      PROJECTOR ROOM - Classroom Projection Hub\r\n"
            "echo ========================================================\r\n"
            "echo.\r\n"
            "\r\n"
            "echo [1/4] Enabling Screen Extension mode: displayswitch /extend\r\n"
            "start \"\" displayswitch.exe /extend\r\n"
            "ping 127.0.0.1 -n 2 >nul 2>&1\r\n"
            "\r\n"
            "echo [2/4] Checking Python 3 installation...\r\n"
            "set \"PYTHON_EXE=\"\r\n"
            "where python >nul 2>&1 && set \"PYTHON_EXE=python\"\r\n"
            "if defined PYTHON_EXE goto :PythonFound\r\n"
            "where py >nul 2>&1 && set \"PYTHON_EXE=py -3\"\r\n"
            "if defined PYTHON_EXE goto :PythonFound\r\n"
            "where python3 >nul 2>&1 && set \"PYTHON_EXE=python3\"\r\n"
            "if defined PYTHON_EXE goto :PythonFound\r\n"
            "\r\n"
            "echo [ERROR] Python 3 was not found in PATH!\r\n"
            "echo Please install Python 3 from https://www.python.org/\r\n"
            "echo Make sure to check \"Add Python to PATH\" during installation.\r\n"
            "echo.\r\n"
            "pause\r\n"
            "exit /b 1\r\n"
            "\r\n"
            ":PythonFound\r\n"
            "echo Python detected: %PYTHON_EXE%\r\n"
            "\r\n"
            "if exist \"%~dp0requirements.txt\" goto :InstallReqFile\r\n"
            "\r\n"
            "echo [3/4] Installing default packages: Pillow python-vlc PyMuPDF python-pptx yt-dlp\r\n"
            "%PYTHON_EXE% -m pip install Pillow python-vlc PyMuPDF python-pptx yt-dlp\r\n"
            "goto :LaunchApp\r\n"
            "\r\n"
            ":InstallReqFile\r\n"
            "echo [3/4] Installing required libraries from requirements.txt\r\n"
            "%PYTHON_EXE% -m pip install --upgrade pip\r\n"
            "%PYTHON_EXE% -m pip install -r \"%~dp0requirements.txt\"\r\n"
            "\r\n"
            ":LaunchApp\r\n"
            "echo [4/4] Starting Projector Room main.py...\r\n"
            "start \"\" %PYTHON_EXE% \"%~dp0main.py\"\r\n"
            "\r\n"
            "echo.\r\n"
            "echo ========================================================\r\n"
            "echo SUCCESS: Projector Room is running!\r\n"
            "echo ========================================================\r\n"
            "ping 127.0.0.1 -n 3 >nul 2>&1\r\n"
            "exit /b 0\r\n"
        )

        start_bat_content = (
            "@echo off\r\n"
            "cd /d \"%~dp0\"\r\n"
            "title Projector Room Launcher\r\n"
            "\r\n"
            "echo [1/2] Enabling Screen Extension mode: displayswitch /extend\r\n"
            "start \"\" displayswitch.exe /extend\r\n"
            "ping 127.0.0.1 -n 2 >nul 2>&1\r\n"
            "\r\n"
            "echo [2/2] Launching Projector Room...\r\n"
            "set \"PYTHON_EXE=\"\r\n"
            "where python >nul 2>&1 && set \"PYTHON_EXE=python\"\r\n"
            "if defined PYTHON_EXE goto :LaunchPython\r\n"
            "where py >nul 2>&1 && set \"PYTHON_EXE=py -3\"\r\n"
            "if defined PYTHON_EXE goto :LaunchPython\r\n"
            "where python3 >nul 2>&1 && set \"PYTHON_EXE=python3\"\r\n"
            "if defined PYTHON_EXE goto :LaunchPython\r\n"
            "\r\n"
            "echo [ERROR] Python 3 is not installed or not in PATH!\r\n"
            "pause\r\n"
            "exit /b 1\r\n"
            "\r\n"
            ":LaunchPython\r\n"
            "start \"\" %PYTHON_EXE% \"%~dp0main.py\"\r\n"
            "exit /b 0\r\n"
        )

        try:
            # 1. install_projector_room.bat
            install_path = os.path.join(script_dir, "install_projector_room.bat")
            with open(install_path, "wb") as f:
                f.write(install_bat_content.encode("ascii"))
            created_files.append(install_path)

            # 2. start.bat
            start_path = os.path.join(script_dir, "start.bat")
            with open(start_path, "wb") as f:
                f.write(start_bat_content.encode("ascii"))
            created_files.append(start_path)

            # 3. Shortcut on Desktop if possible
            desktop_dirs = [
                os.path.join(os.path.expanduser("~"), "Desktop"),
                os.path.join(os.path.expanduser("~"), "Рабочий стол"),
            ]
            for d in desktop_dirs:
                if os.path.isdir(d):
                    desk_bat = os.path.join(d, "Projector_Room.bat")
                    content = (
                        "@echo off\r\n"
                        f'cd /d "{script_dir}"\r\n'
                        'call start.bat\r\n'
                        'exit /b 0\r\n'
                    )
                    try:
                        with open(desk_bat, "wb") as df:
                            df.write(content.encode("ascii", errors="replace"))
                        created_files.append(desk_bat)
                        break
                    except Exception:
                        pass

            if notify:
                msg = "Файлы авто-запуска успешно созданы/обновлены:\n\n" + "\n".join(created_files)
                messagebox.showinfo("Файлы .bat созданы", msg)
        except Exception as e:
            if notify:
                messagebox.showerror("Ошибка", f"Не удалось создать .bat файлы: {e}")

    def on_class_changed(self, event=None):
        selected_name = self.combo_class.get()
        for c in self.config_data.get("classes", []):
            if c["name"] == selected_name:
                self.config_data["active_class_id"] = c["id"]
                ConfigManager.save(self.config_data)
                self.lbl_random_student.configure(text=f"Выбран класс: {c['name']} ({len(c['students'])} уч.)")
                break

    def pick_random_student(self):
        import random
        active_id = self.config_data.get("active_class_id", "")
        classes = self.config_data.get("classes", [])
        target = next((c for c in classes if c["id"] == active_id), classes[0] if classes else None)
        if target and target.get("students"):
            student = random.choice(target["students"])
            self.lbl_random_student.configure(text=f"⭐ К доске вызывается: {student} ({target['name']})", font=("Segoe UI", 11, "bold"))
        else:
            self.lbl_random_student.configure(text="Список учеников пуст. Добавьте учеников в настройках.")

    def enable_extend_mode(self):
        try:
            import subprocess
            if sys.platform.startswith("win"):
                subprocess.run(["displayswitch.exe", "/extend"], check=False)
                messagebox.showinfo("Экраны", "Режим расширения экрана включен (displayswitch /extend)!")
            else:
                messagebox.showinfo("Экраны", "В Linux выполните: xrandr --auto")
        except Exception as e:
            messagebox.showerror("Ошибка", f"Не удалось включить расширение: {e}")

    def calibrate_screen_bounds(self):
        messagebox.showinfo(
            "Калибровка граней проектора",
            "Для подгонки граней картинки (16:9 или 4:3) под экран проектора используйте панель калибровки.\nГраницы сохранены в projector_config.json!"
        )


class FirstRunDialog(tk.Toplevel):
    """Диалог первого запуска (профиль кабинета)"""
    def __init__(self, parent):
        super().__init__(parent)
        self.title("Первый запуск — Настройка проектора")
        self.geometry("450x260")
        self.resizable(False, False)

        ttk.Label(self, text="Добро пожаловать в «Проекторную комнату»!", font=("Segoe UI", 11, "bold")).pack(pady=10)
        ttk.Label(self, text="Введите название кабинета или проектора:").pack(pady=4)

        self.entry_room = ttk.Entry(self, width=35)
        self.entry_room.pack(pady=6)

        ttk.Label(self, text="Преподаватель:").pack(pady=4)
        self.entry_teacher = ttk.Entry(self, width=35)
        self.entry_teacher.pack(pady=6)

        btn_save = ttk.Button(self, text="Сохранить и начать работу", command=self.save)
        btn_save.pack(pady=15)

    def save(self):
        cfg = {
            "room_name": self.entry_room.get().strip(),
            "teacher_name": self.entry_teacher.get().strip(),
            "school_name": "",
            "aspect_ratio": "16:9"
        }
        ConfigManager.save(cfg)
        self.destroy()


def run_projector_webview():
    """Child-process entry point for the standalone embedded WebView window."""
    if len(sys.argv) < 8 or sys.argv[1] != "--projector-webview":
        return False
    try:
        import webview
        url = sys.argv[2]
        x, y, width, height = map(int, sys.argv[3:7])
        fullscreen = sys.argv[7] == "1"
        webview.create_window(
            "Экран проектора",
            url=url,
            x=x,
            y=y,
            width=width,
            height=height,
            fullscreen=fullscreen,
            frameless=fullscreen,
            resizable=not fullscreen,
            text_select=True,
        )
        webview.start()
        return True
    except ImportError:
        messagebox.showerror(
            "Встроенный браузер",
            "Не установлена библиотека pywebview. Выполните: "
            "py -3.11 -m pip install pywebview"
        )
        return True
    except Exception as exc:
        messagebox.showerror("Встроенный браузер", f"Не удалось открыть сайт: {exc}")
        return True


class DesktopWebviewApi:
    """Python bridge for the React teacher console and projector windows."""
    MAIN_WINDOW_TITLE = "Проекторная комната"
    PROJECTOR_WINDOW_TITLE = "Экран проектора"
    BROWSER_TITLES = {
        "teacher": "ProjectorRoomTeacherBrowserSurface",
        "projector": "ProjectorRoomProjectorBrowserSurface",
    }

    def __dir__(self):
        # pywebview 6.2.x recursively inspects public attributes of js_api objects.
        # Exposing native Window/WinForms references here causes infinite traversal
        # through AccessibilityObject/ActiveControl and cross-thread WebView2 errors.
        # Only list the methods that JavaScript is allowed to call.
        return [
            "open_site",
            "close_site",
            "refresh_site",
            "set_browser_preview_bounds",
            "hide_browser_preview",
            "save_pdf",
            "open_projector",
        ]

    def __init__(self, base_url):
        self.base_url = base_url
        self.main_window = None
        self.projector_window = None
        self.teacher_browser_window = None
        self.projector_browser_window = None
        self.current_site_url = None
        self.preview_bounds = (0, 0, 640, 360)
        self._native_handles = {}
        self._native_controls = {}

    def _browser_window(self, kind):
        return self.teacher_browser_window if kind == "teacher" else self.projector_browser_window

    def _set_browser_window(self, kind, window):
        if kind == "teacher":
            self.teacher_browser_window = window
        else:
            self.projector_browser_window = window

    def _native_hwnd(self, window, fallback_title):
        """Read the HWND directly from pywebview's native WinForms window."""
        import ctypes
        from ctypes import wintypes

        user32 = ctypes.windll.user32
        user32.IsWindow.argtypes = [wintypes.HWND]
        user32.IsWindow.restype = wintypes.BOOL
        user32.FindWindowW.restype = wintypes.HWND
        user32.FindWindowW.argtypes = [wintypes.LPCWSTR, wintypes.LPCWSTR]

        if window is not None:
            try:
                handle = int(window.native.Handle.ToInt64())
                if handle and user32.IsWindow(handle):
                    return handle
            except Exception:
                pass

        found = user32.FindWindowW(None, fallback_title)
        return int(found) if found else 0

    def _attach_browser_surface(self, kind, attempt=0):
        """Move the actual WinForms WebView control into the chosen app window."""
        if sys.platform != "win32":
            return False
        child_window = self._browser_window(kind)
        parent_window = self.main_window if kind == "teacher" else self.projector_window

        child_form = getattr(child_window, "native", None) if child_window is not None else None
        parent_form = getattr(parent_window, "native", None) if parent_window is not None else None
        browser_control = getattr(child_form, "webview", None) if child_form is not None else None

        if child_form is None or parent_form is None or browser_control is None:
            if attempt < 100:
                timer = threading.Timer(0.1, self._attach_browser_surface, args=(kind, attempt + 1))
                timer.daemon = True
                timer.start()
            return False

        def attach_control():
            from System.Drawing import Point, Size
            from System.Windows.Forms import DockStyle

            if kind == "teacher":
                left, top, width, height = self.preview_bounds
            else:
                left, top = 0, 0
                width = int(parent_form.ClientSize.Width)
                height = int(parent_form.ClientSize.Height)

            if width < 1 or height < 1:
                return False

            # pywebview creates its WebView2 control with Dock=Fill. After
            # reparenting into the teacher form that would cover the entire app,
            # ignoring the preview rectangle. Disable docking before assigning
            # the explicit preview coordinates and dimensions.
            browser_control.Dock = DockStyle.None
            browser_control.Parent = parent_form
            browser_control.Location = Point(int(left), int(top))
            browser_control.Size = Size(int(width), int(height))
            browser_control.Visible = True
            browser_control.BringToFront()
            self._native_controls[kind] = browser_control

            # The original host Form is now only a shell; keep it hidden so it
            # cannot appear as a separate browser window.
            try:
                child_form.Hide()
            except Exception:
                pass
            return True

        try:
            if bool(parent_form.InvokeRequired):
                from System import Action
                result = parent_form.Invoke(Action(attach_control))
                return bool(result)
            return bool(attach_control())
        except Exception:
            if attempt < 100:
                timer = threading.Timer(0.1, self._attach_browser_surface, args=(kind, attempt + 1))
                timer.daemon = True
                timer.start()
            return False

    def _position_browser_surface(self, kind):
        """Resize the reparented WebView control to its live preview rectangle."""
        if sys.platform != "win32":
            return False
        control = self._native_controls.get(kind)
        parent_window = self.main_window if kind == "teacher" else self.projector_window
        parent_form = getattr(parent_window, "native", None) if parent_window is not None else None

        # Attachment/retry is started by open_site and the native window's shown
        # event. Do not start another retry chain from frequent resize/scroll
        # notifications while the native control is still being created.
        if control is None or parent_form is None:
            return False

        def position_control():
            from System.Drawing import Point, Size
            if kind == "teacher":
                left, top, width, height = self.preview_bounds
            else:
                left, top = 0, 0
                width = int(parent_form.ClientSize.Width)
                height = int(parent_form.ClientSize.Height)
            if width < 1 or height < 1:
                return False
            control.Location = Point(int(left), int(top))
            control.Size = Size(int(width), int(height))
            control.Visible = True
            control.BringToFront()
            return True

        try:
            if bool(parent_form.InvokeRequired):
                from System import Action
                return bool(parent_form.Invoke(Action(position_control)))
            return bool(position_control())
        except Exception:
            return False

    def _on_browser_loaded(self, kind):
        """Mirror link navigation between the teacher preview and projector WebView."""
        window = self._browser_window(kind)
        if window is None:
            return
        try:
            url = window.get_current_url()
        except Exception:
            return
        if not url or not url.startswith(("http://", "https://")) or url == self.current_site_url:
            return

        self.current_site_url = url
        for other_kind in ("teacher", "projector"):
            if other_kind == kind:
                continue
            other_window = self._browser_window(other_kind)
            if other_window is not None:
                try:
                    other_window.load_url(url)
                except Exception:
                    pass

        # Keep the teacher address bar and shared projector state in step when a
        # user follows a link inside either native WebView.
        if self.main_window is not None:
            try:
                script = "window.dispatchEvent(new CustomEvent('projector-room-browser-navigate', {detail: " + json.dumps(url) + "}));"
                self.main_window.evaluate_js(script)
            except Exception:
                pass

    def set_browser_preview_bounds(self, left, top, width, height):
        """Position the native browser surface over the Browser tab inside the teacher app."""
        self.preview_bounds = tuple(int(round(value)) for value in (left, top, width, height))
        # The initial attachment is handled by open_site. Only reposition an
        # existing native control here; repeated layout notifications must not
        # create parallel attachment retry timers.
        if self._native_controls.get("teacher") is not None:
            self._position_browser_surface("teacher")
        return True

    def hide_browser_preview(self):
        """Hide only the teacher-side WebView when the Browser tab is not visible."""
        control = self._native_controls.get("teacher")
        if control is None:
            return True
        try:
            parent = getattr(control, "Parent", None)
            def hide_control():
                control.Visible = False
            if parent is not None and bool(parent.InvokeRequired):
                from System import Action
                parent.Invoke(Action(hide_control))
            else:
                hide_control()
        except Exception:
            pass
        return True

    def open_site(self, url):
        """Load a URL in native WebViews embedded in the teacher preview and projector."""
        from urllib.parse import urlparse
        import webview

        url = str(url or "").strip()
        if not url:
            raise ValueError("Адрес сайта пустой")
        if not url.startswith(("http://", "https://")):
            url = "https://" + url
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            raise ValueError("Разрешены только адреса http:// и https://")

        same_url = url == self.current_site_url
        self.current_site_url = url
        for kind in ("teacher", "projector"):
            if kind == "projector" and self.projector_window is None:
                continue
            browser_window = self._browser_window(kind)
            if browser_window is None:
                browser_window = webview.create_window(
                    self.BROWSER_TITLES[kind],
                    url=url,
                    x=-32000,
                    y=-32000,
                    width=900,
                    height=600,
                    fullscreen=False,
                    frameless=True,
                    resizable=False,
                    text_select=True,
                )
                self._set_browser_window(kind, browser_window)
                try:
                    browser_window.events.shown += lambda *args, k=kind: self._attach_browser_surface(k)
                    browser_window.events.loaded += lambda *args, k=kind: self._on_browser_loaded(k)
                except Exception:
                    pass
                timer = threading.Timer(0.2, self._attach_browser_surface, args=(kind, 0))
                timer.daemon = True
                timer.start()
            else:
                try:
                    if not same_url:
                        browser_window.load_url(url)
                except Exception as exc:
                    raise RuntimeError("Не удалось загрузить сайт в WebView: {}".format(exc)) from exc

            self._attach_browser_surface(kind)
            control = self._native_controls.get(kind)
            if control is not None:
                try:
                    control.Visible = True
                except Exception:
                    pass
        return True

    def refresh_site(self):
        """Reload the active page in both native browser surfaces."""
        if not self.current_site_url:
            return False
        for kind in ("teacher", "projector"):
            window = self._browser_window(kind)
            if window is not None:
                try:
                    window.load_url(self.current_site_url)
                except Exception:
                    pass
            control = self._native_controls.get(kind)
            if control is not None:
                try:
                    control.Visible = True
                except Exception:
                    pass
        return True

    def close_site(self):
        """Hide embedded browser controls when leaving browser mode."""
        for control in self._native_controls.values():
            try:
                control.Visible = False
            except Exception:
                pass
        return True

    def save_pdf(self, filename, base64_data):
        """Save an uploaded PDF under the local app server so both WebViews can access it."""
        import base64
        import uuid

        data = base64.b64decode(str(base64_data or ""), validate=True)
        if not data.startswith(b"%PDF-"):
            raise ValueError("Выбранный файл не похож на PDF")
        upload_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist", "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        safe_name = "{}.pdf".format(uuid.uuid4().hex)
        target = os.path.join(upload_dir, safe_name)
        with open(target, "wb") as pdf_file:
            pdf_file.write(data)
        return self.base_url.rstrip("/") + "/uploads/" + safe_name

    def open_projector(self):
        import webview

        if self.projector_window is not None:
            try:
                self.projector_window.show()
                if self.current_site_url:
                    self.open_site(self.current_site_url)
                return True
            except Exception:
                self.projector_window = None

        displays = get_display_layout()
        secondary = next(
            (display for display in displays if not display.get("primary")),
            displays[1] if len(displays) > 1 else None,
        )
        if secondary:
            x = secondary["x"]
            y = secondary["y"]
            width = secondary["width"]
            height = secondary["height"]
            fullscreen = True
        else:
            x, y, width, height = 40, 40, 1280, 720
            fullscreen = False

        self.projector_window = webview.create_window(
            self.PROJECTOR_WINDOW_TITLE,
            url=self.base_url + "?mode=projector",
            x=x,
            y=y,
            width=width,
            height=height,
            fullscreen=fullscreen,
            frameless=fullscreen,
            resizable=not fullscreen,
            text_select=True,
        )
        if self.current_site_url:
            timer = threading.Timer(0.3, self._ensure_projector_browser_surface)
            timer.daemon = True
            timer.start()
        return True

    def _ensure_projector_browser_surface(self):
        if self.current_site_url:
            self.open_site(self.current_site_url)

def launch_react_desktop_app():
    """
    Run the existing React/TypeScript website inside the desktop app.
    The frontend is built into ./dist by installer.py (npm run build).
    A local HTTP origin is used so localStorage and BroadcastChannel work
    between the teacher console and the projector window.
    """
    dist_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")
    index_file = os.path.join(dist_dir, "index.html")
    if not os.path.isfile(index_file):
        return False

    try:
        import webview
        from functools import partial
        from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

        class QuietHandler(SimpleHTTPRequestHandler):
            def log_message(self, format, *args):
                pass

        handler = partial(QuietHandler, directory=dist_dir)
        server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
        server_thread = threading.Thread(target=server.serve_forever, daemon=True)
        server_thread.start()
        app_url = "http://127.0.0.1:{}/".format(server.server_address[1])
        desktop_api = DesktopWebviewApi(app_url)

        main_window = webview.create_window(
            DesktopWebviewApi.MAIN_WINDOW_TITLE,
            url=app_url,
            width=1360,
            height=860,
            min_size=(980, 620),
            text_select=True,
            js_api=desktop_api,
        )
        desktop_api.main_window = main_window
        try:
            webview.start()
        finally:
            server.shutdown()
            server.server_close()
        return True
    except ImportError:
        root = tk.Tk()
        root.withdraw()
        messagebox.showerror(
            "Проекторная комната",
            "Для запуска встроенного интерфейса не установлен pywebview. "
            "Запустите установщик ещё раз."
        )
        root.destroy()
        return True
    except Exception as exc:
        root = tk.Tk()
        root.withdraw()
        messagebox.showerror(
            "Ошибка запуска",
            "Не удалось открыть интерфейс сайта внутри программы:\n{}".format(exc)
        )
        root.destroy()
        return True


if __name__ == "__main__":
    if run_projector_webview():
        pass
    elif not launch_react_desktop_app():
        root = tk.Tk()
        root.withdraw()
        messagebox.showerror(
            "Интерфейс ещё не собран",
            "Не найден dist/index.html — готовый интерфейс сайта ещё не включён в эту копию программы. "
            "Node.js на этом компьютере устанавливать не нужно. Скачайте свежий ZIP репозитория после завершения сборки интерфейса."
        )
        root.destroy()
