import { useEffect, useRef, type RefObject } from 'react';
import type { GameEvent, PieceName } from '@np/rules';
import { BOARD_W, VIEW_H, squareCenter } from '../board/Board';
import type { FxTier } from '../lib/cosmetics';
import { useSettings } from '../lib/settings';
import { sfx } from '../lib/sound';
import { checkStrike, mateFinale, type LabelStyle } from './sprites';
import { pieceLabel } from '../board/pieces';
import type { PieceSetId } from '../lib/cosmetics';

/** Cách vẽ chữ trên quân trong hiệu ứng, theo bộ quân đang dùng */
function labelStyleFor(set: PieceSetId, text: string): LabelStyle {
  switch (set) {
    case 'viet':
      return {
        family: "'Pattaya', 'Sriracha', 'Segoe Script', cursive",
        scale: text.length >= 5 ? 0.62 : text.length === 4 ? 0.7 : 0.82,
      };
    case 'icon':
      return { family: "'Segoe UI Symbol', 'Noto Sans Symbols 2', 'DejaVu Sans', sans-serif", scale: 1.05 };
    case 'gold':
      return { family: "'Ma Shan Zheng', 'Noto Serif SC', serif", scale: 1.15 };
    default:
      return { family: "'Noto Serif SC', 'SimSun', serif", scale: 1.1, weight: 'bold' };
  }
}

/* ------------------------------------------------------------------ */
/* Hệ hạt tối giản trên canvas 2D (thay PixiJS để nhẹ và miễn phí)     */
/* ------------------------------------------------------------------ */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  gravity: number;
  drag: number;
  kind: 'dot' | 'spark' | 'ring' | 'shard' | 'glyph';
  grow?: number;
  text?: string;
  rot?: number;
  vr?: number;
}

interface Stroke {
  pts: { x: number; y: number }[];
  color: string;
  width: number;
  t: number;
  dur: number;
  hold: number;
  glow: boolean;
  head?: boolean;
}

interface Flash {
  t: number;
  dur: number;
  color: string;
}

interface Scheduled {
  at: number;
  fn: () => void;
}

const TIER_SCALE: Record<FxTier, number> = { basic: 0.35, silver: 1, gold: 1.6, legendary: 2.2 };
const PIECE_COLOR: Record<PieceName, string> = {
  king: '#ffd36b',
  advisor: '#f5e6c4',
  elephant: '#f5e6c4',
  horse: '#e0a458',
  chariot: '#7fb2ff',
  cannon: '#ff7a3d',
  soldier: '#9be38f',
};

interface Actor {
  t: number;
  dur: number;
  draw: (ctx: CanvasRenderingContext2D, progress: number) => void;
}

export class FxEngine {
  actors: Actor[] = [];
  particles: Particle[] = [];
  strokes: Stroke[] = [];
  flashes: Flash[] = [];
  queue: Scheduled[] = [];
  time = 0;

  add(p: Partial<Particle> & { x: number; y: number }) {
    this.particles.push({ vx: 0, vy: 0, life: 0, max: 0.8, size: 3, color: '#fff', gravity: 0, drag: 0.98, kind: 'dot', ...p });
  }

