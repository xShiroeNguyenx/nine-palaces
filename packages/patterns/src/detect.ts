import {
  ADVISOR,
  CANNON,
  CHARIOT,
  ELEPHANT,
  HORSE,
  KING,
  SOLDIER,
  Game as GameClass,
  colOf,
  moveTo,
  rowOf,
  type Game,
  type PieceName,
  type Position,
  type Side,
} from '@np/rules';
import { PATTERNS, patternById, type Cond, type PatternDef, type PatternKind } from './data';
import { between, centralCannonMove, ownMove, piecesOf, rel, relFile, relRank, relSq, type PatternContext } from './context';

const TYPE: Record<PieceName, number> = {
  king: KING,
  advisor: ADVISOR,
  elephant: ELEPHANT,
  horse: HORSE,
  chariot: CHARIOT,
  cannon: CANNON,
  soldier: SOLDIER,
};

export interface PatternHit {
  id: string;
  name: string;
  kind: PatternKind;
  side: 'red' | 'black';
  description: string;
}

function makeContext(game: Game, side: Side): PatternContext {
  const ownRecords = game.records.filter((r) => (r.side === 'red' ? 1 : -1) === side);
  return {
    game,
    pos: game.pos,
    side,
    ownMoves: ownRecords.length,
    ownRecords,
    last: game.records[game.records.length - 1]!,
  };
}

/* ------------------------------ Hàm riêng ------------------------------ */

/** Quân chắn duy nhất giữa hai ô thẳng hàng (-1 nếu không đúng 1 quân) */
function screenBetween(pos: Position, a: number, b: number): number {
  const dr = Math.sign(rowOf(b) - rowOf(a));
  const dc = Math.sign(colOf(b) - colOf(a));
  let r = rowOf(a) + dr;
  let c = colOf(a) + dc;
  let found = -1;
  while (r !== rowOf(b) || c !== colOf(b)) {
    if (pos.board[r * 9 + c] !== 0) {
      if (found >= 0) return -1;
      found = r * 9 + c;
    }
    r += dr;
    c += dc;
  }
  return found;
}

function checkersOf(ctx: PatternContext): number[] {
  return ctx.pos.checkers(-ctx.side as Side);
}

function typeAt(pos: Position, s: number): number {
  return Math.abs(pos.board[s]!);
}

function enemyKing(ctx: PatternContext): number {
  return ctx.pos.kingSquare(-ctx.side as Side);
}

