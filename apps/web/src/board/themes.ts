import type { PieceName } from '@np/rules';
import type { BoardSkinId, PieceSetId } from '../lib/cosmetics';

export interface BoardTheme {
  bg: [string, string, string];
  line: string;
  border: string;
  river: string;
  coord: string;
  /** Màu cạnh trước (bề dày bàn): trên → dưới */
  edge: [string, string];
  /** Họa tiết nền */
  texture?: 'bamboo' | 'paper' | 'marble' | 'lacquer' | 'jade' | 'neon' | 'palace' | 'wood' | 'ice' | 'fire' | 'galaxy' | 'sakura';
  lineWidth?: number;
  glow?: string;
  /** Nền tối: dùng ánh sáng nhẹ hơn, bóng đậm hơn */
  dark?: boolean;
  /**
   * Bàn vẽ sẵn bằng ảnh (đã có lưới, sông, khung). Ảnh được co giãn sao cho lưới trong ảnh
   * trùng lưới quân; khi có ảnh thì không vẽ lưới, chữ sông và trang trí SVG.
   */
  image?: {
    /** Đường dẫn trong thư mục public */
    src: string;
    /** Kích thước ảnh (px) */
    size: [number, number];
    /** Toạ độ lưới trong ảnh: [x cột 1, y hàng trên cùng, x cột 9, y hàng dưới cùng] */
    grid: [number, number, number, number];
  };
}

