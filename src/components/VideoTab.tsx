import React, { useRef, useState } from 'react';
import { ProjectorState, VideoItem } from '../types';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  FastForward,
  Rewind,
  Upload,
  Film,
  CheckCircle2,
  Repeat,
  Tv,
  Sparkles,
  Link2,
  ExternalLink,
  Youtube
} from 'lucide-react';

interface VideoTabProps {
  state: ProjectorState;
  onUpdateState: (partial: Partial<ProjectorState>) => void;
  customVideos: VideoItem[];
  onAddCustomVideo: (video: VideoItem) => void;
}

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const clean = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = clean.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export const VideoTab: React.FC<VideoTabProps> = ({
  state,
  onUpdateState,
  customVideos,
  onAddCustomVideo,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [youtubeUrlInput, setYoutubeUrlInput] = useState('');
  const [youtubeError, setYoutubeError] = useState<string | null>(null);

  const activeVid = state.activeVideo;
  const allVideos = [...customVideos];

  const handleSelectVideo = (vid: VideoItem) => {
    onUpdateState({
      mode: 'video',
      activeVideo: {
        url: vid.url,
        title: vid.title,
        playing: true,
        currentTime: 0,
        duration: 45,
        volume: 0.8,
        muted: false,
        playbackRate: 1.0,
        isYoutube: vid.isYoutube,
        youtubeId: vid.youtubeId,
      },
    });
  };

  const handleLaunchYouTube = (e: React.FormEvent) => {
    e.preventDefault();
    setYoutubeError(null);
    const ytId = extractYouTubeId(youtubeUrlInput);
    if (!ytId) {
      setYoutubeError('Некорректная ссылка на YouTube. Вставьте ссылку вида https://www.youtube.com/watch?v=...');
      return;
    }

    const embedUrl = `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&enablejsapi=1&rel=0`;
    const newVideo: VideoItem = {
      id: `yt_${ytId}`,
      title: `YouTube: Видео [${ytId}]`,
      durationStr: 'YouTube Online',
      url: embedUrl,
      description: 'Онлайн видео с видеохостинга YouTube',
      isYoutube: true,
      youtubeId: ytId,
    };

    onAddCustomVideo(newVideo);
    handleSelectVideo(newVideo);
    setYoutubeUrlInput('');
  };



  const handleUploadVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const newVid: VideoItem = {
      id: `vid_${Date.now()}`,
      title: file.name,
      durationStr: 'Локальное видео',
      url,
      description: 'Видеофайл преподавателя с компьютера',
      isYoutube: false,
    };
    onAddCustomVideo(newVid);
    handleSelectVideo(newVid);
  };

  const togglePlay = () => {
    if (!activeVid) return;
    onUpdateState({
      activeVideo: {
        ...activeVid,
        playing: !activeVid.playing,
      },
    });
  };

  const seekRelative = (delta: number) => {
    if (!activeVid) return;
    const newTime = Math.max(0, Math.min(activeVid.duration || 100, activeVid.currentTime + delta));
    onUpdateState({
      activeVideo: {
        ...activeVid,
        currentTime: newTime,
      },
    });
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeVid) return;
    const newTime = parseFloat(e.target.value);
    onUpdateState({
      activeVideo: {
        ...activeVid,
        currentTime: newTime,
      },
    });
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeVid) return;
    const vol = parseFloat(e.target.value);
    onUpdateState({
      activeVideo: {
        ...activeVid,
        volume: vol,
        muted: vol === 0,
      },
    });
  };

  const toggleMute = () => {
    if (!activeVid) return;
    onUpdateState({
      activeVideo: {
        ...activeVid,
        muted: !activeVid.muted,
      },
    });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-4">
      {/* 1. YouTube Link Hosting Input Bar */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-semibold text-neutral-100">
            <Youtube className="w-4 h-4 text-red-500" />
            <span>Трансляция видео с YouTube по ссылке:</span>
          </div>
          <span className="text-[11px] text-neutral-500 font-mono">
            Поддерживаются youtube.com, youtu.be, shorts
          </span>
        </div>

        <form onSubmit={handleLaunchYouTube} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={youtubeUrlInput}
              onChange={(e) => {
                setYoutubeUrlInput(e.target.value);
                setYoutubeError(null);
              }}
              placeholder="Вставьте ссылку на YouTube (например: https://www.youtube.com/watch?v=... или https://youtu.be/...)"
              className="w-full px-3 py-2 pl-9 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-100 focus:outline-none focus:border-red-500 font-sans"
            />
            <Link2 className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Вывести на проектор</span>
          </button>
        </form>

        {youtubeError && (
          <div className="text-red-400 text-[11px] font-sans">
            {youtubeError}
          </div>
        )}


      </div>

      {/* 2. Active Video Player & Controls */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-800 text-xs">
          <div className="flex items-center gap-2">
            {activeVid?.isYoutube ? (
              <Youtube className="w-5 h-5 text-red-500 shrink-0" />
            ) : (
              <Film className="w-5 h-5 text-orange-500 shrink-0" />
            )}
            <div>
              <h3 className="font-bold text-neutral-100 text-xs line-clamp-1">
                {activeVid ? activeVid.title : 'Видео не выбрано'}
              </h3>
              <p className="text-[11px] text-neutral-400">
                {activeVid?.isYoutube ? 'Хостинг: YouTube (онлайн видео)' : 'Движок: VLC Media Core (локальный файл)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg flex items-center gap-1.5 border border-neutral-700 transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-orange-400" />
              <span>Файл с ПК (.mp4, .mkv, .mov)</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleUploadVideo}
            />
          </div>
        </div>

        {activeVid ? (
          activeVid.isYoutube && activeVid.youtubeId ? (
            /* YouTube Player Embed in Teacher Console */
            <div className="space-y-3">
              <div className="aspect-video w-full max-w-2xl mx-auto rounded-lg overflow-hidden border border-neutral-800 bg-black shadow-lg">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${activeVid.youtubeId}?autoplay=1&enablejsapi=1`}
                  title={activeVid.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-none"
                />
              </div>
              <div className="text-center text-[11px] text-neutral-400">
                Видео транслируется прямо на проектор в чистом режиме без рекламы и интерфейса браузера
              </div>
            </div>
          ) : (
            /* Standard Local / Direct Video Remote Control Deck */
            <div className="space-y-3">
              <div className="space-y-1">
                <input
                  type="range"
                  min="0"
                  max={activeVid.duration || 100}
                  step="0.5"
                  value={activeVid.currentTime}
                  onChange={handleSeek}
                  className="w-full accent-orange-500 cursor-pointer h-1.5 bg-neutral-950 rounded"
                />
                <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
                  <span>{formatTime(activeVid.currentTime)}</span>
                  <span>{formatTime(activeVid.duration || 100)}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => seekRelative(-5)}
                    className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
                    title="Назад 5с"
                  >
                    <Rewind className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={togglePlay}
                    className="px-4 py-1.5 rounded bg-orange-500 hover:bg-orange-400 text-neutral-950 font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    {activeVid.playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    <span>{activeVid.playing ? 'Пауза' : 'Пуск'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => seekRelative(5)}
                    className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
                    title="Вперед 5с"
                  >
                    <FastForward className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdateState({
                      activeVideo: { ...activeVid, currentTime: 0, playing: false }
                    })}
                    className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white"
                    title="В начало"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Volume slider */}
                <div className="flex items-center gap-2 bg-neutral-950 px-3 py-1 rounded border border-neutral-800">
                  <button type="button" onClick={toggleMute} className="text-neutral-400 hover:text-white">
                    {activeVid.muted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-orange-400" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={activeVid.muted ? 0 : activeVid.volume}
                    onChange={handleVolumeChange}
                    className="w-20 accent-orange-500 h-1.5 bg-neutral-800 rounded"
                  />
                  <span className="text-[10px] font-mono text-neutral-400 min-w-8">
                    {Math.round((activeVid.muted ? 0 : activeVid.volume) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="py-6 text-center text-neutral-500 text-xs">
            Вставьте ссылку на видео с YouTube или выберите файл из каталога ниже.
          </div>
        )}
      </div>

      {/* 3. Catalog of Videos */}
      <div>
        <div className="flex items-center justify-between mb-2 text-xs">
          <span className="font-semibold text-neutral-400 uppercase tracking-wider">
            Доступные ролики и материалы к урокам ({allVideos.length})
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {allVideos.map((vid) => {
            const isSelected = activeVid?.url === vid.url && state.mode === 'video';

            return (
              <div
                key={vid.id}
                onClick={() => handleSelectVideo(vid)}
                className={`p-3 rounded-lg border cursor-pointer transition-all bg-neutral-900 ${
                  isSelected
                    ? 'border-orange-500 ring-1 ring-orange-500/50 shadow-md'
                    : 'border-neutral-800 hover:border-neutral-700 hover:bg-neutral-850'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="w-7 h-7 rounded bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
                    {vid.isYoutube ? <Youtube className="w-4 h-4 text-red-500" /> : <Film className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500 bg-neutral-950 px-1.5 py-0.5 rounded border border-neutral-800">
                    {vid.durationStr}
                  </span>
                </div>

                <h4 className="mt-2 text-xs font-semibold text-neutral-200 line-clamp-1">
                  {vid.title}
                </h4>
                <p className="mt-1 text-[11px] text-neutral-400 line-clamp-1">
                  {vid.description}
                </p>

                <div className="mt-3 pt-2 border-t border-neutral-800 flex items-center justify-between text-[11px]">
                  <span className="text-neutral-500">
                    {isSelected ? 'На экране' : 'Клик для запуска'}
                  </span>
                  <span className="text-orange-400 font-medium">
                    {isSelected ? '● Играет' : 'Запустить'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