const CUSTOM: Record<string, (ctx: PatternContext) => boolean> = {
  never: () => false,

  thuan_phao: (ctx) => cannonDuel(ctx) === 'same',
  nghich_phao: (ctx) => cannonDuel(ctx) === 'opposite',
  ban_do_nghich_phao: (ctx) => {
    const first = ownMove(ctx, 0);
    const mine = centralCannonMove(ctx);
    return !!first && first.piece === 'horse' && !!mine && mine.index >= 1 && cannonDuel(ctx) === 'opposite';
  },
  chariot_moved_first: (ctx) => {
    const idxC = ctx.ownRecords.findIndex((r) => r.piece === 'chariot');
    const idxP = ctx.ownRecords.findIndex((r, i) => r.piece === 'cannon' && relRank(moveTo(r.move), ctx.side) === 1 && i >= 0);
    return idxC >= 0 && idxP > idxC;
  },
  two_cannons_center: (ctx) => piecesOf(ctx.pos, ctx.side, CANNON).filter((s) => relFile(s, ctx.side) === 4).length === 2,
  cannons_adjacent: (ctx) => {
    const cs = piecesOf(ctx.pos, ctx.side, CANNON);
    return cs.length === 2 && rowOf(cs[0]!) === rowOf(cs[1]!) && Math.abs(colOf(cs[0]!) - colOf(cs[1]!)) === 1;
  },
  cannons_stacked: (ctx) => {
    const cs = piecesOf(ctx.pos, ctx.side, CANNON);
    return cs.length === 2 && colOf(cs[0]!) === colOf(cs[1]!) && between(ctx.pos, cs[0]!, cs[1]!) === 0;
  },
  khong_dau_phao: (ctx) => {
    const k = enemyKing(ctx);
    return piecesOf(ctx.pos, ctx.side, CANNON).some((s) => colOf(s) === colOf(k) && between(ctx.pos, s, k) === 0);
  },
  lien_hoan_ma: (ctx) => {
    const hs = piecesOf(ctx.pos, ctx.side, HORSE);
    if (hs.length !== 2) return false;
    return ctx.pos.attackersOf(hs[0]!, ctx.side).includes(hs[1]!) && ctx.pos.attackersOf(hs[1]!, ctx.side).includes(hs[0]!);
  },

  /* -------------------------------- Sát cục -------------------------------- */
  doi_dien_tieu: (ctx) => {
    const k = enemyKing(ctx);
    const wk = ctx.pos.kingSquare(ctx.side);
    if (colOf(wk) === colOf(k)) return false;
    const r = rowOf(k);
    for (const [dr, dc] of [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ] as const) {
      const nr = r + dr;
      const nc = colOf(k) + dc;
      if (nc < 3 || nc > 5 || nr < 0 || nr > 9) continue;
      const n = nr * 9 + nc;
      const p = ctx.pos.board[n]!;
      if (p !== 0 && Math.sign(p) === -ctx.side) continue;
      if (nc === colOf(wk) && between(ctx.pos, n, wk) === 0) return true;
    }
    return false;
  },
  ma_hau_phao: (ctx) => {
    const k = enemyKing(ctx);
    return checkersOf(ctx).some((c) => {
      if (typeAt(ctx.pos, c) !== CANNON) return false;
      const s = screenBetween(ctx.pos, c, k);
      return s >= 0 && ctx.pos.board[s] === ctx.side * HORSE && Math.abs(rowOf(s) - rowOf(k)) + Math.abs(colOf(s) - colOf(k)) === 1;
    });
  },
  trung_phao: (ctx) => {
    const k = enemyKing(ctx);
    return checkersOf(ctx).some((c) => {
      if (typeAt(ctx.pos, c) !== CANNON) return false;
      const s = screenBetween(ctx.pos, c, k);
      return s >= 0 && ctx.pos.board[s] === ctx.side * CANNON;
    });
  },
  thien_dia_phao: (ctx) => {
    const cs = piecesOf(ctx.pos, ctx.side, CANNON);
    const center = cs.some((s) => relFile(s, ctx.side) === 4);
    const bottom = cs.some((s) => relRank(s, ctx.side) === 9);
    return center && bottom && checkersOf(ctx).some((c) => typeAt(ctx.pos, c) === CANNON);
  },
  dai_dao_oan_tam: (ctx) => oanTam(ctx, 'chariot'),
  tieu_dao_oan_tam: (ctx) => oanTam(ctx, 'soldier'),
  muon_cung: (ctx) => {
    const k = enemyKing(ctx);
    return checkersOf(ctx).some((c) => {
      if (typeAt(ctx.pos, c) !== CANNON) return false;
      const s = screenBetween(ctx.pos, c, k);
      return s >= 0 && ctx.pos.board[s] === -ctx.side * ADVISOR;
    });
  },
  thiet_mon_thuyen: (ctx) => {
    const k = enemyKing(ctx);
    const centerCannon = piecesOf(ctx.pos, ctx.side, CANNON).some((s) => relFile(s, ctx.side) === 4);
    const types = checkersOf(ctx).map((c) => typeAt(ctx.pos, c));
    return centerCannon && relRank(k, ctx.side) === 9 && types.some((t) => t === CHARIOT || t === HORSE || t === SOLDIER);
  },
  giap_xe_phao: (ctx) => {
    const k = enemyKing(ctx);
    const onLine = (s: number) => rowOf(s) === rowOf(k) || colOf(s) === colOf(k);
    const hasR = piecesOf(ctx.pos, ctx.side, CHARIOT).some(onLine);
    const hasC = piecesOf(ctx.pos, ctx.side, CANNON).some(onLine);
    const t = checkersOf(ctx).map((c) => typeAt(ctx.pos, c));
    return hasR && hasC && (t.includes(CHARIOT) || t.includes(CANNON));
  },
  hai_de_lao_nguyet: (ctx) => {
    const k = enemyKing(ctx);
    return checkersOf(ctx).some((c) => {
      if (typeAt(ctx.pos, c) !== CHARIOT || colOf(c) !== colOf(k)) return false;
      // Pháo cùng lộ, nằm phía sau Xe (xa Tướng hơn)
      return piecesOf(ctx.pos, ctx.side, CANNON).some(
        (p) => colOf(p) === colOf(c) && Math.abs(rowOf(p) - rowOf(k)) > Math.abs(rowOf(c) - rowOf(k)),
      );
    });
  },
  ma_ngoa_tao_sat: (ctx) =>
    checkersOf(ctx).some((c) => typeAt(ctx.pos, c) === HORSE && [relSq('c8'), relSq('g8')].includes(rel(c, ctx.side))),
  quai_giac_ma_sat: (ctx) =>
    relRank(enemyKing(ctx), ctx.side) === 9 &&
    checkersOf(ctx).some((c) => typeAt(ctx.pos, c) === HORSE && [relSq('d8'), relSq('f8')].includes(rel(c, ctx.side))),
  dieu_ngu_ma_sat: (ctx) =>
    piecesOf(ctx.pos, ctx.side, HORSE).some((h) => [relSq('c7'), relSq('g7')].includes(rel(h, ctx.side))) &&
    checkersOf(ctx).some((c) => typeAt(ctx.pos, c) === CHARIOT),
  bat_giac_ma: (ctx) => {
    const k = enemyKing(ctx);
    const kr = relRank(k, ctx.side);
    const kf = relFile(k, ctx.side);
    if (!((kr === 7 || kr === 9) && (kf === 3 || kf === 5))) return false;
    const oppR = 16 - kr;
    const oppF = 8 - kf;
    const hasHorse = piecesOf(ctx.pos, ctx.side, HORSE).some((h) => relRank(h, ctx.side) === oppR && relFile(h, ctx.side) === oppF);
    return hasHorse && checkersOf(ctx).some((c) => [CHARIOT, CANNON].includes(typeAt(ctx.pos, c)));
  },
  song_ma_am_tuyen: (ctx) => {
    const hs = piecesOf(ctx.pos, ctx.side, HORSE).filter((h) => relRank(h, ctx.side) >= 6);
    return hs.length === 2 && checkersOf(ctx).some((c) => typeAt(ctx.pos, c) === HORSE);
  },
  song_xe_thac: (ctx) => {
    const k = enemyKing(ctx);
    const rs = piecesOf(ctx.pos, ctx.side, CHARIOT);
    if (rs.length !== 2) return false;
    const checking = checkersOf(ctx).filter((c) => typeAt(ctx.pos, c) === CHARIOT);
    if (checking.length === 0) return false;
    const other = rs.find((r) => r !== checking[0]);
    if (other === undefined) return false;
    return Math.abs(rowOf(other) - rowOf(k)) === 1 || Math.abs(colOf(other) - colOf(k)) === 1;
  },
  nhi_quy_phach_mon: (ctx) => {
    const set = [relSq('d8'), relSq('f8'), relSq('d9'), relSq('f9'), relSq('e8')];
    return piecesOf(ctx.pos, ctx.side, SOLDIER).filter((s) => set.includes(rel(s, ctx.side))).length >= 2;
  },
  dai_dam_xuyen_tam: (ctx) =>
    ctx.ownRecords.slice(-3).some((r) => r.piece === 'chariot' && r.captured && rel(moveTo(r.move), ctx.side) === relSq('e8')),
  lap_ma_xa: (ctx) => {
    const k = enemyKing(ctx);
    return checkersOf(ctx).some(
      (c) =>
        typeAt(ctx.pos, c) === CHARIOT &&
        Math.abs(rowOf(c) - rowOf(k)) + Math.abs(colOf(c) - colOf(k)) === 1 &&
        ctx.pos.attackersOf(c, ctx.side).some((d) => typeAt(ctx.pos, d) === HORSE),
    );
  },
  bat_hoang_ma: (ctx) => ctx.last.piece === 'horse' && checkersOf(ctx).some((c) => c !== moveTo(ctx.last.move)),
  double_check: (ctx) => checkersOf(ctx).length >= 2,
  soldier_mate: (ctx) => ctx.last.piece === 'soldier' && checkersOf(ctx).some((c) => typeAt(ctx.pos, c) === SOLDIER),
};

