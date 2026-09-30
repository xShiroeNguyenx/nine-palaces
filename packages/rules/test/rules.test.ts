import { describe, expect, it } from 'vitest';
import {
  Game,
  INITIAL_FEN,
  Position,
  fromPgn,
  iccsToMove,
  moveNotation,
  toPgn,
  type Move,
} from '../src';

function perft(pos: Position, depth: number): number {
  if (depth === 0) return 1;
  const moves = pos.generatePseudo();
  let n = 0;
  const side = pos.side;
  for (const m of moves) {
    pos.makeMove(m);
    if (!pos.inCheck(side)) n += depth === 1 ? 1 : perft(pos, depth - 1);
    pos.unmakeMove();
  }
  return n;
}

describe('perft từ thế khởi đầu', () => {
  it('depth 1..3', () => {
    const pos = Position.fromFen(INITIAL_FEN);
    expect(perft(pos, 1)).toBe(44);
    expect(perft(pos, 2)).toBe(1920);
    expect(perft(pos, 3)).toBe(79666);
  });
  it('depth 4 = 3 290 240', () => {
    const pos = Position.fromFen(INITIAL_FEN);
    expect(perft(pos, 4)).toBe(3290240);
  }, 60_000);
  it('make/unmake giữ nguyên hash và FEN', () => {
    const pos = Position.fromFen(INITIAL_FEN);
    const fen = pos.toFen();
    const key = pos.key();
    perft(pos, 3);
    expect(pos.toFen()).toBe(fen);
    expect(pos.key()).toBe(key);
  });
});

describe('FEN', () => {
  it('đọc/ghi lại giống hệt', () => {
    const pos = Position.fromFen(INITIAL_FEN);
    expect(pos.toFen()).toBe(INITIAL_FEN);
  });
  it('hash tính lại khớp hash cập nhật dần', () => {
    const g = Game.fromMoves(INITIAL_FEN, ['h2e2', 'h9g7', 'h0g2', 'i9h9']);
    const fresh = Position.fromFen(g.fen());
    expect(fresh.key()).toBe(g.pos.key());
  });
});

const target = (iccs: string) => iccsToMove(iccs) & 255;
const source = (iccs: string) => iccsToMove(iccs) >> 8;

describe('luật đi quân đặc biệt', () => {
  it('Mã bị cản chân', () => {
    // Mã đỏ ở b0, quân ở b1 chặn chân tiến lên
    const pos = Position.fromFen('4k4/9/9/9/9/9/9/9/1P7/1N1K5 w - - 0 1');
    const targets = pos.legalMovesFrom(source('b0a2')).map((m) => m & 255);
    expect(targets).not.toContain(target('b0a2'));
    expect(targets).not.toContain(target('b0c2'));
    expect(targets).toContain(target('b0d1'));
  });
  it('Tượng không qua sông', () => {
    const pos = Position.fromFen('4k4/9/9/9/9/2B6/9/9/9/3K5 w - - 0 1');
    const targets = pos.legalMovesFrom(source('c4a2')).map((m) => m & 255);
    expect(targets).toContain(target('c4a2'));
    expect(targets).toContain(target('c4e2'));
    expect(targets).not.toContain(target('c4a6'));
  });
  it('Tượng bị cản mắt', () => {
    const pos = Position.fromFen('4k4/9/9/9/9/2B6/3P5/9/9/3K5 w - - 0 1');
    const targets = pos.legalMovesFrom(source('c4e2')).map((m) => m & 255);
    expect(targets).not.toContain(target('c4e2'));
    expect(targets).toContain(target('c4a2'));
  });
  it('Pháo ăn qua đúng 1 ngòi', () => {
    const pos = Position.fromFen('4k4/9/9/9/9/9/9/9/9/C1pp1K3 w - - 0 1');
    const targets = pos.legalMovesFrom(source('a0a1')).map((m) => m & 255);
    expect(targets).toContain(target('a0d0'));
    expect(targets).not.toContain(target('a0c0'));
    expect(targets).toContain(target('a0b0'));
  });
  it('Không được để hai Tướng nhìn mặt nhau', () => {
    const pos = Position.fromFen('4k4/9/9/9/9/9/9/9/4R4/4K4 w - - 0 1');
    const moves = pos.legalMovesFrom(source('e1e2')).map((m) => m & 255);
    expect(moves).not.toContain(target('e1d1'));
    expect(moves).toContain(target('e1e5'));
  });
});

