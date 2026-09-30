import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { encodeMove, moveFrom, moveTo, squareToIccs, type Side } from '@np/rules';
import { EMOTES, type ChatMessage, type RoomState } from '@np/shared';
import { Board } from '../board/Board';
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
} from '../game/components';
import { EffectCanvas } from '../effects/EffectCanvas';
import { useTicker } from '../game/useLocalGame';
import { usePatterns } from '../game/usePatterns';
import { formatTimeControl, resultText, SIDE_VI } from '../lib/format';
import { exportBoardImage } from '../lib/exportImage';
import { refreshMe } from '../lib/session';
import { useSettings } from '../lib/settings';
import { useProgress } from '../lib/progress';
import { sfx } from '../lib/sound';
import { EvalBar, TrainingPanel } from '../training/TrainingPanel';
import { useTraining } from '../training/useTraining';
import { useRoom } from './useRoom';
import { useT } from '../lib/i18n';
import { SharePanel } from './qr';

export function RoomPage() {
  const params = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const code = (params.code ?? '').toUpperCase();
  const key = search.get('k');
  const asSpectator = search.get('as') === 'spectator';
  const room = useRoom(code, key, asSpectator);
  const { state, game } = room;
  const settings = useSettings();
  const t = useT();
  const recordFacts = useProgress((s) => s.recordFacts);
  const grant = useProgress((s) => s.grant);

  const [viewPly, setViewPly] = useState<number | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [victory, setVictory] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [flipOverride, setFlipOverride] = useState(false);
  const [premove, setPremove] = useState<{ from: number; to: number } | null>(null);
  const [trainingOn, setTrainingOn] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const lastResultKey = useRef<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const patterns = usePatterns(game, room.version);
  const mateRef = useRef<string | null>(null);
  mateRef.current = patterns.mateId;

  useTicker(state?.status === 'playing' && !!state.clock);

  const you = state?.you ?? 'spectator';
  const isPlayer = you !== 'spectator';
  const variant = state?.settings.variant ?? 'xiangqi';
  // Luyện Trình: ván giao hữu có bật (cả hai đồng ý khi vào phòng) hoặc khán giả (chỉ cho riêng mình)
  const trainingAllowed = variant === 'xiangqi' && !!state && (isPlayer ? state.settings.training && !state.settings.rated : true);
  const training = useTraining(game, room.version, trainingOn && trainingAllowed && viewPly === null);

  useEffect(() => {
    if (training.used) grant('hoc_tro');
  }, [training.used, grant]);

  useEffect(() => {
    if (!state?.result) return;
    const k = `${state.gameNo}`;
    if (lastResultKey.current !== k) {
      lastResultKey.current = k;
      setPremove(null);
      // Người chơi thắng → video chiến thắng trước popup
      if (isPlayer && state.result.winner === you) setTimeout(() => setVictory(true), state.result.reason === 'checkmate' ? 3200 : 400);
      else setTimeout(() => setResultOpen(true), state.result.reason === 'checkmate' ? 1600 : 300);
      void refreshMe();
      if (isPlayer && state.status === 'ended' && (state.moves.length ?? 0) >= 2) {
        const outcome = state.result.winner === 'draw' ? 'draw' : state.result.winner === you ? 'win' : 'loss';
        setTimeout(() => recordFacts({ outcome, mateId: outcome === 'win' ? mateRef.current : null, reason: state.result!.reason, variant, online: true }), 60);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.result, state?.gameNo]);

  useEffect(() => setViewPly(null), [state?.moves.length]);

  // Đi trước (premove): tới lượt mình thì tự đi nếu vẫn hợp lệ
  useEffect(() => {
    if (!premove || !game || !state || state.status !== 'playing' || game.turn !== you) return;
    const legal = game.legalMovesFrom(premove.from).includes(encodeMove(premove.from, premove.to));
    const pm = premove;
    setPremove(null);
    if (legal) room.move(squareToIccs(pm.from) + squareToIccs(pm.to));
    else sfx.illegal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.version]);

  const flipped = (you === 'black') !== flipOverride;
  const myTurn = !!game && game.turn === you;
  const canPremove = settings.premove && variant === 'xiangqi';

  const canSelect = useCallback(
    (sq: number) => {
      if (!game || !state || state.status !== 'playing' || viewPly !== null) return false;
      const p = game.pos.board[sq]!;
      if (p === 0) return false;
      const side = p > 0 ? 'red' : 'black';
      if (!isPlayer) return trainingOn && side === game.turn; // khán giả chỉ xem phân tích
      if (side !== you) return false;
      return game.turn === you || canPremove;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game, state?.status, isPlayer, you, viewPly, room.version, canPremove, trainingOn],
  );

  const targetsFor = useCallback(
    (sq: number) => {
      if (!game) return [];
      if (isPlayer && game.turn !== you) {
        // Tính nước đi trước: coi như tới lượt mình
        const pos = game.pos.clone();
        pos.side = (you === 'red' ? 1 : -1) as Side;
        return pos.legalMovesFrom(sq).map(moveTo);
      }
      return game.legalMovesFrom(sq).map(moveTo);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game, room.version, isPlayer, you],
  );

  const shown = useMemo(
    () => (game ? viewPosition(game, viewPly) : { board: new Int8Array(90), hidden: null }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game, viewPly, room.version],
  );

  // Người chơi rời giữa ván: đồng hồ vẫn chạy trên server
  useLeaveGuard(
    isPlayer && state?.status === 'playing',
    t('Ván online vẫn tiếp tục và đồng hồ của bạn vẫn chạy. Bạn có thể quay lại phòng bằng link mời.'),
  );

  if (room.fatal) {
    return (
      <div className="page narrow center">
        <h1>Không vào được phòng</h1>
        <p>{room.fatal}</p>
        <Link className="btn primary" to="/online">
          Về sảnh chơi online
        </Link>
      </div>
    );
  }

  if (!state || !game) {
    return (
      <div className="page narrow center">
        <div className="spinner" />
        <p className="muted">{room.conn === 'reconnecting' ? 'Đang kết nối lại…' : `Đang vào phòng ${code}…`}</p>
      </div>
    );
  }

  const onBoardMove = (from: number, to: number) => {
    if (!isPlayer) return;
    if (myTurn) room.move(squareToIccs(from) + squareToIccs(to));
    else if (canPremove) {
      setPremove({ from, to });
      sfx.select();
    }
  };

  const shownPly = viewPly ?? game.ply;
  const lastRec = shownPly > 0 ? game.records[shownPly - 1] : undefined;
  const lastMove = lastRec ? { from: moveFrom(lastRec.move), to: moveTo(lastRec.move) } : null;
  const checkSquare = viewPly === null && game.inCheck() ? game.pos.kingSquare(game.pos.side) : null;
  const captureEv = room.events.list.find((e) => e.type === 'capture');
  const flash = viewPly === null && captureEv && captureEv.type === 'capture' ? { at: captureEv.at, key: room.events.stamp } : null;

  const top: 'red' | 'black' = flipped ? 'red' : 'black';
  const bottom: 'red' | 'black' = flipped ? 'black' : 'red';
  const opp = you === 'red' ? 'black' : you === 'black' ? 'red' : null;
  const rt = state.result ? resultText(state.result, isPlayer ? (you as 'red' | 'black') : null) : null;
  const showEval = training.enabled && settings.evalBar;

  const doExport = async () => {
    const r = await exportBoardImage(wrapRef.current?.querySelector('.board-stack') ?? null, `phong-${state.code}`);
    setExportMsg(r === 'failed' ? 'Không xuất được ảnh' : r === 'shared' ? 'Đã chia sẻ ảnh' : 'Đã tải ảnh về máy');
    setTimeout(() => setExportMsg(null), 2500);
  };

  const openReview = () => {
    grant('phan_tich');
    navigate('/review', {
      state: {
        startFen: game.startFen,
        moves: game.movesIccs(),
        red: state.red?.name ?? 'Đỏ',
        black: state.black?.name ?? 'Đen',
        you: isPlayer ? (you as 'red' | 'black') : undefined,
        opponent: isPlayer ? 'Đối thủ' : undefined,
      },
    });
  };

  const playerBar = (side: 'red' | 'black') => {
    const p = state[side];
    return (
      <PlayerBar
        side={side}
        name={p ? p.name : 'Đang chờ người chơi…'}
        clockMs={room.remaining(side)}
        active={state.status === 'playing' && game.turn === side}
        captured={capturedBy(game.records, side, shownPly)}
        connected={p ? p.connected : undefined}
        badge={
          <>
            {p?.elo != null && <span className="elo-tag">{p.elo}</span>}
            {p?.isGuest && <span className="guest-tag">khách</span>}
            {you === side && <span className="you-tag">bạn</span>}
          </>
        }
      />
    );
  };

  return (
    <div className="game-layout">
      <div className="board-column with-room-header">
        <div className="room-header">
          <button className="room-code-btn" onClick={() => setShareOpen(true)} title="Chia sẻ phòng">
            {t('Phòng')} <strong>{state.code}</strong> ⧉
          </button>
          <span className="muted small">
            {variant === 'jieqi' && `${t('Cờ úp')} · `}
            {formatTimeControl(state.settings.timeControl)} · {state.settings.rated ? t('Xếp hạng') : t('Giao hữu')}
            {state.settings.training && ` · ${t('Luyện Trình')}`} · 👁 {state.spectators}
          </span>
          <ConnBadge conn={room.conn} />
        </div>

        {playerBar(top)}
        <div className={`board-row ${showEval ? 'with-eval' : ''}`}>
          {showEval && <EvalBar info={training.evalInfo} flipped={flipped} />}
          <div className="board-wrap" ref={wrapRef}>
            <Board
              board={shown.board}
              hidden={shown.hidden}
              version={room.version * 1000 + (viewPly ?? 999)}
              flipped={flipped}
              interactive={state.status === 'playing' && viewPly === null && (isPlayer || trainingOn)}
              canSelect={canSelect}
              targetsFor={targetsFor}
              onMove={onBoardMove}
              lastMove={lastMove}
              checkSquare={checkSquare}
              flash={flash}
              premove={premove}
              badges={training.badges}
              arrows={training.arrows}
              onInspect={training.enabled ? training.inspect : undefined}
            />
            <EffectCanvas
              events={viewPly === null ? room.events.list : []}
              stamp={room.events.stamp}
              flipped={flipped}
              mateId={patterns.mateId}
              patternStamp={patterns.hits.some((h) => h.kind !== 'mate') ? patterns.stamp : 0}
              containerRef={wrapRef}
            />
            <EffectBanner events={room.events.list} stamp={room.events.stamp} patterns={patterns.hits} flipped={flipped} />
            <VictoryVideo
              open={victory}
              sub="Bạn đã thắng"
              onDone={() => {
                setVictory(false);
                setResultOpen(true);
              }}
            />
            {state.perpetualWarning && state.status === 'playing' && (
              <div className="perpetual-warning">
                ⚠ {SIDE_VI[state.perpetualWarning.side]} đang chiếu mãi ({state.perpetualWarning.count}/3) — lặp lại sẽ bị xử thua
              </div>
            )}
            {state.status === 'waiting' && (
              <WaitingOverlay state={state} onReady={(r) => room.send({ type: 'room:ready', ready: r })} onShare={() => setShareOpen(true)} />
            )}
            {state.hiddenMoves > 0 && <div className="delay-tag">Trễ {state.hiddenMoves} nước (chống mách nước)</div>}
          </div>
        </div>
        {playerBar(bottom)}
        <MoveAnnouncer record={game.records[game.records.length - 1]} />

        {/* Thanh công cụ nhỏ ngay dưới bàn; việc ít dùng nằm trong "Thêm" */}
        <div className="toolbar" role="toolbar" aria-label={t('Nước đi')}>
          {isPlayer && state.status === 'playing' && (
            <>
              <button className="tool" onClick={() => room.send({ type: 'game:offerDraw' })} disabled={state.offers.draw === you}>
                <ActLabel text={`🤝 ${state.offers.draw === you ? t('Đã cầu hòa') : t('Cầu hòa')}`} />
              </button>
              {!state.settings.rated && (
                <button className="tool" onClick={() => room.send({ type: 'game:requestUndo' })} disabled={game.ply === 0 || state.offers.undo === you}>
                  <ActLabel text={`↶ ${state.offers.undo === you ? t('Đã xin') : t('Xin đi lại')}`} />
                </button>
              )}
            </>
          )}
          <button className="tool" onClick={() => setFlipOverride((f) => !f)}>
            <ActLabel text={t('⇅ Xoay bàn')} />
          </button>
          {trainingAllowed && (
            <button
              className={`tool ${trainingOn ? 'on' : ''}`}
              aria-pressed={trainingOn}
              onClick={() => setTrainingOn(!trainingOn)}
              title={isPlayer ? 'Luyện Trình: cả hai đã đồng ý khi vào phòng' : 'Luyện Trình: chỉ bạn thấy'}
            >
              <ActLabel text={`🎓 ${t('Luyện')}`} />
            </button>
          )}
          <button className="tool" onClick={() => setShareOpen(true)}>
            <ActLabel text={`📤 ${t('Mời')}`} />
          </button>
          <button className="tool" onClick={() => setMoreOpen(true)} aria-haspopup="dialog">
            <ActLabel text={`⋯ ${t('Thêm')}`} />
          </button>
        </div>

        <MoveStrip records={game.records} viewPly={viewPly} setViewPly={setViewPly} />
      </div>

      <aside className="side-panel">
        {room.notice && <Notice key={room.notice.key} text={room.notice.text} />}
        <OfferBanners state={state} send={room.send} />

        {(state.status !== 'playing' || (isPlayer && myTurn)) && (
          <div className="status-line">
            {state.status === 'waiting' && t('Đang chờ hai bên sẵn sàng')}
            {state.status === 'playing' && <strong>{t('Tới lượt bạn')}</strong>}
            {state.status === 'ended' && rt && (
              <strong>
                {rt.title} — {rt.detail}
              </strong>
            )}
            {state.status === 'closed' && t('Phòng đã đóng')}
          </div>
        )}

        {isPlayer && state.status === 'ended' && (
          <button className="btn primary big" onClick={() => room.send({ type: 'game:rematch' })} disabled={state.offers.rematch === you}>
            {state.offers.rematch === you
              ? 'Đang chờ đối thủ…'
              : state.offers.rematch === opp
                ? '✅ Đồng ý đánh lại'
                : '⟳ Đánh lại (đổi màu)'}
          </button>
        )}

        {premove && (
          <div className="offer">
            Đã đặt nước đi trước: {squareToIccs(premove.from)}→{squareToIccs(premove.to)}
            <button className="btn small" onClick={() => setPremove(null)}>
              Hủy
            </button>
          </div>
        )}

        <TrainingPanel t={training} board={game.pos.board} />
        {exportMsg && <div className="muted small">{exportMsg}</div>}

        <ChatPanel chat={room.chat} you={you} onSend={(text, emote) => room.send({ type: 'chat:send', text, emote })} rated={state.settings.rated} />
      </aside>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title={t('Thêm')}>
        <div className="actions" onClick={(e) => (e.target as HTMLElement).closest('a,[data-close]') && setMoreOpen(false)}>
          {isPlayer && state.status === 'playing' && (
            <ConfirmButton
              label={t('🏳 Đầu hàng')}
              confirmLabel={`🏳 ${t('Chắc chắn?')}`}
              onConfirm={() => {
                setMoreOpen(false);
                room.send({ type: 'game:resign' });
              }}
            />
          )}
          <button className="btn" data-close onClick={doExport}>
            <ActLabel text={t('📷 Ảnh thế cờ')} />
          </button>
          {state.status === 'ended' && variant === 'xiangqi' && game.ply > 0 && (
            <button className="btn" data-close onClick={openReview}>
              <ActLabel text={t('📈 Phân tích ván')} />
            </button>
          )}
          {state.matchId && state.status === 'ended' && (
            <Link className="btn" to={`/match/${state.matchId}`}>
              <ActLabel text="📜 Biên bản" />
            </Link>
          )}
        </div>
      </Modal>

      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title={t('Mời bạn vào phòng')}>
        <SharePanel code={state.code} roomKey={key} />
      </Modal>

      <Modal open={resultOpen && !!rt} onClose={() => setResultOpen(false)} title={rt?.title}>
        <p className="result-detail">
          {rt?.detail}
          {patterns.mateId && state.result?.reason === 'checkmate' && ` — ${patterns.hits.find((h) => h.kind === 'mate')?.name ?? ''}`}
        </p>
        {state.ratingDelta && isPlayer && (
          <p className="result-rewards">
            Elo: {state.ratingDelta[you as 'red' | 'black'] >= 0 ? '+' : ''}
            {state.ratingDelta[you as 'red' | 'black']}
          </p>
        )}
        <div className="modal-actions">
          {isPlayer && (
            <button
              className="btn primary"
              onClick={() => {
                room.send({ type: 'game:rematch' });
                setResultOpen(false);
              }}
            >
              Đánh lại
            </button>
          )}
          <button className="btn" onClick={() => setResultOpen(false)}>
            Xem lại ván
          </button>
          {variant === 'xiangqi' && game.ply > 0 && (
            <button className="btn" onClick={openReview}>
              📈 Phân tích
            </button>
          )}
          <Link className="btn" to="/online">
            Về sảnh
          </Link>
        </div>
      </Modal>
    </div>
  );
}

function ConnBadge({ conn }: { conn: string }) {
  if (conn === 'open') return <span className="conn ok">● trực tuyến</span>;
  if (conn === 'closed') return <span className="conn bad">● đã đóng</span>;
  return <span className="conn warn">● đang kết nối…</span>;
}

function Notice({ text }: { text: string }) {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 3500);
    return () => clearTimeout(t);
  }, []);
  return show ? <div className="notice">{text}</div> : null;
}

