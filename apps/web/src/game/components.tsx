import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Game, GameEvent, MoveRecord, PieceName } from '@np/rules';
import type { PatternHit } from '@np/patterns';
import { formatClock } from '../lib/format';
import { useSettings } from '../lib/settings';
import { sfx } from '../lib/sound';
import { useProgress } from '../lib/progress';
import { PIECE_VI, smallLabel } from '../board/pieces';

/* ------------------------------ Thanh người chơi ------------------------------ */

const ORDER: PieceName[] = ['chariot', 'cannon', 'horse', 'elephant', 'advisor', 'soldier', 'king'];

/** Quân mà bên `side` đã ăn được (tính từ lịch sử, đúng cả với cờ úp) */
export function capturedBy(records: MoveRecord[], side: 'red' | 'black', uptoPly?: number): PieceName[] {
  const list = records
    .slice(0, uptoPly ?? records.length)
    .filter((r) => r.side === side && r.captured)
    .map((r) => r.captured!);
  return list.sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));
}

export function PlayerBar(props: {
  side: 'red' | 'black';
  name: string;
  sub?: ReactNode;
  clockMs: number | null;
  active: boolean;
  captured: PieceName[];
  connected?: boolean;
  badge?: ReactNode;
}) {
  const { pieceStyle } = useSettings();
  const low = props.clockMs !== null && props.clockMs < 20_000;
  const lastBeep = useRef(0);
  useEffect(() => {
    if (props.active && low && props.clockMs !== null) {
      const s = Math.ceil(props.clockMs / 1000);
      if (s !== lastBeep.current && s <= 10) {
        lastBeep.current = s;
        sfx.lowTime();
      }
    }
  }, [props.active, low, props.clockMs]);
  return (
    <div className={`player-bar ${props.active ? 'active' : ''}`}>
      <span className={`side-dot ${props.side}`} />
      <div className="player-info">
        <div className="player-name">
          {props.name}
          {props.connected === false && <span className="offline-tag">mất kết nối</span>}
          {props.badge}
        </div>
        <div className="captured" aria-label={`Đã ăn: ${props.captured.map((n) => PIECE_VI[n]).join(', ') || 'chưa có'}`}>
          {props.captured.map((n, i) => (
            <span key={i} className={`cap ${props.side === 'red' ? 'black' : 'red'}`}>
              {smallLabel(pieceStyle, n, props.side === 'black')}
            </span>
          ))}
          {props.sub && <span className="player-sub">{props.sub}</span>}
        </div>
      </div>
      {props.clockMs !== null && (
        <div className={`clock ${props.active ? 'running' : ''} ${low ? 'low' : ''}`} role="timer">
          {formatClock(props.clockMs)}
        </div>
      )}
    </div>
  );
}

/* --------------------------------- Danh sách nước --------------------------------- */

export function MoveList(props: {
  records: MoveRecord[];
  viewPly: number | null;
  onSelect: (ply: number) => void;
  marks?: Record<number, string>;
}) {
  const { notation } = useSettings();
  const ref = useRef<HTMLDivElement>(null);
  const current = props.viewPly ?? props.records.length;
  useEffect(() => {
    if (props.viewPly === null && ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [props.records.length, props.viewPly]);
  const cell = (r: MoveRecord, ply: number) => (
    <button
      className={`move ${current === ply ? 'current' : ''} ${r.check ? 'check' : ''} ${props.marks?.[ply] ? props.marks[ply]!.split(' ').map((c) => `mark-${c}`).join(' ') : ''}`}
      onClick={() => props.onSelect(ply)}
    >
      {notation === 'vi' ? r.vi : r.wxf}
      {r.reveal && <span className="reveal-tag">→{PIECE_VI[r.reveal]}</span>}
    </button>
  );
  const rows: JSX.Element[] = [];
  for (let i = 0; i < props.records.length; i += 2) {
    const a = props.records[i]!;
    const b = props.records[i + 1];
    rows.push(
      <div className="move-row" key={i}>
        <span className="move-no">{i / 2 + 1}.</span>
        {cell(a, i + 1)}
        {b && cell(b, i + 2)}
      </div>,
    );
  }
  return (
    <div className="move-list" ref={ref}>
      {rows.length === 0 ? <div className="muted small">Chưa có nước đi</div> : rows}
    </div>
  );
}

/**
 * Dải nước đi một dòng (màn chơi trên điện thoại): ⏮ ◀ [các nước cuộn ngang] ▶ ⏭.
 * Nước đang xem luôn được cuộn vào giữa dải.
 */
export function MoveStrip(props: { records: MoveRecord[]; viewPly: number | null; setViewPly: (p: number | null) => void }) {
  const { notation } = useSettings();
  const ref = useRef<HTMLDivElement>(null);
  const total = props.records.length;
  const cur = props.viewPly ?? total;
  const go = (p: number) => props.setViewPly(p >= total ? null : Math.max(0, p));
  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    const el = box.querySelector<HTMLElement>('.move.current');
    if (el) box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.offsetWidth / 2, behavior: 'smooth' });
    else box.scrollTo({ left: box.scrollWidth, behavior: 'smooth' });
  }, [cur, total]);
  return (
    <div className="move-strip">
      <button className="strip-nav" onClick={() => go(0)} aria-label="Về đầu" disabled={cur === 0}>
        ⏮
      </button>
      <button className="strip-nav" onClick={() => go(cur - 1)} aria-label="Lùi" disabled={cur === 0}>
        ◀
      </button>
      <div className="strip-moves" ref={ref}>
        {total === 0 && <span className="muted small">Chưa có nước đi</span>}
        {props.records.map((r, i) => {
          const ply = i + 1;
          return (
            <span key={i} className="strip-item">
              {i % 2 === 0 && <span className="move-no">{i / 2 + 1}.</span>}
              <button className={`move ${cur === ply ? 'current' : ''} ${r.check ? 'check' : ''}`} onClick={() => go(ply)}>
                {notation === 'vi' ? r.vi : r.wxf}
                {r.reveal && <span className="reveal-tag">→{PIECE_VI[r.reveal]}</span>}
              </button>
            </span>
          );
        })}
      </div>
      <button className="strip-nav" onClick={() => go(cur + 1)} aria-label="Tiến" disabled={cur >= total}>
        ▶
      </button>
      <button className="strip-nav" onClick={() => go(total)} aria-label="Về hiện tại" disabled={cur >= total}>
        ⏭
      </button>
    </div>
  );
}

