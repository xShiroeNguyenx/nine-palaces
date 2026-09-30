import { describe, expect, it } from 'vitest';
import { Game, INITIAL_FEN } from '@np/rules';
import { PATTERNS, PatternTracker, detectAll } from '../src';

/** Chơi lần lượt, trả về danh sách id thế được báo (kèm bên) */
function run(moves: string[], fen = INITIAL_FEN): string[] {
  const g = new Game(fen);
  const t = new PatternTracker();
  const out: string[] = [];
  for (const m of moves) {
    const r = g.playIccs(m);
    if (!r.ok) throw new Error(`${m}: ${r.error}`);
    for (const h of t.afterMove(g)) out.push(`${h.id}:${h.side}`);
  }
  return out;
}

describe('danh mục', () => {
  it('id không trùng, mọi thế đều có mô tả', () => {
    const ids = PATTERNS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(PATTERNS.every((p) => p.description.length > 5)).toBe(true);
    expect(PATTERNS.filter((p) => p.kind === 'opening').length).toBeGreaterThanOrEqual(25);
    expect(PATTERNS.filter((p) => p.kind === 'shape').length).toBeGreaterThanOrEqual(23);
    expect(PATTERNS.filter((p) => p.kind === 'mate').length).toBeGreaterThanOrEqual(29);
  });
});

describe('khai cuộc', () => {
  it('Pháo đầu (Đỏ) và Pháo đầu (Đen) → Thuận pháo', () => {
    // Đỏ P2-5 (h2e2), Đen P2-5 theo góc nhìn Đen = b7e7
    const hits = run(['h2e2', 'b7e7']);
    expect(hits).toContain('phao_dau:red');
    expect(hits).toContain('thuan_phao:black');
  });
  it('Nghịch pháo', () => {
    expect(run(['h2e2', 'h7e7'])).toContain('nghich_phao:black');
  });
  it('Pháo đầu Mã độn: cần cả Tốt đầu tấn, báo 1 lần, thế ghép lên trước', () => {
    // Pháo đầu + Bình phong mã mà chưa tấn Tốt đầu → chỉ báo Bình phong mã
    const early = run(['h2e2', 'h9g7', 'h0g2', 'b9c7', 'b0c2']);
    expect(early.some((h) => h.startsWith('phao_dau_ma_don'))).toBe(false);
    expect(early).toContain('binh_phong_ma:red');
    expect(early).toContain('binh_phong_ma:black');
    // Tấn Tốt đầu → Pháo đầu Mã độn
    const hits = run(['h2e2', 'h9g7', 'h0g2', 'b9c7', 'b0c2', 'i9h9', 'e3e4']);
    expect(hits.filter((h) => h.startsWith('phao_dau_ma_don')).length).toBe(1);
    expect(hits[hits.length - 1]).toBe('phao_dau_ma_don:red');
  });
  it('Phi tượng, Khởi mã, Tiên nhân chỉ lộ', () => {
    expect(run(['c0e2'])).toContain('phi_tuong:red');
    expect(run(['b0c2'])).toContain('khoi_ma:red');
    expect(run(['g3g4'])).toContain('tien_nhan_chi_lo:red');
  });
  it('Không báo nhầm Pháo đầu khi chưa có', () => {
    expect(run(['b0c2', 'b9c7']).some((h) => h.startsWith('phao_dau'))).toBe(false);
  });
});

describe('thế hình quân', () => {
  it('Bá vương xe: hai Xe cùng bên thấy nhau', () => {
    // Đỏ ra Xe a0a1, i0i1 → hai Xe cùng hàng 1, giữa trống
    const hits = run(['a0a1', 'a9a8', 'i0i1']);
    expect(hits).toContain('ba_vuong_xe:red');
  });
  it('Xe tuần hà, Xe kỵ hà', () => {
    const fen = '4k4/9/9/9/9/9/9/9/R8/3K5 w - - 0 1';
    expect(run(['a1a4'], fen)).toContain('xe_tuan_ha:red');
    expect(run(['a1a5'], fen)).toContain('xe_ky_ha:red');
    expect(run(['a1a9'], fen)).toContain('xe_tram_day:red');
  });
});

/** Đi 1 nước từ thế cho trước, bắt buộc phải là chiếu bí, trả về tên sát cục nhận được */
function mateName(fen: string, move: string): string | undefined {
  const g = new Game(fen);
  const r = g.playIccs(move);
  expect(r.ok).toBe(true);
  expect(g.result?.reason).toBe('checkmate');
  return new PatternTracker().afterMove(g).find((h) => h.kind === 'mate')?.id;
}

describe('sát cục', () => {
  it('Mã hậu pháo', () => {
    // Mã đỏ e8 sát Tướng, Mã c7 bảo vệ, hai Xe khóa lộ d/f; Pháo a1 bình vào e1 chiếu qua Mã
    expect(mateName('4k4/4N4/2N6/9/9/9/9/9/C8/3RKR3 w - - 0 1', 'a1e1')).toBe('ma_hau_phao');
  });
  it('Tốt chiếu bí', () => {
    // Tốt e7 lên e8 chiếu, Tướng không ăn được vì lộ mặt Tướng, hai Xe khóa hai bên
    expect(mateName('4k4/9/4P4/9/9/9/9/9/9/3RKR3 w - - 0 1', 'e7e8')).toBe('tot_chieu_bi');
  });
  it('Trùng pháo', () => {
    // Hai Pháo đỏ trên lộ e, Pháo sau chiếu qua Pháo trước; Xe khóa d/f
    expect(mateName('4k4/9/9/9/4C4/9/9/9/C8/3RKR3 w - - 0 1', 'a1e1')).toBe('trung_phao');
  });
  it('Song chiếu kết thúc ván', () => {
    const all = PATTERNS.find((p) => p.id === 'song_chieu_sat');
    expect(all?.enabled).toBe(true);
  });
  it('detectAll liệt kê thế theo từng nửa nước', () => {
    const g = new Game(INITIAL_FEN);
    for (const m of ['h2e2', 'h7e7']) g.playIccs(m);
    const hits = detectAll(g);
    expect(hits.find((h) => h.hit.id === 'phao_dau')?.ply).toBe(1);
    expect(hits.find((h) => h.hit.id === 'nghich_phao')?.ply).toBe(2);
  });
});
