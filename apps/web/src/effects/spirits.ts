/**
 * "Hồn quân": bóng vàng phát sáng của Xe, Mã, Pháo, Tốt (và tướng cưỡi ngựa, rồng) vẽ bằng Canvas.
 * Mọi hình đều hướng về bên phải (+x), y hướng xuống. Đơn vị ~ bàn cờ (1 ô = 60).
 */

export type SpiritKind = 'horse' | 'rider' | 'chariot' | 'cannon' | 'cannonDragon' | 'soldier';
/** Tư thế tranh: nhìn ngang (quay phải, lật để quay trái), lao về phía người xem, quay lưng lao ra xa */
export type SpiritPose = 'side' | 'front' | 'back';

export interface SpiritParams {
  /** tư thế muốn dùng; chưa có tranh cho tư thế này thì dùng tranh nhìn ngang */
  pose?: SpiritPose;
  /** pha chuyển động 0..∞ (chân ngựa, bánh xe, cờ bay) */
  phase: number;
  /** góc nâng nòng pháo (radian, âm = chếch lên) */
  aim?: number;
  /** độ giật nòng 0..1 */
  recoil?: number;
}

export interface SpiritStyle {
  /** màu sáng, giữa, tối của gradient (vàng, bạc, hoặc xanh ma) */
  colors: [string, string, string];
  glow: number; // 0..1
  alpha: number;
  /** vẽ thêm đường nét sáng bên trong (bậc cao) */
  detail?: boolean;
  /** Ma mị (Huyền thoại): nhấp nháy, mắt đỏ phát sáng, sương khói tím */
  eerie?: boolean;
  /** Thời gian (giây) để nhấp nháy / trôi sương khi eerie */
  time?: number;
  /** Tô màu ảnh vẽ sẵn: bạc, vàng, hoặc giữ nguyên màu gốc (hồn ma xanh tím) */
  tint?: 'silver' | 'gold' | 'ghost';
}

/* ------------------------------------------------------------------ */
/* Ảnh vẽ sẵn (public/spirits/*.webp)                                 */
/* ------------------------------------------------------------------ */

/**
 * Hồn quân dạng tranh: mỗi quân một ảnh nền trong suốt, quay mặt sang phải.
 * Ảnh gốc mang tông xanh tím mắt đỏ (Huyền thoại); bậc Bạc/Vàng được tô lại một lần rồi lưu đệm.
 * Nếu ảnh chưa tải xong (hoặc lỗi) thì vẽ hình khối bằng code như cũ.
 */
const SPRITE_KINDS: SpiritKind[] = ['horse', 'rider', 'chariot', 'cannon', 'cannonDragon', 'soldier'];
/**
 * Tư thế đã có tranh, ngoài 'side' (luôn có). Thêm tranh mới:
 *   1. đặt file public/spirits/<quân>-<tư thế>.webp, ví dụ horse-front.webp, soldier-back.webp
 *   2. khai báo ở đây, ví dụ horse: ['front', 'back']
 */
const EXTRA_POSES: Partial<Record<SpiritKind, SpiritPose[]>> = {
  horse: ['front', 'back'],
  rider: ['front', 'back'],
  chariot: ['front', 'back'],
  cannon: ['front', 'back'],
  cannonDragon: ['front', 'back'],
  soldier: ['front', 'back'],
};
const spriteImg = new Map<string, HTMLImageElement>();
const spriteTinted = new Map<string, HTMLCanvasElement>();

/** Bắt đầu tải ảnh hồn quân (gọi sớm để khi chiếu tướng ảnh đã sẵn) */
export function preloadSpirits() {
  if (typeof Image === 'undefined' || spriteImg.size) return;
  for (const k of SPRITE_KINDS) {
    for (const pose of ['side', ...(EXTRA_POSES[k] ?? [])] as SpiritPose[]) {
      const img = new Image();
      img.decoding = 'async';
      img.src = `${import.meta.env.BASE_URL}spirits/${k}${pose === 'side' ? '' : `-${pose}`}.webp`;
      spriteImg.set(`${k}:${pose}`, img);
    }
  }
}

/** Đổi màu ảnh theo bậc, giữ độ trong suốt và độ sáng tối */
function tintSprite(img: HTMLImageElement, tint: 'silver' | 'gold'): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const id = ctx.getImageData(0, 0, c.width, c.height);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const l = 0.3 * d[i]! + 0.59 * d[i + 1]! + 0.11 * d[i + 2]!;
    if (tint === 'silver') {
      // ánh bạc: xám sáng hơi xanh lạnh, tăng tương phản nhẹ
      const v = Math.min(255, (l - 128) * 1.15 + 150);
      d[i] = v * 0.95;
      d[i + 1] = Math.min(255, v * 1.0);
      d[i + 2] = Math.min(255, v * 1.08 + 8);
    } else {
      // ánh vàng: đồng thau sáng
      d[i] = Math.min(255, l * 1.35 + 45);
      d[i + 1] = Math.min(255, l * 1.05 + 22);
      d[i + 2] = Math.min(255, l * 0.42);
    }
  }
  ctx.putImageData(id, 0, 0);
  return c;
}

