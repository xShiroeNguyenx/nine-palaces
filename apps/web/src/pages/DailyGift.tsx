import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DAILY_COINS, DAILY_STREAK_BONUS, canClaimDaily, dailyStreak, dayKey } from '@np/shared';
import { useProgress } from '../lib/progress';
import { useSettings } from '../lib/settings';
import { sfx } from '../lib/sound';
import { useT } from '../lib/i18n';

/** Thẻ quà đăng nhập trên Trang chủ: chỉ hiện khi hôm nay chưa nhận (hoặc vừa nhận xong) */
export function DailyGift() {
  const t = useT();
  const show = useSettings((s) => s.gacha);
  const economy = useProgress((s) => s.progress.economy);
  const claim = useProgress((s) => s.claimDaily);
  const [got, setGot] = useState<{ coins: number; streak: number } | null>(null);
  const today = dayKey(new Date());
  if (!show || (!got && !canClaimDaily(economy, today))) return null;
  const streak = dailyStreak(economy.dailyDays, today);
  const bonusToday = (streak + 1) % 7 === 0;
  return (
    <section className="card daily-gift">
      <span className="daily-icon" aria-hidden>
        🎁
      </span>
      {got ? (
        <div>
          <strong>
            +{got.coins} 🪙 · {t('chuỗi')} {got.streak} {t('ngày')}
          </strong>
          <div className="small">
            <Link to="/collection?tab=gacha">{t('Mở Bảo Khố')} →</Link>
          </div>
        </div>
      ) : (
        <>
          <div>
            <strong>{t('Quà hôm nay')}</strong>
            <div className="muted small">
              +{DAILY_COINS + (bonusToday ? DAILY_STREAK_BONUS : 0)} 🪙 · {t('chuỗi')} {streak} {t('ngày')}
              {!bonusToday && ` · ${t('ngày thứ 7 liên tiếp thưởng thêm')} ${DAILY_STREAK_BONUS} 🪙`}
            </div>
          </div>
          <button
            className="btn primary"
            onClick={() => {
              const r = claim();
              if (r) {
                sfx.unlock();
                setGot(r);
              }
            }}
          >
            {t('Nhận')}
          </button>
        </>
      )}
    </section>
  );
}
