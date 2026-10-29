import React, { useState, useEffect, useRef } from 'react';
import { ProjectorState, RoomConfig, SyncMessage, TabType, ImageItem, VideoItem } from './types';
import { DEFAULT_CONFIG } from './constants/presets';
import { Header } from './components/Header';
import { ProfileModal } from './components/ProfileModal';
import { PresentationTab } from './components/PresentationTab';
import { PdfTab } from './components/PdfTab';
import { ImageTab } from './components/ImageTab';
import { VideoTab } from './components/VideoTab';
import { ClassroomToolsTab } from './components/ClassroomToolsTab';
import { BrowserTab } from './components/BrowserTab';
import { LiveMonitor } from './components/LiveMonitor';
import { ProjectorView } from './components/ProjectorView';
import {
  Presentation,
  FileText,
  Image as ImageIcon,
  Film,
  Globe,
  Wrench
} from 'lucide-react';
import { soundEffects } from './utils/audio';

const STORAGE_KEY_CONFIG = 'projector_room_config';
const STORAGE_KEY_STATE = 'projector_room_state';

export default function App() {
  // Check if this window was opened as the dedicated Projector Screen
  const isProjectorWindow =
    typeof window !== 'undefined' &&
    (new URLSearchParams(window.location.search).get('mode') === 'projector' ||
      window.location.pathname === '/projector');

  // Hidden universal file input for native "Открыть файл" menu action
  const universalFileInputRef = useRef<HTMLInputElement>(null);

  // 1. Room Configuration State
  const [config, setConfig] = useState<RoomConfig>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return DEFAULT_CONFIG;
  });

  // Profile modal visibility
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // 2. Active Tab in Teacher Console (ttk.Notebook style)
  const [activeTab, setActiveTab] = useState<TabType>('presentation');

  // Custom user uploads state
  const [customImages, setCustomImages] = useState<ImageItem[]>([]);
  const [customVideos, setCustomVideos] = useState<VideoItem[]>([]);

  // 3. Projector Shared State
  const [projectorState, setProjectorState] = useState<ProjectorState>({
    version: 1,
    mode: 'presentation',
    isBlackout: false,
    isFrozen: false,
    laserPointer: { active: false, x: 50, y: 50 },
    projectorBounds: config.projectorBounds || {
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
    },
    activeClassId: config.activeClassId || config.classes?.[0]?.id || '',
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
      title: 'Таймер проверочной работы',
      showOnProjector: true,
    },
    drawings: [],
  });

  // Projector window reference
  const projectorWindowRef = useRef<Window | null>(null);
  const [isProjectorWindowOpen, setIsProjectorWindowOpen] = useState(false);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Initialize BroadcastChannel for cross-window real-time synchronization
  useEffect(() => {
    try {
      const channel = new BroadcastChannel('projector_room_sync');
      broadcastChannelRef.current = channel;

      channel.onmessage = (event: MessageEvent<SyncMessage>) => {
        if (event.data?.type === 'PROJECTOR_READY') {
          setIsProjectorWindowOpen(true);
          // Send current state immediately
          channel.postMessage({
            type: 'STATE_UPDATE',
            sender: 'teacher',
            state: projectorState,
            timestamp: Date.now(),
          });
        }
      };
    } catch {}

    return () => {
      broadcastChannelRef.current?.close();
    };
  }, []);

  // Sync state across windows whenever it changes
  const updateProjectorState = (partial: Partial<ProjectorState>) => {
    setProjectorState((prev) => {
      const next = { ...prev, ...partial, version: prev.version + 1 };
      // Broadcast to other windows
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          type: 'STATE_UPDATE',
          sender: 'teacher',
          state: next,
          timestamp: Date.now(),
        });
      }
      try {
        localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Open a separate projector window and, when supported by the browser,
  // move it to the non-primary display. The browser may ask for screen permission.
  const handleOpenProjectorWindow = () => {
    // In the packaged desktop app, create the projector as another native WebView
    // window so it stays inside Projector Room instead of opening an external browser.
    const desktopApi = (window as Window & {
      pywebview?: { api?: { open_projector?: () => Promise<unknown> } };
    }).pywebview?.api;

    if (desktopApi?.open_projector) {
      desktopApi.open_projector()
        .then(() => setIsProjectorWindowOpen(true))
        .catch((error) => alert(`Не удалось открыть окно проектора: ${String(error)}`));
      return;
    }

    const url = `${window.location.origin}${window.location.pathname}?mode=projector`;
    const newWindow = window.open(
      url,
      'projector_screen_window',
      'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
    );
    if (!newWindow) {
      alert('Браузер заблокировал окно проектора. Разрешите всплывающие окна для этого приложения и повторите попытку.');
      return;
    }

    projectorWindowRef.current = newWindow;
    setIsProjectorWindowOpen(true);

    // Window Management API is experimental and requires a secure context and permission.
    // Fallback: the teacher can drag the opened projector window onto the projector display.
    const screenWindow = window as Window & {
      getScreenDetails?: () => Promise<{
        screens: Array<{
          isPrimary: boolean;
          availLeft: number;
          availTop: number;
          availWidth: number;
          availHeight: number;
        }>;
      }>;
    };
    if (screenWindow.getScreenDetails) {
      screenWindow.getScreenDetails().then((details) => {
        const secondary = details.screens.find((screen) => !screen.isPrimary);
        if (secondary && !newWindow.closed) {
          newWindow.moveTo(secondary.availLeft, secondary.availTop);
          newWindow.resizeTo(secondary.availWidth, secondary.availHeight);
          newWindow.focus();
        }
      }).catch(() => {
        // Permission denied or API unavailable: window stays movable manually.
      });
    }

    setTimeout(() => {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          type: 'STATE_UPDATE',
          sender: 'teacher',
          state: projectorState,
          timestamp: Date.now(),
        });
      }
    }, 500);
  };

  // Universal file opener handler (Intelligently detects type and routes to correct tab)
  const handleUniversalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    const url = URL.createObjectURL(file);

    if (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.bmp') || name.endsWith('.webp')) {
      const newImg: ImageItem = {
        id: `img_${Date.now()}`,
        title: file.name,
        category: 'Локальные файлы',
        url,
      };
      setCustomImages((prev) => [newImg, ...prev]);
      setActiveTab('images');
      updateProjectorState({
        mode: 'images',
        activeImage: {
          url,
          title: file.name,
          fit: 'contain',
          zoom: 1,
          rotation: 0,
          inverted: false,
        },
      });
    } else if (name.endsWith('.mp4') || name.endsWith('.mkv') || name.endsWith('.mov') || name.endsWith('.webm') || name.endsWith('.avi')) {
      const newVid: VideoItem = {
        id: `vid_${Date.now()}`,
        title: file.name,
        durationStr: 'Видео файл',
        url,
        description: 'Локальное видео преподавателя',
      };
      setCustomVideos((prev) => [newVid, ...prev]);
      setActiveTab('video');
      updateProjectorState({
        mode: 'video',
        activeVideo: {
          url,
          title: file.name,
          playing: true,
          currentTime: 0,
          duration: 60,
          volume: 0.8,
          muted: false,
          playbackRate: 1.0,
        },
      });
    } else if (name.endsWith('.pdf')) {
      setActiveTab('pdf');
      updateProjectorState({
        mode: 'pdf',
        activePdf: {
          id: `pdf_${Date.now()}`,
          currentPage: 1,
          totalPages: 10,
          scale: 1.0,
          url,
        },
      });
    } else if (name.endsWith('.pptx') || name.endsWith('.ppt')) {
      setActiveTab('presentation');
      updateProjectorState({
        mode: 'presentation',
        activePresentation: {
          id: '',
          currentSlideIndex: 0,
        },
      });
      alert(`Презентация ${file.name} загружена и готова к показу на проекторе.`);
    }
  };

  // Emergency Hotkeys: B for blackout, F for freeze, C for bell
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'b' || e.key === 'B' || e.key === 'и' || e.key === 'И') {
        e.preventDefault();
        updateProjectorState({ isBlackout: !projectorState.isBlackout });
      } else if (e.key === 'f' || e.key === 'F' || e.key === 'а' || e.key === 'А') {
        e.preventDefault();
        updateProjectorState({ isFrozen: !projectorState.isFrozen });
      } else if (e.key === 'c' || e.key === 'C' || e.key === 'с' || e.key === 'С') {
        if (config.audioChimeEnabled) {
          soundEffects.playSchoolBell();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [projectorState.isBlackout, projectorState.isFrozen, config.audioChimeEnabled]);

  const handleSelectClass = (classId: string) => {
    const updated = { ...config, activeClassId: classId };
    setConfig(updated);
    updateProjectorState({ activeClassId: classId });
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(updated));
    } catch {}
  };

  const handleSaveConfig = (newConfig: RoomConfig) => {
    setConfig(newConfig);
    updateProjectorState({
      projectorBounds: newConfig.projectorBounds,
      activeClassId: newConfig.activeClassId,
    });
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(newConfig));
    } catch {}
  };

  // If this window is dedicated to the Projector Screen, render clean ProjectorView directly
  if (isProjectorWindow) {
    return <ProjectorView config={config} initialState={projectorState} />;
  }

  // Active status description for native bottom status bar
  const getStatusText = () => {
    if (projectorState.isBlackout) return 'Шторка активна (экран скрыт)';
    if (projectorState.isFrozen) return 'Кадр заморожен';
    if (projectorState.mode === 'presentation') return 'Трансляция презентации';
    if (projectorState.mode === 'images') return `Показ изображения: ${projectorState.activeImage?.title || ''}`;
    if (projectorState.mode === 'video') return `Воспроизведение VLC: ${projectorState.activeVideo?.title || ''}`;
    if (projectorState.mode === 'pdf') return 'Просмотр документа PDF';
    if (projectorState.mode === 'browser') return `Окно браузера: ${projectorState.activeBrowser?.title || ''}`;
    return 'Готов к работе';
  };

  // Otherwise, render Native Desktop Teacher Console
  return (
    <div className="h-screen w-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans overflow-hidden select-none">
      {/* Hidden Universal File Dialog */}
      <input
        ref={universalFileInputRef}
        type="file"
        accept="image/*,video/*,application/pdf,.pptx,.ppt"
        className="hidden"
        onChange={handleUniversalFileSelect}
      />

      {/* 1. Native Desktop Window Header & Toolbar */}
      <Header
        config={config}
        isProjectorOpen={isProjectorWindowOpen}
        isBlackout={projectorState.isBlackout}
        isFrozen={projectorState.isFrozen}
        onOpenProjectorWindow={handleOpenProjectorWindow}
        onToggleBlackout={() => updateProjectorState({ isBlackout: !projectorState.isBlackout })}
        onToggleFreeze={() => updateProjectorState({ isFrozen: !projectorState.isFrozen })}
        onOpenSettings={() => setIsProfileOpen(true)}
        onOpenFilePicker={() => universalFileInputRef.current?.click()}
        onSelectClass={handleSelectClass}
      />

      {/* 2. Main Native Desktop Workspace (ttk.Notebook Tabs + Workspace) */}
      <div className="flex-1 flex flex-col min-h-0 bg-neutral-950">
        {/* Native ttk.Notebook Tab Bar */}
        <div className="bg-neutral-900 border-b border-neutral-800 px-3 pt-1 flex items-center gap-1 overflow-x-auto text-xs shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('presentation');
              updateProjectorState({ mode: 'presentation' });
            }}
            className={`px-4 py-2 border-t-2 font-medium flex items-center gap-2 transition-colors rounded-t ${
              activeTab === 'presentation'
                ? 'bg-neutral-950 border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-white hover:bg-neutral-850'
            }`}
          >
            <Presentation className="w-4 h-4" />
            <span>📊 Презентация PPTX</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('pdf');
              updateProjectorState({ mode: 'pdf' });
            }}
            className={`px-4 py-2 border-t-2 font-medium flex items-center gap-2 transition-colors rounded-t ${
              activeTab === 'pdf'
                ? 'bg-neutral-950 border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-white hover:bg-neutral-850'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>📄 Документы PDF</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('images');
              updateProjectorState({ mode: 'images' });
            }}
            className={`px-4 py-2 border-t-2 font-medium flex items-center gap-2 transition-colors rounded-t ${
              activeTab === 'images'
                ? 'bg-neutral-950 border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-white hover:bg-neutral-850'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>🖼️ Картинки</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('video');
              updateProjectorState({ mode: 'video' });
            }}
            className={`px-4 py-2 border-t-2 font-medium flex items-center gap-2 transition-colors rounded-t ${
              activeTab === 'video'
                ? 'bg-neutral-950 border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-white hover:bg-neutral-850'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>🎬 Видео (VLC)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('browser');
              updateProjectorState({ mode: 'browser' });
            }}
            className={`px-4 py-2 border-t-2 font-medium flex items-center gap-2 transition-colors rounded-t ${
              activeTab === 'browser'
                ? 'bg-neutral-950 border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-white hover:bg-neutral-850'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>🌐 Браузер</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tools')}
            className={`px-4 py-2 border-t-2 font-medium flex items-center gap-2 transition-colors rounded-t ${
              activeTab === 'tools'
                ? 'bg-neutral-950 border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-white hover:bg-neutral-850'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>⏱️ Таймер урока & Класс</span>
          </button>
        </div>

        {/* Tab Content & Split View Layout */}
        <div className="flex-1 min-h-0 p-3 overflow-y-auto">
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 h-full">
            {/* Left Main Workspace: Active Tab Content */}
            <div className="xl:col-span-8 min-h-0 space-y-4">
              {activeTab === 'presentation' && (
                <PresentationTab
                  state={projectorState}
                  onUpdateState={updateProjectorState}
                  audioEnabled={config.audioChimeEnabled}
                />
              )}

              {activeTab === 'pdf' && (
                <PdfTab state={projectorState} onUpdateState={updateProjectorState} />
              )}

              {activeTab === 'images' && (
                <ImageTab
                  state={projectorState}
                  onUpdateState={updateProjectorState}
                  customImages={customImages}
                  onAddCustomImage={(img) => setCustomImages((prev) => [img, ...prev])}
                />
              )}

              {activeTab === 'video' && (
                <VideoTab
                  state={projectorState}
                  onUpdateState={updateProjectorState}
                  customVideos={customVideos}
                  onAddCustomVideo={(vid) => setCustomVideos((prev) => [vid, ...prev])}
                />
              )}

              {activeTab === 'browser' && (
                <BrowserTab state={projectorState} onUpdateState={updateProjectorState} />
              )}

              {activeTab === 'tools' && (
                <ClassroomToolsTab
                  state={projectorState}
                  config={config}
                  onUpdateState={updateProjectorState}
                  onSelectClass={handleSelectClass}
                  onOpenSettings={() => setIsProfileOpen(true)}
                  audioEnabled={config.audioChimeEnabled}
                />
              )}
            </div>

            {/* Right Side: Embedded Live Monitor & Quick Status */}
            <div className="xl:col-span-4 min-h-0 space-y-3">
              <LiveMonitor
                state={projectorState}
                config={config}
                onUpdateState={updateProjectorState}
                onOpenProjectorWindow={handleOpenProjectorWindow}
              />

              {/* Native Hotkey Cheat Panel */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 text-xs text-neutral-400 space-y-2">
                <div className="text-neutral-200 font-medium text-[11px] flex items-center justify-between">
                  <span>Клавиши управления:</span>
                  <span className="font-mono text-amber-500 text-[10px]">Кликер активен</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-1 py-0.5 bg-neutral-950 border border-neutral-800 rounded font-mono text-neutral-300">
                      B
                    </kbd>
                    <span>Шторка</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-1 py-0.5 bg-neutral-950 border border-neutral-800 rounded font-mono text-neutral-300">
                      F
                    </kbd>
                    <span>Заморозка</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-1 py-0.5 bg-neutral-950 border border-neutral-800 rounded font-mono text-neutral-300">
                      C
                    </kbd>
                    <span>Звонок</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-1 py-0.5 bg-neutral-950 border border-neutral-800 rounded font-mono text-neutral-300">
                      Space
                    </kbd>
                    <span>Слайд / Пуск</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Native Desktop Status Bar at Bottom */}
      <div className="h-6 bg-neutral-950 border-t border-neutral-800 px-3 flex items-center justify-between text-[11px] text-neutral-400 font-mono shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-emerald-400 font-medium">● {getStatusText()}</span>
          <span className="text-neutral-700">|</span>
          <span>Кабинет: {config.roomName}</span>
        </div>

        <div className="flex items-center gap-3">
          <span>Разрешение: {config.resolutionPreset}</span>
          <span className="text-neutral-700">|</span>
          <span>VLC Engine: Готов</span>
          <span className="text-neutral-700">|</span>
          <span>projector_config.json</span>
        </div>
      </div>

      {/* Native Profile Setup Dialog */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        config={config}
        onSave={handleSaveConfig}
        onToggleCalibrationGrid={(show) =>
          updateProjectorState({
            projectorBounds: {
              ...projectorState.projectorBounds,
              showCalibrationGrid: show,
            },
          })
        }
      />
    </div>
  );
}