/** Ảnh đã sẵn sàng cho kiểu này (null nếu chưa tải xong) */
function spriteFor(kind: SpiritKind, style: SpiritStyle, pose: SpiritPose = 'side'): HTMLImageElement | HTMLCanvasElement | null {
  const ready = (i?: HTMLImageElement) => !!i && i.complete && i.naturalWidth > 0;
  let usePose = pose;
  let img = spriteImg.get(`${kind}:${pose}`);
  if (!ready(img)) {
    usePose = 'side';
    img = spriteImg.get(`${kind}:side`);
  }
  if (!img || !ready(img)) return null;
  const tint = style.tint ?? 'ghost';
  if (tint === 'ghost') return img;
  const key = `${kind}:${usePose}:${tint}`;
  let c = spriteTinted.get(key);
  if (!c) {
    c = tintSprite(img, tint);
    spriteTinted.set(key, c);
  }
  return c;
}

/** Vị trí miệng nòng trong ảnh pháo (tỉ lệ theo khung ảnh), theo tư thế */
const MUZZLE: Partial<Record<string, [number, number]>> = {
  'cannon:side': [0.96, 0.09],
  'cannonDragon:side': [0.97, 0.16],
  'cannon:front': [0.5, 0.22],
  'cannonDragon:front': [0.5, 0.5],
  'cannon:back': [0.5, 0.05],
  'cannonDragon:back': [0.5, 0.08],
};

/**
 * Khung vẽ tranh theo hộp hình khối: tranh nhìn ngang lấy đúng bề rộng hộp, đáy trùng đáy hộp;
 * tranh tư thế khác lấy cùng chiều cao với tranh nhìn ngang, căn giữa hộp.
 */
function spriteBox(
  kind: SpiritKind,
  style: SpiritStyle,
  sprite: HTMLImageElement | HTMLCanvasElement,
  box: [number, number, number, number],
): [number, number, number, number] {
  const [ox, oy, ow, oh] = box;
  const side = spriteFor(kind, style, 'side') ?? sprite;
  const h = (ow * side.height) / side.width;
  const w = (h * sprite.width) / sprite.height;
  return [ox + (ow - w) / 2, oy + oh - h, w, h];
}

/** Tranh đang dùng có đúng tư thế yêu cầu không (hay đã lùi về tranh nhìn ngang) */
function hasPose(kind: SpiritKind, pose: SpiritPose): boolean {
  const i = spriteImg.get(`${kind}:${pose}`);
  return !!i && i.complete && i.naturalWidth > 0;
}

/**
 * Miệng nòng theo toạ độ hình (trước khi nhân tỉ lệ/lật), nếu đang dùng ảnh; null nếu vẽ bằng code.
 */
export function spriteMuzzle(kind: SpiritKind, style: SpiritStyle, pose: SpiritPose = 'side'): { x: number; y: number } | null {
  const sprite = spriteFor(kind, style, pose);
  const m = MUZZLE[`${kind}:${hasPose(kind, pose) ? pose : 'side'}`];
  if (!sprite || !m) return null;
  const [x, y, w, h] = spriteBox(kind, style, sprite, spiritShapes(kind, { phase: 0 }).box);
  return { x: x + w * m[0], y: y + h * m[1] };
}

interface Shapes {
  fills: Path2D[];
  strokes: { p: Path2D; w: number }[];
  /** nét chi tiết sáng vẽ đè lên (tùy chọn) */
  details: { p: Path2D; w: number }[];
  /** hộp bao (để tính gradient) */
  box: [number, number, number, number];
  /** vị trí mắt (để vẽ mắt đỏ ma mị) */
  eyes?: [number, number][];
}

const poly = (pts: [number, number][]): Path2D => {
  const p = new Path2D();
  pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  p.closePath();
  return p;
};
const circle = (x: number, y: number, r: number): Path2D => {
  const p = new Path2D();
  p.arc(x, y, r, 0, Math.PI * 2);
  return p;
};
const ellipse = (x: number, y: number, rx: number, ry: number, rot = 0): Path2D => {
  const p = new Path2D();
  p.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  return p;
};
const line = (pts: [number, number][]): Path2D => {
  const p = new Path2D();
  pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
  return p;
};

/* ------------------------------------------------------------------ */
/* Ngựa phi                                                           */
/* ------------------------------------------------------------------ */

