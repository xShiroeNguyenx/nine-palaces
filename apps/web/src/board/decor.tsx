import type { BoardSkinId } from '../lib/cosmetics';
import { BOARD_H as H, BOARD_W as W, PAD, seeded } from './geometry';

/**
 * Trang trí riêng cho từng bàn cờ, vẽ bằng SVG trong lề quanh lưới, có vật thể 3D (cột, chuỗi hạt, ống đèn, nhũ băng…).
 * Bố cục lề (46px): viền 1–7, số lộ 11–20, quân ngoài cùng chiếm 20–72 (ngang) và 20–612 (dọc).
 * Trang trí nằm DƯỚI quân nên có thể lấn vào dải 20–40; phần bị quân che vẫn lộ ra ở khe giữa các quân.
 */

interface Props {
  skin: BoardSkinId;
  /** Tạo id duy nhất cho defs */
  id: (s: string) => string;
  animated: boolean;
}

/** Mây cát tường (祥云) — một đám mây xoắn, dùng làm hoa văn góc */
const CLOUD = 'M0,0 c-7,-9 6,-19 14,-9 c3,-13 22,-10 20,3 c11,-3 14,13 3,15 c-5,10 -22,8 -22,-1 c-9,7 -20,-2 -15,-8 z';
const CURL = 'M-10,4 c-8,-2 -12,-10 -6,-14 c5,-3 10,2 6,6 c-3,3 -7,0 -5,-3';

function CloudCorner({ x, y, sx, sy, color, fill, shadow }: { x: number; y: number; sx: number; sy: number; color: string; fill: string; shadow?: string }) {
  return (
    <g transform={`translate(${x},${y}) scale(${sx},${sy})`} stroke={color} strokeWidth="1.6" fill={fill} strokeLinejoin="round" filter={shadow}>
      <path d={CLOUD} />
      <path d={CURL} fill="none" />
      <path d="M18,14 c8,-1 12,7 6,11 c-4,3 -9,-1 -6,-5" fill="none" />
    </g>
  );
}

/** Bóng đổ nhỏ cho vật thể nổi */
function ShadowDef({ id, dy = 2, blur = 1.6 }: { id: string; dy?: number; blur?: number }) {
  return (
    <filter id={id} x="-30%" y="-30%" width="160%" height="170%">
      <feDropShadow dx="0.6" dy={dy} stdDeviation={blur} floodColor="#000" floodOpacity="0.5" />
    </filter>
  );
}

export function BoardDecor({ skin, id, animated }: Props) {
  switch (skin) {
    case 'wood':
      return <Wood id={id} />;
    case 'bamboo':
      return <Bamboo id={id} />;
    case 'paper':
      return <Paper id={id} />;
    case 'marble':
      return <Marble id={id} />;
    case 'lacquer':
      return <Lacquer id={id} animated={animated} />;
    case 'jade':
      return <Jade id={id} />;
    case 'neon':
      return <Neon id={id} animated={animated} />;
    case 'palace':
      return <Palace id={id} />;
    case 'ice':
      return <Ice id={id} />;
    case 'fire':
      return <Fire id={id} animated={animated} />;
    case 'galaxy':
      return <Galaxy id={id} animated={animated} />;
    case 'sakura':
      return <Sakura id={id} animated={animated} />;
    default:
      return null;
  }
}

/* ------------------------------- Gỗ mộc ------------------------------- */
function Wood({ id }: { id: (s: string) => string }) {
  const knot = (x: number, y: number, k: string) => (
    <g key={k} transform={`translate(${x},${y})`} fill="none" stroke="#6b4423" strokeWidth="1">
      <ellipse rx="5" ry="3.5" fill="#8a5a2b" stroke="none" />
      <ellipse rx="8" ry="6" opacity="0.7" />
      <ellipse rx="11.5" ry="9" opacity="0.5" />
      <ellipse rx="15" ry="12" opacity="0.3" />
    </g>
  );
  const bracket = (x: number, y: number, sx: number, sy: number, k: string) => (
    <g key={k} transform={`translate(${x},${y}) scale(${sx},${sy})`} fill="none" strokeLinecap="round">
      <path d="M0,22 L0,0 L22,0" stroke="rgba(0,0,0,0.45)" strokeWidth="4" transform="translate(1.5,1.5)" />
      <path d="M0,22 L0,0 L22,0" stroke="#a8763e" strokeWidth="4" />
      <path d="M0,22 L0,0 L22,0" stroke="rgba(255,240,200,0.55)" strokeWidth="1.2" transform="translate(-1,-1)" />
      <path d="M6,16 L6,6 L16,6" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" />
    </g>
  );
  return (
    <g>
      <defs>
        <filter id={id('grain')} x="0" y="0" width="1" height="1">
          <feTurbulence type="fractalNoise" baseFrequency="0.01 0.32" numOctaves="2" seed="5" />
          <feColorMatrix values="0 0 0 0 0.36  0 0 0 0 0.2  0 0 0 0 0.05  0 0 0 0.45 0" />
        </filter>
      </defs>
      <rect x="8" y="8" width={W - 16} height={H - 16} rx="12" filter={`url(#${id('grain')})`} opacity="0.45" />
      {knot(15, 150, 'k1')}
      {knot(W - 15, 470, 'k2')}
      {bracket(10, 10, 1, 1, 'b1')}
      {bracket(W - 10, 10, -1, 1, 'b2')}
      {bracket(10, H - 10, 1, -1, 'b3')}
      {bracket(W - 10, H - 10, -1, -1, 'b4')}
    </g>
  );
}

