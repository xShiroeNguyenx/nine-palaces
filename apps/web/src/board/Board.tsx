import {
  memo,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as RKeyboardEvent,
  type PointerEvent as RPointerEvent,
} from 'react';
import type { BoardSkinId, PieceSetId } from '../lib/cosmetics';
import { useSettings } from '../lib/settings';
import { sfx } from '../lib/sound';
import { PIECE_BY_CODE, pieceLabel } from './pieces';
import { BoardDecor } from './decor';
import { BOARD_H, BOARD_W, CELL, EDGE_H, PAD, R, VIEW_H, squareCenter } from './geometry';
import { BOARD_THEMES, PIECE_THEMES, type BoardTheme, type PieceTheme } from './themes';

export { BOARD_H, BOARD_W, CELL, PAD, VIEW_H, squareCenter } from './geometry';

/**
 * Bàn cờ gồm HAI lớp SVG chồng lên nhau để giảm chi phí vẽ lại:
 * - `.board-bg`: nền, trang trí, lưới, số lộ — tĩnh, chỉ vẽ lại khi đổi bàn (memo).
 * - `.board`: quân, ô đánh dấu, mũi tên, tương tác — vẽ lại mỗi nước.
 * Không dùng filter SVG cho quân (bóng bằng gradient, "glow" bằng nét mờ) vì mỗi filter
 * phải chạy lại ở mọi lần vẽ, làm giật khi quân trượt hay vòng sáng chiếu nhấp nháy.
 */

export interface BoardArrow {
  from: number;
  to: number;
  color?: string;
  label?: string;
  width?: number;
}

export interface BoardBadge {
  text: string;
  color: string;
}

export interface BoardProps {
  board: Int8Array;
  /** Cờ úp: ô đang úp */
  hidden?: Uint8Array | null;
  /** Tăng mỗi khi thế cờ đổi (để bỏ chọn và chạy hoạt ảnh) */
  version: number;
  flipped?: boolean;
  interactive?: boolean;
  canSelect?: (sq: number) => boolean;
  targetsFor?: (sq: number) => number[];
  onMove?: (from: number, to: number) => void;
  lastMove?: { from: number; to: number } | null;
  checkSquare?: number | null;
  arrows?: BoardArrow[];
  flash?: { at: number; key: number } | null;
  /** Nhãn trên ô đích (Luyện Trình: % thắng) */
  badges?: Map<number, BoardBadge>;
  /** Báo ô quân đang được trỏ/chọn (Luyện Trình) */
  onInspect?: (sq: number | null) => void;
  premove?: { from: number; to: number } | null;
  /** Các ô cần làm nổi (thế cờ vừa nhận diện) */
  highlight?: number[];
  skin?: BoardSkinId;
  pieceSet?: PieceSetId;
  /** Thu gọn (xem trước trong bộ sưu tập) */
  preview?: boolean;
  /** Chế độ xếp thế: bấm vào ô bất kỳ */
  onSquareClick?: (sq: number) => void;
  ariaLabel?: string;
}

interface Drag {
  sq: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  moved: boolean;
  pointerId: number;
}

const FILES = 'abcdefghi';
const sqName = (sq: number) => `${FILES[sq % 9]}${9 - Math.floor(sq / 9)}`;
const HEX_POINTS = Array.from({ length: 6 }, (_, i) => {
  const a = Math.PI / 6 + (i * Math.PI) / 3;
  return `${(R * Math.cos(a)).toFixed(2)},${(R * Math.sin(a)).toFixed(2)}`;
}).join(' ');
const HEX_INNER = Array.from({ length: 6 }, (_, i) => {
  const a = Math.PI / 6 + (i * Math.PI) / 3;
  return `${((R - 5) * Math.cos(a)).toFixed(2)},${((R - 5) * Math.sin(a)).toFixed(2)}`;
}).join(' ');
const VIEWBOX = `0 0 ${BOARD_W} ${VIEW_H}`;

/** Mặt trên bàn: góc trên bo tròn, góc dưới vuông nhẹ (nối vào cạnh trước) */
const TOP_FACE = `M18,4 H${BOARD_W - 18} A14,14 0 0 1 ${BOARD_W - 4},18 V${BOARD_H - 10} A6,6 0 0 1 ${BOARD_W - 10},${BOARD_H - 4} H10 A6,6 0 0 1 4,${BOARD_H - 10} V18 A14,14 0 0 1 18,4 Z`;
/** Cạnh trước (bề dày bàn) */
const FRONT_EDGE = `M4,${BOARD_H - 8} H${BOARD_W - 4} V${BOARD_H + EDGE_H - 8} A6,6 0 0 1 ${BOARD_W - 10},${BOARD_H + EDGE_H - 2} H10 A6,6 0 0 1 4,${BOARD_H + EDGE_H - 8} Z`;
/** Vùng kẻ (mặt chơi) */
const PLAY = { x: PAD - 6, y: PAD - 6, w: CELL * 8 + 12, h: CELL * 9 + 12 };