function horseShapes(phase: number, withRider = false): Shapes {
  const s = Math.sin(phase * 2 * Math.PI);
  const fills: Path2D[] = [];
  const strokes: Shapes['strokes'] = [];
  const details: Shapes['details'] = [];

  // Thân, ngực, mông
  fills.push(ellipse(0, 0, 48, 21, -0.08));
  fills.push(circle(30, -3, 21));
  fills.push(circle(-34, -1, 21));

  // Cổ + đầu
  const neck = new Path2D();
  neck.moveTo(22, -18);
  neck.quadraticCurveTo(42, -34, 54, -56);
  neck.lineTo(68, -62);
  neck.lineTo(94, -48);
  neck.lineTo(98, -38);
  neck.lineTo(86, -30);
  neck.quadraticCurveTo(72, -30, 60, -38);
  neck.quadraticCurveTo(50, -24, 36, -4);
  neck.closePath();
  fills.push(neck);
  // Tai
  fills.push(poly([[64, -60], [68, -76], [75, -62]]));
  fills.push(poly([[72, -60], [79, -74], [83, -60]]));
  // Bờm
  const mane = new Path2D();
  mane.moveTo(20, -20);
  for (let i = 1; i <= 5; i++) {
    const t = i / 5;
    const x = 22 + 44 * t;
    const y = -18 - 42 * t;
    mane.quadraticCurveTo(x - 14 - s * 3, y - 16, x, y - 2);
  }
  mane.lineTo(66, -62);
  mane.lineTo(22, -18);
  mane.closePath();
  fills.push(mane);
  // Đuôi
  const tail = new Path2D();
  tail.moveTo(-46, -8);
  tail.bezierCurveTo(-72, -18 + s * 4, -88, -2, -98, 14 - s * 6);
  strokes.push({ p: tail, w: 9 });
  const tail2 = new Path2D();
  tail2.moveTo(-46, -4);
  tail2.bezierCurveTo(-70, -6, -84, 8, -92, 26 - s * 6);
  strokes.push({ p: tail2, w: 5 });

  // Chân (tư thế phi, đánh chân theo pha)
  const f = s * 9;
  const legs: [number, number][][] = [
    [[26, 8], [44 + f, 22], [60 + f, 44]],
    [[18, 12], [34 - f * 0.6, 28], [50 - f * 0.6, 50]],
    [[-26, 8], [-46 - f, 24], [-64 - f, 46]],
    [[-20, 12], [-38 + f * 0.6, 30], [-52 + f * 0.6, 52]],
  ];
  for (const l of legs) strokes.push({ p: line(l), w: 10 });
  for (const l of legs) fills.push(circle(l[2]![0], l[2]![1] + 2, 6));

  // Mắt, lỗ mũi (chi tiết)
  details.push({ p: circle(84, -50, 2.2), w: 0 });
  const nostril = new Path2D();
  nostril.arc(94, -40, 2, 0, Math.PI * 2);
  details.push({ p: nostril, w: 0 });

  let box: Shapes['box'] = [-100, -80, 200, 136];
  const eyes: [number, number][] = [[84, -50]];
  if (withRider) {
    // Tướng quân cưỡi ngựa
    fills.push(poly([[-20, -50], [16, -50], [12, -20], [-16, -20]])); // giáp thân
    fills.push(circle(-2, -62, 10)); // đầu
    const helm = new Path2D();
    helm.arc(-2, -63, 13, Math.PI, 0);
    helm.closePath();
    fills.push(helm);
    fills.push(ellipse(-2, -66, 17, 4)); // vành mũ
    const plume = new Path2D();
    plume.moveTo(-2, -78);
    plume.bezierCurveTo(-14, -96, -30, -96 + s * 4, -44, -84);
    strokes.push({ p: plume, w: 5 });
    // Áo choàng bay
    const cape = new Path2D();
    cape.moveTo(-18, -50);
    cape.quadraticCurveTo(-52, -40 + s * 5, -72, -10);
    cape.quadraticCurveTo(-62, -2, -50, 0);
    cape.quadraticCurveTo(-40, -22, -14, -26);
    cape.closePath();
    fills.push(cape);
    // Chân, tay
    strokes.push({ p: line([[-4, -22], [8, -4], [14, 10]]), w: 7 });
    strokes.push({ p: line([[12, -46], [34, -40]]), w: 7 });
    // Đại đao
    strokes.push({ p: line([[-12, -4], [78, -104]]), w: 4 });
    fills.push(poly([[74, -108], [96, -132], [106, -120], [90, -100], [80, -98]]));
    strokes.push({ p: line([[74, -108], [70, -118]]), w: 3 });
    details.push({ p: line([[-14, -44], [10, -44]]), w: 1.5 });
    details.push({ p: line([[-12, -36], [8, -36]]), w: 1.5 });
    box = [-100, -136, 210, 192];
    eyes.push([2, -62]);
  }
  return { fills, strokes, details, box, eyes };
}

/* ------------------------------------------------------------------ */
/* Chiến xa (ngựa kéo)                                                 */
/* ------------------------------------------------------------------ */

function wheel(cx: number, cy: number, r: number, rot: number, fills: Path2D[], strokes: Shapes['strokes']) {
  const rim = new Path2D();
  rim.arc(cx, cy, r, 0, Math.PI * 2);
  strokes.push({ p: rim, w: 6 });
  for (let i = 0; i < 8; i++) {
    const a = rot + (i * Math.PI) / 4;
    strokes.push({ p: line([[cx, cy], [cx + Math.cos(a) * (r - 3), cy + Math.sin(a) * (r - 3)]]), w: 4 });
  }
  fills.push(circle(cx, cy, 6));
}

