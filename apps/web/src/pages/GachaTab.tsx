import { useEffect, useRef, useState } from 'react';
import {
  EMPTY_PITY,
  DUPLICATE_SHARDS,
  PULL_COST,
  RARITIES,
  RARITY_RATE,
  SHARD_PRICE,
  TEN_PULL_COST,
  canClaimDaily,
  canPull,
  dailyStreak,
  dayKey,
  pityRemaining,
  type PullResult,
  type Rarity,
} from '@np/shared';
import { ConfirmButton, Modal } from '../game/components';
import { TitleFrame, useWallet } from '../game/economyUi';
import { GACHA_POOL, ITEM_BY_KEY, KIND_NAME, RARITY_NAME, isUnlocked, rarityOf, type CosmeticKind, type FrameId } from '../lib/cosmetics';
import { useProgress } from '../lib/progress';
import { useSettings, type Settings } from '../lib/settings';
import { sfx } from '../lib/sound';
import { deviceId } from '../lib/storage';
import { useT } from '../lib/i18n';

/** Tỉ lệ Huyền thoại thực tế khi tính cả bảo hiểm: trung bình 36,5 lượt/món (xem packages/shared/test/gacha.test.ts) */
const EFFECTIVE_LEGEND_RATE = '≈ 2,7%';

const KIND_ICON: Record<CosmeticKind, string> = { board: '🏯', piece: '♟', fx: '✨', frame: '🖼', call: '📣', sound: '🔔' };

/** Cài đặt tương ứng với từng loại vật phẩm (để "Dùng ngay") */
const KIND_SETTING: Record<CosmeticKind, keyof Settings> = {
  board: 'boardSkin',
  piece: 'pieceStyle',
  fx: 'fxTier',
  frame: 'frame',
  call: 'checkCall',
  sound: 'moveSound',
};

const tierOf = (r: Rarity) => RARITIES.indexOf(r);

function useEquip() {
  const settings = useSettings();
  return {
    isEquipped: (key: string) => {
      const it = ITEM_BY_KEY.get(key);
      return !!it && settings[KIND_SETTING[it.kind]] === it.id;
    },
    equip: (key: string) => {
      const it = ITEM_BY_KEY.get(key);
      if (it) settings.update({ [KIND_SETTING[it.kind]]: it.id } as Partial<Settings>);
    },
  };
}

/** Hình nhỏ của vật phẩm: khung và lời chiếu hiện đúng kiểu, các loại khác dùng biểu tượng */
function ItemVisual({ itemKey }: { itemKey: string }) {
  const t = useT();
  const it = ITEM_BY_KEY.get(itemKey);
  if (!it) return null;
  if (it.kind === 'frame') return <TitleFrame frame={it.id as FrameId}>{t('Kỳ thủ')}</TitleFrame>;
  if (it.kind === 'call') return <span className="gacha-call">{it.name}</span>;
  return <span className="gacha-icon">{KIND_ICON[it.kind]}</span>;
}

