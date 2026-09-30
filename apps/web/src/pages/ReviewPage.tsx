import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Game, iccsToMove, moveFrom, moveTo } from '@np/rules';
import { MOVE_CLASS_VI, scoreToWinPercent, type GameReview, type MoveClass } from '@np/ai';
import { detectAll } from '@np/patterns';
import { Board, type BoardArrow } from '../board/Board';
import { AiClient } from '../ai/aiClient';
import { ActLabel, MoveList, ReviewControls, viewPosition } from '../game/components';
import { useProgress } from '../lib/progress';

interface ReviewInput {
  startFen: string;
  moves: string[];
  red?: string;
  black?: string;
  /** Bên của người xem (đánh máy / online); không có = 2 người 1 máy */
  you?: 'red' | 'black';
  /** Tên gọi bên kia: "Máy", "Đối thủ" */
  opponent?: string;
}

const CLASS_COLOR: Record<MoveClass, string> = {
  best: '#3fae5d',
  good: '#8fbf5a',
  inaccuracy: '#e0b040',
  mistake: '#e07a30',
  blunder: '#d24a3a',
};

export function ReviewPage() {
  const location = useLocation();
  const input = (location.state as ReviewInput | null) ?? null;
  const grant = useProgress((s) => s.grant);
  const [review, setReview] = useState<GameReview | null>(null);
  const [progress, setProgress] = useState(0);
  const [viewPly, setViewPly] = useState<number | null>(0);
  const [flipped, setFlipped] = useState(input?.you === 'black');
  const clientRef = useRef<AiClient | null>(null);

  const game = useMemo(() => {
    if (!input) return null;
    try {
      return Game.fromMoves(input.startFen, input.moves);
    } catch {
      return null;
    }
  }, [input]);

  const patternMarks = useMemo(() => (game ? detectAll(game) : []), [game]);

  useEffect(() => {
    if (!game) return;
    grant('phan_tich');
    const c = new AiClient();
    clientRef.current = c;
    const per = game.ply > 80 ? 150 : 250;
    void c.review(input!.startFen, input!.moves, per, setProgress).then((r) => setReview(r));
    return () => c.terminate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  if (!input || !game) {
    return (
      <div className="page narrow center">
        <h1>Phân tích ván</h1>
        <p className="muted">Không có ván để phân tích. Hãy mở từ màn hình kết thúc ván hoặc biên bản.</p>
        <Link className="btn primary" to="/">
          Về trang chủ
        </Link>
      </div>
    );
  }

  const shown = viewPosition(game, viewPly);
  const ply = viewPly ?? game.ply;
  const rec = ply > 0 ? game.records[ply - 1] : undefined;
  const rm = review && ply > 0 ? review.moves[ply - 1] : undefined;
  const arrows: BoardArrow[] = [];
  if (rm && rm.best && rm.best !== rm.played && (rm.cls === 'mistake' || rm.cls === 'blunder' || rm.cls === 'inaccuracy')) {
    const b = iccsToMove(rm.best);
    arrows.push({ from: moveFrom(b), to: moveTo(b), color: 'rgba(20,140,60,0.9)', label: '✓' });
  }
  const marks: Record<number, string> = {};
  review?.moves.forEach((m) => {
    if (m.cls === 'mistake' || m.cls === 'blunder' || m.cls === 'inaccuracy') marks[m.ply] = input.you && m.side !== input.you ? `${m.cls} theirs` : m.cls;
  });

  /** Tên từng bên: "Bạn"/"Máy" khi biết bên người xem, ngược lại "Đỏ"/"Đen" */
  const you = input.you;
  const sideName = (side: 'red' | 'black') =>
    you ? (side === you ? 'Bạn' : input.opponent ?? 'Đối thủ') : side === 'red' ? 'Đỏ' : 'Đen';
  /** "Nước sai của bạn", "Nước sai của máy", hoặc "Nước sai Đỏ/Đen" khi 2 người 1 máy */
  const errorLabel = (side: 'red' | 'black') => (you ? `Nước sai của ${sideName(side).toLowerCase()}` : `Nước sai ${sideName(side)}`);
  const sidesOrder: ('red' | 'black')[] = you ? [you, you === 'red' ? 'black' : 'red'] : ['red', 'black'];
  /** Các nước bị đánh dấu sai (không chính xác / sai lầm / sai lầm lớn) của một bên */
  const errorsOf = (side: 'red' | 'black') =>
    (review?.moves ?? []).filter((m) => m.side === side && (m.cls === 'mistake' || m.cls === 'blunder' || m.cls === 'inaccuracy'));
  /** Nhảy tới nước sai kế tiếp của một bên; hết thì quay lại nước sai đầu tiên */
  const nextErrorOf = (side: 'red' | 'black') => {
    const list = errorsOf(side);
    if (!list.length) return;
    const from = viewPly ?? game.ply;
    const next = list.find((m) => m.ply > from) ?? list[0]!;
    setViewPly(next.ply >= game.ply ? null : next.ply);
  };

  return (
    <div className="game-layout">
      <div className="board-column">
        <div className="room-header">
          <span>
            <span className="side-dot red" /> {input.red ?? 'Đỏ'} vs <span className="side-dot black" /> {input.black ?? 'Đen'}
          </span>
          <span className="muted small">Phân tích bằng engine trên máy bạn</span>
        </div>
        <div className="board-wrap">
          <Board
            board={shown.board}
            version={ply}
            flipped={flipped}
            interactive={false}
            lastMove={rec ? { from: moveFrom(rec.move), to: moveTo(rec.move) } : null}
            arrows={arrows}
          />
        </div>
        {review && <EvalChart review={review} ply={ply} onPick={(p) => setViewPly(p >= game.ply ? null : p)} />}
      </div>
      <aside className="side-panel">
        {!review && (
          <div className="card">
            <div>Đang phân tích… {Math.round(progress * 100)}%</div>
            <div className="progress">
              <div style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        )}
        {review && (
          <div className="card review-summary">
            <div className="stats">
              <div className="stat">
                <div className="stat-value">{review.accuracy.red.toFixed(0)}%</div>
                <div className="stat-label">Độ chính xác Đỏ</div>
              </div>
              <div className="stat">
                <div className="stat-value">{review.accuracy.black.toFixed(0)}%</div>
                <div className="stat-label">Độ chính xác Đen</div>
              </div>
            </div>
            <table className="table small">
              <thead>
                <tr>
                  <th />
                  <th>Đỏ</th>
                  <th>Đen</th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(MOVE_CLASS_VI) as MoveClass[]).map((c) => (
                  <tr key={c}>
                    <td>
                      <span className="cls-dot" style={{ background: CLASS_COLOR[c] }} /> {MOVE_CLASS_VI[c]}
                    </td>
                    <td>{review.counts.red[c]}</td>
                    <td>{review.counts.black[c]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rm && (
          <div className="hint-box" style={{ borderColor: CLASS_COLOR[rm.cls] }}>
            <strong>
              {sideName(rm.side)}: {rm.playedVi}
            </strong>{' '}
            — <span style={{ color: CLASS_COLOR[rm.cls] }}>{MOVE_CLASS_VI[rm.cls]}</span>
            {rm.bestVi && rm.best !== rm.played && <div className="small">Nước tốt hơn: {rm.bestVi}</div>}
            <div className="muted small">
              % thắng: {scoreToWinPercent(rm.evalBefore).toFixed(0)}% → {scoreToWinPercent(rm.evalAfter).toFixed(0)}%
            </div>
          </div>
        )}
        {patternMarks.filter((p) => p.ply === ply).map((p) => (
          <div key={p.hit.id} className="offer">
            🏯 {p.hit.name}: <span className="muted small">{p.hit.description}</span>
          </div>
        ))}
        <div className="actions error-nav">
          {sidesOrder.map((side) => {
            const n = errorsOf(side).length;
            const on = rm && rm.side === side && (rm.cls === 'mistake' || rm.cls === 'blunder' || rm.cls === 'inaccuracy');
            return (
              <button key={side} className={`btn ${on ? 'on' : ''}`} data-side={side} onClick={() => nextErrorOf(side)} disabled={!review || n === 0}>
                <span className="ic" aria-hidden="true">
                  <span className={`side-dot ${side}`} />
                </span>
                <span className="lb">
                  {errorLabel(side)}
                  {review ? ` (${n})` : ''}
                </span>
              </button>
            );
          })}
          <button className="btn" onClick={() => setFlipped((f) => !f)}>
            <ActLabel text="⇅ Xoay bàn" />
          </button>
        </div>
        <ReviewControls total={game.ply} viewPly={viewPly} setViewPly={setViewPly} />
        <MoveList records={game.records} viewPly={viewPly} onSelect={(p) => setViewPly(p >= game.ply ? null : p)} marks={marks} />
      </aside>
    </div>
  );
}

function EvalChart({ review, ply, onPick }: { review: GameReview; ply: number; onPick: (p: number) => void }) {
  const W = 560;
  const H = 110;
  const n = review.redCurve.length;
  const x = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * W);
  const y = (cp: number) => H - (scoreToWinPercent(cp) / 100) * H;
  const pts = review.redCurve.map((cp, i) => `${x(i)},${y(cp)}`).join(' ');
  const area = `0,${H} ${pts} ${W},${H}`;
  return (
    <svg
      className="eval-chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Biểu đồ lợi thế theo từng nước"
      onClick={(e) => {
        const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
        const i = Math.round(((e.clientX - rect.left) / rect.width) * (n - 1));
        onPick(Math.max(0, Math.min(n - 1, i)));
      }}
    >
      <rect width={W} height={H} fill="#2a1d15" />
      <polygon points={area} fill="rgba(216,57,44,0.55)" />
      <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="rgba(255,255,255,0.25)" strokeDasharray="4 4" />
      <polyline points={pts} fill="none" stroke="#f3c96b" strokeWidth="2" />
      {review.moves
        .filter((m) => m.cls === 'mistake' || m.cls === 'blunder')
        .map((m) => (
          <circle key={m.ply} cx={x(m.ply)} cy={y(review.redCurve[m.ply]!)} r="4" fill={CLASS_COLOR[m.cls]} />
        ))}
      <line x1={x(ply)} y1="0" x2={x(ply)} y2={H} stroke="#fff" strokeWidth="1.5" />
    </svg>
  );
}