function oanTam(ctx: PatternContext, piece: PieceName): boolean {
  const last = ctx.last;
  if (last.piece !== piece || last.captured !== 'advisor') return false;
  if (rel(moveTo(last.move), ctx.side) !== relSq('e8')) return false;
  return piecesOf(ctx.pos, ctx.side, CANNON).some((s) => relFile(s, ctx.side) === 4);
}

/** So sánh hướng Pháo đầu của hai bên: cùng cánh hay khác cánh */
function cannonDuel(ctx: PatternContext): 'same' | 'opposite' | null {
  const mine = centralCannonMove(ctx);
  if (!mine) return null;
  const enemyCtx = makeContext(ctx.game, -ctx.side as Side);
  const theirs = centralCannonMove(enemyCtx);
  if (!theirs) return null;
  // Cả hai Pháo phải vẫn còn ở lộ giữa
  if (!ctx.pos.board.some((p, s) => p === ctx.side * CANNON && relFile(s, ctx.side) === 4)) return null;
  return colOf(mine.from) === colOf(theirs.from) ? 'same' : 'opposite';
}

/* ------------------------------ Thông dịch DSL ------------------------------ */

function evalCond(c: Cond, ctx: PatternContext): boolean {
  if ('at' in c) return c.squares.some((n) => ctx.pos.board[rel(relSq(n), ctx.side)] === ctx.side * TYPE[c.at]);
  if ('atAll' in c) return c.squares.every((n) => ctx.pos.board[rel(relSq(n), ctx.side)] === ctx.side * TYPE[c.atAll]);
  if ('onRanks' in c) {
    const n = piecesOf(ctx.pos, ctx.side, TYPE[c.onRanks]).filter((s) => c.ranks.includes(relRank(s, ctx.side))).length;
    return n >= (c.count ?? 1);
  }
  if ('firstMove' in c) {
    const m = ownMove(ctx, 0);
    if (!m || m.piece !== c.firstMove.piece) return false;
    if (c.firstMove.from && !c.firstMove.from.map(relSq).includes(m.from)) return false;
    return c.firstMove.to.map(relSq).includes(m.to);
  }
  if ('moved' in c) {
    const within = c.moved.within ?? ctx.ownRecords.length;
    for (let k = 0; k < Math.min(within, ctx.ownRecords.length); k++) {
      const m = ownMove(ctx, k)!;
      if (m.piece !== c.moved.piece) continue;
      if (c.moved.from && !c.moved.from.map(relSq).includes(m.from)) continue;
      if (c.moved.to.map(relSq).includes(m.to)) return true;
    }
    return false;
  }
  if ('sameLineClear' in c) {
    const ps = piecesOf(ctx.pos, ctx.side, TYPE[c.sameLineClear]);
    for (let i = 0; i < ps.length; i++)
      for (let j = i + 1; j < ps.length; j++) if (between(ctx.pos, ps[i]!, ps[j]!) === 0) return true;
    return false;
  }
  if ('count' in c) return piecesOf(ctx.pos, ctx.side, TYPE[c.count]).length === c.eq;
  if ('pattern' in c) {
    const p = patternById(c.pattern);
    return !!p && p.all.every((x) => evalCond(x, ctx));
  }
  if ('custom' in c) {
    const fn = CUSTOM[c.custom];
    if (!fn) throw new Error(`Thiếu hàm kiểm tra thế cờ: ${c.custom}`);
    return fn(ctx);
  }
  if ('not' in c) return !evalCond(c.not, ctx);
  if ('any' in c) return c.any.some((x) => evalCond(x, ctx));
  return false;
}

