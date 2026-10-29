import React, { useState, useEffect } from 'react';
import { ProjectorState, RoomConfig, SchoolClass } from '../types';
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  Send,
  Sparkles,
  MousePointer,
  Trash2,
  Users,
  Grid,
  CheckCircle2,
  Sliders,
  ChevronDown,
  UserCheck
} from 'lucide-react';
import { soundEffects } from '../utils/audio';
import confetti from 'canvas-confetti';

interface ClassroomToolsTabProps {
  state: ProjectorState;
  config: RoomConfig;
  onUpdateState: (partial: Partial<ProjectorState>) => void;
  onSelectClass: (classId: string) => void;
  onOpenSettings: () => void;
  audioEnabled: boolean;
}

export const ClassroomToolsTab: React.FC<ClassroomToolsTabProps> = ({
  state,
  config,
  onUpdateState,
  onSelectClass,
  onOpenSettings,
  audioEnabled,
}) => {
  const [customAlertText, setCustomAlertText] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const [customTimerMinutes, setCustomTimerMinutes] = useState('');

  // Active class from config
  const classes = config.classes || [];
  const activeClass = classes.find((c) => c.id === config.activeClassId) || {
    id: '',
    name: 'Класс не выбран',
    students: [],
  };

  // Timer tick interval
  useEffect(() => {
    let timerId: NodeJS.Timeout | null = null;

    if (state.timer.active && state.timer.remainingSeconds > 0) {
      timerId = setInterval(() => {
        onUpdateState({
          timer: {
            ...state.timer,
            remainingSeconds: state.timer.remainingSeconds - 1,
          },
        });
      }, 1000);
    } else if (state.timer.active && state.timer.remainingSeconds === 0) {
      // Timer finished!
      if (audioEnabled) {
        soundEffects.playTimerComplete();
      }
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
      onUpdateState({
        timer: {
          ...state.timer,
          active: false,
        },
      });
    }

    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [state.timer.active, state.timer.remainingSeconds]);

  const applyCustomTimer = () => {
    const minutes = Number(customTimerMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 600) return;
    const seconds = Math.round(minutes * 60);
    onUpdateState({
      timer: {
        active: false,
        remainingSeconds: seconds,
        totalSeconds: seconds,
        title: 'Таймер',
        showOnProjector: true,
      },
    });
  };

  const toggleTimerActive = () => {
    if (!state.timer.active && audioEnabled) {
      soundEffects.playAttentionChime();
    }
    onUpdateState({
      timer: {
        ...state.timer,
        active: !state.timer.active,
      },
    });
  };

  const resetTimer = () => {
    onUpdateState({
      timer: {
        ...state.timer,
        active: false,
        remainingSeconds: state.timer.totalSeconds || 300,
      },
    });
  };

  const toggleTimerOnProjector = () => {
    onUpdateState({
      timer: {
        ...state.timer,
        showOnProjector: !state.timer.showOnProjector,
      },
    });
  };

  const sendBanner = (text: string, level: 'info' | 'warning' | 'urgent') => {
    if (audioEnabled) {
      soundEffects.playAttentionChime();
    }
    onUpdateState({
      classroomAlert: {
        visible: true,
        text,
        level,
      },
    });
  };

  const clearBanner = () => {
    onUpdateState({
      classroomAlert: null,
    });
  };

  const toggleLaser = () => {
    onUpdateState({
      laserPointer: {
        ...state.laserPointer,
        active: !state.laserPointer.active,
      },
    });
  };

  const clearDrawings = () => {
    onUpdateState({
      drawings: [],
    });
  };

  // Toggle calibration grid on the projector
  const toggleCalibrationGrid = () => {
    const nextVal = !state.projectorBounds?.showCalibrationGrid;
    onUpdateState({
      projectorBounds: {
        ...state.projectorBounds,
        showCalibrationGrid: nextVal,
      },
    });
  };

  // Pick random student from the currently selected class!
  const pickRandomStudent = () => {
    const pool = activeClass.students;
    setIsPicking(true);
    let count = 0;
    const interval = setInterval(() => {
      const rand = pool[Math.floor(Math.random() * pool.length)];
      setSelectedStudent(rand);
      count++;
      if (count > 15) {
        clearInterval(interval);
        setIsPicking(false);
        if (audioEnabled) {
          soundEffects.playSlideClick();
        }
      }
    }, 60);
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-4">
      {/* Top Bar: Active Class Switcher & Projector Bounds Status */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-amber-500" />
          <span className="text-neutral-400 font-medium">Активный класс на уроке:</span>
          <select
            value={config.activeClassId}
            onChange={(e) => onSelectClass(e.target.value)}
            className="px-2.5 py-1 bg-neutral-950 border border-neutral-700 rounded text-amber-400 font-semibold focus:outline-none focus:border-amber-500"
          >
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} ({cls.students.length} уч.)
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleCalibrationGrid}
            className={`px-2.5 py-1 rounded border text-xs font-medium flex items-center gap-1.5 transition-colors ${
              state.projectorBounds?.showCalibrationGrid
                ? 'bg-amber-500 text-neutral-950 border-amber-400 font-bold'
                : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border-neutral-800'
            }`}
            title="Вывести калибровочную сетку 16:9 / 4:3 на проектор"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Сетка граней проектора: {state.projectorBounds?.showCalibrationGrid ? 'ВКЛ' : 'ВЫКЛ'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 flex items-center gap-1"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-500" />
            <span>Настроить грани / классы</span>
          </button>
        </div>
      </div>

      {/* 1. Countdown Timer Section */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-neutral-800 text-xs">
          <div className="flex items-center gap-2 font-semibold text-neutral-200">
            <Clock className="w-4 h-4 text-amber-500" />
            <span>Таймер контрольной и самостоятельной работы</span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-neutral-300 bg-neutral-950 px-2.5 py-1 rounded border border-neutral-800">
            <input
              type="checkbox"
              checked={state.timer.showOnProjector}
              onChange={toggleTimerOnProjector}
              className="rounded accent-amber-500"
            />
            <span>Показывать плашку на проекторе</span>
          </label>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-1">
          <div className="flex items-baseline gap-3">
            <div className="text-4xl sm:text-5xl font-mono font-bold text-amber-400 tabular-nums">
              {formatTimer(state.timer.remainingSeconds)}
            </div>
            <span className="text-xs text-neutral-500 font-mono">
              / {formatTimer(state.timer.totalSeconds)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTimerActive}
              className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm ${
                state.timer.active
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 text-neutral-950'
              }`}
            >
              {state.timer.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{state.timer.active ? 'Пауза' : 'Старт таймера'}</span>
            </button>

            <button
              type="button"
              onClick={resetTimer}
              className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
              title="Сброс таймера"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-800 text-xs">
          <label className="text-neutral-400" htmlFor="custom-timer-minutes">Длительность (минуты):</label>
          <input
            id="custom-timer-minutes"
            type="number"
            min="1"
            max="600"
            step="1"
            value={customTimerMinutes}
            onChange={(e) => setCustomTimerMinutes(e.target.value)}
            placeholder="Введите минуты"
            className="w-32 px-2.5 py-1.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-100"
          />
          <button
            type="button"
            onClick={applyCustomTimer}
            disabled={!customTimerMinutes || Number(customTimerMinutes) <= 0 || Number(customTimerMinutes) > 600}
            className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 border border-neutral-700"
          >
            Установить
          </button>
        </div>
      </div>

      {/* 2. Split: Classroom Banners & Random Student Picker for ACTIVE CLASS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Random Student Picker */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-3 flex flex-col justify-between text-xs">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2 font-semibold text-neutral-200">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Кто к доске? ({activeClass.name})</span>
              </div>
              <span className="text-[10px] text-neutral-500">
                {activeClass.students.length} уч. в списке
              </span>
            </div>

            <div className="mt-3 p-4 rounded-lg bg-neutral-950 border border-neutral-800 text-center flex flex-col items-center justify-center min-h-[90px]">
              {selectedStudent ? (
                <div>
                  <div className="text-[10px] font-mono text-neutral-500 uppercase">
                    К доске вызывается:
                  </div>
                  <div className={`text-lg font-bold mt-1 text-emerald-400 ${isPicking ? 'animate-pulse' : ''}`}>
                    {selectedStudent}
                  </div>
                </div>
              ) : (
                <span className="text-neutral-500">
                  Нажмите кнопку для случайного выбора ученика из класса «{activeClass.name}»
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={pickRandomStudent}
            disabled={isPicking || activeClass.students.length === 0}
            className="w-full py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold rounded-lg transition-colors border border-neutral-700 flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Случайный ученик к доске</span>
          </button>
        </div>

        {/* Classroom Banners */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <div className="flex items-center gap-2 font-semibold text-neutral-200">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Объявления на проектор</span>
            </div>
            {state.classroomAlert?.visible && (
              <button
                type="button"
                onClick={clearBanner}
                className="text-[11px] text-red-400 hover:underline"
              >
                Снять
              </button>
            )}
          </div>

          <p className="text-neutral-500 text-[11px]">Готовых объявлений нет. Введите свой текст ниже.</p>

          {/* Custom Banner Input */}
          <div className="pt-2 border-t border-neutral-800 flex gap-2">
            <input
              type="text"
              value={customAlertText}
              onChange={(e) => setCustomAlertText(e.target.value)}
              placeholder="Свой текст: Д/З параграф 12..."
              className="flex-1 px-2.5 py-1.5 rounded bg-neutral-950 border border-neutral-800 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onClick={() => {
                if (customAlertText.trim()) {
                  sendBanner(customAlertText, 'warning');
                  setCustomAlertText('');
                }
              }}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded font-semibold flex items-center gap-1"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Экран</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
