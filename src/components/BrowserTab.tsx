import React, { useState } from 'react';
import { ProjectorState } from '../types';
import {
  Globe,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
  ExternalLink,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Cpu,
  Atom,
  Code2,
  BookOpen,
  MapPin
} from 'lucide-react';

interface BrowserTabProps {
  state: ProjectorState;
  onUpdateState: (partial: Partial<ProjectorState>) => void;
}

const EDUCATIONAL_PRESETS = [
  {
    name: 'Электрические цепи (PhET)',
    category: 'Физика',
    url: 'https://phet.colorado.edu/sims/html/circuit-construction-kit-dc/latest/circuit-construction-kit-dc_all.html',
    icon: Atom,
    description: 'Интерактивный конструктор батареек, лампочек и резисторов'
  },
  {
    name: 'Wokwi ESP32 & Arduino',
    category: 'Робототехника',
    url: 'https://wokwi.com',
    icon: Cpu,
    description: 'Аппаратный онлайн-симулятор микроконтроллеров и датчиков'
  },
  {
    name: 'Python Онлайн-компилятор',
    category: 'Информатика',
    url: 'https://trinket.io/python3',
    icon: Code2,
    description: 'Запуск и отладка кода Python прямо перед классом'
  },
  {
    name: 'Википедия (Энциклопедия)',
    category: 'Справка',
    url: 'https://ru.wikipedia.org',
    icon: BookOpen,
    description: 'Поиск научных статей и определений'
  },
  {
    name: 'Интерактивная карта мира',
    category: 'География',
    url: 'https://www.openstreetmap.org',
    icon: MapPin,
    description: 'Векторная мировая карта с масштабированием'
  }
];

export const BrowserTab: React.FC<BrowserTabProps> = ({ state, onUpdateState }) => {
  const currentBrowser = state.activeBrowser || {
    url: EDUCATIONAL_PRESETS[0].url,
    title: EDUCATIONAL_PRESETS[0].name,
    zoom: 1.0,
  };

  const [inputUrl, setInputUrl] = useState(currentBrowser.url);
  const [iframeKey, setIframeKey] = useState(1);

  const normalizeUrl = (raw: string): string => {
    let clean = raw.trim();
    if (!clean) return 'https://ru.wikipedia.org';
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean;
    }
    return clean;
  };

  const handleNavigate = (targetUrl?: string, title?: string) => {
    const finalUrl = normalizeUrl(targetUrl || inputUrl);
    setInputUrl(finalUrl);
    setIframeKey((prev) => prev + 1);

    onUpdateState({
      mode: 'browser',
      activeBrowser: {
        url: finalUrl,
        title: title || finalUrl,
        zoom: currentBrowser.zoom,
      },
    });
  };

  const handleRefresh = () => {
    setIframeKey((prev) => prev + 1);
  };

  const handleZoom = (delta: number) => {
    const nextZoom = Math.min(1.8, Math.max(0.7, currentBrowser.zoom + delta));
    onUpdateState({
      activeBrowser: {
        ...currentBrowser,
        zoom: nextZoom,
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* 1. Address Bar & Navigation Toolbar */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 shadow-sm space-y-2.5">
        <div className="flex items-center gap-2">
          {/* Navigation Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleRefresh}
              className="p-1.5 rounded bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 transition-colors"
              title="Обновить страницу"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleNavigate(EDUCATIONAL_PRESETS[0].url, EDUCATIONAL_PRESETS[0].name)}
              className="p-1.5 rounded bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 transition-colors"
              title="Домашняя страница"
            >
              <Home className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* URL Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleNavigate();
            }}
            className="flex-1 flex gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="Введите адрес сайта: https://phet.colorado.edu, wikipedia.org, wokwi.com..."
                className="w-full px-3 py-1.5 pl-8 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono text-neutral-100 focus:outline-none focus:border-amber-500"
              />
              <Globe className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2" />
            </div>

            <button
              type="submit"
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <span>На проектор</span>
            </button>
          </form>

          {/* Zoom controls for classroom readability */}
          <div className="flex items-center gap-1 bg-neutral-950 px-2 py-1 rounded border border-neutral-800 text-xs">
            <button
              type="button"
              onClick={() => handleZoom(-0.1)}
              className="p-0.5 rounded text-neutral-400 hover:text-white"
              title="Уменьшить масштаб текста"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="font-mono text-[11px] px-1 text-neutral-200">
              {Math.round(currentBrowser.zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => handleZoom(0.1)}
              className="p-0.5 rounded text-neutral-400 hover:text-white"
              title="Увеличить масштаб для задних парт"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Educational Presets Ribbon */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-neutral-800 text-xs">
          <span className="text-neutral-500 text-[11px] mr-1">Быстрые симуляторы:</span>
          {EDUCATIONAL_PRESETS.map((item, idx) => {
            const Icon = item.icon;
            const isCurrent = currentBrowser.url === item.url && state.mode === 'browser';

            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleNavigate(item.url, item.name)}
                className={`px-2.5 py-1 text-[11px] rounded flex items-center gap-1.5 transition-colors border ${
                  isCurrent
                    ? 'bg-amber-500 text-neutral-950 font-bold border-amber-400 shadow-sm'
                    : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border-neutral-800 hover:text-white'
                }`}
              >
                <Icon className="w-3 h-3 shrink-0" />
                <span>{item.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Privacy Indicator Notice */}
      <div className="flex items-center justify-between text-xs px-3 py-1.5 bg-neutral-950 rounded-lg border border-neutral-800 text-neutral-400">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>
            Изолированное окно проектора: личные закладки, история и мессенджеры учителя скрыты от учеников.
          </span>
        </div>
        <a
          href={currentBrowser.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-400 hover:underline flex items-center gap-1 text-[11px]"
        >
          <span>В новом окне</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* 3. Embedded Browser Preview in Teacher Console */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-2 h-[480px] flex items-center justify-center overflow-hidden shadow-inner">
        <iframe
          key={iframeKey}
          src={currentBrowser.url}
          title={currentBrowser.title}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          className="w-full h-full border-none rounded bg-white transition-transform"
          style={{
            transform: `scale(${currentBrowser.zoom})`,
            transformOrigin: 'top left',
            width: `${100 / currentBrowser.zoom}%`,
            height: `${100 / currentBrowser.zoom}%`,
          }}
        />
      </div>
    </div>
  );
};
