import { ONLINE_ENABLED } from './config';
import type { PoolItem, ProgressData, Rarity } from '@np/shared';

export type BoardSkinId =
  | 'wood'
  | 'bamboo'
  | 'paper'
  | 'marble'
  | 'lacquer'
  | 'jade'
  | 'neon'
  | 'palace'
  | 'ice'
  | 'fire'
  | 'galaxy'
  | 'sakura';
export type PieceSetId = 'han' | 'viet' | 'icon' | 'wood3d' | 'lacquer' | 'jade' | 'cyber' | 'gold' | 'bronze' | 'ice' | 'fire' | 'galaxy' | 'bamboo';
export type FxTier = 'basic' | 'silver' | 'gold' | 'legendary';
export type FrameId = 'none' | 'bamboo' | 'cloud' | 'ink' | 'red' | 'plum' | 'wave' | 'jade' | 'lantern' | 'phoenix' | 'dragon';
export type CheckCallId = 'default' | 'tuong_quan' | 'xem_day' | 'can_than' | 'do_nay' | 'het_duong' | 'khong_thoat';
export type MoveSoundId = 'default' | 'stone' | 'bamboo' | 'jade' | 'bell';
/** Loại vật phẩm: tiền tố của mã trong ví gacha ('board:jade') */
export type CosmeticKind = 'board' | 'piece' | 'fx' | 'frame' | 'call' | 'sound';

export interface UnlockItem<T extends string> {
  kind: CosmeticKind;
  id: T;
  name: string;
  description: string;
  /** Số trận thắng (tính mở khóa) cần có */
  wins: number;
  /** Hoặc đạt thành tựu này */
  achievement?: string;
  /** Độ hiếm trong Bảo Khố; bỏ trống thì suy từ số trận thắng (rarityOf) */
  rarity?: Rarity;
}

type Def<T extends string> = Omit<UnlockItem<T>, 'kind'>;
const withKind = <T extends string>(kind: CosmeticKind, items: Def<T>[]): UnlockItem<T>[] => items.map((i) => ({ ...i, kind }));
/** Đồ chỉ có trong Bảo Khố: không mở bằng trận thắng */
const GACHA_ONLY = Number.POSITIVE_INFINITY;

export const BOARD_SKINS = withKind<BoardSkinId>('board', [
  { id: 'wood', name: 'Gỗ mộc', description: 'Gỗ sáng, kẻ mực đen', wins: 0 },
  { id: 'bamboo', name: 'Tre xanh', description: 'Nền tre, đốt tre chạy dọc', wins: 5 },
  { id: 'paper', name: 'Giấy dó', description: 'Giấy cổ, chữ thư pháp', wins: 15 },
  { id: 'marble', name: 'Đá cẩm thạch', description: 'Vân đá, kẻ vàng', wins: 30 },
  { id: 'lacquer', name: 'Sơn mài', description: 'Đen bóng, hoa văn vàng', wins: 50 },
  { id: 'jade', name: 'Ngọc bích', description: 'Xanh ngọc trong, ánh sáng', wins: 80 },
  { id: 'neon', name: 'Neon Cyber', description: 'Nền tối, kẻ neon phát sáng', wins: 120 },
  { id: 'palace', name: 'Hoàng cung', description: 'Cột son, mái ngói, mây vàng', wins: 200 },
  { id: 'ice', name: 'Băng tuyết', description: 'Băng trong, nhũ băng, tuyết phủ', wins: 260 },
  { id: 'fire', name: 'Dung nham', description: 'Đá nứt lửa, ngọn lửa liếm mép bàn', wins: 330 },
  { id: 'galaxy', name: 'Ngân hà', description: 'Tinh vân, sao trời, hành tinh có vành', wins: 420 },
  { id: 'sakura', name: 'Hoa anh đào', description: 'Cành hoa, cánh hoa rơi', wins: 520 },
]);