export const BOARD_THEMES: Record<BoardSkinId, BoardTheme> = {
  wood: {
    bg: ['#f0cf8f', '#e6bc78', '#d9a860'],
    line: '#5a3a1c',
    border: '#6b4423',
    river: '#6b4423',
    coord: '#6b4423',
    edge: ['#8a5a2b', '#3d2410'],
    texture: 'wood',
  },
  bamboo: {
    bg: ['#e2efbd', '#c5dc97', '#a6c877'],
    line: '#3f5a22',
    border: '#4f6f2a',
    river: '#3f5a22',
    coord: '#3f5a22',
    edge: ['#5f8a2f', '#28421a'],
    texture: 'bamboo',
    // Ảnh gốc 1254×1254 đã nén khung theo kiểu 9 mảnh
    image: { src: 'boards/bamboo.webp?v=2', size: [995, 1082], grid: [74, 73, 921, 1009] },
  },
  paper: {
    bg: ['#f7eed8', '#efe2c2', '#e6d6b0'],
    line: '#3b2f22',
    border: '#8a6f4a',
    river: '#8b1e1e',
    coord: '#5a4632',
    edge: ['#b59a6e', '#5c4a2c'],
    texture: 'paper',
    // Ảnh gốc 1254×1254: nén khung 9 mảnh, kéo từng ô cho lưới đều
    image: { src: 'boards/paper.webp?v=1', size: [1016, 1102], grid: [76, 74, 940, 1028] },
    lineWidth: 1.6,
  },
  marble: {
    bg: ['#f7f7f5', '#e7e6e2', '#d6d4ce'],
    line: '#9c7a26',
    border: '#8a7a4a',
    river: '#9c7a26',
    coord: '#7a6a3a',
    edge: ['#bfbcb4', '#5e5a52'],
    texture: 'marble',
    // Ảnh gốc 1254×1254 đã nén khung theo kiểu 9 mảnh
    image: { src: 'boards/marble.webp?v=1', size: [1009, 1102], grid: [75, 74, 934, 1028] },
  },
  lacquer: {
    bg: ['#2b1a14', '#1f120d', '#140b08'],
    line: '#d4af37',
    border: '#8a1c12',
    river: '#e8c768',
    coord: '#d4af37',
    edge: ['#2a2018', '#050302'],
    texture: 'lacquer',
    // Ảnh gốc 1254×1254: nén khung 9 mảnh, kéo từng ô cho lưới đều
    image: { src: 'boards/lacquer.webp?v=1', size: [1062, 1093], grid: [79, 74, 983, 1019] },
    dark: true,
  },
  jade: {
    bg: ['#9fe0c4', '#5fb896', '#2f8f6f'],
    line: '#0f3d2e',
    border: '#1d5e47',
    river: '#0f3d2e',
    coord: '#0f3d2e',
    edge: ['#2f8f6f', '#0e3a2b'],
    texture: 'jade',
    // Ảnh gốc 1254×1254 đã nén khung theo kiểu 9 mảnh
    image: { src: 'boards/jade.webp?v=1', size: [1002, 1080], grid: [75, 73, 927, 1007] },
  },
  neon: {
    bg: ['#141a2e', '#0b0f1a', '#070a12'],
    line: '#22d3ee',
    border: '#a855f7',
    river: '#f472b6',
    coord: '#67e8f9',
    edge: ['#1b2340', '#05070f'],
    texture: 'neon',
    // Ảnh gốc 1254×1254: nén khung 9 mảnh, kéo từng ô cho lưới đều
    image: { src: 'boards/neon.webp?v=1', size: [1006, 1082], grid: [75, 73, 931, 1009] },
    glow: '#22d3ee',
    dark: true,
  },
  palace: {
    bg: ['#c42d22', '#a3201a', '#7a1410'],
    line: '#f2c14e',
    border: '#f2c14e',
    river: '#ffe29a',
    coord: '#ffe29a',
    edge: ['#7a1410', '#2e0705'],
    texture: 'palace',
    // Ảnh gốc 1254×1254 đã nén khung theo kiểu 9 mảnh
    image: { src: 'boards/palace.webp?v=1', size: [998, 1087], grid: [74, 73, 924, 1014] },
    dark: true,
  },
  ice: {
    bg: ['#f2fbff', '#c9ecfb', '#96d3f3'],
    line: '#1b4f78',
    border: '#7fc4ec',
    river: '#1b4f78',
    coord: '#1b4f78',
    edge: ['#a8d9f3', '#3f83b3'],
    texture: 'ice',
    // Ảnh gốc 1024×1020 đã nén khung theo kiểu 9 mảnh để cả khung hoa văn vừa lề bàn
    image: { src: 'boards/ice.webp?v=2', size: [830, 916], grid: [62, 62, 768, 854] },
  },
  fire: {
    bg: ['#3d1608', '#241009', '#120705'],
    line: '#ff9a3c',
    border: '#ff6a1a',
    river: '#ffb060',
    coord: '#ffb060',
    edge: ['#5a1f08', '#160603'],
    texture: 'fire',
    // Ảnh gốc 1024×1020 đã nén khung theo kiểu 9 mảnh
    image: { src: 'boards/fire.webp?v=1', size: [836, 922], grid: [62, 62, 774, 860] },
    glow: '#ff6a1a',
    dark: true,
  },
  galaxy: {
    bg: ['#221a55', '#0f0b32', '#060418'],
    line: '#c4b5fd',
    border: '#8b5cf6',
    river: '#f0abfc',
    coord: '#c4b5fd',
    edge: ['#2a1f66', '#08061c'],
    texture: 'galaxy',
    // Ảnh gốc 1254×1254 đã nén khung theo kiểu 9 mảnh
    image: { src: 'boards/galaxy.webp?v=1', size: [997, 1080], grid: [74, 73, 923, 1007] },
    glow: '#a78bfa',
    dark: true,
  },
  sakura: {
    bg: ['#fff4f6', '#ffdde5', '#f9bfcd'],
    line: '#7a2a45',
    border: '#c9587e',
    river: '#b03060',
    coord: '#7a2a45',
    edge: ['#7a2f22', '#3a130c'],
    texture: 'sakura',
    // Ảnh gốc 1254×1254 đã nén khung theo kiểu 9 mảnh
    image: { src: 'boards/sakura.webp?v=2', size: [1008, 1086], grid: [75, 73, 933, 1013] },
  },
};

