import { describe, expect, it } from 'vitest';
import { Game, INITIAL_FEN } from '@np/rules';
import { analyze, chooseMove, LEVELS, scoreToWinPercent } from '../src';

describe('engine', () => {
  it('tìm được nước chiếu bí 1 nước', () => {
    // Xe a0 lên a9 chiếu bí (Xe i8 khóa hàng 8)
    const g = new Game('4k4/8R/9/9/9/9/9/9/9/R2K5 w - - 0 1');
    const r = analyze(g, 1000);
    expect(r?.iccs).toBe('a0a9');
    expect(r!.score).toBeGreaterThan(29000);
  });

  it('ăn quân được cho không', () => {
    // Xe đen ở a5 không được bảo vệ, Xe đỏ a0 ăn được
    const g = new Game('4k4/9/9/9/r8/9/9/9/9/R2K5 w - - 0 1');
    expect(analyze(g, 800)?.iccs).toBe('a0a5');
  });

  it('mọi cấp đều trả về nước hợp lệ ở thế khởi đầu', () => {
    for (const cfg of LEVELS.slice(0, 7)) {
      const g = new Game(INITIAL_FEN);
      const m = chooseMove(g, cfg.level);
      expect(m).not.toBeNull();
      expect(g.playIccs(m!.iccs).ok).toBe(true);
    }
  }, 30_000);

  it('máy không tự đi nước chiếu mãi bị xử thua', () => {
    const g = new Game('3k5/9/9/9/9/R8/9/9/9/5K3 w - - 0 1');
    for (const m of ['a4a9', 'd9d8', 'a9a8', 'd8d9', 'a8a9', 'd9d8', 'a9a8', 'd8d9']) g.playIccs(m);
    const m = chooseMove(g, 10);
    expect(m?.iccs).not.toBe('a8a9');
  });

  it('máy tự chơi với máy 30 nửa nước không lỗi', () => {
    const g = new Game(INITIAL_FEN);
    for (let i = 0; i < 30 && !g.result; i++) {
      const m = chooseMove(g, 1 + (i % 7));
      expect(g.playIccs(m!.iccs).ok).toBe(true);
    }
  }, 120_000);

  it('đổi điểm sang %', () => {
    expect(scoreToWinPercent(0)).toBeCloseTo(50);
    expect(scoreToWinPercent(400)).toBeGreaterThan(75);
    expect(scoreToWinPercent(-400)).toBeLessThan(25);
  });
});