function WaitingOverlay({ state, onReady, onShare }: { state: RoomState; onReady: (r: boolean) => void; onShare: () => void }) {
  const you = state.you;
  const bothSeated = state.red && state.black;
  const myReady = you !== 'spectator' && state.ready[you];
  return (
    <div className="waiting-overlay">
      <div className="waiting-card">
        <h3>{bothSeated ? 'Đủ người — bấm Sẵn sàng' : 'Đang chờ đối thủ'}</h3>
        {state.settings.variant === 'jieqi' && <p className="muted small">Cờ úp: quân úp đi theo vị trí, đi xong thì lật.</p>}
        {state.settings.training && <p className="muted small">Phòng cho phép Luyện Trình — vào phòng là đồng ý.</p>}
        <div className="seats">
          {(['red', 'black'] as const).map((s) => (
            <div key={s} className={`seat ${s}`}>
              <span className={`side-dot ${s}`} /> {state[s]?.name ?? '— trống —'}
              {state.ready[s] && <span className="ready-tag">✔ sẵn sàng</span>}
            </div>
          ))}
        </div>
        {!bothSeated && (
          <button className="btn primary big" onClick={onShare}>
            📱 Hiện mã QR mời bạn
          </button>
        )}
        {you !== 'spectator' && (
          <button className={`btn big ${myReady ? '' : 'primary'}`} onClick={() => onReady(!myReady)}>
            {myReady ? 'Hủy sẵn sàng' : '✔ Sẵn sàng'}
          </button>
        )}
        {you === 'spectator' && <p className="muted small">Bạn đang xem. Ván sẽ bắt đầu khi hai bên sẵn sàng.</p>}
      </div>
    </div>
  );
}

