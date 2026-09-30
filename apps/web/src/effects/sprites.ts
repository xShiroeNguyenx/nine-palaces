import type { PieceName } from '@np/rules';
import type { FxTier } from '../lib/cosmetics';
import type { FxEngine } from './EffectCanvas';
import { drawDragon, drawSpirit, preloadSpirits, spriteMuzzle, spiritWidth, type SpiritKind, type SpiritPose, type SpiritStyle } from './spirits';

/**
 * Hiệu ứng kiểu điện ảnh theo 4 bậc:
 * - Cơ bản: bàn tối lại, chữ thư pháp, quân cờ khối 3D lao vào Tướng.
 * - Bạc: "hồn quân" (bóng vàng phát sáng của ngựa / chiến xa / pháo / lính) thay cho quân cờ.
 * - Vàng: thêm bóng mờ chuyển động, mực loang, phóng chậm khi trúng.
 * - Huyền thoại: tướng cưỡi ngựa, pháo đầu rồng, sét đánh, tro lửa, rồng bay khi chiếu bí.
 * Toạ độ theo đơn vị bàn cờ (1 ô = 60, bàn 572 × 632).
 */

export type Pt = { x: number; y: number };

// Tải trước ảnh hồn quân ngay khi lớp hiệu ứng được nạp
preloadSpirits();

const BW = 572;
const BH = 632;
const CALLIG = '"Ma Shan Zheng", "STKaiti", "KaiTi", "Noto Serif SC", serif';
const HAN = '"Noto Serif SC", "SimSun", serif';

const GLYPH: Record<'red' | 'black', Record<PieceName, string>> = {
  red: { king: '帥', advisor: '仕', elephant: '相', horse: '傌', chariot: '俥', cannon: '炮', soldier: '兵' },
  black: { king: '將', advisor: '士', elephant: '象', horse: '馬', chariot: '車', cannon: '砲', soldier: '卒' },
};
/** Chữ thư pháp lớn cho từng đòn chiếu (giản thể: phông thư pháp Ma Shan Zheng chỉ có bộ giản thể) */
const SPIRIT: Record<PieceName, string> = {
  chariot: '车',
  horse: '马',
  cannon: '炮',
  soldier: '兵',
  king: '将',
  advisor: '士',
  elephant: '象',
};
/** Sắc ánh sáng theo quân */
const TINT: Record<PieceName, [string, string]> = {
  chariot: ['#fff6d8', '#ffd36b'],
  horse: ['#ffe8b0', '#f0a93b'],
  cannon: ['#ffd9a0', '#ff7a2d'],
  soldier: ['#f4ffd8', '#d8c46a'],
  king: ['#fff6d8', '#ffd36b'],
  advisor: ['#fff6d8', '#ffd36b'],
  elephant: ['#fff6d8', '#ffd36b'],
};

