import { describe, expect, it } from 'vitest';
import { Game, INITIAL_FEN, Position, iccsToMove, iccsToSquare, shuffleJieqi } from '../src';

function seeded(seed: number) {
  return () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
}

/** identity đặt sẵn: mọi quân đúng như thế chuẩn, trừ vài ô được đổi */
function identityWith(overrides: Record<string, number>): Int8Array {
  const pos = Position.fromFen(INITIAL_FEN);
  const id = new Int8Array(90);
  for (let s = 0; s < 90; s++) if (pos.board[s] && Math.abs(pos.board[s]!) !== 1) id[s] = pos.board[s]!;
  for (const [sq, code] of Object.entries(overrides)) id[iccsToSquare(sq)] = code;
  return id;
}

describe('cờ úp (jieqi)', () => {
  it('xáo đủ 15 quân mỗi bên, giữ đúng số lượng từng loại', () => {
    const id = shuffleJieqi(seeded(7));
    const count: Record<number, number> = {};
    for (const v of id) if (v) count[v] = (count[v] ?? 0) + 1;
    expect(count[5]).toBe(2);
    expect(count[7]).toBe(5);
    expect(count[-6]).toBe(2);
    expect(Object.values(count).reduce((a, b) => a + b, 0)).toBe(30);
  });

  it('quân úp đi theo vị trí, đi xong thì lật', () => {
    // Quân úp ở h2 (vị trí Pháo) thật ra là Xe
    const g = new Game(INITIAL_FEN, { variant: 'jieqi', identity: identityWith({ h2: 5 }) });
    expect(g.isHidden(iccsToSquare('h2'))).toBe(true);
    const r = g.playIccs('h2e2'); // đi như Pháo
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.record.reveal).toBe('chariot');
      expect(r.events.some((e) => e.type === 'reveal')).toBe(true);
    }
    expect(g.isHidden(iccsToSquare('e2'))).toBe(false);
    expect(g.pos.board[iccsToSquare('e2')]).toBe(5);
    expect(g.movesIccs()[0]).toBe('h2e2=r');
  });

  it('client không biết danh tính dựng lại đúng ván từ nước có chú thích', () => {
    const server = Game.newJieqi(seeded(3));
    let rnd = seeded(11);
    for (let i = 0; i < 40 && !server.result; i++) {
      const ms = server.legalMoves();
      expect(server.playMove(ms[Math.floor(rnd() * ms.length)]!).ok).toBe(true);
    }
    const client = Game.fromMoves(INITIAL_FEN, server.movesIccs(), { variant: 'jieqi' });
    expect(client.fen()).toBe(server.fen());
    expect(client.records.map((r) => r.captured)).toEqual(server.records.map((r) => r.captured));
    // Hoàn tác trả lại quân úp
    const before = Game.newJieqi(seeded(3));
    const moves = server.movesIccs().slice(0, 6);
    const g = Game.fromMoves(INITIAL_FEN, moves, { variant: 'jieqi', identity: shuffleJieqi(seeded(3)) });
    g.undo(6);
    expect(g.fen()).toBe(before.fen());
    rnd = seeded(1);
    expect(rnd()).toBeGreaterThan(0);
  });

  it('Tượng đã lật được qua sông', () => {
    // Quân úp ở a3 (vị trí Tốt) là Tượng: đi lên a4 thì lật thành Tượng, sau đó qua sông
    const g = new Game(INITIAL_FEN, { variant: 'jieqi', identity: identityWith({ a3: 3 }) });
    expect(g.playIccs('a3a4').ok).toBe(true);
    expect(g.playIccs('i6i5').ok).toBe(true);
    const targets = g.legalMovesFrom(iccsToSquare('a4')).map((m) => m & 255);
    expect(targets).toContain(iccsToMove('a4c6') & 255);
  });

  it('xem lại thế cờ giữa ván', () => {
    const g = new Game(INITIAL_FEN, { variant: 'jieqi', identity: identityWith({ h2: 5 }) });
    g.playIccs('h2e2');
    g.playIccs('h7e7');
    const p1 = g.positionAt(1);
    expect(p1.board[iccsToSquare('e2')]).toBe(5);
    expect(p1.hidden![iccsToSquare('h7')]).toBe(1);
  });
});

describe('attackersOf', () => {
  it('tìm quân bảo vệ / tấn công một ô', () => {
    const pos = Position.fromFen(INITIAL_FEN);
    // Tốt đỏ e3 được Pháo? Không. Tượng c0? Tượng c0 đi e2, không tới e3. Kiểm tra Mã b0 tới c2
    expect(pos.attackersOf(iccsToSquare('c2'), 1)).toContain(iccsToSquare('b0'));
    // Ô e6 (Tốt đen) — Pháo đỏ h2 chưa tấn công
    expect(pos.isSquareAttacked(iccsToSquare('e6'), 1)).toBe(false);
  });
});