/** Kiểu khối 3D của một bộ quân */
export interface PieceTheme {
  shape: 'disc' | 'hex';
  /** Độ dày nhìn thấy (px) — 0 = phẳng */
  thickness: number;
  /** Màu mặt bên (trên → dưới) */
  side: [string, string];
  /** Mặt trên: điểm sáng, giữa, mép */
  face: (red: boolean) => [string, string, string];
  rim: (red: boolean) => string;
  rimWidth: number;
  ring: (red: boolean) => string | null;
  text: (red: boolean) => string;
  textFx: 'flat' | 'engraved' | 'embossed' | 'glow' | 'goldleaf';
  font: 'han' | 'viet' | 'icon' | 'calligraphy';
  gloss?: boolean;
  grain?: boolean;
  translucent?: boolean;
  neon?: boolean;
  /**
   * Bộ quân vẽ sẵn bằng ảnh: thư mục trong public, mỗi quân một file <r|b>_<tên quân>.webp
   * (ảnh vuông, quân tròn ở giữa, nền trong suốt). Có ảnh thì không vẽ mặt/chữ bằng SVG.
   */
  images?: string;
  /** Họa tiết phủ trên mặt quân */
  overlay?: 'stars' | 'cracks' | 'frost' | 'patina';
}

const RED = '#b3261e';
const BLACK = '#1d1d1d';