/* ------------------------------- Tre xanh ------------------------------- */
function Bamboo({ id }: { id: (s: string) => string }) {
  const stalk = (x: number, w: number, top: number, bottom: number, key: string, back = false) => {
    const nodes: JSX.Element[] = [];
    for (let y = top + 38; y < bottom - 10; y += 74) {
      nodes.push(<rect key={`n${y}`} x={x - w / 2 - 1} y={y} width={w + 2} height="4" rx="1" fill="rgba(35,65,15,0.5)" />);
      nodes.push(<rect key={`h${y}`} x={x - w / 2} y={y + 4} width={w} height="1.6" fill="rgba(255,255,255,0.45)" />);
      nodes.push(<rect key={`s${y}`} x={x - w / 2} y={y - 2} width={w} height="1.6" fill="rgba(0,0,0,0.18)" />);
    }
    return (
      <g key={key} opacity={back ? 0.7 : 1}>
        <rect x={x - w / 2 + 2} y={top + 3} width={w} height={bottom - top} rx={w / 2} fill="rgba(0,0,0,0.22)" />
        <rect x={x - w / 2} y={top} width={w} height={bottom - top} rx={w / 2} fill={`url(#${id('bam')})`} />
        {nodes}
      </g>
    );
  };
  const leaf = (x: number, y: number, a: number, len: number, key: string) => (
    <g key={key} transform={`translate(${x},${y}) rotate(${a})`}>
      <ellipse cx={len / 2} cy="0" rx={len / 2} ry="5.5" fill={`url(#${id('leaf')})`} stroke="rgba(30,60,10,0.35)" strokeWidth="0.6" />
      <line x1="2" y1="0" x2={len - 3} y2="0" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" />
    </g>
  );
  return (
    <g>
      <defs>
        <linearGradient id={id('bam')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3f6b1f" />
          <stop offset="0.3" stopColor="#8fc255" />
          <stop offset="0.5" stopColor="#c9e59a" />
          <stop offset="0.72" stopColor="#7fb043" />
          <stop offset="1" stopColor="#2f5417" />
        </linearGradient>
        <linearGradient id={id('leaf')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9ed36a" />
          <stop offset="1" stopColor="#3d7a1e" />
        </linearGradient>
      </defs>
      {stalk(14, 10, 26, H - 26, 'l0', true)}
      {stalk(26, 15, 12, H - 12, 'l1')}
      {stalk(W - 14, 10, 30, H - 30, 'r0', true)}
      {stalk(W - 26, 15, 14, H - 14, 'r1')}
      {leaf(30, 92, 78, 42, 'a')}
      {leaf(24, 96, 100, 36, 'b')}
      {leaf(30, 250, 84, 40, 'c')}
      {leaf(W - 30, 470, -96, 42, 'd')}
      {leaf(W - 24, 466, -80, 36, 'e')}
      {leaf(W - 30, 330, -100, 40, 'f')}
      {leaf(20, H - 120, 70, 34, 'g')}
      {leaf(W - 20, 140, -110, 34, 'h')}
    </g>
  );
}

/* ------------------------------- Giấy dó ------------------------------- */
function Paper({ id }: { id: (s: string) => string }) {
  const rnd = seeded(7);
  const pts: string[] = [];
  const inset = 9;
  const step = 14;
  const jitter = () => (rnd() - 0.5) * 5;
  for (let x = inset; x <= W - inset; x += step) pts.push(`${x},${inset + jitter()}`);
  for (let y = inset; y <= H - inset; y += step) pts.push(`${W - inset + jitter()},${y}`);
  for (let x = W - inset; x >= inset; x -= step) pts.push(`${x},${H - inset + jitter()}`);
  for (let y = H - inset; y >= inset; y -= step) pts.push(`${inset + jitter()},${y}`);
  const fibers: JSX.Element[] = [];
  for (let i = 0; i < 40; i++) {
    const inMargin = rnd() < 0.5;
    const x = inMargin ? (rnd() < 0.5 ? 6 + rnd() * 36 : W - 42 + rnd() * 36) : 10 + rnd() * (W - 20);
    const y = inMargin ? 10 + rnd() * (H - 20) : rnd() < 0.5 ? 6 + rnd() * 34 : H - 40 + rnd() * 34;
    const a = rnd() * Math.PI;
    const l = 6 + rnd() * 14;
    fibers.push(
      <line key={i} x1={x} y1={y} x2={x + Math.cos(a) * l} y2={y + Math.sin(a) * l} stroke="rgba(90,70,40,0.28)" strokeWidth="0.8" />,
    );
  }
  return (
    <g>
      <defs>
        <ShadowDef id={id('pshadow')} dy={2.5} blur={2} />
        <linearGradient id={id('brush')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5a3a1c" />
          <stop offset="0.35" stopColor="#c99a55" />
          <stop offset="0.6" stopColor="#e8c48a" />
          <stop offset="1" stopColor="#6b4423" />
        </linearGradient>
        <linearGradient id={id('stone')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5b5b5b" />
          <stop offset="1" stopColor="#1e1e1e" />
        </linearGradient>
      </defs>
      <polygon points={pts.join(' ')} fill="none" stroke="rgba(120,90,50,0.35)" strokeWidth="1.8" strokeLinejoin="round" />
      {fibers}
      <text x={W / 2} y={H / 2 + 110} textAnchor="middle" fontSize="300" fontFamily="'Noto Serif SC', serif" fill="rgba(70,45,20,0.06)">
        棋
      </text>
      {/* Bút lông dựng dọc lề trái: cán tre (trụ tròn), khâu đồng, ngòi mực */}
      <g transform="translate(15,120)" filter={`url(#${id('pshadow')})`}>
        <rect x="-5" y="0" width="10" height="190" rx="5" fill={`url(#${id('brush')})`} />
        {[40, 80, 120].map((y) => (
          <rect key={y} x="-5" y={y} width="10" height="2" fill="rgba(0,0,0,0.25)" />
        ))}
        <rect x="-5.5" y="190" width="11" height="9" rx="1" fill="#c9a227" />
        <rect x="-5.5" y="190" width="11" height="2" fill="rgba(255,255,255,0.5)" />
        <path d="M-5,199 L5,199 L2,222 Q0,236 -2,222 Z" fill="#f1e6c8" />
        <path d="M-2.5,214 L2.5,214 L1,226 Q0,232 -1,226 Z" fill="#1a1410" />
        <circle cx="0" cy="-2" r="2.5" fill="#8a1c12" />
      </g>
      {/* Nghiên mực ở lề phải: khối đá vát cạnh, hõm mực đen loang */}
      <g transform={`translate(${W - 15},380)`} filter={`url(#${id('pshadow')})`}>
        <rect x="-7" y="-2" width="14" height="66" rx="3" fill="#111" />
        <rect x="-7" y="-6" width="14" height="66" rx="3" fill={`url(#${id('stone')})`} />
        <rect x="-5" y="-4" width="10" height="2" rx="1" fill="rgba(255,255,255,0.3)" />
        <ellipse cx="0" cy="24" rx="4.5" ry="20" fill="#0a0806" />
        <ellipse cx="-1.5" cy="12" rx="1.5" ry="6" fill="rgba(255,255,255,0.25)" />
      </g>
      {/* Con dấu son ở góc */}
      <g transform={`translate(${W - 20},${H - 22}) rotate(-8)`} filter={`url(#${id('pshadow')})`}>
        <rect x="-10" y="-10" width="20" height="20" rx="3" fill="#b3261e" opacity="0.9" />
        <rect x="-8" y="-8" width="16" height="16" rx="2" fill="none" stroke="rgba(255,240,220,0.7)" strokeWidth="1" />
        <text x="0" y="1" textAnchor="middle" dominantBaseline="central" fontSize="11" fontFamily="'Noto Serif SC', serif" fill="#fff0dc">
          棋
        </text>
      </g>
    </g>
  );
}

/* ---------------------------- Đá cẩm thạch ---------------------------- */
function Marble({ id }: { id: (s: string) => string }) {
  const rosette = (x: number, y: number) => (
    <g key={`${x}-${y}`} transform={`translate(${x},${y})`} fill="#c9a227" stroke="rgba(0,0,0,0.25)" strokeWidth="0.6" filter={`url(#${id('mshadow')})`}>
      {[0, 90, 180, 270].map((a) => (
        <ellipse key={a} cx="0" cy="-6" rx="3" ry="5" transform={`rotate(${a})`} />
      ))}
      <circle r="3" fill="#8a6414" />
    </g>
  );
  /** Cột đá bo tròn (trụ có sáng/tối theo chiều ngang) với đầu và chân cột */
  const pillar = (x: number, k: string) => (
    <g key={k} filter={`url(#${id('mshadow')})`}>
      <rect x={x - 7} y="40" width="14" height={H - 80} fill={`url(#${id('pillar')})`} />
      <rect x={x - 10} y="30" width="20" height="10" rx="2" fill="#d9d6ce" stroke="rgba(0,0,0,0.25)" strokeWidth="0.8" />
      <rect x={x - 10} y={H - 40} width="20" height="10" rx="2" fill="#cfccc4" stroke="rgba(0,0,0,0.25)" strokeWidth="0.8" />
      <rect x={x - 9} y="26" width="18" height="4" rx="1.5" fill="#c9a227" />
      <rect x={x - 9} y={H - 30} width="18" height="4" rx="1.5" fill="#c9a227" />
      <line x1={x - 3} y1="42" x2={x - 3} y2={H - 42} stroke="rgba(0,0,0,0.18)" strokeWidth="1" />
      <line x1={x + 3} y1="42" x2={x + 3} y2={H - 42} stroke="rgba(0,0,0,0.18)" strokeWidth="1" />
    </g>
  );
  return (
    <g>
      <defs>
        <ShadowDef id={id('mshadow')} dy={2} blur={1.4} />
        <linearGradient id={id('pillar')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8f8b82" />
          <stop offset="0.35" stopColor="#f4f2ec" />
          <stop offset="0.6" stopColor="#dcd9d1" />
          <stop offset="1" stopColor="#7d7970" />
        </linearGradient>
      </defs>
      <rect x="9.5" y="9.5" width={W - 19} height={H - 19} rx="9" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1.2" transform="translate(1.2,1.2)" />
      <rect x="9.5" y="9.5" width={W - 19} height={H - 19} rx="9" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.2" transform="translate(-0.8,-0.8)" />
      <rect x="9.5" y="9.5" width={W - 19} height={H - 19} rx="9" fill="none" stroke="#c9a227" strokeWidth="2.4" />
      {pillar(15, 'pl')}
      {pillar(W - 15, 'pr')}
      {rosette(20, 20)}
      {rosette(W - 20, 20)}
      {rosette(20, H - 20)}
      {rosette(W - 20, H - 20)}
    </g>
  );
}

/* -------------------------------- Sơn mài -------------------------------- */
function Lacquer({ id, animated }: { id: (s: string) => string; animated: boolean }) {
  const rnd = seeded(11);
  const flecks: JSX.Element[] = [];
  const colors = ['#ffd1dc', '#d1f0ff', '#e1ffd1', '#fff3b0'];
  for (let i = 0; i < 36; i++) {
    const side = Math.floor(rnd() * 4);
    const x = side === 0 ? 8 + rnd() * 34 : side === 1 ? W - 42 + rnd() * 34 : 10 + rnd() * (W - 20);
    const y = side < 2 ? 10 + rnd() * (H - 20) : side === 2 ? 8 + rnd() * 32 : H - 40 + rnd() * 32;
    flecks.push(<ellipse key={i} cx={x} cy={y} rx={1 + rnd() * 2} ry={0.6 + rnd()} fill={colors[i % 4]} opacity={0.35 + rnd() * 0.3} />);
  }
  const gold = 'rgba(212,175,55,0.35)';
  return (
    <g>
      <defs>
        <linearGradient id={id('gloss')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgba(255,255,255,0)" />
          <stop offset="0.5" stopColor="rgba(255,255,255,0.16)" />
          <stop offset="1" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <linearGradient id={id('lbar')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6b4a10" />
          <stop offset="0.45" stopColor="#f3d27a" />
          <stop offset="1" stopColor="#7a5312" />
        </linearGradient>
        <ShadowDef id={id('lshadow')} dy={2} blur={1.5} />
      </defs>
      {flecks}
      {/* Nẹp vàng nổi hai bên (thanh tròn) */}
      <rect x="10" y="30" width="6" height={H - 60} rx="3" fill={`url(#${id('lbar')})`} filter={`url(#${id('lshadow')})`} />
      <rect x={W - 16} y="30" width="6" height={H - 60} rx="3" fill={`url(#${id('lbar')})`} filter={`url(#${id('lshadow')})`} />
      <CloudCorner x={13} y={15} sx={0.62} sy={0.62} color="#f3d27a" fill={gold} shadow={`url(#${id('lshadow')})`} />
      <CloudCorner x={W - 13} y={15} sx={-0.62} sy={0.62} color="#f3d27a" fill={gold} shadow={`url(#${id('lshadow')})`} />
      <CloudCorner x={13} y={H - 15} sx={0.62} sy={-0.62} color="#f3d27a" fill={gold} shadow={`url(#${id('lshadow')})`} />
      <CloudCorner x={W - 13} y={H - 15} sx={-0.62} sy={-0.62} color="#f3d27a" fill={gold} shadow={`url(#${id('lshadow')})`} />
      <rect x="9" y="9" width={W - 18} height={H - 18} rx="8" fill="none" stroke="#d4af37" strokeWidth="1.2" opacity="0.8" />
      <rect
        className={animated ? 'board-gloss' : undefined}
        x="0"
        y="0"
        width="140"
        height={H}
        fill={`url(#${id('gloss')})`}
        transform="translate(-200,0) skewX(-20)"
        pointerEvents="none"
      />
    </g>
  );
}

/* -------------------------------- Ngọc bích -------------------------------- */
function Jade({ id }: { id: (s: string) => string }) {
  // Mỗi cột hạt dùng chung MỘT filter bóng (thay vì 40 filter riêng) để vẽ nhanh
  const beads: JSX.Element[] = [];
  for (const x of [15, W - 15]) {
    const col: JSX.Element[] = [];
    for (let y = 34; y < H - 26; y += 14) col.push(<circle key={y} cx={x} cy={y} r="5.5" fill={`url(#${id('bead')})`} />);
    beads.push(
      <g key={`c${x}`} filter={`url(#${id('jshadow')})`}>
        <line x1={x} y1="24" x2={x} y2={H - 24} stroke="#b3261e" strokeWidth="1.2" />
        {col}
      </g>,
    );
  }
  return (
    <g>
      <defs>
        <radialGradient id={id('core')} cx="0.5" cy="0.42" r="0.6">
          <stop offset="0" stopColor="rgba(255,255,255,0.32)" />
          <stop offset="1" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <radialGradient id={id('bead')} cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#eafff5" />
          <stop offset="0.5" stopColor="#5fb896" />
          <stop offset="1" stopColor="#0f3d2e" />
        </radialGradient>
        <filter id={id('jblur')} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <ShadowDef id={id('jshadow')} dy={1.8} blur={1.2} />
      </defs>
      <rect x="8" y="8" width={W - 16} height={H - 16} rx="12" fill={`url(#${id('core')})`} />
      <g filter={`url(#${id('jblur')})`} fill="rgba(255,255,255,0.28)">
        <ellipse cx="150" cy="120" rx="170" ry="14" transform="rotate(-28 150 120)" />
        <ellipse cx="420" cy="470" rx="150" ry="12" transform="rotate(-24 420 470)" />
        <ellipse cx="300" cy="300" rx="120" ry="9" transform="rotate(-32 300 300)" />
      </g>
      <rect x="9" y="9" width={W - 18} height={H - 18} rx="9" fill="none" stroke="rgba(0,40,25,0.45)" strokeWidth="2" />
      <rect x="11.2" y="11.2" width={W - 22.4} height={H - 22.4} rx="8" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" />
      {/* Chuỗi hạt ngọc xâu chỉ đỏ hai bên */}
      {beads}
      <CloudCorner x={13} y={15} sx={0.62} sy={0.62} color="rgba(0,50,30,0.5)" fill="rgba(255,255,255,0.12)" />
      <CloudCorner x={W - 13} y={H - 15} sx={-0.62} sy={-0.62} color="rgba(0,50,30,0.5)" fill="rgba(255,255,255,0.12)" />
    </g>
  );
}

/* ------------------------------- Neon Cyber ------------------------------- */
function Neon({ id, animated }: { id: (s: string) => string; animated: boolean }) {
  const bracket = (x: number, y: number, sx: number, sy: number) => (
    <path
      key={`${x}${y}`}
      d="M0,26 L0,0 L26,0"
      transform={`translate(${x},${y}) scale(${sx},${sy})`}
      fill="none"
      stroke="#22d3ee"
      strokeWidth="3"
      strokeLinecap="round"
    />
  );
  /** Ống đèn neon: thân trụ, hai đầu kim loại, lõi sáng */
  const tube = (x: number, color: string, k: string) => (
    <g key={k}>
      <rect x={x - 5} y="40" width="10" height={H - 80} rx="5" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
      <rect x={x - 2.2} y="46" width="4.4" height={H - 92} rx="2.2" fill={color} filter={`url(#${id('nglow')})`} />
      <rect x={x - 1} y="46" width="2" height={H - 92} rx="1" fill="#ffffff" opacity="0.9" />
      {[34, H - 46].map((y) => (
        <rect key={y} x={x - 6} y={y} width="12" height="12" rx="2" fill={`url(#${id('metal')})`} stroke="rgba(0,0,0,0.5)" strokeWidth="0.6" />
      ))}
    </g>
  );
  return (
    <g>
      <defs>
        <pattern id={id('hex')} width="30" height="26" patternUnits="userSpaceOnUse">
          <path d="M15,1 L28,8 L28,19 L15,26 L2,19 L2,8 Z" fill="none" stroke="#22d3ee" strokeWidth="0.8" opacity="0.1" />
        </pattern>
        <linearGradient id={id('scan')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(34,211,238,0)" />
          <stop offset="0.5" stopColor="rgba(34,211,238,0.35)" />
          <stop offset="1" stopColor="rgba(34,211,238,0)" />
        </linearGradient>
        <linearGradient id={id('metal')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3a4358" />
          <stop offset="0.5" stopColor="#9aa7bd" />
          <stop offset="1" stopColor="#2b3346" />
        </linearGradient>
        <filter id={id('nglow')} x="-100%" y="-40%" width="300%" height="180%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect x="8" y="8" width={W - 16} height={H - 16} rx="12" fill={`url(#${id('hex')})`} />
      {tube(15, '#22d3ee', 'tl')}
      {tube(W - 15, '#f472b6', 'tr')}
      <g filter={`url(#${id('nglow')})`}>
        {bracket(12, 12, 1, 1)}
        {bracket(W - 12, 12, -1, 1)}
        {bracket(12, H - 12, 1, -1)}
        {bracket(W - 12, H - 12, -1, -1)}
        <rect x="9" y="9" width={W - 18} height={H - 18} rx="10" fill="none" stroke="#a855f7" strokeWidth="1" opacity="0.5" />
      </g>
      <rect className={animated ? 'neon-scan' : undefined} x="8" y="-40" width={W - 16} height="40" fill={`url(#${id('scan')})`} pointerEvents="none" />
    </g>
  );
}

/* -------------------------------- Hoàng cung -------------------------------- */
function Palace({ id }: { id: (s: string) => string }) {
  const tiles: JSX.Element[] = [];
  for (let x = 18; x < W - 6; x += 20) {
    tiles.push(<path key={`t${x}`} d={`M${x - 10},4 a10,7 0 0 0 20,0`} fill="#7a1410" stroke="#f2c14e" strokeWidth="1.2" />);
    tiles.push(<circle key={`d${x}`} cx={x} cy="7.5" r="1.6" fill="#f2c14e" />);
    tiles.push(<path key={`b${x}`} d={`M${x - 10},${H - 4} a10,7 0 0 1 20,0`} fill="#7a1410" stroke="#f2c14e" strokeWidth="1.2" />);
    tiles.push(<circle key={`f${x}`} cx={x} cy={H - 7.5} r="1.6" fill="#f2c14e" />);
  }
  /** Cột son tròn có đai vàng, đầu cột và chân cột */
  const pillar = (x: number, k: string) => (
    <g key={k} filter={`url(#${id('pshadow')})`}>
      <rect x={x - 10} y="36" width="20" height={H - 72} fill={`url(#${id('column')})`} />
      {[110, 220, 330, 440].map((y) => (
        <g key={y}>
          <rect x={x - 11} y={y} width="22" height="7" rx="1.5" fill={`url(#${id('band')})`} />
          <rect x={x - 11} y={y} width="22" height="1.5" fill="rgba(255,255,255,0.5)" />
        </g>
      ))}
      <rect x={x - 13} y="26" width="26" height="12" rx="2" fill={`url(#${id('band')})`} />
      <rect x={x - 13} y={H - 38} width="26" height="12" rx="2" fill={`url(#${id('band')})`} />
    </g>
  );
  return (
    <g>
      <defs>
        <pattern id={id('scale')} width="18" height="14" patternUnits="userSpaceOnUse">
          <path d="M0,14 a9,9 0 0 1 18,0" fill="none" stroke="#f2c14e" strokeWidth="1" opacity="0.4" />
          <path d="M-9,7 a9,9 0 0 1 18,0 M9,7 a9,9 0 0 1 18,0" fill="none" stroke="#f2c14e" strokeWidth="1" opacity="0.4" />
        </pattern>
        <linearGradient id={id('column')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5a0d08" />
          <stop offset="0.35" stopColor="#e0463a" />
          <stop offset="0.55" stopColor="#f07a6a" />
          <stop offset="1" stopColor="#4a0906" />
        </linearGradient>
        <linearGradient id={id('band')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7a5312" />
          <stop offset="0.45" stopColor="#ffe08a" />
          <stop offset="1" stopColor="#8a6414" />
        </linearGradient>
        <ShadowDef id={id('pshadow')} dy={2} blur={1.6} />
      </defs>
      <rect x="8" y="40" width="32" height={H - 80} fill={`url(#${id('scale')})`} />
      <rect x={W - 40} y="40" width="32" height={H - 80} fill={`url(#${id('scale')})`} />
      {pillar(17, 'pl')}
      {pillar(W - 17, 'pr')}
      <g filter={`url(#${id('pshadow')})`}>{tiles}</g>
      <rect x={PAD - 10} y={PAD - 10} width={W - PAD * 2 + 20} height={H - PAD * 2 + 20} rx="6" fill="none" stroke="#f2c14e" strokeWidth="1.2" opacity="0.7" />
      <CloudCorner x={13} y={22} sx={0.6} sy={0.6} color="#f2c14e" fill="rgba(242,193,78,0.25)" />
      <CloudCorner x={W - 13} y={22} sx={-0.6} sy={0.6} color="#f2c14e" fill="rgba(242,193,78,0.25)" />
      <CloudCorner x={13} y={H - 22} sx={0.6} sy={-0.6} color="#f2c14e" fill="rgba(242,193,78,0.25)" />
      <CloudCorner x={W - 13} y={H - 22} sx={-0.6} sy={-0.6} color="#f2c14e" fill="rgba(242,193,78,0.25)" />
    </g>
  );
}

/* -------------------------------- Băng tuyết -------------------------------- */
function Ice({ id }: { id: (s: string) => string }) {
  const rnd = seeded(21);
  const icicles: JSX.Element[] = [];
  for (let x = 14; x < W - 10; x += 22 + rnd() * 18) {
    const len = 14 + rnd() * 26;
    const w = 5 + rnd() * 5;
    icicles.push(
      <path key={`i${x}`} d={`M${x - w},6 L${x + w},6 L${x + 1},${6 + len} Z`} fill={`url(#${id('icicle')})`} stroke="rgba(255,255,255,0.6)" strokeWidth="0.6" />,
    );
  }
  const cracks: JSX.Element[] = [];
  for (let i = 0; i < 6; i++) {
    let x = rnd() * W;
    let y = rnd() * H;
    let d = `M${x},${y}`;
    for (let k = 0; k < 5; k++) {
      x += (rnd() - 0.5) * 120;
      y += (rnd() - 0.5) * 120;
      d += ` L${x},${y}`;
    }
    cracks.push(<path key={`c${i}`} d={d} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1" />);
  }
  const sparkles: JSX.Element[] = [];
  for (let i = 0; i < 26; i++) {
    const x = 8 + rnd() * (W - 16);
    const y = 8 + rnd() * (H - 16);
    const s = 1.5 + rnd() * 2.5;
    sparkles.push(<path key={`s${i}`} d={`M${x - s},${y} L${x + s},${y} M${x},${y - s} L${x},${y + s}`} stroke="#ffffff" strokeWidth="0.9" opacity={0.5 + rnd() * 0.5} />);
  }
  const drift = (x: number, w: number, k: string) => (
    <ellipse key={k} cx={x} cy={H - 6} rx={w} ry="7" fill={`url(#${id('snow')})`} />
  );
  /** Cụm tinh thể băng dựng đứng ở lề (khối 3D: mặt sáng / mặt tối) */
  const crystal = (x: number, y: number, h: number, w: number, k: string, tilt = 0) => (
    <g key={k} transform={`translate(${x},${y}) rotate(${tilt})`}>
      <path d={`M0,${-h} L${w},${-h * 0.72} L${w * 0.7},0 L${-w * 0.7},0 L${-w},${-h * 0.72} Z`} fill={`url(#${id('icicle')})`} stroke="rgba(255,255,255,0.7)" strokeWidth="0.7" />
      <path d={`M0,${-h} L${w},${-h * 0.72} L${w * 0.7},0 L0,0 Z`} fill="rgba(60,120,170,0.35)" />
      <path d={`M0,${-h} L0,0`} stroke="rgba(255,255,255,0.8)" strokeWidth="1" />
    </g>
  );
  const clusters: JSX.Element[] = [];
  for (const [x, flip] of [[14, 1], [W - 14, -1]] as [number, number][]) {
    const side: JSX.Element[] = [];
    for (let y = 130; y < H - 60; y += 150) {
      side.push(crystal(x, y + 30, 56, 6, `c${y}`, -8 * flip));
      side.push(crystal(x + 6 * flip, y + 30, 36, 4.5, `d${y}`, 14 * flip));
      side.push(crystal(x - 5 * flip, y + 30, 28, 4, `e${y}`, -22 * flip));
    }
    // một filter bóng cho cả cột tinh thể
    clusters.push(
      <g key={`s${x}`} filter={`url(#${id('ishadow')})`}>
        {side}
      </g>,
    );
  }
  return (
    <g>
      <defs>
        <linearGradient id={id('icicle')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgba(255,255,255,0.95)" />
          <stop offset="0.5" stopColor="rgba(190,230,250,0.85)" />
          <stop offset="1" stopColor="rgba(120,180,220,0.9)" />
        </linearGradient>
        <ShadowDef id={id('ishadow')} dy={2} blur={1.6} />
        <radialGradient id={id('snow')} cx="0.5" cy="0.2" r="0.9">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#cfe9f8" />
        </radialGradient>
        <linearGradient id={id('frost')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgba(255,255,255,0.7)" />
          <stop offset="1" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      {cracks}
      <rect x="8" y="8" width="120" height="120" fill={`url(#${id('frost')})`} />
      <rect x={W - 128} y={H - 128} width="120" height="120" fill={`url(#${id('frost')})`} transform={`rotate(180 ${W - 68} ${H - 68})`} />
      {icicles}
      {drift(60, 70, 'd1')}
      {drift(200, 90, 'd2')}
      {drift(380, 80, 'd3')}
      {drift(520, 60, 'd4')}
      {clusters}
      {sparkles}
    </g>
  );
}

/* -------------------------------- Dung nham -------------------------------- */
function Fire({ id, animated }: { id: (s: string) => string; animated: boolean }) {
  const rnd = seeded(33);
  const cracks: JSX.Element[] = [];
  for (let i = 0; i < 7; i++) {
    let x = rnd() * W;
    let y = rnd() * H;
    let d = `M${x},${y}`;
    for (let k = 0; k < 6; k++) {
      x += (rnd() - 0.5) * 110;
      y += (rnd() - 0.5) * 110;
      d += ` L${x},${y}`;
    }
    // Quầng sáng bằng 2 nét rộng mờ (không dùng filter blur)
    cracks.push(<path key={`g${i}`} d={d} fill="none" stroke="#ff7a1a" strokeWidth="10" opacity="0.16" strokeLinejoin="round" strokeLinecap="round" />);
    cracks.push(<path key={`h${i}`} d={d} fill="none" stroke="#ff9a3c" strokeWidth="4" opacity="0.4" strokeLinejoin="round" strokeLinecap="round" />);
    cracks.push(<path key={`c${i}`} d={d} fill="none" stroke="#ffd36b" strokeWidth="1.2" />);
  }
  const flame = (x: number, h: number, w: number, k: string, delay: number) => (
    <g key={k} className={animated ? 'flame' : undefined} style={{ animationDelay: `${delay}s` }} transform={`translate(${x},${H - 6})`}>
      <path d={`M${-w},0 C${-w * 1.2},${-h * 0.35} ${-w * 0.2},${-h * 0.5} 0,${-h} C${w * 0.3},${-h * 0.55} ${w * 1.1},${-h * 0.4} ${w},0 Z`} fill={`url(#${id('flame')})`} />
      <path d={`M${-w * 0.45},0 C${-w * 0.5},${-h * 0.3} 0,${-h * 0.35} 0,${-h * 0.62} C${w * 0.1},${-h * 0.35} ${w * 0.45},${-h * 0.3} ${w * 0.45},0 Z`} fill="#fff3b0" opacity="0.85" />
    </g>
  );
  const flames: JSX.Element[] = [];
  for (let x = 30; x < W - 20; x += 46) flames.push(flame(x, 24 + rnd() * 26, 9 + rnd() * 6, `f${x}`, rnd()));
  const sideFlame = (x: number, y: number, k: string, delay: number) => (
    <g key={k} className={animated ? 'flame' : undefined} style={{ animationDelay: `${delay}s` }} transform={`translate(${x},${y})`}>
      <path d="M-11,0 C-13,-16 -3,-22 0,-42 C3,-22 13,-16 11,0 Z" fill={`url(#${id('flame')})`} />
      <path d="M-5,0 C-5,-10 -1,-12 0,-24 C1,-12 5,-10 5,0 Z" fill="#fff3b0" opacity="0.8" />
    </g>
  );
  /** Cột đá đen nứt dung nham hai bên (khối trụ có vệt sáng) */
  const pillar = (x: number, k: string) => (
    <g key={k}>
      <rect x={x - 8} y="30" width="16" height={H - 60} rx="4" fill={`url(#${id('rock')})`} />
      <path d={`M${x - 3},40 l3,40 l-4,30 l5,50 l-3,60 l4,70 l-3,80 l3,60 l-2,${H - 460}`} fill="none" stroke="#ff7a1a" strokeWidth="6" opacity="0.35" strokeLinejoin="round" />
      <path d={`M${x - 3},40 l3,40 l-4,30 l5,50 l-3,60 l4,70 l-3,80 l3,60 l-2,${H - 460}`} fill="none" stroke="#ffd36b" strokeWidth="1" />
    </g>
  );
  const sides: JSX.Element[] = [pillar(14, 'pl'), pillar(W - 14, 'pr')];
  for (let y = 100; y < H - 40; y += 96) {
    sides.push(sideFlame(14, y, `l${y}`, rnd()));
    sides.push(sideFlame(W - 14, y, `r${y}`, rnd()));
  }
  const embers: JSX.Element[] = [];
  for (let i = 0; i < 30; i++) embers.push(<circle key={`e${i}`} cx={8 + rnd() * (W - 16)} cy={8 + rnd() * (H - 16)} r={0.8 + rnd() * 1.6} fill={i % 2 ? '#ffb347' : '#ff6a1a'} opacity={0.5 + rnd() * 0.5} />);
  return (
    <g>
      <defs>
        <linearGradient id={id('flame')} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ff3d00" />
          <stop offset="0.5" stopColor="#ff9a1a" />
          <stop offset="1" stopColor="rgba(255,220,120,0)" />
        </linearGradient>
        <linearGradient id={id('rock')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0a0402" />
          <stop offset="0.4" stopColor="#3a2a24" />
          <stop offset="1" stopColor="#080302" />
        </linearGradient>
      </defs>
      {cracks}
      {embers}
      {sides}
      {flames}
    </g>
  );
}

/* --------------------------------- Ngân hà --------------------------------- */
function Galaxy({ id, animated }: { id: (s: string) => string; animated: boolean }) {
  const rnd = seeded(44);
  const stars: JSX.Element[] = [];
  for (let i = 0; i < 90; i++) {
    const x = 6 + rnd() * (W - 12);
    const y = 6 + rnd() * (H - 12);
    const r = 0.5 + rnd() * 1.4;
    stars.push(<circle key={`s${i}`} cx={x} cy={y} r={r} fill={i % 7 === 0 ? '#c4b5fd' : i % 5 === 0 ? '#fbcfe8' : '#ffffff'} opacity={0.5 + rnd() * 0.5} />);
  }
  const bigStars: JSX.Element[] = [];
  for (let i = 0; i < 6; i++) {
    const x = 20 + rnd() * (W - 40);
    const y = 20 + rnd() * (H - 40);
    bigStars.push(
      <path key={`b${i}`} d={`M${x - 5},${y} L${x + 5},${y} M${x},${y - 5} L${x},${y + 5}`} stroke="#ffffff" strokeWidth="1.2" opacity="0.9" className={animated ? 'twinkle' : undefined} style={{ animationDelay: `${rnd() * 3}s` }} />,
    );
  }
  return (
    <g>
      <defs>
        <radialGradient id={id('neb1')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="rgba(168,85,247,0.55)" />
          <stop offset="1" stopColor="rgba(168,85,247,0)" />
        </radialGradient>
        <radialGradient id={id('neb2')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="rgba(244,114,182,0.45)" />
          <stop offset="1" stopColor="rgba(244,114,182,0)" />
        </radialGradient>
        <radialGradient id={id('neb3')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="rgba(56,189,248,0.4)" />
          <stop offset="1" stopColor="rgba(56,189,248,0)" />
        </radialGradient>
        <radialGradient id={id('planet')} cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#ffd6a5" />
          <stop offset="0.45" stopColor="#e07a3a" />
          <stop offset="1" stopColor="#3a1a10" />
        </radialGradient>
        <radialGradient id={id('moon')} cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#d6d3e6" />
          <stop offset="1" stopColor="#5b5680" />
        </radialGradient>
        <ShadowDef id={id('gshadow')} dy={3} blur={3} />
        <linearGradient id={id('shoot')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgba(255,255,255,0)" />
          <stop offset="1" stopColor="#ffffff" />
        </linearGradient>
      </defs>
      <ellipse cx="120" cy="140" rx="150" ry="90" fill={`url(#${id('neb1')})`} transform="rotate(-25 120 140)" />
      <ellipse cx="460" cy="500" rx="140" ry="80" fill={`url(#${id('neb2')})`} transform="rotate(-30 460 500)" />
      <ellipse cx="300" cy="330" rx="170" ry="60" fill={`url(#${id('neb3')})`} transform="rotate(-20 300 330)" />
      {stars}
      {bigStars}
      {/* Hành tinh có vành ở góc trên phải và mặt trăng góc dưới trái (khối cầu có bóng) */}
      <g transform={`translate(${W - 17},17)`} filter={`url(#${id('gshadow')})`}>
        <ellipse rx="17" ry="4.5" fill="none" stroke="#e9d5ff" strokeWidth="1.8" opacity="0.7" transform="rotate(-18)" />
        <circle r="9" fill={`url(#${id('planet')})`} />
        <path d="M-17,2.5 A17,4.5 0 0 0 17,-2.5" fill="none" stroke="#f5f3ff" strokeWidth="1.8" transform="rotate(-18)" />
      </g>
      <g transform={`translate(17,${H - 17})`} filter={`url(#${id('gshadow')})`}>
        <circle r="8" fill={`url(#${id('moon')})`} />
        <circle cx="-2.5" cy="-2" r="1.6" fill="rgba(0,0,0,0.18)" />
        <circle cx="2.5" cy="2.5" r="1.1" fill="rgba(0,0,0,0.18)" />
      </g>
      {/* Chuỗi tinh cầu nhỏ dọc hai lề (khối cầu phát sáng) */}
      {[110, 230, 400, 520].map((y, i) => (
        <circle key={`o${y}`} cx={i % 2 ? W - 15 : 15} cy={y} r={3 + (i % 2)} fill={i % 2 ? '#f0abfc' : '#93c5fd'} filter={`url(#${id('gshadow')})`} />
      ))}
      {/* Sao băng */}
      <line x1="40" y1={H - 90} x2="130" y2={H - 40} stroke={`url(#${id('shoot')})`} strokeWidth="1.5" opacity="0.8" />
      <circle cx="130" cy={H - 40} r="2.2" fill="#ffffff" />
    </g>
  );
}

/* -------------------------------- Hoa anh đào -------------------------------- */
function Sakura({ id, animated }: { id: (s: string) => string; animated: boolean }) {
  const rnd = seeded(55);
  const blossom = (x: number, y: number, s: number, k: string) => (
    <g key={k} transform={`translate(${x},${y}) scale(${s}) rotate(${rnd() * 60})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <path key={a} d="M0,0 C-4,-6 -3,-13 0,-14 C3,-13 4,-6 0,0 Z" fill={`url(#${id('petal')})`} transform={`rotate(${a})`} />
      ))}
      <circle r="2.2" fill="#f9d0d9" />
      {[0, 72, 144, 216, 288].map((a) => (
        <line key={`l${a}`} x1="0" y1="0" x2="0" y2="-5" stroke="#c9587e" strokeWidth="0.6" transform={`rotate(${a + 36})`} />
      ))}
    </g>
  );
  const branch = (d: string, k: string) => (
    <g key={k}>
      <path d={d} fill="none" stroke="#3b2418" strokeWidth="6" strokeLinecap="round" />
      <path d={d} fill="none" stroke="#7a4b2a" strokeWidth="3.2" strokeLinecap="round" />
      <path d={d} fill="none" stroke="rgba(255,220,180,0.45)" strokeWidth="1" strokeLinecap="round" transform="translate(-0.8,-0.8)" />
    </g>
  );
  const petals: JSX.Element[] = [];
  for (let i = 0; i < 26; i++) {
    const x = 8 + rnd() * (W - 16);
    const y = 8 + rnd() * (H - 16);
    petals.push(
      <path
        key={`p${i}`}
        d="M0,0 C-3,-4 -2,-9 0,-10 C2,-9 3,-4 0,0 Z"
        transform={`translate(${x},${y}) rotate(${rnd() * 360}) scale(${0.8 + rnd() * 0.6})`}
        fill="#f9a8c0"
        opacity={0.55 + rnd() * 0.4}
        className={animated && i % 3 === 0 ? 'petal-fall' : undefined}
        style={{ animationDelay: `${rnd() * 6}s` }}
      />,
    );
  }
  return (
    <g>
      <defs>
        <radialGradient id={id('petal')} cx="0.5" cy="0.9" r="0.9">
          <stop offset="0" stopColor="#fbd5df" />
          <stop offset="1" stopColor="#f48fb1" />
        </radialGradient>
        <ShadowDef id={id('sshadow')} dy={1.8} blur={1.4} />
      </defs>
      {/* Mỗi cành (kèm hoa) dùng chung một filter bóng */}
      <g filter={`url(#${id('sshadow')})`}>
        {branch('M-10,20 C40,30 70,60 60,120 C55,150 80,180 110,200', 'b1')}
        {branch('M20,50 C40,70 50,95 45,120', 'b1a')}
        {blossom(26, 46, 1.1, 'f1')}
        {blossom(58, 100, 0.9, 'f2')}
        {blossom(64, 140, 1.2, 'f3')}
        {blossom(96, 190, 0.85, 'f4')}
      </g>
      <g filter={`url(#${id('sshadow')})`}>
        {branch(`M${W + 10},${H - 40} C${W - 60},${H - 60} ${W - 90},${H - 110} ${W - 70},${H - 170} C${W - 60},${H - 200} ${W - 90},${H - 230} ${W - 120},${H - 250}`, 'b2')}
        {blossom(W - 40, H - 60, 1.1, 'f5')}
        {blossom(W - 74, H - 130, 1, 'f6')}
        {blossom(W - 100, H - 236, 0.9, 'f7')}
        {blossom(W - 82, H - 190, 1.15, 'f8')}
      </g>
      {petals}
    </g>
  );
}