function chariotShapes(phase: number, withRider = false): Shapes {
  const horse = horseShapes(phase);
  const fills: Path2D[] = [];
  const strokes: Shapes['strokes'] = [];
  const details: Shapes['details'] = [];
  // Dời ngựa lên trước
  const m = new DOMMatrix().translate(70, 0);
  for (const f of horse.fills) {
    const p = new Path2D();
    p.addPath(f, m);
    fills.push(p);
  }
  for (const st of horse.strokes) {
    const p = new Path2D();
    p.addPath(st.p, m);
    strokes.push({ p, w: st.w });
  }
  const s = Math.sin(phase * 2 * Math.PI);
  // Càng xe nối ngựa
  strokes.push({ p: line([[-44, 6], [40, -2], [90, -6]]), w: 5 });
  // Thùng xe + thành trước cong
  fills.push(poly([[-118, -6], [-44, -6], [-40, 22], [-116, 22]]));
  const rail = new Path2D();
  rail.moveTo(-44, -6);
  rail.bezierCurveTo(-30, -18, -30, -36, -46, -42);
  rail.lineTo(-54, -38);
  rail.bezierCurveTo(-42, -30, -44, -16, -52, -6);
  rail.closePath();
  fills.push(rail);
  // Bánh xe (một bánh gần, một bánh xa nhỏ hơn)
  wheel(-96, 30, 22, phase * 6 + 0.3, fills, strokes);
  wheel(-72, 30, 28, phase * 6, fills, strokes);
  // Người đánh xe / tướng quân
  fills.push(poly([[-96, -40], [-68, -40], [-70, -6], [-94, -6]]));
  fills.push(circle(-82, -50, 9));
  const helm = new Path2D();
  helm.arc(-82, -51, 12, Math.PI, 0);
  helm.closePath();
  fills.push(helm);
  strokes.push({ p: line([[-70, -34], [-50, -24]]), w: 6 });
  if (withRider) {
    const plume = new Path2D();
    plume.moveTo(-82, -64);
    plume.bezierCurveTo(-96, -84, -110, -84 + s * 4, -122, -70);
    strokes.push({ p: plume, w: 5 });
    strokes.push({ p: line([[-96, -30], [-20, -96]]), w: 4 });
    fills.push(poly([[-24, -100], [-2, -124], [8, -112], [-8, -92], [-18, -90]]));
  }
  // Cột cờ + cờ phần phật
  strokes.push({ p: line([[-110, 22], [-110, -104]]), w: 4 });
  const flag = new Path2D();
  flag.moveTo(-110, -104);
  flag.quadraticCurveTo(-90, -100 + s * 5, -66, -96);
  flag.quadraticCurveTo(-88, -86 - s * 5, -110, -76);
  flag.closePath();
  fills.push(flag);
  details.push({ p: line([[-114, -2], [-48, -2]]), w: 1.5 });
  details.push({ p: line([[-112, 10], [-46, 10]]), w: 1.5 });
  return { fills, strokes, details, box: [-124, -130, 296, 190], eyes: [[154, -50], [-78, -51]] };
}

/* ------------------------------------------------------------------ */
/* Pháo cổ                                                            */
/* ------------------------------------------------------------------ */

function cannonShapes(phase: number, aim = -0.42, recoil = 0, dragon = false): Shapes {
  const fills: Path2D[] = [];
  const strokes: Shapes['strokes'] = [];
  const details: Shapes['details'] = [];
  // Giá gỗ + bánh
  fills.push(poly([[-62, 12], [52, 12], [42, -12], [-42, -12]]));
  fills.push(poly([[-12, -32], [12, -32], [14, -10], [-14, -10]]));
  wheel(-30, 30, 24, phase * 4, fills, strokes);
  wheel(34, 32, 20, phase * 4 + 0.5, fills, strokes);
  // Nòng (xoay quanh trục ở (-10,-26)), giật lùi theo recoil
  const m = new DOMMatrix().translate(-10, -26).rotate((aim * 180) / Math.PI).translate(-recoil * 16, 0);
  const barrel = new Path2D();
  barrel.moveTo(-34, -17);
  barrel.lineTo(120, -12);
  barrel.lineTo(120, 12);
  barrel.lineTo(-34, 17);
  barrel.quadraticCurveTo(-50, 0, -34, -17);
  barrel.closePath();
  const bp = new Path2D();
  bp.addPath(barrel, m);
  fills.push(bp);
  fills.push((() => {
    const p = new Path2D();
    p.addPath(circle(-50, 0, 8), m);
    return p;
  })());
  for (const x of [-10, 40, 86]) {
    const ring = new Path2D();
    ring.rect(x, -20 + (x + 34) * 0.03, 9, 40 - (x + 34) * 0.06);
    const rp = new Path2D();
    rp.addPath(ring, m);
    fills.push(rp);
  }
  if (dragon) {
    // Đầu rồng ở miệng nòng
    const upper = poly([[112, -16], [158, -34], [154, -12], [134, -4]]);
    const lower = poly([[112, 12], [150, 24], [146, 6], [128, 2]]);
    const up = new Path2D();
    up.addPath(upper, m);
    const lp = new Path2D();
    lp.addPath(lower, m);
    fills.push(up, lp);
    const horn1 = new Path2D();
    horn1.addPath(line([[130, -18], [138, -44]]), m);
    const horn2 = new Path2D();
    horn2.addPath(line([[140, -22], [154, -46]]), m);
    strokes.push({ p: horn1, w: 4 }, { p: horn2, w: 4 });
    const eye = new Path2D();
    eye.addPath(circle(134, -14, 3), m);
    details.push({ p: eye, w: 0 });
    const whisker = new Path2D();
    whisker.addPath(line([[150, -6], [176, -2], [190, 10]]), m);
    strokes.push({ p: whisker, w: 2.5 });
  } else {
    const muzzle = new Path2D();
    muzzle.rect(110, -16, 12, 32);
    const mp = new Path2D();
    mp.addPath(muzzle, m);
    fills.push(mp);
  }
  const d1 = new Path2D();
  d1.addPath(line([[-20, -8], [100, -5]]), m);
  details.push({ p: d1, w: 1.5 });
  const eyes: [number, number][] = [];
  if (dragon) {
    const pt = new DOMPoint(134, -14).matrixTransform(m);
    eyes.push([pt.x, pt.y]);
  }
  return { fills, strokes, details, box: [-70, -110, 240, 170], eyes };
}