export const PIECE_SETS = withKind<PieceSetId>('piece', [
  { id: 'han', name: 'Chữ Hán truyền thống', description: 'Đỏ/Đen chữ Hán', wins: 0 },
  { id: 'viet', name: 'Chữ Việt', description: 'Tướng, Sĩ, Tượng, Xe, Pháo, Mã, Tốt', wins: 0 },
  { id: 'icon', name: 'Biểu tượng', description: 'Hình vẽ tượng trưng cho từng quân', wins: 10 },
  { id: 'wood3d', name: 'Gỗ khắc 3D', description: 'Chữ khắc nổi trên mặt gỗ', wins: 25 },
  { id: 'lacquer', name: 'Sơn mài đỏ đen', description: 'Sơn mài đen viền vàng, hoa mai; quân đỏ nền ngà', wins: 40 },
  { id: 'jade', name: 'Ngọc', description: 'Quân ngọc trong, phản quang', wins: 70 },
  { id: 'cyber', name: 'Cyber', description: 'Hologram, viền neon', wins: 100 },
  { id: 'gold', name: 'Thư pháp vàng', description: 'Chữ thư pháp mạ vàng', wins: 150 },
  { id: 'bronze', name: 'Đồng cổ', description: 'Đồng xanh rêu, chữ đúc nổi', wins: 200 },
  { id: 'ice', name: 'Băng', description: 'Quân băng pha lê, hoa văn xanh và đỏ', wins: 260 },
  { id: 'fire', name: 'Dung nham', description: 'Đá đen nứt lửa, chữ rực', wins: 330 },
  { id: 'galaxy', name: 'Tinh vân', description: 'Quân tinh vân lấp lánh sao', wins: 420 },
  { id: 'bamboo', name: 'Tre xanh', description: 'Quân tre, viền tre xanh, lá trúc', wins: 5 },
]);

export const FX_TIERS = withKind<FxTier>('fx', [
  { id: 'basic', name: 'Cơ bản', description: 'Quân cờ khối 3D lao vào Tướng, chữ thư pháp vàng, Tướng vỡ đôi khi chiếu bí', wins: 0 },
  { id: 'silver', name: 'Bạc', description: 'Hồn quân ánh bạc: ngựa phi, chiến xa, pháo bắn, lính giáo lao vào Tướng', wins: 20, rarity: 'rare' },
  { id: 'gold', name: 'Vàng', description: 'Hồn quân ánh vàng, thêm bóng mờ chuyển động, mực loang, phóng chậm khi trúng đòn, pháo hoa', wins: 60, rarity: 'epic' },
  {
    id: 'legendary',
    name: 'Huyền thoại',
    description: 'Hồn ma xanh tím: mắt đỏ, lửa ma, sương mù, sét xanh; tướng quân cưỡi ngựa, pháo đầu rồng, rồng vàng bay khi chiếu bí',
    wins: 150,
    achievement: 'bat_bai',
    rarity: 'legendary',
  },
]);

export const FX_ORDER: FxTier[] = ['basic', 'silver', 'gold', 'legendary'];

/* -------------------- Đồ chỉ có trong Bảo Khố (PLAN.md mục 21.4) -------------------- */

/** Khung quanh danh hiệu (Hồ sơ, Trang chủ, bảng kết quả ván) */
export const FRAMES = withKind<FrameId>('frame', [
  { id: 'none', name: 'Không khung', description: 'Danh hiệu không viền', wins: 0 },
  { id: 'bamboo', name: 'Viền tre', description: 'Hai đốt tre xanh ôm danh hiệu', wins: GACHA_ONLY, rarity: 'common' },
  { id: 'cloud', name: 'Mây trắng', description: 'Viền mây cuộn nhẹ', wins: GACHA_ONLY, rarity: 'common' },
  { id: 'ink', name: 'Mực tàu', description: 'Nét mực loang hai đầu', wins: GACHA_ONLY, rarity: 'common' },
  { id: 'red', name: 'Chỉ đỏ', description: 'Viền chỉ đỏ may mắn', wins: GACHA_ONLY, rarity: 'common' },
  { id: 'plum', name: 'Hoa mai', description: 'Viền vàng điểm hoa mai', wins: GACHA_ONLY, rarity: 'common' },
  { id: 'wave', name: 'Sóng nước', description: 'Viền sóng xanh lam', wins: GACHA_ONLY, rarity: 'common' },
  { id: 'jade', name: 'Ngọc bích', description: 'Khung ngọc xanh, ánh sáng chạy quanh', wins: GACHA_ONLY, rarity: 'rare' },
  { id: 'lantern', name: 'Đèn lồng', description: 'Khung đỏ, đèn lồng lắc lư hai bên', wins: GACHA_ONLY, rarity: 'rare' },
  { id: 'phoenix', name: 'Phượng hoàng', description: 'Khung lửa cam, lông phượng phát sáng', wins: GACHA_ONLY, rarity: 'epic' },
  { id: 'dragon', name: 'Rồng vàng', description: 'Khung vàng rực, ánh kim chạy liên tục', wins: GACHA_ONLY, rarity: 'legendary' },
]);

