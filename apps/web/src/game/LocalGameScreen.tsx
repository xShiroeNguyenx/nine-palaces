import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  INITIAL_FEN,
  fromPgn,
  iccsToMove,
  moveFrom,
  moveTo,
  toPgn,
  type GameResult,
  type PlayResult,
  type Variant,
} from '@np/rules';
import { describeScore, levelConfig, LEVELS, type EngineMove } from '@np/ai';
import type { TimeControl } from '@np/shared';
import { Board, type BoardArrow } from '../board/Board';
import { AiClient } from '../ai/aiClient';
import { EffectCanvas } from '../effects/EffectCanvas';
import { useSettings } from '../lib/settings';
import { playEvents, sfx } from '../lib/sound';
import { resultText } from '../lib/format';
import { exportBoardImage } from '../lib/exportImage';
import { useProgress, type AiOutcome } from '../lib/progress';
import { EvalBar, TrainingPanel } from '../training/TrainingPanel';
import { useTraining } from '../training/useTraining';
import { useLocalGame, useTicker } from './useLocalGame';
import { useT } from '../lib/i18n';
import { usePatterns } from './usePatterns';
import { useLeaveGuard } from '../lib/leaveGuard';
import {
  ActLabel,
  ConfirmButton,
  EffectBanner,
  Modal,
  MoveAnnouncer,
  MoveStrip,
  PlayerBar,
  VictoryVideo,
  capturedBy,
  viewPosition,
} from './components';

export interface LocalGameScreenProps {
  mode: 'hotseat' | 'ai' | 'analysis';
  variant?: Variant;
  timeControl: TimeControl;
  aiLevel?: number;
  humanSide?: 'red' | 'black';
  /** Thế cờ bắt đầu (bàn phân tích / tải FEN) */
  initialFen?: string;
  onNewGame?: () => void;
}

/** Số lần đi lại khi đánh máy, giảm dần theo cấp (cấp 1 → 10) */
const AI_UNDO_BY_LEVEL = [20, 15, 12, 10, 8, 6, 5, 4, 3, 2];
export const aiUndoLimit = (level: number) => AI_UNDO_BY_LEVEL[Math.min(10, Math.max(1, level)) - 1]!;
const MIN_THINK_MS = 600;