export function GachaTab() {
  const t = useT();
  const progress = useProgress((s) => s.progress);
  const pull = useProgress((s) => s.pull);
  const claimWelcome = useProgress((s) => s.claimWelcome);
  const claimDaily = useProgress((s) => s.claimDaily);
  const { coins, shards, debt } = useWallet();
  const [roll, setRoll] = useState<{ results: PullResult[]; phase: 'shake' | 'open' } | null>(null);
  const [ratesOpen, setRatesOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const e = progress.economy;
  const remain = pityRemaining(e.pity[deviceId()] ?? EMPTY_PITY);
  const today = dayKey(new Date());
  const welcomeDone = e.claims.includes('welcome');

  const open = (results: PullResult[]) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setRoll({ results, phase: 'open' });
    sfx.reveal(Math.max(...results.map((r) => tierOf(r.item.rarity))));
  };

  const doPull = (count: 1 | 10) => {
    setNote(null);
    const results = pull(count);
    if (!results) {
      setNote(t('Không đủ xu.'));
      return;
    }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return open(results);
    sfx.shake();
    setRoll({ results, phase: 'shake' });
    timer.current = setTimeout(() => open(results), 1400);
  };

  const top = roll ? Math.max(...roll.results.map((r) => tierOf(r.item.rarity))) : 0;

  return (
    <div className="gacha">
      <section className="card gacha-hero">
        <div className="gacha-envelope-sm" aria-hidden>
          🧧
        </div>
        <div className="gacha-wallet">
          <div>
            <strong>🪙 {coins}</strong> {t('xu')} · <strong>🧩 {shards}</strong> {t('mảnh')}
          </div>
          <div className="muted small">
            {t('Chắc chắn Sử thi+ trong')} {remain.epic} {t('lượt')} · {t('Huyền thoại trong')} {remain.legendary} {t('lượt')}
          </div>
          {debt && <div className="small accent">{t('Xu bị tiêu trùng trên hai máy khi offline: chơi thêm để số dư dương lại.')}</div>}
        </div>
        <div className="controls">
          <button className="btn primary" disabled={!canPull(e, 1, progress.achievements)} onClick={() => doPull(1)}>
            {t('Quay ×1')} · {PULL_COST} 🪙
          </button>
          <button className="btn primary" disabled={!canPull(e, 10, progress.achievements)} onClick={() => doPull(10)}>
            {t('Quay ×10')} · {TEN_PULL_COST} 🪙
          </button>
          <button className="btn" onClick={() => setRatesOpen(true)}>
            {t('Tỉ lệ')}
          </button>
        </div>
        {note && <div className="small accent">{note}</div>}
        <p className="muted small">{t('Xu chỉ kiếm được bằng cách chơi: ván với máy, quà hằng ngày, thành tựu. Không bán xu.')}</p>
      </section>

      <div className="gacha-gifts">
        {!welcomeDone && (
          <button className="btn big" onClick={() => claimWelcome() && sfx.unlock()}>
            🎁 {t('Nhận quà chào mừng')} · +300 🪙
          </button>
        )}
        {canClaimDaily(e, today) ? (
          <button
            className="btn big"
            onClick={() => {
              const r = claimDaily();
              if (r) {
                sfx.unlock();
                setNote(`+${r.coins} 🪙 · ${t('chuỗi')} ${r.streak} ${t('ngày')}`);
              }
            }}
          >
            📅 {t('Nhận quà hôm nay')}
          </button>
        ) : (
          <div className="muted small">
            📅 {t('Đã nhận quà hôm nay')} · {t('chuỗi')} {dailyStreak(e.dailyDays, today)} {t('ngày')}
          </div>
        )}
      </div>

      <ShardShop shards={shards} />
      <History />

      <Modal open={ratesOpen} onClose={() => setRatesOpen(false)} title={t('Tỉ lệ Bảo Khố')}>
        <table className="gacha-rates">
          <thead>
            <tr>
              <th>{t('Bậc')}</th>
              <th>{t('Tỉ lệ')}</th>
              <th>{t('Số món')}</th>
              <th>{t('Trùng')}</th>
              <th>{t('Tiệm mảnh')}</th>
            </tr>
          </thead>
          <tbody>
            {RARITIES.map((r) => (
              <tr key={r} className={`rarity-${r}`}>
                <td>{t(RARITY_NAME[r])}</td>
                <td>{(RARITY_RATE[r] * 100).toLocaleString('vi-VN')}%</td>
                <td>{GACHA_POOL.filter((p) => p.rarity === r).length}</td>
                <td>+{DUPLICATE_SHARDS[r]} 🧩</td>
                <td>{SHARD_PRICE[r]} 🧩</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="small">
          <li>{t('Lượt thứ 10 liên tiếp chưa ra Sử thi trở lên thì chắc chắn ra Sử thi trở lên.')}</li>
          <li>{t('Từ lượt thứ 41 chưa ra Huyền thoại, tỉ lệ Huyền thoại tăng thêm 5% mỗi lượt; lượt thứ 50 chắc chắn ra.')}</li>
          <li>
            {t('Tỉ lệ Huyền thoại thực tế khi tính cả bảo hiểm:')} {EFFECTIVE_LEGEND_RATE}
          </li>
          <li>{t('Ra Huyền thoại mà còn món Huyền thoại chưa có thì luôn ra món chưa có.')}</li>
          <li>{t('Bảo hiểm tính riêng trên từng máy.')}</li>
        </ul>
      </Modal>

      <Modal open={!!roll} onClose={roll?.phase === 'open' ? () => setRoll(null) : undefined} title={roll?.phase === 'open' ? t('Kết quả') : undefined} wide>
        {roll?.phase === 'shake' && (
          <div className="gacha-stage">
            <div className={`gacha-envelope tier-${top}`} aria-label={t('Đang mở phong bao')}>
              🧧
            </div>
            <button className="btn" onClick={() => open(roll.results)}>
              {t('Bỏ qua')}
            </button>
          </div>
        )}
        {roll?.phase === 'open' && <Results results={roll.results} onClose={() => setRoll(null)} />}
      </Modal>
    </div>
  );
}

function Results({ results, onClose }: { results: PullResult[]; onClose: () => void }) {
  const t = useT();
  const { equip, isEquipped } = useEquip();
  return (
    <>
      <div className={`gacha-results ${results.length === 1 ? 'single' : ''}`}>
        {results.map((r, i) => {
          const it = ITEM_BY_KEY.get(r.item.id);
          if (!it) return null;
          return (
            <div key={i} className={`gacha-card rarity-${r.item.rarity}`} style={{ animationDelay: `${i * 0.12}s` }}>
              <div className="gacha-rarity">{t(RARITY_NAME[r.item.rarity])}</div>
              <ItemVisual itemKey={r.item.id} />
              <div className="muted small">{t(KIND_NAME[it.kind])}</div>
              <div className="item-name">{it.name}</div>
              {r.duplicate ? (
                <div className="small">+{r.shards} 🧩</div>
              ) : (
                <>
                  <div className="gacha-new">{t('MỚI')}</div>
                  <button className="btn small" disabled={isEquipped(r.item.id)} onClick={() => equip(r.item.id)}>
                    {isEquipped(r.item.id) ? t('Đang dùng') : t('Dùng ngay')}
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="modal-actions">
        <button className="btn primary" onClick={onClose}>
          {t('Nhận')}
        </button>
      </div>
    </>
  );
}

/** Đổi mảnh lấy món chưa có */
function ShardShop({ shards }: { shards: number }) {
  const t = useT();
  const progress = useProgress((s) => s.progress);
  const buy = useProgress((s) => s.buyWithShards);
  const missing = GACHA_POOL.filter((p) => {
    const it = ITEM_BY_KEY.get(p.id);
    return it && !isUnlocked(it, progress);
  }).sort((a, b) => tierOf(a.rarity) - tierOf(b.rarity));
  return (
    <details className="gacha-fold">
      <summary>
        {t('Tiệm mảnh')} · 🧩 {shards}
      </summary>
      {missing.length === 0 ? (
        <p className="muted small">{t('Bạn đã có đủ mọi món trong Bảo Khố!')}</p>
      ) : (
        <div className="item-grid">
          {missing.map((p) => {
            const it = ITEM_BY_KEY.get(p.id)!;
            const price = SHARD_PRICE[rarityOf(it)];
            return (
              <div key={p.id} className={`item-card gacha-shop-card rarity-${p.rarity}`}>
                <div className="gacha-rarity">{t(RARITY_NAME[p.rarity])}</div>
                <ItemVisual itemKey={p.id} />
                <div className="item-name">{it.name}</div>
                <div className="muted small">
                  {t(KIND_NAME[it.kind])} · {it.description}
                </div>
                <ConfirmButton
                  className="btn small"
                  label={`${t('Đổi')} · ${price} 🧩`}
                  confirmLabel={t('Chắc chắn đổi?')}
                  disabled={shards < price}
                  onConfirm={() => buy(p.id) && sfx.unlock()}
                />
              </div>
            );
          })}
        </div>
      )}
    </details>
  );
}

function History() {
  const t = useT();
  const log = useProgress((s) => s.gachaLog);
  if (!log.length) return null;
  return (
    <details className="gacha-fold gacha-history">
      <summary>
        {t('Lịch sử quay')} ({log.length})
      </summary>
      <div className="room-list">
        {log.map((x, i) => {
          const it = ITEM_BY_KEY.get(x.id);
          const r = it ? rarityOf(it) : 'common';
          return (
            <div key={i} className={`room-row rarity-${r}`}>
              <div className="room-players">
                <span className="gacha-rarity">{t(RARITY_NAME[r])}</span> {it?.name ?? x.id}
                {x.dup && <span className="muted small"> · {t('trùng')}</span>}
              </div>
              <div className="muted small">{new Date(x.t).toLocaleString()}</div>
            </div>
          );
        })}
      </div>
    </details>
  );
}