/** Lời hô khi chiếu tướng (thay chữ "CHIẾU!" trên banner) */
export const CHECK_CALLS = withKind<CheckCallId>('call', [
  { id: 'default', name: 'CHIẾU!', description: 'Lời chiếu mặc định', wins: 0 },
  { id: 'tuong_quan', name: 'TƯỚNG QUÂN!', description: 'Lời chiếu cổ điển', wins: GACHA_ONLY, rarity: 'common' },
  { id: 'xem_day', name: 'XEM ĐÂY!', description: 'Ra đòn dứt khoát', wins: GACHA_ONLY, rarity: 'common' },
  { id: 'can_than', name: 'CẨN THẬN!', description: 'Nhắc khéo đối thủ', wins: GACHA_ONLY, rarity: 'common' },
  { id: 'do_nay', name: 'ĐỠ NÀY!', description: 'Thách thức', wins: GACHA_ONLY, rarity: 'common' },
  { id: 'het_duong', name: 'HẾT ĐƯỜNG LUI!', description: 'Dồn Tướng vào chân tường', wins: GACHA_ONLY, rarity: 'rare' },
  { id: 'khong_thoat', name: 'KHÔNG THOÁT ĐÂU!', description: 'Lưới đã giăng', wins: GACHA_ONLY, rarity: 'rare' },
]);

/** Âm thanh khi đi quân */
export const MOVE_SOUNDS = withKind<MoveSoundId>('sound', [
  { id: 'default', name: 'Quân gỗ', description: 'Tiếng quân gỗ đặt xuống bàn', wins: 0 },
  { id: 'stone', name: 'Đá', description: 'Tiếng đá chạm đá, trầm và chắc', wins: GACHA_ONLY, rarity: 'rare' },
  { id: 'bamboo', name: 'Tre gõ', description: 'Tiếng mõ tre giòn', wins: GACHA_ONLY, rarity: 'rare' },
  { id: 'jade', name: 'Ngọc', description: 'Tiếng ngọc trong, ngân nhẹ', wins: GACHA_ONLY, rarity: 'epic' },
  { id: 'bell', name: 'Chuông đồng', description: 'Tiếng chuông đồng ngân dài', wins: GACHA_ONLY, rarity: 'epic' },
]);

export const KIND_NAME: Record<CosmeticKind, string> = {
  board: 'Bàn cờ',
  piece: 'Bộ quân',
  fx: 'Hiệu ứng',
  frame: 'Khung',
  call: 'Lời chiếu',
  sound: 'Âm quân',
};

export const ALL_ITEMS: UnlockItem<string>[] = [...BOARD_SKINS, ...PIECE_SETS, ...FX_TIERS, ...FRAMES, ...CHECK_CALLS, ...MOVE_SOUNDS];

/** Mã trong ví gacha: 'board:jade' (cần tiền tố vì bàn và quân trùng id) */
export const itemKey = (it: Pick<UnlockItem<string>, 'kind' | 'id'>) => `${it.kind}:${it.id}`;

export const ITEM_BY_KEY: Map<string, UnlockItem<string>> = new Map(ALL_ITEMS.map((it) => [itemKey(it), it]));

/** Độ hiếm: ghi sẵn, hoặc suy từ mốc thắng (≤50 Hiếm, ≤200 Sử thi, còn lại Huyền thoại) */
export function rarityOf(it: UnlockItem<string>): Rarity {
  if (it.rarity) return it.rarity;
  return it.wins <= 50 ? 'rare' : it.wins <= 200 ? 'epic' : 'legendary';
}

/** Kho Bảo Khố: mọi món trừ đồ mặc định (0 trận thắng) */
export const GACHA_POOL: PoolItem[] = ALL_ITEMS.filter((it) => it.wins > 0).map((it) => ({ id: itemKey(it), rarity: rarityOf(it) }));

export const RARITY_NAME: Record<Rarity, string> = { common: 'Thường', rare: 'Hiếm', epic: 'Sử thi', legendary: 'Huyền thoại' };

export interface Achievement {
  id: string;
  name: string;
  description: string;
  reward?: string;
  /** Chỉ đạt được khi chơi online */
  online?: boolean;
}

