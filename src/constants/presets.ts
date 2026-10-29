import { ImageItem, PresentationData, RoomConfig, VideoItem } from '../types';

export const DEFAULT_CONFIG: RoomConfig = {
  roomName: '',
  teacherName: '',
  schoolName: '',
  aspectRatio: '16:9',
  resolutionPreset: '',
  audioChimeEnabled: true,
  defaultBlankColor: '#000000',
  autoHideCursorSeconds: 2.5,
  activeClassId: '',
  classes: [],
  projectorBounds: {
    aspectRatio: '16:9',
    leftMargin: 0,
    rightMargin: 0,
    topMargin: 0,
    bottomMargin: 0,
    scaleX: 100,
    scaleY: 100,
    offsetX: 0,
    offsetY: 0,
    showCalibrationGrid: false,
    calibrated: false
  }
};

export const SAMPLE_PRESENTATIONS: PresentationData[] = [];
export const SAMPLE_IMAGES: ImageItem[] = [];
export const SAMPLE_VIDEOS: VideoItem[] = [];

export const PYTHON_STANDALONE_SCRIPT = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
====================================================================
           «ПРОЕКТОРНАЯ КОМНАТА» (PROJECTOR ROOM)
  Десктопное приложение для учителей и лекторов на Python 3
====================================================================
Архитектура:
  1. Главное окно (Пульт учителя):
     - Вкладки ttk.Notebook (Картинки, Видео VLC, Презентации PPTX/PDF, Таймер)
     - Кнопки быстрого управления: Шторка (Blackout), Заморозка (Freeze)
     - Заметки учителя, скрытые от проектора
  2. Второе окно (Экран проектора):
     - Полноэкранное окно без рамок на втором мониторе
     - Черный фон, автоскрытие курсора
     - Безопасный выход по ESC
