import { useEffect } from 'react';
import { BOARD_SKINS, CHECK_CALLS, FRAMES, FX_TIERS, MOVE_SOUNDS, PIECE_SETS, isUnlocked, type UnlockItem } from './cosmetics';
import { useProgress } from './progress';
import { DEFAULTS, useSettings, type Settings } from './settings';

/** Cài đặt chọn đồ trang trí và danh mục tương ứng */
const SLOTS: [keyof Settings, UnlockItem<string>[]][] = [
  ['boardSkin', BOARD_SKINS],
  ['pieceStyle', PIECE_SETS],
  ['fxTier', FX_TIERS],
  ['frame', FRAMES],
  ['checkCall', CHECK_CALLS],
  ['moveSound', MOVE_SOUNDS],
];

/**
 * Món đang chọn mà chưa sở hữu (khôi phục sao lưu, sửa localStorage, id lạ) thì về mặc định.
 * Trước đây chỉ trang Bộ sưu tập kiểm tra, còn Board/EffectCanvas đọc thẳng cài đặt.
 */
export function useEnforceOwnership(enabled: boolean) {
  const progress = useProgress((s) => s.progress);
  const settings = useSettings();
  useEffect(() => {
    if (!enabled || settings.unlockAll) return;
    const patch: Partial<Settings> = {};
    for (const [key, list] of SLOTS) {
      const it = list.find((i) => i.id === settings[key]);
      if (!it || !isUnlocked(it, progress)) (patch as Record<string, unknown>)[key] = DEFAULTS[key];
    }
    if (Object.keys(patch).length) settings.update(patch);
  }, [enabled, progress, settings]);
}
