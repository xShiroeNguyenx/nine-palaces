import type { PieceName } from '@np/rules';
import type { PieceSetId } from '../lib/cosmetics';
import { ICON_LABEL } from './themes';

const HAN_RED: Record<PieceName, string> = {
  king: '帥',
  advisor: '仕',
  elephant: '相',
  horse: '傌',
  chariot: '俥',
  cannon: '炮',
  soldier: '兵',
};
const HAN_BLACK: Record<PieceName, string> = {
  king: '將',
  advisor: '士',
  elephant: '象',
  horse: '馬',
  chariot: '車',
  cannon: '砲',
  soldier: '卒',
};
const VIET: Record<PieceName, string> = {
  king: 'Tướng',
  advisor: 'Sĩ',
  elephant: 'Tượng',
  horse: 'Mã',
  chariot: 'Xe',
  cannon: 'Pháo',
  soldier: 'Tốt',
};

export const PIECE_VI: Record<PieceName, string> = VIET;

export function pieceLabel(style: PieceSetId, name: PieceName, red: boolean): string {
  if (style === 'viet') return VIET[name];
  if (style === 'icon') return ICON_LABEL[name];
  return red ? HAN_RED[name] : HAN_BLACK[name];
}

/** Nhãn ngắn dùng cho quân bị ăn / bảng nhỏ (bộ Chữ Việt vẫn dùng chữ Hán cho gọn) */
export function smallLabel(style: PieceSetId, name: PieceName, red: boolean): string {
  if (style === 'icon') return ICON_LABEL[name];
  return red ? HAN_RED[name] : HAN_BLACK[name];
}

export const PIECE_BY_CODE: PieceName[] = ['king', 'king', 'advisor', 'elephant', 'horse', 'chariot', 'cannon', 'soldier'];