function OfferBanners({ state, send }: { state: RoomState; send: ReturnType<typeof useRoom>['send'] }) {
  const you = state.you;
  if (you === 'spectator') return null;
  const opp = you === 'red' ? 'black' : 'red';
  return (
    <>
      {state.status === 'playing' && state.offers.draw === opp && (
        <div className="offer">
          Đối thủ cầu hòa
          <button className="btn small primary" onClick={() => send({ type: 'game:respondDraw', accept: true })}>
            Đồng ý
          </button>
          <button className="btn small" onClick={() => send({ type: 'game:respondDraw', accept: false })}>
            Từ chối
          </button>
        </div>
      )}
      {state.status === 'playing' && state.offers.undo === opp && (
        <div className="offer">
          Đối thủ xin đi lại
          <button className="btn small primary" onClick={() => send({ type: 'game:respondUndo', accept: true })}>
            Cho phép
          </button>
          <button className="btn small" onClick={() => send({ type: 'game:respondUndo', accept: false })}>
            Không
          </button>
        </div>
      )}
      {state.status === 'ended' && state.offers.rematch === opp && (
        <div className="offer">
          Đối thủ muốn đánh lại
          <button className="btn small primary" onClick={() => send({ type: 'game:rematch' })}>
            Đồng ý
          </button>
        </div>
      )}
    </>
  );
}

