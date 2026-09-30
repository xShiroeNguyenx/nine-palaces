import { describe, expect, it } from 'vitest';
import { Game, INITIAL_FEN, iccsToMove, iccsToSquare, Position } from '@np/rules';
import { analyzePiece, classifyMove, evaluatePosition, reviewGame } from '../src';

describe('Luyện Trình', () => {
  it('chấm điểm mọi nước của một quân, nước tốt nhất đứng đầu, có chuỗi nước dự kiến', () => {
    // Xe đỏ a0 có thể ăn Xe đen không được bảo vệ ở a5
    const g = new Game('4k4/9/9/9/r8/9/9/9/9/R2K5 w - - 0 1');
    const res = analyzePiece(g, iccsToSquare('a0'), 600);
    expect(res.length).toBeGreaterThan(3);
    expect(res[0]!.iccs).toBe('a0a5');
    expect(res[0]!.tags).toContain('capture');
    expect(res[0]!.label).toContain('Ăn Xe');
    expect(res[0]!.winPercent).toBeGreaterThan(res[res.length - 1]!.winPercent);
    expect(res[0]!.pv[0]).toBe('a0a5');
  });

  it('phát hiện nước bỏ quân', () => {
    // Pháo đỏ h2 lên h9 ăn Mã nhưng bị Xe đen i9 ăn lại
    const pos = Position.fromFen(INITIAL_FEN);
    const c = classifyMove(pos, iccsToMove('h2h9'));
    expect(c.tags).toContain('capture');
    // Pháo (285) ăn Mã (270), bị Xe ăn lại → đổi quân
    expect(c.tags.some((t) => t === 'trade' || t === 'hanging')).toBe(true);
  });

  it('nhận diện nước chiếu bí', () => {
    const pos = Position.fromFen('4k4/8R/9/9/9/9/9/9/9/R2K5 w - - 0 1');
    expect(classifyMove(pos, iccsToMove('a0a9')).tags).toContain('mate');
  });

  it('thanh đánh giá: bên hơn Xe được điểm cao', () => {
    const g = new Game('4k4/9/9/9/9/9/9/9/9/R2K5 b - - 0 1');
    const e = evaluatePosition(g, 300);
    expect(e.redScore).toBeGreaterThan(300);
    expect(e.redWinPercent).toBeGreaterThan(70);
  });

  it('đánh giá sau ván: bỏ lỡ ăn Xe là sai lầm nghiêm trọng, ăn Xe là tốt nhất', () => {
    // Hai Xe đối mặt trên lộ a: Đỏ đi a0a1 thay vì ăn Xe → Đen ăn lại Xe đỏ
    const fen = 'r3k4/9/9/9/9/9/9/9/9/R2K5 w - - 0 1';
    const review = reviewGame(fen, ['a0a1', 'a9a1'], 150);
    expect(review.moves.length).toBe(2);
    expect(review.redCurve.length).toBe(3);
    expect(review.moves[0]!.cls).toBe('blunder');
    expect(review.moves[0]!.best).toBe('a0a9');
    expect(review.moves[1]!.cls).toBe('best');
    expect(review.accuracy.black).toBeGreaterThan(90);
    expect(review.accuracy.red).toBeLessThan(30);
  }, 20_000);
});
