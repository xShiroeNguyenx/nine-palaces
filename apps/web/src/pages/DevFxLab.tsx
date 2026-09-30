import { useEffect, useRef, useState } from 'react';
import { Game, INITIAL_FEN, moveFrom, moveTo, type GameEvent } from '@np/rules';
import { PATTERNS, PatternTracker, type PatternHit } from '@np/patterns';
import { Board } from '../board/Board';
import { EffectCanvas } from '../effects/EffectCanvas';
import { drawSpirit, spiritWidth, type SpiritKind } from '../effects/spirits';
import { spiritStyleFor } from '../effects/sprites';
import { EffectBanner } from '../game/components';
import { BOARD_SKINS, FX_TIERS, PIECE_SETS, type BoardSkinId, type FxTier, type PieceSetId } from '../lib/cosmetics';
import { useSettings } from '../lib/settings';
import { playEvents, sfx } from '../lib/sound';

/**
 * Phòng thử hiệu ứng (chỉ có khi chạy `pnpm dev:web`).
 * Mỗi tình huống là một ván thật: dựng thế cờ + đi nước → sinh đúng sự kiện như khi chơi.
 */

interface Scenario {
  id: string;
  group: string;
  label: string;
  fen?: string;
  moves: string[];
  jieqi?: boolean;
}

const cap = (piece: string, label: string): Scenario => ({
  id: `cap-${piece}`,
  group: 'Ăn quân',
  label,
  fen: `4k4/9/9/9/${piece}8/9/9/9/9/R2K5 w - - 0 1`,
  moves: ['a0a5'],
});

