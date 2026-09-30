import { describeScore } from '@np/ai';
import { PIECE_BY_CODE, PIECE_VI } from '../board/pieces';
import { useSettings, type TrainingLevel } from '../lib/settings';
import { winColor, type EvalInfo, type TrainingApi } from './useTraining';
import { useT } from '../lib/i18n';

/** Thanh lợi thế (Luyện Trình): vạch mảnh cạnh bàn, phần đỏ = % thắng của Đỏ */
export function EvalBar({ info, flipped }: { info: EvalInfo | null; flipped: boolean }) {
  const pct = info ? info.redWinPercent : 50;
  const label = info ? `Lợi thế: Đỏ ${Math.round(pct)}% (${describeScore(info.redScore)})` : 'Đang tính lợi thế…';
  return (
    <div className={`eval-bar ${flipped ? 'flipped' : ''}`} title={label} role="img" aria-label={label}>
      <div className="eval-red" style={{ height: `${pct}%` }} />
    </div>
  );
}

export function TrainingToggle(props: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; note?: string }) {
  const t = useT();
  return (
    <label className={`toggle training-toggle ${props.disabled ? 'disabled' : ''}`}>
      <input type="checkbox" checked={props.on} disabled={props.disabled} onChange={(e) => props.onChange(e.target.checked)} />
      {t('🎓 Luyện Trình')} {props.note && <span className="muted small">({props.note})</span>}
    </label>
  );
}

export function TrainingPanel({ t, board }: { t: TrainingApi; board: Int8Array }) {
  const { trainingLevel, update } = useSettings();
  const tr = useT();
  if (!t.enabled) return null;
  const piece = t.square !== null ? board[t.square]! : 0;
  return (
    <div className="training-panel">
      <div className="training-head">
        <strong>{tr('🎓 Luyện Trình')}</strong>
        <div className="chips small-chips">
          {([1, 2, 3] as TrainingLevel[]).map((l) => (
            <button key={l} className={`chip ${trainingLevel === l ? 'on' : ''}`} onClick={() => update({ trainingLevel: l })}>
              {l === 1 ? '%' : l === 2 ? '% + nước' : '% + nước + giải thích'}
            </button>
          ))}
        </div>
      </div>
      {t.square === null && (
        <div className="muted small">{tr('Trỏ chuột hoặc chạm vào một quân của bên đang đi để xem các nước đi và % lợi thế.')}</div>
      )}
      {t.square !== null && piece !== 0 && (
        <div className="small">
          Quân: <strong>{PIECE_VI[PIECE_BY_CODE[Math.abs(piece)]!]}</strong>
          {t.loading && <span className="muted"> — đang tính…</span>}
        </div>
      )}
      {t.insights && t.insights.length === 0 && <div className="muted small">Quân này không có nước đi hợp lệ.</div>}
      {t.insights && t.insights.length > 0 && (
        <ol className="insight-list">
          {t.insights.map((ins, i) => (
            <li key={ins.iccs} className={i === 0 ? 'best' : ''}>
              <span className="ins-pct" style={{ background: winColor(ins.winPercent) }}>
                {Math.round(ins.winPercent)}%
              </span>
              <span className="ins-move">{ins.vi}</span>
              {trainingLevel >= 3 && <span className="ins-label">{ins.label}</span>}
              {trainingLevel >= 2 && i === 0 && (
                <div className="ins-pv muted small">
                  Diễn biến: {ins.pvVi.slice(0, 5).map((m, k) => `${k + 1}. ${m}`).join('  ')}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