/* ------------------------------------------------------------------ */
/* Lính cầm giáo                                                      */
/* ------------------------------------------------------------------ */

function soldierShapes(phase: number): Shapes {
  const s = Math.sin(phase * 2 * Math.PI);
  const fills: Path2D[] = [];
  const strokes: Shapes['strokes'] = [];
  const details: Shapes['details'] = [];
  fills.push(circle(0, -58, 10));
  const helm = new Path2D();
  helm.arc(0, -60, 14, Math.PI, 0);
  helm.closePath();
  fills.push(helm);
  fills.push(ellipse(0, -62, 17, 4));
  fills.push(poly([[0, -74], [-4, -90], [6, -88]]));
  fills.push(poly([[-15, -48], [15, -48], [12, -14], [-12, -14]]));
  fills.push(circle(-17, -45, 7));
  fills.push(circle(17, -45, 7));
  fills.push(poly([[-14, -14], [14, -14], [22, 8], [-22, 8]]));
  strokes.push({ p: line([[8, 6], [32 + s * 3, 16], [36, 44]]), w: 9 });
  strokes.push({ p: line([[-8, 6], [-30 - s * 3, 24], [-34, 46]]), w: 9 });
  strokes.push({ p: line([[14, -40], [36, -30]]), w: 7 });
  strokes.push({ p: line([[-14, -40], [-28, -22]]), w: 7 });
  // Giáo
  strokes.push({ p: line([[-44, -4], [84, -58]]), w: 4 });
  fills.push(poly([[80, -62], [106, -70], [86, -50]]));
  strokes.push({ p: line([[78, -56], [70, -66]]), w: 2.5 });
  details.push({ p: line([[-10, -40], [10, -40]]), w: 1.5 });
  details.push({ p: line([[-8, -30], [8, -30]]), w: 1.5 });
  return { fills, strokes, details, box: [-48, -94, 158, 146], eyes: [[3, -59]] };
}

/* ------------------------------------------------------------------ */
/* Vẽ                                                                 */
/* ------------------------------------------------------------------ */

export function spiritShapes(kind: SpiritKind, params: SpiritParams): Shapes {
  switch (kind) {
    case 'horse':
      return horseShapes(params.phase);
    case 'rider':
      return horseShapes(params.phase, true);
    case 'chariot':
      return chariotShapes(params.phase, false);
    case 'cannon':
      return cannonShapes(params.phase, params.aim, params.recoil, false);
    case 'cannonDragon':
      return cannonShapes(params.phase, params.aim, params.recoil, true);
    case 'soldier':
      return soldierShapes(params.phase);
  }
}

/** Kích thước gốc (chiều rộng) của hình để tính tỉ lệ */
export function spiritWidth(kind: SpiritKind): number {
  return spiritShapes(kind, { phase: 0 }).box[2];
}

/* ------------------------------------------------------------------ */
/* Canvas tạm dùng chung                                               */
/* ------------------------------------------------------------------ */

/**
 * `shadowBlur` trên canvas rất đắt: mỗi lệnh fill/stroke có bóng là một lần làm mờ riêng.
 * Hồn quân có ~40 nét → 40 lần mờ mỗi khung. Thay vào đó: vẽ hình một lần vào canvas tạm,
 * rồi "phát sáng" bằng MỘT lần drawImage có bóng (bóng của ảnh = quầng sáng), và vẽ ảnh lên.
 */
let scratch: HTMLCanvasElement | null = null;
function scratchCanvas(w: number, h: number): CanvasRenderingContext2D | null {
  if (w <= 0 || h <= 0 || w > 4096 || h > 4096) return null;
  if (!scratch) scratch = document.createElement('canvas');
  if (scratch.width !== w || scratch.height !== h) {
    scratch.width = w;
    scratch.height = h;
  }
  const c = scratch.getContext('2d');
  if (!c) return null;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, w, h);
  return c;
}

/**
 * Vẽ CHỈ bóng (silhouette mờ màu `color`) của ảnh `img` tại (dx, dy, dw, dh) theo hệ toạ độ hiện tại:
 * đẩy ảnh ra ngoài canvas bằng shadowOffset lớn (offset không bị transform ảnh hưởng) rồi kéo bóng về.
 */
function drawGlowOf(
  ctx: CanvasRenderingContext2D,
  img: HTMLCanvasElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  color: string,
  blurPx: number,
  alpha: number,
  composite: GlobalCompositeOperation = 'lighter',
) {
  const OFF = 20000;
  const t = ctx.getTransform();
  const p = t.transformPoint(new DOMPoint(dx, dy));
  const sx = Math.hypot(t.a, t.b);
  const sy = Math.hypot(t.c, t.d);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = composite;
  ctx.globalAlpha = alpha;
  ctx.shadowColor = color;
  ctx.shadowBlur = blurPx;
  ctx.shadowOffsetX = OFF;
  ctx.shadowOffsetY = 0;
  ctx.drawImage(img, p.x - OFF, p.y, dw * sx, dh * sy);
  ctx.restore();
}

