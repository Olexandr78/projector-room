import React, { useRef } from 'react';
import { ImageItem, ProjectorState } from '../types';
import { SAMPLE_IMAGES } from '../constants/presets';
import {
  Upload,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Contrast,
  CheckCircle2,
  Image as ImageIcon,
  Layers,
  Sparkles
} from 'lucide-react';

interface ImageTabProps {
  state: ProjectorState;
  onUpdateState: (partial: Partial<ProjectorState>) => void;
  customImages: ImageItem[];
  onAddCustomImage: (img: ImageItem) => void;
}

export const ImageTab: React.FC<ImageTabProps> = ({
  state,
  onUpdateState,
  customImages,
  onAddCustomImage,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeImg = state.activeImage;
  const allImages = [...customImages];

  const handleSelectImage = (img: ImageItem) => {
    onUpdateState({
      mode: 'images',
      activeImage: {
        url: img.url,
        title: img.title,
        fit: 'contain',
        zoom: 1,
        rotation: 0,
        inverted: false,
      },
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const newImg: ImageItem = {
      id: `custom_${Date.now()}`,
      title: file.name,
      category: 'Мои файлы',
      url,
    };
    onAddCustomImage(newImg);
    handleSelectImage(newImg);
  };

  const updateImgParam = (updater: (prev: NonNullable<ProjectorState['activeImage']>) => Partial<NonNullable<ProjectorState['activeImage']>>) => {
    if (!activeImg) return;
    onUpdateState({
      activeImage: {
        ...activeImg,
        ...updater(activeImg),
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Upload & Quick Controls Bar */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4" />
            <span>Выбрать файл (.png, .jpg, .bmp, .webp)</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          <span className="text-xs text-neutral-400">
            Мгновенное масштабирование под разрешение проектора без искажений
          </span>
        </div>

        {/* Live Transformation Bar for Active Image */}
        {activeImg && (
          <div className="flex items-center gap-2 bg-neutral-950 p-1.5 rounded-lg border border-neutral-800 text-xs">
            <span className="text-neutral-400 px-2 font-medium">Режим показа:</span>

            {/* Fit mode */}
            <button
              onClick={() => updateImgParam(() => ({ fit: 'contain' }))}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                activeImg.fit === 'contain'
                  ? 'bg-neutral-800 text-amber-400 font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Вписать целиком
            </button>
            <button
              onClick={() => updateImgParam(() => ({ fit: 'cover' }))}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                activeImg.fit === 'cover'
                  ? 'bg-neutral-800 text-amber-400 font-semibold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Заполнить экран
            </button>

            <span className="w-px h-4 bg-neutral-800 mx-1" />

            {/* Zoom Controls */}
            <button
              onClick={() => updateImgParam((prev) => ({ zoom: Math.max(0.5, prev.zoom - 0.2) }))}
              className="p-1.5 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white"
              title="Уменьшить"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-xs text-neutral-200 min-w-10 text-center">
              {Math.round(activeImg.zoom * 100)}%
            </span>
            <button
              onClick={() => updateImgParam((prev) => ({ zoom: Math.min(3, prev.zoom + 0.2) }))}
              className="p-1.5 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white"
              title="Увеличить"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <span className="w-px h-4 bg-neutral-800 mx-1" />

            {/* Rotate */}
            <button
              onClick={() => updateImgParam((prev) => ({ rotation: (prev.rotation + 90) % 360 }))}
              className="p-1.5 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white flex items-center gap-1"
              title="Повернуть на 90°"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>{activeImg.rotation}°</span>
            </button>

            {/* Invert */}
            <button
              onClick={() => updateImgParam((prev) => ({ inverted: !prev.inverted }))}
              className={`p-1.5 rounded flex items-center gap-1 ${
                activeImg.inverted ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-neutral-800 text-neutral-300'
              }`}
              title="Инвертировать цвета (для чтения схем в светлой аудитории)"
            >
              <Contrast className="w-3.5 h-3.5" />
              <span>Инверсия</span>
            </button>
          </div>
        )}
      </div>

      {/* Grid of Available Images */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            <ImageIcon className="w-4 h-4 text-amber-500" />
            <span>Учебные схемы и иллюстрации к урокам</span>
          </div>
          <span className="text-xs text-neutral-500">
            Всего доступно: {allImages.length}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {allImages.map((img) => {
            const isSelected = activeImg?.url === img.url && state.mode === 'images';

            return (
              <div
                key={img.id}
                onClick={() => handleSelectImage(img)}
                className={`group relative rounded-xl overflow-hidden border cursor-pointer transition-all bg-neutral-900 ${
                  isSelected
                    ? 'border-amber-500 ring-2 ring-amber-500/30 shadow-lg'
                    : 'border-neutral-800 hover:border-neutral-700 hover:bg-neutral-850'
                }`}
              >
                {/* Thumbnail image container */}
                <div className="aspect-video w-full bg-neutral-950 overflow-hidden relative">
                  <img
                    src={img.url}
                    alt={img.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-amber-500 text-neutral-950 p-1 rounded-full shadow">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}
                  <span className="absolute bottom-2 left-2 text-[10px] bg-neutral-950/80 backdrop-blur-xs text-neutral-300 px-2 py-0.5 rounded border border-neutral-800">
                    {img.category}
                  </span>
                </div>

                {/* Info & action footer */}
                <div className="p-3">
                  <h4 className="text-xs font-semibold text-neutral-200 line-clamp-1 group-hover:text-amber-400 transition-colors">
                    {img.title}
                  </h4>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] text-neutral-500">
                      {isSelected ? 'Транслируется' : 'Нажмите для показа'}
                    </span>
                    <button
                      type="button"
                      className={`text-xs px-2.5 py-1 rounded transition-colors ${
                        isSelected
                          ? 'bg-amber-500/20 text-amber-400 font-medium'
                          : 'bg-neutral-800 group-hover:bg-amber-500 group-hover:text-neutral-950 text-neutral-300'
                      }`}
                    >
                      {isSelected ? 'На экране' : 'Показать'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