const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_win', name: 'Khai cuộc thắng lợi', description: 'Thắng ván đầu tiên' },
  { id: 'first_online_win', name: 'Ra quân', description: 'Thắng một ván online', online: true },
  { id: 'ai_5', name: 'Qua ải Khá', description: 'Thắng máy cấp 5' },
  { id: 'ai_10', name: 'Hạ Tông sư', description: 'Thắng máy cấp 10' },
  { id: 'streak_5', name: 'Thế như chẻ tre', description: 'Thắng 5 ván liên tiếp' },
  { id: 'bat_bai', name: 'Bất bại', description: 'Thắng 10 ván liên tiếp', reward: 'Mở ngay hiệu ứng Huyền thoại' },
  { id: 'mate_ma_hau_phao', name: 'Mã hậu pháo', description: 'Chiếu bí bằng thế Mã hậu pháo', reward: 'Hiệu ứng riêng khi chiếu bí Mã hậu pháo' },
  { id: 'tot_dau_binh', name: 'Tốt đầu binh', description: 'Chiếu bí bằng Tốt' },
  { id: 'binh_tinh', name: 'Bình tĩnh', description: 'Thắng vì đối thủ chiếu mãi' },
  { id: 'ba_vuong', name: 'Bá vương', description: 'Lập thế Bá vương xe' },
  { id: 'nha_suu_tam', name: 'Nhà sưu tầm', description: 'Gặp 10 thế cờ khác nhau' },
  { id: 'hoc_tro', name: 'Học trò chăm chỉ', description: 'Dùng Luyện Trình lần đầu' },
  { id: 'phan_tich', name: 'Tự vấn', description: 'Phân tích lại một ván đã đánh' },
  { id: 'co_up', name: 'Lật bài ngửa', description: 'Chơi xong một ván cờ úp có phân thắng thua' },
];

/** Thành tựu đang dùng (ẩn thành tựu online khi chế độ online tắt) */
export const ACHIEVEMENTS: Achievement[] = ALL_ACHIEVEMENTS.filter((a) => ONLINE_ENABLED || !a.online);

export function isUnlocked(item: UnlockItem<string>, p: ProgressData, unlockAll = false): boolean {
  if (unlockAll) return true;
  return unlockedByPlay(item, p) || (p.economy?.owned ?? []).includes(itemKey(item));
}

/** Mở bằng trận thắng / thành tựu (không tính đồ có từ Bảo Khố) */
export function unlockedByPlay(item: UnlockItem<string>, p: ProgressData): boolean {
  if (p.unlockWins >= item.wins) return true;
  return !!item.achievement && (p.achievements ?? []).includes(item.achievement);
}

/** Bậc hiệu ứng cao nhất đã mở */
export function maxFxTier(p: ProgressData, unlockAll = false): FxTier {
  let best: FxTier = 'basic';
  for (const t of FX_TIERS) if (isUnlocked(t, p, unlockAll)) best = t.id;
  return best;
}

/** Liệt kê các vật phẩm vừa được mở khi tiến trình đổi từ `before` sang `after` */
export function newlyUnlocked(before: ProgressData, after: ProgressData): string[] {
  const out: string[] = [];
  for (const it of ALL_ITEMS) if (!isUnlocked(it, before) && isUnlocked(it, after)) out.push(`${KIND_NAME[it.kind]}: ${it.name}`);
  for (const a of ACHIEVEMENTS) {
    if (!(before.achievements ?? []).includes(a.id) && (after.achievements ?? []).includes(a.id)) out.push(`Thành tựu: ${a.name}`);
  }
  return out;
}

export const TITLES: { xp: number; name: string }[] = [
  { xp: 0, name: 'Tân binh' },
  { xp: 500, name: 'Tốt qua sông' },
  { xp: 2000, name: 'Mã nhập cung' },
  { xp: 6000, name: 'Pháo đầu' },
  { xp: 15000, name: 'Song Xe' },
  { xp: 40000, name: 'Kỳ vương' },
];

export function titleOf(xp: number): { name: string; next: { xp: number; name: string } | null } {
  let cur = TITLES[0]!;
  let next: { xp: number; name: string } | null = null;
  for (let i = 0; i < TITLES.length; i++) {
    if (xp >= TITLES[i]!.xp) {
      cur = TITLES[i]!;
      next = TITLES[i + 1] ?? null;
    }
  }
  return { name: cur.name, next };
}
