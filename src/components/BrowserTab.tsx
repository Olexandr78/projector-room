import React, { useEffect, useRef, useState } from 'react';
import { ProjectorState } from '../types';
import {
  Globe,
  RotateCw,
  Home,
  ExternalLink,
  ShieldCheck,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

interface BrowserTabProps {
  state: ProjectorState;
  onUpdateState: (partial: Partial<ProjectorState>) => void;
}

export const BrowserTab: React.FC<BrowserTabProps> = ({ state, onUpdateState }) => {
  const currentBrowser = state.activeBrowser || {
    url: 'about:blank',
    title: 'Пустая страница',
    zoom: 1.0,
  };

  const [inputUrl, setInputUrl] = useState(currentBrowser.url);
  const [iframeKey, setIframeKey] = useState(1);
  const previewRef = useRef<HTMLDivElement>(null);

  type DesktopBrowserApi = {
    open_site?: (url: string) => Promise<unknown>;
    close_site?: () => Promise<unknown>;
    refresh_site?: () => Promise<unknown>;
    set_browser_preview_bounds?: (left: number, top: number, width: number, height: number) => Promise<unknown>;
    hide_browser_preview?: () => Promise<unknown>;
  };

  const desktopApi = () => (window as Window & { pywebview?: { api?: DesktopBrowserApi } }).pywebview?.api;

  // In the Windows desktop app, a native WebView is positioned directly over this
  // preview area. Unlike an iframe, it can display sites that forbid framing.
  useEffect(() => {
    const api = desktopApi();
    const host = previewRef.current;
    if (!api || !host || !api.set_browser_preview_bounds) return;

    const updateBounds = () => {
      const rect = host.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      void api.set_browser_preview_bounds!(
        Math.round(rect.left * dpr),
        Math.round(rect.top * dpr),
        Math.round(rect.width * dpr),
        Math.round(rect.height * dpr),
      ).catch(() => {});
    };
    updateBounds();
    const observer = new ResizeObserver(updateBounds);
    observer.observe(host);
    window.addEventListener('resize', updateBounds);
    window.addEventListener('scroll', updateBounds, true);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateBounds);
      window.removeEventListener('scroll', updateBounds, true);
      void api.hide_browser_preview?.().catch(() => {});
    };
  }, []);

  // Re-open the selected address when returning to the Browser tab.
  useEffect(() => {
    const api = desktopApi();
    if (!api) return;
    if (/^https?:\/\//i.test(currentBrowser.url)) {
      api.open_site?.(currentBrowser.url).catch((error) => {
        alert(`Не удалось открыть сайт во встроенном WebView: ${String(error)}`);
      });
    } else {
      api.close_site?.().catch(() => {});
    }
  }, [currentBrowser.url]);

  // Update the address field and shared state when the user follows a link
  // inside the native browser preview/projector WebView.
  useEffect(() => {
    const handleNativeNavigation = (event: Event) => {
      const url = (event as CustomEvent<string>).detail;
      if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return;
      setInputUrl(url);
      setIframeKey((previous) => previous + 1);
      if (url !== currentBrowser.url) {
        onUpdateState({
          mode: 'browser',
          activeBrowser: { url, title: url, zoom: currentBrowser.zoom },
        });
      }
    };
    window.addEventListener('projector-room-browser-navigate', handleNativeNavigation);
    return () => window.removeEventListener('projector-room-browser-navigate', handleNativeNavigation);
  }, [currentBrowser.url, currentBrowser.zoom, onUpdateState]);

  const normalizeUrl = (raw: string): string => {
    let clean = raw.trim();
    if (!clean || clean === 'about:blank') return 'about:blank';
    if (!/^https?:\/\//i.test(clean)) clean = 'https://' + clean;

    try {
      const parsed = new URL(clean);
      const host = parsed.hostname.toLowerCase();
      let videoId = '';
      if (host === 'youtu.be' || host.endsWith('.youtu.be')) {
        videoId = parsed.pathname.split('/').filter(Boolean)[0] || '';
      } else if (host === 'youtube.com' || host.endsWith('.youtube.com') ||
                 host === 'youtube-nocookie.com' || host.endsWith('.youtube-nocookie.com')) {
        videoId = parsed.searchParams.get('v') || '';
        if (!videoId) {
          const match = parsed.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/);
          if (match) videoId = match[1];
        }
      }

      // YouTube watch pages reject being framed. Use the official embed endpoint instead.
      if (videoId) {
        const embed = new URL('https://www.youtube-nocookie.com/embed/' + encodeURIComponent(videoId));
        embed.searchParams.set('enablejsapi', '1');
        embed.searchParams.set('controls', '1');
        embed.searchParams.set('playsinline', '1');
        embed.searchParams.set('rel', '0');
        embed.searchParams.set('origin', window.location.origin);
        return embed.toString();
      }
      return parsed.toString();
    } catch {
      return clean;
    }
  };

  const handleNavigate = (targetUrl?: string, title?: string) => {
    const finalUrl = normalizeUrl(targetUrl || inputUrl);
    setInputUrl(finalUrl);
    setIframeKey((prev) => prev + 1);

    // If the address is unchanged, React will not re-run the address effect.
    if (finalUrl === currentBrowser.url) {
      const api = desktopApi();
      if (/^https?:\/\//i.test(finalUrl)) {
        api?.open_site?.(finalUrl).catch((error) => alert(`Не удалось открыть сайт во встроенном WebView: ${String(error)}`));
      } else {
        api?.close_site?.().catch(() => {});
      }
    }

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
    const api = desktopApi();
    if (/^https?:\/\//i.test(currentBrowser.url) && api?.refresh_site) {
      api.refresh_site().catch((error) => alert(`Не удалось обновить сайт: ${String(error)}`));
    } else if (api?.open_site && /^https?:\/\//i.test(currentBrowser.url)) {
      api.open_site(currentBrowser.url).catch((error) => alert(`Не удалось обновить сайт: ${String(error)}`));
    } else {
      setIframeKey((prev) => prev + 1);
    }
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
              onClick={() => handleNavigate('about:blank', 'Пустая страница')}
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
                placeholder="Введите адрес сайта, например example.com"
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

      {/* 3. Website preview in the teacher application.
          On Windows desktop, a native WebView child is placed over this host. */}
      <div
        ref={previewRef}
        id="projector-room-browser-preview"
        className="bg-white border border-neutral-800 rounded-lg h-[480px] relative overflow-hidden shadow-inner"
      >
        {(window as Window & { pywebview?: { api?: DesktopBrowserApi } }).pywebview?.api ? (
          currentBrowser.url === 'about:blank' ? (
            <div className="absolute inset-0 bg-neutral-900 text-neutral-300 flex flex-col items-center justify-center p-8 text-center">
              <Globe className="w-12 h-12 text-amber-400 mb-4" />
              <h3 className="text-sm font-semibold text-neutral-100">Встроенный браузер</h3>
              <p className="text-xs mt-2">Введите адрес сайта выше и нажмите «На проектор».</p>
            </div>
          ) : null
        ) : (
          <iframe
            key={iframeKey}
            src={currentBrowser.url}
            title={currentBrowser.title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-presentation"
            className="absolute inset-0 w-full h-full border-none rounded bg-white"
            style={{
              transform: `scale(${currentBrowser.zoom})`,
              transformOrigin: 'top left',
              width: `${100 / currentBrowser.zoom}%`,
              height: `${100 / currentBrowser.zoom}%`,
            }}
          />
        )}
      </div>
    </div>
  );
};
