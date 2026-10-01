import { ONLINE_ENABLED } from './config';
import type { ProgressData } from '@np/shared';

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

export interface UnlockItem<T extends string> {
  id: T;
  name: string;
  description: string;
  /** Số trận thắng (tính mở khóa) cần có */
  wins: number;
  /** Hoặc đạt thành tựu này */
  achievement?: string;
}

export const BOARD_SKINS: UnlockItem<BoardSkinId>[] = [
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
];

export const PIECE_SETS: UnlockItem<PieceSetId>[] = [
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
];

export const FX_TIERS: UnlockItem<FxTier>[] = [
  { id: 'basic', name: 'Cơ bản', description: 'Quân cờ khối 3D lao vào Tướng, chữ thư pháp vàng, Tướng vỡ đôi khi chiếu bí', wins: 0 },
  { id: 'silver', name: 'Bạc', description: 'Hồn quân ánh bạc: ngựa phi, chiến xa, pháo bắn, lính giáo lao vào Tướng', wins: 20 },
  { id: 'gold', name: 'Vàng', description: 'Hồn quân ánh vàng, thêm bóng mờ chuyển động, mực loang, phóng chậm khi trúng đòn, pháo hoa', wins: 60 },
  {
    id: 'legendary',
    name: 'Huyền thoại',
    description: 'Hồn ma xanh tím: mắt đỏ, lửa ma, sương mù, sét xanh; tướng quân cưỡi ngựa, pháo đầu rồng, rồng vàng bay khi chiếu bí',
    wins: 150,
    achievement: 'bat_bai',
  },
];

export const FX_ORDER: FxTier[] = ['basic', 'silver', 'gold', 'legendary'];

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
  const check = (list: UnlockItem<string>[], prefix: string) => {
    for (const it of list) if (!isUnlocked(it, before) && isUnlocked(it, after)) out.push(`${prefix}: ${it.name}`);
  };
  check(BOARD_SKINS, 'Bàn cờ');
  check(PIECE_SETS, 'Bộ quân');
  check(FX_TIERS, 'Hiệu ứng');
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