/** Nút tua xem lại ván */
export function ReviewControls(props: { total: number; viewPly: number | null; setViewPly: (p: number | null) => void }) {
  const [auto, setAuto] = useState(false);
  const cur = props.viewPly ?? props.total;
  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => {
      const next = (props.viewPly ?? props.total) + 1;
      if (next >= props.total) {
        props.setViewPly(null);
        setAuto(false);
      } else props.setViewPly(next);
    }, 900);
    return () => clearInterval(id);
  }, [auto, props]);
  const go = (p: number) => props.setViewPly(p >= props.total ? null : Math.max(0, p));
  return (
    <div className="review-controls">
      <button onClick={() => go(0)} aria-label="Về đầu" disabled={cur === 0}>
        ⏮
      </button>
      <button onClick={() => go(cur - 1)} aria-label="Lùi" disabled={cur === 0}>
        ◀
      </button>
      <button
        onClick={() => {
          if (!auto && cur >= props.total) props.setViewPly(0);
          setAuto(!auto);
        }}
        aria-label="Tự động phát"
      >
        {auto ? '⏸' : '▶︎▶︎'}
      </button>
      <button onClick={() => go(cur + 1)} aria-label="Tiến" disabled={cur >= props.total}>
        ▶
      </button>
      <button onClick={() => go(props.total)} aria-label="Về hiện tại" disabled={cur >= props.total}>
        ⏭
      </button>
    </div>
  );
}

/** Thế cờ đang hiển thị (hiện tại hoặc đang xem lại) — kèm mặt nạ quân úp cho cờ úp */
export function viewPosition(game: Game, viewPly: number | null): { board: Int8Array; hidden: Uint8Array | null } {
  if (viewPly === null || viewPly >= game.records.length) return { board: game.pos.board, hidden: game.pos.hidden };
  const p = game.positionAt(viewPly);
  return { board: p.board, hidden: p.hidden };
}

/* ---------------------------------- Banner hiệu ứng ---------------------------------- */

interface Banner {
  key: number;
  title: string;
  sub?: string;
  kind: string;
}

const CHECK_TEXT: Record<PieceName, { sub: string; kind: string }> = {
  chariot: { sub: 'Xe chiếu', kind: 'chariot' },
  horse: { sub: 'Mã chiếu', kind: 'horse' },
  cannon: { sub: 'Pháo chiếu', kind: 'cannon' },
  soldier: { sub: 'Tốt chiếu', kind: 'soldier' },
  king: { sub: 'Tướng chiếu', kind: 'king' },
  advisor: { sub: 'Sĩ chiếu', kind: 'soldier' },
  elephant: { sub: 'Tượng chiếu', kind: 'soldier' },
};