export const PIECE_THEMES: Record<PieceSetId, PieceTheme> = {
  han: {
    shape: 'disc',
    thickness: 3,
    side: ['#c99a55', '#7a5222'],
    face: () => ['#fff8e6', '#f1dcb0', '#d9b97f'],
    rim: () => '#8a6a3a',
    rimWidth: 1.5,
    ring: (r) => (r ? RED : BLACK),
    text: (r) => (r ? RED : BLACK),
    textFx: 'flat',
    font: 'han',
  },
  viet: {
    shape: 'disc',
    thickness: 3,
    side: ['#c99a55', '#7a5222'],
    face: () => ['#fff8e6', '#f1dcb0', '#d9b97f'],
    rim: (r) => (r ? RED : BLACK),
    rimWidth: 2,
    // Không vẽ vòng trong để chữ thư pháp có chỗ
    ring: () => null,
    text: (r) => (r ? RED : BLACK),
    textFx: 'flat',
    font: 'viet',
  },
  icon: {
    shape: 'disc',
    thickness: 4,
    side: ['#5a4a3a', '#2a2018'],
    face: (r) => (r ? ['#ff8a75', '#c62828', '#7f1410'] : ['#7d8fa3', '#37474f', '#141c22']),
    rim: () => '#f2c14e',
    rimWidth: 2.5,
    ring: () => 'rgba(255,255,255,0.35)',
    text: () => '#fff8e6',
    textFx: 'glow',
    font: 'icon',
    gloss: true,
  },
  wood3d: {
    shape: 'disc',
    thickness: 7,
    side: ['#b07a3a', '#4a2e12'],
    face: () => ['#f0c98a', '#cf9e5a', '#9c6a35'],
    rim: () => '#5a3a1c',
    rimWidth: 2,
    ring: () => '#5a3a1c',
    text: (r) => (r ? '#7a1710' : '#1a0f08'),
    textFx: 'engraved',
    font: 'han',
    grain: true,
  },
  lacquer: {
    shape: 'disc',
    thickness: 6,
    side: ['#2a1a10', '#050302'],
    face: (r) => (r ? ['#e04a3a', '#a01f16', '#5c0f0a'] : ['#4a4a4a', '#1c1c1c', '#050505']),
    rim: () => '#d4af37',
    rimWidth: 2,
    ring: () => '#d4af37',
    text: () => '#f3cf62',
    textFx: 'embossed',
    font: 'han',
    gloss: true,
    images: 'pieces/lacquer',
  },
  jade: {
    shape: 'disc',
    thickness: 6,
    side: ['#8fd8b8', '#1f5f47'],
    face: (r) => (r ? ['#ffe9df', '#f2a98f', '#c9603f'] : ['#e6fff2', '#8fd8b8', '#2f8f6f']),
    rim: (r) => (r ? '#b9432a' : '#1d5e47'),
    rimWidth: 1.5,
    ring: (r) => (r ? 'rgba(138,28,18,0.7)' : 'rgba(15,61,46,0.7)'),
    text: (r) => (r ? '#7a1710' : '#0b3326'),
    textFx: 'engraved',
    font: 'han',
    translucent: true,
    gloss: true,
  },
  cyber: {
    shape: 'hex',
    thickness: 5,
    side: ['#26324f', '#0a0e1a'],
    face: () => ['#1c2440', '#0f1528', '#070a12'],
    rim: (r) => (r ? '#f472b6' : '#22d3ee'),
    rimWidth: 2.5,
    ring: (r) => (r ? 'rgba(244,114,182,0.45)' : 'rgba(34,211,238,0.45)'),
    text: (r) => (r ? '#f9a8d4' : '#67e8f9'),
    textFx: 'glow',
    font: 'han',
    neon: true,
  },
  gold: {
    shape: 'disc',
    thickness: 5,
    side: ['#e0c98a', '#8a6414'],
    face: () => ['#fffdf5', '#f6ecd0', '#e3cf9a'],
    rim: () => '#b8860b',
    rimWidth: 2,
    ring: () => '#c9a227',
    text: (r) => (r ? '#b3261e' : '#8a6414'),
    textFx: 'goldleaf',
    font: 'calligraphy',
    gloss: true,
  },
  bronze: {
    shape: 'disc',
    thickness: 7,
    side: ['#a7783e', '#3a2712'],
    face: (r) => (r ? ['#e8c48a', '#a6772f', '#5a3d14'] : ['#c9b98a', '#6f6a3a', '#33301a']),
    rim: () => '#2b1d0c',
    rimWidth: 2,
    ring: () => 'rgba(95,160,138,0.7)',
    text: (r) => (r ? '#fff1c8' : '#eaf5e6'),
    textFx: 'embossed',
    font: 'han',
    overlay: 'patina',
  },
  ice: {
    shape: 'disc',
    thickness: 5,
    side: ['#c8ecfd', '#5aa5d6'],
    face: (r) => (r ? ['#ffe9ef', '#ffb8c9', '#e87c9a'] : ['#f6fcff', '#cfeeff', '#8fd0f4']),
    rim: () => '#ffffff',
    rimWidth: 2,
    ring: () => 'rgba(255,255,255,0.7)',
    text: (r) => (r ? '#8a1c3a' : '#0b3a5c'),
    textFx: 'engraved',
    font: 'han',
    translucent: true,
    gloss: true,
    overlay: 'frost',
    images: 'pieces/ice',
  },
  fire: {
    shape: 'disc',
    thickness: 6,
    side: ['#3a1508', '#0d0503'],
    face: (r) => (r ? ['#ff9a4a', '#b71c1c', '#3a0a0a'] : ['#5a5a5a', '#232323', '#080808']),
    rim: () => '#ff6a1a',
    rimWidth: 2,
    ring: () => 'rgba(255,140,40,0.5)',
    text: () => '#ffd27a',
    textFx: 'glow',
    font: 'han',
    neon: true,
    overlay: 'cracks',
  },
  galaxy: {
    shape: 'disc',
    thickness: 5,
    side: ['#4c3a99', '#120c30'],
    face: (r) => (r ? ['#ff9ad5', '#9d174d', '#3b0a2a'] : ['#93c5fd', '#1e3a8a', '#0b1033']),
    rim: () => '#e9d5ff',
    rimWidth: 2,
    ring: () => 'rgba(233,213,255,0.5)',
    text: () => '#fdf4ff',
    textFx: 'glow',
    font: 'han',
    gloss: true,
    overlay: 'stars',
  },
  bamboo: {
    shape: 'disc',
    thickness: 6,
    side: ['#4f7d2a', '#1f3a10'],
    face: () => ['#f6dfb0', '#e3c38a', '#b98f55'],
    rim: () => '#3f6b1f',
    rimWidth: 2,
    ring: () => null,
    text: (r) => (r ? '#b3261e' : '#16301a'),
    textFx: 'engraved',
    font: 'han',
    images: 'pieces/bamboo',
  },
};

export const ICON_LABEL: Record<PieceName, string> = {
  king: '♚',
  advisor: '♛',
  elephant: '♝',
  horse: '♞',
  chariot: '♜',
  cannon: '⦿',
  soldier: '♟',
};
