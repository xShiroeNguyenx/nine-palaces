/** JWT HS256 tối giản bằng WebCrypto */

const enc = new TextEncoder();

export function b64urlEncode(data: ArrayBuffer | Uint8Array | string): string {
  const bytes = typeof data === 'string' ? enc.encode(data) : data instanceof Uint8Array ? data : new Uint8Array(data);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

export interface TokenPayload {
  sub: string;
  name: string;
  guest: boolean;
  avatar: string | null;
  iat: number;
  exp: number;
}

export async function signToken(
  payload: Omit<TokenPayload, 'iat' | 'exp'>,
  secret: string,
  ttlSeconds = 30 * 24 * 3600,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const full: TokenPayload = { ...payload, iat: now, exp: now + ttlSeconds };
  const header = b64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64urlEncode(JSON.stringify(full));
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(`${header}.${body}`));
  return `${header}.${body}.${b64urlEncode(sig)}`;
}

export async function verifyToken(token: string, secret: string): Promise<TokenPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, b, s] = parts as [string, string, string];
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), b64urlDecode(s), enc.encode(`${h}.${b}`));
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(b))) as TokenPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function randomString(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return b64urlEncode(arr);
}

export async function sha256b64url(s: string): Promise<string> {
  return b64urlEncode(await crypto.subtle.digest('SHA-256', enc.encode(s)));
}
