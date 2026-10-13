import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Position, INITIAL_FEN, iccsToSquare, type GameEvent } from '@np/rules';
import { PATTERNS, type PatternKind } from '@np/patterns';
import { Board } from '../board/Board';
import { EffectCanvas } from '../effects/EffectCanvas';
import { EffectBanner } from '../game/components';
import {
  ACHIEVEMENTS,
  BOARD_SKINS,
  CHECK_CALLS,
  FRAMES,
  FX_TIERS,
  MOVE_SOUNDS,
  PIECE_SETS,
  isUnlocked,
  type FxTier,
  type UnlockItem,
} from '../lib/cosmetics';
import { ONLINE_ENABLED } from '../lib/config';
import { useProgress } from '../lib/progress';
import { api } from '../lib/session';
import { useSettings } from '../lib/settings';
import { useT } from '../lib/i18n';
import { MOVE_SOUND } from '../lib/sound';
import { TitleFrame } from '../game/economyUi';
import { GachaTab } from './GachaTab';

type Tab = 'gacha' | 'boards' | 'pieces' | 'fx' | 'extras' | 'achievements' | 'patterns';

const START = Position.fromFen(INITIAL_FEN).board;

export function CollectionPage() {
  const progress = useProgress((s) => s.progress);
  const s = useSettings();
  const t = useT();
  // Tab nằm trên URL (?tab=gacha) để huy hiệu xu trên thanh điều hướng mở thẳng Bảo Khố
  const [search, setSearch] = useSearchParams();
  const tabs: [Tab, string][] = [
    ...(s.gacha ? ([['gacha', '🧧 ' + t('Bảo Khố')]] as [Tab, string][]) : []),
    ['boards', t('Bàn cờ')],
    ['pieces', t('Quân cờ')],
    ['fx', t('Hiệu ứng')],
    ['extras', t('Phụ kiện')],
    ['achievements', t('Thành tựu')],
    ['patterns', t('Thế cờ')],
  ];
  const asked = search.get('tab') as Tab | null;
  const tab: Tab = asked && tabs.some(([id]) => id === asked) ? asked : 'boards';
  const setTab = (id: Tab) => setSearch(id === 'boards' ? {} : { tab: id }, { replace: true });
  return (
    <div className="page">
      <h1>{t('Bộ sưu tập')}</h1>
      <p className="muted small">
        Trận thắng tính mở khóa: <strong>{progress.unlockWins}</strong> ({ONLINE_ENABLED ? 'mọi ván thắng máy, hoặc thắng online' : 'mọi ván thắng máy'}).
      </p>
      <div className="chips" role="tablist">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={`chip ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'boards' && (
        <ItemGrid
          items={BOARD_SKINS}
          selected={s.boardSkin}
          onSelect={(id) => s.update({ boardSkin: id })}
          render={(id) => <Board board={START} version={0} interactive={false} preview skin={id} ariaLabel="Xem trước bàn cờ" />}
        />
      )}
      {tab === 'pieces' && (
        <ItemGrid
          items={PIECE_SETS}
          selected={s.pieceStyle}
          onSelect={(id) => s.update({ pieceStyle: id })}
          render={(id) => <Board board={START} version={0} interactive={false} preview pieceSet={id} ariaLabel="Xem trước bộ quân" />}
        />
      )}
      {tab === 'fx' && <FxTab />}
      {tab === 'gacha' && <GachaTab />}
      {tab === 'extras' && (
        <>
          <h2>{t('Khung danh hiệu')}</h2>
          <ItemGrid items={FRAMES} selected={s.frame} onSelect={(id) => s.update({ frame: id })} render={(id) => <div className="extra-preview"><TitleFrame frame={id}>{t('Kỳ thủ')}</TitleFrame></div>} />
          <h2>{t('Lời chiếu tướng')}</h2>
          <ItemGrid items={CHECK_CALLS} selected={s.checkCall} onSelect={(id) => s.update({ checkCall: id })} render={(id) => <div className="extra-preview"><span className="gacha-call">{CHECK_CALLS.find((c) => c.id === id)!.name}</span></div>} />
          <h2>{t('Âm quân')}</h2>
          <ItemGrid
            items={MOVE_SOUNDS}
            selected={s.moveSound}
            onSelect={(id) => s.update({ moveSound: id })}
            render={(id) => (
              <div className="extra-preview">
                <button className="btn small" onClick={() => MOVE_SOUND[id]()}>
                  🔊 {t('Nghe thử')}
                </button>
              </div>
            )}
          />
        </>
      )}
      {tab === 'achievements' && (
        <div className="room-list">
          {ACHIEVEMENTS.map((a) => {
            const done = progress.achievements.includes(a.id);
            return (
              <div key={a.id} className={`room-row ${done ? '' : 'locked-row'}`}>
                <div className="room-players">
                  {done ? '🏆' : '🔒'} {a.name}
                </div>
                <div className="muted small">
                  {a.description}
                  {a.reward && ` — Thưởng: ${a.reward}`}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {tab === 'patterns' && <PatternsTab />}
    </div>
  );
}

function ItemGrid<T extends string>(props: {
  items: UnlockItem<T>[];
  selected: string;
  onSelect: (id: T) => void;
  render: (id: T) => JSX.Element;
}) {
  const progress = useProgress((s) => s.progress);
  const unlockAll = useSettings((s) => s.unlockAll);
  const gacha = useSettings((s) => s.gacha);
  return (
    <div className="item-grid">
      {props.items.map((it) => {
        const open = isUnlocked(it, progress, unlockAll);
        const active = props.selected === it.id;
        return (
          <div key={it.id} className={`item-card ${open ? '' : 'locked'} ${active ? 'active' : ''}`}>
            <div className="item-preview">{props.render(it.id)}</div>
            <div className="item-name">
              {open ? '' : '🔒 '}
              {it.name}
            </div>
            <div className="muted small">{it.description}</div>
            {open ? (
              <button className={`btn small ${active ? 'primary' : ''}`} onClick={() => props.onSelect(it.id)} disabled={active}>
                {active ? 'Đang dùng' : 'Dùng'}
              </button>
            ) : (
              <div className="small accent">
                {Number.isFinite(it.wins) ? (
                  <>
                    Cần {it.wins} trận thắng{it.achievement ? ' hoặc thành tựu' : ''} (còn {Math.max(0, it.wins - progress.unlockWins)})
                    {gacha && ' · hoặc tìm trong Bảo Khố'}
                  </>
                ) : (
                  'Chỉ có trong Bảo Khố'
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Xem thử hiệu ứng: chiếu bằng từng loại quân và chiếu bí */
function FxTab() {
  const progress = useProgress((s) => s.progress);
  const s = useSettings();
  const [demo, setDemo] = useState<{ events: GameEvent[]; stamp: number; tier: FxTier }>({ events: [], stamp: 0, tier: s.fxTier });
  const wrapRef = useRef<HTMLDivElement>(null);
  const board = useMemo(() => Position.fromFen('3k5/9/9/9/4R4/9/4C4/2N6/4P4/4K4 w - - 0 1').board, []);
  const king = iccsToSquare('d9');
  const play = (kind: 'chariot' | 'horse' | 'cannon' | 'soldier' | 'mate', tier: FxTier) => {
    const checkers: Record<string, number> = {
      chariot: iccsToSquare('e5'),
      horse: iccsToSquare('c2'),
      cannon: iccsToSquare('e3'),
      soldier: iccsToSquare('e1'),
      mate: iccsToSquare('e5'),
    };
    const by = kind === 'mate' ? 'chariot' : kind;
    const events: GameEvent[] = [
      { type: 'check', side: 'red', by: [by], checkers: [checkers[kind]!], kingSquare: king, double: false },
    ];
    if (kind === 'mate') {
      events.push({ type: 'checkmate', side: 'red', by: ['chariot'] });
      events.push({ type: 'capture', side: 'red', piece: 'chariot', at: iccsToSquare('d8') });
    }
    setDemo({ events, stamp: Date.now(), tier });
  };
  return (
    <div className="fx-tab">
      <div className="item-grid">
        {FX_TIERS.map((t) => {
          const open = isUnlocked(t, progress, s.unlockAll);
          const active = s.fxTier === t.id;
          return (
            <div key={t.id} className={`item-card ${open ? '' : 'locked'} ${active ? 'active' : ''}`}>
              <div className="item-name">
                {open ? '✨' : '🔒'} {t.name}
              </div>
              <div className="muted small">{t.description}</div>
              <div className="controls">
                <button className="btn small" onClick={() => play('mate', t.id)}>
                  Xem thử
                </button>
                {open && (
                  <button className={`btn small ${active ? 'primary' : ''}`} disabled={active} onClick={() => s.update({ fxTier: t.id })}>
                    {active ? 'Đang dùng' : 'Dùng'}
                  </button>
                )}
              </div>
              {!open && (
                <div className="small accent">
                  Cần {t.wins} trận thắng{t.achievement ? ' hoặc thành tựu Bất bại' : ''}
                  {s.gacha && ' · hoặc tìm trong Bảo Khố'}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <h2>Xem thử theo quân chiếu</h2>
      <div className="controls">
        {(['chariot', 'horse', 'cannon', 'soldier', 'mate'] as const).map((k) => (
          <button key={k} className="btn small" onClick={() => play(k, demo.tier)}>
            {k === 'chariot' ? 'Xe chiếu' : k === 'horse' ? 'Mã chiếu' : k === 'cannon' ? 'Pháo chiếu' : k === 'soldier' ? 'Tốt chiếu' : 'Chiếu bí'}
          </button>
        ))}
      </div>
      <div className="demo-board">
        <div className="board-wrap" ref={wrapRef}>
          <Board board={board} version={0} interactive={false} checkSquare={demo.events.length ? king : null} />
          <EffectCanvas events={demo.events} stamp={demo.stamp} flipped={false} tier={demo.tier} containerRef={wrapRef} />
          <EffectBanner events={demo.events} stamp={demo.stamp} />
        </div>
      </div>
    </div>
  );
}

function PatternsTab() {
  const seen = useProgress((s) => s.seenPatterns);
  const [reported, setReported] = useState<Record<string, boolean>>({});
  const groups: [PatternKind, string][] = [
    ['opening', 'Khai cuộc'],
    ['shape', 'Thế hình quân'],
    ['mate', 'Sát cục'],
  ];
  const report = async (id: string) => {
    setReported((r) => ({ ...r, [id]: true }));
    try {
      await api('/api/feedback', { method: 'POST', body: JSON.stringify({ kind: 'pattern', subject: id, note: 'Nhận diện sai' }) });
    } catch {
      /* offline: bỏ qua */
    }
  };
  const total = PATTERNS.filter((p) => p.enabled).length;
  return (
    <div>
      <p className="muted small">
        Đã gặp {Object.keys(seen).length}/{total} thế cờ. Thế có dấu ⏳ đang chờ kiểm chứng nên chưa được nhận diện tự động.
      </p>
      {groups.map(([kind, label]) => (
        <section key={kind}>
          <h2>{label}</h2>
          <div className="room-list">
            {PATTERNS.filter((p) => p.kind === kind).map((p) => (
              <div key={p.id} className={`room-row ${seen[p.id] ? '' : 'locked-row'}`}>
                <div className="room-players">
                  {!p.enabled ? '⏳' : seen[p.id] ? '🏯' : '·'} {p.name}
                  {seen[p.id] ? <span className="elo-tag">×{seen[p.id]}</span> : null}
                </div>
                <div className="muted small">{p.description}</div>
                {seen[p.id] && (
                  <div>
                    <button className="btn small" disabled={reported[p.id]} onClick={() => report(p.id)}>
                      {reported[p.id] ? 'Đã gửi, cảm ơn!' : 'Báo nhận diện sai'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
