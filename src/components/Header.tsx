import React, { useState } from 'react';
import { RoomConfig } from '../types';
import {
  Projector,
  ExternalLink,
  EyeOff,
  Eye,
  Snowflake,
  Bell,
  Settings,
  FolderOpen,
  Monitor,
  Maximize2,
  Minus,
  X,
  Volume2
} from 'lucide-react';
import { soundEffects } from '../utils/audio';

interface HeaderProps {
  config: RoomConfig;
  isProjectorOpen: boolean;
  isBlackout: boolean;
  isFrozen: boolean;
  onOpenProjectorWindow: () => void;
  onToggleBlackout: () => void;
  onToggleFreeze: () => void;
  onOpenSettings: () => void;
  onOpenFilePicker: () => void;
  onSelectClass?: (classId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  config,
  isProjectorOpen,
  isBlackout,
  isFrozen,
  onOpenProjectorWindow,
  onToggleBlackout,
  onToggleFreeze,
  onOpenSettings,
  onOpenFilePicker,
  onSelectClass,
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const handlePlayBell = () => {
    if (config.audioChimeEnabled) {
      soundEffects.playSchoolBell();
    }
  };

  return (
    <div className="bg-neutral-900 border-b border-neutral-700/80 text-neutral-200 select-none">
      {/* 1. Native Desktop Window Title Bar */}
      <div className="h-8 bg-neutral-950 border-b border-neutral-800 px-3 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Projector className="w-3.5 h-3.5 text-amber-500" />
          <span className="font-medium text-neutral-300">
            Пульт управления — {config.roomName} — «Проекторная комната»
          </span>
          <span className="text-[10px] text-neutral-500 font-mono">
            ({config.resolutionPreset})
          </span>
        </div>

        {/* Window Controls (Minimize, Maximize, Close) */}
        <div className="flex items-center -mr-1">
          <button
            type="button"
            className="w-8 h-6 flex items-center justify-center hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
            title="Свернуть"
          >
            <Minus className="w-3 h-3" />
          </button>
          <button
            type="button"
            className="w-8 h-6 flex items-center justify-center hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
            title="Развернуть"
          >
            <Maximize2 className="w-2.5 h-2.5" />
          </button>
          <button
            type="button"
            className="w-8 h-6 flex items-center justify-center hover:bg-red-600 text-neutral-400 hover:text-white transition-colors"
            title="Закрыть программу"
            onClick={() => {
              if (confirm('Вы уверены, что хотите закрыть программу «Проекторная комната»?')) {
                window.close();
              }
            }}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 2. Native Desktop Menu Bar (Файл, Проектор, Вид, Инструменты, Справка) */}
      <div className="h-7 bg-neutral-900 px-2 flex items-center gap-1 text-[11px] border-b border-neutral-800 text-neutral-300 relative">
        <div className="relative">
          <button
            type="button"
            onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
            className={`px-2 py-0.5 rounded hover:bg-neutral-800 ${
              activeMenu === 'file' ? 'bg-neutral-800 text-white' : ''
            }`}
          >
            Файл
          </button>
          {activeMenu === 'file' && (
            <div className="absolute left-0 top-full mt-1 w-52 bg-neutral-900 border border-neutral-700 rounded-md shadow-2xl py-1 z-50 text-xs">
              <button
                type="button"
                onClick={() => {
                  onOpenFilePicker();
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-neutral-800 flex items-center justify-between"
              >
                <span>Открыть файл...</span>
                <span className="text-[10px] text-neutral-500 font-mono">Ctrl+O</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenSettings();
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-neutral-800 flex items-center justify-between"
              >
                <span>Конфигурация кабинета...</span>
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setActiveMenu(activeMenu === 'proj' ? null : 'proj')}
            className={`px-2 py-0.5 rounded hover:bg-neutral-800 ${
              activeMenu === 'proj' ? 'bg-neutral-800 text-white' : ''
            }`}
          >
            Проектор
          </button>
          {activeMenu === 'proj' && (
            <div className="absolute left-0 top-full mt-1 w-56 bg-neutral-900 border border-neutral-700 rounded-md shadow-2xl py-1 z-50 text-xs">
              <button
                type="button"
                onClick={() => {
                  onOpenProjectorWindow();
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-neutral-800 flex items-center justify-between"
              >
                <span>Открыть окно проектора</span>
                <span className="text-[10px] text-neutral-500 font-mono">F11</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onToggleBlackout();
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-neutral-800 flex items-center justify-between"
              >
                <span>Шторка (Черный экран)</span>
                <span className="text-[10px] text-neutral-500 font-mono">B</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onToggleFreeze();
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-neutral-800 flex items-center justify-between"
              >
                <span>Заморозка кадра</span>
                <span className="text-[10px] text-neutral-500 font-mono">F</span>
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setActiveMenu(activeMenu === 'tools' ? null : 'tools')}
            className={`px-2 py-0.5 rounded hover:bg-neutral-800 ${
              activeMenu === 'tools' ? 'bg-neutral-800 text-white' : ''
            }`}
          >
            Инструменты
          </button>
          {activeMenu === 'tools' && (
            <div className="absolute left-0 top-full mt-1 w-48 bg-neutral-900 border border-neutral-700 rounded-md shadow-2xl py-1 z-50 text-xs">
              <button
                type="button"
                onClick={() => {
                  handlePlayBell();
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-neutral-800 flex items-center justify-between"
              >
                <span>Школьный звонок</span>
                <span className="text-[10px] text-neutral-500 font-mono">C</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenSettings();
                  setActiveMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-neutral-800"
              >
                <span>Настройки профиля...</span>
              </button>
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2 text-[11px] text-neutral-400">
          <span className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isProjectorOpen ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <span>{isProjectorOpen ? 'Проектор: Активен (Окно 2)' : 'Встроенный монитор'}</span>
          </span>
        </div>
      </div>

      {/* 3. Native Toolbar Strip */}
      <div className="px-3 py-1.5 bg-neutral-900 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenFilePicker}
            className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center gap-1.5 transition-colors"
            title="Открыть учебный файл с компьютера"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
            <span>Открыть файл</span>
          </button>

          <span className="w-px h-4 bg-neutral-800 mx-0.5" />

          {/* Blackout button */}
          <button
            type="button"
            onClick={onToggleBlackout}
            className={`px-3 py-1 rounded font-medium border flex items-center gap-1.5 transition-colors ${
              isBlackout
                ? 'bg-red-600 text-white border-red-500'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700'
            }`}
            title="Шторка (Горячая клавиша B) — мгновенное затемнение проектора"
          >
            {isBlackout ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{isBlackout ? 'ЭКРАН СКРЫТ' : 'Шторка (B)'}</span>
          </button>

          {/* Freeze button */}
          <button
            type="button"
            onClick={onToggleFreeze}
            className={`px-3 py-1 rounded font-medium border flex items-center gap-1.5 transition-colors ${
              isFrozen
                ? 'bg-cyan-600 text-white border-cyan-400'
                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-neutral-700'
            }`}
            title="Заморозка (Горячая клавиша F) — фиксация кадра на экране проектора"
          >
            <Snowflake className="w-3.5 h-3.5" />
            <span>{isFrozen ? 'ЗАМОРОЖЕНО' : 'Заморозка (F)'}</span>
          </button>

          {/* School bell button */}
          <button
            type="button"
            onClick={handlePlayBell}
            className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 flex items-center gap-1.5 transition-colors"
            title="Звонок на урок / перемену (C)"
          >
            <Bell className="w-3.5 h-3.5 text-amber-400" />
            <span>Звонок (C)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Class Selector */}
          {config.classes && config.classes.length > 0 && onSelectClass && (
            <div className="flex items-center gap-1.5 bg-neutral-950 px-2 py-1 rounded border border-neutral-800 text-xs">
              <span className="text-neutral-500 text-[11px]">Класс:</span>
              <select
                value={config.activeClassId}
                onChange={(e) => onSelectClass(e.target.value)}
                className="bg-transparent text-amber-400 font-semibold text-xs focus:outline-none cursor-pointer"
              >
                {config.classes.map((cls) => (
                  <option key={cls.id} value={cls.id} className="bg-neutral-900 text-neutral-200">
                    {cls.name} ({cls.students.length} уч.)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Open second projector screen window */}
          <button
            type="button"
            onClick={onOpenProjectorWindow}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold rounded flex items-center gap-1.5 shadow-sm transition-colors"
            title="Вывести окно проектора на второй монитор"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Экран проектора (Окно #2)</span>
          </button>

          {/* Settings dialog button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-colors"
            title="Параметры кабинета и проектора"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