export const SCENARIOS: Scenario[] = [
  { id: 'chk-chariot', group: 'Chiếu tướng', label: 'Xe chiếu', fen: '4k4/9/9/9/9/9/9/9/9/R2K5 w - - 0 1', moves: ['a0a9'] },
  { id: 'chk-chariot-up', group: 'Chiếu tướng', label: 'Xe chiếu dọc (lao ra xa)', fen: '4k4/9/9/9/9/9/9/9/9/3K4R w - - 0 1', moves: ['i0e0'] },
  { id: 'chk-chariot-down', group: 'Chiếu tướng', label: 'Xe đen chiếu dọc (lao tới)', fen: '3k4r/9/9/9/9/9/9/9/9/4K4 b - - 0 1', moves: ['i9e9'] },
  { id: 'chk-cannon-down', group: 'Chiếu tướng', label: 'Pháo đen chiếu dọc (bắn tới)', fen: '3k5/9/9/c8/9/9/9/4p4/9/4K4 b - - 0 1', moves: ['a6e6'] },
  { id: 'chk-soldier-down', group: 'Chiếu tướng', label: 'Tốt đen chiếu (lao tới)', fen: '3k5/9/9/9/9/9/9/4p4/9/4K4 b - - 0 1', moves: ['e2e1'] },
  { id: 'chk-horse', group: 'Chiếu tướng', label: 'Mã chiếu', fen: '4k4/9/9/1N7/9/9/9/9/9/3K5 w - - 0 1', moves: ['b6c8'] },
  { id: 'chk-cannon', group: 'Chiếu tướng', label: 'Pháo chiếu', fen: '4k4/9/9/4P4/9/9/9/C8/9/3K5 w - - 0 1', moves: ['a2e2'] },
  { id: 'chk-soldier', group: 'Chiếu tướng', label: 'Tốt chiếu', fen: '4k4/9/4P4/9/9/9/9/9/9/3K5 w - - 0 1', moves: ['e7e8'] },
  { id: 'chk-double', group: 'Chiếu tướng', label: 'Song chiếu (Xe + Mã)', fen: '4k4/9/4N4/9/9/9/4R4/9/9/3K5 w - - 0 1', moves: ['e7c8'] },
  { id: 'chk-black', group: 'Chiếu tướng', label: 'Xe Đen chiếu', fen: 'r2k5/9/9/9/9/9/9/9/9/4K4 b - - 0 1', moves: ['a9a0'] },
  { id: 'mate-chariot', group: 'Chiếu bí', label: 'Bí bằng Xe', fen: '4k4/8R/9/9/9/9/9/9/9/R2K5 w - - 0 1', moves: ['a0a9'] },
  { id: 'mate-horse', group: 'Chiếu bí', label: 'Bí bằng Mã (ngọa tào)', fen: '3aka3/8R/9/1N7/9/9/9/9/9/3K5 w - - 0 1', moves: ['b6c8'] },
  { id: 'mate-mhp', group: 'Chiếu bí', label: 'Mã hậu pháo', fen: '4k4/4N4/2N6/9/9/9/9/9/C8/3RKR3 w - - 0 1', moves: ['a1e1'] },
  { id: 'mate-trung', group: 'Chiếu bí', label: 'Trùng pháo', fen: '4k4/9/9/9/4C4/9/9/9/C8/3RKR3 w - - 0 1', moves: ['a1e1'] },
  { id: 'mate-soldier', group: 'Chiếu bí', label: 'Tốt chiếu bí', fen: '4k4/9/4P4/9/9/9/9/9/9/3RKR3 w - - 0 1', moves: ['e7e8'] },
  cap('r', 'Ăn Xe'),
  cap('n', 'Ăn Mã'),
  cap('c', 'Ăn Pháo'),
  cap('p', 'Ăn Tốt'),
  cap('a', 'Ăn Sĩ'),
  cap('b', 'Ăn Tượng'),
  { id: 'river', group: 'Khác', label: 'Tốt qua sông', fen: '4k4/9/9/9/9/P8/9/9/9/3K5 w - - 0 1', moves: ['a4a5'] },
  {
    id: 'perp-warn',
    group: 'Khác',
    label: 'Cảnh báo chiếu mãi',
    fen: '3k5/9/9/9/9/R8/9/9/9/5K3 w - - 0 1',
    moves: ['a4a9', 'd9d8', 'a9a8', 'd8d9', 'a8a9'],
  },
  {
    id: 'perp-lose',
    group: 'Khác',
    label: 'Xử thua chiếu mãi',
    fen: '3k5/9/9/9/9/R8/9/9/9/5K3 w - - 0 1',
    moves: ['a4a9', 'd9d8', 'a9a8', 'd8d9', 'a8a9', 'd9d8', 'a9a8', 'd8d9', 'a8a9'],
  },
  { id: 'reveal', group: 'Khác', label: 'Lật quân (cờ úp)', jieqi: true, moves: ['h2e2'] },
  { id: 'f-phaodau', group: 'Thế cờ', label: 'Pháo đầu', moves: ['h2e2'] },
  { id: 'f-thuan', group: 'Thế cờ', label: 'Thuận pháo', moves: ['h2e2', 'b7e7'] },
  { id: 'f-bpm', group: 'Thế cờ', label: 'Bình phong mã', moves: ['h2e2', 'h9g7', 'h0g2', 'b9c7'] },
  { id: 'f-madon', group: 'Thế cờ', label: 'Pháo đầu Mã độn', moves: ['h2e2', 'h9g7', 'h0g2', 'b9c7', 'b0c2', 'i9h9', 'e3e4'] },
  { id: 'f-bavuong', group: 'Thế cờ', label: 'Bá vương xe', fen: '4k4/9/9/9/9/9/9/9/R8/3K4R w - - 0 1', moves: ['i0i1'] },
  { id: 'f-tuanha', group: 'Thế cờ', label: 'Xe tuần hà', fen: '4k4/9/9/9/9/9/9/9/R8/3K5 w - - 0 1', moves: ['a1a4'] },
];

const SOUNDS = Object.keys(sfx) as (keyof typeof sfx)[];

