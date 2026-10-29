import React, { useEffect, useState } from 'react';
import { PresentationData, ProjectorState, SlideItem } from '../types';
import { SAMPLE_PRESENTATIONS } from '../constants/presets';
import {
  ChevronLeft,
  ChevronRight,
  Presentation,
  FileText,
  Lock,
  Upload,
  Layers,
  Code2,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { soundEffects } from '../utils/audio';

interface PresentationTabProps {
  state: ProjectorState;
  onUpdateState: (partial: Partial<ProjectorState>) => void;
  audioEnabled: boolean;
}

export const PresentationTab: React.FC<PresentationTabProps> = ({
  state,
  onUpdateState,
  audioEnabled,
}) => {
  const [selectedPresIndex, setSelectedPresIndex] = useState(0);
  const currentPresentation: PresentationData = SAMPLE_PRESENTATIONS[selectedPresIndex] || {
    id: '',
    title: '',
    subject: 'Нет загруженной презентации',
    slides: [],
  };

  const currentSlideIndex = state.activePresentation.currentSlideIndex;
  const currentSlide: SlideItem = currentPresentation.slides[currentSlideIndex] || {
    id: 0,
    title: 'Презентация не загружена',
    teacherNote: 'Откройте файл презентации, чтобы начать показ.',
  };
  const totalSlides = currentPresentation.slides.length;

  const goToSlide = (index: number) => {
    if (!currentPresentation.id || index < 0 || index >= totalSlides) return;
    if (audioEnabled) {
      soundEffects.playSlideClick();
    }
    onUpdateState({
      mode: 'presentation',
      activePresentation: {
        id: currentPresentation.id,
        currentSlideIndex: index,
      },
    });
  };

  const handlePrev = () => goToSlide(currentSlideIndex - 1);
  const handleNext = () => goToSlide(currentSlideIndex + 1);

  // Switch presentation deck
  const handleSelectPresentation = (idx: number) => {
    if (!SAMPLE_PRESENTATIONS[idx]) return;
    setSelectedPresIndex(idx);
    onUpdateState({
      mode: 'presentation',
      activePresentation: {
        id: SAMPLE_PRESENTATIONS[idx].id,
        currentSlideIndex: 0,
      },
    });
  };

  // Keyboard navigation for presentation clicker shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'Backspace') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlideIndex, totalSlides]);

  return (
    <div className="space-y-6">
      {/* Deck Selector & Presentation Mode Header */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Presentation className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-neutral-400">Колода слайдов:</span>
              <span className="text-xs text-neutral-400">Файл презентации не выбран</span>
            </div>
            <span className="text-xs text-neutral-400">
              {currentPresentation.subject} · {totalSlides} слайдов
            </span>
          </div>
        </div>

        {/* Clicker Remote Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            disabled={currentSlideIndex === 0}
            className="px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:pointer-events-none text-neutral-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-neutral-700"
            title="Предыдущий слайд (Стрелка влево / PageUp)"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Назад</span>
          </button>

          <div className="px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono font-medium text-emerald-400">
            {currentSlideIndex + 1} / {totalSlides}
          </div>

          <button
            onClick={handleNext}
            disabled={currentSlideIndex === totalSlides - 1}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:pointer-events-none text-neutral-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            title="Следующий слайд (Стрелка вправо / Пробел)"
          >
            <span>Вперед</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout: Slide Preview on Left, Teacher Notes on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Slide Visual Content (What class sees) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-500" />
              Контент слайда (Транслируется на экран)
            </span>
            <span className="text-[11px] text-neutral-500 font-mono">
              Управление: ← / → / Space
            </span>
          </div>

          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-6 min-h-[360px] flex flex-col justify-between shadow-inner relative overflow-hidden">
            {/* Slide Header */}
            <div>
              {currentSlide.badge && (
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded">
                  {currentSlide.badge}
                </span>
              )}
              <h2 className="text-xl font-bold text-white mt-2 leading-snug">
                {currentSlide.title}
              </h2>

              {/* Code Snippet if present */}
              {currentSlide.codeSnippet && (
                <div className="mt-4 rounded-lg bg-neutral-900 border border-neutral-800 p-3.5 font-mono text-xs text-emerald-300 overflow-x-auto">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-800 text-[10px] text-neutral-400">
                    <span className="flex items-center gap-1">
                      <Code2 className="w-3.5 h-3.5" />
                      main.py (MicroPython)
                    </span>
                    <span>UTF-8</span>
                  </div>
                  <pre>{currentSlide.codeSnippet}</pre>
                </div>
              )}

              {/* Bullets */}
              {currentSlide.bullets && (
                <ul className="mt-4 space-y-2.5">
                  {currentSlide.bullets.map((bullet, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-neutral-300 leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Slide Footer Key Concept */}
            {currentSlide.keyConcept && (
              <div className="mt-6 pt-3 border-t border-neutral-850 flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/20 px-3 py-2 rounded-lg border border-emerald-900/40">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span className="font-medium">{currentSlide.keyConcept}</span>
              </div>
            )}
          </div>

          {/* Slide Thumbnails Ribbon */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1">
            {currentPresentation.slides.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => goToSlide(idx)}
                className={`shrink-0 w-28 p-2 rounded-lg border text-left transition-all ${
                  idx === currentSlideIndex
                    ? 'border-emerald-500 bg-emerald-950/30 text-white ring-1 ring-emerald-500'
                    : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="text-[10px] font-mono text-neutral-500">Слайд {idx + 1}</div>
                <div className="text-[11px] font-medium truncate mt-0.5">{s.title}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Confidential Teacher Notes (Hidden from projector!) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Lock className="w-4 h-4" />
              Заметки учителя (Скрыто от проектора)
            </span>
            <span className="text-[11px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-mono">
              Только для монитора учителя
            </span>
          </div>

          <div className="bg-neutral-900 border border-amber-500/30 rounded-xl p-5 shadow-lg relative space-y-4 min-h-[360px] flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                <HelpCircle className="w-4 h-4" />
                <span>Методические подсказки и вопросы к аудитории:</span>
              </div>

              <div className="text-xs text-neutral-200 leading-relaxed bg-neutral-950 p-4 rounded-lg border border-neutral-800 font-sans">
                {currentSlide.teacherNote}
              </div>

              <div className="bg-neutral-950/60 p-3 rounded-lg border border-neutral-800 text-[11px] text-neutral-400 space-y-1.5">
                <div className="font-semibold text-neutral-300">💡 Советы для урока:</div>
                <p>• Нажмите <kbd className="px-1 py-0.5 bg-neutral-800 rounded font-mono text-[10px]">B</kbd> чтобы включить черную шторку и переключить внимание класса на себя.</p>
                <p>• Нажмите <kbd className="px-1 py-0.5 bg-neutral-800 rounded font-mono text-[10px]">F</kbd> чтобы заморозить слайд и втайне открыть следующий материал.</p>
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
              <span>Хронометраж слайда: ~2-3 мин</span>
              <button
                onClick={() => goToSlide(currentSlideIndex)}
                className="text-emerald-400 hover:underline text-xs"
              >
                Транслировать сейчас
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
