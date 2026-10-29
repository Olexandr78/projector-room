export type TabType = 'presentation' | 'pdf' | 'images' | 'video' | 'browser' | 'tools';

export interface SchoolClass {
  id: string;
  name: string;
  students: string[];
}

export interface ProjectorBounds {
  aspectRatio: '16:9' | '4:3';
  leftMargin: number; // 0 - 30%
  rightMargin: number; // 0 - 30%
  topMargin: number; // 0 - 30%
  bottomMargin: number; // 0 - 30%
  scaleX: number; // 80 - 150%
  scaleY: number; // 80 - 150%
  offsetX: number; // -25% to 25%
  offsetY: number; // -25% to 25%
  showCalibrationGrid: boolean; // Show test alignment grid on projector
  calibrated: boolean;
}

export interface RoomConfig {
  roomName: string;
  teacherName: string;
  schoolName: string;
  aspectRatio: '16:9' | '4:3';
  resolutionPreset: string;
  audioChimeEnabled: boolean;
  defaultBlankColor: string;
  autoHideCursorSeconds: number;
  classes: SchoolClass[];
  activeClassId: string;
  projectorBounds: ProjectorBounds;
}

export interface SlideItem {
  id: number;
  title: string;
  badge?: string;
  imageUrl?: string;
  codeSnippet?: string;
  bullets?: string[];
  keyConcept?: string;
  teacherNote: string; // Only visible on teacher's monitor!
}

export interface PresentationData {
  id: string;
  title: string;
  subject: string;
  slides: SlideItem[];
}

export interface ImageItem {
  id: string;
  title: string;
  category: string;
  url: string;
  width?: number;
  height?: number;
}

export interface VideoItem {
  id: string;
  title: string;
  durationStr: string;
  url: string;
  description: string;
  isYoutube?: boolean;
  youtubeId?: string;
}

export interface PdfDocumentState {
  id: string;
  title: string;
  url: string;
  totalPages: number;
  currentPage: number;
}

export interface DrawingPath {
  id: string;
  points: { x: number; y: number }[]; // 0-100 percentage
  color: string;
  width: number;
}

export interface ProjectorState {
  version: number;
  mode: 'presentation' | 'pdf' | 'images' | 'video' | 'browser' | 'blackboard' | 'timer' | 'idle';
  isBlackout: boolean; // "Шторка" - черный экран
  isFrozen: boolean; // "Заморозка" - проектор показывает зафиксированный кадр
  laserPointer: {
    active: boolean;
    x: number; // 0 - 100 percentage
    y: number; // 0 - 100 percentage
  };
  projectorBounds: ProjectorBounds;
  activeClassId: string;
  // Image state
  activeImage: {
    url: string;
    title: string;
    fit: 'contain' | 'cover' | 'original';
    zoom: number; // 1 = 100%
    rotation: number; // 0, 90, 180, 270
    inverted: boolean;
  } | null;
  // Video state
  activeVideo: {
    url: string;
    title: string;
    playing: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    muted: boolean;
    playbackRate: number;
    isYoutube?: boolean;
    youtubeId?: string;
  } | null;
  // Browser state (Web pages to projector)
  activeBrowser: {
    url: string;
    title: string;
    zoom: number;
  } | null;
  // Presentation state
  activePresentation: {
    id: string;
    currentSlideIndex: number;
  };
  // PDF state
  activePdf: {
    id: string;
    currentPage: number;
    totalPages: number;
    scale: number;
    url?: string;
  } | null;
  // Classroom alert / banner
  classroomAlert: {
    visible: boolean;
    text: string;
    level: 'info' | 'warning' | 'urgent';
  } | null;
  // Timer state
  timer: {
    active: boolean;
    remainingSeconds: number;
    totalSeconds: number;
    title: string;
    showOnProjector: boolean;
  };
  // Annotations / Pen
  drawings: DrawingPath[];
}

export interface SyncMessage {
  type: 'STATE_UPDATE' | 'REQUEST_STATE' | 'HEARTBEAT' | 'PROJECTOR_READY';
  sender: 'teacher' | 'projector';
  state?: ProjectorState;
  timestamp: number;
}
