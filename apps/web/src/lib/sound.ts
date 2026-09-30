import type { GameEvent, PieceName } from '@np/rules';
import { useSettings } from './settings';

/**
 * Âm thanh tổng hợp bằng Web Audio API: không cần file âm thanh, không lo bản quyền.
 * Mỗi loại quân chiếu có một âm riêng.
 */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (!useSettings.getState().sound) return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', gain = 0.2, delay = 0, slideTo?: number) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + delay;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function noise(dur: number, gain = 0.3, delay = 0, filterFreq = 1200) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + delay;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const src = a.createBufferSource();
  src.buffer = buf;
  const filter = a.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  const g = a.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(a.destination);
  src.start(t);
}

export const sfx = {
  move: () => {
    noise(0.07, 0.5, 0, 2500);
    tone(220, 0.06, 'triangle', 0.12);
  },
  capture: () => {
    noise(0.12, 0.7, 0, 1800);
    tone(140, 0.15, 'triangle', 0.25);
  },
  select: () => tone(660, 0.04, 'sine', 0.05),
  illegal: () => tone(180, 0.12, 'square', 0.05),
  /** Chiếu bằng Xe: tiếng gươm rút (quét tần số cao) */
  checkChariot: () => {
    tone(1800, 0.25, 'sawtooth', 0.06, 0, 4200);
    tone(3200, 0.3, 'sine', 0.05, 0.05);
  },
  /** Chiếu bằng Mã: vó ngựa */
  checkHorse: () => {
    for (let i = 0; i < 3; i++) noise(0.05, 0.6, i * 0.09, 900);
    tone(520, 0.25, 'triangle', 0.08, 0.28, 780);
  },
  /** Chiếu bằng Pháo: tiếng nổ */
  checkCannon: () => {
    noise(0.45, 0.9, 0, 500);
    tone(80, 0.4, 'sine', 0.4, 0, 40);
  },
  /** Chiếu bằng Tốt: kèn lệnh */
  checkSoldier: () => {
    tone(392, 0.18, 'square', 0.06);
    tone(523, 0.28, 'square', 0.06, 0.16);
  },
  checkOther: () => tone(440, 0.3, 'triangle', 0.15),
  /** Chiếng */
  gong: () => {
    tone(196, 1.2, 'sine', 0.25);
    tone(294, 1.0, 'sine', 0.12);
    tone(415, 0.8, 'sine', 0.06);
  },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, 'triangle', 0.15, i * 0.12)),
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, 0.4, 'triangle', 0.12, i * 0.16)),
  draw: () => [440, 440].forEach((f, i) => tone(f, 0.3, 'triangle', 0.1, i * 0.2)),
  warning: () => {
    for (let i = 0; i < 3; i++) noise(0.12, 0.7, i * 0.22, 300);
  },
  start: () => {
    noise(0.2, 0.6, 0, 300);
    tone(262, 0.3, 'triangle', 0.12, 0.1);
  },
  lowTime: () => tone(880, 0.05, 'square', 0.05),
  /** Kèn chiến thắng (hiệu ứng bậc Vàng trở lên) */
  fanfare: () => {
    const notes = [392, 523, 659, 784, 1047];
    notes.forEach((f, i) => {
      tone(f, 0.5, 'sawtooth', 0.05, i * 0.1);
      tone(f / 2, 0.5, 'triangle', 0.08, i * 0.1);
    });
    tone(1047, 1.2, 'triangle', 0.1, 0.55);
  },
  /** Lật quân (cờ úp) */
  flip: () => {
    noise(0.06, 0.4, 0, 3000);
    tone(740, 0.12, 'triangle', 0.08, 0.04, 1100);
  },
  /** Trống báo thế cờ */
  drum: () => {
    tone(90, 0.35, 'sine', 0.35, 0, 55);
    noise(0.1, 0.4, 0, 400);
    tone(90, 0.3, 'sine', 0.25, 0.22, 55);
  },
  /** Tiếng ma (hiệu ứng Huyền thoại): rít trầm trượt xuống + gió */
  ghost: () => {
    tone(420, 1.1, 'sawtooth', 0.04, 0, 90);
    tone(640, 0.9, 'sine', 0.05, 0.1, 160);
    noise(1.2, 0.35, 0, 350);
  },
  /** Mở khóa vật phẩm */
  unlock: () => [659, 880, 1175].forEach((f, i) => tone(f, 0.25, 'sine', 0.12, i * 0.09)),
  notify: () => tone(880, 0.12, 'sine', 0.1),
};

const CHECK_SOUND: Record<PieceName, () => void> = {
  chariot: sfx.checkChariot,
  horse: sfx.checkHorse,
  cannon: sfx.checkCannon,
  soldier: sfx.checkSoldier,
  king: sfx.gong,
  advisor: sfx.checkOther,
  elephant: sfx.checkOther,
};

function vibrate(pattern: number | number[]) {
  if (useSettings.getState().vibrate && 'vibrate' in navigator) navigator.vibrate(pattern);
}

/** Phát âm thanh phù hợp nhất cho danh sách sự kiện sau một nước đi */
export function playEvents(events: GameEvent[], mySide?: 'red' | 'black' | null): void {
  const end = events.find((e) => e.type === 'gameEnd');
  const mate = events.find((e) => e.type === 'checkmate');
  const check = events.find((e) => e.type === 'check');
  const capture = events.some((e) => e.type === 'capture');
  const warning = events.some((e) => e.type === 'perpetualCheckWarning');
  if (events.some((e) => e.type === 'reveal')) sfx.flip();

  if (check && check.type === 'check') {
    if (check.double) {
      CHECK_SOUND[check.by[0]!]();
      setTimeout(() => CHECK_SOUND[check.by[1] ?? check.by[0]!](), 180);
    } else CHECK_SOUND[check.by[0]!]();
    vibrate([30, 40, 30]);
  } else if (capture) {
    sfx.capture();
    vibrate(25);
  } else {
    sfx.move();
  }
  if (warning) setTimeout(sfx.warning, 350);
  if (mate || end) {
    setTimeout(() => {
      if (end && end.type === 'gameEnd') {
        if (end.result.winner === 'draw') sfx.draw();
        else if (!mySide || end.result.winner === mySide) sfx.win();
        else sfx.lose();
      } else sfx.gong();
    }, 450);
    vibrate([60, 60, 120]);
  }
}