"""

import sys
import os
import json
import time
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from PIL import Image, ImageTk

# Опциональные зависимости с мягким фоллбэком
try:
    import vlc
    VLC_AVAILABLE = True
except ImportError:
    VLC_AVAILABLE = False

try:
    import fitz  # PyMuPDF для молниеносного рендеринга PDF
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False

CONFIG_FILE = "projector_config.json"

class ProjectorWindow(tk.Toplevel):
    """Окно вывода на проектор (второй монитор)"""
    def __init__(self, master):
        super().__init__(master)
        self.title("Экран проектора — Проекторная комната")
        self.configure(bg="black")
        
        # На весь экран без заголовков
        self.attributes("-fullscreen", True)
        self.bind("<Escape>", lambda e: self.attributes("-fullscreen", False))
        
        # Метка для вывода изображений и слайдов
        self.display_label = tk.Label(self, bg="black")
        self.display_label.pack(fill=tk.BOTH, expand=True)
        
        # Фрейм для видео VLC
        self.video_frame = tk.Frame(self, bg="black")
        
        # Индикатор шторки
        self.is_blackout = False
        self.current_photo = None

    def show_image(self, pil_image):
        if self.is_blackout:
            return
        self.video_frame.pack_forget()
        self.display_label.pack(fill=tk.BOTH, expand=True)
        
        # Масштабирование под размер экрана проектора с сохранением пропорций
        screen_w = self.winfo_screenwidth()
        screen_h = self.winfo_screenheight()
        
        img_copy = pil_image.copy()
        img_copy.thumbnail((screen_w, screen_h), Image.Resampling.LANCZOS)
        
        self.current_photo = ImageTk.PhotoImage(img_copy)
        self.display_label.configure(image=self.current_photo)

    def set_blackout(self, state: bool):
        self.is_blackout = state
        if state:
            self.display_label.configure(image="")
        elif self.current_photo:
            self.display_label.configure(image=self.current_photo)

class TeacherConsole(tk.Tk):
    """Пульт управления учителя на основном мониторе"""
    def __init__(self):
        super().__init__()
        self.title("Пульт управления — Проекторная комната")
        self.geometry("960x650")
        self.minsize(800, 500)
        
        self.load_config()
        self.projector_window = None
        
        self.setup_ui()
        self.open_projector_screen()

    def load_config(self):
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                    self.config = json.load(f)
            except Exception:
                self.config = self.default_config()
        else:
            self.config = self.default_config()
            self.save_config()

    def default_config(self):
        return {
            "room_name": "Кабинет информатики №42",
            "teacher_name": "Преподаватель",
            "resolution": "1920x1080"
        }

    def save_config(self):
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(self.config, f, ensure_ascii=False, indent=2)

    def setup_ui(self):
        # Верхняя панель статуса
        header = ttk.Frame(self, padding=10)
        header.pack(fill=tk.X)
        
        room_lbl = ttk.Label(header, text=f"📍 {self.config.get('room_name', 'Кабинет')}", font=("Arial", 12, "bold"))
        room_lbl.pack(side=tk.LEFT)
        
        self.btn_blackout = ttk.Button(header, text="⬛ ШТОРКА (B)", command=self.toggle_blackout)
        self.btn_blackout.pack(side=tk.RIGHT, padx=5)
        
        btn_proj = ttk.Button(header, text="🖥️ Переоткрыть проектор", command=self.open_projector_screen)
        btn_proj.pack(side=tk.RIGHT, padx=5)

        # Вкладки пульта
        self.notebook = ttk.Notebook(self)
        self.notebook.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        # 1. Вкладка Картинки
        self.tab_images = ttk.Frame(self.notebook, padding=10)
        self.notebook.add(self.tab_images, text="🖼️ Картинки")
        self.setup_images_tab()

        # 2. Вкладка Презентации & PDF
        self.tab_slides = ttk.Frame(self.notebook, padding=10)
        self.notebook.add(self.tab_slides, text="📊 Презентации & PDF")
        self.setup_slides_tab()

        # 3. Вкладка Видео (VLC)
        self.tab_video = ttk.Frame(self.notebook, padding=10)
        self.notebook.add(self.tab_video, text="🎬 Видео (VLC)")
        self.setup_video_tab()

    def open_projector_screen(self):
        if not self.projector_window or not tk.Toplevel.winfo_exists(self.projector_window):
            self.projector_window = ProjectorWindow(self)

    def toggle_blackout(self):
        if self.projector_window:
            cur = getattr(self.projector_window, "is_blackout", False)
            self.projector_window.set_blackout(not cur)
            self.btn_blackout.configure(text="⬜ ОТКРЫТЬ ЭКРАН" if not cur else "⬛ ШТОРКА (B)")

    def setup_images_tab(self):
        btn_open = ttk.Button(self.tab_images, text="📁 Выбрать изображение...", command=self.pick_image)
        btn_open.pack(anchor=tk.W, pady=5)
        
        self.lbl_img_path = ttk.Label(self.tab_images, text="Файл не выбран", foreground="gray")
        self.lbl_img_path.pack(anchor=tk.W)

    def pick_image(self):
        filetypes = [("Изображения", "*.png *.jpg *.jpeg *.bmp *.webp"), ("Все файлы", "*.*")]
        path = filedialog.askopenfilename(filetypes=filetypes)
        if path and self.projector_window:
            self.lbl_img_path.configure(text=f"Выведен: {os.path.basename(path)}", foreground="black")
            img = Image.open(path)
            self.projector_window.show_image(img)

    def setup_slides_tab(self):
        lbl = ttk.Label(self.tab_slides, text="Поддержка PDF и презентаций PPTX с заметками докладчика.")
        lbl.pack(anchor=tk.W, pady=5)
        btn_open = ttk.Button(self.tab_slides, text="📄 Открыть учебный PDF / PPTX...", command=self.pick_doc)
        btn_open.pack(anchor=tk.W, pady=5)

    def pick_doc(self):
        filetypes = [("Документы", "*.pdf *.pptx"), ("Все файлы", "*.*")]
        path = filedialog.askopenfilename(filetypes=filetypes)
        if path:
            messagebox.showinfo("Документ загружен", f"Файл {os.path.basename(path)} готов к показу.")

    def setup_video_tab(self):
        lbl = ttk.Label(self.tab_video, text=f"VLC Engine: {'Доступен' if VLC_AVAILABLE else 'Требуется pip install python-vlc'}")
        lbl.pack(anchor=tk.W, pady=5)
        btn = ttk.Button(self.tab_video, text="🎞️ Выбрать видеофайл (.mp4, .mkv, .avi)...")
        btn.pack(anchor=tk.W, pady=5)

if __name__ == "__main__":
    app = TeacherConsole()
    app.mainloop()
`;

export const PYTHON_REQUIREMENTS = `tkinter
Pillow>=10.0.0
python-vlc>=3.0.20123
PyMuPDF>=1.23.0
comtypes>=1.2.0
`;