/** Banner theo sự kiện + tên thế cờ / sát cục vừa nhận diện */
export function EffectBanner({
  events,
  stamp,
  patterns,
  flipped = false,
}: {
  events: GameEvent[];
  stamp: number;
  patterns?: PatternHit[];
  flipped?: boolean;
}) {
  const { effects, fxTier, patternBanners } = useSettings();
  const [banner, setBanner] = useState<Banner | null>(null);
  // Banner chiếu tránh nửa bàn có Tướng bị chiếu để không che hình minh họa
  const checkEv = events.find((e) => e.type === 'check');
  const kingRow = checkEv && checkEv.type === 'check' ? Math.floor(checkEv.kingSquare / 9) : null;
  const kingAtTop = kingRow !== null && (flipped ? 9 - kingRow : kingRow) < 5;
  useEffect(() => {
    if (!effects || events.length === 0) return;
    let b: Banner | null = null;
    const mate = events.find((e) => e.type === 'checkmate');
    const check = events.find((e) => e.type === 'check');
    const warn = events.find((e) => e.type === 'perpetualCheckWarning');
    const crossed = events.find((e) => e.type === 'soldierCrossed');
    const reveal = events.find((e) => e.type === 'reveal');
    const mateHit = patterns?.find((p) => p.kind === 'mate');
    const formation = patterns?.find((p) => p.kind !== 'mate');
    if (mate && mate.type === 'checkmate') {
      b = {
        key: stamp,
        title: 'TƯỚNG!',
        sub: mateHit ? `${mateHit.name} — ${mate.side === 'red' ? 'Đỏ' : 'Đen'} thắng` : `Chiếu bí — ${mate.side === 'red' ? 'Đỏ' : 'Đen'} thắng`,
        kind: 'mate',
      };
    } else if (warn && warn.type === 'perpetualCheckWarning') {
      b = {
        key: stamp,
        title: `CHIẾU MÃI ${warn.count}/${warn.max}`,
        sub: `${warn.side === 'red' ? 'Đỏ' : 'Đen'} lặp lại nước chiếu nữa sẽ bị xử thua`,
        kind: 'warning',
      };
    } else if (check && check.type === 'check') {
      b = check.double
        ? { key: stamp, title: 'SONG CHIẾU', sub: check.by.map((p) => CHECK_TEXT[p].sub).join(' + '), kind: 'double' }
        : { key: stamp, title: 'CHIẾU!', sub: CHECK_TEXT[check.by[0]!].sub, kind: CHECK_TEXT[check.by[0]!].kind };
    } else if (formation && patternBanners) {
      b = { key: stamp, title: formation.name, sub: formation.description, kind: 'formation' };
      sfx.drum();
    } else if (reveal && reveal.type === 'reveal') {
      b = { key: stamp, title: `Lật: ${PIECE_VI[reveal.piece]}`, kind: 'reveal' };
    } else if (crossed) {
      b = { key: stamp, title: 'Tốt qua sông', kind: 'river' };
    }
    if (!b) return;
    setBanner(b);
    const ms = b.kind === 'mate' ? 4100 : b.kind === 'formation' ? 1800 : 1600;
    const t = setTimeout(() => setBanner((cur) => (cur?.key === b!.key ? null : cur)), ms);
    return () => clearTimeout(t);
  }, [events, stamp, effects, patterns, patternBanners]);
  if (!banner) return null;
  return (
    <div key={banner.key} className={`fx-banner fx-${banner.kind} tier-${fxTier} ${kingAtTop ? 'at-bottom' : ''}`} role="status">
      <div className="fx-title">{banner.title}</div>
      {banner.sub && <div className="fx-sub">{banner.sub}</div>}
    </div>
  );
}

/* ----------------------------------- Modal ----------------------------------- */

