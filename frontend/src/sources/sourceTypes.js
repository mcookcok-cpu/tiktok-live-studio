import { Image, Film, Globe, Type, Camera, Volume2, Monitor, User, MessageSquare, Gift, Bell } from 'lucide-react';

export const SOURCE_META = {
  image:   { label: 'Image',          icon: Image },
  video:   { label: 'Video',          icon: Film },
  browser: { label: 'Browser Source', icon: Globe },
  text:    { label: 'Text',           icon: Type },
  webcam:  { label: 'Webcam',         icon: Camera },
  audio:   { label: 'Audio',          icon: Volume2 },
  screen:  { label: 'Screen Capture', icon: Monitor },
  avatar:  { label: '2D Avatar',      icon: User, phase: 4 },
  chat:    { label: 'Chat Overlay',   icon: MessageSquare },
  gift:    { label: 'Gift Overlay',   icon: Gift },
  alert:   { label: 'Alert Overlay',  icon: Bell }
};
export const SOURCE_ORDER = Object.keys(SOURCE_META);
export const BLEND_MODES = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion'];