describe('ký hiệu nước đi', () => {
  it('tiếng Việt & WXF cho khai cuộc', () => {
    const pos = Position.fromFen(INITIAL_FEN);
    const vi = (iccs: string) => moveNotation(pos, iccsToMove(iccs), 'vi');
    expect(vi('h2e2')).toBe('P2-5');
    expect(vi('b0c2')).toBe('M8.7');
    expect(vi('h0g2')).toBe('M2.3');
    expect(vi('a0a1')).toBe('X9.1');
    expect(vi('g3g4')).toBe('B3.1');
    expect(vi('c0e2')).toBe('T7.5');
    expect(moveNotation(pos, iccsToMove('h2e2'), 'wxf')).toBe('C2=5');
    const g = Game.fromMoves(INITIAL_FEN, ['h2e2']);
    expect(moveNotation(g.pos, iccsToMove('h7e7'), 'vi')).toBe('P8-5');
    expect(moveNotation(g.pos, iccsToMove('b9c7'), 'vi')).toBe('M2.3');
  });
  it('hai Xe cùng lộ dùng trước/sau', () => {
    const pos = Position.fromFen('4k4/9/9/9/9/R8/9/9/9/R2K5 w - - 0 1');
    expect(moveNotation(pos, iccsToMove('a4b4'), 'vi')).toBe('Xt-8');
    expect(moveNotation(pos, iccsToMove('a0a1'), 'vi')).toBe('Xs.1');
  });
});

describe('kết thúc ván', () => {
  it('chiếu bí bằng Xe', () => {
    const g = new Game('4k4/8R/9/9/9/9/9/9/9/R2K5 w - - 0 1');
    const r = g.playIccs('a0a9');
    expect(r.ok).toBe(true);
    expect(g.result).toEqual({ winner: 'red', reason: 'checkmate' });
    if (r.ok) {
      const check = r.events.find((e) => e.type === 'check');
      expect(check && check.type === 'check' && check.by).toEqual(['chariot']);
      expect(r.events.some((e) => e.type === 'checkmate')).toBe(true);
    }
  });

  it('chiếu mãi: lần 2 cảnh báo, lần 3 xử thua bên chiếu', () => {
    const g = new Game('3k5/9/9/9/9/R8/9/9/9/5K3 w - - 0 1');
    const seq = ['a4a9', 'd9d8', 'a9a8', 'd8d9', 'a8a9'];
    let last;
    for (const m of seq) {
      last = g.playIccs(m);
      expect(last.ok).toBe(true);
    }
    expect(last!.ok && last!.events.some((e) => e.type === 'perpetualCheckWarning')).toBe(true);
    expect(g.perpetualWarning).toEqual({ side: 'red', count: 2 });
    expect(g.result).toBeNull();
    for (const m of ['d9d8', 'a9a8', 'd8d9']) expect(g.playIccs(m).ok).toBe(true);
    expect(g.result).toBeNull();
    expect(g.wouldLoseByPerpetual(iccsToMove('a8a9'))).toBe(true);
    expect(g.playIccs('a8a9').ok).toBe(true);
    expect(g.result).toEqual({ winner: 'black', reason: 'perpetual_check' });
  });

  it('thoát chiếu mãi bằng nước không chiếu thì không bị xử', () => {
    const g = new Game('3k5/9/9/9/9/R8/9/9/9/5K3 w - - 0 1');
    for (const m of ['a4a9', 'd9d8', 'a9a8', 'd8d9', 'a8a9', 'd9d8', 'a9a7']) expect(g.playIccs(m).ok).toBe(true);
    expect(g.result).toBeNull();
  });

  it('lặp nước không chiếu 3 lần → hòa', () => {
    const g = new Game(INITIAL_FEN);
    const cycle = ['b0c2', 'b9c7', 'c2b0', 'c7b9'];
    for (let i = 0; i < 2; i++) for (const m of cycle) expect(g.playIccs(m).ok).toBe(true);
    expect(g.result).toEqual({ winner: 'draw', reason: 'repetition' });
  });

  it('hoàn tác xóa kết quả', () => {
    const g = new Game('4k4/8R/9/9/9/9/9/9/9/R2K5 w - - 0 1');
    g.playIccs('a0a9');
    expect(g.result).not.toBeNull();
    g.undo();
    expect(g.result).toBeNull();
    expect(g.ply).toBe(0);
  });
});

describe('PGN', () => {
  it('xuất rồi nhập lại', () => {
    const g = Game.fromMoves(INITIAL_FEN, ['h2e2', 'h9g7', 'h0g2', 'i9h9', 'i0h0']);
    const g2 = fromPgn(toPgn(g, { Red: 'A', Black: 'B' }));
    expect(g2.fen()).toBe(g.fen());
    expect(g2.movesIccs()).toEqual(g.movesIccs());
  });
});

describe('ngẫu nhiên: make/unmake ổn định', () => {
  it('50 ván ngẫu nhiên không lỗi', () => {
    let seed = 42;
    const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let gi = 0; gi < 50; gi++) {
      const g = new Game();
      for (let i = 0; i < 120 && !g.result; i++) {
        const ms: Move[] = g.legalMoves();
        const r = g.playMove(ms[Math.floor(rnd() * ms.length)]!);
        expect(r.ok).toBe(true);
      }
      const fresh = Position.fromFen(g.fen());
      expect(fresh.key()).toBe(g.pos.key());
    }
  });
});
