import React, { useRef, useState } from 'react';
import { FileSpreadsheet, FileText, Upload } from 'lucide-react';
import { ProjectorState } from '../types';
import { parseOfficeFile } from '../utils/officeDocuments';

interface OfficeTabProps {
  state: ProjectorState;
  onUpdateState: (partial: Partial<ProjectorState>) => void;
}

export const OfficeTab: React.FC<OfficeTabProps> = ({ state, onUpdateState }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const office = state.activeOffice;
  const activeSheet = office?.kind === 'excel' ? office.sheets?.[office.activeSheetIndex] : undefined;

  const openFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const parsed = await parseOfficeFile(file);
      onUpdateState({ mode: 'office', activeOffice: parsed });
    } catch (reason) {
      setError(String(reason));
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 flex items-center justify-center">
            {office?.kind === 'excel' ? <FileSpreadsheet className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Word и Excel</h3>
            <p className="text-xs text-neutral-400">Открытие документов на проекторе без Microsoft Office</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {office && <span className="max-w-64 truncate text-xs text-neutral-300">{office.title}</span>}
          <button type="button" disabled={busy} onClick={() => fileInputRef.current?.click()} className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2">
            <Upload className="w-4 h-4" /> {busy ? 'Открываю…' : 'Открыть файл'}
          </button>
          <input ref={fileInputRef} type="file" accept=".docx,.xlsx,.xls,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" className="hidden" onChange={(event) => void openFile(event.target.files?.[0])} />
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-xs text-red-300">{error}</div>}

      {!office && (
        <div className="rounded-xl border border-dashed border-neutral-700 bg-neutral-900/50 p-10 text-center">
          <FileSpreadsheet className="mx-auto mb-3 w-9 h-9 text-neutral-600" />
          <div className="text-sm font-semibold text-neutral-200">Выбери документ Word или таблицу Excel</div>
          <div className="mt-2 text-xs text-neutral-500">Поддерживаются .docx, .xlsx и .xls. Старый формат .doc не поддерживается.</div>
          <div className="mt-1 text-xs text-neutral-600">Максимальный размер файла — 20 МБ.</div>
        </div>
      )}

      {office?.kind === 'word' && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-2">
          <div className="text-xs font-semibold text-neutral-300">{office.title} — документ готов к показу</div>
          <div className="max-h-80 overflow-auto rounded-lg bg-white p-5 text-sm text-neutral-900">
            <div className="office-word-content" dangerouslySetInnerHTML={{ __html: office.htmlContent || '' }} />
          </div>
          <p className="text-[11px] text-neutral-500">Пульт показывает обработанный текст, а справа — реальное изображение окна проектора.</p>
        </div>
      )}

      {office?.kind === 'excel' && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-semibold text-neutral-200">Листы книги Excel</div>
            <select value={office.activeSheetIndex} onChange={(event) => onUpdateState({ activeOffice: { ...office, activeSheetIndex: Number(event.target.value) } })} className="max-w-64 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs text-white">
              {(office.sheets || []).map((sheet, index) => <option key={sheet.name + index} value={index}>{sheet.name}</option>)}
            </select>
          </div>
          <div className="max-h-96 overflow-auto rounded-lg border border-neutral-800">
            {activeSheet?.rows.length ? (
              <table className="min-w-full border-collapse text-left text-xs">
                <tbody>
                  {activeSheet.rows.slice(0, 14).map((row, rowIndex) => (
                    <tr key={rowIndex} className={rowIndex === 0 ? 'bg-neutral-800 text-white font-semibold' : 'bg-neutral-950 text-neutral-300'}>
                      {row.map((cell, cellIndex) => <td key={cellIndex} className="border-b border-r border-neutral-800 px-2 py-1.5 whitespace-nowrap">{cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="p-5 text-xs text-neutral-500">Лист пустой.</div>}
          </div>
          <p className="text-[11px] text-neutral-500">На проекторе отображается весь выбранный лист. Для скорости импорт ограничен 1000 строками, 50 столбцами и 20 000 ячейками суммарно.</p>
        </div>
      )}
    </div>
  );
};