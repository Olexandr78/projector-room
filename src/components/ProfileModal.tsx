import React, { useState } from 'react';
import { RoomConfig, SchoolClass, ProjectorBounds } from '../types';
import {
  X,
  Save,
  Download,
  Upload,
  Monitor,
  Volume2,
  School,
  User,
  Users,
  Grid,
  Maximize,
  RotateCcw,
  Plus,
  Trash2,
  CheckCircle2,
  Sliders,
  Terminal,
  Crosshair
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: RoomConfig;
  onSave: (newConfig: RoomConfig) => void;
  onBoundsChange?: (bounds: ProjectorBounds) => void;
  onToggleCalibrationGrid?: (show: boolean) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
  onBoundsChange,
  onToggleCalibrationGrid,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'bounds' | 'classes' | 'installer'>('profile');

  // Room config state
  const [roomName, setRoomName] = useState(config.roomName);
  const [teacherName, setTeacherName] = useState(config.teacherName);
  const [schoolName, setSchoolName] = useState(config.schoolName);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '4:3'>(config.aspectRatio);
  const [resolutionPreset, setResolutionPreset] = useState(config.resolutionPreset);
  const [audioChimeEnabled, setAudioChimeEnabled] = useState(config.audioChimeEnabled);
  const [autoHideCursorSeconds, setAutoHideCursorSeconds] = useState(config.autoHideCursorSeconds);

  // Classes state
  const [classes, setClasses] = useState<SchoolClass[]>(config.classes || []);
  const [selectedClassId, setSelectedClassId] = useState<string>(config.activeClassId || config.classes?.[0]?.id || '');
  const [newClassName, setNewClassName] = useState('');
  const [studentInputText, setStudentInputText] = useState('');

  // Projector Bounds state
  const [bounds, setBounds] = useState<ProjectorBounds>(
    config.projectorBounds || {
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
    }
  );

  if (!isOpen) return null;

  const currentClass = classes.find((c) => c.id === selectedClassId) || classes[0];

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const updated: RoomConfig = {
      roomName: roomName.trim(),
      teacherName: teacherName.trim(),
      schoolName: schoolName.trim(),
      aspectRatio,
      resolutionPreset,
      audioChimeEnabled,
      defaultBlankColor: '#000000',
      autoHideCursorSeconds: Number(autoHideCursorSeconds) || 2.5,
      classes,
      activeClassId: selectedClassId || classes[0]?.id || 'default_class',
      projectorBounds: bounds,
    };
    onSave(updated);
    if (onToggleCalibrationGrid) {
      onToggleCalibrationGrid(bounds.showCalibrationGrid);
    }
    onClose();
  };

  const handleAddClass = () => {
    if (!newClassName.trim()) return;
    const newClass: SchoolClass = {
      id: `class_${Date.now()}`,
      name: newClassName.trim(),
      students: [
        'Иванов Иван',
        'Петров Петр',
        'Сидорова Анна'
      ],
    };
    const updated = [...classes, newClass];
    setClasses(updated);
    setSelectedClassId(newClass.id);
    setNewClassName('');
  };

  const handleDeleteClass = (id: string) => {
    if (classes.length <= 1) {
      alert('Должен оставаться хотя бы один класс!');
      return;
    }
    const updated = classes.filter((c) => c.id !== id);
    setClasses(updated);
    if (selectedClassId === id) {
      setSelectedClassId(updated[0].id);
    }
  };

  const handleUpdateStudents = (text: string) => {
    setStudentInputText(text);
    const names = text
      .split('\n')
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    setClasses((prev) =>
      prev.map((c) => (c.id === selectedClassId ? { ...c, students: names } : c))
    );
  };

  const handleSelectClass = (cId: string) => {
    setSelectedClassId(cId);
    const target = classes.find((c) => c.id === cId);
    if (target) {
      setStudentInputText(target.students.join('\n'));
    }
  };

  // Calibration bounds helpers
  const updateBound = (key: keyof ProjectorBounds, val: number | boolean | string) => {
    const next = { ...bounds, [key]: val };
    setBounds(next);
    onBoundsChange?.(next);
    if (key === 'showCalibrationGrid' && onToggleCalibrationGrid) {
      onToggleCalibrationGrid(val as boolean);
    }
  };

  const resetBounds = () => {
    const next: ProjectorBounds = {
      aspectRatio,
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
    setBounds(next);
    onBoundsChange?.(next);
  };

  const fit16to9 = () => {
    const next: ProjectorBounds = { ...bounds, aspectRatio: '16:9', leftMargin: 0, rightMargin: 0, topMargin: 0, bottomMargin: 0, scaleX: 100, scaleY: 100, offsetX: 0, offsetY: 0 };
    setBounds(next);
    onBoundsChange?.(next);
  };

  const fit4to3 = () => {
    const next: ProjectorBounds = { ...bounds, aspectRatio: '4:3', leftMargin: 12, rightMargin: 12, topMargin: 0, bottomMargin: 0, scaleX: 100, scaleY: 100, offsetX: 0, offsetY: 0 };
    setBounds(next);
    onBoundsChange?.(next);
  };

  const handleExportConfig = () => {
    const payload = {
      room_name: roomName,
      teacher_name: teacherName,
      school_name: schoolName,
      aspect_ratio: aspectRatio,
      resolution_preset: resolutionPreset,
      audio_chime_enabled: audioChimeEnabled,
      active_class_id: selectedClassId,
      classes,
      projector_bounds: bounds,
      exported_at: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'projector_config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadBatchInstaller = () => {
    // Pure ASCII with Windows CRLF (\r\n) - 100% immune to Russian OEM 866 codepage and CMD parenthesis parser errors
    const batContent = [
      '@echo off',
      'cd /d "%~dp0"',
      'title Projector Room - Auto Installer and Launcher',
      '',
      'echo ========================================================',
      'echo      PROJECTOR ROOM - Classroom Projection Hub',
      'echo ========================================================',
      'echo.',
      '',
      'echo [1/4] Enabling Screen Extension mode: displayswitch /extend',
      'start "" displayswitch.exe /extend',
      'ping 127.0.0.1 -n 2 >nul 2>&1',
      '',
      'echo [2/4] Checking Python 3 installation...',
      'set "PYTHON_EXE="',
      'where python >nul 2>&1 && set "PYTHON_EXE=python"',
      'if defined PYTHON_EXE goto :PythonFound',
      'where py >nul 2>&1 && set "PYTHON_EXE=py -3"',
      'if defined PYTHON_EXE goto :PythonFound',
      'where python3 >nul 2>&1 && set "PYTHON_EXE=python3"',
      'if defined PYTHON_EXE goto :PythonFound',
      '',
      'echo [ERROR] Python 3 was not found in PATH!',
      'echo Please install Python 3 from https://www.python.org/',
      'echo Make sure to check "Add Python to PATH" during installation.',
      'echo.',
      'pause',
      'exit /b 1',
      '',
      ':PythonFound',
      'echo Python detected: %PYTHON_EXE%',
      '',
      'if exist "%~dp0requirements.txt" goto :InstallReqFile',
      '',
      'echo [3/4] Installing default packages: Pillow python-vlc PyMuPDF python-pptx yt-dlp',
      '%PYTHON_EXE% -m pip install Pillow python-vlc PyMuPDF python-pptx yt-dlp',
      'goto :LaunchApp',
      '',
      ':InstallReqFile',
      'echo [3/4] Installing required libraries from requirements.txt',
      '%PYTHON_EXE% -m pip install --upgrade pip',
      '%PYTHON_EXE% -m pip install -r "%~dp0requirements.txt"',
      '',
      ':LaunchApp',
      'echo [4/4] Starting Projector Room main.py...',
      'start "" %PYTHON_EXE% "%~dp0main.py"',
      '',
      'echo.',
      'echo ========================================================',
      'echo SUCCESS: Projector Room is running!',
      'echo ========================================================',
      'ping 127.0.0.1 -n 3 >nul 2>&1',
      'exit /b 0',
      '',
    ].join('\r\n');

    const blob = new Blob([batContent], { type: 'application/x-bat;charset=ascii' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'install_projector_room.bat';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadStartBat = () => {
    const batContent = [
      '@echo off',
      'cd /d "%~dp0"',
      'title Projector Room Launcher',
      '',
      'echo [1/2] Enabling Screen Extension mode: displayswitch /extend',
      'start "" displayswitch.exe /extend',
      'ping 127.0.0.1 -n 2 >nul 2>&1',
      '',
      'echo [2/2] Launching Projector Room...',
      'set "PYTHON_EXE="',
      'where python >nul 2>&1 && set "PYTHON_EXE=python"',
      'if defined PYTHON_EXE goto :LaunchPython',
      'where py >nul 2>&1 && set "PYTHON_EXE=py -3"',
      'if defined PYTHON_EXE goto :LaunchPython',
      'where python3 >nul 2>&1 && set "PYTHON_EXE=python3"',
      'if defined PYTHON_EXE goto :LaunchPython',
      '',
      'echo [ERROR] Python 3 is not installed or not in PATH!',
      'pause',
      'exit /b 1',
      '',
      ':LaunchPython',
      'start "" %PYTHON_EXE% "%~dp0main.py"',
      'exit /b 0',
      '',
    ].join('\r\n');

    const blob = new Blob([batContent], { type: 'application/x-bat;charset=ascii' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'start.bat';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadRequirements = () => {
    const content = [
      'Pillow>=10.0.0',
      'python-vlc>=3.0.20123',
      'PyMuPDF>=1.23.0',
      'comtypes>=1.2.0',
      'python-pptx>=0.6.21',
      'yt-dlp>=2023.12.30',
      '',
    ].join('\r\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'requirements.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadMainPy = async () => {
    try {
      const resp = await fetch('/main.py');
      if (resp.ok) {
        const text = await resp.text();
        const blob = new Blob([text], { type: 'text/x-python;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'main.py';
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
    } catch {
      // Fallback
    }
    // Simple notification if direct fetch unavailable
    alert('Файл main.py находится в корне проекта и автоматически создает .bat файлы при запуске!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
          <div className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-semibold text-neutral-100">
              Настройка кабинета, проектора и классов
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Tabs Navigation */}
        <div className="bg-neutral-950/80 px-6 pt-2 border-b border-neutral-800 flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveSubTab('profile')}
            className={`px-3 py-2 border-b-2 font-medium flex items-center gap-1.5 transition-colors ${
              activeSubTab === 'profile'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <School className="w-3.5 h-3.5" />
            <span>Кабинет и проектор</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('bounds')}
            className={`px-3 py-2 border-b-2 font-medium flex items-center gap-1.5 transition-colors ${
              activeSubTab === 'bounds'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Грани экрана & Калибровка 16:9 / 4:3</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab('classes');
              if (currentClass) {
                setStudentInputText(currentClass.students.join('\n'));
              }
            }}
            className={`px-3 py-2 border-b-2 font-medium flex items-center gap-1.5 transition-colors ${
              activeSubTab === 'classes'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Классы и ученики ({classes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('installer')}
            className={`px-3 py-2 border-b-2 font-medium flex items-center gap-1.5 transition-colors ${
              activeSubTab === 'installer'
                ? 'border-amber-500 text-amber-400 font-semibold'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Инсталлятор и экраны</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: Profile */}
          {activeSubTab === 'profile' && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1 font-medium">
                  Название кабинета / проектора:
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 text-xs focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-neutral-400 mb-1 font-medium">Преподаватель:</label>
                  <input
                    type="text"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 text-xs focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1 font-medium">Школа / Организация:</label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-100 text-xs focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-neutral-800">
                <div>
                  <label className="block text-neutral-400 mb-1 font-medium">
                    Базовый формат проектора:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAspectRatio('16:9')}
                      className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                        aspectRatio === '16:9'
                          ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                          : 'border-neutral-800 bg-neutral-950 text-neutral-400'
                      }`}
                    >
                      16:9 (Широкий)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAspectRatio('4:3')}
                      className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                        aspectRatio === '4:3'
                          ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                          : 'border-neutral-800 bg-neutral-950 text-neutral-400'
                      }`}
                    >
                      4:3 (XGA)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-400 mb-1 font-medium">
                    Разрешение экрана:
                  </label>
                  <select
                    value={resolutionPreset}
                    onChange={(e) => setResolutionPreset(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 text-xs focus:border-amber-500"
                  >
                    <option value="1920x1080 (16:9 Full HD)">1920×1080 (16:9 Full HD)</option>
                    <option value="1280x720 (16:9 HD)">1280×720 (16:9 HD)</option>
                    <option value="1024x768 (4:3 XGA)">1024×768 (4:3 XGA Школьный)</option>
                    <option value="800x600 (4:3 SVGA)">800×600 (4:3 Ретро)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                  <input
                    type="checkbox"
                    checked={audioChimeEnabled}
                    onChange={(e) => setAudioChimeEnabled(e.target.checked)}
                    className="accent-amber-500"
                  />
                  <span>Звуковой звонок и гонг таймера</span>
                </label>

                <button
                  type="button"
                  onClick={handleExportConfig}
                  className="flex items-center gap-1 text-neutral-400 hover:text-white bg-neutral-800 px-3 py-1.5 rounded-lg border border-neutral-700"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Экспорт projector_config.json</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Projector Bounds Calibration */}
          {activeSubTab === 'bounds' && (
            <div className="space-y-4 text-xs">
              <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-amber-300 leading-relaxed">
                <span className="font-semibold">✦ Установление граней проектора:</span> Картинка 16:9 или 4:3 масштабируется и подгоняется так, чтобы покрывать точно видимое полотно школьного проектора или стены, без обрезки краев.
              </div>

              {/* Interactive Calibration Visual Preview */}
              <div className="bg-black border border-neutral-700 rounded-lg p-3 relative h-48 flex items-center justify-center overflow-hidden">
                {/* Physical Projector Wall simulation */}
                <div
                  className="w-full h-full relative border-2 border-dashed border-amber-500/50 flex items-center justify-center transition-all bg-neutral-950"
                  style={{
                    paddingLeft: `${bounds.leftMargin}%`,
                    paddingRight: `${bounds.rightMargin}%`,
                    paddingTop: `${bounds.topMargin}%`,
                    paddingBottom: `${bounds.bottomMargin}%`,
                  }}
                >
                  {/* Calibrated projection frame */}
                  <div
                    className="w-full h-full bg-neutral-900 border border-emerald-500/80 flex flex-col items-center justify-center text-center p-2 relative shadow-inner"
                    style={{
                      transform: `scale(${bounds.scaleX / 100}, ${bounds.scaleY / 100}) translate(${bounds.offsetX}%, ${bounds.offsetY}%)`,
                    }}
                  >
                    <Crosshair className="w-6 h-6 text-emerald-400 opacity-60 animate-pulse" />
                    <span className="font-mono text-[11px] text-emerald-300 mt-1">
                      Экран проектора ({bounds.aspectRatio})
                    </span>
                    <span className="font-mono text-[10px] text-neutral-400">
                      Ш: {bounds.scaleX}% | В: {bounds.scaleY}% | X:{bounds.offsetX} Y:{bounds.offsetY}
                    </span>

                    {/* Corner Guides */}
                    <div className="absolute top-1 left-1 text-[9px] font-mono text-amber-400">TL (0,0)</div>
                    <div className="absolute top-1 right-1 text-[9px] font-mono text-amber-400">TR (100,0)</div>
                    <div className="absolute bottom-1 left-1 text-[9px] font-mono text-amber-400">BL (0,100)</div>
                    <div className="absolute bottom-1 right-1 text-[9px] font-mono text-amber-400">BR (100,100)</div>
                  </div>
                </div>

                {bounds.showCalibrationGrid && (
                  <div className="absolute top-2 right-2 bg-amber-500 text-neutral-950 px-2 py-0.5 rounded text-[10px] font-bold">
                    Сетка проецируется на экран!
                  </div>
                )}
              </div>

              {/* Sliders for Margins & Scale */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                <div>
                  <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                    <span>Ширина (Scale X):</span>
                    <span className="font-mono text-neutral-200">{bounds.scaleX}%</span>
                  </div>
                  <input
                    type="range"
                    min="80"
                    max="140"
                    value={bounds.scaleX}
                    onChange={(e) => updateBound('scaleX', Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                    <span>Высота (Scale Y):</span>
                    <span className="font-mono text-neutral-200">{bounds.scaleY}%</span>
                  </div>
                  <input
                    type="range"
                    min="80"
                    max="140"
                    value={bounds.scaleY}
                    onChange={(e) => updateBound('scaleY', Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                    <span>Сдвиг X:</span>
                    <span className="font-mono text-neutral-200">{bounds.offsetX}%</span>
                  </div>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    value={bounds.offsetX}
                    onChange={(e) => updateBound('offsetX', Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                    <span>Сдвиг Y:</span>
                    <span className="font-mono text-neutral-200">{bounds.offsetY}%</span>
                  </div>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    value={bounds.offsetY}
                    onChange={(e) => updateBound('offsetY', Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>
              </div>

              {/* Edge Margins (Left, Right, Top, Bottom) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                <div>
                  <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                    <span>Левая грань:</span>
                    <span className="font-mono text-neutral-200">{bounds.leftMargin}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    value={bounds.leftMargin}
                    onChange={(e) => updateBound('leftMargin', Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                    <span>Правая грань:</span>
                    <span className="font-mono text-neutral-200">{bounds.rightMargin}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    value={bounds.rightMargin}
                    onChange={(e) => updateBound('rightMargin', Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                    <span>Верхняя грань:</span>
                    <span className="font-mono text-neutral-200">{bounds.topMargin}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    value={bounds.topMargin}
                    onChange={(e) => updateBound('topMargin', Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                    <span>Нижняя грань:</span>
                    <span className="font-mono text-neutral-200">{bounds.bottomMargin}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    value={bounds.bottomMargin}
                    onChange={(e) => updateBound('bottomMargin', Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>
              </div>

              {/* Action Buttons for Bounds */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fit16to9}
                    className="px-2.5 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700"
                  >
                    Покрыть 16:9
                  </button>
                  <button
                    type="button"
                    onClick={fit4to3}
                    className="px-2.5 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700"
                  >
                    Вписать 4:3
                  </button>
                  <button
                    type="button"
                    onClick={resetBounds}
                    className="px-2.5 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Сброс</span>
                  </button>
                </div>

                <label className="flex items-center gap-2 cursor-pointer bg-neutral-950 px-3 py-1.5 rounded border border-neutral-800">
                  <input
                    type="checkbox"
                    checked={bounds.showCalibrationGrid}
                    onChange={(e) => updateBound('showCalibrationGrid', e.target.checked)}
                    className="accent-amber-500"
                  />
                  <span className="text-amber-400 font-medium">
                    Показать сетку на проекторе
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 3: Classes & Students Manager */}
          {activeSubTab === 'classes' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <div className="text-neutral-300 font-semibold">
                  Управление школьными классами и списками учеников:
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="Например: 8-В класс"
                    className="px-2.5 py-1 bg-neutral-950 border border-neutral-800 rounded text-xs text-neutral-100"
                  />
                  <button
                    type="button"
                    onClick={handleAddClass}
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Добавить класс</span>
                  </button>
                </div>
              </div>

              {/* Class Buttons Strip */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {classes.map((cls) => (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => handleSelectClass(cls.id)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2 transition-all ${
                      selectedClassId === cls.id
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span>{cls.name}</span>
                    <span className="text-[10px] bg-neutral-900 px-1.5 py-0.5 rounded text-neutral-500">
                      {cls.students.length}
                    </span>
                  </button>
                ))}
              </div>

              {/* Edit Selected Class Roster */}
              {currentClass && (
                <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-neutral-100 text-sm">{currentClass.name}</h4>
                      <p className="text-[11px] text-neutral-400">
                        Всего учеников: {currentClass.students.length}. Вставьте список (по одной фамилии на строке):
                      </p>
                    </div>
                    {classes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteClass(currentClass.id)}
                        className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-neutral-850 flex items-center gap-1 text-[11px]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Удалить класс</span>
                      </button>
                    )}
                  </div>

                  <textarea
                    rows={8}
                    value={studentInputText || currentClass.students.join('\n')}
                    onChange={(e) => handleUpdateStudents(e.target.value)}
                    placeholder="Иванов Иван&#10;Петров Петр&#10;Смирнова Анна..."
                    className="w-full p-3 bg-neutral-900 border border-neutral-800 rounded text-xs font-mono text-neutral-200 leading-relaxed focus:border-amber-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Installer & System Extensions */}
          {activeSubTab === 'installer' && (
            <div className="space-y-4 text-xs">
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-neutral-100">
                  <Terminal className="w-4 h-4 text-amber-500" />
                  <span>Автоматический инсталлятор «Проекторная комната»</span>
                </div>
                <p className="text-neutral-400 leading-relaxed text-xs">
                  Инсталлятор выполняет всё сам в один клик: включает режим «Расширить эти экраны» (`displayswitch /extend`), проверяет библиотеки Python (Pillow, VLC, PyMuPDF, PPTX), создает конфигурацию с вашими классами и ярлык на Рабочем столе.
                </p>

                <div className="pt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadBatchInstaller}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>install_projector_room.bat (Windows 1-клик)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadStartBat}
                    className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold rounded-lg border border-neutral-700 flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>start.bat (Быстрый запуск)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadMainPy}
                    className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold rounded-lg border border-neutral-700 flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    <span>main.py (Python скрипт)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadRequirements}
                    className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold rounded-lg border border-neutral-700 flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>requirements.txt</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportConfig}
                    className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold rounded-lg border border-neutral-700 flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-purple-400" />
                    <span>projector_config.json</span>
                  </button>
                </div>

                <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-[11px] space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>✔ Ошибка запуска Windows CMD исправлена</span>
                  </div>
                  <div className="text-emerald-400/90 leading-relaxed">
                    Все .bat файлы теперь используют чистый 7-битный ASCII, безопасный переход в папку через <code className="bg-black/40 px-1 py-0.5 rounded text-amber-300">cd /d "%~dp0"</code> и независимый от локали пинг-таймер. Кроме того, сам <code className="bg-black/40 px-1 py-0.5 rounded text-amber-300">main.py</code> при каждом запуске автоматически генерирует и обновляет файлы <code className="bg-black/40 px-1 py-0.5 rounded text-amber-300">install_projector_room.bat</code> и <code className="bg-black/40 px-1 py-0.5 rounded text-amber-300">start.bat</code> прямо в папке программы и на Рабочем столе!
                  </div>
                </div>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-[11px] text-neutral-400 font-mono space-y-1">
                <div className="text-neutral-300 font-sans font-semibold">Все необходимые файлы в одной папке:</div>
                <div>• main.py / projector_room.py — исходный код с авто-генерацией .bat</div>
                <div>• install_projector_room.bat — инсталлятор библиотек и расширения экрана</div>
                <div>• start.bat — моментальный запуск без повторной установки библиотек</div>
                <div>• requirements.txt — список зависимостей (Pillow, VLC, PyMuPDF, yt-dlp)</div>
                <div>• projector_config.json — ваши классы, ученики и калибровка граней (16:9 / 4:3)</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between">
          <span className="text-[11px] text-neutral-500 font-mono">
            {classes.length} классов · Грани {bounds.aspectRatio} ({bounds.scaleX}%)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={() => handleSave()}
              className="px-4 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 rounded-lg flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Сохранить настройки</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
