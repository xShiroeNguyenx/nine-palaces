import type { PieceName } from '@np/rules';

/**
 * DSL mô tả thế cờ (dữ liệu thuần, có thể chuyển sang JSON).
 * Tọa độ là tọa độ TƯƠNG ĐỐI của bên đang xét (như thể mình cầm Đỏ ở dưới).
 */
export type Cond =
  /** Có quân ở ÍT NHẤT một trong các ô */
  | { at: PieceName; squares: string[] }
  /** Có quân ở TẤT CẢ các ô */
  | { atAll: PieceName; squares: string[] }
  /** Có ít nhất `count` quân loại này ở các hàng tương đối (0 = đáy mình … 9 = đáy địch) */
  | { onRanks: PieceName; ranks: number[]; count?: number }
  /** Nước đầu tiên của bên này */
  | { firstMove: { piece: PieceName; from?: string[]; to: string[] } }
  /** Có một nước (trong `within` nước đầu) đưa quân từ `from` tới `to` */
  | { moved: { piece: PieceName; from?: string[]; to: string[]; within?: number } }
  /** Hai quân cùng loại cùng hàng/cột, giữa không có quân */
  | { sameLineClear: PieceName }
  /** Số lượng quân của mình */
  | { count: PieceName; eq: number }
  /** Thế khác đang thỏa */
  | { pattern: string }
  /** Hàm kiểm tra riêng (mã trong detect.ts) */
  | { custom: string }
  | { not: Cond }
  | { any: Cond[] };

export type PatternKind = 'opening' | 'shape' | 'mate';

export interface PatternDef {
  id: string;
  name: string;
  kind: PatternKind;
  /** false: định nghĩa còn mơ hồ, chờ kiểm chứng bằng ván mẫu */
  enabled: boolean;
  /** Chỉ kiểm tra khi bên này đã đi không quá N nước */
  maxOwnMoves?: number;
  description: string;
  all: Cond[];
}

const OPENING_WINDOW = 12;
const SHAPE_WINDOW = 20;