export function matches(def: PatternDef, game: Game, side: Side): boolean {
  if (game.records.length === 0) return false;
  const ctx = makeContext(game, side);
  if (def.maxOwnMoves !== undefined && ctx.ownMoves > def.maxOwnMoves) return false;
  return def.all.every((c) => evalCond(c, ctx));
}

function toHit(def: PatternDef, side: Side): PatternHit {
  return { id: def.id, name: def.name, kind: def.kind, side: side === 1 ? 'red' : 'black', description: def.description };
}

/**
 * Theo dõi thế cờ trong một ván: gọi `afterMove` sau mỗi nước.
 * Mỗi thế chỉ báo 1 lần/ván/bên. Thế ghép (dùng `pattern`) được xếp trước thế thành phần.
 */
export class PatternTracker {
  private reported = new Set<string>();
  constructor(private readonly includeDisabled = false) {}

  reset(): void {
    this.reported.clear();
  }

  /** Đánh dấu đã báo toàn bộ thế đang thỏa (dùng khi vào giữa ván, tránh báo dồn) */
  prime(game: Game): void {
    for (const side of [1, -1] as Side[]) for (const def of this.candidates('shape')) if (matches(def, game, side)) this.reported.add(`${def.id}:${side}`);
  }

  private candidates(kind?: PatternKind): PatternDef[] {
    return PATTERNS.filter((p) => (this.includeDisabled || p.enabled) && (!kind || p.kind === kind));
  }

