import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Use the worker version bundled with the installed PDF.js package.
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfPageViewerProps {
  url: string;
  pageNumber: number;
  scale?: number;
  onDocumentLoaded?: (totalPages: number) => void;
}

export const PdfPageViewer: React.FC<PdfPageViewerProps> = ({
  url,
  pageNumber,
  scale = 1,
  onDocumentLoaded,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const documentRef = useRef<any>(null);
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError('');
    documentRef.current = null;

    const loadingTask = pdfjsLib.getDocument({ url });
    loadingTask.promise.then((pdf: any) => {
      if (cancelled) {
        pdf.destroy();
        return;
      }
      documentRef.current = pdf;
      setIsLoading(false);
      onDocumentLoaded?.(pdf.numPages);
    }).catch((error: unknown) => {
      if (cancelled) return;
      setIsLoading(false);
      setLoadError(error instanceof Error ? error.message : String(error));
    });

    return () => {
      cancelled = true;
      documentRef.current = null;
      loadingTask.destroy();
    };
  }, [url]);

  useEffect(() => {
    let cancelled = false;
    let renderTask: any = null;

    const renderPage = async () => {
      const pdf = documentRef.current;
      const canvas = canvasRef.current;
      if (!pdf || !canvas) return;

      try {
        const safePage = Math.max(1, Math.min(pageNumber || 1, pdf.numPages));
        const page = await pdf.getPage(safePage);
        if (cancelled) return;

        const viewport = page.getViewport({ scale: Math.max(0.5, Math.min(2.5, scale)) });
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Не удалось создать холст для PDF');

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        renderTask = page.render({ canvasContext: context, viewport });
        await renderTask.promise;
      } catch (error) {
        if (!cancelled && !(error instanceof Error && error.name === 'RenderingCancelledException')) {
          setLoadError(error instanceof Error ? error.message : String(error));
        }
      }
    };

    void renderPage();
    return () => {
      cancelled = true;
      try { renderTask?.cancel(); } catch {}
    };
  }, [pageNumber, scale, url, isLoading]);

  if (loadError) {
    return <div className="p-6 text-sm text-red-300 bg-neutral-900 rounded-lg">Не удалось отобразить PDF: {loadError}</div>;
  }

  return (
    <div className="min-w-0 flex justify-center">
      {isLoading && <div className="absolute p-4 text-sm text-neutral-400">Загрузка PDF…</div>}
      <canvas
        ref={canvasRef}
        className="block max-w-full h-auto bg-white shadow-xl"
        aria-label={`Страница PDF ${pageNumber}`}
      />
    </div>
  );
};
