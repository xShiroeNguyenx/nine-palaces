import { ROOM_CODE_ALPHABET, type RoomSettings } from '@np/shared';
import type { Env } from '../env';
import type { RoomInitBody, Seat } from '../do/RoomDO';
import { randomString } from './jwt';

export function randomCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let s = '';
  for (const b of bytes) s += ROOM_CODE_ALPHABET[b % ROOM_CODE_ALPHABET.length];
  return s;
}

export function roomStub(env: Env, code: string): DurableObjectStub {
  return env.ROOM.get(env.ROOM.idFromName(code));
}

/**
 * Tạo phòng mới: chọn mã chưa dùng, khởi tạo RoomDO.
 * `seats` đặt sẵn người chơi (chủ phòng hoặc 2 người ghép trận nhanh).
 */
export async function createRoom(
  env: Env,
  settings: RoomSettings,
  seats: { red: Seat | null; black: Seat | null },
): Promise<{ code: string; key: string | null }> {
  const key = settings.private ? randomString(9) : null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const body: RoomInitBody = { code, key, settings, seats };
    const res = await roomStub(env, code).fetch('https://room/init', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (res.ok) return { code, key };
    if (res.status !== 409) throw new Error(`Khởi tạo phòng thất bại: ${res.status}`);
  }
  throw new Error('Không tạo được mã phòng, thử lại sau');
}

/** Xác định ghế của chủ phòng theo lựa chọn bên */
export function seatsForCreator(side: RoomSettings['side'], seat: Seat): { red: Seat | null; black: Seat | null } {
  const actual = side === 'random' ? (Math.random() < 0.5 ? 'red' : 'black') : side;
  return actual === 'red' ? { red: seat, black: null } : { red: null, black: seat };
}