/** Kiểu hồn quân theo bậc: Bạc = ánh bạc, Vàng = ánh vàng, Huyền thoại = hồn ma xanh tím ma mị */
const STYLE: Record<Exclude<FxTier, 'basic'>, SpiritStyle> = {
  silver: { colors: ['#ffffff', '#cfd8e3', '#6f7d8c'], glow: 0.6, alpha: 0.95, tint: 'silver' },
  gold: { colors: ['#fff6d0', '#ffd25a', '#c98a1a'], glow: 0.85, alpha: 0.95, detail: true, tint: 'gold' },
  legendary: { colors: ['#f0fff8', '#8cf5cf', '#5b21b6'], glow: 1, alpha: 1, detail: true, eerie: true, tint: 'ghost' },
};
/** Sắc ánh sáng chung của bậc (vệt, vòng va chạm, chữ thư pháp); bậc Cơ bản dùng màu theo quân */
const TIER_TINT: Record<Exclude<FxTier, 'basic'>, [string, string]> = {
  silver: ['#ffffff', '#c9d3de'],
  gold: ['#fff6d8', '#ffd36b'],
  legendary: ['#e9fff6', '#8cf5cf'],
};
/** Kiểu hồn quân của một bậc (dùng cho phòng thử) */
export function spiritStyleFor(tier: Exclude<FxTier, 'basic'>): SpiritStyle {
  return STYLE[tier];
}
function tintFor(piece: PieceName, tier: FxTier): [string, string] {
  return tier === 'basic' ? TINT[piece] : TIER_TINT[tier];
}
/** Màu lửa (nòng pháo, đạn) theo bậc: sáng, giữa, tan */
function fireColors(tier: FxTier): [string, string, string] {
  if (tier === 'silver') return ['#ffffff', '#dbe7f5', 'rgba(180,200,230,0)'];
  if (tier === 'legendary') return ['#e9fff6', '#8cf5cf', 'rgba(120,60,220,0)'];
  return ['#fff8d0', '#ffb347', 'rgba(255,80,20,0)'];
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInCubic = (t: number) => t * t * t;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = (t: number) => {
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};
/** 0 → 1 → 0 (hiện rồi mờ) */
const bell = (p: number, inEnd: number, outStart: number) => Math.min(seg(p, 0, inEnd), 1 - seg(p, outStart, 1));

/* ------------------------------------------------------------------ */
/* Khối vẽ cơ bản                                                     */
/* ------------------------------------------------------------------ */

/** Cách vẽ chữ trên quân trong hiệu ứng (theo bộ quân đang dùng) */
export interface LabelStyle {
  family: string;
  /** Tỉ lệ cỡ chữ so với bán kính quân */
  scale: number;
  weight?: string;
}

const HAN_LABEL: LabelStyle = { family: HAN, scale: 1.1, weight: 'bold' };

/** Quân cờ dạng khối tròn 3D (nhìn nghiêng nhẹ) */
function drawDisc(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  glyph: string,
  red: boolean,
  glow = 0,
  label: LabelStyle = HAN_LABEL,
) {
  const tilt = 0.78;
  const thick = r * 0.38;
  ctx.save();
  ctx.translate(x, y);
  if (glow > 0) {
    ctx.shadowColor = `rgba(255,210,100,${glow})`;
    ctx.shadowBlur = 30 * glow;
  }
  const side = ctx.createLinearGradient(-r, 0, r, 0);
  side.addColorStop(0, '#8a5a24');
  side.addColorStop(0.45, '#d9a55a');
  side.addColorStop(1, '#6b4118');
  ctx.fillStyle = side;
  ctx.beginPath();
  ctx.ellipse(0, thick / 2, r, r * tilt, 0, 0, Math.PI);
  ctx.lineTo(-r, -thick / 2);
  ctx.ellipse(0, -thick / 2, r, r * tilt, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  const top = ctx.createRadialGradient(-r * 0.35, -thick / 2 - r * 0.35, r * 0.1, 0, -thick / 2, r);
  top.addColorStop(0, '#fff6dc');
  top.addColorStop(0.7, '#f0d49a');
  top.addColorStop(1, '#c99a55');
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.ellipse(0, -thick / 2, r, r * tilt, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = red ? '#a8261c' : '#1b1b1b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, -thick / 2, r * 0.8, r * 0.8 * tilt, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.save();
  ctx.translate(0, -thick / 2);
  ctx.scale(1, tilt);
  ctx.fillStyle = red ? '#a8261c' : '#1b1b1b';
  ctx.font = `${label.weight ?? 'normal'} ${r * label.scale}px ${label.family}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(glyph, 0, r * 0.06);
  ctx.restore();
  ctx.restore();
}

/** Lớp tối kiểu điện ảnh (vignette); `eerie` = tối tím ma mị */
export function cinematicDim(e: FxEngine, dur: number, strength: number, focus?: Pt, eerie = false) {
  e.actor(dur, (ctx, p) => {
    const a = bell(p, 0.12, 0.72) * strength;
    const cx = focus?.x ?? BW / 2;
    const cy = focus?.y ?? BH / 2;
    const g = ctx.createRadialGradient(cx, cy, 40, cx, cy, 520);
    if (eerie) {
      g.addColorStop(0, `rgba(30,8,60,${a * 0.4})`);
      g.addColorStop(1, `rgba(8,2,20,${a})`);
    } else {
      g.addColorStop(0, `rgba(10,6,2,${a * 0.35})`);
      g.addColorStop(1, `rgba(0,0,0,${a})`);
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, BW, BH + 20);
  });
}

/** Sương mù tím-xanh trôi ngang bàn (Huyền thoại) */
export function ghostFog(e: FxEngine, dur: number, strength = 1) {
  const puffs = Array.from({ length: 9 }, (_, i) => ({
    x: (i / 9) * BW + Math.random() * 60,
    y: BH * (0.25 + Math.random() * 0.6),
    r: 120 + Math.random() * 90,
    vx: (Math.random() < 0.5 ? -1 : 1) * (18 + Math.random() * 22),
    ph: Math.random() * 6,
  }));
  e.actor(dur, (ctx, p) => {
    const a = bell(p, 0.15, 0.7) * 0.5 * strength;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const f of puffs) {
      const x = ((f.x + f.vx * p * dur) % (BW + 240)) - 120;
      const y = f.y + Math.sin(p * 4 + f.ph) * 18;
      const g = ctx.createRadialGradient(x, y, 0, x, y, f.r);
      g.addColorStop(0, `rgba(120,80,220,${a * 0.5})`);
      g.addColorStop(0.5, `rgba(70,190,170,${a * 0.22})`);
      g.addColorStop(1, 'rgba(40,10,80,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });
}

/** Lửa ma xanh tím bay lên từ một điểm (Huyền thoại) */
function ghostFlames(e: FxEngine, at: Pt, n: number, spread = 30) {
  for (let i = 0; i < n; i++) {
    e.add({
      x: at.x + (Math.random() - 0.5) * spread,
      y: at.y + (Math.random() - 0.5) * spread * 0.5,
      vx: (Math.random() - 0.5) * 50,
      vy: -60 - Math.random() * 90,
      size: 3 + Math.random() * 5,
      color: Math.random() < 0.5 ? '#8cf5cf' : Math.random() < 0.5 ? '#a78bfa' : '#e9fff6',
      max: 0.6 + Math.random() * 0.6,
      kind: 'dot',
      drag: 0.985,
    });
  }
}

/** Chữ thư pháp lớn: nội dung + phông (mặc định chữ Hán giản thể, phông Ma Shan Zheng) */
export interface SpiritText {
  text: string;
  font: string;
  /** Bề rộng trung bình một ký tự so với cỡ chữ (Hán ≈ 0,95; Latin ≈ 0,55) */
  charWidth: number;
}

/** Chữ thư pháp vàng khổng lồ hiện theo nét bút lông rồi tan thành bụi vàng */
export function brushCalligraphy(
  e: FxEngine,
  text: string,
  at: Pt,
  size: number,
  dur: number,
  tint: [string, string],
  font: string = CALLIG,
  charWidth = 0.95,
) {
  const width = size * text.length * charWidth;
  e.actor(dur, (ctx, p) => {
    const reveal = easeOutCubic(seg(p, 0.05, 0.45));
    const alpha = bell(p, 0.08, 0.7);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * 0.9;
    ctx.beginPath();
    ctx.rect(at.x - width / 2 - 20, at.y - size, (width + 40) * reveal, size * 2);
    ctx.clip();
    ctx.font = `${size}px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const g = ctx.createLinearGradient(0, at.y - size / 2, 0, at.y + size / 2);
    g.addColorStop(0, tint[0]);
    g.addColorStop(0.55, tint[1]);
    g.addColorStop(1, '#8a5a12');
    ctx.shadowColor = tint[1];
    ctx.shadowBlur = 28;
    ctx.fillStyle = g;
    ctx.translate(at.x, at.y);
    ctx.scale(1 + p * 0.08, 1 + p * 0.08);
    ctx.fillText(text, 0, 0);
    ctx.restore();
    if (reveal < 1) {
      const bx = at.x - width / 2 - 20 + (width + 40) * reveal;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const bg = ctx.createRadialGradient(bx, at.y, 0, bx, at.y, size * 0.6);
      bg.addColorStop(0, 'rgba(255,240,200,0.55)');
      bg.addColorStop(1, 'rgba(255,200,90,0)');
      ctx.fillStyle = bg;
      ctx.fillRect(bx - size, at.y - size, size * 2, size * 2);
      ctx.restore();
    }
  });
  e.later(dur * 0.62, () => {
    for (let i = 0; i < 40; i++) {
      e.add({
        x: at.x + (Math.random() - 0.5) * width,
        y: at.y + (Math.random() - 0.5) * size * 0.8,
        vx: (Math.random() - 0.5) * 30,
        vy: -30 - Math.random() * 60,
        size: 1.5 + Math.random() * 2,
        color: Math.random() < 0.5 ? tint[0] : tint[1],
        max: 0.8 + Math.random() * 0.8,
        kind: 'dot',
        drag: 0.99,
      });
    }
  });
}

/** Tia sáng tỏa ra từ một điểm (xoay chậm); màu mặc định vàng */
export function lightRays(e: FxEngine, at: Pt, dur: number, n = 14, len = 420, rgb: [number, number, number] = [255, 230, 160]) {
  e.actor(dur, (ctx, p) => {
    const a = bell(p, 0.15, 0.6);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(at.x, at.y);
    ctx.rotate(p * 0.6);
    const g = ctx.createRadialGradient(0, 0, 10, 0, 0, len);
    g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${0.55 * a})`);
    g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
    ctx.fillStyle = g;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2;
      const w = 0.06 + (i % 3) * 0.03;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, len * (0.7 + (i % 2) * 0.3), ang - w, ang + w);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  });
}

/** Mực loang: vết mực đen viền sáng nở ra rồi mờ dần */
export function inkSplash(e: FxEngine, at: Pt, size: number, dur: number, edge = '#ffcf5a', ink = '#2a170a') {
  const blobs = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2 + Math.random() * 0.5;
    const d = size * (0.25 + Math.random() * 0.45);
    return { x: Math.cos(a) * d, y: Math.sin(a) * d, r: size * (0.18 + Math.random() * 0.22), delay: Math.random() * 0.15 };
  });
  const drops = Array.from({ length: 14 }, () => {
    const a = Math.random() * Math.PI * 2;
    const d = size * (0.6 + Math.random() * 0.7);
    return { x: Math.cos(a) * d, y: Math.sin(a) * d, r: 2 + Math.random() * 5 };
  });
  e.actor(dur, (ctx, p) => {
    const grow = easeOutCubic(seg(p, 0, 0.3));
    const alpha = bell(p, 0.1, 0.55) * 0.7;
    // Gom mọi vết mực vào MỘT đường rồi tô một lần (bóng/blur chỉ tính một lần)
    ctx.save();
    ctx.translate(at.x, at.y);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = ink;
    ctx.shadowColor = edge;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.42 * grow, 0, Math.PI * 2);
    for (const b of blobs) {
      const g = easeOutCubic(seg(p, b.delay, b.delay + 0.3));
      if (g <= 0) continue;
      ctx.moveTo(b.x * g + b.r * g, b.y * g);
      ctx.arc(b.x * g, b.y * g, b.r * g, 0, Math.PI * 2);
    }
    const gd = easeOutCubic(seg(p, 0.1, 0.4));
    if (gd > 0) {
      for (const d of drops) {
        ctx.moveTo(d.x * gd + d.r * gd, d.y * gd);
        ctx.arc(d.x * gd, d.y * gd, d.r * gd, 0, Math.PI * 2);
      }
    }
    ctx.fill();
    ctx.restore();
  });
}

/** Sét đánh từ mép trên xuống một điểm; `eerie` = sét xanh ma */
export function lightning(e: FxEngine, at: Pt, dur = 0.5, eerie = false) {
  const glowC = eerie ? '#8cf5cf' : '#ffe9a0';
  const boltC = eerie ? 'rgba(180,255,230,0.9)' : 'rgba(255,225,140,0.9)';
  const flashC = eerie ? 'rgba(200,255,235,0.5)' : 'rgba(255,244,210,0.55)';
  const bolts = Array.from({ length: 3 }, (_, k) => {
    const pts: Pt[] = [];
    let x = at.x + (k - 1) * 120 + (Math.random() - 0.5) * 80;
    let y = -10;
    pts.push({ x, y });
    while (y < at.y - 20) {
      y += 30 + Math.random() * 30;
      x += (at.x - x) * 0.3 + (Math.random() - 0.5) * 60;
      pts.push({ x, y });
    }
    pts.push(at);
    return pts;
  });
  e.actor(dur, (ctx, p) => {
    const flicker = Math.sin(p * 40) > -0.2 ? 1 : 0.3;
    const alpha = (1 - seg(p, 0.5, 1)) * flicker;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const b of bolts) {
      ctx.shadowColor = glowC;
      ctx.shadowBlur = 22;
      ctx.strokeStyle = boltC;
      ctx.lineWidth = 6;
      ctx.beginPath();
      b.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  });
  e.flash(flashC, 0.12);
  e.later(0.16, () => e.flash(flashC, 0.1));
}

/** Tro lửa bay lên khắp bàn (`ghost` = lửa ma xanh tím) */
function embers(e: FxEngine, n: number, dur: number, ghost = false) {
  for (let i = 0; i < n; i++) {
    e.later(Math.random() * dur, () =>
      e.add({
        x: Math.random() * BW,
        y: BH * 0.4 + Math.random() * BH * 0.6,
        vx: (Math.random() - 0.5) * 30,
        vy: -40 - Math.random() * 70,
        size: 1.5 + Math.random() * 2.5,
        color: ghost ? (Math.random() < 0.5 ? '#8cf5cf' : '#a78bfa') : Math.random() < 0.5 ? '#ffb347' : '#ff7a2d',
        max: 1.2 + Math.random() * 1.2,
        kind: 'dot',
        drag: 0.995,
      }),
    );
  }
}

/* ------------------------------------------------------------------ */
/* Quân lao vào Tướng (bậc Cơ bản)                                    */
/* ------------------------------------------------------------------ */

interface StrikeOpts {
  from: Pt;
  king: Pt;
  /** Điểm trung gian (chân Mã) */
  via?: Pt;
  /** Độ cao vòng cung (Pháo bay qua ngòi) */
  arc: number;
  piece: PieceName;
  side: 'red' | 'black';
  /** Chữ trên quân đang đánh và trên Tướng (theo bộ quân đang dùng) */
  glyph: string;
  kingGlyph: string;
  kingRed: boolean;
  label: LabelStyle;
  dur: number;
  /** Thời điểm chạm (0..1) */
  hit: number;
  fire?: boolean;
}

function pathPoint(o: StrikeOpts, t: number): Pt {
  const stop = { x: lerp(o.from.x, o.king.x, 0.82), y: lerp(o.from.y, o.king.y, 0.82) };
  if (o.via) {
    const a = t < 0.5 ? o.from : o.via;
    const b = t < 0.5 ? o.via : { x: lerp(o.via.x, o.king.x, 0.75), y: lerp(o.via.y, o.king.y, 0.75) };
    const tt = t < 0.5 ? t * 2 : (t - 0.5) * 2;
    return { x: lerp(a.x, b.x, tt), y: lerp(a.y, b.y, tt) - Math.sin(tt * Math.PI) * 38 };
  }
  return { x: lerp(o.from.x, stop.x, t), y: lerp(o.from.y, stop.y, t) - Math.sin(t * Math.PI) * o.arc };
}

/** Tướng bị đánh: rung lên và phát sáng lúc trúng đòn */
function kingReact(e: FxEngine, o: { king: Pt; kingGlyph: string; kingRed: boolean; label: LabelStyle; dur: number; hit: number }) {
  e.actor(o.dur, (ctx, p) => {
    const kShake = p > o.hit ? Math.sin(p * 90) * 4 * (1 - seg(p, o.hit, o.hit + 0.3)) : 0;
    ctx.save();
    ctx.globalAlpha = bell(p, 0.1, 0.85);
    drawDisc(ctx, o.king.x + kShake, o.king.y, 27, o.kingGlyph, o.kingRed, p > o.hit ? 1 - seg(p, o.hit, o.hit + 0.4) : 0.2, o.label);
    ctx.restore();
  });
}

function impact(e: FxEngine, at: Pt, tint: [string, string], strength: number, fire: boolean, tier: FxTier = 'basic') {
  e.flash(tier === 'legendary' ? 'rgba(200,255,235,0.4)' : tier === 'silver' ? 'rgba(235,240,250,0.45)' : 'rgba(255,236,190,0.45)', 0.18);
  e.ring(at.x, at.y, tint[1], 0.6, 150 * strength, 6);
  e.ring(at.x, at.y, '#ffffff', 0.35, 80 * strength, 3);
  if (strength > 1) e.ring(at.x, at.y, tint[0], 0.9, 240 * strength, 2);
  e.burst(at.x, at.y, Math.round(20 * strength) + 10, [tint[0], tint[1], '#ffffff'], 300, { kind: 'spark', max: 0.55 });
  if (fire) {
    const fc = fireColors(tier);
    e.burst(at.x, at.y, 30, tier === 'basic' || tier === 'gold' ? ['#ff7a2d', '#ffd36b', '#5a2a10'] : [fc[1], fc[0], tint[1]], 220, { kind: 'dot', max: 0.9, gravity: -40 });
  }
  if (tier === 'legendary') ghostFlames(e, at, 26, 50);
}

function discStrike(e: FxEngine, o: StrikeOpts) {
  const tint = TINT[o.piece];
  const glyph = o.glyph;
  const red = o.side === 'red';
  const history: Pt[] = [];
  kingReact(e, o);
  e.actor(o.dur, (ctx, p) => {
    const lift = easeOutBack(seg(p, 0, 0.14));
    const t = o.via ? easeOutCubic(seg(p, 0.14, o.hit)) : easeInCubic(seg(p, 0.14, o.hit));
    const pos = pathPoint(o, t);
    const recoil = p > o.hit ? Math.sin(seg(p, o.hit, o.hit + 0.18) * Math.PI) * 10 : 0;
    const fade = 1 - seg(p, 0.82, 1);
    if (p < o.hit) history.push(pos);
    if (history.length > 14) history.shift();
    if (history.length > 1) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const first = history[0]!;
      const last = history[history.length - 1]!;
      const g = ctx.createLinearGradient(first.x, first.y, last.x, last.y);
      g.addColorStop(0, 'rgba(255,200,90,0)');
      g.addColorStop(1, o.fire ? 'rgba(255,140,40,0.95)' : 'rgba(255,225,150,0.9)');
      ctx.strokeStyle = g;
      ctx.shadowColor = tint[1];
      ctx.shadowBlur = 24;
      ctx.lineWidth = o.fire ? 22 : 16;
      ctx.globalAlpha = fade * (p < o.hit + 0.1 ? 1 : 1 - seg(p, o.hit + 0.1, 0.8));
      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      for (const h of history) ctx.lineTo(h.x, h.y);
      ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    for (let i = 0; i < history.length - 1; i += 3) {
      const h = history[i]!;
      ctx.globalAlpha = (0.08 + (i / history.length) * 0.22) * fade;
      drawDisc(ctx, h.x, h.y - lift * 6, 30, glyph, red, 0, o.label);
    }
    ctx.restore();
    const ux = o.king.x - o.from.x;
    const uy = o.king.y - o.from.y;
    const len = Math.hypot(ux, uy) || 1;
    ctx.save();
    ctx.globalAlpha = fade;
    drawDisc(ctx, pos.x - (ux / len) * recoil, pos.y - (uy / len) * recoil - lift * 6, 30 + lift * 3, glyph, red, 0.9, o.label);
    ctx.restore();
  });
  if (o.fire) fireTrail(e, o);
  e.later(o.dur * o.hit, () => impact(e, o.king, tint, 1, !!o.fire));
}

function fireTrail(e: FxEngine, o: StrikeOpts) {
  for (let i = 0; i < 18; i++) {
    const t = i / 18;
    e.later(o.dur * (0.14 + (o.hit - 0.14) * Math.cbrt(t)), () => {
      const pt = pathPoint(o, t);
      e.add({
        x: pt.x,
        y: pt.y,
        vx: (Math.random() - 0.5) * 40,
        vy: -20 - Math.random() * 30,
        size: 4 + Math.random() * 4,
        color: i % 2 ? '#ffb347' : '#ff5a1f',
        max: 0.5,
        kind: 'dot',
      });
    });
  }
}

/* ------------------------------------------------------------------ */
/* Hồn quân lao vào Tướng (Bạc / Vàng / Huyền thoại)                   */
/* ------------------------------------------------------------------ */

type HighTier = Exclude<FxTier, 'basic'>;

function spiritKindFor(piece: PieceName, tier: HighTier): SpiritKind {
  switch (piece) {
    case 'chariot':
      return 'chariot';
    case 'horse':
      return tier === 'legendary' ? 'rider' : 'horse';
    case 'cannon':
      return tier === 'legendary' ? 'cannonDragon' : 'cannon';
    case 'king':
      return tier === 'legendary' ? 'rider' : 'soldier';
    default:
      return 'soldier';
  }
}

/**
 * Tư thế theo hướng lao (dx, dy trên màn hình):
 * - ngang/chéo: nhìn ngang, lật trái/phải, nghiêng nhẹ theo dốc;
 * - lao xuống (về phía người xem): tư thế "front", hình to dần;
 * - lao lên (ra xa): tư thế "back", hình nhỏ dần.
 * Chưa có tranh front/back thì drawSpirit tự dùng tranh nhìn ngang (vẫn có hiệu ứng xa gần).
 */
function orient(dx: number, dy: number): { facing: 1 | -1; rot: number; pose: SpiritPose; depth: [number, number] } {
  const facing: 1 | -1 = dx >= 0 ? 1 : -1;
  if (Math.abs(dx) >= Math.abs(dy) * 0.6) {
    return { facing, rot: Math.atan2(dy, Math.abs(dx)) * facing * 0.6, pose: 'side', depth: [1, 1] };
  }
  const toward = dy > 0;
  return {
    facing,
    rot: Math.atan2(dx, Math.abs(dy)) * -0.15 * (toward ? 1 : -1),
    pose: toward ? 'front' : 'back',
    depth: toward ? [0.8, 1.2] : [1.15, 0.8],
  };
}

interface SpiritStrikeOpts extends StrikeOpts {
  tier: HighTier;
  zoom?: (at: Pt) => void;
}

function spiritStrike(e: FxEngine, o: SpiritStrikeOpts) {
  const tint = tintFor(o.piece, o.tier);
  const style = STYLE[o.tier];
  const dust = o.tier === 'silver' ? 'rgba(230,235,245,0.7)' : o.tier === 'legendary' ? 'rgba(140,245,207,0.6)' : 'rgba(255,205,110,0.7)';
  const kind = spiritKindFor(o.piece, o.tier);
  const scale = (o.tier === 'silver' ? 150 : o.tier === 'gold' ? 170 : 190) / spiritWidth(kind);
  const dx = o.king.x - o.from.x;
  const dy = o.king.y - o.from.y;
  const { facing, rot, pose, depth } = orient(dx, dy);
  const history: { p: Pt; ph: number; k: number }[] = [];
  kingReact(e, o);

  if (kind === 'cannon' || kind === 'cannonDragon') {
    cannonSpirit(e, o, kind, style, scale, facing, pose);
  } else {
    e.actor(o.dur, (ctx, p) => {
      const appear = easeOutBack(seg(p, 0, 0.16));
      const t = o.via ? easeOutCubic(seg(p, 0.16, o.hit)) : easeInOut(seg(p, 0.16, o.hit));
      const pos = pathPoint(o, t);
      const fade = 1 - seg(p, 0.8, 1);
      const phase = p * (kind === 'chariot' ? 5 : 4);
      const settle = p > o.hit ? 1 - seg(p, o.hit, o.hit + 0.25) : 1;
      const bob = kind === 'soldier' ? Math.abs(Math.sin(phase * Math.PI * 2)) * 4 : 0;
      // Xa gần: to/nhỏ dần theo quãng đường khi lao tới/ra xa người xem
      const k = lerp(depth[0], depth[1], t);
      if (p < o.hit) history.push({ p: pos, ph: phase, k });
      if (history.length > 12) history.shift();
      // Bóng mờ chuyển động (Vàng trở lên)
      if (o.tier !== 'silver') {
        for (let i = 0; i < history.length - 2; i += 3) {
          const h = history[i]!;
          drawSpirit(ctx, kind, h.p.x, h.p.y, scale * appear * h.k, facing, { phase: h.ph, pose }, { ...style, alpha: 0.12 + (i / history.length) * 0.2, glow: 0, eerie: false }, rot);
        }
      }
      drawSpirit(ctx, kind, pos.x, pos.y - bob, scale * appear * k * (1 + (1 - settle) * 0.1), facing, { phase, pose }, { ...style, alpha: style.alpha * fade, time: p * o.dur }, rot);
      // Lửa ma bốc lên từ hồn (Huyền thoại)
      if (style.eerie && p < o.hit && Math.random() < 0.7) ghostFlames(e, { x: pos.x, y: pos.y - bob }, 1, 70);
    });
    // Bụi dưới chân
    const n = o.tier === 'silver' ? 6 : 12;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      e.later(o.dur * (0.16 + (o.hit - 0.16) * t), () => {
        const pt = pathPoint(o, t);
        for (let k = 0; k < 3; k++)
          e.add({
            x: pt.x + (Math.random() - 0.5) * 30,
            y: pt.y + 24,
            vx: (Math.random() - 0.5) * 60 - dx * 0.05,
            vy: -20 - Math.random() * 30,
            size: 3 + Math.random() * 4,
            color: dust,
            max: 0.6,
            kind: 'dot',
          });
      });
    }
    e.later(o.dur * o.hit, () => {
      impact(e, o.king, tint, o.tier === 'silver' ? 1.2 : 1.6, false, o.tier);
      // Hồn quân tan thành bụi
      e.burst(o.king.x, o.king.y, o.tier === 'silver' ? 24 : 48, [style.colors[0], style.colors[1]], 200, { kind: 'dot', max: 0.9, gravity: -30 });
    });
  }

  if (o.tier !== 'silver') {
    e.later(o.dur * o.hit, () => {
      if (o.tier === 'legendary') inkSplash(e, o.king, 110, 1.2, '#8cf5cf', '#12052a');
      else inkSplash(e, o.king, 110, 1.2);
      o.zoom?.(o.king);
    });
  }
  if (o.tier === 'legendary') {
    ghostFog(e, o.dur + 0.4, 1);
    e.later(o.dur * o.hit - 0.05, () => lightning(e, o.king, 0.5, true));
    embers(e, 40, o.dur, true);
  }
}

/** Khẩu pháo (hồn) đứng tại chỗ, nâng nòng rồi bắn đạn lửa vòng cung vào Tướng */
function cannonSpirit(e: FxEngine, o: SpiritStrikeOpts, kind: SpiritKind, style: SpiritStyle, scale: number, facing: 1 | -1, pose: SpiritPose = 'side') {
  const dx = o.king.x - o.from.x;
  const dy = o.king.y - o.from.y;
  const aim = Math.atan2(dy, Math.abs(dx) < 1 ? 1 : Math.abs(dx)) * (facing === 1 ? 1 : 1);
  const FIRE = 0.3;
  const muzzleLocal = spriteMuzzle(kind, style, pose) ?? { x: -10 + Math.cos(aim) * 122, y: -26 + Math.sin(aim) * 122 };
  const muzzle = { x: o.from.x + muzzleLocal.x * scale * facing, y: o.from.y + muzzleLocal.y * scale };
  const flight = (t: number): Pt => ({
    x: lerp(muzzle.x, o.king.x, t),
    y: lerp(muzzle.y, o.king.y, t) - Math.sin(t * Math.PI) * o.arc,
  });
  const fc = fireColors(o.tier);
  e.actor(o.dur, (ctx, p) => {
    const appear = easeOutBack(seg(p, 0, 0.16));
    const fade = 1 - seg(p, 0.8, 1);
    const recoil = p > FIRE ? Math.max(0, 1 - seg(p, FIRE, FIRE + 0.22)) : 0;
    const flash = p > FIRE ? Math.max(0, 1 - seg(p, FIRE, FIRE + 0.12)) : 0;
    drawSpirit(ctx, kind, o.from.x, o.from.y, scale * appear, facing, { phase: p, aim, recoil, pose }, { ...style, alpha: style.alpha * fade, time: p * o.dur });
    if (style.eerie && p < o.hit && Math.random() < 0.5) ghostFlames(e, o.from, 1, 90);
    if (flash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = flash;
      const g = ctx.createRadialGradient(muzzle.x, muzzle.y, 0, muzzle.x, muzzle.y, 60);
      g.addColorStop(0, fc[0]);
      g.addColorStop(0.35, fc[1]);
      g.addColorStop(1, fc[2]);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(muzzle.x, muzzle.y, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Đạn lửa
    if (p > FIRE && p < o.hit) {
      const t = easeInCubic(seg(p, FIRE, o.hit));
      const b = flight(t);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, 22);
      g.addColorStop(0, fc[0]);
      g.addColorStop(0.4, fc[1]);
      g.addColorStop(1, fc[2]);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });
  e.later(o.dur * FIRE, () => {
    e.burst(muzzle.x, muzzle.y, 16, [fc[1], fc[0]], 180);
    for (let i = 0; i < 8; i++)
      e.add({ x: muzzle.x, y: muzzle.y, vx: (Math.random() - 0.5) * 50, vy: -30 - Math.random() * 30, size: 9, color: style.eerie ? 'rgba(120,90,180,0.45)' : 'rgba(120,110,100,0.5)', max: 1, kind: 'dot', drag: 0.96 });
  });
  for (let i = 0; i < 20; i++) {
    const t = i / 20;
    e.later(o.dur * (FIRE + (o.hit - FIRE) * Math.cbrt(t)), () => {
      const pt = flight(t);
      e.add({ x: pt.x, y: pt.y, vx: (Math.random() - 0.5) * 40, vy: -10, size: 5, color: i % 2 ? fc[1] : fc[0], max: 0.45, kind: 'dot' });
    });
  }
  e.later(o.dur * o.hit, () => {
    impact(e, o.king, tintFor('cannon', o.tier), o.tier === 'silver' ? 1.3 : 1.8, true, o.tier);
    for (let i = 0; i < 10; i++)
      e.add({ x: o.king.x, y: o.king.y, vx: (Math.random() - 0.5) * 60, vy: -30 - Math.random() * 40, size: 12, color: style.eerie ? 'rgba(90,60,140,0.5)' : 'rgba(90,80,70,0.55)', max: 1.2, kind: 'dot', drag: 0.96 });
  });
}

/* ------------------------------------------------------------------ */
/* Đòn chiếu theo quân                                                */
/* ------------------------------------------------------------------ */

export interface CheckFxInput {
  piece: PieceName;
  side: 'red' | 'black';
  from: Pt;
  king: Pt;
  leg?: Pt;
  tier: FxTier;
  /** Chữ theo bộ quân đang dùng (mặc định chữ Hán) */
  labels?: { piece: string; king: string; style: LabelStyle };
  /** Chữ thư pháp lớn (mặc định chữ Hán giản thể của quân) */
  spirit?: SpiritText;
  /** Phóng to bàn cờ về một điểm (Vàng trở lên) */
  zoom?: (at: Pt) => void;
}

/** Cỡ chữ thư pháp lớn sao cho vừa bề ngang bàn */
function fitSize(preferred: number, text: string, charWidth: number, maxWidth = BW - 40): number {
  return Math.min(preferred, maxWidth / Math.max(1, text.length * charWidth));
}

/** Vị trí đặt chữ thư pháp: giữa đường đánh, tránh sát mép */
function spiritSpot(from: Pt, king: Pt): Pt {
  return { x: BW / 2, y: Math.max(170, Math.min(BH - 170, (from.y + king.y) / 2)) };
}

export function checkStrike(e: FxEngine, input: CheckFxInput) {
  const { piece, side, from, king, tier } = input;
  const kingRed = side !== 'red';
  const kingGlyph = input.labels?.king ?? (kingRed ? '帥' : '將');
  const glyph = input.labels?.piece ?? GLYPH[side][piece];
  const label = input.labels?.style ?? HAN_LABEL;
  const dur = piece === 'cannon' ? 1.7 : piece === 'horse' ? 1.6 : 1.4;
  cinematicDim(e, dur + 0.2, tier === 'basic' ? 0.55 : tier === 'silver' ? 0.65 : tier === 'gold' ? 0.75 : 0.85, king, tier === 'legendary');
  const sp = input.spirit ?? { text: SPIRIT[piece], font: CALLIG, charWidth: 0.95 };
  brushCalligraphy(
    e,
    sp.text,
    spiritSpot(from, king),
    fitSize(piece === 'cannon' ? 230 : 210, sp.text, sp.charWidth),
    dur + 0.3,
    tintFor(piece, tier),
    sp.font,
    sp.charWidth,
  );
  const base: StrikeOpts = {
    from,
    king,
    via: piece === 'horse' ? input.leg : undefined,
    arc: piece === 'cannon' ? 130 : piece === 'soldier' ? 10 : 0,
    piece,
    side,
    glyph,
    kingGlyph,
    kingRed,
    label,
    dur,
    hit: piece === 'cannon' ? 0.58 : piece === 'horse' ? 0.6 : 0.5,
    fire: piece === 'cannon',
  };
  if (tier === 'basic') discStrike(e, base);
  else spiritStrike(e, { ...base, tier, zoom: input.zoom });
}

/* ------------------------------------------------------------------ */
/* Chiếu bí                                                           */
/* ------------------------------------------------------------------ */

export interface MateFxInput {
  king: Pt;
  loser: 'red' | 'black';
  tier: FxTier;
  mateId?: string | null;
  /** Chữ trên Tướng theo bộ quân đang dùng */
  kingLabel?: { glyph: string; style: LabelStyle };
  /** Chữ thư pháp lớn (mặc định "绝杀") */
  spirit?: SpiritText;
  zoom?: (at: Pt) => void;
  tint?: () => void;
}

/** Chiếu bí: tia sáng, chữ "绝杀" (tuyệt sát), Tướng nứt vỡ làm đôi; bậc cao thêm mực loang, rồng bay */
export function mateFinale(e: FxEngine, input: MateFxInput) {
  const { king, loser, tier } = input;
  const dur = 3;
  cinematicDim(e, dur, tier === 'basic' ? 0.5 : tier === 'legendary' ? 0.88 : 0.8, king, tier === 'legendary');
  if (tier === 'silver') lightRays(e, king, dur, 14, 420, [235, 240, 250]);
  else if (tier !== 'basic') lightRays(e, king, dur, tier === 'legendary' ? 22 : 14, tier === 'legendary' ? 560 : 420);
  kingSplit(e, king, loser, tier, input.kingLabel);
  const sp = input.spirit ?? { text: '绝杀', font: CALLIG, charWidth: 0.95 };
  e.later(0.35, () =>
    brushCalligraphy(
      e,
      sp.text,
      { x: BW / 2, y: BH / 2 + (king.y < BH / 2 ? 30 : -30) },
      fitSize(170, sp.text, sp.charWidth),
      dur - 0.35,
      tier === 'silver' ? ['#ffffff', '#c9d3de'] : ['#fff6d8', '#ffc94a'],
      sp.font,
      sp.charWidth,
    ),
  );
  if (tier === 'gold' || tier === 'legendary') {
    e.later(1.1, () => {
      if (tier === 'legendary') inkSplash(e, king, 105, 1.6, '#8cf5cf', '#12052a');
      else inkSplash(e, king, 105, 1.6);
      input.zoom?.(king);
    });
    embers(e, 60, dur, tier === 'legendary');
  }
  if (tier === 'legendary') {
    input.tint?.();
    ghostFog(e, dur, 1.2);
    e.later(0.2, () => dragonFlight(e, king, 3.4));
    e.later(1.15, () => lightning(e, king, 0.6, true));
    e.later(0.6, () => ghostFlames(e, king, 40, 80));
  }
}

/** Rồng vàng mập lượn chữ S ngang qua bàn cờ, vòng qua Tướng rồi bay lên */
function dragonFlight(e: FxEngine, center: Pt, dur: number) {
  const trail: Pt[] = [];
  const style: SpiritStyle = { colors: ['#fff9e4', '#ffd45c', '#d8760f'], glow: 1, alpha: 1 };
  const fromLeft = center.x >= BW / 2;
  e.actor(dur, (ctx, p) => {
    const alpha = bell(p, 0.08, 0.85);
    // Bay từ góc dưới (trái hoặc phải) lên góc trên đối diện, uốn sóng, ghé qua Tướng ở giữa quãng
    const t = easeInOut(p);
    const sx = fromLeft ? -60 : BW + 60;
    const ex = fromLeft ? BW + 60 : -60;
    const baseX = lerp(sx, ex, t);
    const baseY = lerp(BH + 40, -60, t);
    const wave = Math.sin(t * Math.PI * 2.5) * 110;
    const pull = Math.exp(-Math.pow((t - 0.5) / 0.18, 2)); // hút về phía Tướng ở giữa quãng
    const head = {
      x: lerp(baseX, center.x, pull * 0.8) + wave * (1 - pull),
      y: lerp(baseY, center.y, pull * 0.8),
    };
    trail.push(head);
    if (trail.length > 40) trail.shift();
    ctx.save();
    ctx.globalAlpha = alpha;
    drawDragon(ctx, trail, 34, style, p * dur);
    ctx.restore();
    // Bụi vàng rơi từ thân rồng
    if (trail.length > 3 && Math.random() < 0.6) {
      const q = trail[Math.floor(Math.random() * (trail.length - 1))]!;
      e.add({ x: q.x, y: q.y, vx: (Math.random() - 0.5) * 40, vy: 20 + Math.random() * 40, size: 2, color: '#ffd45c', max: 0.8, kind: 'dot' });
    }
  });
}

/** Tướng bên thua nứt rồi vỡ làm đôi */
export function kingSplit(e: FxEngine, king: Pt, loser: 'red' | 'black', tier: FxTier, kingLabel?: { glyph: string; style: LabelStyle }) {
  const glyph = kingLabel?.glyph ?? (loser === 'red' ? '帥' : '將');
  const label = kingLabel?.style ?? HAN_LABEL;
  const red = loser === 'red';
  const big = tier === 'basic' ? 1.4 : 1.9;
  e.actor(2.2, (ctx, p) => {
    const grow = easeOutBack(seg(p, 0, 0.15));
    const crack = seg(p, 0.15, 0.35);
    const split = easeInCubic(seg(p, 0.38, 1));
    const shake = p < 0.38 ? Math.sin(p * 140) * 3 * crack : 0;
    const r = 27 * (1 + (big - 1) * grow);
    const fade = 1 - seg(p, 0.78, 1);
    const half = (dir: -1 | 1) => {
      ctx.save();
      ctx.translate(king.x + shake + dir * split * 50, king.y + split * split * 150);
      ctx.rotate(dir * split * 1.0);
      ctx.beginPath();
      ctx.rect(dir < 0 ? -r * 1.5 : 0, -r * 1.5, r * 1.5, r * 3);
      ctx.clip();
      drawDisc(ctx, 0, 0, r, glyph, red, 1 - split, label);
      if (crack > 0) {
        ctx.strokeStyle = '#1a0d04';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ffb347';
        ctx.shadowBlur = 12;
        const pts: [number, number][] = [
          [1, -r * 1.1],
          [-6, -r * 0.55],
          [5, -r * 0.1],
          [-4, r * 0.3],
          [2, r * 0.8],
        ];
        const n = Math.max(2, Math.ceil(pts.length * crack));
        ctx.beginPath();
        ctx.moveTo(pts[0]![0], pts[0]![1]);
        for (let i = 1; i < n; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
        ctx.stroke();
      }
      ctx.restore();
    };
    ctx.save();
    ctx.globalAlpha = fade;
    half(-1);
    half(1);
    ctx.restore();
  });
  e.later(2.2 * 0.38, () => {
    e.flash('rgba(255,240,200,0.6)', 0.25);
    e.ring(king.x, king.y, '#ffd36b', 0.9, 260, 7);
    e.burst(king.x, king.y, 36, ['#f0d49a', '#fff6dc', '#ffd36b'], 260, { kind: 'shard', gravity: 420 });
  });
}