export function Board(props: BoardProps) {
  const { board, version, flipped = false, interactive = true, preview = false } = props;
  const settings = useSettings();
  const skin = props.skin ?? settings.boardSkin;
  const pieceSet = props.pieceSet ?? settings.pieceStyle;
  const ptheme = PIECE_THEMES[pieceSet] ?? PIECE_THEMES.han;
  const coordinates = settings.coordinates && !preview;
  const effects = settings.effects && !preview;
  const showTargets = settings.showHints;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = (s: string) => `${s}-${uid}`;

  const svgRef = useRef<SVGSVGElement>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const lastInspect = useRef<number | null>(null);

  const inspect = (sq: number | null) => {
    if (lastInspect.current === sq) return;
    lastInspect.current = sq;
    props.onInspect?.(sq);
  };

  useEffect(() => {
    setSelected(null);
    setDrag(null);
    lastInspect.current = -1;
    inspect(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const targets = useMemo(
    () => (selected !== null && props.targetsFor ? props.targetsFor(selected) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected, version, props.targetsFor],
  );

  const disp = (sq: number) => squareCenter(sq, flipped);

  const svgPoint = (e: RPointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const p = pt.matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };

  const squareAt = (x: number, y: number): number | null => {
    const dc = Math.round((x - PAD) / CELL);
    const dr = Math.round((y - PAD) / CELL);
    if (dc < 0 || dc > 8 || dr < 0 || dr > 9) return null;
    const cx = PAD + dc * CELL;
    const cy = PAD + dr * CELL;
    if (Math.hypot(x - cx, y - cy) > CELL * 0.55) return null;
    const row = flipped ? 9 - dr : dr;
    const col = flipped ? 8 - dc : dc;
    return row * 9 + col;
  };

  const select = (sq: number | null) => {
    setSelected(sq);
    inspect(sq);
  };

  const trySelect = (sq: number): boolean => {
    if (board[sq] !== 0 && props.canSelect?.(sq)) {
      select(sq);
      sfx.select();
      return true;
    }
    return false;
  };

  const commit = (from: number, to: number) => {
    select(null);
    props.onMove?.(from, to);
  };

  const onPointerDown = (e: RPointerEvent<SVGSVGElement>) => {
    if (!interactive) return;
    const { x, y } = svgPoint(e);
    const sq = squareAt(x, y);
    if (sq === null) {
      select(null);
      return;
    }
    if (board[sq] !== 0 && props.canSelect?.(sq)) {
      select(sq);
      setDrag({ sq, x, y, startX: x, startY: y, moved: false, pointerId: e.pointerId });
      svgRef.current?.setPointerCapture(e.pointerId);
    }
  };

  const onPointerMove = (e: RPointerEvent<SVGSVGElement>) => {
    if (drag && e.pointerId === drag.pointerId) {
      const { x, y } = svgPoint(e);
      const moved = drag.moved || Math.hypot(x - drag.startX, y - drag.startY) > 8;
      setDrag({ ...drag, x, y, moved });
      return;
    }
    if (e.pointerType === 'mouse' && props.onInspect && selected === null) {
      const { x, y } = svgPoint(e);
      const sq = squareAt(x, y);
      inspect(sq !== null && board[sq] !== 0 && props.canSelect?.(sq) ? sq : null);
    }
  };

  const onPointerUp = (e: RPointerEvent<SVGSVGElement>) => {
    if (props.onSquareClick) {
      const p = svgPoint(e);
      const s = squareAt(p.x, p.y);
      if (s !== null) props.onSquareClick(s);
      return;
    }
    if (!interactive) return;
    const { x, y } = svgPoint(e);
    const sq = squareAt(x, y);
    if (drag && e.pointerId === drag.pointerId) {
      const d = drag;
      setDrag(null);
      if (d.moved) {
        if (sq !== null && targets.includes(sq)) commit(d.sq, sq);
        else if (sq !== null && sq !== d.sq) sfx.illegal();
        return;
      }
      if (sq === d.sq) return;
    }
    if (sq === null) return;
    if (selected !== null && targets.includes(sq)) {
      commit(selected, sq);
      return;
    }
    if (!trySelect(sq) && selected !== null && sq !== selected) select(null);
  };

  /** Bàn phím: mũi tên di chuyển con trỏ, Enter/Space chọn/đi, Esc bỏ chọn */
  const onKeyDown = (e: RKeyboardEvent<SVGSVGElement>) => {
    if (!interactive) return;
    const cur = cursor ?? selected ?? (flipped ? 4 : 85);
    const row = Math.floor(cur / 9);
    const col = cur % 9;
    const sign = flipped ? -1 : 1;
    let next: number | null = null;
    if (e.key === 'ArrowUp') next = Math.max(0, Math.min(9, row - sign)) * 9 + col;
    else if (e.key === 'ArrowDown') next = Math.max(0, Math.min(9, row + sign)) * 9 + col;
    else if (e.key === 'ArrowLeft') next = row * 9 + Math.max(0, Math.min(8, col - sign));
    else if (e.key === 'ArrowRight') next = row * 9 + Math.max(0, Math.min(8, col + sign));
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (selected !== null && targets.includes(cur)) commit(selected, cur);
      else if (!trySelect(cur)) select(null);
      return;
    } else if (e.key === 'Escape') {
      select(null);
      return;
    } else return;
    e.preventDefault();
    setCursor(next);
  };

  const lastMove = props.lastMove;
  const moveDelta = lastMove
    ? (() => {
        const a = disp(lastMove.from);
        const b = disp(lastMove.to);
        return { dx: a.x - b.x, dy: a.y - b.y };
      })()
    : null;

  const pieces: JSX.Element[] = [];
  for (let sq = 0; sq < 90; sq++) {
    const p = board[sq]!;
    if (p === 0) continue;
    if (drag?.moved && drag.sq === sq) continue;
    const { x, y } = disp(sq);
    const isMoved = effects && lastMove?.to === sq && moveDelta;
    pieces.push(
      <g key={isMoved ? `${sq}-${version}` : `${sq}`} transform={`translate(${x},${y})`}>
        <g
          className={isMoved ? 'piece-moved' : undefined}
          style={isMoved ? ({ '--dx': `${moveDelta!.dx}px`, '--dy': `${moveDelta!.dy}px` } as CSSProperties) : undefined}
        >
          <Piece code={p} set={pieceSet} theme={ptheme} selected={selected === sq} hidden={!!props.hidden?.[sq]} uid={uid} />
        </g>
      </g>,
    );
  }

  const faceR = ptheme.face(true);
  const faceB = ptheme.face(false);

  return (
    <div className={`board-stack skin-${skin} set-${pieceSet}`}>
      <BoardBackground skin={skin} uid={uid} flipped={flipped} coordinates={coordinates} animated={effects} pieceSet={pieceSet} />
      <svg
        ref={svgRef}
        className={`board ${interactive ? 'interactive' : ''}`}
        data-flipped={flipped ? 'true' : 'false'}
        viewBox={VIEWBOX}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDrag(null)}
        onPointerLeave={(e) => {
          if (e.pointerType === 'mouse' && selected === null) inspect(null);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => setCursor(null)}
        tabIndex={interactive ? 0 : -1}
        role="application"
        aria-label={props.ariaLabel ?? 'Bàn cờ tướng. Dùng phím mũi tên để di chuyển, Enter để chọn và đi quân.'}
      >
        <defs>
          {/* Mặt quân theo bên */}
          <radialGradient id={id('face-r')} cx="0.38" cy="0.32" r="0.8">
            <stop offset="0" stopColor={faceR[0]} />
            <stop offset="0.65" stopColor={faceR[1]} />
            <stop offset="1" stopColor={faceR[2]} />
          </radialGradient>
          <radialGradient id={id('face-b')} cx="0.38" cy="0.32" r="0.8">
            <stop offset="0" stopColor={faceB[0]} />
            <stop offset="0.65" stopColor={faceB[1]} />
            <stop offset="1" stopColor={faceB[2]} />
          </radialGradient>
          {/* Mặt bên (độ dày) */}
          <linearGradient id={id('side')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={ptheme.side[0]} />
            <stop offset="1" stopColor={ptheme.side[1]} />
          </linearGradient>
          {/* Bóng quân đổ xuống bàn (gradient thay cho filter) */}
          <radialGradient id={id('pshadow')} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="rgba(0,0,0,0.5)" />
            <stop offset="0.68" stopColor="rgba(0,0,0,0.42)" />
            <stop offset="1" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          <radialGradient id={id('core')} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="rgba(255,255,255,0.55)" />
            <stop offset="0.6" stopColor="rgba(255,255,255,0.12)" />
            <stop offset="1" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <linearGradient id={id('gold-b')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff2b0" />
            <stop offset="0.45" stopColor="#d4a72c" />
            <stop offset="1" stopColor="#8a5a12" />
          </linearGradient>
          <linearGradient id={id('gold-r')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffd0c0" />
            <stop offset="0.45" stopColor="#c8321f" />
            <stop offset="1" stopColor="#7a1710" />
          </linearGradient>
          <radialGradient id={id('back')} cx="0.4" cy="0.35" r="0.8">
            <stop offset="0" stopColor="#6b4a2e" />
            <stop offset="1" stopColor="#3a2616" />
          </radialGradient>
          <radialGradient id={id('checkGlow')}>
            <stop offset="0" stopColor="rgba(255,40,20,0.9)" />
            <stop offset="1" stopColor="rgba(255,40,20,0)" />
          </radialGradient>
          <radialGradient id={id('sheen')} cx="0.25" cy="0.15" r="0.9">
            <stop offset="0" stopColor="rgba(255,255,255,0.5)" />
            <stop offset="0.5" stopColor="rgba(255,255,255,0.06)" />
            <stop offset="1" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <radialGradient id={id('patina')} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="rgba(95,170,140,0)" />
            <stop offset="0.7" stopColor="rgba(95,170,140,0.15)" />
            <stop offset="1" stopColor="rgba(60,130,110,0.55)" />
          </radialGradient>
          <marker id={id('arrow')} viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="context-stroke" />
          </marker>
        </defs>

        {props.highlight?.map((s) => {
          const { x, y } = disp(s);
          return <circle key={`h${s}`} cx={x} cy={y} r={R + 7} className="pattern-highlight" />;
        })}

        {lastMove && (
          <g className="last-move">
            {[lastMove.from, lastMove.to].map((s, i) => {
              const { x, y } = disp(s);
              return <rect key={i} x={x - 29} y={y - 29} width="58" height="58" rx="8" className={i === 0 ? 'lm-from' : 'lm-to'} />;
            })}
          </g>
        )}

        {props.premove && (
          <g className="premove">
            {[props.premove.from, props.premove.to].map((s, i) => {
              const { x, y } = disp(s);
              return <rect key={i} x={x - 29} y={y - 29} width="58" height="58" rx="8" />;
            })}
          </g>
        )}

        {props.checkSquare != null && (
          <circle
            className="check-glow"
            cx={disp(props.checkSquare).x}
            cy={disp(props.checkSquare).y}
            r={R + 16}
            fill={`url(#${id('checkGlow')})`}
          />
        )}

        <g>{pieces}</g>

        {props.flash && (
          <circle key={props.flash.key} className="capture-flash" cx={disp(props.flash.at).x} cy={disp(props.flash.at).y} r={R} />
        )}

        {selected !== null &&
          showTargets &&
          !props.badges &&
          targets.map((t) => {
            const { x, y } = disp(t);
            return board[t] !== 0 ? (
              <circle key={t} cx={x} cy={y} r={R + 4} className="target-capture" />
            ) : (
              <circle key={t} cx={x} cy={y} r={9} className="target-dot" />
            );
          })}

        {props.arrows?.map((a, i) => {
          const p1 = disp(a.from);
          const p2 = disp(a.to);
          const len = Math.hypot(p2.x - p1.x, p2.y - p1.y) || 1;
          const ux = (p2.x - p1.x) / len;
          const uy = (p2.y - p1.y) / len;
          return (
            <g key={i} className="arrow">
              <line
                x1={p1.x + ux * 12}
                y1={p1.y + uy * 12}
                x2={p2.x - ux * 16}
                y2={p2.y - uy * 16}
                stroke={a.color ?? 'rgba(20,140,60,0.85)'}
                strokeWidth={a.width ?? 9}
                strokeLinecap="round"
                markerEnd={`url(#${id('arrow')})`}
              />
              {a.label && (
                <g transform={`translate(${p1.x + (p2.x - p1.x) * 0.55},${p1.y + (p2.y - p1.y) * 0.55})`}>
                  <circle r="11" fill={a.color ?? 'rgba(20,140,60,0.95)'} stroke="#fff" strokeWidth="2" />
                  <text className="arrow-label" textAnchor="middle" dominantBaseline="central">
                    {a.label}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {props.badges &&
          [...props.badges.entries()].map(([sq, b]) => {
            const { x, y } = disp(sq);
            return (
              <g key={`b${sq}`} className="badge" transform={`translate(${x},${y})`}>
                <circle r={R + 3} fill="none" stroke={b.color} strokeWidth="4" />
                <rect x={-24} y={R - 6} width="48" height="18" rx="9" fill={b.color} />
                <text y={R + 3} textAnchor="middle" dominantBaseline="central">
                  {b.text}
                </text>
              </g>
            );
          })}

        {cursor !== null && (
          <rect
            className="kb-cursor"
            x={disp(cursor).x - 30}
            y={disp(cursor).y - 30}
            width="60"
            height="60"
            rx="10"
            aria-label={`Ô ${sqName(cursor)}`}
          />
        )}

        {drag?.moved && board[drag.sq] !== 0 && (
          <g transform={`translate(${drag.x},${drag.y}) scale(1.15)`} className="dragging">
            <Piece code={board[drag.sq]!} set={pieceSet} theme={ptheme} selected hidden={!!props.hidden?.[drag.sq]} uid={uid} />
          </g>
        )}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Lớp nền tĩnh: mặt bàn 3D, trang trí, lưới, số lộ                    */
/* ------------------------------------------------------------------ */

const MARKERS = positionMarkers();

interface BgProps {
  skin: BoardSkinId;
  uid: string;
  flipped: boolean;
  coordinates: boolean;
  animated: boolean;
  pieceSet: PieceSetId;
}

const BoardBackground = memo(function BoardBackground({ skin, uid, flipped, coordinates, animated, pieceSet }: BgProps) {
  const theme = BOARD_THEMES[skin] ?? BOARD_THEMES.wood;
  const id = (s: string) => `${s}-${uid}`;
  const lw = theme.lineWidth ?? 2;
  const dark = !!theme.dark;
  const viet = pieceSet === 'viet';
  return (
    <svg className="board-bg" viewBox={VIEWBOX} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id('bg')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={theme.bg[0]} />
          <stop offset="0.5" stopColor={theme.bg[1]} />
          <stop offset="1" stopColor={theme.bg[2]} />
        </linearGradient>
        <linearGradient id={id('edge')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={theme.edge[0]} />
          <stop offset="0.15" stopColor={theme.edge[0]} />
          <stop offset="1" stopColor={theme.edge[1]} />
        </linearGradient>
        <linearGradient id={id('light')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={`rgba(255,255,255,${dark ? 0.1 : 0.24})`} />
          <stop offset="0.45" stopColor="rgba(255,255,255,0)" />
          <stop offset="1" stopColor={`rgba(0,0,0,${dark ? 0.3 : 0.18})`} />
        </linearGradient>
        <linearGradient id={id('ground')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={`rgba(0,0,0,${dark ? 0.7 : 0.55})`} />
          <stop offset="1" stopColor="rgba(0,0,0,0)" />
        </linearGradient>
        {/* Bóng trong quanh vùng kẻ (mặt chơi lõm): 4 dải gradient thay cho blur */}
        <linearGradient id={id('in-t')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={`rgba(0,0,0,${dark ? 0.5 : 0.34})`} />
          <stop offset="1" stopColor="rgba(0,0,0,0)" />
        </linearGradient>
        <linearGradient id={id('in-l')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={`rgba(0,0,0,${dark ? 0.5 : 0.34})`} />
          <stop offset="1" stopColor="rgba(0,0,0,0)" />
        </linearGradient>
        <linearGradient id={id('in-b')} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="rgba(255,255,255,0.28)" />
          <stop offset="1" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <linearGradient id={id('in-r')} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="rgba(255,255,255,0.28)" />
          <stop offset="1" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        {theme.glow && (
          <filter id={id('glow')} x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
        {theme.texture === 'paper' && (
          <filter id={id('noise')}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
            <feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 0 0.12  0 0 0 0.55 0" />
          </filter>
        )}
        {(theme.texture === 'marble' || theme.texture === 'jade') && (
          <filter id={id('veins')}>
            <feTurbulence type="fractalNoise" baseFrequency="0.008 0.03" numOctaves="3" seed="8" />
            <feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.45  0 0 0 0 0.45  0 0 0 -2.2 1.25" />
          </filter>
        )}
        <clipPath id={id('top')}>
          <path d={TOP_FACE} />
        </clipPath>
      </defs>

      {/* Bóng đổ dưới cạnh trước */}
      <rect x="2" y={BOARD_H + EDGE_H - 6} width={BOARD_W - 4} height={VIEW_H - BOARD_H - EDGE_H + 6} rx="4" fill={`url(#${id('ground')})`} />
      {/* Cạnh trước: bề dày bàn */}
      <path d={FRONT_EDGE} fill={`url(#${id('edge')})`} stroke="rgba(0,0,0,0.35)" strokeWidth="1" />
      <line x1="8" y1={BOARD_H - 2} x2={BOARD_W - 8} y2={BOARD_H - 2} stroke="rgba(255,255,255,0.28)" strokeWidth="1.2" />
      <line x1="10" y1={BOARD_H + EDGE_H - 3.5} x2={BOARD_W - 10} y2={BOARD_H + EDGE_H - 3.5} stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" />
      {theme.image ? (
        <ImageFace image={theme.image} clip={`url(#${id('top')})`} />
      ) : (
        <BoardFace theme={theme} id={id} skin={skin} animated={animated} lw={lw} viet={viet} dark={dark} />
      )}
      {coordinates && <Coordinates flipped={flipped} color={theme.coord} />}
    </svg>
  );
});

/** Mặt bàn vẽ sẵn bằng ảnh: co giãn để lưới ảnh trùng lưới quân */
function ImageFace({ image, clip }: { image: NonNullable<BoardTheme['image']>; clip: string }) {
  const [gx0, gy0, gx1, gy1] = image.grid;
  const sx = (CELL * 8) / (gx1 - gx0);
  const sy = (CELL * 9) / (gy1 - gy0);
  return (
    <>
      <path d={TOP_FACE} fill="#0b1a2a" />
      <image
        href={`${import.meta.env.BASE_URL}${image.src}`}
        x={PAD - gx0 * sx}
        y={PAD - gy0 * sy}
        width={image.size[0] * sx}
        height={image.size[1] * sy}
        preserveAspectRatio="none"
        clipPath={clip}
      />
      {/* Viền vát sáng/tối để ăn khớp với cạnh dày phía dưới */}
      <path d={`M5.5,${BOARD_H - 12} V16 A10.5,10.5 0 0 1 16,5.5 H${BOARD_W - 14}`} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.4" strokeLinecap="round" />
      <path d={`M${BOARD_W - 5.5},16 V${BOARD_H - 10} A4.5,4.5 0 0 1 ${BOARD_W - 10},${BOARD_H - 5.5} H12`} fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="1.4" strokeLinecap="round" />
    </>
  );
}

/** Mặt bàn vẽ bằng SVG: nền, họa tiết, trang trí, ánh sáng, lưới, chữ sông */
function BoardFace(props: {
  theme: BoardTheme;
  id: (s: string) => string;
  skin: BoardSkinId;
  animated: boolean;
  lw: number;
  viet: boolean;
  dark: boolean;
}) {
  const { theme, id, skin, animated, lw, viet } = props;
  return (
    <>
      {/* Mặt trên */}
      <path d={TOP_FACE} fill={`url(#${id('bg')})`} stroke={theme.border} strokeWidth="6" />
      <g clipPath={`url(#${id('top')})`}>
        {theme.texture === 'paper' && <rect x="10" y="10" width={BOARD_W - 20} height={BOARD_H - 20} rx="10" filter={`url(#${id('noise')})`} opacity="0.35" />}
        {theme.texture === 'marble' && <rect x="10" y="10" width={BOARD_W - 20} height={BOARD_H - 20} rx="10" filter={`url(#${id('veins')})`} opacity="0.55" />}
        {theme.texture === 'jade' && <rect x="10" y="10" width={BOARD_W - 20} height={BOARD_H - 20} rx="10" filter={`url(#${id('veins')})`} opacity="0.22" />}
        <BoardDecor skin={skin} id={id} animated={animated} />
        {/* Ánh sáng chiếu từ góc trên trái */}
        <path d={TOP_FACE} fill={`url(#${id('light')})`} pointerEvents="none" />
      </g>
      {/* Viền khung vát: sáng trên/trái, tối dưới/phải */}
      <path d={`M5.5,${BOARD_H - 12} V16 A10.5,10.5 0 0 1 16,5.5 H${BOARD_W - 14}`} fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="1.6" strokeLinecap="round" />
      <path d={`M${BOARD_W - 5.5},16 V${BOARD_H - 10} A4.5,4.5 0 0 1 ${BOARD_W - 10},${BOARD_H - 5.5} H12`} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="1.6" strokeLinecap="round" />
      {/* Mặt chơi lõm xuống */}
      <g pointerEvents="none">
        <rect x={PLAY.x} y={PLAY.y} width={PLAY.w} height="11" fill={`url(#${id('in-t')})`} />
        <rect x={PLAY.x} y={PLAY.y} width="11" height={PLAY.h} fill={`url(#${id('in-l')})`} />
        <rect x={PLAY.x} y={PLAY.y + PLAY.h - 7} width={PLAY.w} height="7" fill={`url(#${id('in-b')})`} />
        <rect x={PLAY.x + PLAY.w - 7} y={PLAY.y} width="7" height={PLAY.h} fill={`url(#${id('in-r')})`} />
      </g>
      <g filter={theme.glow ? `url(#${id('glow')})` : undefined}>
        <Grid color={theme.line} width={lw} />
        <g stroke={theme.line} strokeWidth="2" fill="none">
          {MARKERS.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      </g>
      <g className={`river-text ${viet ? 'viet' : ''}`} fontSize={viet ? 28 : 26} fill={theme.river}>
        <text x={PAD + CELL * 2} y={PAD + CELL * 4.5 + 9} textAnchor="middle">
          {viet ? 'Sở hà' : '楚 河'}
        </text>
        <text x={PAD + CELL * 6} y={PAD + CELL * 4.5 + 9} textAnchor="middle">
          {viet ? 'Hán giới' : '漢 界'}
        </text>
      </g>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Quân cờ khối 3D (không dùng filter)                                 */
/* ------------------------------------------------------------------ */

function Piece(props: { code: number; set: PieceSetId; theme: PieceTheme; selected: boolean; hidden: boolean; uid: string }) {
  const { code, set, theme, selected, hidden, uid } = props;
  const red = code > 0;
  const shadow = <circle cx={1.5} cy={theme.thickness + 4} r={R + 4} fill={`url(#pshadow-${uid})`} />;
  if (hidden) {
    return (
      <g>
        {shadow}
        <circle r={R} cy={3} fill="#2a1a0e" />
        <circle r={R} fill={`url(#back-${uid})`} stroke={selected ? '#1f8a3a' : red ? '#d8392c' : '#111'} strokeWidth={selected ? 4 : 3} />
        <circle r={R - 7} fill="none" stroke="rgba(255,220,160,0.35)" strokeWidth="1.5" strokeDasharray="3 3" />
        <text className="piece-text" fill="rgba(255,225,170,0.85)" textAnchor="middle" dominantBaseline="central" fontSize="24">
          ?
        </text>
      </g>
    );
  }
  const name = PIECE_BY_CODE[Math.abs(code)]!;
  if (theme.images) {
    // Quân vẽ sẵn: bóng + bề dày (khối tre) + ảnh mặt quân
    const href = `${import.meta.env.BASE_URL}${theme.images}/${red ? 'r' : 'b'}_${name}.webp`;
    const s = R + 2;
    return (
      <g>
        {shadow}
        <circle r={R} cy={theme.thickness} fill={`url(#side-${uid})`} />
        <image href={href} x={-s} y={-s} width={s * 2} height={s * 2} />
        {selected && <circle r={R + 1} fill="none" stroke="#1f8a3a" strokeWidth="4" />}
      </g>
    );
  }
  const label = pieceLabel(set, name, red);
  const color = theme.text(red);
  const ring = theme.ring(red);
  const rim = selected ? '#1f8a3a' : theme.rim(red);
  const rimW = selected ? 4 : theme.rimWidth;
  const face = `url(#face-${red ? 'r' : 'b'}-${uid})`;
  const shape = (extra: Record<string, unknown>) =>
    theme.shape === 'hex' ? <polygon points={HEX_POINTS} {...extra} /> : <circle r={R} {...extra} />;
  const innerShape = (extra: Record<string, unknown>) =>
    theme.shape === 'hex' ? <polygon points={HEX_INNER} {...extra} /> : <circle r={R - 5} {...extra} />;

  const fontClass =
    theme.font === 'viet' ? 'piece-text viet' : theme.font === 'icon' ? 'piece-text icon' : theme.font === 'calligraphy' ? 'piece-text callig' : 'piece-text';
  const fontSize =
    theme.font === 'viet' ? (label.length >= 5 ? 17 : label.length === 4 ? 19 : 22) : theme.font === 'calligraphy' ? 32 : 30;
  const dy = theme.font === 'han' || theme.font === 'calligraphy' ? 1 : 0;
  const textProps = { className: fontClass, textAnchor: 'middle' as const, dominantBaseline: 'central' as const, fontSize };

  let text: JSX.Element;
  switch (theme.textFx) {
    case 'engraved':
      text = (
        <>
          <text {...textProps} x={0.9} y={dy + 0.9} fill="rgba(255,255,255,0.55)">
            {label}
          </text>
          <text {...textProps} x={-0.7} y={dy - 0.7} fill="rgba(0,0,0,0.55)">
            {label}
          </text>
          <text {...textProps} y={dy} fill={color}>
            {label}
          </text>
        </>
      );
      break;
    case 'embossed':
      text = (
        <>
          <text {...textProps} x={-0.8} y={dy - 0.8} fill="rgba(255,255,255,0.45)">
            {label}
          </text>
          <text {...textProps} x={1} y={dy + 1} fill="rgba(0,0,0,0.6)">
            {label}
          </text>
          <text {...textProps} y={dy} fill={color}>
            {label}
          </text>
        </>
      );
      break;
    case 'goldleaf':
      text = (
        <>
          <text {...textProps} x={1} y={dy + 1} fill="rgba(0,0,0,0.35)">
            {label}
          </text>
          <text {...textProps} y={dy} fill={`url(#gold-${red ? 'r' : 'b'}-${uid})`} stroke={red ? '#7a1710' : '#7a5410'} strokeWidth="0.35">
            {label}
          </text>
        </>
      );
      break;
    case 'glow':
      // "Phát sáng" bằng nét viền mờ cùng màu (rẻ hơn filter blur rất nhiều)
      text = (
        <>
          <text {...textProps} y={dy} fill="none" stroke={color} strokeWidth="4" strokeLinejoin="round" opacity="0.28">
            {label}
          </text>
          <text {...textProps} y={dy} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" opacity="0.5">
            {label}
          </text>
          <text {...textProps} y={dy} fill={color}>
            {label}
          </text>
        </>
      );
      break;
    default:
      text = (
        <text {...textProps} y={dy} fill={color}>
          {label}
        </text>
      );
  }

  return (
    <g>
      {shadow}
      {theme.thickness > 0 && shape({ transform: `translate(0,${theme.thickness})`, fill: `url(#side-${uid})`, stroke: 'rgba(0,0,0,0.35)', strokeWidth: 0.8 })}
      {theme.neon && shape({ fill: 'none', stroke: rim, strokeWidth: rimW + 6, opacity: 0.3 })}
      {shape({ fill: face, stroke: rim, strokeWidth: rimW })}
      {theme.grain && (
        <g opacity="0.28" stroke="#4a2e12" fill="none" strokeWidth="1">
          <ellipse cx="-5" cy="-3" rx="7" ry="6" />
          <ellipse cx="-5" cy="-3" rx="13" ry="11" />
          <ellipse cx="-5" cy="-3" rx="19" ry="16" />
          <ellipse cx="-5" cy="-3" rx="24" ry="21" />
        </g>
      )}
      {theme.translucent && <circle r={R - 2} fill={`url(#core-${uid})`} />}
      {/* Gờ sáng phía trên trái, bóng phía dưới phải (khối tròn) */}
      {theme.thickness > 0 && theme.shape === 'disc' && (
        <>
          <path d={`M${-R * 0.72},${-R * 0.55} A${R - 1.5},${R - 1.5} 0 0 1 ${R * 0.55},${-R * 0.72}`} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.6" strokeLinecap="round" />
          <path d={`M${R * 0.72},${R * 0.55} A${R - 1.5},${R - 1.5} 0 0 1 ${-R * 0.55},${R * 0.72}`} fill="none" stroke="rgba(0,0,0,0.28)" strokeWidth="1.6" strokeLinecap="round" />
        </>
      )}
      {theme.overlay && <PieceOverlay kind={theme.overlay} uid={uid} />}
      {ring && theme.neon && innerShape({ fill: 'none', stroke: ring, strokeWidth: 5, opacity: 0.35 })}
      {ring && innerShape({ fill: 'none', stroke: ring, strokeWidth: 1.8 })}
      {text}
      {theme.gloss && <ellipse cx="-7" cy="-11" rx="15" ry="8" fill={`url(#sheen-${uid})`} pointerEvents="none" />}
    </g>
  );
}

/** Họa tiết phủ mặt quân: sao (tinh vân), vết nứt lửa, hoa tuyết, gỉ đồng */
function PieceOverlay({ kind, uid }: { kind: NonNullable<PieceTheme['overlay']>; uid: string }) {
  switch (kind) {
    case 'stars':
      return (
        <g pointerEvents="none">
          {[
            [-16, -12, 1.2],
            [14, -16, 0.9],
            [-8, 16, 1],
            [18, 10, 1.3],
            [-19, 5, 0.8],
            [6, -20, 0.7],
            [12, 19, 0.8],
          ].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill="#ffffff" opacity="0.85" />
          ))}
          <path d="M-14,10 h5 M-11.5,7.5 v5 M16,-6 h4 M18,-8 v4" stroke="#ffffff" strokeWidth="0.8" opacity="0.9" />
        </g>
      );
    case 'cracks':
      return (
        <g pointerEvents="none" fill="none" strokeLinecap="round">
          <path d="M-22,-8 L-15,-4 L-17,4 L-10,9 M20,-10 L14,-4 L17,3 M-6,-22 L-2,-16 L4,-19 M4,22 L8,15 L15,17" stroke="#ff8a1a" strokeWidth="3.5" opacity="0.4" />
          <path d="M-22,-8 L-15,-4 L-17,4 L-10,9 M20,-10 L14,-4 L17,3 M-6,-22 L-2,-16 L4,-19 M4,22 L8,15 L15,17" stroke="#ffe08a" strokeWidth="0.9" />
        </g>
      );
    case 'frost':
      return (
        <g pointerEvents="none" stroke="rgba(255,255,255,0.75)" strokeWidth="0.9" fill="none" strokeLinecap="round">
          {[0, 60, 120].map((a) => (
            <g key={a} transform={`translate(-13,-13) rotate(${a})`}>
              <line x1="-7" y1="0" x2="7" y2="0" />
              <path d="M-5,0 l-2,-2 M-5,0 l-2,2 M5,0 l2,-2 M5,0 l2,2" />
            </g>
          ))}
          {[0, 60, 120].map((a) => (
            <g key={`b${a}`} transform={`translate(15,14) rotate(${a}) scale(0.7)`}>
              <line x1="-7" y1="0" x2="7" y2="0" />
              <path d="M-5,0 l-2,-2 M-5,0 l-2,2 M5,0 l2,-2 M5,0 l2,2" />
            </g>
          ))}
        </g>
      );
    case 'patina':
      return (
        <g pointerEvents="none">
          <circle r={R - 1} fill={`url(#patina-${uid})`} />
          <ellipse cx="-14" cy="12" rx="6" ry="4" fill="rgba(70,150,125,0.4)" />
          <ellipse cx="15" cy="-13" rx="5" ry="3.5" fill="rgba(70,150,125,0.35)" />
          <ellipse cx="12" cy="16" rx="3.5" ry="2.5" fill="rgba(70,150,125,0.4)" />
        </g>
      );
    default:
      return null;
  }
}

function Grid({ color, width }: { color: string; width: number }) {
  const lines: JSX.Element[] = [];
  for (let r = 0; r < 10; r++) {
    lines.push(<line key={`h${r}`} x1={PAD} y1={PAD + r * CELL} x2={PAD + 8 * CELL} y2={PAD + r * CELL} />);
  }
  for (let c = 0; c < 9; c++) {
    if (c === 0 || c === 8) {
      lines.push(<line key={`v${c}`} x1={PAD + c * CELL} y1={PAD} x2={PAD + c * CELL} y2={PAD + 9 * CELL} />);
    } else {
      lines.push(<line key={`vt${c}`} x1={PAD + c * CELL} y1={PAD} x2={PAD + c * CELL} y2={PAD + 4 * CELL} />);
      lines.push(<line key={`vb${c}`} x1={PAD + c * CELL} y1={PAD + 5 * CELL} x2={PAD + c * CELL} y2={PAD + 9 * CELL} />);
    }
  }
  const x3 = PAD + 3 * CELL;
  const x5 = PAD + 5 * CELL;
  lines.push(<line key="p1" x1={x3} y1={PAD} x2={x5} y2={PAD + 2 * CELL} />);
  lines.push(<line key="p2" x1={x5} y1={PAD} x2={x3} y2={PAD + 2 * CELL} />);
  lines.push(<line key="p3" x1={x3} y1={PAD + 7 * CELL} x2={x5} y2={PAD + 9 * CELL} />);
  lines.push(<line key="p4" x1={x5} y1={PAD + 7 * CELL} x2={x3} y2={PAD + 9 * CELL} />);
  return (
    <g stroke={color} strokeWidth={width}>
      <rect x={PAD - 6} y={PAD - 6} width={CELL * 8 + 12} height={CELL * 9 + 12} fill="none" strokeWidth={width + 1.5} />
      {lines}
    </g>
  );
}

/** Dấu vị trí Pháo và Tốt */
function positionMarkers(): string[] {
  const spots: [number, number][] = [
    [2, 1], [2, 7], [7, 1], [7, 7],
    [3, 0], [3, 2], [3, 4], [3, 6], [3, 8],
    [6, 0], [6, 2], [6, 4], [6, 6], [6, 8],
  ];
  const d: string[] = [];
  const g = 5;
  const l = 10;
  for (const [r, c] of spots) {
    const x = PAD + c * CELL;
    const y = PAD + r * CELL;
    for (const sx of [-1, 1]) {
      if ((c === 0 && sx === -1) || (c === 8 && sx === 1)) continue;
      for (const sy of [-1, 1]) {
        d.push(`M${x + sx * g},${y + sy * (g + l)} L${x + sx * g},${y + sy * g} L${x + sx * (g + l)},${y + sy * g}`);
      }
    }
  }
  return d;
}

function Coordinates({ flipped, color }: { flipped: boolean; color: string }) {
  const top: JSX.Element[] = [];
  const bottom: JSX.Element[] = [];
  for (let dc = 0; dc < 9; dc++) {
    const col = flipped ? 8 - dc : dc;
    const blackNum = col + 1;
    const redNum = 9 - col;
    const x = PAD + dc * CELL;
    top.push(
      <text key={`t${dc}`} x={x} y={19} textAnchor="middle">
        {flipped ? redNum : blackNum}
      </text>,
    );
    bottom.push(
      <text key={`b${dc}`} x={x} y={BOARD_H - 11} textAnchor="middle">
        {flipped ? blackNum : redNum}
      </text>,
    );
  }
  return (
    <g className="coords" fontSize="12" fill={color}>
      {top}
      {bottom}
    </g>
  );
}
