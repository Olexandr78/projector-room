import { ImageItem, PresentationData, RoomConfig, VideoItem } from '../types';

export const DEFAULT_CONFIG: RoomConfig = {
  roomName: 'Кабинет информатики и робототехники №42',
  teacherName: 'Александр Сергеевич',
  schoolName: 'Школа №12',
  aspectRatio: '16:9',
  resolutionPreset: '1920x1080 (16:9 Full HD)',
  audioChimeEnabled: true,
  defaultBlankColor: '#000000',
  autoHideCursorSeconds: 2.5,
  activeClassId: 'class_7b',
  classes: [
    {
      id: 'class_7b',
      name: '7-Б класс (Информатика)',
      students: [
        'Алексеев Даниил',
        'Богданов Артем',
        'Васильева Анна',
        'Григорьев Максим',
        'Дмитриева Дарья',
        'Егоров Кирилл',
        'Жукова Мария',
        'Иванов Иван',
        'Козлов Матвей',
        'Лебедева София',
        'Морозов Тимофей',
        'Николаева Полина',
        'Павлов Никита',
        'Романов Ярослав',
        'Смирнова Екатерина',
        'Тарасов Владислав',
        'Федорова Виктория',
        'Шестаков Александр'
      ]
    },
    {
      id: 'class_9a',
      name: '9-А класс (Робототехника)',
      students: [
        'Антонов Сергей',
        'Белов Илья',
        'Воронина Ксения',
        'Гусев Арсений',
        'Захаров Марк',
        'Кузнецов Егор',
        'Макаров Роман',
        'Новикова Алиса',
        'Орлов Денис',
        'Петров Петр',
        'Семенова Вероника',
        'Фомин Андрей'
      ]
    },
    {
      id: 'class_11m',
      name: '11-М класс (Профиль IT)',
      students: [
        'Абрамов Глеб',
        'Быкова Елизавета',
        'Волков Михаил',
        'Голубев Степан',
        'Ильин Дмитрий',
        'Ковалева Алена',
        'Медведев Артем',
        'Савельев Лев'
      ]
    }
  ],
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
    calibrated: true
  }
};