export function Modal(props: { open: boolean; onClose?: () => void; title?: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!props.open || !props.onClose) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && props.onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [props.open, props.onClose]);
  if (!props.open) return null;
  return (
    <div className="modal-backdrop" onClick={props.onClose}>
      <div className={`modal ${props.wide ? 'wide' : ''}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={props.title}>
        {props.title && <h2 className="modal-title">{props.title}</h2>}
        {props.children}
        {props.onClose && (
          <button className="modal-close" onClick={props.onClose} aria-label="Đóng">
            ×
          </button>
        )}
      </div>
    </div>
  );
}

/** Nút cần xác nhận lần 2 (thay cho confirm()) */
export function ConfirmButton(props: { label: string; confirmLabel: string; onConfirm: () => void; className?: string; disabled?: boolean }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      className={`${props.className ?? 'btn'} ${armed ? 'danger' : ''}`}
      disabled={props.disabled}
      onClick={() => {
        if (armed) {
          setArmed(false);
          props.onConfirm();
        } else setArmed(true);
      }}
    >
      <ActLabel text={armed ? props.confirmLabel : props.label} />
    </button>
  );
}

/**
 * Nhãn nút "biểu tượng + chữ": tách ký hiệu đầu (💡, ↶, ⇅…) ra span riêng
 * để lưới nút (.actions) xếp biểu tượng trên, chữ dưới. Chuỗi không có biểu tượng giữ nguyên.
 */
export function ActLabel({ text }: { text: string }) {
  const m = /^([^\p{L}\p{N}\s]+)\s+(.+)$/u.exec(text);
  if (!m) return <>{text}</>;
  return (
    <>
      <span className="ic" aria-hidden="true">
        {m[1]}
      </span>
      <span className="lb">{m[2]}</span>
    </>
  );
}

/** Thông báo mở khóa vật phẩm / thành tựu (toàn cục) */
export function UnlockToasts() {
  const toasts = useProgress((s) => s.toasts);
  const dismiss = useProgress((s) => s.dismissToast);
  const shown = useRef(new Set<number>());
  useEffect(() => {
    for (const t of toasts) {
      if (shown.current.has(t.id)) continue;
      shown.current.add(t.id);
      sfx.unlock();
      setTimeout(() => dismiss(t.id), 5000);
    }
  }, [toasts, dismiss]);
  if (toasts.length === 0) return null;
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.slice(-3).map((t) => (
        <button key={t.id} className="toast" onClick={() => dismiss(t.id)}>
          🔓 {t.text}
        </button>
      ))}
    </div>
  );
}

/** Đọc nước đi cho trình đọc màn hình */
export function MoveAnnouncer({ record }: { record: MoveRecord | undefined }) {
  const text = record
    ? `${record.side === 'red' ? 'Đỏ' : 'Đen'} đi ${record.vi}${record.captured ? `, ăn ${PIECE_VI[record.captured]}` : ''}${record.check ? ', chiếu tướng' : ''}`
    : '';
  return (
    <div className="sr-only" aria-live="polite">
      {text}
    </div>
  );
}

/* ------------------------------ Hiệu ứng chiến thắng ------------------------------ */

/** Thời lượng ảnh động chiến thắng (64 khung × 12fps) */
const VICTORY_MS = 5400;
/** Tải ảnh động một lần; mỗi lần thắng tạo URL mới từ cùng dữ liệu để ảnh chạy lại từ khung đầu */
let victoryBlob: Promise<Blob | null> | null = null;
function loadVictory(): Promise<Blob | null> {
  victoryBlob ??= fetch(`${import.meta.env.BASE_URL}video/victory.gif`)
    .then((r) => (r.ok ? r.blob() : null))
    .catch(() => null);
  return victoryBlob;
}

/**
 * Hiệu ứng chiến thắng trên bàn cờ: ảnh động (GIF) chiến xa hoà vào bàn (nền tối trong suốt) rồi mới gọi onDone.
 * Chạm bất kỳ đâu để bỏ qua. Không tải được, tắt hiệu ứng hoặc giảm chuyển động thì gọi onDone ngay.
 */
export function VictoryVideo(props: { open: boolean; title?: string; sub?: string; onDone: () => void }) {
  const { effects } = useSettings();
  const [src, setSrc] = useState<string | null>(null);
  const doneRef = useRef(false);
  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    props.onDone();
  };
  // Tải sẵn khi màn chơi mở, để lúc thắng không phải chờ
  useEffect(() => {
    if (effects) void loadVictory();
  }, [effects]);
  useEffect(() => {
    if (!props.open) {
      doneRef.current = false;
      return;
    }
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!effects || reduce) {
      finish();
      return;
    }
    let url: string | null = null;
    let timer = 0;
    let alive = true;
    void loadVictory().then((b) => {
      if (!alive) return;
      if (!b) return finish();
      url = URL.createObjectURL(b);
      setSrc(url);
      timer = window.setTimeout(finish, VICTORY_MS);
    });
    return () => {
      alive = false;
      clearTimeout(timer);
      if (url) URL.revokeObjectURL(url);
      setSrc(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.open]);
  if (!props.open || !effects) return null;
  return (
    <div className="victory-video" role="dialog" aria-label={props.title ?? 'Chiến thắng'} onClick={finish}>
      {src && <img className="victory-main" src={src} alt="" onError={finish} />}
      <div className="victory-text">
        <div className="victory-title">{props.title ?? 'CHIẾN THẮNG'}</div>
        {props.sub && <div className="victory-sub">{props.sub}</div>}
      </div>
      <button
        className="victory-skip"
        onClick={(e) => {
          e.stopPropagation();
          finish();
        }}
      >
        Bỏ qua ›
      </button>
    </div>
  );
}
