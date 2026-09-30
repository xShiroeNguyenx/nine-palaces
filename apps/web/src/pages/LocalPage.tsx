import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Variant } from '@np/rules';
import { TIME_PRESETS } from '@np/shared';
import { LocalGameScreen } from '../game/LocalGameScreen';
import { useSettings } from '../lib/settings';

export function LocalPage() {
  const [search] = useSearchParams();
  const [preset, setPreset] = useState<string | null>(null);
  const [variant, setVariant] = useState<Variant>(search.get('variant') === 'jieqi' ? 'jieqi' : 'xiangqi');
  const [gameKey, setGameKey] = useState(0);
  const { autoFlipHotseat, update } = useSettings();

  if (preset === null) {
    return (
      <div className="page narrow">
        <h1>2 người 1 máy</h1>
        <section className="card">
          <label className="field-label">Loại cờ</label>
          <div className="chips">
            <button className={`chip ${variant === 'xiangqi' ? 'on' : ''}`} onClick={() => setVariant('xiangqi')}>
              Cờ tướng
            </button>
            <button className={`chip ${variant === 'jieqi' ? 'on' : ''}`} onClick={() => setVariant('jieqi')}>
              Cờ úp
            </button>
          </div>
          {variant === 'jieqi' && (
            <p className="muted small">
              Cờ úp: 15 quân mỗi bên (trừ Tướng) úp mặt và bị xáo trộn. Quân úp đi theo luật của vị trí đang đứng, đi xong thì lật lên và từ đó đi
              theo quân thật. Sĩ, Tượng đã lật được đi khắp bàn.
            </p>
          )}
          <label className="field-label">Thời gian mỗi bên</label>
          <div className="chips">
            {TIME_PRESETS.map((p) => (
              <button key={p.id} className="chip" onClick={() => setPreset(p.id)}>
                {p.label}
              </button>
            ))}
          </div>
          <label className="toggle">
            <input type="checkbox" checked={autoFlipHotseat} onChange={(e) => update({ autoFlipHotseat: e.target.checked })} />
            Tự xoay bàn theo lượt đi
          </label>
        </section>
      </div>
    );
  }

  const tc = TIME_PRESETS.find((p) => p.id === preset)!.tc;
  return (
    <LocalGameScreen key={`${variant}-${gameKey}`} mode="hotseat" variant={variant} timeControl={tc} onNewGame={() => setGameKey((k) => k + 1)} />
  );
}