export const PATTERNS: PatternDef[] = [
  /* ------------------------------- Khai cuộc ------------------------------- */
  {
    id: 'phao_dau',
    name: 'Pháo đầu',
    kind: 'opening',
    enabled: true,
    maxOwnMoves: OPENING_WINDOW,
    description: 'Pháo bình vào lộ giữa, nhắm thẳng Tốt đầu và Tướng đối phương.',
    all: [{ at: 'cannon', squares: ['e2'] }],
  },
  {
    id: 'binh_phong_ma',
    name: 'Bình phong mã',
    kind: 'opening',
    enabled: true,
    maxOwnMoves: OPENING_WINDOW,
    description: 'Hai Mã lên cùng lúc bảo vệ Tốt đầu, thế thủ vững chắc chống Pháo đầu.',
    all: [{ atAll: 'horse', squares: ['c2', 'g2'] }],
  },
  {
    id: 'phao_dau_ma_don',
    name: 'Pháo đầu Mã độn',
    kind: 'opening',
    enabled: true,
    maxOwnMoves: OPENING_WINDOW,
    description: 'Pháo đầu, hai Mã lên 3/7 và Tốt đầu đã tấn — hai Mã "đội" Tốt đầu, thế tấn công trung lộ kinh điển.',
    // Cần cả Tốt đầu tấn: chỉ Pháo đầu + Bình phong mã thì chưa phải Mã độn
    all: [{ pattern: 'phao_dau' }, { pattern: 'binh_phong_ma' }, { at: 'soldier', squares: ['e4'] }],
  },
  {
    id: 'phao_dau_ma_doi',
    name: 'Pháo đầu Mã đội',
    kind: 'opening',
    enabled: false,
    maxOwnMoves: OPENING_WINDOW,
    description: 'Pháo đầu, Mã nhảy vào lộ giữa đội Tốt đầu.',
    all: [{ pattern: 'phao_dau' }, { at: 'horse', squares: ['e4', 'e3'] }],
  },
  {
    id: 'phan_cung_ma',
    name: 'Phản cung mã',
    kind: 'opening',
    enabled: true,
    maxOwnMoves: OPENING_WINDOW,
    description: 'Bình phong mã kèm một Pháo về góc Sĩ — cách thủ phổ biến cho bên đi sau.',
    all: [{ pattern: 'binh_phong_ma' }, { at: 'cannon', squares: ['d2', 'f2'] }, { not: { pattern: 'phao_dau' } }],
  },
  {
    id: 'thuan_phao',
    name: 'Thuận pháo',
    kind: 'opening',
    enabled: true,
    maxOwnMoves: OPENING_WINDOW,
    description: 'Hai bên cùng vào Pháo đầu từ cùng một cánh — đối công sòng phẳng.',
    all: [{ custom: 'thuan_phao' }],
  },
  {
    id: 'nghich_phao',
    name: 'Nghịch pháo',
    kind: 'opening',
    enabled: true,
    maxOwnMoves: OPENING_WINDOW,
    description: 'Hai bên vào Pháo đầu khác cánh — thường đối công rất mãnh liệt.',
    all: [{ custom: 'nghich_phao' }],
  },
  {
    id: 'ban_do_nghich_phao',
    name: 'Bán đồ nghịch pháo',
    kind: 'opening',
    enabled: true,
    maxOwnMoves: OPENING_WINDOW,
    description: 'Lên Mã giữ Tốt đầu trước rồi mới vào Pháo đầu khác cánh.',
    all: [{ custom: 'ban_do_nghich_phao' }],
  },
  {
    id: 'si_giac_phao',
    name: 'Sĩ giác pháo',
    kind: 'opening',
    enabled: true,
    maxOwnMoves: OPENING_WINDOW,
    description: 'Pháo bình vào góc Sĩ cùng cánh, thủ chắc chờ phản công.',
    all: [
      {
        any: [
          { moved: { piece: 'cannon', from: ['b2'], to: ['d2'], within: 3 } },
          { moved: { piece: 'cannon', from: ['h2'], to: ['f2'], within: 3 } },
        ],
      },
    ],
  },
  {
    id: 'qua_cung_phao',
    name: 'Quá cung pháo',
    kind: 'opening',
    enabled: true,
    maxOwnMoves: OPENING_WINDOW,
    description: 'Pháo bình qua cung sang cánh kia, hai Pháo cùng một bên.',
    all: [{ any: [{ moved: { piece: 'cannon', from: ['b2'], to: ['f2'], within: 4 } }, { moved: { piece: 'cannon', from: ['h2'], to: ['d2'], within: 4 } }] }],
  },
  {
    id: 'phi_tuong',
    name: 'Phi tượng cục',
    kind: 'opening',
    enabled: true,
    maxOwnMoves: 1,
    description: 'Lên Tượng ngay nước đầu — khai cuộc phòng thủ vững.',
    all: [{ firstMove: { piece: 'elephant', to: ['e2'] } }],
  },
  {
    id: 'khoi_ma',
    name: 'Khởi mã cục',
    kind: 'opening',
    enabled: true,
    maxOwnMoves: 1,
    description: 'Lên Mã ngay nước đầu — khai cuộc linh hoạt, lịch sử lâu đời.',
    all: [{ firstMove: { piece: 'horse', from: ['b0', 'h0'], to: ['c2', 'g2'] } }],
  },
  {
    id: 'tien_nhan_chi_lo',
    name: 'Tiên nhân chỉ lộ',
    kind: 'opening',
    enabled: true,
    maxOwnMoves: 1,
    description: 'Tấn Tốt 3 hoặc 7 ngay nước đầu — "tiên nhân chỉ đường".',
    all: [{ firstMove: { piece: 'soldier', from: ['c3', 'g3'], to: ['c4', 'g4'] } }],
  },
  {
    id: 'don_de_ma',
    name: 'Đơn đề mã',
    kind: 'opening',
    enabled: true,
    maxOwnMoves: OPENING_WINDOW,
    description: 'Một Mã lên giữ Tốt đầu, Mã kia nhảy ra biên.',
    all: [{ any: [{ atAll: 'horse', squares: ['c2', 'i2'] }, { atAll: 'horse', squares: ['g2', 'a2'] }] }],
  },
  {
    id: 'xuyen_cung_ma',
    name: 'Xuyên cung mã',
    kind: 'opening',
    enabled: false,
    maxOwnMoves: OPENING_WINDOW,
    description: 'Lên Tượng trước rồi Mã cùng cánh nhảy vào góc Sĩ.',
    all: [{ at: 'elephant', squares: ['e2'] }, { at: 'horse', squares: ['d1', 'f1'] }],
  },
  {
    id: 'quy_boi_phao',
    name: 'Quy bối pháo',
    kind: 'opening',
    enabled: true,
    maxOwnMoves: 6,
    description: 'Pháo lùi về hàng 1 cho Xe bảo vệ.',
    all: [{ moved: { piece: 'cannon', from: ['b2', 'h2'], to: ['b1', 'h1'], within: 6 } }],
  },
  {
    id: 'thien_phong_phao',
    name: 'Thiên phong pháo',
    kind: 'opening',
    enabled: false,
    maxOwnMoves: 6,
    description: 'Như Quy bối pháo nhưng ra Xe trước rồi mới lùi Pháo.',
    all: [{ pattern: 'quy_boi_phao' }, { custom: 'chariot_moved_first' }],
  },
  {
    id: 'ngoa_tam_phao',
    name: 'Ngọa tâm pháo',
    kind: 'opening',
    enabled: true,
    maxOwnMoves: OPENING_WINDOW,
    description: 'Hai Pháo cùng nằm trên lộ giữa, một Pháo nằm trong cung.',
    all: [{ at: 'cannon', squares: ['e1'] }, { custom: 'two_cannons_center' }],
  },
  {
    id: 'uyen_uong_phao',
    name: 'Uyên ương pháo',
    kind: 'opening',
    enabled: false,
    maxOwnMoves: OPENING_WINDOW,
    description: 'Hai Pháo kề nhau cùng một cánh, Xe tấn giữ.',
    all: [{ custom: 'cannons_adjacent' }],
  },
  {
    id: 'thiet_hoat_xa',
    name: 'Thiết hoạt xa',
    kind: 'opening',
    enabled: false,
    maxOwnMoves: 5,
    description: 'Bỏ Mã sớm để Xe ra nhanh giành tiên.',
    all: [{ count: 'horse', eq: 1 }, { onRanks: 'chariot', ranks: [3, 4, 5, 6, 7, 8] }],
  },
  {
    id: 'song_phao_qua_ha',
    name: 'Song pháo quá hà',
    kind: 'opening',
    enabled: true,
    maxOwnMoves: OPENING_WINDOW,
    description: 'Cả hai Pháo cùng vượt sông tấn công.',
    all: [{ onRanks: 'cannon', ranks: [5, 6, 7, 8, 9], count: 2 }],
  },
  {
    id: 'ngu_that_phao',
    name: 'Ngũ thất pháo',
    kind: 'opening',
    enabled: true,
    maxOwnMoves: OPENING_WINDOW,
    description: 'Pháo đầu kết hợp Pháo còn lại ở lộ 7 (hoặc 3).',
    all: [{ pattern: 'phao_dau' }, { at: 'cannon', squares: ['c2', 'g2'] }],
  },
  {
    id: 'ngu_luc_phao',
    name: 'Ngũ lục pháo',
    kind: 'opening',
    enabled: true,
    maxOwnMoves: OPENING_WINDOW,
    description: 'Pháo đầu kết hợp Pháo còn lại ở lộ 6 (hoặc 4).',
    all: [{ pattern: 'phao_dau' }, { at: 'cannon', squares: ['d2', 'f2'] }],
  },
  {
    id: 'ngu_cuu_phao',
    name: 'Ngũ cửu pháo',
    kind: 'opening',
    enabled: true,
    maxOwnMoves: OPENING_WINDOW,
    description: 'Pháo đầu kết hợp Pháo còn lại ra biên lộ 9 (hoặc 1).',
    all: [{ pattern: 'phao_dau' }, { at: 'cannon', squares: ['a2', 'i2'] }],
  },
  {
    id: 'ngu_bat_phao',
    name: 'Ngũ bát pháo',
    kind: 'opening',
    enabled: false,
    maxOwnMoves: OPENING_WINDOW,
    description: 'Pháo đầu, Pháo lộ 8 (hoặc 2) tấn qua sông.',
    all: [{ pattern: 'phao_dau' }, { onRanks: 'cannon', ranks: [5, 6] }],
  },
  {
    id: 'tam_bo_ho',
    name: 'Tam bộ hổ',
    kind: 'opening',
    enabled: false,
    maxOwnMoves: 3,
    description: 'Ba nước: Pháo bình biên, Xe ra lộ Pháo vừa rời, Xe tấn.',
    all: [{ moved: { piece: 'cannon', from: ['b2', 'h2'], to: ['a2', 'i2', 'c2', 'g2'], within: 3 } }, { onRanks: 'chariot', ranks: [1, 2, 3, 4, 5] }],
  },

  /* ---------------------------- Thế hình quân ---------------------------- */
  {
    id: 'ba_vuong_xe',
    name: 'Bá vương xe',
    kind: 'shape',
    enabled: true,
    maxOwnMoves: SHAPE_WINDOW,
    description: 'Hai Xe cùng bên nhìn thấy mặt nhau — sức mạnh bá vương.',
    all: [{ sameLineClear: 'chariot' }],
  },
  {
    id: 'xe_tuan_ha',
    name: 'Xe tuần hà',
    kind: 'shape',
    enabled: true,
    maxOwnMoves: SHAPE_WINDOW,
    description: 'Xe đứng tuần tra ở bờ sông phía mình.',
    all: [{ onRanks: 'chariot', ranks: [4] }],
  },
  {
    id: 'xe_ky_ha',
    name: 'Xe kỵ hà',
    kind: 'shape',
    enabled: true,
    maxOwnMoves: SHAPE_WINDOW,
    description: 'Xe cưỡi sông, đứng ở bờ sông phía đối phương.',
    all: [{ onRanks: 'chariot', ranks: [5] }],
  },
  {
    id: 'qua_ha_xa',
    name: 'Quá hà xa',
    kind: 'shape',
    enabled: true,
    maxOwnMoves: SHAPE_WINDOW,
    description: 'Xe vượt sông đánh sâu vào trận địa đối phương.',
    all: [{ onRanks: 'chariot', ranks: [6, 7, 8] }],
  },
  {
    id: 'xe_tram_day',
    name: 'Xe trầm đáy',
    kind: 'shape',
    enabled: true,
    maxOwnMoves: SHAPE_WINDOW,
    description: 'Xe xuống tận hàng đáy đối phương.',
    all: [{ onRanks: 'chariot', ranks: [9] }],
  },
  {
    id: 'song_xe_qua_ha',
    name: 'Song xe quá hà',
    kind: 'shape',
    enabled: true,
    maxOwnMoves: SHAPE_WINDOW,
    description: 'Cả hai Xe cùng vượt sông.',
    all: [{ onRanks: 'chariot', ranks: [5, 6, 7, 8, 9], count: 2 }],
  },
  {
    id: 'phao_tuan_ha',
    name: 'Pháo tuần hà',
    kind: 'shape',
    enabled: true,
    maxOwnMoves: SHAPE_WINDOW,
    description: 'Pháo đứng ở bờ sông phía mình.',
    all: [{ onRanks: 'cannon', ranks: [4] }],
  },
  {
    id: 'phao_ky_ha',
    name: 'Pháo kỵ hà',
    kind: 'shape',
    enabled: true,
    maxOwnMoves: SHAPE_WINDOW,
    description: 'Pháo đứng ở bờ sông phía đối phương.',
    all: [{ onRanks: 'cannon', ranks: [5] }],
  },
  {
    id: 'phao_tram_day',
    name: 'Pháo trầm đáy',
    kind: 'shape',
    enabled: true,
    maxOwnMoves: SHAPE_WINDOW,
    description: 'Pháo xuống hàng đáy đối phương.',
    all: [{ onRanks: 'cannon', ranks: [9] }],
  },
  {
    id: 'phao_trung',
    name: 'Pháo trùng',
    kind: 'shape',
    enabled: true,
    maxOwnMoves: SHAPE_WINDOW,
    description: 'Hai Pháo chồng nhau trên một lộ.',
    all: [{ custom: 'cannons_stacked' }],
  },
  {
    id: 'phao_ngoa_tam',
    name: 'Pháo ngọa tâm',
    kind: 'shape',
    enabled: true,
    maxOwnMoves: SHAPE_WINDOW,
    description: 'Pháo nằm ngay giữa cung mình.',
    all: [{ at: 'cannon', squares: ['e1'] }],
  },
  {
    id: 'khong_dau_phao',
    name: 'Không đầu pháo',
    kind: 'shape',
    enabled: true,
    maxOwnMoves: SHAPE_WINDOW,
    description: 'Pháo nhìn thẳng Tướng địch không vật cản — Tướng bị khóa lộ giữa.',
    all: [{ custom: 'khong_dau_phao' }],
  },
  {
    id: 'giac_phao',
    name: 'Giác pháo',
    kind: 'shape',
    enabled: false,
    maxOwnMoves: SHAPE_WINDOW,
    description: 'Pháo ở góc bàn phía đối phương.',
    all: [{ at: 'cannon', squares: ['a9', 'i9'] }],
  },
  {
    id: 'ma_ban_ha',
    name: 'Mã bàn hà',
    kind: 'shape',
    enabled: true,
    maxOwnMoves: SHAPE_WINDOW,
    description: 'Mã đứng bờ sông phía mình ở lộ 4 hoặc 6.',
    all: [{ at: 'horse', squares: ['d4', 'f4'] }],
  },
  {
    id: 'ma_ky_ha',
    name: 'Mã kỵ hà',
    kind: 'shape',
    enabled: true,
    maxOwnMoves: SHAPE_WINDOW,
    description: 'Mã vượt sông đứng bờ sông phía đối phương.',
    all: [{ onRanks: 'horse', ranks: [5] }],
  },
  {
    id: 'ma_ngoa_tao',
    name: 'Mã ngọa tào',
    kind: 'shape',
    enabled: true,
    maxOwnMoves: SHAPE_WINDOW,
    description: 'Mã nằm ở ô ngọa tào sát cung đối phương.',
    all: [{ at: 'horse', squares: ['c8', 'g8'] }],
  },
  {
    id: 'quai_giac_ma',
    name: 'Quải giác mã',
    kind: 'shape',
    enabled: true,
    maxOwnMoves: SHAPE_WINDOW,
    description: 'Mã treo ở góc trước cung đối phương.',
    all: [{ at: 'horse', squares: ['d8', 'f8'] }],
  },
  {
    id: 'dieu_ngu_ma',
    name: 'Điếu ngư mã',
    kind: 'shape',
    enabled: true,
    maxOwnMoves: SHAPE_WINDOW,
    description: 'Mã "câu cá" cách cung đối phương một hàng.',
    all: [{ at: 'horse', squares: ['c7', 'g7'] }],
  },
  {
    id: 'ma_tuong_ngu',
    name: 'Mã tượng ngũ',
    kind: 'shape',
    enabled: true,
    maxOwnMoves: SHAPE_WINDOW,
    description: 'Mã đứng ở ô Tượng giữa, phòng các nước chiếu Mã.',
    all: [{ at: 'horse', squares: ['e2'] }],
  },
  {
    id: 'ma_quy',
    name: 'Mã quỳ',
    kind: 'shape',
    enabled: false,
    maxOwnMoves: SHAPE_WINDOW,
    description: 'Mã quỳ ở góc Sĩ giữ cung.',
    all: [{ at: 'horse', squares: ['d1', 'f1'] }],
  },
  {
    id: 'lien_hoan_ma',
    name: 'Liên hoàn mã',
    kind: 'shape',
    enabled: true,
    maxOwnMoves: SHAPE_WINDOW,
    description: 'Hai Mã bảo vệ lẫn nhau.',
    all: [{ custom: 'lien_hoan_ma' }],
  },
  {
    id: 'hai_si_khuyet_tuong',
    name: 'Hai Sĩ khuyết Tượng',
    kind: 'shape',
    enabled: true,
    description: 'Mất cả hai Tượng — "hai sĩ khuyết tượng ngại pháo công".',
    all: [{ count: 'elephant', eq: 0 }, { count: 'advisor', eq: 2 }],
  },
  {
    id: 'hai_tuong_khuyet_si',
    name: 'Hai Tượng khuyết Sĩ',
    kind: 'shape',
    enabled: true,
    description: 'Mất cả hai Sĩ — "hai tượng khuyết sĩ sợ tốt đâm".',
    all: [{ count: 'advisor', eq: 0 }, { count: 'elephant', eq: 2 }],
  },

  /* ------------------------------- Sát cục ------------------------------- */
  { id: 'doi_dien_tieu', name: 'Đối diện tiếu', kind: 'mate', enabled: true, description: 'Tướng mình khóa lộ, Tướng địch không còn đường thoát.', all: [{ custom: 'doi_dien_tieu' }] },
  { id: 'ma_hau_phao', name: 'Mã hậu pháo', kind: 'mate', enabled: true, description: 'Mã đứng sát Tướng làm ngòi, Pháo chiếu từ phía sau.', all: [{ custom: 'ma_hau_phao' }] },
  { id: 'trung_phao', name: 'Trùng pháo', kind: 'mate', enabled: true, description: 'Hai Pháo chồng nhau, Pháo sau chiếu qua Pháo trước.', all: [{ custom: 'trung_phao' }] },
  { id: 'thien_dia_phao', name: 'Thiên địa pháo', kind: 'mate', enabled: true, description: 'Một Pháo lộ giữa (thiên), một Pháo hàng đáy (địa).', all: [{ custom: 'thien_dia_phao' }] },
  { id: 'dai_dao_oan_tam', name: 'Đại đao oan tâm', kind: 'mate', enabled: true, description: 'Xe ăn Sĩ giữa cung có Pháo lộ giữa yểm trợ.', all: [{ custom: 'dai_dao_oan_tam' }] },
  { id: 'tieu_dao_oan_tam', name: 'Tiểu đao oan tâm', kind: 'mate', enabled: true, description: 'Tốt ăn Sĩ giữa cung có Pháo lộ giữa yểm trợ.', all: [{ custom: 'tieu_dao_oan_tam' }] },
  { id: 'muon_cung', name: 'Muộn cung', kind: 'mate', enabled: true, description: 'Pháo chiếu qua Sĩ, Tướng bị chính quân mình bịt lối.', all: [{ custom: 'muon_cung' }] },
  { id: 'thiet_mon_thuyen', name: 'Thiết môn thuyên', kind: 'mate', enabled: true, description: 'Pháo lộ giữa khóa cửa, Tướng kẹt ở đáy, quân khác chiếu bên cạnh.', all: [{ custom: 'thiet_mon_thuyen' }] },
  { id: 'giap_xe_phao', name: 'Giáp xe pháo', kind: 'mate', enabled: true, description: 'Xe và Pháo cùng đường kẹp Tướng.', all: [{ custom: 'giap_xe_phao' }] },
  { id: 'hai_de_lao_nguyet', name: 'Hải để lao nguyệt', kind: 'mate', enabled: true, description: 'Xe chiếu từ phía sau với Pháo ở đáy yểm trợ — "đáy biển mò trăng".', all: [{ custom: 'hai_de_lao_nguyet' }] },
  { id: 'ma_ngoa_tao_sat', name: 'Mã ngọa tào', kind: 'mate', enabled: true, description: 'Mã chiếu từ ô ngọa tào, quân khác khóa đường thoát.', all: [{ custom: 'ma_ngoa_tao_sat' }] },
  { id: 'quai_giac_ma_sat', name: 'Quải giác mã', kind: 'mate', enabled: true, description: 'Mã treo góc chiếu Tướng đang ở đáy.', all: [{ custom: 'quai_giac_ma_sat' }] },
  { id: 'dieu_ngu_ma_sat', name: 'Điếu ngư mã', kind: 'mate', enabled: true, description: 'Mã câu cá khống chế, Xe chiếu hàng đáy.', all: [{ custom: 'dieu_ngu_ma_sat' }] },
  { id: 'bat_giac_ma', name: 'Bát giác mã', kind: 'mate', enabled: true, description: 'Mã và Tướng địch ở hai góc chéo cung, Xe/Pháo chiếu.', all: [{ custom: 'bat_giac_ma' }] },
  { id: 'song_ma_am_tuyen', name: 'Song mã ẩm tuyền', kind: 'mate', enabled: true, description: 'Hai Mã cùng vây cung chiếu bí.', all: [{ custom: 'song_ma_am_tuyen' }] },
  { id: 'song_xe_thac', name: 'Song xe thác', kind: 'mate', enabled: true, description: 'Hai Xe thay nhau chiếu trên hai đường kề nhau.', all: [{ custom: 'song_xe_thac' }] },
  { id: 'nhi_quy_phach_mon', name: 'Nhị quỷ phách môn', kind: 'mate', enabled: true, description: 'Hai Tốt đứng trước cửa cung đối phương.', all: [{ custom: 'nhi_quy_phach_mon' }] },
  { id: 'dai_dam_xuyen_tam', name: 'Đại đảm xuyên tâm', kind: 'mate', enabled: false, description: 'Xe thí vào giữa cung ngay trước khi bí.', all: [{ custom: 'dai_dam_xuyen_tam' }] },
  { id: 'phao_trien_dan_sa', name: 'Pháo triển đan sa', kind: 'mate', enabled: false, description: 'Pháo cùng Xe càn quét hàng đáy.', all: [{ custom: 'never' }] },
  { id: 'lap_ma_xa', name: 'Lập mã xa', kind: 'mate', enabled: false, description: 'Xe áp sát chiếu, Mã đứng bảo vệ Xe.', all: [{ custom: 'lap_ma_xa' }] },
  { id: 'bach_ma_hien_de', name: 'Bạch mã hiện đề', kind: 'mate', enabled: false, description: 'Mã chiếu với Xe/Pháo khống chế.', all: [{ custom: 'never' }] },
  { id: 'tam_tu_quy_bien', name: 'Tam tử quy biên', kind: 'mate', enabled: false, description: 'Ba quân tấn công dồn về một cánh.', all: [{ custom: 'never' }] },
  { id: 'trac_dien_ho', name: 'Trắc diện hổ', kind: 'mate', enabled: false, description: 'Xe hàng đáy + Pháo tai Sĩ khống chế.', all: [{ custom: 'never' }] },
  { id: 'bat_hoang_ma', name: 'Bạt hoàng mã', kind: 'mate', enabled: false, description: 'Mã rời đi mở đường cho Xe/Pháo chiếu.', all: [{ custom: 'bat_hoang_ma' }] },
  { id: 'tong_phat_quy_dien', name: 'Tống Phật quy điện', kind: 'mate', enabled: false, description: 'Tốt dồn Tướng về đáy rồi bí.', all: [{ custom: 'never' }] },
  { id: 'lao_tot_suu_son', name: 'Lão tốt sưu sơn', kind: 'mate', enabled: false, description: 'Tốt vào cung ăn Sĩ Tượng phối hợp chiếu bí.', all: [{ custom: 'never' }] },
  { id: 'xa_ma_lanh_chieu', name: 'Xa mã lãnh chiêu', kind: 'mate', enabled: false, description: 'Xe + Mã tàn cuộc.', all: [{ custom: 'never' }] },
  { id: 'song_boi_hien_tuu', name: 'Song bôi hiến tửu', kind: 'mate', enabled: false, description: 'Hai Pháo phối hợp ở hàng đáy.', all: [{ custom: 'never' }] },
  { id: 'song_chieu_sat', name: 'Song chiếu', kind: 'mate', enabled: true, description: 'Kết thúc bằng một nước song chiếu.', all: [{ custom: 'double_check' }] },
  { id: 'tot_chieu_bi', name: 'Tốt chiếu bí', kind: 'mate', enabled: true, description: 'Tốt nhỏ bé kết liễu Tướng địch.', all: [{ custom: 'soldier_mate' }] },
];

export function patternById(id: string): PatternDef | undefined {
  return PATTERNS.find((p) => p.id === id);
}
