import React, { useEffect, useState, useRef } from 'react';
import { ProjectorState, RoomConfig, SyncMessage } from '../types';
import { SAMPLE_PRESENTATIONS } from '../constants/presets';
import {
  Clock,
  FileText,
  Sparkles,
  Maximize,
  Minimize,
  Snowflake,
  Tv,
  CheckCircle2,
  Code2,
  Crosshair,
  Grid
} from 'lucide-react';

interface ProjectorViewProps {
  initialState?: ProjectorState;
  config: RoomConfig;
}

export const ProjectorView: React.FC<ProjectorViewProps> = ({ initialState, config }) => {
  const [state, setState] = useState<ProjectorState>(
    initialState || {
      version: 1,
      mode: 'presentation',
      isBlackout: false,
      isFrozen: false,
      laserPointer: { active: false, x: 50, y: 50 },
      projectorBounds: config.projectorBounds || {
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
        calibrated: true,
      },
      activeClassId: config.activeClassId || '',
      activeImage: null,
      activeVideo: null,
      activeBrowser: null,
      activePresentation: { id: '', currentSlideIndex: 0 },
      activePdf: null,
      classroomAlert: null,
      timer: {
        active: false,
        remainingSeconds: 300,
        totalSeconds: 300,
        title: 'Таймер',
        showOnProjector: true,
      },
      drawings: [],
    }
  );

  const [cursorVisible, setCursorVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const cursorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Cross-window BroadcastChannel synchronization
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('projector_room_sync');
      channel.onmessage = (event: MessageEvent<SyncMessage>) => {
        if (event.data && event.data.type === 'STATE_UPDATE' && event.data.state) {
          setState((prev) => {
            if (prev.isFrozen && event.data.state?.isFrozen) {
              return prev;
            }
            return event.data.state!;
          });
        }
      };

      // Notify teacher console that projector is ready
      channel.postMessage({
        type: 'PROJECTOR_READY',
        sender: 'projector',
        timestamp: Date.now(),
      });
    } catch {
      const handleStorage = (e: StorageEvent) => {
        if (e.key === 'projector_room_state' && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            setState(parsed);
          } catch {}
        }
      };
      window.addEventListener('storage', handleStorage);
      return () => window.removeEventListener('storage', handleStorage);
    }

    return () => {
      channel?.close();
    };
  }, []);

  // Video element playback synchronization
  useEffect(() => {
    if (state.mode === 'video' && state.activeVideo && videoRef.current) {
      const vid = videoRef.current;
      if (state.activeVideo.playing && vid.paused) {
        vid.play().catch(() => {});
      } else if (!state.activeVideo.playing && !vid.paused) {
        vid.pause();
      }

      if (Math.abs(vid.currentTime - state.activeVideo.currentTime) > 1.5) {
        vid.currentTime = state.activeVideo.currentTime;
      }

      vid.volume = state.activeVideo.volume;
      vid.muted = state.activeVideo.muted;
      vid.playbackRate = state.activeVideo.playbackRate || 1.0;
    }
  }, [state.mode, state.activeVideo]);

  // Auto-hide cursor logic
  useEffect(() => {
    const handleActivity = () => {
      setCursorVisible(true);
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }
      cursorTimeoutRef.current = setTimeout(() => {
        setCursorVisible(false);
      }, (config.autoHideCursorSeconds || 2.5) * 1000);
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('mousedown', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('mousedown', handleActivity);
      if (cursorTimeoutRef.current) clearTimeout(cursorTimeoutRef.current);
    };
  }, [config.autoHideCursorSeconds]);

  // Fullscreen keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      } else if (e.key === 'F11' || e.key === 'f') {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const activePres = SAMPLE_PRESENTATIONS.find((p) => p.id === state.activePresentation.id);
  const activeSlide = activePres?.slides[state.activePresentation.currentSlideIndex] || {
    id: 0,
    title: 'Презентация не загружена',
    teacherNote: '',
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Bounds calibration calculations
  const bounds = state.projectorBounds || config.projectorBounds || {
    aspectRatio: config.aspectRatio || '16:9',
    leftMargin: 0,
    rightMargin: 0,
    topMargin: 0,
    bottomMargin: 0,
    scaleX: 100,
    scaleY: 100,
    offsetX: 0,
    offsetY: 0,
    showCalibrationGrid: false,
    calibrated: true,
  };

  const showGrid = bounds.showCalibrationGrid;

  return (
    <div
      onDoubleClick={toggleFullscreen}
      className={`fixed inset-0 w-screen h-screen bg-black text-neutral-100 overflow-hidden select-none flex items-center justify-center ${
        cursorVisible ? 'cursor-default' : 'cursor-none'
      }`}
    >
      {/* Blackout Overlay ("Шторка") */}
      {state.isBlackout ? (
        <div className="absolute inset-0 bg-black z-50 flex items-center justify-center">
          <span className="sr-only">Черный экран (Шторка)</span>
        </div>
      ) : (
        /* Calibrated Container respecting physical bounds, margins & scale */
        <div
          className="w-full h-full relative flex items-center justify-center transition-all overflow-hidden"
          style={{
            paddingLeft: `${bounds.leftMargin}%`,
            paddingRight: `${bounds.rightMargin}%`,
            paddingTop: `${bounds.topMargin}%`,
            paddingBottom: `${bounds.bottomMargin}%`,
          }}
        >
          <div
            className={`w-full h-full relative flex items-center justify-center transition-transform ${
              bounds.aspectRatio === '4:3' ? 'max-w-[133.33vh]' : 'max-w-[177.78vh]'
            }`}
            style={{
              transform: `scale(${bounds.scaleX / 100}, ${bounds.scaleY / 100}) translate(${bounds.offsetX}%, ${bounds.offsetY}%)`,
              transformOrigin: 'center center',
            }}
          >
            {/* 1. Presentation Mode */}
            {state.mode === 'presentation' && (
              <div className="w-full h-full p-12 sm:p-16 flex flex-col justify-between bg-radial from-neutral-900 to-black">
                <div>
                  {activeSlide.badge && (
                    <span className="text-sm font-mono tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1 rounded-md">
                      {activeSlide.badge}
                    </span>
                  )}
                  <h1 className="text-3xl sm:text-5xl font-extrabold text-white mt-4 tracking-tight leading-tight">
                    {activeSlide.title}
                  </h1>

                  {/* Code Block if present */}
                  {activeSlide.codeSnippet && (
                    <div className="mt-6 rounded-xl bg-neutral-950/90 border border-neutral-800 p-5 font-mono text-sm sm:text-base text-emerald-300 shadow-2xl overflow-x-auto">
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-800 text-xs text-neutral-400">
                        <span className="flex items-center gap-2">
                          <Code2 className="w-4 h-4 text-emerald-400" />
                          MicroPython (ESP32)
                        </span>
                        <span>Аппаратный листинг</span>
                      </div>
                      <pre className="leading-relaxed">{activeSlide.codeSnippet}</pre>
                    </div>
                  )}

                  {/* Bullets List */}
                  {activeSlide.bullets && (
                    <ul className="mt-8 space-y-4">
                      {activeSlide.bullets.map((bullet, idx) => (
                        <li key={idx} className="flex items-start gap-4 text-lg sm:text-2xl text-neutral-200 leading-relaxed">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-3 shrink-0 shadow-sm" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Slide Bottom Bar */}
                {activeSlide.keyConcept && (
                  <div className="mt-8 pt-4 border-t border-neutral-800/80 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-base sm:text-lg text-emerald-400 font-semibold bg-emerald-950/40 px-4 py-2 rounded-xl border border-emerald-800/40">
                      <Sparkles className="w-5 h-5 shrink-0" />
                      <span>{activeSlide.keyConcept}</span>
                    </div>
                    <span className="text-sm font-mono text-neutral-500">
                      Слайд {state.activePresentation.currentSlideIndex + 1} из {activePres?.slides.length ?? 0}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 2. Images Tab Mode */}
            {state.mode === 'images' && state.activeImage && (
              <div className="w-full h-full flex items-center justify-center bg-black overflow-hidden">
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

            {/* 3. Video Tab Mode (Supports Local Files & YouTube Online Hosting) */}
            {state.mode === 'video' && state.activeVideo && (
              <div className="w-full h-full flex items-center justify-center bg-black">
                {state.activeVideo.isYoutube && state.activeVideo.youtubeId ? (
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${state.activeVideo.youtubeId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1`}
                    title={state.activeVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-none"
                  />
                ) : (
                  <video
                    ref={videoRef}
                    src={state.activeVideo.url}
                    className="w-full h-full object-contain"
                    autoPlay
                    playsInline
                    loop
                  />
                )}
              </div>
            )}

            {/* 4. PDF Tab Mode */}
            {state.mode === 'pdf' && (
              <div className="w-full h-full bg-neutral-900 flex items-center justify-center p-8">
                {state.activePdf?.url ? (
                  <iframe
                    src={`${state.activePdf.url}#toolbar=0&navpanes=0`}
                    title="PDF Document"
                    className="w-full h-full border-none rounded-lg shadow-2xl bg-white"
                  />
                ) : (
                  <div className="w-full max-w-3xl rounded-xl border border-neutral-700 bg-neutral-950 p-10 text-center text-neutral-300">
                    <FileText className="mx-auto mb-4 h-10 w-10 text-neutral-500" />
                    <h2 className="text-2xl font-semibold text-white">PDF не выбран</h2>
                    <p className="mt-2 text-sm text-neutral-400">
                      Выберите собственный PDF-файл на панели учителя, чтобы вывести его на проектор.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 5. Browser Tab Mode (Web pages & Simulators to Projector) */}
            {state.mode === 'browser' && state.activeBrowser && (
              <div className="w-full h-full bg-white flex items-center justify-center overflow-hidden">
                <iframe
                  src={state.activeBrowser.url}
                  title={state.activeBrowser.title}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                  allow="accelerometer; autoplay; encrypted-media; gyroscope"
                  className="w-full h-full border-none transition-transform"
                  style={{
                    transform: `scale(${state.activeBrowser.zoom})`,
                    transformOrigin: 'top left',
                    width: `${100 / state.activeBrowser.zoom}%`,
                    height: `${100 / state.activeBrowser.zoom}%`,
                  }}
                />
              </div>
            )}

            {/* 6. Idle Mode */}
            {state.mode === 'idle' && (
              <div className="text-center p-8">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mx-auto mb-4">
                  <Tv className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-neutral-200">{config.roomName}</h2>
                <p className="text-sm text-neutral-500 mt-1">{config.schoolName}</p>
              </div>
            )}

            {/* Projector Edge & Screen Calibration Grid Pattern Overlay */}
            {showGrid && (
              <div className="absolute inset-0 z-50 pointer-events-none border-4 border-amber-500 bg-amber-500/5 flex flex-col items-center justify-between p-6">
                {/* 4 Corner Markers */}
                <div className="w-full flex justify-between items-center font-mono text-sm font-bold text-amber-400">
                  <div className="bg-black/90 px-3 py-1 border border-amber-500 rounded">
                    ┌ ВЕРХНИЙ ЛЕВЫЙ УГОЛ (0,0)
                  </div>
                  <div className="bg-black/90 px-3 py-1 border border-amber-500 rounded">
                    ВЕРХНИЙ ПРАВЫЙ УГОЛ (100,0) ┐
                  </div>
                </div>

                {/* Center Crosshair Target */}
                <div className="flex flex-col items-center justify-center text-center bg-black/90 border-2 border-amber-500 p-6 rounded-2xl shadow-2xl max-w-xl">
                  <Crosshair className="w-16 h-16 text-amber-400 animate-spin" />
                  <h3 className="text-2xl font-bold text-amber-300 mt-2">
                    КАЛИБРОВКА ГРАНЕЙ ПРОЕКТОРА
                  </h3>
                  <p className="text-sm text-neutral-200 mt-1 font-sans">
                    Подгоните границы картинки на пульте учителя так, чтобы желтая рамка совпадала с краями вашего проекционного полотна/стены ({bounds.aspectRatio})!
                  </p>
                  <div className="mt-3 font-mono text-xs text-amber-400 bg-neutral-900 px-4 py-1.5 rounded-lg border border-neutral-700">
                    Масштаб: {bounds.scaleX}% × {bounds.scaleY}% | Поля: Л {bounds.leftMargin}% П {bounds.rightMargin}%
                  </div>
                </div>

                <div className="w-full flex justify-between items-center font-mono text-sm font-bold text-amber-400">
                  <div className="bg-black/90 px-3 py-1 border border-amber-500 rounded">
                    └ НИЖНИЙ ЛЕВЫЙ УГОЛ (0,100)
                  </div>
                  <div className="bg-black/90 px-3 py-1 border border-amber-500 rounded">
                    НИЖНИЙ ПРАВЫЙ УГОЛ (100,100) ┘
                  </div>
                </div>
              </div>
            )}

            {/* Annotations / Pen Layer */}
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
                    strokeWidth={draw.width * 1.5}
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
                <div className="w-6 h-6 rounded-full bg-red-500 animate-ping opacity-75" />
                <div className="w-4 h-4 rounded-full bg-red-400 absolute inset-1 shadow-xl shadow-red-500" />
              </div>
            )}

            {/* Corner Digital Countdown Timer */}
            {state.timer.showOnProjector && state.timer.active && (
              <div className="absolute top-6 right-6 z-40 flex items-center gap-2.5 px-4 py-2 rounded-xl bg-black/85 border border-amber-500/50 text-amber-400 font-mono text-xl sm:text-2xl font-bold shadow-2xl backdrop-blur-md">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
                <span>{formatTimer(state.timer.remainingSeconds)}</span>
              </div>
            )}

            {/* Classroom Urgent Banner Notification */}
            {state.classroomAlert?.visible && (
              <div className="absolute inset-x-0 bottom-0 z-40 p-5 bg-red-600/95 backdrop-blur-md text-white text-center font-bold text-lg sm:text-2xl shadow-2xl border-t border-red-400 animate-bounce">
                {state.classroomAlert.text}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fullscreen toggle button on hover at bottom right */}
      {cursorVisible && (
        <button
          onClick={toggleFullscreen}
          className="absolute bottom-4 right-4 z-50 p-2.5 rounded-lg bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-700 transition-opacity"
          title="На весь экран (Клавиша F11 / Двойной клик)"
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
};
