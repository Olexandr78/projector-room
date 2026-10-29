import React, { useRef, useState } from 'react';
import { ProjectorState } from '../types';
import {
  FileText,
  Upload,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  BookOpen,
  Printer,
  Sparkles,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';

interface PdfTabProps {
  state: ProjectorState;
  onUpdateState: (partial: Partial<ProjectorState>) => void;
}

interface BuiltinPdfPage {
  pageNumber: number;
  section: string;
  title: string;
  paragraphs: string[];
  table?: { headers: string[]; rows: string[][] };
  formula?: string;
  checklist?: string[];
}

const BUILTIN_PDF_PAGES: BuiltinPdfPage[] = [
  {
    pageNumber: 1,
    section: 'Раздел 1 · Введение',
    title: 'Лабораторная работа №3: Подключение OLED-дисплея к ESP32',
    paragraphs: [
      'Цель работы: изучить интерфейс I2C (Inter-Integrated Circuit), подключить графический монохромный дисплей SSD1306 (128x64 точек) к плате ESP32 и вывести показания температуры.',
      'Оборудование: плата ESP32 NodeMCU, дисплей 0.96" OLED I2C, макетная плата (breadboard), комплект соединительных проводов "папа-мама", USB-кабель.',
      'Техника безопасности: все коммутации на макетной плате производить строго при отключенном питании USB!'
    ],
    checklist: [
      'Проверить отсутствие коротких замыканий между линиями 3V3 и GND',
      'Убедиться, что полярность питания дисплея VCC/GND не перепутана',
      'Запустить Thonny IDE и проверить связь с микроконтроллером'
    ]
  },
  {
    pageNumber: 2,
    section: 'Раздел 2 · Схема соединений',
    title: 'Таблица распиновки шины I2C (Wire)',
    paragraphs: [
      'Шина I2C использует две двунаправленные линии связи: SDA (Serial Data) для данных и SCL (Serial Clock) для тактовых импульсов синхронизации.',
      'По умолчанию аппаратный контроллер I2C0 микроконтроллера ESP32 сконфигурирован на пины GPIO 21 и GPIO 22.'
    ],
    table: {
      headers: ['Пин дисплея OLED', 'Назначение', 'Пин ESP32 NodeMCU', 'Уровень напряжения'],
      rows: [
        ['GND', 'Общий провод (земля)', 'GND', '0.0 Вольт'],
        ['VCC', 'Питание логики', '3V3', '+3.3 Вольта'],
        ['SCL (SCK)', 'Тактовая линия I2C', 'GPIO 22', '3.3V Logic'],
        ['SDA', 'Линия данных I2C', 'GPIO 21', '3.3V Logic']
      ]
    }
  },
  {
    pageNumber: 3,
    section: 'Раздел 3 · Программный код',
    title: 'Листинг прошивки на MicroPython: Инициализация шины',
    paragraphs: [
      'Для работы с дисплеем используем стандартный драйвер ssd1306.py. Адрес устройства на шине в шестнадцатеричном виде: 0x3C.',
      'Пример вызова сканера шины I2C: i2c.scan() должен возвращать список [60], что соответствует 0x3C в десятичной системе.'
    ],
    formula: 'Скорость шины: freq = 400_000 (Fast Mode I2C 400 кГц)',
    checklist: [
      'Загрузить библиотеку ssd1306.py в память микроконтроллера',
      'Создать экземпляр I2C(0, scl=Pin(22), sda=Pin(21))',
      'Вывести тестовую строку oled.text("PROJECTOR ROOM", 0, 0)',
      'Обязательно вызвать oled.show() для передачи буфера в видеопамять'
    ]
  },
  {
    pageNumber: 4,
    section: 'Раздел 4 · Контрольные вопросы',
    title: 'Вопросы для защиты лабораторной работы',
    paragraphs: [
      'Каждый студент должен ответить на один из вопросов преподавателя перед получением итоговой отметки:',
      '1. Почему шина I2C требует подтягивающих резисторов (pull-up) к линии питания?',
      '2. Сколько устройств максимально можно подключить к одной линии I2C при 7-битной адресации?',
      '3. Чем отличается последовательный интерфейс SPI от I2C по скорости и числу проводов?',
      '4. Что произойдет, если подключить VCC дисплея к 5V вместо 3.3V?'
    ]
  }
];

export const PdfTab: React.FC<PdfTabProps> = ({ state, onUpdateState }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customPdfUrl, setCustomPdfUrl] = useState<string | null>(null);
  const [customPdfName, setCustomPdfName] = useState<string | null>(null);

  const activePdf = state.activePdf || {
    id: 'lab_guide_esp32',
    currentPage: 1,
    totalPages: BUILTIN_PDF_PAGES.length,
    scale: 1.0,
    url: undefined,
  };

  const handleUploadPdf = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setCustomPdfUrl(url);
    setCustomPdfName(file.name);

    onUpdateState({
      mode: 'pdf',
      activePdf: {
        id: `pdf_${Date.now()}`,
        currentPage: 1,
        totalPages: 10,
        scale: 1.0,
        url,
      },
    });
  };

  const changePage = (newPage: number) => {
    if (newPage < 1 || newPage > activePdf.totalPages) return;
    onUpdateState({
      mode: 'pdf',
      activePdf: {
        ...activePdf,
        currentPage: newPage,
      },
    });
  };

  const changeScale = (delta: number) => {
    const nextScale = Math.min(2.0, Math.max(0.7, activePdf.scale + delta));
    onUpdateState({
      activePdf: {
        ...activePdf,
        scale: nextScale,
      },
    });
  };

  const currentPageData = BUILTIN_PDF_PAGES[activePdf.currentPage - 1] || BUILTIN_PDF_PAGES[0];

  return (
    <div className="space-y-6">
      {/* Top PDF Controls Toolbar */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-100">
              {customPdfName || 'Методическое пособие: Лабораторная работа по ESP32.pdf'}
            </h3>
            <p className="text-xs text-neutral-400">
              Высокочеткий рендеринг PDF-документов без искажения шрифтов и таблиц
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-xs">
            <button
              onClick={() => changeScale(-0.1)}
              className="p-1 rounded hover:bg-neutral-800 text-neutral-300"
              title="Уменьшить масштаб"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-xs px-2 text-neutral-200">
              {Math.round(activePdf.scale * 100)}%
            </span>
            <button
              onClick={() => changeScale(0.1)}
              className="p-1 rounded hover:bg-neutral-800 text-neutral-300"
              title="Увеличить масштаб"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Page Switcher */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => changePage(activePdf.currentPage - 1)}
              disabled={activePdf.currentPage <= 1}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:pointer-events-none text-neutral-200 text-xs flex items-center gap-1 border border-neutral-700"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Стр.</span>
            </button>
            <span className="px-2.5 py-1 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono text-blue-400">
              {activePdf.currentPage} / {activePdf.totalPages}
            </span>
            <button
              onClick={() => changePage(activePdf.currentPage + 1)}
              disabled={activePdf.currentPage >= activePdf.totalPages}
              className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none text-white text-xs font-semibold flex items-center gap-1 shadow-sm"
            >
              <span>Стр.</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors border border-neutral-700"
          >
            <Upload className="w-4 h-4 text-blue-400" />
            <span>Загрузить свой PDF</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleUploadPdf}
          />
        </div>
      </div>

      {/* Main Document Reader Area */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-8 shadow-inner overflow-hidden flex flex-col items-center">
        {customPdfUrl ? (
          /* Custom User Uploaded PDF */
          <div className="w-full max-w-4xl h-[560px] bg-white rounded-lg shadow-2xl overflow-hidden">
            <iframe
              src={`${customPdfUrl}#toolbar=0&navpanes=0`}
              title="Custom PDF Document"
              className="w-full h-full border-none"
            />
          </div>
        ) : (
          /* High-Fidelity Educational PDF Sheet Representation */
          <div
            className="w-full max-w-3xl bg-neutral-900 border border-neutral-700/80 rounded-lg shadow-2xl p-8 text-neutral-100 transition-transform"
            style={{ transform: `scale(${activePdf.scale})`, transformOrigin: 'top center' }}
          >
            {/* Header Sheet Banner */}
            <div className="border-b border-neutral-700 pb-4 mb-6 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-blue-400">
                  {currentPageData.section}
                </span>
                <h2 className="text-xl font-bold text-white mt-1">
                  {currentPageData.title}
                </h2>
              </div>
              <span className="text-xs font-mono text-neutral-400 bg-neutral-950 px-2.5 py-1 rounded border border-neutral-800">
                Стр. {currentPageData.pageNumber}
              </span>
            </div>

            {/* Paragraphs */}
            <div className="space-y-4 text-xs text-neutral-300 leading-relaxed">
              {currentPageData.paragraphs.map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}
            </div>

            {/* Table if present */}
            {currentPageData.table && (
              <div className="mt-6 border border-neutral-800 rounded-lg overflow-hidden bg-neutral-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-neutral-800/80 text-neutral-300 font-semibold border-b border-neutral-800">
                    <tr>
                      {currentPageData.table.headers.map((h, i) => (
                        <th key={i} className="px-3 py-2">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800 text-neutral-300">
                    {currentPageData.table.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-neutral-900/50">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-3 py-2 font-mono text-[11px]">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Formula / Code highlight if present */}
            {currentPageData.formula && (
              <div className="mt-5 p-3 rounded-lg bg-neutral-950 border border-blue-500/30 font-mono text-xs text-blue-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
                <span>{currentPageData.formula}</span>
              </div>
            )}

            {/* Checklist */}
            {currentPageData.checklist && (
              <div className="mt-6 space-y-2">
                <div className="text-xs font-semibold text-neutral-200">
                  Порядок выполнения действий:
                </div>
                <ul className="space-y-1.5 text-xs text-neutral-300">
                  {currentPageData.checklist.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Page Footer */}
            <div className="mt-8 pt-4 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
              <span>Кабинет информатики · Раздаточный материал</span>
              <span>Лист {activePdf.currentPage} из {activePdf.totalPages}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