  burst(x: number, y: number, n: number, colors: string[], speed = 180, opts: Partial<Particle> = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.7);
      this.add({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        color: colors[i % colors.length]!,
        size: 2 + Math.random() * 3,
        max: 0.5 + Math.random() * 0.7,
        kind: 'spark',
        ...opts,
      });
    }
  }

  ring(x: number, y: number, color: string, max = 0.6, grow = 160, width = 4) {
    this.add({ x, y, kind: 'ring', color, max, grow, size: width });
  }

  stroke(pts: { x: number; y: number }[], color: string, width: number, dur: number, hold = 0.25, glow = true, head = true) {
    this.strokes.push({ pts, color, width, t: 0, dur, hold, glow, head });
  }

  flash(color: string, dur = 0.25) {
    this.flashes.push({ t: 0, dur, color });
  }

  later(delay: number, fn: () => void) {
    this.queue.push({ at: this.time + delay, fn });
  }

  /** Hình minh họa động: `draw` nhận tiến độ 0..1 */
  actor(dur: number, draw: Actor['draw']) {
    this.actors.push({ t: 0, dur, draw });
  }

  get busy() {
    return (
      this.actors.length > 0 || this.particles.length > 0 || this.strokes.length > 0 || this.flashes.length > 0 || this.queue.length > 0
    );
  }

  step(dt: number) {
    this.time += dt;
    const due = this.queue.filter((q) => q.at <= this.time);
    this.queue = this.queue.filter((q) => q.at > this.time);
    due.forEach((q) => q.fn());
    for (const p of this.particles) {
      p.life += dt;
      p.vy += p.gravity * dt;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.vr) p.rot = (p.rot ?? 0) + p.vr * dt;
    }
    this.particles = this.particles.filter((p) => p.life < p.max);
    for (const a of this.actors) a.t += dt;
    this.actors = this.actors.filter((a) => a.t < a.dur);
    for (const s of this.strokes) s.t += dt;
    this.strokes = this.strokes.filter((s) => s.t < s.dur + s.hold + 0.3);
    for (const f of this.flashes) f.t += dt;
    this.flashes = this.flashes.filter((f) => f.t < f.dur);
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.clearRect(0, 0, w, h);
    for (const f of this.flashes) {
      ctx.globalAlpha = Math.max(0, 1 - f.t / f.dur) * 0.55;
      ctx.fillStyle = f.color;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.globalAlpha = 1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const s of this.strokes) {
      const prog = Math.min(1, s.t / s.dur);
      const fade = s.t > s.dur + s.hold ? Math.max(0, 1 - (s.t - s.dur - s.hold) / 0.3) : 1;
      const pts = partialPath(s.pts, prog);
      if (pts.length < 2) continue;
      ctx.globalAlpha = fade;
      if (s.glow) {
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 18;
      }
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.beginPath();
      ctx.moveTo(pts[0]!.x, pts[0]!.y);
      for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = Math.max(1, s.width / 3);
      ctx.stroke();
      if (s.head && prog < 1) {
        const hd = pts[pts.length - 1]!;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(hd.x, hd.y, s.width * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
    for (const a of this.actors) {
      ctx.save();
      try {
        a.draw(ctx, Math.min(1, a.t / a.dur));
      } catch (err) {
        console.error(err);
      }
      ctx.restore();
    }
    for (const p of this.particles) {
      const k = 1 - p.life / p.max;
      ctx.globalAlpha = Math.max(0, k);
      ctx.fillStyle = p.color;
      ctx.strokeStyle = p.color;
      switch (p.kind) {
        case 'ring': {
          ctx.lineWidth = p.size * k + 0.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, (p.grow ?? 100) * (p.life / p.max) + 4, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case 'spark': {
          ctx.lineWidth = p.size * 0.8;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
          ctx.stroke();
          break;
        }
        case 'shard': {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot ?? 0);
          ctx.beginPath();
          ctx.moveTo(-p.size, -p.size * 0.6);
          ctx.lineTo(p.size, 0);
          ctx.lineTo(-p.size * 0.4, p.size * 0.8);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          break;
        }
        case 'glyph': {
          ctx.font = `bold ${p.size}px "Noto Serif SC", serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.text ?? '', p.x, p.y);
          break;
        }
        default: {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (0.4 + 0.6 * k), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
  }
}

function partialPath(pts: { x: number; y: number }[], prog: number): { x: number; y: number }[] {
  if (prog >= 1) return pts;
  let total = 0;
  const segs: number[] = [];
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y);
    segs.push(d);
    total += d;
  }
  let remain = total * prog;
  const out = [pts[0]!];
  for (let i = 1; i < pts.length; i++) {
    const d = segs[i - 1]!;
    if (remain >= d) {
      out.push(pts[i]!);
      remain -= d;
    } else {
      const t = d ? remain / d : 0;
      out.push({ x: pts[i - 1]!.x + (pts[i]!.x - pts[i - 1]!.x) * t, y: pts[i - 1]!.y + (pts[i]!.y - pts[i - 1]!.y) * t });
      break;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */

export interface EffectCanvasProps {
  events: GameEvent[];
  stamp: number;
  flipped: boolean;
  /** Ghi đè bậc hiệu ứng (mặc định theo cài đặt) */
  tier?: FxTier;
  /** Tên sát cục nhận diện được (để có hiệu ứng riêng) */
  mateId?: string | null;
  /** Có thế cờ vừa nhận diện */
  patternStamp?: number;
  /** Ghi đè bộ quân (phòng thử); mặc định theo cài đặt */
  pieceSet?: PieceSetId;
  containerRef: RefObject<HTMLDivElement>;
}

const VIET_FONT = "'Pattaya', 'Sriracha', 'Segoe Script', cursive";

export function EffectCanvas(props: EffectCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef(new FxEngine());
  const rafRef = useRef<number | null>(null);
  const { effects, fxTier, pieceStyle: settingsPieceStyle } = useSettings();
  const pieceStyle = props.pieceSet ?? settingsPieceStyle;
  const tier = props.tier ?? fxTier;

  const ensureLoop = () => {
    if (rafRef.current !== null) return;
    let last = performance.now();
    const loop = (now: number) => {
      const canvas = canvasRef.current;
      const engine = engineRef.current;
      if (!canvas) {
        rafRef.current = null;
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      engine.step(dt);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const dpr = window.devicePixelRatio || 1;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const scale = canvas.clientWidth / BOARD_W;
        ctx.scale(scale, scale);
        engine.draw(ctx, BOARD_W, canvas.clientHeight / scale);
      }
      if (engine.busy) rafRef.current = requestAnimationFrame(loop);
      else {
        rafRef.current = null;
        ctx?.setTransform(1, 0, 0, 1, 0, 0);
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  // Nạp sẵn phông thư pháp cho chữ vàng (canvas không tự chờ web font)
  useEffect(() => {
    void document.fonts?.load('100px "Ma Shan Zheng"', '车马炮兵将士象绝杀');
    void document.fonts?.load('bold 30px "Noto Serif SC"', '帥仕相傌俥炮兵將士象馬車砲卒');
    void document.fonts?.load('20px "Pattaya"', 'TướngSĩTượngXePháoMãTốtTuyệt sát');
  }, []);

  // Đồng bộ kích thước canvas với khung bàn cờ
  useEffect(() => {
    const canvas = canvasRef.current;
    const box = props.containerRef.current;
    if (!canvas || !box) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(box.clientWidth * dpr);
      canvas.height = Math.round(box.clientHeight * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(box);
    return () => ro.disconnect();
  }, [props.containerRef]);

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  // Phản ứng với sự kiện ván cờ
  useEffect(() => {
    if (!effects || props.events.length === 0) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const e = engineRef.current;
    const k = TIER_SCALE[tier];
    const pos = (sq: number) => squareCenter(sq, props.flipped);
    const box = props.containerRef.current;
    const shake = (cls: string, ms: number) => {
      if (!box) return;
      box.classList.remove(cls);
      void box.offsetWidth;
      box.classList.add(cls);
      setTimeout(() => box.classList.remove(cls), ms);
    };
    /** Phóng chậm & phóng to bàn về một điểm (Vàng trở lên) */
    const zoom = (at: { x: number; y: number }, ms = 1100) => {
      if (!box) return;
      box.style.setProperty('--zoom-x', `${(at.x / BOARD_W) * 100}%`);
      box.style.setProperty('--zoom-y', `${(at.y / VIEW_H) * 100}%`);
      shake('fx-mate-zoom', ms);
    };

    for (const ev of props.events) {
      if (ev.type === 'capture') {
        const p = pos(ev.at);
        const n = Math.round((ev.piece === 'chariot' ? 26 : ev.piece === 'soldier' ? 10 : 18) * k) + 4;
        const color = PIECE_COLOR[ev.piece];
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2;
          const s = 60 + Math.random() * 140;
          e.add({
            x: p.x,
            y: p.y,
            vx: Math.cos(a) * s,
            vy: Math.sin(a) * s - 60,
            gravity: 420,
            kind: 'shard',
            size: 4 + Math.random() * 4,
            color: i % 2 ? '#f1dcb0' : color,
            max: 0.7 + Math.random() * 0.4,
            rot: Math.random() * 6,
            vr: (Math.random() - 0.5) * 12,
          });
        }
        if (tier !== 'basic') e.ring(p.x, p.y, color, 0.45, 70, 3);
      }
      if (ev.type === 'soldierCrossed') {
        const p = pos(ev.at);
        for (let i = 0; i < 3; i++) e.later(i * 0.15, () => e.ring(p.x, p.y, 'rgba(120,200,255,0.9)', 0.9, 60 + 30 * k, 2));
      }
      if (ev.type === 'reveal') {
        const p = pos(ev.at);
        e.burst(p.x, p.y, Math.round(14 * k) + 4, ['#ffe29a', '#fff'], 120);
        e.ring(p.x, p.y, '#ffe29a', 0.5, 50, 3);
      }
      if (ev.type === 'check') {
        const king = pos(ev.kingSquare);
        ev.checkers.forEach((sq, i) => {
          const from = pos(sq);
          const piece = ev.by[i] ?? 'chariot';
          const delay = i * 0.35;
          e.later(delay, () => checkEffect(e, piece, from, king, sq, ev.kingSquare, props.flipped, tier, ev.side, zoom, pieceStyle));
        });
        // rung bàn đúng lúc quân đánh trúng Tướng
        if (tier !== 'basic') setTimeout(() => shake('fx-shake', 350), 750);
        if (tier === 'legendary') sfx.ghost();
      }
      if (ev.type === 'perpetualCheckWarning') {
        e.flash('rgba(255,170,0,0.6)', 0.4);
      }
    }

    const mate = props.events.find((x) => x.type === 'checkmate');
    const check = props.events.find((x) => x.type === 'check');
    if (mate && check && check.type === 'check') {
      const king = pos(check.kingSquare);
      // Sau khi đòn chiếu trúng: màn chiếu bí (tia sáng, chữ "绝杀", Tướng vỡ đôi; bậc cao thêm mực loang, rồng bay)
      e.later(0.95, () =>
        mateFinale(e, {
          king,
          loser: check.side === 'red' ? 'black' : 'red',
          tier,
          mateId: props.mateId,
          kingLabel: (() => {
            const glyph = pieceLabel(pieceStyle, 'king', check.side !== 'red');
            return { glyph, style: labelStyleFor(pieceStyle, glyph) };
          })(),
          spirit: pieceStyle === 'viet' ? { text: 'Tuyệt sát', font: VIET_FONT, charWidth: 0.55 } : undefined,
          zoom: (at) => zoom(at, 1600),
          tint: () => shake('fx-tint', 2800),
        }),
      );
      e.later(0.95, () => {
        if (tier === 'gold' || tier === 'legendary') {
          for (let i = 0; i < 6; i++) {
            e.later(0.6 + i * 0.28, () => {
              const x = 60 + Math.random() * (BOARD_W - 120);
              const y = 60 + Math.random() * 480;
              e.burst(x, y, 36, ['#ffd36b', '#fff1c8', '#ffb347', '#ffffff'], 220, { gravity: 120, max: 1.2 });
            });
          }
          sfx.fanfare();
        }
      });
    }
    ensureLoop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.stamp]);

  // Thế cờ vừa nhận diện: rắc kim tuyến quanh viền
  useEffect(() => {
    if (!effects || !props.patternStamp) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const e = engineRef.current;
    const n = Math.round(30 * TIER_SCALE[tier]) + 6;
    for (let i = 0; i < n; i++) {
      const side = i % 4;
      const t = Math.random();
      const x = side < 2 ? 20 + t * (BOARD_W - 40) : side === 2 ? 16 : BOARD_W - 16;
      const y = side === 0 ? 16 : side === 1 ? 616 : 20 + t * 590;
      e.add({ x, y, vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 40, color: '#ffd36b', size: 2.5, max: 1.2, kind: 'dot' });
    }
    ensureLoop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.patternStamp]);

  return <canvas ref={canvasRef} className="fx-canvas" aria-hidden="true" />;
}

function checkEffect(
  e: FxEngine,
  piece: PieceName,
  from: { x: number; y: number },
  king: { x: number; y: number },
  fromSq: number,
  kingSq: number,
  flipped: boolean,
  tier: FxTier,
  side: 'red' | 'black',
  zoom: (at: { x: number; y: number }) => void,
  set: PieceSetId,
) {
  let leg: { x: number; y: number } | undefined;
  if (piece === 'horse') {
    // Chân Mã: ô trung gian của đường chữ "nhật"
    const fr = Math.floor(fromSq / 9);
    const fc = fromSq % 9;
    const kr = Math.floor(kingSq / 9);
    const kc = kingSq % 9;
    const dr = kr - fr;
    const dc = kc - fc;
    const legSq = Math.abs(dr) === 2 ? (fr + dr / 2) * 9 + fc : Math.abs(dc) === 2 ? fr * 9 + (fc + dc / 2) : fr * 9 + fc;
    leg = squareCenter(legSq, flipped);
  }
  const pieceText = pieceLabel(set, piece, side === 'red');
  const kingText = pieceLabel(set, 'king', side !== 'red');
  checkStrike(e, {
    piece,
    side,
    from,
    king,
    leg,
    tier,
    labels: { piece: pieceText, king: kingText, style: labelStyleFor(set, pieceText.length >= kingText.length ? pieceText : kingText) },
    spirit: set === 'viet' ? { text: pieceText, font: VIET_FONT, charWidth: 0.55 } : undefined,
    zoom: tier === 'gold' || tier === 'legendary' ? zoom : undefined,
  });
}
