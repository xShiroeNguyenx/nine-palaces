import { create } from 'zustand';
import type { BoardSkinId, CheckCallId, FrameId, FxTier, MoveSoundId, PieceSetId } from './cosmetics';
import { load, save } from './storage';

export type PieceStyle = PieceSetId;
export type NotationStyle = 'vi' | 'wxf';
export type Lang = 'vi' | 'en' | 'zh';
/** Mức trợ giúp Luyện Trình: 1 = chỉ %, 2 = % + chuỗi nước, 3 = % + chuỗi nước + giải thích */
export type TrainingLevel = 1 | 2 | 3;

export interface Settings {
  pieceStyle: PieceStyle;
  boardSkin: BoardSkinId;
  fxTier: FxTier;
  frame: FrameId;
  checkCall: CheckCallId;
  moveSound: MoveSoundId;
  /** Hiện Bảo Khố (gacha) và số xu */
  gacha: boolean;
  sound: boolean;
  vibrate: boolean;
  coordinates: boolean;
  notation: NotationStyle;
  effects: boolean;
  showHints: boolean;
  autoFlipHotseat: boolean;
  patternBanners: boolean;
  trainingLevel: TrainingLevel;
  evalBar: boolean;
  premove: boolean;
  lang: Lang;
  /** Chỉ dùng khi phát triển: mở khóa mọi vật phẩm để xem thử */
  unlockAll: boolean;
}

export const DEFAULTS: Settings = {
  pieceStyle: 'han',
  boardSkin: 'wood',
  fxTier: 'basic',
  frame: 'none',
  checkCall: 'default',
  moveSound: 'default',
  gacha: true,
  sound: true,
  vibrate: true,
  coordinates: true,
  notation: 'vi',
  effects: true,
  showHints: true,
  autoFlipHotseat: false,
  patternBanners: true,
  trainingLevel: 3,
  evalBar: true,
  premove: true,
  lang: 'vi',
  unlockAll: false,
};

interface SettingsState extends Settings {
  update: (patch: Partial<Settings>) => void;
}

export const useSettings = create<SettingsState>((set, get) => ({
  ...load('np.settings', DEFAULTS),
  update: (patch) => {
    set(patch);
    const { update: _u, ...rest } = { ...get(), ...patch };
    save('np.settings', rest);
  },
}));