function ChatPanel(props: { chat: ChatMessage[]; you: string; rated: boolean; onSend: (text: string, emote: boolean) => void }) {
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [props.chat.length]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    props.onSend(t, false);
    setText('');
  };
  return (
    <div className="chat">
      <div className="chat-title">
        Trò chuyện {props.you === 'spectator' && <span className="muted small">(kênh khán giả{props.rated ? ', người chơi không thấy' : ''})</span>}
      </div>
      <div className="chat-list" ref={listRef}>
        {props.chat.length === 0 && <div className="muted small">Chưa có tin nhắn</div>}
        {props.chat.map((m) => (
          <div key={m.id} className={`chat-msg ${m.channel} ${m.emote ? 'emote' : ''}`}>
            <span className="chat-from">{m.fromName}:</span> <span>{m.text}</span>
          </div>
        ))}
      </div>
      <div className="emotes">
        {EMOTES.map((e) => (
          <button key={e} className="emote-btn" onClick={() => props.onSend(e, true)} aria-label={`Gửi biểu cảm ${e}`}>
            {e}
          </button>
        ))}
      </div>
      <form className="chat-form" onSubmit={submit}>
        <input className="input" value={text} maxLength={200} onChange={(e) => setText(e.target.value)} placeholder="Nhắn tin…" aria-label="Tin nhắn" />
        <button className="btn" type="submit">
          Gửi
        </button>
      </form>
    </div>
  );
}