  afterMove(game: Game): PatternHit[] {
    if (game.variant !== 'xiangqi' || game.records.length === 0) return [];
    const last = game.records[game.records.length - 1]!;
    const side: Side = last.side === 'red' ? 1 : -1;
    const hits: PatternHit[] = [];
    const kinds: PatternKind[] = game.result?.reason === 'checkmate' ? ['mate', 'opening', 'shape'] : ['opening', 'shape'];
    for (const kind of kinds) {
      for (const def of this.candidates(kind)) {
        const key = `${def.id}:${side}`;
        if (this.reported.has(key)) continue;
        let ok = false;
        try {
          ok = matches(def, game, side);
        } catch (e) {
          console.error(e);
        }
        if (ok) {
          this.reported.add(key);
          hits.push(toHit(def, side));
          if (kind === 'mate') break; // chỉ lấy 1 tên sát cục
        }
      }
    }
    // Thế ghép (nhiều điều kiện hơn) lên trước
    const weight = (h: PatternHit) => (h.kind === 'mate' ? 100 : 0) + (patternById(h.id)?.all.length ?? 0);
    return hits.sort((a, b) => weight(b) - weight(a));
  }
}

/** Liệt kê mọi thế xuất hiện trong cả ván (dùng cho xem lại / thống kê) */
export function detectAll(game: Game, includeDisabled = false): { ply: number; hit: PatternHit }[] {
  const tracker = new PatternTracker(includeDisabled);
  const out: { ply: number; hit: PatternHit }[] = [];
  const g2 = new GameClass(game.startFen);
  for (let i = 0; i < game.records.length; i++) {
    g2.playMove(game.records[i]!.move);
    if (i === game.records.length - 1 && game.result && !g2.result) g2.setResult(game.result);
    for (const hit of tracker.afterMove(g2)) out.push({ ply: i + 1, hit });
  }
  return out;
}