/**
 * Vẽ hồn quân tại (x, y) với tỉ lệ `scale`, `facing` = 1 (phải) hoặc -1 (trái).
 * Hình được vẽ vào canvas tạm rồi ghép: quầng sáng (1 lần bóng) + ảnh gradient; ma mị thêm sương, ảnh ma, mắt đỏ.
 */
export function drawSpirit(
  ctx: CanvasRenderingContext2D,
  kind: SpiritKind,
  x: number,
  y: number,
  scale: number,
  facing: 1 | -1,
  params: SpiritParams,
  style: SpiritStyle,
  rotate = 0,
) {
  const sh = spiritShapes(kind, params);
  const time = style.time ?? params.phase;
  // Ma mị: nhấp nháy như bóng ma (alpha dao động nhanh, thỉnh thoảng tối hẳn)
  const flicker = style.eerie ? 0.72 + 0.28 * Math.abs(Math.sin(time * 23)) * (Math.sin(time * 7.3) > -0.85 ? 1 : 0.35) : 1;
  const alpha = style.alpha * flicker;
  // Có ảnh vẽ sẵn: dùng khung ảnh (cùng bề rộng hộp gốc, đáy trùng đáy hộp) thay cho hình khối
  const sprite = spriteFor(kind, style, params.pose);
  if (sprite) {
    sh.box = spriteBox(kind, style, sprite, sh.box);
  }
  const [bx, by, bw, bh] = sh.box;

  // Hộp bao của hình sau khi lật/tỉ lệ/xoay (tương đối tâm)
  const sx = scale * facing;
  const sy = scale;
  const cos = Math.cos(rotate);
  const sin = Math.sin(rotate);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [cx, cy] of [
    [bx, by],
    [bx + bw, by],
    [bx, by + bh],
    [bx + bw, by + bh],
  ] as [number, number][]) {
    const X = cx * sx;
    const Y = cy * sy;
    const rx = X * cos - Y * sin;
    const ry = X * sin + Y * cos;
    minX = Math.min(minX, rx);
    maxX = Math.max(maxX, rx);
    minY = Math.min(minY, ry);
    maxY = Math.max(maxY, ry);
  }
  const t = ctx.getTransform();
  const px = Math.hypot(t.a, t.b) || 1; // pixel / đơn vị logic
  const pad = 30;
  const lw = maxX - minX + pad * 2;
  const lh = maxY - minY + pad * 2;
  const sc = scratchCanvas(Math.ceil(lw * px), Math.ceil(lh * px));
  if (!sc || !scratch) return;

  // --- Vẽ hình vào canvas tạm (không bóng) ---
  sc.setTransform(px, 0, 0, px, (pad - minX) * px, (pad - minY) * px);
  sc.rotate(rotate);
  sc.scale(sx, sy);
  sc.lineCap = 'round';
  sc.lineJoin = 'round';
  if (sprite) {
    // Chuyển động cho ảnh tĩnh: nghiêng nhún theo nhịp (ngựa, lính), giật lùi khi pháo bắn
    const cx = bx + bw / 2;
    const cy = by + bh;
    const gallop = kind === 'cannon' || kind === 'cannonDragon' ? 0 : Math.sin(params.phase * Math.PI * 2) * 0.035;
    sc.translate(cx - (params.recoil ?? 0) * 14, cy);
    sc.rotate(gallop);
    sc.translate(-cx, -cy);
    sc.drawImage(sprite, bx, by, bw, bh);
  } else {
  const grad = sc.createLinearGradient(bx, by, bx + bw * 0.3, by + bh);
  grad.addColorStop(0, style.colors[0]);
  grad.addColorStop(0.55, style.colors[1]);
  grad.addColorStop(1, style.colors[2]);
  sc.fillStyle = grad;
  sc.strokeStyle = grad;
  for (const f of sh.fills) sc.fill(f);
  for (const st of sh.strokes) {
    sc.lineWidth = st.w;
    sc.stroke(st.p);
  }
  if (style.detail) {
    sc.strokeStyle = style.colors[0];
    sc.fillStyle = style.eerie ? '#1a0a2e' : '#3a2408';
    sc.globalAlpha = 0.9;
    for (const d of sh.details) {
      if (d.w === 0) sc.fill(d.p);
      else {
        sc.lineWidth = d.w;
        sc.stroke(d.p);
      }
    }
    sc.globalAlpha = 1;
  }
  if (style.eerie && sh.eyes) {
    // Mắt đỏ phát sáng, thỉnh thoảng lóe
    const pulse = 0.7 + 0.3 * Math.sin(time * 13);
    sc.globalCompositeOperation = 'lighter';
    for (const [ex, ey] of sh.eyes) {
      const g = sc.createRadialGradient(ex, ey, 0, ex, ey, 14);
      g.addColorStop(0, `rgba(255,240,240,${pulse})`);
      g.addColorStop(0.25, `rgba(255,40,40,${pulse})`);
      g.addColorStop(1, 'rgba(255,0,0,0)');
      sc.fillStyle = g;
      sc.beginPath();
      sc.arc(ex, ey, 14, 0, Math.PI * 2);
      sc.fill();
      sc.fillStyle = '#ff2020';
      sc.beginPath();
      sc.arc(ex, ey, 3.2, 0, Math.PI * 2);
      sc.fill();
    }
    sc.globalCompositeOperation = 'source-over';
  }
  } // hết nhánh vẽ hình khối

  // --- Ghép lên canvas chính ---
  const dx = x + minX - pad;
  const dy = y + minY - pad;
  if (style.eerie) {
    // Sương khói tím trôi quanh hồn ma
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = style.alpha * 0.35;
    const w = maxX - minX;
    const h = maxY - minY;
    for (let i = 0; i < 5; i++) {
      const a = time * 1.7 + i * 1.26;
      const cx = x + minX + w * (0.5 + 0.38 * Math.cos(a * 0.9 + i));
      const cy = y + minY + h * (0.55 + 0.32 * Math.sin(a * 1.3));
      const r = w * (0.22 + 0.06 * Math.sin(a * 2));
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, 'rgba(120,80,220,0.55)');
      g.addColorStop(0.6, 'rgba(60,200,170,0.2)');
      g.addColorStop(1, 'rgba(40,10,80,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // Ảnh ma lệch tím
    drawGlowOf(ctx, scratch, dx + Math.sin(time * 11) * 6, dy + Math.cos(time * 9) * 4, lw, lh, '#a78bfa', Math.min(14, 7 * px), alpha * 0.35);
  }
  // Bán kính mờ tính bằng pixel và có trần: chi phí blur tỉ lệ với diện tích × bán kính
  if (style.glow > 0) drawGlowOf(ctx, scratch, dx, dy, lw, lh, style.colors[1], Math.min(30, 16 * style.glow * px), alpha * 0.9);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(scratch, dx, dy, lw, lh);
  if (style.glow > 0) {
    // Làm hình tự phát sáng nhẹ
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * 0.22 * style.glow;
    ctx.drawImage(scratch, dx, dy, lw, lh);
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Rồng bay (dùng cho bậc Huyền thoại)                                */
/* ------------------------------------------------------------------ */

/**
 * Vẽ rồng theo chuỗi điểm (đầu = điểm cuối). Thân mập: bề rộng gần như đều (chỉ thon ở đuôi),
 * có vảy bụng sáng, vây lưng lớn, đầu to với hàm, sừng, râu, bờm; chân có móng.
 */
export function drawDragon(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[], width: number, style: SpiritStyle, t: number) {
  if (pts.length < 3) return;
  const head = pts[pts.length - 1]!;
  const prev = pts[pts.length - 3]!;
  const ang = Math.atan2(head.y - prev.y, head.x - prev.x);
  const n = pts.length;
  // Vẽ vào canvas tạm (không bóng) rồi ghép: 1 lần quầng sáng + 1 lần ảnh
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const pad = width * 3.6;
  const tr = ctx.getTransform();
  const px = Math.hypot(tr.a, tr.b) || 1;
  const lw = maxX - minX + pad * 2;
  const lh = maxY - minY + pad * 2;
  const sc = scratchCanvas(Math.ceil(lw * px), Math.ceil(lh * px));
  if (!sc || !scratch) return;
  sc.setTransform(px, 0, 0, px, (pad - minX) * px, (pad - minY) * px);
  sc.lineCap = 'round';
  sc.lineJoin = 'round';
  /** bề rộng thân tại đoạn i: đuôi thon, giữa mập, gần đầu hơi thu lại (cổ) */
  const bodyW = (i: number) => {
    const k = i / n;
    const taper = k < 0.35 ? 0.3 + (k / 0.35) * 0.7 : 1;
    const neck = k > 0.9 ? 1 - ((k - 0.9) / 0.1) * 0.15 : 1;
    return width * taper * neck;
  };
  const normal = (i: number) => {
    const a = Math.atan2(pts[i]!.y - pts[i - 1]!.y, pts[i]!.x - pts[i - 1]!.x);
    return { nx: -Math.sin(a), ny: Math.cos(a) };
  };
  const layer = (ctx: CanvasRenderingContext2D, color: string, widen: number, belly: string | null) => {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    // Thân
    for (let i = 1; i < n; i++) {
      ctx.lineWidth = bodyW(i) + widen;
      ctx.beginPath();
      ctx.moveTo(pts[i - 1]!.x, pts[i - 1]!.y);
      ctx.lineTo(pts[i]!.x, pts[i]!.y);
      ctx.stroke();
    }
    // Vây lưng lớn (răng cưa)
    for (let i = 3; i < n - 3; i += 2) {
      const { nx, ny } = normal(i);
      const fin = bodyW(i) * 0.75;
      ctx.beginPath();
      ctx.moveTo(pts[i - 1]!.x - nx * bodyW(i) * 0.3, pts[i - 1]!.y - ny * bodyW(i) * 0.3);
      ctx.lineTo(pts[i]!.x - nx * (bodyW(i) * 0.4 + fin), pts[i]!.y - ny * (bodyW(i) * 0.4 + fin));
      ctx.lineTo(pts[i + 1]!.x - nx * bodyW(i) * 0.3, pts[i + 1]!.y - ny * bodyW(i) * 0.3);
      ctx.closePath();
      ctx.fill();
    }
    // Vảy bụng: dải sáng phía dưới thân
    if (belly) {
      ctx.save();
      ctx.strokeStyle = belly;
      ctx.shadowBlur = 0;
      for (let i = 2; i < n; i++) {
        const { nx, ny } = normal(i);
        const off = bodyW(i) * 0.28;
        ctx.lineWidth = bodyW(i) * 0.32;
        ctx.beginPath();
        ctx.moveTo(pts[i - 1]!.x + nx * off, pts[i - 1]!.y + ny * off);
        ctx.lineTo(pts[i]!.x + nx * off, pts[i]!.y + ny * off);
        ctx.stroke();
      }
      // Vạch vảy ngang bụng
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.5, width * 0.06);
      for (let i = 4; i < n - 2; i += 2) {
        const { nx, ny } = normal(i);
        const w = bodyW(i);
        ctx.beginPath();
        ctx.moveTo(pts[i]!.x + nx * w * 0.1, pts[i]!.y + ny * w * 0.1);
        ctx.lineTo(pts[i]!.x + nx * w * 0.46, pts[i]!.y + ny * w * 0.46);
        ctx.stroke();
      }
      ctx.restore();
    }
    // Chân + móng (2 cặp)
    for (let i = Math.floor(n * 0.35); i < n - 6; i += Math.max(8, Math.floor(n * 0.3))) {
      const p = pts[i]!;
      const { nx, ny } = normal(i);
      const w = bodyW(i);
      for (const side of [1, -1]) {
        const sx = p.x + nx * w * 0.35 * side;
        const sy = p.y + ny * w * 0.35 * side;
        const swing = Math.sin(t * 6 + i) * 0.25;
        ctx.lineWidth = w * 0.3 + widen;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        const kx = sx + (nx * side + 0.3) * w * 0.7 + swing * w;
        const ky = sy + (ny * side + 0.6) * w * 0.7;
        ctx.lineTo(kx, ky);
        ctx.stroke();
        ctx.lineWidth = w * 0.14 + widen;
        for (const c of [-0.5, 0, 0.5]) {
          ctx.beginPath();
          ctx.moveTo(kx, ky);
          ctx.lineTo(kx + w * 0.42 + c * w * 0.3, ky + w * 0.5 - Math.abs(c) * w * 0.2);
          ctx.stroke();
        }
      }
    }
    // Đầu rồng: to, hàm há, mũi hếch
    ctx.save();
    ctx.translate(head.x, head.y);
    ctx.rotate(ang);
    const w = width * 1.15;
    ctx.beginPath();
    ctx.moveTo(-w * 0.4, -w * 0.7);
    ctx.quadraticCurveTo(w * 0.6, -w * 1.05, w * 1.35, -w * 0.85);
    ctx.lineTo(w * 1.75, -w * 0.45);
    ctx.lineTo(w * 1.55, -w * 0.05);
    ctx.lineTo(w * 1.2, w * 0.05);
    ctx.lineTo(w * 1.6, w * 0.55);
    ctx.lineTo(w * 0.9, w * 0.7);
    ctx.quadraticCurveTo(w * 0.3, w * 0.85, -w * 0.4, w * 0.7);
    ctx.closePath();
    ctx.fill();
    // Bờm sau gáy
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.moveTo(-w * 0.1 - k * w * 0.16, -w * 0.5);
      ctx.quadraticCurveTo(-w * 0.55 - k * w * 0.2, -w * 1.1 + Math.sin(t * 8 + k) * w * 0.1, -w * 0.5 - k * w * 0.3, -w * 1.4 - k * w * 0.05);
      ctx.lineWidth = w * 0.16 + widen;
      ctx.stroke();
    }
    // Sừng
    ctx.lineWidth = w * 0.22 + widen;
    ctx.beginPath();
    ctx.moveTo(w * 0.35, -w * 0.8);
    ctx.quadraticCurveTo(w * 0.1, -w * 1.6, w * 0.7, -w * 2.1);
    ctx.moveTo(w * 0.8, -w * 0.9);
    ctx.quadraticCurveTo(w * 0.8, -w * 1.6, w * 1.3, -w * 2.0);
    ctx.stroke();
    // Râu
    ctx.lineWidth = w * 0.1 + widen;
    ctx.beginPath();
    ctx.moveTo(w * 1.6, -w * 0.15);
    ctx.quadraticCurveTo(w * 2.5, -w * 0.4 + Math.sin(t * 9) * w * 0.2, w * 3.1, w * 0.25);
    ctx.moveTo(w * 1.55, w * 0.2);
    ctx.quadraticCurveTo(w * 2.4, w * 0.5 + Math.cos(t * 9) * w * 0.2, w * 3.0, w * 0.9);
    ctx.stroke();
    // Mắt
    if (belly) {
      ctx.fillStyle = '#2a1204';
      ctx.beginPath();
      ctx.arc(w * 0.75, -w * 0.4, w * 0.13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(w * 0.72, -w * 0.44, w * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };
  layer(sc, style.colors[1], 0, style.colors[0]);
  const dx = minX - pad;
  const dy = minY - pad;
  drawGlowOf(ctx, scratch, dx, dy, lw, lh, style.colors[2], Math.min(30, 16 * style.glow * px), style.alpha * 0.7);
  ctx.save();
  ctx.globalAlpha = style.alpha;
  ctx.drawImage(scratch, dx, dy, lw, lh);
  ctx.restore();
}
