import React, { useEffect, useRef, useState } from 'react';
import { ProjectorState, RoomConfig } from '../types';
import { ExternalLink, Tv } from 'lucide-react';

interface LiveMonitorProps {
  state: ProjectorState;
  config: RoomConfig;
  onUpdateState: (partial: Partial<ProjectorState>) => void;
  onOpenProjectorWindow: () => void;
}

type DesktopPreviewApi = {
  get_projector_preview_url?: () => Promise<string>;
};

const desktopApi = () =>
  (window as Window & { pywebview?: { api?: DesktopPreviewApi } }).pywebview?.api;

export const LiveMonitor: React.FC<LiveMonitorProps> = ({
  state,
  config,
  onUpdateState,
  onOpenProjectorWindow,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [projectorPreviewUrl, setProjectorPreviewUrl] = useState('');
  const [hasReceivedFrame, setHasReceivedFrame] = useState(false);

  // The preview is an MJPEG stream captured from the real projector window.
  // It is deliberately not a second iframe or a separately-rendered React page.
  useEffect(() => {
    let mounted = true;

    const connectToDesktopPreview = () => {
      const api = desktopApi();
      if (!api?.get_projector_preview_url) return;

      api.get_projector_preview_url()
        .then((url) => {
          if (mounted && typeof url === 'string' && url.length > 0) {
            setProjectorPreviewUrl(url);
            setHasReceivedFrame(false);
          }
        })
        .catch(() => {
          if (mounted) setProjectorPreviewUrl('');
        });
    };

    window.addEventListener('pywebviewready', connectToDesktopPreview);
    connectToDesktopPreview();

    return () => {
      mounted = false;
      window.removeEventListener('pywebviewready', connectToDesktopPreview);
    };
  }, []);

  // Keep laser-pointer and annotation input on the preview surface. The projector
  // window renders these changes; the captured frame then shows the same result.
  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));

    if (state.laserPointer.active) {
      onUpdateState({
        laserPointer: { ...state.laserPointer, x, y },
      });
    }

    if (isDrawing) {
      const activePath = state.drawings[state.drawings.length - 1];
      if (activePath) {
        onUpdateState({
          drawings: [
            ...state.drawings.slice(0, -1),
            { ...activePath, points: [...activePath.points, { x, y }] },
          ],
        });
      }
    }
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    setIsDrawing(true);
    onUpdateState({
      drawings: [
        ...state.drawings,
        {
          id: `draw_${Date.now()}`,
          points: [{ x, y }],
          color: '#ef4444',
          width: 3,
        },
      ],
    });
  };

  const handleMouseUp = () => setIsDrawing(false);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tv className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
            Превью проектора (реальное окно)
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

      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`relative w-full bg-black rounded-lg overflow-hidden border border-neutral-800 select-none shadow-2xl ${config.aspectRatio === '4:3' ? 'aspect-4/3' : 'aspect-video'} ${state.laserPointer.active ? 'cursor-crosshair' : 'cursor-default'}`}
      >
        {projectorPreviewUrl && (
          <img
            key={projectorPreviewUrl}
            src={projectorPreviewUrl}
            alt="Живое изображение окна проектора"
            draggable={false}
            onLoad={() => setHasReceivedFrame(true)}
            onError={() => setHasReceivedFrame(false)}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          />
        )}

        {!hasReceivedFrame && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-neutral-950 pointer-events-none">
            <Tv className="w-8 h-8 text-neutral-700 mb-2" />
            <div className="text-xs font-semibold text-neutral-300">
              {projectorPreviewUrl ? 'Ожидание кадра от окна проектора' : 'Превью доступно в настольной версии'}
            </div>
            <div className="text-[11px] text-neutral-600 mt-1">
              Откройте окно проектора кнопкой в правом верхнем углу
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1">
        <span>Показывается захват настоящего окна, а не копия страницы</span>
        <span>Разрешение: {config.resolutionPreset}</span>
      </div>
    </div>
  );
};