export function LocalGameScreen(props: LocalGameScreenProps) {
  const { mode, timeControl } = props;
  const variant: Variant = props.variant ?? 'xiangqi';
  const humanSide = props.humanSide ?? 'red';
  const level = props.aiLevel ?? 1;
  const undoLimit = aiUndoLimit(level);
  const settings = useSettings();
  const t = useT();
  const navigate = useNavigate();
  const recordAiGame = useProgress((s) => s.recordAiGame);
  const grant = useProgress((s) => s.grant);

  const [result, setResult] = useState<GameResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [victory, setVictory] = useState<string | null>(null);
  const [aiOutcome, setAiOutcome] = useState<AiOutcome | null>(null);
  const [viewPly, setViewPly] = useState<number | null>(null);
  const [flipManual, setFlipManual] = useState(mode === 'ai' && humanSide === 'black');
  const [thinking, setThinking] = useState(false);
  const [hint, setHint] = useState<EngineMove | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [assists, setAssists] = useState({ hints: 0, undos: 0 });
  const [customStart, setCustomStart] = useState((props.initialFen ?? INITIAL_FEN) !== INITIAL_FEN);
  const [ioOpen, setIoOpen] = useState(false);
  const [trainingOn, setTrainingOn] = useState(mode === 'analysis');
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  const assistsRef = useRef(assists);
  assistsRef.current = assists;
  const customRef = useRef(customStart);
  customRef.current = customStart;
  const endedRef = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const mateIdRef = useRef<string | null>(null);
  const trainingUsedRef = useRef(false);

  const onEnd = useCallback(
    (r: GameResult) => {
      if (endedRef.current) return;
      endedRef.current = true;
      setResult(r);
      // Cờ úp 2 người: chơi xong có phân thắng thua → thành tựu "Lật bài ngửa"
      if (variant === 'jieqi' && r.winner !== 'draw') grant('co_up');
      // Thắng (2 người: bên nào thắng cũng là người; đánh máy: người thắng) → video chiến thắng trước popup
      const won = r.winner !== 'draw' && (mode === 'hotseat' || (mode === 'ai' && r.winner === humanSide));
      if (won) {
        const sub = mode === 'hotseat' ? (r.winner === 'red' ? 'Đỏ thắng' : 'Đen thắng') : 'Bạn đã thắng';
        // chờ màn chiếu bí (rồng, chữ tuyệt sát) chạy xong rồi mới chiếu video
        setTimeout(() => setVictory(sub), r.reason === 'checkmate' ? 3200 : 400);
      } else setTimeout(() => setShowResult(true), r.reason === 'checkmate' ? 1600 : 300);
      if (mode === 'ai' && !customRef.current) {
        const outcome = r.winner === 'draw' ? 'draw' : r.winner === humanSide ? 'win' : 'loss';
        const a = assistsRef.current;
        // chờ nhận diện sát cục (chạy sau nước đi) rồi mới ghi thành tựu
        setTimeout(() => {
          setAiOutcome(
            recordAiGame(level, outcome, a.hints > 0 || a.undos > 0 || trainingUsedRef.current, {
              mateId: r.winner === humanSide ? mateIdRef.current : null,
              reason: r.reason,
              variant,
            }),
          );
        }, 50);
      }
      if (r.reason !== 'checkmate') {
        if (r.winner === 'draw') sfx.draw();
        else if (mode !== 'ai' || r.winner === humanSide) sfx.win();
        else sfx.lose();
      }
    },
    [mode, humanSide, level, recordAiGame, variant],
  );

  const lg = useLocalGame(timeControl, onEnd, variant, props.initialFen ?? INITIAL_FEN);
  const game = lg.game;
  useTicker(!!timeControl && !result);

  const patterns = usePatterns(game, lg.version);
  mateIdRef.current = patterns.mateId;

  const trainingAllowed = variant === 'xiangqi';
  const training = useTraining(game, lg.version, trainingOn && trainingAllowed && viewPly === null);
  useEffect(() => {
    if (training.used) {
      trainingUsedRef.current = true;
      grant('hoc_tro');
    }
  }, [training.used, grant]);

  const aiRef = useRef<AiClient | null>(null);
  const aiJob = useRef(0);
  useEffect(() => {
    aiRef.current = new AiClient();
    return () => aiRef.current?.terminate();
  }, []);

  const afterPlay = useCallback(
    (r: PlayResult | null) => {
      if (!r) return;
      setHint(null);
      setViewPly(null);
      playEvents(r.events, mode === 'ai' ? humanSide : null);
    },
    [mode, humanSide],
  );

  const aiTurn = mode === 'ai' && !game.result && game.turn !== humanSide;

  // Lượt của máy
  useEffect(() => {
    if (!aiTurn || !aiRef.current) return;
    const job = ++aiJob.current;
    setThinking(true);
    const started = Date.now();
    const plyAtStart = game.ply;
    aiRef.current.move(game.startFen, game.movesIccs(), level).then((m) => {
      const wait = Math.max(0, MIN_THINK_MS - (Date.now() - started));
      setTimeout(() => {
        if (job !== aiJob.current) return;
        setThinking(false);
        if (!m || game.ply !== plyAtStart || game.result) return;
        const mv = iccsToMove(m.iccs);
        afterPlay(lg.play(moveFrom(mv), moveTo(mv)));
      }, wait);
    });
    return () => {
      aiJob.current++;
      setThinking(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiTurn, lg.version]);

  const flipped = mode === 'hotseat' && settings.autoFlipHotseat ? game.turn === 'black' : flipManual;

  const canSelect = useCallback(
    (sq: number) => {
      if (game.result || viewPly !== null) return false;
      const p = game.pos.board[sq]!;
      if (p === 0) return false;
      const side = p > 0 ? 'red' : 'black';
      if (side !== game.turn) return false;
      if (mode === 'ai' && side !== humanSide) return false;
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game, viewPly, mode, humanSide, lg.version],
  );

  const targetsFor = useCallback(
    (sq: number) => game.legalMovesFrom(sq).map(moveTo),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game, lg.version],
  );

  const onMove = (from: number, to: number) => {
    const r = lg.play(from, to);
    if (!r) sfx.illegal();
    afterPlay(r);
  };

  const undo = () => {
    if (mode === 'ai') {
      if (assists.undos >= undoLimit || thinking) return;
      const last = game.records[game.records.length - 1];
      if (!last) return;
      const n = last.side === humanSide ? 1 : 2;
      lg.undo(Math.min(n, game.ply));
      setAssists((a) => ({ ...a, undos: a.undos + 1 }));
    } else {
      lg.undo(1);
    }
    endedRef.current = false;
    setResult(null);
    setHint(null);
    setViewPly(null);
  };

  const askHint = async () => {
    if (!aiRef.current || game.result || hintLoading || variant !== 'xiangqi') return;
    setHintLoading(true);
    const h = await aiRef.current.hint(game.startFen, game.movesIccs(), 1200);
    setHintLoading(false);
    if (h) {
      setHint(h);
      setAssists((a) => ({ ...a, hints: a.hints + 1 }));
    }
  };

  const newGame = (fen = props.initialFen ?? INITIAL_FEN, moves: string[] = []) => {
    endedRef.current = false;
    trainingUsedRef.current = false;
    setResult(null);
    setShowResult(false);
    setVictory(null);
    setAiOutcome(null);
    setViewPly(null);
    setHint(null);
    setAssists({ hints: 0, undos: 0 });
    setCustomStart(fen !== INITIAL_FEN || moves.length > 0);
    lg.restart(fen, moves);
    sfx.start();
  };

  const resign = () => {
    const loser = mode === 'ai' ? humanSide : game.turn;
    lg.end({ winner: loser === 'red' ? 'black' : 'red', reason: 'resign' });
  };

  const doExport = async () => {
    const r = await exportBoardImage(wrapRef.current?.querySelector('.board-stack') ?? null, `cuu-cung-${Date.now()}`);
    setExportMsg(r === 'failed' ? 'Không xuất được ảnh' : r === 'shared' ? 'Đã chia sẻ ảnh' : 'Đã tải ảnh về máy');
    setTimeout(() => setExportMsg(null), 2500);
  };

  const openReview = () => {
    grant('phan_tich');
    navigate('/review', {
      state: {
        startFen: game.startFen,
        moves: game.movesIccs(),
        red: nameOf('red'),
        black: nameOf('black'),
        // Đánh máy: tách sai lầm của người chơi và của máy
        you: mode === 'ai' ? humanSide : undefined,
        opponent: mode === 'ai' ? 'Máy' : undefined,
      },
    });
  };

  // Thế cờ hiển thị
  const shown = useMemo(
    () => viewPosition(game, viewPly),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [viewPly, lg.version],
  );
  const shownPly = viewPly ?? game.ply;
  const lastRec = shownPly > 0 ? game.records[shownPly - 1] : undefined;
  const lastMove = lastRec ? { from: moveFrom(lastRec.move), to: moveTo(lastRec.move) } : null;
  const checkSquare = viewPly === null && game.inCheck() ? game.pos.kingSquare(game.pos.side) : null;
  const captureEv = lg.lastEvents.find((e) => e.type === 'capture');
  const flash = viewPly === null && captureEv && captureEv.type === 'capture' ? { at: captureEv.at, key: lg.version } : null;

  const arrows: BoardArrow[] = [...training.arrows];
  if (hint && viewPly === null) {
    hint.pv.slice(0, 3).forEach((iccs, i) => {
      const m = iccsToMove(iccs);
      arrows.push({
        from: moveFrom(m),
        to: moveTo(m),
        color: i % 2 === 0 ? 'rgba(20,140,60,0.85)' : 'rgba(200,60,40,0.6)',
        label: i === 0 ? undefined : String(i + 1),
      });
    });
  }

  const top: 'red' | 'black' = flipped ? 'red' : 'black';
  const bottom: 'red' | 'black' = flipped ? 'black' : 'red';
  function nameOf(side: 'red' | 'black') {
    if (mode === 'ai') return side === humanSide ? t('Bạn') : `${t('Máy')} — ${levelConfig(level).name}`;
    return side === 'red' ? t('Bên Đỏ') : t('Bên Đen');
  }
  // Ván chưa được lưu: rời giữa chừng thì hỏi xác nhận
  useLeaveGuard(!result && game.ply > 0 && mode !== 'analysis', t('Ván đang chơi dở sẽ bị mất nếu bạn rời đi.'));

  const perspective = mode === 'ai' ? humanSide : null;
  const rt = result ? resultText(result, perspective) : null;
  const showEval = training.enabled && settings.evalBar;

  const bar = (side: 'red' | 'black') => (
    <PlayerBar
      side={side}
      name={nameOf(side)}
      clockMs={lg.remaining(side)}
      active={!result && game.turn === side}
      captured={capturedBy(game.records, side, shownPly)}
      sub={mode === 'ai' && side !== humanSide && thinking ? <span className="thinking">{t('đang nghĩ…')}</span> : undefined}
    />
  );

  return (
    <div className="game-layout">
      <div className="board-column">
        {bar(top)}
        <div className={`board-row ${showEval ? 'with-eval' : ''}`}>
          {showEval && <EvalBar info={training.evalInfo} flipped={flipped} />}
          <div className="board-wrap" ref={wrapRef}>
            <Board
              board={shown.board}
              hidden={shown.hidden}
              version={lg.version * 1000 + (viewPly ?? 999)}
              flipped={flipped}
              interactive={!result && viewPly === null && !aiTurn}
              canSelect={canSelect}
              targetsFor={targetsFor}
              onMove={onMove}
              lastMove={lastMove}
              checkSquare={checkSquare}
              arrows={arrows}
              flash={flash}
              badges={training.badges}
              onInspect={training.enabled ? training.inspect : undefined}
            />
            <EffectCanvas
              events={viewPly === null ? lg.lastEvents : []}
              stamp={lg.version}
              flipped={flipped}
              mateId={patterns.mateId}
              patternStamp={patterns.hits.some((h) => h.kind !== 'mate') ? patterns.stamp : 0}
              containerRef={wrapRef}
            />
            <EffectBanner events={lg.lastEvents} stamp={lg.version} patterns={patterns.hits} flipped={flipped} />
            <VictoryVideo
              open={!!victory}
              sub={victory ?? undefined}
              onDone={() => {
                setVictory(null);
                setShowResult(true);
              }}
            />
            {game.perpetualWarning && viewPly === null && !result && (
              <div className="perpetual-warning">
                ⚠ {game.perpetualWarning.side === 'red' ? 'Đỏ' : 'Đen'} đang chiếu mãi ({game.perpetualWarning.count}/3) — lặp lại sẽ bị
                xử thua
              </div>
            )}
          </div>
        </div>
        {bar(bottom)}
        <MoveAnnouncer record={game.records[game.records.length - 1]} />

        {/* Thanh công cụ nhỏ ngay dưới bàn: việc hay dùng; việc ít dùng nằm trong "Thêm" */}
        <div className="toolbar" role="toolbar" aria-label={t('Nước đi')}>
          {variant === 'xiangqi' && (
            <button className="tool" onClick={askHint} disabled={!!result || aiTurn || hintLoading}>
              <ActLabel text={hintLoading ? '⏳ …' : t('💡 Gợi ý')} />
            </button>
          )}
          <button
            className="tool"
            onClick={undo}
            disabled={game.ply === 0 || thinking || (mode === 'ai' && assists.undos >= undoLimit)}
          >
            <ActLabel text={`${t('↶ Đi lại')}${mode === 'ai' ? ` ${undoLimit - assists.undos}` : ''}`} />
          </button>
          <ConfirmButton
            className="tool"
            label={t('⟳ Ván mới')}
            confirmLabel={`⟳ ${t('Chắc chắn?')}`}
            onConfirm={() => (props.onNewGame ? props.onNewGame() : newGame())}
          />
          <button className="tool" onClick={() => setFlipManual((f) => !f)}>
            <ActLabel text={t('⇅ Xoay bàn')} />
          </button>
          {trainingAllowed && (
            <button
              className={`tool ${trainingOn ? 'on' : ''}`}
              aria-pressed={trainingOn}
              onClick={() => setTrainingOn(!trainingOn)}
              title={mode === 'ai' ? 'Luyện Trình: dùng sẽ tính là có trợ giúp' : 'Luyện Trình'}
            >
              <ActLabel text={`🎓 ${t('Luyện')}`} />
            </button>
          )}
          <button className="tool" onClick={() => setMoreOpen(true)} aria-haspopup="dialog">
            <ActLabel text={`⋯ ${t('Thêm')}`} />
          </button>
        </div>

        <MoveStrip records={game.records} viewPly={viewPly} setViewPly={setViewPly} />
      </div>

      <aside className="side-panel">
        {(result || variant === 'jieqi' || mode === 'analysis') && (
          <div className="status-line">
            {variant === 'jieqi' && <span className="variant-tag">{t('Cờ úp')}</span>}
            {mode === 'analysis' && <span className="variant-tag">{t('Phân tích')}</span>}
            {result && rt && (
              <strong>
                {rt.title} — {rt.detail}
              </strong>
            )}
          </div>
        )}

        {hint && (
          <div className="hint-box">
            <div>
              Gợi ý: <strong>{hint.vi}</strong> <span className="muted">({describeScore(hint.score)})</span>
            </div>
            <div className="muted small">Diễn biến dự kiến: {hint.pvVi.slice(0, 5).join(' → ')}</div>
          </div>
        )}
        <TrainingPanel t={training} board={game.pos.board} />

        {exportMsg && <div className="muted small">{exportMsg}</div>}
        {mode === 'ai' && (assists.hints > 0 || assists.undos > 0 || training.used) && (
          <div className="muted small">Đã dùng trợ giúp: XP của ván này giảm một nửa.</div>
        )}
        {customStart && mode === 'ai' && <div className="muted small">Ván bắt đầu từ thế cờ tự nhập: không tính tiến trình.</div>}
      </aside>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title={t('Thêm')}>
        <div className="actions" onClick={(e) => (e.target as HTMLElement).closest('a,[data-close]') && setMoreOpen(false)}>
          {mode !== 'ai' && !result && (
            <ConfirmButton label={t('🤝 Hòa')} confirmLabel={`🤝 ${t('Xác nhận hòa?')}`} onConfirm={() => { setMoreOpen(false); lg.end({ winner: 'draw', reason: 'draw_agreed' }); }} />
          )}
          {!result && mode !== 'analysis' && (
            <ConfirmButton
              label={mode === 'hotseat' ? `🏳 ${game.turn === 'red' ? t('Đỏ') : t('Đen')} ${t('đầu hàng')}` : t('🏳 Đầu hàng')}
              confirmLabel={`🏳 ${t('Chắc chắn?')}`}
              onConfirm={() => {
                setMoreOpen(false);
                resign();
              }}
            />
          )}
          {variant === 'xiangqi' && (
            <button className="btn" data-close onClick={() => setIoOpen(true)}>
              <ActLabel text={t('💾 Lưu / Tải')} />
            </button>
          )}
          <button className="btn" data-close onClick={doExport}>
            <ActLabel text={t('📷 Ảnh thế cờ')} />
          </button>
          {variant === 'xiangqi' && game.ply > 0 && (
            <button className="btn" data-close onClick={openReview}>
              <ActLabel text={t('📈 Phân tích ván')} />
            </button>
          )}
          {mode === 'analysis' && (
            <Link className="btn" to={`/ai/play?level=${Math.min(10, useProgress.getState().progress.aiLevelUnlocked)}&side=${game.turn}&fen=${encodeURIComponent(game.fen())}`}>
              <ActLabel text="🤖 Đánh máy từ thế này" />
            </Link>
          )}
        </div>
      </Modal>

      <Modal open={showResult && !!rt} onClose={() => setShowResult(false)} title={rt?.title}>
        <p className="result-detail">
          {rt?.detail}
          {patterns.mateId && result?.reason === 'checkmate' && ` — ${patterns.hits.find((h) => h.kind === 'mate')?.name ?? ''}`}
        </p>
        {aiOutcome && (
          <div className="result-rewards">
            <div>+{aiOutcome.xpGained} XP</div>
            {aiOutcome.unlockedLevel && (
              <div className="unlock">
                🔓 Mở khóa cấp {aiOutcome.unlockedLevel}: {LEVELS[aiOutcome.unlockedLevel - 1]!.name}
              </div>
            )}
          </div>
        )}
        <div className="modal-actions">
          <button className="btn primary" onClick={() => (props.onNewGame ? props.onNewGame() : newGame())}>
            {t('Ván mới')}
          </button>
          <button className="btn" onClick={() => setShowResult(false)}>
            {t('Xem lại ván')}
          </button>
          {variant === 'xiangqi' && game.ply > 0 && (
            <button className="btn" onClick={openReview}>
              📈 Phân tích ván
            </button>
          )}
          {aiOutcome?.unlockedLevel && (
            <Link className="btn" to={`/ai/play?level=${aiOutcome.unlockedLevel}&side=${humanSide}`}>
              Đánh cấp {aiOutcome.unlockedLevel}
            </Link>
          )}
        </div>
      </Modal>

      <SaveLoadModal
        open={ioOpen}
        onClose={() => setIoOpen(false)}
        fen={game.fen()}
        pgn={toPgn(game, { Red: nameOf('red'), Black: nameOf('black') })}
        onLoad={(fen, moves) => {
          setIoOpen(false);
          newGame(fen, moves);
        }}
      />
    </div>
  );
}

function SaveLoadModal(props: {
  open: boolean;
  onClose: () => void;
  fen: string;
  pgn: string;
  onLoad: (fen: string, moves: string[]) => void;
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied('Không sao chép được, hãy chọn và copy thủ công');
    }
  };
  const load = () => {
    setError(null);
    const t = text.trim();
    try {
      if (t.includes('[') || /\d+\.\s/.test(t)) {
        const g = fromPgn(t);
        props.onLoad(g.startFen, g.movesIccs());
      } else {
        fromPgn(`[FEN "${t}"]`);
        props.onLoad(t, []);
      }
      setText('');
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <Modal open={props.open} onClose={props.onClose} title="Lưu / Tải ván cờ" wide>
      <label className="field-label">FEN thế cờ hiện tại</label>
      <div className="copy-row">
        <code className="code-box">{props.fen}</code>
        <button className="btn small" onClick={() => copy('Đã sao chép FEN', props.fen)}>
          Sao chép
        </button>
      </div>
      <label className="field-label">PGN cả ván</label>
      <div className="copy-row">
        <pre className="code-box pre">{props.pgn}</pre>
        <button className="btn small" onClick={() => copy('Đã sao chép PGN', props.pgn)}>
          Sao chép
        </button>
      </div>
      {copied && <div className="muted small">{copied}</div>}
      <label className="field-label">Dán FEN hoặc PGN để tải</label>
      <textarea className="textarea" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="rnbakabnr/9/1c5c1/... w - - 0 1" />
      {error && <div className="error-text">{error}</div>}
      <div className="modal-actions">
        <button className="btn primary" onClick={load} disabled={!text.trim()}>
          Tải ván
        </button>
      </div>
    </Modal>
  );
}
