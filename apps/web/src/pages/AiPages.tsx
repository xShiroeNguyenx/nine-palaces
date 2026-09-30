import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LEVELS } from '@np/ai';
import { TIME_PRESETS } from '@np/shared';
import { LocalGameScreen, aiUndoLimit } from '../game/LocalGameScreen';
import { useProgress, winsNeededToUnlockNext } from '../lib/progress';

export function AiLevelsPage() {
  const navigate = useNavigate();
  const progress = useProgress((s) => s.progress);
  const [side, setSide] = useState<'red' | 'black' | 'random'>('red');
  const [preset, setPreset] = useState('none');

  const start = (level: number) => {
    const s = side === 'random' ? (Math.random() < 0.5 ? 'red' : 'black') : side;
    navigate(`/ai/play?level=${level}&side=${s}&tc=${encodeURIComponent(preset)}`);
  };

  return (
    <div className="page">
      <h1>Đánh với máy</h1>
      <p className="muted">Thắng cấp hiện tại để mở cấp tiếp theo. Từ cấp 7 cần thắng cấp trước 2 lần.</p>
      <div className="card inline-options">
        <div>
          <label className="field-label">Bạn cầm</label>
          <div className="chips">
            {(['red', 'black', 'random'] as const).map((s) => (
              <button key={s} className={`chip ${side === s ? 'on' : ''}`} onClick={() => setSide(s)}>
                {s === 'red' ? 'Đỏ (đi trước)' : s === 'black' ? 'Đen' : 'Ngẫu nhiên'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="field-label">Thời gian</label>
          <div className="chips">
            {TIME_PRESETS.map((p) => (
              <button key={p.id} className={`chip ${preset === p.id ? 'on' : ''}`} onClick={() => setPreset(p.id)}>
                {p.id === 'none' ? '∞' : p.id}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="level-grid">
        {LEVELS.map((l) => {
          const locked = l.level > progress.aiLevelUnlocked;
          const wins = progress.aiWins[String(l.level)] ?? 0;
          const need = winsNeededToUnlockNext(l.level);
          const isFrontier = l.level === progress.aiLevelUnlocked && l.level < LEVELS.length;
          return (
            <button key={l.level} className={`level-card ${locked ? 'locked' : ''}`} disabled={locked} onClick={() => start(l.level)}>
              <span className="level-no">{locked ? '🔒' : l.level}</span>
              <span className="level-name">{l.name}</span>
              <span className="muted small">~{l.estimatedElo} Elo · ↶ {aiUndoLimit(l.level)} lần</span>
              {!locked && <span className="small">Đã thắng: {wins}</span>}
              {isFrontier && <span className="small accent">Thắng {Math.max(0, need - wins)} ván để mở cấp {l.level + 1}</span>}
            </button>
          );
        })}
      </div>
      <p className="muted small">
        Máy chạy ngay trên thiết bị của bạn, không cần mạng. <Link to="/local">Chơi 2 người 1 máy</Link>
      </p>
    </div>
  );
}

export function AiGamePage() {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const progress = useProgress((s) => s.progress);
  const [gameKey, setGameKey] = useState(0);
  const level = Math.min(10, Math.max(1, Number(search.get('level') ?? 1) || 1));
  const side = search.get('side') === 'black' ? 'black' : 'red';
  const tcId = search.get('tc') ?? 'none';
  const tc = TIME_PRESETS.find((p) => p.id === tcId)?.tc ?? null;
  const fen = search.get('fen') ?? undefined;

  if (level > progress.aiLevelUnlocked) {
    return (
      <div className="page narrow center">
        <h1>🔒 Cấp {level} chưa mở</h1>
        <button className="btn primary" onClick={() => navigate('/ai')}>
          Chọn cấp khác
        </button>
      </div>
    );
  }
  return (
    <LocalGameScreen
      key={`${search.toString()}-${gameKey}`}
      mode="ai"
      aiLevel={level}
      humanSide={side}
      timeControl={tc}
      initialFen={fen}
      onNewGame={() => setGameKey((k) => k + 1)}
    />
  );
}