const SPIRIT_KINDS: { kind: SpiritKind; label: string }[] = [
  { kind: 'horse', label: 'Ngựa (Bạc/Vàng)' },
  { kind: 'rider', label: 'Tướng cưỡi ngựa (Huyền thoại)' },
  { kind: 'chariot', label: 'Chiến xa' },
  { kind: 'cannon', label: 'Pháo (Bạc/Vàng)' },
  { kind: 'cannonDragon', label: 'Pháo đầu rồng (Huyền thoại)' },
  { kind: 'soldier', label: 'Lính giáo' },
];

/** Xem tĩnh các hồn quân theo bậc (Bạc / Vàng / Huyền thoại) để chỉnh dáng và màu */
function SpiritGallery({ tier }: { tier: FxTier }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState(0.15);
  const t: Exclude<FxTier, 'basic'> = tier === 'basic' ? 'silver' : tier;
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    const dpr = 1;
    c.width = 560 * dpr;
    c.height = 520 * dpr;
    const style = spiritStyleFor(t);
    let timer = 0;
    let visible = false;
    const start = performance.now();
    const draw = () => {
      const time = (performance.now() - start) / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = t === 'legendary' ? '#0d0618' : '#1b120a';
      ctx.fillRect(0, 0, 560, 520);
      SPIRIT_KINDS.forEach((s, i) => {
        const x = 140 + (i % 2) * 280;
        const y = 95 + Math.floor(i / 2) * 170;
        const w = spiritWidth(s.kind);
        drawSpirit(ctx, s.kind, x, y, Math.min(0.9, 230 / w), 1, { phase, aim: -0.42 }, { ...style, time });
        ctx.fillStyle = '#bda98f';
        ctx.font = '12px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(s.label, x, y + 76);
      });
    };
    draw();
    // Huyền thoại có nhấp nháy/sương trôi theo thời gian → vẽ ~6 khung/giây, chỉ khi canvas đang trong tầm nhìn
    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting;
    });
    io.observe(c);
    const loop = () => {
      if (visible && document.visibilityState === 'visible') draw();
      timer = window.setTimeout(loop, 160);
    };
    if (style.eerie) timer = window.setTimeout(loop, 160);
    return () => {
      clearTimeout(timer);
      io.disconnect();
    };
  }, [phase, t]);
  return (
    <section className="card">
      <h2>Hồn quân — bậc {FX_TIERS.find((x) => x.id === t)?.name}</h2>
      <canvas ref={ref} className="spirit-gallery" style={{ width: '100%', maxWidth: 560, borderRadius: 10 }} />
      <input type="range" min={0} max={1} step={0.01} value={phase} onChange={(e) => setPhase(Number(e.target.value))} aria-label="Pha chuyển động" />
    </section>
  );
}

interface Shown {
  board: Int8Array;
  hidden: Uint8Array | null;
  lastMove: { from: number; to: number } | null;
  checkSquare: number | null;
  events: GameEvent[];
  hits: PatternHit[];
  mateId: string | null;
  stamp: number;
  label: string;
  error?: string;
}

export function runScenario(sc: Scenario): Omit<Shown, 'stamp' | 'label'> {
  const g = sc.jieqi ? Game.newJieqi() : new Game(sc.fen ?? INITIAL_FEN);
  const tracker = new PatternTracker();
  let events: GameEvent[] = [];
  let hits: PatternHit[] = [];
  for (const m of sc.moves) {
    const r = g.playIccs(m);
    if (!r.ok) throw new Error(`${sc.label}: nước ${m} không hợp lệ (${r.error})`);
    events = r.events;
    hits = tracker.afterMove(g);
  }
  const last = g.records[g.records.length - 1];
  return {
    board: g.pos.board.slice(),
    hidden: g.pos.hidden ? g.pos.hidden.slice() : null,
    lastMove: last ? { from: moveFrom(last.move), to: moveTo(last.move) } : null,
    checkSquare: g.inCheck() ? g.pos.kingSquare(g.pos.side) : null,
    events,
    hits,
    mateId: hits.find((h) => h.kind === 'mate')?.id ?? null,
  };
}