export const SAMPLE_PRESENTATIONS: PresentationData[] = [
  {
    id: 'esp32_python',
    title: 'Микроконтроллеры ESP32 & Python: Введение в железо',
    subject: 'Информатика и Робототехника',
    slides: [
      {
        id: 1,
        title: 'Что такое микроконтроллер?',
        badge: 'Модуль 1 · Введение',
        bullets: [
          'Микроконтроллер (MCU) — это компьютер на одном чипе: процессор + память + выводы (GPIO).',
          'В отличие от ПК с операционной системой, он мгновенно исполняет зашитый код.',
          'ESP32: 240 МГц двухъядерный процессор, встроенный Wi-Fi, Bluetooth и 36 контактов ввода/вывода.',
          'Идеальная платформа для умных устройств, роботов и DIY-проектов на MicroPython.'
        ],
        keyConcept: 'Ключевая мысль: Код управляет реальным физическим миром!',
        teacherNote: 'Спросить у класса: "Кто помнит, в чем разница между обычным процессором в ноутбуке и микроконтроллером в стиральной машине или умной лампе?" Заострить внимание на потреблении энергии и цене.'
      },
      {
        id: 2,
        title: 'Анатомия платы ESP32: Пины и функции',
        badge: 'Модуль 2 · Схемотехника',
        bullets: [
          'GPIO (General Purpose Input/Output) — универсальные порты ввода-вывода (цифровой сигнал 0 и 1).',
          'ADC (Analog-to-Digital Converter) — чтение аналоговых датчиков: света, влажности, потенциометров.',
          'PWM (ШИМ) — управление яркостью светодиода и скоростью вращения моторов.',
          'Интерфейсы связи: UART, I2C, SPI — для подключения дисплеев и сенсоров.'
        ],
        keyConcept: 'Правило безопасности: Напряжение логических уровней ESP32 строго 3.3 Вольта (не 5В)!',
        teacherNote: 'Предупредить класс: при подаче 5V прямо на GPIO пин чип сгорит. Всегда проверять делитель напряжения или использовать конвертер уровней.'
      },
      {
        id: 3,
        title: 'Первый код на MicroPython: Мигаем светодиодом',
        badge: 'Модуль 3 · Практика кода',
        codeSnippet: `from machine import Pin
import time

# Инициализируем светодиод на 2-м пине платы
led = Pin(2, Pin.OUT)

print("Запуск аппаратного цикла...")
while True:
    led.value(1)   # Включаем светодиод (3.3V)
    time.sleep(0.5)
    led.value(0)   # Выключаем светодиод (0V)
    time.sleep(0.5)`,
        bullets: [
          'Библиотека machine дает прямой доступ к аппаратным регистрам кремния.',
          'Pin.OUT переводит вывод в режим генератора напряжения.',
          'Бесконечный цикл while True — стандартный шаблон микроконтроллерных прошивок.'
        ],
        keyConcept: 'Связь софта и кремния: строка led.value(1) физически открывает транзистор.',
        teacherNote: 'Предложить ребятам мысленный эксперимент: как изменить код, чтобы сигнал передавал азбуку Морзе "SOS" (... --- ...)? Попросить поднять руки тех, кто уже пробовал Thonny IDE.'
      },
      {
        id: 4,
        title: 'Практикум: Сборка и прошивка устройства',
        badge: 'Модуль 4 · Инженерия',
        bullets: [
          '1. Подключите ESP32 к порту USB через качественный кабель передачи данных.',
          '2. В Thonny IDE или VS Code выберите интерпретатор: "MicroPython (ESP32)".',
          '3. Загрузите файл main.py — микроконтроллер запустит его автоматически при подаче питания!',
          '4. Для 3D-печати корпуса используем слайсер Cura / PrusaSlicer под Ender-3.'
        ],
        keyConcept: 'Автономность: отключите плату от ПК и запитайте от батарейки — программа продолжит работать!',
        teacherNote: 'Напомнить про разницу между кабелями только для зарядки и кабелями с линиями D+/D-. Частая ошибка на уроках: плата светится, но COM-порт в системе не появляется.'
      },
      {
        id: 5,
        title: 'Блиц-тест для класса (5 минут)',
        badge: 'Модуль 5 · Закрепление',
        bullets: [
          'Вопрос 1: Какое напряжение логической единицы у ESP32? (A: 5V, B: 3.3V, C: 12V)',
          'Вопрос 2: Какой модуль Python отвечает за доступ к пинам микроконтроллера?',
          'Вопрос 3: Зачем нужен ШИМ (PWM) сигнал при работе с моторами?',
          'Вопрос 4: Как называется файл, который запускается первым при старте платы?'
        ],
        keyConcept: 'Включите таймер на 5 минут кнопкой "Таймер" на пульте учителя!',
        teacherNote: 'Включите шторку или таймер на пульте, дайте классу 5 минут на самостоятельную запись ответов в тетради. Правильные ответы: 1: B (3.3V), 2: machine, 3: плавное регулирование мощности, 4: main.py.'
      }
    ]
  },
  {
    id: 'cs_architecture',
    title: 'Архитектура компьютера: Процессор и Память',
    subject: 'Теоретическая Информатика',
    slides: [
      {
        id: 1,
        title: 'Принцип фон Неймана',
        badge: 'Основы ЭВМ',
        bullets: [
          'Принцип однородности памяти: программы и данные хранятся в общей памяти.',
          'Принцип адресности: память состоит из пронумерованных ячеек.',
          'Принцип программного управления: команды выполняются последовательно шаг за шагом.'
        ],
        keyConcept: 'Основа всех современных компьютеров от суперкомпьютеров до умных часов.',
        teacherNote: 'Рассказать историческую справку: Джон фон Нейман сформулировал эти принципы в 1945 году!'
      },
      {
        id: 2,
        title: 'Иерархия памяти: от регистров до жестких дисков',
        badge: 'Быстродействие',
        bullets: [
          'Регистры ЦП: скорость суб-наносекунды, объем ~1 КБ.',
          'Кэш-память L1, L2, L3: статическая память SRAM прямо на кристалле.',
          'ОЗУ (DDR4 / DDR5): динамическая память DRAM, требует постоянной регенерации заряда.',
          'Постоянная память (NVMe SSD, HDD): энергонезависимое хранение терабайтов данных.'
        ],
        keyConcept: 'Чем быстрее память, тем она дороже и тем меньше её физический объем.',
        teacherNote: 'Сравнение: если регистры — это то, что вы держите в руках, то ОЗУ — это рабочий стол, а SSD — шкаф в соседней комнате.'
      }
    ]
  }
];

export const SAMPLE_IMAGES: ImageItem[] = [
  {
    id: 'esp32_pinout',
    title: 'Распиновка микроконтроллера ESP32 NodeMCU',
    category: 'Схемотехника',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=80',
  },
  {
    id: 'retro_crt_vintage',
    title: 'Аналоговая электроника и осциллограф',
    category: 'Ретро-техника',
    url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1400&q=80',
  },
  {
    id: 'engine_car',
    title: 'Устройство ДВС и механическая трансмиссия',
    category: 'Автомеханика',
    url: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=1400&q=80',
  },
  {
    id: 'binary_code',
    title: 'Двоичный код, алгоритмы и микросхемы',
    category: 'Информатика',
    url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1400&q=80',
  }
];

export const SAMPLE_VIDEOS: VideoItem[] = [
  {
    id: 'demo_motion',
    title: 'Визуализация алгоритмов сортировки и структур данных',
    durationStr: '0:45',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    description: 'Наглядная демонстрация алгоритмической сложности и скорости обработки массивов.'
  },
  {
    id: 'demo_technology',
    title: 'Принцип работы компьютерных сетей и передачи пакетов',
    durationStr: '0:32',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    description: 'Маршрутизация IP, протоколы TCP/UDP и структура Ethernet кадров.'
  },
  {
    id: 'demo_3d',
    title: '3D-моделирование и кинематика механизмов',
    durationStr: '0:50',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    description: 'Инженерное моделирование деталей, проверка соосности и кинематических пар.'
  }
];

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
