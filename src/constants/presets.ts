import { ImageItem, PresentationData, RoomConfig, VideoItem } from '../types';

export const DEFAULT_CONFIG: RoomConfig = {
  roomName: '',
  teacherName: '',
  schoolName: '',
  aspectRatio: '16:9',
  resolutionPreset: '',
  audioChimeEnabled: true,
  defaultBlankColor: '#000000',
  autoHideCursorSeconds: 2.5,
  activeClassId: '',
  classes: [],
  projectorBounds: {
    aspectRatio: '16:9',
    leftMargin: 0,
    rightMargin: 0,
    topMargin: 0,
    bottomMargin: 0,
    scaleX: 100,
    scaleY: 100,
    offsetX: 0,
    offsetY: 0,
    showCalibrationGrid: false,
    calibrated: false
  }
};

export const SAMPLE_PRESENTATIONS: PresentationData[] = [];
export const SAMPLE_IMAGES: ImageItem[] = [];
export const SAMPLE_VIDEOS: VideoItem[] = [];
