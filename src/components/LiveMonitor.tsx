import React, { useRef, useState } from 'react';
import { ProjectorState, RoomConfig } from '../types';
import { SAMPLE_PRESENTATIONS } from '../constants/presets';
import {
  Maximize2,
  Tv,
  Snowflake,
  EyeOff,
  MousePointer,
  PenTool,
  Clock,
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface LiveMonitorProps {
  state: ProjectorState;
  config: RoomConfig;
  onUpdateState: (partial: Partial<ProjectorState>) => void;
  onOpenProjectorWindow: () => void;
}

export const LiveMonitor: React.FC<LiveMonitorProps> = ({
  state,
  config,
  onUpdateState,
  onOpenProjectorWindow,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPenColor, setCurrentPenColor] = useState('#ef4444'); // red

  // Handle laser pointer tracking across the monitor preview
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    if (state.laserPointer.active) {
      onUpdateState({
        laserPointer: {
          ...state.laserPointer,
          x,
          y,
        },
      });
    }

    if (isDrawing) {
      const activePath = state.drawings[state.drawings.length - 1];
      if (activePath) {
        const updatedPath = {
          ...activePath,
          points: [...activePath.points, { x, y }],
        };
        onUpdateState({
          drawings: [...state.drawings.slice(0, -1), updatedPath],
        });
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setIsDrawing(true);
    const newDrawing = {
      id: `draw_${Date.now()}`,
      points: [{ x, y }],
      color: currentPenColor,
      width: 3,
    };
    onUpdateState({
      drawings: [...state.drawings, newDrawing],
    });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  // Determine current active presentation & slide
  const activePres = SAMPLE_PRESENTATIONS.find((p) => p.id === state.activePresentation.id) || SAMPLE_PRESENTATIONS[0];
  const activeSlide = activePres.slides[state.activePresentation.currentSlideIndex] || activePres.slides[0];

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-xl space-y-3">
      {/* Monitor Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tv className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
            Превью проектора (То, что видит класс)
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-neutral-400 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
            {config.aspectRatio}
          </span>
          <button
            onClick={onOpenProjectorWindow}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title="Открыть отдельное окно проектора"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Screen Frame */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setIsDrawing(false)}
        className={`relative w-full bg-black rounded-lg overflow-hidden border border-neutral-800 select-none shadow-2xl ${
          config.aspectRatio === '4:3' ? 'aspect-4/3' : 'aspect-video'
        } ${state.laserPointer.active ? 'cursor-crosshair' : 'cursor-default'}`}
      >
        {/* Blackout State ("Шторка") */}
        {state.isBlackout ? (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center text-center p-4 z-40">
            <EyeOff className="w-8 h-8 text-neutral-700 mb-2" />
            <div className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Шторка активна (Черный экран)
            </div>
            <div className="text-[11px] text-neutral-600 mt-1">
              Класс видит только пустой экран. Нажмите клавишу «B» или кнопку в шапке.
            </div>
          </div>
        ) : (
          <>
            {/* 1. Presentation Mode Rendering */}
            {state.mode === 'presentation' && (
              <div className="absolute inset-0 p-6 flex flex-col justify-between text-white bg-radial from-neutral-900 to-neutral-950">
                <div>
                  {activeSlide.badge && (
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                      {activeSlide.badge}
                    </span>
                  )}
                  <h2 className="text-base font-bold text-white mt-1.5 leading-snug line-clamp-2">
                    {activeSlide.title}
                  </h2>

                  {/* Code snippet if present */}
                  {activeSlide.codeSnippet && (
                    <div className="mt-2 p-2 rounded bg-neutral-900/90 border border-neutral-800 font-mono text-[10px] text-emerald-300 max-h-24 overflow-hidden">
                      <pre>{activeSlide.codeSnippet.slice(0, 150)}...</pre>
                    </div>
                  )}

                  {/* Bullet points */}
                  {activeSlide.bullets && (
                    <ul className="mt-2 space-y-1">
                      {activeSlide.bullets.slice(0, 3).map((b, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-[11px] text-neutral-300">
                          <span className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                          <span className="line-clamp-1">{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {activeSlide.keyConcept && (
                  <div className="text-[10px] text-emerald-400 bg-emerald-950/40 px-2 py-1 rounded border border-emerald-900/40 truncate">
                    ✦ {activeSlide.keyConcept}
                  </div>
                )}
              </div>
            )}

            {/* 2. Image Mode Rendering */}
            {state.mode === 'images' && state.activeImage && (
              <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black">
                <img
                  src={state.activeImage.url}
                  alt={state.activeImage.title}
                  className={`max-w-full max-h-full transition-transform ${
                    state.activeImage.fit === 'cover' ? 'w-full h-full object-cover' : 'object-contain'
                  }`}
                  style={{
                    transform: `scale(${state.activeImage.zoom}) rotate(${state.activeImage.rotation}deg)`,
                    filter: state.activeImage.inverted ? 'invert(1)' : 'none',
                  }}
                />
              </div>
            )}

            {/* 3. Video Mode Rendering */}
            {state.mode === 'video' && state.activeVideo && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                {state.activeVideo.isYoutube && state.activeVideo.youtubeId ? (
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${state.activeVideo.youtubeId}?autoplay=1&mute=1&controls=0`}
                    title="Live Monitor YouTube"
                    className="w-full h-full border-none pointer-events-none"
                  />
                ) : (
                  <video
                    src={state.activeVideo.url}
                    className="w-full h-full object-contain"
                    autoPlay={state.activeVideo.playing}
                    muted
                    loop
                  />
                )}
              </div>
            )}

            {/* 4. PDF Mode Rendering */}
            {state.mode === 'pdf' && (
              <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center p-4">
                <div className="w-4/5 h-4/5 bg-neutral-950 border border-neutral-700 rounded p-4 text-[10px] text-neutral-300">
                  <div className="font-bold text-white text-xs mb-1">
                    Лабораторный практикум: ESP32 & OLED
                  </div>
                  <div className="text-neutral-500 mb-2">Страница {state.activePdf?.currentPage || 1}</div>
                  <p className="line-clamp-3">
                    Изучение интерфейса I2C, подключение дисплея SSD1306 к плате ESP32...
                  </p>
                </div>
              </div>
            )}

            {/* 5. Browser Mode Rendering */}
            {state.mode === 'browser' && state.activeBrowser && (
              <div className="absolute inset-0 bg-white flex items-center justify-center overflow-hidden">
                <iframe
                  src={state.activeBrowser.url}
                  title="Monitor Browser"
                  className="w-full h-full border-none pointer-events-none"
                />
              </div>
            )}

            {/* 6. Idle / Default Screen */}
            {state.mode === 'idle' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-radial from-neutral-900 to-black">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-2">
                  <Tv className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold text-neutral-200">
                  {config.roomName}
                </div>
                <div className="text-[10px] text-neutral-500 mt-0.5">
                  Ожидание выбора материала на пульте
                </div>
              </div>
            )}

            {/* Drawings & Annotation Canvas Layer */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
              {state.drawings.map((draw) => {
                if (draw.points.length < 2) return null;
                const pathD = draw.points.reduce((acc, pt, i) => {
                  return `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x}% ${pt.y}%`;
                }, '');
                return (
                  <path
                    key={draw.id}
                    d={pathD}
                    stroke={draw.color}
                    strokeWidth={draw.width}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              })}
            </svg>

            {/* Laser Pointer Dot */}
            {state.laserPointer.active && (
              <div
                className="absolute z-30 pointer-events-none -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${state.laserPointer.x}%`,
                  top: `${state.laserPointer.y}%`,
                }}
              >
                <div className="w-3.5 h-3.5 rounded-full bg-red-500 animate-ping opacity-75" />
                <div className="w-2.5 h-2.5 rounded-full bg-red-400 absolute inset-0.5 shadow-lg shadow-red-500" />
              </div>
            )}

            {/* Frozen Frame Badge ("Заморозка") */}
            {state.isFrozen && (
              <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 px-2 py-1 rounded bg-cyan-950/80 border border-cyan-500 text-cyan-300 text-[10px] font-mono shadow-md backdrop-blur-xs">
                <Snowflake className="w-3 h-3 text-cyan-400 animate-spin" />
                <span>ЭКРАН ЗАМОРОЖЕН</span>
              </div>
            )}

            {/* Corner Countdown Timer Overlay if enabled */}
            {state.timer.showOnProjector && state.timer.active && (
              <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/80 border border-amber-500/40 text-amber-400 text-xs font-mono font-bold shadow-lg backdrop-blur-xs">
                <Clock className="w-3.5 h-3.5 animate-pulse" />
                <span>{formatTimer(state.timer.remainingSeconds)}</span>
              </div>
            )}

            {/* Projector Bounds Calibration Grid Overlay */}
            {state.projectorBounds?.showCalibrationGrid && (
              <div className="absolute inset-0 z-35 pointer-events-none border-2 border-amber-500 bg-amber-500/10 flex flex-col items-center justify-center p-2 text-center">
                <span className="bg-black/90 text-amber-300 border border-amber-500 px-2 py-0.5 rounded text-[10px] font-bold">
                  КАЛИБРОВОЧНАЯ СЕТКА {state.projectorBounds.aspectRatio} ({state.projectorBounds.scaleX}%)
                </span>
                <span className="text-[9px] text-neutral-300 mt-0.5">
                  Проецируется на физический экран
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Monitor Footer Tips */}
      <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1">
        <span>Проводите мышью для лазерной указки</span>
        <span>Разрешение: {config.resolutionPreset}</span>
      </div>
    </div>
  );
};
