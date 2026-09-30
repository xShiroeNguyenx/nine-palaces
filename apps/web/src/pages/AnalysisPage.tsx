import { useMemo, useState } from 'react';
import { INITIAL_FEN, Position, colOf, inPalace, onOwnSide, rowOf, type Side } from '@np/rules';
import { Board } from '../board/Board';
import { LocalGameScreen } from '../game/LocalGameScreen';
import { PIECE_BY_CODE, pieceLabel } from '../board/pieces';
import { useSettings } from '../lib/settings';

const PALETTE = [1, 2, 3, 4, 5, 6, 7];
const LIMIT: Record<number, number> = { 1: 1, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2, 7: 5 };

function toFen(board: Int8Array, side: Side): string {
  const p = new Position();
  p.board.set(board);
  p.side = side;
  return p.toFen().replace(/ \d+ \d+$/, ' 0 1');
}

/** Kiểm tra thế cờ tự xếp có hợp lệ không, trả về lỗi (tiếng Việt) hoặc null */
export function validateSetup(board: Int8Array, side: Side): string | null {
  const count: Record<number, number> = {};
  for (let s = 0; s < 90; s++) {
    const p = board[s]!;
    if (!p) continue;
    count[p] = (count[p] ?? 0) + 1;
    const t = Math.abs(p);
    const own: Side = p > 0 ? 1 : -1;
    const r = rowOf(s);
    const c = colOf(s);
    if ((t === 1 || t === 2) && !inPalace(own, r, c)) return `${t === 1 ? 'Tướng' : 'Sĩ'} phải ở trong cung`;
    // Sĩ chỉ đứng ở 4 góc và tâm cung
    const rr = own === 1 ? r : 9 - r;
    if (t === 2 && !((c === 4 && rr === 8) || ((c === 3 || c === 5) && (rr === 7 || rr === 9)))) return 'Sĩ đặt sai vị trí';
    if (t === 3 && !onOwnSide(own, r)) return 'Tượng không được qua sông';
    const ELEPHANT_SQ = ['9,2', '9,6', '7,0', '7,4', '7,8', '5,2', '5,6'];
    if (t === 3 && !ELEPHANT_SQ.includes(`${rr},${c}`)) return 'Tượng đặt sai vị trí';
    if (t === 7) {
      const backward = own === 1 ? r > 6 : r < 3;
      if (backward) return 'Tốt không thể ở phía sau vị trí xuất phát';
    }
  }
  for (const [code, n] of Object.entries(count)) if (n > LIMIT[Math.abs(Number(code))]!) return 'Quá số lượng quân cho phép';
  if (count[1] !== 1 || count[-1] !== 1) return 'Mỗi bên phải có đúng 1 Tướng';
  const pos = new Position();
  pos.loadFen(toFen(board, side));
  if (pos.inCheck(-side as Side)) return 'Bên không tới lượt đang bị chiếu — thế cờ không hợp lệ';
  return null;
}

export function AnalysisPage() {
  const { pieceStyle } = useSettings();
  const [board, setBoard] = useState<Int8Array>(() => Position.fromFen(INITIAL_FEN).board.slice());
  const [side, setSide] = useState<Side>(1);
  const [brush, setBrush] = useState<number>(0); // 0 = xóa
  const [playFen, setPlayFen] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const error = useMemo(() => validateSetup(board, side), [board, side]);

  if (playFen) {
    return (
      <div>
        <div className="page">
          <button className="btn small" onClick={() => setPlayFen(null)}>
            ✏️ Sửa lại thế cờ
          </button>
        </div>
        <LocalGameScreen key={playFen} mode="analysis" timeControl={null} initialFen={playFen} />
      </div>
    );
  }

  const click = (sq: number) => {
    const next = board.slice();
    next[sq] = next[sq] === brush ? 0 : brush;
    setBoard(next);
    setVersion((v) => v + 1);
  };

  return (
    <div className="game-layout">
      <div className="board-column">
        <div className="board-wrap">
          <Board board={board} version={version} interactive={false} onSquareClick={click} ariaLabel="Bàn xếp thế cờ" />
        </div>
      </div>
      <aside className="side-panel">
        <h1>Bàn phân tích</h1>
        <p className="muted small">Chọn quân ở bảng dưới rồi bấm vào ô trên bàn để đặt. Bấm lại lần nữa để gỡ.</p>
        {([1, -1] as Side[]).map((s) => (
          <div key={s} className="palette">
            {PALETTE.map((t) => {
              const code = s * t;
              const name = PIECE_BY_CODE[t]!;
              return (
                <button
                  key={code}
                  className={`palette-piece ${s === 1 ? 'red' : 'black'} ${brush === code ? 'on' : ''}`}
                  onClick={() => setBrush(code)}
                  aria-label={`${s === 1 ? 'Đỏ' : 'Đen'} ${name}`}
                >
                  {pieceLabel(pieceStyle === 'viet' ? 'han' : pieceStyle, name, s === 1)}
                </button>
              );
            })}
          </div>
        ))}
        <div className="actions two">
          <button className={`btn ${brush === 0 ? 'primary' : ''}`} onClick={() => setBrush(0)}>
            🧽 Tẩy
          </button>
          <button
            className="btn"
            onClick={() => {
              setBoard(Position.fromFen(INITIAL_FEN).board.slice());
              setVersion((v) => v + 1);
            }}
          >
            Thế khởi đầu
          </button>
          <button
            className="btn"
            onClick={() => {
              const b = new Int8Array(90);
              b[4] = -1;
              b[85] = 1;
              setBoard(b);
              setVersion((v) => v + 1);
            }}
          >
            Xóa bàn
          </button>
          <button className="btn" onClick={() => setSide((s) => (s === 1 ? -1 : 1))}>
            Lượt đi: <span className={`side-dot ${side === 1 ? 'red' : 'black'}`} /> {side === 1 ? 'Đỏ' : 'Đen'}
          </button>
        </div>
        <label className="field-label">FEN</label>
        <code className="code-box">{toFen(board, side)}</code>
        {error && <div className="error-text">{error}</div>}
        <button className="btn primary big" disabled={!!error} onClick={() => setPlayFen(toFen(board, side))}>
          🔍 Phân tích / chơi từ thế này
        </button>
      </aside>
    </div>
  );
}