export function DevFxLab() {
  const settings = useSettings();
  const [skin, setSkin] = useState<BoardSkinId>(settings.boardSkin);
  const [pieceSet, setPieceSet] = useState<PieceSetId>(settings.pieceStyle);
  const [tier, setTier] = useState<FxTier>('legendary');
  const [flipped, setFlipped] = useState(false);
  const [auto, setAuto] = useState(false);
  const [tab, setTab] = useState<LabTab>('check');
  const [shown, setShown] = useState<Shown>(() => ({
    board: new Game().pos.board.slice(),
    hidden: null,
    lastMove: null,
    checkSquare: null,
    events: [],
    hits: [],
    mateId: null,
    stamp: 0,
    label: 'Chọn một tình huống',
  }));
  const wrapRef = useRef<HTMLDivElement>(null);

  // Hiệu ứng trong phòng thử luôn bật, dùng đúng bậc đang chọn
  useEffect(() => {
    const prev = { effects: settings.effects, fxTier: settings.fxTier };
    settings.update({ effects: true, fxTier: tier });
    return () => settings.update(prev);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier]);

  const play = (sc: Scenario) => {
    try {
      const r = runScenario(sc);
      setShown({ ...r, stamp: Date.now(), label: sc.label });
      playEvents(r.events, null);
    } catch (e) {
      setShown((s) => ({ ...s, error: (e as Error).message, label: sc.label }));
    }
  };

  const showPattern = (id: string) => {
    const def = PATTERNS.find((p) => p.id === id)!;
    const hit: PatternHit = { id: def.id, name: def.name, kind: def.kind, side: 'red', description: def.description };
    setShown((s) => ({
      ...s,
      events: [{ type: 'move', side: 'red', piece: 'cannon', from: 0, to: 0 }],
      hits: [hit.kind === 'mate' ? { ...hit, kind: 'opening' } : hit],
      mateId: null,
      stamp: Date.now(),
      label: `Banner: ${def.name}`,
      error: undefined,
    }));
  };

  // Chạy lần lượt mọi tình huống
  useEffect(() => {
    if (!auto) return;
    let i = 0;
    play(SCENARIOS[0]!);
    const id = setInterval(() => {
      i++;
      if (i >= SCENARIOS.length) {
        setAuto(false);
        return;
      }
      play(SCENARIOS[i]!);
    }, 3400);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto]);

  // ?all=1: hiện mọi mục cùng lúc, không dính bàn (dùng cho script kiểm thử tự động)
  const showAll = typeof location !== 'undefined' && new URLSearchParams(location.search).has('all');

  const scenarioButtons = (list: Scenario[]) => (
    <div className="controls">
      {list.map((s) => (
        <button key={s.id} className="btn small" data-scenario={s.id} onClick={() => play(s)}>
          {s.label}
        </button>
      ))}
    </div>
  );
  const show = (t: LabTab) => showAll || tab === t;

  return (
    <div className={`page dev-lab ${showAll ? 'all' : ''}`}>
      {/* Khối dính trên đầu: bàn cờ + bậc hiệu ứng + tab → bấm ở tab nào cũng thấy hiệu ứng */}
      <div className="lab-stage">
      <div className="board-wrap" ref={wrapRef}>
        <Board
          board={shown.board}
          hidden={shown.hidden}
          version={shown.stamp}
          flipped={flipped}
          interactive={false}
          lastMove={shown.lastMove}
          checkSquare={shown.checkSquare}
          skin={skin}
          pieceSet={pieceSet}
        />
        <EffectCanvas
          events={shown.events}
          stamp={shown.stamp}
          flipped={flipped}
          tier={tier}
          mateId={shown.mateId}
          patternStamp={shown.hits.some((h) => h.kind !== 'mate') ? shown.stamp : 0}
          pieceSet={pieceSet}
          containerRef={wrapRef}
        />
        <EffectBanner events={shown.events} stamp={shown.stamp} patterns={shown.hits} flipped={flipped} />
      </div>
      <div className="lab-bar">
        <div className="chips lab-tiers">
          {FX_TIERS.map((t) => (
            <button key={t.id} className={`chip ${tier === t.id ? 'on' : ''}`} onClick={() => setTier(t.id)}>
              {t.name}
            </button>
          ))}
        </div>
        <div className="status-line lab-status">
          {shown.label}
          {shown.mateId && <span className="accent"> — {shown.mateId}</span>}
          {shown.error && <span className="error-text"> {shown.error}</span>}
        </div>
      </div>
      {!showAll && (
        <div className="lab-tabs" role="tablist">
          {LAB_TABS.map(([id, name]) => (
            <button key={id} role="tab" aria-selected={tab === id} data-tab={id} className={`lab-tab ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)}>
              {name}
            </button>
          ))}
        </div>
      )}
      </div>

      {show('check') && <section className="card">{scenarioButtons(SCENARIOS.filter((s) => s.group === 'Chiếu tướng'))}</section>}
      {show('mate') && <section className="card">{scenarioButtons(SCENARIOS.filter((s) => s.group === 'Chiếu bí'))}</section>}
      {show('other') && (
        <section className="card">{scenarioButtons(SCENARIOS.filter((s) => s.group === 'Ăn quân' || s.group === 'Khác'))}</section>
      )}
      {show('pattern') && <section className="card">{scenarioButtons(SCENARIOS.filter((s) => s.group === 'Thế cờ'))}</section>}
      {show('banner') && (
        <section className="card" data-section="banner">
          <div className="controls">
            {PATTERNS.map((p) => (
              <button key={p.id} className={`btn small ${p.enabled ? '' : 'muted'}`} onClick={() => showPattern(p.id)}>
                {p.enabled ? '' : '⏳ '}
                {p.name}
              </button>
            ))}
          </div>
        </section>
      )}
      {show('spirit') && <SpiritGallery tier={tier} />}
      {show('sound') && (
        <section className="card">
          <div className="controls">
            {SOUNDS.map((k) => (
              <button key={k} className="btn small" onClick={() => (sfx[k] as () => void)()}>
                {k}
              </button>
            ))}
          </div>
        </section>
      )}

      {show('look') && (
      <section className="card">
        <label className="field-label">Bàn cờ</label>
        <div className="chips">
          {BOARD_SKINS.map((b) => (
            <button key={b.id} className={`chip ${skin === b.id ? 'on' : ''}`} onClick={() => setSkin(b.id)}>
              {b.name}
            </button>
          ))}
        </div>
        <label className="field-label">Bộ quân</label>
        <div className="chips">
          {PIECE_SETS.map((p) => (
            <button key={p.id} className={`chip ${pieceSet === p.id ? 'on' : ''}`} onClick={() => setPieceSet(p.id)}>
              {p.name}
            </button>
          ))}
        </div>
        <div className="controls">
          <button className="btn" onClick={() => setFlipped((f) => !f)}>
            ⇅ Xoay bàn
          </button>
          <button className={`btn ${auto ? 'danger' : 'primary'}`} onClick={() => setAuto((a) => !a)}>
            {auto ? '⏹ Dừng' : '▶ Chạy tất cả tình huống'}
          </button>
          <button className="btn" onClick={() => settings.update({ sound: !settings.sound })}>
            {settings.sound ? '🔊 Âm thanh: bật' : '🔇 Âm thanh: tắt'}
          </button>
        </div>
      </section>
      )}
    </div>
  );
}

type LabTab = 'check' | 'mate' | 'other' | 'pattern' | 'banner' | 'spirit' | 'sound' | 'look';
const LAB_TABS: [LabTab, string][] = [
  ['check', '⚔ Chiếu'],
  ['mate', '💀 Chiếu bí'],
  ['other', '💥 Ăn quân'],
  ['pattern', '🏯 Thế cờ'],
  ['banner', '🏷 Banner'],
  ['spirit', '👻 Hồn quân'],
  ['sound', '🔊 Âm thanh'],
  ['look', '🎨 Giao diện'],
];
